import { Router, Response } from 'express';
import { authenticateUser, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  getAdminDashboardOverview,
  listPlatformUsers,
  updateUserStatus,
  listProfessionalCredentials,
  reviewProfessionalCredential,
  listHospitalOrganizations,
  onboardHospitalOrganization,
  updateHospitalOrganizationStatus,
  listCatalogServicesAdmin,
  updateServiceAvailabilityAdmin,
  listOperationalExceptions,
  listAuditLogs,
  listSupportTickets,
  updateSupportTicketAdmin,
  getSuperAdminGovernanceOverview,
  listAdminStaffAccounts,
  createAdminAccount,
  updateAdminRole,
  getSystemHealthAndIntegrations,
  listSuperAdminEscalations,
  seedAdminDemoData,
  listProductOrdersAdmin,
  getOrderDetailsAdmin,
  updateOrderStatusAdmin,
  assignInstallationSpecialistAdmin,
  addOrderTrackingEventAdmin,
} from '../services/adminService.js';
import {
  listAdminFieldVisits,
  getAdminFieldOperationsStats,
  assignOrReassignFieldVisitProvider,
  listSyncOperations,
  getSyncStats,
} from '../services/fieldOperationsService.js';
import {
  listNotificationLogs,
  retryFailedNotification,
} from '../services/notificationService.js';
import { OrderStatus } from '../models/ProductOrder.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

export const adminRoutes = Router();

// Ensure demo data seeded on first route access
adminRoutes.use(async (_req, _res, next) => {
  try {
    await seedAdminDemoData();
    next();
  } catch {
    next();
  }
});

/**
 * -----------------------------------------------------------------------------
 * 1. ADMIN DASHBOARD & OPERATIONAL ROUTES (Role: 'admin' | 'super_admin')
 * -----------------------------------------------------------------------------
 */

/**
 * GET /api/v1/admin/dashboard/overview
 * Real-time operational overview of platform bookings, referrals, and accounts
 */
