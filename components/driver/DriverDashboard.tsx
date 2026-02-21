/**
 * P7SAI - 司機端新接單流程
 * Phase 3: 司機端重新設計
 */

import React, { useState, useEffect, useMemo } from 'react';
import { OrderStatus, UserRole } from '../../types';

interface DriverOrder {
  id: string;
  pickup: { placeName: string; address: string };
  dropoff: { placeName: string; address: string };
  price: number;
  distance: number;
  passengers: number;
  status: OrderStatus;
  createdAt: any;
  passengerName: string;
}

interface DriverDashboardProps {
  isOpen?: boolean;
}

// Icons
const Icons = {
  order: '📋',
  money: '💰',
  target: '🎯',
  location: '📍',
  user: '👤',
  phone: '📞',
  accept: '✓',
  reject: '✕',
  nav: '🧭',
};

const DriverDashboard: React.FC<DriverDashboardProps> = ({ isOpen = true }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'my trips'>('orders');
  const [isOnline, setIsOnline] = useState(true);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock orders data
  useEffect(() => {
    // In real app, fetch from Firestore
    setOrders([
      {
        id: 'order1',
        pickup: { placeName: '深圳灣口岸', address: '深圳市南山區' },
        dropoff: { placeName: '銅鑼灣', address: '香港島銅鑼灣' },
        price: 658,
        distance: 2.3,
        passengers: 3,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        passengerName: '張生'
      },
      {
        id: 'order2',
        pickup: { placeName: '羅湖口岸', address: '深圳市羅湖區' },
        dropoff: { placeName: '中環', address: '香港島中環' },
        price: 542,
        distance: 1.8,
        passengers: 2,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        passengerName: '李太'
      },
      {
        id: 'order3',
        pickup: { placeName: '機場', address: '赤鱲角' },
        dropoff: { placeName: '旺角', address: '九龍旺角' },
        price: 380,
        distance: 5.2,
        passengers: 1,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        passengerName: '王生'
      }
    ]);
  }, []);

  // Today's stats
  const todayStats = useMemo(() => ({
    orders: 12,
    revenue: 4560,
    hours: 8.5
  }), []);

  // Accept order
  const handleAcceptOrder = (orderId: string) => {
    setLoading(true);
    setTimeout(() => {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setLoading(false);
    }, 500);
  };

  // Render Order Card
  const renderOrderCard = (order: DriverOrder) => (
    <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
      {/* Route */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-green-500 font-bold">📍</span>
          <div className="flex-1">
            <div className="font-bold text-sm text-slate-800">{order.pickup.placeName}</div>
            <div className="text-xs text-slate-400">{order.pickup.address}</div>
          </div>
        </div>
        
        <div className="w-px h-4 bg-slate-200 ml-2"></div>
        
        <div className="flex items-start gap-2">
          <span className="text-red-500 font-bold">🏁</span>
          <div className="flex-1">
            <div className="font-bold text-sm text-slate-800">{order.dropoff.placeName}</div>
            <div className="text-xs text-slate-400">{order.dropoff.address}</div>
          </div>
        </div>
      </div>

      {/* Info Row */}
      <div className="flex items-center justify-between py-2 border-t border-slate-100 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-lg font-bold">
            📍 {order.distance}km
          </span>
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-lg font-bold">
            👤 {order.passengers}人
          </span>
        </div>
        <div className="text-xl font-black text-[#8942FE]">
          ¥{order.price}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button 
          onClick={() => handleAcceptOrder(order.id)}
          disabled={loading}
          className="flex-1 py-3 bg-green-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {Icons.accept} 一鍵接單
        </button>
        <button className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm">
          {Icons.nav}
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-[#8942FE] to-purple-600 text-white p-4 pb-20">
        {/* Online Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></div>
            <span className="font-bold text-sm">{isOnline ? '接單中' : '休息中'}</span>
          </div>
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={`w-14 h-8 rounded-full p-1 transition-colors ${isOnline ? 'bg-white/20' : 'bg-slate-400'}`}
          >
            <div className={`w-6 h-6 rounded-full bg-white transition-transform ${isOnline ? 'translate-x-6' : 'translate-x-0'}`}></div>
          </button>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-black">{todayStats.orders}</div>
            <div className="text-xs opacity-70">今日訂單</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-black">¥{todayStats.revenue}</div>
            <div className="text-xs opacity-70">今日收入</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-black">{todayStats.hours}h</div>
            <div className="text-xs opacity-70">工作時數</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="-mt-12 px-4 pb-20">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 rounded-xl font-black text-sm transition-colors ${
              activeTab === 'orders' 
                ? 'bg-white text-[#8942FE] shadow-lg' 
                : 'bg-white/50 text-slate-400'
            }`}
          >
            📋 訂單公海
          </button>
          <button
            onClick={() => setActiveTab('my trips')}
            className={`flex-1 py-3 rounded-xl font-black text-sm transition-colors ${
              activeTab === 'my trips' 
                ? 'bg-white text-[#8942FE] shadow-lg' 
                : 'bg-white/50 text-slate-400'
            }`}
          >
            🚗 我的行程
          </button>
        </div>

        {/* Order List */}
        {activeTab === 'orders' ? (
          <div>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">😴</div>
                <p className="font-bold">暫時冇新訂單</p>
                <p className="text-xs">有訂單時會自動顯示</p>
              </div>
            ) : (
              orders.map(renderOrderCard)
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-2">🚗</div>
            <p className="font-bold">暫時冇進行中既行程</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
