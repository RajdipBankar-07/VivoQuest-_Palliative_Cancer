'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  FileText,
  Activity,
  Wrench,
  QrCode,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ChevronRight,
  X,
  Stethoscope,
  HeartPulse,
  Thermometer,
  Calendar,
  AlertCircle,
  Truck,
  ArrowLeft,
  Building2,
  Info,
  Wifi,
  WifiOff,
  Database,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/Button';
import { fieldVisitsApi, authApi, ApiClientError } from '@/lib/api';
import {
  enqueueOfflineOperation,
  getPendingOperations,
  getAllQueueOperations,
  syncOfflineQueue,
  cacheVisitsOffline,
  getCachedVisitsOffline,
  updateCachedVisitLocally,
  clearAllOfflineData,
  generateOperationId,
  OfflineOperation,
} from '@/lib/offlineSync';

type TabView = 'today' | 'upcoming' | 'completed' | 'installation' | 'exceptions';

export default function ClinicianFieldVisitsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabView>('today');
  const [visits, setVisits] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Offline Operations & Connectivity State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOps, setPendingOps] = useState<OfflineOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [syncConflictAlert, setSyncConflictAlert] = useState<any | null>(null);

  // Active Modals
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Clinical Documentation Form State
  const [vitalsBP, setVitalsBP] = useState('120/80 mmHg');
  const [vitalsPulse, setVitalsPulse] = useState<number | ''>(76);
  const [vitalsSpO2, setVitalsSpO2] = useState<number | ''>(98);
  const [vitalsTemp, setVitalsTemp] = useState('98.6 F');
  const [vitalsResp, setVitalsResp] = useState<number | ''>(16);
  const [docNotes, setDocNotes] = useState('');
  const [proceduresPerformed, setProceduresPerformed] = useState('Wound inspection, dressing change, vitals logged');
  const [medicationsAdministered, setMedicationsAdministered] = useState('');
  const [recommendations, setRecommendations] = useState('Maintain current analgesic schedule. Keep dressing dry.');
  const [followUpDate, setFollowUpDate] = useState('');
  const [markAsCompleted, setMarkAsCompleted] = useState(true);

  // Equipment Installation Verification Form State
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [barcodeScanVerified, setBarcodeScanVerified] = useState(false);
  const [barcodeRawData, setBarcodeRawData] = useState('');
  const [patientAcknowledged, setPatientAcknowledged] = useState(true);
  const [caregiverName, setCaregiverName] = useState('');
  const [consentObtained, setConsentObtained] = useState(true);
  const [evidenceNotes, setEvidenceNotes] = useState('Electrical socket grounded. Device calibrated to physician prescription.');
  const [installNotes, setInstallNotes] = useState('Equipment functional tested and caregiver instructed on daily maintenance.');
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);

  // Exception Form State
  const [exceptionType, setExceptionType] = useState('patient_unavailable');
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');

  // Refresh offline queue state from IndexedDB
  const refreshQueueState = async () => {
    try {
      const ops = await getAllQueueOperations();
      setPendingOps(ops);
    } catch (err) {
      console.warn('[OfflineSync] Could not load offline queue:', err);
    }
  };

  // Synchronize pending offline queue with backend
  const handleSyncNow = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Cannot synchronize while offline. Please connect to internet first.');
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await syncOfflineQueue();
      await refreshQueueState();

      if (res.applied > 0) {
        setSuccessMsg(`Successfully synchronized ${res.applied} offline operation(s) with cloud server!`);
      }
      if (res.conflicts > 0) {
        const conflict = res.results.find((r: any) => r.status === 'conflict');
        setSyncConflictAlert(conflict);
        setError(`${res.conflicts} operation(s) encountered server state conflicts. Server record has diverged.`);
      }
      if (res.failed > 0) {
        setError(`${res.failed} operation(s) failed during sync. Review offline queue for details.`);
      }

      await loadVisits();
    } catch (err: any) {
      setError(err.message || 'Error occurred during offline queue sync');
    } finally {
      setIsSyncing(false);
    }
  };

  // Purge local cache and queue (for logout or device handoff)
  const handlePurgeLocalData = async () => {
    if (window.confirm('Are you sure you want to scrub all offline cached patient records and queued operations from this device?')) {
      await clearAllOfflineData();
      await refreshQueueState();
      setSuccessMsg('Local device storage scrubbed successfully.');
    }
  };

  // Connectivity and Service Worker Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        setSuccessMsg('Internet connection restored. Automatically syncing offline queue...');
        handleSyncNow();
      };

      const handleOffline = () => {
        setIsOnline(false);
        setError('Internet disconnected. Switched to Secure Offline Mode (IndexedDB active).');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('[ServiceWorker] Registration notice:', err);
        });
      }

      refreshQueueState();

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Load visits (with offline fallback and cache warming)
  const loadVisits = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = authApi.getStoredUser();
      const token = authApi.getToken();
      if (!token || !user || !['professional', 'doctor', 'nurse', 'caregiver', 'admin', 'super_admin'].includes(user.role)) {
        setIsLoading(false);
        router.push('/sign-in');
        return;
      }
      setCurrentUser(user);

      let dateFilter: string | undefined = undefined;
      let statusFilter: string | undefined = undefined;

      if (activeTab === 'today') {
        dateFilter = 'today';
      } else if (activeTab === 'upcoming') {
        dateFilter = 'upcoming';
      } else if (activeTab === 'completed') {
        dateFilter = 'completed';
      } else if (activeTab === 'exceptions') {
        statusFilter = 'failed';
      }

      // Check if offline: load from IndexedDB cache
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = await getCachedVisitsOffline();
        if (cached.length > 0) {
          let filtered = cached;
          if (activeTab === 'installation') {
            filtered = filtered.filter((v: any) => v.visitType === 'equipment_installation');
          } else if (activeTab === 'exceptions') {
            filtered = filtered.filter((v: any) => v.status === 'failed');
          } else if (activeTab === 'completed') {
            filtered = filtered.filter((v: any) => v.status === 'completed');
          }
          setVisits(filtered);
          setIsLoading(false);
          return;
        }
      }

      const res = await fieldVisitsApi.getMyFieldVisits({
        date: dateFilter,
        status: statusFilter,
        search: searchQuery.trim() || undefined,
        page: pagination.page,
        limit: 20,
      });

      let loadedVisits = res.data;
      if (activeTab === 'installation') {
        loadedVisits = loadedVisits.filter((v: any) => v.visitType === 'equipment_installation');
      }

      setVisits(loadedVisits);
      setPagination(res.pagination);

      // Cache fresh visits into IndexedDB for offline resilience
      await cacheVisitsOffline(loadedVisits);
    } catch (err: any) {
      console.warn('Network fetch error, checking offline cache:', err.message);
      const cached = await getCachedVisitsOffline();
      if (cached.length > 0) {
        setVisits(cached);
        setError('Operating in Offline Mode: displaying encrypted local itinerary from IndexedDB.');
      } else {
        setError(err.message || 'Unable to retrieve assigned field visits');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [activeTab]);

  // Status transition handler (offline-aware)
  const handleAdvanceStatus = async (visit: any, newStatus: string) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    // If disconnected, immediately queue into IndexedDB
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const opId = generateOperationId('SYNC-STAT');
        await enqueueOfflineOperation({
          clientOperationId: opId,
          visitId: visit._id || visit.id,
          visitNumber: visit.visitNumber,
          operationType: 'status_update',
          clientTimestamp: new Date().toISOString(),
          expectedStatus: visit.status,
          payload: {
            status: newStatus,
            location: newStatus === 'en_route' ? `${visit.patientDetails?.city || 'Pune'} In-Transit` : undefined,
          },
        });
        await updateCachedVisitLocally(visit._id || visit.id, { status: newStatus });
        setVisits((prev) =>
          prev.map((v) =>
            (v._id === visit._id || v.id === visit.id) ? { ...v, status: newStatus, isPendingSync: true } : v
          )
        );
        setSuccessMsg(`[Offline Mode] Status advanced to '${newStatus}'. Operation queued in device storage.`);
        await refreshQueueState();
      } catch (queueErr: any) {
        setError(`Failed to save offline status update: ${queueErr.message}`);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    try {
      await fieldVisitsApi.updateVisitStatus(visit._id || visit.id, {
        status: newStatus,
        location: newStatus === 'en_route' ? `${visit.patientDetails?.city || 'Pune'} In-Transit` : undefined,
      });
      setSuccessMsg(`Visit ${visit.visitNumber} transitioned to '${newStatus}'`);
      await loadVisits();
    } catch (err: any) {
      // Fallback on network failure
      if (err.code === 'NETWORK_ERROR' || err.message?.includes('Failed to fetch') || err.message?.includes('Unable to connect')) {
        const opId = generateOperationId('SYNC-STAT');
        await enqueueOfflineOperation({
          clientOperationId: opId,
          visitId: visit._id || visit.id,
          visitNumber: visit.visitNumber,
          operationType: 'status_update',
          clientTimestamp: new Date().toISOString(),
          expectedStatus: visit.status,
          payload: {
            status: newStatus,
            location: newStatus === 'en_route' ? `${visit.patientDetails?.city || 'Pune'} In-Transit` : undefined,
          },
        });
        await updateCachedVisitLocally(visit._id || visit.id, { status: newStatus });
        setVisits((prev) =>
          prev.map((v) =>
            (v._id === visit._id || v.id === visit.id) ? { ...v, status: newStatus, isPendingSync: true } : v
          )
        );
        setSuccessMsg(`[Network Error] Operation stored offline. Will sync automatically when connection returns.`);
        await refreshQueueState();
      } else {
        setError(err.message || `Failed to transition visit status to ${newStatus}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Submit clinical documentation (offline-aware)
  const handleSubmitClinicalDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;

    setActionLoading(true);
    setError(null);

    const docPayload = {
      vitals: {
        bloodPressure: vitalsBP,
        pulse: vitalsPulse ? Number(vitalsPulse) : undefined,
        spO2: vitalsSpO2 ? Number(vitalsSpO2) : undefined,
        temperature: vitalsTemp,
        respiratoryRate: vitalsResp ? Number(vitalsResp) : undefined,
      },
      clinicalNotes: docNotes,
      proceduresPerformed: proceduresPerformed.split(',').map((p) => p.trim()).filter(Boolean),
      medicationsAdministered: medicationsAdministered.split(',').map((m) => m.trim()).filter(Boolean),
      recommendations,
      followUpDate: followUpDate || undefined,
      markAsCompleted,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const opId = generateOperationId('SYNC-DOC');
        await enqueueOfflineOperation({
          clientOperationId: opId,
          visitId: selectedVisit._id || selectedVisit.id,
          visitNumber: selectedVisit.visitNumber,
          operationType: 'clinical_documentation',
          clientTimestamp: new Date().toISOString(),
          expectedStatus: selectedVisit.status,
          payload: docPayload,
        });

        const nextStatus = markAsCompleted ? 'completed' : selectedVisit.status;
        await updateCachedVisitLocally(selectedVisit._id || selectedVisit.id, { status: nextStatus });
        setVisits((prev) =>
          prev.map((v) =>
            (v._id === selectedVisit._id || v.id === selectedVisit.id)
              ? { ...v, status: nextStatus, isPendingSync: true }
              : v
          )
        );

        setSuccessMsg(`[Offline Mode] Vitals and documentation queued locally in IndexedDB.`);
        setShowDocModal(false);
        setSelectedVisit(null);
        await refreshQueueState();
      } catch (queueErr: any) {
        setError(`Failed to save documentation offline: ${queueErr.message}`);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    try {
      await fieldVisitsApi.recordClinicalDocumentation(selectedVisit._id || selectedVisit.id, docPayload);
      setSuccessMsg(`Clinical documentation recorded for ${selectedVisit.visitNumber}`);
      setShowDocModal(false);
      setSelectedVisit(null);
      await loadVisits();
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR' || err.message?.includes('Failed to fetch') || err.message?.includes('Unable to connect')) {
        const opId = generateOperationId('SYNC-DOC');
        await enqueueOfflineOperation({
          clientOperationId: opId,
          visitId: selectedVisit._id || selectedVisit.id,
          visitNumber: selectedVisit.visitNumber,
          operationType: 'clinical_documentation',
          clientTimestamp: new Date().toISOString(),
          expectedStatus: selectedVisit.status,
          payload: docPayload,
        });

        const nextStatus = markAsCompleted ? 'completed' : selectedVisit.status;
        await updateCachedVisitLocally(selectedVisit._id || selectedVisit.id, { status: nextStatus });
        setVisits((prev) =>
          prev.map((v) =>
            (v._id === selectedVisit._id || v.id === selectedVisit.id)
              ? { ...v, status: nextStatus, isPendingSync: true }
              : v
          )
        );

        setSuccessMsg(`[Network Error] Documentation preserved in offline queue.`);
        setShowDocModal(false);
        setSelectedVisit(null);
        await refreshQueueState();
      } else {
        setError(err.message || 'Failed to record clinical documentation');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Submit equipment verification (offline-aware)
  const handleSubmitEquipmentVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;

    setActionLoading(true);
    setError(null);

    const installPayload = {
      equipmentItems: equipmentList,
      barcodeScanVerified,
      barcodeRawData: barcodeRawData || undefined,
      patientAcknowledged,
      patientOrCaregiverName: caregiverName || selectedVisit.patientDetails?.fullName || 'Caregiver',
      consentObtained,
      evidenceNotes,
      installationNotes: installNotes,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const opId = generateOperationId('SYNC-DME');
        await enqueueOfflineOperation({
          clientOperationId: opId,
          visitId: selectedVisit._id || selectedVisit.id,
          visitNumber: selectedVisit.visitNumber,
          operationType: 'installation_verification',
          clientTimestamp: new Date().toISOString(),
          expectedStatus: selectedVisit.status,
          payload: installPayload,
        });

        await updateCachedVisitLocally(selectedVisit._id || selectedVisit.id, {
          status: 'completed',
          installationVerification: installPayload,
        });
        setVisits((prev) =>
          prev.map((v) =>
            (v._id === selectedVisit._id || v.id === selectedVisit.id)
              ? { ...v, status: 'completed', isPendingSync: true }
              : v
          )
        );

        setSuccessMsg(`[Offline Mode] Equipment installation verified and saved to device IndexedDB.`);
        setShowInstallModal(false);
        setSelectedVisit(null);
        await refreshQueueState();
      } catch (queueErr: any) {
        setError(`Failed to save equipment verification offline: ${queueErr.message}`);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    try {
      await fieldVisitsApi.verifyEquipmentInstallation(selectedVisit._id || selectedVisit.id, installPayload);
      setSuccessMsg(`Equipment installation and serial numbers verified for ${selectedVisit.visitNumber}`);
      setShowInstallModal(false);
      setSelectedVisit(null);
      await loadVisits();
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR' || err.message?.includes('Failed to fetch') || err.message?.includes('Unable to connect')) {
        const opId = generateOperationId('SYNC-DME');
        await enqueueOfflineOperation({
          clientOperationId: opId,
          visitId: selectedVisit._id || selectedVisit.id,
          visitNumber: selectedVisit.visitNumber,
          operationType: 'installation_verification',
          clientTimestamp: new Date().toISOString(),
          expectedStatus: selectedVisit.status,
          payload: installPayload,
        });

        await updateCachedVisitLocally(selectedVisit._id || selectedVisit.id, {
          status: 'completed',
          installationVerification: installPayload,
        });
        setVisits((prev) =>
          prev.map((v) =>
            (v._id === selectedVisit._id || v.id === selectedVisit.id)
              ? { ...v, status: 'completed', isPendingSync: true }
              : v
          )
        );

        setSuccessMsg(`[Network Error] Equipment verification preserved offline.`);
        setShowInstallModal(false);
        setSelectedVisit(null);
        await refreshQueueState();
      } else {
        setError(err.message || 'Failed to verify equipment installation');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Submit exception (offline-aware)
  const handleSubmitException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;

    setActionLoading(true);
    setError(null);

    const excPayload = {
      exceptionType,
      reason: exceptionReason,
      notes: exceptionNotes,
      rescheduleDate: rescheduleDate || undefined,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const opId = generateOperationId('SYNC-EXC');
        await enqueueOfflineOperation({
          clientOperationId: opId,
          visitId: selectedVisit._id || selectedVisit.id,
          visitNumber: selectedVisit.visitNumber,
          operationType: 'visit_exception',
          clientTimestamp: new Date().toISOString(),
          expectedStatus: selectedVisit.status,
          payload: excPayload,
        });

        await updateCachedVisitLocally(selectedVisit._id || selectedVisit.id, { status: 'failed' });
        setVisits((prev) =>
          prev.map((v) =>
            (v._id === selectedVisit._id || v.id === selectedVisit.id)
              ? { ...v, status: 'failed', isPendingSync: true }
              : v
          )
        );

        setSuccessMsg(`[Offline Mode] Exception logged and queued in device IndexedDB.`);
        setShowExceptionModal(false);
        setSelectedVisit(null);
        setExceptionReason('');
        setExceptionNotes('');
        await refreshQueueState();
      } catch (queueErr: any) {
        setError(`Failed to save exception offline: ${queueErr.message}`);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    try {
      await fieldVisitsApi.reportVisitException(selectedVisit._id || selectedVisit.id, excPayload);
      setSuccessMsg(`Visit exception recorded for ${selectedVisit.visitNumber}`);
      setShowExceptionModal(false);
      setSelectedVisit(null);
      setExceptionReason('');
      setExceptionNotes('');
      await loadVisits();
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR' || err.message?.includes('Failed to fetch') || err.message?.includes('Unable to connect')) {
        const opId = generateOperationId('SYNC-EXC');
        await enqueueOfflineOperation({
          clientOperationId: opId,
          visitId: selectedVisit._id || selectedVisit.id,
          visitNumber: selectedVisit.visitNumber,
          operationType: 'visit_exception',
          clientTimestamp: new Date().toISOString(),
          expectedStatus: selectedVisit.status,
          payload: excPayload,
        });

        await updateCachedVisitLocally(selectedVisit._id || selectedVisit.id, { status: 'failed' });
        setVisits((prev) =>
          prev.map((v) =>
            (v._id === selectedVisit._id || v.id === selectedVisit.id)
              ? { ...v, status: 'failed', isPendingSync: true }
              : v
          )
        );

        setSuccessMsg(`[Network Error] Exception saved in offline queue.`);
        setShowExceptionModal(false);
        setSelectedVisit(null);
        setExceptionReason('');
        setExceptionNotes('');
        await refreshQueueState();
      } else {
        setError(err.message || 'Failed to report visit exception');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Simulate Barcode / QR Scan
  const triggerSimulatedScanner = (index: number) => {
    setIsSimulatingCamera(true);
    setTimeout(() => {
      const generatedCode = `SN-CALIB-2026-${Math.floor(10000 + Math.random() * 90000)}-X`;
      const updated = [...equipmentList];
      if (updated[index]) {
        updated[index].serialNumber = generatedCode;
        updated[index].checklistPassed = true;
      }
      setEquipmentList(updated);
      setBarcodeScanVerified(true);
      setBarcodeRawData(`QR://MED-DME/${generatedCode}`);
      setIsSimulatingCamera(false);
    }, 1200);
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen flex flex-col font-sans">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-navy text-white py-8 border-b border-navy-light/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href="/doctor/dashboard"
                  className="text-xs text-secondary-light hover:underline flex items-center gap-1"
                >
                  <ArrowLeft size={13} />
                  Back to Doctor Dashboard
                </Link>
                <span className="text-white/30">•</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold">
                  Phase 4 Field Operations &amp; Secure Sync
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Clinician Home Visits &amp; DME Installation Console
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Daily mobile visit itinerary for palliative clinicians, visiting nurses, physiotherapists, and equipment field specialists.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Online / Offline Pill Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  isOnline
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                }`}
              >
                {isOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Online — Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={13} className="text-amber-400" />
                    <span>Offline Mode — Local Storage</span>
                  </>
                )}
              </div>

              {/* Offline Queue Drawer Trigger */}
              <button
                onClick={() => setShowQueueModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
              >
                <Database size={13} className="text-secondary" />
                <span>
                  Queue: {pendingOps.filter((o) => o.syncState !== 'synced').length} pending
                </span>
              </button>

              {/* Sync Now Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleSyncNow}
                disabled={isSyncing || !isOnline}
                className="bg-secondary hover:bg-secondary-dark text-white font-semibold flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </Button>

              <Button
                variant="outline-white"
                size="sm"
                onClick={loadVisits}
                disabled={isLoading || actionLoading}
                className="flex items-center gap-1.5"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* Demonstration Notice & Live GPS Disclaimer */}
          <div className="mt-6 p-3.5 rounded-xl bg-primary-light/20 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Info size={17} className="text-secondary-light shrink-0" />
              <span>
                <strong>Demonstration Navigation Notice:</strong> Travel times and transit coordinates are simulated for demonstration. Live turn-by-turn GPS requires carrier telemetry integration.
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span>Active Professional:</span>
              <span className="font-bold text-white">
                {currentUser?.fullName || 'Sister Varsha Kulkarni, RN'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
              <X size={15} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Sync Conflict Alert Banner */}
        {syncConflictAlert && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Sync Conflict Detected on Visit {syncConflictAlert.visitNumber}</div>
                <p className="text-slate-600 mt-0.5">
                  {syncConflictAlert.conflictDetails?.reason || 'The visit status on the server changed while you were working offline.'}
                  {syncConflictAlert.conflictDetails?.serverStatus && (
                    <span className="ml-1 font-semibold text-navy">
                      (Server status is now: {syncConflictAlert.conflictDetails.serverStatus})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => { setSyncConflictAlert(null); loadVisits(); }}>
                Acknowledge &amp; Refresh
              </Button>
            </div>
          </div>
        )}

        {/* Tab Navigation Navigation Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-1.5 mb-6 flex flex-wrap gap-1.5">
          {[
            { id: 'today', label: "Today's Schedule", icon: Calendar },
            { id: 'upcoming', label: 'Upcoming Itinerary', icon: Clock },
            { id: 'installation', label: 'Equipment Installations', icon: Wrench },
            { id: 'completed', label: 'Completed Visits', icon: CheckCircle2 },
            { id: 'exceptions', label: 'Exceptions & Failed', icon: AlertTriangle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabView)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy hover:bg-slate-100'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-secondary' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Visit Itinerary Cards */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-border">
              <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading assigned clinician visits...</p>
            </div>
          ) : visits.length > 0 ? (
            visits.map((v) => {
              const isInstall = v.visitType === 'equipment_installation';
              const isCompleted = v.status === 'completed';
              const isFailed = v.status === 'failed';
              const isEnRoute = v.status === 'en_route';
              const isArrived = v.status === 'arrived';
              const isInProgress = v.status === 'in_progress';

              return (
                <div
                  key={v._id || v.id}
                  className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:border-primary/40 transition-all space-y-4"
                >
                  {/* Card Header: Visit Number, Status Badge, Scheduled Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-navy text-sm">{v.visitNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                          v.visitType === 'equipment_installation'
                            ? 'bg-amber-100 text-amber-800'
                            : v.visitType === 'nursing_procedure'
                            ? 'bg-blue-100 text-blue-800'
                            : v.visitType === 'physiotherapy'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {v.visitType?.replace('_', ' ')}
                      </span>
                      {v.hospitalName && (
                        <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <Building2 size={12} />
                          {v.hospitalName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" />
                        {v.scheduledDate} ({v.timeSlot})
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[11px] uppercase ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isFailed
                            ? 'bg-rose-100 text-rose-800'
                            : isInProgress
                            ? 'bg-indigo-100 text-indigo-800 animate-pulse'
                            : isArrived
                            ? 'bg-teal-100 text-teal-800'
                            : isEnRoute
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {v.status?.replace('_', ' ')}
                      </span>
                      {v.isPendingSync && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-xs">
                          <Clock size={11} />
                          Pending Sync
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Patient & Location Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-400 uppercase font-semibold">Patient Information</div>
                      <div className="font-bold text-navy text-sm mt-0.5">{v.patientDetails?.fullName}</div>
                      <div className="text-slate-600 mt-0.5 flex items-center gap-1.5">
                        <Phone size={12} className="text-primary" />
                        <a href={`tel:${v.patientDetails?.phone}`} className="hover:underline font-semibold">
                          {v.patientDetails?.phone}
                        </a>
                      </div>
                      {v.patientDetails?.emergencyContact && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Emergency: {v.patientDetails.emergencyContact}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 uppercase font-semibold">Visit Address</div>
                      <div className="text-slate-700 mt-0.5 font-medium flex items-start gap-1">
                        <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                        <span>
                          {v.patientDetails?.address}, {v.patientDetails?.city} - {v.patientDetails?.pincode}
                        </span>
                      </div>
                      {v.patientDetails?.instructions && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-1.5 mt-1 border border-amber-200">
                          <strong>Note:</strong> {v.patientDetails.instructions}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 uppercase font-semibold">Clinical Task Scope</div>
                      <div className="text-slate-700 mt-0.5">
                        Provider: <strong>{v.providerName}</strong> ({v.providerRole})
                      </div>
                      {v.orderNumber && (
                        <div className="text-slate-600 mt-0.5">
                          Linked Order: <strong className="font-mono">{v.orderNumber}</strong>
                        </div>
                      )}
                      {v.timestamps?.completedAt && (
                        <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                          Completed at: {new Date(v.timestamps.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visit Status Stepper */}
                  <div className="pt-2">
                    <div className="grid grid-cols-5 text-center text-[10px] font-semibold text-slate-400 gap-1">
                      <div className={['assigned', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed'].includes(v.status) ? 'text-primary' : ''}>
                        1. Assigned
                      </div>
                      <div className={['accepted', 'en_route', 'arrived', 'in_progress', 'completed'].includes(v.status) ? 'text-primary' : ''}>
                        2. Accepted
                      </div>
                      <div className={['en_route', 'arrived', 'in_progress', 'completed'].includes(v.status) ? 'text-primary' : ''}>
                        3. En Route
                      </div>
                      <div className={['arrived', 'in_progress', 'completed'].includes(v.status) ? 'text-primary' : ''}>
                        4. Arrived
                      </div>
                      <div className={v.status === 'completed' ? 'text-emerald-600' : isInProgress ? 'text-indigo-600' : ''}>
                        5. {isCompleted ? 'Completed' : 'In Progress'}
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{
                          width:
                            v.status === 'completed'
                              ? '100%'
                              : v.status === 'in_progress'
                              ? '80%'
                              : v.status === 'arrived'
                              ? '60%'
                              : v.status === 'en_route'
                              ? '40%'
                              : v.status === 'accepted'
                              ? '20%'
                              : '5%',
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Step: Accept */}
                      {v.status === 'assigned' && (
                        <Button
                          size="sm"
                          onClick={() => handleAdvanceStatus(v, 'accepted')}
                          disabled={actionLoading}
                          className="bg-navy hover:bg-navy-light text-white text-xs"
                        >
                          Accept Visit
                        </Button>
                      )}

                      {/* Step: Start Travel */}
                      {v.status === 'accepted' && (
                        <Button
                          size="sm"
                          onClick={() => handleAdvanceStatus(v, 'en_route')}
                          disabled={actionLoading}
                          leftIcon={<Navigation size={13} />}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                          Start Travel (En Route)
                        </Button>
                      )}

                      {/* Step: Mark Arrived */}
                      {v.status === 'en_route' && (
                        <Button
                          size="sm"
                          onClick={() => handleAdvanceStatus(v, 'arrived')}
                          disabled={actionLoading}
                          leftIcon={<MapPin size={13} />}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
                        >
                          Mark Bedside Arrival
                        </Button>
                      )}

                      {/* Step: Start In-Progress */}
                      {v.status === 'arrived' && (
                        <Button
                          size="sm"
                          onClick={() => handleAdvanceStatus(v, 'in_progress')}
                          disabled={actionLoading}
                          leftIcon={<Activity size={13} />}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                        >
                          Begin Consultation
                        </Button>
                      )}

                      {/* Clinical Documentation Modal Trigger */}
                      {['in_progress', 'completed'].includes(v.status) && !isInstall && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedVisit(v);
                            if (v.clinicalDocumentation?.vitals) {
                              setVitalsBP(v.clinicalDocumentation.vitals.bloodPressure || '120/80 mmHg');
                              setVitalsPulse(v.clinicalDocumentation.vitals.pulse || 76);
                              setVitalsSpO2(v.clinicalDocumentation.vitals.spO2 || 98);
                              setVitalsTemp(v.clinicalDocumentation.vitals.temperature || '98.6 F');
                            }
                            setDocNotes(v.clinicalDocumentation?.clinicalNotes || '');
                            setShowDocModal(true);
                          }}
                          leftIcon={<FileText size={13} />}
                          className="text-xs border-primary/40 text-primary hover:bg-primary-light/10"
                        >
                          {v.clinicalDocumentation?.signedAt ? 'Update Vitals & Notes' : 'Record Vitals & Observations'}
                        </Button>
                      )}

                      {/* Equipment Installation Verification Trigger */}
                      {isInstall && ['arrived', 'in_progress', 'completed'].includes(v.status) && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedVisit(v);
                            setEquipmentList(v.installationVerification?.equipmentItems || [
                              {
                                sku: 'DME-ITEM-01',
                                name: 'Medical Equipment Unit',
                                serialNumber: '',
                                condition: 'functional_tested',
                                checklistPassed: true,
                              },
                            ]);
                            setCaregiverName(v.installationVerification?.patientOrCaregiverName || v.patientDetails?.fullName || '');
                            setShowInstallModal(true);
                          }}
                          leftIcon={<QrCode size={13} />}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                        >
                          {v.installationVerification?.patientAcknowledged ? 'Review Verified Installation' : 'Verify Serial & Setup'}
                        </Button>
                      )}

                      {/* Report Exception */}
                      {!['completed', 'cancelled', 'failed'].includes(v.status) && (
                        <button
                          onClick={() => {
                            setSelectedVisit(v);
                            setShowExceptionModal(true);
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          Report Exception
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedVisit(v);
                        setShowDetailModal(true);
                      }}
                      className="text-xs text-slate-500 hover:text-navy font-semibold flex items-center gap-1"
                    >
                      <span>Full Visit Profile</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-border">
              <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-700">No field visits in this view</p>
              <p className="text-xs text-slate-400 mt-1">
                You have no visits scheduled under &apos;{activeTab}&apos;. Try switching tabs or refreshing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CLINICAL DOCUMENTATION & VITALS */}
      {/* ========================================================================= */}
      {showDocModal && selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-navy text-lg">Bedside Clinical Documentation</h3>
                <p className="text-xs text-slate-500">
                  Visit {selectedVisit.visitNumber} • Patient: {selectedVisit.patientDetails?.fullName}
                </p>
              </div>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitClinicalDoc} className="space-y-4 pt-4 text-xs">
              {/* Vital Signs Grid */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-navy uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <HeartPulse size={14} className="text-rose-500" />
                  Recorded Vital Signs
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Blood Pressure</label>
                    <input
                      type="text"
                      value={vitalsBP}
                      onChange={(e) => setVitalsBP(e.target.value)}
                      placeholder="120/80 mmHg"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Pulse Rate (bpm)</label>
                    <input
                      type="number"
                      value={vitalsPulse}
                      onChange={(e) => setVitalsPulse(e.target.value ? Number(e.target.value) : '')}
                      placeholder="76"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">SpO2 Oxygen (%)</label>
                    <input
                      type="number"
                      value={vitalsSpO2}
                      onChange={(e) => setVitalsSpO2(e.target.value ? Number(e.target.value) : '')}
                      placeholder="98"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Temperature</label>
                    <input
                      type="text"
                      value={vitalsTemp}
                      onChange={(e) => setVitalsTemp(e.target.value)}
                      placeholder="98.6 F"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Resp. Rate (/min)</label>
                    <input
                      type="number"
                      value={vitalsResp}
                      onChange={(e) => setVitalsResp(e.target.value ? Number(e.target.value) : '')}
                      placeholder="16"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Observations */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Observations &amp; Patient Status <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter detailed physical observation, wound condition, pain response, and comfort level..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border focus:border-primary focus:outline-none"
                />
              </div>

              {/* Procedures Performed */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Procedures &amp; Nursing Interventions (comma-separated)
                </label>
                <input
                  type="text"
                  value={proceduresPerformed}
                  onChange={(e) => setProceduresPerformed(e.target.value)}
                  placeholder="e.g. Wound cleaning, dressing replacement, stoma hygiene"
                  className="w-full px-3 py-2 rounded-xl border border-border focus:border-primary focus:outline-none"
                />
              </div>

              {/* Follow Up & Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Recommended Follow-Up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="markCompleted"
                    checked={markAsCompleted}
                    onChange={(e) => setMarkAsCompleted(e.target.checked)}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <label htmlFor="markCompleted" className="font-semibold text-navy cursor-pointer">
                    Sign &amp; Complete Visit Now
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDocModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading || !docNotes.trim()}
                  className="bg-navy hover:bg-navy-light text-white"
                >
                  {actionLoading ? 'Saving...' : 'Sign Documentation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MEDICAL EQUIPMENT INSTALLATION & SERIAL VERIFICATION */}
      {/* ========================================================================= */}
      {showInstallModal && selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-navy text-lg flex items-center gap-2">
                  <Wrench size={18} className="text-amber-600" />
                  DME Installation Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Order: {selectedVisit.orderNumber || 'DME-ORDER'} • Patient: {selectedVisit.patientDetails?.fullName}
                </p>
              </div>
              <button onClick={() => setShowInstallModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEquipmentVerification} className="space-y-4 pt-4 text-xs">
              {/* Equipment Items Serial Numbers */}
              <div className="space-y-3">
                <div className="font-bold text-navy uppercase tracking-wider text-[11px]">
                  Verified Equipment Serial Numbers &amp; Checklist
                </div>

                {equipmentList.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy">{item.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          Equipment Serial Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={item.serialNumber}
                          onChange={(e) => {
                            const updated = [...equipmentList];
                            updated[idx].serialNumber = e.target.value;
                            setEquipmentList(updated);
                          }}
                          placeholder="e.g. SN-BIPAP-2026-9041"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          Equipment Physical Condition
                        </label>
                        <select
                          value={item.condition}
                          onChange={(e) => {
                            const updated = [...equipmentList];
                            updated[idx].condition = e.target.value;
                            setEquipmentList(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold capitalize"
                        >
                          <option value="functional_tested">Functional Tested</option>
                          <option value="new">Brand New Sealed</option>
                          <option value="good">Good (Cleaned &amp; Sanitized)</option>
                          <option value="damaged">Damaged in Transit</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.checklistPassed}
                          onChange={(e) => {
                            const updated = [...equipmentList];
                            updated[idx].checklistPassed = e.target.checked;
                            setEquipmentList(updated);
                          }}
                          className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                        <span>Installation &amp; electrical safety checklist passed</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => triggerSimulatedScanner(idx)}
                        disabled={isSimulatingCamera}
                        className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        <QrCode size={13} />
                        <span>{isSimulatingCamera ? 'Scanning Camera...' : 'Scan QR/Barcode'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Barcode scan status */}
              {barcodeScanVerified && (
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>
                    Barcode optical verification verified: <code className="font-mono">{barcodeRawData}</code>
                  </span>
                </div>
              )}

              {/* Patient / Caregiver Acknowledgement */}
              <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-200 space-y-2">
                <div className="font-bold text-teal-900 uppercase tracking-wider text-[11px]">
                  Physical Bedside Acknowledgement
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-teal-900 mb-0.5">
                    Receiving Patient / Caregiver Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={caregiverName}
                    onChange={(e) => setCaregiverName(e.target.value)}
                    placeholder="Full name of patient or authorized family caregiver"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-teal-300 bg-white text-xs font-semibold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="ackConsent"
                    checked={patientAcknowledged}
                    onChange={(e) => setPatientAcknowledged(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <label htmlFor="ackConsent" className="font-semibold text-teal-950 cursor-pointer text-xs">
                    Caregiver confirms equipment demonstrated in working condition and safe operation explained.
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Installation Notes &amp; Bedside Evidence
                </label>
                <textarea
                  rows={2}
                  value={installNotes}
                  onChange={(e) => setInstallNotes(e.target.value)}
                  placeholder="Record power outlet status, oxygen flow titration, mask fit, or caregiver training..."
                  className="w-full px-3 py-2 rounded-xl border border-border focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInstallModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading || !patientAcknowledged || !caregiverName.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {actionLoading ? 'Verifying...' : 'Complete & Sign Installation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REPORT VISIT EXCEPTION */}
      {/* ========================================================================= */}
      {showExceptionModal && selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-navy text-lg flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-600" />
                  Report Visit Exception
                </h3>
                <p className="text-xs text-slate-500">
                  Visit {selectedVisit.visitNumber} • Patient: {selectedVisit.patientDetails?.fullName}
                </p>
              </div>
              <button onClick={() => setShowExceptionModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitException} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Exception Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={exceptionType}
                  onChange={(e) => setExceptionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border focus:border-primary focus:outline-none bg-white font-semibold"
                >
                  <option value="patient_unavailable">Patient Unavailable / Residence Locked</option>
                  <option value="refused_care">Patient / Family Refused Procedure</option>
                  <option value="access_blocked">Physical Access Blocked</option>
                  <option value="clinical_escalation">Emergency Acute Clinical Escalation</option>
                  <option value="equipment_defect">Equipment Transit Defect</option>
                  <option value="other">Other Operational Exception</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Explanation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="Explain why the visit could not be completed as scheduled..."
                  className="w-full px-3 py-2 rounded-xl border border-border focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Proposed Reschedule Date (Optional)
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExceptionModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading || !exceptionReason.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {actionLoading ? 'Recording...' : 'Record Exception'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FULL VISIT PROFILE & AUDIT LOGS */}
      {/* ========================================================================= */}
      {showDetailModal && selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-6 shadow-2xl border-l border-border flex flex-col justify-between text-xs">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <span className="text-xs font-bold text-primary tracking-wider uppercase">Field Visit File</span>
                  <h3 className="font-extrabold text-navy text-xl mt-0.5">{selectedVisit.visitNumber}</h3>
                  <p className="text-xs text-slate-400">
                    Scheduled: {selectedVisit.scheduledDate} ({selectedVisit.timeSlot})
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="py-4 space-y-6">
                {/* Status card */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Visit Status</div>
                    <div className="font-bold text-navy text-sm mt-0.5 uppercase">
                      {selectedVisit.status?.replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Scope of Service</div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5 capitalize">
                      {selectedVisit.visitType?.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                {/* Patient Demographics */}
                <div>
                  <h4 className="font-bold text-navy uppercase tracking-wider mb-2">Patient Details</h4>
                  <div className="p-3.5 rounded-xl border border-border bg-white space-y-1">
                    <div className="font-bold text-navy">{selectedVisit.patientDetails?.fullName}</div>
                    <div className="text-slate-600">Phone: {selectedVisit.patientDetails?.phone}</div>
                    <div className="text-slate-600">
                      Address: {selectedVisit.patientDetails?.address}, {selectedVisit.patientDetails?.city} - {selectedVisit.patientDetails?.pincode}
                    </div>
                    {selectedVisit.patientDetails?.emergencyContact && (
                      <div className="text-slate-500 text-[11px]">
                        Emergency: {selectedVisit.patientDetails.emergencyContact}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recorded Vitals if any */}
                {selectedVisit.clinicalDocumentation?.vitals && (
                  <div>
                    <h4 className="font-bold text-navy uppercase tracking-wider mb-2">Recorded Vital Signs</h4>
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 grid grid-cols-3 gap-2 font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400">BP</div>
                        <div className="font-bold text-navy">{selectedVisit.clinicalDocumentation.vitals.bloodPressure || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">PULSE</div>
                        <div className="font-bold text-navy">{selectedVisit.clinicalDocumentation.vitals.pulse || '—'} bpm</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">SPO2</div>
                        <div className="font-bold text-navy">{selectedVisit.clinicalDocumentation.vitals.spO2 || '—'} %</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Timeline History */}
                <div>
                  <h4 className="font-bold text-navy uppercase tracking-wider mb-2">Lifecycle Milestones</h4>
                  <div className="space-y-2">
                    {selectedVisit.statusHistory?.map((ev: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-border text-xs flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                        <div>
                          <div className="font-semibold text-navy capitalize">{ev.status?.replace('_', ' ')}</div>
                          <p className="text-slate-600 mt-0.5">{ev.notes || ev.reason || 'Status advanced'}</p>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(ev.timestamp).toLocaleString()} • {ev.changedByName || 'Clinician'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setShowDetailModal(false)} className="w-full">
                Close Visit Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: OFFLINE EDGE SYNCHRONIZATION QUEUE */}
      {/* ========================================================================= */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-border flex flex-col text-xs">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-navy text-white">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-navy text-base">Offline Edge Synchronization Queue</h3>
                  <p className="text-slate-500 text-xs">
                    IndexedDB structured local operations awaiting cloud acknowledgement
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="font-semibold text-slate-700">
                    Network: {isOnline ? 'Online (Ready to sync)' : 'Offline (Disconnected)'}
                  </span>
                </div>
                <div className="text-slate-500 font-medium">
                  {pendingOps.length} item(s) in local store
                </div>
              </div>

              {pendingOps.length > 0 ? (
                <div className="space-y-3">
                  {pendingOps.map((op) => {
                    const isApplied = op.syncState === 'synced';
                    const isConflict = op.syncState === 'conflict';
                    const isFailed = op.syncState === 'failed';
                    const isPending = op.syncState === 'pending';
                    const isSyncingItem = op.syncState === 'syncing';

                    return (
                      <div
                        key={op.clientOperationId}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isConflict
                            ? 'bg-amber-50/60 border-amber-300'
                            : isFailed
                            ? 'bg-rose-50/60 border-rose-300'
                            : isApplied
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-navy text-xs">
                              {op.visitNumber}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="capitalize font-semibold text-slate-700">
                              {op.operationType.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-1">
                            {isApplied && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 size={11} /> Synced
                              </span>
                            )}
                            {isConflict && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                <AlertTriangle size={11} /> Conflict
                              </span>
                            )}
                            {isFailed && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                <AlertCircle size={11} /> Failed
                              </span>
                            )}
                            {isPending && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                                <Clock size={11} /> Queued
                              </span>
                            )}
                            {isSyncingItem && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 animate-pulse">
                                <RefreshCw size={11} className="animate-spin" /> Syncing...
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <div>
                            <span className="text-slate-400 font-mono">OpID:</span>{' '}
                            <span className="font-mono text-slate-600">{op.clientOperationId}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Recorded:</span>{' '}
                            <span>{new Date(op.clientTimestamp).toLocaleTimeString()} ({new Date(op.clientTimestamp).toLocaleDateString()})</span>
                          </div>
                          {op.expectedStatus && (
                            <div>
                              <span className="text-slate-400">Baseline Status:</span>{' '}
                              <span className="font-semibold text-slate-700">{op.expectedStatus}</span>
                            </div>
                          )}
                          {op.conflictDetails?.reason && (
                            <div className="p-2 mt-1.5 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-900 font-medium">
                              {op.conflictDetails.reason} (Server status: {op.conflictDetails.serverStatus})
                            </div>
                          )}
                          {op.errorReason && (
                            <div className="p-2 mt-1.5 rounded-lg bg-rose-100/70 border border-rose-300 text-rose-900 font-medium">
                              {op.errorReason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
                  <p className="font-semibold text-slate-700 text-sm">All operations synchronized</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    No pending changes stored in device IndexedDB.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-slate-50 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePurgeLocalData}
                className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                Purge Local Data
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQueueModal(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSyncNow}
                  disabled={isSyncing || !isOnline || pendingOps.length === 0}
                  className="bg-navy hover:bg-navy-light text-white flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
