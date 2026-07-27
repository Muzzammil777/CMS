import React, { useState, useEffect } from 'react';
import { DollarSign, Download, TrendingUp, Calendar } from 'lucide-react';
import { buildApiUrl } from '../api/apiBase';

export default function PayrollIntegrationPanel({ facultyId, semester, academicYear }) {
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchPayrollData();
  }, [facultyId, semester, academicYear]);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/payroll?semester=${semester}&academic_year=${academicYear}`)
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch payroll data');
      }
      
      const data = await response.json();
      setPayroll(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPayslip = async () => {
    try {
      const response = await fetch(
        buildApiUrl(`/faculty/${facultyId}/payroll/payslip?semester=${semester}&academic_year=${academicYear}`)
      );
      
      if (!response.ok) {
        throw new Error('Failed to download payslip');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${semester}_${academicYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download payslip');
    }
  };

  if (loading) return <div className="text-center py-8">Loading payroll information...</div>;
  if (error) return <div className="text-red-600 text-center py-8">{error}</div>;
  if (!payroll) return <div className="text-center py-8">No payroll data available</div>;

  return (
    <div className="space-y-6">
      {/* Payroll Summary */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Payroll Summary</h3>
            <p className="text-sm text-slate-600">Semester: {semester} {academicYear}</p>
          </div>
          <DollarSign className="w-8 h-8 text-green-600" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-slate-600 mb-1">Base Salary</p>
            <p className="text-xl font-bold text-green-600">₹{payroll.base_salary?.toLocaleString('en-IN') || 'N/A'}</p>
          </div>

          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-slate-600 mb-1">Allowances</p>
            <p className="text-xl font-bold text-green-600">₹{payroll.allowances?.toLocaleString('en-IN') || '0'}</p>
          </div>

          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-slate-600 mb-1">Net Salary</p>
            <p className="text-xl font-bold text-slate-900">{payroll.net_salary?.toLocaleString('en-IN') || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Payroll Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <DollarSign size={18} className="text-green-600" />
            Earnings
          </h4>
          <div className="space-y-2 text-sm">
            {payroll.base_salary && (
              <div className="flex justify-between">
                <span className="text-slate-600">Base Salary:</span>
                <span className="font-semibold text-green-600">₹{payroll.base_salary.toLocaleString('en-IN')}</span>
              </div>
            )}
            {payroll.teaching_allowance && (
              <div className="flex justify-between">
                <span className="text-slate-600">Teaching Allowance:</span>
                <span className="font-semibold text-green-600">₹{payroll.teaching_allowance.toLocaleString('en-IN')}</span>
              </div>
            )}
            {payroll.research_allowance && (
              <div className="flex justify-between">
                <span className="text-slate-600">Research Allowance:</span>
                <span className="font-semibold text-green-600">₹{payroll.research_allowance.toLocaleString('en-IN')}</span>
              </div>
            )}
            {payroll.performance_bonus && (
              <div className="flex justify-between">
                <span className="text-slate-600">Performance Bonus:</span>
                <span className="font-semibold text-green-600">₹{payroll.performance_bonus.toLocaleString('en-IN')}</span>
              </div>
            )}
            {payroll.other_allowances && (
              <div className="flex justify-between">
                <span className="text-slate-600">Other Allowances:</span>
                <span className="font-semibold text-green-600">₹{payroll.other_allowances.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total Earnings:</span>
              <span className="text-green-600">₹{(payroll.total_earnings || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-600" />
            Deductions
          </h4>
          <div className="space-y-2 text-sm">
            {payroll.income_tax && (
              <div className="flex justify-between">
                <span className="text-slate-600">Income Tax:</span>
                <span className="font-semibold text-orange-600">-₹{payroll.income_tax.toLocaleString('en-IN')}</span>
              </div>
            )}
            {payroll.provident_fund && (
              <div className="flex justify-between">
                <span className="text-slate-600">Provident Fund:</span>
                <span className="font-semibold text-orange-600">-₹{payroll.provident_fund.toLocaleString('en-IN')}</span>
              </div>
            )}
            {payroll.professional_tax && (
              <div className="flex justify-between">
                <span className="text-slate-600">Professional Tax:</span>
                <span className="font-semibold text-orange-600">-₹{payroll.professional_tax.toLocaleString('en-IN')}</span>
              </div>
            )}
            {payroll.other_deductions && (
              <div className="flex justify-between">
                <span className="text-slate-600">Other Deductions:</span>
                <span className="font-semibold text-orange-600">-₹{payroll.other_deductions.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total Deductions:</span>
              <span className="text-orange-600">-₹{(payroll.total_deductions || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Summary */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Calendar size={18} className="text-green-600" />
          Salary Summary
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-600 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">₹{(payroll.total_earnings || 0).toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Total Deductions</p>
            <p className="text-2xl font-bold text-orange-600">-₹{(payroll.total_deductions || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-green-300 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="text-sm text-slate-600 mb-1">Net Salary (Take Home)</p>
            <p className="text-3xl font-bold text-slate-900">₹{(payroll.net_salary || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>

        {payroll.payment_date && (
          <p className="text-xs text-slate-600 mt-4">
            Payment Date: {new Date(payroll.payment_date).toLocaleDateString('en-IN')}
          </p>
        )}
      </div>

      {/* Tax Calculation */}
      {payroll.tax_calculation && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full"
          >
            <h4 className="font-semibold text-slate-900">Tax Details</h4>
            <span className={`transform transition-transform ${showDetails ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {showDetails && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Taxable Income:</span>
                <span className="font-semibold">₹{payroll.tax_calculation.taxable_income?.toLocaleString('en-IN') || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax Rate:</span>
                <span className="font-semibold">{payroll.tax_calculation.tax_rate || 'N/A'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax Amount:</span>
                <span className="font-semibold">₹{payroll.tax_calculation.tax_amount?.toLocaleString('en-IN') || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payslip Download */}
      <button
        onClick={handleDownloadPayslip}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        <Download size={20} />
        Download Payslip
      </button>

      {/* Last Updated */}
      <p className="text-xs text-center text-slate-500">
        Last Updated: {payroll.updated_date ? new Date(payroll.updated_date).toLocaleString('en-IN') : 'N/A'}
      </p>
    </div>
  );
}
