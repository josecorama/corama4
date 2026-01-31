"""
Shared category mapping module for consistent NAICS-to-category classification.

This module provides a single source of truth for mapping contracts to high-level
business categories based on NAICS codes and text analysis. Used by both the
web app (app.py) and background worker (proposal_worker.py) to ensure consistent
category distribution in dashboard analytics.
"""

# High-level business categories for dashboard display
# These are the ONLY categories that should appear in the Top Categories chart
DASHBOARD_CATEGORIES = [
    'Professional Services',
    'Construction',
    'IT Services',
    'Goods/Supplies',
    'Maintenance/Operations',
    'Healthcare',
    'Transportation',
    'Other'
]

# NAICS 2-digit sector to category mapping
# Based on official NAICS sector definitions
NAICS_SECTOR_TO_CATEGORY = {
    # Agriculture, Forestry, Fishing and Hunting (11)
    '11': 'Goods/Supplies',
    
    # Mining, Quarrying, and Oil and Gas Extraction (21)
    '21': 'Construction',
    
    # Utilities (22)
    '22': 'Maintenance/Operations',
    
    # Construction (23)
    '23': 'Construction',
    
    # Manufacturing (31-33)
    '31': 'Goods/Supplies',
    '32': 'Goods/Supplies',
    '33': 'Goods/Supplies',
    
    # Wholesale Trade (42)
    '42': 'Goods/Supplies',
    
    # Retail Trade (44-45)
    '44': 'Goods/Supplies',
    '45': 'Goods/Supplies',
    
    # Transportation and Warehousing (48-49)
    '48': 'Transportation',
    '49': 'Transportation',
    
    # Information (51)
    '51': 'IT Services',
    
    # Finance and Insurance (52)
    '52': 'Professional Services',
    
    # Real Estate and Rental and Leasing (53)
    '53': 'Professional Services',
    
    # Professional, Scientific, and Technical Services (54)
    '54': 'Professional Services',
    
    # Management of Companies and Enterprises (55)
    '55': 'Professional Services',
    
    # Administrative and Support and Waste Management (56)
    '56': 'Maintenance/Operations',
    
    # Educational Services (61)
    '61': 'Professional Services',
    
    # Health Care and Social Assistance (62)
    '62': 'Healthcare',
    
    # Arts, Entertainment, and Recreation (71)
    '71': 'Professional Services',
    
    # Accommodation and Food Services (72)
    '72': 'Goods/Supplies',
    
    # Other Services (except Public Administration) (81)
    '81': 'Maintenance/Operations',
    
    # Public Administration (92)
    '92': 'Professional Services',
}

# More specific 3-digit NAICS prefix overrides for better accuracy
NAICS_3DIGIT_TO_CATEGORY = {
    # IT Services overrides
    '511': 'IT Services',  # Publishing Industries (Software)
    '517': 'IT Services',  # Telecommunications
    '518': 'IT Services',  # Data Processing, Hosting
    '519': 'IT Services',  # Other Information Services
    '541': 'Professional Services',  # Professional Services (general)
    
    # Construction overrides
    '236': 'Construction',  # Construction of Buildings
    '237': 'Construction',  # Heavy and Civil Engineering
    '238': 'Construction',  # Specialty Trade Contractors
    
    # Healthcare overrides
    '621': 'Healthcare',  # Ambulatory Health Care
    '622': 'Healthcare',  # Hospitals
    '623': 'Healthcare',  # Nursing and Residential Care
    '624': 'Healthcare',  # Social Assistance
    
    # Maintenance overrides
    '561': 'Maintenance/Operations',  # Administrative and Support Services
    '562': 'Maintenance/Operations',  # Waste Management
    '811': 'Maintenance/Operations',  # Repair and Maintenance
    
    # Transportation overrides
    '481': 'Transportation',  # Air Transportation
    '482': 'Transportation',  # Rail Transportation
    '483': 'Transportation',  # Water Transportation
    '484': 'Transportation',  # Truck Transportation
    '485': 'Transportation',  # Transit and Ground Passenger
    '486': 'Transportation',  # Pipeline Transportation
    '487': 'Transportation',  # Scenic and Sightseeing
    '488': 'Transportation',  # Support Activities for Transportation
    '491': 'Transportation',  # Postal Service
    '492': 'Transportation',  # Couriers and Messengers
    '493': 'Transportation',  # Warehousing and Storage
}

