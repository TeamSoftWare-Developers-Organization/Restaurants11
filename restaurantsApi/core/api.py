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
    sales_invoice_template: str = "thermal_80mm"
    purchase_invoice_template: str = "classic_clean"
    purchase_return_template: str = "standard_voucher"
    auto_print_on_checkout: bool = False
    show_logo_sales: bool = True
    show_logo_purchases: bool = True
    show_logo_returns: bool = True
    show_qr_code: bool = True
    sales_invoice_terms: Optional[str] = None
    purchase_invoice_terms: Optional[str] = None
    purchase_return_terms: Optional[str] = None

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


executive_router = Router(tags=["الموجز التنفيذي الذكي"])

@executive_router.get("/ai/executive-brief/")
@core_router.get("/ai/executive-brief/")
def get_executive_brief(request):
    """
    الموجز التنفيذي الذكي للإدارة (AI Executive Operations Digest)
    يسحب المؤشرات الحرجة اللحظية من المخزون، الورديات، الخزينة، المطبخ، الحجوزات والمبيعات
    ويرجع ملخصاً شاملاً ونقاط تركيز يومية (Actionable Insights).
    """
    from core.executive_ai import ExecutiveOperationsDigestService
    return ExecutiveOperationsDigestService.generate_digest()


# --- نظام التراخيص وتفعيل مفتاح المنتج (License & Activation) ---
license_router = Router(tags=["إدارة التراخيص والتفعيل"])

class LicenseStatusOut(Schema):
    machine_id: str
    installed_at: str
    trial_days: int
    is_activated: bool
    license_type: str
    product_key: Optional[str] = None
    activated_at: Optional[str] = None
    is_trial_active: bool
    remaining_trial_days: int
    is_valid: bool

class LicenseActivateIn(Schema):
    product_key: str

class LicenseActivateOut(Schema):
    success: bool
    message: str
    license_status: Optional[LicenseStatusOut] = None

@license_router.get("/status/", response=LicenseStatusOut)
def get_license_status(request):
    """
    استرجاع حالة ترخيص النظام، الأيام المتبقية، الـ Machine ID، وهل النظام صالح للعمل.
    """
    from core.license_service import LicenseService
    return LicenseService.get_license_status()

@license_router.post("/activate/", response=LicenseActivateOut)
def activate_product_key(request, data: LicenseActivateIn):
    """
    تفعيل النظام عبر مفتاح المنتج (Product Key) المطابق لمعرف الجهاز.
    """
    from core.license_service import LicenseService
    success, message, lic = LicenseService.verify_and_activate(data.product_key)
    
    status_data = None
    if lic:
        status_data = LicenseService.get_license_status()

    return {
        "success": success,
        "message": message,
        "license_status": status_data
    }


# --- وحدة المطور الفائق (SuperDev: ظافر وأيوب) الحصرية ---

def is_superdev_user(user) -> bool:
    """
    التحقق الصارم من أن المستخدم هو أحد المطورين الفائقين (ظافر أو أيوب).
    حتى حساب المدير العام (admin) أو أي دور إداري آخر محجوب وممنوع من هذه الصلاحية.
    """
    if not user or not user.is_authenticated:
        return False
    
    uname = (user.username or '').strip().lower()
    
    # استبعاد صريح لحساب admin العام ولأي حساب غير ظافر وأيوب
    if uname in ['admin', 'cashier1', 'chef_kds', 'waiter1', 'inventory_mgr']:
        return False

    # قائمة المعرفات الحصرية للمطورين ظافر وأيوب
    allowed_superdevs = {
        'zafer', 'ayoub', 'zafer12', 
        'zafer@restoerp.dev', 'ayoub@restoerp.dev',
        'zafer@admin.com', 'zaefrali90@gmail.com'
    }
    if uname in allowed_superdevs:
        return True

    # فحص الاسم الأول أو الصلاحية الخاصة
    first_name_lower = (user.first_name or '').strip().lower()
    if first_name_lower in ['ظافر', 'أيوب', 'zafer', 'ayoub']:
        return True

    if hasattr(user, 'employee_profile') and user.employee_profile.permissions:
        if user.employee_profile.permissions.get('is_superdev') is True:
            return True

    return False


class SuperDevCheckOut(Schema):
    is_superdev: bool
    developer_name: Optional[str] = None


class SuperDevGenerateKeyIn(Schema):
    machine_id: str
    client_name: Optional[str] = None
    notes: Optional[str] = None


class SuperDevGenerateKeyOut(Schema):
    success: bool
    machine_id: str
    product_key: str
    generated_by: str
    message: str


@license_router.get("/superdev/check/", response={200: SuperDevCheckOut, 403: dict}, auth=JWTAuth())
def check_superdev_access(request):
    """
    فحص صلاحية المطور الفائق (SuperDev).
    مسموح فقط لـ (ظافر وأيوب)، ومحجوب عن باقي المستخدمين حتى Admin.
    """
    if not is_superdev_user(request.auth):
        return 403, {"message": "الوصول مرفوض: هذه الميزة مخصصة حصرياً للمطورين الفائقين (SuperDev: ظافر وأيوب) فقط."}

    dev_name = request.auth.first_name or request.auth.username
    return {
        "is_superdev": True,
        "developer_name": dev_name
    }


@license_router.post("/superdev/generate-key/", response={200: SuperDevGenerateKeyOut, 403: dict, 400: dict}, auth=JWTAuth())
def superdev_generate_product_key(request, data: SuperDevGenerateKeyIn):
    """
    توليد كود التفعيل Product Key لأي جهاز حاسوب بواسطة المطورين الفائقين ظافر وأيوب.
    """
    if not is_superdev_user(request.auth):
        return 403, {"message": "الوصول مرفوض تماماً: هذه الخاصية محجوبة عن جميع المستخدمين والمدراء ومقتصرة على المطورين الفائقين ظافر وأيوب."}

    machine_id = (data.machine_id or '').strip()
    if not machine_id:
        return 400, {"message": "يرجى إدخال معرّف الجهاز (Machine ID)."}

    from core.license_service import generate_valid_product_key
    key = generate_valid_product_key(machine_id)

    dev_name = request.auth.get_full_name() or request.auth.username
    return {
        "success": True,
        "machine_id": machine_id.upper(),
        "product_key": key,
        "generated_by": dev_name,
        "message": f"تم استخراج كود التفعيل بنجاح لجهاز العميل ({data.client_name or machine_id})!"
    }

