'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Settings,
    Store,
    CreditCard,
    Activity,
    Save,
    RefreshCcw,
    AlertCircle,
    CheckCircle2,
    Globe,
    Phone,
    MapPin,
    Percent,
    Banknote,
    FileText,
    Upload,
    Trash2,
    Camera,
    User,
    Mail,
    FileCheck2,
    Hash,
    Sparkles,
    Link as LinkIcon
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useSettingsStore } from '@/store/settingsStore';
import { confirmDialog, alertDialog } from '@/store/modalStore';
import { useUIStore } from '@/store/uiStore';
import { RestaurantSettings } from '@/services/settingsService';

export default function SettingsPage() {
    const { isSidebarCollapsed } = useUIStore();
    const {
        settings,
        loading,
        updateSettings,
        uploadLogo,
        removeLogo,
        fetchSettings,
        error: storeError
    } = useSettingsStore();

    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'operational'>('general');

    const [localSettings, setLocalSettings] = useState<RestaurantSettings | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!settings) {
            fetchSettings();
        } else {
            setLocalSettings(settings);
        }
    }, [settings, fetchSettings]);

    const getFullLogoUrl = (path?: string) => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const baseApi = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
        const baseUrl = baseApi.replace(/\/api\/?$/, '');
        return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!localSettings) return;

        try {
            setSaving(true);
            setLocalError(null);
            setSuccess(false);
            await updateSettings(localSettings);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error('Failed to save settings:', err);
            setLocalError('فشل في حفظ الإعدادات.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setLocalError('حجم الصورة كبير جداً، الحد الأقصى المسموح به 5 ميجابايت.');
            return;
        }

        try {
            setUploadingLogo(true);
            setLocalError(null);
            await uploadLogo(file);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error('Failed to upload logo:', err);
            setLocalError('فشل في رفع الشعار. يرجى التأكد من صلاحية ملف الصورة.');
        } finally {
            setUploadingLogo(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveLogo = async () => {
        const confirmed = await confirmDialog({
            title: 'حذف شعار المطعم',
            message: 'هل أنت متأكد من رغبتك في حذف شعار المطعم؟',
            confirmText: 'نعم، حذف الشعار',
            cancelText: 'إلغاء',
            variant: 'danger',
        });
        if (!confirmed) return;

        try {
            setUploadingLogo(true);
            setLocalError(null);
            await removeLogo();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error('Failed to remove logo:', err);
            setLocalError('فشل في إزالة الشعار.');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleChange = (field: keyof RestaurantSettings, value: any) => {
        if (!localSettings) return;
        setLocalSettings({ ...localSettings, [field]: value });
    };

    const displayError = localError || storeError;
    const currentLogoUrl = getFullLogoUrl(localSettings?.logo);

    if (loading && !localSettings) {
        return (
            <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 dark:bg-gray-900 w-full min-w-0" dir="rtl">
                <Sidebar />
                <main className={`flex-1 min-w-0 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} p-6 sm:p-8 flex items-center justify-center transition-all duration-300`}>
                    <div className="flex flex-col items-center gap-4">
                        <RefreshCcw className="w-10 h-10 text-indigo-600 animate-spin" />
                        <p className="text-gray-500 font-bold">جاري تحميل الإعدادات...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 dark:bg-gray-900 w-full min-w-0" dir="rtl">
            <Sidebar />

            <main className={`flex-1 min-w-0 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} p-3.5 sm:p-6 lg:p-8 transition-all duration-300`}>
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                                <Settings className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 shrink-0" />
                                الإعدادات العامة
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs sm:text-sm mt-1">
                                تخصيص هوية وشعار المطعم، بيانات المالك، والخيارات المالية والتشغيلية
                            </p>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/20 transition-all transform active:scale-95 w-full sm:w-auto shrink-0"
                        >
                            {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>

                    {/* Feedback Messages */}
                    {displayError && (
                        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {displayError}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                            تم حفظ وتحديث الإعدادات بنجاح!
                        </div>
                    )}

                    {/* Tabs Navigation */}
                    <div className="flex flex-col sm:flex-row p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl mb-6 sm:mb-8 gap-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                                activeTab === 'general'
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/30'
                            }`}
                        >
                            <Store className="w-4 h-4 shrink-0" />
                            بيانات المطعم والشعار
                        </button>
                        <button
                            onClick={() => setActiveTab('financial')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                                activeTab === 'financial'
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/30'
                            }`}
                        >
                            <CreditCard className="w-4 h-4 shrink-0" />
                            الماليات والسجل التجاري
                        </button>
                        <button
                            onClick={() => setActiveTab('operational')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                                activeTab === 'operational'
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/30'
                            }`}
                        >
                            <Activity className="w-4 h-4 shrink-0" />
                            التشغيل والفواتير
                        </button>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* General Tab */}
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                {/* Logo Section */}
                                <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <Camera className="w-5 h-5 text-indigo-600" />
                                        شعار المطعم (Logo)
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                                        يظهر الشعار في رأس النظام، القوائم المطبوعة، وإيصالات وفواتير الزبائن
                                    </p>

                                    <div className="flex flex-col sm:flex-row items-center gap-6">
                                        {/* Logo Preview */}
                                        <div className="relative group w-32 h-32 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
                                            {currentLogoUrl ? (
                                                <img
                                                    src={currentLogoUrl}
                                                    alt="شعار المطعم"
                                                    className="w-full h-full object-contain p-2"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center text-center p-2 text-indigo-400">
                                                    <Store className="w-10 h-10 stroke-[1.5] mb-1" />
                                                    <span className="text-[10px] font-bold">لا يوجد شعار</span>
                                                </div>
                                            )}

                                            {uploadingLogo && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                                                    <RefreshCcw className="w-6 h-6 text-white animate-spin" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions & Info */}
                                        <div className="flex-1 flex flex-col gap-3 w-full">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleLogoFileChange}
                                                accept="image/*"
                                                className="hidden"
                                            />

                                            <div className="flex flex-wrap items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploadingLogo}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    {currentLogoUrl ? 'تغيير الشعار' : 'رفع شعار جديد'}
                                                </button>

                                                {currentLogoUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveLogo}
                                                        disabled={uploadingLogo}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 rounded-xl font-bold text-sm border border-rose-200 dark:border-rose-800 transition-all cursor-pointer disabled:opacity-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        حذف الشعار
                                                    </button>
                                                )}
                                            </div>

                                            <span className="text-xs text-gray-400 font-medium">
                                                الصيغ المدعومة: PNG، JPG، WEBP أو SVG (بحد أقصى 5MB)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Basic Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Store className="w-4 h-4 text-indigo-500" />
                                            اسم المطعم / المنشأة
                                        </label>
                                        <input
                                            type="text"
                                            value={localSettings?.name || ''}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                            placeholder="مثال: مطعم الأندلس"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <User className="w-4 h-4 text-indigo-500" />
                                            اسم المالك / المدير المسؤول
                                        </label>
                                        <input
                                            type="text"
                                            value={localSettings?.owner_name || ''}
                                            onChange={(e) => handleChange('owner_name', e.target.value)}
                                            className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                            placeholder="مثال: أ. محمد علي"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-indigo-500" />
                                            رقم الهاتف الأساسي
                                        </label>
                                        <input
                                            type="text"
                                            value={localSettings?.phone || ''}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                            className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                            placeholder="مثال: 091xxxxxxx"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-indigo-500" />
                                            رقم هاتف إضافي / للشكاوى
                                        </label>
                                        <input
                                            type="text"
                                            value={localSettings?.secondary_phone || ''}
                                            onChange={(e) => handleChange('secondary_phone', e.target.value)}
                                            className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                            placeholder="مثال: 092xxxxxxx"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-indigo-500" />
                                            البريد الإلكتروني الرسمي
                                        </label>
                                        <input
                                            type="email"
                                            value={localSettings?.email || ''}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                            placeholder="contact@restaurant.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <LinkIcon className="w-4 h-4 text-indigo-500" />
                                            الموقع الإلكتروني / صفحة السوشيال ميديا
                                        </label>
                                        <input
                                            type="text"
                                            value={localSettings?.website || ''}
                                            onChange={(e) => handleChange('website', e.target.value)}
                                            className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                            placeholder="https://facebook.com/myrestaurant"
                                        />
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-indigo-500" />
                                            نبذة عن المطعم أو الشعار الترويجي (Slogan)
                                        </label>
                                        <input
                                            type="text"
                                            value={localSettings?.bio || ''}
                                            onChange={(e) => handleChange('bio', e.target.value)}
                                            className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                            placeholder="مثال: ألذ وأشهى المأكولات الشرقية والغربية بطابع أصيل"
                                        />
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-indigo-500" />
                                            العنوان الجغرافي بالكامل
                                        </label>
                                        <textarea
                                            value={localSettings?.address || ''}
                                            onChange={(e) => handleChange('address', e.target.value)}
                                            rows={3}
                                            className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold resize-none"
                                            placeholder="المدينة، الشارع، المعلم البارز أو رقم المبنى..."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Financial & Legal Tab */}
                        {activeTab === 'financial' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Banknote className="w-4 h-4 text-emerald-500" />
                                        العملة الافتراضية
                                    </label>
                                    <input
                                        type="text"
                                        value={localSettings?.currency || ''}
                                        onChange={(e) => handleChange('currency', e.target.value)}
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                        placeholder="مثال: د.ل (دينار ليبي)"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Percent className="w-4 h-4 text-emerald-500" />
                                        نسبة الضريبة (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={localSettings?.tax_rate !== undefined && !isNaN(localSettings.tax_rate) ? localSettings.tax_rate : ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            handleChange('tax_rate', isNaN(val) ? 0 : val);
                                        }}
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-blue-500" />
                                        الرقم الضريبي
                                    </label>
                                    <input
                                        type="text"
                                        value={localSettings?.tax_number || ''}
                                        onChange={(e) => handleChange('tax_number', e.target.value)}
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                        placeholder="مثال: 300xxxxxxxxxxxx"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <FileCheck2 className="w-4 h-4 text-blue-500" />
                                        رقم السجل التجاري
                                    </label>
                                    <input
                                        type="text"
                                        value={localSettings?.commercial_record || ''}
                                        onChange={(e) => handleChange('commercial_record', e.target.value)}
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                        placeholder="مثال: 1010xxxxxx"
                                    />
                                </div>

                                <div className="md:col-span-2 p-5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold leading-relaxed">
                                        💡 ملاحظة: تظهر بيانات السجل التجاري والرقم الضريبي والعملة الافتراضية ونسبة الضريبة تلقائياً على فواتير المشتريات وإيصالات المبيعات للزبائن طبقاً للوائح والمتطلبات القانونية.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Operational Tab */}
                        {activeTab === 'operational' && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-amber-500" />
                                        رسالة تذييل الفاتورة
                                    </label>
                                    <textarea
                                        value={localSettings?.invoice_footer_message || ''}
                                        onChange={(e) => handleChange('invoice_footer_message', e.target.value)}
                                        rows={3}
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold resize-none"
                                        placeholder="مثال: نشكركم لزيارتكم، نتمنى لكم يوماً سعيداً ونسعد برؤيتكم دائماً!"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                                localSettings?.is_delivery_enabled
                                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                                            }`}
                                        >
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 dark:text-white">تفعيل خدمة التوصيل</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">إتاحة خيار التوصيل وطلبات الدليفري في النظام</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-6">
                                        {localSettings?.is_delivery_enabled && (
                                            <div className="flex flex-col gap-1 items-end">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    رسوم التوصيل الافتراضية
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={
                                                        localSettings?.default_delivery_fee !== undefined &&
                                                        !isNaN(localSettings.default_delivery_fee)
                                                            ? localSettings.default_delivery_fee
                                                            : ''
                                                    }
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        handleChange('default_delivery_fee', isNaN(val) ? 0 : val);
                                                    }}
                                                    className="w-28 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm text-left"
                                                />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleChange('is_delivery_enabled', !localSettings?.is_delivery_enabled)}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                                localSettings?.is_delivery_enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                                    localSettings?.is_delivery_enabled ? '-translate-x-6' : '-translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
}
