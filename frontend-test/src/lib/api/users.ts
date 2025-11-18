import { apiClient } from './client';

export type UserRole = 'USER' | 'PRO' | 'ADMIN';

export interface Profile {
  id: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  location?: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  isSuspended: boolean;
  suspendedAt?: string;
  suspendedReason?: string;
  completedSessions?: number;
  averageRating?: number;
  totalEarned?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetUsersParams {
  role?: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  isSuspended?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetUsersResponse {
  users: Profile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  location?: string;
  avatarUrl?: string;
}

export interface ChangeRoleData {
  role: UserRole;
}

export interface SuspendUserData {
  reason: string;
}

// Get all users (admin only)
export async function getUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
  const queryParams = new URLSearchParams();

  if (params?.role) queryParams.append('role', params.role);
  if (params?.isVerified !== undefined) queryParams.append('isVerified', params.isVerified.toString());
  if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
  if (params?.isSuspended !== undefined) queryParams.append('isSuspended', params.isSuspended.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const query = queryParams.toString();
  return apiClient(`/admin/users${query ? `?${query}` : ''}`);
}

// Get user by ID
export async function getUserById(userId: string): Promise<Profile> {
  return apiClient(`/profiles/${userId}`);
}

// Get current user profile
export async function getCurrentUser(): Promise<Profile> {
  return apiClient('/profiles/me');
}

// Update user profile
export async function updateUser(userId: string, data: UpdateUserData): Promise<Profile> {
  return apiClient(`/profiles/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Update current user profile
export async function updateCurrentUser(data: UpdateUserData): Promise<Profile> {
  return apiClient('/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Change user role (admin only)
export async function changeUserRole(userId: string, data: ChangeRoleData): Promise<Profile> {
  return apiClient(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Suspend user (admin only)
export async function suspendUser(userId: string, data: SuspendUserData): Promise<Profile> {
  return apiClient(`/admin/users/${userId}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Unsuspend user (admin only)
export async function unsuspendUser(userId: string): Promise<Profile> {
  return apiClient(`/admin/users/${userId}/unsuspend`, {
    method: 'PATCH',
  });
}

// Verify user (admin only)
export async function verifyUser(userId: string): Promise<Profile> {
  return apiClient(`/admin/users/${userId}/verify`, {
    method: 'PATCH',
  });
}

// Unverify user (admin only)
export async function unverifyUser(userId: string): Promise<Profile> {
  return apiClient(`/admin/users/${userId}/unverify`, {
    method: 'PATCH',
  });
}

// Delete user (admin only)
export async function deleteUser(userId: string): Promise<void> {
  return apiClient(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}
