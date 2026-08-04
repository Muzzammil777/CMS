import asyncio
from fastapi import APIRouter, HTTPException
from datetime import datetime

from backend.db import get_db
from backend.schemas.fees_schema import AssignFee
from backend.utils.fee_calculator import calculate_fee
from backend.utils.mongo import serialize_doc, parse_object_id
from backend.utils.notify import send_notification

router = APIRouter(prefix="/api/fees", tags=["Fees"])


@router.post("/assign")
async def assign_fee(data: AssignFee):
    """Assign fees to a student"""
    
    # Validate student_id
    if not data.student_id:
        raise HTTPException(status_code=400, detail="student_id is required")
    
    db = get_db()
    fees_collection = db["fees_structure"]

    # Calculate fee breakdown
    fee = calculate_fee(
        data.first_graduate,
        data.hostel_required
    )

    record = {
        "student_id": data.student_id,
        "student_name": data.student_name,
        "course": data.course,
        "semester": data.semester,
        "first_graduate": data.first_graduate,
        "hostel_required": data.hostel_required,
        "fee_breakdown": fee,
        "total_fee": fee["total"],
        "assigned_date": datetime.now(),
        "payment_status": "Pending"
    }

    result = await fees_collection.insert_one(record)
    
    # Update student's fee_status
    students_collection = db["students"]
    await students_collection.update_one(
        {"$or": [
            {"id": data.student_id},
            {"student_id": data.student_id},
            {"rollNumber": data.student_id}
        ]},
        {"$set": {
            "fee_status": "Pending",
            "feeStatus": "Pending"
        }}
    )

    # Notify the student about new fee assignment (if preference enabled)
    await send_notification(
        db=db,
        receiver_role="student",
        event_key="feeReminder",
        title="Fees Assigned",
        message=(
            f"Fees of ₹{fee['total']:,.0f} have been assigned for {data.course} "
            f"Semester {data.semester}. Due status: Pending."
        ),
        sender_role="admin",
        module="Finance",
        priority="High",
        related_data={"studentId": data.student_id, "amount": fee["total"]},
        receiver_user_id=data.student_id,
    )

    return {
        "message": "Fee assigned successfully",
        "collection": "fees_structure",
        "id": str(result.inserted_id),
        "student_id": data.student_id,
        "total": fee["total"]
    }


@router.get("/student/{student_id}")
async def get_student_fees(student_id: str):
    """Get all fees for a student"""
    db = get_db()
    fees_collection = db["fees_structure"]
    
    fees = []
    async for fee in fees_collection.find({"student_id": student_id}):
        fees.append(serialize_doc(fee))
    
    return {
        "student_id": student_id,
        "fees": fees,
        "count": len(fees),
        "total_assigned": sum(f.get("total_fee", 0) for f in fees)
    }


@router.get("")
async def get_all_fees():
    """Get all fee assignments"""
    db = get_db()
    fees_collection = db["fees_structure"]
    
    fees = []
    async for fee in fees_collection.find().sort("assigned_date", -1):
        fees.append(serialize_doc(fee))
    
    return fees


