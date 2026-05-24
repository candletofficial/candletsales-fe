import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { inventoryCheckService } from '../services/inventoryCheckService';
import { materialService } from '../services/materialService';
import { useAuth } from '../hooks/useAuth';
import SearchableSelect from '../components/SearchableSelect';

function InventoryCheckModal({ materials, user, onClose, onSave }) {
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const materialOptions = useMemo(() => materials.map(m => ({
    value: m._id,
    label: `${m.name} (Hệ thống: ${m.actualStock} ${m.unit})`
  })), [materials]);

  const getOptionsForIndex = (index) => {
    return materialOptions.filter(opt => 
      !items.some((i, idx) => i.material_id === opt.value && idx !== index)
    );
  };

  useEffect(() => {
    if (materials && materials.length > 0) {
      const initialItems = materials.map(m => ({
        material_id: m._id,
        system_stock: m.actualStock,
        actual_stock: ''
      }));
      setItems(initialItems);
    }
  }, [materials]);

  const handleAddItem = () => {
    setItems([...items, { material_id: '', system_stock: 0, actual_stock: '' }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Tự động điền system_stock nếu chọn nguyên liệu
    if (field === 'material_id') {
      const selectedMaterial = materials.find(m => m._id === value);
      if (selectedMaterial) {
        newItems[index].system_stock = selectedMaterial.actualStock;
      } else {
        newItems[index].system_stock = 0;
      }
    }

    setItems(newItems);
  };

  const calculateDifference = (system, actual) => {
    if (actual === '' || actual === null) return 0;
    const diff = Number(actual) - Number(system);
    return Math.round(diff * 100) / 100;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Vui lòng chọn ít nhất 1 nguyên liệu để kiểm kho');
      return;
    }
    for (let item of items) {
      if (!item.material_id) {
        setError('Vui lòng chọn đầy đủ nguyên liệu');
        return;
      }
      if (item.actual_stock === '' || Number(item.actual_stock) < 0) {
        setError('Tồn kho thực tế không hợp lệ');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      await inventoryCheckService.createTicket({ items, note, checked_by: user?.name || 'Admin' });
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phiếu kiểm kho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 sm:p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto max-w-4xl max-h-none sm:max-h-[90vh] flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out]">
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">fact_check</span>
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-on-surface">Tạo Phiếu kiểm kho</h3>
              <p className="text-[13px] text-on-surface-variant">Kiểm kê số lượng thực tế và cập nhật tồn kho</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-error-container text-error rounded-xl flex items-center gap-2 text-[14px] font-medium">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <label className="block text-[14px] font-semibold text-on-surface">Danh sách nguyên liệu kiểm kê</label>
            {items.map((item, index) => {
              const diff = calculateDifference(item.system_stock, item.actual_stock);
              const material = materials.find(m => m._id === item.material_id);
              return (
                <div key={index} className="flex flex-col sm:flex-row gap-3 sm:items-start bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 relative">
                  <div className="w-full sm:flex-1 min-w-0 flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Nguyên liệu</label>
                      <SearchableSelect
                        options={getOptionsForIndex(index)}
                        value={item.material_id}
                        onChange={(val) => handleItemChange(index, 'material_id', val)}
                        placeholder="Chọn nguyên liệu..."
                        className="border border-outline-variant bg-white"
                      />
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(index)} className="sm:hidden p-2 mb-[1px] text-error hover:bg-error-container rounded-lg transition-colors flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>

                  <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex-1 sm:w-[120px] min-w-0">
                      <label className="block text-[10px] sm:text-[12px] font-bold sm:font-medium text-on-surface-variant mb-1 truncate uppercase sm:normal-case text-center sm:text-left">Hệ thống ({material?.unit || ''})</label>
                      <input
                        type="number"
                        value={item.system_stock}
                        className="w-full px-2 sm:px-3 py-2 border border-outline-variant rounded-lg text-[14px] bg-surface-container-low text-on-surface-variant cursor-not-allowed text-center sm:text-left"
                        disabled
                      />
                    </div>

                    <div className="flex-1 sm:w-[120px] min-w-0">
                      <label className="block text-[10px] sm:text-[12px] font-bold sm:font-medium text-on-surface-variant mb-1 truncate uppercase sm:normal-case text-center sm:text-left">Thực tế ({material?.unit || ''})</label>
                      <input
                        type="number"
                        value={item.actual_stock}
                        onChange={(e) => handleItemChange(index, 'actual_stock', e.target.value)}
                        className="w-full px-2 sm:px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-[14px] text-center sm:text-left"
                        min="0"
                        placeholder="0"
                        required
                      />
                    </div>

                    <div className="flex-1 sm:w-[100px] min-w-0">
                      <label className="block text-[10px] sm:text-[12px] font-bold sm:font-medium text-on-surface-variant mb-1 truncate uppercase sm:normal-case text-center sm:text-left">Chênh lệch</label>
                      <div className={`px-2 sm:px-3 py-2 border rounded-lg text-[14px] font-bold text-center ${item.actual_stock === '' ? 'border-outline-variant bg-surface-container-low text-on-surface-variant' : diff > 0 ? 'bg-[#d1fae5] text-[#059669] border-[#059669]/20' : diff < 0 ? 'bg-error-container text-error border-error/20' : 'bg-surface-container-low border-outline-variant text-on-surface-variant'}`}>
                        {item.actual_stock !== '' ? (diff > 0 ? `+${diff}` : diff) : '-'}
                      </div>
                    </div>
                  </div>

                  <button type="button" onClick={() => handleRemoveItem(index)} className="hidden sm:block mt-6 p-2 text-error hover:bg-error-container rounded-lg transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              );
            })}

            <button type="button" onClick={handleAddItem} className="w-full py-3 border-2 border-dashed border-primary/30 text-primary rounded-xl hover:bg-primary/5 hover:border-primary/50 transition-colors font-semibold text-[14px] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">add_circle</span>
              Thêm nguyên liệu
            </button>
          </div>

          <div>
            <label className="block text-[14px] font-semibold text-on-surface mb-2">Ghi chú phiếu kiểm (Không bắt buộc)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none text-[14px]"
              rows="3"
              placeholder="Nhập lý do kiểm kho hoặc ghi chú chênh lệch..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant/30 flex justify-between sm:justify-end gap-3 bg-surface-container-lowest">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg font-semibold text-on-surface-variant hover:bg-surface-container transition-colors text-[14px]">
            Hủy
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading || items.length === 0 || items.some(item => item.actual_stock === '')} className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 text-[14px] shadow-sm">
            {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">save</span>}
            Lưu phiếu kiểm kho
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
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
          <div>
            <h3 className="text-[18px] font-bold text-on-surface">Chi tiết Phiếu kiểm kho</h3>
            <p className="text-[13px] text-primary font-bold mt-0.5">{ticket.code}</p>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Ngày kiểm</p>
              <p className="text-[14px] font-semibold text-on-surface">{new Date(ticket.createdAt).toLocaleString('vi-VN')}</p>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Người kiểm</p>
              <p className="text-[14px] font-semibold text-on-surface">{ticket.checked_by || 'Admin'}</p>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Trạng thái</p>
              <span className="inline-block px-2.5 py-1 rounded-md text-[12px] font-bold bg-primary-container text-primary">
                Đã cập nhật kho
              </span>
            </div>
          </div>

          <h4 className="text-[14px] font-bold text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">inventory_2</span>
            Chi tiết kiểm kê
          </h4>
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden mb-6">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                <tr className="bg-surface-container-lowest">
                  <th className="px-4 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Nguyên liệu</th>
                  <th className="px-4 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right">Hệ thống</th>
                  <th className="px-4 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right">Thực tế</th>
                  <th className="px-4 py-3 text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right">Chênh lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {ticket.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[14px] font-semibold text-on-surface">{item.material_id?.name || 'Nguyên liệu đã xóa'}</p>
                      {item.material_id?.sku && <p className="text-[12px] text-on-surface-variant">{item.material_id.sku}</p>}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-right font-medium text-on-surface-variant">{item.system_stock} {item.material_id?.unit}</td>
                    <td className="px-4 py-3 text-[14px] text-right font-bold text-on-surface">{item.actual_stock} {item.material_id?.unit}</td>
                    <td className="px-4 py-3 text-[14px] text-right font-bold">
                      <span className={item.difference > 0 ? 'text-[#059669]' : item.difference < 0 ? 'text-error' : 'text-on-surface-variant'}>
                        {item.difference > 0 ? `+${Math.round(item.difference * 100) / 100}` : Math.round(item.difference * 100) / 100}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {ticket.note && (
            <div>
              <h4 className="text-[14px] font-bold text-on-surface mb-2">Ghi chú</h4>
              <p className="text-[14px] text-on-surface-variant bg-surface-container-low p-4 rounded-xl italic">
                {ticket.note}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InventoryCheckManagement() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsTicket, setDetailsTicket] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, materialsRes] = await Promise.all([
        inventoryCheckService.getTickets(),
        materialService.getMaterials()
      ]);
      setTickets(ticketsRes);
      setMaterials(materialsRes.data.data);
    } catch (error) {
      console.error('Lỗi lấy dữ liệu:', error);
      showToast('Không thể tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const exportExcel = () => {
    const headers = ['Mã phiếu', 'Ngày kiểm', 'Người kiểm', 'Số nguyên liệu', 'Ghi chú'];
    const rows = filteredTickets.map(t => [
      t.code,
      new Date(t.createdAt).toLocaleDateString('vi-VN'),
      t.checked_by || 'Admin',
      t.items.length,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + headers.join(',') + '\n'
      + rows.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `phieu_kiem_kho_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất file Excel');
  };

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (filterDate) {
      result = result.filter(t => {
        const tDate = new Date(t.createdAt).toISOString().split('T')[0];
        return tDate === filterDate;
      });
    }
    return result;
  }, [tickets, filterDate]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const currentTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Layout>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-error' : 'bg-[#d1fae5] text-[#059669]'}`}>
          {toast.message}
        </div>
      )}

      {modalOpen && <InventoryCheckModal materials={materials} user={user} onClose={() => setModalOpen(false)} onSave={() => { setModalOpen(false); showToast('Đã lưu phiếu kiểm kho'); fetchData(); window.dispatchEvent(new CustomEvent('materialsChanged')); }} />}
      {detailsTicket && <TicketDetailsModal ticket={detailsTicket} onClose={() => setDetailsTicket(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <div>
          <h2 className="text-[24px] font-bold text-on-surface">Kiểm kho</h2>
          <p className="text-[14px] text-on-surface-variant mt-1">Quản lý các đợt kiểm kê tồn kho thực tế</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="px-5 py-2.5 bg-primary text-white text-[14px] font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tạo phiếu kiểm kho
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        {/* Toolbar */}
        <div className="px-lg py-md border-b border-outline-variant/30 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-surface-container-low/50">
          <p className="text-[13px] text-on-surface-variant">

          </p>

          <div className="flex items-center gap-3">
            <div className="relative group flex items-center border border-outline-variant rounded-lg overflow-hidden bg-white hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined absolute left-2.5 text-[18px] text-on-surface-variant group-hover:text-primary transition-colors pointer-events-none">calendar_month</span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-2 py-1.5 text-[13px] font-semibold text-on-surface-variant focus:outline-none bg-transparent cursor-pointer w-[130px]"
                title="Lọc theo ngày kiểm"
              />
            </div>

            <button onClick={exportExcel} className="px-4 py-1.5 border border-outline-variant bg-white rounded-lg text-[13px] font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Xuất Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-lowest">
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Mã phiếu</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Ngày kiểm</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold">Người kiểm</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right">Số NL kiểm</th>
                <th className="px-lg py-md text-on-surface-variant border-b border-outline-variant uppercase tracking-wider text-[11px] font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-lg py-md">
                        <div className="h-4 bg-surface-container-high rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-lg py-16 text-center">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-30 block mb-3">fact_check</span>
                    <p className="text-on-surface-variant text-sm">
                      {tickets.length === 0 ? 'Chưa có phiếu kiểm kho nào' : 'Không tìm thấy phiếu kiểm phù hợp'}
                    </p>
                    {tickets.length === 0 && (
                      <button onClick={() => setModalOpen(true)} className="mt-3 text-primary text-sm font-semibold hover:underline">
                        + Tạo phiếu kiểm kho mới
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                currentTickets.map(ticket => (
                  <tr key={ticket._id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-lg py-md text-[14px] font-bold text-primary">{ticket.code}</td>
                    <td className="px-lg py-md text-[14px]">{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-lg py-md text-[14px] font-medium text-on-surface-variant">{ticket.checked_by || 'Admin'}</td>
                    <td className="px-lg py-md text-[14px] font-semibold text-right">{ticket.items.length}</td>
                    <td className="px-lg py-md text-right">
                      <button onClick={() => setDetailsTicket(ticket)} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded transition-colors" title="Chi tiết">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
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
              Hiển thị <span className="font-bold text-on-surface">{currentTickets.length}</span> / <span className="font-bold text-on-surface">{filteredTickets.length}</span> phiếu kiểm kho
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
    </Layout>
  );
}
