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
  slaCompliancePercentage: number;
  totalClosed: number;
  totalClosedWithinSla: number;
}
