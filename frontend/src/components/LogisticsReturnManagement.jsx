import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RotateCcw,
  Edit2,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Loader2,
  Package,
  Layers,
  ArrowRight,
  User,
  AlertCircle,
  ListPlus,
  FileDown,
  Download,
  Check,
  MapPin,
  Tag,
  Copy,
  Printer,
  ShieldCheck,
  HelpCircle,
  Truck,
  Boxes,
  FileSpreadsheet,
  ShieldAlert,
  Trash2,
  ClipboardList,
  Plus,
  X,
  Filter,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import axios from '../axios';
import { useLiveSync, notifyLiveSync } from '../utils/liveSync';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';

const API_BASE_URL =
  import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com/api'
    : 'http://localhost:5000/api';

function LogisticsReturnManagement() {
  const [returnRequests, setReturnRequests] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_logistics_returns');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedReason, setSelectedReason] = useState('All');
  const [selectedSort, setSelectedSort] = useState('newest');
  const dateInputRef = useRef(null);

  // Slide-over Drawer / Selected Return Request
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [activeDrawerTab, setActiveDrawerTab] = useState('review'); // 'review' | 'action' | 'customer' | 'slip'
  const [updating, setUpdating] = useState(false);

  // Refund Restocking & Scrap Disposition
  const [restockAction, setRestockAction] = useState('Return to Inventory'); // 'Return to Inventory' | 'Dispose/Scrap' | 'Send Replacement to Client'
  const [replacementCourier, setReplacementCourier] = useState('J&T Express');
  const [replacementTracking, setReplacementTracking] = useState('');
  const [approverName, setApproverName] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      return u.name || u.fullName || u.username || '';
    } catch (e) {
      return '';
    }
  });
  const [dispositionReason, setDispositionReason] = useState('');

  // Rejection & Scrap Audit Log Modal
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [scrapLogs, setScrapLogs] = useState([]);
  const [loadingScrapLogs, setLoadingScrapLogs] = useState(false);
  const [scrapSearch, setScrapSearch] = useState('');
  const [scrapFilterType, setScrapFilterType] = useState('All');

  // Manual Scrap Creation Form Modal
  const [isManualScrapModalOpen, setIsManualScrapModalOpen] = useState(false);
  const [savingManualScrap, setSavingManualScrap] = useState(false);
  const [manualScrapForm, setManualScrapForm] = useState({
    itemType: 'Finished Product',
    itemName: '',
    itemCode: '',
    batchId: '',
    quantity: '',
    uom: 'pcs',
    reason: '',
    approverName: '',
    disposition: 'Scrap / Dispose',
    notes: '',
  });

  // Counts
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalReturnValue: 0,
  });

  const fetchReturnRequests = async (silent = false) => {
    if (!silent && returnRequests.length === 0) {
      setLoading(true);
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/returns`);
      const fetched = res.data || [];
      if (Array.isArray(fetched)) {
        setReturnRequests(fetched);
        calculateMetrics(fetched);
        try {
          localStorage.setItem('cached_logistics_returns', JSON.stringify(fetched));
        } catch (e) {}
        window.dispatchEvent(new Event('returnsUpdated'));
      }
    } catch (error) {
      console.error('Error fetching return requests:', error);
      showErrorToast('Failed to load return requests.');
    } finally {
      setLoading(false);
    }
  };

  // Real-time automatic synchronization without refresh
  useLiveSync(['returns', 'logistics', 'orders'], () => {
    fetchReturnRequests(true);
  });

  useEffect(() => {
    fetchReturnRequests(true);
  }, []);

  const calculateMetrics = (data) => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalReturnValue = 0;

    data.forEach((req) => {
      const st = (req.status || '').toLowerCase();
      const val = Number(req.refundAmount || req.returnValue || req.totalAmount || 0);
      totalReturnValue += val;
      if (st === 'pending') pending++;
      else if (st === 'approved') approved++;
      else if (st === 'rejected') rejected++;
    });

    setCounts({
      all: data.length,
      pending,
      approved,
      rejected,
      totalReturnValue,
    });
  };

  const openRmaDrawer = (req) => {
    setSelectedReturn(req);
    setAdminNotes(req.adminNotes || '');
    setRestockAction(req.restockAction || 'Return to Inventory');
    setReplacementCourier(req.replacementCourier || 'J&T Express');
    setReplacementTracking(req.replacementTracking || '');
    setApproverName(req.approverName || approverName || '');
    setDispositionReason(req.dispositionReason || req.reason || '');
  };

  const handleStatusUpdate = async (returnId, newStatus) => {
    try {
      if (newStatus === 'Approved') {
        if (!approverName || !approverName.trim()) {
          showErrorToast('Approver/Inspector Name is strictly required to prevent material shrinkage/theft.');
          return;
        }
        if (restockAction === 'Send Replacement to Client') {
          if (!replacementTracking || !replacementTracking.trim()) {
            showErrorToast('Replacement Waybill / Tracking number is required when sending a replacement to client.');
            return;
          }
        }
      }

      setUpdating(true);
      const payload = {
        status: newStatus,
        adminNotes: adminNotes.trim(),
      };

      if (newStatus === 'Approved') {
        payload.restockAction = restockAction;
        payload.approverName = approverName.trim();
        payload.dispositionReason = dispositionReason.trim() || selectedReturn?.reason || 'Approved Customer Return';
        if (restockAction === 'Send Replacement to Client') {
          payload.replacementCourier = replacementCourier;
          payload.replacementTracking = replacementTracking.trim();
        }
      }

      const res = await axios.put(`${API_BASE_URL}/returns/${returnId}/status`, payload);

      if (res.data && res.data.returnRequest) {
        setSelectedReturn(res.data.returnRequest);
      } else {
        setSelectedReturn((prev) => (prev ? { ...prev, status: newStatus, adminNotes, restockAction, approverName, replacementCourier, replacementTracking } : null));
      }

      fetchReturnRequests();
      if (newStatus === 'Approved') {
        if (restockAction === 'Return to Inventory') {
          showSuccessToast('Return approved and unopened items restocked into available inventory! 📦');
        } else if (restockAction === 'Send Replacement to Client') {
          showSuccessToast('Replacement dispatched to client! Deducted replacement inventory and moved order to "To Receive". 🔄');
        } else {
          showSuccessToast('Return processed as SCRAP. Recorded in Rejection & Scrap Audit Log to prevent shrinkage! 🛡️');
          fetchScrapLogs();
        }
      } else if (newStatus === 'Rejected') {
        showSuccessToast('Return request rejected.');
      } else {
        showSuccessToast(`Return request status updated to "${newStatus}".`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showErrorToast(error.response?.data?.message || 'Failed to update return status.');
    } finally {
      setUpdating(false);
    }
  };

  const fetchScrapLogs = async () => {
    setLoadingScrapLogs(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/scrap-audit-logs`);
      if (res.data && res.data.data) {
        setScrapLogs(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching scrap audit logs:', err);
    } finally {
      setLoadingScrapLogs(false);
    }
  };

  const handleOpenScrapModal = () => {
    setIsScrapModalOpen(true);
    fetchScrapLogs();
  };

  const handleCreateManualScrap = async (e) => {
    e.preventDefault();
    if (!manualScrapForm.itemName || !manualScrapForm.batchId || !manualScrapForm.quantity || !manualScrapForm.reason || !manualScrapForm.approverName) {
      showErrorToast('All fields (Item Name, Batch ID, Quantity, Reason, Approver Name) are strictly required.');
      return;
    }

    try {
      setSavingManualScrap(true);
      const res = await axios.post(`${API_BASE_URL}/scrap-audit-logs`, manualScrapForm);
      if (res.data && res.data.success) {
        showSuccessToast('Scrap & rejection audit entry recorded successfully! 🛡️');
        setIsManualScrapModalOpen(false);
        setManualScrapForm({
          itemType: 'Finished Product',
          itemName: '',
          itemCode: '',
          batchId: '',
          quantity: '',
          uom: 'pcs',
          reason: '',
          approverName: approverName || '',
          disposition: 'Scrap / Dispose',
          notes: '',
        });
        fetchScrapLogs();
      }
    } catch (err) {
      console.error('Error creating manual scrap log:', err);
      showErrorToast(err.response?.data?.message || 'Failed to record scrap audit log.');
    } finally {
      setSavingManualScrap(false);
    }
  };

  const statusTabs = [
    { id: 'pending', label: 'Pending Review', icon: Clock, count: counts.pending },
    { id: 'approved', label: 'Approved', icon: CheckCircle2, count: counts.approved },
    { id: 'rejected', label: 'Rejected', icon: XCircle, count: counts.rejected },
  ];

  const existingReasons = useMemo(() => {
    const set = new Set();
    returnRequests.forEach((r) => {
      if (r.reason) set.add(r.reason);
    });
    return Array.from(set);
  }, [returnRequests]);

  const filteredRequests = useMemo(() => {
    return returnRequests.filter((req) => {
      const formattedStatus = (req.status || '').toLowerCase();
      const matchesTab = activeTab === 'all' || formattedStatus === activeTab;

      const returnId = req._id || '';
      const orderIdStr = req.orderId?._id || req.orderId || '';
      const customer = req.customerName || req.userId || '';
      const reasonStr = req.reason || '';
      const itemsStr = req.items?.map((i) => i.name).join(' ') || '';

      const matchesSearch =
        returnId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orderIdStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reasonStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        itemsStr.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (selectedDate) {
        const reqDate = new Date(req.createdAt).toISOString().split('T')[0];
        matchesDate = reqDate === selectedDate;
      }

      let matchesReason = selectedReason === 'All';
      if (!matchesReason) {
        matchesReason = (req.reason || '').toLowerCase() === selectedReason.toLowerCase();
      }

      return matchesTab && matchesSearch && matchesDate && matchesReason;
    }).sort((a, b) => {
      if (selectedSort === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (selectedSort === 'value-high') {
        return Number(b.refundAmount || b.returnValue || b.totalAmount || 0) - Number(a.refundAmount || a.returnValue || a.totalAmount || 0);
      }
      if (selectedSort === 'value-low') {
        return Number(a.refundAmount || a.returnValue || a.totalAmount || 0) - Number(b.refundAmount || b.returnValue || b.totalAmount || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [returnRequests, activeTab, searchTerm, selectedDate, selectedReason, selectedSort]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedDate) count++;
    if (selectedReason !== 'All') count++;
    if (selectedSort !== 'newest') count++;
    return count;
  }, [searchTerm, selectedDate, selectedReason, selectedSort]);

  // Pagination States for Main Returns Table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, selectedDate, selectedReason, selectedSort]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedDate('');
    setSelectedReason('All');
    setSelectedSort('newest');
    setCurrentPage(1);
  };

  const filteredScrapLogs = useMemo(() => {
    return scrapLogs.filter((log) => {
      const matchesType = scrapFilterType === 'All' || log.itemType === scrapFilterType;
      const term = scrapSearch.toLowerCase().trim();
      if (!term) return matchesType;
      const matchesSearch =
        (log.logId || '').toLowerCase().includes(term) ||
        (log.itemName || '').toLowerCase().includes(term) ||
        (log.itemCode || '').toLowerCase().includes(term) ||
        (log.batchId || '').toLowerCase().includes(term) ||
        (log.approverName || '').toLowerCase().includes(term) ||
        (log.reason || '').toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [scrapLogs, scrapFilterType, scrapSearch]);

  // Pagination States for Scrap Logs Modal Table
  const [scrapPage, setScrapPage] = useState(1);
  const [scrapPerPage, setScrapPerPage] = useState(10);

  const paginatedScrapLogs = useMemo(() => {
    const start = (scrapPage - 1) * scrapPerPage;
    return filteredScrapLogs.slice(start, start + scrapPerPage);
  }, [filteredScrapLogs, scrapPage, scrapPerPage]);

  useEffect(() => {
    setScrapPage(1);
  }, [scrapFilterType, scrapSearch]);

  // Overall Statistics for KPI Cards
  const stats = useMemo(() => {
    const totalCount = returnRequests.length;
    const pendingCount = counts.pending || 0;
    const approvedCount = counts.approved || 0;
    const rejectedCount = counts.rejected || 0;
    const totalValue = returnRequests.reduce(
      (sum, r) => sum + Number(r.refundAmount || r.returnValue || r.totalAmount || 0),
      0
    );
    const approvedValue = returnRequests
      .filter((r) => (r.status || '').toLowerCase() === 'approved')
      .reduce(
        (sum, r) => sum + Number(r.refundAmount || r.returnValue || r.totalAmount || 0),
        0
      );

    return {
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalValue,
      approvedValue,
    };
  }, [returnRequests, counts]);

  // Download Single Customer RMA Return Slip PDF
  const handleDownloadReturnPdf = (returnItem) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const returnIdShort = returnItem._id?.slice(-8).toUpperCase() || 'RMA';
      const orderIdShort =
        returnItem.orderId?._id?.slice(-8).toUpperCase() ||
        returnItem.orderId?.slice(-8).toUpperCase() ||
        'N/A';

      // Header Banner
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - RETURN MERCHANDISE AUTHORIZATION (RMA)', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL RETURN INSPECTION & WAREHOUSE DISPATCH SLIP', 14, 18);

      // Metadata Box
      doc.setDrawColor(220, 225, 230);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 28, 182, 42, 2, 2, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);

      const customerName = returnItem.customerName || returnItem.userId || 'Customer';
      const reqDate = new Date(returnItem.createdAt || Date.now()).toLocaleDateString();

      doc.setFont('helvetica', 'bold');
      doc.text('RMA / RETURN ID:', 18, 36);
      doc.setFont('helvetica', 'normal');
      doc.text(`#RMA-${returnIdShort}`, 55, 36);

      doc.setFont('helvetica', 'bold');
      doc.text('ORIGINAL ORDER REF:', 18, 43);
      doc.setFont('helvetica', 'normal');
      doc.text(`#${orderIdShort}`, 55, 43);

      doc.setFont('helvetica', 'bold');
      doc.text('CUSTOMER NAME:', 18, 50);
      doc.setFont('helvetica', 'normal');
      doc.text(customerName, 55, 50);

      doc.setFont('helvetica', 'bold');
      doc.text('RETURN REASON:', 18, 57);
      doc.setFont('helvetica', 'normal');
      doc.text(returnItem.reason || 'Damaged / Defective Item', 55, 57);

      doc.setFont('helvetica', 'bold');
      doc.text('DATE FILED:', 125, 36);
      doc.setFont('helvetica', 'normal');
      doc.text(reqDate, 160, 36);

      doc.setFont('helvetica', 'bold');
      doc.text('RMA STATUS:', 125, 43);
      doc.setFont('helvetica', 'normal');
      doc.text((returnItem.status || 'Pending').toUpperCase(), 160, 43);

      doc.setFont('helvetica', 'bold');
      doc.text('RETURN VALUE:', 125, 50);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(1, 57, 15);
      const val = Number(returnItem.refundAmount || returnItem.returnValue || returnItem.totalAmount || 0);
      doc.text(`PHP ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 160, 50);

      // Detail Table
      const tableHead = [['#', 'Returned Item / Product Description', 'Qty', 'Unit Price', 'Total Value']];
      const tableBody = (returnItem.items || []).map((it, idx) => [
        idx + 1,
        it.name || 'Returned Cosmetic Item',
        it.quantity || 1,
        `PHP ${Number(it.price || 0).toFixed(2)}`,
        `PHP ${Number((it.price || 0) * (it.quantity || 1)).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 76,
        head: tableHead,
        body: tableBody,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        theme: 'grid',
        styles: { cellPadding: 2.8 }
      });

      const finalY = doc.lastAutoTable.finalY + 8;

      // Customer Comments Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, finalY, 182, 18, 2, 2, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `CUSTOMER REMARKS: ${returnItem.comments || 'No additional comments provided by customer.'}`,
        18,
        finalY + 6
      );
      doc.text(
        `WAREHOUSE INSPECTION: ${returnItem.adminNotes || 'Inspected and verified by Mhira Logistics Quality Control.'}`,
        18,
        finalY + 12
      );

      // Signatures
      const signY = finalY + 34;
      doc.setDrawColor(180, 180, 180);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      doc.line(14, signY, 65, signY);
      doc.text('RMA INSPECTION OFFICER', 14, signY + 5);

      doc.line(78, signY, 130, signY);
      doc.text('WAREHOUSE QA MANAGER', 78, signY + 5);

      doc.line(144, signY, 196, signY);
      doc.text('CUSTOMER SIGNATURE', 144, signY + 5);

      const fileName = `RMA_Return_Slip_${returnIdShort}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Downloaded RMA Return Slip: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to generate RMA PDF document.');
    }
  };

  // Download Master Returns Summary Report PDF
  const handleDownloadReturnsSummaryPdf = (returnList) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - MASTER PRODUCT RETURNS SUMMARY REPORT', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Total Returns: ${returnList.length}`,
        14,
        18
      );

      const tableHead = [
        ['#', 'RMA ID', 'Date Filed', 'Order Ref', 'Customer', 'Return Reason', 'Items Summary', 'Return Value', 'Status']
      ];

      const tableBody = (returnList || []).map((r, idx) => [
        idx + 1,
        `#RMA-${r._id?.slice(-8).toUpperCase()}`,
        new Date(r.createdAt || Date.now()).toLocaleDateString(),
        `#${r.orderId?._id?.slice(-8).toUpperCase() || r.orderId?.slice(-8).toUpperCase() || 'N/A'}`,
        r.customerName || r.userId || 'Customer',
        r.reason || 'N/A',
        (r.items || []).map((i) => `${i.name || 'Item'} (x${i.quantity || 1})`).join(', ') || 'N/A',
        `PHP ${Number(r.refundAmount || r.returnValue || r.totalAmount || 0).toFixed(2)}`,
        (r.status || 'Pending').toUpperCase()
      ]);

      autoTable(doc, {
        startY: 30,
        head: tableHead,
        body: tableBody,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        theme: 'grid',
        styles: { cellPadding: 2.2 }
      });

      const fileName = `Returns_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Returns Summary Report: ${fileName}`);
    } catch (err) {
      console.error('Error generating summary PDF:', err);
      showErrorToast('Failed to export summary PDF.');
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Pending Review
          </span>
        );
    }
  };

  // Workflow progress index calculation (0-4)
  const getWorkflowStepIndex = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'rejected') return -1;
    if (s === 'approved') return 4;
    return 1; // Pending Inspection
  };

  const workflowSteps = [
    { label: 'Request Filed', desc: 'Customer RMA' },
    { label: 'RMA Review', desc: 'Inspection QC' },
    { label: 'In Transit', desc: 'Return Pickup' },
    { label: 'Warehouse Check', desc: 'Condition QA' },
    { label: 'Restocked', desc: 'Resolved' },
  ];

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-800">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Returns' },
              { id: 'pending', label: 'Pending Review' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#01390f] text-[#01390f] bg-slate-50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
          {/* ACTIONS GROUP */}
          <div className="w-[226px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
            <div className="flex items-stretch gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => handleDownloadReturnsSummaryPdf(filteredRequests)}
                className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                title="Export Returns Summary Report PDF"
              >
                <FileDown className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-center leading-tight">Export PDF</span>
              </button>
              <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={handleOpenScrapModal}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer w-full"
                  title="Loss Prevention & Scrap Audit Log"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="truncate">Scrap Audit Log</span>
                </button>
                <button
                  type="button"
                  onClick={fetchReturnRequests}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                  <span className="truncate">Refresh Returns</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer w-full"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">Reset Filters</span>
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
              Actions
            </div>
          </div>

          {/* SEARCH & FILTER GROUP */}
          <div className="flex flex-col justify-between flex-1 min-h-[92px] pl-1">
            <div className="flex flex-col justify-between flex-1 gap-1.5 py-0.5">
              {/* Layer 1: Search */}
              <div className="relative flex items-center w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search return ID, order #, customer, reason, item..."
                  className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Layer 2: 3-column Dropdowns / Pickers */}
              <div className="grid grid-cols-3 gap-2 w-full">
                {/* Date Picker */}
                <div
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker();
                    } catch (err) {}
                  }}
                  className="relative w-full cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {}
                    }}
                    onFocus={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {}
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' || e.key === 'Delete') {
                        setSelectedDate('');
                      } else if (e.key !== 'Tab' && e.key !== 'Escape') {
                        e.preventDefault();
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) {}
                      }
                    }}
                    className={`w-full h-[22px] text-xs bg-slate-50 border rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
                      selectedDate ? 'border-[#01390f] bg-emerald-50/30 font-semibold text-[#01390f]' : 'border-slate-200'
                    }`}
                  />
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate('');
                      }}
                      className="absolute right-1.5 top-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Return Reason */}
                <div className="relative w-full">
                  <AlertCircle className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Return Reasons</option>
                    {existingReasons.map((reason, idx) => (
                      <option key={idx} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort Order */}
                <div className="relative w-full">
                  <SlidersHorizontal className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="newest">Sort: Newest Returns</option>
                    <option value="oldest">Sort: Oldest Returns</option>
                    <option value="value-high">Sort: Highest Value</option>
                    <option value="value-low">Sort: Lowest Value</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: 3-column Quick Toggles */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'pending' ? 'all' : 'pending')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-amber-50 border-amber-600 text-amber-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Pending Review
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'approved' ? 'all' : 'approved')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    activeTab === 'approved'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Approved Only
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setSelectedDate(selectedDate === todayStr ? '' : todayStr);
                  }}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    selectedDate === new Date().toISOString().split('T')[0]
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Today's Returns
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
              Search & Filter
            </div>
          </div>
        </div>

        {/* HR DIVIDER ABOVE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* 3. TABLE MASTERLIST */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* TABLE PAGINATION */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredRequests.length}
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
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">
                    RETURN ID
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">DATE FILED</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ORDER REF</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">CUSTOMER</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">RETURN REASON</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">RETURNED ITEMS</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">ITEM VALUE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">STATUS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-20 min-w-[80px]">
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && returnRequests.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#01390f]" />
                        <span>Loading returns masterlist...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RotateCcw className="w-6 h-6 text-slate-300" />
                        <span>No return requests found matching your search or filter criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((req) => {
                    const customerName = req.customerName || req.userId || 'Customer';
                    const reqDate = new Date(req.createdAt || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const orderIdStr =
                      req.orderId?._id?.slice(-8).toUpperCase() ||
                      req.orderId?.slice(-8).toUpperCase() ||
                      'N/A';
                    const itemsSummary = req.items
                      ?.map((it) => `${it.name || 'Item'} (x${it.quantity || 1})`)
                      .join(', ');
                    const itemValue = Number(req.refundAmount || req.returnValue || req.totalAmount || 0).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    );

                    return (
                      <tr
                        key={req._id}
                        onClick={() => openRmaDrawer(req)}
                        className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      >
                        {/* Return ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap min-w-[150px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                            #RMA-{req._id?.slice(-8).toUpperCase()}
                          </span>
                        </td>

                        {/* Date Filed */}
                        <td className="py-3.5 px-4 text-slate-500 font-mono whitespace-nowrap">
                          {reqDate}
                        </td>

                        {/* Order Ref */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[#01390f] whitespace-nowrap">
                          #{orderIdStr}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{customerName}</span>
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                              {req.userId || 'Mhira Shopper'}
                            </span>
                          </div>
                        </td>

                        {/* Return Reason */}
                        <td className="py-3.5 px-4 text-slate-700 max-w-[180px] truncate" title={req.reason || 'N/A'}>
                          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200/70 text-xs font-medium truncate">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">{req.reason || 'Damaged / Defective'}</span>
                          </span>
                        </td>

                        {/* Returned Items */}
                        <td className="py-3.5 px-4 text-slate-700 max-w-[200px] truncate" title={itemsSummary}>
                          <span className="inline-flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-md font-semibold border border-cyan-200/70 uppercase truncate max-w-full">
                            {itemsSummary || 'No items recorded'}
                          </span>
                        </td>

                        {/* Item Value */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#01390f] whitespace-nowrap text-sm">
                          ₱{itemValue}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(req.status)}
                        </td>

                        {/* ACTION CELL - EYE ICON ONLY (STICKY RIGHT) */}
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-3 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-20 min-w-[80px]"
                        >
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => openRmaDrawer(req)}
                              title="View & Process Return"
                              aria-label="View & Process Return"
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* 5. SLIDE-OVER SIDEBAR DRAWER (REPLACES CENTER MODAL) */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 overflow-hidden font-['Poppins',sans-serif]">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedReturn(null)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Slide-over Container (Right Side) */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
              
              {/* DRAWER TOP BAR HEADER */}
              <div className="p-6 bg-slate-50/90 border-b border-slate-200/80 flex items-start justify-between shrink-0">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      {selectedReturn.customerName || selectedReturn.userId || 'Return Request'}
                    </h2>
                    {getStatusBadge(selectedReturn.status)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#01390f]" />
                      <span>RMA #{selectedReturn._id?.slice(-8).toUpperCase()}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3 text-slate-400" />
                      <span>Order #{selectedReturn.orderId?._id?.slice(-8).toUpperCase() || selectedReturn.orderId?.slice(-8).toUpperCase() || 'N/A'}</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200 flex items-center justify-center transition-all cursor-pointer text-sm font-bold shadow-2xs"
                  title="Close Sidebar"
                >
                  ✕
                </button>
              </div>

              {/* DRAWER SCROLLABLE CONTENT */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs sm:text-sm">
                
                {/* 3-CARD SUMMARY STATS */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RMA STATUS</span>
                    <span className="font-bold text-slate-900 mt-1">
                      {(selectedReturn.status || 'Pending').toUpperCase()}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DATE FILED</span>
                    <span className="font-mono font-bold text-slate-900 mt-1">
                      {new Date(selectedReturn.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RETURN VALUE</span>
                    <span className="font-mono font-black text-[#01390f] text-sm mt-1">
                      ₱{Number(selectedReturn.refundAmount || selectedReturn.returnValue || selectedReturn.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* WORKFLOW PROGRESS STEPPER PIPELINE */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      RMA LIFECYCLE WORKFLOW
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#01390f]">
                      Stage {Math.max(1, getWorkflowStepIndex(selectedReturn.status) + 1)} of 5
                    </span>
                  </div>

                  {/* Visual Step Progress Line */}
                  <div className="relative flex items-center justify-between pt-2">
                    <div className="absolute left-4 right-4 top-5 h-0.5 bg-slate-200 z-0" />
                    <div
                      className="absolute left-4 top-5 h-0.5 bg-[#01390f] transition-all duration-500 z-0"
                      style={{
                        width: `${Math.max(0, Math.min(100, (getWorkflowStepIndex(selectedReturn.status) / (workflowSteps.length - 1)) * 100))}%`
                      }}
                    />

                    {workflowSteps.map((step, idx) => {
                      const currentIdx = getWorkflowStepIndex(selectedReturn.status);
                      const isPassed = idx < currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shadow-2xs ${
                              isPassed
                                ? 'bg-[#01390f] text-white'
                                : isCurrent
                                ? 'bg-[#01390f] text-white ring-4 ring-[#01390f]/20 scale-110'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <span
                            className={`text-[10px] font-bold text-center max-w-[70px] leading-tight ${
                              isCurrent
                                ? 'text-[#01390f]'
                                : isPassed
                                ? 'text-slate-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* WORKFLOW STAGE TABS */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab('review')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeDrawerTab === 'review'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    RMA Review
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab('action')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeDrawerTab === 'action'
                        ? 'bg-[#01390f] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Warehouse & Action
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab('customer')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeDrawerTab === 'customer'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Customer & Reason
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab('slip')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeDrawerTab === 'slip'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Return Slip PDF
                  </button>
                </div>

                {/* TAB 1: RMA REVIEW WORKSPACE */}
                {activeDrawerTab === 'review' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#01390f] text-white flex items-center justify-center">
                          <RotateCcw className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">RMA Claim Inspection</h4>
                          <p className="text-[11px] text-slate-500">
                            Reason: <strong className="text-slate-800">{selectedReturn.reason || 'Damaged / Broken Item'}</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadReturnPdf(selectedReturn)}
                        className="bg-white hover:bg-emerald-100 text-[#01390f] border border-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>RMA Slip</span>
                      </button>
                    </div>

                    {/* Returned Items List */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Returned Product(s) Breakdown
                      </span>
                      <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                        {selectedReturn.items?.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-[#01390f]/50 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-mono text-xs font-bold">
                                #{idx + 1}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-xs">
                                  {it.name || 'Mhira Natural Product'}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  Qty: {it.quantity || 1} • Unit Price: ₱{Number(it.price || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <span className="font-mono font-bold text-slate-900 text-xs">
                              ₱{Number((it.price || 0) * (it.quantity || 1)).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer Reason / Remarks */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Customer Explanation & Notes:
                      </span>
                      <p className="text-xs font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed italic">
                        &quot;{selectedReturn.comments || 'No customer comments provided.'}&quot;
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 2: WAREHOUSE & ACTION WORKSPACE */}
                {activeDrawerTab === 'action' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                          QUALITY ASSURANCE & DISPOSITION WORKSPACE
                        </span>
                        <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-white">
                          Status: {selectedReturn.status || 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Inspect returned merchandise condition and specify the physical disposition. Goods in acceptable condition can be restocked, while compromised/damaged items are diverted to loss prevention scrap logging.
                      </p>
                    </div>

                    {/* RESTOCK STRATEGY: RADIO SELECTION CARDS */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                        <span>Restock & Disposition Decision *</span>
                        <span className="text-[10px] font-mono text-[#01390f] font-bold">Loss Prevention Control</span>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Option 1: Return to Inventory */}
                        <label
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                            restockAction === 'Return to Inventory'
                              ? 'border-[#01390f] bg-emerald-50/50 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="restockActionChoice"
                            value="Return to Inventory"
                            checked={restockAction === 'Return to Inventory'}
                            onChange={(e) => setRestockAction(e.target.value)}
                            className="mt-1 accent-[#01390f]"
                          />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                              <Boxes className="w-3.5 h-3.5 text-[#01390f]" />
                              <span>Return to Inventory</span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 leading-snug">
                              Restock returned units back into finished goods inventory (+qty).
                            </span>
                          </div>
                        </label>

                        {/* Option 2: Dispose / Scrap */}
                        <label
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                            restockAction === 'Dispose/Scrap'
                              ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="restockActionChoice"
                            value="Dispose/Scrap"
                            checked={restockAction === 'Dispose/Scrap'}
                            onChange={(e) => setRestockAction(e.target.value)}
                            className="mt-1 accent-rose-600"
                          />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Dispose / Scrap</span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 leading-snug">
                              Damaged/expired items. Strictly log to Scrap Audit Log (No restock).
                            </span>
                          </div>
                        </label>

                        {/* Option 3: Send Replacement to Client */}
                        <label
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                            restockAction === 'Send Replacement to Client'
                              ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="restockActionChoice"
                            value="Send Replacement to Client"
                            checked={restockAction === 'Send Replacement to Client'}
                            onChange={(e) => setRestockAction(e.target.value)}
                            className="mt-1 accent-blue-600"
                          />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                              <Truck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Send Replacement</span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 leading-snug">
                              Dispatch brand-new items to client (-qty). Moves order back to 'To Receive'.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* MANDATORY APPROVER / INSPECTOR NAME FIELD */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        <span>Approver / Inspector Name </span>
                        <span className="text-rose-600">*</span>
                        <span className="text-[10px] text-slate-400 font-normal lowercase ml-1">
                          (strictly required to prevent shrinkage/theft)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        placeholder="e.g., QC Inspector Juan Cruz / Warehouse Supervisor"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#01390f] shadow-2xs font-semibold"
                      />
                    </div>

                    {/* SCRAP REASON INPUT (IF DISPOSE / SCRAP SELECTED) */}
                    {restockAction === 'Dispose/Scrap' && (
                      <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 space-y-2 animate-in fade-in duration-200">
                        <label className="text-xs font-bold text-rose-900 uppercase tracking-wider block">
                          <span>Reason for Rejection / Scrap Disposal </span>
                          <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={dispositionReason}
                          onChange={(e) => setDispositionReason(e.target.value)}
                          placeholder="e.g., Broken bottle seal / contaminated formula / leaking container"
                          className="w-full bg-white border border-rose-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-rose-600 shadow-2xs"
                        />
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-800 pt-1">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Items will NOT return to available stock. Automatic audit record will be logged under Order #{selectedReturn.orderId?._id?.slice(-8) || selectedReturn.orderId?.slice(-8) || 'N/A'}.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* REPLACEMENT DISPATCH INPUTS (IF SEND REPLACEMENT TO CLIENT SELECTED) */}
                    {restockAction === 'Send Replacement to Client' && (
                      <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-blue-700 shrink-0" />
                          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                            Replacement Dispatch Waybill & Courier Details
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
                              Courier Partner *
                            </label>
                            <select
                              value={replacementCourier}
                              onChange={(e) => setReplacementCourier(e.target.value)}
                              className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:border-blue-600 outline-none"
                            >
                              <option value="J&T Express">J&T Express</option>
                              <option value="Ninja Van">Ninja Van</option>
                              <option value="Flash Express">Flash Express</option>
                              <option value="Lalamove">Lalamove</option>
                              <option value="SPX Express">SPX Express</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
                              Replacement Tracking / Waybill No. *
                            </label>
                            <input
                              type="text"
                              value={replacementTracking}
                              onChange={(e) => setReplacementTracking(e.target.value)}
                              placeholder="e.g., JT94829104820"
                              className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-blue-600 outline-none"
                            />
                          </div>
                        </div>
                        <div className="text-[11px] text-blue-800 bg-blue-100/50 p-2.5 rounded-xl border border-blue-200/60 leading-snug">
                          Approving this replacement will automatically deduct inventory (–qty) from products and move the original Order #{selectedReturn.orderId?._id?.slice(-8) || selectedReturn.orderId?.slice(-8) || 'N/A'} back to <strong>"To Receive"</strong> so the customer can track the replacement delivery.
                        </div>
                      </div>
                    )}

                    {/* Inspection Remarks Input */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Warehouse QC Notes & Inspection Remarks:
                      </label>
                      <textarea
                        rows={2}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Enter quality control inspection notes or reason for approval/rejection..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-[#01390f] shadow-2xs leading-relaxed"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Take Official RMA Decision:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => handleStatusUpdate(selectedReturn._id, 'Approved')}
                          className={`p-3.5 rounded-xl border text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95 disabled:opacity-50 ${
                            restockAction === 'Return to Inventory'
                              ? 'border-emerald-300 bg-emerald-600 hover:bg-emerald-700'
                              : restockAction === 'Send Replacement to Client'
                              ? 'border-blue-300 bg-blue-600 hover:bg-blue-700'
                              : 'border-amber-400 bg-amber-600 hover:bg-amber-700'
                          }`}
                        >
                          {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span>
                            {restockAction === 'Return to Inventory'
                              ? 'Approve & Restock (+ Stock)'
                              : restockAction === 'Send Replacement to Client'
                              ? 'Approve & Dispatch Replacement (- Stock)'
                              : 'Approve & Log Scrap (No Restock)'}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => handleStatusUpdate(selectedReturn._id, 'Rejected')}
                          className="p-3.5 rounded-xl border border-rose-300 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95 disabled:opacity-50"
                        >
                          {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          <span>Decline / Reject RMA</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: CUSTOMER & REASON */}
                {activeDrawerTab === 'customer' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Customer & Order Reference Profile
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-500">Customer Name:</span>
                          <span className="font-bold text-slate-900">
                            {selectedReturn.customerName || selectedReturn.userId || 'Customer'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-500">Customer ID:</span>
                          <span className="font-mono text-slate-800">
                            {selectedReturn.userId || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-500">Associated Order ID:</span>
                          <span className="font-mono font-bold text-[#01390f]">
                            #{selectedReturn.orderId?._id?.slice(-8).toUpperCase() || selectedReturn.orderId?.slice(-8).toUpperCase() || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-slate-500">Return Reason Category:</span>
                          <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {selectedReturn.reason || 'Damaged Item'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: RETURN SLIP PDF */}
                {activeDrawerTab === 'slip' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#01390f]/10 text-[#01390f] flex items-center justify-center mx-auto">
                        <Printer className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Official Return Authorization (RMA) Slip</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Generate and download a branded, ready-to-print PDF return slip containing RMA metadata, returned items list, and warehouse inspection signatures.
                      </p>

                      <div className="pt-2 flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadReturnPdf(selectedReturn)}
                          className="bg-[#01390f] hover:bg-[#051609] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                        >
                          <FileDown className="w-4 h-4" />
                          <span>Download RMA Slip PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* DRAWER FOOTER ACTIONS */}
              <div className="p-4 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadReturnPdf(selectedReturn)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer border border-rose-200 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileDown className="w-3.5 h-3.5 text-rose-600" />
                  <span>RMA Slip PDF</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReturn(null)}
                    className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                  >
                    Close
                  </button>

                  {selectedReturn.status?.toLowerCase() === 'pending' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusUpdate(selectedReturn._id, 'Approved')}
                      className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Approve Return</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REJECTION & SCRAP AUDIT LOG MODAL (MATCHING ADD RAW MATERIAL / PRODUCT STANDARD)
          ========================================================================= */}
      {isScrapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[88vh] sm:max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER (NO ICON IN TITLE) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                  Rejection & Scrap Audit Log
                </h3>
                <span className="text-[10px] bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full font-mono font-bold border border-rose-200">
                  Anti-Shrinkage Audit
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualScrapModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-[#01390f] hover:bg-[#051609] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Scrap Manually</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsScrapModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar (Clean, no icons) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-3.5 bg-slate-50/90 border-b border-slate-200/80 shrink-0 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                <span className="text-slate-500 font-medium">Total Audit Records:</span>
                <span className="font-mono font-black text-slate-900 text-sm">{scrapLogs.length}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                <span className="text-slate-500 font-medium">Total Quantity Scrapped:</span>
                <span className="font-mono font-black text-rose-600 text-sm">
                  {scrapLogs.reduce((acc, cur) => acc + (Number(cur.quantity) || 0), 0).toLocaleString()} units
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                <span className="text-slate-500 font-medium">Mandatory Attribution:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                  100% Enforced
                </span>
              </div>
            </div>

            {/* Search & Category Filter Toolbar */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={scrapSearch}
                  onChange={(e) => setScrapSearch(e.target.value)}
                  placeholder="Search item, batch/order, approver, reason..."
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#01390f] transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                {['All', 'Customer Return', 'Finished Product', 'Raw Material', 'WIP / In-Production'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setScrapFilterType(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      scrapFilterType === type
                        ? 'bg-[#01390f] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* TABLE PAGINATION */}
            <TablePagination
              currentPage={scrapPage}
              totalItems={filteredScrapLogs.length}
              itemsPerPage={scrapPerPage}
              onPageChange={setScrapPage}
              onRowsPerPageChange={(rows) => {
                setScrapPerPage(rows);
                setScrapPage(1);
              }}
            />

            {/* Logs Table (Green header matching inventory standard, clean row cells) */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loadingScrapLogs ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-[#01390f]" />
                  <span className="text-xs font-semibold">Loading rejection & scrap audit trail...</span>
                </div>
              ) : filteredScrapLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
                  <span className="text-xs font-semibold">No scrap or rejection records found matching your filters.</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-[#01390f] text-white font-bold uppercase text-[11px] whitespace-nowrap z-10">
                    <tr>
                      <th className="py-3 px-4 font-mono">LOG ID</th>
                      <th className="py-3 px-4">TIMESTAMP</th>
                      <th className="py-3 px-4">ITEM NAME & CODE</th>
                      <th className="py-3 px-4">TYPE</th>
                      <th className="py-3 px-4 font-mono">BATCH / REF ID</th>
                      <th className="py-3 px-4 text-right font-mono">SCRAP QTY</th>
                      <th className="py-3 px-4">REASON FOR REJECTION</th>
                      <th className="py-3 px-4">INSPECTOR / APPROVER</th>
                      <th className="py-3 px-4 text-center">DISPOSITION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedScrapLogs.map((log) => (
                      <tr key={log._id || log.logId} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {log.logId}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt || Date.now()).toLocaleDateString()} {new Date(log.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <span className="font-bold text-slate-900 block truncate">{log.itemName}</span>
                          {log.itemCode && <span className="text-[10px] text-slate-400 font-mono">{log.itemCode}</span>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.itemType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#01390f] whitespace-nowrap">
                          #{log.batchId}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap text-sm">
                          {Number(log.quantity).toLocaleString()} {log.uom || 'pcs'}
                        </td>
                        <td className="py-3 px-4 max-w-[220px]">
                          <span className="text-slate-700 text-xs truncate block" title={log.reason}>
                            {log.reason}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                            {log.approverName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                            {log.disposition || 'Scrap / Dispose'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ACTION BUTTONS FOOTER */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-between shrink-0 whitespace-nowrap">
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredScrapLogs.length}</strong> of{' '}
                <strong className="text-slate-800">{scrapLogs.length}</strong> recorded audit events
              </span>
              <button
                type="button"
                onClick={() => setIsScrapModalOpen(false)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MANUAL SCRAP LOGGING MODAL (MATCHING ADD RAW MATERIAL / PRODUCT STANDARD)
          ========================================================================= */}
      {isManualScrapModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER (NO ICON IN TITLE) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                Record Scrap & Rejection
              </h3>
              <button
                type="button"
                onClick={() => setIsManualScrapModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleCreateManualScrap} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              {/* SCROLLABLE BODY */}
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap text-xs">
                      Item Category *
                    </label>
                    <select
                      value={manualScrapForm.itemType}
                      onChange={(e) => setManualScrapForm({ ...manualScrapForm, itemType: e.target.value })}
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#01390f] transition-all cursor-pointer"
                    >
                      <option value="Customer Return">Customer Return</option>
                      <option value="Finished Product">Finished Product</option>
                      <option value="Raw Material">Raw Material</option>
                      <option value="WIP / In-Production">WIP / In-Production</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap text-xs">
                      Batch ID / Order Ref *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., BATCH-2026-001"
                      value={manualScrapForm.batchId}
                      onChange={(e) => setManualScrapForm({ ...manualScrapForm, batchId: e.target.value })}
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#01390f] transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap text-xs">
                    Item / Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Argan Oil Hair Conditioner 250ml"
                    value={manualScrapForm.itemName}
                    onChange={(e) => setManualScrapForm({ ...manualScrapForm, itemName: e.target.value })}
                    className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#01390f] transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap text-xs">
                      Quantity Scrapped *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      placeholder="e.g., 5"
                      value={manualScrapForm.quantity}
                      onChange={(e) => setManualScrapForm({ ...manualScrapForm, quantity: e.target.value })}
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#01390f] transition-all font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap text-xs">
                      UOM
                    </label>
                    <input
                      type="text"
                      placeholder="pcs / kg"
                      value={manualScrapForm.uom}
                      onChange={(e) => setManualScrapForm({ ...manualScrapForm, uom: e.target.value })}
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#01390f] transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap text-xs">
                    Reason for Rejection / Scrap *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Broken dispenser bottle / mold contamination"
                    value={manualScrapForm.reason}
                    onChange={(e) => setManualScrapForm({ ...manualScrapForm, reason: e.target.value })}
                    className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#01390f] transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap text-xs">
                    Approver / Inspector Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., QC Inspector Juan Cruz"
                    value={manualScrapForm.approverName}
                    onChange={(e) => setManualScrapForm({ ...manualScrapForm, approverName: e.target.value })}
                    className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#01390f] transition-all font-semibold"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsManualScrapModalOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingManualScrap}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {savingManualScrap ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{savingManualScrap ? 'Saving Entry...' : 'Save Scrap Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogisticsReturnManagement;
