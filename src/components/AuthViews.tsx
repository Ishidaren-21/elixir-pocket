import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  KeyRound,
  RotateCcw,
  Info,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type AuthMode = "login" | "register" | "verify" | "forgot";

export const AuthViews: React.FC = () => {
  const { 
    login, 
    register, 
    verifyEmail, 
    resendVerificationCode, 
    loginWithGoogle, 
    resetPassword, 
    confirmResetPassword 
  } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Feedback and interactive states
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verificationPreview, setVerificationPreview] = useState<string | null>(null);
  const [resetCodePreview, setResetCodePreview] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
  const [showGoogleGuideModal, setShowGoogleGuideModal] = useState(false);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setInfo(null);
    if (newMode !== "verify") {
      setVerificationPreview(null);
    }
  };

  // Sign In handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setActiveAction("login");
    try {
      await login(cleanEmail, password);
    } catch (err: any) {
      if (err?.requiresVerification) {
        setVerificationPreview(err.verificationCodePreview || null);
        setMode("verify");
        setInfo("Please verify your email address to complete sign in.");
      } else {
        setError(err?.message || "Sign in failed. Please verify your email and password.");
      }
    } finally {
      setActiveAction(null);
    }
  };

  // Account Registration handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const cleanName = displayName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError("Please provide a valid email address (e.g., name@example.com).");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your confirmation password.");
      return;
    }

    setActiveAction("register");
    try {
      const res = await register(cleanEmail, password, cleanName);
      setVerificationPreview(res.verificationCodePreview || null);
      setMode("verify");
      setInfo("Account created! Please enter your 6-digit confirmation code below.");
    } catch (err: any) {
      setError(err?.message || "Account creation failed. Please try again.");
    } finally {
      setActiveAction(null);
    }
  };

  // Email Verification handler
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const cleanCode = verificationCode.trim();
    if (!cleanCode) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    if (cleanCode.length !== 6) {
      setError("Verification code must be exactly 6 digits.");
      return;
    }

    setActiveAction("verify");
    try {
      await verifyEmail(email.trim(), cleanCode);
    } catch (err: any) {
      setError(err?.message || "Verification code is incorrect or has expired.");
    } finally {
      setActiveAction(null);
    }
  };

  // Resend code handler
  const handleResendCode = async () => {
    setError(null);
    setInfo(null);
    setActiveAction("resend");
    try {
      const res = await resendVerificationCode(email.trim());
      setVerificationPreview(res.verificationCodePreview || null);
      setInfo("A new 6-digit verification code has been generated.");
    } catch (err: any) {
      setError(err?.message || "Could not resend verification code.");
    } finally {
      setActiveAction(null);
    }
  };

  // Password reset handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const cleanEmail = email.trim();

    if (forgotStep === "request") {
      if (!cleanEmail) {
        setError("Please enter your registered email address.");
        return;
      }
      setActiveAction("forgot");
      try {
        const res = await resetPassword(cleanEmail);
        setResetCodePreview(res.resetCodePreview || null);
        setForgotStep("reset");
        setInfo("Reset code sent! Please enter the code and choose your new password.");
      } catch (err: any) {
        setError(err?.message || "Could not process password reset request.");
      } finally {
        setActiveAction(null);
      }
    } else {
      const cleanCode = verificationCode.trim();
      if (!cleanCode) {
        setError("Please enter the 6-digit reset code.");
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        setError("New password must be at least 6 characters long.");
        return;
      }
      setActiveAction("forgot");
      try {
        await confirmResetPassword(cleanEmail, cleanCode, newPassword);
        setInfo("Password successfully updated. You can now sign in with your new password.");
        setForgotStep("request");
        setMode("login");
      } catch (err: any) {
        setError(err?.message || "Failed to reset password.");
      } finally {
        setActiveAction(null);
      }
    }
  };

  // Google OAuth button handler
  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setActiveAction("google");
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err?.isConfigMissing) {
        setShowGoogleGuideModal(true);
      } else {
        setError(err?.message || "Google sign-in was cancelled or encountered an error.");
      }
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-[#121214] px-4 py-8 transition-colors duration-250" id="auth_container">
      <div 
        className="w-full max-w-[420px] bg-white dark:bg-[#1B1B1E] border border-stone-200/80 dark:border-white/10 rounded-3xl shadow-xl p-6 sm:p-8 relative overflow-hidden transition-colors"
        id="auth_card"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6" id="auth_header">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md shadow-[#66101F]/20 mb-3 border border-stone-200/50 dark:border-white/10" id="logo_frame">
            <img 
              src="/assets/aistudio/Elixir_Pocket_Logo_242edb4e.png" 
              alt="Elixir Pocket Logo" 
              className="w-full h-full object-cover" 
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-sans" id="auth_main_title">
            Elixir Pocket
          </h1>

          <div className="text-center mt-1">
            {mode === "login" && (
              <>
                <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">Welcome back</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Sign in to manage your finances.</p>
              </>
            )}
            {mode === "register" && (
              <>
                <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">Create an account</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Start tracking and optimizing your spending.</p>
              </>
            )}
            {mode === "verify" && (
              <>
                <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">Verify your email</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Enter the 6-digit confirmation code for {email}.</p>
              </>
            )}
            {mode === "forgot" && (
              <>
                <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">Reset your password</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {forgotStep === "request" 
                    ? "Enter your email to receive recovery instructions."
                    : "Enter your code and choose your new password."}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Google Authentication Button (Only in login & register modes) */}
        {(mode === "login" || mode === "register") && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={activeAction !== null}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#252528] hover:bg-stone-50 dark:hover:bg-white/5 text-stone-700 dark:text-stone-200 font-medium text-xs transition-all flex items-center justify-center gap-2.5 shadow-2xs cursor-pointer disabled:opacity-60"
              id="btn_google_signin"
            >
              {activeAction === "google" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#66101F] dark:text-[#E28B96]" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="relative my-4" id="auth_separator">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-stone-200 dark:border-stone-800"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#1B1B1E] px-3 text-stone-400 font-medium text-[10px]">
                  or continue with email
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Verification Code Preview Banner */}
        {verificationPreview && (
          <div className="mb-4 p-3 rounded-xl bg-[#FDF2F4] dark:bg-[#66101F]/20 border border-[#855A5C]/20 text-[#66101F] dark:text-[#E28B96] text-xs flex items-center justify-between" id="verification_preview_card">
            <div>
              <p className="font-semibold text-[11px] text-[#66101F] dark:text-[#E28B96] uppercase tracking-wider">Verification Code</p>
              <p className="text-base font-mono font-bold tracking-widest mt-0.5">{verificationPreview}</p>
            </div>
            <button
              type="button"
              onClick={() => setVerificationCode(verificationPreview)}
              className="text-[11px] font-semibold text-[#66101F] dark:text-[#E28B96] bg-white dark:bg-[#252528] px-2.5 py-1.5 rounded-lg border border-[#855A5C]/30 shadow-2xs cursor-pointer hover:bg-stone-50 dark:hover:bg-white/5 transition-colors"
              id="btn_fill_verification_code"
            >
              Fill Code
            </button>
          </div>
        )}

        {/* Reset Code Preview Banner */}
        {resetCodePreview && (
          <div className="mb-4 p-3 rounded-xl bg-[#FDF2F4] dark:bg-[#66101F]/20 border border-[#855A5C]/20 text-[#66101F] dark:text-[#E28B96] text-xs flex items-center justify-between" id="reset_preview_card">
            <div>
              <p className="font-semibold text-[11px] text-[#66101F] dark:text-[#E28B96] uppercase tracking-wider">Reset Code</p>
              <p className="text-base font-mono font-bold tracking-widest mt-0.5">{resetCodePreview}</p>
            </div>
            <button
              type="button"
              onClick={() => setVerificationCode(resetCodePreview)}
              className="text-[11px] font-semibold text-[#66101F] dark:text-[#E28B96] bg-white dark:bg-[#252528] px-2.5 py-1.5 rounded-lg border border-[#855A5C]/30 shadow-2xs cursor-pointer hover:bg-stone-50 dark:hover:bg-white/5 transition-colors"
              id="btn_fill_reset_code"
            >
              Fill Code
            </button>
          </div>
        )}

        {/* Feedback Alerts: Placed directly above the form for high visibility */}
        {error && (
          <div 
            className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex gap-2.5 items-start"
            id="auth_error_alert"
            role="alert"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {info && (
          <div 
            className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex gap-2.5 items-start"
            id="auth_info_alert"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium leading-relaxed">{info}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE: LOGIN FORM */}
        {/* ======================================================== */}
        {mode === "login" && (
          <form 
            onSubmit={handleLoginSubmit} 
            noValidate 
            className="space-y-3.5" 
            id="login_form"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400" htmlFor="login_email">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input 
                  id="login_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B212B]/20 focus:border-[#6B212B] dark:focus:ring-[#B85D6A]/30 dark:focus:border-[#B85D6A] transition-all font-sans"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300" htmlFor="login_password">
                  Password
                </label>
                <button 
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-[11px] text-[#6B212B] hover:text-[#561A22] dark:text-[#E59EAA] font-medium transition-colors cursor-pointer"
                  id="link_forgot_password"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input 
                  id="login_password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B212B]/20 focus:border-[#6B212B] dark:focus:ring-[#B85D6A]/30 dark:focus:border-[#B85D6A] transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              id="btn_signin_submit"
              disabled={activeAction !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-[#66101F] hover:bg-[#520D19] active:bg-[#3D0A13] dark:bg-[#7A2231] dark:hover:bg-[#8C2C3D] text-white font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs mt-4 disabled:opacity-60"
            >
              {activeAction === "login" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* MODE: REGISTER FORM */}
        {/* ======================================================== */}
        {mode === "register" && (
          <form 
            onSubmit={handleRegisterSubmit} 
            noValidate 
            className="space-y-3.5" 
            id="register_form"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400" htmlFor="reg_name">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="h-4 w-4" />
                </span>
                <input 
                  id="reg_name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B212B]/20 focus:border-[#6B212B] dark:focus:ring-[#B85D6A]/30 dark:focus:border-[#B85D6A] transition-all font-sans"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300" htmlFor="reg_email">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input 
                  id="reg_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B212B]/20 focus:border-[#6B212B] dark:focus:ring-[#B85D6A]/30 dark:focus:border-[#B85D6A] transition-all font-sans"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300" htmlFor="reg_password">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input 
                  id="reg_password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B212B]/20 focus:border-[#6B212B] dark:focus:ring-[#B85D6A]/30 dark:focus:border-[#B85D6A] transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300" htmlFor="reg_confirm_password">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input 
                  id="reg_confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B212B]/20 focus:border-[#6B212B] dark:focus:ring-[#B85D6A]/30 dark:focus:border-[#B85D6A] transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              id="btn_register_submit"
              disabled={activeAction !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-[#66101F] hover:bg-[#520D19] active:bg-[#3D0A13] dark:bg-[#7A2231] dark:hover:bg-[#8C2C3D] text-white font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs mt-4 disabled:opacity-60"
            >
              {activeAction === "register" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* MODE: EMAIL VERIFICATION */}
        {/* ======================================================== */}
        {mode === "verify" && (
          <form 
            onSubmit={handleVerifySubmit} 
            noValidate 
            className="space-y-4" 
            id="verify_form"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400" htmlFor="verify_code">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <KeyRound className="h-4 w-4" />
                </span>
                <input 
                  id="verify_code"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-2.5 text-center tracking-widest font-mono text-base font-bold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B212B]/20 focus:border-[#6B212B] dark:focus:ring-[#B85D6A]/30 dark:focus:border-[#B85D6A] transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              id="btn_verify_submit"
              disabled={activeAction !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-[#66101F] hover:bg-[#520D19] active:bg-[#3D0A13] dark:bg-[#7A2231] dark:hover:bg-[#8C2C3D] text-white font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-60"
            >
              {activeAction === "verify" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying code...</span>
                </>
              ) : (
                <>
                  <span>Verify Email & Enter</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                id="btn_resend_code"
                onClick={handleResendCode}
                disabled={activeAction !== null}
                className="text-xs font-medium text-[#6B212B] hover:text-[#561A22] dark:text-[#E59EAA] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {activeAction === "resend" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resending...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resend Code</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 cursor-pointer"
              >
                Back to Sign in
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* MODE: FORGOT PASSWORD */}
        {/* ======================================================== */}
        {mode === "forgot" && (
          <form 
            onSubmit={handleForgotSubmit} 
            noValidate 
            className="space-y-3.5" 
            id="forgot_form"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300" htmlFor="forgot_email">
                Registered Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input 
                  id="forgot_email"
                  type="email"
                  disabled={forgotStep === "reset"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B212B]/20 focus:border-[#6B212B] dark:focus:ring-[#B85D6A]/30 dark:focus:border-[#B85D6A] transition-all font-sans disabled:opacity-60"
                />
              </div>
            </div>

            {forgotStep === "reset" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300" htmlFor="reset_code">
                    6-Digit Reset Code
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <input 
                      id="reset_code"
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full pl-10 pr-4 py-2.5 text-center font-mono font-bold tracking-widest text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B212B]/20 focus:border-[#6B212B] dark:focus:ring-[#B85D6A]/30 dark:focus:border-[#B85D6A] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300" htmlFor="new_password">
                    New Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input 
                      id="new_password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B212B]/20 focus:border-[#6B212B] dark:focus:ring-[#B85D6A]/30 dark:focus:border-[#B85D6A] transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button 
              type="submit"
              id="btn_forgot_submit"
              disabled={activeAction !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-[#66101F] hover:bg-[#520D19] active:bg-[#3D0A13] dark:bg-[#7A2231] dark:hover:bg-[#8C2C3D] text-white font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs mt-3 disabled:opacity-60"
            >
              {activeAction === "forgot" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{forgotStep === "request" ? "Send Reset Code" : "Update Password"}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { switchMode("login"); setForgotStep("request"); }}
                className="text-xs font-medium text-[#6B212B] hover:text-[#561A22] dark:text-[#E59EAA] hover:underline cursor-pointer"
              >
                Back to Sign in
              </button>
            </div>
          </form>
        )}

        {/* Footer Navigation Switcher */}
        {mode === "login" && (
          <div className="mt-6 text-center text-xs text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-white/5 pt-4" id="auth_footer">
            <p>
              Don't have an account?{" "}
              <button 
                type="button"
                onClick={() => switchMode("register")}
                className="text-[#66101F] hover:text-[#520D19] dark:text-[#E28B96] font-semibold hover:underline cursor-pointer ml-1"
                id="footer_switch_to_register"
              >
                Create an account
              </button>
            </p>
          </div>
        )}

        {mode === "register" && (
          <div className="mt-6 text-center text-xs text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-white/5 pt-4" id="auth_footer">
            <p>
              Already have an account?{" "}
              <button 
                type="button"
                onClick={() => switchMode("login")}
                className="text-[#66101F] hover:text-[#520D19] dark:text-[#E28B96] font-semibold hover:underline cursor-pointer ml-1"
                id="footer_switch_to_login"
              >
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Google OAuth Configuration Guide Modal */}
      <AnimatePresence>
        {showGoogleGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" id="google_guide_modal_overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white dark:bg-[#1B1B1E] border border-stone-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
              id="google_guide_modal"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#66101F] dark:text-[#E28B96]">
                  <Info className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Google OAuth Setup</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleGuideModal(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-stone-600 dark:text-stone-300 space-y-2.5 leading-relaxed">
                <p>
                  To enable live Google Sign-In, a Google Cloud OAuth 2.0 Web Client ID must be configured in your environment.
                </p>
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#121214] border border-stone-200 dark:border-stone-800 font-mono text-[11px] text-stone-700 dark:text-stone-300 space-y-1">
                  <p className="font-semibold text-stone-500 uppercase text-[10px]">Required Environment Variable:</p>
                  <p className="text-[#66101F] dark:text-[#E28B96] font-bold">GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"</p>
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-stone-500 dark:text-stone-400 text-[11px]">
                  <li>Open Google Cloud Console &gt; APIs &amp; Services &gt; Credentials.</li>
                  <li>Create an OAuth 2.0 Client ID for Web applications.</li>
                  <li>Add authorized JavaScript origin: <code className="text-[#66101F] dark:text-[#E28B96] font-mono">{typeof window !== "undefined" ? window.location.origin : "your app origin"}</code></li>
                </ol>
                <p className="text-[#66101F] dark:text-[#E28B96] font-medium pt-1">
                  💡 You can also immediately register and sign in below using verified Email &amp; Password.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleGuideModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#66101F] hover:bg-[#520D19] active:bg-[#3D0A13] text-white text-xs font-medium cursor-pointer shadow-2xs transition-colors"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
