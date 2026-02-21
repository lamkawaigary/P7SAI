/**
 * P7SAI Booking Test Page
 */

import React, { useState } from 'react';
import { BookingFlow } from '../components/passenger';

const BookingTest: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h1 className="font-black text-2xl text-purple-600 mb-4">🚗 P7SAI 預訂測試</h1>
          <p className="text-sm text-slate-500 mb-4">
            呢個係新既 3 步驟預訂流程
          </p>
          
          <button 
            onClick={() => setIsOpen(true)}
            className="w-full py-4 bg-purple-500 text-white rounded-2xl font-black text-lg"
          >
            開始預訂
          </button>
        </div>
        
        <BookingFlow 
          isOpen={isOpen} 
          onClose={() => setIsOpen(false)}
          onSuccess={(orderId) => console.log('Order created:', orderId)}
        />
      </div>
    </div>
  );
};

export default BookingTest;
