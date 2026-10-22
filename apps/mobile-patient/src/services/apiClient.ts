import { authStorage } from './authStorage';
import {
  UserSession,
  PatientSubscription,
  DailyCareReport,
  SubscriptionPlan,
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

export const patientApi = {
  /**
   * Authenticate patient via phone + password/OTP
   */
  async login(
    identifier: string,
    password?: string,
    otp?: string,
    baseUrl?: string
  ): Promise<{ token: string; user: UserSession }> {
    const payload: Record<string, any> = {
      identifier: identifier.trim(),
      role: 'patient',
    };
    if (password) payload.password = password;
    if (otp) payload.otp = otp;

    const res = await apiRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, baseUrl);

    const token = res.data.token;
    const user: UserSession = {
      id: res.data.user.id || res.data.user._id,
      fullName: res.data.user.fullName,
      phone: res.data.user.phone,
      email: res.data.user.email,
      role: res.data.user.role,
      status: res.data.user.status,
    };

    // Save token and user into secure storage
    await authStorage.setToken(token);
    await authStorage.setUser(user);

    return { token, user };
  },

  /**
   * Fetch authenticated patient subscriptions and remaining visit balance
   */
  async getSubscriptions(baseUrl?: string): Promise<PatientSubscription[]> {
    const res = await apiRequest<any>('/patients/me/subscriptions', {
      method: 'GET',
    }, baseUrl);

    return (res.data || []).map((s: any) => ({
      id: s.id || s._id,
      subscriptionNumber: s.subscriptionNumber,
      planId: s.planId,
      planTitle: s.planTitle,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      assignedCaregiver: s.assignedCaregiver
        ? {
            id: s.assignedCaregiver.id,
            name: s.assignedCaregiver.name,
            phone: s.assignedCaregiver.phone,
          }
        : null,
      totalVisitsIncluded: s.totalVisitsIncluded || 0,
      visitsCompleted: s.visitsCompleted || 0,
      visitsRemaining: s.visitsRemaining || 0,
      pricing: {
        customerPrice: s.pricing?.customerPrice || 0,
        paymentStatus: s.pricing?.paymentStatus || 'pending',
        paymentMethod: s.pricing?.paymentMethod,
      },
      emergencyContact: s.emergencyContact,
      carePlanNotes: s.carePlanNotes,
      createdAt: s.createdAt,
    }));
  },

  /**
   * Fetch verified bedside clinical reports and health updates for the authenticated patient
   */
  async getCareReports(baseUrl?: string): Promise<DailyCareReport[]> {
    const res = await apiRequest<any>('/patients/me/care-reports', {
      method: 'GET',
    }, baseUrl);

    return (res.data || []).map((r: any) => ({
      id: r.id || r._id,
      sourceType: r.sourceType,
      date: r.date,
      providerOrSubmitterName: r.providerOrSubmitterName,
      providerRoleOrRelation: r.providerRoleOrRelation,
      status: r.status,
      vitals: r.vitals,
      clinicalNotes: r.clinicalNotes,
      proceduresDone: r.proceduresDone || [],
      medicationsAdministered: r.medicationsAdministered || [],
      recommendations: r.recommendations,
      comfortLevel: r.comfortLevel,
    }));
  },

  /**
   * Fetch active caregiver subscription packages catalog
   */
  async getCaregiverPlans(category?: string, baseUrl?: string): Promise<SubscriptionPlan[]> {
    const endpoint = category && category !== 'all'
      ? `/patients/caregiver-plans?category=${encodeURIComponent(category)}`
      : '/patients/caregiver-plans';

    const res = await apiRequest<any>(endpoint, {
      method: 'GET',
    }, baseUrl);

    return (res.data || []).map((p: any) => ({
      id: p.id || p._id,
      planCode: p.planCode,
      title: p.title,
      planType: p.planType,
      category: p.category,
      durationDays: p.durationDays,
      totalVisitsIncluded: p.totalVisitsIncluded,
      hoursPerVisit: p.hoursPerVisit,
      customerPrice: p.customerPrice,
      description: p.description,
      features: p.features || [],
      isActive: p.isActive,
      isPopular: Boolean(p.isPopular),
    }));
  },

  /**
   * Fetch authorized patient profile details
   */
  async getPatientDetails(patientId: string, baseUrl?: string): Promise<any> {
    const res = await apiRequest<any>(`/patients/${encodeURIComponent(patientId)}`, {
      method: 'GET',
    }, baseUrl);

    return res.data;
  },

  /**
   * Log out and wipe secure token storage
   */
  async logout(): Promise<void> {
    await authStorage.clearSession();
  },
};
