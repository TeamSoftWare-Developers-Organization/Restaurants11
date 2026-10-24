# payments/api.py

from ninja import Router, Schema
from typing import List, Optional, Any, Union
from datetime import datetime, date
from django.shortcuts import get_object_or_404
from django.db.models import Sum

from .models import Payment, Shift, TreasuryTransaction, SalaryPayment
from orders.models import Order
from orders.api import OrderOut
from employees.models import Employee
from ninja_jwt.authentication import JWTAuth
from django.utils import timezone



# إنشاء موجه (Router) خاص بتطبيق payments
payments_router = Router(tags=["المدفوعات"])

# 1. تعريف المخططات (Schemas) لـ Payment

class PaymentIn(Schema):
    order_id: int
    amount: float
    payment_method: str
    card_provider: Optional[str] = None
    transaction_id: Optional[str] = None

class PaymentOut(Schema):
    id: int
    order_id: int 
    payment_date_time: datetime
    amount: float
    payment_method: str
    card_provider: Optional[str] = None
    transaction_id: Optional[str] = None

# مخططات الوردية (Shift)
class ShiftIn(Schema):
    opening_balance: float

class ShiftOut(Schema):
    id: int
    cashier_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    opening_balance: float
    closing_balance: Optional[float] = None
    status: str

class ShiftCloseIn(Schema):
    closing_balance: float

class CloseShiftWithVarianceIn(Schema):
    counted_cash: float
    notes: Optional[str] = None

class ShiftReconciliationReportOut(Schema):
    success: bool
    shift_id: int
    shift_name: str
    cashier_id: int
    cashier_name: str
    start_time: str
    end_time: str
    opening_balance: float
    cash_sales: float
    cash_in: float
    cash_out: float
    card_sales: float
    other_sales: float
    total_sales: float
    expected_cash: float
    counted_cash: float
    actual_closing_balance: float
    variance: float
    variance_status: str
    variance_status_display: str
    color: str
    notes: Optional[str] = ""
    timestamp: str

# مخططات حركات الخزينة (TreasuryTransaction)
class TreasuryTransactionIn(Schema):
    amount: float
    reference_type: str # expense, general_expense, salary, refund
    description: Optional[str] = None
    reference_id: Optional[int] = None

class TreasuryTransactionOut(Schema):
    id: int
    shift_id: Optional[int] = None
    amount: float
    transaction_type: str
    reference_type: str
    reference_id: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime

class SalaryPaymentIn(Schema):
    employee_id: int
    amount: float
    month_covered: str
    basic_salary: Optional[float] = 0.0
    absence_days: Optional[int] = 0
    daily_rate: Optional[float] = 0.0
    absence_deduction: Optional[float] = 0.0
    late_deduction: Optional[float] = 0.0
    late_minutes: Optional[int] = 0
    bonus_amount: Optional[float] = 0.0
    deduction_reason: Optional[str] = None
    absence_dates_detail: Optional[str] = None
    shortage_deduction: Optional[float] = 0.0
    shortage_reason: Optional[str] = None
    payment_day_name: Optional[str] = None
    admin_username: Optional[str] = None
    admin_password: Optional[str] = None
    notes: Optional[str] = None

class SalaryPaymentOut(Schema):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    amount: float
    basic_salary: float = 0.0
    absence_days: int = 0
    daily_rate: float = 0.0
    absence_deduction: float = 0.0
    late_deduction: float = 0.0
    late_minutes: int = 0
    bonus_amount: float = 0.0
    deduction_reason: Optional[str] = None
    absence_dates_detail: Optional[str] = None
    shortage_deduction: float = 0.0
    shortage_reason: Optional[str] = None
    deduction_approved_by_name: Optional[str] = None
    payment_date: Any
    payment_day_name: Optional[str] = None
    month_covered: str
    notes: Optional[str] = None

    @staticmethod
    def resolve_payment_day_name(obj):
        if getattr(obj, 'payment_date', None):
            ARABIC_DAYS = {
                0: 'الإثنين',
                1: 'الثلاثاء',
                2: 'الأربعاء',
                3: 'الخميس',
                4: 'الجمعة',
                5: 'السبت',
                6: 'الأحد'
            }
            try:
                p_date = obj.payment_date
                if isinstance(p_date, str):
                    p_date = datetime.strptime(p_date, '%Y-%m-%d').date()
                weekday = p_date.weekday()
                return ARABIC_DAYS.get(weekday, '')
            except Exception:
                return ''
        return ''

    @staticmethod
    def resolve_employee_name(obj):
        if getattr(obj, 'employee', None):
            return obj.employee.name
        return f"موظف #{obj.employee_id}"

    @staticmethod
    def resolve_deduction_approved_by_name(obj):
        if getattr(obj, 'deduction_approved_by', None):
            full = f"{obj.deduction_approved_by.first_name} {obj.deduction_approved_by.last_name}".strip()
            return full or obj.deduction_approved_by.username
        return None

