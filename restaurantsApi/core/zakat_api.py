from ninja import Router, Schema
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Sum, F
from django.utils import timezone

from .models import ZakatCalculation, ZakatDisbursement
from inventory.models import Ingredient, Supplier
from payments.models import TreasuryTransaction, Payment
from employees.models import Employee

zakat_router = Router(tags=["الزكاة"])

# --- Schemas ---

class LiveSummaryOut(Schema):
    cash_in_hand: float
    cash_in_bank: float
    inventory_value: float
    accounts_receivable: float
    accounts_payable: float
    accrued_expenses: float
    suggested_gold_gram_price: float
    nisab_threshold: float
    total_assets: float
    total_liabilities: float
    net_zakat_base: float
    hijri_zakat_due: float
    gregorian_zakat_due: float
    currency: str

class ZakatCalculationIn(Schema):
    title: str
    date_calculated: Optional[str] = None
    year_type: str = "HIJRI" # HIJRI or GREGORIAN
    gold_gram_price: float
    cash_in_hand: float
    cash_in_bank: float = 0.0
    inventory_value: float
    accounts_receivable: float = 0.0
    other_zakatable_assets: float = 0.0
    accounts_payable: float
    accrued_expenses: float = 0.0
    other_liabilities: float = 0.0
    notes: Optional[str] = None

class ZakatDisbursementIn(Schema):
    zakat_calc_id: int
    amount: float
    recipient_category: str = "الفقراء والمساكين"
    recipient_name: Optional[str] = None
    disbursed_at: Optional[str] = None
    payment_method: str = "نقداً من الخزينة"
    notes: Optional[str] = None
    record_in_treasury: bool = True

class DisbursementOut(Schema):
    id: int
    amount: float
    recipient_category: str
    recipient_name: Optional[str] = None
    disbursed_at: str
    payment_method: str
    notes: Optional[str] = None
    created_at: str

class ZakatCalculationOut(Schema):
    id: int
    title: str
    date_calculated: str
    year_type: str
    gold_gram_price: float
    nisab_threshold: float
    is_nisab_reached: bool
    cash_in_hand: float
    cash_in_bank: float
    inventory_value: float
    accounts_receivable: float
    other_zakatable_assets: float
    total_assets: float
    accounts_payable: float
    accrued_expenses: float
    other_liabilities: float
    total_liabilities: float
    net_zakat_base: float
    zakat_percentage: float
    zakat_due: float
    zakat_paid: float
    remaining_due: float
    status: str
    notes: Optional[str] = None
    created_at: str
    disbursements: List[DisbursementOut]

# --- Endpoints ---

@zakat_router.get("/live-summary/", response=LiveSummaryOut)
def get_live_zakat_summary(request):
    """
    سحب البيانات المالية اللحظية من النظام لحساب الزكاة آلياً.
    """
    # 1. السيولة في الخزينة
    inflows = TreasuryTransaction.objects.filter(transaction_type='in').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
    outflows = TreasuryTransaction.objects.filter(transaction_type='out').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
    cash_in_hand = max(Decimal('0.00'), inflows - outflows)

    # 2. تقييم المخزون الحالي (كمية * متوسط التكلفة)
    ingredients = Ingredient.objects.all()
    inventory_val = Decimal('0.00')
    for ing in ingredients:
        if ing.current_stock > 0 and ing.cost_per_unit > 0:
            inventory_val += Decimal(str(round(float(ing.current_stock) * float(ing.cost_per_unit), 2)))

    # 3. مستحقات الموردين (ديون علينا)
    supplier_debts = Supplier.objects.aggregate(Sum('balance'))['balance__sum'] or Decimal('0.00')
    accounts_payable = max(Decimal('0.00'), supplier_debts)

    # 4. ديون العملاء المرجوة السداد (لنا عند الغير)
    debt_payments = Payment.objects.filter(payment_method='debt').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
    accounts_receivable = debt_payments

    # 5. التزامات رواتب ومصروفات مستحقة
    accrued_expenses = Decimal('0.00')

    # 6. النصاب بسعر الذهب (افتراضي 380 د.ل لجرام الذهب 24k)
    gold_price = Decimal('380.00')
    nisab = Decimal('85') * gold_price # 85 جرام ذهب

    # الحسابات الإجمالية
    total_assets = cash_in_hand + inventory_val + accounts_receivable
    total_liabilities = accounts_payable + accrued_expenses
    net_base = max(Decimal('0.00'), total_assets - total_liabilities)

    hijri_due = Decimal(str(round(float(net_base) * 0.025, 2)))
    gregorian_due = Decimal(str(round(float(net_base) * 0.02577, 2)))

    return {
        "cash_in_hand": float(cash_in_hand),
        "cash_in_bank": 0.0,
        "inventory_value": float(inventory_val),
        "accounts_receivable": float(accounts_receivable),
        "accounts_payable": float(accounts_payable),
        "accrued_expenses": float(accrued_expenses),
        "suggested_gold_gram_price": float(gold_price),
        "nisab_threshold": float(nisab),
        "total_assets": float(total_assets),
        "total_liabilities": float(total_liabilities),
        "net_zakat_base": float(net_base),
        "hijri_zakat_due": float(hijri_due),
        "gregorian_zakat_due": float(gregorian_due),
        "currency": "د.ل"
    }


