import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Layout from '../components/Layout';
import { expenseService } from '../services/expenseService';

const CATEGORIES = ['Vận hành', 'Mua sắm', 'Lương', 'Phí dịch vụ', 'Marketing Khác', 'Khác'];

const formatPrice = (n) => Math.round(n ?? 0).toLocaleString('vi-VN') + ' đ';

function ExpenseModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return setError('Vui lòng nhập tên mục đích chi');
    if (!amount || amount <= 0) return setError('Số tiền phải lớn hơn 0');
    
    setLoading(true);
    setError('');
    try {
      await expenseService.createExpense({ title, category, amount: Number(amount), note });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tạo phiếu chi');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-[slideUp_0.3s_ease-out]">
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
          <h3 className="font-bold text-[16px] text-on-surface">Tạo Phiếu Chi Mới</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-container p-1 rounded-md">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-error-container text-error rounded-lg text-[13px]">{error}</div>}
          
          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-1">Mục đích chi *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="VD: Mua văn phòng phẩm"
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-1">Danh mục *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-1">Số tiền (VNĐ) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1"
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[16px] font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-on-surface-variant mb-1">Ghi chú thêm</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows="2"
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"></textarea>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container">Hủy</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-primary text-white font-semibold flex justify-center items-center gap-2 hover:opacity-90 disabled:opacity-50">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
              Tạo phiếu chi
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function ConfirmDeleteModal({ ticket, onClose, onConfirm, loading }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6 text-center animate-[slideUp_0.3s_ease-out]">
        <div className="w-14 h-14 bg-error-container text-error rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[28px]">delete_forever</span>
        </div>
        <h3 className="font-bold text-[18px] text-on-surface mb-2">Xoá phiếu chi này?</h3>
        <p className="text-[14px] text-on-surface-variant mb-6">
          Bạn có chắc chắn muốn xoá phiếu <span className="font-bold text-on-surface">{ticket.code}</span>? Số tiền <span className="font-bold text-primary">{formatPrice(ticket.amount)}</span> sẽ được cộng lại vào Tài sản chung.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-semibold hover:bg-surface-container">Hủy bỏ</button>
          <button onClick={() => onConfirm(ticket._id)} disabled={loading} className="px-5 py-2.5 rounded-xl bg-error text-white font-bold hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
            Xác nhận xoá
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ExpenseManagement() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await expenseService.getExpenses();
      setExpenses(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await expenseService.deleteExpense(id);
      setDeletingTicket(null);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi xóa');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredExpenses = filterCategory === 'all' ? expenses : expenses.filter(e => e.category === filterCategory);
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-[24px] font-bold text-on-surface">Quản lý Chi tiêu</h2>
            <p className="text-[14px] text-on-surface-variant mt-1">Theo dõi các khoản chi phí và trừ trực tiếp vào Tài sản chung</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-primary text-white text-[14px] font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tạo phiếu chi
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Toolbar */}
          <div className="px-lg py-md border-b border-outline-variant/30 flex flex-wrap gap-4 justify-between items-center bg-surface-container-low/50">
            <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-white flex-wrap">
              {['Tất cả', ...CATEGORIES].map((c, i) => {
                const value = c === 'Tất cả' ? 'all' : c;
                return (
                  <button
                    key={c}
                    onClick={() => setFilterCategory(value)}
                    className={`px-md py-sm text-sm font-semibold transition-colors ${i < CATEGORIES.length ? 'border-r border-outline-variant' : ''
                      } ${filterCategory === value
                        ? 'bg-primary text-white'
                        : 'hover:bg-surface-container-low text-on-surface-variant'}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          {loading ? (
            <div className="flex-1 flex justify-center items-center min-h-[300px]">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-3 opacity-50">receipt_long</span>
              <p>Chưa có khoản chi tiêu nào</p>
            </div>
          ) : (
            <div className="overflow-auto flex-1 relative custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="bg-surface-container-lowest">
                  <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Mã phiếu</th>
                  <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Mục đích chi</th>
                  <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Danh mục</th>
                  <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Người tạo</th>
                  <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Thời gian</th>
                  <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right bg-surface-container-lowest">Số tiền</th>
                  <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right bg-surface-container-lowest">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filteredExpenses.map(e => (
                  <tr key={e._id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-lg py-md text-[14px] font-medium text-on-surface">{e.code}</td>
                    <td className="px-lg py-md">
                      <p className="text-[14px] font-bold text-on-surface">{e.title}</p>
                      {e.note && <p className="text-[12px] text-on-surface-variant mt-0.5">{e.note}</p>}
                    </td>
                    <td className="px-lg py-md">
                      <span className="inline-block px-2.5 py-1 bg-surface-container-high text-on-surface-variant rounded-md text-[12px] font-bold">{e.category}</span>
                    </td>
                    <td className="px-lg py-md text-[14px]">{e.created_by}</td>
                    <td className="px-lg py-md text-[14px] text-on-surface-variant">{new Date(e.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-lg py-md text-[14px] font-bold text-[#E53935] text-right">-{formatPrice(e.amount)}</td>
                    <td className="px-lg py-md text-right">
                      <button onClick={() => setDeletingTicket(e)} className="p-1.5 text-error hover:bg-error-container rounded transition-colors" title="Xóa & Hoàn tiền">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary-container/20">
                  <td colSpan="5" className="px-lg py-md text-[14px] font-bold text-on-surface text-right border-t border-outline-variant/30">Tổng cộng:</td>
                  <td className="px-lg py-md text-[16px] font-bold text-[#E53935] text-right border-t border-outline-variant/30">-{formatPrice(totalAmount)}</td>
                  <td className="border-t border-outline-variant/30"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <ExpenseModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchExpenses(); }} />
      )}
      
      {deletingTicket && (
        <ConfirmDeleteModal ticket={deletingTicket} loading={deleteLoading} onClose={() => setDeletingTicket(null)} onConfirm={handleDelete} />
      )}
    </Layout>
  );
}
