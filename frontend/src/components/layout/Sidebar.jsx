import React, { useState, useEffect, useCallback } from "react";
import { API } from "../../axios";
import {
  LayoutDashboard,
  Package,
  Layers,
  History,
  Users,
  Activity,
  ArrowDownCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Truck,
  Database,
  Mail,
  BookOpen,
  Palette,
  ShieldCheck,
  Settings as SettingsIcon
} from "lucide-react";
import { getRoleTheme, normalizeRole as normalizeThemeRole } from "../../utils/themeManager";
import { subscribeLiveSync } from "../../utils/liveSync";

function Sidebar({ activeTab, setActiveTab, userRole: userRoleProp }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      return saved !== null ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isExpanded = !isCollapsed;

  // Role Theme (Dynamic Gradient)
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const normalizeRole = (role) => {
    if (!role) return "Admin";
    const r = String(role).trim().toLowerCase();
    if (r.includes("invent")) return "Inventory";
    if (r.includes("logis")) return "Logistic";
    if (r.includes("market")) return "Marketing";
    if (r.includes("admin") || r.includes("super")) return "Admin";
    return role;
  };

  const userRole = normalizeRole(userRoleProp || currentUser?.role || "Admin");

  const [roleTheme, setRoleTheme] = useState(() => getRoleTheme(userRole));

  useEffect(() => {
    setRoleTheme(getRoleTheme(userRole));
  }, [userRole]);

  useEffect(() => {
    const handleAppearanceUpdate = (e) => {
      const themes = e.detail;
      if (themes) {
        const norm = normalizeThemeRole(userRole);
        if (themes[norm]) {
          setRoleTheme(themes[norm]);
        }
      } else {
        setRoleTheme(getRoleTheme(userRole));
      }
    };
    const unsubLiveSync = subscribeLiveSync((event) => {
      if (event?.type === "appearance" && event?.payload) {
        const norm = normalizeThemeRole(userRole);
        if (event.payload[norm]) {
          setRoleTheme(event.payload[norm]);
        }
      }
    });

    window.addEventListener("appearanceUpdated", handleAppearanceUpdate);
    window.addEventListener("storage", handleAppearanceUpdate);
    return () => {
      window.removeEventListener("appearanceUpdated", handleAppearanceUpdate);
      window.removeEventListener("storage", handleAppearanceUpdate);
      unsubLiveSync();
    };
  }, [userRole]);

  // Notification Counts State (Instant 0ms LocalStorage hydration)
  const [wipCount, setWipCount] = useState(() => {
    try {
      const stored = localStorage.getItem('pending_wip_count');
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  });
  const [pendingOrdersCount, setPendingOrdersCount] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_logistics_orders');
      if (cached) {
        const orders = JSON.parse(cached);
        if (Array.isArray(orders)) {
          return orders.filter((o) => {
            const s = (o.status || o.orderStatus || '').toLowerCase().trim();
            return (
              s === 'order placed' ||
              s === 'to pay' ||
              s === 'to ship' ||
              s === 'waiting for courier' ||
              s === 'processing' ||
              s === 'preparing' ||
              s === 'pending' ||
              s === 'to receive' ||
              s === 'in transit'
            );
          }).length;
        }
      }
    } catch (e) { }
    return 0;
  });
  const [openSupportCount, setOpenSupportCount] = useState(0);
  const [pendingReturnsCount, setPendingReturnsCount] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_logistics_returns');
      if (cached) {
        const returns = JSON.parse(cached);
        if (Array.isArray(returns)) {
          return returns.filter((r) => (r.status || '').toLowerCase() === 'pending').length;
        }
      }
    } catch (e) { }
    return 0;
  });

  const fetchNotificationCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch WIP Batches
      API.get('/api/inventory-wip', { headers })
        .then((res) => {
          const logs = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          const pending = logs.filter(
            (log) => log.status !== 'Completed' || (Number(log.pendingQuantity) || 0) > 0
          ).length;
          setWipCount(pending);
          try {
            localStorage.setItem('pending_wip_count', String(pending));
          } catch (e) { }
        })
        .catch(() => { });

      // 2. Fetch Active Orders Count (notify when there are orders to process)
      API.get('/api/orders', { headers })
        .then((res) => {
          const orders = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          const pending = orders.filter((o) => {
            const s = (o.status || o.orderStatus || '').toLowerCase().trim();
            return (
              s === 'order placed' ||
              s === 'to pay' ||
              s === 'to ship' ||
              s === 'waiting for courier' ||
              s === 'processing' ||
              s === 'preparing' ||
              s === 'pending' ||
              s === 'to receive' ||
              s === 'in transit'
            );
          }).length;
          setPendingOrdersCount(pending);
        })
        .catch(() => { });

      // 3. Fetch Open Customer Support Tickets
      API.get('/api/chatbot/tickets', { headers })
        .then((res) => {
          const tickets = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          const open = tickets.filter(
            (t) => (t.status || '').toLowerCase() === 'open' || (t.status || '').toLowerCase() === 'pending'
          ).length;
          setOpenSupportCount(open);
        })
        .catch(() => { });

      // 4. Fetch Pending Return Requests
      API.get('/api/returns', { headers })
        .then((res) => {
          const returns = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          const pending = returns.filter(
            (r) => (r.status || '').toLowerCase() === 'pending'
          ).length;
          setPendingReturnsCount(pending);
        })
        .catch(() => { });
    } catch (e) { }
  }, []);

  useEffect(() => {
    fetchNotificationCounts();

    // Listen for custom broadcast events from submodules
    const handleWipUpdate = (e) => {
      if (typeof e.detail === 'number') {
        setWipCount(e.detail);
      } else {
        try {
          const stored = localStorage.getItem('pending_wip_count');
          if (stored !== null) setWipCount(parseInt(stored, 10) || 0);
          else fetchNotificationCounts();
        } catch (err) {
          fetchNotificationCounts();
        }
      }
    };

    const handleGeneralRefresh = () => {
      fetchNotificationCounts();
    };

    window.addEventListener('wipCountUpdated', handleWipUpdate);
    window.addEventListener('sidebarCountRefresh', handleGeneralRefresh);
    window.addEventListener('ordersUpdated', handleGeneralRefresh);
    window.addEventListener('returnsUpdated', handleGeneralRefresh);
    window.addEventListener('storage', handleWipUpdate);

    // Periodic refresh every 25 seconds
    const interval = setInterval(fetchNotificationCounts, 25000);
    return () => {
      window.removeEventListener('wipCountUpdated', handleWipUpdate);
      window.removeEventListener('sidebarCountRefresh', handleGeneralRefresh);
      window.removeEventListener('ordersUpdated', handleGeneralRefresh);
      window.removeEventListener('returnsUpdated', handleGeneralRefresh);
      window.removeEventListener('storage', handleWipUpdate);
      clearInterval(interval);
    };
  }, [fetchNotificationCounts]);


  const menuItems = [
    // LOGISTICS (Logistic Role Only)
    { id: "logistic-dashboard", name: "Dashboard", icon: LayoutDashboard, section: "sales", group: "Dashboard", roles: ["Logistic", "Logistics"] },
    // Process
    { id: "sales-support", name: "Customer Support", icon: History, section: "sales", group: "Process", roles: ["Logistic", "Logistics"] },
    { id: "sales-orders", name: "Order Management", icon: Package, section: "sales", group: "Process", roles: ["Logistic", "Logistics"] },
    { id: "sales-returns", name: "Return Management", icon: Layers, section: "sales", group: "Process", roles: ["Logistic", "Logistics"] },
    { id: "sales-analytics", name: "Customer Analytics", icon: TrendingUp, section: "sales", group: "Process", roles: ["Logistic", "Logistics"] },
    { id: "shipping-rates", name: "Shipping Rates & Fees", icon: Truck, section: "sales", group: "Process", roles: ["Logistic", "Logistics"] },
    // Settings
    { id: "logistic-reports", name: "Reports", icon: FileSpreadsheet, section: "sales", group: "Settings", roles: ["Logistic", "Logistics"] },

    // INVENTORY (Inventory Role Only)
    { id: "inventory-dashboard", name: "Dashboard", icon: LayoutDashboard, section: "inventory", group: "Dashboard", roles: ["Inventory"] },
    // Records
    { id: "inv-rawmat", name: "Raw Materials", icon: Layers, section: "inventory", group: "Records", roles: ["Inventory"] },
    { id: "inv-products", name: "Finished Goods", icon: Package, section: "inventory", group: "Records", roles: ["Inventory"] },
    { id: "inv-expiry", name: "Expiry Monitoring", icon: AlertTriangle, section: "inventory", group: "Records", roles: ["Inventory"] },
    { id: "material-requests", name: "Purchase Request", icon: FileSpreadsheet, section: "inventory", group: "Records", roles: ["Inventory"] },
    { id: "inv-supplier", name: "Suppliers", icon: Truck, section: "inventory", group: "Records", roles: ["Inventory"] },
    // Process
    { id: "inv-inbound", name: "Delivery Receiving", icon: ArrowDownCircle, section: "inventory", group: "Process", roles: ["Inventory"] },
    { id: "inv-wip", name: "Work in Progress (WIP)", icon: TrendingUp, section: "inventory", group: "Process", roles: ["Inventory"] },

    // Settings
    { id: "inv-reports", name: "Reports", icon: FileSpreadsheet, section: "inventory", group: "Settings", roles: ["Inventory"] },

    // ADMIN (Admin Role Only - Strictly Report, System Settings, User Activity, User Management)
    { id: "admin-dashboard", name: "Dashboard", icon: LayoutDashboard, section: "admin", group: "Dashboard", roles: ["Admin"] },
    // Process / Components
    { id: "admin-appearance", name: "Appearance", icon: Palette, section: "admin", group: "Process", roles: ["Admin"] },
    { id: "admin-users", name: "User Management", icon: Users, section: "admin", group: "Process", roles: ["Admin"] },
    { id: "admin-activity", name: "User Activity", icon: Activity, section: "admin", group: "Process", roles: ["Admin"] },
    { id: "admin-formula-access", name: "Formula Authorization", icon: ShieldCheck, section: "admin", group: "Process", roles: ["Admin"] },
    { id: "system-settings", name: "System Maintenance", icon: Layers, section: "admin", group: "Process", roles: ["Admin"] },
    { id: "admin-database", name: "Data Backup", icon: Database, section: "admin", group: "Process", roles: ["Admin"] },
    // Settings
    { id: "admin-reports", name: "Reports", icon: FileSpreadsheet, section: "admin", group: "Settings", roles: ["Admin"] },

    // MARKETING (Marketing Role Only)
    { id: "marketing-dashboard", name: "Dashboard", icon: LayoutDashboard, section: "marketing", group: "Dashboard", roles: ["Marketing"] },
    // Records
    { id: "product-catalog", name: "Products Catalog", icon: Package, section: "marketing", group: "Records", roles: ["Marketing"] },
    { id: "coupons", name: "Products Vouchers", icon: Layers, section: "marketing", group: "Records", roles: ["Marketing"] },
    { id: "customer-feedback", name: "Customer Feedback", icon: Activity, section: "marketing", group: "Records", roles: ["Marketing"] },
    // Process
    { id: "advertisement", name: "Marketing Content", icon: Activity, section: "marketing", group: "Process", roles: ["Marketing"] },
    { id: "announcement", name: "Events Management", icon: AlertTriangle, section: "marketing", group: "Process", roles: ["Marketing"] },
    { id: "marketing-our-story", name: "Our Story Management", icon: BookOpen, section: "marketing", group: "Process", roles: ["Marketing"] },
    { id: "marketing-notification-desk", name: "Products Promotions", icon: Mail, section: "marketing", group: "Process", roles: ["Marketing"] },
    // Settings
    { id: "marketing-reports", name: "Reports", icon: FileSpreadsheet, section: "marketing", group: "Settings", roles: ["Marketing"] },

    // GLOBAL SETTINGS FOR ALL STAFF ROLES
    { id: "user-manual", name: "User Manual", icon: BookOpen, section: "main", group: "Settings", roles: ["Admin", "Inventory", "Logistic", "Logistics", "Marketing"] },
    { id: "settings", name: "Settings", icon: SettingsIcon, section: "main", group: "Settings", roles: ["Admin", "Inventory", "Logistic", "Logistics", "Marketing"] },
  ];

  // Strictly filter menu items to only what the user's specific role is permitted to see
  const visibleMenuItems = menuItems.filter((item) => {
    return item.roles.some((r) => {
      const normalizedItemRole = normalizeRole(r);
      return normalizedItemRole.toLowerCase() === userRole.toLowerCase();
    });
  });

  const handleDesktopCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", JSON.stringify(next));
      } catch (e) { }
      return next;
    });
    window.dispatchEvent(new Event("sidebarToggle"));
  };

  const renderSectionHeader = (currentGroup, index) => {
    const previousGroup = index > 0 ? visibleMenuItems[index - 1].group : null;
    if (currentGroup === previousGroup) return null;

    if (!isExpanded) {
      if (index === 0) return null;
      return (
        <div className="py-2 px-1 flex items-center justify-center">
          <div className="w-8 h-[1px] bg-white/20 rounded-full shadow-2xs" />
        </div>
      );
    }

    return (
      <div className="text-[10px] font-bold text-white uppercase tracking-wider px-3 pt-2.5 pb-1 border-t border-white/10 mt-1 first:border-t-0 first:mt-0 whitespace-nowrap">
        {currentGroup}
      </div>
    );
  };

  const getItemBadge = (itemId) => {
    if (itemId === "inv-wip" && wipCount > 0) {
      return {
        count: wipCount,
        label: wipCount > 99 ? "99+" : String(wipCount),
        pillClass: "text-white font-semibold text-xs",
        dotClass: "bg-[#c81e1e]",
        isRedDot: true,
      };
    }
    if (itemId === "sales-orders" && pendingOrdersCount > 0) {
      return {
        count: pendingOrdersCount,
        label: pendingOrdersCount > 99 ? "99+" : String(pendingOrdersCount),
        pillClass: "text-white font-semibold text-xs",
        dotClass: "bg-[#c81e1e]",
        isRedDot: true,
      };
    }
    if (itemId === "sales-returns" && pendingReturnsCount > 0) {
      return {
        count: pendingReturnsCount,
        label: pendingReturnsCount > 99 ? "99+" : String(pendingReturnsCount),
        pillClass: "text-white font-semibold text-xs",
        dotClass: "bg-[#c81e1e]",
        isRedDot: true,
      };
    }
    if (itemId === "sales-support" && openSupportCount > 0) {
      return {
        count: openSupportCount,
        label: openSupportCount > 99 ? "99+" : String(openSupportCount),
        pillClass: "text-white font-semibold text-xs",
        dotClass: "bg-[#c81e1e]",
        isRedDot: true,
      };
    }
    return null;
  };

  return (
    <>
      <div className="fixed top-2.5 left-2.5 z-50 md:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          style={{ backgroundColor: '#153E97' }}
          className="p-2 bg-[#153E97] text-white rounded-full shadow-md border border-white/20 cursor-pointer active:scale-95 transition-all whitespace-nowrap hover:brightness-110"
        >
          {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        style={{
          background: roleTheme?.sidebarGradient || 'linear-gradient(180deg, #012b0b 0%, #01390f 50%, #0a5219 100%)',
          backgroundImage: roleTheme?.sidebarGradient || 'linear-gradient(180deg, #012b0b 0%, #01390f 50%, #0a5219 100%)'
        }}
        className={`
        fixed inset-y-0 left-0 z-40 md:sticky md:top-0 h-screen max-h-screen
        border-r border-white/10 text-white flex flex-col
        transition-transform md:transition-all duration-300 shadow-xl md:shadow-xs font-sans
        
        ${isMobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto'}
        ${!isExpanded ? 'md:w-20' : 'md:w-64'}
      `}>

        {/* Subtle ambient decorative glow contained safely */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div className="absolute -right-3.5 top-6 z-50 hidden md:block">
          <button
            type="button"
            onClick={handleDesktopCollapse}
            title={!isExpanded ? "Click to expand sidebar" : "Click to collapse sidebar"}
            style={{ backgroundColor: '#153E97' }}
            className="w-7 h-7 bg-[#153E97] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 border border-white/20 cursor-pointer transition-all hover:brightness-110"
          >
            {!isExpanded ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Dynamic Sidebar Hover Styling */}
        <style>{`
          .sidebar-nav-btn:not(.is-active):hover {
            background: var(--role-sidebar-hover, rgba(255, 255, 255, 0.1)) !important;
          }
        `}</style>

        <div className="flex flex-col overflow-hidden mt-12 md:mt-0 h-full">
          <div className="py-3 px-4 flex flex-col items-center border-b border-white/10 bg-white/5 backdrop-blur-xs shrink-0">
            <div
              className={`transition-all duration-300 bg-white rounded-full p-1.5 flex items-center justify-center shadow-md border border-white/20 hover:scale-105 ${!isExpanded ? "md:w-9 md:h-9 w-11 h-11" : "w-11 h-11"
                }`}
            >
              <img
                src="/mhira_removebg.png"
                alt="Mhira Logo"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            <div className={`text-center mt-1.5 ${!isExpanded ? 'md:hidden block' : 'block'}`}>
              <h1 className="font-extrabold text-xs uppercase text-white tracking-wider whitespace-nowrap leading-tight">MHIRA CRMS</h1>
              <p className="text-[9.5px] font-bold text-slate-300 uppercase opacity-90 leading-tight whitespace-nowrap mt-0.5">Mhira Natural</p>
              <span className="inline-block text-[9px] bg-[#153E97] text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-white/20 shadow-xs mt-1">
                {userRole}
              </span>
            </div>
          </div>

          <nav className="overflow-y-auto no-scrollbar scrollbar-none py-2 space-y-1 px-3 flex-1 pb-8 md:pb-4">
            {visibleMenuItems.map((item, index) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              const badge = getItemBadge(item.id);

              return (
                <React.Fragment key={item.id}>
                  {renderSectionHeader(item.group, index)}

                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    title={!isExpanded ? `${item.name}${badge ? ` (${badge.label})` : ''}` : ''}
                    className={`sidebar-nav-btn w-full whitespace-nowrap flex items-center gap-3 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all relative cursor-pointer group ${!isExpanded ? 'md:justify-center' : ''} ${isActive
                      ? 'is-active bg-[#153E97]/40 text-white font-bold shadow-xs border border-[#153E97]/60'
                      : 'bg-transparent text-white/90 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#153E97] rounded-r-full shadow-[0_0_8px_rgba(21,62,151,0.6)]" />
                    )}

                    <div className="relative shrink-0 flex items-center justify-center">
                      <IconComponent size={16} className={`transition-transform ${isActive ? 'text-white scale-105' : 'text-white/85 group-hover:text-white group-hover:scale-105'}`} />
                      {!isExpanded && badge && (
                        badge.isRedDot ? (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#c81e1e]" />
                        ) : (
                          <span className={`absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-xs ${badge.dotClass}`}>
                            {badge.count > 99 ? '99+' : badge.count}
                          </span>
                        )
                      )}
                    </div>

                    <span className={`truncate text-left ${!isExpanded ? 'md:hidden block' : 'block'} whitespace-nowrap flex-1 text-white flex items-center gap-1.5`}>
                      <span>{item.name}</span>
                      {isExpanded && badge?.isRedDot && (
                        <span className="w-1.5 h-1.5 bg-[#c81e1e] rounded-full shrink-0" />
                      )}
                    </span>

                    {isExpanded && badge && (
                      badge.isRedDot ? (
                        <span className="ml-auto text-white font-semibold text-xs tracking-tight shrink-0 select-none">
                          {badge.label}
                        </span>
                      ) : (
                        <span className={`ml-auto min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs ${badge.pillClass}`}>
                          {badge.label}
                        </span>
                      )
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          {/* Bottom Sidebar Footer: System Version */}
          <div className="py-2.5 px-3 border-t border-white/20 shrink-0 text-center bg-[#153E97] select-none shadow-xs">
            <span
              className={`text-[10.5px] text-white font-mono tracking-wider font-semibold ${!isExpanded ? "md:hidden block" : "block"
                }`}
            >
              System v1.2.0
            </span>
            <span
              className={`text-[9.5px] text-white font-mono tracking-tight font-semibold ${!isExpanded ? "hidden md:block" : "hidden"
                }`}
              title="System v1.2.0"
            >
              v1.2.0
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;