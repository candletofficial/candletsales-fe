export const DEFAULT_THEME_CONFIG = {
  adminPreset: 'candlet',
  shopPreset: 'candlet',
};

export const THEME_PRESETS = [
  {
    id: 'candlet',
    name: 'Candlet nguyên bản',
    description: 'Nâu cacao, kem ấm và điểm nhấn màu hổ phách.',
    colors: {
      primary: '#4A2C2A', deep: '#381B18', accent: '#8C4A32',
      highlight: '#D97706', background: '#FAF7F2', surface: '#FFFCF8',
      soft: '#F5EFE6', border: '#E3D8C7', text: '#2C1810', muted: '#78665E',
    },
  },
  {
    id: 'rose',
    name: 'Hồng đất',
    description: 'Dịu dàng, hiện đại và hợp với quà tặng lãng mạn.',
    colors: {
      primary: '#854D5B', deep: '#5D3340', accent: '#B66A78',
      highlight: '#C7835C', background: '#FCF7F7', surface: '#FFFDFD',
      soft: '#F7E9EC', border: '#EAD5DA', text: '#352326', muted: '#80676D',
    },
  },
  {
    id: 'forest',
    name: 'Rừng thảo mộc',
    description: 'Xanh ô liu và kem tự nhiên, tạo cảm giác thư giãn.',
    colors: {
      primary: '#3F5B4B', deep: '#293D32', accent: '#71866A',
      highlight: '#B7791F', background: '#F7F8F3', surface: '#FEFFF9',
      soft: '#EAEFE4', border: '#D8DFCF', text: '#243028', muted: '#68746C',
    },
  },
  {
    id: 'midnight',
    name: 'Đêm xanh',
    description: 'Xanh đêm thanh lịch với điểm nhấn vàng champagne.',
    colors: {
      primary: '#273B55', deep: '#17263A', accent: '#4D6A87',
      highlight: '#B98B45', background: '#F5F7FA', surface: '#FCFDFE',
      soft: '#E8EDF3', border: '#D5DEE8', text: '#1C2733', muted: '#687687',
    },
  },
  {
    id: 'classic-blue',
    name: 'Xanh sáng cổ điển',
    description: 'Tông xanh dương sáng của giao diện Admin trước đây.',
    colors: {
      primary: '#1E40AF', deep: '#1E3A8A', accent: '#0D9488',
      highlight: '#2563EB', background: '#F3F6FB', surface: '#FFFFFF',
      soft: '#DBEAFE', border: '#CBD5E1', text: '#111827', muted: '#6B7280',
    },
  },
];

export const getThemePreset = (id) => (
  THEME_PRESETS.find((preset) => preset.id === id) || THEME_PRESETS[0]
);

export const normalizeThemeConfig = (value) => {
  const validIds = new Set(THEME_PRESETS.map((preset) => preset.id));
  const source = value && typeof value === 'object' ? value : {};
  return {
    adminPreset: validIds.has(source.adminPreset) ? source.adminPreset : DEFAULT_THEME_CONFIG.adminPreset,
    shopPreset: validIds.has(source.shopPreset) ? source.shopPreset : DEFAULT_THEME_CONFIG.shopPreset,
  };
};
