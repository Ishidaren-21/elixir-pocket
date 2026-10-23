import React, { useState, useMemo } from "react";
import { Transaction } from "../types";
import { useAuth } from "../context/AuthContext";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie 
} from "recharts";
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  ArrowUp, 
  ArrowDown, 
  Wallet,
  Calendar,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { THEME_COLORS, CHART_PALETTE, parseLocalDate } from "../theme";

interface AnalyticsViewProps {
  transactions: Transaction[];
}

type TimeRange = "7d" | "30d" | "3m" | "6m" | "all";

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ transactions }) => {
  const { preferences } = useAuth();
  const isDarkMode = preferences?.theme === "dark";
  const [range, setRange] = useState<TimeRange>("all");

  // Rupee formatter
  const formatRupee = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val).replace("INR", "₹").trim();
  };

  // 1. Filter transactions by selected range (Defensive local date parsing)
  const filteredTxs = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const d1 = parseLocalDate(a.date).getTime();
      const d2 = parseLocalDate(b.date).getTime();
      return d1 - d2;
    });

    if (range === "all") return sorted;

    const now = new Date();
    let daysOffset = 30;
    if (range === "7d") daysOffset = 7;
    else if (range === "30d") daysOffset = 30;
    else if (range === "3m") daysOffset = 90;
    else if (range === "6m") daysOffset = 180;

    const cutOff = new Date();
    cutOff.setDate(now.getDate() - daysOffset);
    cutOff.setHours(0, 0, 0, 0);

    return sorted.filter((t) => parseLocalDate(t.date).getTime() >= cutOff.getTime());
  }, [transactions, range]);

  // Financial Metrics
  const metrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTxs.forEach((t) => {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });
    const netSavings = income - expense;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;
    return { income, expense, netSavings, savingsRate };
  }, [filteredTxs]);

  // 2. Income vs Expenses Comparison Chart Data
  const comparisonData = useMemo(() => {
    const groupMap: Record<string, { date: string; displayDate: string; income: number; expense: number }> = {};
    
    filteredTxs.forEach((t) => {
      const d = t.date;
      if (!groupMap[d]) {
        const parsed = parseLocalDate(d);
        groupMap[d] = {
          date: d,
          displayDate: parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          income: 0,
          expense: 0,
        };
      }
      if (t.type === "income") groupMap[d].income += t.amount;
      else groupMap[d].expense += t.amount;
    });

    return Object.values(groupMap).sort((a, b) => {
      return parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
    });
  }, [filteredTxs]);

  // 3. Category Breakdown Data
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    const expenseOnly = filteredTxs.filter(t => t.type === "expense");
    const totalExp = expenseOnly.reduce((s, t) => s + t.amount, 0);

    expenseOnly.forEach((t) => {
      const cat = (t.category || "other").toLowerCase();
      catMap[cat] = (catMap[cat] || 0) + t.amount;
    });

    return Object.entries(catMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      percentage: totalExp > 0 ? Math.round((value / totalExp) * 100) : 0,
    })).sort((a, b) => b.value - a.value);
  }, [filteredTxs]);

  // 4. Cumulative Net Balance Trend Data
  const trendData = useMemo(() => {
    let runningBalance = 0;
    return comparisonData.map((item) => {
      runningBalance += (item.income - item.expense);
      return {
        ...item,
        netBalance: runningBalance,
      };
    });
  }, [comparisonData]);

  const rangeLabels: Record<TimeRange, string> = {
    "7d": "7 Days",
    "30d": "30 Days",
    "3m": "3 Months",
    "6m": "6 Months",
    "all": "All Time",
  };

  const currentStrokeColor = isDarkMode ? THEME_COLORS.burgundy.primaryDark : THEME_COLORS.burgundy.primary;

  return (
    <div className="space-y-6" id="trends_view">
      
      {/* Header & Range Selector with Morphing Transition */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-sans">
            Financial Trends
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Visualize income vs expenses, category distributions, and capital trajectory over time.
          </p>
        </div>

        {/* Morphing Reporting Period Selector */}
        <div 
          className="flex items-center bg-stone-100 dark:bg-stone-800/70 p-1 rounded-xl self-start sm:self-auto border border-stone-200/60 dark:border-white/5 relative" 
          id="range_selector"
          role="radiogroup"
          aria-label="Select reporting time range"
        >
          {(["7d", "30d", "3m", "6m", "all"] as TimeRange[]).map((r) => {
            const active = r === range;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer z-10 font-sans ${
                  active 
                    ? "text-[#66101F] dark:text-[#E28B96] font-semibold" 
                    : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
                id={`btn_range_${r}`}
                role="radio"
                aria-checked={active}
              >
                {active && (
                  <motion.div
                    layoutId="activePeriodIndicator"
                    className="absolute inset-0 bg-white dark:bg-[#1B1B1E] rounded-lg shadow-2xs border border-stone-200/80 dark:border-white/10 -z-10"
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  />
                )}
                <span>{rangeLabels[r]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Metric Summary Strip (Animated with range changes) */}
      <motion.div 
        key={`kpi-${range}`}
        initial={{ opacity: 0.8, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4" 
        id="trends_kpi_grid"
      >
        <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-4 shadow-2xs transition-colors">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block font-sans">Total Income</span>
          <span className="text-lg font-bold text-green-700 dark:text-green-400 mt-1 block font-sans">
            {formatRupee(metrics.income)}
          </span>
        </div>

        <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-4 shadow-2xs transition-colors">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block font-sans">Total Expenses</span>
          <span className="text-lg font-bold text-red-700 dark:text-red-400 mt-1 block font-sans">
            {formatRupee(metrics.expense)}
          </span>
        </div>

        <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-4 shadow-2xs transition-colors">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block font-sans">Net Surplus</span>
          <span className={`text-lg font-bold mt-1 block font-mono financial-num ${metrics.netSavings >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {formatRupee(metrics.netSavings)}
          </span>
        </div>

        <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-4 shadow-2xs transition-colors">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block font-sans">Savings Rate</span>
          <span className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1 block font-mono financial-num">
            {metrics.savingsRate.toFixed(0)}%
          </span>
        </div>
      </motion.div>

      {/* Visualization Grid: Chart A (Income vs Expense) & Chart B (Category Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" id="charts_row_1">
        
        {/* Chart A: Income vs Expenses Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-5 shadow-2xs flex flex-col justify-between transition-colors" id="bar_comparison_card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">
                Income vs Expenses
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-sans">
                Comparison of cash inflow and outflow events for {rangeLabels[range].toLowerCase()}.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium font-sans">
              <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                <span className="w-2.5 h-2.5 rounded-full bg-green-600 dark:bg-green-400"></span> Income
              </span>
              <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 dark:bg-red-400"></span> Expenses
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {comparisonData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400 font-sans">
                No transaction data recorded for this time range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="displayDate" 
                    tickLine={false} 
                    axisLine={{ stroke: isDarkMode ? "#27272A" : "#E5E7EB" }}
                    tick={{ fill: isDarkMode ? "#A1A1AA" : "#6B7280", fontSize: 11 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDarkMode ? "#A1A1AA" : "#6B7280", fontSize: 11 }}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip 
                    formatter={(val: any) => [formatRupee(Number(val)), ""]}
                    contentStyle={{
                      backgroundColor: isDarkMode ? "#1B1B1E" : "#FFFFFF",
                      borderRadius: "12px",
                      border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #D3D3D3",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      color: isDarkMode ? "#F9FAFB" : "#111827",
                      fontSize: "12px",
                      fontFamily: "Inter, sans-serif",
                    }}
                  />
                  <Bar dataKey="income" name="Income" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart B: Category Breakdown Donut Chart */}
        <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-5 shadow-2xs flex flex-col justify-between transition-colors" id="donut_category_card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">
                Category Breakdown
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-sans">
                Expense share distribution.
              </p>
            </div>
            <PieIcon className="w-4 h-4 text-stone-400" />
          </div>

          <div className="h-44 w-full flex items-center justify-center relative">
            {categoryData.length === 0 ? (
              <div className="text-xs text-stone-400 font-sans">No expenses recorded for this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [formatRupee(Number(val)), "Spent"]}
                    contentStyle={{
                      backgroundColor: isDarkMode ? "#1B1B1E" : "#FFFFFF",
                      borderRadius: "10px",
                      fontSize: "11px",
                      border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #D3D3D3",
                      color: isDarkMode ? "#F9FAFB" : "#111827",
                      fontFamily: "Inter, sans-serif",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category percentages list */}
          <div className="space-y-1.5 mt-3 max-h-36 overflow-y-auto pr-1">
            {categoryData.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5 font-sans">
                <div className="flex items-center gap-2 min-w-0">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }} 
                  />
                  <span className="font-medium text-stone-700 dark:text-stone-300 truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono financial-num">
                  <span className="text-stone-400 text-[11px]">{item.percentage}%</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{formatRupee(item.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Chart C: Net Balance Trajectory Area Chart */}
      <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-5 shadow-2xs transition-colors" id="net_balance_area_card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">
              Cumulative Net Trajectory
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-sans">
              Net accumulated liquidity position across {rangeLabels[range].toLowerCase()}.
            </p>
          </div>
          <TrendingUp className="w-4 h-4 text-[#66101F] dark:text-[#E28B96]" />
        </div>

        <div className="h-64 w-full">
          {trendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-stone-400 font-sans">
              No trend data available for this range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentStrokeColor} stopOpacity={0.22}/>
                    <stop offset="95%" stopColor={currentStrokeColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="displayDate" 
                  tickLine={false} 
                  axisLine={{ stroke: isDarkMode ? "#27272A" : "#E5E7EB" }}
                  tick={{ fill: isDarkMode ? "#A1A1AA" : "#6B7280", fontSize: 11 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: isDarkMode ? "#A1A1AA" : "#6B7280", fontSize: 11 }}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                />
                <Tooltip 
                  formatter={(val: any) => [formatRupee(Number(val)), "Net Balance"]}
                  contentStyle={{
                    backgroundColor: isDarkMode ? "#1B1B1E" : "#FFFFFF",
                    borderRadius: "12px",
                    border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #D3D3D3",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    color: isDarkMode ? "#F9FAFB" : "#111827",
                    fontSize: "12px",
                    fontFamily: "Inter, sans-serif",
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="netBalance" 
                  stroke={currentStrokeColor} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
};


