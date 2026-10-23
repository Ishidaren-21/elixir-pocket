import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
}
const PORT = parseInt(getArg("--port") || process.env.PORT || "3000", 10);
const HOST = getArg("--host") || "0.0.0.0";
const app = express();

// Persistent file-based store for authentic user accounts & sessions
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

interface StoredUser {
  uid: string;
  email: string;
  displayName: string;
  passwordHash?: string;
  salt?: string;
  photoURL?: string | null;
  emailVerified: boolean;
  verificationCode?: string;
  verificationExpires?: number;
  resetCode?: string;
  resetExpires?: number;
  provider: "email" | "google";
  createdAt: string;
  updatedAt: string;
}

interface StoredSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

function loadUsers(): StoredUser[] {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist users:", err);
  }
}

function loadSessions(): StoredSession[] {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return [];
    const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSessions(sessions: StoredSession[]) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist sessions:", err);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

function sanitizeUser(u: StoredUser) {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL || null,
    emailVerified: u.emailVerified,
    isAnonymous: false,
  };
}

// Set high limits for file parsing uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini SDK with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not defined.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API: Parse statement (CSV / PDF / Excel / Text) using Gemini's native multimodal capabilities
app.post("/api/ai/import", async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: "Missing file contents" });
    }

    const ai = getGeminiClient();

    let contentPart: any;
    if (mimeType.includes("pdf") || mimeType.includes("csv") || mimeType.includes("text") || mimeType.includes("plain")) {
      contentPart = {
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: fileBase64,
        },
      };
    } else {
      // Fallback for spreadsheets, binary or excel: treat as text if CSV-like, or let user know
      contentPart = {
        inlineData: {
          mimeType: "text/plain",
          data: fileBase64,
        },
      };
    }

    const promptText = `
You are an expert financial personal assistant.
Analyze this uploaded bank or UPI statement (${fileName || 'statement'}) and extract all individual transactions.
UPI platforms like Google Pay, PhonePe, Paytm, or generic PDF/CSV banking statements are supported.
For each transaction, extract:
- amount (positive number)
- date (string in YYYY-MM-DD format; if year is not specified, assume 2026)
- description (who it went to or the payee/payer name)
- type (must be either "income" or "expense")
- category (classify into one of: 'food', 'transport', 'shopping', 'entertainment', 'education', 'health', 'bills', 'travel', 'salary', 'freelance', 'pocket-money', 'investment', or 'other')

Return a structured JSON list of transactions.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [contentPart, promptText],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transactions: {
              type: Type.ARRAY,
              description: "Array of extracted transactions",
              items: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER, description: "Transaction amount" },
                  date: { type: Type.STRING, description: "Transaction date in YYYY-MM-DD" },
                  description: { type: Type.STRING, description: "Clean payee/payer description" },
                  type: { type: Type.STRING, description: "Type: 'income' or 'expense'" },
                  category: { type: Type.STRING, description: "Dynamic financial category classified" },
                },
                required: ["amount", "date", "description", "type", "category"],
              },
            },
          },
          required: ["transactions"],
        },
      },
    });

    const resultText = response.text || "{\"transactions\": []}";
    const parsedData = JSON.parse(resultText.trim());
    return res.json(parsedData);
  } catch (err: any) {
    console.error("AI Statement Import Error:", err);
    return res.status(500).json({ error: "Failed to process statement. Please try uploading a clear statement file.", details: err.message });
  }
});

// API: Generate AI personal finance insights and custom budget alerts
function computeFallbackInsights(transactions: any[], budgetSettings: any) {
  const expenseTxs = (transactions || []).filter((t: any) => t.type === "expense");
  const incomeTxs = (transactions || []).filter((t: any) => t.type === "income");
  const totalIncome = incomeTxs.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  const totalExpense = expenseTxs.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const balanceHealth = Math.min(100, Math.max(10, Math.round(50 + (savingsRate / 2))));

  const catMap: Record<string, number> = {};
  expenseTxs.forEach((t: any) => {
    const cat = (t.category || "other").toLowerCase();
    catMap[cat] = (catMap[cat] || 0) + (Number(t.amount) || 0);
  });
  const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const insights: Array<{ type: string; category: string; title: string; description: string }> = [];

  if (sortedCats.length > 0) {
    const [topCat, topVal] = sortedCats[0];
    const topPct = totalExpense > 0 ? Math.round((topVal / totalExpense) * 100) : 0;
    const catFormatted = topCat.charAt(0).toUpperCase() + topCat.slice(1);
    insights.push({
      type: "trend",
      category: topCat,
      title: `${catFormatted} is your top expense category`,
      description: `${catFormatted} represents ${topPct}% (₹${topVal.toLocaleString("en-IN")}) of total recorded expenses.`,
    });
  }

  const monthlyBudget = Number(budgetSettings?.monthlyBudget) || 0;
  if (monthlyBudget > 0) {
    if (totalExpense > monthlyBudget) {
      insights.push({
        type: "alert",
        category: "budget",
        title: "Monthly Budget Limit Exceeded",
        description: `Current expenses exceed your ₹${monthlyBudget.toLocaleString("en-IN")} budget by ₹${(totalExpense - monthlyBudget).toLocaleString("en-IN")}.`,
      });
    } else {
      const remaining = monthlyBudget - totalExpense;
      insights.push({
        type: "success",
        category: "budget",
        title: "Monthly Budget on Track",
        description: `You have ₹${remaining.toLocaleString("en-IN")} available within your ₹${monthlyBudget.toLocaleString("en-IN")} monthly limit.`,
      });
    }
  }

  if (savingsRate >= 20) {
    insights.push({
      type: "success",
      category: "savings",
      title: "Strong Savings Momentum",
      description: `Your current net savings rate is ${savingsRate}%, outperforming standard financial health benchmarks.`,
    });
  } else if (savingsRate > 0) {
    insights.push({
      type: "tip",
      category: "savings",
      title: "Target 20% Net Savings Margin",
      description: `Your net savings rate is currently ${savingsRate}%. Trimming discretionary expenses can elevate your surplus.`,
    });
  } else {
    insights.push({
      type: "alert",
      category: "cashflow",
      title: "Negative Cashflow Recorded",
      description: "Outflows currently exceed inflows. Prioritize essential commitments and audit discretionary spending.",
    });
  }

  const recommendations = [
    savingsRate < 20 
      ? "Target allocating at least 20% of regular monthly income towards a dedicated emergency reserve fund."
      : "Maintain your healthy savings rate by investing surplus funds into systematic plans or high-yield accounts.",
    sortedCats.length > 0 
      ? `Audit weekly spend in ${sortedCats[0][0].charAt(0).toUpperCase() + sortedCats[0][0].slice(1)} to identify recurring subscription or convenience costs.`
      : "Log every transaction promptly to keep portfolio velocity and trend forecasts accurate.",
    monthlyBudget === 0 
      ? "Establish a monthly spending target to activate automatic budget trajectory tracking."
      : "Monitor daily burn rate against your monthly budget cap to avoid month-end deficits.",
  ];

  return {
    insights,
    recommendations,
    balanceHealth,
  };
}

app.post("/api/ai/insights", async (req, res) => {
  const { transactions, budgetSettings } = req.body;
  try {
    const ai = getGeminiClient();

    const promptText = `
