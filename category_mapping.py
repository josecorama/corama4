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
    'Infrastructure & Construction',
    'Professional & Technical Services',
    'IT & Telecommunications',
    'Medical & Human Services',
    'Commodities, Equipment & Logistics',
]

# NAICS 2-digit sector to category mapping
# Based on official NAICS sector definitions
NAICS_SECTOR_TO_CATEGORY = {
    '11': 'Commodities, Equipment & Logistics',
    '21': 'Infrastructure & Construction',
    '22': 'Infrastructure & Construction',
    '23': 'Infrastructure & Construction',
    '31': 'Commodities, Equipment & Logistics',
    '32': 'Commodities, Equipment & Logistics',
    '33': 'Commodities, Equipment & Logistics',
    '42': 'Commodities, Equipment & Logistics',
    '44': 'Commodities, Equipment & Logistics',
    '45': 'Commodities, Equipment & Logistics',
    '48': 'Commodities, Equipment & Logistics',
    '49': 'Commodities, Equipment & Logistics',
    '51': 'IT & Telecommunications',
    '52': 'Professional & Technical Services',
    '53': 'Professional & Technical Services',
    '54': 'Professional & Technical Services',
    '55': 'Professional & Technical Services',
    '56': 'Infrastructure & Construction',
    '61': 'Professional & Technical Services',
    '62': 'Medical & Human Services',
    '71': 'Professional & Technical Services',
    '72': 'Commodities, Equipment & Logistics',
    '81': 'Infrastructure & Construction',
    '92': 'Professional & Technical Services',
}

NAICS_3DIGIT_TO_CATEGORY = {
    '511': 'IT & Telecommunications',
    '517': 'IT & Telecommunications',
    '518': 'IT & Telecommunications',
    '519': 'IT & Telecommunications',
    '541': 'Professional & Technical Services',
    '236': 'Infrastructure & Construction',
    '237': 'Infrastructure & Construction',
    '238': 'Infrastructure & Construction',
    '621': 'Medical & Human Services',
    '622': 'Medical & Human Services',
    '623': 'Medical & Human Services',
    '624': 'Medical & Human Services',
    '561': 'Infrastructure & Construction',
    '562': 'Infrastructure & Construction',
    '811': 'Infrastructure & Construction',
    '481': 'Commodities, Equipment & Logistics',
    '482': 'Commodities, Equipment & Logistics',
    '483': 'Commodities, Equipment & Logistics',
    '484': 'Commodities, Equipment & Logistics',
    '485': 'Commodities, Equipment & Logistics',
    '486': 'Commodities, Equipment & Logistics',
    '487': 'Commodities, Equipment & Logistics',
    '488': 'Commodities, Equipment & Logistics',
    '491': 'Commodities, Equipment & Logistics',
    '492': 'Commodities, Equipment & Logistics',
    '493': 'Commodities, Equipment & Logistics',
}

IT_NAICS_CODES = {
    '511210',
    '518210',
    '541511',
    '541512',
    '541513',
    '541519',
    '541611',
    '561621',
}

