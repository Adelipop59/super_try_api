import { apiClient } from './client';

export interface SystemLog {
  id: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';
  category: 'AUTH' | 'USER' | 'PRODUCT' | 'CAMPAIGN' | 'SESSION' | 'WALLET' | 'NOTIFICATION' | 'ADMIN' | 'SYSTEM';
  message: string;
  details?: any;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  createdAt: string;
}

export interface LogFilters {
  level?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';
  category?: 'AUTH' | 'USER' | 'PRODUCT' | 'CAMPAIGN' | 'SESSION' | 'WALLET' | 'NOTIFICATION' | 'ADMIN' | 'SYSTEM';
  startDate?: string;
  endDate?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface LogStats {
  totalLogs: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  errorsByEndpoint: Array<{ endpoint: string; count: number }>;
  activityByHour: Array<{ hour: number; count: number }>;
}

export interface CleanupLogsDto {
  beforeDate?: string;
  level?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';
}

// Get logs with filters
export async function getLogs(filters?: LogFilters): Promise<SystemLog[]> {
  const params = new URLSearchParams();
  if (filters?.level) params.append('level', filters.level);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await apiClient(`/logs?${params.toString()}`);
  return response;
}

// Get log statistics
export async function getLogStats(): Promise<LogStats> {
  const response = await apiClient('/logs/stats');
  return response;
}

// Get log by ID
export async function getLog(id: string): Promise<SystemLog> {
  const response = await apiClient(`/logs/${id}`);
  return response;
}

// Cleanup old logs
export async function cleanupLogs(data?: CleanupLogsDto): Promise<{ deletedCount: number }> {
  const response = await apiClient('/logs/cleanup', {
    method: 'DELETE',
    body: JSON.stringify(data || {}),
  });
  return response;
}
