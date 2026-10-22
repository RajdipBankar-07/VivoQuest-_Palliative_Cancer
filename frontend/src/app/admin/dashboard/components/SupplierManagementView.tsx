'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  X,
  RefreshCw,
  Receipt,
  Package,
  Layers,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { adminApi, productsApi } from '@/lib/api';

export function SupplierManagementView() {
  const [subTab, setSubTab] = useState<'suppliers' | 'purchase_orders'>('suppliers');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [suppliersPagination, setSuppliersPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [supplierStatusFilter, setSupplierStatusFilter] = useState('all');
  const [supplierSourcingFilter, setSupplierSourcingFilter] = useState('all');
  const [supplierSearch, setSupplierSearch] = useState('');

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [poPagination, setPoPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [poDeliveryFilter, setPoDeliveryFilter] = useState('all');
  const [poPaymentFilter, setPoPaymentFilter] = useState('all');

  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411038',
    gstin: '',
    pan: '',
    bankDetails: {
      accountName: '',
      accountNumber: '',
      ifsc: '',
      bankName: 'HDFC Bank',
    },
    sourcingType: 'own_stock' as 'own_stock' | 'supplier_direct' | 'hybrid',
  });

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedSupplierForVerify, setSelectedSupplierForVerify] = useState<any>(null);
  const [verifyStatus, setVerifyStatus] = useState<'verified' | 'rejected'>('verified');
  const [verifyNotes, setVerifyNotes] = useState('');

  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [newPOForm, setNewPOForm] = useState({
    supplierId: '',
    productId: '',
    quantity: 10,
    procurementCostPerUnit: 0,
    notes: '',
    paymentDueDate: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (subTab === 'suppliers') {
        const res = await adminApi.getSuppliers({
          status: supplierStatusFilter,
          sourcingType: supplierSourcingFilter,
          search: supplierSearch.trim() || undefined,
          page: suppliersPagination.page,
          limit: 10,
        });
        setSuppliers(res.data);
        setSuppliersPagination(res.pagination);
      } else {
        const res = await adminApi.getPurchaseOrders({
          deliveryStatus: poDeliveryFilter,
          paymentStatus: poPaymentFilter,
          page: poPagination.page,
          limit: 10,
        });
        setPurchaseOrders(res.data);
        setPoPagination(res.pagination);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier management data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subTab, supplierStatusFilter, supplierSourcingFilter, poDeliveryFilter, poPaymentFilter]);

  const handleOpenCreatePO = async () => {
    try {
      const prodRes = await productsApi.getProducts({ limit: 50 });
      const products = prodRes.data || [];
      setProductsList(products);
      if (suppliers.length > 0) {
        setNewPOForm((prev) => ({
          ...prev,
          supplierId: suppliers[0].id || suppliers[0]._id,
          productId: products?.[0]?._id || products?.[0]?.id || '',
          procurementCostPerUnit: products?.[0]?.procurementCost || 1500,
        }));
      }
      setShowCreatePOModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load product catalog for purchase order');
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.onboardSupplier(onboardForm);
      setSuccessMsg(`Supplier "${onboardForm.name}" onboarded successfully in pending review state.`);
      setShowOnboardModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to onboard supplier');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForVerify) return;
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.verifySupplier(selectedSupplierForVerify.id || selectedSupplierForVerify._id, {
        status: verifyStatus,
        notes: verifyNotes,
      });
      setSuccessMsg(`Supplier verification updated to ${verifyStatus}.`);
      setShowVerifyModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update supplier verification');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.createPurchaseOrder({
        supplierId: newPOForm.supplierId,
        items: [
          {
            productId: newPOForm.productId,
            quantity: Number(newPOForm.quantity),
            procurementCostPerUnit: Number(newPOForm.procurementCostPerUnit),
          },
        ],
        notes: newPOForm.notes,
        paymentDueDate: newPOForm.paymentDueDate || undefined,
      });
      setSuccessMsg('Supplier purchase order placed successfully.');
      setShowCreatePOModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePOStatus = async (poId: string, deliveryStatus: any, paymentStatus?: any) => {
    setActionLoading(true);
    setError(null);
    try {
      await adminApi.updatePurchaseOrderStatus(poId, {
        deliveryStatus,
        paymentStatus,
      });
      setSuccessMsg(`Purchase order status updated. Product inventory adjusted.`);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X size={14} /></button>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSubTab('suppliers')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                subTab === 'suppliers' ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Registered Suppliers
            </button>
            <button
              onClick={() => setSubTab('purchase_orders')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                subTab === 'purchase_orders' ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Procurement Purchase Orders
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {subTab === 'suppliers' ? (
            <button
              onClick={() => setShowOnboardModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus size={14} />
              <span>Onboard New Supplier</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreatePO}
              className="flex items-center gap-2 px-4 py-2 bg-navy hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Receipt size={14} />
              <span>Create Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {subTab === 'suppliers' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by vendor name, code, GSTIN, or city..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="bg-transparent text-xs w-full focus:outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={supplierStatusFilter}
                onChange={(e) => setSupplierStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="pending_review">Pending Review</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={supplierSourcingFilter}
                onChange={(e) => setSupplierSourcingFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="all">All Sourcing Types</option>
                <option value="own_stock">Own Stock</option>
                <option value="supplier_direct">Supplier Direct</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Supplier Code & Name</th>
                  <th className="py-3 px-5">Contact Details</th>
                  <th className="py-3 px-5">GSTIN / PAN</th>
                  <th className="py-3 px-5">Sourcing Model</th>
                  <th className="py-3 px-5">Verification</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No suppliers found matching current filters.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id || s._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        <div className="text-[11px] font-mono text-teal-700">{s.supplierCode}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-medium text-slate-800">{s.contactPerson}</div>
                        <div className="text-[11px] text-slate-500">{s.phone} • {s.city}</div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px]">
                        <div>{s.gstin}</div>
                        <div className="text-slate-400">{s.pan}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.sourcingType === 'supplier_direct'
                            ? 'bg-purple-100 text-purple-800'
                            : s.sourcingType === 'hybrid'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {s.sourcingType === 'supplier_direct' ? 'Supplier Direct' : s.sourcingType === 'hybrid' ? 'Hybrid' : 'Own Stock'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          s.verificationStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.verificationStatus === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {s.verificationStatus === 'verified' && <CheckCircle2 size={12} />}
                          {s.verificationStatus === 'pending_review' && <Clock size={12} />}
                          {s.verificationStatus === 'rejected' && <AlertTriangle size={12} />}
                          <span>{s.verificationStatus === 'pending_review' ? 'Pending Review' : s.verificationStatus}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => {
                            setSelectedSupplierForVerify(s);
                            setVerifyStatus(s.verificationStatus === 'verified' ? 'verified' : 'verified');
                            setVerifyNotes(s.verificationNotes || '');
                            setShowVerifyModal(true);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                        >
                          Review Verification
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* PO Table */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700">Medical Equipment Procurement Orders</span>
            <div className="flex items-center gap-2">
              <select
                value={poDeliveryFilter}
                onChange={(e) => setPoDeliveryFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
              >
                <option value="all">All Delivery States</option>
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={poPaymentFilter}
                onChange={(e) => setPoPaymentFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
              >
                <option value="all">All Payment States</option>
                <option value="pending">Pending</option>
                <option value="settled">Settled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">PO Number</th>
                  <th className="py-3 px-5">Supplier</th>
                  <th className="py-3 px-5">Items & Quantity</th>
                  <th className="py-3 px-5 text-right">Procurement Cost</th>
                  <th className="py-3 px-5">Delivery Status</th>
                  <th className="py-3 px-5">Settlement</th>
                  <th className="py-3 px-5 text-right">Fulfillment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No purchase orders recorded.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id || po._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900">{po.poNumber}</td>
                      <td className="py-3.5 px-5 font-medium text-slate-800">{po.supplierName}</td>
                      <td className="py-3.5 px-5">
                        {po.items?.map((it: any, idx: number) => (
                          <div key={idx} className="text-[11px]">
                            {it.quantity}x {it.title} (@ ₹{it.procurementCostPerUnit})
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-slate-900">
                        ₹{po.totalProcurementCost?.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          po.deliveryStatus === 'received'
                            ? 'bg-emerald-100 text-emerald-800'
                            : po.deliveryStatus === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {po.deliveryStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          po.paymentStatus === 'settled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {po.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {po.deliveryStatus !== 'received' && po.deliveryStatus !== 'cancelled' ? (
                          <button
                            onClick={() => handleUpdatePOStatus(po.id || po._id, 'received', 'settled')}
                            disabled={actionLoading}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                          >
                            Mark Received & Restock
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onboard Supplier Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Onboard Medical Equipment Supplier</h3>
              <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.name}
                    onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="e.g. Apex Health Devices Pvt Ltd"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.contactPerson}
                    onChange={(e) => setOnboardForm({ ...onboardForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="e.g. Suresh Patil"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="10-digit mobile"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="orders@vendor.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">GSTIN *</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.gstin}
                    onChange={(e) => setOnboardForm({ ...onboardForm, gstin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                    placeholder="27AABC..."
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">PAN *</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.pan}
                    onChange={(e) => setOnboardForm({ ...onboardForm, pan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                    placeholder="AABCP..."
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sourcing Model</label>
                  <select
                    value={onboardForm.sourcingType}
                    onChange={(e) => setOnboardForm({ ...onboardForm, sourcingType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="own_stock">Own Stock Depot</option>
                    <option value="supplier_direct">Supplier Direct Fulfillment</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Address *</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.address}
                    onChange={(e) => setOnboardForm({ ...onboardForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="MIDC Industrial Estate"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">City / Pincode</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={onboardForm.city}
                      onChange={(e) => setOnboardForm({ ...onboardForm, city: e.target.value })}
                      className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      required
                      value={onboardForm.pincode}
                      onChange={(e) => setOnboardForm({ ...onboardForm, pincode: e.target.value })}
                      className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-800">Bank Settlement Details</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Account Name"
                    value={onboardForm.bankDetails.accountName}
                    onChange={(e) =>
                      setOnboardForm({
                        ...onboardForm,
                        bankDetails: { ...onboardForm.bankDetails, accountName: e.target.value },
                      })
                    }
                    className="px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Account Number"
                    value={onboardForm.bankDetails.accountNumber}
                    onChange={(e) =>
                      setOnboardForm({
                        ...onboardForm,
                        bankDetails: { ...onboardForm.bankDetails, accountNumber: e.target.value },
                      })
                    }
                    className="px-2.5 py-1.5 border border-slate-200 rounded text-xs font-mono"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Bank Name"
                    value={onboardForm.bankDetails.bankName}
                    onChange={(e) =>
                      setOnboardForm({
                        ...onboardForm,
                        bankDetails: { ...onboardForm.bankDetails, bankName: e.target.value },
                      })
                    }
                    className="px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="IFSC Code"
                    value={onboardForm.bankDetails.ifsc}
                    onChange={(e) =>
                      setOnboardForm({
                        ...onboardForm,
                        bankDetails: { ...onboardForm.bankDetails, ifsc: e.target.value },
                      })
                    }
                    className="px-2.5 py-1.5 border border-slate-200 rounded text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-sm"
                >
                  {actionLoading ? 'Saving...' : 'Submit Supplier for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Supplier Modal */}
      {showVerifyModal && selectedSupplierForVerify && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Review Verification: {selectedSupplierForVerify.name}
            </h3>
            <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Verification Decision</label>
                <select
                  value={verifyStatus}
                  onChange={(e) => setVerifyStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="verified">Approve & Verify Supplier</option>
                  <option value="rejected">Reject Supplier Application</option>
                  <option value="pending_review">Keep in Pending Review</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Review Notes & Audit Evidence</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record CDSCO license verification, GST portal check, or reasons for rejection..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-navy text-white rounded-xl font-semibold shadow-sm"
                >
                  {actionLoading ? 'Saving...' : 'Commit Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {showCreatePOModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Create Equipment Purchase Order</h3>
              <button onClick={() => setShowCreatePOModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreatePOSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Supplier *</label>
                <select
                  value={newPOForm.supplierId}
                  onChange={(e) => setNewPOForm({ ...newPOForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  {suppliers.map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name} ({s.supplierCode}) - {s.verificationStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Medical Equipment Product *</label>
                <select
                  value={newPOForm.productId}
                  onChange={(e) => {
                    const sel = productsList.find((p) => (p.id || p._id) === e.target.value);
                    setNewPOForm({
                      ...newPOForm,
                      productId: e.target.value,
                      procurementCostPerUnit: sel?.procurementCost || 1500,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  {productsList.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.title} ({p.sku}) - Retail: ₹{p.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Quantity (Units) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPOForm.quantity}
                    onChange={(e) => setNewPOForm({ ...newPOForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Procurement Cost/Unit (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newPOForm.procurementCostPerUnit}
                    onChange={(e) => setNewPOForm({ ...newPOForm, procurementCostPerUnit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex justify-between font-bold">
                <span>Total PO Procurement Liability:</span>
                <span>₹{(newPOForm.quantity * newPOForm.procurementCostPerUnit).toLocaleString()}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">PO Notes / Batch Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Pune depot replenishment, inspection on arrival"
                  value={newPOForm.notes}
                  onChange={(e) => setNewPOForm({ ...newPOForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePOModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-navy text-white rounded-xl font-semibold shadow-sm"
                >
                  {actionLoading ? 'Issuing...' : 'Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
