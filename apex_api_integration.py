"""
APEX Accelerator API Integration Module
Integrates with SAM.gov and USASpending.gov APIs to fetch contract award data
"""

import os
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import time

logger = logging.getLogger(__name__)


class SAMgovAPI:
    """Interface for SAM.gov Entity Management and Opportunities APIs"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize SAM.gov API client
        
        Args:
            api_key: SAM.gov API key (optional, can use environment variable)
        """
        self.api_key = api_key or os.getenv('SAM_GOV_API_KEY')
        self.base_url = "https://api.sam.gov"
        self.session = requests.Session()
        
        if self.api_key:
            self.session.headers.update({'X-Api-Key': self.api_key})
    
    def get_recent_awards(self, days_back: int = 1, min_value: float = 25000) -> List[Dict]:
        """
        Get recent contract awards from SAM.gov
        
        Args:
            days_back: Number of days to look back
            min_value: Minimum contract value to include
            
        Returns:
            List of award dictionaries
        """
        try:
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days_back)
            
            url = f"{self.base_url}/opportunities/v2/search"
            
            params = {
                'postedFrom': start_date.strftime('%m/%d/%Y'),
                'postedTo': end_date.strftime('%m/%d/%Y'),
                'ptype': 'a',  # Award notices
                'limit': 1000,
                'offset': 0
            }
            
            logger.info(f"Fetching awards from SAM.gov: {start_date} to {end_date}")
            
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            opportunities = data.get('opportunitiesData', [])
            
            awards = []
            for opp in opportunities:
                award_amount = self._parse_amount(opp.get('award', {}).get('amount', '0'))
                if award_amount < min_value:
                    continue
                
                award = {
                    'contract_number': opp.get('solicitationNumber', ''),
                    'award_description': opp.get('title', ''),
                    'awarding_agency': opp.get('department', {}).get('name', ''),
                    'awarding_office': opp.get('officeAddress', {}).get('city', ''),
                    'award_amount': award_amount,
                    'award_date': opp.get('postedDate', ''),
                    'recipient_name': opp.get('award', {}).get('awardee', {}).get('name', ''),
                    'recipient_duns': opp.get('award', {}).get('awardee', {}).get('duns', ''),
                    'recipient_uei': opp.get('award', {}).get('awardee', {}).get('ueiSAM', ''),
                    'naics_code': opp.get('naicsCode', ''),
                    'place_of_performance': opp.get('placeOfPerformance', {}).get('city', {}).get('name', ''),
                    'data_source': 'sam_gov_api',
                    'source_url': opp.get('uiLink', '')
                }
                
                awards.append(award)
            
            logger.info(f"Retrieved {len(awards)} awards from SAM.gov")
            return awards
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching awards from SAM.gov: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in SAM.gov API: {str(e)}")
            return []
    
    def search_entity_by_uei(self, uei: str) -> Optional[Dict]:
        """
        Search for an entity by UEI code
        
        Args:
            uei: Unique Entity Identifier
            
        Returns:
            Entity information dictionary or None
        """
        try:
            url = f"{self.base_url}/entity-information/v3/entities"
            params = {
                'ueiSAM': uei,
                'includeSections': 'entityRegistration,coreData'
            }
            
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            entities = data.get('entityData', [])
            
            if entities:
                return entities[0]
            return None
            
        except Exception as e:
            logger.error(f"Error searching entity by UEI {uei}: {str(e)}")
            return None
    
    def _parse_amount(self, amount_str: str) -> float:
        """Parse amount string to float"""
        try:
            cleaned = amount_str.replace('$', '').replace(',', '').strip()
            return float(cleaned) if cleaned else 0.0
        except:
            return 0.0


