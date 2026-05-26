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

    def header(self):
        """Professional header with tall capability statement rectangle"""
        margin = 2.5
        gutter = 2.5
        available = self.w - 2 * margin - gutter
        col_width = available / 2
        left_x = margin
        right_x = margin + col_width + gutter
        
        blank_above_mm = 38.6
        rect_height_mm = 41.1
        bar_y = blank_above_mm
        
        # Company name on right side (upper right) - bold and larger
        self.set_xy(right_x, 10)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*self.primary_color)
        company_name = self.data.get("company_name", "")
        company_name_upper = self._to_pdf_text(company_name.upper())
        self.multi_cell(col_width, 6, company_name_upper, 0, "C")
        
        hero_img_y = self.get_y() + 2
        
        self.set_fill_color(*self.primary_color)
        self.rect(0, bar_y, self.w, rect_height_mm, 'F')
        
        # Hero image on right side below company name (drawn after rectangle to appear in front)
        image_path = self.data.get("image_path")
        if image_path and os.path.exists(image_path):
            try:
                img = Image.open(image_path)
                img_width, img_height = img.size
                aspect_ratio = img_width / img_height
                
                img_x = right_x
                
                hero_target_h_mm = 56.5
                bar_bottom = bar_y + rect_height_mm
                height_by_bottom = bar_bottom - hero_img_y
                
                img_display_height = min(hero_target_h_mm, height_by_bottom)
                img_display_width = img_display_height * aspect_ratio
                
                if img_display_width > col_width:
                    img_display_width = col_width
                    img_display_height = img_display_width / aspect_ratio
                
                epsilon_mm = 0.4
                img_y = bar_bottom - img_display_height - epsilon_mm
                
                self.image(image_path, img_x, img_y, img_display_width, img_display_height)
            except:
                pass
        
        logo_path = self.data.get("logo_path")
        if logo_path and os.path.exists(logo_path):
            try:
                logo = Image.open(logo_path)
                logo_width, logo_height = logo.size
                aspect_ratio = logo_width / logo_height
                logo_h = 35
                logo_w = logo_h * aspect_ratio
                
                if logo_w > col_width:
                    logo_w = col_width
                    logo_h = logo_w / aspect_ratio
                
                logo_clearance_mm = 0.8
                logo_y = bar_y - logo_h - logo_clearance_mm
                logo_x = left_x + (col_width - logo_w) / 2
                
                self.image(logo_path, logo_x, logo_y, logo_w, logo_h)
            except:
                pass
        
        capability_text = ' '.join(list('CAPABILITY'))
        statement_text = ' '.join(list('STATEMENT'))
        
        line_height = 10.0
        gap = 4.0
        block_height = line_height * 2 + gap
        top_y = bar_y + (rect_height_mm - block_height) / 2
        
        self.set_xy(left_x, top_y)
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(*WHITE)
        self.cell(col_width, line_height, capability_text, 0, 1, "C")
        
        self.set_xy(left_x, top_y + line_height + gap)
        self.set_font("Helvetica", "B", 22)
        self.cell(col_width, line_height, statement_text, 0, 1, "C")
        
        uei = self.data.get("uei_code", "")
        cage = self.data.get("cage_code", "")
        codes_text = ""
        if uei:
            codes_text += f"DUNS: {uei}"
        if cage:
            if codes_text:
                codes_text += "     "
            codes_text += f"CAGE Code: {cage}"
        
        if codes_text:
            codes_gap_mm = 2.0
            codes_y = top_y + line_height * 2 + gap + codes_gap_mm
            self.set_xy(left_x, codes_y)
            self.set_font("Helvetica", "", 7)
            self.cell(col_width, 6, self._to_pdf_text(codes_text), 0, 0, "C")
        
        self.set_text_color(*BLACK)
        self.set_y(bar_y + rect_height_mm + 4)

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
        """Professional footer with contact information and certification badges"""
        if self.footer_layout is None:
            return
        
        layout = self.footer_layout
        
        self.set_fill_color(*FOOTER_GRAY)
        self.rect(0, layout['footer_top_y'], self.w, layout['footer_h_mm'], 'F')
        
        self.set_xy(12, layout['label_y'])
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*WHITE)
        self.cell(0, 5, "POINT OF CONTACT", 0, 1, "L")
        
        self.set_font("Helvetica", "", 8)
        y_pos = layout['cols_y']
        
        self.set_xy(12, y_pos)
        contact_name = self.data.get("contact_name", "")
        contact_title = self.data.get("contact_title", "")
        if contact_name:
            self.cell(55, 4, self._to_pdf_text(contact_name), 0, 1, "L")
        if contact_title:
            self.set_x(12)
            self.cell(55, 4, self._to_pdf_text(contact_title), 0, 1, "L")
        
        self.set_xy(70, y_pos)
        phone = self.data.get("contact_phone", "")
        email = self.data.get("contact_email", "")
        website = self.data.get("contact_website", "")
        
        if phone:
            self.cell(65, 4, self._to_pdf_text(f"P: {phone}"), 0, 1, "L")
        if email:
            self.set_x(70)
            self.cell(65, 4, self._to_pdf_text(f"E: {email}"), 0, 1, "L")
        if website:
            self.set_x(70)
            self.cell(65, 4, self._to_pdf_text(f"W: {website}"), 0, 1, "L")
        
        self.set_xy(140, y_pos)
        address_parts = []
        if self.data.get("contact_address"):
            address_parts.append(self.data.get("contact_address"))
        city_state_zip = ", ".join(filter(None, [
            self.data.get("city", ""),
            self.data.get("state", ""),
            self.data.get("zip", "")
        ]))
        if city_state_zip:
            address_parts.append(city_state_zip)
        
        if address_parts:
            self.multi_cell(55, 4, self._to_pdf_text("\n".join(address_parts)), 0, "L")
        
        certifications = self.data.get("certifications", [])
        if certifications:
            badge_x = 140
            badge_y = layout['badge_y']
            badge_size = 12
            badge_spacing = 2
            
            for cert in certifications[:5]:
                cert_str = str(cert).strip()
                badge_path = None
                
                for cert_key, path in CERT_BADGES.items():
                    if cert_key.lower() in cert_str.lower():
                        badge_path = path
                        break
                
                if badge_path and os.path.exists(badge_path):
                    try:
                        self.image(badge_path, badge_x, badge_y, badge_size, badge_size)
                        badge_x += badge_size + badge_spacing
                        if badge_x > self.w - 15:
                            break
                    except:
                        pass
        
        self.set_text_color(*BLACK)

    def section_title(self, title, x, y, width, use_secondary_bg=True):
        """Create a professional section title with background matching reference design"""
        self.set_xy(x, y)
        if use_secondary_bg:
            self.set_fill_color(*self.secondary_color)
        else:
            self.set_fill_color(*LIGHT_GRAY)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*BLACK)
        self.cell(width, 9, self._to_pdf_text(title), 0, 1, "C", True)
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
                        self.cell(width, line_height, self._to_pdf_text(prev_line + "..."), 0, 0, "J")
                break
            
            self.set_xy(x, y)
            self.cell(width, line_height, self._to_pdf_text(line), 0, 0, "J")
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
        """Create the main content in a professional 2-column layout, strictly single-page"""
        blank_above_mm = 38.6
        rect_height_mm = 41.1
        spacing_mm = 4
        start_y = blank_above_mm + rect_height_mm + spacing_mm
        
        self.footer_layout = self.compute_footer_layout()
        gap_above_footer_mm = 8.0
        bottom_limit = self.h - self.footer_layout['footer_h_mm'] - gap_above_footer_mm
        
        margin = 2.5
        gutter = 2.5
        available = self.w - 2 * margin - gutter
        col_width = available / 2
        left_x = margin
        right_x = margin + col_width + gutter
        
        assert left_x >= margin, f"Left column too close to edge: {left_x}"
        assert right_x + col_width <= self.w - margin, f"Right column too close to edge: {right_x + col_width}"
        
        left_y = start_y
        right_y = start_y
        
        company_desc = self.data.get("company_description", "")
        if company_desc:
            left_y = self.section_title("ABOUT US", left_x, left_y, col_width, use_secondary_bg=False)
            left_y = self.add_paragraph_bounded(company_desc, left_x + 4, left_y + 2, col_width - 8, font_size=8.0, line_height=4.0, bottom_limit=bottom_limit)
            left_y += 4
        
        naics_codes = self.data.get("naics_codes", [])
        if naics_codes:
            max_codes = min(len(naics_codes), int((bottom_limit - right_y - 11) / 6.5))
            if max_codes > 0:
                codes_to_show = naics_codes[:max_codes]
                naics_height = 11 + (len(codes_to_show) * 6.5)
                self.set_fill_color(*self.secondary_color)
                self.rect(right_x, right_y, col_width, naics_height, 'F')
                
                self.set_xy(right_x + 4, right_y + 2)
                self.set_font("Helvetica", "B", 12)
                self.cell(col_width - 8, 7, "NAICS CODE", 0, 1, "L")
                
                self.set_font("Helvetica", "", 8.0)
                naics_text_y = right_y + 11
                for code in codes_to_show:
                    self.set_xy(right_x + 6, naics_text_y)
                    self.cell(3, 5.5, chr(0x95), 0, 0, "L")
                    self.set_xy(right_x + 11, naics_text_y)
                    self.cell(col_width - 17, 5.5, self._to_pdf_text(str(code)), 0, 1, "L")
                    naics_text_y += 6.5
                
                if max_codes < len(naics_codes):
                    self.set_xy(right_x + 6, naics_text_y)
                    self.cell(3, 5.5, chr(0x95), 0, 0, "L")
                    self.set_xy(right_x + 11, naics_text_y)
                    self.cell(col_width - 17, 5.5, "...", 0, 1, "L")
                
                right_y += naics_height + 5
        
        past_performance = self.data.get("private_performance", [])
        if past_performance:
            left_y = self.section_title("PAST PERFORMANCE", left_x, left_y, col_width, use_secondary_bg=False)
            left_y = self.add_bullet_list(past_performance, left_x + 4, left_y + 2, col_width - 4, font_size=8.0, bottom_limit=bottom_limit)
            left_y += 4
        
        core_competencies = self.data.get("core_competencies", [])
        if core_competencies:
            right_y = self.section_title("CORE COMPETENCIES", right_x, right_y, col_width, use_secondary_bg=False)
            right_y = self.add_bullet_list(core_competencies, right_x + 4, right_y + 2, col_width - 4, font_size=8.0, bottom_limit=bottom_limit)
            right_y += 4
        
        certifications = self.data.get("certifications", [])
        if certifications:
            right_y = self.section_title("CERTIFICATIONS", right_x, right_y, col_width, use_secondary_bg=False)
            right_y = self.add_bullet_list(certifications, right_x + 4, right_y + 2, col_width - 4, font_size=8.0, bottom_limit=bottom_limit)
            right_y += 4
        
        differentiators = self.data.get("differentiators", [])
        if differentiators:
            left_y = self.section_title("DIFFERENTIATORS", left_x, left_y, col_width, use_secondary_bg=False)
            left_y = self.add_bullet_list(differentiators, left_x + 4, left_y + 2, col_width - 4, font_size=8.0, bottom_limit=bottom_limit)
            left_y += 4
        
        last_content_y = max(left_y, right_y)
        footer_top_y = last_content_y + gap_above_footer_mm
        
        footer_h_mm = self.footer_layout['footer_h_mm']
        footer_top_pad_mm = 3.0
        footer_label_h_mm = 5.0
        
        self.footer_layout['footer_top_y'] = footer_top_y
        self.footer_layout['label_y'] = footer_top_y + footer_top_pad_mm
        self.footer_layout['cols_y'] = footer_top_y + footer_top_pad_mm + footer_label_h_mm
        self.footer_layout['badge_y'] = footer_top_y + footer_h_mm - 3.0 - 12 - 1


def create_pdf(data, output_path="output.pdf"):
    """Create a professional capability statement PDF"""
    pdf = PDF(data)
    pdf.add_page()
    pdf.create_content()
    pdf.output(output_path)
    return output_path
