import { MedicalProduct, IMedicalProduct, ProductCategory } from '../models/MedicalProduct.js';
import { ProductOrder, IProductOrder, OrderStatus } from '../models/ProductOrder.js';
import { ShoppingCart, IShoppingCart } from '../models/ShoppingCart.js';
import { ProductReview, IProductReview } from '../models/ProductReview.js';
import { ProductComplaint, IProductComplaint } from '../models/ProductComplaint.js';
import { DeliveryRating, IDeliveryRating } from '../models/DeliveryRating.js';
import { Supplier } from '../models/Supplier.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { sendPatientNotification } from './notificationService.js';
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
    if (prod.images && prod.images.length === 1) {
      const base = prod.images[0].replace('.jpg', '');
      prod.images.push(`${base}-2.jpg`);
    }
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
  sourcingType?: string;
  installationOnly?: boolean;
  status?: string;
  supplierId?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) => {
  await seedMedicalProductsIfEmpty();

  const query: any = {};

  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  } else {
    // Default to active for public listing
    query.isActive = true;
  }

  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }

  if (filters.rentalOnly) {
    query.isRentalAvailable = true;
  }

  if (filters.inStockOnly) {
    query.stockQuantity = { $gt: 0 };
  }

  if (filters.installationOnly) {
    query.installationEligible = true;
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

  if (filters.supplierId && mongoose.Types.ObjectId.isValid(filters.supplierId)) {
    query.supplierId = new mongoose.Types.ObjectId(filters.supplierId);
  }

  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [{ title: searchRegex }, { description: searchRegex }, { sku: searchRegex }, { badge: searchRegex }];
  }

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  let sortOption: any = { stockQuantity: -1, price: 1 };
  if (filters.sort === 'price_asc') {
    sortOption = { sellingPrice: 1, price: 1 };
  } else if (filters.sort === 'price_desc') {
    sortOption = { sellingPrice: -1, price: -1 };
  } else if (filters.sort === 'rating') {
    sortOption = { averageRating: -1, reviewCount: -1 };
  } else if (filters.sort === 'newest') {
    sortOption = { createdAt: -1 };
  }

  const [rawProducts, total] = await Promise.all([
    MedicalProduct.find(query).sort(sortOption).skip(skip).limit(limit).lean(),
    MedicalProduct.countDocuments(query),
  ]);

  const products = rawProducts.map((p: any) => {
    const onHand = Number(p.stockQuantity) || 0;
    const reserved = Number(p.reservedQuantity) || 0;
    const availableToSell = Math.max(0, onHand - reserved);
    const { procurementCost, ...publicData } = p;
    return {
      ...publicData,
      id: p._id?.toString(),
      availableToSell,
      stockQuantity: onHand,
      reservedQuantity: reserved,
    };
  });

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
export const getMedicalProductById = async (idOrSku: string): Promise<any> => {
  await seedMedicalProductsIfEmpty();

  let product: any = null;
  if (mongoose.Types.ObjectId.isValid(idOrSku)) {
    product = await MedicalProduct.findById(idOrSku).lean();
  }
  if (!product) {
    product = await MedicalProduct.findOne({ sku: idOrSku.toUpperCase() }).lean();
  }

  if (!product) {
    throw new AppError('Medical product or equipment not found', 404);
  }

  const onHand = Number(product.stockQuantity) || 0;
  const reserved = Number(product.reservedQuantity) || 0;
  product.availableToSell = Math.max(0, onHand - reserved);
  product.id = product._id?.toString();
  delete product.procurementCost;

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
  regularPrice: number;
  sellingPrice: number;
  discountAmount: number;
  monthlyRentalPrice?: number;
  isRental: boolean;
  rentalDurationMonths: number;
  quantity: number;
  itemSubtotal: number;
  inStock: boolean;
  stockAvailable: number;
  setupRequired: boolean;
  installationEligible: boolean;
  installationSelected: boolean;
  installationServiceCharge: number;
  sourcingType: string;
  supplierId?: string;
  supplierName?: string;
  isDemo: boolean;
}

