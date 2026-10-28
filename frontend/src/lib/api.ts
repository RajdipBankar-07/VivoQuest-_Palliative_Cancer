/**
 * VivoQuest Frontend API Client
 * Centralized HTTP service for connecting to the VivoQuest Express Marketplace API
 */

/**
 * Centralized API Base URL Resolver
 * 
 * Logic:
 * 1. Checks NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_API_URL.
 * 2. If explicitly configured with a production domain (non-localhost/loopback), uses it directly.
 * 3. In browser environments, dynamically derives the host from window.location.hostname on port 4000.
 *    - http://localhost:3000 -> http://localhost:4000
 *    - http://10.151.164.41:3000 -> http://10.151.164.41:4000
 *    - Mobile device on LAN -> http://10.151.164.41:4000 (never uses device's own localhost)
 * 4. For server-side rendering (SSR), targets local backend on port 4000.
 */
export const getApiBaseUrl = (): string => {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL;

  if (configured) {
    const trimmed = configured.trim().replace(/\/+$/, '');
    const isLocalhostOrLoopback =
      trimmed.includes('localhost') ||
      trimmed.includes('127.0.0.1') ||
      trimmed.includes('0.0.0.0');

    // In production deployments, respect the configured public API URL directly
    if (!isLocalhostOrLoopback) {
      return trimmed;
    }
  }

  // Client-side browser: dynamically bind to the current host at port 4000
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:4000`;
  }

  // Configured local override for SSR
  if (configured) {
    return configured.trim().replace(/\/+$/, '');
  }

  // SSR default
  return 'http://127.0.0.1:4000';
};

export const API_BASE_URL = getApiBaseUrl();


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
  const url = `${getApiBaseUrl()}${endpoint}`;
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

      // Handle 401 Unauthorized (Expired Session / Invalid Token)
      // Safely clear invalid auth state so requests do not repeatedly fail with stale credentials.
      // Note: Do NOT treat 403 (Forbidden / Access Denied) as an expired session.
      if (response.status === 401 && endpoint !== '/api/v1/auth/login') {
        authApi.logout();
      }

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
        ? `Unable to connect to VivoQuest API at ${getApiBaseUrl()}. Ensure the backend server is running.`
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
      try {
        window.dispatchEvent(new CustomEvent('vivo_auth_change', { detail: { authenticated: true, user: res.data.user } }));
      } catch {}
    }

    return res.data;
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vivo_token');
      localStorage.removeItem('vivo_user');
      const authCookies = ['vivo_token', 'vivo_role', 'vivo_tier', 'access_token', 'refresh_token'];
      for (const name of authCookies) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
      }
      try {
        window.dispatchEvent(new CustomEvent('vivo_auth_change', { detail: { authenticated: false } }));
      } catch {}
    }
  },

  isTokenExpired(token?: string | null): boolean {
    const t = token !== undefined ? token : this.getToken();
    if (!t) return true;
    try {
      const parts = t.split('.');
      if (parts.length !== 3) return true;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = typeof window !== 'undefined' && window.atob
        ? decodeURIComponent(
            window.atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
        : Buffer.from(base64, 'base64').toString('utf8');
      const payload = JSON.parse(jsonStr);
      if (payload.exp && typeof payload.exp === 'number') {
        // Expired if current time is past exp (in seconds) with 5s clock skew cushion
        return Date.now() >= payload.exp * 1000 - 5000;
      }
      return false;
    } catch {
      return true;
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

  getCurrentUser() {
    return this.getStoredUser();
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

// -----------------------------------------------------------------------------
// Doctors & Healthcare Specialists APIs
// -----------------------------------------------------------------------------
export const doctorsApi = {
  async getDoctors(params?: {
    search?: string;
    specialty?: string;
    professionType?: string;
    consultationMode?: string;
    city?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.specialty && params.specialty !== 'all') query.set('specialty', params.specialty);
    if (params?.professionType && params.professionType !== 'all') query.set('professionType', params.professionType);
    if (params?.consultationMode && params.consultationMode !== 'all') query.set('consultationMode', params.consultationMode);
    if (params?.city && params.city !== 'all') query.set('city', params.city);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/doctors${queryString}`);

    return res.data;
  },

  async getDoctorById(id: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/doctors/${id}`);
    return res.data;
  },

  async getDoctorSlots(id: string, date: string, mode?: string) {
    const query = new URLSearchParams({ date });
    if (mode) query.set('mode', mode);

    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/doctors/${id}/slots?${query.toString()}`);
    return res.data;
  },

  async getDoctorAvailability(id: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/doctors/${id}/availability`);
    return res.data;
  },

  async updateSchedule(scheduleData: any) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/doctors/schedule', {
      method: 'PUT',
      body: JSON.stringify(scheduleData),
    });
    return res.data;
  },

  async getDashboardStats() {
    const res = await request<{
      success: boolean;
      data: any;
    }>('/api/v1/doctors/dashboard/stats');
    return res.data;
  },

  async getDoctorAppointments(params?: { view?: string; date?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.view) query.set('view', params.view);
    if (params?.date) query.set('date', params.date);
    if (params?.status && params.status !== 'all') query.set('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/doctors/dashboard/appointments${queryString}`);
    return res.data;
  },

  async getDoctorProfile() {
    const res = await request<{
      success: boolean;
      data: any;
    }>('/api/v1/doctors/me/profile');
    return res.data;
  },

  async getAssignedPatients(params?: {
    search?: string;
    condition?: string;
    riskLevel?: string;
    followUpStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.condition && params.condition !== 'all') query.set('condition', params.condition);
    if (params?.riskLevel && params.riskLevel !== 'all') query.set('riskLevel', params.riskLevel);
    if (params?.followUpStatus && params.followUpStatus !== 'all') query.set('followUpStatus', params.followUpStatus);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      total: number;
      page: number;
      totalPages: number;
      data: any[];
    }>(`/api/v1/doctors/me/patients${queryString}`);
    return res;
  },

  async getPatientDossier(id: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/doctors/me/patients/${id}`);
    return res.data;
  },

  async addClinicalNote(
    patientId: string,
    noteData: {
      subjective?: string;
      objective?: string;
      assessment: string;
      plan: string;
      followUpInstructions?: string;
      followUpDate?: string;
      appointmentId?: string;
      fieldVisitId?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/doctors/me/patients/${patientId}/clinical-notes`, {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
    return res.data;
  },

  async updateFollowUpPlan(
    patientId: string,
    planData: {
      followUpDate: string;
      careTasks?: string[];
      instructions?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/doctors/me/patients/${patientId}/follow-up`, {
      method: 'POST',
      body: JSON.stringify(planData),
    });
    return res.data;
  },

  async getHealthUpdatesQueue(params?: { status?: string }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/doctors/me/health-updates${queryString}`);
    return res.data;
  },

  async reviewHealthUpdate(
    updateId: string,
    reviewData: {
      reviewStatus: 'reviewed' | 'follow_up_required';
      clinicianNotes: string;
      followUpAction?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/doctors/me/health-updates/${updateId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(reviewData),
    });
    return res.data;
  },
};

