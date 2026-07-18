import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# We strictly enforce PostgreSQL for production/institutional grade performance.
# Example: postgresql+asyncpg://user:password@localhost/dbname
DATABASE_URL = os.getenv("DATABASE_URL")

# Smart fallback if DATABASE_URL is missing but other Postgres vars exist
if not DATABASE_URL:
    pghost = os.getenv("PGHOST")
    pguser = os.getenv("PGUSER")
    pgpassword = os.getenv("PGPASSWORD") or os.getenv("POSTGRES_PASSWORD")
    pgdatabase = os.getenv("PGDATABASE")
    pgport = os.getenv("PGPORT", "5432")
    if pghost and pguser and pgpassword and pgdatabase:
        DATABASE_URL = f"postgresql+asyncpg://{pguser}:{pgpassword}@{pghost}:{pgport}/{pgdatabase}"
        print("INFO: Reconstructed DATABASE_URL from individual PG environment variables.")

if not DATABASE_URL:
    print("WARNING: No DATABASE_URL or PGHOST found in .env. Falling back to in-memory SQLite for immediate testing, but this is NOT supported for production.")
    # For local fallback during initial setup if the user hasn't provided a Postgres URL yet.
    # Note: we need aiosqlite for async sqlite
    DATABASE_URL = "sqlite+aiosqlite:///:memory:"
elif DATABASE_URL.startswith("postgres://"):
    # SQLAlchemy requires postgresql:// instead of postgres://
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
