from fpdf import FPDF
from PIL import Image
import os
import tempfile

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

    def _count_wrapped_lines(self, text, width):
        """Approximate how many lines FPDF.multi_cell will produce for ``text``
        at the current font, wrapping on spaces within ``width`` mm. Used to
        vertically centre the header company name."""
        if not text:
            return 1
        try:
            wmax = width - 2 * self.c_margin
        except AttributeError:
            wmax = width - 2.0
        total = 0
        for paragraph in text.split("\n"):
            words = paragraph.split(" ")
            line = ""
            count = 1
            for wd in words:
                trial = wd if line == "" else line + " " + wd
                if line == "" or self.get_string_width(trial) <= wmax:
                    line = trial
                else:
                    count += 1
                    line = wd
            total += count
        return max(1, total)

    def header(self):
        """Professional header with logo, company name, blue bar and hero image"""
        left_x, right_x, col_w = self._col_layout()

        bar_y = 38
        bar_h = 40

        # Header band above the blue bar. The logo (left) and the company name
        # (right) are both vertically centred within this band so they line up.
        band_top = 8.0
        band_bottom = bar_y - 3.0
        band_center = (band_top + band_bottom) / 2

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
                ly = band_center - h / 2
                self.image(logo_path, lx, ly, w, h)
            except Exception:
                pass

        # ── Company name (right side, above bar) ──
        company_name = self.data.get("company_name", "")
        if company_name:
            self.set_font("Helvetica", "B", 15)
            self.set_text_color(*self.primary_color)
            name_text = self._to_pdf_text(company_name.upper())
            line_h = 6.0
            n_lines = self._count_wrapped_lines(name_text, col_w)
            name_y = band_center - (n_lines * line_h) / 2
            self.set_xy(right_x, name_y)
            self.multi_cell(col_w, line_h, name_text, 0, "C")

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

        # Pin the footer to the bottom of the page (Classic layout). The content
        # above is bounded by `bottom_limit`, so it never overlaps the footer.
        footer_h_mm = self.footer_layout['footer_h_mm']
        footer_top_y = self.h - footer_h_mm
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


