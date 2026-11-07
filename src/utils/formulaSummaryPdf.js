import jsPDF from 'jspdf';
import { RobotoRegular } from './fonts/Roboto-Regular';
import { RobotoBold } from './fonts/Roboto-Bold';

const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const materialId = entry => String(typeof entry?.ingredient_id === 'object' ? entry.ingredient_id?._id : entry?.ingredient_id || '');
const resolveMaterial = (entry, byId) => typeof entry?.ingredient_id === 'object' && entry.ingredient_id ? entry.ingredient_id : byId.get(materialId(entry));

export const getFormulaMaterialType = material => {
  const text = normalizeText(`${material?.name || ''} ${material?.category || ''}`);
  if (text.includes('tinh dau') || text.includes('essential oil')) return 'oil';
  if (text.includes('sap') || text.includes('wax')) return 'wax';
  return null;
};

const variantLabel = (product, sku) => {
  const options = new Map((product.variant_groups || []).flatMap(group => (group.options || []).map(option => [String(option.id), option.label])));
  return (sku.combination || []).map(id => options.get(String(id)) || id).join(' · ') || 'Mặc định';
};

const aggregate = (entries, byId, type) => {
  const rows = new Map();
  entries.forEach(entry => {
    const material = resolveMaterial(entry, byId);
    if (!material || getFormulaMaterialType(material) !== type) return;
    const unit = material.unit || '';
    const key = `${material._id || materialId(entry)}:${unit}`;
    const row = rows.get(key) || { name: material.name || 'Nguyên liệu', unit, quantity: 0 };
    row.quantity += Number(entry.quantity || 0);
    rows.set(key, row);
  });
  return [...rows.values()];
};

const groupVariantsByOilFormula = variants => {
  const groups = new Map();
  variants.forEach(variant => {
    const signature = variant.oils
      .map(oil => `${normalizeText(oil.name)}:${oil.quantity}:${normalizeText(oil.unit)}`)
      .sort()
      .join('|');
    const existing = groups.get(signature);
    if (existing) {
      existing.labels.push(variant.label);
      return;
    }
    groups.set(signature, {
      labels: [variant.label],
      oils: variant.oils,
    });
  });
  return [...groups.values()].map(group => ({
    label: [...new Set(group.labels)].join(' / '),
    oils: group.oils,
  }));
};

const buildProductFormula = (product, byId) => {
  const base = product.base_ingredients || [];
  const commonOil = base.filter(entry => getFormulaMaterialType(resolveMaterial(entry, byId)) === 'oil');
  const skus = product.skus?.length ? product.skus : [null];
  return {
    productName: product.name,
    productCode: product.productId,
    waxIngredients: aggregate(base, byId, 'wax'),
    variants: groupVariantsByOilFormula(skus.map(sku => ({
      label: sku ? variantLabel(product, sku) : 'Mặc định',
      oils: aggregate([...commonOil, ...(sku?.extra_ingredients || [])], byId, 'oil'),
    })).filter(variant => variant.oils.length)),
  };
};

export const buildFormulaSheets = (products = [], materials = []) => {
  const byId = new Map(materials.map(material => [String(material._id), material]));
  return products.map(product => buildProductFormula(product, byId)).filter(sheet => sheet.waxIngredients.length && sheet.variants.length);
};

export const getFormulaProducts = (products = [], materials = []) => {
  const byId = new Map(materials.map(material => [String(material._id), material]));
  return products.filter(product => {
    const formula = buildProductFormula(product, byId);
    return formula.waxIngredients.length && formula.variants.length;
  });
};

const fmt = value => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 4 });
const fit = (doc, text, width) => {
  let value = String(text || '');
  if (doc.getTextWidth(value) <= width) return value;
  while (value.length > 1 && doc.getTextWidth(`${value}…`) > width) value = value.slice(0, -1);
  return `${value}…`;
};
const formulaText = (rows, multiplier) => rows
  .map(row => `${row.name} ${fmt(row.quantity * multiplier)}${row.unit ? ` ${row.unit}` : ''}`)
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

export const createFormulaSummaryPdf = ({ products, materials, width = 70, height = 100, batchQuantity = 1 }) => {
  const sheets = buildFormulaSheets(products, materials);
  if (!sheets.length) throw new Error('Không có sản phẩm đồng thời chứa công thức sáp và tinh dầu.');
  const pageWidth = Number(width), pageHeight = Number(height);
  const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: [pageWidth, pageHeight], compress: true });
  doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular); doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', RobotoBold); doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  const actualWidth = doc.internal.pageSize.getWidth(), actualHeight = doc.internal.pageSize.getHeight();
  const margin = Math.max(4, Math.min(7, actualWidth * 0.07));
  const multiplier = Math.max(1, Number(batchQuantity) || 1);
  const compact = actualHeight < 85;
  const firstPageCapacity = compact ? 2 : actualHeight >= 125 ? 7 : 4;
  const continuationCapacity = compact
    ? Math.max(3, Math.floor((actualHeight - margin * 2 - 16) / 8.5))
    : Math.max(4, Math.floor((actualHeight - margin * 2 - 18) / 10.5));
  let firstPage = true, pages = 0;

  sheets.forEach(sheet => {
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
        doc.text(`Số lượng mẻ: ${multiplier} sản phẩm`, actualWidth - margin, y, { align: 'right' });
        y += compact ? 5 : 7;

        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 4.7 : 5.7); doc.setTextColor(25, 25, 25);
        doc.text('1. CÔNG THỨC SÁP', margin, y);
        doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.2);
        doc.line(margin, y + 1.5, actualWidth - margin, y + 1.5);
        doc.setFont('Roboto', 'normal'); doc.setFontSize(compact ? 4.2 : 5);
        const waxLines = doc.splitTextToSize(formulaText(sheet.waxIngredients, multiplier), actualWidth - margin * 2 - 4).slice(0, 2);
        doc.text(waxLines, margin, y + (compact ? 4.8 : 6), { lineHeightFactor: 1.25 });
        y += compact ? 13 : 16;
        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 4.7 : 5.7); doc.setTextColor(25, 25, 25);
        doc.text('2. TINH DẦU THEO PHÂN LOẠI', margin, y);
        doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.2);
        doc.line(margin, y + 1.5, actualWidth - margin, y + 1.5);
        y += compact ? 3.3 : 4.5;
      }

      variants.forEach((variant, variantIndex) => {
        const fragranceRatio = ratio(sheet.waxIngredients, variant.oils, multiplier);
        const blockHeight = compact ? 7.5 : 9;
        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 4.4 : 5.1); doc.setTextColor(20, 20, 20);
        doc.text(fit(doc, `${variantOffset + variantIndex + 1}. ${variant.label}`, actualWidth - margin * 2 - 4), margin, y + (compact ? 3 : 3.5));
        doc.setFont('Roboto', 'bold'); doc.setFontSize(compact ? 4 : 4.7); doc.setTextColor(25, 25, 25);
        const summary = `${formulaText(variant.oils, multiplier)}${fragranceRatio !== null ? `  ·  ${fmt(fragranceRatio)}% lượng sáp` : ''}`;
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
  const width = Number(options.width || 70);
  const height = Number(options.height || 100);
  const date = new Date().toISOString().slice(0, 10);
  result.doc.save(`cong-thuc-san-xuat-${width}x${height}mm-${date}.pdf`);
  return { sheets: result.sheets, pages: result.pages };
};
