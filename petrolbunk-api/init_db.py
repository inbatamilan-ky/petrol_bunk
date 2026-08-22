"""
Creates all tables (matching schema.sql + the `users` auth table) directly
against the database in DATABASE_URL, using the SQLAlchemy models. Run once
against your database:

    python init_db.py

Then run create_admin.py to create your first login user. The API talks
directly to your Postgres instance via DATABASE_URL — no seed/fixture data
is required or loaded by this project.
"""
from app import models  # noqa: F401  (import so models register on Base)
from app.database import Base, engine

if __name__ == "__main__":
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done. Tables created (or already existed).")
