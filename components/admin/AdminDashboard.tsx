/**
 * P7SAI - 統一後台管理系統
 * Phase 4: 後台 + 客服
 */

import React, { useState, useEffect } from 'react';

interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  todayRevenue: number;
}

interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
}

interface AdminOrder {
  id: string;
  passenger: string;
  driver: string;
  route: string;
  price: number;
  status: string;
  createdAt: string;
}

const Icons = {
  dashboard: '📊',
  users: '👥',
  orders: '📋',
  finance: '💰',
  settings: '⚙️',
  chat: '💬',
  search: '🔍',
  filter: '�-filter',
  export: '📤',
};

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'orders' | 'finance'>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 1256,
    todayOrders: 89,
    totalUsers: 2345,
    activeUsers: 567,
    totalRevenue: 456780,
    todayRevenue: 12340
  });

  // Mock users
  const [users, setUsers] = useState<AdminUser[]>([
    { id: '1', name: '張三', phone: '+85212345678', role: '乘客', status: '正常' },
    { id: '2', name: '李四', phone: '+85223456789', role: '司機', status: '正常' },
    { id: '3', name: '王五', phone: '+85234567890', role: '司機', status: '審批中' },
  ]);

  // Mock orders
  const [orders, setOrders] = useState<AdminOrder[]>([
    { id: 'ORD001', passenger: '張三', driver: '李四', route: '深圳 → 銅鑼灣', price: 658, status: '進行中', createdAt: '14:30' },
    { id: 'ORD002', passenger: '陳六', driver: '-', route: '羅湖 → 中環', price: 542, status: '待接單', createdAt: '14:25' },
    { id: 'ORD003', passenger: '林七', driver: '王五', route: '機場 → 旺角', price: 380, status: '已完成', createdAt: '13:45' },
  ]);

  // Render Dashboard Tab
  const renderDashboard = () => (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
          <div className="text-xs opacity-70">今日訂單</div>
          <div className="text-3xl font-black">{stats.todayOrders}</div>
          <div className="text-xs opacity-70 mt-1">較昨日 +12%</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
          <div className="text-xs opacity-70">今日收入</div>
          <div className="text-3xl font-black">¥{stats.todayRevenue.toLocaleString()}</div>
          <div className="text-xs opacity-70 mt-1">較昨日 +8%</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <div className="text-xs opacity-70">總用戶</div>
          <div className="text-3xl font-black">{stats.totalUsers}</div>
          <div className="text-xs opacity-70 mt-1">活躍 {stats.activeUsers}</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
          <div className="text-xs opacity-70">總訂單</div>
          <div className="text-3xl font-black">{stats.totalOrders}</div>
          <div className="text-xs opacity-70 mt-1">本月</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-4">
        <h3 className="font-black text-slate-800 mb-3">⚡ 快速操作</h3>
        <div className="grid grid-cols-4 gap-2">
          <button className="p-3 bg-purple-50 rounded-xl text-center hover:bg-purple-100">
            <div className="text-xl mb-1">👥</div>
            <div className="text-xs font-bold text-purple-600">用戶</div>
          </button>
          <button className="p-3 bg-green-50 rounded-xl text-center hover:bg-green-100">
            <div className="text-xl mb-1">📋</div>
            <div className="text-xs font-bold text-green-600">訂單</div>
          </button>
          <button className="p-3 bg-blue-50 rounded-xl text-center hover:bg-blue-100">
            <div className="text-xl mb-1">💬</div>
            <div className="text-xs font-bold text-blue-600">訊息</div>
          </button>
          <button className="p-3 bg-orange-50 rounded-xl text-center hover:bg-orange-100">
            <div className="text-xl mb-1">💰</div>
            <div className="text-xs font-bold text-orange-600">財務</div>
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-slate-800">最近訂單</h3>
          <button className="text-xs text-purple-600 font-bold">查看全部 →</button>
        </div>
        <div className="space-y-2">
          {orders.slice(0, 3).map(order => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <div className="font-bold text-sm text-slate-800">{order.route}</div>
                <div className="text-xs text-slate-400">{order.passenger} → {order.driver}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-purple-600">¥{order.price}</div>
                <div className={`text-[10px] font-bold ${order.status === '進行中' ? 'text-green-500' : 'text-slate-400'}`}>
                  {order.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Users Tab
  const renderUsers = () => (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="搜尋用戶..." 
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl font-bold"
          />
        </div>
        <button className="px-4 py-3 bg-white rounded-xl font-bold">篩選</button>
      </div>

      {/* User List */}
      <div className="bg-white rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 text-xs font-bold text-slate-400">用戶</th>
              <th className="text-left p-3 text-xs font-bold text-slate-400">電話</th>
              <th className="text-left p-3 text-xs font-bold text-slate-400">角色</th>
              <th className="text-left p-3 text-xs font-bold text-slate-400">狀態</th>
              <th className="text-left p-3 text-xs font-bold text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t border-slate-50">
                <td className="p-3 font-bold text-sm">{user.name}</td>
                <td className="p-3 text-sm text-slate-500 font-mono">{user.phone}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    user.role === '司機' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    user.status === '正常' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-3">
                  <button className="text-xs text-purple-600 font-bold">詳情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Orders Tab
  const renderOrders = () => (
    <div className="space-y-4">
      {/* Order List */}
      <div className="bg-white rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 text-xs font-bold text-slate-400">訂單</th>
              <th className="text-left p-3 text-xs font-bold text-slate-400">路線</th>
              <th className="text-left p-3 text-xs font-bold text-slate-400">金額</th>
              <th className="text-left p-3 text-xs font-bold text-slate-400">狀態</th>
              <th className="text-left p-3 text-xs font-bold text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-t border-slate-50">
                <td className="p-3">
                  <div className="font-mono text-sm font-bold">{order.id}</div>
                  <div className="text-[10px] text-slate-400">{order.createdAt}</div>
                </td>
                <td className="p-3 text-sm">{order.route}</td>
                <td className="p-3 font-black text-purple-600">¥{order.price}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    order.status === '進行中' ? 'bg-green-100 text-green-600' :
                    order.status === '待接單' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-3">
                  <button className="text-xs text-purple-600 font-bold">詳情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black">P7S Admin 後台</h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs">系統正常</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 flex gap-1 overflow-x-auto">
        {[
          { key: 'dashboard', label: '📊 儀表板', icon: '📊' },
          { key: 'users', label: '👥 用戶', icon: '👥' },
          { key: 'orders', label: '📋 訂單', icon: '📋' },
          { key: 'finance', label: '💰 財務', icon: '💰' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-purple-500 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'finance' && <div className="text-center py-12 text-slate-400">財務模塊開發中...</div>}
      </div>
    </div>
  );
};

export default AdminDashboard;
