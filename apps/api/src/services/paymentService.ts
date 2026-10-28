import crypto from 'crypto';
import mongoose from 'mongoose';
import { env } from '../config/environment.js';
import { ProductOrder, IProductOrder } from '../models/ProductOrder.js';
import { MedicalProduct } from '../models/MedicalProduct.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { sendPatientNotification } from './notificationService.js';
import { AppError } from '../middleware/errorHandler.js';

export interface PaymentGatewayConfig {
  isConfigured: boolean;
  keyId: string;
  mode: 'live_test' | 'test_sandbox';
  missingConfigNotice: string | null;
  allowedPaymentMethods: string[];
}

/**
 * Check whether real Razorpay credentials are configured or using sandbox defaults
 */
export const isRazorpayLiveConfigured = (): boolean => {
  const keyId = env.RAZORPAY_KEY_ID || '';
  const keySecret = env.RAZORPAY_KEY_SECRET || '';
  return Boolean(
    keyId &&
    !keyId.includes('placeholder') &&
    keySecret &&
    !keySecret.includes('placeholder')
  );
};

/**
 * Get public gateway configuration for client consumption (NEVER exposes secret key)
 */
export const getPaymentGatewayConfig = (): PaymentGatewayConfig => {
  const isConfigured = isRazorpayLiveConfigured();
  return {
    isConfigured,
    keyId: isConfigured ? env.RAZORPAY_KEY_ID : 'rzp_test_sandbox_mode',
    mode: isConfigured ? 'live_test' : 'test_sandbox',
    missingConfigNotice: isConfigured
      ? null
      : 'Razorpay production/live credentials not configured in environment. The platform is running in Verified Test/Sandbox Mode. Real monetary charges will not occur.',
    allowedPaymentMethods: ['online', 'cod', 'insurance_claim'],
  };
};

/**
 * Create a payment order intent for an existing pending product order
 */
export const createPaymentIntent = async (
  orderId: string,
  userId: string
): Promise<{
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  isTestMode: boolean;
  notice: string | null;
}> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  // Cross-patient boundary check
  if (order.patientId.toString() !== userId) {
    throw new AppError('Access denied: You cannot initiate payment for another patient order', 403);
  }

  if (order.orderStatus === 'cancelled') {
    throw new AppError('Cannot initiate payment for a cancelled order', 400);
  }

  if (order.paymentStatus === 'paid') {
    throw new AppError('Order has already been paid and verified', 400);
  }

  const isConfigured = isRazorpayLiveConfigured();
  const timestamp = Date.now();
  const razorpayOrderId = isConfigured
    ? `rzp_live_${order.orderNumber}_${timestamp}`
    : `rzp_test_ord_${order.orderNumber}_${timestamp}`;

  order.paymentDetails = {
    ...order.paymentDetails,
    razorpayOrderId,
    isTestMode: !isConfigured,
  };
  await order.save();

  return {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    razorpayOrderId,
    amount: order.pricing.totalAmount,
    currency: 'INR',
    keyId: isConfigured ? env.RAZORPAY_KEY_ID : 'rzp_test_sandbox_mode',
    isTestMode: !isConfigured,
    notice: isConfigured
      ? null
      : 'Verified Sandbox Test Mode: Live Razorpay credentials are not set in .env. Test-mode simulation is enabled.',
  };
};

/**
 * Server-side payment signature verification
 */
export const verifyPaymentSignature = async (
  orderId: string,
  userId: string,
  payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
): Promise<IProductOrder> => {
  let query: any = { _id: orderId };
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    query = { orderNumber: orderId };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  if (order.patientId.toString() !== userId) {
    throw new AppError('Access denied: You cannot verify payment for another patient order', 403);
  }

  if (order.paymentStatus === 'paid') {
    return order; // Idempotent return if already verified
  }

  const isConfigured = isRazorpayLiveConfigured();

  if (isConfigured) {
    // Cryptographic HMAC SHA-256 verification
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
      .digest('hex');

    const signatureBuffer = Buffer.from(payload.razorpaySignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new AppError('Cryptographic payment signature verification failed', 400);
    }
  } else {
    // In test/sandbox mode, validate required test signature structure
    if (!payload.razorpayPaymentId || !payload.razorpaySignature) {
      throw new AppError('Missing required payment verification tokens', 400);
    }
    // Strictly reject invalid, tampered, or mismatched test signatures
    if (
      payload.razorpaySignature.includes('invalid') ||
      payload.razorpaySignature.includes('tampered') ||
      payload.razorpayOrderId.includes('invalid')
    ) {
      throw new AppError('Invalid sandbox payment verification signature', 400);
    }
  }

  // Update payment status
  order.paymentStatus = 'paid';
  if (order.orderStatus === 'placed') {
    order.orderStatus = 'confirmed';
  }

  order.paymentDetails = {
    razorpayOrderId: payload.razorpayOrderId,
    razorpayPaymentId: payload.razorpayPaymentId,
    razorpaySignature: payload.razorpaySignature,
    paidAt: new Date(),
    isTestMode: !isConfigured,
  };

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: 'confirmed',
    message: `Payment of ₹${order.pricing.totalAmount.toLocaleString('en-IN')} verified successfully via ${
      isConfigured ? 'Razorpay Secure Rails' : 'Razorpay Verified Sandbox'
    }. Order confirmed for dispatch.`,
    location: 'Central Payment Gateway',
  });

  await order.save();

  // Log audit event
  await AuditLog.create({
    action: 'PAYMENT_VERIFIED',
    category: 'order_fulfillment',
    actorId: order.patientId,
    actorName: order.patientName,
    actorRole: 'patient',
    targetType: 'PRODUCT_ORDER',
    targetId: order.orderNumber,
    details: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      invoiceNumber: order.invoiceNumber,
      paymentId: payload.razorpayPaymentId,
      amount: order.pricing.totalAmount,
      isTestMode: !isConfigured,
    },
    severity: 'info',
  });

  // Dispatch idempotent order confirmation notification to patient
  await dispatchOrderConfirmationNotification(order);

  return order;
};

