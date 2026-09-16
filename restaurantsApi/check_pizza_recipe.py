import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()

from menu.models import MenuItem
from inventory.models import RecipeIngredient

pizza = MenuItem.objects.filter(name__icontains='بيتزا').first()
if pizza:
    print(f"Found Pizza: {pizza.name} (ID: {pizza.id})")
    recipes = RecipeIngredient.objects.filter(menu_item=pizza)
    if recipes.exists():
        print(f"Recipes for {pizza.name}:")
        for r in recipes:
            print(f"- {r.ingredient.name}: {r.quantity_needed} {r.ingredient.unit}")
    else:
        print(f"No recipes found for {pizza.name}.")
else:
    print("Pizza not found in menu items.")
