import jsPDF from 'jspdf';
import { RobotoRegular } from './fonts/Roboto-Regular.js';
import { RobotoBold } from './fonts/Roboto-Bold.js';
import { drawFormulaA4 } from './formulaA4Layout.js';

const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const materialId = entry => String(typeof entry?.ingredient_id === 'object' ? entry.ingredient_id?._id : entry?.ingredient_id || '');
const resolveMaterial = (entry, byId) => typeof entry?.ingredient_id === 'object' && entry.ingredient_id ? entry.ingredient_id : byId.get(materialId(entry));

export const getFormulaMaterialType = material => {
  const name = normalizeText(material?.name);
  const category = normalizeText(material?.category).trim();
  // Names identify wicks even in a mixed category such as "Sáp & Bấc".
  // Only use a wick category as an exclusion when it does not also include wax/oil.
  const wickPattern = /(?:^|[^\p{L}])(?:bấc|bac(?!\s+ha\b)|wicks?|tim nến|tim nen)(?=$|[^\p{L}])/iu;
  const isWickName = wickPattern.test(String(material?.name || '').normalize('NFC'));
  const isWickOnlyCategory = wickPattern.test(String(material?.category || '').normalize('NFC'))
    && !/\b(?:sap|wax|tinh dau|essential oil)\b/.test(category);
  if (isWickName || isWickOnlyCategory) return null;
  const isColor = ['mau ', 'mau sap', 'color', 'colour', 'pigment', 'dye', 'nhuom']
    .some(keyword => name.includes(keyword))
    || ['mau', 'mau nen', 'mau sap', 'color', 'pigment'].includes(category);
  if (isColor) return null;

  const text = `${name} ${category}`;
  if (/(?:^|\s)ipm(?:\s|$)/.test(text) || text.includes('isopropyl myristate')) return 'ipm';
  if (text.includes('tinh dau') || text.includes('essential oil')) return 'oil';
  if (text.includes('sap') || text.includes('wax')) return 'wax';
  return null;
};

const variantOptions = (product, sku) => {
  const options = new Map((product.variant_groups || []).flatMap(group => (group.options || []).map(option => [String(option.id), option.label])));
  const selectedIds = new Set((sku.combination || []).map(String));
  // Group order defines the primary name; do not depend on SKU combination order.
  const orderedIds = [...options.keys()].filter(id => selectedIds.has(id));
  const unknownIds = [...selectedIds].filter(id => !options.has(id));
  return [...orderedIds, ...unknownIds].map(id => ({ id, label: options.get(id) || id }));
};

const aggregate = (entries, byId, type) => {
  const rows = new Map();
  entries.forEach(entry => {
    const material = resolveMaterial(entry, byId);
    if (!material || getFormulaMaterialType(material) !== type) return;
    const isKilograms = ['kg', 'kilogram', 'kilograms'].includes(normalizeText(material.unit).trim());
    const unit = isKilograms ? 'g' : material.unit || '';
    const key = `${material._id || materialId(entry)}:${unit}`;
    const row = rows.get(key) || { name: material.name || 'Nguyên liệu', unit, quantity: 0 };
    row.quantity += Number(entry.quantity || 0) * (isKilograms ? 1000 : 1);
    rows.set(key, row);
  });
  return [...rows.values()];
};

const groupVariantsByOilFormula = variants => {
  const groups = new Map();
  variants.forEach(variant => {
    const signature = [...variant.oils.map(oil => ({ ...oil, type: 'oil' })), ...variant.ipms.map(ipm => ({ ...ipm, type: 'ipm' }))]
      .map(row => `${row.type}:${normalizeText(row.name)}:${row.quantity}:${normalizeText(row.unit)}`)
      .sort()
      .join('|');
    const existing = groups.get(signature);
    if (existing) {
      existing.variants.push(variant);
      return;
    }
    groups.set(signature, {
      variants: [variant],
      oils: variant.oils,
      ipms: variant.ipms,
    });
  });
  return [...groups.values()].map(group => {
    const firstOptions = group.variants[0].options;
    const commonOptions = firstOptions.filter(option => group.variants.every(variant => (
      variant.options.some(selected => selected.id === option.id)
    )));
    // Shorten duplicate recipes only when their primary name is shared.
    // Different primary names must not collapse into a shared packaging label.
    const sharedName = group.variants.length > 1 && commonOptions.length
      && commonOptions[0].id === firstOptions[0]?.id;
    const labels = sharedName
      ? [commonOptions.map(option => option.label).join(' · ')]
      : group.variants.map(variant => variant.options.map(option => option.label).join(' · ') || 'Mặc định');
    return { label: [...new Set(labels)].join(' / '), oils: group.oils, ipms: group.ipms };
  });
};

