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
} from '../services/operationsService.js';

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
 * List orders with search, status, and sourcing filters
 */
operationsRoutes.get('/orders', async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, sourcingType, search, assignedStaffId, setupRequired, failedOnly, page, limit } = req.query;
    const result = await listOperationsOrders(
      {
        status: status as string,
        sourcingType: sourcingType as any,
        search: search as string,
        assignedStaffId: assignedStaffId as string,
        setupRequired: setupRequired === 'true',
        failedOnly: failedOnly === 'true',
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      },
      req.user!
    );

    res.json({
      success: true,
      count: result.orders.length,
      pagination: result.pagination,
      data: result.orders,
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

