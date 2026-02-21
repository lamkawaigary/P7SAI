import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import P7SAITest from './pages/P7SAITest';
import BookingTest from './pages/BookingTest';
import DriverTest from './pages/DriverTest';
import AdminTest from './pages/AdminTest';
import DataCleanup from './pages/DataCleanup';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<div className="p-8 text-center"><h1 className="text-2xl font-black">P7S AI - 測試頁面</h1></div>} />
        <Route path="/p7sai-test" element={<P7SAITest />} />
        <Route path="/booking-test" element={<BookingTest />} />
        <Route path="/driver-test" element={<DriverTest />} />
        <Route path="/admin-test" element={<AdminTest />} />
        <Route path="/data-cleanup" element={<DataCleanup />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
