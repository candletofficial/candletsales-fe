import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';

const ROLE_TABS = [
  { value: '', label: 'Tất cả tài khoản', icon: 'groups' },
  { value: 'admin', label: 'Quản trị viên (Admin)', icon: 'admin_panel_settings' },
  { value: 'customer', label: 'Khách hàng (Customer)', icon: 'person' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt động', icon: 'check_circle', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'pending', label: 'Chờ duyệt', icon: 'hourglass_empty', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'rejected', label: 'Bị từ chối', icon: 'cancel', color: 'text-red-700 bg-red-50 border-red-200' },
];

function ConfirmModal({ title, message, confirmText = 'Xác nhận', confirmClass = 'bg-primary text-white', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-stone-200 animate-in zoom-in-95 duration-200">
        {title && (
          <h3 className="text-lg font-bold text-stone-900 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">info</span>
            {title}
          </h3>
        )}
        <p className="text-sm text-stone-600 mb-6 leading-relaxed whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors"
            onClick={onCancel}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-xs font-bold shadow-xs hover:brightness-105 transition-all ${confirmClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, adminCount: 0, customerCount: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Bộ lọc từ URL
  const roleFilter = searchParams.get('role') || '';
  const statusFilter = searchParams.get('status') || '';
  const page = Number(searchParams.get('page') || 1);
  const searchTerm = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchTerm);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (roleFilter) params.role = roleFilter;
    if (statusFilter) params.status = statusFilter;
    if (searchTerm) params.search = searchTerm;

    adminService
      .getUsers(params)
      .then((res) => {
        setUsers(res.data.data.users);
        setPagination(res.data.data.pagination);
        if (res.data.data.stats) {
          setStats(res.data.data.stats);
        }
      })
      .catch(() => showToast('Không thể tải danh sách tài khoản', 'error'))
      .finally(() => setLoading(false));
  }, [roleFilter, statusFilter, searchTerm, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Cập nhật URL khi đổi bộ lọc
  const updateQueryParams = (updates) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === '' || val === null || val === undefined) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, val);
      }
    });
    // Reset về page 1 khi đổi bộ lọc
    if (!updates.page) {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateQueryParams({ q: searchInput.trim() });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateQueryParams({ q: '' });
  };

  // Xử lý các hành động
  const handleAction = (id, action, confirmOptions) => {
    if (confirmOptions) {
      setConfirm({
        ...confirmOptions,
        onConfirm: () => {
          setConfirm(null);
          runAction(id, action);
        },
      });
    } else {
      runAction(id, action);
    }
  };

  const runAction = async (id, action) => {
    setActionLoading(id + action);
    try {
      let res;
      if (action === 'approve') res = await adminService.approveUser(id);
      else if (action === 'reject') res = await adminService.rejectUser(id);
      else if (action === 'revoke') res = await adminService.revokeUser(id);
      else if (action === 'delete') res = await adminService.deleteUser(id);
      showToast(res.data.message || 'Thao tác thành công!');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Thao tác thất bại', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Layout>
      {/* Toast thông báo */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Modal Xác nhận */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          confirmClass={confirm.confirmClass}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header Trang */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Quản lý Tài Khoản</h1>
            <p className="text-xs text-stone-500 mt-1">
              Phân loại danh sách tài khoản theo Quản trị viên (Admin) và Khách hàng (Customer)
            </p>
          </div>
        </div>

        {/* 3 Thẻ thống kê tổng quan (Cards Metric) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Tất cả */}
          <div
            onClick={() => updateQueryParams({ role: '' })}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              roleFilter === ''
                ? 'bg-stone-900 text-white border-stone-900 ring-2 ring-stone-900/20'
                : 'bg-white text-stone-800 border-stone-200 hover:border-stone-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${roleFilter === '' ? 'text-stone-300' : 'text-stone-400'}`}>
                Tổng số tài khoản
              </span>
              <span className="material-symbols-outlined text-[20px] opacity-80">groups</span>
            </div>
            <p className="text-2xl font-bold mt-2 font-mono">{stats.totalCount}</p>
            <p className={`text-[11px] mt-1 ${roleFilter === '' ? 'text-stone-300' : 'text-stone-400'}`}>
              Bao gồm Admin và Khách hàng
            </p>
          </div>

          {/* Card 2: Quản trị viên */}
          <div
            onClick={() => updateQueryParams({ role: 'admin' })}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              roleFilter === 'admin'
                ? 'bg-primary text-white border-primary ring-2 ring-primary/20'
                : 'bg-white text-stone-800 border-stone-200 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${roleFilter === 'admin' ? 'text-amber-200' : 'text-amber-800'}`}>
                Quản trị viên (Admin)
              </span>
              <span className="material-symbols-outlined text-[20px] text-amber-500">shield_person</span>
            </div>
            <p className="text-2xl font-bold mt-2 font-mono text-amber-500">{stats.adminCount}</p>
            <p className={`text-[11px] mt-1 ${roleFilter === 'admin' ? 'text-stone-300' : 'text-stone-400'}`}>
              Quyền quản trị & thiết lập hệ thống
            </p>
          </div>

          {/* Card 3: Khách hàng */}
          <div
            onClick={() => updateQueryParams({ role: 'customer' })}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              roleFilter === 'customer'
                ? 'bg-blue-900 text-white border-blue-900 ring-2 ring-blue-900/20'
                : 'bg-white text-stone-800 border-stone-200 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${roleFilter === 'customer' ? 'text-blue-200' : 'text-blue-700'}`}>
                Khách hàng (Customer)
              </span>
              <span className="material-symbols-outlined text-[20px] text-blue-500">person</span>
            </div>
            <p className="text-2xl font-bold mt-2 font-mono text-blue-600">{stats.customerCount}</p>
            <p className={`text-[11px] mt-1 ${roleFilter === 'customer' ? 'text-stone-300' : 'text-stone-400'}`}>
              Tài khoản mua sắm và đánh giá
            </p>
          </div>
        </div>

        {/* Thanh điều khiển: Tab Phân Loại & Bộ lọc tìm kiếm */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4 items-stretch lg:items-center">
            {/* Tabs Phân Loại Vai Trò */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl overflow-x-auto custom-scrollbar">
              {ROLE_TABS.map((tab) => {
                const isActive = roleFilter === tab.value;
                const count =
                  tab.value === 'admin'
                    ? stats.adminCount
                    : tab.value === 'customer'
                    ? stats.customerCount
                    : stats.totalCount;

                return (
                  <button
                    key={tab.value}
                    onClick={() => updateQueryParams({ role: tab.value })}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
                        : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        isActive ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tìm kiếm & Lọc Trạng Thái */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              {/* Ô tìm kiếm */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm theo tên, email, sđt..."
                  className="w-full border border-stone-200 rounded-lg pl-8 pr-7 py-1.5 text-xs bg-stone-50 focus:bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-stone-400 pointer-events-none">
                  search
                </span>
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-2 text-stone-400 hover:text-stone-600 text-[14px]"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </form>

              {/* Dropdown Lọc Trạng thái */}
              <select
                value={statusFilter}
                onChange={(e) => updateQueryParams({ status: e.target.value })}
                className="border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-semibold bg-stone-50 text-stone-700 focus:bg-white focus:outline-none focus:border-primary"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Nút reset bộ lọc nếu có */}
              {(roleFilter || statusFilter || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearchParams({});
                  }}
                  className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold border border-red-200 transition-colors flex items-center gap-1 shrink-0"
                  title="Đặt lại toàn bộ bộ lọc"
                >
                  <span className="material-symbols-outlined text-[14px]">restart_alt</span> Xóa lọc
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bảng Danh Sách Tài Khoản */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200">
                  <th className="px-5 py-3.5 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Họ tên & Tài khoản
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Phân loại Vai trò
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Liên hệ & Số điện thoại
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-stone-500 uppercase tracking-wider text-center">
                    Trạng thái
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Ngày đăng ký
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-stone-500 uppercase tracking-wider text-right pr-6">
                    Thao tác & Phân quyền
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="h-4 bg-stone-100 rounded w-40"></div></td>
                      <td className="px-5 py-4"><div className="h-6 bg-stone-100 rounded-full w-28"></div></td>
                      <td className="px-5 py-4"><div className="h-4 bg-stone-100 rounded w-48"></div></td>
                      <td className="px-5 py-4"><div className="h-5 bg-stone-100 rounded-full w-20 mx-auto"></div></td>
                      <td className="px-5 py-4"><div className="h-4 bg-stone-100 rounded w-24"></div></td>
                      <td className="px-5 py-4"><div className="h-8 bg-stone-100 rounded w-32 ml-auto"></div></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-stone-400">
                      <span className="material-symbols-outlined text-[44px] block mb-2 opacity-40">person_off</span>
                      <p className="text-sm font-semibold text-stone-600">Không tìm thấy tài khoản nào</p>
                      <p className="text-xs text-stone-400 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isAdmin = u.role === 'admin';
                    const isRoot = u.isDefaultAdmin;

                    return (
                      <tr
                        key={u._id}
                        className={`hover:bg-stone-50/60 transition-colors ${
                          isRoot ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        {/* Họ tên & Avatar */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                                isAdmin
                                  ? 'bg-primary text-amber-200 border border-amber-300/30'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {u.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-stone-900 text-sm truncate">{u.name}</span>
                                {isRoot && (
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-300">
                                    Root Admin
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-stone-400 truncate block font-mono">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Phân loại vai trò (Role Badge) */}
                        <td className="px-5 py-4">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF9F2] text-[#B45309] border border-amber-200 shadow-xs">
                              <span className="material-symbols-outlined text-[15px]">shield_person</span>
                              Quản trị viên
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
                              <span className="material-symbols-outlined text-[15px]">person</span>
                              Khách hàng
                            </span>
                          )}
                        </td>

                        {/* Liên hệ & SĐT */}
                        <td className="px-5 py-4">
                          <div className="text-xs text-stone-700">
                            {u.phone ? (
                              <div className="flex items-center gap-1 font-mono font-medium">
                                <span className="material-symbols-outlined text-[14px] text-stone-400">call</span>
                                {u.phone}
                              </div>
                            ) : (
                              <span className="text-stone-400 italic">Chưa cập nhật SĐT</span>
                            )}
                            {u.address && (
                              <div className="text-[11px] text-stone-400 truncate max-w-[220px] mt-0.5" title={u.address}>
                                {u.address}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Trạng thái */}
                        <td className="px-5 py-4 text-center">
                          {u.status === 'active' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Hoạt động
                            </span>
                          )}
                          {u.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Chờ duyệt
                            </span>
                          )}
                          {u.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              Từ chối
                            </span>
                          )}
                        </td>

                        {/* Ngày tạo */}
                        <td className="px-5 py-4 text-xs font-mono text-stone-500">
                          {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                        </td>

                        {/* Hành động & Phân quyền */}
                        <td className="px-5 py-4 text-right pr-6">
                          {isRoot ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                              <span className="material-symbols-outlined text-[14px]">verified_user</span>
                              Bảo vệ gốc
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Hành động đối với tài khoản Quản trị viên */}
                              {isAdmin && (
                                <>
                                  {/* Duyệt / Từ chối Admin chờ duyệt */}
                                  {u.status === 'pending' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleAction(u._id, 'approve')}
                                        disabled={actionLoading === u._id + 'approve'}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                                        title="Duyệt tài khoản Quản trị viên"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">check</span> Duyệt
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAction(u._id, 'reject', {
                                            title: 'Từ chối tài khoản',
                                            message: `Từ chối cấp quyền cho tài khoản quản trị viên "${u.name}"?`,
                                            confirmText: 'Từ chối ngay',
                                            confirmClass: 'bg-red-600 text-white',
                                          })
                                        }
                                        disabled={actionLoading === u._id + 'reject'}
                                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                                        title="Từ chối yêu cầu"
                                      >
                                        Từ chối
                                      </button>
                                    </>
                                  )}

                                  {/* Thu hồi quyền nếu admin đang active */}
                                  {u.status === 'active' && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAction(u._id, 'revoke', {
                                          title: 'Thu hồi quyền truy cập',
                                          message: `Thu hồi quyền đăng nhập quản trị của "${u.name}"? Tài khoản sẽ chuyển về trạng thái Chờ duyệt.`,
                                          confirmText: 'Thu hồi quyền',
                                          confirmClass: 'bg-amber-600 text-white',
                                        })
                                      }
                                      disabled={actionLoading === u._id + 'revoke'}
                                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors"
                                      title="Thu hồi quyền Admin"
                                    >
                                      Thu hồi
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Tài khoản Khách hàng: Nghiêm cấm nâng lên Admin, chỉ hiển thị nhãn */}
                              {!isAdmin && (
                                <span className="text-xs text-stone-400 italic px-1.5 py-0.5 bg-stone-50 rounded border border-stone-200">
                                  Tài khoản mua sắm
                                </span>
                              )}

                              {/* Nút Xóa tài khoản */}
                              {(currentUser?.isDefaultAdmin || currentUser?.role === 'admin') && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAction(u._id, 'delete', {
                                      title: 'Xóa vĩnh viễn tài khoản',
                                      message: `Bạn có chắc chắn muốn xóa tài khoản "${u.name}" (${u.email})? Hành động này không thể hoàn tác!`,
                                      confirmText: 'Xóa vĩnh viễn',
                                      confirmClass: 'bg-red-600 text-white',
                                    })
                                  }
                                  disabled={actionLoading === u._id + 'delete'}
                                  className="w-7 h-7 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 flex items-center justify-center transition-colors"
                                  title="Xóa tài khoản"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 bg-stone-50/50 text-xs">
              <span className="text-stone-500">
                Hiển thị trang <b>{page}</b> / <b>{pagination.totalPages}</b> (Tổng {pagination.total} tài khoản)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => updateQueryParams({ page: page - 1 })}
                  className="px-2.5 py-1 rounded border border-stone-200 bg-white text-stone-700 disabled:opacity-40 font-bold hover:bg-stone-100"
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => updateQueryParams({ page: page + 1 })}
                  className="px-2.5 py-1 rounded border border-stone-200 bg-white text-stone-700 disabled:opacity-40 font-bold hover:bg-stone-100"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
