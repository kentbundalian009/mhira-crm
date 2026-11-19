import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Archive,
  RotateCcw,
  Truck,
  MapPin,
  FileSpreadsheet,
  ArrowUpDown,
} from 'lucide-react';
import { API } from '../axios';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';

function LogisticsCourier() {
  const [couriers, setCouriers] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_logistics_couriers');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedName, setSelectedName] = useState('All');
  const [selectedAddress, setSelectedAddress] = useState('All');
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archived'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name_asc' | 'name_desc' | 'code_asc' | 'address_asc'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const initialFormState = {
    code: '',
    name: '',
    address: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Auto-generate code starting from CR0001
  const generateNextCode = (list) => {
    let maxNum = 0;
    if (Array.isArray(list)) {
      list.forEach((item) => {
        const codeStr = item.code || '';
        const match = codeStr.match(/^(?:CR-?|CR)(\d+)/i);
        if (match) {
          const numPart = parseInt(match[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });
    }
    const nextNum = maxNum + 1;
    return `CR${String(nextNum).padStart(4, '0')}`;
  };

  // Fetch Couriers
  const fetchCouriers = useCallback(async () => {
    try {
      if (couriers.length === 0) setLoading(true);
      const token = localStorage.getItem('token');

      const response = await API.get('/api/logistics-couriers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => ({ data: [] }));

      const raw = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.items || []);

      if (Array.isArray(raw)) {
        setCouriers(raw);
        try {
          localStorage.setItem('cached_logistics_couriers', JSON.stringify(raw));
        } catch (e) {}
      }
    } catch (error) {
      console.error('Error loading couriers:', error);
    } finally {
      setLoading(false);
    }
  }, [couriers.length]);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  // Unique names & addresses for dropdown filters
  const existingCourierNames = useMemo(() => {
    return Array.from(
      new Set(couriers.map((c) => c.name).filter((v) => v && v.trim() !== ''))
    );
  }, [couriers]);

  const existingAddresses = useMemo(() => {
    return Array.from(
      new Set(couriers.map((c) => c.address).filter((v) => v && v.trim() !== ''))
    );
  }, [couriers]);

  // Tab modules
  const statusModules = useMemo(() => [
    { id: 'active', label: 'Couriers' },
    { id: 'archived', label: 'Archive Vault' },
  ], []);

  // Filtered dataset
  const filteredCouriers = useMemo(() => {
    let list = couriers.filter((item) => {
      // 1. Vault check
      const isItemArchived = Boolean(item.isArchived);
      if (viewMode === 'active' && isItemArchived) return false;
      if (viewMode === 'archived' && !isItemArchived) return false;

      // 2. Search query (Code, Name, Address)
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const address = (item.address || '').toLowerCase();

        const match = code.includes(query) || name.includes(query) || address.includes(query);
        if (!match) return false;
      }

      // 3. Name filter
      if (selectedName !== 'All') {
        if ((item.name || '') !== selectedName) return false;
      }

      // 4. Address filter
      if (selectedAddress !== 'All') {
        if ((item.address || '') !== selectedAddress) return false;
      }

      return true;
    });

    if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'code_asc') {
      list.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'address_asc') {
      list.sort((a, b) => (a.address || '').localeCompare(b.address || '', undefined, { numeric: true, sensitivity: 'base' }));
    }

    return list;
  }, [couriers, viewMode, searchQuery, selectedName, selectedAddress, sortBy]);

  // Pagination calculation
  const totalItems = filteredCouriers.length;
  const paginatedCouriers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCouriers.slice(start, start + itemsPerPage);
  }, [filteredCouriers, currentPage, itemsPerPage]);

  const activeFiltersCount = (searchQuery.trim() !== '' ? 1 : 0) +
    (selectedName !== 'All' ? 1 : 0) +
    (selectedAddress !== 'All' ? 1 : 0) +
    (sortBy !== 'default' ? 1 : 0);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedName('All');
    setSelectedAddress('All');
    setSortBy('default');
    setCurrentPage(1);
  };

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedId(null);
    setFormData({
      code: generateNextCode(couriers),
      name: '',
      address: '',
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item) => {
    setIsEditing(true);
    setSelectedId(item._id || item.id);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      address: item.address || '',
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showErrorToast('Please enter the courier name.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (isEditing && selectedId) {
        const response = await API.put(
          `/api/logistics-couriers/${selectedId}`,
          formData,
          { headers }
        );
        const updated = response.data;
        setCouriers((prev) =>
          prev.map((c) => (c._id === selectedId || c.id === selectedId ? updated : c))
        );
        showSuccessToast('Courier updated successfully!');
      } else {
        const response = await API.post(
          '/api/logistics-couriers',
          formData,
          { headers }
        );
        const created = response.data;
        setCouriers((prev) => [created, ...prev]);
        showSuccessToast('Courier registered successfully!');
      }

      setIsModalOpen(false);
      window.dispatchEvent(new Event('couriersUpdated'));
      fetchCouriers();
    } catch (error) {
      console.error('Error saving courier:', error);
      const msg = error.response?.data?.message || 'Failed to save courier.';
      showErrorToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Archive
  const handleToggleArchive = async (item) => {
    const id = item._id || item.id;
    const willArchive = !item.isArchived;
    const actionLabel = willArchive ? 'archive' : 'restore';

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${item.name}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await API.patch(
        `/api/logistics-couriers/${id}/archive`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setCouriers((prev) =>
        prev.map((c) => (c._id === id || c.id === id ? { ...c, isArchived: willArchive } : c))
      );
      window.dispatchEvent(new Event('couriersUpdated'));
      showSuccessToast(`Courier ${willArchive ? 'archived' : 'restored'} successfully!`);
    } catch (error) {
      console.error('Error toggling archive:', error);
      showErrorToast(`Failed to ${actionLabel} courier.`);
    }
  };

  // Permanent Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this courier? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await API.delete(`/api/logistics-couriers/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setCouriers((prev) => prev.filter((c) => c._id !== id && c.id !== id));
      window.dispatchEvent(new Event('couriersUpdated'));
      showSuccessToast('Courier permanently deleted.');
    } catch (error) {
      console.error('Error deleting courier:', error);
      showErrorToast('Failed to delete courier.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif]">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">
        
        {/* ======================================================== */}
        {/* COMPACT EXCEL RIBBON TOOLBAR (SEAMLESS WHITE DESIGN)     */}
        {/* ======================================================== */}
        <div className="w-full bg-white flex flex-col">

          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
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
                    className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
                      isActive
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

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (CLEAN WHITE BACKGROUND - 1 ROW NO WRAPPING) */}
          <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">

            {/* GROUP 1: ACTIONS (Fixed Width: Tall Full-Height + Stacked Layers) */}
            <div className={`${viewMode === 'archived' ? 'w-[140px]' : 'w-[230px]'} shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]`}>
              <div className="flex items-stretch gap-1.5 flex-1">
                {/* 1 COLUMN NA 1 LAYER: Tall Full-Height Action Button */}
                {viewMode !== 'archived' && (
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                    title="Add Courier"
                  >
                    <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                      Courier
                    </span>
                  </button>
                )}

                {/* Stacked Compact Rows / Reset Filters */}
                <div className={`flex-1 min-w-0 flex flex-col ${viewMode === 'archived' ? 'justify-center items-center py-1' : 'justify-center py-0.5'}`}>
                  {/* Layer 1: Reset Filters */}
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    disabled={activeFiltersCount === 0}
                    className={`flex items-center ${viewMode === 'archived' ? 'justify-center px-2.5 py-2' : 'gap-1.5 px-2 py-0.5'} rounded hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer ${viewMode === 'archived' ? 'text-center' : 'text-left'} w-full h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap`}
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
                    placeholder="Search Code, Name, Address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    title="Search Code, Name, Address..."
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

                {/* Layer 2: Filter Dropdowns (Equal 3 Columns: Courier Name, Address, Sort) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Courier Name Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Truck className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedName}
                      onChange={(e) => setSelectedName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Courier Name"
                    >
                      <option value="All">All Courier Names ({existingCourierNames.length})</option>
                      {existingCourierNames.map((name, idx) => (
                        <option key={idx} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Address Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <MapPin className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedAddress}
                      onChange={(e) => setSelectedAddress(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Address"
                    >
                      <option value="All">All Addresses ({existingAddresses.length})</option>
                      {existingAddresses.map((addr, idx) => (
                        <option key={idx} value={addr}>{addr}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Select */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <ArrowUpDown className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Sort items"
                    >
                      <option value="default">Sort: Default</option>
                      <option value="name_asc">Name (A → Z)</option>
                      <option value="name_desc">Name (Z → A)</option>
                      <option value="code_asc">Code (A → Z)</option>
                      <option value="address_asc">Address (A → Z)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-1 select-none">
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
            totalItems={filteredCouriers.length}
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
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">COURIER CODE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px] font-semibold text-white">COURIER NAME</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">ADDRESS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Fetching courier records...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedCouriers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Truck className="w-8 h-8 text-slate-300 mb-1" />
                        <span className="font-semibold text-slate-600">No couriers found</span>
                        <span className="text-[11px]">
                          {searchQuery || selectedName !== 'All' || selectedAddress !== 'All'
                            ? 'Try clearing filters or search terms'
                            : 'Click the "+ Courier" button to add your first delivery courier'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCouriers.map((item) => (
                    <tr
                      key={item._id || item.id}
                      className="hover:bg-slate-50/90 transition-colors text-slate-700 whitespace-nowrap group text-xs sm:text-sm"
                    >
                      {/* 1. CODE */}
                      <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                          {item.code || 'N/A'}
                        </span>
                      </td>

                      {/* 2. COURIER NAME */}
                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[180px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-semibold text-slate-900 transition-colors">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-800">
                            {item.name}
                          </span>
                          {item.isArchived && (
                            <span className="inline-flex items-center text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-bold border border-red-200">
                              Archived
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. ADDRESS */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        {item.address || 'N/A'}
                      </td>

                      {/* 4. ACTION (STICKY RIGHT) */}
                      <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] transition-colors text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px]">
                        <div className="flex items-center justify-center gap-1.5">
                          {!item.isArchived ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit Courier"
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleArchive(item)}
                                title="Archive Courier"
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleArchive(item)}
                                title="Restore to Active"
                                className="w-8 h-8 rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item._id || item.id)}
                                title="Delete Permanently"
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
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

      {/* MODAL: ADD / EDIT COURIER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER (NO ICON) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                {isEditing ? 'Edit Courier' : 'Add Courier'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              {/* SCROLLABLE BODY */}
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
                {/* COURIER CODE (AUTO GENERATED) */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Courier Code <span className="text-[10px] text-slate-500 font-bold">(Auto-generated)</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    readOnly
                    value={formData.code}
                    placeholder="CR0001"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* COURIER NAME */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Courier Name <span className="text-red-600 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter Courier Name (e.g. J&T Express, Lalamove)..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                {/* ADDRESS */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">Address</label>
                  <textarea
                    name="address"
                    rows="3"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter complete courier hub / branch address..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
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
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : isEditing ? (
                    'Update Courier'
                  ) : (
                    'Add Courier'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogisticsCourier;
