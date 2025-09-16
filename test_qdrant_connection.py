#!/usr/bin/env python3

import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient

# Load environment variables
load_dotenv()

def test_qdrant_connection():
    try:
        print("Testing Qdrant connection...")
        
        qdrant_url = os.getenv('QDRANT_URL', 'https://4c5ec4c4-c2c9-4142-9f7b-8b8b8b8b8b8b.us-east4-0.gcp.cloud.qdrant.io:6333')
        qdrant_api_key = os.getenv('QDRANT_API_KEY')
        
        print(f"Qdrant URL: {qdrant_url}")
        print(f"API Key present: {'Yes' if qdrant_api_key else 'No'}")
        
        client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key,
        )
        
        print("Client initialized successfully")
        
        collections = client.get_collections()
        print(f"Collections retrieved: {len(collections.collections)} collections found")
        
        for collection in collections.collections:
            print(f"  - {collection.name}")
        
        collection_name = "Top_5_contracts_Vector_DB"
        try:
            collection_info = client.get_collection(collection_name)
            print(f"\nCollection '{collection_name}' info:")
            print(f"  - Points count: {collection_info.points_count}")
            print(f"  - Vector size: {collection_info.config.params.vectors.size}")
            print("✅ Collection access successful")
            
        except Exception as e:
            print(f"❌ Error accessing collection '{collection_name}': {e}")
            print(f"Error type: {type(e).__name__}")
            
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_qdrant_connection()
