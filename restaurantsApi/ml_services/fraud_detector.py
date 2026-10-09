from django.utils import timezone
from django.db.models import Sum, Count, Q
from payments.models import Shift, TreasuryTransaction
from orders.models import Order


class FinancialAnomalyDetector:
    """
    محرك المراقبة الذاتية لكشف الشذوذ والاحتيال المالي في الورديات
    """

    @classmethod
    def evaluate_shift_risk(cls, shift_id: int):
        try:
            shift = Shift.objects.select_related('cashier').get(id=shift_id)
        except Shift.DoesNotExist:
            return None

        flags = []
        risk_score = 0

        # 1. تحليل الفارق النقدي بين المحسوب والفعلي
        expected_cash = float(shift.opening_balance or 0.0)
        cash_in = (
            TreasuryTransaction.objects.filter(
                shift=shift, transaction_type__in=["in", "IN"]
            ).aggregate(total=Sum("amount"))["total"]
            or 0.0
        )
        cash_out = (
            TreasuryTransaction.objects.filter(
                shift=shift, transaction_type__in=["out", "OUT"]
            ).aggregate(total=Sum("amount"))["total"]
            or 0.0
        )

        calculated_expected = expected_cash + float(cash_in) - float(cash_out)
        closing_cash = float(shift.closing_balance or 0.0)
        cash_variance = calculated_expected - closing_cash

        if shift.status in ["closed", "CLOSED"]:
            if abs(cash_variance) > 50.0:  # عجز أو زيادة تتجاوز 50
                risk_score += 35
                flags.append(f"فارق نقدي غير مبرر: {round(cash_variance, 2)} د.ل")

        # 2. فحص نسبة الطلبات الملغاة أثناء الوردية
        end_time_val = shift.end_time or timezone.now()
        order_query = Q(order_date_time__gte=shift.start_time, order_date_time__lte=end_time_val)

        employee_profile = getattr(shift.cashier, 'employee_profile', None)
        if employee_profile:
            shift_orders = Order.objects.filter(order_query & (Q(employee=employee_profile) | Q(employee__isnull=True)))
        else:
            shift_orders = Order.objects.filter(order_query)

        total_orders = shift_orders.count()
        cancelled_orders = shift_orders.filter(status__in=["cancelled", "CANCELLED"]).count()

        cancellation_rate = (cancelled_orders / total_orders) if total_orders > 0 else 0.0

        if cancellation_rate > 0.15 and total_orders > 5:  # إلغاء أكثر من 15% من الطلبات
            risk_score += 40
            flags.append(f"معدل إلغاء مرتفع للطلبات ({round(cancellation_rate * 100, 1)}%)")

        # 3. فحص الخصومات المطبقة في الوردية
        total_discounts = (
            shift_orders.aggregate(total=Sum("discount_amount"))["total"] or 0.0
        )
        if float(total_discounts) > 200.0:
            risk_score += 25
            flags.append(f"إجمالي خصومات مرتفع خلال الوردية: {round(float(total_discounts), 2)} د.ل")

        risk_score = min(risk_score, 100)

        # تحديد مستوى الخطورة
        if risk_score >= 70:
            status = "HIGH"
        elif risk_score >= 35:
            status = "MEDIUM"
        else:
            status = "LOW"

        cashier_name = ""
        if shift.cashier:
            cashier_name = shift.cashier.get_full_name() or shift.cashier.username
        if not cashier_name:
            cashier_name = "كاشير عام"

        return {
            "shift_id": shift.id,
            "cashier_name": cashier_name,
            "risk_score": risk_score,
            "risk_status": status,
            "flags": flags,
            "cash_variance": round(cash_variance, 2),
            "total_orders": total_orders,
            "cancelled_orders": cancelled_orders,
        }

    @classmethod
    def get_recent_anomalies(cls, limit: int = 10):
        """فحص أحدث الورديات المكتملة وعزل المشبوهة منها"""
        shifts = Shift.objects.order_by("-start_time")[:limit]
        results = []
        for s in shifts:
            evaluation = cls.evaluate_shift_risk(s.id)
            if evaluation and evaluation["risk_status"] in ["HIGH", "MEDIUM"]:
                results.append(evaluation)
        return results
