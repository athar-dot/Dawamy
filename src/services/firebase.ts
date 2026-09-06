import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  getDocFromServer,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { LeaveOrWfhRequest, UserProfile, NotificationItem, AttendanceRecord, BiometricDeviceConfig, SalaryDeduction, SalaryAdvance } from '../types';
import {
  INITIAL_REQUESTS,
  INITIAL_USERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_DEDUCTIONS,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_SALARY_ADVANCES,
} from '../mockData';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Error Handling Definition conforming to Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
}

// Test Connection to Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_probe'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline mode or waiting for initial sync.');
      return false;
    }
    return true;
  }
}

/**
 * Recursively cleans an object by stripping any undefined values,
 * which Firestore rejects with 'Unsupported field value: undefined'.
 */
export function cleanFirestorePayload<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanFirestorePayload(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestorePayload(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// ----------------------------------------------------
// AUTHENTICATION SERVICES
// ----------------------------------------------------
const googleProvider = new GoogleAuthProvider();

export interface AuthErrorDetails {
  code: string;
  message: string;
  hostname: string;
}

export async function loginWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const errorCode = error?.code || 'auth/unknown';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
    
    // Log friendly diagnostic message
    if (errorCode === 'auth/unauthorized-domain') {
      console.warn(
        `Firebase Auth Notice: The domain "${hostname}" is not authorized in Firebase Console yet. ` +
        `Please add "${hostname}" to Firebase Console -> Authentication -> Settings -> Authorized domains.`
      );
    } else if (errorCode === 'auth/popup-closed-by-user') {
      console.info('Sign-in popup was closed by user.');
    } else {
      console.error('Google Sign-in Error:', error);
    }

    const customError: any = new Error(error.message || 'Authentication error');
    customError.code = errorCode;
    customError.hostname = hostname;
    throw customError;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error('Logout Error:', error);
    throw error;
  }
}

// ----------------------------------------------------
// SEED INITIAL DATA IF EMPTY OR INCOMPLETE
// ----------------------------------------------------
export async function seedInitialDataIfEmpty() {
  try {
    // 1. Seed Users (ensure all standard employees exist in Firestore)
    for (const u of INITIAL_USERS) {
      await setDoc(doc(db, 'users', u.id), cleanFirestorePayload(u), { merge: true });
    }

    // 2. Seed Requests
    for (const r of INITIAL_REQUESTS) {
      await setDoc(doc(db, 'requests', r.id), cleanFirestorePayload(r), { merge: true });
    }

    // 3. Seed Notifications
    for (const n of INITIAL_NOTIFICATIONS) {
      await setDoc(doc(db, 'notifications', n.id), cleanFirestorePayload(n), { merge: true });
    }

    // 4. Seed Deductions
    for (const d of INITIAL_DEDUCTIONS) {
      await setDoc(doc(db, 'deductions', d.id), cleanFirestorePayload(d), { merge: true });
    }

    // 5. Seed Attendance (ensure all employee records exist)
    for (const a of INITIAL_ATTENDANCE_RECORDS) {
      await setDoc(doc(db, 'attendance', a.id), cleanFirestorePayload(a), { merge: true });
    }

    // 6. Seed Salary Advances
    for (const adv of INITIAL_SALARY_ADVANCES) {
      await setDoc(doc(db, 'advances', adv.id), cleanFirestorePayload(adv), { merge: true });
    }
  } catch (error) {
    console.warn('Initial seeding note (will fallback smoothly):', error);
  }
}

// ----------------------------------------------------
// REQUESTS (FIRESTORE REAL-TIME SYNC & CRUD)
// ----------------------------------------------------
export function subscribeToRequests(callback: (requests: LeaveOrWfhRequest[]) => void) {
  const q = collection(db, 'requests');
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        setTimeout(() => callback([]), 0);
        return;
      }
      const items: LeaveOrWfhRequest[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<LeaveOrWfhRequest, 'id'>) });
      });
      setTimeout(() => callback(items), 0);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests');
    }
  );
}

