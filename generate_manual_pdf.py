"""
MHIRA Natural Soap & Cosmetics - CRM Operations Manual PDF Generator
====================================================================
Generates the official, publication-quality A4 vector PDF manual.
Includes running headers/footers, vector tables, embedded photo assets,
scannable barcodes, full SOP lifecycle procedures, and PDF bookmarks.
"""

import os
import shutil
import pymupdf
from PIL import Image as PILImage
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
)
from reportlab.pdfgen import canvas

# Workspace paths
WORKSPACE_DIR = r"C:\Users\kentb\OneDrive\Desktop\CRMSYSTEM"
LOGO_PATH = os.path.join(WORKSPACE_DIR, r"frontend\public\mhira_logo.png")
WEBP_PRODUCT_PATH = os.path.join(WORKSPACE_DIR, r"uploads\images-1787841610736.webp")
TEMP_PRODUCT_PNG = os.path.join(WORKSPACE_DIR, r"uploads\product_soap_converted.png")
SERUM_IMAGE_PATH = os.path.join(WORKSPACE_DIR, r"uploads\product_serum.png")
SERUM_THUMB_PATH = os.path.join(WORKSPACE_DIR, r"uploads\product_serum_thumb.png")

# Convert WebP to PNG for ReportLab if needed
if os.path.exists(WEBP_PRODUCT_PATH) and not os.path.exists(TEMP_PRODUCT_PNG):
    try:
        PILImage.open(WEBP_PRODUCT_PATH).save(TEMP_PRODUCT_PNG)
    except Exception as e:
        print("Note on WebP conversion:", e)


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render running headers and footers
    with accurate 'Page X of Y' numbering across all pages, while suppressing on Cover.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress headers & footers on Cover Page

        self.saveState()
        page_w, page_h = 595.27, 841.89  # A4 portrait in points

        # Top Running Header Bar (Brand Navy #153E97)
        self.setFillColor(colors.HexColor("#153E97"))
        self.rect(0, page_h - 26, page_w, 26, fill=1, stroke=0)

        # Header Title
        self.setFillColor(colors.white)
        self.setFont("Helvetica-Bold", 7.5)
        self.drawString(36, page_h - 17, "MHIRA NATURAL SOAP & COSMETICS  •  CRM OPERATIONS MANUAL")

        # Header SOP Reference
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#E2E8F0"))
        self.drawRightString(page_w - 36, page_h - 17, "SOP Ref: MHIRA-SOP-2026-v1.2 | Rev 2.0")

        # Footer Divider Line
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 26, page_w - 36, 26)

        # Footer Left: Confidentiality Notice (clean, non-colliding layout)
        self.setFont("Helvetica-Bold", 6.8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 15, "MHIRA-SOP-2026-v1.2  •  CONFIDENTIAL & PROPRIETARY  •  INTERNAL OPERATIONS ONLY")

        # Footer Right: Page Numbering
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica-Bold", 7)
        self.setFillColor(colors.HexColor("#153E97"))
        self.drawRightString(page_w - 36, 15, page_str)

        self.restoreState()


def get_styles():
    base = getSampleStyleSheet()
    c_primary = colors.HexColor("#153E97")
    c_slate_dark = colors.HexColor("#0F172A")
    c_slate_body = colors.HexColor("#334155")
    c_slate_muted = colors.HexColor("#64748B")
    
    styles = {
        "CoverTitle": ParagraphStyle(
            "CoverTitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=21,
            leading=25,
            textColor=c_primary,
            alignment=TA_CENTER
        ),
        "CoverSubtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13.5,
            textColor=c_slate_body,
            alignment=TA_CENTER
        ),
        "SectionHeader": ParagraphStyle(
            "SectionHeader",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=13.5,
            textColor=c_primary,
            spaceAfter=2
        ),
        "SectionSub": ParagraphStyle(
            "SectionSub",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.8,
            leading=8.5,
            textColor=c_slate_muted,
            textTransform="uppercase",
            spaceAfter=1
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10.5,
            textColor=c_slate_dark,
            spaceBefore=2.5,
            spaceAfter=1.5
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7,
            leading=9.5,
            textColor=c_slate_body
        ),
        "BodyJustify": ParagraphStyle(
            "BodyJustify",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7,
            leading=9.5,
            textColor=c_slate_body,
            alignment=TA_JUSTIFY
        ),
        "BodyBold": ParagraphStyle(
            "BodyBold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7,
            leading=9.5,
            textColor=c_slate_dark
        ),
        "BodySmall": ParagraphStyle(
            "BodySmall",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=6.5,
            leading=8.5,
            textColor=c_slate_muted
        ),
        "TableHead": ParagraphStyle(
            "TableHead",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.5,
            leading=8,
            textColor=colors.white
        ),
        "TableHeadCenter": ParagraphStyle(
            "TableHeadCenter",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.5,
            leading=8,
            textColor=colors.white,
            alignment=TA_CENTER
        ),
        "TableHeadRight": ParagraphStyle(
            "TableHeadRight",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.5,
            leading=8,
            textColor=colors.white,
            alignment=TA_RIGHT
        ),
        "TableCell": ParagraphStyle(
            "TableCell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=6.5,
            leading=8.2,
            textColor=c_slate_body
        ),
        "TableCellBold": ParagraphStyle(
            "TableCellBold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.5,
            leading=8.2,
            textColor=c_slate_dark
        ),
        "TableCellMono": ParagraphStyle(
            "TableCellMono",
            parent=base["Normal"],
            fontName="Courier",
            fontSize=6.5,
            leading=8.2,
            textColor=c_slate_dark
        ),
        "TableCellCenter": ParagraphStyle(
            "TableCellCenter",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=6.5,
            leading=8.2,
            textColor=c_slate_body,
            alignment=TA_CENTER
        ),
        "TableCellRight": ParagraphStyle(
            "TableCellRight",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=6.5,
            leading=8.2,
            textColor=c_slate_body,
            alignment=TA_RIGHT
        ),
        "TOCItem": ParagraphStyle(
            "TOCItem",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=9,
            textColor=c_primary
        ),
        "TOCPage": ParagraphStyle(
            "TOCPage",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=9,
            textColor=c_slate_dark,
            alignment=TA_RIGHT
        ),
        "TOCSub": ParagraphStyle(
            "TOCSub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=6.5,
            leading=8,
            textColor=c_slate_body
        )
    }
    return styles


