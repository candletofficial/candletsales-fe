import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const searchText = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

export default function SearchableSelect({ options, value, onChange, placeholder = "-- Chọn --", className = "", disabled = false, inlineMenu = false, portalMenu = false, searchPlaceholder = "Tìm kiếm...", ariaLabel, allowCustomValue = false, customValueLabel = "Dùng giá trị mới" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    if (!isOpen || !portalMenu) return undefined;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 8;
      const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 16);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const availableBelow = window.innerHeight - rect.bottom - gap - 8;
      const openAbove = availableBelow < 190 && rect.top > availableBelow;
      const maxHeight = Math.min(300, Math.max(160, openAbove ? rect.top - gap - 8 : availableBelow));
      setMenuPosition({ left, width, maxHeight, ...(openAbove ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }) });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, portalMenu]);

  const selectedOption = options.find(opt => String(opt.value) === String(value));
  const selectedCustomValue = allowCustomValue && value && !selectedOption ? String(value) : '';
  
  const filteredOptions = options.filter(opt => 
    searchText(opt.label).includes(searchText(search))
  );
  const trimmedSearch = search.trim();
  const canUseCustomValue = allowCustomValue && trimmedSearch && !options.some(opt => searchText(String(opt.value)) === searchText(trimmedSearch) || searchText(opt.label) === searchText(trimmedSearch));

  const menu = isOpen && !disabled ? (
    <div ref={menuRef} style={portalMenu && menuPosition ? menuPosition : undefined} className={`${portalMenu ? 'fixed z-[200]' : inlineMenu ? 'relative' : 'absolute z-[100] min-w-[300px] left-0'} w-full mt-2 bg-white border border-outline-variant/30 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] max-h-[300px] flex flex-col overflow-hidden`}>
      <div className="p-2 border-b border-outline-variant/30 bg-surface-container-lowest z-10 flex-shrink-0">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
          <input type="text" className="w-full pl-9 pr-3 py-2 text-[14px] bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:border-primary/50 focus:bg-white transition-all" placeholder={searchPlaceholder} aria-label={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} onClick={(e) => e.stopPropagation()} autoFocus />
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-1">
        {filteredOptions.length > 0 ? filteredOptions.map(opt => {
          const isSelected = String(opt.value) === String(value);
          return <button type="button" key={opt.value} style={opt.toneColor ? { color: opt.toneColor } : undefined} className={`w-full text-left px-3 py-2.5 text-[14px] cursor-pointer rounded-lg transition-colors flex items-center justify-between gap-2 focus-visible:outline-2 focus-visible:outline-primary ${isSelected ? 'ring-1 ring-inset ring-primary/25 font-bold' : 'hover:bg-surface-container-low'} ${opt.toneColor ? '' : (isSelected ? 'bg-primary-container text-on-primary-container' : 'text-on-surface')}`} onClick={() => { onChange(opt.value); setIsOpen(false); triggerRef.current?.focus(); }}><span className={inlineMenu ? 'min-w-0 break-words' : 'truncate'}>{opt.label}</span><span className="ml-auto flex shrink-0 items-center gap-1.5">{opt.badge && <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset ${opt.badgeClass || ''}`}>{opt.badge}</span>}{isSelected && <span className="material-symbols-outlined text-[18px]">check</span>}</span></button>;
        }) : !canUseCustomValue && <div className="p-6 text-center text-[13px] text-on-surface-variant flex flex-col items-center"><span className="material-symbols-outlined text-[32px] opacity-30 mb-2">search_off</span>Không tìm thấy kết quả</div>}
        {canUseCustomValue && <button type="button" className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary-container/30 px-3 py-2.5 text-left text-[13px] font-semibold text-primary hover:bg-primary-container" onClick={() => { onChange(trimmedSearch); setIsOpen(false); triggerRef.current?.focus(); }}><span className="material-symbols-outlined text-[18px]">add</span><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wide text-primary/70">{customValueLabel}</span><span className="block truncate">{trimmedSearch}</span></span></button>}
      </div>
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className="relative w-full" onKeyDown={event => { if (event.key === 'Escape' && isOpen) { event.stopPropagation(); setIsOpen(false); triggerRef.current?.focus(); } }}>
      <button
        ref={triggerRef}
        type="button"
        className={`w-full bg-transparent rounded-md px-2 py-1.5 text-[14px] cursor-pointer flex justify-between items-center group text-left focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed ${className || 'border-none'}`}
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-expanded={isOpen && !disabled}
        onClick={() => { if (!disabled) { setIsOpen(!isOpen); setSearch(''); } }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-0.5 pr-2 text-left">
          <span style={selectedOption?.toneColor ? { color: selectedOption.toneColor } : undefined} className={`min-w-0 truncate ${!selectedOption && !selectedCustomValue ? 'text-on-surface-variant' : selectedOption?.toneColor ? 'font-semibold' : 'font-medium text-on-surface'}`}>
            {selectedOption ? selectedOption.label : selectedCustomValue || placeholder}
          </span>
          {selectedOption?.badge && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset ${selectedOption.badgeClass || ''}`}>{selectedOption.badge}</span>}
        </span>
        <span className={`material-symbols-outlined text-[20px] transition-transform ${isOpen ? 'rotate-180 text-primary' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
          expand_more
        </span>
      </button>

      {portalMenu ? (menuPosition && menu ? createPortal(menu, document.body) : null) : menu}
    </div>
  );
}
