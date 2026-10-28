import mongoose from 'mongoose';
import { Supplier, ISupplier } from '../models/Supplier.js';
import { MedicalProduct, IMedicalProduct } from '../models/MedicalProduct.js';
import { ProductOrder, IProductOrder } from '../models/ProductOrder.js';
import { SupplierPurchaseOrder } from '../models/SupplierPurchaseOrder.js';
import { ProductComplaint, IProductComplaint } from '../models/ProductComplaint.js';
import { AuditLog } from '../models/AuditLog.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Resolve authorized supplier record linked to the authenticated user.
 * Enforces strict supplier boundary: user must have a registered supplier profile.
 */
export const getSupplierForUser = async (userId: string): Promise<ISupplier> => {
  const supplier = await Supplier.findOne({ userId });
  if (!supplier) {
    throw new AppError('No authorized supplier account linked to this user profile', 403);
  }
  return supplier;
};

/**
 * Fetch supplier profile and verification status
 */
export const getSupplierProfile = async (userId: string) => {
  const supplier = await getSupplierForUser(userId);
  return {
    id: supplier._id.toString(),
    supplierCode: supplier.supplierCode,
    name: supplier.name,
    contactPerson: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    city: supplier.city,
    state: supplier.state,
    pincode: supplier.pincode,
    gstin: supplier.gstin,
    pan: supplier.pan,
    bankDetails: supplier.bankDetails,
    sourcingType: supplier.sourcingType,
    verificationStatus: supplier.verificationStatus,
    verifiedAt: supplier.verifiedAt,
    rating: supplier.rating,
    commissionRatePercentage: supplier.commissionRatePercentage || 10,
    settlementCycleDays: supplier.settlementCycleDays || 15,
    isActive: supplier.isActive,
  };
};

/**
 * Update permitted supplier profile contact and banking information
 */
export const updateSupplierProfile = async (
  userId: string,
  data: {
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    bankDetails?: {
      accountName: string;
      accountNumber: string;
      ifsc: string;
      bankName: string;
    };
  }
) => {
  const supplier = await getSupplierForUser(userId);

  if (data.contactPerson) supplier.contactPerson = data.contactPerson.trim();
  if (data.phone) {
    const clean = data.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(clean)) {
      throw new AppError('Phone must be a valid 10-digit Indian phone number', 400);
    }
    supplier.phone = clean;
  }
  if (data.email) supplier.email = data.email.trim().toLowerCase();
  if (data.address) supplier.address = data.address.trim();
  if (data.city) supplier.city = data.city.trim();
  if (data.state) supplier.state = data.state.trim();
  if (data.pincode) supplier.pincode = data.pincode.trim();
  if (data.bankDetails) supplier.bankDetails = data.bankDetails;

  await supplier.save();
  return supplier;
};

/**
 * List only products owned by this specific supplier
 */
export const listSupplierProducts = async (
  userId: string,
  filters: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }
) => {
  const supplier = await getSupplierForUser(userId);

  const query: any = {
    supplierId: supplier._id,
  };

  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }

  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }

  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [{ title: searchRegex }, { sku: searchRegex }, { description: searchRegex }];
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    MedicalProduct.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
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
 * Create a new product scoped to the supplier
 */
