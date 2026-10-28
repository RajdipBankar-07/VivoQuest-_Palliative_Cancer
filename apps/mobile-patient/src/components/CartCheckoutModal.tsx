import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  CartItemMobile,
  CartValidationResultMobile,
  ProductOrderMobile,
  UserSession,
} from '../types';
import { patientApi } from '../services/apiClient';

interface CartCheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  cartItems: CartItemMobile[];
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onToggleInstallation: (productId: string) => void;
  onRemoveItem: (productId: string) => void;
  onOrderPlaced: (order: ProductOrderMobile) => void;
  userSession: UserSession | null;
}

export const CartCheckoutModal: React.FC<CartCheckoutModalProps> = ({
  visible,
  onClose,
  cartItems,
  onUpdateQuantity,
  onToggleInstallation,
  onRemoveItem,
  onOrderPlaced,
  userSession,
}) => {
  // Address State
  const [street, setStreet] = useState('101 FC Road, Model Colony');
  const [city, setCity] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('411004');
  const [contactPhone, setContactPhone] = useState(userSession?.phone || '');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');

  // Revalidation & Placement States
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CartValidationResultMobile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Sync phone from session
  useEffect(() => {
    if (userSession?.phone && !contactPhone) {
      setContactPhone(userSession.phone);
    }
  }, [userSession]);

  // Revalidate cart with backend on items change or modal open
  useEffect(() => {
    if (!visible || cartItems.length === 0) {
      setValidationResult(null);
      return;
    }

    let isMounted = true;
    const revalidate = async () => {
      setIsValidating(true);
      setCheckoutError(null);
      try {
        const payload = cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          installationSelected: item.installationSelected,
        }));
        const result = await patientApi.validateCart(payload);
        if (isMounted) {
          setValidationResult(result);
        }
      } catch (err: any) {
        if (isMounted) {
          setCheckoutError(err.message || 'Unable to revalidate cart pricing against server.');
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    };

    revalidate();

    return () => {
      isMounted = false;
    };
  }, [visible, cartItems]);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add medical equipment to your cart before proceeding.');
      return;
    }

    if (!street.trim() || street.trim().length < 5) {
      setCheckoutError('Please enter a valid street delivery address (minimum 5 characters).');
      return;
    }

    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
      setCheckoutError('Please enter a valid 6-digit postal pincode.');
      return;
    }

    const cleanContact = contactPhone.trim().replace(/\D/g, '');
    if (!cleanContact || cleanContact.length < 10) {
      setCheckoutError('Please enter a valid 10-digit delivery contact number.');
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      // 1. Create order on backend (revalidates price, reserves stock, defaults 3-day delivery)
      const idempotencyKey = `mobile_ord_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const orderPayload = {
        items: cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          installationSelected: i.installationSelected,
        })),
        deliveryAddress: {
          street: street.trim(),
          city: city.trim() || 'Pune',
          state: state.trim() || 'Maharashtra',
          pincode: pincode.trim(),
          contactPhone: cleanContact,
        },
        paymentMethod,
        specialInstructions: specialInstructions.trim() || undefined,
        idempotencyKey,
      };

      const placedOrder = await patientApi.createOrder(orderPayload);

      // 2. If online payment, perform test/sandbox payment intent & verification
      if (paymentMethod === 'online') {
        const intent = await patientApi.createPaymentIntent(placedOrder.id);
        const rzpOrderId = intent.razorpayOrderId || `rzp_test_ord_${placedOrder.orderNumber}`;
        const rzpPaymentId = `pay_sim_${Date.now()}`;
        const rzpSignature = `test_sig_${rzpOrderId}_${rzpPaymentId}`;

        // Verify payment signature on backend - transitions orderStatus to 'confirmed', paymentStatus to 'paid', dispatches notification
        const verifiedOrder = await patientApi.verifyPayment({
          orderId: placedOrder.id,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          razorpaySignature: rzpSignature,
        });

        onOrderPlaced(verifiedOrder);
      } else {
        // COD order
        onOrderPlaced(placedOrder);
      }

      onClose();
    } catch (err: any) {
      setCheckoutError(err.message || 'Failed to place medical order. Please review your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pricing = validationResult?.pricing;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Medical Equipment Cart</Text>
              <Text style={styles.headerSubtitle}>
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
            {/* Error Banner */}
            {checkoutError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {checkoutError}</Text>
              </View>
            )}

            {/* Test Mode Banner */}
            <View style={styles.testModeBanner}>
              <Text style={styles.testModeTitle}>🔒 VERIFIED TEST / SANDBOX MODE</Text>
              <Text style={styles.testModeText}>
                No real monetary charges will occur. Orders and clinical dispatch workflows are
                tested against live database models and inventory reservations.
              </Text>
            </View>

            {/* Cart Items List */}
            {cartItems.length === 0 ? (
              <View style={styles.emptyCartBox}>
                <Text style={styles.emptyCartIcon}>🛒</Text>
                <Text style={styles.emptyCartTitle}>Your Cart is Empty</Text>
                <Text style={styles.emptyCartText}>
                  Explore the Medical Equipment catalog to select wheelchairs, nebulizers, grab bars, and patient monitoring devices.
                </Text>
              </View>
            ) : (
              <View style={styles.itemsSection}>
                <Text style={styles.sectionHeading}>Items in Cart</Text>
                {cartItems.map((item) => {
                  const unitPrice = item.product.sellingPrice || item.product.price;
                  const itemTotal = unitPrice * item.quantity;
                  const hasInstallation = item.product.installationEligible;
                  const installCharge = item.product.installationServiceCharge || 250;

                  return (
                    <View key={item.productId} style={styles.cartItemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemTitleWrap}>
                          <Text style={styles.itemTitle} numberOfLines={2}>
                            {item.product.title}
                          </Text>
                          <Text style={styles.itemSku}>SKU: {item.product.sku}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => onRemoveItem(item.productId)}
                        >
                          <Text style={styles.removeBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Quantity & Unit Price Row */}
                      <View style={styles.qtyPriceRow}>
                        <View style={styles.qtyControls}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                          >
                            <Text style={styles.qtyBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyDisplay}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.priceColumn}>
                          <Text style={styles.itemTotalPrice}>₹{itemTotal.toLocaleString('en-IN')}</Text>
                          <Text style={styles.itemUnitPrice}>
                            (₹{unitPrice.toLocaleString('en-IN')} each)
                          </Text>
                        </View>
                      </View>

                      {/* Installation Option */}
                      {hasInstallation && (
                        <TouchableOpacity
                          style={[
                            styles.installRow,
                            item.installationSelected && styles.installRowActive,
                          ]}
                          onPress={() => onToggleInstallation(item.productId)}
                        >
                          <View
                            style={[
                              styles.smallCheckbox,
                              item.installationSelected && styles.smallCheckboxActive,
                            ]}
                          >
                            {item.installationSelected && <Text style={styles.smallCheckmark}>✓</Text>}
                          </View>
                          <Text style={styles.installRowText}>
                            Include In-Home Clinician Setup (+₹{installCharge})
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {cartItems.length > 0 && (
              <>
                {/* Delivery Address Form */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionHeading}>Delivery Address & Contact</Text>

                  <Text style={styles.inputLabel}>Street / Building Address *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={street}
                    onChangeText={setStreet}
                    placeholder="House/Flat number, building name, street"
                    placeholderTextColor="#94A3B8"
                  />

                  <View style={styles.twoColumnRow}>
                    <View style={styles.columnHalf}>
                      <Text style={styles.inputLabel}>City *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={city}
                        onChangeText={setCity}
                        placeholder="City"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={styles.columnHalf}>
                      <Text style={styles.inputLabel}>Pincode *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={pincode}
                        onChangeText={setPincode}
                        placeholder="6-digit Pincode"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Contact Phone *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.inputLabel}>Special Delivery Instructions (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={specialInstructions}
                    onChangeText={setSpecialInstructions}
                    placeholder="e.g. Ring bell twice, ground floor entry"
                    placeholderTextColor="#94A3B8"
                    multiline
                  />
                </View>

                {/* Payment Method */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionHeading}>Payment Method</Text>
                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      paymentMethod === 'online' && styles.paymentOptionActive,
                    ]}
                    onPress={() => setPaymentMethod('online')}
                  >
                    <View style={styles.radioOuter}>
                      {paymentMethod === 'online' && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.paymentOptionTextWrap}>
                      <Text style={styles.paymentOptionTitle}>Online Payment (Razorpay Sandbox)</Text>
                      <Text style={styles.paymentOptionSubtitle}>UPI, NetBanking, Credit/Debit Cards (Instant Confirmation)</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      paymentMethod === 'cod' && styles.paymentOptionActive,
                    ]}
                    onPress={() => setPaymentMethod('cod')}
                  >
                    <View style={styles.radioOuter}>
                      {paymentMethod === 'cod' && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.paymentOptionTextWrap}>
                      <Text style={styles.paymentOptionTitle}>Cash on Delivery (COD)</Text>
                      <Text style={styles.paymentOptionSubtitle}>Pay at doorstep upon medical equipment delivery</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Server-Revalidated Pricing Summary */}
                <View style={styles.pricingSummarySection}>
                  <View style={styles.summaryTitleRow}>
                    <Text style={styles.sectionHeading}>Price Summary</Text>
                    {isValidating && <ActivityIndicator size="small" color="#1976D2" />}
                  </View>

                  <View style={styles.priceSummaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>
                      ₹{(pricing?.subtotal || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {Boolean(pricing && pricing.discountTotal > 0) && (
                    <View style={styles.priceSummaryRow}>
                      <Text style={styles.summaryLabelDiscount}>Discount / Savings</Text>
                      <Text style={styles.summaryValueDiscount}>
                        -₹{pricing!.discountTotal.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}

                  <View style={styles.priceSummaryRow}>
                    <Text style={styles.summaryLabel}>Delivery Fee</Text>
                    <Text style={styles.summaryValue}>
                      {pricing?.deliveryFee === 0 ? (
                        <Text style={styles.freeDelivery}>FREE</Text>
                      ) : (
                        `₹${(pricing?.deliveryFee || 0).toLocaleString('en-IN')}`
                      )}
                    </Text>
                  </View>

                  <View style={styles.priceSummaryRow}>
                    <Text style={styles.summaryLabel}>Healthcare GST (12%)</Text>
                    <Text style={styles.summaryValue}>
                      ₹{(pricing?.taxGst || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {Boolean(pricing && pricing.installationCharge > 0) && (
                    <View style={styles.priceSummaryRow}>
                      <Text style={styles.summaryLabel}>Clinician Setup Fee</Text>
                      <Text style={styles.summaryValue}>
                        ₹{pricing!.installationCharge.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.priceSummaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total Amount Payable</Text>
                    <Text style={styles.totalValue}>
                      ₹{(pricing?.totalAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Bottom Confirmation Button */}
          {cartItems.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.confirmButton, (isSubmitting || isValidating) && styles.disabledBtn]}
                disabled={isSubmitting || isValidating}
                onPress={handlePlaceOrder}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    Confirm & Place Order (₹{(pricing?.totalAmount || 0).toLocaleString('en-IN')})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  testModeBanner: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  testModeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7E22CE',
    marginBottom: 2,
  },
  testModeText: {
    fontSize: 10,
    color: '#6B21A8',
    lineHeight: 14,
  },
  emptyCartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyCartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyCartText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  itemsSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  cartItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  itemSku: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  qtyPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qtyBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  qtyDisplay: {
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  itemTotalPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemUnitPrice: {
    fontSize: 10,
    color: '#64748B',
  },
  installRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  installRowActive: {
    borderTopColor: '#BFDBFE',
  },
  smallCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    backgroundColor: '#FFFFFF',
  },
  smallCheckboxActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  smallCheckmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  installRowText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 6,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  columnHalf: {
    flex: 1,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  paymentOptionActive: {
    borderColor: '#1976D2',
    backgroundColor: '#EFF6FF',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1976D2',
  },
  paymentOptionTextWrap: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentOptionSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  pricingSummarySection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  summaryLabelDiscount: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  summaryValueDiscount: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
  },
  freeDelivery: {
    color: '#16A34A',
    fontWeight: '800',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    marginTop: 6,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1976D2',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  confirmButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});

