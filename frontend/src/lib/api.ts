/**
 * VivoQuest Frontend API Client
 * Centralized HTTP service for connecting to the VivoQuest Express Marketplace API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
  };
}

export class ApiClientError extends Error {
  code: string;
  details?: any;
  status: number;

  constructor(message: string, status = 400, code = 'API_ERROR', details?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('vivo_token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error?.message || `Request failed with status ${response.status}`;
      const errorCode = data?.error?.code || 'HTTP_ERROR';
      const errorDetails = data?.error?.details || null;
      throw new ApiClientError(errorMessage, response.status, errorCode, errorDetails);
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    // Network errors (e.g. backend server not running)
    throw new ApiClientError(
      err.message === 'Failed to fetch' 
        ? `Unable to connect to VivoQuest API at ${API_BASE_URL}. Ensure the backend server is running.`
        : err.message,
      0,
      'NETWORK_ERROR'
    );
  }
}

// -----------------------------------------------------------------------------
// Authentication APIs
// -----------------------------------------------------------------------------
export const authApi = {
  async register(params: {
    fullName: string;
    phone: string;
    email?: string;
    password?: string;
    role?: string;
    city?: string;
    pincode?: string;
    consentAccepted: boolean;
  }) {
    const res = await request<{
      success: boolean;
      data: {
        token: string;
        user: {
          id: string;
          fullName: string;
          phone: string;
          email?: string;
          role: string;
        };
      };
    }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (res.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('vivo_token', res.data.token);
      localStorage.setItem('vivo_user', JSON.stringify(res.data.user));
      document.cookie = `vivo_token=${res.data.token}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `vivo_role=${res.data.user.role}; path=/; max-age=604800; SameSite=Lax`;
    }

    return res.data;
  },

  async login(params: {
    identifier: string;
    password?: string;
    otp?: string;
    role?: string;
  }) {
    const res = await request<{
      success: boolean;
      data: {
        token: string;
        authMode: string;
        user: {
          id: string;
          fullName: string;
          phone: string;
          email?: string;
          role: string;
        };
      };
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (res.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('vivo_token', res.data.token);
      localStorage.setItem('vivo_user', JSON.stringify(res.data.user));
      document.cookie = `vivo_token=${res.data.token}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `vivo_role=${res.data.user.role}; path=/; max-age=604800; SameSite=Lax`;
    }

    return res.data;
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vivo_token');
      localStorage.removeItem('vivo_user');
      document.cookie = 'vivo_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'vivo_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  },

  getStoredUser() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vivo_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vivo_token');
    }
    return null;
  },
};

// -----------------------------------------------------------------------------
// Healthcare Services APIs
// -----------------------------------------------------------------------------
export const servicesApi = {
  async getServices(params?: { category?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/services${queryString}`);

    return res.data;
  },

  async getServiceByCode(code: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/services/${code}`);
    return res.data;
  },
};

// -----------------------------------------------------------------------------
// Bookings APIs
// -----------------------------------------------------------------------------
export const bookingsApi = {
  async createBooking(params: {
    patientName: string;
    phone: string;
    serviceId: string;
    city: string;
    pincode: string;
    address?: string;
    preferredDate?: string;
    clinicalNotes?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: {
        bookingNumber: string;
        id: string;
        patientName: string;
        phone: string;
        service: {
          id: string;
          title: string;
          badge: string;
          turnaround: string;
        };
        status: string;
        serviceLocation: any;
        preferredDate?: string;
        pricing: any;
        createdAt: string;
      };
    }>('/api/v1/bookings', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return res.data;
  },

  async getMyBookings() {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>('/api/v1/bookings/me');
    return res.data;
  },
};

// -----------------------------------------------------------------------------
// Uploads & Storage APIs
// -----------------------------------------------------------------------------
export const uploadsApi = {
  async getPresignedUrl(params: {
    filename: string;
    mimeType: string;
    fileSizeBytes: number;
    fileCategory: 'profile_picture' | 'professional_profile_image' | 'equipment_product_image' | 'credential_document' | 'prescription' | 'clinical_report';
  }) {
    const res = await request<{
      success: boolean;
      data: {
        fileId: string;
        uploadUrl: string;
        method: 'PUT';
        s3Key: string;
        expiresInSeconds: number;
        accessTier: string;
        headers: Record<string, string>;
        isMockAdapter: boolean;
        notice?: string;
      };
    }>('/api/v1/uploads/presigned', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return res.data;
  },

  async confirmUpload(fileId: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>('/api/v1/uploads/confirm', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });

    return res.data;
  },
};

// -----------------------------------------------------------------------------
// AI Care Coordination & Dispatch APIs
// -----------------------------------------------------------------------------
export const aiApi = {
  async previewBundle(params: { bookingIds: string[]; maxMinutes?: number }) {
    const res = await request<{
      success: boolean;
      data: {
        is_bundling_recommended: boolean;
        suggested_bundles: any[];
        unbundled_tasks: any[];
        total_efficiency_gain_minutes: number;
        disclaimer: string;
        source?: string;
      };
    }>('/api/v1/ai/bundles/preview', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return res.data;
  },

  async getCandidates(params: { bookingId: string }) {
    const res = await request<{
      success: boolean;
      data: {
        target_identifier: string;
        total_evaluated: number;
        total_eligible: number;
        ranked_providers: any[];
        requires_human_approval: boolean;
        disclaimer: string;
        source?: string;
      };
    }>('/api/v1/ai/matching/candidates', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return res.data;
  },

  async getDispatchReview(bookingId: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/ai/dispatch/review/${bookingId}`);

    return res.data;
  },

  async confirmDispatch(params: {
    bookingId: string;
    professionalUserId: string;
    notes?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/ai/dispatch/confirm', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return res.data;
  },
};

