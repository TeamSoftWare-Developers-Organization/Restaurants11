# payments/shifts_api.py

from ninja import Router, Schema
from typing import List, Optional
from datetime import datetime, date, time
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum, Count, Q
from ninja_jwt.authentication import JWTAuth
from .models import Shift, ShiftTemplate, ShiftAllocation, TreasuryTransaction, Payment
from employees.models import Employee
from django.contrib.auth.models import User

shifts_router = Router(tags=["إدارة وتخصيص الورديات والعمل الإضافي"])


# 1. المخططات (Schemas) لقوالب الورديات
class ShiftTemplateIn(Schema):
    name: str
    start_time: str  # "08:00" or "08:00:00"
    end_time: str    # "16:00" or "16:00:00"
    overtime_hourly_rate: float = 15.0
    color: str = "#3b82f6"
    description: Optional[str] = None
    is_active: bool = True


class ShiftTemplateOut(Schema):
    id: int
    name: str
    start_time: str
    end_time: str
    overtime_hourly_rate: float
    color: str
    description: Optional[str] = None
    is_active: bool


# 2. المخططات لتخصيص الورديات
class ShiftAllocationIn(Schema):
    employee_id: int
    shift_template_id: Optional[int] = None
    shift_name: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str    # HH:MM
    pos_station: Optional[str] = "نقطة البيع الرئيسية (POS 1)"
    overtime_hourly_rate: float = 15.0
    notes: Optional[str] = None
    # حقول الأعمال الإضافية
    has_overtime: bool = False
    overtime_hours: float = 0.0
    extra_duties: Optional[str] = None
    overtime_status: Optional[str] = "none"


class ShiftAllocationUpdateIn(Schema):
    shift_name: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    pos_station: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    has_overtime: Optional[bool] = None
    overtime_hours: Optional[float] = None
    overtime_hourly_rate: Optional[float] = None
    extra_duties: Optional[str] = None
    overtime_status: Optional[str] = None


class StandaloneOvertimeIn(Schema):
    employee_id: int
    date: str  # YYYY-MM-DD
    overtime_hours: float
    overtime_hourly_rate: float = 15.0
    extra_duties: str
    overtime_status: Optional[str] = "pending"  # pending, approved, paid
    notes: Optional[str] = None


class ShiftAllocationOut(Schema):
    id: int
    employee_id: int
    employee_name: str
    employee_role: str
    shift_template_id: Optional[int] = None
    shift_name: str
    date: str
    start_time: str
    end_time: str
    pos_station: str
    status: str
    status_display: str
    actual_pos_shift_id: Optional[int] = None
    is_pos_active: bool
    # تفاصيل العمل الإضافي
    has_overtime: bool
    overtime_hours: float
    overtime_hourly_rate: float
    overtime_total_cost: float
    extra_duties: Optional[str] = None
    overtime_status: str
    overtime_status_display: str
    notes: Optional[str] = None
    created_at: str
    # فرق الوردية والمطابقة المالية
    actual_closing_balance: Optional[float] = None
    expected_drawer_cash: Optional[float] = None
    variance: Optional[float] = None
    variance_status: Optional[str] = None
    variance_status_display: Optional[str] = None


class OvertimeUpdateIn(Schema):
    has_overtime: bool = True
    overtime_hours: float
    overtime_hourly_rate: Optional[float] = None
    extra_duties: str
    overtime_status: Optional[str] = "pending"  # pending, approved, paid


class ShiftSummaryOut(Schema):
    total_shifts_today: int
    active_pos_shifts: int
    total_overtime_hours: float
    total_overtime_cost: float
    scheduled_count: int
    completed_count: int


class ShiftReconciliationOut(Schema):
    shift_id: int
    cashier_id: int
    cashier_name: str
    shift_name: str
    status: str
    start_time: str
    end_time: Optional[str] = None
    opening_balance: float
    total_cash_in: float
    total_cash_out: float
    total_card_sales: float
    total_other_sales: float
    total_sales: float
    expected_drawer_cash: float
    actual_closing_balance: Optional[float] = None
    variance: Optional[float] = None
    variance_status: str  # balanced, surplus, shortage, open
    variance_status_display: str
    has_overtime: bool
    overtime_hours: float
    overtime_cost: float


