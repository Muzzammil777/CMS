import { useState, useMemo, useEffect, Fragment } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Layout from '../components/Layout';
import { StatsSection, Pagination, TableSkeleton } from '../components/common';
import EnterprisePageTemplate from '../components/EnterprisePageTemplate';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { Download, FileText, CheckCircle2, DollarSign, Clock, AlertTriangle, Eye, Edit, Trash2 } from 'lucide-react';
import { API_BASE } from '../api/apiBase';
import { settingsApi } from '../api/settingsApi';
import { getUserSession } from '../auth/sessionController';

// Icons
function ViewIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>);
}

function EditIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>);
}

function DocumentIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>);
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>);
}

function DeleteIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>);
}


export default function PayrollPage({ noLayout = false }) {
    const [payrollData, setPayrollData] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const session = getUserSession();
    const role = session?.role || null;

    const fetchPayroll = async () =>{
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/payroll`);
            if (!res.ok) throw new Error('Failed to fetch payroll data');
            const data = await res.json();
            setPayrollData(data.map(r =>({ ...r, id: r.id || r._id })));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () =>{
        try {
            const res = await fetch(`${API_BASE}/faculty`);
            if (!res.ok) throw new Error('Failed to fetch faculty');
            const data = await res.json();
            setStaffList(data);
        } catch (err) {
            console.error('Faculty fetch error:', err.message);
        }
    };

    const fetchDepts = async () => {
        try {
            const data = await settingsApi.getDepartments();
            setDepartments(data || []);
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        }
    };

    useEffect(() =>{
        fetchStaff();
        fetchPayroll();
        fetchDepts();
    }, []);


    const [filterMonth, setFilterMonth] = useState('All Periods');
    const [filterStatus, setFilterStatus] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const [viewingRecord, setViewingRecord] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);
    const [expandedPayrollId, setExpandedPayrollId] = useState(null);
    const [updatingPayrollId, setUpdatingPayrollId] = useState(null);

    // Run Payroll States
    const [isRunPayrollModalOpen, setIsRunPayrollModalOpen] = useState(false);
    const [selectedDesignations, setSelectedDesignations] = useState([]);
    const [runPayrollMonth, setRunPayrollMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [runPayrollYear, setRunPayrollYear] = useState(new Date().getFullYear().toString());
    
    const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];
    const SALARY_MAP = {
        'Professor': 55000,
        'Associate Professor': 45000,
        'Assistant Professor': 40000,
        'Lecturer': 35000
    };

    // Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardData, setWizardData] = useState({
        staffId: '',
        staffName: '',
        designation: '',
        department: '',
        category: '',
        payMonth: 'January',
        payYear: '2024',
        basicSalary: 0,
        hra: 0,
        allowance: 0,
        bonus: 0,
        pf: 0,
        tax: 0,
    });

    // Step 1 local state for UI filtering
    const [step1Category, setStep1Category] = useState('');
    const [step1Department, setStep1Department] = useState('');
    const [step1SearchQuery, setStep1SearchQuery] = useState('');

    const filteredData = useMemo(() =>{
        return payrollData.filter(record =>{
            const hasPayroll = !!(record.grossPay || record.netPay);
            if (!hasPayroll) return false;

            const matchMonth = filterMonth === 'All Periods' || record.payMonth === filterMonth || (record.payPeriodDetailed && record.payPeriodDetailed.includes(filterMonth));
            const matchStatus = filterStatus === 'All' || record.status === filterStatus;

            // If the user wants specific names, we could add that, but usually "hasPayroll" is what's missing.
            // Let's also ensure we only show Giritharan and Jeevan as requested if they are the only valid ones.
            return matchMonth && matchStatus;
        });
    }, [filterMonth, filterStatus, payrollData]);

    const availablePeriods = useMemo(() =>{
        const periods = new Set(['All Periods', 'Current Month', 'Last Month']);
        payrollData.forEach(r =>{
            if (r.payPeriodDetailed) periods.add(r.payPeriodDetailed);
        });
        return Array.from(periods);
    }, [payrollData]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const availableStaffForWizard = useMemo(() =>{
        return staffList.filter(staff =>{
            const name = staff.staffName || staff.name || '';
            const id = staff.staffId || staff.staff_id || staff.id || '';
            const designation = staff.designation || staff.role || '';
            const department = staff.departmentId || staff.department || '';
            const matchesSearch = name.toLowerCase().includes(step1SearchQuery.toLowerCase()) || id.toLowerCase().includes(step1SearchQuery.toLowerCase());
            const matchesDesignation = step1Category ? designation === step1Category : true;
            const matchesDept = step1Department ? department === step1Department : true;
            return matchesSearch && matchesDesignation && matchesDept;
        });
    }, [staffList, step1SearchQuery, step1Category, step1Department]);

    // Formatting currency
    const formatCurrency = (amount) =>new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const handleGeneratePayslip = (record) =>{
        try {
            const doc = new jsPDF();
            const period = record.payPeriodDetailed || record.payMonth || 'Unknown Period';
            const staffName = record.staffName || 'Staff Member';

            doc.setFontSize(22);
            doc.text('College Name', 105, 20, { align: 'center' });
            doc.setFontSize(14);
            doc.text('Payroll Report', 105, 30, { align: 'center' });

            doc.setFontSize(12);
            doc.text('Employee Details', 14, 45);
            autoTable(doc, {
                startY: 50,
                theme: 'plain',
                head: [],
                body: [
                    ['Employee Name:', staffName, 'Employee ID:', record.staffId || '—'],
                    ['Department:', record.department || '—', 'Role:', record.designation || '—'],
                ],
                styles: { fontSize: 10, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } }
            });

            // Use doc.lastAutoTable.finalY (standard for jspdf-autotable)
            const firstTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 70;

            doc.text('Payroll Details', 14, firstTableY + 15);
            autoTable(doc, {
                startY: firstTableY + 20,
                head: [['Description', 'Amount (INR)']],
                body: [
                    ['Pay Period', period],
                    ['Basic Salary', record.basicSalary || 0],
                    ['HRA', record.hra || 0],
                    ['Allowances', record.allowance || 0],
                    ['Bonus', record.bonus || 0],
                    ['PF (Employee)', record.pf || 0],
                    ['ESI', record.esi || 0],
                    ['Professional Tax', record.professionalTax || 0],
                    ['TDS', record.tds || 0],
                    ['Gross Pay', record.grossPay || 0],
                    ['Total Deductions', record.deductions || 0],
                    ['Net Pay', record.netPay || 0],
                    ['Status', record.status || 'Draft']
                ],
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                styles: { fontSize: 10 }
            });

            const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : firstTableY + 60;
            doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 14, finalY + 20);
            doc.text('Authorized Signature: _________________', 120, finalY + 20);

            const safeName = staffName.replace(/\s+/g, '_');
            const safePeriod = period.replace(/\s+/g, '');
            const fileName = `Payroll_Report_${safeName}_${safePeriod}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF: ' + error.message);
        }
    };

    const handleEditSubmit = async (e) =>{
        e.preventDefault();
        try {
            // Recalculate totals before saving
            const updatedRecord = {
                ...editingRecord,
                grossPay: (editingRecord.basicSalary || 0) + (editingRecord.hra || 0) + (editingRecord.allowance || 0) + (editingRecord.bonus || 0),
                deductions: (editingRecord.pf || 0) + (editingRecord.tax || 0) + (editingRecord.esi || 0) + (editingRecord.professionalTax || 0) + (editingRecord.tds || 0),
            };
            updatedRecord.netPay = updatedRecord.grossPay - updatedRecord.deductions;

            const res = await fetch(`${API_BASE}/payroll/${updatedRecord.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedRecord),
            });
            if (!res.ok) throw new Error('Failed to update record');
            await fetchPayroll();
            alert(`Saved changes for ${editingRecord.staffName}`);
            setEditingRecord(null);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const openWizard = () =>{
        setWizardData({
            staffId: '', staffName: '', designation: '', department: '', category: '',
            payMonth: 'January', payYear: '2024', basicSalary: 0, hra: 0, allowance: 0, bonus: 0, pf: 0, tax: 0
        });
        setWizardStep(1);
        setIsWizardOpen(true);
    };

    const closeWizard = () =>{
        setIsWizardOpen(false);
    };

    const handleDeletePayroll = async (record) =>{
        if (!window.confirm(`Are you sure you want to delete the payroll record for ${record.staffName}?`)) return;
        
        try {
            const res = await fetch(`${API_BASE}/payroll/${record.id || record._id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete record');
            await fetchPayroll();
            alert('Record deleted successfully');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleWizardNext = () =>{
        if (wizardStep === 1 && !wizardData.staffId) {
            alert('Please select a staff member first.');
            return;
        }
        setWizardStep(prev =>prev + 1);
    };

    const handleWizardBack = () =>{
        setWizardStep(prev =>prev - 1);
    };

    const selectWizardStaff = (staff) =>{
        const baseSalary = SALARY_MAP[staff.designation || staff.role] || 0;
        const expYears = Number(staff.experience_years || staff.experience || 0);
        const totalSalary = baseSalary + (expYears * 4000);

        setWizardData(prev =>({
            ...prev,
            staffId: staff.staffId || staff.staff_id || staff.id || '',
            staffName: staff.staffName || staff.name || '',
            designation: staff.designation || staff.role || '',
            department: staff.department || '',
            category: staff.category || '',
            basicSalary: totalSalary,
            hra: Number(staff.hra || 0),
            allowance: Number(staff.allowance || 0),
            pf: Number(staff.pf || 0),
            tax: Number(staff.tax || 0)
        }));
    };

    const useLastMonthSalary = () =>{
        // Find the most recent record for this staff
        const pastRecord = payrollData.find(r =>r.staffId === wizardData.staffId);
        if (pastRecord) {
            setWizardData(prev =>({
                ...prev,
                basicSalary: pastRecord.basicSalary || 0,
                hra: pastRecord.hra || 0,
                allowance: pastRecord.allowance || 0,
                bonus: pastRecord.bonus || 0,
                pf: pastRecord.pf || 0,
                tax: pastRecord.tax || 0,
            }));
        } else {
            alert("No previous salary data available");
        }
    };

    const calculateGross = () =>{
        return Number(wizardData.basicSalary) + Number(wizardData.hra) + Number(wizardData.allowance) + Number(wizardData.bonus);
    };

    const calculateDeductions = () =>{
        return Number(wizardData.pf) + Number(wizardData.tax) + Number(wizardData.esi || 0) + Number(wizardData.professionalTax || 0) + Number(wizardData.tds || 0);
    };

    const calculateNet = () =>{
        return calculateGross() - calculateDeductions();
    };

    const generatePayroll = async () =>{
        const newRecord = {
            staffName: wizardData.staffName,
            staffId: wizardData.staffId,
            designation: wizardData.designation,
            department: wizardData.department,
            category: wizardData.category,
            payMonth: 'Current Month',
            payPeriodDetailed: `${wizardData.payMonth} ${wizardData.payYear}`,
            grossPay: calculateGross(),
            deductions: calculateDeductions(),
            netPay: calculateNet(),
            status: 'Draft',
            basicSalary: wizardData.basicSalary,
            hra: wizardData.hra,
            allowance: wizardData.allowance,
            bonus: wizardData.bonus,
            pf: wizardData.pf,
            tax: wizardData.tax,
            esi: wizardData.esi || 0,
            professionalTax: wizardData.professionalTax || 0,
            tds: wizardData.tds || 0
        };

        try {
            const res = await fetch(`${API_BASE}/payroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecord),
            });
            if (!res.ok) throw new Error('Failed to save payroll record');
            await fetchPayroll();
            closeWizard();
            alert('Payroll record drafted successfully.');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleRunPayroll = () =>{
        setSelectedDesignations([...DESIGNATIONS]); // Default select all
        setRunPayrollMonth(new Date().toLocaleString('default', { month: 'long' }));
        setRunPayrollYear(new Date().getFullYear().toString());
        setIsRunPayrollModalOpen(true);
    };

    const executeRunPayroll = async () =>{
        const currentPeriod = `${runPayrollMonth} ${runPayrollYear}`;
        const newRecords = [];

        staffList.forEach(staff =>{
            const role = staff.designation || staff.role || '';
            if (!selectedDesignations.includes(role)) return;

            const id = staff.staffId || staff.staff_id || staff.id || '';
            const name = staff.staffName || staff.name || '';
            const dept = staff.department || '';
            const cat = staff.category || '';
            
            // Automatic Salary Assignment
            const baseSalary = SALARY_MAP[role] || 0;
            // Robust experience lookup: try experience_years, experience, or 0
            const expYears = Number(staff.experience_years || staff.experience || 0);
            const expBonus = expYears * 4000;
            const totalBasic = baseSalary + expBonus;

            // Default values
            const hra = Number(staff.hra || 0);
            const allowance = Number(staff.allowance || 0);
            const pf = Number(staff.pf || 0);
            const tax = Number(staff.tax || 0);

            const exists = payrollData.some(r =>(r.staffId === id) && r.payPeriodDetailed === currentPeriod);
            if (!exists) {
                const gross = totalBasic + hra + allowance;
                const deds = pf + tax;
                newRecords.push({
                    staffName: name,
                    staffId: id,
                    designation: role,
                    department: dept,
                    category: cat,
                    payMonth: runPayrollMonth,
                    payPeriodDetailed: currentPeriod,
                    grossPay: gross,
                    deductions: deds,
                    netPay: gross - deds,
                    status: 'Draft',
                    basicSalary: totalBasic,
                    baseSalary: baseSalary,
                    experienceBonus: expBonus,
                    experienceYears: expYears,
                    hra, allowance, bonus: 0, pf, tax
                });
            }
        });

        if (newRecords.length >0) {
            try {
                const res = await fetch(`${API_BASE}/payroll/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newRecords),
                });
                if (!res.ok) throw new Error('Failed to run payroll');
                await fetchPayroll();
                alert(`Payroll successfully generated for ${newRecords.length} staff members for ${currentPeriod}.`);
                setIsRunPayrollModalOpen(false);
            } catch (err) {
                alert('Error: ' + err.message);
            }
        } else {
            alert(`No new payroll records to generate for ${currentPeriod} with selected designations.`);
            setIsRunPayrollModalOpen(false);
        }
    };

    const stats = useMemo(() =>{
        const totalNetPay = filteredData.reduce((sum, r) =>sum + (r.netPay || 0), 0);
        const paidCount = filteredData.filter(r =>r.status === 'Paid').length;
        const processingCount = filteredData.filter(r =>r.status === 'Processing').length;
        const draftCount = filteredData.filter(r =>r.status === 'Draft').length;
        return {
            totalPayrolls: filteredData.length,
            totalDisbursement: totalNetPay,
            paidCount,
            processingCount,
            draftCount
        };
    }, [filteredData]);


    const totalGross = payrollData.reduce((acc, r) => acc + (r.grossPay || 0), 0);
    const paidCount = payrollData.filter(r => r.status === 'Paid').length;
    const pendingCount = payrollData.filter(r => r.status === 'Processing').length;

    const kpiCards = [
        {
            title: 'Total Gross Pay',
            value: `₹${(totalGross / 100000).toFixed(2)}L`,
            sub: 'Processed this period',
            trend: 'Payroll active',
            trendUp: true,
            icon: <DollarSign className="w-5 h-5" />,
            gradient: 'indigo',
        },
        {
            title: 'Processed Payrolls',
            value: payrollData.length.toLocaleString(),
            sub: 'Staff paid',
            trend: 'Total records',
            trendUp: true,
            icon: <CheckCircle2 className="w-5 h-5" />,
            gradient: 'emerald',
        },
        {
            title: 'Paid Accounts',
            value: paidCount.toLocaleString(),
            sub: 'Salaries cleared',
            trend: `${(((paidCount || 0) / (payrollData.length || 1)) * 100).toFixed(1)}% cleared`,
            trendUp: true,
            icon: <Clock className="w-5 h-5" />,
            gradient: 'teal',
        },
        {
            title: 'Processing / Draft',
            value: (pendingCount + payrollData.filter(r => r.status === 'Draft').length).toLocaleString(),
            sub: 'Awaiting clearance',
            trend: 'Action required',
            trendUp: false,
            icon: <AlertTriangle className="w-5 h-5" />,
            gradient: 'amber',
        },
    ];

    const columns = [
        {
            key: 'facultyDetails',
            label: 'Faculty Details',
            render: (_, r) => {
                const staff = staffList.find(s => (s.staffId || s.staff_id) === r.staffId);
                const displayName = r.staffName || (staff && (staff.staffName || staff.name)) || '—';
                const displayId = r.staffId || '—';
                const displayRole = r.designation || (staff && (staff.designation || staff.role)) || '—';
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#003A40] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {displayName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-[#003A40] truncate leading-tight">{displayName}</p>
                            <p className="text-[10px] text-[#8C98A5] font-medium truncate">ID: {displayId} • {displayRole}</p>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'payPeriod',
            label: 'Pay Period',
            render: (_, r) => (
                <span className="text-xs font-bold text-[#003A40] block truncate">{r.payPeriodDetailed || r.payMonth || '—'}</span>
            )
        },
        {
            key: 'grossPay',
            label: 'Gross Pay',
            render: (_, r) => (
                <span className="text-xs font-extrabold text-[#003A40] font-['Outfit']">
                    {r.grossPay ? formatCurrency(r.grossPay) : '—'}
                </span>
            )
        },
        {
            key: 'netPay',
            label: 'Net Pay',
            render: (_, r) => (
                <span className="text-xs font-extrabold text-[#0A686A] font-['Outfit']">
                    {r.netPay ? formatCurrency(r.netPay) : '—'}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (_, r) => {
                const st = r.status || 'Draft';
                const cls = st === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : st === 'Processing' ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200';
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
                        {st}
                    </span>
                );
            }
        }
    ];

    const actions = [
        {
            icon: <Eye className="w-3.5 h-3.5" />,
            label: 'View Breakdown',
            color: 'teal',
            onClick: (r) => setExpandedPayrollId(expandedPayrollId === r.id ? null : r.id)
        },
        {
            icon: <FileText className="w-3.5 h-3.5" />,
            label: 'Print Payslip',
            color: 'blue',
            onClick: (r) => handleGeneratePayslip(r)
        },
        {
            icon: <Trash2 className="w-3.5 h-3.5" />,
            label: 'Delete',
            color: 'red',
            onClick: (r) => { if (window.confirm('Delete payroll record?')) handleDeletePayroll(r) }
        }
    ];

    const filterOptions = [
        {
            key: 'status',
            label: 'Status',
            options: [
                { value: 'Paid', label: 'Paid' },
                { value: 'Processing', label: 'Processing' },
                { value: 'Draft', label: 'Draft' },
            ],
        },
        {
            key: 'month',
            label: 'Month',
            options: availablePeriods.filter(p => p !== 'All Periods').map(p => ({ value: p, label: p })),
        }
    ];

    const inner = (
        <div style={{ height: 'calc(100vh - 80px)' }}>
            {loading ? (
                <DashboardSkeleton />
            ) : (
                <EnterprisePageTemplate
                    kpiCards={kpiCards}
                    columns={columns}
                    rows={filteredData}
                    actions={actions}
                    rowKey="id"
                    searchQuery={step1SearchQuery}
                    onSearchChange={setStep1SearchQuery}
                    searchPlaceholder="Search staff by name or ID..."
                    filterOptions={filterOptions}
                    activeFilters={{ status: filterStatus === 'All' ? '' : filterStatus, month: filterMonth === 'All Periods' ? '' : filterMonth }}
                    onFilterChange={(key, val) => {
                        if (key === 'status') setFilterStatus(val || 'All');
                        if (key === 'month') setFilterMonth(val || 'All Periods');
                    }}
                    onAdd={openWizard}
                    addLabel="Create Payroll"
                    loading={false}
                    emptyMessage="No payroll records match your criteria."
                    customFilters={
                        <button onClick={handleRunPayroll} className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-[#E6EDF2] bg-[#F0FDFA] text-[#0A686A] text-[11px] font-bold transition-all cursor-pointer hover:bg-[#E6EDF2]">
                            <span className="material-symbols-outlined text-[14px]">play_arrow</span> Run Payroll
                        </button>
                    }
                />
            )}

            {/* View Modal (Enterprise Layout) */}
            {expandedPayrollId && (() => {
                const viewingRecord = payrollData.find(r => r.id === expandedPayrollId);
                if (!viewingRecord) return null;
                return (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-[#E6EDF2] p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-base font-bold text-[#003A40] mb-4">Payroll Breakdown — {viewingRecord.staffName}</h3>
                        <div className="space-y-2 text-xs text-[#5F6B7A] mb-6">
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span>Pay Period:</span>
                                <span className="font-bold text-[#003A40]">{viewingRecord.payPeriodDetailed || viewingRecord.payMonth}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span>Basic Salary ({viewingRecord.designation}):</span>
                                <span className="font-bold text-[#003A40]">₹{viewingRecord.baseSalary || SALARY_MAP[viewingRecord.designation] || (viewingRecord.basicSalary - (viewingRecord.experienceBonus || 0))}</span>
                            </div>
                            {(viewingRecord.experienceYears > 0 || (viewingRecord.experienceBonus > 0)) && (
                            <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-600 font-bold">
                                <span>Exp. Bonus:</span>
                                <span>+₹{(viewingRecord.experienceBonus || 0).toLocaleString()}</span>
                            </div>
                            )}
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span>Gross Pay:</span>
                                <span className="font-bold text-[#003A40]">₹{(viewingRecord.grossPay || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100 text-rose-500 font-bold">
                                <span>PF / Taxes:</span>
                                <span>-₹{(viewingRecord.deductions || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-1 font-bold text-sm text-[#003A40] pt-2">
                                <span>Net Pay:</span>
                                <span className="text-[#0A686A]">₹{(viewingRecord.netPay || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        {role === 'finance' && (
                            <div className="mb-4 pt-4 border-t border-slate-100">
                                <label className="block text-[10px] font-bold text-[#8C98A5] uppercase tracking-wider mb-2">Update Payment Status</label>
                                <div className="flex gap-2">
                                    <select
                                        value={viewingRecord.status}
                                        onChange={async (e) => {
                                            try {
                                                const res = await fetch(`${API_BASE}/payroll/${viewingRecord.id || viewingRecord._id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ ...viewingRecord, status: e.target.value }),
                                                });
                                                if (!res.ok) throw new Error('Failed to update status');
                                                await fetchPayroll();
                                            } catch (err) { alert(err.message); }
                                        }}
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold focus:ring-1 focus:ring-[#0A686A] focus:outline-none shadow-sm hover:border-slate-300 transition-all cursor-pointer"
                                    >
                                        <option value="Draft">Draft</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Paid">Paid</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => setExpandedPayrollId(null)}
                                className="flex-1 py-2 bg-slate-100 text-[#5F6B7A] rounded-xl font-bold text-[11px] cursor-pointer hover:bg-slate-200 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => handleGeneratePayslip(viewingRecord)}
                                className="flex-1 py-2 bg-[#003A40] text-white rounded-xl font-bold text-[11px] cursor-pointer hover:bg-[#0A686A] transition-colors"
                            >
                                Print PDF
                            </button>
                        </div>
                    </div>
                </div>
                )
            })()}

            {/* Create Payroll Wizard Modal */}
            {isWizardOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}><div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.3s ease-out', overflow: 'hidden' }}>{/* Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}><h3 style={{ margin: 0, fontSize: 18, color: '#1f2937', fontWeight: 600 }}>Create Payroll</h3><button onClick={closeWizard} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><CloseIcon /></button></div>{/* Step Indicator */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{['Select Staff', 'Salary Details', 'Review'].map((label, idx) =>{
                                const stepNum = idx + 1;
                                const isActive = wizardStep === stepNum;
                                const isPassed = wizardStep >stepNum;
                                return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}><div style={{
                                            width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600,
                                            background: isActive || isPassed ? '#4c1d95' : '#e5e7eb',
                                            color: isActive || isPassed ? '#fff' : '#6b7280',
                                            marginBottom: 8, zIndex: 2
                                        }}>{isPassed ? '' : stepNum}
                                        </div><div style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? '#1f2937' : '#6b7280' }}>{label}</div>{idx < 2 && (
                                            <div style={{ position: 'absolute', top: 16, left: '50%', width: '100%', height: 2, background: isPassed ? '#4c1d95' : '#e5e7eb', zIndex: 1 }} />)}
                                    </div>);
                            })}
                        </div>{/* Wizard Content Area */}
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{/* STEP 1: Select Staff & Pay Period */}
                            {wizardStep === 1 && (
                                <div style={{ animation: 'fadeIn 0.2s ease-out' }}><h4 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#374151' }}>Step 1 – Select Staff & Pay Period</h4><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 8 }}><div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Pay Month</label><select
                                                value={wizardData.payMonth}
                                                onChange={(e) =>setWizardData({ ...wizardData, payMonth: e.target.value })}
                                                style={{ width: '100%', height: 40, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                                            >{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m =>(
                                                    <option key={m} value={m}>{m}</option>))}
                                            </select></div><div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Pay Year</label><select
                                                value={wizardData.payYear}
                                                onChange={(e) =>setWizardData({ ...wizardData, payYear: e.target.value })}
                                                style={{ width: '100%', height: 40, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                                            ><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option></select></div></div><div style={{ display: 'flex', gap: 12, marginBottom: 16 }}><input
                                            type="text"
                                            placeholder="Search staff name or ID..."
                                            value={step1SearchQuery}
                                            onChange={(e) =>setStep1SearchQuery(e.target.value)}
                                            style={{ flex: 1, height: 40, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                                        /><select
                                            value={step1Category}
                                            onChange={(e) =>setStep1Category(e.target.value)}
                                            style={{ width: 200, height: 40, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                                        ><option value="">Select Designation</option><option value="Professor">Professor</option><option value="Associate Professor">Associate Professor</option><option value="Assistant Professor">Assistant Professor</option><option value="Lecturer">Lecturer</option></select><select
                                            value={step1Department}
                                            onChange={(e) =>setStep1Department(e.target.value)}
                                            style={{ width: 220, height: 40, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                                        ><option value="">Select Department</option>{departments.map(d => (
                                            <option key={d.code} value={d.name}>{d.name}</option>
                                        ))}</select></div><div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>{availableStaffForWizard.map((faculty, i) =>{
                                            const isSelected = wizardData.staffId === (faculty.employeeId || faculty.staffId || faculty.id);
                                            return (
                                                <div
                                                    key={faculty.employeeId || faculty.staffId || faculty.id}
                                                    onClick={() =>selectWizardStaff({
                                                        staffId: faculty.employeeId || faculty.staffId || faculty.id || '',
                                                        staffName: faculty.name || faculty.staffName || '',
                                                        designation: faculty.designation || faculty.role || '',
                                                        department: faculty.departmentId || faculty.department || '',
                                                        category: faculty.category || '',
                                                        email: faculty.email || '',
                                                        phone: faculty.phone || ''
                                                    })}
                                                    style={{
                                                        padding: '16px',
                                                        borderBottom: i < availableStaffForWizard.length - 1 ? '1px solid #e5e7eb' : 'none',
                                                        cursor: 'pointer',
                                                        background: isSelected ? '#eff6ff' : '#fff',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        transition: 'background 0.2s',
                                                    }}
                                                ><div><div style={{ fontWeight: 600, color: '#1f2937', fontSize: 15 }}>{faculty.name || faculty.staffName}</div><div style={{ fontSize: 13, color: '#6b7280', margin: '2px 0' }}>ID: {faculty.employeeId || faculty.staffId || faculty.id} • {faculty.designation || faculty.role || 'Faculty'} • {faculty.departmentId || faculty.department || '—'}
                                                        </div><div style={{ fontSize: 12, color: '#64748b' }}>Email: {faculty.email || '—'} • Phone: {faculty.phone || '—'}
                                                        </div></div>{isSelected && <div style={{ color: '#4c1d95', fontWeight: 600 }}>Selected</div>}
                                                </div>);
                                        })}
                                        {availableStaffForWizard.length === 0 && (
                                            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No faculty found matching filters.</div>)}
                                    </div></div>)}

                            {/* STEP 2: Salary Details */}
                            {wizardStep === 2 && (
                                <div style={{ animation: 'fadeIn 0.2s ease-out' }}><h4 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#374151' }}>Step 2 – Salary Details</h4>{/* Selected Staff Info */}
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><div><div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{wizardData.staffName} ({wizardData.staffId})</div><div style={{ fontSize: 13, color: '#64748b' }}>{wizardData.designation} • {wizardData.department}</div><div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Pay Period: {wizardData.payMonth} {wizardData.payYear}</div></div><button
                                            type="button"
                                            style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                            onClick={useLastMonthSalary}
                                        >Use Last Month Salary
                                        </button></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>{/* Earnings */}
                                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}><div style={{ background: '#f9fafb', padding: '10px 16px', fontWeight: 600, color: '#374151', fontSize: 14, borderBottom: '1px solid #e5e7eb' }}>EARNINGS
                                            </div><div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}><div><label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Basic Salary</label><input type="number" value={wizardData.basicSalary} onChange={(e) =>setWizardData({ ...wizardData, basicSalary: e.target.value })} style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px' }} /></div><div><label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>HRA</label><input type="number" value={wizardData.hra} onChange={(e) =>setWizardData({ ...wizardData, hra: e.target.value })} style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px' }} /></div><div><label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Allowance</label><input type="number" value={wizardData.allowance} onChange={(e) =>setWizardData({ ...wizardData, allowance: e.target.value })} style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px' }} /></div><div><label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Bonus</label><input type="number" value={wizardData.bonus} onChange={(e) =>setWizardData({ ...wizardData, bonus: e.target.value })} style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px' }} /></div></div><div style={{ background: '#f8fafc', padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Gross Pay</span><span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{formatCurrency(calculateGross())}</span></div></div>{/* Deductions */}
                                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}><div style={{ background: '#f9fafb', padding: '10px 16px', fontWeight: 600, color: '#374151', fontSize: 14, borderBottom: '1px solid #e5e7eb' }}>DEDUCTIONS
                                            </div><div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}><div><label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>PF</label><input type="number" value={wizardData.pf} onChange={(e) =>setWizardData({ ...wizardData, pf: e.target.value })} style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px' }} /></div><div><label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Tax</label><input type="number" value={wizardData.tax} onChange={(e) =>setWizardData({ ...wizardData, tax: e.target.value })} style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px' }} /></div></div><div style={{ background: '#f8fafc', padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', height: 46 }}><span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Total Deductions</span><span style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>- {formatCurrency(calculateDeductions())}</span></div>{/* Net Pay Highlight */}
                                            <div style={{ background: '#eff6ff', padding: '16px', borderTop: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 15, fontWeight: 700, color: '#1e3a8a' }}>NET PAY</span><span style={{ fontSize: 20, fontWeight: 800, color: '#4c1d95' }}>{formatCurrency(calculateNet())}</span></div></div></div></div>)}

                            {/* STEP 3: Review & Generate */}
                            {wizardStep === 3 && (
                                <div style={{ animation: 'fadeIn 0.2s ease-out' }}><h4 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#374151', textAlign: 'center' }}>Step 3 – Review & Generate Payroll</h4><div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>{/* Section 1 - Faculty Details */}
                                        <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}><div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', tracking: 'wider', textTransform: 'uppercase', marginBottom: 12 }}>Faculty Details</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}><div><span style={{ color: '#6b7280', fontSize: 13 }}>Name:</span><span style={{ fontWeight: 500, fontSize: 14 }}>{wizardData.staffName}</span></div><div><span style={{ color: '#6b7280', fontSize: 13 }}>ID:</span><span style={{ fontWeight: 500, fontSize: 14 }}>{wizardData.staffId}</span></div><div><span style={{ color: '#6b7280', fontSize: 13 }}>Category:</span><span style={{ fontWeight: 500, fontSize: 14 }}>{wizardData.category}</span></div><div><span style={{ color: '#6b7280', fontSize: 13 }}>Designation:</span><span style={{ fontWeight: 500, fontSize: 14 }}>{wizardData.designation}</span></div><div><span style={{ color: '#6b7280', fontSize: 13 }}>Department:</span><span style={{ fontWeight: 500, fontSize: 14 }}>{wizardData.department}</span></div><div><span style={{ color: '#6b7280', fontSize: 13 }}>Pay Period:</span><span style={{ fontWeight: 600, fontSize: 14, color: '#4c1d95' }}>{wizardData.payMonth} {wizardData.payYear}</span></div></div></div>{/* Section 2 - Salary Details */}
                                        <div style={{ padding: 20, background: '#f9fafb' }}><div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', tracking: 'wider', textTransform: 'uppercase', marginBottom: 16 }}>Salary Computation</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}><div><div style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 8, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>Earnings</div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span color="#6b7280">Basic Salary</span><span>{formatCurrency(wizardData.basicSalary)}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span color="#6b7280">HRA</span><span>{formatCurrency(wizardData.hra)}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span color="#6b7280">Allowance</span><span>{formatCurrency(wizardData.allowance)}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span color="#6b7280">Bonus</span><span>{formatCurrency(wizardData.bonus)}</span></div></div><div><div style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 8, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>Deductions</div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span color="#6b7280">PF</span><span>{formatCurrency(wizardData.pf)}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span color="#6b7280">Tax</span><span>{formatCurrency(wizardData.tax)}</span></div></div></div><div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed #cbd5e1' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 14, fontWeight: 600, color: '#4b5563' }}>Gross Pay</span><span style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>{formatCurrency(calculateGross())}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontSize: 14, fontWeight: 600, color: '#4b5563' }}>Total Deductions</span><span style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>- {formatCurrency(calculateDeductions())}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0' }}><span style={{ fontSize: 16, fontWeight: 700, color: '#065f46' }}>Net Pay</span><span style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{formatCurrency(calculateNet())}</span></div></div></div></div></div>)}

                        </div>{/* Footer / Buttons */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', background: '#fff' }}><button
                                type="button"
                                onClick={handleWizardBack}
                                disabled={wizardStep === 1}
                                style={{
                                    padding: '8px 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: wizardStep === 1 ? 'not-allowed' : 'pointer',
                                    background: wizardStep === 1 ? '#f3f4f6' : '#fff',
                                    border: `1px solid ${wizardStep === 1 ? '#e5e7eb' : '#d1d5db'}`,
                                    color: wizardStep === 1 ? '#9ca3af' : '#374151'
                                }}
                            >Back
                            </button>{wizardStep < 3 ? (
                                <button
                                    type="button"
                                    className="btn-primary-sm"
                                    onClick={handleWizardNext}
                                >Next
                                </button>) : (
                                <button
                                    type="button"
                                    className="btn-primary-sm"
                                    onClick={generatePayroll}
                                    style={{ background: '#10b981', borderColor: '#059669' }}
                                >Generate Payroll
                                </button>)}
                        </div></div></div>)}



            {/* Run Payroll Filter Modal */}
            {isRunPayrollModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}><div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.3s ease-out' }}><div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0, fontSize: 18, color: '#1f2937', fontWeight: 600 }}>Designation Wise Run Payroll</h3><button onClick={() =>setIsRunPayrollModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><CloseIcon /></button></div><div style={{ padding: '24px' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}><div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Pay Month</label><select
                                        value={runPayrollMonth}
                                        onChange={(e) =>setRunPayrollMonth(e.target.value)}
                                        style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                                    >{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m =>(
                                            <option key={m} value={m}>{m}</option>))}
                                    </select></div><div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Pay Year</label><select
                                        value={runPayrollYear}
                                        onChange={(e) =>setRunPayrollYear(e.target.value)}
                                        style={{ width: '100%', height: 40, borderRadius: 8, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                                    >{['2024', '2025', '2026'].map(y =>(
                                            <option key={y} value={y}>{y}</option>))}
                                    </select></div></div><p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>Select designations to generate payroll automatically:</p><div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>{DESIGNATIONS.map(designation =>(
                                    <label key={designation} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', background: selectedDesignations.includes(designation) ? '#f0f7ff' : '#fff', borderColor: selectedDesignations.includes(designation) ? '#3b82f6' : '#e5e7eb', transition: 'all 0.2s' }}><input 
                                            type="checkbox" 
                                            checked={selectedDesignations.includes(designation)}
                                            onChange={(e) =>{
                                                if (e.target.checked) {
                                                    setSelectedDesignations([...selectedDesignations, designation]);
                                                } else {
                                                    setSelectedDesignations(selectedDesignations.filter(d =>d !== designation));
                                                }
                                            }}
                                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                                        /><div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600, color: '#1f2937' }}>{designation}</div><div style={{ fontSize: 12, color: '#6b7280' }}>Base: {formatCurrency(SALARY_MAP[designation])}</div></div></label>))}
                            </div><div style={{ display: 'flex', gap: 12 }}><button type="button" className="btn-secondary-sm" style={{ flex: 1 }} onClick={() =>setIsRunPayrollModalOpen(false)}>Cancel</button><button type="button" className="btn-primary-sm" style={{ flex: 1, background: '#4c1d95' }} onClick={executeRunPayroll}>Confirm & Run</button></div></div></div></div>)}

            {/* Edit Modal (Simple Status Update) */}
            {editingRecord && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}><div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}><div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0, fontSize: 18, color: '#1f2937' }}>Edit Record Status</h3><button onClick={() =>setEditingRecord(null)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><CloseIcon /></button></div><form onSubmit={handleEditSubmit} style={{ padding: '0' }}><div style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}><div style={{ marginBottom: 20 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Staff Member</label><input type="text" value={`${editingRecord.staffName} (${editingRecord.staffId})`} disabled style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#6b7280', fontSize: 14 }} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>{/* EARNINGS Column */}
                                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}><div style={{ background: '#f9fafb', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}><h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#4b5563', letterSpacing: '0.05em' }}>EARNINGS</h4></div><div style={{ padding: '16px' }}><div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Basic Salary</label><input type="number" value={editingRecord.basicSalary || 0} onChange={(e) =>setEditingRecord({ ...editingRecord, basicSalary: Number(e.target.value) })} style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15 }} /></div><div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>HRA</label><input type="number" value={editingRecord.hra || 0} onChange={(e) =>setEditingRecord({ ...editingRecord, hra: Number(e.target.value) })} style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15 }} /></div><div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Allowance</label><input type="number" value={editingRecord.allowance || 0} onChange={(e) =>setEditingRecord({ ...editingRecord, allowance: Number(e.target.value) })} style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15 }} /></div><div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Bonus</label><input type="number" value={editingRecord.bonus || 0} onChange={(e) =>setEditingRecord({ ...editingRecord, bonus: Number(e.target.value) })} style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15 }} /></div></div><div style={{ background: '#f9fafb', padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 14, fontWeight: 600, color: '#4b5563' }}>Gross Pay</span><span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{formatCurrency((editingRecord.basicSalary || 0) + (editingRecord.hra || 0) + (editingRecord.allowance || 0) + (editingRecord.bonus || 0))}</span></div></div>{/* DEDUCTIONS Column */}
                                    <div><div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}><div style={{ background: '#f9fafb', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}><h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#4b5563', letterSpacing: '0.05em' }}>DEDUCTIONS</h4></div><div style={{ padding: '16px' }}><div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>PF</label><input type="number" value={editingRecord.pf || 0} onChange={(e) =>setEditingRecord({ ...editingRecord, pf: Number(e.target.value) })} style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15 }} /></div><div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Tax</label><input type="number" value={editingRecord.tax || 0} onChange={(e) =>setEditingRecord({ ...editingRecord, tax: Number(e.target.value) })} style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15 }} /></div>{/* Hidden or secondary fields if needed based on previous requirements */}
                                                {(editingRecord.esi >0 || editingRecord.professionalTax >0 || editingRecord.tds >0) && (
                                                    <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Other deductions (ESI, PT, TDS) will be preserved.
                                                    </div>)}
                                            </div><div style={{ background: '#f9fafb', padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 14, fontWeight: 600, color: '#4b5563' }}>Total Deductions</span><span style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>- {formatCurrency((editingRecord.pf || 0) + (editingRecord.tax || 0) + (editingRecord.esi || 0) + (editingRecord.professionalTax || 0) + (editingRecord.tds || 0))}</span></div></div><div style={{ background: '#eff6ff', borderRadius: 12, padding: '16px', border: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 15, fontWeight: 700, color: '#1e40af' }}>NET PAY</span><span style={{ fontSize: 20, fontWeight: 800, color: '#1e40af' }}>{formatCurrency(
                                                    ((editingRecord.basicSalary || 0) + (editingRecord.hra || 0) + (editingRecord.allowance || 0) + (editingRecord.bonus || 0)) -
                                                    ((editingRecord.pf || 0) + (editingRecord.tax || 0) + (editingRecord.esi || 0) + (editingRecord.professionalTax || 0) + (editingRecord.tds || 0))
                                                )}
                                            </span></div></div></div><div style={{ marginTop: 24, marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Pay Period</label><input type="text" value={editingRecord.payPeriodDetailed || editingRecord.payMonth} disabled style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#6b7280', fontSize: 14 }} /></div><div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Payment Status</label><select
                                        value={editingRecord.status}
                                        onChange={(e) =>setEditingRecord({ ...editingRecord, status: e.target.value })}
                                        style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, cursor: 'pointer' }}
                                    ><option value="Draft">Draft</option><option value="Paid">Paid</option><option value="Processing">Processing</option></select></div></div><div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#fff', borderRadius: '0 0 16px 16px' }}><button type="button" className="btn-secondary-sm" onClick={() =>setEditingRecord(null)}>Cancel</button><button type="submit" className="btn-primary-sm" style={{ background: '#4c1d95', color: '#fff' }}>Save Changes</button></div></form></div></div>)}

            {/* Global styles for animations */}
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(50px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style></div>);

    return noLayout ? inner : <Layout title="Payroll">{inner}</Layout>;
}