class AbsenceDayItem(Schema):
    date: str
    day_name: str
    is_friday: bool = False

class ShiftDeficitItem(Schema):
    shift_id: int
    date: str
    expected_cash: float
    actual_cash: float
    deficit_amount: float
    shift_name: str
    notes: Optional[str] = None

class AbsenceCalculationOut(Schema):
    employee_id: int
    employee_name: str
    month: str
    today_date: str
    current_day_name: str
    basic_salary: float
    total_days: int
    effective_days: int
    attended_days: int
    absence_days: int
    daily_rate: float
    suggested_deduction: float
    suggested_net: float
    absence_dates_list: List[AbsenceDayItem] = []
    total_uncovered_shortage: float = 0.0
    detected_shortages: List[ShiftDeficitItem] = []
    total_late_minutes: int = 0
    total_late_days: int = 0
    suggested_late_deduction: float = 0.0
    late_deduction_rate_per_day: float = 0.0

class VerifyAdminIn(Schema):
    admin_username: str
    admin_password: str

class VerifyAdminOut(Schema):
    success: bool
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    message: Optional[str] = None

class TreasurySummaryOut(Schema):
    total_balance: float
    total_inflows: float
    total_outflows: float
    total_sales: float
    total_expenses: float
    total_salaries: float

# نقاط نهاية CRUD لـ Payment (المدفوعات)

@payments_router.get("/", response=List[PaymentOut])
def list_payments(request):
    """
    جلب قائمة بجميع المدفوعات المسجلة.
    """
    return Payment.objects.all()

@payments_router.post("/", response=PaymentOut, auth=JWTAuth())
def record_payment(request, payment_data: PaymentIn):
    """
    تسجيل دفعة جديدة لطلب معين مع تسجيل حركة الخزينة إذا كان الدفع نقداً.
    """
    order = get_object_or_404(Order, id=payment_data.order_id)
    
    payment = Payment.objects.create(
        order=order,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        card_provider=payment_data.card_provider,
        transaction_id=payment_data.transaction_id
    )
    
    # تسجيل حركة خزينة إذا كان الدفع نقداً وكان هناك وردية مفتوحة
    if payment_data.payment_method == 'cash':
        current_shift = Shift.objects.filter(cashier=request.auth, status='open').first()
        if current_shift:
            TreasuryTransaction.objects.create(
                shift=current_shift,
                amount=payment_data.amount,
                transaction_type='in',
                reference_type='order',
                reference_id=order.id,
                description=f"دفع طلب رقم {order.id}"
            )

    # بعد الدفع، نتحقق مما إذا كان الطلب قد تم دفعه بالكامل
    total_paid = Payment.objects.filter(order=order).aggregate(Sum('amount'))['amount__sum'] or 0
    if total_paid >= order.total_amount:
        order.status = 'paid'
        order.save()
        
    return payment

@payments_router.get("/test-no-auth")
def test_no_auth(request):
    return {"message": "Payments router is working without auth"}

# نقاط نهاية مخصصة للوردية والخزينة

@payments_router.post("/shifts/open", response=ShiftOut, auth=JWTAuth())
def open_shift(request, data: ShiftIn):
    """
    فتح وردية جديدة للكاشير.
    """
    # التأكد من عدم وجود وردية مفتوحة مسبقاً لهذا المستخدم
    existing_shift = Shift.objects.filter(cashier=request.auth, status='open').first()
    if existing_shift:
        return existing_shift

    shift = Shift.objects.create(
        cashier=request.auth,
        opening_balance=data.opening_balance,
        status='open'
    )
    return shift

@payments_router.post("/shifts/close", response=ShiftOut, auth=JWTAuth())
def close_shift(request, data: ShiftCloseIn):
    """
    إغلاق الوردية الحالية.
    """
    shift = get_object_or_404(Shift, cashier=request.auth, status='open')
    shift.status = 'closed'
    shift.end_time = timezone.now()
    shift.closing_balance = data.closing_balance
    shift.save()
    return shift

