import axios from 'axios';

const apiClient = axios.create({
  // 🔥 REMOVED /v1 to match your FastAPI main.py prefixes
  baseURL: 'https://crm-api-hkiz.onrender.com/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;