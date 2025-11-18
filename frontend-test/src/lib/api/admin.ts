import { apiClient } from './client';

export interface DashboardStats {
  totalUsers: number;
  totalPros: number;
  totalAdmins: number;
  activeCampaigns: number;
  totalCampaigns: number;
  activeSessions: number;
  completedSessions: number;
  totalTransferred: number;
  pendingDisputes: number;
  pendingWithdrawals: number;
}

export interface Dispute {
  id: string;
  sessionId: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  session?: any;
}

export interface ResolveDisputeDto {
  resolution: string;
}

export interface BroadcastDto {
  recipients: 'ALL' | 'USER' | 'PRO' | 'ADMIN' | string[];
  type: string;
  title: string;
  message: string;
  channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[];
}

export interface BulkDeleteDto {
  entityType: 'users' | 'products' | 'campaigns';
  ids: string[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details?: any;
  timestamp: string;
}

// Get dashboard statistics
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient('/admin/dashboard/stats');
  return response;
}

// Get disputes
export async function getDisputes(filters?: { status?: string }): Promise<Dispute[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);

  const response = await apiClient(`/admin/disputes?${params.toString()}`);
  return response;
}

// Get dispute by ID
export async function getDispute(id: string): Promise<Dispute> {
  const response = await apiClient(`/admin/disputes/${id}`);
  return response;
}

// Resolve dispute
export async function resolveDispute(id: string, data: ResolveDisputeDto): Promise<Dispute> {
  const response = await apiClient(`/admin/disputes/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}

// Suspend user
export async function suspendUser(userId: string, reason?: string): Promise<void> {
  await apiClient(`/admin/users/${userId}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// Send broadcast notification
export async function sendBroadcast(data: BroadcastDto): Promise<void> {
  await apiClient('/admin/broadcast', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Bulk delete
export async function bulkDelete(data: BulkDeleteDto): Promise<void> {
  await apiClient('/admin/bulk-delete', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Get user activity logs
export async function getUserActivityLogs(userId: string): Promise<ActivityLog[]> {
  const response = await apiClient(`/admin/activity-logs/${userId}`);
  return response;
}
