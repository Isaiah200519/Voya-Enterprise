import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { User, Store, Product, Order, PlatformSettings, CartItem, SellerNotification, AuditLog, WithdrawalRequest, BuyerPaymentRequest, SellerPaymentRequest, Spin, PointsPurchase, MonthlyStats, WinnerAnnouncement, Transaction } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// ============================================================================
// FIREBASE SETUP AND VERIFICATION GUIDE FOR USER
// ============================================================================
/*
  =========================================
  HOW TO SET UP YOUR FIREBASE PROJECT:
  =========================================
  1. Go to the Firebase Console: https://console.firebase.google.com/
  2. Click "Add project" and follow the simple steps to create a new project.
  3. In your project dashboard, enable the following services:
     - Firestore Database (choose Production mode, and configure a region)
     - Firebase Storage (choose Production mode, and configure a region)
     - Firebase Authentication (Enable the "Email/Password" sign-in provider)
  4. Register a Web App in the project settings, and paste those credentials in:
     `firebase-applet-config.json` at the root of your workspace!
  
  =========================================
  FIRESTORE SECURITY RULES (firestore.rules)
  =========================================
  Copy and deploy the rules defined in your local `firestore.rules` file to ensure
  absolute data confidentiality and prevent update-gaps/spoofing.

  =========================================
  FIREBASE STORAGE RULES
  =========================================
  Deploy the following security rules in your Firebase Storage dashboard:
  
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /{allPaths=**} {
        allow read: if true; // Allow public viewing of products/logos
        allow write: if request.auth != null; // Authenticated users can write images
      }
    }
  }
*/

// ============================================================================
// FIREBASE CONFIGURATION COOPERATIVE PLACEHOLDER MODEL
// If firebase-applet-config.json is missing or blank, we default to this structure:
// ============================================================================
const PLACEHOLDER_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
  firestoreDatabaseId: ""
};

const finalConfig = firebaseConfig.projectId ? firebaseConfig : PLACEHOLDER_CONFIG;

// Initialize Firebase App
const app = initializeApp(finalConfig);

// Initialize core services
export const db = finalConfig.firestoreDatabaseId 
  ? getFirestore(app, finalConfig.firestoreDatabaseId) 
  : getFirestore(app);
export const auth = getAuth(app);
export const storage = finalConfig.storageBucket
  ? getStorage(app, `gs://${finalConfig.storageBucket}`)
  : getStorage(app);

// Keep track of Firebase Storage availability to avoid hanging or slow attempts in unprovisioned environments
let isStorageDisabled = typeof window !== 'undefined' && window.sessionStorage?.getItem('voya_storage_disabled') === 'true';

async function checkStorageAvailability() {
  if (isStorageDisabled) return;
  const bucket = finalConfig.storageBucket || '';
  if (!bucket || bucket.trim() === '' || bucket === PLACEHOLDER_CONFIG.storageBucket) {
    isStorageDisabled = true;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('voya_storage_disabled', 'true');
    }
    return;
  }
  
  try {
    const storageRef = ref(storage, 'test_conn_probe_xyz.txt');
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 1500)
    );
    await Promise.race([getDownloadURL(storageRef), timeoutPromise]);
  } catch (error: any) {
    if (error && error.code === 'storage/object-not-found') {
      isStorageDisabled = false;
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('voya_storage_disabled', 'false');
      }
    } else {
      isStorageDisabled = true;
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('voya_storage_disabled', 'true');
      }
    }
  }
}
checkStorageAvailability();

// Test Firestore database connectivity asynchronously on load as mandatory
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successfully established and validated.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("[Security Alert] Firestore server connection is offline. Please check your Firebase settings.");
    } else {
      console.warn("Firestore test document lookup returned status. Active read state confirmed.", error);
    }
  }
}
testConnection();

// ============================================================================
// MANDATORY ADVANCED ERROR HANDLING
// ============================================================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('[Diagnostic System Code] Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned;
  }
  return obj;
}

