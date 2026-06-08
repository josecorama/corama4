from fpdf import FPDF
from PIL import Image
import os

PRIMARY_BLUE = (11, 44, 72)  # #0B2C48 - Primary color for headers
LIGHT_BLUE = (153, 200, 202)  # #99C8CA - Secondary color for section backgrounds
LIGHT_GRAY = (240, 240, 240)  # #F0F0F0 - Light gray for alternate sections
DARK_GRAY = (45, 45, 45)  # #2D2D2D - Dark gray for footer
FOOTER_GRAY = (87, 88, 90)  # #57585a - Footer background color
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

CERT_BADGES = {
    'ISO 9001': 'static/images/certs/iso9001.png',
    'ISO 9001:2015': 'static/images/certs/iso9001.png',
    'LEED': 'static/images/certs/leed.png',
    'SBA 8(a)': 'static/images/certs/sba8a.png',
    'DBE': 'static/images/certs/dbe.png',
    'HUBZone': 'static/images/certs/hubzone.png',
    'WOSB': 'static/images/certs/wosb.png',
    'MBE': 'static/images/certs/mbe.png',
    'WBE': 'static/images/certs/wbe.png',
}


class PDF(FPDF):
    def __init__(self, data, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.data = data
        self.primary_color = data.get("logo_color", [PRIMARY_BLUE, LIGHT_BLUE])[0]
        self.secondary_color = data.get("logo_color", [PRIMARY_BLUE, LIGHT_BLUE])[1]
        self.footer_layout = None  # Will be computed in create_content
        self.set_auto_page_break(auto=False)
    
    def _to_pdf_text(self, text):
        """Sanitize text for FPDF latin-1 encoding by replacing Unicode characters"""
        if not text:
            return text
        
        import unicodedata
        text = unicodedata.normalize('NFKC', str(text))
        
        replacements = {
            '\u2122': 'TM',      # ™ → TM
            '\u00ae': '(R)',     # ® → (R)
            '\u00a9': '(C)',     # © → (C)
            '\u2022': '-',       # • → -
            '\u2013': '-',       # – → -
            '\u2014': '-',       # — → -
            '\u2018': "'",       # ' → '
            '\u2019': "'",       # ' → '
            '\u201c': '"',       # " → "
            '\u201d': '"',       # " → "
            '\u00a0': ' ',       # non-breaking space → space
            '\u2026': '...',     # … → ...
        }
        
        for unicode_char, ascii_equiv in replacements.items():
            text = text.replace(unicode_char, ascii_equiv)
        
        try:
            text.encode('latin-1')
        except UnicodeEncodeError:
            text = text.encode('latin-1', 'ignore').decode('latin-1')
        
        return text

    # Shared layout constants
    MARGIN = 8
    GUTTER = 5

    def _col_layout(self):
        available = self.w - 2 * self.MARGIN - self.GUTTER
        col_w = available / 2
        left_x = self.MARGIN
        right_x = self.MARGIN + col_w + self.GUTTER
        return left_x, right_x, col_w

    def header(self):
        """Professional header with logo, company name, blue bar and hero image"""
        left_x, right_x, col_w = self._col_layout()

        bar_y = 38
        bar_h = 40

        # ── Logo (left side, above bar) ──
        logo_path = self.data.get("logo_path")
        if logo_path and os.path.exists(logo_path):
            try:
                logo = Image.open(logo_path)
                lw, lh = logo.size
                ar = lw / lh
                max_h, max_w = 18, col_w * 0.55
                h = min(max_h, 18)
                w = h * ar
                if w > max_w:
                    w = max_w
                    h = w / ar
                lx = left_x + (col_w - w) / 2
                ly = bar_y - h - 1
                self.image(logo_path, lx, ly, w, h)
            except Exception:
                pass

        # ── Company name (right side, above bar) ──
        company_name = self.data.get("company_name", "")
        if company_name:
            self.set_xy(right_x, 10)
            self.set_font("Helvetica", "B", 15)
            self.set_text_color(*self.primary_color)
            self.multi_cell(col_w, 6, self._to_pdf_text(company_name.upper()), 0, "C")

        # ── Blue bar ──
        self.set_fill_color(*self.primary_color)
        self.rect(0, bar_y, self.w, bar_h, 'F')

        # "CAPABILITY STATEMENT" centred in the left half of the bar
        cap_text = ' '.join(list('CAPABILITY'))
        stm_text = ' '.join(list('STATEMENT'))
        line_h = 9.0
        gap = 3.0
        block_h = line_h * 2 + gap
        ty = bar_y + (bar_h - block_h) / 2

        self.set_font("Helvetica", "B", 20)
        self.set_text_color(*WHITE)
        self.set_xy(left_x, ty)
        self.cell(col_w, line_h, cap_text, 0, 1, "C")
        self.set_xy(left_x, ty + line_h + gap)
        self.cell(col_w, line_h, stm_text, 0, 1, "C")

        # UEI / CAGE codes below the text
        uei = self.data.get("uei_code", "")
        cage = self.data.get("cage_code", "")
        codes = ""
        if uei:
            codes += f"UEI: {uei}"
        if cage:
            codes += ("     " if codes else "") + f"CAGE: {cage}"
        if codes:
            self.set_font("Helvetica", "", 7)
            self.set_xy(left_x, ty + block_h + 1)
            self.cell(col_w, 5, self._to_pdf_text(codes), 0, 0, "C")

        # ── Hero image (right side, inside bar, centred) ──
        image_path = self.data.get("image_path")
        if image_path and os.path.exists(image_path):
            try:
                img = Image.open(image_path)
                iw, ih = img.size
                ar = iw / ih
                max_w = col_w * 0.80
                max_h = bar_h - 4
                dw = max_w
                dh = dw / ar
                if dh > max_h:
                    dh = max_h
                    dw = dh * ar
                ix = right_x + (col_w - dw) / 2
                iy = bar_y + (bar_h - dh) / 2
                self.image(image_path, ix, iy, dw, dh)
            except Exception:
                pass

        self.set_text_color(*BLACK)
        self.set_y(bar_y + bar_h + 5)

    def compute_footer_layout(self):
        """Compute dynamic footer layout based on content"""
        footer_top_pad_mm = 3.0
        footer_bottom_pad_mm = 3.0
        footer_label_h_mm = 5.0
        footer_info_line_h_mm = 4.0
        
        col1_lines = 0
        if self.data.get("contact_name"):
            col1_lines += 1
        if self.data.get("contact_title"):
            col1_lines += 1
        
        col2_lines = 0
        if self.data.get("contact_phone"):
            col2_lines += 1
        if self.data.get("contact_email"):
            col2_lines += 1
        if self.data.get("contact_website"):
            col2_lines += 1
        
        col3_lines = 0
        if self.data.get("contact_address"):
            col3_lines += 1
        city_state_zip = ", ".join(filter(None, [
            self.data.get("city", ""),
            self.data.get("state", ""),
            self.data.get("zip", "")
        ]))
        if city_state_zip:
            col3_lines += 1
        
        max_lines = max(col1_lines, col2_lines, col3_lines)
        
        footer_h_mm = footer_top_pad_mm + footer_label_h_mm + (max_lines * footer_info_line_h_mm) + footer_bottom_pad_mm
        
        footer_top_y = self.h - footer_h_mm
        
        label_y = footer_top_y + footer_top_pad_mm
        cols_y = label_y + footer_label_h_mm
        
        badge_y = footer_top_y + footer_h_mm - footer_bottom_pad_mm - 12 - 1
        
        return {
            'footer_h_mm': footer_h_mm,
            'footer_top_y': footer_top_y,
            'label_y': label_y,
            'cols_y': cols_y,
            'badge_y': badge_y
        }
    
    def footer(self):
        """Professional footer with contact info in 3 equal sub-columns"""
        if self.footer_layout is None:
            return

        layout = self.footer_layout
        m = self.MARGIN

        self.set_fill_color(*FOOTER_GRAY)
        self.rect(0, layout['footer_top_y'], self.w, layout['footer_h_mm'], 'F')

        # "POINT OF CONTACT" label
        self.set_xy(m, layout['label_y'])
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*WHITE)
        self.cell(0, 5, "POINT OF CONTACT", 0, 1, "L")

        # Three equal sub-columns inside the footer
        usable = self.w - 2 * m
        sub_w = usable / 3
        col1_x = m
        col2_x = m + sub_w
        col3_x = m + sub_w * 2
        y = layout['cols_y']
        line_h = 4

        self.set_font("Helvetica", "", 8)

        # Col 1: Name / Title
        self.set_xy(col1_x, y)
        if self.data.get("contact_name"):
            self.cell(sub_w, line_h, self._to_pdf_text(self.data["contact_name"]), 0, 1, "L")
        if self.data.get("contact_title"):
            self.set_x(col1_x)
            self.cell(sub_w, line_h, self._to_pdf_text(self.data["contact_title"]), 0, 1, "L")

        # Col 2: Phone / Email / Website
        self.set_xy(col2_x, y)
        if self.data.get("contact_phone"):
            self.cell(sub_w, line_h, self._to_pdf_text(f"P: {self.data['contact_phone']}"), 0, 1, "L")
        if self.data.get("contact_email"):
            self.set_x(col2_x)
            self.cell(sub_w, line_h, self._to_pdf_text(f"E: {self.data['contact_email']}"), 0, 1, "L")
        if self.data.get("contact_website"):
            self.set_x(col2_x)
            self.cell(sub_w, line_h, self._to_pdf_text(f"W: {self.data['contact_website']}"), 0, 1, "L")

        # Col 3: Address
        self.set_xy(col3_x, y)
        addr = []
        if self.data.get("contact_address"):
            addr.append(self.data["contact_address"])
        csz = ", ".join(filter(None, [
            self.data.get("city", ""), self.data.get("state", ""), self.data.get("zip", "")
        ]))
        if csz:
            addr.append(csz)
        if addr:
            self.multi_cell(sub_w, line_h, self._to_pdf_text("\n".join(addr)), 0, "L")

        # Certification badges (right-aligned)
        certifications = self.data.get("certifications", [])
        if certifications:
            badge_size = 10
            badge_spacing = 2
            badge_y = layout['badge_y']
            badge_x = col3_x
            for cert in certifications[:5]:
                cert_str = str(cert).strip()
                badge_path = None
                for ck, p in CERT_BADGES.items():
                    if ck.lower() in cert_str.lower():
                        badge_path = p
                        break
                if badge_path and os.path.exists(badge_path):
                    try:
                        self.image(badge_path, badge_x, badge_y, badge_size, badge_size)
                        badge_x += badge_size + badge_spacing
                        if badge_x > self.w - m:
                            break
                    except Exception:
                        pass

        self.set_text_color(*BLACK)

    def section_title(self, title, x, y, width, use_secondary_bg=True):
        """Section heading bar — alternates between secondary colour and light gray"""
        self.set_xy(x, y)
        if use_secondary_bg:
            self.set_fill_color(*self.secondary_color)
            self.set_text_color(*WHITE)
        else:
            self.set_fill_color(*LIGHT_GRAY)
            self.set_text_color(*BLACK)
        self.set_font("Helvetica", "B", 10)
        self.cell(width, 8, self._to_pdf_text(title), 0, 1, "C", True)
        self.set_text_color(*BLACK)
        return self.get_y()
    
    def add_paragraph_bounded(self, text, x, y, width, font_size=8.0, line_height=4.0, bottom_limit=None):
        """Add a paragraph with text wrapping, bounded to bottom_limit"""
        if not text:
            return y
        
        if bottom_limit is None:
            if self.footer_layout:
                bottom_limit = self.h - self.footer_layout['footer_h_mm'] - 8.0
            else:
                bottom_limit = self.h - 32
        
        self.set_font("Helvetica", "", font_size)
        
        words = text.split()
        lines = []
        current_line = ""
        
        for word in words:
            test_line = current_line + (" " if current_line else "") + word
            if self.get_string_width(test_line) <= width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        
        if current_line:
            lines.append(current_line)
        
        for i, line in enumerate(lines):
            if y + line_height > bottom_limit:
                if i > 0 and y <= bottom_limit:
                    prev_line = lines[i-1]
                    if not prev_line.endswith("..."):
                        self.set_xy(x, y - line_height)
                        self.cell(width, line_height, self._to_pdf_text(prev_line + "..."), 0, 0, "L")
                break
            
            self.set_xy(x, y)
            self.cell(width, line_height, self._to_pdf_text(line), 0, 0, "L")
            y += line_height
        
        return y

    def add_bullet_list(self, items, x, y, width, font_size=8.0, bottom_limit=None):
        """Add a bulleted list with proper formatting, bounded to bottom_limit"""
        if not items:
            return y
        
        if bottom_limit is None:
            if self.footer_layout:
                bottom_limit = self.h - self.footer_layout['footer_h_mm'] - 8.0
            else:
                bottom_limit = self.h - 32
        
        self.set_font("Helvetica", "", font_size)
        line_height = 4.0
        
        for i, item in enumerate(items):
            if not item:
                continue
            
            self.set_font("Helvetica", "", font_size)
            text = str(item)
            estimated_lines = max(1, int(self.get_string_width(text) / (width - 5)) + 1)
            estimated_height = estimated_lines * line_height + 0.8
            
            if y + estimated_height > bottom_limit:
                if y + line_height + 0.8 <= bottom_limit:
                    self.set_xy(x, y)
                    self.cell(3, line_height, chr(0x95), 0, 0, "L")
                    self.set_xy(x + 5, y)
                    self.cell(width - 5, line_height, "...", 0, 0, "L")
                break
            
            self.set_xy(x, y)
            self.cell(3, line_height, chr(0x95), 0, 0, "L")
            self.set_xy(x + 5, y)
            self.multi_cell(width - 5, line_height, self._to_pdf_text(text), 0, "L")
            y = self.get_y() + 0.8
        
        return y

    def create_content(self):
        """Create the main content in a symmetric 2-column layout, single-page"""
        left_x, right_x, col_w = self._col_layout()
        pad = 4          # inner padding for text inside section boxes
        section_gap = 5   # vertical gap between sections

        bar_y = 38
        bar_h = 40
        start_y = bar_y + bar_h + 5

        self.footer_layout = self.compute_footer_layout()
        gap_above_footer = 6.0
        bottom_limit = self.h - self.footer_layout['footer_h_mm'] - gap_above_footer

        left_y = start_y
        right_y = start_y

        # ── Left column: About Us → Differentiators → Past Performance ──
        company_desc = self.data.get("company_description", "")
        if company_desc:
            left_y = self.section_title("ABOUT US", left_x, left_y, col_w, use_secondary_bg=True)
            left_y = self.add_paragraph_bounded(
                company_desc, left_x + pad, left_y + 2, col_w - 2 * pad,
                font_size=8.0, line_height=4.0, bottom_limit=bottom_limit)
            left_y += section_gap

        differentiators = self.data.get("differentiators", [])
        if differentiators:
            left_y = self.section_title("DIFFERENTIATORS", left_x, left_y, col_w, use_secondary_bg=False)
            left_y = self.add_bullet_list(
                differentiators, left_x + pad, left_y + 2, col_w - pad,
                font_size=8.0, bottom_limit=bottom_limit)
            left_y += section_gap

        past_performance = self.data.get("private_performance", [])
        if past_performance:
            left_y = self.section_title("PAST PERFORMANCE", left_x, left_y, col_w, use_secondary_bg=True)
            left_y = self.add_bullet_list(
                past_performance, left_x + pad, left_y + 2, col_w - pad,
                font_size=8.0, bottom_limit=bottom_limit)
            left_y += section_gap

        # ── Right column: NAICS Codes → Core Competencies → Certifications ──
        naics_codes = self.data.get("naics_codes", [])
        if naics_codes:
            right_y = self.section_title("NAICS CODES", right_x, right_y, col_w, use_secondary_bg=True)
            right_y = self.add_bullet_list(
                naics_codes, right_x + pad, right_y + 2, col_w - pad,
                font_size=8.0, bottom_limit=bottom_limit)
            right_y += section_gap

        core_competencies = self.data.get("core_competencies", [])
        if core_competencies:
            right_y = self.section_title("CORE COMPETENCIES", right_x, right_y, col_w, use_secondary_bg=False)
            right_y = self.add_bullet_list(
                core_competencies, right_x + pad, right_y + 2, col_w - pad,
                font_size=8.0, bottom_limit=bottom_limit)
            right_y += section_gap

        certifications = self.data.get("certifications", [])
        if certifications:
            right_y = self.section_title("CERTIFICATIONS", right_x, right_y, col_w, use_secondary_bg=True)
            right_y = self.add_bullet_list(
                certifications, right_x + pad, right_y + 2, col_w - pad,
                font_size=8.0, bottom_limit=bottom_limit)
            right_y += section_gap

        # Position footer right after content
        last_content_y = max(left_y, right_y)
        footer_top_y = last_content_y + gap_above_footer

        footer_h_mm = self.footer_layout['footer_h_mm']
        self.footer_layout['footer_top_y'] = footer_top_y
        self.footer_layout['label_y'] = footer_top_y + 3.0
        self.footer_layout['cols_y'] = footer_top_y + 3.0 + 5.0
        self.footer_layout['badge_y'] = footer_top_y + footer_h_mm - 3.0 - 10 - 1


