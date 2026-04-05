"""
Email notification service.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from typing import List, Optional
from app.config import settings
from asyncio import to_thread

logger = logging.getLogger(__name__)


class EmailService:
    """Email notification service with template support."""
    
    @staticmethod
    async def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Send email asynchronously."""
        try:
            return await to_thread(
                EmailService._send_sync,
                to_email,
                subject,
                html_content,
                text_content
            )
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    @staticmethod
    def _send_sync(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Synchronous email sending."""
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning("Email service not configured")
            return False
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.FROM_EMAIL
            msg["To"] = to_email
            
            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    @staticmethod
    async def send_welcome_email(email: str, name: str) -> bool:
        """Send welcome email to new user."""
        subject = "Welcome to YojanaMitra"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Welcome to YojanaMitra!</h2>
                <p>Hello {name},</p>
                <p>Thank you for registering with YojanaMitra - Your Scheme, Your Right.</p>
                <p>You can now discover government welfare schemes tailored to your profile.</p>
                <p><a href="{settings.FRONTEND_URL}/schemes">Start Exploring Schemes</a></p>
                <p>Best regards,<br>YojanaMitra Team</p>
            </body>
        </html>
        """
        return await EmailService.send_email(email, subject, html_content)
    
    @staticmethod
    async def send_application_confirmation(
        email: str,
        name: str,
        scheme_name: str,
        application_id: str
    ) -> bool:
        """Send application confirmation email."""
        subject = f"Application Submitted - {scheme_name}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Application Submitted Successfully</h2>
                <p>Hello {name},</p>
                <p>Your application for <strong>{scheme_name}</strong> has been submitted.</p>
                <p><strong>Application ID:</strong> {application_id}</p>
                <p>You can track your application status in your dashboard.</p>
                <p><a href="{settings.FRONTEND_URL}/applications/{application_id}">View Application</a></p>
                <p>Best regards,<br>YojanaMitra Team</p>
            </body>
        </html>
        """
        return await EmailService.send_email(email, subject, html_content)
    
    @staticmethod
    async def send_status_update(
        email: str,
        name: str,
        application_id: str,
        status: str,
    ) -> bool:
        """Send application status update email."""
        subject = f"Application Status Update - {status.upper()}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Application Status Update</h2>
                <p>Hello {name},</p>
                <p>Your application (ID: {application_id}) status has been updated to: <strong>{status}</strong></p>
                <p><a href="{settings.FRONTEND_URL}/applications/{application_id}">View Details</a></p>
                <p>Best regards,<br>YojanaMitra Team</p>
            </body>
        </html>
        """
        return await EmailService.send_email(email, subject, html_content)


email_service = EmailService()
