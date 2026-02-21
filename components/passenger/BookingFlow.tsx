/**
 * P7SAI - 乘客端新下單流程 (3步驟)
 * Phase 2: 乘客端重新設計
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { OrderStatus } from '../../../types';
import { showToast } from '../../../components/Toast';

interface BookingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

type BookingStep = 'location' | 'options' | 'confirm';

// Icons
const Icons = {
  location: '📍',
  destination: '🏁',
  time: '🕐',
  users: '👥',
  car: '🚗',
  price: '💰',
  back: '←',
  next: '→',
  check: '✓',
};

const BookingFlow: React.FC<BookingFlowProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const { createOrder } = useApp();
  
  // Booking state
  const [step, setStep] = useState<BookingStep>('location');
  const [pickupLocation, setPickupLocation] = useState<any>(null);
  const [dropoffLocation, setDropoffLocation] = useState<any>(null);
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);
  
  // Options
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [vehicleType, setVehicleType] = useState('standard');
  
  // Loading
  const [loading, setLoading] = useState(false);

  // Calculate price (simplified)
  const estimatedPrice = useMemo(() => {
    if (!pickupLocation || !dropoffLocation) return 0;
    // Simple distance-based calculation
    const basePrice = 58;
    return basePrice + Math.floor(Math.random() * 50);
  }, [pickupLocation, dropoffLocation]);

  // Address search (mock - would integrate with actual map API)
  const searchAddress = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    // Mock suggestions - in real app, call map API
    const mockSuggestions = [
      { id: '1', placeName: `${query} - 深圳`, address: '深圳市' },
      { id: '2', placeName: `${query} - 銅鑼灣`, address: '香港島' },
      { id: '3', placeName: `${query} - 旺角`, address: '九龍' },
    ];
    setSuggestions(mockSuggestions);
  };

  // Handle input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeField === 'pickup') {
        searchAddress(pickupQuery);
      } else if (activeField === 'dropoff') {
        searchAddress(dropoffQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [pickupQuery, dropoffQuery, activeField]);

  // Select suggestion
  const selectSuggestion = (suggestion: any) => {
    if (activeField === 'pickup') {
      setPickupLocation(suggestion);
      setPickupQuery(suggestion.placeName);
    } else if (activeField === 'dropoff') {
      setDropoffLocation(suggestion);
      setDropoffQuery(suggestion.placeName);
    }
    setSuggestions([]);
    setActiveField(null);
  };

  // Validate step
  const canProceed = useMemo(() => {
    if (step === 'location') {
      return pickupLocation && dropoffLocation;
    }
    if (step === 'options') {
      return bookingTime && passengers > 0;
    }
    return true;
  }, [step, pickupLocation, dropoffLocation, bookingTime, passengers]);

  // Handle next
  const handleNext = () => {
    if (step === 'location') setStep('options');
    else if (step === 'options') setStep('confirm');
  };

  // Handle back
  const handleBack = () => {
    if (step === 'options') setStep('location');
    else if (step === 'confirm') setStep('options');
  };

  // Submit order
  const handleSubmit = async () => {
    if (!currentUser || !pickupLocation || !dropoffLocation) return;
    
    setLoading(true);
    try {
      const orderData = {
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        price: estimatedPrice,
        passengers,
        vehicleType,
        bookingDate: bookingDate || new Date().toISOString(),
        bookingTime: bookingTime || new Date().toISOString(),
        passengerId: currentUser.id,
        status: OrderStatus.PENDING,
      };
      
      // In real app, call createOrder
      showToast('訂單已提交！', 'success');
      onSuccess?.('new-order-id');
      onClose();
      
    } catch (error) {
      console.error('Order creation failed:', error);
      showToast('提交失敗，請重試', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Render Step 1: Location
  const renderLocationStep = () => (
    <div className="space-y-4">
      <h3 className="font-black text-lg text-slate-800">📍 選擇地點</h3>
      
      {/* Pickup */}
      <div className="relative">
        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">上車地點</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">{Icons.location}</span>
          <input
            type="text"
            value={pickupQuery}
            onChange={(e) => { setPickupQuery(e.target.value); setActiveField('pickup'); }}
            onFocus={() => setActiveField('pickup')}
            placeholder="輸入上車地點..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
          {pickupLocation && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">{Icons.check}</span>
          )}
        </div>
        
        {/* Suggestions */}
        {suggestions.length > 0 && activeField === 'pickup' && (
          <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-lg overflow-hidden">
            {suggestions.map(s => (
              <button
                key={s.id}
                onClick={() => selectSuggestion(s)}
                className="w-full p-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0"
              >
                <div className="font-bold text-sm">{s.placeName}</div>
                <div className="text-xs text-slate-400">{s.address}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dropoff */}
      <div className="relative">
        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">目的地</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">{Icons.destination}</span>
          <input
            type="text"
            value={dropoffQuery}
            onChange={(e) => { setDropoffQuery(e.target.value); setActiveField('dropoff'); }}
            onFocus={() => setActiveField('dropoff')}
            placeholder="輸入目的地..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
          {dropoffLocation && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">{Icons.check}</span>
          )}
        </div>
        
        {suggestions.length > 0 && activeField === 'dropoff' && (
          <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-lg overflow-hidden">
            {suggestions.map(s => (
              <button
                key={s.id}
                onClick={() => selectSuggestion(s)}
                className="w-full p-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0"
              >
                <div className="font-bold text-sm">{s.placeName}</div>
                <div className="text-xs text-slate-400">{s.address}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Locations */}
      <div className="pt-2">
        <p className="text-xs font-bold text-slate-400 uppercase mb-2">快速選擇</p>
        <div className="flex gap-2 flex-wrap">
          {['深圳灣口岸', '羅湖口岸', '機場', '銅鑼灣', '中環'].map(place => (
            <button
              key={place}
              onClick={() => { setPickupLocation({ placeName: place }); setPickupQuery(place); }}
              className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-purple-100 hover:text-purple-600 transition-colors"
            >
              {place}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Step 2: Options
  const renderOptionsStep = () => (
    <div className="space-y-4">
      <h3 className="font-black text-lg text-slate-800">⚙️ 選擇選項</h3>
      
      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">用車日期</label>
          <input
            type="date"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            className="w-full px-4 py-4 bg-slate-50 rounded-2xl font-bold focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">用車時間</label>
          <input
            type="time"
            value={bookingTime}
            onChange={(e) => setBookingTime(e.target.value)}
            className="w-full px-4 py-4 bg-slate-50 rounded-2xl font-bold focus:outline-none"
          />
        </div>
      </div>

      {/* Passengers */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">乘客人數</label>
        <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4">
          <button
            onClick={() => setPassengers(Math.max(1, passengers - 1))}
            className="w-12 h-12 bg-white rounded-xl font-black text-xl hover:bg-purple-100"
          >
            -
          </button>
          <span className="flex-1 text-center font-black text-2xl">{passengers}</span>
          <button
            onClick={() => setPassengers(Math.min(6, passengers + 1))}
            className="w-12 h-12 bg-white rounded-xl font-black text-xl hover:bg-purple-100"
          >
            +
          </button>
        </div>
      </div>

      {/* Vehicle Type */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">車型選擇</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'standard', name: '經濟轎車', price: 1, icon: '🚗' },
            { id: 'luxury', name: '豪華轎車', price: 1.5, icon: '🚘' },
            { id: 'van', name: '保姆車', price: 2, icon: '🚐' },
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setVehicleType(type.id)}
              className={`p-4 rounded-2xl text-center transition-all ${
                vehicleType === type.id
                  ? 'bg-purple-500 text-white ring-2 ring-purple-300'
                  : 'bg-slate-50 text-slate-600 hover:bg-purple-50'
              }`}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className="font-bold text-xs">{type.name}</div>
              <div className="text-[10px] opacity-70">×{type.price}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Step 3: Confirm
  const renderConfirmStep = () => (
    <div className="space-y-4">
      <h3 className="font-black text-lg text-slate-800">✅ 確認訂單</h3>
      
      {/* Order Summary */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-lg">{Icons.location}</span>
          <div>
            <div className="text-xs text-slate-400 uppercase">上車地點</div>
            <div className="font-bold">{pickupLocation?.placeName}</div>
          </div>
        </div>
        
        <div className="w-px h-8 bg-slate-200 ml-4"></div>
        
        <div className="flex items-start gap-3">
          <span className="text-lg">{Icons.destination}</span>
          <div>
            <div className="text-xs text-slate-400 uppercase">目的地</div>
            <div className="font-bold">{dropoffLocation?.placeName}</div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-50 rounded-xl p-3">
          <span className="text-slate-400 text-xs">{Icons.time} 用車時間</span>
          <div className="font-bold">{bookingTime || '立即'}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <span className="text-slate-400 text-xs">{Icons.users} 乘客</span>
          <div className="font-bold">{passengers} 人</div>
        </div>
      </div>

      {/* Price */}
      <div className="bg-gradient-to-r from-purple-500 to-[#8942FE] rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs opacity-70">預估價格</div>
            <div className="text-3xl font-black">¥{estimatedPrice}</div>
          </div>
          <div className="text-4xl">💰</div>
        </div>
      </div>

      {/* Payment Method (placeholder) */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
        <div className="flex items-center gap-3">
          <span className="text-xl">💳</span>
          <span className="font-bold">支付方式</span>
        </div>
        <span className="text-slate-400">›</span>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            ✕
          </button>
          <h2 className="font-black text-lg">預訂行程</h2>
          <div className="w-10"></div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {['location', 'options', 'confirm'].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                step === s ? 'bg-purple-500 text-white' :
                ['location', 'options', 'confirm'].indexOf(step) > i ? 'bg-green-500 text-white' :
                'bg-slate-100 text-slate-400'
              }`}>
                {['location', 'options', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`w-8 h-1 rounded ${
                ['location', 'options', 'confirm'].indexOf(step) > i ? 'bg-green-500' : 'bg-slate-100'
              }`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {step === 'location' && renderLocationStep()}
        {step === 'options' && renderOptionsStep()}
        {step === 'confirm' && renderConfirmStep()}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 shrink-0">
        <div className="flex gap-3">
          {step !== 'location' && (
            <button
              onClick={handleBack}
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black"
            >
              {Icons.back} 返回
            </button>
          )}
          {step !== 'confirm' ? (
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className="flex-1 py-4 bg-[#8942FE] text-white rounded-2xl font-black disabled:opacity-50"
            >
              繼續 {Icons.next}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black disabled:opacity-50"
            >
              {loading ? '提交中...' : '確認訂單'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFlow;
