# auth/api.py

from ninja import Router, Schema
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import get_object_or_404
from employees.models import Employee 
from employees.api import EmployeeOut
from django.http import HttpRequest
from django.db import IntegrityError
from django.contrib.auth.models import User
from ninja_jwt.authentication import JWTAuth
from ninja_jwt.tokens import RefreshToken, AccessToken

auth_router = Router(tags=["المصادقة والأمان"])

# 1. المخططات (Schemas)

class LoginIn(Schema):
    username: str = None
    email: str = None
    password: str

class AuthOut(Schema):
    session_id: str
    is_authenticated: bool
    employee_profile: EmployeeOut

class RegisterIn(Schema):
    email: str
    password: str
    first_name: str
    last_name: str
    role: str # 'manager', 'waiter', 'chef', 'cashier'

# 2. نقاط نهاية API

@auth_router.post("/login/", response={200: dict, 401: dict})
def login_user(request: HttpRequest, data: LoginIn):
    """
    تسجيل الدخول باستخدام اسم المستخدم أو البريد الإلكتروني والحصول على توكن JWT.
    """
    identifier = (data.username or data.email or '').strip()
    
    # البحث عن المستخدم بواسطة اسم المستخدم أولاً ثم البريد الإلكتروني
    user = User.objects.filter(username=identifier).first()
    if not user:
        user = User.objects.filter(email=identifier).first()

    if user:
        user_authenticated = authenticate(username=user.username, password=data.password)
        if user_authenticated:
            refresh = RefreshToken.for_user(user_authenticated)
            access = AccessToken.for_user(user_authenticated)
            return {
                'refresh': str(refresh),
                'access': str(access),
            }
    
    return 401, {"message": "بيانات الدخول غير صحيحة. يرجى التأكد من اسم المستخدم وكلمة المرور."}

@auth_router.get("/me/", response={200: AuthOut, 401: dict}, auth=JWTAuth())
def get_me(request):
    """
    الحصول على ملف التعريف الخاص بالمستخدم المصادق عليه بواسطة JWT.
    """
    try:
        employee_profile = Employee.objects.select_related('user').get(user=request.user)
    except Employee.DoesNotExist:
        if request.user.is_superuser or request.user.is_staff or request.user.username == 'admin':
            employee_profile = Employee.objects.create(
                user=request.user,
                role='manager',
                permissions=Employee.get_default_permissions_for_role('manager')
            )
        else:
            return 401, {"message": "لا يوجد ملف موظف مرتبط بهذا المستخدم."}

    return {
        "session_id": "jwt-authenticated", 
        "is_authenticated": True,
        "employee_profile": employee_profile
    }

@auth_router.post("/logout/", response={200: dict})
def user_logout(request: HttpRequest):
    """
    تسجيل خروج المستخدم وإلغاء جلسة العمل.
    """
    logout(request)
    return {"success": True, "message": "تم تسجيل الخروج بنجاح."}

@auth_router.post("/register/", response={200: EmployeeOut, 400: dict})
def register_employee(request: HttpRequest, data: RegisterIn):
    """
    تسجيل موظف جديد (يجب أن يتم بواسطة مدير).
    """
    try:
        if User.objects.filter(email=data.email).exists():
            return 400, {"message": "البريد الإلكتروني موجود بالفعل."}

        # 1. إنشاء كائن المستخدم
        # نستخدم البريد الإلكتروني كاسم مستخدم لضمان التفرد والسهولة
        user = User.objects.create_user(
            username=data.email, 
            email=data.email,
            password=data.password, 
            first_name=data.first_name, 
            last_name=data.last_name
        )
        
        # 2. إنشاء كائن الموظف المرتبط
        employee = Employee.objects.create(
            user=user,
            role=data.role,
        )
        return employee
    except IntegrityError:
        return 400, {"message": "حدث خطأ غير متوقع. قد يكون اسم المستخدم موجوداً."}
    except Exception as e:
        return 400, {"message": str(e)}
