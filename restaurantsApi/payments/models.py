from decimal import Decimal
from typing import Any
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from orders.models import Order
from employees.models import Employee


class ShiftTemplate(models.Model):
    """
    قوالب وتعريفات الورديات (تحديد توقيت الوردية والتكلفة الافتراضية للعمل الإضافي)
    """
    name = models.CharField(max_length=100, verbose_name="اسم الوردية")  # e.g. الوردية الصباحية
    start_time = models.TimeField(verbose_name="وقت البدء")  # e.g. 08:00
    end_time = models.TimeField(verbose_name="وقت الانتهاء")  # e.g. 16:00
    overtime_hourly_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('15.00'), verbose_name="تكلفة ساعة العمل الإضافي (د.ل)"
    )
    color = models.CharField(max_length=20, default="#3b82f6", verbose_name="لون التمييز")
    is_active = models.BooleanField(default=True, verbose_name="نشط")
    description = models.TextField(blank=True, null=True, verbose_name="الوصف")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "قالب وردية"
        verbose_name_plural = "قوالب الورديات"
        ordering = ['start_time']

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')})"


class Shift(models.Model):
    id: int
    transactions: Any
    # مراقبة فترة عمل الكاشير
    cashier = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shifts')
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    opening_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    closing_balance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # تفاصيل توقيت الوردية والربط
    shift_name = models.CharField(max_length=100, default='وردية عادية', blank=True, verbose_name="اسم الوردية")
    scheduled_start_time = models.TimeField(null=True, blank=True, verbose_name="وقت البدء المجدول")
    scheduled_end_time = models.TimeField(null=True, blank=True, verbose_name="وقت الانتهاء المجدول")

    # خاصية الأعمال الإضافية وتكلفتها
    has_overtime = models.BooleanField(default=False, verbose_name="يوجد عمل إضافي")
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), verbose_name="ساعات العمل الإضافي")
    overtime_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), verbose_name="تكلفة الساعة الإضافية")
    overtime_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), verbose_name="إجمالي تكلفة العمل الإضافي")
    extra_duties = models.TextField(blank=True, null=True, verbose_name="بيان الأعمال والمهام الإضافية")
    
    STATUS_CHOICES = [
        ('open', 'مفتوحة'),
        ('closed', 'مغلقة'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')

    class Meta:
        verbose_name = "وردية"
        verbose_name_plural = "ورديات"
        ordering = ['-start_time']

    def __str__(self):
        return f"وردية {self.cashier.username} - {self.get_status_display()} ({self.start_time.strftime('%Y-%m-%d %H:%M')})"


class ShiftAllocation(models.Model):
    """
    تخصيص الورديات للموظفين وربطها مع نقطة البيع وساعات وتكلفة العمل الإضافي
    """
    STATUS_CHOICES = [
        ('scheduled', 'مجدولة'),
        ('active', 'نشطة / قيد العمل'),
        ('completed', 'مكتملة'),
        ('cancelled', 'ملغاة'),
    ]

    OVERTIME_STATUS_CHOICES = [
        ('none', 'لا يوجد'),
        ('pending', 'قيد المراجعة'),
        ('approved', 'معتمد'),
        ('paid', 'تم الصرف'),
    ]

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='shift_allocations', verbose_name="الموظف"
    )
    shift_template = models.ForeignKey(
        ShiftTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='allocations', verbose_name="قالب الوردية"
    )
    shift_name = models.CharField(max_length=100, verbose_name="اسم الوردية")
    date = models.DateField(default=timezone.now, verbose_name="تاريخ الوردية")
    start_time = models.TimeField(verbose_name="وقت بدء الوردية")
    end_time = models.TimeField(verbose_name="وقت انتهاء الوردية")
    pos_station = models.CharField(max_length=100, default="نقطة البيع الرئيسية (POS 1)", verbose_name="نقطة البيع المخصصة")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled', verbose_name="حالة الوردية")

    # الربط المباشر مع جلسة الكاشير في نقطة البيع
    actual_pos_shift = models.ForeignKey(
        Shift, on_delete=models.SET_NULL, null=True, blank=True, related_name='allocations', verbose_name="جلسة نقطة البيع الفعلية"
    )

    # خاصية الأعمال الإضافية وتكلفتها
    has_overtime = models.BooleanField(default=False, verbose_name="يوجد عمل إضافي")
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), verbose_name="ساعات العمل الإضافي")
    overtime_hourly_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('15.00'), verbose_name="تكلفة الساعة الإضافية (د.ل)"
    )
    overtime_total_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'), verbose_name="إجمالي تكلفة العمل الإضافي (د.ل)"
    )
    extra_duties = models.TextField(blank=True, null=True, verbose_name="بيان الأعمال والمهام الإضافية")
    overtime_status = models.CharField(
        max_length=20, choices=OVERTIME_STATUS_CHOICES, default='none', verbose_name="حالة اعتماد الإضافي"
    )

    notes = models.TextField(blank=True, null=True, verbose_name="ملاحظات عامة")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "تخصيص وردية"
        verbose_name_plural = "تخصيصات الورديات"
        ordering = ['-date', 'start_time']

    def save(self, *args, **kwargs):
        # احتساب إجمالي تكلفة العمل الإضافي تلقائياً
        if self.has_overtime and self.overtime_hours > 0:
            self.overtime_total_cost = Decimal(str(round(float(self.overtime_hours) * float(self.overtime_hourly_rate), 2)))
            if self.overtime_status == 'none':
                self.overtime_status = 'pending'
        else:
            self.overtime_total_cost = Decimal('0.00')
            if not self.has_overtime:
                self.overtime_status = 'none'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee.name} - {self.shift_name} ({self.date})"


