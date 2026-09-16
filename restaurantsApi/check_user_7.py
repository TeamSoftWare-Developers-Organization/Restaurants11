import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()

from django.contrib.auth.models import User
from employees.models import Employee

def check_user(uid):
    try:
        user = User.objects.get(id=uid)
        print(f"User ID {uid}: {user.username} (Email: {user.email})")
        try:
            emp = Employee.objects.get(user=user)
            print(f"  Employee Profile found: {emp.role}")
        except Employee.DoesNotExist:
            print(f"  ❌ NO Employee Profile found for this user!")
    except User.DoesNotExist:
        print(f"❌ User ID {uid} does not exist in the database!")

if __name__ == "__main__":
    check_user(7)
    print("\nListing all users:")
    for u in User.objects.all():
        print(f"ID: {u.id}, Username: {u.username}")
