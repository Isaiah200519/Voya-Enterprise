import React, { useState, useEffect } from 'react';
import { onSnapshot, collection } from 'firebase/firestore';
import { User, Store, Product, Order, PlatformSettings, AuditLog, SellerNotification, WithdrawalRequest, BuyerPaymentRequest, SellerPaymentRequest, Spin, PointsPurchase, MonthlyStats, WinnerAnnouncement, LuckyWinner, Transaction } from '../types';
import { getLocalStorageData, setLocalStorageData } from '../utils/seedData';
import { 
  dbGetStores, 
  dbSaveStore, 
  dbGetProducts, 
  dbSaveProduct, 
  dbDeleteProduct,
  dbGetOrders, 
  dbSaveOrder, 
  dbGetUsers, 
  dbSaveUser,
  dbDeleteUser,
  dbGetPlatformSettings,
  dbSavePlatformSettings,
  uploadImageToStorage,
  deleteImageFromStorage,
  dbSaveNotification,
  dbSaveAuditLog,
  db,
  dbGetWithdrawalRequests,
  dbSaveWithdrawalRequest,
  dbGetBuyerPaymentRequests,
  dbSaveBuyerPaymentRequest,
  dbGetSellerPaymentRequests,
  dbSaveSellerPaymentRequest,
  dbGetPointsPurchases,
  dbSavePointsPurchase,
  dbGetSpins,
  dbGetMonthlyStats,
  dbSaveMonthlyStats,
  dbGetWinnerAnnouncements,
  dbSaveWinnerAnnouncement,
  dbSaveTransaction
} from '../utils/firebase';
import VoyaLogo from './VoyaLogo';
import { 
  Users, 
  Store as StoreIcon, 
  ShoppingBag, 
  DollarSign, 
  CheckCircle, 
  XOctagon, 
  UserMinus, 
  Trash2, 
  Edit, 
  Settings, 
  Upload, 
  Eye, 
  Clock, 
  Sliders, 
  BookOpen, 
  Filter, 
  Check, 
  AlertCircle, 
  ShieldAlert,
  ListFilter,
  Home,
  User as UserIcon,
  X,
  Download,
  Ticket,
  Coins,
  Lock,
  Unlock,
  Award,
  Calendar,
  Image
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
  onLogout: () => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
  setCurrentUser?: (user: User) => void;
}

type TabType = 'dashboard' | 'sellers' | 'customers' | 'products' | 'orders' | 'settings' | 'settlements' | 'lucky_draw';

