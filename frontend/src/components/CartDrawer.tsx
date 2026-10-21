'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Wrench,
  Truck,
  Sparkles,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from './Button';

export const CartDrawer: React.FC = () => {
  const router = useRouter();
  const {
    items,
    pricing,
    warnings,
    totalItemCount,
    isCartOpen,
    closeCart,
    removeItem,
    updateQuantity,
    clearCart,
    hasUnavailableItems,
  } = useCart();

  if (!isCartOpen) return null;

  const freeDeliveryThreshold = 2000;
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - pricing.subtotal);
  const deliveryProgress = Math.min(100, Math.round((pricing.subtotal / freeDeliveryThreshold) * 100));

  const handleCheckoutClick = () => {
    closeCart();
    router.push('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="cart-drawer-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={closeCart}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-border bg-slate-50/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 id="cart-drawer-title" className="text-base font-bold text-navy">
                    Medical Equipment Cart
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} ready for checkout
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-navy hover:bg-slate-200/60 flex items-center justify-center transition-colors"
                aria-label="Close cart drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Free Delivery Bar */}
            <div className="mt-4 bg-white p-3 rounded-xl border border-border/80 shadow-xs">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-navy">
                  <Truck size={14} className="text-secondary" />
                  {amountToFreeDelivery === 0 ? (
                    <span className="text-secondary font-bold">Free Home Delivery Unlocked!</span>
                  ) : (
                    <span>Add ₹{amountToFreeDelivery.toLocaleString('en-IN')} for Free Delivery</span>
                  )}
                </span>
                <span className="font-bold text-slate-500">{deliveryProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-secondary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${deliveryProgress}%` }}
                />
              </div>
            </div>

            {/* Live Warning notices */}
            {warnings.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-0.5">
                  {warnings.map((w, idx) => (
                    <p key={idx}>{w}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                  <ShoppingBag size={28} />
                </div>
                <h3 className="text-base font-bold text-navy mb-1">Your cart is currently empty</h3>
                <p className="text-xs text-muted-foreground max-w-xs mb-6">
                  Explore certified mobility aids, respiratory oxygen systems, beds, and diagnostic kits.
                </p>
                <Button
                  href="/products"
                  variant="primary"
                  size="md"
                  onClick={closeCart}
                  rightIcon={<ArrowRight size={16} />}
                >
                  Browse Medical Store
                </Button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={`${item.productId}-${item.isRental ? 'rental' : 'buy'}`}
                  className={`p-3.5 rounded-xl border transition-all ${
                    !item.inStock
                      ? 'bg-red-50/40 border-red-200 opacity-80'
                      : 'bg-white border-border hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-18 h-18 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                      {item.images && item.images[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback image placeholder
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <ShoppingBag size={22} className="text-slate-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          href={`/products/${item.productId}`}
                          onClick={closeCart}
                          className="text-xs font-bold text-navy hover:text-primary transition-colors line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        <button
                          onClick={() => removeItem(item.productId, item.isRental)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 my-1 text-[11px]">
                        <span className="text-muted-foreground uppercase tracking-wider font-semibold">
                          {item.sku}
                        </span>
                        <span className="text-slate-300">•</span>
                        {item.isRental ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200/60">
                            Rental ({item.rentalDurationMonths} {item.rentalDurationMonths === 1 ? 'mo' : 'mos'})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
                            Purchase
                          </span>
                        )}
                        {item.setupRequired && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200/60 flex items-center gap-0.5">
                            <Wrench size={10} />
                            Setup Included
                          </span>
                        )}
                      </div>

                      {!item.inStock && (
                        <p className="text-[11px] font-bold text-red-600 mb-1">
                          Out of stock — remove or reduce quantity to proceed
                        </p>
                      )}

                      {/* Quantity & Price */}
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center border border-border rounded-lg bg-slate-50">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1, item.isRental)}
                            disabled={item.quantity <= 1}
                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-navy disabled:opacity-30"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-navy">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1, item.isRental)}
                            disabled={item.stockAvailable ? item.quantity >= item.stockAvailable : false}
                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-navy disabled:opacity-30"
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-navy">
                            ₹{item.itemSubtotal.toLocaleString('en-IN')}
                          </span>
                          {item.quantity > 1 && (
                            <div className="text-[10px] text-muted-foreground">
                              ₹{item.unitPrice.toLocaleString('en-IN')} each
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-5 border-t border-border bg-slate-50/90 space-y-3">
              {/* Financial Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-navy">
                    ₹{pricing.subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Home Delivery Fee</span>
                  <span className="font-semibold text-navy">
                    {pricing.deliveryFee === 0 ? (
                      <span className="text-secondary font-bold uppercase tracking-wider text-[11px]">
                        FREE
                      </span>
                    ) : (
                      `₹${pricing.deliveryFee.toLocaleString('en-IN')}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (12% Medical Equipment)</span>
                  <span className="font-semibold text-navy">
                    ₹{pricing.taxGst.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-navy pt-2 border-t border-border/80">
                  <span>Total Amount</span>
                  <span className="text-base text-primary">
                    ₹{pricing.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Safety notice */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-[11px] text-emerald-800">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Verified equipment with closed-loop doorstep inspection.</span>
              </div>

              {/* Buttons */}
              <div className="space-y-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center text-sm font-bold shadow-md"
                  onClick={handleCheckoutClick}
                  disabled={hasUnavailableItems}
                  rightIcon={<ArrowRight size={16} />}
                >
                  Proceed to Checkout (₹{pricing.totalAmount.toLocaleString('en-IN')})
                </Button>

                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <button
                    onClick={clearCart}
                    className="text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    Clear cart
                  </button>
                  <button
                    onClick={closeCart}
                    className="text-primary hover:underline font-semibold"
                  >
                    Continue shopping
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
