# inventory/api.py

from ninja import Router, Schema, Form, File
from ninja.files import UploadedFile
from decimal import Decimal
from typing import List, Optional, Any
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import (
    Ingredient,
    RecipeIngredient,
    Supplier,
    PurchaseInvoice,
    PurchaseInvoiceItem,
    PurchaseReturn,
    PurchaseReturnItem,
    Stocktake,
    StocktakeItem
)
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

class ReturnItemIn(Schema):
    ingredient_id: int
    quantity: float
    unit_price: float
    reason: Optional[str] = None

class PurchaseReturnIn(Schema):
    supplier_id: int
    invoice_id: Optional[int] = None
    return_number: Optional[str] = None
    refund_method: str = "SUPPLIER_BALANCE"
    reason: Optional[str] = None
    return_date: Optional[str] = None
    items: List[ReturnItemIn]



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


def handle_create_purchase_return(payload: PurchaseReturnIn):
    with transaction.atomic():
        supplier = get_object_or_404(Supplier, id=payload.supplier_id)
        invoice = None
        if payload.invoice_id:
            invoice = PurchaseInvoice.objects.filter(id=payload.invoice_id).first()

        now_str = timezone.now().strftime("%Y%m%d%H%M%S")
        ret_num = payload.return_number.strip() if payload.return_number and payload.return_number.strip() else f"RET-{now_str}"

        ret_date = timezone.now().date()
        if payload.return_date:
            try:
                ret_date = datetime.strptime(payload.return_date, "%Y-%m-%d").date()
            except Exception:
                ret_date = timezone.now().date()

        norm_refund_method = 'CASH' if payload.refund_method in ['CASH', 'CASH_TREASURY'] else 'DEBT_REDUCTION'

        return_obj = PurchaseReturn.objects.create(
            return_number=ret_num,
            supplier=supplier,
            invoice=invoice,
            refund_method=norm_refund_method,
            reason=payload.reason or "تالف أو غير مطابق للمواصفات",
            return_date=ret_date,
            status='COMPLETED'
        )

        total_return_sum = 0.0

        for item_data in payload.items:
            ingredient = get_object_or_404(Ingredient, id=item_data.ingredient_id)
            item_total = float(item_data.quantity) * float(item_data.unit_price)
            total_return_sum += item_total

            # 1. إنشاء عنصر فاتورة المرتجع
            PurchaseReturnItem.objects.create(
                purchase_return=return_obj,
                ingredient=ingredient,
                quantity=item_data.quantity,
                unit_price=Decimal(str(round(item_data.unit_price, 2))),
                total_price=Decimal(str(round(item_total, 2))),
                reason=item_data.reason or ""
            )

            # 2. خصم الكمية المرتجعة من رصيد المخزون
            new_stock = max(0.0, float(ingredient.current_stock) - float(item_data.quantity))
            ingredient.current_stock = round(new_stock, 3)
            ingredient.save()

        # 3. تحديث إجمالي الفاتورة
        return_obj.total_amount = Decimal(str(round(total_return_sum, 2)))
        return_obj.save()

        # 4. تسوية طريقة الاسترداد
        if norm_refund_method == 'DEBT_REDUCTION':
            # خصم من مستحقات المورد المتبقية
            supplier.balance = Decimal(str(round(float(supplier.balance) - total_return_sum, 2)))
            supplier.save()
        elif norm_refund_method == 'CASH':
            # تسجيل حركة استرجاع نقدي في الخزينة
            try:
                from payments.models import TreasuryTransaction
                TreasuryTransaction.objects.create(
                    amount=Decimal(str(round(total_return_sum, 2))),
                    transaction_type='in',
                    reference_type='refund',
                    reference_id=return_obj.id,
                    description=f"استرداد نقدي لمرتجع مشتريات #{return_obj.return_number} من المورد {supplier.name}"
                )
            except Exception:
                pass

        return {
            "status": "success",
            "return_id": return_obj.id,
            "return_number": return_obj.return_number,
            "total": total_return_sum
        }


