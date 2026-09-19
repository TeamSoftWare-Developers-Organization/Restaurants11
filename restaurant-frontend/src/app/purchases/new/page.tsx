"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Sidebar } from "@/components";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Trash2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  cost_per_unit?: number;
  current_stock?: number;
}

interface ItemRow {
  ingredient_id: number;
  quantity: number;
  unit_price: number;
}

export default function NewPurchasePage() {
  const { isSidebarCollapsed } = useUIStore();
  const { isLoggedIn } = useAuthStore();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [rows, setRows] = useState<ItemRow[]>([{ ingredient_id: 0, quantity: 1, unit_price: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setIsClient(true);
    if (!isLoggedIn) {
      router.push("/login");
    } else {
      api.get("/suppliers/").then((res) => setSuppliers(res.data)).catch(console.error);
      api.get("/inventory/ingredients/").then((res) => setIngredients(res.data)).catch(console.error);
    }
  }, [isLoggedIn, router]);

  const addRow = () => {
    setRows([...rows, { ingredient_id: 0, quantity: 1, unit_price: 0 }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) {
      setRows([{ ingredient_id: 0, quantity: 1, unit_price: 0 }]);
      return;
    }
    setRows(rows.filter((_, idx) => idx !== index));
  };

  const updateRow = (index: number, field: keyof ItemRow, value: number) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const invoiceTotal = rows.reduce((acc, r) => acc + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
  const remainingAmount = invoiceTotal - (Number(paidAmount) || 0);

  const handleSubmit = async () => {
    setErrorMsg("");
    if (!supplierId) {
      setErrorMsg("يرجى اختيار المورد أولاً");
      return;
    }
    if (!invoiceNumber.trim()) {
      setErrorMsg("يرجى إدخال رقم الفاتورة الورقية أو كود الشراء");
      return;
    }
    const validItems = rows.filter((r) => r.ingredient_id > 0 && r.quantity > 0);
    if (validItems.length === 0) {
      setErrorMsg("يرجى اختيار مادة خام واحدة على الأقل وتحديد الكمية");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/purchases/create-and-receive/", {
        supplier_id: Number(supplierId),
        invoice_number: invoiceNumber.trim(),
        paid_amount: Number(paidAmount) || 0,
        items: validItems.map(item => ({
          ingredient_id: Number(item.ingredient_id),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price)
        })),
      });

      alert("تم حفظ الفاتورة وترحيل المواد للمخزن وتحديث متوسط التكلفة بنجاح!");
      router.push("/inventory");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "حدث خطأ أثناء حفظ الفاتورة والترحيل");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isClient || !isLoggedIn) return null;

  return (
    <div className="flex bg-background dark:bg-background min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-300" dir="rtl">
      <Sidebar />

      <main className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-6 lg:p-8 transition-all duration-300`}>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <ShoppingCart className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black leading-none mb-1">فاتورة مشتريات وتوريد مخزون جديدة</h1>
                <p className="text-gray-400 dark:text-gray-500 text-[13px] font-bold">
                  سيتم إضافة الكميات مباشرة إلى رصيد المواد الخام وتحديث متوسط تكلفة الوحدة آلياً
                </p>
              </div>
            </div>

            <Link
              href="/suppliers"
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition"
            >
              <ArrowRight className="w-4 h-4" />
              الرجوع لدليل الموردين
            </Link>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-bold animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* الحقول الأساسية للفاتورة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-card p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block">المورد المسؤول *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}
                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-600/20"
              >
                <option value="">اختر المورد...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.company_name ? `(${s.company_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block">رقم الفاتورة الورقية / المورد *</label>
              <input
                placeholder="مثال: INV-9842"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block">المبلغ المدفوع نقداً (كاش)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
          </div>

          {/* بنود الفاتورة والمخزون */}
          <div className="bg-white dark:bg-card p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-black text-gray-900 dark:text-white">أصناف المواد الخام المشتراة</h2>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" />
                إضافة مادة أخرى
              </button>
            </div>

            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-gray-50/70 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/40">
                  <div className="col-span-12 sm:col-span-5">
                    <select
                      value={row.ingredient_id}
                      onChange={(e) => updateRow(idx, "ingredient_id", Number(e.target.value))}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-600/20"
                    >
                      <option value={0}>اختر المادة الخام من المخزن...</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit}) - الرصيد الحالي: {ing.current_stock ?? 0}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-5 sm:col-span-3">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="الكمية"
                        min="0.01"
                        step="any"
                        value={row.quantity || ""}
                        onChange={(e) => updateRow(idx, "quantity", Number(e.target.value))}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-600/20"
                      />
                    </div>
                  </div>

                  <div className="col-span-5 sm:col-span-2">
                    <input
                      type="number"
                      placeholder="سعر شراء الوحدة"
                      min="0"
                      step="any"
                      value={row.unit_price || ""}
                      onChange={(e) => updateRow(idx, "unit_price", Number(e.target.value))}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-600/20"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 text-center font-black text-gray-800 dark:text-gray-200 text-sm">
                    {(Number(row.quantity) * Number(row.unit_price)).toFixed(2)}
                  </div>

                  <div className="col-span-12 sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      title="حذف البند"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ملخص المبالغ والترحيل */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-5 mt-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400">إجمالي قيمة الفاتورة:</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">
                  {invoiceTotal.toFixed(2)} <span className="text-sm font-normal text-gray-400">د.ل</span>
                </p>
                <p className={`text-xs font-bold ${remainingAmount > 0 ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400"}`}>
                  {remainingAmount > 0
                    ? `المتبقي كآجل مستحق للمورد: ${remainingAmount.toFixed(2)} د.ل`
                    : "الفاتورة مسددة بالكامل"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-8 py-3.5 rounded-xl font-black text-sm shadow-lg shadow-emerald-600/25 active:scale-95 transition"
              >
                <CheckCircle2 className="w-5 h-5" />
                {isSubmitting ? "جاري الترحيل..." : "حفظ وترحيل للمخزن فوراً 📥"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
