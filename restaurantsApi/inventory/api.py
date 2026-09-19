# inventory/api.py

from ninja import Router, Schema, Form, File
from ninja.files import UploadedFile
from decimal import Decimal
from typing import List, Optional, Any
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction

from .models import Ingredient, RecipeIngredient, Supplier, PurchaseInvoice, PurchaseInvoiceItem
from menu.models import MenuItem
from menu.api import MenuItemOut # استيراد مخطط MenuItemOut

# إنشاء موجه (Router) خاص بتطبيق inventory
inventory_router = Router(tags=["المخزون والوصفات"])

# 1. تعريف المخططات (Schemas) لـ Ingredient

class IngredientIn(Schema):
    name: str
    current_stock: float
    unit: str
    cost_per_unit: float = 0.00
    reorder_level: float = 0.00

class IngredientOut(Schema):
    id: int
    name: str
    current_stock: float
    unit: str
    cost_per_unit: float
    reorder_level: float
    image: Optional[str] = None
    last_updated: datetime


# نقاط نهاية CRUD لـ Ingredient (المكونات)

@inventory_router.get("/ingredients/", response=List[IngredientOut])
def list_ingredients(request):
    """
    جلب قائمة بجميع المكونات في المخزون.
    """
    return Ingredient.objects.all()

@inventory_router.post("/ingredients/", response=IngredientOut)
def create_ingredient(
    request,
    ingredient_data: IngredientIn = Form(...),  # type: ignore
    image: Optional[UploadedFile] = File(None),  # type: ignore
):
    """
    إنشاء مكون جديد في المخزون.
    """
    try:
        data = ingredient_data.dict()
        if image:
            data['image'] = image
        ingredient = Ingredient.objects.create(**data)
        return ingredient
    except IntegrityError:
        return 400, {"message": "المكون موجود بالفعل."}

@inventory_router.put("/ingredients/{ingredient_id}/", response=IngredientOut)
def update_ingredient(
    request,
    ingredient_id: int,
    ingredient_data: IngredientIn = Form(...),  # type: ignore
    image: Optional[UploadedFile] = File(None),  # type: ignore
):
    """
    تحديث بيانات مكون في المخزون.
    """
    ingredient = get_object_or_404(Ingredient, id=ingredient_id)
    for attr, value in ingredient_data.dict().items():
        setattr(ingredient, attr, value)
    if image:
        ingredient.image = image  # type: ignore
    ingredient.save()
    return ingredient

@inventory_router.delete("/ingredients/{ingredient_id}/")
def delete_ingredient(request, ingredient_id: int):
    """
    حذف مكون من المخزون.
    """
    ingredient = get_object_or_404(Ingredient, id=ingredient_id)
    ingredient.delete()
    return {"success": True}

# 2. تعريف المخططات (Schemas) لـ RecipeIngredient (الوصفات)

class RecipeIngredientIn(Schema):
    ingredient_id: int
    quantity_needed: float

class RecipeIngredientOut(Schema):
    id: int
    menu_item: MenuItemOut
    ingredient: IngredientOut
    quantity_needed: float

# نقاط نهاية للتعامل مع RecipeIngredient (إدارة الوصفات)

@inventory_router.get("/recipes/", response=List[RecipeIngredientOut])
def list_all_recipes(request):
    """
    جلب جميع المكونات المرتبطة بوصفات الأصناف.
    """
    return RecipeIngredient.objects.select_related('menu_item', 'ingredient').all()

@inventory_router.get("/recipes/{menu_item_id}/", response=List[RecipeIngredientOut])
def get_recipe_for_item(request, menu_item_id: int):
    """
    جلب وصفة صنف قائمة محدد.
    """
    menu_item = get_object_or_404(MenuItem, id=menu_item_id)
    return RecipeIngredient.objects.filter(menu_item=menu_item)