// -----------------------------------------------------------------------------
// Patients & Caregivers APIs
// -----------------------------------------------------------------------------
export const patientsApi = {
  async submitHealthUpdate(data: {
    submitterName: string;
    relationship?: string;
    symptoms?: string[];
    notes?: string;
    vitals?: any;
    patientId?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/patients/health-updates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getMyHealthUpdates() {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>('/api/v1/patients/health-updates/me');
    return res.data;
  },

  async getCaregiverPlans(params?: { category?: string; planType?: string }) {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.planType && params.planType !== 'all') query.set('planType', params.planType);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/patients/caregiver-plans${qs}`);
    return res;
  },

  async getMySubscriptions() {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>('/api/v1/patients/me/subscriptions');
    return res;
  },

  async activateSubscription(data: {
    planId: string;
    emergencyContact?: { name: string; phone: string; relation: string };
    carePlanNotes?: string;
    idempotencyKey?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/patients/me/subscriptions/activate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },
};

// -----------------------------------------------------------------------------
// Appointments APIs
// -----------------------------------------------------------------------------
export const appointmentsApi = {
  async bookAppointment(params: {
    doctorId: string;
    appointmentDate: string;
    timeSlot: { startTime: string; endTime: string };
    consultationMode: 'in_clinic' | 'video' | 'home_visit';
    patientName: string;
    phone: string;
    email?: string;
    age?: number;
    gender?: string;
    clinicalReason?: string;
    serviceLocationAddress?: string;
    serviceLocationCity?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/appointments', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.data;
  },

  async getMyAppointments(params?: { filter?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.filter) query.set('filter', params.filter);
    if (params?.status && params.status !== 'all') query.set('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/appointments/me${queryString}`);
    return res.data;
  },

  async getAppointmentById(id: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/appointments/${id}`);
    return res.data;
  },

  async rescheduleAppointment(
    id: string,
    params: {
      newDate: string;
      newTimeSlot: { startTime: string; endTime: string };
      reason?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/appointments/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    return res.data;
  },

  async cancelAppointment(id: string, reason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  async updateStatus(
    id: string,
    params: {
      status: string;
      doctorNotes?: string;
      prescription?: any;
      reason?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    return res.data;
  },
};

// -----------------------------------------------------------------------------
// Hospital Referral & Dashboard APIs (Phase 6)
// -----------------------------------------------------------------------------
export interface ReferralCreatePayload {
  referringStaff: {
    name: string;
    department: string;
    designation: string;
    phone: string;
    email?: string;
  };
  patientDetails: {
    fullName: string;
    phone: string;
    email?: string;
    age: number;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    ipdNumber?: string;
    dischargeDate?: string;
    address: string;
    city?: string;
    pincode: string;
    cluster?: string;
  };
  clinicalSummary: {
    primaryDiagnosis: string;
    secondaryConditions?: string[];
    surgicalHistory?: string;
    dietaryRestrictions?: string;
    mobilityStatus?: 'ambulatory' | 'assisted_walker' | 'wheelchair_bound' | 'bedbound';
    palliativeCareNeeds?: string;
    clinicalNotes?: string;
  };
  requestedServices: Array<{
    serviceCode: string;
    serviceName: string;
    frequency?: 'daily' | 'alternate_days' | 'weekly' | 'as_needed' | 'one_time';
    durationDays?: number;
    preferredStartDate: string;
    preferredTimeSlot?: 'morning' | 'afternoon' | 'evening' | 'any';
    instructions?: string;
  }>;
  equipmentRequired?: Array<{
    itemType: string;
    name: string;
    quantity: number;
    urgency?: 'routine' | 'urgent' | 'immediate';
    deliveryDate?: string;
    durationWeeks?: number;
    specialInstructions?: string;
  }>;
  priority?: 'routine' | 'urgent' | 'immediate';
}

export const hospitalsApi = {
  async getProfile() {
    const res = await request<{
      success: boolean;
      data: any;
    }>('/api/v1/hospitals/profile');
    return res.data;
  },

  async updateProfile(data: any) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/hospitals/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getServicesCatalog() {
    const res = await request<{
      success: boolean;
      data: {
        services: any[];
        equipment: any[];
      };
    }>('/api/v1/hospitals/services-catalog');
    return res.data;
  },

  async getDashboardStats() {
    const res = await request<{
      success: boolean;
      data: {
        overview: {
          totalReferrals: number;
          activeInHomeCare: number;
          pendingTriage: number;
          completedEpisodes: number;
          rejectedCount: number;
          totalEquipmentDeployed: number;
          turnaroundAvgHours: number;
        };
        statusBreakdown: Record<string, number>;
        departmentBreakdown: Record<string, number>;
        serviceTypeBreakdown: Record<string, number>;
      };
    }>('/api/v1/hospitals/dashboard/stats');
    return res.data;
  },

  async createReferral(payload: ReferralCreatePayload) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/hospitals/referrals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getReferrals(params?: {
    status?: string;
    priority?: string;
    search?: string;
    department?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.priority && params.priority !== 'all') query.set('priority', params.priority);
    if (params?.search) query.set('search', params.search);
    if (params?.department && params.department !== 'all') query.set('department', params.department);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      data: any[];
    }>(`/api/v1/hospitals/referrals${queryString}`);
    return res;
  },

  async getReferralById(id: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/hospitals/referrals/${id}`);
    return res.data;
  },

  async updateReferralStatus(
    id: string,
    params: {
      status: string;
      reason?: string;
      notes?: string;
      changedByName?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/hospitals/referrals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    return res.data;
  },

  async evaluateCareBundle(id: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/hospitals/referrals/${id}/evaluate-bundle`, {
      method: 'POST',
    });
    return res.data;
  },

  async assignProviders(
    id: string,
    params: {
      providers: Array<{
        professionalId?: string;
        name: string;
        role: string;
        phone?: string;
        serviceAssigned: string;
      }>;
      reviewNotes?: string;
      approveImmediately?: boolean;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/hospitals/referrals/${id}/assign-providers`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.data;
  },

  async recordVisit(
    id: string,
    params: {
      visitDate: string;
      providerName: string;
      providerRole: string;
      vitals?: {
        bloodPressure?: string;
        pulse?: number;
        spO2?: number;
        temperature?: string;
        respiratoryRate?: number;
      };
      clinicalObservation: string;
      proceduresPerformed?: string[];
      medicationsAdministered?: string[];
      nextFollowUpDate?: string;
      isFinalVisit?: boolean;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/hospitals/referrals/${id}/visits`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.data;
  },

  async getReferralCompletionSummary(id: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/hospitals/referrals/${id}/completion-summary`);
    return res.data;
  },

  async acknowledgeReferralSummary(id: string, params: { acknowledgedByName: string; notes?: string }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/hospitals/referrals/${id}/acknowledge-summary`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res;
  },
};

// -----------------------------------------------------------------------------
// Admin & Operations APIs (Role: admin | super_admin)
// -----------------------------------------------------------------------------
export const adminApi = {
  async getOverview() {
    const res = await request<any>('/api/v1/admin/dashboard/overview');
    if (res.data?.overview) {
      return {
        ...res.data.overview,
        ...res.data,
      };
    }
    return res.data;
  },

  async getUsers(params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.role && params.role !== 'all') query.set('role', params.role);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      data: any[];
    }>(`/api/v1/admin/users${queryString}`);
    return res;
  },

  async updateUserStatus(id: string, status: 'active' | 'suspended' | 'pending_verification') {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res;
  },

  async getUserDetails(id: string) {
    const res = await request<{
      success: boolean;
      data: {
        user: any;
        patientProfile?: any;
        professionalProfile?: any;
        subscriptions?: any[];
        credentials?: any[];
        visitsCount?: number;
        auditHistory?: any[];
      };
    }>(`/api/v1/admin/users/${id}`);
    return res;
  },

  async deleteUser(id: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/users/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  async getCredentials(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      data: any[];
    }>(`/api/v1/admin/credentials${queryString}`);
    return res;
  },

  async reviewCredential(
    id: string,
    params: {
      status: 'pending' | 'approved' | 'rejected' | 'expired';
      notes?: string;
      reason?: string;
      expiryDate?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/credentials/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    return res;
  },

  async getHospitals(params?: { search?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/admin/hospitals${queryString}`);
    return res.data;
  },

  async onboardHospital(data: {
    hospitalName: string;
    registrationNumber: string;
    adminUserId?: string;
    contactPerson: {
      name: string;
      role?: string;
      phone: string;
      email: string;
    };
    address: {
      city: string;
      state: string;
      pincode: string;
      street?: string;
    };
    palliativeCareServicesOffered?: string[];
    bedCapacity?: number;
    emergencyCoordinationAvailable?: boolean;
    accreditationLevel?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/admin/hospitals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async updateHospitalStatus(id: string, isActive: boolean) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/hospitals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return res;
  },

  async getServices() {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>('/api/v1/admin/services');
    return res.data;
  },

  async updateServiceAvailability(id: string, isActive: boolean) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/services/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return res;
  },

  async getExceptions() {
    const res = await request<{
      success: boolean;
      data: {
        unassignedBookings: any[];
        urgentPendingReferrals: any[];
        stalledCases: any[];
        totalExceptions: number;
      };
    }>('/api/v1/admin/exceptions');
    return res.data;
  },

  async getAuditLogs(params?: {
    category?: string;
    severity?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.severity && params.severity !== 'all') query.set('severity', params.severity);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      data: any[];
    }>(`/api/v1/admin/audit-logs${queryString}`);
    return res;
  },

  async getSupportTickets(params?: { status?: string; priority?: string }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.priority && params.priority !== 'all') query.set('priority', params.priority);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/admin/support-tickets${queryString}`);
    return res.data;
  },

  async updateSupportTicket(
    id: string,
    params: {
      status?: string;
      resolutionNotes?: string;
      isEscalated?: boolean;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/support-tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    return res;
  },

  async getOrders(params?: {
    status?: string;
    paymentStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.paymentStatus && params.paymentStatus !== 'all') query.set('paymentStatus', params.paymentStatus);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      data: any[];
    }>(`/api/v1/admin/orders${queryString}`);
    return res;
  },

  async getOrderById(id: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/admin/orders/${id}`);
    return res.data;
  },

  async updateOrderStatus(id: string, params: { status: string; trackingMessage?: string; location?: string }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    return res;
  },

  async assignInstallationSpecialist(
    id: string,
    params: {
      specialistId?: string;
      specialistName: string;
      setupDate?: string;
      setupNotes?: string;
      setupStatus?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/orders/${id}/setup`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    return res;
  },

  async addOrderTrackingEvent(
    id: string,
    params: {
      status: string;
      message: string;
      location?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/orders/${id}/tracking`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res;
  },

  async getAdminFieldVisits(params?: {
    status?: string;
    visitType?: string;
    date?: string;
    providerId?: string;
    hospitalId?: string;
    search?: string;
    dateScope?: 'today' | 'upcoming' | 'past' | 'all';
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.visitType && params.visitType !== 'all') query.set('visitType', params.visitType);
    if (params?.date) query.set('date', params.date);
    if (params?.dateScope && params.dateScope !== 'all') query.set('dateScope', params.dateScope);
    if (params?.providerId) query.set('providerId', params.providerId);
    if (params?.hospitalId) query.set('hospitalId', params.hospitalId);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      data: any[];
    }>(`/api/v1/admin/field-visits${queryString}`);
    return res;
  },

  async deleteAdminFieldVisit(visitId: string, reason?: string) {
    const res = await request<{
      success: boolean;
      message: string;
      visitId: string;
      visitNumber: string;
    }>(`/api/v1/admin/field-visits/${visitId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
    return res;
  },

  async getAdminFieldVisitStats() {
    const res = await request<{
      success: boolean;
      data: {
        totalVisits: number;
        todayCount: number;
        inProgressCount: number;
        completedTodayCount: number;
        completedCount?: number;
        overdueCount: number;
        exceptionsCount: number;
        pendingInstallationsCount: number;
        pendingAcceptanceCount?: number;
        acceptedCount?: number;
        rejectedCount?: number;
        replacementRequiredCount?: number;
        missedCount?: number;
      };
    }>('/api/v1/admin/field-visits/stats');
    return res.data;
  },

  async checkOverdueVisits(dryRun = false) {
    const res = await request<{
      success: boolean;
      message: string;
      data: {
        totalEvaluated: number;
        missedCount: number;
        missedVisits: any[];
      };
    }>('/api/v1/admin/field-visits/check-missed', {
      method: 'POST',
      body: JSON.stringify({ dryRun }),
    });
    return res;
  },

  async reassignFieldVisit(
    id: string,
    params: {
      providerId?: string;
      providerName?: string;
      providerPhone?: string;
      reason?: string;
      notes?: string;
      scheduledDate?: string;
      timeSlot?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/field-visits/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    return res;
  },

  async getEligibleCaregiversForVisit(id: string) {
    const res = await request<{
      success: boolean;
      data: any[];
      count: number;
      message?: string;
    }>(`/api/v1/admin/field-visits/${id}/eligible-caregivers`);
    return res;
  },

  async getSyncLogs(params?: {
    status?: string;
    operationType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.operationType && params.operationType !== 'all') query.set('operationType', params.operationType);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/admin/sync-logs${qs}`);
    return res;
  },

  async getSyncStats() {
    const res = await request<{
      success: boolean;
      data: {
        total: number;
        applied: number;
        conflicts: number;
        failed: number;
      };
    }>('/api/v1/admin/sync-logs/stats');
    return res.data;
  },

  async getNotificationLogs(params?: {
    channel?: string;
    status?: string;
    isRead?: boolean;
    unread?: boolean;
    search?: string;
    dateScope?: 'today' | 'past' | 'all';
    date?: string;
    autoDeletePast?: boolean;
    page?: number;
    limit?: number;
    inbox?: boolean;
    includeCleared?: boolean;
  }) {
    const query = new URLSearchParams();
    if (params?.channel && params.channel !== 'all') query.set('channel', params.channel);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (typeof params?.isRead === 'boolean') query.set('isRead', params.isRead.toString());
    if (params?.unread) query.set('unread', 'true');
    if (params?.search) query.set('search', params.search);
    if (params?.dateScope) query.set('dateScope', params.dateScope);
    if (params?.date) query.set('date', params.date);
    if (params?.autoDeletePast) query.set('autoDeletePast', 'true');
    if (params?.inbox) query.set('inbox', 'true');
    if (params?.includeCleared) query.set('includeCleared', 'true');
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/admin/notifications${qs}`);
    return res;
  },

  async getNotificationDetails(id: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/admin/notifications/${id}`);
    return res.data;
  },

  async getUnreadNotificationsCount() {
    const res = await request<{
      success: boolean;
      data: { unreadCount: number };
    }>('/api/v1/admin/notifications/unread-count');
    return res.data;
  },

  async markAllNotificationsRead() {
    const res = await request<{
      success: boolean;
      message: string;
      data: { markedRead: number };
    }>('/api/v1/admin/notifications/mark-all-read', {
      method: 'PATCH',
    });
    return res;
  },

  async clearPastNotifications() {
    const res = await request<{
      success: boolean;
      message: string;
      data: { deletedCount: number };
    }>('/api/v1/admin/notifications/clear-past', {
      method: 'DELETE',
    });
    return res;
  },

  async clearAllNotifications() {
    const res = await request<{
      success: boolean;
      message: string;
      data: { clearedCount?: number; deletedCount?: number };
    }>('/api/v1/admin/notifications/clear-all', {
      method: 'DELETE',
    });
    return res;
  },

  async deleteNotification(id: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: { id: string };
    }>(`/api/v1/admin/notifications/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  async bulkDeleteNotifications(ids: string[]) {
    const res = await request<{
      success: boolean;
      message: string;
      data: { deletedCount: number };
    }>('/api/v1/admin/notifications/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    return res;
  },

  async deleteNotificationsByDateRange(startDate: string, endDate: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: { deletedCount: number };
    }>(`/api/v1/admin/notifications/date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, {
      method: 'DELETE',
    });
    return res;
  },

  async retryNotification(id: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/notifications/${id}/retry`, {
      method: 'POST',
    });
    return res;
  },

  async getFinancialSummary(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/admin/finances/summary${query ? `?${query}` : ''}`;
    const res = await request<{
      success: boolean;
      data: any;
    }>(endpoint);
    return res.data;
  },

  async getOwnedProductsFinance(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/admin/finances/owned-products${query ? `?${query}` : ''}`;
    const res = await request<{
      success: boolean;
      data: any;
    }>(endpoint);
    return res.data;
  },

  async getMarketplaceFinance(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/admin/finances/marketplace${query ? `?${query}` : ''}`;
    const res = await request<{
      success: boolean;
      data: any;
    }>(endpoint);
    return res.data;
  },

  async getSubscriptionsFinance(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/admin/finances/subscriptions${query ? `?${query}` : ''}`;
    const res = await request<{
      success: boolean;
      data: any;
    }>(endpoint);
    return res.data;
  },

  async downloadFinanceReport(
    format: 'pdf' | 'excel' | 'csv',
    section: 'owned' | 'marketplace' | 'subscriptions' | 'combined',
    params: Record<string, any> = {}
  ) {
    const queryObj: Record<string, string> = { section };
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        queryObj[k] = String(v);
      }
    });
    const query = new URLSearchParams(queryObj).toString();
    const token = authApi.getToken();
    const endpoint = `/api/v1/admin/finances/export/${format}?${query}`;
    const url = `${getApiBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed with HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const ext = format === 'excel' ? 'xlsx' : format;
    const filename = `VivoQuest_Finance_${section.toUpperCase()}_${new Date().toISOString().split('T')[0]}.${ext}`;

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async deleteOrArchiveFinanceTransaction(orderId: string) {
    const res = await request<{
      success: boolean;
      action: 'permanently_deleted' | 'archived';
      message: string;
      data: any;
    }>(`/api/v1/admin/finances/transactions/${orderId}`, {
      method: 'DELETE',
    });
    return res;
  },

  async processOrderRefund(orderId: string, refundAmount: number, reason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/orders/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ refundAmount, reason }),
    });
    return res;
  },

  async getDocumentExpiryAlerts() {
    const res = await request<{
      success: boolean;
      data: {
        alerts: any[];
        summary: {
          totalAlerts: number;
          expiredCount: number;
          expiringSoonCount: number;
        };
      };
    }>('/api/v1/admin/credentials/expiry-alerts');
    return res.data;
  },

  async verifyHospitalPartner(
    id: string,
    params: { status: 'pending' | 'verified' | 'rejected'; notes?: string; licenseExpiryDate?: string }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/hospitals/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res;
  },

  async getHealthcareProfessionals(params?: {
    professionType?: string;
    verificationStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.professionType && params.professionType !== 'all') query.set('professionType', params.professionType);
    if (params?.verificationStatus && params.verificationStatus !== 'all') query.set('verificationStatus', params.verificationStatus);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/v1/admin/professionals${qs}`);
    return res;
  },

  async getHealthcareProfessionalById(id: string) {
    const res = await request<{
      success: boolean;
      data: {
        profile: any;
        credentials: any[];
        completion: any;
        assignments: any;
        auditLogs: any[];
      };
    }>(`/api/v1/admin/professionals/${encodeURIComponent(id)}`);
    return res;
  },

  async reviewProfessionalCredential(
    professionalId: string,
    credentialId: string,
    body: {
      status: 'verified' | 'approved' | 'rejected' | 'pending';
      rejectionReason?: string;
      reviewNotes?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/professionals/${encodeURIComponent(professionalId)}/credentials/${encodeURIComponent(credentialId)}/review`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return res;
  },

  async updateHealthcareProfessional(professionalId: string, body: any) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/professionals/${encodeURIComponent(professionalId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return res;
  },

  async getSuppliers(params?: {
    status?: string;
    sourcingType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.sourcingType && params.sourcingType !== 'all') query.set('sourcingType', params.sourcingType);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/v1/admin/suppliers${qs}`);
    return res;
  },

  async onboardSupplier(data: {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state?: string;
    pincode: string;
    gstin: string;
    pan: string;
    bankDetails: {
      accountName: string;
      accountNumber: string;
      ifsc: string;
      bankName: string;
    };
    sourcingType?: 'own_stock' | 'supplier_direct' | 'hybrid';
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/admin/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async verifySupplier(id: string, params: { status: 'pending_review' | 'verified' | 'rejected'; notes?: string }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/suppliers/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res;
  },

  async getPurchaseOrders(params?: {
    supplierId?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.supplierId) query.set('supplierId', params.supplierId);
    if (params?.paymentStatus && params.paymentStatus !== 'all') query.set('paymentStatus', params.paymentStatus);
    if (params?.deliveryStatus && params.deliveryStatus !== 'all') query.set('deliveryStatus', params.deliveryStatus);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/v1/admin/purchase-orders${qs}`);
    return res;
  },

  async createPurchaseOrder(data: {
    supplierId: string;
    items: Array<{ productId: string; quantity: number; procurementCostPerUnit?: number }>;
    notes?: string;
    paymentDueDate?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/admin/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async updatePurchaseOrderStatus(
    id: string,
    params: {
      deliveryStatus?: 'ordered' | 'partially_received' | 'received' | 'cancelled';
      paymentStatus?: 'pending' | 'partially_settled' | 'settled';
      paidAmount?: number;
      notes?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
    return res;
  },

  async getCaregiverPlans(params?: { category?: string; planType?: string }) {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.planType && params.planType !== 'all') query.set('planType', params.planType);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/admin/caregiver-plans${qs}`);
    return res;
  },

  async createCaregiverPlan(data: {
    title: string;
    planType: 'monthly_subscription' | 'fixed_visit_package' | 'hourly_package';
    category: 'palliative' | 'post_operative' | 'elderly_care' | 'rehabilitation';
    durationDays: number;
    totalVisitsIncluded: number;
    hoursPerVisit: number;
    customerPrice: number;
    caregiverPayout: number;
    description: string;
    features?: string[];
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/admin/caregiver-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async getCaregiverSubscriptions(params?: {
    status?: string;
    patientId?: string;
    caregiverId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.patientId) query.set('patientId', params.patientId);
    if (params?.caregiverId) query.set('caregiverId', params.caregiverId);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      data: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/v1/admin/caregiver-subscriptions${qs}`);
    return res;
  },

  async assignCaregiverToSubscription(id: string, caregiverUserId: string, notes?: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/caregiver-subscriptions/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ caregiverUserId, notes }),
    });
    return res;
  },

  async recordSubscriptionVisit(id: string, notes?: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/caregiver-subscriptions/${id}/record-visit`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    return res;
  },

  async activateCaregiverSubscription(data: {
    patientId: string;
    planId: string;
    assignedCaregiverId?: string;
    carePlanNotes?: string;
    emergencyContact?: { name: string; phone: string; relation: string };
    paymentMethod?: string;
    razorpayPaymentId?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/admin/caregiver-subscriptions/activate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async suspendCaregiverSubscription(id: string, reason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/caregiver-subscriptions/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res;
  },

  async resumeCaregiverSubscription(id: string, reason?: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/caregiver-subscriptions/${id}/resume`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res;
  },

  async cancelCaregiverSubscription(id: string, reason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/caregiver-subscriptions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res;
  },

  async archiveCaregiverSubscription(id: string, reason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/caregiver-subscriptions/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res;
  },

  async deleteCaregiverSubscription(id: string, reason?: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/caregiver-subscriptions/${id}?permanent=true`, {
      method: 'DELETE',
      body: JSON.stringify({ permanent: true, reason }),
    });
    return res;
  },

  async getCaregiverSubscriptionHistory(id: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    const res = await request<{
      success: boolean;
      data: any[];
      subscription?: any;
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/api/v1/admin/caregiver-subscriptions/${id}/history${queryString}`);
    return res;
  },

  async getPatientProfile(id: string) {
    const res = await request<{
      success: boolean;
      data: any;
      message?: string;
    }>(`/api/v1/admin/patients/${id}`);
    return res;
  },

  async scheduleVisit(data: {
    subscriptionId: string;
    scheduledDate: string;
    timeSlot: string;
    visitType: string;
    providerId: string;
    instructions?: string;
    idempotencyKey?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/admin/visits/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async markNotificationRead(id: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return res;
  },

  async getRescheduleRequests(status = 'pending') {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/admin/reschedule-requests?status=${encodeURIComponent(status)}`);
    return res;
  },

  async approveRescheduleRequest(requestId: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/reschedule-requests/${requestId}/approve`, {
      method: 'POST',
    });
    return res;
  },

  async rejectRescheduleRequest(requestId: string, rejectionReason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/reschedule-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
    return res;
  },

  async deleteRescheduleRequest(requestId: string, permanent: boolean = true) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/reschedule-requests/${requestId}?permanent=${permanent}`, {
      method: 'DELETE',
    });
    return res;
  },

  async bulkDeleteRescheduleRequests(ids: string[], permanent: boolean = true) {
    const res = await request<{
      success: boolean;
      message: string;
      data: { deletedCount: number };
    }>('/api/v1/admin/reschedule-requests/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids, permanent }),
    });
    return res;
  },

  async clearResolvedRescheduleRequests(permanent: boolean = true) {
    const res = await request<{
      success: boolean;
      message: string;
      data: { deletedCount: number };
    }>(`/api/v1/admin/reschedule-requests/clear-resolved?permanent=${permanent}`, {
      method: 'DELETE',
    });
    return res;
  },

  async deleteRescheduleRequestsByDateRange(startDate: string, endDate: string, permanent: boolean = true) {
    const res = await request<{
      success: boolean;
      message: string;
      data: { deletedCount: number };
    }>(`/api/v1/admin/reschedule-requests/date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&permanent=${permanent}`, {
      method: 'DELETE',
    });
    return res;
  },

  async hideRescheduleRequest(requestId: string, reason?: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/reschedule-requests/${requestId}`, {
      method: 'DELETE',
      body: reason ? JSON.stringify({ reason }) : undefined,
    });
    return res;
  },

  async getVisitReport(visitId: string, format = 'json') {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/visits/${visitId}/report/download?format=${encodeURIComponent(format)}`);
    return res;
  },

  async adminEditVisitClinicalDoc(visitId: string, docData: {
    clinicalNotes?: string;
    vitals?: any;
    proceduresPerformed?: string[];
    medicationsAdministered?: string[];
    recommendations?: string;
    followUpDate?: string;
    editReason: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/visits/${visitId}/documentation`, {
      method: 'PATCH',
      body: JSON.stringify(docData),
    });
    return res;
  },

  async adminSoftDeleteVisitClinicalDoc(visitId: string, reason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/visits/${visitId}/documentation`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
    return res;
  },
};


// -----------------------------------------------------------------------------
// Super-Admin Governance APIs (Strictly Role: super_admin)
// -----------------------------------------------------------------------------
export const superAdminApi = {
  async getGovernanceOverview() {
    const res = await request<{
      success: boolean;
      data: {
        totalSystemAccounts: number;
        adminsCount: number;
        superAdminsCount: number;
        hospitalsRegistered: number;
        activeAuditAlertsCount: number;
        escalatedCasesCount: number;
        criticalSecurityEvents: any[];
        systemUptimeSec: number;
        nodeVersion: string;
        environment: string;
        generatedAt: string;
      };
    }>('/api/v1/admin/super/governance/overview');
    return res.data;
  },

  async getAdmins() {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>('/api/v1/admin/super/admins');
    return res.data;
  },

  async createAdmin(data: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
    role?: 'admin' | 'super_admin';
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/admin/super/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async updateAdminRole(id: string, role: 'admin' | 'super_admin' | 'hospital_staff' | 'patient' | 'professional') {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/super/admins/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    return res;
  },

  async getSystemHealth() {
    const res = await request<{
      success: boolean;
      data: {
        overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
        checkedAt: string;
        services: {
          database: {
            status: string;
            latencyMs: number;
            connection: string;
          };
          aiFastApiGateway: {
            status: string;
            endpoint: string;
            type: string;
          };
          s3Storage: {
            status: string;
            provider: string;
            bucketConfigured: boolean;
          };
          smsGateway: {
            status: string;
            mode: string;
          };
        };
      };
    }>('/api/v1/admin/super/system-health');
    return res.data;
  },

  async getEscalations() {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>('/api/v1/admin/super/escalations');
    return res.data;
  },

  async listOrders(params?: {
    status?: string;
    paymentStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.paymentStatus && params.paymentStatus !== 'all') query.set('paymentStatus', params.paymentStatus);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/admin/orders${qs}`);
    return res;
  },

  async getOrderDetails(orderId: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/admin/orders/${orderId}`);
    return res.data;
  },

  async updateOrderStatus(orderId: string, payload: { status: string; trackingMessage?: string; location?: string }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res;
  },

  async assignInstallationSpecialist(orderId: string, payload: {
    specialistId?: string;
    specialistName: string;
    setupDate?: string;
    setupNotes?: string;
    setupStatus?: 'pending' | 'scheduled' | 'completed';
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/orders/${orderId}/setup`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res;
  },

  async addOrderTrackingEvent(orderId: string, payload: { status: string; message: string; location?: string }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/orders/${orderId}/tracking`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },

  async getSyncLogs(params?: {
    status?: string;
    operationType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.operationType && params.operationType !== 'all') query.set('operationType', params.operationType);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/admin/sync-logs${qs}`);
    return res;
  },

  async getSyncStats() {
    const res = await request<{
      success: boolean;
      data: {
        total: number;
        applied: number;
        conflicts: number;
        failed: number;
      };
    }>('/api/v1/admin/sync-logs/stats');
    return res.data;
  },

  async markNotificationRead(id: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return res;
  },

  async getRescheduleRequests(status = 'pending') {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>(`/api/v1/admin/reschedule-requests?status=${encodeURIComponent(status)}`);
    return res;
  },

  async approveRescheduleRequest(requestId: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/reschedule-requests/${requestId}/approve`, {
      method: 'POST',
    });
    return res;
  },

  async rejectRescheduleRequest(requestId: string, rejectionReason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/reschedule-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
    return res;
  },

  async getVisitReport(visitId: string, format = 'json') {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/visits/${visitId}/report/download?format=${encodeURIComponent(format)}`);
    return res;
  },

  async adminEditVisitClinicalDoc(visitId: string, docData: {
    clinicalNotes?: string;
    vitals?: any;
    proceduresPerformed?: string[];
    medicationsAdministered?: string[];
    recommendations?: string;
    followUpDate?: string;
    editReason: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/visits/${visitId}/documentation`, {
      method: 'PATCH',
      body: JSON.stringify(docData),
    });
    return res;
  },

  async adminSoftDeleteVisitClinicalDoc(visitId: string, reason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/visits/${visitId}/documentation`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
    return res;
  },
};

