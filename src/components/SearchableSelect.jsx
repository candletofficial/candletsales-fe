import React, { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({ options, value, onChange, placeholder = "-- Chọn --", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const selectedOption = options.find(opt => String(opt.value) === String(value));
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div 
        className={`w-full bg-transparent rounded-md px-2 py-1.5 text-[14px] cursor-pointer flex justify-between items-center group ${className || 'border-none'}`}
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
      >
        <span className={`truncate flex-1 min-w-0 text-left pr-2 ${!selectedOption ? 'text-on-surface-variant' : 'text-on-surface font-medium'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`material-symbols-outlined text-[20px] transition-transform ${isOpen ? 'rotate-180 text-primary' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full min-w-[300px] left-0 mt-2 bg-white border border-outline-variant/30 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] max-h-[300px] flex flex-col overflow-hidden">
          <div className="p-2 border-b border-outline-variant/30 bg-surface-container-lowest z-10 flex-shrink-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 text-[14px] bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:border-primary/50 focus:bg-white transition-all"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    className={`px-3 py-2.5 text-[14px] cursor-pointer rounded-lg transition-colors flex items-center justify-between
                      ${isSelected ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface hover:bg-surface-container-low'}`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <span className="material-symbols-outlined text-[18px]">check</span>}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-[13px] text-on-surface-variant flex flex-col items-center">
                <span className="material-symbols-outlined text-[32px] opacity-30 mb-2">search_off</span>
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
