import os
import re

with open("generate_manual_pdf.py", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Top definitions
old_top = """TEMP_PRODUCT_PNG = os.path.join(WORKSPACE_DIR, r"uploads\\product_soap_converted.png")"""
new_top = """TEMP_PRODUCT_PNG = os.path.join(WORKSPACE_DIR, r"uploads\\product_soap_converted.png")
SERUM_IMAGE_PATH = os.path.join(WORKSPACE_DIR, r"uploads\\product_serum.png")
SERUM_THUMB_PATH = os.path.join(WORKSPACE_DIR, r"uploads\\product_serum_thumb.png")"""

if old_top in code and "SERUM_IMAGE_PATH" not in code:
    code = code.replace(old_top, new_top, 1)

# 2. Page 5 WIP formulation
old_wip = """        [
            Paragraph("<b>Selected Formulation:</b> Gluta Kojic Soap Formula (Standard Batch: 5.00 kg)<br/><b>Target Output:</b> <font color='#047857'><b>100 Finished Bars (135g net wt)</b></font>", styles["TableCell"]),
            Paragraph("<b>Lot Number:</b> LOT-FG-2026-10-04<br/><b>Production Line:</b> Cleanroom Soap Lab 01", styles["TableCellRight"])
        ],
        [
            Paragraph("<b>AUTOMATED RAW MATERIAL STOCK DEDUCTION BREAKDOWN (ATOMIC DEDUCTION PREVIEW):</b>", ParagraphStyle("wm_sub", fontName="Helvetica-Bold", fontSize=6.8, leading=8.5, textColor=colors.HexColor("#0F172A"))),
            ""
        ],
        [
            Paragraph("• Pure Virgin Coconut Oil (RM0027): <font color='#BE123C'><b>-4.50 kg</b></font><br/>• Sodium Hydroxide / Lye (RM0034): <font color='#BE123C'><b>-1.50 kg</b></font>", styles["TableCell"]),
            Paragraph("• Pure Kojic Dipalmitate (RM0036): <font color='#BE123C'><b>-0.20 kg</b></font><br/>• Papaya Fruit Extract (RM0024): <font color='#BE123C'><b>-0.30 kg</b></font>", styles["TableCell"])
        ],
        [
            Paragraph("<font color='#047857'><b>✓ All raw material balances verified. Stocks sufficient for batch execution.</b></font>", styles["TableCellBold"]),
            Paragraph("<b>[ ACTION: Convert &gt;&gt; Finished Goods ]</b>", ParagraphStyle("btn_c", fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=colors.white, alignment=TA_CENTER))
        ]"""

new_wip = """        [
            Paragraph("<b>Selected Formulation:</b> FACE SERUM COLLAGEN Formula (Standard Batch: 5.00 kg)<br/><b>Target Output:</b> <font color='#047857'><b>166 Finished Bottles (30 ML net wt)</b></font>", styles["TableCell"]),
            Paragraph("<b>Lot Number:</b> LOT-FG-2026-10-04<br/><b>Production Line:</b> Cleanroom Cosmetic Lab 02", styles["TableCellRight"])
        ],
        [
            Paragraph("<b>AUTOMATED RAW MATERIAL STOCK DEDUCTION BREAKDOWN (ATOMIC DEDUCTION PREVIEW):</b>", ParagraphStyle("wm_sub", fontName="Helvetica-Bold", fontSize=6.8, leading=8.5, textColor=colors.HexColor("#0F172A"))),
            ""
        ],
        [
            Paragraph("• Deionized Water (RM0001): <font color='#BE123C'><b>-4,540 g (-4.54 kg)</b></font><br/>• Sodium Hyaluronate C (RM0002): <font color='#BE123C'><b>-100 g (-0.10 kg)</b></font>", styles["TableCell"]),
            Paragraph("• Botanical Extracts (Tomato, Witch Hazel, Cucumber): <font color='#BE123C'><b>-150 g (-0.15 kg)</b></font><br/>• Actives (Bust-A, Azelaic Optima, Preservatives): <font color='#BE123C'><b>-210 g (-0.21 kg)</b></font>", styles["TableCell"])
        ],
        [
            Paragraph("<font color='#047857'><b>✓ All 12 raw material balances verified. Stocks sufficient for 5.00 kg batch execution.</b></font>", styles["TableCellBold"]),
            Paragraph("<b>[ ACTION: Convert &gt;&gt; Finished Goods ]</b>", ParagraphStyle("btn_c", fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=colors.white, alignment=TA_CENTER))
        ]"""

if old_wip in code:
    code = code.replace(old_wip, new_wip, 1)

# 3. Page 5 Step 1.3 Finished Goods Masterlist table
old_step_1_3 = """    # Step 1.3 Header
    story.append(create_step_header("1.3", "Finished Goods Stock Handover & Warehouse Registration", "Sidebar > Inventory > Finished Goods", "Inventory Staff", "#D97706", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Finished Goods Handover Protocol:</b><br/>"
        "1. <b>Automatic Registration:</b> Once batch conversion completes, units are instantly posted into <code>Finished Goods</code> with unique finished SKU (e.g. <code>FG-GK-135G</code>), lot number, and FEFO expiry tracking.<br/>"
        "2. <b>Quality Inspection Sign-off:</b> The Inventory QA officer inspects bar hardness, color uniformity, and moisture content. Upon physical approval, status is marked <b>Available for Merchandising</b>.<br/>"
        "3. <b>Handover to Marketing:</b> Marketing personnel receive automated dashboard alerts that fresh finished inventory is stocked and ready for storefront retail merchandising.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 4))"""

new_step_1_3 = """    # Step 1.3 Header
    story.append(create_step_header("1.3", "Finished Goods Stock Handover & Warehouse Masterlist", "Sidebar > Inventory > Finished Goods", "Inventory Staff", "#D97706", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Finished Goods Handover Protocol:</b> Once batch conversion completes, units are instantly posted into <code>Finished Goods</code> with unique finished SKU, lot number, and FEFO expiry tracking. Quality inspection verifies fill volume and packaging seal before releasing stock to Marketing.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 2))

    # ACTUAL FRONTEND TABLE: FINISHED GOODS MASTERLIST (EXACT MATCH WITH INVENTORYFINISHEDGOODS.JSX)
    fg_head_style = ParagraphStyle("fgh_nw", fontName="Helvetica-Bold", fontSize=5.5, leading=7, textColor=colors.white, alignment=TA_CENTER)
    fg_data = [
        [
            Paragraph("<b>CODE</b>", fg_head_style),
            Paragraph("<b>IMAGE</b>", fg_head_style),
            Paragraph("<b>CATEGORY</b>", fg_head_style),
            Paragraph("<b>ITEM&nbsp;NAME</b>", fg_head_style),
            Paragraph("<b>QUANTITY&nbsp;&amp;&nbsp;CONDITION</b>", fg_head_style),
            Paragraph("<b>SPECIFICATION&nbsp;&amp;&nbsp;UOM</b>", fg_head_style),
            Paragraph("<b>REQUIRED&nbsp;INGREDIENTS&nbsp;(5KG&nbsp;STANDARD&nbsp;BATCH)</b>", fg_head_style),
            Paragraph("<b>ACTION</b>", fg_head_style)
        ],
        [
            Paragraph("<b>FG0004</b>", ParagraphStyle("fg_c1", fontName="Helvetica-Bold", fontSize=6.5, leading=8, textColor=colors.HexColor("#0F172A"), alignment=TA_CENTER)),
            Image(SERUM_THUMB_PATH, width=26, height=26) if os.path.exists(SERUM_THUMB_PATH) else Paragraph("SERUM", styles["TableCellCenter"]),
            Paragraph("<b>Skin Care</b>", ParagraphStyle("fg_c3", fontName="Helvetica", fontSize=6, leading=7.5, textColor=colors.HexColor("#0F172A"), alignment=TA_CENTER)),
            Paragraph("<b>SERUM</b><br/><font size='5' color='#475569'>FACE SERUM COLLAGEN</font>", ParagraphStyle("fg_c4", fontName="Helvetica", fontSize=6, leading=7.5, textColor=colors.HexColor("#0F172A"), alignment=TA_CENTER)),
            Paragraph("<b>18 Units</b><br/><font size='5' color='#047857'>● Good Condition</font>", ParagraphStyle("fg_c5", fontName="Helvetica", fontSize=6, leading=7.5, textColor=colors.HexColor("#0F172A"), alignment=TA_CENTER)),
            Paragraph("<b>30 ML</b><br/><font size='5' color='#64748B'>5 kg Batch</font>", ParagraphStyle("fg_c6", fontName="Helvetica", fontSize=6, leading=7.5, textColor=colors.HexColor("#0F172A"), alignment=TA_CENTER)),
            Paragraph("<b>12 Actives (5,000g Batch):</b><br/><font size='4.8' color='#334155'>Water 4540g • Hyaluronate C 100g • Tomato 50g • Witch Hazel 50g • Cucumber 50g • Bust-A 40g • Azelaic 40g • Phenoxy 30g • Benzoate 25g • Sorbate 25g • Pore-MinEx 25g • Scent 25g</font>", ParagraphStyle("fg_c7", fontName="Helvetica", fontSize=5.3, leading=6.8, textColor=colors.HexColor("#334155"))),
            Paragraph("<font color='#047857'><b>[ View BOM ]</b></font><br/><font size='5' color='#1E40AF'><b>[ WIP Log ]</b></font>", ParagraphStyle("fg_c8", fontName="Helvetica-Bold", fontSize=5.5, leading=7, alignment=TA_CENTER))
        ]
    ]
    t_fg = Table(fg_data, colWidths=[40, 36, 48, 68, 75, 64, 147, 45.27])
    t_fg.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#01390F")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_fg)
    story.append(Spacer(1, 3))"""

if old_step_1_3 in code:
    code = code.replace(old_step_1_3, new_step_1_3, 1)

# 4. Page 6 Marketing Product Card
old_p6_card = """    # FRONTEND UI MOCKUP: Marketing Storefront Editor Card (NO OVERLAPS! NO BLACK BOXES!)
    img_cell_content = []
    if os.path.exists(TEMP_PRODUCT_PNG):
        img_cell_content.append(Image(TEMP_PRODUCT_PNG, width=65, height=65))
    img_cell_content.append(Spacer(1, 2))
    img_cell_content.append(Paragraph("<b>Gluta-Kojic Soap (135g)</b>", ParagraphStyle("im_t", fontName="Helvetica-Bold", fontSize=6.5, leading=8, textColor=colors.HexColor("#0F172A"), alignment=TA_CENTER)))
    img_cell_content.append(Paragraph("<font color='#047857'><b>✓ Live Studio Photo Asset</b></font>", ParagraphStyle("im_b", fontName="Helvetica", fontSize=6, leading=7.5, textColor=colors.HexColor("#047857"), alignment=TA_CENTER)))

    form_cell_content = [
        Paragraph("<b>FRONTEND VIEW: MARKETING PRODUCT MERCHANDISING MODAL</b>", ParagraphStyle("fm_h", fontName="Helvetica-Bold", fontSize=7, leading=8.5, textColor=colors.HexColor("#153E97"))),
        Spacer(1, 2),
        Table([
            [Paragraph("<b>Product Name:</b>", styles["TableCellBold"]), Paragraph("Gluta-Kojic Organic Soap (135g)", styles["TableCellBold"])],
            [Paragraph("<b>Selling Price:</b>", styles["TableCellBold"]), Paragraph("<font color='#153E97'><b>PHP 180.00</b></font>", styles["TableCellBold"])],
            [Paragraph("<b>Botanical Benefits:</b>", styles["TableCellBold"]), Paragraph("Handcrafted cold-process soap formulated with raw virgin coconut oil, papaya fruit enzymes, and glutathione for natural radiance.", styles["TableCell"])],
            [Paragraph("<b>Storefront Status:</b>", styles["TableCellBold"]), Paragraph("<font color='#047857'><b>● Published & Visible to Customers</b></font>", styles["TableCellBold"])],
        ], colWidths=[90, 310])
    ]"""

new_p6_card = """    # FRONTEND UI MOCKUP: Marketing Storefront Editor Card (FACE SERUM COLLAGEN - LIVE STUDIO PHOTO)
    img_cell_content = []
    active_serum_img = SERUM_IMAGE_PATH if os.path.exists(SERUM_IMAGE_PATH) else TEMP_PRODUCT_PNG
    if os.path.exists(active_serum_img):
        img_cell_content.append(Image(active_serum_img, width=65, height=65))
    img_cell_content.append(Spacer(1, 2))
    img_cell_content.append(Paragraph("<b>FACE SERUM COLLAGEN</b>", ParagraphStyle("im_t", fontName="Helvetica-Bold", fontSize=6.2, leading=7.5, textColor=colors.HexColor("#0F172A"), alignment=TA_CENTER)))
    img_cell_content.append(Paragraph("<font color='#047857'><b>✓&nbsp;Live&nbsp;Studio&nbsp;Photo&nbsp;Asset</b></font>", ParagraphStyle("im_b", fontName="Helvetica", fontSize=5.8, leading=7, textColor=colors.HexColor("#047857"), alignment=TA_CENTER)))

    form_cell_content = [
        Paragraph("<b>FRONTEND VIEW: MARKETING PRODUCT MERCHANDISING MODAL</b>", ParagraphStyle("fm_h", fontName="Helvetica-Bold", fontSize=7, leading=8.5, textColor=colors.HexColor("#153E97"))),
        Spacer(1, 2),
        Table([
            [Paragraph("<b>Product Name:</b>", styles["TableCellBold"]), Paragraph("FACE SERUM COLLAGEN (30 ML) [SERUM]", styles["TableCellBold"])],
            [Paragraph("<b>Selling Price:</b>", styles["TableCellBold"]), Paragraph("<font color='#153E97'><b>PHP 300.00</b></font> &nbsp;<font size='6' color='#64748B'>(SKU: FG0004 • Skin Care)</font>", styles["TableCellBold"])],
            [Paragraph("<b>Botanical Benefits:</b>", styles["TableCellBold"]), Paragraph("Artisanal collagen serum formulated with active Sodium Hyaluronate, organic Tomato & Cucumber extracts, Witch Hazel, and Azelaic Optima for skin elasticity and luminous glow.", styles["TableCell"])],
            [Paragraph("<b>Storefront Status:</b>", styles["TableCellBold"]), Paragraph("<font color='#047857'><b>● Published &amp; Visible to Customers</b></font>", styles["TableCellBold"])],
        ], colWidths=[90, 310])
    ]"""

if old_p6_card in code:
    code = code.replace(old_p6_card, new_p6_card, 1)

# 5. Page 7 Customer Checkout Card
old_p7_card = """        [
            Paragraph("<b>Purchased Items:</b><br/>2x Gluta-Kojic Organic Soap (135g)<br/><font color='#64748B'>SKU: FG-GK-135G • Unit Price: PHP 180.00</font>", styles["TableCell"]),
            Paragraph("<b>Item Subtotal:</b><br/><font color='#0F172A'><b>PHP 360.00</b></font>", styles["TableCellRight"])
        ],
        [
            Paragraph("<b>Promotional Voucher Applied:</b> <code>NATURAL20</code> (20% Off)", styles["TableCellBold"]),
            Paragraph("<font color='#047857'><b>-PHP 72.00</b></font>", styles["TableCellRight"])
        ],
        [
            Paragraph("<b>Standard Courier Shipping:</b> Cabuyao, Laguna (CALABARZON)", styles["TableCell"]),
            Paragraph("<b>PHP 65.00</b>", styles["TableCellRight"])
        ],
        [
            Paragraph("<b>TOTAL PAYABLE AMOUNT:</b>", ParagraphStyle("t_lbl", fontName="Helvetica-Bold", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#0F172A"))),
            Paragraph("<font color='#153E97'><b>PHP 353.00</b></font>", ParagraphStyle("t_val", fontName="Helvetica-Bold", fontSize=8.5, leading=10.5, textColor=colors.HexColor("#153E97"), alignment=TA_RIGHT))
        ],"""

new_p7_card = """        [
            Paragraph("<b>Purchased Items:</b><br/>1x FACE SERUM COLLAGEN (30 ML) [SERUM]<br/><font color='#64748B'>SKU: FG0004 • Unit Price: PHP 300.00</font>", styles["TableCell"]),
            Paragraph("<b>Item Subtotal:</b><br/><font color='#0F172A'><b>PHP 300.00</b></font>", styles["TableCellRight"])
        ],
        [
            Paragraph("<b>Promotional Voucher Applied:</b> <code>NATURAL20</code> (20% Off)", styles["TableCellBold"]),
            Paragraph("<font color='#047857'><b>-PHP 60.00</b></font>", styles["TableCellRight"])
        ],
        [
            Paragraph("<b>Standard Courier Shipping:</b> Cabuyao, Laguna (CALABARZON)", styles["TableCell"]),
            Paragraph("<b>PHP 65.00</b>", styles["TableCellRight"])
        ],
        [
            Paragraph("<b>TOTAL PAYABLE AMOUNT:</b>", ParagraphStyle("t_lbl", fontName="Helvetica-Bold", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#0F172A"))),
            Paragraph("<font color='#153E97'><b>PHP 305.00</b></font>", ParagraphStyle("t_val", fontName="Helvetica-Bold", fontSize=8.5, leading=10.5, textColor=colors.HexColor("#153E97"), alignment=TA_RIGHT))
        ],"""

if old_p7_card in code:
    code = code.replace(old_p7_card, new_p7_card, 1)

# 6. Page 8 Logistics Waybill
old_p8_waybill = """            Paragraph("<b>PARCEL CONTENTS:</b> 2x Gluta-Kojic Organic Soap (135g) [FG-GK-135G]<br/><b>TOTAL WEIGHT:</b> 0.35 kg • <b>DIMENSIONS:</b> 15cm x 10cm x 5cm", styles["TableCell"]),
            Paragraph("<b>PAYMENT METHOD:</b><br/><font color='#BE123C' size='7.5'><b>COD COLLECT: PHP 353.00</b></font>", styles["TableCellRight"])"""

new_p8_waybill = """            Paragraph("<b>PARCEL CONTENTS:</b> 1x FACE SERUM COLLAGEN (30 ML) [FG0004]<br/><b>TOTAL WEIGHT:</b> 0.15 kg • <b>DIMENSIONS:</b> 12cm x 6cm x 6cm", styles["TableCell"]),
            Paragraph("<b>PAYMENT METHOD:</b><br/><font color='#BE123C' size='7.5'><b>COD COLLECT: PHP 305.00</b></font>", styles["TableCellRight"])"""

if old_p8_waybill in code:
    code = code.replace(old_p8_waybill, new_p8_waybill, 1)

with open("generate_manual_pdf.py", "w", encoding="utf-8") as f:
    f.write(code)

print("Updated generate_manual_pdf.py cleanly!")
