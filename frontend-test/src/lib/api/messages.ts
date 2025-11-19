import { apiClient } from './client';

export interface Message {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  attachments?: string[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  sender?: any;
}

export interface SendMessageDto {
  content: string;
  attachments?: string[];
}

// Send message
export async function sendMessage(sessionId: string, data: SendMessageDto): Promise<Message> {
  const response = await apiClient(`/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

// Get messages for a session
export async function getMessages(sessionId: string): Promise<Message[]> {
  const response = await apiClient(`/sessions/${sessionId}/messages`);
  return response;
}

// Get message by ID
export async function getMessage(sessionId: string, id: string): Promise<Message> {
  const response = await apiClient(`/sessions/${sessionId}/messages/${id}`);
  return response;
}

// Mark message as read
export async function markMessageAsRead(sessionId: string, id: string): Promise<Message> {
  const response = await apiClient(`/sessions/${sessionId}/messages/${id}/read`, {
    method: 'PATCH',
  });
  return response;
}

// Delete message
export async function deleteMessage(sessionId: string, id: string): Promise<void> {
  await apiClient(`/sessions/${sessionId}/messages/${id}`, {
    method: 'DELETE',
  });
}
