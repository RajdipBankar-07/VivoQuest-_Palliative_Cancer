import { Router, Request, Response, NextFunction } from 'express';
import {
  listMedicalProducts,
  getMedicalProductById,
  createProductOrder,
  getPatientOrders,
  getOrderById,
  seedMedicalProductsIfEmpty,
  getPatientCart,
  savePatientCart,
  validateCartItems,
  clearPatientCart,
  cancelPatientOrder,
  requestOrderReturn,
  scheduleOrderSetup,
} from '../services/productCatalogService.js';
import {
  getPaymentGatewayConfig,
  createPaymentIntent,
  verifyPaymentSignature,
  handlePaymentWebhook,
} from '../services/paymentService.js';
import { authenticateUser, AuthRequest } from '../middleware/auth.js';

export const productRoutes = Router();

// Ensure products catalog is initialized on first request
productRoutes.use(async (_req, _res, next) => {
  try {
    await seedMedicalProductsIfEmpty();
    next();
  } catch {
    next();
  }
});

/**
 * GET /api/v1/products/categories
 * Returns all medical product and DME categories
 */
productRoutes.get('/categories', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'all', label: 'All Products & Equipment' },
      { id: 'mobility', label: 'Mobility Aids & Wheelchairs' },
      { id: 'respiratory', label: 'Respiratory & Oxygen Therapy' },
      { id: 'monitoring_diagnostics', label: 'Monitoring Devices & Vitals' },
      { id: 'icu_home_setup', label: 'Specialized Beds & ICU Setup' },
      { id: 'clinical_nutrition', label: 'Clinical Nutrition & Formulas' },
      { id: 'fall_prevention', label: 'Fall Hazard Mitigation (SDoH)' },
      { id: 'wound_care', label: 'Post-Op Wound Dressings' },
    ],
  });
});

/**
 * GET /api/v1/products
 * List medical products with filtering, search, and pagination
 */
productRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, rentalOnly, inStockOnly, page, limit } = req.query;

    const result = await listMedicalProducts({
      category: category as string,
      search: search as string,
      rentalOnly: rentalOnly === 'true',
      inStockOnly: inStockOnly === 'true',
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

// =============================================================================
// SHOPPING CART ROUTES (Revalidation & Persistence)
// =============================================================================

/**
 * POST /api/v1/products/cart/validate
 * Public / pre-checkout server-side price and stock revalidation
 * Never trusts client prices or stock values
 */
productRoutes.post('/cart/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedCart = await validateCartItems(req.body.items || []);
    res.json({
      success: true,
      data: validatedCart,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/products/cart
 * Fetch authenticated patient's persistent cart with fresh stock and price revalidation
 */
productRoutes.get(
  '/cart',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const cart = await getPatientCart(req.userPayload!.userId);
      res.json({
        success: true,
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/products/cart
 * Update authenticated patient's persistent cart
 */
productRoutes.put(
  '/cart',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const cart = await savePatientCart(req.userPayload!.userId, req.body.items || []);
      res.json({
        success: true,
        message: 'Cart updated and revalidated successfully',
        data: cart,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/products/cart
 * Clear authenticated patient's cart
 */
productRoutes.delete(
  '/cart',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await clearPatientCart(req.userPayload!.userId);
      res.json({
        success: true,
        message: 'Cart cleared successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================================
// PAYMENT INTEGRATION ROUTES
// =============================================================================

/**
 * GET /api/v1/products/payments/config
 * Public configuration interface for Razorpay / sandbox test gateway
 */
productRoutes.get('/payments/config', (_req: Request, res: Response) => {
  const config = getPaymentGatewayConfig();
  res.json({
    success: true,
    data: config,
  });
});

/**
 * POST /api/v1/products/payments/create-intent
 * Create Razorpay / test payment order intent for an existing pending order
 */
productRoutes.post(
  '/payments/create-intent',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.body;
      const intent = await createPaymentIntent(orderId, req.userPayload!.userId);
      res.json({
        success: true,
        data: intent,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/products/payments/verify
 * Server-side cryptographic payment verification
 */
productRoutes.post(
  '/payments/verify',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const order = await verifyPaymentSignature(orderId, req.userPayload!.userId, {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      res.json({
        success: true,
        message: 'Payment verified successfully. Order confirmed for fulfillment.',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/products/payments/webhook
 * Razorpay verified webhook endpoint
 */
productRoutes.post('/payments/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const result = await handlePaymentWebhook(req.body, signature);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// ORDER MANAGEMENT & TRACKING ROUTES
// =============================================================================

/**
 * GET /api/v1/products/orders/me
 * List orders for the authenticated patient
 */
productRoutes.get(
  '/orders/me',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orders = await getPatientOrders(req.userPayload!.userId);
      res.json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/products/orders
 * Place a new medical equipment order or rental request
 */
productRoutes.post(
  '/orders',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const order = await createProductOrder(req.userPayload!.userId, {
        ...req.body,
        patientName: req.user!.fullName,
        patientPhone: req.user!.phone,
        patientEmail: req.user!.email,
      });

      const statusCode = (order as any).isExisting ? 200 : 201;

      res.status(statusCode).json({
        success: true,
        message: (order as any).isExisting
          ? 'Existing order retrieved (idempotent submission).'
          : 'Order placed successfully. Tracking updates are active.',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/products/orders/:idOrNumber
 * Get single order details with tracking updates
 */
productRoutes.get(
  '/orders/:idOrNumber',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const order = await getOrderById(req.params.idOrNumber, req.userPayload!.userId);
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
 * POST /api/v1/products/orders/:idOrNumber/cancel
 * Cancel order under defined policy rules (placed or confirmed only)
 */
productRoutes.post(
  '/orders/:idOrNumber/cancel',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body;
      const order = await cancelPatientOrder(
        req.params.idOrNumber,
        req.userPayload!.userId,
        reason
      );

      res.json({
        success: true,
        message: 'Order cancelled successfully and inventory restored',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/products/orders/:idOrNumber/return-request
 * Request return for delivered medical equipment
 */
productRoutes.post(
  '/orders/:idOrNumber/return-request',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body;
      const order = await requestOrderReturn(
        req.params.idOrNumber,
        req.userPayload!.userId,
        reason
      );

      res.json({
        success: true,
        message: 'Return pickup request submitted for review',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/products/orders/:idOrNumber/setup-schedule
 * Schedule or update clinician setup visit for equipment requiring installation
 */
productRoutes.patch(
  '/orders/:idOrNumber/setup-schedule',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { setupDate, setupSlot, setupNotes } = req.body;
      const order = await scheduleOrderSetup(
        req.params.idOrNumber,
        req.userPayload!.userId,
        { setupDate, setupSlot, setupNotes }
      );

      res.json({
        success: true,
        message: 'Clinician setup appointment scheduled successfully',
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/products/:idOrSku
 * Get single product by Mongo ID or SKU
 */
productRoutes.get('/:idOrSku', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await getMedicalProductById(req.params.idOrSku);
    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
});
