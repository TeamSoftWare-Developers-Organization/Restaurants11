from typing import List, Optional
from ninja import Router, Schema
from ml_services.recommender import SmartRecommenderService

ai_router = Router(tags=["الذكاء الاصطناعي والتوصيات"])


class RecommendationRequest(Schema):
    item_ids: List[int] = []


class RecommendedItemOut(Schema):
    id: int
    name: str
    price: float
    category_id: Optional[int] = None
    image_url: Optional[str] = None


@ai_router.post("/recommendations/", response=List[RecommendedItemOut])
def get_cart_recommendations(request, payload: RecommendationRequest):
    """
    استقبال معرّفات الأصناف في السلة وإرجاع الاقتراحات الذكية الأكثر ملاءمة
    وفق خوارزمية تحليل سلة المشتريات (Market Basket Analysis).
    """
    recommended_items = SmartRecommenderService.get_recommendations(
        current_cart_item_ids=payload.item_ids,
        top_n=4
    )

    return [
        {
            "id": item.id,
            "name": item.name,
            "price": float(item.price),
            "category_id": getattr(item, 'category_id', None),
            "image_url": getattr(item, 'image_url', None) or (
                item.image.url if getattr(item, 'image', None) else None
            )
        }
        for item in recommended_items
    ]
