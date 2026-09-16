# orders/api.py

from ninja import Router, Schema
from typing import List, Optional
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import Order, OrderItem
from employees.models import Employee # نحتاج لاستيراد الموظف
from menu.models import MenuItem     # نحتاج لاستيراد الصنف من القائمة

# استيراد مخططات الواجهة الأمامية من تطبيقات أخرى للاستجابات المترابطة
from employees.api import EmployeeOut
from menu.api import MenuItemOut, CategoryOut # CategoryOut لتمثيل الفئة ضمن MenuItemOut

from ninja_jwt.authentication import JWTAuth

# إنشاء موجه (Router) خاص بتطبيق orders
order_router = Router(tags=["الطلبات"])

# 1. تعريف المخططات (Schemas) لـ OrderItem (لأنها جزء من Order)

# Schema لإدخال صنف طلب جديد
class OrderItemIn(Schema):
    menu_item_id: int
    quantity: int = 1
    notes: Optional[str] = None

# Schema لإخراج صنف طلب (يشمل تفاصيل الصنف من القائمة)
class OrderItemOut(Schema):
    id: int
    menu_item: Optional[MenuItemOut] = None # هنا نعيد كائن MenuItem إذا كان موجوداً
    quantity: int
    unit_price: float # يفضل DecimalField في الموديل لكن float مناسب للـ API
    notes: Optional[str] = None

# 2. تعريف المخططات (Schemas) لـ Order

# Schema لإدخال بيانات طلب جديد
class OrderIn(Schema):
    employee_id: Optional[int] = None
    table_number: Optional[str] = None
    status: Optional[str] = None # يمكن تحديث الحالة عند الإنشاء
    discount_amount: float = 0.00
    # يمكن أن نستقبل قائمة الأصناف كجزء من الطلب عند الإنشاء
    items: List[OrderItemIn] = [] 

class PaymentSummaryOut(Schema):
    id: int
    amount: float
    payment_method: str
    card_provider: Optional[str] = None
    payment_date_time: datetime

# Schema لإخراج بيانات الطلب (يشمل قائمة أصناف الطلب)
class OrderOut(Schema):
    id: int
    employee: Optional[EmployeeOut] = None
    table_number: Optional[str] = None
    order_date_time: datetime # سيتم إخراجها كتاريخ ووقت
    status: str
    total_amount: float
    discount_amount: float
    items: List[OrderItemOut] # قائمة بأصناف الطلب المرتبطة
    payments: List[PaymentSummaryOut] = []


# 3. تعريف نقاط نهاية API لـ Order

@order_router.get("/", response=List[OrderOut], auth=JWTAuth())
def list_orders(request):
    """
    جلب قائمة بجميع الطلبات.
    """
    orders = Order.objects.prefetch_related('items__menu_item', 'payments').all()
    return orders

@order_router.post("/", response={200: OrderOut, 400: dict, 500: dict}, auth=JWTAuth())
def create_order(request, order_data: OrderIn):
    """
    إنشاء طلب جديد وإضافة أصناف إليه.
    """
    try:
        # التحقق من وجود وردية مفتوحة للكاشير/الموظف
        from payments.models import Shift
        current_shift = Shift.objects.filter(cashier=request.auth, status='open').first()
        if not current_shift:
            current_shift = Shift.objects.filter(status='open').first()
        if not current_shift:
            return 400, {"message": "يرجى فتح وردية أولاً قبل البدء في المبيعات وحفظ الطلبات."}

        # التحقق من وجود أصناف في الطلب
        if not order_data.items:
            return 400, {"message": "لا يمكن إنشاء طلب بدون أصناف. يرجى إضافة صنف واحد على الأقل."}

        # التحقق من صحة الأصناف قبل البدء
        from inventory.models import RecipeIngredient
        menu_items_map = {}
        for item_data in order_data.items:
            m_item = MenuItem.objects.filter(id=item_data.menu_item_id).first()
            if not m_item:
                return 400, {"message": f"أحد الأصناف المحددة (رقم {item_data.menu_item_id}) لم يعد متوفراً في قائمة الطعام."}
            menu_items_map[item_data.menu_item_id] = m_item

        employee = None
        if order_data.employee_id:
            employee = Employee.objects.filter(id=order_data.employee_id).first()
        if not employee:
            employee = Employee.objects.filter(user=request.auth).first()

        with transaction.atomic():
            order = Order.objects.create(
                employee=employee,
                table_number=order_data.table_number,
                status=order_data.status or 'pending',
                discount_amount=order_data.discount_amount
            )

            # إضافة أصناف الطلب وخصم المكونات من المخزون
            for item_data in order_data.items:
                menu_item = menu_items_map[item_data.menu_item_id]
                OrderItem.objects.create(
                    order=order,
                    menu_item=menu_item,
                    quantity=item_data.quantity,
                    unit_price=menu_item.price,
                    notes=item_data.notes
                )
                
                # خصم المكونات من المخزون تلقائياً إذا وُجدت وصفة للصنف
                recipes = RecipeIngredient.objects.filter(menu_item=menu_item)
                for r in recipes:
                    deduct_amount = float(r.quantity_needed) * item_data.quantity
                    r.ingredient.current_stock = max(0.0, float(r.ingredient.current_stock) - deduct_amount)
                    r.ingredient.save()
            
            order.calculate_total() # تحديث الإجمالي بعد إضافة الأصناف
            
        return 200, order
    except Exception as e:
        import traceback
        traceback.print_exc()
        return 500, {"message": str(e)}

