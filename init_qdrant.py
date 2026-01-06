import ast
import os
import pandas as pd
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

class QdrantManager:
    def __init__(self, url, api_key):
        self.client = QdrantClient(
            url=url,
            api_key=api_key
        )
        self.collection_name = "contracts"

    def clear_collection(self):
        """删除并重建collection"""
        try:
            # 删除现有collection
            self.client.delete_collection(self.collection_name)
            print("Collection deleted")
            
            # 重建collection
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config={
                    "size": 1536,
                    "distance": "Cosine"
                }
            )
            print("Collection recreated")
        except Exception as e:
            print(f"Error clearing collection: {e}")
            raise

    def update_collection(self, csv_path, batch_size=100):
        """更新collection中的数据"""
        try:
            # 清空并重建collection
            self.clear_collection()
            
            # 读取CSV
            df = pd.read_csv(csv_path)
            print(f"Loaded {len(df)} rows from CSV")
            
            # 准备数据
            vectors = []
            payloads = []
            
            print("Processing embeddings...")
            for idx, row in tqdm(df.iterrows(), total=len(df), desc="Processing"):
                vectors.append(ast.literal_eval(row['embedding']))
                payload = {col: row[col] for col in df.columns if col != 'embedding'}
                
                # INGESTION HOOK: Mark contracts as needing NAICS enrichment if missing
                # The background worker will automatically pick these up and enrich them
                naics_code = payload.get('naics_code') or payload.get('NAICS Code') or ''
                if not naics_code or str(naics_code).strip().lower() in ('nan', 'none', 'null', ''):
                    payload['needs_naics_enrichment'] = True
                else:
                    payload['needs_naics_enrichment'] = False
                
                payloads.append(payload)
            
            # 分批上传数据
            total_batches = len(vectors) // batch_size + (1 if len(vectors) % batch_size else 0)
            print(f"\nUploading data in {total_batches} batches...")
            
            for i in tqdm(range(0, len(vectors), batch_size), desc="Uploading"):
                batch_vectors = vectors[i:i + batch_size]
                batch_payloads = payloads[i:i + batch_size]
                batch_ids = list(range(i, min(i + batch_size, len(vectors))))
                
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=[
                        {"id": id, "vector": vec, "payload": pay} 
                        for id, vec, pay in zip(batch_ids, batch_vectors, batch_payloads)
                    ]
                )
            
            print(f"\nSuccessfully uploaded {len(vectors)} points to collection")

        except Exception as e:
            print(f"Error updating collection: {e}")
            raise

    def get_collection_info(self):
        """获取collection信息"""
        try:
            info = self.client.get_collection(self.collection_name)
            return info
        except Exception as e:
            print(f"Error getting collection info: {e}")
            raise

def main():
    # Qdrant配置
    QDRANT_URL = os.getenv('Qdrant_EP')
    QDRANT_API_KEY = os.getenv('Qdrant_AK')
    
    CSV_PATH = "embedded_smartsearch.csv"    # 您的CSV文件路径
    
    try:
        # 初始化Qdrant管理器
        manager = QdrantManager(QDRANT_URL, QDRANT_API_KEY)
        
        # 打印更新前的collection信息
        print("Collection info before update:")
        print(manager.get_collection_info())
        
        # 更新数据
        manager.update_collection(CSV_PATH)
        
        # 打印更新后的collection信息
        print("\nCollection info after update:")
        print(manager.get_collection_info())
        
    except Exception as e:
        print(f"Error in main: {e}")

if __name__ == "__main__":
    main()
