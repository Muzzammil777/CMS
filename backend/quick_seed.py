from pymongo import MongoClient
import os
from dotenv import load_dotenv
from datetime import datetime

dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

def seed():
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI environment variable is not set. Please set it in your .env file.")
    print(f"Connecting to Atlas...")
    client = MongoClient(uri, serverSelectionTimeoutMS=30000)
    db = client["College_db"]
    try:
        # Test connection and retrieval
        staff_details_list = list(db.staff_Details.find())
        print(f"Retrieved {len(staff_details_list)} staff from staff_Details collection.")
        payroll_entries = []
        for staff in staff_details_list:
            payroll_entry = {
                "staffId": staff.get("staffId"),
                "staffName": staff.get("staffName"),
                "designation": staff.get("designation"),
                "department": staff.get("department"),
                "category": staff.get("category"),
                "salary": 0,
                "createdAt": "2026-03-16"
            }
            payroll_entries.append(payroll_entry)
        if payroll_entries:
            result = db.payroll.insert_many(payroll_entries)
            print(f"SUCCESS: Seeded {len(payroll_entries)} payroll entries.")
            
            # Seed corresponding invoices
            invoices = []
            import uuid
            for i, payroll in enumerate(payroll_entries):
                invoices.append({
                    "invoice_id": f"INV-PAY-SEED-{str(uuid.uuid4())[:4].upper()}",
                    "payroll_id": str(result.inserted_ids[i]),
                    "staff_name": payroll.get("staffName"),
                    "staff_id": payroll.get("staffId"),
                    "pay_period": "March 2026",
                    "total_amount": 75000 if i == 0 else 68000,
                    "payment_status": "Draft",
                    "generated_date": datetime.now(),
                    "items": [
                        {"description": "Basic Salary", "amount": 75000 if i == 0 else 68000}
                    ]
                })
            db.invoices.insert_many(invoices)
            print(f"SUCCESS: Seeded {len(invoices)} invoices.")
        else:
            print("No staff found to create payroll entries.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    seed()
