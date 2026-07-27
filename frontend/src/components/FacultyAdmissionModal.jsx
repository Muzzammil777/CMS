import React, { useState, useEffect } from 'react';
import { useAdmission } from '../context/AdmissionContext';
import { API_BASE } from '../api/apiBase';
import { settingsApi } from '../api/settingsApi';

const steps = [
  { number: 1, title: 'Personal' },
  { number: 2, title: 'Professional' },
  { number: 3, title: 'Qualification' },
  { number: 4, title: 'Documents' },
  { number: 5, title: 'Employment' },
  { number: 6, title: 'Payment' },
  { number: 7, title: 'Review' },
];

export default function FacultyAdmissionModal({ isOpen, onClose }) {
  const { addFacultyApp } = useAdmission();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await settingsApi.getDepartments();
        setDepartments(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({
            ...prev,
            department: prev.department || data[0].name
          }));
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepts();
  }, []);
  const [formData, setFormData] = useState({
    // Step 1: Personal
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    // Step 2: Professional
    role: '',
    department: '',
    yearsOfExperience: '',
    // Step 3: Qualification
    highestQualification: '',
    specialization: '',
    university: '',
    // Step 4: Documents
    resume: null,
    certifications: null,
    // Step 5: Employment Type
    employmentType: '',
    // Step 6: Payment
    paymentMethod: '',
    // Step 7: Review will use all above data
  });

  const [paymentDone, setPaymentDone] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardHolderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    upiId: '',
  });

  const handlePaymentDetailsChange = (e) =>{
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cardNumber') {
      // Remove all non-digits and limit to 16 digits
      formattedValue = value.replace(/\D/g, '').slice(0, 16);
      // Format as 4 groups of 4 digits
      if (formattedValue.length >0) {
        formattedValue = formattedValue.match(/.{1,4}/g).join(' ');
      }
    } else if (name === 'expiryDate') {
      // Remove all non-digits and limit to 4 digits
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
      // Format as MM/YY
      if (formattedValue.length >= 2) {
        formattedValue = formattedValue.slice(0, 2) + '/' + formattedValue.slice(2, 4);
      }
    } else if (name === 'cvv') {
      // Remove all non-digits and limit to 3 digits
      formattedValue = value.replace(/\D/g, '').slice(0, 3);
    }

    setPaymentDetails((prev) =>({
      ...prev,
      [name]: formattedValue,
    }));
  };

  const handleAutoFillDemo = () =>{
    setFormData({
      fullName: 'Dr. Rajesh Kumar',
      email: 'rajesh.kumar@faculty.edu',
      phone: '9876543211',
      dateOfBirth: '1985-03-20',
      gender: 'Male',
      role: 'Associate Professor',
      department: 'Computer Science',
      yearsOfExperience: '12',
      highestQualification: 'Ph.D.',
      specialization: 'Artificial Intelligence',
      university: 'Delhi University',
      resume: new File(['demo'], 'resume.pdf', { type: 'application/pdf' }),
      certifications: new File(['demo'], 'certifications.pdf', { type: 'application/pdf' }),
      employmentType: 'Full-Time',
      paymentMethod: 'UPI',
    });
    alert(' Demo data filled! All fields populated with sample data.');
  };

  if (!isOpen) return null;

  const handleInputChange = (e) =>{
    const { name, value } = e.target;
    setFormData((prev) =>({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e, fieldName) =>{
    const file = e.target.files?.[0];
    setFormData((prev) =>({
      ...prev,
      [fieldName]: file,
    }));
  };

  const handleNext = () =>{
    if (currentStep < 7) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () =>{
    if (currentStep >1) setCurrentStep(currentStep - 1);
  };

  const handlePayment = () =>{
    // Open payment modal directly - payment method validation happens in handleCompletePayment
    setShowPaymentDetails(true);
  };

  const handleCompletePayment = () =>{
    // Validate that payment method is selected
    if (!formData.paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    // Validate payment details based on payment method
    if (formData.paymentMethod === 'Credit Card' || formData.paymentMethod === 'Debit Card') {
      if (!paymentDetails.cardHolderName || !paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv) {
        alert('Please fill all card details');
        return;
      }
    } else if (formData.paymentMethod === 'UPI') {
      if (!paymentDetails.upiId) {
        alert('Please enter UPI ID');
        return;
      }
    }

    setShowPaymentDetails(false);
    setPaymentDone(true);
    setTimeout(() =>{
      handleNext();
    }, 2000);
  };

  const handleCancelPayment = () =>{
    setShowPaymentDetails(false);
    setPaymentDetails({
      cardHolderName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      upiId: '',
    });
  };

  const handleSubmit = async () =>{
    try {
      setIsLoading(true);

      // Validate required fields
      if (!formData.fullName || !formData.email || !formData.phone || !formData.dateOfBirth) {
        alert(' Please fill all required personal information fields');
        setIsLoading(false);
        return;
      }
      if (!formData.role || !formData.department) {
        alert(' Please fill professional information');
        setIsLoading(false);
        return;
      }

      const facultyData = {
        // Personal Information
        fullName: formData.fullName,
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        
        // Professional Information
        role: formData.role,
        designation: formData.role,
        department: formData.department,
        yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
        
        // Qualification
        highestQualification: formData.highestQualification,
        qualification: formData.highestQualification,
        specialization: formData.specialization,
        university: formData.university,
        
        // Employment
        employmentType: formData.employmentType,
        
        // Payment Status
        paymentMethod: formData.paymentMethod,
        paymentStatus: 'Paid',
        status: 'Pending',
        type: 'faculty',
      };

      console.log(' Submitting faculty data:', facultyData);
      
      // Try to fetch from the backend with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() =>controller.abort(), 10000); // 10 second timeout

      // Try faculty-specific endpoint first, fall back to admissions endpoint
      let response;
      let endpoint = `${API_BASE}/faculty/admission/submit`;
      
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(facultyData),
          signal: controller.signal,
        });
      } catch (err) {
        // If faculty endpoint fails, try admissions endpoint
        console.warn(' Faculty endpoint failed, trying admissions endpoint...');
        endpoint = `${API_BASE}/admissions/create`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(facultyData),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);
      console.log(' Response status:', response.status, 'from', endpoint);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to save admission`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // Error response is not JSON
        }
        throw new Error(errorMessage);
      }

      let responseData;
      try {
        responseData = await response.json();
        console.log(' Faculty admission saved successfully:', responseData);
      } catch (parseError) {
        console.warn(' Response is not JSON, but submission was successful');
        responseData = { employeeId: 'FAC-' + Date.now(), id: 'FAC-' + Date.now() };
      }
      
      // Also save to local state for context
      addFacultyApp(facultyData);
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        role: '',
        department: '',
        yearsOfExperience: '',
        highestQualification: '',
        specialization: '',
        university: '',
        resume: null,
        certifications: null,
        employmentType: '',
        paymentMethod: '',
      });
      setPaymentDone(false);
      setCurrentStep(1);
      
      const empId = responseData.employeeId || responseData.id || 'Processing';
      alert(` Faculty admission submitted successfully!\n\nEmployee ID: ${empId}\n\nYour application is now under review.`);
      onClose();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(' Request timeout:', error);
        alert(' Connection timeout. Please check if backend server is running on port 5000.\n\nTroubleshoot:\n1. Start backend: python -m uvicorn main:app --host 0.0.0.0 --port 5000\n2. Check CORS policy\n3. Verify API_BASE URL in frontend');
      } else if (error instanceof TypeError) {
        console.error(' Network error:', error);
        alert(' Network error - Failed to reach backend server.\n\nPlease ensure:\n1. Backend is running (port 5000)\n2. No network firewall blocking\n3. API_BASE is correctly configured');
      } else {
        console.error(' Error submitting faculty admission:', error);
        alert(` Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg max-w-3xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">{/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-800 text-white px-6 py-4 relative"><h1 className="text-lg font-semibold">Faculty Admission Form</h1><p className="text-green-100 text-xs mt-0.5">Complete all steps to submit your application</p><button
            onClick={handleAutoFillDemo}
            className="absolute top-5 right-16 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1.5 px-3 rounded-lg transition text-xs"
          >Auto Fill
          </button><button
            onClick={onClose}
            className="absolute top-3 right-4 text-white hover:bg-green-600 p-1.5 rounded-full"
          ></button></div>{/* Content */}
        <div className="p-6">{/* Progress Steps */}
          <div className="mb-6"><div className="text-xs text-gray-600 mb-3 font-medium">Step {currentStep} of 7</div><div className="flex justify-between items-end gap-1.5">{steps.map((step) =>(
                <div key={step.number} className="flex flex-col items-center flex-1"><div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition mb-1.5 ${
                      step.number < currentStep
                        ? 'bg-green-500 text-white'
                        : step.number === currentStep
                        ? 'bg-green-700 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >{step.number < currentStep ? '' : step.number}
                  </div><div className="text-xs text-center font-medium">{step.title}</div></div>))}
            </div></div>{/* Form Content */}
          <div className="min-h-[300px]">{currentStep === 1 && (
              <div className="space-y-3"><h2 className="text-sm font-semibold text-gray-800 mb-3">Personal Information</h2><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label><input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Gender</label><select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    ><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label><input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-700 mb-1">Email *</label><input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label><input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    /></div></div></div>)}

            {currentStep === 2 && (
              <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Professional Details</h2><div><label className="block text-sm font-medium text-gray-700 mb-2">Designation *</label><select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  ><option value="">Select Designation</option><option value="Professor">Professor</option><option value="Associate Professor">Associate Professor</option><option value="Assistant Professor">Assistant Professor</option><option value="Lecturer">Lecturer</option></select></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Department *</label><select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    ><option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.code} value={d.name}>{d.name}</option>
                      ))}
                    </select></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label><input
                      type="number"
                      name="yearsOfExperience"
                      value={formData.yearsOfExperience}
                      onChange={handleInputChange}
                      placeholder="e.g., 5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    /></div></div></div>)}

            {currentStep === 3 && (
              <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Qualifications</h2><div><label className="block text-sm font-medium text-gray-700 mb-2">Highest Qualification *</label><select
                    name="highestQualification"
                    value={formData.highestQualification}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  ><option value="">Select</option><option value="B.Tech">B.Tech (Bachelor of Technology)</option><option value="M.Tech">M.Tech (Master of Technology)</option><option value="B.E.">B.E. (Bachelor of Engineering)</option><option value="M.E.">M.E. (Master of Engineering)</option><option value="MBBS">MBBS (Bachelor of Medicine, Surgery)</option><option value="MD">MD (Doctor of Medicine)</option><option value="MS">MS (Master of Surgery)</option><option value="BDS">BDS (Bachelor of Dental Surgery)</option><option value="MDS">MDS (Master of Dental Surgery)</option><option value="B.Pharm">B.Pharm (Bachelor of Pharmacy)</option><option value="M.Pharm">M.Pharm (Master of Pharmacy)</option><option value="B.A.">B.A. (Bachelor of Arts)</option><option value="M.A.">M.A. (Master of Arts)</option><option value="B.F.A.">B.F.A. (Bachelor of Fine Arts)</option><option value="M.F.A.">M.F.A. (Master of Fine Arts)</option><option value="B.Sc">B.Sc (Bachelor of Science)</option><option value="M.Sc">M.Sc (Master of Science)</option><option value="B.Com">B.Com (Bachelor of Commerce)</option><option value="M.Com">M.Com (Master of Commerce)</option><option value="BBA">BBA (Bachelor of Business Admin)</option><option value="MBA">MBA (Master of Business Admin)</option><option value="LL.B.">LL.B. (Bachelor of Laws)</option><option value="LL.M.">LL.M. (Master of Laws)</option><option value="M.Phil">M.Phil (Master of Philosophy)</option><option value="Ph.D.">Ph.D. (Doctor of Philosophy)</option><option value="Post-Doc">Post-Doctoral Fellowship</option></select></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label><input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleInputChange}
                      placeholder="e.g., Artificial Intelligence"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">University</label><input
                      type="text"
                      name="university"
                      value={formData.university}
                      onChange={handleInputChange}
                      placeholder="e.g., MIT"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    /></div></div></div>)}

            {currentStep === 4 && (
              <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Upload Documents</h2><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Resume/CV *
                    </label><input
                      type="file"
                      onChange={(e) =>handleFileChange(e, 'resume')}
                      className={`w-full px-4 py-2 border rounded-lg ${formData.resume ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}
                    />{formData.resume && (
                      <p className="text-xs text-green-600 mt-1">{formData.resume.name}</p>)}
                    {!formData.resume && (
                      <p className="text-xs text-red-600 mt-1">This field is required</p>)}
                  </div><div><label className="block text-sm font-medium text-gray-700 mb-2">Certifications *
                    </label><input
                      type="file"
                      onChange={(e) =>handleFileChange(e, 'certifications')}
                      className={`w-full px-4 py-2 border rounded-lg ${formData.certifications ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}
                    />{formData.certifications && (
                      <p className="text-xs text-green-600 mt-1">{formData.certifications.name}</p>)}
                    {!formData.certifications && (
                      <p className="text-xs text-red-600 mt-1">This field is required</p>)}
                  </div></div></div>)}

            {currentStep === 5 && (
              <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Employment Type</h2><div className="space-y-3">{['Full-Time', 'Part-Time', 'Contract'].map((option) =>(
                    <label
                      key={option}
                      className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-green-50 transition"
                      style={{
                        borderColor: formData.employmentType === option ? '#3b82f6' : '#e5e7eb',
                        backgroundColor: formData.employmentType === option ? '#eff6ff' : 'transparent',
                      }}
                    ><input
                        type="radio"
                        name="employmentType"
                        value={option}
                        checked={formData.employmentType === option}
                        onChange={handleInputChange}
                        className="w-4 h-4"
                      /><span className="ml-3 font-medium text-gray-700">{option}</span></label>))}
                </div></div>)}

            {currentStep === 6 && !paymentDone && (
              <div className="space-y-6"><div className="bg-green-50 border-2 border-green-200 rounded-lg p-6"><h3 className="text-lg font-bold text-gray-800 mb-4">Registration Fee</h3><div className="bg-white rounded-lg p-4 mb-4 border border-green-300"><p className="text-4xl font-bold text-green-700 mb-2">₹1000</p><p className="text-gray-600 text-sm">One-time registration processing fee</p></div><div className="bg-green-100 border-l-4 border-green-600 p-3 rounded"><p className="text-sm text-green-800">Click "Proceed to Payment" to complete your payment securely
                    </p></div></div></div>)}

            {currentStep === 6 && paymentDone && (
              <div className="text-center py-8"><div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-white text-3xl"></span></div><h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3><p className="text-gray-600 mb-4">Your payment has been processed successfully</p><div className="bg-green-50 p-4 rounded-lg mb-4 text-left"><p className="text-sm text-gray-600"><strong>Amount Paid:</strong>₹1000
                  </p><p className="text-sm text-gray-600"><strong>Transaction ID:</strong>TXN{new Date().getTime()}
                  </p><p className="text-sm text-gray-600"><strong>Date & Time:</strong>{new Date().toLocaleString()}
                  </p></div></div>)}

            {currentStep === 7 && (
              <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Review Your Application</h2><div className="bg-green-50 border-2 border-green-500 rounded-lg p-3 mb-4"><p className="text-green-800 flex items-center"><span className="text-xl mr-2"></span><strong>Payment Status:</strong>Paid
                  </p></div><div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm"><div className="border-b pb-2"><p className="text-gray-600"><strong>Name:</strong>{formData.fullName}
                    </p><p className="text-gray-600"><strong>Email:</strong>{formData.email}
                    </p><p className="text-gray-600"><strong>Employee ID:</strong>(To be generated)
                    </p></div><div className="border-b pb-2"><p className="text-gray-600"><strong>Designation:</strong>{formData.role}
                    </p><p className="text-gray-600"><strong>Department:</strong>{formData.department}
                    </p></div><div><p className="text-gray-600"><strong>Employment Type:</strong>{formData.employmentType}
                    </p></div></div><div className="bg-green-50 p-3 rounded-lg text-sm text-green-800"><p>By clicking "Submit Application", you confirm that all information
                    provided is accurate and complete.
                  </p></div></div>)}
          </div>{/* Payment Details Modal */}
          {showPaymentDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl"><h2 className="text-2xl font-bold text-gray-800 mb-6">Complete Payment</h2>{/* Payment Info */}
                <div className="bg-gray-100 rounded-lg p-4 mb-6"><p className="text-sm text-gray-600">Amount: <span className="font-bold text-lg">₹1000</span></p><p className="text-sm text-gray-600">Application ID: FAC (Auto-generated)</p></div>{/* Payment Method Display */}
                <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label><select
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    name="paymentMethod"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                  ><option value="">Select payment method</option><option value="Debit Card">Debit Card</option><option value="Credit Card">Credit Card</option><option value="UPI">UPI</option></select></div>{/* Card Payment Details */}
                {(formData.paymentMethod === 'Credit Card' || formData.paymentMethod === 'Debit Card') && (
                  <div className="space-y-4 mb-6"><h3 className="font-semibold text-gray-800">Payment Details</h3><div><label className="block text-sm font-medium text-gray-700 mb-1">Card Holder Name *</label><input
                        type="text"
                        name="cardHolderName"
                        value={paymentDetails.cardHolderName}
                        onChange={handlePaymentDetailsChange}
                        placeholder="John Doe"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Card Number *</label><input
                        type="text"
                        name="cardNumber"
                        value={paymentDetails.cardNumber}
                        onChange={handlePaymentDetailsChange}
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label><input
                          type="text"
                          name="expiryDate"
                          value={paymentDetails.expiryDate}
                          onChange={handlePaymentDetailsChange}
                          placeholder="MM/YY"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">CVV *</label><input
                          type="text"
                          name="cvv"
                          value={paymentDetails.cvv}
                          onChange={handlePaymentDetailsChange}
                          placeholder="123"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        /></div></div></div>)}

                {/* UPI Payment Details */}
                {formData.paymentMethod === 'UPI' && (
                  <div className="space-y-4 mb-6"><h3 className="font-semibold text-gray-800">UPI Payment</h3><div><label className="block text-sm font-medium text-gray-700 mb-1">UPI ID / Mobile Number *</label><input
                        type="text"
                        name="upiId"
                        value={paymentDetails.upiId}
                        onChange={handlePaymentDetailsChange}
                        placeholder="username@upi or 9876543210"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      /></div><div className="bg-green-50 p-4 rounded-lg text-center"><p className="text-sm text-green-800 mb-3">Quick Response Code (QR)</p><div className="bg-white p-4 rounded border-2 border-green-200 flex items-center justify-center h-40"><div className="text-gray-400 text-sm">QR Code<br/>(Scan for UPI Payment)
                        </div></div></div></div>)}

                {/* Action Buttons */}
                <div className="flex gap-3"><button
                    onClick={handleCancelPayment}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition"
                  >Cancel
                  </button><button
                    onClick={handleCompletePayment}
                    className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition"
                  >Pay Now
                  </button></div></div></div>)}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-4 pt-3 border-t"><button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`px-4 py-1.5 rounded-lg font-medium text-sm transition ${
                currentStep === 1
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >← Previous
            </button><div className="flex-1" />{currentStep < 6 ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 4 && (!formData.resume || !formData.certifications)}
                className={`px-4 py-1.5 rounded-lg font-medium text-sm transition ${
                  currentStep === 4 && (!formData.resume || !formData.certifications)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-700 text-white hover:bg-green-800'
                }`}
              >Next →
              </button>) : currentStep === 6 && !paymentDone ? (
              <button
                onClick={handlePayment}
                className="px-4 py-1.5 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition"
              >Payment
              </button>) : currentStep === 6 && paymentDone ? (
              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-green-700 text-white rounded-lg font-medium text-sm hover:bg-green-800 transition"
              >Next →
              </button>) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={`px-4 py-1.5 rounded-lg font-medium text-sm flex items-center gap-1.5 transition ${
                  isLoading
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >{isLoading ? (
                  <><span className="inline-block animate-spin">⟳</span>Submitting...
                  </>) : (
                  <>Submit Application</>)}
              </button>)}
          </div></div></div></div>);
}
