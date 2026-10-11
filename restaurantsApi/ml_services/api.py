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


class RosteringApplyRequest(Schema):
    target_date: Optional[str] = None


@ai_router.get("/rostering/forecast/")
def get_hourly_order_forecast(request, target_date: Optional[str] = None):
    """
    التنبؤ بعدد الطلبات لكل ساعة من ساعات العمل استناداً إلى سجل المبيعات
    وتحديد فترات الذروة واحتياجات العمالة (طهاة وكاشيرات).
    """
    from datetime import datetime
    from ml_services.staff_rostering import PredictiveStaffRosteringService

    parsed_date = None
    if target_date:
        try:
            parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            parsed_date = None

    forecast = PredictiveStaffRosteringService.predict_hourly_demand(target_date=parsed_date)
    return forecast


@ai_router.get("/rostering/preview/")
def get_optimized_roster_preview(request, target_date: Optional[str] = None):
    """
    توليد مقترح الجدولة الذكية للورديات وتوزيع الكادر وتحليل تكلفة العمالة والوفر المالي.
    """
    from datetime import datetime
    from ml_services.staff_rostering import PredictiveStaffRosteringService

    parsed_date = None
    if target_date:
        try:
            parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            parsed_date = None

    roster = PredictiveStaffRosteringService.generate_optimized_roster(
        target_date=parsed_date,
        save_to_db=False
    )
    return roster


@ai_router.post("/rostering/apply/")
def apply_optimized_roster(request, payload: RosteringApplyRequest):
    """
    اعتماد وحفظ جدول الورديات المولد بواسطة الذكاء الاصطناعي في قاعدة البيانات
    كـ ShiftAllocation ليتمكن المشرفون والكاشيرات من العمل بموجبه فوراً.
    """
    from datetime import datetime
    from ml_services.staff_rostering import PredictiveStaffRosteringService

    parsed_date = None
    if payload.target_date:
        try:
            parsed_date = datetime.strptime(payload.target_date, "%Y-%m-%d").date()
        except ValueError:
            parsed_date = None

    result = PredictiveStaffRosteringService.generate_optimized_roster(
        target_date=parsed_date,
        save_to_db=True
    )
    return {
        "success": True,
        "message": f"تم اعتماد وحفظ جدول الورديات بنجاح ({result['saved_records_count']} وردية مسجلة)",
        "roster": result
    }

