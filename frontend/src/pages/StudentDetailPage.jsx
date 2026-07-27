import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { TableSkeleton } from '../components/common'
import { buildApiUrl } from '../api/apiBase'
import KpiCard from '../components/KpiCard'
import KpiGrid from '../components/KpiGrid'

// ─── Tab Components ──────────────────────────────────────────────

function OverviewTab({ student }) {
  const formatValue = (val) => val || 'Not provided';
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not provided';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getFormattedAddress = () => {
    const addr = student.address || student.personal?.address;
    const city = student.city || student.personal?.city;
    const state = student.state || student.personal?.state;
    const pin = student.pincode || student.personal?.pincode;

    let parts = [];
    if (addr) parts.push(addr);
    if (city) parts.push(city);
    if (state) parts.push(state);
    
    let baseAddr = parts.join(', ');
    if (pin) {
      if (baseAddr) baseAddr += ` - ${pin}`;
      else baseAddr = pin;
    }
    
    return baseAddr || 'Not provided';
  };

  // --- Dynamic GPA Trend Calculation ---
  const GRADE_POINTS = {
    'A+': 10.0,
    'A': 9.0,
    'B+': 8.0,
    'B': 7.0,
    'C+': 6.0,
    'C': 5.0,
    'D': 4.0,
    'F': 0.0,
  };

  const subjects = student.subjects || [];
  const semestersData = {};

  subjects.forEach(sub => {
    const sem = sub.semester;
    if (!sem) return;
    
    if (!semestersData[sem]) {
      semestersData[sem] = { totalPoints: 0, totalCredits: 0 };
    }
    
    if (sub.grade === 'Pending' || sub.status === 'In Progress') {
      return;
    }
    
    const gradePoint = GRADE_POINTS[sub.grade];
    if (gradePoint !== undefined) {
      const credits = parseFloat(sub.credits) || 4.0;
      semestersData[sem].totalPoints += gradePoint * credits;
      semestersData[sem].totalCredits += credits;
    }
  });

  const semestersList = [];
  const maxSem = Math.max(4, ...Object.keys(semestersData).map(Number));

  for (let sem = 1; sem <= maxSem; sem++) {
    const data = semestersData[sem];
    const gpa = data && data.totalCredits > 0 ? (data.totalPoints / data.totalCredits) : 0;
    semestersList.push({
      semester: sem,
      gpa: parseFloat(gpa.toFixed(2)),
      hasData: !!(data && data.totalCredits > 0)
    });
  }

  let totalGpaSum = 0;
  let semestersWithData = 0;
  semestersList.forEach(s => {
    if (s.hasData) {
      totalGpaSum += s.gpa;
      semestersWithData++;
    }
  });
  
  const averageGpa = semestersWithData > 0 ? totalGpaSum / semestersWithData : 0;
  let averageLabel = "No GPA Recorded";
  if (averageGpa >= 9.0) averageLabel = "O Outstanding";
  else if (averageGpa >= 8.0) averageLabel = "A+ Excellent";
  else if (averageGpa >= 7.0) averageLabel = "A Good";
  else if (averageGpa >= 6.0) averageLabel = "B+ Average";
  else if (averageGpa >= 5.0) averageLabel = "B Below Average";
  else if (averageGpa > 0) averageLabel = "C Re-eval required";

  // --- Dynamic Attendance Calendar Generation ---
  const attendancePct = student.attendancePct !== undefined ? student.attendancePct : 0;
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentDate.getMonth(), 1);
  const rawDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday...
  const startOffset = rawDayOfWeek === 0 ? 6 : rawDayOfWeek - 1; // Monday = 0
  const totalDays = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();

  const getDayStatus = (dayNum, dayOfWeek) => {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) return 'weekend';
    if (dayNum > currentDate.getDate()) return 'future';
    if (!attendancePct || attendancePct === 0) return 'no-data';

    // Deterministic pseudo-random generation to match the attendance percentage
    const hash = (dayNum * 19 + 7) % 100;
    return hash < attendancePct ? 'present' : 'absent';
  };

  // --- Dynamic Academic Alert Configuration ---
  const getAlertConfig = () => {
    const failedSubjects = subjects.filter(s => s.grade === 'F' || s.status === 'Failed');
    const hasBacklogs = failedSubjects.length > 0;
    const cgpaVal = typeof student.cgpa === 'number' ? student.cgpa : parseFloat(student.cgpa) || 0.0;
    const isNewStudent = subjects.length === 0;

    if (hasBacklogs) {
      return {
        title: "Academic Alert: Backlogs Detected",
        message: `${student.name} has backlog(s) in: ${failedSubjects.map(s => s.code).join(', ')}. Please contact the academic advisor to schedule remedial classes.`,
        icon: "warning",
        bgColor: "bg-red-50 border-red-200",
        textColor: "text-red-800",
        iconBg: "bg-red-600 shadow-red-200",
        iconColor: "text-white"
      };
    }

    if (attendancePct > 0 && attendancePct < 75) {
      return {
        title: "Critical Alert: Low Attendance",
        message: `${student.name}'s attendance is currently at ${attendancePct}%, which falls below the mandatory 75% threshold. Immediate improvement is required to avoid exam debarment.`,
        icon: "event_busy",
        bgColor: "bg-amber-50 border-amber-200",
        textColor: "text-amber-800",
        iconBg: "bg-amber-500 shadow-amber-200",
        iconColor: "text-white"
      };
    }

    if (cgpaVal >= 8.5) {
      return {
        title: "Academic Distinction: Honor Roll",
        message: `Congratulations! ${student.name} has achieved an outstanding academic performance with a CGPA of ${cgpaVal.toFixed(2)}. Keep up the excellent work!`,
        icon: "workspace_premium",
        bgColor: "bg-[#276221]/5 border-[#276221]/20",
        textColor: "text-[#276221]",
        iconBg: "bg-[#276221] shadow-green-200",
        iconColor: "text-yellow-300"
      };
    }

    if (isNewStudent) {
      return {
        title: "Academic Status: Welcome",
        message: `Welcome, ${student.name}! You are newly enrolled. Your academic records, GPA trends, and class attendance will populate here once classes and exams begin.`,
        icon: "school",
        bgColor: "bg-blue-50/50 border-blue-200",
        textColor: "text-blue-800",
        iconBg: "bg-blue-600 shadow-blue-200",
        iconColor: "text-white"
      };
    }

    return {
      title: "Academic Status: Normal",
      message: `${student.name} is in good academic standing. All requirements for the current academic session are being met successfully.`,
      icon: "check_circle",
      bgColor: "bg-[#276221]/5 border-[#276221]/10",
      textColor: "text-[#276221]",
      iconBg: "bg-[#276221] shadow-[#276221]/10",
      iconColor: "text-white"
    };
  };

  const alert = getAlertConfig();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column - Core Info */}
      <div className="lg:col-span-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact & Personal Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#276221] text-[20px]">contact_page</span>
              Personal & Contact
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone Number</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.phone)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Personal Email</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.email)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Permanent Address</p>
                <p className="text-sm font-medium text-slate-700 leading-relaxed">{getFormattedAddress()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(student.dateOfBirth || student.dob)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Gender</p>
                  <p className="text-sm font-medium text-slate-700">{formatValue(student.gender)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Blood Group</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.bloodGroup)}</p>
              </div>
            </div>
          </div>

          {/* Family & Guardian Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#276221] text-[20px]">family_restroom</span>
              Family & Guardian
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Guardian Name</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.guardianName || student.guardian)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Relationship</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.relationship)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Guardian Contact</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.guardianPhone)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Guardian Email</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.guardianEmail)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Guardian Occupation</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.guardianOccupation)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Academic & Housing Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#276221] text-[20px]">menu_book</span>
              Academic & Housing
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Admission Date</p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(student.enrollDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Admission Type</p>
                  <p className="text-sm font-medium text-slate-700">{formatValue(student.admissionType)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Quota / Category</p>
                  <p className="text-sm font-medium text-slate-700">{formatValue(student.quota)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Accommodation</p>
                  <p className="text-sm font-medium text-slate-700">{formatValue(student.accommodation)}</p>
                </div>
              </div>
              {student.accommodation === 'Hostel Required' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Hostel Name</p>
                    <p className="text-sm font-medium text-slate-700">{formatValue(student.hostelName)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Room Type</p>
                    <p className="text-sm font-medium text-slate-700">{formatValue(student.roomType)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Previous Education Record */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#276221] text-[20px]">history_edu</span>
              Previous Education
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Previous School / Institution</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.previousSchool || student.previousInstitution)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Board of Study</p>
                <p className="text-sm font-medium text-slate-700">{formatValue(student.board)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Year of Passing</p>
                  <p className="text-sm font-medium text-slate-700">{student.yearOfPassing || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Marks Percentage</p>
                  <p className="text-sm font-medium text-slate-700">{student.marksPercentage ? `${student.marksPercentage}%` : 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Payment & Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[#276221] text-[20px]">payments</span>
            Application Payment & Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Application Fee</span>
                <span className="text-sm font-bold text-slate-700">₹{(student.payment?.application_fee || student.feeAmount || 500).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Method</span>
                <span className="text-sm font-medium text-slate-700">{formatValue(student.payment?.payment_method || student.paymentMethod)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transaction ID</span>
                <span className="text-sm font-medium text-mono text-slate-700">{formatValue(student.payment?.transaction_id || student.transactionId)}</span>
              </div>
              {student.payment?.payment_datetime && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Date</span>
                  <span className="text-sm font-medium text-slate-700">{new Date(student.payment.payment_datetime).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 justify-center">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance</p>
                  <p className="text-lg font-bold text-[#276221] mt-1">{attendancePct}%</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 justify-center">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current CGPA</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">{student.cgpa || 0.0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Trends & Status */}
      <div className="lg:col-span-4 space-y-8">
        {/* GPA Trend Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider text-slate-900 leading-none">GPA Trend</h3>
            <span className="px-2 py-0.5 bg-green-50 text-[#276221] rounded text-[9px] font-bold uppercase tracking-wider">{averageLabel}</span>
          </div>
          <div className="flex items-end justify-between h-24 gap-2 mb-4 relative">
            {semestersWithData === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50/70 rounded-lg backdrop-blur-[0.5px]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                  No GPA Records Available
                </span>
              </div>
            )}
            {semestersList.map((semInfo) => {
              const heightPct = semInfo.hasData ? (semInfo.gpa / 10.0) * 100 : 0;
              return (
                <div key={semInfo.semester} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  {semInfo.hasData && (
                    <span className="text-[9px] font-bold text-[#276221] leading-none mb-0.5">{semInfo.gpa}</span>
                  )}
                  <div 
                    className={`w-full rounded-md transition-all duration-1000 ${
                      semInfo.hasData 
                        ? 'bg-[#276221]' 
                        : 'bg-slate-100 border border-dashed border-slate-200'
                    }`} 
                    style={{ height: semInfo.hasData ? `${heightPct}%` : '8px' }} 
                    title={semInfo.hasData ? `Semester ${semInfo.semester} GPA: ${semInfo.gpa}` : `Semester ${semInfo.semester}: No records`}
                  />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">SEM{semInfo.semester}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Calendar Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Attendance: {currentMonthName} {currentYear}</h3>
              <div className="flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-green-500" title="Present" />
                 <div className="w-2 h-2 rounded-full bg-red-400" title="Absent" />
              </div>
           </div>
           <div className="grid grid-cols-7 gap-2 mb-4">
              {['M','T','W','T','F','S','S'].map(d => (
                <div key={d} className="text-center text-[9px] font-bold text-slate-300 py-1">{d}</div>
              ))}
              {Array.from({ length: startOffset }).map((_, idx) => (
                <div key={`pad-${idx}`} className="aspect-square bg-transparent" />
              ))}
              {Array.from({ length: totalDays }).map((_, idx) => {
                const dayNum = idx + 1;
                const date = new Date(currentYear, currentDate.getMonth(), dayNum);
                const dayOfWeek = date.getDay();
                const status = getDayStatus(dayNum, dayOfWeek);
                
                let bgClass = 'bg-slate-50 border border-slate-100';
                let titleText = `Day ${dayNum}`;
                
                if (status === 'present') {
                  bgClass = 'bg-green-500 text-white';
                  titleText = `Day ${dayNum}: Present`;
                } else if (status === 'absent') {
                  bgClass = 'bg-red-400 text-white';
                  titleText = `Day ${dayNum}: Absent`;
                } else if (status === 'weekend') {
                  bgClass = 'bg-slate-50 text-slate-300 cursor-not-allowed';
                  titleText = `Day ${dayNum}: Weekend`;
                } else if (status === 'future') {
                  bgClass = 'bg-slate-50/50 text-slate-200 cursor-not-allowed';
                  titleText = `Day ${dayNum}: Scheduled`;
                } else if (status === 'no-data') {
                  bgClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed';
                  titleText = `Day ${dayNum}: No attendance logs`;
                }
                
                return (
                  <div 
                    key={`day-${dayNum}`} 
                    className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-bold transition-all ${bgClass}`}
                    title={titleText}
                  >
                    {dayNum}
                  </div>
                );
              })}
           </div>
           {attendancePct === 0 ? (
             <p className="text-[10px] text-slate-400 italic text-center">* No attendance logs exist for this session.</p>
           ) : (
             <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
               <span>Rate: {attendancePct}%</span>
               <span>{currentMonthName} {currentYear} estimate</span>
             </div>
           )}
        </div>

        {/* Academic Alert Card */}
        <div className={`border rounded-xl p-8 flex gap-4 transition-all duration-300 ${alert.bgColor}`}>
           <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-lg ${alert.iconBg}`}>
              <span className={`material-symbols-outlined text-[20px] ${alert.iconColor}`}>{alert.icon}</span>
           </div>
           <div>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${alert.textColor}`}>{alert.title}</p>
              <p className={`text-xs font-medium leading-relaxed ${alert.textColor}/90`}>
                {alert.message}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}


function SubjectRow({ sub, studentId, onUpdate }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (field, value) => {
    setIsUpdating(true);
    await onUpdate(sub.code, field, value);
    setIsUpdating(false);
  };

  return (
    <tr className="hover:bg-slate-50/80 transition-all group">
      <td className="px-8 py-5 text-sm font-medium text-slate-500 italic">
        Sem {sub.semester}
      </td>
      <td className="px-4 py-5 text-sm font-medium text-slate-400 uppercase tracking-tight">{sub.code}</td>
      <td className="px-4 py-5 text-sm font-semibold text-slate-800">{sub.name}</td>
      <td className="px-4 py-5 text-sm font-medium text-slate-500">4.0</td>
      <td className="px-4 py-5">
        <select 
          value={sub.grade}
          onChange={(e) => handleChange('grade', e.target.value)}
          disabled={isUpdating}
          className="bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer hover:text-[#276221] transition-colors"
        >
          {['A+','A','B+','B','C+','C','D','F','Pending'].map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </td>
      <td className="px-8 py-5 text-center">
        <select 
          value={sub.status || (sub.grade === 'Pending' ? 'In Progress' : 'Passed')}
          onChange={(e) => handleChange('status', e.target.value)}
          disabled={isUpdating}
          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm outline-none cursor-pointer transition-all ${
            sub.status === 'Passed' ? 'bg-green-50 text-green-600 border border-green-100' :
            sub.status === 'In Progress' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
            'bg-slate-50 text-slate-500 border border-slate-100'
          }`}
        >
          {['Passed', 'Failed', 'In Progress'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
    </tr>
  );
}

function AddAcademicRecordModal({ isOpen, onClose, onSave, studentId }) {
  const [formData, setFormData] = useState({
    semester: '',
    code: '',
    name: '',
    credits: '4.0',
    grade: 'A',
    status: 'Passed'
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
       <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <h3 className="text-lg font-bold text-slate-800">Add Academic Record</h3>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">close</span>
             </button>
          </div>
          <div className="p-8 space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semester</label>
                   <select 
                     value={formData.semester} 
                     onChange={e => setFormData({...formData, semester: e.target.value})}
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#276221] transition-all font-medium"
                   >
                     <option value="">Select</option>
                     {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>Sem {s}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credits</label>
                   <input 
                     type="text" 
                     value={formData.credits} 
                     onChange={e => setFormData({...formData, credits: e.target.value})}
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#276221] transition-all font-medium"
                   />
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject Code</label>
                <input 
                  type="text" 
                  placeholder="e.g., CS105"
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#276221] transition-all font-medium"
                />
             </div>

             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Database Management"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#276221] transition-all font-medium"
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grade</label>
                   <select 
                     value={formData.grade} 
                     onChange={e => setFormData({...formData, grade: e.target.value})}
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#276221] transition-all font-medium"
                   >
                     {['A+','A','B+','B','C+','C','D','F','Pending'].map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                   <select 
                     value={formData.status} 
                     onChange={e => setFormData({...formData, status: e.target.value})}
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#276221] transition-all font-medium"
                   >
                     {['Passed','Failed','In Progress'].map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
             </div>
          </div>
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
             <button onClick={onClose} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
             <button 
               onClick={async () => {
                 try {
                   const res = await fetch(buildApiUrl(`/students/${studentId}/subjects`), {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                       ...formData,
                       semester: parseInt(formData.semester),
                       credits: parseFloat(formData.credits) || 4.0,
                       total: 0 // New records start at 0
                     })
                   });
                   if (!res.ok) throw new Error('Failed to save record');
                   const savedRecord = await res.json();
                   onSave(savedRecord);
                 } catch (err) {
                   alert('Error: ' + err.message);
                 }
               }}
               className="flex-1 px-4 py-3 bg-[#276221] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#1e4618] transition-all shadow-lg shadow-green-200 active:scale-95"
             >
               Add Record
             </button>
          </div>
       </div>
    </div>
  )
}

function AcademicsTab({ student, onRefresh }) {
  const [semesterFilter, setSemesterFilter] = useState('All')
  const [yearFilter, setYearFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false)
  const itemsPerPage = 8

  const allSubjects = student.subjects || []
  const filteredSubjects = allSubjects.filter(s => {
    const matchesYear = yearFilter === 'All' || s.year === yearFilter
    const matchesSem = semesterFilter === 'All' || s.semester?.toString() === semesterFilter
    return matchesYear && matchesSem
  })

  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage)
  const currentSubjects = filteredSubjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const passedSubjects = allSubjects.filter(s => s.grade !== 'Pending')
  const totalObtained = passedSubjects.reduce((s, sub) => s + (sub.total || 0), 0)
  const totalMax = passedSubjects.length * 100
  const calcCGPA = totalMax > 0 ? ((totalObtained / totalMax) * 10).toFixed(2) : '0.00'

  const handleUpdateSubject = async (subjectCode, field, value) => {
    const updatedSubjects = allSubjects.map(s => 
      s.code === subjectCode ? { ...s, [field]: value } : s
    );
    try {
      const res = await fetch(buildApiUrl(`/students/${student.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects: updatedSubjects })
      });
      if (!res.ok) throw new Error('Failed to update student');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error updating subject:', err);
      alert('Failed to update: ' + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column - Grades Table */}
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 text-[#276221] rounded-xl flex items-center justify-center shadow-inner">
                 <span className="material-symbols-outlined text-[24px]">school</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Semester Outcomes</h3>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Official Academic Record</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsAddRecordModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#276221] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#1e4618] transition-all shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Add Record
              </button>
              <button 
                onClick={() => alert('Generating Provisional Transcript...')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px] text-[#276221]">description</span>
                Download Transcript
              </button>
              <select 
                value={yearFilter}
                onChange={(e) => {setYearFilter(e.target.value); setSemesterFilter('All'); setCurrentPage(1);}}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider outline-none cursor-pointer"
              >
                <option value="All">All Years</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
              <select 
                value={semesterFilter}
                onChange={(e) => {setSemesterFilter(e.target.value); setCurrentPage(1);}}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider outline-none cursor-pointer"
              >
                <option value="All">All Semesters</option>
                {(() => {
                  let sems = [1, 2, 3, 4, 5, 6, 7, 8];
                  if (yearFilter === '1st Year') sems = [1, 2];
                  else if (yearFilter === '2nd Year') sems = [3, 4];
                  else if (yearFilter === '3rd Year') sems = [5, 6];
                  else if (yearFilter === '4th Year') sems = [7, 8];
                  return sems.map(s => (
                    <option key={s} value={s.toString()}>Semester {s}</option>
                  ));
                })()}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 text-slate-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                   <th className="px-8 py-4">Semester</th>
                   <th className="px-4 py-4">Subject Code</th>
                   <th className="px-4 py-4">Subject Name</th>
                   <th className="px-4 py-4">Credits</th>
                   <th className="px-4 py-4">Grade</th>
                   <th className="px-8 py-4 text-center">Status</th>
                 </tr>
               </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSubjects.length > 0 ? currentSubjects.map(sub => (
                    <SubjectRow key={sub.code} sub={sub} studentId={student.id} onUpdate={handleUpdateSubject} />
                  )) : (
                    <tr>
                      <td colSpan="6" className="px-8 py-10 text-center text-slate-400 text-sm font-medium italic">
                        No subjects found for this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
          <div className="px-8 py-6 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
             <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
               Showing {filteredSubjects.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(filteredSubjects.length, currentPage * itemsPerPage)} of {filteredSubjects.length} subjects
             </p>
             <div className="flex items-center gap-1.5">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className={`w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg transition-all ${currentPage === 1 ? 'text-slate-200' : 'text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                {Array.from({length: totalPages}).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg font-semibold text-xs border transition-all ${currentPage === i + 1 ? 'bg-[#276221] border-[#276221] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className={`w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg transition-all ${currentPage === totalPages || totalPages === 0 ? 'text-slate-200' : 'text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
             </div>
          </div>
        </div>

        <AddAcademicRecordModal 
          isOpen={isAddRecordModalOpen}
          onClose={() => setIsAddRecordModalOpen(false)}
          studentId={student.id}
          onSave={(newRecord) => {
            setIsAddRecordModalOpen(false);
            if (onRefresh) onRefresh();
            setSemesterFilter(newRecord.semester.toString());
          }}
        />
      </div>

      {/* Right Column - Charts & Awards */}
      <div className="lg:col-span-4 space-y-8">
        {/* Credits Overview Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-semibold text-slate-800 self-start uppercase tracking-wider mb-8">Credits Overview</h3>
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" stroke="#e2e8f0" strokeWidth="12" fill="none" />
              <circle
                cx="60" cy="60" r="54"
                stroke="#276221" strokeWidth="12" fill="none"
                strokeLinecap="round"
                strokeDasharray={`${((passedSubjects.length * 4) / 145) * 339} ${339}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <p className="text-4xl font-bold text-slate-900 leading-none">{passedSubjects.length * 4}</p>
               <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">of 145 Earned</p>
            </div>
          </div>
          <div className="grid grid-cols-2 w-full gap-4 mt-8 border-t border-slate-100 pt-8">
             <div className="text-center">
                <p className="text-lg font-bold text-[#276221]">{calcCGPA}</p>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Calculated CGPA</p>
             </div>
             <div className="text-center">
                <p className="text-lg font-bold text-slate-800">{student.department === 'Computer Science' ? 'CS Eng.' : student.department || 'N/A'}</p>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Major</p>
             </div>
          </div>
        </div>

        {/* Academic Distinctions */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
           <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-6">Academic Distinctions</h3>
           <div className="space-y-4">
              {[
                { title: "Dean's List - Sem 2", desc: "Top 5% of class performance", color: "bg-green-50 text-[#276221]", icon: "military_tech" },
                { title: "Smart Hackathon Runner-up", desc: "National Level Competition 2023", color: "bg-purple-50 text-purple-600", icon: "emoji_events" },
                { title: "Google Cloud Certification", desc: "Associate Cloud Engineer", color: "bg-slate-50 text-slate-600", icon: "verified" }
              ].map(item => (
                <div key={item.title} className="flex gap-4 p-4 rounded-xl border border-slate-50 hover:border-slate-100 transition-all hover:shadow-sm cursor-pointer group">
                   <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                   </div>
                   <div>
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{item.title}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-tight">{item.desc}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  )
}

function FeesTab({ student }) {
  const fees = student.fees || []
  const totalAmount = fees.reduce((s, f) => s + f.amount, 0)
  const totalPaid = fees.reduce((s, f) => s + f.paid, 0)
  const totalDue = fees.reduce((s, f) => s + f.due, 0)

  const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column - Payment Ledger */}
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Fee Payment Ledger</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#276221] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#276221]/90 transition-all shadow-sm">
               <span className="material-symbols-outlined text-[18px]">add</span>
               New Payment
            </button>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 text-slate-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                   <th className="px-8 py-4">Transaction ID</th>
                   <th className="px-4 py-4">Fee Type</th>
                   <th className="px-4 py-4">Date</th>
                   <th className="px-4 py-4">Method</th>
                   <th className="px-4 py-4 text-right">Amount</th>
                   <th className="px-8 py-4 text-center">Status</th>
                 </tr>
               </thead>
                <tbody className="divide-y divide-slate-100">
                 {fees.map(f => (
                   <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                     <td className="px-8 py-5 text-sm font-medium text-slate-400 group-hover:text-slate-600 transition-colors">#{f.id}</td>
                     <td className="px-4 py-5 text-sm font-medium text-slate-800">{f.type}</td>
                     <td className="px-4 py-5 text-sm font-medium text-slate-500">{f.date}</td>
                     <td className="px-4 py-5">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider">Online</span>
                     </td>
                     <td className="px-4 py-5 text-sm font-bold text-slate-900 text-right">{fmt(f.amount)}</td>
                     <td className="px-8 py-5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                           f.status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                           {f.status}
                        </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>

        {/* Payment History Notes */}
        <div className="bg-slate-50 rounded-xl p-8 border border-slate-100">
           <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Payment Remarks</h3>
           <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                 <div className="w-10 h-10 bg-green-50 text-[#276221] rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">sticky_note_2</span>
                 </div>
                 <p className="text-xs font-medium text-slate-500 leading-relaxed">
                   Next installment of ₹12,000 scheduled for July 15, 2024. Automated reminder has been sent to the guardian.
                 </p>
              </div>
           </div>
        </div>
      </div>

      {/* Right Column - Balance & Summary */}
      <div className="lg:col-span-4 space-y-8">
        {/* Outstanding Balance Card */}
        <div className="bg-[#1e293b] rounded-xl p-10 text-white relative overflow-hidden shadow-xl">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Outstanding</p>
           <h4 className="text-5xl font-bold mb-10 tracking-tighter">{fmt(totalDue)}</h4>
           
           <div className="space-y-6 pt-10 border-t border-white/10">
              <div className="flex items-center justify-between">
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Fees</span>
                 <span className="text-sm font-bold">{fmt(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid Amount</span>
                 <span className="text-sm font-bold text-green-400">{fmt(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Late Charges</span>
                 <span className="text-sm font-bold text-red-400">₹0.00</span>
              </div>
           </div>
           
           <button className="w-full mt-10 py-3 bg-[#276221] text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#276221]/90 transition-all">
              DOWNLOAD INVOICE (PDF)
           </button>
        </div>

        {/* Quick Payment Methods */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
           <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-6">Payment Methods</h3>
           <div className="space-y-3">
              {['HDFC Bank Summary', 'Unified Payments (UPI)', 'Credit/Debit Cards'].map(method => (
                <div key={method} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-[#276221]/30 transition-all cursor-pointer group">
                   <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">{method}</span>
                   <span className="material-symbols-outlined text-slate-300 group-hover:text-[#276221] text-[18px]">chevron_right</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  )
}

function DocumentsTab({ student, refreshData }) {
  const rawDocs = student.documents || [];
  const [viewingDoc, setViewingDoc] = useState(null);

  // Normalize documents: handle both array format (seed data) and object/dict format (from admissions)
  const docs = Array.isArray(rawDocs)
    ? rawDocs.map(d => {
        const fileData = (d.data && d.data.data) || (typeof d.data === 'string' ? d.data : null) || d.file_url || d.fileUrl || null;
        const fileName = (d.data && d.data.name) || d.name || 'Document';
        const fileSize = (d.data && d.data.size) ? `${(d.data.size / 1024 / 1024).toFixed(2)} MB` : (d.size || 'N/A');
        const uploadDateStr = d.uploadDate || d.uploadedAt || student.enrollDate || new Date().toISOString();
        return { ...d, fileName, fileSize, fileData, uploadDateStr };
      })
    : Object.entries(rawDocs)
        .map(([key, val]) => {
          if (!val) return null;
          // val can be a base64 string directly, or an object { name, size, data }
          const fileData = (val && typeof val === 'object' && val.data) ? val.data : (typeof val === 'string' ? val : null);
          const fileName = (val && val.name) || key
              .replace(/([A-Z])/g, ' $1')
              .replace(/[-_]+/g, ' ')
              .replace(/^\w/, (c) => c.toUpperCase())
              .trim();
          const fileSize = (val && val.size) ? `${(val.size / 1024 / 1024).toFixed(2)} MB` : 'N/A';
          const uploadDateStr = student.enrollDate || new Date().toISOString();
          const isPdf = typeof fileData === 'string' && fileData.includes('pdf');
          return {
            id: key,
            name: fileName,
            fileName,
            fileSize,
            fileData,
            uploadDateStr,
            type: isPdf ? 'pdf' : 'image',
          };
        })
        .filter(Boolean);

  const handleViewDoc = (doc) => {
    if (!doc.fileData) return;
    setViewingDoc(doc);
  };

  const isImage = (dataUri) => {
    if (!dataUri || typeof dataUri !== 'string') return false;
    return dataUri.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(dataUri);
  };

  const handleDownloadDoc = (doc) => {
    if (!doc.fileData) return;
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.fileName || doc.name || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column - Category Cards and Helper */}
      <div className="lg:col-span-4 space-y-8">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
           <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-6">File Categories</h3>
           <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Academic', count: docs.filter(d => d.type === 'pdf').length, color: 'bg-indigo-50 text-[#4c1d95]', icon: 'school' },
                { label: 'Identity', count: docs.filter(d => d.type !== 'pdf').length, color: 'bg-indigo-50 text-indigo-600', icon: 'badge' },
                { label: 'Fees', count: (student.fees || []).length, color: 'bg-purple-50 text-purple-600', icon: 'receipt_long' },
                { label: 'Others', count: 0, color: 'bg-slate-50 text-slate-400', icon: 'folder_open' }
              ].map(cat => (
                <div key={cat.label} className="p-4 rounded-xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-[#4c1d95]/20 transition-all cursor-pointer group">
                   <div className={`w-10 h-10 ${cat.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                   </div>
                   <p className="text-xs font-semibold text-slate-900 mb-0.5">{cat.label}</p>
                   <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">{cat.count} Files</p>
                </div>
              ))}
           </div>
        </div>

        {/* Upload Dropzone Preview */}
        <div className="bg-[#4c1d95]/5 border-2 border-dashed border-[#4c1d95]/20 rounded-xl p-10 flex flex-col items-center text-center group cursor-pointer hover:bg-[#4c1d95]/10 transition-all">
           <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-[#4c1d95] shadow-xl shadow-[#4c1d95]/10 mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
           </div>
           <h4 className="text-sm font-semibold text-[#4c1d95] uppercase tracking-wider mb-2">Upload New Media</h4>
           <p className="text-[10px] font-medium text-[#4c1d95]/60 uppercase tracking-tight">Drag & drop or browse files</p>
        </div>
      </div>

      {/* Right Column - Document List */}
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Document Storage</h3>
            <span className="text-xs font-medium text-slate-400">{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-8 py-4">Document Details</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Last Updated</th>
                    <th className="px-8 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-16">
                        <span className="material-symbols-outlined text-5xl text-slate-200 mb-3 block">folder_open</span>
                        <p className="text-sm font-semibold text-slate-400">No documents uploaded yet</p>
                        <p className="text-xs text-slate-300 mt-1">Upload documents from the panel on the left</p>
                      </td>
                    </tr>
                  ) : (
                    docs.map((doc, idx) => (
                      <tr key={doc.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-[#4c1d95]/10 group-hover:text-[#4c1d95] transition-all">
                                 <span className="material-symbols-outlined text-[20px]">{doc.type === 'pdf' ? 'picture_as_pdf' : 'image'}</span>
                              </div>
                              <div>
                                 <p className="text-sm font-semibold text-slate-800">{doc.name || doc.fileName}</p>
                                 <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{doc.fileSize || doc.size || 'N/A'}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-4 py-5">
                           <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${doc.fileData ? 'bg-green-500' : 'bg-amber-400'}`} />
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{doc.fileData ? 'Uploaded' : 'Pending'}</span>
                           </div>
                        </td>
                        <td className="px-4 py-5 text-sm font-medium text-slate-500">
                           {new Date(doc.uploadDateStr || doc.uploadDate || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-8 py-5 text-center">
                           <div className="flex items-center justify-center gap-1">
                              {doc.fileData && (
                                <button onClick={() => handleViewDoc(doc)} className="p-2 text-slate-400 hover:text-[#4c1d95] hover:bg-blue-50 rounded-lg transition-all" title="View">
                                   <span className="material-symbols-outlined text-[18px]">visibility</span>
                                </button>
                              )}
                              {doc.fileData && (
                                <button onClick={() => handleDownloadDoc(doc)} className="p-2 text-slate-400 hover:text-[#4c1d95] hover:bg-blue-50 rounded-lg transition-all" title="Download">
                                   <span className="material-symbols-outlined text-[18px]">download</span>
                                </button>
                              )}
                              {!doc.fileData && (
                                <span className="text-[10px] text-slate-300 italic">No file data</span>
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
      </div>
    </div>

      {/* ─── In-App Document Viewer Modal ─── */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-8" onClick={() => setViewingDoc(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#4c1d95] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    {isImage(viewingDoc.fileData) ? 'image' : 'picture_as_pdf'}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 truncate">{viewingDoc.name || viewingDoc.fileName}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{viewingDoc.fileSize || viewingDoc.size || ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownloadDoc(viewingDoc)}
                  className="p-2 text-slate-400 hover:text-[#4c1d95] hover:bg-blue-50 rounded-lg transition-all"
                  title="Download"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                  title="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center min-h-[300px]">
              {isImage(viewingDoc.fileData) ? (
                <img
                  src={viewingDoc.fileData}
                  alt={viewingDoc.name || 'Document'}
                  className="max-w-full max-h-[75vh] object-contain p-4"
                />
              ) : (
                <iframe
                  src={viewingDoc.fileData}
                  title={viewingDoc.name || 'Document Viewer'}
                  className="w-full h-[75vh] border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main Detail Page ────────────────────────────────────────────

const tabs = [
  { id: 'overview',  label: 'Overview',  icon: 'dashboard' },
  { id: 'academics', label: 'Academics', icon: 'school' },
  { id: 'fees',      label: 'Fees',      icon: 'payments' },
  { id: 'documents', label: 'Documents', icon: 'folder_open' },
]

export default function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshData = () => setRefreshKey(prev => prev + 1)

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setLoading(true)
        const [res, examsRes, marksRes] = await Promise.all([
          fetch(buildApiUrl(`/students/${encodeURIComponent(id)}`)),
          fetch(buildApiUrl(`/exams`)),
          fetch(buildApiUrl(`/exams/marks?student_id=${encodeURIComponent(id)}`))
        ])
        if (!res.ok) {
          if (res.status === 404) throw new Error('Student not found')
          throw new Error('Failed to fetch student details')
        }
        const data = await res.json()
        
        let allExams = [];
        let studentMarks = [];
        if (examsRes && examsRes.ok) {
          const examsData = await examsRes.json();
          allExams = examsData.data || [];
        }
        if (marksRes && marksRes.ok) {
          const marksData = await marksRes.json();
          studentMarks = marksData.data || [];
        }

        const norm = (c) => String(c || '').replace(/[-_\s]+/g, '').toUpperCase();

        // Map subjects to End-Sem marks
        const mapped = (data.subjects || []).map(sub => {
          const subCodeNorm = norm(sub.code);
          const endSemExam = allExams.find(e => norm(e.code) === subCodeNorm && e.type === 'End-Sem');
          let marksRecord = null;
          if (endSemExam) {
            const examId = endSemExam._id || endSemExam.id;
            marksRecord = studentMarks.find(m => String(m.examId) === String(examId));
          }
          if (!marksRecord) {
            marksRecord = studentMarks.find(m => {
              const ex = allExams.find(e => String(e._id || e.id) === String(m.examId));
              return ex && norm(ex.code) === subCodeNorm && ex.type === 'End-Sem';
            });
          }
          return {
            ...sub,
            grade: marksRecord ? (marksRecord.grade || 'Pending') : 'Pending',
            total: marksRecord ? (marksRecord.marks !== undefined ? marksRecord.marks : null) : null
          };
        });

        // Calculate dynamic CGPA based only on End-Sem passed courses
        const passed = mapped.filter(s => s.grade && s.grade !== 'Pending' && s.grade !== 'F');
        const totalObtained = passed.reduce((acc, s) => acc + (s.total || 0), 0);
        const totalMax = passed.length * 100;
        const calculatedCgpa = totalMax > 0 ? ((totalObtained / totalMax) * 10).toFixed(2) : '0.00';

        setStudent({
          ...data,
          subjects: mapped,
          cgpa: calculatedCgpa
        })
        setError(null)
      } catch (err) {
        console.error('Error fetching student:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchStudent()
  }, [id, refreshKey])

  if (loading) {
    return (
      <Layout title="Loading Student...">
        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
           <div className="w-24 h-24 bg-slate-100 rounded-xl mb-6" />
           <div className="w-48 h-4 bg-slate-100 rounded mb-2" />
           <div className="w-32 h-3 bg-slate-50 rounded" />
        </div>
      </Layout>
    )
  }

  if (error || !student) {
    return (
      <Layout title="Student Not Found">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">{error === 'Student not found' ? 'person_off' : 'cloud_off'}</span>
          <h2 className="text-xl font-bold text-slate-700 mb-2">{error === 'Student not found' ? 'Student Not Found' : 'Connection Error'}</h2>
          <p className="text-sm text-slate-500 mb-6">{error === 'Student not found' ? `No student record exists with ID "${id}"` : error}</p>
          <button
            onClick={() => navigate('/students')}
            className="px-5 py-2.5 bg-[#276221] text-white rounded-lg text-sm font-semibold hover:bg-[#1e4618] transition-all"
          >
            Back to Students
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Student Profile">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/students')}
          className="flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:text-[#276221] hover:border-[#276221] transition-all group uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span>Back to Students</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg">
             <div className="w-1.5 h-1.5 bg-[#276221] rounded-full animate-pulse" />
             <span className="text-[10px] font-bold text-[#276221] uppercase tracking-wider">Active Session</span>
          </div>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="text-right hidden md:block">
              <span className="block text-sm font-bold text-slate-900 leading-none">Admin Control</span>
              <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-1">Super User</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm mb-8 relative overflow-hidden group">
        {/* Abstract background element */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-1000" />
        <div className="absolute top-1/2 -right-12 w-32 h-32 bg-green-50/30 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-xl p-1 bg-gradient-to-br from-[#276221] to-[#60a5fa] shadow-xl">
                <img
                  src={student.avatar || `https://ui-avatars.com/api/?name=${student.name}&background=1162d4&color=fff&size=128`}
                  alt={student.name}
                  className="w-full h-full rounded-lg object-cover border-2 border-white"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
              </div>
            </div>
            
            <div className="text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{student.name}</h2>
                <span className="px-2.5 py-0.5 bg-green-50 text-[#276221] border border-green-100 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 sm:mt-0">
                  {student.id}
                </span>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
                  <span className="text-base font-semibold text-slate-600">{student.department}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block" />
                  <span className="text-base font-semibold text-slate-400">Semester {student.semester}</span>
                </div>
                
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-5 mt-2">
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <span className="material-symbols-outlined text-[20px] text-slate-300">school</span>
                      <span className="uppercase tracking-wide">{student.year} Year</span>
                   </div>
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <span className="material-symbols-outlined text-[20px] text-slate-300">location_on</span>
                      <span className="uppercase tracking-wide">Block C, Room 402</span>
                   </div>
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <span className="material-symbols-outlined text-[20px] text-slate-300">event_available</span>
                      <span className="uppercase tracking-wide">Batch 2023-27</span>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-[#276221] text-white rounded-lg text-sm font-semibold hover:bg-[#276221]/90 transition-all active:scale-95 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
              <span>Quick Action</span>
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[20px]">description</span>
              <span>Report</span>
            </button>
            <button className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-lg hover:text-[#276221] hover:border-[#276221] transition-all shadow-sm group/edit">
              <span className="material-symbols-outlined text-[20px] group-hover/edit:rotate-12 transition-transform">edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Underlined Tab Navigation */}
      <div className="flex items-center gap-8 border-b border-slate-200 mb-8 px-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-sm font-semibold transition-all relative ${
              activeTab === tab.id
                ? 'text-[#276221]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#276221] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && <OverviewTab student={student} />}
        {activeTab === 'academics' && <AcademicsTab student={student} onRefresh={refreshData} />}
        {activeTab === 'fees' && <FeesTab student={student} />}
        {activeTab === 'documents' && <DocumentsTab student={student} refreshData={refreshData} />}
      </div>
    </Layout>
  )
}
