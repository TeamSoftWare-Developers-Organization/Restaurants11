from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum
from inventory.models import Ingredient, RecipeIngredient
from orders.models import OrderItem


class StockForecastingService:
    """
    محرك التنبؤ بمعدل استهلاك المواد الخام وتحديد مواعيد النفاد بدقة
    """

    @classmethod
    def analyze_stock_runway(cls, lookback_days: int = 7):
        now = timezone.now()
        start_date = now - timedelta(days=lookback_days)

        # 1. حساب إجمالي الكميات المباعة من المنتجات خلال فترة الفحص
        # ملاحظة: النموذج Order يستخدم order_date_time وحالات الطلب تشمل الأحرف الصغيرة والكبيرة
        sold_menu_items = (
            OrderItem.objects.filter(
                order__order_date_time__gte=start_date,
                order__status__in=['completed', 'paid', 'COMPLETED', 'PAID']
            )
            .values('menu_item_id')
            .annotate(total_sold=Sum('quantity'))
        )

        sales_dict = {item['menu_item_id']: item['total_sold'] for item in sold_menu_items}

        # 2. حساب استهلاك كل مادة خام بناءً على مكونات الوجبات (Recipes)
        # ملاحظة: النموذج في المشروع هو RecipeIngredient والحقل هو quantity_needed
        recipe_items = RecipeIngredient.objects.select_related('ingredient', 'menu_item').all()
        ingredient_consumption = {}

        for recipe in recipe_items:
            qty_sold = sales_dict.get(recipe.menu_item_id, 0)
            consumed = float(recipe.quantity_needed) * float(qty_sold)
            
            ing_id = recipe.ingredient_id
            ingredient_consumption[ing_id] = ingredient_consumption.get(ing_id, 0.0) + consumed

        # 3. حساب معدل النفاد لكل مادة في المخزن
        forecast_results = []
        all_ingredients = Ingredient.objects.all()

        for ing in all_ingredients:
            total_consumed = ingredient_consumption.get(ing.id, 0.0)
            daily_burn_rate = total_consumed / max(lookback_days, 1)

            current_stock = float(ing.current_stock)
            
            if daily_burn_rate > 0:
                days_left = current_stock / daily_burn_rate
            else:
                days_left = 999.0  # مادة راكدة أو لا استهلاك مسجل لها

            # تحديد مستوى الخطر
            if days_left <= 2.0:
                risk_level = "CRITICAL"  # ستنفد خلال 48 ساعة
            elif days_left <= 5.0:
                risk_level = "WARNING"   # تكفي أقل من أسبوع
            else:
                risk_level = "HEALTHY"

            # حساب كمية الطلب المقترحة لتغطية الأسبوعين القادمين (14 يوماً)
            suggested_reorder = max(0.0, (daily_burn_rate * 14) - current_stock)

            forecast_results.append({
                "ingredient_id": ing.id,
                "name": ing.name,
                "unit": ing.unit,
                "current_stock": round(current_stock, 2),
                "daily_burn_rate": round(daily_burn_rate, 2),
                "days_left": round(days_left, 1) if days_left != 999.0 else None,
                "risk_level": risk_level,
                "suggested_reorder_qty": round(suggested_reorder, 2),
                "cost_per_unit": float(ing.cost_per_unit)
            })

        # فرز النتائج بحيث تظهر المواد الأكثر خطورة في البداية
        return sorted(forecast_results, key=lambda x: (x['days_left'] if x['days_left'] is not None else 999))
