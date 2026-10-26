import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { shippingConfigService } from '../services/shippingConfigService';
import { materialService } from '../services/materialService';
import systemConfigService from '../services/systemConfigService';
import { fundService } from '../services/fundService';
import { adCostService } from '../services/adCostService';
import AddressSelector from '../components/shop/AddressSelector';
import { locationService } from '../services/locationService';
import { useWebsiteTheme } from '../hooks/useWebsiteTheme';
import { THEME_PRESETS } from '../theme/themePresets';

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
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] bg-white cursor-pointer flex justify-between items-center hover:border-primary/60 transition-colors shadow-2xs"
      >
        <span className={selectedOption ? "text-stone-900 font-medium truncate pr-2" : "text-stone-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="material-symbols-outlined text-[18px] text-stone-400 flex-shrink-0">
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-[250px] flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease-out]">
          <div className="p-2 border-b border-stone-100 sticky top-0 bg-white">
            <input
              type="text"
              autoFocus
              className="w-full px-3 py-1.5 text-[13px] border border-stone-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Tìm kiếm nguyên vật liệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-[13px] text-stone-400 text-center">
                Không tìm thấy nguyên vật liệu phù hợp
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`px-3 py-2 text-[13px] cursor-pointer rounded-lg hover:bg-primary-container/30 transition-colors ${opt.value === value ? 'bg-primary-container/60 font-bold text-primary' : 'text-stone-700'}`}
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
  const [activeTab, setActiveTab] = useState('appearance');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({ standard: false, express: false });
  const [materialsList, setMaterialsList] = useState([]);
  const [toast, setToast] = useState(null);
  const { config: themeConfig, applyPreset, savingTheme } = useWebsiteTheme();
  const [themePreset, setThemePreset] = useState(themeConfig.adminPreset);
  const [themeScope, setThemeScope] = useState('admin');

  // Automation
  const [autoConfirmImport, setAutoConfirmImport] = useState(false);
  const [savingAutoConfirm, setSavingAutoConfirm] = useState(false);

  // Return Costs
  const defaultPlatforms = ['shopee', 'tiktok', 'facebook', 'instagram', 'youtube', 'website', 'khác'];
  const [returnCosts, setReturnCosts] = useState(
    defaultPlatforms.reduce((acc, p) => ({ ...acc, [p]: 0 }), {})
  );
  const [savingReturnCost, setSavingReturnCost] = useState(false);

  // Finance & Fund Sync
  const [fundSummary, setFundSummary] = useState(null);
  const [syncValues, setSyncValues] = useState({});
  const [syncingTarget, setSyncingTarget] = useState(null);
  const [financeSubTab, setFinanceSubTab] = useState('funds'); // 'funds' | 'returns'

  // Ad Costs
  const [adBalances, setAdBalances] = useState([]);
  const [adSyncValues, setAdSyncValues] = useState({});
  const [syncingAdTarget, setSyncingAdTarget] = useState(null);

  // Website Settings
  const [expressShippingFee, setExpressShippingFee] = useState(30000);
  const [standardShippingThreshold, setStandardShippingThreshold] = useState(100000);
  const [standardShippingFeeBelow, setStandardShippingFeeBelow] = useState(16000);
  const [savingWebsiteSettings, setSavingWebsiteSettings] = useState(false);
  const [bankTransferInfo, setBankTransferInfo] = useState({
    bankId: '', accountNo: '', accountName: '', bankName: ''
  });

  // Shop Address & Express Distance Settings
  const [shopAddress, setShopAddress] = useState('Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Thành phố Hà Nội');
  const [shopCoordinates, setShopCoordinates] = useState({ lat: 21.0298, lng: 105.7913 });
  const [expressMaxDistance, setExpressMaxDistance] = useState(20);
  const [expressBaseFee, setExpressBaseFee] = useState(15000);
  const [expressPerKmFee, setExpressPerKmFee] = useState(5000);
  const [geocodingShop, setGeocodingShop] = useState(false);

  // Goong Maps API Key Settings
  const [goongApiKey, setGoongApiKey] = useState('');
  const [testingGoongKey, setTestingGoongKey] = useState(false);
  const [goongKeyStatus, setGoongKeyStatus] = useState(null);
  const [showGoongKey, setShowGoongKey] = useState(false);

  // Packaging Configs
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
      const [resMaterials, resConfigs, resAutoConfirm, resReturnCost, resFund, resAd,
             resExpressFee, resStandardThreshold, resStandardFeeBelow,
             resShopAddress, resShopCoords, resMaxDist, resBaseFee, resPerKmFee, resGoongKey, resBankTransferInfo] = await Promise.all([
        materialService.getMaterials(),
        shippingConfigService.getAllConfigs(),
        systemConfigService.getConfig('auto_confirm_out_of_stock_imports'),
        systemConfigService.getConfig('return_cost_per_platform'),
        fundService.getSummary(),
        adCostService.getBalances(),
        systemConfigService.getConfig('express_shipping_fee'),
        systemConfigService.getConfig('standard_shipping_threshold'),
        systemConfigService.getConfig('standard_shipping_fee_below'),
        systemConfigService.getConfig('shop_address'),
        systemConfigService.getConfig('shop_coordinates'),
        systemConfigService.getConfig('express_max_distance'),
        systemConfigService.getConfig('express_base_fee'),
        systemConfigService.getConfig('express_per_km_fee'),
        systemConfigService.getConfig('goong_api_key'),
        systemConfigService.getConfig('bank_transfer_info'),
      ]);

      if (resMaterials.data.success) {
        setMaterialsList(resMaterials.data.data);
      }

      // Goong Maps API Key
      if (resGoongKey?.data?.value && typeof resGoongKey.data.value === 'string') {
        setGoongApiKey(resGoongKey.data.value);
        locationService.setGoongApiKey(resGoongKey.data.value);
      }

      // Website settings
      if (resExpressFee?.data?.value !== undefined && resExpressFee?.data?.value !== false) {
        setExpressShippingFee(Number(resExpressFee.data.value));
      }
      if (resStandardThreshold?.data?.value !== undefined && resStandardThreshold?.data?.value !== false) {
        setStandardShippingThreshold(Number(resStandardThreshold.data.value));
      }
      if (resStandardFeeBelow?.data?.value !== undefined && resStandardFeeBelow?.data?.value !== false) {
        setStandardShippingFeeBelow(Number(resStandardFeeBelow.data.value));
      }

      // Shop Address & Express Rules
      if (resShopAddress?.data?.value) {
        setShopAddress(resShopAddress.data.value);
      }
      if (resShopCoords?.data?.value) {
        try {
          const parsed = typeof resShopCoords.data.value === 'string' ? JSON.parse(resShopCoords.data.value) : resShopCoords.data.value;
          if (parsed && parsed.lat && parsed.lng) setShopCoordinates(parsed);
        } catch (e) {}
      }
      if (resMaxDist?.data?.value !== undefined && resMaxDist?.data?.value !== false) {
        setExpressMaxDistance(Number(resMaxDist.data.value));
      }
      if (resBaseFee?.data?.value !== undefined && resBaseFee?.data?.value !== false) {
        setExpressBaseFee(Number(resBaseFee.data.value));
      }
      if (resPerKmFee?.data?.value !== undefined && resPerKmFee?.data?.value !== false) {
        setExpressPerKmFee(Number(resPerKmFee.data.value));
      }
      if (resBankTransferInfo?.data?.value) {
        try {
          const saved = typeof resBankTransferInfo.data.value === 'string'
            ? JSON.parse(resBankTransferInfo.data.value)
            : resBankTransferInfo.data.value;
          if (saved && typeof saved === 'object') {
            setBankTransferInfo((current) => ({ ...current, ...saved }));
          }
        } catch (e) {}
      }

      if (resConfigs.data.success) {
        const newConfigs = { standard: [], express: [] };
        resConfigs.data.data.forEach(cfg => {
          if (newConfigs[cfg.method] !== undefined) {
            newConfigs[cfg.method] = cfg.materials.map(m => ({
              material_id: m.material_id._id || m.material_id,
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
        } catch (e) { 
          console.error('Lỗi parse return_cost_per_platform'); 
        }
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
      showToast('Lỗi khi tải dữ liệu cài đặt', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setThemePreset(themeScope === 'shop' ? themeConfig.shopPreset : themeConfig.adminPreset);
  }, [themeConfig, themeScope]);

  const handleApplyTheme = async () => {
    try {
      await applyPreset(themePreset, themeScope);
      const scopeLabel = themeScope === 'admin' ? 'trang Admin' : 'trang Shop';
      showToast(`Đã áp dụng tông màu cho ${scopeLabel}`);
    } catch (error) {
      console.error(error);
      showToast('Không thể lưu tông màu. Vui lòng thử lại.', 'error');
    }
  };

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
    const methodData = configs[method];
    if (methodData.some(m => !m.material_id || m.quantity <= 0)) {
      showToast('Vui lòng chọn nguyên vật liệu và nhập số lượng lớn hơn 0', 'error');
      return;
    }

    setSaving(prev => ({ ...prev, [method]: true }));
    try {
      await shippingConfigService.updateConfig(method, { materials: methodData });
      showToast(`Đã lưu cấu hình đóng gói cho vận chuyển ${method === 'express' ? 'Hỏa tốc' : 'Thường'}`);
      fetchData();
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

  const handleGeocodeShop = async (targetAddress) => {
    const addr = targetAddress || shopAddress;
    if (!addr) {
      showToast('Vui lòng nhập địa chỉ shop trước', 'error');
      return;
    }
    setGeocodingShop(true);
    try {
      const coords = await locationService.geocodeAddress(addr);
      if (coords && coords.lat && coords.lng) {
        setShopCoordinates({ lat: coords.lat, lng: coords.lng });
        showToast(`Đã nhận diện tọa độ GPS: [${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}]`);
      } else {
        showToast('Không tìm thấy tọa độ chính xác cho địa chỉ này, vui lòng kiểm tra lại tên quận/tỉnh', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tìm tọa độ', 'error');
    } finally {
      setGeocodingShop(false);
    }
  };

  const handleTestGoongKey = async () => {
    if (!goongApiKey.trim()) {
      showToast('Vui lòng nhập Goong API Key trước khi kiểm tra', 'error');
      return;
    }
    setTestingGoongKey(true);
    setGoongKeyStatus(null);
    try {
      const res = await locationService.testGoongKey(goongApiKey.trim());
      setGoongKeyStatus(res);
      if (res.success) {
        showToast(res.message);
        locationService.setGoongApiKey(goongApiKey.trim());
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      setGoongKeyStatus({ success: false, message: err.message });
      showToast(err.message, 'error');
    } finally {
      setTestingGoongKey(false);
    }
  };

  const handleSaveWebsiteSettings = async () => {
    setSavingWebsiteSettings(true);
    try {
      await Promise.all([
        systemConfigService.updateConfig('express_shipping_fee', expressShippingFee),
        systemConfigService.updateConfig('standard_shipping_threshold', standardShippingThreshold),
        systemConfigService.updateConfig('standard_shipping_fee_below', standardShippingFeeBelow),
        systemConfigService.updateConfig('shop_address', shopAddress),
        systemConfigService.updateConfig('shop_coordinates', JSON.stringify(shopCoordinates)),
        systemConfigService.updateConfig('express_max_distance', expressMaxDistance),
        systemConfigService.updateConfig('express_base_fee', expressBaseFee),
        systemConfigService.updateConfig('express_per_km_fee', expressPerKmFee),
        systemConfigService.updateConfig('goong_api_key', goongApiKey.trim()),
        systemConfigService.updateConfig('bank_transfer_info', bankTransferInfo),
      ]);
      locationService.setGoongApiKey(goongApiKey.trim());
      showToast('Đã lưu cấu hình website, địa chỉ Shop & Goong Maps API thành công');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu cấu hình website', 'error');
    } finally {
      setSavingWebsiteSettings(false);
    }
  };

  // Tự động lưu địa chỉ Shop khi xác nhận từ modal
  const handleShopAddressConfirm = async (data) => {
    const newAddr = data?.fullAddress || '';
    if (!newAddr) return;

    setShopAddress(newAddr);
    let newCoords = shopCoordinates;
    if (data.coords && data.coords.lat && data.coords.lng) {
      newCoords = data.coords;
      setShopCoordinates(newCoords);
    }

    try {
      const updates = [systemConfigService.updateConfig('shop_address', newAddr)];
      if (newCoords && newCoords.lat && newCoords.lng) {
        updates.push(systemConfigService.updateConfig('shop_coordinates', JSON.stringify(newCoords)));
      }
      await Promise.all(updates);
      showToast('Đã tự động lưu địa chỉ cửa hàng và tọa độ GPS vào hệ thống!');
    } catch (err) {
      console.error('Lỗi khi tự động lưu địa chỉ shop:', err);
      showToast('Đã cập nhật giao diện. Vui lòng bấm "Lưu cài đặt Website" để hoàn tất.', 'info');
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
      showToast('Đồng bộ số dư thành công');
      fetchData();
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

  const renderPackagingConfigCard = (method, title, subtitle, icon, themeColor) => {
    const configData = configs[method];
    const isSaving = saving[method];

    return (
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-5 sm:p-6 flex flex-col h-full hover:border-stone-300 transition-colors">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl ${themeColor === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'bg-blue-50 text-blue-700 border border-blue-200/60'} flex items-center justify-center shrink-0 shadow-xs`}>
              <span className="material-symbols-outlined text-[24px]">{icon}</span>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-stone-900 leading-tight">{title}</h3>
              <p className="text-[12px] text-stone-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-mono">
            {configData.length} vật liệu
          </span>
        </div>

        {/* Materials List */}
        <div className="flex-1 space-y-3 mb-6">
          {configData.length === 0 ? (
            <div className="text-center py-10 px-4 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50">
              <span className="material-symbols-outlined text-stone-400 text-3xl mb-1">inventory</span>
              <p className="text-[13px] font-medium text-stone-600">Chưa cấu hình vật liệu nào</p>
              <p className="text-[11.5px] text-stone-400 mt-0.5">Bấm "Thêm vật liệu" để chọn hộp, xốp, túi đóng gói</p>
            </div>
          ) : (
            configData.map((item, idx) => (
              <div key={idx} className="flex items-end gap-3 bg-stone-50/80 p-3 rounded-xl border border-stone-200/60 hover:border-stone-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Nguyên vật liệu #{idx + 1}
                  </label>
                  <SearchableSelect
                    value={item.material_id}
                    onChange={(val) => handleChangeMaterial(method, idx, 'material_id', val)}
                    placeholder="-- Chọn nguyên vật liệu đóng gói --"
                    options={materialsList.map(m => ({ value: m._id, label: `${m.name} (${m.unit})` }))}
                  />
                </div>
                <div className="w-24 shrink-0">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 text-center">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleChangeMaterial(method, idx, 'quantity', Number(e.target.value))}
                    className="w-full border border-stone-200 rounded-lg px-2.5 py-2 text-[13px] font-bold text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white shadow-2xs"
                  />
                </div>
                <div className="shrink-0">
                  <button
                    onClick={() => handleRemoveMaterial(method, idx)}
                    className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa vật liệu này"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100 mt-auto">
          <button
            onClick={() => handleAddMaterial(method)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Thêm vật liệu</span>
          </button>
          <button
            onClick={() => handleSave(method)}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white text-[12.5px] font-bold rounded-xl shadow-xs hover:shadow-sm disabled:opacity-60 transition-all"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">save</span>
            )}
            <span>Lưu cấu hình</span>
          </button>
        </div>
      </div>
    );
  };

  const navTabs = [
    { id: 'appearance', label: 'Giao Diện', icon: 'palette', badge: 'Màu sắc thương hiệu' },
    { id: 'website', label: 'Website & Giao Hàng', icon: 'language', badge: 'Khách hàng' },
    { id: 'packaging', label: 'Đóng Gói & Kho', icon: 'inventory_2', badge: 'Tự động trừ kho' },
    { id: 'finance', label: 'Tài Sản & Chi Phí', icon: 'account_balance', badge: 'Quỹ & Hoàn' },
    { id: 'automation', label: 'Tự Động Hóa', icon: 'precision_manufacturing', badge: 'Quy trình' },
  ];

  return (
    <Layout>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold z-50 flex items-center gap-2.5 animate-[toastIn_0.3s_ease] ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Cài đặt hệ thống</h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">Cấu hình tự động hóa, phí vận chuyển và đồng bộ quỹ cửa hàng</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-600 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-xl transition-all shadow-2xs disabled:opacity-50"
              title="Tải lại toàn bộ dữ liệu"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Tab Bar Navigation (Segmented Pill Bar) */}
        <div className="mt-6 p-1.5 bg-stone-100/90 rounded-2xl border border-stone-200/70 flex flex-wrap gap-1.5 shadow-inner">
          {navTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[150px] sm:min-w-[170px] flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 select-none ${
                  isActive
                    ? 'bg-white text-primary shadow-sm border border-stone-200/80 scale-[1.01]'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-primary' : 'text-stone-400'}`}>
                  {tab.icon}
                </span>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[13px]">{tab.label}</span>
                  <span className={`text-[10px] font-normal mt-0.5 ${isActive ? 'text-primary/70 font-semibold' : 'text-stone-400'}`}>
                    {tab.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></span>
          <p className="text-xs font-semibold text-stone-500">Đang đồng bộ dữ liệu cài đặt hệ thống...</p>
        </div>
      ) : (
        <div>
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              <section className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm">
                <div className="border-b border-stone-100 bg-gradient-to-r from-primary-container/70 via-white to-tertiary-container/30 px-6 py-6 sm:px-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                        <span className="material-symbols-outlined text-[16px]">palette</span>
                        Nhận diện Candlet
                      </div>
                      <h2 className="text-xl font-bold text-stone-900 sm:text-2xl">Tông màu chủ đạo</h2>
                      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">
                        Chọn một bộ màu có sẵn và quyết định nơi áp dụng. Thay đổi sẽ hiển thị ngay trên mọi thiết bị.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyTheme}
                      disabled={savingTheme}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingTheme ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      )}
                      Áp dụng giao diện
                    </button>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="mb-6">
                    <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Phạm vi áp dụng</p>
                    <div className="inline-flex w-full flex-col gap-1 rounded-2xl border border-stone-200 bg-stone-100/80 p-1.5 sm:w-auto sm:flex-row">
                      {[
                        { id: 'admin', label: 'Chỉ Admin', icon: 'space_dashboard' },
                        { id: 'shop', label: 'Chỉ Shop', icon: 'storefront' },
                      ].map((scope) => (
                        <button
                          key={scope.id}
                          type="button"
                          onClick={() => setThemeScope(scope.id)}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                            themeScope === scope.id
                              ? 'bg-white text-primary shadow-sm ring-1 ring-stone-200'
                              : 'text-stone-500 hover:bg-white/60 hover:text-stone-800'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{scope.icon}</span>
                          {scope.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {THEME_PRESETS.map((preset) => {
                      const selected = themePreset === preset.id;
                      const activeOnAdmin = themeConfig.adminPreset === preset.id;
                      const activeOnShop = themeConfig.shopPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setThemePreset(preset.id)}
                          className={`group overflow-hidden rounded-2xl border-2 bg-white text-left transition-all hover:-translate-y-1 hover:shadow-lg ${
                            selected ? 'border-primary shadow-md ring-4 ring-primary/10' : 'border-stone-200/80'
                          }`}
                        >
                          <div className="flex h-24" style={{ backgroundColor: preset.colors.background }}>
                            <div className="w-[48%]" style={{ backgroundColor: preset.colors.primary }} />
                            <div className="w-[22%]" style={{ backgroundColor: preset.colors.accent }} />
                            <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: preset.colors.soft }}>
                              <span className="h-7 w-7 rounded-full shadow-sm ring-4 ring-white/60" style={{ backgroundColor: preset.colors.highlight }} />
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-bold text-stone-900">{preset.name}</h3>
                                <p className="mt-1 min-h-10 text-[11px] leading-relaxed text-stone-500">{preset.description}</p>
                              </div>
                              <span className={`material-symbols-outlined text-[21px] ${selected ? 'text-primary' : 'text-stone-300'}`}>
                                {selected ? 'check_circle' : 'circle'}
                              </span>
                            </div>
                            {(activeOnAdmin || activeOnShop) && (
                              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-stone-100 pt-3">
                                {activeOnAdmin && <span className="rounded-full bg-primary-container px-2 py-1 text-[10px] font-bold text-primary">Admin đang dùng</span>}
                                {activeOnShop && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Shop đang dùng</span>}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: WEBSITE & GIAO HÀNG */}
          {/* ========================================================================= */}
          {activeTab === 'website' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 sm:p-7">
                {/* Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-stone-100">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200/70 text-sky-700 text-[11px] font-bold mb-2">
                      <span className="material-symbols-outlined text-[14px]">public</span>
                      <span>Trang Khách Hàng (Storefront)</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-stone-900">Chính sách phí giao hàng Website</h2>
                    <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl leading-relaxed">
                      Thiết lập mức phí khách hàng phải trả khi mua nến thơm tại website. Thay đổi được áp dụng ngay lập tức cho giỏ hàng và thanh toán.
                    </p>
                  </div>

                  <button
                    onClick={handleSaveWebsiteSettings}
                    disabled={savingWebsiteSettings}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:shadow-md disabled:opacity-60 transition-all shrink-0 self-start sm:self-auto"
                  >
                    {savingWebsiteSettings ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">save</span>
                    )}
                    <span>Lưu cài đặt Website</span>
                  </button>
                </div>

                {/* 2 Input Cards for Standard Shipping */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                  {/* Card 1: Ngưỡng Freeship */}
                  <div className="bg-gradient-to-br from-emerald-50/70 to-green-50/40 border border-emerald-200/80 rounded-2xl p-5 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-300/60 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-[13px] font-bold text-stone-900">Ngưỡng Freeship Tiêu Chuẩn</h4>
                        <p className="text-[11px] text-stone-500">Đơn hàng từ mức này = Miễn phí giao hàng</p>
                      </div>
                    </div>
                    <div className="relative mt-2">
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={standardShippingThreshold}
                        onChange={(e) => setStandardShippingThreshold(Number(e.target.value))}
                        className="w-full border border-emerald-300 rounded-xl px-4 py-2.5 text-lg font-bold text-right focus:outline-none focus:ring-2 focus:ring-emerald-400/30 pr-9 bg-white shadow-2xs"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-700">đ</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-2 text-right font-mono font-semibold">
                      = {standardShippingThreshold.toLocaleString('vi-VN')} VNĐ
                    </p>
                  </div>

                  {/* Card 2: Phí ship thường */}
                  <div className="bg-gradient-to-br from-blue-50/70 to-sky-50/40 border border-blue-200/80 rounded-2xl p-5 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-300/60 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">moped</span>
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-[13px] font-bold text-stone-900">Phí Ship Tiêu Chuẩn</h4>
                        <p className="text-[11px] text-stone-500">Đơn hàng dưới ngưỡng Freeship</p>
                      </div>
                    </div>
                    <div className="relative mt-2">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={standardShippingFeeBelow}
                        onChange={(e) => setStandardShippingFeeBelow(Number(e.target.value))}
                        className="w-full border border-blue-300 rounded-xl px-4 py-2.5 text-lg font-bold text-right focus:outline-none focus:ring-2 focus:ring-blue-400/30 pr-9 bg-white shadow-2xs"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-blue-700">đ</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-2 text-right font-mono font-semibold">
                      = {standardShippingFeeBelow.toLocaleString('vi-VN')} VNĐ
                    </p>
                  </div>
                </div>

                {/* Bank account used to create the customer-facing VietQR code. */}
                <div className="mt-6 p-5 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
                      <i className="ph-fill ph-bank text-lg"></i>
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Tài khoản nhận chuyển khoản tự động</h3>
                      <p className="text-xs text-stone-600 mt-0.5">Thông tin này được dùng để tạo VietQR. SePay sẽ xác minh tiền vào đúng số tài khoản ở backend.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={bankTransferInfo.bankName} onChange={(e) => setBankTransferInfo({ ...bankTransferInfo, bankName: e.target.value })} placeholder="Tên ngân hàng, ví dụ MB Bank" className="w-full border border-sky-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300/40" />
                    <input value={bankTransferInfo.bankId} onChange={(e) => setBankTransferInfo({ ...bankTransferInfo, bankId: e.target.value.trim() })} placeholder="Mã BIN VietQR, ví dụ 970422" className="w-full border border-sky-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300/40" />
                    <input value={bankTransferInfo.accountNo} onChange={(e) => setBankTransferInfo({ ...bankTransferInfo, accountNo: e.target.value.replace(/\s/g, '') })} placeholder="Số tài khoản nhận tiền" className="w-full border border-sky-200 rounded-xl px-3.5 py-2.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-sky-300/40" />
                    <input value={bankTransferInfo.accountName} onChange={(e) => setBankTransferInfo({ ...bankTransferInfo, accountName: e.target.value.toUpperCase() })} placeholder="Tên chủ tài khoản" className="w-full border border-sky-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300/40" />
                  </div>
                  <p className="text-[11px] text-sky-800">Sau khi nhập, bấm “Lưu cài đặt Website”. `SEPAY_ACCOUNT_NUMBER` trên backend phải trùng số tài khoản này.</p>
                </div>

                {/* Visual Rule Preview */}
                <div className="mt-6 p-5 rounded-2xl bg-stone-50 border border-stone-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-3">
                    Xem trước luật tính phí cho khách hàng
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-stone-200/70">
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <i className="ph-bold ph-check text-sm"></i>
                      </span>
                      <span className="text-stone-700">
                        Đơn từ <strong className="text-stone-900">{standardShippingThreshold.toLocaleString('vi-VN')}đ</strong>: <strong className="text-emerald-600">Freeship (0đ)</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-stone-200/70">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <i className="ph-bold ph-tag text-sm"></i>
                      </span>
                      <span className="text-stone-700">
                        Đơn dưới ngưỡng: <strong className="text-blue-700">{standardShippingFeeBelow.toLocaleString('vi-VN')}đ</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-stone-200/70">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <i className="ph-bold ph-lightning text-sm"></i>
                      </span>
                      <span className="text-stone-700">
                        Hỏa tốc $\le$ 2km: <strong className="text-amber-700">{expressBaseFee.toLocaleString('vi-VN')}đ</strong> (sau đó +{expressPerKmFee.toLocaleString('vi-VN')}đ/km, tối đa {expressMaxDistance}km)
                      </span>
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* SECTION MỚI: ĐỊA CHỈ SHOP & CẤU HÌNH BÁN KÍNH HỎA TỐC                      */}
                {/* ========================================================================= */}
                <div className="mt-8 pt-6 border-t border-stone-100 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-700 border border-rose-200 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">store</span>
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-stone-900">
                          Địa chỉ Cửa hàng / Kho xuất phát (Mốc tính khoảng cách Hỏa Tốc)
                        </h3>
                        <p className="text-xs text-stone-500">
                          Địa chỉ này dùng làm điểm gốc (mốc 0km) để tính toán số km thực tế đến nhà khách hàng
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGeocodeShop()}
                      disabled={geocodingShop}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-secondary bg-[#FAF5EE] hover:bg-[#F3E8DB] border border-primary-fixed transition-colors shadow-2xs self-start sm:self-auto"
                    >
                      <span className={`material-symbols-outlined text-[16px] ${geocodingShop ? 'animate-spin' : ''}`}>
                        {geocodingShop ? 'progress_activity' : 'my_location'}
                      </span>
                      <span>{geocodingShop ? 'Đang định vị...' : 'Xác thực tọa độ GPS'}</span>
                    </button>
                  </div>

                  {/* Bộ chọn địa chỉ Shop */}
                  <div className="bg-stone-50/70 p-4 sm:p-5 rounded-2xl border border-stone-200/80 space-y-4">
                    <AddressSelector
                      initialAddress={shopAddress}
                      onChange={(data) => {
                        if (data.fullAddress && data.fullAddress !== shopAddress) {
                          setShopAddress(data.fullAddress);
                        }
                        if (data.coords && data.coords.lat && data.coords.lng) {
                          setShopCoordinates(data.coords);
                        }
                      }}
                      onConfirm={handleShopAddressConfirm}
                      required={false}
                    />

                    {/* Hiển thị Tọa độ GPS của Shop */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-600">Tọa độ GPS hiện tại:</span>
                        {shopCoordinates.lat && shopCoordinates.lng ? (
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            Lat: {Number(shopCoordinates.lat).toFixed(4)}, Lng: {Number(shopCoordinates.lng).toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            Chưa xác định tọa độ GPS (Nhấn "Xác thực tọa độ GPS")
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-stone-400">
                        Địa chỉ đầy đủ: <strong className="text-stone-700">{shopAddress || 'Chưa nhập'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* 3 Trường cấu hình quy tắc cước Hỏa Tốc */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {/* Bán kính tối đa */}
                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                      <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Bán kính hỏa tốc tối đa
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={expressMaxDistance}
                          onChange={(e) => setExpressMaxDistance(Number(e.target.value))}
                          className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-sm font-bold text-stone-900 pr-10 focus:outline-none focus:border-stone-800"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">km</span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1">Khách ngoài phạm vi này sẽ không thể chọn Hỏa tốc</p>
                    </div>

                    {/* Phí 2km đầu */}
                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                      <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Phí 2km đầu tiên
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={expressBaseFee}
                          onChange={(e) => setExpressBaseFee(Number(e.target.value))}
                          className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-sm font-bold text-stone-900 pr-8 focus:outline-none focus:border-stone-800"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">đ</span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1">Cước cố định áp dụng cho đơn $\le$ 2km</p>
                    </div>

                    {/* Phí mỗi km tiếp theo */}
                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                      <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Phí mỗi km tiếp theo
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={expressPerKmFee}
                          onChange={(e) => setExpressPerKmFee(Number(e.target.value))}
                          className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-sm font-bold text-stone-900 pr-12 focus:outline-none focus:border-stone-800"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">đ/km</span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1">Cộng thêm cho mỗi km sau mốc 2km</p>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CẤU HÌNH GOONG MAPS API KEY                                              */}
                  {/* ========================================================================= */}
                  <div className="mt-8 pt-6 border-t border-stone-200/80">
                    <div className="bg-gradient-to-br from-amber-50/70 via-white to-stone-50 rounded-2xl p-5 sm:p-6 border border-amber-200/90 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-secondary text-white flex items-center justify-center shrink-0 shadow-xs">
                            <i className="ph-fill ph-navigation-arrow text-xl"></i>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm sm:text-base font-bold text-stone-900">
                                Goong Maps API (Gợi ý địa chỉ chính xác)
                              </h4>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                Khuyến nghị
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                              Goong Maps cung cấp gợi ý địa chỉ chính xác nhất tại Việt Nam (số nhà, tên đường, ngõ/hẻm) — tương tự các app giao hàng. Miễn phí 30.000 req/tháng, không cần thẻ tín dụng.
                            </p>
                          </div>
                        </div>

                        <a
                          href="https://account.goong.io/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-secondary bg-white hover:bg-amber-50 border border-amber-300 transition-colors shrink-0 shadow-2xs self-start sm:self-auto"
                        >
                          <i className="ph-bold ph-arrow-square-out text-sm"></i>
                          <span>Đăng ký miễn phí tại goong.io</span>
                        </a>
                      </div>

                      {/* Ô nhập Key & Nút kiểm tra */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                          Goong Maps REST API Key
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <div className="relative flex-1">
                            <input
                              type={showGoongKey ? 'text' : 'password'}
                              value={goongApiKey}
                              onChange={(e) => {
                                setGoongApiKey(e.target.value);
                                setGoongKeyStatus(null);
                              }}
                              placeholder="Nhập API Key từ Goong Console (VD: 8hAkq9...)"
                              className="w-full border border-stone-300 rounded-xl px-4 py-2.5 pl-10 pr-10 text-xs sm:text-sm font-mono text-stone-900 bg-white focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary shadow-2xs placeholder:text-stone-400"
                            />
                            <i className="ph-bold ph-key absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm"></i>
                            <button
                              type="button"
                              onClick={() => setShowGoongKey(!showGoongKey)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs cursor-pointer"
                              title={showGoongKey ? 'Ẩn key' : 'Hiện key'}
                            >
                              <i className={`ph-bold ${showGoongKey ? 'ph-eye-slash' : 'ph-eye'} text-sm`}></i>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleTestGoongKey}
                            disabled={testingGoongKey || !goongApiKey.trim()}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            <i className={`ph-bold ${testingGoongKey ? 'ph-spinner animate-spin' : 'ph-plugs-connected'} text-sm`}></i>
                            <span>{testingGoongKey ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
                          </button>
                        </div>

                        {/* Trạng thái kiểm tra key */}
                        {goongKeyStatus && (
                          <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 animate-[fadeIn_0.15s_ease-out] ${goongKeyStatus.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                            <i className={`ph-bold ${goongKeyStatus.success ? 'ph-check-circle text-emerald-600' : 'ph-warning-circle text-rose-600'} text-base shrink-0`}></i>
                            <span className="font-medium">{goongKeyStatus.message}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-start gap-2 pt-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                            <i className="ph-fill ph-shield-check text-emerald-600"></i>
                            <span>Goong Maps miễn phí <strong>30.000 req/tháng</strong>.</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                            <i className="ph-fill ph-arrows-clockwise text-blue-500"></i>
                            <span>Chưa có key? Hệ thống tự động dùng <strong>OpenStreetMap</strong> (Photon + Nominatim) miễn phí làm thay thế.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ĐÓNG GÓI & KHO */}
          {/* ========================================================================= */}
          {activeTab === 'packaging' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-stone-900">Nguyên vật liệu đóng gói tự động</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Hệ thống sẽ tự động trừ kho các loại hộp giấy, túi nến, xốp nổ khi đơn hàng được tạo theo từng phương thức.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold text-stone-600 bg-white px-3 py-1.5 rounded-xl border border-stone-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Kho nguyên liệu: {materialsList.length} món</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderPackagingConfigCard(
                  'standard',
                  'Vận chuyển Tiêu Chuẩn',
                  'Hộp carton thường, băng dính, xốp bóng khí',
                  'inventory_2',
                  'blue'
                )}

                {renderPackagingConfigCard(
                  'express',
                  'Vận chuyển Hỏa Tốc',
                  'Hộp quà cao cấp, túi giấy vintage, diêm tặng',
                  'bolt',
                  'amber'
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TÀI SẢN & CHI PHÍ */}
          {/* ========================================================================= */}
          {activeTab === 'finance' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              {/* Sub-Tabs: Tài sản & Đồng bộ vs Chi phí hoàn */}
              <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                <button
                  onClick={() => setFinanceSubTab('funds')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                    financeSubTab === 'funds'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  <span>Đồng bộ số dư & Quỹ quảng cáo</span>
                </button>
                <button
                  onClick={() => setFinanceSubTab('returns')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                    financeSubTab === 'returns'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                  <span>Chi phí hoàn hàng theo sàn</span>
                </button>
              </div>

              {/* Sub-tab 1: Đồng bộ tài sản */}
              {financeSubTab === 'funds' && (
                <div className="space-y-6">
                  {fundSummary ? (
                    <>
                      {/* Total Fund Master Card */}
                      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/70 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs">
                              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-stone-900">Tổng tài sản chung hệ thống</h3>
                              <p className="text-xs text-stone-500 mt-0.5">
                                Số dư ghi nhận hiện tại: <strong className="text-emerald-700 font-mono text-sm">{(fundSummary.totalFundBalance || 0).toLocaleString('vi-VN')} VNĐ</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-56">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                placeholder="Nhập số tiền thực tế..."
                                value={syncValues['total_fund'] ?? ''}
                                onChange={(e) => setSyncValues(prev => ({ ...prev, total_fund: e.target.value }))}
                                className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-sm font-bold text-right focus:outline-none focus:border-primary pr-8 bg-stone-50 focus:bg-white transition-colors"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">đ</span>
                            </div>
                            <button
                              onClick={() => handleSyncFund('total_fund')}
                              disabled={syncingTarget === 'total_fund'}
                              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
                            >
                              {syncingTarget === 'total_fund' ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <span className="material-symbols-outlined text-[18px]">sync</span>
                              )}
                              <span>Đồng bộ ngay</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Platforms Grid */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          <span>Chi tiết quỹ các kênh bán & tài khoản quảng cáo</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {fundSummary.platformBalances.map(p => {
                            const adP = adBalances.find(a => a.platform === p.platform);
                            return (
                              <div key={p.platform} className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-5 flex flex-col justify-between hover:border-stone-300 transition-colors">
                                {/* Header platform */}
                                <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                                  <div className="flex items-center gap-2">
                                    {p.platform !== 'khác' && (
                                      <span
                                        className="w-4 h-4 bg-current inline-block opacity-80"
                                        style={{
                                          maskImage: `url(https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${p.platform}.svg)`,
                                          maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center',
                                          WebkitMaskImage: `url(https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${p.platform}.svg)`,
                                          WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center'
                                        }}
                                      />
                                    )}
                                    <span className="text-sm font-bold text-stone-900 uppercase">{p.platform}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">Kênh bán</span>
                                </div>

                                {/* Quỹ khả dụng */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-stone-600">Quỹ khả dụng</span>
                                    <span className="font-bold text-emerald-600 font-mono">{p.availableBalance.toLocaleString('vi-VN')}đ</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                      <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={syncValues[p.platform] ?? ''}
                                        onChange={(e) => setSyncValues(prev => ({ ...prev, [p.platform]: e.target.value }))}
                                        className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-right focus:outline-none focus:border-primary pr-6 bg-stone-50"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400">đ</span>
                                    </div>
                                    <button
                                      onClick={() => handleSyncFund(p.platform)}
                                      disabled={syncingTarget === p.platform}
                                      className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                                    >
                                      {syncingTarget === p.platform ? <span className="w-3 h-3 border-2 border-stone-400 border-t-stone-700 rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[14px]">sync</span>}
                                      <span>Lưu</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Quỹ quảng cáo nếu có */}
                                {adP && (
                                  <div className="pt-3 mt-3 border-t border-stone-100 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-medium text-pink-700">Quỹ Ads</span>
                                      <span className="font-bold text-pink-700 font-mono">{adP.balance.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="relative flex-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1000"
                                          value={adSyncValues[p.platform] ?? ''}
                                          onChange={(e) => setAdSyncValues(prev => ({ ...prev, [p.platform]: e.target.value }))}
                                          className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-right focus:outline-none focus:border-pink-500 pr-6 bg-stone-50"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400">đ</span>
                                      </div>
                                      <button
                                        onClick={() => handleSyncAd(p.platform)}
                                        disabled={syncingAdTarget === p.platform}
                                        className="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                                      >
                                        {syncingAdTarget === p.platform ? <span className="w-3 h-3 border-2 border-pink-400 border-t-pink-700 rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[14px]">sync</span>}
                                        <span>Lưu</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-sm text-stone-500">Đang tải thông tin quỹ...</div>
                  )}
                </div>
              )}

              {/* Sub-tab 2: Chi phí hoàn hàng */}
              {financeSubTab === 'returns' && (
                <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-stone-900">Chi phí hoàn theo nguồn đơn hàng</h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Mức phí cố định tính thêm vào chi phí khi đơn hàng phát sinh trạng thái Hoàn trả theo từng nền tảng.
                      </p>
                    </div>

                    <button
                      onClick={handleSaveReturnCost}
                      disabled={savingReturnCost}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-60 transition-all shrink-0 self-start sm:self-auto"
                    >
                      {savingReturnCost ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">save</span>
                      )}
                      <span>Lưu chi phí hoàn</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {defaultPlatforms.map(platform => (
                      <div key={platform} className="p-4 rounded-xl border border-stone-200/70 bg-stone-50/50 hover:bg-white hover:border-stone-300 transition-all">
                        <label className="text-xs font-bold text-stone-800 uppercase flex items-center gap-2 mb-2">
                          {platform !== 'khác' && (
                            <span
                              className="w-4 h-4 bg-current inline-block opacity-80"
                              style={{
                                maskImage: `url(https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${platform}.svg)`,
                                maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center',
                                WebkitMaskImage: `url(https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${platform}.svg)`,
                                WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center'
                              }}
                            />
                          )}
                          <span>{platform}</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={returnCosts[platform]}
                            onChange={(e) => setReturnCosts(prev => ({ ...prev, [platform]: Number(e.target.value) }))}
                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-bold text-right focus:outline-none focus:border-red-500 pr-8 bg-white"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">đ</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: TỰ ĐỘNG HÓA */}
          {/* ========================================================================= */}
          {activeTab === 'automation' && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200/70 flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-2xl">precision_manufacturing</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-stone-900">Tự động duyệt phiếu nhập kho</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${autoConfirmImport ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                          {autoConfirmImport ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl leading-relaxed">
                        Hệ thống sẽ tự động chuyển trạng thái phiếu nhập thành "Hoàn thành" và cộng dồn số lượng vào kho ngay khi trong phiếu có bất kỳ nguyên vật liệu nào đang bị hết hàng (tồn kho = 0).
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="self-end sm:self-auto shrink-0">
                    <button
                      disabled={savingAutoConfirm}
                      onClick={handleToggleAutoConfirm}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoConfirmImport ? 'bg-primary' : 'bg-stone-300'} ${savingAutoConfirm ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${autoConfirmImport ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Automation Flow Visual */}
                <div className="mt-8 pt-6 border-t border-stone-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-3">
                    Luồng kích hoạt tự động (Workflow)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-700 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                      <span className="text-stone-700">Tạo phiếu nhập có nguyên liệu tồn = 0</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                      <span className="text-stone-700">Hệ thống kích hoạt duyệt tự động</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                      <span className="text-stone-700">Cập nhật số tồn kho tức thì</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