@zakat_router.get("/calculations/", response=List[ZakatCalculationOut])
def list_zakat_calculations(request):
    """
    عرض قائمة حسابات الزكاة المسجلة والمؤرشفة.
    """
    calcs = ZakatCalculation.objects.prefetch_related('disbursements').all().order_by('-id')
    results = []
    for c in calcs:
        disbs = []
        for d in c.disbursements.all():
            disbs.append({
                "id": d.id,
                "amount": float(d.amount),
                "recipient_category": d.recipient_category,
                "recipient_name": d.recipient_name or "",
                "disbursed_at": d.disbursed_at.strftime("%Y-%m-%d"),
                "payment_method": d.payment_method,
                "notes": d.notes or "",
                "created_at": d.created_at.strftime("%Y-%m-%d %H:%M"),
            })
        
        remaining = max(0.0, float(c.zakat_due) - float(c.zakat_paid))

        results.append({
            "id": c.id,
            "title": c.title,
            "date_calculated": c.date_calculated.strftime("%Y-%m-%d"),
            "year_type": c.year_type,
            "gold_gram_price": float(c.gold_gram_price),
            "nisab_threshold": float(c.nisab_threshold),
            "is_nisab_reached": c.is_nisab_reached,
            "cash_in_hand": float(c.cash_in_hand),
            "cash_in_bank": float(c.cash_in_bank),
            "inventory_value": float(c.inventory_value),
            "accounts_receivable": float(c.accounts_receivable),
            "other_zakatable_assets": float(c.other_zakatable_assets),
            "total_assets": float(c.total_assets),
            "accounts_payable": float(c.accounts_payable),
            "accrued_expenses": float(c.accrued_expenses),
            "other_liabilities": float(c.other_liabilities),
            "total_liabilities": float(c.total_liabilities),
            "net_zakat_base": float(c.net_zakat_base),
            "zakat_percentage": float(c.zakat_percentage),
            "zakat_due": float(c.zakat_due),
            "zakat_paid": float(c.zakat_paid),
            "remaining_due": round(remaining, 2),
            "status": c.status,
            "notes": c.notes or "",
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M"),
            "disbursements": disbs
        })
    return results