// -----------------------------------------------------------------------------
// Medical Products & DME Commerce APIs
// -----------------------------------------------------------------------------
export const productsApi = {
  async getCategories() {
    const res = await request<{
      success: boolean;
      data: Array<{ id: string; label: string }>;
    }>('/api/v1/products/categories');
    return res.data;
  },

  async getProducts(params?: {
    category?: string;
    search?: string;
    rentalOnly?: boolean;
    inStockOnly?: boolean;
    sourcingType?: string;
    installationOnly?: boolean;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.rentalOnly) query.set('rentalOnly', 'true');
    if (params?.inStockOnly) query.set('inStockOnly', 'true');
    if (params?.sourcingType && params.sourcingType !== 'all') query.set('sourcingType', params.sourcingType);
    if (params?.installationOnly) query.set('installationOnly', 'true');
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      data: any[];
    }>(`/api/v1/products${queryString}`);
    return res;
  },

  async getProductById(idOrSku: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/products/${idOrSku}`);
    return res.data;
  },

  async validateCart(items: Array<{ productId: string; quantity: number; isRental?: boolean; rentalDurationMonths?: number }>) {
    const res = await request<{
      success: boolean;
      data: {
        items: any[];
        pricing: { subtotal: number; deliveryFee: number; taxGst: number; totalAmount: number };
        warnings: string[];
        totalItemCount: number;
        hasUnavailableItems: boolean;
      };
    }>('/api/v1/products/cart/validate', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    return res.data;
  },

  async getCart() {
    const res = await request<{
      success: boolean;
      data: {
        items: any[];
        pricing: { subtotal: number; deliveryFee: number; taxGst: number; totalAmount: number };
        warnings: string[];
        totalItemCount: number;
        hasUnavailableItems: boolean;
      };
    }>('/api/v1/products/cart');
    return res.data;
  },

  async saveCart(items: Array<{ productId: string; quantity: number; isRental?: boolean; rentalDurationMonths?: number }>) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/products/cart', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
    return res.data;
  },

  async clearCart() {
    const res = await request<{
      success: boolean;
      message: string;
    }>('/api/v1/products/cart', {
      method: 'DELETE',
    });
    return res;
  },

  async placeOrder(data: {
    items: Array<{
      productId: string;
      quantity: number;
      isRental?: boolean;
      rentalDurationMonths?: number;
    }>;
    deliveryAddress: {
      street: string;
      city: string;
      state?: string;
      pincode: string;
      contactPhone?: string;
    };
    paymentMethod?: 'online' | 'cod' | 'insurance_claim';
    hospitalReferralId?: string;
    idempotencyKey?: string;
    installationPreferences?: {
      preferredDate?: string;
      preferredSlot?: string;
      accessInstructions?: string;
    };
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/products/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async getMyOrders() {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>('/api/v1/products/orders/me');
    return res.data;
  },

  async getOrderById(orderIdOrNumber: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/products/orders/${orderIdOrNumber}`);
    return res.data;
  },

  async getPaymentConfig() {
    const res = await request<{
      success: boolean;
      data: {
        isConfigured: boolean;
        keyId: string;
        mode: string;
        missingConfigNotice: string | null;
        allowedPaymentMethods: string[];
      };
    }>('/api/v1/products/payments/config');
    return res.data;
  },

  async createPaymentIntent(orderId: string) {
    const res = await request<{
      success: boolean;
      data: {
        orderId: string;
        orderNumber: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
        isTestMode: boolean;
        notice: string | null;
      };
    }>('/api/v1/products/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
    return res.data;
  },

  async verifyPayment(payload: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/products/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },

  async cancelOrder(orderIdOrNumber: string, reason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/products/orders/${orderIdOrNumber}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res;
  },

  async requestReturn(orderIdOrNumber: string, reason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/products/orders/${orderIdOrNumber}/return-request`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res;
  },

  async scheduleClinicianSetup(orderIdOrNumber: string, payload: {
    setupDate: string;
    setupSlot?: string;
    setupNotes?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/products/orders/${orderIdOrNumber}/setup-schedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res;
  },

  async getProductReviews(productId: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/products/${productId}/reviews${qs}`);
    return res;
  },

  async submitProductReview(productId: string, data: { orderId: string; rating: number; title: string; comment: string }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async submitOrderComplaint(orderIdOrNumber: string, data: { productId: string; category: string; description: string; refundRequested?: boolean }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/products/orders/${orderIdOrNumber}/complaints`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async getMyComplaints() {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>('/api/v1/products/complaints/my');
    return res.data;
  },
};

// -----------------------------------------------------------------------------
// Supplier Portal APIs
// -----------------------------------------------------------------------------
export const supplierPortalApi = {
  async getProfile() {
    const res = await request<{
      success: boolean;
      data: any;
    }>('/api/v1/supplier/profile');
    return res.data;
  },

  async updateProfile(data: any) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/supplier/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  },

  async getProducts(params?: { search?: string; category?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/supplier/products${qs}`);
    return res;
  },

  async createProduct(data: any) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/supplier/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async updateProduct(id: string, data: any) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/supplier/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  },

  async getOrders(params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/supplier/orders${qs}`);
    return res;
  },

  async acceptOrder(id: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/supplier/orders/${id}/accept`, {
      method: 'POST',
    });
    return res;
  },

  async rejectOrder(id: string, reason: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/supplier/orders/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res;
  },

  async dispatchOrder(id: string, data: { carrierName: string; trackingNumber: string; notes?: string }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/supplier/orders/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async getSettlements() {
    const res = await request<{
      success: boolean;
      data: any;
    }>('/api/v1/supplier/settlements');
    return res.data;
  },

  async getComplaints() {
    const res = await request<{
      success: boolean;
      count: number;
      data: any[];
    }>('/api/v1/supplier/complaints');
    return res.data;
  },

  async respondToComplaint(id: string, response: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/supplier/complaints/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    });
    return res;
  },
};

