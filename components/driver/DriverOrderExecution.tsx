/**
 * P7SAI - 司機端訂單執行流程
 * Phase 3: 訂單執行狀態
 */

import React, { useState, useEffect } from 'react';
import { OrderStatus } from '../../types';

interface ActiveOrder {
  id: string;
  pickup: { placeName: string; address: string; lat: number; lng: number };
  dropoff: { placeName: string; address: string; lat: number; lng: number };
  price: number;
  passengerName: string;
  passengerPhone: string;
  passengers: number;
  status: OrderStatus;
  driverArrived?: boolean;
}

interface DriverOrderExecutionProps {
  order: ActiveOrder;
  onComplete?: () => void;
}

const Icons = {
  location: '📍',
  destination: '🏁',
  phone: '📞',
  nav: '🧭',
  check: '✓',
  car: '🚗',
  timer: '⏱️',
};

const DriverOrderExecution: React.FC<DriverOrderExecutionProps> = ({ order, onComplete }) => {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(OrderStatus.ACCEPTED);
  const [driverArrived, setDriverArrived] = useState(false);
  const [tripStarted, setTripStarted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle driver arrived
  const handleDriverArrived = () => {
    setDriverArrived(true);
    setCurrentStatus(OrderStatus.ARRIVED);
  };

  // Handle start trip
  const handleStartTrip = () => {
    setTripStarted(true);
    setCurrentStatus(OrderStatus.ON_THE_WAY);
  };

  // Handle complete
  const handleComplete = () => {
    setCurrentStatus(OrderStatus.COMPLETED);
    onComplete?.();
  };

  // Status progress
  const statusSteps = [
    { key: OrderStatus.ACCEPTED, label: '已接單', icon: '✓' },
    { key: OrderStatus.ON_THE_WAY, label: '前往上車點', icon: '🚗' },
    { key: OrderStatus.ARRIVED, label: '已到達', icon: '📍' },
    { key: OrderStatus.IN_PROGRESS, label: '行程中', icon: '🔄' },
    { key: OrderStatus.COMPLETED, label: '已完成', icon: '✅' },
  ];

  const currentStepIndex = statusSteps.findIndex(s => s.key === currentStatus);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8942FE] to-purple-600 p-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button className="p-2 bg-white/10 rounded-xl">←</button>
          <div className="text-center">
            <div className="text-xs text-white/60">剩餘時間</div>
            <div className="text-2xl font-black">{formatTime(elapsedTime)}</div>
          </div>
          <button className="p-2 bg-white/10 rounded-xl">☰</button>
        </div>

        {/* Status Progress */}
        <div className="flex items-center justify-between">
          {statusSteps.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                  index <= currentStepIndex 
                    ? 'bg-white text-purple-600' 
                    : 'bg-white/20 text-white/40'
                }`}>
                  {index <= currentStepIndex ? step.icon : (index + 1)}
                </div>
                <div className={`text-[8px] mt-1 ${index <= currentStepIndex ? 'text-white' : 'text-white/40'}`}>
                  {step.label}
                </div>
              </div>
              {index < statusSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${index < currentStepIndex ? 'bg-white' : 'bg-white/20'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Order Info Card */}
      <div className="p-4 -mt-4">
        <div className="bg-white rounded-3xl p-4 shadow-xl">
          {/* Route */}
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-black text-xs shrink-0">
                📍
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-400">上車地點</div>
                <div className="font-black text-slate-800">{order.pickup.placeName}</div>
                <div className="text-xs text-slate-400">{order.pickup.address}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-black text-xs shrink-0">
                🏁
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-400">目的地</div>
                <div className="font-black text-slate-800">{order.dropoff.placeName}</div>
                <div className="text-xs text-slate-400">{order.dropoff.address}</div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-slate-200 my-4"></div>

          {/* Passenger Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center font-black">
                {order.passengerName.charAt(0)}
              </div>
              <div>
                <div className="font-black text-slate-800">{order.passengerName}</div>
                <div className="text-xs text-slate-400">{order.passengers} 位乘客</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-purple-600">¥{order.price}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!driverArrived && (
              <button 
                onClick={handleDriverArrived}
                className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                ✓ 我已到達上車點
              </button>
            )}

            {driverArrived && !tripStarted && (
              <button 
                onClick={handleStartTrip}
                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                🚗 開始行程
              </button>
            )}

            {tripStarted && (
              <button 
                onClick={handleComplete}
                className="w-full py-4 bg-purple-500 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                ✅  完成行程
              </button>
            )}

            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2">
                📞 聯繫乘客
              </button>
              <button className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2">
                🧭 導航
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 p-4 pb-8">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="text-xl font-black text-green-400">¥{order.price}</div>
            <div className="text-[10px] text-slate-400">本單收入</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-white">12</div>
            <div className="text-[10px] text-slate-400">今日訂單</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-white">¥4,560</div>
            <div className="text-[10px] text-slate-400">今日收入</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverOrderExecution;
