import React, { useState, useMemo, useEffect } from 'react';

const ServiceHeatmap = ({ services = [], theme, darkMode }) => {
    // 1. State for Current Month View
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // 🔥 NEW: State to control Arrow Visibility
    const [showArrow, setShowArrow] = useState(true);

    // 2. Process Data: Count tasks per date for the current month
    const heatmapData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const counts = {};
        services.forEach(task => {
            if (!task.service_date) return;
            const dateParts = task.service_date.split('-'); 
            const taskYear = parseInt(dateParts[0]);
            const taskMonth = parseInt(dateParts[1]) - 1; 
            const taskDay = parseInt(dateParts[2]);

            if (taskMonth === month && taskYear === year) {
                counts[taskDay] = (counts[taskDay] || 0) + 1;
            }
        });
        return counts;
    }, [services, currentDate]);

    // 🔥 NEW: SCROLL LISTENER (Hides arrow on scroll)
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setShowArrow(false);
            } else {
                setShowArrow(true);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // 3. Calendar Grid Logic
    const getCalendarCells = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const cells = [];
        for (let i = 0; i < firstDayOfWeek; i++) {
            cells.push({ type: 'empty', key: `empty-${i}` });
        }
        for (let day = 1; day <= daysInMonth; day++) {
            cells.push({ type: 'day', day: day, count: heatmapData[day] || 0, key: `day-${day}` });
        }
        return cells;
    };

    // 4. Color Logic
    const getCellStyle = (count) => {
        if (count === 0) return { 
            bg: darkMode ? 'transparent' : '#f8f9fa', 
            text: darkMode ? '#64748b' : '#adb5bd',
            border: darkMode ? '#334155' : '#dee2e6'
        }; 
        if (count === 1) return { bg: '#93c5fd', text: '#1e3a8a', border: '#60a5fa' }; 
        if (count <= 3)  return { bg: '#3b82f6', text: '#fff', border: '#2563eb' };    
        return { bg: '#1d4ed8', text: '#fff', border: '#1e40af' };                     
    };

    const changeMonth = (offset) => {
        const newDate = new Date(currentDate); 
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };
    
    // SCROLL HANDLER
    const scrollToTable = () => {
        const tableSection = document.getElementById('service-management-section');
        if (tableSection) {
            tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className={`card mb-4 border-0 shadow-sm ${darkMode ? 'bg-dark text-white' : 'bg-white'}`}>
            <div className="card-body p-4 position-relative">
                
                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-2">
                        <div>
                            <h5 className="fw-bold m-0">Service Calendar</h5>
                            <small className={theme.subText}>
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </small>
                        </div>
                        <button 
                            className={`btn btn-sm border rounded-circle shadow-sm d-flex align-items-center justify-content-center ${darkMode ? 'btn-outline-secondary' : 'btn-light'}`}
                            style={{ width: '32px', height: '32px', padding: 0 }}
                            onClick={() => setCurrentDate(new Date())}
                            title="Reset to Current Month"
                        >
                             <i className="bi bi-arrow-counterclockwise text-primary"></i>
                        </button>
                    </div>

                    <div className="btn-group btn-group-sm">
                        <button className={`btn btn-outline-secondary ${darkMode ? 'text-white' : ''}`} onClick={() => changeMonth(-1)}><i className="bi bi-chevron-left"></i></button>
                        <button className={`btn btn-outline-secondary ${darkMode ? 'text-white' : ''}`} disabled style={{minWidth: '60px'}}>{monthNames[currentDate.getMonth()].substring(0, 3)}</button>
                        <button className={`btn btn-outline-secondary ${darkMode ? 'text-white' : ''}`} onClick={() => changeMonth(1)}><i className="bi bi-chevron-right"></i></button>
                    </div>
                </div>

                {/* THE GRID */}
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="d-grid mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
                        {weekDays.map(d => <small key={d} className={`fw-bold text-uppercase ${theme.subText}`} style={{fontSize: '0.7rem'}}>{d}</small>)}
                    </div>
                    <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                        {getCalendarCells().map((cell) => {
                            if (cell.type === 'empty') return <div key={cell.key}></div>;
                            const style = getCellStyle(cell.count);
                            return (
                                <div key={cell.key} className="rounded d-flex flex-column align-items-center justify-content-center position-relative"
                                    style={{ height: '60px', backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, transition: 'all 0.2s', cursor: cell.count > 0 ? 'pointer' : 'default' }}
                                    title={cell.count > 0 ? `${cell.count} Services` : ''}
                                >
                                    <span className="fw-bold small">{cell.day}</span>
                                    {cell.count > 0 && <span className="badge rounded-pill bg-white text-dark mt-1 shadow-sm" style={{fontSize: '0.6rem'}}>{cell.count}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* LEGEND */}
                <div className="d-flex justify-content-center gap-3 mt-4 small">
                    <div className="d-flex align-items-center gap-1"><div style={{width:12, height:12, background: darkMode ? 'transparent' : '#f8f9fa', border: `1px solid ${darkMode ? '#334155' : '#dee2e6'}`}} className="rounded-1"></div><span className={theme.subText}>Free</span></div>
                    <div className="d-flex align-items-center gap-1"><div style={{width:12, height:12, background: '#93c5fd'}} className="rounded-1"></div><span>Light</span></div>
                    <div className="d-flex align-items-center gap-1"><div style={{width:12, height:12, background: '#1d4ed8'}} className="rounded-1"></div><span>Busy</span></div>
                </div>

                {/* 🔥 NEW: SCROLL DOWN INDICATOR (With Fade Effect) */}
                <div 
                    className="text-center mt-4"
                    style={{
                        opacity: showArrow ? 1 : 0, 
                        pointerEvents: showArrow ? 'auto' : 'none',
                        transition: 'opacity 0.5s ease-in-out'
                    }}
                >
                    <button 
                        onClick={scrollToTable}
                        className={`btn btn-link text-decoration-none p-0 d-flex flex-column align-items-center mx-auto ${theme.subText}`}
                        style={{ cursor: 'pointer' }}
                    >
                        <small className="mb-1" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Scroll to Continue</small>
                        <div className="bounce-arrow">
                            <i className="bi bi-chevron-double-down fs-4 text-primary"></i>
                        </div>
                    </button>
                </div>

            </div>
            
            {/* CSS Animation for Bounce Effect */}
            <style>{`
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
                    40% {transform: translateY(-5px);}
                    60% {transform: translateY(-3px);}
                }
                .bounce-arrow {
                    animation: bounce 2s infinite;
                }
            `}</style>
        </div>
    );
};

export default ServiceHeatmap;