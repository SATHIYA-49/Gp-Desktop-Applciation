import React, { useContext, useState } from 'react';
import { GlobalContext } from '../context/GlobalState';

const LowStockAlert = ({ onRestockClick }) => {
  const { products, darkMode } = useContext(GlobalContext);
  const [isExpanded, setIsExpanded] = useState(false);

  // 1. FILTER LOGIC
  const LIMIT = 5;
  const outOfStock = products.filter(p => p.stock_quantity === 0 && p.is_active);
  const lowStock = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= LIMIT && p.is_active);
  const totalIssues = outOfStock.length + lowStock.length;

  // If healthy, hide completely
  if (totalIssues === 0) return null;

  return (
    <div 
      className="shadow-lg animate__animated animate__fadeInRight"
      style={{
        borderRadius: '12px',
        overflow: 'hidden',
        background: darkMode ? '#1e293b' : '#ffffff',
        border: darkMode ? '1px solid #475569' : '1px solid #e2e8f0',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* --- POPUP HEADER (Window Title Bar) --- */}
      <div 
        className="d-flex justify-content-between align-items-center px-3 py-2"
        style={{
            background: 'linear-gradient(90deg, #ef4444, #dc2626)', // Red Gradient
            color: 'white'
        }}
      >
        <div className="d-flex align-items-center gap-2">
            <div className="bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" style={{width:'24px', height:'24px'}}>
                <i className="bi bi-bell-fill" style={{fontSize: '0.8rem'}}></i>
            </div>
            <span className="fw-bold" style={{fontSize: '0.9rem'}}>Stock Alert</span>
            <span className="badge bg-white text-danger rounded-pill border-0" style={{fontSize: '0.75rem'}}>{totalIssues}</span>
        </div>

        {/* Toggle / Minimize Button */}
        <button 
            className="btn btn-sm text-white p-0 border-0" 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ opacity: 0.8 }}
        >
            <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
        </button>
      </div>

      {/* --- POPUP BODY --- */}
      <div className="p-0">
        
        {/* Summary (Show when collapsed) */}
        {!isExpanded && (
            <div className="p-3 d-flex justify-content-between align-items-center">
                <div>
                    <p className={`mb-0 small fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>
                        Inventory needs attention.
                    </p>
                    <small className={darkMode ? 'text-white-50' : 'text-muted'} style={{fontSize: '0.75rem'}}>
                        {outOfStock.length} Critical &bull; {lowStock.length} Low
                    </small>
                </div>
                <button 
                    className="btn btn-sm btn-outline-danger rounded-pill px-3 py-0" 
                    style={{fontSize: '0.8rem', height: '28px'}}
                    onClick={() => setIsExpanded(true)}
                >
                    View
                </button>
            </div>
        )}

        {/* Detailed List (Show when expanded) */}
        {isExpanded && (
            <>
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <ul className="list-group list-group-flush">
                        {/* Out of Stock Items */}
                        {outOfStock.map(p => (
                            <li key={p.id} className={`list-group-item d-flex justify-content-between align-items-center px-3 py-2 ${darkMode ? 'bg-dark text-white border-secondary' : 'bg-white'}`}>
                                <div style={{maxWidth: '65%'}}>
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-x-circle-fill text-danger me-2" style={{fontSize: '0.8rem'}}></i>
                                        <span className="fw-bold text-truncate d-block" style={{fontSize: '0.85rem'}}>{p.name}</span>
                                    </div>
                                    <small className="text-danger" style={{fontSize: '0.7rem', marginLeft: '18px'}}>Out of Stock</small>
                                </div>
                                <button 
                                    className="btn btn-danger btn-sm py-0 px-2 shadow-sm" 
                                    style={{fontSize: '0.75rem'}}
                                    onClick={() => onRestockClick(p)}
                                >
                                    Refill
                                </button>
                            </li>
                        ))}

                        {/* Low Stock Items */}
                        {lowStock.map(p => (
                            <li key={p.id} className={`list-group-item d-flex justify-content-between align-items-center px-3 py-2 ${darkMode ? 'bg-dark text-white border-secondary' : 'bg-white'}`}>
                                <div style={{maxWidth: '65%'}}>
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-exclamation-circle-fill text-warning me-2" style={{fontSize: '0.8rem'}}></i>
                                        <span className="fw-medium text-truncate d-block" style={{fontSize: '0.85rem'}}>{p.name}</span>
                                    </div>
                                    <small className="text-warning" style={{fontSize: '0.7rem', marginLeft: '18px'}}>{p.stock_quantity} left</small>
                                </div>
                                <button 
                                    className="btn btn-warning btn-sm py-0 px-2 shadow-sm text-dark fw-bold" 
                                    style={{fontSize: '0.75rem'}}
                                    onClick={() => onRestockClick(p)}
                                >
                                    Restock
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Footer */}
                <div className={`p-2 text-center border-top ${darkMode ? 'border-secondary bg-dark' : 'bg-light'}`}>
                    <small className={darkMode ? 'text-secondary' : 'text-muted'} style={{fontSize: '0.7rem'}}>
                        Action required to prevent sales loss.
                    </small>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default LowStockAlert;