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
        الحصول على سجل ترخيص النظام، أو إنشائه تلقائياً بأول تشغيل مع فترة 14 يوماً.
        """
        license_obj = SystemLicense.objects.first()
        if not license_obj:
            m_id = get_or_create_machine_id()
            license_obj = SystemLicense.objects.create(
                machine_id=m_id,
                installed_at=timezone.now(),
                trial_days=14,
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
            "is_activated": lic.is_activated,
            "license_type": lic.license_type,
            "product_key": lic.product_key if lic.is_activated else None,
            "activated_at": lic.activated_at.isoformat() if lic.activated_at else None,
            "is_trial_active": lic.is_trial_active,
            "remaining_trial_days": lic.remaining_trial_days,
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