# 3. نقاط نهاية قوالب الورديات (Shift Templates)
@shifts_router.get("/templates/", response=List[ShiftTemplateOut])
def list_shift_templates(request):
    """
    جلب كافة قوالب الورديات المتاحة مع توقيتها وسعر ساعة الإضافي الافتراضي.
    """
    templates = ShiftTemplate.objects.all().order_by('start_time')
    return [
        {
            "id": t.id,
            "name": t.name,
            "start_time": t.start_time.strftime("%H:%M"),
            "end_time": t.end_time.strftime("%H:%M"),
            "overtime_hourly_rate": float(t.overtime_hourly_rate),
            "color": t.color,
            "description": t.description or "",
            "is_active": t.is_active,
        }
        for t in templates
    ]


@shifts_router.post("/templates/", response=ShiftTemplateOut)
def create_shift_template(request, payload: ShiftTemplateIn):
    """
    إنشاء قالب وردية جديد مع تحديد التوقيت وتكلفة ساعة العمل الإضافي.
    """
    start_parts = [int(p) for p in payload.start_time.split(":")[:2]]
    end_parts = [int(p) for p in payload.end_time.split(":")[:2]]
    
    template = ShiftTemplate.objects.create(
        name=payload.name,
        start_time=time(start_parts[0], start_parts[1]),
        end_time=time(end_parts[0], end_parts[1]),
        overtime_hourly_rate=Decimal(str(payload.overtime_hourly_rate)),
        color=payload.color,
        description=payload.description,
        is_active=payload.is_active,
    )
    return {
        "id": template.id,
        "name": template.name,
        "start_time": template.start_time.strftime("%H:%M"),
        "end_time": template.end_time.strftime("%H:%M"),
        "overtime_hourly_rate": float(template.overtime_hourly_rate),
        "color": template.color,
        "description": template.description or "",
        "is_active": template.is_active,
    }


@shifts_router.delete("/templates/{template_id}/")
def delete_shift_template(request, template_id: int):
    """
    حذف قالب وردية.
    """
    template = get_object_or_404(ShiftTemplate, id=template_id)
    template.delete()
    return {"success": True, "message": "تم حذف قالب الوردية بنجاح"}


