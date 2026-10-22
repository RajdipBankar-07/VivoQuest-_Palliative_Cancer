import mongoose from 'mongoose';
import { Supplier, ISupplier, SupplierVerificationStatus, SupplierSourcingType } from '../models/Supplier.js';
import { SupplierPurchaseOrder, ISupplierPurchaseOrder, PODeliveryStatus, POPaymentStatus } from '../models/SupplierPurchaseOrder.js';
import { MedicalProduct } from '../models/MedicalProduct.js';
import { IUser } from '../models/User.js';
import { logAdminAction } from './adminService.js';
import { AppError } from '../middleware/errorHandler.js';

export const seedSupplierDemoData = async () => {
  try {
    const existingSuppliers = await Supplier.countDocuments();
    if (existingSuppliers === 0) {
      const sup1 = await Supplier.create({
        supplierCode: 'SUP-PUN-001',
        name: 'RespiraCare MedEquip Ltd',
        contactPerson: 'Suresh Patil',
        phone: '9822099333',
        email: 'sales@respiracare.in',
        address: 'B-14 Bhosari Industrial Estate',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411026',
        gstin: '27AABCR1234F1Z5',
        pan: 'AABCR1234F',
        bankDetails: {
          accountName: 'RespiraCare MedEquip Limited',
          accountNumber: '921020034455112',
          ifsc: 'HDFC0001234',
          bankName: 'HDFC Bank, Bhosari Branch',
        },
        sourcingType: 'own_stock',
        verificationStatus: 'verified',
        verifiedAt: new Date('2026-09-01'),
        verificationNotes: 'ISO 13485 and CDSCO medical equipment import certificates inspected and verified.',
        rating: 4.9,
        isActive: true,
        isDemo: true,
      });

      const sup2 = await Supplier.create({
        supplierCode: 'SUP-MUM-002',
        name: 'MobilityPlus Healthcare Technologies',
        contactPerson: 'Kavita Nair',
        phone: '9822099444',
        email: 'orders@mobilityplus.in',
        address: '102 Andheri Commercial Hub, MIDC',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400093',
        gstin: '27AABCM5678G1Z9',
        pan: 'AABCM5678G',
        bankDetails: {
          accountName: 'MobilityPlus Technologies Pvt Ltd',
          accountNumber: '003405001199',
          ifsc: 'ICIC0000034',
          bankName: 'ICICI Bank, Andheri East',
        },
        sourcingType: 'supplier_direct',
        verificationStatus: 'verified',
        verifiedAt: new Date('2026-09-10'),
        verificationNotes: 'Direct vendor fulfillment agreement signed. SLA for home delivery: 24 hours.',
        rating: 4.8,
        isActive: true,
        isDemo: true,
      });

      const sup3 = await Supplier.create({
        supplierCode: 'SUP-PUN-003',
        name: 'Apex Diagnostics & Home ICU Systems',
        contactPerson: 'Dr. Nitin Deshmukh',
        phone: '9822099555',
        email: 'partners@apexdiag.in',
        address: 'Plot 45, Hinjewadi Phase 1',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411057',
        gstin: '27AABCA9012H1Z3',
        pan: 'AABCA9012H',
        bankDetails: {
          accountName: 'Apex Diagnostics LLP',
          accountNumber: '50200012345678',
          ifsc: 'UTIB0000502',
          bankName: 'Axis Bank, Hinjewadi',
        },
        sourcingType: 'hybrid',
        verificationStatus: 'pending_review',
        rating: 4.5,
        isActive: true,
        isDemo: true,
      });

      console.log('[Seed] Demonstration medical equipment suppliers initialized.');

      // Also link some products to suppliers if products exist
      const walker = await MedicalProduct.findOne({ sku: 'DME-MOB-WALKER-02' });
      if (walker) {
        walker.supplierId = sup2._id;
        walker.supplierName = sup2.name;
        walker.sourcingType = 'supplier_direct';
        walker.procurementCost = 1400;
        await walker.save();
      }

      const oxy = await MedicalProduct.findOne({
        sku: { $in: ['DME-RESP-BIPAP-03', 'DME-RESP-OXYCONC-10L'] },
      });
      if (oxy) {
        oxy.supplierId = sup1._id;
        oxy.supplierName = sup1.name;
        oxy.sourcingType = 'own_stock';
        oxy.procurementCost = 32000;
        await oxy.save();
      }

      // Seed 2 Demonstration Purchase Orders
      const existingPOs = await SupplierPurchaseOrder.countDocuments();
      if (existingPOs === 0 && oxy && walker) {
        await SupplierPurchaseOrder.create([
          {
            poNumber: 'PO-202610-001',
            supplierId: sup1._id,
            supplierName: sup1.name,
            items: [
              {
                productId: oxy._id,
                sku: oxy.sku,
                title: oxy.title,
                quantity: 5,
                procurementCostPerUnit: 32000,
                totalCost: 160000,
                receivedQuantity: 5,
              },
            ],
            totalProcurementCost: 160000,
            paymentStatus: 'settled',
            paidAmount: 160000,
            deliveryStatus: 'received',
            notes: 'Batch delivered and inspected at Kothrud central depot.',
            createdBy: new mongoose.Types.ObjectId(),
            createdByName: 'Operations Admin Lead',
            isDemo: true,
          },
          {
            poNumber: 'PO-202610-002',
            supplierId: sup2._id,
            supplierName: sup2.name,
            items: [
              {
                productId: walker._id,
                sku: walker.sku,
                title: walker.title,
                quantity: 10,
                procurementCostPerUnit: 1400,
                totalCost: 14000,
                receivedQuantity: 0,
              },
            ],
            totalProcurementCost: 14000,
            paymentStatus: 'pending',
            paidAmount: 0,
            paymentDueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000), // Net 15
            deliveryStatus: 'ordered',
            notes: 'Consignment for western Pune inventory replenishment.',
            createdBy: new mongoose.Types.ObjectId(),
            createdByName: 'Operations Admin Lead',
            isDemo: true,
          },
        ]);
        console.log('[Seed] Demonstration supplier procurement purchase orders initialized.');
      }
    }
  } catch (err: any) {
    console.warn('[Seed] Supplier demo seeding notice:', err.message);
  }
};

