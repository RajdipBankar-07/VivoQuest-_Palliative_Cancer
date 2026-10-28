import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ProductOrderMobile } from '../types';

interface OrderConfirmationModalProps {
  order: ProductOrderMobile | null;
  visible: boolean;
  onClose: () => void;
  onTrackOrder: (order: ProductOrderMobile) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  visible,
  onClose,
  onTrackOrder,
}) => {
  if (!order) return null;

  const estDate = order.estimatedDeliveryDate
    ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : order.estimatedDeliveryDays || '2-4 business days';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Green Success Icon */}
            <View style={styles.successIconCircle}>
              <Text style={styles.successCheckmark}>✓</Text>
            </View>

            <Text style={styles.successHeading}>Order Confirmed!</Text>
            <Text style={styles.successSubtext}>
              Thank you for ordering with VivoQuest. Your medical equipment order is confirmed and
              logged in central dispatch.
            </Text>

            {/* Order Summary Box */}
            <View style={styles.orderSummaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Order Number:</Text>
                <Text style={styles.summaryValueBold}>{order.orderNumber}</Text>
              </View>

              {order.invoiceNumber && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>GST Invoice:</Text>
                  <Text style={styles.summaryValue}>{order.invoiceNumber}</Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Status:</Text>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>
                    {order.paymentStatus === 'paid' ? 'PAID (Verified)' : order.paymentStatus.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Paid:</Text>
                <Text style={styles.priceHighlight}>
                  ₹{(order.pricing?.totalAmount || 0).toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated Delivery:</Text>
                <Text style={styles.deliveryDateHighlight}>{estDate}</Text>
              </View>
            </View>

            {/* Notification Notice */}
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                📱 Confirmation notification recorded in your account. You can view delivery progress
                and carrier updates anytime in My Orders.
              </Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.trackOrderButton}
              onPress={() => {
                onTrackOrder(order);
                onClose();
              }}
            >
              <Text style={styles.trackOrderButtonText}>Track Order in My Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.continueButton} onPress={onClose}>
              <Text style={styles.continueButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    borderWidth: 3,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successCheckmark: {
    color: '#16A34A',
    fontSize: 32,
    fontWeight: '900',
  },
  successHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  orderSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    width: '100%',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  summaryValueBold: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paidBadgeText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
  },
  priceHighlight: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1976D2',
  },
  deliveryDateHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  noticeBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 18,
  },
  noticeText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
    textAlign: 'center',
  },
  trackOrderButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  trackOrderButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  continueButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
});