@payments_router.post("/shifts/{shift_id}/close/", response=ShiftReconciliationReportOut)
@payments_router.post("/shifts/{shift_id}/close", response=ShiftReconciliationReportOut)
def close_shift_with_variance(request, shift_id: int, data: CloseShiftWithVarianceIn):
    """
    إغلاق الوردية وحساب الفارق المالي وتصنيف الحالة (BALANCED, SURPLUS, DEFICIT).
    """
    from .services import ShiftReconciliationService
    shift = get_object_or_404(Shift, id=shift_id)
    return ShiftReconciliationService.reconcile_and_close_shift(shift, data.counted_cash, data.notes)

@payments_router.post("/shifts/close-reconciliation/", response=ShiftReconciliationReportOut, auth=JWTAuth())
@payments_router.post("/shifts/close-reconciliation", response=ShiftReconciliationReportOut, auth=JWTAuth())
def close_current_shift_with_variance(request, data: CloseShiftWithVarianceIn):
    """
    إغلاق وردية المستخدم الحالية المفتوحة مع تقرير المطابقة والفروقات.
    """
    from .services import ShiftReconciliationService
    shift = get_object_or_404(Shift, cashier=request.auth, status='open')
    return ShiftReconciliationService.reconcile_and_close_shift(shift, data.counted_cash, data.notes)

@payments_router.get("/shifts/{shift_id}/reconciliation-report/", response=ShiftReconciliationReportOut)
@payments_router.get("/shifts/{shift_id}/reconciliation-report", response=ShiftReconciliationReportOut)
def get_shift_variance_report(request, shift_id: int):
    """
    معاينة أو جلب تقرير المطابقة لوردية محددة.
    """
    from .services import ShiftReconciliationService
    shift = get_object_or_404(Shift, id=shift_id)
    financials = ShiftReconciliationService.calculate_expected_cash(shift)
    counted = float(shift.closing_balance) if shift.closing_balance is not None else financials["expected_cash"]
    return ShiftReconciliationService.reconcile_and_close_shift(shift, counted)


@payments_router.get("/shifts/current", response=Optional[ShiftOut], auth=JWTAuth())
def get_current_shift(request):
    """
    جلب الوردية المفتوحة الحالية للمستخدم.
    """
    return Shift.objects.filter(cashier=request.auth, status='open').first()

@payments_router.post("/transactions/expense", response=TreasuryTransactionOut, auth=JWTAuth())
def record_expense(request, data: TreasuryTransactionIn):
    """
    تسجيل مصاريف من الخزينة.
    """
    shift = get_object_or_404(Shift, cashier=request.auth, status='open')
    transaction = TreasuryTransaction.objects.create(
        shift=shift,
        amount=data.amount,
        transaction_type='out',
        reference_type=data.reference_type,
        reference_id=data.reference_id,
        description=data.description
    )
    return transaction

@payments_router.get("/shifts/{shift_id}/transactions", response=List[TreasuryTransactionOut], auth=JWTAuth())
def list_shift_transactions(request, shift_id: int):
    """
    عرض جميع الحركات لوردية معينة.
    """
    shift = get_object_or_404(Shift, id=shift_id)
    return shift.transactions.all()

# --- نقاط النهاية الجديدة للنظام المالي ---

@payments_router.get("/treasury/summary", response=TreasurySummaryOut, auth=JWTAuth())
def get_treasury_summary(request):
    """
    ملخص مالي عام للخزينة.
    """
    inflows = TreasuryTransaction.objects.filter(transaction_type='in').aggregate(Sum('amount'))['amount__sum'] or 0
    outflows = TreasuryTransaction.objects.filter(transaction_type='out').aggregate(Sum('amount'))['amount__sum'] or 0
    
    sales = TreasuryTransaction.objects.filter(reference_type='order').aggregate(Sum('amount'))['amount__sum'] or 0
    expenses = TreasuryTransaction.objects.filter(reference_type__in=['expense', 'general_expense']).aggregate(Sum('amount'))['amount__sum'] or 0
    salaries = TreasuryTransaction.objects.filter(reference_type='salary').aggregate(Sum('amount'))['amount__sum'] or 0
    
    return {
        "total_balance": float(inflows - outflows),
        "total_inflows": float(inflows),
        "total_outflows": float(outflows),
        "total_sales": float(sales),
        "total_expenses": float(expenses),
        "total_salaries": float(salaries)
    }