@router.patch("/{fee_id}/payment")
async def update_fee_payment(fee_id: str, payload: dict):
    """Update payment status for a fee assignment"""
    db = get_db()
    fees_collection = db["fees_structure"]

    oid = parse_object_id(fee_id)
    fee = await fees_collection.find_one({"_id": oid})
    if not fee:
        # Try by string id
        fee = await fees_collection.find_one({"id": fee_id})
        if not fee:
            raise HTTPException(status_code=404, detail="Fee assignment not found")
        oid = fee["_id"]

    update_data = {}
    if "payment_status" in payload or "paymentStatus" in payload:
        status = payload.get("payment_status") or payload.get("paymentStatus")
        update_data["payment_status"] = status
    if "payment_method" in payload or "paymentMethod" in payload:
        update_data["payment_method"] = payload.get("payment_method") or payload.get("paymentMethod")
    if "transaction_id" in payload or "transactionId" in payload:
        update_data["transaction_id"] = payload.get("transaction_id") or payload.get("transactionId")
    if "paid_date" in payload or "paidDate" in payload:
        update_data["paid_date"] = payload.get("paid_date") or payload.get("paidDate")

    if not update_data:
        raise HTTPException(status_code=400, detail="No update fields provided")

    result = await fees_collection.find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=True
    )

    # Also update the student's fee status
    payment_status = update_data.get("payment_status")
    if payment_status:
        student_id = fee.get("student_id")
        if student_id:
            students_collection = db["students"]
            await students_collection.update_one(
                {"$or": [
                    {"id": student_id},
                    {"student_id": student_id},
                    {"rollNumber": student_id}
                ]},
                {"$set": {
                    "fee_status": payment_status,
                    "feeStatus": payment_status
                }}
            )

        # Update or generate invoice
        invoices_collection = db["invoices"]
        existing_invoice = await invoices_collection.find_one({
            "$or": [
                {"generated_from": fee_id},
                {"generated_from": str(oid)},
                {"generated_from": str(fee.get("_id"))}
            ]
        })
        
        formatted_status = payment_status.capitalize()  # "Paid", "Pending", "Processing", "Failed"
        paid_date = update_data.get("paid_date") or (datetime.now().isoformat() if formatted_status == "Paid" else None)
        payment_method = update_data.get("payment_method") or ("Online" if formatted_status == "Paid" else None)
        transaction_id = update_data.get("transaction_id") or (f"TXN{int(datetime.now().timestamp())}" if formatted_status == "Paid" else None)
        
        if existing_invoice:
            set_fields = {
                "payment_status": formatted_status
            }
            if paid_date:
                set_fields["paid_date"] = paid_date
            if payment_method:
                set_fields["payment_method"] = payment_method
            if transaction_id:
                set_fields["transaction_id"] = transaction_id
                
            await invoices_collection.update_one(
                {"_id": existing_invoice["_id"]},
                {"$set": set_fields}
            )
        elif formatted_status == "Paid":
            # Generate new invoice since it is paid and doesn't exist
            fee_breakdown = fee.get("fee_breakdown") or {}
            
            # Helper to get numeric fee value safely
            def get_fee(key_breakdown, key_flat):
                val = fee_breakdown.get(key_breakdown)
                if val is None:
                    val = fee.get(key_flat)
                return float(val) if val is not None else 0.0

            semester_fee = get_fee("semester_fee", "semesterFee")
            book_fee = get_fee("book_fee", "bookFee")
            exam_fee = get_fee("exam_fee", "examFee")
            hostel_fee = get_fee("hostel_fee", "hostelFee")
            misc_fee = get_fee("misc_fee", "miscFee")
            
            items = [
                {"description": "Semester Fee", "amount": semester_fee},
                {"description": "Book Fee", "amount": book_fee},
                {"description": "Exam Fee", "amount": exam_fee}
            ]
            if hostel_fee > 0:
                items.append({"description": "Hostel Fee", "amount": hostel_fee})
            if misc_fee > 0:
                items.append({"description": "Misc Fee", "amount": misc_fee})
                
            invoice_record = {
                "invoice_id": f"BILL{int(datetime.now().timestamp())}",
                "student_id": fee.get("student_id"),
                "student_name": fee.get("student_name"),
                "course": fee.get("course"),
                "semester": fee.get("semester"),
                "items": items,
                "total": float(fee.get("total_fee") or fee.get("totalFee") or (semester_fee + book_fee + exam_fee + hostel_fee + misc_fee)),
                "generated_date": datetime.now().isoformat(),
                "payment_status": "Paid",
                "generated_from": fee_id,
                "paid_date": paid_date,
                "payment_method": payment_method,
                "transaction_id": transaction_id
            }
            await invoices_collection.insert_one(invoice_record)

    # Notify finance and admin when payment status becomes Paid
    if payment_status in ("Paid", "paid"):
        student_id = fee.get("student_id") or ""
        student_name = fee.get("student_name") or student_id
        total = fee.get("total_fee") or 0
        notif_message = (
            f"Student {student_name} ({student_id}) has successfully paid "
            f"₹{total:,.0f} for {fee.get('course', 'N/A')} Semester {fee.get('semester', '')}."
        )
        # Notify finance
        await send_notification(
            db=db,
            receiver_role="finance",
            event_key="feePayments",
            title="Fee Payment Received",
            message=notif_message,
            sender_role="student",
            module="Finance",
            priority="High",
            related_data={"studentId": student_id, "amount": total, "feeId": fee_id},
        )
        # Notify admin
        await send_notification(
            db=db,
            receiver_role="admin",
            event_key="feePayments",
            title="Fee Payment Received",
            message=notif_message,
            sender_role="student",
            module="Finance",
            priority="High",
            related_data={"studentId": student_id, "amount": total, "feeId": fee_id},
        )
        # Confirm to the student
        await send_notification(
            db=db,
            receiver_role="student",
            event_key="feeReminder",
            title="Fee Payment Confirmed",
            message=(
                f"Your payment of ₹{total:,.0f} for {fee.get('course', 'N/A')} "
                f"Semester {fee.get('semester', '')} has been successfully recorded."
            ),
            sender_role="system",
            module="Finance",
            priority="Medium",
            related_data={"feeId": fee_id, "amount": total},
            receiver_user_id=fee.get("student_id"),
        )

    return serialize_doc(result)


