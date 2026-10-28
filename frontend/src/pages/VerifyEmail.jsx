import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, CheckCircle2, XCircle, Loader2, ArrowRight, Home } from "lucide-react";
import axios, { API } from "../axios";

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!token) {
        if (isMounted) {
          setLoading(false);
          setSuccess(false);
          setMessage("No verification token was provided in the link.");
        }
        return;
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/api/users/verify-email-token`, {
          token,
        });

        if (isMounted) {
          if (res.data?.success) {
            setSuccess(true);
            setMessage(res.data.message || "Email address confirmed successfully!");
            if (res.data?.user?.email) {
              setUserEmail(res.data.user.email);
            }

            // Sync with local user profile if currently signed in
            try {
              const rawUser = localStorage.getItem("user");
              if (rawUser) {
                const currentUser = JSON.parse(rawUser);
                if (
                  !res.data.user?.email ||
                  currentUser.email?.toLowerCase() === res.data.user.email.toLowerCase()
                ) {
                  currentUser.isEmailVerified = true;
                  localStorage.setItem("user", JSON.stringify(currentUser));
                  window.dispatchEvent(new Event("userLogin"));
                }
              }
            } catch (e) {}
          } else {
            setSuccess(false);
            setMessage(res.data?.message || "Unable to verify email address.");
          }
        }
      } catch (err) {
        if (isMounted) {
          setSuccess(false);
          setMessage(
            err.response?.data?.message ||
              "This verification link has expired or is invalid. Please request a new link."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#fcfdfb] flex flex-col justify-center items-center p-4 font-sans antialiased text-[#243746] selection:bg-[#246C94] selection:text-white">
      <div className="w-full max-w-md bg-white rounded-[24px] shadow-xl border border-[#E1E9EF] overflow-hidden">
        {/* Brand Header matching Login.jsx */}
        <div className="pt-8 pb-4 text-center">
          <img
            src="/mhira_removebg.png"
            alt="Mhira Natural"
            className="h-14 mx-auto mb-2 object-contain"
          />
          <h1 className="text-sm font-bold tracking-[2px] text-[#246C94] uppercase">
            MHIRA NATURAL
          </h1>
        </div>

        {/* Content Body */}
        <div className="px-8 pb-8 pt-2 text-center">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-[#246C94] animate-spin" />
              <p className="text-sm font-semibold text-slate-600">
                Verifying your email address...
              </p>
            </div>
          ) : success ? (
            <div className="py-4 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#EAF3E4] border border-[#79A94B]/40 flex items-center justify-center text-[#79A94B] shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#243746]">Email Verified!</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  {message}
                </p>
                {userEmail && (
                  <div className="mt-3 inline-block bg-slate-100 text-slate-700 text-xs font-mono font-medium px-3 py-1 rounded-md border border-[#E1E9EF]">
                    {userEmail}
                  </div>
                )}
              </div>

              <div className="bg-[#EAF3E4] border border-[#79A94B]/40 rounded-2xl p-4 text-xs text-[#243746] text-left w-full mt-2">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-[#246C94]">
                  <ShieldCheck className="w-4 h-4 text-[#79A94B] shrink-0" />
                  Account Security Confirmed
                </div>
                Your customer profile is now fully verified in our system. You now have verified access to orders and member perks.
              </div>

              <div className="w-full flex flex-col gap-2.5 mt-4">
                <Link
                  to="/login"
                  className="w-full py-3.5 px-6 rounded-full bg-[#246C94] hover:bg-[#1D5777] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  Proceed to Sign In <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/"
                  className="w-full py-3 px-6 rounded-full bg-slate-100 hover:bg-slate-200 text-[#243746] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" /> Return to Storefront
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
                <XCircle className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#243746]">Verification Unsuccessful</h2>
                <p className="text-xs text-rose-600 mt-1 max-w-xs mx-auto font-medium">
                  {message}
                </p>
              </div>

              <div className="bg-slate-50 border border-[#E1E9EF] rounded-2xl p-3.5 text-xs text-slate-600 text-left w-full mt-2">
                Verification links expire after 7 days or after being used. You can request a fresh verification link anytime from your account settings or password reset page.
              </div>

              <div className="w-full flex flex-col gap-2.5 mt-4">
                <Link
                  to="/login"
                  className="w-full py-3.5 px-6 rounded-full bg-[#246C94] hover:bg-[#1D5777] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  Back to Sign In <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/"
                  className="w-full py-3 px-6 rounded-full bg-slate-100 hover:bg-slate-200 text-[#243746] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" /> Return to Storefront
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#fcfdfb] py-3 text-center border-t border-gray-100 text-[11px] text-gray-400">
          &copy; {new Date().getFullYear()} Mhira Natural Soap and Cosmetics Manufacturing. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
