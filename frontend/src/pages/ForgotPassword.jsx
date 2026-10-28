import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import axios, { API } from "../axios";
import AuthVisualPanel from "../components/common/AuthVisualPanel";
import { showSuccessToast, showErrorToast } from "../utils/toast";

function ForgotPassword() {
  const navigate = useNavigate();

  // Multi-step wizard: 1 = Email, 2 = Verify Code, 3 = New Password, 4 = Success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Resend code countdown timer
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const API_BASE_URL =
    import.meta.env.MODE === "production"
      ? "https://mhira-crmsystem.onrender.com"
      : "http://localhost:5000";

  // STEP 1: Request OTP
  const handleRequestCode = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return showErrorToast("Please enter your registered email address.");
    }

    setEmail(cleanEmail);
    setCode("");
    setLoading(true);
    try {
      const res = await API.post("/api/auth/forgot-password", {
        email: cleanEmail,
      });

      if (res.data?.success) {
        showSuccessToast(res.data.message || "Verification code sent to your email!");
        setStep(2);
        setResendTimer(60); // 60s cooldown
      } else {
        showErrorToast(res.data?.message || "Failed to send verification code.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      showErrorToast(
        err.response?.data?.message || "Error reaching server. Please check your email."
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 8) {
      return showErrorToast("Please enter the complete 8-digit verification code.");
    }

    setLoading(true);
    try {
      const res = await API.post("/api/auth/verify-reset-code", {
        email: email.trim().toLowerCase(),
        code: cleanCode,
      });

      if (res.data?.success) {
        showSuccessToast("Code verified successfully!");
        setStep(3);
      } else {
        showErrorToast(res.data?.message || "Invalid verification code.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      showErrorToast(err.response?.data?.message || "Verification code is incorrect or expired.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      return showErrorToast("Password must be at least 6 characters long.");
    }

    if (newPassword !== confirmPassword) {
      return showErrorToast("Passwords do not match.");
    }

    setLoading(true);
    try {
      const res = await API.post("/api/auth/reset-password", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });

      if (res.data?.success) {
        showSuccessToast("Your password has been reset successfully!");
        setStep(4);
      } else {
        showErrorToast(res.data?.message || "Failed to update password.");
      }
    } catch (err) {
      console.error("Reset error:", err);
      showErrorToast(err.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white text-[#243746] min-h-screen flex flex-col lg:flex-row font-poppins lg:h-screen lg:overflow-hidden">
      {/* 1. LEFT PANEL: MARKETING CAMPAIGN SHOWCASE BANNER */}
      <AuthVisualPanel />

      {/* 2. RIGHT PANEL: AUTHENTICATION FORM */}
      <div className="w-full lg:w-1/2 min-h-screen lg:h-full flex flex-col justify-between p-5 sm:p-8 md:p-12 xl:p-16 overflow-y-auto shrink-0 bg-white">
        {/* TOP BAR (LOGO + BACK TO STORE) */}
        <div className="flex items-center justify-between w-full max-w-[440px] mx-auto mb-6 shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/mhira_removebg.png"
              alt="Mhira Natural Logo"
              className="h-9 sm:h-10 object-contain hover:scale-105 transition-transform"
            />
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#246C94] transition-colors py-1.5 px-3 rounded-full hover:bg-slate-100/80 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Store</span>
          </Link>
        </div>

        {/* MAIN FORM CONTAINER (CENTERED) */}
        <div className="w-full max-w-[440px] mx-auto my-auto py-4">
          {/* STEP 1: REQUEST CODE */}
          {step === 1 && (
            <>
              {/* TEXT HEADER */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-[#243746] mb-3 tracking-tight">
                  Forgot Password
                </h1>
                <p className="text-[13px] font-medium text-slate-500">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer"
                  >
                    Sign in here.
                  </button>
                </p>
                <p className="text-xs text-gray-400 mt-2 font-medium">
                  Enter your email address and we'll send an 8-digit verification code.
                </p>
              </div>

              {/* FORM */}
              <form onSubmit={handleRequestCode} className="w-full max-w-[420px] space-y-4">
                {/* EMAIL INPUT */}
                <div className="relative flex items-center">
                  <Mail
                    size={18}
                    className="absolute left-5 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-6 py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 text-[#243746]"
                    required
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-3.5 font-bold sm:py-4 rounded-full text-[12px] font-black uppercase transition-all shadow-md active:scale-[0.99] disabled:opacity-70 mt-2 flex items-center justify-center cursor-pointer"
                >
                  {loading ? "Sending Code..." : "Send Verification Code"}
                </button>

                {/* RETURN TO LOGIN */}
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-[12px] text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer"
                  >
                    Return to Login
                  </button>
                </div>
              </form>
            </>
          )}

          {/* STEP 2: VERIFY CODE */}
          {step === 2 && (
            <>
              {/* TEXT HEADER */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-[#243746] mb-3 tracking-tight">
                  Verify Code
                </h1>
                <p className="text-[13px] font-medium text-gray-500">
                  We sent an 8-digit verification code to:
                </p>
                <p className="text-[14px] font-bold text-[#243746] mt-1">
                  {email}
                </p>
              </div>

              {/* FORM */}
              <form onSubmit={handleVerifyCode} className="w-full max-w-[420px] space-y-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="8-digit code*"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    required
                    className="w-full text-center text-xl sm:text-2xl font-mono font-bold tracking-[8px] sm:tracking-[10px] border border-[#E1E9EF] rounded-full py-4 outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:font-sans placeholder:tracking-normal placeholder:font-medium placeholder:text-sm sm:placeholder:text-base placeholder:text-gray-400 text-[#243746]"
                  />
                  <p className="text-[11px] text-center text-gray-400 font-medium">
                    Code expires in 15 minutes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 8}
                  className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-3.5 font-bold sm:py-4 rounded-full text-[12px] font-black uppercase transition-all shadow-md active:scale-[0.99] disabled:opacity-70 mt-2 flex items-center justify-center cursor-pointer"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>

                <div className="flex items-center justify-between text-xs pt-2 px-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer"
                  >
                    ← Change Email
                  </button>
                  {resendTimer > 0 ? (
                    <span className="text-gray-400 font-medium">
                      Resend code in <strong className="text-gray-600">{resendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestCode}
                      disabled={loading}
                      className="text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </form>
            </>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 3 && (
            <>
              {/* TEXT HEADER */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-[#243746] mb-3 tracking-tight">
                  Choose New Password
                </h1>
                <p className="text-[13px] font-bold text-gray-500">
                  Enter your new password below.
                </p>
              </div>

              {/* FORM */}
              <form onSubmit={handleResetPassword} className="w-full max-w-[420px] space-y-4">
                {/* NEW PASSWORD INPUT */}
                <div className="relative flex items-center">
                  <Lock
                    size={18}
                    className="absolute left-5 text-gray-400 pointer-events-none"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-12 py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 text-[#243746]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* CONFIRM PASSWORD INPUT */}
                <div className="relative flex items-center">
                  <Lock
                    size={18}
                    className="absolute left-5 text-gray-400 pointer-events-none"
                  />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-12 py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 text-[#243746]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-3.5 font-bold sm:py-4 rounded-full text-[12px] font-black uppercase transition-all shadow-md active:scale-[0.99] disabled:opacity-70 mt-2 flex items-center justify-center cursor-pointer"
                >
                  {loading ? "Resetting Password..." : "Reset Password"}
                </button>

                {/* RETURN TO LOGIN */}
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-[12px] text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer"
                  >
                    Return to Login
                  </button>
                </div>
              </form>
            </>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && (
            <>
              {/* TEXT HEADER */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-[#243746] mb-3 tracking-tight">
                  Password Updated!
                </h1>
                <p className="text-[13px] font-bold text-gray-500 max-w-sm mx-auto">
                  Your password has been changed successfully. You can now use your new password to sign in.
                </p>
              </div>

              <div className="w-full max-w-[420px] space-y-4">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-3.5 font-bold sm:py-4 rounded-full text-[12px] font-black uppercase transition-all shadow-md active:scale-[0.99] disabled:opacity-70 mt-2 flex items-center justify-center cursor-pointer"
                >
                  Sign In Now
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-full flex justify-center px-2 py-1">
          <p className="text-[11px] text-center text-gray-500 leading-relaxed max-w-[360px]">
            By creating an account, you agree to our{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noreferrer"
              className="text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold whitespace-nowrap cursor-pointer"
            >
              Terms of Service
            </a>{" "}
            and acknowledge our{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold whitespace-nowrap cursor-pointer"
            >
              Privacy Policy
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
