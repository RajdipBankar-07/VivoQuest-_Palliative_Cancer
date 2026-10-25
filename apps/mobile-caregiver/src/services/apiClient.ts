import { authStorage } from './authStorage';
import {
  CaregiverSession,
  FieldVisit,
  AssignedPatient,
  ClinicalDocInput,
  FieldVisitStatus,
  VisitRescheduleRequest,
} from '../types';

// Detect Android environment safely across Expo native runtime and headless test runners
const isAndroidDevice = (): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('react-native');
    return rn?.Platform?.OS === 'android';
  } catch {
    return false;
  }
};

let customApiBaseUrlOverride: string | null = null;

export const setCustomMobileApiBaseUrl = (url: string | null): void => {
  customApiBaseUrlOverride = url ? url.replace(/\/+$/, '') : null;
};

// Resolve appropriate API Base URL depending on runtime environment
export const getMobileApiBaseUrl = (): string => {
  if (customApiBaseUrlOverride) {
    return customApiBaseUrlOverride;
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 1. Dynamic host resolution via Expo Constants (works for physical devices & emulators connected to Metro)
  let hostUri: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default || require('expo-constants');
    hostUri =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest2?.extra?.expoClient?.hostUri ||
      Constants?.manifest?.debuggerHost;
  } catch {
    // expo-constants not available in this runtime
  }

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:4000/api/v1`;
    }
  }

  // 2. Web browser runtime: use current origin's hostname
  try {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const hostname = window.location.hostname;
      return `http://${hostname}:4000/api/v1`;
    }
  } catch {
    // Non-browser runtime
  }

  // 3. Android emulator maps host machine localhost to 10.0.2.2
  if (isAndroidDevice()) {
    return 'http://10.0.2.2:4000/api/v1';
  }

  // 4. Default fallback (iOS simulator or local headless testing)
  return 'http://localhost:4000/api/v1';
};

export class SessionExpiredError extends Error {
  constructor(message = 'Session expired. Please sign in again.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Callback listener for 401 Unauthorized triggers
let onUnauthorizedListener: (() => void) | null = null;

export const setOnUnauthorizedListener = (listener: (() => void) | null) => {
  onUnauthorizedListener = listener;
};

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  customBaseUrl?: string
): Promise<T> {
  const baseUrl = customBaseUrl || getMobileApiBaseUrl();
  const token = await authStorage.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(
      `Unable to connect to VivoQuest server at ${baseUrl}. Please check your network connection.`,
      0,
      'NETWORK_DISCONNECTED'
    );
  }

  // Handle Token Expiration & Unauthorized on authenticated endpoints
  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    await authStorage.clearSession();
    if (onUnauthorizedListener) {
      onUnauthorizedListener();
    }
    throw new SessionExpiredError();
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `Request failed with HTTP ${response.status}`;
    const errorCode = data?.error?.code || 'API_ERROR';
    throw new ApiError(errorMsg, response.status, errorCode);
  }

  return data;
}

