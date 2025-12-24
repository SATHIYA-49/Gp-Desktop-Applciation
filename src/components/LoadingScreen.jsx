import React from 'react';

const LoadingScreen = () => {
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
      {/* 1. PULSING LOGO CONTAINER */}
      <div className="position-relative mb-4">
        <div 
            className="rounded-3 d-flex align-items-center justify-content-center shadow-lg"
            style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #fbbf24, #b45309)',
                fontSize: '2rem',
                fontWeight: '800',
                zIndex: 2,
                position: 'relative',
                animation: 'float 3s ease-in-out infinite'
            }}
        >
            GP
        </div>
        
        {/* Ripple/Pulse Effect behind logo */}
        <div 
            className="position-absolute top-50 start-50 translate-middle rounded-circle bg-warning opacity-25"
            style={{ width: '120px', height: '120px', animation: 'pulse 2s infinite' }}
        ></div>
      </div>

      {/* 2. TEXT & SPINNER */}
      <h4 className="fw-bold mb-2 animate__animated animate__fadeIn" style={{letterSpacing: '2px'}}>GOLDEN POWER</h4>
      <p className="text-secondary small mb-4 animate__animated animate__fadeIn">Initializing ERP System...</p>

      {/* 3. SLIM PROGRESS BAR */}
      <div className="progress" style={{ width: '200px', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div 
            className="progress-bar bg-warning" 
            role="progressbar" 
            style={{ width: '100%', animation: 'progressLoad 2s ease-in-out infinite' }}
        ></div>
      </div>

      {/* CSS ANIMATIONS */}
      <style>
        {`
            @keyframes pulse {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
            @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
                100% { transform: translateY(0px); }
            }
            @keyframes progressLoad {
                0% { width: 0%; transform: translateX(-100%); }
                50% { width: 50%; }
                100% { width: 100%; transform: translateX(100%); }
            }
        `}
      </style>
    </div>
  );
};

export default LoadingScreen;