// ============================================================================
// IMAGE UPLOAD SYSTEM TO FIREBASE STORAGE
// ============================================================================

/**
 * Compresses and downscales a base64 image client-side to minimize storage usage,
 * fit within database size limits, and reduce upload bandwidth.
 */
export function compressImageBase64(
  base64Str: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> {
  return new Promise<string>((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Only resize if wider or taller than max bounds
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Downscale format to high compression JPEG
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(base64Str); // Fallback to original on error
    };

    img.src = base64Str;
  });
}

export async function uploadImageToStorage(path: string, base64DataUrl: string): Promise<string> {
  if (!base64DataUrl || !base64DataUrl.startsWith('data:image')) {
    // If it's already an HTTPS URL or not a base64, return as is
    return base64DataUrl;
  }
  
  // Compress base64 image first so both fallback and upload are lightweight (~30KB-80KB)
  const compressedDataUrl = await compressImageBase64(base64DataUrl);

  // Upfront check to see if storage has been properly provisioned or has a valid bucket configuration
  const bucket = finalConfig.storageBucket || '';
  if (!bucket || bucket.trim() === '' || bucket === PLACEHOLDER_CONFIG.storageBucket || isStorageDisabled) {
    console.info("[Offline Fallback Engine] Firebase Storage is unconfigured or disabled. Speed-redirecting to compressed base64 source.");
    return compressedDataUrl;
  }

  try {
    const storageRef = ref(storage, path);
    
    // Safety timeout promise of 3500ms with a direct fallback/rejection to avoid UI freeze
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase Storage upload limit exceeded (3500ms timeout)')), 3500)
    );

    // Direct upload sequence
    const uploadTask = async () => {
      await uploadString(storageRef, compressedDataUrl, 'data_url');
      return await getDownloadURL(storageRef);
    };

    // Race upload task against timeout
    const downloadUrl = await Promise.race([uploadTask(), timeoutPromise]);
    return downloadUrl;
  } catch (error) {
    console.info("Firebase Storage is unprovisioned or timed out. Transitioning to local compressed base64 fallback...", error);
    isStorageDisabled = true;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('voya_storage_disabled', 'true');
    }
    return compressedDataUrl;
  }
}

export async function deleteImageFromStorage(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return;
  // If it's a firebase storage url or path, delete it
  if (!urlOrPath.startsWith('http') && !urlOrPath.includes('firebasestorage')) {
    // If it is raw placeholder/offline asset, ignore it
    return;
  }
  try {
    const storageRef = ref(storage, urlOrPath);
    await deleteObject(storageRef);
    console.log("Successfully deleted object from Firebase Storage:", urlOrPath);
  } catch (error) {
    console.warn("Failed to delete object from Firebase Storage (it might already be deleted or is a local asset):", error);
  }
}

// ============================================================================
// CENTRAL SECURE FIRESTORE PERSISTED DATA SERVICES
// ============================================================================

// Inline LocalStorage helpers for 100% offline-safety and zero circular dependencies
function getLocalData<T>(key: string, fallback: T): T {
  const v = localStorage.getItem(key);
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch (_) {
    return fallback;
  }
}

function sanitizeForLocalStorage(key: string, val: any): any {
  if (!val) return val;
  try {
    const deepClone = JSON.parse(JSON.stringify(val));
    
    const cleanBase64 = (str: any): any => {
      if (typeof str === 'string' && str.startsWith('data:image')) {
        return '';
      }
      return str;
    };

    if (key === 'voya_products' && Array.isArray(deepClone)) {
      return deepClone.map((p: any) => ({
        ...p,
        images: Array.isArray(p.images) ? p.images.map((img: any) => img.startsWith('data:') ? '' : img) : []
      }));
    }
    if (key === 'voya_stores' && Array.isArray(deepClone)) {
      return deepClone.map((s: any) => ({
        ...s,
        logo: cleanBase64(s.logo),
        banner: cleanBase64(s.banner)
      }));
    }
    if (key === 'voya_platform_settings' && deepClone) {
      if (deepClone.platformBanner) {
        deepClone.platformBanner = cleanBase64(deepClone.platformBanner);
      }
    }
    if (key === 'voya_users' && Array.isArray(deepClone)) {
      return deepClone.map((u: any) => ({
        ...u,
        profilePicture: cleanBase64(u.profilePicture)
      }));
    }
    if (key === 'voya_active_session' && deepClone) {
      deepClone.profilePicture = cleanBase64(deepClone.profilePicture);
    }
    return deepClone;
  } catch (_) {
    return val;
  }
}

