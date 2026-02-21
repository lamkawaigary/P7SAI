/**
 * P7SAI - 統一訊息系統
 * Phase 1: 訊息中心核心組件
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  limit,
  getDocs
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Message, Conversation, OrderStatus, UserRole } from './types';
import { showToast } from '../../components/Toast';

interface MessagingContextType {
  // Conversations
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversation: (c: Conversation | null) => void;
  
  // Messages
  messages: Message[];
  sendMessage: (content: string, file?: File) => Promise<void>;
  
  // Loading states
  loading: boolean;
  sending: boolean;
  
  // Actions
  openConversation: (partnerId: string, orderId?: string) => void;
  closeConversation: () => void;
  refreshConversations: () => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Subscribe to conversations
  useEffect(() => {
    if (!currentUser?.id) {
      setConversations([]);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.id),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      setConversations(convos);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Subscribe to messages in active conversation
  useEffect(() => {
    if (!activeConversation?.id) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'conversations', activeConversation.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeConversation?.id]);

  // Open a conversation (or create new one)
  const openConversation = useCallback(async (partnerId: string, orderId?: string) => {
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      // Find existing conversation
      const existingQ = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUser.id),
        where('orderId', '==', orderId || null)
      );
      
      const existingSnap = await getDocs(existingQ);
      let conversation = existingSnap.docs.find(d => {
        const data = d.data();
        return data.participants.includes(partnerId);
      });

      if (!conversation) {
        // Create new conversation
        const newConv = await addDoc(collection(db, 'conversations'), {
          participants: [currentUser.id, partnerId],
          orderId: orderId || null,
          type: orderId ? 'order' : 'direct',
          lastMessage: '',
          lastSenderId: '',
          unreadCount: { [currentUser.id]: 0 },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        const newConvDoc = await getDoc(newConv);
        conversation = newConvDoc;
      }

      const convData = { id: conversation.id, ...conversation.data() } as Conversation;
      setActiveConversation(convData);
      
    } catch (error) {
      console.error('Error opening conversation:', error);
      showToast('無法開啟對話', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Send message
  const sendMessage = useCallback(async (content: string, file?: File) => {
    if (!currentUser?.id || !activeConversation?.id || !content.trim()) return;

    setSending(true);
    try {
      const messageData: Partial<Message> = {
        senderId: currentUser.id,
        content: content.trim(),
        type: 'text',
        readBy: [currentUser.id],
        createdAt: serverTimestamp()
      };

      // Add to messages subcollection
      await addDoc(collection(db, 'conversations', activeConversation.id, 'messages'), messageData);

      // Update conversation
      await updateDoc(doc(db, 'conversations', activeConversation.id), {
        lastMessage: content.trim(),
        lastSenderId: currentUser.id,
        updatedAt: serverTimestamp(),
        [`unreadCount.${currentUser.id}`]: 0
      });

    } catch (error) {
      console.error('Error sending message:', error);
      showToast('發送失敗', 'error');
    } finally {
      setSending(false);
    }
  }, [currentUser?.id, activeConversation?.id]);

  // Close conversation
  const closeConversation = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
  }, []);

  // Refresh
  const refreshConversations = useCallback(() => {
    // Trigger re-subscription by resetting
    setConversations([]);
  }, []);

  const value = {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    sendMessage,
    loading,
    sending,
    openConversation,
    closeConversation,
    refreshConversations
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within MessagingProvider');
  }
  return context;
};

export default MessagingContext;
