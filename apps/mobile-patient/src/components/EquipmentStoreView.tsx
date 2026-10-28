import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MedicalProductMobile } from '../types';
import { resolveProductImageUrl } from '../services/apiClient';

interface EquipmentStoreViewProps {
  products: MedicalProductMobile[];
  isLoading: boolean;
  cartCount: number;
  ordersCount: number;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onSelectProduct: (product: MedicalProductMobile) => void;
  onAddToCart: (product: MedicalProductMobile) => void;
  onBuyNow: (product: MedicalProductMobile) => void;
  onRefresh: () => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  selectedSourcing: string;
  onSelectSourcing: (sourcing: string) => void;
  selectedSort: string;
  onSelectSort: (sort: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Equipment' },
  { id: 'mobility', label: 'Mobility & Wheelchairs' },
  { id: 'respiratory', label: 'Respiratory & O2' },
  { id: 'monitoring_diagnostics', label: 'Diagnostics & Vitals' },
  { id: 'icu_home_setup', label: 'ICU Home Setup' },
  { id: 'fall_prevention', label: 'Fall Prevention' },
  { id: 'wound_care', label: 'Wound Care' },
  { id: 'clinical_nutrition', label: 'Clinical Nutrition' },
];

const SOURCING_OPTIONS = [
  { id: 'all', label: 'All Sourcing' },
  { id: 'own_stock', label: 'VivoQuest Depot' },
  { id: 'supplier_direct', label: 'Supplier Direct' },
];

export const EquipmentStoreView: React.FC<EquipmentStoreViewProps> = ({
  products,
  isLoading,
  cartCount,
  ordersCount,
  onOpenCart,
  onOpenOrders,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onRefresh,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  selectedSourcing,
  onSelectSourcing,
  selectedSort,
  onSelectSort,
}) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (productId: string) => {
    setImageErrors((prev) => ({ ...prev, [productId]: true }));
  };

