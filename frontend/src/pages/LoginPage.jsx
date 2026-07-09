import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserSession, getUserSession } from '../auth/sessionController';
import { demoUsers } from '../data/roleConfig';
import { API_BASE, buildUploadUrl } from '../api/apiBase';

function GraduationIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 2.26L19.02 9 12 12.74 4.98 9 12 5.26zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" /></svg>);
}

function LoginArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: 18, height: 18, fill: 'white' }}><path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-8v2h8v14z" /></svg>);
}

function UserIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>);
}

function LockIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z" /></svg>);
}

function EyeOpenIcon() {
  return (
    <svg className="password-toggle-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>);
}

function EyeClosedIcon() {
  return (
    <svg className="password-toggle-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.83 9L5.5 2.5c-1.71 1.71-3.29 4.03-4.27 6.5 2.05 4.31 6.5 7.5 11.5 7.5 1.66 0 3.26-.29 4.74-.84l-1.5-1.5c-1.05.17-2.16.25-3.27.25-4.76 0-9.27-3.11-11-7.5 1.31-2.65 3.03-4.96 5.21-6.5L3.07 1.06 4.5 2.5 21 19l-1.44 1.44L11.83 9zm-1.83 1zM19.59 13.5c.75-.88 1.41-1.87 1.97-2.95-2.05-4.31-6.5-7.5-11.5-7.5-1.26 0-2.49.16-3.69.45l2.8 2.8c.37-.05.72-.14 1.09-.14 2.76 0 5 2.24 5 5 0 .42-.05.82-.14 1.21l3.47 3.47z" /></svg>);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loginFormSectionRef = useRef(null);

  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackAppId, setTrackAppId] = useState('');
  const [trackedApplication, setTrackedApplication] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  const handleTrackApplication = async (e) => {
    e.preventDefault();
    if (!trackAppId.trim()) {
      setTrackError('Please enter an Application ID.');
      return;
    }
    setTrackLoading(true);
    setTrackError('');
    try {
      const res = await fetch(`${API_BASE}/admissions/${trackAppId.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setTrackedApplication(data);
      } else {
        setTrackError('Application ID not found. Please double-check your ID.');
      }
    } catch (err) {
      console.error('Error tracking application:', err);
      setTrackError('Network error. Failed to reach the server.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleStudentDocUpload = async (docId, file) => {
    if (!file || !trackedApplication) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const standardDocTypes = [
          { id: 'DOC-01', name: 'Passport Photo' },
          { id: 'DOC-02', name: 'Aadhaar Card' },
          { id: 'DOC-03', name: 'Marksheet' },
          { id: 'DOC-04', name: 'Transfer Certificate' },
        ];
        
        const currentDocs = [...(trackedApplication.documents || [])];
        const docIndex = currentDocs.findIndex(d => d.id === docId);
        
        const newDoc = {
          id: docId,
          name: standardDocTypes.find(t => t.id === docId)?.name || 'Document',
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
        
        const anyRemainingRequest = currentDocs.some(d => d.status === 'Pending Re-upload');
        const newAppStatus = anyRemainingRequest ? 'Pending Documents' : 'Pending';

        const res = await fetch(`${API_BASE}/admissions/${trackedApplication.id}/documents`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documents: currentDocs, status: newAppStatus }),
        });

        if (!res.ok) {
          throw new Error('Failed to save document on the server');
        }

        alert('Document uploaded successfully!');
        
        const refreshRes = await fetch(`${API_BASE}/admissions/${trackedApplication.id}`);
        if (refreshRes.ok) {
          const freshData = await refreshRes.json();
          setTrackedApplication(freshData);
        }
      } catch (err) {
        alert('Upload failed: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const [systemSettings, setSystemSettings] = useState(null);

  useEffect(() =>{
    const activeSession = getUserSession();
    if (activeSession) {
      navigate(`/dashboard?role=${encodeURIComponent(activeSession.role)}`, { replace: true });
      return;
    }

    fetch(`${API_BASE}/settings/general`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.detail) {
          setSystemSettings(data);
          if (data.portalName) {
            document.title = `${data.portalName} — Multi Role Login`;
          }
        }
      })
      .catch(err => console.error("Error loading system settings in login:", err));
  }, [navigate]);

  useEffect(() => {
    // Auto-scroll to the login section on mobile/tablet views where sections stack
    if (window.innerWidth <= 1024) {
      const timer = setTimeout(() => {
        if (loginFormSectionRef.current) {
          loginFormSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const roleIcons = { student: '', admin: '', faculty: '', finance: '' };

  function loadDemo(demoRole) {
    setRole(demoRole);
    setUserId(demoUsers[demoRole].userId);
    setPassword(demoUsers[demoRole].password);
    setError('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!userId.trim() || !password) {
      setError('Please enter your role, user ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    window.setTimeout(async () =>{
      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, userId: userId.trim(), password }),
        });

        if (response.ok) {
          const data = await response.json();
          const user = data.user;
          createUserSession(role, user.userId, user);
          navigate(`/dashboard?role=${encodeURIComponent(role)}`, { replace: true });
          return;
        } else {
          const payload = await response.json().catch(() =>null);
          setError(payload?.detail || 'Invalid credentials. Check your User ID and password.');
        }
      } catch (err) {
        console.error('Login backend error:', err);
        setError('Database or network connection failed. Ensure backend is running.');
      } finally {
        setLoading(false);
      }
    }, 1000);
  }

  return (
    <div className="login-page"><div className="login-shell"><section className="login-showcase"><div className="showcase-badge">{systemSettings?.portalName || "Movi Institute of Technology"}</div><div className="showcase-brand-card"><div className="brand-icon overflow-hidden" style={systemSettings?.logoFileName ? { backgroundColor: 'white' } : {}}>{systemSettings?.logoFileName ? (<img src={buildUploadUrl(systemSettings.logoFileName)} alt="Logo" className="w-full h-full object-contain p-2" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='inline'; }} />) : null}{!systemSettings?.logoFileName ? <GraduationIcon /> : <span style={{display:'none'}}><GraduationIcon /></span>}</div><div><h1>{systemSettings?.portalName || "MIT Connect"}</h1><p>Unified Campus Management System</p></div></div><div className="showcase-copy"><h2>Welcome to the smart {systemSettings?.portalName || "MIT"} workspace</h2><p>One secure place for students, faculty, finance, and administration teams to manage academics,
              records, billing, and campus operations at {systemSettings?.portalName || "Movi Institute of Technology"}.
            </p></div><div className="showcase-grid"><article className="showcase-card"><h3>Overview</h3><p>Dashboard, students, faculty, and department visibility.</p></article><article className="showcase-card"><h3>Administration</h3><p>Admissions, fee control, and invoice handling.</p></article><article className="showcase-card"><h3>Intelligence</h3><p>Analytics, alerts, and role-based settings in one place.</p></article><article className="showcase-card"><h3>Academics</h3><p>Exams, timetable, attendance, placement, and facilities.</p></article></div></section><section ref={loginFormSectionRef} className="login-container"><div className="login-brand login-brand-split"><div className="brand-mark-row"><div className="brand-icon overflow-hidden" style={systemSettings?.logoFileName ? { backgroundColor: 'white' } : {}}>{systemSettings?.logoFileName ? (<img src={buildUploadUrl(systemSettings.logoFileName)} alt="Logo" className="w-full h-full object-contain p-2" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='inline'; }} />) : null}{!systemSettings?.logoFileName ? <GraduationIcon /> : <span style={{display:'none'}}><GraduationIcon /></span>}</div><div><h1>Sign In</h1><p>Access your role-based dashboard</p></div></div></div><div className="role-switcher">{Object.keys(demoUsers).map((roleKey) =>(
              <button
                key={roleKey}
                type="button"
                className={`role-switch-btn${roleKey === role ? ' active' : ''}`}
                onClick={() =>setRole(roleKey)}
              >{roleKey.charAt(0).toUpperCase() + roleKey.slice(1)}
              </button>))}
          </div><form onSubmit={handleSubmit} noValidate autoComplete="off"><div className="form-group role-select-hidden"><label htmlFor="role">Role</label><div className="input-wrap"><UserIcon /><select id="role" name="role" value={role} onChange={(event) =>setRole(event.target.value)} required><option value="student">Student</option><option value="admin">Admin</option><option value="faculty">Faculty</option><option value="finance">Finance</option></select></div></div><div className="form-group"><label htmlFor="userId">User ID</label><div className="input-wrap"><UserIcon /><input
                  type="text"
                  id="userId"
                  name="userId"
                  placeholder="e.g. STU-2024-1547"
                  autoComplete="off"
                  value={userId}
                  onChange={(event) =>setUserId(event.target.value)}
                  required
                /></div></div><div className="form-group"><label htmlFor="password">Password</label><div className="input-wrap password-input-wrap"><LockIcon /><input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="off"
                  value={password}
                  onChange={(event) =>setPassword(event.target.value)}
                  required
                /><button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() =>setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >{showPassword ? <EyeClosedIcon />: <EyeOpenIcon />}
                </button></div></div>{error ? <div className="login-message login-error">{error}</div>: null}

            <div style={{ marginBottom: '12px' }}><p style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Load Demo Credentials</p><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>{Object.keys(demoUsers).map((demoRole) =>(
                  <button
                    key={demoRole}
                    type="button"
                    onClick={() =>loadDemo(demoRole)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: role === demoRole ? '#6d28d9' : '#f8fafc',
                      color: role === demoRole ? '#ffffff' : '#475569',
                      border: role === demoRole ? '1.5px solid #6d28d9' : '1.5px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit',
                    }}
                  ><span style={{ fontSize: '14px' }}>{roleIcons[demoRole]}</span>{demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}
                  </button>))}
              </div></div><button type="submit" className="btn-login" id="loginBtn" disabled={loading}><LoginArrowIcon />{loading ? 'Signing in…' : 'Sign In'}
            </button></form>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowTrackModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6d28d9',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Track Admission Status & Upload Documents
              </button>
            </div>
          </section>
        </div>

        {showTrackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setShowTrackModal(false);
                  setTrackedApplication(null);
                  setTrackAppId('');
                  setTrackError('');
                }}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                &times;
              </button>

              <h2 className="text-xl font-bold text-gray-800 mb-2">Track Admission Application</h2>
              <p className="text-xs text-gray-500 mb-6">Enter your Application ID below to check your status and upload requested documents.</p>

              {!trackedApplication ? (
                <form onSubmit={handleTrackApplication} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Application ID</label>
                    <input
                      type="text"
                      placeholder="e.g. STU-1782290094407"
                      value={trackAppId}
                      onChange={(e) => setTrackAppId(e.target.value)}
                      className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  {trackError && <p className="text-xs text-red-500 font-medium">{trackError}</p>}
                  <button
                    type="submit"
                    disabled={trackLoading}
                    className="w-full py-2 bg-[#6d28d9] text-white rounded-lg text-sm font-semibold hover:bg-[#4c1d95] transition disabled:opacity-50"
                  >
                    {trackLoading ? 'Searching...' : 'Track Application'}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 border">
                    <p className="text-xs text-gray-500 font-medium font-semibold">Applicant Details</p>
                    <h3 className="text-sm font-bold text-gray-800">{trackedApplication.fullName || trackedApplication.name}</h3>
                    <p className="text-xs text-gray-600">Course: <span className="font-semibold text-gray-700">{trackedApplication.course}</span></p>
                    <p className="text-xs text-gray-600">ID: <span className="font-mono text-gray-700 font-semibold">{trackedApplication.id}</span></p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium font-semibold">Application Status</p>
                    <div className={`p-4 rounded-lg border flex flex-col gap-1 ${
                      trackedApplication.status === 'Approved'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : trackedApplication.status === 'Rejected'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : trackedApplication.status === 'Pending Documents'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-orange-50 border-orange-200 text-orange-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          trackedApplication.status === 'Approved'
                            ? 'bg-green-500'
                            : trackedApplication.status === 'Rejected'
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                        }`} />
                        <span className="text-sm font-bold uppercase tracking-wider">{trackedApplication.status}</span>
                      </div>
                      <p className="text-xs mt-1 leading-relaxed">
                        {trackedApplication.status === 'Approved'
                          ? 'Congratulations! Your application is approved. You can now sign in using your Application ID as your student login ID.'
                          : trackedApplication.status === 'Rejected'
                          ? 'We regret to inform you that your application has been rejected. Please contact the admissions office for further details.'
                          : trackedApplication.status === 'Pending Documents'
                          ? 'Action Required: The administration team has requested updated documents. Please check the document list below and re-upload the highlighted documents.'
                          : 'Your application is currently under review. The administrative team is verifying your details.'}
                      </p>
                    </div>
                  </div>

                  {/* Document upload list for student */}
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 font-medium font-semibold">Required Documents</p>
                    <div className="space-y-2">
                      {[
                        { id: 'DOC-01', name: 'Passport Photo' },
                        { id: 'DOC-02', name: 'Aadhaar Card' },
                        { id: 'DOC-03', name: 'Marksheet' },
                        { id: 'DOC-04', name: 'Transfer Certificate' }
                      ].map(docType => {
                        const doc = (trackedApplication.documents || []).find(d => d.id === docType.id);
                        const hasFile = doc && doc.data;
                        const isRequested = doc && doc.status === 'Pending Re-upload';

                        return (
                          <div key={docType.id} className="p-3 border rounded-lg bg-gray-50 flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-semibold text-gray-800">{docType.name}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  isRequested 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                    : hasFile
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}>
                                  {isRequested ? 'Action Required' : hasFile ? 'Uploaded' : 'Missing'}
                                </span>
                                {hasFile && (
                                  <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
                                    {doc.data.name || 'document_file'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex-shrink-0">
                              {isRequested ? (
                                <label className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded font-semibold transition cursor-pointer flex items-center justify-center">
                                  Upload
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleStudentDocUpload(docType.id, file);
                                    }}
                                  />
                                </label>
                              ) : hasFile ? (
                                <span className="text-xs text-green-600 font-semibold flex items-center gap-0.5">
                                  ✓ Verified
                                </span>
                              ) : (
                                <label className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded font-semibold transition cursor-pointer flex items-center justify-center">
                                  Upload
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleStudentDocUpload(docType.id, file);
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setTrackedApplication(null);
                      setTrackAppId('');
                      setTrackError('');
                    }}
                    className="w-full py-2 bg-gray-100 border text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                  >
                    Track Another Application
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
    </div>);
}
