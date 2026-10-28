import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Download,
  Loader2,
  Trash2,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  Truck,
  Eye,
  FileDown,
  ListPlus,
  RefreshCw,
  Clock,
  Package,
  Receipt,
  RotateCcw,
  ChevronDown,
  SlidersHorizontal,
  X,
  Users,
  Award,
  Sparkles,
  Star,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import axios, { API } from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';
import { GoldMedal, SilverMedal, BronzeMedal } from './common/MedalIcons';

function LogisticsPerformanceAnalytics() {
  const [salesData, setSalesData] = useState([]);
  const [customerRankingsData, setCustomerRankingsData] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    completedDispatches: 0,
    fulfillmentRate: '100%',
    totalCustomers: 0,
    topCustomer: null,
  });
  const [loading, setLoading] = useState(true);

  // View / Tab State: 'rankings' | 'All' | 'Delivered' | 'In Transit' | 'Processing'
  const [activeTab, setActiveTab] = useState('rankings');

  // Transaction Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSort, setSelectedSort] = useState('newest');
  const dateInputRef = useRef(null);

  // Rankings Filters
  const [rankSearchQuery, setRankSearchQuery] = useState('');
  const [rankTierFilter, setRankTierFilter] = useState('All');
  const [rankSort, setRankSort] = useState('highest');

  // Selected Sale Receipt Modal State
  const [selectedSale, setSelectedSale] = useState(null);

  const API_BASE_URL =
    import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com'
      : 'http://localhost:5000';

  const fetchSalesReport = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/logistics/sales-report`);
      setSalesData(res.data.sales || []);
      if (res.data.customerRankings) {
        setCustomerRankingsData(res.data.customerRankings);
      }
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error loading sales report:', err);
      showErrorToast('Failed to load sales performance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesReport();
  }, []);

  const handleDeleteTransaction = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this sales transaction log entry?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/logistics/sales-report/${id}`);
      showSuccessToast('Sales transaction entry removed.');
      if (selectedSale?._id === id) {
        setSelectedSale(null);
      }
      fetchSalesReport();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      showErrorToast('Failed to delete transaction.');
    }
  };

  // Helper for Tier calculation
  const getTierFromAmount = (total) => {
    const num = Number(total || 0);
    if (num >= 10000) return 'Platinum';
    if (num >= 5000) return 'Gold';
    if (num >= 1000) return 'Silver';
    return 'Bronze';
  };

  // Helper for Badge Label
  const getBadgeLabel = (tier, total) => {
    const t = (tier || getTierFromAmount(total)).toLowerCase();
    if (t.includes('platinum')) return 'Platinum VIP';
    if (t.includes('gold')) return 'Gold VIP';
    if (t.includes('silver')) return 'Silver Loyal';
    return 'Bronze Member';
  };

  // Dynamic Customer Rankings aggregation (from backend data or aggregated from salesData)
  const fullCustomerRankings = useMemo(() => {
    if (customerRankingsData && customerRankingsData.length > 0) {
      return customerRankingsData;
    }

    // Dynamic fallback aggregation from salesData
    const customerMap = new Map();
    salesData.forEach((s) => {
      const custName = s.customer || 'Unknown Customer';
      const cleanUsername = s.username || custName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = cleanUsername.toLowerCase();

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: custName,
          username: cleanUsername,
          totalSpent: 0,
          orderCount: 0,
          tier: s.tier || 'Bronze',
          lastOrderDate: s.date || '',
        });
      }

      const existing = customerMap.get(key);
      existing.totalSpent += Number(s.amount || 0);
      existing.orderCount += 1;
      if (!existing.lastOrderDate || (s.date && s.date > existing.lastOrderDate)) {
        existing.lastOrderDate = s.date;
      }
      existing.tier = getTierFromAmount(existing.totalSpent);
    });

    const list = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .map((c, index) => ({
        rank: index + 1,
        name: c.name,
        username: c.username,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        tier: c.tier,
        badgeLabel: getBadgeLabel(c.tier, c.totalSpent),
        lastOrderDate: c.lastOrderDate,
      }));

    return list;
  }, [customerRankingsData, salesData]);

  // Filtered & Sorted Customer Rankings for Leaderboard
  const filteredCustomerRankings = useMemo(() => {
    return fullCustomerRankings
      .filter((c) => {
        // 1. Search Query (Name or Username)
        if (rankSearchQuery.trim() !== '') {
          const q = rankSearchQuery.toLowerCase().trim();
          const nameMatch = (c.name || '').toLowerCase().includes(q);
          const unameMatch = (c.username || '').toLowerCase().includes(q);
          if (!nameMatch && !unameMatch) return false;
        }

        // 2. Tier Filter
        if (rankTierFilter !== 'All') {
          if ((c.tier || '').toLowerCase() !== rankTierFilter.toLowerCase()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (rankSort === 'orders') {
          return (b.orderCount || 0) - (a.orderCount || 0);
        }
        if (rankSort === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        }
        return Number(b.totalSpent || 0) - Number(a.totalSpent || 0);
      });
  }, [fullCustomerRankings, rankSearchQuery, rankTierFilter, rankSort]);

  // Filtered Sales Data (For Transactions View)
  const filteredSalesData = useMemo(() => {
    return salesData
      .filter((item) => {
        // 1. Search Query (Order ID, Customer Name, Username, Items)
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim();
          const ord = (item.orderId || '').toLowerCase();
          const cust = (item.customer || '').toLowerCase();
          const uname = (item.username || '').toLowerCase();
          const itm = (item.items || '').toLowerCase();
          if (!ord.includes(q) && !cust.includes(q) && !uname.includes(q) && !itm.includes(q)) {
            return false;
          }
        }

        // 2. Status Filter
        if (statusFilter !== 'All') {
          if ((item.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
            return false;
          }
        }

        // 3. Date Filter
        if (selectedDate) {
          if (item.date !== selectedDate) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'oldest') {
          return new Date(a.date || 0) - new Date(b.date || 0);
        }
        if (selectedSort === 'amount-high') {
          return Number(b.amount || 0) - Number(a.amount || 0);
        }
        if (selectedSort === 'amount-low') {
          return Number(a.amount || 0) - Number(b.amount || 0);
        }
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
  }, [salesData, searchQuery, statusFilter, selectedDate, selectedSort]);

  // Pagination for Sales Transactions
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedSalesData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSalesData.slice(start, start + itemsPerPage);
  }, [filteredSalesData, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedDate, selectedSort]);

  // Pagination for Customer Rankings
  const [rankCurrentPage, setRankCurrentPage] = useState(1);
  const [rankItemsPerPage, setRankItemsPerPage] = useState(10);

  const paginatedRankings = useMemo(() => {
    const start = (rankCurrentPage - 1) * rankItemsPerPage;
    return filteredCustomerRankings.slice(start, start + rankItemsPerPage);
  }, [filteredCustomerRankings, rankCurrentPage, rankItemsPerPage]);

  useEffect(() => {
    setRankCurrentPage(1);
  }, [rankSearchQuery, rankTierFilter, rankSort]);

  // Dynamic Calculated Metrics
  const calculatedTotalSales = useMemo(() => {
    return salesData.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  }, [salesData]);

  const averageOrderValue = useMemo(() => {
    if (salesData.length === 0) return 0;
    return calculatedTotalSales / salesData.length;
  }, [salesData, calculatedTotalSales]);

  // Top 3 Customers for Spotlight Podium
  const topThreeCustomers = useMemo(() => {
    return fullCustomerRankings.slice(0, 3);
  }, [fullCustomerRankings]);

  // Helper: Customer Loyalty Tier Badge UI Component
  const renderCustomerBadge = (tier) => {
    const t = (tier || '').toLowerCase();
    if (t.includes('platinum')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs whitespace-nowrap">
          Platinum
        </span>
      );
    }
    if (t.includes('gold')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs whitespace-nowrap">
          Gold
        </span>
      );
    }
    if (t.includes('silver')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs whitespace-nowrap">
          Silver
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200 shadow-2xs whitespace-nowrap">
        Bronze
      </span>
    );
  };

  // Helper: Rank Medal / Position UI Component
  const renderRankMedal = (rank) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 shadow-xs ring-1 ring-amber-300" title="1st Place Champion">
          <GoldMedal className="w-5 h-5" size={20} />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 shadow-xs ring-1 ring-slate-300" title="2nd Place Runner Up">
          <SilverMedal className="w-5 h-5" size={20} />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-50 shadow-xs ring-1 ring-amber-300" title="3rd Place">
          <BronzeMedal className="w-5 h-5" size={20} />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200">
        #{rank}
      </div>
    );
  };

  // Download Single Receipt PDF
  const handleDownloadReceiptPdf = (sale) => {
    if (!sale) return;
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - OFFICIAL SALES INVOICE & RECEIPT', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('CUSTOMER SALES TRANSACTION & RECEIPT RECORD', 14, 18);

      // Metadata Box
      doc.setDrawColor(220, 225, 230);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 28, 182, 38, 2, 2, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);

      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE / ORDER NO:', 18, 36);
      doc.setFont('helvetica', 'normal');
      doc.text(`${sale.orderId || 'ORD-REF'}`, 62, 36);

      doc.setFont('helvetica', 'bold');
      doc.text('CUSTOMER NAME:', 18, 44);
      doc.setFont('helvetica', 'normal');
      const uStr = sale.username ? ` (@${sale.username})` : '';
      doc.text(`${sale.customer || 'Guest Customer'}${uStr}`, 62, 44);

      doc.setFont('helvetica', 'bold');
      doc.text('TRANSACTION DATE:', 18, 52);
      doc.setFont('helvetica', 'normal');
      doc.text(`${sale.date || new Date().toISOString().split('T')[0]}`, 62, 52);

      doc.setFont('helvetica', 'bold');
      doc.text('FULFILLMENT STATUS:', 18, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(`${(sale.status || 'Delivered').toUpperCase()}`, 62, 60);

      doc.setFont('helvetica', 'bold');
      doc.text('LOYALTY TIER:', 125, 36);
      doc.setFont('helvetica', 'normal');
      doc.text(`${(sale.tier || 'Standard').toUpperCase()} VIP`, 160, 36);

      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT CHANNEL:', 125, 44);
      doc.setFont('helvetica', 'normal');
      doc.text('COD / Verified E-Wallet', 160, 44);

      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL REVENUE:', 125, 52);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(1, 57, 15);
      doc.text(`PHP ${Number(sale.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 160, 52);

      // Detail Table
      const tableHead = [['#', 'Purchased Products / Items Description', 'Fulfillment', 'Amount']];
      const itemsList = (sale.items || 'Standard Order Items').split(',').map((it, idx) => [
        idx + 1,
        it.trim(),
        sale.status || 'Delivered',
        idx === 0 ? `PHP ${Number(sale.amount || 0).toFixed(2)}` : '-'
      ]);

      autoTable(doc, {
        startY: 72,
        head: tableHead,
        body: itemsList,
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

      // Summary Notes Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, finalY, 182, 18, 2, 2, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('CUSTOMER RECEIPT POLICY: Official transaction record. For returns or exchanges, present this receipt within 7 days.', 18, finalY + 6);
      doc.text('SALES AUDIT: Automatically tallied into Mhira Natural Gross Revenue & Customer Loyalty Rankings.', 18, finalY + 12);

      // Signatures
      const signY = finalY + 32;
      doc.setDrawColor(180, 180, 180);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      doc.line(14, signY, 65, signY);
      doc.text('CASHIER / LOGISTICS OFFICER', 14, signY + 5);

      doc.line(78, signY, 130, signY);
      doc.text('DELIVERY RIDER / COURIER', 78, signY + 5);

      doc.line(144, signY, 196, signY);
      doc.text('CUSTOMER RECEIVED SIGNATURE', 144, signY + 5);

      const fileName = `Sales_Receipt_${sale.orderId || 'Order'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Downloaded Sales Receipt PDF: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to generate sales receipt PDF.');
    }
  };

  // Export Customer Rankings & Leaderboard PDF
  const handleExportLeaderboardPdf = () => {
    if (filteredCustomerRankings.length === 0) {
      showErrorToast('No customer ranking records to export.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - CUSTOMER RANKINGS & VIP LEADERBOARD', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Total Ranked Customers: ${filteredCustomerRankings.length} | Gross Revenue: PHP ${calculatedTotalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        14,
        18
      );

      const tableHead = [
        ['Rank', 'Customer Name', 'Username', 'Loyalty Badge', 'Orders', 'Total Spent (PHP)', 'Last Purchase']
      ];

      const tableBody = filteredCustomerRankings.map((c) => [
        `#${c.rank}`,
        c.name || 'Valued Customer',
        `@${c.username || 'customer'}`,
        c.badgeLabel || `${c.tier} Member`,
        c.orderCount || 1,
        `PHP ${Number(c.totalSpent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        c.lastOrderDate || 'Recent'
      ]);

      autoTable(doc, {
        startY: 30,
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
        styles: { cellPadding: 2.5 }
      });

      const fileName = `Customer_Rankings_Leaderboard_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Customer Leaderboard: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to export leaderboard PDF.');
    }
  };

  // Export Customer Rankings CSV
  const handleExportLeaderboardCsv = () => {
    if (filteredCustomerRankings.length === 0) return showErrorToast('No ranking data to export.');
    const headers = 'Rank,Customer Name,Username,Loyalty Badge,Tier,Total Orders,Total Spent,Last Purchase\n';
    const rows = filteredCustomerRankings
      .map(
        (c) =>
          `"${c.rank}","${c.name}","@${c.username}","${c.badgeLabel}","${c.tier}",${c.orderCount},${c.totalSpent},"${c.lastOrderDate}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_rankings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showSuccessToast('Customer rankings exported to CSV successfully!');
  };

  // Export Master Sales Audit Report PDF
  const handleExportSalesAuditPdf = () => {
    if (filteredSalesData.length === 0) {
      showErrorToast('No sales records to export.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - MASTER PERFORMANCE & SALES AUDIT REPORT', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Total Orders: ${filteredSalesData.length} | Gross Revenue: PHP ${calculatedTotalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        14,
        18
      );

      const tableHead = [
        ['#', 'Order ID', 'Customer Name', 'Username', 'Date', 'Purchased Items Summary', 'Revenue Amount', 'Fulfillment Status']
      ];

      const tableBody = filteredSalesData.map((s, idx) => [
        idx + 1,
        s.orderId || 'N/A',
        s.customer || 'Guest',
        `@${s.username || (s.customer ? s.customer.toLowerCase().replace(/[^a-z0-9]/g, '') : 'customer')}`,
        s.date || 'N/A',
        s.items || 'N/A',
        `PHP ${Number(s.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        (s.status || 'Delivered').toUpperCase()
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

      const fileName = `Master_Sales_Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Sales Audit Report: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to export sales audit PDF.');
    }
  };

  const handleExportCSV = () => {
    if (salesData.length === 0) return showErrorToast('No sales data available to export.');
    const headers = 'Order ID,Customer,Username,Date,Items,Amount,Status\n';
    const rows = salesData
      .map(
        (s) =>
          `"${s.orderId}","${s.customer}","@${s.username || s.customer.toLowerCase().replace(/[^a-z0-9]/g, '')}","${s.date}","${s.items}",${s.amount},"${s.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showSuccessToast('Sales report exported to CSV successfully!');
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') {
      return (
        <span className="inline-flex items-center gap-1 bg-slate-50 text-[#01390f] border border-[#01390f] px-2 py-0.5 rounded font-bold text-[11px] whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#01390f]"></span>
          Delivered
        </span>
      );
    }
    if (s === 'in transit') {
      return (
        <span className="inline-flex items-center gap-1 bg-slate-50 text-amber-950 border border-amber-500 px-2 py-0.5 rounded font-bold text-[11px] whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          In Transit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-slate-50 text-amber-950 border border-amber-500 px-2 py-0.5 rounded font-bold text-[11px] whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        {status || 'Processing'}
      </span>
    );
  };

  // Helper to switch to transactions filtered by a specific customer
  const handleFilterByCustomer = (customer) => {
    setActiveTab('All');
    setStatusFilter('All');
    setSearchQuery(customer.username || customer.name);
    showSuccessToast(`Filtered transactions for @${customer.username}`);
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">
      {/* TOP KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Sales Revenue */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Sales Revenue</p>
            <h3 className="text-xl font-black text-slate-800 font-mono mt-1">
              ₱{calculatedTotalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {stats.fulfillmentRate || '100%'} Fulfillment Rate
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#01390f]">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Total Active Customers */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ranked Customers</p>
            <h3 className="text-xl font-black text-slate-800 font-mono mt-1">
              {fullCustomerRankings.length}
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 mt-1">
              <Users className="w-3 h-3 text-slate-400" />
              Active Buyers & VIPs
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Top Customer Champion Spotlight */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              <span>🏆</span>
              <span>#1 Top Customer</span>
            </div>
            {topThreeCustomers[0] ? (
              <div className="mt-1 truncate">
                <p className="text-sm font-black text-slate-800 truncate" title={topThreeCustomers[0].name}>
                  {topThreeCustomers[0].name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-mono text-emerald-800 font-semibold truncate">
                    @{topThreeCustomers[0].username}
                  </span>
                  {renderCustomerBadge(topThreeCustomers[0].tier, topThreeCustomers[0].badgeLabel)}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic mt-1">No sales yet</p>
            )}
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Average Order Value */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Order Value</p>
            <h3 className="text-xl font-black text-slate-800 font-mono mt-1">
              ₱{averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 mt-1">
              <ShoppingBag className="w-3 h-3 text-slate-400" />
              {salesData.length} Total Dispatches
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TOP 3 CUSTOMER PODIUM / SPOTLIGHT SHOWCASE */}
      {topThreeCustomers.length > 0 && (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
                <span>Customer Loyalty Podium & Hall of Fame</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-[#01390f] border border-emerald-200">
                  Top Spenders
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                VIP loyalty rankings based on cumulative purchases, verified orders, and badge tiers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('rankings');
                setRankTierFilter('All');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#01390f] hover:underline cursor-pointer self-start sm:self-auto"
            >
              <span>View All Customer Rankings</span>
              <span>➔</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
            {/* 1st Place Champion */}
            {topThreeCustomers[0] && (
              <div className="relative bg-gradient-to-b from-amber-50/60 to-white border-2 border-amber-300 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                <div className="absolute -top-3 right-4 bg-amber-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1.5">
                  <GoldMedal className="w-3.5 h-3.5" size={14} />
                  <span>Gold</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-black text-lg shrink-0 shadow-2xs overflow-hidden">
                    {topThreeCustomers[0].profileImage ? (
                      <img
                        src={topThreeCustomers[0].profileImage}
                        alt={topThreeCustomers[0].name}
                        className="w-full h-full object-cover rounded-2xl"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      topThreeCustomers[0].name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 text-sm truncate" title={topThreeCustomers[0].name}>
                      {topThreeCustomers[0].name}
                    </h3>
                    <p className="text-xs font-mono text-emerald-800 font-bold truncate">
                      @{topThreeCustomers[0].username}
                    </p>
                    <div className="mt-1">
                      {renderCustomerBadge(topThreeCustomers[0].tier)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Spent</span>
                    <span className="font-mono font-black text-base text-[#01390f]">
                      ₱{Number(topThreeCustomers[0].totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Orders</span>
                    <span className="font-bold text-slate-700 bg-amber-100/80 px-2 py-0.5 rounded-md text-xs">
                      {topThreeCustomers[0].orderCount} Orders
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2nd Place Runner-Up */}
            {topThreeCustomers[1] && (
              <div className="relative bg-gradient-to-b from-slate-50 to-white border border-slate-300 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                <div className="absolute -top-3 right-4 bg-slate-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1.5">
                  <SilverMedal className="w-3.5 h-3.5" size={14} />
                  <span>Silver</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-black text-lg shrink-0 shadow-2xs overflow-hidden">
                    {topThreeCustomers[1].profileImage ? (
                      <img
                        src={topThreeCustomers[1].profileImage}
                        alt={topThreeCustomers[1].name}
                        className="w-full h-full object-cover rounded-2xl"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      topThreeCustomers[1].name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 text-sm truncate" title={topThreeCustomers[1].name}>
                      {topThreeCustomers[1].name}
                    </h3>
                    <p className="text-xs font-mono text-emerald-800 font-bold truncate">
                      @{topThreeCustomers[1].username}
                    </p>
                    <div className="mt-1">
                      {renderCustomerBadge(topThreeCustomers[1].tier)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Spent</span>
                    <span className="font-mono font-black text-base text-[#01390f]">
                      ₱{Number(topThreeCustomers[1].totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Orders</span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                      {topThreeCustomers[1].orderCount} Orders
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThreeCustomers[2] && (
              <div className="relative bg-gradient-to-b from-orange-50/40 to-white border border-amber-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                <div className="absolute -top-3 right-4 bg-amber-700 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1.5">
                  <BronzeMedal className="w-3.5 h-3.5" size={14} />
                  <span>Bronze</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100/60 border border-amber-200 flex items-center justify-center text-amber-900 font-black text-lg shrink-0 shadow-2xs overflow-hidden">
                    {topThreeCustomers[2].profileImage ? (
                      <img
                        src={topThreeCustomers[2].profileImage}
                        alt={topThreeCustomers[2].name}
                        className="w-full h-full object-cover rounded-2xl"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      topThreeCustomers[2].name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 text-sm truncate" title={topThreeCustomers[2].name}>
                      {topThreeCustomers[2].name}
                    </h3>
                    <p className="text-xs font-mono text-emerald-800 font-bold truncate">
                      @{topThreeCustomers[2].username}
                    </p>
                    <div className="mt-1">
                      {renderCustomerBadge(topThreeCustomers[2].tier)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Spent</span>
                    <span className="font-mono font-black text-base text-[#01390f]">
                      ₱{Number(topThreeCustomers[2].totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Orders</span>
                    <span className="font-bold text-slate-700 bg-amber-100/60 px-2 py-0.5 rounded-md text-xs">
                      {topThreeCustomers[2].orderCount} Orders
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN DATA CONTAINER (CUSTOMER RANKINGS OR SALES TRANSACTIONS) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'rankings', label: 'Customer Rankings & Badges', isLeaderboard: true },
              { id: 'All', label: 'All Transactions' },
              { id: 'Delivered', label: 'Delivered' },
              { id: 'In Transit', label: 'In Transit' },
              { id: 'Processing', label: 'Processing' },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id !== 'rankings') {
                      setStatusFilter(tab.id);
                    }
                  }}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'border-[#01390f] text-[#01390f] bg-slate-50'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  {tab.isLeaderboard && <Award className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* VIEW 1: CUSTOMER RANKINGS & LEADERBOARD VIEW */}
        {activeTab === 'rankings' ? (
          <div className="flex flex-col gap-5">
            {/* RANKINGS RIBBON TOOLBAR */}
            <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
              {/* ACTIONS GROUP */}
              <div className="w-[226px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
                <div className="flex items-stretch gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={handleExportLeaderboardPdf}
                    className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                    title="Export Customer Rankings PDF"
                  >
                    <FileDown className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-center leading-tight">Export PDF</span>
                  </button>
                  <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                    <button
                      type="button"
                      onClick={handleExportLeaderboardCsv}
                      className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Export CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={fetchSalesReport}
                      className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                      <span className="truncate">Refresh Ranks</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRankSearchQuery('');
                        setRankTierFilter('All');
                        setRankSort('highest');
                      }}
                      className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer w-full"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">Reset Filters</span>
                    </button>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                  Rank Actions
                </div>
              </div>

              {/* SEARCH & FILTER GROUP */}
              <div className="flex flex-col justify-between flex-1 min-h-[92px] pl-1">
                <div className="flex flex-col justify-between flex-1 gap-1.5 py-0.5">
                  {/* Layer 1: Search Customer or Username */}
                  <div className="relative flex items-center w-full">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={rankSearchQuery}
                      onChange={(e) => setRankSearchQuery(e.target.value)}
                      placeholder="Search customer full name or @username..."
                      className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    />
                    {rankSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setRankSearchQuery('')}
                        className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Layer 2: Tier Filter & Sort Order */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {/* Tier Filter */}
                    <div className="relative w-full">
                      <Sparkles className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                      <select
                        value={rankTierFilter}
                        onChange={(e) => setRankTierFilter(e.target.value)}
                        className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate font-medium"
                      >
                        <option value="All">All Loyalty Tiers</option>
                        <option value="Platinum">Platinum VIP (₱10k+)</option>
                        <option value="Gold">Gold VIP (₱5k+)</option>
                        <option value="Silver">Silver Loyal (₱1k+)</option>
                        <option value="Bronze">Bronze Member</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Sort Order */}
                    <div className="relative w-full">
                      <SlidersHorizontal className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                      <select
                        value={rankSort}
                        onChange={(e) => setRankSort(e.target.value)}
                        className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate font-medium"
                      >
                        <option value="highest">Sort: Highest Total Spend</option>
                        <option value="orders">Sort: Most Orders Placed</option>
                        <option value="name">Sort: Customer Name (A-Z)</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Layer 3: Quick Filter Toggles */}
                  <div className="grid grid-cols-4 gap-2 w-full">
                    {[
                      { id: 'All', label: 'All Customers' },
                      { id: 'Platinum', label: 'Platinum' },
                      { id: 'Gold', label: 'Gold' },
                      { id: 'Silver', label: 'Silver' },
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setRankTierFilter(rankTierFilter === tier.id ? 'All' : tier.id)}
                        className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                          rankTierFilter === tier.id
                            ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                  Leaderboard Filters
                </div>
              </div>
            </div>

            {/* HR DIVIDER */}
            <hr className="border-slate-200 -mt-2 -mb-2" />

            {/* CUSTOMER LEADERBOARD TABLE */}
            <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden flex flex-col">
              <TablePagination
                currentPage={rankCurrentPage}
                totalItems={filteredCustomerRankings.length}
                itemsPerPage={rankItemsPerPage}
                onPageChange={setRankCurrentPage}
                onRowsPerPageChange={(rows) => {
                  setRankItemsPerPage(rows);
                  setRankCurrentPage(1);
                }}
              />

              <div className="overflow-x-auto relative custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                      <th className="py-3.5 px-4 text-center w-16">Rank</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Customer Name & Username</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Loyalty Tier</th>
                      <th className="py-3.5 px-4 text-right font-mono whitespace-nowrap">Total Spent</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Orders Placed</th>
                      <th className="py-3.5 px-4 text-right font-mono whitespace-nowrap">Avg / Order</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Last Purchase</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-32">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Computing customer leaderboard & badges...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredCustomerRankings.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                          No customer rankings found matching your search.
                        </td>
                      </tr>
                    ) : (
                      paginatedRankings.map((c) => {
                        const avg = c.orderCount > 0 ? c.totalSpent / c.orderCount : c.totalSpent;
                        return (
                          <tr
                            key={c.username || c.name}
                            className="hover:bg-slate-50/90 transition-colors text-slate-700 whitespace-nowrap group"
                          >
                            {/* Rank Column */}
                            <td className="py-3 px-4 text-center font-bold">
                              <div className="flex justify-center">
                                {renderRankMedal(c.rank)}
                              </div>
                            </td>

                            {/* Customer Profile (Name & Username) */}
                            <td className="py-3 px-4 min-w-[200px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 group-hover:border-[#01390f] transition-colors overflow-hidden">
                                  {c.profileImage ? (
                                    <img
                                      src={c.profileImage}
                                      alt={c.name}
                                      className="w-full h-full object-cover rounded-xl"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    c.name ? c.name.charAt(0).toUpperCase() : 'U'
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-800 text-xs truncate" title={c.name}>
                                    {c.name}
                                  </span>
                                  <span className="font-mono text-[11px] text-[#01390f] font-semibold truncate">
                                    @{c.username}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Loyalty Badge */}
                            <td className="py-3 px-4 text-center">
                              {renderCustomerBadge(c.tier, c.badgeLabel)}
                            </td>

                            {/* Total Spent */}
                            <td className="py-3 px-4 font-mono font-bold text-[#01390f] text-right text-xs">
                              ₱{Number(c.totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Orders Placed */}
                            <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold">
                                {c.orderCount} {c.orderCount === 1 ? 'order' : 'orders'}
                              </span>
                            </td>

                            {/* Avg / Order */}
                            <td className="py-3 px-4 font-mono text-right text-slate-600 text-xs">
                              ₱{Number(avg || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Last Purchase */}
                            <td className="py-3 px-4 font-mono text-center text-slate-500 text-xs">
                              {c.lastOrderDate || 'Recent'}
                            </td>

                            {/* Action: Filter Transactions */}
                            <td className="py-3 px-4 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-32">
                              <button
                                type="button"
                                onClick={() => handleFilterByCustomer(c)}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-[#01390f] hover:border-[#01390f] hover:bg-slate-50 font-semibold text-[11px] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                                title={`View all transaction logs for ${c.name}`}
                              >
                                View Orders
                              </button>
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
        ) : (
          /* VIEW 2: SALES TRANSACTIONS LOGS (ALL, DELIVERED, IN TRANSIT, PROCESSING) */
          <div className="flex flex-col gap-5">
            {/* EXCEL RIBBON TOOLBAR */}
            <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
              {/* ACTIONS GROUP */}
              <div className="w-[226px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
                <div className="flex items-stretch gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={handleExportSalesAuditPdf}
                    className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                    title="Export Master Sales Audit PDF"
                  >
                    <FileDown className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-center leading-tight">Export Audit</span>
                  </button>
                  <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Export CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={fetchSalesReport}
                      className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                      <span className="truncate">Refresh Records</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('All');
                        setSelectedDate('');
                        setSelectedSort('newest');
                      }}
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
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search order ID, customer name, @username, items..."
                      className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
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

                    {/* Fulfillment Status */}
                    <div className="relative w-full">
                      <Package className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Delivered">Delivered</option>
                        <option value="In Transit">In Transit</option>
                        <option value="Processing">Processing</option>
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
                        <option value="newest">Sort: Newest Date</option>
                        <option value="oldest">Sort: Oldest Date</option>
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
                      onClick={() => setStatusFilter(statusFilter === 'Delivered' ? 'All' : 'Delivered')}
                      className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                        statusFilter === 'Delivered'
                          ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Delivered Only
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter(statusFilter === 'In Transit' ? 'All' : 'In Transit')}
                      className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                        statusFilter === 'In Transit'
                          ? 'bg-amber-50 border-amber-600 text-amber-700 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      In Transit Only
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
                      Today's Logs
                    </button>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                  Search & Filter
                </div>
              </div>
            </div>

            {/* HR DIVIDER ABOVE TABLE */}
            <hr className="border-slate-200 -mt-2 -mb-2" />

            {/* MASTER TRANSACTION TABLE */}
            <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden flex flex-col">
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredSalesData.length}
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
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">
                        Order ID
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[210px]">
                        Customer Name & Username
                      </th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Date</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Purchased Items</th>
                      <th className="py-3.5 px-4 text-right font-mono whitespace-nowrap">Amount</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Fulfillment Status</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-36 min-w-[120px]">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loading ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Loading sales transactions...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredSalesData.length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                        >
                          No sales transactions found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedSalesData.map((sale) => {
                        const cleanUname = sale.username || (sale.customer ? sale.customer.toLowerCase().replace(/[^a-z0-9]/g, '') : 'customer');
                        return (
                          <tr
                            key={sale._id || sale.orderId}
                            className="hover:bg-slate-50/90 transition-colors text-slate-700 whitespace-nowrap group"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-[#01390f] whitespace-nowrap min-w-[130px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {sale.orderId}
                            </td>

                            {/* Customer Name, Username & Badge */}
                            <td className="py-3 px-4 min-w-[210px]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 group-hover:border-[#01390f] transition-colors">
                                  {sale.customer ? sale.customer.charAt(0).toUpperCase() : 'C'}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-800 text-xs">
                                      {sale.customer}
                                    </span>
                                    {renderCustomerBadge(sale.tier, sale.tier ? `${sale.tier} VIP` : 'Customer')}
                                  </div>
                                  <span className="font-mono text-[11px] text-[#01390f] font-semibold">
                                    @{cleanUname}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono text-center text-slate-500">
                              {sale.date}
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={sale.items}>
                              {sale.items}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-[#01390f] text-right">
                              ₱{Number(sale.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {getStatusBadge(sale.status)}
                            </td>
                            <td className="py-3 px-4 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-36 min-w-[120px]">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadReceiptPdf(sale)}
                                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                                  title="Download Sales Receipt PDF"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedSale(sale)}
                                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                                  title="View Receipt Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteTransaction(sale._id, e)}
                                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all cursor-pointer shadow-2xs"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* RECEIPT DETAILS MODAL */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 whitespace-nowrap">
                  Sales Receipt ({selectedSale.orderId})
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Delivered on {selectedSale.date || 'Recent Date'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">
                      {selectedSale.customer}
                    </span>
                    <span className="font-mono text-xs text-[#01390f] font-semibold block">
                      @{selectedSale.username || (selectedSale.customer ? selectedSale.customer.toLowerCase().replace(/[^a-z0-9]/g, '') : 'customer')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Loyalty VIP Tier:</span>
                  <div>
                    {renderCustomerBadge(selectedSale.tier, selectedSale.tier ? `${selectedSale.tier} VIP` : 'Valued Customer')}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Order Number:</span>
                  <span className="font-mono font-bold text-[#01390f]">
                    {selectedSale.orderId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Delivery Date:</span>
                  <span className="font-mono text-slate-700">
                    {selectedSale.date}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Fulfillment Status:</span>
                  {getStatusBadge(selectedSale.status)}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Total Sales Amount:</span>
                  <span className="font-mono font-black text-[#01390f] text-base">
                    ₱{Number(selectedSale.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* PURCHASED ITEMS SUMMARY */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Purchased Products Breakdown:
                </span>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-800 font-medium text-xs leading-relaxed">
                  {selectedSale.items}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => handleDownloadReceiptPdf(selectedSale)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
              >
                <FileDown className="w-4 h-4 text-red-600" />
                <span>Download Receipt PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 transition-all cursor-pointer whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogisticsPerformanceAnalytics;
