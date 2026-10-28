import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Delete,
  Loader2,
  Lock
} from 'lucide-react';
import API from '../../axios';

const STORAGE_PIN_KEY = 'bom_security_pin';
export const DEFAULT_BOM_PIN = '123456';

export const getStoredBomPin = () => {
  try {
    return localStorage.getItem(STORAGE_PIN_KEY) || DEFAULT_BOM_PIN;
  } catch (e) {
    return DEFAULT_BOM_PIN;
  }
};

export const setStoredBomPin = (newPin) => {
  try {
    localStorage.setItem(STORAGE_PIN_KEY, newPin);
    return true;
  } catch (e) {
    return false;
  }
};

export default function PinAuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Formula Access Authorization',
  subtitle = 'Enter 6-digit PIN code to view Bill of Materials formulation',
  targetItem = null,
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [maskDigits, setMaskDigits] = useState(true);
  const [shake, setShake] = useState(false);

  const inputRefs = useRef([]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      setIsSuccess(false);
      setVerifying(false);
      setShake(false);

      // Focus first input after modal opens
      const timer = setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Validate entered PIN against backend API (with local fallback)
  const verifyCode = async (codeToVerify) => {
    if (verifying) return;
    setVerifying(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('token');
      const res = await API.post(
        '/api/system/formula-pin/verify',
        { pin: codeToVerify },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.valid) {
        setIsSuccess(true);
        setErrorMsg('');
        setVerifying(false);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 400);
        return;
      }
    } catch (err) {
      // Local fallback in case network error occurs
      const localPin = getStoredBomPin();
      if (codeToVerify === localPin) {
        setIsSuccess(true);
        setErrorMsg('');
        setVerifying(false);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 400);
        return;
      }
    }

    setVerifying(false);
    setErrorMsg('Invalid 6-digit PIN code. Please try again.');
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(() => {
      setDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    }, 600);
  };

  const handleChange = (index, value) => {
    if (verifying) return;
    const char = value.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMsg('');

    // Advance focus
    if (char && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }

    // Auto verify when all 6 digits are entered
    const completeCode = newDigits.join('');
    if (completeCode.length === 6 && !newDigits.includes('')) {
      verifyCode(completeCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (verifying) return;
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1].focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleAuthorizeClick();
    }
  };

  const handlePaste = (e) => {
    if (verifying) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const numericOnly = pastedData.replace(/\D/g, '').slice(0, 6);
    if (!numericOnly) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = numericOnly[i] || '';
    }
    setDigits(newDigits);

    if (numericOnly.length === 6) {
      verifyCode(numericOnly);
    } else {
      const nextFocus = Math.min(numericOnly.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  const handleKeypadPress = (val) => {
    if (verifying) return;
    if (val === 'clear') {
      setDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      inputRefs.current[0]?.focus();
      return;
    }
    if (val === 'backspace') {
      const lastFilledIndex = digits.reduce((last, cur, idx) => (cur !== '' ? idx : last), -1);
      if (lastFilledIndex >= 0) {
        const newDigits = [...digits];
        newDigits[lastFilledIndex] = '';
        setDigits(newDigits);
        inputRefs.current[lastFilledIndex]?.focus();
      }
      return;
    }

    // Number pressed
    const firstEmptyIndex = digits.findIndex((d) => d === '');
    if (firstEmptyIndex !== -1) {
      handleChange(firstEmptyIndex, String(val));
    }
  };

  const handleAuthorizeClick = () => {
    if (verifying) return;
    const code = digits.join('');
    if (code.length === 6 && !digits.includes('')) {
      verifyCode(code);
    } else {
      setErrorMsg('Please enter all 6 digits of the authorization PIN.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      const emptyIdx = digits.findIndex((d) => d === '');
      if (emptyIdx !== -1 && inputRefs.current[emptyIdx]) {
        inputRefs.current[emptyIdx].focus();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200 ${
          shake ? 'animate-shake' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#01390f] shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar text-xs sm:text-sm">
          {/* TARGET PRODUCT INFO CARD */}
          {targetItem && (
            <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Target Finished Good
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-800 truncate block mt-0.5">
                  {targetItem.itemName || targetItem.itemDescription || 'Product Formulation'}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold font-mono">
                  {targetItem.code || 'FG0001'}
                </span>
              </div>
            </div>
          )}

          {/* 6-DIGIT PIN INPUT CARD */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Security Authorization PIN
                </h4>
                <p className="text-[11px] text-slate-500">
                  Enter 6-digit PIN code to view Bill of Materials formulation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMaskDigits((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-slate-200/70 shrink-0"
              >
                {maskDigits ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Show</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hide</span>
                  </>
                )}
              </button>
            </div>

            {/* 6-DIGIT OTP BOXES */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-2" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type={maskDigits ? 'password' : 'text'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  disabled={verifying || isSuccess}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`w-11 h-12 sm:w-12 sm:h-13 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border transition-all duration-150 outline-none select-none shadow-2xs ${
                    isSuccess
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400/40'
                      : errorMsg
                      ? 'border-rose-400 bg-rose-50 text-rose-800 ring-2 ring-rose-300/40'
                      : digit
                      ? 'border-[#01390f] bg-emerald-50/20 text-[#01390f] ring-2 ring-[#01390f]/20'
                      : 'border-slate-300 bg-white hover:border-slate-400 focus:border-[#01390f] focus:ring-2 focus:ring-[#01390f]/20'
                  }`}
                />
              ))}
            </div>

            {/* STATUS FEEDBACK */}
            {verifying && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 py-2 px-3 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-[#01390f]" />
                <span>Verifying authorization PIN...</span>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-xl animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Access Granted! Opening formulation...</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 py-2 px-3 rounded-xl animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* NUMERIC KEYPAD CARD */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2.5">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={verifying || isSuccess}
                  onClick={() => handleKeypadPress(num)}
                  className="h-10 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-800 transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                disabled={verifying || isSuccess}
                onClick={() => handleKeypadPress('clear')}
                className="h-10 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
                title="Clear all digits"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={verifying || isSuccess}
                onClick={() => handleKeypadPress(0)}
                className="h-10 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-800 transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                disabled={verifying || isSuccess}
                onClick={() => handleKeypadPress('backspace')}
                className="h-10 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-50"
                title="Backspace"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS FOOTER */}
        <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 whitespace-nowrap">
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={verifying || isSuccess}
            onClick={handleAuthorizeClick}
            className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Authorize Access</span>
          </button>
        </div>
      </div>
    </div>
  );
}
