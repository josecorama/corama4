"""
Additional enhanced features for Contract Radar Maximizer
Making it the most powerful app for small businesses to find and secure contracts
"""

import os
import json
from datetime import datetime, timedelta
from openai import OpenAI
import logging

class ContractOpportunityScorer:
    """Advanced contract opportunity scoring system"""
    
    def __init__(self, openai_client):
        self.client = openai_client
    
    def score_opportunity(self, contract_data, company_profile):
        """Score contract opportunity based on multiple factors"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": """You are an expert government contracting analyst. Score this contract opportunity on a scale of 0-100 based on:
                    1. Company capability alignment (30%)
                    2. Competition level assessment (20%)
                    3. Contract value vs company size fit (15%)
                    4. Geographic proximity advantages (10%)
                    5. Past performance relevance (15%)
                    6. Timeline feasibility (10%)
                    
                    Return JSON with overall_score, category_scores, reasoning, and action_items."""},
                    {"role": "user", "content": f"Contract: {json.dumps(contract_data)[:2000]}\nCompany: {json.dumps(company_profile)[:1500]}"}
                ],
                temperature=0.1
            )
            
            result = response.choices[0].message.content
            return json.loads(result) if result.startswith('{') else {"overall_score": 50, "analysis": result}
        except Exception as e:
            logging.error(f"Error scoring opportunity: {e}")
            return {"overall_score": 0, "error": str(e)}

class CompetitiveIntelligence:
    """Competitive analysis and market intelligence"""
    
    def __init__(self, openai_client):
        self.client = openai_client
    
    def analyze_competition(self, contract_data, industry_sector):
        """Analyze competitive landscape for the contract"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": """Analyze the competitive landscape for this government contract. Provide:
                    1. Likely competitor types and profiles
                    2. Competitive advantages to emphasize
                    3. Market positioning strategies
                    4. Pricing strategy recommendations
                    5. Partnership opportunities
                    
                    Focus on actionable intelligence for small businesses."""},
                    {"role": "user", "content": f"Contract: {json.dumps(contract_data)[:2000]}\nIndustry: {industry_sector}"}
                ],
                temperature=0.2
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logging.error(f"Error analyzing competition: {e}")
            return "Unable to analyze competitive landscape at this time."

class ProposalOptimizer:
    """Advanced proposal optimization and enhancement"""
    
    def __init__(self, openai_client):
        self.client = openai_client
    
    def optimize_pricing_strategy(self, contract_requirements, company_costs, market_data):
        """Provide pricing optimization recommendations"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": """You are a government contracting pricing strategist. Analyze the contract requirements and provide:
                    1. Optimal pricing strategy (cost-plus, fixed-price, etc.)
                    2. Competitive pricing recommendations
                    3. Value-based pricing opportunities
                    4. Risk mitigation through pricing
                    5. Profit margin optimization
                    
                    Consider small business advantages and government evaluation criteria."""},
                    {"role": "user", "content": f"Requirements: {json.dumps(contract_requirements)[:1500]}\nCosts: {json.dumps(company_costs)[:1000]}\nMarket: {json.dumps(market_data)[:1000]}"}
                ],
                temperature=0.2
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logging.error(f"Error optimizing pricing: {e}")
            return "Unable to provide pricing optimization at this time."
    
    def enhance_technical_approach(self, technical_requirements, company_capabilities):
        """Enhance technical approach section of proposal"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": """Enhance the technical approach for this government contract proposal. Focus on:
                    1. Innovative solutions that exceed requirements
                    2. Risk mitigation strategies
                    3. Quality assurance methodologies
                    4. Performance metrics and KPIs
                    5. Technology advantages and differentiators
                    
                    Make the approach compelling and technically sound."""},
                    {"role": "user", "content": f"Technical Requirements: {json.dumps(technical_requirements)[:2000]}\nCapabilities: {json.dumps(company_capabilities)[:1500]}"}
                ],
                temperature=0.3
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logging.error(f"Error enhancing technical approach: {e}")
            return "Unable to enhance technical approach at this time."

