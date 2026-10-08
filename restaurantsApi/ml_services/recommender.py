from collections import defaultdict
from typing import List
from django.db.models import Count
from orders.models import Order, OrderItem
from menu.models import MenuItem


class SmartRecommenderService:
    """
    محرك تحليل سلة المشتريات واقتراح الأصناف المترابطة (Market Basket Analysis)
    يعتمد على مصفوفة الترابط المشترك (Item Co-occurrence) ومعدل تكرار الأصناف معاً.
    """

    @classmethod
    def get_recommendations(cls, current_cart_item_ids: List[int], top_n: int = 4) -> List[MenuItem]:
        # تصفية وتنقية المعرفات
        valid_ids = [int(i) for i in current_cart_item_ids if i is not None]

        if not valid_ids:
            # إذا كانت السلة فارغة، نرجع الأصناف الأكثر طلباً ومبيعاً بشكل عام
            popular_items = (
                MenuItem.objects.filter(is_available=True)
                .annotate(sales_count=Count('orderitem'))
                .order_by('-sales_count')[:top_n]
            )
            if popular_items.exists():
                return list(popular_items)
            return list(MenuItem.objects.filter(is_available=True)[:top_n])

        # 1. جلب الطلبات السابقة التي احتوت على أي صنف من أصناف السلة الحالية
        matching_orders = (
            Order.objects.filter(items__menu_item_id__in=valid_ids)
            .exclude(status__in=['cancelled', 'CANCELLED'])
            .values_list('id', flat=True)
            .distinct()[:500]  # عينة من أحدث 500 طلب لضمان الأداء الفائق
        )

        if not matching_orders:
            # في حال عدم وجود سجلات كافية، نرجع أصنافاً متاحة أخرى
            return list(
                MenuItem.objects.filter(is_available=True)
                .exclude(id__in=valid_ids)
                .order_by('?')[:top_n]
            )

        # 2. حساب تكرار ظهور الأصناف الأخرى مع الأصناف الموجودة في السلة (Co-occurrence)
        co_occurrence = defaultdict(int)
        other_items = (
            OrderItem.objects.filter(order_id__in=matching_orders)
            .exclude(menu_item_id__in=valid_ids)
            .values_list('menu_item_id', flat=True)
        )

        for item_id in other_items:
            if item_id:
                co_occurrence[item_id] += 1

        if not co_occurrence:
            return list(
                MenuItem.objects.filter(is_available=True)
                .exclude(id__in=valid_ids)[:top_n]
            )

        # 3. فرز وترتيب الأصناف حسب أعلى درجة ترابط واقتران
        sorted_item_ids = sorted(co_occurrence, key=co_occurrence.get, reverse=True)[:top_n]

        # 4. جلب تفاصيل المنتجات الموصى بها
        recommended_items = MenuItem.objects.filter(
            id__in=sorted_item_ids,
            is_available=True
        )

        # الحفاظ على ترتيب خوارزمية الترابط
        items_dict = {item.id: item for item in recommended_items}
        results = [items_dict[item_id] for item_id in sorted_item_ids if item_id in items_dict]

        # في حال كانت التوصيات أقل من العدد المطلوب، إكمال النقص بأصناف متاحة أخرى
        if len(results) < top_n:
            existing_ids = set(valid_ids + [it.id for it in results])
            fallback = list(
                MenuItem.objects.filter(is_available=True)
                .exclude(id__in=existing_ids)
                .order_by('?')[:top_n - len(results)]
            )
            results.extend(fallback)

        return results
