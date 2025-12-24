import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

export const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  
  // --- 1. LOADING STATE (NEW) ---
  const [isLoading, setIsLoading] = useState(true);

  // --- 2. THEME STATE ---
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

  // --- 3. SIDEBAR STATE ---
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const openSidebar = () => setIsSidebarCollapsed(false);
  const closeSidebar = () => setIsSidebarCollapsed(true);
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  // --- 4. DATA STATES ---
  // People
  const [customers, setCustomers] = useState([]);
  
  // Inventory
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  // Finance
  const [billingHistory, setBillingHistory] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [reports, setReports] = useState([]);

  // --- 5. DATA FETCHERS ---
  const loadCustomers = async () => { 
    try { const res = await apiClient.get('/customers'); setCustomers(res.data); } 
    catch(e) { console.error("Error loading customers:", e); } 
  };
  
  // Inventory Fetchers
  const loadProducts = async () => { try { const res = await apiClient.get('/inventory/products'); setProducts(res.data); } catch(e){} };
  const loadBrands = async () => { try { const res = await apiClient.get('/inventory/brands'); setBrands(res.data); } catch(e){} };
  const loadCategories = async () => { try { const res = await apiClient.get('/inventory/categories'); setCategories(res.data); } catch(e){} };
  const loadSubCategories = async () => { try { const res = await apiClient.get('/inventory/sub-categories'); setSubCategories(res.data); } catch(e){} };

  // Finance Fetchers
  const loadBilling = async () => { try { const res = await apiClient.get('/billing/history'); setBillingHistory(res.data); } catch(e){} };
  const loadDebtors = async () => { try { const res = await apiClient.get('/billing/debtors'); setDebtors(res.data); } catch(e){} };
  const loadReports = async () => { 
    try { 
        const res = await apiClient.get('/billing/report'); 
        setReports(res.data); 
    } catch(e){ console.error(e); } 
  };

  // Wrapper to load ALL Inventory data at once
  const loadInventoryData = async () => {
    await Promise.all([loadProducts(), loadBrands(), loadCategories(), loadSubCategories()]);
  };

  // --- 6. INITIALIZATION EFFECT (The Magic Part) ---
  useEffect(() => {
    const initApp = async () => {
        try {
            console.log("🚀 App Initializing...");
            
            // Step A: Start the 2-second timer (for the animation)
            const timerPromise = new Promise(resolve => setTimeout(resolve, 2000));

            // Step B: Start fetching ALL data in parallel
            const dataPromise = Promise.all([
                loadCustomers(),
                loadInventoryData(),
                loadBilling(),
                loadDebtors(),
                loadReports()
            ]);

            // Step C: Wait for BOTH the Timer AND the Data to finish
            await Promise.all([timerPromise, dataPromise]);

            console.log("✅ Initialization Complete. Data Loaded.");
            setIsLoading(false); // Hide Loading Screen, Show Dashboard

        } catch (error) {
            console.error("Initialization Failed:", error);
            setIsLoading(false); // Stop loading even if error
        }
    };

    initApp();
    // eslint-disable-next-line
  }, []);

  return (
    <GlobalContext.Provider value={{
      // App Status
      isLoading,

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