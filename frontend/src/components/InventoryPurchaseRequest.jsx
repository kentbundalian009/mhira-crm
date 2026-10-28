import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios, { API } from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';
import {
  FileSpreadsheet,
  Download,
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  RefreshCw,
  Eye,
  Filter,
  Factory,
  Loader2,
  ListPlus,
  Check,
  FileDown,
  X,
  RotateCcw,
  Tag,
  FileText,
  Activity,
  ChevronDown,
  ArrowUpDown,
  EyeOff,
} from 'lucide-react';

const DEFAULT_GLOBAL_THRESHOLDS = {
  criticalLevel: 0,
  restockWarningPoint: 10,
  overstockLimitPoint: 200,
};

const DEFAULT_UOM_THRESHOLDS = {
  pcs: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 200 },
  kg: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 50 },
  g: { criticalLevel: 0, restockWarningPoint: 500, overstockLimitPoint: 5000 },
  l: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 100 },
  ml: { criticalLevel: 0, restockWarningPoint: 500, overstockLimitPoint: 5000 },
  drum: { criticalLevel: 0, restockWarningPoint: 2, overstockLimitPoint: 20 },
  box: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 50 },
  bag: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 50 },
  roll: { criticalLevel: 0, restockWarningPoint: 3, overstockLimitPoint: 30 },
  meter: { criticalLevel: 0, restockWarningPoint: 20, overstockLimitPoint: 200 },
};

