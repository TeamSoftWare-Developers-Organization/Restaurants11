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


@attendance_router.get("/logs/", response=List[AttendanceLogOut])
def list_attendance_logs(request, limit: int = 50):
    """
    جلب أحدث سجلات الحضور والانصراف الموثقة بالبصمة.
    """
    return AttendanceLog.objects.select_related('employee', 'employee__user').all()[:limit]
