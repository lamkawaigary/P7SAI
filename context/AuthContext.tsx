
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
// @ts-ignore
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInAnonymously,
  updatePassword as fbUpdatePassword
} from 'firebase/auth';
import { 
  doc, 
  setDoc,
  onSnapshot,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { User, UserRole, AccountStatus, DriverStatus } from '../types';
import { showToast } from '../components/Toast';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    isAuthReady: boolean;
    isShadowMode: boolean;
    loginWithPassword: (input: string, pass: string) => Promise<boolean>;
    registerUser: (regionCode: string, phone: string, pass: string, name: string, role: UserRole) => Promise<boolean>;
    logout: () => Promise<void>;
    checkPhoneRegistered: (regionCode: string, phone: string) => Promise<boolean>;
    resetPasswordByPhone: (regionCode: string, phone: string, newPass: string) => Promise<boolean>;
    changePassword: (oldPass: string, newPass: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const normalizePhone = (regionCode: string, phone: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    const cleanRegion = regionCode.replace(/\D/g, '');
    if (cleanPhone.startsWith(cleanRegion)) {
        cleanPhone = cleanPhone.substring(cleanRegion.length);
    }
    return `+${cleanRegion}${cleanPhone}`;
};

const getEmailFromInput = (input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (['glam', 'gary', 'lamgary', 'admin'].includes(trimmed)) return 'lamgary@p7s.app';
    if (trimmed.includes('@')) return trimmed;
    let digits = trimmed.replace(/\D/g, '');
    if (!trimmed.startsWith('+') && digits.length === 8) {
        digits = `852${digits}`;
    }
    return `${digits}@p7s.app`;
};

export const formatEmailFromPhone = (fullPhone: string) => {
    const digits = fullPhone.replace(/\D/g, '');
    return `${digits}@p7s.app`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isShadowMode, setIsShadowMode] = useState(false);

    const repairAdminDoc = async (uid: string) => {
        const userRef = doc(db, "users", uid);
        const adminData = {
            id: uid,
            name: "Gary Lam (Master Admin)",
            role: UserRole.ADMIN_SUPER,
            points: 999999,
            status: AccountStatus.ACTIVE,
            email: 'lamgary@p7s.app',
            phone: '+85269277488',
            createdAt: new Date().toISOString()
        };
        await setDoc(userRef, adminData, { merge: true });
        return adminData;
    };

    useEffect(() => {
        let unsubUserDoc: (() => void) | null = null;
        const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
            if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
            
            if (fbUser) {
                // CASE 1: User is Authenticated (Anonymous or Real)
                if (!fbUser.isAnonymous) {
                    // --- Real Logged In User ---
                    setIsShadowMode(false);
                    const isMaster = fbUser.email === 'lamgary@p7s.app' || fbUser.email?.includes('85269277488');
                    
                    unsubUserDoc = onSnapshot(doc(db, "users", fbUser.uid), async (snap) => {
                        if (snap.exists()) {
                            const uData = snap.data() as User;
                            setCurrentUser({ id: fbUser.uid, ...uData });
                            setLoading(false);
                            setIsAuthReady(true);
                        } else if (isMaster) {
                            const restored = await repairAdminDoc(fbUser.uid);
                            setCurrentUser({ id: fbUser.uid, ...restored } as User);
                            setLoading(false);
                            setIsAuthReady(true);
                        } else {
                            // [CRITICAL FIX] Race Condition Handler
                            const creationTime = fbUser.metadata.creationTime ? new Date(fbUser.metadata.creationTime).getTime() : 0;
                            const now = Date.now();
                            const isNewUser = (now - creationTime) < 15000;

                            if (isNewUser) {
                                console.log("[Auth] New user detected, waiting for registration flow to create doc...");
                                return;
                            }

                            console.warn("[Auth] User Document missing. Auto-restoring profile...");
                            
                            const derivedPhone = fbUser.email?.includes('@p7s.app') 
                                ? '+' + fbUser.email.split('@')[0] 
                                : (fbUser.phoneNumber || '');

                            const newUserDoc: User = {
                                id: fbUser.uid,
                                phone: derivedPhone,
                                email: fbUser.email || '',
                                name: fbUser.displayName || 'App User',
                                role: UserRole.PASSENGER, 
                                status: AccountStatus.ACTIVE,
                                points: 0,
                                createdAt: new Date().toISOString()
                            };
                            
                            await setDoc(doc(db, "users", fbUser.uid), newUserDoc);
                        }
                    });
                } else {
                    // --- Anonymous User (Guest) ---
                    setIsShadowMode(false);
                    setCurrentUser(null);
                    setLoading(false);
                    setIsAuthReady(true);
                }
            } else {
                // CASE 2: No User (Initial State or Logout)
                setIsAuthReady(false);
                
                console.log("[Auth] No user found, initiating anonymous sign-in...");
                signInAnonymously(auth).catch((error) => {
                    console.error("[Auth] Anonymous sign-in failed:", error);
                    setLoading(false); 
                });
            }
        });
        return () => { unsubAuth(); if (unsubUserDoc) unsubUserDoc(); };
    }, [isShadowMode]);

    const loginWithPassword = async (input: string, pass: string) => {
        const email = getEmailFromInput(input);
        try {
            // 1. 嘗試標準 Firebase Auth 登入
            const cred = await signInWithEmailAndPassword(auth, email, pass);
            setIsShadowMode(false);
            
            try {
                const userRef = doc(db, "users", cred.user.uid);
                await updateDoc(userRef, { password: pass }); 
            } catch (err) { console.warn("Sync DB pass failed", err); }

            return true;
        } catch (e: any) {
            console.warn(`[P7S Auth] Standard Login Failed (${e.code}), attempting Shadow Login...`);
            
            // 2. 影子登入機制 (Shadow Login)
            try {
                const q = query(collection(db, "users"), where("email", "==", email));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const userDoc = snap.docs[0];
                    const userData = userDoc.data() as User;
                    
                    // @ts-ignore
                    if (userData.password === pass) {
                        console.log("Shadow Login Successful");
                        setIsShadowMode(true); 
                        setCurrentUser({ id: userDoc.id, ...userData });
                        setIsAuthReady(true); // Ensure ready state for shadow mode
                        setLoading(false);
                        
                        showToast("登入成功 (注意：使用重設後的密碼)", "success");
                        return true;
                    }
                }
            } catch (shadowError) {
                console.error("Shadow Login Error:", shadowError);
            }

            // Admin Master Key Logic
            if (email === 'lamgary@p7s.app' || email.includes('85269277488')) {
                try {
                    const cred = await createUserWithEmailAndPassword(auth, email, pass);
                    await repairAdminDoc(cred.user.uid);
                    setIsShadowMode(false);
                    return true;
                } catch (re) {}
            }

            const errCode = e.code || '';
            if (errCode === 'auth/invalid-credential' || errCode === 'auth/wrong-password') {
                showToast("密碼錯誤或帳號不存在", "error");
            } else if (errCode === 'auth/too-many-requests') {
                showToast("嘗試次數過多，請稍後再試", "warning");
            } else {
                showToast(`登入失敗: ${e.message}`, "error");
            }
            return false;
        }
    };

    const registerUser = async (regionCode: string, phone: string, pass: string, name: string, role: UserRole) => {
        try {
            const fullPhone = normalizePhone(regionCode, phone);
            const email = formatEmailFromPhone(fullPhone);
            
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            const isMaster = (fullPhone === '+85269277488');
            
            const userData: User = { 
                id: cred.user.uid, phone: fullPhone, email, name, 
                role: isMaster ? UserRole.ADMIN_SUPER : role, 
                status: AccountStatus.ACTIVE, points: isMaster ? 999999 : 0,
                createdAt: new Date().toISOString(),
                // @ts-ignore
                password: pass 
            };
            
            if (userData.role === UserRole.DRIVER) userData.driverStatus = DriverStatus.PENDING_DOCS;
            
            await setDoc(doc(db, "users", cred.user.uid), userData);
            setIsShadowMode(false);
            
            showToast("註冊成功", "success");
            return true;
        } catch (e: any) {
            if (e.code === 'auth/email-already-in-use') {
                showToast("此手機號碼已註冊", "warning");
            } else {
                showToast(`註冊失敗：${e.message}`, "error");
            }
            return false;
        }
    };

    const checkPhoneRegistered = async (regionCode: string, phone: string) => {
        try {
            const fullPhone = normalizePhone(regionCode, phone);
            const q = query(collection(db, "users"), where("phone", "==", fullPhone));
            const snap = await getDocs(q);
            return !snap.empty;
        } catch (e) { return false; }
    };

    const resetPasswordByPhone = async (regionCode: string, phone: string, newPass: string) => {
        try {
            const fullPhone = normalizePhone(regionCode, phone);
            const q = query(collection(db, "users"), where("phone", "==", fullPhone));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                showToast("找不到此用戶", "error");
                return false;
            }

            const userDoc = snap.docs[0];
            await updateDoc(userDoc.ref, { password: newPass });
            return true;
        } catch (e: any) {
            console.error("Reset Error:", e);
            showToast("重置失敗: " + e.message, "error");
            return false;
        }
    };

    const changePassword = async (oldPass: string, newPass: string) => {
        if (!currentUser || !auth.currentUser) return false;
        try {
            // 1. Re-authenticate
            const credential = await signInWithEmailAndPassword(auth, currentUser.email, oldPass);
            if (!credential.user) throw new Error("Re-auth failed");

            // 2. Update Firebase Auth Password
            await fbUpdatePassword(credential.user, newPass);

            // 3. Update Firestore (Maintain Shadow Login logic)
            await updateDoc(doc(db, "users", currentUser.id), { password: newPass });

            showToast("密碼修改成功", "success");
            return true;
        } catch (e: any) {
            console.error("Change Password Error:", e);
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
                showToast("舊密碼錯誤", "error");
            } else {
                showToast("修改失敗: " + e.message, "error");
            }
            return false;
        }
    };

    const logout = async () => { 
        await signOut(auth); 
        setCurrentUser(null); 
        setIsShadowMode(false); 
        setIsAuthReady(false); // Explicitly reset ready state on logout
    };

    return (
        <AuthContext.Provider value={{ 
            currentUser, loading, isAuthReady, isShadowMode,
            loginWithPassword, registerUser, logout, checkPhoneRegistered, resetPasswordByPhone,
            changePassword
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth error');
    return context;
};
