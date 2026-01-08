from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings
# Import models so SQLModel knows about them for create_all
from app.models.guest import Guest
from app.models.media import Media

engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    SQLModel.metadata.create_all(engine)
    
    # Manual Migration for 'domain' column in 'systemsettings'
    from sqlalchemy import text
    try:
        with Session(engine) as session:
            try:
                # Check for column existence (SQLite/Postgres friendly)
                session.exec(text("SELECT domain FROM systemsettings LIMIT 1"))
            except Exception:
                # Add column if missing
                session.exec(text("ALTER TABLE systemsettings ADD COLUMN domain VARCHAR"))
                session.commit()
    except Exception as e:
        print(f"Migration warning: {e}")
