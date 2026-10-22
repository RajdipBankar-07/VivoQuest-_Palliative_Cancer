import { MedicalProduct, IMedicalProduct, ProductCategory } from '../models/MedicalProduct.js';
import { ProductOrder, IProductOrder, OrderStatus } from '../models/ProductOrder.js';
import { ShoppingCart, IShoppingCart } from '../models/ShoppingCart.js';
import { AuditLog } from '../models/AuditLog.js';
import { AppError } from '../middleware/errorHandler.js';
import mongoose from 'mongoose';

/**
 * Seed demonstration medical products and DME equipment from the client specification if empty.
 */
export const seedMedicalProductsIfEmpty = async (): Promise<void> => {
  const count = await MedicalProduct.countDocuments();
  if (count >= 13) return;

  const defaultProducts = [
    // 1. Mobility Aids
    {
      sku: 'DME-MOB-WALKER-02',
      title: 'Folding Lightweight Mobility Walker with 5" Front Wheels',
      category: 'mobility' as ProductCategory,
      badge: 'Post-Op Mobility & Rehab',
      description:
        'Anodized aluminum dual-release folding mobility walker with front rubber wheels and rear glide caps. Recommended for post-surgical recovery, joint replacement, and geriatric gait stabilization.',
      price: 2499,
      rentalPriceMonthly: 600,
      isRentalAvailable: true,
      requiresPrescription: false,
      setupRequiredByClinician: true,
      recommendedSpecialistRole: 'physiotherapist',
      stockQuantity: 30,
      images: ['/assets/images/products/walker.jpg'],
      specifications: {
        Frame: 'Anodized 1-inch Aircraft Aluminum',
        HeightRange: '32 to 39 inches adjustable',
        WheelDiameter: '5 inches solid rubber',
        WeightCapacity: '135 kg',
      },
      hsnCode: '9021',
      gstRate: 12,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 15,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
        {
          depotName: 'Dadar Central DME Logistics Hub',
          city: 'Mumbai',
          pincode: '400014',
          inStockCount: 15,
          contactPhone: '9822099222',
          location: { type: 'Point', coordinates: [72.8432, 19.0178] },
        },
      ],
      isActive: true,
      isDemo: true,
    },
    {
      sku: 'DME-MOB-WHEELCHAIR-08',
      title: 'Heavy-Duty Ergonomic Transport Wheelchair with Flip-Back Arms',
      category: 'mobility' as ProductCategory,
      badge: 'Palliative & Geriatric Transit',
      description:
        'Foldable steel transport wheelchair with attendant-activated handbrakes, swing-away footrests, and puncture-proof composite wheels. Designed for home transit and clinical follow-up visits.',
      price: 8999,
      rentalPriceMonthly: 1800,
      isRentalAvailable: true,
      requiresPrescription: false,
      setupRequiredByClinician: true,
      recommendedSpecialistRole: 'physiotherapist',
      stockQuantity: 18,
      images: ['/assets/images/products/wheelchair.jpg'],
      specifications: {
        SeatWidth: '18 inches padded nylon',
        FrameMaterial: 'Epoxy powder-coated carbon steel',
        TotalWeight: '14.5 kg',
        WeightCapacity: '120 kg',
      },
      hsnCode: '9021',
      gstRate: 12,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 8,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
        {
          depotName: 'Dadar Central DME Logistics Hub',
          city: 'Mumbai',
          pincode: '400014',
          inStockCount: 10,
          contactPhone: '9822099222',
          location: { type: 'Point', coordinates: [72.8432, 19.0178] },
        },
      ],
      isActive: true,
      isDemo: true,
    },

    // 2. Respiratory Care
    {
      sku: 'DME-RESP-BIPAP-03',
      title: 'BiPAP Auto ST Ventilatory Respiratory Support System',
      category: 'respiratory' as ProductCategory,
      badge: 'ICU Home Care & Oncology',
      description:
        'Non-invasive bi-level positive airway pressure system with spontaneous-timed (ST) backup breath trigger, heated humidifier, and cellular compliance reporting. Delivered and calibrated directly at the patient kitchen table.',
      price: 58000,
      rentalPriceMonthly: 8500,
      isRentalAvailable: true,
      requiresPrescription: true,
      setupRequiredByClinician: true,
      recommendedSpecialistRole: 'technician',
      stockQuantity: 15,
      images: ['/assets/images/products/bipap.jpg'],
      specifications: {
        PressureRange: '4 to 25 cm H2O',
        Modes: 'CPAP, S, T, ST',
        BackupRate: 'Up to 30 BPM',
        Humidification: 'Integrated heated water chamber',
      },
      hsnCode: '9019',
      gstRate: 12,
      depots: [
        {
          depotName: 'Shivajinagar Respiratory Depot',
          city: 'Pune',
          pincode: '411005',
          inStockCount: 6,
          contactPhone: '9822099333',
          location: { type: 'Point', coordinates: [73.8524, 18.5314] },
        },
        {
          depotName: 'Dadar Central DME Logistics Hub',
          city: 'Mumbai',
          pincode: '400014',
          inStockCount: 9,
          contactPhone: '9822099222',
          location: { type: 'Point', coordinates: [72.8432, 19.0178] },
        },
      ],
      isActive: true,
      isDemo: true,
    },
    {
      sku: 'DME-RESP-CONC-09',
      title: '5-Liter Portable Medical Oxygen Concentrator 93% Purity',
      category: 'respiratory' as ProductCategory,
      badge: 'Continuous Oxygen Therapy',
      description:
        'Stationary hospital-grade continuous flow oxygen concentrator delivering 0.5 to 5.0 LPM at 93% +/- 3% purity. Features low-noise piston compressor, digital flowmeter, and high-temperature shutoff.',
      price: 42000,
      rentalPriceMonthly: 5500,
      isRentalAvailable: true,
      requiresPrescription: true,
      setupRequiredByClinician: true,
      recommendedSpecialistRole: 'technician',
      stockQuantity: 22,
      images: ['/assets/images/products/oxygen-concentrator.jpg'],
      specifications: {
        FlowRate: '0.5 to 5.0 Liters/min continuous',
        Purity: '93% +/- 3% at all flow rates',
        SoundLevel: 'Under 43 dBA',
        PowerConsumption: '350 Watts',
      },
      hsnCode: '9019',
      gstRate: 12,
      depots: [
        {
          depotName: 'Shivajinagar Respiratory Depot',
          city: 'Pune',
          pincode: '411005',
          inStockCount: 12,
          contactPhone: '9822099333',
          location: { type: 'Point', coordinates: [73.8524, 18.5314] },
        },
        {
          depotName: 'Dadar Central DME Logistics Hub',
          city: 'Mumbai',
          pincode: '400014',
          inStockCount: 10,
          contactPhone: '9822099222',
          location: { type: 'Point', coordinates: [72.8432, 19.0178] },
        },
      ],
      isActive: true,
      isDemo: true,
    },

    // 3. Monitoring Devices & Diagnostic Supplies
    {
      sku: 'DIAG-OXI-PULSE-07',
      title: 'Dual-Color OLED Fingertip Pulse Oximeter & SpO2 Monitor',
      category: 'monitoring_diagnostics' as ProductCategory,
      badge: 'Home Vitals Monitoring',
      description:
        'Certified medical pulse oximeter for continuous blood oxygen saturation and pulse rate tracking. Includes plethysmograph waveform display and audio alarm for desaturation.',
      price: 999,
      isRentalAvailable: false,
      requiresPrescription: false,
      setupRequiredByClinician: false,
      stockQuantity: 80,
      images: ['/assets/images/products/oximeter.jpg'],
      specifications: {
        SpO2Range: '70% - 100% (+/- 2%)',
        Display: 'Four-direction rotating OLED',
        Battery: '2x AAA Alkaline (Included)',
      },
      hsnCode: '9018',
      gstRate: 12,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 40,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
        {
          depotName: 'Dadar Central DME Logistics Hub',
          city: 'Mumbai',
          pincode: '400014',
          inStockCount: 40,
          contactPhone: '9822099222',
          location: { type: 'Point', coordinates: [72.8432, 19.0178] },
        },
      ],
      isActive: true,
      isDemo: true,
    },
    {
      sku: 'DIAG-BP-MON-10',
      title: 'Digital Arm Blood Pressure Monitor with Arrhythmia Detection',
      category: 'monitoring_diagnostics' as ProductCategory,
      badge: 'Hypertension Management',
      description:
        'Clinical-accuracy digital oscillometric upper arm blood pressure monitor. Stores 120 readings for two users with irregular heartbeat detection and WHO hypertension risk color bar.',
      price: 1850,
      isRentalAvailable: false,
      requiresPrescription: false,
      setupRequiredByClinician: false,
      stockQuantity: 65,
      images: ['/assets/images/products/bp-monitor.jpg'],
      specifications: {
        CuffSize: '22 - 42 cm wide-range adult cuff',
        Accuracy: 'Pressure: +/- 3 mmHg; Pulse: +/- 5%',
        Memory: '2 x 120 memory sets with date/time',
      },
      hsnCode: '9018',
      gstRate: 12,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 35,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
      ],
      isActive: true,
      isDemo: true,
    },
    {
      sku: 'DIAG-HBA1C-KIT-05',
      title: 'HbA1c & Fasting Metabolic Home Diagnostic Collection Kit',
      category: 'monitoring_diagnostics' as ProductCategory,
      badge: 'NABL Certified Partner Labs',
      description:
        'Pre-barcoded cold-chain collection kit for HbA1c glucose and lipid profile screening. Administered by a certified phlebotomist during home visit with digital report delivery in 12 hours.',
      price: 699,
      isRentalAvailable: false,
      requiresPrescription: false,
      setupRequiredByClinician: true,
      recommendedSpecialistRole: 'phlebotomist',
      stockQuantity: 100,
      images: ['/assets/images/products/hba1c-kit.jpg'],
      specifications: {
        Specimen: 'Venous whole blood (EDTA + Fluoride)',
        Processing: 'Automated HPLC / Immunoturbidimetry',
        Turnaround: '12-24 hours digital PDF delivery',
      },
      hsnCode: '3822',
      gstRate: 5,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 50,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
      ],
      isActive: true,
      isDemo: true,
    },

    // 4. Specialized Beds & ICU Home Setup
    {
      sku: 'DME-ICU-BED-11',
      title: '5-Function Electric ICU Hospital Bed with Side Rails & Remote',
      category: 'icu_home_setup' as ProductCategory,
      badge: 'Critical Palliative & Post-Op Care',
      description:
        'Full motorized hospital bed with backrest elevation, knee break adjustment, Trendelenburg tilt, and total height adjustment. Includes fold-down aluminum safety side rails and battery backup.',
      price: 65000,
      rentalPriceMonthly: 9000,
      isRentalAvailable: true,
      requiresPrescription: true,
      setupRequiredByClinician: true,
      recommendedSpecialistRole: 'technician',
      stockQuantity: 8,
      images: ['/assets/images/products/icu-bed.jpg'],
      specifications: {
        Actuators: '4 heavy-duty medical linear motors (Linak / Dewert)',
        MattressPlatform: '4-section perforated cold-rolled steel',
        SafeWorkingLoad: '220 kg',
        Casters: '5-inch central locking medical grade',
      },
      hsnCode: '9402',
      gstRate: 12,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 4,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
        {
          depotName: 'Dadar Central DME Logistics Hub',
          city: 'Mumbai',
          pincode: '400014',
          inStockCount: 4,
          contactPhone: '9822099222',
          location: { type: 'Point', coordinates: [72.8432, 19.0178] },
        },
      ],
      isActive: true,
      isDemo: true,
    },
    {
      sku: 'DME-ICU-MATTRESS-04',
      title: 'Alternating Pressure Anti-Bedsore Air Mattress with Quiet Pump',
      category: 'icu_home_setup' as ProductCategory,
      badge: 'Decubitus Ulcer Prevention',
      description:
        'Medical-grade bubble cell alternating pressure overlay mattress designed for prevention and treatment of pressure injuries in bedridden post-discharge patients.',
      price: 3899,
      rentalPriceMonthly: 1200,
      isRentalAvailable: true,
      requiresPrescription: false,
      setupRequiredByClinician: true,
      recommendedSpecialistRole: 'nurse',
      stockQuantity: 28,
      images: ['/assets/images/products/mattress.jpg'],
      specifications: {
        Cells: '130 alternating bubble cells',
        CycleTime: '10-12 minutes automated alternation',
        PumpNoise: 'Under 30 dB silent compressor',
        Dimensions: '200 x 90 x 7 cm',
      },
      hsnCode: '9019',
      gstRate: 12,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 14,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
      ],
      isActive: true,
      isDemo: true,
    },

    // 5. Clinical Nutrition
    {
      sku: 'NUTR-ONCO-FORMULA-06',
      title: 'High-Protein Clinical Recovery Nutrition Formula (400g Tin)',
      category: 'clinical_nutrition' as ProductCategory,
      badge: 'Oncology & Post-Op Recovery',
      description:
        'Specialized oral nutritional supplement enriched with whey peptide protein, dietary fiber, and immunonutrients designed to prevent muscle wasting and support post-chemo recovery.',
      price: 749,
      isRentalAvailable: false,
      requiresPrescription: false,
      setupRequiredByClinician: false,
      recommendedSpecialistRole: 'dietitian',
      stockQuantity: 60,
      images: ['/assets/images/products/nutrition-formula.jpg'],
      specifications: {
        CaloricDensity: '1.2 kcal/ml when reconstituted',
        ProteinContent: '42g per 100g powder',
        Flavor: 'Vanilla Malt (Sugar Free)',
      },
      hsnCode: '2106',
      gstRate: 18,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 30,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
      ],
      isActive: true,
      isDemo: true,
    },
    {
      sku: 'NUTR-ENTERAL-FEED-12',
      title: 'Isocaloric Enteral Tube Feeding Formula (1000ml Ready-to-Hang)',
      category: 'clinical_nutrition' as ProductCategory,
      badge: 'Complete Enteral Support',
      description:
        'Sterile nutritionally complete closed-system enteral feed formulated for nasogastric or PEG tube-fed patients requiring standardized macro and micronutrient intake.',
      price: 1150,
      isRentalAvailable: false,
      requiresPrescription: true,
      setupRequiredByClinician: false,
      recommendedSpecialistRole: 'dietitian',
      stockQuantity: 40,
      images: ['/assets/images/products/enteral-feed.jpg'],
      specifications: {
        Osmolality: '300 mOsm/kg H2O',
        Packaging: '1000ml sterile RTH container with spike port',
        ShelfLife: '12 months unopened at ambient temperature',
      },
      hsnCode: '2106',
      gstRate: 18,
      depots: [
        {
          depotName: 'Dadar Central DME Logistics Hub',
          city: 'Mumbai',
          pincode: '400014',
          inStockCount: 20,
          contactPhone: '9822099222',
          location: { type: 'Point', coordinates: [72.8432, 19.0178] },
        },
      ],
      isActive: true,
      isDemo: true,
    },

    // 6. Fall Prevention (SDoH) & Wound Care
    {
      sku: 'DME-FALL-GRAB-01',
      title: 'Adjustable Stainless Steel Shower Grab Bar',
      category: 'fall_prevention' as ProductCategory,
      badge: 'SDoH Fall Hazard Mitigation',
      description:
        'Heavy-duty textured knurled stainless steel bathroom grab bar with concealed mounting hardware. Dispatched directly to home to mitigate bathroom slip and fall hazards identified during discharge audits.',
      price: 1299,
      isRentalAvailable: false,
      requiresPrescription: false,
      setupRequiredByClinician: true,
      recommendedSpecialistRole: 'chw',
      stockQuantity: 45,
      images: ['/assets/images/products/grab-bar.jpg'],
      specifications: {
        Material: 'Grade 304 Stainless Steel',
        Length: '18 inches (45 cm)',
        WeightCapacity: '150 kg',
        Finish: 'Anti-slip textured knurled grip',
      },
      hsnCode: '9021',
      gstRate: 12,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 20,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
      ],
      isActive: true,
      isDemo: true,
    },
    {
      sku: 'WOUND-HYDRO-KIT-13',
      title: 'Antimicrobial Silver Hydrocolloid Dressing Kit (Pack of 10)',
      category: 'wound_care' as ProductCategory,
      badge: 'Chronic Wound Management',
      description:
        'Sterile ionic silver hydrocolloid dressings for moderately exuding wounds, pressure ulcers, and diabetic foot lesions. Maintained in sterile blister packaging.',
      price: 1450,
      isRentalAvailable: false,
      requiresPrescription: false,
      setupRequiredByClinician: true,
      recommendedSpecialistRole: 'nurse',
      stockQuantity: 50,
      images: ['/assets/images/products/dressing-kit.jpg'],
      specifications: {
        Dimensions: '10 cm x 10 cm square',
        Sterilization: 'Gamma irradiated sterile barrier',
        WearTime: 'Up to 7 days per application',
      },
      hsnCode: '3005',
      gstRate: 12,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 25,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
      ],
      isActive: true,
      isDemo: true,
    },

    // 7. Demonstration Out-Of-Stock Equipment (for UI empty/zero-stock verification)
    {
      sku: 'DME-MOB-SCOOTER-OUT',
      title: 'Motorized Power Mobility Scooter (Demo Out of Stock)',
      category: 'mobility' as ProductCategory,
      badge: 'High Demand - Restocking',
      description:
        'Four-wheel electric indoor/outdoor power scooter with delta tiller, headlight, and puncture-proof pneumatic tires. Currently awaiting warehouse replenishment.',
      price: 78000,
      rentalPriceMonthly: 11000,
      isRentalAvailable: true,
      requiresPrescription: true,
      setupRequiredByClinician: true,
      recommendedSpecialistRole: 'technician',
      stockQuantity: 0, // Demonstrates out-of-stock validation
      images: ['/assets/images/products/scooter.jpg'],
      specifications: {
        MaxSpeed: '8 km/h',
        Range: '25 km per charge',
        WeightCapacity: '136 kg',
      },
      hsnCode: '8713',
      gstRate: 12,
      depots: [
        {
          depotName: 'Kothrud Medical Equipment Depot',
          city: 'Pune',
          pincode: '411038',
          inStockCount: 0,
          contactPhone: '9822099111',
          location: { type: 'Point', coordinates: [73.8055, 18.5074] },
        },
      ],
      isActive: true,
      isDemo: true,
    },
  ];

  for (const prod of defaultProducts) {
    await MedicalProduct.updateOne({ sku: prod.sku }, { $set: prod }, { upsert: true });
  }
  console.log('[Seed] Medical product catalog and DME inventory initialized/updated with 14 products.');
};

