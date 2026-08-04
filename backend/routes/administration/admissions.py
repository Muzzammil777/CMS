import asyncio
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Body
from pymongo.errors import PyMongoError, AutoReconnect, ServerSelectionTimeoutError

from backend.db import get_db
from backend.schemas.admission_schema import AdmissionCreate

router = APIRouter(prefix="/api/admissions", tags=["Admissions"])


def _admissions_collection():
    return get_db()["admissions"]


def _to_float(value: Any, fallback: float = 0.0) -> float:
    if value is None:
        return fallback
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace("%", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return fallback
    return fallback


def _to_int(value: Any, fallback: int = 0) -> int:
    if value is None:
        return fallback
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        cleaned = value.strip()
        try:
            return int(cleaned)
        except ValueError:
            return fallback
    return fallback


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today_ymd() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _build_lookup_query(admission_id: str) -> dict[str, Any]:
    lookup: list[dict[str, Any]] = [
        {"id": admission_id},
        {"admission_id": admission_id},
    ]
    if ObjectId.is_valid(admission_id):
        lookup.append({"_id": ObjectId(admission_id)})
    return {"$or": lookup}


def _serialize_admission(item: dict[str, Any]) -> dict[str, Any]:
    serialized = dict(item)
    serialized["_id"] = str(serialized["_id"])

    if not serialized.get("id"):
        serialized["id"] = serialized.get("admission_id") or serialized["_id"]
    if not serialized.get("admission_id"):
        serialized["admission_id"] = serialized["id"]

    payment_status = (
        serialized.get("paymentStatus")
        or serialized.get("payment_status")
        or (serialized.get("payment") or {}).get("status")
        or "Pending"
    )
    serialized["payment_status"] = payment_status
    serialized["paymentStatus"] = payment_status

    if not serialized.get("name") and serialized.get("fullName"):
        serialized["name"] = serialized["fullName"]
    if not serialized.get("fullName") and serialized.get("name"):
        serialized["fullName"] = serialized["name"]

    # Flatten nested personal fields for frontend compatibility
    personal = serialized.get("personal") or {}
    for field in ["address", "city", "state", "pincode", "guardianName", "guardianPhone", "relationship", "guardianEmail", "guardianOccupation"]:
        if not serialized.get(field) and personal.get(field):
            serialized[field] = personal.get(field)

    # Flatten academic info
    academic = serialized.get("academic") or {}
    if not serialized.get("previousSchool") and academic.get("previous_school"):
        serialized["previousSchool"] = academic.get("previous_school")
    if not serialized.get("board") and academic.get("board"):
        serialized["board"] = academic.get("board")
    if not serialized.get("yearOfPassing") and academic.get("year_of_passing"):
        serialized["yearOfPassing"] = academic.get("year_of_passing")
    if not serialized.get("marksPercentage") and academic.get("marks_percentage"):
        serialized["marksPercentage"] = academic.get("marks_percentage")

    # Flatten course info
    course_info = serialized.get("course_info") or {}
    if not serialized.get("course") and course_info.get("course"):
        serialized["course"] = course_info.get("course")
    if not serialized.get("courseCategory") and course_info.get("category"):
        serialized["courseCategory"] = course_info.get("category")

    # Set student defaults for admissions review page
    is_student = (
        serialized.get("type") == "student"
        or serialized.get("role") == "student"
        or "roll" in serialized
        or "semester" in serialized
    )
    if is_student:
        if not serialized.get("semester"):
            serialized["semester"] = 1
        if not serialized.get("roll"):
            serialized["roll"] = (
                serialized.get("rollNumber")
                or serialized.get("roll_number")
                or serialized.get("id")
                or ""
            )
        if not serialized.get("cgpa"):
            serialized["cgpa"] = 0.0

    return serialized


def _normalize_from_flat_payload(payload: dict[str, Any]) -> dict[str, Any]:
    generated_id = f"STU-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    admission_id = payload.get("id") or payload.get("admission_id") or generated_id

    name = (payload.get("name") or payload.get("fullName") or "").strip()
    email = (payload.get("email") or "").strip()
    phone = (payload.get("phone") or "").strip()

    payment_status = payload.get("paymentStatus") or payload.get("payment_status") or "Pending"

    normalized = {
        "id": admission_id,
        "admission_id": admission_id,
        "role": "student",
        "type": "student",
        "status": payload.get("status") or "Pending",
        "createdDate": payload.get("createdDate") or _today_ymd(),
        "created_at": _utc_now_iso(),
        "name": name,
        "fullName": payload.get("fullName") or name,
        "email": email,
        "phone": phone,
        "dateOfBirth": payload.get("dateOfBirth") or payload.get("dob") or "",
        "gender": payload.get("gender") or "",
        "bloodGroup": payload.get("bloodGroup") or "",
        "admissionType": payload.get("admissionType") or "Regular",
        "previousSchool": payload.get("previousSchool") or "",
        "board": payload.get("board") or "",
        "yearOfPassing": _to_int(payload.get("yearOfPassing")),
        "marksPercentage": _to_float(payload.get("marksPercentage")),
        "courseCategory": payload.get("courseCategory") or "",
        "course": payload.get("course") or "",
        "department": payload.get("department") or "",
        "quota": payload.get("quota") or "",
        "accommodation": payload.get("accommodation") or "",
        "roomType": payload.get("roomType") or "",
        # Flat fields for direct root access
        "address": payload.get("address") or "",
        "city": payload.get("city") or "",
        "state": payload.get("state") or "",
        "pincode": payload.get("pincode") or "",
        "guardianName": payload.get("guardianName") or "",
        "guardianPhone": payload.get("guardianPhone") or "",
        "relationship": payload.get("relationship") or "",
        "guardianEmail": payload.get("guardianEmail") or "",
        "guardianOccupation": payload.get("guardianOccupation") or "",
        "hostelName": payload.get("hostelName") or "",
        "semester": payload.get("semester") or 1,
        "roll": payload.get("roll") or payload.get("rollNumber") or payload.get("roll_number") or admission_id,
        "cgpa": _to_float(payload.get("cgpa"), 0.0),
        "avatar": payload.get("avatar") or "",
        "section": payload.get("section") or "A",
        "year": payload.get("year") or "1st Year",
        "enrollDate": payload.get("enrollDate") or _today_ymd(),
        "documents": payload.get("documents") or {
            "passport_photo": payload.get("passportPhoto"),
            "aadhaar_card": payload.get("aadhaarCard"),
            "marksheet": payload.get("marksheet"),
            "transfer_certificate": payload.get("transferCertificate"),
        },
        "payment": {
            "application_fee": _to_float(payload.get("applicationFee"), 500.0),
            "payment_method": payload.get("paymentMethod"),
            "transaction_id": payload.get("transactionId"),
            "payment_datetime": payload.get("paymentDateTime"),
            "status": payment_status,
        },
        "payment_status": payment_status,
        "paymentStatus": payment_status,
        "password": payload.get("password") or "",
    }

    # Keep nested structure for backwards compatibility with any existing API consumers.
    normalized["personal"] = {
        "full_name": normalized["fullName"],
        "gender": normalized["gender"],
        "bloodGroup": normalized["bloodGroup"],
        "dob": normalized["dateOfBirth"],
        "email": normalized["email"],
        "phone": normalized["phone"],
        "student_id": normalized["id"],
        "address": normalized["address"],
        "city": normalized["city"],
        "state": normalized["state"],
        "pincode": normalized["pincode"],
        "guardianName": normalized["guardianName"],
        "guardianPhone": normalized["guardianPhone"],
        "relationship": normalized["relationship"],
        "guardianEmail": normalized["guardianEmail"],
        "guardianOccupation": normalized["guardianOccupation"],
        "avatar": normalized["avatar"],
    }
    normalized["academic"] = {
        "previous_school": normalized["previousSchool"],
        "board": normalized["board"],
        "year_of_passing": normalized["yearOfPassing"],
        "marks_percentage": normalized["marksPercentage"],
    }
    normalized["course_info"] = {
        "category": normalized["courseCategory"],
        "course": normalized["course"],
    }

    return normalized


def _normalize_from_nested_payload(payload: dict[str, Any]) -> dict[str, Any]:
    validated = AdmissionCreate.model_validate(payload)
    admission = validated.model_dump()

    personal = admission.get("personal") or {}
    academic = admission.get("academic") or {}
    course = admission.get("course") or {}
    payment = admission.get("payment") or {}

    admission_id = personal.get("student_id") or f"STU-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    payment_status = admission.get("payment_status") or payment.get("status") or "Pending"

    admission.update(
        {
            "id": admission_id,
            "admission_id": admission_id,
            "type": "student" if admission.get("role") == "student" else admission.get("role"),
            "status": admission.get("status") or "Pending",
            "createdDate": _today_ymd(),
            "created_at": _utc_now_iso(),
            "name": personal.get("full_name") or "",
            "fullName": personal.get("full_name") or "",
            "email": personal.get("email") or "",
            "phone": personal.get("phone") or "",
            "dateOfBirth": personal.get("dob") or "",
            "gender": personal.get("gender") or "",
            "previousSchool": academic.get("previous_school") or "",
            "board": academic.get("board") or "",
            "yearOfPassing": academic.get("year_of_passing") or 0,
            "marksPercentage": academic.get("marks_percentage") or 0,
            "courseCategory": course.get("category") or "",
            "department": payload.get("department") or "",
            "payment_status": payment_status,
            "paymentStatus": payment_status,
            "password": payload.get("password") or admission.get("password") or "",
            "course_info": {
                "category": course.get("category") or "",
                "course": course.get("course") or "",
            },
            # Flat fields for direct root access
            "address": personal.get("address") or "",
            "city": personal.get("city") or "",
            "state": personal.get("state") or "",
            "pincode": personal.get("pincode") or "",
            "guardianName": personal.get("guardianName") or payload.get("guardianName") or "",
            "guardianPhone": personal.get("guardianPhone") or payload.get("guardianPhone") or "",
            "relationship": personal.get("relationship") or payload.get("relationship") or "",
            "guardianEmail": personal.get("guardianEmail") or payload.get("guardianEmail") or "",
            "guardianOccupation": personal.get("guardianOccupation") or payload.get("guardianOccupation") or "",
            "hostelName": payload.get("hostelName") or "",
            "semester": payload.get("semester") or 1,
            "roll": payload.get("roll") or payload.get("rollNumber") or payload.get("roll_number") or admission_id,
            "cgpa": _to_float(payload.get("cgpa"), 0.0),
            "avatar": personal.get("avatar") or payload.get("avatar") or "",
            "bloodGroup": personal.get("bloodGroup") or payload.get("bloodGroup") or "",
            "admissionType": payload.get("admissionType") or "Regular",
            "section": payload.get("section") or "A",
            "year": payload.get("year") or "1st Year",
            "enrollDate": payload.get("enrollDate") or _today_ymd(),
        }
    )

    return admission


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if "personal" in payload and "academic" in payload and "course" in payload:
        return _normalize_from_nested_payload(payload)

    if payload.get("name") or payload.get("fullName"):
        return _normalize_from_flat_payload(payload)

    raise HTTPException(
        status_code=422,
        detail="Unsupported admission payload. Provide nested admission payload or student add form payload.",
    )


@router.post("/create")
async def create_admission(payload: dict[str, Any]):
    try:
        admissions_collection = _admissions_collection()
        admission = _normalize_payload(payload)

        result = await admissions_collection.insert_one(admission)

        return {
            "message": "Admission created successfully",
            "mongo_id": str(result.inserted_id),
            "id": admission.get("id"),
            "admission_id": admission.get("admission_id"),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating admission: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating admission: {str(e)}")


@router.get("")
async def get_all_admissions():
    try:
        admissions_collection = _admissions_collection()
        docs = await asyncio.wait_for(admissions_collection.find().sort("created_at", -1).to_list(length=300), timeout=1.0)
        return [_serialize_admission(item) for item in docs]
    except BaseException as err:
        print(f"Warning: get_all_admissions encountered db error: {err}")
        from backend.dev_store import DEV_STORE
        return DEV_STORE.get("admissions_all", [])


@router.get("/students")
async def get_student_admissions(department: str = None):
    admissions_collection = _admissions_collection()
    data: list[dict[str, Any]] = []

    query: dict[str, Any] = {"$or": [{"role": "student"}, {"type": "student"}]}
    if department:
        import re as _re
        dept_esc = _re.escape(department.strip())
        dept_filter = {"$or": [
            {"department": {"$regex": dept_esc, "$options": "i"}},
            {"courseCategory": {"$regex": dept_esc, "$options": "i"}},
            {"course": {"$regex": dept_esc, "$options": "i"}},
            {"program": {"$regex": dept_esc, "$options": "i"}},
        ]}
        query = {"$and": [query, dept_filter]}

    for attempt in range(2):
        try:
            async for item in admissions_collection.find(query).sort("created_at", -1):
                data.append(_serialize_admission(item))
            break
        except (AutoReconnect, ServerSelectionTimeoutError, PyMongoError) as err:
            if attempt == 1:
                print(f"Warning: get_student_admissions encountered db error: {err}")
                break
            await asyncio.sleep(0.3)

    return data


@router.get("/students/approved-for-fees")
async def get_approved_students_for_fees():
    """Get only APPROVED students with valid ID fields - ready for fee assignment.
    STRICT validation: Only returns students that can be found with exact ID match."""
    try:
        admissions_collection = _admissions_collection()
        data: list[dict[str, Any]] = []

        query = {
            "$and": [
                {"$or": [{"role": "student"}, {"type": "student"}]},
                {"status": "Approved"}
            ]
        }
        
        seen_ids = set()
        docs = await asyncio.wait_for(admissions_collection.find(query).sort("created_at", -1).to_list(length=300), timeout=2.0)
        for item in docs:
            serialized = _serialize_admission(item)
            student_id = serialized.get("id")
            if student_id and student_id not in seen_ids:
                seen_ids.add(student_id)
                data.append(serialized)

        return {"approved_students": data, "count": len(data)}
    except BaseException as err:
        print(f"Warning: get_approved_students_for_fees db error: {err}")
        from backend.dev_store import DEV_STORE
        approved = [s for s in DEV_STORE.get("admissions_students", []) if s.get("status") == "Approved"]
        return {"approved_students": approved, "count": len(approved)}


@router.delete("/purge-invalid-approved")
async def purge_invalid_approved():
    """Admin endpoint: Remove approved students with invalid/non-existent IDs."""
    admissions_collection = _admissions_collection()
    removed_count = 0
    to_delete = []

    # Find all approved students
    query = {
        "$and": [
            {"$or": [{"role": "student"}, {"type": "student"}]},
            {"status": "Approved"}
        ]
    }
    
    async for item in admissions_collection.find(query):
        student_id = item.get("id") or item.get("admission_id")
        
        if not student_id:
            # No ID field at all - mark for deletion
            to_delete.append(item.get("_id"))
        else:
            # ID exists, verify it can be found
            exact_match = await admissions_collection.find_one({"id": student_id})
            
            # If ID doesn't match exactly, it's corrupted - delete
            if not exact_match or str(exact_match.get("_id")) != str(item.get("_id")):
                to_delete.append(item.get("_id"))

    # Delete invalid records
    if to_delete:
        result = await admissions_collection.delete_many({"_id": {"$in": to_delete}})
        removed_count = result.deleted_count
        print(f"[PURGE] Removed {removed_count} invalid approved students")

    return {
        "message": f"Purged {removed_count} invalid records",
        "removed_count": removed_count
    }


# Helper functions for auto-creation of Student/Faculty from approved admissions

async def _create_student_from_admission(admission: dict[str, Any]) -> bool:
    """Create a Student record from an approved admission."""
    try:
        db = get_db()
        students_collection = db["students"]
        
        # Extract data from admission
        admission_id = admission.get("id") or admission.get("admission_id")
        email = admission.get("email") or ""
        
        # Check if student already exists by email or admission_id
        if admission_id:
            existing = await students_collection.find_one({
                "$or": [
                    {"admission_id": admission_id},
                    {"email": email} if email else {"email": ""}
                ]
            })
            
            if existing:
                print(f"[INFO] Student already exists for admission {admission_id}")
                return False  # Skip duplicate
        
        name = admission.get("name") or admission.get("fullName") or ""
        
        # Use admission ID as student_id
        student_id = admission_id
        
        # Determine department from admission
        course_info = admission.get("course_info") or {}
        department = admission.get("department") or course_info.get("category") or admission.get("courseCategory") or "General"

        # Extract guardian and address fields with fallbacks
        personal = admission.get("personal") or {}
        address = admission.get("address") or personal.get("address") or ""
        city = admission.get("city") or personal.get("city") or ""
        state = admission.get("state") or personal.get("state") or ""
        pincode = admission.get("pincode") or personal.get("pincode") or ""
        
        guardian = (
            admission.get("guardianName")
            or personal.get("guardianName")
            or admission.get("guardian")
            or ""
        )
        guardian_phone = (
            admission.get("guardianPhone")
            or personal.get("guardianPhone")
            or admission.get("guardian_phone")
            or ""
        )

        # Build student data with comprehensive field mappings
        academic = admission.get("academic") or {}
        student_data = {
            # ID Fields (CRITICAL - must have both)
            "id": student_id,
            "student_id": student_id,
            "roll_number": student_id,
            "rollNumber": student_id,
            
            # Personal Information
            "name": name,
            "email": email,
            "password": admission.get("password") or student_id,
            "phone": admission.get("phone") or "",
            "gender": admission.get("gender") or "",
            "bloodGroup": admission.get("bloodGroup") or personal.get("bloodGroup") or "",
            "dateOfBirth": admission.get("dateOfBirth") or admission.get("dob") or "",
            "dob": admission.get("dateOfBirth") or admission.get("dob") or "",
            "address": address,
            "city": city,
            "state": state,
            "pincode": pincode,
            
            # Academic Information
            "department_id": department,
            "department": department,
            "year": admission.get("year") or "1st Year",
            "semester": _to_int(admission.get("semester"), 1),
            "section": admission.get("section") or "A",
            
            # Status and Dates
            "status": "Active",
            "created_at": _utc_now_iso(),
            "enroll_date": admission.get("enrollDate") or admission.get("enroll_date") or _today_ymd(),
            "enrollDate": admission.get("enrollDate") or admission.get("enroll_date") or _today_ymd(),
            "admissionType": admission.get("admissionType") or "Regular",
            
            # Academic Metrics
            "cgpa": 0.0,
            "attendance_pct": 0.0,
            "attendancePct": 0.0,
            
            # Financial Information
            "fee_status": "Pending",
            "feeStatus": "Pending",
            
            # Guardian Information
            "guardian": guardian,
            "guardianName": guardian,
            "guardian_phone": guardian_phone,
            "guardianPhone": guardian_phone,
            "guardianEmail": admission.get("guardianEmail") or personal.get("guardianEmail") or "",
            "relationship": admission.get("relationship") or personal.get("relationship") or "",
            "guardianOccupation": admission.get("guardianOccupation") or personal.get("guardianOccupation") or "",
            
            # Previous Academics
            "previousSchool": admission.get("previousSchool") or academic.get("previous_school") or "",
            "previousInstitution": admission.get("previousSchool") or academic.get("previous_school") or "",
            "board": admission.get("board") or academic.get("board") or "",
            "yearOfPassing": admission.get("yearOfPassing") or academic.get("year_of_passing") or 0,
            "marksPercentage": admission.get("marksPercentage") or academic.get("marks_percentage") or 0.0,
            
            # Course category & Quota & Housing
            "courseCategory": admission.get("courseCategory") or course_info.get("category") or "",
            "course": admission.get("course") or course_info.get("course") or "",
            "quota": admission.get("quota") or "",
            "accommodation": admission.get("accommodation") or "",
            "roomType": admission.get("roomType") or "",
            "hostelName": admission.get("hostelName") or "",
            
            # Payment information
            "payment": admission.get("payment") or {},
            
            # Appearance
            "avatar": admission.get("avatar") or personal.get("avatar") or f"https://ui-avatars.com/api/?name={name}&background=1162d4&color=fff",
            
            # Initialize empty collections
            "subjects": [],
            "fees": [],
            "documents": admission.get("documents") or [],
            "attendanceMonthly": []
        }
        
        result = await students_collection.insert_one(student_data)
        print(f"[SUCCESS] Created student {student_id} from admission {admission_id}")
        print(f"[SUCCESS] Inserted with MongoDB ID: {result.inserted_id}")
        
        # Send welcome email asynchronously
        try:
            from backend.utils.mailer import send_email
            email_to = student_data.get("email")
            if email_to:
                subject = "Welcome to CMS"
                html_body = f"""
                <html>
                <body>
                    <h2>Welcome to CMS!</h2>
                    <p>Dear {name},</p>
                    <p>Your student account has been created successfully.</p>
                    <p>Here are your account details to log in:</p>
                    <ul>
                        <li><strong>Role:</strong> Student</li>
                        <li><strong>Roll Number/Username:</strong> {student_id}</li>
                        <li><strong>Password:</strong> {student_data.get("password") or student_id}</li>
                    </ul>
                    <p>Best regards,<br>College Management System (CMS) Support</p>
                </body>
                </html>
                """
                import asyncio
                asyncio.create_task(send_email(email_to, subject, html_body))
            else:
                print(f"[EMAIL WARNING] No email address found for student {student_id}, skipping welcome email.")
        except Exception as email_err:
            print(f"[EMAIL ERROR] Failed to trigger welcome email for student {student_id}: {str(email_err)}")

        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to create student from admission: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def _create_faculty_from_admission(admission: dict[str, Any]) -> bool:
    """Create a Faculty record from an approved admission."""
    try:
        db = get_db()
        faculty_collection = db["faculty"]
        
        # Check if faculty already exists by email or admission_id
        existing = await faculty_collection.find_one({
            "$or": [
                {"email": admission.get("email")},
                {"admission_id": admission.get("id") or admission.get("admission_id")}
            ]
        })
        
        if existing:
            print(f"[INFO] Faculty already exists for admission {admission.get('id')}. Updating status to Active.")
            faculty_id = existing.get("employee_id") or existing.get("faculty_id") or existing.get("employeeId") or existing.get("id") or admission.get("id")
            await faculty_collection.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "status": "Active",
                        "employment_status": "Active",
                        "employee_id": faculty_id,
                        "faculty_id": faculty_id,
                        "qualifications": existing.get("qualifications") or [],
                        "specializations": existing.get("specializations") or [],
                        "office_location": existing.get("office_location") or "",
                        "office_hours": existing.get("office_hours") or [],
                        "research_interests": existing.get("research_interests") or [],
                        "join_date": existing.get("join_date") or _today_ymd(),
                        "publications": existing.get("publications") or [],
                        "compliance_status": "Compliant"
                    }
                }
            )
            return True
        
        # Extract data from admission
        admission_id = admission.get("id") or admission.get("admission_id")
        name = admission.get("name") or admission.get("fullName") or ""
        
        # Generate faculty_id/employee_id if not exists
        faculty_id = admission.get("id") or f"FAC-{int(datetime.now(timezone.utc).timestamp() * 1000) % 10000}"
        
        # Determine department from admission
        course_info = admission.get("course_info") or {}
        department = admission.get("department") or course_info.get("category") or admission.get("courseCategory") or "General"
        
        faculty_data = {
            "employee_id": faculty_id,
            "faculty_id": faculty_id,
            "name": name,
            "email": admission.get("email") or "",
            "phone": admission.get("phone") or "",
            "password": admission.get("password") or faculty_id,
            "department_id": department,
            "department": department,
            "designation": admission.get("designation") or "Assistant Professor",
            "status": "Active",
            "employment_status": "Active",
            "admission_id": admission_id,
            "created_at": _utc_now_iso(),
            "qualifications": [],
            "specializations": [],
            "office_location": "",
            "office_hours": [],
            "research_interests": [],
            "join_date": _today_ymd(),
            "publications": [],
            "compliance_status": "Compliant"
        }
        
        result = await faculty_collection.insert_one(faculty_data)
        print(f"[SUCCESS] Created faculty {faculty_id} from admission {admission_id}")
        
        # Send welcome email asynchronously
        try:
            from backend.utils.mailer import send_email
            email_to = faculty_data.get("email")
            if email_to:
                subject = "Welcome to CMS"
                html_body = f"""
                <html>
                <body>
                    <h2>Welcome to CMS!</h2>
                    <p>Dear {name},</p>
                    <p>Your faculty account has been created successfully.</p>
                    <p>Here are your account details to log in:</p>
                    <ul>
                        <li><strong>Role:</strong> Faculty</li>
                        <li><strong>Employee ID/Username:</strong> {faculty_id}</li>
                        <li><strong>Password:</strong> {faculty_data.get("password") or faculty_id}</li>
                    </ul>
                    <p>Best regards,<br>College Management System (CMS) Support</p>
                </body>
                </html>
                """
                import asyncio
                asyncio.create_task(send_email(email_to, subject, html_body))
            else:
                print(f"[EMAIL WARNING] No email address found for faculty {faculty_id}, skipping welcome email.")
        except Exception as email_err:
            print(f"[EMAIL ERROR] Failed to trigger welcome email for faculty {faculty_id}: {str(email_err)}")

        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to create faculty from admission: {str(e)}")
        return False


