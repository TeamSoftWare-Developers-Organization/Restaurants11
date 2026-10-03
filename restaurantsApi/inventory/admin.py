from django.contrib import admin
from .models import (
    Ingredient,
    RecipeIngredient,
    Supplier,
    PurchaseInvoice,
    PurchaseInvoiceItem,
    PurchaseReturn,
    PurchaseReturnItem
)

admin.site.register(Ingredient)
admin.site.register(RecipeIngredient)
admin.site.register(Supplier)
admin.site.register(PurchaseInvoice)
admin.site.register(PurchaseInvoiceItem)
admin.site.register(PurchaseReturn)
admin.site.register(PurchaseReturnItem)
