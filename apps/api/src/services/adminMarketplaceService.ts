import mongoose from 'mongoose';
import { MedicalProduct, IMedicalProduct, ProductCategory, ProductStatus } from '../models/MedicalProduct.js';
import { ProductOrder, IProductOrder, OrderStatus } from '../models/ProductOrder.js';
import { Supplier, ISupplier } from '../models/Supplier.js';
import { SupplierPurchaseOrder } from '../models/SupplierPurchaseOrder.js';
import { ProductReview, IProductReview } from '../models/ProductReview.js';
import { ProductComplaint, IProductComplaint } from '../models/ProductComplaint.js';
import { IUser } from '../models/User.js';
import { logAdminAction } from './adminService.js';
import { seedMedicalProductsIfEmpty } from './productCatalogService.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Separate dashboard metrics for Own-products vs Supplier-products,
 * units sold, order status, refunds, complaints, inventory availability, and payables.
 */
export const getMarketplaceMetricsAdmin = async () => {
  await seedMedicalProductsIfEmpty();

  // 1. Fetch completed or active orders
  const orders = await ProductOrder.find({
    orderStatus: { $ne: 'cancelled' },
  }).lean();

  let ownProductSalesVolume = 0;
  let supplierProductSalesVolume = 0;
  let ownUnitsSold = 0;
  let supplierUnitsSold = 0;
  let installationRevenue = 0;

  for (const order of orders) {
    if (order.pricing?.installationCharge) {
      installationRevenue += order.pricing.installationCharge;
    }
    for (const item of order.items) {
      const lineTotal = item.unitPrice * item.quantity;
      if (item.sourcingType === 'supplier_direct' || (item.sourcingType as any) === 'supplier') {
        supplierProductSalesVolume += lineTotal;
        supplierUnitsSold += item.quantity;
      } else {
        ownProductSalesVolume += lineTotal;
        ownUnitsSold += item.quantity;
      }
    }
  }

  // 2. Order counts by status
  const orderCountsByStatus: Record<string, number> = {
    placed: 0,
    confirmed: 0,
    dispatched: 0,
    out_for_delivery: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0,
  };

  const allOrders = await ProductOrder.find().lean();
  for (const ord of allOrders) {
    if (orderCountsByStatus[ord.orderStatus] != null) {
      orderCountsByStatus[ord.orderStatus]++;
    }
  }

  // 3. Returns and Refunds
  const returnedOrRefundedOrders = await ProductOrder.find({
    $or: [
      { 'returnDetails.isReturnRequested': true },
      { 'cancellation.refundStatus': 'processed' },
      { paymentStatus: 'refunded' },
    ],
  }).lean();

  let totalRefundsProcessed = 0;
  let returnRequestsCount = 0;
  for (const ro of returnedOrRefundedOrders) {
    if (ro.returnDetails?.isReturnRequested) returnRequestsCount++;
    if (ro.pricing?.refundAmount) {
      totalRefundsProcessed += ro.pricing.refundAmount;
    } else if (ro.paymentStatus === 'refunded') {
      totalRefundsProcessed += ro.pricing?.totalAmount || 0;
    }
  }

  // 4. Ratings and Reviews
  const totalReviews = await ProductReview.countDocuments();
  const publishedReviews = await ProductReview.find({ status: 'published' }).lean();
  const averageReviewRating = publishedReviews.length > 0
    ? Math.round((publishedReviews.reduce((sum, r) => sum + r.rating, 0) / publishedReviews.length) * 10) / 10
    : 5.0;

  // 5. Complaints
  const complaints = await ProductComplaint.find().lean();
  const complaintsByStatus = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === 'open').length,
    under_review: complaints.filter((c) => c.status === 'under_review').length,
    supplier_contacted: complaints.filter((c) => c.status === 'supplier_contacted').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  };

  // 6. Own Inventory vs Supplier Availability
  const products = await MedicalProduct.find({ status: { $ne: 'archived' } }).lean();
  let ownInventoryInStock = 0;
  let ownProductsCount = 0;
  let supplierProductsCount = 0;
  let lowStockAlertCount = 0;

  for (const p of products) {
    if (p.sourcingType === 'supplier_direct' || (p.sourcingType as any) === 'supplier') {
      supplierProductsCount++;
    } else {
      ownProductsCount++;
      ownInventoryInStock += p.stockQuantity || 0;
    }
    if ((p.stockQuantity || 0) < 10) {
      lowStockAlertCount++;
    }
  }

  // 7. Supplier Payables & Procurement Cost
  const purchaseOrders = await SupplierPurchaseOrder.find().lean();
  let supplierPayablesSettled = 0;
  let supplierPayablesPending = 0;

  for (const po of purchaseOrders) {
    supplierPayablesSettled += po.paidAmount || 0;
    const pending = Math.max(0, (po.totalProcurementCost || 0) - (po.paidAmount || 0));
    supplierPayablesPending += pending;
  }

  // Authoritative financial totals
  const grossProductSalesRevenue = ownProductSalesVolume + supplierProductSalesVolume;

  return {
    sales: {
      ownProductSalesGross: ownProductSalesVolume,
      supplierProductSalesGross: supplierProductSalesVolume,
      grossProductSalesRevenue,
      installationServicesRevenue: installationRevenue,
      unitsSold: {
        ownUnits: ownUnitsSold,
        supplierUnits: supplierUnitsSold,
        totalUnits: ownUnitsSold + supplierUnitsSold,
      },
    },
    orders: {
      totalOrders: allOrders.length,
      statusBreakdown: orderCountsByStatus,
      returnRequestsCount,
      totalRefundsProcessed,
    },
    catalogAndInventory: {
      totalActiveProducts: products.length,
      ownProductsCount,
      supplierProductsCount,
      ownInventoryTotalStock: ownInventoryInStock,
      lowStockAlertCount,
    },
    qualityAndCustomerCare: {
      totalReviews,
      publishedReviewsCount: publishedReviews.length,
      averageReviewRating,
      complaints: complaintsByStatus,
    },
    supplierSettlements: {
      supplierPayablesPending,
      supplierPayablesSettled,
      totalPurchaseOrders: purchaseOrders.length,
    },
  };
};

