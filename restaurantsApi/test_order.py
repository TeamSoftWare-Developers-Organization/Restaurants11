import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()

from orders.models import Order, OrderItem
from menu.models import MenuItem

try:
    # Try to create an order
    item = MenuItem.objects.first()
    if not item:
        print("Error: No menu items found to create an order.")
    else:
        order = Order.objects.create(status='pending', table_number='Test')
        OrderItem.objects.create(order=order, menu_item=item, quantity=1)
        order.calculate_total()
        print(f"Success: Order {order.id} created with total {order.total_amount}")
except Exception as e:
    import traceback
    print(f"Error creating order: {e}")
    traceback.print_exc()
