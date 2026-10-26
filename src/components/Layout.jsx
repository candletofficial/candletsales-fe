import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import SmartAlerts from './SmartAlerts';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => { if (event.key === 'Escape') setSidebarOpen(false); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sidebarOpen]);

  return (
    <div className="layout admin-theme-scope">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-[#241815]/45 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
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
