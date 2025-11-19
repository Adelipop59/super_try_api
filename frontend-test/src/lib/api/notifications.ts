import { apiClient } from './client';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  title: string;
  message: string;
  data?: any;
  isSent: boolean;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  sentAt?: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  sessionNotifications: boolean;
  messageNotifications: boolean;
  paymentNotifications: boolean;
  campaignNotifications: boolean;
  systemNotifications: boolean;
}

export interface UpdateNotificationPreferencesDto {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  sessionNotifications?: boolean;
  messageNotifications?: boolean;
  paymentNotifications?: boolean;
  campaignNotifications?: boolean;
  systemNotifications?: boolean;
}

// Get notifications
export async function getNotifications(): Promise<Notification[]> {
  const response = await apiClient('/notifications');
  return response;
}

// Get notification by ID
export async function getNotification(id: string): Promise<Notification> {
  const response = await apiClient(`/notifications/${id}`);
  return response;
}

// Mark notification as read
export async function markNotificationAsRead(id: string): Promise<Notification> {
  const response = await apiClient(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return response;
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient('/notifications/read-all', {
    method: 'PATCH',
  });
}

// Update notification preferences
export async function updateNotificationPreferences(data: UpdateNotificationPreferencesDto): Promise<NotificationPreferences> {
  const response = await apiClient('/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}
