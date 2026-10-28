import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MedicalProductMobile } from '../types';
import { resolveProductImageUrl } from '../services/apiClient';

interface ProductDetailModalProps {
  product: MedicalProductMobile | null;
  visible: boolean;
  onClose: () => void;
  onAddToCart: (product: MedicalProductMobile, installationSelected: boolean) => void;
  onBuyNow: (product: MedicalProductMobile, installationSelected: boolean) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  visible,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
  const [installationSelected, setInstallationSelected] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const regularPrice = product.regularPrice || product.price;
  const sellingPrice = product.sellingPrice || product.price;
  const savings = regularPrice > sellingPrice ? regularPrice - sellingPrice : 0;
  const discount = product.discountPercentage || (regularPrice > sellingPrice ? Math.round((savings / regularPrice) * 100) : 0);
  const isOutOfStock = product.stockQuantity <= 0;
  const isSupplierDirect = product.sourcingType === 'supplier_direct' || product.sourcingType === 'supplier';

  const galleryImages =
    product.imageGallery && product.imageGallery.length > 0
      ? product.imageGallery.map((g) => resolveProductImageUrl(g.url) || g.url)
      : product.images && product.images.length > 0
      ? product.images.map((img) => resolveProductImageUrl(img) || img)
      : [];

  const currentDisplayImage =
    galleryImages.length > selectedGalleryIndex ? galleryImages[selectedGalleryIndex] : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerCategory}>{product.category.replace(/_/g, ' ').toUpperCase()}</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {product.title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
            {/* Sourcing & Discount Badges */}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.sourcingBadge,
                  isSupplierDirect ? styles.sourcingBadgeSupplier : styles.sourcingBadgeOwn,
                ]}
              >
                <Text
                  style={[
                    styles.sourcingBadgeText,
                    isSupplierDirect ? styles.sourcingBadgeTextSupplier : styles.sourcingBadgeTextOwn,
                  ]}
                >
                  {isSupplierDirect ? 'Shipped Directly by Verified Supplier' : 'Fulfilled by VivoQuest Central Depot'}
                </Text>
              </View>

              {discount > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{discount}% OFF</Text>
                </View>
              )}
            </View>

            {/* Main Image Display */}
            <View style={styles.mainImageContainer}>
              {currentDisplayImage && !imageError ? (
                <Image
                  source={{ uri: currentDisplayImage }}
                  style={styles.mainImage}
                  resizeMode="contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={styles.imageFallback}>
                  <Text style={styles.imageFallbackEmoji}>📦</Text>
                  <Text style={styles.imageFallbackText}>Medical Equipment View</Text>
                </View>
              )}
            </View>

            {/* Thumbnail Selector */}
            {galleryImages.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                {galleryImages.map((imgUrl, idx) => (
                  <TouchableOpacity
                    key={`${imgUrl}-${idx}`}
                    style={[styles.thumbItem, selectedGalleryIndex === idx && styles.thumbItemActive]}
                    onPress={() => {
                      setSelectedGalleryIndex(idx);
                      setImageError(false);
                    }}
                  >
                    <Image source={{ uri: imgUrl }} style={styles.thumbImage} resizeMode="contain" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Title & SKU */}
            <Text style={styles.fullTitle}>{product.title}</Text>
            <Text style={styles.skuText}>SKU: {product.sku}</Text>

            {/* Rating */}
            {product.reviewCount && product.reviewCount > 0 ? (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStars}>★★★★★</Text>
                <Text style={styles.ratingScore}>{Number(product.averageRating || 5).toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({product.reviewCount} customer reviews)</Text>
              </View>
            ) : (
              <View style={styles.verifiedQualityBox}>
                <Text style={styles.verifiedQualityText}>✓ ISO & CE Certified Clinical Grade</Text>
              </View>
            )}

            {/* Pricing Box */}
            <View style={styles.pricingBox}>
              <View style={styles.priceRow}>
                <Text style={styles.sellingPrice}>₹{sellingPrice.toLocaleString('en-IN')}</Text>
                {savings > 0 && (
                  <Text style={styles.regularPrice}>₹{regularPrice.toLocaleString('en-IN')}</Text>
                )}
              </View>
              {savings > 0 && (
                <Text style={styles.savingsText}>You Save ₹{savings.toLocaleString('en-IN')} ({discount}% discount)</Text>
              )}
              <Text style={styles.taxInclusiveText}>Prices include 12% Healthcare Equipment GST</Text>
            </View>

            {/* Stock & Delivery Status */}
            <View style={styles.stockCard}>
              <View style={styles.stockStatusRow}>
                <View style={[styles.stockDot, isOutOfStock ? styles.stockDotOut : styles.stockDotIn]} />
                <Text style={[styles.stockText, isOutOfStock ? styles.stockTextOut : styles.stockTextIn]}>
                  {isOutOfStock ? 'Currently Out of Stock' : `Available in Depot (${product.stockQuantity} units)`}
                </Text>
              </View>
              <Text style={styles.deliveryEstimate}>
                🚚 Estimated Delivery: {product.estimatedDeliveryDays || '2-4 business days'}
              </Text>
            </View>

            {/* Optional Clinician Installation Option */}
            {product.installationEligible && (
              <View style={styles.installationBox}>
                <View style={styles.installationHeader}>
                  <TouchableOpacity
                    style={styles.checkboxTouch}
                    onPress={() => setInstallationSelected(!installationSelected)}
                  >
                    <View style={[styles.checkbox, installationSelected && styles.checkboxActive]}>
                      {installationSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.installationLabel}>
                      Include In-Home Clinician Setup (+₹{product.installationServiceCharge || 250})
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.installationDesc}>
                  {product.installationDescription ||
                    'A certified VivoQuest technician or physiotherapist visits your home alongside delivery to assemble, calibrate, and conduct safety checks.'}
                </Text>
              </View>
            )}

            {/* Description */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionHeading}>Product Description</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionHeading}>Technical Specifications</Text>
                <View style={styles.specsTable}>
                  {Object.entries(product.specifications).map(([key, val], idx) => (
                    <View key={key} style={[styles.specRow, idx % 2 === 1 && styles.specRowAlt]}>
                      <Text style={styles.specKey}>{key}</Text>
                      <Text style={styles.specVal}>{String(val)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Bottom Bar */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerAddToCartBtn, isOutOfStock && styles.disabledBtn]}
              disabled={isOutOfStock}
              onPress={() => {
                onAddToCart(product, installationSelected);
                onClose();
              }}
            >
              <Text style={styles.footerAddToCartText}>Add to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.footerBuyNowBtn, isOutOfStock && styles.disabledBtn]}
              disabled={isOutOfStock}
              onPress={() => {
                onBuyNow(product, installationSelected);
                onClose();
              }}
            >
              <Text style={styles.footerBuyNowText}>Buy Now</Text>
            </TouchableOpacity>
          </View>
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
    height: '90%',
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
  headerTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  headerCategory: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourcingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourcingBadgeOwn: {
    backgroundColor: '#E0F2FE',
  },
  sourcingBadgeSupplier: {
    backgroundColor: '#F3E8FF',
  },
  sourcingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sourcingBadgeTextOwn: {
    color: '#0369A1',
  },
  sourcingBadgeTextSupplier: {
    color: '#7E22CE',
  },
  discountBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  mainImageContainer: {
    height: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    alignItems: 'center',
  },
  imageFallbackEmoji: {
    fontSize: 56,
  },
  imageFallbackText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  thumbScroll: {
    marginBottom: 14,
  },
  thumbItem: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  thumbItemActive: {
    borderColor: '#1976D2',
    borderWidth: 2,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  fullTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 4,
  },
  skuText: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingStars: {
    color: '#EAB308',
    fontSize: 14,
    marginRight: 6,
  },
  ratingScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: '#64748B',
  },
  verifiedQualityBox: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  verifiedQualityText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  pricingBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  sellingPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  regularPrice: {
    fontSize: 15,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  savingsText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
    marginTop: 2,
  },
  taxInclusiveText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  stockCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  stockStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stockDotIn: {
    backgroundColor: '#16A34A',
  },
  stockDotOut: {
    backgroundColor: '#DC2626',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stockTextIn: {
    color: '#16A34A',
  },
  stockTextOut: {
    color: '#DC2626',
  },
  deliveryEstimate: {
    fontSize: 11,
    color: '#475569',
  },
  installationBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  installationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#1976D2',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  installationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  installationDesc: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 6,
    lineHeight: 16,
  },
  sectionBox: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  specsTable: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  specRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  specKey: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    flex: 1,
  },
  specVal: {
    fontSize: 11,
    color: '#0F172A',
    flex: 1.5,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  footerAddToCartBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  footerAddToCartText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  footerBuyNowBtn: {
    flex: 1.2,
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerBuyNowText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.4,
  },
});

