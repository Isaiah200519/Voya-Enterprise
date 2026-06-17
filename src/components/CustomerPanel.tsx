import React, { useState, useEffect } from 'react';
import { onSnapshot, collection } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { User, Store, Product, Order, CartItem, OrderItem, PlatformSettings, BuyerPaymentRequest, SellerNotification, Spin, PointsPurchase, MonthlyStats, WinnerAnnouncement, WithdrawalRequest, Transaction } from '../types';
import { getLocalStorageData, setLocalStorageData } from '../utils/seedData';
import { 
  uploadImageToStorage, 
  dbGetUsers, 
  dbSaveUser, 
  dbGetProducts, 
  dbSaveProduct, 
  dbGetStores, 
  dbSaveStore,
  dbGetOrders, 
  dbSaveOrder, 
  dbGetCart, 
  dbSaveCart, 
  dbGetWishlist, 
  dbSaveWishlist, 
  dbGetPlatformSettings,
  dbSaveRecoveryOtp,
  dbGetRecoveryOtp,
  dbDeleteRecoveryOtp,
  db,
  dbSaveBuyerPaymentRequest,
  dbSaveNotification,
  dbGetSpins,
  dbSaveSpin,
  dbGetPointsPurchases,
  dbSavePointsPurchase,
  dbGetMonthlyStats,
  dbSaveMonthlyStats,
  dbGetWinnerAnnouncements,
  dbGetWithdrawalRequests,
  dbSaveWithdrawalRequest,
  dbGetTransactions,
  dbSaveTransaction
} from '../utils/firebase';
import VoyaLogo from './VoyaLogo';
import { 
  ShoppingBag, 
  Search, 
  Heart, 
  User as UserIcon, 
  LogOut, 
  Filter, 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  Clock, 
  MapPin, 
  CheckCircle, 
  Store as StoreIcon, 
  Check, 
  Upload, 
  Sliders, 
  Info,
  ChevronLeft,
  ChevronRight,
  Eye,
  Home,
  Compass,
  ShieldCheck,
  Key,
  Mail,
  Lock,
  Download,
  Camera,
  Loader2,
  Image as ImageIcon,
  Truck,
  Package,
  AlertTriangle,
  Share2,
  Copy,
  Coins,
  Award,
  History,
  PlusCircle,
  RefreshCw,
  Gift,
  Trophy,
  Wallet,
  CreditCard,
  Menu
} from 'lucide-react';
import { ToastMessage } from './Toast';
import emailjs from '@emailjs/browser';

// ============================================================================
// EMAILJS SECURITY CONFIGURATION
// To operate real-time password resets via email, replace the placeholders below
// with your actual EmailJS credentials. Under default settings, the system will
// automatically trigger a browser notification fallback displaying the OTP.
// ============================================================================
const EMAILJS_PUBLIC_KEY = "";   // Place your EmailJS Public Key here (e.g. "user_xxxxxxxxxxxxxx")
const EMAILJS_SERVICE_ID = "";   // Place your EmailJS Service ID here (e.g. "service_xxxxxxxx")
const EMAILJS_TEMPLATE_ID = "";  // Place your EmailJS Template ID here (e.g. "template_xxxxxxxx")

const sendResetEmailWithEmailJS = async (email: string, code: string, showToast: (text: string, type: 'success' | 'error' | 'info') => void) => {
  if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID) {
    console.warn("[Security Warning] EmailJS parameters are missing initialization keys. Prompting system notification fallback.");
    
    // Exact requested fallback: show an alert with the code
    window.alert(`[Voya Security Override / Fallback Demo]
------------------------------------------------------
No EmailJS credentials are configured in your workspace yet. 
In a live production environment, this would send an email.

Password Reset Code Details:
Code: ${code} (Expires in 10 minutes)
Recipient Contact: ${email}
------------------------------------------------------
Please use the code above to verify password override.`);
    
    showToast(`Fallback notice: Reset code ${code} displayed in custom browser alert window!`, 'info');
    return false;
  }

  try {
    const templateParams = {
      to_email: email,
      message: `Your Voya password reset code is ${code}. Valid for 10 minutes.`,
      reset_code: code,
    };
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    showToast(`Success! Real-time override code dispatched via EmailJS to ${email}.`, 'success');
    return true;
  } catch (error) {
    console.error("EmailJS dispatch sequence failed:", error);
    window.alert(`[Voya EmailJS Dispatch Error]
EmailJS server returned an error: ${error instanceof Error ? error.message : String(error)}

Falling back to on-screen DEMO code: ${code}`);
    showToast(`EmailJS transmission failed. Displayed fallback on screen!`, 'error');
    return false;
  }
};


interface CustomerPanelProps {
  currentUser: User | null;
  onLogout: () => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

type ModeType = 'landing' | 'shop' | 'wishlist' | 'orders' | 'profile';

export default function CustomerPanel({ currentUser, onLogout, showToast, setCurrentUser }: CustomerPanelProps) {
  const [activeMode, setActiveMode] = useState<ModeType>('shop');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    // Synchronize global simulation flag for testing suite compatibility
    (window as any).isLoggedIn = currentUser !== null;
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Lists
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Shopper State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<'default' | 'priceAsc' | 'priceDesc' | 'name'>('default');
  const [layoutMode, setLayoutMode] = useState<'cozy' | 'compact' | 'list'>('cozy');

  // Gemini Visual Search States
  const [isVisualSearching, setIsVisualSearching] = useState(false);
  const [visualSearchPreview, setVisualSearchPreview] = useState<string | null>(null);
  const [visualSearchMeta, setVisualSearchMeta] = useState<{
    query: string;
    category: string;
    tags: string[];
    description: string;
  } | null>(null);

  // Cart & Wishlist state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistProductIds, setWishlistProductIds] = useState<string[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Profile Form state
  const [profileName, setProfileName] = useState(currentUser ? currentUser.name : '');
  const [profileAddress, setProfileAddress] = useState(currentUser ? currentUser.shippingAddress || '' : '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // Checkout modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutAddress, setCheckoutAddress] = useState(currentUser ? currentUser.shippingAddress || '' : '');
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_transfer'>('mobile_money');
  const [paymentProvider, setPaymentProvider] = useState<'orange' | 'lonestar'>('orange');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentSenderDetails, setPaymentSenderDetails] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState<string | null>(null);
  const [previewReceiptImage, setPreviewReceiptImage] = useState<string | null>(null);

  // Points & checkout states
  const [usePointsForCheckout, setUsePointsForCheckout] = useState(false);
  const [pointsToApply, setPointsToApply] = useState(0);

  // Mobile menu visibility state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lucky Draw system states
  const [luckyDrawTab, setLuckyDrawTab] = useState<'overview' | 'buy_points' | 'withdraw' | 'direct' | 'history'>('overview');
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResultMsg, setSpinResultMsg] = useState<string | null>(null);
  
  const [pointsPurchaseAmount, setPointsPurchaseAmount] = useState('');
  const [pointsPurchaseProvider, setPointsPurchaseProvider] = useState<'orange' | 'lonestar'>('orange');
  const [pointsPurchaseSender, setPointsPurchaseSender] = useState('');
  const [pointsPurchaseReceipt, setPointsPurchaseReceipt] = useState<string | null>(null);
  const [isSubmittingPointsPurchase, setIsSubmittingPointsPurchase] = useState(false);
  const [pointsPurchases, setPointsPurchases] = useState<PointsPurchase[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [conversionAmount, setConversionAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Direct platform payment states
  const [directPaymentAmount, setDirectPaymentAmount] = useState('');
  const [directPaymentDescription, setDirectPaymentDescription] = useState('Custom Sourcing service');
  const [isSubmittingDirectPayment, setIsSubmittingDirectPayment] = useState(false);

  const [customerSpins, setCustomerSpins] = useState<Spin[]>([]);
  const [latestWinnerAnnouncements, setLatestWinnerAnnouncements] = useState<WinnerAnnouncement[]>([]);
  const [monthlyStatsList, setMonthlyStatsList] = useState<MonthlyStats[]>([]);
  const [allSpinsList, setAllSpinsList] = useState<Spin[]>([]);

  // Customer winnings withdraw states
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAccountDetails, setWithdrawAccountDetails] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Orange MTN mobile money');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [customerWithdrawals, setCustomerWithdrawals] = useState<WithdrawalRequest[]>([]);

  // States for buyer payment method addition requests
  const [isRequestPaymentMethodOpen, setIsRequestPaymentMethodOpen] = useState(false);
  const [requestedMethodName, setRequestedMethodName] = useState('');
  const [requestedMethodDetails, setRequestedMethodDetails] = useState('');
  const [isSubmittingMethodRequest, setIsSubmittingMethodRequest] = useState(false);

  // Platfrom Info Settings
  const [platformSettings, setPlatformSettings] = useState<any>({
    siteName: 'Voya',
  });

  // 1. Listen for deep product link on load
  useEffect(() => {
    if (allProducts && allProducts.length > 0) {
      const params = new URLSearchParams(window.location.search);
      let urlProdId = params.get('productId');
      
      // Fallback check in hash in case search parameter gets modified by reverse proxy
      if (!urlProdId && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        if (hashParams.has('productId')) {
          urlProdId = hashParams.get('productId');
        } else if (hashParams.has('product')) {
          urlProdId = hashParams.get('product');
        } else if (hash.startsWith('prod-')) {
          urlProdId = hash;
        }
      }

      if (urlProdId) {
        const found = allProducts.find(p => p.productId === urlProdId);
        if (found) {
          setSelectedProduct(found);
          setActiveMode('shop');
          setActiveImageIndex(0);
        }
      }
    }
  }, [allProducts]);

  // 2. Continuous URL bar synchronization when shopper opens/closes a product details view
  useEffect(() => {
    if (selectedProduct) {
      const params = new URLSearchParams(window.location.search);
      params.set('productId', selectedProduct.productId);
      const newUrl = window.location.origin + window.location.pathname + '?' + params.toString();
      window.history.replaceState({ productId: selectedProduct.productId }, '', newUrl);
    } else {
      const params = new URLSearchParams(window.location.search);
      if (params.has('productId')) {
        params.delete('productId');
        const searchStr = params.toString();
        const newUrl = window.location.origin + window.location.pathname + (searchStr ? '?' + searchStr : '');
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [selectedProduct]);

  // Auth Modal State Namespace
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGuestRestrictionModal, setShowGuestRestrictionModal] = useState(false);
  const [guestModalActionTarget, setGuestModalActionTarget] = useState('');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot_password' | 'reset_password'>('login');

  const handleDownloadImage = async (url: string, defaultName: string) => {
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Product resource downloaded successfully.', 'success');
        return;
      }

      showToast('Opening secure download pipe...', 'info');
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = defaultName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast('Product resource downloaded successfully.', 'success');
    } catch (err) {
      console.warn("Direct blob download failed, falling back to secure link download redirect:", err);
      const fallbackLink = document.createElement('a');
      fallbackLink.href = url;
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      fallbackLink.download = defaultName;
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
      showToast('Redirected to raw image resource page.', 'info');
    }
  };

  // Custom Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'customer' | 'seller' | 'admin'>('customer');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<'customer' | 'seller'>('customer');
  const [registerStoreName, setRegisterStoreName] = useState('');
  const [registerStoreDesc, setRegisterStoreDesc] = useState('');
  const [registerPayoutEmail, setRegisterPayoutEmail] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [generatedResetCode, setGeneratedResetCode] = useState<string | null>(null);
  const [resetIdentifier, setResetIdentifier] = useState('');

  const [registerPhone, setRegisterPhone] = useState('');
  const [registerReferrerNumber, setRegisterReferrerNumber] = useState('');
  const [profilePhone, setProfilePhone] = useState(currentUser ? currentUser.phoneNumber || '' : '');
  const [profileReferrerNumber, setProfileReferrerNumber] = useState(currentUser ? currentUser.referrerNumber || '' : '');
  const [profileCountryOfResidence, setProfileCountryOfResidence] = useState(currentUser ? currentUser.countryOfResidence || '' : '');

  // Location Form states
  const [locCountry, setLocCountry] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locDistrict, setLocDistrict] = useState('');
  const [locPostalCode, setLocPostalCode] = useState('');
  const [locStreetAddress, setLocStreetAddress] = useState('');
  const [locLat, setLocLat] = useState<number | undefined>(undefined);
  const [locLng, setLocLng] = useState<number | undefined>(undefined);
  const [isLocLoading, setIsLocLoading] = useState(false);

  const categories = [
    'All',
    'Electronics',
    'Apparel & Fashion',
    'Home & Kitchen',
    'Beauty & Personal Care',
    'Automotive',
    'Toys & Hobbies'
  ];

  const loadData = async () => {
    try {
      const prods = await dbGetProducts();
      const shops = await dbGetStores();
      const usrs = await dbGetUsers();
      const settings = await dbGetPlatformSettings() || { siteName: 'Voya' };

      setAllProducts(prods);
      setAllStores(shops);
      setAllUsers(usrs);
      setPlatformSettings(settings);

      if (currentUser) {
        // Load Cart for user from Firestore
        const cart = await dbGetCart(currentUser.userId);
        setCartItems(cart);

        // Load Wishlist for user from Firestore
        const wishlist = await dbGetWishlist(currentUser.userId);
        setWishlistProductIds(wishlist);

        // Load Orders from Firestore
        const ords = await dbGetOrders();
        setUserOrders(ords.filter(o => o.customerId === currentUser.userId));

        // Load Lucky Draw elements
        const spins = await dbGetSpins();
        setAllSpinsList(spins);
        setCustomerSpins(spins.filter(s => s.userId === currentUser.userId));

        const purchases = await dbGetPointsPurchases();
        setPointsPurchases(purchases.filter(p => p.userId === currentUser.userId));

        const announcements = await dbGetWinnerAnnouncements();
        setLatestWinnerAnnouncements(announcements);

        const mStatsList = await dbGetMonthlyStats();
        setMonthlyStatsList(mStatsList);

        const wrs = await dbGetWithdrawalRequests();
        setCustomerWithdrawals(wrs.filter(w => w.sellerId === currentUser.userId));

        const txns = await dbGetTransactions();
        setAllTransactions(txns.filter(t => t.userId === currentUser.userId));
      } else {
        setCartItems([]);
        setWishlistProductIds([]);
        setUserOrders([]);
        setCustomerSpins([]);
        setPointsPurchases([]);
        setLatestWinnerAnnouncements([]);
        setMonthlyStatsList([]);
        setCustomerWithdrawals([]);
        setAllTransactions([]);
      }
    } catch (e) {
      console.warn("Failed to load Voya elements from Firestore, falling back to LocalStorage indices...", e);
      const prods = getLocalStorageData<Product[]>('voya_products', []);
      const shops = getLocalStorageData<Store[]>('voya_stores', []);
      const usrs = getLocalStorageData<User[]>('voya_users', []);
      const settings = getLocalStorageData<PlatformSettings>('voya_platform_settings', { siteName: 'Voya' } as PlatformSettings);

      setAllProducts(prods);
      setAllStores(shops);
      setAllUsers(usrs);
      setPlatformSettings(settings);

      if (currentUser) {
        // Fallback for cart
        const cartsObj = getLocalStorageData<Record<string, CartItem[]>>('voya_carts', {});
        setCartItems(cartsObj[currentUser.userId] || []);

        // Fallback for wishlist
        const wishlistsObj = getLocalStorageData<Record<string, string[]>>('voya_wishlists', {});
        setWishlistProductIds(wishlistsObj[currentUser.userId] || []);

        // Fallback for orders
        const ords = getLocalStorageData<Order[]>('voya_orders', []);
        setUserOrders(ords.filter(o => o.customerId === currentUser.userId));

        // Fallback for Lucky Draw elements
        const spins = getLocalStorageData<Spin[]>('voya_spins', []);
        setAllSpinsList(spins);
        setCustomerSpins(spins.filter(s => s.userId === currentUser.userId));

        const purchases = getLocalStorageData<PointsPurchase[]>('voya_points_purchases', []);
        setPointsPurchases(purchases.filter(p => p.userId === currentUser.userId));

        const announcements = getLocalStorageData<WinnerAnnouncement[]>('voya_winner_announcements', []);
        setLatestWinnerAnnouncements(announcements);

        const mStatsList = getLocalStorageData<MonthlyStats[]>('voya_monthly_stats', []);
        setMonthlyStatsList(mStatsList);

        const wrs = getLocalStorageData<WithdrawalRequest[]>('voya_withdrawal_requests', []);
        setCustomerWithdrawals(wrs.filter(w => w.sellerId === currentUser.userId));
      } else {
        setCartItems([]);
        setWishlistProductIds([]);
        setUserOrders([]);
        setCustomerSpins([]);
        setPointsPurchases([]);
        setLatestWinnerAnnouncements([]);
        setMonthlyStatsList([]);
        setCustomerWithdrawals([]);
      }
    }
  };