class _TemplatePDF(FPDF):
    """Shared bounded drawing helpers for the reference-inspired templates."""

    def __init__(self, data, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.data = data or {}
        colors = self.data.get("logo_color", [PRIMARY_BLUE, LIGHT_BLUE])
        self.primary_color = tuple(colors[0]) if colors else PRIMARY_BLUE
        self.secondary_color = tuple(colors[1]) if len(colors) > 1 else LIGHT_BLUE
        self.set_auto_page_break(auto=False)

    def _to_pdf_text(self, text):
        return PDF._to_pdf_text(self, text)

    def _items(self, value):
        if not value:
            return []
        if isinstance(value, str):
            return [value.strip()] if value.strip() else []
        return [str(item).strip() for item in value if str(item).strip()]

    def _dark_primary(self):
        return tuple(max(0, int(channel * 0.62)) for channel in self.primary_color)

    def _distributed_gap(self, y, bottom, remaining, maximum=32):
        if remaining <= 0:
            return 0
        return max(0, min(maximum, (bottom - y) / (remaining + 1)))

    def _rounded_fill(self, x, y, width, height, color, radius=3):
        radius = min(radius, width / 2, height / 2)
        self.set_fill_color(*color)
        self.rect(x + radius, y, width - 2 * radius, height, "F")
        self.rect(x, y + radius, width, height - 2 * radius, "F")
        self.ellipse(x, y, radius * 2, radius * 2, "F")
        self.ellipse(x + width - radius * 2, y, radius * 2, radius * 2, "F")
        self.ellipse(x, y + height - radius * 2, radius * 2, radius * 2, "F")
        self.ellipse(
            x + width - radius * 2, y + height - radius * 2,
            radius * 2, radius * 2, "F",
        )

    def _wrap(self, text, width):
        text = self._to_pdf_text(text or "")
        lines = []
        for paragraph in str(text).splitlines() or [""]:
            words = paragraph.split()
            if not words:
                lines.append("")
                continue
            line = ""
            for word in words:
                if self.get_string_width(word) > width:
                    if line:
                        lines.append(line)
                        line = ""
                    part = ""
                    for char in word:
                        if self.get_string_width(part + char) > width and part:
                            lines.append(part)
                            part = char
                        else:
                            part += char
                    line = part
                    continue
                candidate = word if not line else line + " " + word
                if line and self.get_string_width(candidate) > width:
                    lines.append(line)
                    line = word
                else:
                    line = candidate
            if line:
                lines.append(line)
        return lines or [""]

    def _limited_lines(self, lines, max_lines, width):
        if len(lines) <= max_lines:
            return lines
        kept = lines[:max(1, max_lines)]
        suffix = "..."
        last = kept[-1]
        while last and self.get_string_width(last + suffix) > width:
            last = last[:-1].rstrip()
        kept[-1] = last + suffix
        return kept

    def _draw_lines(
        self, text, x, y, width, font_size=8, line_height=4,
        max_lines=10, style="", color=BLACK, align="L",
    ):
        if not text or max_lines <= 0:
            return y
        self.set_font("Helvetica", style, font_size)
        self.set_text_color(*color)
        lines = self._limited_lines(self._wrap(text, width), max_lines, width)
        for line in lines:
            self.set_xy(x, y)
            self.cell(width, line_height, line, 0, 1, align)
            y += line_height
        return y

    def _list_lines(self, items, width, max_lines, check=False):
        lines = []
        bullet = ">" if check else chr(0x95)
        for item in self._items(items):
            wrapped = self._wrap(item, width - 5)
            for index, line in enumerate(wrapped):
                lines.append((bullet if index == 0 else " ", line))
        if len(lines) <= max_lines:
            return lines
        kept = lines[:max(1, max_lines)]
        marker, line = kept[-1]
        suffix = "..."
        while line and self.get_string_width(line + suffix) > width - 5:
            line = line[:-1].rstrip()
        kept[-1] = (marker, line + suffix)
        return kept

    def _draw_list(
        self, items, x, y, width, font_size=8, line_height=4,
        max_lines=10, color=BLACK, check=False, style="",
    ):
        if not items or max_lines <= 0:
            return y
        self.set_font("Helvetica", style, font_size)
        self.set_text_color(*color)
        for marker, line in self._list_lines(items, width, max_lines, check):
            self.set_xy(x, y)
            if check and marker.strip():
                try:
                    self.set_font("ZapfDingbats", "", font_size)
                    self.cell(5, line_height, chr(52), 0, 0, "L")
                except Exception:
                    self.set_font("Helvetica", style, font_size)
                    self.cell(5, line_height, chr(0x95), 0, 0, "L")
                self.set_font("Helvetica", style, font_size)
            else:
                self.cell(5, line_height, marker, 0, 0, "L")
            self.cell(width - 5, line_height, line, 0, 1, "L")
            y += line_height
        return y

    def _safe_image(self, path, x, y, max_width, max_height, align="center"):
        if not path or not os.path.exists(path):
            return False
        try:
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                image_width, image_height = image.size
            if not image_width or not image_height:
                return False
            scale = min(max_width / image_width, max_height / image_height)
            width = image_width * scale
            height = image_height * scale
            if align == "right":
                image_x = x + max_width - width
            elif align == "left":
                image_x = x
            else:
                image_x = x + (max_width - width) / 2
            image_y = y + (max_height - height) / 2
            self.image(path, image_x, image_y, width, height)
            return True
        except Exception:
            return False

    def _cover_image(self, path, x, y, width, height):
        if not path or not os.path.exists(path):
            return False
        temporary_path = None
        try:
            with Image.open(path) as source:
                source.verify()
            with Image.open(path) as source:
                image = source.convert("RGB")
                source_ratio = image.width / image.height
                target_ratio = width / height
                if source_ratio > target_ratio:
                    crop_width = int(image.height * target_ratio)
                    left = (image.width - crop_width) // 2
                    image = image.crop((left, 0, left + crop_width, image.height))
                else:
                    crop_height = int(image.width / target_ratio)
                    top = (image.height - crop_height) // 2
                    image = image.crop((0, top, image.width, top + crop_height))
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as handle:
                    temporary_path = handle.name
                image.save(temporary_path)
            self.image(temporary_path, x, y, width, height)
            return True
        except Exception:
            return False
        finally:
            if temporary_path:
                try:
                    os.unlink(temporary_path)
                except OSError:
                    pass

    def _image_aspect_ratio(self, path):
        if not path or not os.path.exists(path):
            return None
        try:
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                if not image.height:
                    return None
                return image.width / image.height
        except Exception:
            return None

    def _draw_badges(self, certifications, x, y, width, size=12, align="left"):
        paths = []
        for cert in self._items(certifications):
            cert_text = cert.lower()
            for label, path in CERT_BADGES.items():
                if label.lower() in cert_text and os.path.exists(path):
                    if path not in paths:
                        paths.append(path)
                    break
        paths = paths[:max(1, int(width // (size + 2)))]
        total = len(paths) * size + max(0, len(paths) - 1) * 2
        start_x = x + (width - total if align == "right" else 0)
        for path in paths:
            self._safe_image(path, start_x, y, size, size)
            start_x += size + 2
        return len(paths)

    def _contact_address(self):
        first = self.data.get("contact_address", "")
        second = ", ".join(filter(None, [
            self.data.get("city", ""), self.data.get("state", ""),
            self.data.get("zip", ""),
        ]))
        return "\n".join(filter(None, [first, second]))

    def _draw_contact(self, x, y, width, line_height=4, max_lines=7, align="L"):
        lines = []
        for value in (
            self.data.get("contact_name"),
            self.data.get("contact_title"),
            self.data.get("contact_phone"),
            self.data.get("contact_email"),
            self._contact_address(),
            self.data.get("contact_website"),
        ):
            if value:
                lines.extend(self._wrap(value, width))
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(*BLACK)
        for line in self._limited_lines(lines, max_lines, width):
            self.set_xy(x, y)
            self.cell(width, line_height, line, 0, 1, align)
            y += line_height
        return y

    def _section_title(self, title, x, y, width, color, height=8, size=8.5):
        self._rounded_fill(x, y, width, height, color, radius=2)
        self.set_xy(x + 2, y + 1)
        self.set_font("Helvetica", "B", size)
        self.set_text_color(*WHITE)
        self.cell(width - 4, height - 2, self._to_pdf_text(title.upper()), 0, 0, "L")
        return y + height


class CorporatePDF(_TemplatePDF):
    """Corporate two-column capability statement."""

    def create_content(self):
        margin = 8
        footer_top = self.h - 3
        header_h = 35
        self.set_fill_color(*self.primary_color)
        self.rect(0, 0, self.w, header_h, "F")
        self._safe_image(self.data.get("logo_path"), margin, 7, 27, 20, "left")
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*WHITE)
        self.set_xy(margin + 31, 11)
        self.cell(73, 9, self._to_pdf_text(self.data.get("company_name", "")), 0, 0, "L")
        self._rounded_fill(self.w - margin - 68, 11, 60, 13, self.secondary_color, 3)
        self.set_xy(self.w - margin - 66, 14)
        self.set_font("Helvetica", "B", 9)
        self.cell(56, 6, "CAPABILITY STATEMENT", 0, 0, "C")

        left_x, right_x = margin, self.w / 2 + 3
        col_w = (self.w - 2 * margin - 7) / 2
        self.set_draw_color(*self.primary_color)
        self.set_line_width(0.35)
        self.line(self.w / 2, header_h + 4, self.w / 2, footer_top - 2)
        left_y = right_y = header_h + 7
        bottom = footer_top - 4
        description = self.data.get("company_description")
        differentiators = self.data.get("differentiators")
        contact_values = any(self.data.get(key) for key in (
            "contact_name", "contact_title", "contact_phone", "contact_email",
            "contact_address", "city", "state", "zip", "contact_website",
        ))
        competencies = self.data.get("core_competencies")
        performance = self.data.get("private_performance")
        snapshot_values = any(self.data.get(key) for key in (
            "uei_code", "cage_code", "naics_codes", "certifications",
        ))
        self.set_font("Helvetica", "", 8)
        description_lines = min(
            10, len(self._wrap(description, col_w - 8))
        ) if description else 0
        who_box_h = description_lines * 4 + 6 if description else 0
        snapshot_lines = []
        if self.data.get("uei_code"):
            snapshot_lines.append("UEI: " + str(self.data["uei_code"]))
        if self.data.get("cage_code"):
            snapshot_lines.append("CAGE: " + str(self.data["cage_code"]))
        if self.data.get("naics_codes"):
            naics_text = "NAICS: " + ", ".join(self._items(self.data["naics_codes"]))
            snapshot_lines.extend(self._limited_lines(
                self._wrap(naics_text, col_w - 8), 1, col_w - 8,
            ))
        if self.data.get("certifications"):
            certifications_text = "CERTIFICATIONS: " + ", ".join(
                self._items(self.data["certifications"])
            )
            snapshot_lines.extend(self._limited_lines(
                self._wrap(certifications_text, col_w - 8), 1, col_w - 8,
            ))
        content_lines = len(snapshot_lines) or 1
        badge_h = 13 if self.data.get("certifications") else 0
        snapshot_h = min(52, max(
            18, content_lines * 3.7 + badge_h + 7
        ))

        if description:
            left_y = self._section_title("Who We Are", left_x, left_y, col_w, self.secondary_color) + 2
            self.set_font("Helvetica", "", 8)
            self.set_fill_color(*LIGHT_GRAY)
            self.rect(left_x, left_y, col_w, who_box_h, "F")
            content_end = self._draw_lines(
                description, left_x + 4, left_y + 3, col_w - 8,
                font_size=8, max_lines=description_lines,
            )
            left_y = max(content_end + 5, left_y + who_box_h + 2) + 5

        if differentiators:
            left_y = self._section_title("Differentiators", left_x, left_y, col_w, self.secondary_color) + 2
            left_y = self._draw_list(
                differentiators, left_x + 3, left_y, col_w - 6,
                font_size=7.5, max_lines=12, check=True,
            ) + 4
            left_y += 5

        if contact_values:
            left_y = self._section_title("Contact Information", left_x, left_y, col_w, self.secondary_color) + 2
            contact_fields = (
                (self.data.get("contact_name"), True),
                (self.data.get("contact_title"), False),
                (self.data.get("contact_phone"), True),
                (self.data.get("contact_email"), False),
                (self._contact_address(), False),
                (self.data.get("contact_website"), True),
            )
            contact_y = left_y
            for value, bold in contact_fields:
                if not value:
                    continue
                self.set_font("Helvetica", "B" if bold else "", 7.5)
                self.set_text_color(*BLACK)
                for line in self._wrap(value, col_w - 6):
                    if contact_y + 4 > bottom:
                        break
                    self.set_xy(left_x + 3, contact_y)
                    self.cell(col_w - 6, 4, line, 0, 1, "L")
                    contact_y += 4
            left_y = contact_y + 2
            left_y += 5

        if competencies:
            right_y = self._section_title("Services", right_x, right_y, col_w, self.primary_color) + 2
            right_y = self._draw_list(
                competencies, right_x + 3, right_y, col_w - 6,
                font_size=7.5, max_lines=12,
            ) + 4
            right_y += 5

        if performance:
            right_y = self._section_title("Past Performance", right_x, right_y, col_w, self.primary_color) + 2
            right_y = self._draw_list(
                performance, right_x + 3, right_y, col_w - 6,
                font_size=7.2, max_lines=9,
            ) + 2
            if self.data.get("image_path") and right_y + 25 < bottom:
                self._safe_image(self.data.get("image_path"), right_x, right_y, col_w, 26)
                right_y += 28
            right_y += 5

        if snapshot_values:
            right_y = self._section_title("Corporate Snapshot", right_x, right_y, col_w, self.primary_color) + 2
            self.set_font("Helvetica", "", 7.2)
            content_lines = len(snapshot_lines) or 1
            badge_h = 13 if self.data.get("certifications") else 0
            snapshot_h = min(snapshot_h, max(1, bottom - right_y))
            self.set_fill_color(*LIGHT_GRAY)
            self.rect(right_x, right_y, col_w, snapshot_h, "F")
            self._draw_lines(
                "\n".join(snapshot_lines), right_x + 4, right_y + 3, col_w - 8,
                font_size=7.2, line_height=3.7,
                max_lines=max(1, min(content_lines, int(
                    (snapshot_h - badge_h - 5) / 3.7
                ))),
            )
            if self.data.get("certifications"):
                self._draw_badges(
                    self.data["certifications"], right_x + 4,
                    right_y + 3 + content_lines * 3.7 + 1, col_w - 8, size=10,
                )
            right_y += snapshot_h + 4
            right_y += 5

        self.set_fill_color(*self.primary_color)
        self.rect(0, self.h - 3, self.w, 3, "F")


class BandedPDF(_TemplatePDF):
    """Full-width banded capability statement."""

    def create_content(self):
        margin = 8
        footer_top = self.h - 28
        self.set_fill_color(*self.primary_color)
        self.rect(0, 0, self.w, 34, "F")
        self._safe_image(self.data.get("logo_path"), margin, 6, 25, 20, "left")
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*self.secondary_color)
        self.set_xy(margin + 29, 12)
        self.cell(82, 8, self._to_pdf_text(self.data.get("company_name", "")), 0, 0, "L")
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*WHITE)
        self.set_xy(self.w - 78, 8)
        self.multi_cell(70, 6, "CAPABILITY\nSTATEMENT", 0, "R")
        self.set_fill_color(*self.secondary_color)
        self.rect(0, 34, self.w, 2, "F")

        y = 41
        bottom = footer_top - 4
        gap = 5
        dark = self._dark_primary()
        competencies = self.data.get("core_competencies")
        description = self.data.get("company_description")
        company_data = any(self.data.get(key) for key in (
            "uei_code", "cage_code", "naics_codes", "certifications",
        ))
        performance = self.data.get("private_performance")
        certifications = self.data.get("certifications")
        description_lines = len(self._wrap(
            description, self.w / 2 - 13
        )) if description else 1
        data_width = self.w / 2 - margin - 10
        values = []
        if self.data.get("uei_code"):
            values.append("UEI: " + str(self.data["uei_code"]))
        if self.data.get("cage_code"):
            values.append("CAGE: " + str(self.data["cage_code"]))
        if self.data.get("naics_codes"):
            naics_text = "NAICS: " + ", ".join(
                self._items(self.data["naics_codes"])
            )
            naics_max_lines = 5 if self.data.get("certifications") else 7
            values.append("\n".join(self._limited_lines(
                self._wrap(naics_text, data_width),
                naics_max_lines, data_width,
            )))
        if self.data.get("certifications"):
            certifications_text = "CERTIFICATIONS: " + ", ".join(
                self._items(self.data["certifications"])
            )
            values.append("\n".join(self._limited_lines(
                self._wrap(certifications_text, data_width),
                2, data_width,
            )))
        value_lines = sum(len(self._wrap(value, data_width)) for value in values)
        pair_h = min(42, max(
            18, max(description_lines, value_lines) * 3.7 + 8
        )) if (description or company_data) else 0
        perf_w = self.w - 2 * margin - (38 if certifications else 0)
        performance_lines = len(
            self._list_lines(performance, perf_w, 12)
        ) if performance else 0
        past_content_h = max(
            performance_lines * 3.8 + 3 if performance else 0,
            13 if certifications else 0,
        )
        if competencies:
            self.set_fill_color(*dark)
            self.rect(0, y, self.w, 8, "F")
            self.set_xy(margin, y + 1)
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(*LIGHT_GRAY)
            self.cell(self.w - 2 * margin, 6, "CORE COMPETENCIES", 0, 0, "L")
            y += 11
            y = self._draw_list(
                competencies, margin, y, self.w - 2 * margin,
                font_size=7.5, line_height=4, max_lines=7,
            ) + 3
            image_ratio = self._image_aspect_ratio(self.data.get("image_path"))
            if image_ratio:
                future_height = 0
                if description or company_data:
                    future_height += gap + 8 + 11 + pair_h + 4
                if performance or certifications:
                    future_height += gap + 8 + 11 + past_content_h
                available = bottom - y - future_height
                hero_h = min(35, available)
                if hero_h >= 15 and self._cover_image(
                    self.data["image_path"], 0, y, self.w, hero_h
                ):
                    y += hero_h + 3
            y += gap

        if description or company_data:
            self.set_fill_color(*dark)
            self.rect(0, y, self.w, 8, "F")
            self.set_xy(margin, y + 1)
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(*LIGHT_GRAY)
            self.cell((self.w - 2 * margin) / 2, 6, "WHO WE ARE", 0, 0, "L")
            self.set_xy(self.w / 2 + 3, y + 1)
            self.cell((self.w - 2 * margin) / 2, 6, "COMPANY DATA", 0, 0, "L")
            y += 11
            if description:
                self.set_fill_color(*LIGHT_GRAY)
                self.rect(margin, y, self.w / 2 - 5, pair_h, "F")
                self._draw_lines(
                    description, margin + 4, y + 3, self.w / 2 - 13,
                    font_size=7.4, line_height=3.7, max_lines=10,
                )
            self._draw_list(
                values, self.w / 2 + 3, y + 3, self.w / 2 - margin - 5,
                font_size=7.3, line_height=4, max_lines=9, check=True,
            )
            y += pair_h + 4
            y += gap

        if performance or certifications:
            self.set_fill_color(*dark)
            self.rect(0, y, self.w, 8, "F")
            self.set_xy(margin, y + 1)
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(*LIGHT_GRAY)
            self.cell(self.w - 2 * margin, 6, "PAST PERFORMANCE", 0, 0, "L")
            y += 11
            if performance:
                available_lines = max(1, int((footer_top - y - 4) / 3.8))
                y = self._draw_list(
                    performance, margin, y, perf_w,
                    font_size=7.2, line_height=3.8, max_lines=min(12, available_lines),
                ) + 3
            if certifications:
                self._draw_badges(
                    certifications, self.w - margin - 34,
                    min(y, footer_top - 13), 34, size=11, align="right"
                )

        self.set_fill_color(*self.primary_color)
        self.rect(0, footer_top, self.w, self.h - footer_top, "F")
        usable = self.w - 2 * margin
        col_w = usable / 3
        self.set_text_color(*WHITE)
        self.set_font("Helvetica", "B", 7)
        self._draw_lines(
            "\n".join(filter(None, [
                self.data.get("company_name"), self.data.get("contact_address"),
                ", ".join(filter(None, [self.data.get("city"), self.data.get("state"), self.data.get("zip")])),
                self.data.get("contact_phone"),
            ])),
            margin, footer_top + 4, col_w - 2, font_size=6.5, line_height=3.5, max_lines=5, color=WHITE,
        )
        self._draw_lines(
            self.data.get("contact_website", ""), margin + col_w, footer_top + 10,
            col_w - 2, font_size=7, line_height=4, max_lines=2, color=WHITE, align="C",
        )
        self._draw_lines(
            "\n".join(filter(None, [
                self.data.get("contact_name"), self.data.get("contact_title"),
                self.data.get("contact_email"), self.data.get("contact_phone"),
            ])),
            margin + col_w * 2, footer_top + 4, col_w - 2,
            font_size=6.5, line_height=3.5, max_lines=5, color=WHITE, align="R",
        )


class RailPDF(_TemplatePDF):
    """Capability statement with a narrow labeled left rail."""

    def create_content(self):
        margin = 7
        rail_w = 42
        footer_top = self.h - 25
        self.set_fill_color(*self.primary_color)
        self.rect(0, 0, self.w, 2, "F")
        self._safe_image(self.data.get("logo_path"), margin + rail_w, 7, 28, 18, "left")
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(*self.primary_color)
        self.set_xy(margin + rail_w + 31, 11)
        self.cell(65, 8, self._to_pdf_text(self.data.get("company_name", "")), 0, 0, "L")
        self.set_font("Helvetica", "B", 9)
        self.set_xy(self.w - 73, 8)
        self.cell(66, 5, "CAPABILITY STATEMENT", 0, 0, "R")
        location = ", ".join(filter(None, [self.data.get("city"), self.data.get("state")]))
        if location:
            self.set_font("Helvetica", "", 7.5)
            self.set_xy(self.w - 73, 14)
            self.cell(66, 5, self._to_pdf_text(location), 0, 0, "R")

        self.set_fill_color(*self.primary_color)
        self.rect(0, 28, rail_w, footer_top - 28, "F")
        y = 30
        content_x = rail_w + 7
        content_w = self.w - content_x - 7
        block_count = sum(bool(value) for value in (
            self.data.get("company_description"),
            self.data.get("core_competencies"),
            self.data.get("differentiators"),
            self.data.get("private_performance"),
            self.data.get("certifications"),
            self.data.get("naics_codes"),
            self.data.get("uei_code") or self.data.get("cage_code"),
        ))
        block_index = 0

        def block(label, text=None, items=None, max_lines=8, image=False):
            nonlocal y, block_index
            if not text and not items:
                return
            self.set_draw_color(*self.primary_color)
            self.set_line_width(0.3)
            self.line(0, y, self.w, y)
            self.set_xy(4, y + 2)
            self.set_font("Helvetica", "B", 7.5)
            self.set_text_color(*WHITE)
            self.cell(rail_w - 8, 5, label, 0, 0, "L")
            text_w = content_w
            if image and self.data.get("image_path"):
                text_w -= 39
                image_y = y + 3
                image_drawn = self._safe_image(
                    self.data["image_path"], self.w - 43, image_y, 36, 25, "right"
                )
            else:
                image_drawn = False
            start = y + 3
            if text:
                end = self._draw_lines(
                    text, content_x, start, text_w, font_size=7.1,
                    line_height=3.6, max_lines=max_lines,
                )
            else:
                end = self._draw_list(
                    items, content_x, start, text_w, font_size=7.1,
                    line_height=3.6, max_lines=max_lines, check=True,
                )
            if image_drawn:
                end = max(end, image_y + 25)
            y = min(footer_top - 3, max(y + 14, end + 3))
            block_index += 1
            y += self._distributed_gap(y, footer_top - 3, block_count - block_index, maximum=18)

        block("ABOUT", text=self.data.get("company_description"), max_lines=8)
        block("COMPETENCIES", items=self.data.get("core_competencies"), max_lines=9, image=True)
        block("DIFFERENTIATORS", items=self.data.get("differentiators"), max_lines=8)
        block("PAST PERFORMANCE", items=self.data.get("private_performance"), max_lines=8)
        certs = self.data.get("certifications")
        if certs:
            block("CERTIFICATIONS", items=certs, max_lines=4)
            self._draw_badges(certs, content_x, y - 1, content_w, size=10)
            y += 12
        if self.data.get("naics_codes"):
            block("NAICS", text=", ".join(self._items(self.data["naics_codes"])), max_lines=3)
        identifiers = "  /  ".join(filter(None, [
            ("UEI " + str(self.data["uei_code"])) if self.data.get("uei_code") else "",
            ("CAGE " + str(self.data["cage_code"])) if self.data.get("cage_code") else "",
        ]))
        block("UEI / CAGE", text=identifiers, max_lines=2)

        self.set_fill_color(*self.primary_color)
        self.rect(0, footer_top, self.w, self.h - footer_top, "F")
        self.set_text_color(*WHITE)
        contact = " | ".join(filter(None, [
            self.data.get("contact_name"), self.data.get("contact_title"),
            self.data.get("company_name"),
        ]))
        address = " | ".join(filter(None, [
            self._contact_address(), self.data.get("contact_phone"),
            self.data.get("contact_email"),
        ]))
        self._draw_lines(contact, rail_w + 7, footer_top + 3, self.w - rail_w - 14,
                         font_size=7, line_height=3.5, max_lines=1, color=WHITE, align="C")
        self._draw_lines(address, rail_w + 7, footer_top + 7, self.w - rail_w - 14,
                         font_size=6.5, line_height=3.5, max_lines=2, color=WHITE, align="C")
        self._draw_lines(self.data.get("contact_website", ""), rail_w + 7, footer_top + 17,
                         self.w - rail_w - 14, font_size=7, line_height=3.5,
                         max_lines=1, color=WHITE, align="C")


class ProductPDF(_TemplatePDF):
    """Product-style hero and two-column capability statement."""

    def create_content(self):
        margin = 8
        footer_top = self.h - 27
        hero_h = 43
        self.set_fill_color(*self.primary_color)
        self.rect(0, 0, self.w, hero_h, "F")
        if self.data.get("image_path"):
            self._cover_image(self.data["image_path"], 0, 0, self.w, hero_h)
        strip_w = min(100, self.w * 0.42)
        self.set_fill_color(*self._dark_primary())
        self.rect(0, 0, strip_w, hero_h, "F")
        self._safe_image(self.data.get("logo_path"), margin, 7, 26, 20, "left")
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(*WHITE)
        self._draw_lines(
            self.data.get("company_name", ""), margin + 30, 12,
            strip_w - margin - 33, font_size=15, line_height=7.5, max_lines=3,
            style="B", color=WHITE,
        )
        self.set_fill_color(*self.secondary_color)
        self.rect(0, hero_h, self.w, 3, "F")

        left_x, right_x = margin, self.w / 2 + 3
        col_w = (self.w - 2 * margin - 7) / 2
        left_y = right_y = hero_h + 8
        bottom = footer_top - 4
        description = self.data.get("company_description")
        differentiators = self.data.get("differentiators")
        performance = self.data.get("private_performance")
        competencies = self.data.get("core_competencies")
        data_values = any(self.data.get(key) for key in ("uei_code", "cage_code", "naics_codes"))
        certifications = self.data.get("certifications")
        gap = 5
        competency_lines = len(
            self._list_lines(competencies, col_w - 8, 13, check=True)
        ) if competencies else 0
        expertise_base_h = (
            max(20, competency_lines * 3.8 + 8) if competencies else 0
        )
        naics = self._items(self.data.get("naics_codes"))
        naics_cols = 3
        naics_rows = min(6, (len(naics) + naics_cols - 1) // naics_cols)
        data_base_h = (
            min(54, max(20, 16 + max(0, naics_rows) * 4))
            if data_values else 0
        )
        certification_lines = len(
            self._list_lines(certifications, col_w - 3, 7)
        ) if certifications else 0
        def heading(title, x, y):
            self.set_xy(x, y)
            self.set_font("Helvetica", "B", 12)
            self.set_text_color(*self.primary_color)
            self.cell(col_w, 7, title, 0, 1, "L")
            return y + 8

        if description:
            left_y = heading("Corporate Overview", left_x, left_y)
            description_lines = max(1, int((bottom - left_y - 5) / 3.8))
            left_y = self._draw_lines(
                description, left_x, left_y, col_w - 3,
                font_size=7.5, line_height=3.8, max_lines=min(10, description_lines),
            ) + 5
            left_y += gap

        if differentiators:
            left_y = heading("Our Approach", left_x, left_y)
            differentiator_lines = max(1, int((bottom - left_y - 5) / 3.8))
            left_y = self._draw_list(
                differentiators, left_x, left_y, col_w - 3,
                font_size=7.2, line_height=3.8,
                max_lines=min(10, differentiator_lines),
            ) + 5
            left_y += gap

        if performance:
            left_y = heading("Past Performance", left_x, left_y)
            performance_lines = max(1, int((bottom - left_y) / 3.7))
            left_y = self._draw_list(
                performance, left_x, left_y, col_w - 3,
                font_size=7.1, line_height=3.7, max_lines=min(10, performance_lines),
            )
            left_y += gap

        if competencies:
            right_y = heading("Areas of Expertise", right_x, right_y)
            panel_h = expertise_base_h
            self.set_fill_color(*LIGHT_GRAY)
            self.rect(right_x, right_y, col_w, panel_h, "F")
            self._draw_list(
                competencies, right_x + 4, right_y + 4, col_w - 8,
                font_size=7.2, line_height=3.8, max_lines=13, check=True,
            )
            right_y += panel_h + 6
            right_y += gap

        if data_values:
            right_y = heading("Company Data", right_x, right_y)
            panel_h = data_base_h
            self.set_fill_color(*LIGHT_GRAY)
            self.rect(right_x, right_y, col_w, panel_h, "F")
            value_y = right_y + 4
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*BLACK)
            if self.data.get("uei_code"):
                self.set_xy(right_x + 4, value_y)
                self.cell(col_w - 8, 3.7, "UEI: " + str(self.data["uei_code"]), 0, 1, "L")
                value_y += 4
            if self.data.get("cage_code"):
                self.set_xy(right_x + 4, value_y)
                self.cell(col_w - 8, 3.7, "CAGE: " + str(self.data["cage_code"]), 0, 1, "L")
                value_y += 4
            if naics:
                self.set_font("Helvetica", "", 6.5)
                self.set_xy(right_x + 4, value_y)
                self.cell(col_w - 8, 3.5, "NAICS", 0, 1, "L")
                value_y += 4
                visible_naics = naics[:naics_cols * 6]
                if len(naics) > len(visible_naics):
                    visible_naics[-1] = visible_naics[-1] + "..."
                cell_w = (col_w - 8) / naics_cols
                for index, code in enumerate(visible_naics):
                    col = index % naics_cols
                    row = index // naics_cols
                    self.set_xy(right_x + 4 + col * cell_w, value_y + row * 4)
                    self.cell(cell_w, 3.5, self._to_pdf_text(code), 0, 0, "L")
            right_y += panel_h + 6
            right_y += gap

        if certifications:
            right_y = heading("Certifications", right_x, right_y)
            right_y = self._draw_list(
                certifications, right_x, right_y, col_w - 3,
                font_size=7.1, line_height=3.7,
                max_lines=min(7, certification_lines),
            )
            badge_y = min(right_y + 1, bottom - 13)
            self._draw_badges(certifications, right_x, badge_y, col_w, size=11)
            right_y = max(right_y, badge_y + 11)
            right_y += gap

        self.set_fill_color(*LIGHT_GRAY)
        self.rect(0, footer_top, self.w, self.h - footer_top, "F")
        usable = self.w - 2 * margin
        col_w_footer = usable / 3
        self._draw_lines(
            "\n".join(filter(None, [
                self.data.get("contact_name"), self.data.get("contact_title"),
                self.data.get("contact_phone"), self.data.get("contact_email"),
            ])),
            margin, footer_top + 4, col_w_footer - 2, font_size=6.5,
            line_height=3.5, max_lines=5,
        )
        self._draw_lines(
            "\n".join(filter(None, [
                self.data.get("company_name"), self._contact_address(),
            ])),
            margin + col_w_footer, footer_top + 4, col_w_footer - 2,
            font_size=6.5, line_height=3.5, max_lines=5, align="C",
        )
        self._draw_lines(
            self.data.get("contact_website", ""), margin + col_w_footer * 2,
            footer_top + 10, col_w_footer - 2, font_size=7,
            line_height=4, max_lines=2, align="R",
        )


def create_pdf(data, output_path="output.pdf", template="default"):
    """Create a professional capability statement PDF.

    Args:
        data: dict with capability statement fields.
        output_path: destination file path.
        template: 'default'/'modern' for the existing layouts, or
            'corporate', 'banded', 'rail', or 'product' for new layouts.
    """
    template_classes = {
        "corporate": CorporatePDF,
        "banded": BandedPDF,
        "rail": RailPDF,
        "product": ProductPDF,
    }
    if template in template_classes:
        pdf = template_classes[template](data)
    elif template == "modern":
        pdf = ModernPDF(data)
    else:
        pdf = PDF(data)
    pdf.add_page()
    pdf.create_content()
    pdf.output(output_path)
    return output_path
