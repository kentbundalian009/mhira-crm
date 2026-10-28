import React, { useState, useEffect } from 'react';
import API from '../axios';
import {
  Power,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  X,
  Clock,
  Users,
  Activity,
  AlertTriangle,
  MessageSquare,
  Loader2
} from 'lucide-react';
import MaintenanceScreen from './common/MaintenanceScreen';
import { showSuccessToast, showErrorToast } from '../utils/toast';

function AdminSystemMaintenance() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updatedBy, setUpdatedBy] = useState('');

  // Toast Notifications state
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    showSuccessToast(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const triggerError = (msg) => {
    setErrorMessage(msg);
    showErrorToast(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isConfirmMessageDialogOpen, setIsConfirmMessageDialogOpen] = useState(false);
  const [pendingToggleValue, setPendingToggleValue] = useState(false);

  const fetchMaintenanceStatus = async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/system/maintenance');
      if (res.data) {
        setIsMaintenanceActive(Boolean(res.data.maintenanceMode));
        setMaintenanceMessage(res.data.message || res.data.maintenanceMessage || '');
        setLastUpdated(res.data.updatedAt || null);
        setUpdatedBy(res.data.updatedBy || 'Admin');
      }
    } catch (err) {
      console.error("Error fetching system maintenance status:", err);
      triggerError("Failed to fetch system settings from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  const handleInitiateToggle = (nextState) => {
    setPendingToggleValue(nextState);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmToggle = async () => {
    setIsConfirmDialogOpen(false);
    setSaving(true);
    try {
      const res = await API.post('/api/system/maintenance', {
        maintenanceMode: pendingToggleValue,
        maintenanceMessage: maintenanceMessage.trim() || undefined
      });

      if (res.status === 200 || res.data?.success) {
        setIsMaintenanceActive(pendingToggleValue);
        setLastUpdated(new Date().toISOString());
        const msg = pendingToggleValue
          ? "Shutdown / Maintenance mode is now ACTIVE. Storefront and staff roles are locked out."
          : "Maintenance mode DEACTIVATED. System is live for all user roles.";
        triggerSuccess(msg);
        window.dispatchEvent(new Event('systemMaintenanceChanged'));
        window.dispatchEvent(new CustomEvent('maintenanceModeChanged', {
          detail: { maintenanceMode: pendingToggleValue, maintenanceMessage }
        }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update maintenance state.";
      triggerError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleInitiateSaveMessage = (e) => {
    e.preventDefault();
    setIsConfirmMessageDialogOpen(true);
  };

  const handleConfirmSaveMessage = async () => {
    setIsConfirmMessageDialogOpen(false);
    setSaving(true);
    try {
      const res = await API.post('/api/system/maintenance', {
        maintenanceMode: isMaintenanceActive,
        maintenanceMessage: maintenanceMessage.trim()
      });

      if (res.status === 200 || res.data?.success) {
        triggerSuccess("Advisory announcement notice updated successfully.");
        window.dispatchEvent(new CustomEvent('maintenanceModeChanged', {
          detail: { maintenanceMode: isMaintenanceActive, maintenanceMessage }
        }));
      }
    } catch (err) {
      triggerError("Failed to save advisory announcement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">

      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}


      {/* 2. MAIN CARD CONTAINER (MATCHES INVENTORY RAW MAT & DATA BACKUP) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">

        {/* TOP RIBBON BAR: ACTIONS & CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          {/* LEFT CLUSTER: PRIMARY ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* 1. TOGGLE SHUTDOWN / RESTORE BUTTON */}
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => handleInitiateToggle(!isMaintenanceActive)}
              className={`inline-flex items-center justify-center gap-1.5 font-semibold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-all duration-150 cursor-pointer shadow-xs hover:shadow active:scale-95 whitespace-nowrap text-white ${isMaintenanceActive
                ? 'bg-[#01390f] hover:bg-[#01250a]'
                : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-60`}
              title={isMaintenanceActive ? "Deactivate maintenance and restore public access" : "Activate system shutdown and lockout non-admin users"}
            >
              {saving ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Power className="w-4 h-4 shrink-0" />}
              <span>{isMaintenanceActive ? 'Restore System Live' : 'Activate Shutdown'}</span>
            </button>

            {/* 2. PREVIEW 404 SCREEN BUTTON */}
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 sm:px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
              title="Preview how the 404 maintenance screen appears to visitors"
            >
              <Eye className="w-4 h-4 shrink-0 text-[#01390f]" />
              <span>Preview 404 Screen</span>
            </button>
          </div>

          {/* RIGHT CLUSTER: STATUS REFRESH */}
          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={fetchMaintenanceStatus}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
              title="Refresh maintenance status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#01390f]" : "text-[#01390f]"}`} />
              <span className="hidden sm:inline">Refresh Status</span>
            </button>
          </div>
        </div>


        {/* ROLE IMPACT GRID */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Role Access Matrix During Shutdown
            </span>
            <span className="text-[11px] text-slate-400">
              Live status base sa kasalukuyang maintenance mode
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
            {/* Admin Role */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col gap-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Admin Role</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-800 border-emerald-200">
                  EXEMPTED
                </span>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed">
                May buong access kahit naka-shutdown ang system para sa maintenance.
              </span>
            </div>

            {/* Staff Roles */}
            <div className={`p-4 rounded-xl border flex flex-col gap-1.5 shadow-2xs transition-all ${isMaintenanceActive
              ? 'bg-red-50/50 border-red-200'
              : 'bg-slate-50/60 border-slate-200/80'
              }`}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Staff Roles</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isMaintenanceActive
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                  {isMaintenanceActive ? '404 BLOCKED' : 'ACTIVE'}
                </span>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed">
                {isMaintenanceActive
                  ? 'Makikita ang 404 maintenance screen (Inventory, Marketing, Logistics).'
                  : 'Normal na operasyon sa kani-kanilang dashboards at portals.'}
              </span>
            </div>

            {/* Storefront Customers */}
            <div className={`p-4 rounded-xl border flex flex-col gap-1.5 shadow-2xs transition-all ${isMaintenanceActive
              ? 'bg-red-50/50 border-red-200'
              : 'bg-slate-50/60 border-slate-200/80'
              }`}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Storefront Customers</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isMaintenanceActive
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                  {isMaintenanceActive ? '404 BLOCKED' : 'ACTIVE'}
                </span>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed">
                {isMaintenanceActive
                  ? 'Makikita ang Mhira 404 Scheduled Maintenance Screen.'
                  : 'Normal na online shopping at checkout para sa mga mamimili.'}
              </span>
            </div>
          </div>
        </div>

        {/* ADVISORY BROADCAST FORM */}
        <form onSubmit={handleInitiateSaveMessage} className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 flex flex-col gap-3.5 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#01390f]" />
              <label className="block text-xs font-bold uppercase text-[#01390f] tracking-wide">
                Maintenance Advisory Announcement
              </label>
            </div>
            <span className="text-[11px] text-slate-400">
              Lalabas sa 404 screen ng mga naka-lockout na staff at storefront visitors
            </span>
          </div>

          <textarea
            rows={3}
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            placeholder="Halimbawa: System update and database ledger maintenance are underway. Transactions are temporarily frozen."
            className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#01390f]/20 focus:border-[#01390f] transition-all"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-[#01390f] hover:bg-[#01280a] disabled:bg-slate-400 text-white px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{saving ? "Saving Changes..." : "Save Advisory Announcement"}</span>
            </button>
          </div>
        </form>

        {/* SYSTEM PROTOCOL NOTE */}
        <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/70 text-amber-900 flex flex-col gap-1.5 shadow-2xs">
          <span className="text-xs font-bold uppercase flex items-center gap-1.5 text-amber-800">

            <span>* System Action Protocol *</span>
          </span>
          <p className="text-[11px] leading-relaxed text-amber-800/90">
            Ang pag-shutdown ng sistema ay para sa pagsasaayos ng database, audit, o inventory synchronization. Ang Admin role lamang ang makakapasok upang magsagawa ng mga kailangang administrative tasks.
          </p>
        </div>

      </div>

      {/* CONFIRMATION DIALOG FOR TOGGLING SHUTDOWN */}
      {isConfirmDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 text-base">
                {pendingToggleValue ? 'Confirm System Shutdown / Lockout' : 'Restore Live System Access'}
              </h3>
              <button
                type="button"
                onClick={() => setIsConfirmDialogOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl mt-3.5 shrink-0">
              <span className="block text-xs font-bold text-amber-900 uppercase mb-1">
                * System Action Protocol *
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {pendingToggleValue
                  ? 'Ang pagsara ng system ay pansamantalang magpapakita ng 404 / Shutdown screen sa lahat ng Customers at Staff accounts.'
                  : 'Ang muling pagbukas ay magbabalik ng normal na access sa lahat ng authorized staff at customers.'}
              </p>
            </div>

            <div className="mt-4 flex-1">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Sigurado ka bang nais mong {pendingToggleValue ? 'i-shutdown ang access' : 'ibalik sa live access'} ang sistema?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmDialogOpen(false)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={saving}
                className={`px-6 py-2.5 sm:py-3 rounded-full ${pendingToggleValue
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-[#01390f] hover:bg-[#0a5219]'
                  } text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{pendingToggleValue ? 'Confirm Shutdown' : 'Restore Live Access'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR SAVING ADVISORY ANNOUNCEMENT */}
      {isConfirmMessageDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 text-base">
                Confirm Advisory Broadcast
              </h3>
              <button
                type="button"
                onClick={() => setIsConfirmMessageDialogOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl mt-3.5 shrink-0">
              <span className="block text-xs font-bold text-amber-900 uppercase mb-1">
                * System Action Protocol *
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Ang mensaheng ito ay agad na magiging aktibo at makikita ng lahat ng mga naka-lockout na staff at storefront visitors.
              </p>
            </div>

            <div className="mt-4 flex-1">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Sigurado ka bang nais mong i-save at i-broadcast ang advisory announcement?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmMessageDialogOpen(false)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveMessage}
                disabled={saving}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Confirm &amp; Broadcast</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PREVIEW 404 MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-slate-900/90 backdrop-blur-xs">
          <div className="bg-[#01390f] text-white px-4 md:px-6 py-3 flex items-center justify-between border-b border-[#01280a] z-50 shadow-md">
            <span className="text-xs font-mono font-bold text-emerald-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-300" />
              <span>PREVIEW MODE: Eto ang makikita ng Customers at Staff kapag naka-shutdown.</span>
            </span>
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Exit Preview
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            <MaintenanceScreen
              message={maintenanceMessage || "Scheduled system update and database ledger maintenance are underway."}
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminSystemMaintenance;