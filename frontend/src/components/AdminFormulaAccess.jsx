import React, { useState, useEffect } from 'react';
import API from '../axios';
import {
  ShieldCheck,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Lock,
  Unlock,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../utils/toast';

export default function AdminFormulaAccess() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [testing, setTesting] = useState(false);

  // Status State
  const [currentPin, setCurrentPin] = useState('123456');
  const [isDefault, setIsDefault] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updatedBy, setUpdatedBy] = useState('System Default');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [copied, setCopied] = useState(false);

  // Change PIN Form State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);

  // Reset Confirmation Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Test Simulator State
  const [testPinInput, setTestPinInput] = useState('');
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  // Fetch live PIN status from Backend
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await API.get('/api/system/formula-pin', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        setIsDefault(Boolean(res.data.isDefault));
        setUpdatedAt(res.data.updatedAt || null);
        setUpdatedBy(res.data.updatedBy || 'System Default');
        if (res.data.currentPin) {
          setCurrentPin(res.data.currentPin);
        }
      }
    } catch (err) {
      console.error('Error fetching formula PIN status:', err);
      showErrorToast('Failed to fetch PIN configuration from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Copy PIN to clipboard
  const handleCopyPin = () => {
    if (!currentPin) return;
    navigator.clipboard.writeText(currentPin);
    setCopied(true);
    showSuccessToast('Current PIN copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Save New PIN
  const handleSaveNewPin = async (e) => {
    e.preventDefault();
    const cleanNewPin = newPin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!/^\d{6}$/.test(cleanNewPin)) {
      showErrorToast('New PIN must be exactly 6 numeric digits (0-9).');
      return;
    }

    if (cleanNewPin !== cleanConfirmPin) {
      showErrorToast('New PIN and confirmation do not match.');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await API.post(
        '/api/system/formula-pin/change',
        { newPin: cleanNewPin },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        showSuccessToast('Formula Access Authorization PIN updated successfully!');
        setCurrentPin(cleanNewPin);
        setIsDefault(cleanNewPin === '123456');
        setUpdatedAt(res.data.updatedAt || new Date().toISOString());
        setUpdatedBy(res.data.updatedBy || 'Admin');
        setNewPin('');
        setConfirmPin('');
        // Sync local storage fallback
        localStorage.setItem('bom_security_pin', cleanNewPin);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update authorization PIN.';
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  // Handle Reset to Default PIN (123456)
  const handleConfirmReset = async () => {
    try {
      setResetting(true);
      const token = localStorage.getItem('token');
      const res = await API.post(
        '/api/system/formula-pin/reset',
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        showSuccessToast('Formula Access PIN reset to default (123456) successfully!');
        setCurrentPin('123456');
        setIsDefault(true);
        setUpdatedAt(res.data.updatedAt || new Date().toISOString());
        setUpdatedBy(res.data.updatedBy || 'Admin (Reset to Default)');
        setNewPin('');
        setConfirmPin('');
        setIsResetModalOpen(false);
        // Sync local storage fallback
        localStorage.setItem('bom_security_pin', '123456');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset authorization PIN.';
      showErrorToast(msg);
    } finally {
      setResetting(false);
    }
  };

  // Test PIN simulator
  const handleTestPin = async (e) => {
    e.preventDefault();
    if (!testPinInput || testPinInput.length !== 6) {
      showErrorToast('Please enter a 6-digit PIN to test.');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const token = localStorage.getItem('token');
      const res = await API.post(
        '/api/system/formula-pin/verify',
        { pin: testPinInput.trim() },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.valid) {
        setTestResult({
          success: true,
          message: 'PIN is VALID! Access will be granted to the Bill of Materials formulation.'
        });
      } else {
        setTestResult({
          success: false,
          message: 'PIN is INVALID. Access will be rejected with an authentication failure.'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Error verifying PIN against server.'
      });
    } finally {
      setTesting(false);
    }
  };

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Default Initial Setup';

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif]">
      {/* TOP OVERVIEW BANNER */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#EDF7EE] border border-[#d5ead7] flex items-center justify-center text-[#01390f] shrink-0 shadow-2xs">
            <KeyRound className="w-7 h-7" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Formula Access Authorization
              </h2>
              {isDefault ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Default Factory PIN (123456)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-[#01390f] border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Custom Security PIN Active
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Safeguards proprietary cosmetics and soap formulations in Finished Goods.
              Inventory staff must supply this 6-digit code to inspect Bill of Materials (BOM) ingredient ratios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            disabled={loading || saving || resetting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Reset PIN to factory default (123456)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reset to Default (123456)</span>
          </button>
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CURRENT PIN & QUICK ACTIONS (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* CURRENT PIN DISPLAY CARD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active Security Code
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">
                  Current Authorization PIN
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCurrentPin((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                {showCurrentPin ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reveal</span>
                  </>
                )}
              </button>
            </div>

            {/* BIG DIGIT DISPLAY */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex items-center justify-center gap-2.5 sm:gap-3 select-none">
              {currentPin.split('').map((char, idx) => (
                <div
                  key={idx}
                  className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-xl sm:text-2xl font-mono font-bold text-slate-800"
                >
                  {showCurrentPin ? char : '•'}
                </div>
              ))}
            </div>

            {/* ACTION & METADATA FOOTER */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="text-[11px] text-slate-500">
                <span>Updated by: </span>
                <strong className="text-slate-700">{updatedBy}</strong>
              </div>
              <button
                type="button"
                onClick={handleCopyPin}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#01390f] hover:underline cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy PIN</span>
                  </>
                )}
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Last Modified:</span>
              <span className="font-medium text-slate-600">{formattedDate}</span>
            </div>
          </div>

          {/* SIMULATOR & PIN VALIDATOR CARD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Verification Sandbox
              </span>
              <h3 className="text-base font-bold text-slate-800 mt-0.5">
                Test Authorization Simulator
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulate the exact authentication prompt experienced by inventory personnel.
              </p>
            </div>

            <form onSubmit={handleTestPin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Input 6-Digit PIN Code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    inputMode="numeric"
                    value={testPinInput}
                    onChange={(e) => {
                      setTestPinInput(e.target.value.replace(/\D/g, ''));
                      setTestResult(null);
                    }}
                    placeholder="Enter 6 digits to verify"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-[#01390f] transition-all shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={testing || testPinInput.length !== 6}
                    className="px-4 py-2.5 rounded-xl bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Test PIN</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </form>
          </div>

          {/* SYSTEM GUIDELINES CARD */}
          <div className="bg-[#EDF7EE]/60 border border-[#d5ead7] rounded-3xl p-5 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-full bg-white border border-[#d5ead7] flex items-center justify-center text-[#01390f] shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <strong className="font-bold text-[#01390f] block text-xs">
                Role Separation Safeguard
              </strong>
              <p className="leading-relaxed text-[11px] text-slate-600">
                Staff in the Inventory module no longer have access to the default PIN hint or change PIN controls.
                Only authorized Administrators can configure or reset this security credential.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CHANGE PIN & RESET CONTROLS (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* CONFIGURE NEW PIN FORM CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col gap-5">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Security Administration
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-0.5">
                Change Formula Authorization PIN
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Specify a new 6-digit numeric PIN code. Changes are propagated to all warehouse terminals immediately.
              </p>
            </div>

            <form onSubmit={handleSaveNewPin} className="space-y-4">
              {/* NEW PIN FIELD */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New 6-Digit PIN <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter exactly 6 digits (e.g. 987654)"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] transition-all shadow-2xs pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin((prev) => !prev)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNewPin ? 'Hide characters' : 'Show characters'}
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Digits entered: <strong className="text-slate-700 font-mono">{newPin.length} / 6</strong>
                </p>
              </div>

              {/* CONFIRM PIN FIELD */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New PIN <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Re-enter the same 6 digits"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] transition-all shadow-2xs pr-11"
                    required
                  />
                </div>
                {confirmPin.length > 0 && (
                  <p className={`text-[11px] mt-1 font-semibold flex items-center gap-1 ${
                    newPin === confirmPin ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {newPin === confirmPin ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>PIN codes match!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>PIN codes do not match yet</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={saving || newPin.length !== 6 || confirmPin.length !== 6 || newPin !== confirmPin}
                  className="px-6 py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>{saving ? 'Saving Changes...' : 'Save New Authorization PIN'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* FACTORY RESET CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-rose-200/90 shadow-sm flex flex-col gap-4 bg-gradient-to-br from-white via-white to-rose-50/30">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0 mt-0.5">
                <RotateCcw className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800">
                  Quick Factory Reset (PIN: 123456)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  If warehouse staff forget the customized PIN or need a quick restore, clicking this will immediately reset the Formula Access PIN back to default: <strong className="font-mono text-slate-800">123456</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                disabled={loading || saving || resetting}
                className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset PIN to Default (123456)</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* CONFIRM RESET MODAL DIALOG */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-hidden"
          onClick={() => !resetting && setIsResetModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sm:p-7 flex flex-col items-center text-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
                <RotateCcw className="w-7 h-7" strokeWidth={2.3} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Reset Formula Access PIN?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                This will immediately restore the formula authorization code to the system default:
                <br />
                <strong className="text-base font-mono font-bold text-[#01390f] inline-block mt-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl">
                  123456
                </strong>
              </p>
              <p className="text-[11px] text-slate-400">
                Staff viewing Bill of Materials formulations will be required to input 123456.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setIsResetModalOpen(false)}
                className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleConfirmReset}
                className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>{resetting ? 'Resetting...' : 'Confirm Reset to 123456'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
