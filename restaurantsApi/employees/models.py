# employees/models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Employee(models.Model):
    # استخدام موديل المستخدم المدمج للتعامل مع المصادقة (username, password, email)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile') 
    
    # الدور: نادل، طاهٍ، مدير، كاشير
    ROLE_CHOICES = [
        ('waiter', 'نادل'),
        ('chef', 'طاهٍ'),
        ('manager', 'مدير'),
        ('cashier', 'كاشير'),
        ('other', 'أخرى'),
    ]
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='waiter')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    hire_date = models.DateField(auto_now_add=True)
    permissions = models.JSONField(default=dict, blank=True, null=True)
    # مصفوفة الميزات المستخرجة لبصمة الإصبع بواسطة الذكاء الاصطناعي (TensorFlow)
    fingerprint_vector = models.JSONField(null=True, blank=True, help_text="مصفوفة ميزات بصمة الإصبع عبر الذكاء الاصطناعي")

    @classmethod
    def get_default_permissions_for_role(cls, role: str) -> dict:
        """إرجاع الصلاحيات الافتراضية لكل دور وظيفي"""
        all_perms = {
            'dashboard': True,
            'pos': True,
            'orders': True,
            'tables': True,
            'reservations': True,
            'menu': True,
            'recipes': True,
            'inventory': True,
            'payments': True,
            'treasury': True,
            'expenses': True,
            'salaries': True,
            'employees': True,
            'settings': True
        }
        if role == 'manager':
            return all_perms.copy()
        elif role == 'cashier':
            return {
                'dashboard': True,
                'pos': True,
                'orders': True,
                'tables': True,
                'reservations': True,
                'payments': True,
                'treasury': True,
                'expenses': False,
                'menu': False,
                'recipes': False,
                'inventory': False,
                'salaries': False,
                'employees': False,
                'settings': False
            }
        elif role == 'waiter':
            return {
                'dashboard': False,
                'pos': True,
                'orders': True,
                'tables': True,
                'reservations': True,
                'payments': False,
                'treasury': False,
                'expenses': False,
                'menu': False,
                'recipes': False,
                'inventory': False,
                'salaries': False,
                'employees': False,
                'settings': False
            }
        elif role == 'chef':
            return {
                'dashboard': False,
                'pos': False,
                'orders': True,
                'tables': False,
                'reservations': False,
                'payments': False,
                'treasury': False,
                'expenses': False,
                'menu': True,
                'recipes': True,
                'inventory': True,
                'salaries': False,
                'employees': False,
                'settings': False
            }
        else:
            return {
                'dashboard': True,
                'pos': True,
                'orders': True,
                'tables': False,
                'reservations': False,
                'payments': False,
                'treasury': False,
                'expenses': False,
                'menu': False,
                'recipes': False,
                'inventory': False,
                'salaries': False,
                'employees': False,
                'settings': False
            }

    def get_effective_permissions(self) -> dict:
        """إرجاع الصلاحيات الفعلية، مع دمج الصلاحيات المخصصة فوق الافتراضية"""
        defaults = self.get_default_permissions_for_role(self.role)
        if isinstance(self.permissions, dict) and self.permissions:
            defaults.update(self.permissions)
        return defaults

    @property
    def name(self) -> str:
        """إرجاع الاسم الكامل للموظف أو اسم المستخدم كبديل"""
        if self.user:
            full = f"{self.user.first_name} {self.user.last_name}".strip()
            if full:
                return full
            return self.user.username
        return "موظف"

    class Meta:
        verbose_name = "موظف"
        verbose_name_plural = "موظفون"

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class AttendanceLog(models.Model):
    """
    سجل حركات الحضور والانصراف الموثقة بواسطة الذكاء الاصطناعي وبصمة الإصبع
    """
    PUNCH_CHOICES = [
        ('CHECK_IN', 'تسجيل حضور'),
        ('CHECK_OUT', 'تسجيل انصراف'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_logs', verbose_name="الموظف")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="وقت الحركة")
    punch_type = models.CharField(max_length=20, choices=PUNCH_CHOICES, default="CHECK_IN", verbose_name="نوع الحركة")
    confidence_score = models.FloatField(help_text="نسبة التطابق المحسوبة بواسطة الذكاء الاصطناعي (0.0 - 1.0)", verbose_name="نسبة الدقة")
    notes = models.TextField(blank=True, null=True, verbose_name="ملاحظات")

    class Meta:
        verbose_name = "سجل حضور"
        verbose_name_plural = "سجلات الحضور"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.employee.name} - {self.get_punch_type_display()} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"