from fpdf import FPDF
from PIL import Image
import os


class PDF(FPDF):
    def __init__(self, data, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.data = data
        self.primary_color = data.get("logo_color", [(46, 76, 139), (168, 213, 226)])[0]
        self.secondary_color = data.get("logo_color", [(46, 76, 139), (168, 213, 226)])[1]
        self.set_auto_page_break(auto=True, margin=30)

    def header(self):
        """Professional header with logo, company name, and hero image"""
        self.set_fill_color(*self.primary_color)
        self.rect(0, 0, self.w / 2, 60, 'F')
        
        logo_path = self.data.get("logo_path")
        if logo_path and os.path.exists(logo_path):
            try:
                logo = Image.open(logo_path)
                logo_width, logo_height = logo.size
                aspect_ratio = logo_width / logo_height
                height = 40
                width = height * aspect_ratio
                if width > 80:
                    width = 80
                    height = width / aspect_ratio
                self.image(logo_path, 15, 10, width, height)
            except:
                pass
        
        # Company name on the right side
        self.set_xy(self.w / 2 + 10, 10)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*self.primary_color)
        company_name_upper = self.data.get("company_name", "").upper()
        self.multi_cell(self.w / 2 - 20, 6, company_name_upper, 0, "L")
        
        image_path = self.data.get("image_path")
        if image_path and os.path.exists(image_path):
            try:
                img = Image.open(image_path)
                img_width, img_height = img.size
                aspect_ratio = img_width / img_height
                img_display_width = self.w / 2 - 20
                img_display_height = img_display_width / aspect_ratio
                if img_display_height > 40:
                    img_display_height = 40
                    img_display_width = img_display_height * aspect_ratio
                self.image(image_path, self.w / 2 + 10, 20, img_display_width, img_display_height)
            except:
                pass
        
        self.set_xy(15, 25)
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(255, 255, 255)
        self.cell(0, 8, "C A P A B I L I T Y", 0, 1, "L")
        self.set_x(15)
        self.cell(0, 8, "S T A T E M E N T", 0, 1, "L")
        
        # UEI and CAGE codes
        self.set_xy(15, 45)
        self.set_font("Helvetica", "", 9)
        uei = self.data.get("uei_code", "")
        cage = self.data.get("cage_code", "")
        codes_parts = []
        if uei:
            codes_parts.append(f"DUNS: {uei}")
        if cage:
            codes_parts.append(f"CAGE Code: {cage}")
        
        if codes_parts:
            self.cell(0, 5, "    ".join(codes_parts), 0, 1, "L")
        
        self.set_text_color(0, 0, 0)
        self.ln(10)

    def footer(self):
        """Professional footer with contact information"""
        self.set_y(-30)
        self.set_fill_color(50, 50, 50)
        self.rect(0, self.get_y(), self.w, 30, 'F')
        
        self.set_y(-27)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(255, 255, 255)
        self.set_x(15)
        self.cell(0, 5, "POINT OF CONTACT", 0, 1, "L")
        
        self.set_font("Helvetica", "", 8)
        y_pos = self.get_y()
        
        self.set_xy(15, y_pos)
        contact_name = self.data.get("contact_name", "")
        contact_title = self.data.get("contact_title", "")
        if contact_name:
            self.cell(60, 4, contact_name, 0, 1, "L")
        if contact_title:
            self.set_x(15)
            self.cell(60, 4, contact_title, 0, 1, "L")
        
        self.set_xy(75, y_pos)
        phone = self.data.get("contact_phone", "")
        email = self.data.get("contact_email", "")
        if phone:
            self.cell(60, 4, f"P: {phone}", 0, 1, "L")
        if email:
            self.set_x(75)
            self.cell(60, 4, f"E: {email}", 0, 1, "L")
        
        self.set_xy(135, y_pos)
        website = self.data.get("contact_website", "")
        if website:
            self.cell(60, 4, f"W: {website}", 0, 1, "L")
        
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
            self.set_x(135)
            self.multi_cell(60, 4, "\n".join(address_parts), 0, "L")
        
        self.set_text_color(0, 0, 0)

    def section_title(self, title, x, y, width, use_secondary_bg=True):
        """Create a professional section title with background"""
        self.set_xy(x, y)
        if use_secondary_bg:
            self.set_fill_color(*self.secondary_color)
        else:
            self.set_fill_color(240, 240, 240)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(0, 0, 0)
        self.cell(width, 8, title, 0, 1, "L", True)
        return self.get_y()

    def add_bullet_list(self, items, x, y, width, font_size=9):
        """Add a bulleted list with proper formatting"""
        if not items:
            return y
        
        self.set_font("Helvetica", "", font_size)
        
        for item in items:
            if not item:
                continue
            
            if y > self.h - 40:
                self.add_page()
                y = 75
            
            self.set_xy(x, y)
            self.cell(3, 5, chr(0x95), 0, 0, "L")
            self.set_xy(x + 5, y)
            self.multi_cell(width - 5, 5, str(item), 0, "L")
            y = self.get_y() + 1
        
        return y

    def create_content(self):
        """Create the main content in a professional 2-column layout"""
        start_y = 75
        col_width = 90
        col_spacing = 10
        left_x = 15
        right_x = left_x + col_width + col_spacing
        
        left_y = start_y
        right_y = start_y
        
        company_desc = self.data.get("company_description", "")
        if company_desc:
            about_start_y = left_y
            left_y = self.section_title("ABOUT US", left_x, left_y, col_width, use_secondary_bg=False)
            self.set_xy(left_x + 3, left_y + 2)
            self.set_font("Helvetica", "", 9)
            self.multi_cell(col_width - 6, 5, company_desc, 0, "J")
            left_y = self.get_y() + 5
            
            about_height = left_y - about_start_y
            self.set_fill_color(240, 240, 240)
            self.rect(left_x, about_start_y, col_width, about_height, 'F')
            
            self.set_xy(left_x, about_start_y)
            left_y = self.section_title("ABOUT US", left_x, about_start_y, col_width, use_secondary_bg=False)
            self.set_xy(left_x + 3, left_y + 2)
            self.set_font("Helvetica", "", 9)
            self.multi_cell(col_width - 6, 5, company_desc, 0, "J")
            left_y = self.get_y() + 5
        
        naics_codes = self.data.get("naics_codes", [])
        if naics_codes:
            naics_height = 10 + (len(naics_codes) * 6)
            self.set_fill_color(*self.secondary_color)
            self.rect(right_x, right_y, col_width, naics_height, 'F')
            
            self.set_xy(right_x + 3, right_y + 2)
            self.set_font("Helvetica", "B", 11)
            self.cell(col_width - 6, 6, "NAICS CODE", 0, 1, "L")
            
            self.set_font("Helvetica", "", 9)
            naics_text_y = right_y + 10
            for code in naics_codes:
                self.set_xy(right_x + 5, naics_text_y)
                self.cell(3, 5, chr(0x95), 0, 0, "L")
                self.set_xy(right_x + 10, naics_text_y)
                self.cell(col_width - 15, 5, str(code), 0, 1, "L")
                naics_text_y += 6
            
            right_y += naics_height + 5
        
        past_performance = self.data.get("private_performance", [])
        if past_performance:
            left_y = self.section_title("PAST PERFORMANCE", left_x, left_y, col_width)
            left_y = self.add_bullet_list(past_performance, left_x + 3, left_y + 2, col_width - 3)
            left_y += 5
        
        core_competencies = self.data.get("core_competencies", [])
        if core_competencies:
            right_y = self.section_title("CORE COMPETENCIES", right_x, right_y, col_width)
            right_y = self.add_bullet_list(core_competencies, right_x + 3, right_y + 2, col_width - 3)
            right_y += 5
        
        differentiators = self.data.get("differentiators", [])
        if differentiators:
            left_y = self.section_title("DIFFERENTIATORS", left_x, left_y, col_width)
            left_y = self.add_bullet_list(differentiators, left_x + 3, left_y + 2, col_width - 3)
            left_y += 5
        
        certifications = self.data.get("certifications", [])
        if certifications:
            right_y = self.section_title("CERTIFICATIONS", right_x, right_y, col_width)
            right_y = self.add_bullet_list(certifications, right_x + 3, right_y + 2, col_width - 3)


def create_pdf(data, output_path="output.pdf"):
    """Create a professional capability statement PDF"""
    pdf = PDF(data)
    pdf.add_page()
    pdf.create_content()
    pdf.output(output_path)
    return output_path
