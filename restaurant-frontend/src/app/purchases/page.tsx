"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Sidebar } from "@/components";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Layers
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

export default function PurchasesPage() {
  const { isSidebarCollapsed } = useUIStore();
  const { isLoggedIn } = useAuthStore();
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

  useEffect(() => {
    setIsClient(true);
    if (!isLoggedIn) {
      router.push("/login");
    } else {
      loadInvoices();
    }
  }, [isLoggedIn, router]);

  if (!isClient || !isLoggedIn) return null;

  // Analytics
  const totalPurchases = invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0);
  const totalRemaining = invoices.reduce((acc, inv) => acc + (inv.remaining_amount || 0), 0);

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

  return (
    <div className="flex bg-background dark:bg-background min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-300" dir="rtl">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main
        className={`flex-1 mr-0 ${
          isSidebarCollapsed ? "lg:mr-20" : "lg:mr-64"
        } min-h-screen p-6 lg:p-8 transition-all duration-300 print:m-0 print:p-0`}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <FileText className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black leading-none mb-1">فواتير المشتريات والتوريد</h1>
              <p className="text-gray-400 dark:text-gray-500 text-[13px] font-bold">
                سجل كامل لجميع فواتير التوريد للمخزن ومتابعة المدفوعات والآجل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/suppliers"
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-xl font-bold text-xs transition active:scale-95"
            >
              <Building2 className="w-4 h-4 text-blue-500" />
              دليل الموردين
            </Link>
            <Link
              href="/purchases/new"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              + فاتورة توريد جديدة
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
                <span className="text-xs font-normal text-gray-400 mr-1.5">د.ل / ريال</span>
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
                <span className="text-xs font-normal text-gray-400 mr-1.5">د.ل / ريال</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* إجمالي الآجل والمستحق */}
          <div className="bg-white dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500">المتبقي كآجل على المطعم</span>
              <h3 className="text-2xl font-black mt-1 text-rose-500 dark:text-rose-400">
                {totalRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-normal text-gray-400 mr-1.5">د.ل / ريال</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          {/* عدد الفواتير */}
          <div className="bg-white dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500">إجمالي عدد الفواتير</span>
              <h3 className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400">
                {invoices.length}
                <span className="text-xs font-normal text-gray-400 mr-1.5">فاتورة</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers className="w-6 h-6" />
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
              الكل ({invoices.length})
            </button>
            <button
              onClick={() => setStatusFilter("RECEIVED")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                statusFilter === "RECEIVED"
                  ? "bg-emerald-600 text-white"
                  : "bg-white dark:bg-card text-gray-500 border border-gray-100 dark:border-gray-800"
              }`}
            >
              تم الترحيل
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                statusFilter === "PENDING"
                  ? "bg-amber-600 text-white"
                  : "bg-white dark:bg-card text-gray-500 border border-gray-100 dark:border-gray-800"
              }`}
            >
              مسودة
            </button>
          </div>
        </div>

        {/* Main Invoices Table */}
        <div className="bg-white dark:bg-card border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-400 dark:text-gray-500 font-bold border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="p-4">رقم الفاتورة</th>
                  <th className="p-4">المورد / الشركة</th>
                  <th className="p-4">تاريخ الفاتورة</th>
                  <th className="p-4">عدد الأصناف</th>
                  <th className="p-4">إجمالي الفاتورة</th>
                  <th className="p-4">المدفوع كاش</th>
                  <th className="p-4">المتبقي (آجل)</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-gray-400 font-bold">
                      جاري تحميل فواتير المشتريات...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-gray-400 font-bold">
                      لا توجد فواتير مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                      {/* رقم الفاتورة */}
                      <td className="p-4 font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span>{inv.invoice_number}</span>
                          <span className="block text-[11px] font-normal text-gray-400">{inv.created_at}</span>
                        </div>
                      </td>

                      {/* المورد والشركة */}
                      <td className="p-4">
                        <div className="font-bold text-gray-900 dark:text-white">{inv.supplier_name}</div>
                        <div className="text-xs text-gray-400">{inv.supplier_company || inv.supplier_phone || "—"}</div>
                      </td>

                      {/* تاريخ الفاتورة */}
                      <td className="p-4 text-gray-600 dark:text-slate-300 font-medium font-mono text-xs">
                        {inv.invoice_date || "—"}
                      </td>

                      {/* عدد الأصناف */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          <Package className="w-3.5 h-3.5" />
                          {inv.items_count} أصناف
                        </span>
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
                            {inv.status_display}
                          </span>
                        )}
                      </td>

                      {/* إجراءات */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/50 transition active:scale-95"
                          title="عرض تفاصيل الفاتورة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          عرض
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal تفاصيل ومعاينة الفاتورة للطباعة */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
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
                  <span className="font-black text-emerald-600 dark:text-emerald-400">مرحل للمخزن ✔</span>
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
                  <span className="font-mono text-gray-900 dark:text-white">{selectedInvoice.total_amount.toFixed(2)} د.ل / ريال</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span>المدفوع نقداً (كاش):</span>
                  <span className="font-mono">{selectedInvoice.paid_amount.toFixed(2)} د.ل / ريال</span>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-800 pt-2 flex justify-between text-sm font-black text-rose-500 dark:text-rose-400">
                  <span>المتبقي آجل على المنشأة:</span>
                  <span className="font-mono">{selectedInvoice.remaining_amount.toFixed(2)} د.ل / ريال</span>
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
      </main>
    </div>
  );
}