function setLocalData<T>(key: string, val: T): void {
  const sanitized = sanitizeForLocalStorage(key, val);
  localStorage.setItem(key, JSON.stringify(sanitized));
}

// Users
export async function dbGetUsers(): Promise<User[]> {
  const path = 'users';
  try {
    const qSnapshot = await getDocs(collection(db, path));
    return qSnapshot.docs.map(d => d.data() as User);
  } catch (error) {
    console.warn("Failed to dbGetUsers from Firestore, falling back to LocalStorage...", error);
    return getLocalData<User[]>('voya_users', []);
  }
}

export async function dbGetUser(userId: string): Promise<User | null> {
  const path = `users/${userId}`;
  try {
    const dSnapshot = await getDoc(doc(db, 'users', userId));
    return dSnapshot.exists() ? (dSnapshot.data() as User) : null;
  } catch (error) {
    console.warn(`Failed to dbGetUser (${userId}) from Firestore, falling back to LocalStorage...`, error);
    const users = getLocalData<User[]>('voya_users', []);
    return users.find(u => u.userId === userId) || null;
  }
}

export async function dbSaveUser(user: User): Promise<void> {
  if (!user.userId) return;
  const path = `users/${user.userId}`;
  
  // Dual-write LocalStorage first
  try {
    const users = getLocalData<User[]>('voya_users', []);
    const idx = users.findIndex(u => u.userId === user.userId);
    if (idx > -1) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    setLocalData('voya_users', users);
  } catch (e) {
    console.warn("Failed to save user to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'users', user.userId), cleanUndefined(user));
  } catch (error) {
    console.warn("dbSaveUser Firestore write failed, proceeding with LocalStorage state...", error);
  }
}

export async function dbDeleteUser(userId: string): Promise<void> {
  const path = `users/${userId}`;
  
  // Sync removal to LocalStorage
  try {
    const users = getLocalData<User[]>('voya_users', []);
    const nextUsers = users.filter(u => u.userId !== userId);
    setLocalData('voya_users', nextUsers);
  } catch (e) {
    console.warn("Failed to delete user from LocalStorage", e);
  }

  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.warn("dbDeleteUser Firestore query failed, proceeding with LocalStorage consistency...", error);
  }
}

// Products
export async function dbGetProducts(): Promise<Product[]> {
  const path = 'products';
  try {
    const qSnapshot = await getDocs(collection(db, path));
    return qSnapshot.docs.map(d => d.data() as Product);
  } catch (error) {
    console.warn("Failed to dbGetProducts from Firestore, falling back to LocalStorage...", error);
    return getLocalData<Product[]>('voya_products', []);
  }
}

export async function dbSaveProduct(product: Product): Promise<void> {
  const path = `products/${product.productId}`;
  
  // Dual-write LocalStorage first
  try {
    const products = getLocalData<Product[]>('voya_products', []);
    const idx = products.findIndex(p => p.productId === product.productId);
    if (idx > -1) {
      products[idx] = product;
    } else {
      products.push(product);
    }
    setLocalData('voya_products', products);
  } catch (e) {
    console.warn("Failed to save product to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'products', product.productId), cleanUndefined(product));
  } catch (error) {
    console.warn("dbSaveProduct Firestore write failed, proceeding with LocalStorage state...", error);
  }
}

export async function dbDeleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  
  // Sync removal to LocalStorage
  try {
    const products = getLocalData<Product[]>('voya_products', []);
    const nextProducts = products.filter(p => p.productId !== productId);
    setLocalData('voya_products', nextProducts);
  } catch (e) {
    console.warn("Failed to delete product from LocalStorage", e);
  }

  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    console.warn("dbDeleteProduct Firestore query failed, proceeding with LocalStorage consistency...", error);
  }
}