def calculate_shift_reconciliation(shift: Shift) -> dict:
    """
    حساب فرق إجمالي الوردية الواحدة والمطابقة المالية الدقيقة لدرج النقدية والمبيعات.
    Formula:
    - المقبوضات النقدية = مجموع الحركات الموجبة (IN) لدرج الوردية
    - المصروفات النقدية = مجموع المسحوبات والمصاريف (OUT) من الدرج
    - الرصيد الدفتري المتوقع = الرصيد الافتتاحي + المقبوضات النقدية - المصروفات النقدية
    - فرق الوردية (Variance) = الرصيد الفعلي المعدود عند الإغلاق - الرصيد الدفتري المتوقع
      * Variance == 0: متطابق (balanced)
      * Variance > 0: فائض (surplus)
      * Variance < 0: عجز (shortage)
    """
    opening = float(shift.opening_balance or 0.0)

    # 1. التدفقات النقدية من درج الخزينة للوردية
    cash_in = float(
        TreasuryTransaction.objects.filter(
            shift=shift,
            transaction_type__in=['in', 'IN']
        ).aggregate(total=Sum('amount'))['total'] or 0.0
    )

    cash_out = float(
        TreasuryTransaction.objects.filter(
            shift=shift,
            transaction_type__in=['out', 'OUT']
        ).aggregate(total=Sum('amount'))['total'] or 0.0
    )

    expected_drawer = round(opening + cash_in - cash_out, 2)

    # 2. مبيعات البطاقات والوسائل الإلكترونية خلال فترة الوردية
    end_time_val = shift.end_time or timezone.now()
    card_sales = float(
        Payment.objects.filter(
            payment_method='credit_card',
            payment_date_time__gte=shift.start_time,
            payment_date_time__lte=end_time_val
        ).aggregate(total=Sum('amount'))['total'] or 0.0
    )

    other_sales = float(
        Payment.objects.filter(
            payment_method__in=['debt', 'online_wallet', 'other'],
            payment_date_time__gte=shift.start_time,
            payment_date_time__lte=end_time_val
        ).aggregate(total=Sum('amount'))['total'] or 0.0
    )

    total_sales = round(cash_in + card_sales + other_sales, 2)

    # 3. حساب الفارق
    closing = float(shift.closing_balance) if shift.closing_balance is not None else None
    variance = round(closing - expected_drawer, 2) if closing is not None else None

    if closing is None:
        variance_status = 'open'
        variance_status_display = 'الوردية لا تزال مفتوحة'
    elif abs(variance) < 0.001:
        variance_status = 'balanced'
        variance_status_display = 'متطابق تماماً بدون أي فرق'
    elif variance > 0:
        variance_status = 'surplus'
        variance_status_display = f'فائض نقدي قدره {variance:+.2f} د.ل'
    else:
        variance_status = 'shortage'
        variance_status_display = f'عجز نقدي قدره {variance:+.2f} د.ل'

    cashier_name = ""
    if shift.cashier:
        cashier_name = shift.cashier.get_full_name() or shift.cashier.username
    if not cashier_name:
        cashier_name = "كاشير غير محدد"

    return {
        "shift_id": shift.id,
        "cashier_id": shift.cashier.id if shift.cashier else 0,
        "cashier_name": cashier_name,
        "shift_name": shift.shift_name,
        "status": shift.status,
        "start_time": shift.start_time.strftime("%Y-%m-%d %H:%M"),
        "end_time": shift.end_time.strftime("%Y-%m-%d %H:%M") if shift.end_time else None,
        "opening_balance": opening,
        "total_cash_in": round(cash_in, 2),
        "total_cash_out": round(cash_out, 2),
        "total_card_sales": round(card_sales, 2),
        "total_other_sales": round(other_sales, 2),
        "total_sales": total_sales,
        "expected_drawer_cash": expected_drawer,
        "actual_closing_balance": closing,
        "variance": variance,
        "variance_status": variance_status,
        "variance_status_display": variance_status_display,
        "has_overtime": shift.has_overtime,
        "overtime_hours": float(shift.overtime_hours or 0.0),
        "overtime_cost": float(shift.overtime_cost or 0.0),
    }


# 4. نقاط نهاية تخصيص الورديات (Shift Allocations)
def _format_allocation(alloc: ShiftAllocation) -> dict:
    is_active = False
    recon = None
    if alloc.actual_pos_shift:
        if alloc.actual_pos_shift.status == 'open':
            is_active = True
        recon = calculate_shift_reconciliation(alloc.actual_pos_shift)
    elif alloc.status == 'active':
        is_active = True

    return {
        "id": alloc.id,
        "employee_id": alloc.employee.id,
        "employee_name": alloc.employee.name,
        "employee_role": alloc.employee.get_role_display(),
        "shift_template_id": alloc.shift_template_id,
        "shift_name": alloc.shift_name,
        "date": alloc.date.strftime("%Y-%m-%d"),
        "start_time": alloc.start_time.strftime("%H:%M"),
        "end_time": alloc.end_time.strftime("%H:%M"),
        "pos_station": alloc.pos_station,
        "status": alloc.status,
        "status_display": dict(ShiftAllocation.STATUS_CHOICES).get(alloc.status, alloc.status),
        "actual_pos_shift_id": alloc.actual_pos_shift_id,
        "is_pos_active": is_active,
        "has_overtime": alloc.has_overtime,
        "overtime_hours": float(alloc.overtime_hours),
        "overtime_hourly_rate": float(alloc.overtime_hourly_rate),
        "overtime_total_cost": float(alloc.overtime_total_cost),
        "extra_duties": alloc.extra_duties or "",
        "overtime_status": alloc.overtime_status,
        "overtime_status_display": dict(ShiftAllocation.OVERTIME_STATUS_CHOICES).get(alloc.overtime_status, alloc.overtime_status),
        "notes": alloc.notes or "",
        "created_at": alloc.created_at.strftime("%Y-%m-%d %H:%M"),
        # مطابقة الوردية والفارق المالي إن وُجدت جلسة نقطة بيع مرتبطة
        "actual_closing_balance": float(alloc.actual_pos_shift.closing_balance) if alloc.actual_pos_shift and alloc.actual_pos_shift.closing_balance is not None else None,
        "expected_drawer_cash": recon.get("expected_drawer_cash") if recon else None,
        "variance": recon.get("variance") if recon else None,
        "variance_status": recon.get("variance_status") if recon else None,
        "variance_status_display": recon.get("variance_status_display") if recon else None,
    }