@inventory_router.post("/recipes/{menu_item_id}/", response=RecipeIngredientOut)
def add_ingredient_to_recipe(request, menu_item_id: int, recipe_data: RecipeIngredientIn):
    """
    إضافة مكون إلى وصفة صنف قائمة.
    """
    menu_item = get_object_or_404(MenuItem, id=menu_item_id)
    ingredient = get_object_or_404(Ingredient, id=recipe_data.ingredient_id)

    # التحقق من عدم وجود السجل مسبقاً (Unique_together)
    try:
        recipe_item = RecipeIngredient.objects.create(
            menu_item=menu_item,
            ingredient=ingredient,
            quantity_needed=Decimal(str(recipe_data.quantity_needed))
        )
        return recipe_item
    except IntegrityError:
        return 400, {"message": "هذا المكون موجود بالفعل في وصفة هذا الصنف. استخدم PUT للتحديث."}

@inventory_router.put("/recipe_items/{recipe_ingredient_id}/", response=RecipeIngredientOut)
def update_recipe_ingredient(request, recipe_ingredient_id: int, recipe_data: RecipeIngredientIn):
    """
    تحديث كمية مكون في وصفة موجودة.
    """
    recipe_item = get_object_or_404(RecipeIngredient, id=recipe_ingredient_id)
    
    # يمكن السماح بتغيير المكون نفسه أو الكمية فقط
    recipe_item.quantity_needed = Decimal(str(recipe_data.quantity_needed))
    
    # إذا تم تمرير ingredient_id، نقوم بتحديث المكون المرتبط
    if recipe_data.ingredient_id is not None:
        recipe_item.ingredient = get_object_or_404(Ingredient, id=recipe_data.ingredient_id)
        
    recipe_item.save()
    return recipe_item

@inventory_router.delete("/recipe_items/{recipe_ingredient_id}/")
def delete_recipe_item(request, recipe_ingredient_id: int):
    """
    حذف مكون من وصفة صنف.
    """
    recipe_item = get_object_or_404(RecipeIngredient, id=recipe_ingredient_id)
    recipe_item.delete()
    return {"success": True}


# ==========================================
# الموردين وفواتير الشراء والترحيل للمخزن
# ==========================================

class SupplierIn(Schema):
    name: str
    company_name: Optional[str] = None
    phone: str
    tax_number: Optional[str] = None

class ItemIn(Schema):
    ingredient_id: int
    quantity: float
    unit_price: float

class PurchaseInvoiceIn(Schema):
    supplier_id: int
    invoice_number: str
    items: List[ItemIn]
    paid_amount: float = 0.0


def handle_create_supplier(payload: SupplierIn):
    supplier = Supplier.objects.create(**payload.dict(exclude_unset=True))
    return {
        "id": supplier.id,
        "name": supplier.name,
        "company_name": supplier.company_name or "",
        "phone": supplier.phone,
        "tax_number": supplier.tax_number or "",
        "balance": float(supplier.balance),
    }

def handle_list_suppliers():
    return list(Supplier.objects.values())

