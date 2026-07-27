import os
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from backend folder or project root folder
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env")

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI environment variable is not set. Please set it in your .env file.")

_db = None

async def get_database():
    """Get MongoDB database connection"""
    global _db
    
    if _db is not None:
        return _db
    
    try:
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        await client.admin.command("ping")
        
        # Get the database
        if "mongodb.net" in str(MONGODB_URI):
            _db = client["College_db"]
        else:
            _db = client.get_database()
            
        if _db.name == "test" and "mongodb.net" not in str(MONGODB_URI):
            _db = client["College_db"]
            
        return _db
    except Exception as error:
        print(f"Failed to connect to MongoDB: {error}")
        raise HTTPException(status_code=500, detail="Database connection failed")


def parse_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as error:
        raise HTTPException(status_code=400, detail="Invalid ID format") from error


def serialize_doc(document: Optional[dict]) -> Optional[dict]:
    if not document:
        return document

    if "_id" in document:
        document["id"] = str(document["_id"])
        del document["_id"]

    return document
