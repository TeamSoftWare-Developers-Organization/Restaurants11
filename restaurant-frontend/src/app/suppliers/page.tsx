"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Sidebar } from "@/components";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { Building2, Plus, ShoppingCart, Search } from "lucide-react";
import Link from "next/link";

interface Supplier {
  id: number;
  name: string;
  company_name: string;
  phone: string;
  tax_number: string;
  balance: number;
}

export default function SuppliersPage() {
  const { isSidebarCollapsed } = useUIStore();
  const { isLoggedIn } = useAuthStore();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", company_name: "", phone: "", tax_number: "" });
  const [isLoading, setIsLoading] = useState(true);

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/suppliers/");
      setSuppliers(res.data);
    } catch (error) {
      console.error("Failed to load suppliers", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    if (!isLoggedIn) {
      router.push("/login");
    } else {
      loadSuppliers();
    }
  }, [isLoggedIn, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/suppliers/", formData);
      setShowModal(false);
      setFormData({ name: "", company_name: "", phone: "", tax_number: "" });
      loadSuppliers();
    } catch (error) {
      console.error("Failed to create supplier", error);
      alert("حدث خطأ أثناء حفظ بيانات المورد");
    }
  };

  if (!isClient || !isLoggedIn) return null;

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.company_name && s.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.phone && s.phone.includes(searchQuery))
  );

  return (
    <div className="flex bg-background dark:bg-background min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-300" dir="rtl">
      <Sidebar />

      <main className={`flex-1 mr-0 ${isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'} min-h-screen p-6 lg:p-8 transition-all duration-300`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Building2 className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black leading-none mb-1">دليل الموردين</h1>
              <p className="text-gray-400 dark:text-gray-500 text-[13px] font-bold">إدارة الشركات والموردين ومتابعة الأرصدة والمستحقات</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/purchases/new"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              فاتورة مشتريات جديدة
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              إضافة مورد جديد
            </button>
          </div>
        </div>

        {/* شريط البحث */}
        <div className="mb-6">
          <div className="relative w-full md:w-80 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الموردين..."
              className="w-full h-11 bg-white dark:bg-card border border-gray-100 dark:border-gray-800 rounded-xl pr-10 pl-4 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-600/10"
            />
          </div>
        </div>

        {/* جدول الموردين */}
        <div className="bg-white dark:bg-card border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-400 dark:text-gray-500 font-bold border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="p-4">اسم المورد</th>
                <th className="p-4">الشركة</th>
                <th className="p-4">الهاتف</th>
                <th className="p-4">الرقم الضريبي</th>
                <th className="p-4">المستحقات المتبقية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">جاري تحميل بيانات الموردين...</td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">لا يوجد موردين مسجلين حالياً</td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 font-bold text-gray-900 dark:text-white">{s.name}</td>
                    <td className="p-4 text-gray-600 dark:text-slate-300 font-medium">{s.company_name || "—"}</td>
                    <td className="p-4 text-gray-500 dark:text-slate-400 font-mono" dir="ltr">{s.phone}</td>
                    <td className="p-4 text-gray-500 dark:text-slate-400 font-mono">{s.tax_number || "—"}</td>
                    <td className="p-4 text-rose-500 dark:text-rose-400 font-black">{Number(s.balance).toFixed(2)} د.ل</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal إضافة مورد */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <form onSubmit={handleCreate} className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">بيانات المورد الجديد</h3>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">اسم المورد المسؤول *</label>
                <input
                  placeholder="مثال: أحمد عبد الله"
                  className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">اسم الشركة / المؤسسة</label>
                <input
                  placeholder="اسم الشركة أو الموزع"
                  className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">رقم الهاتف *</label>
                <input
                  placeholder="09XXXXXXXX"
                  type="tel"
                  className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400">الرقم الضريبي</label>
                <input
                  placeholder="الرقم الضريبي إن وجد"
                  className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/20"
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-gray-500 dark:text-slate-400 text-sm font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition">إلغاء</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition">حفظ</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
