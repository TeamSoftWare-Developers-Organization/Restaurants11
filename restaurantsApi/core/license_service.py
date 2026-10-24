import hmac
import hashlib
import uuid
import platform
import os
from typing import Tuple, Optional
from django.utils import timezone
from .models import SystemLicense

# السر الداخلي الخاص بمحرك التشفير (Offline Secret Salt)
LICENSE_SECRET_SALT = "RestaurantManagement-OfflineKeySalt-2026-v1"


def get_or_create_machine_id() -> str:
    """
    توليد أو استرجاع معرف فريد ثابت للجهاز (Machine ID).
    يعتمد على عنوان الماك (MAC address) ونظام التشغيل، مع Fallback ثابت.
    """
    try:
        node = uuid.getnode()
        system_info = f"{platform.node()}-{node}"
        machine_hash = hashlib.sha256(system_info.encode('utf-8')).hexdigest()[:16].upper()
        # تنسيق المعرف بشكل مميز مثلاً MCH-XXXX-XXXX
        return f"{machine_hash[:4]}-{machine_hash[4:8]}-{machine_hash[8:12]}-{machine_hash[12:16]}"
    except Exception:
        return "MACH-REST-2026-CORE"


def generate_valid_product_key(machine_id: str) -> str:
    """
    توليد مفتاح ترخيص صالح لجهاز محدد بناءً على الـ machine_id وخوارزمية HMAC-SHA256.
    صيغة المفتاح: XXXX-XXXX-XXXX-XXXX
    """
    # توحيد صيغة المعرف بإزالة الشُرط والمسافات
    clean_id = machine_id.replace("-", "").strip().upper()
    
    # حساب توقيع HMAC باستخدام الملح الداخلي
    signature = hmac.new(
        LICENSE_SECRET_SALT.encode('utf-8'),
        clean_id.encode('utf-8'),
        hashlib.sha256
    ).hexdigest().upper()

    # استخراج 16 حرفاً لتشكيل مجموعات المفتاح
    p1 = signature[0:4]
    p2 = signature[4:8]
    p3 = signature[8:12]
    p4 = signature[12:16]

    return f"{p1}-{p2}-{p3}-{p4}"


def verify_product_key(machine_id: str, candidate_key: str) -> bool:
    """
    التحقق الرياضي المشفر من صحة مفتاح المنتج أوفلاين دون الحاجة للإنترنت.
    """
    if not candidate_key:
        return False

    expected_key = generate_valid_product_key(machine_id)
    
    # تنظيف وتوحيد صيغة المفتاح المدخل
    clean_candidate = candidate_key.strip().upper().replace(" ", "")
    clean_expected = expected_key.strip().upper()

    # استخدام hmac.compare_digest لمنع هجمات التوقيت (Timing Attacks)
    return hmac.compare_digest(clean_candidate, clean_expected)


class LicenseService:
    """
    خدمة إدارة وحالة ترخيص النظام والتحقق من التفعيل
    """

    @classmethod
    def get_or_initialize_license(cls) -> SystemLicense:
        """
        الحصول على سجل ترخيص النظام، أو إنشائه تلقائياً بأول تشغيل مع فترة تجريبية (ساعة واحدة).
        """
        license_obj = SystemLicense.objects.first()
        if not license_obj:
            m_id = get_or_create_machine_id()
            license_obj = SystemLicense.objects.create(
                machine_id=m_id,
                installed_at=timezone.now(),
                trial_days=1,
                trial_hours=1.0,
                is_activated=False,
                license_type='TRIAL'
            )
        return license_obj

    @classmethod
    def get_license_status(cls) -> dict:
        """
        إرجاع القاموس الكامل لبيانات حالة الترخيص الحالية
        """
        lic = cls.get_or_initialize_license()
        return {
            "machine_id": lic.machine_id,
            "installed_at": lic.installed_at.isoformat(),
            "trial_days": lic.trial_days,
            "trial_hours": getattr(lic, 'trial_hours', 1.0) or 1.0,
            "trial_duration_seconds": lic.trial_duration_seconds,
            "is_activated": lic.is_activated,
            "license_type": lic.license_type,
            "product_key": lic.product_key if lic.is_activated else None,
            "activated_at": lic.activated_at.isoformat() if lic.activated_at else None,
            "is_trial_active": lic.is_trial_active,
            "remaining_trial_days": lic.remaining_trial_days,
            "remaining_trial_seconds": lic.remaining_trial_seconds,
            "remaining_trial_minutes": lic.remaining_trial_minutes,
            "remaining_trial_formatted": lic.remaining_trial_formatted,
            "is_valid": lic.is_valid,
        }

    @classmethod
    def verify_and_activate(cls, input_key: str) -> Tuple[bool, str, Optional[SystemLicense]]:
        """
        التحقق من مفتاح المنتج وتفعيل النظام إذا كان صحيحاً.
        """
        lic = cls.get_or_initialize_license()

        if lic.is_activated:
            return True, "النظام مفعل بالفعل بترخيص دائم.", lic

        if not input_key:
            return False, "يرجى إدخال مفتاح المنتج.", None

        # تنظيف المفتاح
        formatted_key = input_key.strip().upper().replace(" ", "")

        # التحقق المشفر
        if not verify_product_key(lic.machine_id, formatted_key):
            return False, "مفتاح المنتج غير صحيح أو لا يتطابق مع معرف هذا الجهاز.", None

        # تفعيل الترخيص
        lic.is_activated = True
        lic.product_key = formatted_key
        lic.license_type = 'LIFETIME'
        lic.activated_at = timezone.now()
        lic.save()
        return True, "تم تفعيل النظام بنجاح مدى الحياة!", lic


