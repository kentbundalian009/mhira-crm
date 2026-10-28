# MHIRA Natural Soap & Cosmetics — CRM Operations Manual

**Document Identifier:** `MHIRA-SOP-2026-v1.2`  
**Revision:** `2.0 (Redesign & Expansion)`  
**Effective Date:** October 27, 2026  
**Classification:** Internal Operations Only • Confidential & Proprietary  
**Target Audience:** Warehouse Inventory Officers, Formulations Chemists, Marketing Specialists, Logistics Dispatchers, and System Administrators  
**Primary Corporate Brand Color:** `#153E97` (MHIRA Royal Blue)  

---

## Document Control & Executive Sign-Off

| Milestone | Designee / Role | Department | Signature / Status | Date |
| :--- | :--- | :--- | :--- | :--- |
| **Authored & Redesigned By** | Kent Bundalian | Systems Architecture & Documentation | *Digitally Certified* | Oct 27, 2026 |
| **QA & GMP Reviewed By** | Head of Formulations & QA | Quality Assurance & Compliance | *Approved for Production* | Oct 27, 2026 |
| **Executive Approval** | Director of Operations | Executive Management | *Authorized for Immediate Release* | Oct 27, 2026 |

---

## Document Revision History

| Version | Release Date | Primary Contributor | Summary of Revisions & Enhancements |
| :--- | :--- | :--- | :--- |
| **v1.0** | 2026-08-15 | Internal Dev Team | Initial raw documentation draft; covered basic raw materials and orders. |
| **v1.1** | 2026-09-20 | Operations Staff | Added J&T logistics tracking notes and coupon code descriptions. |
| **v2.0** | 2026-10-27 | Kent Bundalian | Complete executive redesign. Vectorized 11-page publication standard. Added Role-Based Access Control (RBAC) matrix, FEFO expiry protocol, automated Work-in-Progress (WIP) formulation engine, 4-tier customer loyalty rewards structure, incident triage diagnostics, and daily/weekly readiness audit checklists. |

---

## Table of Contents

