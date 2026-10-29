'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Boxes,
  PackageCheck,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  Building2,
  Phone,
  MapPin,
  ExternalLink,
  RefreshCw,
  LogOut,
  X,
  FileText,
  Camera,
  Check,
  ChevronRight,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Eye,
  CheckSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { adminApi, operationsApi } from '@/lib/api';

export function OperationsGovernanceView() {
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'orders' | 'maintenance' | 'metrics'>('metrics');

  // Metrics
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Employees
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState('all');
  const [createEmployeeModalOpen, setCreateEmployeeModalOpen] = useState(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    role: 'operations_manager',
    department: 'Operations',
    assignedDepot: 'Central Pune Depot',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Maintenance
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const notifyError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 6000);
  };

  // Load Metrics
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await operationsApi.getMetrics();
      if (res && res.data) {
        setMetrics(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load operations metrics:', err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Load Employees
  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const res = await adminApi.getEmployees({
        role: employeeRoleFilter,
        search: employeeSearch,
        limit: 50,
      });
      if (res && res.data) {
        setEmployees(res.data);
      }
    } catch (err: any) {
      notifyError(err.message || 'Failed to load employees');
    } finally {
      setEmployeesLoading(false);
    }
  }, [employeeRoleFilter, employeeSearch]);

  // Load Orders
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await operationsApi.getOrders({
        status: orderStatusFilter,
        search: orderSearch,
        limit: 50,
      });
      if (res && res.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      notifyError(err.message || 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, [orderStatusFilter, orderSearch]);

  // Load Maintenance
  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res = await operationsApi.getMaintenanceRequests({ limit: 50 });
      if (res && res.data) {
        setTickets(res.data);
      }
    } catch (err: any) {
      notifyError(err.message || 'Failed to load maintenance tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchEmployees();
    fetchOrders();
    fetchTickets();
  }, [fetchMetrics, fetchEmployees, fetchOrders, fetchTickets]);

  // Toggle Employee Status
  const handleToggleEmployeeStatus = async (employeeId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await adminApi.updateEmployeeStatus(employeeId, nextStatus);
      notifySuccess(`Employee status updated to '${nextStatus}'`);
      fetchEmployees();
    } catch (err: any) {
      notifyError(err.message || 'Failed to update employee status');
    }
  };

  // Create Employee Submit
  const handleCreateEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      await adminApi.createEmployee(newEmployeeForm);
      notifySuccess(`Employee account created for ${newEmployeeForm.fullName}`);
      setCreateEmployeeModalOpen(false);
      setNewEmployeeForm({
        fullName: '',
        phone: '',
        email: '',
        password: '',
        role: 'operations_manager',
        department: 'Operations',
        assignedDepot: 'Central Pune Depot',
      });
      fetchEmployees();
    } catch (err: any) {
      notifyError(err.message || 'Failed to create employee account');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header & Sub-Tabs */}
      <div className="bg-white rounded-3xl p-6 border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
              Operations &amp; Delivery Management
            </span>
          </div>
          <h2 className="text-xl font-black text-navy mt-1">Sales, Product &amp; Delivery Operations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin oversight: Manage operations employee accounts, monitor dispatch milestones, track maintenance tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/operations/dashboard"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Truck size={14} />
            <span>Open Operations Portal</span>
            <ExternalLink size={12} />
          </a>

          <button
            onClick={() => {
              fetchMetrics();
              fetchEmployees();
              fetchOrders();
              fetchTickets();
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Refresh Operations"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveSubTab('metrics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'metrics'
              ? 'bg-navy text-white shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-border'
          }`}
        >
          Overview &amp; Metrics
        </button>

        <button
          onClick={() => setActiveSubTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'employees'
              ? 'bg-navy text-white shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-border'
          }`}
        >
          Employee Accounts ({employees.length})
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'orders'
              ? 'bg-navy text-white shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-border'
          }`}
        >
          Delivery Pipeline ({orders.length})
        </button>

        <button
          onClick={() => setActiveSubTab('maintenance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'maintenance'
              ? 'bg-navy text-white shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-border'
          }`}
        >
          Maintenance Tickets ({tickets.length})
        </button>
      </div>

      {/* SUB-TAB 1: METRICS */}
      {activeSubTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">New Orders</span>
              <div className="text-2xl font-black text-navy">{metrics?.newOrders ?? 0}</div>
              <div className="text-[10px] text-blue-600 mt-1 font-semibold">Requires Action</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Awaiting Dispatch</span>
              <div className="text-2xl font-black text-navy">{metrics?.awaitingDispatch ?? 0}</div>
              <div className="text-[10px] text-amber-600 mt-1 font-semibold">Staged in Depot</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Scheduled Today</span>
              <div className="text-2xl font-black text-navy">{metrics?.scheduledToday ?? 0}</div>
              <div className="text-[10px] text-teal-600 mt-1 font-semibold">Today&apos;s Deliveries</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">In Transit</span>
              <div className="text-2xl font-black text-navy">{metrics?.inTransit ?? 0}</div>
              <div className="text-[10px] text-cyan-600 mt-1 font-semibold">Active Road Shipments</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Delivered</span>
              <div className="text-2xl font-black text-emerald-600">{metrics?.delivered ?? 0}</div>
              <div className="text-[10px] text-emerald-600 mt-1 font-semibold">Successful Drops</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Failed / Delayed</span>
              <div className="text-2xl font-black text-rose-600">{metrics?.delayedOrFailed ?? 0}</div>
              <div className="text-[10px] text-rose-600 mt-1 font-semibold">Reschedule Urgent</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Installations Pending</span>
              <div className="text-2xl font-black text-purple-700">{metrics?.installationsPending ?? 0}</div>
              <div className="text-[10px] text-purple-600 mt-1 font-semibold">Setup Specialists</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Maintenance Requests</span>
              <div className="text-2xl font-black text-amber-600">{metrics?.maintenancePending ?? 0}</div>
              <div className="text-[10px] text-amber-600 mt-1 font-semibold">Biomedical Open</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Supplier Orders Pending</span>
              <div className="text-2xl font-black text-indigo-700">{metrics?.supplierOrdersPending ?? 0}</div>
              <div className="text-[10px] text-indigo-600 mt-1 font-semibold">Marketplace Confirm</div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EMPLOYEE ACCOUNTS */}
      {activeSubTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search employee by name, phone, email..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-border text-xs text-navy focus:outline-none"
                />
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              </div>

              <select
                value={employeeRoleFilter}
                onChange={(e) => setEmployeeRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-border text-xs text-slate-700 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="operations_manager">Operations Manager</option>
                <option value="delivery_staff">Delivery Staff</option>
                <option value="sales_manager">Sales Manager</option>
                <option value="maintenance_staff">Maintenance Staff</option>
              </select>
            </div>

            <button
              onClick={() => setCreateEmployeeModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-light text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Create Employee Account</span>
            </button>
          </div>

          {employeesLoading ? (
            <div className="py-16 text-center text-slate-500 text-xs">Loading employees...</div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs bg-white rounded-2xl border border-border">
              No employee accounts found.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Employee ID &amp; Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Department &amp; Depot</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => (
                    <tr key={emp.id || emp._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy">{emp.fullName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{emp.employeeId || 'EMP-OPS'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {emp.role?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs">{emp.phone}</div>
                        {emp.email && <div className="text-[10px] text-slate-400">{emp.email}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div>{emp.department || 'Operations'}</div>
                        <div className="text-[10px] text-slate-400">{emp.assignedDepot || 'Central Hub'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            emp.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleEmployeeStatus(emp.id || emp._id, emp.status)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                            emp.status === 'active'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {emp.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: ORDERS & DELIVERIES */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-border">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Patient / City</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id || o._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-navy">{o.orderNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-navy">{o.patientName}</div>
                      <div className="text-[10px] text-slate-400">{o.deliveryAddress?.city}</div>
                    </td>
                    <td className="py-3 px-4">
                      {o.items?.map((it: any) => `${it.title} (x${it.quantity})`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-teal-700 font-medium">
                      {o.deliveryAssignment?.assignedStaffName || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        {o.orderStatus?.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MAINTENANCE TICKETS */}
      {activeSubTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-border">
                <tr>
                  <th className="py-3 px-4">Ticket #</th>
                  <th className="py-3 px-4">Product SKU</th>
                  <th className="py-3 px-4">Reported Issue</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((t) => (
                  <tr key={t.id || t._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-navy">{t.ticketNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-navy">{t.productTitle}</div>
                      <div className="text-[10px] font-mono text-slate-400">{t.productSku}</div>
                    </td>
                    <td className="py-3 px-4">{t.reportedIssue}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold">{t.urgency}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE EMPLOYEE MODAL */}
      {createEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-border">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <h3 className="text-lg font-bold text-navy">Create Employee Account</h3>
              <button
                onClick={() => setCreateEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployeeSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newEmployeeForm.fullName}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, fullName: e.target.value })}
                  required
                  placeholder="e.g. Ramesh Patil"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-xs text-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone (10 digits) *</label>
                <input
                  type="tel"
                  value={newEmployeeForm.phone}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, phone: e.target.value })}
                  required
                  placeholder="e.g. 9899110050"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-xs text-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmployeeForm.email}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })}
                  placeholder="e.g. ramesh.p@vivoquest.in"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-xs text-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  value={newEmployeeForm.password}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, password: e.target.value })}
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-xs text-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Role *</label>
                <select
                  value={newEmployeeForm.role}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-border text-xs text-navy focus:outline-none"
                >
                  <option value="operations_manager">Operations Manager</option>
                  <option value="delivery_staff">Delivery Specialist</option>
                  <option value="sales_manager">Sales Manager</option>
                  <option value="maintenance_staff">Biomedical Maintenance Staff</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-xl bg-navy hover:bg-navy-light text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

