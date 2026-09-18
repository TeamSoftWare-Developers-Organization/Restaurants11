from decimal import Decimal
from django.db import models
from django.utils import timezone
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


class Supplier(models.Model):
    name = models.CharField(max_length=150, verbose_name="اسم المورد")
    company_name = models.CharField(max_length=150, blank=True, null=True, verbose_name="الشركة")
    phone = models.CharField(max_length=20, verbose_name="رقم الهاتف")
    tax_number = models.CharField(max_length=50, blank=True, null=True, verbose_name="الرقم الضريبي")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), help_text="المستحقات المتبقية للمورد")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "مورد"
        verbose_name_plural = "الموردين"
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class PurchaseInvoice(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'معلقة / مسودة'),
        ('RECEIVED', 'تم الاستلام والترحيل للمخزن'),
        ('CANCELLED', 'ملغاة'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True, verbose_name="رقم الفاتورة")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="invoices")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    invoice_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "فاتورة شراء"
        verbose_name_plural = "فواتير الشراء"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.supplier.name}"


class PurchaseInvoiceItem(models.Model):
    invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.CASCADE, related_name="items")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT, related_name="purchase_items")
    quantity = models.FloatField(verbose_name="الكمية المشتراة")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="سعر شراء الوحدة")
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total_price = Decimal(str(round(float(self.quantity) * float(self.unit_price), 2)))
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "عنصر فاتورة شراء"
        verbose_name_plural = "عناصر فواتير الشراء"