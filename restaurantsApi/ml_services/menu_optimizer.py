import numpy as np
from django.db.models import Sum
from menu.models import MenuItem
from inventory.models import RecipeIngredient
from orders.models import OrderItem


class MenuEngineeringService:
    """
    محرك تحليل وهندسة قائمة الطعام وتصنيف الأصناف حسب الربحية والشعبية (Menu Engineering Matrix)
    """

    @classmethod
    def analyze_menu_matrix(cls):
        items = MenuItem.objects.filter(is_available=True)
        if not items.exists():
            return []

        # 1. حساب تكلفة إعداد كل طبق بناءً على مكونات المخزون (Food Cost)
        items_analysis = []
        total_items_sold = 0

        for item in items:
            # حساب تكلفة المواد الخام عبر الوصفة
            recipes = RecipeIngredient.objects.filter(menu_item=item).select_related('ingredient')
            if recipes.exists():
                item_cost = sum(
                    float(r.quantity_needed) * float(r.ingredient.cost_per_unit)
                    for r in recipes
                )
            else:
                item_cost = float(getattr(item, 'cost_price', 0.0))

            selling_price = float(item.price)
            profit_margin = max(0.0, selling_price - item_cost)
            food_cost_percentage = (item_cost / selling_price * 100) if selling_price > 0 else 0.0

            # حساب عدد مرات البيع عبر الطلبات المكتملة
            sold_count = (
                OrderItem.objects.filter(
                    menu_item=item,
                    order__status__in=['completed', 'paid', 'COMPLETED', 'PAID']
                )
                .aggregate(total=Sum('quantity'))['total'] or 0
            )
            total_items_sold += sold_count

            items_analysis.append({
                "item_id": item.id,
                "name": item.name,
                "selling_price": round(selling_price, 2),
                "item_cost": round(item_cost, 2),
                "profit_margin": round(profit_margin, 2),
                "food_cost_percentage": round(food_cost_percentage, 1),
                "sold_count": sold_count,
            })

        if not items_analysis:
            return []

        # 2. حساب المتوسطات العامة للمطعم (Thresholds)
        avg_profit_margin = float(np.mean([i["profit_margin"] for i in items_analysis])) if items_analysis else 1.0
        avg_popularity = float(np.mean([i["sold_count"] for i in items_analysis])) if items_analysis else 1.0

        # 3. تصنيف الأصناف واقتراح التوصية التنفيذية الذكية
        results = []
        for i in items_analysis:
            high_margin = i["profit_margin"] >= avg_profit_margin
            high_volume = i["sold_count"] >= avg_popularity

            if high_margin and high_volume:
                classification = "STAR"
                badge = "نجم ⭐"
                recommendation = "صنف ذهبي: حافظ على جودته وروج له كوجبة رئيسية."
            elif not high_margin and high_volume:
                classification = "PLOWHORSE"
                badge = "شائع ولكن منخفض الربح 🐎"
                recommendation = "ارفع السعر قليلاً أو تفاوض مع المورد لتقليل تكلفة المكونات."
            elif high_margin and not high_volume:
                classification = "PUZZLE"
                badge = "لغز عالي الربح 🧩"
                recommendation = "هامش ربحه ممتاز: اطلب من الكاشير اقتراحه في الـ POS عبر الذكاء الاصطناعي."
            else:
                classification = "DOG"
                badge = "راكد وغير مربح ⚠️"
                recommendation = "أعد النظر في وصفته، أو ادمجه في عرض خاص، أو فكر في استبعاده."

            results.append({
                **i,
                "classification": classification,
                "badge": badge,
                "recommendation": recommendation,
            })

        # فرز النتائج: النجوم والألغاز أولاً
        return sorted(results, key=lambda x: (x["profit_margin"] * (x["sold_count"] + 1)), reverse=True)
