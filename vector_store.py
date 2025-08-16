import faiss
import numpy as np
import csv
import ast
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self, dimension):
        self.index = faiss.IndexFlatL2(dimension)
        self.data = []
        self.dimension = dimension

    def add_vectors(self, vectors, metadata):
        if len(vectors[0]) != self.dimension:
            raise ValueError(f"Vector dimension mismatch. Expected {self.dimension}, got {len(vectors[0])}")
        self.index.add(np.array(vectors).astype('float32'))
        self.data.extend(metadata)

    def search(self, query_vector, k):
        if len(query_vector) != self.dimension:
            raise ValueError(f"Query vector dimension mismatch. Expected {self.dimension}, got {len(query_vector)}")
        distances, indices = self.index.search(np.array([query_vector]).astype('float32'), k)
        return [(self.data[i], distances[0][j]) for j, i in enumerate(indices[0])]

def load_embeddings(csv_file):
    try:
        vectors = []
        metadata = []
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                embedding = ast.literal_eval(row['embedding'])
                vectors.append(embedding)
                metadata.append({k: v for k, v in row.items() if k != 'embedding'})
        return vectors, metadata
    except Exception as e:
        raise Exception(f"Error loading embeddings from {csv_file}: {str(e)}")







def initialize_vector_stores(user_uploads_dir):
    """
    Initialize the capability and bid vector stores from the given directory.

    Args:
        user_uploads_dir (str): The directory containing the uploaded and processed files.

    Returns:
        capability_store (VectorStore): Vector store for capabilities.
        bid_store (VectorStore): Vector store for bids.
    """

    # Use relative paths based on the `user_uploads_dir` dynamically
    capability_csv = os.path.join(user_uploads_dir, 'capability_statements_embedded.csv')
    bid_csv = os.path.join(user_uploads_dir, 'embedded_bids.csv')

    # Log the paths for debugging
    logging.info(f"Using capability CSV file path: {capability_csv}")
    logging.info(f"Using bid CSV file path: {bid_csv}")

    # Check if the files exist before loading
    if not os.path.exists(capability_csv):
        raise FileNotFoundError(f"Capability file not found: {capability_csv}")
    if not os.path.exists(bid_csv):
        raise FileNotFoundError(f"Bid file not found: {bid_csv}")

    try:
        # Load embeddings for both capabilities and bids
        capability_vectors, capability_metadata = load_embeddings(capability_csv)
        bid_vectors, bid_metadata = load_embeddings(bid_csv)

        # Log the vector dimensions for debugging
        logging.info(f"Capability vector dimension: {len(capability_vectors[0])}")
        logging.info(f"Bid vector dimension: {len(bid_vectors[0])}")

        # Create two independent vector stores, each using its own dimension
        capability_store = VectorStore(len(capability_vectors[0]))
        capability_store.add_vectors(capability_vectors, capability_metadata)

        bid_store = VectorStore(len(bid_vectors[0]))
        bid_store.add_vectors(bid_vectors, bid_metadata)

        return capability_store, bid_store

    except Exception as e:
        logging.error(f"Error initializing vector stores: {str(e)}")
        raise Exception(f"Error initializing vector stores: {str(e)}")