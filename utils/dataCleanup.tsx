/**
 * P7SAI - 數據管理工具
 * Phase 4: 數據歸檔 & 幽靈帳號清理
 */

import { db } from '../../firebaseConfig';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc,
  writeBatch,
  query,
  where,
  limit
} from 'firebase/firestore';
import { showToast } from '../../components/Toast';

// 數據保留期限 (30天)
const DATA_RETENTION_DAYS = 30;

/**
 * 識別幽靈帳號 (無名稱 + 無電話 + 無電郵)
 */
export const identifyGhostAccounts = async (): Promise<string[]> => {
  const ghostIds: string[] = [];
  
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const hasName = data.name && data.name.trim() !== '';
      const hasPhone = data.phone && data.phone.trim() !== '';
      const hasEmail = data.email && data.email.trim() !== '';
      
      // 如果三樣都冇，就係幽靈帳號
      if (!hasName && !hasPhone && !hasEmail) {
        ghostIds.push(doc.id);
      }
    });
    
    console.log(`找到 ${ghostIds.length} 個幽靈帳號`);
    return ghostIds;
    
  } catch (error) {
    console.error('識別幽靈帳號失敗:', error);
    throw error;
  }
};

/**
 * 刪除幽靈帳號
 */
export const deleteGhostAccounts = async (ghostIds: string[]): Promise<number> => {
  let deletedCount = 0;
  
  try {
    const batch = writeBatch(db);
    
    for (const userId of ghostIds) {
      // 刪除用戶文檔
      batch.delete(doc(db, 'users', userId));
      deletedCount++;
    }
    
    await batch.commit();
    console.log(`已刪除 ${deletedCount} 個幽靈帳號`);
    return deletedCount;
    
  } catch (error) {
    console.error('刪除幽靈帳號失敗:', error);
    throw error;
  }
};

/**
 * 歸檔舊訂單 (超過30天)
 */
export const archiveOldOrders = async (): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
  
  let archivedCount = 0;
  
  try {
    // 搵舊訂單
    const ordersRef = collection(db, 'orders');
    const oldOrdersQuery = query(
      ordersRef,
      where('createdAt', '<', cutoffDate),
      limit(100)
    );
    
    const snapshot = await getDocs(oldOrdersQuery);
    
    if (snapshot.empty) {
      console.log('沒有需要歸檔的舊訂單');
      return 0;
    }
    
    const batch = writeBatch(db);
    
    snapshot.forEach(docSnap => {
      const orderData = docSnap.data();
      
      // 複製到 archive 集合
      batch.set(doc(db, 'archive/orders', docSnap.id), {
        ...orderData,
        archivedAt: new Date().toISOString(),
        originalCreatedAt: orderData.createdAt
      });
      
      // 刪除原始訂單
      batch.delete(doc(db, 'orders', docSnap.id));
      archivedCount++;
    });
    
    await batch.commit();
    console.log(`已歸檔 ${archivedCount} 個舊訂單`);
    return archivedCount;
    
  } catch (error) {
    console.error('歸檔舊訂單失敗:', error);
    throw error;
  }
};

/**
 * 歸檔舊訊息 (超過30天)
 */
export const archiveOldMessages = async (): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
  
  let archivedCount = 0;
  
  try {
    // 搵舊訊息
    const messagesRef = collection(db, 'messages');
    const oldMessagesQuery = query(
      messagesRef,
      where('createdAt', '<', cutoffDate),
      limit(200)
    );
    
    const snapshot = await getDocs(oldMessagesQuery);
    
    if (snapshot.empty) {
      console.log('沒有需要歸檔的舊訊息');
      return 0;
    }
    
    const batch = writeBatch(db);
    
    snapshot.forEach(docSnap => {
      const msgData = docSnap.data();
      
      // 複製到 archive 集合
      batch.set(doc(db, 'archive/messages', docSnap.id), {
        ...msgData,
        archivedAt: new Date().toISOString(),
        originalCreatedAt: msgData.createdAt
      });
      
      // 刪除原始訊息
      batch.delete(doc(db, 'messages', docSnap.id));
      archivedCount++;
    });
    
    await batch.commit();
    console.log(`已歸檔 ${archivedCount} 個舊訊息`);
    return archivedCount;
    
  } catch (error) {
    console.error('歸檔舊訊息失敗:', error);
    throw error;
  }
};

/**
 * 執行完整數據清理
 */
export const runDataCleanup = async (): Promise<{
  ghostAccountsDeleted: number;
  ordersArchived: number;
  messagesArchived: number;
}> => {
  const results = {
    ghostAccountsDeleted: 0,
    ordersArchived: 0,
    messagesArchived: 0
  };
  
  try {
    // 1. 識別並刪除幽靈帳號
    showToast('正在識別幽靈帳號...', 'info');
    const ghostIds = await identifyGhostAccounts();
    
    if (ghostIds.length > 0) {
      results.ghostAccountsDeleted = await deleteGhostAccounts(ghostIds);
      showToast(`已刪除 ${results.ghostAccountsDeleted} 個幽靈帳號`, 'success');
    }
    
    // 2. 歸檔舊訂單
    showToast('正在歸檔舊訂單...', 'info');
    results.ordersArchived = await archiveOldOrders();
    showToast(`已歸檔 ${results.ordersArchived} 個舊訂單`, 'success');
    
    // 3. 歸檔舊訊息
    showToast('正在歸檔舊訊息...', 'info');
    results.messagesArchived = await archiveOldMessages();
    showToast(`已歸檔 ${results.messagesArchived} 個舊訊息`, 'success');
    
    return results;
    
  } catch (error) {
    console.error('數據清理失敗:', error);
    showToast('數據清理失敗', 'error');
    throw error;
  }
};

export default {
  identifyGhostAccounts,
  deleteGhostAccounts,
  archiveOldOrders,
  archiveOldMessages,
  runDataCleanup
};
