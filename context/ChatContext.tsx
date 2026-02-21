
import React, { createContext, useContext, useState } from 'react';
import { db, storage } from '../firebaseConfig';
import { collection, addDoc, doc, getDocs, query, where, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';
// @ts-ignore
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from './AuthContext';
import { TicketStatus, MessageType, UserRole } from '../types';
import { showToast } from '../components/Toast';
import { compressImage, getLocalPreview } from '../utils/imageUtils';

interface ChatContextType {
    sendMessage: (receiverId: string, content: string, file?: File, orderId?: string, ticketId?: string) => Promise<void>;
    sendBroadcast: (content: string, title?: string) => Promise<void>;
    markAsRead: (senderId: string) => Promise<void>;
    createTicket: (subject: string, category: string, orderId?: string) => Promise<string | null>;
    claimTicket: (ticketId: string) => Promise<boolean>;
    resolveTicket: (ticketId: string) => Promise<boolean>;
    // 抽屜控制狀態
    isDrawerOpen: boolean;
    activePartnerId: string | null;
    activeOrderId: string | null;
    openChat: (partnerId: string, orderId?: string) => void;
    closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

    /**
     * 開啟聊天窗口
     */
    const openChat = (pid: string, oid?: string) => {
        setActivePartnerId(pid || null);
        setActiveOrderId(oid || null);
        setIsDrawerOpen(true);
        if (pid) markAsRead(pid); 
    };

    const closeChat = () => {
        setIsDrawerOpen(false);
        setActivePartnerId(null);
        setActiveOrderId(null);
    };

    /**
     * 核心發送 API：支持文字與圖片 (Base64 直寫 + 後台異步上傳)
     */
    const sendMessage = async (receiverId: string, content: string, file?: File, orderId?: string, ticketId?: string) => {
        if (!currentUser) {
            showToast("請先登入系統", "warning");
            return;
        }

        try {
            const isAdmin = [UserRole.ADMIN_SUPER, UserRole.ADMIN_CS, UserRole.ADMIN_DB].includes(currentUser.role);
            const senderId = isAdmin && receiverId !== 'SYSTEM_ADMIN' ? 'SYSTEM_ADMIN' : currentUser.id;
            const timestamp = new Date().toISOString();
            
            let imageUrl = '';
            let compressedFile: File | null = null;

            if (file) {
                // 1. 聊天圖片壓縮：800px, 0.5 (確保 Base64 小於 100KB)
                compressedFile = await compressImage(file, 800, 0.5);
                // 2. 獲取 Base64 作為預設 imageUrl
                imageUrl = await getLocalPreview(compressedFile);
            }

            // 3. 立即寫入 Firestore (包含 Base64 圖片數據)
            // 這樣即使 Storage 上傳失敗，圖片依然可見
            const msgRef = await addDoc(collection(db, "messages"), {
                senderId,
                realSenderId: currentUser.id,
                receiverId,
                type: file ? MessageType.IMAGE : MessageType.TEXT,
                content: content || '',
                imageUrl: imageUrl || '',
                orderId: orderId || null,
                ticketId: ticketId || null,
                timestamp,
                isRead: false,
                metadata: {
                    status: file ? 'uploading' : 'sent', // 標記為上傳中，UI 可顯示 Spinner 但圖片已顯示
                    isAdminReply: isAdmin,
                    isSynced: !file // 如果是文字則已同步
                }
            });

            // 4. 後台異步上傳到 Storage (不阻塞 UI)
            if (compressedFile && msgRef.id) {
                const storageRef = ref(storage, `chat/${msgRef.id}_${Date.now()}.jpg`);
                const uploadTask = uploadBytesResumable(storageRef, compressedFile);

                uploadTask.on('state_changed', 
                    null, 
                    (err) => {
                        console.warn("Storage Upload Failed (keeping Base64):", err);
                        // 上傳失敗時，更新狀態為 sent (因為 Base64 已經在 DB 裡了，用戶能看到)
                        updateDoc(doc(db, "messages", msgRef.id), { 
                            "metadata.status": "sent",
                            "metadata.uploadError": true 
                        }).catch(() => {});
                    }, 
                    async () => {
                        // 上傳成功，替換為永久 URL 減輕 DB 讀取壓力 (下次讀取時)
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        await updateDoc(doc(db, "messages", msgRef.id), { 
                            imageUrl: downloadURL, 
                            "metadata.status": 'sent',
                            "metadata.isSynced": true
                        });
                    }
                );
            }
        } catch (e: any) {
            console.error("Message Engine Failure:", e);
            showToast("傳送失敗", "error");
        }
    };

    /**
     * 發送全域系統公告
     */
    const sendBroadcast = async (content: string, title?: string) => {
        if (!currentUser || ![UserRole.ADMIN_SUPER, UserRole.ADMIN_CS].includes(currentUser.role)) return;
        
        await addDoc(collection(db, "messages"), {
            senderId: 'SYSTEM_ADMIN',
            realSenderId: currentUser.id,
            receiverId: 'ALL', // Special ID for broadcasts
            type: MessageType.SYSTEM,
            content: title ? `【${title}】\n${content}` : content,
            timestamp: new Date().toISOString(),
            isRead: false,
            metadata: {
                status: 'sent',
                isBroadcast: true
            }
        });
    };

    const markAsRead = async (senderId: string) => {
        if (!currentUser) return;
        try {
            const q = query(
                collection(db, "messages"), 
                where("senderId", "==", senderId),
                where("receiverId", "==", currentUser.id),
                where("isRead", "==", false)
            );
            const snap = await getDocs(q);
            if (snap.empty) return;
            const batch = writeBatch(db);
            snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
            await batch.commit();
        } catch (e) {}
    };

    const createTicket = async (subject: string, category: string, orderId?: string) => {
        if (!currentUser) return null;
        const ref = await addDoc(collection(db, "tickets"), {
            creatorId: currentUser.id,
            creatorName: currentUser.name,
            creatorRole: currentUser.role,
            category,
            subject,
            orderId: orderId || null,
            status: TicketStatus.OPEN,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return ref.id;
    };

    const claimTicket = async (tid: string) => {
        if (!currentUser) return false;
        await updateDoc(doc(db, "tickets", tid), {
            assigneeId: currentUser.id,
            assigneeName: currentUser.name,
            status: TicketStatus.ASSIGNED,
            updatedAt: new Date().toISOString()
        });
        return true;
    };

    const resolveTicket = async (tid: string) => {
        await updateDoc(doc(db, "tickets", tid), {
            status: TicketStatus.RESOLVED,
            updatedAt: new Date().toISOString()
        });
        return true;
    };

    return (
        <ChatContext.Provider value={{ 
            sendMessage, sendBroadcast, markAsRead, createTicket, claimTicket, resolveTicket,
            isDrawerOpen, activePartnerId, activeOrderId, openChat, closeChat
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChat error');
    return context;
};
