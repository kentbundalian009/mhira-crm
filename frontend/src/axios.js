import axios from 'axios';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const isLanIp =
  typeof window !== 'undefined' &&
  (/^192\.168\.\d+\.\d+$/.test(window.location.hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(window.location.hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(window.location.hostname));

export const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }
  if (
    import.meta.env.PROD ||
    import.meta.env.MODE === 'production' ||
    window.location.hostname.includes('mhira.shop') ||
    window.location.hostname.includes('onrender.com')
  ) {
    return 'https://mhira-crmsystem.onrender.com';
  }
  if (isLocalhost) {
    return 'http://localhost:5000';
  }
  if (isLanIp) {
    return `http://${window.location.hostname}:5000`;
  }
  return 'https://mhira-crmsystem.onrender.com';
})();

export const getBackendMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return '/mhira_removebg.png';
  const clean = url.trim().replace(/^https?:\/\/localhost:5000\/?/, '').replace(/^\/+/, '');
  return `${API_BASE_URL}/${clean}`;
};

export const getImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed || trimmed === '/mhira_removebg.png') return '/mhira_removebg.png';
  if (trimmed.includes('localhost:5000')) {
    trimmed = trimmed.replace(/^https?:\/\/localhost:5000\/?/, '');
    return `/${trimmed.replace(/^\/+/, '')}`;
  }
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    return `/${trimmed.replace(/^\/+/, '')}`;
  }
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/${trimmed.replace(/^\/+/, '')}`;
};

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0, // 0 = WALANG TIMEOUT (maghihintay hanggang matapos ang backend)
});

// Awtomatikong ikabit ang token kung naka-login
API.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      if (
        token &&
        typeof token === 'string' &&
        token !== 'undefined' &&
        token !== 'null' &&
        token.trim() !== ''
      ) {
        if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {}
    return config;
  },
  (error) => Promise.reject(error)
);

API.isAxiosError = axios.isAxiosError;
API.CancelToken = axios.CancelToken;
API.isCancel = axios.isCancel;

export { API };
export default API;