CATEGORY_KEYWORDS = {
    'Infrastructure & Construction': [
        'construction', 'building', 'renovation', 'remodel', 'repair',
        'roofing', 'plumbing', 'electrical', 'hvac', 'paving', 'concrete',
        'demolition', 'excavation', 'foundation', 'framing', 'drywall',
        'painting', 'flooring', 'carpentry', 'masonry', 'structural',
        'maintenance', 'janitorial', 'cleaning', 'custodial', 'landscaping',
        'grounds', 'facility', 'operations', 'service contract',
        'preventive maintenance', 'waste', 'disposal', 'recycling',
        'infrastructure', 'bridge', 'road', 'highway', 'tunnel', 'dam',
        'water treatment', 'sewer', 'site work', 'contractor',
        'install', 'installation', 'modernization', 'expansion',
        'security', 'guard', 'patrol', 'pest control', 'snow removal',
        'elevator', 'escalator', 'fire alarm', 'sprinkler',
        'groundskeeping', 'mowing', 'trimming', 'irrigation',
    ],
    'Professional & Technical Services': [
        'consulting', 'advisory', 'professional services', 'management',
        'engineering', 'architect', 'legal', 'accounting', 'audit',
        'research', 'analysis', 'training', 'education', 'staffing',
        'financial', 'planning', 'design', 'assessment', 'evaluation',
        'compliance', 'regulatory', 'environmental', 'safety', 'quality',
        'certification', 'accreditation', 'licensing', 'review', 'survey',
        'investigation', 'marketing', 'communications', 'public relations',
        'writing', 'editing', 'translation', 'documentation',
        'project management', 'program management', 'contract management',
        'human resources', 'hr', 'recruitment', 'personnel',
    ],
    'IT & Telecommunications': [
        'software', 'computer', 'it services', 'information technology',
        'cybersecurity', 'cyber security', 'network', 'database', 'cloud',
        'programming', 'developer', 'web development', 'application',
        'data center', 'hosting', 'saas', 'hardware', 'server', 'tech support',
        'helpdesk', 'help desk', 'it support', 'systems integration',
        'telecommunications', 'telecom', 'voip', 'video conferencing',
        'internet', 'wifi', 'broadband', 'fiber optic', 'wireless',
        'mobile', 'app', 'digital', 'electronic', 'online', 'virtual',
        'firewall', 'antivirus', 'encryption', 'cyber', 'data',
        'managed services', 'automation', 'analytics', 'artificial intelligence',
        'machine learning', 'website', 'portal', 'platform',
    ],
    'Medical & Human Services': [
        'healthcare', 'health care', 'medical', 'hospital', 'clinical',
        'pharmaceutical', 'nursing', 'patient', 'diagnostic', 'therapy',
        'dental', 'laboratory', 'ambulance', 'emergency medical', 'physician',
        'mental health', 'behavioral health', 'social services', 'social work',
        'counseling', 'rehabilitation', 'assisted living', 'elder care',
        'childcare', 'child welfare', 'disability', 'veterans', 'homeless',
        'substance abuse', 'public health', 'epidemiology', 'vaccine',
        'nutritional', 'dietary', 'wellness', 'fitness',
    ],
    'Commodities, Equipment & Logistics': [
        'supplies', 'equipment', 'materials', 'parts', 'furniture',
        'office supplies', 'tools', 'machinery', 'commodities', 'products',
        'procurement', 'purchase', 'acquisition', 'delivery', 'shipment',
        'transportation', 'shipping', 'freight', 'logistics', 'trucking',
        'fleet', 'vehicle', 'transit', 'bus', 'rail', 'air cargo',
        'warehouse', 'inventory', 'supply chain', 'distribution',
        'fuel', 'oil', 'gas', 'chemical', 'food', 'clothing', 'textile',
        'battery', 'cable', 'wire', 'valve', 'pump', 'motor', 'engine',
        'generator', 'compressor', 'filter', 'bearing', 'seal', 'gasket',
        'bolt', 'nut', 'screw', 'fastener', 'tire', 'brake',
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
        return 'IT & Telecommunications'
    
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
        return 'Commodities, Equipment & Logistics'
    
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
    
    return 'Commodities, Equipment & Logistics'


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


def get_top_categories(payloads, top_n=5):
    distribution = compute_category_distribution(payloads)
    total = sum(distribution.values())

    if total == 0:
        return []

    sorted_cats = sorted(distribution.items(), key=lambda x: x[1], reverse=True)

    result = []
    for cat_name, count in sorted_cats:
        if len(result) >= top_n:
            break
        percentage = round((count / total * 100), 1)
        result.append({
            'name': cat_name,
            'count': count,
            'percentage': percentage
        })

    return result[:top_n]
