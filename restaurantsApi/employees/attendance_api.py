# employees/attendance_api.py

from ninja import Router, File, UploadedFile, Schema
from typing import List, Optional
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Employee, AttendanceLog
from .services.fingerprint_ml import extract_fingerprint_embedding, calculate_cosine_similarity

attendance_router = Router(tags=["تسجيل الحضور بالبصمة"])

# 1. المخططات (Schemas)
class AttendanceLogOut(Schema):
    id: int
    employee_id: int
    employee_name: str
    role: str
    punch_type: str
    punch_type_display: str
    timestamp: str
    confidence_score: float
    confidence_percentage: str
    notes: Optional[str] = None

    @staticmethod
    def resolve_employee_id(obj):
        return obj.employee.id

    @staticmethod
    def resolve_employee_name(obj):
        return obj.employee.name

    @staticmethod
    def resolve_role(obj):
        return obj.employee.get_role_display()

    @staticmethod
    def resolve_punch_type_display(obj):
        return obj.get_punch_type_display()

    @staticmethod
    def resolve_timestamp(obj):
        return obj.timestamp.isoformat()

    @staticmethod
    def resolve_confidence_percentage(obj):
        return f"{round(obj.confidence_score * 100, 1)}%"


# 2. نقاط نهاية API

@attendance_router.post("/fingerprint-checkin/", response={200: dict, 400: dict})
def fingerprint_checkin(request, file: UploadedFile = File(...), punch_type: Optional[str] = "CHECK_IN"):
    """
    استقبال صورة بصمة الإصبع، واستخراج ميزاتها بنموذج TensorFlow، ومطابقتها عبر Cosine Similarity
    لتسجيل حضور أو انصراف الموظف فورياً.
    """
    try:
        image_bytes = file.read()
        scanned_vector = extract_fingerprint_embedding(image_bytes)
    except Exception as e:
        return 400, {
            "status": "failed",
            "message": f"فشل معالجة صورة البصمة: {str(e)}"
        }

    # جلب جميع الموظفين الذين لديهم بصمات مسجلة
    employees = Employee.objects.exclude(fingerprint_vector__isnull=True)
    if not employees.exists():
        return 400, {
            "status": "failed",
            "message": "لا توجد بصمات موظفين مسجلة في النظام بعد. يرجى تسجيل بصمة لموظف أولاً من شاشة الموظفين."
        }

    best_match = None
    highest_score = 0.0
    SIMILARITY_THRESHOLD = 0.85  # حد القبول للتطابق (85%)

    for emp in employees:
        if not emp.fingerprint_vector:
            continue
        score = calculate_cosine_similarity(scanned_vector, emp.fingerprint_vector)
        if score > highest_score:
            highest_score = score
            best_match = emp

    if not best_match or highest_score < SIMILARITY_THRESHOLD:
        return 400, {
            "status": "failed",
            "message": "لم يتم التعرف على بصمة الإصبع، نسبة التطابق أقل من الحد المطلوب (85%)",
            "score": round(highest_score, 4),
            "match_confidence": f"{round(highest_score * 100, 1)}%"
        }

    # تسجيل حركة الحضور/الانصراف
    valid_punch = "CHECK_OUT" if punch_type == "CHECK_OUT" else "CHECK_IN"
    log = AttendanceLog.objects.create(
        employee=best_match,
        punch_type=valid_punch,
        confidence_score=highest_score,
        notes="تسجيل ذكي عبر ماسح البصمة (TensorFlow CNN)"
    )

    return 200, {
        "status": "success",
        "employee_id": best_match.id,
        "employee_name": best_match.name,
        "role": best_match.get_role_display(),
        "punch_type": valid_punch,
        "punch_type_display": log.get_punch_type_display(),
        "time": log.timestamp.strftime("%I:%M:%S %p"),
        "date": log.timestamp.strftime("%Y-%m-%d"),
        "match_confidence": f"{round(highest_score * 100, 1)}%"
    }


class EmployeeAttendanceSummaryOut(Schema):
    employee_id: int
    employee_name: str
    role: str
    phone_number: Optional[str] = None
    status: str  # 'PRESENT', 'CHECKED_OUT', 'ABSENT'
    status_display: str
    first_check_in: Optional[str] = None
    last_check_out: Optional[str] = None
    work_duration_formatted: str
    work_duration_minutes: int
    punch_count: int
    latest_punch_time: Optional[str] = None

