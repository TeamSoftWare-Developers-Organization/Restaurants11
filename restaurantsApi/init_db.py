import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()

from django.contrib.auth.models import User
from employees.models import Employee
from core.models import RestaurantSettings

def seed():
    print("🌱 Running database initialization & seeding...")
    
    # 1. Initialize Settings
    try:
        settings = RestaurantSettings.load()
        if not settings.name:
            settings.name = "RestoSystem Restaurant"
        settings.show_qr_code = False
        settings.save()
        print("✅ Restaurant settings loaded successfully.")
    except Exception as e:
        print(f"⚠️ Settings load error: {e}")

    # 2. Seed Default Admin & SuperDev Users
    users_data = [
        ('admin', 'admin@restaurant.local', 'Password@123', 'manager'),
        ('zafer', 'zafer@restoerp.dev', 'Password@123', 'manager'),
        ('ayoub', 'ayoub@restoerp.dev', 'Password@123', 'manager'),
    ]

    for username, email, pwd, role in users_data:
        try:
            u = User.objects.filter(username__iexact=username).first()
            if not u:
                u = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=pwd
                )
                print(f"✅ Created superuser: {username}")
            else:
                u.is_superuser = True
                u.is_staff = True
                u.set_password(pwd)
                u.save()
                print(f"✅ Updated existing user: {username}")

            Employee.objects.get_or_create(
                user=u,
                defaults={
                    'role': role,
                    'permissions': Employee.get_default_permissions_for_role(role)
                }
            )
        except Exception as e:
            print(f"⚠️ Error creating user {username}: {e}")

    # 3. Initialize & Activate System License (Automatic Cloud Mode Activation)
    try:
        from core.license_service import LicenseService, is_cloud_environment
        lic = LicenseService.get_or_initialize_license()
        if is_cloud_environment() or os.environ.get('AUTO_ACTIVATE_LICENSE', '').lower() in ('true', '1', 'yes') or os.environ.get('CLOUD_DEPLOYMENT', '').lower() in ('true', '1', 'yes'):
            LicenseService.activate_cloud_license()
            print("☁️ Cloud License auto-activated successfully (Cloud Unlimited).")
        else:
            print(f"🔑 System License initialized ({lic.license_type}).")
    except Exception as e:
        print(f"⚠️ License initialization error: {e}")

    print("🎉 Database initialization completed!")

if __name__ == '__main__':
    seed()
