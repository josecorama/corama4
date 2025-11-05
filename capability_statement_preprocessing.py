import PyPDF2
import csv
import re
import os
from datetime import datetime
import pandas as pd

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
    # Create output DataFrame with metadata
    data = []
    for pdf_path in pdf_paths:
        company_name = os.path.splitext(os.path.basename(pdf_path))[0]
        company_name = company_name.replace('_', ' ').replace('+', ' ')
        
        text = extract_text_from_pdf(pdf_path)
        cleaned_text = clean_text(text)
        
        # Add row with metadata
        data.append({
            'Company': company_name,
            'Capability_Statement': cleaned_text,
            'filename': os.path.basename(pdf_path),
            'upload_date': datetime.now().isoformat(),
            'is_primary': len(data) == 0  # First one is primary by default (important-comment)
        })
    
    df = pd.DataFrame(data)
    df.to_csv(output_csv, index=False)
    print(f"Processed {len(pdf_paths)} files and saved to {output_csv}")

if __name__ == "__main__":
    # 使用示例
    pdf_paths = ['HOH Company Firm Overview One Page.pdf']
    output_file = 'capability_statements_processed.csv'
    process_pdfs(pdf_paths, output_file)
    
    print(f"Processing complete. Output saved to {output_file}")
