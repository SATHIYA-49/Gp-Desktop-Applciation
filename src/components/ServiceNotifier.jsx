import { useEffect } from 'react';
import apiClient from '../api/client';

const ServiceNotifier = () => {
  useEffect(() => {
    const checkReminders = async () => {
      try {
        // 1. Calculate "Tomorrow's" Date
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        // 2. Fetch Services Due Tomorrow
        // We reuse the existing endpoint but filter in JS for simplicity
        const res = await apiClient.get('/services/upcoming');
        const services = res.data;

        const dueTomorrow = services.filter(s => s.next_service_date === tomorrowStr);

        // 3. Send Notifications
        if (dueTomorrow.length > 0) {
          // Request permission if not granted
          if (Notification.permission !== "granted") {
            await Notification.requestPermission();
          }

          // Trigger Notification
          if (Notification.permission === "granted") {
            new Notification("Service Reminder 🛠️", {
              body: `You have ${dueTomorrow.length} service(s) due tomorrow! Check the dashboard.`,
              icon: '/logo192.png' // Optional: Add your app logo path here
            });
          }
        }
      } catch (err) {
        console.error("Error checking reminders:", err);
      }
    };

    // Run check on app startup
    checkReminders();

    // Optional: Run check every hour (in milliseconds)
    // const interval = setInterval(checkReminders, 3600000);
    // return () => clearInterval(interval);

  }, []);

  return null; // This component renders nothing, just runs logic
};

export default ServiceNotifier;