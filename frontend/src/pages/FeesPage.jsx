import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import EnterprisePageTemplate from '../components/EnterprisePageTemplate';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { listFees, updateFeePayment } from '../api/feesApi';
import { listInvoices, updateInvoiceStatus, createInvoice } from '../api/invoicesApi';
import { CreditCard, FileText, CheckCircle2, Clock, AlertTriangle, IndianRupee } from 'lucide-react';
import { getUserSession } from '../auth/sessionController';
import { jsPDF } from 'jspdf';

export default function FeesPage() {
  const session = getUserSession();
  const studentId = session?.userId;

  const [fees, setFees] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({ status: '', semester: '' });
  
  // Payment Modal States
  const [selectedFee, setSelectedFee] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({
    cardHolderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    upiId: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [feesData, invoicesData] = await Promise.all([
        listFees(),
        listInvoices()
      ]);
      setFees(Array.isArray(feesData) ? feesData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener('feeAssignmentUpdated', fetchData);
    window.addEventListener('invoiceUpdated', fetchData);
    return () => {
      window.removeEventListener('feeAssignmentUpdated', fetchData);
      window.removeEventListener('invoiceUpdated', fetchData);
    };
  }, [fetchData]);

  const studentFees = useMemo(() => {
    return fees.filter((f) => f.studentId === studentId);
  }, [fees, studentId]);

  const filteredFees = useMemo(() => {
    return studentFees.filter((fee) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        (fee.course || '').toLowerCase().includes(q) || 
        (fee.semester || '').toLowerCase().includes(q);

      const st = (fee.paymentStatus || 'Pending').toLowerCase();
      const matchStatus = !activeFilters.status || st === activeFilters.status.toLowerCase();

      const sem = (fee.semester || '').toLowerCase();
      const matchSem = !activeFilters.semester || sem.includes(activeFilters.semester.toLowerCase());

      return matchSearch && matchStatus && matchSem;
    });
  }, [studentFees, searchQuery, activeFilters]);

  // Payment Logic
  const handlePayClick = (fee) => {
    setSelectedFee(fee);
    setPaymentMethod('');
    setPaymentDetails({ cardHolderName: '', cardNumber: '', expiryDate: '', cvv: '', upiId: '' });
    setShowPaymentModal(true);
  };

  const handlePaymentDetailsChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cardNumber') {
      formattedValue = value.replace(/\D/g, '').slice(0, 16);
      if (formattedValue.length > 0) {
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

    setPaymentDetails(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleSelectPaymentMethod = () => {
    if (!paymentMethod) return alert('Please select a payment method');
    setShowPaymentModal(false);
    setShowPaymentForm(true);
  };

  const handleProcessPayment = () => {
    if (paymentMethod === 'Debit Card' || paymentMethod === 'Credit Card') {
      if (!paymentDetails.cardHolderName || !paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv) {
        return alert('Please fill all card details');
      }
    } else if (paymentMethod === 'UPI') {
      if (!paymentDetails.upiId) {
        return alert('Please enter UPI ID');
      }
    }

    setShowPaymentForm(false);
    setShowProcessing(true);

    setTimeout(async () => {
      // Simulate 90% success rate
      if (Math.random() > 0.1) {
        const txnId = `TXN${Math.random().toString().slice(2, 8)}`;
        setTransactionId(txnId);

        try {
          await updateFeePayment(selectedFee.id, {
            paymentStatus: 'paid',
            paidDate: new Date().toISOString().split('T')[0],
            transactionId: txnId,
            paymentMethod: paymentMethod,
          });

          const existingInvoice = invoices.find(inv => inv.generatedFrom === selectedFee.id);
          if (existingInvoice) {
            await updateInvoiceStatus(existingInvoice.id, {
              payment_status: 'Paid',
              paid_date: new Date().toISOString(),
              payment_method: paymentMethod,
              transaction_id: txnId,
            });
          } else {
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
            if (selectedFee.hostelFee > 0) newInvoicePayload.items.push({ description: 'Hostel Fee', amount: selectedFee.hostelFee });
            if (selectedFee.miscFee > 0) newInvoicePayload.items.push({ description: 'Misc Fee', amount: selectedFee.miscFee });
            
            await createInvoice(newInvoicePayload);
          }

          fetchData();
          setShowProcessing(false);
          setShowSuccess(true);
        } catch (err) {
          setShowProcessing(false);
          alert(`Failed to save payment: ${err.message}`);
        }
      } else {
        setShowProcessing(false);
        alert('Payment failed. Please try again.');
        setSelectedFee(null);
      }
    }, 2000);
  };

  // KPI calculations
  const totalAssigned = studentFees.length;
  const paidCount = studentFees.filter(f => f.paymentStatus?.toLowerCase() === 'paid').length;
  const pendingCount = studentFees.filter(f => f.paymentStatus?.toLowerCase() === 'pending').length;
  const totalAmount = studentFees.reduce((acc, f) => acc + (Number(f.totalFee) || 0), 0);
  const pendingAmount = studentFees
    .filter(f => f.paymentStatus?.toLowerCase() !== 'paid')
    .reduce((acc, f) => acc + (Number(f.totalFee) || 0), 0);

  const kpiCards = [
    {
      title: 'Total Fees Assigned',
      value: `₹${totalAmount.toLocaleString()}`,
      sub: `${totalAssigned} fee records`,
      trend: 'Lifetime value',
      trendUp: true,
      icon: <IndianRupee className="w-5 h-5" />,
      gradient: 'indigo',
    },
    {
      title: 'Pending Amount',
      value: `₹${pendingAmount.toLocaleString()}`,
      sub: `${pendingCount} unpaid records`,
      trend: pendingAmount > 0 ? 'Payment required' : 'All clear',
      trendUp: pendingAmount === 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      gradient: pendingAmount > 0 ? 'rose' : 'emerald',
    },
    {
      title: 'Paid Fees',
      value: paidCount.toString(),
      sub: 'Successfully paid',
      trend: `${((paidCount / (totalAssigned || 1)) * 100).toFixed(1)}% complete`,
      trendUp: true,
      icon: <CheckCircle2 className="w-5 h-5" />,
      gradient: 'emerald',
    },
    {
      title: 'Pending Action',
      value: pendingCount.toString(),
      sub: 'Awaiting payment',
      trend: 'Pay soon',
      trendUp: false,
      icon: <Clock className="w-5 h-5" />,
      gradient: 'amber',
    }
  ];

  const statusStyles = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const columns = [
    {
      key: 'course',
      label: 'Fee Details',
      render: (_, f) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F4F7FF] border border-[#E6EDF2] text-[#003A40] flex items-center justify-center font-bold text-xs flex-shrink-0">
            <FileText className="w-4 h-4 text-[#0A686A]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#003A40] truncate leading-tight">{f.course || 'Course'}</p>
            <p className="text-[10px] text-[#8C98A5] font-medium truncate">{f.semester || 'Semester'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'assignedDate',
      label: 'Assigned On',
      render: (_, f) => (
        <span className="text-xs text-[#5F6B7A] font-medium">{f.assignedDate || 'N/A'}</span>
      ),
    },
    {
      key: 'totalFee',
      label: 'Amount',
      render: (_, f) => (
        <span className="text-xs font-extrabold text-[#003A40] font-['Outfit']">
          ₹{(Number(f.totalFee) || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      render: (_, f) => {
        const st = (f.paymentStatus || 'Pending').toUpperCase();
        const cls = statusStyles[st] || statusStyles.PENDING;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
            {f.paymentStatus || 'Pending'}
          </span>
        );
      },
    },
  ];

  const tableActions = [
    {
      icon: <CreditCard className="w-3.5 h-3.5" />,
      label: 'Pay Now',
      color: 'emerald',
      onClick: (f) => handlePayClick(f),
      showIf: (f) => (f.paymentStatus || 'Pending').toLowerCase() !== 'paid'
    }
  ];

  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Paid', label: 'Paid' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Processing', label: 'Processing' },
      ],
    },
    {
      key: 'semester',
      label: 'Semester',
      options: [1,2,3,4,5,6,7,8].map(s => ({ value: `Semester ${s}`, label: `Semester ${s}` }))
    }
  ];

  return (
    <Layout title="My Fees">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <EnterprisePageTemplate
          kpiCards={kpiCards}
          columns={columns}
          rows={filteredFees}
          actions={tableActions}
          rowKey="id"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search fees by course or semester..."
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters(prev => ({ ...prev, [key]: val }))}
          loading={false}
          emptyMessage="No fee assignments found."
        />
      )}

      {/* Payment Selection Modal */}
      {showPaymentModal && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-[#003A40] mb-4">Pay {selectedFee.semester} Fee</h3>
            <div className="bg-[#F4F7FF] border border-[#E6EDF2] rounded-xl p-4 mb-6">
              <p className="text-xs text-[#5F6B7A] mb-1">Total Amount Due</p>
              <p className="text-xl font-black text-[#0A686A]">₹{selectedFee.totalFee.toLocaleString()}</p>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold text-[#5F6B7A] mb-2 uppercase tracking-wide">Select Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E6EDF2] rounded-xl text-sm font-semibold text-[#003A40] outline-none focus:border-[#0A686A] focus:ring-2 focus:ring-[#0A686A]/20 transition-all"
              >
                <option value="">-- Select Payment Method --</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Credit Card">Credit Card</option>
                <option value="UPI">UPI</option>
                <option value="Net Banking">Net Banking</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedFee(null); }}
                className="flex-1 px-4 py-2.5 bg-[#F4F7FF] text-[#0A686A] rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectPaymentMethod}
                className="flex-1 px-4 py-2.5 bg-[#003A40] text-white rounded-xl text-sm font-bold hover:bg-[#02282d] transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Form Modal */}
      {showPaymentForm && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-[#003A40] mb-4">Complete Payment</h3>
            <div className="bg-[#F8FAFC] rounded-xl p-4 mb-6 border border-[#E6EDF2]">
              <div className="flex justify-between items-center text-xs font-bold text-[#003A40]">
                <span>Amount: ₹{selectedFee.totalFee.toLocaleString()}</span>
                <span className="px-2 py-0.5 bg-[#E6EDF2] rounded-md">{paymentMethod}</span>
              </div>
            </div>

            {(paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6B7A] mb-1">Card Holder Name *</label>
                  <input type="text" name="cardHolderName" value={paymentDetails.cardHolderName} onChange={handlePaymentDetailsChange} placeholder="John Doe" className="w-full px-4 py-2 bg-white border border-[#E6EDF2] rounded-xl text-sm font-medium focus:outline-none focus:border-[#0A686A] focus:ring-1 focus:ring-[#0A686A]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F6B7A] mb-1">Card Number *</label>
                  <input type="text" name="cardNumber" value={paymentDetails.cardNumber} onChange={handlePaymentDetailsChange} placeholder="1234 5678 9012 3456" className="w-full px-4 py-2 bg-white border border-[#E6EDF2] rounded-xl text-sm font-medium focus:outline-none focus:border-[#0A686A] focus:ring-1 focus:ring-[#0A686A]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5F6B7A] mb-1">Expiry Date *</label>
                    <input type="text" name="expiryDate" value={paymentDetails.expiryDate} onChange={handlePaymentDetailsChange} placeholder="MM/YY" className="w-full px-4 py-2 bg-white border border-[#E6EDF2] rounded-xl text-sm font-medium focus:outline-none focus:border-[#0A686A] focus:ring-1 focus:ring-[#0A686A]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5F6B7A] mb-1">CVV *</label>
                    <input type="text" name="cvv" value={paymentDetails.cvv} onChange={handlePaymentDetailsChange} placeholder="123" className="w-full px-4 py-2 bg-white border border-[#E6EDF2] rounded-xl text-sm font-medium focus:outline-none focus:border-[#0A686A] focus:ring-1 focus:ring-[#0A686A]" />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'UPI' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6B7A] mb-1">UPI ID / Mobile *</label>
                  <input type="text" name="upiId" value={paymentDetails.upiId} onChange={handlePaymentDetailsChange} placeholder="username@upi or 9876543210" className="w-full px-4 py-2 bg-white border border-[#E6EDF2] rounded-xl text-sm font-medium focus:outline-none focus:border-[#0A686A] focus:ring-1 focus:ring-[#0A686A]" />
                </div>
                <div className="bg-[#F4F7FF] p-4 rounded-xl border border-indigo-100 flex items-center justify-center h-32">
                  <span className="text-xs font-bold text-indigo-400">Scan QR Code Here</span>
                </div>
              </div>
            )}

            {paymentMethod === 'Net Banking' && (
              <div className="bg-[#F4F7FF] border border-indigo-100 rounded-xl p-4 mb-6">
                <p className="text-xs font-bold text-indigo-700">You will be redirected to your bank's secure portal.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPaymentForm(false); setShowPaymentModal(true); }}
                className="flex-1 px-4 py-2.5 bg-[#F8FAFC] border border-[#E6EDF2] text-[#5F6B7A] rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleProcessPayment}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Pay Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Modal */}
      {showProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E6EDF2] p-8 max-w-sm w-full shadow-xl text-center">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-bold text-[#003A40] mb-2">Processing Payment</h3>
            <p className="text-xs text-[#5F6B7A]">Please do not close or refresh this page.</p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E6EDF2] p-8 max-w-sm w-full shadow-xl text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-[#003A40] mb-2">Payment Successful!</h3>
            <div className="bg-[#F8FAFC] border border-[#E6EDF2] rounded-xl p-4 text-left mb-6">
              <p className="text-xs text-[#5F6B7A] mb-1">Amount Paid: <strong className="text-[#003A40]">₹{selectedFee.totalFee.toLocaleString()}</strong></p>
              <p className="text-xs text-[#5F6B7A] mb-1">Transaction ID: <strong className="text-[#003A40]">{transactionId}</strong></p>
              <p className="text-xs text-[#5F6B7A]">Date: <strong className="text-[#003A40]">{new Date().toLocaleString()}</strong></p>
            </div>
            <button
              onClick={() => { setShowSuccess(false); setSelectedFee(null); }}
              className="w-full px-4 py-2.5 bg-[#003A40] text-white rounded-xl text-sm font-bold hover:bg-[#02282d] transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
