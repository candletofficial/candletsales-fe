import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: '⏳ Chờ duyệt' },
  { value: 'active', label: '✅ Hoạt động' },
  { value: 'rejected', label: '❌ Từ chối' },
];

const STATUS_BADGE = {
  pending: 'badge-pending',
  active: 'badge-active',
  rejected: 'badge-rejected',
};
const STATUS_LABEL = { pending: 'Chờ duyệt', active: 'Hoạt động', rejected: 'Từ chối' };

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button id="modal-cancel" className="btn-ghost" onClick={onCancel}>Hủy</button>
          <button id="modal-confirm" className="btn-danger" onClick={onConfirm}>Xác nhận</button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const statusFilter = searchParams.get('status') || '';
  const page = Number(searchParams.get('page') || 1);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (statusFilter) params.status = statusFilter;

    adminService.getUsers(params)
      .then((res) => {
        setUsers(res.data.data.users);
        setPagination(res.data.data.pagination);
      })
      .catch(() => showToast('Không thể tải danh sách tài khoản', 'error'))
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (id, action, confirmMsg) => {
    if (confirmMsg) {
      setConfirm({ message: confirmMsg, onConfirm: () => { setConfirm(null); runAction(id, action); } });
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
      showToast(res.data.message);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Thao tác thất bại', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const setFilter = (status) => {
    setSearchParams(status ? { status } : {});
  };
  const setPage = (p) => {
    const params = statusFilter ? { status: statusFilter, page: p } : { page: p };
    setSearchParams(params);
  };

  return (
    <Layout>
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý tài khoản</h1>
          <p className="page-subtitle">Phê duyệt và quản lý quyền truy cập</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {STATUS_TABS.map((tab) => (
          <button
            id={`tab-${tab.value || 'all'}`}
            key={tab.value}
            className={`tab-btn ${statusFilter === tab.value ? 'active' : ''}`}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="table-loading">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton" style={{ width: '30%', height: 16 }} />
                <div className="skeleton" style={{ width: '25%', height: 16 }} />
                <div className="skeleton" style={{ width: '15%', height: 20, borderRadius: 20 }} />
                <div className="skeleton" style={{ width: '20%', height: 16 }} />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="table-empty">
            <span className="table-empty-icon">🔍</span>
            <p>Không có tài khoản nào</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th>Ngày đăng ký</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className={u.isDefaultAdmin ? 'row-root' : ''}>
                    <td>
                      <div className="cell-user">
                        <div className="cell-avatar">{u.name?.[0]?.toUpperCase()}</div>
                        <span>
                          {u.name}
                          {u.isDefaultAdmin && <span className="badge-root-sm">Root</span>}
                        </span>
                      </div>
                    </td>
                    <td className="cell-email">{u.email}</td>
                    <td>
                      <span className={`status-badge ${STATUS_BADGE[u.status]}`}>
                        {STATUS_LABEL[u.status]}
                      </span>
                    </td>
                    <td className="cell-date">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      {u.isDefaultAdmin ? (
                        <span className="cell-protected">🛡️ Được bảo vệ</span>
                      ) : (
                        <div className="action-group">
                          {u.status === 'pending' && (
                            <>
                              <button
                                id={`approve-${u._id}`}
                                className="btn-action btn-approve"
                                disabled={actionLoading === u._id + 'approve'}
                                onClick={() => handleAction(u._id, 'approve')}
                              >
                                ✓ Duyệt
                              </button>
                              <button
                                id={`reject-${u._id}`}
                                className="btn-action btn-reject"
                                disabled={actionLoading === u._id + 'reject'}
                                onClick={() => handleAction(u._id, 'reject', `Từ chối tài khoản "${u.name}"?`)}
                              >
                                ✕ Từ chối
                              </button>
                            </>
                          )}
                          {u.status === 'active' && (
                            <button
                              id={`revoke-${u._id}`}
                              className="btn-action btn-revoke"
                              disabled={actionLoading === u._id + 'revoke'}
                              onClick={() => handleAction(u._id, 'revoke', `Thu hồi quyền tài khoản "${u.name}"?`)}
                            >
                              ⟳ Thu hồi
                            </button>
                          )}
                          {u.status === 'rejected' && (
                            <button
                              id={`approve-rej-${u._id}`}
                              className="btn-action btn-approve"
                              disabled={actionLoading === u._id + 'approve'}
                              onClick={() => handleAction(u._id, 'approve')}
                            >
                              ✓ Duyệt lại
                            </button>
                          )}
                          {currentUser?.isDefaultAdmin && (
                            <button
                              id={`delete-${u._id}`}
                              className="btn-action btn-delete"
                              disabled={actionLoading === u._id + 'delete'}
                              onClick={() => handleAction(u._id, 'delete', `Xóa vĩnh viễn tài khoản "${u.name}"? Hành động này không thể hoàn tác!`)}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
            <span className="page-info">Trang {page} / {pagination.totalPages}</span>
            <button className="page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>→</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