/**
 * Query medical products catalog with category, search, and rental filters.
 */
export const listMedicalProducts = async (filters: {
  category?: string;
  search?: string;
  rentalOnly?: boolean;
  inStockOnly?: boolean;
  page?: number;
  limit?: number;
}) => {
  await seedMedicalProductsIfEmpty();

  const query: any = { isActive: true };

  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }

  if (filters.rentalOnly) {
    query.isRentalAvailable = true;
  }

  if (filters.inStockOnly) {
    query.stockQuantity = { $gt: 0 };
  }

  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [{ title: searchRegex }, { description: searchRegex }, { sku: searchRegex }, { badge: searchRegex }];
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    MedicalProduct.find(query).sort({ stockQuantity: -1, price: 1 }).skip(skip).limit(limit).lean(),
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
 * Fetch a single product by ID or SKU.
 */
export const getMedicalProductById = async (idOrSku: string): Promise<IMedicalProduct> => {
  await seedMedicalProductsIfEmpty();

  let product: IMedicalProduct | null = null;
  if (mongoose.Types.ObjectId.isValid(idOrSku)) {
    product = await MedicalProduct.findById(idOrSku);
  }
  if (!product) {
    product = await MedicalProduct.findOne({ sku: idOrSku.toUpperCase() });
  }

  if (!product) {
    throw new AppError('Medical product or equipment not found', 404);
  }

  return product;
};

