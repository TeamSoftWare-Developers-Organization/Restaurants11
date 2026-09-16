import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()
from menu.models import Category, MenuItem
try:
    c_count = Category.objects.count()
    i_count = MenuItem.objects.count()
    with open('db_check.txt', 'w') as f:
        f.write(f"Categories: {c_count}\nItems: {i_count}\n")
except Exception as e:
    with open('db_check.txt', 'w') as f:
        f.write(f"Error: {str(e)}\n")
