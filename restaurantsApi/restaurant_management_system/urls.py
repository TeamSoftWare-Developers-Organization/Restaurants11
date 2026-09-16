# restaurant_management_system/urls.py

from django.contrib import admin
from django.urls import path 
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from ninja import NinjaAPI 
# استيراد الـ routers من تطبيقاتنا
from employees.api import employee_router
from auth.api import auth_router
from orders.api import order_router
from menu.api import menu_router
from inventory.api import inventory_router
from reservations.api import reservations_router
from payments.api import payments_router
from core.api import core_router

from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController

# إنشاء كائن NinjaExtraAPI لدعم JWT
api = NinjaExtraAPI(title="Restaurant Management System API",
    description="API للتعامل مع نظام إدارة المطاعم",
    version="1.0.0",)

# Registering controllers/routers
api.register_controllers(NinjaJWTDefaultController) # المسار سيكون /api/token/
api.add_router("/employees", employee_router)
api.add_router("/auth", auth_router)
api.add_router("/orders", order_router)
api.add_router("/menu", menu_router)
api.add_router("/inventory", inventory_router)
api.add_router("/reservations", reservations_router)
api.add_router("/payments", payments_router)
api.add_router("/settings", core_router)

# مثال:
# @api.get("/hello")
# def hello(request):
#     return {"message": "Hello from Django Ninja!"}

# دالة الصفحة الرئيسية
def home(request):
    html = """
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>نظام إدارة المطاعم</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0;
                padding: 20px;
            }
            .container {
                background: white;
                padding: 3rem;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 600px;
            }
            h1 {
                color: #667eea;
                margin-bottom: 1rem;
                font-size: 2.5rem;
            }
            p {
                color: #666;
                margin-bottom: 2rem;
                font-size: 1.1rem;
            }
            .links {
                display: flex;
                gap: 1rem;
                justify-content: center;
                flex-wrap: wrap;
            }
            a {
                display: inline-block;
                padding: 15px 30px;
                background: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            a:hover {
                background: #764ba2;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            .api-link {
                background: #48bb78;
            }
            .api-link:hover {
                background: #38a169;
            }
            .frontend-link {
                background: #ed8936;
            }
            .frontend-link:hover {
                background: #dd6b20;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>مرحباً بك في نظام إدارة المطاعم</h1>
            <p>الخادم يعمل بنجاح! اختر أحد الخيارات التالية:</p>
            <div class="links">
                <a href="/admin/">لوحة الإدارة</a>
                <a href="/api/docs" class="api-link">واجهة API</a>
                <a href="http://localhost:3002" class="frontend-link">الواجهة الأمامية</a>
            </div>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html)

urlpatterns = [
    path('', home, name='home'),  # الصفحة الرئيسية
    path('admin/', admin.site.urls),
    path('api/', api.urls), # هذا هو المسار الذي سيستضيف جميع واجهات برمجة التطبيقات الخاصة بك
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)