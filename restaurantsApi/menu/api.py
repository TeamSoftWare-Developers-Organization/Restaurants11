# menu/api.py

from ninja import Router, Schema, File
from ninja.files import UploadedFile
from typing import List, Optional
import os
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from .models import Category, MenuItem

# إنشاء موجه (Router) خاص بتطبيق menu
menu_router = Router(tags=["القائمة (الأصناف والفئات)"])

# 1. تعريف المخططات (Schemas) لـ Category

class CategoryIn(Schema):
    name: str

class CategoryOut(Schema):
    id: int
    name: str

# 2. تعريف نقاط نهاية API لـ Category

@menu_router.get("/categories/", response=List[CategoryOut])
def list_categories(request):
    """
    جلب قائمة بجميع فئات الأصناف.
    """
    categories = Category.objects.all()
    return categories

@menu_router.post("/categories/", response=CategoryOut)
def create_category(request, category_data: CategoryIn):
    """
    إنشاء فئة صنف جديدة.
    """
    try:
        category = Category.objects.create(**category_data.dict())
        return category
    except IntegrityError:
        return 400, {"message": "هذه الفئة موجودة بالفعل."}

@menu_router.get("/categories/{category_id}/", response=CategoryOut)
def get_category(request, category_id: int):
    """
    جلب تفاصيل فئة صنف محددة.
    """
    category = get_object_or_404(Category, id=category_id)
    return category

@menu_router.put("/categories/{category_id}/", response=CategoryOut)
def update_category(request, category_id: int, category_data: CategoryIn):
    """
    تحديث فئة صنف موجودة.
    """
    category = Category.objects.get(id=category_id)
    for attr, value in category_data.dict(exclude_unset=True).items():
        setattr(category, attr, value)
    category.save()
    return category

@menu_router.delete("/categories/{category_id}/")
def delete_category(request, category_id: int):
    """
    حذف فئة صنف محددة.
    """
    category = Category.objects.get(id=category_id)
    category.delete()
    return {"success": True}

@menu_router.post("/upload-image/")
def upload_menu_item_image(request, image: UploadedFile = File(...)):
    """
    رفع صورة لصنف قائمة.
    """
    # إنشاء مجلد الوسائط إذا لم يكن موجوداً
    upload_path = os.path.join(settings.MEDIA_ROOT, 'menu')
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    
    # حفظ الملف
    file_path = os.path.join(upload_path, image.name)
    with open(file_path, 'wb+') as destination:
        for chunk in image.chunks():
            destination.write(chunk)
            
    # إرجاع رابط الصورة
    image_url = f"{settings.MEDIA_URL}menu/{image.name}"
    return {"image_url": image_url}

# 3. تعريف المخططات (Schemas) لـ MenuItem

class MenuItemIn(Schema):
    name: str
    description: Optional[str] = None
    price: float # استخدم float هنا وسيتولى Django Ninja تحويلها لـ Decimal
    category_id: Optional[int] = None # المفتاح الخارجي للفئة
    is_available: bool = True
    image_url: Optional[str] = None

class MenuItemOut(Schema):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    category: Optional[CategoryOut] = None # هنا نعيد كائن الفئة بالكامل
    is_available: bool
    image_url: Optional[str] = None

# 4. تعريف نقاط نهاية API لـ MenuItem

@menu_router.get("/items/", response=List[MenuItemOut])
def list_menu_items(request):
    """
    جلب قائمة بجميع أصناف القائمة.
    """
    items = MenuItem.objects.all()
    return items

@menu_router.post("/items/", response=MenuItemOut)
def create_menu_item(request, item_data: MenuItemIn):
    """
    إنشاء صنف قائمة جديد.
    """
    category = None
    if item_data.category_id:
        try:
            category = Category.objects.get(id=item_data.category_id)
        except Category.DoesNotExist:
            pass # يمكن إضافة معالجة خطأ أفضل هنا

    item = MenuItem.objects.create(
        name=item_data.name,
        description=item_data.description,
        price=item_data.price,
        category=category,
        is_available=item_data.is_available,
        image_url=item_data.image_url
    )
    return item

@menu_router.get("/items/{item_id}/", response=MenuItemOut)
def get_menu_item(request, item_id: int):
    """
    جلب تفاصيل صنف قائمة محدد.
    """
    item = MenuItem.objects.get(id=item_id)
    return item

@menu_router.put("/items/{item_id}/", response=MenuItemOut)
def update_menu_item(request, item_id: int, item_data: MenuItemIn):
    """
    تحديث صنف قائمة موجود.
    """
    item = get_object_or_404(MenuItem, id=item_id)
    
    # تحديث حقل الفئة بشكل خاص
    if item_data.category_id is not None:
        try:
            category = Category.objects.get(id=item_data.category_id)
            item.category = category
        except Category.DoesNotExist:
            item.category = None # أو رفع خطأ
    
    # تحديث باقي الحقول
    for attr, value in item_data.dict(exclude_unset=True).items():
        if attr != 'category_id': # نتجنب تحديث category_id مباشرة
            setattr(item, attr, value)
    
    item.save()
    return item

@menu_router.delete("/items/{item_id}/")
def delete_menu_item(request, item_id: int):
    """
    حذف صنف قائمة محدد.
    """
    item = MenuItem.objects.get(id=item_id)
    item.delete()
    return {"success": True}