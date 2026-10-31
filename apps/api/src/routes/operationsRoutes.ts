import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateUser, requireRole, AuthRequest } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { MedicalProduct } from '../models/MedicalProduct.js';
import {
  getOperationsMetrics,
  listOperationsOrders,
  getOperationsOrderById,
  updateOrderDeliveryWorkflow,
  assignDeliveryStaff,
  updateOrderInstallation,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  listMaintenanceRequests,
  manageProductInventory,
  listOperationsStaff,
  reserveOrderStock,
  requestSupplierConfirmation,
  flagOrderDelay,
  getDeliverySlaAlerts,
  listRescheduleRequests,
  reviewDeliveryReschedule,
  getOrderProfitability,
  listOperationsReturns,
  reviewReturnRequest,
  scheduleReturnPickup,
  recordReturnPickupOutcome,
  recordReturnInspection,
  finalizeReturnResolution,
  listOperationsComplaints,
  resolveComplaint,
  listOperationsReviews,
  requestDeliveryOtp,
  verifyDeliveryOtp,
  managerDeliveryOverride,
  getCompletedDeliveries,
  getOperationsNotifications,
  markOperationsNotificationRead,
  markAllOperationsNotificationsRead,
  getInventorySummary,
  listInventoryProducts,
  adjustStockQuantity,
  confirmSupplierAvailability,
  createRestockPurchaseOrder,
  getProductStockMovements,
  listDeliveryProviders,
  createOrUpdateDeliveryProvider,
  coordinateOrderDeliveryProvider,
  generateDeliveryWhatsAppDetails,
  recordWhatsAppDeliveryAction,
} from '../services/operationsService.js';
import { getDeliveryRatingsSummary } from '../services/productCatalogService.js';

export const operationsRoutes = Router();

const ALLOWED_OPERATIONS_ROLES = [
  'operations_manager',
  'delivery_staff',
  'sales_manager',
  'maintenance_staff',
  'admin',
  'super_admin',
] as const;

// Global middleware for operations routes
operationsRoutes.use(authenticateUser);
operationsRoutes.use(requireRole(ALLOWED_OPERATIONS_ROLES as any));

/**
 * GET /api/v1/operations/me
 * Profile and role info for currently authenticated employee
 */