function InventoryPurchaseRequest() {
  const API_URL =
    import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com/api'
      : 'http://localhost:5000/api';

  // Active View Tab: 'wip-shortages' | 'raw-materials'
  const [activeSourceTab, setActiveSourceTab] = useState('raw-materials');

  const [wipLogs, setWipLogs] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearchQuery, setRecentSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItemName, setSelectedItemName] = useState('All');
  const [selectedItemDesc, setSelectedItemDesc] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [hideZeroQty, setHideZeroQty] = useState(false);
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name_asc' | 'code_asc' | 'qty_desc' | 'qty_asc'

  // Pagination states
  const [rawPage, setRawPage] = useState(1);
  const [rawPerPage, setRawPerPage] = useState(10);
  const [wipPage, setWipPage] = useState(1);
  const [wipPerPage, setWipPerPage] = useState(10);

  // Preview Modal State
  const [previewRequest, setPreviewRequest] = useState(null);

  // Threshold Rules States (synced with Raw Materials module)
  const globalThresholds = useMemo(() => {
    try {
      const saved = localStorage.getItem('rawmat_threshold_rules');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return DEFAULT_GLOBAL_THRESHOLDS;
  }, []);

  const uomThresholds = useMemo(() => {
    try {
      const saved = localStorage.getItem('rawmat_uom_thresholds');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return DEFAULT_UOM_THRESHOLDS;
  }, []);

  const itemSpecificLimits = useMemo(() => {
    try {
      const saved = localStorage.getItem('rawmat_item_specific_limits');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return {};
  }, []);

  // Resolve Thresholds for a Raw Material item
  const getResolvedThreshold = useCallback(
    (item) => {
      if (!item) return globalThresholds;
      const itemId = item._id || item.id || item.code;
      if (itemId && itemSpecificLimits[itemId]) {
        return itemSpecificLimits[itemId];
      }
      const uomKey = (item.uom || '').toLowerCase().trim();
      if (uomKey && uomThresholds[uomKey]) {
        return uomThresholds[uomKey];
      }
      return globalThresholds;
    },
    [globalThresholds, uomThresholds, itemSpecificLimits]
  );

  // Stock condition evaluator
  const getStockCondition = useCallback(
    (qty, item) => {
      const val = Number(qty) || 0;
      const rules = getResolvedThreshold(item);
      const critical = Number(rules?.criticalLevel ?? 0);
      const restock = Number(rules?.restockWarningPoint ?? 10);
      const overstock = Number(rules?.overstockLimitPoint ?? 200);

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

  // Fetch Data from Backend
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [wipRes, rawRes] = await Promise.allSettled([
        axios.get(`${API_URL}/inventory-wip`, { headers }),
        axios.get(`${API_URL}/inventory-raw-materials`, { headers }),
      ]);

      if (wipRes.status === 'fulfilled' && Array.isArray(wipRes.value.data)) {
        setWipLogs(wipRes.value.data);
      }
      if (rawRes.status === 'fulfilled' && Array.isArray(rawRes.value.data)) {
        setRawMaterials(rawRes.value.data);
      }
    } catch (error) {
      console.error('Error fetching material request data:', error);
      showErrorToast('Failed to load pending material requests.');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 1. Compute Consolidated WIP Shortage Requests (1 PR per WIP Batch)
  const wipMaterialRequests = useMemo(() => {
    const requests = [];
    const pendingBatches = wipLogs.filter(
      (log) =>
        log.status === 'Pending / Shortage' ||
        log.status === 'Pending / In Production' ||
        (Number(log.pendingQuantity) || 0) > 0
    );

    pendingBatches.forEach((batch) => {
      const pendingQty = Number(batch.pendingQuantity) || Number(batch.targetQuantity) || 1;
      const ingredients = Array.isArray(batch.ingredientsUsed) ? batch.ingredientsUsed : [];

      const parsedIngredients = ingredients.map((ing) => {
        const unitReq = Number(ing.unitRequired) || 0;
        const totalNeededForPending = unitReq * pendingQty;

        const mat = rawMaterials.find(
          (m) =>
            (m._id && ing.rawMaterialId && String(m._id) === String(ing.rawMaterialId)) ||
            (m.code && ing.materialCode && m.code.toLowerCase() === ing.materialCode.toLowerCase()) ||
            (m.itemName && ing.name && m.itemName.toLowerCase() === ing.name.toLowerCase())
        );

        const currentStock = mat ? Number(mat.quantity) || 0 : 0;
        const shortageAmount = Math.max(0, totalNeededForPending - currentStock);
        const isUrgentShortage = currentStock < totalNeededForPending;

        return {
          materialId: ing.rawMaterialId || mat?._id,
          materialCode: ing.materialCode || mat?.code || 'RAW-MAT',
          materialName: ing.name || mat?.itemName || 'Raw Material',
          unitRequired: unitReq,
          totalNeededForPending,
          currentStock,
          shortageAmount,
          uom: ing.uom || mat?.uom || 'pcs',
          isUrgentShortage,
        };
      });

      const missingIngredients = parsedIngredients.filter((i) => i.isUrgentShortage && i.shortageAmount > 0);

      // USER REQUIREMENT: Only include WIP batches that have actual ingredient shortages
      if (missingIngredients.length === 0) {
        return;
      }

      const isUrgentShortage = true;
      const cleanBatchCode = (batch.wipBatchCode || 'WIP').replace('WIP-BATCH-', 'BATCH-');
      const prNumber = `PR-${cleanBatchCode}`;

      requests.push({
        id: batch._id || batch.id || cleanBatchCode,
        type: 'WIP_SHORTAGE',
        prNumber,
        batchId: batch._id || batch.id,
        wipBatchCode: batch.wipBatchCode,
        productId: batch.productId,
        productCode: batch.productCode,
        productName: batch.productName,
        targetQuantity: batch.targetQuantity,
        producedQuantity: batch.producedQuantity,
        pendingQuantity: pendingQty,
        mfgDate: batch.mfgDate,
        expDate: batch.expDate,
        createdAt: batch.createdAt || batch.mfgDate,
        ingredients: parsedIngredients,
        missingIngredients,
        isUrgentShortage,
        statusLabel: `Urgent Purchase Required (${missingIngredients.length} shortage item${missingIngredients.length > 1 ? 's' : ''})`,
        statusBadgeClass: 'bg-rose-50 text-rose-700 border-rose-200/70 font-semibold',
      });
    });

    return requests;
  }, [wipLogs, rawMaterials]);

  // 2. Compute Raw Material Condition-Based Inventory Requisitions
  const rawMaterialRequisitions = useMemo(() => {
    return rawMaterials
      .filter((mat) => !mat.isArchived)
      .map((mat, idx) => {
        const qty = Number(mat.quantity) || 0;
        const condition = getStockCondition(qty, mat);
        const thresholdRules = getResolvedThreshold(mat);
        const prNumber = `PR-STOCK-${mat.code || String(idx + 1).padStart(4, '0')}`;

        return {
          id: mat._id || mat.id || `raw-${idx}`,
          type: 'RAW_MAT_STOCK',
          prNumber,
          materialId: mat._id || mat.id,
          materialCode: mat.code || 'RAW-MAT',
          materialName: mat.itemName || mat.itemDescription || 'Raw Material',
          itemDescription: mat.itemDescription || '',
          category: mat.category || 'General',
          specification: mat.specification || 'Standard',
          manufacturer: mat.manufacturer || 'N/A',
          brand: mat.brand || 'N/A',
          uom: mat.uom || 'pcs',
          currentStock: qty,
          conditionKey: condition.key,
          conditionStatus: condition.key,
          conditionLabel: condition.label,
          badgeClass: condition.badgeClass,
          dotClass: condition.dotClass,
          criticalLevel: thresholdRules.criticalLevel,
          restockWarningPoint: thresholdRules.restockWarningPoint,
          suggestedOrderQty: condition.suggestedOrderQty,
          isCritical: condition.key === 'Critical',
          isRestockWarning: condition.key === 'Restock Warning',
          createdAt: mat.createdAt || new Date().toISOString(),
        };
      })
      // USER REQUIREMENT: Only show materials that actually need reordering (Critical or Restock Warning)
      .filter((r) => r.isCritical || r.isRestockWarning);
  }, [rawMaterials, getStockCondition, getResolvedThreshold]);

  // Unique Batch Codes, Product Names, Categories, Item Names, Item Descriptions
  const uniqueBatchCodes = useMemo(() => {
    return Array.from(new Set(wipMaterialRequests.map((r) => r.wipBatchCode))).filter(Boolean);
  }, [wipMaterialRequests]);

  const uniqueProductNames = useMemo(() => {
    return Array.from(new Set(wipMaterialRequests.map((r) => r.productName))).filter(Boolean);
  }, [wipMaterialRequests]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(rawMaterials.map((r) => r.category))).filter(Boolean);
  }, [rawMaterials]);

  const uniqueItemNames = useMemo(() => {
    return Array.from(new Set(rawMaterials.map((r) => r.itemName))).filter(Boolean);
  }, [rawMaterials]);

  const uniqueItemDescriptions = useMemo(() => {
    return Array.from(new Set(rawMaterials.map((r) => r.itemDescription))).filter(Boolean);
  }, [rawMaterials]);

  // Count summaries
  const criticalCount = useMemo(
    () => rawMaterialRequisitions.filter((r) => r.isCritical).length,
    [rawMaterialRequisitions]
  );
  const restockCount = useMemo(
    () => rawMaterialRequisitions.filter((r) => r.isRestockWarning).length,
    [rawMaterialRequisitions]
  );
  const totalWipShortages = wipMaterialRequests.length;

  // Filtered WIP Requests
  const filteredWipRequests = useMemo(() => {
    let list = wipMaterialRequests.filter((item) => {
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const pr = (item.prNumber || '').toLowerCase();
        const batch = (item.wipBatchCode || '').toLowerCase();
        const prod = (item.productName || '').toLowerCase();
        const pCode = (item.productCode || '').toLowerCase();
        const ingMatch = (item.ingredients || []).some(
          (ing) =>
            (ing.materialName || '').toLowerCase().includes(q) ||
            (ing.materialCode || '').toLowerCase().includes(q)
        );

        if (!pr.includes(q) && !batch.includes(q) && !prod.includes(q) && !pCode.includes(q) && !ingMatch) {
          return false;
        }
      }
      if (selectedBatch !== 'All' && item.wipBatchCode !== selectedBatch) return false;
      if (selectedProduct !== 'All' && item.productName !== selectedProduct) return false;
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Urgent' && !item.isUrgentShortage) return false;
        if (selectedStatus === 'Ready' && item.isUrgentShortage) return false;
      }
      return true;
    });

    if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.productName || '').localeCompare(b.productName || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'code_asc') {
      list.sort((a, b) => (a.wipBatchCode || '').localeCompare(b.wipBatchCode || '', undefined, { numeric: true, sensitivity: 'base' }));
    }

    return list;
  }, [wipMaterialRequests, searchQuery, selectedBatch, selectedStatus, selectedProduct, sortBy]);

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

        if (!code.includes(q) && !name.includes(q) && !desc.includes(q) && !cat.includes(q) && !spec.includes(q) && !brand.includes(q)) {
          return false;
        }
      }

      // 2. Condition Tab Filter
      if ((conditionFilter === 'Critical' || conditionFilter === 'Critical Alert') && !item.isCritical) return false;
      if (conditionFilter === 'Restock Warning' && !item.isRestockWarning) return false;
      if (conditionFilter === 'Low Stock' && !item.isCritical && !item.isRestockWarning) return false;

      // 3. Category Filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

      // 4. Item Name Filter
      if (selectedItemName !== 'All' && item.materialName !== selectedItemName) return false;

      // 5. Item Description Filter
      if (selectedItemDesc !== 'All' && item.itemDescription !== selectedItemDesc) return false;

      // 6. Hide 0 Qty
      if (hideZeroQty && item.currentStock === 0) return false;

      return true;
    });

    if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.materialName || '').localeCompare(b.materialName || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'code_asc') {
      list.sort((a, b) => (a.materialCode || '').localeCompare(b.materialCode || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'qty_desc') {
      list.sort((a, b) => Number(b.suggestedOrderQty || 0) - Number(a.suggestedOrderQty || 0));
    } else if (sortBy === 'qty_asc') {
      list.sort((a, b) => Number(a.suggestedOrderQty || 0) - Number(b.suggestedOrderQty || 0));
    }

    return list;
  }, [rawMaterialRequisitions, searchQuery, conditionFilter, selectedCategory, selectedItemName, selectedItemDesc, hideZeroQty, sortBy]);

  // Reset pagination on filter changes
  useEffect(() => {
    setRawPage(1);
  }, [searchQuery, conditionFilter, selectedCategory, selectedItemName, selectedItemDesc, hideZeroQty, sortBy]);

  useEffect(() => {
    setWipPage(1);
  }, [searchQuery, selectedBatch, selectedStatus, selectedProduct, sortBy]);

  // Paginated Slices
  const paginatedRawMatRequisitions = useMemo(() => {
    const start = (rawPage - 1) * rawPerPage;
    return filteredRawMatRequisitions.slice(start, start + rawPerPage);
  }, [filteredRawMatRequisitions, rawPage, rawPerPage]);

  const paginatedWipRequests = useMemo(() => {
    const start = (wipPage - 1) * wipPerPage;
    return filteredWipRequests.slice(start, start + wipPerPage);
  }, [filteredWipRequests, wipPage, wipPerPage]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (activeSourceTab === 'raw-materials') {
      if (conditionFilter !== 'All') count++;
      if (selectedCategory !== 'All') count++;
      if (selectedItemName !== 'All') count++;
      if (selectedItemDesc !== 'All') count++;
      if (hideZeroQty) count++;
      if (sortBy !== 'default') count++;
    } else {
      if (selectedBatch !== 'All') count++;
      if (selectedStatus !== 'All') count++;
      if (selectedProduct !== 'All') count++;
      if (sortBy !== 'default') count++;
    }
    return count;
  }, [activeSourceTab, searchQuery, conditionFilter, selectedCategory, selectedItemName, selectedItemDesc, selectedBatch, selectedStatus, selectedProduct, hideZeroQty, sortBy]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setConditionFilter('All');
    setSelectedCategory('All');
    setSelectedItemName('All');
    setSelectedItemDesc('All');
    setSelectedBatch('All');
    setSelectedStatus('All');
    setSelectedProduct('All');
    setHideZeroQty(false);
    setSortBy('default');
    setRawPage(1);
    setWipPage(1);
  };

  // Generate and Download PDF for a single Raw Material Requisition
  const handleDownloadRawMatPDF = (item) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      // Header Banner
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('MHIRA NATURAL CRM SYSTEM', 14, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('WAREHOUSE & PROCUREMENT - RAW MATERIAL PURCHASE REQUISITION', 14, 19);

      // Requisition Metadata Box
      doc.setDrawColor(220, 226, 235);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 32, 182, 36, 3, 3, 'FD');

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      // Left Column
      doc.text('REQUISITION NO:', 18, 40);
      doc.setFont('helvetica', 'normal');
      doc.text(item.prNumber, 52, 40);

      doc.setFont('helvetica', 'bold');
      doc.text('RAW MATERIAL:', 18, 47);
      doc.setFont('helvetica', 'normal');
      doc.text(`${item.materialName} (${item.materialCode})`, 52, 47);

      doc.setFont('helvetica', 'bold');
      doc.text('CATEGORY / BRAND:', 18, 54);
      doc.setFont('helvetica', 'normal');
      doc.text(`${item.category} / ${item.brand}`, 52, 54);

      doc.setFont('helvetica', 'bold');
      doc.text('SPECIFICATION:', 18, 61);
      doc.setFont('helvetica', 'normal');
      doc.text(item.specification || 'Standard Spec', 52, 61);

      // Right Column
      doc.setFont('helvetica', 'bold');
      doc.text('DATE GENERATED:', 120, 40);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleDateString(), 155, 40);

      doc.setFont('helvetica', 'bold');
      doc.text('INVENTORY LEVEL:', 120, 47);
      doc.setTextColor(item.isCritical ? 190 : 180, item.isCritical ? 24 : 83, item.isCritical ? 93 : 9);
      doc.text(item.conditionLabel.toUpperCase(), 155, 47);

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.text('CURRENT STOCK:', 120, 54);
      doc.setFont('helvetica', 'normal');
      doc.text(`${item.currentStock} ${item.uom}`, 155, 54);

      doc.setFont('helvetica', 'bold');
      doc.text('SUGGESTED PR QTY:', 120, 61);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(1, 57, 15);
      doc.text(`${item.suggestedOrderQty} ${item.uom}`, 155, 61);

      // Section Title
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PURCHASE REQUISITION ORDER SPECIFICATION', 14, 76);

      const tableData = [
        [
          item.materialCode,
          item.materialName,
          item.category,
          `${item.currentStock} ${item.uom}`,
          `${item.criticalLevel} ${item.uom}`,
          `${item.restockWarningPoint} ${item.uom}`,
          `${item.suggestedOrderQty} ${item.uom}`,
          item.conditionLabel,
        ],
      ];

      autoTable(doc, {
        startY: 80,
        head: [
          [
            'Material Code',
            'Material Description',
            'Category',
            'Current Stock',
            'Critical Point',
            'Restock Point',
            'Suggested Order Qty',
            'Stock Condition',
          ],
        ],
        body: tableData,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 51,
          halign: 'center',
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 26 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 42 },
          2: { halign: 'left', cellWidth: 22 },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'center', cellWidth: 18 },
          6: { halign: 'center', fontStyle: 'bold', textColor: [1, 57, 15], cellWidth: 22 },
          7: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
        },
        theme: 'grid',
      });

      const finalY = doc.lastAutoTable.finalY + 12;

      // Instructions
      doc.setDrawColor(241, 245, 249);
      doc.setFillColor(254, 252, 232);
      doc.roundedRect(14, finalY, 182, 22, 2, 2, 'FD');

      doc.setTextColor(133, 77, 14);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PROCUREMENT ACTION PLAN:', 18, finalY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        '1. Purchase order must be issued to accredited raw material supplier based on requested quantity.',
        18,
        finalY + 12
      );
      doc.text(
        '2. Delivery must be inspected and recorded via Inbound Receiving module upon arrival at warehouse.',
        18,
        finalY + 17
      );

      // Signature Blocks
      const signY = finalY + 38;
      doc.setDrawColor(180, 180, 180);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      doc.line(14, signY, 65, signY);
      doc.text('REQUESTED BY (Warehouse Officer)', 14, signY + 5);

      doc.line(78, signY, 130, signY);
      doc.text('VERIFIED BY (Inventory Manager)', 78, signY + 5);

      doc.line(144, signY, 196, signY);
      doc.text('APPROVED BY (Purchasing Lead)', 144, signY + 5);

      const fileName = `Material_Request_${item.materialCode}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Downloaded Purchase Requisition PDF: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to generate PDF document.');
    }
  };

  // Generate Bulk PDF for Selected / Filtered Raw Materials
  const handleDownloadBulkRawMatPDF = (itemsToExport) => {
    const list = itemsToExport && itemsToExport.length > 0 ? itemsToExport : filteredRawMatRequisitions;
    if (list.length === 0) {
      showErrorToast('No materials selected or available to export.');
      return;
    }

    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

      // Header Banner
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('MHIRA NATURAL CRM SYSTEM', 14, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('BULK RAW MATERIAL PURCHASE REQUISITIONS (INVENTORY RESTOCK PR)', 14, 18);

      doc.setFontSize(8);
      doc.text(`Exported: ${new Date().toLocaleString()} | Items Count: ${list.length}`, 200, 18);

      const tableRows = list.map((r) => [
        r.prNumber,
        r.materialCode,
        r.materialName,
        r.category,
        r.brand,
        `${r.currentStock} ${r.uom}`,
        `${r.restockWarningPoint} ${r.uom}`,
        `${r.suggestedOrderQty} ${r.uom}`,
        r.conditionLabel.toUpperCase(),
      ]);

      autoTable(doc, {
        startY: 30,
        head: [
          [
            'PR Number',
            'Item Code',
            'Raw Material Description',
            'Category',
            'Brand',
            'Current Stock',
            'Restock Point',
            'Suggested Order Qty',
            'Inventory Condition',
          ],
        ],
        body: tableRows,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: 51,
          halign: 'center',
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 32 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 26 },
          2: { halign: 'left', cellWidth: 50 },
          3: { halign: 'left', cellWidth: 25 },
          4: { halign: 'left', cellWidth: 25 },
          5: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
          6: { halign: 'center', cellWidth: 25 },
          7: { halign: 'center', fontStyle: 'bold', textColor: [1, 57, 15], cellWidth: 30 },
          8: { halign: 'center', fontStyle: 'bold', cellWidth: 35 },
        },
        theme: 'grid',
      });

      const fileName = `Bulk_Material_Purchase_Requisitions_${conditionFilter}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported ${list.length} raw material requisitions to PDF!`);
    } catch (err) {
      console.error('Error generating bulk PDF:', err);
      showErrorToast('Failed to export bulk PDF document.');
    }
  };

  // Generate WIP Shortage PDF
  const handleDownloadWipPDF = (request) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('MHIRA NATURAL CRM SYSTEM', 14, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('LOGISTICS & PROCUREMENT - WIP SHORTAGE PURCHASE REQUISITION', 14, 19);

      doc.setDrawColor(220, 226, 235);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 32, 182, 34, 3, 3, 'FD');

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      doc.text('REQUISITION NO:', 18, 40);
      doc.setFont('helvetica', 'normal');
      doc.text(request.prNumber, 52, 40);

      doc.setFont('helvetica', 'bold');
      doc.text('WIP BATCH NO:', 18, 47);
      doc.setFont('helvetica', 'normal');
      doc.text(request.wipBatchCode, 52, 47);

      doc.setFont('helvetica', 'bold');
      doc.text('TARGET FINISHED GOOD:', 18, 54);
      doc.setFont('helvetica', 'normal');
      doc.text(`${request.productName} (${request.productCode || 'N/A'})`, 52, 54);

      doc.setFont('helvetica', 'bold');
      doc.text('PENDING SHORTAGE QTY:', 18, 61);
      doc.setFont('helvetica', 'normal');
      doc.text(`${request.pendingQuantity} pcs remaining to fulfill`, 52, 61);

      doc.setFont('helvetica', 'bold');
      doc.text('DATE GENERATED:', 120, 40);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleDateString(), 155, 40);

      doc.setFont('helvetica', 'bold');
      doc.text('MFG DATE:', 120, 47);
      doc.setFont('helvetica', 'normal');
      doc.text(request.mfgDate || 'N/A', 155, 47);

      doc.setFont('helvetica', 'bold');
      doc.text('EXPIRY DATE:', 120, 54);
      doc.setFont('helvetica', 'normal');
      doc.text(request.expDate || 'N/A', 155, 54);

      doc.setFont('helvetica', 'bold');
      doc.text('URGENCY LEVEL:', 120, 61);
      doc.setTextColor(request.isUrgentShortage ? 190 : 16, request.isUrgentShortage ? 24 : 140, request.isUrgentShortage ? 93 : 70);
      doc.text(request.isUrgentShortage ? 'CRITICAL SHORTAGE' : 'SUFFICIENT STOCK', 155, 61);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('SPECIFIC RAW MATERIAL SHORTAGE BREAKDOWN', 14, 74);

      const tableData = (request.ingredients || []).map((ing) => [
        ing.materialCode || 'RAW-MAT',
        ing.materialName || 'Raw Material',
        `${ing.unitRequired} ${ing.uom}`,
        `${ing.totalNeededForPending} ${ing.uom}`,
        `${ing.currentStock} ${ing.uom}`,
        `${ing.shortageAmount > 0 ? ing.shortageAmount : 0} ${ing.uom}`,
        ing.isUrgentShortage ? 'PURCHASE NEEDED' : 'IN STOCK',
      ]);

      autoTable(doc, {
        startY: 78,
        head: [
          [
            'Material Code',
            'Material Name / Description',
            'Recipe / Unit',
            'Needed for Shortage',
            'Warehouse Stock',
            'Missing Stock (PR Qty)',
            'Status',
          ],
        ],
        body: tableData,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: 51,
          halign: 'center',
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 28 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 44 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'center', fontStyle: 'bold', textColor: [190, 24, 93], cellWidth: 25 },
          6: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
        },
        theme: 'grid',
      });

      const finalY = doc.lastAutoTable.finalY + 12;

      doc.setDrawColor(241, 245, 249);
      doc.setFillColor(254, 252, 232);
      doc.roundedRect(14, finalY, 182, 22, 2, 2, 'FD');

      doc.setTextColor(133, 77, 14);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PROCUREMENT & WAREHOUSE INSTRUCTIONS:', 18, finalY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        '1. Upon receiving this Material Purchase Request, procurement must issue a Purchase Order (PO) to authorized suppliers.',
        18,
        finalY + 12
      );
      doc.text(
        '2. Received stock must be logged in Inbound Receiving module to automatically unblock the pending WIP batch fulfillment.',
        18,
        finalY + 17
      );

      const signY = finalY + 38;
      doc.setDrawColor(180, 180, 180);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      doc.line(14, signY, 65, signY);
      doc.text('PREPARED BY (WIP Operations)', 14, signY + 5);

      doc.line(78, signY, 130, signY);
      doc.text('VERIFIED BY (Inventory Head)', 78, signY + 5);

      doc.line(144, signY, 196, signY);
      doc.text('APPROVED BY (Logistics Lead)', 144, signY + 5);

      const fileName = `Material_Request_Batch_${request.wipBatchCode}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Downloaded WIP Material Request PDF: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to generate PDF document.');
    }
  };

  const recentCombinedRequests = useMemo(() => {
    const list = [
      ...wipMaterialRequests.map((r) => ({ ...r, type: 'WIP_SHORTAGE' })),
      ...rawMaterialRequisitions
        .filter((r) => r.conditionKey === 'Critical' || r.conditionKey === 'Restock Warning')
        .map((r) => ({ ...r, type: 'RAW_MAT' }))
    ];
    return list;
  }, [wipMaterialRequests, rawMaterialRequisitions]);

  const filteredRecentRequests = useMemo(() => {
    if (!recentSearchQuery.trim()) return recentCombinedRequests;
    const q = recentSearchQuery.toLowerCase();
    return recentCombinedRequests.filter((r) => {
      return (
        r.prNumber?.toLowerCase().includes(q) ||
        r.wipBatchCode?.toLowerCase().includes(q) ||
        r.productName?.toLowerCase().includes(q) ||
        r.materialName?.toLowerCase().includes(q) ||
        r.materialCode?.toLowerCase().includes(q)
      );
    });
  }, [recentCombinedRequests, recentSearchQuery]);

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">

        {/* ======================================================== */}
        {/* COMPACT EXCEL RIBBON TOOLBAR (SEAMLESS WHITE DESIGN)     */}
        {/* ======================================================== */}
        <div className="w-full bg-white flex flex-col">

          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
            <div className="flex items-center gap-1 -mb-px">
              <button
                type="button"
                onClick={() => {
                  setActiveSourceTab('raw-materials');
                  setRawPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${activeSourceTab === 'raw-materials'
                  ? 'border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg'
                  }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#01390f]" />
                <span>Purchase Requests</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSourceTab('wip-shortages');
                  setWipPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${activeSourceTab === 'wip-shortages'
                  ? 'border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg'
                  }`}
              >
                <Factory className="w-3.5 h-3.5 text-slate-500" />
                <span>WIP Batch Shortages</span>
              </button>
            </div>
          </div>

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (CLEAN WHITE BACKGROUND - 1 ROW NO WRAPPING) */}
          <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">

            {/* GROUP 1: ACTIONS (Reset Filters) */}
            <div className="w-[140px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
              <div className="flex items-center flex-1 py-1">
                {/* Reset Filters */}
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  disabled={activeFiltersCount === 0}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white transition-colors text-xs font-semibold cursor-pointer w-full disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                  title={activeFiltersCount > 0 ? `Reset active filters (${activeFiltersCount})` : 'No active filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="whitespace-nowrap">
                    Reset Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                  </span>
                </button>
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
                    placeholder={activeSourceTab === 'raw-materials' ? "Search Code, Description, Name..." : "Search Batch, Product..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    title={activeSourceTab === 'raw-materials' ? "Search Code, Description, Name..." : "Search Batch, Product..."}
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

                {/* Layer 2: Filter Dropdowns (Equal 3 Columns) */}
                {activeSourceTab === 'raw-materials' ? (
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {/* Category Dropdown */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <Tag className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Filter by Category"
                      >
                        <option value="All">All Categories ({uniqueCategories.length})</option>
                        {uniqueCategories.map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Item Name Dropdown */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <Package className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={selectedItemName}
                        onChange={(e) => setSelectedItemName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Filter by Item Name"
                      >
                        <option value="All">All Item Names ({uniqueItemNames.length})</option>
                        {uniqueItemNames.map((name, idx) => (
                          <option key={idx} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Condition Dropdown */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <Activity className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={conditionFilter}
                        onChange={(e) => setConditionFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Filter by Condition"
                      >
                        <option value="All">All Conditions</option>
                        <option value="Critical Alert">🔴 Critical Alert</option>
                        <option value="Restock Warning">🟡 Restock Warning</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {/* Status Dropdown */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <Activity className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Filter by Production Status"
                      >
                        <option value="All">All Production Statuses</option>
                        <option value="Urgent">Urgent Missing Ingredients</option>
                        <option value="Ready">Sufficient Ingredients in Stock</option>
                      </select>
                    </div>

                    {/* Batch Dropdown */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <Tag className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Filter by WIP Batch"
                      >
                        <option value="All">All WIP Batches ({uniqueBatchCodes.length})</option>
                        {uniqueBatchCodes.map((b, idx) => (
                          <option key={idx} value={b}>Batch {b}</option>
                        ))}
                      </select>
                    </div>

                    {/* Product Dropdown */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <Package className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Filter by Finished Product"
                      >
                        <option value="All">All Products ({uniqueProductNames.length})</option>
                        {uniqueProductNames.map((p, idx) => (
                          <option key={idx} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Layer 3: Quick Filter Toggles & Sort (Exact Same 3 Columns) */}
                {activeSourceTab === 'raw-materials' ? (
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {/* Hide 0 Qty */}
                    <button
                      type="button"
                      onClick={() => setHideZeroQty(!hideZeroQty)}
                      className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${hideZeroQty
                        ? 'bg-red-50 text-red-700 border border-red-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      title={hideZeroQty ? 'Showing: 0 Qty Hidden' : 'Click to Hide 0 Quantity items'}
                    >
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>Hide 0 Qty</span>
                    </button>

                    {/* Critical Only Toggle */}
                    <button
                      type="button"
                      onClick={() => setConditionFilter(conditionFilter === 'Critical Alert' || conditionFilter === 'Critical' ? 'All' : 'Critical Alert')}
                      className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${conditionFilter === 'Critical' || conditionFilter === 'Critical Alert'
                        ? 'bg-rose-50 text-rose-700 border border-rose-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      title="Filter Critical Requisitions"
                    >
                      <Activity className="w-3.5 h-3.5 text-rose-600" />
                      <span>Critical Alert ({criticalCount})</span>
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
                        <option value="code_asc">Code (A → Z)</option>
                        <option value="qty_desc">PR Qty (High → Low)</option>
                        <option value="qty_asc">PR Qty (Low → High)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {/* Urgent Shortages Toggle */}
                    <button
                      type="button"
                      onClick={() => setSelectedStatus(selectedStatus === 'Urgent' ? 'All' : 'Urgent')}
                      className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${selectedStatus === 'Urgent'
                        ? 'bg-rose-50 text-rose-700 border border-rose-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      title="Filter Urgent Shortages"
                    >
                      <span>Urgent Shortages</span>
                    </button>

                    {/* Ready Batches Toggle */}
                    <button
                      type="button"
                      onClick={() => setSelectedStatus(selectedStatus === 'Ready' ? 'All' : 'Ready')}
                      className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${selectedStatus === 'Ready'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      title="Filter Ready Batches"
                    >
                      <span>In Stock Batches</span>
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
                        <option value="name_asc">Product (A → Z)</option>
                        <option value="code_asc">Batch (A → Z)</option>
                      </select>
                    </div>
                  </div>
                )}

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

        {/* FULL-WIDTH MASTERLIST TABLE */}
        {activeSourceTab === 'raw-materials' ? (
          <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden flex flex-col">
            <TablePagination
              currentPage={rawPage}
              totalItems={filteredRawMatRequisitions.length}
              itemsPerPage={rawPerPage}
              onPageChange={setRawPage}
              onRowsPerPageChange={(rows) => {
                setRawPerPage(rows);
                setRawPage(1);
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
                    <th className="py-3.5 px-4 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 font-semibold text-white">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Loading raw material requisitions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRawMatRequisitions.map((item) => {
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 whitespace-nowrap group"
                      >
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
                            {item.prNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.materialCode}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-md font-semibold border border-orange-200/70">
                            {item.category || 'Materials'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="inline-flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-md font-semibold border border-cyan-200/70 uppercase">
                            {item.materialName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span
                            className={
                              item.conditionStatus === 'Critical'
                                ? 'text-rose-700'
                                : item.conditionStatus === 'Restock Warning'
                                  ? 'text-amber-700'
                                  : 'text-slate-800'
                            }
                          >
                            {item.currentStock} {item.uom}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.restockWarningPoint !== null ? `${item.restockWarningPoint} ${item.uom}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-[#01390f] whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.suggestedOrderQty > 0 ? `+${item.suggestedOrderQty} ${item.uom}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md border ${item.badgeClass}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${item.conditionStatus === 'Critical'
                                ? 'bg-rose-500'
                                : item.conditionStatus === 'Restock Warning'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                                }`}
                            ></span>
                            {item.conditionLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 bg-[#f8faf8] group-hover:bg-[#eef5ee] transition-colors text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30">
                          <button
                            type="button"
                            onClick={() => setPreviewRequest({ ...item, type: 'RAW_MAT' })}
                            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] inline-flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="View Requisition Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!loading && filteredRawMatRequisitions.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm font-medium italic">
                No raw materials currently matching the selected filters.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden flex flex-col">
            <TablePagination
              currentPage={wipPage}
              totalItems={filteredWipRequests.length}
              itemsPerPage={wipPerPage}
              onPageChange={setWipPage}
              onRowsPerPageChange={(rows) => {
                setWipPerPage(rows);
                setWipPage(1);
              }}
            />
            <div className="overflow-x-auto relative custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">PR No.</th>
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">WIP Batch</th>
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">Finished Product</th>
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">Raw Materials Needed</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Needed for Shortage</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Warehouse Stock</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Missing Qty (To Buy)</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Procurement Status</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 font-semibold text-white">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Loading pending material requests...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedWipRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/90 transition-colors text-slate-700 whitespace-nowrap align-top group"
                    >
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 block text-xs">
                          {req.prNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        {req.wipBatchCode}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-md font-semibold border border-cyan-200/70 uppercase mb-1">
                            {req.productName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">Code: {req.productCode || 'FG'}</span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Target Batch: {req.pendingQuantity} pcs
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 min-w-[200px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <div className="flex flex-col gap-1.5">
                          {req.ingredients.map((ing, iIdx) => (
                            <div key={iIdx} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-200/60 text-xs">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{ing.materialName}</span>
                                <span className="font-mono text-[10px] text-indigo-700">{ing.materialCode}</span>
                              </div>
                              <span className="font-mono text-[10px] text-slate-400 font-semibold">{ing.unitRequired} {ing.uom}/unit</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <div className="flex flex-col gap-1.5">
                          {req.ingredients.map((ing, iIdx) => (
                            <div key={iIdx} className="p-1.5 font-mono font-bold text-slate-900 text-xs">
                              {ing.totalNeededForPending} {ing.uom}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <div className="flex flex-col gap-1.5">
                          {req.ingredients.map((ing, iIdx) => (
                            <div key={iIdx} className="p-1.5 font-mono font-semibold text-slate-600 text-xs">
                              {ing.currentStock} {ing.uom}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <div className="flex flex-col gap-1.5">
                          {req.ingredients.map((ing, iIdx) => (
                            <div key={iIdx} className="p-1.5 font-mono font-bold text-xs">
                              {ing.shortageAmount > 0 ? (
                                <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md inline-block">
                                  {ing.shortageAmount} {ing.uom}
                                </span>
                              ) : (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
                                  0 (In-Stock)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md border ${req.statusBadgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${req.isUrgentShortage ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                          ></span>
                          {req.statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 bg-[#f8faf8] group-hover:bg-[#eef5ee] transition-colors text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30">
                        <button
                          type="button"
                          onClick={() => setPreviewRequest(req)}
                          className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] inline-flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="View Batch Shortage Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && filteredWipRequests.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm font-medium italic">
                No active WIP material shortages detected! All production recipes have sufficient ingredients in stock.
              </div>
            )}
          </div>
        )}
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
                  {previewRequest.type === 'WIP_SHORTAGE'
                    ? `Linked to WIP Batch ${previewRequest.wipBatchCode} (${previewRequest.productName})`
                    : `Stock Replenishment Requisition (${previewRequest.materialCode})`}
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
              {previewRequest.type === 'WIP_SHORTAGE' ? (
                <>
                  <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">
                          {previewRequest.productName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Batch: {previewRequest.wipBatchCode} | Target: {previewRequest.pendingQuantity} pcs
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${previewRequest.statusBadgeClass}`}>
                        {previewRequest.statusLabel}
                      </span>
                    </div>

                    <span className="font-bold text-xs text-slate-700 uppercase">Ingredients Breakdown</span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {previewRequest.ingredients?.map((ing, iIdx) => (
                        <div key={iIdx} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block">{ing.materialName}</span>
                            <span className="font-mono text-[10px] text-indigo-700">{ing.materialCode}</span>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <span className="text-slate-400 text-[10px] block">Needed / Stock</span>
                              <span className="font-mono font-bold text-slate-800">
                                {ing.totalNeededForPending} / {ing.currentStock} {ing.uom}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Missing (To Buy)</span>
                              <span className={`font-mono font-bold ${ing.shortageAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {ing.shortageAmount > 0 ? `${ing.shortageAmount} ${ing.uom}` : 'In-Stock'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                      <span className="font-bold text-slate-800 text-sm">
                        {previewRequest.materialName} ({previewRequest.materialCode})
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${previewRequest.badgeClass}`}>
                        {previewRequest.conditionLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Stock</span>
                        <span className="font-bold text-slate-800 text-sm">
                          {previewRequest.currentStock} {previewRequest.uom}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Reorder Point</span>
                        <span className="font-bold text-amber-700 text-sm">
                          {previewRequest.restockWarningPoint ?? 'N/A'} {previewRequest.uom}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Suggested PR Qty</span>
                        <span className="font-bold text-emerald-700 text-sm">
                          {previewRequest.suggestedOrderQty} {previewRequest.uom}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
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
                  if (previewRequest.type === 'WIP_SHORTAGE') {
                    handleDownloadWipPDF(previewRequest);
                  } else {
                    handleDownloadRawMatPDF(previewRequest);
                  }
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