# Specific 4-6 digit NAICS codes for IT Services (high priority)
IT_NAICS_CODES = {
    '511210',  # Software Publishers
    '518210',  # Data Processing, Hosting
    '541511',  # Custom Computer Programming
    '541512',  # Computer Systems Design
    '541513',  # Computer Facilities Management
    '541519',  # Other Computer Related Services
    '541611',  # Administrative Management Consulting (often IT)
    '561621',  # Security Systems Services
}

# Keywords for text-based category detection (used when NAICS is missing/unclear)
CATEGORY_KEYWORDS = {
    'IT Services': [
        'software', 'computer', 'it services', 'information technology',
        'cybersecurity', 'cyber security', 'network', 'database', 'cloud',
        'programming', 'developer', 'web development', 'application',
        'data center', 'hosting', 'saas', 'hardware', 'server', 'tech support',
        'helpdesk', 'help desk', 'it support', 'systems integration'
    ],
    'Construction': [
        'construction', 'building', 'renovation', 'remodel', 'repair',
        'roofing', 'plumbing', 'electrical', 'hvac', 'paving', 'concrete',
        'demolition', 'excavation', 'foundation', 'framing', 'drywall',
        'painting', 'flooring', 'carpentry', 'masonry', 'structural'
    ],
    'Healthcare': [
        'healthcare', 'health care', 'medical', 'hospital', 'clinical',
        'pharmaceutical', 'nursing', 'patient', 'diagnostic', 'therapy',
        'dental', 'laboratory', 'ambulance', 'emergency medical', 'physician'
    ],
    'Professional Services': [
        'consulting', 'advisory', 'professional services', 'management',
        'engineering', 'architect', 'legal', 'accounting', 'audit',
        'research', 'analysis', 'training', 'education', 'staffing'
    ],
    'Maintenance/Operations': [
        'maintenance', 'janitorial', 'cleaning', 'custodial', 'landscaping',
        'grounds', 'facility', 'operations', 'repair', 'service contract',
        'preventive maintenance', 'waste', 'disposal', 'recycling'
    ],
    'Transportation': [
        'transportation', 'shipping', 'freight', 'logistics', 'delivery',
        'trucking', 'fleet', 'vehicle', 'transit', 'bus', 'rail', 'air cargo'
    ],
    'Goods/Supplies': [
        'supplies', 'equipment', 'materials', 'parts', 'furniture',
        'office supplies', 'tools', 'machinery', 'commodities', 'products',
        'procurement', 'purchase', 'acquisition'
    ]
}


def parse_naics_codes(naics_raw):
    """
    Parse NAICS codes from a raw string that may contain multiple codes.
    
    Args:
        naics_raw: String containing one or more NAICS codes (comma/space separated)
    
    Returns:
        List of individual NAICS code strings
    """
    if not naics_raw:
        return []
    
    naics_str = str(naics_raw).strip()
    if not naics_str or naics_str.lower() in ('nan', 'none', 'null', ''):
        return []
    
    # Split by common delimiters
    import re
    codes = re.split(r'[,;\s/]+', naics_str)
    
    # Filter to valid NAICS codes (4-6 digits)
    valid_codes = []
    for code in codes:
        code = code.strip()
        if code and code.isdigit() and 4 <= len(code) <= 6:
            valid_codes.append(code)
    
    return valid_codes


def map_naics_to_category(naics_code):
    """
    Map a single NAICS code to a dashboard category.
    
    Args:
        naics_code: A single NAICS code string (4-6 digits)
    
    Returns:
        Category string or None if no mapping found
    """
    if not naics_code:
        return None
    
    code = str(naics_code).strip()
    
    # Check specific IT codes first (highest priority)
    if code in IT_NAICS_CODES:
        return 'IT Services'
    
    # Check 3-digit prefix mapping
    if len(code) >= 3:
        prefix_3 = code[:3]
        if prefix_3 in NAICS_3DIGIT_TO_CATEGORY:
            return NAICS_3DIGIT_TO_CATEGORY[prefix_3]
    
    # Check 2-digit sector mapping
    if len(code) >= 2:
        sector = code[:2]
        if sector in NAICS_SECTOR_TO_CATEGORY:
            return NAICS_SECTOR_TO_CATEGORY[sector]
    
    return None


