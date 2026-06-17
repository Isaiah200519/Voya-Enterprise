import React, { useState, useEffect } from 'react';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { User, Store, Product, Order, OrderStatus, SellerNotification, PlatformSettings, WithdrawalRequest, SellerPaymentRequest } from '../types';
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
  uploadImageToStorage,
  deleteImageFromStorage,
  dbGetNotifications,
  dbSaveNotification,
  dbGetPlatformSettings,
  db,
  dbGetWithdrawalRequests,
  dbSaveWithdrawalRequest,
  dbGetSellerPaymentRequests,
  dbSaveSellerPaymentRequest
} from '../utils/firebase';
import VoyaLogo from './VoyaLogo';
import { 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Upload, 
  LogOut, 
  Store as StoreIcon, 
  X, 
  Check, 
  ChevronRight, 
  MapPin, 
  Image as ImageIcon,
  Home,
  User as UserIcon,
  Eye,
  Bell,
  Copy,
  Share2
} from 'lucide-react';

interface SellerPanelProps {
  currentUser: User;
  onLogout: () => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
  setCurrentUser?: (user: User) => void;
}

type TabType = 'dashboard' | 'products' | 'orders' | 'settings' | 'notifications';

export default function SellerPanel({ currentUser, onLogout, showToast, setCurrentUser }: SellerPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
  
  // Seller user profile states
  const [sellerNameEdit, setSellerNameEdit] = useState(currentUser.name || '');
  const [sellerPhoneEdit, setSellerPhoneEdit] = useState(currentUser.phoneNumber || '');
  const [sellerCountryOfResidenceEdit, setSellerCountryOfResidenceEdit] = useState(currentUser.countryOfResidence || '');
  const [sellerPasswordEdit, setSellerPasswordEdit] = useState('');

  // Keep synced if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setSellerNameEdit(currentUser.name || '');
      setSellerPhoneEdit(currentUser.phoneNumber || '');
      setSellerCountryOfResidenceEdit(currentUser.countryOfResidence || '');
    }
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Core Store & Products States
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [previewReceiptImage, setPreviewReceiptImage] = useState<string | null>(null);

  // Product Add / Edit form states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentProductId, setCurrentProductId] = useState<string>('');
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodOriginalPrice, setProdOriginalPrice] = useState('');
  const [prodDesiredProfit, setProdDesiredProfit] = useState('');
  const [prodSizes, setProdSizes] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodCategory, setProdCategory] = useState('Electronics');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImages, setProdImages] = useState<string[]>([]); // Array of base64 preview strings

  // Sub tab for products: 'my_products' (approved/rejected) or 'pending_submissions' (under review)
  const [sellerProductTab, setSellerProductTab] = useState<'my_products' | 'pending_submissions'>('my_products');

  // Store Setting forms
  const [storeNameEdit, setStoreNameEdit] = useState('');
  const [payoutEmailEdit, setPayoutEmailEdit] = useState('');
  const [storeDescEdit, setStoreDescEdit] = useState('');
  const [tempLogo, setTempLogo] = useState<string | null>(null);
  const [tempBanner, setTempBanner] = useState<string | null>(null);

  // States for withdrawal requests and seller payment requests
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [sellerPaymentRequests, setSellerPaymentRequests] = useState<SellerPaymentRequest[]>([]);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Orange Mobile Money');
  const [withdrawAccountDetails, setWithdrawAccountDetails] = useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  const [isSellerRequestPaymentOpen, setIsSellerRequestPaymentOpen] = useState(false);
  const [requestedSellerMethodName, setRequestedSellerMethodName] = useState('');
  const [requestedSellerMethodDetails, setRequestedSellerMethodDetails] = useState('');
  const [isSubmittingSellerMethodRequest, setIsSubmittingSellerMethodRequest] = useState(false);

  const categories = [
    'Electronics',
    'Apparel & Fashion',
    'Home & Kitchen',
    'Beauty & Personal Care',
    'Automotive',
    'Toys & Hobbies'
  ];

  const loadSellerData = async () => {
    try {
      const allStores = await dbGetStores();
      const allProducts = await dbGetProducts();
      const allOrders = await dbGetOrders();
      const loadedSettings = await dbGetPlatformSettings() || { commissionRate: 15 } as PlatformSettings;
      setPlatformSettings(loadedSettings);

      const allWithdrawals = await dbGetWithdrawalRequests();
      setWithdrawalRequests(allWithdrawals.filter(w => w.sellerId === currentUser.userId));

      const allSellerPayReqs = await dbGetSellerPaymentRequests();
      setSellerPaymentRequests(allSellerPayReqs.filter(spr => spr.sellerId === currentUser.userId));

      // Locate this seller's store by storeId or sellerId matching current user
      const matchedStore = allStores.find(s => s.storeId === currentUser.storeId || s.sellerId === currentUser.userId);
      if (matchedStore) {
        setStore(matchedStore);
        setStoreNameEdit(matchedStore.storeName);
        setPayoutEmailEdit(matchedStore.payoutEmail);
        setStoreDescEdit(matchedStore.description);
        
        // Filter products belonging to this store
        const storeProducts = allProducts.filter(p => p.storeId === matchedStore.storeId);
        setProducts(storeProducts);

        // Filter orders containing this store's items
        const storeOrders = allOrders.filter(o => o.storeId === matchedStore.storeId);
        setOrders(storeOrders);
      } else {
        setProducts([]);
        setOrders([]);
      }
    } catch (e) {
      console.warn("Seller dashboard data load failed on Firestore, falling back to LocalStorage indices...", e);
      const allStores = getLocalStorageData<Store[]>('voya_stores', []);
      const allProducts = getLocalStorageData<Product[]>('voya_products', []);
      const allOrders = getLocalStorageData<Order[]>('voya_orders', []);
      const loadedSettings = getLocalStorageData<PlatformSettings>('voya_platform_settings', { commissionRate: 15 } as PlatformSettings);
      setPlatformSettings(loadedSettings);

      const allWithdrawals = getLocalStorageData<WithdrawalRequest[]>('voya_withdrawal_requests', []);
      setWithdrawalRequests(allWithdrawals.filter(w => w.sellerId === currentUser.userId));

      const allSellerPayReqs = getLocalStorageData<SellerPaymentRequest[]>('voya_seller_payment_requests', []);
      setSellerPaymentRequests(allSellerPayReqs.filter(spr => spr.sellerId === currentUser.userId));

      const matchedStore = allStores.find(s => s.storeId === currentUser.storeId || s.sellerId === currentUser.userId);
      if (matchedStore) {
        setStore(matchedStore);
        setStoreNameEdit(matchedStore.storeName);
        setPayoutEmailEdit(matchedStore.payoutEmail);
        setStoreDescEdit(matchedStore.description);
        
        const storeProducts = allProducts.filter(p => p.storeId === matchedStore.storeId);
        setProducts(storeProducts);

        const storeOrders = allOrders.filter(o => o.storeId === matchedStore.storeId);
        setOrders(storeOrders);
      } else {
        setProducts([]);
        setOrders([]);
      }
    }
  };

  useEffect(() => {
    loadSellerData();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to real-time notification streams for this vendor
    const q = query(
      collection(db, 'notifications'),
      where('sellerId', '==', currentUser.userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: SellerNotification[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as SellerNotification);
      });
      // Sort descending by date
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(list);

      // Trigger hot alert toast for fresh arriving approvals/rejections from the admin
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const fresh = change.doc.data() as SellerNotification;
          // Only show alert toast if it's extremely fresh (less than 20 seconds old) to avoid back-history flood on load
          const age = Date.now() - new Date(fresh.createdAt).getTime();
          if (age < 20000) {
            showToast(`🔔 Voya Audit: ${fresh.message}`, fresh.type === 'approval' ? 'success' : 'error');
          }
        }
      });
    }, (error) => {
      console.warn("Real-time notifications listener failed:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Automatically mark notifications as read when entering the notifications tab
  useEffect(() => {
    if (activeTab === 'notifications' && notifications.length > 0) {
      const unreadNotifs = notifications.filter(n => !n.read);
      if (unreadNotifs.length > 0) {
        unreadNotifs.forEach(async (notif) => {
          try {
            await dbSaveNotification({
              ...notif,
              read: true
            });
          } catch (e) {
            console.error("Failed to mark notification as read:", e);
          }
        });
      }
    }
  }, [activeTab, notifications]);

  // Sync utilities
  const syncProducts = async (newAllProducts: Product[]) => {
    await loadSellerData();
  };

  const syncOrders = async (newAllOrders: Order[]) => {
    await loadSellerData();
  };

  // DASHBOARD CALCULATIONS
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((r, o) => r + o.total, 0);

  const currentCommissionRate = platformSettings?.commissionRate ?? 15;
  const totalCommission = (totalRevenue * currentCommissionRate) / 100;
  const netIncome = totalRevenue - totalCommission;

  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;

  // Group last 6 months of metrics for dynamic vector SVG graph
  const getMonthlyEarnings = () => {
    const list = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const monthVal = d.getMonth();

      const monthOrders = orders.filter(o => {
        if (o.status === 'cancelled') return false;
        const oDate = new Date(o.createdAt);
        return oDate.getMonth() === monthVal && oDate.getFullYear() === year;
      });

      const gross = monthOrders.reduce((sum, o) => sum + o.total, 0);
      const fee = (gross * currentCommissionRate) / 100;
      const net = gross - fee;

      list.push({ label, gross, fee, net });
    }
    return list;
  };

  const monthlyHistory = getMonthlyEarnings();
  const maxGrossInChart = Math.max(...monthlyHistory.map(h => h.gross), 1);

  // PRODUCT CREATE OR UPDATE HANDLERS
  const openAddModal = () => {
    const newId = `prod-${Date.now()}`;
    setCurrentProductId(newId);
    setEditingProduct(null);
    setProdName('');
    setProdPrice('');
    setProdOriginalPrice('');
    setProdDesiredProfit('');
    setProdSizes('');
    setProdStock('');
    setProdCategory('Electronics');
    setProdDesc('');
    setProdImages([]);
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setCurrentProductId(p.productId);
    setEditingProduct(p);
    setProdName(p.name);
    setProdPrice(p.price.toString());
    setProdOriginalPrice(p.originalPrice?.toString() || p.price.toString());
    setProdDesiredProfit(p.desiredProfit?.toString() || '0');
    setProdSizes(p.sizes ? p.sizes.join(', ') : '');
    setProdStock(p.stock.toString());
    setProdCategory(p.category);
    setProdDesc(p.description);
    setProdImages(p.images || []);
    setIsProductModalOpen(true);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const pId = currentProductId || `prod-${Date.now()}`;
    if (!currentProductId) {
      setCurrentProductId(pId);
    }

    const maxImages = editingProduct ? 3 : 1;
    const remainingSlots = maxImages - prodImages.length;
    if (remainingSlots <= 0) {
      showToast(editingProduct ? 'Maximum of 3 photos allowed per product.' : 'Maximum of 1 photo allowed for new listings.', 'error');
      return;
    }

    const filesToLoad = Array.from(files).slice(0, remainingSlots) as File[];
    showToast(`Uploading ${filesToLoad.length} image(s) directly to storage...`, 'info');

    for (const file of filesToLoad) {
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
        });
        reader.readAsDataURL(file);
        const base64Data = await base64Promise;

        const uploadedUrl = await uploadImageToStorage(
          `products/${pId}/img_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          base64Data
        );

        setProdImages(prev => {
          const nextImages = [...prev, uploadedUrl];

          if (editingProduct) {
            const updatedProduct: Product = {
              ...editingProduct,
              images: nextImages
            };
            dbSaveProduct(updatedProduct).then(() => {
              showToast('Product images updated in database snapshot.', 'success');
            }).catch(err => {
              console.error(err);
              showToast('Failed to update database snapshot.', 'error');
            });
          }

          return nextImages;
        });
      } catch (err) {
        console.error(err);
        showToast('Failed to upload/compress catalog image.', 'error');
      }
    }
  };

  const handleRemoveStagedImage = async (indexToRemove: number) => {
    const imgToRemove = prodImages[indexToRemove];
    const nextImages = prodImages.filter((_, idx) => idx !== indexToRemove);
    setProdImages(nextImages);

    if (imgToRemove && imgToRemove.includes('firebasestorage')) {
      try {
        await deleteImageFromStorage(imgToRemove);
      } catch (e) {
        console.warn('Physical storage removal skipped:', e);
      }
    }

    if (editingProduct) {
      try {
        const updatedProduct: Product = {
          ...editingProduct,
          images: nextImages
        };
        await dbSaveProduct(updatedProduct);
        showToast('Image removed from database snapshot.', 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to sync removal to database.', 'error');
      }
    } else {
      showToast('Image removed from staging.', 'info');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prodName || !prodOriginalPrice || !prodDesiredProfit || !prodStock || !prodDesc) {
      showToast('Please fill out all required product information fields.', 'error');
      return;
    }

    const originalPriceNum = parseFloat(prodOriginalPrice);
    const desiredProfitNum = parseFloat(prodDesiredProfit);
    const stockNum = parseInt(prodStock);

    if (isNaN(originalPriceNum) || originalPriceNum <= 0) {
      showToast('Original price must be a valid positive number.', 'error');
      return;
    }

    if (isNaN(desiredProfitNum) || desiredProfitNum < 0) {
      showToast('Desired profit must be a non-negative number.', 'error');
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      showToast('Stock must be a valid non-negative integer.', 'error');
      return;
    }

    if (prodImages.length === 0) {
      showToast('Please upload at least one product thumbnail image.', 'error');
      return;
    }

    const maxImgCount = editingProduct ? 3 : 1;
    if (prodImages.length > maxImgCount) {
      showToast(editingProduct ? 'Maximum of 3 images are allowed.' : 'Only 1 product image is allowed for new listings.', 'error');
      return;
    }

    const sizesArray = prodSizes
      ? prodSizes.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const calculatedFinalPrice = originalPriceNum + desiredProfitNum;
    const pId = editingProduct ? editingProduct.productId : `prod-${Date.now()}`;

    try {
      // Upload any new base64 staged images to Firebase Storage
      const finalImageUrls: string[] = [];
      for (let i = 0; i < prodImages.length; i++) {
        const img = prodImages[i];
        if (img.startsWith('data:image')) {
          showToast(`Uploading catalog media file ${i + 1} to storage...`, 'info');
          const uploadedUrl = await uploadImageToStorage(`products/${pId}/img_${i}_${Date.now()}`, img);
          finalImageUrls.push(uploadedUrl);
        } else {
          finalImageUrls.push(img);
        }
      }

      const activeStoreId = store ? store.storeId : (currentUser.storeId || 'store-1');

      if (editingProduct) {
        // Once reviewed, a product cannot be edited by the seller
        if (editingProduct.status && editingProduct.status !== 'pending_approval') {
          showToast('This product has already been reviewed by the admin and cannot be edited.', 'error');
          return;
        }

        const updated: Product = {
          ...editingProduct,
          name: prodName,
          price: calculatedFinalPrice,
          stock: stockNum,
          category: prodCategory,
          description: prodDesc,
          images: finalImageUrls,
          status: 'pending_approval' as const,
          originalPrice: originalPriceNum,
          desiredProfit: desiredProfitNum,
          finalPrice: calculatedFinalPrice,
          sizes: sizesArray,
          weight: null, // resets for re-approval
        };

        await dbSaveProduct(updated);
        showToast(`Product "${prodName}" submitted for approval.`, 'success');
      } else {
        // Add new product
        const newProduct: Product = {
          productId: pId,
          storeId: activeStoreId,
          name: prodName,
          price: calculatedFinalPrice,
          stock: stockNum,
          description: prodDesc,
          images: finalImageUrls,
          category: prodCategory,
          createdAt: new Date().toISOString(),
          status: 'pending_approval',
          originalPrice: originalPriceNum,
          desiredProfit: desiredProfitNum,
          finalPrice: calculatedFinalPrice,
          sizes: sizesArray,
          weight: null,
          sellerId: currentUser.userId,
        };

        await dbSaveProduct(newProduct);
        showToast(`Product "${prodName}" submitted for review successfully!`, 'success');
      }

      await loadSellerData();
      setIsProductModalOpen(false);
    } catch (err) {
      console.error("Failed to commit final product status to Firestore", err);
      showToast("Verification check occurred an error logging media files.", "error");
    }
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete product "${name}" from your catalog?`)) {
      try {
        await dbDeleteProduct(productId);
        showToast('Product removed from active catalog.', 'success');
        await loadSellerData();
      } catch (err) {
        console.error("Failed to delete product from Firestore", err);
        showToast("Deletion clearance rejected by rules check.", "error");
      }
    }
  };

  // ORDER OPERATIONS BY VENDOR - AUDITED & LOCKED FOR MERCHANTS
  const handleUpdateStatus = async (orderId: string, itemStoreId: string, status: OrderStatus) => {
    showToast("Merchant authority restricted. Delivery status can only be updated by the main Voya administrator.", "error");
    return;
  };

  // VENDOR STORE LOGO / BANNER DYNAMIC EDITORS
  const handleStoreLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store) return;

    showToast('Uploading brand logo straight to storage...', 'info');
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const uploadedUrl = await uploadImageToStorage(`stores/${store.storeId}/logo`, base64);
      setTempLogo(uploadedUrl);

      // Save straight to database on snapshot
      const updatedStore: Store = {
        ...store,
        logo: uploadedUrl
      };
      await dbSaveStore(updatedStore);
      setStore(updatedStore);
      showToast('Brand logo uploaded and saved to DB.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to upload logo directly.', 'error');
    }
  };

  const handleStoreBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store) return;

    showToast('Uploading brand banner straight to storage...', 'info');
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const uploadedUrl = await uploadImageToStorage(`stores/${store.storeId}/banner`, base64);
      setTempBanner(uploadedUrl);

      // Save straight to database on snapshot
      const updatedStore: Store = {
        ...store,
        banner: uploadedUrl
      };
      await dbSaveStore(updatedStore);
      setStore(updatedStore);
      showToast('Brand banner uploaded and saved to DB.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to upload banner directly.', 'error');
    }
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    try {
      let finalLogoUrl = store.logo;
      if (tempLogo && tempLogo.startsWith('data:image')) {
        showToast('Uploading store logo to Firebase bucket...', 'info');
        finalLogoUrl = await uploadImageToStorage(`stores/${store.storeId}/logo`, tempLogo);
        setTempLogo(null);
      }

      let finalBannerUrl = store.banner;
      if (tempBanner && tempBanner.startsWith('data:image')) {
        showToast('Uploading store banner to Firebase bucket...', 'info');
        finalBannerUrl = await uploadImageToStorage(`stores/${store.storeId}/banner`, tempBanner);
        setTempBanner(null);
      }

      const updatedStore: Store = {
        ...store,
        storeName: storeNameEdit,
        payoutEmail: payoutEmailEdit,
        description: storeDescEdit,
        logo: finalLogoUrl,
        banner: finalBannerUrl,
      };

      await dbSaveStore(updatedStore);
      setStore(updatedStore);
      
      showToast('Store customizations saved successfully.', 'success');
      await loadSellerData();
    } catch (err) {
      console.error(err);
      showToast('Failed to save store adjustments.', 'error');
    }
  };

  const handleSaveSellerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (sellerPasswordEdit && sellerPasswordEdit.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    try {
      const updated: User = {
        ...currentUser,
        name: sellerNameEdit,
        phoneNumber: sellerPhoneEdit,
        countryOfResidence: sellerCountryOfResidenceEdit || undefined,
      };
      
      if (sellerPasswordEdit) {
        updated.password = sellerPasswordEdit;
      }

      await dbSaveUser(updated);

      localStorage.setItem('voya_active_session', JSON.stringify(updated));
      if (setCurrentUser) {
        setCurrentUser(updated);
      }

      setSellerPasswordEdit('');
      showToast('Your Vendor personal profile details have been secured!', 'success');
      await loadSellerData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update seller profile credentials.', 'error');
    }
  };

  // Dynamic profit calculations and available balance mapping
  const totalEarnedProfit = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, order) => {
      const orderItemsProfit = order.items.reduce((itemSum, item) => {
        const p = products.find(prod => prod.productId === item.productId);
        const profitPerUnit = p ? (p.desiredProfit ?? 0) : 0;
        return itemSum + (profitPerUnit * item.quantity);
      }, 0);
      return sum + orderItemsProfit;
    }, 0);

  const withdrawnSum = withdrawalRequests
    .filter(req => req.status === 'approved' || req.status === 'pending')
    .reduce((sum, req) => sum + req.amount, 0);

  const availableBalance = Math.max(0, totalEarnedProfit - withdrawnSum);

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please specify a positive withdrawal amount.', 'error');
      return;
    }

    if (amountNum < 1500) {
      showToast('Minimum withdrawal amount is 1500 LRD.', 'error');
      return;
    }

    if (amountNum > availableBalance) {
      showToast(`Insufficient balance. Maximum available for withdrawal is LRD ${availableBalance.toFixed(2)}.`, 'error');
      return;
    }

    if (!withdrawAccountDetails.trim()) {
      showToast('Please enter your settlement account coordinates (sender wallet mobile number or name).', 'error');
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      const newWithdrawal: WithdrawalRequest = {
        id: 'wr_' + Math.random().toString(36).substring(2, 11),
        sellerId: currentUser.userId,
        storeId: store?.storeId || 'N/A',
        storeName: store?.storeName || currentUser.name,
        amount: amountNum,
        paymentMethod: withdrawMethod,
        accountDetails: withdrawAccountDetails,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await dbSaveWithdrawalRequest(newWithdrawal);

      // Create local push alert for real-time tracking
      const notif: SellerNotification = {
        id: 'notif_' + Math.random().toString(36).substring(2, 11),
        sellerId: currentUser.userId,
        productName: `Withdrawal Pending`,
        type: 'withdrawal',
        message: `Your withdrawal request of LRD ${amountNum.toFixed(2)} using ${withdrawMethod} was successfully filed. It is pending administrative transfer.`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      await dbSaveNotification(notif);

      showToast(`Withdrawal proposal of LRD ${amountNum.toFixed(2)} submitted successfully! Our Liberia finance desk will clear it shortly.`, 'success');

      setIsWithdrawalModalOpen(false);
      setWithdrawAmount('');
      setWithdrawAccountDetails('');
      await loadSellerData();
    } catch (err: any) {
      console.error(err);
      showToast(`Withdrawal failure: ${err.message}`, 'error');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const handleSellerPaymentRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedSellerMethodName.trim()) {
      showToast('Please declare the payment method you want linked.', 'error');
      return;
    }

    setIsSubmittingSellerMethodRequest(true);
    try {
      const newRequest: SellerPaymentRequest = {
        id: 'spmr_' + Math.random().toString(36).substring(2, 11),
        sellerId: currentUser.userId,
        storeId: store?.storeId || 'N/A',
        storeName: store?.storeName || currentUser.name,
        sellerEmail: currentUser.email,
        requestedMethod: requestedSellerMethodName,
        details: requestedSellerMethodDetails,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await dbSaveSellerPaymentRequest(newRequest);
      showToast(`Thank you! Request to add "${requestedSellerMethodName}" payout gateway has been filed. Wise or Liberian Mobile Settle desk will match this.`, 'success');

      setIsSellerRequestPaymentOpen(false);
      setRequestedSellerMethodName('');
      setRequestedSellerMethodDetails('');
      await loadSellerData();
    } catch (err: any) {
      console.error(err);
      showToast(`Payout request error: ${err.message}`, 'error');
    } finally {
      setIsSubmittingSellerMethodRequest(false);
    }
  };

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col md:flex-row ${isMobile ? 'pb-[60px]' : ''}`}>
      {/* MOBILE TOP NAVIGATION BRANDING */}
      {isMobile && (
        <header className="sticky top-0 bg-white border-b border-slate-200 p-2.5 z-40 shadow-xs flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <VoyaLogo light={true} className="scale-75 md:scale-90" />
            <div className="border-l border-slate-200 pl-2 ml-1 min-w-0">
              <h1 className="font-bold text-xs leading-none text-slate-800 truncate max-w-[120px]">{store?.storeName || 'Boutique Shop'}</h1>
              <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider block mt-0.5">Seller Portal</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-2.5 py-1.5 bg-rose-50 text-rose-600 text-[11px] font-bold border border-rose-250 rounded cursor-pointer hover:bg-rose-100"
          >
            Log Out
          </button>
        </header>
      )}

      {/* SELLER ASIDE HEADER */}
      <aside className="w-56 bg-slate-900 text-slate-100 hidden md:flex flex-col shrink-0 border-r border-slate-850">
        <div className="p-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <VoyaLogo light={false} className="scale-75 md:scale-90" />
            <div className="border-l border-slate-800 pl-2 ml-1 min-w-0">
              <h1 className="font-bold text-[11px] leading-none text-slate-100 truncate">{store?.storeName || 'Boutique Shop'}</h1>
              <span className="text-[8px] text-blue-400 font-bold uppercase tracking-wider block mt-0.5">Seller Portal</span>
            </div>
          </div>
        </div>

        {/* LOGGED IN USER */}
        <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border border-slate-700 overflow-hidden shrink-0">
              <img src={currentUser.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`} alt="Vendor profile" className="w-full h-full object-cover" />
            </div>
            <div className="truncate">
              <p className="text-[11px] font-bold truncate leading-none">{currentUser.name}</p>
              <p className="text-[9px] text-slate-400 font-mono truncate">{currentUser.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-slate-800 text-white border-l-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Dashboard Summary
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products' ? 'bg-slate-800 text-white border-l-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Manage Products
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-slate-800 text-white border-l-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Order Dispatch
            {pendingOrdersCount > 0 && (
              <span className="ml-auto bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded leading-none">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings' ? 'bg-slate-800 text-white border-l-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Store Settings
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'notifications' ? 'bg-slate-800 text-white border-l-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Audit Notifications
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="ml-auto bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded leading-none">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        </nav>

        <div className="p-2 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full text-center py-1.5 bg-slate-850 hover:bg-rose-950/40 text-rose-400 hover:text-slate-100 rounded text-[11px] font-bold border border-slate-800 cursor-pointer"
          >
            Log Out Portal
          </button>
        </div>
      </aside>

      {/* RENDER ACTIVE TAB */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              {/* TAB 1: WORKFLOW METRICS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* STOREFRONT BROADCAST HUB */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white p-4 rounded-lg border border-slate-800 shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-48 h-48 rounded-full bg-slate-850/10" />
              <div className="absolute bottom-0 right-0 transform translate-x-16 translate-y-16 w-36 h-36 rounded-full bg-amber-400/5" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded">Merchant Live</span>
                    <span className="text-slate-400 text-[10px] font-bold font-mono">ID: {store?.storeId || 'N/A'}</span>
                  </div>
                  <h2 className="text-sm font-black uppercase text-white mt-1.5">{store?.storeName || 'Your Boutique'} - Performance Dashboard</h2>
                  <p className="text-[11.5px] text-slate-300 font-sans mt-0.5 max-w-xl">
                    Welcome to your digitized seller cockpit. Below are your audited trade summaries, platform fees, and net payouts synchronized with the Voya central database.
                  </p>
                </div>
                
                <div className="text-left md:text-right shrink-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Linked Payout Address</span>
                  <p className="text-xs font-bold font-mono text-amber-400 mt-0.5">{store?.payoutEmail || 'No payout address mapped'}</p>
                </div>
              </div>
            </div>

            {/* PLATFORM BILLING & MERCHANDISE STATS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* gross revenue */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Gross Revenue</span>
                  <p className="text-base font-black text-slate-900 mt-1">${totalRevenue.toFixed(2)}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Customer checkout value</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>

              {/* platform fee deduction */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Voya Commission</span>
                  <p className="text-base font-black text-orange-655 mt-1">-${totalCommission.toFixed(2)}</p>
                  <p className="text-[9px] text-orange-600 mt-0.5 font-semibold">({currentCommissionRate}% system rate fee)</p>
                </div>
                <div className="p-2 bg-orange-50 text-orange-600 rounded">
                  <span className="text-xs font-black">%</span>
                </div>
              </div>

              {/* net payout */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs ring-1 ring-emerald-500/30">
                <div>
                  <span className="text-[9.5px] font-bold text-emerald-600 uppercase tracking-wider block">Net Income</span>
                  <p className="text-base font-black text-emerald-650 mt-1">${netIncome.toFixed(2)}</p>
                  <p className="text-[9px] text-emerald-605 mt-0.5 font-bold font-sans">Payout total earned</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded animate-pulse">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              {/* listed catalog items */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Approved Catalog</span>
                  <p className="text-base font-black text-slate-800 mt-1">{products.filter(p => p.status === 'approved').length} SKUs</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Active storefront listings</p>
                </div>
                <div className="p-2 bg-slate-50 text-slate-600 rounded">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>

              {/* pending listings */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Pending Review</span>
                  <p className="text-base font-black text-amber-700 mt-1">{products.filter(p => p.status === 'pending_approval').length} items</p>
                  <p className="text-[9px] text-amber-600 mt-0.5 font-medium">Awaiting admin action</p>
                </div>
                <div className="p-2 bg-amber-50 text-amber-700 rounded">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* CASH OUT OUTLET & ACTUAL PROFITS COMPLIANCE ROW */}
            <div className="bg-slate-900 text-white rounded-lg p-4 border border-slate-850 shadow-md flex flex-col md:flex-row items-stretch gap-4 justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="space-y-2 flex-1">
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest block">Shopify-Style Balance Settlement</span>
                <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
                  Earnings &amp; Merchant Markup Settle Deck
                </h3>
                <p className="text-[10px] text-slate-400 leading-normal max-w-xl font-semibold">
                  Track actual profit margins added to product factory base pricing. Withdraw accrued balances safely via local <strong>Mobile Money</strong> (Liberia focus) or internationally with <strong>Wise</strong> (USA focus).
                </p>

                <div className="pt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-slate-850 p-2.5 rounded border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Product Profit Markup</span>
                    <p className="text-sm font-black text-amber-450 mt-1">LRD {totalEarnedProfit.toFixed(2)}</p>
                    <span className="text-[8px] text-slate-500 font-semibold mt-0.5 block">Accumulated actual profit</span>
                  </div>

                  <div className="bg-slate-850 p-2.5 rounded border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Settled / Outgoing</span>
                    <p className="text-sm font-black text-red-400 mt-1">-LRD {withdrawnSum.toFixed(2)}</p>
                    <span className="text-[8px] text-slate-500 font-semibold mt-0.5 block">Claims under routing</span>
                  </div>

                  <div className="bg-slate-850 p-2.5 rounded border border-slate-800 col-span-2 md:col-span-1">
                    <span className="text-[9px] font-bold text-teal-400 block uppercase">Available Balance</span>
                    <p className="text-sm font-black text-emerald-400 mt-1">LRD {availableBalance.toFixed(2)}</p>
                    <span className="text-[8px] text-slate-500 font-semibold mt-0.5 block">Available for cashout</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-2 md:w-56 mt-2 md:mt-0">
                <button
                  type="button"
                  onClick={() => setIsWithdrawalModalOpen(true)}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded text-[10px] uppercase tracking-wider transition shadow-sm cursor-pointer text-center"
                >
                  💰 Request Withdrawal
                </button>
                <button
                  type="button"
                  onClick={() => setIsSellerRequestPaymentOpen(true)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-black rounded text-[10px] uppercase tracking-wider transition border border-slate-700 cursor-pointer text-center"
                >
                  🚀 Request Custom Payment Method
                </button>
                <p className="text-center text-[8px] text-slate-500 font-semibold">
                  Liberian Mobile Money &amp; US Wise settlements supported
                </p>
              </div>
            </div>

            {/* MONTH-OVER-MONTH DIGITAL EARNING ANALYSES & SUMMARY CHART */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Dynamic Ledger Performance Analyze</h3>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed font-semibold">Historical monthly Gross revenue, Platform Fee deductions, and Net seller profits.</p>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-650 inline-block" /> Gross</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500 inline-block" /> Commission</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> Net</span>
                  </div>
                </div>

                {/* GRAPH CONTAINER */}
                <div className="pt-2">
                  {monthlyHistory.reduce((sum, item) => sum + item.gross, 0) === 0 ? (
                    <div className="h-44 flex flex-col justify-center items-center text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-150 rounded">
                      <TrendingUp className="w-6 h-6 text-slate-300 mb-1" />
                      No trade data recorded in the past 6 months to map trends.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* BAR CHART GRAPHIC */}
                      <div className="relative h-44 flex items-end justify-between px-4 pb-2 border-b border-slate-200 pt-4">
                        {monthlyHistory.map((h, idx) => {
                          const grossHeight = (h.gross / maxGrossInChart) * 100;
                          const feeHeight = (h.fee / maxGrossInChart) * 100;
                          const netHeight = (h.net / maxGrossInChart) * 100;

                          return (
                            <div key={idx} className="flex-1 max-w-[80px] flex flex-col items-center group relative px-1">
                              {/* HOVER TOOLTIP ELEMENT */}
                              <div className="absolute bottom-full mb-1 bg-slate-900 text-white rounded p-1.5 text-[8.5px] leading-tight space-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none d-none group-hover:block z-20 font-mono shadow">
                                <p className="font-bold border-b border-slate-800 pb-0.5 text-center text-amber-400">{h.label}</p>
                                <p>Gross: ${h.gross.toFixed(2)}</p>
                                <p className="text-orange-350">Fee: -${h.fee.toFixed(2)}</p>
                                <p className="text-emerald-350 font-black">Net Earning: ${h.net.toFixed(2)}</p>
                              </div>

                              <div className="w-full flex items-end justify-center gap-0.5 h-32">
                                <div 
                                  style={{ height: `${Math.max(grossHeight, 2)}%` }} 
                                  className="w-2.5 bg-blue-650 rounded-t-sm transition-all duration-500"
                                />
                                <div 
                                  style={{ height: `${Math.max(feeHeight, 2)}%` }} 
                                  className="w-2.5 bg-orange-500 rounded-t-sm transition-all duration-500"
                                />
                                <div 
                                  style={{ height: `${Math.max(netHeight, 2)}%` }} 
                                  className="w-2.5 bg-emerald-500 rounded-t-sm transition-all duration-500"
                                />
                              </div>
                              <span className="text-[10px] uppercase font-bold tracking-wider mt-1.5 text-slate-500">{h.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PLATFORM AUDITING BRIEF & RULES */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-2.5">Billing & Ledger Auditing</h3>
                  <div className="space-y-2 text-[11px] leading-relaxed text-slate-600">
                    <p>
                      <strong>Voya Multi-Vendor Clearinghouse</strong> ensures correct distribution of income between listing vendors and Voya platform operations.
                    </p>
                    <div className="p-2 border border-slate-150 rounded bg-slate-50 text-[10.5px]">
                      <span className="font-bold text-slate-700 block text-[9px] uppercase tracking-wider mb-0.5">Status Audit Guide:</span>
                      <ul className="list-disc pl-3.5 space-y-1 text-slate-600 font-sans">
                        <li><strong>Gross Income</strong> is parsed immediately upon checkouts.</li>
                        <li><strong>Commission Fee ({currentCommissionRate}%)</strong> covers trade, delivery verification and customs.</li>
                        <li><strong>Net Earnings</strong> are processed and settled direct to bank layouts configured.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-400">Database Ledger:</span>
                  <span className="text-emerald-655 font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> ONLINE SYNCED
                  </span>
                </div>
              </div>
            </div>

            {/* ACTIVE RECENT FREIGHT / SALES STREAM WITH CARGO FLOW SCHEMATIC */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-150 pb-2.5 mb-3">
                <div>
                  <h3 className="font-bold text-slate-850 text-xs uppercase tracking-wider">Recent Enterprise Freight Streams</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Track real‑time logistics dispatching. Statuses are verified and locked by the systems administrator.</p>
                </div>
                <span className="text-[10px] font-bold text-slate-450 italic">Showing up to 5 most recent dispatches</span>
              </div>

              {orders.length === 0 ? (
                <p className="text-[11px] font-medium text-slate-450 py-6 text-center">No transactions have been recorded for your boutique yet.</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map(o => (
                    <div key={o.orderId} className="border border-slate-200 rounded p-2.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dashed border-slate-150 pb-2 mb-2 text-xs">
                        <div>
                          <p className="font-bold text-slate-800">Order #{o.orderId}</p>
                          <p className="text-[9px] font-mono font-medium text-slate-450">{new Date(o.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-bold text-slate-900">${o.total.toFixed(2)}</p>
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 mt-0.5 rounded ${
                            o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                            o.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
                            o.status === 'processing' ? 'bg-amber-100 text-amber-805' : 'bg-slate-150 text-slate-800'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                      </div>

                      {/* MINIMAL DIGITAL TRAFFIC FLOW INDICATOR */}
                      <div className="grid grid-cols-4 gap-1 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-2.5 py-1 bg-slate-50 rounded border border-slate-150/70">
                        <div className={`space-y-0.5 ${o.status !== 'cancelled' ? 'text-slate-800' : 'text-slate-300'}`}>
                          <p>📥 Checked Out</p>
                          <div className={`h-1.5 rounded-full ${o.status !== 'cancelled' ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        </div>
                        <div className={`space-y-0.5 ${o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered' ? 'text-amber-850' : 'text-slate-300'}`}>
                          <p>📦 Sourcing / QC</p>
                          <div className={`h-1.5 rounded-full ${o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered' ? 'bg-amber-400' : 'bg-slate-200'}`} />
                        </div>
                        <div className={`space-y-0.5 ${o.status === 'shipped' || o.status === 'delivered' ? 'text-indigo-850' : 'text-slate-300'}`}>
                          <p>🛩️ Cargo Shipped</p>
                          <div className={`h-1.5 rounded-full ${o.status === 'shipped' || o.status === 'delivered' ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                        </div>
                        <div className={`space-y-0.5 ${o.status === 'delivered' ? 'text-emerald-850' : 'text-slate-300'}`}>
                          <p>🏁 Deliv Cargo</p>
                          <div className={`h-1.5 rounded-full ${o.status === 'delivered' ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CASH SETTLE AND WITHDRAWAL LEDGERS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Withdrawal Request history */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Withdrawal History &amp; Settlements</h3>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed font-semibold">Track payouts routed via Guangzhou Sourcing Hub.</p>
                  </div>
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">{withdrawalRequests.length} Claims Filed</span>
                </div>

                {withdrawalRequests.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-slate-400 bg-slate-50 border border-dashed border-slate-150 rounded font-bold uppercase tracking-wider">
                    No withdrawal requests submitted yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {withdrawalRequests.map(req => (
                      <div key={req.id} className="border border-slate-150 rounded p-2.5 text-xs flex items-center justify-between hover:bg-slate-50/40">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900">Withdraw LRD {req.amount.toFixed(2)}</p>
                          <p className="text-[9.5px] text-slate-600 font-semibold">{req.paymentMethod} &bull; <span className="font-mono text-[8px] bg-slate-100 px-1 rounded">{req.accountDetails}</span></p>
                          <p className="text-[8.5px] text-slate-404 font-mono font-medium">{new Date(req.createdAt).toLocaleString()}</p>
                          {req.transferReceipt && (
                            <button
                              type="button"
                              onClick={() => setPreviewReceiptImage(req.transferReceipt || null)}
                              className="block text-[8.5px] text-[#ff6600] hover:underline cursor-pointer font-extrabold uppercase mt-1.5 leading-none"
                            >
                              🎞️ View Receipt Proof
                            </button>
                          )}
                        </div>
                        <div>
                          <span className={`inline-block text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                            req.status === 'approved' ? 'bg-emerald-100 text-emerald-805' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-805'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom payment method additions from the seller */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Requested Settle Gateways</h3>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed font-semibold">Custom mobile money wallets or Wise rails requested by your store.</p>
                  </div>
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">{sellerPaymentRequests.length} Forms Sent</span>
                </div>

                {sellerPaymentRequests.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-slate-400 bg-slate-50 border border-dashed border-slate-150 rounded font-bold uppercase tracking-wider">
                    No custom gateways requested yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {sellerPaymentRequests.map(req => (
                      <div key={req.id} className="border border-slate-150 rounded p-2.5 text-xs">
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
                          <p className="font-black text-slate-800 uppercase text-[9.5px]">{req.requestedMethod}</p>
                          <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                            req.status === 'integrated' ? 'bg-indigo-100 text-indigo-850' : 'bg-slate-150 text-slate-650'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        {req.details && <p className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 leading-tight mb-1 font-semibold">{req.details}</p>}
                        <p className="text-[8px] text-slate-400 font-mono font-medium text-right">{new Date(req.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VENDOR PRODUCT MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-white p-3 border border-slate-200 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase">Listed Merchandise Workflow</h3>
                <p className="text-[11px] text-slate-500">Submit new designs with cost metrics for final administrative pricing review.</p>
              </div>

              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-all cursor-pointer uppercase"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Merchandise
              </button>
            </div>

            {/* INNER PRODUCTS TAB SWITCHER */}
            <div className="flex border-b border-slate-200 bg-white p-1 rounded gap-1 shadow-xs">
              <button
                onClick={() => setSellerProductTab('my_products')}
                className={`py-1.5 px-3.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  sellerProductTab === 'my_products'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                My Reviewed Products ({products.filter(p => !p.status || p.status === 'approved' || p.status === 'rejected').length})
              </button>
              <button
                onClick={() => setSellerProductTab('pending_submissions')}
                className={`py-1.5 px-3.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  sellerProductTab === 'pending_submissions'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Pending Submissions ({products.filter(p => p.status === 'pending_approval').length})
              </button>
            </div>

            {/* PRODUCT BENTO GRID LIST */}
            {(() => {
              const visibleProducts = sellerProductTab === 'my_products'
                ? products.filter(p => !p.status || p.status === 'approved' || p.status === 'rejected')
                : products.filter(p => p.status === 'pending_approval');

              if (visibleProducts.length === 0) {
                return (
                  <div className="bg-white p-8 text-center rounded border border-dashed border-slate-200">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-bold text-xs mb-3">
                      {sellerProductTab === 'my_products' 
                        ? 'No reviewed products in your catalog yet.' 
                        : 'No pending product submissions under consideration.'}
                    </p>
                    {sellerProductTab === 'pending_submissions' && (
                      <button onClick={openAddModal} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded cursor-pointer">
                        Add &amp; Submit Product
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleProducts.map(prod => {
                    const isApproved = !prod.status || prod.status === 'approved';
                    const isRejected = prod.status === 'rejected';
                    const isPending = prod.status === 'pending_approval';

                    return (
                      <div key={prod.productId} className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col group transition-all">
                        <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                          <img 
                            src={prod.images?.[0] || 'https://via.placeholder.com/150'} 
                            alt="Product visual" 
                            className="w-full h-full object-cover object-center" 
                          />
                          <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                            {prod.category}
                          </span>
                          
                          {/* Work flow status badges */}
                          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                            {isApproved && (
                              <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs uppercase">Approved</span>
                            )}
                            {isPending && (
                              <span className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs uppercase">Pending Approval</span>
                            )}
                            {isRejected && (
                              <span className="bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs uppercase">Rejected</span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h3 className="font-bold text-slate-900 text-xs truncate">{prod.name}</h3>
                            <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">{prod.description}</p>
                            
                            {prod.sizes && prod.sizes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {prod.sizes.map(s => (
                                  <span key={s} className="bg-slate-100 text-slate-600 text-[8px] font-extrabold px-1.5 py-0.2 rounded border border-slate-150">{s}</span>
                                ))}
                              </div>
                            )}

                            {isRejected && prod.rejectionReason && (
                              <div className="bg-rose-50 text-rose-700 text-[10px] p-2 rounded border border-rose-100 mt-1">
                                <span className="font-bold">Reason:</span> {prod.rejectionReason}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-150 mt-2.5 space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                              <span>Cost price: <strong className="text-slate-700">${(prod.originalPrice ?? prod.price).toFixed(2)}</strong></span>
                              <span>Target profit: <strong className="text-slate-700">${(prod.desiredProfit ?? 0).toFixed(2)}</strong></span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Stock</span>
                                <span className={`text-[11px] font-bold ${prod.stock < 10 ? 'text-rose-600' : 'text-slate-800'}`}>{prod.stock} units</span>
                              </div>

                              <div className="text-right">
                                <span className="text-[9px] text-slate-400 block font-bold leading-none">{isApproved ? 'Admin Price' : 'Preview Price'}</span>
                                <p className="text-[#ff6600] font-black text-sm">${prod.price.toFixed(2)}</p>
                              </div>
                            </div>

                            {prod.weight !== null && prod.weight !== undefined && (
                              <div className="text-[9px] text-slate-400 font-mono mt-1 text-right">
                                Est. Weight: <span className="font-bold text-slate-600">{prod.weight} kg</span>
                              </div>
                            )}
                          </div>

                          {/* Seller Ad & Promo Share Bar */}
                          <div className="pt-2 mt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                const link = window.location.origin + window.location.pathname + "?productId=" + prod.productId;
                                navigator.clipboard.writeText(link);
                                showToast(`Promotional link for "${prod.name}" copied to clipboard! Paste this direct URL on your brand ads/socials.`, 'success');
                              }}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-400 text-slate-900 hover:text-slate-950 border border-amber-300 hover:border-amber-450 rounded text-[10.5px] font-black uppercase transition-all duration-200 cursor-pointer text-center"
                              title="Copy permanent promotional deep-link"
                            >
                              <Copy className="w-3.2 h-3.2 text-amber-600 shrink-0" />
                              <span>Copy Promo Link</span>
                            </button>
                          </div>

                          <div className="flex gap-1.5 pt-2 mt-2 border-t border-slate-100">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => openEditModal(prod)}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded text-[11px] font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit Submission
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod.productId, prod.name)}
                                  className="px-2 py-1 bg-slate-50 text-rose-650 hover:bg-rose-50 border border-slate-200 rounded transition-colors cursor-pointer"
                                  title="Delete product draft"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEditModal(prod)}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[11px] font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  View Details
                                </button>
                                {isRejected && (
                                  <button
                                    onClick={() => handleDeleteProduct(prod.productId, prod.name)}
                                    className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded transition-colors cursor-pointer"
                                    title="Delete product entry"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* PRODUCT DYNAMIC MODAL (ADD / EDIT / VIEW) */}
            {isProductModalOpen && (() => {
              const isReadOnly = editingProduct && (editingProduct.status === 'approved' || editingProduct.status === 'rejected' || editingProduct.status === undefined);
              const previewFinalPrice = (parseFloat(prodOriginalPrice) || 0) + (parseFloat(prodDesiredProfit) || 0);

              return (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-xs overflow-y-auto">
                  <div className="bg-white rounded max-w-lg w-full shadow-md overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[90vh]">
                    <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                      <h3 className="font-bold text-xs text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                        {isReadOnly ? 'Reviewed Product Details (Locked)' : editingProduct ? 'Edit Pending Submission' : 'Submit New Chinese Merchandise'}
                      </h3>
                      <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="p-3 space-y-3 overflow-y-auto flex-1">
                      {isReadOnly && (
                        <div className="bg-indigo-50 border border-indigo-150 p-2.5 rounded text-[11px] text-indigo-805 font-medium">
                          💡 This product has been reviewed by the platform administration. The specifications, base costs, and final set active consumer pricing are locked.
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Merchandise Name *</label>
                          <input
                            type="text"
                            value={prodName}
                            onChange={(e) => setProdName(e.target.value)}
                            disabled={isReadOnly}
                            placeholder="e.g. Traditional Hand-Painted Silk Fan"
                            className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Taxonomy Category</label>
                          <select
                            value={prodCategory}
                            onChange={(e) => setProdCategory(e.target.value)}
                            disabled={isReadOnly}
                            className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            {categories.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cost Price (Original Cost) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={prodOriginalPrice}
                            onChange={(e) => setProdOriginalPrice(e.target.value)}
                            disabled={isReadOnly}
                            placeholder="e.g. 15.00"
                            className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Desired Profit Per Unit *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={prodDesiredProfit}
                            onChange={(e) => setProdDesiredProfit(e.target.value)}
                            disabled={isReadOnly}
                            placeholder="e.g. 5.95"
                            className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Calculated Final Price Preview</label>
                          <div className="mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-700">
                            ${previewFinalPrice.toFixed(2)}
                            <span className="text-[9px] text-slate-400 font-normal ml-1">(Original + Profit)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Immediate Factory Stock *</label>
                          <input
                            type="number"
                            value={prodStock}
                            onChange={(e) => setProdStock(e.target.value)}
                            disabled={isReadOnly}
                            placeholder="e.g. 200"
                            className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custom Product Sizes (comma separated)</label>
                        <input
                          type="text"
                          value={prodSizes}
                          onChange={(e) => setProdSizes(e.target.value)}
                          disabled={isReadOnly}
                          placeholder="e.g. S, M, L, XL or Standard, Luxury Case"
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                        <span className="text-[9px] text-slate-400 block mt-0.5">If specified, customers must choose a size before checking out.</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Specifications &amp; Description *</label>
                        <textarea
                          value={prodDesc}
                          onChange={(e) => setProdDesc(e.target.value)}
                          disabled={isReadOnly}
                          placeholder="Detail materials, dimensions, specific packaging..."
                          rows={3}
                          className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
                          required
                        />
                      </div>

                      {/* PHOTO PORTAL */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          {editingProduct ? 'Catalogue Images (Maximum 3)' : 'Catalogue Image (Maximum 1)'} ({prodImages.length}/{editingProduct ? 3 : 1})
                        </label>
                        
                        <div className="grid grid-cols-5 gap-2">
                          {prodImages.map((img, idx) => (
                            <div key={idx} className="aspect-square rounded border border-slate-200 relative overflow-hidden bg-slate-50">
                              <img src={img} alt="Preview" className="w-full h-full object-cover" />
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStagedImage(idx)}
                                  className="absolute top-0.5 right-0.5 bg-slate-900/95 text-white rounded p-0.5 hover:scale-105"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          ))}

                          {!isReadOnly && prodImages.length < (editingProduct ? 3 : 1) && (
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                multiple={false}
                                onChange={handleProductImageUpload}
                                id="prodImageUploader"
                                className="hidden"
                              />
                              <label
                                htmlFor="prodImageUploader"
                                className="aspect-square rounded border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer"
                              >
                                <ImageIcon className="w-4 h-4 mb-0.5" />
                                <span className="text-[8px] font-bold uppercase text-center leading-none">Add Image</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-150 flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsProductModalOpen(false)}
                          className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          {isReadOnly ? 'Close' : 'Cancel'}
                        </button>
                        {!isReadOnly && (
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded text-xs hover:bg-slate-700 cursor-pointer uppercase tracking-widest"
                          >
                            Submit Draft
                          </button>
                        )}
                      </div>

                    </form>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: ORDER OPERATION BY VENDOR */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white p-3 border border-slate-200 rounded">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Customer Order Dispatch Terminal</h3>
              <p className="text-[11px] text-slate-500">View incoming orders and track freight waybills. Delivery status transitions are handled and verified exclusively by the system administrator.</p>
            </div>

            {/* ORDERS LOG */}
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="bg-white p-8 text-center rounded border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-bold text-xs">No pending orders are currently assigned to your store.</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.orderId} className="metric-card !p-0 overflow-hidden">
                    <div className="p-2.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-bold text-[10px] uppercase">Ref:</span>
                          <span className="text-slate-900 font-bold text-xs font-mono">#{order.orderId}</span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 leading-none mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          order.status === 'delivered' ? 'bg-emerald-100 text-emerald-805' :
                          order.status === 'shipped' ? 'bg-indigo-150 text-indigo-805' :
                          order.status === 'processing' ? 'bg-amber-100 text-amber-805' : 'bg-slate-150 text-slate-700'
                        }`}>
                          {order.status}
                        </span>

                        {/* WORKFLOW DISPATCH CONTROLS - LOCKED FOR MERCHANTS */}
                        <div className="text-[10px] text-slate-450 italic font-semibold">
                          🛡️ Audited by Administrator
                        </div>
                      </div>
                    </div>

                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block mb-1">Shipping Waybill Address</span>
                        <p className="font-bold text-slate-800 flex items-start gap-1 leading-tight text-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          {order.shippingAddress}
                        </p>

                        {order.paymentMethod && order.paymentMethod !== 'none' && (
                          <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded text-[10.5px] leading-relaxed text-slate-600 space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded inline-block leading-none">
                              Payment: {order.paymentMethod === 'mobile_money' ? '📱 Mobile Money' : '🏦 Bank Transfer'}
                            </span>
                            <p className="mt-1">Ref / ID: <span className="font-mono text-slate-900 font-bold bg-white px-1 py-0.2 rounded border border-slate-200">{order.paymentReference}</span></p>
                            <p>Sender Details: <span className="text-slate-900 font-bold">{order.paymentSenderDetails}</span></p>
                            {order.paymentReceipt && (
                              <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between gap-2.5">
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">Receipt Photo / Proof:</span>
                                <button
                                  type="button"
                                  onClick={() => setPreviewReceiptImage(order.paymentReceipt || null)}
                                  className="w-10 h-10 rounded border border-slate-200 overflow-hidden relative group cursor-pointer bg-white"
                                >
                                  <img src={order.paymentReceipt} alt="Receipt proof" className="w-full h-full object-cover font-bold" />
                                  <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[5.5px] font-bold text-center pb-0.5 leading-none">
                                    VIEW
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block mb-1.5">Acquired Items In Bill</span>
                        <div className="space-y-1 text-[11px] font-semibold text-slate-700">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 p-1 px-1.5 rounded border border-slate-100">
                              <span className="truncate">{it.name} <span className="text-slate-400 leading-none">x{it.quantity}</span></span>
                              <span className="font-bold text-slate-900">${(it.price * it.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="border-t border-slate-100 pt-1 mt-1.5 flex justify-between text-xs font-bold text-slate-800">
                            <span>Sum Total:</span>
                            <span className="text-blue-650">${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: STORE SETTINGS CUSTOMIZATION */}
        {activeTab === 'settings' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-white p-3 border border-slate-200 rounded">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Customize Your Digital Storefront</h3>
              <p className="text-[11px] text-slate-500">Rebrand your boutique page, detail payout settle channels, and set welcome banners.</p>
            </div>

            <form onSubmit={handleSaveStoreSettings} className="bg-white p-4 rounded border border-slate-200 shadow-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Public Storefront Name</label>
                  <input
                    type="text"
                    value={storeNameEdit}
                    onChange={(e) => setStoreNameEdit(e.target.value)}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-slate-550"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Settlement Email Address</label>
                  <input
                    type="email"
                    value={payoutEmailEdit}
                    onChange={(e) => setPayoutEmailEdit(e.target.value)}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-550"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Storefront Bio Description</label>
                <textarea
                  value={storeDescEdit}
                  onChange={(e) => setStoreDescEdit(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-550 leading-relaxed"
                  required
                />
              </div>

              {/* STOREFRONT LOGO AND BANNER EDITORS */}
              <div className="space-y-3 pt-3 border-t border-slate-150">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Storefront Visual Branding (Base64)</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* LOGO */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Boutique Logo</label>
                    <div className="flex items-center gap-3 bg-slate-5 p-2 rounded border border-slate-200">
                      <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden shrink-0 bg-white flex items-center justify-center p-0.5">
                        <img 
                          src={tempLogo || store?.logo || 'https://via.placeholder.com/150'} 
                          alt="Store Logo Preview" 
                          className="w-full h-full object-cover rounded" 
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleStoreLogoUpload}
                          id="storeLogoUploader"
                          className="hidden"
                        />
                        <label
                          htmlFor="storeLogoUploader"
                          className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-750 rounded text-[10px] font-bold hover:bg-slate-100 transition-all shadow-xs"
                        >
                          <Upload className="w-3 h-3" />
                          Update logo
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* BANNER */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Storefront Banner</label>
                    <div className="flex items-center gap-3 bg-slate-5 p-2 rounded border border-slate-200">
                      <div className="w-14 h-10 rounded border border-slate-200 overflow-hidden shrink-0 bg-white">
                        <img 
                          src={tempBanner || store?.banner || 'https://via.placeholder.com/150'} 
                          alt="Store Banner Preview" 
                          className="w-full h-full object-cover rounded" 
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleStoreBannerUpload}
                          id="storeBannerUploader"
                          className="hidden"
                        />
                        <label
                          htmlFor="storeBannerUploader"
                          className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-bold hover:bg-slate-100 transition-all shadow-xs"
                        >
                          <Upload className="w-3 h-3" />
                          Update banner
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <div className="pt-3 border-t border-slate-150 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-xs transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Save Store settings
                </button>
              </div>

            </form>

            <div className="bg-white p-3 border border-slate-200 rounded mt-6">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Seller Account Settings</h3>
              <p className="text-[11px] text-slate-500">Update your corporate personal identity credentials and sample contact phone number.</p>
            </div>

            <form onSubmit={handleSaveSellerProfile} className="bg-white p-4 rounded border border-slate-200 shadow-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Seller Human Name</label>
                  <input
                    type="text"
                    value={sellerNameEdit}
                    onChange={(e) => setSellerNameEdit(e.target.value)}
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-slate-550"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Contact Phone Number</label>
                  <input
                    type="text"
                    value={sellerPhoneEdit}
                    onChange={(e) => setSellerPhoneEdit(e.target.value)}
                    placeholder="e.g. +1234567890"
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-550"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Country of Residence</label>
                  <input
                    type="text"
                    value={sellerCountryOfResidenceEdit}
                    onChange={(e) => setSellerCountryOfResidenceEdit(e.target.value)}
                    placeholder="e.g. United States, Germany, Japan"
                    className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-550"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Change Password</label>
                <input
                  type="password"
                  value={sellerPasswordEdit}
                  onChange={(e) => setSellerPasswordEdit(e.target.value)}
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
                  Save Profile credentials
                </button>
              </div>
            </form>

          </div>
        )}

        {/* TAB 5: AUDIT NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-white p-3.5 border border-slate-200 rounded flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
                  Product Catalog Audit Messages
                </h3>
                <p className="text-[11px] text-slate-500">Track and review details regarding approved listings, or corrections requested by platform reviewers.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    for (const n of notifications) {
                      if (!n.read) {
                        await dbSaveNotification({ ...n, read: true });
                      }
                    }
                    showToast("Successfully dismissed and marked all alerts as read.", "success");
                  } catch (e) {
                    showToast("Failed to mark notifications.", "error");
                  }
                }}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline transition-colors cursor-pointer shrink-0 leading-none py-1"
              >
                Clear Unreads (Mark all read)
              </button>
            </div>

            <div className="space-y-2.5">
              {notifications.length === 0 ? (
                <div className="bg-white p-12 text-center rounded border border-dashed border-slate-200">
                  <Bell className="w-9 h-9 text-slate-300 mx-auto mb-2.5 opacity-60" />
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wide">No notifications recorded</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Approved or correction logs will pop here in real-time.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 bg-white border rounded shadow-xs relative transition-all ${
                      notif.read ? 'border-slate-200 opacity-90' : 'border-blue-200 bg-blue-50/5 ring-1 ring-blue-50'
                    }`}
                  >
                    {!notif.read && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    )}
                    <h4 className="font-extrabold text-xs flex items-center gap-1.5 text-slate-900 uppercase tracking-wide">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${notif.type === 'approval' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {notif.type === 'approval' ? 'Commodity Approved & Listing Activated' : 'Commodity Draft Decline / Re-audit REQUIRED'}
                    </h4>
                    <p className="text-[11.5px] text-slate-650 mt-1.5 leading-relaxed font-semibold">{notif.message}</p>
                    <div className="mt-2 text-[9px] font-mono text-slate-400 font-semibold flex justify-between">
                      <span>{new Date(notif.createdAt).toLocaleString()}</span>
                      <span className="uppercase text-slate-350">Status: {notif.read ? 'Read' : 'New'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {isMobile && (
        <div id="pdd-seller-bottom-nav" className="fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-slate-200 shadow-md z-50 flex justify-around items-center px-4 md:hidden">
          {/* Home Icon (Store Dashboard) */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex flex-col items-center justify-center w-[70px] h-[48px] rounded cursor-pointer transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <Home className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-[#ff6600]' : 'text-slate-400'}`} />
            <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${activeTab === 'dashboard' ? 'text-[#ff6600]' : 'text-slate-500'}`}>
              Home
            </span>
          </button>

          {/* Orders Icon (replaced Cart) */}
          <button
            onClick={() => setActiveTab('orders')}
            className="flex flex-col items-center justify-center w-[70px] h-[48px] rounded cursor-pointer transition-colors relative"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <Clock className={`w-5 h-5 ${activeTab === 'orders' ? 'text-[#ff6600]' : 'text-slate-400'}`} />
            {pendingOrdersCount > 0 && (
              <span className="absolute top-[3px] right-[15px] bg-red-600 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full shadow-xs leading-none">
                {pendingOrdersCount}
              </span>
            )}
            <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${activeTab === 'orders' ? 'text-[#ff6600]' : 'text-slate-500'}`}>
              Orders
            </span>
          </button>

          {/* Notifications Icon (Alerts) */}
          <button
            onClick={() => setActiveTab('notifications')}
            className="flex flex-col items-center justify-center w-[70px] h-[48px] rounded cursor-pointer transition-colors relative"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <Bell className={`w-5 h-5 ${activeTab === 'notifications' ? 'text-[#ff6600]' : 'text-slate-400'}`} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute top-[3px] right-[15px] bg-blue-600 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full shadow-xs leading-none">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
            <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${activeTab === 'notifications' ? 'text-[#ff6600]' : 'text-slate-500'}`}>
              Alerts
            </span>
          </button>

          {/* Profile Icon (Store Settings) */}
          <button
            onClick={() => setActiveTab('settings')}
            className="flex flex-col items-center justify-center w-[70px] h-[48px] rounded cursor-pointer transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <UserIcon className={`w-5 h-5 ${activeTab === 'settings' ? 'text-[#ff6600]' : 'text-slate-400'}`} />
            <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${activeTab === 'settings' ? 'text-[#ff6600]' : 'text-slate-500'}`}>
              Profile
            </span>
          </button>
        </div>
      )}

      {/* SELLER WITHDRAWAL REQUEST OVERLAY MODAL */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded max-w-sm w-full shadow-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-3 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">
                Submit Settle Request
              </h3>
              <button
                type="button"
                onClick={() => setIsWithdrawalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWithdrawalSubmit} className="p-4 space-y-3">
              <div className="bg-teal-50 border border-teal-200 rounded p-2.5 text-[10.5px] text-teal-900 font-semibold leading-relaxed">
                💵 Available Balance Settle Cap: <strong>LRD {availableBalance.toFixed(2)}</strong> (Cumulative profit on product base prices minus past payouts).
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                  Withdrawal Amount (LRD, Minimum 1500 LRD) *
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">LRD</span>
                  <input
                    type="number"
                    step="1"
                    min="1500"
                    max={availableBalance}
                    placeholder="e.g. 1500"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="block w-full pl-10 pr-3 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-bold focus:ring-1 focus:ring-teal-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                  Liberian Mobile Money Provider *
                </label>
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-bold focus:ring-1 focus:ring-teal-500 outline-none"
                >
                  <option value="Orange Mobile Money">Orange Mobile Money (Liberia Network)</option>
                  <option value="Lonestar Mobile Money">Lonestar Cell MTN Mobile Money (Liberia Network)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                  Liberian Mobile Money Receiver Wallet Number &amp; Holder Registered Name *
                </label>
                <textarea
                  placeholder="e.g. Mobile number: +231 772983748, Holder legal registration name: Princess Kollie"
                  rows={3}
                  value={withdrawAccountDetails}
                  onChange={(e) => setWithdrawAccountDetails(e.target.value)}
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 font-semibold focus:ring-1 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWithdrawalModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-[10px] font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdrawal}
                  className="px-3.5 py-1.5 bg-emerald-505 hover:bg-emerald-600 text-slate-950 font-extrabold rounded text-[10px] uppercase transition cursor-pointer"
                >
                  {isSubmittingWithdrawal ? 'Sourcing clearing...' : 'Confirm Settle Sourcing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SELLER CUSTOM PAYMENT METHOD ADDITION OVERLAY MODAL */}
      {isSellerRequestPaymentOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded max-w-sm w-full shadow-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-3 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">
                Request Settle Gateway Addon
              </h3>
              <button
                type="button"
                onClick={() => setIsSellerRequestPaymentOpen(false)}
                className="text-slate-404 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSellerPaymentRequestSubmit} className="p-4 space-y-3">
              <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                Shopify‑style localized gateways: Request customized local payment providers (Lib Mobile Money, Wire routers, and Wise accounts) to be added to the settlement portal.
              </p>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                  Gateway / Provider Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Telecel Cash Liberia / Wave Money / Stripe US Connect"
                  value={requestedSellerMethodName}
                  onChange={(e) => setRequestedSellerMethodName(e.target.value)}
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 font-bold focus:ring-1 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                  Integration Notes &amp; Settlement Target Details
                </label>
                <textarea
                  placeholder="Explain how this payout mechanism functions and your desired currency for swift clearing."
                  rows={3}
                  value={requestedSellerMethodDetails}
                  onChange={(e) => setRequestedSellerMethodDetails(e.target.value)}
                  className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 font-semibold focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSellerRequestPaymentOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-[10px] font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSellerMethodRequest}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded text-[10px] uppercase transition cursor-pointer"
                >
                  {isSubmittingSellerMethodRequest ? 'Submitting...' : 'File Gateway Design'}
                </button>
              </div>
            </form>
          </div>
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

    </div>
  );
}
