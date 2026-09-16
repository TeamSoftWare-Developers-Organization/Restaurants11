# inventory/api.py

from ninja import Router, Schema, Form, File
from ninja.files import UploadedFile
from decimal import Decimal
from typing import List, Optional, Any
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.db import IntegrityError

from .models import Ingredient, RecipeIngredient
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