import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  Layers,
  Users,
  Activity,
  ArrowDownCircle,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  FileSpreadsheet,
  Database,
  Mail,
  BookOpen,
  Palette,
  ShieldCheck,
  Settings as SettingsIcon
} from "lucide-react";
import { getRoleTheme, normalizeRole as normalizeThemeRole } from "../../utils/themeManager";
import { subscribeLiveSync } from "../../utils/liveSync";

function PageHeader({ activeTab, userRole: userRoleProp, title, description, icon, badge, actions, children }) {
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const userRole = normalizeThemeRole(userRoleProp || currentUser?.role || "Admin");

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
  const headerConfig = {
    // DASHBOARDS PER ROLE
    'admin-dashboard': {
      title: 'Admin Dashboard',
      description: 'System administration, staff access control, and overall system health.',
      icon: LayoutDashboard
    },
    'marketing-dashboard': {
      title: 'Marketing Dashboard',
      description: 'Storefront promotions, catalog management, vouchers, and customer engagement.',
      icon: LayoutDashboard
    },
    'inventory-dashboard': {
      title: 'Inventory Dashboard',
      description: 'Warehouse stock levels, FEFO expiration monitoring, and inbound receiving.',
      icon: LayoutDashboard
    },
    'logistic-dashboard': {
      title: 'Logistic Dashboard',
      description: 'Order confirmation, parcel dispatches, returns processing, and logistics analytics.',
      icon: LayoutDashboard
    },

    // LOGISTICS FULFILLMENT & ORDER MANAGEMENT MODULE
    'sales-analytics': {
      title: 'Customer Analytics',
      description: 'Customer leaderboard rankings, loyalty VIP badges, and order fulfillment audit.',
      icon: TrendingUp
    },
    'sales-orders': {
      title: 'Order Management',
      description: 'Confirm customer purchases, validate shipping details, and track courier fulfillment updates.',
      icon: Package
    },
    'material-requests': {
      title: 'Purchase Request',
      description: 'Generate official purchase requisitions and download PDFs for raw materials lacking in WIP manufacturing batches.',
      icon: FileSpreadsheet
    },
    'inv-material-requests': {
      title: 'Purchase Request',
      description: 'Generate official purchase requisitions and download PDFs for raw materials lacking in WIP manufacturing batches.',
      icon: FileSpreadsheet
    },
    'sales-returns': {
      title: 'Return Management',
      description: 'Process product returns, quality inspections, and replacement dispatches.',
      icon: Layers
    },
    'sales-support': {
      title: 'Support Center',
      description: 'Assist customer inquiries, process tickets, and manage service requests.',
      icon: HelpCircle
    },
    'shipping-rates': {
      title: 'Shipping Rates & Fees',
      description: 'Configure delivery fees by customer location (NCR, Luzon, Visayas, Mindanao) and customize per-product shipping prices.',
      icon: Truck
    },
    'logistic-shipping-settings': {
      title: 'Shipping Rates & Fees',
      description: 'Configure delivery fees by customer location (NCR, Luzon, Visayas, Mindanao) and customize per-product shipping prices.',
      icon: Truck
    },
    'logistic-reports': {
      title: 'Reports',
      description: 'Review logistics manifests, dispatch summaries, and outbound performance audits.',
      icon: FileSpreadsheet
    },

    // INVENTORY MODULE
    'inv-products': {
      title: 'Finished Goods',
      description: 'Manage fully processed stocks, available inventory, and product details.',
      icon: Package
    },
    'inv-rawmat': {
      title: 'Raw Materials',
      description: 'Track available raw materials, basic components, and stock reserves.',
      icon: Layers
    },
    'inv-supplier': {
      title: 'Suppliers',
      description: 'Manage supplier records, partner profiles, and complete vendor details.',
      icon: Truck
    },
    'inv-wip': {
      title: 'Work in Progress (WIP)',
      description: 'Monitor ongoing manufacturing processes and items currently in assembly.',
      icon: TrendingUp
    },
    'inv-inbound': {
      title: 'Delivery Receiving',
      description: 'Log and review incoming stock deliveries and supplier shipments.',
      icon: ArrowDownCircle
    },
    'inv-expiry': {
      title: 'Expiry Monitoring',
      description: 'Monitor product shelf-life, expiration dates, and critical FEFO stock alerts.',
      icon: AlertTriangle
    },
    'inv-reports': {
      title: 'Inventory Reports',
      description: 'Generate warehouse inventory valuation reports, stock movement audits, and batch summaries.',
      icon: FileSpreadsheet
    },

    // ADMIN MODULE (Strictly User Management, User Activity, System Settings, Reports)
    'admin-users': {
      title: 'User Management',
      description: 'Manage system accounts, user roles, permissions, and security access.',
      icon: Users
    },
    'admin-activity': {
      title: 'User Activity',
      description: 'Review real-time audit trails, user actions, and system activity logs.',
      icon: Activity
    },
    'admin-formula-access': {
      title: 'Formula Access Authorization',
      description: 'Configure and reset the 6-digit security PIN used to safeguard proprietary Bill of Materials formulations.',
      icon: ShieldCheck
    },
    'system-settings': {
      title: 'System Maintenance',
      description: 'Configure system maintenance mode, application preferences, and operational parameters.',
      icon: Layers
    },
    'admin-appearance': {
      title: 'Appearance',
      description: 'Customize gradient color themes for the Sidebar and Page Header across Staff roles (Inventory, Logistics, Marketing, Admin).',
      icon: Palette
    },
    'admin-database': {
      title: 'Data Backup',
      description: 'Manage automated database backups, manual snapshots, and data recovery.',
      icon: Database
    },
    'admin-reports': {
      title: 'System Audit Reports',
      description: 'Comprehensive system logs, user access audits, and administrative reporting.',
      icon: FileSpreadsheet
    },

    // MARKETING MODULE
    'product-catalog': {
      title: 'All Products Catalog',
      description: 'Manage product listings, descriptions, pricing, and catalog organization.',
      icon: Package
    },
    'announcement': {
      title: 'Events Management',
      description: 'Post system-wide announcements, updates, and important notifications.',
      icon: AlertTriangle
    },
    'customer-feedback': {
      title: 'Customer Feedback',
      description: 'Collect and review customer feedback, surveys, and product reviews.',
      icon: Activity
    },
    'coupons': {
      title: 'Promotions',
      description: 'Manage coupon codes, discounts, and promotional offers for customers.',
      icon: Layers
    },
    'advertisement': {
      title: 'Marketing Content',
      description: 'Create and monitor promotional advertisements and banners.',
      icon: LayoutDashboard
    },
    'marketing-notification-desk': {
      title: 'Email Campaigns',
      description: 'Design and broadcast promotional email campaigns, product drops, and discount vouchers directly to customer Gmail inboxes.',
      icon: Mail
    },
    'marketing-our-story': {
      title: 'Our Story Management',
      description: 'Customize the company background, mission, vision, and core values displayed on the public storefront.',
      icon: BookOpen
    },
    'marketing-reports': {
      title: 'Marketing Reports & Analytics',
      description: 'Storefront traffic, promotional campaign ROI, and customer engagement metrics.',
      icon: FileSpreadsheet
    },

    // GLOBAL SETTINGS & USER MANUAL
    'user-manual': {
      title: 'System Operations & User Manual',
      description: 'Standard Operating Procedures (SOP) and step-by-step documentation for all roles.',
      icon: BookOpen
    },
    'settings': {
      title: 'Account Settings',
      description: 'Update your personal profile, security password, and notification preferences.',
      icon: SettingsIcon
    }
  };

  const configured = headerConfig[activeTab] || {
    title: 'Dashboard Overview',
    description: 'Welcome to Mhira Natural Soap & Cosmetics Portal.',
    icon: LayoutDashboard
  };

  const finalTitle = title || configured.title;
  const finalDescription = description || configured.description;
  const IconComponent = icon || configured.icon || LayoutDashboard;
  const finalBadge = badge !== undefined ? badge : 'Real-Time Sync';

  return (
    <header
      style={{
        background: roleTheme?.headerGradient || 'linear-gradient(90deg, #18174e 0%, #1f1d63 50%, #282678 100%)',
        backgroundImage: roleTheme?.headerGradient || 'linear-gradient(90deg, #18174e 0%, #1f1d63 50%, #282678 100%)'
      }}
      className="w-full text-white border border-white/15 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 relative overflow-hidden transition-all duration-300 shadow-md font-sans"
    >
      {/* Ambient decorative glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 sm:w-48 sm:h-48 bg-[#153E97]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 sm:w-48 sm:h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Left: Icon (without container) + Title + Real-Time Sync badge + Description */}
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
          <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white shrink-0 stroke-[2.2]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-snug">
                {finalTitle}
              </h1>
              {finalBadge && (
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase bg-[#153E97] text-white border border-white/20 px-2.5 py-0.5 rounded-full shrink-0 shadow-xs">
                  {finalBadge}
                </span>
              )}
            </div>
            {finalDescription && (
              <p className="text-[11px] sm:text-xs md:text-sm font-normal text-slate-200 mt-0.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
                {finalDescription}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default PageHeader;