import React from 'react';

const ProductView = ({ show, onClose, product, theme, darkMode }) => {
    if (!show || !product) return null;

    // Helper to check if specs exist
    const specs = product.specifications || {};
    const hasSpecs = specs.capacity || specs.input_voltage || specs.output_wave || specs.application;

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className={`modal-content border-0 shadow-lg ${theme.modalContent}`}>
                    
                    {/* HEADER */}
                    <div className={`modal-header border-0 pb-0 ${theme.modalHeader}`}>
                        <div>
                            <h5 className="modal-title fw-bold">{product.name}</h5>
                            <div className="d-flex align-items-center gap-2 mt-1">
                                <span className={`badge ${product.is_active ? 'bg-success' : 'bg-secondary'} rounded-pill`}>
                                    {product.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`badge bg-light text-dark border`}>
                                    SKU: {product.sku}
                                </span>
                            </div>
                        </div>
                        <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4">
                        
                        {/* 1. CLASSIFICATION & STOCK */}
                        <div className="row g-3 mb-4">
                            <div className="col-6">
                                <label className="small text-muted fw-bold text-uppercase">Brand</label>
                                <div className="fw-medium">{product.brands?.name || 'Unknown'}</div>
                            </div>
                            <div className="col-6">
                                <label className="small text-muted fw-bold text-uppercase">Category</label>
                                <div className="fw-medium">
                                    {product.categories?.name || '-'} 
                                    {product.sub_categories?.name && <span className="text-muted small"> / {product.sub_categories.name}</span>}
                                </div>
                            </div>
                            <div className="col-6">
                                <label className="small text-muted fw-bold text-uppercase">Stock Status</label>
                                <div>
                                    <span className={`badge rounded-pill px-3 py-2 ${product.stock_quantity <= product.low_stock_limit ? 'bg-danger' : 'bg-success'}`}>
                                        {product.stock_quantity} Units Available
                                    </span>
                                </div>
                            </div>
                            <div className="col-6">
                                <label className="small text-muted fw-bold text-uppercase">Alert Limit</label>
                                <div className="text-warning fw-bold">Below {product.low_stock_limit} units</div>
                            </div>
                        </div>

                        {/* 2. PRICING SECTION (Added Net Price) */}
                        <div className={`p-3 rounded-3 mb-4 ${darkMode ? 'bg-dark border border-secondary' : 'bg-light border'}`}>
                            <h6 className="fw-bold mb-3 border-bottom pb-2 text-primary">
                                <i className="bi bi-tag-fill me-2"></i>Pricing Details
                            </h6>
                            <div className="row g-3">
                                <div className="col-6">
                                    <label className="small text-muted d-block">Net Price (Buy)</label>
                                    <span className="fs-5 fw-bold">₹{product.net_price}</span>
                                </div>
                                <div className="col-6">
                                    <label className="small text-muted d-block">Sell Price (MRP)</label>
                                    <span className="fs-5 fw-bold text-success">₹{product.sell_price}</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. TECHNICAL SPECIFICATIONS */}
                        {hasSpecs && (
                            <div className={`p-3 rounded-3 mb-4 ${darkMode ? 'bg-dark border border-secondary' : 'bg-light border'}`}>
                                <h6 className="fw-bold mb-3 border-bottom pb-2 text-info">
                                    <i className="bi bi-cpu-fill me-2"></i>Technical Specs
                                </h6>
                                <div className="row g-2">
                                    {specs.capacity && (
                                        <div className="col-6 mb-2">
                                            <small className="d-block text-muted">Capacity</small>
                                            <span className="fw-bold">{specs.capacity}</span>
                                        </div>
                                    )}
                                    {specs.input_voltage && (
                                        <div className="col-6 mb-2">
                                            <small className="d-block text-muted">Input Voltage</small>
                                            <span className="fw-bold">{specs.input_voltage}</span>
                                        </div>
                                    )}
                                    {specs.output_wave && (
                                        <div className="col-6 mb-2">
                                            <small className="d-block text-muted">Output Wave</small>
                                            <span className="fw-bold">{specs.output_wave}</span>
                                        </div>
                                    )}
                                    {specs.application && (
                                        <div className="col-12">
                                            <small className="d-block text-muted">Application</small>
                                            <span className="fw-bold">{specs.application}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 4. WARRANTY DETAILS */}
                        {product.warranty_details && (
                            <div className="alert alert-info py-2 d-flex align-items-center mb-0">
                                <i className="bi bi-shield-check fs-4 me-3"></i>
                                <div>
                                    <div className="small fw-bold text-uppercase opacity-75">Warranty Info</div>
                                    <div>{product.warranty_details}</div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* FOOTER */}
                    <div className="modal-footer border-0 pt-0">
                        <button className="btn btn-secondary w-100 fw-bold" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductView;