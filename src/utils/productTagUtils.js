export const TAG_PRESETS = [
  { label: 'Top Bán Chạy', color: '#DC2626', text: 'Top Bán Chạy' },
  { label: 'Mới Ra Mắt', color: '#CA8A04', text: 'Mới Ra Mắt' },
  { label: 'Phiên Bản Giới Hạn', color: '#5C1A22', text: 'Phiên Bản Giới Hạn' },
  { label: 'Chỉ Còn 3 Hũ', color: '#4A2C2A', text: 'Chỉ Còn 3 Hũ' },
  { label: 'Số Lượng Có Hạn', color: '#4A2C2A', text: 'Số Lượng Có Hạn' },
  { label: 'Hot Deal', color: '#E11D48', text: 'Hot Deal' },
  { label: 'Yêu Thích Nhất', color: '#7C3AED', text: 'Yêu Thích Nhất' },
];

export const TAG_COLORS = [
  { name: 'Đỏ nổi bật', hex: '#DC2626' },
  { name: 'Vàng hổ phách', hex: '#CA8A04' },
  { name: 'Đỏ mận quý phái', hex: '#5C1A22' },
  { name: 'Nâu espresso trầm ấm', hex: '#4A2C2A' },
  { name: 'Đỏ hồng quyến rũ', hex: '#E11D48' },
  { name: 'Tím hoàng gia', hex: '#7C3AED' },
  { name: 'Xanh ngọc thanh lịch', hex: '#0D9488' },
  { name: 'Đen khói cổ điển', hex: '#1C1917' },
];

export function resolveTagColor(tag, explicitColor) {
  if (explicitColor && explicitColor.trim()) {
    return explicitColor.trim();
  }
  if (!tag) return '#5C1A22';

  const t = tag.toLowerCase().trim();
  if (t.includes('bán chạy') || t.includes('top') || t.includes('seller')) {
    return '#DC2626';
  }
  if (t.includes('mới') || t.includes('new')) {
    return '#CA8A04';
  }
  if (t.includes('giới hạn') || t.includes('limited')) {
    return '#5C1A22';
  }
  if (t.includes('còn') || t.includes('số lượng') || t.includes('stock')) {
    return '#4A2C2A';
  }
  if (t.includes('hot') || t.includes('deal') || t.includes('sale') || t.includes('giảm')) {
    return '#E11D48';
  }
  if (t.includes('yêu thích') || t.includes('thích') || t.includes('favorite')) {
    return '#7C3AED';
  }

  return '#5C1A22';
}
