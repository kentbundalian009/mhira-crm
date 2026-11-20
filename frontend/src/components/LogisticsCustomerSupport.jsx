import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Headphones,
  UserCheck,
  Send,
  Trash2,
  MessageSquareText,
  Search,
  CheckCircle2,
  Clock,
  Paperclip,
  Download,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
  Check,
  History,
  AlertCircle,
  Package,
  ExternalLink,
  FileDown,
  ChevronRight,
  User,
  ArrowRight,
  Layers,
  Sparkles,
  Tag,
  Printer,
  Copy,
  FileText,
  X,
  Calendar,
  Filter,
  ChevronDown,
  SlidersHorizontal,
  Eye,
  RotateCcw,
  FileSpreadsheet,
  ArrowUpDown,
  Activity
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { showSuccessToast, showErrorToast } from "../utils/toast";
import { compressImageToBase64 } from "../utils/imageCompressor";
import TablePagination from "./common/TablePagination";
import { downloadTicketTranscriptPdf } from "../utils/pdfUtils";

import { API_BASE_URL } from "../utils/apiConfig";

function LogisticsCustomerSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pending' | 'resolved'

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [selectedSort, setSelectedSort] = useState("newest");
  const dateInputRef = useRef(null);

  // Slide-over Drawer / Selected Ticket State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState("chat"); // 'chat' | 'templates' | 'customer' | 'transcript'
  const [replyInput, setReplyInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // CSR Attachment state
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [previewModalImg, setPreviewModalImg] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const prevMsgLengthRef = useRef(0);

  // Logistics & Customer Care Canned Responses
  const cannedResponses = [
    "Hello! Thank you for contacting Mhira Logistics Customer Support. How may I assist your order today?",
    "Your parcel has been packed and handed over to our courier partner. You will receive live delivery updates shortly.",
    "Please send your complete Order ID so our dispatch team can immediately track your shipment status.",
    "We have verified your photo proof and our team has approved the replacement request for your order.",
    "Our products are 100% natural, handcrafted, and safe for all skin types.",
    "Thank you for contacting Mhira Customer Support! Have a wonderful day.",
  ];

  // Auto-scroll chat on new message
  useEffect(() => {
    const currentMsgCount = selectedTicket?.messages?.length || 0;
    if (
      selectedTicket &&
      (currentMsgCount > prevMsgLengthRef.current || prevMsgLengthRef.current === 0)
    ) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgLengthRef.current = currentMsgCount;
  }, [selectedTicket?.ticketId, selectedTicket?.messages?.length, activeDrawerTab]);

  // Fetch all tickets from backend
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/chatbot/tickets`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);

        if (selectedTicket) {
          const updatedSelected = (data.tickets || []).find(
            (t) => t.ticketId === selectedTicket.ticketId
          );
          if (updatedSelected) {
            setSelectedTicket(updatedSelected);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch support tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectTicket = (t) => {
    prevMsgLengthRef.current = 0;
    setSelectedTicket(t);
  };

  // Handle CSR Attachment Selection
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("File size must be under 5MB.");
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageToBase64(file, {
          maxWidth: 600,
          maxHeight: 600,
          quality: 0.75,
        });
        setFilePreview(compressed);
      } catch (err) {
        console.error('Failed to compress attachment:', err);
      }
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Send CSR Reply to Customer
  const handleSendReply = async (textToSend = replyInput) => {
    const text = typeof textToSend === "string" ? textToSend : replyInput;
    const attachmentToSend = filePreview;

    if ((!text.trim() && !attachmentToSend) || !selectedTicket) return;

    try {
      setSending(true);
      const res = await fetch(`${API_BASE_URL}/api/chatbot/csr-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.ticketId,
          text: text.trim(),
          attachment: attachmentToSend || "",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyInput("");
        removeSelectedFile();
        fetchTickets();
        showSuccessToast("Response sent to customer.");
      }
    } catch (err) {
      console.error("Error sending CSR response:", err);
      showErrorToast("Failed to send response.");
    } finally {
      setSending(false);
    }
  };

  // Toggle Ticket Status (Resolved vs Active)
  const handleToggleResolve = async (statusToSet) => {
    if (!selectedTicket) return;
    try {
      setIsUpdatingStatus(true);
      const res = await fetch(`${API_BASE_URL}/api/chatbot/ticket/${selectedTicket.ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusToSet }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(`Ticket marked as ${statusToSet === "resolved" ? "Resolved" : "Active"}.`);
        fetchTickets();
        window.dispatchEvent(new Event('ticketsUpdated'));
        window.dispatchEvent(new Event('sidebarCountRefresh'));
      }
    } catch (err) {
      showErrorToast("Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Ticket
  const handleDeleteTicket = async (ticketId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this support conversation?"))
      return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/chatbot/ticket/${ticketId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Conversation removed.");
        if (selectedTicket?.ticketId === ticketId) {
          setSelectedTicket(null);
        }
        fetchTickets();
        window.dispatchEvent(new Event('ticketsUpdated'));
        window.dispatchEvent(new Event('sidebarCountRefresh'));
      }
    } catch (err) {
      showErrorToast("Failed to remove ticket.");
    }
  };

  // Metrics
  const activeCount = useMemo(
    () => tickets.filter((t) => t.status !== "resolved").length,
    [tickets]
  );
  const resolvedCount = useMemo(
    () => tickets.filter((t) => t.status === "resolved").length,
    [tickets]
  );
  const attachmentsCount = useMemo(() => {
    return tickets.reduce((acc, t) => {
      const hasAtt = t.messages?.some((m) => m.attachment);
      return acc + (hasAtt ? 1 : 0);
    }, 0);
  }, [tickets]);

  const statusTabs = [
    { id: "pending", label: "Active Inquiries", icon: Clock, count: activeCount },
    { id: "resolved", label: "Resolved Cases", icon: CheckCircle2, count: resolvedCount },
  ];

  const existingTopics = useMemo(() => {
    const set = new Set();
    tickets.forEach((t) => {
      if (t.subject) set.add(t.subject);
    });
    return Array.from(set);
  }, [tickets]);

  // Filtered List
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const isResolved = t.status === "resolved";
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "pending" && !isResolved) ||
        (activeTab === "resolved" && isResolved);

      const customerName = t.customerName || "";
      const ticketId = t.ticketId || "";
      const subject = t.subject || "";
      const lastMsgText = t.messages?.map((m) => m.text).join(" ") || "";

      const matchesSearch =
        ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lastMsgText.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (selectedDate && t.createdAt) {
        const reqDate = new Date(t.createdAt).toISOString().split("T")[0];
        matchesDate = reqDate === selectedDate;
      }

      let matchesTopic = selectedTopic === "All";
      if (!matchesTopic) {
        matchesTopic = (t.subject || "").toLowerCase() === selectedTopic.toLowerCase();
      }

      return matchesTab && matchesSearch && matchesDate && matchesTopic;
    }).sort((a, b) => {
      if (selectedSort === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (selectedSort === "messages-high") {
        return (b.messages?.length || 0) - (a.messages?.length || 0);
      }
      if (selectedSort === "messages-low") {
        return (a.messages?.length || 0) - (b.messages?.length || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [tickets, activeTab, searchTerm, selectedDate, selectedTopic, selectedSort]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedDate) count++;
    if (selectedTopic !== "All") count++;
    if (selectedSort !== "newest") count++;
    if (activeTab !== "all") count++;
    return count;
  }, [searchTerm, selectedDate, selectedTopic, selectedSort, activeTab]);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, selectedDate, selectedTopic, selectedSort]);

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setSelectedDate("");
    setSelectedTopic("All");
    setSelectedSort("newest");
    setActiveTab("all");
    setCurrentPage(1);
  };

  // PDF Transcript Download (Matching Waybill Executive UI / A4 Standard)
  const handleDownloadTicketPdf = async (ticket) => {
    if (!ticket) return;
    try {
      await downloadTicketTranscriptPdf(ticket);
      showSuccessToast("Downloaded Support Transcript PDF!");
    } catch (e) {
      console.error("PDF Export error:", e);
      showErrorToast("Failed to export transcript PDF.");
    }
  };

  // Master Support Summary Export
  const handleDownloadMasterSupportPdf = (ticketList) => {
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 297, 24, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("MHIRA NATURAL - MASTER CUSTOMER INQUIRIES & SUPPORT LOG", 14, 11);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on ${new Date().toLocaleDateString()} | Total Inquiries: ${ticketList.length}`, 14, 18);

      const tableHead = [["#", "Ticket ID", "Customer Name", "Topic / Subject", "Total Messages", "Last Activity", "Status"]];
      const tableBody = (ticketList || []).map((t, idx) => [
        idx + 1,
        `#${t.ticketId}`,
        t.customerName || "Customer",
        t.subject || "Order Inquiry",
        t.messages?.length || 0,
        t.messages?.[t.messages.length - 1]?.time || "Recent",
        t.status === "resolved" ? "RESOLVED" : "ACTIVE / PENDING",
      ]);

      autoTable(doc, {
        startY: 30,
        head: tableHead,
        body: tableBody,
        headStyles: { fillColor: [1, 57, 15], textColor: 255, fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: "grid",
        styles: { cellPadding: 2.2 },
      });

      doc.save(`Support_Inquiries_Summary_${new Date().toISOString().split("T")[0]}.pdf`);
      showSuccessToast("Exported Master Support Summary PDF!");
    } catch (err) {
      showErrorToast("Failed to export support summary.");
    }
  };

  const getStatusBadge = (status) => {
    const isResolved = status === "resolved";
    if (isResolved) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-800 border border-yellow-300 px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
        Active / Pending
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-800">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0">
          <div className="flex items-center gap-1 -mb-px">
            {/* 1. All Inquiries Master Sheet */}
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap rounded-t-lg ${activeTab === 'all'
                  ? 'border-[#01390f] text-[#01390f] bg-slate-50 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#01390f]" />
              <span>All Inquiries</span>
            </button>

            {/* 2. Active & Pending Notification Tab */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'pending' ? 'all' : 'pending')}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap rounded-t-lg ${activeTab === 'pending'
                  ? activeCount > 0
                    ? 'border-[#c81e1e] text-[#c81e1e] bg-red-50/80 font-bold shadow-2xs'
                    : 'border-[#01390f] text-[#01390f] bg-slate-50 font-bold'
                  : activeCount > 0
                    ? 'border-transparent text-slate-600 hover:text-[#c81e1e] hover:bg-red-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              title="Filter by Active & Pending Customer Support Cases"
            >
              {activeCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#c81e1e] shrink-0 animate-pulse" />
              )}
              <span>Active & Pending</span>
              {activeCount > 0 && (
                <span
                  className={`h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 leading-none shadow-xs ${activeCount > 99 ? 'min-w-5 px-1' : 'w-5 aspect-square'
                    } ${activeTab === 'pending'
                      ? 'bg-[#c81e1e] text-white'
                      : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  title={`${activeCount} Active / Pending Support Cases`}
                >
                  {activeCount > 99 ? '99+' : activeCount}
                </span>
              )}
            </button>

            {/* 3. Resolved Sheet Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('resolved')}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap rounded-t-lg ${activeTab === 'resolved'
                  ? 'border-[#01390f] text-[#01390f] bg-slate-50 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
            >
              <span>Resolved</span>
            </button>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              <span>Live CSR Sync</span>
            </span>
          </div>
        </div>

        {/* MS EXCEL-STYLE RIBBON TOOLBAR (RESPONSIVE: STACKS ON MOBILE, 1 ROW ON DESKTOP) */}
        <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
          {/* ACTIONS GROUP */}
          <div className="w-full lg:w-[256px] shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]">
            <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => handleDownloadMasterSupportPdf(filteredTickets)}
                className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                title="Export Master Inquiries Summary Report PDF"
              >
                <FileDown className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                  Export<br />PDF
                </span>
              </button>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                <button
                  type="button"
                  onClick={fetchTickets}
                  className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-[#01390f] transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                  <span className="truncate">Refresh Chats</span>
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
                  placeholder="Search ticket ID, customer name, message..."
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

                {/* Inquiry Topic */}
                <div className="relative w-full">
                  <MessageSquareText className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
                  >
                    <option value="All">All Inquiry Topics</option>
                    {existingTopics.map((topic, idx) => (
                      <option key={idx} value={topic}>
                        {topic}
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
                    <option value="newest">Sort: Newest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                    <option value="messages-high">Sort: Most Messages</option>
                    <option value="messages-low">Sort: Fewest Messages</option>
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
                  Pending Only
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'resolved' ? 'all' : 'resolved')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${activeTab === 'resolved'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                >
                  Resolved Only
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
                  Today's Chats
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
            totalItems={filteredTickets.length}
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
                    TICKET ID
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-center">
                    DATE FILED
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    CUSTOMER NAME
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    CUSTOMER EMAIL
                  </th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-20 min-w-[80px]">
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {loading && tickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#01390f]" />
                        <span>Loading support inquiries...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Headphones className="w-6 h-6 text-slate-300" />
                        <span>No customer support conversations found matching your search or filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((t) => {
                    const ticketDate = new Date(t.createdAt || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const customerEmail = t.customerEmail || (t.userId && t.userId.includes('@') ? t.userId : `${(t.customerName || 'customer').toLowerCase().replace(/\s+/g, '')}@gmail.com`);

                    return (
                      <tr
                        key={t.ticketId}
                        onClick={() => handleSelectTicket(t)}
                        className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm cursor-pointer"
                      >
                        {/* 1. TICKET ID */}
                        <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                            #{t.ticketId}
                          </span>
                        </td>

                        {/* 2. DATE FILED */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {ticketDate}
                        </td>

                        {/* 3. CUSTOMER NAME */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-xs text-slate-900 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {t.customerName || 'Customer'}
                        </td>

                        {/* 4. CUSTOMER EMAIL */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {customerEmail}
                        </td>

                        {/* 5. ACTION (Sticky Right) */}
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-20 min-w-[80px] transition-colors"
                        >
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleSelectTicket(t)}
                              title="View & Respond to Inquiry"
                              aria-label="View & Respond to Inquiry"
                              className="relative w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 group/btn"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600 group-hover/btn:text-white transition-colors" />
                              {t.status !== 'resolved' && (
                                <span
                                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-600 border-2 border-white animate-pulse"
                                  title="Active / Pending Support Inquiry"
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

      {/* 5. SLIDE-OVER SIDEBAR DRAWER (CHAT & WORKSPACE) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-hidden font-['Poppins',sans-serif]">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedTicket(null)}
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
                      {selectedTicket.customerName || "Customer Inquiry"}
                    </h2>
                    {getStatusBadge(selectedTicket.status)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#01390f]" />
                      <span>Ticket #{selectedTicket.ticketId}</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm shrink-0"
                  title="Close Sidebar"
                >
                  ✕
                </button>
              </div>

              {/* DRAWER TABS BAR (Inquiry Process & All Support Workflow Tabs) */}
              <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
                {/* Left Side: Inquiry Process (Pill Button with Text) */}
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab("process")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    activeDrawerTab === "process"
                      ? "bg-[#01390f] text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Inquiry Process</span>
                </button>

                {/* Right Side: Circular Icon Action Tabs (Circle Only, Text White, BG Blue when active) */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab("chat")}
                    title="Live Interaction Chat"
                    aria-label="Live Interaction Chat"
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      activeDrawerTab === "chat"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    <MessageSquareText className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab("templates")}
                    title="Canned Replies"
                    aria-label="Canned Replies"
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      activeDrawerTab === "templates"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab("customer")}
                    title="Customer Profile"
                    aria-label="Customer Profile"
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      activeDrawerTab === "customer"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab("transcript")}
                    title="Transcript PDF"
                    aria-label="Transcript PDF"
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      activeDrawerTab === "transcript"
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
                {/* TAB: INQUIRY PROCESS AUDIT (Same UI as Process Audit) */}
                {activeDrawerTab === "process" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Process Audit
                      </span>

                      {(() => {
                        const isResolved = selectedTicket.status === "resolved";
                        const messages = selectedTicket.messages || [];
                        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
                        const firstMsg = messages.length > 0 ? messages[0] : null;

                        const displayTimeline = [];

                        // 4. Resolution
                        if (isResolved) {
                          displayTimeline.push({
                            title: "Resolution",
                            description: "Support ticket successfully resolved and closed. Customer issue addressed.",
                            timestamp: selectedTicket.updatedAt || new Date(),
                          });
                        }

                        // 3. Investigation & Live Chat
                        displayTimeline.push({
                          title: "Investigation & Live Chat",
                          description: `Active live chat interaction with customer (${messages.length} message(s) exchanged via ${selectedTicket.channel || "Customer Chat"}).`,
                          timestamp: lastMsg?.timestamp || selectedTicket.updatedAt || new Date(),
                        });

                        // 2. CSR Assigned
                        displayTimeline.push({
                          title: "CSR Assigned",
                          description: `Customer service representative (${selectedTicket.assignedTo || "Mhira Logistics Support Staff"}) assigned to the triage desk.`,
                          timestamp: firstMsg?.timestamp ? new Date(new Date(firstMsg.timestamp).getTime() - 30000) : (selectedTicket.createdAt || new Date()),
                        });

                        // 1. Inquiry Received
                        displayTimeline.push({
                          title: "Inquiry Received",
                          description: `Customer inquiry registered in the system (Ticket #${selectedTicket.ticketId || "TCK"}). Topic: ${selectedTicket.topic || "General Inquiry"}.`,
                          timestamp: selectedTicket.createdAt || new Date(),
                        });

                        return (
                          <div className="space-y-4 border-l-2 border-blue-200 ml-2.5 pl-4 py-1">
                            {displayTimeline.map((item, tIdx) => {
                              const isLatest = tIdx === 0;

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
                                      {isLatest && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                          Latest Activity
                                        </span>
                                      )}
                                    </div>
                                    {formattedDateTime && (
                                      <span className="text-[11px] font-mono text-slate-500">
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

                {/* TAB 1: LIVE CHAT STREAM & COMPOSER */}
                {activeDrawerTab === "chat" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Live Interaction Chat
                        </span>
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          {selectedTicket.messages?.length || 0} Exchanged
                        </span>
                      </div>

                      {/* Chat Messages Inner White Card */}
                      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 max-h-[360px] min-h-[220px] overflow-y-auto space-y-3 custom-scrollbar">
                        {selectedTicket.messages?.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400 italic">
                            No messages in this inquiry thread yet.
                          </div>
                        ) : (
                          selectedTicket.messages?.map((m, idx) => {
                            const isCust = m.sender === "customer";
                            const isStaff = m.sender === "csr";

                            return (
                              <div
                                key={idx}
                                className={`flex flex-col ${isCust ? "items-start" : "items-end"}`}
                              >
                                <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">
                                  {isCust ? selectedTicket.customerName || "Customer" : "Logistics Agent"} • {m.time || ""}
                                </span>

                                <div
                                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                                    isCust
                                      ? "bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/80"
                                      : isStaff
                                        ? "bg-[#01390f] text-white rounded-tr-xs"
                                        : "bg-slate-200 text-slate-800 rounded-tr-xs"
                                  }`}
                                >
                                  {/* RICH ORDER CARD IF SENT BY CUSTOMER */}
                                  {m.orderData && (
                                    <div className="bg-white text-slate-900 rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2 text-left mb-2">
                                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                        <span className="font-bold text-[#01390f] text-xs flex items-center gap-1 font-mono">
                                          Order #{m.orderData.orderNumber}
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                          {m.orderData.status}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <img
                                          src={m.orderData.itemImage}
                                          alt={m.orderData.itemName}
                                          className="w-12 h-12 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                                          onError={(e) => { e.target.src = "/mhira_removebg.png"; }}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="font-semibold text-xs text-slate-900 truncate">
                                            {m.orderData.itemName}
                                          </p>
                                          <p className="text-[11px] text-slate-600 mt-0.5">
                                            Qty: {m.orderData.quantity} • <strong className="text-[#01390f]">₱{Number(m.orderData.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                          </p>
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex flex-col gap-0.5">
                                        <p><strong className="text-slate-800">Payment:</strong> {m.orderData.paymentMethod || "COD"} ({m.orderData.paymentStatus || "Paid"})</p>
                                        <p><strong className="text-slate-800">Recipient:</strong> {m.orderData.customerName} ({m.orderData.shippingAddress})</p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReplyInput(
                                            `Hello ${m.orderData.customerName || "Customer"}! We have verified your Order #${m.orderData.orderNumber} (${m.orderData.itemName}). Your package is currently ${m.orderData.status} and being handled with priority.`
                                          );
                                        }}
                                        className="w-full mt-1.5 py-1.5 px-3 bg-[#01390f] hover:bg-[#0a5219] text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                      >
                                        <span>Confirm & Verify Order to Customer</span>
                                      </button>
                                    </div>
                                  )}

                                  {m.text && <p>{m.text}</p>}

                                  {m.attachment && (
                                    <div className="mt-2">
                                      <img
                                        src={m.attachment}
                                        alt="Attachment"
                                        onClick={() => setPreviewModalImg(m.attachment)}
                                        className="max-h-40 rounded-xl object-cover border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Attachment preview if selected */}
                      {filePreview && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-xl">
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="w-10 h-10 object-cover rounded-lg border border-blue-300"
                          />
                          <span className="text-xs text-blue-700 font-medium truncate flex-1">
                            {selectedFile?.name || "Photo attachment ready"}
                          </span>
                          <button
                            type="button"
                            onClick={removeSelectedFile}
                            className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Quick Canned Suggestions Chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                          Quick Chips:
                        </span>
                        {cannedResponses.slice(0, 3).map((res, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setReplyInput(res)}
                            className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-lg truncate max-w-[180px] shrink-0 transition-colors shadow-2xs cursor-pointer"
                            title={res}
                          >
                            {res}
                          </button>
                        ))}
                      </div>

                      {/* Reply Input Bar Inner White Card */}
                      <div className="relative flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs focus-within:border-[#01390f]">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-slate-400 hover:text-[#01390f] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          title="Attach Photo / Proof"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>

                        <input
                          type="text"
                          placeholder="Type customer reply here... (Press Enter to send)"
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                          className="flex-1 text-xs text-slate-800 outline-none bg-transparent"
                        />

                        <button
                          type="button"
                          disabled={sending || (!replyInput.trim() && !filePreview)}
                          onClick={() => handleSendReply()}
                          className="bg-[#01390f] hover:bg-[#0a5219] text-white p-2.5 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                        >
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CANNED RESPONSE TEMPLATES */}
                {activeDrawerTab === "templates" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Canned Response Templates
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                          {cannedResponses.length} templates
                        </span>
                      </div>
                      <div className="space-y-2">
                        {cannedResponses.map((res, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white hover:border-[#01390f]/60 border border-slate-200/80 rounded-xl transition-all flex items-start justify-between gap-3 shadow-2xs group"
                          >
                            <p className="text-xs text-slate-700 leading-relaxed font-medium">&quot;{res}&quot;</p>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyInput(res);
                                setActiveDrawerTab("chat");
                              }}
                              className="bg-[#01390f] hover:bg-[#0a5219] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer shadow-2xs transition-all active:scale-95"
                            >
                              Use Template
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: CUSTOMER PROFILE & METADATA (Customer Records) */}
                {activeDrawerTab === "customer" && (() => {
                  const orderMatch = selectedTicket.messages?.find((m) => m.orderData)?.orderData;
                  const customerName = selectedTicket.customerName || orderMatch?.customerName || "Kent Benedict Bundalian";
                  const customerEmail =
                    selectedTicket.customerEmail ||
                    (selectedTicket.userId && selectedTicket.userId.includes("@")
                      ? selectedTicket.userId
                      : `${(selectedTicket.customerName || "customer").toLowerCase().replace(/\s+/g, "")}@gmail.com`);
                  const contactNumber = orderMatch?.phone || orderMatch?.contactNumber || "+63 9154673941";
                  const deliveryAddress = orderMatch?.shippingAddress || "p, Brgy. Halang, Calamba City, Laguna, 4027";

                  return (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Customer Records */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            Customer Records
                          </span>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200/80 p-3 space-y-1.5 text-xs">
                          <div className="flex justify-end">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Email Verified
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-500 shrink-0">Customer Name:</span>
                            <span className="font-bold text-slate-900 text-right">{customerName}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-500 shrink-0">Customer Email:</span>
                            <span className="font-mono font-semibold text-slate-800 text-right">{customerEmail}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-500 shrink-0">Contact Number:</span>
                            <span className="font-mono font-semibold text-slate-800 text-right">{contactNumber}</span>
                          </div>
                          <div className="flex justify-between items-start gap-2 pt-1 border-t border-slate-100">
                            <span className="text-slate-500 shrink-0">Delivery Address:</span>
                            <span className="font-medium text-slate-700 text-right leading-snug max-w-[260px]">
                              {deliveryAddress}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200/80 p-3 space-y-2 text-xs">
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Ticket ID:</span>
                            <span className="font-mono font-semibold text-slate-800">#{selectedTicket.ticketId}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Customer ID:</span>
                            <span className="font-mono font-semibold text-slate-800">{selectedTicket.userId || "CUST-VERIFIED"}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Assigned Staff:</span>
                            <span className="font-semibold text-[#01390f]">{selectedTicket.assignedTo || "Logistics Agent"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* TAB 4: TRANSCRIPT PDF (Same UI as Order Placed Invoice) */}
                {activeDrawerTab === "transcript" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#01390f]/10 text-[#01390f] flex items-center justify-center mx-auto">
                        <Printer className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Official Customer Interaction Transcript</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Generate and download a branded, ready-to-print PDF conversation transcript containing all timestamps, customer messages, and logistics agent replies.
                      </p>

                      <div className="pt-2 flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadTicketPdf(selectedTicket)}
                          className="bg-[#01390f] hover:bg-[#0a5219] text-white px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 uppercase tracking-wider"
                        >
                          <FileDown className="w-4 h-4" />
                          <span>Download Transcript PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* DRAWER FOOTER: Unified Clean Layout (Same as Order Placed) */}
              <div className="p-4 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center justify-between w-full">
                  {/* Left Side: Mark as Resolved (Same UI as Confirm Order) */}
                  {selectedTicket.status === "resolved" ? (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleToggleResolve("human")}
                      className="px-6 py-2.5 sm:py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>Re-open Ticket</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleToggleResolve("resolved")}
                      className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Mark as Resolved</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL IMAGE MODAL PREVIEW */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/20 bg-slate-900">
            <img src={previewModalImg} alt="Enlarged Attachment" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center font-bold"
            >
              âœ•
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogisticsCustomerSupport;
