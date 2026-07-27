from pydantic import BaseModel
from typing import Optional


class PersonalInfo(BaseModel):
    full_name: str
    gender: str
    dob: str
    email: str
    phone: str
    student_id: str
    address: str
    city: str
    state: str
    pincode: str
    guardianName: Optional[str] = None
    guardianPhone: Optional[str] = None
    relationship: Optional[str] = None
    guardianEmail: Optional[str] = None
    guardianOccupation: Optional[str] = None



class AcademicInfo(BaseModel):
    previous_school: str
    board: str
    year_of_passing: int
    marks_percentage: float


class CourseInfo(BaseModel):
    category: str
    course: str


class Accommodation(BaseModel):
    type: str
    room_type: Optional[str] = None


class AdmissionDocuments(BaseModel):
    passport_photo: Optional[str] = None
    aadhaar_card: Optional[str] = None
    marksheet: Optional[str] = None
    transfer_certificate: Optional[str] = None


class PaymentInfo(BaseModel):
    application_fee: float = 500
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    payment_datetime: Optional[str] = None
    status: str = "Pending"


class AdmissionCreate(BaseModel):
    role: str
    personal: PersonalInfo
    academic: AcademicInfo
    course: CourseInfo
    quota: str
    accommodation: Accommodation
    documents: Optional[AdmissionDocuments] = None
    payment: Optional[PaymentInfo] = None
    payment_status: Optional[str] = None