export const createSupplierProduct = async (
  userId: string,
  data: {
    sku: string;
    title: string;
    category: any;
    description: string;
    regularPrice: number;
    sellingPrice?: number;
    discountPercentage?: number;
    stockQuantity: number;
    hsnCode?: string;
    gstRate?: number;
    images?: string[];
    imageGallery?: Array<{ url: string; altText?: string; isPrimary?: boolean }>;
    specifications?: Record<string, string>;
    installationEligible?: boolean;
    installationServiceCharge?: number;
    installationDescription?: string;
    estimatedDeliveryDays?: string;
  }
): Promise<IMedicalProduct> => {
  const supplier = await getSupplierForUser(userId);

  if (!data.sku?.trim() || !data.title?.trim() || !data.category) {
    throw new AppError('Product SKU, title, and category are required', 400);
  }

  if (data.regularPrice == null || data.regularPrice < 0) {
    throw new AppError('Regular price cannot be negative', 400);
  }

  const existingSku = await MedicalProduct.findOne({ sku: data.sku.trim().toUpperCase() });
  if (existingSku) {
    throw new AppError(`A product with SKU "${data.sku.toUpperCase()}" already exists`, 409);
  }

  const product = new MedicalProduct({
    sku: data.sku.trim().toUpperCase(),
    title: data.title.trim(),
    category: data.category,
    description: data.description?.trim() || `${data.title} - Supplier Marketplace Item`,
    regularPrice: data.regularPrice,
    sellingPrice: data.sellingPrice ?? data.regularPrice,
    discountPercentage: data.discountPercentage ?? 0,
    price: data.sellingPrice ?? data.regularPrice,
    stockQuantity: Math.max(0, data.stockQuantity || 0),
    reservedQuantity: 0,
    sourcingType: 'supplier_direct',
    supplierId: supplier._id,
    supplierName: supplier.name,
    fulfillmentMethod: 'supplier_direct',
    hsnCode: data.hsnCode?.trim(),
    gstRate: data.gstRate ?? 12,
    images: data.images || [],
    imageGallery: data.imageGallery || [],
    specifications: data.specifications || {},
    installationEligible: Boolean(data.installationEligible),
    installationServiceCharge: data.installationServiceCharge || 0,
    installationDescription: data.installationDescription?.trim(),
    estimatedDeliveryDays: data.estimatedDeliveryDays || '2-4 business days',
    status: (data.stockQuantity || 0) > 0 ? 'active' : 'out_of_stock',
    isActive: true,
  });

  await product.save();
  return product;
};

/**
 * Update stock, pricing, and details of a product owned by this supplier
 */
export const updateSupplierProduct = async (
  userId: string,
  productId: string,
  data: {
    title?: string;
    description?: string;
    stockQuantity?: number;
    regularPrice?: number;
    sellingPrice?: number;
    discountPercentage?: number;
    status?: any;
    imageGallery?: Array<{ url: string; altText?: string; isPrimary?: boolean }>;
    specifications?: Record<string, string>;
    installationEligible?: boolean;
    installationServiceCharge?: number;
    installationDescription?: string;
  }
): Promise<IMedicalProduct> => {
  const supplier = await getSupplierForUser(userId);

  const product = await MedicalProduct.findOne({
    _id: productId,
    supplierId: supplier._id,
  });

  if (!product) {
    throw new AppError('Product not found or access denied (not owned by your supplier account)', 404);
  }

  if (data.title) product.title = data.title.trim();
  if (data.description) product.description = data.description.trim();
  if (data.stockQuantity != null) {
    product.stockQuantity = Math.max(0, data.stockQuantity);
  }
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
  if (data.status) {
    product.status = data.status;
    product.isActive = data.status !== 'archived';
  }
  if (data.imageGallery) {
    product.imageGallery = data.imageGallery;
    product.images = data.imageGallery.map((ig) => ig.url);
  }
  if (data.specifications) product.specifications = data.specifications;
  if (data.installationEligible != null) product.installationEligible = data.installationEligible;
  if (data.installationServiceCharge != null) product.installationServiceCharge = data.installationServiceCharge;
  if (data.installationDescription) product.installationDescription = data.installationDescription.trim();

  await product.save();
  return product;
};

/**
 * List orders containing items assigned to this supplier.
 * Scrubs cross-supplier items to maintain strict vendor data isolation.
 */