def create_callout(title, text, theme="info", width=523.27):
    theme_colors = {
        "info": {"bg": "#EFF6FF", "border": "#BFDBFE", "title": "#1E40AF"},
        "success": {"bg": "#ECFDF5", "border": "#A7F3D0", "title": "#065F46"},
        "warning": {"bg": "#FFFBEB", "border": "#FDE68A", "title": "#92400E"},
        "danger": {"bg": "#FFF1F2", "border": "#FECDD3", "title": "#9F1239"},
        "neutral": {"bg": "#F8FAFC", "border": "#CBD5E1", "title": "#334155"},
    }
    tc = theme_colors.get(theme, theme_colors["info"])
    
    title_p = Paragraph(f"<b>{title}</b>", ParagraphStyle(
        "ct", fontName="Helvetica-Bold", fontSize=7, leading=8.5, textColor=colors.HexColor(tc["title"])
    ))
    body_p = Paragraph(text, ParagraphStyle(
        "cb", fontName="Helvetica", fontSize=6.5, leading=8.2, textColor=colors.HexColor("#334155")
    ))
    
    t = Table([[title_p], [body_p]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(tc["bg"])),
        ('BOX', (0,0), (-1,-1), 0.6, colors.HexColor(tc["border"])),
        ('TOPPADDING', (0,0), (-1,0), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,0), 0.5),
        ('TOPPADDING', (0,1), (-1,1), 0),
        ('BOTTOMPADDING', (0,1), (-1,1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    return t


def create_step_header(num_str, title_str, nav_str, role_str, role_color="#153E97", width=523.27):
    num_p = Paragraph(f"<b>{num_str}</b>", ParagraphStyle(
        "s_num", fontName="Helvetica-Bold", fontSize=7.5, leading=9.5, textColor=colors.white, alignment=TA_CENTER
    ))
    title_p = Paragraph(f"<b>{title_str}</b>", ParagraphStyle(
        "s_title", fontName="Helvetica-Bold", fontSize=7.8, leading=9.8, textColor=colors.HexColor("#0F172A")
    ))
    nav_p = Paragraph(f"<b>Navigation:</b> <font color='{role_color}'>{nav_str}</font>", ParagraphStyle(
        "s_nav", fontName="Helvetica", fontSize=6.2, leading=7.8, textColor=colors.HexColor("#64748B")
    ))
    role_p = Paragraph(f"<b>ROLE: {role_str.upper()}</b>", ParagraphStyle(
        "s_role", fontName="Helvetica-Bold", fontSize=5.8, leading=7.2, textColor=colors.HexColor(role_color), alignment=TA_CENTER
    ))

    w_num = 20
    w_role = 85
    w_mid = width - w_num - w_role

    t = Table([
        [num_p, title_p, role_p],
        ["", nav_p, ""]
    ], colWidths=[w_num, w_mid, w_role])

    t.setStyle(TableStyle([
        ('SPAN', (0,0), (0,1)),
        ('SPAN', (2,0), (2,1)),
        ('BACKGROUND', (0,0), (0,1), colors.HexColor(role_color)),
        ('BACKGROUND', (2,0), (2,1), colors.HexColor("#F8FAFC")),
        ('BOX', (2,0), (2,1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,1), 'CENTER'),
        ('ALIGN', (2,0), (2,1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 1.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.2),
        ('LEFTPADDING', (1,0), (1,-1), 4),
        ('RIGHTPADDING', (1,0), (1,-1), 2),
        ('LEFTPADDING', (0,0), (0,1), 1),
        ('RIGHTPADDING', (0,0), (0,1), 1),
        ('LEFTPADDING', (2,0), (2,1), 1),
        ('RIGHTPADDING', (2,0), (2,1), 1),
    ]))
    return t


def build_page_1_cover(story, styles, width=523.27):
    # Top decorative header banner
    banner_data = [[Paragraph("<font color='white'><b>ENTERPRISE STANDARD OPERATING PROCEDURE • OFFICIAL OPERATIONS MANUAL</b></font>", ParagraphStyle(
        "b_txt", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white, alignment=TA_CENTER
    ))]]
    t_banner = Table(banner_data, colWidths=[width])
    t_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#153E97")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_banner)
    story.append(Spacer(1, 20))

    # Official MHIRA Logo (Proportional crisp 130x105)
    if os.path.exists(LOGO_PATH):
        img = Image(LOGO_PATH, width=135, height=108)
        img.hAlign = 'CENTER'
        story.append(img)
    story.append(Spacer(1, 14))

    # Badge: Official Operations Manual
    badge_data = [[Paragraph("<b>OFFICIAL CRM OPERATING MANUAL • CONFIDENTIAL & PROPRIETARY</b>", ParagraphStyle(
        "bg_c", fontName="Helvetica-Bold", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#153E97"), alignment=TA_CENTER
    ))]]
    t_badge = Table(badge_data, colWidths=[315])
    t_badge.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor("#93C5FD")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    t_badge.hAlign = 'CENTER'
    story.append(t_badge)
    story.append(Spacer(1, 10))

    # Document Main Titles
    story.append(Paragraph("MHIRA NATURAL SOAP & COSMETICS", ParagraphStyle(
        "org_t", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=colors.HexColor("#64748B"), alignment=TA_CENTER, textTransform="uppercase"
    )))
    story.append(Spacer(1, 3))
    story.append(Paragraph("CRM OPERATIONS MANUAL", styles["CoverTitle"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Standard Operating Procedures across Inventory WIP Batch Conversion, Catalog Merchandising,<br/>Customer Storefront Checkout, Logistics Thermal Waybills & Admin Governance", styles["CoverSubtitle"]))
    story.append(Spacer(1, 18))

    # Formal Metadata Block
    meta_data = [
        [
            Paragraph("<b>Document Identifier:</b>", styles["TableCellBold"]),
            Paragraph("MHIRA-SOP-2026-v1.2", styles["TableCellMono"]),
            Paragraph("<b>Document Version:</b>", styles["TableCellBold"]),
            Paragraph("Version 2.0 (Redesigned & Consolidated)", styles["TableCell"])
        ],
        [
            Paragraph("<b>Effective Date:</b>", styles["TableCellBold"]),
            Paragraph("October 2026", styles["TableCell"]),
            Paragraph("<b>Security Classification:</b>", styles["TableCellBold"]),
            Paragraph("<font color='#BE123C'><b>Confidential & Proprietary</b></font>", styles["TableCell"])
        ],
        [
            Paragraph("<b>Target Department Scopes:</b>", styles["TableCellBold"]),
            Paragraph("Inventory, Marketing, Logistics, Admin", styles["TableCell"]),
            Paragraph("<b>Primary Custodian:</b>", styles["TableCellBold"]),
            Paragraph("Operations & Systems Administration Desk", styles["TableCell"])
        ],
        [
            Paragraph("<b>Technical Architecture:</b>", styles["TableCellBold"]),
            Paragraph("React 19 SPA • Node / Express • MongoDB", styles["TableCell"]),
            Paragraph("<b>Regulatory Compliance:</b>", styles["TableCellBold"]),
            Paragraph("RA 10173 (Data Privacy Act) • FDA/DTI GMP", styles["TableCell"])
        ]
    ]
    t_meta = Table(meta_data, colWidths=[120, 141.6, 115, 146.6])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.4, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 16))

    # Executive Summary / System Metrics Block
    metrics_data = [
        [
            Paragraph("<b>OPERATIONAL METRICS & SYSTEM PARAMETERS</b>", ParagraphStyle("m_h", fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=colors.HexColor("#153E97"))),
            ""
        ],
        [
            Paragraph("• <b>Closed-Loop Modules:</b> 5 Operational Phases<br/>• <b>Governed Procedures:</b> 15 Standard Procedures<br/>• <b>Active Staff Accounts:</b> 4 Department Roles", styles["TableCell"]),
            Paragraph("• <b>Stock Verification:</b> Closed-Loop FEFO Tracking<br/>• <b>Audit Trail Engine:</b> Immutable Security Logging<br/>• <b>Disaster Recovery:</b> Automated Daily Cloud Backups", styles["TableCell"])
        ]
    ]
    t_metrics = Table(metrics_data, colWidths=[261.6, 261.6])
    t_metrics.setStyle(TableStyle([
        ('SPAN', (0,0), (1,0)),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 0.6, colors.HexColor("#BFDBFE")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_metrics)
    story.append(Spacer(1, 14))

    # Legal Mandate & Authorization Box
    statement_text = (
        "<b>LEGAL & AUDIT COMPLIANCE NOTICE:</b> This operations manual establishes mandatory operating procedures for the "
        "MHIRA Enterprise CRM. All handovers—from inbound raw botanical delivery receiving through automated recipe batch deductions, "
        "catalog merchandising, customer checkout, thermal courier waybill printing, and database backups—must adhere to these documented "
        "standards. Unauthorized reproduction or dissemination outside authorized MHIRA staff is strictly prohibited under Philippine Republic Act No. 10173."
    )
    story.append(create_callout("EXECUTIVE MANDATE & AUDIT ADHERENCE", statement_text, theme="neutral", width=width))
    story.append(Spacer(1, 12))

    # Sign-off placeholder row
    sign_data = [
        [
            Paragraph("<b>Document Custodian:</b> Kent Bundalian<br/><font color='#64748B'>Operations & Systems Lead</font>", styles["BodySmall"]),
            Paragraph("<b>QA Approval:</b> Quality Assurance Desk<br/><font color='#64748B'>GMP & Formulation Verification</font>", styles["BodySmall"]),
            Paragraph("<b>Executive Sign-off:</b> Executive Desk<br/><font color='#64748B'>MHIRA Natural Soap & Cosmetics</font>", styles["BodySmall"]),
        ]
    ]
    t_sign = Table(sign_data, colWidths=[174.4, 174.4, 174.4])
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_sign)


def build_page_2_doc_control(story, styles, width=523.27):
    story.append(Paragraph("SECTION 0.0 • DOCUMENT CONTROL & SITEMAP", styles["SectionSub"]))
    story.append(Paragraph("Document Control, Revision History & Table of Contents", styles["SectionHeader"]))
    story.append(Paragraph(
        "This section documents formal document revision history, department approvals, an indexed directory of procedures, and standardized conventions.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # 1. Document Revision Table
    story.append(Paragraph("<b>0.1 Document Revision & Change Governance</b>", styles["H2"]))
    rev_data = [
        [
            Paragraph("<b>Rev</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Effective Date</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Author / Custodian</b>", styles["TableHead"]),
            Paragraph("<b>Summary of Operational Changes & Milestone</b>", styles["TableHead"]),
            Paragraph("<b>Status</b>", styles["TableHeadCenter"])
        ],
        [
            Paragraph("v1.0", styles["TableCellCenter"]),
            Paragraph("Jan 15, 2026", styles["TableCellCenter"]),
            Paragraph("Systems Team", styles["TableCell"]),
            Paragraph("Initial CRM deployment, basic inventory tracking & supplier directory.", styles["TableCell"]),
            Paragraph("Superseded", styles["TableCellCenter"])
        ],
        [
            Paragraph("v1.1", styles["TableCellCenter"]),
            Paragraph("Jun 20, 2026", styles["TableCellCenter"]),
            Paragraph("Marketing / Ops", styles["TableCell"]),
            Paragraph("Integrated storefront promotions, coupons engine, and loyalty reward tiers.", styles["TableCell"]),
            Paragraph("Superseded", styles["TableCellCenter"])
        ],
        [
            Paragraph("v1.2", styles["TableCellCenter"]),
            Paragraph("Oct 10, 2026", styles["TableCellCenter"]),
            Paragraph("Operations Desk", styles["TableCell"]),
            Paragraph("Implemented automated FEFO expiry monitoring & WIP recipe conversion logic.", styles["TableCell"]),
            Paragraph("Superseded", styles["TableCellCenter"])
        ],
        [
            Paragraph("v2.0", styles["TableCellCenter"]),
            Paragraph("Oct 27, 2026", styles["TableCellCenter"]),
            Paragraph("Kent Bundalian / Ops", styles["TableCell"]),
            Paragraph("Comprehensive document redesign, vector tables, end-to-end SOP checklists, error diagnostics, and administrative governance.", styles["TableCell"]),
            Paragraph("<font color='#047857'><b>Official Active</b></font>", styles["TableCellCenter"])
        ]
    ]
    t_rev = Table(rev_data, colWidths=[28, 62, 85, 283.27, 65])
    t_rev.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_rev)
    story.append(Spacer(1, 4))

    # 2. Table of Contents
    story.append(Paragraph("<b>0.2 Table of Contents & Operations Directory</b>", styles["H2"]))
    toc_data = [
        [
            Paragraph("<b>Section / Module Name</b>", styles["TableHead"]),
            Paragraph("<b>Operational Scope & Key SOP Inclusions</b>", styles["TableHead"]),
            Paragraph("<b>Target Role</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Page</b>", styles["TableHeadRight"])
        ],
        [
            Paragraph("<b>Section 1.0</b> Executive System Overview", styles["TOCItem"]),
            Paragraph("Closed-loop operational lifecycle, system architecture & RBAC permission matrix", styles["TOCSub"]),
            Paragraph("All Scopes", styles["TableCellCenter"]),
            Paragraph("Page 3", styles["TOCPage"])
        ],
        [
            Paragraph("<b>Section 2.0</b> Phase 1: Inventory & Production (Part 1)", styles["TOCItem"]),
            Paragraph("Inbound delivery receiving, supplier manifest logging, FEFO lot tracking", styles["TOCSub"]),
            Paragraph("Inventory", styles["TableCellCenter"]),
            Paragraph("Page 4", styles["TOCPage"])
        ],
        [
            Paragraph("<b>Section 2.1</b> Phase 1: Inventory Management (Part 2)", styles["TOCItem"]),
            Paragraph("WIP batch recipe conversion, auto raw material deduction, finished goods handover, expiry audits", styles["TOCSub"]),
            Paragraph("Inventory", styles["TableCellCenter"]),
            Paragraph("Page 5", styles["TOCPage"])
        ],
        [
            Paragraph("<b>Section 3.0</b> Phase 2: Marketing Merchandising", styles["TOCItem"]),
            Paragraph("Products catalog publishing, botanical copy, photo assets, promo vouchers & reviews", styles["TOCSub"]),
            Paragraph("Marketing", styles["TableCellCenter"]),
            Paragraph("Page 6", styles["TOCPage"])
        ],
        [
            Paragraph("<b>Section 4.0</b> Phase 3: Customer Storefront Experience", styles["TOCItem"]),
            Paragraph("Storefront navigation, shopping cart, coupon application, address checkout & loyalty tiers", styles["TOCSub"]),
            Paragraph("Customer / Sales", styles["TableCellCenter"]),
            Paragraph("Page 7", styles["TOCPage"])
        ],
        [
            Paragraph("<b>Section 5.0</b> Phase 4: Logistics Fulfillment & Dispatch", styles["TOCItem"]),
            Paragraph("Order confirmation desk, COD validation, thermal courier waybills, dispatch & returns", styles["TOCSub"]),
            Paragraph("Logistics", styles["TableCellCenter"]),
            Paragraph("Page 8", styles["TOCPage"])
        ],
        [
            Paragraph("<b>Section 6.0</b> Phase 5: Administration & Governance", styles["TOCItem"]),
            Paragraph("Appearance themes, staff account management, security audit logs, maintenance mode & backups", styles["TOCSub"]),
            Paragraph("Administrator", styles["TableCellCenter"]),
            Paragraph("Page 9", styles["TOCPage"])
        ],
        [
            Paragraph("<b>Section 7.0</b> Troubleshooting & Diagnostics Matrix", styles["TOCItem"]),
            Paragraph("SOP error resolution: stock discrepancy, waybill barcode scanning, backup timeouts", styles["TOCSub"]),
            Paragraph("All Scopes", styles["TableCellCenter"]),
            Paragraph("Page 10", styles["TOCPage"])
        ],
        [
            Paragraph("<b>Section 8.0</b> Operational FAQs & Compliance Sign-off", styles["TOCItem"]),
            Paragraph("Operational FAQs, daily verification checklist & formal multi-department sign-off authorization", styles["TOCSub"]),
            Paragraph("Operations / QA", styles["TableCellCenter"]),
            Paragraph("Page 11", styles["TOCPage"])
        ]
    ]
    t_toc = Table(toc_data, colWidths=[150, 248.27, 80, 45])
    t_toc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_toc)
    story.append(Spacer(1, 4))

    # 3. Document Conventions Block
    conventions_text = (
        "<b>DOCUMENT CONVENTIONS & ROLE TAXONOMY:</b> Bold text indicates mandatory actions or verified UI buttons. "
        "Breadcrumbs (e.g. <code>Sidebar &gt; Inventory &gt; Work in Progress</code>) specify exact navigation paths. "
        "Department roles are color-coded: <font color='#D97706'><b>Amber (Inventory)</b></font>, "
        "<font color='#7C3AED'><b>Purple (Marketing)</b></font>, <font color='#059669'><b>Emerald (Customer)</b></font>, "
        "<font color='#1D4ED8'><b>Blue (Logistics)</b></font>, and <font color='#BE123C'><b>Rose (Admin Governance)</b></font>."
    )
    story.append(create_callout("STANDARD DOCUMENT CONVENTIONS & ROLE TAXONOMY", conventions_text, theme="info", width=width))


def build_page_3_overview(story, styles, width=523.27):
    story.append(Paragraph("SECTION 1.0 • EXECUTIVE SYSTEM OVERVIEW & LIFECYCLE", styles["SectionSub"]))
    story.append(Paragraph("System Architecture & The Closed-Loop Operational Lifecycle", styles["SectionHeader"]))
    story.append(Paragraph(
        "The MHIRA Enterprise CRM operates on a sequential, closed-loop operational paradigm. Data recorded in one department "
        "automatically populates downstream operational desks, eliminating manual data re-entry, stock discrepancies, and order delays.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # 1.1 5-Phase Lifecycle Visual Table
    story.append(Paragraph("<b>1.1 The 5-Phase Operational Lifecycle Flow</b>", styles["H2"]))
    flow_data = [
        [
            Paragraph("<b>Phase 1: Inventory</b>", ParagraphStyle("h_inv", fontName="Helvetica-Bold", fontSize=6.8, leading=8.5, textColor=colors.HexColor("#92400E"), alignment=TA_CENTER)),
            Paragraph("<b>Phase 2: Marketing</b>", ParagraphStyle("h_mkt", fontName="Helvetica-Bold", fontSize=6.8, leading=8.5, textColor=colors.HexColor("#6D28D9"), alignment=TA_CENTER)),
            Paragraph("<b>Phase 3: Customer</b>", ParagraphStyle("h_cst", fontName="Helvetica-Bold", fontSize=6.8, leading=8.5, textColor=colors.HexColor("#065F46"), alignment=TA_CENTER)),
            Paragraph("<b>Phase 4: Logistics</b>", ParagraphStyle("h_log", fontName="Helvetica-Bold", fontSize=6.8, leading=8.5, textColor=colors.HexColor("#1E40AF"), alignment=TA_CENTER)),
            Paragraph("<b>Phase 5: Admin</b>", ParagraphStyle("h_adm", fontName="Helvetica-Bold", fontSize=6.8, leading=8.5, textColor=colors.HexColor("#9F1239"), alignment=TA_CENTER)),
        ],
        [
            Paragraph("<b>Production & Conversion</b><br/>Receives raw materials, logs FEFO lots, executes batch recipes with automated raw material deduction into Finished Goods.", styles["TableCell"]),
            Paragraph("<b>Catalog Merchandising</b><br/>Assigns retail pricing, uploads studio photos, crafts botanical descriptions, sets promo coupons, and publishes to storefront.", styles["TableCell"]),
            Paragraph("<b>Storefront Ordering</b><br/>Customer explores live catalog, reviews benefits, applies promo vouchers, and checks out with validated delivery address.", styles["TableCell"]),
            Paragraph("<b>Order Confirmation</b><br/>Logistics validates orders & COD, calculates courier shipping rates, prints thermal waybills, and oversees courier dispatch.", styles["TableCell"]),
            Paragraph("<b>Governance & Audit</b><br/>Manages staff credentials, oversees RBAC access scopes, monitors immutable audit logs, and runs cloud disaster backups.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Output:</b> Stocked Finished Goods", ParagraphStyle("o1", fontName="Helvetica-Bold", fontSize=6.2, leading=7.8, textColor=colors.HexColor("#92400E"))),
            Paragraph("<b>Output:</b> Live Storefront Catalog", ParagraphStyle("o2", fontName="Helvetica-Bold", fontSize=6.2, leading=7.8, textColor=colors.HexColor("#6D28D9"))),
            Paragraph("<b>Output:</b> Confirmed Placed Order", ParagraphStyle("o3", fontName="Helvetica-Bold", fontSize=6.2, leading=7.8, textColor=colors.HexColor("#065F46"))),
            Paragraph("<b>Output:</b> Delivered Parcel & Proof", ParagraphStyle("o4", fontName="Helvetica-Bold", fontSize=6.2, leading=7.8, textColor=colors.HexColor("#1E40AF"))),
            Paragraph("<b>Output:</b> Secure Audit & Backups", ParagraphStyle("o5", fontName="Helvetica-Bold", fontSize=6.2, leading=7.8, textColor=colors.HexColor("#9F1239"))),
        ]
    ]
    t_flow = Table(flow_data, colWidths=[104.65, 104.65, 104.65, 104.65, 104.65])
    t_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#FFFBEB")),
        ('BACKGROUND', (1,0), (1,-1), colors.HexColor("#F5F3FF")),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor("#ECFDF5")),
        ('BACKGROUND', (3,0), (3,-1), colors.HexColor("#EFF6FF")),
        ('BACKGROUND', (4,0), (4,-1), colors.HexColor("#FFF1F2")),
        ('BOX', (0,0), (0,-1), 0.6, colors.HexColor("#FDE68A")),
        ('BOX', (1,0), (1,-1), 0.6, colors.HexColor("#DDD6FE")),
        ('BOX', (2,0), (2,-1), 0.6, colors.HexColor("#A7F3D0")),
        ('BOX', (3,0), (3,-1), 0.6, colors.HexColor("#BFDBFE")),
        ('BOX', (4,0), (4,-1), 0.6, colors.HexColor("#FECDD3")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_flow)
    story.append(Spacer(1, 4))

    # 1.2 RBAC Role Matrix Table
    story.append(Paragraph("<b>1.2 Role-Based Access Control (RBAC) Permissions Matrix</b>", styles["H2"]))
    rbac_data = [
        [
            Paragraph("<b>Functional Module</b>", styles["TableHead"]),
            Paragraph("<b>Admin Role</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Inventory Role</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Marketing Role</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Logistics Role</b>", styles["TableHeadCenter"])
        ],
        [
            Paragraph("Raw Materials & Delivery Receiving", styles["TableCellBold"]),
            Paragraph("View Only", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Full Manage</b></font>", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"])
        ],
        [
            Paragraph("Work-in-Progress (WIP) Conversion", styles["TableCellBold"]),
            Paragraph("Audit Only", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Full Manage</b></font>", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"])
        ],
        [
            Paragraph("Finished Goods Stock Records", styles["TableCellBold"]),
            Paragraph("View Only", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Full Manage</b></font>", styles["TableCellCenter"]),
            Paragraph("View Only", styles["TableCellCenter"]),
            Paragraph("View Only", styles["TableCellCenter"])
        ],
        [
            Paragraph("Products Catalog & Store Merchandising", styles["TableCellBold"]),
            Paragraph("Audit Only", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Full Manage</b></font>", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"])
        ],
        [
            Paragraph("Promo Vouchers, Content & Reviews", styles["TableCellBold"]),
            Paragraph("Audit Only", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Full Manage</b></font>", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"])
        ],
        [
            Paragraph("Order Confirmation Desk & Dispatch", styles["TableCellBold"]),
            Paragraph("Audit Only", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Full Manage</b></font>", styles["TableCellCenter"])
        ],
        [
            Paragraph("Customer Support & Returns Management", styles["TableCellBold"]),
            Paragraph("Audit Only", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Full Manage</b></font>", styles["TableCellCenter"])
        ],
        [
            Paragraph("User Governance, System Maintenance & Backups", styles["TableCellBold"]),
            Paragraph("<font color='#047857'><b>Full Control</b></font>", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"]),
            Paragraph("No Access", styles["TableCellCenter"])
        ]
    ]
    t_rbac = Table(rbac_data, colWidths=[183.27, 85, 85, 85, 85])
    t_rbac.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 1.6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.6),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_rbac)
    story.append(Spacer(1, 4))

    # 1.3 System Navigation Hierarchy & Session Policy
    story.append(Paragraph("<b>1.3 Navigation Hierarchy & Authentication Security</b>", styles["H2"]))
    nav_text = (
        "<b>SIDEBAR NAVIGATION STRUCTURE:</b> Menu options are strictly role-filtered into four tiers: "
        "<b>Dashboard</b> (KPI operational snapshot), <b>Records</b> (primary data directories), <b>Process</b> (active execution workflows), "
        "and <b>Settings</b> (department reports and configuration). Staff only see authorized modules for their role.<br/>"
        "<b>AUTHENTICATION & RA 10173 COMPLIANCE:</b> User logins issue cryptographically signed JSON Web Tokens (JWT) stored in secure cookies. "
        "Sessions auto-expire after 8 hours of inactivity. Customer personal identifying data (PII) is masked in logs and restricted strictly to logistics."
    )
    story.append(create_callout("PLATFORM SPECIFICATIONS & RA 10173 COMPLIANCE", nav_text, theme="warning", width=width))


def build_page_4_inventory_1(story, styles, width=523.27):
    story.append(Paragraph("PHASE 01 • INVENTORY & PRODUCTION MANAGEMENT (PART 1)", styles["SectionSub"]))
    story.append(Paragraph("Raw Materials Inbound Receiving & FEFO Lot Management", styles["SectionHeader"]))
    story.append(Paragraph(
        "The Inventory module governs the raw material lifecycle—from physical supplier delivery receiving through First-Expired, "
        "First-Out (FEFO) batch logging and stock acceptance.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # Step 1.1 Header
    story.append(create_step_header("1.1", "Inbound Raw Materials Stock-In & Supplier Receiving", "Sidebar > Inventory > Delivery Receiving", "Inventory Staff", "#D97706", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Step-by-Step SOP Protocol:</b><br/>"
        "1. <b>Physical Receiving & Inspection:</b> Inspect incoming delivery shipments against the supplier Purchase Order (PO). Verify physical seals, package integrity, and attached Certificates of Analysis (CoA).<br/>"
        "2. <b>Manifest Logging:</b> Open <code>Delivery Receiving</code> and log the supplier name, PO number, internal item code, and carrier delivery receipt (DR).<br/>"
        "3. <b>FEFO Lot & Expiry Registration:</b> Record the manufacturer batch lot code and strict expiration date. The CRM automatically prioritizes earlier-expiring lots during production conversions.<br/>"
        "4. <b>Stock Acceptance:</b> Verify received weight (kg) against invoice. Click <b>Confirm Stock-In</b> to automatically increment warehouse inventory balances and generate receiving manifests.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # ACTUAL FULL FRONTEND TABLE: Delivery Receiving Manifest
    manifest_head = [
        [
            Paragraph("<b>Item Code</b>", styles["TableHead"]),
            Paragraph("<b>Raw Material Description & Botanical Grade</b>", styles["TableHead"]),
            Paragraph("<b>Batch Lot No.</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Inbound Qty</b>", styles["TableHeadRight"]),
            Paragraph("<b>FEFO Expiry Date</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Status</b>", styles["TableHeadCenter"])
        ]
    ]
    manifest_rows = [
        [
            Paragraph("RM0027", styles["TableCellMono"]),
            Paragraph("<b>Pure Virgin Coconut Oil</b><br/><font color='#64748B'>Cold-Pressed Botanical Grade (100% Organic)</font>", styles["TableCell"]),
            Paragraph("LOT-CO-2026-04", styles["TableCellMono"]),
            Paragraph("<b>+150.00 kg</b>", styles["TableCellRight"]),
            Paragraph("October 15, 2028", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Received</b></font>", styles["TableCellCenter"])
        ],
        [
            Paragraph("RM0034", styles["TableCellMono"]),
            Paragraph("<b>Sodium Hydroxide (Lye)</b><br/><font color='#64748B'>Technical Grade 99% Saponifier Pellets</font>", styles["TableCell"]),
            Paragraph("LOT-LYE-2026-02", styles["TableCellMono"]),
            Paragraph("<b>+50.00 kg</b>", styles["TableCellRight"]),
            Paragraph("May 20, 2029", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Received</b></font>", styles["TableCellCenter"])
        ],
        [
            Paragraph("RM0036", styles["TableCellMono"]),
            Paragraph("<b>Pure Kojic Dipalmitate</b><br/><font color='#64748B'>Skin Brightening Active Powder (Pharmaceutical)</font>", styles["TableCell"]),
            Paragraph("LOT-KOJIC-2026-01", styles["TableCellMono"]),
            Paragraph("<b>+25.00 kg</b>", styles["TableCellRight"]),
            Paragraph("December 10, 2027", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Received</b></font>", styles["TableCellCenter"])
        ],
        [
            Paragraph("RM0024", styles["TableCellMono"]),
            Paragraph("<b>Papaya Fruit Enzyme Extract</b><br/><font color='#64748B'>Cold-Extracted Bio-Active Exfoliant Liquid</font>", styles["TableCell"]),
            Paragraph("LOT-PAP-2026-03", styles["TableCellMono"]),
            Paragraph("<b>+30.00 kg</b>", styles["TableCellRight"]),
            Paragraph("September 04, 2027", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Received</b></font>", styles["TableCellCenter"])
        ]
    ]
    t_manifest = Table(manifest_head + manifest_rows, colWidths=[55, 178.27, 85, 65, 80, 60])
    t_manifest.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_manifest)
    story.append(Spacer(1, 4))

    # Step 1.2 Header
    story.append(create_step_header("1.2", "Work-in-Progress (WIP) Batch Conversion & Recipe Auto-Deduction", "Sidebar > Inventory > Work in Progress (WIP)", "Inventory Staff", "#D97706", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Technical Conversion Protocol:</b><br/>"
        "1. <b>Formulation Selection:</b> In the WIP dashboard, select the target product recipe (e.g. <em>Gluta Kojic Soap Formula</em>). The system automatically retrieves verified master ingredient ratios.<br/>"
        "2. <b>Batch Sizing:</b> Input the target output quantity (e.g. 100 Finished Bars @ 135g). The engine computes exact raw material consumption weights.<br/>"
        "3. <b>Automated Raw Material Stock Deduction:</b> Upon clicking <b>Convert &gt;&gt; Finished Goods</b>, the system executes atomic database transactions: raw material inventories are decremented, and finished goods are incremented simultaneously with complete audit trails.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    fefo_note = (
        "<b>FEFO ALLOCATION ALGORITHM:</b> The CRM strictly enforces First-Expired, First-Out picking logic. If an inventory officer "
        "attempts to convert a newer lot while an older unexpired lot exists in warehouse stock, the system generates a priority prompt. "
        "Raw materials expiring within 30 days are automatically placed in Quarantine and blocked from production batches."
    )
    story.append(create_callout("CRITICAL QUALITY ASSURANCE & FEFO ALLOCATION MANDATE", fefo_note, theme="warning", width=width))


def build_page_5_inventory_2(story, styles, width=523.27):
    story.append(Paragraph("PHASE 01 • INVENTORY & PRODUCTION MANAGEMENT (PART 2)", styles["SectionSub"]))
    story.append(Paragraph("WIP Conversion Engine & Finished Goods Handover", styles["SectionHeader"]))
    story.append(Paragraph(
        "This section illustrates the actual Batch Conversion Modal UI, automated raw material deduction preview, finished goods warehouse handover, and auxiliary inventory protocols.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # FRONTEND UI MOCKUP: WIP BATCH CONVERSION MODAL
    wip_modal_data = [
        [
            Paragraph("<b>FRONTEND VIEW: BATCH PRODUCTION & CONVERSION ENGINE</b>", ParagraphStyle("wm_t", fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=colors.HexColor("#153E97"))),
            Paragraph("<b>AUTO-DEDUCTION ENGINE</b>", ParagraphStyle("wm_b", fontName="Helvetica-Bold", fontSize=6.5, leading=8, textColor=colors.HexColor("#D97706"), alignment=TA_RIGHT))
        ],
        [
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
        ]
    ]
    t_wip_card = Table(wip_modal_data, colWidths=[313.27, 210])
    t_wip_card.setStyle(TableStyle([
        ('SPAN', (0,2), (1,2)),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EFF6FF")),
        ('BACKGROUND', (1,4), (1,4), colors.HexColor("#153E97")),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor("#93C5FD")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_wip_card)
    story.append(Spacer(1, 4))

    # Step 1.3 Header
    story.append(create_step_header("1.3", "Finished Goods Stock Handover & Warehouse Masterlist", "Sidebar > Inventory > Finished Goods", "Inventory Staff", "#D97706", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Finished Goods Handover Protocol:</b> Once batch conversion completes, units are instantly posted into <code>Finished Goods</code> with unique finished SKU, lot number, and FEFO expiry tracking. Quality inspection verifies fill volume and packaging seal before releasing stock to Marketing.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 2))

    # ACTUAL FRONTEND TABLE: FINISHED GOODS MASTERLIST (EXACT MATCH WITH INVENTORYFINISHEDGOODS.JSX)
    fg_head_style = ParagraphStyle("fgh_nw", fontName="Helvetica-Bold", fontSize=5.0, leading=6.2, textColor=colors.white, alignment=TA_CENTER)
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
    t_fg = Table(fg_data, colWidths=[38, 32, 46, 68, 72, 75, 147, 45.27])
    t_fg.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#01390F")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 1.5),
        ('RIGHTPADDING', (0,0), (-1,-1), 1.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_fg)
    story.append(Spacer(1, 3))

    # Auxiliary Inventory Workflows
    story.append(Paragraph("<b>1.4 Auxiliary Inventory SOPs: Expiry Audits & Purchase Requests</b>", styles["H2"]))
    aux_data = [
        [
            Paragraph("<b>SOP Procedure</b>", styles["TableHead"]),
            Paragraph("<b>System Navigation Path</b>", styles["TableHead"]),
            Paragraph("<b>Trigger & Operational Protocol</b>", styles["TableHead"])
        ],
        [
            Paragraph("<b>SOP 1.4: FEFO Expiry Audits</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Inventory &gt; Expiry Monitoring", styles["TableCellMono"]),
            Paragraph("Routine automated scan for ingredients reaching 90-day (Warning) and 30-day (Quarantine) thresholds. Quarantined stock requires physical segregation and QA sign-off.", styles["TableCell"])
        ],
        [
            Paragraph("<b>SOP 1.5: Purchase Request</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Inventory &gt; Purchase Request", styles["TableCellMono"]),
            Paragraph("Triggered automatically when raw material balances fall below Safety Stock thresholds. Generates requisition tickets for management procurement approval.", styles["TableCell"])
        ],
        [
            Paragraph("<b>SOP 1.6: Supplier Evaluation</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Inventory &gt; Suppliers", styles["TableCellMono"]),
            Paragraph("Maintains audited supplier registry, contact personnel, payment terms, and delivery lead times to ensure zero supply-chain downtime.", styles["TableCell"])
        ]
    ]
    t_aux = Table(aux_data, colWidths=[120, 150, 253.27])
    t_aux.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_aux)
    story.append(Spacer(1, 4))

    handover_box = (
        "<b>CLOSED-LOOP HANDOVER VERIFICATION:</b> Finished goods stock levels strictly govern storefront purchasing limits. "
        "Marketing cannot publish storefront stock beyond physical Finished Goods counts, guaranteeing zero overselling."
    )
    story.append(create_callout("INTER-DEPARTMENTAL HANDOVER GATEWAY (INVENTORY -> MARKETING)", handover_box, theme="success", width=width))


def build_page_6_marketing(story, styles, width=523.27):
    story.append(Paragraph("PHASE 02 • MARKETING MANAGEMENT & MERCHANDISING", styles["SectionSub"]))
    story.append(Paragraph("Product Merchandising, Storefront Publishing & Campaigns", styles["SectionHeader"]))
    story.append(Paragraph(
        "The Marketing department bridges production with customer demand. Merchandisers configure retail prices, upload professional photo assets, craft botanical benefit descriptions, and configure promo campaigns.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # Step 2.1 Header
    story.append(create_step_header("2.1", "Storefront Product Merchandising: Pricing, Imagery & Copy", "Sidebar > Marketing > Products Catalog", "Marketing Staff", "#7C3AED", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Merchandising Protocol:</b><br/>"
        "1. <b>Product Selection:</b> Select stocked Finished Goods from the catalog table.<br/>"
        "2. <b>Retail Pricing:</b> Input unit selling price in Philippine Pesos (PHP). Base price must comply with executive margin guidelines.<br/>"
        "3. <b>Botanical Descriptions:</b> Write FDA-compliant botanical ingredient copy highlighting organic cold-process benefits.<br/>"
        "4. <b>Studio Photography:</b> Upload high-resolution studio photo assets (aspect ratio 1:1, max 2MB, WebP/PNG).<br/>"
        "5. <b>Publishing Toggle:</b> Switch status to <b>Published</b> to push the item to the live storefront collection.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # FRONTEND UI MOCKUP: Marketing Storefront Editor Card (FACE SERUM COLLAGEN - LIVE STUDIO PHOTO)
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
    ]

    t_mkt_card = Table([[img_cell_content, form_cell_content]], colWidths=[105, 418.27])
    t_mkt_card.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor("#DDD6FE")),
        ('INNERGRID', (0,0), (-1,-1), 0.4, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_mkt_card)
    story.append(Spacer(1, 4))

    # Step 2.2 Header
    story.append(create_step_header("2.2", "Marketing Campaign Suite: Coupons, Feedback, Content & Events", "Sidebar > Marketing > Campaign Suite", "Marketing Staff", "#7C3AED", width))
    story.append(Spacer(1, 2))

    camp_data = [
        [
            Paragraph("<b>Campaign Module</b>", styles["TableHead"]),
            Paragraph("<b>System Navigation Path</b>", styles["TableHead"]),
            Paragraph("<b>Marketing Procedure & Governance Rules</b>", styles["TableHead"])
        ],
        [
            Paragraph("<b>Products Vouchers</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Marketing &gt; Products Vouchers", styles["TableCellMono"]),
            Paragraph("Generate promo codes (e.g. <code>NATURAL20</code> for 20% off). Configure minimum spend criteria (PHP 300), total redemption limits, and active date windows.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Customer Feedback</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Marketing &gt; Customer Feedback", styles["TableCellMono"]),
            Paragraph("Audit verified purchaser reviews and star ratings. Approve legitimate testimonials for storefront publication; flag suspicious reviews for moderation.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Marketing Content</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Marketing &gt; Marketing Content", styles["TableCellMono"]),
            Paragraph("Maintain homepage hero carousels, seasonal promotional banners, and educational botanical skincare guidance articles.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Events Management</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Marketing &gt; Events Management", styles["TableCellMono"]),
            Paragraph("Publish event schedules for organic trade exhibitions, wellness pop-up bazaars, and seasonal holiday promotions.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Our Story & Heritage</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Marketing &gt; Our Story Management", styles["TableCellMono"]),
            Paragraph("Maintain brand heritage biography, DTI / FDA manufacturing certifications, and corporate values for public storefront display.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Products Promotions</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Marketing &gt; Products Promotions", styles["TableCellMono"]),
            Paragraph("Configure bundled promotional packages (e.g. soap & herbal tea gift boxes) with specialized bundle pricing rules.", styles["TableCell"])
        ]
    ]
    t_camp = Table(camp_data, colWidths=[110, 155, 258.27])
    t_camp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 1.8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.8),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_camp)


def build_page_7_customer(story, styles, width=523.27):
    story.append(Paragraph("PHASE 03 • CUSTOMER STOREFRONT EXPERIENCE", styles["SectionSub"]))
    story.append(Paragraph("Browsing, Checkout Drawer & Customer Loyalty Tiers", styles["SectionHeader"]))
    story.append(Paragraph(
        "The customer storefront is the public e-commerce gateway. Customers discover handcrafted products, validate promotional "
        "coupons, select verified shipping addresses, and checkout using diverse payment channels.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # Step 3.1 & 3.2 Header
    story.append(create_step_header("3.1 - 3.2", "Storefront Exploration, Cart Checkout & Voucher Discount", "Public URL /collection and /checkout", "Customer / Shopper", "#059669", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Customer Checkout Flow:</b><br/>"
        "1. <b>Catalog Exploration:</b> Shoppers browse <code>/collection</code>, filter by botanical category, and view ingredient transparency.<br/>"
        "2. <b>Cart Drawer:</b> Items are added to the slide-over cart drawer with real-time stock availability verification.<br/>"
        "3. <b>Voucher Code Application:</b> Customers apply promo codes (e.g. <code>NATURAL20</code>). The cart engine immediately validates minimum spend rules and subtracts the exact discount.<br/>"
        "4. <b>Philippine Address Validation & Shipping:</b> Customer selects Region, Province, City/Municipality, and Barangay. Shipping rates compute automatically based on parcel weight and delivery destination.<br/>"
        "5. <b>Payment Options:</b> Shopper chooses <b>Cash on Delivery (COD)</b>, <b>GCash</b>, <b>Maya</b>, or Credit/Debit Card. Clicking <b>Place Order</b> generates order record in status <code>Order Placed</code>.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # FRONTEND UI MOCKUP: Customer Checkout Drawer Card (NO JAMMED LABELS!)
    drawer_data = [
        [
            Paragraph("<b>FRONTEND VIEW: CUSTOMER CHECKOUT DRAWER & ORDER SUMMARY</b>", ParagraphStyle("cd_h", fontName="Helvetica-Bold", fontSize=7, leading=8.5, textColor=colors.HexColor("#153E97"))),
            Paragraph("<b>STATUS: ORDER PLACED</b>", ParagraphStyle("cd_s", fontName="Helvetica-Bold", fontSize=6.5, leading=8, textColor=colors.HexColor("#D97706"), alignment=TA_RIGHT))
        ],
        [
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
        ],
        [
            Paragraph("<b>Selected Payment Method:</b> Cash on Delivery (COD Collect)", styles["TableCell"]),
            Paragraph("<font color='#047857'><b>✓ Awaiting Logistics Confirmation</b></font>", styles["TableCellRight"])
        ]
    ]
    t_drawer = Table(drawer_data, colWidths=[353.27, 170])
    t_drawer.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#ECFDF5")),
        ('BACKGROUND', (0,4), (-1,4), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor("#A7F3D0")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 2.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.2),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_drawer)
    story.append(Spacer(1, 4))

    # Step 3.3 Header
    story.append(create_step_header("3.3", "Order Tracking & Customer Loyalty Rewards Program", "Storefront /track-order & Profile", "Customer / Shopper", "#059669", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Customer Loyalty Rewards Engine:</b><br/>"
        "Customers earn reward points automatically upon order delivery: <b>1 Reward Point per PHP 50.00 spent</b> on confirmed delivered orders. Accumulated points unlock progressive VIP tiers:",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 2))

    loyalty_data = [
        [
            Paragraph("<b>Loyalty Tier</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Spending Threshold</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Point Multiplier</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Exclusive Customer Benefits & Storefront Privileges</b>", styles["TableHead"])
        ],
        [
            Paragraph("<b>Bronze</b>", styles["TableCellCenter"]),
            Paragraph("Under PHP 1,000", styles["TableCellCenter"]),
            Paragraph("1.0x (Standard)", styles["TableCellCenter"]),
            Paragraph("Standard loyalty points accumulation, order status tracking, birthday discount code.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Silver</b>", styles["TableCellCenter"]),
            Paragraph("PHP 1,000 – PHP 4,999", styles["TableCellCenter"]),
            Paragraph("1.2x Multiplier", styles["TableCellCenter"]),
            Paragraph("Free shipping on orders above PHP 500, priority customer support ticket resolution.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Gold</b>", styles["TableCellCenter"]),
            Paragraph("PHP 5,000 – PHP 9,999", styles["TableCellCenter"]),
            Paragraph("1.5x Multiplier", styles["TableCellCenter"]),
            Paragraph("5% permanent account discount, early access to limited seasonal botanical releases.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Platinum VIP</b>", styles["TableCellCenter"]),
            Paragraph("PHP 10,000 and above", styles["TableCellCenter"]),
            Paragraph("2.0x Multiplier", styles["TableCellCenter"]),
            Paragraph("10% permanent account discount, complimentary gift packaging, direct VIP hotline.", styles["TableCell"])
        ]
    ]
    t_loyalty = Table(loyalty_data, colWidths=[70, 95, 80, 278.27])
    t_loyalty.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_loyalty)


def build_page_8_logistics(story, styles, width=523.27):
    story.append(Paragraph("PHASE 04 • LOGISTICS FULFILLMENT & DISPATCH", styles["SectionSub"]))
    story.append(Paragraph("Order Confirmation Desk, Thermal Waybills & Courier Dispatch", styles["SectionHeader"]))
    story.append(Paragraph(
        "Logistics serves as the official Order Confirmation authority. The desk verifies customer addresses, validates COD phone numbers, generates thermal waybill labels, and coordinates courier handover.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # Step 4.1 Header
    story.append(create_step_header("4.1", "Customer Order Confirmation Desk & Address Verification", "Sidebar > Logistics > Order Management", "Logistics Staff", "#1D4ED8", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Order Confirmation Protocol:</b><br/>"
        "1. <b>Order Triage:</b> Review incoming orders in status <code>Order Placed</code>.<br/>"
        "2. <b>Address & Contact Verification:</b> Confirm Philippine barangay, municipality, and 11-digit mobile phone. For COD orders above PHP 1,000, call or SMS recipient before confirmation.<br/>"
        "3. <b>Status Confirmation:</b> Click <b>Confirm Order</b> to transition record from <code>Order Placed</code> into <code>Processing</code>. Finished goods are immediately reserved for parcel packing.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # Step 4.2 Header
    story.append(create_step_header("4.2", "Thermal Waybill Printing & Courier Dispatch", "Sidebar > Logistics > Order Management", "Logistics Staff", "#1D4ED8", width))
    story.append(Spacer(1, 2))

    # FRONTEND UI MOCKUP: Thermal Courier Waybill Sticker (NO TEXT OVERLAPS!)
    waybill_data = [
        [
            Paragraph("<b>MHIRA LOGISTICS EXPRESS</b>", ParagraphStyle("wb_h1", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.HexColor("#153E97"))),
            Paragraph("<b>TRACKING: #JNT-PH-00293182</b>", ParagraphStyle("wb_h2", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.HexColor("#1D4ED8"), alignment=TA_RIGHT))
        ],
        [
            Paragraph("<b>COURIER: J&T EXPRESS PHILIPPINES (STANDARD AIRWAY BILL)</b>", ParagraphStyle("wb_c", fontName="Helvetica-Bold", fontSize=6.8, leading=8.5, textColor=colors.HexColor("#0F172A"))),
            Paragraph("<b>DATE: 2026-10-27</b>", ParagraphStyle("wb_d", fontName="Helvetica", fontSize=6.8, leading=8.5, textColor=colors.HexColor("#64748B"), alignment=TA_RIGHT))
        ],
        [
            Paragraph("<b>||||| | |||| ||| || ||||| || ||| |||| || ||| ||||| |||| |||</b><br/><font size='6' color='#64748B'>* J N T - P H - 0 0 2 9 3 1 8 2 *</font>", ParagraphStyle("bc_rep", fontName="Courier-Bold", fontSize=11, leading=13, alignment=TA_CENTER)),
            ""
        ],
        [
            Paragraph("<b>SENDER:</b><br/>Mhira Natural Soap & Cosmetics<br/>Brgy. Sala, Cabuyao, Laguna 4025<br/>Contact: 0917-123-4567", styles["TableCell"]),
            Paragraph("<b>RECIPIENT:</b><br/>Kent Bundalian<br/>Brgy. Sala, Cabuyao, Laguna 4025<br/>Contact: 0906-525-8847", styles["TableCell"])
        ],
        [
            Paragraph("<b>PARCEL CONTENTS:</b> 1x FACE SERUM COLLAGEN (30 ML) [FG0004]<br/><b>TOTAL WEIGHT:</b> 0.15 kg • <b>DIMENSIONS:</b> 12cm x 6cm x 6cm", styles["TableCell"]),
            Paragraph("<b>PAYMENT METHOD:</b><br/><font color='#BE123C' size='7.5'><b>COD COLLECT: PHP 305.00</b></font>", styles["TableCellRight"])
        ],
        [
            Paragraph("<font color='#047857'><b>✓ Order Confirmed by Logistics Desk</b></font>", styles["TableCellBold"]),
            Paragraph("<b>[ Print Waybill ]  [ Dispatch (In Transit) ]</b>", ParagraphStyle("wb_btns", fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=colors.HexColor("#153E97"), alignment=TA_RIGHT))
        ]
    ]
    t_waybill = Table(waybill_data, colWidths=[293.27, 230])
    t_waybill.setStyle(TableStyle([
        ('SPAN', (0,2), (1,2)),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFFFFF")),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#0F172A")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_waybill)
    story.append(Spacer(1, 4))

    # Step 4.3 & 4.4 Header
    story.append(create_step_header("4.3 - 4.4", "Courier Handover, In-Transit Tracking & Returns Management", "Sidebar > Logistics > Return Management", "Logistics Staff", "#1D4ED8", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Delivery Lifecycle & Returns Governance:</b><br/>"
        "1. <b>Courier Handover:</b> When courier rider receives parcels, update status to <code>In Transit</code>.<br/>"
        "2. <b>Delivery Handover:</b> Upon electronic proof-of-delivery (e-POD), mark order <code>Delivered</code>. This automatically updates customer loyalty points.<br/>"
        "3. <b>Returns & Exchange SOP:</b> In <code>Return Management</code>, verify return requests within 7 days of delivery. For damaged in-transit goods, file courier claims. Returned soaps cannot be restocked for hygiene safety; write off to Scrap.",
        styles["BodyJustify"]
    ))


def build_page_9_admin(story, styles, width=523.27):
    story.append(Paragraph("PHASE 05 • ADMIN GOVERNANCE, SECURITY & DISASTER RECOVERY", styles["SectionSub"]))
    story.append(Paragraph("Appearance, Staff Accounts, Audit Trails & Cloud Backups", styles["SectionHeader"]))
    story.append(Paragraph(
        "The Administration role governs system integrity, security policies, role permissions, emergency maintenance mode, and database backup snapshots.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # Step 5.1 & 5.2 Header
    story.append(create_step_header("5.1 - 5.2", "Appearance Customization & Staff User Access Control", "Sidebar > Admin > User Management", "System Admin", "#BE123C", width))
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>User Administration Protocol:</b><br/>"
        "1. <b>Account Provisioning:</b> Create staff accounts, specify email, username, and assigned department role.<br/>"
        "2. <b>Credential Policy:</b> Passwords require minimum 8 characters with alphanumeric and special characters. Enforce credential reset upon first login.<br/>"
        "3. <b>Deactivation Protocol:</b> Former employee accounts must be deactivated immediately to revoke token access.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # ACTUAL USER MANAGEMENT DIRECTORY TABLE (FULL WIDTH, NO TRUNCATED COLUMNS!)
    story.append(Paragraph("<b>Frontend View: Admin &gt; User Management Directory</b>", styles["H2"]))
    user_head = [
        [
            Paragraph("<b>Staff Member & Handle</b>", styles["TableHead"]),
            Paragraph("<b>Email Address</b>", styles["TableHead"]),
            Paragraph("<b>Assigned Role</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Status</b>", styles["TableHeadCenter"]),
            Paragraph("<b>System Access Scope & Department Responsibilities</b>", styles["TableHead"])
        ]
    ]
    user_rows = [
        [
            Paragraph("<b>Administrator</b><br/><font color='#64748B'>@admin</font>", styles["TableCell"]),
            Paragraph("admin@mhiracosmetics.ph", styles["TableCellMono"]),
            Paragraph("<font color='#BE123C'><b>Admin</b></font>", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Active</b></font>", styles["TableCellCenter"]),
            Paragraph("Full governance, user administration, maintenance mode & backups.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Kent Bundalian</b><br/><font color='#64748B'>@logistics_kent</font>", styles["TableCell"]),
            Paragraph("logistics@mhiracosmetics.ph", styles["TableCellMono"]),
            Paragraph("<font color='#1D4ED8'><b>Logistics</b></font>", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Active</b></font>", styles["TableCellCenter"]),
            Paragraph("Order confirmation desk, thermal waybill printing, courier dispatch.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Inventory Officer</b><br/><font color='#64748B'>@inv_officer</font>", styles["TableCell"]),
            Paragraph("inventory@mhiracosmetics.ph", styles["TableCellMono"]),
            Paragraph("<font color='#D97706'><b>Inventory</b></font>", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Active</b></font>", styles["TableCellCenter"]),
            Paragraph("Raw material receiving, FEFO expiry tracking, WIP recipe conversion.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Marketing Lead</b><br/><font color='#64748B'>@marketing_team</font>", styles["TableCell"]),
            Paragraph("marketing@mhiracosmetics.ph", styles["TableCellMono"]),
            Paragraph("<font color='#7C3AED'><b>Marketing</b></font>", styles["TableCellCenter"]),
            Paragraph("<font color='#047857'><b>Active</b></font>", styles["TableCellCenter"]),
            Paragraph("Products catalog merchandising, promotional vouchers, customer feedback.", styles["TableCell"])
        ]
    ]
    t_users = Table(user_head + user_rows, colWidths=[95, 115, 60, 45, 208.27])
    t_users.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_users)
    story.append(Spacer(1, 4))

    # Step 5.3, 5.4, 5.5 Header
    story.append(create_step_header("5.3 - 5.5", "Security Audit Trails, Emergency Maintenance & Cloud Backups", "Sidebar > Admin > Maintenance & Backup", "System Admin", "#BE123C", width))
    story.append(Spacer(1, 2))

    admin_pillars = [
        [
            Paragraph("<b>Governance Pillar</b>", styles["TableHead"]),
            Paragraph("<b>System Navigation Path</b>", styles["TableHead"]),
            Paragraph("<b>Technical Protocol & Disaster Recovery Rules</b>", styles["TableHead"])
        ],
        [
            Paragraph("<b>SOP 5.3: Security Audit</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Admin &gt; User Activity", styles["TableCellMono"]),
            Paragraph("Monitors immutable security logs: login timestamps, IP addresses, batch production executions, and status modifications. Records cannot be purged.", styles["TableCell"])
        ],
        [
            Paragraph("<b>SOP 5.4: Maintenance Mode</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Admin &gt; System Maintenance", styles["TableCellMono"]),
            Paragraph("Locks customer storefront and displays polite maintenance notice during database migrations or updates. Admin portal remains accessible.", styles["TableCell"])
        ],
        [
            Paragraph("<b>SOP 5.5: Database Backup</b>", styles["TableCellBold"]),
            Paragraph("Sidebar &gt; Admin &gt; Data Backup", styles["TableCellMono"]),
            Paragraph("Generates automated daily JSON / MongoDB snapshots. Administrator can trigger on-demand backups before production recipe or catalog imports.", styles["TableCell"])
        ]
    ]
    t_pillars = Table(admin_pillars, colWidths=[120, 150, 253.27])
    t_pillars.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_pillars)


def build_page_10_troubleshooting(story, styles, width=523.27):
    story.append(Paragraph("SECTION 7.0 • SYSTEM DIAGNOSTICS & TROUBLESHOOTING", styles["SectionSub"]))
    story.append(Paragraph("Incident Diagnostics & Operational Troubleshooting Matrix", styles["SectionHeader"]))
    story.append(Paragraph(
        "This section outlines standard incident triage protocols, root-cause analyses, and step-by-step resolution procedures "
        "for common operational errors across inventory, marketing, checkout, logistics, and database administration.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # DIAGNOSTICS MATRIX TABLE
    diag_head = [
        [
            Paragraph("<b>Operational Symptom / Error Message</b>", styles["TableHead"]),
            Paragraph("<b>Root Cause Analysis</b>", styles["TableHead"]),
            Paragraph("<b>Role Scope</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Step-by-Step Resolution Procedure</b>", styles["TableHead"])
        ]
    ]
    diag_rows = [
        [
            Paragraph("<b>WIP Conversion Error:</b><br/><em>'Insufficient raw material balance for formulation'</em>", styles["TableCellBold"]),
            Paragraph("Warehouse raw material stock is lower than required recipe quantity, or available lots are in Quarantine.", styles["TableCell"]),
            Paragraph("Inventory", styles["TableCellCenter"]),
            Paragraph("1. Check <code>Delivery Receiving</code> for pending shipments.<br/>2. Verify if lots are locked in <code>Expiry Monitoring</code> quarantine.<br/>3. Stock-in fresh materials before re-attempting conversion.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Storefront Discrepancy:</b><br/><em>Product displays 'Out of Stock' despite active listing</em>", styles["TableCellBold"]),
            Paragraph("Finished goods physical stock count reached 0. Storefront availability strictly mirrors inventory balances.", styles["TableCell"]),
            Paragraph("Marketing / Inventory", styles["TableCellCenter"]),
            Paragraph("1. Contact Inventory Officer to execute a fresh WIP batch.<br/>2. Once batch converts to Finished Goods, storefront status restores automatically without manual re-publishing.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Order Confirmation Delay:</b><br/><em>Logistics unable to transition order from 'Order Placed'</em>", styles["TableCellBold"]),
            Paragraph("Recipient mobile number is invalid or delivery address lacks required Philippine barangay data.", styles["TableCell"]),
            Paragraph("Logistics", styles["TableCellCenter"]),
            Paragraph("1. Open Order Details modal in <code>Order Management</code>.<br/>2. Contact customer via email/phone to verify complete address.<br/>3. Edit address fields, click <b>Save</b>, and confirm order.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Thermal Waybill Barcode Error:</b><br/><em>Courier rider unable to scan printed barcode</em>", styles["TableCellBold"]),
            Paragraph("Thermal printer density too low, thermal paper creased, or browser print scale distorted.", styles["TableCell"]),
            Paragraph("Logistics", styles["TableCellCenter"]),
            Paragraph("1. Clean thermal printer printhead with isopropyl alcohol.<br/>2. In print dialog, ensure scale is 100% (do not fit to printable area).<br/>3. Reprint official waybill label from <code>Order Management</code>.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Access Denied / 403 Forbidden:</b><br/><em>Staff member cannot access specific sidebar module</em>", styles["TableCellBold"]),
            Paragraph("Staff account does not possess the required RBAC role permissions, or session token expired.", styles["TableCell"]),
            Paragraph("Admin / Staff", styles["TableCellCenter"]),
            Paragraph("1. Log out and log back in to refresh JWT session.<br/>2. If still restricted, Admin must check <code>User Management</code> to confirm assigned role scope matches job description.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Database Backup Warning:</b><br/><em>'Snapshot generation timeout or disk write limit'</em>", styles["TableCellBold"]),
            Paragraph("Server storage quota reached, or heavy read/write concurrency during peak hours.", styles["TableCell"]),
            Paragraph("Admin", styles["TableCellCenter"]),
            Paragraph("1. Archive older backup snapshots to offsite cloud storage.<br/>2. Trigger on-demand backup during non-peak operational windows (after 10:00 PM).<br/>3. Verify MongoDB disk health in server cPanel.", styles["TableCell"])
        ]
    ]
    t_diag = Table(diag_head + diag_rows, colWidths=[125, 115, 60, 223.27])
    t_diag.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_diag)
    story.append(Spacer(1, 4))

    esc_box = (
        "<b>INCIDENT ESCALATION PROTOCOL:</b> If an operational error cannot be resolved through standard diagnostics within 15 minutes, "
        "escalate immediately to the Systems Administrator via <code>admin@mhiracosmetics.ph</code> or the emergency support channel. "
        "Do not attempt direct database record alterations without written authorization from the Operations Lead."
    )
    story.append(create_callout("CRITICAL INCIDENT ESCALATION & AUDIT SAFEGUARD", esc_box, theme="danger", width=width))


def build_page_11_faqs_signoff(story, styles, width=523.27):
    story.append(Paragraph("SECTION 8.0 • OPERATIONAL FAQS & DOCUMENT AUTHORIZATION", styles["SectionSub"]))
    story.append(Paragraph("Operational FAQs, Audit Checklist & Sign-Off Authorization", styles["SectionHeader"]))
    story.append(Paragraph(
        "This concluding section addresses core operational inquiries, establishes a daily/weekly readiness checklist, "
        "and formalizes departmental compliance through official executive signatures.",
        styles["BodyJustify"]
    ))
    story.append(Spacer(1, 3))

    # 8.1 Operational FAQs
    story.append(Paragraph("<b>8.1 Frequently Asked Questions (FAQs)</b>", styles["H2"]))
    faqs_data = [
        [
            Paragraph("<b>Q: How does raw material auto-deduction prevent inventory discrepancies?</b><br/>"
                      "A: When an Inventory Officer converts a batch in WIP, the formula engine mathematically computes exact ingredient weights and executes atomic database deductions. This guarantees zero unrecorded raw material consumption.", styles["TableCell"]),
            Paragraph("<b>Q: Can Marketing publish storefront products without physical finished goods?</b><br/>"
                      "A: Marketing can draft descriptions and upload imagery, but storefront availability strictly mirrors verified Finished Goods inventory counts to prevent overselling.", styles["TableCell"])
        ],
        [
            Paragraph("<b>Q: Why does Logistics act as the sole Order Confirmation authority?</b><br/>"
                      "A: Logistics verifies Philippine regional addresses, checks parcel weight against courier shipping rate tiers, validates COD contact legitimacy, and prints official thermal waybills before courier handover.", styles["TableCell"]),
            Paragraph("<b>Q: How are customer loyalty tier reward points calculated?</b><br/>"
                      "A: Customers automatically earn 1 Reward Point per PHP 50.00 spent on delivered orders. Spending thresholds: Bronze (&lt;PHP 1,000), Silver (PHP 1,000+), Gold (PHP 5,000+), and Platinum VIP (PHP 10,000+).", styles["TableCell"])
        ]
    ]
    t_faqs = Table(faqs_data, colWidths=[256.63, 266.64])
    t_faqs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_faqs)
    story.append(Spacer(1, 4))

    # 8.2 Operational Checklist Table
    story.append(Paragraph("<b>8.2 Daily & Weekly Operational Readiness Checklist</b>", styles["H2"]))
    chk_data = [
        [
            Paragraph("<b>Frequency</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Operational Inspection Item</b>", styles["TableHead"]),
            Paragraph("<b>Responsible Role</b>", styles["TableHeadCenter"]),
            Paragraph("<b>Verification Standard & Criteria</b>", styles["TableHead"])
        ],
        [
            Paragraph("Daily (AM)", styles["TableCellCenter"]),
            Paragraph("Inbound Manifest & FEFO Audit", styles["TableCellBold"]),
            Paragraph("Inventory", styles["TableCellCenter"]),
            Paragraph("Inspect physical stock-in, verify CoA, check 90-day expiry monitoring alerts.", styles["TableCell"])
        ],
        [
            Paragraph("Daily (AM/PM)", styles["TableCellCenter"]),
            Paragraph("Order Confirmation & Dispatch Triage", styles["TableCellBold"]),
            Paragraph("Logistics", styles["TableCellCenter"]),
            Paragraph("Confirm all <code>Order Placed</code> records, print thermal waybills, dispatch riders.", styles["TableCell"])
        ],
        [
            Paragraph("Daily (PM)", styles["TableCellCenter"]),
            Paragraph("Storefront Stock & Reviews Audit", styles["TableCellBold"]),
            Paragraph("Marketing", styles["TableCellCenter"]),
            Paragraph("Review out-of-stock items, approve pending verified customer product reviews.", styles["TableCell"])
        ],
        [
            Paragraph("Daily (Midnight)", styles["TableCellCenter"]),
            Paragraph("Automated Database Cloud Backup", styles["TableCellBold"]),
            Paragraph("Admin", styles["TableCellCenter"]),
            Paragraph("Verify automated daily snapshot creation and log zero database sync errors.", styles["TableCell"])
        ],
        [
            Paragraph("Weekly", styles["TableCellCenter"]),
            Paragraph("Physical Stock vs System Variance Audit", styles["TableCellBold"]),
            Paragraph("Inventory / Ops", styles["TableCellCenter"]),
            Paragraph("Conduct physical cycle count on raw botanical oils and finished soaps; zero tolerance for unrecorded variance.", styles["TableCell"])
        ]
    ]
    t_chk = Table(chk_data, colWidths=[65, 140, 75, 243.27])
    t_chk.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#153E97")),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 1.8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.8),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_chk)
    story.append(Spacer(1, 4))

    # 8.3 Formal Sign-off & Compliance Block
    story.append(Paragraph("<b>8.3 Document Authorization & Compliance Sign-Off</b>", styles["H2"]))
    auth_data = [
        [
            Paragraph("<b>PREPARED BY:</b><br/><br/><u>Kent Bundalian</u><br/>Systems Architect & Documentation Specialist<br/>Date: October 27, 2026", styles["TableCell"]),
            Paragraph("<b>REVIEWED BY:</b><br/><br/><u>Head of Formulations & QA</u><br/>Quality Assurance & GMP Compliance<br/>Date: October 27, 2026", styles["TableCell"]),
            Paragraph("<b>APPROVED BY:</b><br/><br/><u>Director of Operations</u><br/>MHIRA Natural Soap & Cosmetics<br/>Date: October 27, 2026", styles["TableCell"])
        ]
    ]
    t_auth = Table(auth_data, colWidths=[174.4, 174.4, 174.4])
    t_auth.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor("#153E97")),
        ('INNERGRID', (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_auth)


def inject_pdf_bookmarks_and_metadata(pdf_path):
    """
    Injects hierarchical PDF outline bookmarks and document metadata
    using PyMuPDF for instant navigation in PDF viewers.
    """
    doc = pymupdf.open(pdf_path)
    
    # PDF Metadata
    doc.set_metadata({
        "title": "MHIRA CRM Operations Manual",
        "author": "Kent Bundalian & Operations Team",
        "subject": "Standard Operating Procedures (SOP) across Inventory, Marketing, Logistics & Admin",
        "keywords": "MHIRA, CRM, Inventory, FEFO, WIP, Merchandising, Storefront, Logistics, SOP, Data Privacy Act",
        "creator": "MHIRA Operations Manual Generator v2.0",
        "producer": "ReportLab 5.1 & PyMuPDF 1.28"
    })

    # Hierarchical Bookmarks (TOC): [lvl, title, page_num (1-indexed)]
    toc = [
        [1, "Cover Page", 1],
        [1, "Section 0.0 Document Control & Sitemap", 2],
        [1, "Section 1.0 Executive System Overview & Architecture", 3],
        [2, "1.1 The 5-Phase Operational Lifecycle Flow", 3],
        [2, "1.2 Role-Based Access Control (RBAC) Matrix", 3],
        [1, "Section 2.0 Phase 1: Inventory Management & Inbound Receiving", 4],
        [2, "SOP 1.1 Inbound Raw Materials Stock-In & Supplier Receiving", 4],
        [2, "SOP 1.2 Work-in-Progress (WIP) Batch Conversion & Auto-Deduction", 4],
        [1, "Section 2.1 Phase 1: WIP Batch Execution & Handover", 5],
        [2, "SOP 1.3 Finished Goods Stock Handover & Warehouse Registration", 5],
        [2, "SOP 1.4 Auxiliary SOPs: Expiry Audits & Purchase Requests", 5],
        [1, "Section 3.0 Phase 2: Marketing Merchandising & Storefront Publishing", 6],
        [2, "SOP 2.1 Storefront Product Merchandising: Pricing, Imagery & Copy", 6],
        [2, "SOP 2.2 Marketing Campaign Suite: Coupons, Feedback, Content & Events", 6],
        [1, "Section 4.0 Phase 3: Customer Storefront Experience", 7],
        [2, "SOP 3.1 & 3.2 Catalog Exploration, Cart Checkout & Voucher Discount", 7],
        [2, "SOP 3.3 Order Tracking & Customer Loyalty Rewards Program", 7],
        [1, "Section 5.0 Phase 4: Logistics Fulfillment & Dispatch", 8],
        [2, "SOP 4.1 Customer Order Confirmation Desk & Verification", 8],
        [2, "SOP 4.2 Thermal Waybill Printing & Courier Dispatch", 8],
        [2, "SOP 4.3 & 4.4 Courier Handover, In-Transit Tracking & Returns", 8],
        [1, "Section 6.0 Phase 5: Administration & Governance", 9],
        [2, "SOP 5.1 & 5.2 Appearance & Staff User Access Control", 9],
        [2, "SOP 5.3 - 5.5 Audit Trails, Emergency Maintenance & Cloud Backups", 9],
        [1, "Section 7.0 Troubleshooting Guide & Diagnostics Matrix", 10],
        [1, "Section 8.0 Operational FAQs & Compliance Sign-Off", 11],
        [2, "8.1 Frequently Asked Questions (FAQs)", 11],
        [2, "8.2 Daily & Weekly Operational Readiness Checklist", 11],
        [2, "8.3 Document Authorization & Compliance Sign-Off", 11],
    ]
    doc.set_toc(toc)
    
    # Save optimized and linearized
    temp_optimized = pdf_path + ".tmp"
    doc.save(temp_optimized, deflate=True, garbage=4)
    doc.close()
    
    os.replace(temp_optimized, pdf_path)
    print(f"Successfully injected PDF outline bookmarks and metadata into: {pdf_path}")


def main():
    final_filename = "MHIRA_CRM_Operations_Manual_Final.pdf"
    workspace_pdf_path = os.path.join(WORKSPACE_DIR, final_filename)
    downloads_pdf_path = os.path.join(r"C:\Users\kentb\Downloads", final_filename)

    print(f"Generating Master PDF: {workspace_pdf_path}...")
    doc = SimpleDocTemplate(
        workspace_pdf_path,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = get_styles()
    story = []

    # Assemble all 11 pages
    build_page_1_cover(story, styles)
    story.append(PageBreak())

    build_page_2_doc_control(story, styles)
    story.append(PageBreak())

    build_page_3_overview(story, styles)
    story.append(PageBreak())

    build_page_4_inventory_1(story, styles)
    story.append(PageBreak())

    build_page_5_inventory_2(story, styles)
    story.append(PageBreak())

    build_page_6_marketing(story, styles)
    story.append(PageBreak())

    build_page_7_customer(story, styles)
    story.append(PageBreak())

    build_page_8_logistics(story, styles)
    story.append(PageBreak())

    build_page_9_admin(story, styles)
    story.append(PageBreak())

    build_page_10_troubleshooting(story, styles)
    story.append(PageBreak())

    build_page_11_faqs_signoff(story, styles)

    doc.build(story, canvasmaker=NumberedCanvas)
    print("ReportLab rendering complete.")

    # Post-process with PyMuPDF: add PDF outline bookmarks and metadata
    inject_pdf_bookmarks_and_metadata(workspace_pdf_path)

    # Copy to Downloads folder as requested in user prompt
    try:
        shutil.copyfile(workspace_pdf_path, downloads_pdf_path)
        print(f"Copied final PDF to Downloads: {downloads_pdf_path}")
    except Exception as e:
        print("Note on copy to Downloads:", e)

    print("\n[SUCCESS] Final operations manual successfully compiled and verified!")

if __name__ == "__main__":
    main()
