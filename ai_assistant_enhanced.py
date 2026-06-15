"""
Enhanced AI Assistant for Contract Radar Maximizer
Provides comprehensive bid application creation capabilities
"""

import os
import json
import time
from openai import OpenAI
from flask import request, jsonify, session
from datetime import datetime
import logging
import httpx

# OpenAI request timeout: keep well under gunicorn's 120s worker timeout
_OPENAI_TIMEOUT = httpx.Timeout(90.0, connect=10.0)
_MAX_RETRIES = 2

class EnhancedAIAssistant:
    def __init__(self, app, db):
        self.app = app
        self.db = db
        api_key = os.getenv('OPENAI_API_KEY') or os.getenv('BID_RESPONSE_OPENAI_API_KEY') or os.getenv('CS_BUILDER_OPENAI_API_KEY')
        if not api_key:
            raise ValueError("No OpenAI API key found. Please set OPENAI_API_KEY, BID_RESPONSE_OPENAI_API_KEY, or CS_BUILDER_OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key, timeout=_OPENAI_TIMEOUT, max_retries=_MAX_RETRIES)
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
    
    def generate_contract_analysis(self, contract_requirements, capability_statement, company_name="your company", uploaded_docs=None):
        """Generate comprehensive contract analysis in plain text format"""
        try:
            docs_context = ""
            if uploaded_docs:
                docs_context = "\n\nAdditional Company Documents:\n"
                for doc in uploaded_docs:
                    docs_context += f"{doc['filename']}: {doc['content_excerpt'][:200]}...\n"
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": f"""You are an expert government contracting analyst for {company_name}. Provide a comprehensive contract opportunity analysis.
                    
                    CRITICAL FORMATTING REQUIREMENTS:
                    - Output PLAIN TEXT ONLY - NO markdown symbols
                    - NO asterisks (**), NO hashtags (##), NO bullets (-, •), NO special formatting
                    - Use simple numbered lists and clear section headings in UPPERCASE
                    - Write in paragraph form ready to copy/paste directly into documents
                    - Structure content in clear sections for easy copy/paste into proposals
                    - Emphasize {company_name}'s unique strengths and competitive advantages
                    
                    FORMAT YOUR ANALYSIS AS:
                    
                    CONTRACT OPPORTUNITY ANALYSIS FOR {company_name.upper()}
                    
                    ESTIMATED WIN PROBABILITY
                    Probability: [percentage]%
                    
                    KEY FACTORS
                    Write detailed paragraphs about factors impacting {company_name}'s chances...
                    
                    COMPETITIVE STRENGTHS OF {company_name.upper()}
                    1. First specific capability that gives {company_name} an edge
                    2. Second advantage for {company_name}
                    
                    GAPS AND MITIGATION
                    1. First gap that {company_name} needs to address and how to overcome it
                    2. Second challenge and mitigation strategy
                    
                    RISKS AND MITIGATION
                    1. First risk {company_name} should prepare for and action plan
                    2. Second challenge and response strategy
                    
                    STRATEGIC RECOMMENDATIONS FOR {company_name.upper()}
                    1. Immediate actions that {company_name} should do now
                    2. Proposal focus areas where {company_name} should emphasize strengths
                    3. Teaming considerations and potential partners for {company_name}
                    
                    Provide detailed, actionable insights specific to {company_name}'s profile and the uploaded context."""},
                    {"role": "user", "content": f"Analyze this contract opportunity for {company_name}.\n\nContract Requirements: {json.dumps(contract_requirements)[:2500]}\n\n{company_name} Capabilities: {capability_statement[:2000]}{docs_context}"}
                ],
                temperature=0.2,
                max_tokens=2000
            )
            
            return response.choices[0].message.content
        except Exception as e:
            self.app.logger.error(f"Error generating contract analysis: {e}")
            return f"Analysis Error: Failed to generate comprehensive analysis for {company_name}. Please try again."
    
    def generate_compliance_checklist(self, contract_requirements, company_name="your company"):
        """Generate compliance checklist for the contract"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": f"""Create a comprehensive compliance checklist for {company_name} for this government contract bid. Include:
                    1. Mandatory requirements and certifications
                    2. Technical compliance items
                    3. Administrative requirements
                    4. Documentation needs
                    5. Deadline and submission requirements
                    6. Special provisions and clauses
                    
                    CRITICAL FORMATTING REQUIREMENTS:
                    - Output PLAIN TEXT ONLY - NO markdown symbols
                    - NO asterisks (**), NO hashtags (##), NO checkboxes (- [ ]), NO special formatting
                    - Use simple numbered lists and clear section headings
                    - Write in plain paragraph and list form ready to copy/paste directly
                    
                    Format your response like:
                    
                    COMPLIANCE CHECKLIST FOR {company_name.upper()}
                    
                    MANDATORY REQUIREMENTS
                    1. First requirement description
                    2. Second requirement description
                    
                    TECHNICAL COMPLIANCE
                    1. First technical item
                    2. Second technical item
                    
                    Make it actionable and specific to {company_name}'s proposal needs."""},
                    {"role": "user", "content": f"Generate compliance checklist for {company_name}. Contract Requirements: {json.dumps(contract_requirements)[:2000]}"}
                ],
                temperature=0.1
            )
            
            return response.choices[0].message.content
        except Exception as e:
            self.app.logger.error(f"Error generating compliance checklist: {e}")
            return f"Compliance Checklist Error: Failed to generate checklist for {company_name}."
    
    def suggest_bid_strategy(self, contract_requirements, capability_statement, company_name="your company"):
        """Suggest optimal bidding strategy"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": f"""Analyze the contract and {company_name}'s capabilities to suggest an optimal bid strategy. Consider:
                    1. Competitive positioning for {company_name}
                    2. Pricing strategy recommendations
                    3. Win themes and differentiators specific to {company_name}
                    4. Risk mitigation approaches
                    5. Partnership opportunities that leverage {company_name}'s strengths
                    6. Timeline and resource planning
                    
                    CRITICAL FORMATTING REQUIREMENTS:
                    - Output PLAIN TEXT ONLY - NO markdown symbols
                    - NO asterisks (**), NO hashtags (##), NO bullets (-, •), NO special formatting
                    - Use simple numbered lists and clear section headings
                    - Write in paragraph form ready to copy/paste directly into documents
                    
                    Format your response like:
                    
                    BID STRATEGY FOR {company_name.upper()}
                    
                    KEY DIFFERENTIATORS
                    1. First specific strength of {company_name}
                    2. Second advantage that sets {company_name} apart
                    
                    STRATEGIC RECOMMENDATIONS
                    1. First specific action for {company_name}
                    2. Second strategy recommendation for {company_name}
                    
                    Write detailed paragraphs explaining how {company_name} should position itself...
                    
                    Provide actionable strategic recommendations specific to {company_name}."""},
                    {"role": "user", "content": f"Contract: {json.dumps(contract_requirements)[:2000]}\n\n{company_name} Capabilities: {capability_statement[:1500]}"}
                ],
                temperature=0.3
            )
            
            return response.choices[0].message.content
        except Exception as e:
            self.app.logger.error(f"Error generating bid strategy: {e}")
            return f"Bid Strategy Error: Failed to generate strategy recommendations for {company_name}."
    
    def generate_enhanced_response(self, user_query, context_data, conversation_history):
        """Generate enhanced AI response with full context"""
        try:
            company_name = context_data.get('company_name', 'your company')
            uploaded_docs = context_data.get('uploaded_documents', [])
            
            docs_context = ""
            if uploaded_docs:
                docs_context = "\n\nAdditional Company Documents:\n"
                for doc in uploaded_docs:
                    docs_context += f"- {doc['filename']} ({doc['file_type']}): {doc['content_excerpt'][:300]}...\n"
            
            system_prompt = f"""You are an expert government contracting consultant and bid writer for Contract Radar Maximizer. 
            You help {company_name} create winning government contract proposals.
            
            CRITICAL INSTRUCTIONS FOR RESPONSE FORMATTING:
            - Output PLAIN TEXT ONLY - NO markdown symbols
            - NO asterisks (**), NO hashtags (##), NO bullets (-, •), NO special formatting
            - Use simple numbered lists and clear section headings in UPPERCASE
            - Write in paragraph form ready to copy/paste directly into documents
            - Structure content in clear sections for easy copy/paste
            - Make responses ready for direct use in proposals
            
            Company Profile: {company_name}
            
            Context Information:
            - Contract Details: {context_data.get('contract_info', 'Not provided')}
            - Company Capabilities: {context_data.get('capability_statement', 'Not provided')}
            {docs_context}
            - Contract Requirements: {json.dumps(context_data.get('contract_requirements', {}))[:1000]}
            - Win Probability Analysis: {json.dumps(context_data.get('win_probability', {}))[:500]}
            - Compliance Checklist: {json.dumps(context_data.get('compliance_checklist', {}))[:500]}
            
            Previous Conversation:
            {json.dumps(conversation_history[-5:])[:1000] if conversation_history else 'No previous conversation'}
            
            Provide comprehensive, actionable guidance specifically tailored to {company_name}'s strengths and capabilities. 
            Focus on helping {company_name} win this government contract through strategic positioning based on their unique profile,
            compliance adherence, and compelling value propositions. Reference uploaded documents when relevant.
            
            FORMAT YOUR RESPONSE WITH PLAIN TEXT:
            Use numbered lists like:
            1. First point
            2. Second point
            
            Use clear section headings in UPPERCASE followed by paragraphs.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4",
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
    
    def generate_proposal_outline(self, contract_requirements, capability_statement, company_name="your company"):
        """Generate detailed proposal outline"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": f"""Create a comprehensive proposal outline for {company_name} for this government contract. Include:
                    1. Executive Summary structure highlighting {company_name}'s value
                    2. Technical Approach sections leveraging {company_name}'s capabilities
                    3. Management Plan components
                    4. Past Performance organization showcasing {company_name}'s experience
                    5. Pricing section breakdown
                    6. Appendices and supporting documents
                    
                    FORMAT WITH PROFESSIONAL MARKDOWN:
                    ## Proposal Outline for {company_name}
                    
                    - {company_name} company overview and qualifications
                    - Understanding of requirements
                    
                    - Section 2.1: Methodology tailored to {company_name}'s strengths
                    - Section 2.2: Innovation and technology
                    
                    - {company_name}'s project management approach
                    
                    Structure it as a detailed table of contents with section descriptions. Make it professional and ready for copy/paste."""},
                    {"role": "user", "content": f"Contract Requirements: {json.dumps(contract_requirements)[:2000]}\n{company_name} Capabilities: {capability_statement[:1500]}"}
                ],
                temperature=0.2
            )
            
            return response.choices[0].message.content
        except Exception as e:
            self.app.logger.error(f"Error generating proposal outline: {e}")
            return f"## Proposal Outline Error\nFailed to generate outline for {company_name}."
    
    def _generate_cover_letter(self, contract_requirements, capability_statement, company_name="your company", contact_info=None):
        """Generate professional cover letter section"""
        try:
            contact_details = ""
            if contact_info:
                contact_details = f"\n\nContact: {contact_info.get('name', '')}\n{contact_info.get('title', '')}\n{contact_info.get('email', '')}\n{contact_info.get('phone', '')}"
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": f"""Create a professional cover letter (1-2 pages) for {company_name}'s government contract proposal. Include:
                    1. Date and recipient information (placeholder format)
                    2. Opening paragraph expressing interest and understanding
                    3. Brief company introduction highlighting unique qualifications
                    4. Summary of key competitive advantages for this contract
                    5. Expression of commitment and readiness
                    6. Professional closing with signature block
                    
                    Format in plain text without markdown symbols. Use formal government contracting language."""},
                    {"role": "user", "content": f"Contract Requirements: {json.dumps(contract_requirements)[:2000]}\n\nCompany: {company_name}\nCapabilities: {capability_statement[:1500]}{contact_details}"}
                ],
                temperature=0.2
            )
            
            return response.choices[0].message.content
        except Exception as e:
            self.app.logger.error(f"Error generating cover letter: {e}")
            return f"COVER LETTER\n\n[Date]\n\n[Recipient Information]\n\nDear Selection Committee,\n\n{company_name} is pleased to submit this proposal..."
    
    def generate_full_proposal(self, contract_requirements, capability_statement, company_name="your company", user_documents=None, target_pages=35):
        """Generate comprehensive multi-page proposal (30-50 pages) - optimized to avoid timeouts"""
        try:
            proposal_content = self._generate_comprehensive_proposal_optimized(
                contract_requirements, 
                capability_statement,
                company_name=company_name,
                uploaded_docs=user_documents
            )
            
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
    
    def _generate_comprehensive_proposal_optimized(self, contract_requirements, capability_statement, company_name="your company", uploaded_docs=None):
        """Generate comprehensive proposal in optimized way to avoid timeouts"""
        
        docs_context = ""
        if uploaded_docs:
            docs_context = "\n\nAdditional Company Documents to Reference:\n"
            for doc in uploaded_docs:
                docs_context += f"- {doc['filename']}: {doc['content_excerpt'][:200]}...\n"
        
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": f"""You are an expert proposal writer creating a comprehensive 30-50 page government contract proposal for {company_name}. Generate a complete, detailed proposal with the following sections:

CRITICAL FORMATTING REQUIREMENTS:
- Output PLAIN TEXT ONLY - NO markdown symbols
- NO asterisks (**), NO hashtags (##), NO bullets (-, •), NO special formatting
- Use simple numbered lists and clear section headings in UPPERCASE
- Write in paragraph form ready to copy/paste directly into Word documents
- Structure content for immediate copy/paste into proposal documents
- Emphasize {company_name}'s unique capabilities and competitive advantages

0. COVER LETTER (1-2 pages)
Professional cover letter with date, recipient info, expression of interest, company introduction, key qualifications summary, and closing signature block.

1. EXECUTIVE SUMMARY (3-4 pages)
Project understanding and objectives specific to {company_name}, including {company_name}'s unique value proposition and competitive advantages, key personnel and team qualifications, technical approach overview, past performance highlights, pricing competitiveness, risk mitigation summary, and expected outcomes and benefits.

2. TECHNICAL APPROACH (12-15 pages)
Detailed methodology and work breakdown structure tailored to {company_name}'s strengths, technical specifications and compliance, innovation and technology solutions {company_name} will employ, implementation timeline and milestones, quality control procedures, performance metrics and KPIs, technical team structure and expertise, tools, software, and equipment, deliverables and documentation, and technical risk mitigation.

3. MANAGEMENT PLAN (8-10 pages)
{company_name}'s project management methodology and framework, organizational structure and reporting relationships, key personnel roles and responsibilities, communication and coordination procedures, schedule management and milestone tracking, resource allocation and management, quality management system, change management procedures, performance monitoring and control, and stakeholder engagement strategy.

4. PAST PERFORMANCE (6-8 pages)
{company_name}'s relevant project examples with detailed descriptions, contract performance metrics and outcomes, client testimonials and references, lessons learned and continuous improvement, awards, certifications, and recognition, team experience and qualifications, subcontractor and partner performance, and performance against schedule, budget, and quality metrics.

5. PRICING STRATEGY (4-5 pages)
Cost breakdown structure and methodology, labor categories and rates justification, direct and indirect cost analysis, fee structure and profit margins, cost control measures and efficiency strategies, value engineering opportunities, pricing competitiveness analysis, and cost risk assessment and mitigation.

6. QUALITY ASSURANCE (3-4 pages)
{company_name}'s quality management system and standards, quality control procedures and checkpoints, testing and validation methodologies, documentation and record keeping, continuous improvement processes, quality metrics and performance indicators, and corrective and preventive action procedures.

7. RISK MANAGEMENT (2-3 pages)
Risk identification and assessment methodology, risk register with probability and impact analysis, risk mitigation strategies and contingency plans, risk monitoring and reporting procedures, escalation procedures and decision-making authority, and insurance and liability considerations.

Write each section with substantial, detailed content that demonstrates {company_name}'s deep expertise and understanding. Use professional government contracting language with specific details, metrics, and examples. Make it comprehensive and ready for copy/paste into final proposal documents. Output in plain text format without any markdown symbols."""},
                {"role": "user", "content": f"Contract Requirements: {json.dumps(contract_requirements)[:2500]}\n\nCapability Statement for {company_name}: {capability_statement[:2000]}{docs_context}\n\nGenerate a comprehensive, detailed 30-50 page proposal for {company_name} for this government contract with extensive content in each section. Format in plain text without markdown symbols."}
            ],
            temperature=0.2,
            max_tokens=6000
        )
        
        full_content = response.choices[0].message.content
        
        sections = []
        section_titles = [
            "COVER LETTER",
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
