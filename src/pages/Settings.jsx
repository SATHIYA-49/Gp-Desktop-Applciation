import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Settings = () => {
  const { darkMode, toggleTheme } = useContext(GlobalContext);

  // Consistent styling with Dashboard Stat Cards
  const cardStyle = {
    background: darkMode ? '#1e293b' : '#ffffff',
    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #edf2f7',
    boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.4)' : '0 10px 25px rgba(0,0,0,0.05)',
    borderRadius: '24px',
    transition: 'all 0.3s ease'
  };

  return (
    <div className={`container-fluid p-4 min-vh-100 ${darkMode ? 'text-white' : 'text-dark'}`} 
         style={{ background: darkMode ? '#0f172a' : '#f8fafc', transition: 'all 0.3s ease' }}>
      
      <div className="row justify-content-center mt-4">
        <div className="col-md-8 col-lg-6">
          <div className="mb-4">
            <h3 className="fw-extrabold m-0 tracking-tight">System Settings</h3>
            <p className="text-secondary small">Personalize your workspace appearance</p>
          </div>
          
          <div className="card border-0 shadow-sm mb-4" style={cardStyle}>
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4 d-flex align-items-center">
                <i className="bi bi-palette-fill me-2 text-warning"></i> Appearance
              </h5>
              
              <div className={`d-flex justify-content-between align-items-center p-3 rounded-4 mb-3 border ${darkMode ? 'border-secondary border-opacity-25 bg-slate-900' : 'bg-light'}`}>
                <div>
                  <h6 className="m-0 fw-bold">
                    <i className={`bi bi-${darkMode ? 'moon-stars-fill text-info' : 'sun-fill text-warning'} me-2`}></i>
                    Dark Mode
                  </h6>
                  <small className="text-secondary">
                    {darkMode ? 'Switch to Light theme' : 'Switch to Dark theme'}
                  </small>
                </div>
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    role="switch"
                    style={{ cursor: 'pointer', width: '3.2em', height: '1.6em' }}
                    checked={darkMode} 
                    onChange={toggleTheme} 
                  />
                </div>
              </div>

              <div className="p-2 text-center opacity-50">
                 <small className="text-secondary">Preference is automatically saved to local storage.</small>
              </div>
            </div>
          </div>

          <div className="p-3 text-center opacity-50 mt-3">
             <small className="text-secondary">Golden Power CRM v1.0.4 • Connected to Production API</small>
          </div>
        </div>
      </div>

      <style>{`
        .fw-extrabold { font-weight: 800; }
        .bg-slate-900 { background: #0f172a !important; }
        /* Professional transition for elements */
        div, h3, h5, h6, .card, input {
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
        }
      `}</style>
    </div>
  );
};

export default Settings;