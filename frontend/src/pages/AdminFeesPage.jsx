import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { PageContainer, StatsSection, Pagination, TableSkeleton } from '../components/common';
import { useAdmission } from '../context/AdmissionContext';
import { getUserSession } from '../auth/sessionController';
import { listFees, assignFee, deleteFeeAssignment } from '../api/feesApi';
import { createInvoice } from '../api/invoicesApi';
import { fetchStudents } from '../api/studentsApi';

export default function AdminFeesPage() {
  const session = getUserSession();
  const { approvedStudents } = useAdmission();
  const [feeAssignments, setFeeAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedEnrolledStudentId, setSelectedEnrolledStudentId] = useState('');
  const [expandedFeeId, setExpandedFeeId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(3);
  const [assignFormData, setAssignFormData] = useState({
    semester: '',
    course: '',
    isFirstGraduate: false,
    needsHostel: false,
    isAcHostel: false,
  });

  // Fetch enrolled students from backend
  useEffect(() => {
    fetchStudents()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setEnrolledStudents(list.filter((s) => s.status?.toLowerCase() === 'active' || !s.status));
      })
      .catch((err) => console.error('Failed to load enrolled students:', err));
  }, []);

  // Fetch fee assignments from backend
  const fetchFees = useCallback(async () =>{
    try {
      const data = await listFees();
      setFeeAssignments(data);
    } catch (err) {
      console.error('Failed to fetch fee assignments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() =>{
    fetchFees();
  }, [fetchFees]);

  const studentsWithoutFees = useMemo(() =>{
    return approvedStudents.filter(
      (student) =>!feeAssignments.some((fee) =>fee.applicationId === student.id)
    );
  }, [approvedStudents, feeAssignments]);

  const calculateFees = (semester, isFirstGraduate, needsHostel, isAcHostel) =>{
    const semesterFee = isFirstGraduate ? 85000 : 110000;
    const bookFee = 3950;
    const examFee = 250;
    const hostelFee = needsHostel
      ? isAcHostel
        ? 55000 + 60000
        : 55000 + 30000
      : 0;
    const miscFee = 10000;

    return {
      semesterFee,
      bookFee,
      examFee,
      hostelFee,
      miscFee,
      totalFee: semesterFee + bookFee + examFee + hostelFee + miscFee,
    };
  };

  const handleAssignClick = (student) =>{
    setSelectedStudent(student);
    setSelectedEnrolledStudentId('');
    setShowAssignModal(true);
  };

  const handleConfirmAssignFee = async () => {
    if (!selectedStudent || !assignFormData.semester) {
      alert('Please fill required fields');
      return;
    }

    if (!selectedEnrolledStudentId) {
      alert('Please select an enrolled student to assign the fee to');
      return;
    }

    // Get selected enrolled student details
    const enrolledStudent = enrolledStudents.find(
      (s) => (s.id || s.rollNumber) === selectedEnrolledStudentId
    );

    const payload = {
      student_id: selectedEnrolledStudentId,
      student_name: enrolledStudent?.name || selectedEnrolledStudentId,
      course: assignFormData.course || enrolledStudent?.department || selectedStudent.course || '',
      semester: assignFormData.semester,
      first_graduate: assignFormData.isFirstGraduate,
      hostel_required: assignFormData.needsHostel,
    };

    try {
      await assignFee(payload);
      await fetchFees();
      setShowAssignModal(false);
      setSelectedStudent(null);
      setSelectedEnrolledStudentId('');
      setAssignFormData({
        semester: '',
        course: '',
        isFirstGraduate: false,
        needsHostel: false,
        isAcHostel: false,
      });
      alert('Fee assigned successfully!');
    } catch (err) {
      console.error('Failed to assign fee:', err);
      alert('Failed to assign fee: ' + err.message);
    }
  };

  const handleDeleteClick = (assignment) =>{
    setDeleteConfirm(assignment);
    setDeleteReason('');
  };

  const handleConfirmDelete = async () =>{
    if (!deleteReason.trim()) {
      alert('Please provide a deletion reason');
      return;
    }

    try {
      await deleteFeeAssignment(deleteConfirm.id);
      await fetchFees();
      setDeleteConfirm(null);
      setDeleteReason('');
      alert('Fee assignment deleted successfully');
    } catch (err) {
      console.error('Failed to delete fee:', err);
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleGenerateInvoice = async (assignment) =>{
    const invoice = {
      invoice_id: `BILL${Date.now()}`,
      student_id: assignment.studentId,
      student_name: assignment.studentName,
      course: assignment.course,
      semester: assignment.semester,
      items: [
        { description: 'Semester Fee', amount: assignment.semesterFee },
        { description: 'Book Fee', amount: assignment.bookFee },
        { description: 'Exam Fee', amount: assignment.examFee },
      ],
      total: assignment.totalFee,
      payment_status: 'Pending',
      generated_from: assignment.id,
    };

    if (assignment.hostelFee >0) {
      invoice.items.push({ description: 'Hostel Fee', amount: assignment.hostelFee });
    }
    if (assignment.miscFee >0) {
      invoice.items.push({ description: 'Misc Fee', amount: assignment.miscFee });
    }

    try {
      const saved = await createInvoice(invoice);
      alert(`Invoice ${saved.invoiceId} generated successfully!`);
    } catch (err) {
      console.error('Failed to generate invoice:', err);
      alert('Failed to generate invoice: ' + err.message);
    }
  };

  const stats = useMemo(() =>{
    const totalAssigned = feeAssignments.length;
    const paidCount = feeAssignments.filter((fee) =>fee.paymentStatus?.toLowerCase() === 'paid').length;
    const processingCount = feeAssignments.filter((fee) =>fee.paymentStatus?.toLowerCase() === 'processing').length;
    const pendingCount = feeAssignments.filter((fee) =>fee.paymentStatus?.toLowerCase() === 'pending').length;
    const totalRevenue = feeAssignments
      .filter((fee) =>fee.paymentStatus?.toLowerCase() === 'paid')
      .reduce((sum, fee) =>sum + (fee.totalFee || 0), 0);

    return { totalAssigned, paidCount, processingCount, pendingCount, totalRevenue };
  }, [feeAssignments]);

  return (
    <Layout title="Fee Management"><PageContainer>{/* Statistics Cards */}
        <StatsSection stats={[
          { value: stats.totalAssigned, label: 'Total Assigned', icon: 'assignment' },
          { value: stats.paidCount, label: 'Paid Fees', icon: 'check_circle' },
          { value: stats.processingCount, label: 'In Processing', icon: 'sync' },
          { value: stats.pendingCount, label: 'Pending Fees', icon: 'schedule' },
          { value: `₹${stats.totalRevenue.toLocaleString()}`, label: 'Total Revenue', icon: 'trending_up' },
        ]} />{/* All Fee Assignments Table */}
        <div><div className="mb-6"><h2 className="text-lg font-bold text-gray-800">All Fee Assignments</h2></div>
          
          {loading ? (
            <TableSkeleton cols={8} rows={6} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto"><table className="w-full text-left min-w-[800px]"><thead><tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200"><th className="px-6 py-4">Student Info</th><th className="px-6 py-4">Student ID</th><th className="px-6 py-4">Course</th><th className="px-6 py-4">Semester</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Assigned Date</th><th className="px-6 py-4 text-center">Actions</th></tr></thead><tbody className="divide-y divide-slate-50">{feeAssignments.length === 0 ? (
                  <tr><td colSpan={8} className="px-10 py-24 text-center text-slate-400 bg-slate-50/30"><div className="flex flex-col items-center"><span className="material-symbols-outlined text-6xl mb-4 opacity-10 text-slate-900">receipt_long
                        </span><p className="text-base font-bold text-slate-500">No fee assignments yet</p><p className="text-xs font-medium text-slate-400 mt-1">Start by assigning fees to approved students</p></div></td></tr>) : (
                  feeAssignments.slice((currentPage-1)*pageSize, currentPage*pageSize).map((assignment) =>(
                    <React.Fragment key={assignment.id}><tr className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4"><div><p className="font-semibold text-slate-900 text-sm">{assignment.studentName}</p><p className="text-xs text-slate-500">{assignment.applicationId}</p></div></td><td className="px-6 py-4"><span className="text-sm font-medium text-slate-700">{assignment.studentId}</span></td><td className="px-6 py-4"><span className="text-sm text-slate-600">{assignment.course}</span></td><td className="px-6 py-4"><span className="text-sm text-slate-600">{assignment.semester}</span></td><td className="px-6 py-4"><span className="text-sm font-bold text-orange-600">₹{Number(assignment.totalFee).toLocaleString()}</span></td><td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                            assignment.paymentStatus?.toLowerCase() === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : assignment.paymentStatus?.toLowerCase() === 'processing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                          }`}>{assignment.paymentStatus ? assignment.paymentStatus.charAt(0).toUpperCase() + assignment.paymentStatus.slice(1) : 'Pending'}
                          </span></td><td className="px-6 py-4"><span className="text-sm text-slate-600">{assignment.assignedDate}</span></td><td className="px-6 py-4"><div className="flex items-center justify-center gap-2"><button
                              onClick={() =>setExpandedFeeId(expandedFeeId === assignment.id ? null : assignment.id)}
                              className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-slate-900"
                              title="View Details"
                            ><span className="material-symbols-outlined text-lg">{expandedFeeId === assignment.id ? 'expand_less' : 'expand_more'}
                              </span></button><button
                              onClick={() =>handleGenerateInvoice(assignment)}
                              className="p-2 hover:bg-orange-100 rounded-lg transition text-orange-600 hover:text-orange-700"
                              title="Generate Invoice"
                            ><span className="material-symbols-outlined text-lg">receipt</span></button><button
                              onClick={() =>handleDeleteClick(assignment)}
                              className="p-2 hover:bg-red-100 rounded-lg transition text-red-600 hover:text-red-700"
                              title="Delete"
                            ><span className="material-symbols-outlined text-lg">delete</span></button></div></td></tr>{/* Expandable Row - Fee Breakdown */}
                      {expandedFeeId === assignment.id && (
                        <tr className="bg-slate-50 hover:bg-slate-50"><td colSpan={8} className="px-6 py-6"><div className="space-y-4"><h4 className="font-bold text-slate-900">Fee Breakdown</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-slate-600">Semester Fee:</span><span className="font-semibold text-slate-900">₹{Number(assignment.semesterFee).toLocaleString()}</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">Book Fee:</span><span className="font-semibold text-slate-900">₹{Number(assignment.bookFee).toLocaleString()}</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">Exam Fee:</span><span className="font-semibold text-slate-900">₹{Number(assignment.examFee).toLocaleString()}</span></div>{Number(assignment.hostelFee) >0 && (
                                    <div className="flex justify-between text-sm"><span className="text-slate-600">Hostel Fee:</span><span className="font-semibold text-slate-900">₹{Number(assignment.hostelFee).toLocaleString()}</span></div>)}
                                  {Number(assignment.miscFee) >0 && (
                                    <div className="flex justify-between text-sm"><span className="text-slate-600">Miscellaneous Fee:</span><span className="font-semibold text-slate-900">₹{Number(assignment.miscFee).toLocaleString()}</span></div>)}
                                </div><div className="bg-white rounded-lg border border-slate-200 p-4"><div className="flex justify-between items-center"><span className="font-bold text-slate-900">Total Amount</span><span className="text-lg font-bold text-orange-600">₹{Number(assignment.totalFee).toLocaleString()}</span></div></div></div></div></td></tr>)}
                    </React.Fragment>))
                )}
              </tbody></table>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.max(1, Math.ceil(feeAssignments.length / pageSize))}
                onPageChange={setCurrentPage}
                totalItems={feeAssignments.length}
                pageSize={pageSize}
                onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
              />
            </div>
          )}
        </div>

        {/* Students Awaiting Fee Assignment */}
        {studentsWithoutFees.length >0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto"><div className="px-6 py-4 bg-slate-50 border-b border-slate-200"><h2 className="text-lg font-bold text-slate-900">Students Awaiting Fee Assignment ({studentsWithoutFees.length})
              </h2></div><table className="w-full text-left min-w-[700px]"><thead><tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200"><th className="px-6 py-4">Student Info</th><th className="px-6 py-4">Application ID</th><th className="px-6 py-4">Course</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-center">Action</th></tr></thead><tbody className="divide-y divide-slate-50">{studentsWithoutFees.map((student) =>(
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4"><div><p className="font-semibold text-slate-900 text-sm">{student.name || student.fullName}</p></div></td><td className="px-6 py-4"><span className="text-sm font-medium text-slate-700">{student.id}</span></td><td className="px-6 py-4"><span className="text-sm text-slate-600">{student.course}</span></td><td className="px-6 py-4"><span className="text-sm text-slate-600">{student.email}</span></td><td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 inline-block">Approved
                      </span></td><td className="px-6 py-4"><div className="flex items-center justify-center"><button
                          onClick={() =>handleAssignClick(student)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
                        ><span className="material-symbols-outlined text-lg">add</span>Assign Fee
                        </button></div></td></tr>))}
              </tbody></table></div>)}
      </PageContainer>{/* Assign Fee Modal */}
      {showAssignModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto"><h2 className="text-2xl font-bold mb-6">Assign Fee for {selectedStudent.name || selectedStudent.fullName}
            </h2><div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"><p className="text-sm text-gray-600"><span className="font-semibold">Application ID:</span> {selectedStudent.id}</p><p className="text-sm text-gray-600"><span className="font-semibold">Course:</span> {selectedStudent.course}</p></div>
            
            {/* Select Enrolled Student */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Enrolled Student * <span className="text-red-500">(Required)</span></label>
              <p className="text-xs text-gray-500 mb-3">Choose the student from the enrolled list to assign this fee to.</p>
              <select
                value={selectedEnrolledStudentId}
                onChange={(e) => setSelectedEnrolledStudentId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
              >
                <option value="">-- Select Enrolled Student --</option>
                {enrolledStudents.map((s) => {
                  const sid = s.id || s.rollNumber;
                  return <option key={sid} value={sid}>{s.name} — {sid} ({s.department || s.department_id || 'N/A'})</option>;
                })}
              </select>
              {selectedEnrolledStudentId && (() => {
                const es = enrolledStudents.find((s) => (s.id || s.rollNumber) === selectedEnrolledStudentId);
                return es ? <p className="text-xs text-green-700 mt-2 bg-green-50 p-2 rounded">Selected: <strong>{es.name}</strong> · Sem {es.semester} · {es.department || es.department_id}</p> : null;
              })()}
            </div>

            <div className="space-y-4 mb-8"><div><label className="block text-sm font-medium text-gray-700 mb-2">Semester *
                </label><select
                  value={assignFormData.semester}
                  onChange={(e) =>setAssignFormData({
                      ...assignFormData,
                      semester: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                ><option value="">Select Semester</option>{['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'].map(
                    (sem) =>(
                      <option key={sem} value={sem}>{sem}
                      </option>)
                  )}
                </select></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Course
                </label><input
                  type="text"
                  value={assignFormData.course}
                  onChange={(e) =>setAssignFormData({
                      ...assignFormData,
                      course: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="Enter course name"
                /></div><div className="space-y-3"><label className="flex items-center gap-2 cursor-pointer"><input
                    type="checkbox"
                    checked={assignFormData.isFirstGraduate}
                    onChange={(e) =>setAssignFormData({
                        ...assignFormData,
                        isFirstGraduate: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded"
                  /><span className="text-gray-700">First Graduate (₹85,000 semester fee)</span></label><label className="flex items-center gap-2 cursor-pointer"><input
                    type="checkbox"
                    checked={assignFormData.needsHostel}
                    onChange={(e) =>setAssignFormData({
                        ...assignFormData,
                        needsHostel: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded"
                  /><span className="text-gray-700">Needs Hostel</span></label>{assignFormData.needsHostel && (
                  <label className="flex items-center gap-2 cursor-pointer ml-6"><input
                      type="checkbox"
                      checked={assignFormData.isAcHostel}
                      onChange={(e) =>setAssignFormData({
                          ...assignFormData,
                          isAcHostel: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded"
                    /><span className="text-gray-700">AC Hostel (₹115,000/year)</span></label>)}
              </div></div>{/* Fee Preview */}
            {assignFormData.semester && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8"><p className="font-bold text-gray-800 mb-3">Fee Summary:</p><div className="space-y-2 text-sm">{Object.entries(
                    calculateFees(
                      assignFormData.semester,
                      assignFormData.isFirstGraduate,
                      assignFormData.needsHostel,
                      assignFormData.isAcHostel
                    )
                  ).map(([key, value]) =>(
                    <p key={key}><span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:
                      </span><span className="font-semibold float-right">₹{value}</span></p>))}
                </div></div>)}

            <div className="flex justify-end gap-3"><button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStudent(null);
                  setSelectedEnrolledStudentId('');
                }}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >Cancel
              </button><button
                onClick={handleConfirmAssignFee}
                className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
              >Confirm & Assign
              </button></div></div></div>)}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl"><h2 className="text-2xl font-bold mb-4 text-gray-800">Delete Fee Assignment</h2><div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6"><p className="text-sm text-red-800 font-semibold mb-2">Warning</p><p className="text-sm text-red-700">This will delete the fee assignment and all related invoices and payment history.
              </p></div><div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">Reason for Deletion *
              </label><textarea
                value={deleteReason}
                onChange={(e) =>setDeleteReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter reason for deletion"
                rows="4"
              /></div><div className="flex justify-end gap-3"><button
                onClick={() =>{
                  setDeleteConfirm(null);
                  setDeleteReason('');
                }}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >Cancel
              </button><button
                onClick={handleConfirmDelete}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >Delete
              </button></div></div></div>)}
    </Layout>);
}
