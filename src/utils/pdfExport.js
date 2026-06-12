import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { RobotoRegular } from './fonts/Roboto-Regular';
import { RobotoBold } from './fonts/Roboto-Bold';

export const exportDashboardToPDF = async (data, periodLabel) => {
  // 1. Khởi tạo jsPDF (A4 dọc)
  const doc = new jsPDF('p', 'mm', 'a4');

  // 2. Add Roboto font để hỗ trợ Tiếng Việt
  doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  
  doc.addFileToVFS('Roboto-Bold.ttf', RobotoBold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  // Đặt font mặc định
  doc.setFont('Roboto', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  const fmtCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  const fmtNum = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

  // --- HEADER ---
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 64, 175); // Primary color (blue-800)
  doc.text('BÁO CÁO KINH DOANH', pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 8;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.text(`Candlet Shop - Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 5;
  doc.text(`Kỳ báo cáo: ${periodLabel}`, pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 10;
  
  // Vẽ đường kẻ ngang
  doc.setDrawColor(209, 213, 219);
  doc.line(15, currentY, pageWidth - 15, currentY);
  currentY += 10;

  // --- SUMMARY STATS ---
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39); // Gray-900
  doc.text('1. Tổng quan chỉ số', 15, currentY);
  currentY += 10;

  const stats = [
    { label: 'Tổng Doanh Thu', value: fmtCurrency(data?.totalRevenue) },
    { label: 'Lợi Nhuận Thực Tế', value: fmtCurrency(data?.realProfit) },
    { label: 'Số Đơn Hàng Mới', value: `${data?.newOrders || 0} đơn` },
    { label: 'Đơn Bị Hoàn', value: `${data?.returnedOrders || 0} đơn` }
  ];

  autoTable(doc, {
    startY: currentY,
    head: [[stats[0].label, stats[1].label, stats[2].label, stats[3].label]],
    body: [[stats[0].value, stats[1].value, stats[2].value, stats[3].value]],
    theme: 'grid',
    headStyles: { fillColor: [219, 234, 254], textColor: [30, 58, 138], font: 'Roboto', fontStyle: 'bold', halign: 'center' },
    bodyStyles: { font: 'Roboto', fontStyle: 'bold', fontSize: 13, textColor: [17, 24, 39], halign: 'center' },
    margin: { left: 15, right: 15 },
  });

  currentY = doc.lastAutoTable.finalY + 15;

  // --- CHI TIẾT CHI PHÍ & HIỆU QUẢ ---
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text('2. Chi tiết Cấu trúc Chi phí & Hiệu quả', 15, currentY);
  currentY += 5;

  const costStats = [
    ['Giá trị xuất kho (COGS)', fmtCurrency(data?.cogs)],
    ['Chi phí Quảng cáo', fmtCurrency(data?.adCost)],
    ['Chi phí Vận chuyển', fmtCurrency(data?.logisticsCost)],
    ['Thiệt hại hoàn hàng', fmtCurrency(data?.returnCost)],
    ['Chi phí đơn giao bù', fmtCurrency(data?.replacementCost)],
    ['Biên lợi nhuận ròng', data?.totalRevenue ? ((data?.realProfit / data?.totalRevenue) * 100).toFixed(1) + '%' : '0%']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Khoản mục chi phí', 'Giá trị']],
    body: costStats,
    theme: 'striped',
    headStyles: { fillColor: [243, 244, 246], textColor: [107, 114, 128], font: 'Roboto', fontStyle: 'bold' },
    bodyStyles: { font: 'Roboto' },
    margin: { left: 15, right: 15 },
  });

  currentY = doc.lastAutoTable.finalY + 15;

  // --- TOP SẢN PHẨM ---
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text('3. Top Sản phẩm Nổi bật', 15, currentY);
  currentY += 5;

  let topProducts = [];
  if (data?.productStats && data.productStats.length > 0) {
    topProducts = [...data.productStats]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map(p => [
        p.product_name || 'Không rõ', 
        `${fmtNum(p.totalQty)} cái`, 
        fmtCurrency(p.totalRevenue), 
        `${fmtNum(p.returnedQty)} cái`
      ]);
  }

  if (topProducts.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Tên sản phẩm', 'SL Bán', 'Doanh thu', 'SL Hoàn']],
      body: topProducts,
      theme: 'grid',
      headStyles: { fillColor: [238, 242, 255], textColor: [67, 56, 202], font: 'Roboto', fontStyle: 'bold' },
      bodyStyles: { font: 'Roboto' },
      margin: { left: 15, right: 15 },
    });
    currentY = doc.lastAutoTable.finalY + 15;
  } else {
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(11);
    doc.text('Chưa có dữ liệu sản phẩm.', 15, currentY + 5);
    currentY += 15;
  }

  if (currentY + 30 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    currentY = 20;
  }

  // --- RECENT ORDERS TABLE ---
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text('4. Danh sách Toàn bộ Đơn hàng', 15, currentY);
  currentY += 5;

  const orders = data?.allOrders || data?.recentOrders || [];
  if (orders.length > 0) {
    const sortedOrders = [...orders].sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at));
    const tableData = sortedOrders.map(o => [
      `#${o.orderId || o._id.toString().slice(-4).toUpperCase()}`,
      o.source ? 'Khách từ ' + o.source.charAt(0).toUpperCase() + o.source.slice(1) : 'Khách hàng',
      new Date(o.ordered_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
      fmtCurrency(o.total_price),
      o.status === 'completed' ? 'Hoàn thành' : (o.status === 'returned' ? 'Hoàn trả' : 'Chờ xử lý')
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Mã đơn', 'Khách hàng', 'Ngày đặt', 'Giá trị', 'Trạng thái']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [243, 244, 246], textColor: [107, 114, 128], font: 'Roboto', fontStyle: 'bold' },
      bodyStyles: { font: 'Roboto' },
      margin: { left: 15, right: 15 },
    });
  } else {
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(11);
    doc.text('Không có đơn hàng nào.', 15, currentY + 5);
  }

  // Lưu file
  doc.save(`Bao-Cao-Kinh-Doanh-${new Date().toISOString().split('T')[0]}.pdf`);
};