class ModernPDF(FPDF):
    """Modern two-column sidebar layout for capability statements"""

    def __init__(self, data, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.data = data
        self.primary_color = data.get("logo_color", [PRIMARY_BLUE, LIGHT_BLUE])[0]
        self.secondary_color = data.get("logo_color", [PRIMARY_BLUE, LIGHT_BLUE])[1]
        self.set_auto_page_break(auto=False)
        self.sidebar_w = 70

    def _to_pdf_text(self, text):
        if not text:
            return text
        import unicodedata
        text = unicodedata.normalize('NFKC', str(text))
        replacements = {
            '\u2122': 'TM', '\u00ae': '(R)', '\u00a9': '(C)',
            '\u2022': '-', '\u2013': '-', '\u2014': '-',
            '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"',
            '\u00a0': ' ', '\u2026': '...',
        }
        for uc, ac in replacements.items():
            text = text.replace(uc, ac)
        try:
            text.encode('latin-1')
        except UnicodeEncodeError:
            text = text.encode('latin-1', 'ignore').decode('latin-1')
        return text

    def _add_sidebar_section(self, title, items, y, is_text=False):
        """Render a section inside the sidebar. Returns the new y position."""
        x = 5
        w = self.sidebar_w - 10
        bottom = self.h - 10

        if y + 12 > bottom:
            return y

        self.set_xy(x, y)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*WHITE)
        self.cell(w, 6, self._to_pdf_text(title), 0, 1, "L")
        y += 7

        # Thin accent line
        self.set_draw_color(*self.secondary_color)
        self.set_line_width(0.4)
        self.line(x, y, x + w, y)
        y += 3

        self.set_font("Helvetica", "", 7)
        self.set_text_color(220, 220, 220)

        if is_text:
            if isinstance(items, str) and items.strip():
                self.set_xy(x, y)
                self.multi_cell(w, 3.5, self._to_pdf_text(items), 0, "L")
                y = min(self.get_y() + 2, bottom)
        else:
            for item in (items or []):
                if y + 4 > bottom:
                    break
                item_text = str(item).strip()
                if not item_text:
                    continue
                self.set_xy(x, y)
                self.cell(3, 3.5, chr(0x95), 0, 0, "L")
                self.set_xy(x + 4, y)
                self.multi_cell(w - 4, 3.5, self._to_pdf_text(item_text), 0, "L")
                y = self.get_y() + 1.5
        return y + 4

    def _add_main_section(self, title, items, y, is_text=False):
        """Render a section in the main content area. Returns new y."""
        x = self.sidebar_w + 8
        w = self.w - x - 8
        bottom = self.h - 10

        if y + 12 > bottom:
            return y

        self.set_xy(x, y)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*self.primary_color)
        self.cell(w, 7, self._to_pdf_text(title), 0, 1, "L")
        y += 8

        # Accent bar
        self.set_fill_color(*self.secondary_color)
        self.rect(x, y, 25, 1, 'F')
        y += 4

        self.set_font("Helvetica", "", 8)
        self.set_text_color(60, 60, 60)

        if is_text:
            if isinstance(items, str) and items.strip():
                self.set_xy(x, y)
                self.multi_cell(w, 4, self._to_pdf_text(items), 0, "J")
                y = min(self.get_y() + 2, bottom)
        else:
            for item in (items or []):
                if y + 5 > bottom:
                    break
                item_text = str(item).strip()
                if not item_text:
                    continue
                self.set_xy(x, y)
                self.set_font("Helvetica", "", 8)
                self.cell(3, 4, chr(0x95), 0, 0, "L")
                self.set_xy(x + 5, y)
                self.multi_cell(w - 5, 4, self._to_pdf_text(item_text), 0, "L")
                y = self.get_y() + 1.5
        return y + 4

    def create_content(self):
        """Build the modern layout: dark sidebar on the left, white main area on the right."""
        sw = self.sidebar_w
        page_h = self.h

        # Sidebar background
        self.set_fill_color(*self.primary_color)
        self.rect(0, 0, sw, page_h, 'F')

        # ---------- Sidebar content ----------
        sy = 10

        # Logo
        logo_path = self.data.get("logo_path")
        if logo_path and os.path.exists(logo_path):
            try:
                logo = Image.open(logo_path)
                lw, lh = logo.size
                ar = lw / lh
                disp_h = min(18, 18)
                disp_w = disp_h * ar
                max_w = sw - 16
                if disp_w > max_w:
                    disp_w = max_w
                    disp_h = disp_w / ar
                lx = 5 + (sw - 10 - disp_w) / 2
                self.image(logo_path, lx, sy, disp_w, disp_h)
                sy += disp_h + 4
            except Exception:
                pass

        # Company name in sidebar
        company_name = self.data.get("company_name", "")
        if company_name:
            self.set_xy(5, sy)
            self.set_font("Helvetica", "B", 12)
            self.set_text_color(*WHITE)
            self.multi_cell(sw - 10, 6, self._to_pdf_text(company_name.upper()), 0, "C")
            sy = self.get_y() + 6

        # Contact info block
        contact_lines = []
        if self.data.get("contact_name"):
            contact_lines.append(self.data["contact_name"])
        if self.data.get("contact_title"):
            contact_lines.append(self.data["contact_title"])
        if self.data.get("contact_phone"):
            contact_lines.append("P: " + self.data["contact_phone"])
        if self.data.get("contact_email"):
            contact_lines.append("E: " + self.data["contact_email"])
        if self.data.get("contact_website"):
            contact_lines.append("W: " + self.data["contact_website"])
        addr_parts = []
        if self.data.get("contact_address"):
            addr_parts.append(self.data["contact_address"])
        csz = ", ".join(filter(None, [
            self.data.get("city", ""), self.data.get("state", ""), self.data.get("zip", "")
        ]))
        if csz:
            addr_parts.append(csz)
        contact_lines.extend(addr_parts)

        if contact_lines:
            self.set_font("Helvetica", "", 7)
            self.set_text_color(200, 200, 200)
            for cl in contact_lines:
                if sy + 4 > page_h - 10:
                    break
                self.set_xy(5, sy)
                self.cell(sw - 10, 3.5, self._to_pdf_text(cl), 0, 1, "L")
                sy += 4
            sy += 4

        # UEI / CAGE codes
        uei = self.data.get("uei_code", "")
        cage = self.data.get("cage_code", "")
        if uei or cage:
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*WHITE)
            if uei:
                self.set_xy(5, sy)
                self.cell(sw - 10, 3.5, self._to_pdf_text(f"UEI: {uei}"), 0, 1, "L")
                sy += 4
            if cage:
                self.set_xy(5, sy)
                self.cell(sw - 10, 3.5, self._to_pdf_text(f"CAGE: {cage}"), 0, 1, "L")
                sy += 4
            sy += 3

        # Sidebar sections
        naics = self.data.get("naics_codes", [])
        if naics:
            sy = self._add_sidebar_section("NAICS CODES", naics, sy)

        certs = self.data.get("certifications", [])
        if certs:
            sy = self._add_sidebar_section("CERTIFICATIONS", certs, sy)

        # ---------- Main area ----------
        my = 12

        # Title banner
        self.set_fill_color(*self.secondary_color)
        banner_x = sw + 4
        banner_w = self.w - sw - 8
        self.rect(banner_x, my, banner_w, 14, 'F')
        self.set_xy(banner_x, my + 2)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*WHITE)
        self.cell(banner_w, 10, "CAPABILITY STATEMENT", 0, 1, "C")
        my += 22

        # Hero image
        image_path = self.data.get("image_path")
        if image_path and os.path.exists(image_path):
            try:
                img = Image.open(image_path)
                iw, ih = img.size
                ar = iw / ih
                max_img_w = banner_w * 0.8
                max_img_h = 30
                disp_w = max_img_w
                disp_h = disp_w / ar
                if disp_h > max_img_h:
                    disp_h = max_img_h
                    disp_w = disp_h * ar
                ix = banner_x + (banner_w - disp_w) / 2
                self.image(image_path, ix, my, disp_w, disp_h)
                my += disp_h + 6
            except Exception:
                pass

        # Main sections
        desc = self.data.get("company_description", "")
        if desc:
            my = self._add_main_section("ABOUT US", desc, my, is_text=True)

        comps = self.data.get("core_competencies", [])
        if comps:
            my = self._add_main_section("CORE COMPETENCIES", comps, my)

        diffs = self.data.get("differentiators", [])
        if diffs:
            my = self._add_main_section("KEY DIFFERENTIATORS", diffs, my)

        perf = self.data.get("private_performance", [])
        if perf:
            my = self._add_main_section("PAST PERFORMANCE", perf, my)


def create_pdf(data, output_path="output.pdf", template="default"):
    """Create a professional capability statement PDF.

    Args:
        data: dict with capability statement fields.
        output_path: destination file path.
        template: 'default' for the classic layout, 'modern' for a sidebar layout.
    """
    if template == "modern":
        pdf = ModernPDF(data)
    else:
        pdf = PDF(data)
    pdf.add_page()
    pdf.create_content()
    pdf.output(output_path)
    return output_path
