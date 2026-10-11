from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db.models import Count, Q
from orders.models import Order, OrderItem


class KitchenIntelligenceService:
    """
    محرك الذكاء الاصطناعي لحساب الوقت اللازم لتحضير الوجبات وجدولة الطهي المتزامن في المطبخ
    (AI Kitchen Prep-Time Calculator & KDS Dispatcher)
    """

    # تصنيفات وقواعد أوقات الطهي المعتمدة حسب نوع الوجبة والمحطة
    CULINARY_RULES = [
        {
            "category": "pizza",
            "keywords": [
                "بيتزا", "pizza", "معجنات", "فطائر", "فطيرة", "كالزوني",
                "مناقيش", "صفايح", "مارجريتا", "بيبروني", "أجبان", "اجبان"
            ],
            "base_time": 13.0,
            "extra_per_unit": 2.0,
            "station": "الفرن",
            "icon": "🍕"
        },
        {
            "category": "grill",
            "keywords": [
                "مشاوي", "مشويات", "grill", "كباب", "شيش", "شيش طاووق",
                "ريش", "كفتة", "ستيك", "steak", "لحم", "تكة", "أوصال", "لحوم", "مشوي"
            ],
            "base_time": 16.0,
            "extra_per_unit": 2.5,
            "station": "الشواية",
            "icon": "🥩"
        },
        {
            "category": "burger",
            "keywords": [
                "برجر", "burger", "همبرجر", "تشيز برجر", "زنجر", "كريسبي",
                "تندر", "وجبات سريعة", "دجاج مقلي"
            ],
            "base_time": 10.0,
            "extra_per_unit": 1.5,
            "station": "محطة البرجر",
            "icon": "🍔"
        },
        {
            "category": "sandwich",
            "keywords": [
                "شاورما", "shawarma", "ساندوتش", "سندوتش", "sandwich",
                "صاج", "تورتيلا", "فاهيتا", "كلوب ساندوتش", "بانيني", "شاورما دجاج", "شاورما لحم"
            ],
            "base_time": 7.0,
            "extra_per_unit": 1.0,
            "station": "محطة الساندوتشات",
            "icon": "🌯"
        },
        {
            "category": "pasta",
            "keywords": [
                "مكرونة", "باستا", "pasta", "لازانيا", "بيني", "فيتوتشيني",
                "سباغيتي", "بشاميل", "الفريدو"
            ],
            "base_time": 12.0,
            "extra_per_unit": 2.0,
            "station": "محطة الباستا والموقد",
            "icon": "🍝"
        },
        {
            "category": "seafood",
            "keywords": [
                "سمك", "fish", "روبيان", "جمبري", "شريمب", "سلمون", "سي فود", "كاليماري", "مأكولات بحرية"
            ],
            "base_time": 14.0,
            "extra_per_unit": 2.5,
            "station": "محطة الأسماك",
            "icon": "🦐"
        },
        {
            "category": "fried",
            "keywords": [
                "مقليات", "fried", "بطاطس", "فرايز", "أصابع جبن", "موتزاريلا", "حلقات بصل", "سمبوسك", "كبة", "ناجتس"
            ],
            "base_time": 6.0,
            "extra_per_unit": 1.0,
            "station": "القلاية",
            "icon": "🍟"
        },
        {
            "category": "soup",
            "keywords": [
                "شوربة", "soup", "حساء", "عدس", "شوربة كريمة", "مرق"
            ],
            "base_time": 5.0,
            "extra_per_unit": 0.5,
            "station": "محطة الشوربة",
            "icon": "🍲"
        },
        {
            "category": "salad",
            "keywords": [
                "سلطة", "salad", "مقبلات", "فتوش", "تبولة", "سيزر", "حمص", "متبل", "بابا غنوج", "ورق عنب"
            ],
            "base_time": 4.0,
            "extra_per_unit": 0.5,
            "station": "المحطة الباردة",
            "icon": "🥗"
        },
        {
            "category": "dessert",
            "keywords": [
                "حلو", "حلويات", "حلى", "dessert", "كيك", "تشيز كيك", "وافل", "بان كيك", "آيس كريم", "كريب", "سوفليه", "بسبوسة"
            ],
            "base_time": 4.0,
            "extra_per_unit": 1.0,
            "station": "محطة الحلويات",
            "icon": "🍰"
        },
        {
            "category": "beverage",
            "keywords": [
                "عصير", "مشروب", "مشروبات", "beverage", "بيبسي", "كولا", "مياه", "موخيتو", "موهيتو", "كوكتيل",
                "شاي", "قهوة", "اسبريسو", "لاتيه", "كابتشينو"
            ],
            "base_time": 2.0,
            "extra_per_unit": 0.5,
            "station": "البار / المشروبات",
            "icon": "🥤"
        },
    ]

    DEFAULT_RULE = {
        "category": "general",
        "keywords": [],
        "base_time": 8.0,
        "extra_per_unit": 1.5,
        "station": "المطبخ العام",
        "icon": "🍳"
    }

    @classmethod
    def match_culinary_rule(cls, item_name: str, category_name: str = "") -> Dict[str, Any]:
        """
        مطابقة نوع الوجبة واستخراج قاعدة وقت التحضير والمحطة المسؤولة
        """
        search_text = f"{item_name.lower()} {category_name.lower()}".strip()

        for rule in cls.CULINARY_RULES:
            for kw in rule["keywords"]:
                if kw in search_text:
                    return rule

        return cls.DEFAULT_RULE

    @classmethod
    def calculate_item_prep_time(cls, item_name: str, quantity: int = 1, category_name: str = "", menu_item_id: Optional[int] = None) -> Dict[str, Any]:
        """
        حساب الوقت الدقيق لتحضير صنف معين بناءً على النوع، الكمية، وتعقيد الوصفة
        """
        rule = cls.match_culinary_rule(item_name, category_name)
        base_time = rule["base_time"]
        extra_per_unit = rule["extra_per_unit"]

        # 1. إضافة وقت إضافي تدريجي للكميات المتعددة
        qty = max(1, int(quantity))
        quantity_added_time = (qty - 1) * extra_per_unit

        # 2. حساب تعقيد الوصفة من جدول RecipeIngredient إذا وُجد
        recipe_complexity_time = 0.0
        if menu_item_id:
            try:
                from inventory.models import RecipeIngredient
                recipe_count = RecipeIngredient.objects.filter(menu_item_id=menu_item_id).count()
                if recipe_count > 0:
                    recipe_complexity_time = min(recipe_count * 0.3, 2.5)  # حد أقصى 2.5 دقيقة لتجهيز المكونات
            except Exception:
                pass

        total_duration = base_time + quantity_added_time + recipe_complexity_time

        return {
            "name": item_name,
            "quantity": qty,
            "base_time": base_time,
            "duration_minutes": round(total_duration, 1),
            "station_name": rule["station"],
            "station_icon": rule["icon"],
            "category_type": rule["category"]
        }

    @classmethod
    def calculate_kitchen_load_factor(cls) -> float:
        """
        حساب معامل ضغط المطبخ بناءً على الطلبات التي قيد التحضير حالياً
        """
        active_orders_count = Order.objects.filter(
            status__in=['pending', 'PENDING', 'in_preparation', 'IN_PREPARATION', 'confirmed', 'CONFIRMED']
        ).count()

        # كل 3 طلبات نشطة تزيد وقت التحضير بنسبة 10%
        load_factor = 1.0 + (active_orders_count // 3) * 0.10
        return min(load_factor, 2.2)  # حد أقصى 2.2x

    @classmethod
    def get_load_status_label(cls, load_factor: float) -> str:
        if load_factor <= 1.1:
            return "ضغط خفيف 🟢"
        elif load_factor <= 1.4:
            return "ضغط معتدل 🟡"
        else:
            return "ضغط مرتفع 🔴"

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

        for item in order.items.all():
            item_name = item.menu_item.name if item.menu_item else "صنف غير معروف"
            cat_name = ""
            if item.menu_item and item.menu_item.category:
                cat_name = item.menu_item.category.name

            prep_calc = cls.calculate_item_prep_time(
                item_name=item_name,
                quantity=item.quantity,
                category_name=cat_name,
                menu_item_id=item.menu_item.id if item.menu_item else None
            )

            # تطبيق معامل ضغط المطبخ على وقت الطهي
            adjusted_duration = prep_calc["duration_minutes"] * load_factor

            if adjusted_duration > max_prep_time:
                max_prep_time = adjusted_duration

            items_schedule.append({
                "item_id": item.id,
                "name": item_name,
                "quantity": item.quantity,
                "duration_minutes": round(adjusted_duration, 1),
                "fire_delay_minutes": 0.0,
                "station_name": prep_calc["station_name"],
                "station_icon": prep_calc["station_icon"],
            })

        # جدولة زمن البدء (Fire Times) للطهي المتزامن
        for item in items_schedule:
            item["fire_delay_minutes"] = round(max_prep_time - item["duration_minutes"], 1)

        estimated_ready_at = timezone.now() + timedelta(minutes=max_prep_time)

        # حساب الوقت المنقضي منذ إنشاء الطلب
        elapsed_minutes = 0.0
        if order.order_date_time:
            diff = (timezone.now() - order.order_date_time).total_seconds() / 60.0
            elapsed_minutes = max(0.0, round(diff, 1))

        remaining_minutes = max(0.0, round(max_prep_time - elapsed_minutes, 1))

        table_str = order.table_number or getattr(order, 'table', None) or ""

        return {
            "order_id": order.id,
            "order_number": getattr(order, 'order_number', f"#{order.id}"),
            "table_number": str(table_str) if table_str else None,
            "total_prep_time_minutes": round(max_prep_time, 1),
            "estimated_ready_at": estimated_ready_at.strftime("%H:%M"),
            "kitchen_load_factor": round(load_factor, 2),
            "kitchen_load_status": cls.get_load_status_label(load_factor),
            "elapsed_minutes": elapsed_minutes,
            "remaining_minutes": remaining_minutes,
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
