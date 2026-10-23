import React, { useState, useEffect, useMemo } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthViews } from "./components/AuthViews";
import { DashboardView } from "./components/DashboardView";
import { TransactionsView } from "./components/TransactionsView";
import { AnalyticsView } from "./components/AnalyticsView";
import { Transaction } from "./types";
import { dbGetTransactions, dbAddTransaction, dbUpdateTransaction, dbDeleteTransaction } from "./firebase";
import { 
  Home, 
  List, 
  BarChart2, 
  LogOut, 
  ChevronDown, 
  Loader2,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const AppContent: React.FC = () => {
  const { user, loading: authLoading, logout, preferences, updatePreferences } = useAuth();
  
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txsLoading, setTxsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDarkMode = preferences?.theme === "dark";
  const toggleTheme = () => {
    const nextTheme = isDarkMode ? "light" : "dark";
    updatePreferences({ theme: nextTheme });
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Load user transactions when authenticated
  const loadTransactions = async () => {
    if (!user) return;
    setTxsLoading(true);
    try {
      const records = await dbGetTransactions(user.uid);
      setTransactions(records);
    } catch (err) {
      console.error("Ledger fetch failed: ", err);
    } finally {
      setTxsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTransactions();
    } else {
      setTransactions([]);
    }
  }, [user]);

  // Addition callback
  const handleAddTransaction = async (tx: Omit<Transaction, "id" | "userId">) => {
    if (!user) return;
    try {
      await dbAddTransaction(user.uid, tx);
      await loadTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  // Editing callback
  const handleEditTransaction = async (tx: Transaction) => {
    if (!user) return;
    try {
      await dbUpdateTransaction(user.uid, tx);
      await loadTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  // Deletion callback
  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await dbDeleteTransaction(user.uid, id);
      await loadTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  // User display metadata
  const userInitials = useMemo(() => {
    if (user?.displayName) {
      const parts = user.displayName.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  }, [user]);

  const userDisplayName = useMemo(() => {
    if (user?.displayName) return user.displayName;
    if (user?.email) {
      const name = user.email.split("@")[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return "User";
  }, [user]);

  const userEmail = user?.email || "";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#121214] flex flex-col items-center justify-center space-y-3" id="global_auth_loader">
        <Loader2 className="w-8 h-8 animate-spin text-[#66101F] dark:text-[#E28B96]" />
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 font-sans">Loading Elixir Pocket...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthViews />;
  }

  // Sidebar navigation items
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "history", label: "History", icon: List },
    { id: "trends", label: "Trends", icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] dark:bg-[#121214] text-neutral-900 dark:text-neutral-100 transition-colors duration-250" id="main_app_wrapper">
      
      {/* ======================================================== */}
      {/* 1. PERSISTENT LEFT SIDEBAR (Desktop) */}
      {/* Visual Foundation: Exact brand burgundy #450214 matching official Elixir Pocket logo */}
      {/* ======================================================== */}
      <aside className="hidden lg:flex flex-col justify-between w-64 bg-[#450214] border-r border-[#5A051D] p-5 shrink-0 sticky top-0 h-screen select-none z-30 transition-colors duration-250" id="desktop_sidebar">
        
        {/* Top Section: Logo & Nav items */}
        <div className="space-y-7">
          
          {/* Application Logo and Name */}
          <div className="flex items-center justify-between px-1" id="sidebar_logo_block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs shrink-0 border border-white/10" id="sidebar_logo_icon">
                <img 
                  src="/assets/aistudio/Elixir_Pocket_Logo_242edb4e.png" 
                  alt="Elixir Pocket Logo" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white font-sans leading-tight">
                  Elixir Pocket
                </h1>
                <span className="text-[10px] text-[#D3D3D3] font-medium tracking-wide">Finance Command</span>
              </div>
            </div>

            {/* Subtle Theme Toggle in Sidebar Header */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isDarkMode ? "Switch to Light mode" : "Switch to Dark mode"}
              aria-label="Toggle color theme"
              id="sidebar_theme_toggle"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDarkMode ? (
                  <motion.svg
                    key="sun"
                    initial={{ rotate: -45, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 45, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="w-4 h-4 text-amber-300 fill-none stroke-current stroke-2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round" />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="moon"
                    initial={{ rotate: 45, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 45, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="w-4 h-4 text-white fill-none stroke-current stroke-2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 3a6 6 0 0 0 9 9 9 0 1 1-9-9Z" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Navigation Links with Morphing Indicator */}
          <nav className="space-y-1 relative" id="sidebar_nav">
            {navItems.map((item) => {
              const active = item.id === activeTab;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left z-10 ${
                    active
                      ? "text-white font-semibold"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  id={`sidebar_nav_${item.id}`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNavBackground"
                      className="absolute inset-0 bg-white/20 border border-white/25 rounded-xl -z-10 shadow-xs"
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white stroke-[2.2]" : "text-white/80 stroke-[1.8]"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

        </div>

        {/* Bottom Section: User Profile & Logout */}
        <div className="space-y-3 pt-4 border-t border-white/15 dark:border-white/10" id="sidebar_user_bottom">
          
          {/* User Profile Area */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/10 dark:bg-white/5 border border-white/15 dark:border-white/10" id="sidebar_user_profile">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white text-[#450214] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={userDisplayName} className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate font-sans">
                  {userDisplayName}
                </p>
                <p className="text-[10px] text-[#D3D3D3] truncate">
                  {userEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Logout Action */}
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            id="sidebar_logout_btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>

        </div>

      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE TOP BAR & NAVIGATION DRAWER */}
      {/* ======================================================== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#450214] border-b border-[#5A051D] px-4 py-3 flex items-center justify-between transition-colors duration-250 shadow-xs" id="mobile_header">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-xs shrink-0 border border-white/10">
            <img 
              src="/assets/aistudio/Elixir_Pocket_Logo_242edb4e.png" 
              alt="Elixir Pocket Logo" 
              className="w-full h-full object-cover" 
            />
          </div>
          <span className="text-sm font-bold text-white font-sans">Elixir Pocket</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Toggle color theme"
          >
            {isDarkMode ? (
              <span className="text-sm">☀️</span>
            ) : (
              <span className="text-sm">🌙</span>
            )}
          </button>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-white hover:bg-white/10 transition-colors cursor-pointer"
            id="mobile_menu_trigger"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="lg:hidden fixed top-14 left-0 right-0 z-30 bg-[#450214] border-b border-[#5A051D] p-4 shadow-xl space-y-3"
            id="mobile_dropdown_menu"
          >
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = item.id === activeTab;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      active
                        ? "bg-white/20 text-white font-semibold border border-white/25"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-white" : "text-white/80"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-white/15 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white text-[#450214] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={userDisplayName} className="w-full h-full object-cover" />
                  ) : (
                    userInitials
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white font-sans">{userDisplayName}</p>
                  <p className="text-[10px] text-[#D3D3D3]">{userEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-xs font-medium text-white/90 hover:text-white p-2 cursor-pointer hover:underline"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ======================================================== */}
      {/* 3. MAIN CONTENT AREA */}
      {/* Clean snow-white / pale grey surface #F8F9FA in light mode */}
      {/* ======================================================== */}
      <main className="grow max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 lg:py-8 mt-14 lg:mt-0 transition-colors duration-250" id="main_content_area">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full"
            id={`tab_container_${activeTab}`}
          >

            {activeTab === "dashboard" && (
              <DashboardView
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onNavigateToTab={setActiveTab}
              />
            )}

            {activeTab === "history" && (
              <TransactionsView
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onOpenQuickAdd={() => setActiveTab("dashboard")}
                onEditClick={() => setActiveTab("dashboard")}
              />
            )}

            {activeTab === "trends" && (
              <AnalyticsView transactions={transactions} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
