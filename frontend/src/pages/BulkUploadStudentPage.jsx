import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { TableSkeleton } from '../components/common';
import { buildApiUrl } from '../api/apiBase';

export default function BulkUploadStudentPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [useAutoPassword, setUseAutoPassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }
    setError(null);
    setFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text) => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) {
        setError('The CSV file is empty.');
        return;
      }

      // Helper to parse CSV row (handles quotes/commas)
      const parseCSVRow = (rowText) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < rowText.length; i++) {
          const char = rowText[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const rawHeaders = parseCSVRow(lines[0]);
      // Normalize headers (remove quotes if any)
      const cleanHeaders = rawHeaders.map(h => h.replace(/^["']|["']$/g, '').trim());
      setHeaders(cleanHeaders);

      const items = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVRow(lines[i]);
        if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

        const obj = {};
        cleanHeaders.forEach((h, index) => {
          let val = cols[index] || '';
          // Remove wrapping quotes
          val = val.replace(/^["']|["']$/g, '').trim();
          obj[h] = val;
        });

        // Ensure key fields are mapped correctly
        const normalizedObj = {
          name: obj.name || obj.fullName || obj.Name || obj['Full Name'] || '',
          email: obj.email || obj.Email || '',
          phone: obj.phone || obj.Phone || obj['Phone Number'] || '',
          dob: obj.dob || obj.dateOfBirth || obj.DOB || obj['Date of Birth'] || '',
          gender: obj.gender || obj.Gender || 'Male',
          department: obj.department || obj.Department || 'Computer Science',
          course: obj.course || obj.Course || 'CSE',
          year: obj.year || obj.Year || '1st Year',
          semester: obj.semester || obj.Semester || '1',
          section: obj.section || obj.Section || 'A',
          quota: obj.quota || obj.Quota || 'Government Quota',
          accommodation: obj.accommodation || obj.Accommodation || 'Day Scholar',
          address: obj.address || obj.Address || '',
          previousSchool: obj.previousSchool || obj.previous_school || obj['Previous School'] || '',
          board: obj.board || obj.Board || 'CBSE',
          yearOfPassing: obj.yearOfPassing || obj.year_of_passing || obj['Year of Passing'] || '',
          marksPercentage: obj.marksPercentage || obj.marks_percentage || obj['Marks Percentage'] || '',
        };

        if (normalizedObj.name) {
          items.append ? items.push(normalizedObj) : items.push(normalizedObj);
        }
      }

      if (items.length === 0) {
        setError('No valid student records found in CSV. Make sure you have at least a "name" column.');
      } else {
        setParsedData(items);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to parse CSV. Please check formatting.');
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;
    if (!useAutoPassword && !defaultPassword.trim()) {
      alert('Please enter a default password.');
      return;
    }

    setUploading(true);
    try {
      const res = await fetch(buildApiUrl('/students/bulk-import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: parsedData,
          defaultPassword: useAutoPassword ? null : defaultPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await res.json();
      alert(`Successfully imported ${result.count} student admission requests!\nThey will appear in the Admissions pending queue for approval.`);
      navigate('/students');
    } catch (err) {
      console.error(err);
      alert(`Error importing students: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout title="Bulk Upload Students">
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#00236f]/10 rounded-lg">
              <span className="material-symbols-outlined text-lg text-[#00236f]">upload_file</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Bulk Student Creation</h1>
              <p className="text-xs text-gray-600 mt-0.5">Upload a CSV file containing multiple student records to request admissions approval.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span className="font-medium">Back</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Upload Configuration & Area */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-2">1. Upload File</h3>
              
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[160px] ${
                  dragActive ? 'border-green-500 bg-green-50/50' : 'border-gray-300 hover:border-[#00236f] hover:bg-gray-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileChange}
                />
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">cloud_upload</span>
                {file ? (
                  <div>
                    <p className="text-xs font-bold text-gray-700">{file.name}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-gray-700">Drag & drop CSV file, or <span className="text-[#00236f] font-semibold underline">browse</span></p>
                    <p className="text-[10px] text-gray-400 mt-1">File must be in .csv format</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600 font-medium flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm flex-shrink-0 mt-0.5">error</span>
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-2">2. Security Settings</h3>
              
              {/* Password Setting */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-amber-600 text-lg">lock</span>
                  <label className="text-xs font-bold text-amber-800 uppercase tracking-wider">Default Password Setup</label>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAutoPassword}
                    onChange={(e) => {
                      setUseAutoPassword(e.target.checked);
                      if (e.target.checked) setDefaultPassword('');
                    }}
                    className="w-4 h-4 rounded text-[#00236f] focus:ring-[#00236f]"
                  />
                  <span className="text-xs text-gray-700 font-medium">Auto-generate from Student ID / Roll Number</span>
                </label>
                {!useAutoPassword && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Set Custom Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={defaultPassword}
                        onChange={(e) => setDefaultPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00236f]/20"
                        placeholder="e.g. Welcome2026"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={parsedData.length === 0 || uploading}
                className="w-full px-6 py-2.5 bg-[#00236f] text-white text-sm rounded-lg hover:bg-[#001a54] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Importing Records...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span>Submit {parsedData.length > 0 ? `${parsedData.length} Students` : 'CSV'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* CSV Preview Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow p-6 h-full flex flex-col">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4 flex items-center justify-between">
                <span>CSV Preview & Data Fields</span>
                {parsedData.length > 0 && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {parsedData.length} rows loaded
                  </span>
                )}
              </h3>

              {parsedData.length > 0 ? (
                <div className="flex-1 overflow-x-auto min-h-[300px]">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-bold uppercase tracking-wider">
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Dept</th>
                        <th className="py-2 px-3">Course</th>
                        <th className="py-2 px-3">Year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {parsedData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">{row.name}</td>
                          <td className="py-2.5 px-3">{row.email}</td>
                          <td className="py-2.5 px-3">{row.phone}</td>
                          <td className="py-2.5 px-3">{row.department}</td>
                          <td className="py-2.5 px-3">{row.course}</td>
                          <td className="py-2.5 px-3">{row.year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 10 && (
                    <div className="text-center py-3 bg-gray-50 border-t text-[11px] text-gray-500 font-medium">
                      Showing first 10 of {parsedData.length} records.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 border border-dashed border-gray-200 rounded-xl min-h-[300px]">
                  <span className="material-symbols-outlined text-5xl mb-3 text-gray-300">table_chart</span>
                  <h4 className="font-bold text-gray-600 text-sm">No Preview Available</h4>
                  <p className="text-xs text-gray-500 max-w-sm mt-1">Upload a CSV file to inspect the student records and headers before importing them.</p>
                  
                  {/* Guidelines */}
                  <div className="mt-6 text-left bg-slate-50 border border-slate-100 rounded-lg p-4 max-w-md">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Recommended CSV Headers:</h5>
                    <ul className="text-[10px] text-slate-600 space-y-1 list-disc list-inside">
                      <li><code className="font-bold text-indigo-600">name</code> / <code className="font-bold text-indigo-600">fullName</code> - Full name of student (Required)</li>
                      <li><code className="font-bold text-indigo-600">email</code> - Email address</li>
                      <li><code className="font-bold text-indigo-600">phone</code> - 10-digit phone number</li>
                      <li><code className="font-bold text-indigo-600">department</code> - e.g. Computer Science</li>
                      <li><code className="font-bold text-indigo-600">course</code> - e.g. CSE, ECE</li>
                      <li><code className="font-bold text-indigo-600">dob</code> - Date of birth (YYYY-MM-DD)</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
