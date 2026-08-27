import React, { useState } from 'react';

const AccountDeletePage = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <h1>Delete Account Request</h1>
      
      {!submitted ? (
        <>
          <p>If you would like to permanently delete your account and all associated data, please fill out the form below. Once your request is submitted, it will be processed within 14 days.</p>
          <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginTop: '20px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Registered Email Address or Phone Number</label>
                <input 
                  type="text" 
                  id="email" 
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                  placeholder="Enter your email or phone number"
                />
              </div>
              <div>
                <label htmlFor="reason" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Reason for Deletion (Optional)</label>
                <textarea 
                  id="reason" 
                  rows={4} 
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                  placeholder="Tell us why you are leaving..."
                />
              </div>
              <button 
                type="submit" 
                style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Submit Deletion Request
              </button>
            </form>
          </div>
        </>
      ) : (
        <div style={{ padding: '20px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '8px', marginTop: '20px', textAlign: 'center' }}>
          <h3>Request Received</h3>
          <p>Your account deletion request has been successfully submitted. We will process it shortly and all your data will be permanently deleted.</p>
        </div>
      )}
    </div>
  );
};

export default AccountDeletePage;
