import React, { useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalProvider, GlobalContext } from './context/GlobalState'; // Import Context
import './App.css'; 

// COMPONENTS
import Sidebar from './components/Sidebar';
import ServiceNotifier from './components/ServiceNotifier';
import LoadingScreen from './components/LoadingScreen';

// PAGES
import Dashboard from './pages/Dashboard'; 
import Customers from './pages/Customers';
import Billing from './pages/Billing';
import Accounts from './pages/Accounts';
import Settings from './pages/Settings';
import ViewBills from './pages/ViewBills';
import Inventory from './pages/Inventory';
import WarrantyManager from './pages/WarrantyManager';
import Services from './pages/Services';
import Employees from './pages/Employees'; 

// REPORT PAGES
import FinancialReports from './pages/FinancialReports';
import InventoryReports from './pages/InventoryReports'; // <--- NEW IMPORT
import ServiceReports from './pages/ServiceReports';


const AppContent = () => {
  // GET LOADING STATE
  const { darkMode, isSidebarCollapsed, isLoading } = useContext(GlobalContext);

  // --- SHOW LOADING SCREEN IF INITIALIZING ---
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="d-flex" data-theme={darkMode ? 'dark' : 'light'}>
        <ServiceNotifier />
        <Sidebar />
        
        <div className="flex-grow-1" style={{ 
          marginLeft: isSidebarCollapsed ? '80px' : '280px', 
          minHeight: '100vh', 
          backgroundColor: 'var(--bg-body)', 
          transition: 'margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s' 
        }}>
          <Routes>
            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Main Modules */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/view-bills" element={<ViewBills />} />
            <Route path="/warranties" element={<WarrantyManager />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/services" element={<Services />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/employees" element={<Employees />} />
            
            {/* Reports */}
            <Route path="/reports/financial" element={<FinancialReports />} />
            <Route path="/reports/inventory" element={<InventoryReports />} /> {/* <--- NEW ROUTE */}
            <Route path="/reports/service" element={<ServiceReports />} />
            
            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

function App() {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
}

export default App;