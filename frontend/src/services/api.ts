import axios from 'axios';
import { AppNotification, Attachment, AttendanceRecord, AttendanceStatus, Customer, CustomerAccount, StaffMember, DashboardMetrics, Part, Payment, PaymentConfig, PaymentMethod, Site, UpiApp, User, WorkOrder, WorkOrderStatus } from '../types';

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
  me: async () => {
    const res = await api.get<User>('/api/auth/me');
    return res.data;
  },
  updateMe: async (data: { userName?: string; phone?: string; location?: string; available?: boolean }) => {
    const res = await api.put<User>('/api/auth/me', data);
    return res.data;
  },
  verifyEmail: async (userEmail: string, otp: string) => {
    const res = await api.post<{ message: string }>('/api/auth/verify-email', { userEmail, otp });
    return res.data;
  },
  resendOtp: async (userEmail: string) => {
    const res = await api.post<{ message: string }>('/api/auth/resend-otp', { userEmail });
    return res.data;
  },
  getConfig: async () => {
    const res = await api.get<{ demoMode: boolean }>('/api/auth/config');
    return res.data;
  },
  register: async (data: any) => {
    const res = await api.post('/api/auth/register', data);
    return res.data;
  },
  forgotPassword: async (userEmail: string) => {
    await api.post('/api/auth/forgot-password', { userEmail });
  },
  resetPassword: async (token: string, newpassword: string) => {
    await api.post('/api/auth/reset-password', { token, newpassword });
  },
  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    // Returns a new token: every session opened before the change is signed out.
    const res = await api.post<{ message: string; token: string }>('/api/auth/change-password', { currentPassword, newPassword, confirmPassword });
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
    const res = await api.get<{ content: Customer[] }>('/api/customers', { params: { size: 100 } });
    return res.data.content;
  },
  getMine: async () => {
    const res = await api.get<Customer>('/api/customers/me');
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
    const res = await api.get<{ content: Site[] }>(`/api/customers/${customerId}/sites`);
    return res.data.content;
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

export const userApi = {
  getTechnicians: async () => {
    const res = await api.get<User[]>('/api/users/technicians');
    return res.data;
  },
  list: async () => {
    const res = await api.get<{ content: User[] }>('/api/users');
    return res.data.content;
  },
  create: async (data: { userName: string; userEmail: string; password: string; phone?: string; role: string; customerId?: number; location?: string }) => {
    const res = await api.post<User>('/api/users', data);
    return res.data;
  },
  update: async (id: number, data: { userName: string; phone?: string; role: string; customerId?: number; location?: string; available?: boolean; password?: string }) => {
    const res = await api.put<User>(`/api/users/${id}`, data);
    return res.data;
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
  // Give startTime + endTime ("HH:mm") and the server calculates the minutes, or give minutes alone.
  logTime: async (id: number, data: { workDate?: string; startTime?: string; endTime?: string; minutes?: number; note?: string }) => {
    const res = await api.post(`/api/work-orders/${id}/time`, data);
    return res.data;
  },
  updateTechnicianNotes: async (id: number, notes: string) => {
    const res = await api.put<WorkOrder>(`/api/work-orders/${id}/technician-notes`, { notes });
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
  getSummary: async (params?: { customerId?: number; siteId?: number; technicianId?: number }) => {
    const res = await api.get<DashboardMetrics>('/api/reports/summary', { params });
    return res.data;
  },
};

export default api;

export const notificationApi = {
  list: async (size = 30) => {
    const res = await api.get<{ content: AppNotification[] }>('/api/notifications', { params: { size } });
    return res.data.content;
  },
  unreadCount: async () => {
    const res = await api.get<{ count: number }>('/api/notifications/unread-count');
    return res.data.count;
  },
  markRead: async (id: number) => {
    await api.post(`/api/notifications/${id}/read`);
  },
  markAllRead: async () => {
    await api.post('/api/notifications/read-all');
  },
};

// Saves a binary response (PDF, file) through the browser's normal download.
const saveBlob = (data: Blob, fileName: string) => {
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const paymentApi = {
  config: async () => {
    const res = await api.get<PaymentConfig>('/api/payments/config');
    return res.data;
  },
  list: async () => {
    const res = await api.get<Payment[]>('/api/payments');
    return res.data;
  },
  // Customers only: starts a PENDING payment that a manager later confirms.
  create: async (data: { workOrderId: number; amount: number; method: PaymentMethod; upiApp?: UpiApp; transactionRef?: string }) => {
    const res = await api.post<Payment>('/api/payments', data);
    return res.data;
  },
  // UPI transaction reference (UTR) or card-machine slip number.
  submitReference: async (id: number, transactionRef: string) => {
    const res = await api.post<Payment>(`/api/payments/${id}/reference`, { transactionRef });
    return res.data;
  },
  cancel: async (id: number) => {
    const res = await api.post<Payment>(`/api/payments/${id}/cancel`);
    return res.data;
  },
  confirm: async (id: number) => {
    const res = await api.post<Payment>(`/api/payments/${id}/confirm`);
    return res.data;
  },
  reject: async (id: number, reason: string) => {
    const res = await api.post<Payment>(`/api/payments/${id}/reject`, { reason });
    return res.data;
  },
  downloadReceipt: async (payment: Payment) => {
    const res = await api.get(`/api/payments/${payment.id}/receipt`, { responseType: 'blob' });
    saveBlob(res.data, `KEYSTONE-Receipt-${payment.reference}.pdf`);
  },
};

export const attachmentApi = {
  list: async (workOrderId: number) => {
    const res = await api.get<Attachment[]>(`/api/work-orders/${workOrderId}/attachments`);
    return res.data;
  },
  upload: async (workOrderId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post<Attachment>(`/api/work-orders/${workOrderId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  download: async (workOrderId: number, attachment: Attachment) => {
    const res = await api.get(`/api/work-orders/${workOrderId}/attachments/${attachment.id}`, { responseType: 'blob' });
    saveBlob(res.data, attachment.fileName);
  },
};

// Error text from a failed API call: the first field error, else the server message.
export const apiError = (err: any, fallback: string): string => {
  const data = err?.response?.data;
  const fieldError = data?.fieldErrors && Object.values(data.fieldErrors)[0];
  return (fieldError as string) || data?.message || fallback;
};
// Manager-only directories (the server refuses everyone else).
export const directoryApi = {
  customerAccounts: async (limit?: number) => {
    const res = await api.get<CustomerAccount[]>('/api/customers/accounts', { params: limit ? { limit } : {} });
    return res.data;
  },
  customerAccount: async (userId: number) => {
    const res = await api.get<CustomerAccount>(`/api/customers/accounts/${userId}`);
    return res.data;
  },
  staff: async () => {
    const res = await api.get<StaffMember[]>('/api/staff');
    return res.data;
  },
};

export const attendanceApi = {
  // Manager: all staff for a day (YYYY-MM-DD), default today.
  forDay: async (date?: string) => {
    const res = await api.get<AttendanceRecord[]>('/api/attendance', { params: date ? { date } : {} });
    return res.data;
  },
  mark: async (userId: number, data: { date: string; status: AttendanceStatus; note?: string }) => {
    const res = await api.put<AttendanceRecord>(`/api/attendance/${userId}`, data);
    return res.data;
  },
  // Technician / dispatcher: own records only.
  mine: async (days = 14) => {
    const res = await api.get<AttendanceRecord[]>('/api/attendance/me', { params: { days } });
    return res.data;
  },
  checkIn: async () => (await api.post<AttendanceRecord>('/api/attendance/check-in')).data,
  checkOut: async () => (await api.post<AttendanceRecord>('/api/attendance/check-out')).data,
};
