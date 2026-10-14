'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Monitor,
    Download,
    CheckCircle2,
    ShieldCheck,
    Printer,
    WifiOff,
    HardDrive,
    Terminal,
    Sparkles,
    Play,
    Server,
    ExternalLink,
    Copy,
    Check,
    Cpu,
    Layers,
    Share2,
    Settings,
    HelpCircle,
    ChevronLeft,
    ShoppingBag,
    ChefHat,
    Smartphone
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useUIStore } from '@/store/uiStore';
import { licenseService } from '@/services/licenseService';

export default function DesktopShowcasePage() {
    const { isSidebarCollapsed } = useUIStore();
    const [activeTab, setActiveTab] = useState<'methods' | 'printers' | 'network' | 'license' | 'specs'>('methods');
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
    const [machineId, setMachineId] = useState<string>('جاري الفحص...');
    const [isLicensed, setIsLicensed] = useState<boolean>(true);

    useEffect(() => {
        licenseService.getLicenseStatus()
            .then((st) => {
                if (st?.machine_id) setMachineId(st.machine_id);
                setIsLicensed(st?.is_activated ?? true);
            })
            .catch(() => {
                setMachineId('E165-594A-81A8-FF6F');
            });
    }, []);

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(key);
        setTimeout(() => setCopiedSnippet(null), 2500);
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50/70 dark:bg-[#070b14] w-full min-w-0 transition-colors duration-300" dir="rtl">
            <Sidebar />

            <main className={`flex-1 min-w-0 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} p-3.5 sm:p-6 lg:p-8 transition-all duration-300`}>
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    {/* Hero Header - Adaptable to Light & Dark Modes */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-blue-50/60 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 p-6 sm:p-10 border border-indigo-100/80 dark:border-indigo-900/40 shadow-sm dark:shadow-2xl text-slate-900 dark:text-white transition-all duration-300">
                        {/* Glowing Background Orbs */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-500/15 blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                            <div className="space-y-4 max-w-2xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100/70 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-400/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>برنامج سطح المكتب المخصص • RestoERP Desktop Edition v1.0.0</span>
                                </div>

                                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                    نظام إدارة المطاعم ونقاط البيع <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-800 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300">
                                        تطبيق مستقل لسطح المكتب (.exe)
                                    </span>
                                </h1>

                                <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                                    استمتع بأعلى مستويات السرعة والاستقرار مع نسخة ويندوز المستقلة والمصممة خصيصاً للمطاعم والكافيهات. تعمل دون اتصال بالإنترنت بنسبة 100% مع دعم الطابعات الحرارية وأجهزة الكاشير المتعددة.
                                </p>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <a
                                        href="#download-section"
                                        className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-600/25 transition-all transform active:scale-95"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>خيارات التثبيت والتحميل</span>
                                    </a>

                                    <Link
                                        href="/pos"
                                        className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 border border-gray-200 dark:border-white/15 text-slate-800 dark:text-white font-bold text-sm shadow-xs transition-all"
                                    >
                                        <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>تجربة نقطة البيع (POS)</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Status Card */}
                            <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 w-full lg:w-80 backdrop-blur-lg shrink-0 space-y-4 shadow-sm dark:shadow-none transition-colors">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">حالة تشغيل النظام</span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-black">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        جاهز ونشط
                                    </span>
                                </div>

                                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">خادم الباك إند:</span>
                                        <span className="font-mono text-indigo-600 dark:text-indigo-300 font-bold">127.0.0.1:8000</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">منفذ الفرونت إند:</span>
                                        <span className="font-mono text-blue-600 dark:text-cyan-300 font-bold">localhost:3005</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">معرف هذا الجهاز:</span>
                                        <span className="font-mono text-amber-600 dark:text-amber-300 font-bold">{machineId}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">حالة الترخيص:</span>
                                        <span className={isLicensed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                                            {isLicensed ? 'مفعل مدى الحياة' : 'تجريبي'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-500/40 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                                <Monitor className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white text-base mb-1.5">تطبيق ديسكتوب حقيقي (.exe)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                يعمل كنافذة برنامج ويندوز مستقلة بالكامل خالية من أشرطة المتصفح، مع إمكانية التشغيل التلقائي مع إقلاع الجهاز.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-500/40 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                                <WifiOff className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white text-base mb-1.5">عمل أوفلاين 100% بدون إنترنت</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                صُمم ليعمل في البيئات الصعبة والمطاعم دون الاعتماد على شبكة الإنترنت، مع حفظ محلي فوري وآمن لجميع الفواتير.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-800/80 shadow-xs hover:border-amber-500/40 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                                <Printer className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white text-base mb-1.5">طباعة حرارية فورية (80mm)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                توافق كامل مع طابعات الإيصالات الحرارية USB والشبكية، مع فتح تلقائي لدرج الكاشير وطباعة باركود QR ZATCA.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-800/80 shadow-xs hover:border-cyan-500/40 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3">
                                <Layers className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white text-base mb-1.5">شاشات متعددة (LAN Multi-Terminal)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                ربط كاشير الصالة مع شاشة المطبخ (KDS) وتابلت النادلين عبر الشبكة الداخلية بدون أي تكاليف سيرفرات خارجية.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-800/80 shadow-xs hover:border-rose-500/40 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white text-base mb-1.5">حماية وترخيص بالعتاد (Machine ID)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                قفل أمني مشفر يربط النسخة بالجهاز الفعلي لمنع النسخ غير المصرح به وضمان حقوق المطور والمطعم.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-800/80 shadow-xs hover:border-violet-500/40 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
                                <HardDrive className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white text-base mb-1.5">نسخ احتياطي محلي سهل</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                قاعدة بيانات مدمجة خفيفة يمكن حفظها بنقرة واحدة على فلاش ميموري خارجي أو مزامنتها مع خادم مركزي.
                            </p>
                        </div>
                    </div>

                    {/* Interactive Tabs Guide */}
                    <div id="download-section" className="bg-white dark:bg-slate-900/80 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-sm dark:shadow-md p-6 sm:p-8 space-y-6 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                                    <Terminal className="w-6 h-6 text-indigo-600" />
                                    دليل التثبيت والتشغيل الفني
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    اختر الطريقة الأنسب لبيئة التشغيل في مطعمك واتبع الخطوات البسيطة
                                </p>
                            </div>

                            {/* Tab Switchers */}
                            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 dark:bg-slate-800/70 p-1.5 rounded-2xl">
                                <button
                                    onClick={() => setActiveTab('methods')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        activeTab === 'methods'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'
                                    }`}
                                >
                                    🚀 خيارات التشغيل (3 طرق)
                                </button>
                                <button
                                    onClick={() => setActiveTab('printers')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        activeTab === 'printers'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'
                                    }`}
                                >
                                    🖨️ الطابعات والدرج
                                </button>
                                <button
                                    onClick={() => setActiveTab('network')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        activeTab === 'network'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'
                                    }`}
                                >
                                    🌐 ربط الشبكة (LAN)
                                </button>
                                <button
                                    onClick={() => setActiveTab('license')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        activeTab === 'license'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'
                                    }`}
                                >
                                    🔑 التفعيل والرخصة
                                </button>
                                <button
                                    onClick={() => setActiveTab('specs')}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        activeTab === 'specs'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40'
                                    }`}
                                >
                                    📊 متطلبات العتاد
                                </button>
                            </div>
                        </div>

                        {/* Tab 1: Installation Methods */}
                        {activeTab === 'methods' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    
                                    {/* Method 1: Desktop Launcher */}
                                    <div className="p-5 rounded-2xl border-2 border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col justify-between space-y-4">
                                        <div className="space-y-3">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[11px] font-black">
                                                <span>الخيار 1 (الموصى به حالياً)</span>
                                            </div>
                                            <h3 className="font-black text-slate-900 dark:text-white text-base">مشغل سطح المكتب الصامت</h3>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                تشغيل خوادم الباك إند والواجهة في الخلفية بدون أي شاشات سوداء بنقرة زر واحدة.
                                            </p>
                                            <div className="p-3 bg-gray-100 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-xs flex items-center justify-between">
                                                <span>run_system.bat</span>
                                                <button
                                                    onClick={() => copyToClipboard('run_system.bat', 'bat')}
                                                    className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                                    title="نسخ"
                                                >
                                                    {copiedSnippet === 'bat' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
                                            ✔ لا يحتاج تثبيت إضافي <br />
                                            ✔ جاهز للعمل فوراً على هذا الجهاز
                                        </div>
                                    </div>

                                    {/* Method 2: PWA Desktop */}
                                    <div className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/40 flex flex-col justify-between space-y-4">
                                        <div className="space-y-3">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-black">
                                                <span>الخيار 2 (تثبيت PWA)</span>
                                            </div>
                                            <h3 className="font-black text-slate-900 dark:text-white text-base">تطبيق ويندوز PWA</h3>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                تثبيت التطبيق مباشرة من Chrome أو Edge ليعمل كنافذة برمجية مستقلة بدون شريط المتصفح.
                                            </p>
                                            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 bg-white dark:bg-slate-950/60 p-3 rounded-xl border border-gray-200/60 dark:border-slate-800">
                                                <div>1. افتح <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">http://localhost:3005</span></div>
                                                <div>2. اضغط أيقونة <strong>تثبيت التطبيق</strong> من شريط العنوان</div>
                                                <div>3. يظهر اختصار في قائمة ابدأ وسطح المكتب</div>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-2 border-t border-gray-200 dark:border-slate-800">
                                            ✔ تثبيت بضغطة زر <br />
                                            ✔ خفيف وسريع جداً على المعالج
                                        </div>
                                    </div>

                                    {/* Method 3: Electron .exe */}
                                    <div className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/40 flex flex-col justify-between space-y-4">
                                        <div className="space-y-3">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[11px] font-black">
                                                <span>الخيار 3 (Electron .exe)</span>
                                            </div>
                                            <h3 className="font-black text-slate-900 dark:text-white text-base">حزمة التثبيت RestoERP-Setup.exe</h3>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                بناء حزمة ويندوز تنفيذية كاملة بمثبت احترافي NSIS للعملاء النهائيين.
                                            </p>
                                            <div className="p-3 bg-gray-100 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-[11px] flex items-center justify-between">
                                                <span>bun run desktop:dist</span>
                                                <button
                                                    onClick={() => copyToClipboard('bun run desktop:dist', 'dist')}
                                                    className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                                    title="نسخ"
                                                >
                                                    {copiedSnippet === 'dist' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-2 border-t border-gray-200 dark:border-slate-800">
                                            ✔ ملف تنفيذي تقليدي .exe <br />
                                            ✔ تحكم عميق بالطابعات والمعدات
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* Tab 2: Printers & Cash Drawer */}
                        {activeTab === 'printers' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-medium">
                                    💡 <strong>معلومة هامة:</strong> النظام متوافق مع كافة طابعات الإيصالات الحرارية (Epson, Xprinter, Rongta, Bixolon) بمقاس 80mm و 58mm عبر بروتوكول ESC/POS.
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-3 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/40">
                                        <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                            <Printer className="w-4 h-4 text-indigo-500" />
                                            1. ضبط الطابعة الحرارية في ويندوز
                                        </h4>
                                        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                                            <li>تثبيت تعريف الطابعة الرسمي (Driver) وتوصيل كابل USB.</li>
                                            <li>في لوحة تحكم ويندوز، اجعلها <strong>الطابعة الافتراضية (Default Printer)</strong>.</li>
                                            <li>من خصائص الطابعة، اضبط حجم الورق إلى: <strong>80mm x 297mm</strong> أو <strong>Roll Paper</strong>.</li>
                                            <li>اضبط الهوامش إلى <strong>0mm (None)</strong> لتفادي هدر الورق.</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-3 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/40">
                                        <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                            <HardDrive className="w-4 h-4 text-emerald-500" />
                                            2. ربط درج الكاشير الإلكتروني (Cash Drawer)
                                        </h4>
                                        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                                            <li>قم بتوصيل كابل الهاتف <strong>RJ11</strong> من درج الكاشير إلى منفذ الطابعة الحرارية المخصص.</li>
                                            <li>في خصائص الطابعة &gt; تبويب <strong>Device Settings</strong>.</li>
                                            <li>فعّل خيار <strong>Cash Drawer: Open Before Printing</strong> أو <strong>After Printing</strong>.</li>
                                            <li>سيفتح الدرج آلياً مع كل فاتورة مبيعات نقدية يتم إتمامها!</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Local LAN Multi-Terminal */}
                        {activeTab === 'network' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40 space-y-3">
                                    <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                        <Share2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        كيف تربط أجهزة المطبخ والصالة بالسيرفر الرئيسي؟
                                    </h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                        يعمل RestoERP بنظام الخادم المحلي (Local LAN Server)، حيث يمكن للجهاز الرئيسي (الكاشير) أن يستضيف النظام لجميع الأجهزة والتابلت المتصلة بنفس راوتر المطعم دون الحاجة لإنترنت!
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-2">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <Server className="w-4 h-4 text-indigo-500" />
                                            1. معرفة IP السيرفر
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400">
                                            افتح CMD في جهاز الكاشير واكتب <code className="text-indigo-600 dark:text-indigo-400 font-bold">ipconfig</code> لمعرفة عنوان IPv4 (مثلاً 192.168.1.100).
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-2">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <ChefHat className="w-4 h-4 text-amber-500" />
                                            2. شاشة المطبخ (KDS)
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400">
                                            في شاشة المطبخ، افتح المتصفح على: <br />
                                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">http://192.168.1.100:3005/kitchen</span> <br />
                                            وسجل الدخول بحساب شيف المطبخ.
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-2">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <Smartphone className="w-4 h-4 text-emerald-500" />
                                            3. تابلت النادلين والصالة
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400">
                                            في تابلت النادل، افتح المتصفح على: <br />
                                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">http://192.168.1.100:3005/tables</span> <br />
                                            لأخذ طلبات الطاولات فورياً.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 4: License & Product Key */}
                        {activeTab === 'license' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
                                    <div className="font-bold flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        نظام الحماية المشفر بالعتاد (Hardware-Locked Licensing)
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        لكل جهاز حاسوب معرّف عتاد فريد (Machine ID). عند بيع أو تثبيت النسخة لدى عميل جديد، يُطلب مفتاح منتج (Product Key) مطابق لجهازه لتفعيل النظام مدى الحياة.
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/40 space-y-4">
                                    <h4 className="font-black text-slate-900 dark:text-white text-sm">
                                        كيفية إصدار وتوليد المفتاح للعملاء (خاص بالمطورين فقط):
                                    </h4>
                                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                                        <div className="flex items-start gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">1</span>
                                            <span>يأخذ المطور معرّف الجهاز (Machine ID) الظاهر على شاشة العميل.</span>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">2</span>
                                            <span>يسجل المطور الدخول بحساب المطور الفائق (<code className="text-amber-600 dark:text-amber-400 font-bold">zafer</code> أو <code className="text-amber-600 dark:text-amber-400 font-bold">ayoub</code>).</span>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">3</span>
                                            <span>يتوجه إلى <Link href="/settings" className="text-indigo-600 dark:text-indigo-400 underline font-bold">الإعدادات</Link> &gt; تبويب <strong>⚡ مولد المفاتيح (SuperDev)</strong>.</span>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">4</span>
                                            <span>يتم إدخال معرّف الجهاز وتوليد كود التفعيل المشفر بنقرة واحدة وتقديمه للعميل للتفعيل الدائم.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 5: Technical Specs */}
                        {activeTab === 'specs' && (
                            <div className="space-y-4 animate-in fade-in duration-300 text-xs">
                                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800">
                                    <table className="w-full text-right">
                                        <thead className="bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                                            <tr>
                                                <th className="p-3.5">المكون</th>
                                                <th className="p-3.5">الحد الأدنى للتشغيل</th>
                                                <th className="p-3.5">المواصفات الموصى بها</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                                            <tr>
                                                <td className="p-3.5 font-bold text-slate-900 dark:text-white">نظام التشغيل</td>
                                                <td className="p-3.5">Windows 10 (64-bit)</td>
                                                <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">Windows 11 (64-bit) Pro</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-bold text-slate-900 dark:text-white">المعالج (CPU)</td>
                                                <td className="p-3.5">Intel Core i3 أو AMD Ryzen 3</td>
                                                <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">Intel Core i5 (الجيل 8 فما فوق)</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-bold text-slate-900 dark:text-white">الذاكرة (RAM)</td>
                                                <td className="p-3.5">4 جيجابايت</td>
                                                <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">8 جيجابايت DDR4</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-bold text-slate-900 dark:text-white">التخزين</td>
                                                <td className="p-3.5">1 جيجابايت مساحة فارغة</td>
                                                <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">قرص فائق السرعة NVMe SSD</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-bold text-slate-900 dark:text-white">الشاشة واللمس</td>
                                                <td className="p-3.5">دقة 1366x768 عادية</td>
                                                <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">شاشة لمس 1080p POS Touch Screen</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Quick Access Footer - Light & Dark Harmonized */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                                🚀
                            </div>
                            <div>
                                <h4 className="font-black text-sm text-slate-900 dark:text-white">جاهز لبدء العمل على نقطة البيع؟</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">يمكنك الدخول مباشرة إلى شاشة الكاشير وتسجيل الطلبات والورديات فوراً.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Link
                                href="/settings"
                                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold text-center transition"
                            >
                                إعدادات النظام
                            </Link>
                            <Link
                                href="/pos"
                                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black text-center shadow-md transition"
                            >
                                فتح نقطة البيع الآن
                            </Link>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
