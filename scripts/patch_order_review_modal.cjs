const fs = require('fs');
const path = require('path');

const filePath = path.resolve('frontend/src/app/orders/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const target = `              <div>
                <label className="block font-bold text-navy mb-1">Review Details</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share details about durability, comfort, caregiver handling, or packaging..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">`;

const replacement = `              <div>
                <label className="block font-bold text-navy mb-1">Review Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Share details about durability, comfort, caregiver handling, or packaging..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none focus:border-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={reviewHasIssue}
                    onChange={(e) => setReviewHasIssue(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Report a Product Issue or Defect with this Review</span>
                </label>
                {reviewHasIssue && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">Issue Category</label>
                      <select
                        value={reviewIssueCategory}
                        onChange={(e) => setReviewIssueCategory(e.target.value)}
                        className="w-full p-2 rounded-xl border border-border text-xs outline-none focus:border-amber-600"
                      >
                        <option value="defective_device">Defective or Malfunctioning Device</option>
                        <option value="shipping_damage">Damaged in Transit / Dented</option>
                        <option value="missing_accessories">Missing Components or Cable</option>
                        <option value="wrong_item">Wrong Specification Delivered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">Issue Description</label>
                      <textarea
                        rows={2}
                        placeholder="Briefly describe the defect for operations team review..."
                        value={reviewIssueDetails}
                        onChange={(e) => setReviewIssueDetails(e.target.value)}
                        className="w-full p-2 rounded-xl border border-border text-xs outline-none focus:border-amber-600"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      An operations support ticket will automatically be created so staff can follow up without altering your honest public review.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">`;

if (!content.includes(target)) {
  console.error('Target not found in page.tsx!');
  process.exit(1);
}
content = content.replace(target, replacement);

content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully added optional issue reporting to Review Modal!');

