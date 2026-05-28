export interface ApiResponse<T> {
  code: number;
  message: string;
  requestId?: string;
  data: T;
  timestamp: string;
}

export interface LoginRequest {
  tenantCode: string;
  username: string;
  password: string;
  captchaId: string;
  captchaAnswer: string;
}

export interface LoginResponse {
  tokenType: string;
  accessToken: string;
  expiresInSeconds: number;
  tenantId: string;
  tenantCode?: string;
  tenantName?: string;
  userId: string;
  username: string;
  roles: string[];
}

export interface CaptchaResponse {
  captchaId: string;
  challenge: string;
  expiresInSeconds: number;
}

export interface Tenant {
  id: string;
  tenantCode: string;
  tenantName: string;
  status: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantCreatePayload {
  tenantCode: string;
  tenantName: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  status: string;
  roles: string[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreatePayload {
  username: string;
  password: string;
  displayName: string;
  email?: string;
  phone?: string;
  roleCodes?: string[];
}

export interface AdminPasswordResetPayload {
  newPassword: string;
}

export interface SelfPasswordChangePayload {
  currentPassword: string;
  newPassword: string;
}
