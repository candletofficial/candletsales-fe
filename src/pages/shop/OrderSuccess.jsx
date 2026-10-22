import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { cartService } from '../../services/cartService';
import api from '../../services/api';

const DEFAULT_TRANSFER_INFO = {
  bankId: '970422',
  accountNo: '19037042856018',
  accountName: 'CANDLET',
  bankName: 'MB Bank',
};

export default function OrderSuccess({ paymentFlow = false }) {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [copied, setCopied] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [transferInfo, setTransferInfo] = useState(DEFAULT_TRANSFER_INFO);

  useEffect(() => {
    if (!order && orderId) {
      setLoading(true);
      const request = paymentFlow
        ? orderService.getPaymentSession(orderId)
        : orderService.getShopOrderById(orderId);
      request
        .then(res => {
          if (res.data.success) {
            setOrder(res.data.data);
          }
        })
        .catch(err => {
          console.error('Không tìm thấy thông tin đơn hàng:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [orderId, order, paymentFlow]);

  useEffect(() => {
    api.get('/system-configs/bank_transfer_info')
      .then((res) => {
        const savedInfo = res.data?.data?.value;
        if (savedInfo && typeof savedInfo === 'object') {
          setTransferInfo((current) => ({ ...current, ...savedInfo }));
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyCode = () => {
    if (order?.orderId) {
      navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (!paymentFlow || !order?.orderId || order.payment_method !== 'transfer' || order.payment_status === 'paid' || order.payment_session_status === 'expired') {
      return undefined;
    }

    let active = true;
    const checkPayment = async () => {
      try {
        const res = await orderService.getPaymentSession(order.orderId);
        if (!active || !res.data?.success) return;
        if (res.data.data.payment_session_status === 'confirmed' && res.data.data.order) {
          setOrder(res.data.data.order);
        } else {
          setOrder((current) => ({ ...current, ...res.data.data }));
        }
      } catch {
        // Keep polling after temporary network errors.
      }
    };

    const intervalId = window.setInterval(checkPayment, 3000);
    checkPayment();
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [paymentFlow, order?.orderId, order?.payment_method, order?.payment_status]);

  useEffect(() => {
    if (!paymentFlow || !order?.expires_at || order.payment_status === 'paid') return undefined;
    const timerId = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [paymentFlow, order?.expires_at, order?.payment_status]);

  useEffect(() => {
    if (paymentFlow && order?.payment_method === 'transfer' && order.payment_status === 'paid') {
      navigate(`/order-success/${order.orderId}`, { replace: true, state: { order } });
    }
  }, [paymentFlow, navigate, order]);

  useEffect(() => {
    if (!paymentFlow || order?.payment_method !== 'transfer' || order.payment_status !== 'paid' || !order.items?.length) return;
    const paidItems = order.items.map((item) => ({ product_id: item.product_id?._id || item.product_id, sku_id: item.sku_id }));
    cartService.removeMultipleItems(paidItems).catch(() => {});
    sessionStorage.removeItem('checkout_items');
    sessionStorage.removeItem('checkout_delivery_info');
  }, [paymentFlow, order]);

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[65vh] bg-[#fbf9f6]">
        <div className="w-12 h-12 border-3 border-[#4A2C2A]/20 border-t-[#4A2C2A] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-serif-display text-stone-600 tracking-wider">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <i className="ph-bold ph-receipt-x text-3xl"></i>
        </div>
        <h2 className="text-xl font-bold text-[#4A2C2A] mb-2 font-serif-display">Không tìm thấy đơn hàng</h2>
        <p className="text-sm text-stone-500 max-w-sm mb-6">Mã đơn hàng không hợp lệ hoặc bạn không có quyền xem thông tin đơn hàng này.</p>
        <Link 
          to="/shop" 
          className="bg-[#4A2C2A] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full sm:hover:bg-[#381B18] transition-all shadow-sm"
        >
          Quay lại cửa hàng
        </Link>
      </div>
    );
  }

  const subtotal = order.items?.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 1)), 0) || 0;
  const isTransfer = order.payment_method === 'transfer';
  const secondsRemaining = order.expires_at ? Math.max(0, Math.ceil((new Date(order.expires_at).getTime() - currentTime) / 1000)) : null;
  const expiryText = secondsRemaining === null ? '' : `${String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:${String(secondsRemaining % 60).padStart(2, '0')}`;
  const sessionExpired = paymentFlow && (order.payment_session_status === 'expired' || (secondsRemaining !== null && secondsRemaining === 0));
  const isAwaitingTransferPayment = paymentFlow && isTransfer && order.payment_status !== 'paid' && !sessionExpired;
  const transferNote = order.payment_code || order.orderId.replace(/[^A-Za-z0-9]/g, '');
  const vietQrUrl = `https://img.vietqr.io/image/${transferInfo.bankId}-${transferInfo.accountNo}-compact2.png?amount=${order.total_price}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(transferInfo.accountName)}`;

  const downloadQr = async () => {
    setDownloadingQr(true);
    try {
      const response = await fetch(vietQrUrl);
      if (!response.ok) throw new Error('Unable to download QR');
      const imageBlob = await response.blob();
      const objectUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Candlet-${order.orderId}-VietQR.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fall back to opening the QR image if the browser blocks cross-origin downloads.
      window.open(vietQrUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloadingQr(false);
    }
  };

  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-[#f8f4ef] px-4 py-12 sm:py-20">
        <main className="mx-auto max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-xl shadow-stone-900/5 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><i className="ph-bold ph-timer text-3xl"></i></div>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-rose-600">Phiên thanh toán đã hết hạn</p>
          <h1 className="mt-3 font-serif-display text-3xl font-bold text-[#4A2C2A]">Mã QR không còn hiệu lực</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">Đơn hàng chưa được tạo và không có khoản tiền nào bị ghi nhận. Bạn có thể quay lại giỏ hàng để tạo mã QR mới.</p>
          <button onClick={() => navigate('/cart')} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#4A2C2A] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition sm:hover:bg-[#381b18]"><i className="ph-bold ph-arrow-left"></i> Quay lại giỏ hàng</button>
        </main>
      </div>
    );
  }

  if (isAwaitingTransferPayment) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#f8f4ef] px-4 py-8 sm:py-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,_#f6dccb_0%,_transparent_68%)]"></div>
        <main className="relative mx-auto max-w-xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(74,44,42,0.14)] backdrop-blur sm:rounded-[2.5rem]">
          <header className="border-b border-stone-100 px-6 py-6 text-center sm:px-10 sm:py-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4A2C2A] text-white shadow-lg shadow-[#4A2C2A]/20">
              <i className="ph-fill ph-qr-code text-3xl"></i>
            </div>
            <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Chờ thanh toán
            </p>
            <h1 className="mt-3 font-serif-display text-3xl font-bold text-[#4A2C2A] sm:text-4xl">Quét mã để thanh toán</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone-600">Thanh toán xong, Candlet sẽ tự động xác nhận và chuyển bạn đến trang thành công.</p>
          </header>

          <div className="px-6 pt-4 text-center">
            {expiryText && <span className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><i className="ph-bold ph-timer"></i> Mã QR hết hạn sau {expiryText}</span>}
          </div>
          <section className="px-6 py-7 sm:px-10">
            <div className="relative mx-auto w-fit rounded-[1.75rem] bg-gradient-to-br from-[#f7e8da] via-[#fffaf4] to-[#ead3bf] p-3 shadow-inner">
              <div className="rounded-[1.3rem] bg-white p-3 shadow-md">
                <img src={vietQrUrl} alt="Mã VietQR thanh toán đơn hàng" className="h-60 w-60 rounded-xl sm:h-64 sm:w-64" />
              </div>
              <span className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white shadow-sm"><i className="ph-bold ph-lock-key text-sm"></i></span>
            </div>

            <button onClick={downloadQr} disabled={downloadingQr} className="mx-auto mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#4A2C2A]/15 bg-[#4A2C2A] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition sm:hover:bg-[#381b18] disabled:cursor-wait disabled:opacity-70">
              <i className={`ph-bold ${downloadingQr ? 'ph-spinner animate-spin' : 'ph-download-simple'} text-base`}></i>
              {downloadingQr ? 'Đang chuẩn bị ảnh QR...' : 'Tải mã QR về máy'}
            </button>

            <dl className="mt-6 divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-100 bg-stone-50/70 text-sm">
              <div className="flex items-center justify-between gap-4 px-4 py-3.5"><dt className="flex items-center gap-2 text-stone-500"><i className="ph-bold ph-money text-base"></i>Số tiền</dt><dd className="font-bold text-[#8C4A32]">{formatPrice(order.total_price)}</dd></div>
              <div className="flex items-center justify-between gap-4 px-4 py-3.5"><dt className="flex items-center gap-2 text-stone-500"><i className="ph-bold ph-bank text-base"></i>Ngân hàng</dt><dd className="font-bold text-stone-900">{transferInfo.bankName}</dd></div>
              <div className="flex items-center justify-between gap-4 px-4 py-3.5"><dt className="flex items-center gap-2 text-stone-500"><i className="ph-bold ph-credit-card text-base"></i>Số tài khoản</dt><dd className="font-mono font-bold text-stone-900">{transferInfo.accountNo}</dd></div>
              <div className="flex items-center justify-between gap-4 px-4 py-3.5"><dt className="flex items-center gap-2 text-stone-500"><i className="ph-bold ph-user text-base"></i>Chủ tài khoản</dt><dd className="font-bold text-stone-900">{transferInfo.accountName}</dd></div>
              <div className="flex items-center justify-between gap-4 px-4 py-3.5"><dt className="flex items-center gap-2 text-stone-500"><i className="ph-bold ph-note text-base"></i>Nội dung</dt><dd className="font-mono font-bold text-[#8C4A32]">{transferNote}</dd></div>
            </dl>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-stone-500"><i className="ph-bold ph-arrows-clockwise animate-spin text-[#8C4A32]"></i> Đang tự động kiểm tra thanh toán</div>
            <p className="mt-3 text-center text-[11px] text-stone-400">Mã đơn <span className="font-mono font-bold text-stone-600">{order.orderId}</span></p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3EFEA] px-4 py-2 sm:bg-[#fbf9f6] sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-2 animate-[fadeIn_0.3s_ease-out] sm:space-y-8">
        
        {/* 1. Header Banner & Success Confirmation */}
        <section className="relative -mx-4 overflow-hidden border-y border-stone-200/90 bg-white px-5 py-6 text-center sm:mx-0 sm:rounded-3xl sm:border sm:p-10 sm:shadow-sm">
          {/* Subtle decorative background glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none"></div>

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-50 text-emerald-600 shadow-xs sm:mb-5 sm:h-20 sm:w-20">
            <i className="ph-bold ph-check text-2xl sm:text-4xl"></i>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Đặt Hàng Thành Công
          </span>

          <h1 className="mb-2 mt-3 font-serif-display text-2xl font-bold text-[#4A2C2A] sm:mb-3 sm:mt-4 sm:text-4xl">
            Cảm Ơn Bạn Đã Tin Chọn Candlet
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
            Đơn hàng của bạn đã được tiếp nhận vào hệ thống. Các nghệ nhân Candlet đang chuẩn bị nến thơm và đóng gói chỉn chu nhất cho bạn.
          </p>

          {/* Order ID Pill with Copy */}
          <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-amber-200/80 bg-[#FAF5EE] px-4 py-2 sm:mt-6 sm:rounded-2xl sm:px-5 sm:py-2.5">
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-800">Mã đơn hàng</p>
              <p className="font-mono font-bold text-sm sm:text-base text-[#4A2C2A]">{order.orderId}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg sm:hover:bg-amber-100 text-stone-500 sm:hover:text-stone-800 transition-colors cursor-pointer"
              title="Sao chép mã đơn"
            >
              <i className={`ph-bold ${copied ? 'ph-check text-emerald-600' : 'ph-copy'} text-base`}></i>
            </button>
          </div>
        </section>

        {/* Priority Express Banner (Nếu là đơn hỏa tốc) */}
        {order.shippingMethod === 'express' && (
          <section className="-mx-4 flex flex-col items-start justify-between gap-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-4 text-white shadow-lg shadow-orange-500/20 animate-[fadeIn_0.3s_ease] sm:mx-0 sm:flex-row sm:items-center sm:rounded-3xl sm:p-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0">
                <i className="ph-fill ph-lightning text-2xl text-yellow-300 animate-bounce"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider bg-white text-orange-700 px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1">
                    <i className="ph-fill ph-lightning text-xs"></i>
                    ĐƠN GIAO HỎA TỐC 4H
                  </span>
                  <span className="text-xs font-bold text-amber-100 hidden sm:inline">Ưu tiên sản xuất & giao ngay</span>
                </div>
                <p className="text-xs text-white/90 mt-1 leading-relaxed">
                  Đơn hàng của bạn được xếp vào luồng ưu tiên đặc biệt, hoàn thiện đóng gói và giao nhanh trong vòng 4 giờ.
                </p>
              </div>
            </div>
            <div className="self-end sm:self-center shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/20 text-xs font-semibold backdrop-blur-xs border border-white/20">
                <i className="ph-bold ph-clock"></i> Giao nhanh 4h
              </span>
            </div>
          </section>
        )}

        {/* 2. Delivery Stepper / Timeline Progress */}
        <section className="-mx-4 border-y border-stone-200/90 bg-white p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-8 sm:shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700 sm:mb-6 sm:text-sm">
            <i className="ph-bold ph-path text-base text-[#8C4A32]"></i>
            Tiến trình đơn hàng
          </h2>

          <div className="grid grid-cols-4 gap-2 text-center relative">
            {/* Horizontal timeline bar */}
            <div className="absolute top-4 left-[12%] right-[12%] h-1 bg-stone-100 -z-0">
              <div className="h-full bg-emerald-500 w-[15%] transition-all duration-500"></div>
            </div>

            {/* Step 1: Đặt hàng */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                <i className="ph-bold ph-check"></i>
              </div>
              <p className="text-xs font-bold text-stone-800 mt-2">Đặt hàng</p>
              <p className="text-[10px] text-stone-400 hidden sm:block">Thành công</p>
            </div>

            {/* Step 2: Chờ xác nhận */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs animate-pulse">
                <i className="ph-bold ph-hourglass-simple"></i>
              </div>
              <p className="text-xs font-bold text-amber-800 mt-2">Chờ duyệt</p>
              <p className="text-[10px] text-amber-600 font-medium hidden sm:block">Đang chuẩn bị nến</p>
            </div>

            {/* Step 3: Đang giao */}
            <div className="flex flex-col items-center relative z-10 opacity-60">
              <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-400 border border-stone-200 flex items-center justify-center text-xs font-bold">
                <i className="ph-bold ph-truck"></i>
              </div>
              <p className="text-xs font-semibold text-stone-500 mt-2">Đang giao</p>
              <p className="text-[10px] text-stone-400 hidden sm:block">Giao tận tay</p>
            </div>

            {/* Step 4: Hoàn thành */}
            <div className="flex flex-col items-center relative z-10 opacity-60">
              <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-400 border border-stone-200 flex items-center justify-center text-xs font-bold">
                <i className="ph-bold ph-package"></i>
              </div>
              <p className="text-xs font-semibold text-stone-500 mt-2">Nhận hàng</p>
              <p className="text-[10px] text-stone-400 hidden sm:block">
                {isTransfer ? 'Đã chọn chuyển khoản' : 'Thanh toán COD'}
              </p>
            </div>
          </div>
        </section>

        {/* 3. Delivery Address & Payment Method */}
        <div className="grid grid-cols-1 gap-2 sm:gap-6 md:grid-cols-2">
          {/* Shipping Address */}
          <section className="-mx-4 space-y-3 border-y border-stone-200/90 bg-white p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-6 sm:shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
              <i className="ph-bold ph-map-pin text-base text-[#8C4A32]"></i>
              <span>Địa chỉ nhận hàng</span>
            </div>
            <div className="pt-1">
              <p className="font-bold text-stone-900 text-sm">{order.customer_name}</p>
              <p className="text-xs text-stone-500 font-mono mt-0.5">{order.customer_phone}</p>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed bg-[#FAF5EE]/60 p-3 rounded-xl border border-stone-100">
                {order.customer_address}
              </p>
              {order.note && (
                <p className="text-[11px] text-stone-500 italic mt-2">
                  <strong>Ghi chú:</strong> {order.note}
                </p>
              )}
            </div>
          </section>

          {/* Payment & Shipping Method */}
          <section className="-mx-4 space-y-4 border-y border-stone-200/90 bg-white p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-6 sm:shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
              <i className="ph-bold ph-credit-card text-base text-[#8C4A32]"></i>
              <span>Thanh toán & Vận chuyển</span>
            </div>

            <div className="space-y-3 pt-1">
              {/* COD Badge */}
              {!isTransfer && (
              <div className="flex items-start gap-3 p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="ph-fill ph-money text-base"></i>
                </span>
                <div>
                  <p className="text-xs font-bold text-stone-900">Thanh toán khi nhận hàng (COD)</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Vui lòng chuẩn bị <strong className="text-[#8C4A32]">{formatPrice(order.total_price)}</strong> tiền mặt khi bưu tá giao nến.
                  </p>
                </div>
              </div>
              )}

              {isTransfer && (
                <div className="flex items-start gap-3 p-3 bg-sky-50/70 border border-sky-200/60 rounded-xl">
                  <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="ph-fill ph-bank text-base"></i>
                  </span>
                  <div>
                    <p className="text-xs font-bold text-stone-900">Chuyển khoản ngân hàng</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">SePay đã xác nhận thanh toán. Shop sẽ sớm xử lý và giao đơn cho bạn.</p>
                  </div>
                </div>
              )}

              {/* Shipping Method */}
              <div className={`flex items-center justify-between text-xs p-3.5 rounded-xl border transition-all ${
                order.shippingMethod === 'express'
                  ? 'bg-gradient-to-r from-orange-50/90 to-amber-50/70 border-orange-300/80 shadow-xs'
                  : 'bg-stone-50 border-stone-100'
              }`}>
                <span className="text-stone-600 flex items-center gap-1.5 font-medium">
                  <i className={`ph-bold ${order.shippingMethod === 'express' ? 'ph-lightning text-orange-600 animate-pulse' : 'ph-moped text-stone-600'} text-base`}></i>
                  Phương thức giao hàng:
                </span>
                <span>
                  {order.shippingMethod === 'express' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-bold shadow-xs">
                      <i className="ph-fill ph-lightning text-xs"></i>
                      HỎA TỐC 4H (NỘI THÀNH)
                    </span>
                  ) : (
                    <span className="font-bold text-stone-800">Tiêu chuẩn (Toàn quốc)</span>
                  )}
                </span>
              </div>
            </div>
          </section>
        </div>

        {isTransfer && order.payment_status !== 'paid' && (
          <section className="-mx-4 border-y border-amber-200/90 bg-[#FAF5EE] p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-8 sm:shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <img src={vietQrUrl} alt="Mã VietQR thanh toán đơn hàng" className="w-52 h-52 rounded-2xl bg-white border border-stone-200 p-2 shadow-sm" />
              <div className="flex-1 text-center sm:text-left space-y-2">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C4A32]"><i className="ph-bold ph-qr-code text-base"></i> Thanh toán chuyển khoản</p>
                <h2 className="text-xl font-serif-display font-bold text-[#4A2C2A]">Quét mã VietQR để thanh toán</h2>
                <p className="text-sm text-stone-600">
                  {order.payment_status === 'paid'
                    ? 'Thanh toán đã được SePay xác nhận. Shop sẽ sớm xử lý đơn hàng của bạn.'
                    : 'Số tiền và nội dung đã được điền sẵn. SePay sẽ tự xác nhận đơn trong ít phút sau khi tiền vào tài khoản.'}
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm pt-2">
                  <dt className="text-stone-500">Ngân hàng</dt><dd className="font-bold text-stone-900">{transferInfo.bankName}</dd>
                  <dt className="text-stone-500">Số tài khoản</dt><dd className="font-mono font-bold text-stone-900">{transferInfo.accountNo}</dd>
                  <dt className="text-stone-500">Chủ tài khoản</dt><dd className="font-bold text-stone-900">{transferInfo.accountName}</dd>
                  <dt className="text-stone-500">Nội dung</dt><dd className="font-mono font-bold text-[#8C4A32]">{transferNote}</dd>
                </dl>
                {order.payment_status === 'paid' ? (
                  <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg"><i className="ph-bold ph-check-circle"></i> Đã thanh toán</span>
                ) : (
<span className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                    <i className="ph-bold ph-clock"></i> Chờ SePay xác nhận
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 4. Order Items Receipt & Price Breakdown */}
        <section className="-mx-4 space-y-5 border-y border-stone-200/90 bg-white p-4 sm:mx-0 sm:space-y-6 sm:rounded-3xl sm:border sm:p-8 sm:shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <i className="ph-bold ph-bag-simple text-base text-[#8C4A32]"></i>
              Sản phẩm đã đặt ({order.items?.length || 0})
            </span>
          </h2>

          {/* Items list */}
          <div className="divide-y divide-stone-100">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {item.product_image ? (
                    <img 
                      src={item.product_image} 
                      alt={item.product_name} 
                      className="w-14 h-14 object-cover rounded-xl border border-stone-200 shrink-0" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                      <i className="ph-light ph-flame text-2xl"></i>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#4A2C2A] truncate">{item.product_name}</p>
                    {item.sku_label && (
                      <p className="text-xs text-[#8C4A32] font-medium mt-0.5">{item.sku_label}</p>
                    )}
                    <p className="text-xs text-stone-400 mt-0.5">Số lượng: ×{item.quantity}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-stone-900">
                    {formatPrice((item.unit_price || 0) * (item.quantity || 1))}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    {formatPrice(item.unit_price)} / sp
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown summary */}
          <div className="pt-4 border-t border-stone-100 space-y-2.5 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Tạm tính tiền hàng:</span>
              <span className="font-mono font-medium text-stone-800">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Phí vận chuyển:</span>
              <span className="font-mono font-medium text-stone-800">
                {order.shipping_fee === 0 ? (
                  <span className="text-emerald-700 font-bold uppercase">Miễn Phí</span>
                ) : (
                  formatPrice(order.shipping_fee)
                )}
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Giảm giá khuyến mại {order.discount_code ? `(${order.discount_code})` : ''}:</span>
                <span className="font-mono font-bold">-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-3 border-t border-stone-100 text-base font-bold text-[#4A2C2A]">
              <span>{isTransfer ? 'Tổng cần chuyển khoản:' : 'Tổng thanh toán (Thu COD):'}</span>
              <span className="text-xl sm:text-2xl font-mono text-[#8C4A32]">
                {formatPrice(order.total_price)}
              </span>
            </div>
          </div>
        </section>

        {/* 5. Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-2 pb-3 pt-2 sm:flex-row sm:gap-4 sm:pb-8">
          <button
            onClick={() => navigate('/orders')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#4A2C2A] sm:hover:bg-[#381B18] text-white text-xs font-bold uppercase tracking-wider py-3.5 px-8 rounded-full shadow-sm sm:hover:shadow-md sm:hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
          >
            <i className="ph-bold ph-receipt text-base"></i>
            <span>Xem lịch sử đơn hàng</span>
          </button>
          <Link
            to="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white sm:hover:bg-stone-50 text-stone-700 border border-stone-300 text-xs font-bold uppercase tracking-wider py-3.5 px-8 rounded-full shadow-2xs sm:hover:shadow-sm transition-all"
          >
            <i className="ph-bold ph-arrow-left text-base"></i>
            <span>Tiếp tục mua sắm</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
