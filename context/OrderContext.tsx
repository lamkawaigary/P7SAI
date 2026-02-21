
import React, { createContext, useContext } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, updateDoc, doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { Order, OrderStatus, DriverRoute, RouteQuote, LocationData, Region, OrderType, OfficialRoute } from '../types';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';
import { identifyRegionAI, estimateTripDetails } from '../services/geminiService';
import { getMatrixPrice } from '../services/pricingService';
import { cancelOrderService } from '../services/orderService';
import { showToast } from '../components/Toast';

interface OrderContextType {
    createOrder: (order: Partial<Order>) => Promise<void>;
    acceptOrder: (orderId: string, driverId: string) => Promise<boolean>;
    completeOrder: (orderId: string) => Promise<void>;
    cancelOrder: (orderId: string) => Promise<void>; 
    publishRoute: (route: Partial<DriverRoute>) => Promise<void>;
    cancelRoute: (id: string) => Promise<void>;
    getRouteQuote: (pickup: LocationData, dropoff: LocationData, dateStr: string) => Promise<RouteQuote>;
    createOfficialRoute: (route: Partial<OfficialRoute>) => Promise<void>;
    joinOfficialRoute: (route: OfficialRoute, paxCount: number) => Promise<void>;
    leaveOfficialRoute: (orderId: string) => Promise<void>; // 新增
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { pricingConfig, systemSettings } = useDatabase();

    const cancelOrder = async (orderId: string) => cancelOrderService(orderId);

    const getRouteQuote = async (pickup: LocationData & { regionId?: Region }, dropoff: LocationData & { regionId?: Region }, dateStr: string): Promise<RouteQuote> => {
        const fromRegion = pickup.regionId || await identifyRegionAI(pickup.placeName || pickup.address);
        const toRegion = dropoff.regionId || await identifyRegionAI(dropoff.placeName || dropoff.address);
        const matrixRule = await getMatrixPrice(fromRegion, toRegion);
        const stats = await estimateTripDetails(pickup, dropoff, 'AMAP', systemSettings.amapKey, systemSettings.amapSecurityCode);
        const km = stats.distanceKm;
        
        let mileageCost = 0;
        if (matrixRule) {
            mileageCost = matrixRule.basePrice;
        } else {
            if (km > 10) {
                if (km <= 50) mileageCost = (km - 10) * pricingConfig.tier1Rate;
                else if (km <= 100) mileageCost = (40 * pricingConfig.tier1Rate) + ((km - 50) * pricingConfig.tier2Rate);
                else mileageCost = (40 * pricingConfig.tier1Rate) + (50 * pricingConfig.tier2Rate) + ((km - 100) * pricingConfig.tier3Rate);
            }
        }
        const finalTotal = Math.ceil(Math.max(pricingConfig.minSpend, mileageCost));
        return { startRegion: fromRegion, endRegion: toRegion, basePrice: finalTotal, orderFee: Math.ceil(finalTotal * pricingConfig.driverFeePercentage), surcharges: {}, totalPrice: finalTotal, currency: 'HKD', note: '', isEstimate: !matrixRule, pricingSystem: matrixRule ? 'matrix' : 'distance' };
    };

    const createOrder = async (orderData: any) => {
        if (!currentUser) return;
        await addDoc(collection(db, "orders"), { ...orderData, passengerId: currentUser.id, status: OrderStatus.PENDING, createdAt: new Date().toISOString() });
    };

    const createOfficialRoute = async (routeData: Partial<OfficialRoute>) => {
        await addDoc(collection(db, "official_routes"), {
            ...routeData,
            status: 'COLLECTING',
            occupiedSeats: 0,
            createdAt: new Date().toISOString()
        });
    };

