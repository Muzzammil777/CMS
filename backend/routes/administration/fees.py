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