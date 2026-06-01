import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { shippingConfigService } from '../services/shippingConfigService';
import { materialService } from '../services/materialService';
import systemConfigService from '../services/systemConfigService';

const SearchableSelect = ({ value, options, onChange, placeholder = "-- Chọn --" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full" ref={selectRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-outline-variant rounded-md px-3 py-1.5 text-[13px] bg-white cursor-pointer flex justify-between items-center"
      >
        <span className={selectedOption ? "text-on-surface truncate pr-2" : "text-on-surface-variant"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant flex-shrink-0">
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-outline-variant rounded-md shadow-lg max-h-[250px] flex flex-col">
          <div className="p-2 border-b border-outline-variant/50 sticky top-0 bg-white">
            <input
              type="text"
              autoFocus
              className="w-full px-2 py-1.5 text-[13px] border border-outline-variant/50 rounded focus:outline-none focus:border-primary"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-[13px] text-on-surface-variant text-center">Không tìm thấy</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`px-3 py-2 text-[13px] cursor-pointer rounded-sm hover:bg-primary-container/30 ${opt.value === value ? 'bg-primary-container/50 font-bold text-primary' : 'text-on-surface'}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({ standard: false, express: false });
  const [materialsList, setMaterialsList] = useState([]);
  const [toast, setToast] = useState(null);
  const [isShippingConfigExpanded, setIsShippingConfigExpanded] = useState(false);
  const [autoConfirmImport, setAutoConfirmImport] = useState(false);
  const [savingAutoConfirm, setSavingAutoConfirm] = useState(false);

  // State lưu cấu hình cho từng phương thức
  const [configs, setConfigs] = useState({
    standard: [],
    express: []
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMaterials, resConfigs, resAutoConfirm] = await Promise.all([
        materialService.getMaterials(),
        shippingConfigService.getAllConfigs(),
        systemConfigService.getConfig('auto_confirm_out_of_stock_imports')
      ]);

      if (resMaterials.data.success) {
        setMaterialsList(resMaterials.data.data);
      }

      if (resConfigs.data.success) {
        const newConfigs = { standard: [], express: [] };
        resConfigs.data.data.forEach(cfg => {
          if (newConfigs[cfg.method] !== undefined) {
            // Map lại để UI dễ sử dụng
            newConfigs[cfg.method] = cfg.materials.map(m => ({
              material_id: m.material_id._id || m.material_id, // tùy vào populate
              quantity: m.quantity
            }));
          }
        });
        setConfigs(newConfigs);
      }
      
      if (resAutoConfirm && resAutoConfirm.success) {
        setAutoConfirmImport(resAutoConfirm.data.value || false);
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMaterial = (method) => {
    setConfigs(prev => ({
      ...prev,
      [method]: [...prev[method], { material_id: '', quantity: 1 }]
    }));
  };

  const handleRemoveMaterial = (method, index) => {
    setConfigs(prev => {
      const updated = [...prev[method]];
      updated.splice(index, 1);
      return { ...prev, [method]: updated };
    });
  };

  const handleChangeMaterial = (method, index, field, value) => {
    setConfigs(prev => {
      const updated = [...prev[method]];
      updated[index][field] = value;
      return { ...prev, [method]: updated };
    });
  };

  const handleSave = async (method) => {
    // Validate
    const methodData = configs[method];
    if (methodData.some(m => !m.material_id || m.quantity <= 0)) {
      showToast('Vui lòng chọn nguyên vật liệu và nhập số lượng lớn hơn 0', 'error');
      return;
    }

    setSaving(prev => ({ ...prev, [method]: true }));
    try {
      await shippingConfigService.updateConfig(method, { materials: methodData });
      showToast(`Đã lưu cấu hình cho Vận chuyển ${method === 'express' ? 'Hỏa tốc' : 'Thường'}`);
      fetchData(); // reload để lấy populate
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu cấu hình', 'error');
    } finally {
      setSaving(prev => ({ ...prev, [method]: false }));
    }
  };

  const handleToggleAutoConfirm = async () => {
    setSavingAutoConfirm(true);
    const newValue = !autoConfirmImport;
    try {
      await systemConfigService.updateConfig('auto_confirm_out_of_stock_imports', newValue);
      setAutoConfirmImport(newValue);
      showToast(newValue ? 'Đã bật tự động xác nhận phiếu nhập' : 'Đã tắt tự động xác nhận phiếu nhập');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu cấu hình', 'error');
    } finally {
      setSavingAutoConfirm(false);
    }
  };

  const renderConfigSection = (method, title, icon) => {
    const configData = configs[method];
    const isSaving = saving[method];

    return (
      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">{icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-bold text-on-surface">{title}</h3>
            <p className="text-[13px] text-on-surface-variant">Thiết lập nguyên vật liệu trừ vào kho khi chọn phương thức này</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 mb-6">
          {configData.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-outline-variant/50 rounded-lg">
              <p className="text-[13px] text-on-surface-variant">Chưa có nguyên vật liệu cấu hình.</p>
            </div>
          ) : (
            configData.map((item, idx) => (
              <div key={idx} className="flex items-end gap-3 bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Nguyên vật liệu</label>
                  <SearchableSelect
                    value={item.material_id}
                    onChange={(val) => handleChangeMaterial(method, idx, 'material_id', val)}
                    placeholder="-- Chọn nguyên vật liệu --"
                    options={materialsList.map(m => ({ value: m._id, label: `${m.name} (${m.unit})` }))}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Số lượng</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleChangeMaterial(method, idx, 'quantity', Number(e.target.value))}
                    className="w-full border border-outline-variant rounded-md px-3 py-1.5 text-[13px] text-center focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={() => handleRemoveMaterial(method, idx)}
                    className="w-[34px] h-[34px] flex items-center justify-center text-error hover:bg-error-container rounded-md transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between mt-auto border-t border-outline-variant/30 pt-4">
          <button
            onClick={() => handleAddMaterial(method)}
            className="text-primary text-[13px] font-bold flex items-center gap-1 hover:bg-primary-container/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span> Thêm
          </button>
          <button
            onClick={() => handleSave(method)}
            disabled={isSaving}
            className="px-5 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center gap-2"
          >
            {isSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Lưu thay đổi
          </button>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-[#d1fae5] text-[#059669]'}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Cài đặt hệ thống</h1>
          <p className="page-subtitle">Cấu hình các thông số tự động của hệ thống</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section: Vận chuyển */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <button 
              onClick={() => setIsShippingConfigExpanded(!isShippingConfigExpanded)}
              className="w-full flex items-center justify-between p-4 bg-surface-container-low/50 hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-[24px]">local_shipping</span>
                </div>
                <div className="text-left">
                  <h2 className="text-[17px] font-bold text-on-surface m-0">Cấu hình nguyên vật liệu đóng gói</h2>
                  <p className="text-[13px] text-on-surface-variant m-0 mt-0.5">Tự động trừ kho bao bì, hộp, túi khi phát sinh đơn hàng</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors">
                <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${isShippingConfigExpanded ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
            </button>

            {isShippingConfigExpanded && (
              <div className="p-6 border-t border-outline-variant/30 bg-surface-container-lowest">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {renderConfigSection('standard', 'Vận chuyển Thường', 'inventory_2')}
                  {renderConfigSection('express', 'Vận chuyển Hỏa tốc', 'bolt')}
                </div>
              </div>
            )}
          </div>

          {/* Section: Tự động hóa */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="w-full flex items-center justify-between p-4 bg-surface-container-low/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-[24px]">precision_manufacturing</span>
                </div>
                <div className="text-left">
                  <h2 className="text-[17px] font-bold text-on-surface m-0">Cấu hình tự động hóa</h2>
                  <p className="text-[13px] text-on-surface-variant m-0 mt-0.5">Quản lý các luồng xử lý tự động của hệ thống</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-outline-variant/30 bg-surface-container-lowest">
              <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5">
                <div>
                  <h3 className="text-[15px] font-bold text-on-surface">Tự động duyệt phiếu nhập</h3>
                  <p className="text-[13px] text-on-surface-variant mt-1 max-w-2xl">
                    Hệ thống sẽ tự động chuyển trạng thái phiếu nhập thành "Hoàn thành" và cộng dồn vào kho 
                    nếu trong phiếu có bất kỳ nguyên vật liệu nào đang bị hết hàng (tồn kho = 0).
                  </p>
                </div>
                
                {/* Toggle switch */}
                <button
                  disabled={savingAutoConfirm}
                  onClick={handleToggleAutoConfirm}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoConfirmImport ? 'bg-primary' : 'bg-outline-variant'} ${savingAutoConfirm ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoConfirmImport ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
