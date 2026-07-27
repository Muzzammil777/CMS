from copy import deepcopy
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from backend.db import get_db
from backend.dev_store import DEV_STORE
from backend.schemas.common import StudentRecord
from backend.utils.mongo import serialize_doc
from backend.utils.attendance_utils import compute_student_attendance_stats

router = APIRouter(prefix="/api/students", tags=["students"])


def _seed_dev_students() -> None:
    if DEV_STORE.get("students"):
        return

    DEV_STORE["students"] = [
        {
            "id": "STU-2024-1547",
            "rollNumber": "STU-2024-1547",
            "name": "John Anderson",
            "email": "john.anderson@mit.edu",
            "phone": "+91 90123 45678",
            "department": "Computer Science",
            "year": "3rd Year",
            "semester": 6,
            "section": "A",
            "cgpa": 8.7,
            "attendancePct": 92,
            "feeStatus": "Pending",
            "status": "Active",
            "enrollDate": "2022-08-01",
            "address": "18, Lake View Road, Bangalore, Karnataka",
            "guardian": "Michael Anderson",
            "guardianPhone": "+91 90123 45000",
            "avatar": "https://ui-avatars.com/api/?name=John+Anderson&background=2563eb&color=fff&size=128",
            "subjects": [],
            "fees": [
                {"id": "FEE-101", "type": "Tuition Fee", "amount": 75000, "paid": 75000, "due": 0, "date": "2024-07-15", "status": "Paid"},
                {"id": "FEE-102", "type": "Hostel Fee", "amount": 45000, "paid": 30000, "due": 15000, "date": "2024-07-20", "status": "Partial"},
                {"id": "FEE-103", "type": "Exam Fee", "amount": 5000, "paid": 0, "due": 5000, "date": "-", "status": "Unpaid"},
            ],
            "documents": [
                {"id": "DOC-101", "name": "10th Marksheet", "type": "pdf", "uploadDate": "2022-08-01", "size": "1.1 MB"},
                {"id": "DOC-102", "name": "12th Marksheet", "type": "pdf", "uploadDate": "2022-08-01", "size": "1.3 MB"},
                {"id": "DOC-103", "name": "Aadhar Card", "type": "pdf", "uploadDate": "2022-08-02", "size": "0.8 MB"},
                {"id": "DOC-104", "name": "Passport Photo", "type": "image", "uploadDate": "2022-08-02", "size": "0.4 MB"},
            ],
            "attendanceMonthly": [
                {"month": "Jul", "present": 22, "total": 24},
                {"month": "Aug", "present": 23, "total": 26},
            ],
        },
        {
            "id": "STU-2024-001",
            "rollNumber": "STU-2024-001",
            "name": "Aarav Kumar",
            "email": "aarav.kumar@mit.edu",
            "phone": "+91 98765 43210",
            "department": "Computer Science",
            "year": "3rd Year",
            "semester": 6,
            "section": "A",
            "cgpa": 8.7,
            "attendancePct": 92,
            "feeStatus": "Paid",
            "status": "Active",
            "enrollDate": "2022-08-01",
            "address": "12, MG Road, Bangalore, Karnataka",
            "guardian": "Rajesh Kumar",
            "guardianPhone": "+91 98765 43200",
            "avatar": "https://ui-avatars.com/api/?name=Aarav+Kumar&background=2563eb&color=fff&size=128",
            "subjects": [
                {"code": "CS301", "name": "Data Structures", "grade": "A+", "total": 90, "semester": 3, "year": "2nd Year"},
            ],
            "fees": [
                {"id": "FEE-001", "type": "Tuition Fee", "amount": 75000, "paid": 75000, "due": 0, "date": "2024-07-15", "status": "Paid"},
            ],
            "documents": [
                {"id": "DOC-001", "name": "10th Marksheet", "type": "pdf", "uploadDate": "2022-08-01", "size": "1.2 MB"},
            ],
            "attendanceMonthly": [
                {"month": "Jul", "present": 22, "total": 24},
            ],
        },
        {
            "id": "STU-2024-042",
            "rollNumber": "STU-2024-042",
            "name": "Priya Sharma",
            "email": "priya.sharma@mit.edu",
            "phone": "+91 87654 32109",
            "department": "Computer Science",
            "year": "3rd Year",
            "semester": 6,
            "section": "A",
            "cgpa": 9.1,
            "attendancePct": 96,
            "feeStatus": "Paid",
            "status": "Active",
            "enrollDate": "2022-08-01",
            "address": "45, Residency Road, Bangalore",
            "guardian": "Suresh Sharma",
            "guardianPhone": "+91 87654 32100",
            "avatar": "https://ui-avatars.com/api/?name=Priya+Sharma&background=7c3aed&color=fff&size=128",
            "subjects": [
                {"code": "CS301", "name": "Data Structures", "grade": "A+", "total": 94, "semester": 3, "year": "2nd Year"},
            ],
            "fees": [],
            "documents": [],
            "attendanceMonthly": [],
        },
        {
            "id": "STU-2024-118",
            "rollNumber": "STU-2024-118",
            "name": "Vikram Singh",
            "email": "vikram.singh@mit.edu",
            "phone": "+91 76543 21098",
            "department": "Mechanical",
            "year": "2nd Year",
            "semester": 4,
            "section": "B",
            "cgpa": 7.4,
            "attendancePct": 74,
            "feeStatus": "Pending",
            "status": "Active",
            "enrollDate": "2023-08-01",
            "address": "78, Koramangala, Bangalore",
            "guardian": "Harinder Singh",
            "guardianPhone": "+91 76543 21000",
            "avatar": "https://ui-avatars.com/api/?name=Vikram+Singh&background=ea580c&color=fff&size=128",
            "subjects": [
                {"code": "ME201", "name": "Thermodynamics", "grade": "B", "total": 65, "semester": 3, "year": "2nd Year"},
            ],
            "fees": [],
            "documents": [],
            "attendanceMonthly": [],
        },
        {
            "id": "STU-2024-089",
            "rollNumber": "STU-2024-089",
            "name": "Ananya Patel",
            "email": "ananya.patel@mit.edu",
            "phone": "+91 65432 10987",
            "department": "Electronics",
            "year": "4th Year",
            "semester": 8,
            "section": "A",
            "cgpa": 8.2,
            "attendancePct": 88,
            "feeStatus": "Paid",
            "status": "Active",
            "enrollDate": "2021-08-01",
            "address": "23, Indiranagar, Bangalore",
            "guardian": "Mahesh Patel",
            "guardianPhone": "+91 65432 10900",
            "avatar": "https://ui-avatars.com/api/?name=Ananya+Patel&background=059669&color=fff&size=128",
            "subjects": [],
            "fees": [],
            "documents": [],
            "attendanceMonthly": [],
        },
        {
            "id": "STU-2024-203",
            "rollNumber": "STU-2024-203",
            "name": "Rohan Mehta",
            "email": "rohan.mehta@mit.edu",
            "phone": "+91 54321 09876",
            "department": "Computer Science",
            "year": "2nd Year",
            "semester": 4,
            "section": "B",
            "cgpa": 7.9,
            "attendancePct": 81,
            "feeStatus": "Paid",
            "status": "Active",
            "enrollDate": "2023-08-01",
            "address": "56, Whitefield, Bangalore",
            "guardian": "Deepak Mehta",
            "guardianPhone": "+91 54321 09800",
            "avatar": "https://ui-avatars.com/api/?name=Rohan+Mehta&background=0891b2&color=fff&size=128",
            "subjects": [],
            "fees": [],
            "documents": [],
            "attendanceMonthly": [],
        },
        {
            "id": "STU-2024-155",
            "rollNumber": "STU-2024-155",
            "name": "Sneha Reddy",
            "email": "sneha.reddy@mit.edu",
            "phone": "+91 43210 98765",
            "department": "Civil",
            "year": "3rd Year",
            "semester": 6,
            "section": "A",
            "cgpa": 8.5,
            "attendancePct": 90,
            "feeStatus": "Paid",
            "status": "Active",
            "enrollDate": "2022-08-01",
            "address": "89, Jayanagar, Bangalore",
            "guardian": "Venkat Reddy",
            "guardianPhone": "+91 43210 98700",
            "avatar": "https://ui-avatars.com/api/?name=Sneha+Reddy&background=dc2626&color=fff&size=128",
            "subjects": [],
            "fees": [],
            "documents": [],
            "attendanceMonthly": [],
        },
        {
            "id": "STU-2024-077",
            "rollNumber": "STU-2024-077",
            "name": "Karthik Nair",
            "email": "karthik.nair@mit.edu",
            "phone": "+91 32109 87654",
            "department": "Mechanical",
            "year": "4th Year",
            "semester": 8,
            "section": "A",
            "cgpa": 6.8,
            "attendancePct": 68,
            "feeStatus": "Overdue",
            "status": "Active",
            "enrollDate": "2021-08-01",
            "address": "34, Electronic City, Bangalore",
            "guardian": "Ramesh Nair",
            "guardianPhone": "+91 32109 87600",
            "avatar": "https://ui-avatars.com/api/?name=Karthik+Nair&background=b91c1c&color=fff&size=128",
            "subjects": [],
            "fees": [],
            "documents": [],
            "attendanceMonthly": [],
        },
        {
            "id": "STU-2024-190",
            "rollNumber": "STU-2024-190",
            "name": "Divya Iyer",
            "email": "divya.iyer@mit.edu",
            "phone": "+91 21098 76543",
            "department": "Electronics",
            "year": "2nd Year",
            "semester": 4,
            "section": "A",
            "cgpa": 8.9,
            "attendancePct": 94,
            "feeStatus": "Paid",
            "status": "Active",
            "enrollDate": "2023-08-01",
            "address": "67, HSR Layout, Bangalore",
            "guardian": "Subramaniam Iyer",
            "guardianPhone": "+91 21098 76500",
            "avatar": "https://ui-avatars.com/api/?name=Divya+Iyer&background=7c3aed&color=fff&size=128",
            "subjects": [],
            "fees": [],
            "documents": [],
            "attendanceMonthly": [],
        },
        {
            "id": "STU-2023-310",
            "rollNumber": "STU-2023-310",
            "name": "Arjun Desai",
            "email": "arjun.desai@mit.edu",
            "phone": "+91 10987 65432",
            "department": "Computer Science",
            "year": "4th Year",
            "semester": 8,
            "section": "A",
            "cgpa": 7.6,
            "attendancePct": 78,
            "feeStatus": "Pending",
            "status": "Active",
            "enrollDate": "2021-08-01",
            "address": "12, BTM Layout, Bangalore",
            "guardian": "Nikhil Desai",
            "guardianPhone": "+91 10987 65400",
            "avatar": "https://ui-avatars.com/api/?name=Arjun+Desai&background=0d9488&color=fff&size=128",
            "subjects": [],
            "fees": [],
            "documents": [],
            "attendanceMonthly": [],
        },
        {
            "id": "STU-2024-245",
            "rollNumber": "STU-2024-245",
            "name": "Meera Joshi",
            "email": "meera.joshi@mit.edu",
            "phone": "+91 09876 54321",
            "department": "Civil",
            "year": "2nd Year",
            "semester": 4,
            "section": "B",
            "cgpa": 8.0,
            "attendancePct": 85,
            "feeStatus": "Paid",
            "status": "Active",
            "enrollDate": "2023-08-01",
            "address": "90, Marathahalli, Bangalore",
            "guardian": "Anil Joshi",
            "guardianPhone": "+91 09876 54300",
            "avatar": "https://ui-avatars.com/api/?name=Meera+Joshi&background=2563eb&color=fff&size=128",
            "subjects": [],
            "fees": [],
            "documents": [],
            "attendanceMonthly": [],
        },
    ]


