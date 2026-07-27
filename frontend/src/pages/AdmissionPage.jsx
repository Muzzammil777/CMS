import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAdmission } from '../context/AdmissionContext';
import AdmissionDetailsModal from '../components/AdmissionDetailsModal';
import { PageContainer, StatsSection, StatusBadge, ActionButtons, Pagination, TableSkeleton } from '../components/common';

export default function AdmissionPage() {
  const navigate = useNavigate();
  const {
    studentApps,
    facultyApps,
    updateStudentStatus,
    updateFacultyStatus,
    deleteStudentApp,
    deleteFacultyApp,
    loading,
  } = useAdmission();

  const [activeTab, setActiveTab] = useState('students');
  const [searchName, setSearchName] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Reset page when tab or search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchName]);

  const filteredApps = useMemo(() =>{
    let apps = activeTab === 'students' ? studentApps : facultyApps;
    
    return apps.map(app =>{
      if (activeTab === 'faculty' || app.designation) {
        return {
          ...app,
          role: app.designation || app.role,
          experience: app.yearsOfExperience,
          highestQualification: app.qualification,
        };
      }
      return app;
    }).filter((app) =>app.name?.toLowerCase().includes(searchName.toLowerCase()) ||
      app.fullName?.toLowerCase().includes(searchName.toLowerCase())
    );
  }, [activeTab, studentApps, facultyApps, searchName]);

  const totalPages = Math.max(1, Math.ceil(filteredApps.length / itemsPerPage));
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApps.slice(start, start + itemsPerPage);
  }, [filteredApps, currentPage, itemsPerPage]);

  const stats = [
    { value: studentApps.length, label: 'Total Student Adm', icon: 'group' },
    { value: facultyApps.length, label: 'Total Faculty', icon: 'person' },
    {
      value:
        studentApps.filter((a) =>a.status === 'Approved').length +
        facultyApps.filter((a) =>a.status === 'Approved').length,
      label: 'Approved',
      icon: 'check_circle',
    },
    {
      value:
        studentApps.filter((a) =>a.status === 'Rejected').length +
        facultyApps.filter((a) =>a.status === 'Rejected').length,
      label: 'Rejected',
      icon: 'cancel',
    },
  ];

  const handleApprove = async (id) =>{
    try {
      if (activeTab === 'students') {
        await updateStudentStatus(id, 'Approved');
        alert(` Student ${id} approved successfully! They will now appear in the Students tab.`);
      } else {
        await updateFacultyStatus(id, 'Approved');
        alert(` Faculty ${id} approved successfully! They will now appear in the Faculty list.`);
      }
    } catch (error) {
      alert(` Error approving application: ${error.message}`);
    }
  };

  const handleReject = (id) =>{
    if (activeTab === 'students') {
      updateStudentStatus(id, 'Rejected');
    } else {
      updateFacultyStatus(id, 'Rejected');
    }
  };

  const handleDelete = (id) =>{
    if (confirm('Are you sure you want to delete this application?')) {
      if (activeTab === 'students') {
        deleteStudentApp(id);
      } else {
        deleteFacultyApp(id);
      }
    }
  };

  const handleView = (app) =>{
    setSelectedApp({
      ...app,
      type: activeTab === 'students' ? 'student' : 'faculty',
    });
    setShowDetailsModal(true);
  };

  const getValue = (field) =>{
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field !== null) {
      return field.course || field.name || field.value || JSON.stringify(field);
    }
    return '';
  };

  return (
    <Layout title="Admission Management"><PageContainer>{/* Stats Section */}
        <StatsSection stats={stats} />{/* Tabs and Table Section */}
        <div className="bg-white rounded-lg shadow p-6"><div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"><div className="flex gap-2">{['students', 'faculty'].map((tab) =>(
                <button
                  key={tab}
                  onClick={() =>{
                    setActiveTab(tab);
                    setSearchName('');
                  }}
                  className={`px-4 py-2 font-medium rounded-lg transition-all ${
                    activeTab === tab
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >{tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>))}
            </div><div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto"><input
                type="text"
                placeholder="Search by name..."
                value={searchName}
                onChange={(e) =>setSearchName(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              /></div></div>{/* Table */}
          {loading ? (
            <TableSkeleton cols={activeTab === 'students' ? 6 : 5} rows={6} />
          ) : (
            <>
              <div className="overflow-x-auto"><table className="w-full text-sm min-w-[750px]"><thead><tr className="border-b-2 border-gray-200"><th className="text-left py-3 px-4 font-semibold text-gray-700">{activeTab === 'students' ? 'Application ID' : 'Employee ID'}
                      </th><th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th><th className="text-left py-3 px-4 font-semibold text-gray-700">{activeTab === 'students' ? 'Course' : 'Role'}
                      </th>{activeTab === 'faculty' && (
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>)}
                       <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>{activeTab === 'students' && (<th className="text-left py-3 px-4 font-semibold text-gray-700">Payment Status</th>)}<th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th></tr></thead><tbody>{paginatedApps.map((app) =>(
                      <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="py-3 px-4 text-gray-700">{app.id}</td><td className="py-3 px-4 text-gray-700">{app.name || app.fullName}</td><td className="py-3 px-4 text-gray-700">{activeTab === 'students' ? getValue(app.course) : getValue(app.role)}
                        </td>{activeTab === 'faculty' && (
                          <td className="py-3 px-4 text-gray-700">{getValue(app.department)}</td>)}
                         <td className="py-3 px-4"><StatusBadge status={app.status} /></td>{activeTab === 'students' && (<td className="py-3 px-4"><StatusBadge status={app.paymentStatus || 'Pending'} /></td>)}<td className="py-3 px-4"><div className="flex gap-2"><ActionButtons
                              onView={() =>handleView(app)}
                              onApprove={app.status === 'Pending' ? () =>handleApprove(app.id) : null}
                              onReject={app.status === 'Pending' ? () =>handleReject(app.id) : null}
                              onDelete={() =>handleDelete(app.id)}
                            /></div></td></tr>))}
                  </tbody></table>{filteredApps.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No applications found</div>)}
              </div>
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </>
          )}
          </div></PageContainer>{/* Modals */}
      {showDetailsModal && selectedApp && (
        <AdmissionDetailsModal
          isOpen={showDetailsModal}
          onClose={() =>setShowDetailsModal(false)}
          application={selectedApp}
          onApprove={() => {
            handleApprove(selectedApp.id);
            setShowDetailsModal(false);
          }}
          onReject={() => {
            handleReject(selectedApp.id);
            setShowDetailsModal(false);
          }}
        />)}
    </Layout>);
}