/**
 * List marketplace products for admin catalog view
 */
export const listMarketplaceProductsAdmin = async (filters: {
  search?: string;
  category?: string;
  sourcingType?: string;
  status?: string;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
}) => {
  await seedMedicalProductsIfEmpty();

  const query: any = {};

  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }

  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }

  if (filters.sourcingType && filters.sourcingType !== 'all') {
    if (filters.sourcingType === 'own' || filters.sourcingType === 'own_stock') {
      query.sourcingType = { $in: ['own', 'own_stock'] };
    } else if (filters.sourcingType === 'supplier' || filters.sourcingType === 'supplier_direct') {
      query.sourcingType = { $in: ['supplier', 'supplier_direct'] };
    } else {
      query.sourcingType = filters.sourcingType;
    }
  }

  if (filters.lowStockOnly) {
    query.stockQuantity = { $lt: 10 };
  }

  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [{ title: searchRegex }, { sku: searchRegex }, { description: searchRegex }, { supplierName: searchRegex }];
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    MedicalProduct.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    MedicalProduct.countDocuments(query),
  ]);

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Admin create new medical product
 */
export const createProductAdmin = async (
  data: {
    sku: string;
    title: string;
    category: ProductCategory;
    badge?: string;
    description: string;
    regularPrice: number;
    sellingPrice?: number;
    discountPercentage?: number;
    stockQuantity: number;
    sourcingType: 'own_stock' | 'supplier_direct';
    supplierId?: string;
    procurementCost?: number;
    images?: string[];
    imageGallery?: Array<{ url: string; altText?: string; isPrimary?: boolean }>;
    specifications?: Record<string, string>;
    hsnCode?: string;
    gstRate?: number;
    installationEligible?: boolean;
    installationServiceCharge?: number;
    installationDescription?: string;
    estimatedDeliveryDays?: string;
    status?: ProductStatus;
  },
  staffUser: IUser
): Promise<IMedicalProduct> => {
  if (!data.sku?.trim() || !data.title?.trim() || !data.category) {
    throw new AppError('SKU, product title, and category are mandatory', 400);
  }

  if (data.regularPrice == null || data.regularPrice < 0) {
    throw new AppError('Regular price cannot be negative', 400);
  }

  const cleanSku = data.sku.trim().toUpperCase();
  const existing = await MedicalProduct.findOne({ sku: cleanSku });
  if (existing) {
    throw new AppError(`A product with SKU "${cleanSku}" already exists in the catalog`, 409);
  }

  let supplierName: string | undefined;
  if (data.supplierId && mongoose.Types.ObjectId.isValid(data.supplierId)) {
    const sup = await Supplier.findById(data.supplierId);
    if (sup) supplierName = sup.name;
  }

  const product = new MedicalProduct({
    sku: cleanSku,
    title: data.title.trim(),
    category: data.category,
    badge: data.badge?.trim(),
    description: data.description.trim(),
    regularPrice: data.regularPrice,
    sellingPrice: data.sellingPrice ?? data.regularPrice,
    discountPercentage: data.discountPercentage ?? 0,
    price: data.sellingPrice ?? data.regularPrice,
    stockQuantity: Math.max(0, data.stockQuantity || 0),
    reservedQuantity: 0,
    sourcingType: data.sourcingType || 'own_stock',
    supplierId: data.supplierId ? new mongoose.Types.ObjectId(data.supplierId) : undefined,
    supplierName,
    procurementCost: data.procurementCost || 0,
    images: data.images || [],
    imageGallery: data.imageGallery || [],
    specifications: data.specifications || {},
    hsnCode: data.hsnCode?.trim(),
    gstRate: data.gstRate ?? 12,
    installationEligible: Boolean(data.installationEligible),
    installationServiceCharge: data.installationServiceCharge || 0,
    installationDescription: data.installationDescription?.trim(),
    estimatedDeliveryDays: data.estimatedDeliveryDays || '2-4 business days',
    status: data.status || ((data.stockQuantity || 0) > 0 ? 'active' : 'out_of_stock'),
    isActive: data.status !== 'archived',
    isDemo: false,
  });

  await product.save();

  await logAdminAction({
    action: 'CREATE_PRODUCT',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'MEDICAL_PRODUCT',
    targetId: product.sku,
    details: { title: product.title, price: product.price, sourcingType: product.sourcingType },
    severity: 'info',
  });

  return product;
};