def handle_list_purchase_returns():
    returns = PurchaseReturn.objects.select_related('supplier', 'invoice').prefetch_related('items__ingredient').all().order_by('-id')
    result = []
    for ret in returns:
        items = []
        for item in ret.items.all():
            items.append({
                "id": item.id,
                "ingredient_id": item.ingredient_id,
                "ingredient_name": item.ingredient.name,
                "unit": item.ingredient.unit,
                "unit_display": item.ingredient.get_unit_display() if hasattr(item.ingredient, 'get_unit_display') else item.ingredient.unit,
                "quantity": float(item.quantity),
                "unit_price": float(item.unit_price),
                "total_price": float(item.total_price),
                "reason": item.reason or "",
            })
        result.append({
            "id": ret.id,
            "return_number": ret.return_number,
            "supplier_id": ret.supplier_id,
            "supplier_name": ret.supplier.name,
            "supplier_company": ret.supplier.company_name or "",
            "supplier_phone": ret.supplier.phone,
            "invoice_id": ret.invoice_id,
            "invoice_number": ret.invoice.invoice_number if ret.invoice else "",
            "total_amount": float(ret.total_amount),
            "refund_method": ret.refund_method,
            "refund_method_display": dict(PurchaseReturn.REFUND_METHOD_CHOICES).get(ret.refund_method, ret.refund_method),
            "reason": ret.reason or "",
            "status": ret.status,
            "status_display": dict(PurchaseReturn.STATUS_CHOICES).get(ret.status, ret.status),
            "return_date": ret.return_date.strftime("%Y-%m-%d") if ret.return_date else "",
            "created_at": ret.created_at.strftime("%Y-%m-%d %H:%M"),
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

@purchases_router.post("/purchases/returns/")
def create_purchase_return(request, payload: PurchaseReturnIn):
    return handle_create_purchase_return(payload)

@purchases_router.get("/purchases/returns/")
def list_purchase_returns(request):
    return handle_list_purchase_returns()

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

@inventory_router.post("/purchases/returns/")
def inv_create_purchase_return(request, payload: PurchaseReturnIn):
    return handle_create_purchase_return(payload)

@inventory_router.get("/purchases/returns/")
def inv_list_purchase_returns(request):
    return handle_list_purchase_returns()


# ==========================================
# جرد المنتجات والمخزون والتسوية (Stocktaking)
# ==========================================

class StocktakeItemInput(Schema):
    ingredient_id: int
    actual_stock: float
    notes: Optional[str] = None


class CreateStocktakeInput(Schema):
    reference_number: Optional[str] = None
    performed_by: Optional[str] = "المدير"
    notes: Optional[str] = None
    items: List[StocktakeItemInput]
    auto_reconcile: bool = True  # تسوية رصيد المخزون فورياً مع الجرد الفعلي


def handle_get_items_for_stocktaking(request=None):
    ingredients = Ingredient.objects.all().order_by('name')
    result = []
    for ing in ingredients:
        cost = float(ing.cost_per_unit)
        stock = round(float(ing.current_stock), 3)
        img_url = None
        if ing.image:
            try:
                img_url = ing.image.url
                if request and not img_url.startswith(('http://', 'https://')):
                    img_url = request.build_absolute_uri(img_url)
            except Exception:
                img_url = None

        result.append({
            "id": ing.id,
            "name": ing.name,
            "current_stock": stock,
            "unit": ing.unit,
            "unit_display": ing.get_unit_display() if hasattr(ing, 'get_unit_display') else ing.unit,
            "cost_per_unit": cost,
            "total_value": round(stock * cost, 2),
            "reorder_level": float(ing.reorder_level),
            "image": img_url,
            "last_updated": ing.last_updated.strftime("%Y-%m-%d %H:%M") if ing.last_updated else "",
        })
    return result


def handle_create_stocktake(payload: CreateStocktakeInput):
    with transaction.atomic():
        now = timezone.now()
        ref_num = payload.reference_number
        if not ref_num or not ref_num.strip():
            ref_num = f"STK-{now.strftime('%Y%m%d%H%M%S')}"

        status_val = 'APPLIED' if payload.auto_reconcile else 'DRAFT'
        applied_at_val = now if payload.auto_reconcile else None

        stocktake = Stocktake.objects.create(
            reference_number=ref_num.strip(),
            performed_by=payload.performed_by or "المدير",
            status=status_val,
            applied_at=applied_at_val,
            notes=payload.notes or "",
        )

        total_sys_val = Decimal('0.00')
        total_act_val = Decimal('0.00')
        items_matched = 0
        items_shortage = 0
        items_surplus = 0

        for item_data in payload.items:
            ingredient = get_object_or_404(Ingredient, id=item_data.ingredient_id)
            sys_qty = float(ingredient.current_stock)
            act_qty = float(item_data.actual_stock)
            diff = round(act_qty - sys_qty, 3)
            unit_cost = ingredient.cost_per_unit
            var_val = Decimal(str(round(diff * float(unit_cost), 2)))

            if abs(diff) < 0.0001:
                item_status = 'MATCHED'
                items_matched += 1
            elif diff < 0:
                item_status = 'SHORTAGE'
                items_shortage += 1
            else:
                item_status = 'SURPLUS'
                items_surplus += 1

            total_sys_val += Decimal(str(round(sys_qty * float(unit_cost), 2)))
            total_act_val += Decimal(str(round(act_qty * float(unit_cost), 2)))

            StocktakeItem.objects.create(
                stocktake=stocktake,
                ingredient=ingredient,
                system_stock=sys_qty,
                actual_stock=act_qty,
                difference=diff,
                unit_cost=unit_cost,
                variance_value=var_val,
                status=item_status,
                notes=item_data.notes or "",
            )

            # عند التسوية التلقائية: يتم تعديل رصيد المادة الفعلي في قاعدة البيانات
            if payload.auto_reconcile:
                ingredient.current_stock = act_qty
                ingredient.save()

        stocktake.total_system_value = total_sys_val
        stocktake.total_actual_value = total_act_val
        stocktake.net_variance_value = total_act_val - total_sys_val
        stocktake.total_items_counted = len(payload.items)
        stocktake.items_matched = items_matched
        stocktake.items_with_shortage = items_shortage
        stocktake.items_with_surplus = items_surplus
        stocktake.save()

        return {
            "status": "success",
            "stocktake_id": stocktake.id,
            "reference_number": stocktake.reference_number,
            "total_items_counted": stocktake.total_items_counted,
            "items_matched": stocktake.items_matched,
            "items_with_shortage": stocktake.items_with_shortage,
            "items_with_surplus": stocktake.items_with_surplus,
            "net_variance_value": float(stocktake.net_variance_value),
            "total_system_value": float(stocktake.total_system_value),
            "total_actual_value": float(stocktake.total_actual_value),
            "reconciled": payload.auto_reconcile,
            "message": "تم اعتماد وتسوية الجرد وتحديث أرصدة المخزون بنجاح!" if payload.auto_reconcile else "تم حفظ مسودة الجرد بنجاح!"
        }


def handle_list_stocktakes():
    stocktakes = Stocktake.objects.prefetch_related('items__ingredient').all().order_by('-id')
    result = []
    for st in stocktakes:
        items = []
        for it in st.items.all():
            items.append({
                "id": it.id,
                "ingredient_id": it.ingredient_id,
                "ingredient_name": it.ingredient.name,
                "unit": it.ingredient.unit,
                "unit_display": it.ingredient.get_unit_display() if hasattr(it.ingredient, 'get_unit_display') else it.ingredient.unit,
                "system_stock": float(it.system_stock),
                "actual_stock": float(it.actual_stock),
                "difference": float(it.difference),
                "unit_cost": float(it.unit_cost),
                "variance_value": float(it.variance_value),
                "status": it.status,
                "status_display": dict(StocktakeItem.STATUS_CHOICES).get(it.status, it.status),
                "notes": it.notes or "",
            })
        result.append({
            "id": st.id,
            "reference_number": st.reference_number,
            "performed_by": st.performed_by,
            "status": st.status,
            "status_display": dict(Stocktake.STATUS_CHOICES).get(st.status, st.status),
            "created_at": st.created_at.strftime("%Y-%m-%d %H:%M"),
            "applied_at": st.applied_at.strftime("%Y-%m-%d %H:%M") if st.applied_at else "",
            "notes": st.notes or "",
            "total_system_value": float(st.total_system_value),
            "total_actual_value": float(st.total_actual_value),
            "net_variance_value": float(st.net_variance_value),
            "total_items_counted": st.total_items_counted,
            "items_with_shortage": st.items_with_shortage,
            "items_with_surplus": st.items_with_surplus,
            "items_matched": st.items_matched,
            "items": items,
        })
    return result


def handle_get_single_stocktake(stocktake_id: int):
    st = get_object_or_404(Stocktake, id=stocktake_id)
    items = []
    for it in st.items.select_related('ingredient').all():
        items.append({
            "id": it.id,
            "ingredient_id": it.ingredient_id,
            "ingredient_name": it.ingredient.name,
            "unit": it.ingredient.unit,
            "unit_display": it.ingredient.get_unit_display() if hasattr(it.ingredient, 'get_unit_display') else it.ingredient.unit,
            "system_stock": float(it.system_stock),
            "actual_stock": float(it.actual_stock),
            "difference": float(it.difference),
            "unit_cost": float(it.unit_cost),
            "variance_value": float(it.variance_value),
            "status": it.status,
            "status_display": dict(StocktakeItem.STATUS_CHOICES).get(it.status, it.status),
            "notes": it.notes or "",
        })
    return {
        "id": st.id,
        "reference_number": st.reference_number,
        "performed_by": st.performed_by,
        "status": st.status,
        "status_display": dict(Stocktake.STATUS_CHOICES).get(st.status, st.status),
        "created_at": st.created_at.strftime("%Y-%m-%d %H:%M"),
        "applied_at": st.applied_at.strftime("%Y-%m-%d %H:%M") if st.applied_at else "",
        "notes": st.notes or "",
        "total_system_value": float(st.total_system_value),
        "total_actual_value": float(st.total_actual_value),
        "net_variance_value": float(st.net_variance_value),
        "total_items_counted": st.total_items_counted,
        "items_with_shortage": st.items_with_shortage,
        "items_with_surplus": st.items_with_surplus,
        "items_matched": st.items_matched,
        "items": items,
    }


# نقاط نهاية الجرد والتسوية في موجه المخزون
@inventory_router.get("/stocktaking/items/")
def get_stocktaking_items(request):
    """
    جلب كافة الأصناف والمواد في المخزون لبدء الجرد الفعلي.
    """
    return handle_get_items_for_stocktaking(request)


@inventory_router.post("/stocktaking/reconcile/")
def reconcile_stocktaking(request, payload: CreateStocktakeInput):
    """
    اعتماد جلسة الجرد، وحساب الفروقات والعجز، وتسوية أرصدة المخزون في النظام فورياً.
    """
    return handle_create_stocktake(payload)


@inventory_router.get("/stocktaking/history/")
def get_stocktaking_history(request):
    """
    جلب سجل وأرشيف جلسات الجرد السابقة مع الفروقات والإحصائيات.
    """
    return handle_list_stocktakes()


@inventory_router.get("/stocktaking/history/{stocktake_id}/")
def get_stocktaking_detail(request, stocktake_id: int):
    """
    جلب تفاصيل إذن جرد محدد ببنوده وتفاصيل الفروقات.
    """
    return handle_get_single_stocktake(stocktake_id)


# ==========================================
# محرك التنبؤ بالمخزون (AI Stock Forecasting)
# ==========================================

class StockForecastOut(Schema):
    ingredient_id: int
    name: str
    unit: str
    current_stock: float
    daily_burn_rate: float
    days_left: Optional[float] = None
    risk_level: str
    suggested_reorder_qty: float
    cost_per_unit: float


@inventory_router.get("/ai/stock-forecast/", response=List[StockForecastOut])
def get_inventory_forecast(request):
    """
    تحليل المخزون بالذكاء الاصطناعي وإرجاع توقعات النفاد والكميات المقترحة
    """
    from ml_services.stock_forecaster import StockForecastingService
    return StockForecastingService.analyze_stock_runway(lookback_days=7)