export async function createRequestInFirestore(req: LeaveOrWfhRequest) {
  try {
    await setDoc(doc(db, 'requests', req.id), {
      ...cleanFirestorePayload(req),
      syncedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `requests/${req.id}`);
    throw error;
  }
}

export async function updateRequestStatusInFirestore(
  requestId: string,
  status: LeaveOrWfhRequest['status'],
  extra?: Partial<LeaveOrWfhRequest>
) {
  try {
    const ref = doc(db, 'requests', requestId);
    const initialMatch = INITIAL_REQUESTS.find((r) => r.id === requestId);
    const basePayload = initialMatch ? cleanFirestorePayload(initialMatch) : {};

    await setDoc(
      ref,
      {
        ...basePayload,
        status,
        ...(extra ? cleanFirestorePayload(extra) : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `requests/${requestId}`);
    throw error;
  }
}

export async function deleteRequestInFirestore(requestId: string) {
  try {
    await deleteDoc(doc(db, 'requests', requestId));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `requests/${requestId}`);
    throw error;
  }
}

// ----------------------------------------------------
// USERS & PRESENCE (FIRESTORE REAL-TIME SYNC)
// ----------------------------------------------------
export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  const q = collection(db, 'users');
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const firestoreMap = new Map<string, UserProfile>();
        snapshot.forEach((docSnap) => {
          firestoreMap.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as Omit<UserProfile, 'id'>) });
        });

        const merged: UserProfile[] = [];
        const seenIds = new Set<string>();

        // Add Firestore users
        firestoreMap.forEach((user, id) => {
          merged.push(user);
          seenIds.add(id);
        });

        // Add missing initial users
        INITIAL_USERS.forEach((initUser) => {
          if (!seenIds.has(initUser.id)) {
            merged.push(initUser);
            seenIds.add(initUser.id);
          }
        });

        setTimeout(() => callback(merged), 0);
      } else {
        setTimeout(() => callback(INITIAL_USERS), 0);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      callback(INITIAL_USERS);
    }
  );
}