export const listSupplierOrders = async (
  userId: string,
  filters: {
    status?: string;
    page?: number;
    limit?: number;
  }
) => {
  const supplier = await getSupplierForUser(userId);

  const query: any = {
    'items.supplierId': supplier._id,
  };

  if (filters.status && filters.status !== 'all') {
    query.orderStatus = filters.status;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    ProductOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProductOrder.countDocuments(query),
  ]);

  // Cleanse orders: only expose supplier's own items, fulfillment group status, and dispatch address
  const sanitizedOrders = orders.map((order) => {
    const myItems = order.items.filter(
      (item) => item.supplierId?.toString() === supplier._id.toString()
    );
    const myFulfillment = order.supplierFulfillments?.find(
      (sf) => sf.supplierId.toString() === supplier._id.toString()
    );

    const supplierItemTotal = myItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      items: myItems,
      supplierItemTotal,
      supplierFulfillmentStatus: myFulfillment?.status || 'pending',
      carrierName: myFulfillment?.carrierName,
      trackingNumber: myFulfillment?.trackingNumber,
      dispatchedAt: myFulfillment?.dispatchedAt,
      deliveryCity: order.deliveryAddress?.city,
      deliveryState: order.deliveryAddress?.state,
      deliveryPincode: order.deliveryAddress?.pincode,
    };
  });

  return {
    orders: sanitizedOrders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Accept fulfillment for supplier's items in an order
 */
export const acceptSupplierOrder = async (
  userId: string,
  orderIdOrNumber: string
): Promise<IProductOrder> => {
  const supplier = await getSupplierForUser(userId);

  let query: any = { orderNumber: orderIdOrNumber, 'items.supplierId': supplier._id };
  if (mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
    query = { _id: orderIdOrNumber, 'items.supplierId': supplier._id };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Order not found or no items assigned to your supplier account', 404);
  }

  // Update item-level supplierStatus
  let updatedAny = false;
  for (const it of order.items) {
    if (it.supplierId?.toString() === supplier._id.toString()) {
      it.supplierStatus = 'accepted';
      updatedAny = true;
    }
  }

  // Update supplierFulfillmentGroup
  if (!order.supplierFulfillments) {
    order.supplierFulfillments = [];
  }
  let group = order.supplierFulfillments.find(
    (g) => g.supplierId.toString() === supplier._id.toString()
  );
  if (!group) {
    order.supplierFulfillments.push({
      supplierId: supplier._id,
      supplierName: supplier.name,
      status: 'accepted',
    });
  } else {
    group.status = 'accepted';
  }

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Fulfillment accepted by supplier "${supplier.name}". Items preparing for packing.`,
    location: `${supplier.city} Warehouse`,
  });

  await order.save();
  return order;
};

/**
 * Reject fulfillment for supplier's items in an order with mandatory reason
 */
export const rejectSupplierOrder = async (
  userId: string,
  orderIdOrNumber: string,
  reason: string
): Promise<IProductOrder> => {
  if (!reason?.trim()) {
    throw new AppError('Rejection reason is required', 400);
  }

  const supplier = await getSupplierForUser(userId);

  let query: any = { orderNumber: orderIdOrNumber, 'items.supplierId': supplier._id };
  if (mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
    query = { _id: orderIdOrNumber, 'items.supplierId': supplier._id };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Order not found or no items assigned to your supplier account', 404);
  }

  for (const it of order.items) {
    if (it.supplierId?.toString() === supplier._id.toString()) {
      it.supplierStatus = 'rejected';
      it.supplierRejectionReason = reason.trim();
    }
  }

  if (!order.supplierFulfillments) {
    order.supplierFulfillments = [];
  }
  let group = order.supplierFulfillments.find(
    (g) => g.supplierId.toString() === supplier._id.toString()
  );
  if (!group) {
    order.supplierFulfillments.push({
      supplierId: supplier._id,
      supplierName: supplier.name,
      status: 'rejected',
      rejectionReason: reason.trim(),
    });
  } else {
    group.status = 'rejected';
    group.rejectionReason = reason.trim();
  }

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Supplier "${supplier.name}" rejected item fulfillment: "${reason.trim()}". Routing to operations desk.`,
    location: `${supplier.city} Warehouse`,
  });

  await order.save();
  return order;
};

/**
 * Record packing and dispatch status with carrier and tracking reference
 */
export const dispatchSupplierOrder = async (
  userId: string,
  orderIdOrNumber: string,
  data: {
    carrierName: string;
    trackingNumber: string;
    notes?: string;
  }
): Promise<IProductOrder> => {
  if (!data.carrierName?.trim() || !data.trackingNumber?.trim()) {
    throw new AppError('Carrier name and tracking number are mandatory for dispatch', 400);
  }

  const supplier = await getSupplierForUser(userId);

  let query: any = { orderNumber: orderIdOrNumber, 'items.supplierId': supplier._id };
  if (mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
    query = { _id: orderIdOrNumber, 'items.supplierId': supplier._id };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Order not found or no items assigned to your supplier account', 404);
  }

  for (const it of order.items) {
    if (it.supplierId?.toString() === supplier._id.toString()) {
      it.supplierStatus = 'dispatched';
      it.carrierName = data.carrierName.trim();
      it.trackingNumber = data.trackingNumber.trim();
    }
  }

  if (!order.supplierFulfillments) {
    order.supplierFulfillments = [];
  }
  let group = order.supplierFulfillments.find(
    (g) => g.supplierId.toString() === supplier._id.toString()
  );
  if (!group) {
    order.supplierFulfillments.push({
      supplierId: supplier._id,
      supplierName: supplier.name,
      status: 'dispatched',
      carrierName: data.carrierName.trim(),
      trackingNumber: data.trackingNumber.trim(),
      dispatchedAt: new Date(),
    });
  } else {
    group.status = 'dispatched';
    group.carrierName = data.carrierName.trim();
    group.trackingNumber = data.trackingNumber.trim();
    group.dispatchedAt = new Date();
  }

  // If order status is still placed or confirmed, advance it to dispatched
  if (['placed', 'confirmed'].includes(order.orderStatus)) {
    order.orderStatus = 'dispatched';
  }

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: 'dispatched',
    message: `Dispatched by ${supplier.name} via ${data.carrierName.trim()} (Tracking #: ${data.trackingNumber.trim()}). ${data.notes ? `Notes: ${data.notes.trim()}` : ''}`,
    location: `${supplier.city} Dispatch Terminal`,
  });

  await order.save();
  return order;
};

