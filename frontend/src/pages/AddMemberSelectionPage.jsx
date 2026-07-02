import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function AddMemberSelectionPage() {
  const navigate = useNavigate();

  const options = [
    {
      type: 'student',
      title: 'Add Student',
      icon: 'person',
      desc: 'Enroll a new student in the system',
      steps: '8 Steps',
      color: 'green'
    },
    {
      type: 'faculty',
      title: 'Add Faculty',
      icon: 'school',
      desc: 'Add a new faculty member',
      steps: '7 Steps',
      color: 'blue'
    },
  ];

  return (
    <Layout title="Add New Member"><div className="space-y-4">{/* Page Header */}
        <div className="bg-white rounded-lg shadow p-4"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-[#00236f]/10 rounded-lg"><span className="material-symbols-outlined text-lg text-[#00236f]">person_add</span></div><div><h1 className="text-lg font-semibold text-gray-900">Add New Member</h1><p className="text-xs text-gray-600 mt-0.5">Choose whether you want to add a student or faculty member</p></div></div></div>{/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{options.map((option) =>(
            <button
              key={option.type}
              onClick={() =>navigate(`/add-${option.type}`)}
              className="group relative overflow-hidden bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-200 hover:border-[#00236f] transition-all duration-300 p-4 text-left"
            >{/* Background gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#00236f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" /><div className="relative z-10 space-y-3">{/* Icon */}
                <div className="inline-block p-2 bg-gradient-to-br from-[#00236f]/10 to-[#00236f]/5 rounded-lg group-hover:from-[#00236f]/20 group-hover:to-[#00236f]/10 transition-all"><span className="material-symbols-outlined text-2xl text-[#00236f]">{option.icon}
                  </span></div>{/* Title */}
                <div><h3 className="text-base font-semibold text-gray-900 group-hover:text-[#00236f] transition-colors">{option.title}
                  </h3><p className="text-gray-600 mt-1 text-xs leading-relaxed">{option.desc}
                  </p></div>{/* Steps Badge */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100"><span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Process</span><span className="inline-block px-3 py-1 bg-[#00236f]/10 text-[#00236f] font-semibold text-xs rounded-full group-hover:bg-[#00236f]/20 transition-colors">{option.steps}
                  </span></div>{/* CTA Arrow */}
                <div className="flex items-center justify-end pt-1 gap-1 text-[#00236f] group-hover:translate-x-0.5 transition-transform"><span className="text-xs font-semibold">Start</span><span className="material-symbols-outlined text-sm">arrow_forward</span></div></div></button>))}
        </div>{/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><div className="flex gap-3"><span className="material-symbols-outlined text-blue-600 flex-shrink-0 text-lg">info</span><div><h4 className="font-semibold text-blue-900 mb-1 text-sm">What happens next?</h4><ul className="text-xs text-blue-700 space-y-0.5"><li>Fill in the required information step by step</li><li>Upload necessary documents and certificates</li><li>Review your application before final submission</li><li>Your application will be processed by the admin team</li></ul></div></div></div></div></Layout>);
}