export default function AdminPanel({ currentUser, onLogout, showToast, setCurrentUser }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const handleDownloadImage = async (url: string, defaultName: string) => {
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Image downloaded successfully.', 'success');
        return;
      }

      showToast('Opening secure download window...', 'info');
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
      showToast('Image downloaded successfully.', 'success');
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

  // Admin user profile states
  const [adminNameEdit, setAdminNameEdit] = useState(currentUser.name || '');
  const [adminPhoneEdit, setAdminPhoneEdit] = useState(currentUser.phoneNumber || '');
  const [adminCountryOfResidenceEdit, setAdminCountryOfResidenceEdit] = useState(currentUser.countryOfResidence || '');
  const [adminPasswordEdit, setAdminPasswordEdit] = useState('');

  // Keep synced if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setAdminNameEdit(currentUser.name || '');
      setAdminPhoneEdit(currentUser.phoneNumber || '');
      setAdminCountryOfResidenceEdit(currentUser.countryOfResidence || '');
    }
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Data States loaded from localStorage
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [previewReceiptImage, setPreviewReceiptImage] = useState<string | null>(null);
  const [processingWithdrawal, setProcessingWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [withdrawalReceipt, setWithdrawalReceipt] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [buyerPaymentRequests, setBuyerPaymentRequests] = useState<BuyerPaymentRequest[]>([]);
  const [sellerPaymentRequests, setSellerPaymentRequests] = useState<SellerPaymentRequest[]>([]);
  const [pointsPurchases, setPointsPurchases] = useState<PointsPurchase[]>([]);
  const [spins, setSpins] = useState<Spin[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [winnerAnnouncements, setWinnerAnnouncements] = useState<WinnerAnnouncement[]>([]);

  const [drawMonthYear, setDrawMonthYear] = useState(new Date().toISOString().substring(0, 7));
  const [pointsPurchaseFilter, setPointsPurchaseFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [purchaseRejectionReason, setPurchaseRejectionReason] = useState('');
  const [pendingRejectionId, setPendingRejectionId] = useState<string | null>(null);

  // Manual Balance Adjustments State
  const [isAdjustingBalanceUser, setIsAdjustingBalanceUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState<boolean>(false);

  const [settings, setSettings] = useState<PlatformSettings>({
    siteName: 'Voya',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    adminBankName: '',
    adminBankAccountNumber: '',
    adminBankAccountName: '',
    adminMobileMoneyNumber: '',
    adminMobileMoneyName: '',
    adminMobileMoneyProvider: '',
    commissionRate: 15,
    liberiaOrangeNumber: '',
    liberiaOrangeName: '',
    liberiaLonestarNumber: '',
    liberiaLonestarName: '',
    luckyDrawSpinCost: 500,
    luckyDrawTargetProfit: 50,
  });

  // Editing / Temporary states
  const [editingCustomer, setEditingCustomer] = useState<User | null>(null);
  const [customerEditName, setCustomerEditName] = useState('');
  const [customerEditEmail, setCustomerEditEmail] = useState('');
  const [customerEditAddress, setCustomerEditAddress] = useState('');

  // Admin Product Review & Edit Workflow States
  const [adminProductTab, setAdminProductTab] = useState<'active_listings' | 'pending_approval'>('active_listings');
  const [reviewingProduct, setReviewingProduct] = useState<Product | null>(null);
  const [adminSetName, setAdminSetName] = useState('');
  const [adminSetPrice, setAdminSetPrice] = useState('');
  const [adminSetWeight, setAdminSetWeight] = useState('');
  const [adminSetSizes, setAdminSetSizes] = useState('');
  const [adminSetStock, setAdminSetStock] = useState('');
  const [adminSetCategory, setAdminSetCategory] = useState('');
  const [adminSetDesc, setAdminSetDesc] = useState('');
  const [adminRejectionReason, setAdminRejectionReason] = useState('');
  const [adminSetImages, setAdminSetImages] = useState<string[]>([]);
  const [deletedImages, setDeletedImages] = useState<string[]>([]);

  // Branding platform logo/banner temp storage
  const [tempLogo, setTempLogo] = useState<string | null>(null);
  const [tempBanner, setTempBanner] = useState<string | null>(null);

  // Filters
  const [sellerFilter, setSellerFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');

  const loadAllData = async () => {
    try {
      const loadedUsers = await dbGetUsers();
      const loadedStores = await dbGetStores();
      const loadedProducts = await dbGetProducts();
      const loadedOrders = await dbGetOrders();
      const loadedWithdrawals = await dbGetWithdrawalRequests();
      const loadedBuyerPayReqs = await dbGetBuyerPaymentRequests();
      const loadedSellerPayReqs = await dbGetSellerPaymentRequests();
      const loadedPointsPurchases = await dbGetPointsPurchases();
      const loadedSpins = await dbGetSpins();
      const loadedMonthlyStats = await dbGetMonthlyStats();
      const loadedWinnerAnnouncements = await dbGetWinnerAnnouncements();
      const loadedSettings = await dbGetPlatformSettings();
      const finalSettings: PlatformSettings = {
        siteName: 'Voya',
        contactEmail: 'support@voya-direct.net',
        contactPhone: '+86 20 8888 8888',
        contactAddress: 'Voya Enterprise Sourcing Hub, Shenzhen, China',
        adminBankName: 'Voya Global Bank of Commerce',
        adminBankAccountNumber: '88800099955511',
        adminBankAccountName: 'Voya Sourcing Direct Inc. (Savie Isaiah)',
        adminMobileMoneyNumber: '+231 77 123 4567',
        adminMobileMoneyName: 'Savie Isaiah Admin Fund',
        adminMobileMoneyProvider: 'Orange / Lonestar',
        commissionRate: 15,
        liberiaOrangeNumber: '+231 77 111 2222',
        liberiaOrangeName: 'Voya Liberia Orange Settlement',
        liberiaLonestarNumber: '+231 88 111 2222',
        liberiaLonestarName: 'Voya Liberia Lonestar Settlement',
        luckyDrawSpinCost: 500,
        luckyDrawTargetProfit: 50,
        ...loadedSettings
      };

      setUsers(loadedUsers);
      setStores(loadedStores);
      setProducts(loadedProducts);
      setOrders(loadedOrders);
      setWithdrawalRequests(loadedWithdrawals);
      setBuyerPaymentRequests(loadedBuyerPayReqs);
      setSellerPaymentRequests(loadedSellerPayReqs);
      setPointsPurchases(loadedPointsPurchases);
      setSpins(loadedSpins);
      setMonthlyStats(loadedMonthlyStats);
      setWinnerAnnouncements(loadedWinnerAnnouncements);
      setSettings(finalSettings);
    } catch (e) {
      console.warn("Failed to load Voya elements from Firestore, falling back to LocalStorage indices...", e);
      const loadedUsers = getLocalStorageData<User[]>('voya_users', []);
      const loadedStores = getLocalStorageData<Store[]>('voya_stores', []);
      const loadedProducts = getLocalStorageData<Product[]>('voya_products', []);
      const loadedOrders = getLocalStorageData<Order[]>('voya_orders', []);
      const loadedWithdrawals = getLocalStorageData<WithdrawalRequest[]>('voya_withdrawal_requests', []);
      const loadedBuyerPayReqs = getLocalStorageData<BuyerPaymentRequest[]>('voya_buyer_payment_requests', []);
      const loadedSellerPayReqs = getLocalStorageData<SellerPaymentRequest[]>('voya_seller_payment_requests', []);
      const loadedPointsPurchases = getLocalStorageData<PointsPurchase[]>('voya_points_purchases', []);
      const loadedSpins = getLocalStorageData<Spin[]>('voya_spins', []);
      const loadedMonthlyStats = getLocalStorageData<MonthlyStats[]>('voya_monthly_stats', []);
      const loadedWinnerAnnouncements = getLocalStorageData<WinnerAnnouncement[]>('voya_winner_announcements', []);
      const loadedSettings = getLocalStorageData<PlatformSettings>('voya_platform_settings', {
        siteName: 'Voya',
        contactEmail: 'support@voya-direct.net',
        contactPhone: '+86 20 8888 8888',
        contactAddress: 'Voya Enterprise Sourcing Hub, Shenzhen, China',
        adminBankName: 'Voya Global Bank of Commerce',
        adminBankAccountNumber: '88800099955511',
        adminBankAccountName: 'Voya Sourcing Direct Inc. (Savie Isaiah)',
        adminMobileMoneyNumber: '+231 77 123 4567',
        adminMobileMoneyName: 'Savie Isaiah Admin Fund',
        adminMobileMoneyProvider: 'Orange / Lonestar',
        commissionRate: 15,
        liberiaOrangeNumber: '+231 77 111 2222',
        liberiaOrangeName: 'Voya Liberia Orange Settlement',
        liberiaLonestarNumber: '+231 88 111 2222',
        liberiaLonestarName: 'Voya Liberia Lonestar Settlement',
      } as PlatformSettings);

      setUsers(loadedUsers);
      setStores(loadedStores);
      setProducts(loadedProducts);
      setOrders(loadedOrders);
      setWithdrawalRequests(loadedWithdrawals);
      setBuyerPaymentRequests(loadedBuyerPayReqs);
      setSellerPaymentRequests(loadedSellerPayReqs);
      setPointsPurchases(loadedPointsPurchases);
      setSpins(loadedSpins);
      setMonthlyStats(loadedMonthlyStats);
      setWinnerAnnouncements(loadedWinnerAnnouncements);
      setSettings(loadedSettings);
    }
  };

  useEffect(() => {
    loadAllData();

    // 1. Real-time products sync
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((docSnap) => {
        prods.push(docSnap.data() as Product);
      });
      if (prods.length > 0) {
        setProducts(prods);
        setLocalStorageData('voya_products', prods);
      }
    }, (error) => {
      console.warn("Real-time products snapshot failed in AdminPanel:", error);
    });

    // 2. Real-time stores sync
    const unsubStores = onSnapshot(collection(db, 'stores'), (snapshot) => {
      const shops: Store[] = [];
      snapshot.forEach((docSnap) => {
        shops.push(docSnap.data() as Store);
      });
      if (shops.length > 0) {
        setStores(shops);
        setLocalStorageData('voya_stores', shops);
      }
    }, (error) => {
      console.warn("Real-time stores snapshot failed in AdminPanel:", error);
    });

    // 3. Real-time users sync
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usrs: User[] = [];
      snapshot.forEach((docSnap) => {
        usrs.push(docSnap.data() as User);
      });
      if (usrs.length > 0) {
        setUsers(usrs);
        setLocalStorageData('voya_users', usrs);
      }
    }, (error) => {
      console.warn("Real-time users snapshot failed in AdminPanel:", error);
    });

    // 8. Real-time points purchases sync
    const unsubPoints = onSnapshot(collection(db, 'points_purchases'), (snapshot) => {
      const list: PointsPurchase[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as PointsPurchase);
      });
      const sorted = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPointsPurchases(sorted);
      setLocalStorageData('voya_points_purchases', sorted);
    }, (error) => {
      console.warn("Points purchases snapshot failed in AdminPanel:", error);
    });

    // 9. Real-time spins sync
    const unsubSpins = onSnapshot(collection(db, 'spins'), (snapshot) => {
      const list: Spin[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Spin);
      });
      setSpins(list);
      setLocalStorageData('voya_spins', list);
    }, (error) => {
      console.warn("Spins snapshot failed in AdminPanel:", error);
    });

    // 10. Real-time monthly stats sync
    const unsubMonthly = onSnapshot(collection(db, 'monthly_stats'), (snapshot) => {
      const list: MonthlyStats[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as MonthlyStats);
      });
      setMonthlyStats(list);
      setLocalStorageData('voya_monthly_stats', list);
    }, (error) => {
      console.warn("Monthly stats snapshot failed in AdminPanel:", error);
    });

    // 11. Real-time winner announcements sync
    const unsubAnn = onSnapshot(collection(db, 'winner_announcements'), (snapshot) => {
      const list: WinnerAnnouncement[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as WinnerAnnouncement);
      });
      const sorted = list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      setWinnerAnnouncements(sorted);
      setLocalStorageData('voya_winner_announcements', sorted);
    }, (error) => {
      console.warn("Winner announcements snapshot failed in AdminPanel:", error);
    });

    return () => {
      unsubProducts();
      unsubStores();
      unsubUsers();
      unsubPoints();
      unsubSpins();
      unsubMonthly();
      unsubAnn();
    };
  }, []);

  // Sync to local storage
  const syncUsers = async (newUsers: User[]) => {
    await loadAllData();
  };

  const syncStores = async (newStores: Store[]) => {
    await loadAllData();
  };

  const syncProducts = async (newProducts: Product[]) => {
    await loadAllData();
  };

  const syncOrders = async (newOrders: Order[]) => {
    await loadAllData();
  };



  const handleApprovePointsPurchase = async (purchase: PointsPurchase) => {
    try {
      const targetUser = users.find(u => u.userId === purchase.userId);
      if (!targetUser) {
        showToast("Purchasing user account not found.", "error");
        return;
      }

      // 1. Approve deposit request
      const updatedPurchase: PointsPurchase = {
        ...purchase,
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        adminNotes: 'Payment check verified and receipt confirmed.'
      };
      await dbSavePointsPurchase(updatedPurchase);

      // 2. Increase user savings/account balance structure
      const currentBalance = targetUser.accountBalance || 0;
      const nextBalance = currentBalance + purchase.amountLrd;
      const updatedUser: User = {
        ...targetUser,
        accountBalance: nextBalance,
        withdrawableBalance: nextBalance
      };
      await dbSaveUser(updatedUser);

      // 3. Log transaction
      const txnId = 'tx_dep_app_' + Date.now();
      const newTxn: Transaction = {
        id: txnId,
        userId: purchase.userId,
        username: purchase.username,
        amount: purchase.amountLrd,
        type: 'deposit',
        referenceId: purchase.id,
        remarks: `Deposit of LRD ${purchase.amountLrd.toLocaleString()} verified and credited successfully via ${purchase.paymentProvider || 'Mobile Money'}.`,
        timestamp: new Date().toISOString()
      };
      await dbSaveTransaction(newTxn);

      // 4. Send notification
      const notifId = 'notif_pts_' + Date.now();
      await dbSaveNotification({
        id: notifId,
        sellerId: purchase.userId,
        productName: 'Deposit Verified',
        type: 'general',
        message: `Your payment receipt for Orange/Lonestar deposit is confirmed! We have successfully loaded LRD ${purchase.amountLrd.toLocaleString()} into your wallet balance.`,
        createdAt: new Date().toISOString(),
        read: false
      });

      await loadAllData();
      showToast(`Confirmed and loaded LRD ${purchase.amountLrd.toLocaleString()} to ${targetUser.name}'s balance!`, "success");
    } catch (err) {
      console.error("Deposit approve failed", err);
      showToast("Failed to process deposit approval.", "error");
    }
  };

  const handleRejectPointsPurchase = async (purchaseId: string) => {
    if (!purchaseRejectionReason.trim()) {
      showToast("Please provide a rejection remarks description.", "error");
      return;
    }

    const purchase = pointsPurchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    try {
      const updatedPurchase: PointsPurchase = {
        ...purchase,
        status: 'rejected',
        reviewedAt: new Date().toISOString(),
        adminNotes: purchaseRejectionReason
      };
      await dbSavePointsPurchase(updatedPurchase);

      // Notify customer of rejection
      const notifId = 'notif_pts_rej_' + Date.now();
      await dbSaveNotification({
        id: notifId,
        sellerId: purchase.userId,
        productName: 'Deposit Declined',
        type: 'general',
        message: `Your deposit of LRD ${purchase.amountLrd.toLocaleString()} was REJECTED by administrative check. Reason: ${purchaseRejectionReason}. Please contact support for assistance.`,
        createdAt: new Date().toISOString(),
        read: false
      });

      setPendingRejectionId(null);
      setPurchaseRejectionReason('');
      await loadAllData();
      showToast("Deposit verification request rejected.", "info");
    } catch (err) {
      console.error("Points rejection failed", err);
      showToast("Failed to reject points purchase request.", "error");
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdjustingBalanceUser) return;
    const amount = parseFloat(adjustAmount) || 0;
    if (amount <= 0) {
      showToast('Please enter a positive amount.', 'error');
      return;
    }
    if (!adjustReason.trim()) {
      showToast('Please provide a note/reason for this manual adjustment.', 'error');
      return;
    }
    
    setIsSubmittingAdjustment(true);
    try {
      const currentBal = isAdjustingBalanceUser.accountBalance || 0;
      const changeAmount = adjustType === 'credit' ? amount : -amount;
      const nextBal = Math.max(0, currentBal + changeAmount);
      
      const updatedUser: User = {
        ...isAdjustingBalanceUser,
        accountBalance: nextBal,
        withdrawableBalance: nextBal
      };
      await dbSaveUser(updatedUser);
      
      // Save Transaction Log
      const txnId = 'tx_adj_' + Date.now();
      const newTxn: Transaction = {
        id: txnId,
        userId: isAdjustingBalanceUser.userId,
        username: isAdjustingBalanceUser.name,
        amount: changeAmount,
        type: 'admin_adjust',
        remarks: `Manual Administrative adjustment: ${adjustReason.trim()}`,
        timestamp: new Date().toISOString()
      };
      await dbSaveTransaction(newTxn);
      
      // Send Notification to user
      const notifId = 'notif_adj_' + Date.now();
      await dbSaveNotification({
        id: notifId,
        sellerId: isAdjustingBalanceUser.userId,
        productName: 'Wallet Balance Adjusted',
        type: 'general',
        message: `Your balance was adjusted by an Administrator. Type: ${adjustType === 'credit' ? 'Credit (+)' : 'Debit (-)'} of LRD ${amount.toLocaleString()}. Note: ${adjustReason.trim()}`,
        createdAt: new Date().toISOString(),
        read: false
      });
      
      showToast(`Wallet Balance successfully adjusted for ${isAdjustingBalanceUser.name}!`, 'success');
      setIsAdjustingBalanceUser(null);
      setAdjustAmount('');
      setAdjustReason('');
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Adjustment submission failed.', 'error');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // Calculations for dashboard
  const totalUsersCount = users.length;
  const sellersCount = users.filter(u => u.role === 'seller').length;
  const customersCount = users.filter(u => u.role === 'customer').length;
  const productsCount = products.length;
  
  const totalSales = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total, 0);

  // SELLER MANAGE FUNCTIONS
  const handleApproveSeller = async (userId: string) => {
    const targetUser = users.find(u => u.userId === userId);
    if (!targetUser) return;

    try {
      // 1. Approve user
      const updatedUser = { ...targetUser, approved: true };
      await dbSaveUser(updatedUser);

      // 2. Approve store
      if (targetUser.storeId) {
        const targetStore = stores.find(s => s.storeId === targetUser.storeId);
        if (targetStore) {
          const updatedStore = { ...targetStore, approved: true };
          await dbSaveStore(updatedStore);
        }
      }
      
      showToast(`Store registered by ${targetUser.name} has been approved!`, 'success');
      await loadAllData();
    } catch (e) {
      console.error(e);
      showToast('Approving seller failed.', 'error');
    }
  };

  const handleToggleBlockSeller = async (userId: string) => {
    const targetUser = users.find(u => u.userId === userId);
    if (!targetUser) return;

    try {
      const newBlockedState = !targetUser.blocked;
      const updatedUser = { ...targetUser, blocked: newBlockedState };
      await dbSaveUser(updatedUser);

      // Also toggle store approval/blocked state representation
      if (targetUser.storeId) {
        const targetStore = stores.find(s => s.storeId === targetUser.storeId);
        if (targetStore) {
          const updatedStore = { ...targetStore, approved: !newBlockedState && (targetUser.approved ?? false) };
          await dbSaveStore(updatedStore);
        }
      }

      showToast(
        newBlockedState 
          ? `Seller ${targetUser.name} has been BLOCKED. Their catalog is now hidden.` 
          : `Seller ${targetUser.name} has been UNBLOCKED.`,
        newBlockedState ? 'error' : 'success'
      );
      await loadAllData();
    } catch (e) {
      console.error(e);
      showToast('Toggling seller block state failed.', 'error');
    }
  };

  // CUSTOMER MANAGE FUNCTIONS
  const handleEditCustomerClick = (customer: User) => {
    setEditingCustomer(customer);
    setCustomerEditName(customer.name);
    setCustomerEditEmail(customer.email);
    setCustomerEditAddress(customer.shippingAddress || '');
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    // Check email clash
    const isClash = users.some(u => u.userId !== editingCustomer.userId && (u.email || '').toLowerCase() === customerEditEmail.toLowerCase());
    if (isClash) {
      showToast('This email is already in use by another user', 'error');
      return;
    }

    try {
      const updatedUser: User = { 
        ...editingCustomer, 
        name: customerEditName, 
        email: customerEditEmail, 
        shippingAddress: customerEditAddress 
      };
      await dbSaveUser(updatedUser);
      setEditingCustomer(null);
      showToast('Customer information updated successfully!', 'success');
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update customer details.', 'error');
    }
  };

  const handleDeleteCustomer = async (userId: string, name: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete customer ${name}? This action cannot be undone.`)) {
      try {
        await dbDeleteUser(userId);
        showToast(`Customer account for ${name} has been deleted.`, 'success');
        await loadAllData();
      } catch (err) {
        console.error(err);
        showToast('Failed to delete customer account.', 'error');
      }
    }
  };

  const handleToggleBlockCustomer = async (userId: string) => {
    const targetUser = users.find(u => u.userId === userId);
    if (!targetUser) return;

    try {
      const newBlockedState = !targetUser.blocked;
      const updatedUser: User = { ...targetUser, blocked: newBlockedState };
      await dbSaveUser(updatedUser);

      showToast(
        newBlockedState 
          ? `Customer ${targetUser.name} has been BLOCKED.` 
          : `Customer ${targetUser.name} has been UNBLOCKED.`,
        newBlockedState ? 'error' : 'success'
      );
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Blocking/Unblocking customer failed.', 'error');
    }
  };

  // PRODUCT MANAGE FUNCTIONS
  const handleDeleteProduct = async (productId: string, name: string) => {
    if (window.confirm(`Delete product "${name}" from the entire platform?`)) {
      try {
        await dbDeleteProduct(productId);
        showToast(`Product "${name}" removed.`, 'success');
        await loadAllData();
      } catch (err) {
        console.error(err);
        showToast('Failed to delete product from platform.', 'error');
      }
    }
  };

  const handleOpenReviewModal = (p: Product) => {
    setReviewingProduct(p);
    setAdminSetName(p.name);
    setAdminSetPrice((p.finalPrice !== undefined ? p.finalPrice : p.price).toString());
    setAdminSetWeight(p.weight !== null && p.weight !== undefined ? p.weight.toString() : '');
    setAdminSetSizes(p.sizes ? p.sizes.join(', ') : '');
    setAdminSetStock(p.stock.toString());
    setAdminSetCategory(p.category);
    setAdminSetDesc(p.description);
    setAdminRejectionReason(p.rejectionReason || '');
    setAdminSetImages(p.images || []);
    setDeletedImages([]);
  };

  /**
   * Helper function to explicitly delete old overridden/replaced images from Firebase Storage,
   * keeping the storage bucket clean and minimizing unnecessary storage billing costs.
   */
  const deleteReplacedImagesFromStorage = async (imageUrls: string[]): Promise<void> => {
    for (const url of imageUrls) {
      if (url && url.startsWith('http') && url.includes('firebasestorage')) {
        try {
          await deleteImageFromStorage(url);
          console.log(`Explicit physical removal of replaced storage file: ${url}`);
        } catch (error) {
          console.warn(`Fallback: File deletion was skipped or could not be found: ${url}`, error);
        }
      }
    }
  };

  const handleApproveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingProduct) return;

    const finalPriceNum = parseFloat(adminSetPrice);
    const weightNum = parseFloat(adminSetWeight);
    const stockNum = parseInt(adminSetStock);

    if (isNaN(finalPriceNum) || finalPriceNum <= 0) {
      showToast('Please provide a valid platform consumer final price.', 'error');
      return;
    }

    if (isNaN(weightNum) || weightNum <= 0) {
      showToast('Please provide a valid product retail weight (in kilograms) for shipping calculations.', 'error');
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      showToast('Stock must be a valid non-negative integer.', 'error');
      return;
    }

    const sizesArray = adminSetSizes
      ? adminSetSizes.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    try {
      showToast('Saving... Processing images in Firebase Storage...', 'info');

      // 1. Process all active images in adminSetImages
      const finalImageUrls: string[] = [];
      for (let i = 0; i < adminSetImages.length; i++) {
        const img = adminSetImages[i];
        if (img.startsWith('data:image')) {
          // Upload new base64 image
          const uploadedUrl = await uploadImageToStorage(`products/${reviewingProduct.productId}/img_${i}_${Date.now()}`, img);
          finalImageUrls.push(uploadedUrl);
        } else {
          // Keep existing HTTPS url
          finalImageUrls.push(img);
        }
      }

      // 2. Perform explicit deletion of old storage images via helper function
      if (deletedImages.length > 0) {
        await deleteReplacedImagesFromStorage(deletedImages);
      }

      const updated: Product = {
        ...reviewingProduct,
        name: adminSetName,
        category: adminSetCategory,
        description: adminSetDesc,
        stock: stockNum,
        price: finalPriceNum,
        finalPrice: finalPriceNum,
        weight: weightNum,
        sizes: sizesArray,
        images: finalImageUrls,
        status: 'approved' as const,
        approvalDate: reviewingProduct.approvalDate || new Date().toISOString(),
        rejectionReason: undefined,
      };

      // Atomic save on product document
      await dbSaveProduct(updated);

      // 3. Store Audit Log
      const audit: AuditLog = {
        id: `audit-${Date.now()}`,
        productId: reviewingProduct.productId,
        productName: adminSetName,
        action: 'approve',
        adminId: currentUser?.userId || 'admin',
        adminName: currentUser?.name || 'Administrator',
        timestamp: new Date().toISOString(),
        details: `Approved finalPrice: $${finalPriceNum.toFixed(2)}, weight: ${weightNum.toFixed(2)}kg, stock: ${stockNum} units`
      };
      await dbSaveAuditLog(audit);

      // 4. Create Seller Notification
      const storeObj = stores.find(s => s.storeId === reviewingProduct.storeId);
      const sellerId = reviewingProduct.sellerId || storeObj?.sellerId;
      if (sellerId) {
        const notif: SellerNotification = {
          id: `notif-${Date.now()}`,
          sellerId,
          productId: reviewingProduct.productId,
          productName: adminSetName,
          type: 'approval',
          message: `Your commodity submission "${adminSetName}" has been successfully approved! Final Consumer Price is locked at $${finalPriceNum.toFixed(2)}.`,
          createdAt: new Date().toISOString(),
          read: false
        };
        await dbSaveNotification(notif);
      }

      setReviewingProduct(null);
      showToast(`Product "${adminSetName}" approved on platform successfully!`, 'success');
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to approve the product due to database syncing.', 'error');
    }
  };

  const handleRejectProduct = async () => {
    if (!reviewingProduct) return;
    if (!adminRejectionReason.trim()) {
      showToast('Please provide a short rejection reason for the vendor.', 'error');
      return;
    }

    try {
      const updated: Product = {
        ...reviewingProduct,
        status: 'rejected' as const,
        rejectionReason: adminRejectionReason.trim(),
      };

      await dbSaveProduct(updated);

      // 1. Audit log
      const audit: AuditLog = {
        id: `audit-${Date.now()}`,
        productId: reviewingProduct.productId,
        productName: reviewingProduct.name,
        action: 'reject',
        adminId: currentUser?.userId || 'admin',
        adminName: currentUser?.name || 'Administrator',
        timestamp: new Date().toISOString(),
        details: `Rejected submission. Reason: ${adminRejectionReason.trim()}`
      };
      await dbSaveAuditLog(audit);

      // 2. Notification
      const storeObj = stores.find(s => s.storeId === reviewingProduct.storeId);
      const sellerId = reviewingProduct.sellerId || storeObj?.sellerId;
      if (sellerId) {
        const notif: SellerNotification = {
          id: `notif-${Date.now()}`,
          sellerId,
          productId: reviewingProduct.productId,
          productName: reviewingProduct.name,
          type: 'rejection',
          message: `Your commodity submission "${reviewingProduct.name}" has been declined. Feedback: ${adminRejectionReason.trim()}`,
          createdAt: new Date().toISOString(),
          read: false
        };
        await dbSaveNotification(notif);
      }

      setReviewingProduct(null);
      showToast(`Product submission rejected and feedback returned.`, 'error');
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to reject the product.', 'error');
    }
  };

  // ORDER STATUS UPDATE
  const handleUpdateOrderStatus = async (orderId: string, itemStoreId: string, newStatus: any) => {
    try {
      const matchOrder = orders.find(o => o.orderId === orderId);
      if (matchOrder) {
        const oldStatus = matchOrder.status;
        const updated: Order = { ...matchOrder, status: newStatus };
        await dbSaveOrder(updated);

        // Find match store owner to alert and dispatch notifications
        const matchingStore = stores.find(sh => sh.storeId === matchOrder.storeId);
        const vendorId = matchingStore ? matchingStore.sellerId : '';
        if (vendorId) {
          // 1. Create Order Status Change Notification
          const statusNotif: SellerNotification = {
            id: 'notif_' + Math.random().toString(36).substring(2, 11),
            sellerId: vendorId,
            productName: `Order Status #${orderId}`,
            type: 'order_status',
            message: `Order #${orderId} status changed from "${oldStatus}" to "${newStatus}" by administrator.`,
            createdAt: new Date().toISOString(),
            read: false,
          };
          await dbSaveNotification(statusNotif);

          // 2. Create Payment Confirmation / Rejection Alerts based on status change
          if (oldStatus === 'pending' && newStatus === 'processing') {
            // Processing implies payment confirmed
            const payConfirmNotif: SellerNotification = {
              id: 'notif_' + Math.random().toString(36).substring(2, 11),
              sellerId: vendorId,
              productName: `Payment Approved #${orderId}`,
              type: 'payment',
              message: `Administrator has CONFIRMED the mobile money payment receipt for Order #${orderId} (LRD ${matchOrder.total.toFixed(2)}). The order is officially confirmed.`,
              createdAt: new Date().toISOString(),
              read: false,
            };
            await dbSaveNotification(payConfirmNotif);
          } else if (newStatus === 'cancelled') {
            const payRejectNotif: SellerNotification = {
              id: 'notif_' + Math.random().toString(36).substring(2, 11),
              sellerId: vendorId,
              productName: `Payment Cancelled #${orderId}`,
              type: 'payment',
              message: `Administrator has REJECTED or CANCELLED Order #${orderId}. Local mobile transfer verification failed or was voided.`,
              createdAt: new Date().toISOString(),
              read: false,
            };
            await dbSaveNotification(payRejectNotif);
          }
        }

        showToast(`Order #${orderId} status set to ${newStatus}.`, 'success');
        await loadAllData();
      } else {
        showToast('Tracking order document was not found.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Order status update failed. Try again.', 'error');
    }
  };

  // UPDATE BRANDING SETTINGS
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempLogo(reader.result as string);
      showToast('New platform logo uploaded. Preserving preview, click Save below.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempBanner(reader.result as string);
      showToast('New platform banner uploaded. Preserving preview, click Save below.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalLogoUrl = settings.platformLogo || '';
      if (tempLogo && tempLogo.startsWith('data:image')) {
        showToast('Uploading platform logo to Firebase bucket...', 'info');
        finalLogoUrl = await uploadImageToStorage('branding/logo', tempLogo);
        setTempLogo(null);
      }

      let finalBannerUrl = settings.platformBanner || '';
      if (tempBanner && tempBanner.startsWith('data:image')) {
        showToast('Uploading platform banner to Firebase bucket...', 'info');
        finalBannerUrl = await uploadImageToStorage('branding/banner', tempBanner);
        setTempBanner(null);
      }

      const updatedSettings: PlatformSettings = {
        ...settings,
        platformLogo: finalLogoUrl,
        platformBanner: finalBannerUrl,
      };

      await dbSavePlatformSettings(updatedSettings);
      setSettings(updatedSettings);
      showToast("Voya platform settings and branding configured successfully!", 'success');
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings modification.', 'error');
    }
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (adminPasswordEdit && adminPasswordEdit.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    try {
      const updatedUser: User = {
        ...currentUser,
        name: adminNameEdit,
        phoneNumber: adminPhoneEdit,
        countryOfResidence: adminCountryOfResidenceEdit || undefined,
      };
      if (adminPasswordEdit) {
        updatedUser.password = adminPasswordEdit;
      }

      await dbSaveUser(updatedUser);

      localStorage.setItem('voya_active_session', JSON.stringify(updatedUser));
      if (setCurrentUser) {
        setCurrentUser(updatedUser);
      }

      setAdminPasswordEdit('');
      showToast('Administrator personal profile settings saved successfully.', 'success');
      await loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to save administrator profile settings.', 'error');
    }
  };

  const handleUpdateWithdrawalStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      const matched = withdrawalRequests.find(w => w.id === id);
      if (!matched) {
        showToast('Withdrawal record not found.', 'error');
        return;
      }
      
      const updated: WithdrawalRequest = {
        ...matched,
        status: newStatus,
        reviewedAt: new Date().toISOString()
      };
      
      await dbSaveWithdrawalRequest(updated);
      showToast(`Withdrawal of LRD ${matched.amount.toFixed(2)} has been ${newStatus}.`, 'success');

      // Send rejection notification to seller/shop owner
      if (newStatus === 'rejected') {
        const rejectNotif: SellerNotification = {
          id: 'notif_' + Math.random().toString(36).substring(2, 11),
          sellerId: matched.sellerId,
          productName: `Withdrawal Rejected`,
          type: 'withdrawal',
          message: `Your withdrawal of LRD ${matched.amount.toFixed(2)} (${matched.paymentMethod}) was REJECTED by administrative review. Please double check receiver wallet details.`,
          createdAt: new Date().toISOString(),
          read: false,
        };
        await dbSaveNotification(rejectNotif);
      }
      
      // Log audit
      const auditObj: AuditLog = {
        id: 'audit_' + Math.random().toString(36).substring(2, 11),
        productId: 'withdrawal_' + matched.id,
        productName: `Store Payout: ${matched.storeName}`,
        action: newStatus === 'approved' ? 'approve' : 'reject',
        adminId: currentUser.userId,
        adminName: currentUser.name,
        details: `Settle Claim: LRD ${matched.amount.toFixed(2)} [Target: ${matched.paymentMethod} -> ${matched.accountDetails}] resolved as ${newStatus}`,
        timestamp: new Date().toISOString()
      };
      await dbSaveAuditLog(auditObj);
      
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update withdrawal status: ${err.message}`, 'error');
    }
  };

  // COMPLETE WITHDRAWAL (ADMIN TRANSFERS FUNDS & UPLOADS RECEIPT)
  const handleCompleteWithdrawal = async (req: WithdrawalRequest, receiptUrl: string) => {
    try {
      const updated: WithdrawalRequest = {
        ...req,
        status: 'approved',
        transferReceipt: receiptUrl,
        reviewedAt: new Date().toISOString()
      };
      
      await dbSaveWithdrawalRequest(updated);
      showToast(`Withdrawal of LRD ${req.amount.toFixed(2)} has been successfully completed and receipt uploaded!`, 'success');
      
      // 1. Create Withdrawal Processed Notification
      const processNotif: SellerNotification = {
        id: 'notif_' + Math.random().toString(36).substring(2, 11),
        sellerId: req.sellerId,
        productName: `Withdrawal Processing`,
        type: 'withdrawal',
        message: `Your withdrawal of LRD ${req.amount.toFixed(2)} has been PROCESSED. Administrator has transferred the money and uploaded receipt proof.`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      await dbSaveNotification(processNotif);

      // 2. Create Balance Deduction Notification
      const deductionNotif: SellerNotification = {
        id: 'notif_' + Math.random().toString(36).substring(2, 11),
        sellerId: req.sellerId,
        productName: `Balance Deduction`,
        type: 'commission_deduction',
        message: `An amount of LRD ${req.amount.toFixed(2)} has been deducted from your available store balance following your completed withdrawal.`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      await dbSaveNotification(deductionNotif);

      // Log audit
      const auditObj: AuditLog = {
        id: 'audit_' + Math.random().toString(36).substring(2, 11),
        productId: 'withdrawal_' + req.id,
        productName: `Store Payout: ${req.storeName}`,
        action: 'approve',
        adminId: currentUser.userId,
        adminName: currentUser.name,
        details: `Settle Claim: LRD ${req.amount.toFixed(2)} [Target: ${req.paymentMethod} -> ${req.accountDetails}] resolved as approved with receipt proof ${receiptUrl}`,
        timestamp: new Date().toISOString()
      };
      await dbSaveAuditLog(auditObj);
      
      setProcessingWithdrawal(null);
      setWithdrawalReceipt(null);
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to process withdrawal: ${err.message}`, 'error');
    }
  };

  const handleUpdateBuyerPaymentRequestStatus = async (id: string, newStatus: 'integrated' | 'pending' | 'rejected') => {
    try {
      const matched = buyerPaymentRequests.find(b => b.id === id);
      if (!matched) {
        showToast('Buyer payment request not found.', 'error');
        return;
      }
      
      const updated: BuyerPaymentRequest = {
        ...matched,
        status: newStatus
      };
      
      await dbSaveBuyerPaymentRequest(updated);
      showToast(`Buyer payment request updated to ${newStatus}.`, 'success');
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update buyer request: ${err.message}`, 'error');
    }
  };

  const handleUpdateSellerPaymentRequestStatus = async (id: string, newStatus: 'integrated' | 'pending' | 'rejected') => {
    try {
      const matched = sellerPaymentRequests.find(s => s.id === id);
      if (!matched) {
        showToast('Seller payment request not found.', 'error');
        return;
      }
      
      const updated: SellerPaymentRequest = {
        ...matched,
        status: newStatus
      };
      
      await dbSaveSellerPaymentRequest(updated);
      showToast(`Seller payment request status updated to ${newStatus}.`, 'success');
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update seller request: ${err.message}`, 'error');
    }
  };

  // Filtering Logic
  const filteredSellers = users.filter(u => {
    if (u.role !== 'seller') return false;
    const store = stores.find(s => s.storeId === u.storeId);
    if (sellerFilter === 'pending') return !u.approved && !u.blocked;
    if (sellerFilter === 'approved') return u.approved && !u.blocked;
    if (sellerFilter === 'blocked') return u.blocked;
    return true; // all
  });

  const filteredCustomers = users.filter(u => u.role === 'customer');

  const filteredProducts = products.filter(p => {
    if (productFilter === 'all') return true;
    return p.category === productFilter;
  });

  const uniqueCategories = Array.from(new Set(products.map(p => p.category)));

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-xs ${isMobile ? 'pb-[60px]' : ''}`}>
      {/* MOBILE TOP NAVIGATION BRANDING */}
      {isMobile && (
        <header className="sticky top-0 bg-white border-b border-slate-200 p-2.5 z-40 shadow-xs flex items-center justify-between w-full shrink-0">
          <div className="flex items-center gap-2.5">
            <VoyaLogo light={true} className="scale-90" />
            <div className="border-l border-slate-200 pl-2 ml-1">
              <h1 className="font-bold text-xs text-slate-800 tracking-tight leading-none">Voya</h1>
              <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">Admin Portal</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-2.5 py-1.5 bg-rose-50 text-rose-600 text-[11px] font-bold border border-rose-250 rounded cursor-pointer hover:bg-rose-100"
          >
            Logout
          </button>
        </header>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-56 bg-slate-900 text-slate-300 hidden md:flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-2.5">
            <VoyaLogo light={false} className="scale-95" />
            <div className="border-l border-slate-700 pl-2 ml-1">
              <h1 className="font-bold text-sm text-white tracking-tight leading-none">Admin</h1>
              <p className="text-[10px] text-slate-500 uppercase font-semibold mt-1">Sourcing Hub</p>
            </div>
          </div>
        </div>

        {/* LOGGED IN INFO */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border border-slate-700 overflow-hidden shrink-0 bg-slate-800">
              <img src={currentUser.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} alt="Admin avatar" className="w-full h-full object-cover" />
            </div>
            <div className="truncate">
              <p className="text-[11px] font-semibold text-slate-200 truncate leading-none">{currentUser.name}</p>
              <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{currentUser.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <Sliders className="w-3.5 h-3.5 mr-2 shrink-0" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('sellers')}
            className={`sidebar-btn ${activeTab === 'sellers' ? 'active' : ''}`}
          >
            <StoreIcon className="w-3.5 h-3.5 mr-2 shrink-0" />
            Manage Sellers
            {users.some(u => u.role === 'seller' && !u.approved && !u.blocked) && (
              <span className="ml-auto bg-amber-500 text-slate-900 text-[10px] px-1.5 rounded-full font-bold">
                {users.filter(u => u.role === 'seller' && !u.approved && !u.blocked).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`sidebar-btn ${activeTab === 'customers' ? 'active' : ''}`}
          >
            <Users className="w-3.5 h-3.5 mr-2 shrink-0" />
            Manage Customers
          </button>

          <button
            onClick={() => {
              setActiveTab('products');
              setAdminProductTab('pending_approval');
            }}
            className={`sidebar-btn ${activeTab === 'products' ? 'active' : ''}`}
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-2 shrink-0" />
            Manage Products
            {products.some(p => p.status === 'pending_approval') && (
              <span className="ml-auto bg-[#ff6600] text-white text-[10px] px-1.5 rounded-full font-bold">
                {products.filter(p => p.status === 'pending_approval').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <Clock className="w-3.5 h-3.5 mr-2 shrink-0" />
            Manage Orders
          </button>

          <button
            onClick={() => setActiveTab('settlements')}
            className={`sidebar-btn ${activeTab === 'settlements' ? 'active' : ''}`}
          >
            <DollarSign className="w-3.5 h-3.5 mr-2 shrink-0 text-emerald-450" />
            Settlements &amp; Payouts
            {withdrawalRequests.some(w => w.status === 'pending') && (
              <span className="ml-auto bg-emerald-500 text-slate-950 text-[10px] px-1.5 rounded-full font-bold">
                {withdrawalRequests.filter(w => w.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('lucky_draw')}
            className={`sidebar-btn ${activeTab === 'lucky_draw' ? 'active' : ''}`}
          >
            <Coins className="w-3.5 h-3.5 mr-2 shrink-0 text-amber-400 font-bold" />
            Member Deposits
            {pointsPurchases.some(p => p.status === 'pending') && (
              <span className="ml-auto bg-amber-500 text-slate-100 text-[10px] px-1.5 rounded-full font-bold">
                {pointsPurchases.filter(p => p.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Settings className="w-3.5 h-3.5 mr-2 shrink-0" />
            Platform Settings
          </button>
        </nav>

        <div className="p-3 border-t border-slate-800 bg-slate-950/10">
          <button
            onClick={onLogout}
            className="w-full text-center py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-200 rounded text-[11px] font-semibold transition-all border border-slate-700 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* DASHBOARD CONTENT WINDOW */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
            {activeTab === 'dashboard' ? 'System Overview / Dashboard' : 
             activeTab === 'sellers' ? 'Seller Hub / Registrations & Approvals' :
             activeTab === 'customers' ? 'User Directory / Customer Control' :
             activeTab === 'products' ? 'Trading Commodities / Product Verification' :
             activeTab === 'orders' ? 'Transaction Ledger / Order Stream' : 
             activeTab === 'settlements' ? 'Settlements & Payout Ledger' :
             activeTab === 'lucky_draw' ? 'Member Deposits & Payments Hub' : 'Configuration Panel / Global Settings'}
          </h2>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[10px]">
            <span>LAST SYNCED: 2026-06-01 17:17:22 UTC</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: DASHBOARD STATS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              {/* STATS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="metric-card flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Capital Flow</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">${totalSales.toFixed(2)}</p>
                    <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">+12.4% vs last month</div>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded text-emerald-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>

                <div className="metric-card flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Sellers</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">{sellersCount}</p>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Verified storefronts</div>
                  </div>
                  <div className="p-2 bg-blue-50 rounded text-blue-600">
                    <StoreIcon className="w-4 h-4" />
                  </div>
                </div>

                <div className="metric-card flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Buyers</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">{customersCount}</p>
                    <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">Consumer accounts</div>
                  </div>
                  <div className="p-2 bg-indigo-50 rounded text-indigo-600">
                    <Users className="w-4 h-4" />
                  </div>
                </div>

                <div className="metric-card flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Products Listed</span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">{productsCount}</p>
                    <div className="text-[10px] text-rose-500 mt-0.5 font-medium">Commercial SKUs</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded text-red-650">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* PENDING NOTIFICATION BANNER */}
              {users.some(u => u.role === 'seller' && !u.approved && !u.blocked) && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wide">Pending Seller Registrations</h4>
                    <p className="text-[11px] text-amber-700 mt-0.5">There are pending seller applications waiting for verification. Approved merchants will be granted catalog listings permissions immediately.</p>
                    <button 
                      onClick={() => setActiveTab('sellers')}
                      className="mt-1.5 text-[10px] font-bold text-amber-900 uppercase hover:underline cursor-pointer"
                    >
                      Inspect queue &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* PENDING PRODUCT LISTINGS BANNER */}
              {products.some(p => p.status === 'pending_approval') && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-orange-650 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-orange-900 text-xs uppercase tracking-wide">Pending Product submissions ({products.filter(p => p.status === 'pending_approval').length})</h4>
                    <p className="text-[11px] text-orange-700 mt-0.5">Sellers have submitted new products for pricing, size confirmation, and shipping weight approval. They will not be visible to consumers until approved.</p>
                    <button 
                      onClick={() => {
                        setActiveTab('products');
                        setAdminProductTab('pending_approval');
                      }}
                      className="mt-1.5 text-[10px] font-bold text-orange-900 uppercase hover:underline cursor-pointer"
                    >
                      Review listings submissions &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* SAVIE BRANDE LOGS & QUICK STATS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* BRANDING INFO */}
                <div className="md:col-span-2 metric-card flex flex-col justify-start">
                  <h3 className="font-bold text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Savie&apos;s Enterprise Branding Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Company Name</span>
                      <p className="font-semibold text-slate-800">{settings.siteName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Official Contact Email</span>
                      <p className="font-semibold text-slate-800">{settings.contactEmail || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Contact Hotlines</span>
                      <p className="font-semibold text-slate-800">{settings.contactPhone || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Headquarters Address</span>
                      <p className="font-semibold text-slate-850 truncate">{settings.contactAddress || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* DB HEALTH AND STATUS (HIGH-DENSITY COMPLIANT SYSTEM INDICATORS) */}
                <div className="metric-card bg-slate-900 text-slate-100 flex flex-col justify-between">
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Storage &amp; DB Operations</p>
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Database Status</p>
                      <p className="text-xs font-bold text-sky-400 leading-none">99.98% / OPTIMAL</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Local Cache Storage</p>
                      <p className="text-xs font-bold text-slate-300 font-mono">4.2GB / 10GB Emulated</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-1.5 mt-2 flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">v2.4.0-production</span>
                    <span className="text-emerald-400 font-bold">● ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* TAB 2: MANAGE SELLERS */}
        {activeTab === 'sellers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase">Merchant Accounts Control</h3>
                <p className="text-[11px] text-slate-500">Approve new vendors, toggle storefront status, and audit payout channels.</p>
              </div>

              {/* FILTER CONTROLS */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded border border-slate-200 text-[11px] font-bold">
                <span className="px-2 text-slate-400 font-medium">Filter Status:</span>
                {(['all', 'pending', 'approved', 'blocked'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setSellerFilter(f)}
                    className={`px-2.5 py-1 rounded capitalize transition-all cursor-pointer ${
                      sellerFilter === f ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* SELLERS CARD LIST */}
            <div className="space-y-3">
              {filteredSellers.length === 0 ? (
                <div className="bg-white p-8 text-center rounded border border-dashed border-slate-200">
                  <StoreIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-bold text-xs">No sellers match the selected filter category.</p>
                </div>
              ) : (
                filteredSellers.map(seller => {
                  const store = stores.find(s => s.storeId === seller.storeId);
                  return (
                    <div key={seller.userId} className="metric-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <img 
                          src={store?.logo || seller.profilePicture} 
                          alt="Store Logo" 
                          className="w-10 h-10 rounded border border-slate-200 object-cover shrink-0 bg-white p-0.5" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs text-slate-800">
                              {store?.storeName || 'Unnamed Store Application'}
                            </h4>
                            {seller.blocked ? (
                              <span className="bg-rose-100 text-rose-800 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">Blocked</span>
                            ) : seller.approved ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">Approved</span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded animate-pulse">Pending Review</span>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                            Merchant Name: <span className="text-slate-700 font-bold">{seller.name}</span> ({seller.email})
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 pl-1.5 border-l-2 border-slate-200 max-w-2xl leading-normal truncate" title={store?.description}>
                            {store?.description || 'No store description documented.'}
                          </p>
                          {store?.payoutEmail && (
                            <p className="text-[10px] font-mono text-sky-700 font-bold mt-1">
                              Payout Account: {store.payoutEmail}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ACTION CONTROLS */}
                      <div className="flex items-center gap-1.5 shrink-0 md:self-center self-end">
                        {!seller.approved && !seller.blocked && (
                          <button
                            onClick={() => handleApproveSeller(seller.userId)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Approved
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleToggleBlockSeller(seller.userId)}
                          className={`flex items-center gap-1 px-2.5 py-1 border rounded text-[11px] font-bold transition-all cursor-pointer ${
                            seller.blocked
                              ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <XOctagon className="w-3 h-3" />
                          {seller.blocked ? 'Unblock' : 'Block'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MANAGE CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="bg-white p-3 border border-slate-200 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase">Buyer &amp; Customer Accounts</h3>
                <p className="text-[11px] text-slate-500">Oversee client profiles, manage addresses, and handle suspension states.</p>
              </div>
            </div>

            {/* CUSTOMERS DIRECTORY */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-grid-compact">
                  <thead>
                    <tr>
                      <th className="py-2 px-3">Subscriber</th>
                      <th className="py-2 px-3">Shipping Location</th>
                      <th className="py-2 px-3">Wallet Balance</th>
                      <th className="py-2 px-3">Role Status</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          No registered customers found.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map(customer => (
                        <tr key={customer.userId} className={`${customer.blocked ? 'bg-rose-50/60' : 'hover:bg-slate-50/50'}`}>
                          <td className="py-1.5 px-3">
                            <div className="flex items-center gap-2">
                              <img src={customer.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${customer.name}`} alt="" className="w-6 h-6 rounded border border-slate-200" />
                              <div>
                                <p className="font-bold text-slate-800">{customer.name}</p>
                                <p className="text-[9px] font-mono text-slate-400 leading-none">{customer.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-1.5 px-3 text-[11px] text-slate-500 max-w-xs truncate" title={customer.shippingAddress}>
                            {customer.shippingAddress || 'No shipping address configured.'}
                          </td>
                          <td className="py-1.5 px-3 font-mono font-black text-emerald-650 text-xs">
                            LRD {(customer.accountBalance || 0).toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3">
                            {customer.blocked ? (
                              <span className="inline-block bg-rose-100 text-rose-850 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">Blocked</span>
                            ) : (
                              <span className="inline-block bg-emerald-100 text-emerald-850 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">Active</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setIsAdjustingBalanceUser(customer);
                                setAdjustType('credit');
                                setAdjustAmount('');
                                setAdjustReason('');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-750 hover:bg-amber-100 border border-amber-200 rounded text-[11px] cursor-pointer font-medium"
                            >
                              <DollarSign className="w-3 h-3 text-amber-600" />
                              Adjust Wallet
                            </button>
                            <button
                              onClick={() => handleEditCustomerClick(customer)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded text-[11px] hover:bg-slate-100 cursor-pointer font-medium"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleBlockCustomer(customer.userId)}
                              className={`inline-flex items-center gap-1 px-2 py-1 border rounded text-[11px] cursor-pointer font-medium ${
                                customer.blocked 
                                  ? 'bg-rose-50 text-rose-600 border-rose-250 hover:bg-rose-100' 
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {customer.blocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customer.userId, customer.name)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 rounded text-[11px] cursor-pointer font-medium"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CUSTOMER CUSTOM MODAL EDIT */}
            {editingCustomer && (
              <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
                <div className="bg-white rounded max-w-sm w-full shadow-lg overflow-hidden border border-slate-200 animate-in fade-in-50 duration-100 flex flex-col max-h-[90vh]">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                    <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider">Edit Credentials</h4>
                    <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-650"><XOctagon className="w-4 h-4" /></button>
                  </div>
                  <form onSubmit={handleUpdateCustomer} className="p-4 space-y-3 overflow-y-auto flex-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Display Name</label>
                      <input
                        type="text"
                        value={customerEditName}
                        onChange={(e) => setCustomerEditName(e.target.value)}
                        className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                      <input
                        type="email"
                        value={customerEditEmail}
                        onChange={(e) => setCustomerEditEmail(e.target.value)}
                        className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Shipping Address</label>
                      <textarea
                        value={customerEditAddress}
                        onChange={(e) => setCustomerEditAddress(e.target.value)}
                        rows={2}
                        className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                      />
                    </div>
                    
                    <div className="flex gap-1.5 justify-end pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingCustomer(null)}
                        className="px-3 py-1 border border-slate-200 rounded text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-slate-800 text-white font-bold rounded text-[11px] hover:bg-slate-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MANUAL WALLET BALANCE ADJUSTMENT DIALOG MODAL */}
            {isAdjustingBalanceUser && (
              <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
                <div className="bg-white rounded max-w-sm w-full shadow-lg overflow-hidden border border-slate-200 animate-in fade-in-50 duration-100 flex flex-col max-h-[90vh]">
                  <div className="p-3 border-b border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
                    <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5 animate-pulse">
                      <DollarSign className="w-4 h-4 text-emerald-600 animate-bounce" />
                      Adjust Member Wallet Balance
                    </h4>
                    <button onClick={() => setIsAdjustingBalanceUser(null)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                  
                  <form onSubmit={handleAdjustBalance} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 space-y-1">
                      <p className="font-bold text-slate-800">Target User: <span className="text-emerald-750">{isAdjustingBalanceUser.name}</span></p>
                      <p className="text-[10px] text-slate-500 font-mono">Current Balance: <span className="font-black text-slate-800 font-mono">LRD {(isAdjustingBalanceUser.accountBalance || 0).toLocaleString()} LRD</span></p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Adjustment Action Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAdjustType('credit')}
                          className={`py-1.5 rounded border text-center font-bold tracking-tight transition-all cursor-pointer ${
                            adjustType === 'credit'
                              ? 'bg-emerald-50 text-emerald-750 border-emerald-300 ring-1 ring-emerald-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          ➕ Credit (Increase)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustType('debit')}
                          className={`py-1.5 rounded border text-center font-bold tracking-tight transition-all cursor-pointer ${
                            adjustType === 'debit'
                              ? 'bg-rose-50 text-rose-750 border-rose-250 ring-1 ring-rose-500'
                              : 'bg-white text-slate-605 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          ➖ Debit (Decrease)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Adjustment Amount (LRD)</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="e.g. 1500"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        className="block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline outline-slate-900 bg-white font-semibold font-mono"
                        required
                        disabled={isSubmittingAdjustment}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Reason / Note / Remarks</label>
                      <textarea
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="e.g. compensation, or bank deposit credentials match check."
                        rows={3}
                        className="block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline outline-slate-900 bg-white"
                        required
                      />
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">This reason note will show in customer's transaction logs Ledger.</p>
                    </div>

                    <div className="flex gap-1.5 justify-end pt-3 border-t border-slate-150">
                      <button
                        type="button"
                        onClick={() => setIsAdjustingBalanceUser(null)}
                        className="px-3.5 py-1.5 border border-slate-200 rounded font-bold text-slate-605 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                        disabled={isSubmittingAdjustment}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`px-4 py-1.5 font-black text-white rounded cursor-pointer ${
                          adjustType === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                        disabled={isSubmittingAdjustment}
                      >
                        {isSubmittingAdjustment ? 'adjusting...' : 'Save Adjustments'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}        {/* TAB 4: MANAGE PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-white p-3 border border-slate-200 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase">Platform Commodity Registry</h3>
                <p className="text-[11px] text-slate-500">Approve new listings, modify active pricing, allocate dispatch weights, and oversee inventory catalog.</p>
              </div>

              {/* FILTER BY CATEGORY (Only show if active listings tab) */}
              {adminProductTab === 'active_listings' && (
                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200 text-[11px] font-bold">
                  <span className="text-slate-400 font-medium">Category:</span>
                  <select
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="bg-transparent font-bold focus:outline-none cursor-pointer text-slate-700"
                  >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* PRODUCT MANAGEMNET INNER TABS */}
            <div className="flex border-b border-slate-200 bg-white p-1 rounded gap-1 shadow-xs">
              <button
                onClick={() => setAdminProductTab('active_listings')}
                className={`py-1.5 px-3.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  adminProductTab === 'active_listings'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Active &amp; Reviewed Listings ({products.filter(p => !p.status || p.status === 'approved' || p.status === 'rejected').length})
              </button>
              <button
                onClick={() => setAdminProductTab('pending_approval')}
                className={`py-1.5 px-3.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  adminProductTab === 'pending_approval'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Pending Approvals
                {products.some(p => p.status === 'pending_approval') && (
                  <span className="bg-[#ff6600] text-white text-[9px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                    {products.filter(p => p.status === 'pending_approval').length}
                  </span>
                )}
              </button>
            </div>

            {/* PRODUCTS LISTING CONTAINER */}
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {(() => {
                  const items = adminProductTab === 'active_listings'
                    ? products.filter(p => {
                        const matchesFilter = productFilter === 'all' || p.category === productFilter;
                        const isReviewed = !p.status || p.status === 'approved' || p.status === 'rejected';
                        return matchesFilter && isReviewed;
                      })
                    : products.filter(p => p.status === 'pending_approval');

                  if (items.length === 0) {
                    return (
                      <p className="py-12 text-center text-slate-400 font-medium text-xs">
                        {adminProductTab === 'active_listings' 
                          ? 'No reviewed products registered in matching taxonomy categories.' 
                          : 'No pending submissions requiring attention. Perfect!'}
                      </p>
                    );
                  }

                  return (
                    <table className="data-grid-compact">
                      <thead>
                        <tr>
                          <th className="py-2 px-3">Commodity Details</th>
                          <th className="py-2 px-3">Merchant Source</th>
                          <th className="py-2 px-3">Category / Status</th>
                          <th className="py-2 px-3">Sizes / Weights</th>
                          <th className="py-2 px-3 text-right">Action Gate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(prod => {
                          const store = stores.find(s => s.storeId === prod.storeId);
                          const isApproved = !prod.status || prod.status === 'approved';
                          const isRejected = prod.status === 'rejected';
                          const isPending = prod.status === 'pending_approval';

                          return (
                            <tr key={prod.productId} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2.5">
                                  <img src={prod.images?.[0] || 'https://via.placeholder.com/150'} alt="" className="w-10 h-10 rounded object-cover shrink-0 border border-slate-200 bg-slate-50" />
                                  <div>
                                    <p className="font-bold text-slate-800 text-[11px] leading-tight">{prod.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap text-[10px]">
                                      <span className="text-slate-400">Cost: <strong>${(prod.originalPrice ?? prod.price).toFixed(2)}</strong></span>
                                      <span className="text-slate-400">Profit: <strong>${(prod.desiredProfit ?? 0).toFixed(2)}</strong></span>
                                      <span className="text-emerald-600 font-extrabold">Final: ${prod.price.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200">
                                  {store?.storeName || 'Legacy Store'}
                                </span>
                              </td>
                              <td className="py-2 px-3 space-y-1">
                                <p className="text-[10px] text-slate-500 font-semibold">{prod.category}</p>
                                <div>
                                  {isApproved && (
                                    <span className="inline-block bg-emerald-50 text-emerald-805 text-[9px] font-black uppercase px-1.5 py-0.2 rounded border border-emerald-150">Active Approved</span>
                                  )}
                                  {isRejected && (
                                    <span className="inline-block bg-rose-50 text-rose-805 text-[9px] font-black uppercase px-1.5 py-0.2 rounded border border-rose-150">Rejected Draft</span>
                                  )}
                                  {isPending && (
                                    <span className="inline-block bg-amber-50 text-amber-805 text-[9px] font-black uppercase px-1.5 py-0.2 rounded border border-amber-150 animate-pulse">Needs Review</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 space-y-1 text-[10px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {prod.sizes && prod.sizes.length > 0 ? (
                                    prod.sizes.map(s => (
                                      <span key={s} className="bg-slate-50 border border-slate-200 px-1 rounded font-black text-slate-600 text-[8px]">{s}</span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 italic">No custom sizes</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500">
                                  Weight: <strong className="text-slate-700">{prod.weight !== null && prod.weight !== undefined ? `${prod.weight} kg` : 'Not Set yet'}</strong>
                                </p>
                              </td>
                              <td className="py-2 px-3 text-right whitespace-nowrap space-x-1.5">
                                <button
                                  onClick={() => handleOpenReviewModal(prod)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded text-[10px] font-bold hover:bg-slate-850 cursor-pointer"
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                  {isPending ? 'Audit &amp; Approve' : 'Configure Specs'}
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod.productId, prod.name)}
                                  className="p-1 px-1.5 text-rose-504 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded inline-flex cursor-pointer text-rose-600"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>

            {/* ADMIN PRODUCT EDIT & REVIEW DIALOG MODAL */}
            {reviewingProduct && (
              <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-xs overflow-y-auto">
                <div className="bg-white rounded max-w-lg w-full shadow-lg overflow-hidden border border-slate-250 my-8 flex flex-col max-h-[90vh]">
                  <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#ff6600]" />
                      {reviewingProduct.status === 'pending_approval' ? 'Audit Vendor Commodity Submission' : 'Edit Listing Specifications'}
                    </h3>
                    <button onClick={() => setReviewingProduct(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>

                  <form onSubmit={handleApproveProduct} className="p-3 space-y-3 overflow-y-auto flex-1">
                    {/* INFO HEADER FOR ORIGINAL SELLER MATHS */}
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[11px] text-slate-700 leading-normal space-y-1">
                      <p>🏪 Submitted store ID: <span className="font-bold">{stores.find(s => s.storeId === reviewingProduct.storeId)?.storeName || 'Legacy Catalog'}</span></p>
                      <div className="flex gap-4 font-mono text-[10px] text-slate-500 pt-1">
                        <span>Original cost price: <strong>${(reviewingProduct.originalPrice ?? reviewingProduct.price).toFixed(2)}</strong></span>
                        <span>Desired merchant profit: <strong>${(reviewingProduct.desiredProfit ?? 0).toFixed(2)}</strong></span>
                        <span className="text-[#ff6600] font-bold">Suggested Final Price: ${(reviewingProduct.finalPrice ?? (reviewingProduct.originalPrice ?? reviewingProduct.price) + (reviewingProduct.desiredProfit ?? 0)).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Name *</label>
                        <input
                          type="text"
                          value={adminSetName}
                          onChange={(e) => setAdminSetName(e.target.value)}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category Class</label>
                        <select
                          value={adminSetCategory}
                          onChange={(e) => setAdminSetCategory(e.target.value)}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Electronics">Electronics</option>
                          <option value="Apparel & Fashion">Apparel & Fashion</option>
                          <option value="Home & Kitchen">Home & Kitchen</option>
                          <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                          <option value="Automotive">Automotive</option>
                          <option value="Toys & Hobbies">Toys & Hobbies</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admin End Price Override ($ USD) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={adminSetPrice}
                          onChange={(e) => setAdminSetPrice(e.target.value)}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-900 focus:outline-none bg-amber-50/25 border-amber-200 focus:ring-1 focus:ring-[#ff6600]"
                          required
                        />
                        <span className="text-[9px] text-slate-450 block mt-0.5">Admin-assigned price available to buyers.</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estimated Product Weight (kg) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={adminSetWeight}
                          onChange={(e) => setAdminSetWeight(e.target.value)}
                          placeholder="e.g. 0.45"
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-[#ff6600] focus:outline-none bg-[#ff6600]/5 border-orange-200 focus:ring-1 focus:ring-[#ff6600]"
                          required
                        />
                        <span className="text-[9px] text-slate-450 block mt-0.5">Crucial for downstream weight-based freight computations.</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confirmed Sizes / Variants</label>
                        <input
                          type="text"
                          value={adminSetSizes}
                          onChange={(e) => setAdminSetSizes(e.target.value)}
                          placeholder="e.g. S, M, L, XL"
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                        <span className="text-[9px] text-slate-450 block mt-0.5">Comma-separated variants.</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Merchant Stock Units *</label>
                        <input
                          type="number"
                          value={adminSetStock}
                          onChange={(e) => setAdminSetStock(e.target.value)}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-850"
                          required
                        />
                      </div>
                    </div>

                    {/* Voya Spec Store - Image Gallery Asset Manager */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">Product Gallery Images ({adminSetImages.length}/3) *</label>
                        {adminSetImages.length < 3 && (
                          <label className="text-[10px] bg-slate-900 text-white font-bold py-1 px-2 rounded cursor-pointer hover:bg-slate-800 transition-colors inline-block">
                            + Add Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !reviewingProduct) return;
                                
                                showToast('Uploading image straight to storage...', 'info');
                                try {
                                  const reader = new FileReader();
                                  const base64Promise = new Promise<string>((resolve) => {
                                    reader.onloadend = () => resolve(reader.result as string);
                                  });
                                  reader.readAsDataURL(file);
                                  const base64 = await base64Promise;
                                  
                                  const uploadedUrl = await uploadImageToStorage(
                                    `products/${reviewingProduct.productId}/img_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                                    base64
                                  );
                                  
                                  const nextImages = [...adminSetImages, uploadedUrl];
                                  setAdminSetImages(nextImages);
                                  
                                  // Update straight to database on snapshot
                                  const updated = {
                                    ...reviewingProduct,
                                    images: nextImages
                                  };
                                  await dbSaveProduct(updated);
                                  showToast('Image uploaded and synced to database snapshot!', 'success');
                                } catch (err) {
                                  console.error(err);
                                  showToast('Failed to upload image directly.', 'error');
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                      
                      {adminSetImages.length === 0 ? (
                        <p className="text-[11.5px] text-slate-400 py-3 text-center border border-dashed border-slate-350 rounded bg-white font-medium">Please include at least 1 visual catalog asset.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {adminSetImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square border border-slate-200 rounded bg-white overflow-hidden group">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                              
                              {/* Option controls overlay */}
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!reviewingProduct) return;
                                    const nextImages = adminSetImages.filter((_, i) => i !== idx);
                                    setAdminSetImages(nextImages);
                                    
                                    if (img.startsWith('http')) {
                                      setDeletedImages(prev => [...prev, img]);
                                      try {
                                        await deleteImageFromStorage(img);
                                      } catch (err) {
                                        console.warn('Physical storage removal skipped:', err);
                                      }
                                    }
                                    
                                    // Update straight to database on snapshot
                                    const updated = {
                                      ...reviewingProduct,
                                      images: nextImages
                                    };
                                    await dbSaveProduct(updated);
                                    showToast('Image removed and document updated in DB.', 'success');
                                  }}
                                  className="p-1.5 bg-rose-600 rounded text-white hover:bg-rose-700 transition-colors cursor-pointer"
                                  title="Delete Image"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDownloadImage(img, `admin-review-${reviewingProduct?.productId || 'product'}-${idx}.jpg`)}
                                  className="p-1.5 bg-blue-600 rounded text-white hover:bg-blue-700 transition-colors cursor-pointer"
                                  title="Download Image"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                
                                <label className="p-1.5 bg-slate-850 rounded text-white hover:bg-slate-700 transition-colors cursor-pointer" title="Replace Image">
                                  <Upload className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file || !reviewingProduct) return;
                                      
                                      showToast('Replacing and uploading image straight to storage...', 'info');
                                      try {
                                        const reader = new FileReader();
                                        const base64Promise = new Promise<string>((resolve) => {
                                          reader.onloadend = () => resolve(reader.result as string);
                                        });
                                        reader.readAsDataURL(file);
                                        const base64 = await base64Promise;
                                        
                                        const uploadedUrl = await uploadImageToStorage(
                                          `products/${reviewingProduct.productId}/img_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                                          base64
                                        );
                                        
                                        if (img.startsWith('http')) {
                                          setDeletedImages(prev => [...prev, img]);
                                          // Physically delete from Storage bucket immediately
                                          try {
                                            await deleteImageFromStorage(img);
                                          } catch (err) {
                                            console.warn('Physical storage removal skipped:', err);
                                          }
                                        }
                                        
                                        const nextImages = [...adminSetImages];
                                        nextImages[idx] = uploadedUrl;
                                        setAdminSetImages(nextImages);
                                        
                                        // Update straight to database on snapshot
                                        const updated = {
                                          ...reviewingProduct,
                                          images: nextImages
                                        };
                                        await dbSaveProduct(updated);
                                        showToast('Image replaced and synced to database snapshot!', 'success');
                                      } catch (err) {
                                        console.error(err);
                                        showToast('Failed to replace and upload image.', 'error');
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <span className="text-[9px] text-slate-400 block font-medium">Add, delete or replace images before approving. Replaced images are deleted automatically.</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Catalog Description *</label>
                      <textarea
                        value={adminSetDesc}
                        onChange={(e) => setAdminSetDesc(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800"
                        required
                      />
                    </div>

                    <div className="border-t border-slate-150 pt-2.5 space-y-1.5">
                      <label className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">Application Rejection Feedback (If declining draft)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adminRejectionReason}
                          onChange={(e) => setAdminRejectionReason(e.target.value)}
                          placeholder="Explain errors to vendor: e.g., Profit margin too high, mismatch description catalog..."
                          className="flex-1 px-2.5 py-1.5 border border-rose-200 rounded text-xs focus:outline-none font-semibold bg-rose-50/10 placeholder-rose-300"
                        />
                        <button
                          type="button"
                          onClick={handleRejectProduct}
                          className="px-3 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs uppercase cursor-pointer"
                        >
                          Reject Listing
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-150 flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReviewingProduct(null)}
                        className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Approve &amp; Active Listing
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MANAGE ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white p-3 border border-slate-200 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase">Platform Core Trade Orders</h3>
                <p className="text-[11px] text-slate-500">Global orders history tracker and dispatch overrides.</p>
              </div>

              {/* ORDER WORKFLOW FILTERS */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200 text-[11px] font-bold">
                <span className="text-slate-400 font-medium">Order State:</span>
                <select
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value)}
                  className="bg-transparent font-bold focus:outline-none cursor-pointer text-slate-700"
                >
                  <option value="all">All States</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* ORDER ITEMS */}
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="bg-white p-8 text-center rounded border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-bold text-xs">No orders matching selected workflow criteria.</p>
                </div>
              ) : (
                filteredOrders.map(order => {
                  const customer = users.find(u => u.userId === order.customerId);
                  const store = stores.find(s => s.storeId === order.storeId);
                  return (
                    <div key={order.orderId} className="metric-card !p-0 overflow-hidden">
                      <div className="p-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold text-[10px] uppercase">Order ID:</span>
                            <span className="text-slate-900 font-bold text-xs">#{order.orderId}</span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-450">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                              order.status === 'shipped' ? 'bg-indigo-100 text-indigo-500' :
                              order.status === 'processing' ? 'bg-amber-100 text-amber-800' :
                              order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-slate-150 text-slate-800'
                            }`}>
                              {order.status}
                            </span>
                          </div>

                          <div>
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.orderId, order.storeId, e.target.value)}
                              className="text-[11px] font-bold bg-white border border-slate-200 rounded p-1 focus:outline-none cursor-pointer"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* WORK DETAILS */}
                      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Client Info</h4>
                          <div>
                            <p className="font-bold text-slate-800 leading-none">{customer?.name || 'N/A'}</p>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">{customer?.email || 'N/A'}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-1.5 leading-snug bg-slate-50 p-1.5 rounded border border-slate-100 truncate" title={order.shippingAddress}>
                              {order.shippingAddress}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fulfilling Storefront</h4>
                          <p className="font-bold text-slate-800">{store?.storeName || 'N/A'}</p>
                          <p className="text-[10px] font-medium text-slate-450">Vendor payout: {store?.payoutEmail || 'N/A'}</p>

                          {order.paymentMethod && order.paymentMethod !== 'none' ? (
                            <div className="mt-2 p-2 bg-amber-50/70 border border-amber-200 rounded text-[10.5px] text-slate-700 space-y-1.5">
                              <span className="inline-block text-[8.5px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded leading-none">
                                {order.paymentMethod === 'mobile_money' ? '📱 Mobile Money' : '🏦 Bank Transfer'}
                              </span>
                              <div className="space-y-0.5 font-semibold text-slate-600">
                                <p>Ref / ID: <span className="font-mono text-slate-900 font-bold bg-white px-1 py-0.2 rounded border border-slate-200">{order.paymentReference}</span></p>
                                <p>Sender: <span className="text-slate-900 font-bold">{order.paymentSenderDetails}</span></p>
                                {order.paymentReceipt && (
                                  <div className="mt-2 pt-1.5 border-t border-amber-200/50 flex items-center justify-between gap-2.5 bg-white/40 p-1 rounded">
                                    <span className="text-[8px] font-bold text-slate-450 uppercase tracking-wide">Receipt Photo / Proof:</span>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewReceiptImage(order.paymentReceipt || null)}
                                      className="w-8 h-8 rounded border border-slate-200 overflow-hidden relative group cursor-pointer bg-white"
                                    >
                                      <img src={order.paymentReceipt} alt="Receipt proof" className="w-full h-full object-cover" />
                                      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[5px] font-bold text-center pb-0.2 leading-none">
                                        VIEW
                                      </div>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-[10px] text-slate-400 italic font-medium">No system payment details mapped.</div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Acquired Items</h4>
                          <div className="space-y-1 text-[11px] font-semibold text-slate-700">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-slate-50 p-1 px-1.5 rounded border border-slate-100">
                                <span className="max-w-[150px] truncate">{item.name} <span className="text-slate-400 px-0.5">x{item.quantity}</span></span>
                                <span className="font-bold text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="border-t border-slate-100 pt-1 mt-1.5 flex justify-between text-xs font-bold text-slate-800">
                              <span>Grand Total:</span>
                              <span className="text-indigo-600">${order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SETTLEMENTS & SOURCE ROUTING */}
        {activeTab === 'settlements' && (
          <div className="space-y-6">
            {/* Sourcing Hub Alert Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-widest text-[#ff6600] uppercase block">Global Sourcing Clearance Central</span>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-100">Merchant Settlements &amp; Gateway Audits</h3>
                <p className="text-[11px] text-slate-400 font-semibold max-w-2xl leading-normal">
                  Sourcing items directly from China for overseas buyers. Settle merchant markup profits through localized gateways: Focus on <strong>Liberia (Orange/MTN Mobile Money)</strong> and <strong>USA (Wise direct wires)</strong>.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="bg-slate-850 border border-slate-800 p-2 rounded text-center min-w-[100px]">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Pending Audits</span>
                  <p className="text-base font-black text-amber-500 mt-0.5">
                    {withdrawalRequests.filter(w => w.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-slate-850 border border-slate-800 p-2 rounded text-center min-w-[100px]">
                  <span className="text-[8px] text-emerald-400 font-bold uppercase block">Resolved Today</span>
                  <p className="text-base font-black text-emerald-500 mt-0.5">
                    {withdrawalRequests.filter(w => w.status === 'approved').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Merchant profit balance clearances section */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Merchant Withdrawal Queue</h3>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 font-semibold">Store markup payout claims requiring physical verification or wire dispatch from China office.</p>
                </div>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wide">
                  {withdrawalRequests.filter(w => w.status === 'pending').length} Pending Requests
                </span>
              </div>

              {withdrawalRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-450 border border-dashed border-slate-200 bg-slate-50 rounded">
                  <p className="font-extrabold text-xs uppercase tracking-wider">No Withdrawal Requests Filed</p>
                  <p className="text-[10px] text-slate-550 mt-1">Sellers get credited when orders fulfill. Claims appear here when they request settlement.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-700">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <th className="p-2.5">Reference ID</th>
                        <th className="p-2.5">Store / Vendor</th>
                        <th className="p-2.5">Settle Amount</th>
                        <th className="p-2.5">Gateway / Method</th>
                        <th className="p-2.5">Account Coordinates</th>
                        <th className="p-2.5">Filed Date</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-y-slate-100">
                       {withdrawalRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/40">
                          <td className="p-3 font-mono text-[9px] text-slate-500 font-bold">#{req.id}</td>
                          <td className="p-3">
                            <span className="font-extrabold text-slate-900 block">{req.storeName}</span>
                            <span className="text-[9px] text-slate-450 font-sans">Seller ID: {req.sellerId}</span>
                          </td>
                          <td className="p-3 font-black text-slate-950 text-[13px]">LRD {req.amount.toFixed(2)}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase text-amber-705">
                              📱 {req.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3 max-w-[200px] truncate whitespace-normal leading-relaxed text-[10px] font-mono text-slate-600 font-bold bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                            {req.accountDetails}
                          </td>
                          <td className="p-3 text-[10px] font-mono text-slate-400 font-medium">
                            {new Date(req.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                              req.status === 'approved' ? 'bg-emerald-100 text-emerald-805' :
                              req.status === 'rejected' ? 'bg-red-105 text-red-800' : 'bg-amber-100 text-amber-805'
                            }`}>
                              {req.status}
                            </span>
                            {req.transferReceipt && (
                              <button
                                type="button"
                                onClick={() => setPreviewReceiptImage(req.transferReceipt || null)}
                                className="block mx-auto mt-1 text-[8px] text-indigo-655 hover:underline cursor-pointer font-extrabold uppercase leading-none"
                              >
                                View Receipt Proof
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setProcessingWithdrawal(req);
                                    setWithdrawalReceipt(null);
                                  }}
                                  className="p-1 px-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[8.5px] uppercase rounded flex items-center gap-0.5 cursor-pointer animate-pulse"
                                  title="Upload money transfer receipt proof and finalize payment"
                                >
                                  <Check className="w-2.5 h-2.5" /> Process Payout
                                </button>
                                <button
                                  onClick={() => handleUpdateWithdrawalStatus(req.id, 'rejected')}
                                  className="p-1 px-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 font-bold text-[8.5px] uppercase rounded flex items-center gap-0.5 border border-slate-200 cursor-pointer"
                                  title="Reject Settle Proposal"
                                >
                                  <X className="w-2.5 h-2.5" /> Reject
                                </button>
                              </div>
                            ) : (
                              <div className="text-[9px] text-slate-400 italic">
                                Settle Closed {req.reviewedAt && `(${new Date(req.reviewedAt).toLocaleDateString()})`}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dual logistics gateway permintaan: user/store requested channels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Buyer custom gateway proposals */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Buyer Payment Gateway Requests</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Custom localized system integrations requested by buyers (Liberian LRD wallet / American card systems).</p>
                  </div>
                  <span className="text-[8.5px] font-extrabold uppercase text-slate-400">{buyerPaymentRequests.length} filed</span>
                </div>

                {buyerPaymentRequests.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 uppercase text-[9.5px] font-bold border border-dashed border-slate-150 rounded">
                    No buyer gateway requests filed
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-96 overflow-y-auto">
                    {buyerPaymentRequests.map((req) => (
                      <div key={req.id} className="border border-slate-200 rounded p-3 text-xs bg-slate-50/50 hover:bg-slate-50">
                        <div className="flex items-center justify-between pb-1.5 border-b border-light-slate">
                          <div>
                            <span className="font-extrabold text-slate-900 block">{req.requestedMethod}</span>
                            <span className="text-[9px] text-slate-450 font-bold">{req.customerName} &bull; {req.customerEmail}</span>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            req.status === 'integrated' ? 'bg-indigo-120 text-indigo-850' : 'bg-amber-100 text-amber-805'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        {req.details && (
                          <p className="mt-2 text-[10px] text-slate-600 italic bg-white p-2 rounded border border-slate-100 font-sans font-semibold leading-relaxed">
                            💡 Details: &ldquo;{req.details}&rdquo;
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between text-[9px]">
                          <span className="text-slate-400 font-mono">{new Date(req.createdAt).toLocaleString()}</span>
                          {req.status !== 'integrated' && (
                            <button
                              onClick={() => handleUpdateBuyerPaymentRequestStatus(req.id, 'integrated')}
                              className="px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded text-[8px] font-black uppercase tracking-wider transition cursor-pointer border border-indigo-200 hover:border-indigo-600"
                            >
                              ✓ Mark Integrated
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seller payout customization sourcing */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Store Custom Payout Requests</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Private banking channels, Wise US accounts, or MoMo wallets requested by merchants to withdraw markup profits.</p>
                  </div>
                  <span className="text-[8.5px] font-extrabold uppercase text-slate-400">{sellerPaymentRequests.length} logged</span>
                </div>

                {sellerPaymentRequests.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 uppercase text-[9.5px] font-bold border border-dashed border-slate-150 rounded">
                    No custom merchant gateway requests filed
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-96 overflow-y-auto">
                    {sellerPaymentRequests.map((req) => (
                      <div key={req.id} className="border border-slate-200 rounded p-3 text-xs bg-slate-50/50 hover:bg-slate-50">
                        <div className="flex items-center justify-between pb-1.5 border-b border-light-slate">
                          <div>
                            <span className="font-extrabold text-slate-900 block">{req.requestedMethod}</span>
                            <span className="text-[9px] text-slate-450 font-bold">Store: {req.storeName} &bull; {req.sellerEmail}</span>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            req.status === 'integrated' ? 'bg-teal-120 text-teal-850' : 'bg-amber-100 text-amber-805'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        {req.details && (
                          <p className="mt-2 text-[10px] text-slate-650 bg-white p-2 rounded border border-slate-100 font-mono leading-tight">
                            📝 Settle Notes: {req.details}
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between text-[9px]">
                          <span className="text-slate-400 font-mono">{new Date(req.createdAt).toLocaleString()}</span>
                          {req.status !== 'integrated' && (
                            <button
                              onClick={() => handleUpdateSellerPaymentRequestStatus(req.id, 'integrated')}
                              className="px-2 py-0.5 bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white rounded text-[8px] font-black uppercase tracking-wider transition cursor-pointer border border-teal-200 hover:border-teal-600"
                            >
                              ✓ Enable Gateway
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: MEMBER DEPOSITS AUDIT & VERIFICATION LEDGER */}
        {activeTab === 'lucky_draw' && (
          <div className="space-y-6 font-sans animate-in fade-in duration-100">
            {/* Ledger Banner header block */}
            <div className="bg-slate-900 text-slate-100 p-5 rounded-lg border border-slate-850 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    Member Wallet Receipts &amp; Top-Ups Approval Hub
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-2xl">
                    Review and authorize customer mobile money top-up receipts (Orange Money &amp; Lonestar MTN Money) to disburse digital account balance funds. Funds approved here are credited directly to member wallets for checkout payments.
                  </p>
                </div>
              </div>
            </div>

            {/* VERIFICATION WORKSPACE: POINTS PURCHASES DEPOSITS */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    Top-Up Points validation &amp; Approval Ledger
                  </h4>
                  <p className="text-[9px] text-slate-500 mt-0.5">Validate Orange Mobile Money or Lonestar Mobile Money receipts snapshot to disburse credits manually.</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 text-[10px] shrink-0">
                  <button
                    onClick={() => setPointsPurchaseFilter('all')}
                    className={`px-2.5 py-1 rounded font-semibold transition ${pointsPurchaseFilter === 'all' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setPointsPurchaseFilter('pending')}
                    className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${pointsPurchaseFilter === 'pending' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Pending
                    {pointsPurchases.filter(p => p.status === 'pending').length > 0 && (
                      <span className="bg-red-500 text-white text-[8px] font-black rounded-full px-1">
                        {pointsPurchases.filter(p => p.status === 'pending').length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setPointsPurchaseFilter('approved')}
                    className={`px-2.5 py-1 rounded font-semibold transition ${pointsPurchaseFilter === 'approved' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setPointsPurchaseFilter('rejected')}
                    className={`px-2.5 py-1 rounded font-semibold transition ${pointsPurchaseFilter === 'rejected' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Rejected
                  </button>
                </div>
              </div>

              {/* POINTS LIST TABLE */}
              {(() => {
                const list = pointsPurchases.filter(p => pointsPurchaseFilter === 'all' || p.status === pointsPurchaseFilter);

                if (list.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 space-y-1.5 text-xs font-sans">
                      <ListFilter className="w-5 h-5 mx-auto" />
                      <p className="font-bold">No points top-up requests found.</p>
                      <p className="text-[10px]">Requests submitted by customers will occupy this grid table for ledger authorization.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 font-sans border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                          <th className="px-4 py-2.5">Buyer</th>
                          <th className="px-4 py-2.5">LRD Amount</th>
                          <th className="px-4 py-2.5">Provider</th>
                          <th className="px-4 py-2.5">Sender Number</th>
                          <th className="px-4 py-2.5">Reference ID</th>
                          <th className="px-4 py-2.5">Receipt Screenshot</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {list.map((purchase) => (
                          <tr key={purchase.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-900">{purchase.username}</span>
                              <span className="block text-[9px] text-slate-400 font-mono">ID: {purchase.userId.substring(0, 8)}</span>
                            </td>
                            <td className="px-4 py-3 font-mono font-black text-slate-950">
                              {purchase.amountLrd} LRD
                              <span className="block text-[9px] text-slate-400 font-sans font-normal font-semibold">({purchase.amountLrd} Points)</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${(purchase.paymentProvider || '').toLowerCase().includes('orange') ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                                {purchase.paymentProvider || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono">{purchase.paymentSenderDetails || 'N/A'}</td>
                            <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{purchase.id}</td>
                            <td className="px-4 py-3">
                              {purchase.receiptImage ? (
                                <button
                                  onClick={() => setPreviewReceiptImage(purchase.receiptImage)}
                                  className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  title="View Receipt Screenshot Image"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View Capture
                                </button>
                              ) : (
                                <span className="text-slate-400 font-mono text-[10px]">No image</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                                purchase.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                purchase.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {purchase.status}
                              </span>
                              {purchase.adminNotes && (
                                <p className="text-[9px] text-slate-400 mt-1 italic font-semibold truncate max-w-[120px]" title={purchase.adminNotes}>
                                  Reason: {purchase.adminNotes}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {purchase.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleApprovePointsPurchase(purchase)}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white rounded text-[10px] font-bold uppercase uppercase tracking-wider transition cursor-pointer"
                                  >
                                    Verify Approve
                                  </button>
                                  <button
                                    onClick={() => setPendingRejectionId(purchase.id)}
                                    className="px-2 py-1 bg-red-50 text-red-750 border border-red-250 hover:bg-red-600 hover:text-white rounded text-[10px] font-bold uppercase uppercase tracking-wider transition cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">Reviewed At: {purchase.reviewedAt ? new Date(purchase.reviewedAt).toLocaleDateString() : 'N/A'}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* REJECTION POPUP INLINE DIALOG */}
            {pendingRejectionId && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-md max-w-sm w-full space-y-4">
                  <div className="flex items-start justify-between">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      Reject Deposit Verification
                    </h5>
                    <button onClick={() => setPendingRejectionId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500">Provide rejection comments explaining why this point purchase deposit receipt cannot be verified.</p>
                    <textarea
                      rows={3}
                      value={purchaseRejectionReason}
                      onChange={(e) => setPurchaseRejectionReason(e.target.value)}
                      placeholder="e.g. Reference ID mismatch or receipt photo invalid."
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline focus:outline-red-500 focus:ring-1 focus:ring-red-500"
                    ></textarea>
                  </div>
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setPendingRejectionId(null)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded font-semibold transition cursor-pointer"
                    >
                      Close Cancel
                    </button>
                    <button
                      onClick={() => handleRejectPointsPurchase(pendingRejectionId)}
                      className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 font-bold rounded transition cursor-pointer"
                    >
                      Reject Request
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* HISTORICAL LEADERBOARD ARCHIVE BLOCK */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Historical Month Lucky Draw Winners Archive
              </h4>
              <p className="text-[10px] text-slate-500">View previously published lucky drawn months with their disbursements ledger.</p>

              {monthlyStats.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No archive indices exist. Run current cycle drawing above to start the record line.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {monthlyStats.map((stat) => (
                    <div key={stat.id} className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 uppercase font-mono">{stat.monthYear}</span>
                        <span className="text-[9px] text-slate-400">{stat.publishedAt ? new Date(stat.publishedAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-200 pt-1">
                        <span>Total Spins: {stat.totalSpins}</span>
                        <span>Fund Value: {(stat.totalSpins * 50).toLocaleString()} LRD</span>
                      </div>
                      <div className="bg-white p-1.5 rounded border border-slate-150 max-h-24 overflow-y-auto">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-1">Winners ({stat.winners.length})</p>
                        <div className="space-y-1 font-mono text-[9px] text-slate-700">
                          {stat.winners.map(w => (
                            <div key={w.userId} className="flex justify-between items-center bg-slate-50 p-1 rounded">
                              <span className="truncate max-w-[80px]" title={w.username}>{w.username}</span>
                              <span className={`px-1 rounded text-[7px] font-black uppercase ${w.rank === 'winner-grand' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{w.prize} LRD</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS FOR BRANDING */}
        {activeTab === 'settings' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-white p-3 border border-slate-200 rounded">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Savie&apos;s Enterprise Platform Configurations</h3>
              <p className="text-[11px] text-slate-500">Rebrand the welcome layout, edit hotline details, and adjust landing page templates.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Site Platform Name</label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Contact Email</label>
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Contact Phone Number</label>
                  <input
                    type="text"
                    value={settings.contactPhone}
                    onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Savie&apos;s Corporate Plaza Address</label>
                  <input
                    type="text"
                    value={settings.contactAddress}
                    onChange={(e) => setSettings({ ...settings, contactAddress: e.target.value })}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* PLATFORM PAYMENT DETAILS */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div>
                  <h4 className="text-[11px] uppercase font-bold text-slate-900 tracking-wider flex items-center gap-1.5">
                    <span>🏦</span> Bank Transfer Payment Settings (Saved to Database)
                  </h4>
                  <p className="text-[10px] text-slate-550 font-medium">Configure the administrator bank details for customers executing manual Bank Wire Transfers on checkout lookup screens.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Bank Name (Admin)</label>
                    <input
                      type="text"
                      placeholder="e.g. Voya Global Bank of Commerce"
                      value={settings.adminBankName || ''}
                      onChange={(e) => setSettings({ ...settings, adminBankName: e.target.value })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 88800099955511"
                      value={settings.adminBankAccountNumber || ''}
                      onChange={(e) => setSettings({ ...settings, adminBankAccountNumber: e.target.value })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Voya Sourcing Direct Inc. (Savie Isaiah)"
                      value={settings.adminBankAccountName || ''}
                      onChange={(e) => setSettings({ ...settings, adminBankAccountName: e.target.value })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

                <div className="pt-2">
                  <h4 className="text-[11px] uppercase font-bold text-slate-900 tracking-wider flex items-center gap-1.5">
                    <span>📱</span> Liberia Customer Mobile Money Gateways (Orange &amp; Lonestar)
                  </h4>
                  <p className="text-[10px] text-slate-550 font-medium font-sans">Specify the receiving numbers and names for Liberia's allowed mobile money providers. Only these providers are accessible by customers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-amber-50/25 border border-amber-100 p-3 rounded-lg">
                  {/* Orange Mobile Money Liberia */}
                  <div className="space-y-2.5">
                    <div className="border-b border-orange-100 pb-1 flex items-center gap-1 bg-white px-1 py-0.5 rounded font-black text-orange-800 text-[10px] uppercase">
                      <span>🍊</span> Orange Mobile Money
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Orange Money Number</label>
                        <input
                          type="text"
                          placeholder="e.g. +231 77 111 2222"
                          value={settings.liberiaOrangeNumber || ''}
                          onChange={(e) => setSettings({ ...settings, liberiaOrangeNumber: e.target.value })}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Registered Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Voya Liberia Orange Settlement"
                          value={settings.liberiaOrangeName || ''}
                          onChange={(e) => setSettings({ ...settings, liberiaOrangeName: e.target.value })}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lonestar Mobile Money Liberia */}
                  <div className="space-y-2.5">
                    <div className="border-b border-indigo-100 pb-1 flex items-center gap-1 bg-white px-1 py-0.5 rounded font-black text-indigo-850 text-[10px] uppercase">
                      <span>⭐</span> Lonestar Mobile Money
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Lonestar Money Number</label>
                        <input
                          type="text"
                          placeholder="e.g. +231 88 111 2222"
                          value={settings.liberiaLonestarNumber || ''}
                          onChange={(e) => setSettings({ ...settings, liberiaLonestarNumber: e.target.value })}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Registered Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Voya Liberia Lonestar Settlement"
                          value={settings.liberiaLonestarName || ''}
                          onChange={(e) => setSettings({ ...settings, liberiaLonestarName: e.target.value })}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-[11px] uppercase font-bold text-slate-900 tracking-wider flex items-center gap-1.5">
                    <span>📱</span> General Backup Mobile Money Settings
                  </h4>
                  <p className="text-[10px] text-slate-550 font-medium font-sans">Backup global payment coordinates used for other operational tasks.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Mobile Money Wallet Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +233 54 123 4567"
                      value={settings.adminMobileMoneyNumber || ''}
                      onChange={(e) => setSettings({ ...settings, adminMobileMoneyNumber: e.target.value })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Account / Mobile Holder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Savie Isaiah Admin Fund"
                      value={settings.adminMobileMoneyName || ''}
                      onChange={(e) => setSettings({ ...settings, adminMobileMoneyName: e.target.value })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-505 uppercase">Mobile Network / Provider</label>
                    <input
                      type="text"
                      placeholder="e.g. MTN Mobile Money / Telecel Cash"
                      value={settings.adminMobileMoneyProvider || ''}
                      onChange={(e) => setSettings({ ...settings, adminMobileMoneyProvider: e.target.value })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-[11px] uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                    <span>💵</span> Savings Wallet Transaction Limits &amp; Commission Fee
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">Specify the deposit and withdrawal limits in LRD alongside standard seller commission fee on sales.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Commission Fee (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g. 15"
                      value={settings.commissionRate ?? 15}
                      onChange={(e) => setSettings({ ...settings, commissionRate: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Min Deposit (LRD)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 100"
                      value={settings.minDepositLimit ?? 100}
                      onChange={(e) => setSettings({ ...settings, minDepositLimit: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Max Deposit (LRD)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 100000"
                      value={settings.maxDepositLimit ?? 100000}
                      onChange={(e) => setSettings({ ...settings, maxDepositLimit: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Min Withdrawal (LRD)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 500"
                      value={settings.minWithdrawalLimit ?? 500}
                      onChange={(e) => setSettings({ ...settings, minWithdrawalLimit: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Max Withdrawal (LRD)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 50000"
                      value={settings.maxWithdrawalLimit ?? 50000}
                      onChange={(e) => setSettings({ ...settings, maxWithdrawalLimit: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                    />
                  </div>
                </div>

              {/* IMAGE UPLOADING SECTIONS WITH DYNAMIC BASE64 FILE CONVERTERS AND PREVIEWS */}
              <div className="space-y-3 pt-3 border-t border-slate-150">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Branding Assets (Base64)</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* LOGO */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Platform Logo</label>
                    <div className="flex items-center gap-3 bg-slate-5 w-full p-2 rounded border border-slate-200">
                      <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden shrink-0 bg-white flex items-center justify-center p-0.5">
                        <img 
                          src={tempLogo || settings.platformLogo || 'https://via.placeholder.com/150'} 
                          alt="Platform Logo Preview" 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          id="adminLogoUpload"
                          className="hidden"
                        />
                        <label
                          htmlFor="adminLogoUpload"
                          className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-bold hover:bg-slate-100 transition-all"
                        >
                          <Upload className="w-3 h-3" />
                          Upload file
                        </label>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">Accepts standard images.</p>
                      </div>
                    </div>
                  </div>

                  {/* BANNER */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Hero Welcome Banner</label>
                    <div className="flex items-center gap-3 bg-slate-5 w-full p-2 rounded border border-slate-200">
                      <div className="w-14 h-10 rounded border border-slate-200 overflow-hidden shrink-0 bg-white">
                        <img 
                          src={tempBanner || settings.platformBanner || 'https://via.placeholder.com/150'} 
                          alt="Platform Banner Preview" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          id="adminBannerUpload"
                          className="hidden"
                        />
                        <label
                          htmlFor="adminBannerUpload"
                          className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-bold hover:bg-slate-100 transition-all"
                        >
                          <Upload className="w-3 h-3" />
                          Upload file
                        </label>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">Best ratio: 3:1 landscape.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div className="pt-3 border-t border-slate-150 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-xs tracking-wider uppercase transition-all shadow-xs cursor-pointer"
                >
                  Save Configurations
                </button>
              </div>
            </form>

            <div className="bg-white p-3 border border-slate-200 rounded mt-6">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Administrator Account Settings</h3>
              <p className="text-[11px] text-slate-500">Update your administrator personal contact profile phone number and credential passwords.</p>
            </div>

            <form onSubmit={handleSaveAdminProfile} className="bg-white p-4 rounded border border-slate-200 shadow-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Administrator Identity Name</label>
                  <input
                    type="text"
                    value={adminNameEdit}
                    onChange={(e) => setAdminNameEdit(e.target.value)}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-slate-550"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Contact Phone Number</label>
                  <input
                    type="text"
                    value={adminPhoneEdit}
                    onChange={(e) => setAdminPhoneEdit(e.target.value)}
                    placeholder="e.g. +1234567890"
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-550"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Country of Residence</label>
                  <input
                    type="text"
                    value={adminCountryOfResidenceEdit}
                    onChange={(e) => setAdminCountryOfResidenceEdit(e.target.value)}
                    placeholder="e.g. United States, Canada, Australia"
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-550"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Change Account Password</label>
                <input
                  type="password"
                  value={adminPasswordEdit}
                  onChange={(e) => setAdminPasswordEdit(e.target.value)}
                  placeholder="Enter new password to update security lock"
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-550"
                />
              </div>

              {/* SAVE BUTTON */}
              <div className="pt-3 border-t border-slate-150 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-xs transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Save Admin Profile
                </button>
              </div>
            </form>
          </div>
        )}

        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {isMobile && (
        <div id="pdd-admin-bottom-nav" className="fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-slate-200 shadow-md z-50 flex justify-around items-center px-2 md:hidden">
          {/* Home Icon */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex flex-col items-center justify-center w-[60px] h-[48px] rounded cursor-pointer transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <Home className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-[#ff6600]' : 'text-slate-400'}`} />
            <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${activeTab === 'dashboard' ? 'text-[#ff6600]' : 'text-slate-500'}`}>
              Home
            </span>
          </button>

          {/* Sellers Icon (Sellers Store Management list) */}
          <button
            onClick={() => setActiveTab('sellers')}
            className="flex flex-col items-center justify-center w-[60px] h-[48px] rounded cursor-pointer transition-colors relative"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <StoreIcon className={`w-5 h-5 ${activeTab === 'sellers' ? 'text-[#ff6600]' : 'text-slate-400'}`} />
            {stores.filter(s => !s.isApproved).length > 0 && (
              <span className="absolute top-[3px] right-[8px] bg-red-600 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full shadow-xs leading-none">
                {stores.filter(s => !s.isApproved).length}
              </span>
            )}
            <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${activeTab === 'sellers' ? 'text-[#ff6600]' : 'text-slate-500'}`}>
              Sellers
            </span>
          </button>

          {/* Catalog Selection List */}
          <button
            onClick={() => setActiveTab('products')}
            className="flex flex-col items-center justify-center w-[60px] h-[48px] rounded cursor-pointer transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <ShoppingBag className={`w-5 h-5 ${activeTab === 'products' ? 'text-[#ff6600]' : 'text-slate-400'}`} />
            <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${activeTab === 'products' ? 'text-[#ff6600]' : 'text-slate-500'}`}>
              Products
            </span>
          </button>

          {/* Lucky Draw Tab Selector */}
          <button
            onClick={() => setActiveTab('lucky_draw')}
            className="flex flex-col items-center justify-center w-[60px] h-[48px] rounded cursor-pointer transition-colors relative"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <Ticket className={`w-5 h-5 ${activeTab === 'lucky_draw' ? 'text-[#ff6600]' : 'text-slate-400'}`} />
            {pointsPurchases.some(p => p.status === 'pending') && (
              <span className="absolute top-[3px] right-[8px] bg-red-650 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full shadow-xs leading-none">
                {pointsPurchases.filter(p => p.status === 'pending').length}
              </span>
            )}
            <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${activeTab === 'lucky_draw' ? 'text-[#ff6600]' : 'text-slate-500'}`}>
              L. Draw
            </span>
          </button>

          {/* Profile Tab Selector (Platform settings tab) */}
          <button
            onClick={() => setActiveTab('settings')}
            className="flex flex-col items-center justify-center w-[60px] h-[48px] rounded cursor-pointer transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <UserIcon className={`w-5 h-5 ${activeTab === 'settings' ? 'text-[#ff6600]' : 'text-slate-400'}`} />
            <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${activeTab === 'settings' ? 'text-[#ff6600]' : 'text-slate-500'}`}>
              Profile
            </span>
          </button>
        </div>
      )}

      {/* FULL SCREEN PAYMENT RECEIPT LIGHTBOX MODAL */}
      {previewReceiptImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-xs font-sans">
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
              Close
            </button>
            <button
              onClick={() => setPreviewReceiptImage(null)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer font-bold uppercase text-[10px]"
            >
              ✕ Close
            </button>
          </div>
          
          <div className="max-w-3xl max-h-[85vh] overflow-auto flex items-center justify-center border border-white/10 rounded-lg p-1 bg-white/5 shadow-2xl">
            <img 
              src={previewReceiptImage} 
              alt="Uploaded Payment Receipt" 
              className="max-w-full max-h-[80vh] object-contain rounded-md"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-white/40 text-[10px] mt-4 font-semibold uppercase tracking-wider">
            Displaying Customer Payment Screenshot
          </p>
        </div>
      )}

      {/* PROCESSING WITHDRAWAL ADMIN RECEIPT UPLOAD MODAL */}
      {processingWithdrawal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[8.5px] font-black tracking-widest text-[#ff6600] uppercase block">Liberia Payout Desk</span>
                <h3 className="text-xs font-black uppercase tracking-wide">File Money Transfer Proof</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProcessingWithdrawal(null);
                  setWithdrawalReceipt(null);
                }}
                className="text-slate-450 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1 text-slate-700">
                <p className="font-extrabold text-slate-950 uppercase text-[9px] text-[#74879b]">Settle Claim Target Details</p>
                <div className="grid grid-cols-3 gap-y-0.5 font-semibold text-[11px] mt-1.5 text-slate-800">
                  <span className="text-slate-400">Store:</span>
                  <span className="col-span-2 font-extrabold text-slate-900">{processingWithdrawal.storeName}</span>

                  <span className="text-slate-400">Vendor ID:</span>
                  <span className="col-span-2 font-mono text-slate-505">{processingWithdrawal.sellerId}</span>

                  <span className="text-slate-400">Method:</span>
                  <span className="col-span-2 text-orange-650 font-extrabold">{processingWithdrawal.paymentMethod}</span>

                  <span className="text-slate-400">Coordinates:</span>
                  <span className="col-span-2 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-150 leading-relaxed max-h-20 overflow-y-auto block whitespace-pre-wrap">{processingWithdrawal.accountDetails}</span>

                  <span className="text-slate-400">Total Claim:</span>
                  <span className="col-span-2 text-red-655 font-black text-xs">LRD {processingWithdrawal.amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9.5px] font-black text-slate-500 uppercase tracking-wide flex items-center justify-between">
                  <span>Transfer Receipt Image *</span>
                  <span className="text-[8px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black uppercase">Mandatory</span>
                </label>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-slate-350 rounded-lg p-5 bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer relative group">
                  {withdrawalReceipt ? (
                    <div className="space-y-2.5 w-full flex flex-col items-center">
                      <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-slate-300 shadow bg-white">
                        <img src={withdrawalReceipt} alt="Transfer proof" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setWithdrawalReceipt(null)}
                          className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold"
                        >
                          Change Receipt
                        </button>
                      </div>
                      <p className="text-[10px] text-emerald-650 font-bold">✓ Payout receipt snapshot attached!</p>
                    </div>
                  ) : (
                    <label className="w-full h-full p-2 text-center cursor-pointer flex flex-col items-center justify-center">
                      <Upload className="w-8 h-8 text-slate-405 mb-1.5 group-hover:scale-110 transition-transform" />
                      <p className="font-extrabold text-[10px] text-[#ff6600] uppercase tracking-wide">Attach Payout Proof Screenshot</p>
                      <p className="text-[8.5px] text-slate-404 font-semibold mt-0.5">Drag-and-drop or click to browse files</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingReceipt(true);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setWithdrawalReceipt(reader.result as string);
                            setIsUploadingReceipt(false);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 bg-slate-50 p-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setProcessingWithdrawal(null);
                  setWithdrawalReceipt(null);
                }}
                className="px-3.5 py-1.5 text-[10px] font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded uppercase transition-colors text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!withdrawalReceipt || isUploadingReceipt}
                onClick={async () => {
                  if (!processingWithdrawal || !withdrawalReceipt) return;
                  
                  showToast('Uploading receipt proof straight to backend...', 'info');
                  try {
                    const uploadId = `payout-receipt-${Date.now()}`;
                    const finalReceiptUrl = await uploadImageToStorage(`receipts/${uploadId}`, withdrawalReceipt);
                    await handleCompleteWithdrawal(processingWithdrawal, finalReceiptUrl);
                  } catch (err: any) {
                    showToast('Failed to upload payout proof receipt: ' + err.message, 'error');
                  }
                }}
                className={`px-4 py-1.5 text-[10px] font-black uppercase text-slate-950 rounded shadow transition ${
                  withdrawalReceipt && !isUploadingReceipt
                    ? 'bg-emerald-500 hover:bg-emerald-600 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isUploadingReceipt ? 'Attaching proof...' : 'Release & Deduct Balance'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
