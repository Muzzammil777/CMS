import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, Union

from dotenv import load_dotenv
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from urllib.parse import urlsplit

# Load .env from backend folder or project root folder
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

# Use Atlas connection string
MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI environment variable is not set. Please set it in your .env file.")

client: Optional[AsyncIOMotorClient] = None
db = None


def mask_mongodb_uri(uri: Optional[str]) -> str:
    if not uri:
        return "<not configured>"

    try:
        parts = urlsplit(uri)
        host = parts.hostname or "unknown-host"
        scheme = parts.scheme or "mongodb"
        return f"{scheme}://{host}"
    except Exception:
        return "<configured>"


@asynccontextmanager
async def lifespan(app):
    global client, db

    print(f"Connecting to MongoDB at {mask_mongodb_uri(MONGODB_URI)}...")
    try:
        import asyncio
        client = AsyncIOMotorClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            maxIdleTimeMS=60000,
            retryWrites=True,
            retryReads=True,
            readPreference="primaryPreferred"
        )
        await asyncio.wait_for(client.admin.command("ping"), timeout=5.0)

        try:
            db = client["College_db"] if "mongodb.net" in str(MONGODB_URI) else client.get_database()
            if db.name == "test" and "mongodb.net" not in str(MONGODB_URI):
                db = client["College_db"]
        except Exception:
            db = client["College_db"]

        print(f"Connected to MongoDB successfully (Database: {db.name})")

        # Create indexes in background — fire-and-forget, never blocks startup
        async def _ensure_indexes():
            try:
                admissions = db["admissions"]
                await admissions.create_index([("role", 1), ("type", 1), ("status", 1)], background=True)
                await admissions.create_index([("created_at", -1)], background=True)
                await admissions.create_index([("id", 1)], background=True, unique=False)
                departments_col = db["departments"]
                await departments_col.create_index([("name", 1)], background=True)
                print("MongoDB indexes ensured.")
            except Exception as idx_err:
                print(f"Index creation warning (non-fatal): {idx_err}")

        asyncio.create_task(_ensure_indexes())

    except Exception as error:
        print(f"FAILED to connect to MongoDB: {error}")
        db = None
        db = None

    yield

    if client:
        client.close()
        print("Disconnected from MongoDB.")


def get_db():
    if db is None:
        raise HTTPException(status_code=503, detail="Database is not available")
    return db
