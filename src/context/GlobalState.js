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
  
  // Inventory
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  
  // Billing
  const [billingHistory, setBillingHistory] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [reports, setReports] = useState([]);

  // Services & Warranties
  const [upcomingServices, setUpcomingServices] = useState([]); 
  const [services, setServices] = useState([]); 
  const [warranties, setWarranties] = useState([]); 

  // ==================================================
  // 3. UI ACTIONS
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
  const fetchData = useCallback(async (endpoint, setter) => {
    try {
      const res = await apiClient.get(endpoint);
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

  // Loaders
  const loadCustomers = useCallback(() => fetchData('/customers/', setCustomers), [fetchData]);
  const loadBrands = useCallback(() => fetchData('/inventory/brands', setBrands), [fetchData]);
  const loadCategories = useCallback(() => fetchData('/inventory/categories', setCategories), [fetchData]);
  const loadSubCategories = useCallback(() => fetchData('/inventory/sub-categories', setSubCategories), [fetchData]);
  
  // Billing Routes
  const loadBilling = useCallback(() => fetchData('/billing/history', setBillingHistory), [fetchData]);
  
  // 🔥 UPDATED: Moved to /accounts/debtors (Fixes 404)
  const loadDebtors = useCallback(() => fetchData('/accounts/debtors', setDebtors), [fetchData]);
  
  // 🔥 UPDATED: Moved to /accounts/report (Fixes 404)
  const loadReports = useCallback(() => fetchData('/accounts/report', setReports), [fetchData]);
  
  const loadUpcomingServices = useCallback(() => fetchData('/services/upcoming', setUpcomingServices), [fetchData]);
  const loadWarranties = useCallback(() => fetchData('/warranty/list', setWarranties), [fetchData]);

  // Load Full Service List
  const loadServices = useCallback(() => fetchData('/services/', setServices), [fetchData]);

  const loadInventoryData = useCallback(async () => {
    await Promise.all([loadBrands(), loadCategories(), loadSubCategories()]);
  }, [loadBrands, loadCategories, loadSubCategories]);

  // ==================================================
  // 5. SERVICE OPTIMIZED ACTIONS (HOOKS)
  // ==================================================
  
  // A. Add Service
  const addService = useCallback(async (formData) => {
    try {
      const res = await apiClient.post('/services/assign', formData);
      const newService = res.data; 
      
      setServices(prev => [newService, ...prev]);
      setUpcomingServices(prev => [newService, ...prev]); 
      return { success: true };
    } catch (error) {
      console.error("Add Service Failed", error);
      throw error;
    }
  }, []);

  // B. Update Service
  const updateService = useCallback(async (id, updates) => {
    try {
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      await apiClient.put(`/services/${id}`, updates);
      return { success: true };
    } catch (error) {
      loadServices(); 
      throw error;
    }
  }, [loadServices]);

  // C. Delete Service
  const deleteService = useCallback(async (id) => {
    try {
      setServices(prev => prev.filter(s => s.id !== id));
      await apiClient.delete(`/services/${id}`);
    } catch (error) {
      loadServices();
      throw error;
    }
  }, [loadServices]);

  // ==================================================
  // 6. INITIALIZATION
  // ==================================================
  useEffect(() => {
    const initApp = async () => {
        try {
            const timerPromise = new Promise(resolve => setTimeout(resolve, 1000));
            
            const dataPromise = Promise.allSettled([
                loadCustomers(),
                loadInventoryData(),
                loadBilling(),
                loadDebtors(),
                loadReports(),
                loadUpcomingServices(),
                loadServices(), 
                loadWarranties()
            ]);

            await Promise.all([timerPromise, dataPromise]);
            setIsLoading(false);
        } catch (error) {
            console.error("Init Failed:", error);
            setIsLoading(false);
        }
    };
    initApp();
  }, [loadCustomers, loadInventoryData, loadBilling, loadDebtors, loadReports, loadUpcomingServices, loadServices, loadWarranties]);

  // ==================================================
  // 7. CONTEXT VALUE
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
      reports, loadReports,
      
      upcomingServices, 
      services, 
      loadServices, 
      
      addService, 
      updateService, 
      deleteService,
      
      warranties, loadWarranties
  }), [
      isLoading, darkMode, isSidebarCollapsed,
      customers, brands, categories, subCategories,
      billingHistory, debtors, reports, 
      upcomingServices, services, warranties,
      
      toggleTheme, toggleSidebar, openSidebar, closeSidebar,
      loadCustomers, loadBrands, loadCategories, loadSubCategories, loadInventoryData,
      loadBilling, loadDebtors, loadReports, 
      loadServices, loadWarranties,
      
      addService, updateService, deleteService 
  ]);

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};