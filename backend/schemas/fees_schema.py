from pydantic import BaseModel


class FeeBreakdown(BaseModel):
    semester_fee: int
    book_fee: int
    exam_fee: int
    hostel_fee: int
    misc_fee: int


class AssignFee(BaseModel):
    student_id: str
    student_name: str
    course: str
    semester: str
    first_graduate: bool = False
    hostel_required: bool = False