class DeadlineManager:
    """Automated deadline and follow-up management"""
    
    def __init__(self, db):
        self.db = db
    
    def create_proposal_timeline(self, contract_data, user_id):
        """Create automated timeline for proposal development"""
        try:
            submission_date = datetime.strptime(contract_data.get('due_date', ''), '%Y-%m-%d')
            timeline = []
            
            milestones = [
                ("Initial Analysis Complete", -21),
                ("Technical Approach Draft", -18),
                ("Pricing Strategy Finalized", -15),
                ("Past Performance Section", -12),
                ("Management Plan Complete", -10),
                ("First Draft Complete", -8),
                ("Internal Review", -5),
                ("Final Review and Polish", -3),
                ("Submission Preparation", -1),
                ("Submission Deadline", 0)
            ]
            
            for milestone, days_offset in milestones:
                milestone_date = submission_date + timedelta(days=days_offset)
                timeline.append({
                    'milestone': milestone,
                    'date': milestone_date.isoformat(),
                    'days_from_submission': days_offset,
                    'completed': False
                })
            
            timeline_ref = self.db.child("proposal_timelines").child(user_id).child(contract_data.get('hash_value', 'unknown'))
            timeline_ref.set({
                'contract_title': contract_data.get('title', 'Unknown Contract'),
                'submission_date': submission_date.isoformat(),
                'timeline': timeline,
                'created_at': datetime.now().isoformat()
            })
            
            return timeline
        except Exception as e:
            logging.error(f"Error creating timeline: {e}")
            return []
    
    def get_upcoming_deadlines(self, user_id, days_ahead=7):
        """Get upcoming deadlines for user"""
        try:
            timelines_ref = self.db.child("proposal_timelines").child(user_id)
            timelines = timelines_ref.get().val()
            
            if not timelines:
                return []
            
            upcoming = []
            current_date = datetime.now()
            cutoff_date = current_date + timedelta(days=days_ahead)
            
            for contract_hash, timeline_data in timelines.items():
                for milestone in timeline_data.get('timeline', []):
                    milestone_date = datetime.fromisoformat(milestone['date'])
                    if current_date <= milestone_date <= cutoff_date and not milestone['completed']:
                        upcoming.append({
                            'contract_title': timeline_data.get('contract_title'),
                            'milestone': milestone['milestone'],
                            'date': milestone['date'],
                            'days_until': (milestone_date - current_date).days,
                            'contract_hash': contract_hash
                        })
            
            return sorted(upcoming, key=lambda x: x['date'])
        except Exception as e:
            logging.error(f"Error getting deadlines: {e}")
            return []

class IndustryTemplateLibrary:
    """Industry-specific proposal templates with AI customization"""
    
    def __init__(self, openai_client):
        self.client = openai_client
        self.templates = {
            'IT_SERVICES': {
                'sections': ['Executive Summary', 'Technical Approach', 'Cybersecurity Plan', 'Implementation Timeline', 'Support Structure'],
                'key_points': ['Security clearance capabilities', 'Agile methodology', 'Cloud solutions', 'Data protection']
            },
            'CONSTRUCTION': {
                'sections': ['Project Understanding', 'Construction Methodology', 'Safety Plan', 'Quality Control', 'Schedule Management'],
                'key_points': ['Safety record', 'Local workforce', 'Environmental compliance', 'Project management']
            },
            'PROFESSIONAL_SERVICES': {
                'sections': ['Understanding of Requirements', 'Methodology', 'Team Qualifications', 'Deliverables', 'Quality Assurance'],
                'key_points': ['Subject matter expertise', 'Proven methodologies', 'Client references', 'Value-added services']
            },
            'MAINTENANCE': {
                'sections': ['Service Approach', 'Preventive Maintenance Plan', 'Emergency Response', 'Performance Metrics', 'Cost Management'],
                'key_points': ['Response times', 'Preventive maintenance', 'Cost savings', 'Performance guarantees']
            }
        }
    
    def get_customized_template(self, industry, contract_requirements, company_profile):
        """Get AI-customized template for specific industry and contract"""
        try:
            template = self.templates.get(industry.upper(), self.templates['PROFESSIONAL_SERVICES'])
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": f"""Customize this proposal template for the specific contract and company. 
                    Base template sections: {template['sections']}
                    Key focus areas: {template['key_points']}
                    
                    Provide a detailed, customized proposal structure with:
                    1. Tailored section titles and descriptions
                    2. Specific content recommendations for each section
                    3. Key differentiators to emphasize
                    4. Compliance requirements to address
                    5. Evaluation criteria alignment
                    
                    Make it specific to this contract and company."""},
                    {"role": "user", "content": f"Contract: {json.dumps(contract_requirements)[:2000]}\nCompany: {json.dumps(company_profile)[:1500]}"}
                ],
                temperature=0.2
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logging.error(f"Error customizing template: {e}")
            return f"Standard {industry} proposal template with sections: {', '.join(template['sections'])}"
