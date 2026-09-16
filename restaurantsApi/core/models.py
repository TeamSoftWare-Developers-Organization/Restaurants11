from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError

class RestaurantSettings(models.Model):
    name = models.CharField(max_length=255, default="My Restaurant")
    logo = models.ImageField(upload_to='restaurant/', null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    
    # Financials
    currency = models.CharField(max_length=10, default="SAR")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('15.00')) # e.g., 15%
    
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
