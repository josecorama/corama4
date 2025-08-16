import csv
import os
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv('SMART_SEARCH_OPENAI_API_KEY'))

def clean_text(text):
    # Remove redundant whitespace characters
    text = re.sub(r'\s+', ' ', text)
    # Retain basic punctuation but remove other special characters
    text = re.sub(r'[^a-zA-Z0-9\s.,;:!?()-]', '', text)
    return text.strip()

def get_embedding(text, model="text-embedding-3-small"):
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model=model).data[0].embedding

def process_bids(input_csv, output_csv):
    with open(input_csv, 'r', encoding='utf-8') as infile, \
         open(output_csv, 'w', newline='', encoding='utf-8') as outfile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames + ['embedding']
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            combined_text = f"{row['Bid Name']}. {row['Bid Description']}"
            cleaned_text = clean_text(combined_text)
            
            embedding = get_embedding(cleaned_text)
            
            row['embedding'] = embedding
            writer.writerow(row)

    print(f"Bid data processed and saved to {output_csv}")