@payments_router.get("/transactions/general", response=List[TreasuryTransactionOut], auth=JWTAuth())
def list_general_transactions(request):
    """
    عرض جميع الحركات المالية (العامة والورديات).
    """
    return TreasuryTransaction.objects.all()

@payments_router.post("/transactions/general-expense", response=TreasuryTransactionOut, auth=JWTAuth())
def record_general_expense(request, data: TreasuryTransactionIn):
    """
    تسجيل مصروف عام (غير مرتبط بوردية محددة).
    """
    transaction = TreasuryTransaction.objects.create(
        amount=data.amount,
        transaction_type='out',
        reference_type='general_expense',
        reference_id=data.reference_id,
        description=data.description
    )
    return transaction

def is_user_admin_or_manager(user) -> bool:
    if not user:
        return False
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return True
    if hasattr(user, 'employee_profile'):
        role = (user.employee_profile.role or '').lower()
        if role in ['admin', 'manager']:
            return True
        perms = user.employee_profile.get_effective_permissions()
        if perms.get('salaries') and perms.get('employees'):
            return True
    return False

@payments_router.get("/salaries", response=List[SalaryPaymentOut], auth=JWTAuth())
def list_salaries(request):
    """
    عرض سجل صرف المرتبات مع تفاصيل الخصومات.
    """
    return SalaryPayment.objects.select_related('employee', 'employee__user', 'deduction_approved_by').all()

@payments_router.get("/salaries/calculate-absence", response=AbsenceCalculationOut, auth=JWTAuth())
def calculate_employee_absence(request, employee_id: int, month: str):
    """
    حساب تفاصيل حضور وغياب الموظف لشهر محدد وحساب قيمة الخصم المقترحة.
    """
    import calendar
    from datetime import date
    from employees.models import AttendanceLog

    employee = get_object_or_404(Employee, id=employee_id)
    try:
        parts = month.split('-')
        year = int(parts[0])
        month_num = int(parts[1])
    except (ValueError, IndexError):
        today = date.today()
        year, month_num = today.year, today.month
        month = f"{year:04d}-{month_num:02d}"

    days_in_month = calendar.monthrange(year, month_num)[1]
    today = date.today()

    if year == today.year and month_num == today.month:
        effective_days = min(today.day, days_in_month)
    elif date(year, month_num, 1) < today:
        effective_days = days_in_month
    else:
        effective_days = 0

    attended_dates = set(AttendanceLog.objects.filter(
        employee=employee,
        timestamp__year=year,
        timestamp__month=month_num,
        punch_type='CHECK_IN'
    ).values_list('timestamp__date', flat=True))

    ARABIC_DAYS = {
        0: 'الإثنين',
        1: 'الثلاثاء',
        2: 'الأربعاء',
        3: 'الخميس',
        4: 'الجمعة',
        5: 'السبت',
        6: 'الأحد'
    }

    absence_dates_list = []
    for day_i in range(1, effective_days + 1):
        cur_date = date(year, month_num, day_i)
        if cur_date not in attended_dates:
            weekday = cur_date.weekday()
            absence_dates_list.append({
                "date": cur_date.isoformat(),
                "day_name": ARABIC_DAYS.get(weekday, ''),
                "is_friday": (weekday == 4)
            })

    attended_days = len(attended_dates)
    absence_days = max(0, effective_days - attended_days)
    basic_salary = float(getattr(employee, 'basic_salary', 0.0) or 0.0)
    daily_rate = round(basic_salary / 30.0, 2) if basic_salary > 0 else 0.0
    suggested_deduction = round(absence_days * daily_rate, 2)
    suggested_net = max(0.0, round(basic_salary - suggested_deduction, 2))

    # فحص وحساب أي عجز مسجل على الموظف في الورديات (Shortage/Deficit Detection)
    detected_shortages = []
    total_uncovered_shortage = 0.0

    if employee.user:
        from .services import ShiftReconciliationService
        emp_shifts = Shift.objects.filter(
            cashier=employee.user,
            start_time__year=year,
            start_time__month=month_num,
            status='closed',
            closing_balance__isnull=False
        )
        for s in emp_shifts:
            rec = ShiftReconciliationService.calculate_expected_cash(s)
            expected_cash = rec["expected_cash"]
            actual_cash = float(s.closing_balance) if s.closing_balance is not None else 0.0
            variance = round(actual_cash - expected_cash, 2)
            if variance < -0.01:
                deficit = abs(variance)
                total_uncovered_shortage += deficit
                detected_shortages.append({
                    "shift_id": s.id,
                    "date": s.start_time.strftime("%Y-%m-%d"),
                    "expected_cash": expected_cash,
                    "actual_cash": actual_cash,
                    "deficit_amount": deficit,
                    "shift_name": getattr(s, 'shift_name', f'وردية #{s.id}'),
                    "notes": f"عجز وردية {s.start_time.strftime('%Y-%m-%d')}"
                })

    today_str = today.isoformat()
    current_day_name = ARABIC_DAYS.get(today.weekday(), '')

    return {
        "employee_id": employee.id,
        "employee_name": employee.name,
        "month": month,
        "today_date": today_str,
        "current_day_name": current_day_name,
        "basic_salary": basic_salary,
        "total_days": days_in_month,
        "effective_days": effective_days,
        "attended_days": attended_days,
        "absence_days": absence_days,
        "daily_rate": daily_rate,
        "suggested_deduction": suggested_deduction,
        "suggested_net": suggested_net,
        "absence_dates_list": absence_dates_list,
        "total_uncovered_shortage": round(total_uncovered_shortage, 2),
        "detected_shortages": detected_shortages
    }