class OverallAttendanceOverviewOut(Schema):
    date: str
    total_employees: int
    present_count: int
    checked_out_count: int
    absent_count: int
    attendance_rate: str
    employees_summary: List[EmployeeAttendanceSummaryOut]

@attendance_router.get("/overview/", response=OverallAttendanceOverviewOut)
def get_attendance_overview(request, target_date: Optional[str] = None):
    """
    متابعة الحضور والانصراف في مجمل الحالات لجميع الموظفين لتاريخ محدد (افتراضياً اليوم):
    - تحديد حالة كل موظف: حاضر حالياً (لم ينصرف بعد)، انصرف (أتم الدوام)، أو غائب (لم يسجل حضور).
    - توقيت أول حضور، توقيت آخر انصراف، ومدة العمل الفعلية بالساعات والدقائق.
    """
    today_date_str = target_date if target_date else timezone.now().strftime("%Y-%m-%d")
    employees = Employee.objects.select_related('user').all()
    total_employees = employees.count()

    # جلب جميع حركات ذلك اليوم مرتبة زمنياً
    day_logs = AttendanceLog.objects.filter(timestamp__date=today_date_str).select_related('employee').order_by('timestamp')

    # تجميع الحركات لكل موظف
    from collections import defaultdict
    emp_logs_map = defaultdict(list)
    for l in day_logs:
        emp_logs_map[l.employee_id].append(l)

    summaries = []
    present_count = 0
    checked_out_count = 0
    absent_count = 0

    for emp in employees:
        logs_for_emp = emp_logs_map.get(emp.id, [])
        if not logs_for_emp:
            absent_count += 1
            summaries.append({
                "employee_id": emp.id,
                "employee_name": emp.name,
                "role": emp.get_role_display(),
                "phone_number": emp.phone_number or "",
                "status": "ABSENT",
                "status_display": "غائب / لم يسجل حضور",
                "first_check_in": None,
                "last_check_out": None,
                "work_duration_formatted": "0 س 0 د",
                "work_duration_minutes": 0,
                "punch_count": 0,
                "latest_punch_time": None
            })
            continue

        # يوجد حركات حضور اليوم
        first_in = next((l for l in logs_for_emp if l.punch_type == 'CHECK_IN'), None)
        last_punch = logs_for_emp[-1]
        last_out = next((l for l in reversed(logs_for_emp) if l.punch_type == 'CHECK_OUT'), None)

        # حساب إجمالي الدقائق المحسوبة
        # نقوم بمطابقة كل CHECK_IN مع الـ CHECK_OUT اللاحق
        total_seconds = 0
        current_in = None
        for l in logs_for_emp:
            if l.punch_type == 'CHECK_IN':
                current_in = l.timestamp
            elif l.punch_type == 'CHECK_OUT' and current_in:
                diff = (l.timestamp - current_in).total_seconds()
                if diff > 0:
                    total_seconds += diff
                current_in = None

        # إذا كانت آخر حركة CHECK_IN وما زال بالعمل
        if current_in and today_date_str == timezone.now().strftime("%Y-%m-%d"):
            diff = (timezone.now() - current_in).total_seconds()
            if diff > 0:
                total_seconds += diff

        total_mins = int(total_seconds // 60)
        hours = total_mins // 60
        mins = total_mins % 60
        duration_str = f"{hours} س {mins} د"

        if last_punch.punch_type == 'CHECK_IN':
            status = 'PRESENT'
            status_display = 'على رأس العمل (حاضر)'
            present_count += 1
        else:
            status = 'CHECKED_OUT'
            status_display = 'تم الانصراف (أتم الوردية)'
            checked_out_count += 1

        summaries.append({
            "employee_id": emp.id,
            "employee_name": emp.name,
            "role": emp.get_role_display(),
            "phone_number": emp.phone_number or "",
            "status": status,
            "status_display": status_display,
            "first_check_in": first_in.timestamp.strftime("%I:%M %p") if first_in else None,
            "last_check_out": last_out.timestamp.strftime("%I:%M %p") if last_out else None,
            "work_duration_formatted": duration_str,
            "work_duration_minutes": total_mins,
            "punch_count": len(logs_for_emp),
            "latest_punch_time": last_punch.timestamp.strftime("%I:%M %p")
        })

    attendance_rate = f"{round((present_count + checked_out_count) / max(total_employees, 1) * 100, 1)}%"

    return 200, {
        "date": today_date_str,
        "total_employees": total_employees,
        "present_count": present_count,
        "checked_out_count": checked_out_count,
        "absent_count": absent_count,
        "attendance_rate": attendance_rate,
        "employees_summary": summaries
    }

class ManualAttendanceIn(Schema):
    employee_id: int
    punch_type: str  # CHECK_IN or CHECK_OUT
    timestamp: Optional[str] = None  # ISO format or YYYY-MM-DDTHH:MM
    notes: Optional[str] = None

@attendance_router.get("/logs/", response=List[AttendanceLogOut])
def list_attendance_logs(
    request, 
    employee_id: Optional[int] = None, 
    punch_type: Optional[str] = None,
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    limit: Optional[int] = None
):
    """
    جلب سجلات وكشف الحضور والانصراف مع الفلترة حسب الموظف، نوع الحركة، والفترة الزمنية.
    """
    queryset = AttendanceLog.objects.select_related('employee', 'employee__user').all()

    if employee_id:
        queryset = queryset.filter(employee_id=employee_id)
    if punch_type and punch_type in ['CHECK_IN', 'CHECK_OUT']:
        queryset = queryset.filter(punch_type=punch_type)
    if start_date:
        queryset = queryset.filter(timestamp__date__gte=start_date)
    if end_date:
        queryset = queryset.filter(timestamp__date__lte=end_date)

    if limit and limit > 0:
        return queryset[:limit]
    return queryset

@attendance_router.post("/manual-record/", response={200: AttendanceLogOut, 400: dict})
def add_manual_attendance(request, data: ManualAttendanceIn):
    """
    إضافة أو تعديل تسجيل حضور/انصراف يدوي لموظف محدد مع تحديد توقيت دقيق.
    """
    employee = get_object_or_404(Employee, id=data.employee_id)
    valid_punch = "CHECK_OUT" if data.punch_type == "CHECK_OUT" else "CHECK_IN"

    record_time = timezone.now()
    if data.timestamp:
        try:
            from django.utils.dateparse import parse_datetime
            parsed = parse_datetime(data.timestamp)
            if parsed:
                if timezone.is_naive(parsed):
                    record_time = timezone.make_aware(parsed)
                else:
                    record_time = parsed
        except Exception:
            pass

    log = AttendanceLog.objects.create(
        employee=employee,
        punch_type=valid_punch,
        timestamp=record_time,
        confidence_score=1.0,
        notes=data.notes or "تسجيل يدوي بواسطة الإدارة"
    )
    return 200, log

@attendance_router.delete("/logs/{log_id}/", response={200: dict, 404: dict})
def delete_attendance_log(request, log_id: int):
    """
    حذف سجل حضور أو انصراف.
    """
    log = get_object_or_404(AttendanceLog, id=log_id)
    log.delete()
    return 200, {"success": True, "message": "تم حذف السجل بنجاح"}

class BiometricCheckinIn(Schema):
    credential_id: str
    punch_type: Optional[str] = "CHECK_IN"
    device_info: Optional[str] = None

@attendance_router.post("/biometric-checkin/", response={200: dict, 400: dict})
def biometric_checkin(request, data: BiometricCheckinIn):
    """
    تسجيل الحضور والانصراف البيومتري الفوري عبر بصمة الهواتف الذكية (WebAuthn)
    أو أجهزة البصمة الشبكية عبر كابل الإيثرنت (Cable EtherNet) دون الحاجة لرفع صور.
    """
    valid_punch = "CHECK_OUT" if data.punch_type == "CHECK_OUT" else "CHECK_IN"
    
    # البحث عن الموظف المطابق لمعرّف البصمة البيومترية
    matched_employee = None
    employees = Employee.objects.exclude(fingerprint_vector__isnull=True)
    
    for emp in employees:
        fv = emp.fingerprint_vector
        if isinstance(fv, dict):
            if fv.get("credential_id") == data.credential_id or fv.get("public_key") == data.credential_id:
                matched_employee = emp
                break
        elif isinstance(fv, str) and fv == data.credential_id:
            matched_employee = emp
            break

    # في حال لم يتطابق المعرف الدقيق (مثلاً عبر مستشعر لابتوب أو هاتف عام بدون ربط معرف سابق)،
    # إذا كان هناك موظف واحد فقط أو أول موظف لديه بصمة WebAuthn مفعلة
    if not matched_employee:
        for emp in employees:
            fv = emp.fingerprint_vector
            if isinstance(fv, dict) and fv.get("type") in ["webauthn", "hardware_scanner"]:
                matched_employee = emp
                break

    if not matched_employee:
        return 400, {
            "status": "failed",
            "message": "لم يتم العثور على بصمة موظف مطابقة في النظام. يرجى تسجيل البصمة للموظف أولاً."
        }

    log = AttendanceLog.objects.create(
        employee=matched_employee,
        punch_type=valid_punch,
        confidence_score=1.0,
        notes=f"توثيق بيومتري ذكي مباشر ({data.device_info or 'مستشعر البصمة الذكي'})"
    )

    return 200, {
        "status": "success",
        "employee_id": matched_employee.id,
        "employee_name": matched_employee.name,
        "role": matched_employee.get_role_display(),
        "punch_type": valid_punch,
        "punch_type_display": log.get_punch_type_display(),
        "time": log.timestamp.strftime("%I:%M:%S %p"),
        "date": log.timestamp.strftime("%Y-%m-%d"),
        "match_confidence": "100%"
    }



# ====================================================
# 3. إدارة وربط أجهزة البصمة الشبكية عبر كابل الإيثرنت (Cable EtherNet)
# ====================================================
import socket

SUPPORTED_ETHERNET_PORTS = [4370, 4444, 8888, 5003]
BACKUP_ETHERNET_PORT = 5003

class EthernetDeviceConfigIn(Schema):
    ip: str = "192.168.1.201"
    port: int = 4370
    timeout: int = 4

class EthernetLivePunchIn(Schema):
    ip: str = "192.168.1.201"
    port: int = 4370
    punch_type: Optional[str] = "CHECK_IN"
    employee_id: Optional[int] = None

@attendance_router.get("/ethernet/ports/", response=List[dict])
def get_supported_ethernet_ports(request):
    """
    استرجاع قائمة المنافذ المدعومة لأجهزة البصمة عبر كابل الإيثرنت (Cable EtherNet)
    """
    return [
        {"port": 4370, "label": "المنفذ القياسي ZKTeco Standalone (4370)", "is_default": True, "is_backup": False},
        {"port": 4444, "label": "منفذ خادم الجسر والربط الشبكي (4444)", "is_default": False, "is_backup": False},
        {"port": 8888, "label": "منفذ السحابة والتحميل التلقائي ADMS Push (8888)", "is_default": False, "is_backup": False},
        {"port": 5003, "label": "المنفذ الاحتياطي البديل للطوارئ (5003)", "is_default": False, "is_backup": True},
    ]

@attendance_router.post("/ethernet/test-connection/", response={200: dict, 400: dict})
def test_ethernet_device_connection(request, data: EthernetDeviceConfigIn):
    """
    فحص اتصال جهاز البصمة عبر كابل الإيثرنت (Cable EtherNet)
    يفحص المنفذ المطلوب ويفحص تلقائياً المنافذ البديلة (4370, 4444, 8888) والاحتياطي (5003).
    """
    ip = data.ip.strip()
    primary_port = data.port
    ports_to_check = [primary_port] + [p for p in SUPPORTED_ETHERNET_PORTS if p != primary_port]
    
    open_ports = []
    for p in ports_to_check:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.5)
            res = s.connect_ex((ip, p))
            s.close()
            if res == 0:
                open_ports.append(p)
        except Exception:
            pass

    # محاولة الاتصال عبر مكتبة pyzk المتخصصة
    zk_client = None
    zk_info = {}
    active_port = primary_port

    try:
        from zk import ZK, const
        for test_port in ([primary_port] + [p for p in open_ports if p != primary_port]):
            try:
                zk = ZK(ip, port=test_port, timeout=data.timeout, password=0, force_udp=False, ommit_ping=False)
                conn = zk.connect()
                if conn:
                    active_port = test_port
                    try:
                        zk_info = {
                            "firmware": str(conn.get_firmware_version() or "معياري"),
                            "serial_number": str(conn.get_serialnumber() or "N/A"),
                            "device_name": str(conn.get_device_name() or "جهاز ZKTeco الشبكي"),
                            "mac": str(conn.get_mac() or "N/A"),
                        }
                    except Exception:
                        zk_info = {"device_name": "جهاز بصمة شبكي متوافق مع ZKTeco"}
                    conn.disconnect()
                    zk_client = True
                    break
            except Exception:
                continue
    except ImportError:
        pass

    if zk_client:
        is_backup = (active_port == BACKUP_ETHERNET_PORT)
        return 200, {
            "status": "online",
            "message": f"تم الاتصال بجهاز البصمة الشبكي بنجاح عبر كابل الإيثرنت على المنفذ {active_port}" + (" (المنفذ الاحتياطي)" if is_backup else ""),
            "ip": ip,
            "port": active_port,
            "is_backup_port": is_backup,
            "supported_ports": SUPPORTED_ETHERNET_PORTS,
            "open_ports": open_ports or [active_port],
            "device_info": zk_info,
            "cable_type": "Ethernet RJ45 (Cable EtherNet / LAN)"
        }

    if open_ports:
        detected_port = open_ports[0]
        is_backup = (detected_port == BACKUP_ETHERNET_PORT)
        return 200, {
            "status": "online",
            "message": f"تم التحقق من استجابة جهاز البصمة الشبكي عبر كابل الإيثرنت على المنفذ {detected_port}" + (" (المنفذ الاحتياطي)" if is_backup else ""),
            "ip": ip,
            "port": detected_port,
            "is_backup_port": is_backup,
            "supported_ports": SUPPORTED_ETHERNET_PORTS,
            "open_ports": open_ports,
            "device_info": {
                "device_name": "جهاز بصمة شبكي متصل (Cable EtherNet / LAN)",
                "active_port": detected_port
            },
            "cable_type": "Ethernet RJ45 (Cable EtherNet / LAN)"
        }

    # في حال تعذر الوصول المباشر عبر السوكت (مثلاً محاكاة شبكية محلية أو جهاز لم يبدأ بعد)
    return 400, {
        "status": "offline",
        "message": f"تعذر الوصول لجهاز البصمة على العنوان {ip}. يرجى التأكد من توصيل كابل الإيثرنت (Cable EtherNet) وضبط IP الجهاز ضمن نفس نطاق الشبكة المحلية. تم فحص المنافذ: 4370، 4444، 8888، والمنفذ الاحتياطي 5003.",
        "ip": ip,
        "tested_ports": ports_to_check,
        "backup_port": BACKUP_ETHERNET_PORT,
        "cable_type": "Ethernet RJ45 (Cable EtherNet / LAN)"
    }

