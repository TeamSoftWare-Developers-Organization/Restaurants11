"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Sidebar } from "@/components";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PurchaseInvoiceDocument from "@/components/invoices/PurchaseInvoiceDocument";
import { useAutoPurchase } from "@/hooks/useAutoPurchase";
import {
  FileText,
  Plus,
  Building2,
  Search,
  Filter,
  Eye,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  X,
  Package,
  Layers,
  RotateCcw,
  Zap,
  Check,
  Loader2,
  Sparkles,
  Trash2,
  ArrowRight
} from "lucide-react";

interface PurchaseItem {
  id: number;
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  unit_display: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name: string;
  supplier_company: string;
  supplier_phone: string;
  supplier_tax_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  status_display: string;
  invoice_date: string;
  created_at: string;
  items_count: number;
  items: PurchaseItem[];
}

interface DepletedItemPreview {
  ingredient_id: number;
  name: string;
  unit: string;
  current_stock: number;
  suggested_qty: number;
  unit_price: number;
  estimated_total: number;
  risk_level: string;
  days_left: number | null;
}

interface SupplierOption {
  id: number;
  name: string;
  company_name?: string;
}

export default function PurchasesPage() {
  const { isSidebarCollapsed } = useUIStore();
  const { isLoggedIn } = useAuthStore();
  const { settings } = useSettingsStore();
  const router = useRouter();

  const [isClient, setIsClient] = useState(false);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/purchases/");
      setInvoices(res.data);
    } catch (err) {
      console.error("Failed to load purchase invoices", err);
    } finally {
      setIsLoading(false);
    }
  };

  const {
    isAutoPOModalOpen,
    setIsAutoPOModalOpen,
    isLoadingAutoPOPreview,
    isSubmittingAutoPO,
    autoPOItems,
    suppliersList,
    selectedSupplierId,
    setSelectedSupplierId,
    receivingInvoiceId,
    notification,
    setNotification,
    openAutoPOModal,
    handleQuantityChange,
    handleRemoveItem,
    handleConfirmAutoPO,
    handleReceiveInvoice: receiveInvoiceHook
  } = useAutoPurchase({
    onSuccess: loadInvoices
  });

  const handleReceiveInvoice = async (invoiceId: number) => {
    await receiveInvoiceHook(invoiceId, () => {
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice((prev) => (prev ? { ...prev, status: "RECEIVED", status_display: "تم الترحيل" } : null));
      }
    });
  };

  useEffect(() => {
    setIsClient(true);
    if (!isLoggedIn) {
      router.push("/login");
    } else {
      loadInvoices();

      // Check if URL has ?auto=true
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("auto") === "true") {
          openAutoPOModal();
        }
      }
    }
  }, [isLoggedIn, router]);

  // Auto-dismiss notification after 6 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!isClient || !isLoggedIn) return null;

  // Analytics
  const totalPurchases = invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0);
  const totalRemaining = invoices.reduce((acc, inv) => acc + (inv.remaining_amount || 0), 0);
  const pendingOrdersCount = invoices.filter((inv) => inv.status === "PENDING").length;

  // Filters
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.supplier_company && inv.supplier_company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inv.supplier_phone && inv.supplier_phone.includes(searchQuery));

    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handlePrint = () => {
    window.print();
  };

  const autoPOTotalSum = autoPOItems.reduce((acc, it) => acc + (it.estimated_total || 0), 0);

  return (
    <div className="flex flex-col lg:flex-row bg-background dark:bg-background min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-300 min-w-0 w-full" dir="rtl">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main
        className={`flex-1 mr-0 ${
          isSidebarCollapsed ? "lg:mr-20" : "lg:mr-64"
        } min-h-screen p-3.5 sm:p-6 lg:p-8 min-w-0 w-full transition-all duration-300 print:m-0 print:p-0`}
      >
        {/* Toast Notification */}
        {notification && (
          <div
            className={`mb-5 p-4 rounded-2xl flex items-center justify-between border shadow-lg print:hidden animate-in fade-in slide-in-from-top duration-300 ${
              notification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-500/30 text-rose-800 dark:text-rose-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-bold">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 print:hidden">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-10 sm:w-11 h-10 sm:h-11 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
              <FileText className="text-white w-5 sm:w-6 h-5 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black leading-none mb-1">فواتير المشتريات والتوريد</h1>
              <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-[13px] font-bold">
                سجل كامل لجميع فواتير التوريد للمخزن ومتابعة المدفوعات والآجل وأوامر الشراء المؤتمتة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {/* زر الأتمتة التلقائية لأوامر الشراء بنقرة واحدة */}
            <button
              type="button"
              onClick={openAutoPOModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 sm:px-5 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-amber-500/25 transition active:scale-95"
            >
              <Zap className="w-4 h-4 fill-white text-white animate-pulse" />
              توليد أمر شراء آلي ⚡
            </button>

            <Link
              href="/suppliers"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs transition active:scale-95"
            >
              <Building2 className="w-4 h-4 text-blue-500" />
              دليل الموردين
            </Link>
            <Link
              href="/purchases/returns"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-rose-500" />
              مرتجع الشراء
            </Link>
            <Link
              href="/purchases/new"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              فاتورة جديدة
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:hidden">
          {/* إجمالي المشتريات */}
          <div className="bg-white dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500">إجمالي قيمة المشتريات</span>
              <h3 className="text-2xl font-black mt-1 text-gray-900 dark:text-white">
                {totalPurchases.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-normal text-gray-400 mr-1.5">د.ل</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* إجمالي المدفوع نقداً */}
          <div className="bg-white dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500">إجمالي المدفوع كاش</span>
              <h3 className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                {totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-normal text-gray-400 mr-1.5">د.ل</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* أوامر شراء معلقة / قيد التوريد */}
          <div className="bg-white dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500">أوامر شراء معلقة (مسودات)</span>
              <h3 className="text-2xl font-black mt-1 text-amber-500 dark:text-amber-400">
                {pendingOrdersCount}
                <span className="text-xs font-normal text-gray-400 mr-1.5">أمر معلق</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* إجمالي الآجل والمستحق */}
          <div className="bg-white dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500">المتبقي كآجل على المطعم</span>
              <h3 className="text-2xl font-black mt-1 text-rose-500 dark:text-rose-400">
                {totalRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-normal text-gray-400 mr-1.5">د.ل</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 print:hidden items-center justify-between">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الفاتورة، المورد، الشركة..."
              className="w-full h-11 bg-white dark:bg-card border border-gray-100 dark:border-gray-800 rounded-xl pr-10 pl-4 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-emerald-600/10"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                statusFilter === "ALL"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-white dark:bg-card text-gray-500 border border-gray-100 dark:border-gray-800"
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                statusFilter === "PENDING"
                  ? "bg-amber-500 text-white"
                  : "bg-white dark:bg-card text-gray-500 border border-gray-100 dark:border-gray-800"
              }`}
            >
              مسودة (معلقة)
            </button>
            <button
              onClick={() => setStatusFilter("RECEIVED")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                statusFilter === "RECEIVED"
                  ? "bg-emerald-600 text-white"
                  : "bg-white dark:bg-card text-gray-500 border border-gray-100 dark:border-gray-800"
              }`}
            >
              مرحلة للمخزن
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white dark:bg-card border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-right text-xs">
              <thead className="bg-gray-50/70 dark:bg-slate-900/60 text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="p-4">رقم الفاتورة</th>
                  <th className="p-4">المورد والشركة</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">عدد الأصناف</th>
                  <th className="p-4">إجمالي الفاتورة</th>
                  <th className="p-4">المدفوع كاش</th>
                  <th className="p-4">المتبقي آجل</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                        <span>جاري تحميل فواتير المشتريات...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-gray-400 font-bold">
                      لا توجد فواتير توريد مطابقة للبحث أو الفلتر
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* رقم الفاتورة */}
                      <td className="p-4 font-mono font-bold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {inv.invoice_number.startsWith("PO-AUTO") && (
                            <span className="p-1 bg-amber-500/10 text-amber-500 rounded-md" title="أمر شراء آلي">
                              <Zap className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span>{inv.invoice_number}</span>
                        </div>
                      </td>

                      {/* المورد */}
                      <td className="p-4">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {inv.supplier_name}
                        </div>
                        {inv.supplier_company && (
                          <div className="text-[11px] text-gray-400">
                            {inv.supplier_company}
                          </div>
                        )}
                      </td>

                      {/* التاريخ */}
                      <td className="p-4 text-gray-500 dark:text-slate-400 font-mono">
                        {inv.invoice_date || inv.created_at}
                      </td>

                      {/* عدد الأصناف */}
                      <td className="p-4 font-medium text-gray-700 dark:text-slate-300">
                        {inv.items_count} أصناف
                      </td>

                      {/* الإجمالي */}
                      <td className="p-4 font-black text-gray-900 dark:text-white">
                        {inv.total_amount.toFixed(2)}
                      </td>

                      {/* المدفوع */}
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {inv.paid_amount.toFixed(2)}
                      </td>

                      {/* المتبقي */}
                      <td className="p-4 font-bold">
                        {inv.remaining_amount > 0 ? (
                          <span className="text-rose-500 dark:text-rose-400">
                            {inv.remaining_amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-500 text-xs font-bold">0.00 (مسددة)</span>
                        )}
                      </td>

                      {/* الحالة */}
                      <td className="p-4">
                        {inv.status === "RECEIVED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            تم الترحيل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                            <Clock className="w-3 h-3" />
                            مسودة معلقة
                          </span>
                        )}
                      </td>

                      {/* إجراءات */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {inv.status === "PENDING" && (
                            <button
                              onClick={() => handleReceiveInvoice(inv.id)}
                              disabled={receivingInvoiceId === inv.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                              title="استلام الفاتورة وترحيل الكميات للمخزن"
                            >
                              {receivingInvoiceId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>استلام للمخزن ✓</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/50 transition active:scale-95"
                            title="عرض تفاصيل الفاتورة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            عرض
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal توليد مسودة أمر الشراء التلقائي بالذكاء الاصطناعي (One-Click Auto PO) */}
        {isAutoPOModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 no-print">
            <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Zap className="w-6 h-6 fill-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                      توليد مسودة أمر شراء آلي (One-Click Auto PO)
                      <span className="text-xs bg-amber-500/10 text-amber-500 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                        مؤتمت ذكياً
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      فحص تلقائي للمواد المعرضة للنفاد ومعدلات الاستهلاك واقتراح كميات إعادة الطلب
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAutoPOModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isLoadingAutoPOPreview ? (
                <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <span className="text-sm font-bold">جاري تحليل مستويات المخزون وحساب كميات الشراء المقترحة...</span>
                </div>
              ) : (
                <>
                  {/* اختيار المورد */}
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">
                        توجيه أمر الشراء إلى المورد:
                      </label>
                      <span className="text-xs text-gray-400">
                        سيتم حفظ أمر الشراء كمسودة رسمية موجهة لهذا المورد
                      </span>
                    </div>
                    <div className="w-full sm:w-64">
                      <select
                        value={selectedSupplierId}
                        onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full h-10 bg-white dark:bg-[#1a233a] border border-gray-200 dark:border-slate-700 rounded-xl px-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {suppliersList.map((sup) => (
                          <option key={sup.id} value={sup.id}>
                            {sup.name} {sup.company_name ? `(${sup.company_name})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* قائمة المواد المقترحة للطلب */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-gray-700 dark:text-slate-300">
                        المواد المطلوب شراؤها ({autoPOItems.length} مواد):
                      </span>
                      <span className="text-xs text-gray-400">
                        يمكنك تعديل الكميات المقترحة قبل الاعتماد
                      </span>
                    </div>

                    <div className="border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-400 font-bold border-b border-gray-100 dark:border-slate-800 sticky top-0">
                          <tr>
                            <th className="p-3">المادة الخام</th>
                            <th className="p-3">الرصيد الحالي</th>
                            <th className="p-3">الكمية المقترحة</th>
                            <th className="p-3">سعر الوحدة</th>
                            <th className="p-3">الإجمالي التقديري</th>
                            <th className="p-3 text-center">إلغاء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                          {autoPOItems.map((item, idx) => (
                            <tr key={item.ingredient_id} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/30">
                              <td className="p-3 font-bold text-gray-900 dark:text-white">
                                <div className="flex items-center gap-1.5">
                                  {item.risk_level === "CRITICAL" ? (
                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="نفاد وشيك" />
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="تحذير استهلاك" />
                                  )}
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td className="p-3 text-gray-500 font-mono">
                                {item.current_stock} {item.unit}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0.1"
                                    step="0.5"
                                    value={item.suggested_qty}
                                    onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 0)}
                                    className="w-20 h-8 px-2 bg-white dark:bg-[#1a233a] border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                  <span className="text-[11px] text-gray-400">{item.unit}</span>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-gray-600 dark:text-slate-300">
                                {item.unit_price.toFixed(2)}
                              </td>
                              <td className="p-3 font-black text-gray-900 dark:text-white font-mono">
                                {item.estimated_total.toFixed(2)} د.ل
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-gray-400 hover:text-rose-500 p-1 transition"
                                  title="إزالة هذا الصنف من أمر الشراء"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ملخص أمر الشراء */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                        إجمالي القيمة التقديرية لأمر الشراء
                      </span>
                      <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                        سيتم إنشاء الفاتورة بوضع مسودة (معلقة) لحين استلامها رسمياً
                      </span>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-2xl font-black text-amber-900 dark:text-amber-200">
                        {autoPOTotalSum.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-400 mr-1">د.ل</span>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAutoPOModalOpen(false)}
                      disabled={isSubmittingAutoPO}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAutoPO}
                      disabled={isSubmittingAutoPO || autoPOItems.length === 0}
                      className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
                    >
                      {isSubmittingAutoPO ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري توليد مسودة أمر الشراء...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-white" />
                          <span>تأكيد وتوليد مسودة أمر الشراء (Draft PO) ⚡</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal تفاصيل ومعاينة الفاتورة للطباعة أو الاستلام */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 no-print">
            <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                      فاتورة توريد #{selectedInvoice.invoice_number}
                    </h2>
                    <p className="text-xs text-gray-400">تاريخ الفاتورة: {selectedInvoice.invoice_date || selectedInvoice.created_at}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-3.5 py-2 rounded-xl text-xs font-bold transition"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة
                  </button>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* تنبيه إذا كانت مسودة أمر شراء معلقة */}
              {selectedInvoice.status === "PENDING" && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                        مسودة أمر شراء معلقة (لم يتم الترحيل للمخزن بعد)
                      </h4>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        يمكنك اعتماد واستلام الكميات بنقرة واحدة لتحديث أرصدة المخزون وحساب المورد فورياً.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleReceiveInvoice(selectedInvoice.id)}
                    disabled={receivingInvoiceId === selectedInvoice.id}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {receivingInvoiceId === selectedInvoice.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>استلام وترحيل للمخزن ✓</span>
                  </button>
                </div>
              )}

              {/* بيانات المورد */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800/60 text-xs">
                <div>
                  <span className="text-gray-400 block font-bold mb-0.5">المورد</span>
                  <span className="font-black text-gray-900 dark:text-white">{selectedInvoice.supplier_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold mb-0.5">الشركة</span>
                  <span className="font-bold text-gray-700 dark:text-slate-300">{selectedInvoice.supplier_company || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold mb-0.5">رقم الهاتف</span>
                  <span className="font-bold text-gray-700 dark:text-slate-300 font-mono" dir="ltr">{selectedInvoice.supplier_phone || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold mb-0.5">الحالة بالمخزن</span>
                  {selectedInvoice.status === "RECEIVED" ? (
                    <span className="font-black text-emerald-600 dark:text-emerald-400">مرحل للمخزن ✔</span>
                  ) : (
                    <span className="font-black text-amber-500">معلقة للمراجعة</span>
                  )}
                </div>
              </div>

              {/* جدول بنود الفاتورة */}
              <div className="border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-400 font-bold border-b border-gray-100 dark:border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">المادة الخام</th>
                      <th className="p-3">الكمية</th>
                      <th className="p-3">سعر الوحدة</th>
                      <th className="p-3 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/30">
                        <td className="p-3 text-gray-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-bold text-gray-900 dark:text-white">{item.ingredient_name}</td>
                        <td className="p-3 font-medium text-gray-600 dark:text-slate-300">
                          {item.quantity} {item.unit_display || item.unit}
                        </td>
                        <td className="p-3 font-mono text-gray-600 dark:text-slate-300">{item.unit_price.toFixed(2)}</td>
                        <td className="p-3 font-black text-gray-900 dark:text-white text-left font-mono">
                          {item.total_price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ملخص المبالغ في الفاتورة */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-slate-400">
                  <span>إجمالي قيمة الفاتورة:</span>
                  <span className="font-mono text-gray-900 dark:text-white">{selectedInvoice.total_amount.toFixed(2)} د.ل</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span>المدفوع نقداً (كاش):</span>
                  <span className="font-mono">{selectedInvoice.paid_amount.toFixed(2)} د.ل</span>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-800 pt-2 flex justify-between text-sm font-black text-rose-500 dark:text-rose-400">
                  <span>المتبقي آجل على المنشأة:</span>
                  <span className="font-mono">{selectedInvoice.remaining_amount.toFixed(2)} د.ل</span>
                </div>
              </div>

              {/* زر الإغلاق */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition active:scale-95"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printable Purchase Invoice Document */}
        {selectedInvoice && (
          <div id="printable-purchase-invoice" className="hidden print:block">
            <PurchaseInvoiceDocument
              settings={settings}
              invoiceData={selectedInvoice}
            />
          </div>
        )}
      </main>
    </div>
  );
}
