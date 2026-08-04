export const demoUsers = {
  student: { userId: 'STU-2024-1547', password: 'student123' },
  admin: { userId: 'ADM-0001', password: 'admin123' },
  hod: { userId: 'HOD-CS-001', password: 'hod123' },
  faculty: { userId: 'FAC-204', password: 'faculty123' },
  finance: { userId: 'FIN-880', password: 'finance123' },
};

export const cmsRoles = {
  student: {
    label: 'Student',
    name: 'Student Portal',
    team: 'Medical Laboratory Technology',
    focus: 'Academics',
    primaryAction: 'View Timetable',
    secondaryAction: 'Track Attendance',
    subtitle: 'Track academics, attendance, and upcoming exams.',
  },
  admin: {
    label: 'Admin',
    name: 'Administrator',
    team: 'Campus Administration',
    focus: 'Operations',
    primaryAction: 'View Fees',
    secondaryAction: 'Manage Department',
    subtitle: 'Manage students, faculty, and departments.',
  },
  hod: {
    label: 'HOD',
    name: 'Head of Department',
    team: 'Computer Science Department',
    focus: 'Department Management',
    primaryAction: 'Manage Department',
    secondaryAction: 'View Analytics',
    subtitle: 'Manage department students, faculty, academics, fees, and analytics.',
  },
  faculty: {
    label: 'Faculty',
    name: 'Faculty Member',
    team: 'Dindigul Shifa College of Health Sciences',
    focus: 'Teaching',
    primaryAction: 'Mark Attendance',
    secondaryAction: 'Publish Internal Marks',
    subtitle: 'Handle classes, evaluations, timetables, and student progress.',
  },
  finance: {
    label: 'Finance',
    name: 'Arun Kumar',
    team: 'Accounts & Billing',
    focus: 'Billing',
    primaryAction: 'Manage Fees',
    secondaryAction: 'Run Payroll',
    subtitle: 'Monitor fees, payroll, and financial compliance.',
  },
};

export const roleMenuGroups = {
  student: [
    {
      title: 'Overview',
      items: ['Dashboard'],
    },
    {
      title: 'Administration',
      items: ['Fees', 'Invoices'],
    },
    {
      title: 'Academics',
      items: ['Exams', 'Timetable', 'Attendance', 'Placement'],
    },
    {
      title: 'Intelligence',
      items: ['Settings'],
    },
  ],
  admin: [
    {
      title: 'Overview',
      items: ['Dashboard', 'Students', 'Faculty', 'Department'],
    },
    {
      title: 'Administration',
      items: ['Admission', 'Fees', 'Invoices'],
    },
    {
      title: 'Academics',
      items: ['Exams', 'Timetable', 'Attendance', 'Placement', 'Facility'],
    },
    {
      title: 'Intelligence',
      items: ['Analytics', 'Settings'],
    },
  ],
  hod: [
    {
      title: 'Overview',
      items: ['Dashboard', 'Students', 'Faculty', 'Department'],
    },
    {
      title: 'Administration',
      items: ['Admission', 'Fees', 'Invoices'],
    },
    {
      title: 'Academics',
      items: ['Exams', 'Timetable', 'Attendance', 'Placement', 'Facility'],
    },
    {
      title: 'Intelligence',
      items: ['Analytics', 'Settings'],
    },
  ],
  faculty: [
    {
      title: 'Overview',
      items: ['Dashboard', 'Students', 'Department'],
    },
    {
      title: 'Academics',
      items: ['Exams', 'Timetable', 'Attendance', 'Placement', 'Facility'],
    },
    {
      title: 'Intelligence',
      items: ['Settings'],
    },
  ],
  finance: [
    {
      title: 'Overview',
      items: ['Dashboard'],
    },
    {
      title: 'Administration',
      items: ['Fees', 'Payroll'],
    },
    {
      title: 'Academics',
      items: ['Attendance'],
    },
    {
      title: 'Intelligence',
      items: ['Analytics', 'Settings'],
    },
  ],
};

export function getValidRole(role) {
  return cmsRoles[role] ? role : 'student';
}
