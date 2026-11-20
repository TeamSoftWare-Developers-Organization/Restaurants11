'use client';

import React, { useState } from 'react';
import { 
    Keyboard, 
    Search, 
    Zap, 
    ShoppingCart, 
    Maximize2, 
    Printer, 
    Sliders, 
    Lock, 
    HelpCircle, 
    Sparkles, 
    Monitor 
} from 'lucide-react';

interface ShortcutItem {
    keys: string[];
    description: string;
    actionCategory: 'pos' | 'navigation' | 'system' | 'superdev';
    badge?: string;
}

export default function SystemShortcutsGuide() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'pos' | 'navigation' | 'system' | 'superdev'>('all');

    const shortcuts: ShortcutItem[] = [
        // نقطة البيع POS
        {
            keys: ['Enter'],
            description: 'مسح وقراءة الباركود فورياً وإضافة الصنف مباشرة إلى سلة المشتريات',
            actionCategory: 'pos',
            badge: 'شاشة POS'
        },
        {
            keys: ['F2'],
            description: 'التركيز المباشر على حقل مسح الباركود وإدخال الأصناف السريعة',
            actionCategory: 'pos',
            badge: 'شاشة POS'
        },
        {
            keys: ['F4'],
            description: 'فتح نافذة الدفع السريع المباشر وإتمام الفاتورة',
            actionCategory: 'pos',
            badge: 'شاشة POS'
        },
        {
            keys: ['Space'],
            description: 'تعليق الطلب الحالي (حفظ كطلب معلق واستقبال زبون آخر)',
            actionCategory: 'pos',
            badge: 'شاشة POS'
        },
        {
            keys: ['Ctrl', 'P'],
            description: 'طباعة الإيصال الحراري 80mm أو فاتورة المبيعات الحالية',
            actionCategory: 'pos',
            badge: 'طباعة'
        },
        {
            keys: ['Esc'],
            description: 'إلغاء الأمر، أو إغلاق النوافذ المنبثقة وسندات الصرف المفتوحة',
            actionCategory: 'system',
            badge: 'عام'
        },

        // التنقل وشاشات النظام
        {
            keys: ['F11'],
            description: 'التبديل بين وضع ملء الشاشة (Fullscreen) والوضع العادي على سطح المكتب',
            actionCategory: 'system',
            badge: 'سطح المكتب'
        },
        {
            keys: ['Alt', 'P'],
            description: 'الانتقال الفوري والمباشر إلى شاشة نقطة البيع والكاشير (POS)',
            actionCategory: 'navigation',
            badge: 'تنقل سريع'
        },
        {
            keys: ['Alt', 'D'],
            description: 'الانتقال السريع إلى لوحة التحكم والمؤشرات التشغيلية (Dashboard)',
            actionCategory: 'navigation',
            badge: 'تنقل سريع'
        },
        {
            keys: ['Alt', 'O'],
            description: 'الانتقال المباشر إلى شاشة سجل ومتابعة الطلبات (Orders)',
            actionCategory: 'navigation',
            badge: 'تنقل سريع'
        },
        {
            keys: ['Alt', 'I'],
            description: 'الانتقال المباشر إلى شاشة إدارة المخزون والمواد الخام (Inventory)',
            actionCategory: 'navigation',
            badge: 'تنقل سريع'
        },
        {
            keys: ['Alt', 'S'],
            description: 'الانتقال إلى شاشة الإعدادات العامة للمطعم (Settings)',
            actionCategory: 'navigation',
            badge: 'تنقل سريع'
        },

        // النظام والنافذة
        {
            keys: ['Ctrl', 'Shift', 'R'],
            description: 'إعادة تحميل وتحديث بيانات النظام والمزامنة السحابية قسرياً',
            actionCategory: 'system',
            badge: 'تحديث'
        },
        {
            keys: ['Ctrl', 'Shift', 'Alt', 'D'],
            description: 'فتح بوابة مصادقة واعتماد جهاز المطور الفائق (SuperDev Device Pairing)',
            actionCategory: 'superdev',
            badge: 'سري للمطورين'
        }
    ];

    const filteredShortcuts = shortcuts.filter(s => {
        const matchesCategory = selectedCategory === 'all' || s.actionCategory === selectedCategory;
        const matchesSearch = !searchQuery.trim() || 
            s.description.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
            s.keys.join(' ').toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
            (s.badge && s.badge.toLowerCase().includes(searchQuery.toLowerCase().trim()));
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-6 animate-in fade-in duration-300">
            {/* Header & Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Keyboard className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                اختصارات لوحة المفاتيح للنظام
                                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                                    Keyboard Shortcuts
                                </span>
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                تسهيل وتسريع عمليات الكاشير وإدارة نقاط البيع والتنقل السريع في النظام عبر المفاتيح المباشرة.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث عن اختصار أو مفتاح..."
                        className="w-full h-10 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl pr-9 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        selectedCategory === 'all'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                    الكل ({shortcuts.length})
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedCategory('pos')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        selectedCategory === 'pos'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/40'
                    }`}
                >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    نقطة البيع والكاشير (POS)
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedCategory('navigation')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        selectedCategory === 'navigation'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/40'
                    }`}
                >
                    <Zap className="w-3.5 h-3.5" />
                    التنقل السريع بين الشاشات
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedCategory('system')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        selectedCategory === 'system'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/40'
                    }`}
                >
                    <Monitor className="w-3.5 h-3.5" />
                    شاشة النظام وسطح المكتب
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedCategory('superdev')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        selectedCategory === 'superdev'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/40'
                    }`}
                >
                    <Lock className="w-3.5 h-3.5" />
                    المطورون (SuperDev)
                </button>
            </div>

            {/* Shortcuts Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredShortcuts.length > 0 ? (
                    filteredShortcuts.map((shortcut, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-3.5 bg-gray-50/80 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group"
                        >
                            <div className="space-y-1 pr-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-gray-800 dark:text-gray-200 leading-tight">
                                        {shortcut.description}
                                    </span>
                                    {shortcut.badge && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                            shortcut.actionCategory === 'pos'
                                                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                                                : shortcut.actionCategory === 'superdev'
                                                ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-mono'
                                                : 'bg-gray-200/70 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                        }`}>
                                            {shortcut.badge}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Keyboard Keys Badges */}
                            <div className="flex items-center gap-1.5 shrink-0 pl-1">
                                {shortcut.keys.map((k, kIdx) => (
                                    <React.Fragment key={kIdx}>
                                        <kbd className="min-w-[28px] h-7 px-2 flex items-center justify-center font-mono font-black text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm group-hover:border-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {k}
                                        </kbd>
                                        {kIdx < shortcut.keys.length - 1 && (
                                            <span className="text-gray-400 font-bold text-xs">+</span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 p-10 text-center text-gray-400 font-bold">
                        لم يتم العثور على أي اختصار يطابق بحثك: &quot;{searchQuery}&quot;
                    </div>
                )}
            </div>

            {/* Quick Tips Footer Card */}
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed font-medium">
                    <strong>نصيحة لتشغيل الكاشير السريع:</strong> يمكنك العمل على شاشة نقطة البيع بالكامل دون استخدام الفأرة؛ بمجرد مسح الباركود بجهاز القارئ أو كتابته ثم الضغط على <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded font-mono font-bold text-[11px] border">Enter</kbd> سيتم إضافة الصنف فوراً، ويمكنك الضغط على <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded font-mono font-bold text-[11px] border">F11</kbd> لجعل الشاشة ملء الشاشة بنمط جهاز الكاشير المخصص.
                </div>
            </div>
        </div>
    );
}
