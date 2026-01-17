import React, { useState } from 'react';

const InvoicePreview = ({ show, onClose, data, company, onSave }) => {
    // Default: Checkbox is CHECKED (Send Bill)
    const [sendBill, setSendBill] = useState(true); 
    const [isProcessing, setIsProcessing] = useState(false);

    if (!show || !data) return null;

    // --- HELPERS ---
    const formatCurrency = (amount) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount || 0);

    const formatDate = (dateObj) => {
        const d = dateObj ? new Date(dateObj) : new Date();
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // 🔥 HANDLE GENERATE BILL
    const handleGenerateBill = async () => {
        setIsProcessing(true);

        // -----------------------------------------
        // LOGIC 1: IF CHECKBOX IS ON -> OPEN WHATSAPP
        // -----------------------------------------
        if (sendBill) {
            try {
                // 1. Build Item List
                let itemList = "";
                data.items.forEach((item, idx) => {
                    itemList += `${idx + 1}. ${item.product_name} x ${item.quantity} = ${formatCurrency(item.total)}\n`;
                });

                // 2. CONSTRUCT MESSAGE (Exactly Matching Preview)
                let message = `🧾 *INVOICE*\n`;
                message += `*${company.name}*\n`;
                if (company.gstin) message += `GSTIN: ${company.gstin}\n`;
                
                message += `--------------------------------\n`;
                message += `📅 Date: ${formatDate(data.date)}\n`;
                message += `🔢 Bill No: #${data.invoice_no}\n`;
                
                message += `--------------------------------\n`;
                message += `👤 To: *${data.customer_name || 'Guest'}*\n`;
                if (data.customer_phone) message += `📱 Ph: ${data.customer_phone}\n`;
                if (data.customer_gstin) message += `🏛 Cust GST: ${data.customer_gstin}\n`;
                
                message += `--------------------------------\n`;
                message += `*Items:*\n${itemList}`;
                message += `--------------------------------\n`;
                
                message += `Subtotal: ${formatCurrency(data.sub_total)}\n`;
                if (data.extra_discount > 0) {
                    message += `Discount: -${formatCurrency(data.extra_discount)}\n`;
                }
                
                message += `*GRAND TOTAL: ${formatCurrency(data.grand_total)}*\n`;
                
                if (data.balance > 0) {
                    message += `🔴 Balance Due: ${formatCurrency(data.balance)}\n`;
                }

                message += `--------------------------------\n`;
                message += `Thank you! Visit Again. 🙏`;

                // 3. SEND TO WINDOWS APP
                const phone = data.customer_phone ? `91${data.customer_phone}` : '';
                const appUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
                
                // Trigger App Open
                window.location.href = appUrl; 

            } catch (err) {
                console.error("WhatsApp Error:", err);
                alert("Could not open WhatsApp Desktop App.");
            }
        }

        // -----------------------------------------
        // LOGIC 2: SAVE TO DATABASE
        // -----------------------------------------
        await onSave(sendBill); 
        setIsProcessing(false);
    };

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-start pt-4 animate__animated animate__fadeIn" 
             style={{ zIndex: 1055, backgroundColor: 'rgba(0,0,0,0.85)', overflowY: 'auto' }}
             onClick={onClose}>
            
            <div className="position-relative mb-5 mt-3" onClick={(e) => e.stopPropagation()}>
                
                {/* 🎛️ TOOLBAR */}
                <div className="card border-0 mb-3 p-3 bg-dark text-white d-print-none shadow-sm mx-auto" style={{ width: '320px', borderRadius: '12px' }}>
                    
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="m-0 fw-bold text-white-50">Confirm Action</h6>
                        <button className="btn btn-sm btn-outline-light border-0" onClick={onClose}><i className="bi bi-x-lg"></i></button>
                    </div>

                    <div className="form-check form-switch mb-3 p-2 rounded border border-secondary" style={{backgroundColor: 'rgba(255,255,255,0.1)'}}>
                        <input className="form-check-input ms-0 me-2" type="checkbox" id="sendBillCheck" 
                            checked={sendBill} onChange={(e) => setSendBill(e.target.checked)} style={{cursor: 'pointer'}} />
                        <label className="form-check-label small text-white fw-bold" htmlFor="sendBillCheck" style={{cursor: 'pointer'}}>
                            Open WhatsApp App <i className="bi bi-windows text-primary ms-1"></i>
                        </label>
                    </div>

                    <button className="btn btn-success w-100 fw-bold py-2 shadow-sm" onClick={handleGenerateBill} disabled={isProcessing}>
                        {isProcessing ? (
                            <span><span className="spinner-border spinner-border-sm me-2"></span>Saving...</span>
                        ) : (
                            <span><i className="bi bi-check-circle-fill me-2"></i>{sendBill ? "Open App & Save" : "Save Only"}</span>
                        )}
                    </button>
                </div>

                {/* 🧾 VISUAL PREVIEW (Matches Message Exactly) */}
                <div className="bg-white text-dark shadow-lg mx-auto" 
                     style={{ 
                         width: '320px', 
                         minHeight: '400px',
                         padding: '20px',
                         fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                         fontSize: '12px',
                         lineHeight: '1.5',
                         borderRadius: '0px'
                     }}>
                    
                    {/* 1. COMPANY HEADER */}
                    <div className="text-center border-bottom pb-3 mb-3 border-2">
                        <h5 className="fw-bold m-0 text-uppercase text-black" style={{ fontSize: '18px', letterSpacing: '0.5px' }}>
                            {company?.name}
                        </h5>
                        {company?.gstin && (
                            <div className="fw-bold mt-1 small text-secondary">
                                GSTIN: {company.gstin}
                            </div>
                        )}
                    </div>

                    {/* 2. CUSTOMER & META DETAILS */}
                    <div className="mb-3 text-start bg-light p-2 rounded border border-light">
                        <div className="d-flex justify-content-between">
                            <span className="text-secondary">Date:</span>
                            <span className="fw-bold">{formatDate(data.date)}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                            <span className="text-secondary">Bill No:</span>
                            <span className="fw-bold">#{data.invoice_no}</span>
                        </div>
                        
                        <hr className="my-1 border-secondary opacity-25" />
                        
                        <div>
                            <span className="text-secondary">To:</span> <span className="fw-bold text-uppercase">{data.customer_name || "GUEST"}</span>
                        </div>
                        
                        {data.customer_phone && (
                            <div className="small text-muted">Ph: {data.customer_phone}</div>
                        )}

                        {data.customer_gstin && data.customer_gstin !== "" && (
                            <div className="mt-1 fw-bold text-success border-top border-secondary border-opacity-25 pt-1" style={{fontSize: '11px'}}>
                                Cust GST: {data.customer_gstin}
                            </div>
                        )}
                    </div>

                    {/* 3. ITEMS */}
                    <div className="mb-4">
                        <div className="fw-bold border-bottom mb-2 pb-1">Items:</div>
                        {data.items.map((item, idx) => (
                            <div key={idx} className="mb-2 border-bottom border-light pb-2">
                                <div className="fw-bold text-dark" style={{ fontSize: '12px' }}>{item.product_name}</div>
                                {item.warranty_duration > 0 && <div className="text-muted fst-italic" style={{fontSize: '10px'}}>Warranty: {item.warranty_duration} {item.warranty_unit}</div>}
                                <div className="d-flex align-items-center mt-1">
                                    <span style={{ width: '50%' }} className="text-muted small">@{item.unit_price}</span>
                                    <span style={{ width: '15%', textAlign: 'center' }} className="fw-bold small">{item.quantity}</span>
                                    <span style={{ width: '35%', textAlign: 'right' }} className="fw-bold text-dark">{formatCurrency(item.total)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 4. TOTALS */}
                    <div className="pt-2">
                         <div className="d-flex justify-content-between mb-1 small text-secondary">
                            <span>Subtotal</span>
                            <span>{formatCurrency(data.sub_total)}</span>
                        </div>
                        {data.extra_discount > 0 && (
                            <div className="d-flex justify-content-between text-success mb-1 small">
                                <span>Discount</span>
                                <span>-{formatCurrency(data.extra_discount)}</span>
                            </div>
                        )}
                        <div className="d-flex justify-content-between align-items-center bg-black text-white p-3 rounded mt-2 shadow-sm">
                            <span className="fs-6 fw-normal">TOTAL</span>
                            <span className="fs-5 fw-bold">{formatCurrency(data.grand_total)}</span>
                        </div>
                        {data.balance > 0 && (
                            <div className="text-center mt-2 text-danger fw-bold small">Balance Due: {formatCurrency(data.balance)}</div>
                        )}
                    </div>
                    
                    <div className="text-center mt-4 pt-3 border-top small text-muted">
                        Thank you! Visit Again. 🙏
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreview;