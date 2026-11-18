import autoTableModule from 'jspdf-autotable';

const autoTable = autoTableModule.default || autoTableModule;

const GREEN = [26, 77, 62];
const GREEN_SOFT = [235, 244, 239];
const GREEN_SUB = [212, 232, 224];
const GREEN_BORDER = [192, 210, 202];

const INDIGO = [46, 66, 104];
const INDIGO_SOFT = [237, 241, 250];
const INDIGO_SUB = [216, 226, 246];
const INDIGO_BORDER = [194, 206, 226];

const WAX_BG = [249, 242, 230];
const WAX_TEXT = [132, 72, 22];

const INK = [33, 43, 39];
const MUTED = [102, 114, 107];
const ZEBRA = [247, 249, 248];
const COL_HEAD_BG = [244, 246, 245];

const fmt = value => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 4 });
const fmtRatio = value => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const oilName = name => String(name || '').replace(/^tinh\s+d[aầ]u\s+/iu, '');

const amount = (row, multiplier) => {
  const first = fmt(row.quantity * multiplier);
  if (row.ipmQuantity === undefined) return first + (row.unit ? ' ' + row.unit : '');
  const second = fmt(row.ipmQuantity * multiplier);
  if (String(row.unit || '').toLowerCase() === String(row.ipmUnit || '').toLowerCase()) {
    return first + '/' + second + (row.unit ? ' ' + row.unit : '');
  }
  return first + (row.unit ? ' ' + row.unit : '') + '/' + second + (row.ipmUnit ? ' ' + row.ipmUnit : '');
};

const totalWaxLabel = (waxIngredients, multiplier) => {
  if (!waxIngredients.length) return '';
  const allGrams = waxIngredients.every(row => ['g', 'gram', 'grams'].includes(String(row.unit || '').trim().toLowerCase()));
  if (!allGrams) return `${waxIngredients.length} nguyên liệu`;
  const total = waxIngredients.reduce((sum, row) => sum + Number(row.quantity || 0) * multiplier, 0);
  return `Tổng: ${fmt(total)} g`;
};

const DENSITY_PRESETS = [
  { titleSize: 14.2, subSize: 8.4, sectionSize: 9.0, bodySize: 10.4, amountSize: 11.2, padY: 2.5, padX: 3.0, gap: 6.5 },
  { titleSize: 13.2, subSize: 8.0, sectionSize: 8.6, bodySize: 9.8, amountSize: 10.6, padY: 2.1, padX: 2.8, gap: 5.5 },
  { titleSize: 12.2, subSize: 7.6, sectionSize: 8.2, bodySize: 9.2, amountSize: 10.0, padY: 1.7, padX: 2.5, gap: 4.5 },
  { titleSize: 11.2, subSize: 7.3, sectionSize: 7.8, bodySize: 8.6, amountSize: 9.4, padY: 1.35, padX: 2.2, gap: 3.8 },
  { titleSize: 10.2, subSize: 7.0, sectionSize: 7.4, bodySize: 8.0, amountSize: 8.8, padY: 1.05, padX: 2.0, gap: 3.0 },
];

export const drawFormulaA4 = (doc, sheets, multiplier, getRatio) => {
  const left = 10, width = 190, top = 29, bottom = 278, gutter = 6;
  const pageMeta = new Map();

  const text = (value, x, y, size, color = INK, bold = false, options = {}) => {
    doc.setFont('Roboto', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(String(value || ''), x, y, options);
  };

  const isSingleSimpleVariant = sheet => (
    sheet.variants.length === 1
    && (!sheet.variants[0].label || sheet.variants[0].label === sheet.productName || sheet.variants[0].label === 'Tỷ lệ pha')
  );

  const buildRows = (sheet, preset, sheetMultiplier) => {
    const isSub = sheet.isSubFormula;
    const accent = isSub ? INDIGO : GREEN;
    const accentSoft = isSub ? INDIGO_SOFT : GREEN_SOFT;
    const rows = [];

    if (sheet.waxIngredients.length) {
      const waxSummary = totalWaxLabel(sheet.waxIngredients, sheetMultiplier);
      rows.push([
        {
          content: '01 · SÁP CHUNG',
          styles: {
            fillColor: WAX_BG, textColor: WAX_TEXT, fontStyle: 'bold',
            fontSize: preset.sectionSize,
            cellPadding: { top: preset.padY, bottom: preset.padY, left: preset.padX, right: 1 },
          },
        },
        {
          content: waxSummary,
          colSpan: 2,
          styles: {
            fillColor: WAX_BG, textColor: WAX_TEXT, fontStyle: 'bold',
            fontSize: preset.sectionSize - 0.2, halign: 'right',
            cellPadding: { top: preset.padY, bottom: preset.padY, left: 1, right: preset.padX },
          },
        },
      ]);

      sheet.waxIngredients.forEach(row => {
        rows.push([
          {
            content: row.name,
            colSpan: 2,
            styles: {
              fontSize: preset.bodySize, textColor: INK,
              cellPadding: { top: preset.padY, bottom: preset.padY, left: preset.padX, right: 2 },
            },
          },
          {
            content: amount(row, sheetMultiplier),
            styles: {
              fontStyle: 'bold', textColor: INK, fontSize: preset.amountSize, halign: 'right',
              cellPadding: { top: preset.padY, bottom: preset.padY, left: 1, right: preset.padX },
            },
          },
        ]);
      });
    }

    if (sheet.variants.length) {
      const sectionNum = sheet.waxIngredients.length ? '02' : '01';
      const singleSimple = isSingleSimpleVariant(sheet);

      if (singleSimple) {
        const variant = sheet.variants[0];
        const ratio = getRatio(sheet.waxIngredients, variant.oils, sheetMultiplier);
        const ratioLabel = ratio === null
          ? (isSub ? `1 mẻ = ${sheet.batchYield} SP` : '1 công thức')
          : `Tỷ lệ: ${fmtRatio(ratio)}% sáp`;
        rows.push([
          {
            content: `${sectionNum} · TINH DẦU / IPM`,
            styles: {
              fillColor: accentSoft, textColor: accent, fontStyle: 'bold',
              fontSize: preset.sectionSize,
              cellPadding: { top: preset.padY, bottom: preset.padY, left: preset.padX, right: 1 },
            },
          },
          {
            content: ratioLabel,
            colSpan: 2,
            styles: {
              fillColor: accentSoft, textColor: accent, fontStyle: 'bold',
              fontSize: preset.sectionSize - 0.2, halign: 'right',
              cellPadding: { top: preset.padY, bottom: preset.padY, left: 1, right: preset.padX },
            },
          },
        ]);

        variant.fragrances.forEach(row => {
          rows.push([
            {
              content: oilName(row.name),
              colSpan: 2,
              styles: {
                fontSize: preset.bodySize, textColor: INK,
                cellPadding: { top: preset.padY, bottom: preset.padY, left: preset.padX, right: 2 },
              },
            },
            {
              content: amount(row, sheetMultiplier),
              styles: {
                fontStyle: 'bold', textColor: accent, fontSize: preset.amountSize, halign: 'right',
                cellPadding: { top: preset.padY, bottom: preset.padY, left: 1, right: preset.padX },
              },
            },
          ]);
        });
      } else {
        const hasAnyRatio = sheet.variants.some(v => getRatio(sheet.waxIngredients, v.oils, sheetMultiplier) !== null);
        rows.push([
          {
            content: `${sectionNum} · TINH DẦU / IPM`,
            styles: {
              fillColor: accentSoft, textColor: accent, fontStyle: 'bold',
              fontSize: preset.sectionSize,
              cellPadding: { top: preset.padY, bottom: preset.padY, left: preset.padX, right: 1 },
            },
          },
          {
            content: `${sheet.variants.length} phân loại mùi`,
            colSpan: 2,
            styles: {
              fillColor: accentSoft, textColor: accent, fontStyle: 'bold',
              fontSize: preset.sectionSize - 0.2, halign: 'right',
              cellPadding: { top: preset.padY, bottom: preset.padY, left: 1, right: preset.padX },
            },
          },
        ]);

        rows.push([
          {
            content: hasAnyRatio ? 'Phân loại (% sáp)' : 'Phân loại mùi',
            styles: {
              fillColor: COL_HEAD_BG, textColor: MUTED, fontStyle: 'bold',
              fontSize: preset.subSize,
              cellPadding: { top: 1.5, bottom: 1.5, left: preset.padX, right: 1 },
            },
          },
          {
            content: 'Tinh dầu / IPM',
            styles: {
              fillColor: COL_HEAD_BG, textColor: MUTED, fontStyle: 'bold',
              fontSize: preset.subSize,
              cellPadding: { top: 1.5, bottom: 1.5, left: 1.2, right: 1.2 },
            },
          },
          {
            content: 'Định lượng',
            styles: {
              fillColor: COL_HEAD_BG, textColor: MUTED, fontStyle: 'bold',
              fontSize: preset.subSize, halign: 'right',
              cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: preset.padX },
            },
          },
        ]);

        sheet.variants.forEach((variant, variantIndex) => {
          const ratio = getRatio(sheet.waxIngredients, variant.oils, sheetMultiplier);
          const ratioBadge = ratio === null ? '' : ` (${fmtRatio(ratio)}%)`;
          const rowBg = variantIndex % 2 === 1 ? ZEBRA : [255, 255, 255];
          const fragrances = variant.fragrances.length ? variant.fragrances : [{ name: '—', quantity: 0, unit: '' }];

          fragrances.forEach((fragrance, fragIndex) => {
            rows.push([
              {
                content: fragIndex === 0 ? `${variantIndex + 1}. ${variant.label}${ratioBadge}` : '',
                styles: {
                  fillColor: rowBg, textColor: INK, fontStyle: 'bold',
                  fontSize: preset.bodySize - 0.2,
                  cellPadding: { top: preset.padY, bottom: preset.padY, left: preset.padX, right: 1 },
                },
              },
              {
                content: oilName(fragrance.name),
                styles: {
                  fillColor: rowBg, textColor: INK, fontStyle: 'normal',
                  fontSize: preset.bodySize - 0.2,
                  cellPadding: { top: preset.padY, bottom: preset.padY, left: 1.2, right: 1.2 },
                },
              },
              {
                content: amount(fragrance, sheetMultiplier),
                styles: {
                  fillColor: rowBg, textColor: accent, fontStyle: 'bold',
                  fontSize: preset.amountSize - 0.2, halign: 'right',
                  cellPadding: { top: preset.padY, bottom: preset.padY, left: 1, right: preset.padX },
                },
              },
            ]);
          });
        });
      }
    }

    return rows;
  };

  const makeBlock = (sheet, blockWidth, preset, sheetMultiplier) => {
    const isSub = sheet.isSubFormula;
    const headerBg = isSub ? INDIGO : GREEN;
    const subColor = isSub ? INDIGO_SUB : GREEN_SUB;
    const borderColor = isSub ? INDIGO_BORDER : GREEN_BORDER;

    const codePart = sheet.productCode ? `Mã: ${sheet.productCode}   ·   ` : '';
    const metaPart = isSub
      ? `Định lượng 1 mẻ = ${sheet.batchYield} sản phẩm`
      : `${sheet.variants.length} công thức   ·   Mẻ ${fmt(sheetMultiplier)} SP`;

    const head = [
      [{
        content: sheet.productName || 'Sản phẩm',
        colSpan: 3,
        styles: {
          fillColor: headerBg, textColor: [255, 255, 255], fontStyle: 'bold',
          fontSize: blockWidth === width ? preset.titleSize + 2 : preset.titleSize,
          cellPadding: { top: preset.padY + 0.8, bottom: 0.6, left: preset.padX, right: preset.padX },
          lineWidth: 0,
        },
      }],
      [{
        content: codePart + metaPart,
        colSpan: 3,
        styles: {
          fillColor: headerBg, textColor: subColor, fontStyle: 'normal',
          fontSize: preset.subSize,
          cellPadding: { top: 0, bottom: preset.padY + 0.6, left: preset.padX, right: preset.padX },
          lineWidth: 0,
        },
      }],
    ];

    const body = buildRows(sheet, preset, sheetMultiplier);
    const amountWidth = blockWidth === width ? 36 : 21;
    const oilWidth = blockWidth === width ? 52 : 27.5;
    const labelWidth = blockWidth - oilWidth - amountWidth;
    const colWidths = [labelWidth, oilWidth, amountWidth];

    const height = [...head, ...body].reduce((sum, row) => {
      let colCursor = 0;
      const rowHeight = Math.max(...row.map(cell => {
        const span = cell.colSpan || 1;
        const cellWidth = colWidths.slice(colCursor, colCursor + span).reduce((acc, w) => acc + w, 0);
        colCursor += span;
        const styles = cell.styles || {};
        const fontSize = styles.fontSize || preset.bodySize;
        const cellPadding = styles.cellPadding || preset.padY;
        const pad = side => typeof cellPadding === 'number' ? cellPadding : cellPadding[side] ?? 0;
        doc.setFont('Roboto', styles.fontStyle || 'normal');
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(String(cell.content || ''), Math.max(8, cellWidth - pad('left') - pad('right')));
        return lines.length * fontSize * 1.18 / doc.internal.scaleFactor + pad('top') + pad('bottom');
      }));
      return sum + rowHeight;
    }, 0);

    return {
      sheet,
      head,
      body,
      height: height + 1.5,
      preset,
      colWidths,
      borderColor,
      sheetMultiplier,
    };
  };

  const simulateLayout = (groupSheets, columns, columnWidth, preset) => {
    const buildBlocks = list => list.map(sheet => {
      const sheetMultiplier = sheet.isSubFormula ? 1 : multiplier;
      return makeBlock(sheet, columns === 1 ? width : columnWidth, preset, sheetMultiplier);
    });

    const runOrder = blocks => {
      let pagesUsed = 1;
      let positions = Array(columns).fill(top);
      const placements = [];
      for (const block of blocks) {
        let col = positions.indexOf(Math.min(...positions));
        if (positions[col] + block.height > bottom && positions.some(y => y > top)) {
          pagesUsed += 1;
          positions = Array(columns).fill(top);
          col = 0;
        }
        placements.push({ block, col });
        if (block.height > bottom - top) {
          positions = Array(columns).fill(bottom);
        } else {
          positions[col] += block.height + preset.gap;
        }
      }
      return { pagesUsed, maxBottom: Math.max(...positions), placements };
    };

    const initialBlocks = buildBlocks(groupSheets);
    const natural = runOrder(initialBlocks);
    if (natural.pagesUsed === 1 || groupSheets.length <= 2) return natural;

    // Nếu thứ tự mặc định bị tràn trang do xen kẽ thẻ ngắn - thẻ dài,
    // thử sắp xếp thẻ cao trước (First-Fit Decreasing) để ưu tiên gom gọn trong 1 tờ A4.
    const sortedBlocks = [...initialBlocks].sort((a, b) => b.height - a.height);
    const balanced = runOrder(sortedBlocks);
    return balanced.pagesUsed < natural.pagesUsed ? balanced : natural;
  };

  const mainSheets = sheets.filter(sheet => !sheet.isSubFormula);
  const subSheets = sheets.filter(sheet => sheet.isSubFormula);
  const groups = [];
  if (mainSheets.length) groups.push({ isSubFormula: false, sheets: mainSheets });
  if (subSheets.length) groups.push({ isSubFormula: true, sheets: subSheets });

  groups.forEach((group, groupIndex) => {
    if (groupIndex > 0) {
      doc.addPage('a4', 'portrait');
    }
    const groupStartPage = doc.getNumberOfPages();
    const columns = group.sheets.length > 1 ? 2 : 1;
    const columnWidth = columns === 1 ? width : (width - gutter) / 2;

    let chosen = null;
    for (const preset of DENSITY_PRESETS) {
      const candidate = simulateLayout(group.sheets, columns, columnWidth, preset);
      chosen = { preset, ...candidate };
      if (candidate.pagesUsed === 1) break;
    }

    let positions = Array(columns).fill(top);
    chosen.placements.forEach(({ block }) => {
      let col = positions.indexOf(Math.min(...positions));
      if (positions[col] + block.height > bottom && positions.some(y => y > top)) {
        doc.addPage('a4', 'portrait');
        positions = Array(columns).fill(top);
        col = 0;
      }

      const oversized = block.height > bottom - top;
      const activeBlock = oversized
        ? makeBlock(block.sheet, width, DENSITY_PRESETS.at(-1), block.sheetMultiplier)
        : block;
      const blockWidth = oversized || columns === 1 ? width : columnWidth;
      const x = oversized || columns === 1 ? left : left + col * (columnWidth + gutter);
      const startY = positions[col];
      const beforePage = doc.getNumberOfPages();

      autoTable(doc, {
        startY,
        margin: { left: x, right: 210 - x - blockWidth, top, bottom: 20 },
        tableWidth: blockWidth,
        theme: 'plain',
        head: activeBlock.head,
        body: activeBlock.body,
        styles: {
          font: 'Roboto',
          fontSize: activeBlock.preset.bodySize,
          textColor: INK,
          overflow: 'linebreak',
          lineColor: [226, 231, 228],
          lineWidth: { bottom: 0.15 },
        },
        columnStyles: {
          0: { cellWidth: activeBlock.colWidths[0] },
          1: { cellWidth: activeBlock.colWidths[1] },
          2: { cellWidth: activeBlock.colWidths[2], halign: 'right' },
        },
        rowPageBreak: 'avoid',
      });

      const afterPage = doc.getNumberOfPages();
      const finalY = doc.lastAutoTable.finalY;

      if (afterPage === beforePage) {
        doc.setDrawColor(...activeBlock.borderColor);
        doc.setLineWidth(0.35);
        doc.rect(x, startY, blockWidth, finalY - startY);
        positions[col] = finalY + activeBlock.preset.gap;
      } else {
        positions = Array(columns).fill(bottom);
      }
    });

    const groupEndPage = doc.getNumberOfPages();
    for (let page = groupStartPage; page <= groupEndPage; page++) {
      pageMeta.set(page, {
        isSubFormula: group.isSubFormula,
        count: group.sheets.length,
        groupPage: page - groupStartPage + 1,
        groupPages: groupEndPage - groupStartPage + 1,
      });
    }
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const meta = pageMeta.get(page) || { isSubFormula: false, count: sheets.length };
    const accent = meta.isSubFormula ? INDIGO : GREEN;

    text(
      meta.isSubFormula ? 'CANDLET  ·  CÔNG THỨC PHỤ TÁCH RIÊNG' : 'CANDLET  ·  CÔNG THỨC SẢN PHẨM CHÍNH',
      left,
      11.5,
      8.5,
      accent,
      true,
    );
    text(
      meta.isSubFormula ? 'PHIẾU PHA CHẾ · CÔNG THỨC PHỤ' : 'PHIẾU PHA CHẾ SẢN PHẨM',
      left,
      20.5,
      17.5,
      INK,
      true,
    );

    const rightTopText = meta.isSubFormula
      ? 'Định lượng tính theo 1 mẻ mỗi công thức'
      : `Quy mô mẻ: ${fmt(multiplier)} sản phẩm / phân loại`;
    const rightSubText = meta.isSubFormula
      ? `${meta.count} công thức phụ  ·  Không gộp vào công thức chính`
      : `${meta.count} sản phẩm chính  ·  Sáp & Tinh dầu / IPM`;

    text(rightTopText, 200, 13.5, 9.5, accent, true, { align: 'right' });
    text(rightSubText, 200, 19.5, 8.2, MUTED, false, { align: 'right' });

    doc.setDrawColor(...accent);
    doc.setLineWidth(0.6);
    doc.line(left, 24.5, 200, 24.5);

    doc.setDrawColor(216, 222, 218);
    doc.setLineWidth(0.25);
    doc.line(left, 281, 200, 281);

    text('Ngày pha: ____ / ____ / ______', left, 286.5, 8.8, MUTED);
    text('Người thực hiện: ______________________', 85, 286.5, 8.8, MUTED);
    text(`Trang ${page} / ${pages}`, 200, 286.5, 9, accent, true, { align: 'right' });
  }

  return { doc, sheets: sheets.length, pages };
};
