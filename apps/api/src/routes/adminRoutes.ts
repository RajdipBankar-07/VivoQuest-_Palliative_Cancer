import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateUser, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  getAdminDashboardOverview,
  listPlatformUsers,
  getUserDetails,
  updateUserStatus,
  deleteUserPermanently,
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
  getFinancialSummaryAdmin,
  processOrderRefundAdmin,
  listDocumentExpiryAlertsAdmin,
  reviewHospitalOrganizationVerification,
  listHealthcareProfessionalsAdmin,
} from '../services/adminService.js';
import {
  listSuppliers,
  getSupplierById,
  onboardSupplier,
  reviewSupplierVerification,
  listPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
} from '../services/supplierService.js';
import { updateOrderDeliveryEstimate } from '../services/productCatalogService.js';
import {
  listCaregiverPlans,
  createCaregiverPlan,
  listCaregiverSubscriptions,
  assignCaregiverToSubscription,
  recordSubscriptionVisit,
  activateCaregiverSubscription,
  cancelCaregiverSubscription,
  suspendCaregiverSubscription,
  resumeCaregiverSubscription,
  archiveCaregiverSubscription,
  deleteCaregiverSubscriptionPermanently,
  getSubscriptionAuditHistory,
} from '../services/caregiverPlanService.js';
import {
  listAdminFieldVisits,
  getAdminFieldOperationsStats,
  assignOrReassignFieldVisitProvider,
  getEligibleCaregiversForVisit,
  listSyncOperations,
  getSyncStats,
  scheduleVisitForSubscription,
  sweepAndDetectOverdueVisits,
  deleteAdminFieldVisit,
} from '../services/fieldOperationsService.js';
import {
  listNotificationLogs,
  retryFailedNotification,
  markNotificationAsRead,
  clearPastNotificationLogs,
  clearAllNotificationLogs,
  softClearAllAdminNotifications,
  permanentlyDeleteNotification,
  getNotificationById,
} from '../services/notificationService.js';
import { getAuthorizedPatientDetails } from '../services/patientService.js';
import {
  getProfessionalDetailForAdmin,
  reviewCredentialAdmin,
  updateProfessionalAdmin,
} from '../services/professionalProfileService.js';
import { OrderStatus } from '../models/ProductOrder.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotificationLog } from '../models/NotificationLog.js';
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
 * GET /api/v1/admin/users/:id
 * Retrieve comprehensive user profile, role-specific attributes, and audit history
 */
