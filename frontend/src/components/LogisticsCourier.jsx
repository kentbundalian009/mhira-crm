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
  FileText,
  ArrowUpDown,
  Building2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API, API_BASE_URL } from '../axios';
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

  // Unique names for dropdown filter
  const existingCourierNames = useMemo(() => {
    return Array.from(
      new Set(couriers.map((c) => c.name).filter((v) => v && v.trim() !== ''))
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
  }, [couriers, viewMode, searchQuery, selectedName, sortBy]);

  // Pagination calculation
  const totalItems = filteredCouriers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedCouriers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCouriers.slice(start, start + itemsPerPage);
  }, [filteredCouriers, currentPage, itemsPerPage]);

  const activeFiltersCount = (searchQuery.trim() !== '' ? 1 : 0) +
    (selectedName !== 'All' ? 1 : 0) +
    (sortBy !== 'default' ? 1 : 0);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedName('All');
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

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (filteredCouriers.length === 0) {
      showErrorToast('No couriers to export.');
      return;
    }

    const headers = ['Courier Code', 'Courier Name', 'Address', 'Status'];
    const rows = filteredCouriers.map((c) => [
      `"${c.code || ''}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.isArchived ? 'Archived' : 'Active'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `logistics_couriers_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccessToast('Couriers exported to CSV successfully!');
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (filteredCouriers.length === 0) {
      showErrorToast('No couriers to export.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL SKINCARE - COURIER PARTNERS DIRECTORY', 14, 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Report Generated: ${new Date().toLocaleString()} | View: ${viewMode.toUpperCase()}`, 14, 21);

      const tableData = filteredCouriers.map((c, idx) => [
        idx + 1,
        c.code || 'N/A',
        c.name || 'N/A',
        c.address || 'N/A',
        c.isArchived ? 'Archived' : 'Active',
      ]);

      autoTable(doc, {
        head: [['#', 'Courier Code', 'Courier Name', 'Address', 'Status']],
        body: tableData,
        startY: 26,
        theme: 'striped',
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { fontStyle: 'bold', halign: 'center', cellWidth: 35 },
          2: { fontStyle: 'bold', cellWidth: 70 },
          3: { cellWidth: 120 },
          4: { halign: 'center', cellWidth: 25 },
        },
        margin: { left: 14, right: 14 },
      });

      doc.save(`couriers_directory_${viewMode}_${new Date().toISOString().slice(0, 10)}.pdf`);
      showSuccessToast(`Exported ${filteredCouriers.length} couriers to PDF!`);
    } catch (err) {
      console.error('PDF export error:', err);
      showErrorToast('Failed to generate PDF report.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif]">
      {/* MAIN CARD CONTAINER */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">
        
        {/* COMPACT EXCEL RIBBON TOOLBAR */}
        <div className="w-full bg-white flex flex-col">
          {/* TOP BAR: TABS */}
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
                      <Truck className="w-3.5 h-3.5 text-[#01390f]" />
                    ) : (
                      <Archive className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{mod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIBBON TOOLBAR CONTROLS */}
          <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap border-t border-slate-100">
            {/* GROUP 1: ACTIONS */}
            <div className={`${viewMode === 'archived' ? 'w-[140px]' : 'w-[230px]'} shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]`}>
              <div className="flex items-stretch gap-1.5 flex-1">
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

                <div className={`flex-1 min-w-0 flex flex-col ${viewMode === 'archived' ? 'justify-center items-center py-1' : 'justify-center py-0.5'}`}>
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    disabled={activeFiltersCount === 0}
                    className={`flex items-center ${viewMode === 'archived' ? 'justify-center px-2.5 py-2' : 'gap-1.5 px-2 py-0.5'} rounded hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer ${viewMode === 'archived' ? 'text-center' : 'text-left'} w-full h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap`}
                    title={activeFiltersCount > 0 ? `Reset active filters (${activeFiltersCount})` : 'No active filters'}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-medium text-slate-700">Clear</span>
                  </button>
                </div>
              </div>

              <div className="w-full text-center border-t border-slate-200/80 pt-1 mt-auto">
                <span className="text-[9px] font-semibold text-slate-700 uppercase tracking-widest block">
                  Actions
                </span>
              </div>
            </div>

            {/* GROUP 2: FILTERS */}
            <div className="w-[300px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
              <div className="flex flex-col justify-between gap-1 flex-1 py-0.5">
                {/* Search */}
                <div className="relative w-full">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Code, Name, Address..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-6 pr-6 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[22px]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Name Filter */}
                <div className="flex items-center gap-1.5 w-full">
                  <span className="text-[10px] font-medium text-slate-700 w-12 shrink-0">Name:</span>
                  <select
                    value={selectedName}
                    onChange={(e) => {
                      setSelectedName(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1 py-0.5 px-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                  >
                    <option value="All">All Couriers</option>
                    {existingCourierNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="w-full text-center border-t border-slate-200/80 pt-1 mt-auto">
                <span className="text-[9px] font-semibold text-slate-700 uppercase tracking-widest block">
                  Filter & Search
                </span>
              </div>
            </div>

            {/* GROUP 3: SORT & PAGE SIZE */}
            <div className="w-[190px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
              <div className="flex flex-col justify-between gap-1 flex-1 py-0.5">
                <div className="flex items-center gap-1.5 w-full">
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 py-0.5 px-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                  >
                    <option value="default">Default Sort</option>
                    <option value="name_asc">Name: A-Z</option>
                    <option value="name_desc">Name: Z-A</option>
                    <option value="code_asc">Code: A-Z</option>
                    <option value="address_asc">Address: A-Z</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 w-full">
                  <span className="text-[10px] font-medium text-slate-700 w-12 shrink-0">Rows:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="flex-1 py-0.5 px-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>
              </div>

              <div className="w-full text-center border-t border-slate-200/80 pt-1 mt-auto">
                <span className="text-[9px] font-semibold text-slate-700 uppercase tracking-widest block">
                  Display
                </span>
              </div>
            </div>

            {/* GROUP 4: EXPORT */}
            <div className="w-[150px] shrink-0 flex flex-col justify-between min-h-[92px]">
              <div className="flex items-center justify-around flex-1 py-1">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer"
                  title="Export to Excel / CSV"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 mb-0.5" />
                  <span className="text-[10px] font-medium">Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-red-700 transition-colors cursor-pointer"
                  title="Export to PDF Report"
                >
                  <FileText className="w-5 h-5 text-red-600 mb-0.5" />
                  <span className="text-[10px] font-medium">PDF</span>
                </button>
              </div>

              <div className="w-full text-center border-t border-slate-200/80 pt-1 mt-auto">
                <span className="text-[9px] font-semibold text-slate-700 uppercase tracking-widest block">
                  Export
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* DATA TABLE CONTAINER */}
        <div className="w-full flex flex-col">
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4 text-center w-36">Courier Code</th>
                  <th className="py-3 px-4">Courier Name</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-center w-28">Status</th>
                  <th className="py-3 px-4 text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#01390f]" />
                        <span>Loading couriers directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedCouriers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Truck className="w-8 h-8 text-slate-300 mb-1" />
                        <span className="font-semibold text-slate-600">No couriers found</span>
                        <span className="text-[11px]">
                          {searchQuery || selectedName !== 'All'
                            ? 'Try clearing filters or search terms'
                            : 'Click the "+ Courier" button to add your first delivery courier'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCouriers.map((item, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr key={item._id || item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-medium">
                          {rowNumber}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono text-[11px] font-bold text-[#01390f] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            {item.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {item.address || <span className="text-slate-400 italic">No address specified</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.isArchived ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Archived
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE PAGINATION */}
          <div className="mt-4">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>
      </div>

      {/* MODAL: ADD / EDIT COURIER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
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
