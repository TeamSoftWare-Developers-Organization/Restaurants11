"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RotateCcw,
  Plus,
  Building2,
  Search,
  Filter,
  Eye,
  Printer,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  X,
  Package,
  Layers,
  ArrowRight,
  Trash2,
  FileText,
  CreditCard,
  Wallet
} from "lucide-react";
import {
  purchaseReturnService,
  PurchaseReturn,
  ReturnItem
} from "@/services/purchaseReturnService";

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  cost_per_unit: number;
}

interface ItemRow {
  ingredient_id: number;
  quantity: number;
  unit_price: number;
  reason: string;
}

export default function PurchaseReturnsPage() {
  const { isSidebarCollapsed } = useUIStore();
  const { isLoggedIn } = useAuthStore();
  const { settings } = useSettingsStore();
  const router = useRouter();

  const getFullLogoUrl = (path?: string) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const backendBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://127.0.0.1:8000";
    return `${backendBase}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const [isClient, setIsClient] = useState(false);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Modals
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Create Form State
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [invoiceId, setInvoiceId] = useState<number | "">("");
  const [returnNumber, setReturnNumber] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [refundMethod, setRefundMethod] = useState<"DEBT_REDUCTION" | "CASH">("DEBT_REDUCTION");
  const [generalReason, setGeneralReason] = useState("تالف أو غير مطابق للمواصفات");
  const [rows, setRows] = useState<ItemRow[]>([
    { ingredient_id: 0, quantity: 1, unit_price: 0, reason: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [returnsData, suppliersData, invoicesData, ingredientsData] = await Promise.all([
        purchaseReturnService.getReturns(),
        purchaseReturnService.getSuppliers(),
        purchaseReturnService.getInvoices(),
        purchaseReturnService.getIngredients()
      ]);
      setReturns(returnsData);
      setSuppliers(suppliersData);
      setInvoices(invoicesData);
      setIngredients(ingredientsData);
    } catch (err) {
      console.error("Failed to load purchase returns data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    if (!isLoggedIn) {
      router.push("/login");
    } else {
      loadData();
    }
  }, [isLoggedIn, router]);

  // When opening create modal, generate default return number and date
  const openCreateModal = () => {
    const today = new Date().toISOString().split("T")[0];
    const rand = Math.floor(1000 + Math.random() * 9000);
    setReturnNumber(`RET-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${rand}`);
    setReturnDate(today);
    setSupplierId("");
    setInvoiceId("");
    setRefundMethod("DEBT_REDUCTION");
    setGeneralReason("تالف أو غير مطابق للمواصفات");
    setRows([{ ingredient_id: 0, quantity: 1, unit_price: 0, reason: "" }]);
    setFormError("");
    setFormSuccess("");
    setIsCreateModalOpen(true);
  };

  // When invoice changes, prefill rows with invoice items if available
  const handleInvoiceChange = (invId: number | "") => {
    setInvoiceId(invId);
    if (!invId) return;

    const matchedInvoice = invoices.find((inv) => inv.id === Number(invId));
    if (matchedInvoice && matchedInvoice.items && matchedInvoice.items.length > 0) {
      setSupplierId(matchedInvoice.supplier_id);
      const prefilledRows: ItemRow[] = matchedInvoice.items.map((item: any) => ({
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        reason: "مرتجع من فاتورة #" + matchedInvoice.invoice_number
      }));
      setRows(prefilledRows);
    }
  };

  // Add Item Row
  const addRow = () => {
    setRows([...rows, { ingredient_id: 0, quantity: 1, unit_price: 0, reason: "" }]);
  };

  // Remove Item Row
  const removeRow = (index: number) => {
    if (rows.length === 1) {
      setRows([{ ingredient_id: 0, quantity: 1, unit_price: 0, reason: "" }]);
      return;
    }
    setRows(rows.filter((_, idx) => idx !== index));
  };

  // Update Item Row Field
  const updateRow = (index: number, field: keyof ItemRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };

    // Auto set unit price to current cost if selecting ingredient
    if (field === "ingredient_id" && Number(value) > 0) {
      const ing = ingredients.find((i) => i.id === Number(value));
      if (ing) {
        newRows[index].unit_price = Number(ing.cost_per_unit) || 0;
      }
    }

    setRows(newRows);
  };

  // Total Return Amount
  const totalReturnCalculated = rows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0),
    0
  );

  // Submit Return Form
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!supplierId) {
      setFormError("يرجى اختيار المورد أولاً.");
      return;
    }

    const validItems = rows.filter((r) => r.ingredient_id > 0 && r.quantity > 0);
    if (validItems.length === 0) {
      setFormError("يرجى إضافة مادة واحدة على الأقل بكمية صالحة.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await purchaseReturnService.createReturn({
        supplier_id: Number(supplierId),
        invoice_id: invoiceId ? Number(invoiceId) : null,
        return_number: returnNumber.trim(),
        refund_method: refundMethod,
        reason: generalReason,
        return_date: returnDate,
        items: validItems.map((r) => ({
          ingredient_id: Number(r.ingredient_id),
          quantity: Number(r.quantity),
          unit_price: Number(r.unit_price),
          reason: r.reason
        }))
      });

      setFormSuccess(`تم حفظ وترحيل المرتجع بنجاح برقم (${res.return_number}).`);
      await loadData();
      setTimeout(() => {
        setIsCreateModalOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error("Failed to create return", err);
      const msg = err.response?.data?.message || err.message || "حدث خطأ أثناء حفظ المرتجع.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const totalReturnsAmount = returns.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
    const totalCount = returns.length;
    const cashRefunded = returns
      .filter((r) => r.refund_method === "CASH")
      .reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
    const debtReduced = returns
      .filter((r) => r.refund_method === "DEBT_REDUCTION")
      .reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);

    return { totalReturnsAmount, totalCount, cashRefunded, debtReduced };
  }, [returns]);

  // Filtered Returns List
  const filteredReturns = useMemo(() => {
    return returns.filter((ret) => {
      // Method Filter
      if (methodFilter !== "ALL" && ret.refund_method !== methodFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = (ret.return_number || "").toLowerCase().includes(q);
        const matchesSup = (ret.supplier_name || "").toLowerCase().includes(q);
        const matchesInv = (ret.invoice_number || "").toLowerCase().includes(q);
        if (!matchesNum && !matchesSup && !matchesInv) return false;
      }

      return true;
    });
  }, [returns, methodFilter, searchQuery]);

  if (!isClient || !isLoggedIn) return null;

  return (
    <div className="flex flex-col lg:flex-row bg-background dark:bg-background min-h-screen w-full min-w-0 transition-colors duration-300" dir="rtl">
      <Sidebar />

      <main className={`flex-1 min-w-0 mr-0 ${isSidebarCollapsed ? "lg:mr-20" : "lg:mr-64"} min-h-screen p-3.5 sm:p-6 lg:p-8 transition-all duration-300`}>
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20 text-white shrink-0">
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">
                مرتجعات الشراء
              </h1>
              <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-[13px] font-bold opacity-70">
                إدارة إشعارات إرجاع المواد الخام للموردين وتسوية المخزون والخزينة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/purchases"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs sm:text-sm transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>فواتير الشراء</span>
            </Link>

            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>إشعار مرتجع جديد</span>
            </button>
          </div>
        </header>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
          <div className="bg-card dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-black uppercase tracking-wider mb-0.5">إجمالي المرتجعات</p>
              <h3 className="text-xl sm:text-2xl font-black text-rose-600 tabular-nums">
                {stats.totalReturnsAmount.toFixed(2)}
                <span className="text-xs font-bold text-gray-400 mr-1 italic">د.ل</span>
              </h3>
            </div>
          </div>

          <div className="bg-card dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-black uppercase tracking-wider mb-0.5">عدد إشعارات المرتجع</p>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                {stats.totalCount}
                <span className="text-xs font-bold text-gray-400 mr-1">إشعار</span>
              </h3>
            </div>
          </div>

          <div className="bg-card dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-black uppercase tracking-wider mb-0.5">استرداد نقدي (كاش للخزينة)</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">
                {stats.cashRefunded.toFixed(2)}
                <span className="text-xs font-bold text-gray-400 mr-1 italic">د.ل</span>
              </h3>
            </div>
          </div>

          <div className="bg-card dark:bg-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-black uppercase tracking-wider mb-0.5">خصم من حسابات الموردين</p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-600 tabular-nums">
                {stats.debtReduced.toFixed(2)}
                <span className="text-xs font-bold text-gray-400 mr-1 italic">د.ل</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Returns Table Container */}
        <div className="bg-card dark:bg-card rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800/40 overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 sm:p-6 border-b border-gray-50 dark:border-gray-800/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setMethodFilter("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  methodFilter === "ALL"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                الكل ({returns.length})
              </button>
              <button
                onClick={() => setMethodFilter("DEBT_REDUCTION")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  methodFilter === "DEBT_REDUCTION"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-amber-600"
                }`}
              >
                خصم من رصيد المورد ({returns.filter((r) => r.refund_method === "DEBT_REDUCTION").length})
              </button>
              <button
                onClick={() => setMethodFilter("CASH")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  methodFilter === "CASH"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-emerald-600"
                }`}
              >
                استرداد نقدي ({returns.filter((r) => r.refund_method === "CASH").length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80 group">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-rose-600 transition-colors" />
              <input
                type="text"
                placeholder="بحث برقم المرتجع، المورد، أو الفاتورة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-rose-600/10 rounded-xl pr-10 pl-4 text-xs sm:text-sm font-bold transition-all outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto text-sm">
            <table className="w-full min-w-[780px] text-right" dir="rtl">
              <thead>
                <tr className="bg-gray-50/40 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800/40">
                  <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">رقم إشعار المرتجع</th>
                  <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">المورد</th>
                  <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">الفاتورة المرجعية</th>
                  <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">تاريخ الإرجاع</th>
                  <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">طريقة الاسترداد</th>
                  <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">إجمالي القيمة</th>
                  <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 font-bold">
                      جاري تحميل سجل مرتجعات الشراء...
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-400">
                      <RotateCcw className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                      <p className="font-bold text-base text-gray-600 dark:text-gray-300">لا توجد إشعارات مرتجع شراء حالياً.</p>
                      <p className="text-xs text-gray-400 mt-1">اضغط على زر "إشعار مرتجع جديد" لإرجاع مواد خام للمورد وخصمها من المخزون.</p>
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-black text-rose-600 dark:text-rose-400 tabular-nums">
                          {ret.return_number}
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">{ret.items_count} صنف مرتجع</span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{ret.supplier_name}</div>
                        {ret.supplier_company && (
                          <div className="text-[11px] text-gray-400">{ret.supplier_company}</div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {ret.invoice_number ? (
                          <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold tabular-nums">
                            #{ret.invoice_number}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">مرتجع عام / مباشر</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold tabular-nums text-xs">
                        {ret.return_date || ret.created_at}
                      </td>

                      <td className="px-6 py-4">
                        {ret.refund_method === "CASH" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold">
                            <Wallet className="w-3.5 h-3.5" />
                            نقدي (كاش)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold">
                            <CreditCard className="w-3.5 h-3.5" />
                            خصم من الرصيد
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-black text-gray-900 dark:text-white tabular-nums text-base">
                          {Number(ret.total_amount).toFixed(2)}
                          <span className="text-xs font-bold text-gray-400 mr-1">د.ل</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedReturn(ret)}
                          className="p-2 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-gray-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-gray-600 rounded-xl transition-all"
                          title="عرض تفاصيل وسند المرتجع"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* -------------------- CREATE PURCHASE RETURN MODAL -------------------- */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card dark:bg-card rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800/40 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-rose-600/20">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">إنشاء إشعار مرتجع شراء جديد</h2>
                    <p className="text-xs text-gray-400 font-bold">تسوية إرجاع مواد خام للمورد وخصمها فورياً من المخزون</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleSubmitReturn} className="flex-1 overflow-y-auto p-6 space-y-6">
                {formError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* Return Main Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Supplier Select */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1.5">المورد المستلم *</label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}
                      required
                      className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20"
                    >
                      <option value="">-- اختر المورد --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.company_name ? `(${s.company_name})` : ""} - رصيد: {Number(s.balance).toFixed(2)} د.ل
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reference Invoice (Optional) */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1.5">الفاتورة الأصلية (اختياري)</label>
                    <select
                      value={invoiceId}
                      onChange={(e) => handleInvoiceChange(e.target.value ? Number(e.target.value) : "")}
                      className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20"
                    >
                      <option value="">-- بدون ربط بفاتورة محددة (مرتجع حر) --</option>
                      {invoices
                        .filter((inv) => !supplierId || inv.supplier_id === Number(supplierId))
                        .map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            فاتورة #{inv.invoice_number} ({inv.invoice_date}) - {inv.total_amount} د.ل
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Return Number */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1.5">رقم إشعار المرتجع *</label>
                    <input
                      type="text"
                      value={returnNumber}
                      onChange={(e) => setReturnNumber(e.target.value)}
                      required
                      className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20 tabular-nums"
                    />
                  </div>

                  {/* Return Date */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1.5">تاريخ الإرجاع</label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      required
                      className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>

                  {/* Refund Method */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1.5">طريقة تسوية قيمة المرتجع *</label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as any)}
                      className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20"
                    >
                      <option value="DEBT_REDUCTION">خصم من رصيد ومستحقات المورد (آجل)</option>
                      <option value="CASH">استرداد نقدي فوري (إيداع بالخزينة كاش)</option>
                    </select>
                  </div>

                  {/* General Reason */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1.5">سبب الإرجاع العام</label>
                    <input
                      type="text"
                      value={generalReason}
                      onChange={(e) => setGeneralReason(e.target.value)}
                      placeholder="مثال: تلف، عدم مطابقة للمواصفات، إلخ"
                      className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                </div>

                {/* Returned Items Table */}
                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs font-black text-gray-700 dark:text-gray-200">
                      الأصناف والمواد الخام المرتجعة للمورد
                    </span>
                    <button
                      type="button"
                      onClick={addRow}
                      className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg text-xs font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة صنف
                    </button>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800/40 p-2 sm:p-4 space-y-2">
                    {rows.map((row, idx) => {
                      const selectedIng = ingredients.find((i) => i.id === Number(row.ingredient_id));
                      const maxStock = selectedIng ? selectedIng.current_stock : 0;
                      const lineTotal = (Number(row.quantity) || 0) * (Number(row.unit_price) || 0);

                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end p-2.5 rounded-xl bg-gray-50/30 dark:bg-gray-900/20"
                        >
                          {/* Ingredient */}
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-bold text-gray-400 mb-1">المادة الخام</label>
                            <select
                              value={row.ingredient_id}
                              onChange={(e) => updateRow(idx, "ingredient_id", Number(e.target.value))}
                              required
                              className="w-full h-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-2 text-xs font-bold outline-none"
                            >
                              <option value={0}>-- اختر المادة --</option>
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name} (رصيد المخزن: {ing.current_stock} {ing.unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-gray-400 mb-1">
                              الكمية {selectedIng ? `(${selectedIng.unit})` : ""}
                            </label>
                            <input
                              type="number"
                              min={0.01}
                              step="any"
                              value={row.quantity}
                              onChange={(e) => updateRow(idx, "quantity", parseFloat(e.target.value) || 0)}
                              required
                              className="w-full h-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-2 text-xs font-bold outline-none tabular-nums text-center"
                            />
                            {selectedIng && row.quantity > maxStock && (
                              <span className="text-[10px] text-rose-500 font-bold block mt-0.5">
                                تنبيه: أكبر من الرصيد ({maxStock})
                              </span>
                            )}
                          </div>

                          {/* Unit Price */}
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-gray-400 mb-1">سعر الوحدة (د.ل)</label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={row.unit_price}
                              onChange={(e) => updateRow(idx, "unit_price", parseFloat(e.target.value) || 0)}
                              required
                              className="w-full h-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-2 text-xs font-bold outline-none tabular-nums text-center"
                            />
                          </div>

                          {/* Item Reason */}
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-gray-400 mb-1">سبب إرجاع الصنف</label>
                            <input
                              type="text"
                              placeholder="سبب اختياري..."
                              value={row.reason}
                              onChange={(e) => updateRow(idx, "reason", e.target.value)}
                              className="w-full h-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-2 text-xs font-bold outline-none"
                            />
                          </div>

                          {/* Total & Delete Button */}
                          <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-2">
                            <div className="sm:hidden text-xs font-black text-rose-600 tabular-nums">
                              {lineTotal.toFixed(2)} د.ل
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                              title="حذف هذا الصنف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total & Action Footer */}
                <div className="bg-gray-50/70 dark:bg-gray-900/40 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xs sm:text-sm font-black text-gray-500">إجمالي قيمة المرتجع المسترد:</span>
                    <span className="text-xl sm:text-2xl font-black text-rose-600 tabular-nums">
                      {totalReturnCalculated.toFixed(2)}
                      <span className="text-xs font-bold text-gray-400 mr-1 italic">د.ل</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-initial px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? "جاري الترحيل..." : "تأكيد وترحيل المرتجع"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* -------------------- VIEW & PRINT VOUCHER MODAL -------------------- */}
        {selectedReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card dark:bg-card rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Top Actions */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30 no-print">
                <span className="text-xs font-bold text-gray-400">معاينة سند إشعار المرتجع</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة السند</span>
                  </button>
                  <button
                    onClick={() => setSelectedReturn(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Voucher Content */}
              <div id="printable-return-voucher" className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-gray-900 text-right">
                {/* Voucher Header with Restaurant Branding */}
                <div className="flex items-start justify-between border-b pb-6 mb-6">
                  <div>
                    {settings?.logo ? (
                      <img
                        src={getFullLogoUrl(settings.logo)}
                        alt="Restaurant Logo"
                        className="h-16 w-auto object-contain mb-2"
                      />
                    ) : (
                      <h2 className="text-2xl font-black text-gray-900">{settings?.name || "مطعمنا"}</h2>
                    )}
                    <p className="text-xs text-gray-500 font-bold">{settings?.address || ""}</p>
                    {settings?.phone && <p className="text-xs text-gray-500 font-bold">هاتف: {settings.phone}</p>}
                    {settings?.tax_number && <p className="text-xs text-gray-500 font-bold">الرقم الضريبي: {settings.tax_number}</p>}
                  </div>

                  <div className="text-left">
                    <span className="inline-block px-3 py-1 bg-rose-100 text-rose-700 text-xs font-black rounded-lg mb-2">
                      سند مرتجع مشتريات (إشعار خصم)
                    </span>
                    <h3 className="text-lg font-black text-gray-900 tabular-nums">{selectedReturn.return_number}</h3>
                    <p className="text-xs text-gray-500 font-bold mt-1">تاريخ السند: {selectedReturn.return_date || selectedReturn.created_at}</p>
                    {selectedReturn.invoice_number && (
                      <p className="text-xs text-gray-600 font-bold mt-0.5">مرجع الفاتورة: #{selectedReturn.invoice_number}</p>
                    )}
                  </div>
                </div>

                {/* Supplier & Refund Details */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold block mb-1">بيانات المورد المستلم:</span>
                    <span className="font-black text-gray-900 text-sm block">{selectedReturn.supplier_name}</span>
                    {selectedReturn.supplier_company && (
                      <span className="text-gray-500 block">{selectedReturn.supplier_company}</span>
                    )}
                    {selectedReturn.supplier_phone && (
                      <span className="text-gray-500 block">هاتف: {selectedReturn.supplier_phone}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-gray-400 font-bold block mb-1">طريقة التسوية المالية:</span>
                    <span className="font-black text-gray-900 text-sm block">
                      {selectedReturn.refund_method === "CASH"
                        ? "استرداد نقدي فوري (إيداع بالخزينة)"
                        : "خصم من رصيد ومستحقات المورد (آجل)"}
                    </span>
                    {selectedReturn.reason && (
                      <span className="text-gray-500 block mt-1">سبب الإرجاع: {selectedReturn.reason}</span>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-gray-100 border-b border-gray-200 text-gray-600">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">المادة الخام</th>
                        <th className="p-3 text-center">الكمية</th>
                        <th className="p-3 text-center">سعر الوحدة</th>
                        <th className="p-3 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedReturn.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-bold text-gray-900 block">{it.ingredient_name || "مادة خام"}</span>
                            {it.reason && <span className="text-[10px] text-gray-400 block">{it.reason}</span>}
                          </td>
                          <td className="p-3 text-center font-bold tabular-nums">
                            {it.quantity} {it.unit_display || it.unit || ""}
                          </td>
                          <td className="p-3 text-center font-bold tabular-nums">
                            {Number(it.unit_price).toFixed(2)} د.ل
                          </td>
                          <td className="p-3 text-left font-black tabular-nums">
                            {(Number(it.quantity) * Number(it.unit_price)).toFixed(2)} د.ل
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-black border-t border-gray-200">
                      <tr>
                        <td colSpan={4} className="p-3 text-left text-sm">
                          إجمالي قيمة المرتجع المسترد:
                        </td>
                        <td className="p-3 text-left text-sm text-rose-600 tabular-nums">
                          {Number(selectedReturn.total_amount).toFixed(2)} د.ل
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-center text-xs text-gray-600 mt-8">
                  <div>
                    <p className="font-bold mb-10">توقيع المسؤول / أمين المخزن</p>
                    <div className="border-b border-gray-300 w-48 mx-auto" />
                  </div>
                  <div>
                    <p className="font-bold mb-10">توقيع واستلام المورد</p>
                    <div className="border-b border-gray-300 w-48 mx-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
