/**
 * VivoQuest Offline Edge Synchronization Service
 * 
 * Provides structured IndexedDB storage for offline field visit documentation,
 * vitals recording, equipment verification, and exception logging.
 * Manages idempotent client operation keys, conflict detection, automatic reconnection sync,
 * and secure local data purge on user logout.
 */

import { fieldVisitsApi } from './api';

const DB_NAME = 'vivoquest_offline_db';
const DB_VERSION = 1;
const QUEUE_STORE = 'offline_queue';
const VISITS_STORE = 'cached_visits';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours local expiry

export type SyncState = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';

export interface OfflineOperation {
  clientOperationId: string;
  visitId: string;
  visitNumber: string;
  operationType: 'status_update' | 'clinical_documentation' | 'installation_verification' | 'visit_exception';
  clientTimestamp: string;
  expectedStatus?: string;
  payload: any;
  syncState: SyncState;
  errorReason?: string;
  conflictDetails?: {
    serverStatus?: string;
    expectedStatus?: string;
    reason?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface CachedVisit {
  _id: string;
  visitNumber: string;
  status: string;
  scheduledDate: string;
  timeSlot?: string;
  visitType: string;
  patientDetails: {
    fullName: string;
    phone: string;
    addressLine1?: string;
    city: string;
    landmark?: string;
    pincode?: string;
  };
  clinicalInstructions?: string;
  orderNumber?: string;
  installationVerification?: any;
  isPendingSync?: boolean;
  cachedAt: number;
}

/**
 * Initialize IndexedDB Connection
 */
function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this runtime environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'clientOperationId' });
        queueStore.createIndex('syncState', 'syncState', { unique: false });
        queueStore.createIndex('visitId', 'visitId', { unique: false });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(VISITS_STORE)) {
        const visitsStore = db.createObjectStore(VISITS_STORE, { keyPath: '_id' });
        visitsStore.createIndex('status', 'status', { unique: false });
        visitsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate cryptographic or high-entropy idempotent operation ID
 */
export function generateOperationId(prefix = 'SYNC'): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${randomPart}`;
}

/**
 * Enqueue an offline operation into IndexedDB
 */
export async function enqueueOfflineOperation(
  item: Omit<OfflineOperation, 'syncState' | 'createdAt' | 'updatedAt'>
): Promise<OfflineOperation> {
  const db = await openOfflineDB();
  const now = Date.now();
  const record: OfflineOperation = {
    ...item,
    syncState: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve all pending or failed sync operations
 */
export async function getPendingOperations(): Promise<OfflineOperation[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.getAll();

    req.onsuccess = () => {
      const all: OfflineOperation[] = req.result || [];
      const pending = all.filter(
        (op) => op.syncState === 'pending' || op.syncState === 'failed' || op.syncState === 'conflict'
      );
      resolve(pending);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve all queued items (including synced for audit view)
 */
export async function getAllQueueOperations(): Promise<OfflineOperation[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Update an individual operation's status in IndexedDB
 */
export async function updateOperationState(
  clientOperationId: string,
  syncState: SyncState,
  details?: { errorReason?: string; conflictDetails?: any }
): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const getReq = store.get(clientOperationId);

    getReq.onsuccess = () => {
      const record: OfflineOperation = getReq.result;
      if (!record) return resolve();

      record.syncState = syncState;
      record.updatedAt = Date.now();
      if (details?.errorReason !== undefined) record.errorReason = details.errorReason;
      if (details?.conflictDetails !== undefined) record.conflictDetails = details.conflictDetails;

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Remove an acknowledged operation from IndexedDB
 */
export async function removeQueueOperation(clientOperationId: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.delete(clientOperationId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Cache sanitized field visits for offline access
 * Applies local data expiry and sanitizes sensitive fields
 */
export async function cacheVisitsOffline(visits: any[]): Promise<void> {
  const db = await openOfflineDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(VISITS_STORE, 'readwrite');
    const store = tx.objectStore(VISITS_STORE);

    for (const v of visits) {
      const sanitized: CachedVisit = {
        _id: v._id || v.id,
        visitNumber: v.visitNumber,
        status: v.status,
        scheduledDate: v.scheduledDate,
        timeSlot: v.timeSlot,
        visitType: v.visitType,
        patientDetails: {
          fullName: v.patientDetails?.fullName || 'Patient',
          phone: v.patientDetails?.phone || '',
          addressLine1: v.patientDetails?.addressLine1,
          city: v.patientDetails?.city || 'Pune',
          landmark: v.patientDetails?.landmark,
          pincode: v.patientDetails?.pincode,
        },
        clinicalInstructions: v.clinicalInstructions,
        orderNumber: v.orderNumber,
        installationVerification: v.installationVerification,
        cachedAt: now,
      };
      store.put(sanitized);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get offline cached visits, filtering out records older than TTL
 */
export async function getCachedVisitsOffline(): Promise<CachedVisit[]> {
  const db = await openOfflineDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(VISITS_STORE, 'readonly');
    const store = tx.objectStore(VISITS_STORE);
    const req = store.getAll();

    req.onsuccess = () => {
      const all: CachedVisit[] = req.result || [];
      const fresh = all.filter((v) => now - v.cachedAt < CACHE_TTL_MS);
      resolve(fresh);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Update cached visit status locally when an offline action occurs
 */
export async function updateCachedVisitLocally(visitId: string, updates: Partial<CachedVisit>): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VISITS_STORE, 'readwrite');
    const store = tx.objectStore(VISITS_STORE);
    const req = store.get(visitId);

    req.onsuccess = () => {
      if (req.result) {
        const merged = { ...req.result, ...updates, isPendingSync: true, cachedAt: Date.now() };
        store.put(merged);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Synchronize all pending offline operations with backend API
 * Prevents race conditions and duplicate operations
 */
let isSyncInProgress = false;

export async function syncOfflineQueue(): Promise<{
  applied: number;
  conflicts: number;
  failed: number;
  results: any[];
}> {
  if (isSyncInProgress) {
    console.log('[OfflineSync] Batch sync already in progress, skipping duplicate invocation.');
    return { applied: 0, conflicts: 0, failed: 0, results: [] };
  }

  const pending = await getPendingOperations();
  if (pending.length === 0) {
    return { applied: 0, conflicts: 0, failed: 0, results: [] };
  }

  isSyncInProgress = true;

  try {
    // 1. Mark in-flight operations as 'syncing'
    for (const op of pending) {
      await updateOperationState(op.clientOperationId, 'syncing');
    }

    // 2. Prepare payload for batch sync
    const operationsPayload = pending.map((op) => ({
      clientOperationId: op.clientOperationId,
      visitId: op.visitId,
      visitNumber: op.visitNumber,
      operationType: op.operationType,
      clientTimestamp: op.clientTimestamp,
      expectedStatus: op.expectedStatus,
      payload: op.payload,
    }));

    // 3. Dispatch to backend API
    const response = await fieldVisitsApi.syncOfflineBatch(operationsPayload);
    const summary = response.data?.summary || { applied: 0, conflicts: 0, failed: 0 };
    const results = response.data?.results || [];

    // 4. Update IndexedDB records according to server resolution
    for (const res of results) {
      if (res.status === 'applied') {
        await updateOperationState(res.clientOperationId, 'synced');
      } else if (res.status === 'conflict') {
        await updateOperationState(res.clientOperationId, 'conflict', {
          conflictDetails: res.conflictDetails,
          errorReason: res.errorReason,
        });
      } else {
        await updateOperationState(res.clientOperationId, 'failed', {
          errorReason: res.errorReason,
        });
      }
    }

    return {
      applied: summary.applied,
      conflicts: summary.conflicts,
      failed: summary.failed,
      results,
    };
  } catch (err: any) {
    console.error('[OfflineSync] Sync batch error:', err);
    // On network failure, revert in-flight operations back to 'failed' so they can be retried
    for (const op of pending) {
      await updateOperationState(op.clientOperationId, 'failed', {
        errorReason: err.message || 'Network connection failed during sync',
      });
    }
    throw err;
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Scrub all offline records and cached visits
 * MUST be invoked on clinician logout to preserve patient confidentiality!
 */
export async function clearAllOfflineData(): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;

  try {
    const db = await openOfflineDB();
    const tx = db.transaction([QUEUE_STORE, VISITS_STORE], 'readwrite');
    tx.objectStore(QUEUE_STORE).clear();
    tx.objectStore(VISITS_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log('[OfflineSync] Offline queues and cached visits securely flushed.');
  } catch (err) {
    console.warn('[OfflineSync] Error clearing offline data:', err);
  }
}
