export type Role = 'MANAGER' | 'DISPATCHER' | 'TECHNICIAN' | 'CUSTOMER';

export type WorkOrderStatus = 
  | 'NEW' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'ON_HOLD' 
  | 'COMPLETED' 
  | 'CLOSED' 
  | 'CANCELLED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id?: number;
  userName: string;
  userEmail: string;
  role: Role;
  phone?: string;
  customerId?: number;
  emailVerified?: boolean;
  // Technicians only.
  location?: string | null;
  available?: boolean | null;
  currentJobs?: number | null;
  joinedAt?: string | null;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  role: Role | null;
}

export interface Customer {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  active: boolean;
}

export interface Site {
  id: number;
  customerId?: number;
  siteName: string;
  buildingName?: string;
  roomNo?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: number;
}

export interface WorkOrderStatusHistory {
  id: number;
  fromStatus?: WorkOrderStatus;
  toStatus: WorkOrderStatus;
  changedByEmail?: string;
  changedByName?: string;
  changedAt: string;
  notes?: string;
}

export interface Part {
  id: number;
  name: string;
  sku: string;
  unitCost: number;
  stockQty: number;
  minStockQty?: number;
}

export interface PartUsage {
  id: number;
  partId: number;
  partName: string;
  sku: string;
  quantityUsed: number;
  unitCost: number;
  totalCost: number;
  usedByName: string;
  usedAt: string;
}

export interface TimeLog {
  id: number;
  technicianId: number;
  technicianName: string;
  technicianEmail: string;
  minutes: number;
  note?: string;
  loggedAt: string;
  workDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface WorkOrder {
  id: number;
  code: string;
  title: string;
  description?: string;
  priority: Priority;
  status: WorkOrderStatus;
  slaDueDate: string;
  slaBreached: boolean;
  slaAtRisk: boolean;

  customerId: number;
  customerName: string;
  customerEmail: string;

  siteId: number;
  siteName: string;
  siteAddress?: string;

  assignedToId?: number;
  assignedToName?: string;
  assignedToEmail?: string;
  assignedToLocation?: string | null;
  technicianNotes?: string | null;

  totalPartsCost: number;
  totalLaborMinutes: number;

  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  closedAt?: string;

  statusHistory?: WorkOrderStatusHistory[];
  partsUsed?: PartUsage[];
  timeLogs?: TimeLog[];
}

export interface DashboardMetrics {
  newOrders: number;
  assignedOrders: number;
  inProgressOrders: number;
  onHoldOrders: number;
  completedOrders: number;
  closedOrders: number;
  cancelledOrders: number;
  totalOpen: number;
  overdueOrders: number;
  atRiskOrders: number;
  slaCompliancePercentage: number;
  totalClosed: number;
  totalClosedWithinSla: number;
  technicianBreakdown: Record<string, number>;
  siteBreakdown: Record<string, number>;
}

export type NotificationType =
  | 'WORK_ORDER_CREATED' | 'WORK_ORDER_ASSIGNED' | 'TECHNICIAN_ASSIGNMENT' | 'WORK_ORDER_STATUS'
  | 'WORK_ORDER_COMPLETED' | 'CRITICAL_WORK_ORDER' | 'PAYMENT_PENDING' | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED' | 'PAYMENT_CANCELLED' | 'EMAIL_VERIFIED' | 'SECURITY' | 'CUSTOMER_REGISTERED' | 'ATTENDANCE';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  referenceType?: 'WORK_ORDER' | 'PAYMENT' | null;
  referenceId?: number | null;
  referenceLabel?: string | null;
  read: boolean;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'UPI_QR' | 'CARD';
export type UpiApp = 'GOOGLE_PAY' | 'PHONEPE' | 'PAYTM' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface Payment {
  id: number;
  reference: string;
  workOrderId: number;
  workOrderCode: string;
  workOrderTitle: string;
  customerId: number;
  customerName: string;
  payerName: string;
  payerEmail: string;
  payerPhone?: string | null;
  customerAddress?: string | null;
  workOrderDescription?: string | null;
  upiApp?: UpiApp | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionRef?: string | null;
  failureReason?: string | null;
  verifiedByName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  paidAt?: string | null;
  upiUri?: string | null;
}

export interface PaymentConfig {
  upiEnabled: boolean;
  upiVpa?: string | null;
  payeeName: string;
  currency: string;
}

export interface Attachment {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedAt: string;
}
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'HALF_DAY';

export interface AttendanceRecord {
  id?: number | null;
  userId: number;
  userName: string;
  role: Role;
  location?: string | null;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: AttendanceStatus | 'NOT_MARKED';
  hours?: number | null;
  note?: string | null;
  markedByName?: string | null;
}

export interface StaffMember {
  id: number;
  name: string;
  role: Role;
  email: string;
  phone?: string | null;
  location?: string | null;
  available?: boolean | null;
  currentJobs?: number | null;
  todayAttendance: AttendanceStatus | 'NOT_MARKED';
  joinedAt?: string | null;
}

export interface CustomerAccount {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  organisationId?: number | null;
  organisationName?: string | null;
  emailVerified: boolean;
  status: 'ACTIVE' | 'UNVERIFIED' | 'UNLINKED';
  joinedAt?: string | null;
  openWorkOrders?: number | null;
  totalWorkOrders?: number | null;
  totalPaid?: number | null;
  recentWorkOrders?: { id: number; code: string; title: string; status: WorkOrderStatus; createdAt: string }[];
  payments?: Payment[];
}
