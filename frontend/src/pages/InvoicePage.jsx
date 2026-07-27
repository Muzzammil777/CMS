import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import { getUserSession } from '../auth/sessionController';
import { jsPDF } from 'jspdf';
import { listInvoices } from '../api/invoicesApi';
import { Pagination, TableSkeleton } from '../components/common';

export default function InvoicePage() {
  const session = getUserSession();
  const studentId = session?.userId;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(3);

  const fetchInvoices = useCallback(async () =>{
    try {
      const data = await listInvoices();
      setInvoices(data);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() =>{
    fetchInvoices();
  }, [fetchInvoices]);

  // Listen for real-time updates (when students make payments or admin updates invoices)
  useEffect(() =>{
    const handleInvoiceUpdate = () =>{
      fetchInvoices();
    };

    window.addEventListener('invoiceUpdated', handleInvoiceUpdate);
    return () =>window.removeEventListener('invoiceUpdated', handleInvoiceUpdate);
  }, [fetchInvoices]);

  // Filter invoices for current student
  const studentInvoices = useMemo(() =>{
    let filtered = invoices;

    // Filter by student ID
    if (studentId) {
      filtered = filtered.filter((inv) =>inv.studentId === studentId);
    }

    // Filter by name
    if (searchName) {
      filtered = filtered.filter((inv) =>inv.studentName?.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    // Filter by course
    if (searchDept) {
      filtered = filtered.filter((inv) =>inv.course?.toLowerCase().includes(searchDept.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) =>inv.paymentStatus?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    return filtered;
  }, [invoices, studentId, searchName, searchDept, statusFilter]);

  const getStatusColor = (status) =>{
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Pending':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const handleViewInvoice = (invoice) =>{
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleDownloadPDF = (invoice) =>{
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
      pdf.text(`Payment Date: ${invoice.paidDate || 'N/A'}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Method: ${invoice.paymentMethod || 'N/A'}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Transaction ID: ${invoice.transactionId || 'N/A'}`, 20, yPosition);
    }

    pdf.save(`invoice_${invoice.id}.pdf`);
  };

  const handleSendEmail = (invoice) =>{
    const subject = `Invoice ${invoice.id} - Payment Receipt`;
    const body = encodeURIComponent(
      `Invoice Details:\n\nStudent: ${invoice.studentName}\nAmount: ₹${invoice.total}\nStatus: ${invoice.paymentStatus}\n\nPlease find the invoice details attached.`
    );

    window.location.href = `mailto:student@college.edu?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  return (
    <Layout title="Invoices & Bills"><div className="space-y-8">
        {/* Search Section */}
        <div className="bg-white rounded-lg shadow p-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Search by Name
              </label><input
                type="text"
                value={searchName}
                onChange={(e) =>setSearchName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                placeholder="Enter name..."
              /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Search by Course
              </label><input
                type="text"
                value={searchDept}
                onChange={(e) =>setSearchDept(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                placeholder="Enter course..."
              /></div><div className="flex items-end"><button
                onClick={() =>{
                  setSearchName('');
                  setSearchDept('');
                  setStatusFilter('all');
                }}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >Clear Filters
              </button></div></div>{/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2">{['all', 'Paid', 'Pending', 'Failed'].map((status) =>(
              <button
                key={status}
                onClick={() =>setStatusFilter(status === 'all' ? 'all' : status)
                }
                className={`px-4 py-2 rounded-lg transition ${
                  statusFilter === status || (statusFilter === 'all' && status === 'all')
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >{status.charAt(0).toUpperCase() + status.slice(1)}
              </button>))}
          </div></div>
        
        {/* Invoice Cards Grid */}
        {loading ? (
          <TableSkeleton cols={3} rows={6} />
        ) : (
          <div className="bg-white rounded-lg shadow p-6">{studentInvoices.length === 0 ? (
            <div className="text-center py-12"><span className="material-symbols-outlined text-6xl text-gray-300 block mb-4">receipt
              </span><p className="text-gray-500 text-lg">No invoices found</p><p className="text-gray-400 text-sm">Your invoices will appear here once generated</p></div>) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{studentInvoices.slice((currentPage-1)*pageSize, currentPage*pageSize).map((invoice) =>(
                <div
                  key={invoice.id}
                  onClick={() =>handleViewInvoice(invoice)}
                  className={`rounded-lg shadow border-l-4 p-6 cursor-pointer hover:shadow-lg transition ${
                    invoice.paymentStatus === 'Paid'
                      ? 'bg-green-50 border-l-green-500'
                      : invoice.paymentStatus === 'Pending'
                      ? 'bg-orange-50 border-l-orange-500'
                      : 'bg-red-50 border-l-red-500'
                  }`}
                ><div className="flex items-start justify-between mb-4"><div><p className="text-xs text-gray-600">{invoice.id}</p><p className="text-gray-500 text-sm">{new Date(invoice.generatedDate || new Date()).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </p></div><span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        invoice.paymentStatus
                      )}`}
                    >{invoice.paymentStatus}
                    </span></div><div className="space-y-2 text-sm mb-4"><div><p className="text-gray-600">Student</p><p className="font-semibold text-gray-800">{invoice.studentName}</p></div><div><p className="text-gray-600">ID</p><p className="font-semibold text-gray-800">{invoice.studentId}</p></div></div><p className="text-base font-semibold text-gray-600 mb-3">{invoice.course}
                  </p><div className="bg-white rounded p-3 mb-4"><p className="text-xs text-gray-600">Total Amount Due</p><p className="text-2xl font-bold text-gray-800">₹{invoice.total}</p></div><div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4"><div><p className="font-semibold">Generated</p><p>{invoice.generatedDate}</p></div><div className="text-right"><p className="font-semibold">+ fee items</p><p>{invoice.items?.length || 0}{' '}
                        {invoice.items?.length === 1 ? 'item' : 'items'}
                      </p></div></div><div className="flex gap-2"><button
                      onClick={(e) =>{
                        e.stopPropagation();
                        handleDownloadPDF(invoice);
                      }}
                      className="flex-1 bg-green-500 text-white py-2 rounded text-sm hover:bg-green-600 transition"
                    >Download
                    </button><button
                      onClick={(e) =>{
                        e.stopPropagation();
                        handleViewInvoice(invoice);
                      }}
                      className="flex-1 bg-purple-500 text-white py-2 rounded text-sm hover:bg-purple-600 transition"
                    >View
                    </button></div></div>))}
            </div>)}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(studentInvoices.length / pageSize))}
            onPageChange={setCurrentPage}
            totalItems={studentInvoices.length}
            pageSize={pageSize}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          />
        </div>
        )}
      </div>
      
      {/* Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Invoice Details</h2><button
                onClick={() =>setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              ></button></div>{/* College Header */}
            <div className="text-center border-b pb-6 mb-6"><h3 className="font-bold text-lg">College Management System</h3><p className="text-sm text-gray-600">123 University Road, Education City</p><p className="text-sm text-gray-600">Phone: +91-9876543210</p></div>{/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6 mb-6"><div><h4 className="font-bold text-gray-800 mb-3">Student Information</h4><div className="space-y-2 text-sm"><p><span className="text-gray-600">ID:</span><span className="font-semibold">{selectedInvoice.studentId}</span></p><p><span className="text-gray-600">Name:</span><span className="font-semibold">{selectedInvoice.studentName}</span></p><p><span className="text-gray-600">Course:</span><span className="font-semibold">{selectedInvoice.course}</span></p></div></div><div><h4 className="font-bold text-gray-800 mb-3">Invoice Details</h4><div className="space-y-2 text-sm"><p><span className="text-gray-600">Invoice #:</span><span className="font-semibold">{selectedInvoice.id}</span></p><p><span className="text-gray-600">Date:</span><span className="font-semibold">{selectedInvoice.generatedDate}</span></p><p><span className="text-gray-600">Status:</span><span
                      className={`font-semibold px-2 py-1 rounded text-xs ${getStatusColor(
                        selectedInvoice.paymentStatus
                      )}`}
                    >{selectedInvoice.paymentStatus}
                    </span></p></div></div></div>{/* Fee Breakdown */}
            <div className="mb-6"><h4 className="font-bold text-gray-800 mb-3">Fee Breakdown</h4>{selectedInvoice.items && selectedInvoice.items.length >0 ? (
                <table className="w-full"><thead><tr className="border-b-2 border-gray-300"><th className="text-left py-2 text-sm text-gray-600">Description</th><th className="text-right py-2 text-sm text-gray-600">Amount</th></tr></thead><tbody>{selectedInvoice.items.map((item, idx) =>(
                      <tr key={idx} className="border-b border-gray-200"><td className="text-left py-2 text-sm">{item.description}</td><td className="text-right py-2 text-sm font-semibold">₹{item.amount}</td></tr>))}
                  </tbody></table>) : (
                <p className="text-gray-600 text-sm">No items</p>)}
            </div>{/* Total */}
            <div className="bg-gray-100 rounded p-4 mb-6"><div className="flex justify-between"><span className="font-bold text-gray-800">Total Amount:</span><span className="font-bold text-2xl text-gray-800">₹{selectedInvoice.total}</span></div></div>{/* Payment Info */}
            {selectedInvoice.paymentStatus === 'Paid' && (
              <div className="bg-green-50 border border-green-300 rounded p-4 mb-6"><h4 className="font-bold text-green-900 mb-3">Payment Confirmation</h4><div className="space-y-2 text-sm"><p><span className="text-green-700">Payment Date:</span><span className="font-semibold">{selectedInvoice.paidDate || 'N/A'}</span></p><p><span className="text-green-700">Method:</span><span className="font-semibold">{selectedInvoice.paymentMethod || 'N/A'}</span></p><p><span className="text-green-700">Transaction ID:</span><span className="font-semibold">{selectedInvoice.transactionId || 'N/A'}</span></p></div></div>)}

            {/* Action Buttons */}
            <div className="flex gap-3 mb-3"><button
                onClick={() =>handleDownloadPDF(selectedInvoice)}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
              ><span className="material-symbols-outlined">download</span>Download PDF
              </button><button
                onClick={() =>handleSendEmail(selectedInvoice)}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
              ><span className="material-symbols-outlined">mail</span>Send Email
              </button></div><button
              onClick={() =>setShowDetailModal(false)}
              className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
            >Close
            </button></div></div>)}
    </Layout>);
}