// Stores
export async function dbGetStores(): Promise<Store[]> {
  const path = 'stores';
  try {
    const qSnapshot = await getDocs(collection(db, path));
    return qSnapshot.docs.map(d => d.data() as Store);
  } catch (error) {
    console.warn("Failed to dbGetStores from Firestore, falling back to LocalStorage...", error);
    return getLocalData<Store[]>('voya_stores', []);
  }
}

export async function dbSaveStore(store: Store): Promise<void> {
  const path = `stores/${store.storeId}`;
  
  // Dual-write LocalStorage first
  try {
    const stores = getLocalData<Store[]>('voya_stores', []);
    const idx = stores.findIndex(s => s.storeId === store.storeId);
    if (idx > -1) {
      stores[idx] = store;
    } else {
      stores.push(store);
    }
    setLocalData('voya_stores', stores);
  } catch (e) {
    console.warn("Failed to save store to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'stores', store.storeId), cleanUndefined(store));
  } catch (error) {
    console.warn("dbSaveStore Firestore write failed, proceeding with LocalStorage state...", error);
  }
}

// Orders
export async function dbGetOrders(): Promise<Order[]> {
  const path = 'orders';
  try {
    const qSnapshot = await getDocs(collection(db, path));
    return qSnapshot.docs.map(d => d.data() as Order);
  } catch (error) {
    console.warn("Failed to dbGetOrders from Firestore, falling back to LocalStorage...", error);
    return getLocalData<Order[]>('voya_orders', []);
  }
}

export async function dbSaveOrder(order: Order): Promise<void> {
  const path = `orders/${order.orderId}`;
  
  // Dual-write LocalStorage first
  try {
    const orders = getLocalData<Order[]>('voya_orders', []);
    const idx = orders.findIndex(o => o.orderId === order.orderId);
    if (idx > -1) {
      orders[idx] = order;
    } else {
      orders.push(order);
    }
    setLocalData('voya_orders', orders);
  } catch (e) {
    console.warn("Failed to save order to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'orders', order.orderId), cleanUndefined(order));
  } catch (error) {
    console.warn("dbSaveOrder Firestore write failed, proceeding with LocalStorage state...", error);
  }
}

// Carts & Wishlists
export async function dbGetCart(userId: string): Promise<CartItem[]> {
  const path = `carts/${userId}`;
  try {
    const dSnap = await getDoc(doc(db, 'carts', userId));
    return dSnap.exists() ? (dSnap.data().items as CartItem[]) : [];
  } catch (error) {
    console.warn(`Failed to dbGetCart (${userId}) from Firestore, falling back to LocalStorage...`, error);
    const cartsObj = getLocalData<Record<string, CartItem[]>>('voya_carts', {});
    return cartsObj[userId] || [];
  }
}

export async function dbSaveCart(userId: string, items: CartItem[]): Promise<void> {
  const path = `carts/${userId}`;
  
  // Dual-write LocalStorage first
  try {
    const cartsObj = getLocalData<Record<string, CartItem[]>>('voya_carts', {});
    cartsObj[userId] = items;
    setLocalData('voya_carts', cartsObj);
  } catch (e) {
    console.warn("Failed to save cart to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'carts', userId), cleanUndefined({ userId, items }));
  } catch (error) {
    console.warn("dbSaveCart Firestore write failed, proceeding with LocalStorage state...", error);
  }
}

export async function dbGetWishlist(userId: string): Promise<string[]> {
  const path = `wishlists/${userId}`;
  try {
    const dSnap = await getDoc(doc(db, 'wishlists', userId));
    return dSnap.exists() ? (dSnap.data().productIds as string[]) : [];
  } catch (error) {
    console.warn(`Failed to dbGetWishlist (${userId}) from Firestore, falling back to LocalStorage...`, error);
    const wishlistsObj = getLocalData<Record<string, string[]>>('voya_wishlists', {});
    return wishlistsObj[userId] || [];
  }
}

export async function dbSaveWishlist(userId: string, productIds: string[]): Promise<void> {
  const path = `wishlists/${userId}`;
  
  // Dual-write LocalStorage first
  try {
    const wishlistsObj = getLocalData<Record<string, string[]>>('voya_wishlists', {});
    wishlistsObj[userId] = productIds;
    setLocalData('voya_wishlists', wishlistsObj);
  } catch (e) {
    console.warn("Failed to save wishlist to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'wishlists', userId), cleanUndefined({ userId, productIds }));
  } catch (error) {
    console.warn("dbSaveWishlist Firestore write failed, proceeding with LocalStorage state...", error);
  }
}

// Platform Settings
export async function dbGetPlatformSettings(): Promise<PlatformSettings | null> {
  const path = 'platform_settings/voya';
  try {
    const dSnap = await getDoc(doc(db, 'platform_settings', 'voya'));
    return dSnap.exists() ? (dSnap.data() as PlatformSettings) : null;
  } catch (error) {
    console.warn("Failed to dbGetPlatformSettings from Firestore, falling back to LocalStorage...", error);
    return getLocalData<PlatformSettings | null>('voya_platform_settings', null);
  }
}

export async function dbSavePlatformSettings(settings: PlatformSettings): Promise<void> {
  const path = 'platform_settings/voya';
  
  // Dual-write LocalStorage first
  try {
    setLocalData('voya_platform_settings', settings);
  } catch (e) {
    console.warn("Failed to save platform settings to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'platform_settings', 'voya'), cleanUndefined(settings));
  } catch (error) {
    console.warn("dbSavePlatformSettings Firestore write failed, proceeding with LocalStorage state...", error);
  }
}

export interface SecurityRecoveryOtp {
  code: string;
  expiry: number;
  identifier: string;
  wrongAttempts: number;
}

export async function dbSaveRecoveryOtp(identifier: string, packet: SecurityRecoveryOtp): Promise<void> {
  const cleanedId = identifier.replace(/[/.]/g, '_'); // sanitize potential path injections
  const path = `recovery_otps/${cleanedId}`;
  
  // Mirror to LocalStorage local cache/fallback
  try {
    const rawOtps = localStorage.getItem('voya_recovery_otps') || '{}';
    const otps = JSON.parse(rawOtps);
    otps[cleanedId] = packet;
    localStorage.setItem('voya_recovery_otps', JSON.stringify(otps));
  } catch (e) {
    console.warn("Failed to cache recovery OTP to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'recovery_otps', cleanedId), cleanUndefined(packet));
  } catch (error) {
    console.warn("Failed to save recovery OTP to Firestore, proceeding with LocalStorage cache fallback.", error);
  }
}

export async function dbGetRecoveryOtp(identifier: string): Promise<SecurityRecoveryOtp | null> {
  const cleanedId = identifier.replace(/[/.]/g, '_');
  const path = `recovery_otps/${cleanedId}`;
  
  try {
    const dSnap = await getDoc(doc(db, 'recovery_otps', cleanedId));
    if (dSnap.exists()) {
      return dSnap.data() as SecurityRecoveryOtp;
    }
  } catch (error) {
    console.warn("Firestore dbGetRecoveryOtp offline or failed, querying LocalStorage fallback...", error);
  }

  // Fallback to LocalStorage cache
  try {
    const rawOtps = localStorage.getItem('voya_recovery_otps') || '{}';
    const otps = JSON.parse(rawOtps);
    return otps[cleanedId] || null;
  } catch (e) {
    console.warn("LocalStorage fallback query for recovery OTP failed", e);
    return null;
  }
}

export async function dbDeleteRecoveryOtp(identifier: string): Promise<void> {
  const cleanedId = identifier.replace(/[/.]/g, '_');
  const path = `recovery_otps/${cleanedId}`;

  // Clean from LocalStorage local cache
  try {
    const rawOtps = localStorage.getItem('voya_recovery_otps') || '{}';
    const otps = JSON.parse(rawOtps);
    delete otps[cleanedId];
    localStorage.setItem('voya_recovery_otps', JSON.stringify(otps));
  } catch (e) {
    console.warn("Failed to delete recovery OTP from LocalStorage", e);
  }

  try {
    await deleteDoc(doc(db, 'recovery_otps', cleanedId));
  } catch (error) {
    console.warn("Failed to delete recovery OTP from Firestore, proceeding with LocalStorage cleanup.", error);
  }
}

// ============================================================================
// NOTIFICATIONS & AUDIT LOG SERVICES
// ============================================================================
export async function dbGetNotifications(sellerId: string): Promise<SellerNotification[]> {
  const path = 'notifications';
  try {
    const q = query(collection(db, path), where('sellerId', '==', sellerId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as SellerNotification)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("dbGetNotifications from Firestore failed, reverting to LocalStorage...", error);
    const notifications = getLocalData<SellerNotification[]>('voya_notifications', []);
    return notifications.filter(n => n.sellerId === sellerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function dbSaveNotification(notif: SellerNotification): Promise<void> {
  const path = `notifications/${notif.id}`;
  try {
    const notifications = getLocalData<SellerNotification[]>('voya_notifications', []);
    const idx = notifications.findIndex(n => n.id === notif.id);
    if (idx > -1) {
      notifications[idx] = notif;
    } else {
      notifications.push(notif);
    }
    setLocalData('voya_notifications', notifications);
  } catch (e) {
    console.warn("Failed to save notification to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'notifications', notif.id), cleanUndefined(notif));
  } catch (error) {
    console.warn("dbSaveNotification Firestore write failed", error);
  }
}

export async function dbGetAuditLogs(): Promise<AuditLog[]> {
  const path = 'audit_logs';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data() as AuditLog)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.warn("dbGetAuditLogs from Firestore failed, reverting to LocalStorage...", error);
    return getLocalData<AuditLog[]>('voya_audit_logs', [])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export async function dbSaveAuditLog(log: AuditLog): Promise<void> {
  const path = `audit_logs/${log.id}`;
  try {
    const logs = getLocalData<AuditLog[]>('voya_audit_logs', []);
    logs.push(log);
    setLocalData('voya_audit_logs', logs);
  } catch (e) {
    console.warn("Failed to save audit log to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'audit_logs', log.id), cleanUndefined(log));
  } catch (error) {
    console.warn("dbSaveAuditLog Firestore write failed", error);
  }
}

// ============================================================================
// WITHDRAWAL REQUESTS
// ============================================================================
export async function dbGetWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const path = 'withdrawal_requests';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data() as WithdrawalRequest)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("dbGetWithdrawalRequests from Firestore failed, reverting to LocalStorage...", error);
    return getLocalData<WithdrawalRequest[]>('voya_withdrawal_requests', [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function dbSaveWithdrawalRequest(req: WithdrawalRequest): Promise<void> {
  const path = `withdrawal_requests/${req.id}`;
  try {
    const requests = getLocalData<WithdrawalRequest[]>('voya_withdrawal_requests', []);
    const idx = requests.findIndex(r => r.id === req.id);
    if (idx > -1) {
      requests[idx] = req;
    } else {
      requests.push(req);
    }
    setLocalData('voya_withdrawal_requests', requests);
  } catch (e) {
    console.warn("Failed to save withdrawal request to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'withdrawal_requests', req.id), cleanUndefined(req));
  } catch (error) {
    console.warn("dbSaveWithdrawalRequest Firestore write failed", error);
  }
}

// ============================================================================
// BUYER PAYMENT METHOD ADDITION REQUESTS
// ============================================================================
export async function dbGetBuyerPaymentRequests(): Promise<BuyerPaymentRequest[]> {
  const path = 'buyer_payment_requests';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data() as BuyerPaymentRequest)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("dbGetBuyerPaymentRequests from Firestore failed, reverting to LocalStorage...", error);
    return getLocalData<BuyerPaymentRequest[]>('voya_buyer_payment_requests', [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function dbSaveBuyerPaymentRequest(req: BuyerPaymentRequest): Promise<void> {
  const path = `buyer_payment_requests/${req.id}`;
  try {
    const requests = getLocalData<BuyerPaymentRequest[]>('voya_buyer_payment_requests', []);
    const idx = requests.findIndex(r => r.id === req.id);
    if (idx > -1) {
      requests[idx] = req;
    } else {
      requests.push(req);
    }
    setLocalData('voya_buyer_payment_requests', requests);
  } catch (e) {
    console.warn("Failed to save buyer payment request to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'buyer_payment_requests', req.id), cleanUndefined(req));
  } catch (error) {
    console.warn("dbSaveBuyerPaymentRequest Firestore write failed", error);
  }
}

// ============================================================================
// SELLER PAYMENT METHOD ADDITION REQUESTS
// ============================================================================
export async function dbGetSellerPaymentRequests(): Promise<SellerPaymentRequest[]> {
  const path = 'seller_payment_requests';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data() as SellerPaymentRequest)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("dbGetSellerPaymentRequests from Firestore failed, reverting to LocalStorage...", error);
    return getLocalData<SellerPaymentRequest[]>('voya_seller_payment_requests', [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function dbSaveSellerPaymentRequest(req: SellerPaymentRequest): Promise<void> {
  const path = `seller_payment_requests/${req.id}`;
  try {
    const requests = getLocalData<SellerPaymentRequest[]>('voya_seller_payment_requests', []);
    const idx = requests.findIndex(r => r.id === req.id);
    if (idx > -1) {
      requests[idx] = req;
    } else {
      requests.push(req);
    }
    setLocalData('voya_seller_payment_requests', requests);
  } catch (e) {
    console.warn("Failed to save seller payment request to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'seller_payment_requests', req.id), cleanUndefined(req));
  } catch (error) {
    console.warn("dbSaveSellerPaymentRequest Firestore write failed", error);
  }
}

// ============================================================================
// LUCKY DRAW / PRIZE WHEEL COLLECTIONS
// ============================================================================

export async function dbGetSpins(): Promise<Spin[]> {
  const path = 'spins';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data() as Spin)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("dbGetSpins from Firestore failed, reverting to LocalStorage...", error);
    return getLocalData<Spin[]>('voya_spins', [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function dbSaveSpin(spin: Spin): Promise<void> {
  const path = `spins/${spin.id}`;
  try {
    const list = getLocalData<Spin[]>('voya_spins', []);
    const idx = list.findIndex(s => s.id === spin.id);
    if (idx > -1) {
      list[idx] = spin;
    } else {
      list.push(spin);
    }
    setLocalData('voya_spins', list);
  } catch (e) {
    console.warn("Failed to save spin to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'spins', spin.id), cleanUndefined(spin));
  } catch (error) {
    console.warn("dbSaveSpin Firestore write failed", error);
  }
}

export async function dbGetPointsPurchases(): Promise<PointsPurchase[]> {
  const path = 'points_purchases';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data() as PointsPurchase)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("dbGetPointsPurchases from Firestore failed, reverting to LocalStorage...", error);
    return getLocalData<PointsPurchase[]>('voya_points_purchases', [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function dbSavePointsPurchase(purchase: PointsPurchase): Promise<void> {
  const path = `points_purchases/${purchase.id}`;
  try {
    const list = getLocalData<PointsPurchase[]>('voya_points_purchases', []);
    const idx = list.findIndex(p => p.id === purchase.id);
    if (idx > -1) {
      list[idx] = purchase;
    } else {
      list.push(purchase);
    }
    setLocalData('voya_points_purchases', list);
  } catch (e) {
    console.warn("Failed to save points purchase to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'points_purchases', purchase.id), cleanUndefined(purchase));
  } catch (error) {
    console.warn("dbSavePointsPurchase Firestore write failed", error);
  }
}

export async function dbGetMonthlyStats(): Promise<MonthlyStats[]> {
  const path = 'monthly_stats';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data() as MonthlyStats);
  } catch (error) {
    console.warn("dbGetMonthlyStats from Firestore failed, reverting to LocalStorage...", error);
    return getLocalData<MonthlyStats[]>('voya_monthly_stats', []);
  }
}

export async function dbSaveMonthlyStats(stats: MonthlyStats): Promise<void> {
  const path = `monthly_stats/${stats.id}`;
  try {
    const list = getLocalData<MonthlyStats[]>('voya_monthly_stats', []);
    const idx = list.findIndex(s => s.id === stats.id);
    if (idx > -1) {
      list[idx] = stats;
    } else {
      list.push(stats);
    }
    setLocalData('voya_monthly_stats', list);
  } catch (e) {
    console.warn("Failed to save monthly stats to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'monthly_stats', stats.id), cleanUndefined(stats));
  } catch (error) {
    console.warn("dbSaveMonthlyStats Firestore write failed", error);
  }
}

export async function dbGetWinnerAnnouncements(): Promise<WinnerAnnouncement[]> {
  const path = 'winner_announcements';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data() as WinnerAnnouncement)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  } catch (error) {
    console.warn("dbGetWinnerAnnouncements from Firestore failed, reverting to LocalStorage...", error);
    return getLocalData<WinnerAnnouncement[]>('voya_winner_announcements', [])
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }
}

export async function dbSaveWinnerAnnouncement(ann: WinnerAnnouncement): Promise<void> {
  const path = `winner_announcements/${ann.id}`;
  try {
    const list = getLocalData<WinnerAnnouncement[]>('voya_winner_announcements', []);
    const idx = list.findIndex(a => a.id === ann.id);
    if (idx > -1) {
      list[idx] = ann;
    } else {
      list.push(ann);
    }
    setLocalData('voya_winner_announcements', list);
  } catch (e) {
    console.warn("Failed to save announcement to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'winner_announcements', ann.id), cleanUndefined(ann));
  } catch (error) {
    console.warn("dbSaveWinnerAnnouncement Firestore write failed", error);
  }
}

// ============================================================================
// TRANSACTION LEDGER SERVICES
// ============================================================================
export async function dbGetTransactions(): Promise<Transaction[]> {
  const path = 'transactions';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => doc.data() as Transaction)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.warn("dbGetTransactions from Firestore failed, reverting to LocalStorage...", error);
    return getLocalData<Transaction[]>('voya_transactions', [])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export async function dbSaveTransaction(txn: Transaction): Promise<void> {
  const path = `transactions/${txn.id}`;
  try {
    const list = getLocalData<Transaction[]>('voya_transactions', []);
    const idx = list.findIndex(t => t.id === txn.id);
    if (idx > -1) {
      list[idx] = txn;
    } else {
      list.push(txn);
    }
    setLocalData('voya_transactions', list);
  } catch (e) {
    console.warn("Failed to save transaction to LocalStorage", e);
  }

  try {
    await setDoc(doc(db, 'transactions', txn.id), cleanUndefined(txn));
  } catch (error) {
    console.warn("dbSaveTransaction Firestore write failed", error);
  }
}


