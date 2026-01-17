import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://crm-api-hkiz.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