# --- وحدة اعتماد أجهزة المطورين الفائقين (ظافر وأيوب) حصرياً ---

SUPERDEV_MASTER_PASSCODE = "superdev-zafer-ayoub-2026"

# قائمة المعرفات المعتمدة لأجهزة المطورين (جهاز ظافر الحالي + أي أجهزة مضافة)
SUPERDEV_AUTHORIZED_MACHINE_IDS = {
    "E165-594A-81A8-FF6F",  # جهاز ظافر الأساسي
}


def generate_superdev_device_token(developer_name: str = "superdev") -> str:
    """
    توليد توقيع مشفر دائم لاعتماد جهاز المطور في المتصفح أو تطبيق الديسكتوب.
    """
    clean_name = developer_name.strip().lower()
    signature = hmac.new(
        LICENSE_SECRET_SALT.encode('utf-8'),
        f"SUPERDEV-DEVICE-AUTHORIZED-{clean_name}".encode('utf-8'),
        hashlib.sha256
    ).hexdigest().upper()
    return f"SDEV-DEV-{signature[:24]}"


def verify_superdev_device_token(token: str) -> bool:
    """
    فحص صحة رمز اعتماد جهاز المطور.
    """
    if not token or not token.startswith("SDEV-DEV-"):
        return False
    
    for dev in ['zafer', 'ayoub', 'superdev', 'master']:
        expected = generate_superdev_device_token(dev)
        if hmac.compare_digest(token.strip(), expected):
            return True
    return False


def is_authorized_superdev_device(request) -> bool:
    """
    التحقق الصارم من أن الجهاز الذي يقوم بالطلب هو حصرياً جهاز ظافر أو جهاز أيوب.
    ممنوع ومحجوب تماماً عن أي حاسوب عميل آخر سواء تم تنصيب النظام محلياً أو أونلاين.
    """
    # 1. فحص توكن اعتماد الجهاز الممرر في الهيدر
    dev_token = request.headers.get('X-SuperDev-Device-Token') or request.headers.get('x-superdev-device-token')
    if dev_token and verify_superdev_device_token(dev_token):
        return True

    # 2. فحص معرف الجهاز الممرر من المتصفح / Electron
    client_machine_id = (
        request.headers.get('X-Device-Machine-Id') or 
        request.headers.get('x-device-machine-id') or 
        ''
    ).strip().upper()

    allowed_machines = set(SUPERDEV_AUTHORIZED_MACHINE_IDS)
    env_machines = os.environ.get('SUPERDEV_ALLOWED_MACHINE_IDS', '')
    if env_machines:
        for m in env_machines.split(','):
            if m.strip():
                allowed_machines.add(m.strip().upper())

    if client_machine_id and client_machine_id in allowed_machines:
        return True

    # 3. في حالة الخادم المحلي أو أثناء العمل من نفس الجهاز (localhost)
    remote_addr = request.META.get('REMOTE_ADDR', '')
    if remote_addr in ['127.0.0.1', '::1', 'localhost']:
        local_id = get_or_create_machine_id().upper()
        if local_id in allowed_machines:
            return True

    return False

