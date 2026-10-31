const fs = require('fs');
const path = require('path');

const filePath = path.resolve('frontend/src/app/orders/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Insert Completion Card right after Header Bar closing div
const headerBarClose = `          </div>

          {/* Cancellation Policy Banner when Direct Cancel is locked */}`;

const completionCardSnippet = `          </div>

          {/* Flipkart-Style Verified Order Delivered Completion Card */}
          {(order.orderStatus === 'delivered' || order.orderStatus === 'completed') && (
            <div className="bg-white rounded-3xl border-2 border-emerald-500/30 p-6 sm:p-8 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/20">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
                        Order Delivered Successfully
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck size={13} />
                        {order.deliveryAssignment?.otpVerification?.verificationMethod === 'manager_override'
                          ? 'Support Verified'
                          : 'OTP Verified'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Delivered on{' '}
                      <span className="font-bold text-navy">
                        {new Date(
                          order.deliveryAssignment?.actualDeliveredAt ||
                          order.deliveryAssignment?.otpVerification?.verifiedAt ||
                          order.updatedAt
                        ).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {order.deliveryAssignment?.otpVerification?.recipientName && (
                        <>
                          {' '}• Handed over to{' '}
                          <span className="font-bold text-navy">
                            {order.deliveryAssignment.otpVerification.recipientName}
                            {order.deliveryAssignment.otpVerification.recipientRelationship
                              ? \` (\${order.deliveryAssignment.otpVerification.recipientRelationship})\`
                              : ''}
                          </span>
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                      <span>
                        Package Condition:{' '}
                        <strong className="text-emerald-700 capitalize">
                          {(order.deliveryAssignment?.otpVerification?.deliveryCondition || 'good_condition').replace('_', ' ')}
                        </strong>
                      </span>
                      {order.clinicalSetup?.isSetupRequired && (
                        <span>
                          • Clinical Setup:{' '}
                          <strong className="text-teal-700 capitalize">
                            {(order.clinicalSetup.setupStatus || 'pending').replace('_', ' ')}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                  <button
                    onClick={() => setIsDeliveryRatingModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Star size={16} className="fill-white" />
                    <span>
                      {order.deliveryRating ? \`Delivery Rated (\${order.deliveryRating.rating}★)\` : 'Rate Delivery Experience'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      if (order.items?.[0]) setReviewProductId(order.items[0].productId || order.items[0]._id);
                      setIsReviewModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-navy hover:bg-navy-dark text-white shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Sparkles size={16} />
                    <span>Rate Purchased Product</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Policy Banner when Direct Cancel is locked */}`;

if (!content.includes(headerBarClose)) {
  console.error('headerBarClose not found in page.tsx!');
  process.exit(1);
}
content = content.replace(headerBarClose, completionCardSnippet);

// 2. Add Delivery Rating Modal right before the Footer or after Review Modal
const reviewModalEnd = `      {/* File Product Complaint / Return Modal */}`;

const deliveryRatingModalSnippet = `      {/* Delivery Experience Rating Modal */}
      {isDeliveryRatingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <Truck size={18} className="text-amber-500" />
                Rate Your Delivery Experience
              </h3>
              <button
                onClick={() => setIsDeliveryRatingModalOpen(false)}
                className="text-slate-400 hover:text-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Help us evaluate our last-mile medical equipment delivery executive for Order #{order.orderNumber}.
            </p>

            {deliveryRatingSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                {deliveryRatingSuccessMsg}
              </div>
            )}

            {deliveryRatingError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {deliveryRatingError}
              </div>
            )}

            <form onSubmit={handleSubmitDeliveryRating} className="space-y-4 text-xs">
              {/* Overall Star Rating */}
              <div>
                <label className="block font-bold text-navy mb-1.5">Overall Delivery Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setDeliveryRating(star)}
                      className="p-1 hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        size={24}
                        className={
                          star <= deliveryRating
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300'
                        }
                      />
                    </button>
                  ))}
                  <span className="font-extrabold text-navy text-sm ml-2">{deliveryRating} / 5</span>
                </div>
              </div>

              {/* Punctuality Rating */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 text-[11px] mb-1">Punctuality</label>
                  <select
                    value={punctualityRating}
                    onChange={(e) => setPunctualityRating(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-border text-xs outline-none focus:border-amber-500"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>{s} Stars</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-[11px] mb-1">Communication</label>
                  <select
                    value={communicationRating}
                    onChange={(e) => setCommunicationRating(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-border text-xs outline-none focus:border-amber-500"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>{s} Stars</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 text-[11px] mb-1">Package Handling</label>
                  <select
                    value={handlingRating}
                    onChange={(e) => setHandlingRating(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-border text-xs outline-none focus:border-amber-500"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>{s} Stars</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Feedback text */}
              <div>
                <label className="block font-bold text-navy mb-1">Feedback Comments (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Share details on promptness, polite behavior, or delivery handling..."
                  value={deliveryFeedback}
                  onChange={(e) => setDeliveryFeedback(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-amber-500 text-xs text-slate-700"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1 justify-center"
                  onClick={() => setIsDeliveryRatingModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1 justify-center bg-amber-500 hover:bg-amber-600 text-white font-bold"
                  disabled={isSubmittingDeliveryRating}
                >
                  {isSubmittingDeliveryRating ? 'Submitting...' : 'Submit Rating'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Product Complaint / Return Modal */}`;

if (!content.includes(reviewModalEnd)) {
  console.error('reviewModalEnd not found in page.tsx!');
  process.exit(1);
}
content = content.replace(reviewModalEnd, deliveryRatingModalSnippet);

content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully added Completion Card and Delivery Rating Modal to page.tsx!');

