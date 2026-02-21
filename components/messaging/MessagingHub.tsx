/**
 * P7SAI - 統一訊息中心 (Messaging Hub)
 * 這是整個訊息系統的核心組件
 */

import React, { useState, useEffect } from 'react';
import { useMessaging } from '../../context/MessagingContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { OrderStatus, UserRole } from '../../types';
import { showToast } from '../components/Toast';

// Icons (using emoji for simplicity)
const Icons = {
  back: '←',
  close: '✕',
  send: '➤',
  search: '🔍',
  phone: '📞',
  info: 'ℹ️',
  order: '📋',
  user: '👤',
  support: '💬',
  camera: '📷',
  image: '🖼️'
};

interface MessagingHubProps {
  isOpen: boolean;
  onClose: () => void;
  initialPartnerId?: string;
  initialOrderId?: string;
}

const MessagingHub: React.FC<MessagingHubProps> = ({ 
  isOpen, 
  onClose,
  initialPartnerId,
  initialOrderId 
}) => {
  const { 
    conversations, 
    activeConversation, 
    setActiveConversation,
    messages, 
    sendMessage,
    loading,
    sending,
    openConversation,
    closeConversation 
  } = useMessaging();
  
  const { users, orders, resolveUser } = useApp();
  const { currentUser } = useAuth();
  
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  // Open conversation if provided
  useEffect(() => {
    if (isOpen && initialPartnerId) {
      openConversation(initialPartnerId, initialOrderId);
    }
  }, [isOpen, initialPartnerId, initialOrderId]);

  // Get conversation partner info
  const getPartnerInfo = (conv: any) => {
    if (!currentUser || !conv?.participants) return null;
    const partnerId = conv.participants.find((p: string) => p !== currentUser.id);
    return users.find(u => u.id === partnerId);
  };

  // Get order info for conversation
  const getOrderInfo = (conv: any) => {
    if (!conv?.orderId) return null;
    return orders.find(o => o.id === conv.orderId);
  };

  // Get display name for conversation
  const getDisplayName = (conv: any) => {
    const partner = getPartnerInfo(conv);
    if (partner?.name) return partner.name;
    if (conv?.type === 'support') return '客服支援';
    return '未知用戶';
  };

  // Get partner phone
  const getPartnerPhone = (conv: any) => {
    const partner = getPartnerInfo(conv);
    return partner?.phone || '';
  };

  // Format time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return '剛剛';
    if (mins < 60) return `${mins}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    if (days < 7) return `${days}日前`;
    return date.toLocaleDateString('zh-HK');
  };

  // Get status display
  const getStatusDisplay = (status: OrderStatus) => {
    const statusMap: Record<OrderStatus, { text: string; color: string }> = {
      [OrderStatus.PENDING]: { text: '⏳ 待接單', color: 'bg-yellow-100 text-yellow-700' },
      [OrderStatus.ACCEPTED]: { text: '✅ 已接單', color: 'bg-emerald-100 text-emerald-700' },
      [OrderStatus.ON_THE_WAY]: { text: '🚗 前往中', color: 'bg-blue-100 text-blue-700' },
      [OrderStatus.ARRIVED]: { text: '📍 已到達', color: 'bg-purple-100 text-purple-700' },
      [OrderStatus.IN_PROGRESS]: { text: '🔄 進行中', color: 'bg-indigo-100 text-indigo-700' },
      [OrderStatus.COMPLETED]: { text: '✅ 已完成', color: 'bg-slate-100 text-slate-700' },
      [OrderStatus.CANCELLED]: { text: '❌ 已取消', color: 'bg-red-100 text-red-700' },
      [OrderStatus.DISPUTED]: { text: '⚠️ 爭議中', color: 'bg-orange-100 text-orange-700' },
    };
    return statusMap[status] || { text: '📋 未知', color: 'bg-slate-100 text-slate-700' };
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = getDisplayName(conv).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // Handle send
  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    await sendMessage(inputText);
    setInputText('');
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render conversation list
  const renderConversationList = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-800">💬 訊息中心</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">{Icons.close}</button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
          <input
            type="text"
            placeholder="搜尋對話..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <div className="text-4xl mb-2">💭</div>
            <p className="text-sm font-bold">暫無對話</p>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const partner = getPartnerInfo(conv);
            const order = getOrderInfo(conv);
            const unread = conv.unreadCount?.[currentUser?.id] || 0;
            
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`w-full p-4 flex items-start gap-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${activeConversation?.id === conv.id ? 'bg-purple-50' : ''}`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8942FE] to-purple-400 flex items-center justify-center font-black text-white shrink-0">
                  {getDisplayName(conv).charAt(0)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-slate-800 truncate">{getDisplayName(conv)}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{formatTime(conv.updatedAt)}</span>
                  </div>
                  
                  {/* Order info or last message */}
                  {order ? (
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${getStatusDisplay(order.status).color}`}>
                        {getStatusDisplay(order.status).text}
                      </span>
                      <span className="text-slate-500 truncate">
                        {order.pickup?.placeName} → {order.dropoff?.placeName}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 truncate">{conv.lastMessage || '暫無訊息'}</p>
                  )}
                  
                  {order && (
                    <p className="text-[10px] text-[#8942FE] font-black mt-1">¥{order.price}</p>
                  )}
                </div>
                
                {/* Unread badge */}
                {unread > 0 && (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0">
                    {unread}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
      
      {/* Footer - Quick Actions */}
      <div className="p-4 border-t border-slate-100 shrink-0">
        <button 
          onClick={() => openConversation('SYSTEM_ADMIN')}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-[#8942FE] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2"
        >
          <span>💬</span> 聯繫客服
        </button>
      </div>
    </div>
  );

  // Render chat window
  const renderChatWindow = () => {
    const partner = activeConversation ? getPartnerInfo(activeConversation) : null;
    const order = activeConversation ? getOrderInfo(activeConversation) : null;

    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="p-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveConversation(null)} className="p-1 hover:bg-slate-100 rounded">
              {Icons.back}
            </button>
            
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8942FE] to-purple-400 flex items-center justify-center font-black text-white">
              {getDisplayName(activeConversation).charAt(0)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-black text-slate-800 text-sm truncate">
                {getDisplayName(activeConversation)}
              </div>
              <div className="text-[9px] text-slate-400 font-mono">
                {getPartnerPhone(activeConversation)}
              </div>
            </div>
            
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 hover:bg-slate-100 rounded">
              {Icons.info}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded">
              {Icons.close}
            </button>
          </div>
          
          {/* Order Context Bar */}
          {order && (
            <div className="mt-2 p-2 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between text-[10px]">
                <span className={`px-2 py-0.5 rounded font-bold ${getStatusDisplay(order.status).color}`}>
                  {getStatusDisplay(order.status).text}
                </span>
                <span className="font-black text-[#8942FE]">¥{order.price}</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-1 truncate">
                📍 {order.pickup?.placeName} → 🏁 {order.dropoff?.placeName}
              </div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        {showInfo && order && (
          <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
            <h3 className="font-black text-sm mb-2">📋 訂單詳情</h3>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">訂單編號:</span>
                <span className="font-mono">#{order.id?.slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">出發地:</span>
                <span className="font-bold truncate max-w-[150px]">{order.pickup?.placeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">目的地:</span>
                <span className="font-bold truncate max-w-[150px]">{order.dropoff?.placeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">乘客人數:</span>
                <span className="font-bold">{order.passengersCount || 1}人</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUser?.id;
            return (
              <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`p-3 rounded-2xl text-sm font-bold ${
                    isMe 
                      ? 'bg-[#8942FE] text-white rounded-br-none' 
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[8px] text-slate-400 px-1">
                    {msg.createdAt ? formatTime(msg.createdAt) : ''}
                  </span>
                </div>
              </div>
            );
          })}
          
          {messages.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              <p className="text-sm">開始新對話</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-white">
          <div className="flex items-end gap-2 bg-slate-50 rounded-2xl p-2">
            <button className="p-2 text-slate-400 hover:text-[#8942FE]">
              {Icons.image}
            </button>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="輸入訊息..."
              rows={1}
              className="flex-1 bg-transparent border-none focus:outline-none text-sm font-bold py-2 resize-none max-h-32"
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              className="p-3 bg-[#8942FE] text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                Icons.send
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
      {/* Mobile: Full screen */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeConversation ? renderChatWindow() : renderConversationList()}
      </div>
    </div>
  );
};

export default MessagingHub;