// =============================================================================
// CART SERVICE FUNCTIONS (Server-side revalidation & Persistence)
// =============================================================================

export interface RevalidatedCartItem {
  productId: string;
  sku: string;
  title: string;
  category: string;
  images: string[];
  unitPrice: number;
  monthlyRentalPrice?: number;
  isRental: boolean;
  rentalDurationMonths: number;
  quantity: number;
  itemSubtotal: number;
  inStock: boolean;
  stockAvailable: number;
  setupRequired: boolean;
  isDemo: boolean;
}

export interface RevalidatedCart {
  items: RevalidatedCartItem[];
  pricing: {
    subtotal: number;
    deliveryFee: number;
    taxGst: number;
    totalAmount: number;
  };
  warnings: string[];
  totalItemCount: number;
  hasUnavailableItems: boolean;
}

/**
 * Pure server-side stock and price revalidation for any list of cart items
 * Never trusts client-supplied prices or stock values
 */
export const validateCartItems = async (
  rawItems: Array<{
    productId: string;
    quantity: number;
    isRental?: boolean;
    rentalDurationMonths?: number;
  }>
): Promise<RevalidatedCart> => {
  await seedMedicalProductsIfEmpty();

  const validatedItems: RevalidatedCartItem[] = [];
  const warnings: string[] = [];
  let subtotal = 0;
  let totalItemCount = 0;
  let hasUnavailableItems = false;

  for (const item of rawItems || []) {
    if (!item.productId) continue;

    let product: IMedicalProduct | null = null;
    if (mongoose.Types.ObjectId.isValid(item.productId)) {
      product = await MedicalProduct.findById(item.productId);
    }
    if (!product) {
      product = await MedicalProduct.findOne({ sku: item.productId.toUpperCase() });
    }

    if (!product || !product.isActive) {
      warnings.push(`One of the items in your cart is no longer available and was excluded.`);
      hasUnavailableItems = true;
      continue;
    }

    const isRental = Boolean(item.isRental && product.isRentalAvailable);
    const rentalDurationMonths = Math.min(24, Math.max(1, item.rentalDurationMonths || 1));
    const requestedQty = Math.max(1, item.quantity || 1);

    // Stock check
    let quantity = requestedQty;
    let inStock = true;

    if (product.stockQuantity <= 0) {
      inStock = false;
      hasUnavailableItems = true;
      warnings.push(`"${product.title}" is currently out of stock.`);
    } else if (requestedQty > product.stockQuantity) {
      quantity = product.stockQuantity;
      warnings.push(
        `Quantity for "${product.title}" adjusted to maximum available stock (${product.stockQuantity}).`
      );
    }

    // Authoritative server-side price calculation
    const unitPrice = isRental
      ? (product.rentalPriceMonthly || product.price) * rentalDurationMonths
      : product.price;

    const itemSubtotal = inStock ? unitPrice * quantity : 0;
    if (inStock) {
      subtotal += itemSubtotal;
      totalItemCount += quantity;
    }

    validatedItems.push({
      productId: product._id.toString(),
      sku: product.sku,
      title: product.title,
      category: product.category,
      images: product.images,
      unitPrice,
      monthlyRentalPrice: product.rentalPriceMonthly,
      isRental,
      rentalDurationMonths,
      quantity,
      itemSubtotal,
      inStock,
      stockAvailable: product.stockQuantity,
      setupRequired: product.setupRequiredByClinician,
      isDemo: product.isDemo,
    });
  }

  // Delivery fee: Free for orders >= ₹2000, else ₹150
  const deliveryFee = subtotal === 0 || subtotal >= 2000 ? 0 : 150;
  const taxGst = Math.round(subtotal * 0.12);
  const totalAmount = subtotal + deliveryFee + taxGst;

  return {
    items: validatedItems,
    pricing: {
      subtotal,
      deliveryFee,
      taxGst,
      totalAmount,
    },
    warnings,
    totalItemCount,
    hasUnavailableItems,
  };
};