@order_router.get("/{order_id}", response=OrderOut, auth=JWTAuth())
def get_order(request, order_id: int):
    """
    جلب تفاصيل طلب محدد.
    """
    order = get_object_or_404(Order, id=order_id)
    return order

@order_router.put("/{order_id}", response=OrderOut, auth=JWTAuth())
def update_order(request, order_id: int, order_data: OrderIn):
    """
    تحديث طلب موجود.
    """
    order = get_object_or_404(Order, id=order_id)

    # تحديث حقل الموظف بشكل خاص
    if order_data.employee_id is not None:
        order.employee = get_object_or_404(Employee, id=order_data.employee_id)
    elif order_data.employee_id == None and order.employee: # للسماح بإزالة الموظف
        order.employee = None
    
    # تحديث الحقول الأخرى
    for attr, value in order_data.dict(exclude_unset=True).items():
        if attr not in ['employee_id', 'items']: # نتجنب تحديث employee_id و items مباشرة هنا
            setattr(order, attr, value)
    
    # تحديث أصناف الطلب (هنا نحتاج لمنطق أكثر تعقيدًا لإدارة إضافة/تعديل/حذف الأصناف)
    # لتبسيط الأمر في البداية، لن نسمح بتحديث الأصناف عبر PUT للطلب
    # يمكن إنشاء نقاط نهاية منفصلة لـ OrderItem للتحكم الدقيق
    # أو implement logic here to diff and update/create/delete OrderItems
    
    order.save()
    order.calculate_total() # إعادة حساب الإجمالي بعد التحديث
    return order

@order_router.delete("/{order_id}", auth=JWTAuth())
def delete_order(request, order_id: int):
    """
    حذف طلب محدد.
    """
    order = get_object_or_404(Order, id=order_id)
    order.delete()
    return {"success": True}

# 4. تعريف نقاط نهاية API لـ OrderItem (للتحكم الفردي في أصناف الطلبات)

@order_router.post("/{order_id}/items", response=OrderItemOut, auth=JWTAuth())
def add_item_to_order(request, order_id: int, item_data: OrderItemIn):
    """
    إضافة صنف جديد إلى طلب موجود.
    """
    order = get_object_or_404(Order, id=order_id)
    menu_item = get_object_or_404(MenuItem, id=item_data.menu_item_id)

    order_item = OrderItem.objects.create(
        order=order,
        menu_item=menu_item,
        quantity=item_data.quantity,
        notes=item_data.notes
    )
    order.calculate_total() # إعادة حساب إجمالي الطلب
    return order_item

@order_router.put("/items/{order_item_id}", response=OrderItemOut, auth=JWTAuth())
def update_order_item(request, order_item_id: int, item_data: OrderItemIn):
    """
    تحديث صنف طلب موجود.
    """
    order_item = get_object_or_404(OrderItem, id=order_item_id)
    
    # تحديث الصنف الفعلي إذا تم توفيره
    if item_data.menu_item_id is not None:
        order_item.menu_item = get_object_or_404(MenuItem, id=item_data.menu_item_id)

    # تحديث الكمية والملاحظات
    if item_data.quantity is not None:
        order_item.quantity = item_data.quantity
    if item_data.notes is not None:
        order_item.notes = item_data.notes

    order_item.save()
    order_item.order.calculate_total() # إعادة حساب إجمالي الطلب الرئيسي
    return order_item

@order_router.delete("/items/{order_item_id}", auth=JWTAuth())
def delete_order_item(request, order_item_id: int):
    """
    حذف صنف طلب محدد.
    """
    order_item = get_object_or_404(OrderItem, id=order_item_id)
    order = order_item.order # نحتفظ بالطلب قبل حذفه
    order_item.delete()
    order.calculate_total() # إعادة حساب إجمالي الطلب الرئيسي
    return {"success": True}