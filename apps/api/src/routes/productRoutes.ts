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
  requestOrderDeliveryReschedule,
  scheduleOrderSetup,
  submitProductReview,
  listProductReviews,
  submitProductComplaint,
  listPatientComplaints,
  updateOrderDeliveryEstimate,
  submitDeliveryRating,
} from '../services/productCatalogService.js';
import { DeliveryRating } from '../models/DeliveryRating.js';
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
    const { category, search, rentalOnly, inStockOnly, sourcingType, installationOnly, status, sort, page, limit } = req.query;

    const result = await listMedicalProducts({
      category: category as string,
      search: search as string,
      rentalOnly: rentalOnly === 'true',
      inStockOnly: inStockOnly === 'true',
      sourcingType: sourcingType as string,
      installationOnly: installationOnly === 'true',
      status: status as string,
      sort: sort as string,
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
 * GET /api/v1/products/orders
 * List orders for the authenticated patient, with optional status filter
 */
productRoutes.get(
  '/orders',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.query;
      let orders = await getPatientOrders(req.userPayload!.userId);
      if (status && typeof status === 'string' && status !== 'all') {
        orders = orders.filter((o: any) => o.orderStatus === status);
      }
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
 * GET /api/v1/products/orders/me
 * List orders for the authenticated patient
 */
productRoutes.get(
  '/orders/me',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.query;
      let orders = await getPatientOrders(req.userPayload!.userId);
      if (status && typeof status === 'string' && status !== 'all') {
        orders = orders.filter((o: any) => o.orderStatus === status);
      }
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
 * POST /api/v1/products/orders/:idOrNumber/reschedule-request
 * Request delivery rescheduling for an in-progress order
 */
productRoutes.post(
  '/orders/:idOrNumber/reschedule-request',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { requestedDate, timeSlot, reason } = req.body;
      const order = await requestOrderDeliveryReschedule(
        req.params.idOrNumber,
        req.userPayload!.userId,
        { requestedDate, timeSlot, reason }
      );

      res.json({
        success: true,
        message: 'Delivery reschedule request submitted for operations review',
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
      const setupDate = req.body.setupDate || req.body.preferredDate;
      const setupSlot = req.body.setupSlot || req.body.preferredSlot || req.body.preferredTimeSlot;
      const setupNotes = req.body.setupNotes || req.body.notes;
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
 * PATCH /api/v1/products/orders/:idOrNumber/delivery-estimate
 * Attempt to update delivery estimate - guarded by strict RBAC in updateOrderDeliveryEstimate
 */
productRoutes.patch(
  '/orders/:idOrNumber/delivery-estimate',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { estimatedDeliveryDate, reason } = req.body;
      const order = await updateOrderDeliveryEstimate(
        req.params.idOrNumber,
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

// =============================================================================
// REVIEWS & COMPLAINTS ROUTES
// =============================================================================

/**
 * GET /api/v1/products/complaints/my
 * List complaints filed by authenticated patient
 */
productRoutes.get(
  '/complaints/my',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const complaints = await listPatientComplaints(req.userPayload!.userId);
      res.json({
        success: true,
        count: complaints.length,
        data: complaints,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/products/orders/:idOrNumber/complaints
 * Submit complaint for an order item
 */
productRoutes.post(
  '/orders/:idOrNumber/complaints',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productId, category, description, refundRequested } = req.body;
      const complaint = await submitProductComplaint(
        req.userPayload!.userId,
        {
          name: req.user?.fullName || '',
          phone: req.user?.phone || '',
          email: req.user?.email,
        },
        {
          orderId: req.params.idOrNumber,
          productId,
          category,
          description,
          refundRequested,
        }
      );

      res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully and forwarded to quality operations',
        data: complaint,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/products/:id/reviews
 * List published reviews for a product
 */
productRoutes.get('/:id/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await listProductReviews(req.params.id, page, limit);

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
 * POST /api/v1/products/:id/reviews
 * Submit verified product review for delivered order with optional issue reporting
 */
productRoutes.post(
  '/:id/reviews',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, rating, title, comment, hasIssueReported, issueCategory, issueDetails } = req.body;
      const review = await submitProductReview(
        req.userPayload!.userId,
        req.user?.fullName || '',
        req.params.id,
        { orderId, rating, title, comment, hasIssueReported, issueCategory, issueDetails }
      );

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/products/orders/:idOrNumber/delivery-rating
 * Submit verified delivery experience rating (1 to 5 stars)
 */
productRoutes.post(
  '/orders/:idOrNumber/delivery-rating',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { rating, punctualityRating, communicationRating, handlingRating, feedback } = req.body;
      const deliveryRating = await submitDeliveryRating(
        req.userPayload!.userId,
        req.user?.fullName || '',
        req.params.idOrNumber,
        { rating, punctualityRating, communicationRating, handlingRating, feedback }
      );

      res.status(201).json({
        success: true,
        message: 'Delivery experience rated successfully',
        data: deliveryRating,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/products/orders/:idOrNumber/delivery-rating
 * Get delivery rating for an order
 */
productRoutes.get(
  '/orders/:idOrNumber/delivery-rating',
  authenticateUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const rating = await DeliveryRating.findOne({
        $or: [{ orderId: req.params.idOrNumber }, { orderNumber: req.params.idOrNumber }],
        patientId: req.userPayload!.userId,
      }).lean();

      res.json({
        success: true,
        data: rating,
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
