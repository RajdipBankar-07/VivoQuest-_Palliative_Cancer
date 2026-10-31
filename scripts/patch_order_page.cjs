const fs = require('fs');
const path = require('path');

const filePath = path.resolve('frontend/src/app/orders/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state after reviewComment state
const stateTarget = `  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);`;

const stateReplacement = `  const [reviewComment, setReviewComment] = useState('');
  const [reviewHasIssue, setReviewHasIssue] = useState(false);
  const [reviewIssueCategory, setReviewIssueCategory] = useState('defective_device');
  const [reviewIssueDetails, setReviewIssueDetails] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Delivery Experience Rating Modal State
  const [isDeliveryRatingModalOpen, setIsDeliveryRatingModalOpen] = useState(false);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [handlingRating, setHandlingRating] = useState(5);
  const [deliveryFeedback, setDeliveryFeedback] = useState('');
  const [isSubmittingDeliveryRating, setIsSubmittingDeliveryRating] = useState(false);
  const [deliveryRatingSuccessMsg, setDeliveryRatingSuccessMsg] = useState<string | null>(null);
  const [deliveryRatingError, setDeliveryRatingError] = useState<string | null>(null);`;

// Normalize line endings for replacement
content = content.replace(/\r\n/g, '\n');
if (!content.includes(stateTarget)) {
  console.error('State target not found!');
  process.exit(1);
}
content = content.replace(stateTarget, stateReplacement);

// 2. Update handleSubmitReview to pass issue details
const reviewSubmitTarget = `      await productsApi.submitProductReview(reviewProductId, {
        orderId: order._id || order.orderNumber,
        rating: reviewRating,
        title: reviewTitle.trim() || 'Verified Purchase Review',
        comment: reviewComment.trim(),
      });`;

const reviewSubmitReplacement = `      await productsApi.submitProductReview(reviewProductId, {
        orderId: order._id || order.orderNumber,
        rating: reviewRating,
        title: reviewTitle.trim() || 'Verified Purchase Review',
        comment: reviewComment.trim(),
        hasIssueReported: reviewHasIssue,
        issueCategory: reviewHasIssue ? reviewIssueCategory : undefined,
        issueDetails: reviewHasIssue ? reviewIssueDetails.trim() : undefined,
      });`;

if (!content.includes(reviewSubmitTarget)) {
  console.error('reviewSubmitTarget not found!');
  process.exit(1);
}
content = content.replace(reviewSubmitTarget, reviewSubmitReplacement);

// 3. Add handleDeliveryRatingSubmit
const handlerTarget = `  // Submit Order Complaint / Return`;
const handlerReplacement = `  // Submit Delivery Experience Rating
  const handleSubmitDeliveryRating = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingDeliveryRating(true);
      setDeliveryRatingError(null);
      const res = await productsApi.submitDeliveryRating(order._id || order.orderNumber, {
        rating: deliveryRating,
        punctualityRating,
        communicationRating,
        handlingRating,
        feedback: deliveryFeedback.trim(),
      });
      if (res && res.data) {
        setDeliveryRatingSuccessMsg('Thank you! Your delivery experience rating has been recorded.');
        setOrder((prev: any) => ({
          ...prev,
          deliveryRating: {
            rating: deliveryRating,
            punctualityRating,
            communicationRating,
            handlingRating,
            feedback: deliveryFeedback.trim(),
            ratedAt: new Date().toISOString(),
          },
        }));
        setTimeout(() => {
          setIsDeliveryRatingModalOpen(false);
          setDeliveryRatingSuccessMsg(null);
        }, 1800);
      }
    } catch (err: any) {
      setDeliveryRatingError(err.message || 'Failed to submit delivery rating.');
    } finally {
      setIsSubmittingDeliveryRating(false);
    }
  };

  // Submit Order Complaint / Return`;

content = content.replace(handlerTarget, handlerReplacement);

// Convert back to CRLF
content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched page.tsx states and handlers!');

