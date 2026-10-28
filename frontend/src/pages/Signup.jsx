import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";

import AuthVisualPanel from "../components/common/AuthVisualPanel";
import GoogleAuthButton from "../components/common/GoogleAuthButton";
import TurnstileWidget from "../components/common/TurnstileWidget";
import { showSuccessToast, showErrorToast } from "../utils/toast";
import { API_BASE_URL } from "../axios";

function Signup() {
  const navigate = useNavigate();

  const [turnstileToken, setTurnstileToken] = useState("");

  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle Input Changes
  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  // Password Strength Check
  const getPasswordStrength = () => {
    const pwd = form.password;
    if (!pwd) return { label: "", color: "" };
    if (pwd.length < 6) return { label: "Weak", color: "text-red-500" };
    if (pwd.length < 10) return { label: "Medium", color: "text-amber-500" };
    return { label: "Strong", color: "text-emerald-600" };
  };

  const strength = getPasswordStrength();
  const isMatch = form.password && form.password === form.confirmPassword;

  // Form Validation
  const isValid =
    form.username &&
    form.fullName &&
    form.email &&
    form.phoneNumber &&
    form.gender &&
    form.password &&
    isMatch;

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: form.username,
          fullName: form.fullName,
          email: form.email,
          phoneNumber: form.phoneNumber,
          gender: form.gender,
          password: form.password,
          turnstileToken,
        }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        try {
          sessionStorage.setItem("mhira_show_offer_on_login", "true");
        } catch (e) { }
        window.dispatchEvent(new Event("userLogin"));
        showSuccessToast("Customer account created! Account details sent to your email.");
        navigate("/");
      } else {
        showErrorToast(data.message || "Failed to create account.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      showErrorToast("Error connecting to server. Please try again.");
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
          {/* HEADER SECTION */}
          <div className="text-left mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#243746] mb-2.5 tracking-tight">
              Create Account
            </h1>
            <p className="text-[13px] font-medium text-slate-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer"
              >
                Sign in here.
              </button>
            </p>
          </div>

          {/* SIGNUP FORM */}
          <form
            onSubmit={handleSubmit}
            className="w-full space-y-4"
          >
            {/* USERNAME & FULL NAME */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative flex items-center">
                <User
                  size={18}
                  className="absolute left-5 text-gray-400 pointer-events-none"
                />
                <input
                  id="username"
                  placeholder="Username"
                  value={form.username}
                  onChange={handleChange}
                  className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-6 py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 text-[#243746]"
                  required
                />
              </div>

              <div className="relative flex items-center">
                <User
                  size={18}
                  className="absolute left-5 text-gray-400 pointer-events-none"
                />
                <input
                  id="fullName"
                  placeholder="Full Name"
                  value={form.fullName}
                  onChange={handleChange}
                  className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-6 py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 text-[#243746]"
                  required
                />
              </div>
            </div>

            {/* EMAIL */}
            <div className="relative flex items-center">
              <Mail
                size={18}
                className="absolute left-5 text-gray-400 pointer-events-none"
              />
              <input
                id="email"
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-6 py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 text-[#243746]"
                required
              />
            </div>

            {/* PHONE NUMBER & GENDER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative flex items-center">
                <Phone
                  size={18}
                  className="absolute left-5 text-gray-400 pointer-events-none"
                />
                <input
                  id="phoneNumber"
                  placeholder="Phone Number"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  maxLength={11}
                  className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-6 py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 text-[#243746]"
                  required
                />
              </div>

              <div className="relative flex items-center">
                <select
                  id="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full border border-[#E1E9EF] rounded-full px-6 py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all text-[#243746] bg-transparent appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled className="text-gray-400">
                    Select Gender
                  </option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {/* PASSWORD FIELD */}
            <div className="relative flex flex-col">
              <div className="relative flex items-center">
                <Lock
                  size={18}
                  className="absolute left-5 text-gray-400 pointer-events-none"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-12 py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 text-[#243746]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {form.password && (
                <p
                  className={`text-[11px] font-bold tracking-wider mt-2 ml-5 ${strength.color}`}
                >
                  Security: {strength.label}
                </p>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="relative flex flex-col">
              <div className="relative flex items-center">
                <Lock
                  size={18}
                  className="absolute left-5 text-gray-400 pointer-events-none"
                />
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full border border-[#E1E9EF] rounded-full pl-12 pr-12 py-4 text-[14px] font-medium outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B]/30 transition-all placeholder:text-gray-400 text-[#243746]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-5 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {form.confirmPassword && (
                <p
                  className={`text-[11px] font-bold tracking-wider mt-2 ml-5 flex items-center gap-1 ${isMatch ? "text-emerald-600" : "text-red-500"
                    }`}
                >
                  {isMatch ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {isMatch ? "Passwords Match" : "Passwords Do Not Match"}
                </p>
              )}
            </div>

            {/* CLOUDFLARE TURNSTILE BOT PROTECTION */}
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken("")}
            />

            {/* CREATE ACCOUNT BUTTON */}
            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-3.5 font-bold sm:py-4 rounded-full text-[12px] font-black uppercase transition-all shadow-md active:scale-[0.99] disabled:opacity-70 mt-2 flex items-center justify-center cursor-pointer"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            {/* LEGAL TERMS NOTICE */}


            {/* OR DIVIDER */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#E1E9EF]"></div>
              <span className="shrink mx-4 text-gray-400 text-[11px] uppercase font-bold tracking-wider">
                or continue with
              </span>
              <div className="flex-grow border-t border-[#E1E9EF]"></div>
            </div>

            {/* GOOGLE SIGN UP BUTTON */}
            <GoogleAuthButton text="Connect with Google" mode="signup" />
          </form>
        </div>

        {/* BOTTOM MINIMAL FOOTER */}
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

export default Signup;