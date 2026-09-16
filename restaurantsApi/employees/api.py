# employees/api.py

from ninja import Router, Schema
from typing import List, Optional
from .models import Employee
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import transaction

# إنشاء موجه (Router) خاص بتطبيق employees
employee_router = Router(tags=["الموظفون"])

# 1. تعريف المخططات (Schemas) لمدخلات ومخرجات البيانات
# Schema لإدخال بيانات موظف جديد (لا يشمل id، وتوقع كلمة مرور نصية)
class EmployeeIn(Schema):
    first_name: str
    last_name: str
    role: str # يمكنك إضافة تحقق هنا لضمان أنها من الخيارات المتاحة
    phone_number: Optional[str] = None # Optional تعني أنه يمكن أن يكون فارغاً
    username: str
    password: Optional[str] = None # ستتم معالجتها لتشفيرها قبل الحفظ
    permissions: Optional[dict] = None

class EmployeePermissionsIn(Schema):
    permissions: dict

# Schema لإخراج بيانات الموظف (يشمل id، ولا يعرض كلمة المرور)
class EmployeeOut(Schema):
    id: int # Django يضيف حقل 'id' تلقائياً كمفتاح أساسي
    first_name: str
    last_name: str
    role: str
    phone_number: Optional[str] = None
    hire_date: str # يمكن تحويله إلى str لسهولة العرض في API
    username: str
    permissions: Optional[dict] = None

    @staticmethod
    def resolve_first_name(obj):
        if not obj.user: return ""
        return obj.user.first_name

    @staticmethod
    def resolve_last_name(obj):
        if not obj.user: return ""
        return obj.user.last_name

    @staticmethod
    def resolve_username(obj):
        if not obj.user: return ""
        return obj.user.username

    @staticmethod
    def resolve_permissions(obj):
        return obj.get_effective_permissions()

    @staticmethod
    def resolve_hire_date(obj):
        """Convert date object to ISO format string"""
        if obj.hire_date:
            return obj.hire_date.isoformat()  # Returns "YYYY-MM-DD" format
        return None

# 2. تعريف نقاط نهاية API

@employee_router.get("/", response=List[EmployeeOut])
def list_employees(request):
    """
    جلب قائمة بجميع الموظفين.
    """
    employees = Employee.objects.all()
    return employees

@employee_router.post("/", response={200: EmployeeOut, 400: dict})
def create_employee(request, employee_data: EmployeeIn):
    """
    إنشاء موظف جديد.
    """
    try:
        with transaction.atomic():
            if User.objects.filter(username=employee_data.username).exists():
                return 400, {"message": "اسم المستخدم مستخدم بالفعل"}

            # 1. Create User
            user = User.objects.create_user(
                username=employee_data.username,
                password=employee_data.password,
                first_name=employee_data.first_name,
                last_name=employee_data.last_name
            )

            # 2. Create Employee Profile
            employee = Employee.objects.create(
                user=user,
                role=employee_data.role,
                phone_number=employee_data.phone_number,
                permissions=employee_data.permissions or {}
            )
            return 200, employee
            
    except Exception as e:
        return 400, {"message": str(e)}

@employee_router.put("/{employee_id}/", response={200: EmployeeOut, 400: dict})
def update_employee(request, employee_id: int, employee_data: EmployeeIn):
    """
    تحديث بيانات موظف.
    """
    employee = get_object_or_404(Employee, id=employee_id)
    try:
        with transaction.atomic():
            user = employee.user
            user.first_name = employee_data.first_name
            user.last_name = employee_data.last_name
            user.username = employee_data.username
            if employee_data.password:
                user.set_password(employee_data.password)
            user.save()

            employee.role = employee_data.role
            employee.phone_number = employee_data.phone_number
            if employee_data.permissions is not None:
                employee.permissions = employee_data.permissions
            employee.save()
            return 200, employee
    except Exception as e:
        return 400, {"message": str(e)}

@employee_router.put("/{employee_id}/permissions/", response={200: EmployeeOut, 400: dict})
def update_employee_permissions(request, employee_id: int, data: EmployeePermissionsIn):
    """
    تحديث صلاحيات الموظف بشكل منفصل.
    """
    employee = get_object_or_404(Employee, id=employee_id)
    try:
        employee.permissions = data.permissions
        employee.save()
        return 200, employee
    except Exception as e:
        return 400, {"message": str(e)}

@employee_router.delete("/{employee_id}/")
def delete_employee(request, employee_id: int):
    """
    حذف موظف.
    """
    employee = get_object_or_404(Employee, id=employee_id)
    if employee.user:
        user = employee.user
        employee.delete()
        user.delete()
    else:
        employee.delete()
    return {"success": True}