@shifts_router.get("/allocations/", response=List[ShiftAllocationOut])
def list_shift_allocations(
    request,
    date_str: Optional[str] = None,
    employee_id: Optional[int] = None,
    status: Optional[str] = None
):
    """
    جلب تخصيصات الورديات مع إمكانية التصفية بحسب التاريخ والموظف والحالة.
    """
    qs = ShiftAllocation.objects.select_related('employee__user', 'shift_template', 'actual_pos_shift').all()
    
    if date_str:
        qs = qs.filter(date=date_str)
    if employee_id:
        qs = qs.filter(employee_id=employee_id)
    if status and status != 'all':
        qs = qs.filter(status=status)
        
    return [_format_allocation(a) for a in qs]


@shifts_router.post("/allocations/", response=ShiftAllocationOut)
def create_shift_allocation(request, payload: ShiftAllocationIn):
    """
    تخصيص وردية لموظف أو كاشير مع تحديد التاريخ وساعات التوقيت وسعر العمل الإضافي.
    """
    employee = get_object_or_404(Employee, id=payload.employee_id)
    
    start_parts = [int(p) for p in payload.start_time.split(":")[:2]]
    end_parts = [int(p) for p in payload.end_time.split(":")[:2]]
    
    shift_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
    
    template = None
    if payload.shift_template_id:
        template = ShiftTemplate.objects.filter(id=payload.shift_template_id).first()

    allocation = ShiftAllocation.objects.create(
        employee=employee,
        shift_template=template,
        shift_name=payload.shift_name,
        date=shift_date,
        start_time=time(start_parts[0], start_parts[1]),
        end_time=time(end_parts[0], end_parts[1]),
        pos_station=payload.pos_station or "نقطة البيع الرئيسية (POS 1)",
        overtime_hourly_rate=Decimal(str(payload.overtime_hourly_rate)),
        has_overtime=payload.has_overtime,
        overtime_hours=Decimal(str(payload.overtime_hours or 0.0)),
        extra_duties=payload.extra_duties or "",
        overtime_status=payload.overtime_status if payload.has_overtime else 'none',
        notes=payload.notes or "",
        status='scheduled'
    )
    return _format_allocation(allocation)


@shifts_router.put("/allocations/{allocation_id}/", response=ShiftAllocationOut)
def update_shift_allocation(request, allocation_id: int, payload: ShiftAllocationUpdateIn):
    """
    تعديل بيانات تخصيص الوردية (التوقيت، المحطة، الحالة، وساعات وتكلفة العمل الإضافي).
    """
    allocation = get_object_or_404(ShiftAllocation, id=allocation_id)
    
    if payload.shift_name:
        allocation.shift_name = payload.shift_name
    if payload.date:
        allocation.date = datetime.strptime(payload.date, "%Y-%m-%d").date()
    if payload.start_time:
        p = [int(x) for x in payload.start_time.split(":")[:2]]
        allocation.start_time = time(p[0], p[1])
    if payload.end_time:
        p = [int(x) for x in payload.end_time.split(":")[:2]]
        allocation.end_time = time(p[0], p[1])
    if payload.pos_station:
        allocation.pos_station = payload.pos_station
    if payload.status:
        allocation.status = payload.status
    if payload.notes is not None:
        allocation.notes = payload.notes
    if payload.has_overtime is not None:
        allocation.has_overtime = payload.has_overtime
    if payload.overtime_hours is not None:
        allocation.overtime_hours = Decimal(str(payload.overtime_hours))
    if payload.overtime_hourly_rate is not None:
        allocation.overtime_hourly_rate = Decimal(str(payload.overtime_hourly_rate))
    if payload.extra_duties is not None:
        allocation.extra_duties = payload.extra_duties
    if payload.overtime_status is not None:
        allocation.overtime_status = payload.overtime_status
        
    allocation.save()
    return _format_allocation(allocation)


