import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../api/apiBase';

const AdmissionContext = createContext();

export function AdmissionProvider({ children }) {
  const [studentApps, setStudentApps] = useState([]);
  const [facultyApps, setFacultyApps] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  //  Sanitize data
  const sanitizeStudent = (student) =>{
    if (!student) return student;
    return {
      ...student,
      course:
        typeof student.course === 'object'
          ? student.course?.course || student.course?.name || 'N/A'
          : student.course || 'N/A',
    };
  };

  //  Fetch Students
  const fetchStudentAdmissions = async () =>{
    try {
      const res = await fetch(`${API_BASE}/admissions/students`);
      if (res.ok) {
        const data = await res.json();
        setStudentApps(data.map((item) =>sanitizeStudent(item)));
      }
    } catch (err) {
      console.error(' Error fetching students:', err);
    }
  };

  //  Fetch Faculty
  const fetchFacultyAdmissions = async () =>{
    try {
      const res = await fetch(`${API_BASE}/admissions/faculty`);
      if (res.ok) {
        const data = await res.json();
        setFacultyApps(data.map((item) =>sanitizeStudent(item)));
      }
    } catch (err) {
      console.error(' Error fetching faculty:', err);
    }
  };

  //  Fetch Approved Students
  const fetchApprovedStudents = async () =>{
    try {
      await fetch(`${API_BASE}/admissions/purge-invalid-approved`, {
        method: 'DELETE',
      });

      const res = await fetch(`${API_BASE}/admissions/students/approved-for-fees`);

      if (res.ok) {
        const data = await res.json();
        setApprovedStudents(
          (data.approved_students || []).map((item) =>sanitizeStudent(item))
        );
      }
    } catch (err) {
      console.error(' Error fetching approved students:', err);
    }
  };

  //  INITIAL LOAD
  useEffect(() =>{
    const loadData = async () =>{
      setLoading(true);
      await Promise.all([
        fetchStudentAdmissions(),
        fetchFacultyAdmissions(),
        fetchApprovedStudents(),
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  //  Delete Student
  const deleteStudentApp = async (id) =>{
    try {
      await fetch(`${API_BASE}/admissions/${id}`, { method: 'DELETE' });
      fetchStudentAdmissions();
    } catch (err) {
      console.error(' Error deleting student:', err);
    }
  };

  //  Delete Faculty
  const deleteFacultyApp = async (id) =>{
    try {
      await fetch(`${API_BASE}/admissions/faculty/${id}`, { method: 'DELETE' });
      fetchFacultyAdmissions();
    } catch (err) {
      console.error(' Error deleting faculty:', err);
    }
  };

  //  Update Student Status
  const updateStudentStatus = async (id, status) =>{
    try {
      const endpoint =
        status === 'Approved'
          ? `${API_BASE}/admissions/approve/${id}`
          : `${API_BASE}/admissions/reject/${id}`;

      const response = await fetch(endpoint, { method: 'PUT' });
      
      if (!response.ok) {
        throw new Error(`Failed to update student status: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(` Student ${id} ${status}:`, result);

      // Refresh all data after status change
      await Promise.all([
        fetchStudentAdmissions(),
        fetchApprovedStudents(),
      ]);
      
      // Notify other parts of the app about the update
      if (status === 'Approved') {
        // Dispatch custom event to notify others (e.g., StudentsPage) to refresh
        window.dispatchEvent(new CustomEvent('studentApproved', { detail: { id, ...result } }));
      }
      
    } catch (err) {
      console.error(' Error updating student:', err);
      throw err;
    }
  };

  //  Update Faculty Status
  const updateFacultyStatus = async (id, status) =>{
    try {
      const endpoint =
        status === 'Approved'
          ? `${API_BASE}/admissions/faculty/approve/${id}`
          : `${API_BASE}/admissions/faculty/reject/${id}`;

      const response = await fetch(endpoint, { method: 'PUT' });
      
      if (!response.ok) {
        throw new Error(`Failed to update faculty status: ${response.statusText}`);
      }

      fetchFacultyAdmissions();
    } catch (err) {
      console.error(' Error updating faculty:', err);
      throw err;
    }
  };

  //  Add Faculty (NEW - important)
  const addFacultyApp = async (facultyData) =>{
    try {
      await fetch(`${API_BASE}/faculty/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facultyData),
      });

      fetchFacultyAdmissions(); // refresh
    } catch (err) {
      console.error(' Error adding faculty:', err);
    }
  };

  //  Add Student (optional)
  const addStudentApp = async (studentData) =>{
    try {
      await fetch(`${API_BASE}/admissions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });

      fetchStudentAdmissions();
    } catch (err) {
      console.error(' Error adding student:', err);
    }
  };

  //  Update Student Documents (NEW)
  const updateStudentDocuments = async (id, documents, status = null) => {
    try {
      const response = await fetch(`${API_BASE}/admissions/${id}/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update student documents: ${response.statusText}`);
      }

      await fetchStudentAdmissions();
    } catch (err) {
      console.error(' Error updating student documents:', err);
      throw err;
    }
  };

  const value = {
    studentApps,
    facultyApps,
    approvedStudents,
    loading,
    deleteStudentApp,
    deleteFacultyApp,
    updateStudentStatus,
    updateFacultyStatus,
    addFacultyApp,
    addStudentApp,
    updateStudentDocuments,
  };

  return (
    <AdmissionContext.Provider value={value}>{children}
    </AdmissionContext.Provider>);
}

export function useAdmission() {
  return useContext(AdmissionContext);
}