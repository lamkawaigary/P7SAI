

export enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  ADMIN_SUPER = 'ADMIN_SUPER',
  ADMIN_CS = 'ADMIN_CS',
  ADMIN_DB = 'ADMIN_DB',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
  PENDING = 'PENDING',
}

export enum DriverStatus {
  PENDING_DOCS = 'PENDING_DOCS',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum DocStatus {
  MISSING = 'MISSING',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  WAITING_FOR_DRIVER = 'WAITING_FOR_DRIVER',
  ON_THE_WAY = 'ON_THE_WAY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  LOCKED = 'LOCKED',
}

export enum OfficialRouteStatus {
  COLLECTING = 'COLLECTING', // 乘客拼單中
  CONFIRMED = 'CONFIRMED',   // 人數達標，已成行
  DISPATCHING = 'DISPATCHING', // 待司機領取
  ACTIVE = 'ACTIVE',         // 執行中
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderType {
  CARPOOL = 'CARPOOL',
  CHARTER = 'CHARTER',
}

export interface OfficialRoute {
  id: string;
  pickup: LocationData;
  dropoff: LocationData;
  date: string;
  status: OfficialRouteStatus;
  totalSeats: number;
  occupiedSeats: number;
  pricePerSeat: number;
  charterPrice: number;
  driverId?: string;
  adminNote?: string;
  createdAt: string;
}

export interface LocationData {
  placeName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  regionId?: Region;
  uri?: string;
}

export interface User {
  id: string;
  phone: string;
  email: string;
  name: string;
  role: UserRole;
  status: AccountStatus;
  points: number;
  createdAt: string;
  updatedAt?: string;
  driverStatus?: DriverStatus;
  rejectionReason?: string;
  docs?: Record<string, {
    url?: string;
    number?: string;
    expiryDate?: string;
    status: DocStatus;
    updatedAt: string;
    reviewedAt?: string;
    rejectReason?: string;
  }>;
  plates?: any;
}

export interface Order {
  id: string;
  passengerId: string;
  driverId?: string;
  routeId?: string; 
  officialRouteId?: string; // 關聯官方班次
  type: OrderType;
  pickup: LocationData;
  dropoff: LocationData;
  status: OrderStatus;
  price: number; 
  platformFee: number; 
  date: string;
  createdAt: string; 
  completedAt?: string; 
  passengersCount: number; 
  notes?: string;
  isOfficial?: boolean;
  // added properties for upgrade tracking
  originalPrice?: number;
  isCharterUpgraded?: boolean;
}

export interface DriverRoute {
  id: string;
  driverId: string;
  pickup: LocationData;
  dropoff: LocationData;
  date: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  totalPrice: number;
  pricingSystem?: string;
}

export enum Region {
  HK_ISLAND = 'HK_ISLAND',
  HK_KOWLOON = 'HK_KOWLOON',
  HK_NEW_TERRITORIES = 'HK_NEW_TERRITORIES',
  HK_AIRPORT = 'HK_AIRPORT',
  HK_DISNEY = 'HK_DISNEY',
  SZ_BAY_PORT = 'SZ_BAY_PORT',
  SZ_CITY_MAIN = 'SZ_CITY_MAIN',
  SZ_BAOAN_WEST = 'SZ_BAOAN_WEST',
  GZ_CITY = 'GZ_CITY',
  GZ_REMOTE = 'GZ_REMOTE',
  ZH_CITY = 'ZH_CITY',
  MO_MACAU = 'MO_MACAU',
  DG_CITY = 'DG_CITY',
  HZ_CITY = 'HZ_CITY',
  UNKNOWN = 'UNKNOWN',
}

export const RegionLabels: Record<string, string> = {
  [Region.HK_ISLAND]: '香港島 (HK Island)',
  [Region.HK_KOWLOON]: '九龍 (Kowloon)',
  [Region.HK_NEW_TERRITORIES]: '新界 (New Territories)',
  [Region.HK_AIRPORT]: '香港機場 (HK Airport)',
  [Region.HK_DISNEY]: '大嶼山/迪士尼 (Disney)',
  [Region.SZ_BAY_PORT]: '深圳灣口岸 (SZ Bay Port)',
  [Region.SZ_CITY_MAIN]: '深圳福田/羅湖 (SZ City)',
  [Region.SZ_BAOAN_WEST]: '深圳寶安/前海 (SZ Baoan)',
  [Region.GZ_CITY]: '廣州市區 (GZ City)',
  [Region.GZ_REMOTE]: '廣州郊區/機場 (GZ Remote)',
  [Region.ZH_CITY]: '珠海市區 (ZH City)',
  [Region.MO_MACAU]: '澳門 (Macau)',
  [Region.DG_CITY]: '東莞 (Dongguan)',
  [Region.HZ_CITY]: '惠州 (Huizhou)',
  [Region.UNKNOWN]: '未知區域 (Unknown)',
};

export interface PricingConfig {
  activeSystem: 'matrix' | 'distance' | 'fixed-point';
  minSpend: number;
  tier1Rate: number;
  tier2Rate: number;
  tier3Rate: number;
  midnightSurcharge: number;
  driverFeePercentage: number;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  enableMapsApi: boolean;
  otpProvider: 'FIREBASE' | 'TWILIO';
  mapProvider: 'GOOGLE' | 'AMAP' | 'OSM' | 'TENCENT';
  amapKey: string;
  amapSecurityCode: string;
  tencentKey?: string;
}

export interface WalletLog {
  id: string;
  type: 'MINT' | 'GRANT' | 'PURCHASE' | 'TRANSFER' | 'ORDER_COMMISSION' | 'VOUCHER_ISSUE' | 'VOUCHER_USE';
  userId?: string;
  userName?: string;
  operatorId: string;
  operatorName: string;
  amount: number;
  note: string;
  createdAt: string;
  voucherId?: string;
}

export interface PlatformRevenueLog {
  id: string;
  orderId: string;
  amount: number;
  createdAt: string;
  type?: string;
  driverId?: string;
  paymentSource?: 'POINTS' | 'VOUCHER' | 'MIXED'; 
}

export interface RegionConfig {
  id: string;
  name: string;
  status: RegionStatus;
  center: { lat: number; lng: number };
  sortOrder?: number;
  updatedAt: string;
}

export enum RegionStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  realSenderId?: string;
  type: MessageType;
  content: string;
  imageUrl?: string;
  timestamp: string;
  isRead: boolean;
  orderId?: string | null;
  metadata?: {
    status: 'sent' | 'uploading' | 'error';
    isAdminReply?: boolean;
    isSynced?: boolean;
  };
}

export interface PriceRule {
  id: string;
  startRegion: Region;
  endRegion: Region;
  basePrice: number;
  orderFee: number;
}

export interface FixedRouteRule {
  id: string;
  name: string;
  pickupKeywords: string[];
  dropoffKeywords: string[];
  price: number;
  isActive: boolean;
}

export interface SurchargeRule {
  id: string;
  name: string;
  condition: string;
  amount: number;
}

export interface LocationKeyword {
  id: string;
  keyword: string;
  regionId: Region;
}

export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  RESOLVED = 'RESOLVED',
}

export interface Ticket {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorRole: UserRole;
  category: string;
  subject: string;
  orderId?: string | null;
  status: TicketStatus;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
}

export enum VoucherType {
  DRIVER_FEE = 'DRIVER_FEE', 
  RIDE_DISCOUNT = 'RIDE_DISCOUNT' 
}

export interface Voucher {
  id: string;
  userId: string;
  type: VoucherType;
  title: string;
  description?: string;
  amount: number; 
  balance: number; 
  expiryDate?: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  createdAt: string;
  issuerId: string; 
}

export interface RouteQuote {
  startRegion: Region;
  endRegion: Region;
  basePrice: number;
  orderFee: number;
  surcharges: Record<string, number>;
  totalPrice: number;
  currency: string;
  note: string;
  isEstimate: boolean;
  pricingSystem: string;
}

export type BidStatus = 'PENDING' | 'WON' | 'LOST' | 'RETRACTED' | 'EXPIRED';

export interface OrderBid {
  id: string;
  orderId: string;
  driverId: string;
  driverName: string;
  driverScore?: number; 
  bidAmount: number;
  estimatedArrival: string; 
  vas?: string[]; 
  status: BidStatus;
  timestamp: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  complainantId: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
}