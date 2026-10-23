import React, { useState, useMemo, useEffect, useRef } from "react";
import { Transaction, TransactionType } from "../types";
import { 
  Search, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  FileDown, 
  Download,
  Check,
  FileSpreadsheet,
  Plus, 
  Trash2, 
  Edit2, 
  ArrowUp, 
  ArrowDown, 
  RefreshCcw, 
  Calendar,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { THEME_COLORS, getCategoryBadge, parseLocalDate } from "../theme";

interface TransactionsViewProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, "id" | "userId">) => Promise<void>;
  onEditTransaction: (tx: Transaction) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onOpenQuickAdd: () => void;
  onEditClick: (tx: Transaction) => void;
}

type DateRangeFilter = "all" | "this_week" | "this_month" | "prev_month";

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onOpenQuickAdd,
}) => {
  const { preferences } = useAuth();

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<TransactionType | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<DateRangeFilter>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Add / Edit Modal inside History
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Two-Stage Deletion with 5-Second Safeguard
  const [deleteTargetTx, setDeleteTargetTx] = useState<Transaction | null>(null);
  const [deleteStage, setDeleteStage] = useState<"initial" | "countdown">("initial");
  const [countdown, setCountdown] = useState(5);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  // Countdown timer effect
  useEffect(() => {
    if (deleteStage === "countdown") {
      setCountdown(5);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deleteStage]);

  // Cancel deletion
  const cancelDelete = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDeleteTargetTx(null);
    setDeleteStage("initial");
    setCountdown(5);
  };

  // Perform final deletion
  const handleFinalDelete = async () => {
    if (!deleteTargetTx || countdown > 0) return;
    setIsDeleting(true);
    try {
      await onDeleteTransaction(deleteTargetTx.id);
      setToastMessage(`"${deleteTargetTx.description}" removed successfully.`);
      setTimeout(() => setToastMessage(null), 4000);
      cancelDelete();
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to delete transaction. Please try again.");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Edit in Modal
  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setModalType(tx.type);
    setAmount(tx.amount.toString());
    setDescription(tx.description);
    setCategory(tx.category);
    setDate(tx.date);
    setModalOpen(true);
  };

  // Open Add in Modal
  const openAddModal = (type: TransactionType = "expense") => {
    setEditingTx(null);
    setModalType(type);
    setAmount("");
    setDescription("");
    setCategory(type === "expense" ? "food" : "salary");
    setDate(new Date().toISOString().split("T")[0]);
    setModalOpen(true);
  };

  // Save Add/Edit
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
        setToastMessage("Transaction updated successfully.");
      } else {
        await onAddTransaction({
          type: modalType,
          amount: num,
          category,
          date,
          description: finalDesc,
        });
        setToastMessage("Transaction recorded successfully.");
      }
      setTimeout(() => setToastMessage(null), 4000);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Formatting Currency
  const formatRupee = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val).replace("INR", "₹").trim();
  };

  // Derive unique categories from user txs
  const categoriesList = useMemo(() => {
    const defaultCats = ["food", "shopping", "transport", "bills", "entertainment", "health", "education", "housing", "salary", "freelance", "business", "investments", "other"];
    const fromTxs = transactions.map(t => (t.category || "other").toLowerCase());
    return Array.from(new Set([...defaultCats, ...fromTxs]));
  }, [transactions]);

  // Apply filters and sorting with timezone-safe date parsing
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. Search query filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          (t.description || "").toLowerCase().includes(term) ||
          (t.category || "").toLowerCase().includes(term)
      );
    }

    // 2. Type filter
    if (filterType !== "all") {
      result = result.filter((t) => t.type === filterType);
    }

    // 3. Category filter
    if (filterCategory !== "all") {
      result = result.filter((t) => (t.category || "").toLowerCase() === filterCategory.toLowerCase());
    }

    // 4. Date Range filter (safe local date comparison)
    if (filterDateRange !== "all") {
      const now = new Date();
      result = result.filter((t) => {
        const txDate = parseLocalDate(t.date);
        if (filterDateRange === "this_week") {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          oneWeekAgo.setHours(0, 0, 0, 0);
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          return txDate >= oneWeekAgo && txDate <= endOfDay;
        } else if (filterDateRange === "this_month") {
          return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
        } else if (filterDateRange === "prev_month") {
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return txDate.getFullYear() === prevYear && txDate.getMonth() === prevMonth;
        }
        return true;
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortBy === "date") {
        const d1 = parseLocalDate(a.date).getTime();
        const d2 = parseLocalDate(b.date).getTime();
        return sortOrder === "desc" ? d2 - d1 : d1 - d2;
      } else {
        return sortOrder === "desc" ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    return result;
  }, [transactions, searchTerm, filterType, filterCategory, filterDateRange, sortBy, sortOrder]);

  // Aggregated totals of filtered view
  const filteredIncome = useMemo(() => 
    processedTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0), 
    [processedTransactions]
  );
  const filteredExpense = useMemo(() => 
    processedTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0), 
    [processedTransactions]
  );

  // Pagination slices
  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedTransactions.slice(start, start + itemsPerPage);
  }, [processedTransactions, currentPage]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterDateRange("all");
    setSortBy("date");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  // Export Data State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"filtered" | "all">("filtered");
  const [isExporting, setIsExporting] = useState(false);

  // Derived dataset for export
  const exportDataset = useMemo(() => {
    if (exportScope === "all") return transactions;
    return processedTransactions;
  }, [exportScope, transactions, processedTransactions]);

  const exportIncome = useMemo(() => 
    exportDataset.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [exportDataset]
  );
  const exportExpense = useMemo(() => 
    exportDataset.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [exportDataset]
  );

  // CSV Exporter
  const handleExportCSV = (targetScope: "filtered" | "all" = exportScope) => {
    const dataToExport = targetScope === "all" ? transactions : processedTransactions;
    if (dataToExport.length === 0) return;

    setIsExporting(true);
    try {
      const headers = ["Date", "Type", "Category", "Amount", "Currency", "Description", "Transaction ID"];
      const rows = dataToExport.map((t) => {
        const cleanDesc = `"${(t.description || "").replace(/"/g, '""')}"`;
        const cleanCat = `"${(t.category || "").replace(/"/g, '""')}"`;
        const typeLabel = t.type === "income" ? "Income" : "Expense";
        const amountVal = t.amount.toString();
        const currency = preferences?.currencySymbol || "INR";
        const txId = `"${t.id}"`;
        return [t.date, typeLabel, cleanCat, amountVal, `"${currency}"`, cleanDesc, txId].join(",");
      });

      // UTF-8 BOM ensures spreadsheet applications render Unicode cleanly
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date().toISOString().split("T")[0];
      const scopeSuffix = targetScope === "filtered" ? "filtered" : "all";
      link.href = url;
      link.download = `Expense_Tracker_History_${scopeSuffix}_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToastMessage(`Exported ${dataToExport.length} transactions to CSV.`);
      setTimeout(() => setToastMessage(null), 4000);
      setExportModalOpen(false);
    } catch (err) {
      console.error("Export CSV error:", err);
      setToastMessage("Failed to export transactions. Please try again.");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6" id="tx_history_view">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-50 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-sans">
            Ledger History
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Query, filter, inspect, and export your complete transaction ledger.
          </p>
        </div>

        {/* Action buttons with refined styling */}
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => {
              if (transactions.length === 0) return;
              const hasActiveFilters = searchTerm.trim() !== "" || filterType !== "all" || filterCategory !== "all" || filterDateRange !== "all";
              setExportScope(hasActiveFilters && processedTransactions.length > 0 ? "filtered" : "all");
              setExportModalOpen(true);
            }}
            disabled={transactions.length === 0}
            className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#1B1B1E] text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
            id="btn_export_data"
            data-testid="export-data-btn"
            title={transactions.length === 0 ? "No transactions to export" : "Export transaction history as a CSV file"}
          >
            <FileDown className="w-3.5 h-3.5 text-[#66101F] dark:text-[#E28B96]" />
            Export CSV
          </button>
          
          <button 
            type="button"
            onClick={() => openAddModal("expense")}
            className="px-4 py-2 rounded-xl bg-[#66101F] hover:bg-[#520D19] dark:bg-[#E28B96] dark:hover:bg-[#F09FA9] dark:text-[#1A0609] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            id="btn_add_tx_history"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 p-5 shadow-2xs space-y-4 transition-colors" id="filters_card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" id="filters_grid">
          
          {/* 1. Search Query Input */}
          <div className="relative lg:col-span-1.5">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search description or category..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96] transition-all font-sans"
              id="tx_search_input"
            />
          </div>

          {/* 2. Transaction Type Filter */}
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value as any); setCurrentPage(1); }}
            className="px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96] font-sans"
            id="tx_type_select"
          >
            <option value="all">All Types</option>
            <option value="expense">Outflow Only</option>
            <option value="income">Inflow Only</option>
          </select>

          {/* 3. Date Range Filter */}
          <select
            value={filterDateRange}
            onChange={(e) => { setFilterDateRange(e.target.value as any); setCurrentPage(1); }}
            className="px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96] font-sans"
            id="tx_date_range_select"
          >
            <option value="all">All Dates</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="prev_month">Previous Month</option>
          </select>

          {/* 4. Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 capitalize focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96] font-sans"
            id="tx_category_select"
          >
            <option value="all">All Categories</option>
            {categoriesList.map((cat) => {
              const meta = getCategoryBadge(cat);
              return (
                <option key={cat} value={cat}>
                  {meta.emoji} {meta.label}
                </option>
              );
            })}
          </select>

          {/* 5. Sort & Reset Actions */}
          <div className="flex items-center gap-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, ord] = e.target.value.split("-") as ["date" | "amount", "asc" | "desc"];
                setSortBy(by);
                setSortOrder(ord);
                setCurrentPage(1);
              }}
              className="grow px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96] font-sans"
              id="tx_sort_select"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="p-2.5 text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-50 dark:hover:bg-white/5 cursor-pointer transition-colors shrink-0"
              title="Reset all filters"
              id="btn_reset_filters"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Active Filter Totals Summary strip */}
        <div className="flex flex-wrap items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-100 dark:border-white/5 font-sans">
          <span>
            Displaying <strong className="text-stone-900 dark:text-stone-100 font-semibold">{processedTransactions.length}</strong> matching entries
          </span>
          <div className="flex items-center gap-4">
            <span>
              Total Income: <strong className="text-green-700 dark:text-green-400 font-semibold font-mono financial-num">{formatRupee(filteredIncome)}</strong>
            </span>
            <span>
              Total Expenses: <strong className="text-red-700 dark:text-red-400 font-semibold font-mono financial-num">{formatRupee(filteredExpense)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Transactions Table Card */}
      <div className="bg-white dark:bg-[#1B1B1E] rounded-2xl border border-stone-200/80 dark:border-white/10 shadow-2xs overflow-hidden transition-colors" id="transactions_table_container">
        
        {processedTransactions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Calendar className="w-9 h-9 text-stone-300 dark:text-stone-600 mx-auto" />
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 font-sans">
              {transactions.length === 0 ? "No ledger entries yet" : "No entries matching filter"}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto font-sans">
              {transactions.length === 0 
                ? "Record your first income or expense to populate your personal financial ledger." 
                : "No transactions match your active search or filters. Clear your filters to view all records."}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              {transactions.length === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => openAddModal("income")}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-medium cursor-pointer shadow-2xs transition-colors"
                  >
                    + Record Income
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddModal("expense")}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium cursor-pointer shadow-2xs transition-colors"
                  >
                    + Record Expense
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 dark:border-white/5 bg-stone-50/60 dark:bg-stone-800/40 text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider font-sans">
                  <th className="py-3.5 px-5">Description</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-5 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-white/5 text-stone-700 dark:text-stone-300">
                {paginatedTransactions.map((tx) => {
                  const meta = getCategoryBadge(tx.category);
                  const formattedDate = parseLocalDate(tx.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-stone-50/70 dark:hover:bg-white/5 transition-colors group"
                      id={`tx_row_${tx.id}`}
                    >
                      <td className="py-3.5 px-5 font-semibold text-stone-900 dark:text-stone-100 font-sans">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{meta.emoji}</span>
                          <span className="truncate max-w-xs">{tx.description || meta.label}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-stone-600 dark:text-stone-400 font-sans">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span 
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            tx.type === "income" 
                              ? "text-emerald-700 dark:text-emerald-400" 
                              : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {tx.type === "income" ? (
                            <><ArrowUp className="w-3 h-3 stroke-[2.5]" /> Inflow</>
                          ) : (
                            <><ArrowDown className="w-3 h-3 stroke-[2.5]" /> Outflow</>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 dark:text-stone-400 font-medium font-sans">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold font-mono financial-num">
                        <span className={tx.type === "income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                          {tx.type === "income" ? "+" : "-"} {formatRupee(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(tx)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTargetTx(tx);
                              setDeleteStage("initial");
                              setCountdown(5);
                            }}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {processedTransactions.length > itemsPerPage && (
          <div className="py-3.5 px-5 border-t border-stone-100 dark:border-white/5 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Two-Stage Deletion Confirmation Dialog with 5-Second Countdown Safeguard */}
      <AnimatePresence>
        {deleteTargetTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" id="delete_safeguard_overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white dark:bg-[#1B1B1E] border border-stone-200/80 dark:border-white/10 rounded-3xl shadow-xl p-6 w-full max-w-md text-left relative"
              id="delete_safeguard_modal"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-sans">
                    {deleteStage === "initial" ? "Confirm Deletion Request" : "Security Verification Countdown"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Transaction Context Card */}
              <div className="my-4 p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/60 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 capitalize font-sans">
                    {deleteTargetTx.description || deleteTargetTx.category}
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 capitalize mt-0.5 font-sans">
                    {deleteTargetTx.category} • {deleteTargetTx.date}
                  </p>
                </div>
                <span className={`text-xs font-bold font-mono financial-num ${deleteTargetTx.type === "income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                  {deleteTargetTx.type === "income" ? "+" : "-"} {formatRupee(deleteTargetTx.amount)}
                </span>
              </div>

              {deleteStage === "initial" ? (
                <div className="space-y-4">
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-sans">
                    Deleting this entry is <strong>permanent and irreversible</strong>. It will immediately adjust your financial totals, recalculate monthly budget progress, and refresh all trend metrics.
                  </p>
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={cancelDelete}
                      className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStage("countdown")}
                      className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium cursor-pointer shadow-2xs"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-center space-y-1.5">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                      Deliberate verification period in progress
                    </p>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      {countdown > 0 ? (
                        <>You can confirm deletion in <span className="text-base text-rose-700 font-extrabold">{countdown}</span> {countdown === 1 ? "second" : "seconds"}.</>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">Safeguard period complete. You may now execute deletion.</span>
                      )}
                    </p>
                    <div className="w-full bg-amber-200/80 dark:bg-amber-900/50 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-rose-700 h-full transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={cancelDelete}
                      className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={countdown > 0 || isDeleting}
                      onClick={handleFinalDelete}
                      className={`px-5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs ${
                        countdown > 0 || isDeleting 
                          ? "bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed border border-stone-300 dark:border-stone-700" 
                          : "bg-rose-700 hover:bg-rose-800 text-white cursor-pointer"
                      }`}
                    >
                      {isDeleting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...</>
                      ) : countdown > 0 ? (
                        `Delete (${countdown}s)`
                      ) : (
                        "Confirm Delete"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Add / Edit Transaction directly inside History */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" id="history_tx_modal_overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white dark:bg-[#1B1B1E] border border-stone-200/80 dark:border-white/10 rounded-3xl shadow-xl p-6 w-full max-w-md relative"
              id="history_tx_modal_content"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 dark:border-white/10">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-sans">
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

              {/* Segmented Type Toggle with Strict Semantic Colors */}
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
                      className="w-full pl-8 pr-4 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 font-bold font-mono financial-num focus:outline-none focus:ring-2 focus:ring-[#66101F]/20 focus:border-[#66101F] dark:focus:ring-[#E28B96]/30 dark:focus:border-[#E28B96]"
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

      {/* Modal: Export Data */}
      <AnimatePresence>
        {exportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" id="export_data_modal_overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white dark:bg-[#1B1B1E] border border-stone-200/80 dark:border-white/10 rounded-3xl shadow-xl p-6 w-full max-w-md relative"
              id="export_data_modal_content"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#FAF3F4] dark:bg-[#66101F]/20 text-[#66101F] dark:text-[#F5B8BF] flex items-center justify-center shrink-0">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-sans">
                      Export Ledger Data
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-sans">
                      Download your records as a standardized UTF-8 CSV spreadsheet
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scope Selection */}
              <div className="my-4 space-y-3">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block font-sans">
                  Select Scope
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExportScope("filtered")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      exportScope === "filtered"
                        ? "border-[#66101F] bg-[#FAF3F4] dark:border-[#E28B96] dark:bg-[#66101F]/20 text-[#66101F] dark:text-[#F5B8BF] ring-2 ring-[#66101F]/15"
                        : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-sans">Filtered View</span>
                      {exportScope === "filtered" && <Check className="w-3.5 h-3.5 text-[#66101F] dark:text-[#F5B8BF]" />}
                    </div>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-sans">
                      {processedTransactions.length} {processedTransactions.length === 1 ? "record" : "records"} matching filters
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope("all")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      exportScope === "all"
                        ? "border-[#66101F] bg-[#FAF3F4] dark:border-[#E28B96] dark:bg-[#66101F]/20 text-[#66101F] dark:text-[#F5B8BF] ring-2 ring-[#66101F]/15"
                        : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-sans">All Records</span>
                      {exportScope === "all" && <Check className="w-3.5 h-3.5 text-[#66101F] dark:text-[#F5B8BF]" />}
                    </div>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-sans">
                      {transactions.length} total recorded {transactions.length === 1 ? "entry" : "entries"}
                    </span>
                  </button>
                </div>

                {/* Summary Preview Box */}
                <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/60 dark:border-white/5 text-xs space-y-2">
                  <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px]">
                    <span>Format</span>
                    <span className="font-semibold text-stone-700 dark:text-stone-300">CSV (.csv, UTF-8 BOM)</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px]">
                    <span>Transactions to export</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 font-mono financial-num">{exportDataset.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px]">
                    <span>Total Income</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono financial-num">{formatRupee(exportIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px]">
                    <span>Total Expenses</span>
                    <span className="font-bold text-rose-700 dark:text-rose-400 font-mono financial-num">{formatRupee(exportExpense)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                  Compatible with Microsoft Excel, Apple Numbers, Google Sheets, or custom accounting imports.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200/70 dark:border-white/10 mt-4">
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV(exportScope)}
                  disabled={exportDataset.length === 0 || isExporting}
                  className="px-5 py-2 rounded-xl bg-[#66101F] hover:bg-[#520D19] dark:bg-[#E28B96] dark:hover:bg-[#F09FA9] dark:text-[#1A0B0E] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-40"
                  id="btn_confirm_download_csv"
                >
                  {isExporting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing...</>
                  ) : (
                    <><Download className="w-3.5 h-3.5" /> Download CSV ({exportDataset.length})</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
