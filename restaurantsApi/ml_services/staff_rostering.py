from datetime import datetime, date, timedelta, time
from typing import Dict, Any, List, Optional
from decimal import Decimal
from django.utils import timezone
from django.db.models import Count, Avg, Q
from django.contrib.auth.models import User
from orders.models import Order
from employees.models import Employee
from payments.models import ShiftAllocation, ShiftTemplate


class PredictiveStaffRosteringService:
    """
    محرك الجدولة الذكية للورديات وتكلفة العمالة بالذكاء الاصطناعي
    (AI Predictive Staff Rostering & Labor Cost Optimizer)

    يقوم بـ:
    1. التنبؤ بحجم الطلبات المتوقعة لكل ساعة بناءً على تاريخ المبيعات ويوم الأسبوع.
    2. تحديد ساعات الذروة ومعدل الضغط المتوقع.
    3. حساب الاحتياج الأمثل من الطهاة والكاشيرات لتقليل تكلفة العمالة ومنع الاختناقات.
    4. توليد جدول الورديات المخصص وتوزيعه تلقائياً على الموظفين الفعليين.
    5. حساب تكلفة العمالة ونسبة الوفر المالي مقارنة بالجدولة التقليدية الثابتة.
    """

    # معايير الإنتاجية والطاقة الاستيعابية الافتراضية
    ORDERS_PER_CHEF_HOUR = 12       # طاهٍ واحد يكفي لإعداد ~12 طلب في الساعة
    ORDERS_PER_CASHIER_HOUR = 22    # كاشير واحد يكفي لإنجاز ~22 طلب في الساعة
    ORDERS_PER_WAITER_HOUR = 10     # نادل واحد لكل 10 طلبات صالة في الساعة
    DEFAULT_HOURLY_WAGE = 12.0      # متوسط أجر ساعة العمل العادية (د.ل)
    DEFAULT_OVERTIME_RATE = 15.0    # أجر ساعة العمل الإضافي (د.ل)

    # نموذج الطلب الساعي النمطي (Default baseline hourly distribution curve)
    # يستخدم لتعزيز التنبؤ إذا كانت بيانات المبيعات التاريخية قليلة
    BASELINE_HOURLY_WEIGHTS = {
        8: 0.15,   # إفطار باكر
        9: 0.25,
        10: 0.35,
        11: 0.50,
        12: 0.85,  # بداية الغداء
        13: 1.40,  # ذروة الغداء
        14: 1.50,  # ذروة الغداء
        15: 1.10,
        16: 0.60,  # فترة هادئة بعد الغداء
        17: 0.55,
        18: 0.80,
        19: 1.30,  # بداية العشاء
        20: 1.65,  # ذروة العشاء
        21: 1.70,  # أقصى ذروة مسائية
        22: 1.40,
        23: 0.80,  # طلبات متأخرة
    }

    # معاملات أيام الأسبوع (عطلات نهاية الأسبوع تشهد ضغطاً أعلى)
    # Python weekday(): 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
    WEEKDAY_MULTIPLIERS = {
        0: 0.90,  # الإثنين
        1: 0.95,  # الثلاثاء
        2: 1.00,  # الأربعاء
        3: 1.25,  # الخميس (بداية عطلة نهاية الأسبوع)
        4: 1.45,  # الجمعة (ذروة أسبوعية)
        5: 1.30,  # السبت
        6: 0.95,  # الأحد
    }

    @classmethod
    def predict_hourly_demand(cls, target_date: Optional[date] = None, lookback_days: int = 45) -> Dict[str, Any]:
        """
        التنبؤ بعدد الطلبات لكل ساعة من ساعات العمل في التاريخ المحدد
        استناداً إلى تاريخ المبيعات ونمط يوم الأسبوع.
        """
        if not target_date:
            target_date = timezone.localdate() if hasattr(timezone, 'localdate') else date.today()

        target_weekday = target_date.weekday()
        weekday_multiplier = cls.WEEKDAY_MULTIPLIERS.get(target_weekday, 1.0)

        # 1. فحص بيانات المبيعات التاريخية
        start_history = timezone.now() - timedelta(days=lookback_days)
        historical_orders = list(Order.objects.filter(
            order_date_time__gte=start_history,
            status__in=['completed', 'paid', 'delivered', 'COMPLETED', 'PAID', 'DELIVERED', 'ready', 'pending']
        ).values('order_date_time'))

        # حساب المتوسطات التاريخية لكل ساعة
        hourly_counts: Dict[int, List[int]] = {h: [] for h in range(8, 24)}
        daily_order_tracker: Dict[str, Dict[int, int]] = {}

        for ord_info in historical_orders:
            dt = ord_info['order_date_time']
            if dt:
                d_str = dt.strftime('%Y-%m-%d')
                hr = dt.hour
                if 8 <= hr <= 23:
                    if d_str not in daily_order_tracker:
                        daily_order_tracker[d_str] = {h: 0 for h in range(8, 24)}
                    daily_order_tracker[d_str][hr] += 1

        for d_str, hours_map in daily_order_tracker.items():
            for hr, count in hours_map.items():
                hourly_counts[hr].append(count)

        # حساب متوسط الطلبات التاريخي لكل ساعة
        hourly_history_avg = {}
        for hr, counts in hourly_counts.items():
            if counts:
                hourly_history_avg[hr] = sum(counts) / len(counts)
            else:
                hourly_history_avg[hr] = 0.0

        total_tracked_days = max(len(daily_order_tracker), 1)
        base_daily_volume = len(historical_orders) / total_tracked_days
        # حد أدنى واقعي للطلبات اليومية في حالة حداثة النظام
        effective_daily_volume = max(base_daily_volume, 28.0) * weekday_multiplier

        # 2. بناء التنبؤ الساعي (Forecast Timeline)
        forecast_timeline = []
        total_predicted_orders = 0.0
        peak_hours_count = 0

        for hr in range(8, 24):
            hist_avg = hourly_history_avg.get(hr, 0.0)
            baseline_weight = cls.BASELINE_HOURLY_WEIGHTS.get(hr, 0.5)

            # إذا كانت البيانات كافية، ندمج التاريخ الفعلي مع النمط الموزون بنسبة 60% تاريخ و40% نمط
            if hist_avg > 0:
                predicted_val = (hist_avg * 0.6) + ((effective_daily_volume / 16.0) * baseline_weight * 0.4)
            else:
                predicted_val = (effective_daily_volume / 16.0) * baseline_weight

            predicted_orders = round(max(1.0, predicted_val), 1)
            total_predicted_orders += predicted_orders

            # تقييم مستوى الذروة والضغط
            is_peak = predicted_orders >= 9.0
            is_super_peak = predicted_orders >= 14.0
            if is_peak:
                peak_hours_count += 1

            # حساب متطلبات العمالة لهذه الساعة
            chefs_needed = max(1, int(round(predicted_orders / cls.ORDERS_PER_CHEF_HOUR + 0.35)))
            cashiers_needed = max(1, int(round(predicted_orders / cls.ORDERS_PER_CASHIER_HOUR + 0.3)))
            waiters_needed = max(1, int(round(predicted_orders / cls.ORDERS_PER_WAITER_HOUR + 0.2)))

            load_label = "عادي 🟢"
            if is_super_peak:
                load_label = "ذروة قصوى 🔴"
            elif is_peak:
                load_label = "ذروة متوسطة 🟡"

            forecast_timeline.append({
                "hour": f"{hr:02d}:00",
                "hour_int": hr,
                "predicted_orders": predicted_orders,
                "is_peak": is_peak,
                "is_super_peak": is_super_peak,
                "load_label": load_label,
                "recommended_chefs": chefs_needed,
                "recommended_cashiers": cashiers_needed,
                "recommended_waiters": waiters_needed,
                "recommended_total_staff": chefs_needed + cashiers_needed + waiters_needed
            })

        weekday_names_ar = [
            'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'
        ]

        return {
            "target_date": target_date.strftime('%Y-%m-%d'),
            "weekday_name": weekday_names_ar[target_weekday],
            "total_predicted_orders": round(total_predicted_orders),
            "peak_hours_count": peak_hours_count,
            "historical_sample_orders": len(historical_orders),
            "demand_multiplier": round(weekday_multiplier, 2),
            "timeline": forecast_timeline
        }

    @classmethod
    def generate_optimized_roster(
        cls,
        target_date: Optional[date] = None,
        save_to_db: bool = False
    ) -> Dict[str, Any]:
        """
        توليد جدول ورديات متكامل وذكي يوزع الطهاة والكاشيرات
        وفق فترات الذروة واحتياج كل وردية مع حساب تكلفة العمالة.
        """
        if not target_date:
            target_date = timezone.localdate() if hasattr(timezone, 'localdate') else date.today()

        forecast = cls.predict_hourly_demand(target_date)
        timeline = forecast["timeline"]

        # تقسيم اليوم إلى ورديتين رئيسيتين:
        # وردية الصباح: 08:00 - 16:00
        # وردية المساء: 16:00 - 00:00 (الفترة الأكثر ازدحاماً عادة)
        morning_hours = [t for t in timeline if 8 <= t["hour_int"] < 16]
        evening_hours = [t for t in timeline if 16 <= t["hour_int"] < 24]

        def analyze_shift_needs(hours_list, name: str, start_str: str, end_str: str):
            if not hours_list:
                return {}
            total_orders = sum(h["predicted_orders"] for h in hours_list)
            max_hourly = max(h["predicted_orders"] for h in hours_list)
            max_chefs = max(h["recommended_chefs"] for h in hours_list)
            max_cashiers = max(h["recommended_cashiers"] for h in hours_list)
            max_waiters = max(h["recommended_waiters"] for h in hours_list)
            peak_count = sum(1 for h in hours_list if h["is_peak"])

            return {
                "name": name,
                "start_time": start_str,
                "end_time": end_str,
                "duration_hours": 8,
                "total_predicted_orders": round(total_orders),
                "peak_hours": peak_count,
                "max_orders_in_single_hour": max_hourly,
                "required_chefs": max_chefs,
                "required_cashiers": max_cashiers,
                "required_waiters": max_waiters,
                "total_staff_needed": max_chefs + max_cashiers + max_waiters
            }

        morning_shift_plan = analyze_shift_needs(morning_hours, "الوردية الصباحية (هادئة/متوسطة)", "08:00", "16:00")
        evening_shift_plan = analyze_shift_needs(evening_hours, "الوردية المسائية (ذروة المبيعات)", "16:00", "00:00")

        # 3. جلب الموظفين الفعليين المتاحين وتوزيعهم حسب الأدوار
        active_employees = list(Employee.objects.select_related('user').all())
        chefs = [e for e in active_employees if e.role == 'chef']
        cashiers = [e for e in active_employees if e.role == 'cashier']
        waiters = [e for e in active_employees if e.role == 'waiter']
        managers = [e for e in active_employees if e.role == 'manager']
        others = [e for e in active_employees if e.role not in ['chef', 'cashier', 'waiter', 'manager']]

        # إذا كانت قائمة الموظفين صغيرة، نستخدم كافة المتاحين بمرونة
        all_staff_pool = list(active_employees)

        # توليد التخصيص لكل وردية
        assigned_roster = []

        def allocate_staff_to_shift(shift_plan, shift_key: str):
            assigned_members = []
            req_chefs = shift_plan["required_chefs"]
            req_cashiers = shift_plan["required_cashiers"]
            req_waiters = shift_plan["required_waiters"]

            # طهاة
            picked_chefs = []
            available_chefs = [c for c in chefs if c.id not in [m["employee_id"] for m in assigned_roster]]
            # إذا نفد غير المعينين، نعيد استخدامهم مع تنبيه
            candidate_chefs = available_chefs if available_chefs else chefs
            for c in candidate_chefs[:req_chefs]:
                assigned_members.append({
                    "employee_id": c.id,
                    "employee_name": c.name,
                    "role": "طاهٍ (Chef)",
                    "role_key": "chef",
                    "station": "المطبخ الرئيسي",
                    "shift_name": shift_plan["name"],
                    "start_time": shift_plan["start_time"],
                    "end_time": shift_plan["end_time"],
                    "hourly_wage": cls.DEFAULT_HOURLY_WAGE,
                    "estimated_shift_cost": cls.DEFAULT_HOURLY_WAGE * 8
                })

            # كاشيرات
            available_cashiers = [k for k in cashiers if k.id not in [m["employee_id"] for m in assigned_roster]]
            candidate_cashiers = available_cashiers if available_cashiers else cashiers
            for idx, k in enumerate(candidate_cashiers[:req_cashiers]):
                station_label = f"نقطة البيع الرئيسية (POS {idx + 1})"
                assigned_members.append({
                    "employee_id": k.id,
                    "employee_name": k.name,
                    "role": "كاشير (Cashier)",
                    "role_key": "cashier",
                    "station": station_label,
                    "shift_name": shift_plan["name"],
                    "start_time": shift_plan["start_time"],
                    "end_time": shift_plan["end_time"],
                    "hourly_wage": cls.DEFAULT_HOURLY_WAGE,
                    "estimated_shift_cost": cls.DEFAULT_HOURLY_WAGE * 8
                })

            # صالة / نادل
            available_waiters = [w for w in waiters if w.id not in [m["employee_id"] for m in assigned_roster]]
            candidate_waiters = available_waiters if available_waiters else waiters
            for w in candidate_waiters[:req_waiters]:
                assigned_members.append({
                    "employee_id": w.id,
                    "employee_name": w.name,
                    "role": "نادل / خدمة (Waiter)",
                    "role_key": "waiter",
                    "station": "صالة المطعم",
                    "shift_name": shift_plan["name"],
                    "start_time": shift_plan["start_time"],
                    "end_time": shift_plan["end_time"],
                    "hourly_wage": cls.DEFAULT_HOURLY_WAGE,
                    "estimated_shift_cost": cls.DEFAULT_HOURLY_WAGE * 8
                })

            # في حال وجود نقص في الكادر الفعلي، نضع توصية تعيين مؤقت / عمالة إضافية
            coverage_gap = max(0, shift_plan["total_staff_needed"] - len(assigned_members))

            return {
                "shift_info": shift_plan,
                "assigned_members": assigned_members,
                "coverage_gap": coverage_gap,
                "is_fully_staffed": coverage_gap == 0
            }

        morning_allocation = allocate_staff_to_shift(morning_shift_plan, "morning")
        evening_allocation = allocate_staff_to_shift(evening_shift_plan, "evening")

        all_assigned = morning_allocation["assigned_members"] + evening_allocation["assigned_members"]

        # 4. تحليل تكلفة العمالة والوفر المالي (Labor Cost Analysis)
        # الجدولة التقليدية الثابتة (Flat Rostering): في الإدارة التقليدية يتم تعيين طاقم كامل وموحد طوال اليوم دون مراعاة انخفاض الطلب الصباحي
        traditional_morning_staff = max(morning_shift_plan["total_staff_needed"] + 1, evening_shift_plan["total_staff_needed"])
        traditional_evening_staff = max(evening_shift_plan["total_staff_needed"], 3)
        traditional_staff_hours = (traditional_morning_staff + traditional_evening_staff) * 8
        traditional_labor_cost = traditional_staff_hours * cls.DEFAULT_HOURLY_WAGE

        # الجدولة الذكية الموزعة (AI Optimized): تعيين الكادر الدقيق فقط حسب منحنى الطلب
        optimized_staff_hours = (
            morning_shift_plan["total_staff_needed"] * 8 +
            evening_shift_plan["total_staff_needed"] * 8
        )
        optimized_labor_cost = optimized_staff_hours * cls.DEFAULT_HOURLY_WAGE

        # حساب الوفر المالي ونسبته
        daily_savings = max(0.0, traditional_labor_cost - optimized_labor_cost)
        monthly_projected_savings = daily_savings * 30.0
        savings_percentage = round((daily_savings / traditional_labor_cost * 100), 1) if traditional_labor_cost > 0 else 0.0

        # تقدير الإيراد المتوقع (متوسط سلة الطلب ~35 د.ل)
        avg_basket_value = 35.0
        projected_revenue = forecast["total_predicted_orders"] * avg_basket_value
        labor_cost_ratio = round((optimized_labor_cost / projected_revenue * 100), 1) if projected_revenue > 0 else 0.0

        # 5. حفظ الجدول في قاعدة البيانات كـ ShiftAllocation إذا طُلب ذلك
        saved_records_count = 0
        if save_to_db:
            for item in all_assigned:
                emp_id = item["employee_id"]
                shift_name = item["shift_name"]
                start_t = datetime.strptime(item["start_time"], "%H:%M").time()
                end_t = datetime.strptime(item["end_time"], "%H:%M").time()

                # التحقق من عدم وجود تخصيص مطابق مسبقاً في نفس اليوم
                exists = ShiftAllocation.objects.filter(
                    employee_id=emp_id,
                    date=target_date,
                    start_time=start_t
                ).exists()

                if not exists:
                    ShiftAllocation.objects.create(
                        employee_id=emp_id,
                        shift_name=shift_name,
                        date=target_date,
                        start_time=start_t,
                        end_time=end_t,
                        pos_station=item.get("station", "نقطة البيع الرئيسية (POS 1)"),
                        status="scheduled",
                        notes=f"تم التوليد تلقائياً بواسطة محرك الجدولة الذكية للورديات (AI Rostering)"
                    )
                    saved_records_count += 1

        return {
            "target_date": forecast["target_date"],
            "weekday_name": forecast["weekday_name"],
            "total_predicted_orders": forecast["total_predicted_orders"],
            "peak_hours_count": forecast["peak_hours_count"],
            "demand_multiplier": forecast["demand_multiplier"],
            "hourly_timeline": forecast["timeline"],
            "shifts": [
                morning_allocation,
                evening_allocation
            ],
            "total_assigned_staff_count": len(all_assigned),
            "saved_to_db": save_to_db,
            "saved_records_count": saved_records_count,
            "financial_optimization": {
                "hourly_wage_rate": cls.DEFAULT_HOURLY_WAGE,
                "traditional_labor_cost": round(traditional_labor_cost, 2),
                "optimized_labor_cost": round(optimized_labor_cost, 2),
                "daily_savings": round(daily_savings, 2),
                "monthly_projected_savings": round(monthly_projected_savings, 2),
                "savings_percentage": savings_percentage,
                "projected_revenue": round(projected_revenue, 2),
                "labor_cost_ratio_percentage": labor_cost_ratio,
                "efficiency_rating": "ممتاز ⭐⭐⭐⭐⭐" if savings_percentage >= 15 else "جيد جداً ⭐⭐⭐⭐"
            }
        }
