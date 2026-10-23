import React, { useState, useMemo } from "react";
import { Transaction, TransactionType } from "../types";
import { useAuth } from "../context/AuthContext";
import { 
  ArrowDown, 
  ArrowUp, 
  ArrowRight,
  Wallet, 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  PieChart, 
  Edit2, 
  X, 
  Loader2,
  AlertCircle,
  AlertTriangle,
  Sliders,
  Sun,
  Moon,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { THEME_COLORS, getCategoryBadge, parseLocalDate } from "../theme";

interface DashboardViewProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, "id" | "userId">) => Promise<void>;
  onEditTransaction: (tx: Transaction) => Promise<void>;
  onDeleteTransaction?: (id: string) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  onAddTransaction,
  onEditTransaction,
  onNavigateToTab,
}) => {
  const { user, preferences, updatePreferences } = useAuth();
  const isDarkMode = preferences?.theme === "dark";
  const monthlyBudget = preferences?.monthlyBudget || 0;

  // Modal State for Quick Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Budget Modal State
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [tempBudget, setTempBudget] = useState(monthlyBudget > 0 ? monthlyBudget.toString() : "");
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // User display name from email or profile
  const userName = useMemo(() => {
    if (user?.displayName) return user.displayName.split(" ")[0];
    if (user?.email) {
      const prefix = user.email.split("@")[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return "User";
  }, [user]);

  // Currency formatting helper
  const formatRupee = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val).replace("INR", "₹").trim();
  };

  // Financial Totals Calculation
  const incomeTxs = useMemo(() => transactions.filter(t => t.type === "income"), [transactions]);
  const expenseTxs = useMemo(() => transactions.filter(t => t.type === "expense"), [transactions]);

  const totalIncome = useMemo(() => incomeTxs.reduce((sum, t) => sum + t.amount, 0), [incomeTxs]);
  const totalExpense = useMemo(() => expenseTxs.reduce((sum, t) => sum + t.amount, 0), [expenseTxs]);
  const totalBalance = totalIncome - totalExpense;

  // Current Calendar Month vs Previous Month Calculations with safe local date parsing
  const { currentMonthExpense, prevMonthExpense, currentMonthIncome, prevMonthIncome } = useMemo(() => {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    const prevYear = currMonth === 0 ? currYear - 1 : currYear;
    const prevMonth = currMonth === 0 ? 11 : currMonth - 1;

    let currExp = 0;
    let prevExp = 0;
    let currInc = 0;
    let prevInc = 0;

    transactions.forEach(t => {
      const d = parseLocalDate(t.date);
      const y = d.getFullYear();
      const m = d.getMonth();

      if (y === currYear && m === currMonth) {
        if (t.type === "expense") currExp += t.amount;
        else currInc += t.amount;
      } else if (y === prevYear && m === prevMonth) {
        if (t.type === "expense") prevExp += t.amount;
        else prevInc += t.amount;
      }
    });

    return {
      currentMonthExpense: currExp,
      prevMonthExpense: prevExp,
      currentMonthIncome: currInc,
      prevMonthIncome: prevInc,
    };
  }, [transactions]);

  // Real month-over-month comparisons (strictly calculated, no fake mock text)
  const expenseDiff = useMemo(() => {
    if (prevMonthExpense === 0) return null;
    return Math.round(((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100);
  }, [currentMonthExpense, prevMonthExpense]);

  const incomeDiff = useMemo(() => {
    if (prevMonthIncome === 0) return null;
    return Math.round(((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100);
  }, [currentMonthIncome, prevMonthIncome]);

  // Budget Calculations
  const hasBudget = monthlyBudget > 0;
  const budgetUtilization = hasBudget ? (currentMonthExpense / monthlyBudget) * 100 : 0;
  const remainingBudget = Math.max(0, monthlyBudget - currentMonthExpense);
  const isOverBudget = hasBudget && currentMonthExpense > monthlyBudget;
  const overAmount = isOverBudget ? currentMonthExpense - monthlyBudget : 0;

  // Real data-driven AI Insights
  const dynamicInsights = useMemo(() => {
    if (expenseTxs.length === 0) return [];

    const insights = [];

    // 1. Largest Expense Category
    const catMap: Record<string, number> = {};
    expenseTxs.forEach(t => {
      const key = (t.category || "other").toLowerCase();
      catMap[key] = (catMap[key] || 0) + t.amount;
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    if (sortedCats.length > 0) {
      const [topName, topAmount] = sortedCats[0];
      const topPercent = totalExpense > 0 ? Math.round((topAmount / totalExpense) * 100) : 0;
      const formattedTopName = topName.charAt(0).toUpperCase() + topName.slice(1);
      insights.push({
        boldText: `${formattedTopName} is your top expense`,
        desc: `accounting for ${topPercent}% (${formatRupee(topAmount)}) of all recorded spending.`,
        icon: TrendingUp,
        bg: "bg-[#FAF3F4] dark:bg-[#66101F]/15 border-[#D3D3D3] dark:border-[#66101F]/30",
        iconBg: "bg-white dark:bg-[#66101F]/30 text-[#66101F] dark:text-[#F5B8BF]",
      });
    }

    // 2. Weekend vs Weekday spending
    let weekendSpend = 0;
    let weekdaySpend = 0;
    let weekendCount = 0;
    let weekdayCount = 0;
    expenseTxs.forEach(t => {
      const day = parseLocalDate(t.date).getDay();
      if (day === 0 || day === 6) {
        weekendSpend += t.amount;
        weekendCount++;
      } else {
        weekdaySpend += t.amount;
        weekdayCount++;
      }
    });

    if (weekendCount > 0 && weekdayCount > 0 && weekdaySpend > 0) {
      const weekendDiff = Math.round(((weekendSpend - weekdaySpend) / weekdaySpend) * 100);
      insights.push({
        boldText: `Weekend spending is`,
        desc: `${Math.abs(weekendDiff)}% ${weekendDiff >= 0 ? "higher" : "lower"} than weekdays.`,
        icon: Calendar,
        bg: "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-white/10",
        iconBg: "bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200",
      });
    } else if (hasBudget) {
      // Budget pace tracking
      insights.push({
        boldText: isOverBudget ? "Budget limit exceeded" : "Budget pace tracking",
        desc: isOverBudget 
          ? `You have spent ${budgetUtilization.toFixed(0)}% of your monthly limit.`
          : `You have consumed ${budgetUtilization.toFixed(0)}% with ${formatRupee(remainingBudget)} remaining.`,
        icon: Calendar,
        bg: isOverBudget ? "bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30" : "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-white/10",
        iconBg: isOverBudget ? "bg-rose-200/80 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400" : "bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200",
      });
    }

    // 3. Lowest Expense Category
    if (sortedCats.length > 1) {
      const [lowestName, lowestAmount] = sortedCats[sortedCats.length - 1];
      const lowestFormatted = lowestName.charAt(0).toUpperCase() + lowestName.slice(1);
      insights.push({
        boldText: `${lowestFormatted}`,
        desc: `is your lowest recorded expense category at ${formatRupee(lowestAmount)}.`,
        icon: PieChart,
        bg: "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30",
        iconBg: "bg-emerald-200/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
      });
    }

    return insights;
  }, [expenseTxs, totalExpense, hasBudget, isOverBudget, budgetUtilization, remainingBudget]);

  // Open modal for Add
  const openAddModal = (type: TransactionType) => {
    setEditingTx(null);
    setModalType(type);
    setAmount("");
    setDescription("");
    setCategory(type === "expense" ? "food" : "salary");
    setDate(new Date().toISOString().split("T")[0]);
    setModalOpen(true);
  };

  // Open modal for Edit
  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setModalType(tx.type);
    setAmount(tx.amount.toString());
    setDescription(tx.description);
    setCategory(tx.category);
    setDate(tx.date);
    setModalOpen(true);
  };

  // Submit Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) return;

    const fallbackDesc = modalType === "expense" 
      ? `${category.charAt(0).toUpperCase() + category.slice(1)} Expense`
      : `${category.charAt(0).toUpperCase() + category.slice(1)} Income`;
    const finalDesc = description.trim() || fallbackDesc;

    setLoading(true);
    try {
      if (editingTx) {
        await onEditTransaction({
          ...editingTx,
          type: modalType,
          amount: num,
          category,
          date,
          description: finalDesc,
        });
      } else {
        await onAddTransaction({
          type: modalType,
          amount: num,
          category,
          date,
          description: finalDesc,
        });
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Save updated budget
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetError(null);
    const val = Number(tempBudget);
    if (isNaN(val) || val < 0) {
      setBudgetError("Please enter a valid positive number.");
      return;
    }
    await updatePreferences({ monthlyBudget: val });
    setBudgetModalOpen(false);
  };

  // Theme switch toggle
  const toggleTheme = (targetTheme: "light" | "dark") => {
    updatePreferences({ theme: targetTheme });
    if (targetTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="space-y-6" id="dashboard_view">
      
      {/* 1. Welcome Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1" id="welcome_header_row">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2 font-sans">
            Welcome back, {userName}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Overview of your balances, monthly spending limits, and recent activity.
          </p>
        </div>

        {/* Polished Theme Toggle Pill with Icon Morphing */}
        <div 
          className="flex items-center self-start sm:self-auto bg-stone-100 dark:bg-stone-800/70 p-1 rounded-xl border border-stone-200/60 dark:border-white/5 relative" 
          id="theme_toggle_pill"
          role="group"
          aria-label="Theme selection"
        >
          <button
            type="button"
            onClick={() => toggleTheme("light")}
            className={`relative px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer z-10 ${
              !isDarkMode 
                ? "text-[#66101F] font-semibold" 
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
            }`}
            title="Switch to Light mode"
            id="btn_theme_light"
          >
            {!isDarkMode && (
              <motion.div
                layoutId="activeThemeBg"
                className="absolute inset-0 bg-white rounded-lg shadow-2xs border border-stone-200/80 -z-10"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <Sun className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          
          <button
            type="button"
            onClick={() => toggleTheme("dark")}
            className={`relative px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer z-10 ${
              isDarkMode 
                ? "text-[#F5B8BF] font-semibold" 
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
            }`}
            title="Switch to Dark mode"
            id="btn_theme_dark"
          >
            {isDarkMode && (
              <motion.div
                layoutId="activeThemeBg"
                className="absolute inset-0 bg-[#1B1B1E] rounded-lg shadow-2xs border border-white/10 -z-10"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Visual Indicator: Over Monthly Budget Alert */}
      {isOverBudget && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
          role="alert"
          id="budget_threshold_alert"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800/60 shadow-2xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-red-900 dark:text-red-200">
                  Monthly Budget Limit Exceeded
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-200/80 dark:bg-red-900/70 text-red-900 dark:text-red-100">
                  {budgetUtilization.toFixed(0)}% consumed
                </span>
              </div>
              <p className="text-xs text-red-800 dark:text-red-300/90 mt-1">
                Total monthly expenses of <strong>{formatRupee(currentMonthExpense)}</strong> exceed your set threshold of <strong>{formatRupee(monthlyBudget)}</strong> by <strong className="underline underline-offset-2">{formatRupee(overAmount)}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setTempBudget(monthlyBudget.toString()); setBudgetModalOpen(true); }}
            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-white dark:bg-red-600 dark:hover:bg-red-500 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs self-end sm:self-center"
            id="btn_adjust_budget_alert"
          >
            <Sliders className="w-3.5 h-3.5" />
            Adjust Budget
          </button>
        </motion.div>
      )}

      {/* 2. Financial Summary Cards (Total Balance, Total Income, Total Expenses) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="summary_cards_grid">
        
        {/* Total Balance Card */}
        <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between transition-colors" id="card_total_balance">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 font-sans">Total Balance</span>
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 text-stone-700 dark:text-stone-200 flex items-center justify-center border border-stone-200/80 dark:border-white/10">
              <Wallet className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-sans">
              {formatRupee(totalBalance)}
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 mt-2 font-sans">
              <span>{transactions.length === 0 ? "No activity recorded" : "Current ledger balance"}</span>
            </div>
          </div>
        </div>

        {/* Total Income Card - GREEN */}
        <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between transition-colors" id="card_total_income">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 font-sans">Total Income</span>
            <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 flex items-center justify-center border border-green-200/60 dark:border-green-900/30">
              <ArrowDown className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-green-700 dark:text-green-400 font-sans">
              {formatRupee(totalIncome)}
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 mt-2 font-sans">
              {incomeDiff !== null ? (
                <>
                  <span className={`font-semibold financial-num ${incomeDiff >= 0 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                    {incomeDiff >= 0 ? `+${incomeDiff}%` : `${incomeDiff}%`}
                  </span>
                  <span>vs prior month</span>
                </>
              ) : (
                <span>{incomeTxs.length} {incomeTxs.length === 1 ? "credit" : "credits"} logged</span>
              )}
            </div>
          </div>
        </div>

        {/* Total Expenses Card - RED */}
        <div 
          className={`bg-white dark:bg-[#1B1B1E] rounded-2xl border p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between transition-all ${
            isOverBudget 
              ? "border-red-400 dark:border-red-500/80 ring-2 ring-red-500/20" 
              : "border-stone-200/80 dark:border-white/10"
          }`} 
          id="card_total_expenses"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 font-sans">Total Expenses</span>
              {isOverBudget && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200/80 dark:border-red-800 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Over budget
                </span>
              )}
            </div>
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 flex items-center justify-center border border-red-200/60 dark:border-red-900/30">
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-red-700 dark:text-red-400 font-sans">
              {formatRupee(totalExpense)}
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 mt-2 font-sans">
              {isOverBudget ? (
                <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                  +{formatRupee(overAmount)} over monthly threshold
                </span>
              ) : expenseDiff !== null ? (
                <>
                  <span className={`font-semibold financial-num ${expenseDiff > 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                    {expenseDiff > 0 ? `+${expenseDiff}%` : `${expenseDiff}%`}
                  </span>
                  <span>vs prior month</span>
                </>
              ) : (
                <span>{expenseTxs.length} {expenseTxs.length === 1 ? "debit" : "debits"} logged</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Quick Actions Cards (LEFT: Record Income, RIGHT: Record Expense) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="quick_actions_grid">
        
        {/* Left: Record Income Action Button - GREEN semantic */}
        <button
          type="button"
          onClick={() => openAddModal("income")}
          className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-5 shadow-2xs hover:border-green-300 dark:hover:border-green-800/60 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer text-left"
          id="btn_add_income_hero"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-600 dark:bg-green-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-102 transition-transform">
              <ArrowUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">Record Income</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Log an inflow or salary receipt</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-green-600 dark:group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
        </button>

        {/* Right: Record Expense Action Button - RED semantic */}
        <button
          type="button"
          onClick={() => openAddModal("expense")}
          className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-5 shadow-2xs hover:border-red-300 dark:hover:border-red-800/60 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer text-left"
          id="btn_add_expense_hero"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-red-600 dark:bg-red-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-102 transition-transform">
              <ArrowDown className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">Record Expense</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Log a new debit transaction</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-red-600 dark:group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
        </button>

      </div>

      {/* 4. Monthly Spending Budget Panel */}
      <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-6 shadow-2xs transition-colors" id="monthly_budget_panel">
        
        {!hasBudget ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#66101F] dark:bg-[#E28B96]"></span>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Monthly Spending Limit</h3>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                You haven't configured a monthly budget target. Set a spending ceiling to track consumption and stay within limits.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setTempBudget(""); setBudgetModalOpen(true); }}
              className="px-4 py-2 rounded-xl bg-[#66101F] hover:bg-[#520D19] dark:bg-[#E28B96] dark:hover:bg-[#F09FA9] dark:text-[#1A0609] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
              id="btn_set_initial_budget"
            >
              <Sliders className="w-3.5 h-3.5" />
              Configure Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Left Section (7 cols): Monthly budget progress */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Monthly Spending Limit
                  </h3>
                  {isOverBudget ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Exceeded
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                      Within Ceiling
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 font-mono financial-num">
                  {budgetUtilization.toFixed(0)}% Used
                </span>
              </div>

              {/* Progress bar with smooth transitions */}
              <div className="w-full bg-stone-100 dark:bg-stone-800/80 h-2.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    isOverBudget 
                      ? "bg-rose-600 dark:bg-rose-500" 
                      : budgetUtilization > 80 
                      ? "bg-amber-600 dark:bg-amber-500" 
                      : "bg-[#7A2231] dark:bg-[#E28B96]"
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-sans">
                <span>
                  Current Month Outflow: <strong className="text-stone-900 dark:text-stone-100 font-semibold font-mono financial-num">{formatRupee(currentMonthExpense)}</strong>
                </span>
                <span>
                  Limit: <strong className="text-stone-700 dark:text-stone-300 font-medium font-mono financial-num">{formatRupee(monthlyBudget)}</strong>
                </span>
              </div>
            </div>

            {/* Right Section (5 cols): Budget controls and remaining amount */}
            <div className="md:col-span-5 md:border-l md:border-stone-200/80 dark:md:border-white/10 md:pl-6 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs text-stone-500 dark:text-stone-400 block font-sans">
                  {isOverBudget ? "Overspending Deficit" : "Remaining Allowance"}
                </span>
                <span className={`text-2xl font-bold font-mono financial-num tracking-tight ${isOverBudget ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {isOverBudget ? `+${formatRupee(overAmount)}` : formatRupee(remainingBudget)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => { setTempBudget(monthlyBudget.toString()); setBudgetModalOpen(true); }}
                className="w-full sm:w-auto self-start px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/50 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                id="btn_edit_budget"
              >
                <Sliders className="w-3.5 h-3.5 text-[#66101F] dark:text-[#E28B96]" />
                Adjust Budget
              </button>
            </div>

          </div>
        )}

      </div>

      {/* 5. AI Insights Section (Clean & Data-Driven) */}
      <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-6 shadow-2xs transition-colors" id="ai_insights_container">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#66101F] dark:text-[#E28B96]" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">Financial Insights</h2>
          </div>
          {dynamicInsights.length > 0 && (
            <button 
              type="button"
              onClick={() => onNavigateToTab("trends")}
              className="text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-[#66101F] dark:hover:text-[#E28B96] flex items-center gap-1 cursor-pointer transition-colors"
              id="btn_view_all_insights"
            >
              Analyze Trends
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {dynamicInsights.length === 0 ? (
          <div className="py-8 text-center space-y-2 bg-stone-50/50 dark:bg-stone-800/20 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 p-6">
            <Sparkles className="w-6 h-6 text-stone-400 dark:text-stone-500 mx-auto" />
            <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-200 font-sans">
              Insights will activate when spending activity is recorded
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-sm mx-auto font-sans">
              Record expenses to unlock top-category breakdowns, weekend spending dynamics, and pacing metrics.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="ai_insights_row">
            {dynamicInsights.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div 
                  key={idx}
                  className={`${card.bg} border rounded-2xl p-4 flex items-center gap-3.5 transition-colors`}
                  id={`ai_insight_card_${idx}`}
                >
                  <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4 stroke-[2]" />
                  </div>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-snug font-sans">
                    <strong className="text-stone-900 dark:text-stone-100 font-semibold">{card.boldText}</strong>{" "}
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Recent Activity Section */}
      <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-6 shadow-2xs transition-colors" id="recent_transactions_container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">Recent Transactions</h2>
          <button 
            type="button"
            onClick={() => onNavigateToTab("history")}
            className="text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-[#66101F] dark:hover:text-[#E28B96] flex items-center gap-1 cursor-pointer transition-colors"
            id="btn_view_all_history"
          >
            View Full Ledger
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-white/5" id="recent_transactions_list">
          {transactions.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-2">
              <Calendar className="w-7 h-7 text-stone-300 dark:text-stone-600" />
              <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                No recorded entries yet. Add your first transaction above to begin.
              </p>
            </div>
          ) : (
            transactions.slice(0, 6).map((tx) => {
              const meta = getCategoryBadge(tx.category);
              const formattedDate = parseLocalDate(tx.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div 
                  key={tx.id} 
                  className="py-3 flex items-center justify-between group hover:bg-stone-50/80 dark:hover:bg-white/5 px-2 rounded-xl transition-colors"
                  id={`recent_tx_${tx.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800/60 flex items-center justify-center text-base shrink-0 border border-stone-200/50 dark:border-white/5">
                      {meta.emoji}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 capitalize font-sans">
                        {tx.description || meta.label}
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 capitalize mt-0.5 font-sans">
                        {meta.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <span className="text-[11px] text-stone-400 hidden sm:inline-block font-sans">
                      {formattedDate}
                    </span>
                    <span 
                      className={`text-xs font-bold font-mono financial-num ${
                        tx.type === "income" 
                          ? "text-emerald-700 dark:text-emerald-400" 
                          : "text-rose-700 dark:text-rose-400"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"} {formatRupee(tx.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(tx)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Add / Edit Transaction */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" id="tx_modal_overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white dark:bg-[#1B1B1E] border border-stone-200/80 dark:border-white/10 rounded-3xl shadow-xl p-6 w-full max-w-md relative"
              id="tx_modal_content"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 dark:border-white/10">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {editingTx ? "Edit Entry" : modalType === "expense" ? "Record Outflow" : "Record Inflow"}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Type Toggle with Smooth Morph */}
              <div className="grid grid-cols-2 gap-2 bg-stone-100 dark:bg-stone-800/70 p-1 rounded-xl mt-4">
                <button
                  type="button"
                  onClick={() => { setModalType("expense"); setCategory("food"); }}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    modalType === "expense" 
                      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40 shadow-2xs" 
                      : "text-stone-600 hover:text-stone-900 dark:text-stone-400"
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" /> Expense
                </button>
                <button
                  type="button"
                  onClick={() => { setModalType("income"); setCategory("salary"); }}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    modalType === "income" 
                      ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-900/40 shadow-2xs" 
                      : "text-stone-600 hover:text-stone-900 dark:text-stone-400"
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" /> Income
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="space-y-3.5 mt-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 capitalize focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96]"
                  >
                    {modalType === "expense" ? (
                      <>
                        <option value="food">🍔 Food & Dining</option>
                        <option value="shopping">🛍️ Shopping</option>
                        <option value="transport">🚕 Transport</option>
                        <option value="bills">💡 Bills & Utilities</option>
                        <option value="entertainment">🎬 Entertainment</option>
                        <option value="health">💊 Health & Medical</option>
                        <option value="education">📚 Education</option>
                        <option value="housing">🏠 Housing & Rent</option>
                        <option value="other">🏷️ Other</option>
                      </>
                    ) : (
                      <>
                        <option value="salary">💰 Salary</option>
                        <option value="freelance">💼 Freelance & Consulting</option>
                        <option value="business">🏢 Business</option>
                        <option value="investments">📈 Investments & Dividends</option>
                        <option value="other">🏷️ Other</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Description <span className="text-[11px] font-normal text-stone-400 dark:text-stone-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder={modalType === "expense" ? "e.g. Lunch with team, Groceries" : "e.g. Monthly salary, Freelance design"}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200/70 dark:border-white/10 mt-5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-5 py-2 rounded-xl text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors ${
                      modalType === "expense"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Entry"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Set / Edit Monthly Spending Limit */}
      <AnimatePresence>
        {budgetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" id="budget_modal_overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white dark:bg-[#1B1B1E] border border-stone-200/80 dark:border-white/10 rounded-3xl shadow-xl p-6 w-full max-w-sm"
              id="budget_modal_content"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 dark:border-white/10">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {hasBudget ? "Adjust Monthly Budget" : "Set Monthly Budget"}
                </h3>
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBudget} className="space-y-4 mt-4">
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Enter your target spending limit for this month. This establishes your spending ceiling and does not affect your account balance.
                </p>

                {budgetError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs">
                    {budgetError}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Monthly Budget (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      required
                      placeholder="e.g. 30000"
                      value={tempBudget}
                      onChange={(e) => setTempBudget(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBudgetModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#66101F] hover:bg-[#520D19] dark:bg-[#E28B96] dark:hover:bg-[#F09FA9] dark:text-[#1A0609] text-white text-xs font-medium cursor-pointer shadow-2xs transition-colors"
                  >
                    Save Budget
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
