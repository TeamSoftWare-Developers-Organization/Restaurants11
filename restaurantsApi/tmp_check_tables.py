from reservations.models import Table
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()

tables = Table.objects.all()
if not tables.exists():
    print("No tables found in the database. Creating default tables...")
    for i in range(1, 11):
        Table.objects.create(table_number=f"{i}", capacity=4 if i <= 5 else 6)
    print("Default tables created.")
else:
    print(f"Found {tables.count()} tables:")
    for t in tables:
        print(f"- Table {t.table_number} (Capacity: {t.capacity})")
