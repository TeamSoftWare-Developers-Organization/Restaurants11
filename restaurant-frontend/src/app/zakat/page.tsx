"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useRouter } from "next/navigation";
import {
  Coins,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  FileText,
  Printer,
  X,
  CreditCard,
  Wallet,
  Building2,
  HelpCircle,
  Plus,
  Scale,
  Sparkles,
  TrendingUp,
  DollarSign,
  Trash2,
  Eye,
  Info
} from "lucide-react";
import {
  zakatService,
  LiveZakatSummary,
  ZakatCalculation,
  CreateZakatInput
} from "@/services/zakatService";
import { confirmDialog, alertDialog } from "@/store/modalStore";

export default function ZakatPage() {
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
  const [activeTab, setActiveTab] = useState<"calculator" | "archive" | "guidelines">("calculator");
  const [liveSummary, setLiveSummary] = useState<LiveZakatSummary | null>(null);
  const [calculations, setCalculations] = useState<ZakatCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculator Form State
  const [title, setTitle] = useState(`حسبة زكاة عروض التجارة - ${new Date().getFullYear()}`);
  const [calcDate, setCalcDate] = useState(new Date().toISOString().split("T")[0]);
  const [yearType, setYearType] = useState<"HIJRI" | "GREGORIAN">("HIJRI");
  const [goldGramPrice, setGoldGramPrice] = useState<number>(380);

  // Zakatable Assets
  const [cashInHand, setCashInHand] = useState<number>(0);
  const [cashInBank, setCashInBank] = useState<number>(0);
  const [inventoryValue, setInventoryValue] = useState<number>(0);
  const [accountsReceivable, setAccountsReceivable] = useState<number>(0);
  const [otherAssets, setOtherAssets] = useState<number>(0);

  // Deductible Liabilities
  const [accountsPayable, setAccountsPayable] = useState<number>(0);
  const [accruedExpenses, setAccruedExpenses] = useState<number>(0);
  const [otherLiabilities, setOtherLiabilities] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // UI / Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  // Modals
  const [selectedCalc, setSelectedCalc] = useState<ZakatCalculation | null>(null);
  const [disbursementModalCalc, setDisbursementModalCalc] = useState<ZakatCalculation | null>(null);
  const [disbAmount, setDisbAmount] = useState<number>(0);
  const [recipientCategory, setRecipientCategory] = useState("الفقراء والمساكين");
  const [recipientName, setRecipientName] = useState("");
  const [disbMethod, setDisbMethod] = useState("نقداً من الخزينة");
  const [disbNotes, setDisbNotes] = useState("");
  const [recordInTreasury, setRecordInTreasury] = useState(true);
  const [isSubmittingDisb, setIsSubmittingDisb] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [live, calcs] = await Promise.all([
        zakatService.getLiveSummary(),
        zakatService.getCalculations()
      ]);
      setLiveSummary(live);
      setCalculations(calcs);

      // Populate calculator initial fields with live data
      if (live) {
        setCashInHand(live.cash_in_hand);
        setCashInBank(live.cash_in_bank);
        setInventoryValue(live.inventory_value);
        setAccountsReceivable(live.accounts_receivable);
        setAccountsPayable(live.accounts_payable);
        setAccruedExpenses(live.accrued_expenses);
        setGoldGramPrice(live.suggested_gold_gram_price || 380);
      }
    } catch (err) {
      console.error("Failed to load zakat data", err);
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

  // Pull Live Summary on Demand
  const handleFetchLiveData = async () => {
    try {
      setIsRefreshing(true);
      const live = await zakatService.getLiveSummary();
      setLiveSummary(live);
      setCashInHand(live.cash_in_hand);
      setCashInBank(live.cash_in_bank);
      setInventoryValue(live.inventory_value);
      setAccountsReceivable(live.accounts_receivable);
      setAccountsPayable(live.accounts_payable);
      setAccruedExpenses(live.accrued_expenses);
      setGoldGramPrice(live.suggested_gold_gram_price || 380);
      setSaveSuccess("تم سحب وتحديث الأرقام اللحظية من الخزينة والمخزون بنجاح.");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to fetch live zakat data", err);
      setSaveError("فشل في سحب البيانات اللحظية.");
      setTimeout(() => setSaveError(""), 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculations
  const totalAssets = useMemo(() => {
    return (
      (Number(cashInHand) || 0) +
      (Number(cashInBank) || 0) +
      (Number(inventoryValue) || 0) +
      (Number(accountsReceivable) || 0) +
      (Number(otherAssets) || 0)
    );
  }, [cashInHand, cashInBank, inventoryValue, accountsReceivable, otherAssets]);

  const totalLiabilities = useMemo(() => {
    return (
      (Number(accountsPayable) || 0) +
      (Number(accruedExpenses) || 0) +
      (Number(otherLiabilities) || 0)
    );
  }, [accountsPayable, accruedExpenses, otherLiabilities]);

  const netZakatBase = useMemo(() => {
    return Math.max(0, totalAssets - totalLiabilities);
  }, [totalAssets, totalLiabilities]);

  const nisabThreshold = useMemo(() => {
    return 85 * (Number(goldGramPrice) || 0);
  }, [goldGramPrice]);

  const isNisabReached = useMemo(() => {
    return netZakatBase >= nisabThreshold && nisabThreshold > 0;
  }, [netZakatBase, nisabThreshold]);

  const zakatRatePercentage = yearType === "GREGORIAN" ? 2.577 : 2.5;

  const zakatDueAmount = useMemo(() => {
    if (!isNisabReached) return 0;
    return Math.round(netZakatBase * (zakatRatePercentage / 100) * 100) / 100;
  }, [netZakatBase, zakatRatePercentage, isNisabReached]);

  // Handle Save Calculation
  const handleSaveCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");

    if (!title.trim()) {
      setSaveError("يرجى إدخال عنوان أو تسمية لهذه الحسبة.");
      return;
    }

    try {
      setIsSaving(true);
      const payload: CreateZakatInput = {
        title: title.trim(),
        date_calculated: calcDate,
        year_type: yearType,
        gold_gram_price: Number(goldGramPrice) || 0,
        cash_in_hand: Number(cashInHand) || 0,
        cash_in_bank: Number(cashInBank) || 0,
        inventory_value: Number(inventoryValue) || 0,
        accounts_receivable: Number(accountsReceivable) || 0,
        other_zakatable_assets: Number(otherAssets) || 0,
        accounts_payable: Number(accountsPayable) || 0,
        accrued_expenses: Number(accruedExpenses) || 0,
        other_liabilities: Number(otherLiabilities) || 0,
        notes: notes.trim()
      };

      await zakatService.createCalculation(payload);
      setSaveSuccess("تم توثيق وحفظ حسبة الزكاة في السجل بنجاح!");
      const updatedCalcs = await zakatService.getCalculations();
      setCalculations(updatedCalcs);
      setTimeout(() => {
        setSaveSuccess("");
        setActiveTab("archive");
      }, 1500);
    } catch (err: any) {
      console.error("Failed to save zakat calculation", err);
      setSaveError(err.response?.data?.message || err.message || "حدث خطأ أثناء حفظ حسبة الزكاة.");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Disbursement Modal
  const openDisbursementModal = (calc: ZakatCalculation) => {
    setDisbursementModalCalc(calc);
    setDisbAmount(calc.remaining_due > 0 ? calc.remaining_due : 0);
    setRecipientCategory("الفقراء والمساكين");
    setRecipientName("");
    setDisbMethod("نقداً من الخزينة");
    setDisbNotes("");
    setRecordInTreasury(true);
  };

  // Submit Disbursement
  const handleSubmitDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disbursementModalCalc || disbAmount <= 0) return;

    try {
      setIsSubmittingDisb(true);
      await zakatService.recordDisbursement({
        zakat_calc_id: disbursementModalCalc.id,
        amount: Number(disbAmount),
        recipient_category: recipientCategory,
        recipient_name: recipientName.trim(),
        payment_method: disbMethod,
        notes: disbNotes.trim(),
        record_in_treasury: recordInTreasury
      });

      const updated = await zakatService.getCalculations();
      setCalculations(updated);
      setDisbursementModalCalc(null);
    } catch (err) {
      console.error("Failed to record disbursement", err);
      await alertDialog({
        title: "خطأ في التسجيل",
        message: "فشل في تسجيل دفعة الزكاة. يرجى التحقق من الاتصال والمحاولة مرة أخرى.",
        variant: "error",
      });
    } finally {
      setIsSubmittingDisb(false);
    }
  };

  // Delete Calculation
  const handleDeleteCalculation = async (id: number) => {
    const confirmed = await confirmDialog({
      title: "حذف حسبة الزكاة",
      message: "هل أنت متأكد من حذف هذا السجل لحسبة الزكاة؟",
      confirmText: "نعم، حذف السجل",
      cancelText: "إلغاء",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await zakatService.deleteCalculation(id);
      setCalculations(calculations.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete zakat calculation", err);
      await alertDialog({
        title: "خطأ في الحذف",
        message: "فشل في حذف السجل. يرجى المحاولة مرة أخرى.",
        variant: "error",
      });
    }
  };

  if (!isClient || !isLoggedIn) return null;

  return (
    <div className="flex flex-col lg:flex-row bg-background dark:bg-background min-h-screen w-full min-w-0 transition-colors duration-300" dir="rtl">
      <Sidebar />

      <main className={`flex-1 min-w-0 mr-0 ${isSidebarCollapsed ? "lg:mr-20" : "lg:mr-64"} min-h-screen p-3.5 sm:p-6 lg:p-8 transition-all duration-300`}>
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-600/20 text-white shrink-0">
              <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-none mb-1 flex items-center gap-2">
                <span>زكاة المال وعروض التجارة</span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-lg">
                  فقه المعاملات
                </span>
              </h1>
              <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-[13px] font-bold opacity-70">
                حساب وعاء الزكاة الشرعي للمطعم، تقييم المخزون والسيولة، وأرشفة السندات
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleFetchLiveData}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95"
              title="سحب الأرقام الحالية تلقائياً من الخزينة والمخزن والموردين"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>سحب الأرقام اللحظية</span>
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl mb-6 sm:mb-8 gap-1 max-w-xl">
          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === "calculator"
                ? "bg-white dark:bg-gray-700 text-amber-600 shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>حاسبة الزكاة الذكية</span>
          </button>

          <button
            onClick={() => setActiveTab("archive")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === "archive"
                ? "bg-white dark:bg-gray-700 text-amber-600 shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>سجل الحسابات والمدفوعات ({calculations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("guidelines")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === "guidelines"
                ? "bg-white dark:bg-gray-700 text-amber-600 shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>الدليل الفقهي</span>
          </button>
        </div>

        {/* -------------------- TAB 1: ZAKAT CALCULATOR -------------------- */}
        {activeTab === "calculator" && (
          <form onSubmit={handleSaveCalculation} className="space-y-6">
            {saveSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Benchmark & Parameters Card */}
            <div className="bg-card dark:bg-card p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800/40 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">إعدادات الحسبة ومعيار النصاب</h3>
                  <p className="text-xs text-gray-400 font-bold">تحديد السنة المالية، نوع الحول، وسعر جرام الذهب الحالي لحساب النصاب</p>
                </div>

                {/* Nisab Status Pill */}
                <div>
                  {isNisabReached ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs font-black">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      بلغ النصاب الشرعي (تجب الزكاة)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl text-xs font-bold">
                      <Info className="w-4 h-4 text-gray-400" />
                      دون النصاب الشرعي ({nisabThreshold.toFixed(2)} د.ل)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                {/* Title */}
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1.5">عنوان الحسبة / السنة المالية *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1.5">تاريخ الحسبة</label>
                  <input
                    type="date"
                    value={calcDate}
                    onChange={(e) => setCalcDate(e.target.value)}
                    required
                    className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                {/* Year Type */}
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1.5">نوع الحول المعتمد</label>
                  <select
                    value={yearType}
                    onChange={(e) => setYearType(e.target.value as any)}
                    className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="HIJRI">حول هجري / قمري (نسبة الزكاة 2.500%)</option>
                    <option value="GREGORIAN">حول شمسي / ميلادي (نسبة الزكاة 2.577%)</option>
                  </select>
                </div>

                {/* Gold Gram Price */}
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1.5">
                    سعر جرام الذهب عيار 24 (د.ل) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={goldGramPrice}
                      onChange={(e) => setGoldGramPrice(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full h-11 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 tabular-nums"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                      النصاب = {nisabThreshold.toFixed(0)} د.ل
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assets & Liabilities 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: Zakatable Assets */}
              <div className="bg-card dark:bg-card p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800/40 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-black">
                      +
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white">الأصول الزكوية (الأموال الخاضعة)</h4>
                      <p className="text-[11px] text-gray-400 font-bold">السيولة النقدية وبضاعة المخزون والديون المرجوة</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-600 tabular-nums">
                    {totalAssets.toFixed(2)} د.ل
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Cash in Hand */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                      <span>السيولة النقدية بالخزينة والصناديق (Cash)</span>
                      {liveSummary && (
                        <span className="text-[10px] text-gray-400">مسجل بالنظام: {liveSummary.cash_in_hand.toFixed(2)} د.ل</span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={cashInHand}
                      onChange={(e) => setCashInHand(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                    />
                  </div>

                  {/* Cash in Bank */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                      الأرصدة بالحسابات المصرفية (Bank Balances)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={cashInBank}
                      onChange={(e) => setCashInBank(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                    />
                  </div>

                  {/* Inventory Value */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                      <span>تقييم بضاعة المخزون والمواد الخام المعدة للبيع والتشغيل</span>
                      {liveSummary && (
                        <span className="text-[10px] text-emerald-600 font-bold">محسوب آلياً: {liveSummary.inventory_value.toFixed(2)} د.ل</span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={inventoryValue}
                      onChange={(e) => setInventoryValue(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                    />
                  </div>

                  {/* Accounts Receivable */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                      <span>ديون وذمم مرجوة السداد (لنا عند الزبائن أو الغير)</span>
                      {liveSummary && (
                        <span className="text-[10px] text-gray-400">آجل العملاء: {liveSummary.accounts_receivable.toFixed(2)} د.ل</span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={accountsReceivable}
                      onChange={(e) => setAccountsReceivable(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                    />
                  </div>

                  {/* Other Zakatable Assets */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                      أصول وأموال نقدية أخرى خاضعة للزكاة
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={otherAssets}
                      onChange={(e) => setOtherAssets(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Column 2: Deductible Liabilities */}
              <div className="bg-card dark:bg-card p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800/40 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-black">
                      -
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white">الخصوم والالتزامات (واجبة الخصم)</h4>
                      <p className="text-[11px] text-gray-400 font-bold">الديون العاجلة للموردين والمصروفات المستحقة</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-rose-600 tabular-nums">
                    {totalLiabilities.toFixed(2)} د.ل
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Accounts Payable (Suppliers) */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                      <span>مستحقات الموردين والديون التجارية العاجلة</span>
                      {liveSummary && (
                        <span className="text-[10px] text-amber-600 font-bold">رصيد الموردين: {liveSummary.accounts_payable.toFixed(2)} د.ل</span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={accountsPayable}
                      onChange={(e) => setAccountsPayable(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20 tabular-nums"
                    />
                  </div>

                  {/* Accrued Expenses */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                      مصروفات تشغيلية ورواتب مستحقة حان أجلها
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={accruedExpenses}
                      onChange={(e) => setAccruedExpenses(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20 tabular-nums"
                    />
                  </div>

                  {/* Other Liabilities */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                      التزامات وديون عاجلة أخرى واجبة الأداء
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={otherLiabilities}
                      onChange={(e) => setOtherLiabilities(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20 tabular-nums"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                      ملاحظات أو توضيحات خاصة بالحسبة
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أي تفاصيل حول ديون معينة أو تسويات مالية..."
                      className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary & Zakat Due Hero Card */}
            <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-xs rounded-xl text-xs font-black uppercase tracking-wider">
                    صافي الوعاء الزكوي: {netZakatBase.toFixed(2)} د.ل
                  </span>
                  <span className="text-xs font-bold opacity-80">
                    (نسبة الحساب: {zakatRatePercentage}%)
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums tracking-tight">
                    {zakatDueAmount.toFixed(2)}
                  </h2>
                  <span className="text-lg font-bold opacity-90">دينار ليبي</span>
                </div>

                <p className="text-xs sm:text-sm opacity-90 max-w-xl font-medium">
                  {isNisabReached
                    ? "صافي ثروة عروض التجارة والسيولة بلغت النصاب الشرعي، وهذا المبلغ هو مقدار الزكاة الواجب إخراجها لمستحقيها شرعاً."
                    : "صافي الوعاء لم يبلغ النصاب المقدر بـ (85 جرام ذهب)، ولا تجب الزكاة شرعاً حتى يبلغ المال النصاب ويحول عليه الحول."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-gray-50 text-amber-700 rounded-2xl font-black text-sm shadow-lg shadow-black/10 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>{isSaving ? "جاري الحفظ..." : "حفظ وتوثيق الحسبة في السجل"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* -------------------- TAB 2: ARCHIVE & RECORDS -------------------- */}
        {activeTab === "archive" && (
          <div className="bg-card dark:bg-card rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800/40 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">سجل وأرشيف حسابات الزكاة</h3>
                <p className="text-xs text-gray-400 font-bold">متابعة المبالغ المستحقة والمدفوعة والمتبقية وإصدار الشهادات</p>
              </div>

              <button
                onClick={() => setActiveTab("calculator")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>حسبة جديدة</span>
              </button>
            </div>

            <div className="overflow-x-auto text-sm">
              <table className="w-full min-w-[750px] text-right" dir="rtl">
                <thead>
                  <tr className="bg-gray-50/40 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800/40">
                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">السنة / العنوان</th>
                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">تاريخ الحسبة</th>
                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">صافي الوعاء</th>
                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">الزكاة الواجبة</th>
                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">المدفوع</th>
                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">المتبقي</th>
                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider">الحالة</th>
                    <th className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wider text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                  {calculations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-400">
                        <Coins className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                        <p className="font-bold text-base text-gray-600 dark:text-gray-300">لا توجد حسابات زكاة محفوظة حتى الآن.</p>
                        <p className="text-xs text-gray-400 mt-1">قم بحساب الزكاة والضغط على "حفظ وتوثيق الحسبة" لأرشفتها هنا.</p>
                      </td>
                    </tr>
                  ) : (
                    calculations.map((calc) => (
                      <tr key={calc.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-900 dark:text-white">{calc.title}</div>
                          <span className="text-[11px] text-gray-400 font-bold">
                            {calc.year_type === "GREGORIAN" ? "حول شمسي (2.577%)" : "حول هجري (2.5%)"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold tabular-nums text-xs">
                          {calc.date_calculated}
                        </td>

                        <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                          {calc.net_zakat_base.toFixed(2)} د.ل
                        </td>

                        <td className="px-6 py-4 font-black text-amber-600 tabular-nums">
                          {calc.zakat_due.toFixed(2)} د.ل
                        </td>

                        <td className="px-6 py-4 font-black text-emerald-600 tabular-nums">
                          {calc.zakat_paid.toFixed(2)} د.ل
                        </td>

                        <td className="px-6 py-4 font-black text-rose-600 tabular-nums">
                          {calc.remaining_due.toFixed(2)} د.ل
                        </td>

                        <td className="px-6 py-4">
                          {calc.status === "PAID" ? (
                            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-black">
                              مدفوعة بالكامل
                            </span>
                          ) : calc.status === "PARTIALLY_PAID" ? (
                            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-black">
                              مدفوعة جزئياً
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-black">
                              مستحقة
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Record Payment Button */}
                            {calc.remaining_due > 0 && (
                              <button
                                onClick={() => openDisbursementModal(calc)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-bold transition-all"
                                title="تسجيل دفعة إخراج زكاة"
                              >
                                دفع زكاة
                              </button>
                            )}

                            {/* View Statement Button */}
                            <button
                              onClick={() => setSelectedCalc(calc)}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg transition-all"
                              title="معاينة وطباعة شهادة الزكاة"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteCalculation(calc.id)}
                              className="p-1.5 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-gray-800 text-gray-400 rounded-lg transition-all"
                              title="حذف الحسبة"
                            >
                              <Trash2 className="w-4 h-4" />
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
        )}

        {/* -------------------- TAB 3: GUIDELINES -------------------- */}
        {activeTab === "guidelines" && (
          <div className="bg-card dark:bg-card p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-800/40 shadow-xs space-y-6 max-w-4xl">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Scale className="w-6 h-6 text-amber-600" />
                <span>دليل وأحكام زكاة المطاعم والأنشطة الغذائية</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">خلاصة فتاوى وتوجيهات الهيئات الشرعية ومحاسبة زكاة عروض التجارة</p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl">
                <h4 className="font-black text-amber-800 dark:text-amber-300 text-sm mb-1">
                  1. ما هي الأصول المعفاة من الزكاة في المطاعم (عروض القنية)؟
                </h4>
                <p>
                  <strong>الأصول الثابتة لا زكاة عليها إطلاقاً</strong>، وتشمل: مبنى المطعم أو قيمة الإيجار، الديكورات، الأفران، الثلاجات والمجمدات، الشوايات، الطاولات والكراسي، أواني الطبخ، ماكينات الكاشير وشاشات POS، وسيارات ودراجات التوصيل. كل هذه الأموال قنيت للتشغيل وتوليد الخدمة وليست معروضة للبيع بحد ذاتها.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 rounded-2xl">
                <h4 className="font-black text-emerald-800 dark:text-emerald-300 text-sm mb-1">
                  2. ما هي الأموال الخاضعة للزكاة (عروض التجارة والسيولة)؟
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>المواد الخام والأغذية في المخزن:</strong> كل ما تم شراؤه ليدخل في إعداد الوجبات ويباع للزبائن (لحوم، خضار، بهارات، معلبات، مشروبات...) وتقوّم بسعر شرائها الحالي في السوق يوم الحول.</li>
                  <li><strong>السيولة النقدية:</strong> الأموال الموجودة بالخزينة، صناديق الكاشير، وأرصدة الحسابات البنكية.</li>
                  <li><strong>الديون المرجوة السداد:</strong> الأموال المستحقة للمطعم عند العملاء أو خدمات التوصيل التي يرجى تحصيلها.</li>
                </ul>
              </div>

              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 rounded-2xl">
                <h4 className="font-black text-rose-800 dark:text-rose-300 text-sm mb-1">
                  3. ما هي الخصوم والديون التي تخصم من الوعاء؟
                </h4>
                <p>
                  تخصم <strong>الديون والالتزامات العاجلة فقط</strong> التي حان أجل سدادها قبل نهاية الحول، مثل: مستحقات موردي اللحوم والخضار، وفواتير الكهرباء أو الإيجار المستحق، ورواتب الموظفين المستحقة. أما الديون المؤجلة لسنوات قادمة فلا تخصم كاملة بل يخصم قسط السنة فقط.
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-2xl">
                <h4 className="font-black text-gray-900 dark:text-white text-sm mb-1">
                  4. نصاب الزكاة والنسبة المطبقة
                </h4>
                <p>
                  <strong>النصاب:</strong> يعادل قيمة 85 جراماً من الذهب الخالص عيار 24 بسعر السوق الليبي يوم الحول. إذا بلغ صافي الوعاء النصاب وحال عليه الحول وجب إخراج:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>2.5%</strong> إذا كانت المحاسبة مبنية على السنة الهجرية (القمري 354 يوماً).</li>
                  <li><strong>2.577%</strong> إذا كانت المحاسبة مبنية على السنة الشمسية / الميلادية (365 يوماً)، تعويضاً لفارق الـ 11 يوماً بين السنتين.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- DISBURSEMENT MODAL -------------------- */}
        {disbursementModalCalc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card dark:bg-card rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
                <h3 className="font-black text-gray-900 dark:text-white text-base">تسجيل دفعة إخراج زكاة</h3>
                <button onClick={() => setDisbursementModalCalc(null)} className="p-1 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitDisbursement} className="p-6 space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-bold">
                  حسبة: {disbursementModalCalc.title} | المتبقي الواجب: {disbursementModalCalc.remaining_due.toFixed(2)} د.ل
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1">المبلغ المراد إخراجه (د.ل) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={disbursementModalCalc.remaining_due}
                    value={disbAmount}
                    onChange={(e) => setDisbAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full h-11 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-sm font-black text-amber-600 outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1">مصرف الزكاة (الجهة المستفيدة) *</label>
                  <select
                    value={recipientCategory}
                    onChange={(e) => setRecipientCategory(e.target.value)}
                    className="w-full h-11 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none"
                  >
                    <option value="الفقراء والمساكين">الفقراء والمساكين</option>
                    <option value="الغارمين (سداد ديون المعسرين)">الغارمين (سداد ديون المعسرين)</option>
                    <option value="في سبيل الله (المشاريع الخيرية والإغاثة)">في سبيل الله (المشاريع الخيرية والإغاثة)</option>
                    <option value="ابن السبيل">ابن السبيل</option>
                    <option value="جمعية خيرية معتمدة">جمعية خيرية معتمدة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1">اسم المستفيد أو الجمعية (اختياري)</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="مثال: عائلة فلان، جمعية البر الخيرية..."
                    className="w-full h-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1">طريقة الصرف</label>
                  <select
                    value={disbMethod}
                    onChange={(e) => setDisbMethod(e.target.value)}
                    className="w-full h-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs font-bold outline-none"
                  >
                    <option value="نقداً من الخزينة">نقداً من الخزينة الرئيسية</option>
                    <option value="تحويل مصرفي">تحويل مصرفي</option>
                    <option value="صك مصدق">صك مصدق</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="recordTreasury"
                    checked={recordInTreasury}
                    onChange={(e) => setRecordInTreasury(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <label htmlFor="recordTreasury" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                    تسجيل خصم المبلغ فورياً كحركة خروج من الخزينة
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setDisbursementModalCalc(null)}
                    className="flex-1 py-2.5 rounded-xl border font-bold text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDisb}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs"
                  >
                    {isSubmittingDisb ? "جاري التسجيل..." : "تأكيد وصرف الزكاة"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* -------------------- PRINTABLE STATEMENT MODAL -------------------- */}
        {selectedCalc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card dark:bg-card rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30 no-print">
                <span className="text-xs font-bold text-gray-400">معاينة بيان وشهادة حساب الزكاة الشرعية</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة البيان</span>
                  </button>
                  <button onClick={() => setSelectedCalc(null)} className="p-2 text-gray-400 hover:text-white rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Body */}
              <div id="printable-zakat-statement" className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-gray-900 text-right">
                {/* Header */}
                <div className="flex items-start justify-between border-b pb-6 mb-6">
                  <div>
                    {settings?.logo ? (
                      <img src={getFullLogoUrl(settings.logo)} alt="Logo" className="h-16 w-auto object-contain mb-2" />
                    ) : (
                      <h2 className="text-2xl font-black text-gray-900">{settings?.name || "مطعمنا"}</h2>
                    )}
                    <p className="text-xs text-gray-500 font-bold">{settings?.address || ""}</p>
                    {settings?.tax_number && <p className="text-xs text-gray-500 font-bold">الرقم الضريبي: {settings.tax_number}</p>}
                  </div>

                  <div className="text-left">
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-lg mb-2">
                      بيان حساب زكاة عروض التجارة والسيولة
                    </span>
                    <h3 className="text-lg font-black text-gray-900">{selectedCalc.title}</h3>
                    <p className="text-xs text-gray-500 font-bold mt-1">تاريخ الحسبة: {selectedCalc.date_calculated}</p>
                    <p className="text-xs text-gray-600 font-bold mt-0.5">
                      الحول: {selectedCalc.year_type === "GREGORIAN" ? "شمسي / ميلادي (2.577%)" : "هجري / قمري (2.500%)"}
                    </p>
                  </div>
                </div>

                {/* Nisab Details */}
                <div className="grid grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 mb-6 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold block mb-0.5">معيار نصاب الذهب (85 جرام عيار 24):</span>
                    <span className="font-black text-gray-900 text-sm block">
                      سعر الجرام: {selectedCalc.gold_gram_price.toFixed(2)} د.ل | النصاب: {selectedCalc.nisab_threshold.toFixed(2)} د.ل
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 font-bold block mb-0.5">حكم وجوب الزكاة:</span>
                    <span className={`font-black text-sm block ${selectedCalc.is_nisab_reached ? "text-emerald-700" : "text-gray-600"}`}>
                      {selectedCalc.is_nisab_reached ? "بلغ النصاب الشرعي - الزكاة واجبة" : "دون النصاب الشرعي"}
                    </span>
                  </div>
                </div>

                {/* Statement Breakdown Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3">البند المالي</th>
                        <th className="p-3">التصنيف المحاسبي</th>
                        <th className="p-3 text-left">القيمة بالدينار الليبي (د.ل)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="p-3 font-bold">السيولة النقدية بالخزينة والصناديق</td>
                        <td className="p-3 text-emerald-700 font-bold">أصل زكوي (+)</td>
                        <td className="p-3 text-left font-bold tabular-nums">{selectedCalc.cash_in_hand.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">الأرصدة المصرفية بالبنوك</td>
                        <td className="p-3 text-emerald-700 font-bold">أصل زكوي (+)</td>
                        <td className="p-3 text-left font-bold tabular-nums">{selectedCalc.cash_in_bank.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">تقييم بضاعة المخزون والمواد الخام للتشغيل والبيع</td>
                        <td className="p-3 text-emerald-700 font-bold">أصل زكوي (+)</td>
                        <td className="p-3 text-left font-bold tabular-nums">{selectedCalc.inventory_value.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">ديون وذمم مرجوة السداد عند الغير</td>
                        <td className="p-3 text-emerald-700 font-bold">أصل زكوي (+)</td>
                        <td className="p-3 text-left font-bold tabular-nums">{selectedCalc.accounts_receivable.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-emerald-50/50 font-black">
                        <td colSpan={2} className="p-3">إجمالي الأصول الزكوية</td>
                        <td className="p-3 text-left tabular-nums text-emerald-700">{selectedCalc.total_assets.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">مستحقات الموردين والديون التجارية العاجلة</td>
                        <td className="p-3 text-rose-700 font-bold">خصوم واجبة الخصم (-)</td>
                        <td className="p-3 text-left font-bold tabular-nums">{selectedCalc.accounts_payable.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold">مصروفات ورواتب تشغيلية مستحقة حان أجلها</td>
                        <td className="p-3 text-rose-700 font-bold">خصوم واجبة الخصم (-)</td>
                        <td className="p-3 text-left font-bold tabular-nums">{selectedCalc.accrued_expenses.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-rose-50/50 font-black">
                        <td colSpan={2} className="p-3">إجمالي الخصوم والديون الواجب خصمها</td>
                        <td className="p-3 text-left tabular-nums text-rose-700">{selectedCalc.total_liabilities.toFixed(2)}</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-amber-100 font-black border-t-2 border-amber-300 text-sm">
                      <tr>
                        <td colSpan={2} className="p-3">صافي الوعاء الخاضع للزكاة الشرعية:</td>
                        <td className="p-3 text-left tabular-nums text-amber-900">{selectedCalc.net_zakat_base.toFixed(2)} د.ل</td>
                      </tr>
                      <tr className="bg-amber-200">
                        <td colSpan={2} className="p-3 text-amber-950">مقدار الزكاة الواجب إخراجها ({selectedCalc.zakat_percentage}%):</td>
                        <td className="p-3 text-left tabular-nums text-amber-950 font-black text-base">
                          {selectedCalc.zakat_due.toFixed(2)} د.ل
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Disbursements History in Statement */}
                {selectedCalc.disbursements.length > 0 && (
                  <div className="mb-6">
                    <h5 className="font-black text-gray-800 text-xs mb-2">سجل الدفعات ومصارف الزكاة المصروفة:</h5>
                    <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="p-2.5">التاريخ</th>
                            <th className="p-2.5">المبلغ</th>
                            <th className="p-2.5">المصرف / المستفيد</th>
                            <th className="p-2.5">طريقة الدفع</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedCalc.disbursements.map((d) => (
                            <tr key={d.id}>
                              <td className="p-2.5 tabular-nums">{d.disbursed_at}</td>
                              <td className="p-2.5 font-black text-emerald-700 tabular-nums">{d.amount.toFixed(2)} د.ل</td>
                              <td className="p-2.5">{d.recipient_category} {d.recipient_name ? `(${d.recipient_name})` : ""}</td>
                              <td className="p-2.5">{d.payment_method}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-center text-xs text-gray-600 mt-8">
                  <div>
                    <p className="font-bold mb-10">المسؤول المالي / المحاسب</p>
                    <div className="border-b border-gray-300 w-48 mx-auto" />
                  </div>
                  <div>
                    <p className="font-bold mb-10">اعتماد صاحب المطعم / المدير</p>
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