@shifts_router.post("/overtime/create/", response=ShiftAllocationOut)
def create_standalone_overtime(request, payload: StandaloneOvertimeIn):
    """
    تسجيل عمل ومهمة إضافية جديدة لموظف مع تحديد الساعات والتكلفة والبيان واعتمادها.
    """
    employee = get_object_or_404(Employee, id=payload.employee_id)
    duty_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
    
    # التحقق مما إذا كان هناك تخصيص لنفس الموظف في هذا اليوم لتحديثه
    alloc = ShiftAllocation.objects.filter(employee=employee, date=duty_date).first()
    if alloc:
        alloc.has_overtime = True
        alloc.overtime_hours = Decimal(str(payload.overtime_hours))
        alloc.overtime_hourly_rate = Decimal(str(payload.overtime_hourly_rate))
        alloc.extra_duties = payload.extra_duties
        alloc.overtime_status = payload.overtime_status or 'pending'
        alloc.save()
        return _format_allocation(alloc)
    
    # إذا لم يكن هناك تخصيص مسبق، ننشئ تخصيصاً مخصصاً للمهمة الإضافية
    alloc = ShiftAllocation.objects.create(
        employee=employee,
        shift_name="مهمة عمل إضافية",
        date=duty_date,
        start_time=time(16, 0),
        end_time=time(20, 0),
        pos_station="ميداني / إضافي",
        has_overtime=True,
        overtime_hours=Decimal(str(payload.overtime_hours)),
        overtime_hourly_rate=Decimal(str(payload.overtime_hourly_rate)),
        extra_duties=payload.extra_duties,
        overtime_status=payload.overtime_status or 'pending',
        notes=payload.notes or "مهمة عمل إضافية مباشرة",
        status='scheduled'
    )
    return _format_allocation(alloc)


@shifts_router.delete("/allocations/{allocation_id}/")
def delete_shift_allocation(request, allocation_id: int):
    """
    إلغاء أو حذف تخصيص وردية.
    """
    allocation = get_object_or_404(ShiftAllocation, id=allocation_id)
    allocation.delete()
    return {"success": True, "message": "تم إلغاء تخصيص الوردية بنجاح"}


# 5. نقاط نهاية الأعمال الإضافية وتكلفتها (Overtime & Cost Management)
@shifts_router.post("/allocations/{allocation_id}/overtime/", response=ShiftAllocationOut)
def record_shift_overtime(request, allocation_id: int, payload: OvertimeUpdateIn):
    """
    تسجيل أو تعديل الأعمال الإضافية وساعات العمل وتكلفتها وحالة الاعتماد.
    """
    allocation = get_object_or_404(ShiftAllocation, id=allocation_id)
    
    allocation.has_overtime = payload.has_overtime
    allocation.overtime_hours = Decimal(str(payload.overtime_hours))
    if payload.overtime_hourly_rate is not None:
        allocation.overtime_hourly_rate = Decimal(str(payload.overtime_hourly_rate))
    allocation.extra_duties = payload.extra_duties
    if payload.overtime_status:
        allocation.overtime_status = payload.overtime_status

    allocation.save()

    # إذا كانت مرتبطة بوردية POS فعلية، نقوم أيضاً بمزامنة بيانات الإضافي معها
    if allocation.actual_pos_shift:
        pos_shift = allocation.actual_pos_shift
        pos_shift.has_overtime = allocation.has_overtime
        pos_shift.overtime_hours = allocation.overtime_hours
        pos_shift.overtime_rate = allocation.overtime_hourly_rate
        pos_shift.overtime_cost = allocation.overtime_total_cost
        pos_shift.extra_duties = allocation.extra_duties
        pos_shift.save()

    return _format_allocation(allocation)


