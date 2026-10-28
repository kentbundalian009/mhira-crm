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
  ArrowUpDown
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

  const filteredUsers = useMemo(() => {
    let list = Array.isArray(users) ? [...users] : [];
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
  }, [users, roleFilter, searchQuery, sortBy]);

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

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user account "${name || 'this user'}"?`))
      return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSuccessToast('User account removed successfully.');
      fetchUsers();
      notifyLiveSync('users');
    } catch (error) {
      console.error('Error deleting user:', error);
      showErrorToast(error.response?.data?.message || 'Failed to delete user.');
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

  // Metrics
  const adminCount = useMemo(
    () => users.filter((u) => u.role === 'Admin').length,
    [users]
  );
  const deptCount = useMemo(
    () => users.filter((u) => u.role !== 'Admin' && u.role !== 'Customer').length,
    [users]
  );
  const customerCount = useMemo(
    () => users.filter((u) => u.role === 'Customer').length,
    [users]
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
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">
        
        {/* COMPACT EXCEL RIBBON TOOLBAR (SEAMLESS WHITE DESIGN) */}
        <div className="w-full bg-white flex flex-col">
          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
            <div className="flex items-center gap-1 -mb-px">
              {[
                { id: 'All', label: 'All Accounts' },
                { id: 'Staff', label: 'Staff Accounts' },
                { id: 'Customer', label: 'Customer Accounts' },
              ].map((mod) => {
                const isActive = (roleFilter === 'All' && mod.id === 'All') || (roleFilter === 'Staff' && mod.id === 'Staff') || (roleFilter === 'Customer' && mod.id === 'Customer');
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
                    {mod.id === 'Customer' ? (
                      <User className="w-3.5 h-3.5 text-slate-500" />
                    ) : mod.id === 'Staff' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#01390f]" />
                    ) : (
                      <Users className="w-3.5 h-3.5 text-[#01390f]" />
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
                  onClick={() => setIsModalOpen(true)}
                  className="w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                  title="Create User Account"
                >
                  <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    Add User<br />Account
                  </span>
                </button>

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-[145px] flex flex-col justify-between py-0.5 space-y-0.5">
                  {/* Layer 1: Refresh Directory */}
                  <button
                    type="button"
                    onClick={fetchUsers}
                    className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                    title="Refresh user records"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">Refresh List</span>
                  </button>

                  {/* Layer 2: Export PDF */}
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                    title="Export User Directory to PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate">Export PDF</span>
                  </button>

                  {/* Layer 3: Reset Filters */}
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
                      <option value="All">All User Roles ({users.length})</option>
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
                    <Users className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={roleFilter === 'Staff' ? 'Staff' : roleFilter === 'Customer' ? 'Customer' : 'All'}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter Account Type"
                    >
                      <option value="All">All Account Types</option>
                      <option value="Staff">Staff Members Only</option>
                      <option value="Customer">Customers Only</option>
                    </select>
                  </div>

                  {/* Sort Select */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <ArrowUpDown className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Sort users"
                    >
                      <option value="default">Sort: Default</option>
                      <option value="name_asc">Name (A → Z)</option>
                      <option value="name_desc">Name (Z → A)</option>
                      <option value="role_asc">Role (A → Z)</option>
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
                    <span>Staff Only</span>
                  </button>

                  {/* Customer Only Toggle */}
                  <button
                    type="button"
                    onClick={() => setRoleFilter(roleFilter === 'Customer' ? 'All' : 'Customer')}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${
                      roleFilter === 'Customer'
                        ? 'bg-sky-50 text-sky-800 border border-sky-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Customers Only</span>
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
                    <span>Admin ({adminCount})</span>
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
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">NAME & USERNAME</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">EMP NO / CUSTOMER NO</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">EMAIL ADDRESS</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">ROLE / DEPARTMENT</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">ACCESS STATUS</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">REGISTERED DATE</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px]">ACTION</th>
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
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      No user accounts found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr
                      key={user._id || user.id}
                      className="hover:bg-slate-50/80 transition-colors group"
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
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                        {user.customerNo || user.empNo || user.emp_no || 'N/A'}
                      </td>

                      {/* EMAIL */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {user.email || 'N/A'}
                      </td>

                      {/* ROLE */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
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
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Active</span>
                          </span>

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
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-500">
                        {new Date(
                          user.createdAt || user.dateAdded || Date.now()
                        ).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* ACTION (STICKY RIGHT) */}
                      <td className="py-3 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Edit Account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteUser(
                                user._id || user.id,
                                user.fullName || user.username
                              )
                            }
                            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
}

export default AdminUserManagement;