/**
 * View supplier settlement records and payable summary
 */
export const getSupplierSettlementSummary = async (userId: string) => {
  const supplier = await getSupplierForUser(userId);

  // 1. Purchase orders
  const purchaseOrders = await SupplierPurchaseOrder.find({
    supplierId: supplier._id,
  }).sort({ createdAt: -1 }).lean();

  let totalPOAmount = 0;
  let settledPOAmount = 0;
  for (const po of purchaseOrders) {
    totalPOAmount += po.totalProcurementCost || 0;
    settledPOAmount += po.paidAmount || 0;
  }
  const pendingPOAmount = Math.max(0, totalPOAmount - settledPOAmount);

  // 2. Marketplace customer order line items
  const orders = await ProductOrder.find({
    'items.supplierId': supplier._id,
    orderStatus: { $ne: 'cancelled' },
  }).lean();

  let totalDirectSalesVolume = 0;
  let totalDirectItemUnits = 0;
  for (const ord of orders) {
    for (const it of ord.items) {
      if (it.supplierId?.toString() === supplier._id.toString()) {
        totalDirectSalesVolume += it.unitPrice * it.quantity;
        totalDirectItemUnits += it.quantity;
      }
    }
  }

  const commissionRate = supplier.commissionRatePercentage || 10;
  const estimatedCommission = Math.round(totalDirectSalesVolume * (commissionRate / 100));
  const estimatedNetSupplierPayable = Math.max(0, totalDirectSalesVolume - estimatedCommission);

  return {
    supplierCode: supplier.supplierCode,
    supplierName: supplier.name,
    commissionRatePercentage: commissionRate,
    settlementCycleDays: supplier.settlementCycleDays || 15,
    purchaseOrders: {
      totalOrders: purchaseOrders.length,
      totalProcurementCost: totalPOAmount,
      settledAmount: settledPOAmount,
      pendingPayable: pendingPOAmount,
      recentOrders: purchaseOrders.slice(0, 10),
    },
    directMarketplaceOrders: {
      totalOrderCount: orders.length,
      totalUnitsSold: totalDirectItemUnits,
      grossSalesVolume: totalDirectSalesVolume,
      platformCommission: estimatedCommission,
      netSupplierSettlementEstimate: estimatedNetSupplierPayable,
    },
  };
};

/**
 * List complaints relevant to this supplier
 */
export const listSupplierComplaints = async (userId: string) => {
  const supplier = await getSupplierForUser(userId);
  return ProductComplaint.find({ supplierId: supplier._id }).sort({ createdAt: -1 }).lean();
};

/**
 * Submit authorized supplier response to a customer complaint
 */
export const respondToSupplierComplaint = async (
  userId: string,
  complaintId: string,
  responseText: string
): Promise<IProductComplaint> => {
  if (!responseText?.trim()) {
    throw new AppError('Response message is required', 400);
  }

  const supplier = await getSupplierForUser(userId);

  const complaint = await ProductComplaint.findOne({
    _id: complaintId,
    supplierId: supplier._id,
  });

  if (!complaint) {
    throw new AppError('Complaint not found or not assigned to your supplier account', 404);
  }

  complaint.supplierResponse = {
    response: responseText.trim(),
    respondedAt: new Date(),
    respondedByName: supplier.contactPerson || supplier.name,
  };

  if (complaint.status === 'open') {
    complaint.status = 'supplier_contacted';
  }

  await complaint.save();
  return complaint;
};
