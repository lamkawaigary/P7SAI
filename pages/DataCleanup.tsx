/**
 * P7SAI - 數據清理頁面 (Standalone)
 * Phase 4: 數據歸檔 & 幽靈帳號清理
 */

import React, { useState } from 'react';
// Note: In production, import from firebaseConfig and firestore methods
// This is a UI-only version for testing

interface CleanupStats {
  ghostAccountsDeleted: number;
  ordersArchived: number;
  messagesArchived: number;
}

const DataCleanup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CleanupStats | null>(null);
  const [ghostAccounts, setGhostAccounts] = useState<string[]>([]);
  const [identifying, setIdentifying] = useState(false);

  // Mock functions for UI demonstration
  const handleIdentifyGhosts = async () => {
    setIdentifying(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Mock ghost accounts
    setGhostAccounts(['user_abc123', 'user_def456', 'user_ghi789']);
    setIdentifying(false);
  };

  const handleDeleteGhosts = async () => {
    if (ghostAccounts.length === 0) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setResults(prev => ({ 
      ...prev, 
      ghostAccountsDeleted: ghostAccounts.length 
    }));
    setGhostAccounts([]);
    setLoading(false);
  };

  const handleArchiveOrders = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setResults(prev => ({ 
      ...prev, 
      ordersArchived: Math.floor(Math.random() * 20) 
    }));
    setLoading(false);
  };

  const handleArchiveMessages = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setResults(prev => ({ 
      ...prev, 
      messagesArchived: Math.floor(Math.random() * 50) 
    }));
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-slate-800 mb-6">🧹 數據清理</h1>

        {/* Ghost Accounts Section */}
        <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="font-black text-lg text-slate-800 mb-4">👻 幽靈帳號清理</h2>
          <p className="text-sm text-slate-500 mb-4">
            識別並刪除冇有名稱、冇有電話、冇有電郵既帳號
          </p>
          
          {ghostAccounts.length > 0 ? (
            <div className="mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3">
                <div className="font-bold text-yellow-800">
                  發現 {ghostAccounts.length} 個幽靈帳號
                </div>
              </div>
              <button
                onClick={handleDeleteGhosts}
                disabled={loading}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-bold disabled:opacity-50"
              >
                確認刪除 ({ghostAccounts.length} 個)
              </button>
            </div>
          ) : (
            <button
              onClick={handleIdentifyGhosts}
              disabled={identifying}
              className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {identifying ? '識別中...' : '識別幽靈帳號'}
            </button>
          )}
        </div>

        {/* Archive Section */}
        <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
          <h2 className="font-black text-lg text-slate-800 mb-4">📦 數據歸檔</h2>
          <p className="text-sm text-slate-500 mb-4">
            將超過30天既舊數據歸檔到 archive 集合
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleArchiveOrders}
              disabled={loading}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 disabled:opacity-50"
            >
              📋 歸檔舊訂單
            </button>
            
            <button
              onClick={handleArchiveMessages}
              disabled={loading}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 disabled:opacity-50"
            >
              💬 歸檔舊訊息
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <h3 className="font-black text-green-800 mb-3">✅ 清理完成</h3>
            <div className="space-y-2 text-sm">
              {results.ghostAccountsDeleted > 0 && (
                <div>👻 刪除幽靈帳號: {results.ghostAccountsDeleted} 個</div>
              )}
              {results.ordersArchived > 0 && (
                <div>📋 歸檔舊訂單: {results.ordersArchived} 個</div>
              )}
              {results.messagesArchived > 0 && (
                <div>💬 歸檔舊訊息: {results.messagesArchived} 個</div>
              )}
              {results.ghostAccountsDeleted === 0 && results.ordersArchived === 0 && results.messagesArchived === 0 && (
                <div>冇野需要清理</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataCleanup;
