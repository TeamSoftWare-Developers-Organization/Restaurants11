import os
import sys

# Ensure restaurantsApi is on path
root_dir = os.path.dirname(os.path.abspath(__file__))
api_dir = os.path.join(root_dir, 'restaurantsApi')
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

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
            settings.name = "RestoERP Restaurant"
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

    print("🎉 Database initialization completed!")

if __name__ == '__main__':
    seed()
