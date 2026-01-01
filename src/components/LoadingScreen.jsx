import React, { useState, useEffect } from 'react';

const LoadingScreen = () => {
  const [statusText, setStatusText] = useState("Initializing ERP System...");
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    // 1. Listen for Download Progress from Main.js
    if (window.electron && window.electron.ipcRenderer) {
      
      // Listen for progress updates
      window.electron.ipcRenderer.on('update-progress', (percent) => {
        setShowProgress(true);
        setStatusText(`Downloading Update... ${percent}%`);
        setProgress(percent);
      });

      // Optional: If you want to show "Checking..." (requires adding sender in main.js)
      // For now, we stick to the basic initialization text until an update starts.
    }

    // Cleanup listeners not strictly needed here as screen unmounts, 
    // but good practice if you navigate away.
  }, []);

  return (
    <div 
      className="d-flex flex-column justify-content-center align-items-center position-fixed top-0 start-0 w-100 h-100"
      style={{
        zIndex: 9999,
        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* 1. STABLE ELEGANT LOGO */}
      <div className="position-relative mb-5">
        <div 
            className="position-absolute top-50 start-50 translate-middle rounded-circle"
            style={{ 
                width: '100px', 
                height: '100px', 
                background: 'rgba(251, 191, 36, 0.3)', 
                filter: 'blur(15px)',
                zIndex: 1
            }}
        ></div>

        <div 
            className="rounded-4 d-flex align-items-center justify-content-center shadow-lg"
            style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #fbbf24, #b45309)',
                fontSize: '2rem',
                fontWeight: '800',
                color: '#fff',
                zIndex: 2,
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.2)'
            }}
        >
            GP
        </div>
      </div>

      {/* 2. DYNAMIC TEXT STATUS */}
      <h5 className="fw-bold mb-2 animate-fade" style={{ letterSpacing: '3px', textTransform: 'uppercase', color: '#f8fafc' }}>
        Golden Power
      </h5>
      
      {/* Shows either "Initializing..." OR "Downloading Update... 45%" */}
      <p className="small mb-5 text-center" style={{ color: '#94a3b8', fontSize: '0.85rem', minWidth: '200px' }}>
        {statusText}
      </p>

      {/* 3. PROGRESS BAR (Switches logic based on update status) */}
      <div className="progress rounded-pill overflow-hidden" style={{ width: '180px', height: '3px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div 
            className="progress-bar" 
            role="progressbar" 
            style={{ 
                width: showProgress ? `${progress}%` : '30%', // Real progress vs Fake Loading
                background: '#fbbf24',
                animation: showProgress ? 'none' : 'elegantLoad 1.5s infinite ease-in-out', // Stop animation when downloading real update
                borderRadius: '10px',
                transition: 'width 0.3s ease'
            }}
        ></div>
      </div>

      <style>
        {`
            @keyframes elegantLoad {
                0% { width: 0%; transform: translateX(0%); }
                50% { width: 100%; transform: translateX(0%); }
                100% { width: 0%; transform: translateX(200%); }
            }
            .animate-fade { animation: fadeIn 1.2s ease-in; }
            @keyframes fadeIn {
                0% { opacity: 0; transform: translateY(5px); }
                100% { opacity: 1; transform: translateY(0); }
            }
        `}
      </style>
    </div>
  );
};

export default LoadingScreen;