@router.get("")
async def list_students():
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_students()
            use_db = False
        else:
            raise

    if not use_db:
        students = deepcopy(DEV_STORE["students"])
        for s in students:
            present, total, pct = await compute_student_attendance_stats(s, db=None)
            s["attendancePct"] = pct
            s["attendance_present"] = present
            s["attendance_total"] = total
        return students

    rows = []
    async for row in db["students"].find().sort("_id", -1):
        serialized = serialize_doc(row)
        
        # Ensure student_id is always present
        if not serialized.get("student_id"):
            serialized["student_id"] = serialized.get("id") or serialized.get("rollNumber") or str(serialized.get("_id"))
        
        # Ensure id field is present
        if not serialized.get("id"):
            serialized["id"] = serialized.get("student_id") or serialized.get("rollNumber")
        
        # Ensure rollNumber is present
        if not serialized.get("rollNumber"):
            serialized["rollNumber"] = serialized.get("student_id") or serialized.get("id")
        
        # Calculate dynamic attendance stats
        present, total, pct = await compute_student_attendance_stats(serialized, db=db)
        serialized["attendancePct"] = pct
        serialized["attendance_present"] = present
        serialized["attendance_total"] = total
        
        rows.append(serialized)
    
    return rows


@router.get("/{student_id}")
async def get_student(student_id: str):
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_students()
            use_db = False
        else:
            raise

    if not use_db:
        row = next(
            (
                item
                for item in DEV_STORE["students"]
                if item.get("id") == student_id or item.get("rollNumber") == student_id or item.get("student_id") == student_id
            ),
            None,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Student not found")
        res = deepcopy(row)
        present, total, pct = await compute_student_attendance_stats(res, db=None)
        res["attendancePct"] = pct
        res["attendance_present"] = present
        res["attendance_total"] = total
        return res

    # Try multiple lookup strategies
    row = await db["students"].find_one(
        {"$or": [
            {"id": student_id}, 
            {"rollNumber": student_id},
            {"student_id": student_id}
        ]}
    )
    
    # If not found by string ID, try as MongoDB ObjectId
    if not row:
        try:
            from bson import ObjectId
            if ObjectId.is_valid(student_id):
                row = await db["students"].find_one({"_id": ObjectId(student_id)})
        except:
            pass
    
    if not row:
        raise HTTPException(status_code=404, detail="Student not found")
    
    serialized = serialize_doc(row)
    
    # Calculate dynamic attendance stats
    present, total, pct = await compute_student_attendance_stats(serialized, db=db)
    serialized["attendancePct"] = pct
    serialized["attendance_present"] = present
    serialized["attendance_total"] = total

    # Fetch and attach fees for this student
    try:
        fees_collection = db["fees_structure"]
        fees = []
        async for fee in fees_collection.find({"student_id": student_id}):
            serialized_fee = serialize_doc(fee)
            
            # Map MongoDB keys to frontend expected keys
            status = serialized_fee.get("payment_status") or serialized_fee.get("status") or "Pending"
            amount = serialized_fee.get("total_fee") or serialized_fee.get("amount") or 0
            
            paid = serialized_fee.get("paid")
            if paid is None:
                paid = amount if status.lower() == "paid" else (amount // 2 if status.lower() == "partial" else 0)
                
            due = serialized_fee.get("due")
            if due is None:
                due = amount - paid
                
            fee_type = serialized_fee.get("type")
            if not fee_type:
                course_name = serialized_fee.get("course") or "Academic"
                sem = serialized_fee.get("semester")
                fee_type = f"{course_name} Sem {sem} Fee" if sem else f"{course_name} general Fee"
                
            serialized_fee["status"] = status
            serialized_fee["amount"] = amount
            serialized_fee["paid"] = paid
            serialized_fee["due"] = due
            serialized_fee["type"] = fee_type
            
            fees.append(serialized_fee)
        
        if fees:
            serialized["fees"] = fees
            # Calculate fee status based on payments
            total_fee = sum(fee.get("amount", 0) for fee in fees)
            total_paid = sum(fee.get("paid", 0) for fee in fees)
            
            if total_paid == 0:
                serialized["feeStatus"] = "Pending"
                serialized["fee_status"] = "Pending"
            elif total_paid < total_fee:
                serialized["feeStatus"] = "Partial"
                serialized["fee_status"] = "Partial"
            else:
                serialized["feeStatus"] = "Paid"
                serialized["fee_status"] = "Paid"
    except Exception as e:
        print(f"[INFO] Could not fetch fees for student {student_id}: {str(e)}")
        # Don't fail if fees collection doesn't exist or is empty
        pass
    
    return serialized

@router.post("", status_code=201)
async def create_student(payload: StudentRecord):
    data = payload.model_dump()

    if not data.get("rollNumber"):
        data["rollNumber"] = data["id"]
        
    # Auto-assign password as rollNumber
    if not data.get("password"):
        data["password"] = data["rollNumber"]
    
    # Ensure role is set
    data["role"] = "student"

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_students()
            exists = next(
                (
                    item
                    for item in DEV_STORE["students"]
                    if item.get("id") == data["id"] or item.get("rollNumber") == data["rollNumber"]
                ),
                None,
            )
            if exists:
                raise HTTPException(status_code=400, detail="Student with this id already exists")
            DEV_STORE["students"].insert(0, deepcopy(data))
            return data
        raise

    exists = await db["students"].find_one(
        {"$or": [{"id": data["id"]}, {"rollNumber": data["rollNumber"]}]}
    )
    if exists:
        raise HTTPException(status_code=400, detail="Student with this id already exists")

    result = await db["students"].insert_one(data)
    created = await db["students"].find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/{student_id}")
async def update_student(student_id: str, payload: dict):
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_students()
            use_db = False
        else:
            raise

    if not use_db:
        target = next(
            (
                item
                for item in DEV_STORE["students"]
                if item.get("id") == student_id or item.get("rollNumber") == student_id or item.get("student_id") == student_id
            ),
            None,
        )
        if not target:
            raise HTTPException(status_code=404, detail="Student not found")
        target.update(payload)
        res = deepcopy(target)
        present, total, pct = await compute_student_attendance_stats(res, db=None)
        res["attendancePct"] = pct
        res["attendance_present"] = present
        res["attendance_total"] = total
        return res

    # Build lookup query with multiple strategies
    lookup_query = {
        "$or": [
            {"id": student_id},
            {"rollNumber": student_id},
            {"student_id": student_id}
        ]
    }
    
    # Try by ObjectId if not found by string
    try:
        from bson import ObjectId
        if ObjectId.is_valid(student_id):
            lookup_query["$or"].append({"_id": ObjectId(student_id)})
    except:
        pass

    result = await db["students"].find_one_and_update(
        lookup_query,
        {"$set": payload},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Student not found")
    serialized = serialize_doc(result)
    present, total, pct = await compute_student_attendance_stats(serialized, db=db)
    serialized["attendancePct"] = pct
    serialized["attendance_present"] = present
    serialized["attendance_total"] = total
    return serialized


@router.delete("/{student_id}")
async def delete_student(student_id: str):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_students()
            before = len(DEV_STORE["students"])
            DEV_STORE["students"] = [
                item
                for item in DEV_STORE["students"]
                if item.get("id") != student_id and item.get("rollNumber") != student_id and item.get("student_id") != student_id
            ]
            if len(DEV_STORE["students"]) == before:
                raise HTTPException(status_code=404, detail="Student not found")
            return {"message": "Student deleted"}
        raise

    # Build lookup query with multiple strategies
    lookup_query = {
        "$or": [
            {"id": student_id},
            {"rollNumber": student_id},
            {"student_id": student_id}
        ]
    }
    
    # Try by ObjectId if not found by string
    try:
        from bson import ObjectId
        if ObjectId.is_valid(student_id):
            lookup_query["$or"].append({"_id": ObjectId(student_id)})
    except:
        pass

    result = await db["students"].delete_one(lookup_query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deleted"}

@router.post("/{student_id}/subjects")
async def add_student_subject(student_id: str, subject: dict):
    """Adds a new academic record (subject) to a student."""
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_students()
            target = next(
                (item for item in DEV_STORE["students"] 
                 if item.get("id") == student_id or item.get("rollNumber") == student_id or item.get("student_id") == student_id),
                None
            )
            if not target:
                raise HTTPException(status_code=404, detail="Student not found")
            if "subjects" not in target:
                target["subjects"] = []
            target["subjects"].append(subject)
            return subject
        raise

    # Build lookup query with multiple strategies
    lookup_query = {
        "$or": [
            {"id": student_id},
            {"rollNumber": student_id},
            {"student_id": student_id}
        ]
    }
    
    # Try by ObjectId if not found by string
    try:
        from bson import ObjectId
        if ObjectId.is_valid(student_id):
            lookup_query["$or"].append({"_id": ObjectId(student_id)})
    except:
        pass

    result = await db["students"].find_one_and_update(
        lookup_query,
        {"$push": {"subjects": subject}},
        return_document=ReturnDocument.AFTER
    )
    if not result:
        raise HTTPException(status_code=404, detail="Student not found")
    return subject


class BulkStudentImportPayload(BaseModel):
    students: List[dict]
    defaultPassword: Optional[str] = None


@router.post("/bulk-import")
async def bulk_import_students(payload: BulkStudentImportPayload):
    try:
        db = get_db()
        use_db = True
    except HTTPException as error:
        if error.status_code == 503:
            use_db = False
        else:
            raise

    imported_count = 0
    records = []

    for index, s in enumerate(payload.students):
        # Generate student ID / roll number if not provided
        student_id = s.get("id") or s.get("rollNumber") or f"STU-2025-{int(datetime.now(timezone.utc).timestamp() * 1000) % 1000000 + index}"
        
        # Determine password
        password = payload.defaultPassword or s.get("password") or student_id
        
        # Prepare admission record
        admission_record = {
            "id": student_id,
            "admission_id": student_id,
            "role": "student",
            "type": "student",
            "status": "Pending",
            "createdDate": datetime.now(timezone.utc).date().isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "name": s.get("name", s.get("fullName", "")),
            "fullName": s.get("fullName", s.get("name", "")),
            "email": s.get("email", ""),
            "phone": s.get("phone", ""),
            "dateOfBirth": s.get("dateOfBirth") or s.get("dob") or "",
            "gender": s.get("gender", "Male"),
            "previousSchool": s.get("previousSchool", ""),
            "board": s.get("board", "CBSE"),
            "yearOfPassing": int(s.get("yearOfPassing") or 2024),
            "marksPercentage": float(s.get("marksPercentage") or 0.0),
            "courseCategory": s.get("courseCategory", s.get("department", "Computer Science")),
            "course": s.get("course", "CSE"),
            "quota": s.get("quota", "Government Quota"),
            "accommodation": s.get("accommodation", "Day Scholar"),
            "roomType": s.get("roomType", ""),
            "password": password,
            "payment_status": "Paid",
            "paymentStatus": "Paid",
            "payment": {
                "application_fee": 500.0,
                "payment_method": "UPI",
                "transaction_id": f"TXN-{int(datetime.now(timezone.utc).timestamp() * 1000) % 1000000}",
                "status": "Paid"
            },
            # Flat fields for direct root access
            "address": s.get("address", ""),
            "city": s.get("city", ""),
            "state": s.get("state", ""),
            "pincode": s.get("pincode", ""),
            "guardianName": s.get("guardian", s.get("guardianName", "")),
            "guardianPhone": s.get("guardianPhone", ""),
            "relationship": s.get("relationship", "Father"),
            "guardianEmail": s.get("guardianEmail", ""),
            "guardianOccupation": s.get("guardianOccupation", ""),
            "hostelName": s.get("hostelName", ""),
            "semester": int(s.get("semester") or 1),
            "roll": s.get("roll") or s.get("rollNumber") or s.get("roll_number") or student_id,
            "cgpa": float(s.get("cgpa") or 0.0),
        }
        
        # For compatibility
        admission_record["personal"] = {
            "full_name": admission_record["fullName"],
            "gender": admission_record["gender"],
            "dob": admission_record["dateOfBirth"],
            "email": admission_record["email"],
            "phone": admission_record["phone"],
            "student_id": student_id,
            "address": admission_record["address"],
            "city": admission_record["city"],
            "state": admission_record["state"],
            "pincode": admission_record["pincode"],
            "guardianName": admission_record["guardianName"],
            "guardianPhone": admission_record["guardianPhone"],
            "relationship": admission_record["relationship"],
            "guardianEmail": admission_record["guardianEmail"],
            "guardianOccupation": admission_record["guardianOccupation"],
        }
        admission_record["academic"] = {
            "previous_school": admission_record["previousSchool"],
            "board": admission_record["board"],
            "year_of_passing": admission_record["yearOfPassing"],
            "marks_percentage": admission_record["marksPercentage"]
        }
        admission_record["course_info"] = {
            "category": admission_record["courseCategory"],
            "course": admission_record["course"]
        }

        records.append(admission_record)

    if use_db:
        if records:
            await db["admissions"].insert_many(records)
            imported_count = len(records)
    else:
        if "admissions" not in DEV_STORE:
            DEV_STORE["admissions"] = []
        for r in records:
            DEV_STORE["admissions"].insert(0, deepcopy(r))
        imported_count = len(records)

    return {
        "status": "success",
        "message": f"Successfully imported {imported_count} student admission requests.",
        "count": imported_count
    }
