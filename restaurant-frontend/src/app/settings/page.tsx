'use client';

import React, { useState, useEffect } from 'react';
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
    FileText
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';
import { RestaurantSettings } from '@/services/settingsService';

export default function SettingsPage() {
    const { isSidebarCollapsed } = useUIStore();
    const {
        settings,
        loading,
        updateSettings,
        fetchSettings,
        error: storeError
    } = useSettingsStore();

    const [saving, setSaving] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'operational'>('general');

    const [localSettings, setLocalSettings] = useState<RestaurantSettings | null>(null);

    useEffect(() => {
        if (!settings) {
            fetchSettings();
        } else {
            setLocalSettings(settings);
        }
    }, [settings, fetchSettings]);

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

    const handleChange = (field: keyof RestaurantSettings, value: any) => {
        if (!localSettings) return;
        setLocalSettings({ ...localSettings, [field]: value });
    };

    const displayError = localError || storeError;

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
                <Sidebar />
                <main className={`flex-1 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} p-8 flex items-center justify-center transition-all duration-300`}>
                    <div className="flex flex-col items-center gap-4">
                        <RefreshCcw className="w-10 h-10 text-indigo-600 animate-spin" />
                        <p className="text-gray-500 font-bold">جاري تحميل الإعدادات...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
            <Sidebar />

            <main className={`flex-1 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} p-4 lg:p-8 transition-all duration-300`}>
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                                <Settings className="w-8 h-8 text-indigo-600" />
                                الإعدادات العامة
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">تخصيص هوية المطعم والخيارات المالية والتشغيلية</p>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all transform active:scale-95"
                        >
                            {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>

                    {/* Feedback Messages */}
                    {displayError && (
                        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {displayError}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                            تم حفظ الإعدادات بنجاح!
                        </div>
                    )}

                    {/* Tabs Navigation */}
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl mb-8 gap-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'general' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                            <Store className="w-4 h-4" />
                            بيانات المطعم
                        </button>
                        <button
                            onClick={() => setActiveTab('financial')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'financial' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                            <CreditCard className="w-4 h-4" />
                            الماليات والضرائب
                        </button>
                        <button
                            onClick={() => setActiveTab('operational')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'operational' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/30'}`}
                        >
                            <Activity className="w-4 h-4" />
                            التشغيل والفواتير
                        </button>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* General Tab */}
                        {activeTab === 'general' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-indigo-500" />
                                        اسم المطعم
                                    </label>
                                    <input
                                        type="text"
                                        value={localSettings?.name || ''}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                        placeholder="مثال: مطعم النخبة"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-indigo-500" />
                                        رقم الهاتف
                                    </label>
                                    <input
                                        type="text"
                                        value={localSettings?.phone || ''}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold"
                                        placeholder="05xxxxxxx"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-indigo-500" />
                                        العنوان بالكامل
                                    </label>
                                    <textarea
                                        value={localSettings?.address || ''}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        rows={3}
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold resize-none"
                                        placeholder="المدينة، الشارع، مبنى رقم..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Financial Tab */}
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
                                        placeholder="مثال: SAR أو ر.س"
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
                                <div className="md:col-span-2 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold leading-relaxed">
                                         💡 ملاحظة: سيتم تطبيق نسبة الضريبة هذه تلقائياً على جميع الطلبات الجديدة في صفحة نقطة البيع (POS). يرجى التأكد من صحتها حسب الأنظمة المحلية.
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
                                        placeholder="مثال: نشكركم لزيارتكم، نتمنى رؤيتكم قريباً!"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${localSettings?.is_delivery_enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 dark:text-white">تفعيل خدمة التوصيل</h3>
                                            <p className="text-xs text-gray-500 font-medium">إتاحة خيار التوصيل في صفحة نقطة البيع</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-6">
                                        {localSettings?.is_delivery_enabled && (
                                            <div className="flex flex-col gap-1 items-end">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">رسوم التوصيل الافتراضية</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={localSettings?.default_delivery_fee !== undefined && !isNaN(localSettings.default_delivery_fee) ? localSettings.default_delivery_fee : ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        handleChange('default_delivery_fee', isNaN(val) ? 0 : val);
                                                    }}
                                                    className="w-24 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm text-left"
                                                />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleChange('is_delivery_enabled', !localSettings?.is_delivery_enabled)}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${localSettings?.is_delivery_enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${localSettings?.is_delivery_enabled ? '-translate-x-6' : '-translate-x-1'}`} />
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
