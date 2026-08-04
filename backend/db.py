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
        asyncio.create_task(ensure_indexes(db))
    except Exception as error:
        print(f"FAILED to connect to MongoDB: {error}")
        db = None
        db = None

    yield

    if client:
        client.close()
        print("Disconnected from MongoDB.")


async def ensure_indexes(database):
    if database is None:
        return
    try:
        await database["students"].create_index([("id", 1)])
        await database["students"].create_index([("rollNumber", 1)])
        await database["students"].create_index([("department", 1)])

        await database["faculty"].create_index([("employeeId", 1)])
        await database["faculty"].create_index([("departmentId", 1)])
        await database["faculty"].create_index([("department_id", 1)])

        await database["academic_attendance_markings"].create_index([("entries.studentId", 1)])
        await database["academic_attendance_markings"].create_index([("date", 1)])

        await database["academic_od_requests"].create_index([("studentId", 1), ("status", 1)])

        await database["faculty_performance"].create_index([("facultyId", 1)])
        await database["faculty_leave"].create_index([("facultyId", 1)])
        await database["career_pathways"].create_index([("faculty_id", 1)])

        await database["admissions"].create_index([("id", 1)])
        await database["admissions"].create_index([("status", 1)])
        await database["admissions"].create_index([("role", 1)])
        await database["admissions"].create_index([("type", 1)])

        await database["fees_structure"].create_index([("student_id", 1)])
        await database["payroll"].create_index([("staffId", 1)])

        print("Database indexes created/verified successfully.")
    except Exception as e:
        print(f"Warning: Failed to create database indexes: {e}")


def get_db():
    if db is None:
        raise HTTPException(status_code=503, detail="Database is not available")
    return db
