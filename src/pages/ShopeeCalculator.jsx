import { useState, useMemo, useEffect } from 'react';
import Layout from '../components/Layout';
import { formatPrice } from '../utils/formatPrice';
import { productService } from '../services/productService';

// ── Cấu hình phí Shopee mặc định ──────────────────────────────────
const DEFAULT_CONFIG = {
  paymentFee: 4.91,      // % Phí thanh toán
  fixedFee: 16,          // % Phí cố định
  voucherXtra: 5.5,      // % Gói voucher XTRA
  freeship: 0,           // % Freeship XTRA Plus
  internalFee: 3000,     // đ Phí nội bộ
  tax: 1.5,              // % Thuế
  usePiShip: false,      // Toggle Phí PiShip
  piShipFee: 2300,       // đ Phí PiShip
};

const PRESET_LABEL = 'Cập nhật: 2026';

// ── UI helpers ─────────────────────────────────────────────────
const InputField = ({ label, value, onChange, suffix = 'đ', type = 'number', placeholder = '0', disabled = false, action = null }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="block text-[12px] font-bold text-on-surface-variant">{label}</label>
      {action}
    </div>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border border-outline-variant rounded-lg px-3 py-2.5 pr-8 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface ${disabled ? 'bg-surface-container-low text-on-surface-variant cursor-not-allowed' : ''}`}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-on-surface-variant font-semibold">{suffix}</span>
    </div>
  </div>
);

export default function ShopeeCalculator() {
  // ── Danh sách sản phẩm từ hệ thống ──
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSkuId, setSelectedSkuId] = useState('');

  // ── Thông tin nhập liệu ──
  const [costPrice, setCostPrice] = useState('');
  const [listedPrice, setListedPrice] = useState('');
  const [flashSale, setFlashSale] = useState('');
  const [voucherPct, setVoucherPct] = useState('');
  const [voucherAmt, setVoucherAmt] = useState('');
  const [roas, setRoas] = useState('10');

  // ── Cấu hình phí (có thể tuỳ chỉnh) ──
  const [cfg, setCfg] = useState({ ...DEFAULT_CONFIG });
  const [showConfigEdit, setShowConfigEdit] = useState(false);
  const [modalData, setModalData] = useState(null); // { message: string, type: 'success' | 'error' }

  // Fetch danh sách sản phẩm
  useEffect(() => {
    productService.getProducts()
      .then(res => setProducts(res.data.data || []))
      .catch(() => { });
  }, []);

  // Sản phẩm đang chọn
  const selectedProduct = products.find(p => p._id === selectedProductId) || null;

  // Danh sách SKU của sản phẩm đang chọn
  const skuOptions = selectedProduct?.skus || [];

  // Khi chọn sản phẩm → reset sku, fill cost theo base_cost nếu chỉ có 1 sku hoặc không có sku
  const handleSelectProduct = (productId) => {
    setSelectedProductId(productId);
    setSelectedSkuId('');
    const prod = products.find(p => p._id === productId);
    if (!prod) { setCostPrice(''); return; }
    if (!prod.skus || prod.skus.length === 0) {
      setCostPrice(String(Math.round(prod.base_cost || 0)));
      setListedPrice(String(prod.base_price || ''));
    } else if (prod.skus.length === 1) {
      setSelectedSkuId(prod.skus[0].id);
      setCostPrice(String(Math.round(prod.skus[0].cost || 0)));
      setListedPrice(String(prod.skus[0].price || ''));
    } else {
      // Nhiều SKU → để người dùng chọn
      setCostPrice('');
    }
  };

  // Khi chọn SKU → fill cost và price
  const handleSelectSku = (skuId) => {
    setSelectedSkuId(skuId);
    const sku = skuOptions.find(s => s.id === skuId);
    if (sku) {
      setCostPrice(String(Math.round(sku.cost || 0)));
      setListedPrice(String(sku.price || ''));
    }
  };

  // ── Tính năng lưu giá bán ──
  const isPriceModified = useMemo(() => {
    if (!selectedProduct) return false;
    const currentPrice = Number(listedPrice) || 0;
    if (selectedSkuId) {
      const sku = selectedProduct.skus.find(s => s.id === selectedSkuId);
      return sku ? currentPrice !== (sku.price || 0) : false;
    } else {
      return currentPrice !== (selectedProduct.base_price || 0);
    }
  }, [selectedProduct, selectedSkuId, listedPrice]);

  const [isSavingPrice, setIsSavingPrice] = useState(false);

  const handleSavePrice = async () => {
    if (!selectedProduct) return;
    setIsSavingPrice(true);
    const currentPrice = Number(listedPrice) || 0;
    try {
      // Làm sạch dữ liệu: loại bỏ các trường ảo (base_cost, sku.cost) và các trường hệ thống
      const { _id, createdAt, updatedAt, base_cost, __v, ...dataToUpdate } = selectedProduct;

      if (dataToUpdate.base_ingredients) {
        dataToUpdate.base_ingredients = dataToUpdate.base_ingredients
          .filter(item => item.ingredient_id)
          .map(item => ({
            ...item,
            ingredient_id: item.ingredient_id._id || item.ingredient_id
          }));
      }

      if (dataToUpdate.skus) {
        dataToUpdate.skus = dataToUpdate.skus.map(sku => {
          const { cost, ...restSku } = sku;
          return {
            ...restSku,
            extra_ingredients: restSku.extra_ingredients ? restSku.extra_ingredients
              .filter(item => item.ingredient_id)
              .map(item => ({
                ...item,
                ingredient_id: item.ingredient_id._id || item.ingredient_id
              })) : []
          };
        });
      }

      if (selectedSkuId) {
        const skuIndex = dataToUpdate.skus.findIndex(s => s.id === selectedSkuId);
        if (skuIndex !== -1) {
          dataToUpdate.skus[skuIndex].price = currentPrice;
        }
      } else {
        dataToUpdate.base_price = currentPrice;
      }

      const res = await productService.updateProduct(selectedProduct._id, dataToUpdate);
      if (res.data.success) {
        // Cập nhật lại state của sản phẩm trong hệ thống (fetch lại)
        const updatedProductsRes = await productService.getProducts();
        setProducts(updatedProductsRes.data.data || []);
        setModalData({ message: 'Cập nhật giá thành công!', type: 'success' });
      }
    } catch (error) {
      console.error(error);
      setModalData({ message: 'Đã xảy ra lỗi khi cập nhật giá', type: 'error' });
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleReset = () => {
    setCostPrice(''); setListedPrice(''); setFlashSale('');
    setVoucherPct(''); setVoucherAmt(''); setRoas('10');
    setSelectedProductId(''); setSelectedSkuId('');
    setCfg({ ...DEFAULT_CONFIG });
  };

  // ── Tính toán ──────────────────────────────────────────────────
  const result = useMemo(() => {
    const cost = Number(costPrice) || 0;
    const listed = Number(listedPrice) || 0;
    const flash = Number(flashSale) || 0;
    const vPct = Number(voucherPct) || 0;
    const vAmt = Number(voucherAmt) || 0;
    const roasVal = Number(roas) || 0;

    // Giá thực tế (sau flash sale nếu có)
    const salePrice = flash > 0 ? flash : listed;

    if (salePrice === 0 && cost === 0) {
      return {
        salePrice: 0, profitMin: 0, profitWithAds: 0, totalPlatformFee: 0, adsFee: 0, margin: 0,
        breakdown: { payFee: 0, fixFee: 0, xtraFee: 0, freeFee: 0, taxFee: 0, internalFee: 0, vShopFee: 0, vShopAmt: 0, adsFee: 0 }
      };
    }

    // Phí thanh toán
    const payFee = salePrice * (cfg.paymentFee / 100);
    // Phí cố định
    const fixFee = salePrice * (cfg.fixedFee / 100);
    // Gói voucher XTRA
    const xtraFee = salePrice * (cfg.voucherXtra / 100);
    // Freeship
    const freeFee = salePrice * (cfg.freeship / 100);
    // Thuế
    const taxFee = salePrice * (cfg.tax / 100);
    // Phí nội bộ
    const internalFee = cfg.internalFee;
    // Phí PiShip
    const piShipFee = cfg.usePiShip ? cfg.piShipFee : 0;
    // Voucher % shop
    const vShopFee = salePrice * (vPct / 100);
    // Voucher số tiền shop
    const vShopAmt = vAmt;

    // Phí ADS ước tính (salePrice / ROAS nếu ROAS > 0)
    const adsFee = roasVal > 0 ? salePrice / roasVal : 0;

    // Tổng phí sàn (không tính ADS và voucher shop)
    const totalPlatformFee = payFee + fixFee + xtraFee + freeFee + taxFee + internalFee + piShipFee + vShopFee + vShopAmt;

    // Lợi nhuận MIN (không có ADS)
    const profitMin = salePrice - cost - totalPlatformFee;

    // Lợi nhuận khi tính ADS
    const profitWithAds = profitMin - adsFee;

    // Tỷ suất lợi nhuận
    const margin = salePrice > 0 ? (profitMin / salePrice) * 100 : 0;

    return {
      salePrice,
      profitMin,
      profitWithAds,
      totalPlatformFee,
      adsFee,
      margin,
      breakdown: {
        payFee, fixFee, xtraFee, freeFee, taxFee,
        internalFee, piShipFee, vShopFee, vShopAmt, adsFee,
      },
    };
  }, [costPrice, listedPrice, flashSale, voucherPct, voucherAmt, roas, cfg]);

  const profitColor = result.profitMin >= 0 ? 'text-[#059669]' : 'text-error';
  const marginColor = result.margin >= 0 ? 'text-[#059669]' : 'text-error';

  // ── Render ─────────────────────────────────────────────────
  return (
    <Layout>
      {modalData && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-[360px] w-full p-6 text-center animate-[toastIn_0.3s_ease]">
            <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${modalData.type === 'success' ? 'bg-[#d1fae5] text-[#059669]' : 'bg-error-container text-error'}`}>
              <span className="material-symbols-outlined text-[28px]">
                {modalData.type === 'success' ? 'check_circle' : 'error'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Thông báo</h3>
            <p className="text-[14px] text-on-surface-variant mb-6">{modalData.message}</p>
            <button
              onClick={() => setModalData(null)}
              className="w-full py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-[22px] font-bold text-on-surface flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <rect width="100" height="100" rx="18" fill="#EE4D2D" />
                  <path d="M50 18C43.4 18 38 23.4 38 30H28C26.3 30 25 31.3 25 33L22 72C22 73.7 23.3 75 25 75H75C76.7 75 78 73.7 78 72L75 33C75 31.3 73.7 30 72 30H62C62 23.4 56.6 18 50 18ZM50 24C53.3 24 56 26.7 56 30H44C44 26.7 46.7 24 50 24ZM50 52C46.7 52 44 49.3 44 46C44 42.7 46.7 40 50 40C53.3 40 56 42.7 56 46C56 49.3 53.3 52 50 52Z" fill="white" />
                </svg>
              </span>
              Công cụ tính lợi nhuận Shopee
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-1">Phân tích biên lợi nhuận chính xác dựa trên cấu hình phí sàn cập nhật mới nhất.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant text-on-surface-variant text-[13px] font-semibold rounded-lg hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Làm mới
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* ── Cột trái: nhập liệu + cấu hình ── */}
          <div className="col-span-2 space-y-5">
            {/* Chọn sản phẩm từ hệ thống */}
            <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-outline-variant/20 bg-surface-container-low/50 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">inventory_2</span>
                <h3 className="font-bold text-[14px] text-on-surface">Chọn sản phẩm từ hệ thống</h3>
                <span className="ml-auto text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">Tự động điền giá vốn</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {/* Dropdown chọn sản phẩm */}
                <div className={skuOptions.length > 1 ? '' : 'col-span-2'}>
                  <label className="block text-[12px] font-bold text-on-surface-variant mb-1.5">Sản phẩm</label>
                  <div className="relative">
                    <select
                      value={selectedProductId}
                      onChange={e => handleSelectProduct(e.target.value)}
                      className="w-full border border-outline-variant rounded-lg px-3 py-2.5 pr-8 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface bg-white appearance-none"
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {products.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </span>
                  </div>
                </div>

                {/* Dropdown chọn SKU (chỉ hiện khi sản phẩm có nhiều biến thể) */}
                {skuOptions.length > 1 && (
                  <div>
                    <label className="block text-[12px] font-bold text-on-surface-variant mb-1.5">Phân loại</label>
                    <div className="relative">
                      <select
                        value={selectedSkuId}
                        onChange={e => handleSelectSku(e.target.value)}
                        className="w-full border border-outline-variant rounded-lg px-3 py-2.5 pr-8 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface bg-white appearance-none"
                      >
                        <option value="">-- Chọn phân loại --</option>
                        {skuOptions.map(sku => (
                          <option key={sku.id} value={sku.id}>
                            {sku.combination?.join(' / ') || sku.id} — {formatPrice(sku.cost)}
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </div>
                  </div>
                )}

                {/* Thông tin nhanh sau khi chọn */}
                {selectedProduct && (
                  <div className="col-span-2 flex items-center gap-3 bg-primary-container/30 border border-primary-fixed rounded-lg px-4 py-2.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                    <div className="flex items-center gap-4 text-[12px]">
                      <span className="font-semibold text-on-surface">{selectedProduct.name}</span>
                      <span className="text-on-surface-variant">Giá vốn cơ bản: <strong className="text-primary">{formatPrice(selectedProduct.base_cost)}</strong></span>
                      {selectedSkuId && skuOptions.find(s => s.id === selectedSkuId) && (
                        <span className="text-on-surface-variant">Phân loại: <strong className="text-primary">{formatPrice(skuOptions.find(s => s.id === selectedSkuId)?.cost)}</strong></span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Thông tin nhập liệu */}
            <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-outline-variant/20 bg-surface-container-low/50 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">edit_note</span>
                <h3 className="font-bold text-[14px] text-on-surface">Thông tin nhập liệu</h3>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <InputField label="Giá vốn (Cost)" value={costPrice} onChange={setCostPrice} disabled={!!selectedProduct} />
                <InputField
                  label="Giá niêm yết"
                  value={listedPrice}
                  onChange={setListedPrice}
                  action={
                    isPriceModified && (
                      <button
                        onClick={handleSavePrice}
                        disabled={isSavingPrice}
                        className="text-[10px] bg-primary text-white px-2 py-0.5 rounded flex items-center gap-1 hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isSavingPrice ? 'Đang lưu...' : 'Lưu giá'}
                      </button>
                    )
                  }
                />
                <InputField label="Giá Flash Sale" value={flashSale} onChange={setFlashSale} placeholder="Bỏ trống nếu không có" />
                <InputField label="% Voucher Shop" value={voucherPct} onChange={setVoucherPct} suffix="%" placeholder="0" />
                <InputField label="Voucher Shop (Số tiền)" value={voucherAmt} onChange={setVoucherAmt} />
                <InputField label="ADS (ROAS dự kiến)" value={roas} onChange={setRoas} suffix="x" placeholder="10" />
              </div>
            </div>


            {/* Cấu hình phí */}
            <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-outline-variant/20 bg-surface-container-low/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
                  <h3 className="font-bold text-[14px] text-on-surface">Cấu hình phí</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-white bg-[#EE4D2D] px-2 py-0.5 rounded-full">{PRESET_LABEL}</span>
                  <button
                    onClick={() => setShowConfigEdit(v => !v)}
                    className="text-[12px] text-primary font-semibold hover:underline"
                  >
                    {showConfigEdit ? 'Thu gọn' : 'Tuỳ chỉnh'}
                  </button>
                </div>
              </div>

              {!showConfigEdit ? (
                <div className="p-5 grid grid-cols-3 gap-3">
                  {[
                    { label: 'PHÍ THANH TOÁN', value: `${cfg.paymentFee}%` },
                    { label: 'PHÍ CỐ ĐỊNH', value: `${cfg.fixedFee}%` },
                    { label: 'GÓI VOUCHER XTRA', value: `${cfg.voucherXtra}%` },
                    { label: 'FREESHIP XTRA PLUS', value: `${cfg.freeship}%` },
                    { label: 'PHÍ NỘI BỘ', value: `${Math.round(cfg.internalFee).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ` },
                    { label: 'THUẾ', value: `${cfg.tax}%` },
                  ].map(item => (
                    <div key={item.label} className="bg-surface-container-low/60 rounded-lg px-4 py-3 border border-outline-variant/20">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="text-[15px] font-bold text-on-surface">{item.value}</p>
                    </div>
                  ))}

                  {/* PiShip Toggle Card */}
                  <label className="col-span-3 bg-surface-container-low/60 rounded-lg px-4 py-3 border border-outline-variant/20 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors group">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 group-hover:text-primary transition-colors">PHÍ PISHIP</p>
                      <p className={`text-[15px] font-bold ${cfg.usePiShip ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {cfg.usePiShip ? `${Math.round(cfg.piShipFee).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ` : 'Không dùng'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={cfg.usePiShip}
                      onChange={e => setCfg(c => ({ ...c, usePiShip: e.target.checked }))}
                      className="w-5 h-5 text-primary rounded border-outline-variant focus:ring-primary cursor-pointer shadow-sm"
                    />
                  </label>
                </div>
              ) : (
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {[
                      { key: 'paymentFee', label: 'Phí thanh toán (%)', suffix: '%' },
                      { key: 'fixedFee', label: 'Phí cố định (%)', suffix: '%' },
                      { key: 'voucherXtra', label: 'Gói voucher XTRA (%)', suffix: '%' },
                      { key: 'freeship', label: 'Freeship XTRA Plus (%)', suffix: '%' },
                      { key: 'internalFee', label: 'Phí nội bộ (đ)', suffix: 'đ' },
                      { key: 'tax', label: 'Thuế (%)', suffix: '%' },
                    ].map(item => (
                      <div key={item.key}>
                        <label className="block text-[11px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wide">{item.label}</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={cfg[item.key]}
                            onChange={e => setCfg(c => ({ ...c, [item.key]: Number(e.target.value) }))}
                            className="w-full border border-outline-variant rounded-lg px-3 py-2 pr-7 text-[13px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-on-surface-variant font-semibold">{item.suffix}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between bg-surface-container-low/50 px-4 py-3 rounded-lg border border-outline-variant/30 mb-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="usePiShip"
                        checked={cfg.usePiShip}
                        onChange={e => setCfg(c => ({ ...c, usePiShip: e.target.checked }))}
                        className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="usePiShip" className="text-[13px] font-bold text-on-surface cursor-pointer select-none">Áp dụng phí PiShip</label>
                    </div>
                    <div className="relative w-[130px]">
                      <input
                        type="number"
                        value={cfg.piShipFee}
                        onChange={e => setCfg(c => ({ ...c, piShipFee: Number(e.target.value) }))}
                        disabled={!cfg.usePiShip}
                        className={`w-full border border-outline-variant rounded-lg px-3 py-1.5 pr-7 text-[13px] focus:outline-none focus:border-primary ${!cfg.usePiShip ? 'opacity-50 bg-surface-container-highest cursor-not-allowed' : 'bg-white focus:ring-1 focus:ring-primary'}`}
                      />
                      <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold ${!cfg.usePiShip ? 'text-on-surface-variant/50' : 'text-on-surface-variant'}`}>đ</span>
                    </div>
                  </div>

                  <div className="col-span-3">
                    <button onClick={() => setCfg({ ...DEFAULT_CONFIG })} className="text-[12px] text-on-surface-variant hover:text-primary hover:underline">
                      Đặt lại về mặc định
                    </button>
                  </div>
                </div>
              )}

              <div className="px-5 py-3 bg-surface-container-low/30 border-t border-outline-variant/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-on-surface-variant">info</span>
                <p className="text-[12px] text-on-surface-variant">
                  Tỷ lệ phí được đồng bộ tự động từ dữ liệu hệ thống. Bạn có thể tuỳ chỉnh trong phần Cài đặt.
                </p>
              </div>
            </div>

            {/* Bảng chi tiết chi phí */}
            {result.salePrice > 0 && (
              <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-outline-variant/20 bg-surface-container-low/50 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">receipt_long</span>
                  <h3 className="font-bold text-[14px] text-on-surface">Chi tiết chi phí</h3>
                </div>
                <div className="divide-y divide-outline-variant/20">
                  {[
                    { label: 'Giá bán thực tế', value: result.salePrice, highlight: true },
                    { label: 'Giá vốn', value: -Number(costPrice || 0), isNeg: true },
                    { label: `Phí thanh toán (${cfg.paymentFee}%)`, value: -result.breakdown.payFee },
                    { label: `Phí cố định (${cfg.fixedFee}%)`, value: -result.breakdown.fixFee },
                    { label: `Gói Voucher XTRA (${cfg.voucherXtra}%)`, value: -result.breakdown.xtraFee },
                    { label: `Freeship XTRA Plus (${cfg.freeship}%)`, value: -result.breakdown.freeFee },
                    { label: 'Phí nội bộ', value: -result.breakdown.internalFee },
                    ...(cfg.usePiShip ? [{ label: 'Phí PiShip', value: -result.breakdown.piShipFee }] : []),
                    { label: `Thuế (${cfg.tax}%)`, value: -result.breakdown.taxFee },
                    ...(Number(voucherPct) > 0 ? [{ label: `Voucher Shop (${voucherPct}%)`, value: -result.breakdown.vShopFee }] : []),
                    ...(Number(voucherAmt) > 0 ? [{ label: 'Voucher Shop (số tiền)', value: -result.breakdown.vShopAmt }] : []),
                    ...(Number(roas) > 0 ? [{ label: `ADS (ROAS ${roas}x)`, value: -result.breakdown.adsFee }] : []),
                  ].map((row, i) => (
                    <div key={i} className={`flex justify-between items-center px-5 py-2.5 ${row.highlight ? 'bg-primary-container/10' : ''}`}>
                      <span className={`text-[13px] ${row.highlight ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>{row.label}</span>
                      <span className={`text-[13px] font-bold font-mono ${row.highlight ? 'text-on-surface' : row.value >= 0 ? 'text-[#059669]' : 'text-error'}`}>
                        {row.value >= 0 ? '' : '-'}{formatPrice(Math.abs(row.value))}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-5 py-3 bg-surface-container-low">
                    <span className="text-[14px] font-bold text-on-surface">Lợi nhuận (có ADS)</span>
                    <span className={`text-[16px] font-bold font-mono ${result.profitWithAds >= 0 ? 'text-[#059669]' : 'text-error'}`}>
                      {formatPrice(result.profitWithAds)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Cột phải: kết quả ── */}
          <div className="col-span-1">
            <div className="bg-primary rounded-xl shadow-lg overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b border-white/15 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary-container">analytics</span>
                <h3 className="font-bold text-[14px] text-white">Kết quả ước tính</h3>
              </div>

              <div className="p-5">
                {/* Lợi nhuận min */}
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-primary-container/70 uppercase tracking-widest mb-1">LỢI NHUẬN ƯỚC TÍNH (MIN)</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[30px] font-bold leading-none ${result.profitMin >= 0 ? 'text-[#34d399]' : 'text-red-300'}`}>
                      {formatPrice(result.profitMin)}
                    </span>
                    <span className="text-[12px] text-primary-container/70">/ đơn</span>
                  </div>
                </div>

                {/* Phí sàn + ADS */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-primary-container/70 uppercase tracking-wide mb-1">Tổng phí sàn</p>
                    <p className="text-[14px] font-bold text-white">{formatPrice(result.totalPlatformFee)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-primary-container/70 uppercase tracking-wide mb-1">Phí ADS dự tính</p>
                    <p className="text-[14px] font-bold text-white">{formatPrice(result.adsFee)}</p>
                  </div>
                </div>

                {/* Tỷ suất lợi nhuận */}
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-[12px] font-semibold text-primary-container/80">Tỷ suất lợi nhuận</p>
                    <span className={`text-[16px] font-bold ${result.margin >= 0 ? 'text-[#34d399]' : 'text-red-300'}`}>
                      {result.margin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${result.margin >= 0 ? 'bg-[#34d399]' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, Math.max(0, result.margin))}%` }}
                    />
                  </div>
                </div>

                {/* Gợi ý */}
                {result.salePrice > 0 && (
                  <div className={`rounded-lg p-3 mb-4 text-[12px] font-medium ${result.profitMin >= 0 ? 'bg-[#34d399]/15 text-[#34d399]' : 'bg-red-400/15 text-red-300'}`}>
                    {result.profitMin >= 0
                      ? `✓ Đơn hàng có lời ${formatPrice(result.profitMin)}/đơn.`
                      : `✗ Đang lỗ ${formatPrice(Math.abs(result.profitMin))}/đơn. Cần điều chỉnh giá bán.`}
                  </div>
                )}

                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-white text-primary text-[13px] font-bold rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Xuất báo cáo chi tiết
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