adminRoutes.get(
  '/users/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const details = await getUserDetails(req.params.id);
      res.json({
        success: true,
        data: details,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/users/:id
 * Permanently delete a user account from MongoDB and clean up orphaned profile data
 */
adminRoutes.delete(
  '/users/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const result = await deleteUserPermanently(req.params.id, req.user!);
      res.json({
        success: true,
        message: result.message,
        data: result,
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
 * PATCH /api/v1/admin/orders/:id/delivery-estimate
 * Authorized update of estimated delivery date with mandatory reason, tracking update, and patient notification
 */
adminRoutes.patch(
  '/orders/:id/delivery-estimate',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { estimatedDeliveryDate, reason } = req.body;
      const order = await updateOrderDeliveryEstimate(
        req.params.id,
        { estimatedDeliveryDate, reason },
        req.user!
      );

      res.json({
        success: true,
        message: 'Estimated delivery date updated successfully',
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
      const { status, date, dateScope, providerId, hospitalId, visitType, search, page, limit } = req.query;

      const result = await listAdminFieldVisits({
        status: status as string,
        date: date as string,
        dateScope: dateScope as 'today' | 'upcoming' | 'past' | 'all' | undefined,
        providerId: providerId as string,
        hospitalId: hospitalId as string,
        visitType: visitType as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
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
 * DELETE /api/v1/admin/field-visits/:id
 * DELETE /api/v1/admin/visits/:id
 * Administrative action to archive and remove a completed/concluded field visit
 */
const handleDeleteAdminVisit = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = req.user!;
    const { reason } = req.body || {};
    const result = await deleteAdminFieldVisit(
      req.params.id,
      {
        _id: user._id,
        fullName: user.fullName,
        role: user.role,
      },
      reason
    );
    res.json({ ...result });
  } catch (err) {
    next(err);
  }
};

adminRoutes.delete('/field-visits/:id', authenticateUser, requireRole(['admin', 'super_admin']), handleDeleteAdminVisit);
adminRoutes.delete('/visits/:id', authenticateUser, requireRole(['admin', 'super_admin']), handleDeleteAdminVisit);

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
 * POST /api/v1/admin/field-visits/check-missed
 * Safely sweep and mark overdue uncompleted visits as missed with audit trail and alerts
 */
adminRoutes.post(
  '/field-visits/check-missed',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const dryRun = Boolean(req.body?.dryRun);
      const result = await sweepAndDetectOverdueVisits({
        actor: {
          _id: user._id,
          fullName: user.fullName,
          role: user.role,
        },
        dryRun,
      });

      res.status(200).json({
        success: true,
        message: `Overdue visits sweep completed. Evaluated: ${result.totalEvaluated}, Marked Missed: ${result.missedCount}`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

adminRoutes.post(
  '/field-visits/sweep-missed',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const user = req.user!;
      const dryRun = Boolean(req.body?.dryRun);
      const result = await sweepAndDetectOverdueVisits({
        actor: {
          _id: user._id,
          fullName: user.fullName,
          role: user.role,
        },
        dryRun,
      });

      res.status(200).json({
        success: true,
        message: `Overdue visits sweep completed. Evaluated: ${result.totalEvaluated}, Marked Missed: ${result.missedCount}`,
        data: result,
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
      let { providerId, notes, reason, providerPhone, scheduledDate, timeSlot, providerName } = req.body;
      if (!providerId && providerPhone) {
        const cleanPhone = String(providerPhone).replace(/\D/g, '').slice(-10);
        if (cleanPhone.length === 10) {
          const found = await User.findOne({ phone: cleanPhone });
          if (found) {
            providerId = found._id.toString();
          }
        }
      }
      if (!providerId && providerName) {
        const found = await User.findOne({
          fullName: { $regex: new RegExp(`^${providerName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          role: { $in: ['caregiver', 'nurse', 'professional'] },
        });
        if (found) {
          providerId = found._id.toString();
        }
      }
      if (!providerId) {
        throw new AppError("Valid 'providerId' or registered active 'providerPhone' of an authorized caregiver is required", 400);
      }

      const allowRejectedCaregiver = Boolean(req.body.allowRejectedCaregiver || req.body.forceReassign);
      const updated = await assignOrReassignFieldVisitProvider(
        req.params.id,
        providerId,
        req.user!,
        reason || notes,
        scheduledDate,
        timeSlot,
        { allowRejectedCaregiver }
      );

      res.json({
        success: true,
        message: `Field visit assigned to ${updated.providerName} successfully`,
        data: updated,
      });
    } catch (err: any) {
      // Record failed reassignment attempt in AuditLog
      try {
        await AuditLog.create({
          action: 'FIELD_VISIT_REASSIGNMENT_FAILED',
          category: 'field_operations',
          actorId: req.user?._id,
          actorName: req.user?.fullName || 'Admin',
          actorRole: req.user?.role || 'admin',
          targetType: 'FieldVisit',
          targetId: req.params.id,
          details: {
            visitId: req.params.id,
            proposedProviderId: req.body?.providerId,
            actingAdminId: req.user?._id?.toString(),
            reason: req.body?.reason || req.body?.notes || 'Not specified',
            outcome: 'failed',
            failureReason: err.message,
          },
          severity: 'warning',
          timestamp: new Date(),
        });
      } catch (auditErr) {}
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/field-visits/:id/eligible-caregivers
 * Retrieve list of active, available, conflict-free caregivers eligible for this visit
 */
adminRoutes.get(
  '/field-visits/:id/eligible-caregivers',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const result = await getEligibleCaregiversForVisit(req.params.id);
      res.json({
        success: true,
        data: result.eligibleCaregivers,
        count: result.count,
        message: result.message,
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
 * Administrative audit log of in-app, SMS, and WhatsApp dispatches
 */
adminRoutes.get(
  '/notifications',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const {
        channel,
        status,
        isRead,
        search,
        page,
        limit,
        unread,
        dateScope,
        date,
        autoDeletePast,
        inbox,
        includeCleared,
      } = req.query;

      let parsedIsRead: boolean | undefined = undefined;
      if (isRead === 'true') parsedIsRead = true;
      if (isRead === 'false' || unread === 'true') parsedIsRead = false;

      const adminUserId = req.user?._id?.toString() || (req.user as any)?.id?.toString();
      const isInbox = inbox === 'true' || channel === 'in_app';

      const result = await listNotificationLogs({
        channel: channel as string,
        status: status as string,
        isRead: parsedIsRead,
        search: search as string,
        dateScope: (dateScope as any) || (isInbox ? 'all' : undefined),
        date: date as string,
        autoDeletePast: autoDeletePast === 'true' || autoDeletePast === '1',
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : (isInbox ? 50 : 10),
        adminUserId,
        excludeCleared: includeCleared !== 'true',
        inboxOnly: isInbox,
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
 * GET /api/v1/admin/notifications/unread-count
 * Count unread in-app notifications for the notification bell badge.
 * Synchronized with the exact recipient, status, and soft-clear filters of the drawer.
 */
adminRoutes.get(
  '/notifications/unread-count',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const adminUserId = req.user?._id?.toString() || (req.user as any)?.id?.toString();
      const count = await NotificationLog.countDocuments({
        channel: 'in_app',
        isRead: { $ne: true },
        $and: [
          {
            $or: [
              { recipientPhone: 'ADMIN_DESK' },
              { recipientRole: { $in: ['admin', 'super_admin'] } },
              ...(adminUserId ? [{ recipientUserId: adminUserId }] : []),
            ],
          },
          {
            $or: [
              { isCleared: { $ne: true } },
              { isCleared: { $exists: false } },
            ],
          },
          ...(adminUserId ? [{ clearedBy: { $ne: adminUserId } }] : []),
        ],
      });
      res.json({ success: true, data: { unreadCount: count } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/notifications/mark-all-read
 * Mark all unread in-app notifications for this admin as read.
 */
adminRoutes.patch(
  '/notifications/mark-all-read',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const now = new Date();
      const adminUserId = req.user?._id?.toString() || (req.user as any)?.id?.toString();
      const result = await NotificationLog.updateMany(
        {
          channel: 'in_app',
          isRead: { $ne: true },
          $and: [
            {
              $or: [
                { recipientPhone: 'ADMIN_DESK' },
                { recipientRole: { $in: ['admin', 'super_admin'] } },
                ...(adminUserId ? [{ recipientUserId: adminUserId }] : []),
              ],
            },
            {
              $or: [
                { isCleared: { $ne: true } },
                { isCleared: { $exists: false } },
              ],
            },
            ...(adminUserId ? [{ clearedBy: { $ne: adminUserId } }] : []),
          ],
        },
        { $set: { isRead: true, readAt: now } }
      );
      res.json({
        success: true,
        message: 'All in-app notifications marked as read',
        data: { markedRead: result.modifiedCount },
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
 * GET /api/v1/admin/notifications/:id
 * Retrieve details of a single notification for modal inspection
 */
adminRoutes.get(
  '/notifications/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new AppError('Invalid notification ID format', 400);
      }
      const adminUserId = req.user?._id?.toString() || (req.user as any)?.id?.toString();
      const notif = await getNotificationById(req.params.id, adminUserId, req.user?.role);
      res.json({
        success: true,
        data: notif,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/notifications/:id/read
 * Mark an administrative or in-app notification as read
 */
adminRoutes.patch(
  '/notifications/:id/read',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new AppError('Invalid notification ID format', 400);
      }
      const adminUserId = req.user?._id?.toString() || (req.user as any)?.id?.toString();
      const readNotif = await markNotificationAsRead(req.params.id, adminUserId, req.user?.role);
      res.json({
        success: true,
        message: 'Notification marked as read',
        data: readNotif,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/notifications/clear-past
 * Permanently delete/clear all past notification logs older than today.
 */
adminRoutes.delete(
  '/notifications/clear-past',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const result = await clearPastNotificationLogs();
      res.json({
        success: true,
        message: `Cleared ${result.deletedCount} past notification logs older than today.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/notifications/clear-all
 * POST /api/v1/admin/notifications/clear-all
 * Clear all in-app notifications from the authenticated admin's inbox.
 * Uses per-admin soft-clear/archive to preserve audit history and compliance.
 */
adminRoutes.delete(
  '/notifications/clear-all',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const adminUserId = req.user?._id?.toString() || (req.user as any)?.id?.toString();
      const result = await softClearAllAdminNotifications(adminUserId);

      await AuditLog.create({
        action: 'NOTIFICATIONS_CLEARED',
        category: 'field_operations',
        actorId: req.user?._id,
        actorName: req.user?.fullName || 'Platform Administrator',
        actorRole: req.user?.role || 'admin',
        targetType: 'NotificationLog',
        details: {
          clearedCount: result.clearedCount,
          softCleared: true,
          retainedForAudit: true,
        },
        severity: 'info',
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: `Cleared ${result.clearedCount} in-app notification alerts from your active inbox. Records remain archived for compliance.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

adminRoutes.post(
  '/notifications/clear-all',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const adminUserId = req.user?._id?.toString() || (req.user as any)?.id?.toString();
      const result = await softClearAllAdminNotifications(adminUserId);

      await AuditLog.create({
        action: 'NOTIFICATIONS_CLEARED',
        category: 'field_operations',
        actorId: req.user?._id,
        actorName: req.user?.fullName || 'Platform Administrator',
        actorRole: req.user?.role || 'admin',
        targetType: 'NotificationLog',
        details: {
          clearedCount: result.clearedCount,
          softCleared: true,
          retainedForAudit: true,
        },
        severity: 'info',
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: `Cleared ${result.clearedCount} in-app notification alerts from your active inbox. Records remain archived for compliance.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/notifications/:id
 * Permanently delete a single notification record from the database.
 * Does not delete related visits, orders, subscriptions, or audit logs.
 */
adminRoutes.delete(
  '/notifications/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new AppError('Invalid notification ID format', 400);
      }

      const adminUserId = req.user?._id?.toString() || (req.user as any)?.id?.toString();
      const result = await permanentlyDeleteNotification(req.params.id, adminUserId, req.user?.role);

      await AuditLog.create({
        action: 'NOTIFICATION_PERMANENTLY_DELETED',
        category: 'field_operations',
        actorId: req.user?._id,
        actorName: req.user?.fullName || 'Platform Administrator',
        actorRole: req.user?.role || 'admin',
        targetType: 'NotificationLog',
        targetId: req.params.id,
        details: {
          notificationId: req.params.id,
          permanent: true,
        },
        severity: 'warning',
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: 'Notification deleted permanently.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/notifications/bulk-delete
 * Bulk permanently delete selected notification logs.
 */
adminRoutes.post(
  '/notifications/bulk-delete',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { ids } = req.body || {};
      const { bulkDeleteNotificationLogs } = await import('../services/notificationService.js');
      const result = await bulkDeleteNotificationLogs(ids || []);
      res.json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} notifications.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/notifications/date-range
 * Permanently delete notification logs between startDate and endDate.
 */
adminRoutes.delete(
  '/notifications/date-range',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        throw new AppError('Both startDate and endDate are required query parameters', 400);
      }
      const { deleteNotificationLogsByDateRange } = await import('../services/notificationService.js');
      const result = await deleteNotificationLogsByDateRange(startDate as string, endDate as string);
      res.json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} notifications between ${startDate} and ${endDate}.`,
        data: result,
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

/**
 * -----------------------------------------------------------------------------
 * 6. FINANCIAL REPORTING & REFUND RECONCILIATION
 * -----------------------------------------------------------------------------
 */

/**
 * GET /api/v1/admin/finances/summary
 * Authoritative financial overview calculated on the server.
 * Separates customer sales revenue, procurement cost, supplier liabilities, refunds, and gross profit.
 */
adminRoutes.get(
  '/finances/summary',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const summary = await getFinancialSummaryAdmin();
      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/orders/:id/refund
 * Safely process customer order return or cancellation refund
 */
adminRoutes.post(
  '/orders/:id/refund',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { refundAmount, reason } = req.body;
      if (!refundAmount || !reason) {
        throw new AppError('refundAmount and reason are mandatory for refund processing', 400);
      }
      const order = await processOrderRefundAdmin(
        req.params.id,
        Number(refundAmount),
        reason,
        req.user!
      );
      res.json({
        success: true,
        message: 'Order refund recorded and marked as processed',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * -----------------------------------------------------------------------------
 * 7. DOCUMENT VERIFICATION, CREDENTIALS & EXPIRY ALERTS
 * -----------------------------------------------------------------------------
 */

/**
 * GET /api/v1/admin/credentials/expiry-alerts
 * Document expiry alerts for clinical licenses and hospital accreditation
 */
adminRoutes.get(
  '/credentials/expiry-alerts',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const alerts = await listDocumentExpiryAlertsAdmin();
      res.json({
        success: true,
        data: alerts,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/hospitals/:id/verify
 * Review and verify or reject a hospital or healthcare partner
 */
adminRoutes.post(
  '/hospitals/:id/verify',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, notes, licenseExpiryDate } = req.body;
      if (!['pending', 'verified', 'rejected'].includes(status)) {
        throw new AppError("status must be 'pending', 'verified', or 'rejected'", 400);
      }
      const profile = await reviewHospitalOrganizationVerification(
        req.params.id,
        status,
        notes || '',
        licenseExpiryDate,
        req.user!
      );
      res.json({
        success: true,
        message: `Hospital partner verification updated to ${status}`,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/professionals
 * List doctors, nurses, and caregivers with verification credentials and statistics
 */
adminRoutes.get(
  '/professionals',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { professionType, verificationStatus, search, page, limit } = req.query;
      const result = await listHealthcareProfessionalsAdmin({
        professionType: professionType as string,
        verificationStatus: verificationStatus as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.json({
        success: true,
        data: result.professionals,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/professionals/:id
 * Detailed authorized admin inspection view of a healthcare professional.
 */
adminRoutes.get(
  '/professionals/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const result = await getProfessionalDetailForAdmin(req.params.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/professionals/:id/credentials/:credentialId/review
 * Verify or reject a professional credential with mandatory reason when rejected.
 */
adminRoutes.patch(
  '/professionals/:id/credentials/:credentialId/review',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const admin = req.user!;
      const result = await reviewCredentialAdmin(
        req.params.credentialId,
        req.body,
        {
          id: admin._id.toString(),
          fullName: admin.fullName,
          role: admin.role,
        }
      );
      res.json({
        success: true,
        message: `Credential review updated: status is now ${result.verificationStatus}`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/professionals/:id
 * Admin updates to healthcare professional profile.
 */
adminRoutes.patch(
  '/professionals/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const admin = req.user!;
      const result = await updateProfessionalAdmin(
        req.params.id,
        req.body,
        {
          id: admin._id.toString(),
          fullName: admin.fullName,
          role: admin.role,
        }
      );
      res.json({
        success: true,
        message: 'Professional profile updated by admin',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * -----------------------------------------------------------------------------
 * 8. SUPPLIER COMMERCE & PROCUREMENT PURCHASE ORDERS
 * -----------------------------------------------------------------------------
 */

/**
 * GET /api/v1/admin/suppliers
 * List suppliers with filters and search
 */
adminRoutes.get(
  '/suppliers',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, sourcingType, search, page, limit } = req.query;
      const result = await listSuppliers({
        status: status as string,
        sourcingType: sourcingType as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.json({
        success: true,
        data: result.suppliers,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/suppliers
 * Onboard a new medical equipment supplier
 */
adminRoutes.post(
  '/suppliers',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const supplier = await onboardSupplier(req.body, req.user!);
      res.status(201).json({
        success: true,
        message: 'Supplier onboarded successfully in pending review state',
        data: supplier,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/suppliers/:id
 * Get supplier details
 */
adminRoutes.get(
  '/suppliers/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const supplier = await getSupplierById(req.params.id);
      res.json({
        success: true,
        data: supplier,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/suppliers/:id/verify
 * Review supplier verification (verify or reject)
 */
adminRoutes.post(
  '/suppliers/:id/verify',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, notes } = req.body;
      if (!['pending_review', 'verified', 'rejected'].includes(status)) {
        throw new AppError("status must be 'pending_review', 'verified', or 'rejected'", 400);
      }
      const supplier = await reviewSupplierVerification(req.params.id, status, notes || '', req.user!);
      res.json({
        success: true,
        message: `Supplier verification updated to ${status}`,
        data: supplier,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/purchase-orders
 * List purchase orders with filters
 */
adminRoutes.get(
  '/purchase-orders',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { supplierId, paymentStatus, deliveryStatus, page, limit } = req.query;
      const result = await listPurchaseOrders({
        supplierId: supplierId as string,
        paymentStatus: paymentStatus as string,
        deliveryStatus: deliveryStatus as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/purchase-orders
 * Create a new purchase order
 */
adminRoutes.post(
  '/purchase-orders',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const po = await createPurchaseOrder(req.body, req.user!);
      res.status(201).json({
        success: true,
        message: 'Purchase order created successfully',
        data: po,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/admin/purchase-orders/:id
 * Update purchase order status (delivery, payment settlement)
 */
adminRoutes.put(
  '/purchase-orders/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const po = await updatePurchaseOrderStatus(req.params.id, req.body, req.user!);
      res.json({
        success: true,
        message: 'Purchase order status updated successfully',
        data: po,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * -----------------------------------------------------------------------------
 * 9. CAREGIVER SUBSCRIPTIONS & FIXED VISIT PACKAGES
 * -----------------------------------------------------------------------------
 */

/**
 * GET /api/v1/admin/caregiver-plans
 * List caregiver care plans and packages
 */
adminRoutes.get(
  '/caregiver-plans',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { category, planType } = req.query;
      const plans = await listCaregiverPlans({
        category: category as string,
        planType: planType as string,
      });
      res.json({
        success: true,
        count: plans.length,
        data: plans,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/caregiver-plans
 * Create a new caregiver subscription package
 */
adminRoutes.post(
  '/caregiver-plans',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const plan = await createCaregiverPlan(req.body, req.user!);
      res.status(201).json({
        success: true,
        message: 'Caregiver plan created successfully',
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/caregiver-subscriptions
 * List patient caregiver subscriptions
 */
adminRoutes.get(
  '/caregiver-subscriptions',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, patientId, caregiverId, search, page, limit } = req.query;
      const result = await listCaregiverSubscriptions({
        status: status as string,
        patientId: patientId as string,
        caregiverId: caregiverId as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      });
      res.json({
        success: true,
        data: result.subscriptions,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/caregiver-subscriptions/:id/assign
 * Assign or reassign caregiver to patient subscription
 */
adminRoutes.post(
  '/caregiver-subscriptions/:id/assign',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { caregiverUserId, notes } = req.body;
      if (!caregiverUserId) {
        throw new AppError('caregiverUserId is required', 400);
      }
      const sub = await assignCaregiverToSubscription(
        req.params.id,
        caregiverUserId,
        notes,
        req.user!
      );
      res.json({
        success: true,
        message: 'Caregiver assigned to subscription successfully',
        data: sub,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/caregiver-subscriptions/:id/record-visit
 * Record a visit against a subscription balance
 */
adminRoutes.post(
  '/caregiver-subscriptions/:id/record-visit',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { notes, visitIdempotencyKey } = req.body;
      const sub = await recordSubscriptionVisit(req.params.id, notes, req.user!, visitIdempotencyKey);
      res.json({
        success: true,
        message: 'Visit recorded against subscription balance',
        data: sub,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/caregiver-subscriptions/activate
 * Activate a caregiver subscription for a patient
 */
adminRoutes.post(
  '/caregiver-subscriptions/activate',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const sub = await activateCaregiverSubscription(req.body, req.user!);
      res.status(201).json({
        success: true,
        message: 'Caregiver subscription activated successfully',
        data: sub,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/caregiver-subscriptions/:id/suspend
 * Suspend/pause a caregiver subscription
 */
adminRoutes.post(
  '/caregiver-subscriptions/:id/suspend',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        throw new AppError('Suspension reason is required', 400);
      }
      const sub = await suspendCaregiverSubscription(req.params.id, reason.trim(), req.user!);
      res.json({
        success: true,
        message: 'Caregiver subscription suspended successfully',
        data: sub,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/caregiver-subscriptions/:id/resume
 * Resume an active caregiver subscription
 */
adminRoutes.post(
  '/caregiver-subscriptions/:id/resume',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { reason } = req.body;
      const sub = await resumeCaregiverSubscription(req.params.id, reason?.trim(), req.user!);
      res.json({
        success: true,
        message: 'Caregiver subscription resumed successfully',
        data: sub,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/caregiver-subscriptions/:id/cancel
 * Cancel a caregiver subscription
 */
adminRoutes.post(
  '/caregiver-subscriptions/:id/cancel',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        throw new AppError('Cancellation reason is required', 400);
      }
      const sub = await cancelCaregiverSubscription(req.params.id, reason.trim(), req.user!);
      res.json({
        success: true,
        message: 'Caregiver subscription cancelled successfully',
        data: sub,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/caregiver-subscriptions/:id/archive
 * Soft-delete / archive an eligible completed or cancelled subscription
 */
adminRoutes.post(
  '/caregiver-subscriptions/:id/archive',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        throw new AppError('Archive reason is required', 400);
      }
      const sub = await archiveCaregiverSubscription(req.params.id, reason.trim(), req.user!);
      res.json({
        success: true,
        message: 'Caregiver subscription archived successfully',
        data: sub,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/caregiver-subscriptions/:id
 * Permanently delete a subscription record and linked visits when confirmed by authorized admin
 */
adminRoutes.delete(
  '/caregiver-subscriptions/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const isPermanent =
        req.query?.permanent === 'true' ||
        req.body?.permanent === true ||
        req.body?.isPermanent === true ||
        req.query?.force === 'true';

      if (!isPermanent) {
        throw new AppError(
          'Permanent deletion of caregiver subscriptions is prohibited due to regulatory, clinical, and financial retention requirements. Use the archive workflow for eligible records instead, or confirm permanent deletion with permanent=true.',
          403
        );
      }

      const reason = req.body?.reason || (req.query?.reason as string);
      const result = await deleteCaregiverSubscriptionPermanently(
        req.params.id,
        req.user!,
        typeof reason === 'string' ? reason : undefined
      );

      res.status(200).json({
        success: true,
        message: 'Caregiver subscription permanently deleted from database',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/caregiver-subscriptions/:id/history
 * Retrieve authorized chronological audit history for a caregiver subscription
 */
adminRoutes.get(
  '/caregiver-subscriptions/:id/history',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      if (isNaN(page) || page < 1) {
        throw new AppError('Page parameter must be a positive integer', 400);
      }
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new AppError('Limit parameter must be an integer between 1 and 100', 400);
      }

      const result = await getSubscriptionAuditHistory(req.params.id, { page, limit });
      res.json({
        success: true,
        data: result.events,
        subscription: result.subscription,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/caregiver-subscriptions/:id/history
 * Immutable compliance protection: audit logs cannot be deleted
 */
adminRoutes.delete(
  '/caregiver-subscriptions/:id/history',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, _res: Response, next) => {
    try {
      throw new AppError(
        'Subscription audit events are strictly append-only and cannot be deleted or altered.',
        403
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/admin/caregiver-subscriptions/:id/history
 * Immutable compliance protection: audit logs cannot be modified
 */
adminRoutes.put(
  '/caregiver-subscriptions/:id/history',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, _res: Response, next) => {
    try {
      throw new AppError(
        'Subscription audit events are strictly append-only and cannot be modified.',
        403
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/caregiver-subscriptions/:id/history
 * Immutable compliance protection: audit logs cannot be modified
 */
adminRoutes.patch(
  '/caregiver-subscriptions/:id/history',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, _res: Response, next) => {
    try {
      throw new AppError(
        'Subscription audit events are strictly append-only and cannot be modified.',
        403
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/patients/:id
 * Retrieve comprehensive authorized patient profile dossier (account, subscriptions, visits, reports, audit history)
 */
adminRoutes.get(
  '/patients/:id',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const result = await getAuthorizedPatientDetails(req.params.id, req.user!);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/visits/schedule
 * Schedule and confirm an authorized field visit for an active caregiver subscription
 */
adminRoutes.post(
  '/visits/schedule',
  authenticateUser,
  requireRole(['admin', 'super_admin', 'professional']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { subscriptionId, scheduledDate, timeSlot, visitType, providerId, instructions, idempotencyKey } = req.body;
      const result = await scheduleVisitForSubscription(
        {
          subscriptionId,
          scheduledDate,
          timeSlot,
          visitType,
          providerId,
          instructions,
          idempotencyKey,
        },
        req.user!
      );

      res.status(201).json({
        success: true,
        message: 'Visit scheduled and confirmed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================================
// ADMIN RESCHEDULE REQUESTS — Visibility, Approval, and Rejection
// =============================================================================

/**
 * GET /api/v1/admin/reschedule-requests
 * List all reschedule requests across the platform (admin scope).
 */
adminRoutes.get(
  '/reschedule-requests',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { getPendingRescheduleRequestsForApprover } = await import('../services/visitRescheduleService.js');
      const statusFilter = (req.query.status as string) || 'pending';
      const requests = await getPendingRescheduleRequestsForApprover(
        req.user!._id.toString(),
        req.user!.role,
        statusFilter
      );
      res.json({ success: true, count: requests.length, data: requests });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/reschedule-requests/:requestId/approve
 * Approve a visit rescheduling request (Admin / Super Admin action).
 */
adminRoutes.post(
  '/reschedule-requests/:requestId/approve',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { approveRescheduleRequest } = await import('../services/visitRescheduleService.js');
      const user = req.user!;
      const result = await approveRescheduleRequest(req.params.requestId, {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      });
      res.json({
        success: true,
        message: 'Rescheduling request approved and field visit schedule updated.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/reschedule-requests/:requestId/reject
 * Reject a visit rescheduling request with mandatory reason.
 */
adminRoutes.post(
  '/reschedule-requests/:requestId/reject',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { rejectRescheduleRequest } = await import('../services/visitRescheduleService.js');
      const { rejectionReason } = req.body;
      if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length < 3) {
        throw new AppError('Please provide a valid rejection reason (at least 3 characters)', 400);
      }
      const user = req.user!;
      const result = await rejectRescheduleRequest(req.params.requestId, rejectionReason.trim(), {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      });
      res.json({
        success: true,
        message: 'Rescheduling request rejected. Original visit schedule preserved.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/reschedule-requests/:requestId
 * Delete or hide a reschedule request (supports ?permanent=true to reclaim storage).
 */
adminRoutes.delete(
  '/reschedule-requests/:requestId',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const permanent = req.query.permanent === 'true';
      const { deleteRescheduleRequest } = await import('../services/visitRescheduleService.js');
      const result = await deleteRescheduleRequest(
        req.params.requestId,
        {
          _id: req.user!._id,
          fullName: req.user!.fullName,
          phone: req.user!.phone,
          role: req.user!.role,
        },
        permanent
      );
      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/reschedule-requests/bulk-delete
 * Bulk delete or hide selected reschedule requests.
 */
adminRoutes.post(
  '/reschedule-requests/bulk-delete',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { ids, permanent } = req.body || {};
      const { bulkDeleteRescheduleRequests } = await import('../services/visitRescheduleService.js');
      const result = await bulkDeleteRescheduleRequests(
        ids || [],
        {
          _id: req.user!._id,
          fullName: req.user!.fullName,
          phone: req.user!.phone,
          role: req.user!.role,
        },
        permanent !== false
      );
      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/reschedule-requests/clear-resolved
 * Clear all resolved (approved, rejected, cancelled) reschedule requests.
 */
adminRoutes.delete(
  '/reschedule-requests/clear-resolved',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const permanent = req.query.permanent !== 'false';
      const { clearResolvedRescheduleRequests } = await import('../services/visitRescheduleService.js');
      const result = await clearResolvedRescheduleRequests(permanent);
      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/reschedule-requests/date-range
 * Clear or permanently delete reschedule requests in a date range.
 */
adminRoutes.delete(
  '/reschedule-requests/date-range',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { startDate, endDate, permanent } = req.query;
      if (!startDate || !endDate) {
        throw new AppError('Both startDate and endDate query parameters are required', 400);
      }
      const { deleteRescheduleRequestsByDateRange } = await import('../services/visitRescheduleService.js');
      const result = await deleteRescheduleRequestsByDateRange(
        startDate as string,
        endDate as string,
        permanent !== 'false'
      );
      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================================
// ADMIN FIELD VISITS — Visit Status Dashboard & Management
// =============================================================================

/**
 * GET /api/v1/admin/visits
 * List field visits with filters for date, status, caregiver, patient.
 */
adminRoutes.get(
  '/visits',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, date, search, page, limit } = req.query;
      const result = await listAdminFieldVisits({
        status: status as string,
        date: date as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.json({ success: true, data: result.visits, ...result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/visits/stats
 * Aggregate visit statistics for admin overview widgets.
 */
adminRoutes.get(
  '/visits/stats',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const stats = await getAdminFieldOperationsStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/visits/:visitId/reassign
 * POST  /api/v1/admin/visits/:visitId/reassign
 * Reassign a field visit to a different caregiver/provider.
 */
const handleVisitReassign = async (req: AuthRequest, res: Response, next: any) => {
  let newProviderId = req.body?.newProviderId || req.body?.providerId || req.body?.caregiverId;
  const reason = req.body?.reason || req.body?.reassignmentReason || req.body?.notes;
  try {
    const providerPhone = req.body.providerPhone || req.body.phone;
    const providerName = req.body.providerName;
    if (!newProviderId && providerPhone) {
      const cleanPhone = String(providerPhone).replace(/\D/g, '').slice(-10);
      if (cleanPhone.length === 10) {
        const found = await User.findOne({ phone: cleanPhone });
        if (found) {
          newProviderId = found._id.toString();
        }
      }
    }
    if (!newProviderId && providerName) {
      const found = await User.findOne({
        fullName: { $regex: new RegExp(`^${providerName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        role: { $in: ['caregiver', 'nurse', 'professional'] },
      });
      if (found) {
        newProviderId = found._id.toString();
      }
    }
    if (!newProviderId) throw new AppError("Valid 'newProviderId' or 'providerPhone' of an authorized caregiver is required", 400);
    const allowRejectedCaregiver = Boolean(req.body.allowRejectedCaregiver || req.body.forceReassign);
    const result = await assignOrReassignFieldVisitProvider(
      req.params.visitId,
      newProviderId,
      req.user!,
      reason,
      req.body.scheduledDate,
      req.body.timeSlot,
      { allowRejectedCaregiver }
    );
    res.json({
      success: true,
      message: `Field visit assigned to ${result.providerName} successfully`,
      data: result,
    });
  } catch (err: any) {
    // Record failed reassignment attempt in AuditLog
    try {
      await AuditLog.create({
        action: 'FIELD_VISIT_REASSIGNMENT_FAILED',
        category: 'field_operations',
        actorId: req.user?._id,
        actorName: req.user?.fullName || 'Admin',
        actorRole: req.user?.role || 'admin',
        targetType: 'FieldVisit',
        targetId: req.params.visitId,
        details: {
          visitId: req.params.visitId,
          proposedProviderId: newProviderId,
          actingAdminId: req.user?._id?.toString(),
          reason: reason || 'Not specified',
          outcome: 'failed',
          failureReason: err.message,
        },
        severity: 'warning',
        timestamp: new Date(),
      });
    } catch (auditErr) {}
    next(err);
  }
};

adminRoutes.patch('/visits/:visitId/reassign', authenticateUser, requireRole(['admin', 'super_admin']), handleVisitReassign);
adminRoutes.post('/visits/:visitId/reassign', authenticateUser, requireRole(['admin', 'super_admin']), handleVisitReassign);

/**
 * GET /api/v1/admin/visits/:visitId/eligible-caregivers
 * Retrieve list of active, available, conflict-free caregivers eligible for this visit
 */
adminRoutes.get(
  '/visits/:visitId/eligible-caregivers',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const result = await getEligibleCaregiversForVisit(req.params.visitId);
      res.json({
        success: true,
        data: result.eligibleCaregivers,
        count: result.count,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================================
// ADMIN CARE REPORTS — Report Listing with Clinical Documentation
// =============================================================================

/**
 * GET /api/v1/admin/care-reports
 * List field visits that have clinical documentation submitted (care reports).
 */
adminRoutes.get(
  '/care-reports',
  authenticateUser,
  requireRole(['admin', 'super_admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, date, search, page, limit } = req.query;
      // Fetch completed or in-progress visits that have clinical documentation
      const result = await listAdminFieldVisits({
        status: (status as string) || 'completed',
        date: date as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        requiresClinicalDoc: true,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);


