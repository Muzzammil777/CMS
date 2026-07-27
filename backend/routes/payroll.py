from typing import List
from copy import deepcopy
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from backend.db import get_db
from backend.dev_store import DEV_STORE
from backend.schemas.payroll import PayrollRecord, PayrollUpdate
from backend.utils.mongo import parse_object_id, serialize_doc
from backend.utils.invoice_utils import create_invoice_from_payroll
from backend.utils.notify import send_notification

router = APIRouter(prefix="/api/payroll", tags=["payroll"])


def _seed_dev_payroll() -> None:
    if DEV_STORE.get("staff") and DEV_STORE.get("payroll"):
        return

    if not DEV_STORE.get("staff"):
        DEV_STORE["staff"] = [
            {
                "staffId": "FAC-204",
                "staffName": "Dr. Rajesh Iyer",
                "designation": "Professor",
                "department": "Computer Science",
                "category": "Teaching",
                "basicSalary": 75000,
                "hra": 15000,
                "allowance": 5000,
                "pf": 3000,
                "tax": 3500,
            },
            {
                "staffId": "FAC-201",
                "staffName": "Dr. Ravi Kumar",
                "designation": "Associate Professor",
                "department": "Computer Science",
                "category": "Teaching",
                "basicSalary": 68000,
                "hra": 12000,
                "allowance": 4500,
                "pf": 2800,
                "tax": 3000,
            },
            {
                "staffId": "ADM-105",
                "staffName": "Meena S",
                "designation": "Accountant",
                "department": "Administration",
                "category": "Non-Teaching",
                "basicSalary": 42000,
                "hra": 9000,
                "allowance": 3000,
                "pf": 2000,
                "tax": 1500,
            },
        ]

    if not DEV_STORE.get("payroll"):
        DEV_STORE["payroll"] = [
            {
                "id": f"pay_{uuid4().hex[:10]}",
                "staffName": "Dr. Rajesh Iyer",
                "staffId": "FAC-204",
                "designation": "Professor",
                "department": "Computer Science",
                "category": "Teaching",
                "payMonth": "Current Month",
                "payPeriodDetailed": "March 2026",
                "basicSalary": 75000,
                "hra": 15000,
                "allowance": 5000,
                "bonus": 0,
                "pf": 3000,
                "tax": 3500,
                "esi": 0,
                "professionalTax": 0,
                "tds": 0,
                "grossPay": 95000,
                "deductions": 6500,
                "netPay": 88500,
                "status": "Paid",
            }
        ]


def normalize_payroll_document(document):
    record = serialize_doc(document)
    if not record:
        return record

    if "staffType" in record and "category" not in record:
        record["category"] = record["staffType"]

    if "role" in record and "designation" not in record:
        record["designation"] = record["role"]

    if "name" in record and "staffName" not in record:
        record["staffName"] = record["name"]

    return record


@router.get("")
async def get_all_payroll():
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_payroll()
            return deepcopy(DEV_STORE["payroll"])
        raise

    records = []
    async for record in db["payroll"].find().sort("_id", -1):
        records.append(normalize_payroll_document(record))
    return records


@router.post("", status_code=201)
async def create_payroll(record: PayrollRecord):
    data = record.model_dump()

    if not data.get("name"):
        data["name"] = data.get("staffName")

    if not data.get("staffType"):
        data["staffType"] = data.get("category")

    if not data.get("role"):
        data["role"] = data.get("designation")

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_payroll()
            payload = {"id": f"pay_{uuid4().hex[:10]}", **data}
            DEV_STORE["payroll"].insert(0, payload)
            return deepcopy(payload)
        raise

    result = await db["payroll"].insert_one(data)
    created = await db["payroll"].find_one({"_id": result.inserted_id})
    
    # Automatically generate invoice
    await create_invoice_from_payroll(db, str(result.inserted_id), created)

    # Notify the faculty member about salary credit
    staff_id = data.get("staffId") or data.get("staff_id")
    net_pay = data.get("netPay") or data.get("net_pay") or 0
    staff_name = data.get("staffName") or data.get("name") or "Staff"
    pay_period = data.get("payPeriodDetailed") or data.get("payMonth") or "This Month"
    if staff_id:
        await send_notification(
            db=db,
            receiver_role="faculty",
            event_key="salaryCredit",
            title="Salary Credited",
            message=(
                f"Your salary of ₹{net_pay:,.0f} for {pay_period} has been processed "
                f"and credited to your account."
            ),
            sender_role="admin",
            module="Finance",
            priority="High",
            related_data={"staffId": staff_id, "netPay": net_pay, "period": pay_period},
            receiver_user_id=staff_id,
        )
    
    return normalize_payroll_document(created)


@router.post("/batch", status_code=201)
async def create_payroll_batch(records: List[PayrollRecord]):
    if not records:
        raise HTTPException(status_code=400, detail="Empty list provided")

    docs = [record.model_dump() for record in records]

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_payroll()
            inserted = []
            for doc in docs:
                payload = {"id": f"pay_{uuid4().hex[:10]}", **doc}
                DEV_STORE["payroll"].insert(0, payload)
                inserted.append(payload)
            return deepcopy(inserted)
        raise

    result = await db["payroll"].insert_many(docs)

    inserted = []
    async for record in db["payroll"].find({"_id": {"$in": result.inserted_ids}}):
        # Automatically generate invoices
        await create_invoice_from_payroll(db, str(record["_id"]), record)
        inserted.append(normalize_payroll_document(record))

    return inserted


@router.put("/{record_id}")
async def update_payroll(record_id: str, update: PayrollUpdate):
    update_data = {key: value for key, value in update.model_dump().items() if value is not None}

    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_payroll()
            target = next((item for item in DEV_STORE["payroll"] if item.get("id") == record_id), None)
            if not target:
                raise HTTPException(status_code=404, detail="Record not found")
            target.update(update_data)
            return deepcopy(target)
        raise

    oid = parse_object_id(record_id)

    result = await db["payroll"].find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )

    if not result:
        raise HTTPException(status_code=404, detail="Record not found")

    return normalize_payroll_document(result)


@router.delete("/{record_id}")
async def delete_payroll(record_id: str):
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_payroll()
            before = len(DEV_STORE["payroll"])
            DEV_STORE["payroll"] = [item for item in DEV_STORE["payroll"] if item.get("id") != record_id]
            if len(DEV_STORE["payroll"]) == before:
                raise HTTPException(status_code=404, detail="Record not found")
            return {"message": "Record deleted"}
        raise

    oid = parse_object_id(record_id)
    result = await db["payroll"].delete_one({"_id": oid})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")

    return {"message": "Record deleted"}


@router.get("/staff-details")
async def get_staff_details():
    try:
        db = get_db()
    except HTTPException as error:
        if error.status_code == 503:
            _seed_dev_payroll()
            return deepcopy(DEV_STORE["staff"])
        raise

    staff = []
    async for member in db["staff_Details"].find():
        staff.append(serialize_doc(member))
    return staff
