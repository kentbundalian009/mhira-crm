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
  History,
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
  FileText,
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

import { API_URL as API_BASE_URL } from "../utils/apiConfig";

function LogisticsReturnManagement() {
  const [returnRequests, setReturnRequests] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_logistics_returns');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
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
  const [activeDrawerTab, setActiveDrawerTab] = useState('customer'); // 'customer' | 'action' | 'slip'
  const [updating, setUpdating] = useState(false);

  // Refund Restocking & Scrap Disposition
  const [restockAction, setRestockAction] = useState('Return to Inventory'); // 'Return to Inventory' | 'Dispose/Scrap' | 'Send Replacement to Client'
  const [replacementCourier, setReplacementCourier] = useState('J&T Express');
  const [replacementTracking, setReplacementTracking] = useState('');
  const getLoggedInUserName = () => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
      return u.name || u.fullName || u.username || 'Logistics Officer';
    } catch (e) {
      return 'Logistics Officer';
    }
  };
  const [approverName, setApproverName] = useState(() => getLoggedInUserName());
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
        } catch (e) { }
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
    setApproverName(req.approverName || getLoggedInUserName());
    setDispositionReason(req.dispositionReason || req.reason || '');
    if ((req.status || '').toLowerCase() !== 'pending') {
      setActiveDrawerTab('customer');
    }
  };

  const handleStatusUpdate = async (returnId, newStatus) => {
    try {
      if (newStatus === 'Approved') {
        if (restockAction === 'Send Replacement to Client') {
          if (!replacementTracking || !replacementTracking.trim()) {
            showErrorToast('Replacement Waybill / Tracking number is required when sending a replacement to client.');
            return;
          }
        }
      }

      setUpdating(true);
      const autoApprover = (approverName || getLoggedInUserName()).trim();
      const payload = {
        status: newStatus,
        adminNotes: adminNotes.trim(),
      };

      if (newStatus === 'Approved') {
        payload.restockAction = restockAction;
        payload.approverName = autoApprover;
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
      setActiveDrawerTab('customer');

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

      const officer = (returnItem.approverName || approverName || getLoggedInUserName()).toUpperCase();
      doc.text(officer, 14, signY - 2);
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
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-800 border border-yellow-300 px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
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
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0">
          <div className="flex items-center gap-1 -mb-px">
            {/* 1. All Returns Master Sheet */}
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap rounded-t-lg ${activeTab === 'all'
                ? 'border-[#01390f] text-[#01390f] bg-slate-50 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#01390f]" />
              <span>All Returns</span>
            </button>

            {/* 2. Pending Review Notification Tab */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'pending' ? 'all' : 'pending')}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap rounded-t-lg ${activeTab === 'pending'
                ? (counts.pending || 0) > 0
                  ? 'border-[#c81e1e] text-[#c81e1e] bg-red-50/80 font-bold shadow-2xs'
                  : 'border-[#01390f] text-[#01390f] bg-slate-50 font-bold'
                : (counts.pending || 0) > 0
                  ? 'border-transparent text-slate-600 hover:text-[#c81e1e] hover:bg-red-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              title="Filter by Pending Return Requests"
            >
              {(counts.pending || 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#c81e1e] shrink-0 animate-pulse" />
              )}
              <span>Pending Review</span>
              {(counts.pending || 0) > 0 && (
                <span
                  className={`h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 leading-none shadow-xs ${counts.pending > 99 ? 'min-w-5 px-1' : 'w-5 aspect-square'
                    } ${activeTab === 'pending'
                      ? 'bg-[#c81e1e] text-white'
                      : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  title={`${counts.pending} Pending Return Requests`}
                >
                  {counts.pending > 99 ? '99+' : counts.pending}
                </span>
              )}
            </button>

            {/* 3. Approved Sheet Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('approved')}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap rounded-t-lg ${activeTab === 'approved'
                ? 'border-[#01390f] text-[#01390f] bg-slate-50 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
            >
              <span>Approved</span>
            </button>

            {/* 4. Rejected Sheet Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap rounded-t-lg ${activeTab === 'rejected'
                ? 'border-[#01390f] text-[#01390f] bg-slate-50 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
            >
              <span>Rejected</span>
            </button>
          </div>
        </div>

        {/* MS EXCEL-STYLE RIBBON TOOLBAR (RESPONSIVE: STACKS ON MOBILE, 1 ROW ON DESKTOP) */}
        <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
          {/* ACTIONS GROUP */}
          <div className="w-full lg:w-[256px] shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]">
            <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => handleDownloadReturnsSummaryPdf(filteredRequests)}
                className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                title="Export Returns Summary Report PDF"
              >
                <FileDown className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                  Export<br />PDF
                </span>
              </button>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                <button
                  type="button"
                  onClick={handleOpenScrapModal}
                  className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-red-50 text-red-700 hover:text-red-800 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                  title="Loss Prevention & Scrap Audit Log"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="truncate">Scrap Audit Log</span>
                </button>
                <button
                  type="button"
                  onClick={fetchReturnRequests}
                  className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-[#01390f] transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                  <span className="truncate">Refresh Returns</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="truncate">Reset Filters</span>
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
              Actions
            </div>
          </div>

          {/* SEARCH & FILTER GROUP */}
          <div className="flex flex-col justify-between flex-1 min-h-0 lg:min-h-[92px] lg:pl-1">
            <div className="flex flex-col justify-between flex-1 py-0.5 space-y-2 lg:space-y-1">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                {/* Date Picker */}
                <div
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker();
                    } catch (err) { }
                  }}
                  className="relative w-full cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <input
                    ref={dateInputRef}
                    type="date"
                    placeholder="mm/dd/yyyy"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) { }
                    }}
                    onFocus={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) { }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' || e.key === 'Delete') {
                        setSelectedDate('');
                      } else if (e.key !== 'Tab' && e.key !== 'Escape') {
                        e.preventDefault();
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) { }
                      }
                    }}
                    className={`w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border rounded pl-7 pr-5 focus:outline-none focus:border-[#153E97] focus:bg-white text-slate-700 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer shadow-2xs ${selectedDate ? 'border-[#153E97] bg-blue-50/30 font-semibold text-[#153E97]' : 'border-slate-200'
                      }`}
                  />
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate('');
                      }}
                      className="absolute right-1.5 top-1 text-slate-400 hover:text-red-600 cursor-pointer"
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
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
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
                <div className="relative w-full sm:col-span-2 md:col-span-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'pending' ? 'all' : 'pending')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${activeTab === 'pending'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                >
                  Pending Review
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'approved' ? 'all' : 'approved')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${activeTab === 'approved'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
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
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs sm:col-span-2 md:col-span-1 ${selectedDate === new Date().toISOString().split('T')[0]
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                >
                  Today's Returns
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
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
                  <th className="py-3.5 px-4 whitespace-nowrap text-center">DATE FILED</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ORDER REF</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">CUSTOMER NAME</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">CUSTOMER EMAIL</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-20 min-w-[80px]">
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && returnRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#01390f]" />
                        <span>Loading returns masterlist...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RotateCcw className="w-6 h-6 text-slate-300" />
                        <span>No return requests found matching your search or filter criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((req) => {
                    const customerName = req.customerName || req.orderId?.customerName || req.userId || 'Customer';
                    const customerEmail =
                      req.customerEmail ||
                      req.orderId?.customerEmail ||
                      req.orderId?.userId?.email ||
                      (req.userId && req.userId.includes('@')
                        ? req.userId
                        : `${(req.customerName || 'customer').toLowerCase().replace(/\s+/g, '')}@gmail.com`);
                    const reqDate = new Date(req.createdAt || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const orderIdStr =
                      req.orderId?._id?.slice(-8).toUpperCase() ||
                      req.orderId?.slice(-8).toUpperCase() ||
                      'N/A';

                    return (
                      <tr
                        key={req._id}
                        onClick={() => openRmaDrawer(req)}
                        className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm cursor-pointer"
                      >
                        {/* 1. RETURN ID */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-slate-900 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          #RMA-{req._id?.slice(-8).toUpperCase()}
                        </td>

                        {/* 2. DATE FILED */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-600 whitespace-nowrap font-medium bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {reqDate}
                        </td>

                        {/* 3. ORDER REF */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-[#01390f] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          #{orderIdStr}
                        </td>

                        {/* 4. CUSTOMER NAME */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-xs text-slate-900 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {customerName}
                        </td>

                        {/* 5. CUSTOMER EMAIL */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {customerEmail}
                        </td>

                        {/* 6. ACTION (Sticky Right) */}
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-20 min-w-[80px] transition-colors"
                        >
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => openRmaDrawer(req)}
                              title="View & Process Return"
                              aria-label="View & Process Return"
                              className="relative w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 group/btn"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600 group-hover/btn:text-white transition-colors" />
                              {(req.status || '').toLowerCase() === 'pending' && (
                                <span
                                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#c81e1e] border-2 border-white animate-pulse"
                                  title="Pending Return Review"
                                />
                              )}
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
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm shrink-0"
                  title="Close Sidebar"
                >
                  ✕
                </button>
              </div>

              {/* DRAWER TABS BAR (Return Process & Action Tabs) */}
              <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
                {/* Left Side: Return Process (Pill Button with Text) */}
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab("process")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${activeDrawerTab === "process"
                    ? "bg-[#01390f] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Return Process</span>
                </button>

                {/* Right Side: Circular Icon Action Tabs (Customer Records, Action, PDF) */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab("customer")}
                    title="Customer Records"
                    aria-label="Customer Records"
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${activeDrawerTab === "customer" || activeDrawerTab === "review"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                  >
                    <User className="w-4 h-4" />
                  </button>

                  {/* Warehouse & Action (Only available in Pending Review) */}
                  {selectedReturn.status?.toLowerCase() === 'pending' && (
                    <button
                      type="button"
                      onClick={() => setActiveDrawerTab("action")}
                      title="Warehouse & Action"
                      aria-label="Warehouse & Action"
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${activeDrawerTab === "action"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                        }`}
                    >
                      <Boxes className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab("slip")}
                    title="Return Slip PDF"
                    aria-label="Return Slip PDF"
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${activeDrawerTab === "slip"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* DRAWER SCROLLABLE CONTENT */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs sm:text-sm">

                {/* TAB: RMA PROCESS AUDIT */}
                {activeDrawerTab === 'process' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Process Audit
                      </span>

                      {(() => {
                        const statusLower = (selectedReturn.status || '').toLowerCase();
                        const currentStepIdx = getWorkflowStepIndex(selectedReturn.status);

                        const displayTimeline = [];

                        // Stage 5: Restocked / Closed
                        if (currentStepIdx >= 4 || statusLower === 'restocked' || statusLower === 'completed') {
                          displayTimeline.push({
                            title: "Restocked & Settled",
                            description: "Approved return items physically restocked to inventory or scrapped per disposition report.",
                            timestamp: selectedReturn.updatedAt || new Date(),
                          });
                        }

                        // Stage 4: Warehouse Check
                        if (currentStepIdx >= 3 || statusLower === 'warehouse check') {
                          displayTimeline.push({
                            title: "Warehouse Check & Inspection",
                            description: `Warehouse QA inspector checked parcel condition. Approver: ${selectedReturn.approverName || approverName || 'QC Supervisor'}.`,
                            timestamp: selectedReturn.updatedAt || new Date(),
                          });
                        }

                        // Stage 3: In Transit
                        if (currentStepIdx >= 2 || statusLower === 'in transit') {
                          displayTimeline.push({
                            title: "In Transit to Warehouse",
                            description: "Return parcel is in transit back to the warehouse facility via courier carrier.",
                            timestamp: selectedReturn.updatedAt || new Date(),
                          });
                        }

                        // Stage 2: RMA Review
                        if (currentStepIdx >= 1 || statusLower === 'approved' || statusLower === 'rejected' || statusLower === 'pending') {
                          displayTimeline.push({
                            title: "RMA Claim Review",
                            description: `Logistics team evaluated return claim. Reason: ${selectedReturn.reason || 'Damaged Item'}. Action: ${selectedReturn.restockAction || restockAction}.`,
                            timestamp: selectedReturn.updatedAt || new Date(),
                          });
                        }

                        // Stage 1: Request Filed
                        displayTimeline.push({
                          title: "Return Request Filed",
                          description: `Customer submitted RMA claim for Order #${selectedReturn.orderId?._id?.slice(-8).toUpperCase() || selectedReturn.orderId?.slice(-8).toUpperCase() || 'N/A'}. Return Value: ₱${Number(selectedReturn.refundAmount || selectedReturn.returnValue || selectedReturn.totalAmount || 0).toFixed(2)}.`,
                          timestamp: selectedReturn.createdAt || new Date(),
                        });

                        return (
                          <div className="space-y-4 border-l-2 border-blue-200 ml-2.5 pl-4 py-1">
                            {displayTimeline.map((item, tIdx) => {
                              let formattedDateTime = "";
                              if (item.timestamp) {
                                const d = new Date(item.timestamp);
                                if (!isNaN(d.getTime())) {
                                  formattedDateTime = `${d.toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })} ${d.toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}`;
                                }
                              }

                              return (
                                <div key={tIdx} className="relative space-y-1">
                                  {/* Timeline node */}
                                  <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white bg-blue-600" />
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                                      {tIdx === 0 && (
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    {formattedDateTime && (
                                      <span className="text-[11px] font-mono text-slate-400">
                                        {formattedDateTime}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed">
                                    {item.description}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* TAB 1: CUSTOMER RECORDS & RMA BREAKDOWN */}
                {(activeDrawerTab === 'customer' || activeDrawerTab === 'review') && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Customer & Order Reference Records */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Customer Records
                      </span>
                      <div className="bg-white rounded-xl border border-slate-200/80 p-3 space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Customer Name:</span>
                          <span className="font-bold text-slate-900">
                            {selectedReturn.customerName || selectedReturn.userId || 'Customer'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Customer ID:</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {selectedReturn.userId || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Associated Order ID:</span>
                          <span className="font-mono font-bold text-[#01390f]">
                            #{selectedReturn.orderId?._id?.slice(-8).toUpperCase() || selectedReturn.orderId?.slice(-8).toUpperCase() || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-medium">Return Reason Category:</span>
                          <span className="font-bold text-yellow-800 bg-yellow-50 px-2 py-0.5 rounded-full text-[10px] border border-yellow-300">
                            {selectedReturn.reason || 'Damaged / Broken Item'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Returned Product(s) Breakdown - Same UI as Order Placed table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Returned Product(s) Breakdown
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {selectedReturn.items?.length || 0} {selectedReturn.items?.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-none overflow-hidden shadow-2xs max-h-72 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse rounded-none">
                          <tbody className="divide-y divide-slate-100">
                            {selectedReturn.items?.map((it, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-2.5 w-14 align-middle">
                                  <div className="w-10 h-10 rounded-none bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                    {it.image ? (
                                      <img src={it.image} alt={it.name || 'Product'} className="w-full h-full object-cover rounded-none" />
                                    ) : (
                                      <Package className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                </td>
                                <td className="p-2.5 align-middle min-w-0">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-slate-900 text-xs truncate">
                                      {it.name || 'Mhira Natural Product'}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400">
                                      Unit Price: ₱{Number(it.price || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2.5 align-middle text-center whitespace-nowrap w-24">
                                  <span className="px-2.5 py-1 text-xs font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-none inline-block whitespace-nowrap">
                                    Qty: {it.quantity || 1}
                                  </span>
                                </td>
                                <td className="p-2.5 align-middle text-right whitespace-nowrap pr-4">
                                  <span className="font-mono font-bold text-slate-900 text-xs">
                                    ₱{Number((it.price || 0) * (it.quantity || 1)).toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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

                {/* TAB 2: WAREHOUSE & ACTION WORKSPACE (Only visible in Pending Review) */}
                {activeDrawerTab === 'action' && selectedReturn.status?.toLowerCase() === 'pending' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1">
                      <div>
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                          Quality Assurance & Disposition
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Inspect returned merchandise condition and specify the physical disposition.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                        Status: {selectedReturn.status || 'Pending'}
                      </span>
                    </div>

                    {/* Restock & Disposition Decision & Warehouse QC Notes (Clean 2-Column Inputs matching Courier Partner UI) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Restock & Disposition Decision */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                          Restock & Disposition Decision *
                        </label>
                        <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                          <Boxes className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                          <select
                            value={restockAction}
                            onChange={(e) => setRestockAction(e.target.value)}
                            className="w-full h-9 bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
                          >
                            <option value="Return to Inventory">Return to Inventory (+qty finished goods)</option>
                            <option value="Dispose/Scrap">Dispose / Scrap (Log to Scrap Audit - No restock)</option>
                            <option value="Send Replacement to Client">Send Replacement to Client (-qty)</option>
                          </select>
                        </div>
                      </div>

                      {/* Warehouse QC Notes & Remarks */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                          Remarks
                        </label>
                        <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                          <input
                            type="text"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Inspection notes or remarks..."
                            className="w-full h-9 bg-transparent text-slate-800 text-xs font-semibold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Scrap Reason Input */}
                    {restockAction === 'Dispose/Scrap' && (
                      <div className="bg-red-50/60 p-3.5 rounded-xl border border-red-200 space-y-2 animate-in fade-in duration-200">
                        <label className="block text-[11px] font-bold text-red-900 uppercase tracking-wider">
                          Reason for Rejection / Scrap Disposal *
                        </label>
                        <input
                          type="text"
                          value={dispositionReason}
                          onChange={(e) => setDispositionReason(e.target.value)}
                          placeholder="e.g., Broken bottle seal / contaminated formula / leaking container"
                          className="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-red-600 shadow-2xs font-medium"
                        />
                      </div>
                    )}

                    {/* Replacement Dispatch Inputs */}
                    {restockAction === 'Send Replacement to Client' && (
                      <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-blue-700 shrink-0" />
                          <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                            Replacement Dispatch Details
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                              Courier Partner *
                            </label>
                            <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                              <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                              <select
                                value={replacementCourier}
                                onChange={(e) => setReplacementCourier(e.target.value)}
                                className="w-full h-9 bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
                              >
                                <option value="J&T Express">J&T Express</option>
                                <option value="Ninja Van">Ninja Van</option>
                                <option value="Flash Express">Flash Express</option>
                                <option value="Lalamove">Lalamove</option>
                                <option value="SPX Express">SPX Express</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                              Replacement Tracking No. *
                            </label>
                            <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                              <input
                                type="text"
                                value={replacementTracking}
                                onChange={(e) => setReplacementTracking(e.target.value)}
                                placeholder="e.g., JT94829104820"
                                className="w-full h-9 bg-transparent text-slate-800 text-xs font-mono font-bold focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: RETURN SLIP PDF */}
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

              {/* DRAWER FOOTER: Unified Clean Layout (Same as Order Placed) */}
              <div className="p-4 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center justify-between w-full">
                  {/* Left Side: Primary Action Button per Stage */}
                  {selectedReturn.status?.toLowerCase() === 'pending' ? (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusUpdate(selectedReturn._id, 'Approved')}
                      className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Approve Return</span>
                    </button>
                  ) : (
                    <span className="px-5 py-2.5 sm:py-3 rounded-full text-[12px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 flex items-center gap-1.5 whitespace-nowrap">
                      <Check className="w-3.5 h-3.5" />
                      <span>RMA {selectedReturn.status || 'Processed'}</span>
                    </span>
                  )}

                  {/* Right Side: Circular Reject Button (Same as Order Placed) */}
                  {selectedReturn.status?.toLowerCase() === 'pending' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusUpdate(selectedReturn._id, 'Rejected')}
                      title="Decline / Reject RMA"
                      aria-label="Decline / Reject RMA"
                      className="w-10 h-10 rounded-full border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5 text-red-600" />
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
                <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">
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
                <span className="font-mono font-black text-red-600 text-sm">
                  {scrapLogs.reduce((acc, cur) => acc + (Number(cur.quantity) || 0), 0).toLocaleString()} units
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                <span className="text-slate-500 font-medium">Mandatory Attribution:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[10px] border border-blue-200">
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
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${scrapFilterType === type
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
                      <tr
                        key={log._id || log.logId}
                        className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm"
                      >
                        {/* 1. LOG ID */}
                        <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                            {log.logId}
                          </span>
                        </td>

                        {/* 2. DATE & TIME */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {new Date(log.createdAt || Date.now()).toLocaleDateString()}{' '}
                          <span className="text-[11px] text-slate-500 font-normal">
                            {new Date(log.createdAt || Date.now()).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        {/* 3. ITEM NAME & CODE */}
                        <td
                          className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors max-w-[200px] truncate"
                          title={log.itemName}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-slate-900 truncate">
                              {log.itemName}
                            </span>
                            {log.itemCode && (
                              <span className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                                {log.itemCode}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. ITEM TYPE (Pill Badge) */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {log.itemType}
                          </span>
                        </td>

                        {/* 5. BATCH ID */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-xs text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          #{log.batchId}
                        </td>

                        {/* 6. QUANTITY / UOM (Accent Volume Column) */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                          {Number(log.quantity).toLocaleString()} {log.uom || 'pcs'}
                        </td>

                        {/* 7. REASON */}
                        <td
                          className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors max-w-[220px] truncate"
                          title={log.reason}
                        >
                          {log.reason || '—'}
                        </td>

                        {/* 8. APPROVER */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.approverName}
                          </span>
                        </td>

                        {/* 9. DISPOSITION (Status Tinted Cell) */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold transition-colors select-none bg-red-500/20 group-hover:bg-red-500/30 text-red-900">
                          <span>{log.disposition || 'Scrap / Dispose'}</span>
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
