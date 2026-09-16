from django.db import models
from orders.models import Order # سنستخدم هذا لاحقاً لربط الطلبات بالطاولات الفعلية

class Table(models.Model):
    # table_id (مفتاح أساسي) يتم إنشاؤه تلقائياً بواسطة Django كـ 'id'
    table_number = models.CharField(max_length=10, unique=True) # رقم/اسم الطاولة (مثال: A1, 5, بار)
    capacity = models.PositiveIntegerField(default=2) # سعة الطاولة (عدد الأشخاص)
    
    # حالات الطاولة: شاغرة، مشغولة، محجوزة، تحتاج تنظيف
    STATUS_CHOICES = [
        ('available', 'شاغرة'),
        ('occupied', 'مشغولة'),
        ('reserved', 'محجوزة'),
        ('cleaning', 'تحتاج تنظيف'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    
    location = models.CharField(max_length=100, blank=True, null=True) # موقع الطاولة (مثال: داخلي، خارجي، شرفة)
    
    # مفتاح خارجي للطلب النشط الحالي على الطاولة
    # هذا يسمح بمعرفة أي طلب مرتبط حالياً بهذه الطاولة (حقل واحد فقط)
    current_order = models.OneToOneField(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='table_assigned_to_current_order'
    )


    class Meta:
        verbose_name = "طاولة"
        verbose_name_plural = "طاولات"
        ordering = ['table_number']

    def __str__(self):
        return f"طاولة {self.table_number} (سعة: {self.capacity})"


class Reservation(models.Model):
    # reservation_id (مفتاح أساسي) يتم إنشاؤه تلقائياً بواسطة Django كـ 'id'
    # مفتاح خارجي يربط الحجز بطاولة معينة
    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')
    
    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=20)
    
    reservation_time = models.DateTimeField() # وقت وتاريخ الحجز المحدد
    number_of_guests = models.PositiveIntegerField(default=1) # عدد الضيوف في الحجز
    
    # حالات الحجز: مؤكد، قيد الانتظار، ملغى، انتهى
    STATUS_CHOICES = [
        ('confirmed', 'مؤكد'),
        ('pending', 'قيد الانتظار'),
        ('cancelled', 'ملغى'),
        ('completed', 'انتهى'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    notes = models.TextField(blank=True, null=True) # أي ملاحظات خاصة بالحجز

    class Meta:
        verbose_name = "حجز"
        verbose_name_plural = "حجوزات"
        ordering = ['reservation_time']

    def __str__(self):
        return f"حجز لـ {self.customer_name} على طاولة {self.table.table_number if self.table else 'غير محددة'} في {self.reservation_time.strftime('%Y-%m-%d %H:%M')}"