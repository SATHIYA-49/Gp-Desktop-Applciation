import React, { useContext } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { GlobalProvider, GlobalContext } from './context/GlobalState';
import './App.css'; 

// --- COMPONENTS ---
import Sidebar from './components/Sidebar';
import ServiceNotifier from './components/ServiceNotifier';

// --- PAGES ---
import Customers from './pages/Customers';
import Billing from './pages/Billing';
import Accounts from './pages/Accounts';
import Settings from './pages/Settings';
import ViewBills from './pages/ViewBills';
import FinancialReports from './pages/FinancialReports';
import ServiceReports from './pages/ServiceReports';
import Inventory from './pages/Inventory';
import Services from './pages/Services';
import Employees from './pages/Employees'; // <--- NEW IMPORT

// Wrapper to consume Context for Theme & Sidebar State
const AppContent = () => {
  const { darkMode, isSidebarCollapsed } = useContext(GlobalContext);

  return (
    <Router>
      {/* Theme Data Attribute */}
      <div className="d-flex" data-theme={darkMode ? 'dark' : 'light'}>
        
        {/* Background Service Checker */}
        <ServiceNotifier />

        {/* Sidebar Navigation */}
        <Sidebar />
        
        {/* Main Content Area with Dynamic Margin */}
        <div className="flex-grow-1" style={{ 
          marginLeft: isSidebarCollapsed ? '80px' : '280px', 
          minHeight: '100vh', 
          backgroundColor: 'var(--bg-body)', // Uses CSS variable from App.css
          transition: 'margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s' 
        }}>
          <Routes>
            <Route path="/" element={<Customers />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/view-bills" element={<ViewBills />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/services" element={<Services />} />
            <Route path="/reports/financial" element={<FinancialReports />} />
            <Route path="/reports/service" element={<ServiceReports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/employees" element={<Employees />} />
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