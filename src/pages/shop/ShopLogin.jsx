import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function ShopLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination after login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    setError('');
    setFacebookLoading(true);
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
    // Backend tạo state chống CSRF và giữ URL khách đang muốn quay lại.
    const params = new URLSearchParams({ returnTo: from, clientOrigin: window.location.origin });
    window.location.assign(`${apiBase}/auth/facebook?${params.toString()}`);
  };

  const handleGoogleLogin = () => {
    setError('');
    setGoogleLoading(true);
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
    const params = new URLSearchParams({ returnTo: from, clientOrigin: window.location.origin });
    window.location.assign(`${apiBase}/auth/google?${params.toString()}`);
  };

  return (
    <div className="shop-theme-scope min-h-screen w-full flex bg-brand-cream text-stone-800 font-sans selection:bg-brand-warmIvory selection:text-brand-burgundy">

      {/* ─────────────────────────────────────────────────────────────
       * CỘT TRÁI: SHOWCASE TRẢI NGHIỆM THƯƠNG HIỆU (Desktop & Tablet)
       * ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[52%] relative bg-[#200B0E] overflow-hidden flex-col justify-between p-12 xl:p-16 text-white">
        {/* Ảnh nền nghệ thuật với các lớp gradient sang trọng */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-65 scale-105 transition-transform duration-1000 ease-out sm:hover:scale-100"
          style={{ backgroundImage: "url('/login-candle-ambient.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A0709] via-[#2A0E13]/80 to-[#1A0709]/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.22),transparent_65%)]" />

        {/* Header trái: Logo & Tagline */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="inline-block group transition-transform sm:hover:scale-[1.02]" title="Trở về trang chủ">
            <img
              src="/logo.png"
              alt="Candlet Logo"
              className="h-12 sm:h-14 w-auto object-contain brightness-0 invert drop-shadow-md"
            />
          </Link>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-medium text-amber-200/90 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Handmade & Hidden Message
          </span>
        </div>

        {/* Nội dung trung tâm: Câu chuyện cảm xúc */}
        <div className="relative z-10 max-w-lg my-auto py-12 space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/25 text-amber-200 text-xs font-semibold tracking-wide">
            <i className="ph-fill ph-flame text-amber-400 text-sm leading-none shrink-0" />
            <span className="leading-none">Nghệ Thuật Nến Thơm Thủ Công</span>
          </div>

          <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-serif-display font-bold leading-[1.2] text-amber-50 tracking-tight">
            Nơi Mỗi Ngọn Nến Kể Một Câu Chuyện Riêng
          </h2>

          <p className="text-sm xl:text-base text-stone-300/90 leading-relaxed font-light">
            Ẩn giấu dưới làn sáp đậu nành ấm mịn là những dòng thông điệp bí mật chỉ bừng sáng khi ngọn lửa thắp lên. Đăng nhập để cùng Candlet lưu giữ trọn vẹn những xúc cảm tinh tế nhất.
          </p>

          {/* 3 Điểm nhấn giá trị */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <i className="ph-fill ph-leaf text-amber-400 text-lg" />
              <div className="text-xs font-bold text-white">Sáp Đậu Nành</div>
              <div className="text-[11px] text-stone-300">100% hữu cơ tự nhiên</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <i className="ph-fill ph-envelope-simple-open text-amber-400 text-lg" />
              <div className="text-xs font-bold text-white">Thông Điệp Ẩn</div>
              <div className="text-[11px] text-stone-300">Khắc sâu kỷ niệm</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <i className="ph-fill ph-gift text-amber-400 text-lg" />
              <div className="text-xs font-bold text-white">Hộp Quà Cao Cấp</div>
              <div className="text-[11px] text-stone-300">Trao gửi tận tay</div>
            </div>
          </div>
        </div>

        {/* Footer trái: Thẻ chứng nhận cộng đồng (Social Proof) */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5 items-center">
              <div className="w-8 h-8 rounded-full ring-2 ring-[#200B0E] bg-amber-600 flex items-center justify-center text-[10px] font-bold text-white leading-none shrink-0 shadow-xs">
                <span>MA</span>
              </div>
              <div className="w-8 h-8 rounded-full ring-2 ring-[#200B0E] bg-brand-terracotta flex items-center justify-center text-[10px] font-bold text-white leading-none shrink-0 shadow-xs">
                <span>HL</span>
              </div>
              <div className="w-8 h-8 rounded-full ring-2 ring-[#200B0E] bg-amber-800 flex items-center justify-center text-[10px] font-bold text-white leading-none shrink-0 shadow-xs">
                <span>TN</span>
              </div>
              <div className="w-8 h-8 rounded-full ring-2 ring-[#200B0E] bg-stone-800 flex items-center justify-center text-[10px] font-bold text-amber-300 leading-none shrink-0 shadow-xs">
                <span>+12k</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-200">Hơn 12.000 hộp quà cảm xúc</div>
              <div className="text-[10px] text-amber-300/80 flex items-center gap-1">
                <span>★★★★★</span>
                <span>4.9/5 đánh giá từ khách hàng</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-stone-400/80 font-mono hidden xl:block">
            © 2026 Candlet Vietnam
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * CỘT PHẢI: FORM ĐĂNG NHẬP TINH TẾ (Modern & Warm Aesthetics)
       * ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 xl:w-[48%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 relative">

        {/* Header Phải: Nút quay lại trang chủ */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 sm:hover:text-brand-burgundy py-2 px-3.5 rounded-full bg-white/80 sm:hover:bg-white border border-stone-200/80 shadow-2xs transition-all group"
          >
            <i className="ph-bold ph-arrow-left text-sm text-stone-400 sm:group-hover:-translate-x-0.5 sm:group-hover:text-brand-burgundy transition-transform" />
            <span>Về trang chủ</span>
          </Link>

          {/* Logo hiện trên mobile khi cột trái ẩn */}
          <div className="lg:hidden flex items-center">
            <Link to="/">
              <img src="/logo.png" alt="Candlet" className="h-8 w-auto object-contain" />
            </Link>
          </div>
        </div>

        {/* Khu vực Form chính */}
        <div className="w-full max-w-[430px] mx-auto my-auto py-4">

          <div className="mb-8">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-terracotta block mb-1.5">
              Chào Mừng Bạn Trở Lại
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif-display font-bold text-[#381418] tracking-tight mb-2">
              Đăng Nhập Tài Khoản
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 font-normal">
              Đăng nhập để theo dõi đơn hàng, hương nến yêu thích và nhận ưu đãi riêng
            </p>
          </div>

          {/* Thông báo lỗi nếu có */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-rose-700 text-xs sm:text-sm flex items-start gap-3 shadow-2xs animate-[fadeIn_0.2s_ease-out]">
              <i className="ph-fill ph-warning-circle text-lg text-rose-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Trường Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhap.email@cuaban.com"
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-brand-burgundy focus:ring-4 focus:ring-brand-burgundy/10 shadow-2xs transition-all font-medium"
                />
                <i className="ph-bold ph-envelope-simple absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-lg" />
              </div>
            </div>

            {/* Trường Mật khẩu */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-stone-700">
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-semibold text-brand-terracotta sm:hover:text-[#5F2C1D] sm:hover:underline cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 text-sm rounded-2xl bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-brand-burgundy focus:ring-4 focus:ring-brand-burgundy/10 shadow-2xs transition-all font-mono"
                />
                <i className="ph-bold ph-lock-key absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-lg" />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 sm:hover:text-stone-700 transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={`ph-bold ${showPassword ? 'ph-eye-slash' : 'ph-eye'} text-lg`} />
                </button>
              </div>
            </div>

            {/* Checkbox Ghi nhớ đăng nhập */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 text-xs text-stone-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md border-stone-300 text-brand-burgundy focus:ring-brand-burgundy accent-brand-burgundy cursor-pointer"
                />
                <span>Duy trì đăng nhập trên thiết bị này</span>
              </label>
            </div>

            {/* Nút Submit Đăng nhập */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-burgundy sm:hover:bg-[#341816] text-white text-xs sm:text-sm font-bold uppercase tracking-widest rounded-2xl py-3.5 px-6 flex items-center justify-center gap-2 shadow-md sm:hover:shadow-lg transition-all transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <i className="ph-bold ph-sign-in text-base" />
                    <span>Đăng Nhập</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Dải phân cách "Hoặc đăng nhập bằng" */}
          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-brand-cream text-stone-400 font-medium">Hoặc tiếp tục với</span>
            </div>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 sm:hover:bg-stone-50 sm:hover:border-stone-300 shadow-2xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {googleLoading ? <span className="w-4 h-4 border-2 border-[#4285F4]/30 border-t-[#4285F4] rounded-full animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" /></svg>}
              <span>{googleLoading ? 'Đang chuyển hướng…' : 'Google'}</span>
            </button>

            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={facebookLoading}
              className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 sm:hover:bg-stone-50 sm:hover:border-stone-300 shadow-2xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {facebookLoading ? <span className="w-4 h-4 border-2 border-[#1877F2]/30 border-t-[#1877F2] rounded-full animate-spin" /> : <i className="ph-fill ph-facebook-logo text-[#1877F2] text-base" />}
              <span>{facebookLoading ? 'Đang chuyển hướng…' : 'Facebook'}</span>
            </button>
          </div>

          {/* Đăng ký mới */}
          <div className="mt-8 text-center">
            <p className="text-xs sm:text-sm text-stone-500">
              Bạn chưa có tài khoản?{' '}
              <Link
                to="/register"
                state={{ from: location.state?.from }}
                className="font-bold text-brand-terracotta sm:hover:text-brand-burgundy underline underline-offset-4 decoration-brand-terracotta/40 sm:hover:decoration-brand-terracotta transition-colors"
              >
                Đăng ký thành viên ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Phải: Copyright */}
        <div className="text-center lg:text-left text-[11px] text-stone-400 pt-6">
          © 2026 Candlet Vietnam. Bảo lưu mọi quyền.
        </div>
      </div>

      {/* MODAL QUÊN MẬT KHẨU NHANH */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-stone-200 text-center space-y-4 animate-[scaleUp_0.2s_ease-out]">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-2xl">
              <i className="ph-bold ph-key" />
            </div>
            <div>
              <h3 className="text-lg font-serif-display font-bold text-stone-900">Quên mật khẩu?</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Vui lòng liên hệ trực tiếp với bộ phận chăm sóc khách hàng Candlet qua Hotline / Zalo hoặc gửi email để được hỗ trợ đặt lại mật khẩu nhanh nhất.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 font-mono">
              Hotline: <strong className="text-brand-terracotta">0987 654 321</strong>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-brand-burgundy sm:hover:bg-[#341816] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
