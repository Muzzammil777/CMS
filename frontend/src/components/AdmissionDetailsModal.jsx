import React from 'react';
import { useAdmission } from '../context/AdmissionContext';

const standardDocTypes = [
  { id: 'DOC-01', name: 'Passport Photo' },
  { id: 'DOC-02', name: 'Aadhaar Card' },
  { id: 'DOC-03', name: 'Marksheet' },
  { id: 'DOC-04', name: 'Transfer Certificate' },
];

export default function AdmissionDetailsModal({ isOpen, onClose, application, onApprove, onReject }) {
  const { updateStudentDocuments } = useAdmission();

  if (!isOpen || !application) return null;

  const isStudent = application.type === 'student';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {isStudent ? 'Student' : 'Faculty'} Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-semibold"
          >
            &times;
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span
            className={`px-4 py-2 rounded-full font-semibold ${
              application.status === 'Approved'
                ? 'bg-green-100 text-green-800'
                : application.status === 'Rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            Status: {application.status}
          </span>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-gray-800 mb-4 text-lg">Personal Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="font-semibold text-gray-800">
                    {application.fullName || application.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-800">{application.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-800">{application.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="font-semibold text-gray-800">{application.dateOfBirth}</p>
                </div>
                {application.gender && (
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="font-semibold text-gray-800">{application.gender}</p>
                  </div>
                )}
              </div>
            </div>

            {isStudent && (
              <div>
                <h3 className="font-bold text-gray-800 mb-4 text-lg">Guardian Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Guardian Name</p>
                    <p className="font-semibold text-gray-800">{application.guardianName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-800">{application.guardianPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Relationship</p>
                    <p className="font-semibold text-gray-800">{application.relationship || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {isStudent ? (
              <>
                <div>
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">Academic Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Course</p>
                      <p className="font-semibold text-gray-800">{application.course}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Semester</p>
                      <p className="font-semibold text-gray-800">{application.semester}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Roll Number</p>
                      <p className="font-semibold text-gray-800">{application.roll}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">CGPA</p>
                      <p className="font-semibold text-gray-800">{application.cgpa}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">Address</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-semibold text-gray-800">{application.address || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">City</p>
                        <p className="font-semibold text-gray-800">{application.city || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">State</p>
                        <p className="font-semibold text-gray-800">{application.state || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pincode</p>
                        <p className="font-semibold text-gray-800">{application.pincode || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">Professional Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Role</p>
                      <p className="font-semibold text-gray-800">{application.role}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="font-semibold text-gray-800">{application.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Qualification</p>
                      <p className="font-semibold text-gray-800">{application.qualification}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">Experience</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Years of Experience</p>
                      <p className="font-semibold text-gray-800">{application.experience} years</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Specialization</p>
                      <p className="font-semibold text-gray-800">{application.specialization}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <h3 className="font-bold text-gray-800 mb-4 text-lg">System Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">ID</p>
                  <p className="font-semibold text-gray-800">{application.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created Date</p>
                  <p className="font-semibold text-gray-800">
                    {application.createdDate || new Date().toISOString().split('T')[0]}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documents & Verification Section */}
        {isStudent && (
          <div className="mt-8 border-t pt-6">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">Documents & Verification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {standardDocTypes.map((docType) => {
                const doc = (application.documents || []).find(d => d.id === docType.id);
                const hasFile = doc && doc.data;
                const isRequested = doc && doc.status === 'Pending Re-upload';

                return (
                  <div key={docType.id} className="p-4 border rounded-lg bg-gray-50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800 text-sm">{docType.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isRequested 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                            : hasFile
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {isRequested ? 'Re-upload Requested' : hasFile ? 'Uploaded' : 'Not Uploaded'}
                        </span>
                      </div>
                      {hasFile && (
                        <p className="text-xs text-gray-500 truncate mb-3">
                          File: {doc.data.name || 'document_file'}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-2">
                      {hasFile && (
                        <button
                          onClick={() => {
                            const fileData = doc.data?.data || doc.data;
                            if (!fileData) return alert("No document data available");
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(`<iframe src="${fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                            } else {
                              const link = document.createElement('a');
                              link.href = fileData;
                              link.download = doc.data.name || 'document';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }
                          }}
                          className="px-2.5 py-1 bg-white border border-gray-300 text-gray-700 text-xs rounded font-medium hover:bg-gray-50 transition"
                        >
                          View
                        </button>
                      )}
                      <label className="px-2.5 py-1 bg-white border border-gray-300 text-gray-700 text-xs rounded font-medium hover:bg-gray-50 cursor-pointer flex items-center justify-center transition">
                        Change
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const currentDocs = [...(application.documents || [])];
                                const docIndex = currentDocs.findIndex(d => d.id === docType.id);
                                const newDoc = {
                                  id: docType.id,
                                  name: docType.name,
                                  type: 'base64',
                                  status: 'Uploaded',
                                  data: {
                                    name: file.name,
                                    size: file.size,
                                    data: reader.result
                                  }
                                };
                                if (docIndex > -1) {
                                  currentDocs[docIndex] = newDoc;
                                } else {
                                  currentDocs.push(newDoc);
                                }
                                updateStudentDocuments(application.id, currentDocs)
                                  .then(() => alert('Document uploaded successfully!'))
                                  .catch(err => alert('Failed to upload document: ' + err.message));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button
                        disabled={isRequested}
                        onClick={() => {
                          const currentDocs = [...(application.documents || [])];
                          const docIndex = currentDocs.findIndex(d => d.id === docType.id);
                          const updatedDoc = docIndex > -1 
                            ? { ...currentDocs[docIndex], status: 'Pending Re-upload' }
                            : { id: docType.id, name: docType.name, type: 'base64', status: 'Pending Re-upload', data: null };
                          if (docIndex > -1) {
                            currentDocs[docIndex] = updatedDoc;
                          } else {
                            currentDocs.push(updatedDoc);
                          }
                          updateStudentDocuments(application.id, currentDocs, 'Pending Documents')
                            .then(() => alert(`Re-upload request sent for ${docType.name}!`))
                            .catch(err => alert('Failed to send request: ' + err.message));
                        }}
                        className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                          isRequested
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        Request Re-upload
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Close/Action Buttons */}
        <div className="mt-8 flex justify-end gap-3 border-t pt-6">
          {application.status === 'Pending' && onReject && (
            <button
              onClick={onReject}
              className="px-6 py-2 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition"
            >
              Reject
            </button>
          )}
          {application.status === 'Pending' && onApprove && (
            <button
              onClick={onApprove}
              className="px-6 py-2 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition"
            >
              Approve
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