/**
 * Fetch patient's saved cart and return freshly revalidated items
 */
export const getPatientCart = async (userId: string): Promise<RevalidatedCart> => {
  const cart = await ShoppingCart.findOne({ patientId: userId });
  if (!cart || cart.items.length === 0) {
    return {
      items: [],
      pricing: { subtotal: 0, deliveryFee: 0, taxGst: 0, totalAmount: 0 },
      warnings: [],
      totalItemCount: 0,
      hasUnavailableItems: false,
    };
  }

  const rawItems = cart.items.map((i) => ({
    productId: i.productId.toString(),
    quantity: i.quantity,
    isRental: i.isRental,
    rentalDurationMonths: i.rentalDurationMonths,
  }));

  return validateCartItems(rawItems);
};

/**
 * Save / sync patient's shopping cart in MongoDB
 */
export const savePatientCart = async (
  userId: string,
  items: Array<{
    productId: string;
    quantity: number;
    isRental?: boolean;
    rentalDurationMonths?: number;
  }>
): Promise<RevalidatedCart> => {
  const sanitizedItems = (items || []).filter((i) => i && i.productId).map((i) => ({
    productId: new mongoose.Types.ObjectId(i.productId),
    sku: 'DME-ITEM',
    quantity: Math.max(1, i.quantity || 1),
    isRental: Boolean(i.isRental),
    rentalDurationMonths: i.rentalDurationMonths || 1,
    addedAt: new Date(),
  }));

  await ShoppingCart.findOneAndUpdate(
    { patientId: userId },
    { $set: { items: sanitizedItems } },
    { upsert: true, new: true }
  );

  return getPatientCart(userId);
};

