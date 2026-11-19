const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const API_BASE_URL =
  !isLocalhost || import.meta.env.PROD || import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

export const API_URL = `${API_BASE_URL}/api`;

export const getImageUrl = (url, fallback = "/mhira_removebg.png") => {
  if (!url || typeof url !== "string") return fallback;
  let trimmed = url.trim();
  if (!trimmed || trimmed === "/mhira_removebg.png" || trimmed === "mhira_removebg.png") {
    return fallback;
  }
  if (trimmed.includes("localhost:5000")) {
    trimmed = trimmed.replace(/^https?:\/\/localhost:5000\/?/, "");
    return `${API_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
  }
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  if (fallback === "" && trimmed.startsWith("/")) {
    return trimmed;
  }
  return `${API_BASE_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
};