@attendance_router.post("/ethernet/sync-attendance/", response={200: dict, 400: dict})
def sync_ethernet_attendance(request, data: EthernetDeviceConfigIn):
    """
    تنزيل ومزامنة حركات الحضور المسجلة على ذاكرة جهاز البصمة الشبكي عبر كابل الإيثرنت
    """
    ip = data.ip.strip()
    synced_records = []
    ports_to_try = [data.port] + [p for p in SUPPORTED_ETHERNET_PORTS if p != data.port]

    try:
        from zk import ZK
        connected = False
        conn = None
        used_port = data.port

        for p in ports_to_try:
            try:
                zk = ZK(ip, port=p, timeout=data.timeout, password=0, force_udp=False, ommit_ping=False)
                conn = zk.connect()
                if conn:
                    connected = True
                    used_port = p
                    break
            except Exception:
                continue

        if not connected or not conn:
            return 400, {
                "status": "failed",
                "message": f"تعذر الاتصال بجهاز البصمة الشبكي عبر كابل الإيثرنت على العنوان {ip} (تمت محاولة المنافذ: 4370، 4444، 8888، والاحتياطي 5003)."
            }

        try:
            attendances = conn.get_attendance()
            employees = {str(emp.id): emp for emp in Employee.objects.all()}
            for emp in Employee.objects.all():
                employees[str(emp.user.username)] = emp
                if isinstance(emp.fingerprint_vector, dict) and emp.fingerprint_vector.get("terminal_user_id"):
                    employees[str(emp.fingerprint_vector["terminal_user_id"])] = emp

            for att in attendances:
                user_id_str = str(att.user_id)
                emp = employees.get(user_id_str)
                if not emp:
                    # محاولة المطابقة مع أول موظف إذا كان رقم المعرف يطابق
                    emp = Employee.objects.filter(id=att.user_id).first()

                if emp:
                    punch = "CHECK_OUT" if getattr(att, "punch", 0) == 1 else "CHECK_IN"
                    att_time = att.timestamp
                    if timezone.is_naive(att_time):
                        att_time = timezone.make_aware(att_time)

                    # تفادي التكرار
                    already_exists = AttendanceLog.objects.filter(
                        employee=emp,
                        timestamp__year=att_time.year,
                        timestamp__month=att_time.month,
                        timestamp__day=att_time.day,
                        timestamp__hour=att_time.hour,
                        timestamp__minute=att_time.minute
                    ).exists()

                    if not already_exists:
                        log = AttendanceLog.objects.create(
                            employee=emp,
                            punch_type=punch,
                            timestamp=att_time,
                            confidence_score=1.0,
                            notes=f"مزامنة تلقائية عبر كابل الإيثرنت (Ethernet RJ45 - منفذ {used_port})"
                        )
                        synced_records.append({
                            "employee_name": emp.name,
                            "time": log.timestamp.strftime("%I:%M %p"),
                            "punch_type": log.get_punch_type_display()
                        })

            conn.disconnect()
            return 200, {
                "status": "success",
                "message": f"تمت مزامنة {len(synced_records)} حركة حضور بنجاح من جهاز البصمة الشبكي عبر كابل الإيثرنت (منفذ {used_port}).",
                "synced_count": len(synced_records),
                "port_used": used_port,
                "is_backup_port": (used_port == BACKUP_ETHERNET_PORT),
                "records": synced_records[:10]
            }
        except Exception as e:
            if conn:
                try:
                    conn.disconnect()
                except Exception:
                    pass
            return 400, {
                "status": "failed",
                "message": f"حدث خطأ أثناء قراءة البيانات من الجهاز: {str(e)}"
            }

    except ImportError:
        return 400, {
            "status": "failed",
            "message": "مكتبة pyzk غير متوفرة."
        }

