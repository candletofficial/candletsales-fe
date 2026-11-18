const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase();

export const isEssentialOilMaterial = (material) => {
  const text = normalize(`${material?.category || ''} ${material?.name || ''}`);
  const isColor = /(?:^|\s)(?:mau|color|colour|pigment|dye)(?:\s|$)/.test(text);
  return !isColor && (text.includes('tinh dau') || text.includes('essential oil'));
};

export const OIL_COLOR_OPTIONS = [
  { color: '#7c3aed', swatch: 'bg-violet-600' },
  { color: '#e11d48', swatch: 'bg-rose-600' },
  { color: '#d97706', swatch: 'bg-amber-600' },
  { color: '#059669', swatch: 'bg-emerald-600' },
  { color: '#0284c7', swatch: 'bg-sky-600' },
  { color: '#ea580c', swatch: 'bg-orange-600' },
  { color: '#57534e', swatch: 'bg-stone-600' },
];

const legacyColors = {
  lavender: '#7c3aed', rose: '#e11d48', amber: '#d97706', forest: '#059669',
  ocean: '#0284c7', citrus: '#ea580c', wood: '#57534e',
};
const validHex = (value) => /^#[0-9a-f]{6}$/i.test(String(value || ''));
export const getMaterialAppearance = (material) => {
  const isOil = isEssentialOilMaterial(material);
  if (!isOil) return { isOil: false, isConcentrated: false, textColor: '', label: '', color: '' };

  const seed = String(material?._id || material?.sku || material?.name || 'oil');
  const hash = [...seed].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 0);
  const fallback = OIL_COLOR_OPTIONS[hash % OIL_COLOR_OPTIONS.length].color;
  const stored = legacyColors[material?.oilColor] || material?.oilColor;
  const color = validHex(stored) ? stored.toLowerCase() : fallback;
  const isConcentrated = Boolean(material?.isConcentratedOil);
  return {
    isOil: true,
    isConcentrated,
    textColor: color,
    label: 'Tinh dầu',
    concentrationLabel: isConcentrated ? 'Đậm đặc' : '',
    color,
  };
};

export const materialSelectOption = (material, label) => {
  const appearance = getMaterialAppearance(material);
  return {
    value: material._id,
    label,
    toneColor: appearance.isOil ? appearance.textColor : '',
    badge: appearance.concentrationLabel,
    badgeClass: appearance.concentrationLabel ? 'text-slate-700 ring-slate-400/50' : '',
  };
};