1. [Executive Overview & Operating Principles](#1-executive-overview--operating-principles)
2. [Role-Based Access Control (RBAC) & Navigation Hierarchy](#2-role-based-access-control-rbac--navigation-hierarchy)
3. [Phase 01: Inventory Lifecycle, FEFO Tracking & Automated WIP Formulations](#phase-01-inventory-lifecycle-fefo-tracking--automated-wip-formulations)
   - 1.1 Inbound Delivery Receiving & Lot Inspection
   - 1.2 First-Expired, First-Out (FEFO) Expiry Monitoring
   - 1.3 Work-in-Progress (WIP) Batch Conversion & Auto-Deduction Engine
4. [Phase 02: Marketing Merchandising, Catalog & Customer Review Moderation](#phase-02-marketing-merchandising-catalog--customer-review-moderation)
   - 2.1 Botanical Product Catalog Merchandising & Spec Sheets
   - 2.2 Promotional Vouchers & Discount Campaign Management
   - 2.3 Storefront Customer Feedback Moderation & Quality Surveillance
5. [Phase 03: Customer Storefront Experience, Checkout Drawer & Loyalty Tiers](#phase-03-customer-storefront-experience-checkout-drawer--loyalty-tiers)
   - 3.1 Storefront Exploration, Cart Checkout & Voucher Discount Calculation
   - 3.2 Philippine Regional Address Validation & Tiered Courier Rates
   - 3.3 Customer Loyalty Rewards Program & Tier Progression (1 Pt / PHP 50)
6. [Phase 04: Logistics Fulfillment, Thermal Waybill Printing & Courier Dispatch](#phase-04-logistics-fulfillment-thermal-waybill-printing--courier-dispatch)
   - 4.1 Customer Order Confirmation Desk & Address Fraud Verification
   - 4.2 Standard Air Waybill (AWB) Generation & Barcode Scanning
   - 4.3 Courier Handover, In-Transit Milestones & Hygiene-Compliant Returns SOP
7. [Phase 05: Admin Governance, Theme Appearance, Security Audit Trails & Cloud Backups](#phase-05-admin-governance-theme-appearance-security-audit-trails--cloud-backups)
   - 5.1 System Appearance & Brand Theme Configuration
   - 5.2 Staff User Directory Management & Role Permission Enforcement
   - 5.3 Immutable Security Audit Trails (User Activity Logging)
   - 5.4 Emergency Maintenance Mode & Storefront Traffic Lockout
   - 5.5 Cloud Database Snapshots & Disaster Recovery Procedures
8. [Section 06: Operational Diagnostics & Incident Troubleshooting Matrix](#section-06-operational-diagnostics--incident-troubleshooting-matrix)
9. [Section 07: Operational FAQs & Daily Readiness Checklist](#section-07-operational-faqs--daily-readiness-checklist)
10. [Items Requiring Operational Validation](#items-requiring-operational-validation)

---

## 1. Executive Overview & Operating Principles

The **MHIRA Natural Soap & Cosmetics CRM Operations System** represents the centralized digital backbone governing the end-to-end lifecycle of artisanal skincare manufacturing and nationwide distribution. 

### Core Operating Tenets:
1. **Mathematical Inventory Integrity:** Raw materials cannot be depleted manually through arbitrary balance edits. Raw botanical ingredients are converted into salable Finished Goods strictly through Work-in-Progress (WIP) formulations with atomic database deductions.
2. **First-Expired, First-Out (FEFO) Compliance:** Skincare and botanical cosmetics utilize active organic ingredients with finite shelf lives. Warehouse dispensing strictly mandates picking batches with the earliest expiry dates.
3. **Logistics Confirmation Sovereignty:** Incoming orders placed through the public storefront (`Order Placed`) do not transition directly to courier packing. The Logistics Desk acts as an authorization filter to verify Philippine municipal addresses, validate contact numbers, and prevent Cash-on-Delivery (COD) fraud.
4. **Immutable Accountability:** Every administrative action, formulation run, price adjustment, and role grant is logged with timestamp, user ID, and IP address in non-purgeable audit logs.

---

## 2. Role-Based Access Control (RBAC) & Navigation Hierarchy

The CRM enforces strict departmental segregation to ensure data security and Good Manufacturing Practice (GMP) compliance.

```
CRM SYSTEM NAVIGATION TREE
│
├── Inventory
│   ├── Raw Materials Inventory (RM-*)
│   ├── Finished Goods Inventory (FG-*)
│   ├── Delivery Receiving (Inbound PO Lots)
│   ├── Work-in-Progress / Formulations (Batch Conversion)
│   └── Expiry Monitoring (FEFO Quarantine Alerts)
│
├── Marketing
│   ├── Products Catalog (Listing, Specs, Imagery)
│   ├── Vouchers / Coupons (Discounts, Rules)
│   ├── Customer Feedback (Review Moderation)
│   ├── Marketing Content & Banners
│   └── Promotions & Events Calendar
│
├── Customer Experience (Storefront & Profile)
│   ├── Product Showcase (/collection)
│   ├── Slide-Over Cart Drawer & Voucher Validation
│   ├── Checkout & Philippine Address Selector
│   └── Loyalty Rewards Tracking & Order Status
│
├── Logistics
│   ├── Order Confirmation Desk (Address & COD Triage)
│   ├── Thermal Waybill Printing (Airway Bills & Barcodes)
│   ├── Dispatch & Rider Handover (In Transit)
│   └── Return Management (RTS / Damage Inspections)
│
└── Admin Governance
    ├── Appearance & Branding
    ├── User Management (Staff Accounts & Roles)
    ├── User Activity (Immutable Security Audit Trail)
    ├── System Maintenance (Emergency Storefront Lockout)
    └── Data Backup (JSON & MongoDB Snapshots)
```

### Departmental RBAC Matrix:

| Operational Module | Warehouse / Inventory Officer | Marketing Specialist | Logistics Dispatcher | System Administrator | Customer / Shopper |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Raw Materials & WIP Formulations** | Full Access | No Access | No Access | Full Access | No Access |
| **Delivery Receiving & Lot Quarantine** | Full Access | No Access | No Access | Full Access | No Access |
| **Product Merchandising & Pricing** | View Only | Full Access | View Only | Full Access | View (Public) |
| **Voucher Codes & Campaign Rules** | No Access | Full Access | View Only | Full Access | Redeem at Cart |
| **Customer Review Moderation** | No Access | Full Access | No Access | Full Access | Post Reviews |
| **Order Confirmation Desk** | View Only | View Only | Full Access | Full Access | View My Orders |
| **Thermal Waybill Generation** | No Access | No Access | Full Access | Full Access | View Tracking |
| **Staff Accounts & Role Grants** | No Access | No Access | No Access | Full Access | No Access |
| **Security Audit Logs & Cloud Backups** | No Access | No Access | No Access | Full Access | No Access |

---

## Phase 01: Inventory Lifecycle, FEFO Tracking & Automated WIP Formulations

### 1.1 Inbound Delivery Receiving & Lot Inspection
- **Navigation:** `Sidebar > Inventory > Delivery Receiving`
- **Objective:** Record incoming deliveries from certified agricultural suppliers, verify physical packing slips, assign unique lot codes, and inspect Certificates of Analysis (CoA).

#### Standard Operating Procedure:
1. **Match Purchase Order:** Compare the supplier's physical delivery receipt against the pending PO in the CRM.
2. **Physicochemical Verification:** Verify that raw organic inputs (e.g., Virgin Coconut Oil, Kojic Acid Dipalmitate, Shea Butter, Lye Solution) meet temperature, packaging seal, and color specifications.
3. **Capture Lot Attributes:**
   - Record Supplier Lot Number and internal Batch ID.
   - Enter Date of Receipt and Manufacturer Expiration Date.
   - Record exact net weight received (kg/liters).
4. **Quarantine vs. Clearance:** If CoA documentation is complete, mark the lot as `Available`. If discrepancies occur, set status to `Quarantined` to prevent the WIP formulation engine from drawing from this inventory.

#### Delivery Manifest Reference Data:
| Inbound Lot ID | Raw Material Name | Supplier Code | Qty Received | Unit Cost | Expiration Date | Lot Quality Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `LOT-2026-VCO-09` | Virgin Coconut Oil | `SUP-AGRI-04` | 250.00 L | PHP 120.00 | Nov 15, 2027 | Cleared (Available) |
| `LOT-2026-KOJ-02` | Kojic Acid Powder | `SUP-CHEM-01` | 25.00 kg | PHP 850.00 | Oct 30, 2027 | Cleared (Available) |
| `LOT-2026-GLU-04` | Glutathione Extract | `SUP-CHEM-03` | 10.00 kg | PHP 2,400.00 | Dec 01, 2027 | Cleared (Available) |
| `LOT-2026-SHEA-01`| Organic Shea Butter | `SUP-AGRI-02` | 75.00 kg | PHP 310.00 | Sep 18, 2027 | Cleared (Available) |

---

### 1.2 First-Expired, First-Out (FEFO) Expiry Monitoring
- **Navigation:** `Sidebar > Inventory > Expiry Monitoring`
- **Objective:** Maintain proactive stock health and prevent botanical ingredient degradation by strictly consuming lots based on expiration proximity.

#### Expiry Alert Tiers:
- **Red Alert (Critical - Under 30 Days):** Immediate production scheduling mandatory. If not formulated within 14 days, scrap authorization protocol initiates.
- **Yellow Alert (Warning - 31 to 90 Days):** Prioritize lot allocation for upcoming scheduled batch production runs.
- **Green Status (Optimal - Over 90 Days):** Normal warehouse storage under climate-controlled conditions (22°C - 25°C).

#### Active Expiry Monitoring Registry:
| Lot Tracking ID | Raw Material / Finished Good | Current Balance | Expiration Date | Shelf Life Status | Action Directive |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `LOT-2025-VCO-01` | Virgin Coconut Oil (Storage B) | 12.50 L | Nov 20, 2026 | Critical (< 30 Days) | Prioritize in Today's WIP Run |
| `LOT-2025-GLU-01` | Glutathione Extract Powder | 1.80 kg | Dec 15, 2026 | Warning (31-60 Days) | Schedule Batch Run Week 44 |
| `LOT-2026-KOJ-01` | Kojic Acid Powder (Active) | 8.40 kg | Jun 30, 2027 | Normal (> 180 Days) | Stored in Climate Room A |

---

### 1.3 Work-in-Progress (WIP) Batch Conversion & Auto-Deduction Engine
- **Navigation:** `Sidebar > Inventory > Work-in-Progress (WIP)`
- **Objective:** Transform raw active botanical extracts and solutions into verified packaged finished cosmetic bottles with atomic, automated balance deductions.

#### Master Formulation Architecture:
```
BATCH RECIPE SPECIFICATION: FACE SERUM COLLAGEN (30 ML Dropper Bottle)
Target Batch Yield: 166 Finished Bottles (Standard Batch: 5.00 kg / 5,000 g)

[RAW INGREDIENT RATIOS (12 BOTANICAL ACTIVES)]
├── Deionized Water (RM0001)                 ──> 4,540.00 g (90.80%)
├── Sodium Hyaluronate C (RM0002)            ──>   100.00 g  (2.00%)
├── Tomato Extract (RM0005)                  ──>    50.00 g  (1.00%)
├── Witch Hazel Extract (RM0006)             ──>    50.00 g  (1.00%)
├── Cucumber Extract (RM0009)                ──>    50.00 g  (1.00%)
├── Bust-A Active Firming (RM0007)           ──>    40.00 g  (0.80%)
├── Azelaic Optima (RM0010)                  ──>    40.00 g  (0.80%)
├── Phenoxyethanol (RM0011)                  ──>    30.00 g  (0.60%)
├── Sodium Benzoate (RM0003)                 ──>    25.00 g  (0.50%)
├── Potassium Sorbate (RM0004)               ──>    25.00 g  (0.50%)
├── Pore-MinEx Pore Refiner (RM0008)         ──>    25.00 g  (0.50%)
└── Botanical Scent (RM0012)                 ──>    25.00 g  (0.50%)
                                                 ───────────────────
                                                 TOTAL MASS: 5,000.00 g (5.0 kg)
```

#### Step-by-Step Production Execution:
1. **Initiate Batch:** Select target formulation (`FACE SERUM COLLAGEN (30 ML)`).
2. **Specify Yield:** Input desired standard batch mass (e.g., `5.00 kg` yields 166 bottles).
3. **Pre-Flight Stock Verification:** The CRM validates that all 12 raw ingredient lot balances satisfy required quantities. If any active extract is insufficient, conversion is hard-blocked.
4. **Execute Conversion:** Click **Execute WIP Conversion**. The backend executes an atomic transaction:
   - Deducts exact ingredient weights from Raw Materials inventory.
   - Creates a pending inspection batch record.
   - Upon quality seal inspection, increments `Finished Goods Inventory` by exactly 166 units.
   - Updates the public storefront inventory counter in real time.

#### Finished Goods Masterlist Reference Table:
| CODE | IMAGE | CATEGORY | ITEM NAME | QUANTITY & CONDITION | SPECIFICATION & UOM | REQUIRED INGREDIENTS (5KG STANDARD BATCH) | ACTION |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **FG0004** | ![Serum](uploads/product_serum_thumb.png) | **Skin Care** | **SERUM**<br>FACE SERUM COLLAGEN | **18 Units**<br>Good Condition | **30 ML**<br>5 kg Batch | **12 Actives (5,000g Batch):** Water 4540g, Hyaluronate C 100g, Tomato 50g, Witch Hazel 50g, Cucumber 50g, Bust-A 40g, Azelaic 40g, Phenoxy 30g, Benzoate 25g, Sorbate 25g, Pore-MinEx 25g, Scent 25g | `[ View BOM ]`<br>`[ WIP Log ]` |

---

## Phase 02: Marketing Merchandising, Catalog & Customer Review Moderation

### 2.1 Botanical Product Catalog Merchandising & Spec Sheets
- **Navigation:** `Sidebar > Marketing > Products Catalog`
- **Objective:** Curate high-converting, accurate e-commerce product listings with botanical transparency, pricing governance, and visual asset management.

#### Standard Product Specification:
| Field Parameter | Specification / CRM Data | Operations Rule |
| :--- | :--- | :--- |
| **Product Title** | FACE SERUM COLLAGEN (30 ML) [SERUM] | Clear botanical naming; no misleading medical claims. |
| **SKU Code** | `FG0004` | Unique alpha-numeric identifier mapped to warehouse bins. |
| **Category** | Skin Care | Customer browsing category on `/collection`. |
| **Retail Price** | PHP 300.00 | Master base price before coupons or loyalty tiers. |
| **Stock Status** | `In Stock (18 units)` | Auto-linked to Finished Goods inventory balance. |
| **Active Ingredients** | Sodium Hyaluronate C, Soluble Collagen, Tomato Extract, Witch Hazel, Azelaic Optima | Must match official FDA cosmetic product notification. |
| **Product Imagery** | `product_serum.png` (High-Res Studio Photo Asset) | Professional studio photo with brand packaging; max 2MB. |

---

### 2.2 Promotional Vouchers & Discount Campaign Management
- **Navigation:** `Sidebar > Marketing > Vouchers / Coupons`
- **Objective:** Configure, schedule, and govern promotional discount codes to incentivize purchase frequency while protecting gross margins.

#### Active Promotional Campaigns:
| Voucher Code | Discount Value | Minimum Spend | Usage Limit | Expiration Date | Target Customer Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NATURAL20` | 20% Off Order Subtotal | PHP 300.00 | 500 Redemptions | Dec 31, 2026 | All Storefront Customers |
| `VIPGLOW` | PHP 50.00 Fixed Discount | PHP 250.00 | 1 per Customer | Nov 30, 2026 | Silver & Gold Loyalty Members |
| `FREESHIP` | 100% Courier Discount | PHP 750.00 | Unlimited | Ongoing | Orders exceeding threshold |

#### Voucher Governance Rules:
- Only one promotional voucher may be applied per transaction.
- Vouchers apply to product subtotals only and do not discount courier shipping fees unless explicitly structured as a free shipping voucher.

---

### 2.3 Storefront Customer Feedback Moderation & Quality Surveillance
- **Navigation:** `Sidebar > Marketing > Customer Feedback`
- **Objective:** Moderate incoming customer reviews, maintain brand reputation, and detect early signals of product sensitivity or packaging defects.

#### Moderation Lifecycle:
1. **Submission Queue:** All verified purchaser reviews enter status `Pending Moderation`.
2. **Policy Evaluation:**
   - **Approve:** Reviews with constructive, authentic feedback on scent, lather, packaging, or customer experience.
   - **Reject / Flag:** Reviews containing spam, offensive profanity, competitor promotion, or fraudulent unverified claims.
   - **Quality Escalation:** Any review mentioning allergic reaction, dermatitis, or broken packaging must be forwarded immediately to Quality Assurance with the product's lot number.

---

## Phase 03: Customer Storefront Experience, Checkout Drawer & Loyalty Tiers

### 3.1 Storefront Exploration, Cart Checkout & Voucher Discount Calculation
- **Navigation:** Public Storefront `/collection` and `/checkout`
- **Objective:** Deliver a seamless, transparent purchasing journey from product discovery to secure order submission.

#### Checkout Flow Architecture:
1. **Catalog Browsing:** Shoppers browse categories, view ingredient breakdowns, and check live stock availability.
2. **Slide-Over Cart Drawer:** Real-time calculation of item subtotals, active voucher deductions, and estimated courier shipping based on item weight.
3. **Address Input:** Philippine standard address selector ensures clean, deliverable shipping data.
4. **Payment Selection:** Customers select between **Cash on Delivery (COD)**, **GCash**, **Maya**, or **Debit/Credit Card**.

#### Frontend Checkout Summary Card:
```
========================================================================
CUSTOMER CHECKOUT DRAWER & ORDER SUMMARY
Status: Order Placed (Awaiting Logistics Confirmation)
========================================================================
Purchased Items:
  1x FACE SERUM COLLAGEN (30 ML) [SKU: FG0004]
  Unit Price: PHP 300.00 ................................... PHP 300.00

Promotional Voucher Applied: NATURAL20 (20% Off Subtotal) .. -PHP 60.00
Standard Courier Shipping: Cabuyao, Laguna (CALABARZON) ....  PHP 65.00
------------------------------------------------------------------------
TOTAL PAYABLE AMOUNT:                                        PHP 305.00
Payment Method Selected: Cash on Delivery (COD Collect)
========================================================================
```

---

### 3.2 Philippine Regional Address Validation & Tiered Courier Rates
To ensure zero delivery failures, the checkout engine calculates parcel weight and destination region automatically:

| Shipping Region | Standard Delivery Window | Base Shipping Rate (Up to 1.0 kg) | Incremental Rate (Per +0.5 kg) |
| :--- | :--- | :--- | :--- |
| **Laguna Intra-Provincial (Local)** | 1 - 2 Business Days | PHP 65.00 | PHP 15.00 |
| **Metro Manila (NCR)** | 2 - 3 Business Days | PHP 85.00 | PHP 20.00 |
| **Rest of Luzon (CAR, I, II, III, IV-B, V)** | 3 - 5 Business Days | PHP 110.00 | PHP 25.00 |
| **Visayas (VI, VII, VIII)** | 5 - 7 Business Days | PHP 145.00 | PHP 30.00 |
| **Mindanao (IX, X, XI, XII, CARAGA, BARMM)** | 6 - 8 Business Days | PHP 165.00 | PHP 35.00 |

---

### 3.3 Customer Loyalty Rewards Program & Tier Progression
- **Core Rule:** Customers automatically earn **1 Reward Point per PHP 50.00 spent** on confirmed delivered orders.
- Points can be redeemed for store credits, exclusive merchandise, or free products on future orders.

#### Loyalty Rewards Tier Matrix:
| Loyalty Tier | Spending Threshold | Point Multiplier | Exclusive Customer Benefits & Storefront Privileges |
| :--- | :--- | :---: | :--- |
| **Bronze** | Under PHP 1,000 | 1.0x (Standard) | Standard loyalty points accumulation; order status tracking; birthday discount code. |
| **Silver** | PHP 1,000 – PHP 4,999 | 1.2x Multiplier | Free shipping on orders above PHP 500; priority customer support ticket resolution. |
| **Gold** | PHP 5,000 – PHP 9,999 | 1.5x Multiplier | 5% permanent account discount; early access to limited seasonal botanical releases. |
| **Platinum VIP** | PHP 10,000 and above | 2.0x Multiplier | 10% permanent account discount; complimentary gift packaging; direct VIP concierge hotline. |

---

## Phase 04: Logistics Fulfillment, Thermal Waybill Printing & Courier Dispatch

### 4.1 Customer Order Confirmation Desk & Address Fraud Verification
- **Navigation:** `Sidebar > Logistics > Order Management`
- **Objective:** Triage incoming customer submissions, eliminate duplicate orders, and verify delivery addresses prior to physical packing.

#### Order Confirmation Protocol:
1. **Order Triage:** Logistics Dispatchers review incoming orders in status `Order Placed`.
2. **Address & Phone Screening:**
   - Confirm recipient name, complete street address, barangay, city/municipality, and province.
   - For Cash-on-Delivery (COD) orders exceeding PHP 1,000, call or SMS the recipient's mobile number before confirmation.
3. **Status Confirmation:** Click **Confirm Order** to transition status to `Processing`. This locks the inventory allocation and cues the packing team.

---

### 4.2 Standard Air Waybill (AWB) Generation & Barcode Scanning
- **Navigation:** `Sidebar > Logistics > Order Management > Print Waybill`
- **Printer Format:** 100mm x 150mm (4" x 6") Direct Thermal Adhesive Labels.

#### Official Air Waybill (AWB) Structure:
```
+-----------------------------------------------------------------------+
| MHIRA LOGISTICS EXPRESS               TRACKING: #JNT-PH-00293182      |
| COURIER: J&T EXPRESS PHILIPPINES (STANDARD AIRWAY BILL)    2026-10-27 |
+-----------------------------------------------------------------------+
|  ||||| | |||| ||| || |||| || ||| ||||| || ||| ||||| |||| |||          |
|  * J N T - P H - 0 0 2 9 3 1 8 2 *                                    |
+-----------------------------------------------------------------------+
| SENDER:                              RECIPIENT:                       |
| Mhira Natural Soap & Cosmetics       Kent Bundalian                   |
| Brgy. Sala, Cabuyao, Laguna 4025     Brgy. Sala, Cabuyao, Laguna 4025 |
| Contact: 0917-123-4567               Contact: 0906-525-8847           |
+-----------------------------------------------------------------------+
| PARCEL CONTENTS: 1x FACE SERUM COLLAGEN (30 ML) [FG0004]              |
| TOTAL WEIGHT: 0.15 kg • DIMENSIONS: 12cm x 6cm x 6cm                 |
| PAYMENT METHOD:                                    COD COLLECT:       |
| Cash on Delivery (COD)                             PHP 305.00         |
+-----------------------------------------------------------------------+
| [ Order Confirmed by Logistics Desk ]        [ Ready for Handover ]   |
+-----------------------------------------------------------------------+
```

---

### 4.3 Courier Handover, In-Transit Milestones & Hygiene-Compliant Returns SOP
1. **Courier Manifest Signing:** When courier riders (J&T Express / LBC) arrive for pickup, scan all packages onto the official handover manifest and obtain driver signature.
2. **Status Transition:** Transition order status from `Processing` to `In Transit`.
3. **Delivery Completion:** Electronic Proof of Delivery (e-POD) confirmation updates the order to `Delivered` and automatically triggers loyalty point crediting to the customer.
4. **Returns & Damaged Goods SOP:**
   - **Return Period:** Customers may report damaged parcels within 7 days of delivery with photo/video unboxing evidence.
   - **Cosmetics Hygiene Restriction:** In compliance with sanitary skincare regulations, opened or handled soap bars cannot be restocked under any circumstance.
   - **Accounting Treatment:** Returned damaged goods are written off to Scrap/Waste and courier insurance claims are initiated through the logistics portal.

---

## Phase 05: Admin Governance, Theme Appearance, Security Audit Trails & Cloud Backups

### 5.1 System Appearance & Brand Theme Configuration
- **Navigation:** `Sidebar > Admin > Appearance`
- **Objective:** Maintain brand uniformity and corporate visual standards across desktop and mobile devices.
- **Default Visual Palette:**
  - Primary Accent: `#153E97` (Deep Royal Navy Blue)
  - Secondary Tone: `#01390F` (Botanical Forest Green)
  - Neutral Background: `#F8FAFC` (Slate Soft Gray)
  - Font Typography: Google Font Inter / Poppins Sans-Serif

---

### 5.2 Staff User Directory Management & Role Permission Enforcement
- **Navigation:** `Sidebar > Admin > User Management`
- **Objective:** Manage staff accounts, enforce credential complexity, and maintain strict departmental access boundaries.

#### Active Staff User Directory:
| Staff Member Name | Account Handle | Corporate Email | Assigned Role | Account Status | Key Operational Responsibilities |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Administrator** | `@admin` | `admin@mhiracosmetics.ph` | **Admin** | Active | Full system governance, security configurations, database backups. |
| **Kent Bundalian** | `@logistics_kent` | `logistics@mhiracosmetics.ph` | **Logistics** | Active | Order triage, COD address verification, thermal waybill dispatch. |
| **Inventory Officer** | `@inv_officer` | `inventory@mhiracosmetics.ph` | **Inventory** | Active | Inbound receiving, lot FEFO monitoring, WIP batch conversions. |
| **Marketing Lead** | `@marketing_team` | `marketing@mhiracosmetics.ph` | **Marketing** | Active | Catalog management, promo vouchers, customer feedback moderation. |

---

### 5.3 Immutable Security Audit Trails (User Activity Logging)
- **Navigation:** `Sidebar > Admin > User Activity`
- **Objective:** Provide a forensically verifiable, append-only log of all actions taken within the system.

#### Log Attributes Captured:
- UTC and Local Timestamp (millisecond precision).
- Authenticated User Handle and Assigned Role.
- Client Remote IP Address and Browser User-Agent.
- Action Type (`LOGIN`, `WIP_EXECUTE`, `ORDER_CONFIRM`, `PRICE_UPDATE`, `BACKUP_TRIGGER`).
- Modified Database Record ID and Delta Values (before and after state).
- **Security Rule:** Audit log records are strictly non-deletable and write-once.

---

### 5.4 Emergency Maintenance Mode & Storefront Traffic Lockout
- **Navigation:** `Sidebar > Admin > System Maintenance`
- **Usage Trigger:** Major version deployments, schema migrations, physical inventory counts, or detected security anomalies.
- **Behavior:**
  - Locks the public storefront (`/collection` and `/checkout`).
  - Displays a branded, polite maintenance screen to visitors.
  - Keeps internal CRM administrative and inventory portals accessible to authenticated staff.

---

### 5.5 Cloud Database Snapshots & Disaster Recovery Procedures
- **Navigation:** `Sidebar > Admin > Data Backup`
- **Objective:** Ensure zero data loss and rapid recovery in the event of hardware failure, catastrophic corruption, or disaster.

#### Backup Schedule & Governance:
- **Automated Daily Snapshots:** Triggered nightly at 00:00 UTC (08:00 AM PHT). Full MongoDB database dump compressed and encrypted.
- **On-Demand Manual Backups:** Must be executed by the Administrator immediately prior to major recipe modifications, bulk inventory reconciliations, or staff directory changes.
- **Off-Site Replication:** Backup snapshots are mirrored to encrypted off-site cloud storage with a 90-day retention cycle.

---

## Section 06: Operational Diagnostics & Incident Troubleshooting Matrix

| Operational Symptom / Error Code | Root Cause Analysis | Responsible Role | Step-by-Step Resolution Procedure |
| :--- | :--- | :---: | :--- |
| **WIP Conversion Error:**<br>`Insufficient raw material balance for formulation` | Warehouse raw material stock balance is lower than required recipe quantity, or available lots are quarantined. | Inventory Officer | 1. Check Delivery Receiving for unposted inbound shipments.<br>2. Check Expiry Monitoring to see if lots are locked in quarantine.<br>3. Receive fresh stock before re-attempting batch conversion. |
| **Storefront Discrepancy:**<br>`Product displays 'Out of Stock' despite active catalog listing` | Finished Goods physical inventory has reached 0. Storefront availability strictly mirrors physical count. | Marketing / Inventory | 1. Contact Inventory Officer to execute a fresh WIP batch conversion.<br>2. Once conversion completes, storefront availability restores automatically without manual re-publishing. |
| **Order Confirmation Delay:**<br>`Logistics unable to transition order from 'Order Placed'` | Recipient contact number is invalid or delivery address lacks required Philippine municipality/barangay. | Logistics Dispatcher | 1. Open Order Details modal in Order Management.<br>2. Contact customer via phone/email to obtain verified address.<br>3. Edit address fields in order modal, click **Save**, and proceed with confirmation. |
| **Thermal Waybill Barcode Error:**<br>`Courier rider unable to scan printed barcode label` | Thermal printer printhead density too low, thermal paper creased, or browser print scale set incorrectly. | Logistics Dispatcher | 1. Clean thermal printer printhead with isopropyl alcohol swab.<br>2. In the browser print dialog, verify print scale is set to exactly 100% (disable "Fit to Printable Area").<br>3. Reprint waybill label from Order Management. |
| **Access Denied / 403 Forbidden:**<br>`Staff member cannot access specific sidebar module` | Staff account does not possess the required RBAC role permissions, or user session token has expired. | Admin / Staff | 1. Staff member should log out and log back in to refresh JWT session.<br>2. If still restricted, Admin must review User Management to verify role assignment matches job description. |
| **Database Backup Warning:**<br>`Snapshot generation timeout or disk write limit` | Server storage quota reached, or heavy database read/write concurrency during peak hours. | System Administrator | 1. Archive older backup snapshots to offsite cloud storage.<br>2. Trigger manual backup during non-peak operational windows (after 10:00 PM PHT).<br>3. Verify MongoDB disk health via server cPanel/SSH. |

> **Critical Incident Escalation Protocol:**  
> If an operational issue cannot be resolved through standard troubleshooting steps within 15 minutes, immediately escalate to the Systems Administrator via `admin@mhiracosmetics.ph` or the emergency operational hotline. Do not attempt direct database alterations without written authorization from the Operations Lead.

---

## Section 07: Operational FAQs & Daily Readiness Checklist

### 7.1 Frequently Asked Questions (FAQs)

#### Q1: How does raw material auto-deduction prevent warehouse inventory discrepancies?
**Answer:** When an Inventory Officer executes a WIP conversion batch, the formulation engine mathematically computes exact ingredient weights and executes atomic database deductions. This guarantees zero unrecorded raw material consumption and prevents human calculation errors.

#### Q2: Can the Marketing team publish storefront products without physical finished goods in stock?
**Answer:** Marketing can create and draft product listings, upload imagery, and specify botanical ingredients. However, the storefront purchasing button remains disabled ("Out of Stock") until Inventory completes a physical WIP batch conversion that credits the Finished Goods inventory balance.

#### Q3: Why does Logistics act as the sole Order Confirmation authority?
**Answer:** Logistics serves as the quality and fraud barrier. They verify Philippine regional shipping addresses, validate parcel weight against courier freight rules, verify Cash-on-Delivery legitimacy, and print official courier waybills prior to parcel packing.

#### Q4: How are customer loyalty tier reward points calculated and redeemed?
**Answer:** Registered customers automatically earn 1 Reward Point for every PHP 50.00 spent on confirmed delivered orders. Accumulated points unlock progressive VIP tiers: Bronze (< PHP 1,000), Silver (PHP 1,000+), Gold (PHP 5,000+), and Platinum VIP (PHP 10,000+), each granting exclusive lifetime discounts and benefits.

---

### 7.2 Daily & Weekly Operational Readiness Checklist

| Inspection Frequency | Operational Inspection Item | Responsible Role | Verification Standard & Criteria |
| :---: | :--- | :---: | :--- |
| **Daily (Morning)** | Inbound Manifest & FEFO Audit | Inventory Officer | Inspect physical stock-in, verify supplier CoAs, review 90-day expiry monitoring alert dashboard. |
| **Daily (Morning & Midday)** | Order Confirmation & Dispatch Triage | Logistics Dispatcher | Confirm all incoming `Order Placed` records, print thermal waybills, pack parcels for courier pickup. |
| **Daily (Evening)** | Storefront Stock & Reviews Audit | Marketing Lead | Review low-stock finished goods alerts, moderate pending customer reviews, review active promotional vouchers. |
| **Daily (Midnight)** | Automated Cloud Database Backup | System Administrator | Verify automated snapshot creation, inspect server audit logs, ensure zero database synchronization errors. |
| **Weekly (Friday)** | Physical Stock vs. System Variance Audit | Inventory / Operations | Conduct physical cycle count of raw botanical oils and finished soaps; zero tolerance for unrecorded variance. |

---

## Items Requiring Operational Validation

During the thorough review of the CRM codebase and operations manual, the following operational parameters were identified as requiring final administrative or managerial confirmation:

1. **Courier Corporate Account Number & API Credentials:** Confirm official J&T Express and LBC customer codes and API webhook secrets for live automated tracking synchronization.
2. **Formula Access Authorization Policy:** Clarify whether junior inventory clerks or only certified formulation chemists should have permission to trigger WIP batch conversions.
3. **Scrap & Spoilage Write-Off Monetary Limits:** Establish threshold values above which expired raw materials or returned damaged soaps require dual-signature executive sign-off prior to database write-off.
4. **Loyalty Point Expiration Lifespan:** Confirm whether customer loyalty points remain valid indefinitely or expire after 12 or 24 months of storefront inactivity.

---
*End of Operations Manual • MHIRA Natural Soap & Cosmetics • Confidential & Proprietary*
