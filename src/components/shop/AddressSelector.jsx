import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { locationService } from '../../services/locationService';

/* =========================================================
 * 1. Custom SVG Pin Marker
 * ========================================================= */
const createMapPinIcon = () =>
  L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);cursor:grab;">
        <div style="width:36px;height:36px;background:#EE4D2D;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(238,77,45,.45);border:2.5px solid #fff;">
          <svg style="transform:rotate(45deg);width:18px;height:18px;fill:white;" viewBox="0 0 256 256">
            <path d="M218.83,103.77l-80-75.48a13.9,13.9,0,0,0-17.66,0l-80,75.48A14,14,0,0,0,36,114v94a14,14,0,0,0,14,14H206a14,14,0,0,0,14-14V114A14,14,0,0,0,218.83,103.77ZM208,208H48V115.34l80-75.48,80,75.48Z"/>
          </svg>
        </div>
        <div style="width:14px;height:5px;background:rgba(0,0,0,.28);border-radius:50%;margin-top:3px;filter:blur(1px);"></div>
      </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

/* =========================================================
 * 2. RealMapPicker — bản đồ Leaflet tương tác
 * ========================================================= */
function RealMapPicker({ coords, onCoordsChange, disabled, onRequestAddLocation, isGeocoding, hasArea }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  useEffect(() => {
    if (!coords?.lat || !coords?.lng || !mapContainerRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
      return;
    }
    const { lat, lng } = coords;
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { center: [lat, lng], zoom: 16, zoomControl: false, attributionControl: false });
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      const marker = L.marker([lat, lng], { icon: createMapPinIcon(), draggable: !disabled }).addTo(map);
      marker.on('dragend', e => {
        const p = e.target.getLatLng();
        onCoordsChange({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
      });
      map.on('click', e => {
        if (disabled) return;
        marker.setLatLng(e.latlng);
        onCoordsChange({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) });
      });
      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
      [50, 150, 400, 800].forEach(ms => setTimeout(() => mapInstanceRef.current?.invalidateSize(), ms));
      try {
        const ro = new ResizeObserver(() => mapInstanceRef.current?.invalidateSize());
        if (mapContainerRef.current) ro.observe(mapContainerRef.current);
      } catch (_) {}
    } else {
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom() || 16, { animate: true });
      markerInstanceRef.current?.setLatLng([lat, lng]);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
    }
    return () => {};
  }, [coords, disabled, onCoordsChange]);

  useEffect(() => () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; markerInstanceRef.current = null; }, []);

  const handleGPS = () => {
    if (!navigator.geolocation) { alert('Trình duyệt không hỗ trợ định vị GPS'); return; }
    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      pos => { onCoordsChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsLocatingGPS(false); },
      () => { alert('Không thể đọc vị trí. Vui lòng cho phép quyền truy cập vị trí.'); setIsLocatingGPS(false); },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  if (!coords?.lat || !coords?.lng) {
    // Đang geocode — hiện skeleton loader
    if (isGeocoding) {
      return (
        <div className="relative w-full h-[160px] rounded-xl border border-stone-200 overflow-hidden bg-stone-100 animate-pulse flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
            <i className="ph-bold ph-spinner animate-spin text-stone-400 text-base" />
          </div>
          <span className="text-[11px] text-stone-400 font-medium">Đang tìm vị trí trên bản đồ...</span>
        </div>
      );
    }
    // Đã chọn khu vực nhưng geocode thất bại — hiện nút thao tác thủ công
    if (hasArea) {
      return (
        <div className="relative w-full h-[120px] rounded-xl border-2 border-dashed border-stone-200 overflow-hidden flex items-center justify-center bg-stone-50">
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.2px,transparent 1.2px)', backgroundSize: '20px 20px' }} />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <span className="text-[11px] text-stone-500 font-medium">Không tìm được vị trí tự động</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={disabled} onClick={onRequestAddLocation}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-stone-300 sm:hover:border-[#EE4D2D] text-stone-600 sm:hover:text-[#EE4D2D] text-[11px] font-semibold shadow-xs transition-all cursor-pointer">
                <i className="ph-bold ph-map-pin-plus text-sm" />
                Thêm thủ công
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Chưa chọn khu vực — placeholder mờ
    return (
      <div className="relative w-full h-[120px] rounded-xl border-2 border-dashed border-stone-200 overflow-hidden flex items-center justify-center bg-stone-50">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.2px,transparent 1.2px)', backgroundSize: '20px 20px' }} />
        <div className="relative z-10 flex flex-col items-center gap-1.5 text-stone-400">
          <i className="ph-bold ph-map-trifold text-2xl" />
          <span className="text-[11px] font-medium">Bản đồ sẽ hiển thị sau khi chọn khu vực</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="relative w-full h-[200px] rounded-xl border border-stone-300 overflow-hidden shadow-xs">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        <div className="absolute top-2 right-2 z-10">
          <button type="button" onClick={handleGPS} disabled={disabled || isLocatingGPS} title="Định vị GPS"
            className="w-8 h-8 rounded-lg bg-white/95 text-stone-700 sm:hover:text-[#EE4D2D] border border-stone-300 shadow-sm flex items-center justify-center transition-all cursor-pointer">
            <i className={`ph-bold ${isLocatingGPS ? 'ph-spinner animate-spin text-[#EE4D2D]' : 'ph-crosshair'} text-sm`} />
          </button>
        </div>
        <div className="absolute bottom-2 left-2 z-10 bg-white/95 px-2.5 py-1 rounded-md border border-stone-200 text-[10px] text-stone-600 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EE4D2D] animate-ping" />
          Kéo ghim để chỉnh vị trí giao hàng
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-stone-500 px-0.5">
        <span className="font-mono">📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
        <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer"
          className="text-[#EE4D2D] sm:hover:underline font-semibold flex items-center gap-0.5">
          Xem Maps <i className="ph-bold ph-arrow-square-out text-[10px]" />
        </a>
      </div>
    </div>
  );
}

/* =========================================================
 * 3. AddressHierarchyPanel — chọn địa giới (nhúng trong modal lớn)
 * ========================================================= */
function AddressHierarchyPanel({
  isMergedMode, setIsMergedMode,
  provinces, districts, wards,
  selectedProvinceCode, selectedDistrictCode, selectedWardCode,
  onSelectProvince, onSelectDistrict, onSelectWard,
  loadingProvinces, loadingDistricts, loadingWards
}) {
  const [activeStep, setActiveStep] = useState('province');
  const [search, setSearch] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const searchRef = useRef(null);

  // Tự chuyển bước phù hợp
  useEffect(() => {
    if (!selectedProvinceCode) { setActiveStep('province'); setSearch(''); setIsCollapsed(false); return; }
    if (isMergedMode) { setActiveStep('ward'); setSearch(''); }
    else if (!selectedDistrictCode) { setActiveStep('district'); setSearch(''); }
    else { setActiveStep('ward'); setSearch(''); }
  }, [selectedProvinceCode, selectedDistrictCode, isMergedMode]);

  // Tự thu lại khi chọn xong phường/xã
  useEffect(() => {
    if (selectedWardCode) setIsCollapsed(true);
  }, [selectedWardCode]);

  const cleanSearch = locationService.removeVietnameseTones(search);
  let list = [];
  if (activeStep === 'province') list = provinces.filter(p => locationService.removeVietnameseTones(p.name).includes(cleanSearch));
  else if (activeStep === 'district') list = districts.filter(d => locationService.removeVietnameseTones(d.name).includes(cleanSearch));
  else list = wards.filter(w => locationService.removeVietnameseTones(w.name).includes(cleanSearch));

  const currentProvince = provinces.find(p => String(p.code) === String(selectedProvinceCode));
  const currentDistrict = districts.find(d => String(d.code) === String(selectedDistrictCode));
  const currentWard = wards.find(w => String(w.code) === String(selectedWardCode));

  const canGoDistrict = selectedProvinceCode && !isMergedMode;
  const canGoWard = selectedProvinceCode && (isMergedMode || selectedDistrictCode);

  const handleStepClick = (step) => {
    if (step === 'district' && !canGoDistrict) return;
    if (step === 'ward' && !canGoWard) return;
    setActiveStep(step);
    setSearch('');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const isLoading = (activeStep === 'province' && loadingProvinces) ||
    (activeStep === 'district' && loadingDistricts) ||
    (activeStep === 'ward' && loadingWards);

  // Chuỗi tóm tắt khi thu gọn
  const summaryText = isMergedMode
    ? [currentWard?.name, currentProvince?.name].filter(Boolean).join(', ')
    : [currentWard?.name, currentDistrict?.name, currentProvince?.name].filter(Boolean).join(', ');

  // === CHẾD ĐỘ THU GỌN ===
  if (isCollapsed) {
    return (
      <div className="border border-emerald-200 rounded-xl bg-emerald-50/60 px-3.5 py-2.5 flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <i className="ph-bold ph-check text-xs" />
        </div>
        <p className="flex-1 text-xs font-semibold text-stone-800 truncate">{summaryText}</p>
        <button
          type="button"
          onClick={() => { setIsCollapsed(false); setTimeout(() => searchRef.current?.focus(), 80); }}
          className="shrink-0 text-[11px] font-bold text-[#EE4D2D] sm:hover:underline cursor-pointer"
        >
          Thay đổi
        </button>
      </div>
    );
  }

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
      {/* Toggle chế độ hành chính */}
      <div className="bg-stone-50 px-3 py-2 border-b border-stone-100 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Dữ liệu hành chính:</span>
        <div className="inline-flex rounded-lg p-0.5 bg-stone-200/80 text-[10px] font-bold">
          {[{ label: 'Mới nhất (Sáp nhập)', val: true }, { label: 'Truyền thống (3 cấp)', val: false }].map(opt => (
            <button key={String(opt.val)} type="button"
              onClick={() => { if (isMergedMode !== opt.val) { setIsMergedMode(opt.val); setActiveStep('province'); } }}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${isMergedMode === opt.val ? 'bg-white text-[#EE4D2D] shadow-2xs' : 'text-stone-600 sm:hover:text-stone-900'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs bước */}
      <div className="flex border-b border-stone-100 bg-white text-[11px] font-bold overflow-x-auto">
        {/* Bước 1: Tỉnh */}
        <button type="button" onClick={() => handleStepClick('province')}
          className={`flex-1 py-2.5 px-2 border-b-2 text-center transition-all truncate cursor-pointer ${activeStep === 'province' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-orange-50/50' : selectedProvinceCode ? 'border-transparent text-stone-700 sm:hover:text-stone-900' : 'border-transparent text-stone-400'}`}>
          <span className="block text-[9px] uppercase text-stone-400 font-semibold">B1</span>
          <span className="truncate block">{currentProvince?.name || 'Tỉnh / Thành'}</span>
        </button>

        {/* Bước 2: Quận/Huyện (chỉ trong chế độ 3 cấp) */}
        {!isMergedMode && (
          <button type="button" onClick={() => handleStepClick('district')} disabled={!canGoDistrict}
            className={`flex-1 py-2.5 px-2 border-b-2 text-center transition-all truncate ${!canGoDistrict ? 'border-transparent text-stone-300 cursor-not-allowed' : activeStep === 'district' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-orange-50/50 cursor-pointer' : selectedDistrictCode ? 'border-transparent text-stone-700 sm:hover:text-stone-900 cursor-pointer' : 'border-transparent text-stone-500 cursor-pointer'}`}>
            <span className="block text-[9px] uppercase text-stone-400 font-semibold">B2</span>
            <span className="truncate block">{currentDistrict?.name || 'Quận / Huyện'}</span>
          </button>
        )}

        {/* Bước cuối: Phường/Xã */}
        <button type="button" onClick={() => handleStepClick('ward')} disabled={!canGoWard}
          className={`flex-1 py-2.5 px-2 border-b-2 text-center transition-all truncate ${!canGoWard ? 'border-transparent text-stone-300 cursor-not-allowed' : activeStep === 'ward' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-orange-50/50 cursor-pointer' : selectedWardCode ? 'border-transparent text-stone-700 sm:hover:text-stone-900 cursor-pointer' : 'border-transparent text-stone-500 cursor-pointer'}`}>
          <span className="block text-[9px] uppercase text-stone-400 font-semibold">{isMergedMode ? 'B2' : 'B3'}</span>
          <span className="truncate block">{currentWard?.name || 'Phường / Xã'}</span>
        </button>
      </div>

      {/* Tìm kiếm */}
      <div className="p-2.5 border-b border-stone-100 bg-stone-50/60">
        <div className="relative">
          <i className="ph-bold ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
          <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={activeStep === 'province' ? 'Tìm Tỉnh / Thành...' : activeStep === 'district' ? 'Tìm Quận / Huyện...' : 'Tìm Phường / Xã...'}
            className="w-full bg-white border border-stone-200 rounded-lg pl-7 pr-7 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#EE4D2D]" />
          {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 sm:hover:text-stone-600"><i className="ph-bold ph-x text-xs" /></button>}
        </div>
      </div>

      {/* Danh sách */}
      <div className="overflow-y-auto max-h-[220px] p-1.5 space-y-0.5 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-stone-400 text-xs gap-2">
            <i className="ph-bold ph-spinner animate-spin text-lg text-[#EE4D2D]" /> Đang tải...
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-xs text-stone-400">
            <i className="ph-light ph-magnifying-glass text-xl mb-1 block" /> Không tìm thấy kết quả
          </div>
        ) : list.map(item => {
          const isSelected =
            (activeStep === 'province' && String(item.code) === String(selectedProvinceCode)) ||
            (activeStep === 'district' && String(item.code) === String(selectedDistrictCode)) ||
            (activeStep === 'ward' && String(item.code) === String(selectedWardCode));
          return (
            <button key={item.code} type="button"
              onClick={() => {
                setSearch('');
                if (activeStep === 'province') { onSelectProvince(item.code); }
                else if (activeStep === 'district') { onSelectDistrict(item.code); }
                else { onSelectWard(item.code); }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${isSelected ? 'bg-orange-50 text-[#EE4D2D] font-bold' : 'text-stone-700 sm:hover:bg-stone-50'}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate">{item.name}</span>
                {item.division_type && <span className="text-[9px] uppercase font-bold text-stone-400 bg-stone-100 px-1 py-0.5 rounded shrink-0">{item.division_type}</span>}
              </div>
              {isSelected && <i className="ph-bold ph-check text-[#EE4D2D] text-xs shrink-0 ml-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
 * 4. AddressEditModal — Modal lớn chứa toàn bộ UI nhập địa chỉ
 * ========================================================= */
function AddressEditModal({ isOpen, onClose, onSave, initialData, isMergedMode: initMerged = true, showAddressNote = false }) {
  const [isMergedMode, setIsMergedMode] = useState(initMerged);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedWardCode, setSelectedWardCode] = useState('');
  const [street, setStreet] = useState('');
  const [addressNote, setAddressNote] = useState('');
  const [coords, setCoords] = useState(null);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const [streetSuggestions, setStreetSuggestions] = useState([]);
  const [searchingStreet, setSearchingStreet] = useState(false);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const [isAutoGeocoding, setIsAutoGeocoding] = useState(false);
  const streetDropdownRef = useRef(null);
  const streetInputRef = useRef(null);
  const isUserTyping = useRef(false);
  const isInitialized = useRef(false);
  const [visibleViewport, setVisibleViewport] = useState({ height: 0, offsetTop: 0 });

  // Keep the mobile fullscreen modal isolated from background scrolling.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  // Embedded mobile browsers can report 100dvh behind their top and bottom bars.
  // Track the actual visible viewport so the modal always stays inside those bars.
  useEffect(() => {
    if (!isOpen) return undefined;

    const viewport = window.visualViewport;
    const updateVisibleViewport = () => {
      setVisibleViewport({
        height: Math.round(viewport?.height || window.innerHeight),
        offsetTop: Math.round(viewport?.offsetTop || 0),
      });
    };

    updateVisibleViewport();
    viewport?.addEventListener('resize', updateVisibleViewport);
    viewport?.addEventListener('scroll', updateVisibleViewport);
    window.addEventListener('resize', updateVisibleViewport);

    return () => {
      viewport?.removeEventListener('resize', updateVisibleViewport);
      viewport?.removeEventListener('scroll', updateVisibleViewport);
      window.removeEventListener('resize', updateVisibleViewport);
    };
  }, [isOpen]);

  // Tải provinces khi mở / đổi chế độ
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoadingProvinces(true);
    locationService.getProvinces(isMergedMode).then(data => {
      if (mounted && Array.isArray(data)) setProvinces(data);
    }).catch(() => {}).finally(() => { if (mounted) setLoadingProvinces(false); });
    return () => { mounted = false; };
  }, [isOpen, isMergedMode]);

  // Khi mở modal, điền lại initialData (nếu có)
  useEffect(() => {
    if (!isOpen) { isInitialized.current = false; return; }
    if (isInitialized.current) return;
    if (initialData) {
      setIsMergedMode(initialData.isMergedMode ?? true);
      setSelectedProvinceCode(initialData.provinceCode || '');
      setSelectedDistrictCode(initialData.districtCode || '');
      setSelectedWardCode(initialData.wardCode || '');
      isUserTyping.current = false;
      setStreet(initialData.street || '');
      setAddressNote(initialData.addressNote || '');
      setCoords(initialData.coords || null);
      setDistricts(initialData.districts || []);
      setWards(initialData.wards || []);
      isInitialized.current = true;
    } else {
      setSelectedProvinceCode('');
      setSelectedDistrictCode('');
      setSelectedWardCode('');
      setStreet('');
      setAddressNote('');
      setCoords(null);
      setDistricts([]);
      setWards([]);
      isInitialized.current = true;
    }
  }, [isOpen, initialData]);

  // Gợi ý Goong Maps — chỉ khi người dùng gõ
  useEffect(() => {
    if (!isUserTyping.current || !street || street.trim().length < 2) {
      setStreetSuggestions([]);
      return;
    }
    const provinceObj = provinces.find(p => String(p.code) === String(selectedProvinceCode));
    const districtObj = districts.find(d => String(d.code) === String(selectedDistrictCode));
    const wardObj = wards.find(w => String(w.code) === String(selectedWardCode));
    const timer = setTimeout(async () => {
      setSearchingStreet(true);
      try {
        const results = await locationService.searchPlacesScoped(street, {
          provinceName: provinceObj?.name || '',
          districtName: districtObj?.name || '',
          wardName: wardObj?.name || ''
        }, coords);
        setStreetSuggestions(results || []);
        if (results?.length > 0) setShowStreetDropdown(true);
      } catch (_) {}
      finally { setSearchingStreet(false); }
    }, 280);
    return () => clearTimeout(timer);
  }, [street, selectedProvinceCode, selectedDistrictCode, selectedWardCode, provinces, districts, wards]);

  // Click ngoài đóng dropdown gợi ý
  useEffect(() => {
    const fn = e => { if (streetDropdownRef.current && !streetDropdownRef.current.contains(e.target)) setShowStreetDropdown(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Tự động geocode và hiển thị bản đồ khi có khu vực hành chính đã chọn
  const autoGeoTimerRef = useRef(null);
  useEffect(() => {
    if (!selectedProvinceCode) return;

    const provinceObj = provinces.find(p => String(p.code) === String(selectedProvinceCode));
    if (!provinceObj) return;

    const districtObj = districts.find(d => String(d.code) === String(selectedDistrictCode));
    const wardObj     = wards.find(w => String(w.code) === String(selectedWardCode));

    const parts = [street.trim(), wardObj?.name, districtObj?.name, provinceObj?.name].filter(Boolean);
    if (parts.length === 0) return;

    if (autoGeoTimerRef.current) clearTimeout(autoGeoTimerRef.current);
    setIsAutoGeocoding(true);
    autoGeoTimerRef.current = setTimeout(async () => {
      try {
        // Query từ chi tiết nhất đến chung nhất
        const fullQuery     = parts.join(', ');
        const areaQuery     = [wardObj?.name, districtObj?.name, provinceObj?.name].filter(Boolean).join(', ');
        const provinceQuery = provinceObj?.name || '';

        // Thử lần 1: full address
        let geo = await locationService.geocodeAddress(fullQuery);
        // Thử lần 2: chỉ khu vực hành chính (bỏ địa chỉ cụ thể)
        if (!geo?.lat && areaQuery) geo = await locationService.geocodeAddress(areaQuery);
        // Thử lần 3: chỉ tỉnh/thành
        if (!geo?.lat && provinceQuery) geo = await locationService.geocodeAddress(provinceQuery);

        if (geo?.lat && geo?.lng) {
          setCoords({ lat: geo.lat, lng: geo.lng });
        }
      } catch (_) {}
      finally { setIsAutoGeocoding(false); }
    }, 600);

    return () => { if (autoGeoTimerRef.current) clearTimeout(autoGeoTimerRef.current); };
  }, [selectedProvinceCode, selectedDistrictCode, selectedWardCode, street]);

  // Đổi chế độ hành chính → reset quận/phường
  const handleSetMergedMode = (val) => {
    setIsMergedMode(val);
    setSelectedDistrictCode('');
    setSelectedWardCode('');
    setDistricts([]);
    setWards([]);
  };

  const handleSelectProvince = async (code) => {
    setSelectedProvinceCode(code);
    setSelectedDistrictCode('');
    setSelectedWardCode('');
    setDistricts([]);
    setWards([]);
    if (!code) return;

    // Tự động gán tọa độ trung tâm của Tỉnh/Thành phố được chọn để bản đồ luôn hiển thị
    const prov = provinces.find(p => String(p.code) === String(code));
    if (prov) {
      const provCoord = locationService.getProvinceCoord(prov.name);
      if (provCoord) {
        setCoords(provCoord);
      }
    }

    if (isMergedMode) {
      setLoadingWards(true);
      try { const w = await locationService.getWardsV2(code); setWards(w); } catch (_) {} finally { setLoadingWards(false); }
    } else {
      setLoadingDistricts(true);
      try { const d = await locationService.getDistricts(code); setDistricts(d); } catch (_) {} finally { setLoadingDistricts(false); }
    }
  };

  const handleSelectDistrict = async (code) => {
    setSelectedDistrictCode(code);
    setSelectedWardCode('');
    setWards([]);
    if (!code) return;
    setLoadingWards(true);
    try { const w = await locationService.getWards(code); setWards(w); } catch (_) {} finally { setLoadingWards(false); }
  };

  const handleSelectWard = (code) => setSelectedWardCode(code);

  const handleSelectSuggestion = async (place) => {
    setShowStreetDropdown(false);
    isUserTyping.current = false;
    setStreet(place.title || place.description || '');
    if (place.placeId) {
      // Kết quả từ Goong: gọi Place Detail để lấy tọa độ chính xác
      const detail = await locationService.goongPlaceDetail(place.placeId);
      if (detail?.lat && detail?.lng) setCoords({ lat: detail.lat, lng: detail.lng });
    } else if (place.lat && place.lng) {
      // Kết quả từ Photon/Nominatim: lat/lng đã có sẵn
      setCoords({ lat: place.lat, lng: place.lng });
    }
  };

  const handleRequestMap = async () => {
    const provinceObj = provinces.find(p => String(p.code) === String(selectedProvinceCode));
    const districtObj = districts.find(d => String(d.code) === String(selectedDistrictCode));
    const wardObj = wards.find(w => String(w.code) === String(selectedWardCode));
    if (!provinceObj) return;
    const q = [wardObj?.name, districtObj?.name, provinceObj?.name].filter(Boolean).join(', ');
    const geo = await locationService.geocodeAddress(q);
    setCoords(geo?.lat && geo?.lng ? { lat: geo.lat, lng: geo.lng } : { lat: 21.0285, lng: 105.8542 });
  };

  const handleSave = () => {
    const provinceObj = provinces.find(p => String(p.code) === String(selectedProvinceCode));
    const districtObj = districts.find(d => String(d.code) === String(selectedDistrictCode));
    const wardObj = wards.find(w => String(w.code) === String(selectedWardCode));
    const cleanStreet = street.trim();
    const cleanNote = addressNote.trim();

    const parts = [cleanStreet, wardObj?.name, districtObj?.name, provinceObj?.name].filter(Boolean);
    let fullAddress = parts.join(', ');
    if (cleanNote) {
      fullAddress += ` (${cleanNote})`;
    }

    const isValid = Boolean(provinceObj && wardObj && (isMergedMode || districtObj) && cleanStreet);
    onSave({
      province: provinceObj || null,
      district: districtObj || null,
      ward: wardObj || null,
      street: cleanStreet,
      addressNote: cleanNote,
      fullAddress,
      generalAddress: [wardObj?.name, districtObj?.name, provinceObj?.name].filter(Boolean).join(', '),
      coords,
      isValid,
      // Lưu context để restore khi mở lại
      isMergedMode,
      provinceCode: selectedProvinceCode,
      districtCode: selectedDistrictCode,
      wardCode: selectedWardCode,
      districts,
      wards,
    });
  };

  const provinceObj = provinces.find(p => String(p.code) === String(selectedProvinceCode));
  const districtObj = districts.find(d => String(d.code) === String(selectedDistrictCode));
  const wardObj = wards.find(w => String(w.code) === String(selectedWardCode));
  const adminText = isMergedMode
    ? [provinceObj?.name, wardObj?.name].filter(Boolean).join(' › ')
    : [provinceObj?.name, districtObj?.name, wardObj?.name].filter(Boolean).join(' › ');
  const canSave = Boolean(provinceObj && wardObj && (isMergedMode || districtObj) && street.trim());

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[9999] flex items-stretch justify-center bg-stone-900/60 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out] sm:items-center"
      style={{
        height: visibleViewport.height ? `${visibleViewport.height}px` : '100svh',
        top: visibleViewport.offsetTop ? `${visibleViewport.offsetTop}px` : 0,
      }}
    >
      <div
        className="flex h-full max-h-none w-full flex-col overflow-hidden border-0 bg-white shadow-2xl animate-[scaleUp_0.2s_ease-out] sm:h-auto sm:max-h-[90%] sm:max-w-xl sm:rounded-3xl sm:border sm:border-stone-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 bg-[#FAF5EE] px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:py-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#EE4D2D] text-white flex items-center justify-center shadow-xs">
              <i className="ph-fill ph-map-pin text-sm" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-stone-900 leading-tight">Địa chỉ nhận hàng</h3>
              <p className="text-[11px] text-stone-500">
                {adminText || 'Chọn địa chỉ giao hàng của bạn'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full bg-white text-stone-400 sm:hover:text-stone-700 sm:hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer">
            <i className="ph-bold ph-x text-sm" />
          </button>
        </div>

        {/* Nội dung scroll */}
        <div className="custom-scrollbar flex-1 overscroll-contain overflow-y-auto p-4 space-y-4">

          {/* Phần 1: Địa giới hành chính */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5">
              <i className="ph-bold ph-buildings text-stone-500" />
              Tỉnh / Thành phố, Phường / Xã
              <span className="text-rose-500">*</span>
            </label>
            <AddressHierarchyPanel
              isMergedMode={isMergedMode}
              setIsMergedMode={handleSetMergedMode}
              provinces={provinces}
              districts={districts}
              wards={wards}
              selectedProvinceCode={selectedProvinceCode}
              selectedDistrictCode={selectedDistrictCode}
              selectedWardCode={selectedWardCode}
              onSelectProvince={handleSelectProvince}
              onSelectDistrict={handleSelectDistrict}
              onSelectWard={handleSelectWard}
              loadingProvinces={loadingProvinces}
              loadingDistricts={loadingDistricts}
              loadingWards={loadingWards}
            />
          </div>

          {/* Phần 2: Địa chỉ cụ thể + Goong autocomplete */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5">
              <i className="ph-bold ph-house-line text-stone-500" />
              Địa chỉ cụ thể
              <span className="text-rose-500">*</span>
              {adminText && <span className="text-[10px] font-normal text-stone-400 ml-1">— trong {adminText}</span>}
            </label>
            <div className="relative" ref={streetDropdownRef}>
              <div className="relative">
                <input
                  ref={streetInputRef}
                  type="text"
                  value={street}
                  onChange={e => { isUserTyping.current = true; setStreet(e.target.value); }}
                  placeholder="Số nhà, tên đường, toà nhà..."
                  disabled={!selectedProvinceCode}
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 pr-9 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all placeholder:text-stone-400 disabled:bg-stone-100 disabled:text-stone-400"
                />
                {searchingStreet ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                    <i className="ph-bold ph-spinner animate-spin text-sm" />
                  </div>
                ) : street ? (
                  <button type="button" onClick={() => { isUserTyping.current = false; setStreet(''); setStreetSuggestions([]); setShowStreetDropdown(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 sm:hover:text-stone-600 cursor-pointer">
                    <i className="ph-bold ph-x-circle text-base" />
                  </button>
                ) : null}
              </div>
              {!selectedProvinceCode && (
                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                  <i className="ph-bold ph-warning-circle" /> Chọn Tỉnh/Thành trước để được gợi ý địa chỉ chính xác
                </p>
              )}

              {/* Dropdown gợi ý địa điểm */}
              {showStreetDropdown && streetSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden animate-[fadeIn_0.12s_ease-out]">
                  <div className="p-2 bg-stone-50 border-b border-stone-100 text-[10px] font-bold text-stone-500 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <i className="ph-fill ph-map-pin text-[#EE4D2D]" />
                      Gợi ý địa điểm ({streetSuggestions.length})
                    </span>
                    {adminText && <span className="text-[#EE4D2D] font-semibold normal-case">trong {adminText}</span>}
                  </div>
                  <div className="max-h-52 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                    {streetSuggestions.map((item, i) => (
                      <button key={i} type="button" onClick={() => handleSelectSuggestion(item)}
                        className="w-full flex items-start gap-2 p-2 rounded-lg sm:hover:bg-orange-50/70 text-left transition-colors cursor-pointer group">
                        <div className="w-5 h-5 rounded-full bg-orange-100 text-[#EE4D2D] flex items-center justify-center shrink-0 mt-0.5">
                          <i className="ph-fill ph-map-pin text-[10px]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-stone-900 sm:group-hover:text-[#EE4D2D] truncate">{item.title}</h4>
                          <p className="text-[10px] text-stone-500 line-clamp-1">{item.subtitle || item.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ô nhập tay: Ghi chú địa chỉ (tuỳ chọn) - chỉ hiển thị cho Shop */}
          {showAddressNote && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <i className="ph-bold ph-note-pencil text-stone-500" />
                Ghi chú địa chỉ <span className="text-[10px] font-normal text-stone-400">(Tuỳ chọn)</span>
              </label>
              <input
                type="text"
                value={addressNote}
                onChange={e => setAddressNote(e.target.value)}
                placeholder="Ví dụ: Gần cổng làng, toà nhà A, gọi trước khi giao..."
                className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all placeholder:text-stone-400"
              />
            </div>
          )}

          {/* Phần 3: Bản đồ định vị — hiển thị mặc định */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5">
              <i className="ph-bold ph-map-trifold text-stone-500" />
              Vị trí trên bản đồ
              {!coords && (
                <span className="text-[10px] font-normal text-stone-400">(sẽ hiển thị sau khi chọn khu vực)</span>
              )}
            </label>
            <RealMapPicker
              coords={coords}
              onCoordsChange={setCoords}
              disabled={false}
              onRequestAddLocation={handleRequestMap}
              isGeocoding={isAutoGeocoding && !coords}
              hasArea={Boolean(selectedProvinceCode)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-3 border-t border-stone-100 bg-stone-50 px-4 pb-[calc(.75rem+env(safe-area-inset-bottom,0px))] pt-3 sm:py-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 sm:hover:bg-stone-100 transition-colors cursor-pointer">
            Huỷ
          </button>
          <button type="button" onClick={handleSave} disabled={!canSave}
            className="flex-1 py-2.5 rounded-xl bg-[#EE4D2D] sm:hover:bg-[#d43d20] text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <i className="ph-bold ph-check text-sm" />
            Xác nhận địa chỉ
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* =========================================================
 * 5. AddressSelector — Component chính: compact button → modal
 * ========================================================= */
export default function AddressSelector({
  initialAddress = '',
  onChange,
  onConfirm,
  showAddressNote = false,
  required = true,
  disabled = false,
}) {
  const [savedData, setSavedData] = useState(null);     // Dữ liệu địa chỉ đã xác nhận
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const isParsed = useRef(false);
  const lastParsed = useRef('');

  // Tải provinces để parse initialAddress + preload Goong key
  useEffect(() => {
    locationService.getGoongApiKey().catch(() => {});
    locationService.getProvinces(true).then(data => {
      if (Array.isArray(data)) setProvinces(data);
    }).catch(() => {});
  }, []);

  // Reset khi initialAddress thay đổi
  useEffect(() => {
    if (initialAddress !== lastParsed.current) {
      isParsed.current = false;
      if (lastParsed.current !== '') setSavedData(null);
    }
  }, [initialAddress]);

  // Parse initialAddress → điền savedData
  useEffect(() => {
    if (!initialAddress || provinces.length === 0 || isParsed.current) return;

    const fuzzyMatch = (a, b) => {
      const strip = s => locationService.removeVietnameseTones(s).toLowerCase().replace(/^(tinh|thanh pho|quan|huyen|thi xa|phuong|xa|thi tran)\s+/i, '').trim();
      const ha = strip(a), nb = strip(b);
      const ra = locationService.removeVietnameseTones(a).toLowerCase().trim();
      const rb = locationService.removeVietnameseTones(b).toLowerCase().trim();
      return ra === rb || ha === nb || ra.includes(nb) || rb.includes(ha);
    };

    const parse = async () => {
      isParsed.current = true;
      lastParsed.current = initialAddress;
      const parts = initialAddress.split(',').map(s => s.trim()).filter(Boolean);
      if (!parts.length) return;

      let matchedProvince = null, provinceIndex = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        const c = provinces.find(p => fuzzyMatch(p.name, parts[i]));
        if (c) { matchedProvince = c; provinceIndex = i; break; }
      }

      if (!matchedProvince) { notifyChange({ fullAddress: initialAddress, street: initialAddress, isValid: false }); return; }

      let loadedWards = [], loadedDistricts = [];
      let matchedWard = null, wardIndex = -1;
      let matchedDistrict = null, districtIndex = -1;

      // Thử mode sáp nhập trước
      try { loadedWards = await locationService.getWardsV2(matchedProvince.code); } catch (_) {}
      for (let i = provinceIndex - 1; i >= 0; i--) {
        const c = loadedWards.find(w => fuzzyMatch(w.name, parts[i]));
        if (c) { matchedWard = c; wardIndex = i; break; }
      }

      // Nếu không tìm được phường theo mode sáp nhập → thử mode truyền thống
      if (!matchedWard) {
        try { loadedDistricts = await locationService.getDistricts(matchedProvince.code); } catch (_) {}
        for (let i = provinceIndex - 1; i >= 0; i--) {
          const c = loadedDistricts.find(d => fuzzyMatch(d.name, parts[i]));
          if (c) { matchedDistrict = c; districtIndex = i; break; }
        }
        if (matchedDistrict) {
          try { loadedWards = await locationService.getWards(matchedDistrict.code); } catch (_) {}
          const upTo = districtIndex;
          for (let i = upTo - 1; i >= 0; i--) {
            const c = loadedWards.find(w => fuzzyMatch(w.name, parts[i]));
            if (c) { matchedWard = c; wardIndex = i; break; }
          }
        }
      }

      const streetParts = parts.slice(0, wardIndex >= 0 ? wardIndex : districtIndex >= 0 ? districtIndex : provinceIndex);
      let streetVal = streetParts.join(', ');
      let noteVal = '';
      const noteMatch = streetVal.match(/^(.+?)\s*\((?:Ghi chú:\s*)?(.+?)\)$/i);
      if (noteMatch) {
        streetVal = noteMatch[1].trim();
        noteVal = noteMatch[2].trim();
      }

      // Tọa độ ban đầu mặc định theo tỉnh thành nếu có
      const defaultCoord = matchedProvince ? locationService.getProvinceCoord(matchedProvince.name) : null;

      const data = {
        province: matchedProvince,
        district: matchedDistrict,
        ward: matchedWard,
        street: streetVal,
        addressNote: noteVal,
        fullAddress: initialAddress,
        generalAddress: [matchedWard?.name, matchedDistrict?.name, matchedProvince?.name].filter(Boolean).join(', '),
        coords: defaultCoord,
        isValid: Boolean(matchedProvince && matchedWard && streetVal),
        isMergedMode: !matchedDistrict,
        provinceCode: String(matchedProvince.code),
        districtCode: matchedDistrict ? String(matchedDistrict.code) : '',
        wardCode: matchedWard ? String(matchedWard.code) : '',
        districts: loadedDistricts,
        wards: loadedWards,
      };
      setSavedData(data);
      notifyChange(data);

      // Geocode tọa độ nền
      locationService.geocodeAddress(initialAddress).then(geo => {
        if (geo?.lat && geo?.lng) {
          setSavedData(prev => prev ? { ...prev, coords: { lat: geo.lat, lng: geo.lng } } : prev);
        }
      });
    };

    parse();
  }, [initialAddress, provinces]);

  const notifyChange = (data) => {
    if (!onChange) return;
    onChange(data);
  };

  const handleSave = (data) => {
    setSavedData(data);
    setIsModalOpen(false);
    notifyChange(data);
    if (onConfirm) {
      onConfirm(data);
    }
  };

  const adminDisplay = savedData
    ? [savedData.ward?.name, savedData.district?.name, savedData.province?.name].filter(Boolean).join(', ')
    : '';

  return (
    <div>
      {/* Compact display button */}
      {savedData ? (
        /* === ĐÃ CÓ ĐỊA CHỈ: Hiển thị card tóm tắt === */
        <div className="border border-stone-200 rounded-xl bg-stone-50 p-3.5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EE4D2D]/10 text-[#EE4D2D] flex items-center justify-center shrink-0 mt-0.5">
              <i className="ph-fill ph-map-pin text-base" />
            </div>
            <div className="flex-1 min-w-0">
              {savedData.street && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold text-stone-900 truncate">{savedData.street}</p>
                  {savedData.addressNote && (
                    <span className="text-[11px] font-normal text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70 inline-flex items-center gap-1">
                      <i className="ph-bold ph-note-pencil text-[10px]" />
                      {savedData.addressNote}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-stone-500 mt-0.5 truncate">{adminDisplay}</p>
              {savedData.coords && (
                <p className="text-[10px] text-emerald-600 mt-0.5 flex items-center gap-1">
                  <i className="ph-fill ph-map-pin-line text-[10px]" />
                  Đã có vị trí GPS
                </p>
              )}
              {required && !savedData.isValid && (
                <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                  <i className="ph-bold ph-warning-circle" />
                  Địa chỉ chưa đầy đủ — vui lòng cập nhật
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsModalOpen(true)}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 sm:hover:border-[#EE4D2D] text-xs font-semibold text-stone-600 sm:hover:text-[#EE4D2D] bg-white sm:hover:bg-orange-50 transition-all cursor-pointer"
            >
              <i className="ph-bold ph-pencil-simple text-xs" />
              Sửa
            </button>
          </div>
        </div>
      ) : (
        /* === CHƯA CÓ ĐỊA CHỈ: Nút thêm mới === */
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed border-stone-300 sm:hover:border-[#EE4D2D] bg-white sm:hover:bg-orange-50/40 text-stone-500 sm:hover:text-[#EE4D2D] transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-stone-100 sm:group-hover:bg-[#EE4D2D]/10 text-stone-400 sm:group-hover:text-[#EE4D2D] flex items-center justify-center transition-all">
            <i className="ph-bold ph-map-pin-plus text-base" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Thêm địa chỉ giao hàng</p>
            <p className="text-xs text-stone-400">Nhấn để chọn địa chỉ nhận nến của bạn</p>
          </div>
          <i className="ph-bold ph-caret-right text-xs ml-auto" />
        </button>
      )}

      {/* Modal đầy đủ */}
      <AddressEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={savedData}
        isMergedMode={savedData?.isMergedMode ?? true}
        showAddressNote={showAddressNote}
      />
    </div>
  );
}
