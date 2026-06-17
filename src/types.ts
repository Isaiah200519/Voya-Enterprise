export type UserRole = 'customer' | 'seller' | 'admin';

export interface User {
  userId: string;
  email: string;
  password?: string; // Stored in plain text for demo, can be omitted in some contexts but present in state.
  name: string;
  role: UserRole;
  approved?: boolean; // For sellers: true/false. Customers/Admins are approved by default.
  profilePicture?: string; // base64 string
  storeId?: string; // For sellers
  shippingAddress?: string;
  phoneNumber?: string; // Optional phone number
  referrerNumber?: string; // Referral ID or referrer number
  countryOfResidence?: string; // Country of residence field
  blocked?: boolean; // Admin capability to block sellers / customers
  pointsBalance?: number; // Lucky Draw module points balance
  accountBalance?: number; // Savings / deposit balance
  monthlyProgress?: number; // Accumulated progress points toward 3,000 monthly goal
  isWinnerThisMonth?: boolean; // Reached 3,000 points this month
  winnerRank?: number; // 1 to 50 rank in the current month
  winnerPrize?: number; // Cash prize awarded (e.g., 1000, 2500, 10000)
  winnerReachedAt?: string; // Timestamp when they reached 3000 points and became a winner
  withdrawableBalance?: number; // Cash withdrawable balance (payout / winnings)
  location?: {
    country: string;
    city: string;
    district: string;
    postalCode: string;
    streetAddress: string;
    lat?: number;
    lng?: number;
  } | null;
  resetCode?: string;
  resetCodeExpiry?: number;
}

export interface Store {
  storeId: string;
  sellerId: string;
  storeName: string;
  logo?: string; // base64 string
  banner?: string; // base64 string
  description: string;
  approved: boolean;
  payoutEmail: string;
}

export interface Product {
  productId: string;
  storeId: string;
  name: string;
  price: number; // For backward compatibility; this will represent the approved final price
  stock: number;
  description: string;
  images: string[]; // array of base64 strings
  category: string;
  createdAt: string;
  
  // New workflow fields
  status?: 'pending_approval' | 'approved' | 'rejected';
  originalPrice?: number;
  desiredProfit?: number;
  finalPrice?: number; // Admin‑set, default price is used as fallback
  weight?: number | null; // Weight in kg
  approvalDate?: string; // ISO String set when approved
  sizes?: string[]; // ["S", "M", "L"]
  sellerId?: string;
  rejectionReason?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string; // New: selected size
  weight?: number; // New: item weight
  shippingFee?: number; // New: proportion of shipping fee
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  orderId: string;
  customerId: string;
  storeId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: string;
  createdAt: string;
  shipping_fee?: number; // New: captured shipping fee
  paymentMethod?: 'mobile_money' | 'bank_transfer' | 'none';
  paymentReference?: string;
  paymentSenderDetails?: string;
  paymentReceipt?: string; // Base64 screenshot or photo of payment receipt
  paymentProvider?: string; // e.g., 'Orange Mobile Money' or 'Lonestar Mobile Money'
  pointsApplied?: number;
  originalTotal?: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  size?: string;
}

export interface PlatformSettings {
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  platformLogo?: string; // base64 string
  platformBanner?: string; // base64 string
  adminBankName?: string;
  adminBankAccountNumber?: string;
  adminBankAccountName?: string;
  adminMobileMoneyNumber?: string;
  adminMobileMoneyName?: string;
  adminMobileMoneyProvider?: string;
  commissionRate?: number; // percentage based commission rate e.g., 15 for 15%
  liberiaOrangeNumber?: string;
  liberiaOrangeName?: string;
  liberiaLonestarNumber?: string;
  liberiaLonestarName?: string;
  luckyDrawSpinCost?: number; // S points
  luckyDrawTargetProfit?: number; // Target profit margin percentage (e.g. 50 for 50%)
  minDepositLimit?: number;
  maxDepositLimit?: number;
  minWithdrawalLimit?: number;
  maxWithdrawalLimit?: number;
}

export interface SellerNotification {
  id: string;
  sellerId: string;
  productId?: string;
  productName: string;
  type: 'approval' | 'rejection' | 'withdrawal' | 'commission_deduction' | 'payment' | 'order_status' | 'general';
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  productId: string;
  productName: string;
  action: 'approve' | 'reject';
  adminId: string;
  adminName: string;
  timestamp: string;
  details: string;
}

export interface WithdrawalRequest {
  id: string;
  sellerId: string;
  storeId: string;
  storeName: string;
  amount: number;
  paymentMethod: string;
  accountDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  remarks?: string;
  reviewedAt?: string;
  transferReceipt?: string; // admin uploaded transfer receipt as proof
}

export interface BuyerPaymentRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  requestedMethod: string;
  details: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface SellerPaymentRequest {
  id: string;
  sellerId: string;
  storeId: string;
  storeName: string;
  sellerEmail: string;
  requestedMethod: string;
  details: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface Spin {
  id: string;
  userId: string;
  username: string;
  monthYear: string; // "YYYY-MM"
  isFree: boolean;
  pointsCost: number;
  prizeName?: string;
  pointsAwarded?: number; // Progress points awarded (0, 500, 1000, 1500, 3000)
  progressAfter?: number; // User progress points value after this spin
  createdAt: string;
}

export interface PointsPurchase {
  id: string;
  userId: string;
  username: string;
  amountLrd: number;
  receiptImage: string; // Base64 payment receipt proof
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  adminNotes?: string;
  paymentProvider?: string; // "Orange Mobile Money" | "Lonestar Mobile Money"
  paymentSenderDetails?: string; // number/name
}

export interface LuckyWinner {
  userId: string;
  username: string;
  prize: string; // LRD amount as string, e.g. "2,500 LRD" or "Phone"
  rank: string; // "1st" | "2nd" | "3rd" | "winner"
}

export interface MonthlyStats {
  id: string; // "YYYY-MM"
  monthYear: string;
  totalSpins: number;
  winners: LuckyWinner[];
  publishedAt?: string;
}

export interface WinnerAnnouncement {
  id: string; // "YYYY-MM"
  monthYear: string;
  image?: string; // Admin uploaded layout image
  description: string;
  publishedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  amount: number;
  type: 'deposit' | 'payment' | 'withdrawal' | 'admin_adjust';
  referenceId?: string;
  remarks?: string;
  timestamp: string;
}


