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
  MessageCircle,
  FileText,
  X,
  Calendar,
  Filter,
  ChevronDown,
  SlidersHorizontal,
  Eye,
  RotateCcw
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { showSuccessToast, showErrorToast } from "../utils/toast";
import { compressImageToBase64 } from "../utils/imageCompressor";
import TablePagination from "./common/TablePagination";

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

function LogisticsSupportCenter() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'resolved'

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
    return count;
  }, [searchTerm, selectedDate, selectedTopic, selectedSort]);

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
    setCurrentPage(1);
  };

  // PDF Transcript Download
  const handleDownloadTicketPdf = (ticket) => {
    if (!ticket) return;
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("MHIRA NATURAL - LOGISTICS & CUSTOMER SUPPORT", 14, 11);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text("OFFICIAL CUSTOMER INTERACTION & RESOLUTION TRANSCRIPT", 14, 18);

      doc.setDrawColor(220, 225, 230);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 28, 182, 32, 2, 2, "FD");

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("TICKET ID:", 18, 36);
      doc.setFont("helvetica", "normal");
      doc.text(`#${ticket.ticketId}`, 48, 36);

      doc.setFont("helvetica", "bold");
      doc.text("CUSTOMER:", 18, 44);
      doc.setFont("helvetica", "normal");
      doc.text(ticket.customerName || "Customer", 48, 44);

      doc.setFont("helvetica", "bold");
      doc.text("STATUS:", 125, 36);
      doc.setFont("helvetica", "normal");
      doc.text((ticket.status || "Active").toUpperCase(), 155, 36);

      doc.setFont("helvetica", "bold");
      doc.text("EXPORT DATE:", 125, 44);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleDateString(), 155, 44);

      const tableData = (ticket.messages || []).map((m, idx) => [
        idx + 1,
        m.sender === "customer" ? "Customer" : "Logistics CSR Staff",
        m.text + (m.attachment ? " [Photo Attached]" : ""),
        m.time || "-",
      ]);

      autoTable(doc, {
        startY: 66,
        head: [["#", "Sender", "Message Content", "Timestamp"]],
        body: tableData,
        headStyles: { fillColor: [1, 57, 15], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: "grid",
        styles: { cellPadding: 2.8 },
      });

      doc.save(`Support_Transcript_${ticket.ticketId}.pdf`);
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
        <span className="inline-flex items-center gap-1.5 bg-slate-50 text-[#01390f] border border-[#01390f] px-2.5 py-1 rounded-full font-bold text-[11px] whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#01390f] animate-pulse"></span>
          Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-slate-50 text-amber-950 border border-amber-500 px-2.5 py-1 rounded-full font-bold text-[11px] whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Active / Pending
      </span>
    );
  };

  const workflowSteps = [
    { label: "Inquiry Received", desc: "Customer Chat" },
    { label: "CSR Assigned", desc: "Support Agent" },
    { label: "Investigation", desc: "Order / Logistics" },
    { label: "Resolution", desc: "Case Closed" },
  ];

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-800">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Inquiries' },
              { id: 'pending', label: 'Active & Pending' },
              { id: 'resolved', label: 'Resolved' },
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
          <div className="flex items-center gap-2 pb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live CSR Sync</span>
            </span>
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
          {/* ACTIONS GROUP */}
          <div className="w-[226px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
            <div className="flex items-stretch gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => handleDownloadMasterSupportPdf(filteredTickets)}
                className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                title="Export Master Inquiries Summary Report PDF"
              >
                <FileDown className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-center leading-tight">Export PDF</span>
              </button>
              <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={fetchTickets}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                  <span className="truncate">Refresh Chats</span>
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

                {/* Inquiry Topic */}
                <div className="relative w-full">
                  <MessageSquareText className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
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
                <div className="relative w-full">
                  <SlidersHorizontal className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
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
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'pending' ? 'all' : 'pending')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Pending Only
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'resolved' ? 'all' : 'resolved')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    activeTab === 'resolved'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    selectedDate === new Date().toISOString().split('T')[0]
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Today's Chats
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
                  <th className="py-3.5 px-4 whitespace-nowrap">DATE FILED</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">CUSTOMER</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">INQUIRY TOPIC</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">LATEST MESSAGE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ATTACHMENTS</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">MESSAGES</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">STATUS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-20 min-w-[80px]">
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && tickets.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#01390f]" />
                        <span>Loading support inquiries...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Headphones className="w-6 h-6 text-slate-300" />
                        <span>No customer support conversations found matching your search or filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((t) => {
                    const lastMsg = t.messages?.[t.messages.length - 1];
                    const hasAttachment = t.messages?.some((m) => m.attachment);
                    const ticketDate = new Date(t.createdAt || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <tr
                        key={t.ticketId}
                        onClick={() => handleSelectTicket(t)}
                        className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      >
                        {/* Ticket ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap min-w-[140px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                            #{t.ticketId}
                          </span>
                        </td>

                        {/* Date Filed */}
                        <td className="py-3.5 px-4 text-slate-500 font-mono whitespace-nowrap">
                          {ticketDate}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#01390f]/10 text-[#01390f] font-bold text-[11px] flex items-center justify-center shrink-0">
                              {t.customerName?.slice(0, 2).toUpperCase() || 'CU'}
                            </div>
                            <span className="font-bold text-slate-900">{t.customerName || 'Customer'}</span>
                          </div>
                        </td>

                        {/* Topic / Subject */}
                        <td className="py-3.5 px-4 text-slate-700 max-w-[170px] truncate" title={t.subject || 'General Inquiry'}>
                          <span className="font-semibold text-slate-800 truncate block">
                            {t.subject || 'Order Inquiry'}
                          </span>
                        </td>

                        {/* Latest Message */}
                        <td className="py-3.5 px-4 text-slate-600 max-w-[220px] truncate" title={lastMsg?.text || ''}>
                          <span className="truncate block text-slate-500">
                            {lastMsg?.text || (hasAttachment ? 'Photo attachment' : 'Inquiry opened')}
                          </span>
                        </td>

                        {/* Attachments */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {hasAttachment ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              <ImageIcon className="w-3 h-3" />
                              <span>Photo</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">None</span>
                          )}
                        </td>

                        {/* Messages Count */}
                        <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                          {t.messages?.length || 0} msgs
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(t.status)}
                        </td>

                        {/* ACTION CELL - EYE ICON ONLY (STICKY RIGHT) */}
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-3 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-20 min-w-[80px]"
                        >
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleSelectTicket(t)}
                              title="View & Respond to Inquiry"
                              aria-label="View & Respond to Inquiry"
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
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3 text-slate-400" />
                      <span>{selectedTicket.messages?.length || 0} Messages</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STATUS</span>
                    <span className="font-bold text-slate-900 mt-1">
                      {selectedTicket.status === "resolved" ? "RESOLVED" : "ACTIVE"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MESSAGES</span>
                    <span className="font-mono font-bold text-slate-900 mt-1">
                      {selectedTicket.messages?.length || 0} Exchanged
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CHANNEL</span>
                    <span className="font-mono font-bold text-[#01390f] text-xs mt-1">
                      Customer Chat
                    </span>
                  </div>
                </div>

                {/* WORKFLOW PROGRESS STEPPER PIPELINE */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      SUPPORT RESOLUTION WORKFLOW
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#01390f]">
                      {selectedTicket.status === "resolved" ? "Stage 4 of 4 (Resolved)" : "Stage 3 of 4 (In Progress)"}
                    </span>
                  </div>

                  {/* Visual Step Progress Line */}
                  <div className="relative flex items-center justify-between pt-2">
                    <div className="absolute left-4 right-4 top-5 h-0.5 bg-slate-200 z-0" />
                    <div
                      className="absolute left-4 top-5 h-0.5 bg-[#01390f] transition-all duration-500 z-0"
                      style={{
                        width: selectedTicket.status === "resolved" ? "100%" : "66%",
                      }}
                    />

                    {workflowSteps.map((step, idx) => {
                      const isPassed = selectedTicket.status === "resolved" ? true : idx < 2;
                      const isCurrent = selectedTicket.status === "resolved" ? idx === 3 : idx === 2;

                      return (
                        <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shadow-2xs ${
                              isPassed
                                ? "bg-[#01390f] text-white"
                                : isCurrent
                                ? "bg-[#01390f] text-white ring-4 ring-[#01390f]/20 scale-110"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                            }`}
                          >
                            {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <span
                            className={`text-[10px] font-bold text-center max-w-[70px] leading-tight ${
                              isCurrent ? "text-[#01390f]" : isPassed ? "text-slate-700" : "text-slate-400"
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
                    onClick={() => setActiveDrawerTab("chat")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeDrawerTab === "chat"
                        ? "bg-[#01390f] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Live Interaction Chat
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab("templates")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeDrawerTab === "templates"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Canned Replies
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab("customer")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeDrawerTab === "customer"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Customer Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab("transcript")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeDrawerTab === "transcript"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Transcript PDF
                  </button>
                </div>

                {/* TAB 1: LIVE CHAT STREAM & COMPOSER */}
                {activeDrawerTab === "chat" && (
                  <div className="space-y-4 animate-in fade-in duration-150 flex flex-col">
                    {/* Chat Messages Box */}
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 max-h-[360px] min-h-[220px] overflow-y-auto space-y-3.5 custom-scrollbar">
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
                                className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                                  isCust
                                    ? "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                                    : isStaff
                                    ? "bg-[#01390f] text-white rounded-tr-xs"
                                    : "bg-slate-200 text-slate-800 rounded-tr-xs"
                                }`}
                              >
                                {/* RICH ORDER CARD IF SENT BY CUSTOMER */}
                                {m.orderData && (
                                  <div className="bg-slate-50 text-slate-900 rounded-xl p-3 border border-emerald-200 shadow-2xs space-y-2 text-left mb-2">
                                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                                      <span className="font-bold text-[#01390f] text-xs flex items-center gap-1">
                                        📦 Order #{m.orderData.orderNumber}
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#01390f] border border-emerald-200">
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

                                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex flex-col gap-0.5">
                                      <p><strong className="text-slate-800">Payment:</strong> {m.orderData.paymentMethod || "COD"} ({m.orderData.paymentStatus || "Paid"})</p>
                                      <p><strong className="text-slate-800">Recipient:</strong> {m.orderData.customerName} ({m.orderData.shippingAddress})</p>
                                    </div>

                                    {/* STAFF CONFIRMATION ACTION BUTTON */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReplyInput(
                                          `Hello ${m.orderData.customerName || "Customer"}! We have verified your Order #${m.orderData.orderNumber} (${m.orderData.itemName}). Your package is currently ${m.orderData.status} and being handled with priority.`
                                        );
                                      }}
                                      className="w-full mt-1.5 py-1.5 px-3 bg-[#01390f] hover:bg-[#01250a] text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
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
                      <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded-lg border border-emerald-300"
                        />
                        <span className="text-xs text-emerald-800 font-medium truncate flex-1">
                          {selectedFile?.name || "Photo attachment ready"}
                        </span>
                        <button
                          type="button"
                          onClick={removeSelectedFile}
                          className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Quick Canned Suggestions Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        Quick Chips:
                      </span>
                      {cannedResponses.slice(0, 3).map((res, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setReplyInput(res)}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg truncate max-w-[180px] shrink-0 transition-colors"
                          title={res}
                        >
                          {res}
                        </button>
                      ))}
                    </div>

                    {/* Reply Input Bar */}
                    <div className="relative flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-300 shadow-xs focus-within:border-[#01390f]">
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
                        className="bg-[#01390f] hover:bg-[#051609] text-white p-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: CANNED RESPONSE TEMPLATES */}
                {activeDrawerTab === "templates" && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Click a template to auto-fill or send to customer:
                    </span>
                    <div className="space-y-2">
                      {cannedResponses.map((res, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all flex items-start justify-between gap-3 group"
                        >
                          <p className="text-xs text-slate-700 leading-relaxed">&quot;{res}&quot;</p>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyInput(res);
                              setActiveDrawerTab("chat");
                            }}
                            className="bg-[#01390f] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer shadow-2xs hover:bg-[#051609]"
                          >
                            Use Template
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: CUSTOMER PROFILE & METADATA */}
                {activeDrawerTab === "customer" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Customer Account Details
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-500">Customer Name:</span>
                          <span className="font-bold text-slate-900">
                            {selectedTicket.customerName || "Customer"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-500">Customer ID:</span>
                          <span className="font-mono text-slate-800">
                            {selectedTicket.userId || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                          <span className="text-slate-500">Ticket Reference ID:</span>
                          <span className="font-mono font-bold text-[#01390f]">
                            #{selectedTicket.ticketId}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-slate-500">Inquiry Topic:</span>
                          <span className="font-bold text-slate-800">
                            {selectedTicket.subject || "Order Inquiry"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: TRANSCRIPT PDF */}
                {activeDrawerTab === "transcript" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#01390f]/10 text-[#01390f] flex items-center justify-center mx-auto">
                        <Printer className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Official Customer Interaction Transcript</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Generate and download a branded, audit-ready PDF conversation transcript containing all timestamps, customer messages, and agent answers.
                      </p>

                      <div className="pt-2 flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadTicketPdf(selectedTicket)}
                          className="bg-[#01390f] hover:bg-[#051609] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                        >
                          <FileDown className="w-4 h-4" />
                          <span>Download Transcript PDF</span>
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
                  onClick={() => handleDownloadTicketPdf(selectedTicket)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer border border-rose-200 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileDown className="w-3.5 h-3.5 text-rose-600" />
                  <span>Transcript PDF</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                  >
                    Close
                  </button>

                  {selectedTicket.status === "resolved" ? (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleToggleResolve("human")}
                      className="px-6 py-2.5 sm:py-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
                      <span>Mark Resolved</span>
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
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogisticsSupportCenter;