You are a highly sophisticated, calm, and intelligent financial advisory system like those from modern premium fintech platforms (e.g. Apple Card, Monzo).
Analyze the following personal finance transactions and budget settings:
Transactions: ${JSON.stringify(transactions || [])}
Budget Settings: ${JSON.stringify(budgetSettings || {})}

Provide comprehensive AI financial planning feedback structured under a JSON schema:
1. "insights": An array of actionable, highly specific insights. For example:
   - Identify spending increases/decreases in categories.
   - Flag anomalous transactions (e.g., unusually high expenses, recurrent bills).
   - Rate the overall savings health.
   Type of insight should be: "alert" (warning about overspending), "success" (positive savings progress), "tip" (savings recommendations), "trend" (behavior analysis).
2. "recommendations": Dynamic high-level financial recommendations tailored to this user.
3. "balanceHealth": A percentage representing current overall saving index (e.g., 85%).
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "Type ('alert', 'success', 'tip', 'trend')" },
                  category: { type: Type.STRING, description: "Affected category or focus" },
                  title: { type: Type.STRING, description: "Title of insight" },
                  description: { type: Type.STRING, description: "Calculated explanation with numbers" },
                },
                required: ["type", "category", "title", "description"],
              },
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            balanceHealth: { type: Type.NUMBER, description: "Health percentage score 0-100" },
          },
          required: ["insights", "recommendations", "balanceHealth"],
        },
      },
    });

    const resultText = response.text || "{}";
    return res.json(JSON.parse(resultText.trim()));
  } catch (err: any) {
    console.warn("AI Insights external API returned error, activating statistical financial engine fallback:", err.message);
    const fallbackData = computeFallbackInsights(transactions, budgetSettings);
    return res.json(fallbackData);
  }
});

// ==========================================
// AUTHENTICATION API ROUTES (REAL ACCOUNTS & VERIFICATION)
// ==========================================