@router.put("/approve/{admission_id}")
async def approve_admission(admission_id: str):
    admissions_collection = _admissions_collection()
    
    # First, fetch the admission to check if it has an ID
    admission = await admissions_collection.find_one(_build_lookup_query(admission_id))
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    
    # Ensure the admission has an ID field (for fee assignment lookup and student creation)
    update_data = {
        "status": "Approved",
        "updated_at": _utc_now_iso()
    }
    
    # If no ID field exists, generate one
    current_id = admission.get("id") or admission.get("admission_id")
    if not current_id:
        new_id = f"STU-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        update_data["id"] = new_id
        update_data["admission_id"] = new_id
        current_id = new_id
    else:
        # Ensure both id and admission_id are set consistently
        if not admission.get("id"):
            update_data["id"] = current_id
        if not admission.get("admission_id"):
            update_data["admission_id"] = current_id
    
    # Update the admission with Approved status
    result = await admissions_collection.update_one(
        _build_lookup_query(admission_id),
        {"$set": update_data},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Admission not found")
    
    # Fetch the updated admission record
    updated_admission = await admissions_collection.find_one(_build_lookup_query(admission_id))
    
    if not updated_admission:
        raise HTTPException(status_code=500, detail="Failed to fetch updated admission")
    
    print(f"[APPROVE] Admission {current_id} approved")
    print(f"[APPROVE] Admission data: {updated_admission}")
    
    # Auto-create Student or Faculty record based on type
    admission_type = updated_admission.get("type") or updated_admission.get("role") or "student"
    
    if admission_type.lower() == "student":
        success = await _create_student_from_admission(updated_admission)
        if success:
            print(f"[SUCCESS] Student auto-created for admission {current_id}")
        else:
            print(f"[WARNING] Student auto-creation failed or skipped for admission {current_id}")
    elif admission_type.lower() == "faculty":
        success = await _create_faculty_from_admission(updated_admission)
        if success:
            print(f"[SUCCESS] Faculty auto-created for admission {current_id}")
        else:
            print(f"[WARNING] Faculty auto-creation failed or skipped for admission {current_id}")
    
    return {
        "message": "Admission approved successfully",
        "id": current_id,
        "status": "Approved"
    }


@router.put("/reject/{admission_id}")
async def reject_admission(admission_id: str):
    admissions_collection = _admissions_collection()
    result = await admissions_collection.update_one(
        _build_lookup_query(admission_id),
        {"$set": {"status": "Rejected", "updated_at": _utc_now_iso()}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Admission not found")

    return {"message": "Admission rejected successfully", "id": admission_id}


# -----------------
# Faculty Admissions Routes
# -----------------

def _faculty_admissions_collection():
    return get_db()["faculty"]


async def _get_faculty_collection():
    db = get_db()
    return db["faculty"]


def _serialize_faculty_admission(item: dict[str, Any]) -> dict[str, Any]:
    """Serialize faculty admission document"""
    serialized = dict(item)
    serialized["_id"] = str(serialized["_id"])
    
    if not serialized.get("id"):
        serialized["id"] = serialized.get("admission_id") or serialized["_id"]
    if not serialized.get("admission_id"):
        serialized["admission_id"] = serialized["id"]
    
    return serialized


def _build_faculty_lookup_query(faculty_admission_id: str) -> dict[str, Any]:
    """Build query for finding faculty admission by multiple fields"""
    lookup: list[dict[str, Any]] = [
        {"id": faculty_admission_id},
        {"admission_id": faculty_admission_id},
    ]
    if ObjectId.is_valid(faculty_admission_id):
        lookup.append({"_id": ObjectId(faculty_admission_id)})
    return {"$or": lookup}


@router.get("/faculty")
@router.get("/faculty/")
async def get_faculty_admissions(department: str = None):
    """Get all faculty admissions"""
    faculty_admissions_collection = _faculty_admissions_collection()
    data: list[dict[str, Any]] = []

    query: dict[str, Any] = {}
    if department:
        import re as _re
        dept_esc = _re.escape(department.strip())
        query = {"$or": [
            {"department": {"$regex": dept_esc, "$options": "i"}},
            {"departmentId": {"$regex": dept_esc, "$options": "i"}},
        ]}

    async for item in faculty_admissions_collection.find(query).sort("created_at", -1):
        data.append(_serialize_faculty_admission(item))
    
    return data


@router.get("/faculty/{faculty_admission_id}")
async def get_faculty_admission(faculty_admission_id: str):
    """Get specific faculty admission by ID"""
    faculty_admissions_collection = _faculty_admissions_collection()
    
    # Try to find by multiple ID formats
    doc = None
    try:
        obj_id = ObjectId(faculty_admission_id)
        doc = await faculty_admissions_collection.find_one({"_id": obj_id})
    except:
        pass
    
    if not doc:
        doc = await faculty_admissions_collection.find_one(
            {"$or": [{"id": faculty_admission_id}, {"admission_id": faculty_admission_id}]}
        )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Faculty admission not found")
    
    return _serialize_faculty_admission(doc)


@router.put("/faculty/approve/{faculty_admission_id}")
async def approve_faculty_admission(faculty_admission_id: str):
    """Approve faculty admission"""
    faculty_admissions_collection = _faculty_admissions_collection()
    
    # Fetch the admission first
    admission = await faculty_admissions_collection.find_one(
        _build_faculty_lookup_query(faculty_admission_id)
    )
    if not admission:
        raise HTTPException(status_code=404, detail="Faculty admission not found")
    
    result = await faculty_admissions_collection.update_one(
        _build_faculty_lookup_query(faculty_admission_id),
        {"$set": {"status": "Approved", "updated_at": _utc_now_iso()}},
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Faculty admission not found")
    
    # Fetch the updated admission record
    updated_admission = await faculty_admissions_collection.find_one(
        _build_faculty_lookup_query(faculty_admission_id)
    )
    
    # Auto-create Faculty record
    await _create_faculty_from_admission(updated_admission)
    
    return {"message": "Faculty admission approved successfully", "id": faculty_admission_id}


@router.put("/faculty/reject/{faculty_admission_id}")
async def reject_faculty_admission(faculty_admission_id: str):
    """Reject faculty admission"""
    faculty_admissions_collection = _faculty_admissions_collection()
    
    result = await faculty_admissions_collection.update_one(
        _build_faculty_lookup_query(faculty_admission_id),
        {"$set": {"status": "Rejected", "updated_at": _utc_now_iso()}},
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Faculty admission not found")
    
    return {"message": "Faculty admission rejected successfully", "id": faculty_admission_id}


@router.delete("/faculty/{faculty_admission_id}")
async def delete_faculty_admission(faculty_admission_id: str):
    """Delete faculty admission"""
    faculty_admissions_collection = _faculty_admissions_collection()
    
    result = await faculty_admissions_collection.delete_one(
        _build_faculty_lookup_query(faculty_admission_id)
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Faculty admission not found")
    
    return {"message": "Faculty admission deleted successfully", "id": faculty_admission_id}


@router.delete("/{admission_id}")
async def delete_admission(admission_id: str):
    admissions_collection = _admissions_collection()
    result = await admissions_collection.delete_one(_build_lookup_query(admission_id))

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Admission not found")

    return {"message": "Admission deleted successfully", "id": admission_id}


@router.get("/{admission_id}")
async def get_admission(admission_id: str):
    admissions_collection = _admissions_collection()
    doc = await admissions_collection.find_one(_build_lookup_query(admission_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Admission not found")
    return _serialize_admission(doc)


@router.put("/{admission_id}/documents")
async def update_admission_documents(admission_id: str, payload: dict = Body(...)):
    admissions_collection = _admissions_collection()
    
    # Check if admission exists
    admission = await admissions_collection.find_one(_build_lookup_query(admission_id))
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
        
    documents = payload.get("documents")
    if documents is None:
        raise HTTPException(status_code=400, detail="Missing documents in request body")
        
    update_data = {
        "documents": documents,
        "updated_at": _utc_now_iso()
    }
    if payload.get("status"):
        update_data["status"] = payload.get("status")
        
    result = await admissions_collection.update_one(
        _build_lookup_query(admission_id),
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Admission not found")
        
    return {"message": "Documents updated successfully", "id": admission_id}