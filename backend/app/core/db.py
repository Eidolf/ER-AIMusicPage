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
