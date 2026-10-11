from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, Q, F

from orders.models import Order
from inventory.models import Ingredient
from payments.models import Shift, ShiftAllocation
from reservations.models import Reservation
from employees.models import Employee

# استيراد محركات الذكاء الاصطناعي التشغيلية
from ml_services.stock_forecaster import StockForecastingService
from ml_services.fraud_detector import FinancialAnomalyDetector
from ml_services.kitchen_ai import KitchenIntelligenceService
from ml_services.reservation_ai import ReservationIntelligenceService
from ml_services.staff_rostering import PredictiveStaffRosteringService


class ExecutiveOperationsDigestService:
    """
    الموجز التنفيذي الذكي للإدارة (AI Executive Operations Digest)
    يجمع ويحلل المؤشرات الحرجة اللحظية من 6 محاور تشغيلية رئيسية:
    1. المخزون والمواد المعرضة للنفاد.
    2. الورديات والخزينة وكشف التلاعب المالي.
    3. ضغط المطبخ وسرعة إنجاز الوجبات.
    4. الحجوزات اليومية ومخاطر التخلف (No-Show).
    5. المبيعات اللحظية والوفر المالي المحقق بواسطة الذكاء الاصطناعي.
    6. قائمة نقاط التركيز والمهام الحرجة اليومية (Actionable Insights).
    """

    @classmethod
    def generate_digest(cls) -> Dict[str, Any]:
        today = timezone.localdate() if hasattr(timezone, 'localdate') else date.today()
        now = timezone.now()

        # -------------------------------------------------------------
        # 1. المخزون والمواد المعرضة للنفاد (Inventory at Risk)
        # -------------------------------------------------------------
        critical_stock_items = []
        try:
            runway_data = StockForecastingService.analyze_stock_runway(lookback_days=7)
            for item in runway_data:
                if item.get("risk_level") in ["CRITICAL", "HIGH_RISK"]:
                    critical_stock_items.append({
                        "id": item.get("ingredient_id"),
                        "name": item.get("ingredient_name"),
                        "current_stock": item.get("current_stock"),
                        "unit": item.get("unit"),
                        "days_left": item.get("days_left"),
                        "daily_burn_rate": item.get("daily_burn_rate"),
                        "risk_level": item.get("risk_level")
                    })
        except Exception:
            pass

        # تدعيم الفحص بمقارنة الرصيد الحالي بحد الطلب الأدنى
        low_stock_qs = Ingredient.objects.filter(
            Q(current_stock__lte=F('minimum_stock')) | Q(current_stock__lte=2.0)
        )
        for ing in low_stock_qs:
            if not any(x.get("id") == ing.id for x in critical_stock_items):
                critical_stock_items.append({
                    "id": ing.id,
                    "name": ing.name,
                    "current_stock": float(ing.current_stock),
                    "unit": getattr(ing, 'unit', 'وحدة'),
                    "days_left": 1.0 if float(ing.current_stock) <= 0 else 2.0,
                    "daily_burn_rate": 0.0,
                    "risk_level": "CRITICAL" if float(ing.current_stock) <= 0 else "HIGH_RISK"
                })

        inventory_status = "safe"
        if len(critical_stock_items) >= 3:
            inventory_status = "critical"
        elif len(critical_stock_items) > 0:
            inventory_status = "warning"

        # -------------------------------------------------------------
        # 2. الورديات والخزينة والتلاعب المالي (Shifts & Financial Audit)
        # -------------------------------------------------------------
        suspicious_shifts = []
        try:
            suspicious_shifts = FinancialAnomalyDetector.get_recent_anomalies(limit=8)
        except Exception:
            pass

        open_shifts_count = Shift.objects.filter(status__in=["open", "OPEN"]).count()
        pending_overtime_count = ShiftAllocation.objects.filter(overtime_status="pending").count()

        shifts_status = "safe"
        if len(suspicious_shifts) > 0:
            shifts_status = "warning" if len(suspicious_shifts) < 3 else "critical"

        # -------------------------------------------------------------
        # 3. المطبخ وأداء الطهي المتزامن (Kitchen & Prep Load)
        # -------------------------------------------------------------
        active_orders_qs = Order.objects.filter(
            status__in=['pending', 'confirmed', 'in_preparation', 'PENDING', 'CONFIRMED', 'IN_PREPARATION']
        )
        active_kitchen_orders = active_orders_qs.count()

        # حساب الطلبات المتأخرة لأكثر من 20 دقيقة
        delayed_kitchen_orders = 0
        twenty_mins_ago = now - timedelta(minutes=20)
        for ord_obj in active_orders_qs:
            if ord_obj.order_date_time and ord_obj.order_date_time < twenty_mins_ago:
                delayed_kitchen_orders += 1

        kitchen_load_factor = 1.0
        kitchen_load_status = "ضغط خفيف 🟢"
        try:
            kitchen_load_factor = KitchenIntelligenceService.calculate_kitchen_load_factor()
            kitchen_load_status = KitchenIntelligenceService.get_load_status_label(kitchen_load_factor)
        except Exception:
            pass

        # -------------------------------------------------------------
        # 4. الحجوزات اليومية ومخاطر الـ No-Show (Reservations Risk)
        # -------------------------------------------------------------
        today_reservations_qs = Reservation.objects.filter(
            Q(reservation_date=today) |
            Q(reservation_time__date=today)
        )
        today_reservations_count = today_reservations_qs.count()

        high_risk_reservations = []
        for res in today_reservations_qs:
            try:
                risk_eval = ReservationIntelligenceService.calculate_no_show_risk(res.id)
                if risk_eval and risk_eval.get("risk_score", 0) >= 35:
                    high_risk_reservations.append({
                        "id": res.id,
                        "customer_name": getattr(res, 'customer_name', 'ضيف'),
                        "party_size": risk_eval.get("party_size", 2),
                        "table_number": risk_eval.get("table_number", "طاولة"),
                        "risk_score": risk_eval.get("risk_score"),
                        "risk_level": risk_eval.get("risk_level", "مرتفع"),
                        "factors": risk_eval.get("risk_factors", [])
                    })
            except Exception:
                pass

        # -------------------------------------------------------------
        # 5. المبيعات والوفر المالي المحقق (Sales & AI Financial Savings)
        # -------------------------------------------------------------
        today_orders_qs = Order.objects.filter(order_date_time__date=today)
        completed_today_orders = today_orders_qs.filter(
            status__in=['completed', 'paid', 'COMPLETED', 'PAID', 'delivered', 'DELIVERED']
        )
        today_sales_sum = completed_today_orders.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        today_revenue = float(today_sales_sum)
        today_completed_count = completed_today_orders.count()

        daily_ai_savings = 0.0
        monthly_projected_savings = 0.0
        savings_percentage = 0.0
        efficiency_rating = "ممتاز ⭐⭐⭐⭐⭐"

        try:
            roster_data = PredictiveStaffRosteringService.generate_optimized_roster(target_date=today)
            fin = roster_data.get("financial_optimization", {})
            daily_ai_savings = fin.get("daily_savings", 0.0)
            monthly_projected_savings = fin.get("monthly_projected_savings", 0.0)
            savings_percentage = fin.get("savings_percentage", 0.0)
            efficiency_rating = fin.get("efficiency_rating", efficiency_rating)
        except Exception:
            pass

        # -------------------------------------------------------------
        # 6. نقاط التركيز والمهام الحرجة اليومية (Actionable Insights)
        # -------------------------------------------------------------
        actionable_insights = []

        # مهمة 1: المخزون الحرج
        if len(critical_stock_items) > 0:
            top_names = "، ".join([x["name"] for x in critical_stock_items[:3]])
            actionable_insights.append({
                "id": "critical-stock-alert",
                "title": f"تنبيه نفاد المخزون ({len(critical_stock_items)} أصناف حرجة)",
                "description": f"المواد ({top_names}) قاربت على النفاد أو تجاوزت الحد الأدنى. يُوصى بإنشاء أمر شراء فوري.",
                "priority": "critical" if len(critical_stock_items) >= 2 else "warning",
                "category": "inventory",
                "action_label": "إصدار أمر شراء فوري",
                "action_url": "/purchases",
                "icon": "PackageAlert"
            })

        # مهمة 2: الورديات والشذوذ المالي
        if len(suspicious_shifts) > 0:
            first_anomaly = suspicious_shifts[0]
            actionable_insights.append({
                "id": "cash-variance-alert",
                "title": f"رصد شذوذ مالي في {len(suspicious_shifts)} وردية",
                "description": f"الوردية #{first_anomaly['shift_id']} للكاشير ({first_anomaly['cashier_name']}) بها فروقات أو معدل إلغاء مرتفع.",
                "priority": "critical" if first_anomaly.get("risk_status") == "HIGH" else "warning",
                "category": "shifts",
                "action_label": "تدقيق الورديات والخزينة",
                "action_url": "/shifts",
                "icon": "ShieldAlert"
            })

        # مهمة 3: المطبخ وضغط الطهي
        if delayed_kitchen_orders > 0 or kitchen_load_factor >= 1.5:
            actionable_insights.append({
                "id": "kitchen-load-alert",
                "title": f"ضغط مرتفع في المطبخ ({active_kitchen_orders} طلبات جارية)",
                "description": f"يوجد {delayed_kitchen_orders} طلبات تجاوزت 20 دقيقة. يُرجى مراجعة محطات التحضير وتسريع الإنجاز.",
                "priority": "warning",
                "category": "kitchen",
                "action_label": "فتح شاشة المطبخ KDS",
                "action_url": "/kitchen",
                "icon": "ChefHat"
            })

        # مهمة 4: الحجوزات عالية المخاطر
        if len(high_risk_reservations) > 0:
            actionable_insights.append({
                "id": "reservation-no-show-alert",
                "title": f"{len(high_risk_reservations)} حجوزات معرضة لعدم الحضور (No-Show)",
                "description": f"حجز العميل ({high_risk_reservations[0]['customer_name']}) ذو احتمالية تخلف مرتفعة. يُوصى بالاتصال للتأكيد.",
                "priority": "info",
                "category": "reservations",
                "action_label": "تأكيد الحجوزات",
                "action_url": "/reservations",
                "icon": "CalendarAlert"
            })

        # مهمة 5: ترشيد تكلفة العمالة والوفر المحقق
        if daily_ai_savings > 0:
            actionable_insights.append({
                "id": "staff-optimization-success",
                "title": f"وفر مالي محقق في العمالة (~{daily_ai_savings} د.ل اليوم)",
                "description": f"تمت موازنة الطهاة والكاشيرات بدقة لمنع الهدر الصباحي وتغطية ساعات الذروة.",
                "priority": "success",
                "category": "finance",
                "action_label": "عرض جدول الورديات",
                "action_url": "/employees",
                "icon": "Sparkles"
            })

        # إذا كانت كل العمليات طبيعية
        if not actionable_insights:
            actionable_insights.append({
                "id": "all-systems-nominal",
                "title": "كافة العمليات التشغيلية تعمل بكفاءة تامة 🟢",
                "description": "المخزون آمن، المطبخ مستقر، ولا توجد فروقات نقدية في الخزينة.",
                "priority": "success",
                "category": "general",
                "action_label": "الانتقال لنقطة البيع",
                "action_url": "/pos",
                "icon": "CheckCircle2"
            })

        # -------------------------------------------------------------
        # 7. مؤشر الصحة التشغيلية الشامل (Overall Operational Health Score)
        # -------------------------------------------------------------
        health_score = 100
        if len(critical_stock_items) >= 3:
            health_score -= 25
        elif len(critical_stock_items) > 0:
            health_score -= 10

        if len(suspicious_shifts) > 0:
            health_score -= 20

        if delayed_kitchen_orders > 0:
            health_score -= 15
        elif kitchen_load_factor >= 1.5:
            health_score -= 10

        health_score = max(30, min(100, health_score))

        health_label = "ممتاز ومستقر 🟢"
        if health_score < 70:
            health_label = "يتطلب تدخلاً عاجلاً 🔴"
        elif health_score < 85:
            health_label = "جيد مع تنبيهات 🟡"

        return {
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "target_date": today.strftime("%Y-%m-%d"),
            "health_score": health_score,
            "health_label": health_label,
            "inventory": {
                "status": inventory_status,
                "critical_count": len(critical_stock_items),
                "items": critical_stock_items[:5]
            },
            "shifts": {
                "status": shifts_status,
                "open_count": open_shifts_count,
                "suspicious_count": len(suspicious_shifts),
                "pending_overtime_count": pending_overtime_count,
                "anomalies": suspicious_shifts[:3]
            },
            "kitchen": {
                "active_orders": active_kitchen_orders,
                "delayed_orders": delayed_kitchen_orders,
                "load_factor": round(kitchen_load_factor, 2),
                "load_status": kitchen_load_status
            },
            "reservations": {
                "today_count": today_reservations_count,
                "high_risk_count": len(high_risk_reservations),
                "high_risk_items": high_risk_reservations[:3]
            },
            "sales_and_savings": {
                "today_revenue": round(today_revenue, 2),
                "today_completed_orders": today_completed_count,
                "daily_ai_savings": round(daily_ai_savings, 2),
                "monthly_projected_savings": round(monthly_projected_savings, 2),
                "savings_percentage": savings_percentage,
                "efficiency_rating": efficiency_rating
            },
            "actionable_insights": actionable_insights
        }
