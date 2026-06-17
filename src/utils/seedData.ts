import { User, Store, Product, Order, PlatformSettings } from '../types';

// Simple, beautiful, lightweight SVG data URLs to represent base64 images without huge strings
const svgPlaceholder = (bg: string, text: string, icon: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="24" fill="#1e293b">${text}</text>
    <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48">${icon}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const logoPlaceholder = (letter: string, bg: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    <circle cx="50" cy="50" r="45" fill="${bg}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="black" font-size="40" fill="white">${letter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const bannerPlaceholder = (title: string, subtitle: string, bg: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="#1e1b4b"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="10%" y="45%" font-family="sans-serif" font-weight="extrabold" font-size="56" fill="white">${title}</text>
    <text x="10%" y="65%" font-family="sans-serif" font-size="28" fill="#cbd5e1">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const DEFAULT_USERS: User[] = [
  {
    userId: 'admin-1',
    email: 'savieisaiah54@gmail.com',
    password: 'Admin@Voya2025',
    name: 'Savie Isaiah',
    role: 'admin',
    approved: true,
    profilePicture: logoPlaceholder('S', '#dc2626'),
    phoneNumber: '+1234567890',
  },
  {
    userId: 'seller-1',
    email: 'seller@voya.com',
    password: 'seller123',
    name: 'Li Wei (Guangzhou Electronics Co.)',
    role: 'seller',
    approved: true,
    storeId: 'store-1',
    profilePicture: logoPlaceholder('L', '#2563eb'),
    phoneNumber: '+1987654321',
  },
  {
    userId: 'seller-2', // A pending seller for showcase
    email: 'shenzhen.crafts@gmail.com',
    password: 'seller123',
    name: 'Zhang Min (Shenzhen Silk & Crafts)',
    role: 'seller',
    approved: false,
    storeId: 'store-2',
    profilePicture: logoPlaceholder('Z', '#d97706'),
  },
  {
    userId: 'customer-1',
    email: 'buyer@savie.com',
    password: 'buyer123',
    name: 'Emily Watson',
    role: 'customer',
    approved: true,
    profilePicture: logoPlaceholder('E', '#16a34a'),
    shippingAddress: '456 Silk Road Boulevard, Apt 12B, Los Angeles, CA 90015',
    phoneNumber: '+15555555555',
    location: {
      country: 'United States',
      city: 'Los Angeles',
      district: 'CA',
      postalCode: '90015',
      streetAddress: '456 Silk Road Boulevard, Apt 12B',
      lat: 34.0407,
      lng: -118.2468
    }
  }
];

export const DEFAULT_STORES: Store[] = [
  {
    storeId: 'store-1',
    sellerId: 'seller-1',
    storeName: 'Guangzhou High-Tech Center',
    logo: logoPlaceholder('G', '#2563eb'),
    banner: bannerPlaceholder('Guangzhou High-Tech', 'Your portal to state-of-the-art Chinese electronics', '#1d4ed8'),
    description: 'We source direct-from-factory high-quality smartphones, smartwatches, charges, and audio equipment in Guangzhou, China. Fast international shipping.',
    approved: true,
    payoutEmail: 'payouts@guangzhou-tech.com',
  },
  {
    storeId: 'store-2',
    sellerId: 'seller-2',
    storeName: 'Shenzhen Silk & Tea Treasures',
    logo: logoPlaceholder('T', '#d97706'),
    banner: bannerPlaceholder('Shenzhen Silk & Tea', 'Traditional crafts, premium silk robes, and premium loose-leaf tea', '#b45309'),
    description: 'Generations of premium silk artisans and pure organic high-mountain oolong/pu-erh tea straight from estates.',
    approved: false,
    payoutEmail: 'billing@shenzhencrafts.com',
  }
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    productId: 'prod-1',
    storeId: 'store-1',
    name: 'Titanium ANC Wireless Headphones',
    price: 89.99,
    stock: 45,
    description: 'Active Noise Cancelling (ANC) headphones with customized 40mm titanium drivers. 40 hours of playtime and unmatched spatial sound stage. Built in Guangzhou.',
    images: [svgPlaceholder('#e2e8f0', 'Titanium Headphones', '🎧')],
    category: 'Electronics',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
    originalPrice: 60.00,
    desiredProfit: 29.99,
    finalPrice: 89.99,
    weight: 0.45,
    approvalDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    sizes: ['S', 'M', 'L'],
  },
  {
    productId: 'prod-2',
    storeId: 'store-1',
    name: 'Elite Sports Smartwatch v4',
    price: 119.50,
    stock: 12,
    description: 'AMOLED Always-On display with advanced heart rate, blood oxygen logging, and dual-band multi-point GPS navigation. 14-day battery life.',
    images: [svgPlaceholder('#e0f2fe', 'Elite Smartwatch', '⌚')],
    category: 'Electronics',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
    originalPrice: 80.00,
    desiredProfit: 39.50,
    finalPrice: 119.50,
    weight: 0.15,
    approvalDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    sizes: ['Standard'],
  },
  {
    productId: 'prod-3',
    storeId: 'store-1',
    name: 'GaN 140W Multi-Port Charger',
    price: 39.99,
    stock: 120,
    description: 'Pocket-sized ultra-fast Gallium Nitride charger. Simultaneously charge 2 laptops and 1 smartphone. Fast charging protocol supported.',
    images: [svgPlaceholder('#f1f5f9', 'GaN 140W Charger', '🔌')],
    category: 'Electronics',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
    originalPrice: 25.00,
    desiredProfit: 14.99,
    finalPrice: 39.99,
    weight: 0.30,
    approvalDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    sizes: ['US Plug', 'EU Plug', 'UK Plug'],
  },
  {
    productId: 'prod-4',
    storeId: 'store-2', // This product belongs to store-2 which is pending approval, so it shouldn't show up in customer catalog
    name: 'Premium Dragon-Well Embroidered Silk Robe',
    price: 185.00,
    stock: 5,
    description: 'Hand-woven 100% pure mulberry silk bathrobe. Painstakingly detailed golden dragon embroidery made in Suzhou.',
    images: [svgPlaceholder('#fef3c7', 'Golden Dragon Silk Robe', '👘')],
    category: 'Apparel & Fashion',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending_approval',
    originalPrice: 120.00,
    desiredProfit: 65.00,
    finalPrice: 185.00,
    weight: 0.80,
    sizes: ['M', 'L', 'XL'],
  },
  {
    productId: 'prod-5',
    storeId: 'store-1',
    name: 'Handcrafted Sandalwood Tea Box',
    price: 54.00,
    stock: 25,
    description: 'Traditional solid sandalwood storage chest featuring beautiful brass latch keys. Ideal for preserving luxury tea cakes or fine watches.',
    images: [svgPlaceholder('#ffedd5', 'Sandalwood Tea Box', '📦')],
    category: 'Home & Kitchen',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
    originalPrice: 35.00,
    desiredProfit: 19.00,
    finalPrice: 54.00,
    weight: 1.20,
    approvalDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    sizes: ['Single Size'],
  },
];

export const DEFAULT_ORDERS: Order[] = [
  {
    orderId: 'order-101',
    customerId: 'customer-1',
    storeId: 'store-1',
    items: [
      {
        productId: 'prod-1',
        name: 'Titanium ANC Wireless Headphones',
        price: 89.99,
        quantity: 1,
      },
      {
        productId: 'prod-3',
        name: 'GaN 140W Multi-Port Charger',
        price: 39.99,
        quantity: 2,
      }
    ],
    total: 169.97,
    status: 'shipped',
    shippingAddress: '456 Silk Road Boulevard, Apt 12B, Los Angeles, CA 90015',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteName: 'Voya',
  contactEmail: 'support@voya-direct.net',
  contactPhone: '+86 20 8888 8888',
  contactAddress: 'Voya Enterprise Sourcing Hub, Shenzhen, China',
  platformLogo: logoPlaceholder('V', '#ff9900'),
  platformBanner: bannerPlaceholder('Voya Direct Sourcing', "Direct Sourcing from China's Ultimate Factories & Craft Shops", '#ff9900'),
  adminBankName: 'Voya Global Bank of Commerce',
  adminBankAccountNumber: '88800099955511',
  adminBankAccountName: 'Voya Sourcing Direct Inc. (Savie Isaiah)',
  adminMobileMoneyNumber: '+233 54 123 4567',
  adminMobileMoneyName: 'Savie Isaiah Admin Fund',
  adminMobileMoneyProvider: 'MTN Mobile Money / Telecel Cash',
  commissionRate: 15,
  minDepositLimit: 100,
  maxDepositLimit: 100000,
  minWithdrawalLimit: 500,
  maxWithdrawalLimit: 50000,
};

import { 
  dbGetUsers, 
  dbSaveUser, 
  dbGetProducts, 
  dbSaveProduct, 
  dbGetStores, 
  dbSaveStore, 
  dbGetOrders, 
  dbSaveOrder, 
  dbGetPlatformSettings, 
  dbSavePlatformSettings 
} from '../utils/firebase';

export async function seedFirebaseIfEmpty(): Promise<void> {
  console.log("Starting Firebase check and seeding procedure...");
  
  try {
    // 1. Seed Users
    const existingUsers = await dbGetUsers();
    if (existingUsers.length === 0) {
      console.log("Seeding DEFAULT_USERS into Firestore...");
      for (const user of DEFAULT_USERS) {
        await dbSaveUser(user);
      }
    } else {
      // Ensure the administrator account exists with matching expectations
      const hasAdmin = existingUsers.some(u => (u.email || '').toLowerCase() === 'savieisaiah54@gmail.com');
      if (!hasAdmin) {
        const adminUser: User = {
          userId: 'admin-1',
          email: 'savieisaiah54@gmail.com',
          password: 'Admin@Voya2025',
          name: 'Savie Isaiah',
          role: 'admin',
          approved: true,
          profilePicture: logoPlaceholder('S', '#dc2626'),
          phoneNumber: '+1234567890',
        };
        await dbSaveUser(adminUser);
      }
    }

    // 2. Seed Stores
    const existingStores = await dbGetStores();
    if (existingStores.length === 0) {
      console.log("Seeding DEFAULT_STORES into Firestore...");
      for (const store of DEFAULT_STORES) {
        await dbSaveStore(store);
      }
    }

    // 3. Seed Products
    const existingProducts = await dbGetProducts();
    if (existingProducts.length === 0) {
      console.log("Seeding DEFAULT_PRODUCTS into Firestore...");
      for (const product of DEFAULT_PRODUCTS) {
        await dbSaveProduct(product);
      }
    }

    // 4. Seed Orders
    const existingOrders = await dbGetOrders();
    if (existingOrders.length === 0) {
      console.log("Seeding DEFAULT_ORDERS into Firestore...");
      for (const order of DEFAULT_ORDERS) {
        await dbSaveOrder(order);
      }
    }

    // 5. Seed Platform Settings
    const existingSettings = await dbGetPlatformSettings();
    if (!existingSettings) {
      console.log("Seeding DEFAULT_PLATFORM_SETTINGS into Firestore...");
      await dbSavePlatformSettings(DEFAULT_PLATFORM_SETTINGS);
    }

    console.log("Firebase sync and seeding procedure successfully completed.");
  } catch (error) {
    console.warn("Critical: seedFirebaseIfEmpty sequence encountered an error:", error);
  }
}

export function seedLocalStorage() {
  if (!localStorage.getItem('voya_users')) {
    setLocalStorageData('voya_users', DEFAULT_USERS);
  } else {
    // Gracefully update existing seeded users to match password & phone requirements
    try {
      const existingUsers = JSON.parse(localStorage.getItem('voya_users') || '[]') as User[];
      let updated = false;

      // Ensure the exclusive administrator accounts exists
      const hasAdmin = existingUsers.some(u => (u.email || '').toLowerCase() === 'savieisaiah54@gmail.com');
      if (!hasAdmin) {
        existingUsers.push({
          userId: 'admin-1',
          email: 'savieisaiah54@gmail.com',
          password: 'Admin@Voya2025',
          name: 'Savie Isaiah',
          role: 'admin',
          approved: true,
          profilePicture: logoPlaceholder('S', '#dc2626'),
          phoneNumber: '+1234567890',
        });
        updated = true;
      }

      const nextUsers = existingUsers.map(u => {
        const emailLower = (u.email || '').toLowerCase();
        if (emailLower === 'savieisaiah54@gmail.com') {
          if (u.password !== 'Admin@Voya2025' || u.phoneNumber !== '+1234567890' || u.role !== 'admin' || u.blocked) {
            u.password = 'Admin@Voya2025';
            u.phoneNumber = '+1234567890';
            u.role = 'admin';
            u.blocked = false;
            u.approved = true;
            updated = true;
          }
        } else if (emailLower === 'seller@voya.com') {
          if (!u.phoneNumber) {
            u.phoneNumber = '+1987654321';
            updated = true;
          }
        } else if (emailLower === 'buyer@savie.com') {
          if (!u.phoneNumber) {
            u.phoneNumber = '+15555555555';
            updated = true;
          }
        }
        return u;
      });

      if (updated) {
        setLocalStorageData('voya_users', nextUsers);
        
        // Also sync any alive active session
        const storedSession = localStorage.getItem('voya_active_session');
        if (storedSession) {
          try {
            const currentSessionUser = JSON.parse(storedSession) as User;
            const freshUser = nextUsers.find(u => u.userId === currentSessionUser.userId);
            if (freshUser) {
              setLocalStorageData('voya_active_session', freshUser);
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn("seedLocalStorage user matching encountered a status info", e);
    }
  }
  if (!localStorage.getItem('voya_stores')) {
    setLocalStorageData('voya_stores', DEFAULT_STORES);
  }
  if (!localStorage.getItem('voya_products')) {
    setLocalStorageData('voya_products', DEFAULT_PRODUCTS);
  }
  if (!localStorage.getItem('voya_orders')) {
    setLocalStorageData('voya_orders', DEFAULT_ORDERS);
  }
  if (!localStorage.getItem('voya_platform_settings')) {
    setLocalStorageData('voya_platform_settings', DEFAULT_PLATFORM_SETTINGS);
  }
  // Initialize dynamic stores empty states if needed
  if (!localStorage.getItem('voya_carts')) {
    setLocalStorageData('voya_carts', {});
  }
  if (!localStorage.getItem('voya_wishlists')) {
    setLocalStorageData('voya_wishlists', {});
  }
}

export function getLocalStorageData<T>(key: string, fallback: T): T {
  const item = localStorage.getItem(key);
  if (!item) return fallback;
  try {
    return JSON.parse(item) as T;
  } catch (e) {
    console.warn(`Warning reading key ${key} from localStorage`, e);
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

export function setLocalStorageData<T>(key: string, data: T): void {
  const sanitized = sanitizeForLocalStorage(key, data);
  localStorage.setItem(key, JSON.stringify(sanitized));
}