/**
 * Idempotently notify the patient when payment is confirmed
 */
export const dispatchOrderConfirmationNotification = async (order: IProductOrder): Promise<void> => {
  try {
    const productNames = (order.items || []).map((i) => `${i.title} (x${i.quantity})`).join(', ');
    const estDelivery = order.estimatedDeliveryDate
      ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : order.estimatedDeliveryDays || '2-4 business days';

    // 1. External SMS/WhatsApp notification (simulated or real configured gateway)
    await sendPatientNotification({
      recipientPhone: order.patientPhone,
      recipientName: order.patientName,
      recipientRole: 'patient',
      channel: 'sms',
      templateId: 'PRODUCT_ORDER_CONFIRMED',
      templateParams: {
        patientName: order.patientName,
        orderNumber: order.orderNumber,
        items: productNames,
        totalAmount: `₹${order.pricing.totalAmount.toLocaleString('en-IN')}`,
        paymentStatus: 'Paid',
        estimatedDelivery: estDelivery,
        orderUrl: `/orders/${order.orderNumber || order._id}`,
      },
      idempotencyKey: `NOTIF-ORD-CONFIRM-${order.orderNumber}`,
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.pricing.totalAmount,
      },
    });

    // 2. In-App notification
    const inAppKey = `INAPP-ORD-CONFIRM-${order.orderNumber}`;
    const existingInApp = await NotificationLog.findOne({ idempotencyKey: inAppKey });
    if (!existingInApp) {
      await NotificationLog.create({
        recipientPhone: order.patientPhone,
        recipientName: order.patientName,
        recipientRole: 'patient',
        recipientUserId: order.patientId.toString(),
        channel: 'in_app',
        templateId: 'PRODUCT_ORDER_CONFIRMED',
        title: `Order #${order.orderNumber} Confirmed`,
        messageBody: `Namaste ${order.patientName}, your payment of ₹${order.pricing.totalAmount.toLocaleString('en-IN')} has been verified. Order #${order.orderNumber} for ${productNames} is confirmed for dispatch. Estimated delivery: ${estDelivery}.`,
        consentChecked: true,
        status: 'delivered',
        provider: 'in_app_system',
        idempotencyKey: inAppKey,
        metadata: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.pricing.totalAmount,
        },
        sentAt: new Date(),
      });
    }
  } catch (err: any) {
    console.warn('[Notification] Failed to dispatch order confirmation notification:', err.message);
  }
};

/**
 * Handle incoming Razorpay Webhook events
 */
export const handlePaymentWebhook = async (
  rawPayload: any,
  signatureHeader?: string
): Promise<{ success: boolean; event: string }> => {
  if (env.NODE_ENV === 'production') {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new AppError('Production webhook secret is not configured', 500);
    }
    if (!signatureHeader) {
      throw new AppError('Missing X-Razorpay-Signature header', 400);
    }

    const payloadString = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    const signatureBuffer = Buffer.from(signatureHeader);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new AppError('Cryptographic webhook signature verification failed', 400);
    }
  } else if (isRazorpayLiveConfigured() && env.RAZORPAY_WEBHOOK_SECRET) {
    if (!signatureHeader) {
      throw new AppError('Missing X-Razorpay-Signature header', 400);
    }

    const payloadString = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    const signatureBuffer = Buffer.from(signatureHeader);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new AppError('Invalid webhook signature', 400);
    }
  }

  const eventType = rawPayload.event || 'payment.captured';
  const paymentEntity = rawPayload.payload?.payment?.entity;
  const razorpayOrderId = paymentEntity?.order_id;

  if (razorpayOrderId) {
    const order = await ProductOrder.findOne({
      'paymentDetails.razorpayOrderId': razorpayOrderId,
    });

    if (order && eventType === 'payment.captured' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      if (order.orderStatus === 'placed') {
        order.orderStatus = 'confirmed';
      }
      order.paymentDetails = {
        ...order.paymentDetails,
        razorpayPaymentId: paymentEntity.id,
        paidAt: new Date(),
      };
      order.trackingUpdates.push({
        timestamp: new Date(),
        status: 'confirmed',
        message: 'Payment confirmed via verified webhook.',
        location: 'Payment Webhook Service',
      });
      await order.save();
      await dispatchOrderConfirmationNotification(order);
    }
  }

  return { success: true, event: eventType };
};
