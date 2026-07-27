import React, { useState, useMemo, useEffect } from 'react';
import Layout from '../components/Layout';
import KpiCard from '../components/KpiCard';
import KpiGrid from '../components/KpiGrid';
import { useAdmission } from '../context/AdmissionContext';
import { getUserSession } from '../auth/sessionController';
import { buildApiUrl } from '../api/apiBase';

export default function AdminAdministrationDashboard() {
  const session = getUserSession();
  const { studentApps, facultyApps } = useAdmission();

  const [feeAssignments, setFeeAssignments] = useState(
    JSON.parse(localStorage.getItem('fee_assignments') || '[]')
  );
  const [payrollData, setPayrollData] = useState([]);

  // Listen for updates from other pages
  useEffect(() => {
    const handleFeeUpdate = (event) => {
      const updatedFees = event.detail || JSON.parse(localStorage.getItem('fee_assignments') || '[]');
      setFeeAssignments(updatedFees);
    };

    window.addEventListener('feeAssignmentUpdated', handleFeeUpdate);
    return () => {
      window.removeEventListener('feeAssignmentUpdated', handleFeeUpdate);
    };
  }, []);

  // Fetch payroll data from API
  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        const res = await fetch(buildApiUrl('/payroll'));
        if (res.ok) {
          const data = await res.json();
          setPayrollData(data);
        }
        import SectionAccess from '../components/SectionAccess';
      } catch (error) {
        console.error('Error fetching payroll data:', error);
      }
    };

    fetchPayroll();
  }, []);

  const stats = useMemo(() => {
    // Admission Stats
    const totalAdmissions = studentApps.length + facultyApps.length;
    const approvedAdmissions =
      studentApps.filter((a) => a.status === 'Approved').length +
      facultyApps.filter((a) => a.status === 'Approved').length;
    const pendingAdmissions =
      studentApps.filter((a) => a.status === 'Pending').length +
      facultyApps.filter((a) => a.status === 'Pending').length;

    // Fees Stats
    const totalFeesAssigned = feeAssignments.length;
    const feesPaid = feeAssignments.filter((fee) => fee.paymentStatus?.toLowerCase() === 'paid').length;
    const feesPending = feeAssignments.filter((fee) => fee.paymentStatus?.toLowerCase() === 'pending').length;
    const totalFeeRevenue = feeAssignments
      .filter((fee) => fee.paymentStatus?.toLowerCase() === 'paid')
      .reduce((sum, fee) => sum + (fee.totalFee || 0), 0);

    // Payroll Stats
    const totalPayrollRecords = payrollData.length;
    const totalPayrollAmount = payrollData.reduce((sum, record) => sum + (record.netAmount || 0), 0);

    return {
      admission: { totalAdmissions, approvedAdmissions, pendingAdmissions },
      fees: { totalFeesAssigned, feesPaid, feesPending, totalFeeRevenue },
      payroll: { totalPayrollRecords, totalPayrollAmount },
    };
  }, [studentApps, facultyApps, feeAssignments, payrollData]);

  return (
    <Layout title="Administration Dashboard">
      <div className="space-y-8">
        {/* Admission Management Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-green-700">person_add</span>
            Admission Management
          </h2>
          <KpiGrid className="md:grid-cols-3">
            <KpiCard
              icon="group"
              label="Total Applications"
              value={stats.admission.totalAdmissions}
              colorScheme="green"
            />
            <KpiCard
              icon="check_circle"
              label="Approved Applications"
              value={stats.admission.approvedAdmissions}
              colorScheme="green"
            />
            <KpiCard
              icon="schedule"
              label="Pending Applications"
              value={stats.admission.pendingAdmissions}
              colorScheme="orange"
            />
          </KpiGrid>
        </div>

        {/* Fees Management Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-green-600">receipt</span>
            Fees Management
          </h2>
          <KpiGrid>
            <KpiCard
              icon="assign"
              label="Total Assigned"
              value={stats.fees.totalFeesAssigned}
              colorScheme="green"
            />
            <KpiCard
              icon="check_circle"
              label="Paid Fees"
              value={stats.fees.feesPaid}
              colorScheme="green"
            />
            <KpiCard
              icon="schedule"
              label="Pending Fees"
              value={stats.fees.feesPending}
              colorScheme="orange"
            />
            <KpiCard
              icon="trending_up"
              label="Fees Revenue"
              value={`₹${stats.fees.totalFeeRevenue.toLocaleString()}`}
              colorScheme="purple"
            />
          </KpiGrid>
        </div>

        {/* Payroll Management Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-purple-600">receipt_long</span>
            Payroll Management
          </h2>
          <KpiGrid className="md:grid-cols-2">
            <KpiCard
              icon="assignment"
              label="Total Payroll Records"
              value={stats.payroll.totalPayrollRecords}
              colorScheme="green"
            />
            <KpiCard
              icon="money"
              label="Total Payroll Amount"
              value={`₹${stats.payroll.totalPayrollAmount.toLocaleString()}`}
              colorScheme="green"
            />
          </KpiGrid>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow p-6 border-l-4 border-indigo-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-indigo-600 text-sm font-semibold uppercase tracking-wide">Total Administration Budget</p>
                <p className="text-3xl font-bold text-indigo-900 mt-2">
                  ₹{(stats.fees.totalFeeRevenue + stats.payroll.totalPayrollAmount).toLocaleString()}
                </p>
                <p className="text-indigo-600 text-xs mt-2">
                  Fees: ₹{stats.fees.totalFeeRevenue.toLocaleString()} | Payroll: ₹{stats.payroll.totalPayrollAmount.toLocaleString()}
                </p>
              </div>
              <span className="material-symbols-outlined text-4xl text-indigo-400">account_balance</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg shadow p-6 border-l-4 border-cyan-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-cyan-600 text-sm font-semibold uppercase tracking-wide">Administration Status</p>
                <p className="text-3xl font-bold text-cyan-900 mt-2">
                  {stats.admission.approvedAdmissions}/{stats.admission.totalAdmissions}
                </p>
                <p className="text-cyan-600 text-xs mt-2">
                  {stats.admission.pendingAdmissions} pending approvals
                </p>
              </div>
              <span className="material-symbols-outlined text-4xl text-cyan-400">admin_panel_settings</span>
            </div>
          </div>
        </div>
      </div>

        {/* Section Access */}
        <SectionAccess role="admin" />
    </Layout>
  );
}
