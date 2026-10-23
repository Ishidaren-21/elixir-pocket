// Centralized Design Tokens & Color System for Expense Tracker
// Visual Foundation:
// - Primary Burgundy: #66101F (Application logo, left sidebar background, brand identity)
// - Neutral Grey: #D3D3D3 (Subtle borders, dividers, disabled states)
// - Muted Supporting Burgundy-Brown: #855A5C (Supporting accents, secondary badges)
// - Clean Neutral Light Surfaces: #F8F9FA (Snow white, very light grey, no brownish tint)
// - Financial Semantics: Income GREEN (#16A34A / #22C55E), Expense RED (#DC2626 / #EF4444)

export const THEME_COLORS = {
  // Brand Burgundy
  burgundy: {
    primary: "#66101F", // Canonical brand reference
    hover: "#520D19",
    active: "#3D0A13",
    surfaceLight: "#FAF3F4",
    borderLight: "#D3D3D3",
    ringLight: "rgba(102, 16, 31, 0.18)",
    // Exact brand burgundy for left sidebar matching official Elixir Pocket logo
    sidebarBg: "#450214",
    sidebarBorder: "#5A051D",
    sidebarHover: "rgba(255, 255, 255, 0.10)",
    sidebarActive: "rgba(255, 255, 255, 0.20)",
    sidebarText: "#FFFFFF",
    sidebarTextMuted: "#D3D3D3",
    // Dark mode sidebar (maintains official #450214 brand identity)
    sidebarDarkBg: "#450214",
    sidebarDarkBorder: "#5A051D",
    // Supporting Burgundy-Brown Accent
    muted: "#855A5C",
    mutedLight: "rgba(133, 90, 92, 0.12)",
    mutedBorder: "rgba(133, 90, 92, 0.28)",
    // Dark mode brand variants
    primaryDark: "#E28B96",
    hoverDark: "#F09FA9",
    surfaceDark: "rgba(102, 16, 31, 0.22)",
    borderDark: "rgba(211, 211, 211, 0.18)",
    textDark: "#F5B8BF",
    ringDark: "rgba(226, 139, 150, 0.35)",
  },

  // Clean Neutral Family (Snow white, pale grey, zero brownish tint)
  neutral: {
    grey: "#D3D3D3", // Neutral grey for borders and subtle dividers
    bgLight: "#F8F9FA", // Snow white / pale grey page canvas
    cardLight: "#FFFFFF", // Pure white card surface
    cardLightHover: "#FAFAFA",
    inputLight: "#FFFFFF",
    borderLight: "#D3D3D3",
    borderSubtle: "#E5E7EB",
    // Coordinated dark neutral surfaces
    bgDark: "#121214",
    cardDark: "#1B1B1E",
    cardDarkSecondary: "#222226",
    borderDark: "rgba(255, 255, 255, 0.08)",
    borderDarkHover: "rgba(255, 255, 255, 0.16)",
  },

  // Mandatory Financial Semantic Indicators (Green = Inflow, Red = Outflow)
  semantic: {
    income: {
      textLight: "#16A34A", // Pure Green 600
      textDark: "#4ADE80",  // Green 400
      bgLight: "#F0FDF4",
      bgDark: "rgba(34, 197, 94, 0.14)",
      borderLight: "#BBF7D0",
      borderDark: "rgba(34, 197, 94, 0.3)",
      solid: "#16A34A",     // Pure Green
      solidHover: "#15803D",
    },
    expense: {
      textLight: "#DC2626", // Pure Red 600
      textDark: "#F87171",  // Red 400
      bgLight: "#FEF2F2",
      bgDark: "rgba(239, 68, 68, 0.14)",
      borderLight: "#FECACA",
      borderDark: "rgba(239, 68, 68, 0.3)",
      solid: "#DC2626",     // Pure Red (Never burgundy)
      solidHover: "#B91C1C",
    },
    warning: {
      textLight: "#B45309",
      textDark: "#FBBF24",
      bgLight: "#FFFBEB",
      bgDark: "rgba(251, 191, 36, 0.12)",
      borderLight: "#FDE68A",
      borderDark: "rgba(251, 191, 36, 0.25)",
      solid: "#F59E0B",
    },
    neutral: {
      textPrimaryLight: "#111827",
      textSecondaryLight: "#4B5563",
      textMutedLight: "#6B7280",
      textPrimaryDark: "#F9FAFB",
      textSecondaryDark: "#D1D5DB",
      textMutedDark: "#9CA3AF",
    },
  },

  // Motion Specifications (Unified 250ms with easeOut)
  motion: {
    duration: 0.25,
    ease: "easeOut" as const,
  },

  // Refined Chart Palettes
  chart: {
    burgundy: "#66101F", // Brand Burgundy
    burgundyBrown: "#855A5C", // Muted Burgundy-Brown
    green: "#16A34A", // Income Green
    red: "#DC2626", // Expense Red
    amber: "#D97706",
    teal: "#0D9488",
    grey: "#9CA3AF",
    indigo: "#4F46E5",
  },
};

