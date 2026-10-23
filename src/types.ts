export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPreferences {
  theme: "light" | "dark";
  currency: string;             // e.g., 'INR', 'USD', 'EUR', 'GBP'
  monthlyBudget: number;         // Total threshold
  categoryBudgets: Record<string, number>; // Category alerts
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
}

export interface AIInsight {
  type: "alert" | "success" | "tip" | "trend";
  category: string;
  title: string;
  description: string;
}

export interface AIAnalysisResult {
  insights: AIInsight[];
  recommendations: string[];
  balanceHealth: number; // 0-100 score
}
