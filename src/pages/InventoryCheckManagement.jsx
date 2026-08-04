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
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  useEffect(() => {
    if (materials && materials.length > 0) {
      // Sắp xếp nguyên liệu theo phân loại
      const sortedMaterials = [...materials].sort((a, b) => {
        const catA = a.category || 'Khác';
        const catB = b.category || 'Khác';
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      
      const initialItems = sortedMaterials.map(m => ({
        material_id: m._id,
        system_stock: m.actualStock,
        actual_stock: ''
      }));
      setItems(initialItems);

      // Mở mặc định nhóm đầu tiên
      const firstCategory = sortedMaterials[0]?.category || 'Chưa phân loại';
      setExpandedCategories({ [firstCategory]: true });
    }
  }, [materials]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateDifference = (system, actual) => {
    if (actual === '' || actual === null) return 0;
    const diff = Number(actual) - Number(system);
    return Math.round(diff * 100) / 100;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const checkedItems = items.filter(item => item.actual_stock !== '');

    if (checkedItems.length === 0) {
      setError('Vui lòng nhập số lượng cho ít nhất 1 nguyên liệu');
      return;
    }

    for (let item of checkedItems) {
      if (!item.material_id) {
        setError('Nguyên liệu không hợp lệ');
        return;
      }
      if (Number(item.actual_stock) < 0) {
        setError('Tồn kho thực tế không hợp lệ (không được nhỏ hơn 0)');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      await inventoryCheckService.createTicket({ items: checkedItems, note, checked_by: user?.name || 'Admin' });
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <label className="block text-[14px] font-semibold text-on-surface">Danh sách nguyên liệu kiểm kê</label>
              <div className="relative w-full sm:w-80 group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant group-focus-within:text-primary transition-colors">search</span>
                </div>
                <input
                  type="text"
                  placeholder="Tìm nguyên liệu, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 text-[14px] shadow-sm transition-all placeholder:text-on-surface-variant/60"
                />
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-error transition-colors outline-none"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
            </div>
            {(() => {
              const itemsByCategory = {};
              items.forEach((item, index) => {
                const material = materials.find(m => m._id === item.material_id);
                if (searchTerm) {
                  const term = searchTerm.toLowerCase();
                  const matchesName = material?.name?.toLowerCase().includes(term);
                  const matchesSku = material?.sku?.toLowerCase().includes(term);
                  if (!matchesName && !matchesSku) return;
                }
                const category = material?.category || 'Chưa phân loại';
                if (!itemsByCategory[category]) itemsByCategory[category] = [];
                itemsByCategory[category].push({ item, index, material });
              });

              return Object.entries(itemsByCategory).map(([category, groupItems]) => {
                const isExpanded = searchTerm ? true : expandedCategories[category];
                return (
                  <div key={category} className="mb-6 last:mb-0 bg-white border border-outline-variant/40 rounded-2xl overflow-hidden shadow-sm">
                    <button 
                      type="button" 
                      onClick={() => toggleCategory(category)}
                      className="flex justify-between items-center w-full px-5 py-4 bg-surface-container-lowest hover:bg-surface-container-low transition-colors group outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined">inventory_2</span>
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-[15px] text-on-surface uppercase tracking-wide">{category}</h4>
                          <p className="text-[12px] text-on-surface-variant font-medium mt-0.5">{groupItems.length} nguyên liệu</p>
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-5 border-t border-outline-variant/30 space-y-4 bg-surface-container-lowest/30 animate-[fadeIn_0.2s_ease-out]">
                        {groupItems.map(({ item, index, material }) => {
                          const diff = calculateDifference(item.system_stock, item.actual_stock);
                          const isChecked = item.actual_stock !== '';
                          return (
                            <div key={index} className={`flex flex-row items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border transition-all shadow-sm relative ${isChecked ? 'bg-primary/5 border-primary/30 shadow-primary/10' : 'bg-white border-outline-variant/40 hover:border-primary/30'}`}>
                              <div className="w-full sm:flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                <div className={`text-[14px] sm:text-[15px] font-bold truncate flex items-center gap-1.5 ${isChecked ? 'text-primary' : 'text-on-surface'}`}>
                                  {material?.name || 'Nguyên liệu không xác định'}
                                  {isChecked && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                                </div>
                                <div className="text-[12px] text-on-surface-variant mb-1">
                                  SKU: {material?.sku || 'N/A'}
                                </div>
                                <div className="flex items-center gap-2 text-[12px]">
                                  <span className="text-on-surface-variant font-medium">
                                    Hệ thống: {item.system_stock} {material?.unit}
                                  </span>
                                  {isChecked && (
                                    <span className={`font-bold px-1.5 py-0.5 rounded-md ${diff > 0 ? 'bg-[#d1fae5] text-[#059669]' : diff < 0 ? 'bg-error-container text-error' : 'bg-primary/20 text-primary'}`}>
                                      {diff > 0 ? `+${diff}` : diff}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="w-[90px] sm:w-[120px] flex-shrink-0">
                                <label className={`block text-[10px] font-bold uppercase mb-1 text-center transition-colors ${isChecked ? 'text-primary' : 'text-on-surface-variant'}`}>Thực tế</label>
                                <input
                                  type="number"
                                  value={item.actual_stock}
                                  onChange={(e) => handleItemChange(index, 'actual_stock', e.target.value)}
                                  className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-1 text-[15px] sm:text-[14px] font-bold text-center shadow-inner transition-colors ${isChecked ? 'border-primary/50 focus:border-primary focus:ring-primary bg-white text-primary' : 'border-outline-variant focus:border-primary focus:ring-primary bg-surface-container-lowest text-on-surface'}`}
                                  min="0"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
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
          <button type="button" onClick={handleSubmit} disabled={loading || items.every(item => item.actual_stock === '')} className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 text-[14px] shadow-sm">
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
