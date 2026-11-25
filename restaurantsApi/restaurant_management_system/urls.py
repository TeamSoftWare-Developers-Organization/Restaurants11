# restaurant_management_system/urls.py

from django.contrib import admin
from django.urls import path, re_path
from django.views.static import serve
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from ninja import NinjaAPI 
# استيراد الـ routers من تطبيقاتنا
from employees.api import employee_router
from employees.attendance_api import attendance_router
from auth.api import auth_router
from orders.api import order_router
from menu.api import menu_router
from inventory.api import inventory_router, purchases_router
from reservations.api import reservations_router
from payments.api import payments_router
from payments.shifts_api import shifts_router
from core.api import core_router, executive_router, license_router
from core.zakat_api import zakat_router
from ml_services.api import ai_router

from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController

# إنشاء كائن NinjaExtraAPI لدعم JWT
api = NinjaExtraAPI(
    title="RestoSystem API",
    description="واجهة برمجة تطبيقات نظام RestoSystem - تطوير فريق TechTwo",
    version="2.0.0",
)

@api.get("/health", auth=None)
def health_check(request):
    return {"status": "ok", "app": "RestoSystem", "team": "TechTwo"}

def add_router_safe(prefix, router_obj):
    if router_obj is not None:
        router_obj.api = None
        for _, sub in getattr(router_obj, '_routers', []):
            sub.api = None
        api.add_router(prefix, router_obj)

# Registering controllers/routers
api.register_controllers(NinjaJWTDefaultController) # المسار سيكون /api/token/
add_router_safe("", purchases_router)
add_router_safe("/employees", employee_router)
add_router_safe("/attendance", attendance_router)
add_router_safe("/auth", auth_router)
add_router_safe("/orders", order_router)
add_router_safe("/menu", menu_router)
add_router_safe("/inventory", inventory_router)
add_router_safe("/reservations", reservations_router)
add_router_safe("/payments", payments_router)
add_router_safe("/shifts", shifts_router)
add_router_safe("/settings", core_router)
add_router_safe("/core", executive_router)
add_router_safe("/core/license", license_router)
add_router_safe("/zakat", zakat_router)
add_router_safe("/ai", ai_router)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
]

def serve_frontend(request, path=""):
    dist_dir = getattr(settings, 'FRONTEND_DIST', None)
    if not dist_dir or not dist_dir.exists():
        return redirect('/api/docs')
    
    clean_path = path.strip("/\\")
    
    if not clean_path:
        return serve(request, "index.html", document_root=str(dist_dir))
    
    target_file = dist_dir / clean_path
    if target_file.is_file():
        return serve(request, clean_path, document_root=str(dist_dir))
        
    target_dir_index = dist_dir / clean_path / "index.html"
    if target_dir_index.is_file():
        return serve(request, f"{clean_path}/index.html", document_root=str(dist_dir))
        
    target_html = dist_dir / f"{clean_path}.html"
    if target_html.is_file():
        return serve(request, f"{clean_path}.html", document_root=str(dist_dir))
        
    root_index = dist_dir / "index.html"
    if root_index.exists():
        return serve(request, "index.html", document_root=str(dist_dir))
        
    return redirect('/api/docs')

if getattr(settings, 'FRONTEND_DIST', None) and settings.FRONTEND_DIST.exists():
    urlpatterns += [
        re_path(r'^_next/(?P<path>.*)$', serve, {'document_root': str(settings.FRONTEND_DIST / '_next')}),
        re_path(r'^(?!api/|admin/|media/|static/).*$', serve_frontend),
    ]
else:
    urlpatterns += [
        path('', lambda request: redirect('/api/docs'), name='root_redirect'),
    ]

def serve_media_fallback(request, path=""):
    """خدمة ملفات الوسائط مع فحص المسارات البديلة وضمان إرجاع الصور في بيئات سطح المكتب والإنتاج"""
    from pathlib import Path
    import sys
    import shutil

    clean_path = path.strip("/\\")
    media_root = Path(settings.MEDIA_ROOT)
    target = media_root / clean_path

    if target.is_file():
        return serve(request, clean_path, document_root=str(media_root))

    # فحص مسارات البدائل في حال لم تكن الصورة منسوخة بعد في AppData
    candidate_roots = [
        settings.BASE_DIR / "media",
        Path(sys.executable).parent / "media" if getattr(sys, 'frozen', False) else None,
        Path(getattr(sys, '_MEIPASS', '')) / "media" if getattr(sys, 'frozen', False) else None,
        Path(getattr(sys, '_MEIPASS', '')) / "restaurantsApi" / "media" if getattr(sys, 'frozen', False) else None,
        Path(r"E:\restaurants\restaurantsApi\media"),
    ]

    for c_root in candidate_roots:
        if c_root and (c_root / clean_path).is_file():
            # نسخ الملف إلى MEDIA_ROOT للاستدعاءات اللاحقة
            try:
                dest = media_root / clean_path
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(c_root / clean_path, dest)
            except Exception:
                pass
            return serve(request, clean_path, document_root=str(c_root))

    return serve(request, clean_path, document_root=str(media_root))

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve_media_fallback),
]
