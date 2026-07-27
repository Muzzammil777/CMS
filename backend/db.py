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
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        await client.admin.command("ping")

        try:
            db = client["College_db"] if "mongodb.net" in str(MONGODB_URI) else client.get_database()
            if db.name == "test" and "mongodb.net" not in str(MONGODB_URI):
                db = client["College_db"]
        except Exception:
            db = client["College_db"]



        print(f"Connected to MongoDB successfully (Database: {db.name})")
    except Exception as error:
        print(f"FAILED to connect to MongoDB: {error}")
        db = None

    yield

    if client:
        client.close()
        print("Disconnected from MongoDB.")


def get_db():
    if db is None:
        raise HTTPException(status_code=503, detail="Database is not available")
    return db
