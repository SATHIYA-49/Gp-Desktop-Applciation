import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

export const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  
  // --- THEME STATE ---
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const toggleTheme = () => {
    setDarkMode(prevMode => {
      const newMode = !prevMode;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  // --- SIDEBAR STATE ---
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const openSidebar = () => setIsSidebarCollapsed(false);
  const closeSidebar = () => setIsSidebarCollapsed(true);
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  // --- DATA STATES ---
  // 1. People
  const [customers, setCustomers] = useState([]);
  
  // 2. Inventory (New)
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  // 3. Finance
  const [billingHistory, setBillingHistory] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [reports, setReports] = useState([]);

  // --- FETCHERS ---
  const loadCustomers = async () => { 
    try { 
      const res = await apiClient.get('/customers'); 
      setCustomers(res.data); 
    } catch(e) { console.error("Error loading customers:", e); } 
  };
  
  // Inventory Fetchers
  const loadProducts = async () => { try { const res = await apiClient.get('/inventory/products'); setProducts(res.data); } catch(e){} };
  const loadBrands = async () => { try { const res = await apiClient.get('/inventory/brands'); setBrands(res.data); } catch(e){} };
  const loadCategories = async () => { try { const res = await apiClient.get('/inventory/categories'); setCategories(res.data); } catch(e){} };
  const loadSubCategories = async () => { try { const res = await apiClient.get('/inventory/sub-categories'); setSubCategories(res.data); } catch(e){} };

  // Finance Fetchers
  const loadBilling = async () => { try { const res = await apiClient.get('/billing/history'); setBillingHistory(res.data); } catch(e){} };
  const loadDebtors = async () => { try { const res = await apiClient.get('/billing/debtors'); setDebtors(res.data); } catch(e){} };
  const loadReports = async () => { try { const res = await apiClient.get('/reports/payments'); setReports(res.data); } catch(e){} };

  // Wrapper to load ALL Inventory data at once (useful for Inventory Page)
  const loadInventoryData = async () => {
    await Promise.all([loadProducts(), loadBrands(), loadCategories(), loadSubCategories()]);
  };

  // --- INIT ---
  useEffect(() => {
    // Load critical app data on startup
    loadCustomers();
    loadInventoryData(); // Load inventory data immediately
    loadBilling();
    loadDebtors();
    loadReports();
    // eslint-disable-next-line
  }, []);

  return (
    <GlobalContext.Provider value={{
      // Theme & UI
      darkMode, toggleTheme,
      isSidebarCollapsed, toggleSidebar, openSidebar, closeSidebar,

      // Data & Loaders
      customers, loadCustomers,
      
      // Inventory
      products, brands, categories, subCategories,
      loadProducts, loadBrands, loadCategories, loadSubCategories, loadInventoryData,

      // Finance
      billingHistory, loadBilling,
      debtors, loadDebtors,
      reports, loadReports
    }}>
      {children}
    </GlobalContext.Provider>
  );
};