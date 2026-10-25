import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!agreed) {
      return setError('Vui lòng đồng ý với Điều khoản & Điều kiện');
    }

    if (form.password !== form.confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp');
    }
    if (form.password.length < 6) {
      return setError('Mật khẩu phải có ít nhất 6 ký tự');
    }

    setLoading(true);
    try {
      await authService.register({ name: form.name, email: form.email, password: form.password });
      setSuccess('Đăng ký thành công! Tài khoản của bạn đang chờ admin phê duyệt.');
      setForm({ name: '', email: '', password: '', confirmPassword: '' });
      setAgreed(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f4e5df_0,_#faf7f5_42%,_#f5f0ed_100%)] flex flex-col items-center justify-center py-8 font-sans">

      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="mb-6">
          <img src="/logo.png" alt="Candlet Shop" className="h-[48px] w-auto object-contain drop-shadow-sm" />
        </div>
        <h1 className="text-[28px] font-bold text-[#2C1810] mb-2 tracking-tight">Đăng ký tài khoản</h1>
        <p className="text-[14px] font-medium text-[#78665E]">Hệ thống quản trị bán hàng chuyên nghiệp</p>
      </div>

      {/* Card */}
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e7ddd9] w-full max-w-[480px] mx-4">
        <form onSubmit={handleSubmit}>

          {error && <div className="bg-red-50 text-red-600 text-[13px] px-4 py-3 rounded-xl mb-6 border border-red-100 font-medium">{error}</div>}
          {success && (
            <div className="bg-green-50 text-green-700 text-[13px] px-4 py-3 rounded-xl mb-6 border border-green-200 font-medium flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {success}
            </div>
          )}

          {/* Name Input */}
          <div className="mb-5">
            <label className="block text-[13px] font-bold text-[#475569] mb-2">Họ và tên</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9b8982] group-focus-within:text-[#4A2C2A] text-[20px] transition-colors">person</span>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Nguyễn Văn A"
                className="w-full pl-[42px] pr-4 py-3 bg-white border border-[#d8cbc6] rounded-xl text-[14px] font-medium focus:outline-none focus:border-[#4A2C2A] focus:ring-1 focus:ring-[#4A2C2A] text-[#493a35] placeholder-[#9b8982] transition-all"
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="mb-5">
            <label className="block text-[13px] font-bold text-[#475569] mb-2">Email</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9b8982] group-focus-within:text-[#4A2C2A] text-[20px] transition-colors">mail</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="email@gmail.com"
                className="w-full pl-[42px] pr-4 py-3 bg-white border border-[#d8cbc6] rounded-xl text-[14px] font-medium focus:outline-none focus:border-[#4A2C2A] focus:ring-1 focus:ring-[#4A2C2A] text-[#493a35] placeholder-[#9b8982] transition-all"
              />
            </div>
          </div>

          {/* Password & Confirm Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[13px] font-bold text-[#475569] mb-2">Mật khẩu</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9b8982] group-focus-within:text-[#4A2C2A] text-[20px] transition-colors">lock</span>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full pl-[42px] pr-[42px] py-3 bg-white border border-[#d8cbc6] rounded-xl text-[14px] font-medium focus:outline-none focus:border-[#4A2C2A] focus:ring-1 focus:ring-[#4A2C2A] text-[#493a35] placeholder-[#d8cbc6] tracking-widest transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9b8982] hover:text-[#475569] transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#475569] mb-2">Xác nhận</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9b8982] group-focus-within:text-[#4A2C2A] text-[20px] transition-colors">history</span>
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full pl-[42px] pr-[42px] py-3 bg-white border border-[#d8cbc6] rounded-xl text-[14px] font-medium focus:outline-none focus:border-[#4A2C2A] focus:ring-1 focus:ring-[#4A2C2A] text-[#493a35] placeholder-[#d8cbc6] tracking-widest transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9b8982] hover:text-[#475569] transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Agree Terms */}
          <div className="flex items-start mb-6">
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="peer appearance-none w-[18px] h-[18px] border-2 border-[#d8cbc6] rounded-[4px] checked:bg-[#4A2C2A] checked:border-[#4A2C2A] focus:outline-none focus:ring-2 focus:ring-[#4A2C2A]/20 transition-all cursor-pointer shrink-0"
              />
              <span className="material-symbols-outlined absolute text-white text-[14px] pointer-events-none opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold transition-opacity">check</span>
            </div>
            <label htmlFor="agree" className="ml-3 text-[13px] font-medium text-[#475569] cursor-pointer select-none leading-relaxed">
              Tôi đồng ý với Điều khoản & Điều kiện và Chính sách bảo mật của Candlet Shop.
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A2C2A] hover:bg-[#381B18] text-white font-bold text-[14px] py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(91,48,40,0.22)] hover:shadow-[0_7px_20px_rgba(91,48,40,0.28)] disabled:opacity-70 disabled:shadow-none mb-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Đăng ký
                <span className="material-symbols-outlined text-[18px] font-bold">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center pt-6 mt-6 border-t border-[#f1f5f9]">
          <p className="text-[13px] font-medium text-[#475569]">
            Đã có tài khoản?{' '}
            <Link to="/admin/login" className="font-bold text-[#4A2C2A] hover:text-[#381B18] hover:underline transition-colors ml-1">Đăng nhập</Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 flex items-center gap-6 text-[13px] text-[#78665E] font-semibold">
        <button className="flex items-center gap-1.5 hover:text-[#2C1810] transition-colors">
          <span className="material-symbols-outlined text-[16px]">language</span>
          Tiếng Việt
        </button>
        <button className="flex items-center gap-1.5 hover:text-[#2C1810] transition-colors">
          <span className="material-symbols-outlined text-[16px]">help</span>
          Hỗ trợ
        </button>
      </div>

    </div>
  );
}
