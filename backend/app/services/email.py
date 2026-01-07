import structlog
from app.core.config import settings as env_settings
from app.core.db import engine
from sqlmodel import Session, select
from app.models.settings import SystemSettings
import aiosmtplib
from email.message import EmailMessage

logger = structlog.get_logger()

def get_db_settings():
    with Session(engine) as session:
        return session.exec(select(SystemSettings)).first()

async def send_pin_email(email_to: str, pin: str, guest_name: str | None = None):
    subject = "Your Access PIN for ER-Music-Vault"
    
    # Get configuration
    db_config = get_db_settings()
    
    # Determine config source (DB or Env)
    smtp_host = db_config.smtp_host if (db_config and db_config.smtp_host) else env_settings.SMTP_HOST
    smtp_port = db_config.smtp_port if (db_config and db_config.smtp_host) else env_settings.SMTP_PORT
    smtp_user = db_config.smtp_user if (db_config and db_config.smtp_host) else env_settings.SMTP_USER
    smtp_pass = db_config.smtp_password if (db_config and db_config.smtp_host) else env_settings.SMTP_PASSWORD
    use_tls = db_config.smtp_tls if (db_config and db_config.smtp_host) else env_settings.SMTP_TLS
    
    sender_name = db_config.sender_name if (db_config and db_config.sender_name) else env_settings.EMAILS_FROM_NAME
    sender_email = db_config.sender_email if (db_config and db_config.sender_email) else env_settings.EMAILS_FROM_EMAIL

    name = guest_name or "Guest"
    content = f"""
    Hello {name},

    You have been invited to the ER Music Vault.
    
    Your Access PIN is: {pin}
    
    Please use this PIN to log in.
    
    Best regards,
    {sender_name}
    """

    if not smtp_host:
        logger.info(f"SMTP not configured (checked DB and Env). Mock Email to {email_to}: PIN={pin}")
        return

    message = EmailMessage()
    message["From"] = f"{sender_name} <{sender_email}>"
    message["To"] = email_to
    message["Subject"] = subject
    message.set_content(content)

    try:
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_pass,
            use_tls=use_tls,
        )
        logger.info(f"Email sent to {email_to} via {smtp_host}")
    except Exception as e:
        logger.error(f"Failed to send email to {email_to} via {smtp_host}: {e}")
        # Log PIN anyway so admin can see it in logs if email fails
        logger.info(f"FALLBACK LOG: PIN for {email_to} is {pin}")
        # We don't raise here to avoid crashing the background task completely, 
        # but the frontend will have already alerted the PIN.
