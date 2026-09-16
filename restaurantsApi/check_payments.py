# check_payments.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()

from payments.models import Payment

payments = Payment.objects.all()
print(f"Total payments: {payments.count()}")
for p in payments:
    print(f"ID: {p.id}, Order ID: {p.order.id}, Amount: {p.amount}, Method: {p.payment_method}")
