import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { shippingConfigService } from '../services/shippingConfigService';
import { materialService } from '../services/materialService';
import systemConfigService from '../services/systemConfigService';
import { fundService } from '../services/fundService';
import { adCostService } from '../services/adCostService';

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
  const defaultPlatforms = ['shopee', 'tiktok', 'facebook', 'instagram', 'youtube', 'website', 'khác'];
  const [returnCosts, setReturnCosts] = useState(
    defaultPlatforms.reduce((acc, p) => ({ ...acc, [p]: 0 }), {})
  );
  const [savingReturnCost, setSavingReturnCost] = useState(false);

  const [fundSummary, setFundSummary] = useState(null);
  const [syncValues, setSyncValues] = useState({});
  const [syncingTarget, setSyncingTarget] = useState(null);

  const [isReturnCostExpanded, setIsReturnCostExpanded] = useState(false);
  const [isFundSyncExpanded, setIsFundSyncExpanded] = useState(false);
  const [isAutoConfirmExpanded, setIsAutoConfirmExpanded] = useState(false);

  const [adBalances, setAdBalances] = useState([]);
  const [adSyncValues, setAdSyncValues] = useState({});
  const [syncingAdTarget, setSyncingAdTarget] = useState(null);

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
      const [resMaterials, resConfigs, resAutoConfirm, resReturnCost, resFund, resAd] = await Promise.all([
        materialService.getMaterials(),
        shippingConfigService.getAllConfigs(),
        systemConfigService.getConfig('auto_confirm_out_of_stock_imports'),
        systemConfigService.getConfig('return_cost_per_platform'),
        fundService.getSummary(),
        adCostService.getBalances()
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

      if (resReturnCost && resReturnCost.success && resReturnCost.data.value) {
        try {
          const parsed = JSON.parse(resReturnCost.data.value);
          setReturnCosts(prev => ({ ...prev, ...parsed }));
        } catch (e) { console.error('Lỗi parse return_cost_per_platform'); }
      }

      if (resFund && resFund.data.success) {
        setFundSummary(resFund.data.data);
        const initSync = { total_fund: resFund.data.data.totalFundBalance };
        resFund.data.data.platformBalances.forEach(p => {
          initSync[p.platform] = p.availableBalance;
        });
        setSyncValues(initSync);
      }

      if (resAd && resAd.data.success) {
        setAdBalances(resAd.data.data);
        const initialAdSync = {};
        resAd.data.data.forEach(p => initialAdSync[p.platform] = p.balance);
        setAdSyncValues(initialAdSync);
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

  const handleSaveReturnCost = async () => {
    setSavingReturnCost(true);
    try {
      await systemConfigService.updateConfig('return_cost_per_platform', JSON.stringify(returnCosts));
      showToast('Đã lưu cấu hình chi phí hoàn hàng');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu cấu hình', 'error');
    } finally {
      setSavingReturnCost(false);
    }
  };

  const handleSyncFund = async (target) => {
    const newAmount = syncValues[target];
    if (newAmount === undefined || newAmount < 0) {
      return showToast('Số tiền không hợp lệ', 'error');
    }
    setSyncingTarget(target);
    try {
      await fundService.syncFund({
        target,
        newAmount: Number(newAmount),
        note: target === 'total_fund' ? 'Đồng bộ hệ thống (Tổng tài sản)' : `Đồng bộ hệ thống (Quỹ ${target})`,
        created_by: 'Admin'
      });
      showToast('Đồng bộ thành công');
      fetchData(); // reload all data including fund
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Lỗi khi đồng bộ tài sản', 'error');
    } finally {
      setSyncingTarget(null);
    }
  };

  const handleSyncAd = async (platform) => {
    const val = Number(adSyncValues[platform]);
    if (isNaN(val) || val < 0) {
      showToast('Số tiền không hợp lệ', 'error');
      return;
    }
    setSyncingAdTarget(platform);
    try {
      const res = await adCostService.syncAdCost({ platform, actualBalance: val });
      showToast(res.data?.message || 'Đồng bộ thành công');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi đồng bộ', 'error');
    } finally {
      setSyncingAdTarget(null);
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

          {/* Section: Chi phí hoàn hàng */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <button
              onClick={() => setIsReturnCostExpanded(!isReturnCostExpanded)}
              className="w-full flex items-center justify-between p-4 bg-surface-container-low/50 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#fee2e2] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#dc2626] text-[24px]">assignment_return</span>
                </div>
                <div className="text-left">
                  <h2 className="text-[17px] font-bold text-on-surface m-0">Cấu hình chi phí hoàn hàng</h2>
                  <p className="text-[13px] text-on-surface-variant m-0 mt-0.5">Mức phí cố định tính cho mỗi đơn hàng bị hoàn trả</p>
                </div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isReturnCostExpanded ? 'rotate-180 bg-surface-container-high' : 'bg-surface-container'}`}>
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">expand_more</span>
              </div>
            </button>
            
            {isReturnCostExpanded && (
            <div className="p-6 border-t border-outline-variant/30 bg-surface-container-lowest">
              <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5">
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <h3 className="text-[15px] font-bold text-on-surface">Chi phí hoàn theo nguồn đơn</h3>
                    <p className="text-[13px] text-on-surface-variant mt-1">
                      Nhập số tiền sẽ được tính thêm vào chi phí khi đơn hàng bị hoàn cho từng nền tảng. 
                      Khoản này phản ánh phí vận chuyển hoàn, phí phạt sàn, v.v.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={handleSaveReturnCost}
                      disabled={savingReturnCost}
                      className="px-5 py-2.5 bg-[#dc2626] text-white text-[13px] font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center gap-2 whitespace-nowrap"
                    >
                      {savingReturnCost && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      Lưu cấu hình
                    </button>
                  </div>
                </div>
                
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {defaultPlatforms.map(platform => (
                    <div key={platform} className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-3 flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-on-surface-variant uppercase flex items-center gap-1.5">
                        {platform !== 'khác' && (
                          <span
                            className="w-[14px] h-[14px] bg-current inline-block opacity-80"
                            style={{
                              maskImage: `url(https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${platform}.svg)`,
                              maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center',
                              WebkitMaskImage: `url(https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${platform}.svg)`,
                              WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center'
                            }}
                          />
                        )}
                        {platform}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={returnCosts[platform]}
                          onChange={(e) => setReturnCosts(prev => ({ ...prev, [platform]: Number(e.target.value) }))}
                          className="w-full border border-outline-variant rounded-md px-3 py-2 text-[14px] font-bold text-right focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-on-surface-variant">đ</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
            )}
          </div>

          {/* Section: Đồng bộ tài sản */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <button
              onClick={() => setIsFundSyncExpanded(!isFundSyncExpanded)}
              className="w-full flex items-center justify-between p-4 bg-surface-container-low/50 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#e0e7ff] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#4f46e5] text-[24px]">account_balance</span>
                </div>
                <div className="text-left">
                  <h2 className="text-[17px] font-bold text-on-surface m-0">Đồng bộ tài sản & quỹ quảng cáo</h2>
                  <p className="text-[13px] text-on-surface-variant m-0 mt-0.5">Chỉnh sửa và đồng bộ số dư hệ thống cho khớp với số tiền thực tế</p>
                </div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isFundSyncExpanded ? 'rotate-180 bg-surface-container-high' : 'bg-surface-container'}`}>
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">expand_more</span>
              </div>
            </button>
            
            {isFundSyncExpanded && (
            <div className="p-6 border-t border-outline-variant/30 bg-surface-container-lowest">
              {fundSummary ? (
                <div className="space-y-6">
                  {/* Total Fund */}
                  <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5">
                    <div className="flex items-start gap-6 flex-col md:flex-row">
                      <div className="flex-1">
                        <h3 className="text-[15px] font-bold text-on-surface text-primary">Tổng tài sản chung</h3>
                        <p className="text-[13px] text-on-surface-variant mt-1">
                          Số dư hệ thống hiện tại: <strong className="text-[#059669]">{(fundSummary.totalFundBalance || 0).toLocaleString('vi-VN')}đ</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-[200px]">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={syncValues['total_fund'] ?? ''}
                            onChange={(e) => setSyncValues(prev => ({ ...prev, total_fund: e.target.value }))}
                            className="w-full border border-outline-variant rounded-md px-3 py-2 text-[14px] font-bold text-right focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-on-surface-variant">đ</span>
                        </div>
                        <button
                          onClick={() => handleSyncFund('total_fund')}
                          disabled={syncingTarget === 'total_fund'}
                          className="px-4 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center gap-2 whitespace-nowrap"
                        >
                          {syncingTarget === 'total_fund' ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">sync</span>}
                          Đồng bộ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Platforms */}
                  <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 p-5">
                    <h3 className="text-[15px] font-bold text-on-surface mb-4">Quỹ khả dụng các nền tảng</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                      {fundSummary.platformBalances.map(p => {
                        const adP = adBalances.find(a => a.platform === p.platform);
                        return (
                        <div key={p.platform} className="flex flex-col gap-3 p-4 border border-outline-variant/50 rounded-xl bg-surface-container-lowest shadow-sm">
                           <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
                             <label className="text-[14px] font-bold text-on-surface uppercase flex items-center gap-2">
                               {p.platform !== 'khác' && (
                                <span
                                  className="w-[18px] h-[18px] bg-current inline-block opacity-80"
                                  style={{
                                    maskImage: `url(https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${p.platform}.svg)`,
                                    maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center',
                                    WebkitMaskImage: `url(https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${p.platform}.svg)`,
                                    WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center'
                                  }}
                                />
                               )}
                               {p.platform}
                             </label>
                           </div>
                           
                           {/* Quỹ khả dụng */}
                           <div className="flex flex-col gap-1.5">
                             <div className="flex justify-between items-center">
                               <span className="text-[13px] font-bold text-on-surface-variant">Quỹ khả dụng</span>
                               <span className="text-[13px] text-on-surface-variant">Hệ thống: <strong className="text-[#059669]">{p.availableBalance.toLocaleString('vi-VN')}đ</strong></span>
                             </div>
                             <div className="flex items-center gap-2">
                               <div className="relative flex-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={syncValues[p.platform] ?? ''}
                                    onChange={(e) => setSyncValues(prev => ({ ...prev, [p.platform]: e.target.value }))}
                                    className="w-full border border-outline-variant rounded-md px-3 py-1.5 text-[14px] font-bold text-right focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary pr-8"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-on-surface-variant">đ</span>
                               </div>
                               <button
                                  onClick={() => handleSyncFund(p.platform)}
                                  disabled={syncingTarget === p.platform}
                                  className="px-3 py-1.5 bg-surface-container text-on-surface text-[13px] font-bold rounded-lg hover:bg-surface-container-high disabled:opacity-60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  {syncingTarget === p.platform ? <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[16px]">sync</span>}
                                  Đồng bộ
                                </button>
                             </div>
                           </div>

                           {/* Quỹ quảng cáo */}
                           {adP && (
                           <div className="flex flex-col gap-1.5 pt-3 mt-1 border-t border-outline-variant/30">
                             <div className="flex justify-between items-center">
                               <span className="text-[13px] font-bold text-[#db2777]">Quỹ quảng cáo</span>
                               <span className="text-[13px] text-on-surface-variant">Hệ thống: <strong className="text-[#db2777]">{adP.balance.toLocaleString('vi-VN')}đ</strong></span>
                             </div>
                             <div className="flex items-center gap-2">
                               <div className="relative flex-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={adSyncValues[p.platform] ?? ''}
                                    onChange={(e) => setAdSyncValues(prev => ({ ...prev, [p.platform]: e.target.value }))}
                                    className="w-full border border-outline-variant rounded-md px-3 py-1.5 text-[14px] font-bold text-right focus:outline-none focus:border-[#db2777] focus:ring-1 focus:ring-[#db2777] pr-8"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-on-surface-variant">đ</span>
                               </div>
                               <button
                                  onClick={() => handleSyncAd(p.platform)}
                                  disabled={syncingAdTarget === p.platform}
                                  className="px-3 py-1.5 bg-[#fce7f3] text-[#db2777] text-[13px] font-bold rounded-lg hover:bg-[#fbcfe8] disabled:opacity-60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  {syncingAdTarget === p.platform ? <span className="w-3.5 h-3.5 border-2 border-[#db2777]/30 border-t-[#db2777] rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[16px]">sync</span>}
                                  Đồng bộ
                                </button>
                             </div>
                           </div>
                           )}
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-[13px] text-on-surface-variant">Đang tải dữ liệu quỹ...</div>
              )}
            </div>
            )}
          </div>

          {/* Section: Tự động hóa */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <button
              onClick={() => setIsAutoConfirmExpanded(!isAutoConfirmExpanded)}
              className="w-full flex items-center justify-between p-4 bg-surface-container-low/50 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-[24px]">precision_manufacturing</span>
                </div>
                <div className="text-left">
                  <h2 className="text-[17px] font-bold text-on-surface m-0">Cấu hình tự động hóa</h2>
                  <p className="text-[13px] text-on-surface-variant m-0 mt-0.5">Quản lý các luồng xử lý tự động của hệ thống</p>
                </div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isAutoConfirmExpanded ? 'rotate-180 bg-surface-container-high' : 'bg-surface-container'}`}>
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">expand_more</span>
              </div>
            </button>
            {isAutoConfirmExpanded && (
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
            )}
          </div>


        </div>
      )}
    </Layout>
  );
}
