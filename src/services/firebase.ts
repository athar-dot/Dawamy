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
import { LeaveOrWfhRequest, UserProfile, NotificationItem, AttendanceRecord, BiometricDeviceConfig, SalaryDeduction } from '../types';
import { INITIAL_REQUESTS, INITIAL_USERS, INITIAL_NOTIFICATIONS, INITIAL_DEDUCTIONS } from '../mockData';

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
// SEED INITIAL DATA IF EMPTY
// ----------------------------------------------------
export async function seedInitialDataIfEmpty() {
  try {
    // 1. Seed Users if empty
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (usersSnapshot.empty) {
      console.log('Seeding initial users to Firestore...');
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'users', u.id), u);
      }
    }

    // 2. Seed Requests if empty
    const reqSnapshot = await getDocs(collection(db, 'requests'));
    if (reqSnapshot.empty) {
      console.log('Seeding initial leave & WFH requests to Firestore...');
      for (const r of INITIAL_REQUESTS) {
        await setDoc(doc(db, 'requests', r.id), r);
      }
    }

    // 3. Seed Notifications if empty
    const notifSnapshot = await getDocs(collection(db, 'notifications'));
    if (notifSnapshot.empty) {
      console.log('Seeding initial notifications to Firestore...');
      for (const n of INITIAL_NOTIFICATIONS) {
        await setDoc(doc(db, 'notifications', n.id), n);
      }
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
      ...req,
      syncedAt: new Date().toISOString(),
    });
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
    await updateDoc(ref, {
      status,
      ...extra,
      updatedAt: new Date().toISOString(),
    });
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
        const usersList: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          usersList.push({ id: docSnap.id, ...(docSnap.data() as Omit<UserProfile, 'id'>) });
        });
        setTimeout(() => callback(usersList), 0);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
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
    const ref = doc(db, 'users', userId);
    await setDoc(ref, {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    throw error;
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
        const records: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push({ id: docSnap.id, ...(docSnap.data() as Omit<AttendanceRecord, 'id'>) });
        });
        setTimeout(() => callback(records), 0);
      } else {
        setTimeout(() => callback([]), 0);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
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
        const deductions: SalaryDeduction[] = [];
        snapshot.forEach((docSnap) => {
          deductions.push({ id: docSnap.id, ...(docSnap.data() as Omit<SalaryDeduction, 'id'>) });
        });
        setTimeout(() => callback(deductions), 0);
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
  waivedReason: string
): Promise<boolean> {
  try {
    const ref = doc(db, 'deductions', deductionId);
    await updateDoc(ref, {
      status: 'waived',
      waivedBy,
      waivedReason,
      waivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `deductions/${deductionId}`);
    throw error;
  }
}

export async function restoreSalaryDeduction(deductionId: string): Promise<boolean> {
  try {
    const ref = doc(db, 'deductions', deductionId);
    await updateDoc(ref, {
      status: 'applied',
      waivedBy: null,
      waivedReason: null,
      waivedAt: null,
      updatedAt: new Date().toISOString(),
    });
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
  waivedReason: string
): Promise<boolean> {
  try {
    const ref = doc(db, 'attendance', attendanceId);
    await updateDoc(ref, {
      isLateDeductionWaived: true,
      waivedBy,
      waivedReason,
      waivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `attendance/${attendanceId}`);
    throw error;
  }
}

/**
 * Restores a late punch deduction for a specific attendance record
 */
export async function restoreAttendanceLateRecord(attendanceId: string): Promise<boolean> {
  try {
    const ref = doc(db, 'attendance', attendanceId);
    await updateDoc(ref, {
      isLateDeductionWaived: false,
      waivedBy: null,
      waivedReason: null,
      waivedAt: null,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `attendance/${attendanceId}`);
    throw error;
  }
}


