import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios, { API_BASE_URL } from "../../axios";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { useAppData } from "../../context/AppDataContext";

export default function GoogleAuthButton({
  text = "Connect with Google",
  mode = "signin",
  onSuccessCallback = null,
  className = "",
}) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAppData();

  const handleGoogleAuthSuccess = async (authPayload) => {
    setIsLoading(true);
    try {
      let res;
      try {
        res = await axios.post(`${API_BASE_URL}/api/users/google`, authPayload);
      } catch (firstErr) {
        // Resilient fallback: if local endpoint failed (e.g. testing from mobile device where port 5000 is unreachable), try production backend
        const isNetworkErr = !firstErr.response || firstErr.code === 'ERR_NETWORK' || firstErr.message?.includes('Network Error');
        if (isNetworkErr && API_BASE_URL !== "https://mhira-crmsystem.onrender.com") {
          console.warn("Primary endpoint unreachable; attempting fallback to production Google Auth server...");
          res = await axios.post("https://mhira-crmsystem.onrender.com/api/users/google", authPayload);
        } else {
          throw firstErr;
        }
      }
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
          profileImage: data.user?.profileImage || "",
        };

        try {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(minimalUser));
          if (data.user?.profileImage) {
            localStorage.setItem("profileImage", data.user.profileImage);
          }
        } catch (storageErr) {
          console.warn("Storage quota exceeded; continuing in-memory:", storageErr);
        }

        if (setUser) setUser(data.user || minimalUser);

        const staffRoles = ["Admin", "Inventory", "Marketing", "Logistic"];
        const targetPath = staffRoles.includes(data.user?.role) ? "/dashboard" : "/";

        if (!staffRoles.includes(data.user?.role)) {
          try {
            sessionStorage.setItem("mhira_show_offer_on_login", "true");
          } catch (e) {}
        }

        showSuccessToast(`Welcome, ${data.user?.fullName || "User"}!`);

        setTimeout(() => {
          window.dispatchEvent(new Event("userLogin"));
        }, 50);

        if (onSuccessCallback) {
          onSuccessCallback(data);
        } else {
          navigate(targetPath, { replace: true });
        }
      } else {
        showErrorToast(data?.message || "Google authentication failed.");
      }
    } catch (error) {
      console.error("Google login error:", error);
      const msg =
        error.response?.data?.message ||
        "Error connecting to Google authentication server. Please check your connection.";
      showErrorToast(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full flex justify-center items-center my-1 ${className}`}>
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-3 px-6 rounded-full border border-gray-300 bg-gray-50 text-gray-700 text-[13px] font-semibold w-full max-w-[360px] shadow-xs">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-[#246C94] rounded-full animate-spin shrink-0" />
          <span>Authenticating with Google...</span>
        </div>
      ) : (
        <div className="w-full flex justify-center">
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse && credentialResponse.credential) {
                handleGoogleAuthSuccess({ credential: credentialResponse.credential });
              }
            }}
            onError={() => {
              console.error("Google login error on this device");
              const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
              if (isIp) {
                showErrorToast("Google Sign-In does not allow raw IP addresses. Please open via localhost or https://mhira.shop");
              } else {
                showErrorToast("Google sign-in was blocked or failed on this device. Please check pop-up settings.");
              }
            }}
            theme="outline"
            size="large"
            shape="pill"
            text={mode === "signup" ? "signup_with" : "continue_with"}
            width="360"
          />
        </div>
      )}
    </div>
  );
}

