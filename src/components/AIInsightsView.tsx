import React, { useState, useEffect } from "react";
import { Transaction, AIInsight, AIAnalysisResult } from "../types";
import { useAuth } from "../context/AuthContext";
import { Sparkles, RefreshCcw, AlertTriangle, Target, CheckCircle2, TrendingDown, TrendingUp, Flame, HelpCircle, Loader2 } from "lucide-react";

interface AIInsightsViewProps {
  transactions: Transaction[];
}

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({ transactions }) => {
  const { preferences } = useAuth();
  
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (force = false) => {
    if (transactions.length === 0) {
      setError("Please load transactions first to activate AI analysis.");
      return;
    }

    // Attempt to load from cache if not forcing refresh
    if (!force) {
      const cached = localStorage.getItem(`ai_analysis_${transactions.length}`);
      if (cached) {
        try {
          setAnalysis(JSON.parse(cached));
          return;
        } catch (_) {}
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions,
          budgetSettings: preferences,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to contacts AI advisory cores. Please retry.");
      }

      const data: AIAnalysisResult = await response.json();
      setAnalysis(data);
      // Cache results based on transactions count
      localStorage.setItem(`ai_analysis_${transactions.length}`, JSON.stringify(data));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "AI Insights calculation failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [transactions]);

  // Premium helper icon loader
  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "alert":
        return <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "success":
        return <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "tip":
        return <Target className="h-4.5 w-4.5 text-[#855A5C] dark:text-[#E28B96] shrink-0" />;
      case "trend":
        return <TrendingUp className="h-4.5 w-4.5 text-[#66101F] dark:text-[#E28B96] shrink-0" />;
      default:
        return <Sparkles className="h-4.5 w-4.5 text-stone-400 shrink-0" />;
    }
  };

  // Premium helper card background matching
  const getInsightClasses = (type: AIInsight["type"]) => {
    switch (type) {
      case "alert":
        return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-stone-800 dark:text-stone-100";
      case "success":
        return "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-stone-800 dark:text-stone-100";
      case "tip":
        return "bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-100";
      case "trend":
        return "bg-[#FDF2F4] dark:bg-[#66101F]/15 border-[#855A5C]/20 dark:border-[#855A5C]/30 text-stone-800 dark:text-stone-100";
      default:
        return "bg-stone-50 dark:bg-[#1B1B1E] border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-100";
    }
  };

  return (
    <div className="space-y-6" id="ai_insights_main">
      <div className="flex items-center justify-between" id="ai_header_row">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white font-sans">Financial Insights</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-0.5">Automated savings analysis and smart recommendations based on your spending.</p>
        </div>

        <button
          onClick={() => fetchInsights(true)}
          disabled={loading || transactions.length === 0}
          className="px-3.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1B1B1E] hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 transition-all select-none cursor-pointer disabled:opacity-50 font-sans"
          id="btn_recalculate_insights"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="h-3.5 w-3.5" />
          )}
          Refresh Insights
        </button>
      </div>

      {transactions.length === 0 && (
        <div className="py-24 bg-white dark:bg-[#121214] rounded-xl border border-neutral-100 dark:border-neutral-800 text-center flex flex-col items-center justify-center space-y-4" id="ai_empty_fallback">
          <Sparkles className="h-10 w-10 text-neutral-300 stroke-[1.5]" />
          <div className="space-y-1 max-w-sm" id="ai_empty_desc">
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100 font-sans">AI Agent Offline</h3>
            <p className="text-xs text-neutral-400 font-sans">
              No transactions detected in portfolio ledger. Ingest an Excel or PDF statement, or add manual records to evaluate models.
            </p>
          </div>
        </div>
      )}

      {transactions.length > 0 && !analysis && !loading && (
        <div className="py-24 bg-white dark:bg-[#121214] rounded-xl border border-neutral-100 dark:border-neutral-800 text-center flex flex-col items-center justify-center space-y-4" id="ai_ready_trigger_fallback">
          <Sparkles className="h-10 w-10 text-neutral-400 stroke-[1.5] animate-pulse" />
          <div className="space-y-2 max-w-sm" id="ai_ready_desc">
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100 font-sans">AI Ready to Analyze</h3>
            <p className="text-xs text-neutral-400 font-sans">
              Google Gemini 3.5 Flash is ready to analyze your financial ledger entries for anomalous trends, budget limits, and high-level recommendations.
            </p>
            <button
              onClick={() => fetchInsights(true)}
              className="py-1.5 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-semibold cursor-pointer font-sans"
            >
              Analyze Portfolio Now
            </button>
          </div>
        </div>
      )}

      {loading && !analysis && (
        <div className="py-32 bg-white dark:bg-[#121214] rounded-xl border border-neutral-100 dark:border-neutral-800 text-center flex flex-col items-center justify-center space-y-4" id="ai_first_load_spinner">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          <div className="space-y-1 block" id="ai_load_desc">
            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 font-sans">Analyzing structural matrix patterns...</p>
            <p className="text-[10px] text-neutral-400 font-mono">ESTIMATED RUN TIME: 2 SECONDS</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 text-red-650 dark:text-red-400 rounded-xl text-xs flex gap-2.5 items-start font-sans" id="ai_advisory_error">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Portfolio Evaluation Suspended</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="ai_analysis_grid">
          
          {/* Main Scoring Index Card */}
          <div className="lg:col-span-1 bg-white dark:bg-[#1B1B1E] rounded-3xl border border-stone-200/80 dark:border-white/10 p-6 flex flex-col justify-between shadow-xs transition-colors" id="ai_scoring_weight_card">
            <div className="space-y-6" id="scoring_body">
              <div className="space-y-1" id="scoring_header">
                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">Savings Health Score</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">Calculated by evaluating total income against spending habits.</p>
              </div>

              {/* Graphical Circular Progress Score */}
              <div className="relative flex flex-col items-center justify-center py-4" id="score_doughnut_frame">
                <svg className="w-36 h-36" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="transparent" 
                    stroke="rgba(0,0,0,0.03)" 
                    className="dark:stroke-stone-800"
                    strokeWidth="8" 
                  />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="transparent" 
                    stroke="currentColor" 
                    className="text-stone-900 dark:text-stone-100 transition-all duration-1000"
                    strokeWidth="8" 
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * analysis.balanceHealth) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center" id="score_inner_kpi">
                  <span className="text-3xl font-bold text-stone-950 dark:text-stone-50 font-mono tracking-tight">{analysis.balanceHealth}</span>
                  <span className="text-[9px] text-stone-400 dark:text-stone-500 font-bold font-mono tracking-widest leading-none">SCORE INDEX</span>
                </div>
              </div>

              <p className="text-xs text-center text-stone-500 dark:text-stone-400 max-w-[240px] mx-auto font-sans leading-relaxed">
                {analysis.balanceHealth >= 70 
                  ? "Outstanding efficiency. You are accumulating assets rapidly compared to expenditure velocities." 
                  : "Caution advised. Savings levels reside below healthy safety margins."
                }
              </p>
            </div>

            <div className="border-t border-stone-100 dark:border-stone-800 pt-4 mt-8" id="scoring_intel_badge">
              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold font-mono uppercase flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                Active planning limits verified
              </span>
            </div>
          </div>

          {/* Dynamic AI Signals/Insights Cards with high contrast Bento styling */}
          <div className="lg:col-span-2 space-y-6" id="ai_signals_list_card">
            <div className="bg-[#FDF2F4] dark:bg-[#1B1B1E] rounded-3xl border border-[#855A5C]/20 dark:border-white/10 p-6 flex flex-col shadow-2xs gap-4 transition-colors" id="ai_insight_cards_container">
              <div className="space-y-1" id="insights_cards_header">
                <h2 className="text-sm font-semibold text-[#66101F] dark:text-[#E28B96] font-sans">Spending Signals & Alerts</h2>
                <p className="text-xs text-stone-600 dark:text-stone-400 font-sans">Key observations detected in your transaction history.</p>
              </div>

              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1" id="insights_cards_list">
                {analysis.insights.map((insight, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white/80 dark:bg-[#252528] p-4 rounded-2xl border border-white/80 dark:border-white/5 shadow-2xs flex items-start gap-3 transition-colors"
                    id={`insight_card_${idx}`}
                  >
                    <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                    <div className="space-y-1 text-xs" id={`insight_card_body_${idx}`}>
                      <div className="flex items-center gap-1.5 flex-wrap" id={`insight_card_head_${idx}`}>
                        <span className="font-bold text-stone-900 dark:text-white font-sans">{insight.title}</span>
                        <span className="text-[9px] uppercase font-bold font-mono px-2 py-0.5 rounded-full bg-stone-900/5 dark:bg-white/5 text-stone-500 dark:text-stone-400">{insight.category}</span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-300 leading-relaxed font-sans">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Recommendations Checklist */}
            <div className="bg-white dark:bg-[#1B1B1E] rounded-3xl border border-stone-200/80 dark:border-white/10 p-6 flex flex-col shadow-xs transition-colors" id="ai_recommendations_container">
              <div className="space-y-1 mb-4" id="recomms_header">
                <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-sans">Smart Recommendations</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">Actionable suggestions to optimize your savings and budget.</p>
              </div>

              <ul className="space-y-3 text-xs" id="recomms_list">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start text-zinc-700 dark:text-zinc-300 font-sans" id={`rec_item_${idx}`}>
                    <span className="h-5 w-5 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-150 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center text-[10px] font-bold font-mono shrink-0 shadow-xs">
                      {idx + 1}
                    </span>
                    <span className="mt-0.5 leading-relaxed font-medium">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
