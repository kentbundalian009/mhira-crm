import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API, API_BASE_URL } from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLiveSync, notifyLiveSync } from '../utils/liveSync';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { getStoredThresholds } from './common/MasterCategoryUomModal';
import TablePagination from './common/TablePagination';
import { getUserFullName } from '../utils/userId';
import {
  Download,
  Search,
  AlertTriangle,
  Package,
  Layers,
  Eye,
  Loader2,
  FileDown,
  X,
  RotateCcw,
  Tag,
  Activity,
  ArrowUpDown,
  EyeOff,
  Boxes,
} from 'lucide-react';

const DEFAULT_GLOBAL_THRESHOLDS = {
  criticalLevel: 1000,
  restockWarningPoint: 5000,
  overstockLimitPoint: 200000,
};

// Helper to load image as base64 for jsPDF
const loadBase64Image = (url) => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
};

// Helper to create watermark image with controlled opacity
const loadWatermarkImage = (url, opacity = 0.095) => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 600;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
};

function InventoryPurchaseRequest() {
  const [rawMaterials, setRawMaterials] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_inventory_raw_materials');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Master thresholds synced with Raw Materials module
  const [defaultThresholds, setDefaultThresholds] = useState(() =>
    getStoredThresholds('raw_materials')
  );

  // Sync when thresholds or categories are updated anywhere in the system
  useEffect(() => {
    const handleThresholdUpdated = () => {
      setDefaultThresholds(getStoredThresholds('raw_materials'));
    };
    window.addEventListener('inventory_categories_uom_updated', handleThresholdUpdated);
    window.addEventListener('storage', handleThresholdUpdated);
    return () => {
      window.removeEventListener('inventory_categories_uom_updated', handleThresholdUpdated);
      window.removeEventListener('storage', handleThresholdUpdated);
    };
  }, []);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItemName, setSelectedItemName] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All'); // 'All' | 'Critical Alert' | 'Restock Warning'
  const [hideZeroQty, setHideZeroQty] = useState(false);
  const [showZeroOnly, setShowZeroOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name_asc' | 'code_asc' | 'qty_desc' | 'qty_asc' | 'stock_asc'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Preview Modal State & PDF Exporting State
  const [previewRequest, setPreviewRequest] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Resolve Effective Threshold for an item (item-level overrides or global defaults)
  const getResolvedThreshold = useCallback(
    (item) => {
      return {
        criticalLevel: Number(
          item?.criticalLevel !== undefined && item?.criticalLevel !== ''
            ? item.criticalLevel
            : (defaultThresholds.criticalLevel ?? 1000)
        ),
        restockWarningPoint: Number(
          item?.restockWarningPoint !== undefined && item?.restockWarningPoint !== ''
            ? item.restockWarningPoint
            : (defaultThresholds.restockWarningPoint ?? 5000)
        ),
        overstockLimitPoint: Number(
          item?.overstockLimitPoint !== undefined && item?.overstockLimitPoint !== ''
            ? item.overstockLimitPoint
            : (defaultThresholds.overstockLimitPoint ?? 200000)
        ),
      };
    },
    [defaultThresholds]
  );

  // Stock condition evaluator (strictly aligns with InventoryRawMaterials)
  const getStockCondition = useCallback(
    (qty, item) => {
      const val = Number(qty) || 0;
      const rules = getResolvedThreshold(item);
      const critical = Number(rules?.criticalLevel ?? 1000);
      const restock = Number(rules?.restockWarningPoint ?? 5000);
      const overstock = Number(rules?.overstockLimitPoint ?? 200000);

      if (val <= critical) {
        return {
          key: 'Critical Alert',
          label: 'Critical Alert',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/70 font-semibold',
          dotClass: 'bg-rose-500',
          suggestedOrderQty: Math.max(10, restock * 2 - val),
        };
      }
      if (val <= restock) {
        return {
          key: 'Restock Warning',
          label: 'Restock Warning',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/70 font-semibold',
          dotClass: 'bg-amber-500',
          suggestedOrderQty: Math.max(5, restock * 2 - val),
        };
      }
      if (val <= overstock) {
        return {
          key: 'Healthy',
          label: 'Healthy',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 font-semibold',
          dotClass: 'bg-emerald-500',
          suggestedOrderQty: 0,
        };
      }
      return {
        key: 'Overstock',
        label: 'Overstock',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/70 font-semibold',
        dotClass: 'bg-blue-500',
        suggestedOrderQty: 0,
      };
    },
    [getResolvedThreshold]
  );

  // Fetch Raw Materials from Backend
  const fetchRawMaterials = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get('/api/inventory-raw-materials', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => ({ data: [] }));

      const raw = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.rawMaterials || response.data?.items || []);

      if (Array.isArray(raw)) {
        setRawMaterials(raw);
        try {
          localStorage.setItem('cached_inventory_raw_materials', JSON.stringify(raw));
        } catch (e) { }
      }
    } catch (error) {
      console.error('Error fetching raw materials for purchase requisitions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRawMaterials();
  }, [fetchRawMaterials]);

  // Real-time automatic background synchronization across tabs, sockets, and local components
  useLiveSync(['rawMaterials', 'inventory', 'inbound', 'wip'], () => {
    fetchRawMaterials();
  });

  useEffect(() => {
    const handleSync = () => fetchRawMaterials();
    window.addEventListener('rawMaterialsUpdated', handleSync);
    window.addEventListener('inventoryUpdated', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('rawMaterialsUpdated', handleSync);
      window.removeEventListener('inventoryUpdated', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [fetchRawMaterials]);

  // Compute Raw Material Condition-Based Inventory Requisitions
  // USER REQUIREMENT: Automatically include all items in Critical Alert or Restock Warning
  const rawMaterialRequisitions = useMemo(() => {
    return rawMaterials
      .filter((mat) => !mat.isArchived)
      .map((mat, idx) => {
        const qty = Number(mat.quantity ?? mat.qty ?? 0);
        const condition = getStockCondition(qty, mat);
        const thresholdRules = getResolvedThreshold(mat);
        const prNumber = `PR-STOCK-${mat.code || String(idx + 1).padStart(4, '0')}`;
        const isCritical =
          condition.key === 'Critical Alert' || condition.key === 'Critical';
        const isRestockWarning = condition.key === 'Restock Warning';

        return {
          id: mat._id || mat.id || `raw-${idx}`,
          type: 'RAW_MAT',
          prNumber,
          materialId: mat._id || mat.id,
          materialCode: mat.code || mat.itemCode || 'RAW-MAT',
          materialName: mat.itemName || mat.itemDescription || 'Raw Material',
          itemDescription: mat.itemDescription || mat.description || '',
          category: mat.category || 'General',
          specification: mat.specification || 'Standard',
          manufacturer: mat.manufacturer || mat.brand || 'N/A',
          brand: mat.brand || mat.manufacturer || 'N/A',
          uom: mat.uom || mat.unit || 'g',
          currentStock: qty,
          conditionKey: condition.key,
          conditionStatus: condition.key,
          conditionLabel: condition.label,
          badgeClass: condition.badgeClass,
          dotClass: condition.dotClass,
          criticalLevel: thresholdRules.criticalLevel,
          restockWarningPoint: thresholdRules.restockWarningPoint,
          overstockLimitPoint: thresholdRules.overstockLimitPoint,
          suggestedOrderQty: condition.suggestedOrderQty,
          isCritical,
          isRestockWarning,
          createdAt: mat.createdAt || new Date().toISOString(),
        };
      })
      // Strictly show raw materials that actually need reordering (Critical Alert or Restock Warning)
      .filter((r) => r.isCritical || r.isRestockWarning);
  }, [rawMaterials, getStockCondition, getResolvedThreshold]);

  // Available Filter Categories & Item Names strictly from active requisitions
  const uniqueCategories = useMemo(() => {
    const cats = Array.from(
      new Set(rawMaterialRequisitions.map((r) => r.category).filter(Boolean))
    );
    return cats.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [rawMaterialRequisitions]);

  const uniqueItemNames = useMemo(() => {
    let list = rawMaterialRequisitions;
    if (selectedCategory !== 'All') {
      list = list.filter((r) => r.category === selectedCategory);
    }
    const names = Array.from(
      new Set(list.map((r) => r.materialName).filter(Boolean))
    );
    return names.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [rawMaterialRequisitions, selectedCategory]);

  // Count summaries
  const totalRequisitionsCount = rawMaterialRequisitions.length;
  const criticalCount = useMemo(
    () => rawMaterialRequisitions.filter((r) => r.isCritical).length,
    [rawMaterialRequisitions]
  );
  const restockCount = useMemo(
    () => rawMaterialRequisitions.filter((r) => r.isRestockWarning).length,
    [rawMaterialRequisitions]
  );
  const zeroCount = useMemo(
    () => rawMaterialRequisitions.filter((r) => r.currentStock === 0).length,
    [rawMaterialRequisitions]
  );

  // Filtered Raw Material Requisitions
  const filteredRawMatRequisitions = useMemo(() => {
    let list = rawMaterialRequisitions.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const code = (item.materialCode || '').toLowerCase();
        const name = (item.materialName || '').toLowerCase();
        const desc = (item.itemDescription || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const spec = (item.specification || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const pr = (item.prNumber || '').toLowerCase();

        if (
          !code.includes(q) &&
          !name.includes(q) &&
          !desc.includes(q) &&
          !cat.includes(q) &&
          !spec.includes(q) &&
          !brand.includes(q) &&
          !pr.includes(q)
        ) {
          return false;
        }
      }

      // 2. Condition Filter Dropdown
      if (
        (conditionFilter === 'Critical' || conditionFilter === 'Critical Alert') &&
        !item.isCritical
      ) {
        return false;
      }
      if (conditionFilter === 'Restock Warning' && !item.isRestockWarning) {
        return false;
      }

      // 3. Category Filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

      // 4. Item Name Filter
      if (selectedItemName !== 'All' && item.materialName !== selectedItemName) return false;

      // 5. Zero Quantity Filters
      if (showZeroOnly && item.currentStock !== 0) return false;
      if (hideZeroQty && item.currentStock === 0) return false;

      return true;
    });

    if (sortBy === 'name_asc') {
      list.sort((a, b) =>
        (a.materialName || '').localeCompare(b.materialName || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );
    } else if (sortBy === 'code_asc') {
      list.sort((a, b) =>
        (a.materialCode || '').localeCompare(b.materialCode || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );
    } else if (sortBy === 'qty_desc') {
      list.sort(
        (a, b) => Number(b.suggestedOrderQty || 0) - Number(a.suggestedOrderQty || 0)
      );
    } else if (sortBy === 'qty_asc') {
      list.sort(
        (a, b) => Number(a.suggestedOrderQty || 0) - Number(b.suggestedOrderQty || 0)
      );
    } else if (sortBy === 'stock_asc') {
      list.sort(
        (a, b) => Number(a.currentStock || 0) - Number(b.currentStock || 0)
      );
    }

    return list;
  }, [
    rawMaterialRequisitions,
    searchQuery,
    conditionFilter,
    selectedCategory,
    selectedItemName,
    showZeroOnly,
    hideZeroQty,
    sortBy,
  ]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    conditionFilter,
    selectedCategory,
    selectedItemName,
    showZeroOnly,
    hideZeroQty,
    sortBy,
  ]);

  // Paginated Slices
  const paginatedRawMatRequisitions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRawMatRequisitions.slice(start, start + itemsPerPage);
  }, [filteredRawMatRequisitions, currentPage, itemsPerPage]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (conditionFilter !== 'All') count++;
    if (selectedCategory !== 'All') count++;
    if (selectedItemName !== 'All') count++;
    if (hideZeroQty) count++;
    if (showZeroOnly) count++;
    if (sortBy !== 'default') count++;
    return count;
  }, [
    searchQuery,
    conditionFilter,
    selectedCategory,
    selectedItemName,
    hideZeroQty,
    showZeroOnly,
    sortBy,
  ]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setConditionFilter('All');
    setSelectedCategory('All');
    setSelectedItemName('All');
    setHideZeroQty(false);
    setShowZeroOnly(false);
    setSortBy('default');
    setCurrentPage(1);
  };

  // Generate and Download PDF for a single Raw Material Requisition
  const handleDownloadRawMatPDF = async (item) => {
    try {
      const [logoBase64, watermarkBase64] = await Promise.all([
        loadBase64Image('/mhira_removebg.png'),
        loadWatermarkImage('/mhira_removebg.png', 0.095),
      ]);

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const logoRatio = 835 / 673;

      const wmWidth = 90;
      const wmHeight = wmWidth / logoRatio;
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight - wmHeight) / 2;

      const headerLogoH = 15;
      const headerLogoW = headerLogoH * logoRatio;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 12, headerLogoW, headerLogoH, undefined, 'FAST');
        } catch (e) { }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(21, 62, 151);
      doc.text('MHIRA NATURAL BEAUTY PRODUCTS', 36, 16.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text('WAREHOUSE OPERATIONS & ENTERPRISE RESOURCE PLANNING', 36, 21.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text('Official Material Requisition & Procurement Authorization Form', 36, 26);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(21, 62, 151);
      doc.text('Security Classification: INTERNAL CONFIDENTIAL • Controlled Executive Copy', 36, 30);

      // Top-Right Metadata
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(21, 62, 151);
      doc.text('MATERIAL PURCHASE REQUISITION', pageWidth - 14, 16.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`PR NO: ${item.prNumber || 'PR-STOCK'}`, pageWidth - 14, 21.5, { align: 'right' });
      doc.text(`MATERIAL: ${item.materialCode || 'N/A'}`, pageWidth - 14, 26, { align: 'right' });
      doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - 14, 30, { align: 'right' });

      // Clean dividing line
      doc.setDrawColor(21, 62, 151);
      doc.setLineWidth(0.4);
      doc.line(14, 33.5, pageWidth - 14, 33.5);

      // 4-column KPI Summary Table
      autoTable(doc, {
        startY: 36,
        margin: { left: 14, right: 14 },
        head: [['CURRENT STOCK', 'RESTOCK POINT', 'CRITICAL LEVEL', 'SUGGESTED ORDER QTY']],
        body: [[
          `${item.currentStock || 0} ${item.uom || 'pcs'}`,
          `${item.restockWarningPoint || 0} ${item.uom || 'pcs'}`,
          `${item.criticalLevel || 0} ${item.uom || 'pcs'}`,
          `+${item.suggestedOrderQty || 0} ${item.uom || 'pcs'}`,
        ]],
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 6.0,
          cellPadding: { top: 2.2, bottom: 2.2, left: 1.5, right: 1.5 },
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          halign: 'center',
          valign: 'middle',
          overflow: 'ellipsize',
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: 'bold',
          fontSize: 5.6,
          halign: 'center',
          valign: 'middle',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          overflow: 'ellipsize',
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 6.0,
          halign: 'center',
          valign: 'middle',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          overflow: 'ellipsize',
        },
        columnStyles: {
          0: { cellWidth: 45.5 },
          1: { cellWidth: 45.5 },
          2: { cellWidth: 45.5 },
          3: { cellWidth: 45.5 },
        },
      });

      // Condition color for individual raw mat PDF
      const isCrit = Boolean(item.isCritical || (item.conditionLabel || '').toUpperCase().includes('CRITICAL'));
      const isWarn = Boolean(item.isRestockWarning || (item.conditionLabel || '').toUpperCase().includes('RESTOCK') || (item.conditionLabel || '').toUpperCase().includes('WARNING'));
      const indColor = isCrit
        ? { fillColor: [254, 226, 226], textColor: [185, 28, 28] } // Soft red tint (red-100)
        : isWarn
          ? { fillColor: [254, 249, 195], textColor: [161, 98, 7] }   // Soft yellow tint (amber-100)
          : { fillColor: [220, 252, 231], textColor: [22, 101, 52] };  // Soft green tint (emerald-100)

      // Specifications Table (Consistent UI: Category Title Row & Condition-Colored Current Stock)
      const specStartY = (doc.lastAutoTable?.finalY || 45) + 4.5;
      autoTable(doc, {
        startY: specStartY,
        margin: { left: 14, right: 14, top: 19, bottom: 12 },
        head: [
          [
            {
              content: `CATEGORY: ${(item.category || 'Raw Materials').toUpperCase()}`,
              colSpan: 5,
              styles: {
                fillColor: [241, 245, 249],
                textColor: [21, 62, 151],
                fontStyle: 'bold',
                fontSize: 7.2,
                halign: 'left',
                valign: 'middle',
                cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
                lineColor: [203, 213, 225],
                lineWidth: 0.15,
                overflow: 'ellipsize',
              },
            },
          ],
          ['ITEM CODE', 'MATERIAL DESCRIPTION', 'CURRENT STOCK', 'RESTOCK POINT', 'SUGGESTED PR QTY'],
        ],
        body: [[
          item.materialCode || 'N/A',
          item.materialName || 'Raw Material',
          {
            content: `${item.currentStock || 0} ${item.uom || 'pcs'}`,
            styles: {
              fillColor: indColor.fillColor,
              textColor: indColor.textColor,
              fontStyle: 'bold',
              halign: 'center',
              overflow: 'ellipsize',
            },
          },
          `${item.restockWarningPoint || 0} ${item.uom || 'pcs'}`,
          {
            content: `${item.suggestedOrderQty || 0} ${item.uom || 'pcs'}`,
            styles: {
              fontStyle: 'bold',
              halign: 'center',
              textColor: [21, 62, 151],
              overflow: 'ellipsize',
            },
          },
        ]],
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 6.8,
          textColor: [51, 65, 85],
          cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          valign: 'middle',
          overflow: 'ellipsize',
        },
        headStyles: {
          fillColor: [21, 62, 151],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
          halign: 'center',
          valign: 'middle',
          lineColor: [21, 62, 151],
          lineWidth: 0.2,
          overflow: 'ellipsize',
        },
        bodyStyles: {
          overflow: 'ellipsize',
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 255],
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 26 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 76 },
          2: { halign: 'center', cellWidth: 26 },
          3: { halign: 'center', cellWidth: 26 },
          4: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.cell.raw && typeof data.cell.raw === 'object' && data.cell.raw.styles) {
            if (data.cell.raw.styles.fillColor) {
              data.cell.styles.fillColor = data.cell.raw.styles.fillColor;
            }
            if (data.cell.raw.styles.textColor) {
              data.cell.styles.textColor = data.cell.raw.styles.textColor;
            }
          }
        },
      });

      let finalY = (doc.lastAutoTable?.finalY || 100) + 6;

      // Procurement Action Plan box
      if (finalY + 22 < pageHeight - 40) {
        doc.setFillColor(248, 250, 255);
        doc.setDrawColor(21, 62, 151);
        doc.setLineWidth(0.2);
        doc.roundedRect(14, finalY, 182, 18, 1.5, 1.5, 'FD');

        doc.setTextColor(21, 62, 151);
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'bold');
        doc.text('PROCUREMENT ACTION PLAN & WAREHOUSE INSTRUCTIONS:', 18, finalY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        doc.text('1. Purchase order must be issued to accredited raw material supplier based on requested quantity.', 18, finalY + 10);
        doc.text('2. Delivery must be inspected and recorded via Inbound Receiving module upon arrival at warehouse.', 18, finalY + 14.5);
        finalY += 23;
      } else {
        finalY += 2;
      }

      // Executive Audit Sign-off Section
      const sigSectionH = 24;
      if (finalY + sigSectionH > pageHeight - 14) {
        doc.addPage();
        finalY = 22;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(21, 62, 151);
      doc.text('AUDIT VERIFICATION & EXECUTIVE SIGN-OFF', 14, finalY);

      doc.setDrawColor(21, 62, 151);
      doc.setLineWidth(0.3);
      doc.line(14, finalY + 1.8, pageWidth - 14, finalY + 1.8);

      const sigY = finalY + 6.5;
      const colWidth = 72;
      const startX = 14;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(21, 62, 151);
      doc.text('PREPARED & COMPILED BY:', startX, sigY);

      // Signatory Name
      const signerFullName1 = getUserFullName('Signature over Printed Name');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(signerFullName1.length > 25 ? 5.4 : 6.2);
      doc.setTextColor(15, 23, 42);
      doc.text(signerFullName1, startX + (colWidth / 2), sigY + 9.5, { align: 'center' });

      // Underline
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.line(startX, sigY + 11, startX + colWidth, sigY + 11);

      // Subtext
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Inventory Staff', startX + (colWidth / 2), sigY + 14.8, { align: 'center' });

      // Final pass: watermark & dynamic page numbers on every page
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (watermarkBase64) {
          try {
            doc.addImage(watermarkBase64, 'PNG', wmX, wmY, wmWidth, wmHeight, undefined, 'FAST');
          } catch (e) { }
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 5.8, { align: 'right' });
      }

      const fileName = `Material_Request_${item.materialCode}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Downloaded Material Request PDF: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to generate PDF document.');
    }
  };

  // Generate Bulk PDF for Filtered Raw Materials
  const handleDownloadBulkRawMatPDF = async (itemsToExport) => {
    const list = itemsToExport && itemsToExport.length > 0 ? itemsToExport : filteredRawMatRequisitions;
    if (list.length === 0) {
      showErrorToast('No materials selected or available to export.');
      return;
    }

    try {
      const [logoBase64, watermarkBase64] = await Promise.all([
        loadBase64Image('/mhira_removebg.png'),
        loadWatermarkImage('/mhira_removebg.png', 0.095),
      ]);

      const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4 (210mm x 297mm)
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const logoRatio = 835 / 673;

      const wmWidth = 90;
      const wmHeight = wmWidth / logoRatio;
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight - wmHeight) / 2;

      const headerLogoH = 15;
      const headerLogoW = headerLogoH * logoRatio;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 12, headerLogoW, headerLogoH, undefined, 'FAST');
        } catch (e) { }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(21, 62, 151);
      doc.text('MHIRA NATURAL BEAUTY PRODUCTS', 36, 16.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text('WAREHOUSE OPERATIONS & ENTERPRISE RESOURCE PLANNING', 36, 21.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text('Bulk Raw Material Purchase Requisitions (Consolidated Restock Ledger)', 36, 26);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(21, 62, 151);
      doc.text('Security Classification: INTERNAL CONFIDENTIAL • Controlled Executive Copy', 36, 30);

      // Top-Right Metadata
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(21, 62, 151);
      doc.text('BULK RESTOCK REQUISITIONS', pageWidth - 14, 16.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`ITEMS COUNT: ${list.length} Materials`, pageWidth - 14, 21.5, { align: 'right' });
      doc.text('DOC TYPE: Purchase Requisitions', pageWidth - 14, 26, { align: 'right' });
      doc.text(`GENERATED: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });

      // Clean dividing line
      doc.setDrawColor(21, 62, 151);
      doc.setLineWidth(0.4);
      doc.line(14, 33.5, pageWidth - 14, 33.5);

      // KPI Summary Table (182mm total width in Portrait: 45.5mm x 4 columns)
      const criticalCountSummary = list.filter((r) => r.isCritical).length;
      const warningCountSummary = list.filter((r) => r.isRestockWarning).length;
      const totalSuggested = list.reduce((acc, r) => acc + (Number(r.suggestedOrderQty) || 0), 0);

      autoTable(doc, {
        startY: 36,
        margin: { left: 14, right: 14 },
        head: [['CONSOLIDATED ITEMS', 'CRITICAL ALERT', 'RESTOCK WARNING', 'TOTAL SUGGESTED UNITS']],
        body: [[
          `${list.length} Materials`,
          `${criticalCountSummary} Urgent Items`,
          `${warningCountSummary} Restock Items`,
          `${totalSuggested.toLocaleString()} Units Required`,
        ]],
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 6.0,
          cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          halign: 'center',
          valign: 'middle',
          overflow: 'ellipsize',
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: 'bold',
          fontSize: 5.8,
          halign: 'center',
          valign: 'middle',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          overflow: 'ellipsize',
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 6.2,
          halign: 'center',
          valign: 'middle',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          overflow: 'ellipsize',
        },
        columnStyles: {
          0: { cellWidth: 45.5 },
          1: { cellWidth: 45.5 },
          2: { cellWidth: 45.5 },
          3: { cellWidth: 45.5 },
        },
      });

      // Build Category-Grouped Tables (Same UI as Inventory Reports: Category Title Row & Condition-Colored Current Stock)
      const getConditionColor = (isCrit, isWarn) => {
        if (isCrit) {
          return {
            fillColor: [254, 226, 226], // Soft red tint (red-100)
            textColor: [185, 28, 28],   // Deep red text
          };
        }
        if (isWarn) {
          return {
            fillColor: [254, 249, 195], // Soft yellow tint (amber-100)
            textColor: [161, 98, 7],    // Deep amber text
          };
        }
        return {
          fillColor: [220, 252, 231],   // Soft green tint (emerald-100)
          textColor: [22, 101, 52],     // Deep green text
        };
      };

      const categoryMap = new Map();
      list.forEach((r) => {
        const cat = (r.category || 'Raw Materials').trim() || 'General';
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat).push(r);
      });
      const sortedCategoryNames = Array.from(categoryMap.keys()).sort((a, b) => a.localeCompare(b));

      const colHeaders = [
        'PR NUMBER',
        'ITEM CODE',
        'MATERIAL DESCRIPTION',
        'CURRENT STOCK',
        'RESTOCK POINT',
        'SUGGESTED QTY',
      ];

      const columnStyles = {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 28 },
        1: { fontStyle: 'bold', halign: 'left', cellWidth: 22 },
        2: { fontStyle: 'bold', halign: 'left', cellWidth: 54 },
        3: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 26 },
        5: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
      };

      let currentTableStartY = (doc.lastAutoTable?.finalY || 45) + 4.5;

      if (sortedCategoryNames.length === 0) {
        autoTable(doc, {
          startY: currentTableStartY,
          margin: { left: 14, right: 14, top: 19, bottom: 12 },
          head: [colHeaders],
          body: [['-', '-', 'No purchase requisitions found', '-', '-', '-']],
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 6.8, halign: 'center', valign: 'middle', overflow: 'ellipsize' },
          headStyles: { fillColor: [21, 62, 151], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7, halign: 'center', overflow: 'ellipsize' },
        });
      } else {
        sortedCategoryNames.forEach((catName, catIdx) => {
          const catItems = categoryMap.get(catName);
          const catBody = catItems.map((r) => {
            const isCrit = Boolean(r.isCritical || (r.conditionLabel || '').toUpperCase().includes('CRITICAL'));
            const isWarn = Boolean(r.isRestockWarning || (r.conditionLabel || '').toUpperCase().includes('RESTOCK') || (r.conditionLabel || '').toUpperCase().includes('WARNING'));
            const colors = getConditionColor(isCrit, isWarn);

            return [
              r.prNumber || 'N/A',
              r.materialCode || 'N/A',
              r.materialName || 'Raw Material',
              {
                content: `${r.currentStock || 0} ${r.uom || 'pcs'}`,
                styles: {
                  fillColor: colors.fillColor,
                  textColor: colors.textColor,
                  fontStyle: 'bold',
                  halign: 'center',
                  overflow: 'ellipsize',
                },
              },
              `${r.restockWarningPoint || 0} ${r.uom || 'pcs'}`,
              {
                content: `${r.suggestedOrderQty || 0} ${r.uom || 'pcs'}`,
                styles: {
                  fontStyle: 'bold',
                  halign: 'center',
                  textColor: [21, 62, 151],
                  overflow: 'ellipsize',
                },
              },
            ];
          });

          if (catIdx > 0) {
            currentTableStartY = (doc.lastAutoTable?.finalY || 45) + 4.5;
            if (currentTableStartY > pageHeight - 32) {
              doc.addPage();
              currentTableStartY = 19;
            }
          }

          autoTable(doc, {
            startY: currentTableStartY,
            margin: { left: 14, right: 14, top: 19, bottom: 12 },
            head: [
              [
                {
                  content: `CATEGORY: ${catName.toUpperCase()}   •   ${catItems.length} ${catItems.length === 1 ? 'ITEM' : 'ITEMS'}`,
                  colSpan: colHeaders.length,
                  styles: {
                    fillColor: [241, 245, 249],
                    textColor: [21, 62, 151],
                    fontStyle: 'bold',
                    fontSize: 7.2,
                    halign: 'left',
                    valign: 'middle',
                    cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
                    lineColor: [203, 213, 225],
                    lineWidth: 0.15,
                    overflow: 'ellipsize',
                  },
                },
              ],
              colHeaders,
            ],
            body: catBody,
            theme: 'grid',
            styles: {
              font: 'helvetica',
              fontSize: 6.8,
              textColor: [51, 65, 85],
              cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
              lineColor: [226, 232, 240],
              lineWidth: 0.15,
              valign: 'middle',
              overflow: 'ellipsize', // whitespace nowrap: prevents all td cell line wrapping
            },
            headStyles: {
              fillColor: [21, 62, 151],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 7,
              halign: 'center',
              valign: 'middle',
              lineColor: [21, 62, 151],
              lineWidth: 0.2,
              overflow: 'ellipsize',
            },
            bodyStyles: {
              overflow: 'ellipsize',
              valign: 'middle',
            },
            alternateRowStyles: {
              fillColor: [248, 250, 255],
            },
            columnStyles: columnStyles,
            didParseCell: (data) => {
              if (data.section === 'body' && data.cell.raw && typeof data.cell.raw === 'object' && data.cell.raw.styles) {
                if (data.cell.raw.styles.fillColor) {
                  data.cell.styles.fillColor = data.cell.raw.styles.fillColor;
                }
                if (data.cell.raw.styles.textColor) {
                  data.cell.styles.textColor = data.cell.raw.styles.textColor;
                }
              }
            },
          });
        });
      }

      // Executive Audit Sign-off Section
      let finalY = (doc.lastAutoTable?.finalY || 140) + 8;
      const sigSectionH = 24;
      if (finalY + sigSectionH > pageHeight - 14) {
        doc.addPage();
        finalY = 22;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(21, 62, 151);
      doc.text('AUDIT VERIFICATION & EXECUTIVE SIGN-OFF', 14, finalY);

      doc.setDrawColor(21, 62, 151);
      doc.setLineWidth(0.3);
      doc.line(14, finalY + 1.8, pageWidth - 14, finalY + 1.8);

      const sigY = finalY + 6.5;
      const colWidth = 72;
      const startX = 14;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(21, 62, 151);
      doc.text('PREPARED & COMPILED BY:', startX, sigY);

      // Signatory Name
      const signerFullName2 = getUserFullName('Signature over Printed Name');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(signerFullName2.length > 25 ? 5.4 : 6.2);
      doc.setTextColor(15, 23, 42);
      doc.text(signerFullName2, startX + (colWidth / 2), sigY + 9.5, { align: 'center' });

      // Underline
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.line(startX, sigY + 11, startX + colWidth, sigY + 11);

      // Subtext
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Inventory Staff', startX + (colWidth / 2), sigY + 14.8, { align: 'center' });

      // Final pass: watermark, running header & dynamic page numbers on every page
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (watermarkBase64) {
          try {
            doc.addImage(watermarkBase64, 'PNG', wmX, wmY, wmWidth, wmHeight, undefined, 'FAST');
          } catch (e) { }
        }

        if (i > 1) {
          const thumbH = 7;
          const thumbW = thumbH * logoRatio;
          if (logoBase64) {
            try {
              doc.addImage(logoBase64, 'PNG', 14, 7, thumbW, thumbH, undefined, 'FAST');
            } catch (e) { }
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.2);
          doc.setTextColor(21, 62, 151);
          doc.text('MHIRA NATURAL BEAUTY PRODUCTS  •  BULK MATERIAL REQUISITIONS', 14 + thumbW + 4, 11.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.2);
          doc.setTextColor(100, 116, 139);
          doc.text(`Exported: ${new Date().toLocaleDateString()}`, pageWidth - 14, 11.5, { align: 'right' });

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(14, 16, pageWidth - 14, 16);
        }

        const footerY = pageHeight - 7;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(14, footerY - 2.5, pageWidth - 14, footerY - 2.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(100, 116, 139);
        doc.text('INTERNAL CONFIDENTIAL • CONTROLLED EXECUTIVE COPY', 14, footerY + 1.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, footerY + 1.2, { align: 'right' });
      }

      const fileName = `Bulk_Material_Purchase_Requisitions_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported ${list.length} raw material requisitions to PDF!`);
    } catch (err) {
      console.error('Error generating bulk PDF:', err);
      showErrorToast('Failed to export bulk PDF document.');
    }
  };

  // Unified PDF Export handler for Toolbar Button
  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      await handleDownloadBulkRawMatPDF();
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 font-sans antialiased text-slate-700">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE) */}
      <div className="w-full bg-white border border-slate-100 text-slate-600 rounded-2xl p-3 sm:p-6 shadow-sm flex flex-col gap-4 sm:gap-6 transition-colors duration-200">

        {/* ======================================================== */}
        {/* COMPACT EXCEL RIBBON TOOLBAR (RESPONSIVE SEAMLESS DESIGN) */}
        {/* ======================================================== */}
        <div className="w-full bg-white flex flex-col">

          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0">
            <div className="flex items-center gap-1 -mb-px">
              <button
                type="button"
                className="px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg cursor-default"
              >
                <Layers className="w-3.5 h-3.5 text-[#01390f]" />
                <span>Purchase Requests</span>
              </button>
            </div>
          </div>

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (RESPONSIVE: STACKS ON MOBILE, 1 ROW ON DESKTOP) */}
          <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">

            {/* GROUP 1: ACTIONS (Responsive: Full-width on mobile, fixed width on desktop) */}
            <div className="w-full lg:w-[256px] shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]">
              <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
                {/* 1 COLUMN NA 1 LAYER: Tall Full-Height Action Button */}
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f] disabled:opacity-60 disabled:cursor-wait"
                  title="Download Official Purchase Requisitions PDF"
                  aria-label="Download Official Purchase Requisitions PDF"
                >
                  {isExportingPDF ? (
                    <Loader2 className="w-5.5 h-5.5 text-[#01390f] animate-spin mb-0.5" />
                  ) : (
                    <Download className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                  )}
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    {isExportingPDF ? (
                      <>Exporting...<br />(PDF)</>
                    ) : (
                      <>Download<br />(PDF)</>
                    )}
                  </span>
                </button>

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                  {/* Quick Filter: Critical PR */}
                  <button
                    type="button"
                    onClick={() => {
                      setConditionFilter((prev) =>
                        prev === 'Critical Alert' || prev === 'Critical' ? 'All' : 'Critical Alert'
                      );
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded border transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] whitespace-nowrap ${conditionFilter === 'Critical Alert' || conditionFilter === 'Critical'
                        ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold shadow-2xs'
                        : 'bg-slate-50 lg:bg-transparent border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700'
                      }`}
                    title={
                      conditionFilter === 'Critical Alert' || conditionFilter === 'Critical'
                        ? 'Showing Critical Alert only (Click to show all)'
                        : 'Filter by Critical Alert'
                    }
                  >
                    <AlertTriangle
                      className={`w-3.5 h-3.5 shrink-0 ${conditionFilter === 'Critical Alert' || conditionFilter === 'Critical'
                          ? 'text-rose-600'
                          : 'text-slate-500'
                        }`}
                    />
                    <span className="whitespace-nowrap">
                      Critical PR
                    </span>
                  </button>

                  {/* Reset Filters */}
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    disabled={activeFiltersCount === 0}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                    title={
                      activeFiltersCount > 0
                        ? `Reset active filters (${activeFiltersCount})`
                        : 'No active filters'
                    }
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap">
                      Reset Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                    </span>
                  </button>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
                Actions
              </div>
            </div>

            {/* GROUP 2: SEARCH & FILTERS (Responsive Multi-Column Grid) */}
            <div className="flex flex-col justify-between flex-1 min-h-0 lg:min-h-[92px] lg:pl-1">
              <div className="flex flex-col justify-between flex-1 py-0.5 space-y-2 lg:space-y-1">

                {/* Layer 1: Search Bar (Enhanced Height) */}
                <div className="relative flex items-center w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="search"
                    name="purchaseRequestSearchQuery"
                    id="purchaseRequestSearchQuery"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    placeholder="Search Code, Description, Name, PR No..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    title="Search Code, Description, Name, PR No..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Layer 2: Filter Dropdowns (Responsive: 1 col on mobile, 3 cols on sm+) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                  {/* Category Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Tag className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Filter by Category"
                    >
                      <option value="All">All Categories ({uniqueCategories.length})</option>
                      {uniqueCategories.map((cat, idx) => (
                        <option key={idx} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Item Name Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Package className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedItemName}
                      onChange={(e) => setSelectedItemName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Filter by Item Name"
                    >
                      <option value="All">All Item Names ({uniqueItemNames.length})</option>
                      {uniqueItemNames.map((name, idx) => (
                        <option key={idx} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Condition Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0 sm:col-span-2 md:col-span-1">
                    <Activity className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={conditionFilter}
                      onChange={(e) => setConditionFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Filter by Condition & Stock Threshold Limits"
                    >
                      <option value="All">All Conditions</option>
                      <option value="Critical Alert">🔴 Critical Alert</option>
                      <option value="Restock Warning">🟡 Restock Warning</option>
                    </select>
                  </div>
                </div>

                {/* Layer 3: Quick Filter Toggles & Sort (Responsive: 1 col on mobile, 3 cols on sm+) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                  {/* Hide 0 Qty */}
                  <button
                    type="button"
                    onClick={() => {
                      setHideZeroQty(!hideZeroQty);
                      if (!hideZeroQty) setShowZeroOnly(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 sm:py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[30px] sm:h-[22px] w-full shadow-2xs ${hideZeroQty
                        ? 'bg-red-50 text-red-700 border border-red-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    title={hideZeroQty ? 'Showing: 0 Qty Hidden (Click to show)' : 'Click to Hide 0 Quantity items'}
                  >
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hide 0 Qty</span>
                  </button>

                  {/* 0 Qty Only */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowZeroOnly(!showZeroOnly);
                      if (!showZeroOnly) setHideZeroQty(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 sm:py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors relative h-[30px] sm:h-[22px] w-full shadow-2xs ${showZeroOnly
                        ? 'bg-rose-50 text-rose-700 border border-rose-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    title={
                      showZeroOnly
                        ? 'Showing: 0 Qty Only'
                        : 'Filter 0 Qty Only'
                    }
                  >
                    <Boxes className="w-3.5 h-3.5 text-slate-500" />
                    <span>0 Qty Only</span>
                  </button>

                  {/* Sort Select */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Sort items"
                    >
                      <option value="default">Sort: Default</option>
                      <option value="name_asc">Name (A → Z)</option>
                      <option value="code_asc">Code (A → Z)</option>
                      <option value="qty_desc">PR Qty (High → Low)</option>
                      <option value="qty_asc">PR Qty (Low → High)</option>
                      <option value="stock_asc">Stock (Low → High)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-1 select-none hidden lg:block">
                Search & Filter
              </div>
            </div>

          </div>

        </div>

        {/* CLEAN SEPARATOR BEFORE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* FULL-WIDTH MASTERLIST TABLE */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden flex flex-col">
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredRawMatRequisitions.length}
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
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">PR No.</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">Material Code</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">Category</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">Raw Material Name</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Current Stock</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Restock Point</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Suggested Order Qty</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Stock Condition</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-20 min-w-[80px] font-semibold text-white">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading raw material requisitions...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRawMatRequisitions.map((item) => {
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 whitespace-nowrap group text-xs sm:text-sm"
                      >
                        {/* 1. PR NUMBER */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                            {item.prNumber}
                          </span>
                        </td>

                        {/* 2. MATERIAL CODE */}
                        <td className="px-4 py-3.5 font-mono font-semibold text-xs text-slate-700 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.materialCode}
                        </td>

                        {/* 3. CATEGORY (Pill Badge) */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#01390f] border border-emerald-200">
                            {item.category || 'Materials'}
                          </span>
                        </td>

                        {/* 4. MATERIAL NAME */}
                        <td className="px-4 py-3.5 font-bold text-xs text-slate-800 whitespace-nowrap max-w-xs truncate bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.materialName}
                        </td>

                        {/* 5. CURRENT STOCK (Matches Blue Accent Column) */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                          {item.currentStock} {item.uom}
                        </td>

                        {/* 6. RESTOCK WARNING POINT */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.restockWarningPoint !== null
                            ? `${item.restockWarningPoint} ${item.uom}`
                            : '-'}
                        </td>

                        {/* 7. SUGGESTED ORDER QTY */}
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-xs text-[#01390f] whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.suggestedOrderQty > 0
                            ? `+${item.suggestedOrderQty} ${item.uom}`
                            : '-'}
                        </td>

                        {/* 8. STATUS / CONDITION (Dot removed, clean badge) */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span
                            className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${item.badgeClass}`}
                          >
                            {item.conditionLabel}
                          </span>
                        </td>

                        {/* 9. ACTION (Sticky Right) */}
                        <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] transition-colors text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-20 min-w-[80px]">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setPreviewRequest(item)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] inline-flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="View Requisition Details"
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

          {!loading && filteredRawMatRequisitions.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm font-medium italic">
              No raw materials currently require replenishment based on the selected filters.
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* PREVIEW MODAL                                                             */}
      {/* ========================================================================= */}
      {previewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 whitespace-nowrap">
                  Purchase Requisition ({previewRequest.prNumber})
                </h3>
                <p className="text-xs text-slate-400">
                  Stock Replenishment Requisition ({previewRequest.materialCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRequest(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar text-xs sm:text-sm">
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">
                      {previewRequest.materialName} ({previewRequest.materialCode})
                    </span>
                    <span className="text-xs text-slate-500">
                      Category: {previewRequest.category} | UOM: {previewRequest.uom}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${previewRequest.badgeClass}`}
                  >
                    {previewRequest.conditionLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Current Stock
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {previewRequest.currentStock} {previewRequest.uom}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Reorder Point
                    </span>
                    <span className="font-bold text-amber-700 text-sm">
                      {previewRequest.restockWarningPoint ?? 'N/A'} {previewRequest.uom}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Suggested PR Qty
                    </span>
                    <span className="font-bold text-[#01390f] text-sm">
                      +{previewRequest.suggestedOrderQty} {previewRequest.uom}
                    </span>
                  </div>
                </div>

                {previewRequest.itemDescription && previewRequest.itemDescription !== '-' && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                      Description & Specifications
                    </span>
                    <span className="text-slate-700">{previewRequest.itemDescription}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setPreviewRequest(null)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDownloadRawMatPDF(previewRequest);
                }}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer border border-rose-200 flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileDown className="w-4 h-4 text-rose-600" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryPurchaseRequest;
