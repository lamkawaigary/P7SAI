
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebaseConfig';
import { 
    doc, collection, onSnapshot, query, where, limit, setDoc, or, and, orderBy, Unsubscribe 
} from 'firebase/firestore';
import { 
    User, Order, DriverRoute, Dispute, Message, MessageType, OrderStatus, OrderType,
    PriceRule, FixedRouteRule, SurchargeRule, WalletLog, PlatformRevenueLog, 
    SystemSettings, PricingConfig, Ticket, LocationKeyword, UserRole, RegionConfig, RegionStatus 
} from '../types';
import { useAuth } from './AuthContext';
import { testGeminiConnection } from '../services/geminiService';
import { showToast } from '../components/Toast';

const sanitizeValue = (val: any): any => {
    if (val === null || val === undefined) return val;
    if (val && typeof val.toDate === 'function') return val.toDate().toISOString();
    if (val && val.path && val.firestore) return val.path;
    if (Array.isArray(val)) return val.map(sanitizeValue);
    if (typeof val === 'object') {
        const cleaned: any = {};
        Object.keys(val).forEach(key => cleaned[key] = sanitizeValue(val[key]));
        return cleaned;
    }
    return val;
};

const sanitizeDoc = <T,>(docSnap: any): T => {
    const data = docSnap.data();
    const clean: any = { id: docSnap.id };
    if (!data) return clean as T;
    Object.keys(data).forEach(key => clean[key] = sanitizeValue(data[key]));
    return clean as T;
};

