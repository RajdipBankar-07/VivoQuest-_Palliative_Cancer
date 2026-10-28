import { authStorage } from './authStorage';
import {
  UserSession,
  PatientSubscription,
  DailyCareReport,
  SubscriptionPlan,
  AssignedCaregiverDetails,
  PatientVisit,
  PatientVisitsSchedule,
  VisitRescheduleRequest,
  MedicalProductMobile,
  CartValidationResultMobile,
  ProductOrderMobile,
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

/**
 * Resolves a product or asset image path (e.g. /assets/images/products/grab-bar.jpg)
 * into a full, reachable HTTP URL using the active mobile API server host.
 */
export const resolveProductImageUrl = (url?: string | null): string | null => {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const apiBase = getMobileApiBaseUrl();
  const origin = apiBase.replace(/\/api\/v1\/?$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${cleanPath}`;
};

/**
 * Normalizes an order object from the API to guarantee stable, unique string IDs
 * and well-formed sub-documents, preventing missing-key warnings and undefined access.
 */
export const normalizeOrder = (raw: any): ProductOrderMobile => {
  if (!raw) return raw;
  const id = String(raw.id || raw._id || raw.orderNumber || '');
  return {
    ...raw,
    id,
    _id: id,
    items: Array.isArray(raw.items)
      ? raw.items.map((it: any, idx: number) => ({
          ...it,
          id: String(it.id || it._id || it.productId || `item-${idx}`),
          productId: String(it.productId || it.id || it._id || `prod-${idx}`),
          title: it.title || 'Medical Equipment Item',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
        }))
      : [],
    trackingUpdates: Array.isArray(raw.trackingUpdates)
      ? raw.trackingUpdates.map((t: any, idx: number) => ({
          ...t,
          id: String(t.id || t._id || `track-${t.status}-${t.timestamp || idx}`),
        }))
      : [],
    deliveryEstimateHistory: Array.isArray(raw.deliveryEstimateHistory)
      ? raw.deliveryEstimateHistory.map((h: any, idx: number) => ({
          ...h,
          id: String(h.id || h._id || `hist-${h.updatedAt || idx}`),
        }))
      : [],
  };
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

export const normalizeMobilePhone = (input: string): string => {
  if (!input) return '';
  let digits = input.trim().replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
};

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
    const cleanIdentifier = identifier.includes('@')
      ? identifier.trim().toLowerCase()
      : normalizeMobilePhone(identifier);

    const payload: Record<string, any> = {
      identifier: cleanIdentifier,
      role: 'patient',
    };
    if (password) payload.password = password;
    if (otp) payload.otp = otp;

    const res = await apiRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, baseUrl);

    const token = res.data.token;
    const rawUser = res.data.user;

    // Strict role validation: Ensure user is authorized for patient portal
    const allowedRoles = ['patient', 'caregiver', 'admin', 'super_admin'];
    if (!allowedRoles.includes(rawUser.role)) {
      throw new ApiError(
        'Access denied. Your account is not authorized for the Patient App. Please sign in with a registered patient account.',
        403
      );
    }

    const user: UserSession = {
      id: rawUser.id || rawUser._id,
      fullName: rawUser.fullName,
      phone: rawUser.phone,
      email: rawUser.email,
      role: rawUser.role,
      status: rawUser.status,
    };

    // Save token and user into secure storage
    await authStorage.setToken(token);
    await authStorage.setUser(user);

    return { token, user };
  },

  /**
   * Register a new patient account with DPDP Act consent
   */
  async register(
    data: {
      fullName: string;
      phone: string;
      password?: string;
      email?: string;
      city?: string;
      pincode?: string;
      consentAccepted: boolean;
    },
    baseUrl?: string
  ): Promise<{ token: string; user: UserSession }> {
    const cleanPhone = normalizeMobilePhone(data.phone);

    const payload = {
      fullName: data.fullName.trim(),
      phone: cleanPhone,
      email: data.email?.trim() || undefined,
      password: data.password,
      role: 'patient',
      city: data.city?.trim() || 'Pune',
      pincode: data.pincode?.trim() || '411001',
      consentAccepted: data.consentAccepted,
    };

    const res = await apiRequest<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, baseUrl);

    const token = res.data.token;
    const rawUser = res.data.user;
    const user: UserSession = {
      id: rawUser.id || rawUser._id,
      fullName: rawUser.fullName,
      phone: rawUser.phone,
      email: rawUser.email,
      role: rawUser.role,
      status: rawUser.status,
    };

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
      planCode: s.planCode,
      planType: s.planType,
      category: s.category,
      durationDays: s.durationDays,
      hoursPerVisit: s.hoursPerVisit,
      features: s.features || [],
      planDescription: s.planDescription,
      plan: s.plan,
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
   * Hide care report from patient's personal dashboard (clinical & audit records preserved)
   */
  async deleteCareReport(reportId: string, reason?: string, baseUrl?: string): Promise<{ success: boolean; message: string }> {
    const res = await apiRequest<any>(
      `/patients/me/care-reports/${encodeURIComponent(reportId)}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      },
      baseUrl
    );
    return res;
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
   * Activate care plan subscription in explicit TEST MODE for authenticated patient
   */
  async activateSubscription(
    planId: string,
    options?: {
      carePlanNotes?: string;
      emergencyContact?: { name: string; phone: string; relation: string };
      idempotencyKey?: string;
    },
    baseUrl?: string
  ): Promise<PatientSubscription> {
    const res = await apiRequest<any>(
      '/patients/me/subscriptions/activate',
      {
        method: 'POST',
        body: JSON.stringify({
          planId,
          carePlanNotes: options?.carePlanNotes,
          emergencyContact: options?.emergencyContact,
          idempotencyKey: options?.idempotencyKey,
        }),
      },
      baseUrl
    );

    const s = res.data;
    return {
      id: s.id || s._id,
      subscriptionNumber: s.subscriptionNumber,
      planId: s.planId,
      planTitle: s.planTitle,
      planCode: s.planCode,
      planType: s.planType,
      category: s.category,
      durationDays: s.durationDays,
      hoursPerVisit: s.hoursPerVisit,
      features: s.features || [],
      planDescription: s.planDescription,
      plan: s.plan,
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
        paymentStatus: s.pricing?.paymentStatus || 'test_mode',
        paymentMethod: s.pricing?.paymentMethod || 'test_mode',
      },
      emergencyContact: s.emergencyContact,
      carePlanNotes: s.carePlanNotes,
      createdAt: s.createdAt,
    };
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
   * Submit daily self-reported health update and vitals
   */
  async submitHealthUpdate(
    data: {
      submitterName: string;
      relationship: 'patient' | 'family_member' | 'caregiver' | 'primary_caregiver';
      symptoms?: string[];
      notes?: string;
      vitals?: {
        bloodPressure?: string;
        pulse?: number;
        temperature?: number;
        spO2?: number;
        glucose?: number;
        weight?: number;
        painScale?: number;
      };
    },
    baseUrl?: string
  ): Promise<any> {
    const res = await apiRequest<any>('/patients/health-updates', {
      method: 'POST',
      body: JSON.stringify(data),
    }, baseUrl);
    return res.data;
  },

  /**
   * Fetch currently assigned caregiver details for the authenticated patient
   */
  async getAssignedCaregiver(baseUrl?: string): Promise<AssignedCaregiverDetails | null> {
    const res = await apiRequest<any>('/patients/me/caregiver', {
      method: 'GET',
    }, baseUrl);
    return res.data?.assignedCaregiver || null;
  },

  /**
   * Fetch upcoming and past visit schedule for the authenticated patient
   */
  async getVisits(baseUrl?: string): Promise<PatientVisitsSchedule> {
    const res = await apiRequest<any>('/patients/me/visits', {
      method: 'GET',
    }, baseUrl);
    return {
      upcoming: res.data?.upcoming || [],
      past: res.data?.past || [],
      upcomingCount: res.data?.upcomingCount || 0,
      pastCount: res.data?.pastCount || 0,
      totalCount: res.data?.totalCount || 0,
    };
  },

  /**
   * Hide a completed or past visit from patient's personal visit history
   */
  async hideCompletedVisit(
    visitId: string,
    reason?: string,
    baseUrl?: string
  ): Promise<{ success: boolean; message: string; visitId: string }> {
    const res = await apiRequest<any>(
      `/patients/me/visits/${encodeURIComponent(visitId)}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      },
      baseUrl
    );
    return res;
  },

  /**
   * Submit a visit rescheduling request for an upcoming visit
   */
  async requestVisitReschedule(
    visitId: string,
    requestedDate: string,
    requestedTimeSlot: string,
    reason: string,
    baseUrl?: string
  ): Promise<VisitRescheduleRequest> {
    const res = await apiRequest<any>(
      `/patients/me/visits/${visitId}/reschedule`,
      {
        method: 'POST',
        body: JSON.stringify({
          requestedDate,
          requestedTimeSlot,
          reason,
        }),
      },
      baseUrl
    );
    return res.data;
  },

  /**
   * Cancel an eligible pending rescheduling request
   */
  async cancelRescheduleRequest(
    requestId: string,
    baseUrl?: string
  ): Promise<VisitRescheduleRequest> {
    const res = await apiRequest<any>(
      `/patients/me/reschedule-requests/${requestId}/cancel`,
      {
        method: 'POST',
      },
      baseUrl
    );
    return res.data;
  },

  /**
   * Fetch all rescheduling requests for the authenticated patient
   */
  async getRescheduleRequests(baseUrl?: string): Promise<VisitRescheduleRequest[]> {
    const res = await apiRequest<any>(
      '/patients/me/reschedule-requests',
      {
        method: 'GET',
      },
      baseUrl
    );
    return res.data || [];
  },

  /**
   * Hide reschedule request entry from patient view (visit schedule remains unchanged)
   */
  async hideRescheduleRequest(
    requestId: string,
    reason?: string,
    baseUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiRequest<any>(
      `/patients/me/reschedule-requests/${encodeURIComponent(requestId)}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      },
      baseUrl
    );
    return res;
  },

  /**
   * Fetch medical equipment products catalog
   */
  async getMedicalProducts(
    params?: {
      category?: string;
      search?: string;
      inStockOnly?: boolean;
      sourcingType?: string;
      installationOnly?: boolean;
      sort?: string;
      page?: number;
      limit?: number;
    },
    baseUrl?: string
  ): Promise<{ products: MedicalProductMobile[]; count: number }> {
    const q = new URLSearchParams();
    if (params?.category && params.category !== 'all') q.set('category', params.category);
    if (params?.search && params.search.trim()) q.set('search', params.search.trim());
    if (params?.inStockOnly) q.set('inStockOnly', 'true');
    if (params?.sourcingType && params.sourcingType !== 'all') q.set('sourcingType', params.sourcingType);
    if (params?.installationOnly) q.set('installationOnly', 'true');
    if (params?.sort) q.set('sort', params.sort);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));

    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest<any>(`/products${qs}`, { method: 'GET' }, baseUrl);

    const products = (res.data || []).map((p: any) => ({
      id: p.id || p._id,
      sku: p.sku,
      title: p.title,
      category: p.category,
      badge: p.badge,
      description: p.description,
      price: p.price,
      regularPrice: p.regularPrice || p.price,
      sellingPrice: p.sellingPrice || p.price,
      discountPercentage: p.discountPercentage || 0,
      stockQuantity: p.stockQuantity ?? 10,
      sourcingType: p.sourcingType || 'own_stock',
      supplierName: p.supplierName,
      images: (p.images || []).map((img: string) => resolveProductImageUrl(img) || img),
      imageGallery: (p.imageGallery || []).map((g: any) => ({
        ...g,
        url: resolveProductImageUrl(g.url) || g.url,
      })),
      specifications: p.specifications || {},
      installationEligible: Boolean(p.installationEligible),
      installationServiceCharge: p.installationServiceCharge || 0,
      installationDescription: p.installationDescription,
      estimatedDeliveryDays: p.estimatedDeliveryDays || '2-4 business days',
      averageRating: p.averageRating,
      reviewCount: p.reviewCount || 0,
      isActive: p.isActive !== false,
    }));

    return { products, count: res.count || products.length };
  },

  /**
   * Fetch single medical product by ID or SKU
   */
  async getMedicalProductById(productId: string, baseUrl?: string): Promise<MedicalProductMobile> {
    const res = await apiRequest<any>(`/products/${encodeURIComponent(productId)}`, { method: 'GET' }, baseUrl);
    const p = res.data;
    return {
      id: p.id || p._id,
      sku: p.sku,
      title: p.title,
      category: p.category,
      badge: p.badge,
      description: p.description,
      price: p.price,
      regularPrice: p.regularPrice || p.price,
      sellingPrice: p.sellingPrice || p.price,
      discountPercentage: p.discountPercentage || 0,
      stockQuantity: p.stockQuantity ?? 10,
      sourcingType: p.sourcingType || 'own_stock',
      supplierName: p.supplierName,
      images: (p.images || []).map((img: string) => resolveProductImageUrl(img) || img),
      imageGallery: (p.imageGallery || []).map((g: any) => ({
        ...g,
        url: resolveProductImageUrl(g.url) || g.url,
      })),
      specifications: p.specifications || {},
      installationEligible: Boolean(p.installationEligible),
      installationServiceCharge: p.installationServiceCharge || 0,
      installationDescription: p.installationDescription,
      estimatedDeliveryDays: p.estimatedDeliveryDays || '2-4 business days',
      averageRating: p.averageRating,
      reviewCount: p.reviewCount || 0,
      isActive: p.isActive !== false,
    };
  },

  /**
   * Server-side cart price and stock revalidation
   */
  async validateCart(
    items: Array<{ productId: string; quantity: number; installationSelected?: boolean }>,
    baseUrl?: string
  ): Promise<CartValidationResultMobile> {
    const res = await apiRequest<any>(
      '/products/cart/validate',
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      },
      baseUrl
    );
    return res.data;
  },

  /**
   * Fetch authenticated patient's persistent shopping cart
   */
  async getCart(baseUrl?: string): Promise<CartValidationResultMobile> {
    const res = await apiRequest<any>('/products/cart', { method: 'GET' }, baseUrl);
    return res.data;
  },

  /**
   * Save patient shopping cart to backend
   */
  async saveCart(
    items: Array<{ productId: string; quantity: number; installationSelected?: boolean }>,
    baseUrl?: string
  ): Promise<CartValidationResultMobile> {
    const res = await apiRequest<any>(
      '/products/cart',
      {
        method: 'PUT',
        body: JSON.stringify({ items }),
      },
      baseUrl
    );
    return res.data;
  },

  /**
   * Clear persistent shopping cart
   */
  async clearCart(baseUrl?: string): Promise<{ success: boolean }> {
    const res = await apiRequest<any>('/products/cart', { method: 'DELETE' }, baseUrl);
    return res;
  },

  /**
   * Create medical equipment order with stock reservation
   */
  async createOrder(
    data: {
      items: Array<{ productId: string; quantity: number; isRental?: boolean; installationSelected?: boolean }>;
      deliveryAddress: { street: string; city: string; state: string; pincode: string; contactPhone?: string };
      paymentMethod?: string;
      specialInstructions?: string;
      idempotencyKey?: string;
    },
    baseUrl?: string
  ): Promise<ProductOrderMobile> {
    const res = await apiRequest<any>(
      '/products/orders',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      baseUrl
    );
    return normalizeOrder(res.data);
  },

  /**
   * Fetch patient medical equipment orders
   */
  async getOrders(status?: string, baseUrl?: string): Promise<ProductOrderMobile[]> {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await apiRequest<any>(`/products/orders${qs}`, { method: 'GET' }, baseUrl);
    const rawList = res.data || [];
    return Array.isArray(rawList) ? rawList.map(normalizeOrder) : [];
  },

  /**
   * Fetch single order details with tracking updates and delivery audit history
   */
  async getOrderById(orderIdOrNumber: string, baseUrl?: string): Promise<ProductOrderMobile> {
    const res = await apiRequest<any>(
      `/products/orders/${encodeURIComponent(orderIdOrNumber)}`,
      { method: 'GET' },
      baseUrl
    );
    return normalizeOrder(res.data);
  },

  /**
   * Get payment gateway configuration (sandbox mode)
   */
  async getPaymentConfig(baseUrl?: string): Promise<{
    isConfigured: boolean;
    keyId: string;
    mode: string;
    missingConfigNotice: string | null;
    allowedPaymentMethods: string[];
  }> {
    const res = await apiRequest<any>('/products/payments/config', { method: 'GET' }, baseUrl);
    return res.data;
  },

  /**
   * Create Razorpay payment intent
   */
  async createPaymentIntent(orderId: string, baseUrl?: string): Promise<any> {
    const res = await apiRequest<any>(
      '/products/payments/create-intent',
      {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      },
      baseUrl
    );
    return res.data;
  },

  /**
   * Verify payment signature and confirm order
   */
  async verifyPayment(
    data: {
      orderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
    baseUrl?: string
  ): Promise<ProductOrderMobile> {
    const res = await apiRequest<any>(
      '/products/payments/verify',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      baseUrl
    );
    return res.data;
  },

  /**
   * Cancel patient order
   */
  async cancelOrder(
    orderIdOrNumber: string,
    reason: string,
    baseUrl?: string
  ): Promise<ProductOrderMobile> {
    const res = await apiRequest<any>(
      `/products/orders/${encodeURIComponent(orderIdOrNumber)}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
      baseUrl
    );
    return res.data;
  },

  /**
   * Schedule or update clinician setup visit for equipment
   */
  async scheduleClinicianSetup(
    orderIdOrNumber: string,
    data: {
      setupDate: string;
      setupSlot: string;
      clinicianSpecialistRole?: string;
      notes?: string;
    },
    baseUrl?: string
  ): Promise<ProductOrderMobile> {
    const res = await apiRequest<any>(
      `/products/orders/${encodeURIComponent(orderIdOrNumber)}/setup-schedule`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
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
