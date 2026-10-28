import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import { AppDataProvider } from './context/AppDataContext'
import { Toaster } from 'react-hot-toast'
import { ToastLimiter } from './utils/toast'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Global Axios Request Interceptor for Clean Authorization & Resilient Timeout Handling
axios.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token')
      if (
        token &&
        typeof token === 'string' &&
        token !== 'undefined' &&
        token !== 'null' &&
        token.trim() !== ''
      ) {
        if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } else {
        // Prevent sending "Bearer undefined" or "Bearer null"
        if (
          config.headers.Authorization &&
          (config.headers.Authorization.includes('undefined') ||
            config.headers.Authorization.includes('null'))
        ) {
          delete config.headers.Authorization
        }
      }
    } catch (e) {}

    // If timeout is explicitly set to 0, preserve 0 (no timeout)
    if (config.timeout === undefined || config.timeout === null) {
      config.timeout = 0;
    }

    return config;
  },
  (error) => Promise.reject(error)
)

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "118150218118-eoad4v84ip14er37sfnelloqg8jvo98u.apps.googleusercontent.com";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppDataProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <ToastLimiter limit={3} />
        <App />
      </AppDataProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