@router.delete("/{fee_id}")
async def delete_fee_assignment(fee_id: str):
    """Delete a fee assignment"""
    db = get_db()
    fees_collection = db["fees_structure"]

    try:
        oid = parse_object_id(fee_id)
        result = await fees_collection.delete_one({"_id": oid})
    except Exception:
        result = await fees_collection.delete_one({"id": fee_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fee assignment not found")

    return {"message": "Fee assignment deleted"}


# ── Scholarship Schemes ─────────────────────────────────────────────────────

DEFAULT_SCHOLARSHIPS = [
    {"id": "none", "value": "None", "label": "No Waiver / Standard Rate", "sub": "Full tuition fee applies", "discount_type": "fixed", "discount_amount": 0, "eligibility": "All students", "scheme_type": "Standard"},
    {"id": "merit", "value": "Merit Excellence (50% Tuition)", "label": "Merit Excellence Scheme", "sub": "50% Waiver on Tuition Fee", "discount_type": "percent", "discount_amount": 50, "eligibility": "Min 85% in qualifying exam", "scheme_type": "Merit"},
    {"id": "first_grad", "value": "First Graduate Scheme (-₹25,000)", "label": "First Graduate Concession", "sub": "State Aid -₹25,000 / Semester", "discount_type": "fixed", "discount_amount": 25000, "eligibility": "First in family to pursue higher education", "scheme_type": "Government"},
    {"id": "ews", "value": "Single Parent / EWS Aid (-₹20,000)", "label": "EWS / Economic Need Support", "sub": "Special Financial Assistance -₹20,000", "discount_type": "fixed", "discount_amount": 20000, "eligibility": "Annual family income < ₹2.5 Lakh", "scheme_type": "Government"},
    {"id": "sports", "value": "Sports / NCC Excellence (-₹30,000)", "label": "Sports & NCC Fellowship", "sub": "State / National Player -₹30,000", "discount_type": "fixed", "discount_amount": 30000, "eligibility": "State / National level sports or NCC 'A' certificate", "scheme_type": "Sports"},
]


@router.get("/scholarships")
async def get_scholarship_schemes():
    """Return scholarship schemes, preferring DB values over defaults."""
    try:
        db = get_db()
        col = db["fees_scholarships"]
        docs = await asyncio.wait_for(col.find({}).to_list(length=50), timeout=1.0)
        if docs:
            # Merge DB values over defaults (by id)
            db_map = {d["id"]: d for d in docs}
            result = []
            for s in DEFAULT_SCHOLARSHIPS:
                merged = dict(s)
                if s["id"] in db_map:
                    db_entry = dict(db_map[s["id"]])
                    db_entry.pop("_id", None)
                    merged.update(db_entry)
                result.append(merged)
            # Add any custom scholarships not in defaults
            for doc in docs:
                doc_id = doc.get("id", "")
                if not any(s["id"] == doc_id for s in DEFAULT_SCHOLARSHIPS):
                    clean = dict(doc)
                    clean.pop("_id", None)
                    result.append(clean)
            return result
    except Exception:
        pass
    return DEFAULT_SCHOLARSHIPS


@router.post("/scholarships")
async def create_scholarship_scheme(payload: dict):
    """Create a new custom scholarship scheme."""
    try:
        db = get_db()
        col = db["fees_scholarships"]
        scheme_id = payload.get("id") or f"custom_{int(datetime.now().timestamp())}"
        new_scheme = {
            "id": scheme_id,
            "value": payload.get("value", payload.get("label", "Custom Scheme")),
            "label": payload.get("label", "Custom Scheme"),
            "sub": payload.get("sub", ""),
            "discount_type": payload.get("discount_type", "fixed"),
            "discount_amount": float(payload.get("discount_amount", 0)),
            "eligibility": payload.get("eligibility", ""),
            "scheme_type": payload.get("scheme_type", "Institutional"),
            "income_limit": payload.get("income_limit", ""),
            "documentation": payload.get("documentation", ""),
            "applicable_communities": payload.get("applicable_communities", []),
            "created_at": datetime.now().isoformat(),
        }
        await col.update_one(
            {"id": scheme_id},
            {"$set": new_scheme},
            upsert=True,
        )
        return {"message": "Scholarship scheme created", **new_scheme}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create scholarship: {e}")


@router.put("/scholarships/{scheme_id}")
async def update_scholarship_scheme(scheme_id: str, payload: dict):
    """Update a scholarship scheme's fields in MongoDB."""
    try:
        db = get_db()
        col = db["fees_scholarships"]
        update_data = {
            k: v for k, v in payload.items()
            if k in ("label", "sub", "discount_amount", "discount_type", "value", "eligibility", "scheme_type", "income_limit", "documentation", "applicable_communities")
        }
        update_data["id"] = scheme_id
        await col.update_one(
            {"id": scheme_id},
            {"$set": update_data},
            upsert=True,
        )
        return {"message": "Scholarship scheme updated", "id": scheme_id, **update_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update scholarship: {e}")


@router.delete("/scholarships/{scheme_id}")
async def delete_scholarship_scheme(scheme_id: str):
    """Delete a custom scholarship scheme (default schemes cannot be deleted)."""
    default_ids = {"none", "merit", "first_grad", "ews", "sports"}
    if scheme_id in default_ids:
        raise HTTPException(status_code=400, detail="Default scholarship schemes cannot be deleted. You can edit them instead.")
    try:
        db = get_db()
        col = db["fees_scholarships"]
        result = await col.delete_one({"id": scheme_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Scholarship scheme not found")
        return {"message": f"Scholarship scheme '{scheme_id}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete scholarship: {e}")


# ── Auxiliary Fee Configurations (Transport, Hostel, Installments) ──────────

DEFAULT_TRANSPORT_ZONES = [
    {"id": "none", "value": "None", "label": "No Campus Transport / Self Arranged", "amount": 0, "distance": "Self-arranged", "pickup_points": [], "icon": "directions_walk"},
    {"id": "zone1", "value": "Zone 1: Urban (≤ 15 km)", "label": "Zone 1: Urban City Lines (≤ 15 km)", "amount": 18000, "distance": "Up to 15 km", "pickup_points": ["City Bus Stand", "Railway Station", "Main Junction"], "icon": "directions_bus"},
    {"id": "zone2", "value": "Zone 2: Suburban (15-30 km)", "label": "Zone 2: Metro Suburban (15–30 km)", "amount": 28000, "distance": "15 – 30 km", "pickup_points": ["Suburban Hub A", "Suburban Hub B", "Outer Ring Road"], "icon": "directions_bus"},
    {"id": "zone3", "value": "Zone 3: Outstation Corridor (> 30 km)", "label": "Zone 3: Outstation Corridor (> 30 km)", "amount": 38000, "distance": "Above 30 km", "pickup_points": ["District Bus Terminal", "Highway Corridor Stop"], "icon": "directions_bus"},
]

DEFAULT_HOSTEL_TYPES = [
    {"id": "day", "value": "Day Scholar", "label": "Day Scholar", "amount": 0, "occupancy": "N/A", "food_plan": "Not Included", "amenities": [], "icon": "home"},
    {"id": "standard", "value": "Standard Quad Occupancy + Food", "label": "Standard Quad Occupancy + Mess", "amount": 75000, "occupancy": "Quad (4 Students)", "food_plan": "Three Meals (Mess)", "amenities": ["mess", "fan", "study_table"], "icon": "bed"},
    {"id": "deluxe", "value": "Deluxe Double Occupancy + Food", "label": "Deluxe Double Occupancy + Mess", "amount": 95000, "occupancy": "Double (2 Students)", "food_plan": "Three Meals (Mess) + Snacks", "amenities": ["mess", "fan", "wifi", "attached_bath"], "icon": "king_bed"},
    {"id": "executive", "value": "Executive Single AC Suite + Food", "label": "Executive Single AC Suite + Mess", "amount": 135000, "occupancy": "Single Room", "food_plan": "Three Meals + Snacks + Room Service", "amenities": ["mess", "ac", "wifi", "laundry", "attached_bath", "tv"], "icon": "hotel"},
]

DEFAULT_PAYMENT_PLANS = [
    {"id": "bisemester", "value": "Bi-Semester Installments", "label": "Bi-Semester Installments (50% Per Term)"},
    {"id": "lumpsum", "value": "Lumpsum Single Payment", "label": "Full Lumpsum Annual Payment (100% Upfront)"},
    {"id": "quarterly", "value": "Quarterly Installments", "label": "Quarterly Installments (4 Equal Terms)"},
]

DEFAULT_CHARGES = [
    {"id": "exam_reg", "label": "Examination Registration Fee", "amount": 2500, "category": "Academic", "icon": "assignment", "mandatory": True},
    {"id": "lab_deposit", "label": "Lab Deposit (Refundable)", "amount": 5000, "category": "Academic", "icon": "science", "mandatory": False},
    {"id": "smart_card", "label": "Smart Card / College ID", "amount": 350, "category": "Administrative", "icon": "badge", "mandatory": True},
    {"id": "medical_ins", "label": "Student Medical Insurance", "amount": 1200, "category": "Welfare", "icon": "health_and_safety", "mandatory": True},
    {"id": "nss_fee", "label": "NSS / NCC Activity Fund", "amount": 800, "category": "Activity", "icon": "military_tech", "mandatory": False},
    {"id": "alumni_fund", "label": "Alumni Association Fund", "amount": 500, "category": "Alumni", "icon": "groups", "mandatory": False},
    {"id": "sports_kit", "label": "Sports Kit & Equipment Fee", "amount": 1500, "category": "Activity", "icon": "sports_soccer", "mandatory": False},
    {"id": "caution_dep", "label": "Caution Deposit (Refundable)", "amount": 3000, "category": "Administrative", "icon": "savings", "mandatory": False},
]


@router.get("/config/auxiliary")
async def get_auxiliary_config():
    """Return dynamic transport, hostel, and payment plan configurations from MongoDB."""
    try:
        db = get_db()
        col = db["fees_auxiliary_config"]
        doc = await asyncio.wait_for(col.find_one({"id": "main_config"}), timeout=1.0)
        if doc:
            doc.pop("_id", None)
            return {
                "transport_zones": doc.get("transport_zones", DEFAULT_TRANSPORT_ZONES),
                "hostel_types": doc.get("hostel_types", DEFAULT_HOSTEL_TYPES),
                "payment_plans": doc.get("payment_plans", DEFAULT_PAYMENT_PLANS),
            }
    except Exception:
        pass
    return {
        "transport_zones": DEFAULT_TRANSPORT_ZONES,
        "hostel_types": DEFAULT_HOSTEL_TYPES,
        "payment_plans": DEFAULT_PAYMENT_PLANS,
    }


@router.put("/config/auxiliary")
async def update_auxiliary_config(payload: dict):
    """Update dynamic transport, hostel, or payment plan configurations in MongoDB."""
    try:
        db = get_db()
        col = db["fees_auxiliary_config"]
        await col.update_one(
            {"id": "main_config"},
            {"$set": payload},
            upsert=True,
        )
        return {"message": "Auxiliary fee configuration updated successfully", "config": payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update auxiliary configuration: {e}")


@router.put("/config/auxiliary/transport/{item_id}")
async def update_transport_zone(item_id: str, payload: dict):
    """Update a single transport zone item within the auxiliary config."""
    try:
        db = get_db()
        col = db["fees_auxiliary_config"]
        doc = await col.find_one({"id": "main_config"})
        zones = (doc or {}).get("transport_zones", DEFAULT_TRANSPORT_ZONES)
        updated = False
        for i, zone in enumerate(zones):
            if zone.get("id") == item_id:
                zones[i] = {**zone, **{k: v for k, v in payload.items() if k != "id"}}
                updated = True
                break
        if not updated:
            raise HTTPException(status_code=404, detail=f"Transport zone '{item_id}' not found")
        await col.update_one(
            {"id": "main_config"},
            {"$set": {"transport_zones": zones}},
            upsert=True,
        )
        return {"message": f"Transport zone '{item_id}' updated", "zone": zones[[z["id"] for z in zones].index(item_id)]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update transport zone: {e}")


@router.put("/config/auxiliary/hostel/{item_id}")
async def update_hostel_type(item_id: str, payload: dict):
    """Update a single hostel type item within the auxiliary config."""
    try:
        db = get_db()
        col = db["fees_auxiliary_config"]
        doc = await col.find_one({"id": "main_config"})
        hostels = (doc or {}).get("hostel_types", DEFAULT_HOSTEL_TYPES)
        updated = False
        for i, hostel in enumerate(hostels):
            if hostel.get("id") == item_id:
                hostels[i] = {**hostel, **{k: v for k, v in payload.items() if k != "id"}}
                updated = True
                break
        if not updated:
            raise HTTPException(status_code=404, detail=f"Hostel type '{item_id}' not found")
        await col.update_one(
            {"id": "main_config"},
            {"$set": {"hostel_types": hostels}},
            upsert=True,
        )
        return {"message": f"Hostel type '{item_id}' updated", "hostel": hostels[[h["id"] for h in hostels].index(item_id)]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update hostel type: {e}")


# ── Charges & Miscellaneous Fee Config ──────────────────────────────────────

@router.get("/config/charges")
async def get_charges_config():
    """Return miscellaneous charge packages from MongoDB, falling back to defaults."""
    try:
        db = get_db()
        col = db["fees_charges_config"]
        doc = await asyncio.wait_for(col.find_one({"id": "main_charges"}), timeout=1.0)
        if doc and doc.get("charges"):
            return doc["charges"]
    except Exception:
        pass
    return DEFAULT_CHARGES


@router.put("/config/charges")
async def update_charges_config(payload: dict):
    """Save/update the miscellaneous charges list in MongoDB."""
    try:
        db = get_db()
        col = db["fees_charges_config"]
        charges = payload.get("charges", [])
        await col.update_one(
            {"id": "main_charges"},
            {"$set": {"id": "main_charges", "charges": charges, "updated_at": datetime.now().isoformat()}},
            upsert=True,
        )
        return {"message": "Charges configuration updated successfully", "count": len(charges)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update charges configuration: {e}")


# ── Departmental Fee Structures (Template Design per Department) ────────────

@router.get("/structures/department/{dept_name}")
async def get_department_fee_structure(dept_name: str):
    """Fetch stored fee structure design for a specific department."""
    try:
        db = get_db()
        col = db["department_fee_structures"]
        doc = await asyncio.wait_for(col.find_one({"department": dept_name}), timeout=1.5)
        if doc:
            doc.pop("_id", None)
            return doc
    except Exception:
        pass
    return None

@router.post("/structures")
async def save_department_fee_structure(payload: dict):
    """Save or update a department's fee structure design template in MongoDB."""
    try:
        db = get_db()
        col = db["department_fee_structures"]
        dept = payload.get("department")
        if not dept:
            raise HTTPException(status_code=400, detail="department name is required")
        
        payload["updated_at"] = datetime.now().isoformat()
        await col.update_one(
            {"department": dept},
            {"$set": payload},
            upsert=True,
        )
        return {"message": f"Fee structure for {dept} saved successfully", "structure": payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save fee structure: {e}")


# ── Auto-assign Record (used by enrollment flow) ────────────────────────────

@router.post("/assign-record")
async def assign_fee_record(payload: dict):
    """
    Directly insert a pre-computed fee record into the fees_structure collection.
    Used by the student enrollment wizard to auto-assign fees at admission time.
    """
    try:
        db = get_db()
        col = db["fees_structure"]
        student_id = payload.get("studentId") or payload.get("student_id")
        if not student_id:
            raise HTTPException(status_code=400, detail="studentId is required")

        record = {
            "id": payload.get("id", f"FEE-{int(datetime.now().timestamp())}"),
            "student_id": student_id,
            "studentId": student_id,
            "student_name": payload.get("studentName") or payload.get("student_name", ""),
            "studentName": payload.get("studentName") or payload.get("student_name", ""),
            "email": payload.get("email", ""),
            "course": payload.get("course", ""),
            "semester": payload.get("semester", "Semester 1"),
            "total_fee": float(payload.get("totalFee") or payload.get("total_fee") or 0),
            "totalFee": float(payload.get("totalFee") or payload.get("total_fee") or 0),
            "components": payload.get("components", {}),
            "options": payload.get("options", {}),
            "payment_status": "Pending",
            "status": "Pending",
            "paid_amount": 0,
            "paidAmount": 0,
            "assigned_date": datetime.now(),
            "assignedDate": datetime.now().isoformat(),
            "auto_assigned": payload.get("autoAssigned", True),
        }

        result = await col.insert_one(record)
        return {
            "message": "Fee record auto-assigned successfully",
            "id": str(result.inserted_id),
            "student_id": student_id,
            "total_fee": record["total_fee"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to auto-assign fee record: {e}")