import matplotlib.pyplot as plt
import numpy as np
from vector_store import VectorStore, load_embeddings
from sklearn.decomposition import PCA

# Load data
bid_vectors, bid_metadata = load_embeddings('embedded_bids.csv')

bid_store = VectorStore(len(bid_vectors[0]))
bid_store.add_vectors(bid_vectors, bid_metadata)

# 1. Distribution of vectors in the library
def plot_vector_distribution():
    # Use PCA to reduce vectors to 2 dimensions for visualization
    pca = PCA(n_components=2)
    vectors_2d = pca.fit_transform(bid_vectors)

    plt.figure(figsize=(12, 8))
    plt.scatter(vectors_2d[:, 0], vectors_2d[:, 1], alpha=0.5)
    plt.title("向量在二维空间的分布")
    plt.xlabel("主成分1")
    plt.ylabel("主成分2")

    # A few randomly selected points to label
    for i in np.random.choice(len(vectors_2d), 5, replace=False):
        plt.annotate(f"Bid {i}", (vectors_2d[i, 0], vectors_2d[i, 1]))

    plt.tight_layout()
    plt.show()

# 2. Visualization of the search process
def plot_search_process():
    # Create a simulated query vector
    query_vector = np.random.rand(len(bid_vectors[0]))
    
    # Reduce all vectors (including query vectors) to 2 dimensions using PCA
    all_vectors = np.vstack([bid_vectors, [query_vector]])
    pca = PCA(n_components=2)
    vectors_2d = pca.fit_transform(all_vectors)

    # Separate the bid vector from the query vector
    bid_vectors_2d = vectors_2d[:-1]
    query_vector_2d = vectors_2d[-1]

    # Calculate the distance to the query vector
    distances = np.linalg.norm(bid_vectors_2d - query_vector_2d, axis=1)
    
    # Find the k nearest vectors
    k = 5
    nearest_indices = np.argsort(distances)[:k]

    plt.figure(figsize=(12, 8))
    
    # Plot all the bid vectors
    plt.scatter(bid_vectors_2d[:, 0], bid_vectors_2d[:, 1], alpha=0.3, label='Bid Vectors')
    
    # Plotting query vectors
    plt.scatter(query_vector_2d[0], query_vector_2d[1], color='red', s=100, label='Query Vector')
    
    # Plot the k nearest vectors
    plt.scatter(bid_vectors_2d[nearest_indices, 0], bid_vectors_2d[nearest_indices, 1], 
                color='green', s=100, label=f'Top {k} Nearest')

    # Draw a line from the query vector to the nearest vector
    for idx in nearest_indices:
        plt.plot([query_vector_2d[0], bid_vectors_2d[idx, 0]], 
                 [query_vector_2d[1], bid_vectors_2d[idx, 1]], 
                 'k--', alpha=0.3)

    plt.title("向量搜索过程可视化")
    plt.xlabel("主成分1")
    plt.ylabel("主成分2")
    plt.legend()
    plt.tight_layout()
    plt.show()

# Run the function to display the chart
plot_vector_distribution()
plot_search_process()