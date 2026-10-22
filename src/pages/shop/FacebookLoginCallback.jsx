import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const safeReturnPath = (value) => {
  const path = String(value || '/');
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/admin') ? path : '/';
};

export default function FacebookLoginCallback() {
  const [error, setError] = useState('');
  const handledRef = useRef(false);
  const navigate = useNavigate();
  const { completeSocialLogin } = useAuth();

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    const returnTo = safeReturnPath(params.get('returnTo'));
    const callbackError = params.get('error');

    if (token) {
      completeSocialLogin(token)
        .then(() => navigate(returnTo, { replace: true }))
        .catch((requestError) => {
          setError(requestError.response?.data?.message || 'Không thể xác minh phiên đăng nhập Facebook. Vui lòng thử lại.');
        });
      return;
    }
    setError(callbackError || 'Không thể hoàn tất đăng nhập bằng Facebook.');
  }, [completeSocialLogin, navigate]);

  return (
    <main className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-5 text-stone-800">
      <section className="w-full max-w-md rounded-3xl bg-white border border-stone-200 shadow-xl p-8 text-center">
        {error ? (
          <>
            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <i className="ph-fill ph-warning-circle text-2xl" />
            </div>
            <h1 className="font-serif-display text-xl font-bold">Đăng nhập chưa hoàn tất</h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{error}</p>
            <Link to="/login" className="mt-6 inline-flex px-5 py-2.5 rounded-xl bg-[#4A2C2A] text-sm font-bold text-white sm:hover:bg-[#341816]">
              Quay lại đăng nhập
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-[#e7f0fd] text-[#1877F2] flex items-center justify-center">
              <i className="ph-fill ph-facebook-logo text-2xl" />
            </div>
            <h1 className="font-serif-display text-xl font-bold">Đang đăng nhập bằng Facebook…</h1>
            <p className="mt-2 text-sm text-stone-500">Vui lòng chờ trong giây lát.</p>
          </>
        )}
      </section>
    </main>
  );
}
