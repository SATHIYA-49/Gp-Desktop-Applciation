import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api/client';

export const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  
  // --- 1. UI & APP STATE ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  // --- 2. DATA STATES ---
  const [customers, setCustomers] = useState([]);
  // 🔥 NOTE: 'products' removed from Global State. 
  // Products are now fetched via Server-Side Pagination in Inventory.jsx for performance.
  
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  
  const [billingHistory, setBillingHistory] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [reports, setReports] = useState([]);

  // ==================================================
  // 3. ACTIONS (Memoized)
  // ==================================================

  const toggleTheme = useCallback(() => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  }, []);

  const toggleSidebar = useCallback(() => setIsSidebarCollapsed(prev => !prev), []);
  const openSidebar = useCallback(() => setIsSidebarCollapsed(false), []);
  const closeSidebar = useCallback(() => setIsSidebarCollapsed(true), []);

  // ==================================================
  // 4. DATA FETCHING (Memoized)
  // ==================================================

  // Generic helper to avoid repetition
  const fetchData = useCallback(async (endpoint, setter) => {
    try {
      const res = await apiClient.get(endpoint);
      // Safety check for different response structures
      if (res.data && Array.isArray(res.data)) {
          setter(res.data);
      } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
          setter(res.data.data);
      } else {
          setter([]);
      }
    } catch (error) {
      console.error(`Error loading ${endpoint}:`, error);
      setter([]);
    }
  }, []);

  // Wrap specific loaders in useCallback
  const loadCustomers = useCallback(() => fetchData('/customers/', setCustomers), [fetchData]);
  
  const loadBrands = useCallback(() => fetchData('/inventory/brands', setBrands), [fetchData]);
  const loadCategories = useCallback(() => fetchData('/inventory/categories', setCategories), [fetchData]);
  const loadSubCategories = useCallback(() => fetchData('/inventory/sub-categories', setSubCategories), [fetchData]);
  
  const loadBilling = useCallback(() => fetchData('/billing/history', setBillingHistory), [fetchData]);
  const loadDebtors = useCallback(() => fetchData('/billing/debtors', setDebtors), [fetchData]);
  const loadReports = useCallback(() => fetchData('/billing/report', setReports), [fetchData]);

  // 🔥 UPDATED: Only load Master Data (Brands/Cats) here. 
  // Products are loaded locally in the Inventory component.
  const loadInventoryData = useCallback(async () => {
    await Promise.all([loadBrands(), loadCategories(), loadSubCategories()]);
  }, [loadBrands, loadCategories, loadSubCategories]);

  // ==================================================
  // 5. INITIALIZATION
  // ==================================================
  useEffect(() => {
    const initApp = async () => {
        try {
            console.log("🚀 App Initializing...");
            const timerPromise = new Promise(resolve => setTimeout(resolve, 1500));
            
            // Load essential data for dropdowns and dashboard
            const dataPromise = Promise.allSettled([
                loadCustomers(),
                loadInventoryData(), // Loads Brands, Cats, SubCats
                loadBilling(),
                loadDebtors(),
                loadReports()
            ]);

            await Promise.all([timerPromise, dataPromise]);
            setIsLoading(false);
        } catch (error) {
            console.error("Init Failed:", error);
            setIsLoading(false);
        }
    };
    initApp();
  }, [loadCustomers, loadInventoryData, loadBilling, loadDebtors, loadReports]);

  // ==================================================
  // 6. CONTEXT VALUE (Memoized)
  // ==================================================
  const contextValue = useMemo(() => ({
      isLoading,
      darkMode, toggleTheme,
      isSidebarCollapsed, toggleSidebar, openSidebar, closeSidebar,
      customers, loadCustomers,
      brands, categories, subCategories,
      loadBrands, loadCategories, loadSubCategories, loadInventoryData,
      billingHistory, loadBilling,
      debtors, loadDebtors,
      reports, loadReports
  }), [
      isLoading, darkMode, isSidebarCollapsed,
      customers, brands, categories, subCategories, // Removed 'products'
      billingHistory, debtors, reports,
      toggleTheme, toggleSidebar, openSidebar, closeSidebar,
      loadCustomers, loadBrands, loadCategories, loadSubCategories, loadInventoryData,
      loadBilling, loadDebtors, loadReports
  ]);

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};