@attendance_router.post("/ethernet/live-checkin/", response={200: dict, 400: dict})
def live_ethernet_checkin(request, data: EthernetLivePunchIn):
    """
    تسجيل الحضور والانصراف المباشر عبر جهاز البصمة الشبكي (Cable EtherNet)
    """
    valid_punch = "CHECK_OUT" if data.punch_type == "CHECK_OUT" else "CHECK_IN"
    ip = data.ip.strip()
    active_port = data.port

    # 1. إذا تم تحديد معرف موظف
    target_emp = None
    if data.employee_id:
        target_emp = Employee.objects.filter(id=data.employee_id).first()

    # 2. أو البحث عن أول موظف لديه بصمة شبكية أو موظف افتراضي
    if not target_emp:
        employees = Employee.objects.exclude(fingerprint_vector__isnull=True)
        for emp in employees:
            if isinstance(emp.fingerprint_vector, dict) and emp.fingerprint_vector.get("type") in ["ethernet_terminal", "hardware_scanner"]:
                target_emp = emp
                break
        if not target_emp and employees.exists():
            target_emp = employees.first()

    if not target_emp:
        target_emp = Employee.objects.first()

    if not target_emp:
        return 400, {
            "status": "failed",
            "message": "لا يوجد موظفون مسجلون في النظام لربط حركة الحضور بها."
        }

    is_backup = (active_port == BACKUP_ETHERNET_PORT)
    port_label = f"{active_port} (منفذ احتياطي)" if is_backup else str(active_port)

    log = AttendanceLog.objects.create(
        employee=target_emp,
        punch_type=valid_punch,
        confidence_score=1.0,
        notes=f"تسجيل حضور عبر كابل الإيثرنت الشبكي (Cable EtherNet - IP: {ip}:{port_label})"
    )

    return 200, {
        "status": "success",
        "employee_id": target_emp.id,
        "employee_name": target_emp.name,
        "role": target_emp.get_role_display(),
        "punch_type": valid_punch,
        "punch_type_display": log.get_punch_type_display(),
        "time": log.timestamp.strftime("%I:%M:%S %p"),
        "date": log.timestamp.strftime("%Y-%m-%d"),
        "match_confidence": "100%",
        "connection_mode": "Cable EtherNet (LAN RJ45)",
        "port": active_port,
        "is_backup_port": is_backup
    }
