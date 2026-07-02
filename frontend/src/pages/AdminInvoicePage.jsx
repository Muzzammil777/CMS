import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { PageContainer, StatsSection, StatusBadge, Pagination, TableSkeleton } from '../components/common';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import { jsPDF } from 'jspdf';
import { getUserSession } from '../auth/sessionController';
import { listInvoices, deleteInvoice } from '../api/invoicesApi';

export default function AdminInvoicePage() {
  const session = getUserSession();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
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

  // Listen for real-time updates (when students make payments)
  useEffect(() =>{
    const handleInvoiceUpdate = () =>{
      fetchInvoices();
    };

    window.addEventListener('invoiceUpdated', handleInvoiceUpdate);
    return () =>window.removeEventListener('invoiceUpdated', handleInvoiceUpdate);
  }, [fetchInvoices]);

  const allCourses = useMemo(() =>{
    const courses = [...new Set(invoices.map((inv) =>inv.course))];
    return courses.filter(Boolean);
  }, [invoices]);

  const filteredInvoices = useMemo(() =>{
    return invoices.filter((invoice) =>{
      const matchesSearch =
        invoice.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        invoice.paymentStatus?.toLowerCase() === statusFilter.toLowerCase();

      const matchesCourse = courseFilter === 'all' || invoice.course === courseFilter;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [invoices, searchTerm, statusFilter, courseFilter]);

  const stats = useMemo(() =>{
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((inv) =>inv.paymentStatus?.toLowerCase() === 'paid').length;
    const processingInvoices = invoices.filter((inv) =>inv.paymentStatus?.toLowerCase() === 'processing').length;
    const pendingInvoices = invoices.filter((inv) =>inv.paymentStatus?.toLowerCase() === 'pending').length;
    
    const totalPotential = invoices.reduce((sum, inv) =>sum + (Number(inv.total) || 0), 0);
    const totalRevenue = invoices
      .filter((inv) =>inv.paymentStatus?.toLowerCase() === 'paid')
      .reduce((sum, inv) =>sum + (Number(inv.total) || 0), 0);

    return {
      totalInvoices,
      paidInvoices,
      processingInvoices,
      pendingInvoices,
      totalRevenue,
      totalPotential
    };
  }, [invoices]);

  const handleView = (invoice) =>{
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleDelete = async (invoiceId) =>{
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoice(invoiceId);
        setInvoices((prev) =>prev.filter((inv) =>inv.id !== invoiceId));
        alert('Invoice deleted successfully');
      } catch (err) {
        console.error('Failed to delete invoice:', err);
        alert(`Failed to delete invoice: ${err.message}`);
      }
    }
  };

  const handleDownloadPDF = (invoice) =>{
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
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
    pdf.text(`Date: ${invoice.generatedDate || new Date().toISOString().split('T')[0]}`, pageWidth / 2, yPosition);
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

    // Payment Information
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

    // Footer
    yPosition = pageHeight - 20;
    pdf.setDrawColor(200);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Thank you for your payment!', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 4;
    pdf.text('Payment Methods: Debit Card, Credit Card, UPI, Net Banking', pageWidth / 2, yPosition, {
      align: 'center',
    });

    pdf.save(`invoice_${invoice.id}.pdf`);
  };

  const handlePrint = (invoice) =>{
    const printContent = `
      <html><head><title>Invoice ${invoice.id}</title><style>body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; }
            .info { margin-top: 20px; }
            .section { margin-top: 20px; }
            .section-title { font-weight: bold; font-size: 14px; border-bottom: 1px solid #999; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .total { font-weight: bold; text-align: right; }
          </style></head><body><div class="header"><div class="title">INVOICE</div><div>College Management System</div><div>123 University Road, Education City</div></div><div class="section"><div class="section-title">Student Information</div><div><strong>ID:</strong>${invoice.studentId}</div><div><strong>Name:</strong>${invoice.studentName}</div><div><strong>Course:</strong>${invoice.course}</div></div><div class="section"><div class="section-title">Fee Breakdown</div><table><tr><th>Description</th><th>Amount</th></tr>${invoice.items?.map(item =>`<tr><td>${item.description}</td><td>₹${item.amount}</td></tr>`).join('')}
              <tr><th>Total</th><th>₹${invoice.total}</th></tr></table></div></body></html>`;

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSendEmail = (invoice) =>{
    const subject = `Invoice ${invoice.id} - Payment Receipt`;
    const body = encodeURIComponent(
      `Invoice Details:\n\nStudent: ${invoice.studentName}\nAmount: ₹${invoice.total}\nStatus: ${invoice.paymentStatus}\n\nPlease find the invoice attached.`
    );

    window.location.href = `mailto:${invoice.studentId}@student.edu?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  return (
    <Layout title="Invoice Management"><PageContainer>{/* Statistics Cards */}
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8"><KpiCard
            icon="description"
            label="Total Invoices"
            value={stats.totalInvoices}
            colorScheme="green"
          /><KpiCard
            icon="check_circle"
            label="Paid"
            value={stats.paidInvoices}
            colorScheme="green"
          /><KpiCard
            icon="sync"
            label="Processing"
            value={stats.processingInvoices}
            colorScheme="emerald"
          /><KpiCard
            icon="schedule"
            label="Pending"
            value={stats.pendingInvoices}
            colorScheme="orange"
          /><KpiCard
            icon="payments"
            label="Total Revenue"
            value={`₹${stats.totalRevenue.toLocaleString()}`}
            colorScheme="emerald"
          /></div>{/* Main Table */}
        <div className="bg-white rounded-lg shadow p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold text-gray-800">All Invoices</h2></div>{/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"><div><input
                type="text"
                value={searchTerm}
                onChange={(e) =>setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder="Search by name, ID, or invoice..."
              /></div><div><select
                value={statusFilter}
                onChange={(e) =>setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              ><option value="all">All Status</option><option value="paid">Paid</option><option value="pending">Pending</option></select></div><div><select
                value={courseFilter}
                onChange={(e) =>setCourseFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              ><option value="all">All Courses</option>{allCourses.map((course) =>(
                  <option key={course} value={course}>{course}
                  </option>))}
              </select></div></div>
          
          {loading ? (
            <TableSkeleton cols={7} rows={6} />
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500"><span className="material-symbols-outlined text-4xl block mb-4 text-gray-300">receipt_long</span><p className="font-medium">No invoices found</p></div>) : (<>
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[750px]"><thead><tr className="border-b-2 border-gray-200"><th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice ID</th><th className="text-left py-3 px-4 font-semibold text-gray-700">Student Name</th><th className="text-left py-3 px-4 font-semibold text-gray-700">Student ID</th><th className="text-left py-3 px-4 font-semibold text-gray-700">Course</th><th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th><th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th><th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th></tr></thead><tbody>{filteredInvoices.slice((currentPage-1)*pageSize, currentPage*pageSize).map((invoice) =>(
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="py-3 px-4 text-gray-700 font-mono">{invoice.id}</td><td className="py-3 px-4 text-gray-700">{invoice.studentName}</td><td className="py-3 px-4 text-gray-700">{invoice.studentId}</td><td className="py-3 px-4 text-gray-700">{invoice.course}</td><td className="py-3 px-4 font-semibold text-gray-900">₹{invoice.total?.toLocaleString()}</td><td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          invoice.paymentStatus?.toLowerCase() === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : invoice.paymentStatus?.toLowerCase() === 'processing'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                        }`}>{invoice.paymentStatus}
                        </span></td><td className="py-3 px-4"><div className="flex gap-2"><button
                            onClick={() =>handleView(invoice)}
                            className="p-2 hover:bg-green-100 text-green-600 rounded transition"
                            title="View details"
                          ><span className="material-symbols-outlined text-lg">visibility</span></button><button
                            onClick={() =>handleDownloadPDF(invoice)}
                            className="p-2 hover:bg-green-100 text-green-600 rounded transition"
                            title="Download PDF"
                          ><span className="material-symbols-outlined text-lg">download</span></button><button
                            onClick={() =>handlePrint(invoice)}
                            className="p-2 hover:bg-purple-100 text-purple-600 rounded transition"
                            title="Print"
                          ><span className="material-symbols-outlined text-lg">print</span></button><button
                            onClick={() =>handleDelete(invoice.id)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded transition"
                            title="Delete"
                          ><span className="material-symbols-outlined text-lg">delete</span></button></div></td></tr>))}
                </tbody></table></div>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.max(1, Math.ceil(filteredInvoices.length / pageSize))}
                onPageChange={setCurrentPage}
                totalItems={filteredInvoices.length}
                pageSize={pageSize}
                onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
              />
            </>)}
        </div></PageContainer>{/* Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Invoice Details</h2><button
                onClick={() =>setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              ></button></div>{/* College Header */}
            <div className="text-center border-b pb-6 mb-6"><h3 className="font-bold text-lg">College Management System</h3><p className="text-sm text-gray-600">123 University Road, Education City</p><p className="text-sm text-gray-600">Phone: +91-9876543210</p></div>{/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6 mb-6"><div><h4 className="font-bold text-gray-800 mb-3">Student Information</h4><div className="space-y-2 text-sm"><p><span className="text-gray-600">ID:</span><span className="font-semibold">{selectedInvoice.studentId}</span></p><p><span className="text-gray-600">Name:</span><span className="font-semibold">{selectedInvoice.studentName}</span></p><p><span className="text-gray-600">Course:</span><span className="font-semibold">{selectedInvoice.course}</span></p></div></div><div><h4 className="font-bold text-gray-800 mb-3">Invoice Details</h4><div className="space-y-2 text-sm"><p><span className="text-gray-600">Invoice #:</span><span className="font-semibold">{selectedInvoice.id}</span></p><p><span className="text-gray-600">Date:</span><span className="font-semibold">{selectedInvoice.generatedDate ||
                        new Date().toISOString().split('T')[0]}
                    </span></p><p><span className="text-gray-600">Status:</span><span className="font-semibold">{selectedInvoice.paymentStatus}</span></p></div></div></div>{/* Fee Breakdown */}
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
            <div className="grid grid-cols-2 md:flex gap-3"><button
                onClick={() =>handleDownloadPDF(selectedInvoice)}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 transition flex items-center justify-center gap-2"
              ><span className="material-symbols-outlined">download</span>Download PDF
              </button><button
                onClick={() =>handlePrint(selectedInvoice)}
                className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-2"
              ><span className="material-symbols-outlined">print</span>Print
              </button><button
                onClick={() =>handleSendEmail(selectedInvoice)}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
              ><span className="material-symbols-outlined">mail</span>Email
              </button><button
                onClick={() =>{
                  handleDelete(selectedInvoice.id);
                  setShowDetailModal(false);
                }}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2"
              ><span className="material-symbols-outlined">delete</span>Delete
              </button></div><button
              onClick={() =>setShowDetailModal(false)}
              className="w-full mt-4 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
            >Close
            </button></div></div>)}
    </Layout>);
}
