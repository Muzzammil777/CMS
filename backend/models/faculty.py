from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, date

class Qualification(BaseModel):
    degree: str
    institution: str
    year: int

class Publication(BaseModel):
    title: str
    year: int
    journal_link: Optional[str] = None

class OfficeHours(BaseModel):
    day: str
    start_time: str
    end_time: str

class Faculty(BaseModel):
    # Auto-generated employee ID like FAC-205
    employee_id: str = Field(alias="employeeId")
    name: str
    email: str
    phone: str = ""
    department_id: str = Field(alias="departmentId")
    designation: str = ""
    
    # Enhanced Profile
    qualifications: List[Qualification] = []
    specializations: List[str] = []
    office_location: str = ""
    office_hours: List[OfficeHours] = []
    research_interests: List[str] = []
    join_date: Optional[str] = None
    employment_status: str = "Active"  # Active, On-Leave, Terminated
    publications: List[Publication] = []
    contract_end_date: Optional[str] = None
    compliance_status: str = "Compliant"  # Compliant, Non-Compliant, Pending Review
    
    # Basic Payroll integration fields (can be expanded later)
    basic_salary: Optional[float] = Field(None, alias="basicSalary")
    
    # Newly added fields
    qualification: str = ""
    gender: str = ""
    dob: str = ""
    college: str = ""
    university: str = ""
    nationality: str = ""
    
    class Config:
        populate_by_name = True
