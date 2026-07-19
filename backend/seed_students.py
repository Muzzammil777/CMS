import asyncio
import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not set. Please set it in your .env file.")

students_data = [
    {
        "id": "STU-2024-001",
        "rollNumber": "STU-2024-001",
        "name": "Aarav Sharma",
        "email": "aarav.sharma@mit.edu",
        "phone": "+91 98765 43210",
        "department": "Computer Science",
        "year": "3rd Year",
        "semester": 6,
        "section": "A",
        "cgpa": 8.9,
        "attendancePct": 94,
        "feeStatus": "Paid",
        "status": "Active",
        "enrollDate": "2022-08-01",
        "address": "12, MG Road, Bangalore, Karnataka",
        "guardian": "Rajesh Sharma",
        "guardianPhone": "+91 98765 43200",
        "avatar": "https://ui-avatars.com/api/?name=Aarav+Sharma&background=6d28d9&color=fff&size=128",
        "password": "student123",
        "role": "student",
        "subjects": [
            {"code": "CS-301", "name": "Data Structures", "grade": "A+", "total": 92, "semester": 3, "year": "2nd Year"},
            {"code": "CS-306", "name": "Database Systems", "grade": "A", "total": 88, "semester": 4, "year": "2nd Year"}
        ],
        "fees": [
            {"id": "FEE-201", "type": "Tuition Fee", "amount": 75000, "paid": 75000, "due": 0, "date": "2024-07-15", "status": "Paid"}
        ],
        "documents": [
            {"id": "DOC-201", "name": "10th Marksheet", "type": "pdf", "uploadDate": "2022-08-01", "size": "1.2 MB"},
            {"id": "DOC-202", "name": "12th Marksheet", "type": "pdf", "uploadDate": "2022-08-01", "size": "1.4 MB"}
        ],
        "attendanceMonthly": [
            {"month": "Jan", "present": 20, "total": 22},
            {"month": "Feb", "present": 21, "total": 24}
        ]
    },
    {
        "id": "STU-2024-002",
        "rollNumber": "STU-2024-002",
        "name": "Aditya Patel",
        "email": "aditya.patel@mit.edu",
        "phone": "+91 98765 43211",
        "department": "Electronics",
        "year": "4th Year",
        "semester": 8,
        "section": "B",
        "cgpa": 7.8,
        "attendancePct": 85,
        "feeStatus": "Pending",
        "status": "Active",
        "enrollDate": "2021-08-01",
        "address": "45, Residency Road, Bangalore, Karnataka",
        "guardian": "Mahesh Patel",
        "guardianPhone": "+91 98765 43201",
        "avatar": "https://ui-avatars.com/api/?name=Aditya+Patel&background=4c1d95&color=fff&size=128",
        "password": "student123",
        "role": "student",
        "subjects": [
            {"code": "EC-401", "name": "Microprocessors", "grade": "B+", "total": 76, "semester": 5, "year": "3rd Year"}
        ],
        "fees": [
            {"id": "FEE-202", "type": "Tuition Fee", "amount": 75000, "paid": 0, "due": 75000, "date": "-", "status": "Unpaid"}
        ],
        "documents": [],
        "attendanceMonthly": []
    },
    {
        "id": "STU-2024-003",
        "rollNumber": "STU-2024-003",
        "name": "Diya Iyer",
        "email": "diya.iyer@mit.edu",
        "phone": "+91 98765 43212",
        "department": "Computer Science",
        "year": "2nd Year",
        "semester": 4,
        "section": "A",
        "cgpa": 9.2,
        "attendancePct": 96,
        "feeStatus": "Paid",
        "status": "Active",
        "enrollDate": "2023-08-01",
        "address": "67, HSR Layout, Bangalore, Karnataka",
        "guardian": "Subramaniam Iyer",
        "guardianPhone": "+91 98765 43202",
        "avatar": "https://ui-avatars.com/api/?name=Diya+Iyer&background=8b5cf6&color=fff&size=128",
        "password": "student123",
        "role": "student",
        "subjects": [],
        "fees": [
            {"id": "FEE-203", "type": "Tuition Fee", "amount": 75000, "paid": 75000, "due": 0, "date": "2024-07-15", "status": "Paid"}
        ],
        "documents": [],
        "attendanceMonthly": []
    },
    {
        "id": "STU-2024-004",
        "rollNumber": "STU-2024-004",
        "name": "Kabir Malhotra",
        "email": "kabir.malhotra@mit.edu",
        "phone": "+91 98765 43213",
        "department": "Mechanical",
        "year": "3rd Year",
        "semester": 6,
        "section": "A",
        "cgpa": 8.1,
        "attendancePct": 88,
        "feeStatus": "Partial",
        "status": "Active",
        "enrollDate": "2022-08-01",
        "address": "89, Koramangala, Bangalore, Karnataka",
        "guardian": "Anil Malhotra",
        "guardianPhone": "+91 98765 43203",
        "avatar": "https://ui-avatars.com/api/?name=Kabir+Malhotra&background=6d28d9&color=fff&size=128",
        "password": "student123",
        "role": "student",
        "subjects": [],
        "fees": [
            {"id": "FEE-204", "type": "Tuition Fee", "amount": 75000, "paid": 40000, "due": 35000, "date": "2024-07-20", "status": "Partial"}
        ],
        "documents": [],
        "attendanceMonthly": []
    },
    {
        "id": "STU-2024-005",
        "rollNumber": "STU-2024-005",
        "name": "Ananya Sen",
        "email": "ananya.sen@mit.edu",
        "phone": "+91 98765 43214",
        "department": "Civil",
        "year": "1st Year",
        "semester": 2,
        "section": "B",
        "cgpa": 7.5,
        "attendancePct": 79,
        "feeStatus": "Pending",
        "status": "Active",
        "enrollDate": "2024-08-01",
        "address": "23, Indiranagar, Bangalore, Karnataka",
        "guardian": "Sourav Sen",
        "guardianPhone": "+91 98765 43204",
        "avatar": "https://ui-avatars.com/api/?name=Ananya+Sen&background=4c1d95&color=fff&size=128",
        "password": "student123",
        "role": "student",
        "subjects": [],
        "fees": [],
        "documents": [],
        "attendanceMonthly": []
    },
    {
        "id": "STU-2024-006",
        "rollNumber": "STU-2024-006",
        "name": "Rohan Gupta",
        "email": "rohan.gupta@mit.edu",
        "phone": "+91 98765 43215",
        "department": "Computer Science",
        "year": "3rd Year",
        "semester": 6,
        "section": "B",
        "cgpa": 8.4,
        "attendancePct": 91,
        "feeStatus": "Paid",
        "status": "Active",
        "enrollDate": "2022-08-01",
        "address": "56, Whitefield, Bangalore, Karnataka",
        "guardian": "Sanjay Gupta",
        "guardianPhone": "+91 98765 43205",
        "avatar": "https://ui-avatars.com/api/?name=Rohan+Gupta&background=8b5cf6&color=fff&size=128",
        "password": "student123",
        "role": "student",
        "subjects": [],
        "fees": [],
        "documents": [],
        "attendanceMonthly": []
    },
    {
        "id": "STU-2024-007",
        "rollNumber": "STU-2024-007",
        "name": "Neha Deshmukh",
        "email": "neha.deshmukh@mit.edu",
        "phone": "+91 98765 43216",
        "department": "Computer Science",
        "year": "4th Year",
        "semester": 8,
        "section": "A",
        "cgpa": 8.8,
        "attendancePct": 93,
        "feeStatus": "Paid",
        "status": "Active",
        "enrollDate": "2021-08-01",
        "address": "15, Malleshwaram, Bangalore, Karnataka",
        "guardian": "Vikas Deshmukh",
        "guardianPhone": "+91 98765 43206",
        "avatar": "https://ui-avatars.com/api/?name=Neha+Deshmukh&background=6d28d9&color=fff&size=128",
        "password": "student123",
        "role": "student",
        "subjects": [],
        "fees": [],
        "documents": [],
        "attendanceMonthly": []
    },
    {
        "id": "STU-2024-008",
        "rollNumber": "STU-2024-008",
        "name": "Siddharth Rao",
        "email": "siddharth.rao@mit.edu",
        "phone": "+91 98765 43217",
        "department": "Electronics",
        "year": "3rd Year",
        "semester": 6,
        "section": "A",
        "cgpa": 7.9,
        "attendancePct": 84,
        "feeStatus": "Pending",
        "status": "Active",
        "enrollDate": "2022-08-01",
        "address": "34, Jayanagar, Bangalore, Karnataka",
        "guardian": "Prasad Rao",
        "guardianPhone": "+91 98765 43207",
        "avatar": "https://ui-avatars.com/api/?name=Siddharth+Rao&background=4c1d95&color=fff&size=128",
        "password": "student123",
        "role": "student",
        "subjects": [],
        "fees": [],
        "documents": [],
        "attendanceMonthly": []
    },
    {
        "id": "STU-2024-009",
        "rollNumber": "STU-2024-009",
        "name": "Ishita Joshi",
        "email": "ishita.joshi@mit.edu",
        "phone": "+91 98765 43218",
        "department": "Computer Science",
        "year": "1st Year",
        "semester": 2,
        "section": "A",
        "cgpa": 9.5,
        "attendancePct": 97,
        "feeStatus": "Paid",
        "status": "Active",
        "enrollDate": "2024-08-01",
        "address": "78, BTM Layout, Bangalore, Karnataka",
        "guardian": "Pramod Joshi",
        "guardianPhone": "+91 98765 43208",
        "avatar": "https://ui-avatars.com/api/?name=Ishita+Joshi&background=8b5cf6&color=fff&size=128",
        "password": "student123",
        "role": "student",
        "subjects": [],
        "fees": [],
        "documents": [],
        "attendanceMonthly": []
    },
    {
        "id": "STU-2024-010",
        "rollNumber": "STU-2024-010",
        "name": "Arjun Nair",
        "email": "arjun.nair@mit.edu",
        "phone": "+91 98765 43219",
        "department": "Mechanical",
        "year": "2nd Year",
        "semester": 4,
        "section": "B",
        "cgpa": 7.6,
        "attendancePct": 81,
        "feeStatus": "Pending",
        "status": "Active",
        "enrollDate": "2023-08-01",
        "address": "90, Electronic City, Bangalore, Karnataka",
        "guardian": "Girish Nair",
        "guardianPhone": "+91 98765 43209",
        "avatar": "https://ui-avatars.com/api/?name=Arjun+Nair&background=6d28d9&color=fff&size=128",
        "password": "student123",
        "role": "student",
        "subjects": [],
        "fees": [],
        "documents": [],
        "attendanceMonthly": []
    }
]

async def seed_students():
    print(f"Connecting to MongoDB database...")
    try:
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=30000)
        
        # Determine database name
        if "mongodb.net" in str(MONGODB_URI):
            db = client["College_db"]
        else:
            db = client.get_database()
            
        if db.name == "test" and "mongodb.net" not in str(MONGODB_URI):
            db = client["College_db"]
            
        print(f"Connected successfully to database: {db.name}")
        students_collection = db["students"]
        
        inserted_count = 0
        skipped_count = 0
        
        for student in students_data:
            existing = await students_collection.find_one({"rollNumber": student["rollNumber"]})
            if not existing:
                await students_collection.insert_one(student)
                print(f"Inserted student: {student['name']} ({student['rollNumber']})")
                inserted_count += 1
            else:
                print(f"Student {student['name']} ({student['rollNumber']}) already exists. Skipped.")
                skipped_count += 1
                
        print(f"\nSeeding finished! Inserted: {inserted_count}, Skipped: {skipped_count}.")
        client.close()
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(seed_students())
