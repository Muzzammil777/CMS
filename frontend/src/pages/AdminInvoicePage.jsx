import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import EnterprisePageTemplate from '../components/EnterprisePageTemplate';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { listInvoices, deleteInvoice } from '../api/invoicesApi';
import { Eye, Trash2, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function AdminInvoicePage() {
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

  const handleDelete = async (invoiceId) => {
    if (!window.confirm('Delete this invoice record permanently?')) return;
    try {
      await deleteInvoice(invoiceId);
      fetchInvoices();
    } catch (err) {
      alert(`Error deleting invoice: ${err.message}`);
    }
  };

  // Filter logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
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
  }, [invoices, searchQuery, activeFilters]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredInvoices.length) return alert('No invoices to export');
    const rows = filteredInvoices.map((i) => ({
      'Invoice ID': i.id || i.invoice_id,
      Student: i.studentName,
      'Student ID': i.studentId,
      Course: i.course,
      Amount: i.totalAmount || i.amount,
      'Due Date': i.dueDate,
      Status: i.paymentStatus || i.status,
    }));
    const header = Object.keys(rows[0]).join(',');
    const csv = [header, ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // KPI Cards
  const totalAmount = invoices.reduce((acc, i) => acc + (i.totalAmount || i.amount || 0), 0);
  const paidCount = invoices.filter((i) => (i.paymentStatus || i.status || '').toLowerCase() === 'paid').length;
  const pendingCount = invoices.filter((i) => (i.paymentStatus || i.status || '').toLowerCase() === 'pending').length;
  const overdueCount = invoices.filter((i) => (i.paymentStatus || i.status || '').toLowerCase() === 'overdue').length;

  const kpiCards = [
    {
      title: 'Total Invoiced Amount',
      value: `₹${(totalAmount / 100000).toFixed(2)}L`,
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
      trend: `${(((paidCount || 0) / (invoices.length || 1)) * 100).toFixed(1)}% paid`,
      trendUp: true,
      icon: <CheckCircle2 className="w-5 h-5" />,
      gradient: 'emerald',
    },
    {
      title: 'Pending Payment',
      value: pendingCount.toLocaleString(),
      sub: 'Awaiting student clearing',
      trend: 'Follow-up sent',
      trendUp: false,
      icon: <Clock className="w-5 h-5" />,
      gradient: 'amber',
    },
    {
      title: 'Overdue Invoices',
      value: overdueCount.toLocaleString(),
      sub: 'Past due date',
      trend: overdueCount > 0 ? 'Urgent collection' : 'Zero overdue',
      trendUp: overdueCount === 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      gradient: 'rose',
    },
  ];

  const statusStyles = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
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
            <p className="text-[10px] text-[#8C98A5] font-medium truncate">Due: {i.dueDate || 'N/A'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'studentName',
      label: 'Student Name',
      render: (_, i) => (
        <div>
          <span className="text-xs font-bold text-[#003A40] block truncate">{i.studentName || 'Student'}</span>
          <span className="text-[10px] text-[#8C98A5]">{i.studentId || i.id}</span>
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
          ₹{(i.totalAmount || i.amount || 0).toLocaleString('en-IN')}
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
      icon: <Trash2 className="w-3.5 h-3.5" />,
      label: 'Delete Invoice',
      color: 'red',
      onClick: (i) => handleDelete(i.id || i.invoice_id),
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
      ],
    },
  ];

  return (
    <Layout title="Invoices">
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
          searchPlaceholder="Search invoice by student name, ID, course..."
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
            <h3 className="text-base font-bold text-[#003A40] mb-4">Invoice Details — {selectedInvoice.id}</h3>
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
                <span className="font-bold text-[#003A40]">₹{(selectedInvoice.totalAmount || selectedInvoice.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Due Date:</span>
                <span className="font-bold text-[#003A40]">{selectedInvoice.dueDate || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-sm text-[#003A40] pt-2">
                <span>Status:</span>
                <span className="text-emerald-600">{selectedInvoice.paymentStatus || selectedInvoice.status}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedInvoice(null)}
              className="w-full py-2 bg-[#003A40] text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-[#0A686A] transition-colors"
            >
              Close Invoice
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
