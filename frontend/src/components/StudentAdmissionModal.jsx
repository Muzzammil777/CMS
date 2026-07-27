import React, { useState } from 'react';
import { useAdmission } from '../context/AdmissionContext';
import { API_BASE } from '../api/apiBase';

const steps = [
  { number: 1, title: 'Personal' },
  { number: 2, title: 'Academic' },
  { number: 3, title: 'Course' },
  { number: 4, title: 'Category' },
  { number: 5, title: 'Accommodation' },
  { number: 6, title: 'Documents' },
  { number: 7, title: 'Fee' },
  { number: 8, title: 'Review' },
];

export default function StudentAdmissionModal({ isOpen, onClose }) {
  const { addStudentApp } = useAdmission();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Personal
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    // Step 2: Academic
    previousSchool: '',
    board: '',
    yearOfPassing: '',
    marksPercentage: '',
    // Step 3: Course Selection
    courseCategory: '',
    course: '',
    // Step 4: Category (Quota)
    quota: '',
    // Step 5: Accommodation
    accommodation: '',
    roomType: '',
    // Step 6: Documents
    passportPhoto: null,
    aadhaarCard: null,
    marksheet: null,
    transferCertificate: null,
    // Step 7: Application Fee
    paymentMethod: '',
    // Step 8: Review will use all above data
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
      name: 'Priya Sharma',
      email: 'priya.sharma@student.edu',
      phone: '9876543210',
      dateOfBirth: '2004-05-15',
      gender: 'Female',
      previousSchool: 'Delhi Public School',
      board: 'CBSE',
      yearOfPassing: '2023',
      marksPercentage: '92%',
      courseCategory: 'Engineering',
      course: 'CSE',
      quota: 'Management Quota',
      accommodation: 'Hostel Required',
      roomType: 'Double',
      passportPhoto: { name: 'passport.jpg', size: 1024, data: 'data:image/jpeg;base64,demo' },
      aadhaarCard: { name: 'aadhaar.jpg', size: 2048, data: 'data:image/jpeg;base64,demo' },
      marksheet: { name: 'marksheet.pdf', size: 4096, data: 'data:application/pdf;base64,demo' },
      transferCertificate: { name: 'transfer.pdf', size: 3072, data: 'data:application/pdf;base64,demo' },
      paymentMethod: 'UPI',
    });
    alert(' Demo data filled! All fields populated with sample data.');
  };

  const handleInputChange = (e) =>{
    const { name, value } = e.target;
    setFormData((prev) =>({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e, fieldName) =>{
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) =>({
          ...prev,
          [fieldName]: { name: file.name, size: file.size, data: reader.result },
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: null
      }));
    }
  };

  const handleNext = () =>{
    if (currentStep < 8) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () =>{
    if (currentStep >1) setCurrentStep(currentStep - 1);
  };

  const handlePayment = () =>{
    // Open the payment modal to let user select payment method
    setShowPaymentDetails(true);
  };

  const handleCompletePayment = () =>{
    // First validate that payment method is selected
    if (!formData.paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    // Then validate payment details based on payment method
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
      // Validate required fields
      if (!formData.name || !formData.email || !formData.phone || !formData.gender || !formData.dateOfBirth) {
        alert(' Please fill all required personal information fields');
        return;
      }
      if (!formData.courseCategory || !formData.course) {
        alert(' Please fill course information');
        return;
      }
      if (!formData.quota || !formData.accommodation) {
        alert(' Please select quota and accommodation type');
        return;
      }

      const studentData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        previousSchool: formData.previousSchool,
        board: formData.board,
        yearOfPassing: formData.yearOfPassing,
        marksPercentage: formData.marksPercentage,
        courseCategory: formData.courseCategory,
        course: formData.course,
        quota: formData.quota,
        accommodation: formData.accommodation,
        roomType: formData.roomType,
        paymentMethod: formData.paymentMethod,
        paymentStatus: 'Paid',
        status: 'Pending',
        documents: [
          formData.passportPhoto && { id: 'DOC-01', name: 'Passport Photo', type: 'base64', data: formData.passportPhoto },
          formData.aadhaarCard && { id: 'DOC-02', name: 'Aadhaar Card', type: 'base64', data: formData.aadhaarCard },
          formData.marksheet && { id: 'DOC-03', name: 'Marksheet', type: 'base64', data: formData.marksheet },
          formData.transferCertificate && { id: 'DOC-04', name: 'Transfer Certificate', type: 'base64', data: formData.transferCertificate },
        ].filter(Boolean)
      };

      console.log(' Submitting student data:', studentData);
      
      // Try to fetch from the backend with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() =>controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_BASE}/admissions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(' Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to save admission`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // Error response is not JSON, use status message
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
        console.log(' Admission saved successfully:', result);
      } catch (parseError) {
        console.warn(' Response is not JSON, but submission was successful');
        result = { id: 'STU-' + Date.now() };
      }
      
      // Also add to local state for immediate UI update
      addStudentApp(studentData);

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        previousSchool: '',
        board: '',
        yearOfPassing: '',
        marksPercentage: '',
        courseCategory: '',
        course: '',
        quota: '',
        accommodation: '',
        roomType: '',
        passportPhoto: null,
        aadhaarCard: null,
        marksheet: null,
        transferCertificate: null,
        paymentMethod: '',
      });
      setPaymentDone(false);
      setCurrentStep(1);
      
      alert(` Student admission submitted successfully!\n\nApplication ID: ${result.id || result.admission_id || 'Processing'}\n\nYour application is now under review.`);
      onClose();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(' Request timeout:', error);
        alert(' Connection timeout. Please check if backend server is running on port 5000.\n\nTroubleshoot:\n1. Start backend: python -m uvicorn main:app --host 0.0.0.0 --port 5000\n2. Check CORS policy\n3. Verify API_BASE URL in frontend');
      } else if (error instanceof TypeError) {
        console.error(' Network error:', error);
        alert(' Network error - Failed to reach backend server.\n\nPlease ensure:\n1. Backend is running (port 5000)\n2. No network firewall blocking\n3. API_BASE is correctly configured');
      } else {
        console.error(' Error saving admission:', error);
        alert(` Error: ${error.message}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg max-w-3xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">{/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 relative"><h1 className="text-lg font-semibold">Student Admission Form</h1><p className="text-green-100 text-xs mt-0.5">Complete all steps to submit your application</p><button
            onClick={handleAutoFillDemo}
            className="absolute top-5 right-16 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1.5 px-3 rounded-lg transition text-xs"
          >Auto Fill
          </button><button
            onClick={onClose}
            className="absolute top-3 right-4 text-white hover:bg-green-400 p-1.5 rounded-full"
          ></button></div>{/* Content */}
        <div className="p-6">{/* Progress Steps */}
          <div className="mb-6"><div className="text-xs text-gray-600 mb-3 font-medium">Step {currentStep} of 8</div><div className="flex justify-between items-end gap-1.5">{steps.map((step, idx) =>(
                <div key={step.number} className="flex flex-col items-center flex-1"><div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition mb-1.5 ${
                      step.number < currentStep
                        ? 'bg-green-500 text-white'
                        : step.number === currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >{step.number < currentStep ? '' : step.number}
                  </div><div className="text-xs text-center font-medium">{step.title}</div></div>))}
            </div></div>{/* Form Content */}
          <div className="min-h-[300px]">{currentStep === 1 && (
              <div className="space-y-3"><h2 className="text-sm font-semibold text-gray-800 mb-3">Personal Information</h2><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-700 mb-1">Full Name *
                    </label><input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Gender
                    </label><select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    ><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth
                  </label><input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                  /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Email *
                    </label><input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="priya.sharma@student.edu"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Phone *
                    </label><input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="9876543210"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    /></div></div></div>)}

            {currentStep === 2 && (
              <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Academic Information</h2><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Previous School
                    </label><input
                      type="text"
                      name="previousSchool"
                      value={formData.previousSchool}
                      onChange={handleInputChange}
                      placeholder="Delhi Public School"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Board
                    </label><select
                      name="board"
                      value={formData.board}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    ><option value="">Select</option><option value="CBSE">CBSE</option><option value="ICSE">ICSE</option><option value="State">State</option></select></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Year of Passing
                    </label><input
                      type="number"
                      name="yearOfPassing"
                      value={formData.yearOfPassing}
                      onChange={handleInputChange}
                      placeholder="2023"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Marks / Percentage
                    </label><input
                      type="text"
                      name="marksPercentage"
                      value={formData.marksPercentage}
                      onChange={handleInputChange}
                      placeholder="92%"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    /></div></div></div>)}

            {currentStep === 3 && (
              <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Course Selection</h2><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Course Category *
                    </label><select
                      name="courseCategory"
                      value={formData.courseCategory}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    ><option value="">Select</option><option value="Engineering">Engineering</option><option value="Medicine & Health Sciences">Medicine & Health Sciences</option><option value="Arts">Arts</option><option value="Sciences">Sciences</option><option value="Commerce">Commerce</option><option value="Management">Management</option><option value="Law">Law</option><option value="Diploma">Diploma</option></select></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Course *
                    </label><input
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleInputChange}
                      placeholder="CSE"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                    /></div></div></div>)}

            {currentStep === 4 && (
              <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Quota Selection</h2><div className="space-y-3">{['Government Quota', 'Management Quota'].map((option) =>(
                    <label
                      key={option}
                      className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-green-50 transition"
                      style={{
                        borderColor: formData.quota === option ? '#3b82f6' : '#e5e7eb',
                        backgroundColor:
                          formData.quota === option ? '#eff6ff' : 'transparent',
                      }}
                    ><input
                        type="radio"
                        name="quota"
                        value={option}
                        checked={formData.quota === option}
                        onChange={handleInputChange}
                        className="w-4 h-4"
                      /><span className="ml-3 font-medium text-gray-700">{option}</span></label>))}
                </div></div>)}

            {currentStep === 5 && (
              <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Accommodation</h2><div className="space-y-3">{['Day Scholar', 'Hostel Required'].map((option) =>(
                    <label
                      key={option}
                      className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-green-50 transition"
                      style={{
                        borderColor: formData.accommodation === option ? '#3b82f6' : '#e5e7eb',
                        backgroundColor:
                          formData.accommodation === option ? '#eff6ff' : 'transparent',
                      }}
                    ><input
                        type="radio"
                        name="accommodation"
                        value={option}
                        checked={formData.accommodation === option}
                        onChange={handleInputChange}
                        className="w-4 h-4"
                      /><span className="ml-3 font-medium text-gray-700">{option}</span></label>))}
                </div>{formData.accommodation === 'Hostel Required' && (
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Room Type
                    </label><select
                      name="roomType"
                      value={formData.roomType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                    ><option value="">Select</option><option value="Single">Single</option><option value="Double">Double</option><option value="Triple">Triple</option></select></div>)}
              </div>)}

            {currentStep === 6 && (
               <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Upload Documents</h2><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Passport Photo (optional)
                     </label><input
                       type="file"
                       onChange={(e) =>handleFileChange(e, 'passportPhoto')}
                       className={`w-full px-4 py-2 border rounded-lg ${formData.passportPhoto ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                     />{formData.passportPhoto && (
                       <p className="text-xs text-green-600 mt-1">{formData.passportPhoto.name}</p>)}
                  </div><div><label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Card *
                     </label><input
                       type="file"
                       onChange={(e) =>handleFileChange(e, 'aadhaarCard')}
                       className={`w-full px-4 py-2 border rounded-lg ${formData.aadhaarCard ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}
                     />{formData.aadhaarCard && (
                       <p className="text-xs text-green-600 mt-1">{formData.aadhaarCard.name}</p>)}
                     {!formData.aadhaarCard && (
                       <p className="text-xs text-red-600 mt-1">This field is required</p>)}
                  </div><div><label className="block text-sm font-medium text-gray-700 mb-2">Marksheet *
                     </label><input
                       type="file"
                       onChange={(e) =>handleFileChange(e, 'marksheet')}
                       className={`w-full px-4 py-2 border rounded-lg ${formData.marksheet ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}
                     />{formData.marksheet && (
                       <p className="text-xs text-green-600 mt-1">{formData.marksheet.name}</p>)}
                     {!formData.marksheet && (
                       <p className="text-xs text-red-600 mt-1">This field is required</p>)}
                  </div><div><label className="block text-sm font-medium text-gray-700 mb-2">Transfer Certificate *
                     </label><input
                       type="file"
                       onChange={(e) =>handleFileChange(e, 'transferCertificate')}
                       className={`w-full px-4 py-2 border rounded-lg ${formData.transferCertificate ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}
                     />{formData.transferCertificate && (
                       <p className="text-xs text-green-600 mt-1">{formData.transferCertificate.name}</p>)}
                     {!formData.transferCertificate && (
                       <p className="text-xs text-red-600 mt-1">This field is required</p>)}
                  </div></div></div>)}

            {currentStep === 7 && !paymentDone && (
              <div className="space-y-6"><div className="bg-green-50 border-2 border-green-200 rounded-lg p-6"><h3 className="text-lg font-bold text-gray-800 mb-4">Application Fee</h3><div className="bg-white rounded-lg p-4 mb-4 border border-green-300"><p className="text-4xl font-bold text-green-600 mb-2">₹500</p><p className="text-gray-600 text-sm">One-time application processing fee
                    </p></div><div className="bg-green-100 border-l-4 border-green-500 p-3 rounded"><p className="text-sm text-green-800">Click "Proceed to Payment" to complete your payment securely
                    </p></div></div></div>)}

            {currentStep === 7 && paymentDone && (
              <div className="text-center py-8"><div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-white text-3xl"></span></div><h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3><p className="text-gray-600 mb-4">Your payment has been processed successfully
                </p><div className="bg-green-50 p-4 rounded-lg mb-4 text-left"><p className="text-sm text-gray-600"><strong>Amount Paid:</strong>₹500
                  </p><p className="text-sm text-gray-600"><strong>Transaction ID:</strong>TXN{new Date().getTime()}
                  </p><p className="text-sm text-gray-600"><strong>Date & Time:</strong>{new Date().toLocaleString()}
                  </p></div></div>)}

            {currentStep === 8 && (
              <div className="space-y-4"><h2 className="text-xl font-bold text-gray-800 mb-4">Review Your Application</h2><div className="bg-green-50 border-2 border-green-500 rounded-lg p-3 mb-4"><p className="text-green-800 flex items-center"><span className="text-xl mr-2"></span><strong>Payment Status:</strong>Paid
                  </p></div><div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm"><div className="border-b pb-2"><p className="text-gray-600"><strong>Name:</strong>{formData.name}
                    </p><p className="text-gray-600"><strong>Email:</strong>{formData.email}
                    </p><p className="text-gray-600"><strong>Student ID:</strong>STU{Math.floor(Math.random() * 1000)}
                    </p></div><div className="border-b pb-2"><p className="text-gray-600"><strong>Course:</strong>{formData.course} ({formData.courseCategory})
                    </p><p className="text-gray-600"><strong>Quota:</strong>{formData.quota}
                    </p></div><div><p className="text-gray-600"><strong>Accommodation:</strong>{formData.accommodation}
                    </p></div></div><div className="bg-green-50 p-3 rounded-lg text-sm text-green-800"><p>By clicking "Submit Application", you confirm that all information
                    provided is accurate and complete.
                  </p></div></div>)}
          </div>{/* Payment Details Modal */}
          {showPaymentDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl"><h2 className="text-2xl font-bold text-gray-800 mb-6">Complete Payment</h2>{/* Payment Info */}
                <div className="bg-gray-100 rounded-lg p-4 mb-6"><p className="text-sm text-gray-600">Amount: <span className="font-bold text-lg">₹500</span></p><p className="text-sm text-gray-600">Application ID: APP386</p></div>{/* Payment Method Display */}
                <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label><select
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    name="paymentMethod"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                  ><option value="">Select payment method</option><option value="Debit Card">Debit Card</option><option value="Credit Card">Credit Card</option><option value="UPI">UPI</option></select></div>{/* Card Payment Details */}
                {(formData.paymentMethod === 'Credit Card' || formData.paymentMethod === 'Debit Card') && (
                  <div className="space-y-4 mb-6"><h3 className="font-semibold text-gray-800">Payment Details</h3><div><label className="block text-sm font-medium text-gray-700 mb-1">Card Holder Name *</label><input
                        type="text"
                        name="cardHolderName"
                        value={paymentDetails.cardHolderName}
                        onChange={handlePaymentDetailsChange}
                        placeholder="John Doe"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                      /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Card Number *</label><input
                        type="text"
                        name="cardNumber"
                        value={paymentDetails.cardNumber}
                        onChange={handlePaymentDetailsChange}
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                      /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label><input
                          type="text"
                          name="expiryDate"
                          value={paymentDetails.expiryDate}
                          onChange={handlePaymentDetailsChange}
                          placeholder="MM/YY"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                        /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">CVV *</label><input
                          type="text"
                          name="cvv"
                          value={paymentDetails.cvv}
                          onChange={handlePaymentDetailsChange}
                          placeholder="123"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                        /></div></div></div>)}

                {/* UPI Payment Details */}
                {formData.paymentMethod === 'UPI' && (
                  <div className="space-y-4 mb-6"><h3 className="font-semibold text-gray-800">UPI Payment</h3><div><label className="block text-sm font-medium text-gray-700 mb-1">UPI ID / Mobile Number *</label><input
                        type="text"
                        name="upiId"
                        value={paymentDetails.upiId}
                        onChange={handlePaymentDetailsChange}
                        placeholder="username@upi or 9876543210"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600-500"
                      /></div><div className="bg-green-50 p-4 rounded-lg text-center"><p className="text-sm text-green-800 mb-3">Quick Response Code (QR)</p><div className="bg-white p-4 rounded border-2 border-green-200 flex items-center justify-center h-40"><div className="text-gray-400 text-sm">QR Code<br/>(Scan for UPI Payment)
                        </div></div></div></div>)}

                {/* Action Buttons */}
                <div className="flex gap-3"><button
                    onClick={handleCancelPayment}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition"
                  >Cancel
                  </button><button
                    onClick={handleCompletePayment}
                    className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition"
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
            </button><div className="flex-1" />{currentStep < 7 ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 6 && (!formData.transferCertificate || !formData.aadhaarCard || !formData.marksheet)}
                className={`px-4 py-1.5 rounded-lg font-medium text-sm transition ${
                  currentStep === 6 && (!formData.transferCertificate || !formData.aadhaarCard || !formData.marksheet)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >Next →
              </button>) : currentStep === 7 && !paymentDone ? (
              <button
                onClick={handlePayment}
                className="px-4 py-1.5 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition"
              >Payment
              </button>) : currentStep === 7 && paymentDone ? (
              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition"
              >Next →
              </button>) : (
              <button
                onClick={handleSubmit}
                className="px-4 py-1.5 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition flex items-center gap-1.5"
              >Submit
              </button>)}
          </div></div></div></div>);
}