export async function createEmployeeInFirestore(user: UserProfile) {
  try {
    const ref = doc(db, 'users', user.id);
    await setDoc(ref, {
      ...user,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${user.id}`);
    throw error;
  }
}

export async function updateUserInFirestore(userId: string, data: Partial<UserProfile>) {
  try {
    const cleaned = cleanFirestorePayload(data);
    const ref = doc(db, 'users', userId);
    await setDoc(ref, {
      ...cleaned,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    return false;
  }
}

export async function deleteEmployeeFromFirestore(userId: string) {
  try {
    const ref = doc(db, 'users', userId);
    await deleteDoc(ref);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    throw error;
  }
}

// ----------------------------------------------------
// NOTIFICATIONS (FIRESTORE REAL-TIME SYNC)
// ----------------------------------------------------
export function safeFormatTimestamp(rawTimestamp: unknown): string {
  if (!rawTimestamp) return 'الآن';
  if (typeof rawTimestamp === 'string') return rawTimestamp;
  if (typeof rawTimestamp === 'number') {
    try {
      const d = new Date(rawTimestamp);
      return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'الآن';
    }
  }
  // If it's a Firestore Timestamp or object with seconds
  if (typeof rawTimestamp === 'object') {
    const obj = rawTimestamp as { seconds?: number; toDate?: () => Date };
    if (typeof obj.toDate === 'function') {
      try {
        const d = obj.toDate();
        return d.toLocaleDateString('ar-SA', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
      } catch {
        return 'الآن';
      }
    }
    if (typeof obj.seconds === 'number') {
      try {
        const d = new Date(obj.seconds * 1000);
        return d.toLocaleDateString('ar-SA', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
      } catch {
        return 'الآن';
      }
    }
  }
  return 'الآن';
}

export function subscribeToNotifications(callback: (notifs: NotificationItem[]) => void) {
  const q = collection(db, 'notifications');
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const notifs: NotificationItem[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() || {};
          notifs.push({
            id: docSnap.id,
            title: typeof raw.title === 'string' ? raw.title : (typeof raw.titleEn === 'string' ? raw.titleEn : 'إشعار جديد'),
            titleEn: typeof raw.titleEn === 'string' ? raw.titleEn : undefined,
            message: typeof raw.message === 'string' ? raw.message : (typeof raw.messageEn === 'string' ? raw.messageEn : ''),
            messageEn: typeof raw.messageEn === 'string' ? raw.messageEn : undefined,
            type: raw.type || 'system',
            timestamp: safeFormatTimestamp(raw.timestamp),
            read: Boolean(raw.read),
            requestId: typeof raw.requestId === 'string' ? raw.requestId : undefined,
          });
        });
        setTimeout(() => callback(notifs), 0);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    }
  );
}

export async function addNotificationToFirestore(notif: NotificationItem) {
  try {
    const payload = {
      ...notif,
      timestamp: safeFormatTimestamp(notif.timestamp),
    };
    await setDoc(doc(db, 'notifications', notif.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${notif.id}`);
  }
}

export async function markNotificationAsReadInFirestore(notifId: string) {
  try {
    await setDoc(doc(db, 'notifications', notifId), { read: true }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

export async function markAllNotificationsAsReadInFirestore(notifIds: string[]) {
  try {
    const batch = writeBatch(db);
    for (const id of notifIds) {
      batch.set(doc(db, 'notifications', id), { read: true }, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications/batch');
  }
}

export async function clearAllNotificationsInFirestore(notifIds: string[]) {
  try {
    const batch = writeBatch(db);
    for (const id of notifIds) {
      batch.delete(doc(db, 'notifications', id));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'notifications/batch');
  }
}

// ----------------------------------------------------
// VIRTUAL CHECK-IN
// ----------------------------------------------------
export async function saveVirtualCheckIn(checkin: {
  id: string;
  userId: string;
  userName: string;
  date: string;
  time: string;
  locationType: string;
  status: string;
  tasks: string[];
}) {
  try {
    await setDoc(doc(db, 'checkins', checkin.id), {
      ...checkin,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `checkins/${checkin.id}`);
  }
}

// ----------------------------------------------------
// BATCH UPDATE EMPLOYEE BALANCES (EXCEL IMPORT)
// ----------------------------------------------------
export async function batchUpdateUserBalances(
  updates: { userId: string; balances: UserProfile['balances'] }[]
): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    for (const item of updates) {
      const userRef = doc(db, 'users', item.userId);
      batch.update(userRef, {
        balances: item.balances,
        updatedAt: nowIso,
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users/batch_balance_update');
    // Fallback: update documents individually if batch rejected
    try {
      for (const item of updates) {
        await updateUserInFirestore(item.userId, { balances: item.balances });
      }
      return true;
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.UPDATE, 'users');
      throw fallbackErr;
    }
  }
}

// ----------------------------------------------------
// BIOMETRIC ATTENDANCE RECORDS (FIRESTORE REAL-TIME SYNC)
// ----------------------------------------------------
export function subscribeToAttendance(callback: (records: AttendanceRecord[]) => void) {
  const q = collection(db, 'attendance');
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const firestoreMap = new Map<string, AttendanceRecord>();
        snapshot.forEach((docSnap) => {
          firestoreMap.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as Omit<AttendanceRecord, 'id'>) });
        });

        const merged: AttendanceRecord[] = [];
        const seenIds = new Set<string>();

        // Add Firestore attendance records
        firestoreMap.forEach((rec, id) => {
          merged.push(rec);
          seenIds.add(id);
        });

        // Add initial attendance records for all other employees
        INITIAL_ATTENDANCE_RECORDS.forEach((initRec) => {
          if (!seenIds.has(initRec.id)) {
            merged.push(initRec);
            seenIds.add(initRec.id);
          }
        });

        setTimeout(() => callback(merged), 0);
      } else {
        setTimeout(() => callback(INITIAL_ATTENDANCE_RECORDS), 0);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
      callback(INITIAL_ATTENDANCE_RECORDS);
    }
  );
}

export async function saveAttendanceRecord(record: AttendanceRecord): Promise<boolean> {
  try {
    const ref = doc(db, 'attendance', record.id);
    const payload = cleanFirestorePayload({
      ...record,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(ref, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `attendance/${record.id}`);
    throw error;
  }
}

// ----------------------------------------------------
// BIOMETRIC DEVICES CONFIGURATION (FIRESTORE SYNC)
// ----------------------------------------------------
export function subscribeToBiometricDevices(callback: (devices: BiometricDeviceConfig[]) => void) {
  const q = collection(db, 'biometric_devices');
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const devices: BiometricDeviceConfig[] = [];
        snapshot.forEach((docSnap) => {
          devices.push({ id: docSnap.id, ...(docSnap.data() as Omit<BiometricDeviceConfig, 'id'>) });
        });
        setTimeout(() => callback(devices), 0);
      } else {
        setTimeout(() => callback([]), 0);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'biometric_devices');
    }
  );
}

export async function saveBiometricDevice(device: BiometricDeviceConfig): Promise<boolean> {
  try {
    const ref = doc(db, 'biometric_devices', device.id);
    const payload = cleanFirestorePayload({
      ...device,
      lastSyncTime: new Date().toISOString(),
    });
    await setDoc(ref, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `biometric_devices/${device.id}`);
    throw error;
  }
}

// ----------------------------------------------------
// SALARY DEDUCTIONS & PENALTIES (FIRESTORE SYNC & WAIVER)
// ----------------------------------------------------
export function subscribeToDeductions(callback: (deductions: SalaryDeduction[]) => void) {
  const q = collection(db, 'deductions');
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const firestoreMap = new Map<string, SalaryDeduction>();
        snapshot.forEach((docSnap) => {
          firestoreMap.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as Omit<SalaryDeduction, 'id'>) });
        });

        const merged: SalaryDeduction[] = [];
        const seenIds = new Set<string>();

        firestoreMap.forEach((ded, id) => {
          merged.push(ded);
          seenIds.add(id);
        });

        INITIAL_DEDUCTIONS.forEach((initDed) => {
          if (!seenIds.has(initDed.id)) {
            merged.push(initDed);
            seenIds.add(initDed.id);
          }
        });

        setTimeout(() => callback(merged), 0);
      } else {
        setTimeout(() => callback(INITIAL_DEDUCTIONS), 0);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deductions');
      // Fallback to initial deductions
      callback(INITIAL_DEDUCTIONS);
    }
  );
}

