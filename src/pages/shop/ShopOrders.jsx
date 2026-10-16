import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { orderService } from '../../services/orderService';
import { getImageUrl } from '../../utils/imageUtils';

export default function ShopOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterExpressOnly, setFilterExpressOnly] = useState(false);

  // Modal xem chi tiết đơn hàng
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  // Modal huỷ đơn hàng
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Guest lookup (khách chưa đăng nhập)
  const [guestPhone, setGuestPhone] = useState('');
  const [guestOrderId, setGuestOrderId] = useState('');
  const [searchingGuest, setSearchingGuest] = useState(false);

  // Danh sách các lý do huỷ đơn mẫu để khách chọn nhanh
  const quickReasons = [
    'Muốn đổi mùi hương / kích thước nến',
    'Nhập sai địa chỉ hoặc số điện thoại',
    'Muốn đặt thêm món khác để gộp đơn',
    'Thời gian giao hàng chưa phù hợp',
    'Tìm thấy sản phẩm khác ưng ý hơn'
  ];

  // Fetch orders của user
  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await orderService.getShopOrders({ user_id: user._id || user.id });
      if (res.data?.success) {
        setOrders(res.data.data || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Tra cứu đơn khách vãng lai
  const handleGuestSearch = async (e) => {
    e.preventDefault();
    if (!guestPhone.trim() && !guestOrderId.trim()) {
      alert('Vui lòng nhập Số điện thoại hoặc Mã đơn hàng để tra cứu');
      return;
    }
    try {
      setSearchingGuest(true);
      const params = {};
      if (guestPhone.trim()) params.phone = guestPhone.trim();
      if (guestOrderId.trim()) params.orderId = guestOrderId.trim();

      const res = await orderService.getShopOrders(params);
      if (res.data?.success) {
        setOrders(res.data.data || []);
      }
    } catch (err) {
      console.error('Lỗi tra cứu đơn:', err);
      alert('Có lỗi xảy ra khi tra cứu đơn hàng');
    } finally {
      setSearchingGuest(false);
    }
  };

  // Huỷ đơn hàng
  const handleCancelOrder = async () => {
    if (!cancelModalOrder) return;
    try {
      setCancelling(true);
      setCancelError('');
      const finalReason = cancelReason.trim() || 'Khách hàng yêu cầu huỷ đơn';
      const res = await orderService.cancelShopOrder(cancelModalOrder.orderId, finalReason);
      if (res.data?.success) {
        // Cập nhật lại trong state orders
        setOrders(prev => prev.map(o => o.orderId === cancelModalOrder.orderId ? res.data.data : o));
        if (selectedOrderDetail && selectedOrderDetail.orderId === cancelModalOrder.orderId) {
          setSelectedOrderDetail(res.data.data);
        }
        setCancelModalOrder(null);
        setCancelReason('');
      }
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Không thể huỷ đơn hàng lúc này');
    } finally {
      setCancelling(false);
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Helper kiểm tra đơn có thể huỷ ("chỉ được huỷ khi chưa giao")
  const canCancel = (order) => {
    const dStatus = order.delivery_status || 'pending';
    const isPaidTransfer = order.payment_method === 'transfer' && order.payment_status === 'paid';
    return !isPaidTransfer && (dStatus === 'pending' || dStatus === 'confirmed');
  };

  // Đếm số lượng đơn theo từng trạng thái để hiển thị badge trên tab
  const counts = useMemo(() => {
    const c = { all: orders.length, pending: 0, confirmed: 0, shipping: 0, delivered: 0, cancelled: 0 };
    orders.forEach(o => {
      const s = o.delivery_status || (o.source === 'website' ? 'pending' : 'delivered');
      if (s === 'pending') c.pending++;
      else if (s === 'confirmed') c.confirmed++;
      else if (s === 'shipping') c.shipping++;
      else if (s === 'delivered') c.delivered++;
      else if (s === 'cancelled' || s === 'failed' || o.status === 'returned') c.cancelled++;
    });
    return c;
  }, [orders]);

  // Lọc đơn hàng theo tab + từ khóa tìm kiếm + lọc hỏa tốc
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const dStatus = order.delivery_status || (order.source === 'website' ? 'pending' : 'delivered');

      // 1. Lọc theo tab
      if (activeTab === 'pending' && dStatus !== 'pending') return false;
      if (activeTab === 'confirmed' && dStatus !== 'confirmed') return false;
      if (activeTab === 'shipping' && dStatus !== 'shipping') return false;
      if (activeTab === 'delivered' && dStatus !== 'delivered') return false;
      if (activeTab === 'cancelled' && !['cancelled', 'failed'].includes(dStatus) && order.status !== 'returned') return false;

      // 2. Lọc theo hỏa tốc
      if (filterExpressOnly && order.shippingMethod !== 'express') return false;

      // 3. Lọc theo từ khóa tìm kiếm
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchId = (order.orderId || '').toLowerCase().includes(kw);
        const matchName = (order.customer_name || '').toLowerCase().includes(kw);
        const matchPhone = (order.customer_phone || '').includes(kw);
        const matchProduct = (order.items || []).some(item => 
          (item.product_name || '').toLowerCase().includes(kw) || 
          (item.sku_label || '').toLowerCase().includes(kw)
        );
        if (!matchId && !matchName && !matchPhone && !matchProduct) return false;
      }

      return true;
    });
  }, [orders, activeTab, filterExpressOnly, searchKeyword]);

  // Render badge trạng thái giao hàng
  const getStatusBadge = (order) => {
    const dStatus = order.delivery_status || (order.source === 'website' ? 'pending' : 'delivered');

    switch (dStatus) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Chờ xác nhận
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <i className="ph-bold ph-package text-sm"></i>
            Đã chấp nhận
          </span>
        );
      case 'shipping':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <i className="ph-bold ph-truck text-sm"></i>
            Đang giao hàng
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <i className="ph-bold ph-check-circle text-sm"></i>
            Giao thành công
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <i className="ph-bold ph-x-circle text-sm"></i>
            Giao thất bại
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
            <i className="ph-bold ph-prohibit text-sm"></i>
            Đã huỷ
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#fbf9f6] min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-7 animate-[fadeIn_0.25s_ease-out]">

        {/* ======================================================== */}
        {/* BREADCRUMB & TIÊU ĐỀ TRANG                                */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
          <div>
            <div className="flex items-center flex-wrap text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1">
              <Link to="/" className="hover:text-[#4A2C2A] transition-colors">
                Trang Chủ
              </Link>
              <span className="mx-2 text-stone-300">/</span>
              <Link to="/profile" className="hover:text-[#4A2C2A] transition-colors">
                Tài Khoản
              </Link>
              <span className="mx-2 text-stone-300">/</span>
              <span className="text-[#8C4A32]">Đơn Mua</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-display font-bold text-[#4A2C2A]">
              Lịch Sử Đơn Hàng
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Theo dõi lộ trình giao nhận nến thơm quà tặng và quản lý các đơn hàng của bạn
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors shadow-2xs"
            >
              <i className="ph-bold ph-user text-sm"></i>
              <span>Hồ sơ của bạn</span>
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#4A2C2A] text-white text-xs font-bold hover:bg-[#381B18] transition-colors shadow-2xs"
            >
              <span>Mua thêm nến</span>
              <i className="ph-bold ph-arrow-right text-xs"></i>
            </Link>
          </div>
        </div>

        {/* ======================================================== */}
        {/* FORM TRA CỨU NHANH CHO KHÁCH CHƯA ĐĂNG NHẬP              */}
        {/* ======================================================== */}
        {!user && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF5EE] text-[#8C4A32] flex items-center justify-center text-lg">
                <i className="ph-bold ph-magnifying-glass"></i>
              </div>
              <div>
                <h3 className="text-sm font-serif-display font-bold text-[#4A2C2A]">
                  Tra cứu nhanh đơn hàng (Khách vãng lai)
                </h3>
                <p className="text-xs text-stone-500">
                  Nhập số điện thoại đặt hàng hoặc mã đơn để theo dõi tiến độ vận chuyển
                </p>
              </div>
            </div>

            <form onSubmit={handleGuestSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <input
                  type="tel"
                  placeholder="Số điện thoại nhận hàng..."
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  className="w-full px-4 py-3 text-xs rounded-2xl bg-stone-50/70 border border-stone-200 focus:outline-none focus:border-[#4A2C2A] font-mono"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  placeholder="Mã đơn (VD: DH-1234567)..."
                  value={guestOrderId}
                  onChange={e => setGuestOrderId(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 text-xs rounded-2xl bg-stone-50/70 border border-stone-200 focus:outline-none focus:border-[#4A2C2A] font-mono"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={searchingGuest}
                  className="w-full bg-[#4A2C2A] hover:bg-[#381B18] text-white text-xs font-bold uppercase tracking-wider rounded-2xl py-3 px-4 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  {searchingGuest ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <i className="ph-bold ph-magnifying-glass"></i>
                  )}
                  <span>Tra cứu</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* THANH TÌM KIẾM & BỘ LỌC ĐƠN HÀNG                         */}
        {/* ======================================================== */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Ô tìm kiếm từ khoá */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              <i className="ph-bold ph-magnifying-glass text-sm"></i>
            </span>
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo mã đơn #DH, tên nến thơm, hoặc số điện thoại..."
              className="w-full pl-10 pr-10 py-2.5 text-xs rounded-2xl bg-white border border-stone-200/90 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#4A2C2A] shadow-2xs font-medium"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <i className="ph-bold ph-x text-xs"></i>
              </button>
            )}
          </div>

          {/* Nút lọc nhanh đơn Hỏa tốc 4h */}
          <button
            onClick={() => setFilterExpressOnly(!filterExpressOnly)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
              filterExpressOnly
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-xs'
                : 'bg-white text-stone-700 border-stone-200/90 hover:bg-stone-50'
            }`}
          >
            <i className={`ph-fill ph-lightning text-xs ${filterExpressOnly ? 'text-white' : 'text-orange-500'}`}></i>
            <span>Chỉ đơn Hỏa tốc 4h</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TABS TRẠNG THÁI GIAO HÀNG VỚI SỐ ĐẾM ĐỘNG                */}
        {/* ======================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold -mx-2 px-2 sm:mx-0 sm:px-0">
          {[
            { key: 'all', label: 'Tất cả', icon: 'ph-squares-four', count: counts.all },
            { key: 'pending', label: 'Chờ duyệt', icon: 'ph-clock', count: counts.pending },
            { key: 'confirmed', label: 'Đã nhận', icon: 'ph-package', count: counts.confirmed },
            { key: 'shipping', label: 'Đang giao', icon: 'ph-truck', count: counts.shipping },
            { key: 'delivered', label: 'Đã giao', icon: 'ph-check-circle', count: counts.delivered },
            { key: 'cancelled', label: 'Đã huỷ', icon: 'ph-prohibit', count: counts.cancelled },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border active:scale-95 text-xs shadow-2xs ${
                activeTab === tab.key
                  ? 'bg-[#4A2C2A] text-white border-[#4A2C2A] font-bold'
                  : 'bg-white text-stone-600 hover:text-stone-900 border-stone-200/80 hover:bg-stone-50'
              }`}
            >
              <i className={`ph-bold ${tab.icon} text-xs ${activeTab === tab.key ? 'text-amber-300' : 'text-stone-400'}`}></i>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ======================================================== */}
        {/* DANH SÁCH THẺ ĐƠN HÀNG (ORDER CARDS)                     */}
        {/* ======================================================== */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 bg-white rounded-3xl border border-stone-200/80">
            <div className="w-10 h-10 border-3 border-[#4A2C2A]/20 border-t-[#4A2C2A] rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-serif-display text-stone-500 tracking-wider">
              Đang tải danh sách đơn hàng nến thơm...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/90 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#FAF5EE] text-[#8C4A32] flex items-center justify-center mx-auto text-2xl">
              <i className="ph-light ph-receipt"></i>
            </div>
            <h3 className="text-lg font-serif-display font-bold text-[#4A2C2A]">
              Không tìm thấy đơn hàng nào
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
              {searchKeyword || filterExpressOnly
                ? 'Không có đơn hàng nào khớp với điều kiện tìm kiếm. Hãy thử xóa bớt bộ lọc.'
                : 'Bạn chưa có đơn hàng nào ở mục này. Hãy khám phá các mẻ nến thơm thủ công tinh tế của Candlet nhé!'}
            </p>
            <div className="pt-2">
              {searchKeyword || filterExpressOnly ? (
                <button
                  onClick={() => {
                    setSearchKeyword('');
                    setFilterExpressOnly(false);
                    setActiveTab('all');
                  }}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-[#4A2C2A] bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              ) : (
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 bg-[#4A2C2A] hover:bg-[#381B18] text-white text-xs font-bold uppercase tracking-wider py-3 px-6 rounded-full shadow-sm transition-all"
                >
                  <span>Khám phá nến thơm</span>
                  <i className="ph-bold ph-arrow-right text-xs"></i>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map(order => {
              const dStatus = order.delivery_status || 'pending';
              const isCancelled = dStatus === 'cancelled';
              const isFailed = dStatus === 'failed';
              const isExpress = order.shippingMethod === 'express';

              return (
                <div
                  key={order._id || order.orderId}
                  className={`bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
                    isExpress
                      ? 'border-l-4 border-l-orange-500 border-stone-200/90 ring-1 ring-orange-400/20'
                      : 'border-stone-200/90'
                  }`}
                >
                  {/* CARD HEADER: MÃ ĐƠN, HỎA TỐC, NGÀY ĐẶT, TRẠNG THÁI */}
                  <div className={`p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-3 ${
                    isExpress
                      ? 'bg-gradient-to-r from-orange-50/60 via-amber-50/30 to-white border-orange-100'
                      : 'bg-stone-50/60 border-stone-100'
                  }`}>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#4A2C2A] bg-white px-3 py-1 rounded-xl border border-stone-200 shadow-2xs">
                        #{order.orderId}
                      </span>

                      {order.payment_method === 'transfer' && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold ${
                          order.payment_status === 'refunded'
                            ? 'bg-stone-100 text-stone-600 border border-stone-200'
                            : order.payment_status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <i className={`ph-bold ${order.payment_status === 'refunded' ? 'ph-arrow-u-up-left' : order.payment_status === 'paid' ? 'ph-check-circle' : 'ph-clock'}`}></i>
                          {order.payment_status === 'refunded' ? 'Đã hoàn tiền' : order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                        </span>
                      )}

                      {isExpress && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10.5px] font-black uppercase tracking-wider shadow-xs shadow-orange-300">
                          <i className="ph-fill ph-lightning text-xs animate-bounce"></i>
                          HỎA TỐC 4H
                        </span>
                      )}

                      <span className="text-[11px] sm:text-xs text-stone-400 flex items-center gap-1">
                        <i className="ph-light ph-clock"></i>
                        {formatDate(order.ordered_at)}
                      </span>
                    </div>

                    <div>
                      {getStatusBadge(order)}
                    </div>
                  </div>

                  {/* VISUAL TIMELINE TIẾN ĐỘ VẬN CHUYỂN (Khi chưa bị huỷ / thất bại) */}
                  {!isCancelled && !isFailed && (
                    <div className="px-6 py-4 bg-white border-b border-stone-100">
                      <div className="grid grid-cols-4 gap-2 text-center relative py-1">
                        {/* Thanh progress bar ngầm */}
                        <div className="absolute top-4 left-[12%] right-[12%] h-1 bg-stone-100 -z-0">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                            style={{
                              width:
                                dStatus === 'pending'
                                  ? '15%'
                                  : dStatus === 'confirmed'
                                  ? '48%'
                                  : dStatus === 'shipping'
                                  ? '80%'
                                  : '100%'
                            }}
                          ></div>
                        </div>

                        {/* Bước 1: Đặt đơn */}
                        <div className="flex flex-col items-center relative z-10">
                          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
                            <i className="ph-bold ph-check"></i>
                          </div>
                          <span className="text-[11px] font-bold text-stone-700 mt-1.5">Đặt đơn</span>
                          <span className="text-[9.5px] text-stone-400">Thành công</span>
                        </div>

                        {/* Bước 2: Shop duyệt */}
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-xs ${
                              dStatus === 'pending'
                                ? 'bg-amber-500 text-white animate-pulse ring-4 ring-amber-100'
                                : ['confirmed', 'shipping', 'delivered'].includes(dStatus)
                                ? 'bg-emerald-500 text-white'
                                : 'bg-stone-200 text-stone-400'
                            }`}
                          >
                            {['confirmed', 'shipping', 'delivered'].includes(dStatus) ? (
                              <i className="ph-bold ph-check"></i>
                            ) : (
                              <i className="ph-bold ph-hourglass-simple"></i>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-stone-700 mt-1.5">Đã duyệt</span>
                          <span className="text-[9.5px] text-stone-400">
                            {dStatus === 'pending' ? 'Chờ xác nhận' : 'Chuẩn bị nến'}
                          </span>
                        </div>

                        {/* Bước 3: Đang giao */}
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-xs ${
                              dStatus === 'shipping'
                                ? 'bg-indigo-600 text-white animate-pulse ring-4 ring-indigo-100'
                                : dStatus === 'delivered'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-stone-100 text-stone-400 border border-stone-200'
                            }`}
                          >
                            {dStatus === 'delivered' ? (
                              <i className="ph-bold ph-check"></i>
                            ) : (
                              <i className="ph-bold ph-truck"></i>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-stone-700 mt-1.5">Đang giao</span>
                          <span className="text-[9.5px] text-stone-400">
                            {isExpress ? 'Hỏa tốc 4h' : 'Tiêu chuẩn'}
                          </span>
                        </div>

                        {/* Bước 4: Hoàn tất */}
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-xs ${
                              dStatus === 'delivered'
                                ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                                : 'bg-stone-100 text-stone-400 border border-stone-200'
                            }`}
                          >
                            <i className="ph-bold ph-package"></i>
                          </div>
                          <span className="text-[11px] font-bold text-stone-700 mt-1.5">Đã nhận</span>
                          <span className="text-[9.5px] text-stone-400">Giao thành công</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* THÔNG BÁO HUỶ / THẤT BẠI NẾU CÓ */}
                  {isCancelled && (
                    <div className="px-6 py-3 bg-stone-50 border-b border-stone-200 text-xs text-stone-600 flex items-center gap-2">
                      <i className="ph-bold ph-info text-stone-500 text-sm shrink-0"></i>
                      <span>
                        Đơn hàng đã được huỷ vào {formatDate(order.cancelled_at || order.updatedAt)}.
                        {order.cancelled_reason && <em> Lý do: "{order.cancelled_reason}"</em>}
                      </span>
                    </div>
                  )}

                  {/* DANH SÁCH NẾN THƠM TRONG ĐƠN */}
                  <div className="p-4 sm:p-6 divide-y divide-stone-100">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {item.product_image ? (
                            <img
                              src={getImageUrl(item.product_image)}
                              alt={item.product_name}
                              className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-2xl border border-stone-200 shrink-0 shadow-2xs hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                              <i className="ph-light ph-flame text-2xl text-amber-600"></i>
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                              {item.product_name}
                            </p>
                            {item.sku_label && (
                              <p className="text-[11px] text-[#8C4A32] font-semibold mt-0.5">
                                {item.sku_label}
                              </p>
                            )}
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              Số lượng: <span className="font-bold text-stone-700">×{item.quantity}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs sm:text-sm font-bold font-mono text-[#4A2C2A]">
                            {formatPrice((item.unit_price || 0) * (item.quantity || 1))}
                          </p>
                          <p className="text-[10px] text-stone-400">
                            {formatPrice(item.unit_price)}/hộp
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* THÔNG ĐIỆP BÍ MẬT / GHI CHÚ QUÀ TẶNG (NẾU CÓ) */}
                  {order.note && (
                    <div className="mx-4 sm:mx-6 mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#FAF5EE] to-[#F5EFE6] border border-[#EADBCA] flex items-start gap-3 text-xs text-[#4A2C2A]">
                      <div className="w-7 h-7 rounded-xl bg-white text-[#8C4A32] flex items-center justify-center shrink-0 shadow-2xs">
                        <i className="ph-fill ph-chat-centered-text text-sm"></i>
                      </div>
                      <div>
                        <span className="font-bold uppercase tracking-wider text-[10px] text-[#8C4A32] block">
                          Lời nhắn / Thông điệp nến quà tặng:
                        </span>
                        <p className="italic text-stone-700 mt-0.5">"{order.note}"</p>
                      </div>
                    </div>
                  )}

                  {/* CARD FOOTER: NGƯỜI NHẬN + TỔNG TIỀN + CÁC NÚT THAO TÁC */}
                  <div className="p-4 sm:p-6 bg-[#FAF5EE]/40 border-t border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Cột trái: Thông tin nhận hàng */}
                    <div className="text-xs text-stone-600 space-y-1.5 flex-1 min-w-0">
                      <p className="font-bold text-stone-800 flex items-center gap-1.5 flex-wrap">
                        <i className="ph-bold ph-user text-xs text-stone-500 shrink-0"></i>
                        <span>{order.customer_name}</span>
                        <span className="font-mono text-stone-500 font-normal">({order.customer_phone})</span>
                      </p>
                      <div className="text-stone-600 flex items-start gap-1.5 flex-1 min-w-0">
                        <i className="ph-bold ph-map-pin text-xs text-stone-400 mt-0.5 shrink-0"></i>
                        <span className="flex-1 min-w-0 text-stone-600 font-medium leading-relaxed">
                          {order.customer_address || order.address || order.shipping_address?.full_address || 'Chưa cập nhật địa chỉ giao hàng'}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-2 pt-0.5">
                        <span className={`font-medium ${order.payment_method === 'transfer' ? 'text-emerald-700' : 'text-stone-700'}`}>
                          {order.payment_method === 'transfer'
                            ? (order.payment_status === 'refunded' ? 'Chuyển khoản — Đã hoàn tiền' : order.payment_status === 'paid' ? 'Chuyển khoản — Đã thanh toán' : 'Chuyển khoản — Chờ xác nhận')
                            : 'COD (Thanh toán khi nhận)'}
                        </span>
                        <span>•</span>
                        {isExpress ? (
                          <span className="inline-flex items-center gap-1 font-bold text-orange-600">
                            <i className="ph-fill ph-lightning text-xs"></i> Hỏa tốc 4h
                          </span>
                        ) : (
                          <span>Giao Tiêu chuẩn</span>
                        )}
                      </div>
                    </div>

                    {/* Cột phải: Tổng tiền và các nút bấm */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-stone-200/60">
                      <div className="text-left md:text-right pr-2">
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
                          Tổng thanh toán
                        </span>
                        <span className="text-base sm:text-lg font-bold font-mono text-[#8C4A32]">
                          {formatPrice(order.total_price)}
                        </span>
                      </div>

                      {/* Nút Xem chi tiết */}
                      <button
                        onClick={() => setSelectedOrderDetail(order)}
                        className="px-3.5 py-2 rounded-2xl text-xs font-bold text-stone-700 hover:text-[#4A2C2A] bg-white hover:bg-stone-50 border border-stone-200 shadow-2xs transition-all cursor-pointer"
                      >
                        Chi tiết
                      </button>

                      {/* Nút Huỷ đơn hàng (Nếu chưa giao) */}
                      {canCancel(order) ? (
                        <button
                          onClick={() => {
                            setCancelModalOrder(order);
                            setCancelReason('');
                            setCancelError('');
                          }}
                          className="px-3.5 py-2 rounded-2xl text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 transition-all cursor-pointer"
                        >
                          Huỷ đơn
                        </button>
                      ) : order.payment_method === 'transfer' && order.payment_status === 'paid' ? (
                        <div
                          className="px-3 py-1.5 rounded-2xl bg-amber-50 text-[10.5px] text-amber-700 text-center border border-amber-200"
                          title="Đơn đã thanh toán. Vui lòng liên hệ shop nếu cần huỷ hoặc hoàn tiền."
                        >
                          Đã thanh toán — liên hệ shop
                        </div>
                      ) : !isCancelled && !isFailed ? (
                        <div
                          className="px-3 py-1.5 rounded-2xl bg-stone-100 text-[10.5px] text-stone-400 text-center cursor-not-allowed"
                          title="Đơn hàng đã được bàn giao cho đơn vị vận chuyển, không thể huỷ"
                        >
                          Đang vận chuyển
                        </div>
                      ) : null}

                      {/* Nút Mua lại nếu đơn đã hoàn tất */}
                      {(dStatus === 'delivered' || isCancelled) && (
                        <Link
                          to="/shop"
                          className="px-3.5 py-2 rounded-2xl text-xs font-bold text-white bg-[#4A2C2A] hover:bg-[#381B18] transition-all shadow-2xs"
                        >
                          Mua lại
                        </Link>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL XEM CHI TIẾT ĐƠN HÀNG TOÀN DIỆN                    */}
      {/* ======================================================== */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-stone-200 max-h-[88vh] sm:max-h-[90vh] overflow-y-auto space-y-5 sm:space-y-6 no-scrollbar">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF5EE] text-[#8C4A32] flex items-center justify-center text-lg">
                  <i className="ph-bold ph-receipt"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-serif-display font-bold text-[#4A2C2A]">
                      Chi Tiết Đơn Hàng #{selectedOrderDetail.orderId}
                    </h3>
                    {selectedOrderDetail.shippingMethod === 'express' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-500 text-white uppercase">
                        HỎA TỐC 4H
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400">
                    Đặt lúc: {formatDate(selectedOrderDetail.ordered_at)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="ph-bold ph-x text-sm"></i>
              </button>
            </div>

            {/* Trạng thái đơn */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-100">
              <div className="text-xs">
                <span className="text-stone-400 block mb-0.5">Trạng thái giao hàng</span>
                <span className="font-bold text-stone-800">
                  {selectedOrderDetail.delivery_status === 'pending' && 'Chờ shop duyệt và đóng gói'}
                  {selectedOrderDetail.delivery_status === 'confirmed' && 'Shop đã chấp nhận đơn, đang chuẩn bị nến'}
                  {selectedOrderDetail.delivery_status === 'shipping' && 'Shipper đang giao hộp nến đến bạn'}
                  {selectedOrderDetail.delivery_status === 'delivered' && 'Đơn hàng đã được giao thành công'}
                  {selectedOrderDetail.delivery_status === 'cancelled' && 'Đơn hàng đã được huỷ'}
                  {selectedOrderDetail.delivery_status === 'failed' && 'Giao hàng thất bại'}
                </span>
              </div>
              <div>{getStatusBadge(selectedOrderDetail)}</div>
            </div>

            {/* Thông tin nhận hàng */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C4A32] flex items-center gap-1.5">
                <i className="ph-bold ph-map-pin"></i>
                Địa chỉ nhận hàng
              </h4>
              <div className="p-4 rounded-2xl bg-white border border-stone-200 text-xs text-stone-700 space-y-1">
                <p className="font-bold text-stone-900">
                  {selectedOrderDetail.customer_name} - {selectedOrderDetail.customer_phone}
                </p>
                <p className="text-stone-600 break-words font-medium">
                  {selectedOrderDetail.customer_address || selectedOrderDetail.address || selectedOrderDetail.shipping_address?.full_address || 'Chưa cập nhật địa chỉ giao hàng'}
                </p>
                <p className="text-[11px] text-stone-400 pt-1">
                  Phương thức: {selectedOrderDetail.payment_method === 'transfer'
                    ? (selectedOrderDetail.payment_status === 'refunded' ? 'Chuyển khoản — Đã hoàn tiền' : selectedOrderDetail.payment_status === 'paid' ? 'Chuyển khoản — Đã thanh toán' : 'Chuyển khoản — Chờ xác nhận')
                    : 'COD (Thanh toán khi nhận hàng)'} • Vận chuyển:{' '}
                  {selectedOrderDetail.shippingMethod === 'express' ? 'Hỏa tốc 4h' : 'Tiêu chuẩn'}
                </p>
              </div>
            </div>

            {/* Danh sách sản phẩm chi tiết */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C4A32] flex items-center gap-1.5">
                <i className="ph-bold ph-package"></i>
                Sản phẩm đã đặt ({selectedOrderDetail.items?.length || 0})
              </h4>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden p-3 bg-white">
                {selectedOrderDetail.items?.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                          <i className="ph-light ph-flame text-lg"></i>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">{item.product_name}</p>
                        {item.sku_label && (
                          <p className="text-[11px] text-[#8C4A32]">{item.sku_label}</p>
                        )}
                        <p className="text-[11px] text-stone-400">
                          {formatPrice(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold font-mono text-[#4A2C2A]">
                        {formatPrice((item.unit_price || 0) * (item.quantity || 1))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bảng hạch toán giá tiền */}
            <div className="space-y-2 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Tạm tính tiền hàng:</span>
                <span className="font-mono">
                  {formatPrice(
                    (selectedOrderDetail.items || []).reduce(
                      (sum, i) => sum + (i.unit_price || 0) * (i.quantity || 1),
                      0
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Phí vận chuyển ({selectedOrderDetail.shippingMethod === 'express' ? 'Hỏa tốc' : 'Tiêu chuẩn'}):</span>
                <span className="font-mono">{formatPrice(selectedOrderDetail.shipping_fee || 0)}</span>
              </div>
              {selectedOrderDetail.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Giảm giá voucher {selectedOrderDetail.discount_code ? `(${selectedOrderDetail.discount_code})` : ''}:</span>
                  <span className="font-mono">-{formatPrice(selectedOrderDetail.discount_amount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold text-[#4A2C2A]">
                <span>Tổng thanh toán:</span>
                <span className="font-mono text-base text-[#8C4A32]">
                  {formatPrice(selectedOrderDetail.total_price)}
                </span>
              </div>
            </div>

            {/* Nút đóng */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL HUỶ ĐƠN HÀNG CẢI TIẾN                              */}
      {/* ======================================================== */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-stone-200 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-2xl">
              <i className="ph-bold ph-warning"></i>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-[#4A2C2A] font-serif-display">
                Xác nhận huỷ đơn hàng #{cancelModalOrder.orderId}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Sau khi huỷ, số lượng nguyên liệu nến sẽ được tự động hoàn lại vào kho xưởng.
              </p>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-2xl border border-rose-200">
                {cancelError}
              </div>
            )}

            {/* Các lý do chọn nhanh */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Chọn nhanh lý do huỷ:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickReasons.map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`text-[11px] px-2.5 py-1 rounded-xl transition-all cursor-pointer border ${
                      cancelReason === reason
                        ? 'bg-[#4A2C2A] text-white border-[#4A2C2A]'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Ô nhập lý do chi tiết */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Lý do chi tiết <span className="font-normal text-stone-400">(tuỳ chọn)</span>
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Nhập lý do huỷ đơn hàng..."
                className="w-full text-xs p-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-[#4A2C2A] resize-none"
              />
            </div>

            {/* Nút thao tác */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelModalOrder(null)}
                disabled={cancelling}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Giữ lại đơn
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
              >
                {cancelling && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                )}
                <span>Xác nhận huỷ</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
