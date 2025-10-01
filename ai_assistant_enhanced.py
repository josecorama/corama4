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
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
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
    
    def generate_full_proposal(self, contract_requirements, capability_statement, user_documents=None, target_pages=35):
        """Generate comprehensive multi-page proposal (30-50 pages) - optimized to avoid timeouts"""
        try:
            proposal_content = self._generate_comprehensive_proposal_optimized(contract_requirements, capability_statement)
            
            return {
                "proposal_sections": proposal_content["sections"],
                "total_estimated_pages": proposal_content["total_pages"],
                "generation_timestamp": datetime.now().isoformat(),
                "comprehensive_content": proposal_content["full_content"]
            }
            
        except Exception as e:
            self.app.logger.error(f"Error generating full proposal: {e}")
            return {"error": "Failed to generate comprehensive proposal"}
    
    def _generate_executive_summary(self, contract_requirements, capability_statement):
        """Generate detailed executive summary section"""
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """Create a comprehensive 2-3 page executive summary for this government contract proposal. Include:
                1. Project understanding and objectives
                2. Our unique value proposition and competitive advantages
                3. Key personnel and team qualifications
                4. Technical approach overview
                5. Past performance highlights
                6. Pricing competitiveness
                7. Risk mitigation summary
                8. Expected outcomes and benefits
                
                Write in professional government contracting language with specific details."""},
                {"role": "user", "content": f"Contract: {json.dumps(contract_requirements)[:3000]}\nCapabilities: {capability_statement[:2000]}"}
            ],
            temperature=0.2,
            max_tokens=4000
        )
        return response.choices[0].message.content
    
    def _generate_technical_approach(self, contract_requirements, capability_statement):
        """Generate detailed technical approach section"""
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """Create a comprehensive 8-12 page technical approach section. Include:
                1. Detailed methodology and work breakdown structure
                2. Technical specifications and compliance
                3. Innovation and technology solutions
                4. Implementation timeline and milestones
                5. Quality control procedures
                6. Performance metrics and KPIs
                7. Technical team structure and expertise
                8. Tools, software, and equipment
                9. Deliverables and documentation
                10. Technical risk mitigation
                
                Provide specific, actionable details that demonstrate deep understanding."""},
                {"role": "user", "content": f"Contract: {json.dumps(contract_requirements)[:3000]}\nCapabilities: {capability_statement[:2000]}"}
            ],
            temperature=0.2,
            max_tokens=4000
        )
        return response.choices[0].message.content
    
    def _generate_management_plan(self, contract_requirements, capability_statement):
        """Generate detailed management plan section"""
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """Create a comprehensive 6-8 page management plan section. Include:
                1. Project management methodology and framework
                2. Organizational structure and reporting relationships
                3. Key personnel roles and responsibilities
                4. Communication and coordination procedures
                5. Schedule management and milestone tracking
                6. Resource allocation and management
                7. Quality management system
                8. Change management procedures
                9. Performance monitoring and control
                10. Stakeholder engagement strategy
                
                Demonstrate proven management capabilities and processes."""},
                {"role": "user", "content": f"Contract: {json.dumps(contract_requirements)[:3000]}\nCapabilities: {capability_statement[:2000]}"}
            ],
            temperature=0.2,
            max_tokens=4000
        )
        return response.choices[0].message.content
    
    def _generate_past_performance(self, capability_statement, user_documents):
        """Generate detailed past performance section"""
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """Create a comprehensive 5-7 page past performance section. Include:
                1. Relevant project examples with detailed descriptions
                2. Contract performance metrics and outcomes
                3. Client testimonials and references
                4. Lessons learned and continuous improvement
                5. Awards, certifications, and recognition
                6. Team experience and qualifications
                7. Subcontractor and partner performance
                8. Performance against schedule, budget, and quality metrics
                
                Highlight directly relevant experience that demonstrates capability."""},
                {"role": "user", "content": f"Capabilities: {capability_statement[:3000]}\nDocuments: {str(user_documents)[:1000] if user_documents else 'No additional documents'}"}
            ],
            temperature=0.2,
            max_tokens=4000
        )
        return response.choices[0].message.content
    
    def _generate_pricing_strategy(self, contract_requirements, capability_statement):
        """Generate detailed pricing strategy section"""
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """Create a comprehensive 3-5 page pricing strategy section. Include:
                1. Cost breakdown structure and methodology
                2. Labor categories and rates justification
                3. Direct and indirect cost analysis
                4. Fee structure and profit margins
                5. Cost control measures and efficiency strategies
                6. Value engineering opportunities
                7. Pricing competitiveness analysis
                8. Cost risk assessment and mitigation
                9. Payment terms and cash flow considerations
                
                Provide transparent, competitive pricing that demonstrates value."""},
                {"role": "user", "content": f"Contract: {json.dumps(contract_requirements)[:3000]}\nCapabilities: {capability_statement[:2000]}"}
            ],
            temperature=0.2,
            max_tokens=4000
        )
        return response.choices[0].message.content
    
    def _generate_quality_assurance(self, contract_requirements):
        """Generate detailed quality assurance section"""
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """Create a comprehensive 3-4 page quality assurance section. Include:
                1. Quality management system and standards
                2. Quality control procedures and checkpoints
                3. Testing and validation methodologies
                4. Documentation and record keeping
                5. Continuous improvement processes
                6. Quality metrics and performance indicators
                7. Corrective and preventive action procedures
                8. Quality training and certification requirements
                
                Demonstrate commitment to delivering high-quality results."""},
                {"role": "user", "content": f"Contract: {json.dumps(contract_requirements)[:3000]}"}
            ],
            temperature=0.2,
            max_tokens=4000
        )
        return response.choices[0].message.content
    
    def _generate_risk_management(self, contract_requirements):
        """Generate detailed risk management section"""
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """Create a comprehensive 2-3 page risk management section. Include:
                1. Risk identification and assessment methodology
                2. Risk register with probability and impact analysis
                3. Risk mitigation strategies and contingency plans
                4. Risk monitoring and reporting procedures
                5. Escalation procedures and decision-making authority
                6. Insurance and liability considerations
                7. Business continuity and disaster recovery plans
                8. Lessons learned from previous projects
                
                Show proactive risk management capabilities."""},
                {"role": "user", "content": f"Contract: {json.dumps(contract_requirements)[:3000]}"}
            ],
            temperature=0.2,
            max_tokens=4000
        )
        return response.choices[0].message.content
    
    def _generate_comprehensive_proposal_optimized(self, contract_requirements, capability_statement):
        """Generate comprehensive proposal in optimized way to avoid timeouts"""
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """You are an expert proposal writer creating a comprehensive 30-50 page government contract proposal. Generate a complete, detailed proposal with the following sections:

1. EXECUTIVE SUMMARY (3-4 pages)
- Project understanding and objectives
- Unique value proposition and competitive advantages
- Key personnel and team qualifications
- Technical approach overview
- Past performance highlights
- Pricing competitiveness
- Risk mitigation summary
- Expected outcomes and benefits

2. TECHNICAL APPROACH (12-15 pages)
- Detailed methodology and work breakdown structure
- Technical specifications and compliance
- Innovation and technology solutions
- Implementation timeline and milestones
- Quality control procedures
- Performance metrics and KPIs
- Technical team structure and expertise
- Tools, software, and equipment
- Deliverables and documentation
- Technical risk mitigation

3. MANAGEMENT PLAN (8-10 pages)
- Project management methodology and framework
- Organizational structure and reporting relationships
- Key personnel roles and responsibilities
- Communication and coordination procedures
- Schedule management and milestone tracking
- Resource allocation and management
- Quality management system
- Change management procedures
- Performance monitoring and control
- Stakeholder engagement strategy

4. PAST PERFORMANCE (6-8 pages)
- Relevant project examples with detailed descriptions
- Contract performance metrics and outcomes
- Client testimonials and references
- Lessons learned and continuous improvement
- Awards, certifications, and recognition
- Team experience and qualifications
- Subcontractor and partner performance
- Performance against schedule, budget, and quality metrics

5. PRICING STRATEGY (4-5 pages)
- Cost breakdown structure and methodology
- Labor categories and rates justification
- Direct and indirect cost analysis
- Fee structure and profit margins
- Cost control measures and efficiency strategies
- Value engineering opportunities
- Pricing competitiveness analysis
- Cost risk assessment and mitigation

6. QUALITY ASSURANCE (3-4 pages)
- Quality management system and standards
- Quality control procedures and checkpoints
- Testing and validation methodologies
- Documentation and record keeping
- Continuous improvement processes
- Quality metrics and performance indicators
- Corrective and preventive action procedures

7. RISK MANAGEMENT (2-3 pages)
- Risk identification and assessment methodology
- Risk register with probability and impact analysis
- Risk mitigation strategies and contingency plans
- Risk monitoring and reporting procedures
- Escalation procedures and decision-making authority
- Insurance and liability considerations

Write each section with substantial, detailed content that demonstrates deep expertise and understanding. Use professional government contracting language with specific details, metrics, and examples. Make it comprehensive like a Gamma.app presentation with rich, detailed content."""},
                {"role": "user", "content": f"Contract Requirements: {json.dumps(contract_requirements)[:2500]}\n\nCapability Statement: {capability_statement[:2000]}\n\nGenerate a comprehensive, detailed 30-50 page proposal for this government contract with extensive content in each section."}
            ],
            temperature=0.2,
            max_tokens=12000
        )
        
        full_content = response.choices[0].message.content
        
        sections = []
        section_titles = [
            "EXECUTIVE SUMMARY",
            "TECHNICAL APPROACH", 
            "MANAGEMENT PLAN",
            "PAST PERFORMANCE",
            "PRICING STRATEGY",
            "QUALITY ASSURANCE",
            "RISK MANAGEMENT"
        ]
        
        current_section = ""
        current_content = ""
        
        for line in full_content.split('\n'):
            line_upper = line.strip().upper()
            if any(title in line_upper for title in section_titles):
                if current_section and current_content:
                    sections.append({
                        "section": current_section,
                        "content": current_content.strip(),
                        "pages": self._estimate_pages(current_content)
                    })
                current_section = line.strip()
                current_content = ""
            else:
                current_content += line + "\n"
        
        if current_section and current_content:
            sections.append({
                "section": current_section,
                "content": current_content.strip(),
                "pages": self._estimate_pages(current_content)
            })
        
        total_pages = sum(section.get("pages", 0) for section in sections)
        
        return {
            "sections": sections,
            "total_pages": total_pages,
            "full_content": full_content
        }
    
    def _estimate_pages(self, content):
        """Estimate number of pages based on content length"""
        words = len(content.split())
        return max(1, round(words / 250))
