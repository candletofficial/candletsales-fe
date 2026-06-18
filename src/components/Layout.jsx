import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import SmartAlerts from './SmartAlerts';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-wrapper">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="main-content">{children}</main>
      </div>
      
      {/* Global AI Smart Alerts */}
      <SmartAlerts />
    </div>
  );
}