export const caregiverApi = {
  /**
   * Authenticate caregiver / clinician via phone + password/OTP
   */
  async login(
    identifier: string,
    password?: string,
    otp?: string,
    baseUrl?: string
  ): Promise<{ token: string; user: CaregiverSession }> {
    const payload: Record<string, any> = {
      identifier: identifier.trim(),
    };
    if (password) payload.password = password;
    if (otp) payload.otp = otp;

    const res = await apiRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, baseUrl);

    const token = res.data.token;
    const rawUser = res.data.user;

    // Strict role validation: Ensure user is authorized for caregiver portal
    const allowedRoles = ['caregiver', 'professional', 'admin', 'super_admin'];
    if (!allowedRoles.includes(rawUser.role)) {
      throw new ApiError(
        'Access denied. This portal is strictly for registered Caregivers and Clinical Professionals.',
        403,
        'FORBIDDEN_ROLE'
      );
    }

    const user: CaregiverSession = {
      id: rawUser.id || rawUser._id,
      fullName: rawUser.fullName,
      phone: rawUser.phone,
      email: rawUser.email,
      role: rawUser.role,
      status: rawUser.status,
      isPhoneVerified: Boolean(rawUser.isPhoneVerified),
    };

    // Save token and user into secure storage
    await authStorage.setToken(token);
    await authStorage.setUser(user);

    return { token, user };
  },

  /**
   * Fetch authenticated caregiver's assigned field visits
   */
  async getAssignedVisits(
    filters?: {
      status?: string;
      date?: 'today' | 'upcoming' | 'completed' | string;
      search?: string;
    },
    baseUrl?: string
  ): Promise<FieldVisit[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.search) params.append('search', filters.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<any>(`/visits/provider/me${qs}`, {
      method: 'GET',
    }, baseUrl);

    return (res.data || []).map((v: any) => ({
      id: v.id || v._id,
      visitNumber: v.visitNumber,
      visitType: v.visitType,
      status: v.status,
      providerId: v.providerId,
      providerName: v.providerName,
      providerRole: v.providerRole,
      providerPhone: v.providerPhone,
      patientId: v.patientId,
      patientDetails: {
        fullName: v.patientDetails?.fullName || 'Assigned Patient',
        phone: v.patientDetails?.phone || '',
        address: v.patientDetails?.address || '',
        city: v.patientDetails?.city,
        pincode: v.patientDetails?.pincode,
        cluster: v.patientDetails?.cluster,
        instructions: v.patientDetails?.instructions,
        emergencyContact: v.patientDetails?.emergencyContact,
      },
      scheduledDate: v.scheduledDate,
      timeSlot: v.timeSlot,
      clinicalDocumentation: v.clinicalDocumentation,
      timestamps: v.timestamps || {},
      subscriptionId: v.subscriptionId ? v.subscriptionId.toString() : undefined,
      subscriptionNumber: v.subscriptionNumber,
    }));
  },

  /**
   * Fetch single field visit details
   */
  async getVisitById(visitId: string, baseUrl?: string): Promise<FieldVisit> {
    const res = await apiRequest<any>(`/visits/${encodeURIComponent(visitId)}`, {
      method: 'GET',
    }, baseUrl);

    const v = res.data;
    return {
      id: v.id || v._id,
      visitNumber: v.visitNumber,
      visitType: v.visitType,
      status: v.status,
      providerId: v.providerId,
      providerName: v.providerName,
      providerRole: v.providerRole,
      providerPhone: v.providerPhone,
      patientId: v.patientId,
      patientDetails: {
        fullName: v.patientDetails?.fullName || 'Assigned Patient',
        phone: v.patientDetails?.phone || '',
        address: v.patientDetails?.address || '',
        city: v.patientDetails?.city,
        pincode: v.patientDetails?.pincode,
        cluster: v.patientDetails?.cluster,
        instructions: v.patientDetails?.instructions,
        emergencyContact: v.patientDetails?.emergencyContact,
      },
      scheduledDate: v.scheduledDate,
      timeSlot: v.timeSlot,
      clinicalDocumentation: v.clinicalDocumentation,
      timestamps: v.timestamps || {},
    };
  },

  /**
   * Advance visit fulfillment status (accepted -> en_route -> arrived -> in_progress -> completed)
   */
  async updateVisitStatus(
    visitId: string,
    status: FieldVisitStatus,
    options?: { notes?: string; location?: string },
    baseUrl?: string
  ): Promise<FieldVisit> {
    const res = await apiRequest<any>(`/visits/${encodeURIComponent(visitId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        notes: options?.notes,
        location: options?.location,
      }),
    }, baseUrl);

    const v = res.data;
    return {
      id: v.id || v._id,
      visitNumber: v.visitNumber,
      visitType: v.visitType,
      status: v.status,
      providerId: v.providerId,
      providerName: v.providerName,
      providerRole: v.providerRole,
      providerPhone: v.providerPhone,
      patientId: v.patientId,
      patientDetails: {
        fullName: v.patientDetails?.fullName || 'Assigned Patient',
        phone: v.patientDetails?.phone || '',
        address: v.patientDetails?.address || '',
        city: v.patientDetails?.city,
        pincode: v.patientDetails?.pincode,
        cluster: v.patientDetails?.cluster,
        instructions: v.patientDetails?.instructions,
        emergencyContact: v.patientDetails?.emergencyContact,
      },
      scheduledDate: v.scheduledDate,
      timeSlot: v.timeSlot,
      clinicalDocumentation: v.clinicalDocumentation,
      timestamps: v.timestamps || {},
    };
  },

  /**
   * Record structured clinical documentation, vitals, procedures, and submit daily report
   */
  async recordClinicalDocumentation(
    visitId: string,
    docData: ClinicalDocInput,
    baseUrl?: string
  ): Promise<FieldVisit> {
    const res = await apiRequest<any>(`/visits/${encodeURIComponent(visitId)}/documentation`, {
      method: 'POST',
      body: JSON.stringify(docData),
    }, baseUrl);

    const v = res.data;
    return {
      id: v.id || v._id,
      visitNumber: v.visitNumber,
      visitType: v.visitType,
      status: v.status,
      providerId: v.providerId,
      providerName: v.providerName,
      providerRole: v.providerRole,
      providerPhone: v.providerPhone,
      patientId: v.patientId,
      patientDetails: {
        fullName: v.patientDetails?.fullName || 'Assigned Patient',
        phone: v.patientDetails?.phone || '',
        address: v.patientDetails?.address || '',
        city: v.patientDetails?.city,
        pincode: v.patientDetails?.pincode,
        cluster: v.patientDetails?.cluster,
        instructions: v.patientDetails?.instructions,
        emergencyContact: v.patientDetails?.emergencyContact,
      },
      scheduledDate: v.scheduledDate,
      timeSlot: v.timeSlot,
      clinicalDocumentation: v.clinicalDocumentation,
      timestamps: v.timestamps || {},
    };
  },

  /**
   * Fetch unique patients actively assigned to the authenticated caregiver / clinician
   */
  async getAssignedPatients(
    includeInactive = false,
    baseUrl?: string
  ): Promise<AssignedPatient[]> {
    const qs = includeInactive ? '?includeInactive=true' : '';
    const res = await apiRequest<any>(`/visits/provider/assigned-patients${qs}`, {
      method: 'GET',
    }, baseUrl);

    return (res.data || []).map((p: any) => ({
      patientId: p.patientId,
      fullName: p.fullName,
      phone: p.phone,
      email: p.email,
      address: p.address,
      emergencyContact: p.emergencyContact,
      chronicConditions: p.chronicConditions || [],
      assignmentType: p.assignmentType,
      activeSubscription: p.activeSubscription || null,
      latestVisit: p.latestVisit || null,
      assignedVisitsCount: p.assignedVisitsCount || 0,
    }));
  },

  /**
   * Fetch pending rescheduling requests assigned to the authenticated caregiver
   */
  async getPendingRescheduleRequests(
    status = 'pending',
    baseUrl?: string
  ): Promise<VisitRescheduleRequest[]> {
    const res = await apiRequest<any>(
      `/visits/reschedule-requests?status=${encodeURIComponent(status)}`,
      {
        method: 'GET',
      },
      baseUrl
    );
    return res.data || [];
  },

  /**
   * Approve a visit rescheduling request
   */
  async approveRescheduleRequest(
    requestId: string,
    baseUrl?: string
  ): Promise<{ request: VisitRescheduleRequest; visit: FieldVisit }> {
    const res = await apiRequest<any>(
      `/visits/reschedule-requests/${requestId}/approve`,
      {
        method: 'POST',
      },
      baseUrl
    );
    return res.data;
  },

  /**
   * Reject a visit rescheduling request with a mandatory reason
   */
  async rejectRescheduleRequest(
    requestId: string,
    rejectionReason: string,
    baseUrl?: string
  ): Promise<VisitRescheduleRequest> {
    const res = await apiRequest<any>(
      `/visits/reschedule-requests/${requestId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      },
      baseUrl
    );
    return res.data;
  },

  /**
   * Log out and wipe secure token storage
   */
  async logout(): Promise<void> {
    await authStorage.clearSession();
  },
};
