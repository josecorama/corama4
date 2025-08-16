import PyPDF2
import csv
import re
import os

def extract_text_from_pdf(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ''
            for page in reader.pages:
                text += page.extract_text()
        return text
    except Exception as e:
        print(f"Error reading {pdf_path}: {str(e)}")
        return ""

def clean_text(text):
    # 移除多余的空白字符
    text = re.sub(r'\s+', ' ', text)
    # 保留基本标点，但移除其他特殊字符
    text = re.sub(r'[^a-zA-Z0-9\s.,;:!?()-]', '', text)
    return text.strip()

def process_pdfs(pdf_paths, output_csv):
    with open(output_csv, 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['Company', 'Capability_Statement'])
        
        for pdf_path in pdf_paths:
            text = extract_text_from_pdf(pdf_path)
            if text:
                cleaned_text = clean_text(text)
                company_name = os.path.splitext(os.path.basename(pdf_path))[0]
                writer.writerow([company_name, cleaned_text])

# 使用示例
pdf_paths = ['HOH Company Firm Overview One Page.pdf']
output_file = 'capability_statements_processed.csv'
process_pdfs(pdf_paths, output_file)

print(f"Processing complete. Output saved to {output_file}")