@payments_router.post("/salaries/verify-admin", response={200: VerifyAdminOut, 400: VerifyAdminOut, 403: VerifyAdminOut}, auth=JWTAuth())
def verify_admin_for_salary(request, data: VerifyAdminIn):
    """
    التحقق من إذن المشرف أو المدير (Admin) لاعتماد خصم المرتبات.
    """
    from django.contrib.auth import authenticate
    user = authenticate(username=data.admin_username, password=data.admin_password)
    if not user:
        return 400, {
            "success": False,
            "message": "اسم المستخدم أو كلمة المرور للمشرف غير صحيحة."
        }
    if not is_user_admin_or_manager(user):
        return 403, {
            "success": False,
            "message": "المستخدم المدخل لا يمتلك صلاحيات المدير (Admin) لاعتماد الخصم."
        }
    admin_name = f"{user.first_name} {user.last_name}".strip() or user.username
    return 200, {
        "success": True,
        "admin_id": user.id,
        "admin_name": admin_name,
        "message": f"تم التحقق واعتماد الإذن بواسطة {admin_name} بنجاح."
    }

@payments_router.post("/salaries", response={200: SalaryPaymentOut, 400: dict, 403: dict}, auth=JWTAuth())
def record_salary_payment(request, data: SalaryPaymentIn):
    """
    تسجيل صرف مرتب لموظف مع تحديد وخصم الغياب بإذن واعتماد Admin.
    """
    from django.contrib.auth import authenticate
    employee = get_object_or_404(Employee, id=data.employee_id)
    
    absence_deduction = float(data.absence_deduction or 0.0)
    shortage_deduction = float(data.shortage_deduction or 0.0)
    total_deductions = absence_deduction + shortage_deduction
    approved_by_admin = None

    # التحقق من إذن واعتماد الأدمن إذا وجد خصم غياب أو خصم عجز
    if total_deductions > 0:
        if is_user_admin_or_manager(request.auth):
            approved_by_admin = request.auth
        elif data.admin_username and data.admin_password:
            admin_user = authenticate(username=data.admin_username, password=data.admin_password)
            if not admin_user:
                return 400, {"message": "بيانات اعتماد المشرف (Admin) غير صحيحة."}
            if not is_user_admin_or_manager(admin_user):
                return 403, {"message": "المستخدم المدخل لا يمتلك صلاحية المدير (Admin) لاعتماد الخصم."}
            approved_by_admin = admin_user
        else:
            return 403, {
                "message": "تحديد أو تطبيق خصومات المرتبات (الغياب أو العجز) يتطلب إذن واعتماد المشرف أو المدير (Admin)."
            }

    # إذا كان للموظف مرتب أساسي ولم يكن محفوظاً في البروفايل، نحدثه
    if data.basic_salary and data.basic_salary > 0 and (not employee.basic_salary or employee.basic_salary == 0):
        employee.basic_salary = data.basic_salary
        employee.save(update_fields=['basic_salary'])

    # 1. إنشاء سجل صرف المرتب
    salary = SalaryPayment.objects.create(
        employee=employee,
        amount=data.amount,
        basic_salary=data.basic_salary or 0.0,
        absence_days=data.absence_days or 0,
        daily_rate=data.daily_rate or 0.0,
        absence_deduction=absence_deduction,
        shortage_deduction=shortage_deduction,
        shortage_reason=data.shortage_reason,
        bonus_amount=data.bonus_amount or 0.0,
        deduction_reason=data.deduction_reason,
        absence_dates_detail=data.absence_dates_detail,
        deduction_approved_by=approved_by_admin,
        month_covered=data.month_covered,
        notes=data.notes
    )
    
    # 2. تسجيل العملية في الخزينة كحركة خروج
    deductions_list = []
    if absence_deduction > 0:
        deductions_list.append(f"خصم غياب: {absence_deduction} د.ل")
    if shortage_deduction > 0:
        deductions_list.append(f"خصم عجز: {shortage_deduction} د.ل")
    deduction_note = f" ({' | '.join(deductions_list)})" if deductions_list else ""

    TreasuryTransaction.objects.create(
        amount=data.amount,
        transaction_type='out',
        reference_type='salary',
        reference_id=salary.id,
        description=f"صرف مرتب {employee.user.username} لشهر {data.month_covered}{deduction_note}"
    )
    return 200, salary