@zakat_router.post("/calculations/", response=ZakatCalculationOut)
def create_zakat_calculation(request, payload: ZakatCalculationIn):
    """
    حفظ وتثبيت حسبة زكاة جديدة.
    """
    with transaction.atomic():
        # الأصول
        total_assets = (
            payload.cash_in_hand
            + payload.cash_in_bank
            + payload.inventory_value
            + payload.accounts_receivable
            + payload.other_zakatable_assets
        )

        # الخصوم
        total_liabilities = (
            payload.accounts_payable
            + payload.accrued_expenses
            + payload.other_liabilities
        )

        # صافي الوعاء
        net_base = max(0.0, total_assets - total_liabilities)

        # النصاب
        nisab = 85.0 * payload.gold_gram_price
        is_nisab = net_base >= nisab if nisab > 0 else True

        # النسبة
        pct = 2.577 if payload.year_type == "GREGORIAN" else 2.500
        due = round(net_base * (pct / 100.0), 2) if is_nisab else 0.0

        calc_date = timezone.now().date()
        if payload.date_calculated:
            try:
                calc_date = datetime.strptime(payload.date_calculated, "%Y-%m-%d").date()
            except Exception:
                pass

        calc = ZakatCalculation.objects.create(
            title=payload.title,
            date_calculated=calc_date,
            year_type=payload.year_type,
            gold_gram_price=Decimal(str(round(payload.gold_gram_price, 2))),
            nisab_threshold=Decimal(str(round(nisab, 2))),
            is_nisab_reached=is_nisab,
            cash_in_hand=Decimal(str(round(payload.cash_in_hand, 2))),
            cash_in_bank=Decimal(str(round(payload.cash_in_bank, 2))),
            inventory_value=Decimal(str(round(payload.inventory_value, 2))),
            accounts_receivable=Decimal(str(round(payload.accounts_receivable, 2))),
            other_zakatable_assets=Decimal(str(round(payload.other_zakatable_assets, 2))),
            total_assets=Decimal(str(round(total_assets, 2))),
            accounts_payable=Decimal(str(round(payload.accounts_payable, 2))),
            accrued_expenses=Decimal(str(round(payload.accrued_expenses, 2))),
            other_liabilities=Decimal(str(round(payload.other_liabilities, 2))),
            total_liabilities=Decimal(str(round(total_liabilities, 2))),
            net_zakat_base=Decimal(str(round(net_base, 2))),
            zakat_percentage=Decimal(str(round(pct, 3))),
            zakat_due=Decimal(str(round(due, 2))),
            zakat_paid=Decimal('0.00'),
            status='PAID' if due == 0.0 else 'PENDING',
            notes=payload.notes or ""
        )

        return {
            "id": calc.id,
            "title": calc.title,
            "date_calculated": calc.date_calculated.strftime("%Y-%m-%d"),
            "year_type": calc.year_type,
            "gold_gram_price": float(calc.gold_gram_price),
            "nisab_threshold": float(calc.nisab_threshold),
            "is_nisab_reached": calc.is_nisab_reached,
            "cash_in_hand": float(calc.cash_in_hand),
            "cash_in_bank": float(calc.cash_in_bank),
            "inventory_value": float(calc.inventory_value),
            "accounts_receivable": float(calc.accounts_receivable),
            "other_zakatable_assets": float(calc.other_zakatable_assets),
            "total_assets": float(calc.total_assets),
            "accounts_payable": float(calc.accounts_payable),
            "accrued_expenses": float(calc.accrued_expenses),
            "other_liabilities": float(calc.other_liabilities),
            "total_liabilities": float(calc.total_liabilities),
            "net_zakat_base": float(calc.net_zakat_base),
            "zakat_percentage": float(calc.zakat_percentage),
            "zakat_due": float(calc.zakat_due),
            "zakat_paid": 0.0,
            "remaining_due": float(calc.zakat_due),
            "status": calc.status,
            "notes": calc.notes or "",
            "created_at": calc.created_at.strftime("%Y-%m-%d %H:%M"),
            "disbursements": []
        }


@zakat_router.post("/disbursements/")
def record_zakat_disbursement(request, payload: ZakatDisbursementIn):
    """
    تسجيل دفعة إخراج زكاة مع تحديث رصيد الحسبة وتسجيلها بالخزينة.
    """
    with transaction.atomic():
        calc = get_object_or_404(ZakatCalculation, id=payload.zakat_calc_id)
        
        disb_date = timezone.now().date()
        if payload.disbursed_at:
            try:
                disb_date = datetime.strptime(payload.disbursed_at, "%Y-%m-%d").date()
            except Exception:
                pass

        disbursement = ZakatDisbursement.objects.create(
            zakat_calc=calc,
            amount=Decimal(str(round(payload.amount, 2))),
            recipient_category=payload.recipient_category,
            recipient_name=payload.recipient_name or "",
            disbursed_at=disb_date,
            payment_method=payload.payment_method,
            notes=payload.notes or ""
        )

        # تحديث المدفوع
        new_paid = float(calc.zakat_paid) + float(payload.amount)
        calc.zakat_paid = Decimal(str(round(new_paid, 2)))
        
        if new_paid >= float(calc.zakat_due):
            calc.status = 'PAID'
        elif new_paid > 0:
            calc.status = 'PARTIALLY_PAID'
        calc.save()

        # قيد في الخزينة إذا طلب المستخدم
        if payload.record_in_treasury:
            try:
                TreasuryTransaction.objects.create(
                    amount=Decimal(str(round(payload.amount, 2))),
                    transaction_type='out',
                    reference_type='general_expense',
                    reference_id=disbursement.id,
                    description=f"إخراج زكاة مال ({payload.recipient_category}) - حسبة {calc.title}"
                )
            except Exception:
                pass

        return {
            "status": "success",
            "disbursement_id": disbursement.id,
            "total_paid": float(calc.zakat_paid),
            "remaining": max(0.0, float(calc.zakat_due) - float(calc.zakat_paid)),
            "calc_status": calc.status
        }


@zakat_router.delete("/calculations/{calc_id}/")
def delete_zakat_calculation(request, calc_id: int):
    """
    حذف حسبة زكاة.
    """
    calc = get_object_or_404(ZakatCalculation, id=calc_id)
    calc.delete()
    return {"status": "success"}