/**
 * List suppliers with search and filters
 */
export const listSuppliers = async (filters: {
  status?: string;
  sourcingType?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  await seedSupplierDemoData();

  const query: any = {};
  if (filters.status && filters.status !== 'all') {
    query.verificationStatus = filters.status;
  }
  if (filters.sourcingType && filters.sourcingType !== 'all') {
    query.sourcingType = filters.sourcingType;
  }
  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { supplierCode: searchRegex },
      { contactPerson: searchRegex },
      { city: searchRegex },
      { gstin: searchRegex },
    ];
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [suppliers, total] = await Promise.all([
    Supplier.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(query),
  ]);

  return {
    suppliers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get supplier details by ID or code
 */
export const getSupplierById = async (idOrCode: string): Promise<ISupplier> => {
  let query: any = { _id: idOrCode };
  if (!mongoose.Types.ObjectId.isValid(idOrCode)) {
    query = { supplierCode: idOrCode.toUpperCase() };
  }

  const supplier = await Supplier.findOne(query);
  if (!supplier) {
    throw new AppError('Supplier not found', 404);
  }
  return supplier;
};

/**
 * Onboard a new medical equipment supplier
 */
export const onboardSupplier = async (
  data: {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state?: string;
    pincode: string;
    gstin: string;
    pan: string;
    bankDetails: {
      accountName: string;
      accountNumber: string;
      ifsc: string;
      bankName: string;
    };
    sourcingType?: SupplierSourcingType;
  },
  actorUser: IUser
): Promise<ISupplier> => {
  if (!data.name?.trim() || !data.phone?.trim() || !data.gstin?.trim()) {
    throw new AppError('Supplier company name, contact phone, and GSTIN are mandatory', 400);
  }

  const cleanPhone = data.phone.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new AppError('Supplier contact phone must be a valid 10-digit Indian phone number', 400);
  }

  const existing = await Supplier.findOne({
    $or: [{ phone: cleanPhone }, { gstin: data.gstin.trim().toUpperCase() }],
  });
  if (existing) {
    throw new AppError('A supplier with this contact phone or GSTIN already exists', 409);
  }

  const count = await Supplier.countDocuments();
  const supplierCode = `SUP-${data.city.slice(0, 3).toUpperCase()}-${String(count + 1).padStart(3, '0')}`;

  const supplier = await Supplier.create({
    supplierCode,
    name: data.name.trim(),
    contactPerson: data.contactPerson.trim(),
    phone: cleanPhone,
    email: data.email.trim().toLowerCase(),
    address: data.address.trim(),
    city: data.city.trim(),
    state: data.state || 'Maharashtra',
    pincode: data.pincode.trim(),
    gstin: data.gstin.trim().toUpperCase(),
    pan: data.pan.trim().toUpperCase(),
    bankDetails: data.bankDetails,
    sourcingType: data.sourcingType || 'own_stock',
    verificationStatus: 'pending_review',
    isActive: true,
    isDemo: false,
  });

  await logAdminAction({
    action: 'SUPPLIER_ONBOARDED',
    category: 'supplier_management' as any,
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'SUPPLIER',
    targetId: supplier.supplierCode,
    details: {
      name: supplier.name,
      gstin: supplier.gstin,
      sourcingType: supplier.sourcingType,
    },
    severity: 'info',
  });

  return supplier;
};

/**
 * Review and verify or reject a supplier
 */
export const reviewSupplierVerification = async (
  supplierId: string,
  newStatus: SupplierVerificationStatus,
  notes: string,
  actorUser: IUser
): Promise<ISupplier> => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new AppError('Supplier not found', 404);
  }

  supplier.verificationStatus = newStatus;
  supplier.verifiedAt = new Date();
  supplier.verifiedBy = actorUser._id;
  supplier.verificationNotes = notes.trim();

  await supplier.save();

  await logAdminAction({
    action: 'SUPPLIER_VERIFICATION_REVIEWED',
    category: 'supplier_management' as any,
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'SUPPLIER',
    targetId: supplier.supplierCode,
    details: {
      supplierName: supplier.name,
      newStatus,
      notes,
    },
    severity: newStatus === 'rejected' ? 'warning' : 'info',
  });

  return supplier;
};

