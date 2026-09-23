import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import AddressSelector from '../../components/shop/AddressSelector';
import { authService } from '../../services/authService';
import { orderService } from '../../services/orderService';

export default function ShopProfile() {
  const { user, logout, updateUser } = useAuth();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'password'

  // Thống kê đơn hàng người dùng
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0
  });

  // Form thông tin cá nhân
  const [infoForm, setInfoForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  // Form đổi mật khẩu
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Hiển thị mật khẩu
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Trạng thái xử lý
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Toast notification inline
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: 'success', message: '' });
    }, 3500);
  };

  // Cập nhật form nếu user context thay đổi
  useEffect(() => {
    if (user) {
      setInfoForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  // Lấy thống kê đơn hàng của khách hàng
  useEffect(() => {
    const fetchOrderStats = async () => {
      if (!user?._id && !user?.id) return;
      try {
        const res = await orderService.getShopOrders({ user_id: user._id || user.id });
        if (res.data?.success && Array.isArray(res.data.data)) {
          const list = res.data.data;
          const active = list.filter(o =>
            ['pending', 'confirmed', 'shipping'].includes(o.delivery_status || 'pending')
          ).length;
          const completed = list.filter(o =>
            (o.delivery_status === 'delivered') || (o.status === 'completed')
          );
          const spent = completed.reduce((sum, o) => sum + (o.total_price || 0), 0);

          setStats({
            totalOrders: list.length,
            activeOrders: active,
            completedOrders: completed.length,
            totalSpent: spent
          });
        }
      } catch (err) {
        console.error('Không thể tải thống kê đơn hàng:', err);
      }
    };

    fetchOrderStats();
  }, [user]);

  // Cập nhật thông tin cá nhân
  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    if (!infoForm.name.trim()) {
      showToast('Vui lòng nhập họ và tên', 'error');
      return;
    }

    try {
      setSavingInfo(true);
      const res = await authService.updateProfile({
        name: infoForm.name.trim(),
        phone: infoForm.phone.trim(),
        address: infoForm.address.trim()
      });
      if (res.data?.success) {
        updateUser(res.data.data);
        showToast('Đã lưu thông tin tài khoản thành công!');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Có lỗi khi cập nhật thông tin', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  // Tự động lưu địa chỉ khi xác nhận từ modal
  const handleAddressConfirm = async (data) => {
    const newAddr = data?.fullAddress || '';
    if (!newAddr) return;

    setInfoForm(prev => ({ ...prev, address: newAddr }));

    try {
      const res = await authService.updateProfile({
        name: infoForm.name || user?.name || 'Khách hàng',
        phone: infoForm.phone || user?.phone || '',
        address: newAddr
      });
      if (res.data?.success) {
        updateUser(res.data.data);
        showToast('Đã lưu và cập nhật địa chỉ mặc định thành công!');
      }
    } catch (err) {
      console.error('Lỗi khi tự động lưu địa chỉ:', err);
      showToast('Đã nhận diện địa chỉ. Vui lòng bấm "Lưu thay đổi" để hoàn tất.', 'info');
    }
  };

  // Đổi mật khẩu
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passForm.currentPassword) {
      showToast('Vui lòng nhập mật khẩu hiện tại', 'error');
      return;
    }
    if (passForm.newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      showToast('Mật khẩu xác nhận không trùng khớp', 'error');
      return;
    }

    try {
      setSavingPass(true);
      const res = await authService.changePassword({
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword
      });
      if (res.data?.success) {
        showToast('Đổi mật khẩu thành công! Đang chuyển hướng...', 'success');
        setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Mật khẩu hiện tại không đúng', 'error');
    } finally {
      setSavingPass(false);
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  // Xác định hạng thành viên
  const getMembershipTier = (spent) => {
    if (spent >= 3000000) return { title: 'Thành viên Vàng (Gold)', badge: 'bg-gradient-to-r from-amber-400 to-amber-600 text-white', icon: 'ph-crown' };
    if (spent >= 1000000) return { title: 'Thành viên Bạc (Silver)', badge: 'bg-gradient-to-r from-stone-400 to-stone-600 text-white', icon: 'ph-star' };
    return { title: 'Thành viên Thân thiết', badge: 'bg-[#FAF5EE] text-[#8C4A32] border border-[#8C4A32]/30' };
  };

  const membership = getMembershipTier(stats.totalSpent);

  return (
    <div className="bg-[#fbf9f6] min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8 animate-[fadeIn_0.25s_ease-out]">

        {/* Breadcrumbs */}
        <div className="flex items-center flex-wrap text-[11px] font-bold uppercase tracking-widest text-stone-400">
          <Link to="/" className="hover:text-[#4A2C2A] transition-colors">
            Trang Chủ
          </Link>
          <span className="mx-2 text-stone-300">/</span>
          <span className="text-[#8C4A32]">Trung Tâm Khách Hàng</span>
        </div>

        {/* TOAST ALERT BANNER */}
        {toast.show && (
          <div className="fixed top-6 right-6 z-50 animate-[slideDown_0.3s_ease-out]">
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-medium ${toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
              <i className={`text-lg ${toast.type === 'success' ? 'ph-bold ph-check-circle text-emerald-600' : 'ph-bold ph-warning-circle text-rose-600'}`}></i>
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* HEADER HERO CARD: THẺ THÀNH VIÊN VÀ THỐNG KÊ NHANH       */}
        {/* ======================================================== */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#4A2C2A] via-[#3D2422] to-[#251312] text-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-[#4A2C2A]/40">
          {/* Background Ambient Glow */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-20 -top-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Cột trái: Thông tin đại diện & Hạng */}
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#FAF5EE] to-[#EADBCA] text-[#4A2C2A] flex items-center justify-center font-serif-display text-3xl sm:text-4xl font-bold shadow-lg ring-4 ring-white/10">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-stone-900 flex items-center justify-center text-sm shadow-md ring-2 ring-[#4A2C2A]">
                  <i className="ph-fill ph-flame"></i>
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif-display font-bold text-[#FAF5EE] truncate">
                    {user?.name || 'Khách hàng Candlet'}
                  </h1>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs ${membership.badge}`}>
                    <i className={`ph-fill ${membership.icon} text-xs`}></i>
                    {membership.title}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-stone-300/90 flex items-center gap-2 truncate">
                  <i className="ph-light ph-envelope text-sm"></i>
                  {user?.email}
                </p>

                {user?.phone && (
                  <p className="text-xs text-stone-300/80 flex items-center gap-2">
                    <i className="ph-light ph-phone text-sm"></i>
                    {user.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Cột phải: 4 Card chỉ số nhanh */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 lg:w-auto shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10">
              {/* Tổng đơn */}
              <Link
                to="/orders"
                className="bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 text-center border border-white/10 transition-all hover:scale-105 group"
              >
                <div className="text-xs text-stone-300 font-medium flex items-center justify-center gap-1 mb-1">
                  <i className="ph-light ph-receipt"></i>
                  <span>Tổng đơn</span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-amber-200 group-hover:text-white">
                  {stats.totalOrders}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Đã đặt</div>
              </Link>

              {/* Đang giao */}
              <Link
                to="/orders"
                className="bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 text-center border border-white/10 transition-all hover:scale-105 group"
              >
                <div className="text-xs text-stone-300 font-medium flex items-center justify-center gap-1 mb-1">
                  <i className="ph-light ph-truck"></i>
                  <span>Đang giao</span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-sky-200 group-hover:text-white">
                  {stats.activeOrders}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Tiến trình</div>
              </Link>

              {/* Yêu thích */}
              <Link
                to="/wishlist"
                className="bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 text-center border border-white/10 transition-all hover:scale-105 group"
              >
                <div className="text-xs text-stone-300 font-medium flex items-center justify-center gap-1 mb-1">
                  <i className="ph-light ph-heart text-rose-300"></i>
                  <span>Yêu thích</span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-rose-300 group-hover:text-white">
                  {wishlistCount}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Nến đã lưu</div>
              </Link>

              {/* Tích luỹ */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 text-center border border-white/10">
                <div className="text-xs text-stone-300 font-medium flex items-center justify-center gap-1 mb-1">
                  <span>Tích luỹ</span>
                </div>
                <div className="text-sm sm:text-base font-mono font-bold text-emerald-200 truncate">
                  {formatPrice(stats.totalSpent)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">{stats.completedOrders} đơn nhận</div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MAIN BODY: SIDEBAR ĐIỀU HƯỚNG & KHU VỰC CÀI ĐẶT           */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* CỘT TRÁI: MENU ĐIỀU HƯỚNG TÀI KHOẢN (4 COLS) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-sm space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3 pb-2 border-b border-stone-100">
                Quản lý tài khoản
              </div>

              {/* Tab Hồ sơ */}
              <button
                onClick={() => setActiveTab('info')}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'info'
                  ? 'bg-[#FAF5EE] text-[#4A2C2A] shadow-xs'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base ${activeTab === 'info' ? 'bg-[#4A2C2A] text-white' : 'bg-stone-100 text-stone-500'
                    }`}>
                    <i className="ph-bold ph-user"></i>
                  </div>
                  <span>Thông tin cá nhân</span>
                </div>
                <i className="ph-bold ph-caret-right text-xs opacity-60"></i>
              </button>

              {/* Tab Bảo mật */}
              <button
                onClick={() => setActiveTab('password')}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'password'
                  ? 'bg-[#FAF5EE] text-[#4A2C2A] shadow-xs'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base ${activeTab === 'password' ? 'bg-[#4A2C2A] text-white' : 'bg-stone-100 text-stone-500'
                    }`}>
                    <i className="ph-bold ph-shield-check"></i>
                  </div>
                  <span>Mật khẩu & Bảo mật</span>
                </div>
                <i className="ph-bold ph-caret-right text-xs opacity-60"></i>
              </button>

              {/* Link Xem Lịch sử Đơn Hàng */}
              <Link
                to="/orders"
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center text-base">
                    <i className="ph-bold ph-package"></i>
                  </div>
                  <span>Đơn mua của tôi</span>
                </div>
                {stats.activeOrders > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {stats.activeOrders} đang giao
                  </span>
                )}
              </Link>

              {/* Link Xem Sản Phẩm Yêu Thích */}
              <Link
                to="/wishlist"
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base">
                    <i className="ph-bold ph-heart"></i>
                  </div>
                  <span>Sản phẩm yêu thích</span>
                </div>
                {wishlistCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Quick Box: Hỗ trợ khách hàng */}
            <div className="bg-gradient-to-br from-[#FAF5EE] to-[#F3E8DB] rounded-3xl p-5 sm:p-6 border border-[#EADBCA] text-[#4A2C2A] space-y-3 shadow-xs">
              <div className="flex items-center gap-2.5 font-serif-display font-bold text-sm">
                <i className="ph-fill ph-heart text-rose-500 text-base"></i>
                <span>Chăm Sóc Khách Hàng</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Cần hỗ trợ về mùi hương nến, thông điệp cá nhân hoá hoặc khiếu nại giao nhận?
              </p>
              <div className="pt-1 flex items-center gap-2">
                <a
                  href="tel:0987654321"
                  className="flex-1 text-center py-2 px-3 rounded-xl bg-white text-xs font-bold text-[#4A2C2A] border border-[#EADBCA] hover:bg-stone-50 transition-colors shadow-2xs"
                >
                  Hotline Hỗ Trợ
                </a>
                <Link
                  to="/shop"
                  className="flex-1 text-center py-2 px-3 rounded-xl bg-[#4A2C2A] text-white text-xs font-bold hover:bg-[#381B18] transition-colors shadow-2xs"
                >
                  Mua Thêm Nến
                </Link>
              </div>
            </div>

            {/* Nút Đăng xuất */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-stone-500 hover:text-rose-600 hover:bg-rose-50/60 border border-stone-200/80 hover:border-rose-200 transition-all cursor-pointer"
            >
              <i className="ph-bold ph-sign-out text-base"></i>
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>

          {/* CỘT PHẢI: CHI TIẾT TỪNG TAB NỘI DUNG (8 COLS) */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-stone-200/90 shadow-sm">

              {/* TAB 1: THÔNG TIN CÁ NHÂN */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-stone-100">
                    <h2 className="text-xl sm:text-2xl font-serif-display font-bold text-[#4A2C2A]">
                      Hồ Sơ & Địa Chỉ Giao Hàng
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1">
                      Cập nhật thông tin nhận hàng chính xác để các mẻ nến thơm được giao đến bạn nguyên vẹn và nhanh chóng nhất.
                    </p>
                  </div>

                  <form onSubmit={handleUpdateInfo} className="space-y-6">
                    {/* Phần 1: Thông tin liên lạc */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C4A32] flex items-center gap-2">
                        <i className="ph-bold ph-identification-badge text-sm"></i>
                        Thông tin liên hệ
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Email (Readonly) */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-stone-700">Địa chỉ Email</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                              <i className="ph-bold ph-envelope"></i>
                            </span>
                            <input
                              type="text"
                              disabled
                              value={user?.email || ''}
                              className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl bg-stone-100/80 border border-stone-200 text-stone-500 cursor-not-allowed font-medium"
                            />
                          </div>
                          <p className="text-[10px] text-stone-400">Email định danh tài khoản không thể chỉnh sửa</p>
                        </div>

                        {/* Họ tên */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-stone-700">
                            Họ và tên người nhận <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                              <i className="ph-bold ph-user"></i>
                            </span>
                            <input
                              type="text"
                              required
                              value={infoForm.name}
                              onChange={e => setInfoForm({ ...infoForm, name: e.target.value })}
                              placeholder="Nhập họ và tên đầy đủ..."
                              className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl bg-stone-50/50 border border-stone-200 text-[#4A2C2A] focus:outline-none focus:border-[#4A2C2A] focus:bg-white transition-all font-medium"
                            />
                          </div>
                        </div>

                        {/* Số điện thoại */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-bold text-stone-700">
                            Số điện thoại nhận hàng <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                              <i className="ph-bold ph-phone"></i>
                            </span>
                            <input
                              type="tel"
                              value={infoForm.phone}
                              onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })}
                              placeholder="VD: 0987654321..."
                              className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl bg-stone-50/50 border border-stone-200 text-[#4A2C2A] focus:outline-none focus:border-[#4A2C2A] focus:bg-white transition-all font-mono font-medium"
                            />
                          </div>
                          <p className="text-[10px] text-stone-400">Shipper sẽ gọi đến số này để xác nhận giao hộp quà</p>
                        </div>
                      </div>
                    </div>

                    {/* Phần 2: Địa chỉ giao hàng mặc định */}
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C4A32] flex items-center gap-2">
                        <i className="ph-bold ph-map-pin text-sm"></i>
                        Địa chỉ nhận nến mặc định
                      </h3>

                      <div className="space-y-1.5">
                        <AddressSelector
                          initialAddress={infoForm.address}
                          onChange={(data) => {
                            if (data.fullAddress && data.fullAddress !== infoForm.address) {
                              setInfoForm(prev => ({ ...prev, address: data.fullAddress }));
                            }
                          }}
                          onConfirm={handleAddressConfirm}
                          showAddressNote={true}
                          required={false}
                        />
                        <p className="text-[10px] text-stone-400 mt-2">Hệ thống sẽ tự động điền địa chỉ này cho bạn ở bước Checkout để tiết kiệm thời gian</p>
                      </div>
                    </div>

                    {/* Nút lưu */}
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
                      <button
                        type="submit"
                        disabled={savingInfo}
                        className="px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#4A2C2A] hover:bg-[#381B18] text-white transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingInfo ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <>
                            <i className="ph-bold ph-floppy-disk text-sm"></i>
                            <span>Lưu thay đổi</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: ĐỔI MẬT KHẨU & BẢO MẬT */}
              {activeTab === 'password' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-stone-100">
                    <h2 className="text-xl sm:text-2xl font-serif-display font-bold text-[#4A2C2A]">
                      Đổi Mật Khẩu
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1">
                      Để bảo mật tài khoản cá nhân, vui lòng sử dụng mật khẩu mạnh kết hợp chữ, số và không chia sẻ cho người khác.
                    </p>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-lg">
                    {/* Mật khẩu hiện tại */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">
                        Mật khẩu hiện tại <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                          <i className="ph-bold ph-key"></i>
                        </span>
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          required
                          value={passForm.currentPassword}
                          onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })}
                          placeholder="Nhập mật khẩu đang sử dụng..."
                          className="w-full pl-10 pr-12 py-3 text-xs sm:text-sm rounded-2xl bg-stone-50/50 border border-stone-200 text-[#4A2C2A] focus:outline-none focus:border-[#4A2C2A] focus:bg-white transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        >
                          <i className={`ph-bold ${showCurrentPass ? 'ph-eye-slash' : 'ph-eye'} text-base`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Mật khẩu mới */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">
                        Mật khẩu mới <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                          <i className="ph-bold ph-lock-key"></i>
                        </span>
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={passForm.newPassword}
                          onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                          placeholder="Tối thiểu 6 ký tự..."
                          className="w-full pl-10 pr-12 py-3 text-xs sm:text-sm rounded-2xl bg-stone-50/50 border border-stone-200 text-[#4A2C2A] focus:outline-none focus:border-[#4A2C2A] focus:bg-white transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        >
                          <i className={`ph-bold ${showNewPass ? 'ph-eye-slash' : 'ph-eye'} text-base`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Xác nhận mật khẩu mới */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">
                        Xác nhận lại mật khẩu mới <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                          <i className="ph-bold ph-check"></i>
                        </span>
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          required
                          value={passForm.confirmPassword}
                          onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                          placeholder="Nhập lại mật khẩu mới..."
                          className="w-full pl-10 pr-12 py-3 text-xs sm:text-sm rounded-2xl bg-stone-50/50 border border-stone-200 text-[#4A2C2A] focus:outline-none focus:border-[#4A2C2A] focus:bg-white transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        >
                          <i className={`ph-bold ${showConfirmPass ? 'ph-eye-slash' : 'ph-eye'} text-base`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Nút cập nhật mật khẩu */}
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
                      <button
                        type="submit"
                        disabled={savingPass}
                        className="px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#4A2C2A] hover:bg-[#381B18] text-white transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingPass ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Đang cập nhật...</span>
                          </>
                        ) : (
                          <>
                            <i className="ph-bold ph-shield-check text-sm"></i>
                            <span>Đổi Mật Khẩu</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* MODAL XÁC NHẬN ĐĂNG XUẤT                                */}
      {/* ======================================================== */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-2xl">
              <i className="ph-bold ph-sign-out"></i>
            </div>

            <div>
              <h3 className="text-lg font-serif-display font-bold text-[#4A2C2A]">
                Đăng xuất tài khoản?
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Bạn sẽ cần đăng nhập lại nếu muốn tiếp tục kiểm tra đơn hàng hoặc mua nến thơm.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-full text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Ở lại
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                  navigate('/');
                }}
                className="flex-1 py-2.5 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