/**
 * Clear shopping cart for patient
 */
export const clearPatientCart = async (userId: string): Promise<void> => {
  await ShoppingCart.findOneAndUpdate(
    { patientId: userId },
    { $set: { items: [] } },
    { upsert: true }
  );
};

// =============================================================================
// ORDER CREATION & FULFILLMENT
// =============================================================================

/**
 * Place a new medical equipment order or rental request with duplicate protection
 * and strict server-side stock and pricing revalidation.
 */
export const createProductOrder = async (
  userId: string,
  data: {
    items: Array<{
      productId: string;
      quantity: number;
      isRental?: boolean;
      rentalDurationMonths?: number;
    }>;
    deliveryAddress: {
      street: string;
      city: string;
      state?: string;
      pincode: string;
      contactPhone?: string;
    };
    paymentMethod?: 'online' | 'cod' | 'insurance_claim';
    hospitalReferralId?: string;
    patientName?: string;
    patientPhone?: string;
    patientEmail?: string;
    idempotencyKey?: string;
    installationPreferences?: {
      preferredDate?: string;
      preferredSlot?: string;
      accessInstructions?: string;
    };
  }
): Promise<IProductOrder> => {
  if (!data.items || data.items.length === 0) {
    throw new AppError('Order must contain at least one medical product item', 400);
  }

  // Address validation
  if (!data.deliveryAddress?.street?.trim() || !data.deliveryAddress?.city?.trim() || !data.deliveryAddress?.pincode?.trim()) {
    throw new AppError('Delivery address (street, city, pincode) is mandatory', 400);
  }

  const pincodeClean = data.deliveryAddress.pincode.trim();
  if (!/^[1-9][0-9]{5}$/.test(pincodeClean)) {
    throw new AppError('Delivery pincode must be a valid 6-digit Indian postal code (e.g. 411038)', 400);
  }

  // Duplicate submission protection (Idempotency Key)
  if (data.idempotencyKey) {
    const existingOrder = await ProductOrder.findOne({
      patientId: userId,
      idempotencyKey: data.idempotencyKey,
    });
    if (existingOrder) {
      (existingOrder as any).isExisting = true;
      return existingOrder;
    }
  }

  // Debounce duplicate submission: check if identical order was placed within last 15 seconds
  const fifteenSecondsAgo = new Date(Date.now() - 15000);
  const recentDuplicate = await ProductOrder.findOne({
    patientId: userId,
    createdAt: { $gte: fifteenSecondsAgo },
    'deliveryAddress.street': data.deliveryAddress.street.trim(),
    'deliveryAddress.pincode': pincodeClean,
  });
  if (recentDuplicate) {
    (recentDuplicate as any).isExisting = true;
    return recentDuplicate;
  }

  // Authoritative revalidation of items and inventory deduction
  let subtotal = 0;
  let procurementCostTotal = 0;
  let setupRequired = false;
  let recommendedRole: string | undefined;
  const populatedItems: any[] = [];
  const itemsToReserve: Array<{ productId: mongoose.Types.ObjectId; title: string; qty: number }> = [];

  for (const item of data.items) {
    const prod = await MedicalProduct.findById(item.productId);
    if (!prod || !prod.isActive) {
      throw new AppError(`Product ${item.productId} is invalid or inactive`, 400);
    }

    const qty = Math.max(1, item.quantity || 1);

    const isRental = Boolean(item.isRental && prod.isRentalAvailable);
    const rentalDurationMonths = isRental ? Math.min(24, Math.max(1, item.rentalDurationMonths || 1)) : undefined;

    // Strict price derivation from database
    const unitPrice = isRental
      ? (prod.rentalPriceMonthly || prod.price) * (rentalDurationMonths || 1)
      : prod.price;

    subtotal += unitPrice * qty;
    const itemProcurement = (prod.procurementCost || 0) * qty;
    procurementCostTotal += itemProcurement;

    if (prod.setupRequiredByClinician) {
      setupRequired = true;
      recommendedRole = prod.recommendedSpecialistRole || 'technician';
    }

    populatedItems.push({
      productId: prod._id,
      sku: prod.sku,
      title: prod.title,
      category: prod.category,
      quantity: qty,
      unitPrice,
      isRental,
      rentalDurationMonths,
      setupRequired: prod.setupRequiredByClinician,
      sourcingType: prod.sourcingType || 'own_stock',
      supplierId: prod.supplierId,
      procurementCost: prod.procurementCost || 0,
    });

    itemsToReserve.push({ productId: prod._id, title: prod.title, qty });
  }

  // Safe Atomic Inventory Reservation with Concurrency Control
  const reservedItems: Array<{ productId: mongoose.Types.ObjectId; qty: number; depotCity?: string }> = [];

  for (const item of itemsToReserve) {
    const reservedProduct = await MedicalProduct.findOneAndUpdate(
      {
        _id: item.productId,
        isActive: true,
        stockQuantity: { $gte: item.qty },
      },
      {
        $inc: {
          stockQuantity: -item.qty,
          reservedQuantity: item.qty,
        },
      },
      { new: true }
    );

    if (!reservedProduct) {
      // Rollback any earlier reservations made in this transaction to prevent partial reservation leaks
      for (const prior of reservedItems) {
        await MedicalProduct.findByIdAndUpdate(prior.productId, {
          $inc: {
            stockQuantity: prior.qty,
            reservedQuantity: -prior.qty,
          },
        });
        if (prior.depotCity) {
          await MedicalProduct.findOneAndUpdate(
            { _id: prior.productId, 'depots.city': prior.depotCity },
            { $inc: { 'depots.$.inStockCount': prior.qty } }
          );
        }
      }
      throw new AppError(
        `Insufficient stock for "${item.title}". Requested quantity (${item.qty}) exceeds available inventory.`,
        400
      );
    }

    // Atomically deduct from regional depot if depot stock exists
    let deductedDepotCity: string | undefined;
    if (reservedProduct.depots && reservedProduct.depots.length > 0) {
      const depotUpdate = await MedicalProduct.findOneAndUpdate(
        {
          _id: item.productId,
          'depots.inStockCount': { $gte: item.qty },
        },
        {
          $inc: { 'depots.$.inStockCount': -item.qty },
        },
        { new: true }
      );
      if (depotUpdate) {
        const matched = reservedProduct.depots.find((d) => d.inStockCount >= item.qty);
        deductedDepotCity = matched?.city;
      }
    }

    reservedItems.push({
      productId: item.productId,
      qty: item.qty,
      depotCity: deductedDepotCity,
    });
  }

  const deliveryFee = subtotal >= 2000 ? 0 : 150; // Free delivery over ₹2000
  const taxGst = Math.round(subtotal * 0.12);
  const totalAmount = subtotal + deliveryFee + taxGst;

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `VQ-ORD-2026-${randomDigits}`;

  // Initial payment status
  const paymentMethod = data.paymentMethod || 'cod';
  const initialPaymentStatus = paymentMethod === 'cod' ? 'cod' : 'pending';

  const order = await ProductOrder.create({
    orderNumber,
    patientId: userId,
    patientName: data.patientName || 'Verified Patient',
    patientPhone: data.patientPhone || data.deliveryAddress.contactPhone || '9810011111',
    patientEmail: data.patientEmail,
    hospitalReferralId: data.hospitalReferralId,
    idempotencyKey: data.idempotencyKey,
    items: populatedItems,
    pricing: {
      subtotal,
      deliveryFee,
      taxGst,
      totalAmount,
      procurementCostTotal,
      refundAmount: 0,
      gatewayFee: paymentMethod === 'online' ? Math.round(totalAmount * 0.02) : 0,
    },
    deliveryAddress: {
      street: data.deliveryAddress.street.trim(),
      city: data.deliveryAddress.city.trim(),
      state: data.deliveryAddress.state?.trim() || 'Maharashtra',
      pincode: pincodeClean,
      contactPhone: data.deliveryAddress.contactPhone?.trim(),
    },
    clinicalSetup: {
      isSetupRequired: setupRequired,
      setupStatus: setupRequired ? 'pending' : 'not_required',
      setupNotes: setupRequired
        ? `Requires in-home assembly and calibration by certified ${recommendedRole}.`
        : undefined,
    },
    installationPreferences: data.installationPreferences
      ? {
          preferredDate: data.installationPreferences.preferredDate
            ? new Date(data.installationPreferences.preferredDate)
            : undefined,
          preferredSlot: data.installationPreferences.preferredSlot,
          accessInstructions: data.installationPreferences.accessInstructions,
        }
      : undefined,
    orderStatus: 'placed',
    paymentStatus: initialPaymentStatus,
    paymentMethod,
    trackingUpdates: [
      {
        timestamp: new Date(),
        status: 'placed',
        message: 'Order received and logged in VivoQuest central dispatch system.',
        location: `${data.deliveryAddress.city} Central Hub`,
      },
    ],
    isDemo: false,
  });

  // Clear patient cart upon successful order placement
  await clearPatientCart(userId);

  return order;
};

