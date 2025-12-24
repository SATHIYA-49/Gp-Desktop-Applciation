import React, { useState, useEffect } from 'react';

const UpdateProgress = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing update...');
  
  // FIX: Use 'false' (lowercase) not 'True'
  // Default is hidden (false) for production so it doesn't block the screen
  const [isVisible, setIsVisible] = useState(false); 

  useEffect(() => {
    // Only run if Electron API is available
    if (window.electronAPI) {
      
      // 1. Listen for Progress
      window.electronAPI.onUpdateProgress((percent) => {
        setIsVisible(true);
        setProgress(Math.round(percent));
        
        // Dynamic status based on percentage
        if (percent < 100) {
            setStatus("Downloading update files...");
        } else {
            setStatus("Verifying & Installing...");
            // Keep visible briefly to show completion before hiding/restarting
            setTimeout(() => setIsVisible(false), 3000); 
        }
      });

      // 2. Listen for custom status messages from Main Process
      window.electronAPI.onUpdateStatus((msg) => {
        setStatus(msg);
        setIsVisible(true);
      });
    }

    // Cleanup listeners
    return () => {
      if (window.electronAPI) window.electronAPI.removeUpdateListeners();
    };
  }, []);

  if (!isVisible) return null;

  return (
    // --- 1. BACKDROP (Blurry & Dark) ---
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center animate__animated animate__fadeIn"
      style={{ 
        zIndex: 99999, 
        background: 'rgba(5, 5, 10, 0.75)', 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
    >
      {/* --- 2. MAIN CARD (Glassmorphism) --- */}
      <div 
        className="card border-0 text-white shadow-lg overflow-hidden position-relative"
        style={{ 
            width: '450px', 
            maxWidth: '90%',
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
        }}
      >
        {/* Top Decoration Line */}
        <div style={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}></div>

        <div className="card-body p-5 text-center">
            
            {/* Animated Icon */}
            <div className="mb-4 d-inline-block p-4 rounded-circle bg-dark bg-opacity-50 position-relative">
                <i className="bi bi-cloud-arrow-down-fill text-primary display-4 position-relative" style={{ zIndex: 2 }}></i>
                {/* Pulse Effect */}
                <div className="position-absolute top-50 start-50 translate-middle rounded-circle bg-primary opacity-25" 
                     style={{ width: '100%', height: '100%', animation: 'pulse 2s infinite' }}>
                </div>
            </div>

            <h4 className="fw-bold mb-1">Update Available</h4>
            <p className="text-secondary small mb-4">We are upgrading your experience.</p>

            {/* Progress Bar Container */}
            <div className="progress bg-dark mb-2" style={{ height: '12px', borderRadius: '10px', overflow: 'hidden' }}>
                <div 
                    className="progress-bar progress-bar-striped progress-bar-animated" 
                    role="progressbar" 
                    style={{ 
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' // Blue to Purple gradient
                    }}
                ></div>
            </div>

            {/* Stats Row */}
            <div className="d-flex justify-content-between align-items-center mt-3">
                <span className="small text-white-50 fw-medium">
                    <i className="bi bi-hdd-network me-2"></i>{status}
                </span>
                <span className="h5 mb-0 fw-bold text-white">
                    {progress}%
                </span>
            </div>
        </div>
        
        {/* Footer Note */}
        <div className="card-footer bg-dark bg-opacity-25 border-top border-secondary border-opacity-25 text-center py-2">
            <small className="text-secondary" style={{fontSize: '0.7rem'}}>Please do not close the application.</small>
        </div>
      </div>

      {/* Internal CSS for Pulse Animation */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.5; }
            50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
            100% { transform: translate(-50%, -50%) scale(0.95); opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};

export default UpdateProgress;