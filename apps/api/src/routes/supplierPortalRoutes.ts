import { Router, Response, NextFunction } from 'express';
import { authenticateUser, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  getSupplierProfile,
  updateSupplierProfile,
  listSupplierProducts,
  createSupplierProduct,
  updateSupplierProduct,
  listSupplierOrders,
  acceptSupplierOrder,
  rejectSupplierOrder,
  dispatchSupplierOrder,
  getSupplierSettlementSummary,
  listSupplierComplaints,
  respondToSupplierComplaint,
} from '../services/supplierPortalService.js';
import { updateOrderDeliveryEstimate } from '../services/productCatalogService.js';

export const supplierPortalRoutes = Router();

// Enforce authentication and supplier/admin role on all portal routes
supplierPortalRoutes.use(authenticateUser, requireRole(['supplier', 'admin', 'super_admin']));

/**
 * GET /api/v1/supplier/profile
 * Get authenticated supplier's company and banking profile
 */
supplierPortalRoutes.get('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await getSupplierProfile(req.userPayload!.userId);
    res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/supplier/profile
 * Update authorized supplier profile details
 */
supplierPortalRoutes.put('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await updateSupplierProfile(req.userPayload!.userId, req.body);
    res.json({
      success: true,
      message: 'Supplier profile updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/supplier/products
 * List only products belonging to this supplier
 */
supplierPortalRoutes.get('/products', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, category, status, page, limit } = req.query;
    const result = await listSupplierProducts(req.userPayload!.userId, {
      search: search as string,
      category: category as string,
      status: status as string,
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
 * POST /api/v1/supplier/products
 * Add new supplier product to marketplace catalog
 */
supplierPortalRoutes.post('/products', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await createSupplierProduct(req.userPayload!.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Supplier product created successfully',
      data: product,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/supplier/products/:id
 * Update product stock, pricing, and details (ownership enforced)
 */
supplierPortalRoutes.put('/products/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await updateSupplierProduct(req.userPayload!.userId, req.params.id, req.body);
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
 * PATCH /api/v1/supplier/products/:id/inventory
 * Quick inventory / stock quantity adjustment
 */
supplierPortalRoutes.patch('/products/:id/inventory', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { stockQuantity } = req.body;
    const updated = await updateSupplierProduct(req.userPayload!.userId, req.params.id, { stockQuantity });
    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/supplier/orders
 * List orders containing items assigned to this supplier
 */
supplierPortalRoutes.get('/orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, page, limit } = req.query;
    const result = await listSupplierOrders(req.userPayload!.userId, {
      status: status as string,
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
 * POST /api/v1/supplier/orders/:id/accept
 * Accept fulfillment for assigned order items
 */
supplierPortalRoutes.post('/orders/:id/accept', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await acceptSupplierOrder(req.userPayload!.userId, req.params.id);
    res.json({
      success: true,
      message: 'Order fulfillment accepted',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/supplier/orders/:id/reject
 * Reject fulfillment for assigned order items with mandatory reason
 */
supplierPortalRoutes.post('/orders/:id/reject', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const order = await rejectSupplierOrder(req.userPayload!.userId, req.params.id, reason);
    res.json({
      success: true,
      message: 'Order fulfillment rejected and routed to operations',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/supplier/orders/:id/dispatch
 * Submit carrier name and tracking number for dispatched items
 */
supplierPortalRoutes.post('/orders/:id/dispatch', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { carrierName, trackingNumber, notes } = req.body;
    const order = await dispatchSupplierOrder(req.userPayload!.userId, req.params.id, {
      carrierName,
      trackingNumber,
      notes,
    });

    res.json({
      success: true,
      message: 'Order items marked as dispatched with tracking reference',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/supplier/orders/:id/delivery-estimate
 * Allow supplier to update delivery estimate for their assigned orders
 */
supplierPortalRoutes.patch('/orders/:id/delivery-estimate', async (req: AuthRequest, res: Response, next: NextFunction) => {
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
});

/**
 * GET /api/v1/supplier/settlements
 * Financial settlement breakdown, platform commissions, and purchase orders
 */
supplierPortalRoutes.get('/settlements', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settlements = await getSupplierSettlementSummary(req.userPayload!.userId);
    res.json({
      success: true,
      data: settlements,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/supplier/complaints
 * List customer complaints routed to this supplier
 */
supplierPortalRoutes.get('/complaints', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const complaints = await listSupplierComplaints(req.userPayload!.userId);
    res.json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/supplier/complaints/:id/respond
 * Submit supplier explanation / resolution response
 */
supplierPortalRoutes.post('/complaints/:id/respond', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const responseText = req.body.response || req.body.responseMessage;
    const complaint = await respondToSupplierComplaint(req.userPayload!.userId, req.params.id, responseText);
    res.json({
      success: true,
      message: 'Supplier response recorded',
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
});
