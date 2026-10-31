import crypto from 'crypto';

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 * Range: 100000 to 999999.
 */
export const generateSecureDeliveryOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Compute a secure SHA-256 hash of the delivery OTP bound to the order ID and application secret.
 * Prevents cross-order replay and ensures raw OTP is never stored in database or logs.
 */
export const hashDeliveryOtp = (otp: string, orderId: string): string => {
  const secret = process.env.JWT_SECRET || 'vivoquest_delivery_otp_secret_salt_2026';
  return crypto
    .createHash('sha256')
    .update(`${otp.trim()}:${orderId.toString()}:${secret}`)
    .digest('hex');
};

/**
 * Verify an incoming raw OTP against a stored hash for a given order ID.
 */
export const verifyOtpHash = (rawOtp: string, orderId: string, storedHash: string): boolean => {
  if (!rawOtp || !storedHash) return false;
  const computed = hashDeliveryOtp(rawOtp, orderId);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
};