interface DatabaseContextType {
    users: User[];
    orders: Order[];
    routes: DriverRoute[];
    disputes: Dispute[];
    messages: Message[];
    tickets: Ticket[]; 
    priceRules: PriceRule[];
    fixedRouteRules: FixedRouteRule[]; 
    locationKeywords: LocationKeyword[];
    surchargeRules: SurchargeRule[];
    walletLogs: WalletLog[];
    revenueLogs: PlatformRevenueLog[];
    regionConfigs: RegionConfig[];
    systemSettings: SystemSettings;
    pricingConfig: PricingConfig;
    platformPoints: number;
    connectionLogs: any[];
    checkConnection: () => Promise<any>;
    toggleSystemSetting: (key: keyof SystemSettings) => void;
    updatePricingConfig: (config: Partial<PricingConfig>) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, isAuthReady } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [routes, setRoutes] = useState<DriverRoute[]>([]);
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]); 
    const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
    const [fixedRouteRules, setFixedRouteRules] = useState<FixedRouteRule[]>([]);
    const [locationKeywords, setLocationKeywords] = useState<LocationKeyword[]>([]);
    const [surchargeRules, setSurchargeRules] = useState<SurchargeRule[]>([]);
    const [walletLogs, setWalletLogs] = useState<WalletLog[]>([]);
    const [revenueLogs, setRevenueLogs] = useState<PlatformRevenueLog[]>([]);
    const [regionConfigs, setRegionConfigs] = useState<RegionConfig[]>([]); 
    const [platformPoints, setPlatformPoints] = useState(0);
    
    const [systemSettings, setSystemSettings] = useState<SystemSettings>({ 
        maintenanceMode: false, enableMapsApi: true, otpProvider: 'TWILIO', mapProvider: 'OSM', 
        amapKey: '5b2dee0f8109d5d4b477d094a2caa2d1', amapSecurityCode: '9f06503ac3797f72eb6ffc7a7b041085',
        tencentKey: 'D42BZ-JZFCL-A2QPT-E2EKZ-D2WX5-VPFWY'
    });
    
    const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
        activeSystem: 'distance',
        minSpend: 600,
        tier1Rate: 12,
        tier2Rate: 10,
        tier3Rate: 8,
        midnightSurcharge: 100,
        driverFeePercentage: 0.08 
    });
    const [connectionLogs, setConnectionLogs] = useState<any[]>([]);

    useEffect(() => {
        if (!isAuthReady) return;
        const unsubs: Unsubscribe[] = [];
        const onError = (ctx: string) => (err: any) => { if (err?.code !== 'permission-denied') console.warn(`[DB] ${ctx} sync error:`, err); };
        
        unsubs.push(onSnapshot(doc(db, "settings", "global"), (snap) => snap.exists() && setSystemSettings(prev => ({ ...prev, ...snap.data() })), onError("Settings")));
        unsubs.push(onSnapshot(doc(db, "config", "pricing"), (snap) => snap.exists() && setPricingConfig(prev => ({ ...prev, ...snap.data() })), onError("Pricing")));
        
        // 監聽國庫點數
        unsubs.push(onSnapshot(doc(db, "settings", "platform_wallet"), (snap) => {
            if (snap.exists()) {
                setPlatformPoints(snap.data().totalPoints || 0);
            }
        }, onError("Treasury")));

        unsubs.push(onSnapshot(collection(db, "region_configs"), (snap) => setRegionConfigs(snap.docs.map(d => ({ ...d.data() } as RegionConfig))), onError("Regions")));
        unsubs.push(onSnapshot(query(collection(db, "routes"), where("status", "==", "ACTIVE"), limit(100)), (s) => setRoutes(s.docs.map(d => sanitizeDoc<DriverRoute>(d))), onError("Routes")));

        if (!currentUser) {
            unsubs.push(onSnapshot(query(collection(db, "orders"), where("status", "==", OrderStatus.PENDING), limit(100)), (s) => setOrders(s.docs.map(d => sanitizeDoc<Order>(d))), onError("Guest Orders")));
            setUsers([]); setMessages([]); setWalletLogs([]);
        } else {
            const isAdmin = [UserRole.ADMIN_SUPER, UserRole.ADMIN_CS, UserRole.ADMIN_DB].includes(currentUser.role);
            const msgCol = collection(db, "messages");
            if (isAdmin) {
                unsubs.push(onSnapshot(query(msgCol, orderBy("timestamp", "desc"), limit(500)), (s) => setMessages(s.docs.map(d => sanitizeDoc<Message>(d))), onError("Admin Msgs")));
                unsubs.push(onSnapshot(query(collection(db, "users"), limit(500)), (s) => setUsers(s.docs.map(d => sanitizeDoc<User>(d))), onError("Users")));
                unsubs.push(onSnapshot(query(collection(db, "wallet_logs"), orderBy("createdAt", "desc"), limit(100)), (s) => setWalletLogs(s.docs.map(d => sanitizeDoc<WalletLog>(d))), onError("Wallet Logs")));
            } else {
                const allMsgs = new Map<string, Message>();
                const syncMessages = (snap: any) => { snap.docs.forEach((d: any) => allMsgs.set(d.id, sanitizeDoc<Message>(d))); const sorted = Array.from(allMsgs.values()).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); setMessages(sorted); };
                unsubs.push(onSnapshot(query(msgCol, where("senderId", "==", currentUser.id), limit(100)), syncMessages, onError("Sent Msgs")));
                unsubs.push(onSnapshot(query(msgCol, or(where("receiverId", "==", currentUser.id), where("receiverId", "==", "ALL")), limit(100)), syncMessages, onError("Recv Msgs")));
            }

            const ordersQuery = query(
                collection(db, "orders"),
                or(
                    where("passengerId", "==", currentUser.id),
                    where("driverId", "==", currentUser.id),
                    where("status", "==", OrderStatus.PENDING)
                )
            );
            unsubs.push(onSnapshot(ordersQuery, (s) => setOrders(s.docs.map(d => sanitizeDoc<Order>(d))), onError("Combined Orders")));
        }
        return () => unsubs.forEach(u => u());
    }, [isAuthReady, currentUser?.id]);

    const toggleSystemSetting = async (key: keyof SystemSettings) => { await setDoc(doc(db, "settings", "global"), { [key]: !systemSettings[key] }, { merge: true }); };
    const updatePricingConfig = async (config: Partial<PricingConfig>) => { await setDoc(doc(db, "config", "pricing"), config, { merge: true }); };
    const checkConnection = async () => { const start = Date.now(); const res = await testGeminiConnection(); const log = { timestamp: new Date().toISOString(), message: res.message, latency: Date.now() - start, status: res.success ? 'ONLINE' : 'ERROR' }; setConnectionLogs(prev => [log, ...prev.slice(0, 9)]); return log; };

    return (
        <DatabaseContext.Provider value={{
            users, orders, routes, disputes, messages, tickets, priceRules, fixedRouteRules, locationKeywords, surchargeRules,
            walletLogs, revenueLogs, regionConfigs, systemSettings, pricingConfig, platformPoints, 
            connectionLogs, checkConnection, toggleSystemSetting, updatePricingConfig
        }}>
            {children}
        </DatabaseContext.Provider>
    );
};

export const useDatabase = () => {
    const context = useContext(DatabaseContext);
    if (!context) throw new Error('useDatabase must be used within a DatabaseProvider');
    return context;
};
