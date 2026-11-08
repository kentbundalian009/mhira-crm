import React, { useState, useEffect, useMemo } from 'react';
import { useLiveSync, notifyLiveSync } from '../utils/liveSync';
import {
  Shield,
  User,
  Search,
  Filter,
  Mail,
  Edit2,
  Trash2,
  UserPlus,
  X,
  Loader2,
  Users,
  CheckCircle2,
  Key,
  ShieldCheck,
  Plus,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  RefreshCw,
  ArrowUpDown,
  Archive,
  AlertTriangle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios, { API } from '../axios';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TypeableDropdown from './common/TypeableDropdown';
import TablePagination from './common/TablePagination';

function AdminUserManagement() {
  const [users, setUsers] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_admin_users');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archived'
  const [archiveTargetUser, setArchiveTargetUser] = useState(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const activeCount = useMemo(
    () => (Array.isArray(users) ? users.filter((u) => !u.isArchived).length : 0),
    [users]
  );
  const archivedCount = useMemo(
    () => (Array.isArray(users) ? users.filter((u) => Boolean(u.isArchived)).length : 0),
    [users]
  );

  const filteredUsers = useMemo(() => {
    let list = Array.isArray(users) ? [...users] : [];

    // Filter by viewMode: Active vs Archive Vault
    if (viewMode === 'archived') {
      list = list.filter((u) => Boolean(u.isArchived));
    } else {
      list = list.filter((u) => !u.isArchived);
    }

    if (roleFilter === 'Staff') {
      list = list.filter((u) => u.role !== 'Customer');
    } else if (roleFilter !== 'All') {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((u) =>
        (u.empNo || u.customerNo || u.emp_no || '').toLowerCase().includes(q) ||
        (u.fullName || u.fullname || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.fullName || a.fullname || '').localeCompare(b.fullName || b.fullname || ''));
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => (b.fullName || b.fullname || '').localeCompare(a.fullName || a.fullname || ''));
    } else if (sortBy === 'role_asc') {
      list.sort((a, b) => (a.role || '').localeCompare(b.role || ''));
    }
    return list;
  }, [users, viewMode, roleFilter, searchQuery, sortBy]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (roleFilter !== 'All') count++;
    if (sortBy !== 'default') count++;
    return count;
  }, [searchQuery, roleFilter, sortBy]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setRoleFilter('All');
    setSortBy('default');
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
      doc.text('MHIRA NATURAL - USER ACCOUNTS MASTER DIRECTORY', 14, 11);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on ${new Date().toLocaleDateString()} | Total Accounts: ${filteredUsers.length}`, 14, 18);

      const tableHead = [['#', 'Account ID', 'Full Name', 'Username', 'Email Address', 'Department Role', 'Status']];
      const tableBody = filteredUsers.map((u, idx) => [
        idx + 1,
        u.empNo || u.customerNo || u.emp_no || 'N/A',
        u.fullName || u.fullname || 'N/A',
        u.username || 'N/A',
        u.email || 'N/A',
        u.role || 'Inventory',
        u.isEmailVerified ? 'Verified' : 'Pending'
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

      doc.save(`User_Accounts_Masterlist_${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccessToast('Exported User Directory to PDF!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to export PDF.');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, sortBy]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    empNo: '',
    username: '',
    fullName: '',
    email: '',
    role: 'Inventory',
    password: '',
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const API_BASE_URL =
    import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com'
      : 'http://localhost:5000';

  const roleOptions = ['Admin', 'Inventory', 'Logistic', 'Marketing', 'Customer'];

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchQuery, role: roleFilter },
      }).catch(() => ({ data: [] }));
      if (Array.isArray(response.data) && response.data.length > 0) {
        setUsers(response.data);
        if (!searchQuery && roleFilter === 'All') {
          try {
            localStorage.setItem('cached_admin_users', JSON.stringify(response.data));
          } catch (e) {}
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  useLiveSync(['users', 'admin'], () => {
    fetchUsers();
  });

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchUsers();
  };

  const handleInputChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditingUser({ ...editingUser, [e.target.name]: e.target.value });
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/users`, newUser, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const msg =
        newUser.role !== 'Customer'
          ? 'Staff account created! Login credentials sent to email.'
          : 'User account created! Account details sent to email.';
      showSuccessToast(msg);

      setNewUser({
        empNo: '',
        username: '',
        fullName: '',
        email: '',
        role: 'Inventory',
        password: '',
      });
      setIsModalOpen(false);
      fetchUsers();
      notifyLiveSync('users');
    } catch (error) {
      console.error('Error adding user:', error);
      showErrorToast(error.response?.data?.message || 'Failed to add user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (user) => {
    setEditingUser({
      _id: user._id || user.id,
      empNo: user.customerNo || user.empNo || user.emp_no || '',
      username: user.username || user.Username || '',
      fullName: user.fullName || user.fullname || '',
      email: user.email || '',
      role: user.role || user.SystemRole || 'Inventory',
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/users/${editingUser._id}`, editingUser, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
      notifyLiveSync('users');
      showSuccessToast('User account updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      showErrorToast(error.response?.data?.message || 'Failed to update user.');
    } finally {
      setSubmitting(false);
    }
  };

  const executeToggleArchive = async () => {
    if (!archiveTargetUser) return;
    try {
      setIsProcessingAction(true);
      const token = localStorage.getItem('token');
      const id = archiveTargetUser._id || archiveTargetUser.id;
      const isCurrentlyArchived = Boolean(archiveTargetUser.isArchived);

      await axios.put(`${API_BASE_URL}/api/users/${id}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showSuccessToast(
        isCurrentlyArchived
          ? `User "${archiveTargetUser.fullName || archiveTargetUser.username}" restored to active accounts!`
          : `User "${archiveTargetUser.fullName || archiveTargetUser.username}" moved to Archive Vault.`
      );

      setArchiveTargetUser(null);
      fetchUsers();
      notifyLiveSync('users');
    } catch (error) {
      console.error('Error toggling user archive:', error);
      showErrorToast(error.response?.data?.message || 'Failed to update user archive status.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const executePermanentDelete = async () => {
    if (!deleteTargetUser) return;
    try {
      setIsProcessingAction(true);
      const token = localStorage.getItem('token');
      const id = deleteTargetUser._id || deleteTargetUser.id;

      await axios.delete(`${API_BASE_URL}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showSuccessToast(`User "${deleteTargetUser.fullName || deleteTargetUser.username}" permanently deleted.`);
      setDeleteTargetUser(null);
      fetchUsers();
      notifyLiveSync('users');
    } catch (error) {
      console.error('Error deleting user:', error);
      showErrorToast(error.response?.data?.message || 'Failed to delete user.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSendVerificationCode = async (userEmail, userName) => {
    if (!userEmail) return showErrorToast('User has no valid email address.');
    try {
      showSuccessToast('Sending verification code...');
      await axios.post(`${API_BASE_URL}/api/users/send-verification`, {
        email: userEmail,
        fullName: userName,
      });
      showSuccessToast(`Verification code dispatched to ${userEmail}!`);
    } catch (err) {
      console.error('Error sending verification code:', err);
      showErrorToast(err.response?.data?.message || 'Failed to dispatch verification code.');
    }
  };

  const handleSendVerificationLink = async (userEmail, userName) => {
    if (!userEmail) return showErrorToast('User has no valid email address.');
    try {
      showSuccessToast('Sending verification link to email...');
      await axios.post(`${API_BASE_URL}/api/users/send-verification-link`, {
        email: userEmail,
        fullName: userName,
      });
      showSuccessToast(`Verification link sent to ${userEmail}!`);
    } catch (err) {
      console.error('Error sending verification link:', err);
      showErrorToast(err.response?.data?.message || 'Failed to send verification link.');
    }
  };

  const handlePromptVerifyCode = async (userEmail) => {
    const inputCode = window.prompt(`Enter the 6-digit verification code sent to ${userEmail}:`);
    if (!inputCode || !inputCode.trim()) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/verify-code`, {
        email: userEmail,
        code: inputCode.trim(),
      });
      if (res.data?.success) {
        showSuccessToast('Staff email successfully verified!');
        fetchUsers();
      } else {
        showErrorToast(res.data?.message || 'Invalid code.');
      }
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Verification failed.');
    }
  };

  const statusModules = useMemo(() => [
    { id: 'active', label: 'Active Users' },
    { id: 'archived', label: 'Archive Vault' },
  ], []);

  const currentModeUsers = useMemo(() => {
    return Array.isArray(users)
      ? users.filter((u) => (viewMode === 'archived' ? Boolean(u.isArchived) : !u.isArchived))
      : [];
  }, [users, viewMode]);

  // Metrics (Live counts based on current mode)
  const adminCount = useMemo(
    () => currentModeUsers.filter((u) => u.role === 'Admin').length,
    [currentModeUsers]
  );
  const deptCount = useMemo(
    () => currentModeUsers.filter((u) => u.role !== 'Admin' && u.role !== 'Customer').length,
    [currentModeUsers]
  );
  const customerCount = useMemo(
    () => currentModeUsers.filter((u) => u.role === 'Customer').length,
    [currentModeUsers]
  );

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'Customer':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Admin':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Inventory':
        return 'bg-emerald-50 text-[#01390f] border-emerald-200';
      case 'Logistic':
      case 'Logistics':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'Marketing':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700">
      <div className="w-full bg-white border border-slate-100 text-slate-600 rounded-2xl p-3 sm:p-6 shadow-sm flex flex-col gap-4 sm:gap-6 transition-colors duration-200">
        
        {/* COMPACT EXCEL RIBBON TOOLBAR (RESPONSIVE SEAMLESS DESIGN) */}
        <div className="w-full bg-white flex flex-col">
          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0">
            <div className="flex items-center gap-1 -mb-px">
              {statusModules.map((mod) => {
                const isActive = viewMode === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setViewMode(mod.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${isActive
                      ? 'border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg'
                      }`}
                  >
                    {mod.id === 'active' ? (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#01390f]" />
                    ) : (
                      <Archive className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{mod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (RESPONSIVE: STACKS ON MOBILE, 1 ROW ON DESKTOP) */}
          <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
            
            {/* GROUP 1: ACTIONS (Responsive: Full-width on mobile, fixed width on desktop) */}
            <div className={`w-full ${viewMode === 'archived' ? 'lg:w-[140px]' : 'lg:w-[256px]'} shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]`}>
              <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
                {/* 1 COLUMN NA 1 LAYER: Tall Full-Height Action Button */}
                {viewMode !== 'archived' ? (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                    title="Create User Account"
                  >
                    <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                      Add User<br />Account
                    </span>
                  </button>
                ) : (
                  <div className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-amber-50/70 border border-amber-200/80 text-amber-800 select-none">
                    <Archive className="w-5.5 h-5.5 text-amber-700 mb-0.5" strokeWidth={2} />
                    <span className="text-[10px] font-bold text-center leading-tight">
                      Archive<br />Vault
                    </span>
                  </div>
                )}

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                  {/* Layer 1: Refresh Directory */}
                  <button
                    type="button"
                    onClick={fetchUsers}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Refresh user records"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap">Refresh List</span>
                  </button>

                  {/* Layer 2: Export PDF */}
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Export User Directory to PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="whitespace-nowrap">Export PDF</span>
                  </button>

                  {/* Layer 3: Reset Filters */}
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    disabled={activeFiltersCount === 0}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
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
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
                Actions
              </div>
            </div>

            {/* GROUP 2: SEARCH & FILTERS (Responsive Multi-Column Grid) */}
            <div className="flex flex-col justify-between flex-1 min-h-0 lg:min-h-[92px] lg:pl-1">
              <div className="flex flex-col justify-between flex-1 py-0.5 space-y-2 lg:space-y-1">
                {/* Layer 1: Search Bar (Enhanced Height) */}
                <div className="relative flex items-center w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by Employee/Customer No, Name, Username, or Email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    title="Search by Employee/Customer No, Name, Username, or Email..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Layer 2: Filter Dropdowns (Responsive: 1 col on mobile, 3 cols on sm+) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                  {/* Role Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Shield className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Filter by Role"
                    >
                      <option value="All">All User Roles ({currentModeUsers.length})</option>
                      <option value="Staff">All Staff Roles ({deptCount + adminCount})</option>
                      <option value="Customer">Customer Accounts ({customerCount})</option>
                      <option value="Admin">Admin Department ({adminCount})</option>
                      <option value="Inventory">Inventory Department</option>
                      <option value="Logistic">Logistic Department</option>
                      <option value="Marketing">Marketing Department</option>
                    </select>
                  </div>

                  {/* Account Type Filter */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Users className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={roleFilter === 'Staff' ? 'Staff' : roleFilter === 'Customer' ? 'Customer' : 'All'}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Filter Account Type"
                    >
                      <option value="All">All Account Types</option>
                      <option value="Staff">Staff Members Only</option>
                      <option value="Customer">Customers Only</option>
                    </select>
                  </div>

                  {/* Sort Select */}
                  <div className="relative inline-flex items-center w-full min-w-0 sm:col-span-2 md:col-span-1">
                    <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Sort users"
                    >
                      <option value="default">Sort: Default</option>
                      <option value="name_asc">Name (A → Z)</option>
                      <option value="name_desc">Name (Z → A)</option>
                      <option value="role_asc">Role (A → Z)</option>
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>

                {/* Layer 3: Quick Filter Toggles & Sort (Responsive: 1 col on mobile, 3 cols on sm+) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                  {/* Staff Only Toggle */}
                  <button
                    type="button"
                    onClick={() => setRoleFilter(roleFilter === 'Staff' ? 'All' : 'Staff')}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 sm:py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[30px] sm:h-[22px] w-full shadow-2xs ${
                      roleFilter === 'Staff'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>Staff Only {deptCount + adminCount > 0 ? `(${deptCount + adminCount})` : ''}</span>
                  </button>

                  {/* Customer Only Toggle */}
                  <button
                    type="button"
                    onClick={() => setRoleFilter(roleFilter === 'Customer' ? 'All' : 'Customer')}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 sm:py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[30px] sm:h-[22px] w-full shadow-2xs ${
                      roleFilter === 'Customer'
                        ? 'bg-sky-50 text-sky-800 border border-sky-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Customers Only {customerCount > 0 ? `(${customerCount})` : ''}</span>
                  </button>

                  {/* Admin Only Toggle */}
                  <button
                    type="button"
                    onClick={() => setRoleFilter(roleFilter === 'Admin' ? 'All' : 'Admin')}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 sm:py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[30px] sm:h-[22px] w-full shadow-2xs ${
                      roleFilter === 'Admin'
                        ? 'bg-purple-50 text-purple-800 border border-purple-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>Admin ({adminCount})</span>
                  </button>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-1 select-none hidden lg:block">
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
            totalItems={filteredUsers.length}
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
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px] font-semibold text-white">NAME & USERNAME</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">EMP NO / CUSTOMER NO</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">EMAIL ADDRESS</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">ROLE / DEPARTMENT</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">ACCESS STATUS</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">REGISTERED DATE</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">ACTION</th>
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
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading user accounts...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      {viewMode === 'archived'
                        ? 'No archived user accounts in the vault.'
                        : 'No user accounts found matching your filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr
                      key={user._id || user.id}
                      className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm"
                    >
                      {/* FULL NAME & USERNAME */}
                      <td className="py-3.5 px-4 whitespace-nowrap min-w-[200px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-2xs flex items-center justify-center bg-[#01390f] text-white text-xs font-bold">
                            {user.profileImage || user.ProfileImage ? (
                              <img
                                src={
                                  (user.profileImage || user.ProfileImage).startsWith('http') ||
                                  (user.profileImage || user.ProfileImage).startsWith('data:') ||
                                  (user.profileImage || user.ProfileImage).startsWith('blob:')
                                    ? user.profileImage || user.ProfileImage
                                    : `${API_BASE_URL}${user.profileImage || user.ProfileImage}`
                                }
                                alt={user.fullName || user.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>
                                {(user.fullName || user.fullname || user.username || 'U')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {user.fullName || user.fullname || user.username}
                            </span>
                            <span className="text-slate-400 text-xs font-normal">
                              @{user.username || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* EMP NO / CUSTOMER NO */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-900 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        {user.customerNo || user.empNo || user.emp_no || 'N/A'}
                      </td>

                      {/* EMAIL */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        {user.email || 'N/A'}
                      </td>

                      {/* ROLE */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                            user.role === 'Admin'
                              ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                              : user.role === 'Inventory'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                              : user.role === 'Logistics' || user.role === 'Logistic'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200/70'
                              : user.role === 'Marketing'
                              ? 'bg-amber-50 text-amber-700 border-amber-200/70'
                              : user.role === 'Customer'
                              ? 'bg-teal-50 text-teal-700 border-teal-200/70'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {user.role || 'Staff'}
                        </span>
                      </td>

                      {/* ACCESS STATUS & EMAIL SECURITY */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <div className="flex flex-col items-center gap-1">
                          {user.isArchived ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200/80">
                              <Archive className="w-3 h-3 text-amber-600" />
                              <span>Archived</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Active</span>
                            </span>
                          )}

                          {user.isEmailVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                            </span>
                          ) : user.role === 'Customer' ? (
                            <button
                              type="button"
                              onClick={() => handleSendVerificationLink(user.email, user.fullName || user.username)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Send email verification link to customer"
                            >
                              <Mail className="w-2.5 h-2.5" /> Send Verification Link
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSendVerificationLink(user.email, user.fullName || user.username)}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Send verification link to staff email"
                              >
                                <Mail className="w-2.5 h-2.5" /> Send Link
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePromptVerifyCode(user.email)}
                                className="inline-flex items-center text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-1.5 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Enter 6-digit code provided by staff"
                              >
                                Verify
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* REGISTERED DATE */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-500 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        {new Date(
                          user.createdAt || user.dateAdded || Date.now()
                        ).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* ACTION (STICKY RIGHT) */}
                      <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px] transition-colors">
                        <div className="flex items-center justify-center gap-1.5">
                          {viewMode !== 'archived' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(user)}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Edit User Account"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setArchiveTargetUser(user)}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-amber-600 hover:bg-amber-600 hover:text-white hover:border-amber-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Move to Archive Vault"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setArchiveTargetUser(user)}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-[#01390f] hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Restore User to Active"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTargetUser(user)}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Permanently Delete Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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

      {/* MODAL 1: ADD NEW USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                Create New User / Staff Account
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      {newUser.role === 'Customer' ? 'Customer No. (Auto-generated)' : 'Employee No. *'}
                    </label>
                    <input
                      type="text"
                      name="empNo"
                      required={newUser.role !== 'Customer'}
                      placeholder={newUser.role === 'Customer' ? 'Auto-generated (e.g. CTM-000001)' : 'e.g. EMP-2026-001'}
                      value={newUser.empNo}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      User / Department Role *
                    </label>
                    <TypeableDropdown
                      name="role"
                      value={newUser.role}
                      onChange={handleInputChange}
                      options={roleOptions}
                      placeholder="Select Role..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="e.g. Maria Santos"
                    value={newUser.fullName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      placeholder="e.g. msantos"
                      value={newUser.username}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="e.g. maria@mhira.ph"
                      value={newUser.email}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-600 whitespace-nowrap text-xs sm:text-sm">
                      Password
                    </label>
                    <span className="text-[11px] font-medium text-slate-400">
                      (Auto-generated & emailed if blank)
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="password"
                      placeholder="Leave blank to auto-generate..."
                      value={newUser.password}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                        let rand = 'Mhira@';
                        for (let i = 0; i < 6; i++) {
                          rand += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        setNewUser((prev) => ({ ...prev, password: rand }));
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold bg-[#01390f]/10 text-[#01390f] hover:bg-[#01390f] hover:text-white rounded-lg transition-all"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{submitting ? 'Creating...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                Edit Account: {editingUser.fullName || editingUser.username}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      {editingUser.role === 'Customer' ? 'Customer No.' : 'Employee No.'}
                    </label>
                    <input
                      type="text"
                      name="empNo"
                      value={editingUser.empNo || ''}
                      onChange={handleEditInputChange}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      Role / Department
                    </label>
                    <TypeableDropdown
                      name="role"
                      value={editingUser.role}
                      onChange={handleEditInputChange}
                      options={roleOptions}
                      placeholder="Select Role..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={editingUser.fullName}
                    onChange={handleEditInputChange}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={editingUser.username}
                      onChange={handleEditInputChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={editingUser.email}
                      onChange={handleEditInputChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Reset Password{' '}
                    <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter new password if updating..."
                    value={editingUser.password}
                    onChange={handleEditInputChange}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ARCHIVE / RESTORE USER CONFIRMATION */}
      {archiveTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/80 flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                {archiveTargetUser.isArchived ? (
                  <RotateCcw className="w-4 h-4 text-[#01390f]" />
                ) : (
                  <Archive className="w-4 h-4 text-amber-600" />
                )}
                <span>
                  {archiveTargetUser.isArchived ? 'Restore User Account' : 'Move User to Archive Vault'}
                </span>
              </h3>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setArchiveTargetUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 flex flex-col gap-4">
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 ${
                  archiveTargetUser.isArchived
                    ? 'bg-[#EDF7EE] border-[#D5EAD7] text-[#01390f]'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider mb-0.5">
                    {archiveTargetUser.isArchived ? 'Active Directory Restoration' : 'Archive Vault Safety'}
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {archiveTargetUser.isArchived
                      ? 'Restoring this user will return their account to active directory and permit login access again.'
                      : 'Archiving hides this user from the active directory and revokes login access, while safely preserving their order history, audit trails, and data.'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  Are you sure you want to{' '}
                  {archiveTargetUser.isArchived
                    ? 'restore this user account'
                    : 'move this user account to the archive vault'}
                  ?
                </p>
                <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {archiveTargetUser.fullName || archiveTargetUser.fullname || archiveTargetUser.username}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                      {archiveTargetUser.role || 'Staff'}
                    </span>
                  </div>
                  <div className="flex flex-col text-[11px] text-slate-500 font-mono gap-0.5">
                    <span>Username: @{archiveTargetUser.username}</span>
                    <span>Email: {archiveTargetUser.email}</span>
                    <span>ID: {archiveTargetUser.customerNo || archiveTargetUser.empNo || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setArchiveTargetUser(null)}
                className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer text-center border border-[#d5ead7] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={executeToggleArchive}
                className="px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : archiveTargetUser.isArchived ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                <span>
                  {isProcessingAction
                    ? 'Processing...'
                    : archiveTargetUser.isArchived
                    ? 'Confirm Restore'
                    : 'Confirm Archive'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERMANENT DELETE USER CONFIRMATION (IN ARCHIVE VAULT) */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-rose-200 flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/70 shrink-0">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Permanently Delete User</span>
              </h3>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setDeleteTargetUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 flex flex-col gap-4">
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-0.5">
                    Permanent Irreversible Deletion
                  </span>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    This user account will be permanently erased from the system database. This action CANNOT be undone.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  Are you absolutely sure you want to delete this account forever?
                </p>
                <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {deleteTargetUser.fullName || deleteTargetUser.fullname || deleteTargetUser.username}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">
                      {deleteTargetUser.role || 'User'}
                    </span>
                  </div>
                  <div className="flex flex-col text-[11px] text-slate-500 font-mono gap-0.5">
                    <span>Username: @{deleteTargetUser.username}</span>
                    <span>Email: {deleteTargetUser.email}</span>
                    <span>ID: {deleteTargetUser.customerNo || deleteTargetUser.empNo || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setDeleteTargetUser(null)}
                className="px-5 py-2.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer text-center disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={executePermanentDelete}
                className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isProcessingAction ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserManagement;