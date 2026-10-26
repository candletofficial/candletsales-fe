import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role !== 'admin') {
        logout();
        setError('Tài khoản khách hàng không có quyền truy cập trang quản trị.');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại';
      const status = err.response?.data?.status;
      if (status === 'pending') {
        setError('⏳ Tài khoản đang chờ admin phê duyệt.');
      } else if (status === 'rejected') {
        setError('❌ Tài khoản của bạn đã bị từ chối.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-theme-scope min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-primary-container)_0,_var(--color-surface-container-low)_52%,_var(--color-surface)_100%)] flex flex-col items-center justify-center py-8 font-sans">

      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="mb-6">
          <img src="/logo.png" alt="Candlet Shop" className="h-[48px] w-auto object-contain drop-shadow-sm" />
        </div>
        <h1 className="text-[28px] font-bold text-on-surface mb-2 tracking-tight">Đăng nhập</h1>
        <p className="text-[14px] font-medium text-[#78665E]">Hệ thống quản trị bán hàng chuyên nghiệp</p>
      </div>

      {/* Card */}
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e7ddd9] w-full max-w-[440px] mx-4">
        <form onSubmit={handleSubmit}>

          {error && <div className="bg-red-50 text-red-600 text-[13px] px-4 py-3 rounded-xl mb-6 border border-red-100 font-medium">{error}</div>}

          {/* Email Input */}
          <div className="mb-5">
            <label className="block text-[13px] font-bold text-[#475569] mb-2">Email</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9b8982] group-focus-within:text-primary text-[20px] transition-colors">person</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="email@gmail.com"
                className="w-full pl-[42px] pr-4 py-3 bg-white border border-[#d8cbc6] rounded-xl text-[14px] font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-[#493a35] placeholder-[#9b8982] transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[13px] font-bold text-[#475569]">Mật khẩu</label>
              <Link to="/admin/forgot-password" className="text-[12px] font-bold text-primary hover:text-on-primary-container hover:underline transition-colors">Quên mật khẩu?</Link>
            </div>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9b8982] group-focus-within:text-primary text-[20px] transition-colors">lock</span>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full pl-[42px] pr-[42px] py-3 bg-white border border-[#d8cbc6] rounded-xl text-[14px] font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-[#493a35] placeholder-[#d8cbc6] tracking-widest transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9b8982] hover:text-[#475569] transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center mb-6">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="peer appearance-none w-[18px] h-[18px] border-2 border-[#d8cbc6] rounded-[4px] checked:bg-primary checked:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              />
              <span className="material-symbols-outlined absolute text-white text-[14px] pointer-events-none opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold transition-opacity">check</span>
            </div>
            <label htmlFor="remember" className="ml-2.5 text-[13px] font-semibold text-[#475569] cursor-pointer select-none">
              Ghi nhớ đăng nhập
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-on-primary-container text-white font-bold text-[14px] py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(91,48,40,0.22)] hover:shadow-[0_7px_20px_rgba(91,48,40,0.28)] disabled:opacity-70 disabled:shadow-none"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Đăng nhập
                <span className="material-symbols-outlined text-[18px] font-bold">login</span>
              </>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="text-center pt-5 border-t border-[#f1f5f9]">
          <p className="text-[13px] font-medium text-[#475569]">
            Bạn chưa có tài khoản?{' '}
            <Link to="/admin/register" className="font-bold text-primary hover:text-on-primary-container hover:underline transition-colors ml-1">Đăng ký ngay</Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 flex items-center gap-6 text-[13px] text-[#78665E] font-semibold">
        <button className="flex items-center gap-1.5 hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-[16px]">language</span>
          Tiếng Việt
        </button>
        <button className="hover:text-on-surface transition-colors">Hỗ trợ</button>
        <button className="hover:text-on-surface transition-colors">Bảo mật</button>
      </div>

    </div>
  );
}