# ==========================================
# محرك كشف التلاعب المالي والشذوذ (AI Fraud Detection)
# ==========================================

class ShiftRiskOut(Schema):
    shift_id: int
    cashier_name: str
    risk_score: int
    risk_status: str
    flags: List[str]
    cash_variance: float
    total_orders: int
    cancelled_orders: int


@payments_router.get("/ai/cash-anomalies/", response=List[ShiftRiskOut])
def list_cash_anomalies(request):
    """
    استرجاع تنبيهات الذكاء الاصطناعي الخاصة بالتلاعب المالي وعجز الخزينة
    """
    from ml_services.fraud_detector import FinancialAnomalyDetector
    return FinancialAnomalyDetector.get_recent_anomalies(limit=15)


# =========================================================================
# كشف هامش الربح والعجز وترحيلها إلى الخزينة (Profit Margin & Deficit Statement)
# =========================================================================

class ShiftDeficitItem(Schema):
    shift_id: int
    shift_name: str
    cashier_id: int
    cashier_name: str
    start_time: str
    end_time: Optional[str] = None
    expected_cash: float
    actual_cash: float
    variance: float
    deficit_amount: float
    is_settled: bool
    status: str
    status_display: str

class ProfitMarginStatementOut(Schema):
    total_sales: float
    total_cogs: float
    gross_profit: float
    gross_margin_percentage: float
    total_expenses: float
    total_salaries: float
    total_unsettled_deficits: float
    total_settled_deficits: float
    total_surplus: float
    net_profit: float
    net_profit_margin_percentage: float
    deficits_list: List[ShiftDeficitItem]
    treasury_current_balance: float

class SettleShiftDeficitIn(Schema):
    shift_id: int
    notes: Optional[str] = None

class TransferProfitIn(Schema):
    amount: float
    description: Optional[str] = None


