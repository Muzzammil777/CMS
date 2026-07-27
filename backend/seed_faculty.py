import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from pathlib import Path

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI environment variable is not set. Please set it in your .env file.")

async def seed_faculty():
    """Seed the database with sample faculty data"""
    
    try:
        # Connect to MongoDB with longer timeout
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
        await client.admin.command("ping")
        print("✓ Connected to MongoDB")
        
        # Get database
        if "mongodb.net" in str(MONGODB_URI):
            db = client["College_db"]
        else:
            db = client.get_database()
        
        if db.name == "test" and "mongodb.net" not in str(MONGODB_URI):
            db = client["College_db"]
        
        print(f"✓ Using database: {db.name}")
        
        # Get faculty collection
        faculty_collection = db["faculty"]
        
        # Sample faculty data
        faculty_data = [
            {
                "name": "Dr. Rajesh Kumar",
                "employeeId": "FAC001",
                "email": "rajesh.kumar@mit.edu",
                "phone": "+91-9876543210",
                "designation": "Professor",
                "department_id": "CS",
                "departmentId": "Computer Science",
                "qualification": "Ph.D. in Computer Science",
                "employment_status": "Active",
                "joining_date": datetime(2015, 8, 15),
                "specialization": "Artificial Intelligence",
                "office_location": "Building A, Room 301",
                "research_interests": ["Machine Learning", "AI", "NLP"]
            },
            {
                "name": "Prof. Anjali Sharma",
                "employeeId": "FAC002",
                "email": "anjali.sharma@mit.edu",
                "phone": "+91-9876543211",
                "designation": "Associate Professor",
                "department_id": "ECE",
                "departmentId": "Electronics & Communication",
                "qualification": "Ph.D. in Electronics",
                "employment_status": "Active",
                "joining_date": datetime(2016, 7, 1),
                "specialization": "VLSI Design",
                "office_location": "Building B, Room 215",
                "research_interests": ["VLSI", "Semiconductor Design"]
            },
            {
                "name": "Dr. Priya Verma",
                "employeeId": "FAC003",
                "email": "priya.verma@mit.edu",
                "phone": "+91-9876543212",
                "designation": "Assistant Professor",
                "department_id": "ME",
                "departmentId": "Mechanical Engineering",
                "qualification": "Ph.D. in Mechanical Engineering",
                "employment_status": "Active",
                "joining_date": datetime(2018, 6, 15),
                "specialization": "Thermal Engineering",
                "office_location": "Building C, Room 102",
                "research_interests": ["Heat Transfer", "CFD", "Renewable Energy"]
            },
            {
                "name": "Prof. Vikram Singh",
                "employeeId": "FAC004",
                "email": "vikram.singh@mit.edu",
                "phone": "+91-9876543213",
                "designation": "Professor",
                "department_id": "CE",
                "departmentId": "Civil Engineering",
                "qualification": "Ph.D. in Civil Engineering",
                "employment_status": "On-Leave",
                "joining_date": datetime(2014, 1, 20),
                "specialization": "Structural Design",
                "office_location": "Building D, Room 150",
                "research_interests": ["Earthquake Engineering", "Concrete"]
            },
            {
                "name": "Dr. Meera Patel",
                "employeeId": "FAC005",
                "email": "meera.patel@mit.edu",
                "phone": "+91-9876543214",
                "designation": "Assistant Professor",
                "department_id": "CS",
                "departmentId": "Computer Science",
                "qualification": "Ph.D. in Software Engineering",
                "employment_status": "Active",
                "joining_date": datetime(2019, 8, 1),
                "specialization": "Software Engineering",
                "office_location": "Building A, Room 305",
                "research_interests": ["Cloud Computing", "DevOps", "Microservices"]
            },
            {
                "name": "Prof. Sanjay Gupta",
                "employeeId": "FAC006",
                "email": "sanjay.gupta@mit.edu",
                "phone": "+91-9876543215",
                "designation": "Associate Professor",
                "department_id": "ECE",
                "departmentId": "Electronics & Communication",
                "qualification": "M.Tech in Signal Processing",
                "employment_status": "Active",
                "joining_date": datetime(2017, 9, 1),
                "specialization": "Digital Signal Processing",
                "office_location": "Building B, Room 220",
                "research_interests": ["Signal Processing", "Communications"]
            },
            {
                "name": "Dr. Neha Desai",
                "employeeId": "FAC007",
                "email": "neha.desai@mit.edu",
                "phone": "+91-9876543216",
                "designation": "Assistant Professor",
                "department_id": "BT",
                "departmentId": "Biotechnology",
                "qualification": "Ph.D. in Biotechnology",
                "employment_status": "Active",
                "joining_date": datetime(2020, 1, 15),
                "specialization": "Genetic Engineering",
                "office_location": "Building E, Room 101",
                "research_interests": ["Gene Therapy", "Biomedical Engineering"]
            },
            {
                "name": "Prof. Arjun Nair",
                "employeeId": "FAC008",
                "email": "arjun.nair@mit.edu",
                "phone": "+91-9876543217",
                "designation": "Professor",
                "department_id": "ME",
                "departmentId": "Mechanical Engineering",
                "qualification": "Ph.D. in Manufacturing",
                "employment_status": "Active",
                "joining_date": datetime(2013, 7, 1),
                "specialization": "Manufacturing Engineering",
                "office_location": "Building C, Room 105",
                "research_interests": ["Additive Manufacturing", "Industry 4.0"]
            }
        ]
        
        # Check if faculty already exists
        existing_count = await faculty_collection.count_documents({})
        
        if existing_count == 0:
            # Insert faculty data
            result = await faculty_collection.insert_many(faculty_data)
            print(f"✓ Inserted {len(result.inserted_ids)} faculty members")
        else:
            print(f"ℹ Faculty collection already has {existing_count} documents")
            
            # Update with new data if needed
            for faculty in faculty_data:
                await faculty_collection.update_one(
                    {"employeeId": faculty["employeeId"]},
                    {"$set": faculty},
                    upsert=True
                )
            print(f"✓ Synced {len(faculty_data)} faculty records")
        
        # Verify data
        count = await faculty_collection.count_documents({})
        print(f"✓ Total faculty in database: {count}")
        
        # Show sample
        sample = await faculty_collection.find_one()
        if sample:
            print(f"\n✓ Sample faculty record:")
            print(f"  - Name: {sample['name']}")
            print(f"  - Employee ID: {sample['employeeId']}")
            print(f"  - Department: {sample['departmentId']}")
            print(f"  - Status: {sample['employment_status']}")
        
        client.close()
        print("\n✓ Seed complete!")
        
    except Exception as error:
        print(f"✗ Error: {error}")
        raise

if __name__ == "__main__":
    asyncio.run(seed_faculty())