def handle_create_purchase_invoice(payload: PurchaseInvoiceIn):
    with transaction.atomic():
        supplier = get_object_or_404(Supplier, id=payload.supplier_id)
        
        invoice = PurchaseInvoice.objects.create(
            invoice_number=payload.invoice_number,
            supplier=supplier,
            paid_amount=Decimal(str(round(payload.paid_amount, 2))),
            status='RECEIVED'
        )

        total_invoice_sum = 0.0

        for item_data in payload.items:
            ingredient = get_object_or_404(Ingredient, id=item_data.ingredient_id)
            item_total = float(item_data.quantity) * float(item_data.unit_price)
            total_invoice_sum += item_total

            # 1. إنشاء عنصر الفاتورة
            PurchaseInvoiceItem.objects.create(
                invoice=invoice,
                ingredient=ingredient,
                quantity=item_data.quantity,
                unit_price=Decimal(str(round(item_data.unit_price, 2))),
                total_price=Decimal(str(round(item_total, 2)))
            )

            # 2. ربط المخزن: تحديث متوسط التكلفة وإضافة الكمية للمخزون آلياً دون تدخل بشري
            old_stock = float(ingredient.current_stock)
            old_cost = float(ingredient.cost_per_unit)
            
            # المعادلة الحسابية المرجحة:
            if old_stock > 0 and old_cost > 0:
                current_total_value = old_stock * old_cost
                new_stock = old_stock + float(item_data.quantity)
                new_cost_per_unit = (current_total_value + item_total) / new_stock if new_stock > 0 else float(item_data.unit_price)
            else:
                # إذا كان الرصيد السابق صفراً أو سالباً، تصبح تكلفة الوحدة هي سعر الشراء الجديد مباشرة
                new_stock = old_stock + float(item_data.quantity)
                new_cost_per_unit = float(item_data.unit_price)

            ingredient.current_stock = round(new_stock, 3)
            ingredient.cost_per_unit = Decimal(str(round(new_cost_per_unit, 2)))
            ingredient.save()

        # 3. تحديث مبالغ الفاتورة ومستحقات المورد
        invoice.total_amount = Decimal(str(round(total_invoice_sum, 2)))
        invoice.save()

        unpaid_amount = total_invoice_sum - float(payload.paid_amount)
        if unpaid_amount > 0:
            supplier.balance = Decimal(str(round(float(supplier.balance) + unpaid_amount, 2)))
            supplier.save()

    return {"status": "success", "invoice_id": invoice.id, "total": total_invoice_sum}


def handle_list_purchase_invoices():
    invoices = PurchaseInvoice.objects.select_related('supplier').prefetch_related('items__ingredient').all().order_by('-id')
    result = []
    for inv in invoices:
        items = []
        for item in inv.items.all():
            items.append({
                "id": item.id,
                "ingredient_id": item.ingredient_id,
                "ingredient_name": item.ingredient.name,
                "unit": item.ingredient.unit,
                "unit_display": item.ingredient.get_unit_display() if hasattr(item.ingredient, 'get_unit_display') else item.ingredient.unit,
                "quantity": float(item.quantity),
                "unit_price": float(item.unit_price),
                "total_price": float(item.total_price),
            })
        result.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "supplier_id": inv.supplier_id,
            "supplier_name": inv.supplier.name,
            "supplier_company": inv.supplier.company_name or "",
            "supplier_phone": inv.supplier.phone,
            "supplier_tax_number": inv.supplier.tax_number or "",
            "total_amount": float(inv.total_amount),
            "paid_amount": float(inv.paid_amount),
            "remaining_amount": round(float(inv.total_amount) - float(inv.paid_amount), 2),
            "status": inv.status,
            "status_display": dict(PurchaseInvoice.STATUS_CHOICES).get(inv.status, inv.status),
            "invoice_date": inv.invoice_date.strftime("%Y-%m-%d") if inv.invoice_date else "",
            "created_at": inv.created_at.strftime("%Y-%m-%d %H:%M"),
            "items_count": len(items),
            "items": items,
        })
    return result


purchases_router = Router(tags=["الموردين والمشتريات"])

@purchases_router.post("/suppliers/")
def create_supplier(request, payload: SupplierIn):
    return handle_create_supplier(payload)

@purchases_router.get("/suppliers/")
def list_suppliers(request):
    return handle_list_suppliers()

@purchases_router.post("/purchases/create-and-receive/")
def create_purchase_invoice(request, payload: PurchaseInvoiceIn):
    return handle_create_purchase_invoice(payload)

@purchases_router.get("/purchases/")
def list_purchase_invoices(request):
    return handle_list_purchase_invoices()

# دعم استدعاء نفس المسارات تحت /inventory أيضاً
@inventory_router.post("/suppliers/")
def inv_create_supplier(request, payload: SupplierIn):
    return handle_create_supplier(payload)

@inventory_router.get("/suppliers/")
def inv_list_suppliers(request):
    return handle_list_suppliers()

@inventory_router.post("/purchases/create-and-receive/")
def inv_create_purchase_invoice(request, payload: PurchaseInvoiceIn):
    return handle_create_purchase_invoice(payload)

@inventory_router.get("/purchases/")
def inv_list_purchase_invoices(request):
    return handle_list_purchase_invoices()
