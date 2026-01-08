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
    
    raw_domain = db_config.domain if (db_config and db_config.domain) else "localhost"
    
    # Ensure URL is valid
    if raw_domain.startswith("http://") or raw_domain.startswith("https://"):
        link_url = raw_domain
    else:
        link_url = f"https://{raw_domain}"
    
    sender_name = db_config.sender_name if (db_config and db_config.sender_name) else env_settings.EMAILS_FROM_NAME
    sender_email = db_config.sender_email if (db_config and db_config.sender_email) else env_settings.EMAILS_FROM_EMAIL

    name = guest_name or "Guest"
    
    # HTML Content
    html_content = f"""
    <html>
        <body style="background-color: #050510; color: #ffffff; font-family: sans-serif; padding: 20px;">
            <div style="
                max-width: 600px; 
                margin: 0 auto; 
                border: 1px solid rgba(0, 243, 255, 0.3); 
                border-radius: 16px; 
                padding: 30px; 
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(10px);
            ">
                <h1 style="color: #00f3ff; margin-top: 0; text-align: center; letter-spacing: 2px;">ER MUSIC VAULT</h1>
                <p style="font-size: 16px; color: #cccccc;">Hello {name},</p>
                <p style="font-size: 16px; color: #cccccc;">You have been securely invited to access the vault.</p>
                
                <div style="background: rgba(188, 19, 254, 0.1); border: 1px solid #bc13fe; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
                    <span style="color: #aa11ee; font-size: 12px; display: block; margin-bottom: 5px;">ACCESS PIN</span>
                    <span style="color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 5px; font-family: monospace;">{pin}</span>
                </div>
                
                <p style="text-align: center;">
                    <a href="{link_url}" style="
                        background: #00f3ff; 
                        color: #050510; 
                        text-decoration: none; 
                        padding: 10px 25px; 
                        border-radius: 25px; 
                        font-weight: bold;
                        display: inline-block;
                    ">ENTER VAULT</a>
                </p>
                
                <p style="font-size: 12px; color: #666666; text-align: center; margin-top: 30px;">
                    This is an automated key. Do not share.
                </p>
            </div>
        </body>
    </html>
    """

    if not smtp_host:
        logger.info(f"SMTP not configured. Mock Email to {email_to}: PIN={pin} (Domain: {domain})")
        return

    message = EmailMessage()
    message["From"] = f"{sender_name} <{sender_email}>"
    message["To"] = email_to
    message["Subject"] = subject
    message.set_content("Please enable HTML view to see your access PIN.")
    message.add_alternative(html_content, subtype="html")

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
        logger.info(f"FALLBACK LOG: PIN for {email_to} is {pin}")
        # We don't raise here to avoid crashing the background task completely, 
        # but the frontend will have already alerted the PIN.
