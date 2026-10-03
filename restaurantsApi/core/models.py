from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

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


class ZakatCalculation(models.Model):
    YEAR_TYPE_CHOICES = [
        ('HIJRI', 'حول هجري (2.5%)'),
        ('GREGORIAN', 'حول شمسي / ميلادي (2.577%)'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'مستحقة لم تدفع'),
        ('PARTIALLY_PAID', 'مدفوعة جزئياً'),
        ('PAID', 'مدفوعة بالكامل'),
    ]

    title = models.CharField(max_length=150, verbose_name="عنوان الحسبة / السنة المالية")
    date_calculated = models.DateField(default=timezone.now, verbose_name="تاريخ الحسبة")
    year_type = models.CharField(max_length=15, choices=YEAR_TYPE_CHOICES, default='HIJRI', verbose_name="نوع الحول")
    
    # Gold Nisab Benchmark
    gold_gram_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), verbose_name="سعر جرام الذهب عيار 24 (د.ل)")
    nisab_threshold = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="قيمة النصاب (85 جرام ذهب)")
    is_nisab_reached = models.BooleanField(default=True, verbose_name="هل بلغ النصاب")

    # Assets (الأصول الزكوية)
    cash_in_hand = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="النقدية بالخزينة والصناديق")
    cash_in_bank = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="الأرصدة المصرفية")
    inventory_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="قيمة البضاعة والمخزون المعد للبيع والتشغيل")
    accounts_receivable = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="ديون وذمم مرجوة السداد")
    other_zakatable_assets = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="أصول أخرى خاضعة للزكاة")
    total_assets = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="إجمالي الأصول الزكوية")

    # Liabilities (الخصوم والالتزامات الواجب خصمها)
    accounts_payable = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="مستحقات الموردين والديون العاجلة")
    accrued_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="مصروفات ورواتب مستحقة")
    other_liabilities = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="خصوم والتزامات أخرى عاجلة")
    total_liabilities = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="إجمالي الخصوم الواجب خصمها")

    # Net Base & Due
    net_zakat_base = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="صافي الوعاء الزكوي")
    zakat_percentage = models.DecimalField(max_digits=6, decimal_places=3, default=Decimal('2.500'), verbose_name="نسبة الزكاة المطبقة (%)")
    zakat_due = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="مقدار الزكاة الواجب إخراجها")
    zakat_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="الزكاة المدفوعة فعلياً")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name="حالة السداد")
    notes = models.TextField(blank=True, null=True, verbose_name="ملاحظات")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "حسبة زكاة"
        verbose_name_plural = "سجل حسابات الزكاة"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.zakat_due} د.ل"


class ZakatDisbursement(models.Model):
    zakat_calc = models.ForeignKey(ZakatCalculation, on_delete=models.CASCADE, related_name="disbursements", verbose_name="حسبة الزكاة المرجعية")
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="المبلغ المدفوع (د.ل)")
    recipient_category = models.CharField(max_length=100, default="الفقراء والمساكين", verbose_name="مصرف الزكاة (الجهة المستفيدة)")
    recipient_name = models.CharField(max_length=150, blank=True, null=True, verbose_name="اسم المستفيد أو الجمعية")
    disbursed_at = models.DateField(default=timezone.now, verbose_name="تاريخ الإخراج")
    payment_method = models.CharField(max_length=50, default="نقداً من الخزينة", verbose_name="طريقة الدفع")
    notes = models.CharField(max_length=255, blank=True, null=True, verbose_name="ملاحظات وسند الصرف")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "دفعة زكاة"
        verbose_name_plural = "دفعات إخراج الزكاة"
        ordering = ['-disbursed_at']

    def __str__(self):
        return f"صرف زكاة: {self.amount} د.ل إلى {self.recipient_category}"
