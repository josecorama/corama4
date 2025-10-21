from fpdf import FPDF
from PIL import Image
import os


class PDF(FPDF):
    def __init__(self, data, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.data = data
        self.primary_color = data.get("logo_color", [(46, 76, 139), (168, 213, 226)])[0]
        self.secondary_color = data.get("logo_color", [(46, 76, 139), (168, 213, 226)])[1]

    def header(self):
        """Professional header with logo and company name"""
        self.set_fill_color(*self.primary_color)
        self.rect(0, 0, self.w, 45, 'F')
        
        logo_path = self.data.get("logo_path")
        if logo_path and os.path.exists(logo_path):
            try:
                logo = Image.open(logo_path)
                logo_width, logo_height = logo.size
                aspect_ratio = logo_width / logo_height
                height = 30
                width = height * aspect_ratio
                if width > 60:
                    width = 60
                    height = width / aspect_ratio
                self.image(logo_path, 10, 7, width, height)
            except:
                pass
        
        # Company Name - Large and prominent
        self.set_xy(10, 8)
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(255, 255, 255)
        company_name_upper = self.data.get("company_name", "").upper()
        self.cell(0, 10, company_name_upper, 0, 1, "C")
        
        self.set_xy(10, 20)
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 8, "C A P A B I L I T Y", 0, 1, "C")
        self.set_xy(10, 28)
        self.cell(0, 8, "S T A T E M E N T", 0, 1, "C")
        
        # UEI and CAGE codes
        self.set_xy(10, 38)
        self.set_font("Helvetica", "", 8)
        uei = self.data.get("uei_code", "")
        cage = self.data.get("cage_code", "")
        codes_text = ""
        if uei and cage:
            codes_text = f"UEI: {uei}   |   CAGE CODE: {cage}"
        elif uei:
            codes_text = f"UEI: {uei}"
        elif cage:
            codes_text = f"CAGE CODE: {cage}"
        
        if codes_text:
            self.cell(0, 4, codes_text, 0, 1, "C")
        
        self.set_text_color(0, 0, 0)
        self.ln(5)

    def footer(self):
        """Professional footer with contact information"""
        self.set_y(-25)
        self.set_fill_color(50, 50, 50)
        self.rect(0, self.get_y(), self.w, 25, 'F')
        
        self.set_y(-22)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(255, 255, 255)
        self.set_x(10)
        self.cell(0, 5, "POINT OF CONTACT", 0, 1, "L")
        
        self.set_font("Helvetica", "", 7)
        y_pos = self.get_y()
        
        self.set_xy(10, y_pos)
        contact_name = self.data.get("contact_name", "")
        contact_title = self.data.get("contact_title", "")
        if contact_name:
            self.cell(50, 4, contact_name, 0, 1, "L")
        if contact_title:
            self.set_x(10)
            self.cell(50, 4, contact_title, 0, 1, "L")
        
        self.set_xy(70, y_pos)
        phone = self.data.get("contact_phone", "")
        email = self.data.get("contact_email", "")
        if phone:
            self.set_font("ZapfDingbats", "", 8)
            self.cell(3, 4, chr(0x25), 0, 0, "L")
            self.set_font("Helvetica", "", 7)
            self.cell(60, 4, phone, 0, 1, "L")
        if email:
            self.set_x(70)
            self.set_font("ZapfDingbats", "", 8)
            self.cell(3, 4, chr(0x29), 0, 0, "L")
            self.set_font("Helvetica", "", 7)
            self.cell(60, 4, email, 0, 1, "L")
        
        self.set_xy(140, y_pos)
        website = self.data.get("contact_website", "")
        if website:
            self.set_font("ZapfDingbats", "", 8)
            self.cell(3, 4, chr(0x2B), 0, 0, "L")
            self.set_font("Helvetica", "", 7)
            self.cell(60, 4, website, 0, 1, "L")
        
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
            self.set_x(140)
            self.multi_cell(60, 4, "\n".join(address_parts), 0, "L")
        
        self.set_text_color(0, 0, 0)

    def section_title(self, title, x, y, width):
        """Create a professional section title with background"""
        self.set_xy(x, y)
        self.set_fill_color(*self.secondary_color)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(0, 0, 0)
        self.cell(width, 7, title, 0, 1, "L", True)
        return self.get_y()

    def add_bullet_list(self, items, x, y, width, bullet_char="l"):
        """Add a bulleted list"""
        if not items:
            return y
        
        self.set_xy(x, y)
        self.set_font("Helvetica", "", 8)
        
        for item in items:
            if not item:
                continue
            self.set_xy(x, y)
            self.set_font("ZapfDingbats", "", 6)
            self.cell(3, 4, bullet_char, 0, 0, "L")
            self.set_font("Helvetica", "", 8)
            self.set_xy(x + 4, y)
            self.multi_cell(width - 4, 4, str(item), 0, "L")
            y = self.get_y() + 1
        
        return y

    def create_content(self):
        """Create the main content in a professional 2-column layout"""
        start_y = 55
        col_width = 90
        col_spacing = 10
        left_x = 10
        right_x = left_x + col_width + col_spacing
        
        current_y = start_y
        
        naics_codes = self.data.get("naics_codes", [])
        if naics_codes:
            naics_y = start_y
            naics_width = 85
            naics_x = right_x
            
            naics_height = 10 + (len(naics_codes) * 5)
            
            self.set_fill_color(*self.secondary_color)
            self.rect(naics_x, naics_y, naics_width, naics_height, 'F')
            
            self.set_xy(naics_x + 3, naics_y + 2)
            self.set_font("Helvetica", "B", 10)
            self.cell(naics_width - 6, 6, "NAICS CODE", 0, 1, "L")
            
            self.set_font("Helvetica", "", 8)
            naics_text_y = naics_y + 9
            for code in naics_codes:
                self.set_xy(naics_x + 3, naics_text_y)
                self.cell(naics_width - 6, 4, str(code), 0, 1, "L")
                naics_text_y += 4
            
            right_col_start = naics_y + naics_height + 5
        else:
            right_col_start = start_y
        
        current_y = self.section_title("ABOUT US", left_x, current_y, col_width)
        self.set_xy(left_x, current_y + 2)
        self.set_font("Helvetica", "", 8)
        company_desc = self.data.get("company_description", "")
        self.multi_cell(col_width, 4, company_desc, 0, "L")
        current_y = self.get_y() + 3
        
        past_performance = self.data.get("private_performance", [])
        if past_performance:
            current_y = self.section_title("PAST PERFORMANCE", left_x, current_y, col_width)
            current_y = self.add_bullet_list(past_performance, left_x + 2, current_y + 2, col_width - 2)
            current_y += 3
        
        core_competencies = self.data.get("core_competencies", [])
        if core_competencies:
            right_col_start = self.section_title("CORE COMPETENCIES", right_x, right_col_start, col_width)
            right_col_start = self.add_bullet_list(core_competencies, right_x + 2, right_col_start + 2, col_width - 2, bullet_char="3")
            right_col_start += 3
        
        differentiators = self.data.get("differentiators", [])
        if differentiators:
            current_y = self.section_title("DIFFERENTIATORS", left_x, current_y, col_width)
            current_y = self.add_bullet_list(differentiators, left_x + 2, current_y + 2, col_width - 2)
            current_y += 3
        
        certifications = self.data.get("certifications", [])
        if certifications:
            right_col_start = self.section_title("CERTIFICATIONS", right_x, right_col_start, col_width)
            right_col_start = self.add_bullet_list(certifications, right_x + 2, right_col_start + 2, col_width - 2)


def create_pdf(data, output_path="output.pdf"):
    """Create a professional capability statement PDF"""
    pdf = PDF(data)
    pdf.add_page()
    pdf.create_content()
    pdf.output(output_path)
    return output_path
