from .base import Base
from . import engine
from . import models


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database schema created.")