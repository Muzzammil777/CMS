import asyncio
import os
import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from datetime import datetime

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

MONGODB_URI = os.getenv("MONGODB_URI")

async def seed_users():
    """Seed the database with demo user credentials"""
    
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
        await client.admin.command("ping")
        print("[OK] Connected to MongoDB")
        
        db = client["College_db"]

        print(f"[OK] Using database: {db.name}")
        
        users_collection = db["users"]
        
        demo_users = [
            {"role": "admin", "username_var": "DEMO_ADMIN_USERNAME", "password_var": "DEMO_ADMIN_PASSWORD"},
            {"role": "student", "username_var": "DEMO_STUDENT_USERNAME", "password_var": "DEMO_STUDENT_PASSWORD"},
            {"role": "finance", "username_var": "DEMO_FINANCE_USERNAME", "password_var": "DEMO_FINANCE_PASSWORD"},
            {"role": "faculty", "username_var": "DEMO_FACULTY_USERNAME", "password_var": "DEMO_FACULTY_PASSWORD"},
        ]
        
        for user_info in demo_users:
            username = os.getenv(user_info["username_var"])
            password = os.getenv(user_info["password_var"])
            
            if not username or not password:
                print(f"[SKIP] Skipping {user_info['role']} - credentials not found in .env")
                continue

            # Check if user already exists
            existing_user = await users_collection.find_one({"username": username})
            if existing_user:
                print(f"[INFO] User '{username}' already exists. Skipping.")
                continue

            # Hash the password
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            user_data = {
                "username": username,
                "password": hashed_password,
                "role": user_info["role"],
                "created_at": datetime.utcnow(),
            }
            
            await users_collection.insert_one(user_data)
            print(f"[OK] Seeded user: {username} ({user_info['role']})")

        client.close()
        print("\n[OK] User seeding complete!")

    except Exception as error:
        print(f"[ERROR] Error: {error}")
        raise

if __name__ == "__main__":
    asyncio.run(seed_users())