def map_text_to_category(title, description):
    """
    Map contract text to a category using keyword matching.
    
    Args:
        title: Contract title/name
        description: Contract description/summary
    
    Returns:
        Category string or None if no strong match
    """
    if not title and not description:
        return None
    
    # Combine and lowercase text
    text = ((title or '') + ' ' + (description or '')).lower()
    
    if not text.strip():
        return None
    
    # Score each category based on keyword matches
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            if keyword in text:
                # Keywords in title get higher weight
                if title and keyword in title.lower():
                    score += 3
                else:
                    score += 1
        if score > 0:
            scores[category] = score
    
    # Return category with highest score if any matches
    if scores:
        best_category = max(scores, key=scores.get)
        return best_category
    
    return None


def map_payload_to_category(payload):
    """
    Map a contract payload to one of the DASHBOARD_CATEGORIES.
    
    This is the main entry point for category mapping. It uses a multi-step
    approach:
    1. Try NAICS code mapping (most reliable)
    2. Try text-based keyword matching
    3. Fall back to 'Other' only if no match found
    
    Args:
        payload: Dict with contract data. Expected fields:
            - naics_code: NAICS code(s) as string
            - naics_description: NAICS description (optional)
            - title or bid_name: Contract title
            - summary or bid_description: Contract description
    
    Returns:
        One of DASHBOARD_CATEGORIES strings
    """
    if not payload:
        return 'Other'
    
    # 1. Try NAICS code mapping first (most reliable)
    naics_raw = payload.get('naics_code') or payload.get('NAICS') or ''
    codes = parse_naics_codes(naics_raw)
    
    for code in codes:
        category = map_naics_to_category(code)
        if category:
            return category
    
    # 2. Try NAICS description for keywords
    naics_desc = payload.get('naics_description') or payload.get('NAICS_Description') or ''
    if naics_desc:
        category = map_text_to_category(naics_desc, '')
        if category:
            return category
    
    # 3. Try title and description for keywords
    title = payload.get('title') or payload.get('bid_name') or payload.get('Title') or ''
    description = (payload.get('summary') or payload.get('bid_description') or 
                   payload.get('description') or payload.get('Description') or '')
    
    category = map_text_to_category(title, description)
    if category:
        return category
    
    # 4. Fall back to 'Other' only if truly no match
    return 'Other'


def compute_category_distribution(payloads):
    """
    Compute category distribution from a list of contract payloads.
    
    Args:
        payloads: List of contract dicts
    
    Returns:
        Dict of {category_name: count} for all DASHBOARD_CATEGORIES
    """
    from collections import Counter
    
    # Map all payloads to categories
    categories = [map_payload_to_category(p) for p in payloads]
    counts = Counter(categories)
    
    # Ensure all dashboard categories are represented (even with 0 count)
    result = {cat: counts.get(cat, 0) for cat in DASHBOARD_CATEGORIES}
    
    return result


def get_top_categories(payloads, top_n=4):
    """
    Get the top N categories with counts and percentages.
    
    Args:
        payloads: List of contract dicts
        top_n: Number of top categories to return (default 4)
    
    Returns:
        List of dicts with 'name', 'count', 'percentage' keys
    """
    distribution = compute_category_distribution(payloads)
    total = sum(distribution.values())
    
    if total == 0:
        return []
    
    # Sort by count descending
    sorted_cats = sorted(distribution.items(), key=lambda x: x[1], reverse=True)
    
    # Take top N (excluding 'Other' if possible, unless it's the only one)
    result = []
    for cat_name, count in sorted_cats:
        if len(result) >= top_n:
            break
        # Skip 'Other' unless we don't have enough categories
        if cat_name == 'Other' and len(result) < top_n - 1:
            continue
        percentage = round((count / total * 100), 1)
        result.append({
            'name': cat_name,
            'count': count,
            'percentage': percentage
        })
    
    # If we still need more categories, add 'Other'
    if len(result) < top_n and 'Other' in distribution and distribution['Other'] > 0:
        other_count = distribution['Other']
        percentage = round((other_count / total * 100), 1)
        result.append({
            'name': 'Other',
            'count': other_count,
            'percentage': percentage
        })
    
    return result[:top_n]