  const getCategoryFallbackEmoji = (category: string) => {
    switch (category) {
      case 'respiratory':
        return '🫁';
      case 'mobility':
        return '🦯';
      case 'monitoring_diagnostics':
        return '🩺';
      case 'icu_home_setup':
        return '🛏️';
      case 'fall_prevention':
        return '🛡️';
      case 'wound_care':
        return '🩹';
      case 'clinical_nutrition':
        return '🥣';
      default:
        return '📦';
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Actions Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarTitles}>
          <Text style={styles.screenHeading}>Medical Equipment</Text>
          <Text style={styles.screenSubtitle}>Verified Healthcare Devices &amp; Home Setup</Text>
        </View>

        <View style={styles.topBarButtons}>
          <TouchableOpacity
            style={styles.ordersButton}
            onPress={onOpenOrders}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="View My Medical Orders"
          >
            <Text style={styles.ordersButtonIcon}>📦</Text>
            {ordersCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{ordersCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cartButton}
            onPress={onOpenCart}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="View Cart"
          >
            <Text style={styles.cartButtonIcon}>🛒</Text>
            {cartCount > 0 && (
              <View style={styles.cartBadgeCount}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Rounded Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search nebulizers, grab bars, walkers, monitors..."
          placeholderTextColor="#94A3B8"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips (Constrained with flexGrow: 0 to prevent vertical stretch) */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollView}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => onSelectCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sourcing & Sort Filter Row */}
      <View style={styles.filterRow}>
        <View style={styles.sourcingTabs}>
          {SOURCING_OPTIONS.map((opt) => {
            const isSelected = selectedSourcing === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sourcingChip, isSelected && styles.sourcingChipActive]}
                onPress={() => onSelectSourcing(opt.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.sourcingChipText, isSelected && styles.sourcingChipTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.sortToggleBtn}
          activeOpacity={0.7}
          onPress={() =>
            onSelectSort(
              selectedSort === 'price_asc'
                ? 'price_desc'
                : selectedSort === 'price_desc'
                ? 'newest'
                : 'price_asc'
            )
          }
        >
          <Text style={styles.sortToggleText}>
            Sort: {selectedSort === 'price_asc' ? '₹ Low-High' : selectedSort === 'price_desc' ? '₹ High-Low' : 'Featured'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Product List */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading medical equipment catalog...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No Medical Equipment Found</Text>
          <Text style={styles.emptyText}>
            No products match your current filters. Try searching with different terms or selecting
            another category.
          </Text>
          <TouchableOpacity
            style={styles.resetFilterBtn}
            onPress={() => {
              onSelectCategory('all');
              onSelectSourcing('all');
              onSearchChange('');
            }}
          >
            <Text style={styles.resetFilterText}>Reset All Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.productListScrollView}
          contentContainerStyle={styles.productListContent}
          showsVerticalScrollIndicator={true}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        >
          <View style={styles.resultsCountBar}>
            <Text style={styles.resultsCountText}>Showing {products.length} medical items</Text>
          </View>

          {products.map((item) => {
            const regularPrice = item.regularPrice || item.price;
            const sellingPrice = item.sellingPrice || item.price;
            const savings = regularPrice > sellingPrice ? regularPrice - sellingPrice : 0;
            const discount = item.discountPercentage || (regularPrice > sellingPrice ? Math.round((savings / regularPrice) * 100) : 0);
            const isOutOfStock = item.stockQuantity <= 0;
            const isLowStock = item.stockQuantity > 0 && item.stockQuantity <= 5;
            const isSupplierDirect = item.sourcingType === 'supplier_direct' || item.sourcingType === 'supplier';
            const hasImageError = imageErrors[item.id];
            const rawImageUrl = item.images && item.images.length > 0 ? item.images[0] : null;
            const resolvedImageUrl = resolveProductImageUrl(rawImageUrl);

            return (
              <View key={item.id} style={styles.productCard}>
                {/* Horizontal Card Layout: Left Thumbnail + Right Specs */}
                <View style={styles.cardMainRow}>
                  {/* Left Column: Fixed-size 104x104 Product Thumbnail with Overlays */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onSelectProduct(item)}
                    style={styles.cardImageSection}
                  >
                    {resolvedImageUrl && !hasImageError ? (
                      <Image
                        source={{ uri: resolvedImageUrl }}
                        style={styles.productImage}
                        resizeMode="contain"
                        onError={() => handleImageError(item.id)}
                      />
                    ) : (
                      <View style={styles.productImageFallback}>
                        <Text style={styles.fallbackEmoji}>{getCategoryFallbackEmoji(item.category)}</Text>
                        <Text style={styles.fallbackCategoryText} numberOfLines={1}>
                          {item.category?.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    )}

                    {/* Sourcing Badge Pill Overlay */}
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
                        {isSupplierDirect ? 'Supplier' : 'Depot'}
                      </Text>
                    </View>

                    {/* Discount Pill Overlay */}
                    {discount > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>{discount}% OFF</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Right Column: Title, SKU, Rating, Price, Stock & Delivery */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onSelectProduct(item)}
                    style={styles.cardInfoSection}
                  >
                    <Text style={styles.cardCategory}>{item.category.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardSku}>SKU: {item.sku}</Text>

                    {/* Real Ratings or Clinical Verification Notice */}
                    {item.reviewCount && item.reviewCount > 0 ? (
                      <View style={styles.ratingRow}>
                        <Text style={styles.starText}>★</Text>
                        <Text style={styles.ratingValue}>{Number(item.averageRating || 5).toFixed(1)}</Text>
                        <Text style={styles.reviewCount}>({item.reviewCount})</Text>
                      </View>
                    ) : (
                      <Text style={styles.unratedText}>Clinically verified equipment</Text>
                    )}

                    {/* Price Row */}
                    <View style={styles.priceContainer}>
                      <Text style={styles.sellingPrice}>₹{sellingPrice.toLocaleString('en-IN')}</Text>
                      {savings > 0 && (
                        <Text style={styles.regularPrice}>₹{regularPrice.toLocaleString('en-IN')}</Text>
                      )}
                      {savings > 0 && (
                        <Text style={styles.savingsPill}>Save ₹{savings.toLocaleString('en-IN')}</Text>
                      )}
                    </View>

                    {/* Stock Status */}
                    <View style={styles.stockRow}>
                      <View
                        style={[
                          styles.stockDot,
                          isOutOfStock
                            ? styles.stockDotOut
                            : isLowStock
                            ? styles.stockDotLow
                            : styles.stockDotIn,
                        ]}
                      />
                      <Text
                        style={[
                          styles.stockText,
                          isOutOfStock
                            ? styles.stockTextOut
                            : isLowStock
                            ? styles.stockTextLow
                            : styles.stockTextIn,
                        ]}
                      >
                        {isOutOfStock
                          ? 'Out of Stock'
                          : isLowStock
                          ? `Only ${item.stockQuantity} left`
                          : `In Stock (${item.stockQuantity} available)`}
                      </Text>
                    </View>

                    {/* Delivery & Clinician Setup Preview */}
                    <View style={styles.metaRow}>
                      <Text style={styles.deliveryEstimateText}>
                        🚚 {item.estimatedDeliveryDays || '2-4 business days'}
                      </Text>
                      {item.installationEligible && (
                        <Text style={styles.setupTagText}>• 🔧 Setup available</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Bottom Action Strip: Details, + Cart, Buy Now */}
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => onSelectProduct(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.detailsButtonText}>Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.addToCartButton, isOutOfStock && styles.disabledButton]}
                    disabled={isOutOfStock}
                    onPress={() => onAddToCart(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addToCartButtonText}>+ Cart</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.buyNowButton, isOutOfStock && styles.disabledButton]}
                    disabled={isOutOfStock}
                    onPress={() => onBuyNow(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buyNowButtonText}>Buy Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F9FC',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarTitles: {
    flex: 1,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  topBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 4,
  },
  ordersButton: {
    backgroundColor: '#F1F5F9',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ordersButtonIcon: {
    fontSize: 16,
  },
  cartButton: {
    backgroundColor: '#1976D2',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  cartButtonIcon: {
    fontSize: 16,
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cartBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 42,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
    color: '#64748B',
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: '#0F172A',
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryScrollView: {
    flexGrow: 0,
    height: 44,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  sourcingTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  sourcingChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sourcingChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  sourcingChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  sourcingChipTextActive: {
    color: '#FFFFFF',
  },
  sortToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1976D2',
  },
  resultsCountBar: {
    marginBottom: 8,
  },
  resultsCountText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
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
  resetFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1976D2',
  },
  resetFilterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productListScrollView: {
    flex: 1,
  },
  productListContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100, // Safe clearance for bottom tab bar
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardImageSection: {
    width: 104,
    height: 104,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productImage: {
    width: '90%',
    height: '90%',
  },
  productImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  fallbackEmoji: {
    fontSize: 32,
  },
  fallbackCategoryText: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  sourcingBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    zIndex: 2,
  },
  sourcingBadgeOwn: {
    backgroundColor: '#E0F2FE',
  },
  sourcingBadgeSupplier: {
    backgroundColor: '#F3E8FF',
  },
  sourcingBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  sourcingBadgeTextOwn: {
    color: '#0369A1',
  },
  sourcingBadgeTextSupplier: {
    color: '#7E22CE',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    zIndex: 2,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
  cardInfoSection: {
    flex: 1,
    paddingLeft: 12,
  },
  cardCategory: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 2,
  },
  cardSku: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginBottom: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  starText: {
    color: '#EAB308',
    fontSize: 11,
    marginRight: 3,
  },
  ratingValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 3,
  },
  reviewCount: {
    fontSize: 10,
    color: '#64748B',
  },
  unratedText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 3,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 3,
  },
  sellingPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  regularPrice: {
    fontSize: 11.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  savingsPill: {
    fontSize: 9.5,
    color: '#16A34A',
    fontWeight: '700',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  stockDotIn: {
    backgroundColor: '#16A34A',
  },
  stockDotLow: {
    backgroundColor: '#D97706',
  },
  stockDotOut: {
    backgroundColor: '#DC2626',
  },
  stockText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  stockTextIn: {
    color: '#16A34A',
  },
  stockTextLow: {
    color: '#D97706',
  },
  stockTextOut: {
    color: '#DC2626',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  deliveryEstimateText: {
    fontSize: 10,
    color: '#64748B',
  },
  setupTagText: {
    fontSize: 10,
    color: '#7C3AED',
    fontWeight: '600',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  detailsButton: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  detailsButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  addToCartButton: {
    flex: 1.2,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  buyNowButton: {
    flex: 1.2,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.4,
  },
});