export interface RevalidatedCart {
  items: RevalidatedCartItem[];
  pricing: {
    subtotal: number;
    discountTotal: number;
    deliveryFee: number;
    taxGst: number;
    installationCharge: number;
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
    installationSelected?: boolean;
  }>
): Promise<RevalidatedCart> => {
  await seedMedicalProductsIfEmpty();

  const validatedItems: RevalidatedCartItem[] = [];
  const warnings: string[] = [];
  let subtotal = 0;
  let discountTotal = 0;
  let installationCharge = 0;
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

    if (!product || !product.isActive || product.status === 'archived') {
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

    if (product.stockQuantity <= 0 || product.status === 'out_of_stock') {
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
    const regularUnitPrice = isRental
      ? (product.rentalPriceMonthly || product.regularPrice || product.price) * rentalDurationMonths
      : (product.regularPrice || product.price);

    const unitPrice = isRental
      ? (product.rentalPriceMonthly || product.sellingPrice || product.price) * rentalDurationMonths
      : (product.sellingPrice || product.price);

    const itemSubtotal = inStock ? unitPrice * quantity : 0;
    const itemDiscount = inStock ? Math.max(0, regularUnitPrice - unitPrice) * quantity : 0;

    const installationEligible = Boolean(product.installationEligible);
    const installationSelected = Boolean(item.installationSelected && installationEligible);
    const itemInstallationCharge = installationSelected && inStock
      ? (product.installationServiceCharge || 0) * quantity
      : 0;

    if (inStock) {
      subtotal += itemSubtotal;
      discountTotal += itemDiscount;
      installationCharge += itemInstallationCharge;
      totalItemCount += quantity;
    }

    validatedItems.push({
      productId: product._id.toString(),
      sku: product.sku,
      title: product.title,
      category: product.category,
      images: product.images,
      unitPrice,
      regularPrice: regularUnitPrice,
      sellingPrice: unitPrice,
      discountAmount: itemDiscount,
      monthlyRentalPrice: product.rentalPriceMonthly,
      isRental,
      rentalDurationMonths,
      quantity,
      itemSubtotal,
      inStock,
      stockAvailable: product.stockQuantity,
      setupRequired: product.setupRequiredByClinician,
      installationEligible,
      installationSelected,
      installationServiceCharge: product.installationServiceCharge || 0,
      sourcingType: product.sourcingType,
      supplierId: product.supplierId?.toString(),
      supplierName: product.supplierName,
      isDemo: product.isDemo,
    });
  }

  // Delivery fee: Free for orders >= ₹2000, else ₹150
  const deliveryFee = subtotal === 0 || subtotal >= 2000 ? 0 : 150;
  const taxGst = Math.round(subtotal * 0.12);
  const totalAmount = subtotal + deliveryFee + taxGst + installationCharge;

  return {
    items: validatedItems,
    pricing: {
      subtotal,
      discountTotal,
      deliveryFee,
      taxGst,
      installationCharge,
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
      pricing: { subtotal: 0, discountTotal: 0, deliveryFee: 0, taxGst: 0, installationCharge: 0, totalAmount: 0 },
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
    installationSelected: i.installationSelected,
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
    installationSelected?: boolean;
  }>
): Promise<RevalidatedCart> => {
  const sanitizedItems = (items || []).filter((i) => i && i.productId).map((i) => ({
    productId: new mongoose.Types.ObjectId(i.productId),
    sku: 'DME-ITEM',
    quantity: Math.max(1, i.quantity || 1),
    isRental: Boolean(i.isRental),
    rentalDurationMonths: i.rentalDurationMonths || 1,
    installationSelected: Boolean(i.installationSelected),
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
  if (!data.idempotencyKey) {
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
  }

  // Authoritative revalidation of items and inventory deduction
  let subtotal = 0;
  let discountTotal = 0;
  let installationChargeTotal = 0;
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
    const regularUnitPrice = isRental
      ? (prod.rentalPriceMonthly || prod.regularPrice || prod.price) * (rentalDurationMonths || 1)
      : (prod.regularPrice || prod.price);

    const unitPrice = isRental
      ? (prod.rentalPriceMonthly || prod.sellingPrice || prod.price) * (rentalDurationMonths || 1)
      : (prod.sellingPrice || prod.price);

    const itemSubtotal = unitPrice * qty;
    const itemDiscount = Math.max(0, regularUnitPrice - unitPrice) * qty;
    subtotal += itemSubtotal;
    discountTotal += itemDiscount;

    const installationSelected = Boolean((item as any).installationSelected && prod.installationEligible);
    const itemInstallationCharge = installationSelected ? (prod.installationServiceCharge || 0) * qty : 0;
    installationChargeTotal += itemInstallationCharge;

    const itemProcurement = (prod.procurementCost || 0) * qty;
    procurementCostTotal += itemProcurement;

    if (prod.setupRequiredByClinician || installationSelected) {
      setupRequired = true;
      recommendedRole = prod.recommendedSpecialistRole || 'specialist technician';
    }

    populatedItems.push({
      productId: prod._id,
      sku: prod.sku,
      title: prod.title,
      category: prod.category,
      quantity: qty,
      unitPrice,
      regularPrice: regularUnitPrice,
      discountAmount: itemDiscount,
      isRental,
      rentalDurationMonths,
      setupRequired: prod.setupRequiredByClinician || installationSelected,
      installationSelected,
      installationCharge: itemInstallationCharge,
      sourcingType: prod.sourcingType || 'own_stock',
      supplierId: prod.supplierId,
      supplierName: prod.supplierName,
      supplierStatus: (prod.sourcingType === 'supplier_direct' || (prod.sourcingType as any) === 'supplier') ? 'pending' : undefined,
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
        $expr: {
          $gte: [
            { $subtract: ['$stockQuantity', { $ifNull: ['$reservedQuantity', 0] }] },
            item.qty,
          ],
        },
      },
      {
        $inc: {
          reservedQuantity: item.qty,
        },
        $set: {
          lastStockUpdateAt: new Date(),
        },
      },
      { new: true }
    );

    if (!reservedProduct) {
      // Rollback any earlier reservations made in this transaction to prevent partial reservation leaks
      for (const prior of reservedItems) {
        await MedicalProduct.findByIdAndUpdate(prior.productId, {
          $inc: {
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
  const totalAmount = subtotal + deliveryFee + taxGst + installationChargeTotal;

  // Build supplier fulfillment groups for multi-supplier split routing
  const supplierMap = new Map<string, { supplierId: mongoose.Types.ObjectId; supplierName?: string }>();
  for (const it of populatedItems) {
    if ((it.sourcingType === 'supplier_direct' || (it.sourcingType as any) === 'supplier') && it.supplierId) {
      supplierMap.set(it.supplierId.toString(), {
        supplierId: it.supplierId,
        supplierName: it.supplierName,
      });
    }
  }
  const supplierFulfillments = Array.from(supplierMap.values()).map((s) => ({
    supplierId: s.supplierId,
    supplierName: s.supplierName,
    status: 'pending' as const,
  }));

  let randomDigits = Math.floor(1000 + Math.random() * 9000);
  let orderNumber = `VQ-ORD-2026-${randomDigits}`;
  let invoiceNumber = `INV-PRD-2026-${randomDigits}`;
  while (await ProductOrder.exists({ $or: [{ orderNumber }, { invoiceNumber }] })) {
    randomDigits = Math.floor(1000 + Math.random() * 9000);
    orderNumber = `VQ-ORD-2026-${randomDigits}`;
    invoiceNumber = `INV-PRD-2026-${randomDigits}`;
  }
  const invoiceGeneratedAt = new Date();

  // Initial payment status
  const paymentMethod = data.paymentMethod || 'cod';
  const initialPaymentStatus = paymentMethod === 'cod' ? 'cod' : 'pending';

  const order = await ProductOrder.create({
    orderNumber,
    invoiceNumber,
    invoiceGeneratedAt,
    patientId: userId,
    patientName: data.patientName || 'Verified Patient',
    patientPhone: data.patientPhone || data.deliveryAddress.contactPhone || '9810011111',
    patientEmail: data.patientEmail,
    hospitalReferralId: data.hospitalReferralId,
    idempotencyKey: data.idempotencyKey,
    items: populatedItems,
    supplierFulfillments,
    pricing: {
      subtotal,
      discountTotal,
      deliveryFee,
      taxGst,
      installationCharge: installationChargeTotal,
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
    estimatedDeliveryDays: '2-4 business days',
    estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    trackingUpdates: [
      {
        timestamp: new Date(),
        status: 'placed',
        message: `Order received and logged in central dispatch system. Estimated delivery: ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
        location: `${data.deliveryAddress.city} Central Hub`,
      },
    ],
    isDemo: false,
  });

  // Clear patient cart upon successful order placement
  await clearPatientCart(userId);

  // Dispatch in-app operational alert to Operations & Admin Desk
  try {
    const adminOrderKey = `notif_admin_order_${order._id}`;
    await NotificationLog.create({
      recipientPhone: 'ADMIN_DESK',
      recipientName: 'VivoQuest Operations Desk',
      recipientRole: 'admin',
      channel: 'in_app',
      templateId: 'PRODUCT_ORDER_PLACED',
      type: 'PRODUCT_ORDER_PLACED',
      relatedEntityType: 'ProductOrder',
      title: 'New Medical Equipment Order Requiring Dispatch Allocation',
      messageBody: `New Order Placed: #${order.orderNumber} for patient ${order.patientName} (+91 ${order.patientPhone}). Total: ₹${order.pricing.totalAmount}. Destination: ${order.deliveryAddress.city}. Click to review dispatch queue.`,
      consentChecked: true,
      status: 'delivered',
      provider: 'in_app_system',
      idempotencyKey: adminOrderKey,
      isRead: false,
      isCleared: false,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        patientName: order.patientName,
        patientPhone: order.patientPhone,
        city: order.deliveryAddress.city,
        totalAmount: order.pricing.totalAmount,
        actionUrl: `/operations/dashboard?orderId=${order._id.toString()}`,
      },
    });

    // Also dispatch to operations manager inbox with idempotency key
    const opsOrderKey = `notif_ops_order_${order._id}`;
    await NotificationLog.create({
      recipientPhone: 'OPERATIONS_DESK',
      recipientName: 'Central Operations Dispatch',
      recipientRole: 'operations_manager',
      channel: 'in_app',
      templateId: 'PRODUCT_ORDER_PLACED',
      type: 'PRODUCT_ORDER_PLACED',
      relatedEntityType: 'ProductOrder',
      title: 'New Order Requiring Dispatch Allocation',
      messageBody: `Order #${order.orderNumber} placed for ${order.patientName}. Items: ${order.items.length}. Destination: ${order.deliveryAddress.city}. Click to assign delivery.`,
      consentChecked: true,
      status: 'delivered',
      provider: 'in_app_system',
      idempotencyKey: opsOrderKey,
      isRead: false,
      isCleared: false,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        actionUrl: `/operations/dashboard?orderId=${order._id.toString()}`,
      },
    });
  } catch (notifErr: any) {
    console.warn('[NotificationLog] Failed to record order notification:', notifErr.message);
  }

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

  // Atomically release reservedQuantity (or return physical stock if already fulfilled)
  for (const item of updatedOrder.items) {
    if (updatedOrder.isStockDeducted) {
      await MedicalProduct.findByIdAndUpdate(item.productId, {
        $inc: { stockQuantity: item.quantity },
        $set: { lastStockUpdateAt: new Date() },
      });
    } else {
      const prod = await MedicalProduct.findById(item.productId);
      if (prod) {
        prod.reservedQuantity = Math.max(0, (prod.reservedQuantity || 0) - item.quantity);
        prod.lastStockUpdateAt = new Date();
        await prod.save();
      }
    }
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

  // Dispatch in-app alert to Admin Desk
  try {
    const adminCancelKey = `notif_admin_order_cancel_${updatedOrder._id}`;
    await NotificationLog.create({
      recipientPhone: 'ADMIN_DESK',
      recipientName: 'VivoQuest Operations Desk',
      recipientRole: 'admin',
      channel: 'in_app',
      templateId: 'PRODUCT_ORDER_CANCELLED',
      type: 'PRODUCT_ORDER_CANCELLED',
      relatedEntityType: 'ProductOrder',
      title: 'Product Order Cancelled',
      messageBody: `Order Cancelled: Patient ${updatedOrder.patientName} cancelled Order #${updatedOrder.orderNumber}. Reason: "${reason || 'Patient request'}". Reserved stock restored.`,
      consentChecked: true,
      status: 'delivered',
      provider: 'in_app_system',
      idempotencyKey: adminCancelKey,
      isRead: false,
      isCleared: false,
      metadata: {
        orderId: updatedOrder._id.toString(),
        orderNumber: updatedOrder.orderNumber,
        patientName: updatedOrder.patientName,
        reason,
      },
    });
  } catch (notifErr: any) {
    console.warn('[NotificationLog] Failed to record order cancellation notification:', notifErr.message);
  }

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
 * Patient request to reschedule delivery date/slot
 */
export const requestOrderDeliveryReschedule = async (
  orderIdOrNumber: string,
  userId: string,
  data: {
    requestedDate: string;
    timeSlot?: string;
    reason: string;
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
    throw new AppError('Access denied: You cannot reschedule another patient\'s order', 403);
  }

  const disallowedStatuses: OrderStatus[] = ['delivered', 'completed', 'cancelled', 'returned_to_origin'];
  if (disallowedStatuses.includes(order.orderStatus)) {
    throw new AppError(`Cannot reschedule delivery for an order that is already ${order.orderStatus}`, 400);
  }

  if (!data.requestedDate || !data.reason) {
    throw new AppError('Requested date and reason are required to request a delivery reschedule', 400);
  }

  const parsedDate = new Date(data.requestedDate);
  if (isNaN(parsedDate.getTime()) || parsedDate < new Date()) {
    throw new AppError('Requested delivery date must be a valid future date', 400);
  }

  if (!order.rescheduleRequests) {
    order.rescheduleRequests = [];
  }

  const newRequestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  order.rescheduleRequests.push({
    requestId: newRequestId,
    requestedDate: parsedDate,
    timeSlot: data.timeSlot || 'Morning 09:00 - 13:00',
    reason: data.reason.trim(),
    status: 'pending',
    requestedAt: new Date(),
    requestedByPatientId: new mongoose.Types.ObjectId(userId),
  });

  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Delivery reschedule requested by recipient for ${parsedDate.toLocaleDateString('en-IN')}${data.timeSlot ? ` (${data.timeSlot})` : ''}: ${data.reason.trim()}`,
    location: 'Patient Application',
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

// =============================================================================
// REVIEWS & COMPLAINTS (Customer-facing with verified purchase enforcement)
// =============================================================================

/**
 * Submit verified product review
 */
export const submitProductReview = async (
  userId: string,
  userName: string,
  productId: string,
  data: {
    orderId: string;
    rating: number;
    title: string;
    comment: string;
    hasIssueReported?: boolean;
    issueCategory?: string;
    issueDetails?: string;
  }
): Promise<IProductReview> => {
  if (!data.rating || data.rating < 1 || data.rating > 5) {
    throw new AppError('Rating must be an integer between 1 and 5 stars', 400);
  }

  if (!data.title?.trim() || !data.comment?.trim()) {
    throw new AppError('Review title and comment are required', 400);
  }

  const product = await MedicalProduct.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  let orderQuery: any = { _id: data.orderId, patientId: userId };
  if (!mongoose.Types.ObjectId.isValid(data.orderId)) {
    orderQuery = { orderNumber: data.orderId, patientId: userId };
  }

  const order = await ProductOrder.findOne(orderQuery);
  if (!order) {
    throw new AppError('Order not found or access denied', 404);
  }

  // Verify item was in this order
  const orderItem = order.items.find(
    (i) => i.productId.toString() === product._id.toString() || i.sku === product.sku
  );
  if (!orderItem) {
    throw new AppError('This product was not part of the specified order', 400);
  }

  // Policy check: Only delivered orders can be reviewed
  if (!['delivered', 'completed'].includes(order.orderStatus)) {
    throw new AppError('Reviews can only be submitted for delivered medical equipment', 400);
  }

  // Prevent duplicate review per order-item
  const existingReview = await ProductReview.findOne({
    userId,
    orderId: order._id,
    productId: product._id,
  });
  if (existingReview) {
    throw new AppError('You have already submitted a review for this purchase', 409);
  }

  let complaintId: mongoose.Types.ObjectId | undefined;
  // If an issue/damage is reported, create a complaint ticket for staff follow-up without modifying the review
  if (data.hasIssueReported && data.issueDetails?.trim()) {
    const complaintNumber = `CMP-${Date.now().toString().slice(-6)}`;
    const validCategories = [
      'damaged_item',
      'wrong_item',
      'missing_item',
      'installation_issue',
      'quality_defect',
      'late_delivery',
      'other',
    ];
    let mappedCategory = 'quality_defect';
    if (data.issueCategory && validCategories.includes(data.issueCategory)) {
      mappedCategory = data.issueCategory;
    }

    const complaint = await ProductComplaint.create({
      complaintNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: new mongoose.Types.ObjectId(userId),
      userName: userName || order.patientName || 'Customer',
      userPhone: order.patientPhone || '9800000000',
      productId: product._id,
      productSku: product.sku,
      productTitle: product.title,
      category: mappedCategory as any,
      complaintType: data.issueCategory || 'defective_device',
      description: data.issueDetails.trim(),
      status: 'open',
      refundRequested: false,
      refundApproved: false,
      isDemo: false,
      resolutionNotes: 'Automatically initiated from customer review product report',
    });
    complaintId = complaint._id;
  }

  const review = await ProductReview.create({
    productId: product._id,
    productSku: product.sku,
    productTitle: product.title,
    userId,
    userName: userName || order.patientName,
    orderId: order._id,
    orderNumber: order.orderNumber,
    rating: Math.round(data.rating),
    title: data.title.trim(),
    comment: data.comment.trim(),
    isVerifiedPurchase: true,
    status: 'published',
    hasIssueReported: Boolean(data.hasIssueReported),
    issueCategory: data.issueCategory,
    issueDetails: data.issueDetails,
    complaintId,
  });

  // Recalculate average rating for product
  const allReviews = await ProductReview.find({ productId: product._id, status: 'published' });
  if (allReviews.length > 0) {
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = Math.round((totalRating / allReviews.length) * 10) / 10;
    product.averageRating = avg;
    product.reviewCount = allReviews.length;
    await product.save();
  }

  return review;
};

/**
 * Submit verified delivery experience rating
 */
export const submitDeliveryRating = async (
  userId: string,
  userName: string,
  orderIdOrNumber: string,
  data: {
    rating: number;
    punctualityRating?: number;
    communicationRating?: number;
    handlingRating?: number;
    feedback?: string;
  }
): Promise<IDeliveryRating> => {
  if (!data.rating || data.rating < 1 || data.rating > 5) {
    throw new AppError('Delivery rating must be an integer between 1 and 5 stars', 400);
  }

  let orderQuery: any = { _id: orderIdOrNumber, patientId: userId };
  if (!mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
    orderQuery = { orderNumber: orderIdOrNumber, patientId: userId };
  }

  const order = await ProductOrder.findOne(orderQuery);
  if (!order) {
    throw new AppError('Order not found or access denied', 404);
  }

  // Must be delivered
  if (!['delivered', 'completed'].includes(order.orderStatus)) {
    throw new AppError('Delivery experience can only be rated after successful order delivery', 400);
  }

  // Duplicate check
  const existing = await DeliveryRating.findOne({ orderId: order._id, patientId: userId });
  if (existing) {
    throw new AppError('You have already rated the delivery experience for this order', 409);
  }

  const staffId = order.deliveryAssignment?.assignedStaffId || order.deliveryAssignment?.otpVerification?.verifiedByStaffId || new mongoose.Types.ObjectId('000000000000000000000001');
  const staffName = order.deliveryAssignment?.assignedStaffName || order.deliveryAssignment?.otpVerification?.verifiedByStaffName || 'VivoQuest Delivery Executive';

  const deliveryRating = await DeliveryRating.create({
    orderId: order._id,
    orderNumber: order.orderNumber,
    patientId: userId,
    patientName: userName || order.patientName,
    deliveryStaffId: staffId,
    deliveryStaffName: staffName,
    rating: Math.round(data.rating),
    punctualityRating: data.punctualityRating ? Math.round(data.punctualityRating) : undefined,
    communicationRating: data.communicationRating ? Math.round(data.communicationRating) : undefined,
    handlingRating: data.handlingRating ? Math.round(data.handlingRating) : undefined,
    feedback: data.feedback?.trim(),
  });

  // Store denormalized summary on order for quick display
  order.deliveryRating = {
    rating: deliveryRating.rating,
    punctualityRating: deliveryRating.punctualityRating,
    communicationRating: deliveryRating.communicationRating,
    handlingRating: deliveryRating.handlingRating,
    feedback: deliveryRating.feedback,
    ratedAt: new Date(),
  };
  await order.save();

  // Audit log
  await AuditLog.create({
    action: 'DELIVERY_EXPERIENCE_RATED',
    category: 'order_fulfillment',
    actorId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined,
    actorName: userName || order.patientName,
    actorRole: 'patient',
    targetType: 'ProductOrder',
    targetId: order.orderNumber,
    details: {
      orderId: order._id.toString(),
      rating: deliveryRating.rating,
      staffId: staffId.toString(),
    },
  });

  return deliveryRating;
};

/**
 * Get aggregate delivery rating statistics for operations managers
 */
export const getDeliveryRatingsSummary = async () => {
  const allRatings = await DeliveryRating.find().lean();
  const totalRatings = allRatings.length;
  if (totalRatings === 0) {
    return {
      totalRatings: 0,
      averageRating: 5.0,
      punctualityAvg: 5.0,
      communicationAvg: 5.0,
      handlingAvg: 5.0,
      starBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      recentFeedback: [],
    };
  }

  let sumRating = 0;
  let sumPunctuality = 0;
  let punctualityCount = 0;
  let sumComm = 0;
  let commCount = 0;
  let sumHandling = 0;
  let handlingCount = 0;

  const starBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  for (const r of allRatings) {
    sumRating += r.rating;
    if (starBreakdown[r.rating] !== undefined) starBreakdown[r.rating]++;
    if (r.punctualityRating) {
      sumPunctuality += r.punctualityRating;
      punctualityCount++;
    }
    if (r.communicationRating) {
      sumComm += r.communicationRating;
      commCount++;
    }
    if (r.handlingRating) {
      sumHandling += r.handlingRating;
      handlingCount++;
    }
  }

  const averageRating = Math.round((sumRating / totalRatings) * 10) / 10;
  const punctualityAvg = punctualityCount > 0 ? Math.round((sumPunctuality / punctualityCount) * 10) / 10 : averageRating;
  const communicationAvg = commCount > 0 ? Math.round((sumComm / commCount) * 10) / 10 : averageRating;
  const handlingAvg = handlingCount > 0 ? Math.round((sumHandling / handlingCount) * 10) / 10 : averageRating;

  const recentFeedback = allRatings
    .filter((r) => r.feedback && r.feedback.trim().length > 0)
    .slice(-10)
    .map((r) => ({
      orderNumber: r.orderNumber,
      deliveryStaffName: r.deliveryStaffName,
      rating: r.rating,
      feedback: r.feedback,
      createdAt: r.createdAt,
    }));

  return {
    totalRatings,
    averageRating,
    punctualityAvg,
    communicationAvg,
    handlingAvg,
    starBreakdown,
    recentFeedback,
  };
};

/**
 * List published reviews for a product
 */
export const listProductReviews = async (
  productId: string,
  page: number = 1,
  limit: number = 20
) => {
  const query = { productId: new mongoose.Types.ObjectId(productId), status: 'published' };
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const [reviews, total] = await Promise.all([
    ProductReview.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    ProductReview.countDocuments(query),
  ]);

  return {
    reviews,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

/**
 * Submit customer complaint for an order item
 */
export const submitProductComplaint = async (
  userId: string,
  userProfile: { name: string; phone: string; email?: string },
  data: {
    orderId: string;
    productId: string;
    category: any;
    description: string;
    refundRequested?: boolean;
  }
): Promise<IProductComplaint> => {
  if (!data.category || !data.description?.trim()) {
    throw new AppError('Complaint category and description are required', 400);
  }

  let orderQuery: any = { _id: data.orderId, patientId: userId };
  if (!mongoose.Types.ObjectId.isValid(data.orderId)) {
    orderQuery = { orderNumber: data.orderId, patientId: userId };
  }

  const order = await ProductOrder.findOne(orderQuery);
  if (!order) {
    throw new AppError('Order not found or access denied', 404);
  }

  const product = await MedicalProduct.findById(data.productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const orderItem = order.items.find(
    (i) => i.productId.toString() === product._id.toString() || i.sku === product.sku
  );
  if (!orderItem) {
    throw new AppError('The specified product is not part of this order', 400);
  }

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const complaintNumber = `CMP-2026-${randomDigits}`;

  const complaint = await ProductComplaint.create({
    complaintNumber,
    orderId: order._id,
    orderNumber: order.orderNumber,
    productId: product._id,
    productSku: product.sku,
    productTitle: product.title,
    userId,
    userName: userProfile.name || order.patientName,
    userPhone: userProfile.phone || order.patientPhone,
    userEmail: userProfile.email || order.patientEmail,
    supplierId: orderItem.supplierId,
    supplierName: orderItem.supplierName || product.supplierName,
    category: data.category,
    description: data.description.trim(),
    status: 'open',
    refundRequested: Boolean(data.refundRequested),
  });

  // Track event on order
  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Complaint filed (${complaint.complaintNumber}): ${data.category}. Operations & Quality Assurance reviewing.`,
    location: 'Customer Support Desk',
  });
  await order.save();

  return complaint;
};

/**
 * List customer complaints for authenticated patient
 */
export const listPatientComplaints = async (userId: string): Promise<IProductComplaint[]> => {
  return ProductComplaint.find({ userId }).sort({ createdAt: -1 }).lean() as unknown as IProductComplaint[];
};

/**
 * Authorized update of estimated delivery date for an order
 * Supported for Admin/Super-Admin or assigned Supplier
 * Enforces date & status validation, records audit log, appends tracking event,
 * and notifies patient idempotently.
 */
export const updateOrderDeliveryEstimate = async (
  orderIdOrNumber: string,
  data: {
    estimatedDeliveryDate: string | Date;
    reason: string;
  },
  actor: { _id?: any; id?: string; fullName?: string; name?: string; role?: string }
): Promise<IProductOrder> => {
  let query: any = { _id: orderIdOrNumber };
  if (!mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
    query = { orderNumber: orderIdOrNumber };
  }

  const order = await ProductOrder.findOne(query);
  if (!order) {
    throw new AppError('Product order not found', 404);
  }

  const actorRole = actor.role || 'unknown';
  const actorId = actor._id || actor.id;
  const actorName = actor.fullName || actor.name || 'Operations Staff';

  // Role authorization checks
  if (actorRole === 'admin' || actorRole === 'super_admin') {
    // Authorized
  } else if (actorRole === 'supplier') {
    const supplier = await Supplier.findOne({ userId: actorId });
    if (!supplier) {
      throw new AppError('Supplier profile not found for authenticated user', 403);
    }
    const hasSupplierItem = order.items.some(
      (item) => item.supplierId && item.supplierId.toString() === supplier._id.toString()
    );
    if (!hasSupplierItem) {
      throw new AppError('Forbidden: Suppliers may only update delivery estimates for orders containing their assigned items', 403);
    }
  } else {
    throw new AppError('Forbidden: Only authorized administrators or assigned suppliers can update delivery estimates', 403);
  }

  // Order state validation
  if (order.orderStatus === 'cancelled') {
    throw new AppError('Cannot update delivery estimate for a cancelled order', 400);
  }
  if (order.orderStatus === 'delivered' || order.orderStatus === 'completed') {
    throw new AppError('Cannot update delivery estimate for an already delivered order', 400);
  }

  // Date validation
  if (!data.estimatedDeliveryDate) {
    throw new AppError('Estimated delivery date is required', 400);
  }
  const parsedDate = new Date(data.estimatedDeliveryDate);
  if (isNaN(parsedDate.getTime())) {
    throw new AppError('Invalid date format for estimated delivery date', 400);
  }

  // Reason validation
  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length < 3) {
    throw new AppError('A valid reason for changing the delivery estimate is mandatory (minimum 3 characters)', 400);
  }

  const previousEstimate = order.estimatedDeliveryDate;
  order.estimatedDeliveryDate = parsedDate;

  // Record deliveryEstimateHistory
  if (!order.deliveryEstimateHistory) {
    order.deliveryEstimateHistory = [];
  }
  order.deliveryEstimateHistory.push({
    previousEstimate,
    newEstimate: parsedDate,
    updatedBy: new mongoose.Types.ObjectId(actorId),
    updatedByName: actorName,
    updatedByRole: actorRole,
    reason: data.reason.trim(),
    updatedAt: new Date(),
  });

  const formattedDate = parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Record tracking update
  order.trackingUpdates.push({
    timestamp: new Date(),
    status: order.orderStatus,
    message: `Estimated delivery date updated to ${formattedDate}. Reason: ${data.reason.trim()}`,
    location: 'Central Fulfillment & Logistics Desk',
  });

  await order.save();

  // Audit Log
  await AuditLog.create({
    action: 'DELIVERY_ESTIMATE_UPDATED',
    category: 'order_fulfillment',
    actorId,
    actorName,
    actorRole,
    targetType: 'PRODUCT_ORDER',
    targetId: order.orderNumber,
    details: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      previousEstimate,
      newEstimate: parsedDate,
      reason: data.reason.trim(),
    },
    severity: 'info',
  });

  // Notify Patient
  try {
    const formattedPrev = previousEstimate
      ? new Date(previousEstimate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Original estimate';

    await sendPatientNotification({
      recipientPhone: order.patientPhone,
      recipientName: order.patientName,
      recipientRole: 'patient',
      channel: 'sms',
      templateId: 'PRODUCT_ORDER_DELIVERY_UPDATED',
      templateParams: {
        patientName: order.patientName,
        orderNumber: order.orderNumber,
        previousEstimate: formattedPrev,
        newEstimate: formattedDate,
        reason: data.reason.trim(),
        orderUrl: `/orders/${order.orderNumber || order._id}`,
      },
      idempotencyKey: `NOTIF-EST-UPDATE-${order.orderNumber}-${parsedDate.getTime()}`,
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        newEstimate: parsedDate,
      },
    });

    await NotificationLog.create({
      recipientPhone: order.patientPhone,
      recipientName: order.patientName,
      recipientRole: 'patient',
      recipientUserId: order.patientId.toString(),
      channel: 'in_app',
      templateId: 'PRODUCT_ORDER_DELIVERY_UPDATED',
      title: `Delivery Date Updated for Order #${order.orderNumber}`,
      messageBody: `Namaste ${order.patientName}, your estimated delivery date for Order #${order.orderNumber} has been updated to ${formattedDate}. Reason: ${data.reason.trim()}. Track your order at /orders/${order.orderNumber || order._id}`,
      consentChecked: true,
      status: 'delivered',
      provider: 'in_app_system',
      idempotencyKey: `INAPP-EST-UPDATE-${order.orderNumber}-${parsedDate.getTime()}`,
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        newEstimate: parsedDate,
      },
      sentAt: new Date(),
    });
  } catch (notifErr: any) {
    console.warn('[Notification] Failed to send delivery update notification:', notifErr.message);
  }

  return order;
};


