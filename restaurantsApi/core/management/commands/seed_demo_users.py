import sys
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from employees.models import Employee


class Command(BaseCommand):
    help = "توليد المستخدمين التجريبيين لكافة الأدوار التشغيلية بكلمة مرور موحدة Password@123"

    def handle(self, *args, **options):
        if hasattr(sys.stdout, 'reconfigure'):
            try:
                sys.stdout.reconfigure(encoding='utf-8')
            except Exception:
                pass
        password = "Password@123"

        demo_users = [
            {
                "username": "zafer",
                "email": "zafer@restoerp.dev",
                "first_name": "ظافر",
                "last_name": "محمد علي",
                "is_superuser": True,
                "is_staff": True,
                "role": "manager",
                "role_display": "المطور الفائق (SuperDev)",
                "phone": "+218910000000",
                "permissions": {**Employee.get_default_permissions_for_role('manager'), 'is_superdev': True}
            },
            {
                "username": "ayoub",
                "email": "ayoub@restoerp.dev",
                "first_name": "أيوب",
                "last_name": "المطور",
                "is_superuser": True,
                "is_staff": True,
                "role": "manager",
                "role_display": "المطور الفائق (SuperDev)",
                "phone": "+218910000099",
                "permissions": {**Employee.get_default_permissions_for_role('manager'), 'is_superdev': True}
            },
            {
                "username": "admin",
                "email": "admin@restaurant.local",
                "first_name": "مدير",
                "last_name": "النظام العام",
                "is_superuser": True,
                "is_staff": True,
                "role": "manager",
                "role_display": "مدير النظام (Superuser)",
                "phone": "+218910000001",
                "permissions": Employee.get_default_permissions_for_role('manager')
            },
            {
                "username": "cashier1",
                "email": "cashier1@restaurant.local",
                "first_name": "كاشير",
                "last_name": "نقطة البيع 1",
                "is_superuser": False,
                "is_staff": False,
                "role": "cashier",
                "role_display": "كاشير نقطة البيع (POS)",
                "phone": "+218910000002",
                "permissions": Employee.get_default_permissions_for_role('cashier')
            },
            {
                "username": "chef_kds",
                "email": "chef@restaurant.local",
                "first_name": "شيف",
                "last_name": "المطبخ الرئيسي",
                "is_superuser": False,
                "is_staff": False,
                "role": "chef",
                "role_display": "شيف المطبخ وشاشة KDS",
                "phone": "+218910000003",
                "permissions": Employee.get_default_permissions_for_role('chef')
            },
            {
                "username": "waiter1",
                "email": "waiter1@restaurant.local",
                "first_name": "نادل",
                "last_name": "الصالة 1",
                "is_superuser": False,
                "is_staff": False,
                "role": "waiter",
                "role_display": "نادل الصالة وإدارة الطاولات",
                "phone": "+218910000004",
                "permissions": Employee.get_default_permissions_for_role('waiter')
            },
            {
                "username": "inventory_mgr",
                "email": "inventory@restaurant.local",
                "first_name": "مسؤول",
                "last_name": "المخازن والمشتريات",
                "is_superuser": False,
                "is_staff": False,
                "role": "manager",
                "role_display": "مسؤول المخزن والمشتريات",
                "phone": "+218910000005",
                "permissions": {
                    'dashboard': True,
                    'pos': False,
                    'orders': False,
                    'tables': False,
                    'reservations': False,
                    'menu': True,
                    'recipes': True,
                    'inventory': True,
                    'payments': False,
                    'treasury': False,
                    'expenses': True,
                    'salaries': False,
                    'employees': False,
                    'settings': False,
                    'purchases': True
                }
            },
        ]

        self.stdout.write(self.style.MIGRATE_HEADING("\n=== بدء إنشاء / تحديث الحسابات التجريبية ==="))

        results = []

        for item in demo_users:
            user, created = User.objects.get_or_create(username=item["username"])
            user.email = item["email"]
            user.first_name = item["first_name"]
            user.last_name = item["last_name"]
            user.is_superuser = item["is_superuser"]
            user.is_staff = item["is_staff"]
            user.set_password(password)
            user.save()

            # إنشاء أو تحديث ملف الموظف
            profile, p_created = Employee.objects.get_or_create(user=user)
            profile.role = item["role"]
            profile.phone_number = item["phone"]
            profile.permissions = item["permissions"]
            profile.save()

            action_text = "تم الإنشاء" if created else "تم التحديث"
            results.append({
                "username": user.username,
                "role": item["role_display"],
                "name": f"{user.first_name} {user.last_name}",
                "status": action_text
            })

        self.stdout.write(self.style.SUCCESS("\n✔ تم تجهيز جميع الحسابات التجريبية بنجاح!"))
        self.stdout.write(self.style.NOTICE("كلمة المرور الموحدة لجميع الحسابات: Password@123\n"))

        # طباعة التقرير كجدول منسق
        header = f"{'المستخدم (Username)':<18} | {'الاسم الكامل':<24} | {'الدور التشغيلي':<30} | {'الحالة':<12}"
        self.stdout.write(header)
        self.stdout.write("-" * len(header))
        for res in results:
            row = f"{res['username']:<18} | {res['name']:<24} | {res['role']:<30} | {res['status']:<12}"
            self.stdout.write(row)
        self.stdout.write("\n")
