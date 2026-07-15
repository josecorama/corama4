"""
Standalone SMTP email helper.

Mirrors the SMTP configuration used by ``app.send_email_smtp`` but does NOT
import the Flask app, so it can be used from background scripts / cron jobs
(e.g. daily_ingest.py) without triggering the full web-app initialization.

Environment variables (same as the web app):
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD (or SMTP_PASS), SMTP_MODE
Fallback (legacy Gmail):
    EMAIL_GOOGLE_USER, EMAIL_GOOGLE_PASS
"""

import os
import socket
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Tuple

log = logging.getLogger(__name__)


def send_email_smtp(to_email: str, subject: str, html_body: str) -> Tuple[bool, Optional[str]]:
    """Send an HTML email via SMTP. Returns (success, error_message)."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD") or os.getenv("SMTP_PASS")
    smtp_mode = os.getenv("SMTP_MODE", "tls").lower()

    # Fallback to legacy Gmail credentials
    if not smtp_host or not smtp_user or not smtp_password:
        smtp_host = "smtp.gmail.com"
        smtp_port = "465"
        smtp_user = os.getenv("EMAIL_GOOGLE_USER")
        smtp_password = os.getenv("EMAIL_GOOGLE_PASS")
        smtp_mode = "ssl"

    if not smtp_user or not smtp_password:
        log.error("[Email] SMTP credentials not configured")
        return False, "Email service not configured"

    try:
        smtp_port_int = int(smtp_port) if smtp_port else (587 if smtp_mode == "tls" else 465)
    except ValueError:
        return False, "Invalid SMTP port configuration"

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Corama <{smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        old_timeout = socket.getdefaulttimeout()
        socket.setdefaulttimeout(30)
        try:
            if smtp_mode == "ssl":
                with smtplib.SMTP_SSL(smtp_host, smtp_port_int, timeout=30) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, to_email, msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port_int, timeout=30) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, to_email, msg.as_string())
            log.info("[Email] Sent '%s' to %s", subject, to_email)
            return True, None
        finally:
            socket.setdefaulttimeout(old_timeout)
    except smtplib.SMTPAuthenticationError as e:
        code = getattr(e, "smtp_code", "unknown")
        log.error("[Email] SMTP auth failed (code %s)", code)
        return False, f"Email authentication failed (code {code})"
    except Exception as e:
        log.error("[Email] Error sending to %s: %s: %s", to_email, type(e).__name__, e)
        return False, str(e)
