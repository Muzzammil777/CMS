import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import { getUserSession } from '../auth/sessionController';
import { jsPDF } from 'jspdf';
import { PageContainer, StatsSection, Pagination, TableSkeleton } from '../components/common';
import { listFees, updateFeePayment } from '../api/feesApi';
import { listInvoices, updateInvoiceStatus, createInvoice } from '../api/invoicesApi';

export default function FeesPage() {
  const session = getUserSession();
  const role = session?.role?.toLowerCase();
  const studentId = role === 'student' ? session?.userId : null;

  const [feeAssignments, setFeeAssignments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [updatingFeeId, setUpdatingFeeId] = useState(null);
  const [expandedFeeId, setExpandedFeeId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(3);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({
    cardHolderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    upiId: '',
  });

  const fetchFeesAndInvoices = useCallback(async () =>{
    try {
      const [feesData, invoicesData] = await Promise.all([
        listFees(),
        listInvoices(),
      ]);
      setFeeAssignments(feesData);
      setInvoices(invoicesData);
    } catch (err) {
      console.error('Failed to fetch fees/invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() =>{
    fetchFeesAndInvoices();
  }, [fetchFeesAndInvoices]);

  // Listen for updates from other components
  useEffect(() =>{
    const handleUpdate = () =>{
      fetchFeesAndInvoices();
    };

    window.addEventListener('feeAssignmentUpdated', handleUpdate);
    window.addEventListener('invoiceUpdated', handleUpdate);
    return () =>{
      window.removeEventListener('feeAssignmentUpdated', handleUpdate);
      window.removeEventListener('invoiceUpdated', handleUpdate);
    };
  }, [fetchFeesAndInvoices]);

  // Filter fees - if finance or admin, show all, if student show only theirs
  const studentFees = useMemo(() =>{
    let fees = feeAssignments;

    if (role === 'student' && studentId) {
      fees = fees.filter((fee) =>fee.studentId === studentId);
    } else if (role !== 'finance' && role !== 'admin' && studentId) {
       // fallback for other potential roles that might have a studentId
       fees = fees.filter((fee) =>fee.studentId === studentId);
    }

    return fees;
  }, [feeAssignments, studentId, role]);

  const handleStatusUpdate = async (feeId, newStatus) => {
    try {
      await updateFeePayment(feeId, { paymentStatus: newStatus.toLowerCase() });
      const targetFee = feeAssignments.find((f) => f.id === feeId);
      const existingInvoice = invoices.find((inv) => inv.generatedFrom === feeId);
      const formattedStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase();
      
      if (existingInvoice) {
        await updateInvoiceStatus(existingInvoice.id, { payment_status: formattedStatus });
      } else if (newStatus.toLowerCase() === 'paid' && targetFee) {
        // Automatically generate invoice since it's paid and doesn't exist
        const newInvoicePayload = {
          invoice_id: `BILL${Date.now()}`,
          student_id: targetFee.studentId,
          student_name: targetFee.studentName,
          course: targetFee.course,
          semester: targetFee.semester,
          items: [
            { description: 'Semester Fee', amount: targetFee.semesterFee },
            { description: 'Book Fee', amount: targetFee.bookFee },
            { description: 'Exam Fee', amount: targetFee.examFee },
          ],
          total: targetFee.totalFee,
          payment_status: 'Paid',
          generated_from: targetFee.id,
          paid_date: new Date().toISOString(),
          payment_method: 'Manual/Admin Update',
          transaction_id: `TXN-MANUAL-${Math.floor(Math.random() * 1000000)}`,
        };

        if (targetFee.hostelFee > 0) {
          newInvoicePayload.items.push({ description: 'Hostel Fee', amount: targetFee.hostelFee });
        }
        if (targetFee.miscFee > 0) {
          newInvoicePayload.items.push({ description: 'Misc Fee', amount: targetFee.miscFee });
        }

        await createInvoice(newInvoicePayload);
      }
      
      await fetchFeesAndInvoices();
      window.dispatchEvent(new CustomEvent('feeAssignmentUpdated'));
      window.dispatchEvent(new CustomEvent('invoiceUpdated'));
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingFeeId(null);
    }
  };

  const stats = useMemo(() =>{
    const totalAssigned = studentFees.length;
    const paidCount = studentFees.filter((fee) =>fee.paymentStatus?.toLowerCase() === 'paid').length;
    const pendingCount = studentFees.filter((fee) =>fee.paymentStatus?.toLowerCase() === 'pending').length;
    const processingCount = studentFees.filter((fee) =>fee.paymentStatus?.toLowerCase() === 'processing').length;
    const totalRevenue = studentFees
      .filter((fee) =>fee.paymentStatus?.toLowerCase() === 'paid')
      .reduce((sum, fee) =>sum + (Number(fee.totalFee) || 0), 0);

    return { totalAssigned, paidCount, pendingCount, processingCount, totalRevenue };
  }, [studentFees]);

  const handlePayClick = (fee) =>{
    setSelectedFee(fee);
    setPaymentMethod('');
    setPaymentDetails({
      cardHolderName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      upiId: '',
    });
    setShowPaymentModal(true);
  };

  const handlePaymentDetailsChange = (e) =>{
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cardNumber') {
      formattedValue = value.replace(/\D/g, '').slice(0, 16);
      if (formattedValue.length >0) {
        formattedValue = formattedValue.match(/.{1,4}/g).join(' ');
      }
    } else if (name === 'expiryDate') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
      if (formattedValue.length >= 2) {
        formattedValue = formattedValue.slice(0, 2) + '/' + formattedValue.slice(2, 4);
      }
    } else if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 3);
    }

    setPaymentDetails((prev) =>({
      ...prev,
      [name]: formattedValue,
    }));
  };

  const handleSelectPaymentMethod = () =>{
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }
    setShowPaymentForm(true);
  };

  const handleProcessPayment = () =>{
    // Validate payment details based on payment method
    if (paymentMethod === 'Debit Card' || paymentMethod === 'Credit Card') {
      if (!paymentDetails.cardHolderName || !paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv) {
        alert('Please fill all card details');
        return;
      }
    } else if (paymentMethod === 'UPI') {
      if (!paymentDetails.upiId) {
        alert('Please enter UPI ID');
        return;
      }
    }

    setShowPaymentForm(false);
    setShowPaymentModal(false);
    setShowProcessing(true);

    // Simulate payment processing with 90% success rate
    const paymentSuccess = Math.random() >0.1; // 90% success

    setTimeout(async () =>{
      if (paymentSuccess) {
        // Generate transaction ID
        const txnId = `TXN${Math.random().toString().slice(2, 8)}`;
        setTransactionId(txnId);

        try {
          // 1 Update fee_assignments status
          await updateFeePayment(selectedFee.id, {
            paymentStatus: 'paid',
            paidDate: new Date().toISOString().split('T')[0],
            transactionId: txnId,
            paymentMethod: paymentMethod,
          });

          // 2 Update corresponding invoice in admin_invoices or create a new one
          const existingInvoice = invoices.find((inv) => inv.generatedFrom === selectedFee.id);
          if (existingInvoice) {
            await updateInvoiceStatus(existingInvoice.id, {
              payment_status: 'Paid',
              paid_date: new Date().toISOString(),
              payment_method: paymentMethod,
              transaction_id: txnId,
            });
          } else {
            // Automatically generate invoice since it's paid and doesn't exist
            const newInvoicePayload = {
              invoice_id: `BILL${Date.now()}`,
              student_id: selectedFee.studentId,
              student_name: selectedFee.studentName,
              course: selectedFee.course,
              semester: selectedFee.semester,
              items: [
                { description: 'Semester Fee', amount: selectedFee.semesterFee },
                { description: 'Book Fee', amount: selectedFee.bookFee },
                { description: 'Exam Fee', amount: selectedFee.examFee },
              ],
              total: selectedFee.totalFee,
              payment_status: 'Paid',
              generated_from: selectedFee.id,
              paid_date: new Date().toISOString(),
              payment_method: paymentMethod,
              transaction_id: txnId,
            };

            if (selectedFee.hostelFee > 0) {
              newInvoicePayload.items.push({ description: 'Hostel Fee', amount: selectedFee.hostelFee });
            }
            if (selectedFee.miscFee > 0) {
              newInvoicePayload.items.push({ description: 'Misc Fee', amount: selectedFee.miscFee });
            }

            await createInvoice(newInvoicePayload);
          }

          await fetchFeesAndInvoices();
          window.dispatchEvent(new CustomEvent('feeAssignmentUpdated'));
          window.dispatchEvent(new CustomEvent('invoiceUpdated'));
          setShowProcessing(false);
          setShowSuccess(true);
        } catch (err) {
          setShowProcessing(false);
          console.error('Failed to update payment status:', err);
          alert(`Failed to save payment status: ${err.message}`);
        }
      } else {
        setShowProcessing(false);
        // Payment failed
        alert('Payment failed. Please try again.');
        setSelectedFee(null);
      }
    }, 2000);
  };

  const handleViewInvoice = (fee) =>{
    const invoice = invoices.find((inv) =>inv.generatedFrom === fee.id);
    if (invoice) {
      setSelectedInvoice(invoice);
      setShowInvoiceModal(true);
    } else {
      alert('Invoice not found. Please contact admin.');
    }
  };

  const handleDownloadInvoice = (invoice) =>{
    downloadInvoicePDF(invoice);
    setShowInvoiceModal(false);
  };

  const downloadInvoicePDF = (invoice) =>{
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('INVOICE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // College info
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('College Management System', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.text('123 University Road, Education City', pageWidth / 2, yPosition, {
      align: 'center',
    });
    yPosition += 5;
    pdf.text('Phone: +91-9876543210', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Line separator
    pdf.setDrawColor(200);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    // Student Information
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Student Information', 20, yPosition);
    yPosition += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Student ID: ${invoice.studentId}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`Name: ${invoice.studentName}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`Course: ${invoice.course}`, 20, yPosition);
    yPosition += 10;

    // Invoice Details
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Invoice Details', pageWidth / 2, yPosition);
    yPosition += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Invoice #: ${invoice.id}`, pageWidth / 2, yPosition);
    yPosition += 5;
    pdf.text(`Date: ${invoice.generatedDate}`, pageWidth / 2, yPosition);
    yPosition += 5;
    pdf.text(`Status: ${invoice.paymentStatus}`, pageWidth / 2, yPosition);
    yPosition += 10;

    // Fee Breakdown Table
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Fee Breakdown', 20, yPosition);
    yPosition += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    // Table headers
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', 20, yPosition);
    pdf.text('Amount (₹)', pageWidth - 40, yPosition, { align: 'right' });
    yPosition += 5;

    // Table separator
    pdf.setDrawColor(200);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;

    // Table rows
    pdf.setFont('helvetica', 'normal');
    if (invoice.items && Array.isArray(invoice.items)) {
      invoice.items.forEach((item) =>{
        pdf.text(item.description, 20, yPosition);
        pdf.text(item.amount.toString(), pageWidth - 40, yPosition, { align: 'right' });
        yPosition += 5;
      });
    }

    // Total
    yPosition += 3;
    pdf.setDrawColor(200);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Total Amount', 20, yPosition);
    pdf.text(`₹${invoice.total}`, pageWidth - 40, yPosition, { align: 'right' });
    yPosition += 10;

    // Payment Confirmation
    if (invoice.paymentStatus === 'Paid') {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Payment Confirmation', 20, yPosition);
      yPosition += 7;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Payment Date: ${invoice.paidDate}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Method: ${invoice.paymentMethod}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Transaction ID: ${invoice.transactionId}`, 20, yPosition);
    }

    pdf.save(`invoice_${invoice.id}.pdf`);
  };

  return (
    <Layout title="Fee Management"><div className="space-y-8">{role === 'finance' && (
          <StatsSection stats={[
            { value: stats.totalAssigned, label: 'Total Assigned', icon: 'assignment' },
            { value: stats.paidCount, label: 'Paid Fees', icon: 'check_circle' },
            { value: stats.pendingCount, label: 'Pending Fees', icon: 'schedule' },
            { value: stats.processingCount, label: 'Processing', icon: 'sync' },
          ]} />)}

        {/* Fee Table */}
        {loading ? (
          <TableSkeleton cols={8} rows={6} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto"><table className="w-full text-left min-w-[800px]"><thead><tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200"><th className="px-6 py-4">Student Info</th><th className="px-6 py-4">Student ID</th><th className="px-6 py-4">Course</th><th className="px-6 py-4">Semester</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Assigned Date</th><th className="px-6 py-4 text-center">Actions</th></tr></thead><tbody className="divide-y divide-slate-50">{studentFees.length === 0 ? (
                <tr><td colSpan={8} className="px-10 py-24 text-center text-slate-400 bg-slate-50/30"><div className="flex flex-col items-center"><span className="material-symbols-outlined text-6xl mb-4 opacity-10 text-slate-900">receipt_long
                      </span><p className="text-base font-bold text-slate-500">No fees assigned yet</p><p className="text-xs font-medium text-slate-400 mt-1">{role === 'finance' ? 'No fee assignments to manage' : 'Contact your institution to assign fees'}
                      </p></div></td></tr>) : (
                studentFees.slice((currentPage-1)*pageSize, currentPage*pageSize).map((fee) =>(
                  <React.Fragment key={fee.id}><tr className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4"><div><p className="font-semibold text-slate-900 text-sm">{fee.studentName}</p><p className="text-xs text-slate-500">{fee.applicationId}</p></div></td><td className="px-6 py-4"><span className="text-sm font-medium text-slate-700">{fee.studentId || 'N/A'}</span></td><td className="px-6 py-4"><span className="text-sm text-slate-600">{fee.course}</span></td><td className="px-6 py-4"><span className="text-sm text-slate-600">{fee.semester}</span></td><td className="px-6 py-4"><span className="text-sm font-bold text-orange-600">₹{Number(fee.totalFee).toLocaleString()}</span></td><td className="px-6 py-4"><span
                          className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                            fee.paymentStatus?.toLowerCase() === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : fee.paymentStatus?.toLowerCase() === 'processing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                          }`}
                        >{fee.paymentStatus ? fee.paymentStatus.charAt(0).toUpperCase() + fee.paymentStatus.slice(1) : 'Pending'}
                        </span></td><td className="px-6 py-4"><span className="text-sm text-slate-600">{fee.assignedDate}</span></td><td className="px-6 py-4"><div className="flex items-center justify-center gap-2"><button
                            onClick={() =>setExpandedFeeId(expandedFeeId === fee.id ? null : fee.id)
                            }
                            className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-slate-900"
                            title="View Details"
                          ><span className="material-symbols-outlined text-lg">{expandedFeeId === fee.id ? 'expand_less' : 'expand_more'}
                            </span></button>{role === 'finance' ? (
                            <button
                              onClick={() =>setUpdatingFeeId(fee.id)}
                              className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-slate-900"
                              title="Update Status"
                            ><span className="material-symbols-outlined text-lg">edit</span></button>) : (
                            <>{fee.paymentStatus?.toLowerCase() === 'pending' || fee.paymentStatus?.toLowerCase() === 'processing' ? (
                                <button
                                  onClick={() =>handlePayClick(fee)}
                                  className="p-2 hover:bg-green-100 rounded-lg transition text-green-600 hover:text-green-700"
                                  title="Pay Now"
                                ><span className="material-symbols-outlined text-lg">payment</span></button>) : (
                                <button
                                  onClick={() =>handleViewInvoice(fee)}
                                  className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600 hover:text-blue-700"
                                  title="View Invoice"
                                ><span className="material-symbols-outlined text-lg">visibility</span></button>)}
                            </>)}
                        </div></td></tr>{/* Expandable Row - Fee Breakdown */}
                    {expandedFeeId === fee.id && (
                      <tr className="bg-slate-50 hover:bg-slate-50"><td colSpan={8} className="px-6 py-6"><div className="space-y-4"><h4 className="font-bold text-slate-900">Fee Breakdown</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-slate-600">Semester Fee:</span><span className="font-semibold text-slate-900">₹{Number(fee.semesterFee).toLocaleString()}</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">Book Fee:</span><span className="font-semibold text-slate-900">₹{Number(fee.bookFee).toLocaleString()}</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">Exam Fee:</span><span className="font-semibold text-slate-900">₹{Number(fee.examFee).toLocaleString()}</span></div>{Number(fee.hostelFee) >0 && (
                                  <div className="flex justify-between text-sm"><span className="text-slate-600">Hostel Fee:</span><span className="font-semibold text-slate-900">₹{Number(fee.hostelFee).toLocaleString()}</span></div>)}
                                {Number(fee.miscFee) >0 && (
                                  <div className="flex justify-between text-sm"><span className="text-slate-600">Miscellaneous Fee:</span><span className="font-semibold text-slate-900">₹{Number(fee.miscFee).toLocaleString()}</span></div>)}
                              </div><div className="bg-white rounded-lg border border-slate-200 p-4"><div className="flex justify-between items-center mb-3"><span className="font-bold text-slate-900">Total Amount</span><span className="text-lg font-bold text-orange-600">₹{Number(fee.totalFee).toLocaleString()}</span></div>{fee.paymentStatus?.toLowerCase() === 'paid' && fee.paidDate && (
                                  <><div className="border-t border-slate-200 pt-3 mt-3"><p className="text-xs text-slate-600 mb-1"><span className="font-semibold">Paid Date:</span>{fee.paidDate}
                                      </p>{fee.transactionId && (
                                        <p className="text-xs text-slate-600"><span className="font-semibold">Transaction ID:</span>{fee.transactionId}
                                        </p>)}
                                      {fee.paymentMethod && (
                                        <p className="text-xs text-slate-600"><span className="font-semibold">Payment Method:</span>{fee.paymentMethod}
                                        </p>)}
                                    </div></>)}
                              </div></div>{/* Additional Actions in Expanded Row */}
                            {role === 'finance' && updatingFeeId === fee.id && (
                              <div className="bg-white rounded-lg border border-slate-200 p-4 mt-4"><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Update Payment Status
                                </label><div className="flex gap-3"><select
                                    value={fee.paymentStatus?.toLowerCase() || ''}
                                    onChange={(e) =>handleStatusUpdate(fee.id, e.target.value)}
                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none shadow-sm hover:border-slate-300 transition-all cursor-pointer"
                                  ><option value="pending">Pending</option><option value="processing">Processing</option><option value="paid">Paid</option></select><button
                                    onClick={() =>setUpdatingFeeId(null)}
                                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-semibold"
                                  >Close
                                  </button></div></div>)}
                          </div></td></tr>)}
                  </React.Fragment>))
              )}
            </tbody></table>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.max(1, Math.ceil(studentFees.length / pageSize))}
                onPageChange={setCurrentPage}
                totalItems={studentFees.length}
                pageSize={pageSize}
                onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
              />
            </div>
        )}
      </div>
      
      {/* Payment Method Modal */}
      {showPaymentModal && selectedFee && !showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl"><h2 className="text-2xl font-bold mb-6">Pay {selectedFee.semester} Fee</h2><div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"><p className="text-sm text-gray-600 mb-2"><span className="font-semibold">Amount:</span>₹{selectedFee.totalFee.toLocaleString()}
              </p><p className="text-sm text-gray-600"><span className="font-semibold">Course:</span>{selectedFee.course}
              </p></div><div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-3">Select Payment Method *
              </label><select
                value={paymentMethod}
                onChange={(e) =>setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
              ><option value="">-- Select Payment Method --</option><option value="Debit Card">Debit Card</option><option value="Credit Card">Credit Card</option><option value="UPI">UPI</option><option value="Net Banking">Net Banking</option></select></div><div className="flex gap-3"><button
                onClick={() =>{
                  setShowPaymentModal(false);
                  setSelectedFee(null);
                  setPaymentMethod('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >Cancel
              </button><button
                onClick={handleSelectPaymentMethod}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >Next
              </button></div></div></div>)}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedFee && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-y-auto"><div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl my-8"><h2 className="text-2xl font-bold mb-6">Complete Payment - ₹{selectedFee.totalFee.toLocaleString()}
            </h2><div className="bg-gray-100 rounded-lg p-4 mb-6"><p className="text-sm text-gray-600"><span className="font-semibold">Amount:</span>₹{selectedFee.totalFee.toLocaleString()}
              </p><p className="text-sm text-gray-600"><span className="font-semibold">Payment Method:</span>{paymentMethod}
              </p></div>{/* Card Payment Fields */}
            {(paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') && (
              <div className="space-y-4 mb-6"><div><label className="block text-sm font-medium text-gray-700 mb-1">Card Holder Name *
                  </label><input
                    type="text"
                    name="cardHolderName"
                    value={paymentDetails.cardHolderName}
                    onChange={handlePaymentDetailsChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                  /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Card Number *
                  </label><input
                    type="text"
                    name="cardNumber"
                    value={paymentDetails.cardNumber}
                    onChange={handlePaymentDetailsChange}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                  /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *
                    </label><input
                      type="text"
                      name="expiryDate"
                      value={paymentDetails.expiryDate}
                      onChange={handlePaymentDetailsChange}
                      placeholder="MM/YY"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">CVV *
                    </label><input
                      type="text"
                      name="cvv"
                      value={paymentDetails.cvv}
                      onChange={handlePaymentDetailsChange}
                      placeholder="123"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    /></div></div></div>)}

            {/* UPI Payment Fields */}
            {paymentMethod === 'UPI' && (
              <div className="space-y-4 mb-6"><div><label className="block text-sm font-medium text-gray-700 mb-1">UPI ID / Mobile Number *
                  </label><input
                    type="text"
                    name="upiId"
                    value={paymentDetails.upiId}
                    onChange={handlePaymentDetailsChange}
                    placeholder="username@upi or 9876543210"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                  /></div><div className="bg-green-50 p-4 rounded-lg text-center"><p className="text-sm text-green-800 mb-3">Quick Response Code (QR)</p><div className="bg-white p-4 rounded border-2 border-green-200 flex items-center justify-center h-40"><div className="text-gray-400 text-sm text-center">QR Code<br />(Scan for UPI Payment)
                    </div></div></div></div>)}

            {/* Net Banking */}
            {paymentMethod === 'Net Banking' && (
              <div className="space-y-4 mb-6"><div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-sm text-green-800">You will be redirected to your bank's website to complete the payment.
                  </p></div></div>)}

            <div className="flex gap-3"><button
                onClick={() =>{
                  setShowPaymentForm(false);
                  setShowPaymentModal(true);
                  setPaymentDetails({
                    cardHolderName: '',
                    cardNumber: '',
                    expiryDate: '',
                    cvv: '',
                    upiId: '',
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >Back
              </button><button
                onClick={handleProcessPayment}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
              >Pay Now
              </button></div></div></div>)}

      {/* Processing Modal */}
      {showProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl"><div className="text-center"><span className="material-symbols-outlined text-6xl text-green-500 block mb-4 animate-spin">payments
              </span><h2 className="text-xl font-bold text-gray-800 mb-2">Processing Payment...</h2><p className="text-gray-600 mb-6">Please wait while we process your payment</p>{/* Progress Bar */}
              <div className="w-full bg-gray-300 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full animate-pulse"></div></div></div></div></div>)}

      {/* Success Modal */}
      {showSuccess && selectedFee && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl text-center"><span className="material-symbols-outlined text-6xl text-green-500 block mb-4">check_circle
            </span><h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2><div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left"><p className="text-gray-600 mb-2 text-sm"><span className="font-semibold">Amount Paid:</span>₹{selectedFee.totalFee.toLocaleString()}
              </p><p className="text-gray-600 text-sm"><span className="font-semibold">Transaction ID:</span>{transactionId}
              </p><p className="text-gray-600 text-sm"><span className="font-semibold">Date:</span>{new Date().toLocaleString()}
              </p></div><button
              onClick={() =>{
                setShowSuccess(false);
                setSelectedFee(null);
                setPaymentMethod('');
                setPaymentDetails({
                  cardHolderName: '',
                  cardNumber: '',
                  expiryDate: '',
                  cvv: '',
                  upiId: '',
                });
              }}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
            >Done
            </button></div></div>)}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-y-auto"><div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-xl my-8"><h2 className="text-2xl font-bold mb-6">Invoice Details</h2>{/* Invoice Header */}
            <div className="border-b-2 border-gray-200 pb-6 mb-6"><div className="grid grid-cols-2 gap-6"><div><p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Invoice ID:</span>{selectedInvoice.id}
                  </p><p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Date:</span>{selectedInvoice.generatedDate}
                  </p></div><div><p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Student:</span>{selectedInvoice.studentName}
                  </p><p className="text-sm text-gray-600"><span className="font-semibold">Course:</span>{selectedInvoice.course}
                  </p></div></div></div>{/* Fee Items */}
            <div className="mb-6"><h3 className="text-lg font-bold text-gray-800 mb-4">Fee Breakdown</h3><div className="space-y-2">{selectedInvoice.items?.map((item, index) =>(
                  <div key={index} className="flex justify-between text-sm"><span className="text-gray-600">{item.description}</span><span className="font-semibold text-gray-800">₹{item.amount.toLocaleString()}</span></div>))}
              </div><div className="border-t-2 border-gray-200 mt-4 pt-4"><div className="flex justify-between text-lg"><span className="font-bold text-gray-800">Total Amount</span><span className="font-bold text-orange-600">₹{selectedInvoice.total.toLocaleString()}</span></div></div></div>{/* Payment Status */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6"><p className="text-sm mb-2"><span className="font-semibold">Payment Status:</span><span
                  className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedInvoice.paymentStatus === 'Paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >{selectedInvoice.paymentStatus}
                </span></p>{selectedInvoice.paymentStatus === 'Paid' && (
                <><p className="text-sm text-gray-600"><span className="font-semibold">Paid Date:</span>{selectedInvoice.paidDate}
                  </p><p className="text-sm text-gray-600"><span className="font-semibold">Payment Method:</span>{selectedInvoice.paymentMethod}
                  </p><p className="text-sm text-gray-600"><span className="font-semibold">Transaction ID:</span>{selectedInvoice.transactionId}
                  </p></>)}
            </div><div className="flex gap-3"><button
                onClick={() =>setShowInvoiceModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >Close
              </button><button
                onClick={() =>handleDownloadInvoice(selectedInvoice)}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
              >Download PDF
              </button></div></div></div>)}
    </Layout>);
}
