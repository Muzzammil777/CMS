// ─── Student Data ─────────────────────────────────────────
export const students = [];

// ─── Summary Stats ──────────────────────────────────────────────
export function getStudentStats() {
  const total = students.length;
  if (total === 0) {
    return { total: 0, active: 0, avgAttendance: 0, feeDefaulters: 0 };
  }
  const active = students.filter(s => s.status === 'Active').length;
  const avgAttendance = Math.round(students.reduce((sum, s) => sum + s.attendancePct, 0) / total);
  const feeDefaulters = students.filter(s => s.feeStatus !== 'Paid').length;
  return { total, active, avgAttendance, feeDefaulters };
}

export function getStudentById(id) {
  return students.find(s => s.id === id) || null;
}

export const departments = [
  'All',
  'Medical Laboratory Technology',
  'Operation Theatre & Anaesthesia Technology',
  'Radiography & Imaging Technology'
];

export const years = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year'];
