
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, getDoc, writeBatch, serverTimestamp, setDoc, collection, increment, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { showToast } from '../components/Toast';
import { Voucher, VoucherType } from '../types';

interface WalletContextType {
    mintPoints: (amount: number) => Promise<void>;
    adminGrantPoints: (userId: string, amount: number, note: string) => Promise<void>;
    csTransferPoints: (userId: string, amount: number, note: string) => Promise<boolean>;
    purchasePoints: (amount: number) => Promise<boolean>;
    
    // Voucher API
    vouchers: Voucher[];
    issueVoucher: (userId: string, type: VoucherType, amount: number, title: string, daysValid?: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);

    // 監聽當前用戶的消費券錢包
    useEffect(() => {
        if (!currentUser) {
            setVouchers([]);
            return;
        }

        const q = query(
            collection(db, "users", currentUser.id, "vouchers"),
            where("status", "==", "ACTIVE"),
            orderBy("expiryDate", "asc") // 優先顯示快過期的
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Voucher));
            setVouchers(list);
        }, (err: any) => {
            // Suppress permission errors (common during auth transitions or rule updates)
            if (err?.code !== 'permission-denied') {
                console.warn("[Wallet] Voucher sync error:", err);
            }
        });

        return () => unsubscribe();
    }, [currentUser?.id]);

    const validateId = (id: string | undefined, context: string) => {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            throw new Error(`[${context}] Invalid User ID.`);
        }
    };

    const mintPoints = async (amount: number) => {
        if (!currentUser?.role?.includes('ADMIN_SUPER')) return;
        try {
            await setDoc(doc(db, "settings", "platform_wallet"), { 
                totalPoints: increment(amount),
                updatedAt: serverTimestamp()
            }, { merge: true });
            
            const batch = writeBatch(db);
            const logRef = doc(collection(db, "wallet_logs"));
            batch.set(logRef, {
                type: 'MINT', amount, operatorId: currentUser.id, operatorName: currentUser.name,
                createdAt: new Date().toISOString(), note: '系統國庫印鈔'
            });
            await batch.commit();
            showToast(`國庫已增發 ${amount} 積分`, "success");
        } catch (e) { 
            console.error("Mint Error:", e); 
            showToast("增發失敗", "error"); 
        }
    };

    const adminGrantPoints = async (targetUserId: string, amount: number, note: string) => {
        validateId(targetUserId, "AdminGrant");
        if (!currentUser) return;
        try {
            const batch = writeBatch(db);
            const treasuryRef = doc(db, "settings", "platform_wallet");
            batch.set(treasuryRef, { totalPoints: increment(-amount) }, { merge: true });

            const userRef = doc(db, "users", targetUserId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) throw new Error("Target user not found");
            const targetName = userDoc.data().name || '未知用戶';
            
            batch.update(userRef, { points: increment(amount) });

            const logRef = doc(collection(db, "wallet_logs"));
            batch.set(logRef, {
                type: 'GRANT', userId: targetUserId, userName: targetName,
                operatorId: currentUser.id, operatorName: currentUser.name,
                amount, note, createdAt: new Date().toISOString()
            });

            await batch.commit();
            showToast(`已向 ${targetName} 發放 ${amount} 積分`, "success");
        } catch (e: any) { 
            console.error("Grant Error:", e); 
            showToast("發放失敗: " + e.message, "error"); 
        }
    };

    const csTransferPoints = async (targetUserId: string, amount: number, note: string) => {
        validateId(targetUserId, "CsTransfer");
        if (!currentUser) return false;
        if (currentUser.points < amount) {
            showToast("個人帳戶點數不足", "error");
            return false;
        }
        try {
            const batch = writeBatch(db);
            const csRef = doc(db, "users", currentUser.id);
            batch.update(csRef, { points: increment(-amount) });

            const userRef = doc(db, "users", targetUserId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) throw new Error("Target user not found");
            const targetName = userDoc.data().name || '未知用戶';
            
            batch.update(userRef, { points: increment(amount) });

            const logRef = doc(collection(db, "wallet_logs"));
            batch.set(logRef, {
                type: 'TRANSFER', userId: targetUserId, userName: targetName,
                operatorId: currentUser.id, operatorName: currentUser.name,
                amount, note, createdAt: new Date().toISOString()
            });

            await batch.commit();
            showToast("轉帳成功", "success");
            return true;
        } catch (e: any) { 
            console.error("Transfer Error:", e); 
            showToast("轉帳失敗: " + e.message, "error"); 
            return false; 
        }
    };

    const purchasePoints = async (amount: number) => {
        if (!currentUser) return false;
        try {
            const batch = writeBatch(db);
            const userRef = doc(db, "users", currentUser.id);
            batch.update(userRef, { points: increment(amount) });
            const logRef = doc(collection(db, "wallet_logs"));
            batch.set(logRef, {
                type: 'PURCHASE', userId: currentUser.id, userName: currentUser.name,
                operatorId: 'SYSTEM', operatorName: 'Payment Gateway',
                amount, note: '線上充值', createdAt: new Date().toISOString()
            });
            await batch.commit();
            showToast("充值成功", "success");
            return true;
        } catch (e) { 
            console.error("Purchase Error:", e); 
            return false; 
        }
    };

    // 新增：發放消費券
    const issueVoucher = async (userId: string, type: VoucherType, amount: number, title: string, daysValid = 30) => {
        if (!currentUser) return;
        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + daysValid);

            const userRef = doc(db, "users", userId);
            const voucherRef = doc(collection(db, "users", userId, "vouchers"));
            const logRef = doc(collection(db, "wallet_logs"));

            const userDoc = await getDoc(userRef);
            const userName = userDoc.exists() ? userDoc.data().name : 'Unknown';

            const newVoucher: Voucher = {
                id: voucherRef.id,
                userId,
                type,
                title,
                amount,
                balance: amount, // 初始餘額等於面額
                status: 'ACTIVE',
                expiryDate: expiryDate.toISOString(),
                createdAt: new Date().toISOString(),
                issuerId: currentUser.id
            };

            const batch = writeBatch(db);
            batch.set(voucherRef, newVoucher);
            batch.set(logRef, {
                type: 'VOUCHER_ISSUE',
                userId, userName,
                amount,
                operatorId: currentUser.id,
                operatorName: currentUser.name,
                note: `發放 ${title} (券號: ${voucherRef.id.slice(-6)})`,
                createdAt: new Date().toISOString(),
                voucherId: voucherRef.id
            });

            await batch.commit();
            showToast("消費券已發放", "success");
        } catch (e: any) {
            console.error("Issue Voucher Error:", e);
            showToast("發放失敗: " + e.message, "error");
        }
    };

    return (
        <WalletContext.Provider value={{ 
            mintPoints, adminGrantPoints, csTransferPoints, purchasePoints,
            vouchers, issueVoucher
        }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) throw new Error('useWallet error');
    return context;
};