  const handleImageSearchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast('Uploading & analyzing photo via Gemini...', 'info');
    setIsVisualSearching(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setVisualSearchPreview(base64String);

      try {
        const res = await fetch('/api/gemini/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64String }),
        });

        const data = await res.json();
        if (res.ok && data.query) {
          setVisualSearchMeta({
            query: data.query,
            category: data.category,
            tags: data.tags || [],
            description: data.description || '',
          });
          setSearchQuery(data.query);
          if (data.category) {
            setSelectedCategory(data.category);
          }
          showToast(`Gemini identified: "${data.query}". Listing matches.`, 'success');
        } else {
          let errorMessage = data.error || 'The visual model was unable to parse this image.';
          if (data.isMissingKey) {
            errorMessage = 'Gemini API is unavailable. Please verify GEMINI_API_KEY inside your Secrets panel.';
          }
          throw new Error(errorMessage);
        }
      } catch (err: any) {
        console.error('Gemini image search failed:', err);
        showToast(err.message || 'Error processing visual search.', 'error');
        setVisualSearchPreview(null);
        setVisualSearchMeta(null);
      } finally {
        setIsVisualSearching(false);
      }
    };

    reader.onerror = () => {
      showToast('Error reading the local image file.', 'error');
      setIsVisualSearching(false);
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearVisualSearch = () => {
    setVisualSearchPreview(null);
    setVisualSearchMeta(null);
    setSearchQuery('');
    setSelectedCategory('All');
    showToast('Visual search filter reset.', 'info');
  };

  useEffect(() => {
    // 1. Real-time products sync for customers
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((docSnap) => {
        prods.push(docSnap.data() as Product);
      });
      if (prods.length > 0) {
        setAllProducts(prods);
        setLocalStorageData('voya_products', prods);
      }
    }, (error) => {
      console.warn("Real-time products snapshot failed in CustomerPanel:", error);
    });

    // 2. Real-time stores sync for customers
    const unsubStores = onSnapshot(collection(db, 'stores'), (snapshot) => {
      const shops: Store[] = [];
      snapshot.forEach((docSnap) => {
        shops.push(docSnap.data() as Store);
      });
      if (shops.length > 0) {
        setAllStores(shops);
        setLocalStorageData('voya_stores', shops);
      }
    }, (error) => {
      console.warn("Real-time stores snapshot failed in CustomerPanel:", error);
    });

    // 3. Real-time orders sync for customers
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ords: Order[] = [];
      snapshot.forEach((docSnap) => {
        ords.push(docSnap.data() as Order);
      });
      setLocalStorageData('voya_orders', ords);
      if (currentUser) {
        setUserOrders(ords.filter(o => o.customerId === currentUser.userId));
      }
    }, (error) => {
      console.warn("Real-time orders snapshot failed in CustomerPanel:", error);
    });

    return () => {
      unsubProducts();
      unsubStores();
      unsubOrders();
    };
  }, [currentUser]);

  useEffect(() => {
    loadData();
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileAddress(currentUser.shippingAddress || '');
      setCheckoutAddress(currentUser.shippingAddress || '');
      setProfilePhone(currentUser.phoneNumber || '');
      setProfileReferrerNumber(currentUser.referrerNumber || '');
      setProfileCountryOfResidence(currentUser.countryOfResidence || '');
      if (currentUser.location) {
        setLocCountry(currentUser.location.country || '');
        setLocCity(currentUser.location.city || '');
        setLocDistrict(currentUser.location.district || '');
        setLocPostalCode(currentUser.location.postalCode || '');
        setLocStreetAddress(currentUser.location.streetAddress || '');
        setLocLat(currentUser.location.lat);
        setLocLng(currentUser.location.lng);
      }
    } else {
      setProfileName('');
      setProfileAddress('');
      setCheckoutAddress('');
      setProfilePhone('');
      setProfileReferrerNumber('');
      setProfileCountryOfResidence('');
      setActiveMode('landing');
    }
  }, [currentUser]);

  // Sync state helpers
  const syncCart = async (newCart: CartItem[]) => {
    setCartItems(newCart);
    if (currentUser) {
      try {
        await dbSaveCart(currentUser.userId, newCart);
      } catch (e) {
        console.warn("Failed to save cart to Firestore", e);
      }
    }
  };

  const syncWishlist = async (newWishlist: string[]) => {
    setWishlistProductIds(newWishlist);
    if (currentUser) {
      try {
        await dbSaveWishlist(currentUser.userId, newWishlist);
      } catch (e) {
        console.warn("Failed to save wishlist to Firestore", e);
      }
    }
  };

  // CART WORKFLOW FUNCTIONS
  const handleAddToCart = (productId: string, e?: React.MouseEvent, chosenSize?: string) => {
    if (e) e.stopPropagation();

    if (!currentUser) {
      showToast('Please login or register to purchase items on Voya.', 'info');
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }

    const product = allProducts.find(p => p.productId === productId);
    if (!product) return;

    if (product.stock <= 0) {
      showToast('This product is currently out of stock.', 'error');
      return;
    }

    // Determine the size being added
    const finalSize = chosenSize || selectedSize;
    if (product.sizes && product.sizes.length > 0) {
      if (!finalSize) {
        // Automatically pivot view and open this item details so they select size
        setSelectedProduct(product);
        setSelectedSize('');
        showToast('Please select a size first!', 'info');
        return;
      }
    }

    const itemIndex = cartItems.findIndex(item => 
      item.productId === productId && item.size === finalSize
    );
    let updatedCart = [...cartItems];

    if (itemIndex > -1) {
      // Check stock limit
      if (updatedCart[itemIndex].quantity >= product.stock) {
        showToast(`Cannot add more than ${product.stock} items (stock limit).`, 'error');
        return;
      }
      updatedCart[itemIndex].quantity += 1;
    } else {
      updatedCart.push({ productId, quantity: 1, size: finalSize || undefined });
    }

    syncCart(updatedCart);
    showToast(`Added "${product.name}"${finalSize ? ` (${finalSize})` : ''} to cart!`, 'success');
    setSelectedSize(''); // Reset choice for next action
  };

  const handleUpdateCartQuantity = (productId: string, delta: number, size?: string) => {
    const product = allProducts.find(p => p.productId === productId);
    if (!product) return;

    const itemIndex = cartItems.findIndex(item => item.productId === productId && item.size === size);
    if (itemIndex === -1) return;

    let updatedCart = [...cartItems];
    const newQty = updatedCart[itemIndex].quantity + delta;

    if (newQty <= 0) {
      updatedCart.splice(itemIndex, 1);
    } else {
      if (newQty > product.stock) {
        showToast(`Cannot add more than ${product.stock} items (stock limit).`, 'error');
        return;
      }
      updatedCart[itemIndex].quantity = newQty;
    }

    syncCart(updatedCart);
  };

  const handleRemoveFromCart = (productId: string, size?: string) => {
    const updatedCart = cartItems.filter(item => !(item.productId === productId && item.size === size));
    syncCart(updatedCart);
    showToast('Item removed from cart.', 'info');
  };

  // WISHLIST WORKFLOW FUNCTIONS
  const handleToggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!currentUser) {
      showToast('Please login or register to save items to your wishlist.', 'info');
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }

    const product = allProducts.find(p => p.productId === productId);
    if (!product) return;

    let updatedWishlist = [...wishlistProductIds];
    const index = updatedWishlist.indexOf(productId);

    if (index > -1) {
      updatedWishlist.splice(index, 1);
      showToast(`Removed "${product.name}" from wishlist.`, 'info');
    } else {
      updatedWishlist.push(productId);
      showToast(`Added "${product.name}" to wishlist.`, 'success');
    }

    syncWishlist(updatedWishlist);
  };

  // CHECKOUT WORKFLOW FUNCTIONS
  const calculateItemShippingFee = (product: Product, quantity: number): number => {
    // Replaced standard 45 RMB/kg and 30-day free logic with a uniform USD Express Delivery rate of $5.99 per quantity
    return 5.99 * quantity;
  };

  const handleProceedToCheckout = () => {
    if (!currentUser) {
      showToast('Please login or register to check out items.', 'info');
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }

    // Sourcing restriction lock on checkout bypassed as requested by user
    if (false && currentUser.role === 'customer' && !currentUser.location) {
      showToast('Mandatory Location Setup first! Redirecting...', 'error');
      return;
    }

    if (cartItems.length === 0) {
      showToast('Your shopping cart is empty.', 'error');
      return;
    }
    setCheckoutAddress(profileAddress || currentUser.shippingAddress || '');
    setPaymentMethod('mobile_money');
    setPaymentReference('');
    setPaymentSenderDetails('');
    setIsCheckoutOpen(true);
  };

  const handleRequestPaymentMethodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedMethodName.trim()) {
      showToast('Please specify the payment method you want us to add.', 'error');
      return;
    }
    
    setIsSubmittingMethodRequest(true);
    try {
      const newRequest: BuyerPaymentRequest = {
        id: 'bpmr_' + Math.random().toString(36).substring(2, 11),
        customerId: currentUser ? currentUser.userId : 'anonymous',
        customerName: currentUser ? currentUser.name : 'Unregistered Guest',
        customerEmail: currentUser ? currentUser.email : 'guest@voya-shop.com',
        requestedMethod: requestedMethodName,
        details: requestedMethodDetails,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      await dbSaveBuyerPaymentRequest(newRequest);
      showToast(`Thank you! Your request to include "${requestedMethodName}" has been received. Our administrative sourcing desk is working on integration!`, 'success');
      
      setRequestedMethodName('');
      setRequestedMethodDetails('');
      setIsRequestPaymentMethodOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(`Database write failed: ${err.message}`, 'error');
    } finally {
      setIsSubmittingMethodRequest(false);
    }
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkoutAddress) {
      showToast('Please specify a delivery cargo location', 'error');
      return;
    }

    const totalFreight = cartItems.reduce((acc, cartItem) => {
      const p = allProducts.find(product => product.productId === cartItem.productId);
      if (!p) return acc;
      return acc + calculateItemShippingFee(p, cartItem.quantity);
    }, 0);
    const grandCartTotal = cartSubtotal + totalFreight;

    const actualPointsApplied = usePointsForCheckout 
      ? Math.min(grandCartTotal, currentUser?.pointsBalance || 0, pointsToApply) 
      : 0;

    const netRemainingLrd = Math.max(0, grandCartTotal - actualPointsApplied);

    if (netRemainingLrd > 0) {
      if (!paymentReceipt) {
        showToast('Please upload your mobile money transfer receipt screenshot/photo to complete checkout.', 'error');
        return;
      }

      if (!paymentReference.trim()) {
        showToast('Please provide the Mobile money transfer Ref / Transaction ID to verify payment.', 'error');
        return;
      }

      if (!paymentSenderDetails.trim()) {
        showToast('Please provide your Mobile Wallet Number (Sender mobile number) to verify.', 'error');
        return;
      }
    }

    // Process checkout:
    // Sort items by store id and create a separate order per store since this is multi-vendor!
    const updatedProducts = [...allProducts];

    // Group cart items by storeId
    const storeGroups: Record<string, CartItem[]> = {};
    cartItems.forEach(item => {
      const prod = allProducts.find(p => p.productId === item.productId);
      if (!prod) return;
      if (!storeGroups[prod.storeId]) {
        storeGroups[prod.storeId] = [];
      }
      storeGroups[prod.storeId].push(item);
    });

    let finalReceiptUrl = '';
    if (netRemainingLrd > 0 && paymentReceipt) {
      try {
        const receiptUploadId = `receipt-${Date.now()}`;
        finalReceiptUrl = await uploadImageToStorage(`receipts/${receiptUploadId}`, paymentReceipt);
      } catch (err) {
        console.warn("Receipt upload fell back to storage state:", err);
        finalReceiptUrl = paymentReceipt;
      }
    }

    const newOrders: Order[] = [];
    let pointsRemainingToDistribute = actualPointsApplied;
    const storeEntries = Object.entries(storeGroups);

    // Create order sheets
    for (let i = 0; i < storeEntries.length; i++) {
      const [storeId, itemsInGroup] = storeEntries[i];
      const orderId = `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const orderItems: OrderItem[] = [];
      let groupTotal = 0;
      let groupShippingFee = 0;

      // Subtract items from total store stock & assemble order items
      itemsInGroup.forEach(cartItem => {
        const prod = updatedProducts.find(p => p.productId === cartItem.productId);
        if (!prod) return;

        // Subtract stock
        prod.stock = Math.max(0, prod.stock - cartItem.quantity);

        const itemShippingFee = calculateItemShippingFee(prod, cartItem.quantity);
        groupShippingFee += itemShippingFee;

        orderItems.push({
          productId: prod.productId,
          name: prod.name,
          price: prod.price,
          quantity: cartItem.quantity,
          size: cartItem.size,
          weight: prod.weight || undefined,
          shippingFee: itemShippingFee,
        });

        groupTotal += prod.price * cartItem.quantity;
      });

      // Total of order includes subtotal and its shipping fee portion
      const grandStoreTotal = groupTotal + groupShippingFee;

      // Distribute points proportionally or directly
      let orderPointsApplied = 0;
      if (actualPointsApplied > 0) {
        if (i === storeEntries.length - 1) {
          orderPointsApplied = pointsRemainingToDistribute;
        } else {
          orderPointsApplied = Math.min(
            pointsRemainingToDistribute,
            Math.round((grandStoreTotal / grandCartTotal) * actualPointsApplied)
          );
          pointsRemainingToDistribute -= orderPointsApplied;
        }
      }

      const orderNetTotal = Math.max(0, grandStoreTotal - orderPointsApplied);

      const order: Order = {
        orderId,
        customerId: currentUser ? currentUser.userId : '',
        storeId,
        items: orderItems,
        total: orderNetTotal,
        originalTotal: grandStoreTotal,
        pointsApplied: orderPointsApplied,
        status: orderNetTotal === 0 ? 'processing' : 'pending', // Auto-processed if fully points-paid!
        shippingAddress: checkoutAddress,
        createdAt: new Date().toISOString(),
        shipping_fee: groupShippingFee,
        paymentMethod: orderNetTotal === 0 ? 'none' : 'mobile_money',
        paymentReference: orderNetTotal === 0 ? 'POINTS-PAID' : paymentReference,
        paymentSenderDetails: orderNetTotal === 0 ? 'POINTS-PAID' : paymentSenderDetails,
        paymentReceipt: (orderNetTotal === 0 ? '' : finalReceiptUrl) || undefined,
        paymentProvider: orderNetTotal === 0 ? 'Points Wallet' : (paymentProvider === 'orange' ? 'Orange Mobile Money' : 'Lonestar Mobile Money'),
      };

      newOrders.push(order);
    }

    try {
      // Deduct applied points from current user
      if (currentUser && actualPointsApplied > 0) {
        const updatedCurrentUser = {
          ...currentUser,
          pointsBalance: Math.max(0, (currentUser.pointsBalance || 0) - actualPointsApplied)
        };
        await dbSaveUser(updatedCurrentUser);
        setCurrentUser(updatedCurrentUser);
      }

      // Save all orders inside Firestore
      for (const order of newOrders) {
        await dbSaveOrder(order);

        // Find corresponding store to fetch vendor ID and dispatch payment receipt notification
        const matchingStore = allStores.find(sh => sh.storeId === order.storeId);
        const targetSellerId = matchingStore ? matchingStore.sellerId : '';
        if (targetSellerId) {
          const notif: SellerNotification = {
            id: 'notif_' + Math.random().toString(36).substring(2, 11),
            sellerId: targetSellerId,
            productName: `New Order Receipt #${order.orderId}`,
            type: 'payment',
            message: `A customer has processed checkout via ${order.paymentProvider} for Order #${order.orderId} (LRD ${order.total.toFixed(2)} remaining net, LRD ${order.pointsApplied || 0} paid via points).`,
            createdAt: new Date().toISOString(),
            read: false,
          };
          await dbSaveNotification(notif);
        }
      }

      // Save updated products inside Firestore
      for (const prod of updatedProducts) {
        await dbSaveProduct(prod);
      }

      // Empty Cart inside Firestore and view
      await syncCart([]);
      
      // Load and synchronize state
      await loadData();
      
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setSelectedProduct(null);
      setPaymentReceipt(null);
      setPaymentReference('');
      setPaymentSenderDetails('');
      setUsePointsForCheckout(false);
      setPointsToApply(0);

      // Trigger orders page
      setActiveMode('orders');
      showToast('Platform transaction successful! Your order sheets have been dispatch to vendors with waybill shipping computations.', 'success');
    } catch (e) {
      console.error("Failed to commit final checkout transactions:", e);
      showToast("Logistics processing failed. Please check connection.", "error");
    }
  };

  // PROFILE MANAGEMENT FUNCTIONS
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    showToast('Uploading profile picture straight to storage...', 'info');
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const uploadedUrl = await uploadImageToStorage(`users/${currentUser.userId}/avatar`, base64);
      setProfileAvatar(uploadedUrl);

      // Update straight to database on snapshot
      const updatedUser: User = {
        ...currentUser,
        profilePicture: uploadedUrl
      };
      await dbSaveUser(updatedUser);
      setCurrentUser(updatedUser);
      showToast('Profile image uploaded and synced to database!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to upload profile image directly.', 'error');
    }
  };

  const handleUploadOrderReceipt = async (orderId: string, base64Image: string) => {
    try {
      showToast('Uploading order receipt screenshot...', 'info');
      const orderToUpdate = orders.find(ord => ord.orderId === orderId);
      if (!orderToUpdate) {
        showToast('Order not found.', 'error');
        return;
      }

      const permanentUrl = await uploadImageToStorage(`receipts/${orderId}`, base64Image);
      
      const updatedOrder = {
        ...orderToUpdate,
        paymentReceipt: permanentUrl,
      };

      await dbSaveOrder(updatedOrder);
      await loadData();
      showToast('Payment receipt updated successfully!', 'success');
    } catch (err) {
      console.error("Error updating order receipt:", err);
      showToast('Failed to save receipt image.', 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      // Build formatted physical waybill dispatch address representation
      const formattedAddress = locStreetAddress 
        ? `${locStreetAddress}, ${locDistrict ? `${locDistrict}, ` : ''}${locCity}, ${locCountry} - ${locPostalCode}`
        : profileAddress;

      let finalAvatarUrl = profileAvatar || currentUser.profilePicture;
      if (profileAvatar && profileAvatar.startsWith('data:image')) {
        // Backup upload logic in case it failed previously
        showToast('Scanning and uploading image to Firebase bucket...', 'info');
        finalAvatarUrl = await uploadImageToStorage(`users/${currentUser.userId}/avatar`, profileAvatar);
        setProfileAvatar(finalAvatarUrl);
      }

      const updated: User = {
        ...currentUser,
        name: profileName,
        shippingAddress: formattedAddress,
        profilePicture: finalAvatarUrl,
        phoneNumber: profilePhone || undefined,
        referrerNumber: profileReferrerNumber || undefined,
        countryOfResidence: profileCountryOfResidence || undefined,
        location: {
          country: locCountry,
          city: locCity,
          district: locDistrict,
          postalCode: locPostalCode,
          streetAddress: locStreetAddress,
          lat: locLat,
          lng: locLng,
        }
      };
      
      if (profilePassword) {
        updated.password = profilePassword;
      }

      // Save user to Firestore
      await dbSaveUser(updated);

      // Save user temporarily in session
      localStorage.setItem('voya_active_session', JSON.stringify(updated));

      // Refresh global currentUser inside app state immediately
      setCurrentUser(updated);

      // Refresh local elements
      await loadData();

      setProfilePassword('');
      showToast('Shopper credentials verified and profile updated!', 'success');
    } catch (err) {
      console.error("Failed to update user profile in Firestore", err);
      showToast("Profile check occurred an error. Check secure rules.", "error");
    }
  };

  // FETCH STORE INFORMATION
  const getStoreName = (storeId: string) => {
    const store = allStores.find(s => s.storeId === storeId);
    return store ? store.storeName : 'Voya Verified Store';
  };

  // FILTERED CATALOG LOGIC
  // Products must only belong to APPROVED/NOT-BLOCKED sellers! This is critical for marketplace reliability.
  const approvedStoreIds = allStores.filter(s => {
    const seller = allUsers.find(u => u.userId === s.sellerId);
    return s.approved && seller && !seller.blocked;
  }).map(s => s.storeId);

  const activeProducts = allProducts.filter(p => 
    approvedStoreIds.includes(p.storeId) && 
    (!p.status || p.status === 'approved')
  );

  const filteredProducts = activeProducts.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'priceAsc') return a.price - b.price;
    if (sortBy === 'priceDesc') return b.price - a.price;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0; // Return in default synced firestore array structure
  });

  // Calculate order counts & total sums
  const orders = currentUser
    ? userOrders
    : [];

  // Cart helper Calculations
  const cartSubtotal = cartItems.reduce((acc, cartItem) => {
    const p = allProducts.find(product => product.productId === cartItem.productId);
    return acc + (p ? p.price * cartItem.quantity : 0);
  }, 0);

  // ---------------------------------------------------------------------------
  // LUCKY DRAW HANDLERS
  // ---------------------------------------------------------------------------
  const luckyDrawPrizesList = [
    { name: 'Double Points! (3000 Pts)', color: '#fbbf24', value: 3000 },
    { name: 'Try Again (0 Pts)', color: '#94a3b8', value: 0 },
    { name: '500 Progress Pts', color: '#10b981', value: 500 },
    { name: '1000 Progress Pts', color: '#3b82f6', value: 1000 },
    { name: 'Try Again (0 Pts)', color: '#64748b', value: 0 },
    { name: '1500 Progress Pts', color: '#8b5cf6', value: 1500 },
    { name: 'Try Again (0 Pts)', color: '#94a3b8', value: 0 },
    { name: '500 Progress Pts', color: '#10b981', value: 500 },
    { name: 'Try Again (0 Pts)', color: '#64748b', value: 0 },
    { name: '1000 Progress Pts', color: '#3b82f6', value: 1000 },
    { name: 'Try Again (0 Pts)', color: '#94a3b8', value: 0 },
    { name: 'Try Again (0 Pts)', color: '#e2e8f0', value: 0 }
  ];

  const handleLuckyDrawSpin = async (isFree: boolean) => {
    if (!currentUser) return;
    if (isSpinning) return;

    const spinCost = platformSettings?.luckyDrawSpinCost || 500;

    try {
      if (isFree) {
        // Find if user already used their free monthly spin
        const currentMonthYear = new Date().toISOString().substring(0, 7); // "YYYY-MM"
        const existingFreeSpin = customerSpins.find(spin => 
          spin.isFree && spin.createdAt.substring(0, 7) === currentMonthYear
        );
        if (existingFreeSpin) {
          showToast('You have already claimed your FREE spin for this month! Purchase more points to spin.', 'error');
          return;
        }
      } else {
        // Paid spin costs S points
        const points = currentUser.pointsBalance || 0;
        if (points < spinCost) {
          showToast(`Insufficient points! Convert your Savings to Points (cost = ${spinCost} points per spin).`, 'error');
          return;
        }
      }

      setIsSpinning(true);
      setSpinResultMsg(null);

      // Perform RNG sector land based on exact required probabilities
      // Double (1%), 1500 (5%), 1000 (10%), 500 (20%), Better Luck (64%)
      const rand = Math.random() * 100;
      let prizeIndex = 1; // default to Try Again (index 1)
      let pointsAwarded = 0;

      if (rand < 1) {
        // 1% Double points (index 0)
        prizeIndex = 0;
        pointsAwarded = 3000;
      } else if (rand < 6) {
        // 5% 1500 pts (index 5)
        prizeIndex = 5;
        pointsAwarded = 1500;
      } else if (rand < 16) {
        // 10% 1000 pts (utilizes indices 3 or 9)
        prizeIndex = Math.random() < 0.5 ? 3 : 9;
        pointsAwarded = 1000;
      } else if (rand < 36) {
        // 20% 500 pts (utilizes indices 2 or 7)
        prizeIndex = Math.random() < 0.5 ? 2 : 7;
        pointsAwarded = 500;
      } else {
        // 64% Try Again (utilizes indices 1, 4, 6, 8, 10, 11)
        const tryAgainIndices = [1, 4, 6, 8, 10, 11];
        prizeIndex = tryAgainIndices[Math.floor(Math.random() * tryAgainIndices.length)];
        pointsAwarded = 0;
      }

      const selectedSector = luckyDrawPrizesList[prizeIndex];

      // Calculate degrees targeting selected sector dynamically (each segment spans 30 degrees)
      const currentMod = wheelRotation % 360;
      const targetDegree = wheelRotation + 1800 + (360 - currentMod) - (prizeIndex * 30);
      setWheelRotation(targetDegree);

      // Wait 4.5 seconds for wheel spin animation to finalize
      setTimeout(async () => {
        try {
          let newPointsBalance = currentUser.pointsBalance || 0;
          if (!isFree) {
            newPointsBalance = Math.max(0, newPointsBalance - spinCost);
          }

          // Load other users to calculate current active winners count precisely
          const usrs = await dbGetUsers();
          const currentWinners = usrs.filter(u => u.isWinnerThisMonth);
          const numWinners = currentWinners.length;

          let currentProgress = currentUser.monthlyProgress || 0;
          let newProgress = currentProgress + pointsAwarded;

          let isWinnerNow = currentUser.isWinnerThisMonth || false;
          let newRank = currentUser.winnerRank || undefined;
          let newPrize = currentUser.winnerPrize || undefined;
          let reachedAt = currentUser.winnerReachedAt || undefined;
          let newWithdrawableBalance = currentUser.withdrawableBalance || 0;

          if (newProgress >= 3000) {
            newProgress = 3000; // clamp monthly target
            if (!isWinnerNow) {
              if (numWinners < 50) {
                isWinnerNow = true;
                newRank = numWinners + 1;
                reachedAt = new Date().toISOString();

                // Assign prize according to ranking tiers
                if (newRank <= 30) {
                  newPrize = 1000; // 30 winners -> 1,000 LRD each
                } else if (newRank <= 45) {
                  newPrize = 2500; // 15 winners -> 2,500 LRD each
                } else {
                  newPrize = 10000; // 5 winners -> 10,000 LRD each
                }

                // Add prize cash directly to available withdrawable balance and account balance (synced)
                newWithdrawableBalance += newPrize;

                // Send instant notification
                await dbSaveNotification({
                  id: 'win_' + Date.now(),
                  sellerId: currentUser.userId,
                  productName: 'Lucky Draw Jackpot',
                  type: 'general',
                  message: `🎉 CONGRATULATIONS! You hit 3,000 progress points and captured spot #${newRank}! We have instantly added LRD ${newPrize.toLocaleString()} cash to your Savings Wallet withdrawable ledger!`,
                  createdAt: new Date().toISOString(),
                  read: false
                });

                showToast(`JACKPOT! You placed #${newRank} and won LRD ${newPrize.toLocaleString()}!`, 'success');
              } else {
                showToast(`You reached 3,000 progress points! However, all 50 cash spots are fully taken for this month.`, 'info');
              }
            }
          }

          // Log Spin in collection
          const spinId = 'spin_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          const monthKey = new Date().toISOString().substring(0, 7);
          const spinLog: Spin = {
            id: spinId,
            userId: currentUser.userId,
            username: currentUser.name,
            monthYear: monthKey,
            prizeName: pointsAwarded > 0 ? `+${pointsAwarded} Progress Points` : 'Better luck next time',
            isFree,
            pointsCost: isFree ? 0 : spinCost,
            pointsAwarded,
            progressAfter: newProgress,
            createdAt: new Date().toISOString()
          };

          await dbSaveSpin(spinLog);

          // Build updated user document
          const updatedUser: User = {
            ...currentUser,
            pointsBalance: newPointsBalance,
            monthlyProgress: newProgress,
            isWinnerThisMonth: isWinnerNow,
            winnerRank: newRank,
            winnerPrize: newPrize,
            winnerReachedAt: reachedAt,
            withdrawableBalance: newWithdrawableBalance,
            accountBalance: newWithdrawableBalance // Ensure absolute sync!
          };

          await dbSaveUser(updatedUser);

          // Update session
          localStorage.setItem('voya_active_session', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);

          // Build message outcome
          let alertMsg = '';
          if (pointsAwarded > 0) {
            alertMsg = `🎉 SUCCESS! Your spin awarded +${pointsAwarded.toLocaleString()} progress points! Your monthly progress is now ${newProgress}/3000 points.`;
            if (isWinnerNow && newRank) {
              alertMsg += ` You have officially locked-in spot #${newRank} and earned a cash prize of LRD ${newPrize?.toLocaleString()}!`;
            }
          } else {
            alertMsg = `🍀 Spin completed! You landed on "Try Again". Better luck next spin!`;
          }

          setSpinResultMsg(alertMsg);
          showToast(pointsAwarded > 0 ? `Won +${pointsAwarded} progress points!` : 'Try again!', 'success');

          await loadData();
        } catch (err) {
          console.error("Error finalizing spin:", err);
          showToast("Failed to record spin results.", "error");
        } finally {
          setIsSpinning(false);
        }
      }, 4500);

    } catch (err) {
      console.error("Spin error:", err);
      showToast('Spin execution failed.', 'error');
      setIsSpinning(false);
    }
  };

  const setIsSpningFix = () => {
    setIsSpinning(false);
  };

  const handleConvertSavingsToPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const amount = parseInt(conversionAmount) || 0;
    if (amount <= 0) {
      showToast('Please enter a valid amount of LRD to convert.', 'error');
      return;
    }

    const currentSavings = currentUser.withdrawableBalance || 0;
    if (currentSavings < amount) {
      showToast(`Insufficient Savings Wallet balance! LRD ${currentSavings.toLocaleString()} available.`, 'error');
      return;
    }

    setIsConverting(true);
    try {
      const nextSavings = Math.max(0, currentSavings - amount);
      const nextPoints = (currentUser.pointsBalance || 0) + amount;

      const updatedUser: User = {
        ...currentUser,
        withdrawableBalance: nextSavings,
        accountBalance: nextSavings, // Synchronize
        pointsBalance: nextPoints
      };

      await dbSaveUser(updatedUser);

      await dbSaveNotification({
        id: 'convert_' + Date.now(),
        sellerId: currentUser.userId,
        productName: 'Instant Points Conversion',
        type: 'general',
        message: `Your balance transfer has been processed! Swapped LRD ${amount.toLocaleString()} savings for +${amount.toLocaleString()} Points.`,
        createdAt: new Date().toISOString(),
        read: false
      });

      localStorage.setItem('voya_active_session', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setConversionAmount('');

      showToast(`Converted LRD ${amount.toLocaleString()} to ${amount.toLocaleString()} Points of spinning credits!`, 'success');
      await loadData();
    } catch (err) {
      console.error("Conversion error:", err);
      showToast('Points conversion failed.', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const handleLuckyDrawBuyPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const pointsAmount = parseInt(pointsPurchaseAmount) || 0;
    const minLimit = platformSettings.minDepositLimit ?? 100;
    const maxLimit = platformSettings.maxDepositLimit ?? 100000;

    if (pointsAmount < minLimit) {
      showToast(`Minimum allowed wallet deposit is LRD ${minLimit.toLocaleString()}.`, 'error');
      return;
    }
    if (pointsAmount > maxLimit) {
      showToast(`Maximum allowed wallet deposit limit is LRD ${maxLimit.toLocaleString()}.`, 'error');
      return;
    }
    if (!pointsPurchaseSender) {
      showToast('Please specify sender mobile money number.', 'error');
      return;
    }
    if (!pointsPurchaseReceipt) {
      showToast('Screenshot verification receipt is strictly required.', 'error');
      return;
    }

    setIsSubmittingPointsPurchase(true);
    try {
      const purchaseId = 'pts_' + Date.now();
      const uploadedReceiptUrl = await uploadImageToStorage(`points_purchases/${purchaseId}`, pointsPurchaseReceipt);

      const newPurchase: PointsPurchase = {
        id: purchaseId,
        userId: currentUser.userId,
        username: currentUser.name,
        amountLrd: pointsAmount, // 1 Point = 1 LRD
        receiptImage: uploadedReceiptUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
        paymentProvider: pointsPurchaseProvider === 'orange' ? 'Orange Mobile Money' : 'Lonestar Cell MTN Mobile Money',
        paymentSenderDetails: pointsPurchaseSender
      };

      await dbSavePointsPurchase(newPurchase);
      
      showToast('Points purchase receipt uploaded successfully! Waiting for admin activation.', 'success');
      setPointsPurchaseAmount('');
      setPointsPurchaseSender('');
      setPointsPurchaseReceipt(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Submission failed.', 'error');
    } finally {
      setIsSubmittingPointsPurchase(false);
    }
  };

  const handleCustomerWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const amount = parseFloat(withdrawAmount) || 0;
    const minLimit = platformSettings.minWithdrawalLimit ?? 500;
    const maxLimit = platformSettings.maxWithdrawalLimit ?? 50000;

    if (amount < minLimit) {
      showToast(`Minimum cash withdrawal is LRD ${minLimit.toLocaleString()}.`, 'error');
      return;
    }
    if (amount > maxLimit) {
      showToast(`Maximum cash withdrawal limit per request is LRD ${maxLimit.toLocaleString()}.`, 'error');
      return;
    }
    const currentBalance = currentUser.withdrawableBalance || 0;
    if (amount > currentBalance) {
      showToast(`Insufficient balance! Your available balance is LRD ${currentBalance.toFixed(2)}`, 'error');
      return;
    }
    if (!withdrawAccountDetails) {
      showToast('Please enter mobile wallet receiver account detail name/number.', 'error');
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      const newRequest: WithdrawalRequest = {
        id: 'c_wd_' + Date.now(),
        sellerId: currentUser.userId, // mapped to standard Firebase schema compatibility
        storeId: 'customer_wallet',
        storeName: 'Customer Wallet',
        amount: amount,
        paymentMethod: withdrawMethod,
        accountDetails: withdrawAccountDetails,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Deduct balance
      const nextBalance = currentBalance - amount;
      const updatedUser: User = {
        ...currentUser,
        withdrawableBalance: nextBalance,
        accountBalance: nextBalance
      };

      const txnId = 'tx_wd_' + Date.now();
      const newTxn: Transaction = {
        id: txnId,
        userId: currentUser.userId,
        username: currentUser.name,
        amount: -amount,
        type: 'withdrawal',
        referenceId: newRequest.id,
        remarks: `Requested cash withdrawal via ${withdrawMethod}. status: pending.`,
        timestamp: new Date().toISOString()
      };

      await dbSaveUser(updatedUser);
      await dbSaveWithdrawalRequest(newRequest);
      await dbSaveTransaction(newTxn);

      localStorage.setItem('voya_active_session', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      showToast(`LRD ${amount.toFixed(2)} withdrawn! Request submitted in wait list.`, 'success');
      setWithdrawAmount('');
      setWithdrawAccountDetails('');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Withdrawal submittal failed.', 'error');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const handleDirectPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const amount = parseFloat(directPaymentAmount) || 0;
    if (amount <= 0) {
      showToast('Please enter a valid positive amount in LRD.', 'error');
      return;
    }
    const currentBalance = currentUser.accountBalance || 0;
    if (amount > currentBalance) {
      showToast(`Insufficient balance! Your available balance is LRD ${currentBalance.toLocaleString()}`, 'error');
      return;
    }
    if (!directPaymentDescription.trim()) {
      showToast('Please specify a payment purpose/description.', 'error');
      return;
    }
    setIsSubmittingDirectPayment(true);
    try {
      const nextBalance = currentBalance - amount;
      const updatedUser: User = {
        ...currentUser,
        accountBalance: nextBalance,
        withdrawableBalance: nextBalance
      };

      const txnId = 'dir_' + Date.now();
      const newTxn: Transaction = {
        id: txnId,
        userId: currentUser.userId,
        username: currentUser.name,
        amount: -amount,
        type: 'payment',
        remarks: `Direct Payment: ${directPaymentDescription}`,
        timestamp: new Date().toISOString()
      };

      await dbSaveUser(updatedUser);
      await dbSaveTransaction(newTxn);

      localStorage.setItem('voya_active_session', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      showToast(`LRD ${amount.toLocaleString()} paid successfully to Voya for: ${directPaymentDescription}`, 'success');
      setDirectPaymentAmount('');
      setDirectPaymentDescription('Custom Sourcing service');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Direct payment submission failed.', 'error');
    } finally {
      setIsSubmittingDirectPayment(false);
    }
  };

  const cartTotalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Mandatory Location Setup Screen for customers bypassed at user request
  if (false && currentUser && currentUser.role === 'customer' && !currentUser.location) {
    const handleMandatoryLocationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!locCountry || !locCity || !locStreetAddress || !locPostalCode) {
        showToast('Please fill out all required shipping fields.', 'error');
        return;
      }

      const formattedAddress = `${locStreetAddress}, ${locDistrict ? `${locDistrict}, ` : ''}${locCity}, ${locCountry} - ${locPostalCode}`;
      
      try {
        const nextUser: User = {
          ...currentUser,
          shippingAddress: formattedAddress,
          location: {
            country: locCountry,
            city: locCity,
            district: locDistrict,
            postalCode: locPostalCode,
            streetAddress: locStreetAddress,
            lat: locLat,
            lng: locLng,
          }
        };

        await dbSaveUser(nextUser);
        localStorage.setItem('voya_active_session', JSON.stringify(nextUser));
        setCurrentUser(nextUser);
        showToast('Account setup completed! Sourcing location locked successfully.', 'success');
        setActiveMode('shop');
      } catch (err) {
        console.error(err);
        showToast('Failed to save your location setup.', 'error');
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-lg p-6 space-y-5">
          <div className="text-center space-y-1.5">
            <span className="text-2xl">📍</span>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Lock Mandatory Sourcing Coordinates</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Under strict corporate waybill procedures (Savie’s Enterprise), customers must lock clear physical dispatch coordinates prior to browsing the curated pricing catalog.
            </p>
          </div>

          <form onSubmit={handleMandatoryLocationSubmit} className="space-y-4">
            
            {/* GPS SIMULATOR CONTROL */}
            <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg flex items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-red-600 block uppercase tracking-wider">Fast-track auto setup</span>
                <span className="text-[9px] text-slate-500 font-semibold block">Simulate GPS coordinates instantly</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLocLoading(true);
                  setTimeout(() => {
                    setIsLocLoading(false);
                    setLocCountry('China');
                    setLocCity('Guangzhou');
                    setLocDistrict('Baiyun District');
                    setLocPostalCode('510000');
                    setLocStreetAddress('No. 888 Airport Road, Sourcing Warehouse Block B');
                    setLocLat(23.1291);
                    setLocLng(113.2644);
                    showToast('Simulation complete. Guangzhou Hub GPS waypoints loaded.', 'success');
                  }, 800);
                }}
                disabled={isLocLoading}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[9.5px] uppercase tracking-wider rounded transition-colors disabled:opacity-50 cursor-pointer border-0"
              >
                {isLocLoading ? 'Calibrating...' : 'Simulate GPS'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Country <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={locCountry}
                  onChange={(e) => setLocCountry(e.target.value)}
                  placeholder="China"
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-800 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">City <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={locCity}
                  onChange={(e) => setLocCity(e.target.value)}
                  placeholder="Guangzhou"
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-800 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">District</label>
                <input
                  type="text"
                  value={locDistrict}
                  onChange={(e) => setLocDistrict(e.target.value)}
                  placeholder="Baiyun District"
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-850 bg-white"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Postal Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={locPostalCode}
                  onChange={(e) => setLocPostalCode(e.target.value)}
                  placeholder="510000"
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-800 bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Street Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={locStreetAddress}
                onChange={(e) => setLocStreetAddress(e.target.value)}
                placeholder="No. 888 Airport Road, Warehouse B"
                className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-800 bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">Latitude (lat)</label>
                <input
                  type="number"
                  step="any"
                  value={locLat !== undefined ? locLat : ''}
                  onChange={(e) => setLocLat(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="23.1291"
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-700 bg-white"
                />
              </div>
              <div>
                <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">Longitude (lng)</label>
                <input
                  type="number"
                  step="any"
                  value={locLng !== undefined ? locLng : ''}
                  onChange={(e) => setLocLng(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="113.2644"
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-700 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-widest rounded transition-all cursor-pointer border-0 shadow-md"
            >
              Finalize &amp; Proceed to Catalog &rarr;
            </button>
          </form>

          <button
            type="button"
            onClick={onLogout}
            className="w-full text-center text-xs text-slate-400 hover:text-rose-500 font-bold uppercase transition-colors"
          >
            Cancel and Logout
          </button>
        </div>
      </div>
    );
  }

  // Pre-calculate checkout values for easy visual bindings
  const totalFreight = cartItems.reduce((acc, cartItem) => {
    const p = allProducts.find(product => product.productId === cartItem.productId);
    if (!p) return acc;
    return acc + calculateItemShippingFee(p, cartItem.quantity);
  }, 0);
  const checkoutGrandTotal = cartSubtotal + totalFreight;
  const actualPointsApplied = usePointsForCheckout 
    ? Math.min(checkoutGrandTotal, currentUser?.pointsBalance || 0, pointsToApply) 
    : 0;
  const netRemainingLrd = Math.max(0, checkoutGrandTotal - actualPointsApplied);

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col justify-between ${isMobile ? 'pb-[60px]' : ''}`}>
      
      {/* ================= TESTING STATE CONTROLLER DECK ================= */}
      <div id="dev-controller" className="bg-[#131921] border-b border-[#232f3e] px-4 py-2 text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Status Info */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-slate-100/10 text-slate-100 font-black uppercase tracking-widest text-[9px] px-2.5 py-1 rounded-full border border-gray-700 font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              Testing Deck
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-400">isLoggedIn =</span>
              <span id="current-state-badge" className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${currentUser ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'}`}>
                {currentUser ? 'true' : 'false'}
              </span>
              <span id="state-desc" className="text-slate-400 italic hidden sm:inline">
                {currentUser ? '(Member Mode Active. All details and cart actions enabled!)' : '(Guest Mode Active. All card interactive triggers will redirect to Login Modal popup)'}
              </span>
            </div>
          </div>

          {/* Action Toggles */}
          <div className="flex items-center gap-2">
            {!currentUser ? (
              <button 
                onClick={async () => {
                  try {
                    // Mock Login as buyer
                    const users = await dbGetUsers();
                    const buyer = users.find(u => u.email === 'buyer@savie.com');
                    if (buyer) {
                      setCurrentUser(buyer);
                      localStorage.setItem('voya_active_session', JSON.stringify(buyer));
                      showToast('Mock Login Successful as Emily Watson (buyer)!', 'success');
                      await loadData();
                    } else {
                      showToast('Seeding data not found in Firestore yet.', 'error');
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-3 py-1 bg-emerald-600/30 text-emerald-300 hover:text-white rounded border border-emerald-500/20 text-[10.5px] uppercase font-bold tracking-widest transition-all cursor-pointer font-sans"
              >
                Mock Login (isLoggedIn = true)
              </button>
            ) : (
              <button 
                onClick={onLogout}
                className="px-3 py-1 bg-red-600/30 text-rose-300 hover:text-white rounded border border-rose-500/20 text-[10.5px] uppercase font-bold tracking-widest transition-all cursor-pointer font-sans"
              >
                Mock Logout (isLoggedIn = false)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SHINY ANIMATED HEADING MOVING BANNER */}
      <div className="bg-[#ff6600] text-white overflow-hidden py-1.5 px-4 text-center font-bold text-xs uppercase tracking-widest relative select-none border-b border-[#dd5500]">
        <motion.div
          animate={{ x: ["-15%", "15%"] }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 8,
            ease: "easeInOut"
          }}
          className="inline-block whitespace-nowrap font-black"
        >
          🎁 Free shipping for 45 days! Direct factory dispatch exclusively for Liberia 🎁
        </motion.div>
      </div>

      {/* SHOPPING HEADER BAR */}
      <header className="sticky top-0 bg-white border-b border-slate-200 p-2.5 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveMode('shop'); setSelectedCategory('All'); }}>
            <VoyaLogo light={true} className="scale-95" />
            <div className="border-l border-slate-200 pl-2 ml-1">
              <span className="font-bold text-xs tracking-tight text-slate-800 block leading-tight">Voya Direct</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Sourcing Hub</span>
            </div>
          </div>

          {/* GENERAL MODES NAV */}
          <nav className="hidden md:flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase">
            <button 
              onClick={() => { setActiveMode('landing'); setSelectedProduct(null); }}
              className={`px-2 py-1 rounded transition-all cursor-pointer ${activeMode === 'landing' ? 'text-red-655 bg-red-50' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              Portal Landing
            </button>
            <button 
              onClick={() => { setActiveMode('shop'); setSelectedProduct(null); }}
              className={`px-2 py-1 rounded transition-all cursor-pointer ${activeMode === 'shop' ? 'text-red-655 bg-red-50' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              Curated Catalog
            </button>
            <button 
              onClick={() => {
                if (!currentUser) {
                  showToast('Please login or register to access your wishlist.', 'info');
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                  return;
                }
                setActiveMode('wishlist');
                setSelectedProduct(null);
              }}
              className={`px-2 py-1 rounded transition-all cursor-pointer ${activeMode === 'wishlist' ? 'text-red-350 bg-red-50' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              Wishlist ({wishlistProductIds.length})
            </button>
            <button 
              onClick={() => {
                if (!currentUser) {
                  showToast('Please login or register to access your orders.', 'info');
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                  return;
                }
                setActiveMode('orders');
                setSelectedProduct(null);
              }}
              className={`px-2 py-1 rounded transition-all cursor-pointer ${activeMode === 'orders' ? 'text-red-350 bg-red-50' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              My Orders ({orders.length})
            </button>
            <button 
              onClick={() => {
                if (!currentUser) {
                  showToast('Please login or register to access your personal wallet.', 'info');
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                  return;
                }
                setActiveMode('lucky_draw');
                setSelectedProduct(null);
              }}
              className={`px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${activeMode === 'lucky_draw' ? 'text-emerald-700 bg-emerald-50 font-black' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
              {currentUser ? `Balance: LRD ${(currentUser?.accountBalance || 0).toLocaleString()}` : "My Balance"}
            </button>
          </nav>

          {/* USER CONTROLS */}
          <div className="flex items-center gap-2">
            {/* CART TOGGLER BUTTON */}
            <button
              onClick={() => {
                if (!currentUser) {
                  showToast('Please login or register to access the shopping cart.', 'info');
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                } else {
                  setIsCartOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-red-600 hover:bg-red-705 text-white font-bold text-xs transition-colors relative cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase text-[9px] tracking-wider">Cart</span>
              <span className="bg-white text-red-600 font-extrabold text-[10px] px-1.5 py-0.2 rounded ml-1">
                {cartTotalItems}
              </span>
            </button>

            {currentUser ? (
              <>
                <button
                  onClick={() => setActiveMode('profile')}
                  className="hidden md:block w-7 h-7 rounded border border-slate-200 overflow-hidden shrink-0 cursor-pointer bg-white"
                  title="Manage Profile"
                >
                  <img src={currentUser.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} alt="avatar" className="w-full h-full object-cover" />
                </button>

                <button
                  onClick={onLogout}
                  className="hidden md:block p-1.5 rounded bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer border border-slate-200"
                  title="Logout from Account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 font-bold text-[10px] uppercase">
                <button
                  onClick={() => { setAuthModalMode('login'); setShowAuthModal(true); }}
                  className="px-2.5 py-1.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  Login
                </button>
                <button
                  onClick={() => { setAuthModalMode('register'); setShowAuthModal(true); }}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer transition-all"
                >
                  Register
                </button>
              </div>
            )}

            {/* HAMBURGER TOGGLE BUTTON FOR MOBILE */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 rounded text-slate-650 hover:bg-slate-100 cursor-pointer transition-all border border-slate-200 inline-flex items-center justify-center animate-fade-in"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </header>

      {/* PROFESSIONAL MOBILE MENU DRAWER */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end" id="mobile-nav-overlay">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-5 border-l border-slate-100"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-1.5">
                  <VoyaLogo light={true} className="scale-90" />
                  <div className="border-l border-slate-205 pl-2 ml-0.5">
                    <span className="font-extrabold text-[11px] text-slate-800 block uppercase tracking-tight">Voya Direct</span>
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider block">Sourcing Hub</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-all cursor-pointer border border-slate-100"
                  id="mobile-nav-close-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Links List */}
              <nav className="flex flex-col gap-1.5 mt-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <button 
                  onClick={() => { setActiveMode('landing'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-lg transition-all cursor-pointer text-left w-full ${activeMode === 'landing' ? 'text-red-600 bg-red-50 font-extrabold' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <Home className="w-4 h-4" />
                  Portal Landing
                </button>
                <button 
                  onClick={() => { setActiveMode('shop'); setSelectedProduct(null); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-lg transition-all cursor-pointer text-left w-full ${activeMode === 'shop' ? 'text-red-600 bg-red-50 font-extrabold' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <Compass className="w-4 h-4" />
                  Curated Catalog
                </button>
                <button 
                  onClick={() => {
                    if (!currentUser) {
                      showToast('Please login or register to access your wishlist.', 'info');
                      setAuthModalMode('login');
                      setShowAuthModal(true);
                      setIsMobileMenuOpen(false);
                      return;
                    }
                    setActiveMode('wishlist');
                    setSelectedProduct(null);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-lg transition-all cursor-pointer text-left w-full ${activeMode === 'wishlist' ? 'text-red-600 bg-red-50 font-extrabold' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <Heart className="w-4 h-4" />
                  Wishlist ({wishlistProductIds.length})
                </button>
                <button 
                  onClick={() => {
                    if (!currentUser) {
                      showToast('Please login or register to access your orders.', 'info');
                      setAuthModalMode('login');
                      setShowAuthModal(true);
                      setIsMobileMenuOpen(false);
                      return;
                    }
                    setActiveMode('orders');
                    setSelectedProduct(null);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-lg transition-all cursor-pointer text-left w-full ${activeMode === 'orders' ? 'text-red-650 bg-red-50 font-extrabold' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <Package className="w-4 h-4" />
                  My Orders ({orders.length})
                </button>
                <button 
                  onClick={() => {
                    if (!currentUser) {
                      showToast('Please login or register to access your personal wallet.', 'info');
                      setAuthModalMode('login');
                      setShowAuthModal(true);
                      setIsMobileMenuOpen(false);
                      return;
                    }
                    setActiveMode('lucky_draw');
                    setSelectedProduct(null);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-lg transition-all cursor-pointer text-left w-full ${activeMode === 'lucky_draw' ? 'text-emerald-700 bg-emerald-50 font-extrabold animate-pulse' : 'hover:bg-slate-50 text-slate-605'}`}
                >
                  <Wallet className="w-4 h-4 text-emerald-505" />
                  {currentUser ? `Balance: LRD ${(currentUser?.accountBalance || 0).toLocaleString()}` : "My Balance"}
                </button>
              </nav>
            </div>

            {/* Profile & Auth Section at bottom */}
            <div className="border-t border-slate-100 pt-4 mt-auto">
              {currentUser ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 px-1 py-0.5">
                    <img 
                      src={currentUser.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} 
                      alt="avatar" 
                      className="w-9 h-9 rounded-full border border-slate-205 object-cover shrink-0" 
                    />
                    <div className="overflow-hidden">
                      <p className="font-extrabold text-slate-805 text-xs truncate leading-tight">{currentUser.name}</p>
                      <p className="text-[9.5px] text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <button
                      onClick={() => { setActiveMode('profile'); setIsMobileMenuOpen(false); }}
                      className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-center transition-all cursor-pointer border border-slate-200"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                      className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-center transition-all cursor-pointer border border-rose-250 font-black"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <button
                    onClick={() => { setAuthModalMode('login'); setShowAuthModal(true); setIsMobileMenuOpen(false); }}
                    className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer text-center transition-all"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setAuthModalMode('register'); setShowAuthModal(true); setIsMobileMenuOpen(false); }}
                    className="w-full py-2.5 bg-slate-900 border border-slate-900 text-white rounded-lg hover:bg-slate-850 cursor-pointer text-center transition-all"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* RENDER BODY FOR CORRESPONDING PLATES */}
      <main className="flex-grow max-w-7xl mx-auto w-full p-2.5 bg-slate-100">
        
        {/* LANDING MODE WITH GUEST WELCOME PORTAL */}
        {activeMode === 'landing' && (
          <div className="space-y-6">
            {/* HERO BANNER SECTION */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 text-white rounded-xl border border-slate-800 overflow-hidden relative shadow-lg p-6 sm:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent opacity-50 pointer-events-none" />
              
              <div className="max-w-2xl relative z-10 space-y-4">
                <span className="inline-flex items-center gap-1.5 bg-red-600/20 text-red-400 font-extrabold uppercase tracking-widest text-[9.5px] px-2.5 py-1 rounded-full border border-red-500/20">
                  Savie&apos;s Enterprise Flagship
                </span>
                
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-none uppercase">
                  Welcome to Voya
                </h1>
                <p className="text-sm text-slate-350 leading-relaxed font-semibold">
                  Global Multi‑Vendor Sourcing Platform powered by Savie’s Enterprise. Direct-from-factory logistics from Guangzhou tech centers and Shenzhen craft estates.
                </p>

                {!currentUser ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => { setAuthModalMode('login'); setShowAuthModal(true); }}
                      className="px-5 py-2.5 bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded transition-all cursor-pointer shadow-md border-0"
                    >
                      Login to Sourcing Account
                    </button>
                    <button
                      onClick={() => { setAuthModalMode('register'); setShowAuthModal(true); }}
                      className="px-5 py-2.5 bg-transparent hover:bg-white/5 border border-slate-700 text-slate-200 font-extrabold text-xs uppercase tracking-wider rounded transition-all cursor-pointer bg-slate-900"
                    >
                      Register New Vendor/Customer
                    </button>
                  </div>
                ) : (
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveMode('shop')}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded transition-all cursor-pointer shadow-xs"
                    >
                      Browse Sourcing Catalog &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* HOW THE PLATFORM WORKS EXPLANATION */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm animate-fade-in">
              <div className="text-center max-w-lg mx-auto space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sourcing Network Matrix</span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Savie&apos;s Enterprise Operations Guide</h2>
                <div className="w-12 h-1 bg-red-650 mx-auto mt-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-lg space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="text-xl">🏬</span>
                    <h3 className="font-extrabold text-slate-850 uppercase tracking-wider mt-1.5">1. Verified Vendors</h3>
                    <p className="text-slate-500 leading-relaxed mt-1">Sellers register their factory waybills directly, uploading quality products specifying original direct factory prices and desired profits.</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-150 rounded-lg space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="text-xl">⚖️</span>
                    <h3 className="font-extrabold text-slate-850 uppercase tracking-wider mt-1.5">2. Secure Admin Autonomy</h3>
                    <p className="text-slate-500 leading-relaxed mt-1">Our platform Administrator acts as a manual reviewer, specifying waybill weights and final pricing structure to ensure fair customer rates.</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-150 rounded-lg space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="text-xl">✈️</span>
                    <h3 className="font-extrabold text-slate-850 uppercase tracking-wider mt-1.5">3. Express Freight Delivery</h3>
                    <p className="text-slate-500 leading-relaxed mt-1">Direct shipping from factory is processed through top express logistics at a standard cost of $5.99 USD, replacing old RMB weight metrics completely!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FEATURED PRODUCTS SHOWCASE SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-red-655 font-black text-sm">🔥</span>
                  <h3 className="font-black text-slate-850 text-xs uppercase tracking-widest">Featured Approved Listings</h3>
                </div>
                <button
                  onClick={() => setActiveMode('shop')}
                  className="text-red-600 hover:text-red-700 font-extrabold text-[10.5px] uppercase tracking-wider cursor-pointer"
                >
                  View All Marketplace Catalog &rarr;
                </button>
              </div>

              {activeProducts.length === 0 ? (
                <div className="bg-white p-8 text-center rounded border border-dashed border-slate-200 shadow-xs">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-505 font-bold text-xs font-mono">No approved products are listed in the marketplace directory yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {activeProducts.slice(0, 6).map(prod => (
                    <div 
                      key={prod.productId} 
                      onClick={() => { setSelectedProduct(prod); setActiveImageIndex(0); }}
                      className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-slate-400 transition-all cursor-pointer relative shadow-xs"
                    >
                      <div className="aspect-video bg-slate-50 overflow-hidden relative border-b border-slate-150">
                        <img 
                          src={prod.images?.[0] || 'https://via.placeholder.com/150'} 
                          alt="Product visual" 
                          className="w-full h-full object-cover object-center" 
                        />
                      </div>

                      <div className="p-2 flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1 mb-0.5">
                            <StoreIcon className="w-2.5 h-2.5 text-red-650 shrink-0" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block leading-none truncate max-w-[130px]">
                              {getStoreName(prod.storeId)}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-[11px] leading-tight line-clamp-1">
                            {prod.name}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 mt-2 border-t border-slate-150">
                          <span className="text-xs text-red-650 font-black">${prod.price.toFixed(2)}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[8px] font-bold uppercase font-mono">Specs Detail</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HOMEPAGE SHOP MODE */}
        {activeMode === 'shop' && !selectedProduct && (
          <div className="space-y-3">
            
            {/* HERO PROMOTIONAL BANNER */}
            <div className="border border-slate-200 rounded overflow-hidden relative min-h-[110px] bg-slate-950 flex items-center p-4">
              {platformSettings.platformBanner ? (
                <div className="absolute inset-0 z-0">
                  <img src={platformSettings.platformBanner} className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-transparent" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-red-955 to-slate-950 z-0" />
              )}

              <div className="relative z-10 max-w-xl text-white">
                <span className="bg-red-650 text-white font-bold uppercase tracking-wider text-[8px] px-1.5 py-0.5 rounded">Approved Quality Vendors</span>
                <h2 className="text-sm sm:text-base font-bold tracking-tight mt-1">Direct-from-China Sourcing Portal</h2>
                <p className="text-[10px] text-slate-350 font-medium mt-1 leading-snug">Shop factory-direct items certified under Savie&apos;s Enterprise strict quality checklists with real customer support.</p>
              </div>
            </div>

            {/* TAXONOMY & SEARCH BAR GRID */}
            <div className="bg-white p-2 rounded border border-slate-200 flex flex-col md:flex-row items-stretch justify-between gap-2">
              <div className="w-full md:w-96 flex items-center bg-slate-50 px-2 py-1 rounded border border-slate-200 gap-1.5">
                {visualSearchPreview ? (
                  <div className="relative shrink-0 flex items-center bg-white p-0.5 rounded border border-slate-200">
                    <img src={visualSearchPreview} className="w-6 h-6 object-cover rounded" alt="Search visual" />
                    <button 
                      onClick={clearVisualSearch} 
                      className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white hover:bg-red-650 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] cursor-pointer"
                      title="Remove Visual Filter"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ) : (
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                
                <input
                  type="text"
                  placeholder={isVisualSearching ? "Analyzing photo with Gemini..." : "Search merchandise and craft details..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isVisualSearching}
                  className="w-full bg-transparent border-0 font-medium text-xs text-slate-700 pl-1 py-0.5 focus:ring-0 focus:outline-none disabled:opacity-60"
                />
                
                {isVisualSearching ? (
                  <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin shrink-0" />
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {searchQuery && !visualSearchPreview && (
                      <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"><X className="w-3 h-3" /></button>
                    )}
                    <button
                      onClick={() => document.getElementById('image-search-input')?.click()}
                      className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer p-1 rounded transition-colors"
                      title="Search products by Photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  id="image-search-input"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSearchUpload}
                />
              </div>

              {/* TAXONOMY TABS */}
              <div className="w-full overflow-x-auto flex gap-1 bg-slate-50 p-0.5 rounded border border-slate-200">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-2.5 py-1 rounded text-[11px] font-bold transition-all uppercase cursor-pointer ${
                      selectedCategory === cat ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* GEMINI VISUAL SEARCH INFO BANNER */}
            {visualSearchMeta && (
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 anim-fade-in">
                <div className="flex items-start gap-2.5">
                  <div className="bg-slate-900 text-white p-1.5 rounded mt-0.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Visual Match Enabled</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-250 text-slate-800 rounded">{visualSearchMeta.category}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800">
                      Detected: <span className="text-slate-900 underline font-extrabold">&quot;{visualSearchMeta.query}&quot;</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {visualSearchMeta.description}
                    </p>
                    {visualSearchMeta.tags && visualSearchMeta.tags.length > 0 && (
                      <div className="flex gap-1 items-center flex-wrap mt-1">
                        {visualSearchMeta.tags.slice(0, 4).map((tg, i) => (
                          <span key={i} className="text-[8px] font-bold bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">#{tg}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={clearVisualSearch}
                  className="whitespace-nowrap bg-slate-150 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer align-self-start sm:align-self-auto"
                >
                  <X className="w-3 h-3" /> Clear Image Filter
                </button>
              </div>
            )}

            {/* MARKETPLACE FILTER & PRECISION LAYOUT CONTROLS */}
            <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-600 shadow-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-[#74879b] uppercase tracking-wider text-[8px]">Display Layout:</span>
                <div className="flex bg-slate-50 p-0.5 rounded border border-slate-205">
                  <button
                    onClick={() => setLayoutMode('cozy')}
                    className={`px-2 py-0.5 rounded font-bold text-[9.5px] uppercase transition-all cursor-pointer ${
                      layoutMode === 'cozy' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Cozy Grid Layout"
                  >
                    Cozy Grid
                  </button>
                  <button
                    onClick={() => setLayoutMode('compact')}
                    className={`px-2 py-0.5 rounded font-bold text-[9.5px] uppercase transition-all cursor-pointer ${
                      layoutMode === 'compact' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Compact High Density Grid"
                  >
                    Compact Grid
                  </button>
                  <button
                    onClick={() => setLayoutMode('list')}
                    className={`px-2 py-0.5 rounded font-bold text-[9.5px] uppercase transition-all cursor-pointer ${
                      layoutMode === 'list' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Horizontal Catalog List"
                  >
                    Catalog List
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-[#74879b] uppercase tracking-wider text-[8px]">Sort Result:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold py-0.5 px-2 rounded focus:outline-none cursor-pointer"
                  >
                    <option value="default">✨ default order</option>
                    <option value="priceAsc">💲 price: low to high</option>
                    <option value="priceDesc">💲 price: high to low</option>
                    <option value="name">🔤 name: a-z</option>
                  </select>
                </div>

                <div className="text-[9px] font-bold bg-slate-250 border border-slate-200 text-slate-800 px-2 py-0.5 rounded">
                  <span className="text-slate-900 font-extrabold">{sortedProducts.length}</span> items
                </div>
              </div>
            </div>

            {/* CURATED GRID OF CARDS */}
            {sortedProducts.length === 0 ? (
              <div className="bg-white p-8 text-center rounded border border-dashed border-slate-200">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-bold text-xs font-mono">No items found matching searches or category filters.</p>
              </div>
            ) : (
              <div className={
                layoutMode === 'list' 
                  ? "grid grid-cols-1 gap-2" 
                  : layoutMode === 'compact'
                    ? "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
                    : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
              }>
                {sortedProducts.map(prod => {
                  const isInWishlist = wishlistProductIds.includes(prod.productId);
                  const storeName = getStoreName(prod.storeId);

                  if (layoutMode === 'list') {
                    // HORIZONTAL EXPERT CATALOG COMPARISON LIST STYLE
                    return (
                      <div 
                        key={prod.productId}
                        onClick={() => {
                          setSelectedProduct(prod);
                          setActiveImageIndex(0);
                        }}
                        className="group bg-white rounded-lg border border-slate-200 p-2.5 flex gap-3 hover:border-amber-400 hover:shadow-xs transition-all duration-300 cursor-pointer text-slate-705 relative"
                      >
                        {/* LEFT THUMBNAIL */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded border border-slate-150 overflow-hidden shrink-0 relative">
                          <img 
                            src={prod.images?.[0] || 'https://via.placeholder.com/150'} 
                            alt={prod.name} 
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!currentUser) {
                                setGuestModalActionTarget(prod.name);
                                setShowGuestRestrictionModal(true);
                              } else {
                                handleToggleWishlist(prod.productId, e);
                              }
                            }}
                            className="absolute top-1 left-1 z-10 p-1 rounded-full bg-white/90 border border-slate-200"
                          >
                            <Heart className={`w-2.5 h-2.5 ${isInWishlist ? 'text-rose-600 fill-current' : 'text-slate-400'}`} />
                          </button>
                        </div>

                        {/* MIDDLE CORE DETAILS */}
                        <div className="flex-grow flex flex-col justify-between min-w-0 py-0.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-black uppercase text-amber-620 bg-amber-50 border border-amber-200/50 px-1 py-0.2 rounded shrink-0">
                                {prod.category}
                              </span>
                              <div className="flex items-center gap-1 leading-none text-slate-400 font-bold text-[8.5px] truncate max-w-[150px]">
                                <StoreIcon className="w-2.5 h-2.5 text-slate-420" />
                                <span>{storeName}</span>
                              </div>
                            </div>
                            <h3 className="font-extrabold text-slate-850 text-xs sm:text-sm truncate">
                              {prod.name}
                            </h3>
                            <p className="text-[10px] text-slate-480 font-medium line-clamp-1">
                              {prod.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-[#ff9900]">${prod.price.toFixed(2)}</span>
                            {prod.weight && (
                              <span className="text-[8px] text-slate-400 font-mono bg-slate-100 px-1 border border-slate-150 rounded">{prod.weight}kg</span>
                            )}
                          </div>
                        </div>

                        {/* RIGHT ACTIONS BLOCK */}
                        <div className="flex flex-col justify-center items-end gap-1.5 shrink-0 pl-1.5 border-l border-slate-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = window.location.origin + window.location.pathname + "?productId=" + prod.productId;
                              navigator.clipboard.writeText(link);
                              showToast(`Copied listing link for ${prod.name}!`, 'success');
                            }}
                            className="px-2 py-1 bg-white border border-amber-300 text-amber-600 hover:bg-amber-50 text-[9px] font-bold rounded flex items-center gap-1 cursor-pointer transition shadow-3xs"
                            title="Copy deep-link promo URL"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copy Link</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(prod);
                              setActiveImageIndex(0);
                            }}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-[9px] font-bold rounded"
                          >
                            Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!currentUser) {
                                setGuestModalActionTarget(prod.name);
                                setShowGuestRestrictionModal(true);
                              } else {
                                handleAddToCart(prod.productId, e);
                              }
                            }}
                            className="px-2 py-1 bg-amber-400 hover:bg-amber-500 text-slate-900 text-[9px] font-black rounded border-0"
                          >
                            Add +
                          </button>
                        </div>
                      </div>
                    );
                  } else if (layoutMode === 'compact') {
                    // DENSE HIGH-DENSITY HIGHLY DETAILED GRID
                    return (
                      <div 
                        key={prod.productId}
                        onClick={() => {
                          setSelectedProduct(prod);
                          setActiveImageIndex(0);
                        }}
                        className="group bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-amber-400 hover:shadow-xs transition-all duration-300 cursor-pointer text-slate-705 relative p-1.5"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!currentUser) {
                              setGuestModalActionTarget(prod.name);
                              setShowGuestRestrictionModal(true);
                            } else {
                              handleToggleWishlist(prod.productId, e);
                            }
                          }}
                          className="absolute top-1 right-1 z-10 p-1 rounded-full bg-white/95 border border-slate-150 shadow-xxs text-slate-500 hover:text-rose-605"
                        >
                          <Heart className={`w-3 h-3 ${isInWishlist ? 'text-rose-650 fill-current' : 'text-slate-400'}`} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = window.location.origin + window.location.pathname + "?productId=" + prod.productId;
                            navigator.clipboard.writeText(link);
                            showToast(`Copied share link!`, 'success');
                          }}
                          className="absolute top-1 left-1 z-10 p-1 rounded-full bg-white/95 border border-slate-150 shadow-xxs text-slate-500 hover:text-amber-600 hover:bg-white cursor-pointer transition-all"
                          title="Copy promo link"
                        >
                          <Copy className="w-3 h-3 shrink-0" />
                        </button>

                        <div className="aspect-[5/4] bg-slate-50 overflow-hidden rounded relative border border-slate-150">
                          <img 
                            src={prod.images?.[0] || 'https://via.placeholder.com/150'} 
                            alt={prod.name} 
                            className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform" 
                          />
                        </div>

                        <div className="pt-1.5 flex-grow flex flex-col justify-between space-y-1">
                          <div>
                            <div className="flex items-center gap-0.5 mb-0.5 truncate text-[7.5px] font-bold text-slate-400 uppercase tracking-tight">
                              <StoreIcon className="w-2 h-2 text-amber-505 shrink-0" />
                              <span className="truncate">{storeName}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-[10px] leading-snug line-clamp-1">
                              {prod.name}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10.5px] text-[#ff9900] font-black">${prod.price.toFixed(2)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!currentUser) {
                                  setGuestModalActionTarget(prod.name);
                                  setShowGuestRestrictionModal(true);
                                } else {
                                  handleAddToCart(prod.productId, e);
                                }
                              }}
                              className="bg-amber-400 hover:bg-amber-480 text-slate-900 text-[8px] font-bold px-1.5 py-0.5 rounded transition-transform active:scale-95 border-0 hover:shadow-xs"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // ORIGINAL COZY PREMIUM SWISS/MODERN CARD
                    return (
                      <div 
                        key={prod.productId} 
                        onClick={() => {
                          setSelectedProduct(prod);
                          setActiveImageIndex(0);
                        }}
                        className="group bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all duration-300 cursor-pointer relative"
                      >
                        {/* WISHLIST BUTTON HEART */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!currentUser) {
                              setGuestModalActionTarget(prod.name);
                              setShowGuestRestrictionModal(true);
                            } else {
                              handleToggleWishlist(prod.productId, e);
                            }
                          }}
                          className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-white/95 border border-slate-150 shadow-xs transition-transform duration-350 hover:scale-110"
                        >
                          <Heart 
                            className={`w-3.5 h-3.5 shrink-0 ${isInWishlist ? 'text-rose-600 fill-current' : 'text-slate-400'}`} 
                          />
                        </button>

                        {/* COPY PRODUCT LINK BUTTON */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = window.location.origin + window.location.pathname + "?productId=" + prod.productId;
                            navigator.clipboard.writeText(link);
                            showToast(`Copied promotional link for ${prod.name}!`, 'success');
                          }}
                          title="Copy advertisement link for ads/posts"
                          className="absolute top-2 left-2 z-20 p-1.5 rounded-full bg-white/95 border border-slate-150 shadow-xs transition-transform duration-350 hover:scale-110 text-slate-500 hover:text-amber-600 hover:bg-white cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        <div className="aspect-square bg-slate-50 overflow-hidden relative border-b border-slate-150">
                          <img 
                            src={prod.images?.[0] || 'https://via.placeholder.com/150'} 
                            alt="Product visual" 
                            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105" 
                          />
                        </div>

                        <div className="p-3 flex-grow flex flex-col justify-between space-y-1.5">
                          <div>
                            {/* STORE CHIP */}
                            <div className="flex items-center gap-1 mb-0.5">
                              <StoreIcon className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block leading-none truncate max-w-[130px]">
                                {storeName}
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-[11px] leading-tight line-clamp-1">
                              {prod.name}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between pt-1 mr-0.5">
                            <span className="text-xs text-[#ff9900] font-black">${prod.price.toFixed(2)}</span>
                            {prod.weight && (
                              <span className="text-[8px] text-slate-400 font-bold bg-slate-50 border border-slate-100 rounded px-1">{prod.weight}kg</span>
                            )}
                          </div>

                          {/* Explicit Interactive Actions Grid */}
                          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 mt-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(prod);
                                setActiveImageIndex(0);
                              }}
                              className="px-1.5 py-1 w-full bg-slate-50 border border-slate-200 text-slate-750 text-[9px] font-extrabold uppercase hover:bg-slate-100 transition-colors cursor-pointer text-center rounded-md"
                            >
                              Details
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!currentUser) {
                                  setGuestModalActionTarget(prod.name);
                                  setShowGuestRestrictionModal(true);
                                } else {
                                  handleAddToCart(prod.productId, e);
                                }
                              }}
                              className="px-1.5 py-1 w-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-[9px] font-black uppercase transition-colors cursor-pointer text-center rounded-md border-0"
                            >
                              Add +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}

          </div>
        )}

        {/* DETAILED PRODUCT DISPLAY VIEW (Single Item View) */}
        {selectedProduct && (
          <div className="bg-white rounded border border-slate-200 overflow-hidden">
            <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="text-slate-600 hover:text-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded border border-slate-200 shadow-3xs"
                >
                  &larr; Back to Catalog List
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const link = window.location.origin + window.location.pathname + "?productId=" + selectedProduct.productId;
                    navigator.clipboard.writeText(link);
                    showToast('Permanent product link copied to clipboard!', 'success');
                  }}
                  className="inline-flex items-center gap-1 bg-amber-400 hover:bg-amber-500 text-slate-950 px-2.5 py-1 rounded border border-amber-305 text-[11px] font-extrabold uppercase cursor-pointer transition-all shadow-3xs"
                  title="Copy deep-link URL for ads and posts"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Product Link</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-bold bg-slate-200 py-0.5 px-1.5 rounded uppercase tracking-wider">{selectedProduct.category}</span>
            </div>

            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* ACCENT GALLERIES */}
              <div className="space-y-2">
                <div className="aspect-square bg-slate-50 rounded border border-slate-200 relative overflow-hidden group">
                  <img 
                    src={selectedProduct.images?.[activeImageIndex] || 'https://via.placeholder.com/150'} 
                    alt="Active Preview" 
                    className="w-full h-full object-cover object-center" 
                  />
                  {selectedProduct.images?.[activeImageIndex] && (
                    <button
                      type="button"
                      onClick={() => handleDownloadImage(selectedProduct.images![activeImageIndex], `product-${selectedProduct.productId}-${activeImageIndex}.jpg`)}
                      className="absolute bottom-2.5 right-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full px-2.5 py-1.5 hover:scale-105 transition-all shadow-md z-30 cursor-pointer flex items-center gap-1 text-[10px] font-bold border-0"
                      title="Download Product Image"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Image</span>
                    </button>
                  )}
                </div>

                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto py-1">
                    {selectedProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-12 h-12 rounded border transition-all p-0.5 shrink-0 bg-white ${
                          activeImageIndex === idx ? 'border-red-650 shadow-xs' : 'border-slate-200'
                        }`}
                      >
                        <img src={img} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* DETAILS COLUMN */}
              <div className="flex flex-col justify-between space-y-3.5">
                <div className="space-y-2.5">
                  
                  {/* Shop indicator */}
                  <div className="flex items-center gap-1.5 bg-slate-50 rounded p-2 border border-slate-150">
                    <StoreIcon className="w-4 h-4 text-slate-800" />
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider block leading-none">Verified Vendor Store</span>
                      <p className="font-bold text-xs text-slate-800 mt-0.5">{getStoreName(selectedProduct.storeId)}</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{selectedProduct.name}</h3>
                  <p className="text-red-650 font-bold text-base">${selectedProduct.price.toFixed(2)}</p>

                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Specifications</span>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-150 whitespace-pre-wrap">{selectedProduct.description}</p>
                  </div>

                  {/* ENFORCED SIZE SELECTORS Badges */}
                  {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                    <div className="py-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Select Size Variation *</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProduct.sizes.map(size => (
                          <button
                            type="button"
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors cursor-pointer ${
                              selectedSize === size
                                ? 'bg-[#ff6600] border-[#ff6600] text-white shadow-xs'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SAVIE'S SHIPPING POLICY CALCULATOR */}
                  {(() => {
                    const weight = selectedProduct.weight || 0;
                    return (
                      <div className="bg-slate-50 border border-slate-200 p-2 rounded text-[10.5px] text-slate-600 leading-normal space-y-0.5 shadow-xs">
                        <div className="flex gap-1.5 items-center font-bold text-slate-700">
                          <span className="text-amber-500 text-xs">🚚</span>
                          <span>Shipping Logistics Profile</span>
                        </div>
                        <p className="text-slate-500">Freight Weight: <strong>{weight > 0 ? `${weight} kg` : 'Default 0.25 kg'}</strong></p>
                        <p className="text-emerald-600 font-extrabold flex items-center gap-1">
                          <span className="bg-emerald-500 text-white font-black px-1 rounded text-[7.5px] uppercase">Service</span>
                          <span>Express Delivery: $5.99 USD flat rate standard</span>
                        </p>
                      </div>
                    );
                  })()}

                  <p className="text-[10px] text-slate-500 font-bold">
                    Stock Availability: <span className={`font-bold ${selectedProduct.stock < 10 ? 'text-rose-650':'text-slate-800'}`}>{selectedProduct.stock} units available</span>
                  </p>
                </div>

                {/* WORKFLOW OPERATIONS COVERS */}
                <div className="pt-3 border-t border-slate-150 flex gap-2 items-center">
                  <button
                    onClick={() => handleAddToCart(selectedProduct.productId, undefined, selectedSize)}
                    className="flex-1 py-1.5 px-3 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                  >
                    Add to Shopping Cart
                  </button>

                  <button
                    onClick={(e) => handleToggleWishlist(selectedProduct.productId, e)}
                    className="p-1.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors cursor-pointer"
                    title={wishlistProductIds.includes(selectedProduct.productId) ? 'Remove wishlist' : 'Add wishlist'}
                  >
                    <Heart className={`w-4 h-4 ${wishlistProductIds.includes(selectedProduct.productId) ? 'text-red-600 fill-current' : ''}`} />
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* WISHLIST TAB */}
        {activeMode === 'wishlist' && (
          <div className="space-y-3">
            <div className="bg-white p-2 border border-slate-200 rounded">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Your Wishlist Products</h2>
              <p className="text-[11px] text-slate-500">Keep track of your favorite high-quality factory pieces on Voya.</p>
            </div>

            {wishlistProductIds.length === 0 ? (
              <div className="bg-white p-8 text-center rounded border border-dashed border-slate-200">
                <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-bold text-xs mb-3">You haven&apos;t added any products to your wishlist yet.</p>
                <button onClick={() => setActiveMode('shop')} className="px-2.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded cursor-pointer">
                  Go browse catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {allProducts
                  .filter(p => wishlistProductIds.includes(p.productId) && approvedStoreIds.includes(p.storeId))
                  .map(prod => (
                    <div 
                      key={prod.productId}
                      onClick={() => { setSelectedProduct(prod); setActiveImageIndex(0); }}
                      className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-slate-400 transition-all cursor-pointer relative"
                    >
                      <button
                        onClick={(e) => handleToggleWishlist(prod.productId, e)}
                        className="absolute top-2 right-2 z-20 p-1.5 rounded bg-white border border-slate-200 text-red-650 hover:scale-105"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <div className="aspect-square bg-slate-50 overflow-hidden border-b border-slate-150">
                        <img src={prod.images?.[0]} className="w-full h-full object-cover" />
                      </div>

                      <div className="p-2 flex-grow flex flex-col justify-between">
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{getStoreName(prod.storeId)}</p>
                          <h3 className="font-extrabold text-slate-800 text-[11px] line-clamp-1 hover:text-red-650 transition-colors mt-0.5">{prod.name}</h3>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 mt-2 border-t border-slate-150">
                          <span className="text-xs text-red-660 font-bold">${prod.price.toFixed(2)}</span>
                          <button
                            onClick={(e) => handleAddToCart(prod.productId, e)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[9px] font-bold uppercase cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* MY ORDERS TAB */}
        {activeMode === 'orders' && (
          <div className="space-y-3">
            <div className="bg-white p-2 border border-slate-200 rounded">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Your Order History</h2>
              <p className="text-[11px] text-slate-500">Fulfillment tracking, shipping waybill histories, and statuses logs.</p>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white p-8 text-center rounded border border-dashed border-slate-200 text-xs">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-404 font-bold mb-3">No order tracking logs available. You haven&apos;t placed any orders yet.</p>
                <button onClick={() => setActiveMode('shop')} className="px-2.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded cursor-pointer">
                  Shop Curated Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(o => {
                  const orderDate = new Date(o.createdAt);
                  const estArrivalDate = new Date(orderDate.getTime() + 4 * 24 * 60 * 60 * 1000);
                  const formattedEstArrival = estArrivalDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  // Calculate countdown days or status message
                  const today = new Date();
                  const diffTime = estArrivalDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  let arrivalText = "";
                  if (o.status === 'delivered') {
                    arrivalText = "Delivered safely onto your premises.";
                  } else if (o.status === 'cancelled') {
                    arrivalText = "Order was cancelled.";
                  } else if (diffDays > 1) {
                    arrivalText = `Arriving in approximately ${diffDays} days (${formattedEstArrival})`;
                  } else if (diffDays === 1) {
                    arrivalText = "Arriving Tomorrow!";
                  } else {
                    arrivalText = "Arriving Today!";
                  }

                  // Stepper logic: 1 to 4
                  let stepLevel = 1;
                  if (o.status === 'processing') stepLevel = 2;
                  else if (o.status === 'shipped') stepLevel = 3;
                  else if (o.status === 'delivered') stepLevel = 4;
                  else if (o.status === 'cancelled') stepLevel = 0;

                  // Ship progress tracker events log
                  const baseTime = new Date(o.createdAt);
                  const logTimeline = [
                    {
                      label: "Order Confirmed & Placed",
                      desc: "Waybill printed & registered. Authorized by Voya Central System payment gateway.",
                      time: new Date(baseTime.getTime() + 8 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      isDone: stepLevel >= 1
                    },
                    {
                      label: "Inspected & Packed",
                      desc: "Weight verified. Custom voya packaging insulated for damage prevention.",
                      time: new Date(baseTime.getTime() + 50 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      isDone: stepLevel >= 2
                    },
                    {
                      label: "Dispatched with Carrier Fleet",
                      desc: "Assigned to Custom Fleet. Truck left distribution center for destination waybill.",
                      time: new Date(baseTime.getTime() + 14 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      isDone: stepLevel >= 3
                    },
                    {
                      label: "Successfully Delivered",
                      desc: "Fulfillment completed. Signed and documented by terminal courier drop-off.",
                      time: new Date(baseTime.getTime() + 38 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      isDone: stepLevel >= 4
                    }
                  ].filter(evt => evt.isDone).reverse();

                  return (
                    <div key={o.orderId} className="bg-white rounded-xl border border-slate-205 overflow-hidden text-xs shadow-xs hover:shadow-md transition-shadow duration-300">
                      
                      {/* CARD STATUS HEADER HEADER */}
                      <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">Fulfillment</span>
                            <span className="text-slate-800 font-extrabold text-[12px]">#{o.orderId}</span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-480 font-semibold">{new Date(o.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full leading-none tracking-tight shadow-xxs ${
                            o.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            o.status === 'shipped' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            o.status === 'processing' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            o.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {o.status === 'pending' ? '⏳ pending approval' : o.status}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        
                        {/* THE ORDER TARGET TIMELINE CHANGER */}
                        {o.status === 'cancelled' ? (
                          <div className="bg-rose-50 p-3 rounded-lg border border-rose-150 text-rose-800 flex items-center gap-2.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                            <div>
                              <p className="font-extrabold text-xs">Fulfillment Terminated</p>
                              <p className="text-[11px] font-medium text-rose-600">This order tracking register has been cancelled. Any active locks or refunds are routed automatically.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-3.5 space-y-3.5">
                            <div className="flex items-start gap-2.5">
                              <div className="bg-slate-900 text-white rounded-full p-1.5 shrink-0 shadow-xs">
                                <Truck className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Estimated Logistics Delivery Time</span>
                                <h4 className="text-[13px] font-black tracking-tight text-slate-850">
                                  {arrivalText}
                                </h4>
                                <p className="text-[10px] font-medium text-slate-500">
                                  Track ID reference: <span className="font-mono bg-white px-1 py-0.2 border border-slate-150 rounded text-slate-700 font-bold">TRK-VOYA-{o.orderId.substring(0,6).toUpperCase()}</span>
                                </p>
                              </div>
                            </div>

                            {/* PROGRESS VISUAL STEPPER BAR */}
                            <div className="pt-2">
                              <div className="relative flex items-center justify-between">
                                {/* Backing track line */}
                                <div className="absolute top-3.5 left-4 right-4 h-1 bg-slate-200 -z-0" />
                                <div 
                                  className="absolute top-3.5 left-4 h-1 bg-amber-400 -z-0 rounded transition-all duration-500"
                                  style={{ width: `${stepLevel === 1 ? '10%' : stepLevel === 2 ? '42%' : stepLevel === 3 ? '75%' : stepLevel === 4 ? '100%' : '0%'}` }}
                                />

                                {/* Step 1: Placed */}
                                <div className="flex flex-col items-center text-center z-10 w-20">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-[10px] transition-all ${
                                    stepLevel >= 1 
                                      ? 'bg-amber-400 border-amber-500 text-slate-900 shadow-xs scale-105' 
                                      : 'bg-white border-slate-300 text-slate-400'
                                  }`}>
                                    {stepLevel > 1 ? "✓" : "01"}
                                  </div>
                                  <span className={`text-[9.5px] font-bold mt-1 tracking-tight ${stepLevel >= 1 ? 'text-slate-850' : 'text-slate-400'}`}>Placed</span>
                                </div>

                                {/* Step 2: Processing */}
                                <div className="flex flex-col items-center text-center z-10 w-20">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-[10px] transition-all ${
                                    stepLevel >= 2 
                                      ? 'bg-amber-400 border-amber-500 text-slate-900 shadow-xs scale-105' 
                                      : 'bg-white border-slate-300 text-slate-400'
                                  }`}>
                                    {stepLevel > 2 ? "✓" : "02"}
                                  </div>
                                  <span className={`text-[9.5px] font-bold mt-1 tracking-tight ${stepLevel >= 2 ? 'text-slate-850' : 'text-slate-400'}`}>Processing</span>
                                </div>

                                {/* Step 3: Shipped */}
                                <div className="flex flex-col items-center text-center z-10 w-20">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-[10px] transition-all ${
                                    stepLevel >= 3 
                                      ? 'bg-amber-400 border-amber-500 text-slate-900 shadow-xs scale-105' 
                                      : 'bg-white border-slate-300 text-slate-400'
                                  }`}>
                                    {stepLevel > 3 ? "✓" : "03"}
                                  </div>
                                  <span className={`text-[9.5px] font-bold mt-1 tracking-tight ${stepLevel >= 3 ? 'text-slate-850' : 'text-slate-400'}`}>Shipped</span>
                                </div>

                                {/* Step 4: Delivered */}
                                <div className="flex flex-col items-center text-center z-10 w-20">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-[10px] transition-all ${
                                    stepLevel >= 4 
                                      ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs scale-105' 
                                      : 'bg-white border-slate-300 text-slate-400'
                                  }`}>
                                    {stepLevel === 4 ? "✓" : "04"}
                                  </div>
                                  <span className={`text-[9.5px] font-bold mt-1 tracking-tight ${stepLevel >= 4 ? 'text-emerald-600' : 'text-slate-400'}`}>Delivered</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SPLIT EXPERT DETAIL TIMELINE TRACK AND ROUTE */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                          
                          {/* LEFT PANEL: TIMELINE EVENTS AND DESTINATION */}
                          <div className="space-y-3.5">
                            <div className="space-y-1">
                              <span className="text-[10px] text-[#74879b] font-black uppercase tracking-wider block">Waybill Information</span>
                              <p className="font-extrabold text-slate-800 text-[11px] leading-snug flex items-center gap-1">
                                <span>📋</span> Carrier Fleet Handled By: <strong className="text-slate-900 uppercase font-bold">{getStoreName(o.storeId)} Partner Hub</strong>
                              </p>
                              
                              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                                Waybill Address: <span className="text-slate-850 font-bold bg-slate-50 border border-slate-205 ml-1 px-1.5 py-0.5 rounded">{o.shippingAddress}</span>
                              </p>

                              {currentUser && currentUser.location && (
                                <div className="bg-slate-50 rounded-lg border border-slate-200 p-2.5 text-[10px] space-y-1 mt-2.5">
                                  <span className="text-[#74879b] font-extrabold uppercase tracking-wider block text-[8px]">Transit Lock Coordinates Geolocation</span>
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-semibold text-slate-600">
                                    <span>Country: <strong className="text-slate-900 font-extrabold">{currentUser.location.country}</strong></span>
                                    <span>City: <strong className="text-slate-900 font-extrabold">{currentUser.location.city}</strong></span>
                                    {currentUser.location.district && <span>District: <strong className="text-slate-900">{currentUser.location.district}</strong></span>}
                                    <span>Postal: <strong className="text-slate-900 font-mono">{currentUser.location.postalCode}</strong></span>
                                    {currentUser.location.lat !== undefined && (
                                      <span className="col-span-2 text-indigo-600 font-mono text-[9.5px] mt-1 block bg-indigo-50/50 p-1 rounded border border-indigo-100">
                                        📌 Lat/Lng coordinates mapped: {currentUser.location.lat.toFixed(6)}, {currentUser.location.lng?.toFixed(6)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* CHRONOLOGICAL SHIPMENT EVENTS LOG */}
                            {o.status !== 'cancelled' && (
                              <div className="space-y-2 pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-[#74879b] font-black uppercase tracking-wider block">Fulfillment Waybill Timeline Logs</span>
                                <div className="border-l-2 border-slate-150 pl-3.5 ml-1 space-y-3.5 relative">
                                  {logTimeline.map((item, idx) => (
                                    <div key={idx} className="relative text-[10.5px]">
                                      {/* Indicator dot */}
                                      <div className={`absolute -left-[19.5px] top-1 w-2 h-2 rounded-full border-2 ${
                                        idx === 0 ? 'bg-amber-400 border-amber-500 scale-110 ripple-indicator' : 'bg-slate-300 border-white'
                                      }`} />
                                      <div className="flex justify-between items-baseline gap-2">
                                        <h5 className="font-extrabold text-slate-800">{item.label}</h5>
                                        <span className="text-[8.5px] font-bold font-mono text-slate-400 whitespace-nowrap bg-slate-50 px-1 rounded border border-slate-150">{item.time}</span>
                                      </div>
                                      <p className="text-[9.5px] text-slate-550 leading-relaxed font-semibold mt-0.5">{item.desc}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* RIGHT PANEL: CATALOG ITEMS & INTERACTIVE ROUTING MAP */}
                          <div className="flex flex-col justify-between gap-3">
                            <div>
                              <span className="text-[10px] text-[#74879b] font-black uppercase tracking-wider block mb-1">Acquired Catalog Items</span>
                              <div className="space-y-1.5 text-[11px] font-semibold text-slate-700 max-h-[120px] overflow-y-auto pr-1">
                                {o.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-150">
                                    <div className="flex flex-col">
                                      <span className="font-extrabold text-slate-850">{item.name}</span>
                                      {item.size && <span className="text-[8px] text-slate-400 font-bold uppercase">Size: {item.size}</span>}
                                    </div>
                                    <span className="text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded font-bold">
                                      x{item.quantity} <span className="text-slate-800 shrink-0 select-none ml-1">${(item.price * item.quantity).toFixed(2)}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between items-center text-xs font-extrabold text-slate-900 px-1">
                                <span className="uppercase text-[9.5px] tracking-wide text-slate-405">Captured Total Sum:</span>
                                <span className="text-red-650 text-sm font-black">${o.total.toFixed(2)}</span>
                              </div>

                              {o.paymentMethod && o.paymentMethod !== 'none' && (
                                <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded p-2 text-[10px] text-slate-650 space-y-1 font-sans">
                                  <div className="flex justify-between items-center text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider">
                                    <span>Payment Proof Details</span>
                                    <span className="bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded-full uppercase leading-none tracking-tight">
                                      {o.paymentMethod === 'mobile_money' ? '📱 Mobile Money' : '🏦 Bank Transfer'}
                                    </span>
                                  </div>
                                  <div className="font-semibold text-[10.5px] leading-relaxed text-slate-700">
                                    <p>Ref / Txn ID: <strong className="font-mono text-slate-900 bg-white border border-slate-150 px-1 py-0.2 ml-1 rounded font-bold">{o.paymentReference}</strong></p>
                                    <p className="mt-1">Sender Info: <strong className="text-slate-900 font-bold ml-1">{o.paymentSenderDetails}</strong></p>
                                  </div>

                                  {o.paymentReceipt && (
                                    <div className="mt-2 bg-white border border-slate-150 rounded p-1.5 flex items-center justify-between">
                                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Receipt Attachment:</span>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewReceiptImage(o.paymentReceipt || null)}
                                        className="cursor-pointer shrink-0 w-8 h-8 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 overflow-hidden relative group/btn"
                                      >
                                        <img src={o.paymentReceipt} alt="Receipt thumbnail" className="w-full h-full object-cover transition-transform group-hover/btn:scale-105" />
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 flex items-center justify-center text-[6px] text-white font-extrabold pb-0.5 pt-0.2">
                                          VIEW
                                        </div>
                                      </button>
                                    </div>
                                  )}

                                  {/* Update or Upload Receipts attachment */}
                                  <div className="mt-2 pt-1.5 border-t border-slate-150 flex items-center justify-between gap-2">
                                    <span className="text-[8.5px] text-slate-400 font-bold uppercase leading-none">
                                      {o.paymentReceipt ? 'Update Photo' : 'Attach Screenshot'}
                                    </span>
                                    <div>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        id={`order-receipt-${o.orderId}`}
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              handleUploadOrderReceipt(o.orderId, reader.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                      <label
                                        htmlFor={`order-receipt-${o.orderId}`}
                                        className="cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 border border-slate-200 rounded text-[9px] font-bold text-slate-700 bg-white hover:bg-slate-50"
                                      >
                                        <Upload className="w-2.5 h-2.5" />
                                        Upload
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* DYNAMIC SVG ROUTING BLUEPRINT MOCKUP */}
                            {o.status !== 'cancelled' && (
                              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-[9px] font-mono text-slate-400 relative overflow-hidden group">
                                <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest leading-none">GPS LIVE</span>
                                </div>

                                <div className="flex justify-between items-center text-[7.5px] text-slate-500 uppercase font-black tracking-widest mb-1.5">
                                  <span>Orig: Voya Terminal</span>
                                  <span className="text-amber-400">
                                    {o.status === 'delivered' ? '✓ Destination Arrived' : '🚚 Fleet Transit route'}
                                  </span>
                                  <span>Dest: {currentUser?.location?.city || 'Local Host'}</span>
                                </div>

                                <div className="relative h-11 w-full bg-slate-900/65 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                                  {/* Visual Blueprint Grid lines */}
                                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px]" />
                                  
                                  <svg className="w-full h-full text-slate-500 stroke-1" viewBox="0 0 200 60">
                                    {/* Mapped dynamic flightpath/route line */}
                                    <path 
                                      id="carrier-route-path"
                                      d="M 25,30 Q 100,5 175,30" 
                                      fill="none" 
                                      className="stroke-slate-700 stroke-1 stroke-dasharray-[3,3]"
                                    />
                                    
                                    {/* Mapped animated progress trail if in transit */}
                                    {stepLevel >= 2 && (
                                      <path 
                                        d="M 25,30 Q 100,5 175,30" 
                                        fill="none" 
                                        className="stroke-amber-450 stroke-1"
                                        strokeDasharray="200"
                                        strokeDashoffset={stepLevel === 2 ? 140 : stepLevel === 3 ? 60 : 0}
                                        style={{ transition: 'stroke-dashoffset 2s ease-in-out' }}
                                      />
                                    )}

                                    {/* Origin terminal node */}
                                    <g transform="translate(25, 30)">
                                      <circle r="3.5" className="fill-slate-800 stroke-slate-500" />
                                      <circle r="1.5" className="fill-amber-400" />
                                      <text y="-8" textAnchor="middle" className="text-[7px] fill-slate-400 font-bold font-mono">VOY-HUB</text>
                                    </g>

                                    {/* Destination node */}
                                    <g transform="translate(175, 30)">
                                      <circle r="3.5" className="fill-slate-800 stroke-slate-500" />
                                      <circle r="1.5" className="fill-emerald-400" />
                                      <text y="-8" textAnchor="middle" className="text-[7px] fill-slate-400 font-bold font-mono">TARGET</text>
                                    </g>

                                    {/* Glowing Carrier truck moving indicator node along path */}
                                    {stepLevel >= 1 && (
                                      <g className="transition-all duration-[2000ms] ease-in-out" style={{
                                        transform: `translate(${stepLevel === 1 ? '25px, 30px' : stepLevel === 2 ? '55px, 20px' : stepLevel === 3 ? '110px, 11px' : '175px, 30px'})`
                                      }}>
                                        <circle r="6" className="fill-amber-400/20 stroke-amber-400 animate-ping" />
                                        <circle r="3" className="fill-amber-400 stroke-slate-900 border" />
                                      </g>
                                    )}
                                  </svg>
                                </div>
                                
                                <div className="mt-1.5 flex justify-between items-center text-[7.5px] text-slate-500">
                                  <span>GPS status: <strong className="text-slate-350">{o.status === 'delivered' ? 'SECURED ARRIVAL' : 'CARRIER ENROUTE'}</strong></span>
                                  <span>Precision: ±4m logs</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SHOPPER USER PROFILE TAB */}
        {activeMode === 'profile' && (
          <div className="space-y-3 max-w-2xl">
            <div className="bg-white p-2 border border-slate-200 rounded">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Shopper Portal Settings</h2>
              <p className="text-[11px] text-slate-500">Verify passwords, change avatars and shipping waybills.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="bg-white p-3.5 rounded border border-slate-200 space-y-4">
              
              {/* IMAGE LOADER DYNAMIC PREVIEW */}
              <div className="flex items-center gap-3 border-b border-slate-150 pb-3">
                <div className="w-12 h-12 rounded border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                  <img 
                    src={profileAvatar || currentUser.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} 
                    alt="avatar visual" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    id="buyerLogoUpload"
                    className="hidden"
                  />
                  <label
                    htmlFor="buyerLogoUpload"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 rounded text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Load new picture
                  </label>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Accepts standard images converted as base64.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Contact Phone Number</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="e.g. +1234567890"
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Country of Residence</label>
                  <input
                    type="text"
                    value={profileCountryOfResidence}
                    onChange={(e) => setProfileCountryOfResidence(e.target.value)}
                    placeholder="e.g. United States, Canada, United Kingdom"
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Referrer Number / ID</label>
                  <input
                    type="text"
                    value={profileReferrerNumber}
                    onChange={(e) => setProfileReferrerNumber(e.target.value)}
                    placeholder="e.g. REF-7719 or +123450000"
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Account Security Password (Change)</label>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="Enter new password to reset"
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              {/* STRUCTURED SHIPPING COORDINATES */}
              <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    Structured Shipping Coordinates
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocLoading(true);
                      setTimeout(() => {
                        setIsLocLoading(false);
                        setLocCountry('China');
                        setLocCity('Guangzhou');
                        setLocDistrict('Baiyun District');
                        setLocPostalCode('510000');
                        setLocStreetAddress('No. 888 Airport Road, Sourcing Warehouse Block B');
                        setLocLat(23.1291);
                        setLocLng(113.2644);
                        showToast('Simulated GPS coordinates geocoded successfully!', 'success');
                      }, 1000);
                    }}
                    disabled={isLocLoading}
                    className="px-2 py-1 bg-white border border-slate-200 text-slate-700 font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <Compass className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: isLocLoading ? '1s' : '0s' }} />
                    {isLocLoading ? 'Geocoding...' : 'Simulate GPS / Geocode'}
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">Country/Region</label>
                    <input
                      type="text"
                      value={locCountry}
                      onChange={(e) => setLocCountry(e.target.value)}
                      placeholder="e.g. China"
                      className="mt-1 block w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">City</label>
                    <input
                      type="text"
                      value={locCity}
                      onChange={(e) => setLocCity(e.target.value)}
                      placeholder="e.g. Guangzhou"
                      className="mt-1 block w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">District</label>
                    <input
                      type="text"
                      value={locDistrict}
                      onChange={(e) => setLocDistrict(e.target.value)}
                      placeholder="e.g. Baiyun"
                      className="mt-1 block w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">Postal Code</label>
                    <input
                      type="text"
                      value={locPostalCode}
                      onChange={(e) => setLocPostalCode(e.target.value)}
                      placeholder="e.g. 510000"
                      className="mt-1 block w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">Latitude (lat)</label>
                    <input
                      type="number"
                      step="any"
                      value={locLat !== undefined ? locLat : ''}
                      onChange={(e) => setLocLat(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="e.g. 23.1291"
                      className="mt-1 block w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono text-slate-700 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">Longitude (lng)</label>
                    <input
                      type="number"
                      step="any"
                      value={locLng !== undefined ? locLng : ''}
                      onChange={(e) => setLocLng(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="e.g. 113.2644"
                      className="mt-1 block w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono text-slate-700 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">Street Address</label>
                  <input
                    type="text"
                    value={locStreetAddress}
                    onChange={(e) => setLocStreetAddress(e.target.value)}
                    placeholder="e.g. No. 888 Airport Road, Warehouse Block B"
                    className="mt-1 block w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Preview Default Calculated Shipping Address</label>
                <textarea
                  value={locStreetAddress ? `${locStreetAddress}, ${locDistrict ? `${locDistrict}, ` : ''}${locCity}, ${locCountry} - ${locPostalCode}` : profileAddress}
                  disabled
                  placeholder="Computed shipping address representation..."
                  rows={2}
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs leading-normal text-slate-500 bg-slate-50 font-semibold focus:outline-none"
                />
              </div>

              {/* SAVE BUTTON */}
              <div className="pt-3 border-t border-slate-150 flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs uppercase tracking-wider cursor-pointer"
                >
                  Save Profile Settings
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ================= MY SAVINGS WALLET & PAYMENTS CENTER ================= */}
        {activeMode === 'lucky_draw' && (
          <div className="w-full max-w-7xl mx-auto py-6 px-4 space-y-6">
            
            {/* STYLED SLATE MARKETING HEADER */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-6 scale-150 pointer-events-none">
                <Wallet className="w-60 h-60 text-amber-500" />
              </div>

              <div className="max-w-xl space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 font-extrabold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-amber-500/20">
                  <CreditCard className="w-3.5 h-3.5" />
                  Liberia Personal Savings &amp; Wallet Center
                </div>
                <h2 className="text-xl md:text-3xl font-black tracking-tight leading-none uppercase">
                  My Savings Sandbox
                </h2>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                  Manage your personal LRD balance easily. Deposit funds by uploading mobile money transfer screenshots, make instant secure payments for your orders, or request direct mobile payouts anytime.
                </p>
              </div>

              {/* LIVE USER BALANCE DASH CHIP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-800 max-w-md">
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Wallet Balance</p>
                    <p className="text-xl font-black text-emerald-400 animate-fade-in">LRD {(currentUser?.accountBalance || 0).toLocaleString()}</p>
                    <p className="text-[9px] text-slate-500 font-semibold">Available for shopping or payments</p>
                  </div>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
                  <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Withdrawable Portion</p>
                    <p className="text-xl font-black text-white">LRD {(currentUser?.withdrawableBalance || 0).toLocaleString()}</p>
                    <p className="text-[9px] text-slate-500 font-semibold">Ready for direct cash withdrawal</p>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB INTERFACE HEADINGS */}
            <div className="flex border-b border-slate-200 overflow-x-auto gap-1 text-xs no-scrollbar bg-white p-1 rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => setLuckyDrawTab('overview')}
                className={`px-4 py-2 rounded-lg font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  luckyDrawTab === 'overview' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Wallet className="w-4 h-4" />
                📢 Wallet Guide
              </button>
              <button
                type="button"
                onClick={() => setLuckyDrawTab('buy_points')}
                className={`px-4 py-2 rounded-lg font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  luckyDrawTab === 'buy_points' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                📥 Deposit Funds
              </button>
              <button
                type="button"
                onClick={() => setLuckyDrawTab('withdraw')}
                className={`px-4 py-2 rounded-lg font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  luckyDrawTab === 'withdraw' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Coins className="w-4 h-4" />
                📤 Withdraw Money
              </button>
              <button
                type="button"
                onClick={() => setLuckyDrawTab('direct')}
                className={`px-4 py-2 rounded-lg font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  luckyDrawTab === 'direct' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                ⚡ Send Payment
              </button>
              <button
                type="button"
                onClick={() => setLuckyDrawTab('history')}
                className={`px-4 py-2 rounded-lg font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  luckyDrawTab === 'history' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <History className="w-4 h-4" />
                📜 Transaction History
              </button>
            </div>

            {/* TAB PANELS GRID CONTAINER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* PRIMARY LEFT PANEL: ACTIVE WORKING TAB */}
              <div className="lg:col-span-7 bg-white border border-slate-205 rounded-3xl p-6 shadow-xs text-left space-y-6">
                
                {/* TAB 1: WALLET OVERVIEW */}
                {luckyDrawTab === 'overview' && (
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 font-sans">
                      <Wallet className="w-5 h-5 text-amber-500" />
                      Liberia Mobile Money Wallet Guide
                    </h3>
                    <p className="text-slate-605 text-xs leading-relaxed">
                      To load LRD money into your secure Voya Sourcing user balance, please follow these simple steps to make a Mobile Money transfer and submit your deposit proof receipt:
                    </p>

                    <div className="border border-slate-150 rounded-2xl p-4 space-y-4 bg-slate-50">
                      <div className="flex gap-3 items-start">
                        <span className="bg-slate-200 text-slate-855 h-5 w-5 rounded-full flex items-center justify-center text-[10.5px] font-black shrink-0 font-mono">1</span>
                        <div>
                          <h4 className="font-extrabold text-[11px] text-slate-800 uppercase tracking-tight font-sans">Perform MTN or Orange Mobile Money Transfer</h4>
                          <p className="text-slate-500 text-[10.5px] leading-relaxed mt-0.5">
                            Transfer your target deposit LRD amount directly to our secure centralized Liberia customer service mobile money endpoints detailed on the right.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start border-t border-slate-150 pt-3.5">
                        <span className="bg-slate-200 text-slate-855 h-5 w-5 rounded-full flex items-center justify-center text-[10.5px] font-black shrink-0 font-mono">2</span>
                        <div>
                          <h4 className="font-extrabold text-[11px] text-slate-800 uppercase tracking-tight font-sans">Capture Screenshot / Receipt Photo</h4>
                          <p className="text-slate-500 text-[10.5px] leading-relaxed mt-0.5">
                            Take a clean screenshot or photo of the processed mobile money SMS transaction code alert message, or receipt voucher. Mock details will be immediately rejected.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start border-t border-slate-150 pt-3.5">
                        <span className="bg-slate-205 text-slate-855 h-5 w-5 rounded-full flex items-center justify-center text-[10.5px] font-black shrink-0 font-mono">3</span>
                        <div>
                          <h4 className="font-extrabold text-[11px] text-slate-805 uppercase tracking-tight font-sans">Upload &amp; Submit for Admin Verification</h4>
                          <p className="text-slate-500 text-[10.5px] leading-relaxed mt-0.5">
                            Submit your transfer screenshot under our <strong className="text-slate-800">📥 Deposit Funds</strong> tab. Our administrators will confirm the transfer receipt to instantly credit your balance.
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLuckyDrawTab('buy_points')}
                      className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-xl cursor-pointer transition-all"
                    >
                      <PlusCircle className="w-4 h-4" /> Load Balance Now
                    </button>
                  </div>
                )}

                {/* TAB 2: DEPOSIT FUNDS FORM */}
                {luckyDrawTab === 'buy_points' && (
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 font-sans">
                      <PlusCircle className="w-5 h-5 text-emerald-550" />
                      Submit Balance Deposit receipt
                    </h3>

                    {/* ACCOUNTS RECIPIENT */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
                      <p className="text-[10px] uppercase tracking-widest text-[#74879b] font-black font-sans">Official Mobile Money Receiving Coordinates</p>
                      
                      <div className="grid grid-cols-2 gap-3.5">
                        <button
                          type="button"
                          onClick={() => setPointsPurchaseProvider('orange')}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            pointsPurchaseProvider === 'orange' ? 'border-red-500 bg-red-50/40 ring-1 ring-red-400' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <p className="font-extrabold text-[11px] text-slate-850">🍊 Orange Money</p>
                          <p className="text-[9px] text-slate-500">Liberia Network</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPointsPurchaseProvider('lonestar')}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            pointsPurchaseProvider === 'lonestar' ? 'border-indigo-505 bg-indigo-50/40 ring-1 ring-indigo-400' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <p className="font-extrabold text-[11px] text-slate-855">⭐ Lonestar cell</p>
                          <p className="text-[9px] text-indigo-700 font-bold">MTN Mobile Money</p>
                        </button>
                      </div>

                      {/* PAYMENT ACCOUNTS COORDINATES */}
                      <div className="grid grid-cols-3 gap-y-1.5 pt-2 border-t border-slate-200 text-xs font-semibold text-slate-700">
                        <span className="text-slate-450 font-bold">Wallet Number:</span>
                        <span className="col-span-2 text-rose-655 font-mono font-black text-sm">
                          {pointsPurchaseProvider === 'orange' 
                            ? (platformSettings.liberiaOrangeNumber || '+231 77 111 2222') 
                            : (platformSettings.liberiaLonestarNumber || '+231 88 111 2222')
                          }
                        </span>
                        <span className="text-slate-455 font-bold">Recipient Name:</span>
                        <span className="col-span-2 font-black text-slate-900 text-xs">
                          {pointsPurchaseProvider === 'orange' 
                            ? (platformSettings.liberiaOrangeName || 'Voya Sourcing Settlement LLC') 
                            : (platformSettings.liberiaLonestarName || 'Voya Settlement Mobile Wallet')
                          }
                        </span>
                      </div>
                    </div>

                    {/* DEPOSIT SCREENSHOT UPLOAD FORM */}
                    <form onSubmit={handleLuckyDrawBuyPoints} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans">
                          Amount to Deposit (LRD) - Limit: {(platformSettings.minDepositLimit ?? 100).toLocaleString()} - {(platformSettings.maxDepositLimit ?? 100000).toLocaleString()} LRD)
                        </label>
                        <input
                          type="number"
                          placeholder={`e.g. ${platformSettings.minDepositLimit ?? 100}`}
                          min={platformSettings.minDepositLimit ?? 100}
                          max={platformSettings.maxDepositLimit ?? 100000}
                          value={pointsPurchaseAmount}
                          onChange={(e) => setPointsPurchaseAmount(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans">
                          Your Sender Mobile Wallet Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. +231 77 987 654"
                          value={pointsPurchaseSender}
                          onChange={(e) => setPointsPurchaseSender(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                          required
                        />
                      </div>

                      {/* Receipt Screenshot upload */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between font-sans">
                          <span>Upload Transfer Receipt screenshot (required)</span>
                        </label>
                        <div className="flex items-center gap-3">
                          {pointsPurchaseReceipt ? (
                            <div className="relative w-14 h-14 rounded-lg border border-slate-200 overflow-hidden shrink-0 group bg-slate-50">
                              <img src={pointsPurchaseReceipt} alt="Transfer Receipt Screenshot" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setPointsPurchaseReceipt(null)}
                                className="absolute inset-0 bg-black/80 text-[7px] text-white font-extrabold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-lg border border-dashed border-slate-250 shrink-0 bg-slate-50 text-slate-400 flex items-center justify-center">
                              <Upload className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              id="pointsReceiptUpload"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setPointsPurchaseReceipt(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor="pointsReceiptUpload"
                              className="inline-flex px-3 py-1.5 border border-slate-250 hover:bg-slate-55 text-slate-705 font-extrabold text-[10px] uppercase rounded-lg tracking-wider cursor-pointer transition-all"
                            >
                              Browse photo / Camera
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmittingPointsPurchase}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-805 text-white font-black rounded-lg text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          {isSubmittingPointsPurchase ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              Submit Deposit Proof
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 3: CUSTOMER WITHDRAW */}
                {luckyDrawTab === 'withdraw' && (
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 font-sans">
                      <Coins className="w-5 h-5 text-amber-500" />
                      Client Cash Out Panel (Liberia Mobile Payout)
                    </h3>

                    {/* WITHDRAWABLE ELIGIBLE STATUS CARD */}
                    <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-2xl p-4 flex items-center justify-between col-span-1">
                      <div className="space-y-1 bg-white p-3 border border-emerald-100/50 rounded-xl leading-relaxed w-full">
                        <span className="text-[9px] font-black uppercase text-[#22c55e] tracking-wider block font-sans">Eligible Withdrawal Balance</span>
                        <p className="text-2xl font-black font-mono text-emerald-700">LRD {(currentUser?.withdrawableBalance || 0).toLocaleString()} LRD</p>
                        <p className="text-[9.5px] text-slate-450 leading-none">Your safe earnings portion available for instant mobile money payouts.</p>
                      </div>
                    </div>

                    {/* WITHDRAWAL REQUEST FORM */}
                    <form onSubmit={handleCustomerWithdrawSubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-widest font-sans">
                          Withdrawal LRD Amount (Limit: {(platformSettings.minWithdrawalLimit ?? 500).toLocaleString()} - {(platformSettings.maxWithdrawalLimit ?? 50000).toLocaleString()} LRD)
                        </label>
                        <input
                          type="number"
                          min={platformSettings.minWithdrawalLimit ?? 500}
                          max={platformSettings.maxWithdrawalLimit ?? 50000}
                          placeholder={`e.g. ${platformSettings.minWithdrawalLimit ?? 500}`}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-808 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                          Mobile Network Carrier
                        </label>
                        <select
                          value={withdrawMethod}
                          onChange={(e) => setWithdrawMethod(e.target.value)}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold text-slate-800 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                        >
                          <option value="Orange Money Liberia (LRD)">Orange Money Liberia</option>
                          <option value="Lonestar cell MTN (LRD)">Lonestar Cell MTN Mobile Money</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                          Receiver Account Name &amp; Phone Number
                        </label>
                        <textarea
                          placeholder="Please enter full name and phone coordinates: e.g. Emmanuel Weah, +231 77 987 654"
                          value={withdrawAccountDetails}
                          onChange={(e) => setWithdrawAccountDetails(e.target.value)}
                          rows={2}
                          className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-808 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          required
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmittingWithdrawal}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-805 text-white font-black rounded-lg text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          {isSubmittingWithdrawal ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Submitting Cashout...
                            </>
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5" />
                              Request Payout Transfer
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 4: DIRECT PAYMENT TO PLATFORM (Deducts balance immediately) */}
                {luckyDrawTab === 'direct' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 font-sans">
                        <CreditCard className="w-5 h-5 text-indigo-500" />
                        Send Direct Payment to Platform
                      </h3>
                      <p className="text-slate-450 text-[10.5px] leading-relaxed font-sans">
                        Pay swiftly for custom administrative fees, waybill logistics, agent sourcing actions, or miscellaneous platform duties using your savings account balance.
                      </p>
                    </div>

                    <form onSubmit={handleDirectPaymentSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                          Payment Purpose / Category
                        </label>
                        <select
                          value={directPaymentDescription}
                          onChange={(e) => setDirectPaymentDescription(e.target.value)}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold text-slate-808"
                        >
                          <option value="Custom Guangzhou Factory Sourcing Service">Custom Guangzhou Factory Sourcing Service</option>
                          <option value="Express Monrovia Customs Clearing Fee">Express Monrovia Customs Clearing Fee</option>
                          <option value="Waybill Sea/Air Flight Logistics Fee">Waybill Sea/Air Flight Logistics Fee</option>
                          <option value="One-on-One Sourcing Administration Bond">One-on-One Sourcing Administration Bond</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                          Extra Transfer Notes &amp; Details (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Enter delivery batch numbers, invoice reference, or product notes..."
                          className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-805 focus:outline-none"
                          onBlur={(e) => {
                            if (e.target.value.trim() !== "") {
                              setDirectPaymentDescription(prev => `${prev.split(' (Details:')[0]} (Details: ${e.target.value})`);
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">
                          Amount to Pay (LRD)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 1500 LRD"
                          value={directPaymentAmount}
                          onChange={(e) => setDirectPaymentAmount(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-805 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          required
                        />
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50 flex gap-3 text-xs text-slate-655">
                        <span className="text-slate-900 font-extrabold text-base pt-0.5">🔒</span>
                        <div>
                          <p className="font-extrabold text-slate-805 uppercase tracking-tight text-[9px] font-sans">Instant Wallet Settlement</p>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-sans">
                            Once clicked, the specified sum is deducted immediately from your total balance of <strong className="text-slate-800 font-bold">LRD {(currentUser?.accountBalance || 0).toLocaleString()} LRD</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmittingDirectPayment}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-805 text-white font-black rounded-lg text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          {isSubmittingDirectPayment ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              Pay Instantly Now
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 5: TRANSACTION LOGS LEDGER */}
                {luckyDrawTab === 'history' && (
                  <div className="space-y-4 animate-fade-in font-sans">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      <History className="w-5 h-5 text-slate-800" />
                      Personal Ledger (Transaction Logs)
                    </h3>

                    {allTransactions.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                        No transactions found for your account. Perform shopping shopping payments or cash out to create logged items.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-120 overflow-y-auto pr-1">
                        {allTransactions.map((txn) => {
                          const isNegative = txn.amount < 0;
                          return (
                            <div key={txn.id} className="border border-slate-150 rounded-xl p-3 flex justify-between items-center text-xs bg-slate-50 hover:bg-indigo-50/50 transition-colors">
                              <div className="space-y-1">
                                <p className="text-slate-800 font-extrabold flex items-center gap-1.5 leading-none">
                                  <span>{isNegative ? '📉' : '📈'}</span>
                                  {txn.remarks || (txn.type === 'deposit' ? 'Approved Deposit' : txn.type === 'withdrawal' ? 'Approved Cashout' : 'Platform Payment')}
                                </p>
                                <div className="flex items-center gap-2 text-[8.5px] text-slate-400 font-mono">
                                  <span>ID: {txn.referenceId || txn.id}</span>
                                  <span>&bull;</span>
                                  <span>{new Date(txn.timestamp).toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`text-[13px] font-mono font-black ${isNegative ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}`}>
                                  {isNegative ? '-' : '+'}{(Math.abs(txn.amount)).toLocaleString()} LRD
                                </span>
                                <span className="block text-[8px] uppercase tracking-wider font-extrabold text-[#74879b] mt-0.5">{txn.type}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECONDARY RIGHT COLUMN: DEPOSITS & WITHDRAWALS WAIT LIST STATUSES */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* ACCOUNT BALANCES & RECIPIENTS OVERVIEW CARD */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                  <span className="text-[10px] font-black uppercase text-[#111827] tracking-wider block border-b border-rose-50 pb-2 font-sans font-extrabold">MoMo Endpoints summary</span>
                  <div className="space-y-3 font-semibold text-xs text-slate-705">
                    <div className="bg-orange-50/30 p-2.5 rounded-lg border border-orange-100 flex items-center justify-between bg-slate-50">
                      <div>
                        <p className="font-extrabold text-[10.5px] text-slate-804 font-sans text-orange-600 font-bold">🍊 Orange Network Endpoint</p>
                        <p className="text-[10px] text-slate-800 font-mono mt-0.5">{platformSettings.liberiaOrangeNumber || '+231 77 111 2222'}</p>
                      </div>
                      <span className="text-[9px] bg-white text-orange-600 border border-orange-100 font-extrabold px-1.5 py-0.5 rounded uppercase leading-none font-sans">Active</span>
                    </div>

                    <div className="bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-100 flex items-center justify-between bg-slate-50">
                      <div>
                        <p className="font-extrabold text-[10.5px] text-slate-804 font-sans text-indigo-700 font-bold">⭐ Lonestar cell Network Endpoint</p>
                        <p className="text-[10px] text-[#334155] font-mono mt-0.5">{platformSettings.liberiaLonestarNumber || '+231 88 111 2222'}</p>
                      </div>
                      <span className="text-[9px] bg-white text-indigo-700 border border-indigo-100 font-extrabold px-1.5 py-0.5 rounded uppercase leading-none font-sans">Active</span>
                    </div>
                  </div>
                </div>

                {/* MY PENDING DEPOSITS WAIT LIST */}
                <div className="bg-white border border-slate-205 rounded-3xl p-5 shadow-xs space-y-4 font-sans">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10.5px] font-black uppercase text-slate-[#131b25] tracking-tight font-extrabold">Momo Deposits queue ({pointsPurchases.length})</span>
                    <button type="button" onClick={() => setLuckyDrawTab('buy_points')} className="text-[10.5px] font-extrabold text-blue-600 hover:text-blue-800 cursor-pointer">New Deposit</button>
                  </div>

                  {pointsPurchases.length === 0 ? (
                    <p className="text-[10px] text-slate-400 leading-relaxed py-4 text-center border border-dashed border-slate-150 rounded-2xl">
                      Deposit list is completely empty. Transfer mobile money and submit a receipt screenshot above.
                    </p>
                  ) : (
                    <div className="space-y-3.5 max-h-56 overflow-y-auto pr-0.5 animate-fade-in">
                      {pointsPurchases.map((dep) => (
                        <div key={dep.id} className="border border-slate-150 rounded-xl p-3 bg-slate-50 text-xs">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-extrabold text-[#1f2937] text-xs">+{(dep.amountLrd).toLocaleString()} LRD</p>
                              <p className="text-[8px] text-slate-400 font-mono mt-0.5">{new Date(dep.createdAt).toLocaleString()}</p>
                            </div>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              dep.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                              dep.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                              'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                            }`}>
                              {dep.status}
                            </span>
                          </div>

                          <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-100 text-[10px] text-slate-505 leading-tight">
                            <p><span className="text-slate-400 font-medium font-bold">Sender:</span> <strong className="font-semibold text-slate-707">{dep.paymentSenderDetails}</strong></p>
                            <p><span className="text-slate-400 font-medium font-bold font-sans">Via:</span> {dep.paymentProvider}</p>
                            {dep.adminNotes && (
                              <p className="text-amber-705 mt-1 pt-1 border-t border-slate-50 font-bold">
                                <span className="text-slate-550 font-medium text-amber-600">Admin memo:</span> {dep.adminNotes}
                              </p>
                            )}
                            {dep.receiptImage && (
                              <div className="pt-2">
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-1">Uploaded Payment Proof:</p>
                                <a href={dep.receiptImage} target="_blank" rel="noopener noreferrer" className="inline-block relative rounded-md overflow-hidden border border-slate-150 h-10 w-16 hover:opacity-80 transition-opacity">
                                  <img src={dep.receiptImage} alt="Receipt Proof" className="h-full w-full object-cover" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* MY PENDING PAYOUT TRANSFER WITHDRAWALS */}
                <div className="bg-white border border-slate-205 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10.5px] font-black uppercase text-slate-[#131b25] tracking-tight font-extrabold">Withdrawals ({customerWithdrawals.length})</span>
                    <button type="button" onClick={() => setLuckyDrawTab('withdraw')} className="text-[10.5px] font-extrabold text-blue-600 hover:text-blue-800 cursor-pointer">New Request</button>
                  </div>

                  {customerWithdrawals.length === 0 ? (
                    <p className="text-[10px] text-slate-400 leading-relaxed py-4 text-center border border-dashed border-slate-150 rounded-2xl">
                      Withdrawal queue is empty. Cashouts can be requested at any time.
                    </p>
                  ) : (
                    <div className="space-y-3.5 max-h-56 overflow-y-auto pr-0.5 animate-fade-in">
                      {customerWithdrawals.map((wd) => (
                        <div key={wd.id} className="border border-slate-150 rounded-xl p-3 bg-slate-50 text-xs">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-extrabold text-rose-600 text-xs">-{(wd.amount).toLocaleString()} LRD</p>
                              <p className="text-[8px] text-slate-400 font-mono mt-0.5">{new Date(wd.createdAt).toLocaleString()}</p>
                            </div>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              wd.status === 'completed' || wd.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                              wd.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                              'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                            }`}>
                              {wd.status}
                            </span>
                          </div>

                          <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-100 text-[10px] text-slate-550 leading-tight">
                            <p><span className="text-slate-450 font-medium font-bold font-sans">Carrier:</span> {wd.paymentMethod}</p>
                            <p><span className="text-slate-455 font-medium font-bold font-mono">Details:</span> {wd.accountDetails}</p>
                            {wd.adminReceiptImage && (
                              <div className="pt-2">
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-1">Admin Outgoing Transfer Proof:</p>
                                <a href={wd.adminReceiptImage} target="_blank" rel="noopener noreferrer" className="outline-none inline-block relative rounded-md overflow-hidden border border-slate-200 h-10 w-16 hover:opacity-80 transition-opacity">
                                  <img src={wd.adminReceiptImage} alt="Payment Receipt" className="h-full w-full object-cover" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                    {/* Removed obsolete step 2 */}

                    {/* Removed redundant gateway instructions card */}

                    {/* Removed obsolete point / receipt purchase forms */}

                    {/* USER POINTS PURCHASE HISTORY LIST */}
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest select-none">Points Request Ledger</h4>
                      {pointsPurchases.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-semibold">No points purchases logged yet. Complete the form above to add points.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {pointsPurchases.map((pur) => (
                            <div key={pur.id} className="border border-slate-150 rounded-xl p-2.5 flex items-center justify-between text-xs font-semibold">
                              <div>
                                <p className="text-slate-800">
                                  <strong className="text-slate-900 font-extrabold">{pur.amountLrd} Pts</strong> ({pur.paymentProvider})
                                </p>
                                <p className="text-[8.5px] text-slate-400 font-mono mt-0.5">{pur.createdAt ? new Date(pur.createdAt).toLocaleString() : ''}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                pur.status === 'approved' ? 'bg-emerald-50 text-emerald-800' :
                                pur.status === 'rejected' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {pur.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                {/* TAB 3: CUSTOMER WITHDRAW CASH FLOW */}
                {luckyDrawTab === 'withdraw' && (
                  <div className="space-y-5 animate-fade-in">
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      <Coins className="w-5 h-5 text-orange-500" />
                      Client Cash Out Panel (Liberia Mobile Payout)
                    </h3>

                    {/* WITHDRAWAL CARD */}
                    <div className="bg-emerald-550/10 border border-emerald-550/20 text-emerald-800 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-[#22c55e] tracking-wider block">Eligible Balance</span>
                        <p className="text-2xl font-black font-mono">LRD {(currentUser?.withdrawableBalance || 0).toLocaleString()}</p>
                        <p className="text-[9.5px] text-slate-450 leading-none">Available for instant mobile cash withdrawals.</p>
                      </div>
                      <span className="text-2xl pt-1">💸</span>
                    </div>

                    {/* WITHDRAWAL REQUEST FORM */}
                    <form onSubmit={handleCustomerWithdrawSubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Withdrawal Amount (Min LRD 1,500)
                        </label>
                        <input
                          type="number"
                          min="1500"
                          placeholder="e.g. 2000"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Mobile Network Carrier
                        </label>
                        <select
                          value={withdrawMethod}
                          onChange={(e) => setWithdrawMethod(e.target.value)}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold text-slate-800"
                        >
                          <option value="Orange Money Liberia (LRD)">Orange Money Liberia Network</option>
                          <option value="Lonestar cell MTN (LRD)">Lonestar Cell MTN Mobile Money</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Receiver Account Name &amp; Phone Number
                        </label>
                        <textarea
                          placeholder="Please enter full name and phone coordinates: e.g. Emmanuel Weah, +231 77 987 654"
                          value={withdrawAccountDetails}
                          onChange={(e) => setWithdrawAccountDetails(e.target.value)}
                          rows={2}
                          className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                          required
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmittingWithdrawal}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-lg text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isSubmittingWithdrawal ? "processing..." : "Submit Cash Withdrawal Request"}
                        </button>
                      </div>
                    </form>

                    {/* WITHDRAWAL HISTORY LEDGER */}
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest select-none">Payout Transactions history</h4>
                      {customerWithdrawals.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-semibold text-center py-2">No preceding withdrawals registered.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {customerWithdrawals.map((req) => (
                            <div key={req.id} className="border border-slate-150 rounded-xl p-2.5 flex items-center justify-between text-xs font-semibold bg-slate-50/50">
                              <div>
                                <p className="text-slate-800">
                                  <strong className="text-slate-900 font-extrabold">LRD {req.amount.toLocaleString()}</strong> ({req.paymentMethod})
                                </p>
                                <p className="text-[8.5px] text-slate-400 leading-relaxed font-mono mt-0.5">{req.createdAt ? new Date(req.createdAt).toLocaleString() : ''}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                req.status === 'approved' ? 'bg-emerald-50 text-emerald-800' :
                                req.status === 'rejected' ? 'bg-red-50 text-red-805' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: WINNERS LIST & PROMOS */}
                {luckyDrawTab === 'winners' && (
                  <div className="space-y-5 animate-fade-in">
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      <Trophy className="w-5 h-5 text-orange-500" />
                      Grand Promos &amp; Pool Winners
                    </h3>

                    {/* ANNOUNCEMENT BOXES */}
                    {latestWinnerAnnouncements.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center text-xs text-slate-400">
                        No official winner board postings uploaded for current month. Stay tuned!
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {latestWinnerAnnouncements.map((ann) => (
                          <div key={ann.id} className="border border-amber-200 bg-amber-50/20 rounded-2xl p-4 space-y-2 leading-relaxed text-xs">
                            <span className="text-[8.5px] font-black uppercase tracking-widest text-amber-600">RAFFLE UPDATE &bull; {ann.monthYear}</span>
                            <p className="font-extrabold text-[#111827] text-[13px]">{ann.description}</p>
                            {ann.image && (
                              <div className="rounded-xl overflow-hidden max-h-52 w-full mt-2 border border-slate-200">
                                <img src={ann.image} alt="Announcement Poster" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <p className="text-[8px] text-slate-400 font-mono text-right">{new Date(ann.publishedAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* HISTORICAL MONTHLY STATS & ACTIVE RAFFLES RECORD */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Global Raffle Board Activity</h4>
                      {monthlyStatsList.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-semibold font-mono">Statistical logging indices empty.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {monthlyStatsList.map((stat) => (
                            <div key={stat.id} className="border border-slate-150 rounded-xl p-3 space-y-2.5 bg-slate-50/50">
                              <div className="flex justify-between items-center bg-white p-1.5 rounded-lg border border-slate-200">
                                <span className="font-mono text-slate-450 font-semibold uppercase text-[9.5px]">Month key:</span>
                                <span className="font-black text-[10px] text-slate-800">{stat.monthYear}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-semibold uppercase text-[9px]">Total System Spins:</span>
                                <span className="font-extrabold text-slate-800">{stat.totalSpins} spins</span>
                              </div>

                              {/* WINNERS INSIDE */}
                              <div className="pt-2 border-t border-slate-150">
                                <p className="text-[8.5px] uppercase font-black text-[#74879b] tracking-wider mb-1">Determined Winners ({stat.winners?.length || 0})</p>
                                {(!stat.winners || stat.winners.length === 0) ? (
                                  <p className="text-[9.5px] text-slate-450 font-medium font-serif italic">Pending month-end tally review...</p>
                                ) : (
                                  <div className="space-y-1">
                                    {stat.winners.map((win, sIdx) => (
                                      <div key={sIdx} className="flex justify-between items-center text-[10px] font-semibold text-slate-700">
                                        <span>🏆 {win.username}</span>
                                        <span className="text-orange-500 font-black">{win.prize} ({win.rank})</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: MY SPIN HISTORY COORD */}
                {luckyDrawTab === 'history' && (
                  <div className="space-y-4">
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 animate-fade-in">
                      <History className="w-5 h-5 text-orange-500" />
                      Individual Roll logs
                    </h3>

                    {customerSpins.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                        No spins logged for your account. Head over to 🎡 Wheel Arena to take your first monthly Free Spin!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {customerSpins.map((spin) => (
                          <div key={spin.id} className="border border-slate-150 rounded-xl p-3 flex justify-between items-center text-xs font-semibold bg-slate-50/50">
                            <div className="space-y-1">
                              <p className="text-slate-800 font-extrabold flex items-center gap-1.5">
                                <span className="text-amber-500">🎉</span>
                                {spin.prizeName || 'Consolidation Booster / Entry'}
                              </p>
                              <p className="text-[8.5px] text-slate-400 font-mono">{new Date(spin.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[#3b82f6] text-[10.5px] font-black uppercase text-right tracking-tight">{spin.isFree ? '🍀 FREE' : '💎 PAID'}</p>
                              <p className="text-[9px] text-slate-450 leading-none mt-0.5">{spin.pointsCost} Points used</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

      </main>

      {/* SHOPPING CART OVERLAY Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in" onClick={() => setIsCartOpen(false)} />

          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-sm bg-white shadow-xl flex flex-col justify-between">
              
              <div className="p-3 border-b border-slate-150 flex items-center justify-between bg-slate-50">
                <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-widest">
                  <ShoppingCart className="w-4 h-4 text-red-600" />
                  Your Shopping Cart
                </h3>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              {/* CART CONTENT ROWS */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <ShoppingBag className="w-8 h-8 text-slate-200 mx-auto" />
                    <p className="text-slate-400 font-bold text-xs">Your shopping bag is completely empty.</p>
                  </div>
                ) : (
                  cartItems.map(item => {
                    const product = allProducts.find(p => p.productId === item.productId);
                    if (!product) return null;
                    return (
                      <div key={`${item.productId}-${item.size || 'default'}`} className="flex gap-3 border-b border-slate-150 pb-3 last:border-0 last:pb-0">
                        <img src={product.images?.[0]} className="w-12 h-12 rounded object-cover shrink-0 border border-slate-200" />
                        <div className="flex-1 flex flex-col justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-800 leading-tight line-clamp-1">{product.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[9px] text-slate-400 font-semibold">{getStoreName(product.storeId)}</span>
                              {item.size && (
                                <span className="bg-[#ff6600]/10 text-[#ff6600] font-black rounded px-1.5 py-0.2 text-[8px] uppercase">
                                  Size: {item.size}
                                </span>
                              )}
                            </div>
                            {(() => {
                              const fee = calculateItemShippingFee(product, item.quantity);
                              return (
                                <p className="text-[9px] font-bold mt-1 text-indigo-600">
                                  <span>Express Shipping: ${fee.toFixed(2)}</span>
                                </p>
                              );
                            })()}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center border border-slate-200 rounded bg-slate-50 overflow-hidden">
                              <button 
                                onClick={() => handleUpdateCartQuantity(item.productId, -1, item.size)}
                                className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="px-2 text-[11px] font-bold text-slate-800">{item.quantity}</span>
                              <button 
                                onClick={() => handleUpdateCartQuantity(item.productId, 1, item.size)}
                                className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            <p className="text-red-655 font-black">${(product.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleRemoveFromCart(item.productId, item.size)}
                          className="self-start text-slate-300 hover:text-rose-500 transition-colors mt-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* CALCULATIONS */}
              {cartItems.length > 0 && (() => {
                const totalFreight = cartItems.reduce((acc, cartItem) => {
                  const p = allProducts.find(product => product.productId === cartItem.productId);
                  if (!p) return acc;
                  return acc + calculateItemShippingFee(p, cartItem.quantity);
                }, 0);
                const grandCartTotal = cartSubtotal + totalFreight;
                return (
                  <div className="p-3 border-t border-slate-150 space-y-2.5 bg-slate-50 text-xs text-slate-700">
                    <div className="space-y-1.5 border-b border-slate-200 pb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Subtotal:</span>
                        <span className="text-slate-700 font-extrabold">${cartSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Waybill Freight:</span>
                        {totalFreight === 0 ? (
                          <span className="text-emerald-600 font-black uppercase">Free Shipping</span>
                        ) : (
                          <span className="text-slate-700 font-extrabold">${totalFreight.toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-800 font-black uppercase tracking-wider">Total Amount:</span>
                      <span className="text-red-655 font-black text-sm">${grandCartTotal.toFixed(2)}</span>
                    </div>

                    <div className="space-y-1.5">
                      <button
                        onClick={handleProceedToCheckout}
                        className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition-all uppercase tracking-wider cursor-pointer shadow-xs"
                      >
                        Proceed to Final Checkout
                      </button>
                      <p className="text-[10px] text-center text-slate-400 font-semibold leading-normal">
                        Including potential custom express delivery clearance.
                      </p>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT DELIVERY MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded max-w-sm w-full shadow-md overflow-hidden border border-slate-200 animate-in fade-in duration-150 flex flex-col max-h-[90vh]">
            <div className="p-3 border-b border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-widest">Dispatch Order Waybill</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmitCheckout} className="p-3 space-y-3 overflow-y-auto flex-1">
              <div className="bg-blue-50 text-blue-900 p-2 border border-blue-200 rounded flex items-start gap-1.5 text-[11px] leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 text-blue-600 mt-0.5" />
                <p>
                  Voya splits transactions automatically. Separate vendor invoices will be sent to Guangzhou or Shenzhen partners depending on product design tags.
                </p>
              </div>

              {(() => {
                const totalFreight = cartItems.reduce((acc, cartItem) => {
                  const p = allProducts.find(product => product.productId === cartItem.productId);
                  if (!p) return acc;
                  return acc + calculateItemShippingFee(p, cartItem.quantity);
                }, 0);
                const grandCartTotal = cartSubtotal + totalFreight;
                const totalWeight = cartItems.reduce((acc, cartItem) => {
                  const p = allProducts.find(product => product.productId === cartItem.productId);
                  if (!p) return acc;
                  return acc + ((p.weight || 0) * cartItem.quantity);
                }, 0);
                return (
                  <div className="space-y-3">
                    <div className="border border-slate-150 rounded p-2.5 bg-slate-50/70 space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Cargo Subtotal:</span>
                        <span className="font-bold text-slate-800">${cartSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Consignment Weight:</span>
                        <span className="font-bold text-slate-800">{totalWeight.toFixed(2)} kg</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Consignment Freight:</span>
                        {totalFreight === 0 ? (
                          <span className="font-extrabold text-emerald-600">FREE SHIPPING</span>
                        ) : (
                          <span className="font-bold text-slate-800">${totalFreight.toFixed(2)}</span>
                        )}
                      </div>
                      {actualPointsApplied > 0 && (
                        <div className="flex justify-between text-emerald-600 font-bold border-b border-slate-200 pb-2">
                          <span className="uppercase text-[9px]">Points Discount:</span>
                          <span>- LRD {actualPointsApplied.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 text-[11px] font-black text-slate-900 uppercase">
                        <span>Total Waybill Value:</span>
                        <span className="text-red-650 text-sm font-black">
                          {netRemainingLrd === 0 ? "LRD 0.00 (PAID)" : `LRD ${netRemainingLrd.toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    {currentUser && (currentUser.pointsBalance || 0) > 0 && (
                      <div className="border border-amber-250 bg-amber-50/40 rounded p-2.5 space-y-2 text-xs">
                        <label className="flex items-center gap-1 w-full font-extrabold text-slate-800 text-[10px] uppercase cursor-pointer">
                          <input
                            type="checkbox"
                            checked={usePointsForCheckout}
                            onChange={(e) => {
                              setUsePointsForCheckout(e.target.checked);
                              if (e.target.checked) {
                                setPointsToApply(Math.min(grandCartTotal, currentUser.pointsBalance || 0));
                              } else {
                                setPointsToApply(0);
                              }
                            }}
                            className="mr-1.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          Apply points for discount
                        </label>
                        <p className="text-[9px] text-slate-500 font-medium leading-normal mt-0.5">
                          You have <strong>{currentUser.pointsBalance}</strong> available points. (1 point = 1 LRD discount).
                        </p>
                        {usePointsForCheckout && (
                          <div className="flex items-center gap-2 pt-1 border-t border-amber-100 mt-1">
                            <span className="text-[9px] text-slate-450 font-black uppercase">Points to redeem:</span>
                            <input
                              type="number"
                              min="1"
                              max={Math.min(grandCartTotal, currentUser.pointsBalance || 0)}
                              value={pointsToApply}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setPointsToApply(Math.min(val, grandCartTotal, currentUser.pointsBalance || 0));
                              }}
                              className="w-20 px-2 py-0.5 border border-amber-200 rounded text-[10.5px] font-black text-slate-800 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delivery Shipping Address</label>
                <textarea
                  value={checkoutAddress}
                  onChange={(e) => setCheckoutAddress(e.target.value)}
                  placeholder="Enter full physical address coordinates..."
                  rows={2}
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              {/* PAYMENT REGION: CHOOSE LIBERIA MOBILE MONEY GATEWAY */}
              {netRemainingLrd > 0 ? (
                <div className="space-y-3 pt-2.5 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">📱 Mobile Money Payment (Liberia Support)</label>
                    <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">Only MM Accepted</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentProvider('orange');
                        setPaymentReference('');
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        paymentProvider === 'orange'
                          ? 'border-orange-550 bg-orange-50/40 ring-1 ring-orange-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🍊</span>
                        <div className="leading-tight">
                          <p className="font-extrabold text-[10.5px] text-slate-800">Orange Money</p>
                          <p className="text-[8.5px] text-slate-400">Liberia Network</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentProvider('lonestar');
                        setPaymentReference('');
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        paymentProvider === 'lonestar'
                          ? 'border-indigo-650 bg-indigo-50/40 ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">⭐</span>
                        <div className="leading-tight">
                          <p className="font-extrabold text-[10.5px] text-slate-800">Lonestar Cell</p>
                          <p className="text-[8.5px] text-slate-400 font-semibold text-indigo-700">MTN Mobile Money</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* DYNAMIC PAYMENT INSTRUCTIONS CONTAINER */}
                  <div className="bg-slate-50/80 rounded-lg border border-slate-200 p-2.5 text-[10.5px] space-y-1.5">
                    <span className="text-[8.5px] font-black uppercase text-[#74879b] tracking-wider block">
                      {paymentProvider === 'orange' ? '🍊 Orange Money Liberia instructions' : '⭐ Lonestar Cell MTN instructions'}
                    </span>
                    
                    <div className="space-y-1">
                      <p className="text-slate-600 font-semibold leading-relaxed">Please transfer the exact order cost to the following platform admin wallet:</p>
                      <div className="grid grid-cols-3 gap-0.5 font-bold text-slate-800 mt-1">
                        <span className="text-slate-400 font-medium text-[9.5px]">Provider:</span>
                        <span className="col-span-2 text-slate-900 text-[10px]">
                          {paymentProvider === 'orange' ? 'Orange Mobile Money' : 'Lonestar Cell MTN Mobile Money'}
                        </span>
                        
                        <span className="text-slate-400 font-medium text-[9.5px]">Wallet Number:</span>
                        <span className="col-span-2 text-red-600 font-mono text-xs font-black">
                          {paymentProvider === 'orange' 
                            ? (platformSettings.liberiaOrangeNumber || '+231 77 111 2222') 
                            : (platformSettings.liberiaLonestarNumber || '+231 88 111 2222')
                          }
                        </span>
                        
                        <span className="text-slate-400 font-medium text-[9.5px]">Wallet Name:</span>
                        <span className="col-span-2 text-slate-900 text-[10px]">
                          {paymentProvider === 'orange' 
                            ? (platformSettings.liberiaOrangeName || 'Voya Liberia Orange Settlement') 
                            : (platformSettings.liberiaLonestarName || 'Voya Liberia Lonestar Settlement')
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PAYMENT PROOFS FORM */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                        Your Cash Wallet Number (Sender Mobile Number)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +231 77 987 654"
                        value={paymentSenderDetails}
                        onChange={(e) => setPaymentSenderDetails(e.target.value)}
                        className="mt-0.5 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
                        required={netRemainingLrd > 0}
                      />
                    </div>

                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                        Transaction ID (Reference / Code)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. TXN-891045239"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="mt-0.5 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
                        required={netRemainingLrd > 0}
                      />
                    </div>

                    {/* PAYMENT RECEIPT UPLOAD */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[9.5px] font-extrabold text-slate-505 uppercase tracking-wide mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                          Upload Decisive Payment Receipt Screenshot
                        </div>
                        <span className="text-[8px] text-red-550 font-black lowercase tracking-widest bg-red-50 px-1 py-0.5 rounded border border-red-100">Strictly Required</span>
                      </label>
                      <div className="flex items-center gap-2.5">
                        {paymentReceipt ? (
                          <div className="relative w-12 h-12 rounded border border-slate-250 overflow-hidden shrink-0 bg-slate-100 group">
                            <img src={paymentReceipt} alt="Receipt Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setPaymentReceipt(null)}
                              className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[8px] font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded border border-dashed border-slate-250 flex items-center justify-center shrink-0 bg-slate-50 text-slate-400">
                            <Upload className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setPaymentReceipt(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                } catch (err) {
                                  showToast("Failed to process attachment file", "error");
                                }
                              }
                            }}
                            id="checkoutReceiptUpload"
                            className="hidden"
                          />
                          <label
                            htmlFor="checkoutReceiptUpload"
                            className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 border border-slate-200 rounded text-[9px] font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-xs"
                          >
                            <Upload className="w-2.5 h-2.5" />
                            {paymentReceipt ? "Change File" : "Choose Photo"}
                          </label>
                          <p className="text-[8.5px] text-slate-400 font-medium mt-0.5 leading-none">
                            Jpeg, png, pdf receipts, screenshots.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-center space-y-1 mt-2">
                  <div className="text-xl">🎉</div>
                  <p className="text-emerald-800 font-extrabold text-[10.5px] uppercase tracking-wider">Paid with Points!</p>
                  <p className="text-[9.5px] text-emerald-600 leading-relaxed font-semibold">
                    This order is fully covered by your point balance. No external cash payments are required.
                  </p>
                </div>
              )}

              <div className="flex gap-1.5 justify-end pt-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-red-600 text-white font-bold rounded text-xs hover:bg-red-700 shadow-xs cursor-pointer"
                >
                  Submit Order Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST PAYMENT METHOD ADDITION MODAL */}
      {isRequestPaymentMethodOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-51 backdrop-blur-xs">
          <div className="bg-white rounded max-w-sm w-full shadow-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="p-3 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-800">
                Sourcing Request: Payment Addon
              </h4>
              <button
                type="button"
                onClick={() => setIsRequestPaymentMethodOpen(false)}
                className="text-slate-405 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleRequestPaymentMethodSubmit} className="p-3.5 space-y-3 overflow-y-auto">
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                We are actively expanding multination-sourcing. If you are buying from <strong>Liberia (using Mobile Money)</strong> or the <strong>USA (using Wise)</strong>, request your favorite wallet/endpoint here.
              </p>
              
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-450">
                  Requested Gateway / System Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Orange Mobile Money Liberia / Wise USD / LRD Wallet"
                  value={requestedMethodName}
                  onChange={(e) => setRequestedMethodName(e.target.value)}
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-bold focus:ring-1 focus:ring-amber-400 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-450">
                  Transaction Notes &amp; Logistics (Optional)
                </label>
                <textarea
                  placeholder="e.g. I have Orange mobile money +23188... and want to pay directly"
                  rows={2}
                  value={requestedMethodDetails}
                  onChange={(e) => setRequestedMethodDetails(e.target.value)}
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-semibold focus:ring-1 focus:ring-amber-400 outline-none"
                />
              </div>
              
              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestPaymentMethodOpen(false)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded text-[10px] font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMethodRequest}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded text-[10px] font-extrabold uppercase transition shadow-3xs cursor-pointer"
                >
                  {isSubmittingMethodRequest ? 'Submitting...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATIC LANDING BRAND FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="font-bold text-slate-200 text-sm">{platformSettings.siteName} &bull; Savie&apos;s Enterprise</p>
            <p className="text-[11px] text-slate-500 mt-1">Guangzhou Direct Factory Lines &amp; Traditional Shenzhen Crafts.</p>
          </div>
          <div className="text-slate-500 text-[10px] font-medium leading-relaxed">
            <p>{platformSettings.contactAddress}</p>
            <p className="mt-0.5">Hotline: {platformSettings.contactPhone} &bull; Email: {platformSettings.contactEmail}</p>
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {isMobile && (
        <div 
          id="pdd-bottom-nav" 
          className="fixed bottom-0 left-0 right-0 h-[64px] bg-white/95 backdrop-blur-md border-t border-slate-200/85 shadow-[0_-5px_22px_rgba(0,0,0,0.06)] z-50 flex justify-around items-center px-3 pb-safe-bottom md:hidden"
        >
          {/* Home Option */}
          <button
            onClick={() => {
              setActiveMode('landing');
              setSelectedProduct(null);
            }}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-all cursor-pointer relative"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Home className={`w-[18px] h-[18px] transition-transform ${activeMode === 'landing' ? 'text-red-600 scale-110 font-bold' : 'text-slate-400 scale-100'}`} />
            <span className={`text-[9.5px] mt-1 font-bold uppercase tracking-wider transition-all duration-200 ${activeMode === 'landing' ? 'text-red-600 font-extrabold' : 'text-slate-500 font-semibold'}`}>
              Home
            </span>
            {activeMode === 'landing' && (
              <span className="absolute bottom-[2px] w-1 h-1 rounded-full bg-red-650" />
            )}
          </button>

          {/* Catalog/Search Option */}
          <button
            onClick={() => {
              setActiveMode('shop');
              setSelectedProduct(null);
              // Focus search box smoothly after short delay so tab switches first
              setTimeout(() => {
                const searchInput = document.querySelector('input[placeholder*="Search"]');
                if (searchInput) {
                  (searchInput as HTMLInputElement).focus();
                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 120);
            }}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-all cursor-pointer relative"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Search className={`w-[18px] h-[18px] transition-transform ${activeMode === 'shop' ? 'text-red-600 scale-110 font-bold' : 'text-slate-400 scale-100'}`} />
            <span className={`text-[9.5px] mt-1 font-bold uppercase tracking-wider transition-all duration-200 ${activeMode === 'shop' ? 'text-red-600 font-extrabold' : 'text-slate-500 font-semibold'}`}>
              Search
            </span>
            {activeMode === 'shop' && (
              <span className="absolute bottom-[2px] w-1 h-1 rounded-full bg-red-655" />
            )}
          </button>

          {/* Cart Option with Counter */}
          <button
            onClick={() => {
              if (!currentUser) {
                showToast('Please login or register to access the shopping cart.', 'info');
                setAuthModalMode('login');
                setShowAuthModal(true);
              } else {
                setIsCartOpen(true);
              }
            }}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-all cursor-pointer relative"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <div className="relative">
              <ShoppingCart className={`w-[18px] h-[18px] transition-transform ${isCartOpen ? 'text-red-600 scale-110 font-bold' : 'text-slate-400 scale-100'}`} />
              {cartTotalItems > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-600 text-white font-extrabold text-[8px] min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center shadow-xs border border-white leading-none">
                  {cartTotalItems}
                </span>
              )}
            </div>
            <span className={`text-[9.5px] mt-1 font-bold uppercase tracking-wider transition-all duration-200 ${isCartOpen ? 'text-red-600 font-extrabold' : 'text-slate-500 font-semibold'}`}>
              Cart
            </span>
            {isCartOpen && (
              <span className="absolute bottom-[2px] w-1 h-1 rounded-full bg-red-655" />
            )}
          </button>

          {/* Wishlist Option */}
          <button
            onClick={() => {
              if (!currentUser) {
                showToast('Please login or register to access your wishlist.', 'info');
                setAuthModalMode('login');
                setShowAuthModal(true);
                return;
              }
              setActiveMode('wishlist');
              setSelectedProduct(null);
            }}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-all cursor-pointer relative"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <div className="relative">
              <Heart className={`w-[18px] h-[18px] transition-transform ${activeMode === 'wishlist' ? 'text-red-600 scale-110 font-bold' : 'text-slate-400 scale-100'}`} />
              {wishlistProductIds.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-600 text-white font-extrabold text-[8px] min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center shadow-xs border border-white leading-none">
                  {wishlistProductIds.length}
                </span>
              )}
            </div>
            <span className={`text-[9.5px] mt-1 font-bold uppercase tracking-wider transition-all duration-200 ${activeMode === 'wishlist' ? 'text-red-600 font-extrabold' : 'text-slate-500 font-semibold'}`}>
              Wishlist
            </span>
            {activeMode === 'wishlist' && (
              <span className="absolute bottom-[2px] w-1 h-1 rounded-full bg-red-655" />
            )}
          </button>

          {/* Profile Settings Option */}
          <button
            onClick={() => {
              if (!currentUser) {
                showToast('Please login or register to access your profile settings.', 'info');
                setAuthModalMode('login');
                setShowAuthModal(true);
                return;
              }
              setActiveMode('profile');
              setSelectedProduct(null);
            }}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-all cursor-pointer relative"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <UserIcon className={`w-[18px] h-[18px] transition-transform ${activeMode === 'profile' ? 'text-red-600 scale-110 font-bold' : 'text-slate-400 scale-100'}`} />
            <span className={`text-[9.5px] mt-1 font-bold uppercase tracking-wider transition-all duration-200 ${activeMode === 'profile' ? 'text-red-600 font-extrabold' : 'text-slate-500 font-semibold'}`}>
              Profile
            </span>
            {activeMode === 'profile' && (
              <span className="absolute bottom-[2px] w-1 h-1 rounded-full bg-red-655" />
            )}
          </button>
        </div>
      )}

      {/* GUEST RESTRICTION MODAL */}
      {showGuestRestrictionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-fade-in animate-modal-bg">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col justify-between animate-modal-card">
            <div className="p-3.5 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <h4 className="font-display font-extrabold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5 font-mono">
                <span className="text-amber-500">🔒</span>
                Sourcing Portal Authentication
              </h4>
              <button 
                onClick={() => setShowGuestRestrictionModal(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
                <span className="text-xl">🔐</span>
              </div>
              
              <div className="space-y-1">
                <h3 className="font-display font-black text-slate-800 text-sm uppercase tracking-tight">
                  Please login or register to continue
                </h3>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Voya direct-from-factory catalog items require active enterprise clearance to protect wholesale pricing parameters and bulk allocations.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-150 grid grid-cols-2 gap-3.5">
              <button 
                onClick={() => {
                  console.log('Redirect to login/register');
                  alert('Redirect to login/register');
                  setShowGuestRestrictionModal(false);
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                className="py-2 bg-gradient-to-b from-white to-slate-50 border border-slate-300 rounded-lg text-slate-800 font-extrabold text-[10.5px] uppercase tracking-wider hover:bg-slate-100 cursor-pointer text-center select-none active:scale-95 transition-all"
              >
                Login
              </button>
              <button 
                onClick={() => {
                  console.log('Redirect to login/register');
                  alert('Redirect to login/register');
                  setShowGuestRestrictionModal(false);
                  setAuthModalMode('register');
                  setShowAuthModal(true);
                }}
                className="py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[10.5px] uppercase tracking-wider rounded-lg cursor-pointer text-center select-none shadow-xs border-0 active:scale-95 transition-all"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTHENTICATION MODAL (LOG-IN, REGISTER, RECOVERY, RESET) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col justify-between">
            <div className="p-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                {authModalMode === 'login' && 'Sourcing Portal Access check'}
                {authModalMode === 'register' && 'Platform Onboard Verification'}
                {authModalMode === 'forgot_password' && 'Enterprise Recovery dispatch'}
                {authModalMode === 'reset_password' && 'Authentication Lock overwrite'}
              </h3>
              <button 
                onClick={() => {
                  setShowAuthModal(false);
                  // Clean credentials buffer
                  setLoginEmail('');
                  setLoginPassword('');
                  setRegisterName('');
                  setRegisterEmail('');
                  setRegisterPassword('');
                  setRegisterConfirmPassword('');
                  setRegisterStoreName('');
                  setRegisterStoreDesc('');
                  setResetEmail('');
                  setResetCodeInput('');
                  setResetNewPassword('');
                }} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* LOGIN VIEW PANEL */}
              {authModalMode === 'login' && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!loginEmail || !loginPassword) {
                      showToast('Please provide your complete sourcing account credentials.', 'error');
                      return;
                    }

                    // Enforce special admin account email lock
                    const isAdminEmail = loginEmail.trim().toLowerCase() === 'savieisaiah54@gmail.com';
                    if (isAdminEmail && loginRole !== 'admin') {
                      showToast('The email "savieisaiah54@gmail.com" has exclusive Administrator clearance. Please select Admin role to authenticate.', 'error');
                      return;
                    }
                    if (!isAdminEmail && loginRole === 'admin') {
                      showToast('Unauthorized credentials. Exclusive administrator permissions only.', 'error');
                      return;
                    }

                    try {
                      const users = await dbGetUsers();
                      const matchedUser = users.find(u => 
                        (u.email || '').toLowerCase() === loginEmail.trim().toLowerCase() && 
                        u.password === loginPassword &&
                        u.role === loginRole
                      );

                      if (!matchedUser) {
                        showToast('Authentication failed. Verified account was not found under specified configuration.', 'error');
                        return;
                      }

                      if (matchedUser.blocked) {
                        showToast('Access Denied. Sourcing account has been suspended by corporate operations.', 'error');
                        return;
                      }

                      // Log in!
                      setCurrentUser(matchedUser);
                      localStorage.setItem('voya_active_session', JSON.stringify(matchedUser));
                      showToast(`Credentials verified! Welcome back, ${matchedUser.name}.`, 'success');
                      setShowAuthModal(false);

                      // Re-route appropriately if customer is logged in
                      if (matchedUser.role === 'customer') {
                        setActiveMode(matchedUser.location ? 'shop' : 'landing');
                      }

                      // Retrieve updated lists
                      await loadData();
                    } catch (err) {
                      console.error("Login verification failed on Firestore", err);
                      showToast("Login transaction check encountered an error.", "error");
                    }
                  }} 
                  className="space-y-3 text-xs"
                >
                  <div className="text-center space-y-1">
                    <span className="text-red-650 text-xl font-bold font-mono">🔒</span>
                    <h4 className="font-extrabold text-slate-800 uppercase tracking-wide">Enter Security Credentials</h4>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex gap-1 justify-center">
                    {(['customer', 'seller', 'admin'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setLoginRole(role)}
                        className={`px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${loginRole === role ? 'bg-slate-900 border border-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2 ml-0.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. buyer@voya-direct.net"
                        className="pl-8 pr-2.5 py-1.5 w-full border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Acct Password</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2 ml-0.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter password..."
                        className="pl-8 pr-2.5 py-1.5 w-full border border-slate-200 rounded text-xs text-slate-800 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('forgot_password')}
                      className="text-red-600 hover:text-red-700 font-extrabold text-[10px] uppercase font-mono cursor-pointer"
                    >
                      Forgot Credentials?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-extrabold text-[10.5px] uppercase tracking-wider mt-2 cursor-pointer border-0 shadow-xs"
                  >
                    Authenticate Sourcing Portal &rarr;
                  </button>

                  <div className="text-center text-[10px] font-bold text-slate-400 uppercase pt-2 border-t border-slate-150">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('register')}
                      className="text-red-650 hover:underline cursor-pointer"
                    >
                      Register Now
                    </button>
                  </div>
                </form>
              )}

              {/* REGISTER VIEW PANEL */}
              {authModalMode === 'register' && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!registerName || !registerEmail || !registerPassword || !registerConfirmPassword) {
                      showToast('Please fill in code specifications.', 'error');
                      return;
                    }

                    if (registerEmail.trim().toLowerCase() === 'savieisaiah54@gmail.com') {
                      showToast('Registration is restricted for the default administrator email.', 'error');
                      return;
                    }

                    if (registerPassword !== registerConfirmPassword) {
                      showToast('Passwords do not match. Review confirm specifications.', 'error');
                      return;
                    }

                    if (registerPassword.length < 6) {
                      showToast('Security password must be at least 6 characters long.', 'info');
                      return;
                    }

                    try {
                      const users = await dbGetUsers();
                      const emailExists = users.some(u => (u.email || '').toLowerCase() === registerEmail.trim().toLowerCase());
                      if (emailExists) {
                        showToast('Specification conflict! Email is already registered inside of Voya directory.', 'error');
                        return;
                      }

                      if (registerRole === 'seller' && !registerStoreName) {
                        showToast('Sellers must specify their Factory Store Name before registering.', 'error');
                        return;
                      }

                      const userId = `user-${Date.now()}`;
                      const newUser: User = {
                        userId,
                        name: registerName,
                        email: registerEmail.trim().toLowerCase(),
                        password: registerPassword,
                        role: registerRole,
                        shippingAddress: '',
                        phoneNumber: registerPhone || undefined,
                        referrerNumber: registerReferrerNumber || undefined,
                        blocked: false
                      };

                      // Store new user in Firestore database
                      await dbSaveUser(newUser);

                      // If registering as a Seller, bootstrap their pending factory store immediately
                      if (registerRole === 'seller') {
                        const storeId = `store-${Date.now()}`;
                        const newStore: Store = {
                          storeId,
                          sellerId: userId,
                          storeName: registerStoreName,
                          approved: false, // Savie Isaiah approval mandatory!
                          logo: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(registerStoreName)}`,
                          banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60',
                          description: registerStoreDesc || 'Voya Direct Premium verified factory merchant vendor.',
                          payoutEmail: registerPayoutEmail || registerEmail
                        };

                        await dbSaveStore(newStore);
                        showToast(`Onboarding: Factory Store "${registerStoreName}" has been queued for Admin verification!`, 'info');
                      }

                      // Log the user in automatically to complete setup
                      setCurrentUser(newUser);
                      localStorage.setItem('voya_active_session', JSON.stringify(newUser));
                      showToast(`Registration verified! Welcome, ${registerName}.`, 'success');
                      setShowAuthModal(false);

                      if (newUser.role === 'customer') {
                        setActiveMode('landing'); // Triggers mandatory initial address setup early-return above!
                      }

                      // Reload updated arrays
                      await loadData();
                    } catch (err) {
                      console.error("Failed to commit user registration", err);
                      showToast("Sourcing registration failed. Please review values.", "error");
                    }
                  }}
                  className="space-y-3 text-xs"
                >
                  <div className="text-center space-y-1">
                    <span className="text-red-650 text-xl font-bold font-mono">🌟</span>
                    <h4 className="font-extrabold text-slate-800 uppercase tracking-wide">Register Account Credentials</h4>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex gap-1 justify-center">
                    {(['customer', 'seller'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setRegisterRole(role)}
                        className={`px-3 py-1 text-[9.5px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${registerRole === role ? 'bg-slate-900 border border-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {role === 'customer' ? 'Customer Sourcing' : 'Seller Vendor'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Corporate Name</label>
                    <input
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="e.g. John Doe / Sourcing Corp"
                      className="px-2.5 py-1.5 w-full border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Coordinates</label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="e.g. sourcing@corporation.net"
                      className="px-2.5 py-1.5 w-full border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone Number (Optional)</label>
                    <input
                      type="text"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      placeholder="e.g. +1234567890"
                      className="px-2.5 py-1.5 w-full border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Referrer Number / ID (Optional)</label>
                    <input
                      type="text"
                      value={registerReferrerNumber}
                      onChange={(e) => setRegisterReferrerNumber(e.target.value)}
                      placeholder="e.g. REF-7719 or +123450000"
                      className="px-2.5 py-1.5 w-full border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none"
                    />
                  </div>

                  {registerRole === 'seller' && (
                    <div className="space-y-2.5 bg-red-50/40 p-2.5 rounded border border-red-100 animate-fade-in">
                      <span className="text-[9.5px] font-extrabold text-red-655 uppercase tracking-wide block border-b border-red-100 pb-1">Queue Custom Sourcing Store</span>
                      <div className="space-y-1">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">Store Factory Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={registerStoreName}
                          onChange={(e) => setRegisterStoreName(e.target.value)}
                          placeholder="e.g. Shenzhen OEM Tech Lab"
                          className="px-2 py-1 w-full border border-slate-200 rounded text-[11px] font-semibold text-slate-800 bg-white"
                          required={registerRole === 'seller'}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">Factory Niche Description</label>
                        <input
                          type="text"
                          value={registerStoreDesc}
                          onChange={(e) => setRegisterStoreDesc(e.target.value)}
                          placeholder="What electronics or apparel do you specialize in?"
                          className="px-2 py-1 w-full border border-slate-200 rounded text-[11px] text-slate-800 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">Payout Payment Email</label>
                        <input
                          type="email"
                          value={registerPayoutEmail}
                          onChange={(e) => setRegisterPayoutEmail(e.target.value)}
                          placeholder="To route waybill transactions..."
                          className="px-2 py-1 w-full border border-slate-200 rounded text-[11px] text-slate-800 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Setup Password</label>
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Minimum 6 characters..."
                      className="px-2.5 py-1.5 w-full border border-slate-200 rounded text-xs text-slate-800 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password Address</label>
                    <input
                      type="password"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      placeholder="Repeat password to verify..."
                      className="px-2.5 py-1.5 w-full border border-slate-200 rounded text-xs text-slate-800 focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-extrabold text-[10.5px] uppercase tracking-wider mt-2 cursor-pointer border-0 shadow-xs"
                  >
                    Confirm &amp; Deploy Onboarding &rarr;
                  </button>

                  <div className="text-center text-[10px] font-bold text-slate-400 uppercase pt-2 border-t border-slate-150">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('login')}
                      className="text-red-650 hover:underline cursor-pointer"
                    >
                      Login Scribe
                    </button>
                  </div>
                </form>
              )}

              {/* FORGOT PASSWORD CODE SENDER VIEW */}
              {authModalMode === 'forgot_password' && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    
                    const identifier = resetMethod === 'email' ? resetEmail.trim().toLowerCase() : resetPhone.trim().replace(/\s+/g, '');
                    if (!identifier) {
                      showToast(`Please specify your registered ${resetMethod} coordinate.`, 'error');
                      return;
                    }

                    // Security Rate Limits: Maximum 3 requests per hour
                    const now = Date.now();
                    const rateLimitKey = `voya_reset_requests_${identifier}`;
                    let historicRequests = getLocalStorageData<number[]>(rateLimitKey, []);
                    historicRequests = historicRequests.filter(timestamp => (now - timestamp) < 3600000); // 1 hour duration
                    
                    if (historicRequests.length >= 3) {
                      showToast(`Security threshold met! Maximum 3 code dispatch requests per hour allowed. Try later.`, 'error');
                      return;
                    }

                    // Security Lockout check: 30 minutes lock if too many wrong attempts
                    const lockTime = localStorage.getItem(`voya_lockout_until_${identifier}`);
                    if (lockTime && now < parseInt(lockTime)) {
                      const mins = Math.ceil((parseInt(lockTime) - now) / 60000);
                      showToast(`Access block: This address is locked. Try again in ${mins} minute(s).`, 'error');
                      return;
                    }

                    try {
                      const users = await dbGetUsers();
                      let foundUser: User | undefined;

                      if (resetMethod === 'email') {
                        foundUser = users.find(u => (u.email || '').toLowerCase() === identifier);
                        if (!foundUser) {
                          showToast('Specification error! Provided email coordinate is not registered inside Voya indices.', 'error');
                          return;
                        }
                      } else {
                        foundUser = users.find(u => u.phoneNumber && u.phoneNumber.trim().replace(/\s+/g, '') === identifier);
                        if (!foundUser) {
                          showToast('Specification error! Provided phone number is not registered inside Voya indices.', 'error');
                          return;
                        }
                        // Keep email coordinate saved to seamlessly assist the profile lookup in backend
                        setResetEmail(foundUser.email);
                      }

                      // Generate security random 6-digit OTC code
                      const securityCode = Math.floor(100000 + Math.random() * 900000).toString();
                      
                      // Create verification packet
                      const verificationPacket = {
                        code: securityCode,
                        expiry: now + 600000, // Valid for exactly 10 minutes
                        identifier: identifier,
                        wrongAttempts: 0
                      };
                      
                      await dbSaveRecoveryOtp(identifier, verificationPacket);
                      setGeneratedResetCode(securityCode);
                      setResetIdentifier(identifier);

                      // Track rate limit timestamp
                      historicRequests.push(now);
                      setLocalStorageData(rateLimitKey, historicRequests);

                      if (resetMethod === 'email') {
                        sendResetEmailWithEmailJS(identifier, securityCode, showToast);
                      } else {
                        showToast(`Twilio Mock SMS: Reset code [${securityCode}] created! See demonstration warning block below!`, 'success');
                      }

                      // Forward to password reset view
                      setAuthModalMode('reset_password');
                    } catch (err) {
                      console.error("Failed to generate OTP in Firestore", err);
                      showToast("Password recovery request failed.", "error");
                    }
                  }}
                  className="space-y-3.5 text-xs"
                >
                  <div className="text-center space-y-1">
                    <span className="text-2xl block">📬</span>
                    <h4 className="font-extrabold text-slate-800 uppercase tracking-wide text-xs">Coordinate Recovery Service</h4>
                    <p className="text-[10.5px] text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                      Select your preferred secure recovery channel. A 6-digit OTC verification code will be dispatched in real-time.
                    </p>
                  </div>

                  {/* Dual tab toggles */}
                  <div className="flex bg-slate-100 p-1 rounded text-[9.5px] font-bold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => setResetMethod('email')}
                      className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
                        resetMethod === 'email' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400'
                      }`}
                    >
                      Reset with Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetMethod('phone')}
                      className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
                        resetMethod === 'phone' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400'
                      }`}
                    >
                      Reset with Phone
                    </button>
                  </div>

                  {resetMethod === 'email' ? (
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider text-left">Coordinate Email</label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="e.g. client@voya-direct.net"
                        className="px-2.5 py-1.5 w-full border border-slate-200 rounded text-xs font-semibold text-slate-800 bg-white"
                        required={resetMethod === 'email'}
                      />
                      <p className="text-[9.5px] text-slate-400 italic font-medium leading-normal mt-0.5">
                        Will deliver fully functional email via EmailJS integration if configured.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider text-left">Registered Phone Number</label>
                      <input
                        type="text"
                        value={resetPhone}
                        onChange={(e) => setResetPhone(e.target.value)}
                        placeholder="e.g. +1234567890"
                        className="px-2.5 py-1.5 w-full border border-slate-200 rounded text-xs font-semibold text-slate-800 bg-white"
                        required={resetMethod === 'phone'}
                      />
                      <p className="text-[9.5px] text-slate-400 italic font-medium leading-normal mt-0.5">
                        Flashes code instantly on-screen to simulate Twilio SMS delivery in frontend.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-extrabold text-[10.5px] uppercase tracking-wider cursor-pointer border-0"
                  >
                    Generate Reset OTP &rarr;
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthModalMode('login')}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase block mx-auto underline cursor-pointer"
                  >
                    Go Back to Login Signpost
                  </button>
                </form>
              )}

              {/* RESET PASSWORD OVERWRITE VIEW */}
              {authModalMode === 'reset_password' && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!resetCodeInput || !resetNewPassword) {
                      showToast('Please fulfill OTP and security password specifications.', 'error');
                      return;
                    }

                    const now = Date.now();

                    // Check Lockout
                    const currentLock = localStorage.getItem(`voya_lockout_until_${resetIdentifier}`);
                    if (currentLock && now < parseInt(currentLock)) {
                      const mins = Math.ceil((parseInt(currentLock) - now) / 60000);
                      showToast(`This account is locked out for ${mins} minutes due to excessive failed attempts.`, 'error');
                      return;
                    }

                    try {
                      const otpInfo = await dbGetRecoveryOtp(resetIdentifier);

                      if (!otpInfo) {
                        showToast('Security Error: No active password reset request session was registered.', 'error');
                        return;
                      }

                      if (now > otpInfo.expiry) {
                        showToast('Security Error: The OTP registration has expired (10-minute limit). Please retrieve a new one.', 'error');
                        return;
                      }

                      if (resetCodeInput.trim() !== otpInfo.code) {
                        const updatedAttempts = (otpInfo.wrongAttempts || 0) + 1;
                        if (updatedAttempts >= 5) {
                          // Set 30 minutes lockout
                          localStorage.setItem(`voya_lockout_until_${resetIdentifier}`, (now + 1800000).toString());
                          await dbDeleteRecoveryOtp(resetIdentifier);
                          showToast('Maximum 5 incorrect attempts reached! This account has been locked for 30 minutes.', 'error');
                          setAuthModalMode('login');
                        } else {
                          otpInfo.wrongAttempts = updatedAttempts;
                          await dbSaveRecoveryOtp(resetIdentifier, otpInfo);
                          showToast(`Incorrect OTP code. Remaining wrong attempts allowed: ${5 - updatedAttempts}`, 'error');
                        }
                        return;
                      }

                      // Minimum 6 password characters restriction
                      if (resetNewPassword.length < 6) {
                        showToast('New password specifications must satisfy at least 6 characters.', 'info');
                        return;
                      }

                      // Perform override inside database users
                      const users = await dbGetUsers();
                      const matchedUser = users.find(u => 
                        (u.email || '').toLowerCase() === resetIdentifier || 
                        (u.phoneNumber && u.phoneNumber.trim().replace(/\s+/g, '') === resetIdentifier)
                      );

                      if (!matchedUser) {
                        showToast('User search has collapsed. Register again or review credentials.', 'error');
                        return;
                      }

                      matchedUser.password = resetNewPassword;
                      await dbSaveUser(matchedUser);

                      // Clean security verification packets
                      await dbDeleteRecoveryOtp(resetIdentifier);
                      setResetCodeInput('');
                      setResetNewPassword('');
                      setGeneratedResetCode(null);

                      showToast('Security lock updated! Your password override is locked successfully.', 'success');
                      
                      // Route back to Login to finalize
                      setAuthModalMode('login');
                    } catch (err) {
                      console.error("Failed to process security reset password Flow", err);
                      showToast("Password update request failed. Check rules structure.", "error");
                    }
                  }}
                  className="space-y-3.5 text-xs"
                >
                  <div className="text-center space-y-1">
                    <span className="text-xl">🔑</span>
                    <h4 className="font-extrabold text-slate-800 uppercase tracking-wide text-xs">Authentication Override Lock</h4>
                  </div>

                  {/* TWILIO DEMO AND INSTRUCTIONS EMBED */}
                  <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded text-[9.5px] text-indigo-900 space-y-1.5 leading-normal">
                    <span className="font-extrabold uppercase text-[8px] block tracking-wider text-indigo-750">⚠️ Twilio Security &amp; SMS Integration:</span>
                    <p className="text-[9px] leading-relaxed">
                      In production, phone reset invokes Twilio APIs securely via server-side logic in <code className="bg-white/60 px-1 py-0.2 rounded border border-indigo-200">server.ts</code> to shield credentials.
                    </p>
                    <p className="font-black text-slate-900 bg-white/70 px-1.5 py-1 border border-indigo-150 rounded leading-none text-center">
                      Your Demo Reset Code is: <strong className="text-amber-705 text-red-650 font-extrabold text-[11px] animate-pulse">{generatedResetCode || 'Checking packet...'}</strong>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">6-Digit OTP Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={resetCodeInput}
                      onChange={(e) => setResetCodeInput(e.target.value)}
                      placeholder="e.g. 123456"
                      className="px-2.5 py-1.5 w-full border border-slate-200 rounded text-xs font-bold text-center tracking-widest text-slate-800 bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">New Password Overwrite</label>
                    <input
                      type="password"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Specify secure new credentials..."
                      className="px-2.5 py-1.5 w-full border border-slate-200 rounded text-xs text-slate-800 bg-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-extrabold text-[10.5px] uppercase tracking-wider mt-2 cursor-pointer border-0"
                  >
                    Commit Overwrite Lock &rarr;
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthModalMode('login')}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase block mx-auto underline cursor-pointer"
                  >
                    Cancel, back to Portal
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN PAYMENT RECEIPT LIGHTBOX MODAL */}
      {previewReceiptImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = previewReceiptImage || '';
                link.download = `receipt-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Download Receipt"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPreviewReceiptImage(null)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="max-w-3xl max-h-[85vh] overflow-auto flex items-center justify-center border border-white/10 rounded-lg p-1 bg-white/5 shadow-2xl animate-scale-in">
            <img 
              src={previewReceiptImage} 
              alt="Uploaded Payment Receipt" 
              className="max-w-full max-h-[80vh] object-contain rounded-md"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-white/40 text-[10.5px] mt-4 font-semibold uppercase tracking-wider">
            Displaying high resolution secure attachment
          </p>
        </div>
      )}

    </div>
  );
}