export async function saveSalaryDeduction(deduction: SalaryDeduction): Promise<boolean> {
  try {
    const ref = doc(db, 'deductions', deduction.id);
    const payload = cleanFirestorePayload({
      ...deduction,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(ref, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `deductions/${deduction.id}`);
    throw error;
  }
}

export async function waiveSalaryDeduction(
  deductionId: string,
  waivedBy: string,
  waivedReason: string,
  currentData?: SalaryDeduction
): Promise<boolean> {
  try {
    const ref = doc(db, 'deductions', deductionId);
    const initialMatch = INITIAL_DEDUCTIONS.find((d) => d.id === deductionId);
    const basePayload = currentData
      ? cleanFirestorePayload(currentData)
      : initialMatch
      ? cleanFirestorePayload(initialMatch)
      : {};

    await setDoc(
      ref,
      {
        ...basePayload,
        status: 'waived',
        waivedBy,
        waivedReason,
        waivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `deductions/${deductionId}`);
    throw error;
  }
}

export async function restoreSalaryDeduction(
  deductionId: string,
  currentData?: SalaryDeduction
): Promise<boolean> {
  try {
    const ref = doc(db, 'deductions', deductionId);
    const initialMatch = INITIAL_DEDUCTIONS.find((d) => d.id === deductionId);
    const basePayload = currentData
      ? cleanFirestorePayload(currentData)
      : initialMatch
      ? cleanFirestorePayload(initialMatch)
      : {};

    await setDoc(
      ref,
      {
        ...basePayload,
        status: 'applied',
        waivedBy: null,
        waivedReason: null,
        waivedAt: null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `deductions/${deductionId}`);
    throw error;
  }
}

export async function deleteSalaryDeduction(deductionId: string): Promise<boolean> {
  try {
    const ref = doc(db, 'deductions', deductionId);
    await deleteDoc(ref);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `deductions/${deductionId}`);
    throw error;
  }
}

/**
 * Waives a late punch deduction for a specific attendance record
 */
export async function waiveAttendanceLateRecord(
  attendanceId: string,
  waivedBy: string,
  waivedReason: string,
  currentData?: AttendanceRecord
): Promise<boolean> {
  try {
    const ref = doc(db, 'attendance', attendanceId);
    const initialMatch = INITIAL_ATTENDANCE_RECORDS.find((r) => r.id === attendanceId);
    const basePayload = currentData
      ? cleanFirestorePayload(currentData)
      : initialMatch
      ? cleanFirestorePayload(initialMatch)
      : {};

    await setDoc(
      ref,
      {
        ...basePayload,
        isLateDeductionWaived: true,
        waivedBy,
        waivedReason,
        waivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `attendance/${attendanceId}`);
    throw error;
  }
}

/**
 * Restores a late punch deduction for a specific attendance record
 */
export async function restoreAttendanceLateRecord(
  attendanceId: string,
  currentData?: AttendanceRecord
): Promise<boolean> {
  try {
    const ref = doc(db, 'attendance', attendanceId);
    const initialMatch = INITIAL_ATTENDANCE_RECORDS.find((r) => r.id === attendanceId);
    const basePayload = currentData
      ? cleanFirestorePayload(currentData)
      : initialMatch
      ? cleanFirestorePayload(initialMatch)
      : {};

    await setDoc(
      ref,
      {
        ...basePayload,
        isLateDeductionWaived: false,
        waivedBy: null,
        waivedReason: null,
        waivedAt: null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `attendance/${attendanceId}`);
    throw error;
  }
}

// ----------------------------------------------------
// SALARY ADVANCES & INSTALLMENTS (FIRESTORE SYNC)
// ----------------------------------------------------
export function subscribeToSalaryAdvances(callback: (advances: SalaryAdvance[]) => void) {
  const q = collection(db, 'advances');
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const firestoreMap = new Map<string, SalaryAdvance>();
        snapshot.forEach((docSnap) => {
          firestoreMap.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as Omit<SalaryAdvance, 'id'>) });
        });

        const merged: SalaryAdvance[] = [];
        const seenIds = new Set<string>();

        firestoreMap.forEach((adv, id) => {
          merged.push(adv);
          seenIds.add(id);
        });

        INITIAL_SALARY_ADVANCES.forEach((initAdv) => {
          if (!seenIds.has(initAdv.id)) {
            merged.push(initAdv);
            seenIds.add(initAdv.id);
          }
        });

        setTimeout(() => callback(merged), 0);
      } else {
        setTimeout(() => callback(INITIAL_SALARY_ADVANCES), 0);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'advances');
      callback(INITIAL_SALARY_ADVANCES);
    }
  );
}

export async function saveSalaryAdvance(advance: SalaryAdvance): Promise<boolean> {
  try {
    const ref = doc(db, 'advances', advance.id);
    const payload = cleanFirestorePayload({
      ...advance,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(ref, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `advances/${advance.id}`);
    throw error;
  }
}


