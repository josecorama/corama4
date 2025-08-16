import csv
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv('CS_BUILDER_OPENAI_API_KEY'))

def get_embedding(text, model="text-embedding-3-small"):
    """Generate embedding for given text using OpenAI API."""
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model=model).data[0].embedding

def generate_embeddings(input_csv, output_csv):
    with open(input_csv, 'r', encoding='utf-8') as infile, \
         open(output_csv, 'w', newline='', encoding='utf-8') as outfile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames + ['embedding']
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            embedding = get_embedding(row['Capability_Statement'])
            row['embedding'] = embedding
            writer.writerow(row)

    print(f"Embeddings generated and saved to {output_csv}")

# 使用示例
input_file = 'capability_statements_processed.csv'
output_file = 'capability_statements_embedded.csv'

generate_embeddings(input_file, output_file)
