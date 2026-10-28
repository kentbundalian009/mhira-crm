import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from "lucide-react";
import axios, { API, API_BASE_URL } from "../axios";

import AuthVisualPanel from "../components/common/AuthVisualPanel";
import GoogleAuthButton from "../components/common/GoogleAuthButton";
import TurnstileWidget from "../components/common/TurnstileWidget";
import { showSuccessToast, showErrorToast } from "../utils/toast";
import { useAppData } from "../context/AppDataContext";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser, refetchAppData } = useAppData();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      return showErrorToast("Please fill in all fields");
    }

    setIsLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/users/login`,
        {
          email: cleanEmail,
          password,
          turnstileToken,
        }
      );

      const data = res.data;

      if (data && data.token) {
        const userId = data.user?._id || data.user?.id;
        const minimalUser = {
          _id: userId,
          id: userId,
          email: data.user?.email,
          username: data.user?.username,
          fullName: data.user?.fullName,
          role: data.user?.role || "Customer",
          accountType: data.user?.accountType || "Customer",
          customerNo: data.user?.customerNo || data.user?.empNo,
        };

        // 1. Safely store minimal credentials inside try-catch to prevent QuotaExceededError
        try {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(minimalUser));
        } catch (storageErr) {
          console.warn("Storage quota exceeded or unavailable; continuing with memory session:", storageErr);
        }

        // Update global React memory state
        if (setUser) setUser(data.user || minimalUser);

        // 2. Perform instant zero-delay UI redirect
        const staffRoles = ["Admin", "Inventory", "Marketing", "Logistic"];
        const targetPath = staffRoles.includes(data.user?.role) ? "/dashboard" : "/";

        // Set one-time flag to show Special Offer once after login for customers
        if (!staffRoles.includes(data.user?.role)) {
          try {
            sessionStorage.setItem("mhira_show_offer_on_login", "true");
          } catch (e) { }
        }

        navigate(targetPath, { replace: true });

        // 3. Defer toast and background sync non-blockingly
        showSuccessToast(`Welcome back, ${data.user?.fullName || "User"}!`);
        setTimeout(() => {
          window.dispatchEvent(new Event("userLogin"));
          if (refetchAppData) refetchAppData(true);
        }, 50);
      } else {
        showErrorToast(data?.message || "Invalid credentials.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      const msg =
        error.response?.data?.message ||
        (error.code === "ECONNABORTED"
          ? "Login timed out. Please try again."
          : "Error connecting to server. Please try again.");
      showErrorToast(msg);
      setIsLoading(false);
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
          {/* TEXT HEADER */}
          <div className="text-left mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#243746] mb-2.5 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-[13px] font-medium text-slate-500">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer"
              >
                Sign up here.
              </button>
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
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
                className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-6 py-3.5 sm:py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 bg-white shadow-2xs text-[#243746]"
                required
              />
            </div>

            {/* PASSWORD INPUT */}
            <div className="relative flex items-center">
              <Lock
                size={18}
                className="absolute left-5 text-gray-400 pointer-events-none"
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-12 py-3.5 sm:py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 bg-white shadow-2xs text-[#243746]"
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

            {/* CLOUDFLARE TURNSTILE BOT PROTECTION */}
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken("")}
            />

            {/* SIGN IN BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-3.5 font-bold sm:py-4 rounded-full text-[12px] font-black uppercase transition-all shadow-md active:scale-[0.99] disabled:opacity-70 mt-2 flex items-center justify-center cursor-pointer"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>

            {/* OR DIVIDER */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#E1E9EF]"></div>
              <span className="shrink mx-4 text-gray-400 text-[11px]  font-bold ">
                or continue with
              </span>
              <div className="flex-grow border-t border-[#E1E9EF]"></div>
            </div>

            {/* GOOGLE SIGN IN BUTTON */}
            <GoogleAuthButton text="Connect with Google" mode="signin" />

            {/* FORGOT PASSWORD */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-[12px] text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer"
              >
                Forgot your password?
              </button>
            </div>
          </form>
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

export default Login;