operationsRoutes.get('/me', async (req: AuthRequest, res: Response, next) => {
  try {
    const user = req.user!;
    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        employeeId: user.employeeId || 'EMP-OPS-001',
        department: user.department || 'Operations',
        assignedDepot: user.assignedDepot || 'Central Depot',
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/metrics
 * Summary KPI metrics for the employee operations dashboard
 */
operationsRoutes.get('/metrics', async (_req: AuthRequest, res: Response, next) => {
  try {
    const metrics = await getOperationsMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/orders
 * Unified Daily Order Queue with date filtering, risk analysis, sorting, and pagination
 */
operationsRoutes.get('/orders', async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      status,
      sourcingType,
      search,
      assignedStaffId,
      setupRequired,
      failedOnly,
      dateRange,
      startDate,
      endDate,
      riskFilter,
      sortBy,
      page,
      limit,
    } = req.query;

    const result = await listOperationsOrders(
      {
        status: status as string,
        sourcingType: sourcingType as any,
        search: search as string,
        assignedStaffId: assignedStaffId as string,
        setupRequired: setupRequired === 'true',
        failedOnly: failedOnly === 'true',
        dateRange: dateRange as any,
        startDate: startDate as string,
        endDate: endDate as string,
        riskFilter: riskFilter as any,
        sortBy: sortBy as any,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      },
      req.user!
    );

    res.json({
      success: true,
      count: result.orders.length,
      pagination: result.pagination,
      plannerSummary: result.plannerSummary,
      data: result.orders,
      orders: result.orders,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/delivery-planner
 * Alias endpoint for Daily Delivery Planner with database-backed metrics
 */
operationsRoutes.get('/delivery-planner', async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      status,
      sourcingType,
      search,
      assignedStaffId,
      setupRequired,
      failedOnly,
      dateRange,
      startDate,
      endDate,
      riskFilter,
      sortBy,
      page,
      limit,
    } = req.query;

    const result = await listOperationsOrders(
      {
        status: status as string,
        sourcingType: sourcingType as any,
        search: search as string,
        assignedStaffId: assignedStaffId as string,
        setupRequired: setupRequired === 'true',
        failedOnly: failedOnly === 'true',
        dateRange: (dateRange as any) || 'today',
        startDate: startDate as string,
        endDate: endDate as string,
        riskFilter: riskFilter as any,
        sortBy: sortBy as any,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      },
      req.user!
    );

    res.json({
      success: true,
      count: result.orders.length,
      pagination: result.pagination,
      plannerSummary: result.plannerSummary,
      data: {
        summary: result.plannerSummary,
        orders: result.orders,
        pagination: result.pagination,
      },
      orders: result.orders,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/orders/:id
 * Retrieve individual order details with tracking updates
 */
operationsRoutes.get('/orders/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const order = await getOperationsOrderById(req.params.id, req.user!);
    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/operations/orders/:id/delivery-status
 * Update order delivery workflow status
 */
const updateDeliveryStatusSchema = z.object({
  newStatus: z.enum([
    'placed',
    'confirmed',
    'preparing',
    'ready_for_dispatch',
    'dispatched',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'completed',
    'delivery_attempt_failed',
    'delivery_rescheduled',
    'returned_to_origin',
    'cancelled',
  ]),
  notes: z.string().optional(),
  location: z.string().optional(),
  failureReason: z.string().optional(),
  proofUrl: z.string().optional(),
  recipientConfirmed: z.boolean().optional(),
  scheduledDeliveryDate: z.string().optional(),
});

operationsRoutes.patch(
  '/orders/:id/delivery-status',
  validateRequest({ body: updateDeliveryStatusSchema }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const order = await updateOrderDeliveryWorkflow(
        req.params.id,
        {
          newStatus: req.body.newStatus,
          notes: req.body.notes,
          location: req.body.location,
          failureReason: req.body.failureReason,
          proofUrl: req.body.proofUrl,
          recipientConfirmed: req.body.recipientConfirmed,
          scheduledDeliveryDate: req.body.scheduledDeliveryDate ? new Date(req.body.scheduledDeliveryDate) : undefined,
        },
        req.user!
      );

      res.json({
        success: true,
        message: `Delivery status updated to '${req.body.newStatus}'`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

operationsRoutes.put(
  '/orders/:id/delivery-workflow',
  validateRequest({ body: updateDeliveryStatusSchema }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const order = await updateOrderDeliveryWorkflow(
        req.params.id,
        {
          newStatus: req.body.newStatus,
          notes: req.body.notes,
          location: req.body.location,
          failureReason: req.body.failureReason,
          proofUrl: req.body.proofUrl,
          recipientConfirmed: req.body.recipientConfirmed,
          scheduledDeliveryDate: req.body.scheduledDeliveryDate ? new Date(req.body.scheduledDeliveryDate) : undefined,
        },
        req.user!
      );

      res.json({
        success: true,
        message: `Delivery workflow updated to '${req.body.newStatus}'`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/operations/orders/:id/assign-delivery
 * Assign an employee to an order delivery
 */
const assignDeliverySchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  scheduledDeliveryDate: z.string().optional(),
  deliveryNotes: z.string().optional(),
});

operationsRoutes.patch(
  '/orders/:id/assign-delivery',
  validateRequest({ body: assignDeliverySchema }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const order = await assignDeliveryStaff(
        req.params.id,
        {
          staffId: req.body.staffId,
          scheduledDeliveryDate: req.body.scheduledDeliveryDate ? new Date(req.body.scheduledDeliveryDate) : undefined,
          deliveryNotes: req.body.deliveryNotes,
        },
        req.user!
      );

      res.json({
        success: true,
        message: 'Delivery staff assigned successfully',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/operations/delivery-providers
 * Get active delivery providers from library
 */
operationsRoutes.get('/delivery-providers', async (req: AuthRequest, res: Response, next) => {
  try {
    const providers = await listDeliveryProviders(req.query.search as string);
    res.json({
      success: true,
      data: providers,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/delivery-providers
 * Create or update a delivery provider in the library
 */
const deliveryProviderSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Provider name is required'),
  providerCode: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().min(1, 'Contact phone is required'),
  email: z.string().optional(),
  serviceArea: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  isDefault: z.boolean().optional(),
  notes: z.string().optional(),
});

operationsRoutes.post(
  '/delivery-providers',
  validateRequest({ body: deliveryProviderSchema }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const provider = await createOrUpdateDeliveryProvider(req.body, req.user!);
      res.json({
        success: true,
        message: 'Delivery provider saved successfully',
        data: provider,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/operations/orders/:id/coordinate-provider
 * Select/record delivery provider for order
 */
const coordinateProviderSchema = z.object({
  providerId: z.string().optional(),
  providerName: z.string().min(1, 'Delivery provider name is required'),
  deliveryPersonName: z.string().optional(),
  contactPhone: z.string().min(1, 'Provider phone number is required'),
  email: z.string().optional(),
  serviceArea: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  scheduledDeliveryDate: z.string().optional(),
  coordinationStatus: z.string().optional(),
  saveToLibrary: z.boolean().optional(),
  notes: z.string().optional(),
});

operationsRoutes.post(
  '/orders/:id/coordinate-provider',
  validateRequest({ body: coordinateProviderSchema }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const order = await coordinateOrderDeliveryProvider(
        req.params.id,
        req.body,
        req.user!
      );
      res.json({
        success: true,
        message: 'Delivery provider coordinated successfully',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/operations/orders/:id/whatsapp-preview
 * Generate sanitized WhatsApp click-to-chat payload
 */
operationsRoutes.post('/orders/:id/whatsapp-preview', async (req: AuthRequest, res: Response, next) => {
  try {
    const preview = await generateDeliveryWhatsAppDetails(req.params.id, req.user!);
    res.json({
      success: true,
      data: preview,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/orders/:id/whatsapp-action
 * Record WhatsApp delivery action (opened, sent_confirmed, provider_acknowledged)
 */
const whatsappActionSchema = z.object({
  action: z.enum(['opened_in_whatsapp', 'sent_confirmed', 'provider_acknowledged']),
  notes: z.string().optional(),
});

operationsRoutes.post(
  '/orders/:id/whatsapp-action',
  validateRequest({ body: whatsappActionSchema }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const order = await recordWhatsAppDeliveryAction(
        req.params.id,
        req.body,
        req.user!
      );
      res.json({
        success: true,
        message: `WhatsApp action '${req.body.action}' recorded successfully`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/operations/orders/:id/request-delivery-otp
 * Request single-use cryptographically secure delivery OTP sent to customer
 */
operationsRoutes.post(
  '/orders/:id/request-delivery-otp',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const result = await requestDeliveryOtp(req.params.id, req.user!);
      res.json({
        success: true,
        message: `Delivery OTP dispatched to customer (${result.phoneMasked})`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/operations/orders/:id/verify-delivery-otp
 * Verify single-use customer OTP and complete delivery with audit proof
 */
const verifyDeliveryOtpSchema = z.object({
  otp: z.string().min(6).max(6, 'OTP must be exactly 6 digits'),
  recipientName: z.string().optional(),
  recipientRelationship: z.string().optional(),
  deliveryCondition: z.string().optional(),
  customerAcknowledgement: z.boolean().optional(),
  proofUrl: z.string().optional(),
  notes: z.string().optional(),
});

operationsRoutes.post(
  '/orders/:id/verify-delivery-otp',
  validateRequest({ body: verifyDeliveryOtpSchema }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const order = await verifyDeliveryOtp(
        req.params.id,
        {
          otp: req.body.otp,
          recipientName: req.body.recipientName,
          recipientRelationship: req.body.recipientRelationship,
          deliveryCondition: req.body.deliveryCondition,
          customerAcknowledgement: req.body.customerAcknowledgement,
          proofUrl: req.body.proofUrl,
          notes: req.body.notes,
        },
        req.user!
      );

      res.json({
        success: true,
        message: 'Delivery verified via OTP and order completed successfully',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/operations/orders/:id/manager-delivery-override
 * Authorized manager override with identity check and audit trail
 */
const managerOverrideSchema = z.object({
  overrideReason: z.string().min(10, 'Override reason must be at least 10 characters'),
  identityDocType: z.string().min(1, 'Identity document type is required'),
  identityDocLast4: z.string().optional(),
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientRelationship: z.string().optional(),
  deliveryCondition: z.string().optional(),
  proofUrl: z.string().optional(),
  notes: z.string().optional(),
});

operationsRoutes.post(
  '/orders/:id/manager-delivery-override',
  validateRequest({ body: managerOverrideSchema }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const order = await managerDeliveryOverride(
        req.params.id,
        {
          overrideReason: req.body.overrideReason,
          identityDocType: req.body.identityDocType,
          identityDocLast4: req.body.identityDocLast4,
          recipientName: req.body.recipientName,
          recipientRelationship: req.body.recipientRelationship,
          deliveryCondition: req.body.deliveryCondition,
          proofUrl: req.body.proofUrl,
          notes: req.body.notes,
        },
        req.user!
      );

      res.json({
        success: true,
        message: 'Order delivery confirmed via authorized manager override',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/operations/completed-deliveries
 * Dedicated Completed Deliveries view with date filters and pagination
 */
operationsRoutes.get(
  '/completed-deliveries',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const {
        dateRange,
        startDate,
        endDate,
        deliveryStaffId,
        sourcingType,
        ratingStatus,
        verificationMethod,
        search,
        page,
        limit,
      } = req.query;

      const result = await getCompletedDeliveries({
        dateRange: dateRange as any,
        startDate: startDate as string,
        endDate: endDate as string,
        deliveryStaffId: deliveryStaffId as string,
        sourcingType: sourcingType as any,
        ratingStatus: ratingStatus as any,
        verificationMethod: verificationMethod as any,
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json({
        success: true,
        count: result.orders.length,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        summary: result.summary,
        data: result.orders,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/operations/delivery-ratings/summary
 * Aggregate delivery experience ratings for Operations Manager view
 */
operationsRoutes.get(
  '/delivery-ratings/summary',
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const summary = await getDeliveryRatingsSummary();
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
 * PATCH /api/v1/operations/orders/:id/installation
 * Update clinical installation/setup task
 */
operationsRoutes.patch('/orders/:id/installation', async (req: AuthRequest, res: Response, next) => {
  try {
    const order = await updateOrderInstallation(
      req.params.id,
      {
        assignedSpecialistId: req.body.assignedSpecialistId,
        setupStatus: req.body.setupStatus,
        setupDate: req.body.setupDate ? new Date(req.body.setupDate) : undefined,
        timeSlot: req.body.timeSlot,
        setupNotes: req.body.setupNotes,
        checklistResults: req.body.checklistResults,
        supportingDocUrl: req.body.supportingDocUrl,
        costBreakdown: req.body.costBreakdown,
        customerConfirmationConfirmed: req.body.customerConfirmationConfirmed,
      },
      req.user!
    );

    res.json({
      success: true,
      message: 'Clinical setup updated successfully',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/staff
 * List available staff members for delivery and setup assignments
 */
operationsRoutes.get('/staff', async (_req: AuthRequest, res: Response, next) => {
  try {
    const staff = await listOperationsStaff();
    res.json({
      success: true,
      data: staff,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/products
 * List products for inventory management
 */
operationsRoutes.get('/products', async (req: AuthRequest, res: Response, next) => {
  try {
    const { sourcingType, condition, search, page, limit } = req.query;
    const query: any = {};

    if (sourcingType && sourcingType !== 'all') {
      query.sourcingType = sourcingType;
    }
    if (condition && condition !== 'all') {
      query.equipmentCondition = condition;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { sku: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      MedicalProduct.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      MedicalProduct.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: products,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/products
 * Create a new product (owned or third-party)
 */
operationsRoutes.post('/products', async (req: AuthRequest, res: Response, next) => {
  try {
    const product = await manageProductInventory(null, req.body, req.user!);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/operations/products/:id
 * Update an existing product
 */
operationsRoutes.put('/products/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const product = await manageProductInventory(req.params.id, req.body, req.user!);
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/operations/products/:id/condition
 * Quickly flag product condition (healthy, damaged, under_maintenance, returned_for_inspection)
 */
operationsRoutes.patch('/products/:id/condition', async (req: AuthRequest, res: Response, next) => {
  try {
    const { condition, conditionNotes } = req.body;
    if (!['healthy', 'damaged', 'under_maintenance', 'returned_for_inspection'].includes(condition)) {
      throw new AppError('Invalid equipment condition', 400);
    }
    const product = await manageProductInventory(
      req.params.id,
      { equipmentCondition: condition, conditionNotes },
      req.user!
    );
    res.json({
      success: true,
      message: `Equipment condition flagged as '${condition}'`,
      data: product,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/upload-image
 * Validates and stores image for product catalogs
 */
operationsRoutes.post('/upload-image', async (req: AuthRequest, res: Response, next) => {
  try {
    const { image, filename } = req.body;
    if (!image || typeof image !== 'string') {
      throw new AppError('Image payload is required (data URI or URL string)', 400);
    }

    // Validation
    if (image.startsWith('data:image/')) {
      // Check MIME type
      const mime = image.substring(5, image.indexOf(';'));
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        throw new AppError('Unsupported image format. Allowed formats: JPEG, PNG, WEBP.', 400);
      }
      // Check approximate size (max 5MB)
      if (image.length > 7 * 1024 * 1024) {
        throw new AppError('Image file size exceeds maximum limit of 5MB', 400);
      }
    } else if (!image.startsWith('http://') && !image.startsWith('https://') && !image.startsWith('/')) {
      throw new AppError('Invalid image URL format', 400);
    }

    res.json({
      success: true,
      message: 'Image validated successfully',
      url: image,
      filename: filename || 'product-image.jpg',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/maintenance
 * List maintenance requests
 */
operationsRoutes.get('/maintenance', async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, urgency, search, page, limit } = req.query;
    const result = await listMaintenanceRequests({
      status: status as string,
      urgency: urgency as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({
      success: true,
      count: result.requests.length,
      pagination: result.pagination,
      data: result.requests,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/maintenance
 * Create a new maintenance request
 */
const createMaintenanceSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  orderId: z.string().optional(),
  patientId: z.string().optional(),
  patientName: z.string().optional(),
  patientPhone: z.string().optional(),
  reportedIssue: z.string().min(3, 'Reported issue description is required'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  scheduledDate: z.string().optional(),
  flagProductCondition: z.boolean().optional(),
});

operationsRoutes.post(
  '/maintenance',
  validateRequest({ body: createMaintenanceSchema }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const ticket = await createMaintenanceRequest(
        {
          productId: req.body.productId,
          orderId: req.body.orderId,
          patientId: req.body.patientId,
          patientName: req.body.patientName,
          patientPhone: req.body.patientPhone,
          reportedIssue: req.body.reportedIssue,
          urgency: req.body.urgency,
          scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
          flagProductCondition: req.body.flagProductCondition,
        },
        req.user!
      );

      res.status(201).json({
        success: true,
        message: `Maintenance ticket ${ticket.ticketNumber} created successfully`,
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/operations/maintenance/:id
 * Update maintenance request status and details
 */
operationsRoutes.patch('/maintenance/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const ticket = await updateMaintenanceRequest(
      req.params.id,
      {
        status: req.body.status,
        assignedStaffId: req.body.assignedStaffId,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
        diagnosis: req.body.diagnosis,
        actionTaken: req.body.actionTaken,
        partsUsed: req.body.partsUsed,
        resolutionNotes: req.body.resolutionNotes,
        notes: req.body.notes,
      },
      req.user!
    );

    res.json({
      success: true,
      message: `Maintenance ticket ${ticket.ticketNumber} updated`,
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/orders/:id/reserve-stock
 * Atomic inventory reservation for an order
 */
operationsRoutes.post('/orders/:id/reserve-stock', async (req: AuthRequest, res: Response, next) => {
  try {
    const order = await reserveOrderStock(req.params.id, req.user!);
    res.json({
      success: true,
      message: 'Order stock reserved and inventory locked successfully',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/orders/:id/supplier-confirmation
 * Request supplier fulfillment confirmation
 */
operationsRoutes.post('/orders/:id/supplier-confirmation', async (req: AuthRequest, res: Response, next) => {
  try {
    const order = await requestSupplierConfirmation(req.params.id, req.body.supplierId, req.user!);
    res.json({
      success: true,
      message: 'Supplier confirmation request transmitted',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/orders/:id/flag-delay
 * Flag delivery delay and notify patient
 */
operationsRoutes.post('/orders/:id/flag-delay', async (req: AuthRequest, res: Response, next) => {
  try {
    const { delayReason, revisedEstimatedDate, notes } = req.body;
    if (!delayReason || !revisedEstimatedDate) {
      throw new AppError('delayReason and revisedEstimatedDate are required', 400);
    }

    const order = await flagOrderDelay(
      req.params.id,
      {
        delayReason,
        revisedEstimatedDate: new Date(revisedEstimatedDate),
        notes,
      },
      req.user!
    );

    res.json({
      success: true,
      message: 'Delivery delay flagged and patient notified',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/sla-alerts
 * Live Delivery SLA monitoring (Overdue, At Risk, Due Soon)
 */
operationsRoutes.get('/sla-alerts', async (_req: AuthRequest, res: Response, next) => {
  try {
    const alerts = await getDeliverySlaAlerts();
    res.json({
      success: true,
      data: alerts,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/reschedule-requests
 * Patient reschedule requests queue
 */
operationsRoutes.get('/reschedule-requests', async (req: AuthRequest, res: Response, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const requests = await listRescheduleRequests(status);
    res.json({
      success: true,
      data: requests,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/orders/:id/reschedule-review
 * Review patient delivery reschedule request
 */
operationsRoutes.post('/orders/:id/reschedule-review', async (req: AuthRequest, res: Response, next) => {
  try {
    const { requestId, action, reason, alternativeDate, alternativeSlot } = req.body;
    if (!requestId || !action) {
      throw new AppError('requestId and action (approve|reject|propose_alternative) are required', 400);
    }

    const order = await reviewDeliveryReschedule(
      req.params.id,
      requestId,
      {
        action,
        reason,
        alternativeDate: alternativeDate ? new Date(alternativeDate) : undefined,
        alternativeSlot,
      },
      req.user!
    );

    res.json({
      success: true,
      message: `Delivery reschedule request ${action}ed`,
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/orders/:id/profitability
 * Itemized Contribution Margin & Reconciled vs Estimated Profitability
 */
operationsRoutes.get('/orders/:id/profitability', async (req: AuthRequest, res: Response, next) => {
  try {
    const profitability = await getOrderProfitability(req.params.id, req.user!);
    res.json({
      success: true,
      data: profitability,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/returns
 * Returns Workspace: list return requests
 */
operationsRoutes.get('/returns', async (req: AuthRequest, res: Response, next) => {
  try {
    const returns = await listOperationsReturns({
      returnStatus: typeof req.query.returnStatus === 'string' ? req.query.returnStatus : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    res.json({
      success: true,
      data: returns,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/orders/:id/returns/review
 * Approve or reject return request
 */
operationsRoutes.post('/orders/:id/returns/review', async (req: AuthRequest, res: Response, next) => {
  try {
    const { action, rejectionReason } = req.body;
    if (!action || (action !== 'approve' && action !== 'reject')) {
      throw new AppError('Valid action (approve|reject) is required', 400);
    }

    const order = await reviewReturnRequest(req.params.id, { action, rejectionReason }, req.user!);
    res.json({
      success: true,
      message: `Return request ${action}ed`,
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/orders/:id/returns/schedule-pickup
 * Schedule return pickup with assigned staff
 */
operationsRoutes.post('/orders/:id/returns/schedule-pickup', async (req: AuthRequest, res: Response, next) => {
  try {
    const { scheduledDate, assignedStaffId, notes } = req.body;
    if (!scheduledDate || !assignedStaffId) {
      throw new AppError('scheduledDate and assignedStaffId are required', 400);
    }

    const order = await scheduleReturnPickup(
      req.params.id,
      { scheduledDate: new Date(scheduledDate), assignedStaffId, notes },
      req.user!
    );
    res.json({
      success: true,
      message: 'Return pickup scheduled successfully',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/orders/:id/returns/pickup-outcome
 * Record return pickup handover checklist & proof
 */
operationsRoutes.post('/orders/:id/returns/pickup-outcome', async (req: AuthRequest, res: Response, next) => {
  try {
    const { pickupStatus, failureReason, pickupProofUrl, itemConditionChecklist, customerHandoverConfirmed } = req.body;
    if (!pickupStatus) {
      throw new AppError('pickupStatus is required', 400);
    }

    const order = await recordReturnPickupOutcome(
      req.params.id,
      {
        pickupStatus,
        failureReason,
        pickupProofUrl,
        itemConditionChecklist,
        customerHandoverConfirmed,
      },
      req.user!
    );
    res.json({
      success: true,
      message: 'Return pickup outcome recorded',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/orders/:id/returns/inspection
 * Technical inspection findings
 */
operationsRoutes.post('/orders/:id/returns/inspection', async (req: AuthRequest, res: Response, next) => {
  try {
    const { result, notes, photos } = req.body;
    if (!result) {
      throw new AppError('Technical inspection result is required', 400);
    }

    const order = await recordReturnInspection(req.params.id, { result, notes, photos }, req.user!);
    res.json({
      success: true,
      message: 'Inspection findings recorded',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/orders/:id/returns/resolution
 * Finalize return resolution (repair, replace, refund)
 */
operationsRoutes.post('/orders/:id/returns/resolution', async (req: AuthRequest, res: Response, next) => {
  try {
    const { type, refundAmount, notes } = req.body;
    if (!type) {
      throw new AppError('Resolution type is required', 400);
    }

    const order = await finalizeReturnResolution(req.params.id, { type, refundAmount, notes }, req.user!);
    res.json({
      success: true,
      message: 'Return resolution finalized',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/complaints
 * Operations complaints queue
 */
operationsRoutes.get('/complaints', async (req: AuthRequest, res: Response, next) => {
  try {
    const complaints = await listOperationsComplaints({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    res.json({
      success: true,
      data: complaints,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/operations/complaints/:id
 * Resolve or investigate a customer complaint
 */
operationsRoutes.patch('/complaints/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, resolutionNotes, refundAmount } = req.body;
    if (!status || !resolutionNotes) {
      throw new AppError('status and resolutionNotes are required', 400);
    }

    const complaint = await resolveComplaint(req.params.id, { status, resolutionNotes, refundAmount }, req.user!);
    res.json({
      success: true,
      message: 'Complaint updated',
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/reviews
 * Operations product reviews
 */
operationsRoutes.get('/reviews', async (req: AuthRequest, res: Response, next) => {
  try {
    const reviews = await listOperationsReviews({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    res.json({
      success: true,
      data: reviews,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/notifications
 * Actionable operations notifications and alerts
 */
operationsRoutes.get('/notifications', async (req: AuthRequest, res: Response, next) => {
  try {
    const { page, limit, unreadOnly } = req.query;
    const result = await getOperationsNotifications(req.user!, {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 15,
      unreadOnly: unreadOnly === 'true',
    });
    res.json({
      success: true,
      data: result.notifications,
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/operations/notifications/:id/read
 * Mark an operations notification as read
 */
operationsRoutes.patch('/notifications/:id/read', async (req: AuthRequest, res: Response, next) => {
  try {
    const notif = await markOperationsNotificationRead(req.params.id);
    res.json({
      success: true,
      data: notif,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/notifications/mark-all-read
 * Mark all operations notifications as read
 */
operationsRoutes.post('/notifications/mark-all-read', async (_req: AuthRequest, res: Response, next) => {
  try {
    const result = await markAllOperationsNotificationsRead();
    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ============================================================================
 * INVENTORY & STOCK MANAGEMENT ENDPOINTS (Phase 16)
 * ============================================================================
 */

/**
 * GET /api/v1/operations/inventory/summary
 * Database-backed KPI metrics for inventory
 */
operationsRoutes.get('/inventory/summary', async (_req: AuthRequest, res: Response, next) => {
  try {
    const summary = await getInventorySummary();
    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/inventory/products
 * Searchable, filterable, paginated inventory products (default 10/page)
 */
operationsRoutes.get('/inventory/products', async (req: AuthRequest, res: Response, next) => {
  try {
    const { search, category, sourcingType, stockStatus, page, limit, sortBy } = req.query;
    const result = await listInventoryProducts(
      {
        search: search as string,
        category: category as string,
        sourcingType: sourcingType as string,
        stockStatus: stockStatus as any,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        sortBy: sortBy as any,
      },
      req.user
    );

    res.json({
      success: true,
      data: result.products,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/inventory/products/:id/adjust-stock
 * Dedicated auditable stock adjustment action
 */
operationsRoutes.post('/inventory/products/:id/adjust-stock', async (req: AuthRequest, res: Response, next) => {
  try {
    const { newQuantity, reason, movementType, notes } = req.body;
    const result = await adjustStockQuantity(
      req.params.id,
      {
        newQuantity,
        reason,
        movementType,
        notes,
      },
      {
        id: req.user?.id,
        fullName: req.user?.fullName,
        role: req.user?.role,
      }
    );

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/inventory/adjust (alias for compatibility)
 */
operationsRoutes.post('/inventory/adjust', async (req: AuthRequest, res: Response, next) => {
  try {
    const { productId, newQuantity, reason, movementType, notes } = req.body;
    if (!productId) {
      throw new AppError('productId is required for stock adjustment', 400);
    }
    const result = await adjustStockQuantity(
      productId,
      {
        newQuantity,
        reason,
        movementType,
        notes,
      },
      {
        id: req.user?.id,
        fullName: req.user?.fullName,
        role: req.user?.role,
      }
    );

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/inventory/products/:id/confirm-supplier
 * Confirm third-party supplier reported availability
 */
operationsRoutes.post('/inventory/products/:id/confirm-supplier', async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, leadTimeDays, notes } = req.body;
    const result = await confirmSupplierAvailability(
      req.params.id,
      {
        status,
        leadTimeDays,
        notes,
      },
      {
        id: req.user?.id,
        fullName: req.user?.fullName,
        role: req.user?.role,
      }
    );

    res.json({
      success: true,
      message: 'Supplier availability updated successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operations/inventory/products/:id/create-reorder-po
 * Create / review purchase order for low-stock product
 */
operationsRoutes.post('/inventory/products/:id/create-reorder-po', async (req: AuthRequest, res: Response, next) => {
  try {
    const { quantity, unitCost, supplierId, notes } = req.body;
    const result = await createRestockPurchaseOrder(
      req.params.id,
      {
        quantity,
        unitCost,
        supplierId,
        notes,
      },
      {
        id: req.user?.id,
        fullName: req.user?.fullName,
        role: req.user?.role,
      }
    );

    res.json({
      success: true,
      message: 'Restock Purchase Order created for review',
      data: result.purchaseOrder,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/inventory/products/:id/movements
 * Immutable audit trail of stock movements for a product
 */
operationsRoutes.get('/inventory/products/:id/movements', async (req: AuthRequest, res: Response, next) => {
  try {
    const { page, limit } = req.query;
    const result = await getProductStockMovements(
      req.params.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );

    res.json({
      success: true,
      data: result.movements,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operations/inventory/movements/:id (alias)
 */
operationsRoutes.get('/inventory/movements/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const { page, limit } = req.query;
    const result = await getProductStockMovements(
      req.params.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );

    res.json({
      success: true,
      data: result.movements,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

