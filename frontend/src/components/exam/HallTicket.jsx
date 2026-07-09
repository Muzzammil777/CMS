import { useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function HallTicket({ exam, studentInfo, subjects = [], onClose }) {
  const currentDate = useMemo(() => new Date().toLocaleDateString(), []);

  const resolvedSemester = studentInfo.semester || exam?.semester || 'N/A';
  const resolvedDepartment = studentInfo.department || exam?.department || 'Computer Science';
  const normalizedSubjects = subjects.length > 0
    ? subjects
    : exam
      ? [{
          code: exam.code || '-',
          name: exam.name || '-',
          credits: exam.credits ?? 4,
          semester: exam.semester || resolvedSemester,
        }]
      : [];

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const rollNo = studentInfo.rollNo || studentInfo.id || 'N/A';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('MIT CONNECT - EXAMINATION HALL TICKET', 105, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date of Issue: ${currentDate}`, 14, 24);

    doc.setFont('helvetica', 'bold');
    doc.text('Student Details', 14, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${studentInfo.name || 'N/A'}`, 14, 38);
    doc.text(`Roll No: ${rollNo}`, 14, 44);
    doc.text(`Department: ${resolvedDepartment}`, 14, 50);
    doc.text(`Semester: ${resolvedSemester}`, 14, 56);

    let startTableY = 64;
    if (exam?.room) {
      doc.text(`Exam Room / Venue: ${exam.room}`, 14, startTableY - 2);
      startTableY += 6;
    }
    if (exam?.seatNumber) {
      doc.text(`Assigned Seat: ${exam.seatNumber}`, 14, startTableY - 2);
      startTableY += 6;
    }

    autoTable(doc, {
      startY: startTableY,
      head: [['S.No', 'Subject Code', 'Subject Name', 'Credits', 'Semester']],
      body: normalizedSubjects.map((subject, index) => [
        index + 1,
        subject.code || '-',
        subject.name || '-',
        subject.credits ?? 4,
        subject.semester || resolvedSemester,
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [17, 98, 212] },
      theme: 'striped',
      margin: { left: 14, right: 14 },
    });

    const finalY = doc.lastAutoTable?.finalY || 70;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('This is a computer-generated hall ticket and does not require signature.', 14, Math.min(finalY + 10, 285));

    doc.save(`HallTicket-${rollNo}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between print:hidden">
          <h3 className="text-xl font-bold text-slate-900">Hall Ticket</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-2 bg-[#6d28d9] text-white rounded-lg hover:bg-[#4c1d95] transition-colors text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400">close</span>
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6 print:p-12">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">COLLEGE MANAGEMENT SYSTEM</h1>
            <p className="text-sm text-slate-600 mt-1">Department of {resolvedDepartment}</p>
            <h2 className="text-xl font-bold text-[#6d28d9] mt-3">EXAMINATION HALL TICKET</h2>
          </div>

          {/* Hall Ticket Meta */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Ticket Type</p>
              <p className="text-sm font-bold text-slate-900">Semester Hall Ticket</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Academic Year</p>
              <p className="text-sm font-bold text-slate-900">2025-2026</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Semester</p>
              <p className="text-sm font-bold text-slate-900">Semester {resolvedSemester}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Date of Issue</p>
              <p className="text-sm font-bold text-slate-900">{currentDate}</p>
            </div>
            {exam?.room && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Exam Room / Venue</p>
                <p className="text-sm font-bold text-slate-900">{exam.room}</p>
              </div>
            )}
            {exam?.seatNumber && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Assigned Seat</p>
                <p className="text-sm font-bold text-[#6d28d9]">{exam.seatNumber}</p>
              </div>
            )}
          </div>

          {/* Student Information */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase border-b border-slate-300 pb-2">
              Student Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Student Name</p>
                <p className="text-sm font-bold text-slate-900">{studentInfo.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Roll Number</p>
                <p className="text-sm font-bold text-slate-900">{studentInfo.rollNo || studentInfo.id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Department</p>
                <p className="text-sm font-bold text-slate-900">{resolvedDepartment}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Semester</p>
                <p className="text-sm font-bold text-slate-900">Semester {resolvedSemester}</p>
              </div>
            </div>
          </div>

          {/* Enrolled Subjects */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase border-b border-slate-300 pb-2">
              Enrolled Subjects
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">S.No</th>
                    <th className="px-4 py-3">Subject Code</th>
                    <th className="px-4 py-3">Subject Name</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Semester</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {normalizedSubjects.length === 0 && (
                    <tr className="text-sm text-slate-500">
                      <td className="px-4 py-4 text-center" colSpan={5}>No enrolled subjects found.</td>
                    </tr>
                  )}
                  {normalizedSubjects.map((subject, index) => (
                    <tr key={`${subject.code}-${index}`} className="text-sm text-slate-700">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-[#6d28d9]">{subject.code || '-'}</td>
                      <td className="px-4 py-3">{subject.name || '-'}</td>
                      <td className="px-4 py-3">{subject.credits ?? 4}</td>
                      <td className="px-4 py-3">{subject.semester || resolvedSemester}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase border-b border-slate-300 pb-2">
              Important Instructions
            </h3>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex gap-2">
                <span className="text-[#6d28d9]">•</span>
                <span>Students must report to the examination hall 15 minutes before the scheduled time.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#6d28d9]">•</span>
                <span>Carry this hall ticket along with your college ID card to the examination hall.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#6d28d9]">•</span>
                <span>Mobile phones and electronic devices are strictly prohibited in the examination hall.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#6d28d9]">•</span>
                <span>Use of unfair means will lead to cancellation of the examination.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#6d28d9]">•</span>
                <span>Follow all instructions given by the invigilator during the examination.</span>
              </li>
            </ul>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end pt-8 border-t border-slate-300">
            <div>
              <p className="text-xs text-slate-500 mb-8">Student Signature</p>
              <div className="border-b border-slate-300 w-40"></div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-8">Controller of Examinations</p>
              <div className="border-b border-slate-300 w-40"></div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pt-4">
            <p>This is a computer-generated hall ticket. No signature is required.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