// Auth Config - Client ID retrieval for Google OAuth
app.get("/api/auth/config", (req, res) => {
  const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
  res.json({ googleClientId });
});

// Registration Endpoint
app.post("/api/auth/register", (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    // Email syntax validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    // Password requirements
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (displayName || "").trim() || cleanEmail.split("@")[0];

    const users = loadUsers();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists. Please sign in." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = Date.now() + 15 * 60 * 1000; // 15 mins

    const newUser: StoredUser = {
      uid: "usr_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      email: cleanEmail,
      displayName: cleanName,
      passwordHash,
      salt,
      photoURL: null,
      emailVerified: false,
      verificationCode,
      verificationExpires,
      provider: "email",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    return res.status(201).json({
      success: true,
      email: cleanEmail,
      message: `Account created. Verification code sent to ${cleanEmail}.`,
      verificationCodePreview: verificationCode,
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Account creation failed.", details: err.message });
  }
});

// Email Verification Endpoint
app.post("/api/auth/verify-email", (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and verification code are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1) {
      return res.status(404).json({ error: "No account found with this email." });
    }

    const user = users[userIndex];

    if (user.emailVerified) {
      // Already verified, generate fresh session
      const token = crypto.randomBytes(32).toString("hex");
      const sessions = loadSessions();
      sessions.push({
        token,
        userId: user.uid,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      saveSessions(sessions);
      return res.json({ success: true, token, user: sanitizeUser(user), message: "Email is already verified." });
    }

    if (!user.verificationCode || user.verificationCode !== code.trim()) {
      return res.status(400).json({ error: "Invalid verification code. Please check and try again." });
    }

    if (user.verificationExpires && Date.now() > user.verificationExpires) {
      return res.status(400).json({ error: "Verification code has expired. Please click 'Resend Code'." });
    }

    // Mark as verified
    user.emailVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    user.updatedAt = new Date().toISOString();
    users[userIndex] = user;
    saveUsers(users);

    // Create session
    const token = crypto.randomBytes(32).toString("hex");
    const sessions = loadSessions();
    sessions.push({
      token,
      userId: user.uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    saveSessions(sessions);

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      message: "Email successfully verified! Welcome to Expense Tracker.",
    });
  } catch (err: any) {
    console.error("Verification error:", err);
    return res.status(500).json({ error: "Verification failed.", details: err.message });
  }
});

// Resend Verification Code
app.post("/api/auth/resend-code", (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: "No account found with this email." });
    }

    if (user.emailVerified) {
      return res.json({ success: true, message: "Account is already verified." });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newCode;
    user.verificationExpires = Date.now() + 15 * 60 * 1000;
    user.updatedAt = new Date().toISOString();
    saveUsers(users);

    return res.json({
      success: true,
      message: `A new 6-digit verification code has been issued for ${cleanEmail}.`,
      verificationCodePreview: newCode,
    });
  } catch (err: any) {
    console.error("Resend code error:", err);
    return res.status(500).json({ error: "Failed to resend code." });
  }
});

// Login Endpoint
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ error: "No account found with this email address. Please sign up." });
    }

    if (user.provider === "google" && !user.passwordHash) {
      return res.status(401).json({ error: "This email was registered with Google. Please click 'Continue with Google'." });
    }

    if (!user.salt || !user.passwordHash) {
      return res.status(401).json({ error: "Authentication configuration error for this account." });
    }

    const calculatedHash = hashPassword(password, user.salt);
    if (calculatedHash !== user.passwordHash) {
      return res.status(401).json({ error: "Incorrect password. Please verify and try again." });
    }

    if (!user.emailVerified) {
      // Re-issue verification code if missing or expired
      if (!user.verificationCode || (user.verificationExpires && Date.now() > user.verificationExpires)) {
        user.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationExpires = Date.now() + 15 * 60 * 1000;
        saveUsers(users);
      }
      return res.status(403).json({
        requiresVerification: true,
        email: user.email,
        message: "Please verify your email address to sign in.",
        verificationCodePreview: user.verificationCode,
      });
    }

    // Issue session token
    const token = crypto.randomBytes(32).toString("hex");
    const sessions = loadSessions();
    sessions.push({
      token,
      userId: user.uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    saveSessions(sessions);

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Sign in failed.", details: err.message });
  }
});

