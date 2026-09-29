from ninja import Router, Schema, File, UploadedFile
from typing import Optional
from .models import RestaurantSettings
from ninja_jwt.authentication import JWTAuth
import os

core_router = Router(tags=["الإعدادات العامة"])

class RestaurantSettingsIn(Schema):
    name: str
    owner_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    email: Optional[str] = None
    tax_number: Optional[str] = None
    commercial_record: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    currency: str = "د.ل"
    tax_rate: float = 0.0
    invoice_footer_message: Optional[str] = None
    is_delivery_enabled: bool = True
    default_delivery_fee: float = 0.0

class RestaurantSettingsOut(RestaurantSettingsIn):
    logo: Optional[str] = None

    @staticmethod
    def resolve_logo(obj):
        if obj.logo and hasattr(obj.logo, 'url'):
            return obj.logo.url
        return None

@core_router.get("/", response=RestaurantSettingsOut)
def get_settings(request):
    """
    جلب إعدادات المطعم.
    """
    return RestaurantSettings.load()

@core_router.put("/", response=RestaurantSettingsOut, auth=JWTAuth())
def update_settings(request, data: RestaurantSettingsIn):
    """
    تحديث إعدادات المطعم (يتطلب صلاحيات).
    """
    settings = RestaurantSettings.load()
    for attr, value in data.dict().items():
        setattr(settings, attr, value)
    settings.save()
    return settings

@core_router.post("/logo/", response=RestaurantSettingsOut, auth=JWTAuth())
def upload_logo(request, file: UploadedFile = File(...)):
    """
    رفع شعار المطعم.
    """
    settings = RestaurantSettings.load()
    if settings.logo:
        try:
            if os.path.isfile(settings.logo.path):
                os.remove(settings.logo.path)
        except Exception:
            pass
    settings.logo = file
    settings.save()
    return settings

@core_router.delete("/logo/", response=RestaurantSettingsOut, auth=JWTAuth())
def delete_logo(request):
    """
    حذف شعار المطعم.
    """
    settings = RestaurantSettings.load()
    if settings.logo:
        try:
            if os.path.isfile(settings.logo.path):
                os.remove(settings.logo.path)
        except Exception:
            pass
        settings.logo = None
        settings.save()
    return settings
