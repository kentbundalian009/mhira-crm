import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Filter,
  Search,
  Plus,
  Edit2,
  Edit3,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  Archive,
  RotateCcw,
  Truck,
  MapPin,
  Info,
  FileSpreadsheet,
  FileText,
  ArrowUpDown,
  Phone,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API, API_BASE_URL } from '../axios';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';

function InventorySuppliers() {
  const [suppliers, setSuppliers] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_inventory_suppliers');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedName, setSelectedName] = useState('All');
  const [selectedAddress, setSelectedAddress] = useState('All');
  const [hasContactPerson, setHasContactPerson] = useState(false);
  const [hasContactNumber, setHasContactNumber] = useState(false);
  const [viewMode, setViewMode] = useState('active'); // 'all' | 'active' | 'archived'
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
    contactPerson: '',
    contactNumber: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Auto-generate code starting from SL0001
  const generateNextCode = (list) => {
    let maxNum = 0;
    if (Array.isArray(list)) {
      list.forEach((item) => {
        const codeStr = item.code || '';
        const match = codeStr.match(/^(?:SUP-|SL-?|SL)(\d+)/i);
        if (match) {
          const numPart = parseInt(match[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });
    }
    const nextNum = maxNum + 1;
    return `SL${String(nextNum).padStart(4, '0')}`;
  };

  // Fetch Suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      if (suppliers.length === 0) setLoading(true);
      const token = localStorage.getItem('token');

      const response = await API.get('/api/inventory-suppliers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => ({ data: [] }));

      const raw = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.items || []);

      if (Array.isArray(raw)) {
        setSuppliers(raw);
        try {
          localStorage.setItem('cached_inventory_suppliers', JSON.stringify(raw));
        } catch (e) { }
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [suppliers.length]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Unique names & addresses for dropdowns
  const existingSupplierNames = useMemo(() => {
    return Array.from(
      new Set(suppliers.map((s) => s.name).filter((v) => v && v.trim() !== ''))
    );
  }, [suppliers]);

  const existingAddresses = useMemo(() => {
    return Array.from(
      new Set(suppliers.map((s) => s.address).filter((v) => v && v.trim() !== ''))
    );
  }, [suppliers]);

  // Counts for active vs archived
  const activeCount = useMemo(() => {
    return suppliers.filter((item) => !item.isArchived).length;
  }, [suppliers]);

  const archivedCount = useMemo(() => {
    return suppliers.filter((item) => item.isArchived).length;
  }, [suppliers]);

  // Quick filter counts
  const withPersonCount = useMemo(() => {
    return suppliers.filter((item) => {
      const isItemArchived = Boolean(item.isArchived);
      if (viewMode === 'active' && isItemArchived) return false;
      if (viewMode === 'archived' && !isItemArchived) return false;
      return Boolean(item.contactPerson && item.contactPerson.trim() !== '' && item.contactPerson !== '-');
    }).length;
  }, [suppliers, viewMode]);

  const withNumberCount = useMemo(() => {
    return suppliers.filter((item) => {
      const isItemArchived = Boolean(item.isArchived);
      if (viewMode === 'active' && isItemArchived) return false;
      if (viewMode === 'archived' && !isItemArchived) return false;
      return Boolean(item.contactNumber && item.contactNumber.trim() !== '' && item.contactNumber !== '-');
    }).length;
  }, [suppliers, viewMode]);

  const statusModules = useMemo(() => [
    { id: 'active', label: 'Suppliers' },
    { id: 'archived', label: 'Archive Vault' },
  ], []);

  // Filtered dataset
  const filteredSuppliers = useMemo(() => {
    let list = suppliers.filter((item) => {
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

      // 5. Quick Checkboxes
      if (hasContactPerson) {
        if (!item.contactPerson || item.contactPerson.trim() === '' || item.contactPerson === '-') return false;
      }
      if (hasContactNumber) {
        if (!item.contactNumber || item.contactNumber.trim() === '' || item.contactNumber === '-') return false;
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
  }, [suppliers, viewMode, searchQuery, selectedName, selectedAddress, hasContactPerson, hasContactNumber, sortBy]);

  // Reset pagination on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, viewMode, selectedName, selectedAddress, hasContactPerson, hasContactNumber, sortBy]);

  // Paginated Slices
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSuppliers.slice(start, start + itemsPerPage);
  }, [filteredSuppliers, currentPage, itemsPerPage]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery && searchQuery.trim() !== '') count++;
    if (selectedName !== 'All') count++;
    if (selectedAddress !== 'All') count++;
    if (hasContactPerson) count++;
    if (hasContactNumber) count++;
    if (sortBy !== 'default') count++;
    if (viewMode !== 'active') count++;
    return count;
  }, [searchQuery, selectedName, selectedAddress, hasContactPerson, hasContactNumber, sortBy, viewMode]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedName('All');
    setSelectedAddress('All');
    setHasContactPerson(false);
    setHasContactNumber(false);
    setSortBy('default');
    setViewMode('active');
    setCurrentPage(1);
  };

  // Toggle Archive status
  const handleToggleArchive = async (supplier) => {
    const isCurrentlyArchived = Boolean(supplier.isArchived);
    const actionLabel = isCurrentlyArchived
      ? 'restore this supplier to active directory'
      : 'move this supplier to archive vault';
    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const id = supplier._id || supplier.id;

      await axios.patch(`${API_BASE_URL}/api/inventory-suppliers/${id}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showSuccessToast(
        isCurrentlyArchived ? 'Supplier restored to active directory!' : 'Supplier moved to archive vault!'
      );
      fetchSuppliers();
    } catch (error) {
      console.error('Error toggling supplier archive status:', error);
      showErrorToast(error.response?.data?.message || 'Failed to update archive status.');
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedId(null);
    const autoCode = generateNextCode(suppliers);
    setFormData({
      ...initialFormState,
      code: autoCode,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setIsEditing(true);
    setSelectedId(item._id || item.id);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      address: item.address || '',
      contactPerson: item.contactPerson || '',
      contactNumber: item.contactNumber || '',
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'contactNumber') {
      const sanitized = value.replace(/[^0-9+\-()\s]/g, '');
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
      return;
    }
    if (name === 'contactPerson') {
      const sanitized = value.replace(/[^a-zA-Z\s.\-]/g, '');
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.contactPerson?.trim()) {
      showErrorToast('Contact Person is mandatory.');
      return;
    }
    if (!formData.contactNumber?.trim()) {
      showErrorToast('Contact Number is mandatory.');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      if (isEditing && selectedId) {
        await axios.put(`${API_BASE_URL}/api/inventory-suppliers/${selectedId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showSuccessToast('Supplier updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/api/inventory-suppliers`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showSuccessToast('Supplier created successfully!');
      }

      setIsModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      showErrorToast(error.response?.data?.message || 'Failed to save supplier details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this supplier?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/inventory-suppliers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSuccessToast('Supplier deleted successfully!');
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      showErrorToast('Error deleting supplier.');
    }
  };

  // EXCEL RIBBON ACTION: Export Suppliers to PDF Report
  const handleExportPDF = () => {
    if (filteredSuppliers.length === 0) {
      showErrorToast('No suppliers available to export.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Brand Header Banner (#01390f deep green)
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - SUPPLIERS DIRECTORY MASTERLIST', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated: ${new Date().toLocaleString()} | View: ${viewMode === 'archived' ? 'Archive Vault' : 'Active Suppliers'} | Total Records: ${filteredSuppliers.length}`,
        14,
        18
      );

      const tableHead = [
        ['#', 'Supplier Code', 'Supplier Name', 'Contact Person & Number', 'Office Address']
      ];

      const tableBody = filteredSuppliers.map((s, idx) => [
        idx + 1,
        s.code || 'N/A',
        s.name || 'N/A',
        s.contactNumber ? `${s.contactPerson || '-'}\nTel: ${s.contactNumber}` : (s.contactPerson || '-'),
        s.address || 'N/A'
      ]);

      autoTable(doc, {
        startY: 30,
        head: tableHead,
        body: tableBody,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { fontStyle: 'bold', halign: 'center', cellWidth: 35 },
          2: { fontStyle: 'bold', cellWidth: 70 },
          3: { cellWidth: 70 },
          4: { cellWidth: 80 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 }
      });

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`suppliers_directory_${viewMode}_${dateStr}.pdf`);
      showSuccessToast(`Exported ${filteredSuppliers.length} suppliers to PDF!`);
    } catch (err) {
      console.error('PDF export error:', err);
      showErrorToast('Failed to generate PDF report.');
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
                    className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${isActive
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
                    title="Add Supplier"
                  >
                    <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                      Supplier
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

                {/* Layer 2: Filter Dropdowns (Equal 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Supplier Name Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Truck className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedName}
                      onChange={(e) => setSelectedName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Supplier Name"
                    >
                      <option value="All">All Supplier Names ({existingSupplierNames.length})</option>
                      {existingSupplierNames.map((name, idx) => (
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

                  {/* Contact Filter Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Phone className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={hasContactPerson && hasContactNumber ? 'both' : hasContactPerson ? 'person' : hasContactNumber ? 'number' : 'All'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'All') {
                          setHasContactPerson(false);
                          setHasContactNumber(false);
                        } else if (val === 'person') {
                          setHasContactPerson(true);
                          setHasContactNumber(false);
                        } else if (val === 'number') {
                          setHasContactPerson(false);
                          setHasContactNumber(true);
                        } else if (val === 'both') {
                          setHasContactPerson(true);
                          setHasContactNumber(true);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Contact Status"
                    >
                      <option value="All">All Contact Types</option>
                      <option value="person">With Contact Person ({withPersonCount})</option>
                      <option value="number">With Contact Number ({withNumberCount})</option>
                      <option value="both">Complete Contact Info</option>
                    </select>
                  </div>
                </div>

                {/* Layer 3: Quick Filter Toggles & Sort (Exact Same 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* With Contact Person */}
                  <button
                    type="button"
                    onClick={() => setHasContactPerson(!hasContactPerson)}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${hasContactPerson
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    title="Filter suppliers with Contact Person"
                  >
                    <span>With Contact Person</span>
                    <span className="font-mono text-[11px]">({withPersonCount})</span>
                  </button>

                  {/* With Contact Number */}
                  <button
                    type="button"
                    onClick={() => setHasContactNumber(!hasContactNumber)}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${hasContactNumber
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    title="Filter suppliers with Contact Number"
                  >
                    <span>With Contact No.</span>
                    <span className="font-mono text-[11px]">({withNumberCount})</span>
                  </button>

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
            totalItems={filteredSuppliers.length}
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
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">SUPPLIER CODE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px] font-semibold text-white">SUPPLIER NAME</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CONTACT PERSON & NUMBER</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">ADDRESS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Fetching supplier records...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedSuppliers.map((item) => (
                  <tr
                    key={item._id || item.id}
                    className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                  >
                    {/* CODE */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      {item.code || 'N/A'}
                    </td>

                    {/* SUPPLIER NAME */}
                    <td className="py-3.5 px-4 whitespace-nowrap min-w-[180px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      <span className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-md font-semibold border border-violet-200/70 uppercase">
                        {item.name}
                      </span>
                    </td>

                    {/* CONTACT PERSON & NUMBER */}
                    <td className="py-3.5 px-4 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                          {item.contactPerson || '-'}
                        </span>
                        {item.contactNumber ? (
                          <span className="font-mono text-xs text-slate-500 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[#01390f] shrink-0" />
                            <span>{item.contactNumber}</span>
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.address || 'N/A'}</span>
                      </div>
                    </td>

                    {/* ACTION (STICKY RIGHT) */}
                    <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] transition-colors text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px]">
                      <div className="flex items-center justify-center gap-1.5">
                        {!item.isArchived ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Supplier"
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleArchive(item)}
                              title="Archive Supplier"
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
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
                              className="w-8 h-8 rounded-full bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item._id || item.id)}
                              title="Delete Permanently"
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="w-6 h-6 text-slate-300" />
                        <span>
                          {viewMode === 'archived'
                            ? 'No archived suppliers found in the vault.'
                            : 'No supplier records matched your search or filter criteria.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL ADD / EDIT SUPPLIER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER (NO ICON) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                {isEditing ? 'Edit Supplier' : 'Add Supplier'}
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
                {/* SUPPLIER CODE (AUTO GENERATED) */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Supplier Code <span className="text-[10px] text-slate-500 font-bold">(Auto-generated)</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    readOnly
                    value={formData.code}
                    placeholder="SL0001"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* SUPPLIER NAME (TYPE ONLY) */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Supplier Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter Supplier Name..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                {/* CONTACT PERSON (MANDATORY - LETTERS ONLY) */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    required
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
                      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
                      if (!/^[a-zA-Z\s.\-]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const paste = (e.clipboardData || window.clipboardData).getData('text');
                      const sanitized = paste.replace(/[^a-zA-Z\s.\-]/g, '');
                      if (sanitized) {
                        setFormData((prev) => ({ ...prev, contactPerson: sanitized }));
                      }
                    }}
                    placeholder="e.g. Maria Santos, Juan Dela Cruz"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                {/* CONTACT NUMBER (MANDATORY - NUMBERS ONLY) */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                    Contact Number <span className="text-rose-500 font-bold">*</span> <span className="text-[10px] text-slate-500 font-bold">(Numbers only)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="tel"
                    name="contactNumber"
                    required
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
                      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
                      if (!/^[0-9+\-()\s]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const paste = (e.clipboardData || window.clipboardData).getData('text');
                      const sanitized = paste.replace(/[^0-9+\-()\s]/g, '');
                      if (sanitized) {
                        setFormData((prev) => ({ ...prev, contactNumber: sanitized }));
                      }
                    }}
                    placeholder="e.g. +63 917 123 4567 / 09171234567"
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
                    placeholder="Enter complete supplier address..."
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
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span className="whitespace-nowrap">{submitting ? 'Saving...' : 'Save Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventorySuppliers;
