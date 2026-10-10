from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Q
from orders.models import Order, OrderItem


class KitchenIntelligenceService:
    """
    محرك تقدير وقت التحضير الفعلي وجدولة نزول الأطباق بالتزامن
    """

    # الأوقات القياسية للطهي (بالدقائق) بحسب التصنيف بالإنجليزية أو العربية
    BASE_PREP_TIMES = {
        "grill": 16.0,
        "مشويات": 16.0,
        "ستيك": 16.0,
        "burger": 10.0,
        "برجر": 10.0,
        "pizza": 12.0,
        "بيتزا": 12.0,
        "فطائر": 12.0,
        "fried": 6.0,
        "مقليات": 6.0,
        "بطاطس": 6.0,
        "beverage": 2.0,
        "مشروبات": 2.0,
        "عصائر": 2.0,
        "salad": 4.0,
        "سلطات": 4.0,
        "مقبلات": 4.0,
        "default": 8.0,
    }

    @classmethod
    def calculate_kitchen_load_factor(cls) -> float:
        """
        حساب معامل ضغط المطبخ بناءً على الطلبات التي قيد التحضير حالياً
        """
        active_orders_count = Order.objects.filter(
            status__in=['pending', 'PENDING', 'in_preparation', 'IN_PREPARATION', 'confirmed', 'CONFIRMED']
        ).count()

        # كل 5 طلبات نشطة تزيد وقت التحضير بنسبة 15%
        load_factor = 1.0 + (active_orders_count // 5) * 0.15
        return min(load_factor, 2.5)  # حد أقصى للزيادة 2.5x

    @classmethod
    def estimate_order_timeline(cls, order_id: int):
        """
        تقدير وقت الانتهاء وجدولة بدء كل صنف داخل الطلب الواحد
        """
        try:
            order = Order.objects.prefetch_related('items__menu_item__category').get(id=order_id)
        except Order.DoesNotExist:
            return None

        load_factor = cls.calculate_kitchen_load_factor()
        items_schedule = []
        max_prep_time = 0.0

        # 1. حساب وقت كل صنف مع مراعاة ضغط المطبخ
        for item in order.items.all():
            cat_name = ""
            if item.menu_item and item.menu_item.category:
                cat_name = item.menu_item.category.name.strip().lower()

            base_time = cls.BASE_PREP_TIMES.get(cat_name, cls.BASE_PREP_TIMES["default"])
            for key, val in cls.BASE_PREP_TIMES.items():
                if key in cat_name:
                    base_time = val
                    break

            # الكميات الإضافية من نفس الصنف تزيد وقتاً بسيطاً
            estimated_duration = (base_time + (item.quantity - 1) * 1.5) * load_factor

            if estimated_duration > max_prep_time:
                max_prep_time = estimated_duration

            items_schedule.append({
                "item_id": item.id,
                "name": item.menu_item.name if item.menu_item else "صنف غير معروف",
                "quantity": item.quantity,
                "duration_minutes": round(estimated_duration, 1),
                "fire_delay_minutes": 0.0,  # سيتم حسابها في الخطوة التالية
            })

        # 2. جدولة زمن البدء (Fire Times) للطهي المتزامن
        # الصنف ذو المدة الأطول يبدأ فوراً، والأصناف الأسرع تتأخر لتنتهي معاً
        for item in items_schedule:
            item["fire_delay_minutes"] = round(max_prep_time - item["duration_minutes"], 1)

        estimated_ready_at = timezone.now() + timedelta(minutes=max_prep_time)

        table_str = order.table_number or getattr(order, 'table', None) or ""

        return {
            "order_id": order.id,
            "order_number": getattr(order, 'order_number', f"#{order.id}"),
            "table_number": str(table_str) if table_str else None,
            "total_prep_time_minutes": round(max_prep_time, 1),
            "estimated_ready_at": estimated_ready_at.strftime("%H:%M"),
            "kitchen_load_factor": round(load_factor, 2),
            "items": sorted(items_schedule, key=lambda x: x['fire_delay_minutes'])
        }

    @classmethod
    def get_active_kds_queue(cls):
        """قائمة بجميع الطلبات النشطة في المطبخ مرتبة زمنياً"""
        active_orders = Order.objects.filter(
            status__in=['pending', 'PENDING', 'in_preparation', 'IN_PREPARATION', 'confirmed', 'CONFIRMED']
        ).order_by('order_date_time')

        queue = []
        for ord_obj in active_orders:
            timeline = cls.estimate_order_timeline(ord_obj.id)
            if timeline:
                queue.append(timeline)
        return queue
