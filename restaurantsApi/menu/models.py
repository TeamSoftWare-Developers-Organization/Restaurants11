from django.db import models

class Category(models.Model):
    # category_id (مفتاح أساسي) يتم إنشاؤه تلقائياً بواسطة Django كـ 'id'
    name = models.CharField(max_length=100, unique=True) # اسم الفئة (مثال: مقبلات، أطباق رئيسية)

    class Meta:
        verbose_name = "فئة"
        verbose_name_plural = "فئات"
        ordering = ['name'] # ترتيب الفئات أبجدياً افتراضياً

    def __str__(self):
        return self.name

class MenuItem(models.Model):
    # item_id (مفتاح أساسي) يتم إنشاؤه تلقائياً بواسطة Django كـ 'id'
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True) # وصف طويل اختياري
    price = models.DecimalField(max_digits=10, decimal_places=2) # سعر الصنف (مثال: 12.99)
    # مفتاح خارجي يربط الصنف بفئته
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='menu_items')
    is_available = models.BooleanField(default=True) # هل الصنف متاح حالياً للطلب؟
    image_url = models.URLField(max_length=500, blank=True, null=True) # لتخزين رابط الصورة (أو مسارها)

    class Meta:
        verbose_name = "صنف قائمة"
        verbose_name_plural = "أصناف القائمة"
        ordering = ['name'] # ترتيب الأصناف أبجدياً افتراضياً

    def __str__(self):
        return self.name