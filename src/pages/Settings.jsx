import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Settings = () => {
  // Use Global Context instead of local state
  const { darkMode, toggleTheme } = useContext(GlobalContext);

  return (
    <div className="container-fluid p-4">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <h3 className="fw-bold mb-4">Appearance</h3>
          
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3 text-warning">Theme Options</h5>
              
              <div className="d-flex justify-content-between align-items-center p-3 rounded-3 mb-3 border">
                <div>
                  <h6 className="m-0 fw-bold"><i className="bi bi-moon-stars-fill me-2"></i>Dark Mode</h6>
                  <small className="text-secondary">
                    {darkMode ? 'Active (Click to switch to Light Mode)' : 'Inactive (Click to switch to Dark Mode)'}
                  </small>
                </div>
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    style={{ cursor: 'pointer', width: '3em', height: '1.5em' }}
                    checked={darkMode} 
                    onChange={toggleTheme} // Calls the global function
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;