class TreasuryTransaction(models.Model):
    # تسجيل حركات الخزينة (دخول/خروج)
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='transactions', null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    TYPE_CHOICES = [
        ('in', 'دخول'),
        ('out', 'خروج'),
    ]
    transaction_type = models.CharField(max_length=5, choices=TYPE_CHOICES)
    
    REFERENCE_CHOICES = [
        ('order', 'بيع'),
        ('expense', 'مصروف وردية'),
        ('general_expense', 'مصروف عام'),
        ('salary', 'مرتب'),
        ('refund', 'استرجاع'),
    ]
    reference_type = models.CharField(max_length=20, choices=REFERENCE_CHOICES)
    reference_id = models.IntegerField(null=True, blank=True) # رقم الطلب أو الفاتورة
    description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "حركة خزينة"
        verbose_name_plural = "حركات الخزينة"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.amount} - {self.get_reference_type_display()}"


class Payment(models.Model):
    # payment_id (مفتاح أساسي) يتم إنشاؤه تلقائياً بواسطة Django كـ 'id'
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments') # يربط الدفعة بالطلب
    
    payment_date_time = models.DateTimeField(auto_now_add=True) # تاريخ ووقت الدفع
    amount = models.DecimalField(max_digits=10, decimal_places=2) # المبلغ المدفوع
    
    # طريقة الدفع: نقدي، بطاقة، آجل، محفظة إلكترونية
    METHOD_CHOICES = [
        ('cash', 'نقدي'),
        ('credit_card', 'بطاقة مصرفية'),
        ('debt', 'آجل'),
        ('online_wallet', 'محفظة إلكترونية'),
        ('other', 'أخرى'),
    ]
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='cash')
    card_provider = models.CharField(max_length=50, blank=True, null=True) # خدمة البطاقة مثل: تداول، إدفع لي، سداد، إلخ
    
    transaction_id = models.CharField(max_length=100, blank=True, null=True, unique=True) # رقم المعاملة (إذا كان موجوداً)

    class Meta:
        verbose_name = "دفعة"
        verbose_name_plural = "مدفوعات"
        ordering = ['-payment_date_time']

    def __str__(self):
        return f"دفعة {self.amount}$ لطلب {self.order.id} بواسطة {self.get_payment_method_display()}"


class SalaryPayment(models.Model):
    id: int
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField(auto_now_add=True)
    month_covered = models.CharField(max_length=20) # e.g. "2024-02"
    notes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "صرف مرتب"
        verbose_name_plural = "صرف المرتبات"
        ordering = ['-payment_date']

    def __str__(self):
        return f"مرتب {self.employee.user.username} - {self.month_covered}"