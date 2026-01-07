from typing import Optional
from sqlmodel import Field, SQLModel

class SystemSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # SMTP Settings
    smtp_host: Optional[str] = None
    smtp_port: int = Field(default=587)
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_tls: bool = Field(default=True)
    
    # Sender Info
    sender_email: Optional[str] = None
    sender_name: str = Field(default="ER Music Vault")

    # Admin Settings
    admin_pin: Optional[str] = None
    
    # Singleton marker - ensuring we check for ID=1 usually
