# payments/services.py
from decimal import Decimal
from typing import Dict, Any, Optional
from django.utils import timezone
from django.db.models import Sum
from .models import Shift, TreasuryTransaction, Payment


class ShiftReconciliationService:
    """
    خدمة احتساب فروقات الوردية والمطابقة النقدية الدقيقة.
    """

    @classmethod
    def calculate_expected_cash(cls, shift: Shift) -> Dict[str, Any]:
        """
        معادلة النقدية المتوقعة:
        Expected Cash = Opening Balance + Cash Sales + Cash In - Cash Out
        """
        opening_balance = float(shift.opening_balance or 0.0)
        end_time_val = shift.end_time or timezone.now()

        # 1. المبيعات النقدية (Cash Sales)
        order_inflows = TreasuryTransaction.objects.filter(
            shift=shift,
            transaction_type__in=['in', 'IN'],
            reference_type='order'
        ).aggregate(total=Sum('amount'))['total']

        if order_inflows is not None:
            cash_sales = float(order_inflows)
        else:
            cash_payments = Payment.objects.filter(
                payment_method='cash',
                payment_date_time__gte=shift.start_time,
                payment_date_time__lte=end_time_val
            ).aggregate(total=Sum('amount'))['total']
            cash_sales = float(cash_payments or 0.0)

        # 2. المقبوضات النقدية الإضافية (Cash In - بخلاف مبيعات الطلبات)
        other_cash_in = float(
            TreasuryTransaction.objects.filter(
                shift=shift,
                transaction_type__in=['in', 'IN']
            ).exclude(reference_type='order').aggregate(total=Sum('amount'))['total'] or 0.0
        )

        # 3. المصروفات والمسحوبات النقدية (Cash Out)
        cash_out = float(
            TreasuryTransaction.objects.filter(
                shift=shift,
                transaction_type__in=['out', 'OUT']
            ).aggregate(total=Sum('amount'))['total'] or 0.0
        )

        # 4. مبيعات البطاقات والوسائل الأخرى
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

        expected_cash = round(opening_balance + cash_sales + other_cash_in - cash_out, 2)
        total_sales = round(cash_sales + card_sales + other_sales, 2)

        return {
            "opening_balance": opening_balance,
            "cash_sales": cash_sales,
            "cash_in": other_cash_in,
            "total_cash_in": round(cash_sales + other_cash_in, 2),
            "cash_out": cash_out,
            "card_sales": card_sales,
            "other_sales": other_sales,
            "total_sales": total_sales,
            "expected_cash": expected_cash,
        }

    @classmethod
    def reconcile_and_close_shift(cls, shift: Shift, counted_cash: float, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        إغلاق الوردية وحساب الفروقات وتصنيفها:
        Variance = Actual Counted Cash - Expected Cash
        الحالة:
        - BALANCED: مطابق 100%
        - SURPLUS: فائض نقدي
        - DEFICIT: عجز نقدي
        """
        now = timezone.now()
        shift.end_time = now
        shift.closing_balance = Decimal(str(counted_cash))
        shift.status = 'closed'
        shift.save()

        financials = cls.calculate_expected_cash(shift)
        expected_cash = financials["expected_cash"]
        variance = round(counted_cash - expected_cash, 2)

        if abs(variance) < 0.01:
            variance_status = "BALANCED"
            status_display = "مطابق 100% (بدون أي فروقات)"
            color = "green"
        elif variance > 0:
            variance_status = "SURPLUS"
            status_display = f"فائض نقدي قدره {variance:+.2f} د.ل"
            color = "emerald"
        else:
            variance_status = "DEFICIT"
            status_display = f"عجز نقدي قدره {abs(variance):.2f} د.ل"
            color = "red"

        from .models import ShiftAllocation
        allocation = ShiftAllocation.objects.filter(actual_pos_shift=shift).first()
        if allocation:
            allocation.status = 'completed'
            allocation.save()

        cashier_name = ""
        if shift.cashier:
            cashier_name = shift.cashier.get_full_name() or shift.cashier.username

        return {
            "success": True,
            "shift_id": shift.id,
            "shift_name": shift.shift_name,
            "cashier_id": shift.cashier.id if shift.cashier else 0,
            "cashier_name": cashier_name,
            "start_time": shift.start_time.isoformat() if shift.start_time else "",
            "end_time": shift.end_time.isoformat() if shift.end_time else "",
            "opening_balance": financials["opening_balance"],
            "cash_sales": financials["cash_sales"],
            "cash_in": financials["cash_in"],
            "cash_out": financials["cash_out"],
            "card_sales": financials["card_sales"],
            "other_sales": financials["other_sales"],
            "total_sales": financials["total_sales"],
            "expected_cash": expected_cash,
            "counted_cash": counted_cash,
            "actual_closing_balance": counted_cash,
            "variance": variance,
            "variance_status": variance_status,
            "variance_status_display": status_display,
            "color": color,
            "notes": notes or "",
            "timestamp": now.isoformat(),
        }