@payments_router.get("/dashboard/profit-margin-and-deficits", response=ProfitMarginStatementOut, auth=JWTAuth())
def get_profit_margin_and_deficits(request):
    """
    استرجاع كشف هامش الربح ومجمل الأرباح وحصر العجوزات النقدية مع حالة ترحيلها بالخزينة.
    """
    from orders.models import Order, OrderItem
    from inventory.models import RecipeIngredient
    from .services import ShiftReconciliationService

    # 1. إجمالي المبيعات
    total_sales = float(Order.objects.filter(status__in=['completed', 'paid']).aggregate(total=Sum('total_amount'))['total'] or 0.0)

    # 2. تكلفة المواد المباعة (COGS)
    cogs = 0.0
    for oi in OrderItem.objects.filter(order__status__in=['completed', 'paid']).select_related('menu_item'):
        item = oi.menu_item
        item_cost = 0.0
        if item:
            recipes = RecipeIngredient.objects.filter(menu_item=item).select_related('ingredient')
            item_cost = sum(float(r.quantity_needed) * float(r.ingredient.cost_per_unit) for r in recipes)
            if item_cost == 0 and item.price > 0:
                item_cost = float(item.price) * 0.35
        elif getattr(oi, 'unit_price', 0) and oi.unit_price > 0:
            item_cost = float(oi.unit_price) * 0.35
        cogs += item_cost * oi.quantity

    cogs = round(cogs, 2)
    gross_profit = round(total_sales - cogs, 2)
    gross_margin_percentage = round((gross_profit / total_sales * 100), 1) if total_sales > 0 else 0.0

    # 3. المصروفات والرواتب
    total_expenses = float(TreasuryTransaction.objects.filter(reference_type__in=['expense', 'general_expense']).aggregate(total=Sum('amount'))['total'] or 0.0)
    total_salaries = float(SalaryPayment.objects.aggregate(total=Sum('amount'))['total'] or 0.0)

    # 4. فحص الورديات والعجوزات
    shifts = Shift.objects.filter(status='closed').order_by('-end_time')
    deficits_list = []
    total_unsettled_deficits = 0.0
    total_settled_deficits = 0.0
    total_surplus = 0.0

    for s in shifts:
        financials = ShiftReconciliationService.calculate_expected_cash(s)
        expected = financials['expected_cash']
        actual = float(s.closing_balance) if s.closing_balance is not None else expected
        variance = round(actual - expected, 2)

        cashier_name = ""
        if s.cashier:
            cashier_name = s.cashier.get_full_name() or s.cashier.username

        is_settled = getattr(s, 'is_variance_settled', False)

        if variance < -0.01:
            status = 'shortage'
            status_display = f'عجز نقدي: {abs(variance):.2f} د.ل'
            deficit_amount = abs(variance)
            if is_settled:
                total_settled_deficits += deficit_amount
            else:
                total_unsettled_deficits += deficit_amount
        elif variance > 0.01:
            status = 'surplus'
            status_display = f'فائض نقدي: {variance:+.2f} د.ل'
            deficit_amount = 0.0
            total_surplus += variance
        else:
            status = 'balanced'
            status_display = 'مطابق بدون فروقات'
            deficit_amount = 0.0

        deficits_list.append({
            "shift_id": s.id,
            "shift_name": s.shift_name or f"وردية #{s.id}",
            "cashier_id": s.cashier.id if s.cashier else 0,
            "cashier_name": cashier_name,
            "start_time": s.start_time.isoformat() if s.start_time else "",
            "end_time": s.end_time.isoformat() if s.end_time else "",
            "expected_cash": expected,
            "actual_cash": actual,
            "variance": variance,
            "deficit_amount": deficit_amount,
            "is_settled": is_settled,
            "status": status,
            "status_display": status_display
        })

    total_unsettled_deficits = round(total_unsettled_deficits, 2)
    total_settled_deficits = round(total_settled_deficits, 2)
    total_surplus = round(total_surplus, 2)

    # 5. صافي الربح
    net_profit = round(gross_profit - total_expenses - total_salaries - total_unsettled_deficits, 2)
    net_profit_margin_percentage = round((net_profit / total_sales * 100), 1) if total_sales > 0 else 0.0

    # 6. رصيد الخزينة الحالي
    inflows = TreasuryTransaction.objects.filter(transaction_type__in=['in', 'IN']).aggregate(total=Sum('amount'))['total'] or 0.0
    outflows = TreasuryTransaction.objects.filter(transaction_type__in=['out', 'OUT']).aggregate(total=Sum('amount'))['total'] or 0.0
    treasury_balance = round(float(inflows) - float(outflows), 2)

    return {
        "total_sales": total_sales,
        "total_cogs": cogs,
        "gross_profit": gross_profit,
        "gross_margin_percentage": gross_margin_percentage,
        "total_expenses": round(total_expenses, 2),
        "total_salaries": round(total_salaries, 2),
        "total_unsettled_deficits": total_unsettled_deficits,
        "total_settled_deficits": total_settled_deficits,
        "total_surplus": total_surplus,
        "net_profit": net_profit,
        "net_profit_margin_percentage": net_profit_margin_percentage,
        "deficits_list": deficits_list,
        "treasury_current_balance": treasury_balance
    }


