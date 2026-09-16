# payments/api.py

from ninja import Router, Schema
from typing import List, Optional
from datetime import datetime
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
    notes: Optional[str] = None

class SalaryPaymentOut(Schema):
    id: int
    employee_id: int
    amount: float
    payment_date: datetime
    month_covered: str
    notes: Optional[str] = None

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

@payments_router.get("/salaries", response=List[SalaryPaymentOut], auth=JWTAuth())
def list_salaries(request):
    """
    عرض سجل صرف المرتبات.
    """
    return SalaryPayment.objects.all()

@payments_router.post("/salaries", response=SalaryPaymentOut, auth=JWTAuth())
def record_salary_payment(request, data: SalaryPaymentIn):
    """
    تسجيل صرف مرتب لموظف.
    """
    employee = get_object_or_404(Employee, id=data.employee_id)
    
    # 1. إنشاء سجل صرف المرتب
    salary = SalaryPayment.objects.create(
        employee=employee,
        amount=data.amount,
        month_covered=data.month_covered,
        notes=data.notes
    )
    
    # 2. تسجيل العملية في الخزينة كحركة خروج
    TreasuryTransaction.objects.create(
        amount=data.amount,
        transaction_type='out',
        reference_type='salary',
        reference_id=salary.id,
        description=f"صرف مرتب {employee.user.username} لشهر {data.month_covered}"
    )
    
    return salary