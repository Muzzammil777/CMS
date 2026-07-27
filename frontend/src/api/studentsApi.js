import { API_BASE } from './apiBase';

export async function fetchStudents() {
  const res = await fetch(`${API_BASE}/students`);
  if (!res.ok) {
    throw new Error('Failed to fetch students from backend server.');
  }
  return res.json();
}

export async function fetchStudentById(id) {
  const res = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`Student with ID ${id} not found.`);
  }
  return res.json();
}

export async function createStudent(studentData) {
  const res = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || 'Failed to create student.');
  }
  return res.json();
}
