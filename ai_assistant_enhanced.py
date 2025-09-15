"""
Enhanced AI Assistant for Contract Radar Maximizer
Provides comprehensive bid application creation capabilities
"""

import os
import json
from openai import OpenAI
from flask import request, jsonify, session
from datetime import datetime
import logging

class EnhancedAIAssistant:
    def __init__(self, app, db):
        self.app = app
        self.db = db
        self.client = OpenAI(api_key=os.getenv('BID_RESPONSE_OPENAI_API_KEY'))
        self.fine_tuned_model = "ft:gpt-3.5-turbo-0125:personal:bid-response:9oyXR6qz"
        
    def get_conversation_context(self, user_id, contract_hash):
        """Retrieve conversation history for context"""
        try:
            conversation_ref = self.db.child("conversations").child(user_id).child(contract_hash)
            conversation = conversation_ref.get().val()
            return conversation if conversation else []
        except Exception as e:
            self.app.logger.error(f"Error retrieving conversation: {e}")
            return []
    
    def save_conversation_turn(self, user_id, contract_hash, user_message, ai_response):
        """Save conversation turn for context building"""
        try:
            conversation_ref = self.db.child("conversations").child(user_id).child(contract_hash)
            turn = {
                'timestamp': datetime.now().isoformat(),
                'user_message': user_message,
                'ai_response': ai_response,
                'turn_id': datetime.now().timestamp()
            }
            conversation_ref.push(turn)
        except Exception as e:
            self.app.logger.error(f"Error saving conversation: {e}")
    
    def analyze_contract_requirements(self, contract_content):
        """Extract key requirements from contract using AI"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """You are an expert contract analyst. Extract and categorize the key requirements from this government contract. Focus on:
                    1. Technical requirements and specifications
                    2. Experience and qualification requirements
                    3. Compliance and certification needs
                    4. Deliverables and timeline requirements
                    5. Budget constraints and payment terms
                    6. Evaluation criteria and scoring factors
                    
                    Return a structured JSON response with these categories."""},
                    {"role": "user", "content": f"Analyze this contract: {contract_content[:4000]}"}
                ],
                temperature=0.1
            )
            
            requirements = response.choices[0].message.content
            return json.loads(requirements) if requirements.startswith('{') else {"analysis": requirements}
        except Exception as e:
            self.app.logger.error(f"Error analyzing contract requirements: {e}")
            return {"error": "Failed to analyze contract requirements"}
    
    def calculate_win_probability(self, capability_statement, contract_requirements):
        """Calculate win probability based on capability alignment"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """You are an expert bid strategist. Analyze the alignment between a company's capabilities and contract requirements. 
                    Provide a win probability score (0-100) and detailed reasoning including:
                    1. Strengths and competitive advantages
                    2. Gaps and weaknesses
                    3. Risk factors
                    4. Recommended strategies to improve chances
                    
                    Return a JSON response with 'probability', 'strengths', 'gaps', 'risks', and 'recommendations'."""},
                    {"role": "user", "content": f"Capability Statement: {capability_statement[:2000]}\n\nContract Requirements: {json.dumps(contract_requirements)[:2000]}"}
                ],
                temperature=0.2
            )
            
            analysis = response.choices[0].message.content
            return json.loads(analysis) if analysis.startswith('{') else {"probability": 50, "analysis": analysis}
        except Exception as e:
            self.app.logger.error(f"Error calculating win probability: {e}")
            return {"probability": 0, "error": "Failed to calculate win probability"}
    
    def generate_compliance_checklist(self, contract_requirements):
        """Generate compliance checklist for the contract"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """Create a comprehensive compliance checklist for this government contract. Include:
                    1. Required certifications and registrations
                    2. Documentation requirements
                    3. Technical compliance items
                    4. Submission requirements and deadlines
                    5. Format and presentation requirements
                    
                    Return as a structured JSON with categories and checklist items."""},
                    {"role": "user", "content": f"Contract Requirements: {json.dumps(contract_requirements)[:3000]}"}
                ],
                temperature=0.1
            )
            
            checklist = response.choices[0].message.content
            return json.loads(checklist) if checklist.startswith('{') else {"checklist": checklist}
        except Exception as e:
            self.app.logger.error(f"Error generating compliance checklist: {e}")
            return {"error": "Failed to generate compliance checklist"}
    
    def suggest_bid_strategy(self, contract_analysis, capability_analysis, win_probability):
        """Suggest optimal bid strategy based on analysis"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """You are a senior bid strategist. Based on the contract analysis, capability assessment, and win probability, recommend a comprehensive bid strategy including:
                    1. Positioning and value proposition
                    2. Pricing strategy recommendations
                    3. Team composition and partnerships
                    4. Risk mitigation approaches
                    5. Differentiation strategies
                    6. Proposal structure and emphasis areas
                    
                    Provide actionable, specific recommendations."""},
                    {"role": "user", "content": f"Contract Analysis: {json.dumps(contract_analysis)[:1500]}\nCapability Analysis: {json.dumps(capability_analysis)[:1500]}\nWin Probability: {win_probability}%"}
                ],
                temperature=0.3
            )
            
            return response.choices[0].message.content
        except Exception as e:
            self.app.logger.error(f"Error generating bid strategy: {e}")
            return "Failed to generate bid strategy recommendations"
    
    def generate_enhanced_response(self, user_query, context_data, conversation_history):
        """Generate enhanced AI response with full context"""
        try:
            system_prompt = f"""You are an expert government contracting consultant and bid writer for Contract Radar Maximizer. 
            You help small businesses create winning government contract proposals.
            
            Context Information:
            - Contract Details: {context_data.get('contract_info', 'Not provided')}
            - Company Capabilities: {context_data.get('capability_statement', 'Not provided')}
            - Contract Requirements: {json.dumps(context_data.get('contract_requirements', {}))[:1000]}
            - Win Probability Analysis: {json.dumps(context_data.get('win_probability', {}))[:500]}
            - Compliance Checklist: {json.dumps(context_data.get('compliance_checklist', {}))[:500]}
            
            Previous Conversation:
            {json.dumps(conversation_history[-5:])[:1000] if conversation_history else 'No previous conversation'}
            
            Provide comprehensive, actionable guidance for creating compelling bid responses. 
            Focus on helping small businesses win government contracts through strategic positioning, 
            compliance adherence, and compelling value propositions."""
            
            response = self.client.chat.completions.create(
                model=self.fine_tuned_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query}
                ],
                temperature=0.2,
                max_tokens=1500
            )
            
            return response.choices[0].message.content
        except Exception as e:
            self.app.logger.error(f"Error generating enhanced response: {e}")
            return "I apologize, but I'm experiencing technical difficulties. Please try again."
    
    def generate_proposal_outline(self, contract_requirements, capability_statement):
        """Generate a structured proposal outline"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """Create a comprehensive proposal outline for this government contract bid. Include:
                    1. Executive Summary structure
                    2. Technical Approach sections
                    3. Management Plan components
                    4. Past Performance organization
                    5. Pricing Strategy framework
                    6. Appendices and supporting documents
                    
                    Tailor the outline to the specific contract requirements and company capabilities.
                    Return as a structured JSON with sections, subsections, and key points to address."""},
                    {"role": "user", "content": f"Contract Requirements: {json.dumps(contract_requirements)[:2000]}\nCompany Capabilities: {capability_statement[:1500]}"}
                ],
                temperature=0.2
            )
            
            outline = response.choices[0].message.content
            return json.loads(outline) if outline.startswith('{') else {"outline": outline}
        except Exception as e:
            self.app.logger.error(f"Error generating proposal outline: {e}")
            return {"error": "Failed to generate proposal outline"}