const combineFragranceRows = (oils, ipms) => {
  if (oils.length === 1 && ipms.length === 1) {
    return [{ ...oils[0], name: `${oils[0].name}/IPM`, ipmQuantity: ipms[0].quantity, ipmUnit: ipms[0].unit }];
  }
  return [...oils, ...ipms.map(row => ({ ...row, name: 'IPM' }))];
};

const buildProductFormula = (product, byId) => {
  const isSubFormula = product.product_type === 'sub_formula';
  // Sản phẩm có công thức phụ tách riêng thì phần công thức sản phẩm chỉ lấy base_ingredients trực tiếp,
  // không cộng dồn nguyên liệu của công thức phụ (resolved_base_ingredients) vào tờ in.
  const base = isSubFormula && !product.base_ingredients?.length
    ? product.resolved_base_ingredients || []
    : product.base_ingredients || [];
  const commonOil = base.filter(entry => getFormulaMaterialType(resolveMaterial(entry, byId)) === 'oil');
  const commonIpm = base.filter(entry => getFormulaMaterialType(resolveMaterial(entry, byId)) === 'ipm');
  const skus = product.skus?.length ? product.skus : [null];
  const variants = groupVariantsByOilFormula(skus.map(sku => ({
    options: sku ? variantOptions(product, sku) : [],
    oils: aggregate([...commonOil, ...(sku?.extra_ingredients || [])], byId, 'oil'),
    ipms: aggregate([...commonIpm, ...(sku?.extra_ingredients || [])], byId, 'ipm'),
  })).filter(variant => variant.oils.length || variant.ipms.length));
  if (variants.length === 1 && product.name) variants[0].label = isSubFormula ? 'Tỷ lệ pha' : product.name;
  variants.forEach(variant => { variant.fragrances = combineFragranceRows(variant.oils, variant.ipms); });
  return {
    productName: product.name,
    productCode: product.productId,
    waxIngredients: aggregate(base, byId, 'wax'),
    variants,
    isSubFormula,
    batchYield: Math.max(1, Number(product.batch_yield) || 1),
  };
};

const orderMainThenSub = items => [
  ...items.filter(item => item.product_type !== 'sub_formula' && !item.isSubFormula),
  ...items.filter(item => item.product_type === 'sub_formula' || item.isSubFormula),
];

export const buildFormulaSheets = (products = [], materials = []) => {
  const byId = new Map(materials.map(material => [String(material._id), material]));
  const sheets = products.map(product => buildProductFormula(product, byId)).filter(sheet => (
    sheet.isSubFormula
      ? sheet.waxIngredients.length || sheet.variants.length
      : sheet.waxIngredients.length && sheet.variants.some(variant => variant.oils.length)
  ));
  return orderMainThenSub(sheets);
};

export const getFormulaProducts = (products = [], materials = []) => {
  const byId = new Map(materials.map(material => [String(material._id), material]));
  const filtered = products.filter(product => {
    const formula = buildProductFormula(product, byId);
    return formula.isSubFormula
      ? formula.waxIngredients.length || formula.variants.length
      : formula.waxIngredients.length && formula.variants.some(variant => variant.oils.length);
  });
  return orderMainThenSub(filtered);
};

const fmt = value => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 4 });
const fit = (doc, text, width) => {
  let value = String(text || '');
  if (doc.getTextWidth(value) <= width) return value;
  while (value.length > 1 && doc.getTextWidth(`${value}…`) > width) value = value.slice(0, -1);
  return `${value}…`;
};
const rowAmount = (row, multiplier) => {
  const first = fmt(row.quantity * multiplier);
  if (row.ipmQuantity === undefined) return `${first}${row.unit ? ` ${row.unit}` : ''}`;
  const second = fmt(row.ipmQuantity * multiplier);
  if (normalizeText(row.unit).trim() === normalizeText(row.ipmUnit).trim()) return `${first}/${second}${row.unit ? ` ${row.unit}` : ''}`;
  return `${first}${row.unit ? ` ${row.unit}` : ''}/${second}${row.ipmUnit ? ` ${row.ipmUnit}` : ''}`;
};
const formulaText = (rows, multiplier) => rows
  .map(row => `${row.name} ${rowAmount(row, multiplier)}`)
  .join('  +  ');