/**
 * List orders belonging to authenticated patient.
 */
export const getPatientOrders = async (userId: string): Promise<IProductOrder[]> => {
  return ProductOrder.find({ patientId: userId }).sort({ createdAt: -1 }).lean() as unknown as IProductOrder[];
};

/**
 * Get order details by ID or order number with cross-patient boundary enforcement.
 */
export const getOrderById = async (
  orderIdOrNumber: string,
  userId: string
): Promise<IProductOrder> => {
  let query: any = { orderNumber: orderIdOrNumber };
  if (mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
    query = { _id: orderIdOrNumber };
  }

  const order = await ProductOrder.findOne(query).lean();
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Cross-patient boundary check
  if (order.patientId.toString() !== userId) {
    throw new AppError('Access denied: You cannot view orders placed by other patients', 403);
  }

  return order as unknown as IProductOrder;
};

/**
 * Patient order cancellation under defined policy rules
 */
export const cancelPatientOrder = async (
  orderIdOrNumber: string,
  userId: string,
  reason: string
): Promise<IProductOrder> => {
  let query: any = { orderNumber: orderIdOrNumber };
  if (mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
    query = { _id: orderIdOrNumber };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.patientId.toString() !== userId) {
    throw new AppError('Access denied: You cannot cancel orders placed by other patients', 403);
  }

  // Defined Order Policy: Only orders in 'placed' or 'confirmed' status may be cancelled by the patient
  // Atomically transition order status to 'cancelled' so double-cancellation cannot race
  const updatedOrder = await ProductOrder.findOneAndUpdate(
    {
      _id: order._id,
      orderStatus: { $in: ['placed', 'confirmed'] },
    },
    {
      $set: {
        orderStatus: 'cancelled',
        cancellation: {
          isCancelled: true,
          cancelledAt: new Date(),
          cancelledBy: 'patient',
          cancellationReason: reason || 'Cancelled by patient prior to dispatch',
          refundStatus: order.paymentStatus === 'paid' ? 'pending' : 'none',
        },
      },
      $push: {
        trackingUpdates: {
          timestamp: new Date(),
          status: 'cancelled',
          message: `Order cancelled by patient. Reason: ${reason || 'Patient cancellation'}. Reserved stock restored.`,
          location: 'Patient Portal',
        },
      },
    },
    { new: true }
  );

  if (!updatedOrder) {
    throw new AppError(
      `Order cannot be cancelled in status '${order.orderStatus}' or has already been cancelled.`,
      400
    );
  }

  // Atomically restore inventory and release reservedQuantity
  for (const item of updatedOrder.items) {
    await MedicalProduct.findByIdAndUpdate(item.productId, {
      $inc: {
        stockQuantity: item.quantity,
        reservedQuantity: -item.quantity,
      },
    });
    await MedicalProduct.findOneAndUpdate(
      { _id: item.productId, 'depots.0': { $exists: true } },
      { $inc: { 'depots.0.inStockCount': item.quantity } }
    );
  }

  // Audit record
  await AuditLog.create({
    action: 'CANCEL_PRODUCT_ORDER',
    category: 'order_fulfillment',
    actorId: updatedOrder.patientId,
    actorName: updatedOrder.patientName,
    actorRole: 'patient',
    targetType: 'PRODUCT_ORDER',
    targetId: updatedOrder.orderNumber,
    details: { reason, previousStatus: order.orderStatus },
    severity: 'info',
  });

  return updatedOrder;
};

