import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()

from inventory.models import RecipeIngredient
from menu.models import MenuItem

all_recipes = RecipeIngredient.objects.all()
if all_recipes.exists():
    print("Found Recipes:")
    for r in all_recipes:
        print(f"- Item: {r.menu_item.name}, Ingredient: {r.ingredient.name}, Qty: {r.quantity_needed}")
else:
    print("Zero recipes found in database.")

pizza_items = MenuItem.objects.filter(name__icontains='بيتزا')
for pizza in pizza_items:
    print(f"Pizza: {pizza.name} (ID: {pizza.id})")