# 6. إحصائيات عامة للورديات (Summary & Dashboard)
@shifts_router.get("/summary/", response=ShiftSummaryOut)
def get_shifts_summary(request, date_str: Optional[str] = None):
    """
    ملخص إحصائي شامل لورديات اليوم والعمل الإضافي وتكلفته.
    """
    target_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else timezone.now().date()
    
    allocations = ShiftAllocation.objects.filter(date=target_date)
    
    total_today = allocations.count()
    active_count = allocations.filter(Q(status='active') | Q(actual_pos_shift__status='open')).count()
    scheduled_count = allocations.filter(status='scheduled').count()
    completed_count = allocations.filter(status='completed').count()
    
    overtime_agg = allocations.filter(has_overtime=True).aggregate(
        hours=Sum('overtime_hours'),
        cost=Sum('overtime_total_cost')
    )
    
    return {
        "total_shifts_today": total_today,
        "active_pos_shifts": active_count,
        "total_overtime_hours": float(overtime_agg['hours'] or 0),
        "total_overtime_cost": float(overtime_agg['cost'] or 0),
        "scheduled_count": scheduled_count,
        "completed_count": completed_count,
    }


# 7. التكامل التلقائي مع نقطة البيع (POS Integration)
@shifts_router.get("/pos/active-session/", auth=JWTAuth())
def get_pos_active_session(request):
    """
    جلب الوردية النشطة للكاشير الحالي في نقطة البيع مع معلومات الوردية المخصصة وتوقيتها.
    """
    user = request.auth
    today = timezone.now().date()
    
    # 1. البحث عن وردية كاشير مفتوحة حالياً
    active_shift = Shift.objects.filter(cashier=user, status='open').first()
    
    # 2. البحث عن التخصيص المجدول لهذا الموظف اليوم
    employee = Employee.objects.filter(user=user).first()
    allocation = None
    if employee:
        allocation = ShiftAllocation.objects.filter(employee=employee, date=today).first()

    return {
        "has_active_shift": active_shift is not None,
        "active_shift": {
            "id": active_shift.id,
            "shift_name": active_shift.shift_name,
            "opening_balance": float(active_shift.opening_balance),
            "start_time": active_shift.start_time.strftime("%Y-%m-%d %H:%M"),
            "scheduled_start_time": active_shift.scheduled_start_time.strftime("%H:%M") if active_shift.scheduled_start_time else None,
            "scheduled_end_time": active_shift.scheduled_end_time.strftime("%H:%M") if active_shift.scheduled_end_time else None,
            "has_overtime": active_shift.has_overtime,
            "overtime_hours": float(active_shift.overtime_hours),
            "overtime_cost": float(active_shift.overtime_cost),
            "extra_duties": active_shift.extra_duties or "",
        } if active_shift else None,
        "today_allocation": _format_allocation(allocation) if allocation else None,
    }


@shifts_router.post("/pos/start/", auth=JWTAuth())
def start_pos_shift_with_allocation(
    request,
    opening_balance: float,
    allocation_id: Optional[int] = None,
    custom_shift_name: Optional[str] = None
):
    """
    فتح وردية كاشير في نقطة البيع وربطها بالتخصيص والتوقيت المحدد.
    """
    user = request.auth
    existing_shift = Shift.objects.filter(cashier=user, status='open').first()
    if existing_shift:
        return {"status": "already_open", "shift_id": existing_shift.id}

    allocation = None
    if allocation_id:
        allocation = ShiftAllocation.objects.filter(id=allocation_id).first()
    else:
        # البحث التلقائي عن تخصيص اليوم لهذا الموظف
        employee = Employee.objects.filter(user=user).first()
        if employee:
            allocation = ShiftAllocation.objects.filter(
                employee=employee, date=timezone.now().date(), status__in=['scheduled', 'active']
            ).first()

    shift_name_val = custom_shift_name or (allocation.shift_name if allocation else "الوردية المباشرة")
    sched_start = allocation.start_time if allocation else None
    sched_end = allocation.end_time if allocation else None

    # إنشاء جلسة الكاشير في نقطة البيع
    pos_shift = Shift.objects.create(
        cashier=user,
        opening_balance=Decimal(str(opening_balance)),
        shift_name=shift_name_val,
        scheduled_start_time=sched_start,
        scheduled_end_time=sched_end,
        status='open'
    )

    # تحديث حالة التخصيص وربطه بجلسة الكاشير
    if allocation:
        allocation.actual_pos_shift = pos_shift
        allocation.status = 'active'
        allocation.save()

    return {
        "status": "success",
        "shift_id": pos_shift.id,
        "shift_name": pos_shift.shift_name,
        "opening_balance": float(pos_shift.opening_balance),
        "allocation_id": allocation.id if allocation else None,
    }


