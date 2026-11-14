import React, { createContext, useContext, useState, useEffect } from "react";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { auth, googleProvider, getUserPreferences, saveUserPreferences } from "../firebase";
import { AuthUser, UserPreferences } from "../types";
import firebaseConfig from "../firebase-applet-config.json";

export interface RegisterResult {
  success: boolean;
  email: string;
  message: string;
  verificationCodePreview?: string;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  resetCodePreview?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  preferences: UserPreferences | null;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<RegisterResult>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<RegisterResult>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<PasswordResetResult>;
  confirmResetPassword: (email: string, code: string, newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isMockFirebase = firebaseConfig.apiKey.includes("mock_api_key");

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Initialize theme from storage immediately on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") || "light";
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Load preferences when user changes
  useEffect(() => {
    if (!user) {
      setPreferences(null);
      return;
    }

    getUserPreferences(user.uid).then(prefs => {
      setPreferences(prefs);
      const activeTheme = prefs.theme || localStorage.getItem("app_theme") || "light";
      if (activeTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    });
  }, [user]);

  // Restore session: Firebase first, old server session as fallback
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // 1. Firebase remembers the user (Google sign-in): restore directly
      if (fbUser) {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split("@")[0] : "User"),
          photoURL: fbUser.photoURL,
          emailVerified: fbUser.emailVerified,
          isAnonymous: fbUser.isAnonymous,
        });
        setLoading(false);
        return;
      }

      // 2. No Firebase user: check for an old server-based session token
      const token = localStorage.getItem("expense_tracker_session_token");
      if (!token || token.startsWith("fb_")) {
        localStorage.removeItem("expense_tracker_session_token");
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/session", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem("expense_tracker_session_token");
            setUser(null);
          }
        } else {
          localStorage.removeItem("expense_tracker_session_token");
          setUser(null);
        }
      } catch (err) {
        console.warn("Session check offline or error:", err);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Genuine Email & Password Login
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification) {
          const verifyErr: any = new Error(data.message || "Please verify your email address.");
          verifyErr.requiresVerification = true;
          verifyErr.email = data.email;
          verifyErr.verificationCodePreview = data.verificationCodePreview;
          throw verifyErr;
        }
        throw new Error(data.error || "Sign in failed. Please check your credentials.");
      }

      if (data.token && data.user) {
        localStorage.setItem("expense_tracker_session_token", data.token);
        setUser(data.user);
      } else {
        throw new Error("Invalid response received from authentication server.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Genuine User Account Registration
  const register = async (email: string, password: string, displayName?: string): Promise<RegisterResult> => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      return {
        success: true,
        email: data.email,
        message: data.message,
        verificationCodePreview: data.verificationCodePreview,
      };
    } finally {
      setLoading(false);
    }
  };

  // Email Verification Step
  const verifyEmail = async (email: string, code: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid or expired verification code.");
      }

      if (data.token && data.user) {
        localStorage.setItem("expense_tracker_session_token", data.token);
        setUser(data.user);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend Verification Code
  const resendVerificationCode = async (email: string): Promise<RegisterResult> => {
    const res = await fetch("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Could not resend verification code.");
    }

    return {
      success: true,
      email,
      message: data.message,
      verificationCodePreview: data.verificationCodePreview,
    };
  };

  // ========================================================
  // TEMPORARY DEMO AUTHENTICATION PATH
  // ========================================================
  // Note: Allows immediate access to test all dashboard, transactions, trends,
  // and budget features without requiring Google OAuth credentials or email verification.
  // REVISIT BEFORE PRODUCTION: Remove or gate behind development flag.
  const loginAsDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate demo session.");
      }

      if (data.token && data.user) {
        localStorage.setItem("expense_tracker_session_token", data.token);
        setUser(data.user);
      } else {
        throw new Error("Invalid response received from authentication server.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Genuine Google OAuth Authentication Flow
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      // 1. Fetch server config to check for Google OAuth Client ID
      let googleClientId = "";
      try {
        const cfgRes = await fetch("/api/auth/config");
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          googleClientId = cfg.googleClientId || "";
        }
      } catch (err) {
        console.warn("Could not retrieve auth config:", err);
      }

      // Check for client-side environment variable as alternative
      if (!googleClientId && typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) {
        googleClientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
      }

      // 2. Ensure Google Identity Services script is available
      let gsi = (window as any).google;
      if (!gsi?.accounts) {
        await new Promise<void>((resolve) => {
          const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
          if (existingScript) {
            existingScript.addEventListener("load", () => {
              gsi = (window as any).google;
              resolve();
            });
            setTimeout(() => {
              gsi = (window as any).google;
              resolve();
            }, 1500);
          } else {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => {
              gsi = (window as any).google;
              resolve();
            };
            script.onerror = () => resolve();
            document.head.appendChild(script);
          }
        });
      }

      // 3. If Google Client ID is configured, launch the real Google OAuth flow
      if (googleClientId) {
        if (gsi?.accounts?.oauth2) {
          await new Promise<void>((resolve, reject) => {
            try {
              const tokenClient = gsi.accounts.oauth2.initTokenClient({
                client_id: googleClientId,
                scope: "openid email profile",
                callback: async (tokenResponse: any) => {
                  if (tokenResponse?.error) {
                    if (tokenResponse.error === "popup_closed_by_user" || tokenResponse.error === "access_denied") {
                      reject(new Error("Google sign-in was cancelled."));
                    } else {
                      reject(new Error(`Google Sign-In failed: ${tokenResponse.error_description || tokenResponse.error}`));
                    }
                    return;
                  }
                  if (!tokenResponse?.access_token) {
                    reject(new Error("No access token returned by Google."));
                    return;
                  }
                  try {
                    // Verify with server endpoint
                    const verifyRes = await fetch("/api/auth/google-verify", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ accessToken: tokenResponse.access_token }),
                    });
                    const verifyData = await verifyRes.json();
                    if (!verifyRes.ok) {
                      reject(new Error(verifyData.error || "Failed to verify Google account credentials."));
                      return;
                    }
                    if (verifyData.token && verifyData.user) {
                      localStorage.setItem("expense_tracker_session_token", verifyData.token);
                      setUser(verifyData.user);
                      resolve();
                    } else {
                      reject(new Error("Malformed response received from authentication server."));
                    }
                  } catch (verifyErr: any) {
                    reject(new Error(verifyErr?.message || "Failed to communicate with authentication server."));
                  }
                },
                error_callback: (err: any) => {
                  if (err?.type === "popup_blocked") {
                    reject(new Error("Google sign-in pop-up was blocked by your browser. Please allow pop-ups for this site."));
                  } else {
                    reject(new Error(err?.message || "Google OAuth window encountered an error or was closed."));
                  }
                },
              });
              tokenClient.requestAccessToken({ prompt: "select_account" });
            } catch (err: any) {
              reject(err);
            }
          });
          return;
        }
      }

      // 4. Fallback to Firebase Google Provider if active Firebase project is configured
      if (!isMockFirebase) {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
          const u: AuthUser = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName || (result.user.email ? result.user.email.split("@")[0] : "User"),
            photoURL: result.user.photoURL,
            emailVerified: result.user.emailVerified,
            isAnonymous: result.user.isAnonymous,
          };
          localStorage.setItem("expense_tracker_session_token", `fb_${result.user.uid}`);
          setUser(u);
          return;
        }
      }

      // 5. If Google Client ID is not configured yet, throw explicit error for the UI
      const missingConfigErr: any = new Error(
        "Google OAuth is not configured yet. To enable Google Sign-In, please set GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID in your configuration with your Google Cloud OAuth 2.0 Web Client ID. In the meantime, you can create an account or sign in with verified Email & Password below."
      );
      missingConfigErr.isConfigMissing = true;
      throw missingConfigErr;
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        throw new Error("Google sign-in popup was cancelled.");
      }
      if (err?.code === "auth/cancelled-popup-request") {
        throw new Error("Google sign-in was cancelled.");
      }
      if (err?.code === "auth/popup-blocked") {
        throw new Error("Google sign-in pop-up was blocked by your browser. Please allow pop-ups to continue.");
      }
      if (err?.code === "auth/api-key-not-valid") {
        throw new Error("Google authentication requires configuring a Google OAuth Client ID or active Firebase project. Please use verified Email & Password below.");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    setLoading(true);
    try {
      // Sign out of Firebase too, otherwise it would log the user straight back in
      await signOut(auth).catch(() => {});

      const token = localStorage.getItem("expense_tracker_session_token");
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
      localStorage.removeItem("expense_tracker_session_token");
      setUser(null);
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  };

  // Forgot password request
  const resetPassword = async (email: string): Promise<PasswordResetResult> => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to initiate password reset.");
    }

    return {
      success: true,
      message: data.message,
      resetCodePreview: data.resetCodePreview,
    };
  };

  // Complete password reset with code
  const confirmResetPassword = async (email: string, code: string, newPass: string) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword: newPass }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to reset password.");
    }
  };

  // Preferences updater
  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!user) return;
    const current = preferences || {
      theme: "light",
      currency: "INR",
      monthlyBudget: 0,
      categoryBudgets: {},
    };
    const updated: UserPreferences = {
      ...current,
      ...newPrefs,
    };

    setPreferences(updated);

    if (updated.theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("app_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("app_theme", "light");
    }

    await saveUserPreferences(user.uid, updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        preferences,
        updatePreferences,
        login,
        register,
        verifyEmail,
        resendVerificationCode,
        loginWithGoogle,
        loginAsDemo,
        logout,
        resetPassword,
        confirmResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