const grams = (row, multiplier) => {
  const unit = normalizeText(row.unit).trim();
  if (['g', 'gram', 'grams'].includes(unit)) return row.quantity * multiplier;
  if (['kg', 'kilogram'].includes(unit)) return row.quantity * multiplier * 1000;
  return null;
};
const ratio = (wax, oils, multiplier) => {
  const waxValues = wax.map(row => grams(row, multiplier));
  const oilValues = oils.map(row => grams(row, multiplier));
  if (waxValues.some(value => value === null) || oilValues.some(value => value === null)) return null;
  const waxTotal = waxValues.reduce((sum, value) => sum + value, 0);
  return waxTotal ? oilValues.reduce((sum, value) => sum + value, 0) / waxTotal * 100 : null;
};

export const createFormulaSummaryPdf = ({ products, materials, width = 210, height = 297, batchQuantity = 1 }) => {
  const sheets = buildFormulaSheets(products, materials);
  if (!sheets.length) throw new Error('Không có sản phẩm hoặc công thức phụ phù hợp để in.');
  const pageWidth = Number(width), pageHeight = Number(height);
  const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';
  const JsPDF = jsPDF.jsPDF || jsPDF;
  const doc = new JsPDF({ orientation, unit: 'mm', format: [pageWidth, pageHeight], compress: true });
  doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular); doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', RobotoBold); doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  const actualWidth = doc.internal.pageSize.getWidth(), actualHeight = doc.internal.pageSize.getHeight();
  const margin = Math.max(4, Math.min(7, actualWidth * 0.07));
  const multiplier = Math.max(1, Number(batchQuantity) || 1);
  if (pageWidth === 210 && pageHeight === 297) {
    return drawFormulaA4(doc, sheets, multiplier, ratio);
  }
  const compact = actualHeight < 85;
  const firstPageCapacity = compact ? 2 : actualHeight >= 125 ? 7 : 4;
  const continuationCapacity = compact
    ? Math.max(3, Math.floor((actualHeight - margin * 2 - 16) / 8.5))
    : Math.max(4, Math.floor((actualHeight - margin * 2 - 18) / 10.5));
  let firstPage = true, pages = 0;

  sheets.forEach(sheet => {
    const sheetMultiplier = sheet.isSubFormula ? 1 : multiplier;
    const chunks = [sheet.variants.slice(0, firstPageCapacity)];
    for (let index = firstPageCapacity; index < sheet.variants.length; index += continuationCapacity) {
      chunks.push(sheet.variants.slice(index, index + continuationCapacity));
    }
    chunks.forEach((variants, chunkIndex) => {
      if (!firstPage) doc.addPage([pageWidth, pageHeight], orientation);
      firstPage = false; pages += 1;
      const isContinuation = chunkIndex > 0;
      const variantOffset = isContinuation
        ? firstPageCapacity + (chunkIndex - 1) * continuationCapacity
        : 0;
      let y;

      if (isContinuation) {
        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 5.2 : 6.2); doc.setTextColor(20, 20, 20);
        doc.text(fit(doc, `${sheet.productName} · Phân loại tiếp theo`, actualWidth - margin * 2 - 15), margin, margin + 3);
        doc.setFont('Roboto', 'normal'); doc.setFontSize(compact ? 4 : 4.8); doc.setTextColor(90, 90, 90);
        doc.text(`${chunkIndex + 1}/${chunks.length}`, actualWidth - margin, margin + 3, { align: 'right' });
        doc.setDrawColor(25, 25, 25); doc.setLineWidth(0.35);
        doc.line(margin, margin + 5, actualWidth - margin, margin + 5);
        y = margin + (compact ? 9 : 10);
      } else {
        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 5.4 : 6.5); doc.setTextColor(20, 20, 20);
        doc.text('CÔNG THỨC PHA CHẾ', margin, margin + 3);
        doc.setFont('Roboto', 'normal'); doc.setFontSize(compact ? 4 : 4.8); doc.setTextColor(90, 90, 90);
        doc.text(`${sheet.productCode}${chunks.length > 1 ? `  ·  1/${chunks.length}` : ''}`, actualWidth - margin, margin + 3, { align: 'right' });
        doc.setDrawColor(25, 25, 25); doc.setLineWidth(0.45);
        doc.line(margin, margin + 5, actualWidth - margin, margin + 5);

        y = margin + (compact ? 9 : 11);
        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 6.8 : 9); doc.setTextColor(15, 15, 15);
        doc.text(fit(doc, sheet.productName, actualWidth - margin * 2), margin, y);
        y += compact ? 4 : 5;
        doc.setFont('Roboto', 'normal'); doc.setFontSize(compact ? 4.1 : 4.9); doc.setTextColor(80, 80, 80);
        doc.text(`Mã: ${sheet.productCode}`, margin, y);
        doc.text(sheet.isSubFormula ? `1 mẻ: ${sheet.batchYield} sản phẩm` : `Số lượng mẻ: ${sheetMultiplier} sản phẩm`, actualWidth - margin, y, { align: 'right' });
        y += compact ? 5 : 7;

        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 4.7 : 5.7); doc.setTextColor(25, 25, 25);
        doc.text('1. CÔNG THỨC SÁP', margin, y);
        doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.2);
        doc.line(margin, y + 1.5, actualWidth - margin, y + 1.5);
        doc.setFont('Roboto', 'normal'); doc.setFontSize(compact ? 4.2 : 5);
        const waxLines = doc.splitTextToSize(formulaText(sheet.waxIngredients, sheetMultiplier), actualWidth - margin * 2 - 4).slice(0, 2);
        doc.text(waxLines, margin, y + (compact ? 4.8 : 6), { lineHeightFactor: 1.25 });
        y += compact ? 13 : 16;
        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 4.7 : 5.7); doc.setTextColor(25, 25, 25);
        doc.text('2. TINH DẦU / IPM THEO PHÂN LOẠI', margin, y);
        doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.2);
        doc.line(margin, y + 1.5, actualWidth - margin, y + 1.5);
        y += compact ? 3.3 : 4.5;
      }

      variants.forEach((variant, variantIndex) => {
        const fragranceRatio = ratio(sheet.waxIngredients, variant.oils, sheetMultiplier);
        const blockHeight = compact ? 7.5 : 9;
        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 4.4 : 5.1); doc.setTextColor(20, 20, 20);
        doc.text(fit(doc, `${variantOffset + variantIndex + 1}. ${variant.label}`, actualWidth - margin * 2 - 4), margin, y + (compact ? 3 : 3.5));
        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 4 : 4.7); doc.setTextColor(25, 25, 25);
        const summary = `${formulaText(variant.fragrances, sheetMultiplier)}${fragranceRatio !== null ? `  ·  ${fmt(fragranceRatio)}% lượng sáp` : ''}`;
        doc.text(fit(doc, summary, actualWidth - margin * 2), margin, y + (compact ? 6.1 : 7.2));
        doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.15);
        doc.line(margin, y + blockHeight, actualWidth - margin, y + blockHeight);
        y += blockHeight + (compact ? 1 : 1.5);
      });

      const footerY = actualHeight - margin - 3;
      doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.2); doc.line(margin, footerY, actualWidth - margin, footerY);
      doc.setFont('Roboto', 'normal'); doc.setFontSize(compact ? 3.8 : 4.5); doc.setTextColor(70, 70, 70);
      doc.text('Ngày: ____ / ____ / ______', margin, actualHeight - margin - 0.5);
      doc.text('Người pha: ______________', actualWidth - margin, actualHeight - margin - 0.5, { align: 'right' });
    });
  });
  return { doc, sheets: sheets.length, pages };
};

export const createFormulaPreviewUrl = options => {
  const { doc } = createFormulaSummaryPdf(options);
  return URL.createObjectURL(doc.output('blob'));
};

export const exportFormulaSummaryPdf = options => {
  const result = createFormulaSummaryPdf(options);
  const width = Number(options.width || 210);
  const height = Number(options.height || 297);
  const date = new Date().toISOString().slice(0, 10);
  const sizeLabel = width === 210 && height === 297 ? 'A4-mau' : `${width}x${height}mm`;
  result.doc.save(`cong-thuc-san-xuat-${sizeLabel}-${date}.pdf`);
  return { sheets: result.sheets, pages: result.pages };
};
