# employees/models.py

from django.db import models
from django.contrib.auth.models import User # استيراد موديل المستخدم المدمج

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

    class Meta:
        verbose_name = "موظف"
        verbose_name_plural = "موظفون"

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"