/**
 * List Purchase Orders
 */
export const listPurchaseOrders = async (filters: {
  supplierId?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  page?: number;
  limit?: number;
}) => {
  await seedSupplierDemoData();

  const query: any = {};
  if (filters.supplierId && mongoose.Types.ObjectId.isValid(filters.supplierId)) {
    query.supplierId = new mongoose.Types.ObjectId(filters.supplierId);
  }
  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    query.paymentStatus = filters.paymentStatus;
  }
  if (filters.deliveryStatus && filters.deliveryStatus !== 'all') {
    query.deliveryStatus = filters.deliveryStatus;
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    SupplierPurchaseOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SupplierPurchaseOrder.countDocuments(query),
  ]);

  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Create a new Supplier Purchase Order
 */
export const createPurchaseOrder = async (
  data: {
    supplierId: string;
    items: Array<{
      productId: string;
      quantity: number;
      procurementCostPerUnit?: number;
    }>;
    notes?: string;
    paymentDueDate?: string;
  },
  actorUser: IUser
): Promise<ISupplierPurchaseOrder> => {
  const supplier = await Supplier.findById(data.supplierId);
  if (!supplier) {
    throw new AppError('Supplier not found', 404);
  }

  if (!data.items || data.items.length === 0) {
    throw new AppError('Purchase order must contain at least one item', 400);
  }

  let totalCost = 0;
  const populatedItems: any[] = [];

  for (const item of data.items) {
    const product = await MedicalProduct.findById(item.productId);
    if (!product) {
      throw new AppError(`Medical product ${item.productId} not found`, 404);
    }
    const costPerUnit = item.procurementCostPerUnit ?? product.procurementCost ?? 0;
    const itemTotal = costPerUnit * item.quantity;
    totalCost += itemTotal;

    populatedItems.push({
      productId: product._id,
      sku: product.sku,
      title: product.title,
      quantity: item.quantity,
      procurementCostPerUnit: costPerUnit,
      totalCost: itemTotal,
      receivedQuantity: 0,
    });
  }

  const count = await SupplierPurchaseOrder.countDocuments();
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
  const poNumber = `PO-${yearMonth}-${String(count + 1).padStart(3, '0')}`;

  const po = await SupplierPurchaseOrder.create({
    poNumber,
    supplierId: supplier._id,
    supplierName: supplier.name,
    items: populatedItems,
    totalProcurementCost: totalCost,
    paymentStatus: 'pending',
    paidAmount: 0,
    paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : undefined,
    deliveryStatus: 'ordered',
    notes: data.notes,
    createdBy: actorUser._id,
    createdByName: actorUser.fullName,
    isDemo: false,
  });

  await logAdminAction({
    action: 'PURCHASE_ORDER_CREATED',
    category: 'supplier_management' as any,
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'PURCHASE_ORDER',
    targetId: po.poNumber,
    details: {
      supplierName: supplier.name,
      totalProcurementCost: totalCost,
      itemCount: populatedItems.length,
    },
    severity: 'info',
  });

  return po;
};

