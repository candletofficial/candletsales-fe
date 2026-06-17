import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { importService } from '../services/importService';
import { materialService } from '../services/materialService';
import { fundService } from '../services/fundService';
import SearchableSelect from '../components/SearchableSelect';
import { formatPrice } from '../utils/formatPrice';
import { useAuth } from '../hooks/useAuth';

function ImportModal({ materials, user, onClose, onSave, initialMaterialId, editTicket }) {
  const [items, setItems] = useState(
    editTicket
      ? editTicket.items.map(i => ({
          material_id: i.material_id._id || i.material_id,
          quantity: i.quantity,
          total_price: i.total_price
        }))
      : initialMaterialId 
        ? [{ material_id: initialMaterialId, quantity: '', total_price: '' }] 
        : []
  );
  const [note, setNote] = useState(editTicket?.note || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const materialOptions = useMemo(() => materials.map(m => ({
    value: m._id,
    label: `${m.sku} - ${m.name} (${m.unit})`
  })), [materials]);

  const handleAddItem = () => {
    setItems([...items, { material_id: '', quantity: '', total_price: '' }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    if (items.length === 0) {
      setError('Vui lòng thêm ít nhất một nguyên liệu');
      return;
    }

    for (let item of items) {
      if (!item.material_id) {
        setError('Vui lòng chọn nguyên liệu');
        return;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        setError('Số lượng phải lớn hơn 0');
        return;
      }
      if (item.total_price === '' || Number(item.total_price) < 0) {
        setError('Tổng tiền không hợp lệ');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        items: items.map(i => ({
          material_id: i.material_id,
          quantity: Number(i.quantity),
          total_price: Number(i.total_price)
        })),
        total_amount: totalAmount,
        note,
        imported_by: user?.name || 'Admin'
      };
      if (editTicket) {
        await importService.updateImportTicket(editTicket._id, payload);
      } else {
        await importService.createImportTicket(payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 sm:p-4 animate-[fadeIn_0.2s_ease]">
      <div className="bg-white sm:rounded-xl shadow-2xl w-full h-full sm:h-auto max-w-[800px] sm:mx-4 flex flex-col max-h-none sm:max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30 flex-shrink-0">
          <h3 className="text-[20px] font-bold text-on-surface">{editTicket ? `Sửa Phiếu Nhập ${editTicket.code || ''}` : 'Tạo Phiếu Nhập Hàng'}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-container p-1 rounded-md transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form id="import-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          {error && <div className="bg-error-container text-on-error-container text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

          <div className="mb-4">
            <label className="block text-[13px] font-bold text-on-surface-variant mb-2">Ghi chú phiếu nhập</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nhập ghi chú (nếu có)"
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>

          <div className="flex justify-between items-center mb-3 mt-6">
            <label className="text-[13px] font-bold text-on-surface-variant">Danh sách nguyên liệu nhập</label>
            <button type="button" onClick={handleAddItem} className="text-primary text-[13px] font-semibold flex items-center gap-1 hover:bg-primary-container px-2 py-1 rounded">
              <span className="material-symbols-outlined text-[16px]">add</span> Thêm dòng
            </button>
          </div>

          {items.map((item, index) => {
            const unitPrice = (item.quantity > 0 && item.total_price >= 0) ? (item.total_price / item.quantity) : 0;
            return (
              <div key={index} className="grid grid-cols-12 gap-3 mb-3 items-start bg-surface-container-low p-3 rounded-lg">
                <div className="col-span-4">
                  <SearchableSelect
                    options={materialOptions}
                    value={item.material_id}
                    onChange={val => handleItemChange(index, 'material_id', val)}
                    placeholder="Chọn nguyên liệu"
                    className="border border-outline-variant bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <input type="number" step="any" min="0.01" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} required placeholder="Số lượng"
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-primary" />
                </div>
                <div className="col-span-3">
                  <input type="number" min="0" value={item.total_price} onChange={e => handleItemChange(index, 'total_price', e.target.value)} required placeholder="Tổng tiền (VNĐ)"
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-primary" />
                </div>
                <div className="col-span-2 flex flex-col justify-center">
                  <span className="text-[12px] text-on-surface-variant">Đơn giá mới:</span>
                  <span className="text-[13px] font-semibold text-primary">{formatPrice(unitPrice)}</span>
                </div>
                <div className="col-span-1 flex justify-end pt-1">
                  <button type="button" onClick={() => handleRemoveItem(index)} className="text-error hover:bg-error-container p-1 rounded">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="text-center py-6 text-on-surface-variant text-[13px] border border-dashed border-outline-variant rounded-lg">
              Chưa có nguyên liệu nào. Hãy thêm dòng mới.
            </div>
          )}

          <div className="mt-6 flex justify-between items-center p-4 bg-primary-container rounded-lg">
            <span className="font-bold text-on-surface">Tổng cộng:</span>
            <span className="text-[20px] font-bold text-primary">{formatPrice(totalAmount)}</span>
          </div>
        </form>

        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-between sm:justify-end items-center gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-on-surface-variant text-[15px] font-medium hover:bg-surface-container rounded-lg">
            Hủy
          </button>
          <button type="submit" form="import-form" disabled={loading} className="px-5 py-2 bg-primary text-white text-[15px] font-semibold rounded-lg hover:opacity-90 disabled:opacity-60">
            {loading ? 'Đang lưu...' : (editTicket ? 'Lưu thay đổi' : 'Tạo phiếu nhập')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketDetailsModal({ ticket, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 sm:p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto max-w-2xl max-h-none sm:max-h-[90vh] flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30 flex-shrink-0">
          <h3 className="text-[20px] font-bold text-on-surface">Chi tiết Phiếu Nhập {ticket.code || 'PN-' + parseInt(ticket._id.slice(-6), 16).toString().padStart(7, '0')}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-container p-1 rounded-md transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="flex justify-between mb-4">
            <div>
              <p className="text-[13px] text-on-surface-variant">Trạng thái</p>
              <span className={`inline-block px-2 py-1 rounded text-[12px] font-bold mt-1 ${ticket.status === 'completed' ? 'bg-primary-container text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                {ticket.status === 'completed' ? 'Đã nhập kho' : 'Chờ xử lý'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-on-surface-variant">Ngày tạo</p>
              <p className="text-[14px] font-semibold text-on-surface mt-1">{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
          {ticket.note && (
            <div className="mb-6">
              <p className="text-[13px] text-on-surface-variant mb-1">Ghi chú</p>
              <p className="text-[14px] text-on-surface">{ticket.note}</p>
            </div>
          )}
          <table className="w-full text-left border-collapse mt-4">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/30">
                <th className="px-4 py-2 text-[12px] font-bold text-on-surface-variant">Nguyên liệu</th>
                <th className="px-4 py-2 text-[12px] font-bold text-on-surface-variant text-center">Số lượng</th>
                <th className="px-4 py-2 text-[12px] font-bold text-on-surface-variant text-right">Đơn giá</th>
                <th className="px-4 py-2 text-[12px] font-bold text-on-surface-variant text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {ticket.items.map((item, idx) => (
                <tr key={idx} className="border-b border-outline-variant/20">
                  <td className="px-4 py-3 text-[14px]">{item.material_id?.name} ({item.material_id?.unit})</td>
                  <td className="px-4 py-3 text-[14px] text-center font-medium">{item.quantity}</td>
                  <td className="px-4 py-3 text-[14px] text-right">{formatPrice(item.unit_price)}</td>
                  <td className="px-4 py-3 text-[14px] text-right font-semibold">{formatPrice(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary-container">
                <td colSpan="3" className="px-4 py-3 text-right font-bold text-on-surface">Tổng cộng:</td>
                <td className="px-4 py-3 text-right font-bold text-primary">{formatPrice(ticket.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function AlertModal({ title, message, onClose, type = 'error' }) {
  const isError = type === 'error';
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6 flex flex-col items-center text-center animate-[slideUp_0.3s_ease]">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 ${isError ? 'bg-error-container text-error' : 'bg-primary-container text-primary'}`}>
          <span className="material-symbols-outlined text-[28px]">{isError ? 'gpp_bad' : 'info'}</span>
        </div>
        <h3 className="text-[18px] font-bold text-on-surface mb-2">{title}</h3>
        <p className="text-[14px] text-on-surface-variant mb-6 leading-relaxed">{message}</p>
        <button onClick={onClose}
          className={`w-full py-2.5 rounded-xl text-white text-[15px] font-bold shadow-sm hover:opacity-90 transition-opacity ${isError ? 'bg-error' : 'bg-primary'}`}>
          Đã hiểu
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onClose, loading, confirmText = 'Xác nhận', isDanger = false }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6 flex flex-col items-center text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-error-container' : 'bg-primary-container'}`}>
          <span className={`material-symbols-outlined ${isDanger ? 'text-error' : 'text-primary'}`}>
            {isDanger ? 'delete_forever' : 'check_circle'}
          </span>
        </div>
        <h3 className="text-[17px] font-bold text-on-surface mb-1">{title}</h3>
        <p className="text-sm text-on-surface-variant mb-6">{message}</p>
        <div className="flex justify-center gap-3 w-full mt-2">
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container">
            Hủy
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 ${isDanger ? 'bg-error' : 'bg-primary'}`}>
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeeStatsModal({ employeeStats, onClose }) {
  const totalImportAll = employeeStats.reduce((sum, st) => sum + st.total, 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6 animate-[fadeIn_0.2s_ease]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-surface-container-lowest px-6 py-5 border-b border-outline-variant/30 flex justify-between items-center sticky top-0 z-10 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-on-surface">Báo cáo năng suất nhân viên</h3>
            <p className="text-sm text-on-surface-variant mt-1">Tổng quan hoạt động nhập hàng và tình trạng công nợ</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-surface-container-lowest flex-1">
          {employeeStats.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4 block">analytics</span>
              <p className="text-on-surface-variant font-medium">Chưa có dữ liệu thống kê trong khoảng thời gian này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {employeeStats.map(stat => {
                const settledPercent = stat.total > 0 ? (stat.settledAmount / stat.total * 100) : 0;
                
                return (
                  <div key={stat.name} className="bg-white border border-outline-variant/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    {/* Decorative background element */}
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>

                    {/* Header: Avatar & Name */}
                    <div className="flex items-center gap-4 mb-5 relative z-10">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-container to-primary/20 text-primary flex items-center justify-center font-bold text-xl shadow-inner border border-primary/10 shrink-0">
                        {stat.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[17px] font-bold text-on-surface truncate">{stat.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant tracking-wide">
                            {stat.contribution}% TỔNG NHẬP
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-5 relative z-10">
                      <div className="bg-surface-container-low/50 rounded-xl p-3 border border-outline-variant/30">
                        <p className="text-xs text-on-surface-variant mb-1.5 font-medium">Khối lượng phiếu</p>
                        <div className="flex items-end gap-1.5">
                          <span className="text-2xl font-bold text-on-surface leading-none">{stat.count}</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-2 flex items-center gap-1.5 font-medium">
                          <span className="w-2 h-2 rounded-full bg-primary block"></span>
                          {stat.completedCount} kho / {stat.pendingCount} chờ
                        </p>
                      </div>

                      <div className="bg-surface-container-low/50 rounded-xl p-3 border border-outline-variant/30">
                        <p className="text-xs text-on-surface-variant mb-1.5 font-medium">Giá trị nhập hàng</p>
                        <div className="flex items-end gap-1.5">
                          <span className="text-[17px] font-bold text-primary leading-none">{formatPrice(stat.total)}</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-2 flex items-center gap-1.5 font-medium">
                          <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                          {stat.itemsCount} mặt hàng
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar for Payment */}
                    <div className="mt-4 pt-5 border-t border-outline-variant/30 relative z-10">
                      <div className="flex justify-between text-xs mb-2.5">
                        <span className="font-bold text-on-surface-variant">Tiến độ thanh toán</span>
                        <span className="font-bold text-[#059669]">{settledPercent.toFixed(1)}%</span>
                      </div>
                      
                      {/* Bar */}
                      <div className="h-2.5 w-full bg-[#fee2e2] rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-[#10b981] transition-all duration-1000 ease-out" 
                          style={{ width: `${settledPercent}%` }}
                        ></div>
                      </div>

                      {/* Amounts breakdown */}
                      <div className="flex justify-between mt-3 text-[13px]">
                        <div>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-1">Đã tất toán</p>
                          <p className="font-bold text-[#059669]">{formatPrice(stat.settledAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-1">Còn nợ</p>
                          <p className="font-bold text-[#dc2626]">{formatPrice(stat.unsettledAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {employeeStats.length > 0 && (
          <div className="bg-surface-container px-6 py-4 border-t border-outline-variant/30 flex justify-between items-center shrink-0 shadow-inner">
            <p className="text-sm font-semibold text-on-surface-variant">Tổng giá trị nhập hệ thống:</p>
            <p className="text-xl font-black text-primary">{formatPrice(totalImportAll)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal Nạp tiền nhanh vào Tài sản chung ────────────────────────
function DepositModal({ requiredAmount, onClose, onSuccess }) {
  const [amount, setAmount] = useState(requiredAmount || '');
  const [note, setNote] = useState('Nạp tiền tất toán phiếu nhập');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return setError('Số tiền nạp phải lớn hơn 0');
    setError('');
    setLoading(true);
    try {
      await fundService.deposit({ amount: Number(amount), note });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi nạp tiền');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-0 overflow-hidden animate-[slideUp_0.3s_ease]">
        <div className="bg-primary-container px-5 py-4 flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            Nạp tiền vào Tài sản chung
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-[13px] text-on-surface-variant">
            Tài sản chung hiện không đủ tiền để tất toán phiếu nhập này. Vui lòng nạp thêm tối thiểu <span className="font-bold text-error">{formatPrice(requiredAmount)}</span> để tiếp tục.
          </p>
          {error && <div className="p-3 bg-error-container text-error rounded-lg text-[13px] font-medium">{error}</div>}
          <div>
            <label className="block text-[12px] font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Số tiền nạp (VNĐ)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-4 py-2.5 text-[15px] font-bold text-primary focus:outline-none focus:border-primary transition-colors bg-surface-container-lowest"
              required
              min={requiredAmount || 1}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-white text-[14px] font-bold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Xác nhận Nạp tiền & Tất toán'}
          </button>
        </form>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xử lý' },
  { key: 'completed', label: 'Đã nhập kho' }
];

export default function ImportManagement() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [modalOpen, setModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [initialMaterialId, setInitialMaterialId] = useState(null);
  const [editTicket, setEditTicket] = useState(null);
  const [detailsTicket, setDetailsTicket] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [requiredDepositAmount, setRequiredDepositAmount] = useState(0);
  const [pendingSettleTicket, setPendingSettleTicket] = useState(null);
  const [alertInfo, setAlertInfo] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, materialsRes] = await Promise.all([
        importService.getImportTickets(),
        materialService.getMaterials()
      ]);
      setTickets(ticketsRes.data.data);
      setMaterials(materialsRes.data.data);
    } catch {
      showToast('Lỗi khi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.autoOpenImport && materials.length > 0) {
      setInitialMaterialId(location.state.materialId);
      setModalOpen(true);
      // Xoá state để không bị mở lại khi refresh hoặc render lại
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, materials, navigate, location.pathname]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const executeComplete = async (ticket) => {
    setActionLoading(true);
    try {
      await importService.completeImportTicket(ticket._id);
      showToast('Đã xác nhận nhập kho thành công!');
      fetchData();
      setConfirmAction(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi xác nhận', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeDelete = async (ticket) => {
    setActionLoading(true);
    try {
      await importService.deleteImportTicket(ticket._id);
      showToast('Đã xóa phiếu nhập');
      fetchData();
      setConfirmAction(null);
    } catch {
      showToast('Lỗi khi xóa', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeSettle = async (ticket) => {
    setActionLoading(true);
    try {
      await importService.settleImportTicket(ticket._id);
      showToast('Đã tất toán phiếu nhập!');
      fetchData();
      setConfirmAction(null);
    } catch (err) {
      if (err.response?.data?.code === 'INSUFFICIENT_FUND') {
        setRequiredDepositAmount(err.response.data.requiredAmount || 0);
        setPendingSettleTicket(ticket);
        setShowDepositModal(true);
        setConfirmAction(null);
      } else {
        showToast(err.response?.data?.message || 'Lỗi khi tất toán', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDepositSuccess = () => {
    setShowDepositModal(false);
    if (pendingSettleTicket) {
      executeSettle(pendingSettleTicket);
      setPendingSettleTicket(null);
    }
  };

  const exportExcel = () => {
    const headers = ['Mã phiếu', 'Ngày lập', 'Người nhập', 'Trạng thái', 'Số nguyên liệu', 'Tổng tiền (VNĐ)', 'Ghi chú'];
    const rows = filteredTickets.map(t => [
      t.code || 'PN-' + parseInt(t._id.slice(-6), 16).toString().padStart(7, '0'),
      new Date(t.createdAt).toLocaleDateString('vi-VN'),
      t.imported_by || 'Admin',
      t.status === 'completed' ? 'Đã nhập kho' : 'Chờ xác nhận',
      t.items.length,
      t.total_amount,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + headers.join(',') + '\n'
      + rows.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `phieu_nhap_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất file Excel');
  };

  const statsTickets = useMemo(() => {
    let result = tickets;
    if (activeTab !== 'all') {
      result = result.filter(t => t.status === activeTab);
    }
    if (filterDate) {
      result = result.filter(t => {
        const tDate = new Date(t.createdAt).toISOString().split('T')[0];
        return tDate === filterDate;
      });
    }
    return result;
  }, [tickets, activeTab, filterDate]);

  const filteredTickets = useMemo(() => {
    let result = statsTickets;
    if (paymentFilter !== 'all') {
      result = result.filter(t => (t.payment_status || 'unsettled') === paymentFilter);
    }
    return result;
  }, [statsTickets, paymentFilter]);

  const employeeStats = useMemo(() => {
    const stats = {};
    let globalTotal = 0;

    statsTickets.forEach(t => {
      const name = t.imported_by || 'Admin';
      if (!stats[name]) stats[name] = { 
        name, 
        count: 0, 
        total: 0, 
        settledAmount: 0, 
        unsettledAmount: 0,
        settledCount: 0,
        unsettledCount: 0,
        completedCount: 0,
        pendingCount: 0,
        itemsCount: 0
      };
      
      const st = stats[name];
      st.count += 1;
      st.total += t.total_amount || 0;
      st.itemsCount += t.items?.length || 0;
      globalTotal += t.total_amount || 0;

      if ((t.payment_status || 'unsettled') === 'settled') {
        st.settledAmount += t.total_amount || 0;
        st.settledCount += 1;
      } else {
        st.unsettledAmount += t.total_amount || 0;
        st.unsettledCount += 1;
      }

      if (t.status === 'completed') {
        st.completedCount += 1;
      } else {
        st.pendingCount += 1;
      }
    });

    return Object.values(stats)
      .sort((a, b) => b.total - a.total)
      .map(st => ({
        ...st,
        contribution: globalTotal > 0 ? ((st.total / globalTotal) * 100).toFixed(1) : 0
      }));
  }, [statsTickets]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const currentTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Layout>
      <div className="flex flex-col h-full">
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-error' : 'bg-[#d1fae5] text-[#059669]'}`}>
          {toast.message}
        </div>
      )}

      {showDepositModal && (
        <DepositModal 
          requiredAmount={requiredDepositAmount} 
          onClose={() => setShowDepositModal(false)} 
          onSuccess={handleDepositSuccess} 
        />
      )}

      {modalOpen && <ImportModal materials={materials} user={user} onClose={() => { setModalOpen(false); setInitialMaterialId(null); setEditTicket(null); }} onSave={() => { setModalOpen(false); setInitialMaterialId(null); setEditTicket(null); showToast(editTicket ? 'Đã cập nhật phiếu nhập' : 'Đã tạo phiếu nhập thành công'); fetchData(); window.dispatchEvent(new CustomEvent('materialsChanged')); }} initialMaterialId={initialMaterialId} editTicket={editTicket} />}
      {detailsTicket && <TicketDetailsModal ticket={detailsTicket} onClose={() => setDetailsTicket(null)} />}
      {statsModalOpen && <EmployeeStatsModal employeeStats={employeeStats} onClose={() => setStatsModalOpen(false)} />}

      {confirmAction?.type === 'complete' && (
        <ConfirmModal
          title="Xác nhận đẩy hàng"
          message="Đơn giá và tồn kho của nguyên liệu sẽ được cập nhật. Bạn không thể hoàn tác hành động này."
          onClose={() => setConfirmAction(null)}
          onConfirm={() => executeComplete(confirmAction.ticket)}
          loading={actionLoading}
          confirmText="Xác nhận nhập kho"
        />
      )}
      {confirmAction?.type === 'delete' && (
        <ConfirmModal
          title="Xác nhận xóa"
          message={`Xóa phiếu nhập ${confirmAction.ticket.code || '#' + confirmAction.ticket._id.slice(-6).toUpperCase()}?`}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => executeDelete(confirmAction.ticket)}
          loading={actionLoading}
          isDanger={true}
          confirmText="Xóa phiếu nhập"
        />
      )}
      {confirmAction?.type === 'settle' && (
        <ConfirmModal
          title="Xác nhận tất toán"
          message={`Xác nhận đã thanh toán xong cho phiếu nhập ${confirmAction.ticket.code || '#' + confirmAction.ticket._id.slice(-6).toUpperCase()}?`}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => executeSettle(confirmAction.ticket)}
          loading={actionLoading}
          confirmText="Đã tất toán"
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <div>
          <h2 className="text-[24px] font-bold text-on-surface">Quản lý Nhập hàng</h2>
          <p className="text-[14px] text-on-surface-variant mt-1">Tạo phiếu nhập và cập nhật tồn kho, đơn giá nguyên liệu</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStatsModalOpen(true)} className="px-5 py-2.5 bg-surface-container text-on-surface text-[14px] font-semibold rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-2 shadow-sm border border-outline-variant/30">
            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            Thống kê
          </button>
          <button onClick={() => { setEditTicket(null); setModalOpen(true); }} className="px-5 py-2.5 bg-primary text-white text-[14px] font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tạo phiếu nhập
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="px-lg py-md border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50">
          <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-white">
            {TABS.map((tab, i) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                className={`px-md py-sm text-sm font-semibold transition-colors ${i < TABS.length - 1 ? 'border-r border-outline-variant' : ''
                  } ${activeTab === tab.key
                    ? 'bg-primary text-white'
                    : 'hover:bg-surface-container-low text-on-surface-variant'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={paymentFilter}
              onChange={e => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 border border-outline-variant rounded-lg text-[13px] font-semibold text-on-surface-variant focus:outline-none bg-white hover:bg-surface-container-low transition-colors"
            >
              <option value="all">Tất cả thanh toán</option>
              <option value="unsettled">Chưa tất toán</option>
              <option value="settled">Đã tất toán</option>
            </select>

            <div className="relative group flex items-center border border-outline-variant rounded-lg overflow-hidden bg-white hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined absolute left-2.5 text-[18px] text-on-surface-variant group-hover:text-primary transition-colors pointer-events-none">calendar_month</span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-2 py-1.5 text-[13px] font-semibold text-on-surface-variant focus:outline-none bg-transparent cursor-pointer w-[130px]"
                title="Lọc theo ngày nhập"
              />
            </div>

            <button onClick={exportExcel} className="px-4 py-1.5 border border-outline-variant bg-white rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Xuất Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 relative custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-surface-container-lowest">
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Mã phiếu</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Nguyên liệu nhập</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Ngày lập</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Người nhập</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Trạng thái</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold bg-surface-container-lowest">Thanh toán</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right bg-surface-container-lowest">Tổng tiền</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right bg-surface-container-lowest">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-lg py-md">
                        <div className="h-4 bg-surface-container-high rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-lg py-16 text-center">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-30 block mb-3">local_shipping</span>
                    <p className="text-on-surface-variant text-sm">
                      {tickets.length === 0 ? 'Chưa có phiếu nhập nào' : 'Không tìm thấy phiếu nhập phù hợp'}
                    </p>
                    {tickets.length === 0 && (
                      <button onClick={() => { setEditTicket(null); setModalOpen(true); }} className="mt-3 text-primary text-sm font-semibold hover:underline">
                        + Tạo phiếu nhập mới
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                currentTickets.map(ticket => (
                  <tr 
                    key={ticket._id} 
                    className="group hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (ticket.status === 'pending') {
                        setEditTicket(ticket);
                        setModalOpen(true);
                      } else {
                        setDetailsTicket(ticket);
                      }
                    }}
                  >
                    <td className="px-lg py-md text-[14px] font-semibold relative">
                      <div className="flex items-center gap-2">
                        <span>{ticket.code || 'PN-' + parseInt(ticket._id.slice(-6), 16).toString().padStart(7, '0')}</span>
                      </div>
                    </td>
                    <td className="px-lg py-md text-[13px] text-on-surface max-w-[200px]">
                      <div className="truncate" title={ticket.items?.map(i => i.material_id?.name || 'Nguyên liệu').join(', ')}>
                        {ticket.items && ticket.items.length > 0 
                          ? ticket.items.map(i => i.material_id?.name || 'Nguyên liệu').join(', ')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-lg py-md text-[14px]">{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-lg py-md">
                      <div className="relative group/avatar inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary-container to-primary/20 text-primary font-bold text-[14px] shadow-inner border border-primary/10 cursor-help">
                        {(ticket.imported_by || 'Admin').charAt(0).toUpperCase()}
                        
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/avatar:block z-[60] pointer-events-none">
                          <div className="bg-gray-800/95 backdrop-blur-sm text-white text-[12px] px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap font-medium">
                            {ticket.imported_by || 'Admin'}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-800/95 rotate-45 -mt-1"></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[12px] font-bold ${ticket.status === 'completed' ? 'bg-primary-container text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                        {ticket.status === 'completed' ? 'Đã nhập kho' : 'Chờ xác nhận'}
                      </span>
                    </td>
                    <td className="px-lg py-md">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[12px] font-bold ${(ticket.payment_status || 'unsettled') === 'settled' ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#fee2e2] text-[#dc2626]'}`}>
                        {(ticket.payment_status || 'unsettled') === 'settled' ? 'Đã tất toán' : 'Chưa tất toán'}
                      </span>
                    </td>
                    <td className="px-lg py-md text-[14px] font-bold text-primary text-right">{formatPrice(ticket.total_amount)}</td>
                    <td className="px-lg py-md text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(ticket.payment_status || 'unsettled') === 'unsettled' && (
                          <button disabled={actionLoading} onClick={(e) => {
                            e.stopPropagation();
                            if (ticket.imported_by && user?.name && ticket.imported_by !== user.name && ticket.imported_by !== 'Admin') {
                              setAlertInfo({
                                title: 'Quyền truy cập bị từ chối',
                                message: 'Chỉ người tạo phiếu mới có quyền thực hiện tất toán cho phiếu nhập này nhằm đảm bảo tính minh bạch.',
                                type: 'error'
                              });
                              return;
                            }
                            setConfirmAction({ type: 'settle', ticket });
                          }} className="p-1.5 text-[#059669] hover:bg-[#d1fae5] rounded transition-colors disabled:opacity-50" title="Đánh dấu đã tất toán">
                            <span className="material-symbols-outlined text-[18px]">payments</span>
                          </button>
                        )}
                        {ticket.status === 'completed' && (
                          <button onClick={(e) => { e.stopPropagation(); setDetailsTicket(ticket); }} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded transition-colors" title="Chi tiết">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        )}
                        {ticket.status === 'pending' && (
                          <>
                            <button disabled={actionLoading} onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'complete', ticket }); }} className="p-1.5 text-primary hover:bg-primary-container rounded transition-colors disabled:opacity-50" title="Xác nhận đẩy hàng">
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            </button>
                            <button disabled={actionLoading} onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete', ticket }); }} className="p-1.5 text-error hover:bg-error-container rounded transition-colors disabled:opacity-50" title="Xóa">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && filteredTickets.length > 0 && (
          <div className="px-lg py-md border-t border-outline-variant/30 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
            <p className="text-on-surface-variant text-[13px]">
              Hiển thị <span className="font-bold text-on-surface">{currentTickets.length}</span> / <span className="font-bold text-on-surface">{filteredTickets.length}</span> phiếu nhập
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-surface-container disabled:opacity-50 text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <span className="text-[13px] font-medium text-on-surface">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-surface-container disabled:opacity-50 text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
        {alertInfo && (
          <AlertModal
            title={alertInfo.title}
            message={alertInfo.message}
            type={alertInfo.type}
            onClose={() => setAlertInfo(null)}
          />
        )}
      </div>
    </Layout>
  );
}
