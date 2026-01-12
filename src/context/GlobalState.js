import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import apiClient from '../api/client';

export const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  
  // --- 1. UI & APP STATE ---
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  // --- 2. DATA STATES ---
  const [customers, setCustomers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [reports, setReports] = useState([]);
  const [upcomingServices, setUpcomingServices] = useState([]); 
  const [services, setServices] = useState([]); 
  const [warranties, setWarranties] = useState([]); 

  // --- 3. HELPERS ---
  // 🔥 FIXED: Added localStorage persistence to toggle
  const toggleTheme = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => setIsSidebarCollapsed(p => !p), []);
  const openSidebar = useCallback(() => setIsSidebarCollapsed(false), []);
  const closeSidebar = useCallback(() => setIsSidebarCollapsed(true), []);

  const fetchData = useCallback(async (endpoint, setter) => {
    try {
      const res = await apiClient.get(endpoint);
      // Robust data extraction
      const result = res.data?.data || res.data || [];
      setter(Array.isArray(result) ? result : []);
    } catch (error) { 
      console.error(`Error loading ${endpoint}`, error); 
      setter([]);
    }
  }, []);

  // --- 4. LOADERS ---
  const loadBrands = useCallback(() => fetchData('/inventory/brands', setBrands), [fetchData]);
  const loadCategories = useCallback(() => fetchData('/inventory/categories', setCategories), [fetchData]);
  const loadSubCategories = useCallback(() => fetchData('/inventory/sub-categories', setSubCategories), [fetchData]);
  const loadCustomers = useCallback(() => fetchData('/customers/', setCustomers), [fetchData]);
  const loadBilling = useCallback(() => fetchData('/billing/history', setBillingHistory), [fetchData]);
  const loadDebtors = useCallback(() => fetchData('/accounts/debtors', setDebtors), [fetchData]);
  const loadReports = useCallback(() => fetchData('/accounts/report', setReports), [fetchData]);
  const loadUpcomingServices = useCallback(() => fetchData('/services/upcoming', setUpcomingServices), [fetchData]);
  const loadWarranties = useCallback(() => fetchData('/warranty/list', setWarranties), [fetchData]);
  const loadServices = useCallback(() => fetchData('/services/', setServices), [fetchData]);

  // --- 5. STARTUP LOGIC ---
  const loadInventoryData = useCallback(async () => {
    try {
        await Promise.allSettled([loadBrands(), loadCategories(), loadSubCategories()]);
    } catch (e) { console.error("Inventory Load Error", e); }
  }, [loadBrands, loadCategories, loadSubCategories]);

  // Load once on startup
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // --- 6. ACTIONS ---
  const addService = useCallback(async (formData) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/services/assign', formData);
      const newService = res.data; 
      setServices(prev => [newService, ...prev]);
      setUpcomingServices(prev => [newService, ...prev]); 
      return { success: true, data: newService };
    } catch (error) { 
      console.error("Add Service Error", error);
      throw error; 
    } finally { setIsLoading(false); }
  }, []);

  const updateService = useCallback(async (id, updates) => {
    try {
      await apiClient.put(`/services/${id}`, updates);
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      return { success: true };
    } catch (error) { 
      loadServices(); // Fallback to refresh data on error
      throw error; 
    }
  }, [loadServices]);

  const deleteService = useCallback(async (id) => {
    try {
      await apiClient.delete(`/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (error) { 
      loadServices(); 
      throw error; 
    }
  }, [loadServices]);

  // --- 7. EXPORT ---
  const contextValue = useMemo(() => ({
      isLoading, setIsLoading, darkMode, toggleTheme,
      isSidebarCollapsed, toggleSidebar, openSidebar, closeSidebar,
      customers, loadCustomers,
      brands, categories, subCategories, loadInventoryData,
      billingHistory, loadBilling, debtors, loadDebtors, reports, loadReports,
      upcomingServices, loadUpcomingServices, services, loadServices,
      addService, updateService, deleteService, warranties, loadWarranties
  }), [
      isLoading, darkMode, isSidebarCollapsed, customers, brands, categories, subCategories,
      billingHistory, debtors, reports, upcomingServices, services, warranties,
      toggleTheme, toggleSidebar, openSidebar, closeSidebar,
      loadCustomers, loadInventoryData, loadBilling, loadDebtors, loadReports, 
      loadUpcomingServices, loadServices, loadWarranties,
      addService, updateService, deleteService 
  ]);

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};