/**
 * Update Purchase Order delivery and payment status
 */
export const updatePurchaseOrderStatus = async (
  poId: string,
  updates: {
    deliveryStatus?: PODeliveryStatus;
    paymentStatus?: POPaymentStatus;
    paidAmount?: number;
    notes?: string;
  },
  actorUser: IUser
): Promise<ISupplierPurchaseOrder> => {
  const po = await SupplierPurchaseOrder.findById(poId);
  if (!po) {
    throw new AppError('Purchase order not found', 404);
  }

  if (updates.deliveryStatus) {
    po.deliveryStatus = updates.deliveryStatus;
    // If received, replenish product inventory in stock
    if (updates.deliveryStatus === 'received') {
      for (const item of po.items) {
        await MedicalProduct.findByIdAndUpdate(item.productId, {
          $inc: { stockQuantity: item.quantity },
        });
        item.receivedQuantity = item.quantity;
      }
    }
  }

  if (updates.paymentStatus) {
    po.paymentStatus = updates.paymentStatus;
  }

  if (typeof updates.paidAmount === 'number') {
    po.paidAmount = updates.paidAmount;
    if (po.paidAmount >= po.totalProcurementCost) {
      po.paymentStatus = 'settled';
    } else if (po.paidAmount > 0) {
      po.paymentStatus = 'partially_settled';
    }
  }

  if (updates.notes) {
    po.notes = updates.notes;
  }

  await po.save();

  await logAdminAction({
    action: 'PURCHASE_ORDER_STATUS_UPDATED',
    category: 'supplier_management' as any,
    actorId: actorUser._id.toString(),
    actorName: actorUser.fullName,
    actorRole: actorUser.role,
    targetType: 'PURCHASE_ORDER',
    targetId: po.poNumber,
    details: {
      deliveryStatus: po.deliveryStatus,
      paymentStatus: po.paymentStatus,
      paidAmount: po.paidAmount,
    },
    severity: 'info',
  });

  return po;
};
