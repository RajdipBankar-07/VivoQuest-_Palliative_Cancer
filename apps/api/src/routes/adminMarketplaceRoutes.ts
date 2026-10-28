import { Router, Response, NextFunction } from 'express';
import { authenticateUser, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  getMarketplaceMetricsAdmin,
  listMarketplaceProductsAdmin,
  createProductAdmin,
  updateProductAdmin,
  archiveProductAdmin,
  deleteProductAdmin,
  listMarketplaceReviewsAdmin,
  moderateReviewAdmin,
  listMarketplaceComplaintsAdmin,
  resolveComplaintAdmin,
  listMarketplaceInstallationsAdmin,
} from '../services/adminMarketplaceService.js';
import {
  assignInstallationSpecialistAdmin,
  listProductOrdersAdmin,
  getOrderDetailsAdmin,
} from '../services/adminService.js';
import { updateOrderDeliveryEstimate } from '../services/productCatalogService.js';

export const adminMarketplaceRoutes = Router();

// Strictly enforce Admin RBAC for all marketplace management endpoints
adminMarketplaceRoutes.use(authenticateUser, requireRole(['admin', 'super_admin']));

/**
 * GET /api/v1/admin/marketplace/metrics
 * Comprehensive marketplace analytics with separate own vs supplier metrics
 */
adminMarketplaceRoutes.get('/metrics', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const metrics = await getMarketplaceMetricsAdmin();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/marketplace/products
 * List products catalog with low-stock warnings, search, and sourcing filters
 */
adminMarketplaceRoutes.get('/products', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, category, sourcingType, status, lowStockOnly, page, limit } = req.query;
    const result = await listMarketplaceProductsAdmin({
      search: search as string,
      category: category as string,
      sourcingType: sourcingType as string,
      status: status as string,
      lowStockOnly: lowStockOnly === 'true',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({
      success: true,
      count: result.products.length,
      pagination: result.pagination,
      data: result.products,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/marketplace/products
 * Create a new product with pricing, discount, stock, image alt text, and installation rules
 */
adminMarketplaceRoutes.post('/products', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await createProductAdmin(req.body, req.user!);
    res.status(201).json({
      success: true,
      message: 'Product created successfully in marketplace catalog',
      data: product,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/marketplace/products/:id
 * Edit product specifications, pricing, stock, or installation eligibility
 */
adminMarketplaceRoutes.put('/products/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await updateProductAdmin(req.params.id, req.body, req.user!);
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/admin/marketplace/products/:id
 * Permanent delete if safe (no orders); safe archive/deactivate if historical orders exist
 */
adminMarketplaceRoutes.delete('/products/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await deleteProductAdmin(req.params.id, req.user!);
    res.json({
      success: true,
      action: result.action,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/marketplace/reviews
 * List customer product reviews for moderation
 */
adminMarketplaceRoutes.get('/reviews', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, productId, page, limit } = req.query;
    const result = await listMarketplaceReviewsAdmin({
      status: status as string,
      productId: productId as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({
      success: true,
      count: result.reviews.length,
      pagination: result.pagination,
      data: result.reviews,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/marketplace/reviews/:id/moderate
 * Publish or reject customer review
 */
adminMarketplaceRoutes.put('/reviews/:id/moderate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, notes } = req.body;
    const updated = await moderateReviewAdmin(req.params.id, status, notes, req.user!);
    res.json({
      success: true,
      message: `Review ${status === 'published' ? 'published' : 'rejected'} successfully`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/marketplace/complaints
 * List customer complaints across own and supplier products
 */
adminMarketplaceRoutes.get('/complaints', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, category, supplierId, page, limit } = req.query;
    const result = await listMarketplaceComplaintsAdmin({
      status: status as string,
      category: category as string,
      supplierId: supplierId as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({
      success: true,
      count: result.complaints.length,
      pagination: result.pagination,
      data: result.complaints,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/marketplace/complaints/:id/resolve
 * Resolve customer complaint with notes and optional refund authorization
 */
adminMarketplaceRoutes.put('/complaints/:id/resolve', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { resolutionNotes, refundApproved, refundAmount } = req.body;
    const resolved = await resolveComplaintAdmin(
      req.params.id,
      { resolutionNotes, refundApproved, refundAmount },
      req.user!
    );

    res.json({
      success: true,
      message: 'Complaint resolved successfully',
      data: resolved,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/marketplace/installations
 * List orders requiring home installation services
 */
adminMarketplaceRoutes.get('/installations', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { setupStatus, page, limit } = req.query;
    const result = await listMarketplaceInstallationsAdmin({
      setupStatus: setupStatus as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({
      success: true,
      count: result.installations.length,
      pagination: result.pagination,
      data: result.installations,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/admin/marketplace/installations/:id/assign
 * Assign specialist/technician for clinical home installation
 */
adminMarketplaceRoutes.put('/installations/:id/assign', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { specialistId, specialistName, setupDate, setupNotes, setupStatus } = req.body;
    const updated = await assignInstallationSpecialistAdmin(
      req.params.id,
      { specialistId, specialistName, setupDate, setupNotes, setupStatus },
      req.user!
    );

    res.json({
      success: true,
      message: 'Installation specialist assigned successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/marketplace/orders
 * List medical equipment orders with fulfillment, payment, and delivery estimate info
 */
adminMarketplaceRoutes.get('/orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
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
});

/**
 * GET /api/v1/admin/marketplace/orders/:id
 * Retrieve single order details with tracking history and delivery estimate audit log
 */
adminMarketplaceRoutes.get('/orders/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await getOrderDetailsAdmin(req.params.id);
    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/admin/marketplace/orders/:id/delivery-estimate
 * Update estimated delivery date with mandatory reason, tracking update, and patient notification
 */
adminMarketplaceRoutes.patch('/orders/:id/delivery-estimate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { estimatedDeliveryDate, reason } = req.body;
    const updated = await updateOrderDeliveryEstimate(
      req.params.id,
      { estimatedDeliveryDate, reason },
      req.user!
    );

    res.json({
      success: true,
      message: 'Estimated delivery date updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});
