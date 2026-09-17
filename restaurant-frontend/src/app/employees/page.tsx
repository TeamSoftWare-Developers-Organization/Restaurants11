'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Modal } from '@/components';
import {
    Users,
    Plus,
    Search,
    Filter,
    Pencil,
    Trash2,
    Save,
    UserCircle,
    Phone,
    Briefcase,
    Shield,
    ShieldCheck,
    Check,
    X,
    Lock,
    Key,
    RotateCcw
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useRouter } from 'next/navigation';
import { employeeService, Employee, AVAILABLE_PERMISSIONS, UserPermissions } from '@/services/employeeService';

export default function EmployeesPage() {
    const { isSidebarCollapsed } = useUIStore();
    const { isLoggedIn } = useAuthStore();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [employeesData, setEmployeesData] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Active Tab: 'list' for employee cards/table, 'permissions' for interactive permission matrix
    const [activeTab, setActiveTab] = useState<'list' | 'permissions'>('list');

    // Employee Form Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Employee | null>(null);
    const [formData, setFormData] = useState<any>({
        first_name: '',
        last_name: '',
        role: 'waiter',
        phone_number: '',
        username: '',
        password: ''
    });

    // Permission Edit Modal
    const [isPermModalOpen, setIsPermModalOpen] = useState(false);
    const [selectedEmployeeForPerms, setSelectedEmployeeForPerms] = useState<Employee | null>(null);
    const [tempPermissions, setTempPermissions] = useState<UserPermissions>({});
    const [isSavingPerms, setIsSavingPerms] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (!isLoggedIn) {
            router.push('/login');
        } else {
            fetchEmployees();
        }
    }, [isLoggedIn, router]);

    const fetchEmployees = async () => {
        try {
            setIsLoading(true);
            const data = await employeeService.getEmployees();
            setEmployeesData(data);
        } catch (err) {
            console.error('Fetch employees failed', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (item?: Employee) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                first_name: item.first_name,
                last_name: item.last_name,
                role: item.role,
                phone_number: item.phone_number || '',
                username: item.username,
                password: '' // Don't show password
            });
        } else {
            setEditingItem(null);
            setFormData({
                first_name: '',
                last_name: '',
                role: 'waiter',
                phone_number: '',
                username: '',
                password: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                // If password is empty, don't update it
                const updateData = { ...formData };
                if (!updateData.password) delete updateData.password;
                await employeeService.updateEmployee(editingItem.id, updateData);
            } else {
                await employeeService.createEmployee(formData);
            }
            setIsModalOpen(false);
            fetchEmployees();
        } catch (err) {
            console.error('Save failed', err);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
            try {
                await employeeService.deleteEmployee(id);
                fetchEmployees();
            } catch (err) {
                console.error('Delete failed', err);
            }
        }
    };

    // Open Permissions Modal for an employee
    const handleOpenPermissionsModal = (emp: Employee) => {
        setSelectedEmployeeForPerms(emp);
        setTempPermissions({ ...(emp.permissions || {}) });
        setIsPermModalOpen(true);
    };

    // Toggle specific permission
    const handleTogglePermission = (key: string) => {
        setTempPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Select all or deselect all
    const handleSetAllPermissions = (enable: boolean) => {
        const updated: UserPermissions = {};
        AVAILABLE_PERMISSIONS.forEach(p => {
            updated[p.key] = enable;
        });
        setTempPermissions(updated);
    };

    // Save updated permissions
    const handleSavePermissions = async () => {
        if (!selectedEmployeeForPerms) return;
        try {
            setIsSavingPerms(true);
            await employeeService.updateEmployeePermissions(selectedEmployeeForPerms.id, tempPermissions);
            setIsPermModalOpen(false);
            fetchEmployees();
        } catch (err) {
            console.error('Failed to update permissions', err);
            alert('حدث خطأ أثناء حفظ الصلاحيات');
        } finally {
            setIsSavingPerms(false);
        }
    };

    const filteredEmployees = employeesData.filter(emp =>
        emp.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone_number?.includes(searchQuery)
    );

    const getRoleName = (role: string) => {
        switch (role) {
            case 'manager': return 'مدير النظام';
            case 'cashier': return 'كاشير';
            case 'waiter': return 'نادل';
            case 'chef': return 'طاهٍ';
            default: return role;
        }
    };

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'manager': return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40';
            case 'cashier': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
            case 'waiter': return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/40';
            case 'chef': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40';
            default: return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
        }
    };

    if (!isClient || !isLoggedIn) return null;

    return (
        <div className="flex bg-background dark:bg-background min-h-screen transition-colors duration-300" dir="rtl">
            <Sidebar />

            <main className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-4 md:p-8 transition-all duration-300`}>
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/10 border border-blue-500/20">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">
                                إدارة المستخدمين والصلاحيات
                            </h1>
                            <p className="text-gray-400 dark:text-gray-500 text-xs md:text-sm font-bold opacity-80">
                                تعيين حسابات فريق العمل وتحديد صلاحيات الوصول لكل شاشة في النظام
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Tab Switcher */}
                        <div className="bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl flex items-center gap-1 border border-gray-200/50 dark:border-gray-700/40">
                            <button
                                type="button"
                                onClick={() => setActiveTab('list')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                                    activeTab === 'list'
                                        ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                قائمة المستخدمين
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('permissions')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                                    activeTab === 'permissions'
                                        ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Shield className="w-3.5 h-3.5" />
                                مصفوفة الصلاحيات
                            </button>
                        </div>

                        <button
                            onClick={() => handleOpenModal()}
                            className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/15 active:scale-95 transition-all font-black text-xs"
                        >
                            <Plus className="w-4 h-4" />
                            مستخدم جديد
                        </button>
                    </div>
                </header>

                {/* Tab 1: Employee List */}
                {activeTab === 'list' && (
                    <section className="bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-50 dark:border-gray-800/30 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="relative w-full md:w-80 group">
                                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="بحث بالاسم أو اسم المستخدم..."
                                    className="w-full h-10 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100/50 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-600/10 rounded-xl pr-10 pl-4 text-xs font-bold transition-all outline-none"
                                />
                            </div>

                            <span className="text-xs font-bold text-gray-400">
                                إجمالي المستخدمين: <span className="font-black text-gray-700 dark:text-gray-200">{filteredEmployees.length}</span>
                            </span>
                        </div>

                        <div className="overflow-x-auto text-sm">
                            <table className="w-full text-right" dir="rtl">
                                <thead>
                                    <tr className="bg-gray-50/40 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-800/40">
                                        <th className="px-6 py-4 text-gray-400 font-black text-[11px] uppercase tracking-widest">المستخدم</th>
                                        <th className="px-6 py-4 text-gray-400 font-black text-[11px] uppercase tracking-widest">الدور الوظيفي</th>
                                        <th className="px-6 py-4 text-gray-400 font-black text-[11px] uppercase tracking-widest">الهاتف</th>
                                        <th className="px-6 py-4 text-gray-400 font-black text-[11px] uppercase tracking-widest">الصلاحيات الممنوحة</th>
                                        <th className="px-6 py-4 text-gray-400 font-black text-[11px] uppercase tracking-widest text-center">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold italic">جاري التحميل...</td></tr>
                                    ) : filteredEmployees.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold">لا يوجد مستخدمون مطابقون.</td></tr>
                                    ) : filteredEmployees.map((employee) => {
                                        const grantedCount = Object.values(employee.permissions || {}).filter(Boolean).length;

                                        return (
                                            <tr key={employee.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/20 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-gray-900 dark:text-gray-200">
                                                        {employee.first_name} {employee.last_name}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-bold opacity-70">
                                                        @{employee.username}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border ${getRoleBadgeStyle(employee.role)}`}>
                                                        {getRoleName(employee.role)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-black text-gray-700 dark:text-gray-300 tabular-nums text-xs">
                                                    {employee.phone_number || '---'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenPermissionsModal(employee)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100/70 transition-all"
                                                    >
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                        <span>{grantedCount} من {AVAILABLE_PERMISSIONS.length} أقسام</span>
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center items-center gap-2">
                                                        <button
                                                            onClick={() => handleOpenPermissionsModal(employee)}
                                                            title="تعديل الصلاحيات"
                                                            className="p-2 bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:scale-105 transition-all border border-indigo-100 dark:border-indigo-900/30"
                                                        >
                                                            <Key className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenModal(employee)}
                                                            title="تعديل البيانات"
                                                            className="p-2 bg-blue-50/60 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl hover:scale-105 transition-all border border-blue-100 dark:border-blue-900/30"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(employee.id)}
                                                            title="حذف"
                                                            className="p-2 bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl hover:scale-105 transition-all border border-rose-100 dark:border-rose-900/30"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Tab 2: Interactive Permissions Matrix */}
                {activeTab === 'permissions' && (
                    <section className="space-y-4">
                        <div className="bg-card dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    مصفوفة الصلاحيات الشاملة
                                </h3>
                                <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                                    نظرة عامة على الشاشات والوظائف المتاحة لكل موظف، مع إمكانية تعديل صلاحيات أي موظف فوراً.
                                </p>
                            </div>
                        </div>

                        <div className="bg-card dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/40 overflow-x-auto">
                            <table className="w-full text-right text-xs" dir="rtl">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
                                        <th className="p-4 font-black text-gray-700 dark:text-gray-300 min-w-[160px]">المستخدم</th>
                                        <th className="p-4 font-black text-gray-700 dark:text-gray-300 min-w-[100px]">الدور</th>
                                        {AVAILABLE_PERMISSIONS.map(p => (
                                            <th key={p.key} className="p-3 text-center font-black text-gray-500 dark:text-gray-400 min-w-[90px] whitespace-nowrap">
                                                {p.label}
                                            </th>
                                        ))}
                                        <th className="p-4 text-center font-black text-gray-700 dark:text-gray-300 min-w-[80px]">تعديل</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                                    {employeesData.map(emp => (
                                        <tr key={emp.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/20">
                                            <td className="p-4">
                                                <div className="font-black text-gray-900 dark:text-gray-100">{emp.first_name} {emp.last_name}</div>
                                                <div className="text-[10px] text-gray-400 font-bold">@{emp.username}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getRoleBadgeStyle(emp.role)}`}>
                                                    {getRoleName(emp.role)}
                                                </span>
                                            </td>
                                            {AVAILABLE_PERMISSIONS.map(p => {
                                                const hasPerm = emp.role === 'manager' || !!(emp.permissions && emp.permissions[p.key]);
                                                return (
                                                    <td key={p.key} className="p-3 text-center">
                                                        {hasPerm ? (
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800/40">
                                                                <Check className="w-3.5 h-3.5" />
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-800/40 text-gray-300 dark:text-gray-600">
                                                                <X className="w-3.5 h-3.5" />
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleOpenPermissionsModal(emp)}
                                                    className="p-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                                    title="تعديل صلاحيات هذا الموظف"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </main>

            {/* Permissions Modal */}
            <Modal
                isOpen={isPermModalOpen}
                onClose={() => setIsPermModalOpen(false)}
                title={`صلاحيات المستخدم: ${selectedEmployeeForPerms?.first_name} ${selectedEmployeeForPerms?.last_name}`}
            >
                <div className="space-y-4">
                    {/* User Info & Quick Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                        <div>
                            <span className="text-xs font-black text-gray-900 dark:text-white block">
                                الدور الحالي: {getRoleName(selectedEmployeeForPerms?.role || '')}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                                حدد الشاشات والوظائف التي يُسمح لهذا المستخدم بدخولها والعمل عليها
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => handleSetAllPermissions(true)}
                                className="px-2.5 py-1 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-[10px] font-black hover:bg-blue-50 transition-all"
                            >
                                منح الكل
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetAllPermissions(false)}
                                className="px-2.5 py-1 bg-white dark:bg-gray-900 text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-black hover:bg-gray-50 transition-all"
                            >
                                إلغاء الكل
                            </button>
                        </div>
                    </div>

                    {/* Permissions Checklist Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto p-1">
                        {AVAILABLE_PERMISSIONS.map((perm) => {
                            const isChecked = !!tempPermissions[perm.key];

                            return (
                                <div
                                    key={perm.key}
                                    onClick={() => handleTogglePermission(perm.key)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                                        isChecked
                                            ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-xs'
                                            : 'bg-gray-50/30 dark:bg-gray-900/20 border-gray-200/60 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-black text-gray-900 dark:text-gray-100">
                                                {perm.label}
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                                                {perm.group}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5 line-clamp-1">
                                            {perm.description}
                                        </p>
                                    </div>

                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                                        isChecked
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'
                                    }`}>
                                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                        <button
                            type="button"
                            disabled={isSavingPerms}
                            onClick={handleSavePermissions}
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Save className="w-4 h-4" />
                            {isSavingPerms ? 'جاري حفظ الصلاحيات...' : 'حفظ واعتماد الصلاحيات'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Employee Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الاسم الأول</label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/10"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">اسم العائلة</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/10"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">اسم المستخدم</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/10"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">الدور الوظيفي</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/10 appearance-none"
                                required
                            >
                                <option value="waiter">نادل</option>
                                <option value="cashier">كاشير</option>
                                <option value="chef">طاهٍ</option>
                                <option value="manager">مدير</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">رقم الهاتف</label>
                        <input
                            type="text"
                            value={formData.phone_number}
                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/10"
                            placeholder="050XXXXXXXX"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">كلمة المرور {editingItem && '(اختياري لتغييرها)'}</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full h-10 bg-gray-50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/10"
                            required={!editingItem}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Save className="w-4 h-4" />
                        {editingItem ? 'تحديث البيانات' : 'إضافة موظف'}
                    </button>
                </form>
            </Modal>
        </div>
    );
}