@payments_router.post("/dashboard/settle-shift-deficit", response={200: dict, 400: dict, 404: dict}, auth=JWTAuth())
def settle_shift_deficit(request, data: SettleShiftDeficitIn):
    """
    ترحيل وتسوية عجز أو فائض وردية معينة إلى الخزينة العامة.
    """
    from .services import ShiftReconciliationService
    shift = get_object_or_404(Shift, id=data.shift_id)
    if getattr(shift, 'is_variance_settled', False):
        return 400, {"message": "تم ترحيل وتسوية هذه الوردية في الخزينة مسبقاً."}

    financials = ShiftReconciliationService.calculate_expected_cash(shift)
    expected = financials['expected_cash']
    actual = float(shift.closing_balance) if shift.closing_balance is not None else expected
    variance = round(actual - expected, 2)

    cashier_name = shift.cashier.get_full_name() or shift.cashier.username if shift.cashier else ""

    if variance < -0.01:
        deficit_val = abs(variance)
        tx = TreasuryTransaction.objects.create(
            shift=shift,
            amount=deficit_val,
            transaction_type='out',
            reference_type='deficit',
            reference_id=shift.id,
            description=f"تسوية وترحيل عجز وردية #{shift.id} - الكاشير {cashier_name}" + (f" ({data.notes})" if data.notes else "")
        )
        shift.is_variance_settled = True
        shift.save(update_fields=['is_variance_settled'])
        return 200, {
            "success": True,
            "message": f"تم ترحيل وتسوية عجز الوردية (#{shift.id}) بقيمة {deficit_val:.2f} د.ل في الخزينة بنجاح.",
            "transaction_id": tx.id
        }
    elif variance > 0.01:
        surplus_val = variance
        tx = TreasuryTransaction.objects.create(
            shift=shift,
            amount=surplus_val,
            transaction_type='in',
            reference_type='surplus',
            reference_id=shift.id,
            description=f"توريد وترحيل فائض وردية #{shift.id} - الكاشير {cashier_name}" + (f" ({data.notes})" if data.notes else "")
        )
        shift.is_variance_settled = True
        shift.save(update_fields=['is_variance_settled'])
        return 200, {
            "success": True,
            "message": f"تم ترحيل وتوريد فائض الوردية (#{shift.id}) بقيمة {surplus_val:.2f} د.ل إلى الخزينة بنجاح.",
            "transaction_id": tx.id
        }
    else:
        shift.is_variance_settled = True
        shift.save(update_fields=['is_variance_settled'])
        return 200, {
            "success": True,
            "message": f"الوردية #{shift.id} متطابقة 100% بدون أي عجز أو فائض وتم تعيينها كمسواة."
        }


@payments_router.post("/dashboard/settle-all-deficits", response={200: dict}, auth=JWTAuth())
def settle_all_deficits(request):
    """
    ترحيل وتسوية كافة العجوزات المعلقة للورديات دفعة واحدة إلى الخزينة.
    """
    from .services import ShiftReconciliationService
    unsettled_shifts = Shift.objects.filter(status='closed', is_variance_settled=False)
    settled_count = 0
    total_amount = 0.0

    for s in unsettled_shifts:
        financials = ShiftReconciliationService.calculate_expected_cash(s)
        expected = financials['expected_cash']
        actual = float(s.closing_balance) if s.closing_balance is not None else expected
        variance = round(actual - expected, 2)

        cashier_name = s.cashier.get_full_name() or s.cashier.username if s.cashier else ""

        if variance < -0.01:
            deficit_val = abs(variance)
            TreasuryTransaction.objects.create(
                shift=s,
                amount=deficit_val,
                transaction_type='out',
                reference_type='deficit',
                reference_id=s.id,
                description=f"تسوية عجز مجمع لوردية #{s.id} - الكاشير {cashier_name}"
            )
            s.is_variance_settled = True
            s.save(update_fields=['is_variance_settled'])
            settled_count += 1
            total_amount += deficit_val
        elif abs(variance) <= 0.01:
            s.is_variance_settled = True
            s.save(update_fields=['is_variance_settled'])

    return 200, {
        "success": True,
        "settled_count": settled_count,
        "total_amount": round(total_amount, 2),
        "message": f"تم ترحيل وتسوية {settled_count} ورديات بعجز إجمالي قدره {total_amount:.2f} د.ل إلى الخزينة."
    }


@payments_router.post("/dashboard/transfer-profit-to-treasury", response={200: dict, 400: dict}, auth=JWTAuth())
def transfer_profit_to_treasury(request, data: TransferProfitIn):
    """
    ترحيل وتوريد أرباح تشغيلية أو صافي الربح إلى الخزينة الرئيسية.
    """
    if data.amount <= 0:
        return 400, {"message": "يجب أن تكون قيمة المبلغ المراد ترحيله أكبر من صفر."}

    desc = data.description or f"ترحيل أرباح تشغيلية دورية إلى الخزينة الرئيسية بقيمة {data.amount:.2f} د.ل"
    tx = TreasuryTransaction.objects.create(
        amount=data.amount,
        transaction_type='in',
        reference_type='profit_transfer',
        description=desc
    )
    return 200, {
        "success": True,
        "transaction_id": tx.id,
        "amount": data.amount,
        "message": f"تم ترحيل مبلغ {data.amount:.2f} د.ل كأرباح إلى الخزينة بنجاح."
    }
