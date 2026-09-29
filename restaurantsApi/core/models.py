from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError

class RestaurantSettings(models.Model):
    name = models.CharField(max_length=255, default="My Restaurant", verbose_name="اسم المطعم")
    owner_name = models.CharField(max_length=255, null=True, blank=True, verbose_name="اسم صاحب المطعم / المدير")
    logo = models.ImageField(upload_to='restaurant/', null=True, blank=True, verbose_name="شعار المطعم")
    address = models.TextField(null=True, blank=True, verbose_name="العنوان بالكامل")
    phone = models.CharField(max_length=20, null=True, blank=True, verbose_name="رقم الهاتف الأساسي")
    secondary_phone = models.CharField(max_length=20, null=True, blank=True, verbose_name="رقم هاتف إضافي / شكاوى")
    email = models.EmailField(max_length=255, null=True, blank=True, verbose_name="البريد الإلكتروني")
    tax_number = models.CharField(max_length=100, null=True, blank=True, verbose_name="الرقم الضريبي")
    commercial_record = models.CharField(max_length=100, null=True, blank=True, verbose_name="السجل التجاري")
    bio = models.TextField(null=True, blank=True, verbose_name="نبذة عن المطعم أو الشعار الترويجي")
    website = models.CharField(max_length=255, null=True, blank=True, verbose_name="الموقع الإلكتروني أو صفحة التواصل")
    
    # Financials
    currency = models.CharField(max_length=10, default="د.ل", verbose_name="العملة الافتراضية")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), verbose_name="نسبة الضريبة")
    
    # Operational
    invoice_footer_message = models.TextField(null=True, blank=True, default="شكراً لزيارتكم!")
    is_delivery_enabled = models.BooleanField(default=True)
    default_delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    def save(self, *args, **kwargs):
        if not self.pk and RestaurantSettings.objects.exists():
            raise ValidationError("There can be only one RestaurantSettings instance")
        return super(RestaurantSettings, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "إعدادات المطعم"
        verbose_name_plural = "إعدادات المطعم"