// -----------------------------------------------------------------------------
// Admin Marketplace Management APIs
// -----------------------------------------------------------------------------
export const adminMarketplaceApi = {
  async getMetrics() {
    const res = await request<{
      success: boolean;
      data: any;
    }>('/api/v1/admin/marketplace/metrics');
    return res.data;
  },

  async getProducts(params?: { search?: string; category?: string; sourcingType?: string; status?: string; lowStockOnly?: boolean; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.sourcingType && params.sourcingType !== 'all') query.set('sourcingType', params.sourcingType);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.lowStockOnly) query.set('lowStockOnly', 'true');
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/admin/marketplace/products${qs}`);
    return res;
  },

  async createProduct(data: any) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/admin/marketplace/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async updateProduct(id: string, data: any) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/marketplace/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  },

  async archiveProduct(id: string) {
    const res = await request<{
      success: boolean;
      action?: string;
      message: string;
      data: any;
    }>(`/api/v1/admin/marketplace/products/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  async deleteProduct(id: string) {
    const res = await request<{
      success: boolean;
      action: 'permanently_deleted' | 'archived';
      message: string;
      data: any;
    }>(`/api/v1/admin/marketplace/products/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  async getReviews(params?: { status?: string; productId?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.productId) query.set('productId', params.productId);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/admin/marketplace/reviews${qs}`);
    return res;
  },

  async moderateReview(id: string, status: 'published' | 'rejected', notes?: string) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/marketplace/reviews/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
    return res;
  },

  async getComplaints(params?: { status?: string; category?: string; supplierId?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.supplierId) query.set('supplierId', params.supplierId);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/admin/marketplace/complaints${qs}`);
    return res;
  },

  async resolveComplaint(id: string, data: { resolutionNotes: string; refundApproved?: boolean; refundAmount?: number }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/marketplace/complaints/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  },

  async getInstallations(params?: { setupStatus?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.setupStatus && params.setupStatus !== 'all') query.set('setupStatus', params.setupStatus);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/admin/marketplace/installations${qs}`);
    return res;
  },

  async assignInstallationSpecialist(orderId: string, payload: {
    specialistId?: string;
    specialistName: string;
    setupDate?: string;
    setupNotes?: string;
    setupStatus?: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/marketplace/installations/${orderId}/assign`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res;
  },

  async getOrders(params?: {
    status?: string;
    paymentStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.paymentStatus && params.paymentStatus !== 'all') query.set('paymentStatus', params.paymentStatus);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: { total: number; page: number; limit: number; totalPages: number };
      data: any[];
    }>(`/api/v1/admin/marketplace/orders${qs}`);
    return res;
  },

  async updateDeliveryEstimate(orderId: string, payload: {
    estimatedDeliveryDate: string;
    reason: string;
  }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/admin/marketplace/orders/${orderId}/delivery-estimate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res;
  },
};

// -----------------------------------------------------------------------------
// Field Visits & Clinician Operations APIs
// -----------------------------------------------------------------------------
export const fieldVisitsApi = {
  async getMyFieldVisits(params?: {
    status?: string;
    date?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.date) query.set('date', params.date);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request<{
      success: boolean;
      count: number;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      data: any[];
    }>(`/api/v1/visits/provider/me${queryString}`);
    return res;
  },

  async getVisitById(id: string) {
    const res = await request<{
      success: boolean;
      data: any;
    }>(`/api/v1/visits/${id}`);
    return res.data;
  },

  async updateVisitStatus(id: string, params: { status: string; notes?: string; location?: string }) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/visits/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    return res;
  },

  async recordClinicalDocumentation(
    id: string,
    params: {
      vitals?: {
        bloodPressure?: string;
        pulse?: number;
        spO2?: number;
        temperature?: string;
        respiratoryRate?: number;
      };
      clinicalNotes?: string;
      proceduresPerformed?: string[];
      medicationsAdministered?: string[];
      recommendations?: string;
      followUpDate?: string;
      markAsCompleted?: boolean;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/visits/${id}/documentation`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res;
  },

  async reportVisitException(
    id: string,
    params: {
      exceptionType: string;
      reason: string;
      notes?: string;
      rescheduleDate?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/visits/${id}/exception`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res;
  },

  async verifyEquipmentInstallation(
    id: string,
    params: {
      equipmentItems: Array<{
        sku: string;
        name: string;
        serialNumber: string;
        condition: string;
        checklistPassed: boolean;
      }>;
      barcodeScanVerified: boolean;
      barcodeRawData?: string;
      patientAcknowledged: boolean;
      patientOrCaregiverName: string;
      consentObtained: boolean;
      evidenceNotes?: string;
      installationNotes?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/visits/${id}/installation-verify`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res;
  },

  async failInstallation(
    id: string,
    params: {
      failedReason: string;
      escalatedToAdmin: boolean;
      rescheduledToDate?: string;
      notes?: string;
    }
  ) {
    const res = await request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/visits/${id}/installation-fail`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res;
  },

  async syncOfflineBatch(operations: Array<{
    clientOperationId: string;
    visitId: string;
    visitNumber?: string;
    operationType: 'status_update' | 'clinical_documentation' | 'installation_verification' | 'visit_exception';
    clientTimestamp: string;
    expectedStatus?: string;
    payload: any;
  }>) {
    const res = await request<{
      success: boolean;
      message: string;
      data: {
        success: boolean;
        summary: {
          total: number;
          applied: number;
          conflicts: number;
          failed: number;
        };
        results: Array<{
          clientOperationId: string;
          status: 'applied' | 'conflict' | 'failed';
          visitId: string;
          visitNumber?: string;
          visitStatus?: string;
          conflictDetails?: any;
          errorReason?: string;
        }>;
      };
    }>('/api/v1/visits/sync', {
      method: 'POST',
      body: JSON.stringify({ operations }),
    });
    return res;
  },
};




