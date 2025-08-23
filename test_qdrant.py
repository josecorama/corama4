import os
import sys
from qdrant_client import QdrantClient
import openai
from dotenv import load_dotenv

# Load environment variables from the backend .env file
load_dotenv("/home/ubuntu/corama3/corama-backend/.env")

def test_qdrant_connection():
    """Test the Qdrant connection using environment variables."""
    try:
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        print(f"Qdrant URL: {qdrant_url}")
        print(f"Qdrant API Key: {qdrant_api_key[:5]}...{qdrant_api_key[-5:] if qdrant_api_key else ''}")
        
        # Initialize Qdrant client
        qdrant_client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key
        )
        
        collections = qdrant_client.get_collections()
        print(f"Successfully connected to Qdrant! Available collections: {collections.collections}")
        
        try:
            contracts_info = qdrant_client.get_collection("contracts")
            print(f"'contracts' collection info: {contracts_info}")
        except Exception as e:
            print(f"Error getting 'contracts' collection: {e}")
        
        try:
            top5_info = qdrant_client.get_collection("Top_5_contracts_Vector_DB")
            print(f"'Top_5_contracts_Vector_DB' collection info: {top5_info}")
        except Exception as e:
            print(f"Error getting 'Top_5_contracts_Vector_DB' collection: {e}")
        
        return qdrant_client
    except Exception as e:
        print(f"Failed to connect to Qdrant: {e}")
        return None

def test_contract_search(qdrant_client):
    """Test searching for contracts in Qdrant."""
    if not qdrant_client:
        print("Cannot test contract search without Qdrant client")
        return
    
    try:
        openai_key = os.getenv("CORAMA_33")
        print(f"OpenAI API Key: {openai_key[:5]}...{openai_key[-5:] if openai_key else ''}")
        
        openai.api_key = openai_key
        
        query = "IT services"
        print(f"Generating embedding for query: '{query}'")
        
        try:
            response = openai.Embedding.create(
                model="text-embedding-ada-002",
                input=query
            )
            query_embedding = response['data'][0]['embedding']
            print(f"Successfully generated embedding of dimension {len(query_embedding)}")
            
            collections_to_try = ["contracts", "Top_5_contracts_Vector_DB"]
            
            for collection_name in collections_to_try:
                try:
                    print(f"Searching in collection '{collection_name}'...")
                    search_results = qdrant_client.search(
                        collection_name=collection_name,
                        query_vector=query_embedding,
                        limit=10,
                        score_threshold=0.5
                    )
                    
                    print(f"Found {len(search_results)} results in '{collection_name}'")
                    
                    if search_results:
                        print("First result payload keys:", list(search_results[0].payload.keys()))
                        print("First result payload:", search_results[0].payload)
                except Exception as e:
                    print(f"Error searching in '{collection_name}': {e}")
        except Exception as e:
            print(f"Error generating embedding: {e}")
    except Exception as e:
        print(f"Error in contract search test: {e}")

if __name__ == "__main__":
    print("Testing Qdrant connection...")
    qdrant_client = test_qdrant_connection()
    
    print("\nTesting contract search...")
    test_contract_search(qdrant_client)
