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
    show_qr_code: bool = False
    sales_invoice_terms: Optional[str] = None
    purchase_invoice_terms: Optional[str] = None
    purchase_return_terms: Optional[str] = None
    biometric_device_ip: Optional[str] = "192.168.1.201"
    biometric_device_port: Optional[int] = 4370


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
    trial_hours: float = 1.0
    trial_duration_seconds: int = 3600
    is_activated: bool
    license_type: str
    product_key: Optional[str] = None
    activated_at: Optional[str] = None
    is_trial_active: bool
    remaining_trial_days: int
    remaining_trial_seconds: int = 0
    remaining_trial_minutes: int = 0
    remaining_trial_formatted: str = ""
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

@license_router.post("/trial/start-1hour/", response=LicenseStatusOut)
def start_one_hour_trial(request):
    """
    بدء فترة تجريبية جديدة مدتها ساعة كاملة (60 دقيقة) لاختبار النظام
    """
    from django.utils import timezone
    from core.license_service import LicenseService
    lic = LicenseService.get_or_initialize_license()
    lic.is_activated = False
    lic.license_type = 'TRIAL'
    lic.trial_hours = 1.0
    lic.trial_days = 1
    lic.installed_at = timezone.now()
    lic.product_key = None
    lic.activated_at = None
    lic.save()
    return LicenseService.get_license_status()

@license_router.post("/trial/expire-now/", response=LicenseStatusOut)
def expire_trial_now(request):
    """
    تسريع إنهاء الفترة التجريبية فورياً لاختبار شاشة القفل وتفعيل مفتاح المنتج
    """
    from django.utils import timezone
    from datetime import timedelta
    from core.license_service import LicenseService
    lic = LicenseService.get_or_initialize_license()
    lic.is_activated = False
    lic.license_type = 'TRIAL'
    lic.trial_hours = 1.0
    lic.trial_days = 1
    lic.installed_at = timezone.now() - timedelta(hours=2)
    lic.save()
    return LicenseService.get_license_status()

