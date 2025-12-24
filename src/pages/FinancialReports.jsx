import React from 'react';
import { useNavigate } from 'react-router-dom';

const Reports = () => {
  const navigate = useNavigate();

  return (
    <div className="container-fluid p-4 d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      
      <div className="text-center animate__animated animate__fadeIn">
        {/* Animated Icon */}
        <div className="mb-4">
            <i className="bi bi-cone-striped text-warning display-1"></i>
        </div>

        <h2 className="fw-bold text-dark mb-3">Under Maintenance</h2>
        
        <p className="text-secondary lead mb-4">
            We are currently updating the <strong>Financial Reports</strong> module <br/> 
            to provide you with more accurate analytics.
        </p>

        <div className="d-flex justify-content-center gap-3">
            <button 
                className="btn btn-outline-secondary rounded-pill px-4 fw-bold" 
                onClick={() => navigate(-1)}
            >
                <i className="bi bi-arrow-left me-2"></i> Go Back
            </button>
            
            <button 
                className="btn btn-primary rounded-pill px-4 fw-bold" 
                onClick={() => navigate('/dashboard')}
            >
                <i className="bi bi-house-door me-2"></i> Dashboard
            </button>
        </div>
      </div>

    </div>
  );
};

export default Reports;