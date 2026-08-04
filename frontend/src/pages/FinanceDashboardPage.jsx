import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserSession, getUserData } from '../auth/sessionController';
import { getDashboardSummary } from '../services/dashboardService';
import { API_BASE } from '../api/apiBase';
import Layout from '../components/Layout';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  CreditCard, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  Clock, 
  CheckCircle2, 
  Activity, 
  Database,
  ArrowUpRight,
  PieChart as PieChartIcon
} from 'lucide-react';

export default function FinanceDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [financeWidgets, setFinanceWidgets] = useState(null);
  const [freshUserData, setFreshUserData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('This Year');

  const session = getUserSession();
  const dynamicUser = getUserData();
  const sessionRole = session?.role || null;
  const sessionUserId = session?.userId || null;
  const role = sessionRole || 'finance';
  
  const userToUse = freshUserData || dynamicUser;
  const userName = userToUse?.name || userToUse?.fullName || userToUse?.staffName || 'Finance Admin';

  useEffect(() => {
    if (!sessionRole || !sessionUserId) {
      navigate('/', { replace: true });
      return undefined;
    }

    document.title = `MIT Connect - Finance Dashboard`;

    const expectedSearch = `?role=${encodeURIComponent(sessionRole)}`;
    if (location.search !== expectedSearch) {
      navigate(`/dashboard${expectedSearch}`, { replace: true });
    }

    async function fetchDashboardData() {
      setDataLoading(true);
      try {
        const summary = await getDashboardSummary();
        if (summary) {
          setDashboardStats(summary);
        }

        const widgetsRes = await fetch(`${API_BASE}/dashboard/finance/widgets`);
        if (widgetsRes.ok) {
          const widgetsData = await widgetsRes.json();
          if (widgetsData.success) {
            setFinanceWidgets(widgetsData.data);
          }
        }

        const profileRes = await fetch(`${API_BASE}/settings/${role}/${encodeURIComponent(sessionUserId)}/profile`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setFreshUserData(profileData);
        }
      } catch (err) {
        console.error('Error fetching dashboard telemetry:', err);
      } finally {
        setTimeout(() => {
          setDataLoading(false);
        }, 800);
      }
    }

    fetchDashboardData();
  }, [location.search, navigate, sessionRole, sessionUserId, role]);

  // Real-time Chart Data for Monthly Fees Collection
  const monthlyFeesData = (financeWidgets?.collection_trends || []).map(t => ({
    month: t.month,
    collected: t.raw_collected || 0,
    target: t.raw_target || 0
  }));

  // Real-time Data for Fee Distribution Donut Chart
  const feeDistributionData = financeWidgets?.fee_distribution || [];

  // Real-time Data for Recent Transaction Activity
  const recentTransactions = financeWidgets?.recent_invoices || [];

  // Compute real KPI stats
  const demandedFees = dashboardStats?.fee_collection?.demanded || 0;
  const collectedFees = dashboardStats?.fee_collection?.collected || 0;
  const collectionRate = dashboardStats?.fee_collection?.percentage || 0;
  const pendingFees = Math.max(0, demandedFees - collectedFees);

  const formatCurrency = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString()}`;
  };

  // Process Payroll Info
  const payrollSummary = financeWidgets?.payroll_summary || [];
  let totalStaff = 0;
  let processedStaff = 0;
  payrollSummary.forEach(p => {
    const [proc, tot] = p.processed.split('/').map(Number);
    if (!isNaN(tot)) totalStaff += tot;
    if (!isNaN(proc)) processedStaff += proc;
  });
  const payrollStatus = totalStaff > 0 && processedStaff === totalStaff ? 'Completed' : (totalStaff > 0 ? 'Processing' : 'Pending');


  return (
    <Layout title="">
      <div className="w-full max-w-[1600px] mx-auto min-h-0 flex flex-col space-y-4 text-[#1B1F24] pb-2">
        
        {dataLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-[#003A40] flex items-center gap-2 leading-tight">
                  Good morning, {userName.split(' ')[0]} <span className="animate-wave inline-block">👋</span>
                </h1>
                <p className="text-xs md:text-sm text-[#5F6B7A] mt-0.5 font-medium">
                  Here is the latest financial overview for MIT Campus.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3.5 py-1.5 bg-white border border-[#E6EDF2] rounded-xl text-xs font-semibold text-[#5F6B7A] shadow-2xs flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#0A686A]" />
                  <span>Wednesday, 9 Jul 2026</span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod(selectedPeriod === 'This Year' ? 'This Month' : 'This Year')}
                    className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{selectedPeriod}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 5 KPI Summary Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 flex-shrink-0">
              {/* Card 1: Collection Rate */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <PieChartIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">
                    {collectionRate}%
                  </h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Collection Rate</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span className="text-[#8C98A5] font-normal">Real-time status</span>
                  </p>
                </div>
              </div>

              {/* Card 2: Collected Fees */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">
                    {formatCurrency(collectedFees)}
                  </h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Collected Fees</p>
                  <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span className="text-[#8C98A5] font-normal">Total collected</span>
                  </p>
                </div>
              </div>

              {/* Card 3: Demanded Fees */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Database className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">{formatCurrency(demandedFees)}</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Demanded Fees</p>
                  <p className="text-[11px] font-semibold text-[#8C98A5] mt-1">Expected collection</p>
                </div>
              </div>

              {/* Card 4: Pending Fees */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-[#003A40] leading-none">{formatCurrency(pendingFees)}</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Pending Fees</p>
                  <p className="text-[11px] font-semibold text-amber-600 mt-1 flex items-center gap-0.5">
                    <span className="text-[#8C98A5] font-normal">Remaining dues</span>
                  </p>
                </div>
              </div>

              {/* Card 5: Processed Payroll Status */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex items-start gap-3 hover:shadow-xs transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-violet-700 leading-none">{payrollStatus}</h3>
                  <p className="text-xs font-medium text-[#5F6B7A] mt-1">Payroll Status</p>
                  <p className="text-[11px] font-bold text-violet-500 mt-1">{processedStaff}/{totalStaff} Processed</p>
                </div>
              </div>
            </div>

            {/* Middle Section: Monthly Fees Collection Chart & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              
              {/* Monthly Fees Collection Chart */}
              <div className="lg:col-span-7 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Monthly Fees Collection</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-extrabold text-[#003A40]">{formatCurrency(collectedFees)} <span className="text-[10px] font-bold text-emerald-600">YTD</span></span>
                      <span className="text-xs text-[#5F6B7A]">Total Collected</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    2026 ▾
                  </span>
                </div>

                <div className="h-64 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyFeesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="collectionGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C98A5' }} stroke="#E6EDF2" axisLine={false} tickLine={false} />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#8C98A5' }} 
                        stroke="#E6EDF2" 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#003A40', borderRadius: '10px', color: '#fff', fontSize: '11px', border: 'none' }}
                        itemStyle={{ color: '#E2E8F0' }}
                        labelStyle={{ fontWeight: 'bold', color: '#10B981', marginBottom: '4px' }}
                        formatter={(value) => [`₹${(value / 100000).toFixed(1)}L`, undefined]}
                      />
                      <Area type="monotone" name="Target" dataKey="target" stroke="#94A3B8" strokeDasharray="5 5" strokeWidth={2} fillOpacity={1} fill="url(#targetGradient)" />
                      <Area type="monotone" name="Collected" dataKey="collected" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#collectionGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Fee Distribution Donut Chart (Added from Admin reference) */}
              <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide mb-2">Fee Collection Distribution</h3>

                <div className="flex items-center gap-4 h-full">
                  {/* Donut Chart */}
                  <div className="w-36 h-36 relative flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={feeDistributionData}
                          innerRadius={42}
                          outerRadius={62}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {feeDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-xs font-extrabold text-[#003A40]">{formatCurrency(collectedFees)}</span>
                      <span className="text-[9px] font-semibold text-[#8C98A5]">Total</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="flex-1 space-y-2 text-xs">
                    {feeDistributionData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-bold text-[#003A40] truncate max-w-[80px]">{item.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-semibold text-slate-700">{formatCurrency(item.value)}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({item.pct})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Third Section: Recent Transactions & Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              
              {/* Fee Collection Progress Overview */}
              <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Collection Target Progress</h3>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    This Year ▾
                  </span>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-[#003A40]">{formatCurrency(collectedFees)}</span>
                      <p className="text-[11px] text-[#5F6B7A]">Total Collected</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-600">{formatCurrency(demandedFees)}</span>
                      <p className="text-[11px] text-[#8C98A5]">Target</p>
                    </div>
                  </div>

                  {/* Violet Striped Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-3 relative">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all duration-500" 
                      style={{ width: `${collectionRate}%` }} 
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="text-[11px] font-extrabold text-violet-700">{collectionRate}%</span>
                  </div>
                </div>
              </div>

              {/* Recent Transaction Activity */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 tracking-wide">Recent Transaction Activity</h3>
                  <button onClick={() => navigate('/fees')} className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer">
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="px-4 py-3">Transaction ID</th>
                        <th className="px-4 py-3">Student / Type</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentTransactions.map((txn, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900 block">{txn.id}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900 block">{txn.student}</span>
                            <span className="text-xs text-slate-500 block">{txn.type}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {txn.amount}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                              (txn.status || '').toLowerCase() === 'paid' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Lower Row: Profile Details & Payroll Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
              {/* Profile Details */}
              <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-center">
                <h3 className="text-xs font-bold text-[#003A40] tracking-wide mb-4">Profile Details</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-2xl">
                    {userName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#003A40]">{userName}</h4>
                    <p className="text-xs text-slate-500 font-medium">Finance Administrator</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{userToUse?.email || 'finance.admin@mit.edu'}</p>
                    <button onClick={() => navigate('/settings')} className="mt-2 text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer">
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Payroll Summary */}
              <div className="lg:col-span-7 p-4 bg-white rounded-2xl border border-[#E6EDF2] shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-[#003A40] tracking-wide">Payroll Summary</h3>
                  <button onClick={() => navigate('/payroll')} className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer">
                    Manage Payroll
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wider">Total Staff</p>
                    <p className="text-base font-extrabold text-[#003A40]">{totalStaff}</p>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wider">Processed</p>
                    <p className="text-base font-extrabold text-[#003A40]">{processedStaff}</p>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-700 font-semibold mb-1 uppercase tracking-wider">Status</p>
                    <p className="text-base font-extrabold text-emerald-700">{payrollStatus}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Next payroll processing expected on: <strong className="text-slate-700">25 Aug 2026</strong></span>
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All cleared
                  </span>
                </div>
              </div>
            </div>

          </>
        )}

      </div>
    </Layout>
  );
}
