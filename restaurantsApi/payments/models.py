from decimal import Decimal
from typing import Any
from django.db import models
from django.contrib.auth.models import User
from orders.models import Order
from employees.models import Employee

class Shift(models.Model):
    id: int
    transactions: Any
    # مراقبة فترة عمل الكاشير
    cashier = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shifts')
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    opening_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    closing_balance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
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