from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class FacultyLeave(BaseModel):
    faculty_id: str = Field(alias="facultyId")
    leave_type: str # Sick, Casual, Academic, Other
    start_date: str
    end_date: str
    reason: str
    status: str = "Pending" # Pending, Approved, Rejected
    approved_by: Optional[str] = None
    applied_on: datetime = Field(default_factory=datetime.utcnow)
    remarks: Optional[str] = None


class LeaveRequest(BaseModel):
    faculty_id: Optional[str] = Field(default=None, alias="facultyId")
    leave_type: str = Field(alias="leaveType")
    start_date: str = Field(alias="startDate")
    end_date: str = Field(alias="endDate")
    reason: str
    no_of_days: Optional[int] = Field(default=None, alias="noOfDays")
    status: str = "Pending"
    applied_on: datetime = Field(default_factory=datetime.now, alias="appliedOn")
    approved_by: Optional[str] = Field(default=None, alias="approvedBy")
    approved_date: Optional[datetime] = Field(default=None, alias="approvedDate")
    remarks: Optional[str] = None
    
    class Config:
        populate_by_name = True


class LeaveBalance(BaseModel):
    faculty_id: str = Field(alias="facultyId")
    academic_year: str = Field(alias="academicYear")
    casual_leave: int = Field(default=12, alias="casualLeave")
    sick_leave: int = Field(default=10, alias="sickLeave")
    academic_leave: int = Field(default=5, alias="academicLeave")
    maternity_leave: int = Field(default=180, alias="maternityLeave")
    sabbatical_leave: int = Field(default=0, alias="sabbaticalLeave")
    casual_used: int = Field(default=0, alias="casualUsed")
    sick_used: int = Field(default=0, alias="sickUsed")
    academic_used: int = Field(default=0, alias="academicUsed")
    maternity_used: int = Field(default=0, alias="maternityUsed")
    sabbatical_used: int = Field(default=0, alias="sabbaticalUsed")
    created_date: datetime = Field(default_factory=datetime.now, alias="createdDate")
    updated_date: datetime = Field(default_factory=datetime.now, alias="updatedDate")
    
    class Config:
        populate_by_name = True