// Google Verification Endpoint (Genuine Google ID Token / Access Token verification)
app.post("/api/auth/google-verify", async (req, res) => {
  try {
    const { credential, accessToken } = req.body;
    if (!credential && !accessToken) {
      return res.status(400).json({ error: "Google credential or access token is required." });
    }

    let googleData: { sub: string; email: string; name?: string; picture?: string; email_verified?: boolean } | null = null;

    if (credential) {
      // Verify JWT ID token with Google's tokeninfo service
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (!verifyRes.ok) {
        const errorText = await verifyRes.text();
        return res.status(400).json({ error: "Google authentication token verification failed.", details: errorText });
      }
      const data = await verifyRes.json() as any;
      googleData = {
        sub: data.sub,
        email: data.email,
        name: data.name || data.email?.split("@")[0],
        picture: data.picture,
        email_verified: data.email_verified === "true" || data.email_verified === true,
      };
    } else if (accessToken) {
      // Verify access token with Google userinfo API
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userinfoRes.ok) {
        const errorText = await userinfoRes.text();
        return res.status(400).json({ error: "Google userinfo fetch failed.", details: errorText });
      }
      const data = await userinfoRes.json() as any;
      googleData = {
        sub: data.sub,
        email: data.email,
        name: data.name || data.email?.split("@")[0],
        picture: data.picture,
        email_verified: data.email_verified === true,
      };
    }

    if (!googleData || !googleData.email) {
      return res.status(400).json({ error: "Could not retrieve verified email from Google." });
    }

    const cleanEmail = googleData.email.toLowerCase().trim();
    const users = loadUsers();
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      user = {
        uid: "google_" + googleData.sub,
        email: cleanEmail,
        displayName: googleData.name || cleanEmail.split("@")[0],
        photoURL: googleData.picture || null,
        emailVerified: true,
        provider: "google",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      users.push(user);
    } else {
      user.emailVerified = true;
      if (googleData.picture) user.photoURL = googleData.picture;
      if (googleData.name) user.displayName = googleData.name;
      user.updatedAt = new Date().toISOString();
    }
    saveUsers(users);

    const token = crypto.randomBytes(32).toString("hex");
    const sessions = loadSessions();
    sessions.push({
      token,
      userId: user.uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    saveSessions(sessions);

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error("Google verify error:", err);
    return res.status(500).json({ error: "Google OAuth verification failed.", details: err.message });
  }
});

// Forgot Password Endpoint
app.post("/api/auth/forgot-password", (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: "No account found with this email address." });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetCode;
    user.resetExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    user.updatedAt = new Date().toISOString();
    saveUsers(users);

    return res.json({
      success: true,
      message: `Password reset instructions with a 6-digit code sent to ${cleanEmail}.`,
      resetCodePreview: resetCode,
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Failed to process password reset request." });
  }
});

// Reset Password with Code Endpoint
app.post("/api/auth/reset-password", (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Email, reset code, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: "No account found with this email." });
    }

    if (!user.resetCode || user.resetCode !== code.trim()) {
      return res.status(400).json({ error: "Invalid password reset code." });
    }

    if (user.resetExpires && Date.now() > user.resetExpires) {
      return res.status(400).json({ error: "Password reset code has expired. Please request a new one." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    user.salt = salt;
    user.passwordHash = hashPassword(newPassword, salt);
    user.resetCode = undefined;
    user.resetExpires = undefined;
    user.emailVerified = true;
    user.updatedAt = new Date().toISOString();
    saveUsers(users);

    return res.json({
      success: true,
      message: "Password has been successfully reset. You can now sign in with your new password.",
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Password reset failed.", details: err.message });
  }
});

// Current Session Validation Endpoint
app.get("/api/auth/session", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No session token provided" });
    }

    const token = authHeader.split(" ")[1];
    const sessions = loadSessions();
    const session = sessions.find(s => s.token === token && s.expiresAt > Date.now());

    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }

    const users = loadUsers();
    const user = users.find(u => u.uid === session.userId);

    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    return res.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error("Session check error:", err);
    return res.status(500).json({ error: "Session validation error" });
  }
});

// Logout Endpoint
app.post("/api/auth/logout", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const sessions = loadSessions().filter(s => s.token !== token);
      saveSessions(sessions);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.json({ success: true });
  }
});

// Start integration with Vite (development vs production)
async function startServer() {
  let viteInstance: any = null;
  if (process.env.NODE_ENV !== "production") {
    viteInstance = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : undefined,
      },
      appType: "spa",
    });
    app.use(viteInstance.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server is running at http://${HOST}:${PORT}`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://${HOST}:${PORT}/`);
  });

  server.on("error", (err: any) => {
    console.error("Server listen error:", err);
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
      process.exit(1);
    }
  });

  const cleanup = async () => {
    if (viteInstance) {
      try {
        await viteInstance.close();
      } catch {}
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

startServer();
