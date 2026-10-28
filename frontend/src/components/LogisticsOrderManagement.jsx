import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShoppingBag,
  Search,
  Calendar,
  Truck,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Edit2,
  Eye,
  Loader2,
  RefreshCw,
  Package,
  Layers,
  ArrowRight,
  User,
  MapPin,
  Tag,
  ListPlus,
  FileDown,
  Download,
  Check,
  ChevronRight,
  Phone,
  Mail,
  Copy,
  Printer,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Filter,
  RotateCcw,
  FileSpreadsheet,
  ChevronDown,
  SlidersHorizontal,
  Lock,
  X,
  Camera,
  UploadCloud,
  CloudRain,
  AlertTriangle,
  FileImage,
  CalendarDays,
  ClipboardList
} from 'lucide-react';
import axios from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLiveSync, notifyLiveSync } from '../utils/liveSync';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';

const API_BASE_URL =
  import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com/api'
    : 'http://localhost:5000/api';

function LogisticsOrderManagement() {
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_logistics_orders');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('order-placed');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('All');
  const [selectedSort, setSelectedSort] = useState('newest');
  const dateInputRef = useRef(null);

  // Drawer / Selected Order State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('review'); // 'review' | 'dispatch' | 'customer' | 'invoice'
  const [selectedCourier, setSelectedCourier] = useState('J&T Express');
  const [trackingNumber, setTrackingNumber] = useState('');

  // Proof of Delivery (POD) States
  const [isPodModalOpen, setIsPodModalOpen] = useState(false);
  const [podImage, setPodImage] = useState('');
  const [podRecipientName, setPodRecipientName] = useState('');
  const [podNotes, setPodNotes] = useState('');
  const [isSubmittingPod, setIsSubmittingPod] = useState(false);
  const [viewingPodImage, setViewingPodImage] = useState(null);

  // Estimated Delivery Schedule & Weather Delay States
  const [eddRange, setEddRange] = useState('');
  const [eddIsDelayed, setEddIsDelayed] = useState(false);
  const [eddDelayReason, setEddDelayReason] = useState('');
  const [isSavingEdd, setIsSavingEdd] = useState(false);

  // Status mapping and counts
  const [filterCancelRequestsOnly, setFilterCancelRequestsOnly] = useState(false);
  const [isReviewingCancel, setIsReviewingCancel] = useState(false);

  const [counts, setCounts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_logistics_orders');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const initialCounts = {
            'order-placed': 0,
            'waiting-courier': 0,
            'in-transit': 0,
            delivered: 0,
            cancel: 0,
            all: parsed.length,
            'to-pay': 0,
            'to-ship': 0,
            'to-receive': 0,
            completed: 0,
            returns: 0,
            'cancel-requests': 0,
          };
          parsed.forEach((order) => {
            if (order.cancellationRequest?.status === 'Pending') {
              initialCounts['cancel-requests']++;
            }
            const rawStatus = (order.status || '').toLowerCase().replace(/\s+/g, '-');
            if (rawStatus === 'completed' || rawStatus === 'delivered' || rawStatus === 'to-review' || rawStatus === 'paid') {
              initialCounts['delivered']++;
              initialCounts['completed']++;
            } else if (
              rawStatus === 'returns' ||
              rawStatus === 'return' ||
              rawStatus === 'return-refund' ||
              rawStatus === 'returned' ||
              rawStatus === 'cancelled' ||
              rawStatus === 'cancel'
            ) {
              initialCounts['cancel']++;
              initialCounts['returns']++;
            } else if (rawStatus === 'to-pay' || rawStatus === 'pending' || rawStatus === 'order-placed') {
              initialCounts['order-placed']++;
              initialCounts['to-pay']++;
            } else if (rawStatus === 'to-ship' || rawStatus === 'processing' || rawStatus === 'preparing' || rawStatus === 'waiting-courier' || rawStatus === 'waiting-for-courier') {
              initialCounts['waiting-courier']++;
              initialCounts['to-ship']++;
            } else if (rawStatus === 'to-receive' || rawStatus === 'in-transit' || rawStatus === 'shipped' || rawStatus === 'out-for-delivery') {
              initialCounts['in-transit']++;
              initialCounts['to-receive']++;
            }
          });
          return initialCounts;
        }
      }
    } catch (e) {}
    return {
      'order-placed': 0,
      'waiting-courier': 0,
      'in-transit': 0,
      delivered: 0,
      cancel: 0,
      all: 0,
      'to-pay': 0,
      'to-ship': 0,
      'to-receive': 0,
      completed: 0,
      returns: 0,
      'cancel-requests': 0,
    };
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrders = async (silent = false) => {
    if (!silent && orders.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/orders`);
      const fetchedOrders = res.data || [];
      if (Array.isArray(fetchedOrders)) {
        setOrders(fetchedOrders);
        calculateCounts(fetchedOrders);
        try {
          localStorage.setItem('cached_logistics_orders', JSON.stringify(fetchedOrders));
        } catch (e) {}
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Map workflow status to matching drawer tab (Stage 1 -> review, Stage 2 -> dispatch, Stage 3 -> customer, Stage 4 -> invoice)
  const getTabForStatus = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('cancelled')) return 'review';
    if (s === 'completed' || s === 'paid') return 'invoice';
    if (s === 'to receive' || s === 'to-receive') return 'customer';
    if (s === 'to ship' || s === 'to-ship') return 'dispatch';
    return 'review'; // Order Placed / To Pay
  };

  const handleUpdateStatus = async (orderId, newStatus, extraData = {}) => {
    try {
      const payload = { status: newStatus, ...extraData };
      if (newStatus === 'To Receive') {
        payload.courier = payload.courier || selectedCourier || 'J&T Express';
        payload.trackingNumber = payload.trackingNumber || trackingNumber || '';
      }
      const res = await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, payload);
      if (res.data && res.data.order) {
        setSelectedOrder(res.data.order);
        setActiveDrawerTab(getTabForStatus(res.data.order.status));
        if (res.data.order.courier) setSelectedCourier(res.data.order.courier);
        if (res.data.order.trackingNumber) setTrackingNumber(res.data.order.trackingNumber);
      } else {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus, ...payload } : null));
        setActiveDrawerTab(getTabForStatus(newStatus));
      }
      fetchOrders(true);
      notifyLiveSync('orders');
      if (['To Ship', 'To Receive', 'Completed'].includes(newStatus)) {
        showSuccessToast(
          `Order updated to "${newStatus}"! Inventory stock status synchronized.`
        );
      } else if (newStatus === 'Cancelled') {
        showSuccessToast(`Order cancelled. Inventory stock has been restored.`);
      } else {
        showSuccessToast(`Order status updated to "${newStatus}".`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      showErrorToast('Failed to update order status.');
    }
  };

  const handleReviewCancellation = async (orderId, action) => {
    try {
      setIsReviewingCancel(true);
      const res = await axios.post(`${API_BASE_URL}/orders/${orderId}/review-cancel`, {
        action,
        reviewedBy: 'Logistics Team',
      });
      if (res.data?.order) {
        setSelectedOrder(res.data.order);
        setOrders((prev) => prev.map((o) => (o._id === orderId ? res.data.order : o)));
      }
      fetchOrders(true);
      notifyLiveSync('orders');
      if (action === 'approve') {
        showSuccessToast('Order cancellation approved! Order is now cancelled and stock restored.');
      } else {
        showSuccessToast('Cancellation request declined. Order fulfillment will proceed.');
      }
    } catch (err) {
      console.error('Error reviewing cancellation:', err);
      showErrorToast(err.response?.data?.message || 'Failed to review cancellation request.');
    } finally {
      setIsReviewingCancel(false);
    }
  };

  // Real-time automatic synchronization without refresh
  useLiveSync(['orders', 'logistics'], () => {
    fetchOrders(true);
  });

  useEffect(() => {
    fetchOrders(true);

    const handleOrdersUpdated = () => {
      fetchOrders(true);
    };

    window.addEventListener('ordersUpdated', handleOrdersUpdated);
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 20000);

    return () => {
      window.removeEventListener('ordersUpdated', handleOrdersUpdated);
      clearInterval(interval);
    };
  }, []);

  // Auto-switch drawer tab and sync courier/tracking/edd whenever selected order changes
  useEffect(() => {
    if (selectedOrder) {
      setActiveDrawerTab(getTabForStatus(selectedOrder.status));
      setSelectedCourier(selectedOrder.courier || 'J&T Express');
      setTrackingNumber(selectedOrder.trackingNumber || '');
      setEddRange(selectedOrder.estimatedDelivery?.formattedRange || '');
      setEddIsDelayed(Boolean(selectedOrder.estimatedDelivery?.isDelayed));
      setEddDelayReason(selectedOrder.estimatedDelivery?.delayReason || '');
    }
  }, [selectedOrder?._id]);

  const handleSaveEstimatedDelivery = async () => {
    if (!selectedOrder) return;
    setIsSavingEdd(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/orders/${selectedOrder._id}/status`, {
        estimatedDelivery: {
          formattedRange: eddRange,
          isDelayed: eddIsDelayed,
          delayReason: eddDelayReason,
        },
      });
      if (res.data?.order) {
        setSelectedOrder(res.data.order);
      }
      fetchOrders(true);
      showSuccessToast('Estimated Delivery Schedule & Advisories updated successfully!');
    } catch (err) {
      console.error('Error saving EDD:', err);
      showErrorToast('Failed to save delivery schedule.');
    } finally {
      setIsSavingEdd(false);
    }
  };

  const applyEddPreset = (daysStart, daysEnd) => {
    const start = new Date();
    start.setDate(start.getDate() + daysStart);
    const end = new Date();
    end.setDate(end.getDate() + daysEnd);
    const opt = { month: 'short', day: 'numeric' };
    const formatted = `${start.toLocaleDateString('en-US', opt)} - ${end.toLocaleDateString('en-US', opt)}`;
    setEddRange(formatted);
  };

  const handleOpenPodModal = () => {
    setPodImage('');
    setPodRecipientName(
      selectedOrder?.customerName ||
      selectedOrder?.userId?.name ||
      selectedOrder?.user?.name ||
      'Customer'
    );
    setPodNotes('');
    setIsPodModalOpen(true);
  };

  const handlePodImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast('Image size exceeds 5MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPodImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPodDelivery = async () => {
    if (!podImage) {
      showErrorToast('Proof of Delivery photo is required before marking as completed!');
      return;
    }
    setIsSubmittingPod(true);
    try {
      await handleUpdateStatus(selectedOrder._id, 'Completed', {
        proofOfDelivery: {
          image: podImage,
          recipientName: podRecipientName,
          notes: podNotes,
          deliveredAt: new Date(),
        },
      });
      setIsPodModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingPod(false);
    }
  };

  const calculateCounts = (data) => {
    const newCounts = {
      'order-placed': 0,
      'waiting-courier': 0,
      'in-transit': 0,
      delivered: 0,
      cancel: 0,
      all: data.length,
      'to-pay': 0,
      'to-ship': 0,
      'to-receive': 0,
      completed: 0,
      returns: 0,
      'cancel-requests': 0,
    };

    data.forEach((order) => {
      if (order.cancellationRequest?.status === 'Pending') {
        newCounts['cancel-requests']++;
      }
      const rawStatus = (order.status || '').toLowerCase().replace(/\s+/g, '-');
      if (rawStatus === 'completed' || rawStatus === 'delivered' || rawStatus === 'to-review' || rawStatus === 'paid') {
        newCounts['delivered']++;
        newCounts['completed']++;
      } else if (
        rawStatus === 'returns' ||
        rawStatus === 'return' ||
        rawStatus === 'return-refund' ||
        rawStatus === 'returned' ||
        rawStatus === 'cancelled' ||
        rawStatus === 'cancel'
      ) {
        newCounts['cancel']++;
        newCounts['returns']++;
      } else if (rawStatus === 'to-pay' || rawStatus === 'pending' || rawStatus === 'order-placed') {
        newCounts['order-placed']++;
        newCounts['to-pay']++;
      } else if (rawStatus === 'to-ship' || rawStatus === 'processing' || rawStatus === 'preparing' || rawStatus === 'waiting-courier' || rawStatus === 'waiting-for-courier') {
        newCounts['waiting-courier']++;
        newCounts['to-ship']++;
      } else if (rawStatus === 'to-receive' || rawStatus === 'in-transit' || rawStatus === 'shipped' || rawStatus === 'out-for-delivery') {
        newCounts['in-transit']++;
        newCounts['to-receive']++;
      } else if (newCounts[rawStatus] !== undefined) {
        newCounts[rawStatus]++;
      }
    });

    setCounts(newCounts);
  };

  const statusTabs = [
    { id: 'to-pay', label: 'Order list', icon: ClipboardList, count: counts['to-pay'] },
    { id: 'to-ship', label: 'To Ship', icon: Package, count: counts['to-ship'] },
    { id: 'to-receive', label: 'To Receive', icon: Truck, count: counts['to-receive'] },
    { id: 'completed', label: 'Completed Orders', icon: CheckCircle2, count: counts['completed'] },
  ];

  const existingPaymentMethods = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      if (o.paymentMethod) set.add(o.paymentMethod);
    });
    return Array.from(set);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const formattedStatus = (order.status || '').toLowerCase().replace(/\s+/g, '-');
      
      // Check Top Tab Filter
      let matchesTab = false;
      if (activeTab === 'order-placed' || activeTab === 'to-pay') {
        matchesTab = formattedStatus === 'order-placed' || formattedStatus === 'to-pay' || formattedStatus === 'pending';
      } else if (activeTab === 'waiting-courier' || activeTab === 'to-ship') {
        matchesTab =
          formattedStatus === 'waiting-courier' ||
          formattedStatus === 'waiting-for-courier' ||
          formattedStatus === 'to-ship' ||
          formattedStatus === 'processing' ||
          formattedStatus === 'preparing';
      } else if (activeTab === 'in-transit' || activeTab === 'to-receive') {
        matchesTab =
          formattedStatus === 'in-transit' ||
          formattedStatus === 'to-receive' ||
          formattedStatus === 'shipped' ||
          formattedStatus === 'out-for-delivery';
      } else if (activeTab === 'delivered' || activeTab === 'completed' || activeTab === 'to-review') {
        matchesTab =
          formattedStatus === 'delivered' ||
          formattedStatus === 'completed' ||
          formattedStatus === 'to-review' ||
          formattedStatus === 'paid';
      } else if (activeTab === 'cancel' || activeTab === 'returns' || activeTab === 'cancelled') {
        matchesTab =
          formattedStatus === 'cancel' ||
          formattedStatus === 'cancelled' ||
          formattedStatus === 'returns' ||
          formattedStatus === 'return' ||
          formattedStatus === 'return-refund' ||
          formattedStatus === 'returned';
      } else if (activeTab === 'all') {
        matchesTab = true;
      } else {
        matchesTab = formattedStatus === activeTab;
      }

      const customerName =
        order.customerName || order.userId?.name || order.user?.name || 'Guest Customer';
      const orderId = order._id || '';
      const address = order.shippingAddress || '';
      const itemsText =
        order.items?.map((i) => i.name || i.product?.name).join(' ') || '';

      const matchesSearch =
        orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        itemsText.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (selectedDate) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        matchesDate = orderDate === selectedDate;
      }

      let matchesPayment = selectedPaymentMethod === 'All';
      if (!matchesPayment) {
        matchesPayment = (order.paymentMethod || '').toLowerCase() === selectedPaymentMethod.toLowerCase();
      }

      if (filterCancelRequestsOnly && order.cancellationRequest?.status !== 'Pending') {
        return false;
      }

      return matchesTab && matchesSearch && matchesDate && matchesPayment;
    }).sort((a, b) => {
      if (selectedSort === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (selectedSort === 'amount-high') {
        return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
      }
      if (selectedSort === 'amount-low') {
        return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [orders, activeTab, searchTerm, selectedDate, selectedPaymentMethod, selectedSort, filterCancelRequestsOnly]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedDate) count++;
    if (selectedPaymentMethod !== 'All') count++;
    if (selectedSort !== 'newest') count++;
    return count;
  }, [searchTerm, selectedDate, selectedPaymentMethod, selectedSort]);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, selectedDate, selectedPaymentMethod, selectedSort]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedDate('');
    setSelectedPaymentMethod('All');
    setSelectedSort('newest');
    setCurrentPage(1);
  };

  // Overall Statistics for KPI Cards
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const toShipCount = counts['to-ship'] || 0;
    const toReceiveCount = counts['to-receive'] || 0;
    const completedCount = counts['completed'] || 0;
    const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const completedSales = orders
      .filter((o) => (o.status || '').toLowerCase() === 'completed')
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    return {
      totalCount,
      toShipCount,
      toReceiveCount,
      completedCount,
      totalSales,
      completedSales,
    };
  }, [orders, counts]);

  // Download Single Customer Order / Delivery Invoice PDF
  const handleDownloadOrderPdf = (order) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const orderIdShort = order._id?.slice(-8).toUpperCase() || 'ORDER';

      // Header Banner
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - LOGISTICS & ORDER FULFILLMENT', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL CUSTOMER ORDER & DELIVERY RECEIPT', 14, 18);

      // Metadata Box
      doc.setDrawColor(220, 225, 230);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 28, 182, 38, 2, 2, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);

      const customerName = order.customerName || order.userId?.name || order.user?.name || 'Customer';
      const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString();

      doc.setFont('helvetica', 'bold');
      doc.text('ORDER ID:', 18, 36);
      doc.setFont('helvetica', 'normal');
      doc.text(`#${orderIdShort}`, 52, 36);

      doc.setFont('helvetica', 'bold');
      doc.text('CUSTOMER:', 18, 44);
      doc.setFont('helvetica', 'normal');
      doc.text(customerName, 52, 44);

      doc.setFont('helvetica', 'bold');
      doc.text('SHIPPING ADDR:', 18, 52);
      doc.setFont('helvetica', 'normal');
      doc.text(order.shippingAddress || 'Storefront Delivery Address', 52, 52);

      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT METHOD:', 18, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(order.paymentMethod || 'Cash on Delivery (COD)', 52, 60);

      doc.setFont('helvetica', 'bold');
      doc.text('ORDER DATE:', 125, 36);
      doc.setFont('helvetica', 'normal');
      doc.text(orderDate, 162, 36);

      doc.setFont('helvetica', 'bold');
      doc.text('FULFILLMENT:', 125, 44);
      doc.setFont('helvetica', 'normal');
      doc.text((order.status || 'Pending').toUpperCase(), 162, 44);

      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL AMOUNT:', 125, 52);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(1, 57, 15);
      doc.text(`PHP ${Number(order.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 162, 52);

      // Detail Table
      const tableHead = [['#', 'Item Description / Product', 'Qty', 'Unit Price', 'Total Amount']];
      const tableBody = (order.items || []).map((it, idx) => [
        idx + 1,
        it.name || it.product?.name || 'Purchased Product',
        it.quantity || 1,
        `PHP ${Number(it.price || 0).toFixed(2)}`,
        `PHP ${Number((it.price || 0) * (it.quantity || 1)).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 72,
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

      // Summary Notes
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, finalY, 182, 18, 2, 2, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('DELIVERY NOTE: Please inspect items upon receiving. For damaged or wrong items, file an RMA return within 7 days.', 18, finalY + 6);
      doc.text('DISPATCH AUTHORIZATION: Validated and deducted from warehouse finished goods inventory.', 18, finalY + 12);

      // Signatures
      const signY = finalY + 32;
      doc.setDrawColor(180, 180, 180);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      doc.line(14, signY, 65, signY);
      doc.text('DISPATCH / LOGISTICS CLERK', 14, signY + 5);

      doc.line(78, signY, 130, signY);
      doc.text('COURIER / RIDER SIGNATURE', 78, signY + 5);

      doc.line(144, signY, 196, signY);
      doc.text('CUSTOMER RECEIVED SIGNATURE', 144, signY + 5);

      const fileName = `Order_Invoice_${orderIdShort}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Downloaded Order Invoice PDF: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to generate PDF document.');
    }
  };

  // Download Master Orders Summary Report PDF
  const handleDownloadOrdersSummaryPdf = (orderList) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - MASTER CUSTOMER ORDERS SUMMARY REPORT', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Total Orders: ${orderList.length}`,
        14,
        18
      );

      const tableHead = [
        ['#', 'Order ID', 'Order Date', 'Customer', 'Shipping Address', 'Items Summary', 'Payment', 'Total Amount', 'Status']
      ];

      const tableBody = (orderList || []).map((o, idx) => [
        idx + 1,
        `#${o._id?.slice(-8).toUpperCase()}`,
        new Date(o.createdAt || Date.now()).toLocaleDateString(),
        o.customerName || o.userId?.name || o.user?.name || 'Customer',
        o.shippingAddress || 'N/A',
        (o.items || []).map((i) => `${i.name || i.product?.name || 'Item'} (x${i.quantity || 1})`).join(', ') || 'N/A',
        o.paymentMethod || 'COD',
        `PHP ${Number(o.totalAmount || 0).toFixed(2)}`,
        (o.status || 'Pending').toUpperCase()
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

      const fileName = `Orders_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Orders Summary Report: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to export summary PDF.');
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'paid':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Completed
          </span>
        );
      case 'to ship':
      case 'to-ship':
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            To Ship
          </span>
        );
      case 'to receive':
      case 'to-receive':
        return (
          <span className="inline-flex items-center gap-1.5 bg-cyan-50 text-cyan-700 border border-cyan-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            In Transit
          </span>
        );
      case 'order placed':
      case 'order-placed':
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Order Placed
          </span>
        );
      case 'to pay':
      case 'to-pay':
        return (
          <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            To Pay
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {status || 'Pending'}
          </span>
        );
    }
  };

  // Workflow progress index calculation (0-3: Order Placed -> Waiting for Courier / To Ship -> In Transit -> Delivered)
  const getWorkflowStepIndex = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('cancelled')) return -1;
    if (s === 'completed' || s === 'paid') return 3;
    if (s === 'to receive' || s === 'to-receive') return 2;
    if (s === 'to ship' || s === 'to-ship') return 1;
    return 0; // Order Placed / To Pay
  };

  const workflowSteps = [
    { label: 'Order Placed', desc: 'Awaiting Confirmation' },
    { label: 'Waiting for Courier', desc: 'To Ship / Packing' },
    { label: 'In Transit', desc: 'Dispatched to Courier' },
    { label: 'Delivered', desc: 'Completed Fulfillment' },
  ];

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-800">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'order-placed', label: 'Order Placed', count: counts['order-placed'] || 0, hasDot: true },
              { id: 'waiting-courier', label: 'Waiting for Courier', count: counts['waiting-courier'] || 0, hasDot: true },
              { id: 'in-transit', label: 'In Transit', count: counts['in-transit'] || 0, hasDot: true },
              { id: 'delivered', label: 'Delivered', count: counts['delivered'] || 0, hasDot: true },
              { id: 'cancel', label: 'Cancel', count: counts['cancel'] || 0, hasDot: false },
            ].map((tab) => {
              const hasItems = tab.hasDot && (tab.count || 0) > 0;
              const cancelRequestsCount = tab.id === 'order-placed' ? (counts['cancel-requests'] || 0) : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setFilterCancelRequestsOnly(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap inline-flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'border-[#01390f] text-[#01390f] bg-slate-50'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <span className="relative inline-flex items-center gap-1.5">
                    <span>{tab.label}</span>
                    {cancelRequestsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white shadow-2xs animate-pulse tracking-tight flex items-center gap-1" title={`${cancelRequestsCount} Cancellation Request(s) Pending Review`}>
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>{cancelRequestsCount} CANCEL REQ</span>
                      </span>
                    )}
                    {hasItems && cancelRequestsCount === 0 && (
                      <span className="w-1.5 h-1.5 bg-[#c81e1e] rounded-full ml-1.5 shrink-0" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
          {/* ACTIONS GROUP */}
          <div className="w-[226px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
            <div className="flex items-stretch gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => handleDownloadOrdersSummaryPdf(filteredOrders)}
                className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                title="Export Orders Summary PDF"
              >
                <FileDown className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-center leading-tight">Export PDF</span>
              </button>
              <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => fetchOrders()}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="truncate">Refresh Orders</span>
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
                  placeholder="Search order ID, customer, item, destination..."
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

                {/* Payment Method */}
                <div className="relative w-full">
                  <CreditCard className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Payment Methods</option>
                    <option value="Cash on Delivery (COD)">COD</option>
                    <option value="GCash">GCash / E-Wallet</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit/Debit Card">Credit / Debit Card</option>
                    {existingPaymentMethods
                      .filter((pm) => !['Cash on Delivery (COD)', 'GCash', 'Bank Transfer', 'Credit/Debit Card'].includes(pm))
                      .map((pm, idx) => (
                        <option key={idx} value={pm}>
                          {pm}
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
                    <option value="newest">Sort: Newest Orders</option>
                    <option value="oldest">Sort: Oldest Orders</option>
                    <option value="amount-high">Sort: Highest Amount</option>
                    <option value="amount-low">Sort: Lowest Amount</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: 3-column Quick Toggles */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPaymentMethod(
                      selectedPaymentMethod === 'Cash on Delivery (COD)' ? 'All' : 'Cash on Delivery (COD)'
                    )
                  }
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    selectedPaymentMethod === 'Cash on Delivery (COD)'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  COD Only
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedPaymentMethod(selectedPaymentMethod === 'GCash' ? 'All' : 'GCash')
                  }
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    selectedPaymentMethod === 'GCash'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  GCash Only
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
                  Today's Orders
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
              Search & Filter
            </div>
          </div>
        </div>

        {/* PROMINENT PENDING CANCELLATION REQUESTS BANNER */}
        {(counts['cancel-requests'] || 0) > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-rose-200/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs -mt-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
                <AlertTriangle className="w-4 h-4 animate-bounce text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <span>{counts['cancel-requests']} Order Cancellation Request{counts['cancel-requests'] > 1 ? 's' : ''} Pending Review</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">ACTION REQUIRED</span>
                </p>
                <p className="text-[11px] text-slate-600">
                  Customers submitted cancellation requests in "Order Placed". Please review and approve or decline.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('order-placed');
                  setFilterCancelRequestsOnly((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  filterCancelRequestsOnly
                    ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                    : 'bg-white text-rose-800 border-rose-300 hover:bg-rose-100 shadow-2xs'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{filterCancelRequestsOnly ? 'Show All Orders' : `Filter Cancel Requests (${counts['cancel-requests']})`}</span>
              </button>
            </div>
          </div>
        )}

        {/* HR DIVIDER ABOVE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* 3. TABLE MASTERLIST */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* TABLE PAGINATION */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredOrders.length}
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
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">
                    ORDER ID
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ORDER DATE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">CUSTOMER</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">SHIPPING DESTINATION</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">PURCHASED ITEMS</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">PAYMENT</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">TOTAL AMOUNT</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">STATUS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px]">
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading orders masterlist...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-6 h-6 text-slate-300" />
                        <span>No orders found matching your search or filter criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const customerName =
                      order.customerName ||
                      order.userId?.name ||
                      order.user?.name ||
                      'Customer';
                    const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    const itemsSummary = order.items
                      ?.map((it) => `${it.name || it.product?.name || 'Item'} (x${it.quantity || 1})`)
                      .join(', ');
                    const total = Number(order.totalAmount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    });

                    return (
                      <tr
                        key={order._id}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group cursor-pointer"
                      >
                        {/* Order ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap min-w-[140px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="bg-slate-100 text-slate-800 group-hover:text-[#01390f] group-hover:border-[#01390f]/40 group-hover:bg-emerald-50/60 px-2.5 py-1 rounded-md border border-slate-200 transition-colors shadow-2xs">
                            #{order._id?.slice(-8).toUpperCase()}
                          </span>
                        </td>

                        {/* Order Date */}
                        <td className="py-3.5 px-4 text-slate-500 font-mono whitespace-nowrap">
                          {orderDate}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{customerName}</span>
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                              {order.userId?.email || order.user?.email || 'Mhira Shopper'}
                            </span>
                          </div>
                        </td>

                        {/* Shipping Destination */}
                        <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate" title={order.shippingAddress || 'N/A'}>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{order.shippingAddress || 'Storefront Delivery Address'}</span>
                          </div>
                        </td>

                        {/* Purchased Items */}
                        <td className="py-3.5 px-4 text-slate-700 max-w-[220px] truncate" title={itemsSummary}>
                          <span className="inline-flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-md font-semibold border border-cyan-200/70 uppercase truncate max-w-full">
                            {itemsSummary || 'No items recorded'}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">
                          {order.paymentMethod || 'COD'}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#01390f] whitespace-nowrap text-sm">
                          ₱{total}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center justify-center gap-2">
                              {getStatusBadge(order.status)}
                              {((order.status || '').toLowerCase() === 'order placed' || (order.status || '').toLowerCase() === 'to pay') &&
                                order.cancellationRequest?.status !== 'Pending' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatus(order._id, 'To Ship');
                                    }}
                                    className="inline-flex items-center gap-1 bg-[#01390f] hover:bg-[#051609] text-white px-2 py-0.5 rounded text-[11px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                                    title="Confirm order and move to Waiting for courier (To Ship)"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Confirm</span>
                                  </button>
                                )}
                            </div>
                            {order.cancellationRequest?.status === 'Pending' && (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-300 inline-flex items-center gap-1 animate-pulse"
                                title={`Reason: ${order.cancellationRequest.reason || 'Customer requested'}`}
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>Cancel Requested</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action (Sticky Right) */}
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-3.5 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-28 min-w-[100px]"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {order.cancellationRequest?.status === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(order)}
                                title="Review customer cancellation request"
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Review</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              title="View Order Details"
                              aria-label="View Order Details"
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
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden font-['Poppins',sans-serif]">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedOrder(null)}
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
                      {selectedOrder.customerName || selectedOrder.userId?.name || 'Customer Order'}
                    </h2>
                    {getStatusBadge(selectedOrder.status)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#01390f]" />
                      <span>#{selectedOrder._id?.slice(-8).toUpperCase()}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-slate-400" />
                      <span>Mhira Natural Store</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200 flex items-center justify-center transition-all cursor-pointer text-sm font-bold shadow-2xs"
                  title="Close Sidebar"
                >
                  ✕
                </button>
              </div>

              {/* DRAWER SCROLLABLE CONTENT */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs sm:text-sm">
                
                {/* CANCELLATION REQUEST REVIEW BANNER */}
                {selectedOrder.cancellationRequest?.status === 'Pending' && (
                  <div className="bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200 shrink-0 shadow-2xs">
                          <AlertTriangle className="w-4 h-4 animate-bounce text-rose-600" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Customer Cancellation Request</span>
                          </h4>
                          <p className="text-[11px] text-rose-700 font-mono">
                            Submitted {selectedOrder.cancellationRequest.requestedAt ? new Date(selectedOrder.cancellationRequest.requestedAt).toLocaleString() : 'Recently'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900 uppercase tracking-wide animate-pulse">
                        Action Required
                      </span>
                    </div>

                    <div className="bg-white/90 p-3 rounded-xl border border-rose-200 text-xs space-y-1">
                      <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block">Customer's Reason:</span>
                      <p className="font-bold text-slate-800 italic">
                        "{selectedOrder.cancellationRequest.reason || 'Customer requested order cancellation'}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isReviewingCancel}
                        onClick={() => handleReviewCancellation(selectedOrder._id, 'approve')}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isReviewingCancel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>Approve Cancel (Cancel Order)</span>
                      </button>
                      <button
                        type="button"
                        disabled={isReviewingCancel}
                        onClick={() => handleReviewCancellation(selectedOrder._id, 'reject')}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isReviewingCancel ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        <span>Reject Request (Keep Order)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3-CARD SUMMARY STATS (AS IN REFERENCE) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STATUS</span>
                    <span className="font-bold text-slate-900 mt-1">
                      {(selectedOrder.status || 'Pending').toUpperCase()}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DATE PLACED</span>
                    <span className="font-mono font-bold text-slate-900 mt-1">
                      {new Date(selectedOrder.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL VALUE</span>
                    <span className="font-mono font-black text-[#01390f] text-sm mt-1">
                      ₱{Number(selectedOrder.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* WORKFLOW PROGRESS STEPPER PIPELINE */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      WORKFLOW PROGRESS
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#01390f]">
                      Stage {Math.max(1, getWorkflowStepIndex(selectedOrder.status) + 1)} of {workflowSteps.length}
                    </span>
                  </div>

                  {/* Visual Step Progress Line */}
                  <div className="relative flex items-center justify-between pt-2">
                    {/* Connecting Line */}
                    <div className="absolute left-4 right-4 top-5 h-0.5 bg-slate-200 z-0" />
                    <div
                      className="absolute left-4 top-5 h-0.5 bg-[#01390f] transition-all duration-500 z-0"
                      style={{
                        width: `${Math.max(0, Math.min(100, (getWorkflowStepIndex(selectedOrder.status) / (workflowSteps.length - 1)) * 100))}%`
                      }}
                    />

                    {workflowSteps.map((step, idx) => {
                      const currentIdx = getWorkflowStepIndex(selectedOrder.status);
                      const isPassed = idx < currentIdx;
                      const isCurrent = idx === currentIdx;
                      const isUnlocked = idx <= currentIdx;
                      const tabIds = ['review', 'dispatch', 'customer', 'invoice'];
                      const targetTab = tabIds[idx];
                      const isTabActive = activeDrawerTab === targetTab;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (!isUnlocked) return;
                            setActiveDrawerTab(targetTab);
                          }}
                          className={`relative z-10 flex flex-col items-center gap-2 transition-all ${
                            isUnlocked ? 'cursor-pointer group' : 'cursor-not-allowed opacity-40 pointer-events-none select-none'
                          }`}
                          title={
                            isUnlocked
                              ? `Click to view Stage ${idx + 1}: ${step.label}`
                              : `Stage ${idx + 1}: ${step.label} is locked (advance previous stage first)`
                          }
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shadow-2xs ${
                              isUnlocked ? 'group-hover:scale-110' : ''
                            } ${
                              isTabActive
                                ? 'bg-[#01390f] text-white ring-4 ring-[#01390f]/20 scale-110 shadow-md'
                                : isPassed
                                ? 'bg-[#01390f] text-white'
                                : isCurrent
                                ? 'bg-[#01390f] text-white ring-2 ring-[#01390f]/30'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {isPassed ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : !isUnlocked ? (
                              <Lock className="w-3 h-3 text-slate-400" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold text-center max-w-[70px] leading-tight transition-colors ${
                              isTabActive
                                ? 'text-[#01390f] underline decoration-2 underline-offset-2'
                                : isCurrent
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

                {/* WORKFLOW STAGE TABS (LOCKED TO REACHED STAGES ONLY) */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
                  {[
                    { id: 'review', stageNum: 1, label: 'Order Review', stepName: 'Order Placed' },
                    { id: 'dispatch', stageNum: 2, label: 'Fulfillment & Dispatch', stepName: 'Waiting for Courier' },
                    { id: 'customer', stageNum: 3, label: 'Customer & Destination', stepName: 'In Transit' },
                    { id: 'invoice', stageNum: 4, label: 'Invoice & Receipt', stepName: 'Delivered' },
                  ].map((tab) => {
                    const currentOrderStage = getWorkflowStepIndex(selectedOrder.status);
                    const isUnlocked = tab.stageNum - 1 <= currentOrderStage;
                    const isOrderCurrentStage = currentOrderStage === tab.stageNum - 1;
                    const isActive = activeDrawerTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => {
                          if (isUnlocked) setActiveDrawerTab(tab.id);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                          !isUnlocked
                            ? 'bg-slate-100/60 text-slate-400 cursor-not-allowed opacity-45 border border-transparent pointer-events-none select-none'
                            : isActive
                            ? 'bg-[#01390f] text-white shadow-xs cursor-pointer'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer'
                        }`}
                        title={
                          isUnlocked
                            ? `Stage ${tab.stageNum}: ${tab.label}`
                            : `Stage ${tab.stageNum} is locked. Complete previous stages first.`
                        }
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
                            !isUnlocked
                              ? 'bg-slate-200/70 text-slate-400'
                              : isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {!isUnlocked ? <Lock className="w-2.5 h-2.5 text-slate-400" /> : tab.stageNum}
                        </span>
                        <span>{tab.label}</span>
                        {isOrderCurrentStage && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                              isActive ? 'bg-emerald-300 text-slate-900 font-bold' : 'bg-emerald-100 text-emerald-800'
                            }`}
                            title="Current fulfillment stage of this order"
                          >
                            Current
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* TAB 1: ORDER REVIEW WORKSPACE */}
                {activeDrawerTab === 'review' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Confirmation Alert when order is at Order Placed stage */}
                    {((selectedOrder.status || '').toLowerCase() === 'order placed' || (selectedOrder.status || '').toLowerCase() === 'to pay') && (
                      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-bold text-amber-950 text-xs sm:text-sm">Order Placed — Awaiting Confirmation</h5>
                            <p className="text-[11px] text-amber-800/90 font-medium">Order is not yet in "To Ship". Confirm to approve and move to "Waiting for courier".</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedOrder._id, 'To Ship')}
                          className="px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm Order (Move to To Ship)</span>
                        </button>
                      </div>
                    )}

                    {/* Top Alert Workspace Card */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#01390f] text-white flex items-center justify-center">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Order Items Verification</h4>
                          <p className="text-[11px] text-slate-500">
                            {selectedOrder.items?.length || 0} purchased line item(s) recorded in this transaction.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadOrderPdf(selectedOrder)}
                        className="bg-white hover:bg-emerald-100 text-[#01390f] border border-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>PDF Invoice</span>
                      </button>
                    </div>

                    {/* Order Items Table List */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Ordered Items Breakdown
                      </span>
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                        {selectedOrder.items?.map((it, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 hover:bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between transition-colors text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#01390f] flex items-center justify-center font-bold shrink-0 border border-emerald-100">
                                {idx + 1}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                                  {it.name || it.product?.name || 'Item Name'}
                                </span>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  ₱{Number(it.price || it.product?.price || 0).toFixed(2)} each
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900 block">
                                x{it.quantity || 1}
                              </span>
                              <span className="font-mono text-[#01390f] font-bold text-xs">
                                ₱{(Number(it.price || 0) * Number(it.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Financial Totals */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Payment & Financial Summary
                      </span>
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Items Subtotal:</span>
                        <span className="font-mono font-bold">
                          ₱{Number(selectedOrder.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Shipping / Delivery Fee:</span>
                        <span className="font-mono font-bold text-emerald-600">FREE / Included</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Payment Method:</span>
                        <span className="font-bold text-slate-800">{selectedOrder.paymentMethod || 'COD'}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                        <span>Grand Total:</span>
                        <span className="font-mono font-black text-[#01390f] text-base">
                          ₱{Number(selectedOrder.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: FULFILLMENT & DISPATCH WORKSPACE */}
                {activeDrawerTab === 'dispatch' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {getWorkflowStepIndex(selectedOrder.status) < 1 ? (
                      /* If order is still at Stage 1 (Order Placed) */
                      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 text-center space-y-3 shadow-2xs">
                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                          <Clock className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-amber-950">Awaiting Order Confirmation First</h4>
                        <p className="text-xs text-amber-800/80 max-w-sm mx-auto">
                          This order is still in <strong>Stage 1: Order Placed</strong>. Please review and confirm the order in <strong>Order Review</strong> before assigning courier and dispatching.
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(selectedOrder._id, 'To Ship')}
                            className="bg-[#01390f] hover:bg-[#051609] text-white px-5 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                          >
                            <Check className="w-4 h-4" />
                            <span>Confirm Order Now (Move to To Ship)</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* When order is at Stage 2 (Waiting for Courier / To Ship) or above */
                      <div className="space-y-4">
                        {/* Dispatch Status Overview */}
                        <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#01390f] text-white flex items-center justify-center">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                                {getWorkflowStepIndex(selectedOrder.status) === 1
                                  ? 'Stage 2: Ready for Courier Handover'
                                  : 'Stage 3: Dispatched to Courier Partner'}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {getWorkflowStepIndex(selectedOrder.status) === 1
                                  ? 'Parcel is packed. Assign courier and tracking number to dispatch.'
                                  : `Parcel is in transit with ${selectedCourier}.`}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#01390f] bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                            {selectedOrder.status}
                          </span>
                        </div>

                        {/* Courier Partner & Waybill Form */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            Assigned Courier & Tracking Waybill
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                Courier Partner:
                              </label>
                              <select
                                value={selectedCourier}
                                onChange={(e) => setSelectedCourier(e.target.value)}
                                disabled={getWorkflowStepIndex(selectedOrder.status) > 1}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#01390f] disabled:bg-slate-100 disabled:cursor-not-allowed"
                              >
                                <option value="J&T Express">J&T Express</option>
                                <option value="Lalamove">Lalamove</option>
                                <option value="Flash Express">Flash Express</option>
                                <option value="Ninja Van">Ninja Van</option>
                                <option value="In-House Fleet">Mhira In-House Rider</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                Tracking / Waybill No:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. JT94829104820"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                disabled={getWorkflowStepIndex(selectedOrder.status) > 1}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#01390f] disabled:bg-slate-100 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>

                          {/* 1-Click Dispatch Action Button (Only active at Stage 2: To Ship) */}
                          {getWorkflowStepIndex(selectedOrder.status) === 1 && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(selectedOrder._id, 'To Receive', {
                                    courier: selectedCourier,
                                    trackingNumber,
                                  })
                                }
                                className="w-full py-2.5 sm:py-3 px-6 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                              >
                                <Truck className="w-4 h-4" />
                                <span>Handover to Courier & Move to In Transit</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Shopee/TikTok Style: Estimated Delivery Schedule & Weather Delay Card */}
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-[#01390f]" />
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Estimated Delivery Schedule (EDD)
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 font-semibold">
                              Visible to Customer
                            </span>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                              Estimated Arrival Window:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Aug 28 - Aug 30"
                              value={eddRange}
                              onChange={(e) => setEddRange(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#01390f]"
                            />
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <span className="text-[10px] font-semibold text-slate-400">Presets:</span>
                              <button
                                type="button"
                                onClick={() => applyEddPreset(2, 3)}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                +2-3 Days
                              </button>
                              <button
                                type="button"
                                onClick={() => applyEddPreset(3, 5)}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                +3-5 Days
                              </button>
                              <button
                                type="button"
                                onClick={() => applyEddPreset(5, 7)}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                +5-7 Days (Provincial)
                              </button>
                            </div>
                          </div>

                          {/* Weather / Transit Delay Toggle */}
                          <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CloudRain className="w-4 h-4 text-amber-600" />
                                <span className="text-xs font-bold text-slate-800">
                                  Weather / Transit Delay Advisory
                                </span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={eddIsDelayed}
                                  onChange={(e) => setEddIsDelayed(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                              </label>
                            </div>

                            {eddIsDelayed && (
                              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 space-y-2 animate-in fade-in duration-150">
                                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Customer Delay Notice Reason:</span>
                                </div>
                                <input
                                  type="text"
                                  placeholder="e.g. Delayed due to Typhoon / Severe Weather disturbance"
                                  value={eddDelayReason}
                                  onChange={(e) => setEddDelayReason(e.target.value)}
                                  className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                                />
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {[
                                    'Typhoon / Severe Weather disturbance',
                                    'Flooded roads & route inaccessible',
                                    'Courier sorting hub reschedule',
                                  ].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => setEddDelayReason(preset)}
                                      className="text-[10px] bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={handleSaveEstimatedDelivery}
                              disabled={isSavingEdd}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-[#01390f] bg-white hover:bg-emerald-50 border border-[#01390f]/30 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              {isSavingEdd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>Save Delivery Schedule</span>
                            </button>
                          </div>
                        </div>

                        {/* Danger Zone: Cancel Order (Only if not delivered) */}
                        {getWorkflowStepIndex(selectedOrder.status) <= 2 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(selectedOrder._id, 'Cancelled')}
                              className="w-full py-2 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancel Order & Restore Inventory Stock</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: CUSTOMER & DESTINATION */}
                {activeDrawerTab === 'customer' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Customer Contact Profile
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Full Name:</span>
                          <span className="font-bold text-slate-900">
                            {selectedOrder.customerName || selectedOrder.userId?.name || 'Customer'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Email Address:</span>
                          <span className="font-mono text-slate-800">
                            {selectedOrder.userId?.email || selectedOrder.user?.email || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Contact Number:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {selectedOrder.userId?.phoneNumber || selectedOrder.phoneNumber || '+63 (09) N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Delivery Shipping Address
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedOrder.shippingAddress) {
                              navigator.clipboard.writeText(selectedOrder.shippingAddress);
                              showSuccessToast('Address copied to clipboard!');
                            }
                          }}
                          className="text-[#01390f] hover:underline text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Address</span>
                        </button>
                      </div>
                      <p className="text-xs font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                        {selectedOrder.shippingAddress || 'Storefront Delivery Address'}
                      </p>
                    </div>

                    {/* Active Transit Info & Mark Delivered Action (Only for Stage 3: To Receive) */}
                    {getWorkflowStepIndex(selectedOrder.status) === 2 && (
                      <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">Assigned Transit Carrier:</span>
                          <span className="font-semibold text-[#01390f] bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                            {selectedCourier} {trackingNumber ? `• ${trackingNumber}` : ''}
                          </span>
                        </div>

                        {/* Quick Adjust Delivery Schedule While in Transit */}
                        <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/60 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5 text-[#01390f]" />
                              <span>Estimated Arrival Window:</span>
                            </span>
                            <span className="font-bold text-[#01390f]">{eddRange || 'Not set'}</span>
                          </div>
                          {eddIsDelayed && (
                            <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{eddDelayReason || 'Weather / Transit Delay Reported'}</span>
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleOpenPodModal}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#01390f] hover:bg-[#051609] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 active:scale-98"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Confirm Order Delivered (Upload POD Photo)</span>
                        </button>
                      </div>
                    )}

                    {/* Proof of Delivery Card (If uploaded / completed) */}
                    {selectedOrder.proofOfDelivery?.image && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-[#01390f]" />
                            <span>Verified Proof of Delivery (POD)</span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ Photo Verified
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => setViewingPodImage(selectedOrder.proofOfDelivery.image)}
                            className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 cursor-pointer relative group shrink-0 bg-slate-200 shadow-2xs"
                          >
                            <img
                              src={selectedOrder.proofOfDelivery.image}
                              alt="Proof of Delivery"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="space-y-1 text-xs min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate">
                              Received By: <span className="font-medium text-slate-700">{selectedOrder.proofOfDelivery.recipientName || 'Customer'}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {new Date(selectedOrder.proofOfDelivery.deliveredAt || selectedOrder.updatedAt || Date.now()).toLocaleString()}
                            </p>
                            {selectedOrder.proofOfDelivery.notes && (
                              <p className="text-[11px] text-slate-600 italic truncate">
                                "{selectedOrder.proofOfDelivery.notes}"
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setViewingPodImage(selectedOrder.proofOfDelivery.image)}
                              className="text-[#01390f] hover:underline text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer pt-0.5"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Full Photo Proof</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Shopee/TikTok Style Live Parcel Timeline Logs */}
                    {selectedOrder.trackingTimeline && selectedOrder.trackingTimeline.length > 0 && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Fulfillment & Tracking Journey Logs
                        </span>
                        <div className="space-y-3 border-l-2 border-[#01390f]/20 ml-2 pl-4 py-1">
                          {selectedOrder.trackingTimeline.map((item, tIdx) => (
                            <div key={tIdx} className="relative space-y-0.5">
                              <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#01390f] ring-4 ring-white" />
                              <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                              <p className="text-[11px] text-slate-600 leading-snug">{item.description}</p>
                              <span className="text-[10px] font-mono text-slate-400 block">
                                {new Date(item.timestamp).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: INVOICE & RECEIPT */}
                {activeDrawerTab === 'invoice' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#01390f]/10 text-[#01390f] flex items-center justify-center mx-auto">
                        <Printer className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Official Customer Delivery Invoice</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Generate and download a branded, ready-to-print PDF invoice containing barcode metadata, items list, and dispatch signatures.
                      </p>

                      <div className="pt-2 flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadOrderPdf(selectedOrder)}
                          className="bg-[#01390f] hover:bg-[#051609] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                        >
                          <FileDown className="w-4 h-4" />
                          <span>Download Invoice PDF</span>
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
                  onClick={() => handleDownloadOrderPdf(selectedOrder)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer border border-rose-200 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileDown className="w-3.5 h-3.5 text-rose-600" />
                  <span>Invoice PDF</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                  >
                    Close
                  </button>
                  
                  {/* Process-Specific Single Forward Action Button */}
                  {getWorkflowStepIndex(selectedOrder.status) === 0 && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrder._id, 'To Ship')}
                      className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Order</span>
                    </button>
                  )}

                  {getWorkflowStepIndex(selectedOrder.status) === 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(selectedOrder._id, 'To Receive', {
                          courier: selectedCourier,
                          trackingNumber,
                        })
                      }
                      className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch to Courier</span>
                    </button>
                  )}

                  {getWorkflowStepIndex(selectedOrder.status) === 2 && (
                    <button
                      type="button"
                      onClick={handleOpenPodModal}
                      className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Mark Delivered (Upload POD)</span>
                    </button>
                  )}

                  {getWorkflowStepIndex(selectedOrder.status) === 3 && (
                    <span className="px-5 py-2.5 sm:py-3 rounded-full text-[12px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Order Completed</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROOF OF DELIVERY (POD) UPLOAD MODAL */}
      {isPodModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#01390f] text-white flex items-center justify-center shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Proof of Delivery (POD)</h3>
                  <p className="text-[11px] text-slate-500">Capture or upload photo of received parcel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPodModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recipient Name Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Received By (Customer / Representative Name): *
              </label>
              <input
                type="text"
                placeholder="e.g. Kent (Customer) or Maria (Sister)"
                value={podRecipientName}
                onChange={(e) => setPodRecipientName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#01390f]"
              />
            </div>

            {/* Image Uploader */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Proof of Delivery Photo: *
              </label>
              {!podImage ? (
                <label className="border-2 border-dashed border-slate-300 hover:border-[#01390f] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-emerald-50/40 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-white shadow-2xs flex items-center justify-center text-[#01390f]">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-800 block">Click or drag image to upload</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Camera capture or gallery image (Max 5MB)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePodImageChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={podImage}
                    alt="POD Preview"
                    className="w-full h-44 object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <label className="bg-white/90 hover:bg-white text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm cursor-pointer border border-slate-200 backdrop-blur-xs">
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePodImageChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setPodImage('')}
                      className="bg-rose-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Notes */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Delivery Notes (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Paid exact cash on delivery (COD) • Package intact"
                value={podNotes}
                onChange={(e) => setPodNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#01390f]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPodModalOpen(false)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPodDelivery}
                disabled={isSubmittingPod || !podImage}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isSubmittingPod ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Confirm & Mark Completed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN IMAGE VIEWER MODAL */}
      {viewingPodImage && (
        <div
          onClick={() => setViewingPodImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden p-2 shadow-2xl border border-white/10"
          >
            <button
              type="button"
              onClick={() => setViewingPodImage(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors z-10 cursor-pointer"
            >
              ✕
            </button>
            <img
              src={viewingPodImage}
              alt="Proof of Delivery Full"
              className="w-full max-h-[80vh] object-contain rounded-2xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LogisticsOrderManagement;
