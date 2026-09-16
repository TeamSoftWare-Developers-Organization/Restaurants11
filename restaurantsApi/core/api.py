from ninja import Router, Schema
from typing import Optional
from .models import RestaurantSettings
from ninja_jwt.authentication import JWTAuth

core_router = Router(tags=["الإعدادات العامة"])

class RestaurantSettingsSchema(Schema):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    currency: str
    tax_rate: float
    invoice_footer_message: Optional[str] = None
    is_delivery_enabled: bool
    default_delivery_fee: float

@core_router.get("/", response=RestaurantSettingsSchema)
def get_settings(request):
    """
    جلب إعدادات المطعم.
    """
    return RestaurantSettings.load()

@core_router.put("/", response=RestaurantSettingsSchema, auth=JWTAuth())
def update_settings(request, data: RestaurantSettingsSchema):
    """
    تحديث إعدادات المطعم (يتطلب صلاحيات).
    """
    settings = RestaurantSettings.load()
    for attr, value in data.dict().items():
        setattr(settings, attr, value)
    settings.save()
    return settings