@license_router.post("/trial/reactivate-lifetime/", response=LicenseStatusOut)
def reactivate_lifetime(request):
    """
    إعادة تفعيل النظام مدى الحياة (LIFETIME)
    """
    from django.utils import timezone
    from core.license_service import LicenseService, generate_valid_product_key
    lic = LicenseService.get_or_initialize_license()
    key = generate_valid_product_key(lic.machine_id)
    lic.is_activated = True
    lic.license_type = 'LIFETIME'
    lic.product_key = key
    lic.activated_at = timezone.now()
    lic.save()
    return LicenseService.get_license_status()


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
    مسموح فقط لـ (ظافر وأيوب) وعلى أجهزتهم المعتمدة حصرياً.
    محجوب تماماً عن حواسيب العملاء سواء كان الخادم محلياً أو أونلاين.
    """
    from core.license_service import is_authorized_superdev_device

    if not is_superdev_user(request.auth):
        return 403, {"message": "الوصول مرفوض: هذه الميزة مخصصة حصرياً للمطورين الفائقين (SuperDev: ظافر وأيوب) فقط."}

    if not is_authorized_superdev_device(request):
        return 403, {
            "message": "الجهاز غير مصرح: زر وصلاحيات SuperDev مقتصرة حصرياً على جهاز ظافر وجهاز أيوب فقط، ومحجوبة تماماً عن هذا الجهاز."
        }

    dev_name = request.auth.first_name or request.auth.username
    return {
        "is_superdev": True,
        "developer_name": dev_name
    }


class SuperDevAuthorizeDeviceIn(Schema):
    passcode: str
    developer_name: Optional[str] = "superdev"


class SuperDevAuthorizeDeviceOut(Schema):
    success: bool
    device_token: str
    message: str


@license_router.post("/superdev/authorize-device/", response={200: SuperDevAuthorizeDeviceOut, 403: dict}, auth=JWTAuth())
def authorize_superdev_device(request, data: SuperDevAuthorizeDeviceIn):
    """
    اعتماد وتوثيق جهاز حاسوب جديد للمطور (ظافر أو أيوب).
    يتطلب إدخال الرمز السري الفائق وحساب المطور.
    """
    if not is_superdev_user(request.auth):
        return 403, {"message": "الوصول مرفوض: غير مصرح لك بهذا الإجراء."}

    from core.license_service import SUPERDEV_MASTER_PASSCODE, generate_superdev_device_token
    if data.passcode.strip() != SUPERDEV_MASTER_PASSCODE:
        return 403, {"message": "رمز المرور السري الخاص بالمطور غير صحيح."}

    dev_name = (data.developer_name or request.auth.username or 'superdev').strip().lower()
    token = generate_superdev_device_token(dev_name)

    return {
        "success": True,
        "device_token": token,
        "message": f"تم اعتماد هذا الجهاز رسمياً كجهاز مطور فائق (SuperDev) خاص بـ {dev_name} بنجاح!"
    }


@license_router.post("/superdev/generate-key/", response={200: SuperDevGenerateKeyOut, 403: dict, 400: dict}, auth=JWTAuth())
def superdev_generate_product_key(request, data: SuperDevGenerateKeyIn):
    """
    توليد كود التفعيل Product Key لأي جهاز حاسوب بواسطة المطورين الفائقين ظافر وأيوب.
    """
    from core.license_service import is_authorized_superdev_device

    if not is_superdev_user(request.auth) or not is_authorized_superdev_device(request):
        return 403, {"message": "الوصول مرفوض تماماً: هذه الخاصية مقتصرة حصرياً على جهازي المطورين الفائقين ظافر وأيوب."}

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


class DatabaseStatusOut(Schema):
    engine: str
    is_postgres: bool
    db_name: str
    db_host: str
    db_port: str
    db_user: str
    port_open: bool
    status: str
    message: str


@license_router.get("/db-status/", response=DatabaseStatusOut)
def get_database_status(request):
    """
    فحص حالة ونوع قاعدة البيانات الحالية (PostgreSQL vs SQLite) ومدى جاهزية السيرفر.
    """
    from django.db import connection
    import socket

    engine = connection.settings_dict.get('ENGINE', '')
    is_postgres = 'postgresql' in engine
    db_name = connection.settings_dict.get('NAME', '')
    db_host = connection.settings_dict.get('HOST', '127.0.0.1') or '127.0.0.1'
    db_port = str(connection.settings_dict.get('PORT', '5432') or '5432')
    db_user = connection.settings_dict.get('USER', 'postgres') or 'postgres'

    port_open = False
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.0)
        res = sock.connect_ex((db_host, int(db_port)))
        sock.close()
        port_open = (res == 0)
    except Exception:
        port_open = False

    if is_postgres:
        status = "connected_postgres"
        message = "متصل بنجاح بقاعدة بيانات PostgreSQL الرسمية."
    elif port_open:
        status = "postgres_port_detected"
        message = "تم اكتشاف منفذ خادم PostgreSQL (5432) نشطاً! تأكد من إنشاء قاعدة البيانات restaurant_db وتطبيق migrations."
    else:
        status = "sqlite_fallback"
        message = "يعمل النظام حالياً على قاعدة البيانات المحلية SQLite3 الاحتياطية."

    return {
        "engine": "PostgreSQL" if is_postgres else "SQLite3",
        "is_postgres": is_postgres,
        "db_name": str(db_name),
        "db_host": db_host,
        "db_port": db_port,
        "db_user": db_user,
        "port_open": port_open,
        "status": status,
        "message": message,
    }


class AutoSetupPostgresIn(Schema):
    db_name: Optional[str] = "restaurant_db"
    db_user: Optional[str] = "postgres"
    db_password: Optional[str] = "0918147613a"
    db_host: Optional[str] = "127.0.0.1"
    db_port: Optional[str] = "5432"


class AutoSetupPostgresOut(Schema):
    success: bool
    db_created: bool
    db_name: str
    message: str
    details: Optional[str] = None
    engine: str


@license_router.post("/superdev/auto-setup-postgres/", response={200: AutoSetupPostgresOut, 400: dict, 403: dict, 500: dict}, auth=JWTAuth())
def auto_setup_postgres(request, data: AutoSetupPostgresIn):
    """
    إنشاء وتهيئة قاعدة بيانات PostgreSQL وتطبيق كافة جداول النظام تلقائياً بنقرة زر واحدة.
    مخصصة للمطورين الفائقين (ظافر وأيوب) أو الإدارة عند تجهيز حاسوب العميل.
    """
    user_auth = request.auth
    from core.license_service import is_authorized_superdev_device
    if not is_superdev_user(user_auth) or not is_authorized_superdev_device(request):
        return 403, {"message": "غير مصرح: هذه الميزة مخصصة حصرياً للمطورين الفائقين (ظافر وأيوب) وعلى أجهزتهم المعتمدة فقط."}

    import psycopg2
    from psycopg2 import sql
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    from django.conf import settings
    from django.db import connections
    from django.core.management import call_command
    import io

    db_name = (data.db_name or 'restaurant_db').strip()
    db_user = (data.db_user or 'postgres').strip()
    db_password = data.db_password if data.db_password is not None else '0918147613a'
    db_host = (data.db_host or '127.0.0.1').strip()
    db_port = str(data.db_port or '5432').strip()

    # 1. الاتصال المباشر بخادم PostgreSQL عبر قاعدة postgres الافتراضية
    try:
        conn = psycopg2.connect(
            dbname='postgres',
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port,
            connect_timeout=5
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
    except Exception as e:
        return 400, {
            "message": f"تعذر الاتصال بخادم PostgreSQL ({db_host}:{db_port}). يرجى التحقق من تشغيل السيرفر ومن صحة كلمة المرور للمستخدم '{db_user}'. الخطأ: {str(e)}"
        }

    # 2. التحقق من وجود قاعدة البيانات وإنشائها إن لم تكن موجودة
    db_created = False
    try:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        if not cur.fetchone():
            cur.execute(
                sql.SQL("CREATE DATABASE {} WITH OWNER {} ENCODING 'UTF8';").format(
                    sql.Identifier(db_name),
                    sql.Identifier(db_user)
                )
            )
            db_created = True
        cur.close()
        conn.close()
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        return 500, {
            "message": f"فشل في إنشاء قاعدة البيانات '{db_name}'. الخطأ: {str(e)}"
        }

    # 3. حفظ الإعدادات في ملف البيئة .env لضمان البقاء عليها دائماً
    try:
        env_path = settings.BASE_DIR / '.env'
        env_lines = []
        if env_path.exists():
            with open(env_path, 'r', encoding='utf-8') as f:
                env_lines = f.readlines()

        env_dict = {
            'USE_POSTGRES': 'True',
            'DB_NAME': db_name,
            'DB_USER': db_user,
            'DB_PASSWORD': db_password,
            'DB_HOST': db_host,
            'DB_PORT': db_port,
        }

        new_lines = []
        seen_keys = set()
        for line in env_lines:
            key_part = line.split('=')[0].strip() if '=' in line else ''
            if key_part in env_dict:
                new_lines.append(f"{key_part}={env_dict[key_part]}\n")
                seen_keys.add(key_part)
            else:
                new_lines.append(line)
        for k, v in env_dict.items():
            if k not in seen_keys:
                new_lines.append(f"{k}={v}\n")

        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
    except Exception as e:
        print(f"Warning: Could not write .env: {e}")

    # 4. توجيه اتصال دجانغو النشط لقاعدة بيانات PostgreSQL
    try:
        settings.DATABASES['default'] = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': db_name,
            'USER': db_user,
            'PASSWORD': db_password,
            'HOST': db_host,
            'PORT': db_port,
        }
        connections['default'].close()
    except Exception as e:
        print(f"Connection update warning: {e}")

    # 5. تطبيق الهجرات وبناء الجداول تلقائياً
    out = io.StringIO()
    try:
        call_command('migrate', interactive=False, stdout=out)
        migration_output = out.getvalue()
    except Exception as e:
        return 500, {
            "message": f"تم إنشاء قاعدة البيانات بنجاح، لكن حدث خطأ أثناء تطبيق الهجرات (Migrations): {str(e)}",
            "details": str(e)
        }

    # 6. التأكد من وجود مستخدم مدير افتراضي
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if not User.objects.filter(is_superuser=True).exists():
            User.objects.create_superuser('admin', 'admin@restoerp.dev', 'admin123')
    except Exception:
        pass

    msg = f"تم إنشاء وتجهيز قاعدة بيانات PostgreSQL ('{db_name}') وتطبيق كافة جداول النظام بنجاح تام بنقرة واحدة!" if db_created else f"تم التحقق من قاعدة البيانات '{db_name}' وتحديث وتطبيق كافة الجداول بنجاح!"

    return {
        "success": True,
        "db_created": db_created,
        "db_name": db_name,
        "message": msg,
        "details": migration_output,
        "engine": "PostgreSQL"
    }



