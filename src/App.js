import React, { useContext } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { GlobalProvider, GlobalContext } from './context/GlobalState';
import './App.css'; 

import Sidebar from './components/Sidebar';
import Customers from './pages/Customers';
import Billing from './pages/Billing';
import Accounts from './pages/Accounts';
import Settings from './pages/Settings';
import ViewBills from './pages/ViewBills';
import FinancialReports from './pages/FinancialReports';
import ServiceReports from './pages/ServiceReports';
import Inventory from './pages/Inventory';
// Wrapper to consume Context for Theme & Sidebar State
const AppContent = () => {
  // 1. Get both Dark Mode AND Sidebar State
  const { darkMode, isSidebarCollapsed } = useContext(GlobalContext);

  return (
    <Router>
      {/* Theme Data Attribute */}
      <div className="d-flex" data-theme={darkMode ? 'dark' : 'light'}>
        
        <Sidebar />
        
        {/* Main Content Area with Dynamic Margin */}
        <div className="flex-grow-1" style={{ 
          // 2. Logic: If collapsed use 80px, else 280px
          marginLeft: isSidebarCollapsed ? '80px' : '280px', 
          minHeight: '100vh', 
          backgroundColor: 'var(--bg-body)', // Uses CSS variable from App.css
          // 3. Smooth Transition matching Sidebar's speed
          transition: 'margin-left 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), background-color 0.3s' 
        }}>
          <Routes>
            <Route path="/" element={<Customers />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/view-bills" element={<ViewBills />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/reports/financial" element={<FinancialReports />} />
            <Route path="/reports/service" element={<ServiceReports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/inventory" element={<Inventory />} />
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