    const joinOfficialRoute = async (route: OfficialRoute, paxCount: number) => {
        if (!currentUser) return;
        try {
            await runTransaction(db, async (tx) => {
                const routeRef = doc(db, "official_routes", route.id);
                const routeSnap = await tx.get(routeRef);
                if (!routeSnap.exists()) throw new Error("班次不存在");
                const data = routeSnap.data();
                const currentOccupied = data.occupiedSeats || 0;
                const total = data.totalSeats || 6;
                
                if (currentOccupied + paxCount > total) throw new Error("席位不足");

                tx.update(routeRef, { occupiedSeats: increment(paxCount) });

                const orderRef = doc(collection(db, "orders"));
                tx.set(orderRef, {
                    passengerId: currentUser.id,
                    officialRouteId: route.id,
                    pickup: route.pickup,
                    dropoff: route.dropoff,
                    type: OrderType.CARPOOL,
                    status: OrderStatus.WAITING_FOR_DRIVER,
                    price: route.pricePerSeat * paxCount,
                    platformFee: 0,
                    date: route.date,
                    isOfficial: true,
                    passengersCount: paxCount,
                    createdAt: new Date().toISOString()
                });
            });
            showToast("預訂成功", "success");
        } catch (e: any) {
            showToast(e.message, "error");
            throw e;
        }
    };

    // 新增：退出官方班次
    const leaveOfficialRoute = async (orderId: string) => {
        if (!currentUser) return;
        try {
            await runTransaction(db, async (tx) => {
                const orderRef = doc(db, "orders", orderId);
                const orderSnap = await tx.get(orderRef);
                if (!orderSnap.exists()) throw new Error("訂單不存在");
                const oData = orderSnap.data() as Order;
                
                if (oData.status === OrderStatus.COMPLETED || oData.status === OrderStatus.CANCELLED) {
                    throw new Error("行程已結束，無法取消");
                }

                if (oData.driverId) {
                    throw new Error("司機已接單，請聯繫客服取消");
                }

                if (oData.officialRouteId) {
                    const routeRef = doc(db, "official_routes", oData.officialRouteId);
                    tx.update(routeRef, { 
                        occupiedSeats: increment(-oData.passengersCount) 
                    });
                }

                tx.update(orderRef, { 
                    status: OrderStatus.CANCELLED,
                    updatedAt: serverTimestamp() 
                });
            });
            showToast("已成功取消預訂", "success");
        } catch (e: any) {
            showToast(e.message, "error");
        }
    };

    const acceptOrder = async (orderId: string, driverId: string) => {
        try {
            await runTransaction(db, async (tx) => {
                const orderRef = doc(db, "orders", orderId);
                const orderSnap = await tx.get(orderRef);
                if (!orderSnap.exists() || orderSnap.data().status !== 'PENDING') throw new Error("訂單已失效");
                const fee = orderSnap.data().platformFee || 0;
                const driverRef = doc(db, "users", driverId);
                const driverSnap = await tx.get(driverRef);
                if ((driverSnap.data()?.points || 0) < fee) throw new Error("點數不足");
                tx.update(orderRef, { driverId, status: OrderStatus.ACCEPTED, updatedAt: serverTimestamp() });
                tx.update(driverRef, { points: increment(-fee) });
            });
            return true;
        } catch (e: any) { showToast(e.message, "error"); return false; }
    };

    const completeOrder = async (id: string) => { 
        await updateDoc(doc(db, "orders", id), { status: OrderStatus.COMPLETED, completedAt: new Date().toISOString() }); 
    };
    
    const publishRoute = async (r: any) => { await addDoc(collection(db, "routes"), { ...r, driverId: currentUser?.id, status: 'ACTIVE' }); };
    const cancelRoute = async (id: string) => { await updateDoc(doc(db, "routes", id), { status: 'CANCELLED' }); };

    return (
        <OrderContext.Provider value={{
            createOrder, acceptOrder, completeOrder, cancelOrder, publishRoute, cancelRoute, getRouteQuote,
            createOfficialRoute, joinOfficialRoute, leaveOfficialRoute
        }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrder = () => {
    const context = useContext(OrderContext);
    if (!context) throw new Error('useOrder error');
    return context;
};
