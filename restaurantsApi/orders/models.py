from decimal import Decimal
from django.db import models
from employees.models import Employee # استيراد موديل الموظف
from menu.models import MenuItem     # استيراد موديل صنف القائمة

class Order(models.Model):
    id: int
    # order_id (مفتاح أساسي) يتم إنشاؤه تلقائياً بواسطة Django كـ 'id'
    # مفتاح خارجي يربط الطلب بالموظف الذي قام بإنشائه/أخذه
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders_taken')
    # رقم الطاولة أو نوع الطلب (سفري / محلي / طاولة ...)
    table_number = models.CharField(max_length=50, blank=True, null=True)

    order_date_time = models.DateTimeField(auto_now_add=True) # تاريخ ووقت إنشاء الطلب
    
    # حالات الطلب: قيد التجهيز، جاهز، تم التسليم، مدفوع، ملغى
    STATUS_CHOICES = [
        ('pending', 'قيد التجهيز'),
        ('ready', 'جاهز للتسليم'),
        ('delivered', 'تم التسليم'),
        ('paid', 'مدفوع'),
        ('completed', 'مكتمل'),
        ('cancelled', 'ملغى'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00')) # إجمالي قيمة الطلب
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00')) # قيمة الخصم المطبق

    class Meta:
        verbose_name = "طلب"
        verbose_name_plural = "طلبات"
        ordering = ['-order_date_time'] # ترتيب الطلبات من الأحدث للأقدم

    def __str__(self):
        return f"طلب رقم {self.id} - طاولة {self.table_number or 'N/A'} - {self.get_status_display()}"

    # دالة مساعدة لحساب الإجمالي (يمكن تحديثها عندما يتم إضافة OrderItems)
    def calculate_total(self):
        from decimal import Decimal
        total = sum(item.quantity * item.unit_price for item in self.items.all())
        self.total_amount = Decimal(total) - Decimal(self.discount_amount)
        self.save()


class OrderItem(models.Model):
    # order_item_id (مفتاح أساسي) يتم إنشاؤه تلقائياً بواسطة Django كـ 'id'
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items') # يربط صنف الطلب بالطلب الرئيسي
    menu_item = models.ForeignKey(MenuItem, on_delete=models.SET_NULL, null=True, blank=True) # يربط صنف الطلب بصنف القائمة الفعلي
    quantity = models.PositiveIntegerField(default=1) # كمية الصنف في الطلب
    unit_price = models.DecimalField(max_digits=10, decimal_places=2) # سعر الصنف وقت الطلب (مهم لتاريخية الأسعار)
    notes = models.TextField(blank=True, null=True) # ملاحظات خاصة بالصنف (مثال: بدون بصل)

    class Meta:
        verbose_name = "صنف طلب"
        verbose_name_plural = "أصناف الطلبات"
        # يمكن إضافة unique_together=('order', 'menu_item') لمنع تكرار نفس الصنف في نفس الطلب
        # ولكن يمكن أن يطلب العميل نفس الصنف مرتين مع ملاحظات مختلفة، لذا ربما لا يكون ضرورياً هنا
        
    def __str__(self):
        return f"{self.quantity} x {self.menu_item.name if self.menu_item else 'صنف محذوف'} (طلب {self.order.id})"

    # دالة لحفظ السعر الحالي للصنف عند إضافة OrderItem
    def save(self, *args, **kwargs):
        if not self.unit_price and self.menu_item:
            self.unit_price = self.menu_item.price
        super().save(*args, **kwargs)