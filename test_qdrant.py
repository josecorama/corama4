import os
from qdrant_client import QdrantClient

qdrant_url = 'https://88c89ea8-0b01-487a-8e43-d00c3aebf927.us-west-1-0.aws.cloud.qdrant.io'
qdrant_api_key = os.getenv('qdrant')

print(f'Connecting to Qdrant at: {qdrant_url}')
print(f'API key available: {"Yes" if qdrant_api_key else "No"}')

try:
    client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
    
    collections = client.get_collections()
    print(f'Available collections: {[c.name for c in collections.collections]}')
    
    scroll_result = client.scroll(collection_name='contracts', limit=2, with_payload=True)
    print(f'Sample contracts found: {len(scroll_result[0])}')
    
    if scroll_result[0]:
        sample = scroll_result[0][0].payload
        print(f'Sample contract fields: {list(sample.keys())}')
        print(f'Sample Bid Name: {sample.get("Bid Name", "N/A")}')
        print(f'Sample Organization: {sample.get("Organization", "N/A")}')
        print(f'Sample Due Date: {sample.get("Due Date", "N/A")}')
        print('✅ Qdrant connection successful!')
    else:
        print('❌ No contracts found in collection')
        
except Exception as e:
    print(f'❌ Qdrant connection failed: {e}')
