const fs = require('fs');
const path = require('path');

const filePath = path.resolve('frontend/src/app/operations/dashboard/page.tsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Update type OperationsTab
content = content.replace(
  "type OperationsTab = 'orders' | 'products' | 'installation' | 'returns';",
  "type OperationsTab = 'orders' | 'completed' | 'products' | 'installation' | 'returns';"
);

// 2. Add Completed Deliveries & OTP State after activeTab state
const stateTarget = `  // Active Primary Workspace Tab
  const [activeTab, setActiveTab] = useState<OperationsTab>('orders');`;

const stateReplacement = `  // Active Primary Workspace Tab
  const [activeTab, setActiveTab] = useState<OperationsTab>('orders');

  // Completed Deliveries State
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedSummary, setCompletedSummary] = useState({
    totalDelivered: 0,
    otpVerifiedCount: 0,
    managerOverrideCount: 0,
    ratedCount: 0,
    avgDeliveryRating: 5.0,
  });
  const [completedDateRange, setCompletedDateRange] = useState<string>('all');
  const [completedStartDate, setCompletedStartDate] = useState<string>('');
  const [completedEndDate, setCompletedEndDate] = useState<string>('');
  const [completedStaffFilter, setCompletedStaffFilter] = useState<string>('all');
  const [completedSourcingFilter, setCompletedSourcingFilter] = useState<string>('all');
  const [completedRatingFilter, setCompletedRatingFilter] = useState<string>('all');
  const [completedVerificationFilter, setCompletedVerificationFilter] = useState<string>('all');
  const [completedSearch, setCompletedSearch] = useState<string>('');
  const [completedPage, setCompletedPage] = useState<number>(1);
  const [completedTotalPages, setCompletedTotalPages] = useState<number>(1);
  const [completedTotalCount, setCompletedTotalCount] = useState<number>(0);
  const [viewCompletedOrderModal, setViewCompletedOrderModal] = useState<any>(null);

  // Delivery OTP Verification State
  const [deliveryOtpCode, setDeliveryOtpCode] = useState<string>('');
  const [otpRecipientName, setOtpRecipientName] = useState<string>('');
  const [otpRecipientRel, setOtpRecipientRel] = useState<string>('Self');
  const [otpCondition, setOtpCondition] = useState<string>('good_condition');
  const [otpCustomerAck, setOtpCustomerAck] = useState<boolean>(true);
  const [otpCooldownTimer, setOtpCooldownTimer] = useState<number>(0);
  const [otpRequestLoading, setOtpRequestLoading] = useState<boolean>(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState<boolean>(false);
  const [isManagerOverrideOpen, setIsManagerOverrideOpen] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideDocType, setOverrideDocType] = useState<string>('aadhaar');
  const [overrideDocLast4, setOverrideDocLast4] = useState<string>('');`;

content = content.replace(stateTarget, stateReplacement);

// 3. Add loadCompletedDeliveries and OTP Handlers
const loadOrdersTarget = `  // 5. Load Orders`;
const loadCompletedHandlers = `  // Load Completed Deliveries
  const loadCompletedDeliveries = useCallback(async () => {
    setCompletedLoading(true);
    try {
      const res = await operationsApi.getCompletedDeliveries({
        dateRange: completedDateRange,
        startDate: completedStartDate || undefined,
        endDate: completedEndDate || undefined,
        deliveryStaffId: completedStaffFilter,
        sourcingType: completedSourcingFilter,
        ratingStatus: completedRatingFilter,
        verificationMethod: completedVerificationFilter,
        search: completedSearch,
        page: completedPage,
        limit: 10,
      });
      if (res && res.data) {
        setCompletedOrders(res.data);
        if (res.summary) setCompletedSummary(res.summary);
        if (res.pagination) {
          setCompletedTotalPages(res.pagination.totalPages);
          setCompletedTotalCount(res.pagination.total);
        }
      }
    } catch (err: any) {
      showError(err.message || 'Error loading completed deliveries');
    } finally {
      setCompletedLoading(false);
    }
  }, [
    completedDateRange,
    completedStartDate,
    completedEndDate,
    completedStaffFilter,
    completedSourcingFilter,
    completedRatingFilter,
    completedVerificationFilter,
    completedSearch,
    completedPage,
  ]);

  useEffect(() => {
    if (activeTab === 'completed') {
      loadCompletedDeliveries();
    }
  }, [activeTab, loadCompletedDeliveries]);

  // Request Delivery OTP Handler
  const handleRequestOtp = async () => {
    if (!selectedOrder) return;
    setOtpRequestLoading(true);
    try {
      const res = await operationsApi.requestDeliveryOtp(selectedOrder.id || selectedOrder._id);
      showSuccess(res.message || 'Delivery OTP sent to customer');
      setOtpCooldownTimer(60);
      const timer = setInterval(() => {
        setOtpCooldownTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      loadOrders();
    } catch (err: any) {
      showError(err.message || 'Failed to request delivery OTP');
    } finally {
      setOtpRequestLoading(false);
    }
  };

  // Verify Delivery OTP Handler
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !deliveryOtpCode.trim()) return;
    setOtpVerifyLoading(true);
    try {
      const res = await operationsApi.verifyDeliveryOtp(selectedOrder.id || selectedOrder._id, {
        otp: deliveryOtpCode.trim(),
        recipientName: otpRecipientName || selectedOrder.patientName,
        recipientRelationship: otpRecipientRel,
        deliveryCondition: otpCondition,
        customerAcknowledgement: otpCustomerAck,
        proofUrl: workflowProofUrl || undefined,
        notes: workflowNotes || undefined,
      });
      showSuccess('Delivery verified via OTP and order marked completed!');
      setOrderModalOpen(false);
      setSelectedOrder(null);
      setDeliveryOtpCode('');
      loadOrders();
      loadMetrics();
      loadCompletedDeliveries();
    } catch (err: any) {
      showError(err.message || 'Invalid delivery OTP');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  // Manager Override Handler
  const handleManagerOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !overrideReason.trim()) return;
    setOtpVerifyLoading(true);
    try {
      const res = await operationsApi.managerDeliveryOverride(selectedOrder.id || selectedOrder._id, {
        overrideReason: overrideReason.trim(),
        identityDocType: overrideDocType,
        identityDocLast4: overrideDocLast4.trim() || undefined,
        recipientName: otpRecipientName || selectedOrder.patientName,
        recipientRelationship: otpRecipientRel,
        deliveryCondition: otpCondition,
        proofUrl: workflowProofUrl || undefined,
        notes: workflowNotes || undefined,
      });
      showSuccess('Order marked delivered via authorized manager override!');
      setOrderModalOpen(false);
      setSelectedOrder(null);
      setIsManagerOverrideOpen(false);
      setOverrideReason('');
      loadOrders();
      loadMetrics();
      loadCompletedDeliveries();
    } catch (err: any) {
      showError(err.message || 'Manager override failed');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  // 5. Load Orders`;

content = content.replace(loadOrdersTarget, loadCompletedHandlers);

// 4. Update Navigation Tabs to include Completed Deliveries button
const tabNavTarget = `          <button
            onClick={() => setActiveTab('orders')}
            className={\`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs shrink-0 whitespace-nowrap \${
              activeTab === 'orders'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }\`}
          >
            <Boxes size={15} />
            <span>1. Orders &amp; Delivery</span>
            {slaAlerts?.summary?.overdueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black">
                {slaAlerts.summary.overdueCount}
              </span>
            )}
          </button>`;

const tabNavReplacement = `          <button
            onClick={() => setActiveTab('orders')}
            className={\`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs shrink-0 whitespace-nowrap \${
              activeTab === 'orders'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }\`}
          >
            <Boxes size={15} />
            <span>1. Orders &amp; Delivery</span>
            {slaAlerts?.summary?.overdueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black">
                {slaAlerts.summary.overdueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('completed');
              setCompletedPage(1);
            }}
            className={\`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs shrink-0 whitespace-nowrap \${
              activeTab === 'completed'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-border'
            }\`}
          >
            <CheckCircle2 size={15} className={activeTab === 'completed' ? 'text-white' : 'text-emerald-600'} />
            <span>2. Completed Deliveries</span>
            {metrics.delivered > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
                {metrics.delivered}
              </span>
            )}
          </button>`;

content = content.replace(tabNavTarget, tabNavReplacement);

// 5. Update remaining tab names to 3, 4, 5
content = content.replace('<span>2. Products &amp; Inventory</span>', '<span>3. Products &amp; Inventory</span>');
content = content.replace('<span>3. Installation &amp; Maintenance</span>', '<span>4. Installation &amp; Maintenance</span>');
content = content.replace('<span>4. Returns &amp; Complaints</span>', '<span>5. Returns &amp; Complaints</span>');

content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched operations dashboard state, handlers, and navigation tabs!');