/**
 * Admin update medical product
 */
export const updateProductAdmin = async (
  productId: string,
  data: Partial<IMedicalProduct>,
  staffUser: IUser
): Promise<IMedicalProduct> => {
  let query: any = { _id: productId };
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    query = { sku: productId.toUpperCase() };
  }

  const product = await MedicalProduct.findOne(query);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (data.title) product.title = data.title.trim();
  if (data.category) product.category = data.category;
  if (data.badge != null) product.badge = data.badge.trim();
  if (data.description) product.description = data.description.trim();
  if (data.regularPrice != null) {
    if (data.regularPrice < 0) throw new AppError('Regular price cannot be negative', 400);
    product.regularPrice = data.regularPrice;
  }
  if (data.sellingPrice != null) {
    if (data.sellingPrice < 0) throw new AppError('Selling price cannot be negative', 400);
    product.sellingPrice = data.sellingPrice;
  }
  if (data.discountPercentage != null) {
    if (data.discountPercentage < 0 || data.discountPercentage > 100) {
      throw new AppError('Discount percentage must be between 0 and 100', 400);
    }
    product.discountPercentage = data.discountPercentage;
  }
  if (data.stockQuantity != null) {
    product.stockQuantity = Math.max(0, data.stockQuantity);
  }
  if (data.sourcingType) product.sourcingType = data.sourcingType as any;
  if (data.supplierId) {
    product.supplierId = new mongoose.Types.ObjectId(data.supplierId as any);
    const sup = await Supplier.findById(data.supplierId);
    if (sup) product.supplierName = sup.name;
  }
  if (data.procurementCost != null) product.procurementCost = data.procurementCost;
  if (data.images) product.images = data.images;
  if (data.imageGallery) {
    product.imageGallery = data.imageGallery;
    product.images = data.imageGallery.map((ig) => ig.url);
  }
  if (data.specifications) product.specifications = data.specifications;
  if (data.hsnCode != null) product.hsnCode = data.hsnCode.trim();
  if (data.gstRate != null) product.gstRate = data.gstRate;
  if (data.status) {
    product.status = data.status;
    product.isActive = data.status !== 'archived';
  }
  if (data.installationEligible != null) product.installationEligible = data.installationEligible;
  if (data.installationServiceCharge != null) product.installationServiceCharge = data.installationServiceCharge;
  if (data.installationDescription != null) product.installationDescription = data.installationDescription.trim();
  if (data.estimatedDeliveryDays != null) product.estimatedDeliveryDays = data.estimatedDeliveryDays.trim();

  await product.save();

  await logAdminAction({
    action: 'UPDATE_PRODUCT',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'MEDICAL_PRODUCT',
    targetId: product.sku,
    details: { title: product.title, stockQuantity: product.stockQuantity, status: product.status },
    severity: 'info',
  });

  return product;
};

