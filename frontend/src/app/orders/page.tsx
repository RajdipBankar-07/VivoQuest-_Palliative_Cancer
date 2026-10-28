'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  Search,
  Filter,
  Wrench,
  CreditCard,
  Building2,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { productsApi } from '@/lib/api';

export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await productsApi.getMyOrders();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve order history. Please ensure you are signed in.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === 'all' || order.orderStatus === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items?.some((i: any) => i.title?.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'placed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Order Placed
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            Confirmed
          </span>
        );
      case 'dispatched':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Dispatched
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Out for Delivery
          </span>
        );
      case 'delivered':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Delivered
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string, method: string) => {
    if (status === 'paid') {
      return (
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          Paid Online
        </span>
      );
    }
    if (status === 'cod') {
      return (
        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          Cash on Delivery
        </span>
      );
    }
    return (
      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
        Payment Pending
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 pb-16 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                My Medical Equipment Orders
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Track deliveries, technician calibration schedules, and order histories.
              </p>
            </div>

            <Button href="/products" variant="primary" size="md" leftIcon={<ShoppingBag size={16} />}>
              Order More Equipment
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-border p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search by order # or product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border outline-none focus:border-primary"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
              {['all', 'placed', 'confirmed', 'dispatched', 'delivered', 'cancelled'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors ${
                    statusFilter === tab
                      ? 'bg-navy text-white shadow-xs'
                      : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-border p-6 animate-pulse space-y-3">
                  <div className="w-1/3 h-5 bg-slate-200 rounded" />
                  <div className="w-1/2 h-4 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-md mx-auto my-12">
              <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-navy mb-1">Unable to Load Orders</h3>
              <p className="text-xs text-muted-foreground mb-4">{error}</p>
              <Button variant="primary" size="sm" onClick={fetchOrders} leftIcon={<RefreshCw size={14} />}>
                Retry
              </Button>
            </div>
          )}

          {/* Empty Orders */}
          {!isLoading && !error && filteredOrders.length === 0 && (
            <div className="bg-white rounded-2xl border border-border p-12 text-center max-w-md mx-auto my-12 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <Package size={28} />
              </div>
              <h3 className="text-base font-bold text-navy mb-1">No Orders Found</h3>
              <p className="text-xs text-muted-foreground mb-6">
                {orders.length === 0
                  ? "You haven't placed any medical product or equipment orders yet."
                  : 'No orders match your selected filters.'}
              </p>
              <Button href="/products" variant="primary" size="md">
                Browse Medical Catalog
              </Button>
            </div>
          )}

          {/* Orders List */}
          {!isLoading && !error && filteredOrders.length > 0 && (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const requiresSetup = order.clinicalSetup?.isSetupRequired;

                return (
                  <div
                    key={order.orderNumber}
                    className="bg-white rounded-2xl border border-border p-5 hover:border-primary/40 hover:shadow-md transition-all space-y-4"
                  >
                    {/* Order Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                          <Package size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-navy text-sm">
                              {order.orderNumber}
                            </span>
                            {getStatusBadge(order.orderStatus)}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Right metadata */}
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <div className="text-base font-extrabold text-navy">
                            ₹{order.pricing?.totalAmount?.toLocaleString('en-IN')}
                          </div>
                          <div>{getPaymentBadge(order.paymentStatus, order.paymentMethod)}</div>
                        </div>

                        <Button
                          href={`/orders/${order.orderNumber}`}
                          variant="outline"
                          size="sm"
                          rightIcon={<ArrowRight size={14} />}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>

                    {/* Items Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center text-slate-400 shrink-0 font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-navy line-clamp-1">{item.title}</p>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                              <span>Qty: {item.quantity}</span>
                              <span>•</span>
                              <span className={item.isRental ? 'text-primary font-semibold' : ''}>
                                {item.isRental ? `Rental (${item.rentalDurationMonths} mo)` : 'Purchase'}
                              </span>
                              {item.setupRequired && (
                                <>
                                  <span>•</span>
                                  <span className="text-purple-700 font-semibold flex items-center gap-0.5">
                                    <Wrench size={10} /> Setup
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="font-bold text-navy">
                            ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Info Bar */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 border-t border-slate-50 gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Truck size={13} className="text-secondary" />
                          Delivery to {order.deliveryAddress?.city} ({order.deliveryAddress?.pincode})
                        </span>

                        {order.estimatedDeliveryDate && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Calendar size={12} className="text-emerald-600" />
                            Est. Delivery: {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}

                        {requiresSetup && (
                          <span className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold">
                            <Wrench size={13} />
                            Setup: {order.clinicalSetup?.setupStatus?.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/orders/${order.orderNumber}`}
                        className="font-bold text-primary hover:underline text-[11px]"
                      >
                        Track Shipment &amp; Setup Status &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
