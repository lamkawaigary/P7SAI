
import React, { createContext, useContext } from 'react';
import { db, storage } from '../firebaseConfig';
import { doc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch, getDoc, increment } from 'firebase/firestore';
// @ts-ignore
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '../components/Toast';
import { User, DocStatus, DriverStatus, UserRole } from '../types';
import { compressImage, getLocalPreview } from '../utils/imageUtils';

interface CleanupReport {
    brokenCount: number;
    duplicateCount: number;
    totalDeleted: number;
}

interface UserContextType {
    createDirectUser: (user: Partial<User>) => Promise<void>;
    updateUser: (user: Partial<User>) => Promise<void>;
    deleteUser: (userId: string) => Promise<{success: boolean, message: string}>;
    adminResetUserPassword: (userId: string, newPass: string) => Promise<void>;
    mergeUserAccounts: (primaryId: string, secondaryId: string) => Promise<void>;
    performDatabaseCleanup: () => Promise<CleanupReport>; 
    dangerouslyClearAllUsers: () => Promise<void>;
    submitSpecificDoc: (userId: string, docType: string, file: File | null, number?: string, expiryDate?: string) => Promise<void>;
    updateDriverPlate: (userId: string, plates: any) => Promise<void>;
    adminReviewDoc: (userId: string, docType: string, status: DocStatus, reason?: string) => Promise<void>;
    adminApproveDriver: (userId: string) => Promise<void>;
    adminRejectDriver: (userId: string, reason: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const normalizePhone = (p: string) => {
    if (!p) return '';
    if (p.startsWith('+')) return p.trim();
    let digits = p.replace(/\D/g, '');
    if (digits.length === 8) return `+852${digits}`;
    if (digits.length === 11) return `+86${digits}`;
    return `+${digits}`;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    
    const dangerouslyClearAllUsers = async () => {
        try {
            const snap = await getDocs(collection(db, "users"));
            const batch = writeBatch(db);
            snap.docs.forEach(d => {
                batch.delete(d.ref);
            });
            await batch.commit();
            showToast("所有用戶資料已清空", "success");
        } catch (e: any) {
            showToast("清空失敗: " + e.message, "error");
        }
    };

    const performDatabaseCleanup = async (): Promise<CleanupReport> => {
        try {
            const snap = await getDocs(collection(db, "users"));
            const batch = writeBatch(db);
            let brokenCount = 0;
            let duplicateCount = 0;
            const phoneMap = new Map<string, string>(); 
            const idsToDelete = new Set<string>();

            snap.docs.forEach(d => {
                const u = d.data() as any;
                const isBroken = !u.phone || !u.role || !u.name || u.name === 'undefined';
                if (isBroken) {
                    idsToDelete.add(d.id);
                    brokenCount++;
                    return;
                }
                const normalized = normalizePhone(u.phone);
                if (phoneMap.has(normalized)) {
                    idsToDelete.add(d.id);
                    duplicateCount++;
                } else {
                    phoneMap.set(normalized, d.id);
                }
            });

            for (const id of Array.from(idsToDelete)) {
                batch.delete(doc(db, "users", id));
            }
            if (idsToDelete.size > 0) await batch.commit();
            
            return { brokenCount, duplicateCount, totalDeleted: idsToDelete.size };
        } catch (e: any) {
            console.error("Cleanup Error:", e);
            throw e;
        }
    };

    const createDirectUser = async (user: Partial<User>) => {
        try {
            const phone = normalizePhone(user.phone || '');
            const newId = user.id || doc(collection(db, "users")).id;
            await setDoc(doc(db, "users", newId), {
                ...user,
                id: newId,
                phone,
                points: Number(user.points) || 0,
                createdAt: new Date().toISOString()
            });
            showToast("用戶建立成功", "success");
        } catch (e: any) {
            showToast(e.message, "error");
        }
    };

    const updateUser = async (user: Partial<User>) => {
        if (!user.id) return;
        try {
            const userRef = doc(db, "users", user.id);
            const updates: any = { ...user };
            delete updates.id; 
            if (updates.phone) updates.phone = normalizePhone(updates.phone);
            await updateDoc(userRef, updates);
        } catch (e: any) {
            showToast("更新失敗: " + e.message, "error");
        }
    };

    const deleteUser = async (userId: string) => {
        try {
            await deleteDoc(doc(db, "users", userId));
            return { success: true, message: "已物理刪除" };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    };

    const adminResetUserPassword = async (userId: string, newPass: string) => {
        await updateDoc(doc(db, "users", userId), { password: newPass });
    };

    const mergeUserAccounts = async (primaryId: string, secondaryId: string) => {
        const batch = writeBatch(db);
        const secSnap = await getDoc(doc(db, "users", secondaryId));
        if (secSnap.exists()) {
            batch.update(doc(db, "users", primaryId), { points: increment(secSnap.data().points || 0) });
            batch.delete(doc(db, "users", secondaryId));
            await batch.commit();
        }
    };

    /**
     * 核心優化：證件提交 (Base64優先策略)
     * 1. 壓縮圖片 (1024px, 0.6) 確保清晰度且體積 < 300KB
     * 2. 轉 Base64 並直接寫入 Firestore，確保「已提交」狀態
     * 3. 後台嘗試上傳 Storage，成功則替換 URL
     */
    const submitSpecificDoc = async (userId: string, docType: string, file: File | null, number?: string, expiryDate?: string) => {
        let base64Url = '';
        let uploadFile: File | null = null;

        if (file) {
            // 證件需要較高清晰度，設置 1024px 和 0.6 質量
            uploadFile = await compressImage(file, 1024, 0.6);
            base64Url = await getLocalPreview(uploadFile);
        }
        
        const updates: any = {};
        if (base64Url) updates[`docs.${docType}.url`] = base64Url; // 先存 Base64
        if (number) updates[`docs.${docType}.number`] = number;
        if (expiryDate) updates[`updates.docs.${docType}.expiryDate`] = expiryDate;
        
        updates[`docs.${docType}.status`] = DocStatus.PENDING;
        updates[`docs.${docType}.updatedAt`] = new Date().toISOString();
        
        // 第一步：立即寫入 Firestore，讓用戶覺得「已提交」
        await updateDoc(doc(db, "users", userId), updates);

        // 第二步：後台嘗試上傳到 Storage (不阻塞)
        if (uploadFile) {
            const storageRef = ref(storage, `docs/${userId}/${docType}`);
            const uploadTask = uploadBytesResumable(storageRef, uploadFile);
            
            uploadTask.on('state_changed', null, 
                (err) => console.warn("Doc Upload Failed (Base64 kept):", err),
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    // 上傳成功，替換 Base64 為短網址
                    await updateDoc(doc(db, "users", userId), { [`docs.${docType}.url`]: downloadURL });
                }
            );
        }
    };

    const updateDriverPlate = async (userId: string, plates: any) => {
        await updateDoc(doc(db, "users", userId), { plates });
    };

    const adminReviewDoc = async (userId: string, docType: string, status: DocStatus, reason?: string) => {
        const updates: any = {};
        updates[`docs.${docType}.status`] = status;
        if (reason) updates[`docs.${docType}.rejectReason`] = reason;
        updates[`docs.${docType}.reviewedAt`] = new Date().toISOString();
        await updateDoc(doc(db, "users", userId), updates);
    };

    const adminApproveDriver = async (userId: string) => { 
        await updateDoc(doc(db, "users", userId), { 
            driverStatus: DriverStatus.APPROVED,
            updatedAt: new Date().toISOString()
        }); 
    };

    const adminRejectDriver = async (userId: string, reason: string) => { 
        await updateDoc(doc(db, "users", userId), { 
            driverStatus: DriverStatus.REJECTED, 
            rejectionReason: reason,
            updatedAt: new Date().toISOString()
        }); 
    };

    return (
        <UserContext.Provider value={{
            createDirectUser, updateUser, deleteUser, adminResetUserPassword, mergeUserAccounts, performDatabaseCleanup, dangerouslyClearAllUsers,
            submitSpecificDoc, updateDriverPlate, adminReviewDoc, adminApproveDriver, adminRejectDriver
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUser error');
    return context;
};
