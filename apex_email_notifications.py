"""
APEX Accelerator Email Notification System
Handles sending email alerts for contract milestones and deadlines
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class ApexEmailNotifier:
    """Email notification system for APEX alerts"""
    
    def __init__(self):
        """Initialize email notifier with SMTP configuration"""
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_user = os.getenv('EMAIL_GOOGLE_USER')
        self.smtp_password = os.getenv('EMAIL_GOOGLE_PASS')
        self.from_email = os.getenv('APEX_FROM_EMAIL', self.smtp_user)
        self.from_name = os.getenv('APEX_FROM_NAME', 'APEX Accelerator')
    
    def send_milestone_alert(self, alert_data: Dict, client_data: Dict, 
                            contract_data: Dict, milestone_data: Dict) -> bool:
        """
        Send milestone reminder email
        
        Args:
            alert_data: Alert information
            client_data: Client information
            contract_data: Contract information
            milestone_data: Milestone information
            
        Returns:
            True if email sent successfully
        """
        try:
            recipients = []
            if client_data.get('contact_email'):
                recipients.append(client_data['contact_email'])
            if client_data.get('assigned_counselor_email'):
                recipients.append(client_data['assigned_counselor_email'])
            
            if not recipients:
                logger.warning(f"No recipients for alert {alert_data.get('alert_id')}")
                return False
            
            subject = f"⏰ {alert_data['alert_title']}"
            
            html_body = self._create_milestone_email_html(
                alert_data, client_data, contract_data, milestone_data
            )
            
            success = self._send_email(recipients, subject, html_body)
            
            if success:
                logger.info(f"Sent milestone alert to {', '.join(recipients)}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending milestone alert: {str(e)}")
            return False
    
    def send_contract_created_notification(self, client_data: Dict, 
                                          contract_data: Dict) -> bool:
        """
        Send notification when a new contract is created
        
        Args:
            client_data: Client information
            contract_data: Contract information
            
        Returns:
            True if email sent successfully
        """
        try:
            recipients = []
            if client_data.get('contact_email'):
                recipients.append(client_data['contact_email'])
            if client_data.get('assigned_counselor_email'):
                recipients.append(client_data['assigned_counselor_email'])
            
            if not recipients:
                return False
            
            subject = f"✅ New Contract Award Tracked: {contract_data['contract_number']}"
            
            html_body = self._create_contract_notification_html(client_data, contract_data)
            
            success = self._send_email(recipients, subject, html_body)
            
            if success:
                logger.info(f"Sent contract notification to {', '.join(recipients)}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending contract notification: {str(e)}")
            return False
    
    def send_match_review_notification(self, staff_email: str, 
                                      match_data: Dict) -> bool:
        """
        Send notification to staff about pending match review
        
        Args:
            staff_email: Staff member email
            match_data: Match queue data
            
        Returns:
            True if email sent successfully
        """
        try:
            subject = "🔍 New Contract Match Requires Review"
            
            html_body = self._create_match_review_html(match_data)
            
            success = self._send_email([staff_email], subject, html_body)
            
            if success:
                logger.info(f"Sent match review notification to {staff_email}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending match review notification: {str(e)}")
            return False
    
    def _create_milestone_email_html(self, alert_data: Dict, client_data: Dict,
                                    contract_data: Dict, milestone_data: Dict) -> str:
        """Create HTML email body for milestone alert"""
        
        days_until = self._calculate_days_until(milestone_data['due_date'])
        urgency_color = self._get_urgency_color(days_until)
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2c3e50; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9f9f9; padding: 20px; margin-top: 20px; }}
                .alert-box {{ background-color: {urgency_color}; color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }}
                .details {{ background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }}
                .footer {{ text-align: center; margin-top: 30px; padding: 20px; color: #7f8c8d; font-size: 12px; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>APEX Accelerator</h1>
                    <h2>Contract Milestone Reminder</h2>
                </div>
                
                <div class="content">
                    <div class="alert-box">
                        <h2>⏰ {alert_data['alert_title']}</h2>
                        <p style="font-size: 18px; margin: 10px 0;">
                            <strong>{days_until} days remaining</strong>
                        </p>
                    </div>
                    
                    <div class="details">
                        <h3>Milestone Details</h3>
                        <p><strong>Type:</strong> {milestone_data['milestone_title']}</p>
                        <p><strong>Description:</strong> {milestone_data['milestone_description']}</p>
                        <p><strong>Due Date:</strong> {self._format_date(milestone_data['due_date'])}</p>
                        <p><strong>Priority:</strong> {milestone_data.get('priority', 'medium').upper()}</p>
                    </div>
                    
                    <div class="details">
                        <h3>Contract Information</h3>
                        <p><strong>Contract Number:</strong> {contract_data['contract_number']}</p>
                        <p><strong>Contract Title:</strong> {contract_data['contract_title']}</p>
                        <p><strong>Awarding Agency:</strong> {contract_data.get('awarding_agency', 'N/A')}</p>
                        <p><strong>Contract Value:</strong> ${contract_data.get('contract_value', 0):,.2f}</p>
                    </div>
                    
                    <div class="details">
                        <h3>Client Information</h3>
                        <p><strong>Company:</strong> {client_data['company_name']}</p>
                        <p><strong>Contact:</strong> {client_data.get('contact_name', 'N/A')}</p>
                        <p><strong>Counselor:</strong> {client_data.get('assigned_counselor_email', 'N/A')}</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://corama.com/apex/dashboard" class="button">View Dashboard</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is an automated reminder from the APEX Accelerator Post-Award Tracking System.</p>
                    <p>If you have questions, please contact your assigned counselor.</p>
                    <p>&copy; {datetime.utcnow().year} APEX Accelerator. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _create_contract_notification_html(self, client_data: Dict, 
                                          contract_data: Dict) -> str:
        """Create HTML email body for contract creation notification"""
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #27ae60; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9f9f9; padding: 20px; margin-top: 20px; }}
                .success-box {{ background-color: #2ecc71; color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }}
                .details {{ background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #27ae60; }}
                .footer {{ text-align: center; margin-top: 30px; padding: 20px; color: #7f8c8d; font-size: 12px; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>APEX Accelerator</h1>
                    <h2>New Contract Award Tracked</h2>
                </div>
                
                <div class="content">
                    <div class="success-box">
                        <h2>✅ Congratulations!</h2>
                        <p style="font-size: 16px;">
                            A new contract award has been added to your tracking dashboard.
                        </p>
                    </div>
                    
                    <div class="details">
                        <h3>Contract Details</h3>
                        <p><strong>Contract Number:</strong> {contract_data['contract_number']}</p>
                        <p><strong>Title:</strong> {contract_data['contract_title']}</p>
                        <p><strong>Awarding Agency:</strong> {contract_data.get('awarding_agency', 'N/A')}</p>
                        <p><strong>Contract Value:</strong> ${contract_data.get('contract_value', 0):,.2f}</p>
                        <p><strong>Start Date:</strong> {self._format_date(contract_data['start_date'])}</p>
                        <p><strong>End Date:</strong> {self._format_date(contract_data['end_date'])}</p>
                    </div>
                    
                    <div class="details">
                        <h3>What Happens Next?</h3>
                        <ul>
                            <li>Milestones have been automatically generated for key deadlines</li>
                            <li>You will receive email reminders before each milestone</li>
                            <li>Track your progress in the APEX dashboard</li>
                            <li>Your assigned counselor will monitor your contract performance</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://corama.com/apex/dashboard" class="button">View Contract Details</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This notification was sent by the APEX Accelerator Post-Award Tracking System.</p>
                    <p>&copy; {datetime.utcnow().year} APEX Accelerator. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _create_match_review_html(self, match_data: Dict) -> str:
        """Create HTML email body for match review notification"""
        
        contract = match_data['contract_data']
        matches = match_data['potential_matches']
        best_match = matches[0] if matches else None
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f39c12; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9f9f9; padding: 20px; margin-top: 20px; }}
                .warning-box {{ background-color: #f39c12; color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }}
                .details {{ background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f39c12; }}
                .footer {{ text-align: center; margin-top: 30px; padding: 20px; color: #7f8c8d; font-size: 12px; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #f39c12; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>APEX Accelerator</h1>
                    <h2>Contract Match Review Required</h2>
                </div>
                
                <div class="content">
                    <div class="warning-box">
                        <h2>🔍 Action Required</h2>
                        <p style="font-size: 16px;">
                            A new contract award has been matched to an existing client and requires your review.
                        </p>
                    </div>
                    
                    <div class="details">
                        <h3>Contract Information</h3>
                        <p><strong>Contract Number:</strong> {contract.get('contract_number', 'N/A')}</p>
                        <p><strong>Recipient:</strong> {contract.get('recipient_name', 'N/A')}</p>
                        <p><strong>Amount:</strong> ${contract.get('award_amount', 0):,.2f}</p>
                        <p><strong>Agency:</strong> {contract.get('awarding_agency', 'N/A')}</p>
                    </div>
                    
                    {self._format_match_details(best_match) if best_match else ''}
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://corama.com/apex/review-queue" class="button">Review Match</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This notification was sent by the APEX Accelerator Post-Award Tracking System.</p>
                    <p>&copy; {datetime.utcnow().year} APEX Accelerator. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _format_match_details(self, match: Dict) -> str:
        """Format match details for email"""
        return f"""
        <div class="details">
            <h3>Potential Client Match</h3>
            <p><strong>Client:</strong> {match['client_name']}</p>
            <p><strong>Match Confidence:</strong> {match['match_score']}%</p>
            <p><strong>Match Type:</strong> {match['match_criteria'].get('match_type', 'unknown')}</p>
        </div>
        """
    
    def _send_email(self, recipients: List[str], subject: str, html_body: str) -> bool:
        """Send email via SMTP"""
        try:
            if not self.smtp_user or not self.smtp_password:
                logger.warning("SMTP credentials not configured")
                return False
            
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = subject
            
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return False
    
    def _calculate_days_until(self, due_date: str) -> int:
        """Calculate days until due date"""
        try:
            due = datetime.fromisoformat(due_date).date()
            today = datetime.utcnow().date()
            delta = (due - today).days
            return max(0, delta)
        except:
            return 0
    
    def _get_urgency_color(self, days_until: int) -> str:
        """Get color based on urgency"""
        if days_until <= 1:
            return '#e74c3c'  # Red - urgent
        elif days_until <= 7:
            return '#f39c12'  # Orange - warning
        elif days_until <= 14:
            return '#f1c40f'  # Yellow - attention
        else:
            return '#3498db'  # Blue - normal
    
    def _format_date(self, date_str: str) -> str:
        """Format date string for display"""
        try:
            date = datetime.fromisoformat(date_str).date()
            return date.strftime('%B %d, %Y')
        except:
            return date_str