class USASpendingAPI:
    """Interface for USASpending.gov API"""
    
    def __init__(self):
        """Initialize USASpending.gov API client"""
        self.base_url = "https://api.usaspending.gov/api/v2"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
    
    def get_recent_awards(self, days_back: int = 1, min_value: float = 25000) -> List[Dict]:
        """
        Get recent contract awards from USASpending.gov
        
        Args:
            days_back: Number of days to look back
            min_value: Minimum contract value to include
            
        Returns:
            List of award dictionaries
        """
        try:
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days_back)
            
            url = f"{self.base_url}/search/spending_by_award"
            
            payload = {
                "filters": {
                    "time_period": [
                        {
                            "start_date": start_date.strftime('%Y-%m-%d'),
                            "end_date": end_date.strftime('%Y-%m-%d')
                        }
                    ],
                    "award_type_codes": ["A", "B", "C", "D"],  # Contract types
                    "award_amounts": [
                        {
                            "lower_bound": min_value
                        }
                    ]
                },
                "fields": [
                    "Award ID",
                    "Recipient Name",
                    "Award Amount",
                    "Award Type",
                    "Awarding Agency",
                    "Awarding Sub Agency",
                    "Start Date",
                    "End Date",
                    "Description",
                    "recipient_uei",
                    "recipient_duns",
                    "naics_code",
                    "place_of_performance_city_name"
                ],
                "limit": 500,
                "page": 1,
                "sort": "Award Amount",
                "order": "desc"
            }
            
            logger.info(f"Fetching awards from USASpending.gov: {start_date} to {end_date}")
            
            response = self.session.post(url, json=payload, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            results = data.get('results', [])
            
            awards = []
            for result in results:
                award = {
                    'contract_number': result.get('Award ID', ''),
                    'award_description': result.get('Description', ''),
                    'awarding_agency': result.get('Awarding Agency', ''),
                    'awarding_office': result.get('Awarding Sub Agency', ''),
                    'award_amount': float(result.get('Award Amount', 0)),
                    'award_date': result.get('Start Date', ''),
                    'period_of_performance_start': result.get('Start Date', ''),
                    'period_of_performance_end': result.get('End Date', ''),
                    'recipient_name': result.get('Recipient Name', ''),
                    'recipient_duns': result.get('recipient_duns', ''),
                    'recipient_uei': result.get('recipient_uei', ''),
                    'naics_code': result.get('naics_code', ''),
                    'place_of_performance': result.get('place_of_performance_city_name', ''),
                    'data_source': 'usaspending_api',
                    'source_url': f"https://www.usaspending.gov/award/{result.get('Award ID', '')}"
                }
                
                awards.append(award)
            
            logger.info(f"Retrieved {len(awards)} awards from USASpending.gov")
            return awards
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching awards from USASpending.gov: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in USASpending.gov API: {str(e)}")
            return []
    
    def get_award_details(self, award_id: str) -> Optional[Dict]:
        """
        Get detailed information about a specific award
        
        Args:
            award_id: Award identifier
            
        Returns:
            Award details dictionary or None
        """
        try:
            url = f"{self.base_url}/awards/{award_id}"
            
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error getting award details for {award_id}: {str(e)}")
            return None
    
    def search_awards_by_recipient(self, recipient_uei: Optional[str] = None, 
                                   recipient_duns: Optional[str] = None,
                                   recipient_name: Optional[str] = None,
                                   days_back: int = 365) -> List[Dict]:
        """
        Search for awards by recipient identifiers
        
        Args:
            recipient_uei: Recipient UEI code
            recipient_duns: Recipient DUNS number
            recipient_name: Recipient company name
            days_back: Number of days to look back
            
        Returns:
            List of award dictionaries
        """
        try:
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days_back)
            
            url = f"{self.base_url}/search/spending_by_award"
            
            filters = {
                "time_period": [
                    {
                        "start_date": start_date.strftime('%Y-%m-%d'),
                        "end_date": end_date.strftime('%Y-%m-%d')
                    }
                ],
                "award_type_codes": ["A", "B", "C", "D"]
            }
            
            if recipient_uei:
                filters["recipient_id"] = recipient_uei
            elif recipient_duns:
                filters["recipient_search_text"] = [recipient_duns]
            elif recipient_name:
                filters["recipient_search_text"] = [recipient_name]
            else:
                return []
            
            payload = {
                "filters": filters,
                "fields": [
                    "Award ID",
                    "Recipient Name",
                    "Award Amount",
                    "Start Date",
                    "End Date",
                    "Description",
                    "Awarding Agency"
                ],
                "limit": 100,
                "page": 1
            }
            
            response = self.session.post(url, json=payload, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            results = data.get('results', [])
            
            awards = []
            for result in results:
                award = {
                    'contract_number': result.get('Award ID', ''),
                    'award_description': result.get('Description', ''),
                    'awarding_agency': result.get('Awarding Agency', ''),
                    'award_amount': float(result.get('Award Amount', 0)),
                    'award_date': result.get('Start Date', ''),
                    'period_of_performance_start': result.get('Start Date', ''),
                    'period_of_performance_end': result.get('End Date', ''),
                    'recipient_name': result.get('Recipient Name', ''),
                    'data_source': 'usaspending_api'
                }
                
                awards.append(award)
            
            return awards
            
        except Exception as e:
            logger.error(f"Error searching awards by recipient: {str(e)}")
            return []


class ApexAPIOrchestrator:
    """Orchestrates API calls across multiple data sources"""
    
    def __init__(self, sam_api_key: Optional[str] = None):
        """
        Initialize the API Orchestrator
        
        Args:
            sam_api_key: SAM.gov API key (optional)
        """
        self.sam_api = SAMgovAPI(api_key=sam_api_key)
        self.usaspending_api = USASpendingAPI()
    
    def fetch_all_recent_awards(self, days_back: int = 1, min_value: float = 25000) -> List[Dict]:
        """
        Fetch recent awards from all available sources
        
        Args:
            days_back: Number of days to look back
            min_value: Minimum contract value
            
        Returns:
            Combined list of awards from all sources
        """
        all_awards = []
        
        logger.info("Fetching awards from USASpending.gov...")
        usaspending_awards = self.usaspending_api.get_recent_awards(days_back, min_value)
        all_awards.extend(usaspending_awards)
        
        time.sleep(1)
        
        if self.sam_api.api_key:
            logger.info("Fetching awards from SAM.gov...")
            sam_awards = self.sam_api.get_recent_awards(days_back, min_value)
            all_awards.extend(sam_awards)
        else:
            logger.warning("SAM.gov API key not configured, skipping SAM.gov data")
        
        unique_awards = {}
        for award in all_awards:
            contract_num = award.get('contract_number', '')
            if contract_num and contract_num not in unique_awards:
                unique_awards[contract_num] = award
        
        logger.info(f"Total unique awards fetched: {len(unique_awards)}")
        return list(unique_awards.values())
    
    def search_client_awards(self, client_data: Dict, days_back: int = 365) -> List[Dict]:
        """
        Search for awards associated with a specific client
        
        Args:
            client_data: Client information dictionary
            days_back: Number of days to look back
            
        Returns:
            List of awards for this client
        """
        awards = []
        
        if client_data.get('uei_code'):
            logger.info(f"Searching by UEI: {client_data['uei_code']}")
            uei_awards = self.usaspending_api.search_awards_by_recipient(
                recipient_uei=client_data['uei_code'],
                days_back=days_back
            )
            awards.extend(uei_awards)
        
        if not awards and client_data.get('duns_number'):
            logger.info(f"Searching by DUNS: {client_data['duns_number']}")
            duns_awards = self.usaspending_api.search_awards_by_recipient(
                recipient_duns=client_data['duns_number'],
                days_back=days_back
            )
            awards.extend(duns_awards)
        
        if not awards and client_data.get('company_name'):
            logger.info(f"Searching by name: {client_data['company_name']}")
            name_awards = self.usaspending_api.search_awards_by_recipient(
                recipient_name=client_data['company_name'],
                days_back=days_back
            )
            awards.extend(name_awards)
        
        return awards
