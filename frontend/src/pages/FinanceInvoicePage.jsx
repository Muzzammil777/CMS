import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { PageContainer, StatsSection, TableSkeleton } from '../components/common';
import { API_BASE } from '../api/apiBase';

export default function FinanceInvoicePage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/invoices`);
            if (response.ok) {
                const data = await response.json();
                // Filter to only show payroll-linked invoices for this page
                setInvoices(data.filter(inv => inv.payroll_id));
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleStatusUpdate = async (invoiceId, newStatus) => {
        try {
            const response = await fetch(`${API_BASE}/invoices/${invoiceId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_status: newStatus,
                    paid_date: newStatus === 'Paid' ? new Date().toISOString() : null
                }),
            });

            if (response.ok) {
                // Refresh invoices
                fetchInvoices();
                alert(`Invoice status updated to ${newStatus}`);
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error updating status');
        }
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter((invoice) => {
            // Focus on Giritharan and Jeevan as requested
            const staffName = invoice.staff_name?.toLowerCase() || '';
            const isRequestedStaff = staffName.includes('giritharan') || staffName.includes('jeevan');

            if (!isRequestedStaff) return false;

            const matchesSearch =
                staffName.includes(searchTerm.toLowerCase()) ||
                invoice.invoice_id?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus =
                statusFilter === 'all' ||
                invoice.payment_status?.toLowerCase() === statusFilter.toLowerCase();

            return matchesSearch && matchesStatus;
        });
    }, [invoices, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        return {
            total: invoices.length,
            pending: invoices.filter(inv => inv.payment_status === 'Draft' || inv.payment_status === 'Processing').length,
            paid: invoices.filter(inv => inv.payment_status === 'Paid').length,
        };
    }, [invoices]);

    return (
        <Layout title="Payroll Invoices">
            <PageContainer>
                {/* Stats Section */}
                <StatsSection stats={[
                    { value: stats.total, label: 'Total Invoices', icon: 'description' },
                    { value: stats.pending, label: 'Pending Action', icon: 'pending_actions' },
                    { value: stats.paid, label: 'Total Paid', icon: 'check_circle' },
                    { value: filteredInvoices.length, label: 'Filtered Results', icon: 'filter_alt' },
                ]} />

                {/* Filters & Search */}
                <div className="bg-white p-6 rounded-lg shadow border border-slate-100">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                type="text"
                                placeholder="Search staff name or invoice ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 transition-all text-sm"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
                            {['all', 'Draft', 'Processing', 'Paid'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${statusFilter === status
                                        ? 'bg-green-700 text-white shadow-md'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Invoices Table */}
                {loading ? (
                    <TableSkeleton cols={6} rows={8} />
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice ID</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff Details</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pay Period</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-slate-400">No invoices found.</td>
                                        </tr>
                                    ) : (
                                    filteredInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-mono font-bold text-slate-800">{invoice.invoice_id}</span>
                                                <p className="text-[10px] text-slate-400 mt-1">Ref: {invoice.payroll_id.substring(0, 8)}...</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800">{invoice.staff_name}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">ID: {invoice.staff_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                                                    <span className="text-sm font-medium">{invoice.pay_period}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-slate-900">₹{invoice.total_amount.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-widest ${invoice.payment_status === 'Paid'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : invoice.payment_status === 'Processing'
                                                        ? 'bg-green-50 text-green-600 border-green-100'
                                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                                    }`}>
                                                    {invoice.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    {invoice.payment_status === 'Draft' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(invoice.id, 'Processing')}
                                                            className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-bold hover:bg-green-800 transition shadow-sm"
                                                        >
                                                            Process Payment
                                                        </button>
                                                    )}
                                                    {invoice.payment_status === 'Processing' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(invoice.id, 'Paid')}
                                                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
                                                        >
                                                            Mark as Paid
                                                        </button>
                                                    )}
                                                    {invoice.payment_status === 'Paid' && (
                                                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                                            <span className="material-symbols-outlined text-sm">verified_user</span>
                                                            Completed
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}
            </PageContainer>
        </Layout>
    );
}
