import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import EnterprisePageTemplate from '../components/EnterprisePageTemplate';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { listInvoices } from '../api/invoicesApi';
import { Eye, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { getUserSession } from '../auth/sessionController';
import { jsPDF } from 'jspdf';

export default function InvoicePage() {
  const session = getUserSession();
  const studentId = session?.userId;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({ status: '', course: '' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    window.addEventListener('invoiceUpdated', fetchInvoices);
    return () => window.removeEventListener('invoiceUpdated', fetchInvoices);
  }, [fetchInvoices]);

  const studentInvoices = useMemo(() => {
    let filtered = invoices;
    if (studentId) {
      filtered = filtered.filter((inv) => inv.studentId === studentId);
    }
    return filtered;
  }, [invoices, studentId]);

  // Filter logic
  const filteredInvoices = useMemo(() => {
    return studentInvoices.filter((inv) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (inv.studentName || '').toLowerCase().includes(q) ||
        (inv.studentId || inv.id || '').toLowerCase().includes(q) ||
        (inv.course || '').toLowerCase().includes(q);

      const st = (inv.paymentStatus || inv.status || 'Pending').toLowerCase();
      const matchStatus = !activeFilters.status || st === activeFilters.status.toLowerCase();

      const crs = (inv.course || '').toLowerCase();
      const matchCourse = !activeFilters.course || crs.includes(activeFilters.course.toLowerCase());

      return matchSearch && matchStatus && matchCourse;
    });
  }, [studentInvoices, searchQuery, activeFilters]);

  const handleDownloadPDF = (invoice) =>{
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('INVOICE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

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

    pdf.setDrawColor(200);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

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

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Invoice Details', pageWidth / 2, yPosition);
    yPosition += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Invoice #: ${invoice.id || invoice.invoice_id}`, pageWidth / 2, yPosition);
    yPosition += 5;
    pdf.text(`Date: ${invoice.generatedDate || invoice.dueDate || 'N/A'}`, pageWidth / 2, yPosition);
    yPosition += 5;
    pdf.text(`Status: ${invoice.paymentStatus || invoice.status}`, pageWidth / 2, yPosition);
    yPosition += 10;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Fee Breakdown', 20, yPosition);
    yPosition += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', 20, yPosition);
    pdf.text('Amount (₹)', pageWidth - 40, yPosition, { align: 'right' });
    yPosition += 5;

    pdf.setDrawColor(200);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;

    pdf.setFont('helvetica', 'normal');
    if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
      invoice.items.forEach((item) =>{
        pdf.text(item.description || 'Fee', 20, yPosition);
        pdf.text((item.amount || invoice.amount || 0).toString(), pageWidth - 40, yPosition, { align: 'right' });
        yPosition += 5;
      });
    } else {
      pdf.text('Tuition Fee', 20, yPosition);
      pdf.text((invoice.totalAmount || invoice.amount || invoice.total || 0).toString(), pageWidth - 40, yPosition, { align: 'right' });
      yPosition += 5;
    }

    yPosition += 3;
    pdf.setDrawColor(200);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Total Amount', 20, yPosition);
    pdf.text(`₹${invoice.totalAmount || invoice.amount || invoice.total || 0}`, pageWidth - 40, yPosition, { align: 'right' });
    yPosition += 10;

    if (invoice.paymentStatus === 'Paid' || invoice.status === 'Paid') {
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

    pdf.save(`invoice_${invoice.id || invoice.invoice_id}.pdf`);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredInvoices.length) return alert('No invoices to export');
    const rows = filteredInvoices.map((i) => ({
      'Invoice ID': i.id || i.invoice_id,
      Student: i.studentName,
      'Student ID': i.studentId,
      Course: i.course,
      Amount: i.totalAmount || i.amount || i.total,
      'Due Date': i.dueDate || i.generatedDate,
      Status: i.paymentStatus || i.status,
    }));
    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_invoices_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // KPI Cards
  const totalAmount = studentInvoices.reduce((acc, i) => acc + (i.totalAmount || i.amount || i.total || 0), 0);
  const paidCount = studentInvoices.filter((i) => (i.paymentStatus || i.status || '').toLowerCase() === 'paid').length;
  const pendingCount = studentInvoices.filter((i) => (i.paymentStatus || i.status || '').toLowerCase() === 'pending').length;
  const overdueCount = studentInvoices.filter((i) => (i.paymentStatus || i.status || '').toLowerCase() === 'overdue').length;

  const kpiCards = [
    {
      title: 'My Total Billed',
      value: `₹${(totalAmount).toLocaleString()}`,
      sub: 'Issued invoice records',
      trend: 'Automated billing',
      trendUp: true,
      icon: <FileText className="w-5 h-5" />,
      gradient: 'indigo',
    },
    {
      title: 'Paid Invoices',
      value: paidCount.toLocaleString(),
      sub: 'Payment confirmed',
      trend: `${(((paidCount || 0) / (studentInvoices.length || 1)) * 100).toFixed(1)}% paid`,
      trendUp: true,
      icon: <CheckCircle2 className="w-5 h-5" />,
      gradient: 'emerald',
    },
    {
      title: 'Pending Payment',
      value: pendingCount.toLocaleString(),
      sub: 'Awaiting student clearing',
      trend: 'Pay soon',
      trendUp: false,
      icon: <Clock className="w-5 h-5" />,
      gradient: 'amber',
    },
    {
      title: 'Overdue',
      value: overdueCount.toLocaleString(),
      sub: 'Past due date',
      trend: overdueCount > 0 ? 'Urgent action needed' : 'Zero overdue',
      trendUp: overdueCount === 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      gradient: 'rose',
    },
  ];

  const statusStyles = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
  };

  const columns = [
    {
      key: 'invoice_id',
      label: 'Invoice Details',
      render: (_, i) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F4F7FF] border border-[#E6EDF2] text-[#003A40] flex items-center justify-center font-bold text-xs flex-shrink-0">
            <FileText className="w-4 h-4 text-[#0A686A]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#003A40] truncate leading-tight">{i.id || i.invoice_id || 'INV'}</p>
            <p className="text-[10px] text-[#8C98A5] font-medium truncate">Due: {i.dueDate || i.generatedDate || 'N/A'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      label: 'Course / Department',
      render: (_, i) => (
        <span className="inline-block px-2.5 py-1 bg-[#F4F7FF] border border-[#E6EDF2] rounded-lg text-xs font-bold text-[#003A40]">
          {i.course || 'Computer Science'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      render: (_, i) => (
        <span className="text-xs font-extrabold text-[#003A40] font-['Outfit']">
          ₹{(i.totalAmount || i.amount || i.total || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      render: (_, i) => {
        const st = (i.paymentStatus || i.status || 'Pending').toUpperCase();
        const cls = statusStyles[st] || statusStyles.PENDING;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
            {i.paymentStatus || i.status || 'Pending'}
          </span>
        );
      },
    },
  ];

  const tableActions = [
    {
      icon: <Eye className="w-3.5 h-3.5" />,
      label: 'View Invoice',
      color: 'teal',
      onClick: (i) => setSelectedInvoice(i),
    },
    {
      icon: <FileText className="w-3.5 h-3.5" />,
      label: 'Download PDF',
      color: 'indigo',
      onClick: (i) => handleDownloadPDF(i),
    },
  ];

  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Paid', label: 'Paid' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Overdue', label: 'Overdue' },
        { value: 'Failed', label: 'Failed' },
      ],
    },
  ];

  return (
    <Layout title="My Invoices">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <EnterprisePageTemplate
          kpiCards={kpiCards}
          columns={columns}
          rows={filteredInvoices}
          actions={tableActions}
          rowKey="id"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search invoice by ID or course..."
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters((prev) => ({ ...prev, [key]: val }))}
          onExportCSV={handleExportCSV}
          loading={false}
          emptyMessage="No invoices match your search."
        />
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-[#003A40] mb-4">Invoice Details — {selectedInvoice.id || selectedInvoice.invoice_id}</h3>
            <div className="space-y-2 text-xs text-[#5F6B7A] mb-6">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Student Name:</span>
                <span className="font-bold text-[#003A40]">{selectedInvoice.studentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Course:</span>
                <span className="font-bold text-[#003A40]">{selectedInvoice.course}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Total Amount:</span>
                <span className="font-bold text-[#003A40]">₹{(selectedInvoice.totalAmount || selectedInvoice.amount || selectedInvoice.total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Due Date:</span>
                <span className="font-bold text-[#003A40]">{selectedInvoice.dueDate || selectedInvoice.generatedDate || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-sm text-[#003A40] pt-2">
                <span>Status:</span>
                <span className="text-emerald-600">{selectedInvoice.paymentStatus || selectedInvoice.status}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadPDF(selectedInvoice)}
                className="flex-1 py-2 bg-[#F4F7FF] text-[#0A686A] rounded-xl font-bold text-xs cursor-pointer hover:bg-indigo-50 transition-colors"
              >
                Download PDF
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-2 bg-[#003A40] text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-[#0A686A] transition-colors"
              >
                Close Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
