const fs = require('fs');
const path = require('path');

const filePath = path.resolve('frontend/src/app/operations/dashboard/page.tsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Insert Workspace: Completed Deliveries before Workspace: Products & Inventory
const productsWsMarker = `        {/* =========================================================================
            WORKSPACE 2: PRODUCTS & INVENTORY`;

const completedWsSnippet = `        {/* =========================================================================
            WORKSPACE 2: COMPLETED DELIVERIES (OTP-VERIFIED & DELIVERED ARCHIVE)
        ========================================================================= */}
        {activeTab === 'completed' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="bg-white rounded-2xl border border-border p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Delivered</span>
                <span className="text-2xl font-black text-navy mt-1 block">{completedSummary.totalDelivered}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Delivered medical equipment</span>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                  <ShieldCheck size={13} />
                  <span>OTP Verified</span>
                </span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">{completedSummary.otpVerifiedCount}</span>
                <span className="text-[10px] text-emerald-600 mt-0.5 block">Single-use PIN verified</span>
              </div>

              <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/20 p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                  <FileText size={13} />
                  <span>Manager Override</span>
                </span>
                <span className="text-2xl font-black text-amber-700 mt-1 block">{completedSummary.managerOverrideCount}</span>
                <span className="text-[10px] text-amber-600 mt-0.5 block">Identity doc verified</span>
              </div>

              <div className="bg-white rounded-2xl border border-border p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rated Deliveries</span>
                <span className="text-2xl font-black text-navy mt-1 block">{completedSummary.ratedCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Customer rated orders</span>
              </div>

              <div className="bg-white rounded-2xl border border-amber-300 bg-amber-50/30 p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
                  <Star size={13} className="fill-amber-400 text-amber-500" />
                  <span>Avg Delivery Score</span>
                </span>
                <span className="text-2xl font-black text-amber-700 mt-1 block">{completedSummary.avgDeliveryRating} / 5.0</span>
                <span className="text-[10px] text-amber-700 mt-0.5 block">Last-mile service score</span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-border shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Order #, Patient Name, or Contact Phone..."
                    value={completedSearch}
                    onChange={(e) => {
                      setCompletedSearch(e.target.value);
                      setCompletedPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-border text-xs outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Date Range Filter */}
                  <select
                    value={completedDateRange}
                    onChange={(e) => {
                      setCompletedDateRange(e.target.value);
                      setCompletedPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="custom">Custom Range...</option>
                  </select>

                  {/* Sourcing Filter */}
                  <select
                    value={completedSourcingFilter}
                    onChange={(e) => {
                      setCompletedSourcingFilter(e.target.value);
                      setCompletedPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">All Sourcing</option>
                    <option value="own_stock">VivoQuest Depot</option>
                    <option value="supplier_direct">Supplier Direct</option>
                  </select>

                  {/* Rating Status Filter */}
                  <select
                    value={completedRatingFilter}
                    onChange={(e) => {
                      setCompletedRatingFilter(e.target.value);
                      setCompletedPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">All Ratings</option>
                    <option value="rated">Customer Rated</option>
                    <option value="unrated">Unrated</option>
                  </select>

                  {/* Verification Filter */}
                  <select
                    value={completedVerificationFilter}
                    onChange={(e) => {
                      setCompletedVerificationFilter(e.target.value);
                      setCompletedPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-border text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">All Verifications</option>
                    <option value="otp">OTP Verified Only</option>
                    <option value="manager_override">Manager Override Only</option>
                  </select>

                  <button
                    onClick={loadCompletedDeliveries}
                    className="p-2 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                    title="Refresh Completed Deliveries"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>

              {/* Custom Date Pickers */}
              {completedDateRange === 'custom' && (
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600">From:</span>
                    <input
                      type="date"
                      value={completedStartDate}
                      onChange={(e) => {
                        setCompletedStartDate(e.target.value);
                        setCompletedPage(1);
                      }}
                      className="p-1.5 rounded-lg border border-border bg-slate-50"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600">To:</span>
                    <input
                      type="date"
                      value={completedEndDate}
                      onChange={(e) => {
                        setCompletedEndDate(e.target.value);
                        setCompletedPage(1);
                      }}
                      className="p-1.5 rounded-lg border border-border bg-slate-50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Completed Deliveries Table */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-border text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Order # &amp; Date</th>
                      <th className="py-3.5 px-4">Patient / Destination</th>
                      <th className="py-3.5 px-4">Delivered At</th>
                      <th className="py-3.5 px-4">Delivery Staff</th>
                      <th className="py-3.5 px-4">Verification</th>
                      <th className="py-3.5 px-4">Ratings</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {completedLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
                          <span>Loading completed deliveries archive...</span>
                        </td>
                      </tr>
                    ) : completedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <CheckCircle2 size={32} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No completed deliveries found matching filters.</p>
                        </td>
                      </tr>
                    ) : (
                      completedOrders.map((o: any) => {
                        const verifiedMethod = o.deliveryAssignment?.otpVerification?.verificationMethod;
                        const hasDeliveryRating = o.deliveryRating?.rating;
                        const isSupplierDirect = o.items?.some((i: any) => i.sourcingType === 'supplier_direct');

                        return (
                          <tr key={o._id || o.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4">
                              <span className="font-bold text-navy font-mono">{o.orderNumber}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={\`px-1.5 py-0.5 rounded text-[10px] font-bold \${
                                    isSupplierDirect
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : 'bg-teal-50 text-teal-700 border border-teal-200'
                                  }\`}
                                >
                                  {isSupplierDirect ? 'Supplier Direct' : 'VivoQuest Depot'}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-800 block">{o.patientName}</span>
                              <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                                {o.deliveryAddress?.city}, {o.deliveryAddress?.pincode}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-600">
                              <span className="font-bold text-slate-800 block">
                                {o.deliveryAssignment?.actualDeliveredAt
                                  ? new Date(o.deliveryAssignment.actualDeliveredAt).toLocaleDateString('en-IN')
                                  : new Date(o.updatedAt).toLocaleDateString('en-IN')}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {o.deliveryAssignment?.actualDeliveredAt
                                  ? new Date(o.deliveryAssignment.actualDeliveredAt).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {o.deliveryAssignment?.assignedStaffName || 'Depot Executive'}
                            </td>

                            <td className="py-3 px-4">
                              {verifiedMethod === 'otp' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                                  <ShieldCheck size={12} />
                                  <span>OTP Verified</span>
                                </span>
                              ) : verifiedMethod === 'manager_override' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800">
                                  <FileText size={12} />
                                  <span>Manager Override</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                  <span>Residence Handover</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {hasDeliveryRating ? (
                                <div className="flex items-center gap-1 text-amber-600 font-extrabold text-xs">
                                  <Star size={13} className="fill-amber-400 text-amber-500" />
                                  <span>{o.deliveryRating.rating}★</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Not rated</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setViewCompletedOrderModal(o)}
                                className="px-3 py-1.5 rounded-lg border border-border hover:bg-slate-100 font-bold text-navy text-[11px] transition cursor-pointer"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {completedTotalPages > 1 && (
                <div className="p-3.5 border-t border-border flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Showing {Math.min((completedPage - 1) * 10 + 1, completedTotalCount)} to{' '}
                    {Math.min(completedPage * 10, completedTotalCount)} of {completedTotalCount} completed deliveries
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={completedPage <= 1}
                      onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded-lg border border-border bg-slate-50 disabled:opacity-40 hover:bg-slate-100 font-bold cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="font-bold text-navy px-2">
                      Page {completedPage} of {completedTotalPages}
                    </span>
                    <button
                      disabled={completedPage >= completedTotalPages}
                      onClick={() => setCompletedPage((p) => Math.min(completedTotalPages, p + 1))}
                      className="px-3 py-1 rounded-lg border border-border bg-slate-50 disabled:opacity-40 hover:bg-slate-100 font-bold cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            WORKSPACE 3: PRODUCTS & INVENTORY`;

if (!content.includes(productsWsMarker)) {
  console.error('productsWsMarker not found!');
  process.exit(1);
}
content = content.replace(productsWsMarker, completedWsSnippet);

// 2. Add Completed Order Details Modal right before the end of return statement
const modalEndMarker = `      {/* 2. Assign Delivery Staff Modal */}`;

const completedModalSnippet = `      {/* Completed Order Details Modal */}
      {viewCompletedOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-navy text-base">Completed Delivery Summary</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                    Delivered
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-500 font-bold">
                  Order #{viewCompletedOrderModal.orderNumber}
                </span>
              </div>
              <button
                onClick={() => setViewCompletedOrderModal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Recipient & Verification Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-border">
              <div>
                <span className="text-slate-500 font-bold block mb-1">Customer / Recipient</span>
                <span className="font-extrabold text-navy block text-sm">{viewCompletedOrderModal.patientName}</span>
                <span className="text-slate-600 block">{viewCompletedOrderModal.patientPhone}</span>
                <span className="text-slate-500 block mt-1">
                  {viewCompletedOrderModal.deliveryAddress?.street}, {viewCompletedOrderModal.deliveryAddress?.city} - {viewCompletedOrderModal.deliveryAddress?.pincode}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Delivery Verification Proof</span>
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">Method: </span>
                    <strong className="text-navy uppercase font-mono">
                      {viewCompletedOrderModal.deliveryAssignment?.otpVerification?.verificationMethod || 'Standard'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Recipient Handover: </span>
                    <strong className="text-navy">
                      {viewCompletedOrderModal.deliveryAssignment?.otpVerification?.recipientName || viewCompletedOrderModal.patientName}{' '}
                      ({viewCompletedOrderModal.deliveryAssignment?.otpVerification?.recipientRelationship || 'Self'})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Package Condition: </span>
                    <strong className="text-emerald-700 capitalize">
                      {(viewCompletedOrderModal.deliveryAssignment?.otpVerification?.deliveryCondition || 'good_condition').replace('_', ' ')}
                    </strong>
                  </div>
                  {viewCompletedOrderModal.deliveryAssignment?.otpVerification?.overrideReason && (
                    <div className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                      <strong>Manager Override Reason:</strong>{' '}
                      {viewCompletedOrderModal.deliveryAssignment.otpVerification.overrideReason}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Rating if available */}
            {viewCompletedOrderModal.deliveryRating && (
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                  <Star size={14} className="fill-amber-400 text-amber-500" />
                  <span>Customer Delivery Experience Rating: {viewCompletedOrderModal.deliveryRating.rating} / 5 Stars</span>
                </span>
                {viewCompletedOrderModal.deliveryRating.feedback && (
                  <p className="text-slate-700 italic pl-5">
                    "{viewCompletedOrderModal.deliveryRating.feedback}"
                  </p>
                )}
              </div>
            )}

            {/* Delivered Items */}
            <div>
              <span className="font-bold text-navy text-xs block mb-2">Delivered Medical Products</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {viewCompletedOrderModal.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-border flex items-center justify-between text-xs bg-white"
                  >
                    <div>
                      <span className="font-bold text-navy">{item.title}</span>
                      <span className="text-slate-400 text-[11px] block font-mono">{item.sku}</span>
                    </div>
                    <span className="font-extrabold text-navy">Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking History */}
            <div>
              <span className="font-bold text-navy text-xs block mb-2">Immutable Delivery Audit Events</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {viewCompletedOrderModal.trackingUpdates?.map((t: any, idx: number) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-navy uppercase">{t.status}</strong>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(t.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-600">{t.message}</p>
                    {t.staffName && (
                      <span className="text-[10px] text-teal-700 font-semibold block">By: {t.staffName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewCompletedOrderModal(null)}
                className="px-4 py-2 rounded-xl bg-navy text-white text-xs font-bold hover:bg-navy-dark transition cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Assign Delivery Staff Modal */}`;

if (!content.includes(modalEndMarker)) {
  console.error('modalEndMarker not found!');
  process.exit(1);
}
content = content.replace(modalEndMarker, completedModalSnippet);

content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully added Completed Deliveries workspace and detail modal!');

