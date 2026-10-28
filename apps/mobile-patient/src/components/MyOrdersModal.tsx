import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { ProductOrderMobile } from '../types';
import { patientApi, resolveProductImageUrl } from '../services/apiClient';

interface MyOrdersModalProps {
  visible: boolean;
  onClose: () => void;
  orders: ProductOrderMobile[];
  isLoading: boolean;
  onRefresh: () => void;
  initialSelectedOrderId?: string;
}

const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All Orders' },
  { id: 'placed', label: 'Placed' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const TIME_SLOTS = [
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
];

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({
  visible,
  onClose,
  orders,
  isLoading,
  onRefresh,
  initialSelectedOrderId,
}) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(initialSelectedOrderId || null);

  // Clinician Setup Scheduling Modal State
  const [schedulingOrder, setSchedulingOrder] = useState<ProductOrderMobile | null>(null);
  const [setupDate, setSetupDate] = useState('');
  const [setupSlot, setSetupSlot] = useState(TIME_SLOTS[0]);
  const [setupNotes, setSetupNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Cancellation State
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Patient clinical condition changed');

  // Filter orders by status
  const filteredOrders = orders.filter((order) => {
    if (selectedFilter === 'all') return true;
    return order.orderStatus === selectedFilter;
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' };
      case 'placed':
        return { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' };
      case 'dispatched':
        return { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' };
      case 'delivered':
        return { backgroundColor: '#DEF7EC', borderColor: '#31C48D' };
      case 'cancelled':
        return { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' };
      default:
        return { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' };
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { color: '#047857' };
      case 'placed':
        return { color: '#1D4ED8' };
      case 'dispatched':
        return { color: '#6D28D9' };
      case 'delivered':
        return { color: '#03543F' };
      case 'cancelled':
        return { color: '#64748B' };
      default:
        return { color: '#334155' };
    }
  };

  const handleCancelOrder = (order: ProductOrderMobile) => {
    const orderKey = order.id || (order as any)._id || order.orderNumber;
    Alert.alert(
      'Cancel Equipment Order',
      `Are you sure you want to cancel Order #${order.orderNumber}? Any reserved inventory will be released and payment refunded if applicable.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Confirm Cancellation',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingOrderId(orderKey);
              await patientApi.cancelOrder(orderKey, cancelReason);
              Alert.alert('Order Cancelled', `Order #${order.orderNumber} has been cancelled successfully.`);
              onRefresh();
            } catch (err: any) {
              Alert.alert('Cancellation Error', err.message || 'Unable to cancel order.');
            } finally {
              setCancellingOrderId(null);
            }
          },
        },
      ]
    );
  };

  const handleScheduleSetup = async () => {
    if (!schedulingOrder) return;
    if (!setupDate.trim()) {
      setScheduleError('Please enter a preferred setup date (YYYY-MM-DD).');
      return;
    }
    const orderKey = schedulingOrder.id || (schedulingOrder as any)._id || schedulingOrder.orderNumber;
    try {
      setIsScheduling(true);
      setScheduleError(null);
      await patientApi.scheduleClinicianSetup(orderKey, {
        setupDate: setupDate.trim(),
        setupSlot: setupSlot,
        notes: setupNotes.trim(),
      });
      Alert.alert(
        'Clinician Setup Confirmed',
        `Certified clinician dispatched alongside equipment for ${setupDate} (${setupSlot}).`
      );
      setSchedulingOrder(null);
      onRefresh();
    } catch (err: any) {
      setScheduleError(err.message || 'Unable to schedule clinician setup.');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <Text style={styles.headerTitle}>My Medical Orders</Text>
              <Text style={styles.headerSubtitle}>
                {orders.length} {orders.length === 1 ? 'order' : 'orders'} • Live Tracking &amp; Setup
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close orders modal"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Compact Status Filter Chips (Constrained flexGrow: 0 to prevent vertical stretching) */}
          <View style={styles.filterBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
              style={styles.filterScrollView}
            >
              {STATUS_FILTERS.map((f) => {
                const isSelected = selectedFilter === f.id;
                const count = f.id === 'all'
                  ? orders.length
                  : orders.filter((o) => o.orderStatus === f.id).length;

                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setSelectedFilter(f.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                    {count > 0 && (
                      <View style={[styles.filterCountBadge, isSelected && styles.filterCountBadgeActive]}>
                        <Text style={[styles.filterCountText, isSelected && styles.filterCountTextActive]}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Order List */}
          {isLoading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#1976D2" />
              <Text style={styles.loadingText}>Fetching medical equipment orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptyText}>
                You have no orders matching &quot;{selectedFilter}&quot;. Place an order from the Medical Equipment
                catalog to view live tracking updates and installation records here.
              </Text>
              {selectedFilter !== 'all' && (
                <TouchableOpacity
                  style={styles.resetFilterButton}
                  onPress={() => setSelectedFilter('all')}
                >
                  <Text style={styles.resetFilterButtonText}>View All Orders</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ScrollView
              style={styles.orderListScrollView}
              contentContainerStyle={styles.orderListContent}
              showsVerticalScrollIndicator={true}
            >
              {filteredOrders.map((order, orderIndex) => {
                // Guaranteed stable, unique key per list item
                const orderKey = `${String(order.id || (order as any)._id || order.orderNumber || 'order')}-${orderIndex}`;
                const isExpanded = expandedOrderId === orderKey;
                const formattedDate = order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Recent';

                const estDate = order.estimatedDeliveryDate
                  ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : order.estimatedDeliveryDays || '2-4 business days';

                const canCancel = ['placed', 'confirmed'].includes(order.orderStatus);
                const hasInstallation = Boolean(order.installation?.requested);
                const installStatus = order.installation?.status || 'none';
                const isPaid = order.paymentStatus === 'paid';

                return (
                  <View key={orderKey} style={styles.orderCard}>
                    {/* Header Row */}
                    <TouchableOpacity
                      style={styles.orderCardHeader}
                      activeOpacity={0.8}
                      onPress={() => setExpandedOrderId(isExpanded ? null : orderKey)}
                    >
                      <View style={styles.orderHeaderTopRow}>
                        <View style={styles.orderNumberWrap}>
                          <Text style={styles.orderNumberText}>Order #{order.orderNumber}</Text>
                          <Text style={styles.orderDateText}>Placed on {formattedDate}</Text>
                        </View>

                        <View style={[styles.statusBadge, getStatusBadgeStyle(order.orderStatus)]}>
                          <Text style={[styles.statusBadgeText, getStatusTextStyle(order.orderStatus)]}>
                            {order.orderStatus.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Items Preview Strip */}
                      <View style={styles.itemsSummaryStrip}>
                        <View style={styles.itemThumbnailsRow}>
                          {(order.items || []).slice(0, 3).map((item, idx) => {
                            const imgUrl = resolveProductImageUrl(item.product?.images?.[0]);
                            return (
                              <View
                                key={item.id ? String(item.id) : `${item.productId || 'item'}-${idx}`}
                                style={styles.itemThumbBox}
                              >
                                {imgUrl ? (
                                  <Image
                                    source={{ uri: imgUrl }}
                                    style={styles.itemThumbImage}
                                    resizeMode="contain"
                                  />
                                ) : (
                                  <Text style={styles.itemThumbEmoji}>📦</Text>
                                )}
                              </View>
                            );
                          })}
                          {(order.items || []).length > 3 && (
                            <View style={styles.moreItemsBox}>
                              <Text style={styles.moreItemsText}>+{(order.items || []).length - 3}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.itemsSummaryDetails}>
                          <Text style={styles.itemsSummaryTitle} numberOfLines={1}>
                            {(order.items || []).map((i) => `${i.title} (×${i.quantity})`).join(', ')}
                          </Text>
                          <View style={styles.paymentAndPriceRow}>
                            <Text style={styles.orderTotalText}>
                              ₹{(order.pricing?.totalAmount || 0).toLocaleString('en-IN')}
                            </Text>
                            <View style={[styles.paymentPill, isPaid ? styles.paymentPillPaid : styles.paymentPillPending]}>
                              <Text style={[styles.paymentPillText, isPaid ? styles.paymentPillTextPaid : styles.paymentPillTextPending]}>
                                {isPaid ? '● Paid' : '○ Pending (COD)'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Estimated Delivery Notice Bar */}
                      <View style={styles.deliveryNoticeBar}>
                        <View style={styles.deliveryNoticeLeft}>
                          <Text style={styles.deliveryNoticeIcon}>🚚</Text>
                          <Text style={styles.deliveryNoticeText}>
                            Est. Delivery: <Text style={styles.boldText}>{estDate}</Text>
                          </Text>
                        </View>
                        <Text style={styles.expandActionText}>
                          {isExpanded ? 'Hide Details ▲' : 'View Tracking ▼'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Expandable Order Details */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        {/* Items List */}
                        <Text style={styles.detailSectionHeading}>Purchased Equipment ({order.items?.length || 0})</Text>
                        {(order.items || []).map((item, idx) => (
                          <View
                            key={item.id ? String(item.id) : `${item.productId || 'item'}-${idx}`}
                            style={styles.itemRow}
                          >
                            <View style={styles.itemBullet} />
                            <View style={styles.itemDetails}>
                              <Text style={styles.itemTitle}>{item.title}</Text>
                              <Text style={styles.itemMeta}>
                                Qty: {item.quantity} × ₹{item.unitPrice.toLocaleString('en-IN')}
                                {item.isRental && (
                                  <Text style={styles.rentalTag}> • Rental ({item.rentalDurationMonths || 1} mo)</Text>
                                )}
                                {item.installationSelected && (
                                  <Text style={styles.installSelectedText}> • Clinician Setup Included</Text>
                                )}
                              </Text>
                            </View>
                            <Text style={styles.itemTotal}>
                              ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        ))}

                        {/* Price Breakdown */}
                        <View style={styles.invoiceBreakdownBox}>
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Subtotal</Text>
                            <Text style={styles.breakdownValue}>
                              ₹{(order.pricing?.subtotal || 0).toLocaleString('en-IN')}
                            </Text>
                          </View>
                          {order.pricing?.discountTotal > 0 && (
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabelGreen}>Discount Savings</Text>
                              <Text style={styles.breakdownValueGreen}>
                                -₹{order.pricing.discountTotal.toLocaleString('en-IN')}
                              </Text>
                            </View>
                          )}
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Home Delivery Fee</Text>
                            <Text style={styles.breakdownValue}>
                              {order.pricing?.deliveryFee === 0 ? 'FREE' : `₹${order.pricing?.deliveryFee}`}
                            </Text>
                          </View>
                          <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Medical Equipment GST (12%)</Text>
                            <Text style={styles.breakdownValue}>
                              ₹{(order.pricing?.taxGst || 0).toLocaleString('en-IN')}
                            </Text>
                          </View>
                          {order.pricing?.installationCharge > 0 && (
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabel}>Certified Technician Setup</Text>
                              <Text style={styles.breakdownValue}>
                                ₹{order.pricing.installationCharge.toLocaleString('en-IN')}
                              </Text>
                            </View>
                          )}
                          <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                            <Text style={styles.breakdownTotalLabel}>Total Amount</Text>
                            <Text style={styles.breakdownTotalValue}>
                              ₹{(order.pricing?.totalAmount || 0).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        </View>

                        {/* Delivery Address */}
                        <View style={styles.infoCard}>
                          <Text style={styles.infoCardHeading}>📍 Delivery Address</Text>
                          <Text style={styles.infoCardText}>{order.deliveryAddress?.street}</Text>
                          <Text style={styles.infoCardText}>
                            {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pincode}
                          </Text>
                          <Text style={styles.infoCardSubtext}>
                            Recipient Contact: {order.deliveryAddress?.contactPhone || order.patientPhone}
                          </Text>
                        </View>

                        {/* Delivery Schedule Audit History (if revised) */}
                        {order.deliveryEstimateHistory && order.deliveryEstimateHistory.length > 0 && (
                          <View style={styles.auditHistoryBox}>
                            <Text style={styles.auditHistoryHeading}>📅 Delivery Schedule Revisions</Text>
                            {order.deliveryEstimateHistory.map((hist, hIdx) => {
                              const histKey = hist.id ? String(hist.id) : `hist-${hist.updatedAt || hIdx}`;
                              const hDate = new Date(hist.updatedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              });
                              const newEst = new Date(hist.newDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              });
                              return (
                                <View key={histKey} style={styles.auditRow}>
                                  <Text style={styles.auditDot}>•</Text>
                                  <View style={styles.auditContent}>
                                    <Text style={styles.auditDate}>
                                      Adjusted to <Text style={styles.boldText}>{newEst}</Text> on {hDate} by {hist.updatedByRole.toUpperCase()}
                                    </Text>
                                    <Text style={styles.auditReason}>Reason: {hist.reason}</Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}

                        {/* Chronological Tracking Timeline (Genuine Persisted Events Only) */}
                        <Text style={styles.detailSectionHeading}>Delivery Milestones &amp; History</Text>
                        <View style={styles.timelineContainer}>
                          {(order.trackingUpdates && order.trackingUpdates.length > 0) ? (
                            order.trackingUpdates.map((step, sIdx) => {
                              const stepKey = step.id ? String(step.id) : `step-${step.status}-${step.timestamp || sIdx}`;
                              const stepTime = step.timestamp
                                ? new Date(step.timestamp).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '';
                              return (
                                <View key={stepKey} style={styles.timelineItem}>
                                  <View style={styles.timelineIndicator}>
                                    <View style={styles.timelineDot} />
                                    {sIdx < (order.trackingUpdates?.length || 0) - 1 && (
                                      <View style={styles.timelineLine} />
                                    )}
                                  </View>
                                  <View style={styles.timelineBody}>
                                    <View style={styles.timelineHeaderRow}>
                                      <Text style={styles.timelineStatus}>
                                        {step.status.replace(/_/g, ' ').toUpperCase()}
                                      </Text>
                                      {stepTime ? <Text style={styles.timelineTime}>{stepTime}</Text> : null}
                                    </View>
                                    <Text style={styles.timelineMessage}>{step.message}</Text>
                                    {step.location && (
                                      <Text style={styles.timelineLocation}>📍 {step.location}</Text>
                                    )}
                                  </View>
                                </View>
                              );
                            })
                          ) : (
                            <View style={styles.timelineItem}>
                              <View style={styles.timelineIndicator}>
                                <View style={styles.timelineDot} />
                              </View>
                              <View style={styles.timelineBody}>
                                <Text style={styles.timelineStatus}>
                                  {order.orderStatus.toUpperCase()}
                                </Text>
                                <Text style={styles.timelineMessage}>
                                  Order is currently {order.orderStatus}. Tracking milestones will update as your package is dispatched from the central depot.
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* In-Home Clinician Setup Management */}
                        {hasInstallation && (
                          <View style={styles.setupCard}>
                            <Text style={styles.setupHeading}>🔧 In-Home Clinician Setup</Text>
                            <Text style={styles.setupStatusText}>
                              Status:{' '}
                              <Text style={styles.boldText}>{installStatus.replace(/_/g, ' ').toUpperCase()}</Text>
                            </Text>

                            {order.installation?.scheduledDate ? (
                              <View style={styles.setupScheduledDetails}>
                                <Text style={styles.setupDateText}>
                                  📅 Scheduled Visit: {order.installation.scheduledDate} ({order.installation.timeSlot || 'Morning'})
                                </Text>
                                {order.installation.technicianName && (
                                  <Text style={styles.setupTechText}>
                                    Certified Specialist: {order.installation.technicianName}
                                  </Text>
                                )}
                              </View>
                            ) : (
                              <View style={styles.setupPrompt}>
                                <Text style={styles.setupPromptText}>
                                  One or more devices require medical technician assembly. Please choose your preferred setup appointment slot.
                                </Text>
                                <TouchableOpacity
                                  style={styles.scheduleButton}
                                  onPress={() => {
                                    setSchedulingOrder(order);
                                    setSetupDate(
                                      new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
                                    );
                                  }}
                                >
                                  <Text style={styles.scheduleButtonText}>Select Appointment Slot</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )}

                        {/* Order Cancellation Action */}
                        {canCancel && (
                          <TouchableOpacity
                            style={styles.cancelOrderButton}
                            onPress={() => handleCancelOrder(order)}
                            disabled={cancellingOrderId === orderKey}
                          >
                            {cancellingOrderId === orderKey ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <Text style={styles.cancelOrderText}>Cancel Equipment Order</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Clinician Setup Scheduling Sub-Modal */}
          {schedulingOrder && (
            <Modal visible={true} transparent animationType="fade">
              <View style={styles.subModalOverlay}>
                <View style={styles.subModalCard}>
                  <Text style={styles.subModalTitle}>Schedule In-Home Setup</Text>
                  <Text style={styles.subModalSubtitle}>
                    Order #{schedulingOrder.orderNumber} • Certified Biomedical Technician
                  </Text>

                  {scheduleError && <Text style={styles.errorBannerText}>{scheduleError}</Text>}

                  <Text style={styles.inputLabel}>Preferred Date (YYYY-MM-DD):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={setupDate}
                    onChangeText={setSetupDate}
                    placeholder="e.g. 2026-10-31"
                  />

                  <Text style={styles.inputLabel}>Select Time Window:</Text>
                  <View style={styles.slotsGrid}>
                    {TIME_SLOTS.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.slotChip, setupSlot === slot && styles.slotChipActive]}
                        onPress={() => setSetupSlot(slot)}
                      >
                        <Text style={[styles.slotChipText, setupSlot === slot && styles.slotChipTextActive]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Patient Mobility / Gate Entry Notes:</Text>
                  <TextInput
                    style={[styles.textInput, { height: 60 }]}
                    value={setupNotes}
                    onChangeText={setSetupNotes}
                    placeholder="e.g. Lift is operational; patient is resting in 2nd bedroom."
                    multiline
                  />

                  <View style={styles.subModalActionRow}>
                    <TouchableOpacity
                      style={styles.subModalCancelBtn}
                      onPress={() => setSchedulingOrder(null)}
                    >
                      <Text style={styles.subModalCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.subModalConfirmBtn}
                      onPress={handleScheduleSetup}
                      disabled={isScheduling}
                    >
                      {isScheduling ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.subModalConfirmText}>Confirm Schedule</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
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
    color: '#475569',
    fontWeight: '700',
  },
  filterBar: {
    height: 52,
    maxHeight: 52,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'center',
  },
  filterScrollView: {
    height: 48,
    maxHeight: 48,
    flexGrow: 0,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  filterChip: {
    height: 34,
    maxHeight: 34,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  filterChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  orderListScrollView: {
    flex: 1,
  },
  orderListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1976D2',
  },
  resetFilterButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderCardHeader: {
    padding: 14,
  },
  orderHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderNumberWrap: {
    flex: 1,
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderDateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemsSummaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemThumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  itemThumbBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 4,
  },
  itemThumbImage: {
    width: '100%',
    height: '100%',
  },
  itemThumbEmoji: {
    fontSize: 16,
  },
  moreItemsBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreItemsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  itemsSummaryDetails: {
    flex: 1,
  },
  itemsSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  paymentAndPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderTotalText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  paymentPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentPillPaid: {
    backgroundColor: '#ECFDF5',
  },
  paymentPillPending: {
    backgroundColor: '#FEF3C7',
  },
  paymentPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  paymentPillTextPaid: {
    color: '#047857',
  },
  paymentPillTextPending: {
    color: '#B45309',
  },
  deliveryNoticeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deliveryNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryNoticeIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  deliveryNoticeText: {
    fontSize: 11,
    color: '#334155',
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  expandActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1976D2',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  detailSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1976D2',
    marginTop: 6,
    marginRight: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  rentalTag: {
    color: '#0D9488',
    fontWeight: '700',
  },
  installSelectedText: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
  },
  invoiceBreakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  breakdownLabelGreen: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  breakdownValueGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  breakdownTotalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1976D2',
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoCardHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  infoCardSubtext: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  auditHistoryBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  auditHistoryHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 6,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  auditDot: {
    color: '#D97706',
    marginRight: 6,
    fontSize: 12,
  },
  auditContent: {
    flex: 1,
  },
  auditDate: {
    fontSize: 11,
    color: '#78350F',
  },
  auditReason: {
    fontSize: 10,
    color: '#92400E',
    marginTop: 1,
  },
  timelineContainer: {
    paddingLeft: 4,
    marginBottom: 14,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 16,
    marginRight: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1976D2',
    marginTop: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: '#CBD5E1',
    marginTop: 2,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 4,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineTime: {
    fontSize: 10,
    color: '#64748B',
  },
  timelineMessage: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  timelineLocation: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  setupCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  setupHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5B21B6',
    marginBottom: 4,
  },
  setupStatusText: {
    fontSize: 11,
    color: '#6D28D9',
  },
  setupScheduledDetails: {
    marginTop: 6,
  },
  setupDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C1D95',
  },
  setupTechText: {
    fontSize: 10,
    color: '#6D28D9',
    marginTop: 2,
  },
  setupPrompt: {
    marginTop: 6,
  },
  setupPromptText: {
    fontSize: 10,
    color: '#6D28D9',
    lineHeight: 14,
    marginBottom: 8,
  },
  scheduleButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cancelOrderButton: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelOrderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  subModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subModalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 11,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  slotChipActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  slotChipText: {
    fontSize: 10,
    color: '#475569',
  },
  slotChipTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  subModalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  subModalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  subModalCancelText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  subModalConfirmBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subModalConfirmText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
