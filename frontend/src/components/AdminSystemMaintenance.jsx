import React, { useState, useEffect, useMemo } from 'react';
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
  Loader2,
  Search,
  Plus,
  Edit2,
  Shield,
  Layers,
  Globe,
  Truck,
  Package,
  ShoppingBag,
} from 'lucide-react';
import MaintenanceScreen from './common/MaintenanceScreen';
import TablePagination from './common/TablePagination';
import { showSuccessToast, showErrorToast } from '../utils/toast';

function AdminSystemMaintenance() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updatedBy, setUpdatedBy] = useState('');

  // Modals & Dialogs
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isEditMessageModalOpen, setIsEditMessageModalOpen] = useState(false);
  const [pendingToggleValue, setPendingToggleValue] = useState(false);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'locked' | 'live'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [activeSheetTab, setActiveSheetTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showRoleMatrix, setShowRoleMatrix] = useState(false);

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
      console.error('Error fetching system maintenance status:', err);
      showErrorToast('Failed to fetch system settings from server.');
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
        maintenanceMessage: maintenanceMessage.trim() || undefined,
      });

      if (res.status === 200 || res.data?.success) {
        setIsMaintenanceActive(pendingToggleValue);
        setLastUpdated(new Date().toISOString());
        const msg = pendingToggleValue
          ? 'Shutdown / Maintenance mode is now ACTIVE. Storefront and staff roles are locked out.'
          : 'Maintenance mode DEACTIVATED. System is live for all user roles.';
        showSuccessToast(msg);
        window.dispatchEvent(new Event('systemMaintenanceChanged'));
        window.dispatchEvent(
          new CustomEvent('maintenanceModeChanged', {
            detail: { maintenanceMode: pendingToggleValue, maintenanceMessage },
          })
        );
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update maintenance state.';
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMessage = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.post('/api/system/maintenance', {
        maintenanceMode: isMaintenanceActive,
        maintenanceMessage: maintenanceMessage.trim(),
      });

      if (res.status === 200 || res.data?.success) {
        showSuccessToast('Advisory announcement notice updated successfully.');
        setIsEditMessageModalOpen(false);
        window.dispatchEvent(
          new CustomEvent('maintenanceModeChanged', {
            detail: { maintenanceMode: isMaintenanceActive, maintenanceMessage },
          })
        );
      }
    } catch (err) {
      showErrorToast('Failed to save advisory announcement.');
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Initial System Setup';

  // System Entities / Service Matrix Masterlist
  const systemServices = useMemo(() => {
    return [
      {
        id: 'srv-01',
        code: 'SYS-STORE-001',
        name: 'Storefront E-Commerce Portal',
        description: 'Public customer shop, merchandise cart, checkout pipeline, and order tracking',
        category: 'Public Storefront',
        scopeType: 'public',
        isLocked: isMaintenanceActive,
        statusLabel: isMaintenanceActive ? '404 SHUTDOWN LOCKOUT' : 'NORMAL LIVE ACCESS',
        accessPolicy: 'Visitors redirected to Mhira 404 Scheduled Maintenance screen',
        targetRole: 'Storefront Shoppers',
        lastModified: formattedDate,
        updatedBy: updatedBy || 'Admin',
      },
      {
        id: 'srv-02',
        code: 'SYS-INV-002',
        name: 'Inventory & Formulation Operations',
        description: 'Raw materials stock volume, finished goods BOM formulation, WIP batch tracking',
        category: 'Internal Operations',
        scopeType: 'staff',
        isLocked: isMaintenanceActive,
        statusLabel: isMaintenanceActive ? 'STAFF 404 BLOCKED' : 'NORMAL LIVE ACCESS',
        accessPolicy: 'Staff locked out with maintenance advisory; Admin role exempted',
        targetRole: 'Inventory Staff Role',
        lastModified: formattedDate,
        updatedBy: updatedBy || 'Admin',
      },
      {
        id: 'srv-03',
        code: 'SYS-LOG-003',
        name: 'Logistics, Shipping & Fulfillment',
        description: 'Sales order validation, courier dispatch, PayMongo rates, and waybill printing',
        category: 'Internal Operations',
        scopeType: 'staff',
        isLocked: isMaintenanceActive,
        statusLabel: isMaintenanceActive ? 'STAFF 404 BLOCKED' : 'NORMAL LIVE ACCESS',
        accessPolicy: 'Order dispatch temporarily frozen; staff cannot update waybill status',
        targetRole: 'Logistics Staff Role',
        lastModified: formattedDate,
        updatedBy: updatedBy || 'Admin',
      },
      {
        id: 'srv-04',
        code: 'SYS-MKT-004',
        name: 'Marketing Promotions & Campaigns',
        description: 'Promotional discount banners, product catalog bundles, email marketing broadcast',
        category: 'Internal Operations',
        scopeType: 'staff',
        isLocked: isMaintenanceActive,
        statusLabel: isMaintenanceActive ? 'STAFF 404 BLOCKED' : 'NORMAL LIVE ACCESS',
        accessPolicy: 'Customer vouchers and broadcast campaign triggers paused',
        targetRole: 'Marketing Staff Role',
        lastModified: formattedDate,
        updatedBy: updatedBy || 'Admin',
      },
      {
        id: 'srv-05',
        code: 'SYS-CORE-005',
        name: 'Admin Backoffice & Security Core',
        description: 'User access credentials, formula authorizations, audit log monitoring, cloud backup',
        category: 'Executive Core',
        scopeType: 'admin',
        isLocked: false,
        statusLabel: 'UNRESTRICTED (EXEMPTED)',
        accessPolicy: 'Always accessible to Administrators for emergency repair & database management',
        targetRole: 'Administrator Role',
        lastModified: formattedDate,
        updatedBy: updatedBy || 'Admin',
      },
    ];
  }, [isMaintenanceActive, formattedDate, updatedBy]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return systemServices.filter((item) => {
      if (statusFilter === 'locked' && !item.isLocked) return false;
      if (statusFilter === 'live' && item.isLocked) return false;

      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        return matchCode || matchName || matchDesc || matchCat;
      }
      return true;
    });
  }, [systemServices, statusFilter, categoryFilter, searchQuery]);

  // Paginated Rows
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(start, start + itemsPerPage);
  }, [filteredServices, currentPage, itemsPerPage]);

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE - MATCHES INVENTORY RAW MAT) */}
      <div className="w-full bg-white border border-slate-100 text-slate-600 rounded-2xl p-3 sm:p-6 shadow-sm flex flex-col gap-4 sm:gap-6 transition-colors duration-200">
        
        {/* COMPACT EXCEL RIBBON TOOLBAR */}
        <div className="w-full bg-white flex flex-col">
          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0">
            <div className="flex items-center gap-1 -mb-px">
              <button
                type="button"
                className="px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg"
              >
                <Layers className="w-3.5 h-3.5 text-[#01390f]" />
                <span>All System Services (5)</span>
              </button>
            </div>
          </div>

          {/* MS EXCEL-STYLE RIBBON TOOLBAR */}
          <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
            {/* GROUP 1: ACTIONS RIBBON */}
            <div className="w-full lg:w-[256px] shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]">
              <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
                {/* Tall Action Button: Toggle Shutdown */}
                <button
                  type="button"
                  disabled={saving || loading}
                  onClick={() => handleInitiateToggle(!isMaintenanceActive)}
                  className={`w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md transition-colors cursor-pointer group text-white shadow-xs disabled:opacity-60 ${
                    isMaintenanceActive
                      ? 'bg-[#01390f] hover:bg-[#0a5219]'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                  title={
                    isMaintenanceActive
                      ? 'Deactivate maintenance and restore public access'
                      : 'Activate system shutdown and lockout non-admin users'
                  }
                >
                  <Power
                    className={`w-5.5 h-5.5 text-white group-hover:scale-110 transition-transform mb-0.5 ${
                      saving ? 'animate-spin' : ''
                    }`}
                    strokeWidth={2.5}
                  />
                  <span className="text-[11px] font-bold text-center leading-tight">
                    {isMaintenanceActive ? 'Restore\nLive' : 'Activate\nShutdown'}
                  </span>
                </button>

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                  {/* Layer 1: Edit Advisory Notice */}
                  <button
                    type="button"
                    onClick={() => setIsEditMessageModalOpen(true)}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Edit Maintenance Advisory Announcement"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#01390f] shrink-0" />
                    <span className="whitespace-nowrap truncate">Advisory Notice</span>
                  </button>

                  {/* Layer 2: Preview 404 Screen */}
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Preview 404 Maintenance Screen"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap truncate">Preview 404</span>
                  </button>

                  {/* Layer 3: Toggle Role Matrix Cards */}
                  <button
                    type="button"
                    onClick={() => setShowRoleMatrix(!showRoleMatrix)}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Toggle Role Access Matrix Cards"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap truncate">
                      {showRoleMatrix ? 'Hide Role Matrix' : 'Show Role Matrix'}
                    </span>
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
                    placeholder="Search Portal Service, Code, Category, or Target Role..."
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
                    <Activity className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                    >
                      <option value="All">All Operational States ({systemServices.length})</option>
                      <option value="locked">🔴 404 Lockout Active ({isMaintenanceActive ? 4 : 0})</option>
                      <option value="live">🟢 Live Normal Access ({isMaintenanceActive ? 1 : 5})</option>
                    </select>
                  </div>

                  {/* Category Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Layers className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                    >
                      <option value="All">All Service Categories</option>
                      <option value="Public Storefront">Public Storefront</option>
                      <option value="Internal Operations">Internal Operations</option>
                      <option value="Executive Core">Executive Core</option>
                    </select>
                  </div>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={fetchMaintenanceStatus}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 px-2 py-1 sm:py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[30px] sm:h-[22px] w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs sm:col-span-2 md:col-span-1"
                    title="Refresh server status"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-[#01390f]' : ''}`}
                    />
                    <span className="whitespace-nowrap">Refresh Server State</span>
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

        {/* ROLE MATRIX SUMMARY (TOGGLEABLE) */}
        {showRoleMatrix && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 animate-in fade-in duration-200">
            {/* Admin */}
            <div className="p-3.5 rounded-lg border border-emerald-200/80 bg-white flex flex-col gap-1 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Administrator Role</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  EXEMPTED
                </span>
              </div>
              <span className="text-[11px] text-slate-500 leading-relaxed">
                May buong access kahit naka-shutdown ang system para sa maintenance.
              </span>
            </div>

            {/* Staff */}
            <div
              className={`p-3.5 rounded-lg border flex flex-col gap-1 shadow-2xs ${
                isMaintenanceActive ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Staff Roles (Inv / Log / Mkt)</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isMaintenanceActive
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {isMaintenanceActive ? '404 BLOCKED' : 'ACTIVE LIVE'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 leading-relaxed">
                {isMaintenanceActive
                  ? 'Makikita ang 404 maintenance screen; transaction updates frozen.'
                  : 'Normal na operasyon sa mga inventory, sales, at campaign portals.'}
              </span>
            </div>

            {/* Customers */}
            <div
              className={`p-3.5 rounded-lg border flex flex-col gap-1 shadow-2xs ${
                isMaintenanceActive ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Storefront Customers</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isMaintenanceActive
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {isMaintenanceActive ? '404 BLOCKED' : 'ACTIVE LIVE'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 leading-relaxed">
                {isMaintenanceActive
                  ? 'Makikita ang customer 404 Scheduled Maintenance Screen.'
                  : 'Normal na pag-browse sa online store, shopping cart, at PayMongo checkout.'}
              </span>
            </div>
          </div>
        )}

        {/* CLEAN SEPARATOR BEFORE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* 3. TABLE MASTERLIST (MATCHING INVENTORY RAW MAT TABLE) */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* TABLE PAGINATION */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredServices.length}
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
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">SERVICE CATEGORY</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px] font-semibold text-white">PORTAL / SERVICE NAME</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">OPERATIONAL STATE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px] font-semibold text-white">ACCESS POLICY DURING MAINTENANCE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">LAST UPDATED</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Fetching system maintenance policies...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedServices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Power className="w-6 h-6 text-slate-300" />
                        <span>No system maintenance policies matched your search criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedServices.map((item) => (
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

                      {/* 3. PORTAL / SERVICE NAME */}
                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-bold text-xs text-slate-800 transition-colors">
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="text-[11px] font-normal text-slate-500 max-w-sm truncate">
                            {item.description}
                          </span>
                        </div>
                      </td>

                      {/* 4. OPERATIONAL STATE (Blue cell tint matching Raw Materials Quantity/Condition) */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap bg-blue-600/25 group-hover:bg-blue-600/40 transition-colors">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {item.targetRole}
                          </span>
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.isLocked
                                ? 'bg-rose-50 text-rose-700 border-rose-200/70 font-semibold'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200/70 font-semibold'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                item.isLocked ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                              }`}
                            />
                            {item.statusLabel}
                          </span>
                        </div>
                      </td>

                      {/* 5. ACCESS POLICY */}
                      <td className="px-4 py-3.5 max-w-[280px] truncate bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] text-xs text-slate-600 transition-colors">
                        <span title={item.accessPolicy}>{item.accessPolicy}</span>
                      </td>

                      {/* 6. LAST UPDATED */}
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
                            onClick={() => setIsEditMessageModalOpen(true)}
                            title="Edit Advisory Broadcast"
                            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          {item.scopeType !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleInitiateToggle(!isMaintenanceActive)}
                              title={isMaintenanceActive ? 'Restore System Live' : 'Activate Shutdown'}
                              className={`w-8 h-8 rounded-full bg-white border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                isMaintenanceActive
                                  ? 'border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'
                                  : 'border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* CONFIRMATION DIALOG FOR TOGGLING SHUTDOWN */}
      {isConfirmDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200">
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

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmDialogOpen(false)}
                className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#d5ead7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={saving}
                className={`px-6 py-2.5 rounded-full ${
                  pendingToggleValue ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#01390f] hover:bg-[#0a5219]'
                } text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{pendingToggleValue ? 'Confirm Shutdown' : 'Restore Live Access'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ADVISORY ANNOUNCEMENT MODAL */}
      {isEditMessageModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => !saving && setIsEditMessageModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 text-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#EDF7EE] text-[#01390f] flex items-center justify-center border border-[#d5ead7]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Edit Advisory Announcement
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lalabas sa 404 screen ng mga naka-lockout na staff at storefront visitors.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditMessageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMessage} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Advisory Broadcast Message
                </label>
                <textarea
                  rows={4}
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Halimbawa: Scheduled system update and database ledger maintenance are underway. Transactions are temporarily frozen."
                  className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#01390f] transition-all"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditMessageModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#d5ead7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Save Announcement</span>
                </button>
              </div>
            </form>
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
              message={maintenanceMessage || 'Scheduled system update and database ledger maintenance are underway.'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSystemMaintenance;
