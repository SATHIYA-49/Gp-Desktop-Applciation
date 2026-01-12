import React, { useState, useMemo, forwardRef } from 'react';

// 🔥 MINI CALENDAR STYLE HEATMAP WITH TASK-STATUS COLORS
const ServiceHeatmap = forwardRef(({ services = [], theme, darkMode }, ref) => {
    
    const [currentDate, setCurrentDate] = useState(new Date());

    const isCurrentMonth = useMemo(() => {
        const today = new Date();
        return currentDate.getMonth() === today.getMonth() && 
               currentDate.getFullYear() === today.getFullYear();
    }, [currentDate]);

    const heatmapData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const data = {};

        services.forEach(task => {
            if (!task.service_date) return;
            const dateParts = task.service_date.split('-'); 
            const taskYear = parseInt(dateParts[0]);
            const taskMonth = parseInt(dateParts[1]) - 1; 
            const taskDay = parseInt(dateParts[2]);

            if (taskMonth === month && taskYear === year) {
                if (!data[taskDay]) data[taskDay] = { total: 0, completed: 0, pending: 0 };
                
                data[taskDay].total += 1;
                const status = (task.status || task.service_status || "").toLowerCase();
                if (status === 'completed' || status === 'done') {
                    data[taskDay].completed += 1;
                } else {
                    data[taskDay].pending += 1;
                }
            }
        });
        return data;
    }, [services, currentDate]);

    // 🔥 NEW COLOR LOGIC: Background based on "Success" or "Pending"
    const getCellStyle = (stats) => {
        if (stats.total === 0) return { 
            bg: darkMode ? 'transparent' : '#f8f9fa', 
            text: darkMode ? '#94a3b8' : '#adb5bd', 
            border: darkMode ? '#334155' : '#e2e8f0'
        };

        // If all tasks for the day are completed -> Greenish
        if (stats.pending === 0 && stats.completed > 0) {
            return {
                bg: darkMode ? 'rgba(25, 135, 84, 0.2)' : '#d1e7dd',
                text: darkMode ? '#75b798' : '#0f5132',
                border: '#badbcc'
            };
        }

        // If there are pending tasks -> Orangeish
        return {
            bg: darkMode ? 'rgba(253, 126, 20, 0.15)' : '#fff3cd',
            text: darkMode ? '#feb272' : '#664d03',
            border: '#ffecb5'
        };
    };

    const changeMonth = (offset) => {
        const newDate = new Date(currentDate); 
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const resetToCurrentDate = () => setCurrentDate(new Date());

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div ref={ref} className={`card mb-3 border-0 shadow-sm ${darkMode ? 'bg-dark text-white' : 'bg-white'}`} style={{maxWidth: '500px', margin: '0 auto'}}>
            <div className="card-body p-3">
                
                {/* --- HEADER --- */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center">
                        {!isCurrentMonth && (
                            <button onClick={resetToCurrentDate} className={`btn btn-sm btn-link text-decoration-none p-0 me-2 ${darkMode ? 'text-secondary' : 'text-muted'}`}>
                                <i className="bi bi-arrow-counterclockwise" style={{ fontSize: '1rem' }}></i>
                            </button>
                        )}
                        <button className={`btn btn-sm btn-link text-decoration-none ${darkMode ? 'text-secondary' : 'text-muted'}`} onClick={() => changeMonth(-1)}>
                            <i className="bi bi-chevron-left"></i>
                        </button>
                    </div>
                    <div className="text-center">
                        <h6 className="fw-bold m-0 text-uppercase" style={{ fontSize: '0.9rem', letterSpacing: '1px' }}>
                            {monthNames[currentDate.getMonth()]} <span className="fw-light text-primary">{currentDate.getFullYear()}</span>
                        </h6>
                    </div>
                    <button className={`btn btn-sm btn-link text-decoration-none ${darkMode ? 'text-secondary' : 'text-muted'}`} onClick={() => changeMonth(1)}>
                        <i className="bi bi-chevron-right"></i>
                    </button>
                </div>

                {/* --- CALENDAR GRID --- */}
                <div className="d-grid mb-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
                    {weekDays.map(d => (
                        <small key={d} className={`fw-bold ${theme?.subText || 'text-muted'}`} style={{ fontSize: '0.65rem', opacity: 0.7 }}>{d}</small>
                    ))}
                </div>

                <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {monthNames && Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => <div key={`emp-${i}`}></div>)}
                    {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                        const day = i + 1;
                        const stats = heatmapData[day] || { total: 0, completed: 0, pending: 0 };
                        const style = getCellStyle(stats);
                        
                        return (
                            <div key={day} className="rounded d-flex flex-column align-items-center justify-content-center position-relative"
                                style={{ 
                                    height: '35px', backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, 
                                    fontSize: '0.75rem', fontWeight: stats.total > 0 ? 'bold' : 'normal', cursor: stats.total > 0 ? 'pointer' : 'default'
                                }}
                                title={stats.total > 0 ? `${stats.completed} Done, ${stats.pending} Pending` : ''}
                            >
                                {day}
                                <div className="position-absolute d-flex gap-1" style={{ bottom: '3px' }}>
                                    {stats.pending > 0 && <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#fd7e14' }}></div>}
                                    {stats.completed > 0 && <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#198754' }}></div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* --- LEGEND --- */}
                <div className="d-flex justify-content-center gap-3 mt-2" style={{ fontSize: '0.6rem' }}>
                    <div className="d-flex align-items-center gap-1">
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#d1e7dd', border: '1px solid #badbcc' }}></div>
                        <span className={theme?.subText || 'text-muted'}>All Completed</span>
                    </div>
                    <div className="d-flex align-items-center gap-1">
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#fff3cd', border: '1px solid #ffecb5' }}></div>
                        <span className={theme?.subText || 'text-muted'}>Pending Tasks</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ServiceHeatmap;