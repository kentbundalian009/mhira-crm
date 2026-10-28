import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Shield,
  User,
  Search,
  Filter,
  RefreshCw,
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Layers,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  X,
  ArrowUpDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios, { API } from '../axios';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';

function AdminUserActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [opFilter, setOpFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  const filteredActivities = useMemo(() => {
    const safeList = Array.isArray(activities) ? activities : [];
    return safeList.filter((item) => {
      if (roleFilter === 'Staff' && item.role === 'Customer') return false;
      if (roleFilter !== 'All' && roleFilter !== 'Staff' && item.role !== roleFilter) return false;

      if (opFilter !== 'All') {
        const op = (item.operation || item.action || '').toUpperCase();
        if (opFilter === 'CREATE' && !op.includes('CREATE') && !op.includes('ADD') && !op.includes('INSERT')) return false;
        if (opFilter === 'UPDATE' && !op.includes('UPDATE') && !op.includes('EDIT') && !op.includes('MODIFY')) return false;
        if (opFilter === 'DELETE' && !op.includes('DELETE') && !op.includes('REMOVE') && !op.includes('CANCEL')) return false;
        if (opFilter === 'AUTH' && !op.includes('LOGIN') && !op.includes('AUTH')) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const user = (item.username || item.user || '').toLowerCase();
        const role = (item.role || '').toLowerCase();
        const mod = (item.module || '').toLowerCase();
        const detail = (item.details || item.detail || item.action || '').toLowerCase();
        if (!user.includes(q) && !role.includes(q) && !mod.includes(q) && !detail.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [activities, roleFilter, opFilter, searchQuery, sortBy]);

  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredActivities.slice(start, start + itemsPerPage);
  }, [filteredActivities, currentPage, itemsPerPage]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (roleFilter !== 'All') count++;
    if (opFilter !== 'All') count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [searchQuery, roleFilter, opFilter, sortBy]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setRoleFilter('All');
    setOpFilter('All');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 297, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - SECURITY AUDIT & USER ACTIVITY LOGS', 14, 11);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on ${new Date().toLocaleDateString()} | Total Logs: ${filteredActivities.length}`, 14, 18);

      const tableHead = [['#', 'Staff User', 'Role', 'Module', 'Operation', 'Action Log Detail', 'Timestamp']];
      const tableBody = filteredActivities.map((it, idx) => [
        idx + 1,
        it.username || it.user || 'System',
        it.role || 'Staff',
        it.module || 'System',
        it.operation || it.action || 'ACTION',
        it.details || it.detail || it.action || 'N/A',
        new Date(it.timestamp || it.createdAt || Date.now()).toLocaleString()
      ]);

      autoTable(doc, {
        startY: 30,
        head: tableHead,
        body: tableBody,
        headStyles: { fillColor: [1, 57, 15], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
        styles: { cellPadding: 2.2 }
      });

      doc.save(`Activity_Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccessToast('Exported Activity Logs to PDF!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to export PDF.');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, opFilter, sortBy]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const API_BASE_URL =
        import.meta.env.MODE === 'production'
          ? 'https://mhira-crmsystem.onrender.com'
          : 'http://localhost:5000';

      const response = await axios.get(`${API_BASE_URL}/api/activity-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50, search: searchQuery, role: roleFilter },
      });

      const resData = response.data;
      const safeArray = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.logs)
        ? resData.logs
        : Array.isArray(resData?.activities)
        ? resData.activities
        : [];

      setActivities(safeArray);
    } catch (error) {
      console.error('Error loading activity logs:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchLogs();
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Inventory':
        return 'bg-emerald-50 text-[#01390f] border-emerald-200';
      case 'Logistic':
      case 'Logistics':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'Marketing':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Customer':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getOperationBadge = (op) => {
    const operation = (op || '').toUpperCase();
    if (operation.includes('CREATE') || operation.includes('ADD') || operation.includes('INSERT')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (operation.includes('UPDATE') || operation.includes('EDIT') || operation.includes('MODIFY')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (operation.includes('DELETE') || operation.includes('REMOVE') || operation.includes('CANCEL')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (operation.includes('LOGIN') || operation.includes('AUTH')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700">
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">
        
        {/* COMPACT EXCEL RIBBON TOOLBAR (SEAMLESS WHITE DESIGN) */}
        <div className="w-full bg-white flex flex-col">
          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
            <div className="flex items-center gap-1 -mb-px">
              {[
                { id: 'All', label: 'All Activity Logs' },
                { id: 'Staff', label: 'Staff Operations' },
                { id: 'Admin', label: 'Admin Security' },
              ].map((mod) => {
                const isActive = (roleFilter === 'All' && mod.id === 'All') || (roleFilter === 'Staff' && mod.id === 'Staff') || (roleFilter === 'Admin' && mod.id === 'Admin');
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setRoleFilter(mod.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
                      isActive
                        ? 'border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg'
                    }`}
                  >
                    {mod.id === 'Admin' ? (
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                    ) : mod.id === 'Staff' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#01390f]" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-[#01390f]" />
                    )}
                    <span>{mod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (CLEAN WHITE BACKGROUND - 1 ROW NO WRAPPING) */}
          <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
            
            {/* GROUP 1: ACTIONS (Fixed Width: Tall Full-Height + Stacked Layers) */}
            <div className="w-[256px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
              <div className="flex items-stretch gap-1.5 flex-1">
                {/* 1 COLUMN NA 1 LAYER: Tall Full-Height Action Button */}
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={loading}
                  className="w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f] disabled:opacity-50"
                  title="Refresh audit feed"
                >
                  <RefreshCw className={`w-5.5 h-5.5 text-[#01390f] ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'} mb-0.5`} strokeWidth={2.5} />
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    Refresh<br />Feed
                  </span>
                </button>

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-[145px] flex flex-col justify-between py-0.5 space-y-0.5">
                  {/* Layer 1: Export PDF */}
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                    title="Export Activity Audit Report to PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate">Export PDF</span>
                  </button>

                  {/* Layer 2: Reset Filters */}
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    disabled={activeFiltersCount === 0}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                    title={activeFiltersCount > 0 ? `Reset active filters (${activeFiltersCount})` : 'No active filters'}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap">
                      Reset Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                    </span>
                  </button>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                Actions
              </div>
            </div>

            {/* GROUP 2: SEARCH & FILTERS (Equal 3-Column Grid) */}
            <div className="flex flex-col justify-between flex-1 min-h-[92px] pl-1">
              <div className="flex flex-col justify-between flex-1 py-0.5 space-y-1">
                {/* Layer 1: Search Bar */}
                <div className="relative flex items-center w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by User, Module, Action Detail, or Date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    title="Search by User, Module, Action Detail, or Date..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Layer 2: Filter Dropdowns (Equal 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Role Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Shield className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Role"
                    >
                      <option value="All">All System Roles</option>
                      <option value="Staff">All Staff Personnel</option>
                      <option value="Admin">Admin Personnel</option>
                      <option value="Inventory">Inventory Department</option>
                      <option value="Logistic">Logistics Department</option>
                      <option value="Marketing">Marketing Department</option>
                    </select>
                  </div>

                  {/* Operation Type Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Layers className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={opFilter}
                      onChange={(e) => setOpFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter Operation Type"
                    >
                      <option value="All">All Operations</option>
                      <option value="CREATE">Create / Insert / Add</option>
                      <option value="UPDATE">Update / Edit / Modify</option>
                      <option value="DELETE">Delete / Cancel / Remove</option>
                      <option value="AUTH">Login / Authentication</option>
                    </select>
                  </div>

                  {/* Sort Select */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <ArrowUpDown className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Sort logs"
                    >
                      <option value="newest">Sort: Newest First</option>
                      <option value="oldest">Sort: Oldest First</option>
                    </select>
                  </div>
                </div>

                {/* Layer 3: Quick Filter Toggles (Equal 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Staff Only Toggle */}
                  <button
                    type="button"
                    onClick={() => setRoleFilter(roleFilter === 'Staff' ? 'All' : 'Staff')}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${
                      roleFilter === 'Staff'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>Staff Ops Only</span>
                  </button>

                  {/* Admin Only Toggle */}
                  <button
                    type="button"
                    onClick={() => setRoleFilter(roleFilter === 'Admin' ? 'All' : 'Admin')}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${
                      roleFilter === 'Admin'
                        ? 'bg-purple-50 text-purple-800 border border-purple-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>Admin Security</span>
                  </button>

                  {/* Updates Only Toggle */}
                  <button
                    type="button"
                    onClick={() => setOpFilter(opFilter === 'UPDATE' ? 'All' : 'UPDATE')}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${
                      opFilter === 'UPDATE'
                        ? 'bg-amber-50 text-amber-800 border border-amber-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                    <span>Modifications Only</span>
                  </button>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                Search & Filter
              </div>
            </div>

          </div>

        </div>

        {/* CLEAN SEPARATOR BEFORE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* TABLE MASTERLIST */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* TABLE PAGINATION */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredActivities.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setItemsPerPage(rows);
              setCurrentPage(1);
            }}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4 whitespace-nowrap">STAFF USERNAME</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">SYSTEM ROLE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">MODULE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">OPERATION</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ACTION LOG DETAIL</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">TIMESTAMP</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">DATE</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#01390f]" />
                        <span>Fetching real-time activity logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : (!Array.isArray(activities) || activities.length === 0 || !Array.isArray(paginatedActivities) || paginatedActivities.length === 0) ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      No activity logs found matching your search or filters.
                    </td>
                  </tr>
                ) : (
                  paginatedActivities.map((log, index) => {
                    const logDate = log.createdAt
                      ? new Date(log.createdAt).toLocaleDateString()
                      : log.date || 'Today';
                    const logTime = log.createdAt
                      ? new Date(log.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : log.timestamp || 'N/A';

                    return (
                      <tr
                        key={log._id || index}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                      >
                        {/* USERNAME */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#01390f]/10 text-[#01390f] font-bold text-xs flex items-center justify-center shrink-0">
                              <User size={13} />
                            </div>
                            <span>{log.username || 'System'}</span>
                          </div>
                        </td>

                        {/* ROLE */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadgeStyle(
                              log.role
                            )}`}
                          >
                            {log.role || 'Staff'}
                          </span>
                        </td>

                        {/* MODULE */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-800">
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 text-xs">
                            {log.module || 'General'}
                          </span>
                        </td>

                        {/* OPERATION */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getOperationBadge(
                              log.operation || log.action
                            )}`}
                          >
                            {log.operation || 'ACTION'}
                          </span>
                        </td>

                        {/* ACTION LOG DETAIL */}
                        <td
                          className="py-3.5 px-4 max-w-md truncate text-slate-700 font-normal"
                          title={log.action || log.description}
                        >
                          {log.action || log.description || 'System operation executed'}
                        </td>

                        {/* TIMESTAMP */}
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-500 whitespace-nowrap">
                          {logTime}
                        </td>

                        {/* DATE */}
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-600 whitespace-nowrap">
                          {logDate}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminUserActivity;