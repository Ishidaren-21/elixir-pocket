import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Moon, Sun, DollarSign, Wallet, ShieldCheck, Sparkles, Check, Loader2 } from "lucide-react";

export const PreferencesView: React.FC = () => {
  const { preferences, updatePreferences } = useAuth();
  
  const [theme, setTheme] = useState<"light" | "dark">(preferences?.theme || "light");
  const [currency, setCurrency] = useState(preferences?.currency || "INR");
  const [monthlyBudget, setMonthlyBudget] = useState(preferences?.monthlyBudget?.toString() || "30000");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Category values
  const [food, setFood] = useState(preferences?.categoryBudgets?.food?.toString() || "8000");
  const [transport, setTransport] = useState(preferences?.categoryBudgets?.transport?.toString() || "3000");
  const [shopping, setShopping] = useState(preferences?.categoryBudgets?.shopping?.toString() || "6000");
  const [entertainment, setEntertainment] = useState(preferences?.categoryBudgets?.entertainment?.toString() || "4000");
  const [bills, setBills] = useState(preferences?.categoryBudgets?.bills?.toString() || "5005");

  const currenciesList = [
    { value: "INR", label: "Indian Rupee (₹)", symbol: "₹" },
    { value: "USD", label: "US Dollar ($)", symbol: "$" },
    { value: "EUR", label: "Euro (€)", symbol: "€" },
    { value: "GBP", label: "British Pound (£)", symbol: "£" },
    { value: "JPY", label: "Japanese Yen (¥)", symbol: "¥" },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      await updatePreferences({
        theme,
        currency,
        monthlyBudget: Number(monthlyBudget),
        categoryBudgets: {
          food: Number(food),
          transport: Number(transport),
          shopping: Number(shopping),
          entertainment: Number(entertainment),
          bills: Number(bills),
        },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="preferences_main_frame">
      <div id="pref_title_block">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white font-sans">Settings & Preferences</h1>
        <p className="text-xs text-neutral-500 font-sans mt-0.5">Configure your appearance theme, currency, and monthly budget limits.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="pref_form_layout">
        
        {/* Theme and Regional Configuration Card */}
        <div className="bg-white dark:bg-[#121214] rounded-xl border border-neutral-100 dark:border-neutral-800 p-6 space-y-6 h-fit" id="pref_card_localization">
          <div className="space-y-0.5" id="localization_header">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-sans">Theme & Currency</h2>
            <p className="text-xs text-neutral-500 font-sans">Select your interface theme and base currency.</p>
          </div>

          {/* Graphical Theme Switcher */}
          <div className="space-y-2" id="pref_grp_theme">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 font-sans">Visual Theme</label>
            <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-850 rounded-lg" id="theme_selection_container">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans ${theme === 'light' ? 'bg-white dark:bg-[#121214] text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-500'}`}
                id="btn_set_light"
              >
                <Sun className="h-4 w-4" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans ${theme === 'dark' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-500'}`}
                id="btn_set_dark"
              >
                <Moon className="h-4 w-4" />
                Dark
              </button>
            </div>
          </div>

          {/* Regional Currency selector */}
          <div className="space-y-1.5" id="pref_grp_currency">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 font-sans" htmlFor="currency_select">Currency</label>
            <select
              id="currency_select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#18181b]/50 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-800 font-sans"
            >
              {currenciesList.map((cur) => (
                <option key={cur.value} value={cur.value}>{cur.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Planning Caps & Category Thresholds Card */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121214] rounded-xl border border-neutral-100 dark:border-neutral-800 p-6 space-y-6" id="pref_card_categories">
          <div className="space-y-0.5" id="planning_header">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-sans">Monthly Budget & Category Limits</h2>
            <p className="text-xs text-neutral-500 font-sans">Set monthly maximum allowances across individual category groups.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="planning_grid">
            <div className="space-y-4" id="planning_col_left">
              {/* Default monthly budget cap */}
              <div className="space-y-1.5" id="pref_grp_monthly_cap">
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200" htmlFor="monthly_limit_input">Overall Account Limit ({currency})</label>
                <p className="text-[11px] text-neutral-400 leading-normal font-sans">Sets the total threshold trigger alert on your main scorecard dashboard.</p>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-xs">
                    {currenciesList.find(c => c.value === currency)?.symbol || "$"}
                  </span>
                  <input 
                    id="monthly_limit_input"
                    type="number"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    className="w-full pl-8 pr-4 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#18181b]/50 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-800 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Sub-group category caps */}
              <div className="space-y-3 pt-2" id="pref_grp_subcategories">
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Category Allowance Allocation ({currency})</label>
                
                {/* Food slider */}
                <div className="space-y-1.5" id="pref_subcat_food">
                  <div className="flex justify-between text-[11px] font-sans text-neutral-400">
                    <span>Food & Dining</span>
                    <span className="font-mono font-semibold">{food}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="50000" 
                    step="500"
                    value={food}
                    onChange={(e) => setFood(e.target.value)}
                    className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-neutral-50"
                  />
                </div>

                {/* Transport slider */}
                <div className="space-y-1.5" id="pref_subcat_transport">
                  <div className="flex justify-between text-[11px] font-sans text-neutral-400">
                    <span>Transport</span>
                    <span className="font-mono font-semibold">{transport}</span>
                  </div>
                  <input 
                    type="range" 
                    min="500" 
                    max="20000" 
                    step="250"
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-neutral-50"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4" id="planning_col_right">
              <div className="space-y-3" id="planning_recomm_slidings">
                {/* Shopping slider */}
                <div className="space-y-1.5" id="pref_subcat_shopping">
                  <div className="flex justify-between text-[11px] font-sans text-neutral-400">
                    <span>Shopping</span>
                    <span className="font-mono font-semibold">{shopping}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="50000" 
                    step="500"
                    value={shopping}
                    onChange={(e) => setShopping(e.target.value)}
                    className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-neutral-50"
                  />
                </div>

                {/* Entertainment slider */}
                <div className="space-y-1.5" id="pref_subcat_ent">
                  <div className="flex justify-between text-[11px] font-sans text-neutral-400">
                    <span>Entertainment</span>
                    <span className="font-mono font-semibold">{entertainment}</span>
                  </div>
                  <input 
                    type="range" 
                    min="500" 
                    max="30000" 
                    step="250"
                    value={entertainment}
                    onChange={(e) => setEntertainment(e.target.value)}
                    className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-neutral-50"
                  />
                </div>

                {/* Bills slider */}
                <div className="space-y-1.5" id="pref_subcat_bills">
                  <div className="flex justify-between text-[11px] font-sans text-neutral-400">
                    <span>Bills & Utilities</span>
                    <span className="font-mono font-semibold">{bills}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="80000" 
                    step="500"
                    value={bills}
                    onChange={(e) => setBills(e.target.value)}
                    className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-neutral-50"
                  />
                </div>
              </div>

              {/* Informative Security Notice Block */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-850 border border-neutral-150 dark:border-neutral-800/80 rounded-xl space-y-1 text-[11px] font-sans text-neutral-400 dark:text-neutral-500 mt-2" id="pref_security_notice">
                <p className="font-semibold text-neutral-650 dark:text-neutral-300 flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Self-Reporting Lock
                </p>
                <p className="leading-relaxed">All parameters are secured by decentralized token policies. Outflows surpassing thresholds trigger instant alert signals on AI and Main dashboard frames.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-100 dark:border-neutral-850 pt-5 mt-6 flex items-center justify-between" id="pref_footer_action_row">
            <span className="text-xs text-neutral-400 font-sans">
              Preferences are saved and applied across your sessions.
            </span>
            <div className="flex items-center gap-3" id="save_actions">
              {success && (
                <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 animate-pulse" id="save_success_text">
                  <Check className="h-4 w-4" />
                  Settings Saved
                </span>
              )}
              <button
                type="submit"
                disabled={loading}
                className="py-2 px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
                id="btn_commit_preferences"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 text-neutral-400" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};