/**
 * Delete product: permanently removes product if no historical orders exist;
 * safely archives/deactivates product if orders exist to preserve financial records.
 */
export interface DeleteProductAdminResult {
  action: 'permanently_deleted' | 'archived';
  message: string;
  historicalOrdersCount: number;
  product: {
    id: string;
    sku: string;
    title: string;
    status: string;
    isActive: boolean;
  };
}

export const deleteProductAdmin = async (
  productId: string,
  staffUser: IUser
): Promise<DeleteProductAdminResult> => {
  let query: any = { _id: productId };
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    query = { sku: productId.toUpperCase() };
  }

  const product = await MedicalProduct.findOne(query);
  if (!product) {
    throw new AppError('Product not found in catalog', 404);
  }

  // Count historical orders referencing this product
  const historicalOrdersCount = await ProductOrder.countDocuments({
    $or: [{ 'items.productId': product._id }, { 'items.sku': product.sku }],
  });

  if (historicalOrdersCount > 0) {
    // Preserve historical orders and financial ledger integrity: Safe archive/deactivate
    product.status = 'archived';
    product.isActive = false;
    await product.save();

    await logAdminAction({
      action: 'ARCHIVE_PRODUCT_PRESERVED_HISTORY',
      category: 'order_fulfillment',
      actorId: staffUser._id.toString(),
      actorName: staffUser.fullName,
      actorRole: staffUser.role,
      targetType: 'MEDICAL_PRODUCT',
      targetId: product.sku,
      details: {
        productId: product._id.toString(),
        sku: product.sku,
        title: product.title,
        historicalOrdersCount,
        reason: 'Product has historical orders. Deactivated from catalog to preserve audit integrity.',
      },
      severity: 'warning',
    });

    return {
      action: 'archived',
      message: `Product "${product.title}" (${product.sku}) has ${historicalOrdersCount} historical order(s). It has been safely deactivated from the public store and archived to protect financial and audit records.`,
      historicalOrdersCount,
      product: {
        id: product._id.toString(),
        sku: product.sku,
        title: product.title,
        status: product.status,
        isActive: product.isActive,
      },
    };
  }

  // No historical orders exist: Safe to permanently delete from MongoDB
  await MedicalProduct.deleteOne({ _id: product._id });

  await logAdminAction({
    action: 'PRODUCT_PERMANENTLY_DELETED',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'MEDICAL_PRODUCT',
    targetId: product.sku,
    details: {
      productId: product._id.toString(),
      sku: product.sku,
      title: product.title,
      historicalOrdersCount: 0,
      reason: 'Permanently deleted by administrator (no historical orders existed).',
    },
    severity: 'info',
  });

  return {
    action: 'permanently_deleted',
    message: `Product "${product.title}" (${product.sku}) has been permanently deleted from the database.`,
    historicalOrdersCount: 0,
    product: {
      id: product._id.toString(),
      sku: product.sku,
      title: product.title,
      status: 'deleted',
      isActive: false,
    },
  };
};

/**
 * Safely archive product rather than deleting (preserves historical order integrity)
 */
export const archiveProductAdmin = async (
  productId: string,
  staffUser: IUser
): Promise<IMedicalProduct> => {
  let query: any = { _id: productId };
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    query = { sku: productId.toUpperCase() };
  }

  const product = await MedicalProduct.findOne(query);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  product.status = 'archived';
  product.isActive = false;
  await product.save();

  await logAdminAction({
    action: 'ARCHIVE_PRODUCT',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'MEDICAL_PRODUCT',
    targetId: product.sku,
    details: { reason: 'Archived by administrator to preserve order history' },
    severity: 'warning',
  });

  return product;
};

/**
 * List reviews for admin moderation
 */
