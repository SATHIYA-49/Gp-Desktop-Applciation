import React, { useState, useEffect, useRef } from 'react';
import Lottie from "lottie-react";
import batteryAnimation from './assets/battery.json'; 

const LoadingScreen = () => {
  const [statusText, setStatusText] = useState("Loading...");
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  
  // UPDATE STATE
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState("");
  const [updateReadyToInstall, setUpdateReadyToInstall] = useState(false);

  // 1. SAFETY: Track if component is mounted to prevent memory leaks
  const isMounted = useRef(true);

  // Theme Config
  const [currentTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved : 'light';
  });
  const isDark = currentTheme === 'dark';

  useEffect(() => {
    isMounted.current = true;

    if (window.electron && window.electron.ipcRenderer) {
      
      // --- LISTENERS ---

      // 1. Update Found
      window.electron.ipcRenderer.on('update-available', (info) => {
        if (!isMounted.current) return;
        setUpdateAvailable(true);
        setUpdateVersion(info.version);
        setStatusText("New Update Found!");
      });

      // 2. Download Progress
      window.electron.ipcRenderer.on('update-progress', (percent) => {
        if (!isMounted.current) return;
        setUpdateAvailable(false);
        setShowProgress(true);
        setStatusText(`Downloading Update... ${Math.round(percent)}%`);
        setProgress(percent);
      });

      // 3. Download Complete
      window.electron.ipcRenderer.on('update-downloaded', () => {
        if (!isMounted.current) return;
        setUpdateReadyToInstall(true);
        setStatusText("Update Ready to Install");
        setShowProgress(false); // Hide bar when done
      });

      // 4. 🔥 NEW: Error Handling (Critical for Production)
      // You need to add 'update-error' to your preload.js whitelist if not there
      window.electron.ipcRenderer.on('update-error', (err) => {
        if (!isMounted.current) return;
        setUpdateAvailable(false);
        setShowProgress(false);
        setStatusText("Update Failed. Starting App...");
        console.error("Update Error:", err);
        
        // Auto-skip after error so user isn't stuck
        setTimeout(() => {
           // Navigate to Login or Main App here
        }, 2000);
      });
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []);

  // HANDLERS
  const handleDownload = () => {
    window.electron.ipcRenderer.send('start-download');
    setUpdateAvailable(false); 
  };

  const handleSkip = () => {
    setUpdateAvailable(false);
    setStatusText("Starting Application...");
  };

  const handleRestart = () => {
    window.electron.ipcRenderer.send('restart-app');
  };

  // STYLES
  const styles = {
    bg: isDark ? 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)' : '#ffffff',
    text: isDark ? '#ffffff' : '#1e293b',
    brandColor: isDark 
      ? 'linear-gradient(to right, #fbbf24, #fcd34d, #b45309)' 
      : '#0f172a'
  };

  return (
    <div 
      className="d-flex flex-column justify-content-center align-items-center position-fixed top-0 start-0 w-100 h-100"
      style={{
        zIndex: 9999,
        background: styles.bg,
        color: styles.text,
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* ---------------- UPDATE ALERT MODAL ---------------- */}
      {updateAvailable && (
        <div 
          className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: 'rgba(0,0,0,0.7)', zIndex: 10000, backdropFilter: 'blur(5px)' }}
        >
          <div 
            className="card border-0 text-center p-4 shadow-lg animate-pop"
            style={{
              width: '350px',
              background: isDark ? '#1e293b' : '#ffffff',
              borderRadius: '20px',
              border: '1px solid #fbbf24'
            }}
          >
            <div className="mb-3 text-warning">
              <svg width="50" height="50" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M11.354 5.646a.5.5 0 0 0-.708 0L8 8.293 5.354 5.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0 0-.708z"/>
              </svg>
            </div>
            <h4 className="fw-bold mb-1" style={{ color: isDark ? '#fff' : '#333' }}>Update Available</h4>
            <p className="small text-muted mb-4">Version {updateVersion} is ready to download.</p>
            
            <div className="d-grid gap-2">
              <button 
                onClick={handleDownload}
                className="btn fw-bold text-white"
                style={{ background: 'linear-gradient(90deg, #fbbf24, #b45309)', border: 'none', borderRadius: '10px', padding: '10px' }}
              >
                Download Now
              </button>
              <button 
                onClick={handleSkip}
                className="btn btn-link text-decoration-none text-muted"
                style={{ fontSize: '0.9rem' }}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- RESTART ALERT MODAL ---------------- */}
      {updateReadyToInstall && (
        <div 
          className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: 'rgba(0,0,0,0.8)', zIndex: 10000 }}
        >
          <div className="text-center animate-pop">
            <h3 className="text-white fw-bold mb-3">Update Ready!</h3>
            <button 
              onClick={handleRestart}
              className="btn btn-lg fw-bold text-white px-5"
              style={{ background: '#22c55e', borderRadius: '30px', boxShadow: '0 0 20px #22c55e' }}
            >
              Restart & Install
            </button>
          </div>
        </div>
      )}

      {/* ---------------- MAIN UI ---------------- */}
      <div 
          className="rounded-4 d-flex align-items-center justify-content-center shadow-lg"
          style={{
              width: '60px', height: '60px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #b45309 100%)',
              fontSize: '1.5rem', fontWeight: '800', color: '#ffffff',
              marginBottom: '20px', boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)'
          }}
      >
          GP
      </div>

      <div className="d-flex flex-column align-items-center mb-5">
          <div style={{ width: '200px', height: '200px', marginBottom: '-25px' }}>
            <Lottie animationData={batteryAnimation} loop={true} autoplay={true} />
          </div>
          <h1 
            className="fw-bold animate-fade" 
            style={{ 
                fontSize: '2.5rem', letterSpacing: '2px', 
                background: isDark ? styles.brandColor : 'none',
                color: isDark ? 'transparent' : styles.brandColor,
                WebkitBackgroundClip: isDark ? 'text' : 'border-box',
                WebkitTextFillColor: isDark ? 'transparent' : 'inherit',
                marginTop: '10px'
            }}
          >
            Golden Power
          </h1>
      </div>

      <div className="text-center" style={{ width: '300px' }}>
          <div className="d-flex justify-content-between mb-2 px-1">
              <span className="small" style={{ color: styles.text, opacity: 0.7 }}>Status</span>
              <span className="small fw-bold" style={{ color: '#fbbf24' }}>
                 {showProgress ? `${Math.round(progress)}%` : 'Loading...'}
              </span>
          </div>

          <div className="progress rounded-pill overflow-hidden" style={{ height: '6px', backgroundColor: 'rgba(128,128,128,0.2)' }}>
            <div 
                className="progress-bar" 
                style={{ 
                    width: showProgress ? `${progress}%` : '30%', 
                    background: 'linear-gradient(90deg, #fbbf24, #d97706)',
                    transition: 'width 0.3s ease',
                    animation: showProgress ? 'none' : 'indeterminate 2s infinite ease-in-out'
                }}
            ></div>
          </div>
          <p className="mt-3 small text-muted">{statusText}</p>
      </div>

      <style>{`
        @keyframes indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-pop { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes popIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default LoadingScreen;