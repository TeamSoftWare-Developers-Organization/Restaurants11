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


class Stocktake(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'مسودة'),
        ('APPLIED', 'معتمد وتمت التسوية'),
        ('CANCELLED', 'ملغى'),
    ]
    reference_number = models.CharField(max_length=50, unique=True, verbose_name="رقم إذن الجرد")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")
    applied_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الاعتماد والتسوية")
    performed_by = models.CharField(max_length=150, default="المدير", verbose_name="المسؤول عن الجرد")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT', verbose_name="حالة الجرد")
    notes = models.TextField(null=True, blank=True, verbose_name="ملاحظات")
    total_system_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="قيمة المخزون الدفتري")
    total_actual_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="قيمة المخزون الفعلي")
    net_variance_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="صافي الفارق المالي")
    total_items_counted = models.IntegerField(default=0, verbose_name="عدد الأصناف المجرودة")
    items_with_shortage = models.IntegerField(default=0, verbose_name="أصناف بها عجز")
    items_with_surplus = models.IntegerField(default=0, verbose_name="أصناف بها زيادة")
    items_matched = models.IntegerField(default=0, verbose_name="أصناف متطابقة")

    class Meta:
        verbose_name = "إذن جرد"
        verbose_name_plural = "أذونات جرد المنتجات والمخزون"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference_number} - {self.get_status_display()}"


class StocktakeItem(models.Model):
    STATUS_CHOICES = [
        ('MATCHED', 'مطابق'),
        ('SHORTAGE', 'عجز'),
        ('SURPLUS', 'زيادة'),
    ]
    stocktake = models.ForeignKey(Stocktake, on_delete=models.CASCADE, related_name='items')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT, related_name='stocktake_entries')
    system_stock = models.FloatField(verbose_name="الرصيد الدفتري المسجل")
    actual_stock = models.FloatField(verbose_name="الرصيد الفعلي بعد العد")
    difference = models.FloatField(verbose_name="الفارق في الكمية")
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), verbose_name="تكلفة الوحدة")
    variance_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="القيمة المالية للفارق")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='MATCHED', verbose_name="حالة البند")
    notes = models.CharField(max_length=255, null=True, blank=True, verbose_name="ملاحظات البند")

    class Meta:
        verbose_name = "بند إذن جرد"
        verbose_name_plural = "بنود أذونات الجرد"
        ordering = ['id']


class PurchaseReturn(models.Model):
    STATUS_CHOICES = [
        ('COMPLETED', 'مكتمل وتم الخصم من المخزون'),
        ('CANCELLED', 'ملغى'),
    ]
    REFUND_METHOD_CHOICES = [
        ('DEBT_REDUCTION', 'خصم من رصيد ومستحقات المورد'),
        ('CASH', 'استرداد نقدي (كاش)'),
    ]

    return_number = models.CharField(max_length=50, unique=True, verbose_name="رقم إذن المرتجع")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="returns", verbose_name="المورد")
    invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.SET_NULL, null=True, blank=True, related_name="returns", verbose_name="فاتورة الشراء المرجعية")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="إجمالي قيمة المرتجع")
    refund_method = models.CharField(max_length=20, choices=REFUND_METHOD_CHOICES, default='DEBT_REDUCTION', verbose_name="طريقة استرداد القيمة")
    reason = models.CharField(max_length=255, default='تالف أو غير مطابق للمواصفات', verbose_name="سبب الإرجاع")
    notes = models.TextField(blank=True, null=True, verbose_name="ملاحظات إضافية")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='COMPLETED', verbose_name="حالة المرتجع")
    return_date = models.DateField(default=timezone.now, verbose_name="تاريخ المرتجع")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="وقت الإنشاء")

    class Meta:
        verbose_name = "مرتجع شراء"
        verbose_name_plural = "مرتجعات الشراء"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.return_number} - {self.supplier.name}"


class PurchaseReturnItem(models.Model):
    purchase_return = models.ForeignKey(PurchaseReturn, on_delete=models.CASCADE, related_name="items", verbose_name="إذن المرتجع")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT, related_name="return_items", verbose_name="المادة الخام")
    quantity = models.FloatField(verbose_name="الكمية المرتجعة")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="سعر وحدة الإرجاع")
    total_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="الإجمالي")
    reason = models.CharField(max_length=255, blank=True, null=True, verbose_name="سبب إرجاع الصنف")

    def save(self, *args, **kwargs):
        self.total_price = Decimal(str(round(float(self.quantity) * float(self.unit_price), 2)))
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "بند مرتجع شراء"
        verbose_name_plural = "بنود مرتجعات الشراء"
        ordering = ['id']
