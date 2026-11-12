import jsPDF from 'jspdf';
import { RobotoRegular } from './fonts/Roboto-Regular';
import { RobotoBold } from './fonts/Roboto-Bold';

const PAGE_WIDTH = 74;
const PAGE_HEIGHT = 105;
const PAGE_MARGIN = 3;
const COLUMN_GAP = 2;
const COLUMN_COUNT = 2;
const ROW_COUNT = 7;

const fitLabelText = (doc, text, maxWidth) => {
  let fontSize = 10;
  let lines = [];
  while (fontSize > 7) {
    doc.setFontSize(fontSize);
    lines = doc.splitTextToSize(text, maxWidth);
    if (lines.length <= 2) break;
    fontSize -= 0.5;
  }
  if (fontSize <= 7) {
    fontSize = 7;
    doc.setFontSize(fontSize);
    lines = doc.splitTextToSize(text, maxWidth);
  }
  if (lines.length > 2) {
    lines = lines.slice(0, 2);
    let lastLine = lines[1];
    while (lastLine.length > 1 && doc.getTextWidth(`${lastLine}…`) > maxWidth) lastLine = lastLine.slice(0, -1);
    lines[1] = `${lastLine}…`;
  }
  return { fontSize, lines };
};

export const createEssentialOilLabelsPdf = (oils = []) => {
  const labels = oils
    .filter((oil) => oil?.name)
    .map((oil) => {
      const name = oil.name
        .replace(/tinh\s*dầu/giu, '')
        .replace(/^\s*[-:–—]+|[-:–—]+\s*$/gu, '')
        .trim();
      return `${name} (${oil.sku || 'Chưa có SKU'})`;
    });
  if (!labels.length) throw new Error('Không có tinh dầu để in tem.');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_WIDTH, PAGE_HEIGHT], compress: true });
  doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', RobotoBold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  doc.setFont('Roboto', 'bold');

  const usableWidth = PAGE_WIDTH - (PAGE_MARGIN * 2) - COLUMN_GAP;
  const columnWidth = usableWidth / COLUMN_COUNT;
  const rowHeight = (PAGE_HEIGHT - (PAGE_MARGIN * 2)) / ROW_COUNT;
  const labelsPerPage = COLUMN_COUNT * ROW_COUNT;

  labels.forEach((label, index) => {
    if (index > 0 && index % labelsPerPage === 0) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
    const pageIndex = index % labelsPerPage;
    const row = Math.floor(pageIndex / COLUMN_COUNT);
    const column = pageIndex % COLUMN_COUNT;
    const x = PAGE_MARGIN + (column * (columnWidth + COLUMN_GAP));
    const y = PAGE_MARGIN + (row * rowHeight);

    doc.setDrawColor(165, 165, 165);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1, 0.7], 0);
    doc.rect(x, y, columnWidth, rowHeight);

    const { fontSize, lines } = fitLabelText(doc, label, columnWidth - 3.5);
    doc.setFontSize(fontSize);
    doc.setTextColor(20, 20, 20);
    const lineHeight = fontSize * 0.38;
    const blockHeight = lines.length * lineHeight;
    const startY = y + ((rowHeight - blockHeight) / 2) + (lineHeight * 0.72);
    doc.text(lines, x + (columnWidth / 2), startY, { align: 'center', lineHeightFactor: 1.1 });
  });

  doc.setLineDashPattern([], 0);
  if (typeof doc.autoPrint === 'function') doc.autoPrint();
  return URL.createObjectURL(doc.output('blob'));
};
