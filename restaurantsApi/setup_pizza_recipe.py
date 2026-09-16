import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()

from menu.models import MenuItem
from inventory.models import Ingredient, RecipeIngredient

# 1. ابحث عن صنف البيتزا
pizza = MenuItem.objects.filter(name__icontains='بيتزا').first()

if not pizza:
    print("خطأ: لم يتم العثور على صنف باسم 'بيتزا' في قائمة الطعام.")
else:
    print(f"تم العثور على: {pizza.name}")
    
    # 2. ابحث عن المكونات
    flour = Ingredient.objects.filter(name__icontains='دقيق').first()
    cheese = Ingredient.objects.filter(name__icontains='جبن').first()
    tomato = Ingredient.objects.filter(name__icontains='طماطم').first()
    
    if flour and cheese and tomato:
        # 3. إنشاء الوصفة (مثال: البيتزا الواحدة تستهلك 0.5 كجم دقيق، 0.2 كجم جبن، 0.1 كجم طماطم)
        RecipeIngredient.objects.get_or_create(menu_item=pizza, ingredient=flour, defaults={'quantity_needed': 0.5})
        RecipeIngredient.objects.get_or_create(menu_item=pizza, ingredient=cheese, defaults={'quantity_needed': 0.2})
        RecipeIngredient.objects.get_or_create(menu_item=pizza, ingredient=tomato, defaults={'quantity_needed': 0.1})
        
        print(f"تم بنجاح تعريف وصفة لـ {pizza.name}:")
        print(f"- {flour.name}: 0.5 {flour.unit}")
        print(f"- {cheese.name}: 0.2 {cheese.unit}")
        print(f"- {tomato.name}: 0.1 {tomato.unit}")
        print("\nالآن عند بيع بيتزا جديدة، سيتم خصم هذه الكميات تلقائياً.")
    else:
        print("خطأ: تأكد من وجود المكونات (دقيق، جبن، طماطم) في المخزون أولاً.")