@shifts_router.post("/pos/finish/", auth=JWTAuth())
def finish_pos_shift_with_overtime(
    request,
    closing_balance: float,
    has_overtime: bool = False,
    overtime_hours: float = 0.0,
    overtime_rate: float = 15.0,
    extra_duties: Optional[str] = None
):
    """
    إغلاق وردية الكاشير في نقطة البيع مع تسجيل الأعمال الإضافية وتكلفتها مباشرة.
    """
    user = request.auth
    shift = get_object_or_404(Shift, cashier=user, status='open')
    
    shift.status = 'closed'
    shift.end_time = timezone.now()
    shift.closing_balance = Decimal(str(closing_balance))

    if has_overtime and overtime_hours > 0:
        shift.has_overtime = True
        shift.overtime_hours = Decimal(str(overtime_hours))
        shift.overtime_rate = Decimal(str(overtime_rate))
        shift.overtime_cost = Decimal(str(round(overtime_hours * overtime_rate, 2)))
        shift.extra_duties = extra_duties or ""
    
    shift.save()

    # تحديث التخصيص المرتبط بالوردية إن وجد
    allocation = ShiftAllocation.objects.filter(actual_pos_shift=shift).first()
    if allocation:
        allocation.status = 'completed'
        if has_overtime and overtime_hours > 0:
            allocation.has_overtime = True
            allocation.overtime_hours = Decimal(str(overtime_hours))
            allocation.overtime_hourly_rate = Decimal(str(overtime_rate))
            allocation.extra_duties = extra_duties or ""
            allocation.overtime_status = 'pending'
    # حساب المطابقة المالية للوردية
    recon = calculate_shift_reconciliation(shift)

    return {
        "status": "success",
        "shift_id": shift.id,
        "closing_balance": float(shift.closing_balance),
        "has_overtime": shift.has_overtime,
        "overtime_hours": float(shift.overtime_hours),
        "overtime_cost": float(shift.overtime_cost),
        "reconciliation": recon,
    }


# 8. حساب فرق إجمالي الوردية الواحدة والمطابقة النقدية (Shift Variance & Reconciliation)
@shifts_router.get("/{shift_id}/reconciliation/", response=ShiftReconciliationOut)
def get_shift_reconciliation(request, shift_id: int):
    """
    احتساب فرق إجمالي الوردية الواحدة والمطابقة المالية المباشرة،
    بما في ذلك الرصيد الافتتاحي، المقبوضات النقدية، المصروفات، الرصيد المتوقع، الفعلي، وفرق العجز أو الفائض.
    """
    shift = get_object_or_404(Shift, id=shift_id)
    return calculate_shift_reconciliation(shift)


@shifts_router.get("/pos/current-reconciliation/", response=ShiftReconciliationOut, auth=JWTAuth())
def get_current_pos_shift_reconciliation(request):
    """
    معاينة المطابقة النقدية اللحظية لوردية الكاشير الحالية المفتوحة في نقطة البيع لمعرفة المتوقع في الدرج حالياً.
    """
    user = request.auth
    shift = get_object_or_404(Shift, cashier=user, status='open')
    return calculate_shift_reconciliation(shift)


class CloseShiftWithVariancePayload(Schema):
    counted_cash: float
    notes: Optional[str] = None


@shifts_router.post("/{shift_id}/close/")
@shifts_router.post("/{shift_id}/close")
def close_shift_variance_endpoint(request, shift_id: int, payload: CloseShiftWithVariancePayload):
    """
    إغلاق الوردية وحساب الفارق المالي وتصنيف الحالة (BALANCED, SURPLUS, DEFICIT).
    """
    from .services import ShiftReconciliationService
    shift = get_object_or_404(Shift, id=shift_id)
    return ShiftReconciliationService.reconcile_and_close_shift(shift, payload.counted_cash, payload.notes)

