from fpdf import FPDF
from PIL import Image
import os


class PDF(FPDF):
    def __init__(self, data, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.data = data

    # Header of the PDF
    def header(self):
        self.set_font("Helvetica", "B", 12)

        # logo
        logo_path = self.data.get("logo_path")
        if logo_path and os.path.exists(logo_path):
            logo = Image.open(logo_path)
            logo_width, logo_height = logo.size
            aspect_ratio = logo_width / logo_height
            height = 20
            width = height * aspect_ratio
            if width > 50:
                width = 50
                height = width / aspect_ratio
            self.image(logo_path, 2, 8, width, height)
            self.set_xy(width + 5, 10)

        # No Logo
        else:
            self.set_xy(10, 10)

        # Company Name
        primary_color = self.data["logo_color"][0]
        self.set_text_color(*primary_color)
        company_name_upper = self.data["company_name"].upper()
        self.cell(0, 15, company_name_upper, 0, 0, "L")
        self.ln(20)

    # Footer of the PDF
    def footer(self):
        # Rectangle
        self.set_y(-30)
        self.set_fill_color(96, 96, 96)
        self.rect(0, self.get_y(), self.w, 30, "F")

        # Number of columns
        col_count = 3
        if self.data.get("social_media") or self.data.get("qr_code_path"):
            col_count = 4
        col_width = (self.w - 20) / col_count
        y_start = self.get_y() + 6
        x_start = 10

        self.set_font("Helvetica", "B", 8)
        self.set_text_color(255, 255, 255)

        def add_footer_text(x, y, text, is_title=False):
            if text.strip():
                self.set_xy(x, y)
                font_style = "B" if is_title else ""
                self.set_font("Helvetica", font_style, 6 if not is_title else 8)
                self.multi_cell(col_width, 5, text, border=0, align="L")

        def add_zapf_text(x, y, char_code, text):
            self.set_xy(x, y)
            self.set_font("ZapfDingbats", "", 8)
            self.cell(5, 5, chr(char_code), 0, 0, "L")
            self.set_font("Helvetica", "", 6)
            self.cell(col_width - 5, 5, text, 0, 1, "L")

        # Adding "POINT OF CONTACT" aligned with the phone number
        add_footer_text(x_start, y_start, "POINT OF CONTACT", is_title=True)
        add_zapf_text(
            x_start + col_width,
            y_start,
            0x25,
            self.data.get("contact_phone", "").strip(),
        )

        # Adding contact name aligned with the email
        add_footer_text(x_start, y_start + 5, self.data.get("contact_name", "").strip())
        add_zapf_text(
            x_start + col_width,
            y_start + 5,
            0x29,
            self.data.get("contact_email", "").strip(),
        )

        # Adding contact title aligned with the website and social media text
        add_footer_text(
            x_start, y_start + 10, self.data.get("contact_title", "").strip()
        )
        add_zapf_text(
            x_start + col_width,
            y_start + 10,
            0x2B,
            self.data.get("contact_website", "").strip(),
        )
        add_footer_text(
            x_start + 2 * col_width,
            y_start + 10,
            self.data.get("social_media", "").strip(),
        )

        # Adding address
        address = "\n".join(
            filter(
                None,
                [
                    self.data.get("contact_address", "").strip(),
                    ", ".join(
                        filter(
                            None,
                            [
                                self.data.get("city", "").strip(),
                                self.data.get("state", "").strip(),
                                self.data.get("zip", "").strip(),
                            ],
                        )
                    ),
                ],
            )
        )
        add_footer_text(x_start + 2 * col_width, y_start, address)

        if col_count == 4:
            if self.data.get("qr_code_path") and os.path.exists(
                self.data.get("qr_code_path")
            ):
                qr_img = Image.open(self.data.get("qr_code_path"))
                qr_width, qr_height = qr_img.size
                aspect_ratio = qr_height / qr_width
                qr_display_width = 20
                qr_display_height = qr_display_width * aspect_ratio

                # Adjust the x position for the QR code to center it in the column
                qr_x_position = (
                    x_start + 3 * col_width + (col_width - qr_display_width) / 2
                )

                # Ensure the QR code starts at the same y position as the first line
                self.image(
                    self.data["qr_code_path"],
                    x=qr_x_position,
                    y=y_start,
                    w=qr_display_width,
                    h=qr_display_height,
                )
            else:
                add_footer_text(
                    x_start + 3 * col_width,
                    y_start + 10,
                    self.data.get("social_media", "").strip(),
                )

        self.set_text_color(0, 0, 0)

    def main_title(self):

        # Choose colors for rectangles
        ##capability statement color
        primary_color = self.data["logo_color"][0]
        ##naics box color
        secondary_color = self.data["logo_color"][1]

        self.set_font("Helvetica", "B", 25)
        self.set_fill_color(*primary_color)
        self.set_text_color(255, 255, 255)

        # capability statements title
        current_y = self.get_y()
        self.rect(0, current_y, self.w, 50, "F")
        self.set_y(current_y + 10)
        self.cell(0, 10, "C A P A B I L I T Y", 0, 1, "L", 0)
        self.ln(5)
        self.cell(0, 10, "S T A T E M E N T", 0, 1, "L", 0)

        # UEI and CAGE
        UEI = self.data.get("uei_code")
        CAGE = self.data.get("cage_code")
        self.set_font("Helvetica", "", 10)
        if UEI and not CAGE:
            self.cell(0, 8, f"UEI: {UEI}", 0, 1, "L", 0)
            self.ln(2)
        if CAGE and not UEI:
            self.cell(0, 8, f"CAGE CODE: {CAGE}", 0, 1, "L", 0)
            self.ln(2)
        if UEI and CAGE:
            self.cell(0, 8, f"UEI: {UEI}   |   CAGE CODE: {CAGE}", 0, 1, "L", 0)
            self.ln(2)
        self.set_text_color(0, 0, 0)

        # Company Picture
        image_path = self.data.get("image_path")
        image_width, image_height = 0, 0
        if image_path and os.path.exists(image_path):
            img = Image.open(image_path)
            img_width, img_height = img.size
            aspect_ratio = img_width / img_height
            max_width = 90
            max_height = 80

            # Resize image if it exceeds max dimensions
            if img_width > max_width or img_height > max_height:
                if img_width > img_height:
                    width = min(max_width, img_width)
                    height = width / aspect_ratio
                    if height > max_height:
                        height = max_height
                        width = height * aspect_ratio
                else:
                    height = min(max_height, img_height)
                    width = height * aspect_ratio
                    if width > max_width:
                        width = max_width
                        height = width / aspect_ratio
            else:
                width, height = img_width, img_height

            image_width, image_height = width, height

            image_y = max(10, 40 - height)
            self.image(image_path, 110, image_y, width, height)

        # Handling NAICS box
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(0, 0, 0)

        line_height = 4
        title_height = 10
        text_box_width = 90

        # Determine NAICS box position
        if image_path and os.path.exists(image_path):
            text_box_y = image_y + image_height + 5
        else:
            text_box_y = current_y + 50 + 5

        # Calculate text box height based on the content
        y_position = text_box_y + title_height + 3
        self.set_font("Helvetica", "", 8)
        naics_code_lines = 0
        for code in self.data["naics_codes"]:
            self.set_xy(115, y_position)
            self.multi_cell(
                text_box_width - 5, line_height, f"{code}", border=0, align="L"
            )
            y_position += line_height + 5  # Increased spacing between bullets
            naics_code_lines += 1

        text_box_height = (y_position - text_box_y) + 5

        self.set_fill_color(*secondary_color)
        self.rect(110, text_box_y, text_box_width, text_box_height, "F")
        self.set_xy(115, text_box_y + 3)
        self.set_font("Helvetica", "B", 10)
        self.cell(text_box_width, title_height, "NAICS CODE", border=0, align="L")

        # Reset y_position for actual drawing
        y_position = text_box_y + title_height + 3
        self.set_font("Helvetica", "", 8)
        for code in self.data["naics_codes"]:
            self.set_xy(115, y_position)
            self.multi_cell(
                text_box_width - 5, line_height, f"{code}", border=0, align="L"
            )
            y_position += line_height + 5  # Adjust y_position for the next bullet point

        self.naics_end_y = text_box_y + text_box_height + 5
        self.set_text_color(0, 0, 0)

    # Chapter title formatting
    def chapter_title(self, title, width=90):
        self.set_font("Helvetica", "B", 12)
        self.set_fill_color(224, 224, 224)
        self.cell(width, 10, title, 0, 1, "C", 1)
        self.ln(4)

    # Chapter body formatting
    def chapter_body(self, body, width=90):
        self.set_font("Helvetica", "", 8)
        self.multi_cell(width, 5, body)
        self.ln(2)

    def add_bullet_points(
        self, bullet_points, x, start_y, width=90, bullet_font_size=8, bullet_char="l"
    ):
        line_height = 5
        bullet_margin = -1
        y = start_y
        for point in bullet_points:
            self.set_xy(x, y)
            self.set_font("ZapfDingbats", "", bullet_font_size)
            self.cell(bullet_font_size, line_height, bullet_char, 0, 0)
            self.set_font("Helvetica", "", 8)
            self.set_xy(x + bullet_font_size + bullet_margin, y)
            self.multi_cell(
                width - bullet_font_size - bullet_margin, line_height, point, 0, "L"
            )
            y = (
                self.get_y() + 1
            )  # Update y position for the next bullet point, reduce spacing
        return y

    # Add columns
    def add_columns(self):
        # Calculate the width for each column
        col_width = (self.w - 30) / 2
        y_start = 85

        # Left column start
        current_y = y_start

        # "About Us" section
        self.set_xy(10, current_y)
        self.chapter_title("ABOUT US", col_width)
        self.chapter_body(self.data["company_description"], col_width)
        current_y = self.get_y() + 2
        
        # Conditional "Past Performance" section
        if "private_performance" in self.data and self.data["private_performance"]:
            self.set_xy(10, current_y)
            self.chapter_title("PAST PERFORMANCE", col_width)
            current_y = self.get_y()  # Update current_y to be just below the title

            # Add performance logos if available
            if "public_performance_logo_paths" in self.data and self.data["public_performance_logo_paths"]:
                pub_logo_paths = self.data["public_performance_logo_paths"]
                max_logo_width = 15
                spacing = 5
                x = 10
                y = current_y
                for i, pub_logo_path in enumerate(pub_logo_paths):
                    if os.path.exists(pub_logo_path):
                        self.image(pub_logo_path, x, y, max_logo_width)
                        x += max_logo_width + spacing
                        if x + max_logo_width > col_width + 10:  # Move to next line if exceeding column width
                            x = 10
                            y += max_logo_width + spacing
                current_y = y + max_logo_width + 2  # Original spacing

            self.set_xy(10, current_y)
            current_y = self.add_bullet_points(self.data["private_performance"], 10, current_y, col_width, bullet_font_size=4, bullet_char="l")
            current_y += 5  # Original spacing
        elif "public_performance_logo_paths" in self.data and self.data["public_performance_logo_paths"]:
            # Only public performance
            self.set_xy(10, current_y)
            self.chapter_title("PAST PERFORMANCE", col_width)
            current_y = self.get_y()  # Update current_y to be just below the title
            
            pub_logo_paths = self.data["public_performance_logo_paths"]
            max_logo_width = 15
            spacing = 5
            x = 10
            y = current_y
            for i, pub_logo_path in enumerate(pub_logo_paths):
                if os.path.exists(pub_logo_path):
                    self.image(pub_logo_path, x, y, max_logo_width)
                    x += max_logo_width + spacing
                    if x + max_logo_width > col_width + 10:  # Move to next line if exceeding column width
                        x = 10
                        y += max_logo_width + spacing
            current_y = y + max_logo_width + 5  # Original spacing


        # "Differentiators" section
        self.set_xy(10, current_y)
        self.chapter_title("DIFFERENTIATORS", col_width)
        current_y = self.get_y() + 2  # Ensure consistent spacing below the title
        current_y = self.add_bullet_points(
            self.data["differentiators"],
            10,
            current_y,
            col_width,
            bullet_font_size=4,
            bullet_char="l",
        )
        current_y += 5

        # Right column start just below the NAICS code rectangle
        right_col_y_start = self.naics_end_y

        # Determine if we need to add "CORE COMPETENCIES" and "CERTIFICATIONS"
        include_certifications = "certifications" in self.data

        # Right column content
        if include_certifications and self.data["certifications"]:
            # "CORE COMPETENCIES" section
            self.set_xy(10 + col_width + 10, right_col_y_start)
            self.chapter_title("CORE COMPETENCIES", col_width)
            right_col_y_start = (
                self.get_y() + 2
            )  # Ensure consistent spacing below the title
            right_col_y_start = self.add_bullet_points(
                self.data["core_competencies"],
                10 + col_width + 10,
                right_col_y_start,
                col_width,
                bullet_font_size=12,
                bullet_char="3",
            )
            right_col_y_start += 5

            # "CERTIFICATIONS" section
            self.set_xy(10 + col_width + 10, right_col_y_start)
            self.chapter_title("CERTIFICATIONS", col_width)
            right_col_y_start = (
                self.get_y() + 2
            )  # Ensure consistent spacing below the title
            right_col_y_start = self.add_bullet_points(
                self.data["certifications"],
                10 + col_width + 10,
                right_col_y_start,
                col_width,
                bullet_font_size=4,
                bullet_char="l",
            )
            right_col_y_start += 5
        else:
            # Only "CORE COMPETENCIES" section
            self.set_xy(10 + col_width + 10, right_col_y_start)
            self.chapter_title("CORE COMPETENCIES", col_width)
            right_col_y_start = (
                self.get_y() + 2
            )  # Ensure consistent spacing below the title
            right_col_y_start = self.add_bullet_points(
                self.data["core_competencies"],
                10 + col_width + 10,
                right_col_y_start,
                col_width,
                bullet_font_size=12,
                bullet_char="3",
            )
            right_col_y_start += 5


def create_pdf(data, output_path="output.pdf"):
    pdf = PDF(data)
    pdf.add_page()
    pdf.main_title()
    pdf.add_columns()
    pdf.output(output_path)
    return output_path
