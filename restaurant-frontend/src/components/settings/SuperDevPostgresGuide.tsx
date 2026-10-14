'use client';

import React, { useState, useEffect } from 'react';
import {
    Database,
    Server,
    Terminal,
    Check,
    Copy,
    ShieldCheck,
    Cpu,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    ExternalLink,
    HardDrive,
    Layers,
    Sparkles,
    FileCode,
    Sliders,
    HelpCircle,
    Zap,
    Lock,
    Settings2,
    ChevronDown,
    ChevronUp,
    Play
} from 'lucide-react';
import {
    licenseService,
    DatabaseStatus,
    AutoSetupPostgresResponse
} from '@/services/licenseService';

interface SuperDevPostgresGuideProps {
    developerName?: string;
}

export default function SuperDevPostgresGuide({ developerName }: SuperDevPostgresGuideProps) {
    const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // One-Click Auto-Setup States
    const [isAutoSettingUp, setIsAutoSettingUp] = useState(false);
    const [autoSetupResult, setAutoSetupResult] = useState<AutoSetupPostgresResponse | null>(null);
    const [autoSetupError, setAutoSetupError] = useState<string | null>(null);
    const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

    // Advanced / customizable parameters (with smart defaults)
    const [dbUser, setDbUser] = useState('postgres');
    const [dbPassword, setDbPassword] = useState('0918147613a');
    const [dbName, setDbName] = useState('restaurant_db');
    const [dbHost, setDbHost] = useState('127.0.0.1');
    const [dbPort, setDbPort] = useState('5432');

    const fetchStatus = async () => {
        try {
            setLoadingStatus(true);
            const status = await licenseService.getDatabaseStatus();
            setDbStatus(status);
        } catch (err) {
            console.warn('Could not fetch database status:', err);
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 3000);
    };

    // One-Click Execution Handler
    const handleOneClickAutoSetup = async () => {
        try {
            setIsAutoSettingUp(true);
            setAutoSetupError(null);
            setAutoSetupResult(null);

            const result = await licenseService.autoSetupPostgres({
                db_name: dbName.trim() || 'restaurant_db',
                db_user: dbUser.trim() || 'postgres',
                db_password: dbPassword,
                db_host: dbHost.trim() || '127.0.0.1',
                db_port: dbPort.trim() || '5432'
            });

            setAutoSetupResult(result);
            await fetchStatus();
        } catch (err: any) {
            console.error('Auto setup failed:', err);
            const msg = err?.response?.data?.message || err?.message || 'فشلت عملية التهيئة التلقائية. يرجى التحقق من تشغيل سيرفر PostgreSQL وصحة كلمة المرور.';
            setAutoSetupError(msg);
        } finally {
            setIsAutoSettingUp(false);
        }
    };

    // SQL Code Block
    const sqlCode = `-- 1. الدخول لموجه أوامر psql أو أداة pgAdmin
-- 2. تنفيذ أمر إنشاء قاعدة البيانات بترميز UTF8
CREATE DATABASE restaurant_db WITH OWNER postgres ENCODING 'UTF8';

-- 3. منح كامل الصلاحيات للمستخدم postgres
GRANT ALL PRIVILEGES ON DATABASE restaurant_db TO postgres;`;

    // PowerShell Command
    const psCode = `# تشغيل أمر الإنشاء السريع عبر PowerShell (تأكد من تعديل مسار رقم الإصدار 15 أو 16 أو 17)
& "C:\\Program Files\\PostgreSQL\\16\\bin\\createdb.exe" -U postgres -h 127.0.0.1 -p 5432 restaurant_db`;

    // .env Code
    const envCode = `# إعدادات قاعدة البيانات في restaurantsApi/.env
USE_POSTGRES=True
DB_NAME=restaurant_db
DB_USER=postgres
DB_PASSWORD=0918147613a
DB_HOST=127.0.0.1
DB_PORT=5432`;

    // Migration Command
    const migrateCode = `# من موجه الأوامر CMD أو PowerShell كمسؤول:
cd E:\\restaurants\\restaurantsApi
..\\.venv\\Scripts\\activate
python manage.py migrate`;

    return (
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950 border-2 border-indigo-200/80 dark:border-indigo-800/40 rounded-3xl p-6 sm:p-8 text-gray-900 dark:text-white shadow-xl relative overflow-hidden transition-colors">
            {/* Background glowing accents */}
            <div className="absolute top-0 left-0 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-wide">
                                إدارة وتهيئة قاعدة بيانات PostgreSQL
                            </h3>
                            <span className="px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-blue-600 text-white rounded-full shadow-sm">
                                SuperDev: ظافر & أيوب
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            إنشاء قاعدة البيانات، ضبط الاتصال، وتطبيق الجداول تلقائياً بنقرة زر واحدة
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchStatus}
                        disabled={loadingStatus || isAutoSettingUp}
                        className="flex items-center gap-2 bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 border border-gray-200 dark:border-white/10 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                        title="تحديث حالة الاتصال الحالية"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
                        <span>فحص الاتصال الحقيقي</span>
                    </button>
                </div>
            </div>

            {/* ========================================================= */}
            {/* 🚀 THE ONE-CLICK MAGIC AUTO-SETUP HERO CARD */}
            {/* ========================================================= */}
            <div className="relative z-10 mt-6 p-6 sm:p-7 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white border-2 border-indigo-400/50 rounded-3xl shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black shadow-md flex items-center justify-center">
                                <Zap className="w-5 h-5 fill-slate-950" />
                            </span>
                            <h4 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                                الإنشاء والتهيئة الشاملة بضغطة زر واحدة!
                            </h4>
                            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 rounded-full shadow-sm">
                                فوري 1-Click
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed font-medium">
                            بعد أن يقوم <strong>ظافر أو أيوب</strong> بتثبيت برنامج PostgreSQL Server على حاسوب العميل، لا حاجة لكتابة أي أوامر في الطرفية أو فتح pgAdmin.
                            بمجرد الضغط على الزر، سيتصل النظام تلقائياً بالسيرفر، وينشئ قاعدة البيانات <code className="text-amber-300 font-bold font-mono">restaurant_db</code>، ويحدث ملف <code className="text-amber-300 font-mono">.env</code>، ويطبق كافة الجداول وهجرات النظام (Migrations) بنقرة واحدة!
                        </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleOneClickAutoSetup}
                            disabled={isAutoSettingUp}
                            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAutoSettingUp ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                    <span>جاري إنشاء الجداول والتهيئة التلقائية...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5 fill-slate-950" />
                                    <span>⚡ إنشاء وتهيئة قاعدة البيانات تلقائياً</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                            className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 font-bold transition underline underline-offset-4 cursor-pointer"
                        >
                            <Settings2 className="w-3.5 h-3.5" />
                            <span>{showAdvancedConfig ? 'إخفاء بيانات الاتصال المتقدمة' : 'تعديل كلمة المرور أو المنفذ (اختياري)'}</span>
                            {showAdvancedConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                {/* Collapsible Advanced Credentials */}
                {showAdvancedConfig && (
                    <div className="relative z-10 mt-6 pt-5 border-t border-indigo-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in">
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-indigo-300">اسم المستخدم (User)</label>
                            <input
                                type="text"
                                value={dbUser}
                                onChange={(e) => setDbUser(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-indigo-700/60 rounded-xl text-white font-mono text-xs font-bold focus:outline-none focus:border-amber-400"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-indigo-300">كلمة المرور (Password)</label>
                            <input
                                type="text"
                                value={dbPassword}
                                onChange={(e) => setDbPassword(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-indigo-700/60 rounded-xl text-white font-mono text-xs font-bold focus:outline-none focus:border-amber-400"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-indigo-300">اسم قاعدة البيانات</label>
                            <input
                                type="text"
                                value={dbName}
                                onChange={(e) => setDbName(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-indigo-700/60 rounded-xl text-white font-mono text-xs font-bold focus:outline-none focus:border-amber-400"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-indigo-300">المضيف (Host)</label>
                            <input
                                type="text"
                                value={dbHost}
                                onChange={(e) => setDbHost(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-indigo-700/60 rounded-xl text-white font-mono text-xs font-bold focus:outline-none focus:border-amber-400"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-indigo-300">المنفذ (Port)</label>
                            <input
                                type="text"
                                value={dbPort}
                                onChange={(e) => setDbPort(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-indigo-700/60 rounded-xl text-white font-mono text-xs font-bold focus:outline-none focus:border-amber-400"
                            />
                        </div>
                    </div>
                )}

                {/* Auto-Setup Result Alerts */}
                {autoSetupResult && (
                    <div className="relative z-10 mt-6 p-4 sm:p-5 bg-emerald-950/80 border-2 border-emerald-500 rounded-2xl flex items-start gap-3.5 animate-in fade-in slide-in-from-top-2 text-white">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs sm:text-sm">
                            <div className="font-black text-emerald-300 text-sm sm:text-base">
                                {autoSetupResult.message}
                            </div>
                            <div className="text-emerald-200/90 text-xs">
                                تم ربط النظام مع قاعدة البيانات <strong className="font-mono text-white">{autoSetupResult.db_name}</strong> وتحديث ملف <code className="font-mono">.env</code> بنجاح تام!
                            </div>
                            {autoSetupResult.details && (
                                <details className="mt-2 text-left dir-ltr bg-black/40 p-2.5 rounded-lg border border-emerald-800 font-mono text-[11px] text-emerald-300 max-h-40 overflow-y-auto">
                                    <summary className="cursor-pointer text-xs font-bold text-emerald-400 mb-1">
                                        عرض سجل تطبيق الجداول (Migration Output Log)
                                    </summary>
                                    <pre className="whitespace-pre-wrap">{autoSetupResult.details}</pre>
                                </details>
                            )}
                        </div>
                    </div>
                )}

                {autoSetupError && (
                    <div className="relative z-10 mt-6 p-4 sm:p-5 bg-rose-950/80 border-2 border-rose-500 rounded-2xl flex items-start gap-3.5 animate-in fade-in slide-in-from-top-2 text-white">
                        <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs sm:text-sm">
                            <div className="font-black text-rose-300 text-sm sm:text-base">
                                تعذر إتمام التهيئة التلقائية
                            </div>
                            <div className="text-rose-200/90 text-xs leading-relaxed">
                                {autoSetupError}
                            </div>
                            <div className="text-[11px] text-rose-300 pt-1">
                                💡 <strong>حلول سريعة:</strong> تأكد أن خدمة PostgreSQL تعمل في ويندوز (<code className="font-mono">services.msc</code>)، وتحقق من كلمة مرور المستخدم <code className="font-mono">postgres</code> عبر زر التعديل أعلاه.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Live Database Status Card */}
            <div className="relative z-10 mt-6 p-4 sm:p-5 bg-white/80 dark:bg-slate-900/80 border border-gray-200/90 dark:border-slate-800 rounded-2xl backdrop-blur-md shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className={`p-2.5 rounded-xl ${
                            dbStatus?.is_postgres
                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                : dbStatus?.port_open
                                    ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                                    : 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                        }`}>
                            <Server className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-500 dark:text-slate-400">حالة محرك البيانات الفعلي:</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                    dbStatus?.is_postgres
                                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                }`}>
                                    {dbStatus ? dbStatus.engine : 'جاري الفحص...'}
                                </span>
                                {dbStatus?.port_open && (
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[11px] font-bold">
                                        منفذ 5432 نشط ومستمع
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
                                {dbStatus?.message || 'يقوم النظام تلقائياً بالربط مع PostgreSQL عند توفره، أو التحول التلقائي والآمن إلى SQLite3 كخطة طوارئ بدون توقف الخدمة.'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs border-t md:border-t-0 md:border-r border-gray-200 dark:border-slate-800 pt-3 md:pt-0 md:pr-4">
                        <div className="p-2 bg-gray-50 dark:bg-slate-800/60 rounded-xl">
                            <span className="text-[10px] text-gray-400 block font-bold">قاعدة البيانات</span>
                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{dbStatus?.db_name || 'restaurant_db'}</span>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-slate-800/60 rounded-xl">
                            <span className="text-[10px] text-gray-400 block font-bold">المستخدم</span>
                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{dbStatus?.db_user || 'postgres'}</span>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-slate-800/60 rounded-xl">
                            <span className="text-[10px] text-gray-400 block font-bold">المنفذ</span>
                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{dbStatus?.db_port || '5432'}</span>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-slate-800/60 rounded-xl">
                            <span className="text-[10px] text-gray-400 block font-bold">المضيف</span>
                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{dbStatus?.db_host || '127.0.0.1'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Mechanism Notice */}
            <div className="relative z-10 mt-5 p-4 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                    <strong className="block font-black text-sm mb-0.5 text-blue-950 dark:text-blue-100">
                        ميزة التبديل الذكي الفوري (Auto-Fallback Mechanism):
                    </strong>
                    تمت برمجة النظام بواسطة <strong>ظافر وأيوب</strong> ليفحص تلقائياً منفذ خادم PostgreSQL (Port 5432).
                    إذا كان السيرفر وقاعدة البيانات جاهزة، يتصل النظام تلقائياً بـ PostgreSQL لأعلى أداء وسرعة في بيئة الشبكات والمطاعم الكبيرة.
                    وفي حال توقف السيرفر أو لم يتم تثبيته بعد، يتحول النظام صامتاً إلى SQLite3 لتفادي أي انقطاع في شاشات الكاشير والمطبخ.
                </div>
            </div>

            {/* Reference Manual / Step-by-Step Instructions */}
            <div className="relative z-10 mt-8 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
                    <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        المرجع اليدوي وخطوات الطرفية (في حال الرغبة بالتطبيق اليدوي):
                    </h4>
                    <span className="text-xs text-gray-500 font-bold">اختياري</span>
                </div>

                {/* Step 1 */}
                <div className="p-5 bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2.5">
                    <div className="flex items-center gap-2.5 font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-black shrink-0">1</span>
                        <span>تثبيت برنامج PostgreSQL Server على حاسوب العميل</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-300 pr-8 leading-relaxed">
                        قم بتثبيت سيرفر PostgreSQL (إصدار 15 أو 16 أو 17 الرسمي لنظام ويندوز).
                        أثناء التثبيت:
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-slate-300 pr-12 list-disc space-y-1">
                        <li>اجعل المنفذ الافتراضي هو <strong className="font-mono text-indigo-600 dark:text-indigo-400">5432</strong>.</li>
                        <li>
                            اجعل كلمة مرور المستخدم <code className="font-mono text-gray-800 dark:text-gray-200 font-bold">postgres</code> هي:{' '}
                            <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                0918147613a
                            </strong>{' '}
                            (وهي القيمة الافتراضية المدمجة في إعدادات النظام)، أو اختر كلمة مرور أخرى واكتبها في خيارات الزر أعلاه.
                        </li>
                    </ul>
                </div>

                {/* Step 2: SQL Scripts */}
                <div className="p-5 bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5 font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-black shrink-0">2</span>
                            <span>إنشاء قاعدة البيانات <span className="font-mono text-indigo-600 dark:text-indigo-400">restaurant_db</span> عبر SQL</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(sqlCode, 'sql')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                            {copiedKey === 'sql' ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>تم نسخ كود SQL</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>نسخ كود SQL</span>
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-slate-300 pr-8">
                        افتح أداة <strong className="text-gray-900 dark:text-white">SQL Shell (psql)</strong> أو أداة <strong className="text-gray-900 dark:text-white">pgAdmin 4</strong> المرفقة، والصق الأوامر التالية:
                    </p>

                    <div className="mr-8 bg-slate-950 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed dir-ltr text-left">
                        <pre>{sqlCode}</pre>
                    </div>
                </div>

                {/* Step 3: Fast Terminal / PowerShell One-Liner */}
                <div className="p-5 bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5 font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-black shrink-0">3</span>
                            <span>خيار بديل: الإنشاء السريع عبر PowerShell</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(psCode, 'ps')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                            {copiedKey === 'ps' ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>تم النسخ</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>نسخ أمر PowerShell</span>
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-slate-300 pr-8">
                        يمكنك فتح نافذة PowerShell على جهاز العميل وتشغيل الأمر المباشر التالي:
                    </p>

                    <div className="mr-8 bg-slate-950 text-emerald-400 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 dir-ltr text-left">
                        <pre>{psCode}</pre>
                    </div>
                </div>

                {/* Step 4: Environment Variables (.env) */}
                <div className="p-5 bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5 font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-black shrink-0">4</span>
                            <span>التأكد من ملف البيئة في الباك إند (<span className="font-mono text-xs">restaurantsApi/.env</span>)</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(envCode, 'env')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                            {copiedKey === 'env' ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>تم نسخ المتغيرات</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>نسخ إعدادات .env</span>
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-slate-300 pr-8">
                        النظام يحتوي على هذه القيم افتراضياً في كود <code className="font-mono text-xs">settings.py</code>، وإذا أردت تخصيص كلمة مرور العميل ضعها في ملف <code className="font-mono text-xs">restaurantsApi/.env</code>:
                    </p>

                    <div className="mr-8 bg-slate-950 text-amber-300 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 dir-ltr text-left">
                        <pre>{envCode}</pre>
                    </div>
                </div>

                {/* Step 5: Run Migrations */}
                <div className="p-5 bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5 font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-black shrink-0">5</span>
                            <span>بناء الجداول وترقية قاعدة البيانات يدوياً (Apply Migrations)</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(migrateCode, 'mig')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                            {copiedKey === 'mig' ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>تم النسخ</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>نسخ أوامر التهجير</span>
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-slate-300 pr-8">
                        بعد إنشاء قاعدة البيانات، يمكنك تشغيل أوامر بناء الجداول في الطرفية:
                    </p>

                    <div className="mr-8 bg-slate-950 text-sky-300 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 dir-ltr text-left">
                        <pre>{migrateCode}</pre>
                    </div>
                </div>

                {/* Troubleshooting Box */}
                <div className="p-5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>نصائح واستكشاف الأخطاء الشائعة (Troubleshooting Tips):</span>
                    </div>
                    <ul className="text-xs text-amber-900/90 dark:text-amber-200/90 space-y-2 pr-6 list-disc">
                        <li>
                            <strong>فشل تسجيل الدخول (Password authentication failed):</strong> تأكد أن كلمة المرور المعينة أثناء تثبيت PostgreSQL تطابق <code className="font-mono bg-white/70 dark:bg-black/40 px-1 py-0.5 rounded">0918147613a</code> أو مطابقة لما هو مكتوب في خانة كلمة المرور أعلاه.
                        </li>
                        <li>
                            <strong>الخدمة متوقفة (Connection Refused):</strong> اضغط على <kbd className="bg-white/80 dark:bg-black/50 px-1.5 py-0.5 rounded font-mono">Win + R</kbd> واكتب <code className="font-mono">services.msc</code> وتأكد أن خدمة <code className="font-mono">postgresql-x64-xx</code> بحالة <strong>Running</strong>.
                        </li>
                        <li>
                            <strong>ربط الأجهزة المتعددة عبر شبكة المطعم (LAN):</strong> إذا كان المطعم يحتوي على عدة أجهزة كاشير أو تابلت، تأكد في ملف <code className="font-mono">postgresql.conf</code> من تعيين <code className="font-mono">listen_addresses = '*'</code>، وإضافة سطر بالسماح لشبكة المطعم في ملف <code className="font-mono">pg_hba.conf</code>.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
