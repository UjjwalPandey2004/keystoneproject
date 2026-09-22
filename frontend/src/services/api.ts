import axios from 'axios';
import { Customer, DashboardMetrics, Part, Site, WorkOrder, WorkOrderStatus } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('keystone_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('keystone_token');
      localStorage.removeItem('keystone_user');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (userEmail: string, password: string) => {
    const res = await api.post('/api/auth/login', { userEmail, password });
    return res.data;
  },
  register: async (data: any) => {
    const res = await api.post('/api/auth/register', data);
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('keystone_token');
      localStorage.removeItem('keystone_user');
    }
  },
};

export const customerApi = {
  getAll: async () => {
    const res = await api.get<Customer[]>('/api/customers');
    return res.data;
  },
  getById: async (id: number) => {
    const res = await api.get<Customer>(`/api/customers/${id}`);
    return res.data;
  },
  create: async (data: Partial<Customer>) => {
    const res = await api.post<Customer>('/api/customers', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Customer>) => {
    const res = await api.put<Customer>(`/api/customers/${id}`, data);
    return res.data;
  },
  getSites: async (customerId: number) => {
    const res = await api.get<Site[]>(`/api/customers/${customerId}/sites`);
    return res.data;
  },
  addSite: async (customerId: number, data: Partial<Site>) => {
    const res = await api.post<Site>(`/api/customers/${customerId}/sites`, data);
    return res.data;
  },
};

export const siteApi = {
  getById: async (id: number) => {
    const res = await api.get<Site>(`/api/sites/${id}`);
    return res.data;
  },
  update: async (id: number, data: Partial<Site>) => {
    const res = await api.put<Site>(`/api/sites/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    await api.delete(`/api/sites/${id}`);
  },
};

export const workOrderApi = {
  list: async (params?: { status?: WorkOrderStatus; customerId?: number; page?: number; size?: number }) => {
    const res = await api.get<{ content: WorkOrder[]; totalElements: number }>('/api/work-orders', { params });
    return res.data;
  },
  getById: async (id: number) => {
    const res = await api.get<WorkOrder>(`/api/work-orders/${id}`);
    return res.data;
  },
  create: async (data: { title: string; description?: string; priority: string; customerId: number; siteId: number; assignedToId?: number }) => {
    const res = await api.post<WorkOrder>('/api/work-orders', data);
    return res.data;
  },
  update: async (id: number, data: { title?: string; description?: string; priority?: string }) => {
    const res = await api.put<WorkOrder>(`/api/work-orders/${id}`, data);
    return res.data;
  },
  assign: async (id: number, technicianId: number, note?: string) => {
    const res = await api.post<WorkOrder>(`/api/work-orders/${id}/assign`, { technicianId, note });
    return res.data;
  },
  transitionStatus: async (id: number, status: WorkOrderStatus, note?: string) => {
    const res = await api.post<WorkOrder>(`/api/work-orders/${id}/status`, { status, note });
    return res.data;
  },
  logParts: async (id: number, partId: number, quantity: number) => {
    const res = await api.post(`/api/work-orders/${id}/parts`, { partId, quantity });
    return res.data;
  },
  logTime: async (id: number, minutes: number, note?: string) => {
    const res = await api.post(`/api/work-orders/${id}/time`, { minutes, note });
    return res.data;
  },
};

export const partApi = {
  list: async () => {
    const res = await api.get<Part[]>('/api/parts');
    return res.data;
  },
  create: async (data: Partial<Part>) => {
    const res = await api.post<Part>('/api/parts', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Part>) => {
    const res = await api.put<Part>(`/api/parts/${id}`, data);
    return res.data;
  },
};

export const reportApi = {
  getSummary: async () => {
    const res = await api.get<DashboardMetrics>('/api/reports/summary');
    return res.data;
  },
};

export default api;