export const listMarketplaceReviewsAdmin = async (filters: {
  status?: string;
  productId?: string;
  page?: number;
  limit?: number;
}) => {
  const query: any = {};
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  if (filters.productId && mongoose.Types.ObjectId.isValid(filters.productId)) {
    query.productId = new mongoose.Types.ObjectId(filters.productId);
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    ProductReview.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProductReview.countDocuments(query),
  ]);

  return {
    reviews,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Moderate customer review
 */
export const moderateReviewAdmin = async (
  reviewId: string,
  newStatus: 'published' | 'rejected',
  notes: string | undefined,
  staffUser: IUser
): Promise<IProductReview> => {
  const review = await ProductReview.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  review.status = newStatus;
  review.moderatedBy = staffUser._id;
  review.moderatedAt = new Date();
  if (notes) review.moderationNotes = notes.trim();

  await review.save();

  // Recalculate average rating for product
  const allReviews = await ProductReview.find({ productId: review.productId, status: 'published' });
  const avg = allReviews.length > 0
    ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10) / 10
    : 5.0;

  await MedicalProduct.findByIdAndUpdate(review.productId, {
    averageRating: avg,
    reviewCount: allReviews.length,
  });

  await logAdminAction({
    action: 'MODERATE_REVIEW',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'PRODUCT_REVIEW',
    targetId: review._id.toString(),
    details: { newStatus, notes },
    severity: 'info',
  });

  return review;
};

/**
 * List customer complaints across marketplace
 */
export const listMarketplaceComplaintsAdmin = async (filters: {
  status?: string;
  category?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}) => {
  const query: any = {};
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }
  if (filters.supplierId && mongoose.Types.ObjectId.isValid(filters.supplierId)) {
    query.supplierId = new mongoose.Types.ObjectId(filters.supplierId);
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [complaints, total] = await Promise.all([
    ProductComplaint.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProductComplaint.countDocuments(query),
  ]);

  return {
    complaints,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Resolve customer complaint with resolution notes and optional refund authorization
 */
export const resolveComplaintAdmin = async (
  complaintId: string,
  payload: {
    resolutionNotes: string;
    refundApproved?: boolean;
    refundAmount?: number;
  },
  staffUser: IUser
): Promise<IProductComplaint> => {
  if (!payload.resolutionNotes?.trim()) {
    throw new AppError('Resolution notes are mandatory', 400);
  }

  const complaint = await ProductComplaint.findById(complaintId);
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  complaint.status = 'resolved';
  complaint.resolutionNotes = payload.resolutionNotes.trim();
  complaint.resolvedAt = new Date();
  complaint.resolvedBy = staffUser._id;

  if (payload.refundApproved) {
    complaint.refundApproved = true;
    complaint.refundAmount = payload.refundAmount || 0;

    // Also update order refund record if linked
    await ProductOrder.findByIdAndUpdate(complaint.orderId, {
      $set: {
        'cancellation.refundStatus': 'processed',
        paymentStatus: 'refunded',
        'pricing.refundAmount': payload.refundAmount || 0,
      },
      $push: {
        trackingUpdates: {
          timestamp: new Date(),
          status: 'cancelled',
          message: `Complaint #${complaint.complaintNumber} resolved: Refund of ₹${payload.refundAmount || 0} approved by operations.`,
          location: 'Finance & Quality Desk',
        },
      },
    });
  }

  await complaint.save();

  await logAdminAction({
    action: 'RESOLVE_COMPLAINT',
    category: 'order_fulfillment',
    actorId: staffUser._id.toString(),
    actorName: staffUser.fullName,
    actorRole: staffUser.role,
    targetType: 'PRODUCT_COMPLAINT',
    targetId: complaint.complaintNumber,
    details: { notes: payload.resolutionNotes, refundApproved: payload.refundApproved },
    severity: 'info',
  });

  return complaint;
};

/**
 * List orders with home installation tasks
 */
export const listMarketplaceInstallationsAdmin = async (filters: {
  setupStatus?: string;
  page?: number;
  limit?: number;
}) => {
  const query: any = {
    'clinicalSetup.isSetupRequired': true,
  };

  if (filters.setupStatus && filters.setupStatus !== 'all') {
    query['clinicalSetup.setupStatus'] = filters.setupStatus;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    ProductOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProductOrder.countDocuments(query),
  ]);

  return {
    installations: orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
