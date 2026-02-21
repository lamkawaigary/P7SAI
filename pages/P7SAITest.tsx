/**
 * P7SAI Test Page
 * 用於測試新的統一訊息系統
 */

import React, { useState } from 'react';
import { MessagingHub } from '../components/messaging';

const P7SAITest: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
          <h1 className="font-black text-xl text-purple-600 mb-2">🧪 P7SAI 測試頁面</h1>
          <p className="text-sm text-slate-500">
            呢個係新既統一訊息系統測試頁面
          </p>
          <button 
            onClick={() => setIsOpen(true)}
            className="mt-4 w-full py-3 bg-purple-500 text-white rounded-xl font-black"
          >
            開啟訊息中心
          </button>
        </div>
        
        <MessagingHub 
          isOpen={isOpen} 
          onClose={() => setIsOpen(false)} 
        />
      </div>
    </div>
  );
};

export default P7SAITest;
