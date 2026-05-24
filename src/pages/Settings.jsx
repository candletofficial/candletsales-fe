import React from 'react';
import Layout from '../components/Layout';

export default function Settings() {
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cài đặt hệ thống</h1>
          <p className="page-subtitle">Quản lý cấu hình và các tuỳ chọn của tài khoản</p>
        </div>
      </div>
      
      <div className="bg-white border border-outline-variant/30 rounded-xl shadow-sm p-12 text-center mt-6 flex flex-col items-center justify-center min-h-[300px]">
        <span className="material-symbols-outlined text-[64px] text-primary/30 mb-4 animate-[spin_4s_linear_infinite]">settings</span>
        <h3 className="text-[18px] font-bold text-on-surface mb-2">Trang cài đặt đang được xây dựng</h3>
        <p className="text-[14px] text-on-surface-variant w-[400px] max-w-full leading-relaxed">
          Các tính năng cấu hình nâng cao, quản lý thông báo và bảo mật sẽ sớm được cập nhật tại đây. Bạn có thể quay lại sau nhé!
        </p>
      </div>
    </Layout>
  );
}