/**
 * Patient return request under defined policy rules
 */
export const requestOrderReturn = async (
  orderIdOrNumber: string,
  userId: string,
  reason: string
): Promise<IProductOrder> => {
  let query: any = { orderNumber: orderIdOrNumber };
  if (mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
    query = { _id: orderIdOrNumber };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.patientId.toString() !== userId) {
    throw new AppError('Access denied: You cannot request return for another patient order', 403);
  }

  if (order.orderStatus !== 'delivered') {
    throw new AppError('Returns can only be requested for delivered equipment', 400);
  }

  order.returnDetails = {
    isReturnRequested: true,
    returnStatus: 'requested',
    returnReason: reason || 'Patient requested equipment return / pickup',
    requestedAt: new Date(),
  };

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Return pickup requested: ${reason || 'Patient request'}. Operations dispatch will arrange inspection.`,
    location: 'Support & Reverse Logistics',
  });

  await order.save();
  return order;
};

/**
 * Schedule or update clinician setup visit for order
 */
export const scheduleOrderSetup = async (
  orderIdOrNumber: string,
  userId: string,
  data: {
    setupDate: string;
    setupSlot?: string;
    setupNotes?: string;
  }
): Promise<IProductOrder> => {
  let query: any = { orderNumber: orderIdOrNumber };
  if (mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
    query = { _id: orderIdOrNumber };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.patientId.toString() !== userId) {
    throw new AppError('Access denied: You cannot schedule setup for another patient order', 403);
  }

  if (!order.clinicalSetup.isSetupRequired) {
    throw new AppError('This order does not contain items requiring clinical installation', 400);
  }

  order.clinicalSetup.setupDate = new Date(data.setupDate);
  order.clinicalSetup.setupStatus = 'scheduled';
  if (data.setupNotes) {
    order.clinicalSetup.setupNotes = data.setupNotes;
  }

  order.installationPreferences = {
    preferredDate: new Date(data.setupDate),
    preferredSlot: data.setupSlot || 'Morning (9:00 AM - 1:00 PM)',
    accessInstructions: data.setupNotes,
  };

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `In-home clinical setup scheduled for ${new Date(data.setupDate).toLocaleDateString(
      'en-IN'
    )} (${data.setupSlot || 'Standard Slot'}). Certified clinician dispatched alongside equipment.`,
    location: `${order.deliveryAddress.city} Field Dispatch`,
  });

  await order.save();
  return order;
};