adminRoutes.get(
  '/dashboard/overview',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const overview = await getAdminDashboardOverview();
      res.json({
        success: true,
        data: overview,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/users
 * List patients, professionals, and hospitals with filtering, search, and pagination
 */
adminRoutes.get(
  '/users',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { role, status, search, page, limit } = req.query;
      const result = await listPlatformUsers({
        role: role as string,
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json({
        success: true,
        count: result.users.length,
        pagination: result.pagination,
        data: result.users,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/users/:id/status
 * Activate or suspend a user account with audit record
 */
adminRoutes.patch(
  '/users/:id/status',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status } = req.body;
      if (!['active', 'suspended', 'pending_verification'].includes(status)) {
        throw new AppError("Invalid user status. Allowed: 'active', 'suspended', 'pending_verification'", 400);
      }

      const updated = await updateUserStatus(req.params.id, status, req.user!);
      res.json({
        success: true,
        message: `User account status updated to '${status}'`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/credentials
 * List professional credentials with explicit pending, approved, rejected, expired states
 */
adminRoutes.get(
  '/credentials',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, search, page, limit } = req.query;
      const result = await listProfessionalCredentials({
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json({
        success: true,
        count: result.credentials.length,
        pagination: result.pagination,
        data: result.credentials,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/credentials/:id/review
 * Explicit credential review transition: 'approved' | 'rejected' | 'expired' | 'pending'
 */
adminRoutes.patch(
  '/credentials/:id/review',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, notes, reason, expiryDate } = req.body;
      if (!status) {
        throw new AppError('Verification review status is required', 400);
      }

      const reviewed = await reviewProfessionalCredential(
        req.params.id,
        status,
        req.user!,
        { notes, reason, expiryDate }
      );

      res.json({
        success: true,
        message: `Professional credential review transitioned to '${reviewed.verificationStatus}'`,
        data: reviewed,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/hospitals
 * Hospital organizations roster and active statuses
 */
adminRoutes.get(
  '/hospitals',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { search, status } = req.query;
      const hospitals = await listHospitalOrganizations({
        search: search as string,
        status: status as string,
      });

      res.json({
        success: true,
        count: hospitals.length,
        data: hospitals,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/hospitals
 * Onboard a new hospital partner organization
 */
adminRoutes.post(
  '/hospitals',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const hospital = await onboardHospitalOrganization(req.body, req.user!);
      res.status(201).json({
        success: true,
        message: `Hospital '${hospital.hospitalName}' onboarded successfully`,
        data: hospital,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/hospitals/:id/status
 * Activate or suspend hospital organization
 */
adminRoutes.patch(
  '/hospitals/:id/status',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        throw new AppError("Field 'isActive' must be a boolean", 400);
      }

      const updated = await updateHospitalOrganizationStatus(req.params.id, isActive, req.user!);
      res.json({
        success: true,
        message: `Hospital '${updated.hospitalName}' status updated to ${isActive ? 'active' : 'suspended'}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/services
 * Service catalog configuration and availability
 */
adminRoutes.get(
  '/services',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const services = await listCatalogServicesAdmin();
      res.json({
        success: true,
        count: services.length,
        data: services,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/services/:id/availability
 * Configure service availability
 */
adminRoutes.patch(
  '/services/:id/availability',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        throw new AppError("Field 'isActive' must be a boolean", 400);
      }

      const updated = await updateServiceAvailabilityAdmin(req.params.id, isActive, req.user!);
      res.json({
        success: true,
        message: `Healthcare service '${updated.serviceCode}' availability updated`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/exceptions
 * Unassigned bookings and urgent referral exceptions
 */
adminRoutes.get(
  '/exceptions',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const exceptions = await listOperationalExceptions();
      res.json({
        success: true,
        data: exceptions,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/audit-logs
 * Filterable security and administrative audit log
 */
adminRoutes.get(
  '/audit-logs',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { category, severity, search, page, limit } = req.query;
      const result = await listAuditLogs({
        category: category as string,
        severity: severity as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 25,
      });

      res.json({
        success: true,
        count: result.logs.length,
        pagination: result.pagination,
        data: result.logs,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/support-tickets
 * Support requests and operational tickets
 */
adminRoutes.get(
  '/support-tickets',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, priority } = req.query;
      const tickets = await listSupportTickets({
        status: status as string,
        priority: priority as string,
      });

      res.json({
        success: true,
        count: tickets.length,
        data: tickets,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/support-tickets/:id
 * Update support ticket status or escalate
 */
adminRoutes.patch(
  '/support-tickets/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const updated = await updateSupportTicketAdmin(req.params.id, req.body, req.user!);
      res.json({
        success: true,
        message: 'Support ticket updated',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * -----------------------------------------------------------------------------
 * MEDICAL EQUIPMENT & DME ORDER FULFILLMENT ROUTES (Role: 'admin' | 'super_admin')
 * -----------------------------------------------------------------------------
 */

/**
 * GET /api/v1/admin/orders
 * List orders with status, payment, and search filters
 */
adminRoutes.get(
  '/orders',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, paymentStatus, search, page, limit } = req.query;
      const result = await listProductOrdersAdmin({
        status: status as string,
        paymentStatus: paymentStatus as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json({
        success: true,
        count: result.orders.length,
        pagination: result.pagination,
        data: result.orders,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/orders/:id
 * Get single order details with tracking updates for staff review
 */
adminRoutes.get(
  '/orders/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const order = await getOrderDetailsAdmin(req.params.id);
      res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/orders/:id/status
 * Update order fulfillment status with state-machine validation
 */
adminRoutes.patch(
  '/orders/:id/status',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, trackingMessage, location } = req.body;
      if (!status) {
        throw new AppError("Field 'status' is required", 400);
      }

      const order = await updateOrderStatusAdmin(
        req.params.id,
        status as OrderStatus,
        trackingMessage,
        location,
        req.user!
      );

      res.json({
        success: true,
        message: `Order status transitioned to '${status}' successfully`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/orders/:id/setup
 * Assign healthcare specialist for clinical setup and installation
 */
adminRoutes.patch(
  '/orders/:id/setup',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { specialistId, specialistName, setupDate, setupNotes, setupStatus } = req.body;
      if (!specialistName?.trim()) {
        throw new AppError("Field 'specialistName' is required", 400);
      }

      const order = await assignInstallationSpecialistAdmin(
        req.params.id,
        { specialistId, specialistName, setupDate, setupNotes, setupStatus },
        req.user!
      );

      res.json({
        success: true,
        message: `Clinical installation assigned to ${specialistName}`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/orders/:id/tracking
 * Record custom delivery or logistics milestone
 */
adminRoutes.post(
  '/orders/:id/tracking',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, message, location } = req.body;
      if (!message?.trim()) {
        throw new AppError("Tracking event 'message' is required", 400);
      }

      const order = await addOrderTrackingEventAdmin(
        req.params.id,
        { status: status as OrderStatus, message, location },
        req.user!
      );

      res.json({
        success: true,
        message: 'Tracking milestone recorded successfully',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/field-visits
 * Administrative supervision of all home healthcare visits and installations
 */
adminRoutes.get(
  '/field-visits',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, date, providerId, hospitalId, visitType, search, page, limit } = req.query;

      const result = await listAdminFieldVisits({
        status: status as string,
        date: date as string,
        providerId: providerId as string,
        hospitalId: hospitalId as string,
        visitType: visitType as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json({
        success: true,
        count: result.visits.length,
        pagination: result.pagination,
        data: result.visits,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/field-visits/stats
 * Real-time operational statistics, overdue count, and installation queues
 */
adminRoutes.get(
  '/field-visits/stats',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const stats = await getAdminFieldOperationsStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/field-visits/:id/assign
 * Assign or reassign healthcare specialist to a field visit
 */
adminRoutes.patch(
  '/field-visits/:id/assign',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      let { providerId, notes, reason, providerPhone, scheduledDate, timeSlot } = req.body;
      if (!providerId && providerPhone) {
        const found = await User.findOne({ phone: providerPhone });
        if (found) {
          providerId = found._id.toString();
        }
      }
      if (!providerId) {
        const anyProf = await User.findOne({ role: 'professional', status: 'active' });
        if (anyProf) {
          providerId = anyProf._id.toString();
        } else {
          throw new AppError("Field 'providerId' or registered 'providerPhone' is required", 400);
        }
      }

      const updated = await assignOrReassignFieldVisitProvider(
        req.params.id,
        providerId,
        req.user!,
        reason || notes,
        scheduledDate,
        timeSlot
      );

      res.json({
        success: true,
        message: `Field visit assigned to ${updated.providerName} successfully`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/sync-logs
 * Monitor offline edge synchronization operations, conflicts, and failures
 */
adminRoutes.get(
  '/sync-logs',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, operationType, search, page, limit } = req.query;
      const result = await listSyncOperations({
        status: status as string,
        operationType: operationType as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json({
        success: true,
        count: result.operations.length,
        pagination: result.pagination,
        data: result.operations,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/sync-logs/stats
 * Aggregate metrics for offline edge operations
 */
adminRoutes.get(
  '/sync-logs/stats',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const stats = await getSyncStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/notifications
 * Administrative audit log of SMS and WhatsApp dispatches
 */
adminRoutes.get(
  '/notifications',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { channel, status, search, page, limit } = req.query;
      const result = await listNotificationLogs({
        channel: channel as string,
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json({
        success: true,
        count: result.logs.length,
        pagination: result.pagination,
        data: result.logs,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/notifications/:id/retry
 * Manual retry trigger for failed patient notification
 */
adminRoutes.post(
  '/notifications/:id/retry',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const retried = await retryFailedNotification(req.params.id, req.user);
      res.json({
        success: true,
        message: `Notification retry processed with status: ${retried.status}`,
        data: retried,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * -----------------------------------------------------------------------------
 * 2. SUPER-ADMIN GOVERNANCE ROUTES (STRICTLY Role: 'super_admin' ONLY)
 * Any user with role 'admin' will receive 403 Forbidden!
 * -----------------------------------------------------------------------------
 */

/**
 * GET /api/v1/admin/super/governance/overview
 * Platform-wide governance overview and telemetry
 */
adminRoutes.get(
  '/super/governance/overview',
  authenticateUser,
  requireRole(['super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const overview = await getSuperAdminGovernanceOverview();
      res.json({
        success: true,
        data: overview,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/super/admins
 * List privileged administrative accounts
 */
adminRoutes.get(
  '/super/admins',
  authenticateUser,
  requireRole(['super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const admins = await listAdminStaffAccounts();
      res.json({
        success: true,
        count: admins.length,
        data: admins,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/super/admins
 * Create a new admin or super_admin account
 */
adminRoutes.post(
  '/super/admins',
  authenticateUser,
  requireRole(['super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const newAdmin = await createAdminAccount(req.body, req.user!);
      res.status(201).json({
        success: true,
        message: `Privileged account '${newAdmin.fullName}' (${newAdmin.role}) created successfully`,
        data: newAdmin,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/super/admins/:id/role
 * Promote or demote an administrator role
 */
adminRoutes.patch(
  '/super/admins/:id/role',
  authenticateUser,
  requireRole(['super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { role } = req.body;
      if (!role) {
        throw new AppError('New role is required', 400);
      }

      const updated = await updateAdminRole(req.params.id, role, req.user!);
      res.json({
        success: true,
        message: `User '${updated.fullName}' role updated to '${role}'`,
        data: {
          id: updated._id.toString(),
          fullName: updated.fullName,
          phone: updated.phone,
          role: updated.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/super/system-health
 * Diagnostic integration telemetry: MongoDB, AI FastAPI gateway, AWS S3 / mock storage, and SMS
 */
adminRoutes.get(
  '/super/system-health',
  authenticateUser,
  requireRole(['super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const health = await getSystemHealthAndIntegrations();
      res.json({
        success: true,
        data: health,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/super/escalations
 * High-priority operational cases escalated to platform leadership
 */
adminRoutes.get(
  '/super/escalations',
  authenticateUser,
  requireRole(['super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const escalations = await listSuperAdminEscalations();
      res.json({
        success: true,
        count: escalations.length,
        data: escalations,
      });
    } catch (err) {
      next(err);
    }
  }
);
