import logging
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = OpenAI(api_key=os.getenv('CS_BID_SEARCH_OPENAI_API_KEY'))




def analyze_match(capability_statement, bid_description, euclidean_distance):
    prompt = f"""
    Company Capability Statement:
    {capability_statement}

    Potential Contract Bid:
    {bid_description}

    Euclidean Distance: {euclidean_distance}

    Analyze how well this contract bid matches the company's capabilities. 
    Provide:
    1. A similarity score from 0 to 100.
    2. A brief analysis summary (maximum 50 words) explaining the overall match and key reasons for the score.

    Format your response as follows:
    Similarity Score: [score]
    Analysis Summary: [brief summary]
    """

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are an expert in analyzing matches between company capabilities and contract bids."},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    return response.choices[0].message.content

def find_matches(capability_store, bid_store, top_k=5):
    matches = []

    # Log the dimensions of the capability and bid stores to ensure they match
    logger.info(f"Capability Store Dimension: {capability_store.dimension}")
    logger.info(f"Bid Store Dimension: {bid_store.dimension}")

    # Validate that bid store and capability store have the correct dimensions
    if capability_store.dimension != bid_store.dimension:
        raise ValueError("Capability store and bid store have mismatched dimensions!")

    # Iterate through each capability in the capability store
    for i, capability in enumerate(capability_store.data):
        capability_vector = capability_store.index.reconstruct(i)
        
        # Log the specific capability statement and its vector for debugging
        logger.info(f"Matching Capability {i+1}/{len(capability_store.data)}: {capability['Capability_Statement']}")
        logger.debug(f"Capability Vector: {capability_vector[:10]}... (first 10 values shown for brevity)")

        # Search for the top K matching bids in the bid store
        similar_bids = bid_store.search(capability_vector, top_k)
        
        # Log the top K matches for each capability
        logger.info(f"Top {top_k} matches for Capability {i+1}:")
        for bid, distance in similar_bids:
            logger.info(f"Bid Number: {bid['Bid Number']}, Bid Name: {bid['Bid Name']}, Distance: {distance}")

        # Analyze each match using the GPT model
        for bid, distance in similar_bids:
            analysis = analyze_match(capability['Capability_Statement'], bid['Bid Description'], distance)
            
            # Parse the output of the GPT response
            similarity_score = ""
            analysis_summary = ""
            for line in analysis.split("\n"):
                if line.startswith("Similarity Score:"):
                    similarity_score = line.split(":")[1].strip()
                    if not similarity_score.endswith("%"):
                        similarity_score += "%"  # Ensure the score ends with a "%"
                elif line.startswith("Analysis Summary:"):
                    analysis_summary = line.split(":", 1)[1].strip()

            # Append the match to the list of results
            matches.append({
                'Company': capability['Company'],
                'Bid_Number': bid['Bid Number'],
                'Bid_Name': bid['Bid Name'],
                'Bid_Description': bid['Bid Description'],
                'Status': bid['Status'],
                'Category': bid['Category'],
                'Due_Date': bid['Due Date'],
                'Detail_Link': bid['Detail Link'],
                'Euclidean_Distance': distance,
                'Similarity_Score': similarity_score,
                'Analysis_Summary': analysis_summary
            })
    
    # Log the total number of matches found for all capabilities
    logger.info(f"Total Matches Found: {len(matches)}")
    return matches