// Harmony palette for category breakdowns
export const CHART_PALETTE = [
  THEME_COLORS.chart.burgundy,
  THEME_COLORS.chart.green,
  THEME_COLORS.chart.burgundyBrown,
  THEME_COLORS.chart.red,
  THEME_COLORS.chart.amber,
  THEME_COLORS.chart.teal,
  THEME_COLORS.chart.grey,
];

// Helper to reliably parse date without UTC midnight timezone offset
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  if (dateStr.includes("T")) return new Date(dateStr);
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  return new Date(dateStr);
};

// Refined category presentation with harmonious styling
export const CATEGORY_THEME: Record<string, { label: string; emoji: string; badgeClass: string }> = {
  food: { 
    label: "Food", 
    emoji: "🍔", 
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40" 
  },
  shopping: { 
    label: "Shopping", 
    emoji: "🛍️", 
    badgeClass: "bg-[#FAF3F4] text-[#66101F] border-[#D3D3D3] dark:bg-[#66101F]/20 dark:text-[#F5B8BF] dark:border-[#66101F]/40" 
  },
  transport: { 
    label: "Transport", 
    emoji: "🚕", 
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700/60" 
  },
  bills: { 
    label: "Bills", 
    emoji: "💡", 
    badgeClass: "bg-orange-50 text-orange-900 border-orange-200/80 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/40" 
  },
  entertainment: { 
    label: "Entertainment", 
    emoji: "🎬", 
    badgeClass: "bg-rose-50 text-rose-900 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40" 
  },
  health: { 
    label: "Health", 
    emoji: "💊", 
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40" 
  },
  education: { 
    label: "Education", 
    emoji: "📚", 
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700/60" 
  },
  housing: { 
    label: "Housing", 
    emoji: "🏠", 
    badgeClass: "bg-teal-50 text-teal-900 border-teal-200/80 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/40" 
  },
  salary: { 
    label: "Salary", 
    emoji: "💰", 
    badgeClass: "bg-green-50 text-green-900 border-green-200/80 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900/40" 
  },
  freelance: { 
    label: "Freelance", 
    emoji: "💼", 
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700/60" 
  },
  business: { 
    label: "Business", 
    emoji: "🏢", 
    badgeClass: "bg-[#FAF3F4] text-[#66101F] border-[#D3D3D3] dark:bg-[#66101F]/20 dark:text-[#F5B8BF] dark:border-[#66101F]/40" 
  },
  investments: { 
    label: "Investments", 
    emoji: "📈", 
    badgeClass: "bg-green-50 text-green-900 border-green-200/80 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900/40" 
  },
  other: { 
    label: "Other", 
    emoji: "🏷️", 
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700/50" 
  },
};

export const getCategoryBadge = (category: string) => {
  const key = (category || "").toLowerCase();
  return CATEGORY_THEME[key] || {
    label: category || "General",
    emoji: "🏷️",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700/50",
  };
};
