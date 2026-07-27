from typing import Optional
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from urllib.parse import urlsplit

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/cms")


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

def seed():
    print(f"Connecting to {mask_mongodb_uri(MONGODB_URI)}...")
    client = MongoClient(MONGODB_URI)
    db = client["cms"] if "mongodb.net" in MONGODB_URI else client.get_database()
    
    # 1. Seed Staff Details
    print("Seeding staff_details collection...")
    print("Retrieving staff_details from MongoDB...")
    staff_details = list(db.staff_details.find())
    print(f"Retrieved {len(staff_details)} staff from staff_details collection.")
    # Create payroll entries for each staff
    payroll_entries = []
    for staff in staff_details:
        payroll_entry = {
            "staffId": staff.get("staffId"),
            "staffName": staff.get("staffName"),
            "designation": staff.get("designation"),
            "department": staff.get("department"),
            "category": staff.get("category"),
            # Add payroll fields as needed
            "salary": 0,
            "createdAt": "2026-03-16"
        }
        payroll_entries.append(payroll_entry)
    if payroll_entries:
        db.payroll.insert_many(payroll_entries)
        print(f"SUCCESS: Seeded {len(payroll_entries)} payroll entries into payroll collection.")
    else:
        print("No staff found to create payroll entries.")
    
    # 2. Seed Payroll
    print("Seeding payroll collection...")
    
    print("Database seeded successfully!")
    client.close()

if __name__ == "__main__":
    seed()
