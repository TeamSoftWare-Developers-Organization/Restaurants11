import api from '@/lib/api';

export interface UserPermissions {
    dashboard?: boolean;
    pos?: boolean;
    orders?: boolean;
    tables?: boolean;
    reservations?: boolean;
    menu?: boolean;
    recipes?: boolean;
    inventory?: boolean;
    payments?: boolean;
    treasury?: boolean;
    expenses?: boolean;
    salaries?: boolean;
    employees?: boolean;
    settings?: boolean;
    [key: string]: boolean | undefined;
}

export interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
    phone_number?: string;
    hire_date: string;
    username: string;
    permissions?: UserPermissions;
    has_fingerprint?: boolean;
}

export const AVAILABLE_PERMISSIONS = [
    { key: 'dashboard', label: 'لوحة التحكم', description: 'عرض مؤشرات المبيعات والإحصائيات الرئيسية', group: 'عام' },
    { key: 'pos', label: 'نقطة البيع (POS)', description: 'تسجيل الطلبات، الفواتير السريعة، وطباعة الشيكات', group: 'المبيعات' },
    { key: 'orders', label: 'إدارة الطلبات', description: 'متابعة وتعديل حالات الطلبات اليومية', group: 'المبيعات' },
    { key: 'tables', label: 'إدارة الطاولات', description: 'توزيع وتعيين وحالات الطاولات في الصالة', group: 'الصالة' },
    { key: 'reservations', label: 'الحجوزات', description: 'إضافة ومتابعة حجوزات الطاولات والعملاء', group: 'الصالة' },
    { key: 'menu', label: 'قائمة الطعام', description: 'إضافة وتعديل أسعار وأصناف الوجبات', group: 'القائمة والإنتاج' },
    { key: 'recipes', label: 'تحضير الوصفات', description: 'حساب تكلفة الوجبات وتحديد نسب الربح', group: 'القائمة والإنتاج' },
    { key: 'inventory', label: 'المخزون والمستودع', description: 'إدارة المواد الخام وتتبع الكميات وتوريدها', group: 'المخزون' },
    { key: 'payments', label: 'المدفوعات والورديات', description: 'إدارة عمليات الدفع وفتح/إغلاق الوردية', group: 'المالية' },
    { key: 'treasury', label: 'الخزينة والحسابات', description: 'حركات الإيداع والسحب والسيولة النقدية', group: 'المالية' },
    { key: 'expenses', label: 'المصروفات', description: 'تسجيل وتصنيف المصروفات التشغيلية', group: 'المالية' },
    { key: 'salaries', label: 'المرتبات والسلف', description: 'إدارة رواتب الموظفين والسلف المالية', group: 'المالية' },
    { key: 'employees', label: 'الموظفون والصلاحيات', description: 'إدارة المستخدمين ومنح وتعديل الصلاحيات', group: 'الإدارة' },
    { key: 'settings', label: 'إعدادات النظام', description: 'إعدادات المطعم، الضرائب، ومعلومات الفاتورة', group: 'الإدارة' },
];

export const employeeService = {
    getEmployees: async (): Promise<Employee[]> => {
        const response = await api.get('/employees/');
        return response.data;
    },
    createEmployee: async (data: any): Promise<Employee> => {
        const response = await api.post('/employees/', data);
        return response.data;
    },
    updateEmployee: async (id: number, data: any): Promise<Employee> => {
        const response = await api.put(`/employees/${id}/`, data);
        return response.data;
    },
    updateEmployeePermissions: async (id: number, permissions: UserPermissions): Promise<Employee> => {
        const response = await api.put(`/employees/${id}/permissions/`, { permissions });
        return response.data;
    },
    deleteEmployee: async (id: number): Promise<void> => {
        await api.delete(`/employees/${id}/`);
    }
};
