import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { StatsSection, TableSkeleton } from '../components/common';
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
            <div className="space-y-8">
                {/* Stats Section */}
                <StatsSection stats={[
                    { value: stats.total, label: 'Total Invoices', icon: 'description' },
                    { value: stats.pending, label: 'Pending Action', icon: 'pending_actions' },
                    { value: stats.paid, label: 'Total Paid', icon: 'check_circle' },
                    { value: filteredInvoices.length, label: 'Filtered Results', icon: 'filter_alt' },
                ]} />

                {/* Combined Table Card matching FeesPage.jsx */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    {/* Header & Controls */}
                    <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
                        <div className="flex gap-4 flex-wrap">
                            <input
                                type="text"
                                placeholder="Search staff name or invoice ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-[200px]"
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Draft">Draft</option>
                                <option value="Processing">Processing</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                                    <th className="px-6 py-4">Invoice ID</th>
                                    <th className="px-6 py-4">Staff Details</th>
                                    <th className="px-6 py-4">Pay Period</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="p-0">
                                            <TableSkeleton cols={6} rows={5} />
                                        </td>
                                    </tr>
                                ) : filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-10 py-24 text-center text-slate-400 bg-slate-50/30">
                                            <div className="flex flex-col items-center">
                                                <span className="material-symbols-outlined text-6xl mb-4 opacity-10 text-slate-900">receipt_long</span>
                                                <p className="text-base font-bold text-slate-500">No invoices found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map((invoice) => {
                                        let statusBadge = "bg-slate-100 text-slate-800";
                                        if (invoice.payment_status === 'Paid') statusBadge = "bg-emerald-100 text-emerald-800";
                                        else if (invoice.payment_status === 'Processing') statusBadge = "bg-green-100 text-green-800";
                                        else if (invoice.payment_status === 'Draft') statusBadge = "bg-slate-100 text-slate-600";

                                        return (
                                            <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className="font-semibold text-slate-900 text-sm">{invoice.invoice_id}</span>
                                                        <p className="text-xs text-slate-500 mt-1">Ref: {invoice.payroll_id.substring(0, 8)}...</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-semibold text-slate-900 text-sm">{invoice.staff_name}</p>
                                                        <p className="text-xs text-slate-500">ID: {invoice.staff_id}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-sm">calendar_month</span>
                                                        {invoice.pay_period}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-slate-700">₹{invoice.total_amount.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider inline-block ${statusBadge}`}>
                                                        {invoice.payment_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {invoice.payment_status === 'Draft' && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(invoice.id, 'Processing')}
                                                                className="px-2 py-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg transition text-[10px] font-extrabold uppercase shadow-sm"
                                                            >
                                                                Process Payment
                                                            </button>
                                                        )}
                                                        {invoice.payment_status === 'Processing' && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(invoice.id, 'Paid')}
                                                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg transition text-[10px] font-extrabold uppercase shadow-sm"
                                                            >
                                                                Mark as Paid
                                                            </button>
                                                        )}
                                                        {invoice.payment_status === 'Paid' && (
                                                            <div className="flex items-center justify-center gap-1 text-emerald-600 text-[11px] font-bold uppercase tracking-wider">
                                                                <span className="material-symbols-outlined text-sm">verified_user</span>
                                                                Completed
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
