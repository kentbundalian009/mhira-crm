import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  X,
  Plus,
  Edit2,
  Sparkles,
  Layers,
  Shield,
  Clock,
  Activity,
  FileSpreadsheet,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import TablePagination from './common/TablePagination';
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

  // Modals
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false);

  // Change PIN Form State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);

  // Test Simulator State
  const [testPinInput, setTestPinInput] = useState('');
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  // Table Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All' | 'default' | 'custom'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeSheetTab, setActiveSheetTab] = useState('all');

  // Fetch live PIN status from Backend
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await API.get('/api/system/formula-pin', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
        setIsChangePinModalOpen(false);
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
          message: 'PIN is VALID! Access will be granted to the Bill of Materials formulation.',
        });
      } else {
        setTestResult({
          success: false,
          message: 'PIN is INVALID. Access will be rejected with an authentication failure.',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Error verifying PIN against server.',
      });
    } finally {
      setTesting(false);
    }
  };

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Initial System Default';

  // Master Data records for Formula Security Table
  const formulaSecurityRecords = useMemo(() => {
    return [
      {
        id: 'sec-01',
        code: 'BOM-PIN-001',
        scope: 'Finished Goods Secret Formulas',
        description: 'Bill of Materials (BOM) ingredient ratio and chemical formulation protection',
        category: 'Formulation Security',
        statusType: isDefault ? 'default' : 'custom',
        statusLabel: isDefault ? 'Default PIN (123456)' : 'Custom Security PIN',
        targetRoles: 'Admin Only (Staff Blocked)',
        lastModified: formattedDate,
        updatedBy: updatedBy,
        accessLevel: 'Level 4 Critical Safeguard',
      },
      {
        id: 'sec-02',
        code: 'BOM-RATIO-002',
        scope: 'Cosmetics & Soap Secret Blend',
        description: 'Protects proprietary essential oils, active agents, and alkali batch ratios',
        category: 'Proprietary Asset',
        statusType: isDefault ? 'default' : 'custom',
        statusLabel: isDefault ? 'Default PIN (123456)' : 'Custom Security PIN',
        targetRoles: 'Production Chemist & Admin',
        lastModified: formattedDate,
        updatedBy: updatedBy,
        accessLevel: 'Level 4 Critical Safeguard',
      },
      {
        id: 'sec-03',
        code: 'BOM-GATE-003',
        scope: 'Warehouse Formulation Terminal',
        description: 'Inventory Finished Goods interactive verification gatekeeper prompt',
        category: 'Authentication Gate',
        statusType: isDefault ? 'default' : 'custom',
        statusLabel: isDefault ? 'Factory Checkpoint' : 'Enforced Verification',
        targetRoles: 'Role Separation Protected',
        lastModified: formattedDate,
        updatedBy: updatedBy,
        accessLevel: 'Interactive PIN Terminal',
      },
    ];
  }, [isDefault, formattedDate, updatedBy]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return formulaSecurityRecords.filter((item) => {
      if (selectedStatus === 'default' && item.statusType !== 'default') return false;
      if (selectedStatus === 'custom' && item.statusType !== 'custom') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchScope = item.scope.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        return matchCode || matchScope || matchDesc || matchCat;
      }
      return true;
    });
  }, [formulaSecurityRecords, selectedStatus, searchQuery]);

  // Paginated Rows
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif]">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE - MATCHES INVENTORY RAW MAT) */}
      <div className="w-full bg-white border border-slate-100 text-slate-600 rounded-2xl p-3 sm:p-6 shadow-sm flex flex-col gap-4 sm:gap-6 transition-colors duration-200">
        
        {/* COMPACT EXCEL RIBBON TOOLBAR (SEAMLESS WHITE DESIGN) */}
        <div className="w-full bg-white flex flex-col">
          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0">
            <div className="flex items-center gap-1 -mb-px">
              <button
                type="button"
                className="px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#01390f]" />
                <span>All Authorization Policies</span>
              </button>
            </div>
          </div>

          {/* MS EXCEL-STYLE RIBBON TOOLBAR */}
          <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
            {/* GROUP 1: ACTIONS RIBBON */}
            <div className="w-full lg:w-[256px] shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]">
              <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
                {/* Tall Action Button */}
                <button
                  type="button"
                  onClick={() => setIsChangePinModalOpen(true)}
                  className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                  title="Change Formula Authorization PIN Code"
                >
                  <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    Change{'\n'}PIN
                  </span>
                </button>

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                  {/* Layer 1: Simulator */}
                  <button
                    type="button"
                    onClick={() => {
                      setTestPinInput('');
                      setTestResult(null);
                      setIsSimulatorModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Open Test PIN Simulator Sandbox"
                  >
                    <Activity className="w-3.5 h-3.5 text-[#01390f] shrink-0" />
                    <span className="whitespace-nowrap truncate">Test Simulator</span>
                  </button>

                  {/* Layer 2: Reset to Default */}
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(true)}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-rose-50 text-rose-700 hover:text-rose-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Reset PIN to factory default (123456)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="whitespace-nowrap truncate">Reset to 123456</span>
                  </button>

                  {/* Layer 3: Copy PIN */}
                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Copy active PIN code"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap truncate">Copy Active PIN</span>
                  </button>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
                Actions
              </div>
            </div>

            {/* GROUP 2: SEARCH & FILTERS */}
            <div className="flex flex-col justify-between flex-1 min-h-0 lg:min-h-[92px] lg:pl-1">
              <div className="flex flex-col justify-between flex-1 py-0.5 space-y-2 lg:space-y-1">
                {/* Layer 1: Search Bar */}
                <div className="relative flex items-center w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search Authorization Scope, Code, or Category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear Search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Layer 2: Filter Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                  {/* Status Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <ShieldCheck className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                    >
                      <option value="All">All Security Credentials ({formulaSecurityRecords.length})</option>
                      <option value="custom">Custom Security PIN ({isDefault ? 0 : 3})</option>
                      <option value="default">Default Factory (123456) ({isDefault ? 3 : 0})</option>
                    </select>
                  </div>

                  {/* Access Scope Info */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Shield className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      defaultValue="All"
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                    >
                      <option value="All">Scope: Bill of Materials Formulation</option>
                      <option value="Cosmetics">Scope: Cosmetics & Soap Line</option>
                    </select>
                  </div>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={fetchStatus}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 px-2 py-1 sm:py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[30px] sm:h-[22px] w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs sm:col-span-2 md:col-span-1"
                    title="Refresh status from backend"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-[#01390f]' : ''}`} />
                    <span className="whitespace-nowrap">Refresh PIN Status</span>
                  </button>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
                Search &amp; Filter
              </div>
            </div>
          </div>
        </div>

        {/* CLEAN SEPARATOR BEFORE TABLE (MATCHES RAW MATERIALS) */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* 3. TABLE MASTERLIST (MATCHING INVENTORY RAW MAT TABLE) */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* TABLE PAGINATION */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredRecords.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setItemsPerPage(rows);
              setCurrentPage(1);
            }}
          />

          <div className="overflow-x-auto relative custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CODE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CATEGORY</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px] font-semibold text-white">FORMULATION SCOPE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">SECURITY STATUS</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">ACTIVE CREDENTIAL</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">LAST MODIFIED</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Fetching security authorization configuration...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-slate-300" />
                        <span>No authorization records matched your search criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                    >
                      {/* 1. CODE */}
                      <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                          {item.code}
                        </span>
                      </td>

                      {/* 2. CATEGORY (Pill Badge matching Raw Materials) */}
                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-medium text-xs text-slate-600 transition-colors">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#01390f] border border-emerald-200">
                          {item.category}
                        </span>
                      </td>

                      {/* 3. FORMULATION SCOPE */}
                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-bold text-xs text-slate-800 transition-colors">
                        <div className="flex flex-col">
                          <span>{item.scope}</span>
                          <span className="text-[11px] font-normal text-slate-500 max-w-sm truncate">
                            {item.description}
                          </span>
                        </div>
                      </td>

                      {/* 4. SECURITY STATUS (Blue cell tint matching Raw Materials Volume/Condition) */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap bg-blue-600/25 group-hover:bg-blue-600/40 transition-colors">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {item.accessLevel}
                          </span>
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isDefault
                                ? 'bg-amber-50 text-amber-700 border-amber-200/70'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isDefault ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            {item.statusLabel}
                          </span>
                        </div>
                      </td>

                      {/* 5. ACTIVE CREDENTIAL (Interactive Digits) */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
                          <KeyRound className="w-3.5 h-3.5 text-[#01390f]" />
                          <span className="font-mono font-bold text-slate-800 text-xs tracking-wider">
                            {showCurrentPin ? currentPin : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyPin}
                            className="text-slate-400 hover:text-[#01390f] cursor-pointer ml-1"
                            title="Copy PIN"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* 6. LAST MODIFIED */}
                      <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-700">{item.lastModified}</span>
                          <span className="text-[10px] text-slate-400">By: {item.updatedBy}</span>
                        </div>
                      </td>

                      {/* 7. ACTION (STICKY RIGHT - EXACT RAW MATERIALS STYLING) */}
                      <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px] transition-colors">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsChangePinModalOpen(true)}
                            title="Change PIN Code"
                            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTestPinInput('');
                              setTestResult(null);
                              setIsSimulatorModalOpen(true);
                            }}
                            title="Test PIN Simulator"
                            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsResetModalOpen(true)}
                            title="Reset to Default (123456)"
                            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CHANGE PIN MODAL DIALOG */}
      {isChangePinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => !saving && setIsChangePinModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EDF7EE] text-[#01390f] flex items-center justify-center border border-[#d5ead7]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Change Formula Authorization PIN
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Propagates immediately across all inventory & formulation terminals.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePinModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveNewPin} className="p-6 space-y-4 text-xs">
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] transition-all shadow-2xs pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New PIN <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter the same 6 digits"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] transition-all shadow-2xs"
                  required
                />
                {confirmPin.length > 0 && (
                  <p
                    className={`text-[11px] mt-1 font-semibold flex items-center gap-1 ${
                      newPin === confirmPin ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
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

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsChangePinModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#d5ead7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || newPin.length !== 6 || confirmPin.length !== 6 || newPin !== confirmPin}
                  className="px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Save New PIN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEST PIN SIMULATOR MODAL */}
      {isSimulatorModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setIsSimulatorModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Test Authorization Simulator
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Simulates the exact verification prompt shown to warehouse staff.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulatorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTestPin} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Enter 6-Digit PIN Code to Verify
                </label>
                <input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  value={testPinInput}
                  onChange={(e) => {
                    setTestPinInput(e.target.value.replace(/\D/g, ''));
                    setTestResult(null);
                  }}
                  placeholder="e.g. 123456"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-slate-800 focus:outline-none focus:border-[#01390f] transition-all shadow-2xs text-center tracking-widest"
                />
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

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSimulatorModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#d5ead7]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testing || testPinInput.length !== 6}
                  className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Test Verification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-[#d5ead7] disabled:opacity-50"
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
