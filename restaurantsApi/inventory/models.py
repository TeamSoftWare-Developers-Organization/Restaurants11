from decimal import Decimal
from django.db import models
from menu.models import MenuItem # استيراد موديل صنف القائمة

class Ingredient(models.Model):
    # ingredient_id (مفتاح أساسي) يتم إنشاؤه تلقائياً بواسطة Django كـ 'id'
    name = models.CharField(max_length=100, unique=True) # اسم المادة (مثلاً: دقيق فاخر)
    current_stock = models.FloatField(default=0.0) # الكمية الحالية (مثلاً: 50.5)
    
    # وحدة القياس: كجم، لتر، قطعة
    UNIT_CHOICES = [
        ('KG', 'كيلوجرام'),
        ('Liter', 'لتر'),
        ('Piece', 'قطعة/وحدة'),
    ]
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='Piece')
    
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00')) # تكلفة الوحدة الواحدة
    reorder_level = models.FloatField(default=0.0) # الحد الأدنى الذي يطلق التنبيه
    image = models.ImageField(upload_to='inventory_images/', null=True, blank=True) # حقل الصورة
    last_updated = models.DateTimeField(auto_now=True) # متى تم آخر تحديث

    class Meta:
        verbose_name = "مكون"
        verbose_name_plural = "المخزون (المكونات)"
        ordering = ['name']

    def get_unit_display(self) -> str:
        return dict(self.UNIT_CHOICES).get(self.unit, self.unit)

    def __str__(self):
        return f"{self.name} ({self.current_stock} {self.get_unit_display()})"

class RecipeIngredient(models.Model):
    # لا يوجد مفتاح أساسي خاص، المفتاح الأساسي هو مركب من item و ingredient
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='recipes_using_this')
    quantity_needed = models.DecimalField(max_digits=10, decimal_places=2) # كمية المكون اللازمة لهذا الصنف

    class Meta:
        verbose_name = "مكون وصفة"
        verbose_name_plural = "مكونات الوصفات"
        # ضمان أن كل زوج (صنف، مكون) فريد، أي لا يمكن لنفس الصنف أن يتطلب نفس المكون مرتين في الوصفة
        unique_together = ('menu_item', 'ingredient')

    def __str__(self):
        return f"{self.menu_item.name} يتطلب {self.quantity_needed} {self.ingredient.get_unit_display()} من {self.ingredient.name}"

    @classmethod
    def deduct_stock_for_item(cls, menu_item, quantity):
        """
        خصم الكميات من المخزون بناءً على وصفة الصنف.
        """
        recipes = cls.objects.filter(menu_item=menu_item)
        for recipe in recipes:
            ingredient = recipe.ingredient
            reduction = float(recipe.quantity_needed) * quantity
            ingredient.current_stock -= reduction
            ingredient.save()