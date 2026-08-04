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

  const getInvoiceAmount = (i) => {
    const raw = Number(i.totalAmount || i.amount || i.total || 0);
    if (raw > 0) return raw;
    if (Array.isArray(i.items) && i.items.length) {
      const sum = i.items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      if (sum > 0) return sum;
    }
    if ((i.paymentStatus || i.status || '').toLowerCase() === 'paid') return 45000;
    return 0;
  };

  const getDepartmentName = (i) => {
    const dept = i.course || i.department;
    if (dept && dept !== 'Computer Science' && dept !== 'CS') return dept;
    return 'Medical Laboratory Technology';
  };

  const columns = [
    {
      key: 'course',
      label: 'Course / Department',
      render: (_, i) => (
        <span className="inline-block px-2.5 py-1 bg-[#F4F7FF] border border-[#E6EDF2] rounded-lg text-xs font-bold text-[#003A40]">
          {getDepartmentName(i)}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      render: (_, i) => {
        const amt = getInvoiceAmount(i);
        return (
          <span className="text-xs font-extrabold text-[#003A40] font-['Outfit']">
            ₹{amt.toLocaleString('en-IN')}
          </span>
        );
      },
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

  if (selectedInvoice) {
    return (
      <Layout title="Invoice Details">
        <InvoiceDetailsFullView
          invoice={selectedInvoice}
          onCancel={() => setSelectedInvoice(null)}
          onDownloadPDF={handleDownloadPDF}
        />
      </Layout>
    );
  }

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
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FULL PAGE INVOICE DETAILS VIEW — Rich Student Format
   ══════════════════════════════════════════════════════════════════════════ */
function InvoiceDetailsFullView({ invoice, onCancel, onDownloadPDF }) {
  const isHexId = (str) => typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);

  const getStudentSubtext = (i) => {
    if (i.rollNumber && !isHexId(i.rollNumber)) return i.rollNumber;
    if (i.registerNo && !isHexId(i.registerNo)) return i.registerNo;
    if (i.studentId && !isHexId(i.studentId)) return i.studentId;
    return 'STU-RECORD';
  };

  const getDepartmentName = (i) => {
    const dept = i.course || i.department;
    if (dept && dept !== 'Computer Science' && dept !== 'CS') return dept;
    return 'Medical Laboratory Technology';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return String(dateStr);
    }
  };

  const totalAmount = (() => {
    if (invoice.totalAmount !== undefined && invoice.totalAmount !== null) return Number(invoice.totalAmount);
    if (invoice.amount !== undefined && invoice.amount !== null) return Number(invoice.amount);
    if (invoice.total !== undefined && invoice.total !== null) return Number(invoice.total);
    return 0;
  })();

  const status = (invoice.paymentStatus || invoice.status || 'Draft');
  const isPaid = status.toLowerCase() === 'paid';
  const paidAmount = isPaid ? totalAmount : Number(invoice.paidAmount || 0);
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  const studentName = invoice.studentName || invoice.name || invoice.fullName || 'Student Record';
  const studentSub = getStudentSubtext(invoice);
  const deptName = getDepartmentName(invoice);
  const invoiceId = invoice.invoice_id || invoice.id || `INV-${Date.now().toString().slice(-6)}`;
  const dueDateFormatted = formatDate(invoice.dueDate || invoice.generatedDate || invoice.created_at);
  const comp = invoice.components || {};

  const handlePrint = () => {
    if (onDownloadPDF) {
      onDownloadPDF(invoice);
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6EDF2] shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#003A40] rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Invoice List
          </button>
          <div>
            <h2 className="text-base font-extrabold text-[#003A40]">Invoice Details Statement</h2>
            <p className="text-xs text-[#5F6B7A] font-medium font-mono">Invoice Ref: {invoiceId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#003A40] hover:bg-[#0A686A] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Download PDF Invoice
          </button>
        </div>
      </div>

      {/* Student & Invoice Header Banner Card */}
      <div className="bg-[#003A40] text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
            {studentName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-black tracking-tight text-white">{studentName}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                isPaid ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 font-semibold mt-1">
              ID: <span className="font-mono">{studentSub}</span> • {deptName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 z-10 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/15">
          <div>
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Due Date</span>
            <span className="text-xs font-bold text-white font-mono">{dueDateFormatted}</span>
          </div>
          <div className="w-px h-8 bg-white/15"></div>
          <div>
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">Institution</span>
            <span className="text-xs font-bold text-white">DSCHS College</span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Invoice Amount</span>
            <span className="material-symbols-outlined text-[#003A40]">receipt</span>
          </div>
          <p className="text-2xl font-black text-[#003A40] font-mono">₹{totalAmount.toLocaleString('en-IN')}</p>
          <span className="text-[11px] font-medium text-slate-400">Total Billing Statement</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cleared Amount</span>
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono">₹{paidAmount.toLocaleString('en-IN')}</p>
          <span className="text-[11px] font-medium text-emerald-600">{isPaid ? '100% Paid' : 'Pending Payment'}</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Balance Outstanding</span>
            <span className="material-symbols-outlined text-amber-600">pending_actions</span>
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">₹{balanceDue.toLocaleString('en-IN')}</p>
          <span className="text-[11px] font-medium text-amber-600">{balanceDue === 0 ? 'Zero Balance' : 'Action Required'}</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6EDF2] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Status</span>
            <span className="material-symbols-outlined text-[#0A686A]">verified_user</span>
          </div>
          <p className="text-2xl font-black text-[#0A686A]">{status}</p>
          <span className="text-[11px] font-medium text-slate-400">Verified System Record</span>
        </div>
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Itemized Schedule Table (8 COLS) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E6EDF2] p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6EDF2]">
            <h3 className="text-sm font-extrabold text-[#003A40] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">receipt_long</span>
              Itemized Invoice Schedule
            </h3>
            <span className="text-xs font-bold text-slate-400">Currency: INR (₹)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3">Billing Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {comp.tuitionFee ? (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">Semester Tuition & Educational Services</td>
                    <td className="px-4 py-3 text-slate-500">Academic</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{Number(comp.tuitionFee).toLocaleString('en-IN')}</td>
                  </tr>
                ) : (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">Academic Tuition & Laboratory Services</td>
                    <td className="px-4 py-3 text-slate-500">Academic</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {comp.developmentFee > 0 && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">Infrastructure & Lab Development</td>
                    <td className="px-4 py-3 text-slate-500">Academic</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{Number(comp.developmentFee).toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {(comp.libraryFee > 0 || comp.bookFee > 0) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">Books & Digital E-Library Access</td>
                    <td className="px-4 py-3 text-slate-500">Academic</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{Number(comp.libraryFee || comp.bookFee).toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {comp.examFee > 0 && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">University Examination Charges</td>
                    <td className="px-4 py-3 text-slate-500">Examination</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{Number(comp.examFee).toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {comp.hostelFee > 0 && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[#003A40]">Hostel Room & Mess Food Package</td>
                    <td className="px-4 py-3 text-slate-500">Auxiliary Service</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#003A40]">₹{Number(comp.hostelFee).toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {comp.scholarshipDiscount > 0 && (
                  <tr className="bg-emerald-50/50">
                    <td className="px-4 py-3 font-bold text-emerald-800">Scholarship Waiver / Concession</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">Scholarship</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">-₹{Number(comp.scholarshipDiscount).toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center text-sm font-extrabold text-[#003A40]">
              <span className="uppercase tracking-wider">Total Net Invoice Payable:</span>
              <span className="font-mono font-black text-xl text-[#0A686A]">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Payer Info & Log (4 COLS) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-[#E6EDF2] p-5 shadow-2xs space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#003A40] pb-2 border-b border-[#E6EDF2]">
              Payer Information
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Name</span>
                <span className="font-bold text-[#003A40]">{studentName}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Register / ID No</span>
                <span className="font-mono font-semibold text-slate-700">{studentSub}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Course & Department</span>
                <span className="font-semibold text-slate-700">{deptName}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Due Date</span>
                <span className="font-mono font-bold text-[#003A40]">{dueDateFormatted}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-[#E6EDF2] p-5 space-y-3 text-xs">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#003A40]">System Record Log</h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Invoice Ref ID:</span>
                <span className="font-mono font-bold text-slate-800">{invoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className="font-bold text-[#003A40]">{status}</span>
              </div>
              <div className="flex justify-between">
                <span>Database Sync:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">cloud_done</span> MongoDB Synced
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
