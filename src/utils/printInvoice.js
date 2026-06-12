export const printInvoice = (order) => {
  const formatPrice = (n) =>
    Math.round(n ?? 0).toLocaleString('vi-VN') + ' đ';

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const printWindow = window.open('', '_blank');
  
  const itemsHtml = (order.items || []).map((item) => `
    <tr>
      <td style="padding: 4px 0; text-align: left; vertical-align: top;">
        <div style="font-weight: 700; font-size: 10px; color: #000;">${item.product_name}</div>
        ${item.sku_label ? `<div style="font-size: 8px; color: #555; margin-top: 2px;">Phân loại: ${item.sku_label}</div>` : ''}
        <div style="font-size: 8px; color: #555; margin-top: 2px;">${item.quantity} x ${formatPrice(item.unit_price)}</div>
      </td>
      <td style="padding: 4px 0; text-align: right; vertical-align: top; font-weight: 700; font-size: 10px; color: #000;">
        ${formatPrice(item.unit_price * item.quantity)}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Hóa đơn - ${order.orderId || order._id}</title>
      <style>
        @page {
          size: 74mm 105mm;
          margin: 0;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          color: #000;
          line-height: 1.4;
          margin: 0 auto;
          padding: 2mm;
          font-size: 9px;
          background: #fff;
          width: 72mm;
          box-sizing: border-box;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }

        .header {
          text-align: center;
          margin-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .header p {
          margin: 2px 0 0 0;
          font-size: 8px;
          color: #333;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 9px;
        }
        .info-row .label { color: #555; }
        .info-row .value { font-weight: 600; text-align: right; max-width: 60%; }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
        }
        th {
          padding: 4px 0;
          text-align: left;
          border-bottom: 1px solid #000;
          font-size: 9px;
          color: #555;
          text-transform: uppercase;
        }
        th.text-right { text-align: right; }
        
        .totals {
          width: 100%;
          margin-top: 6px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 9px;
        }
        .totals-row .label { color: #555; }
        .totals-row .value { font-weight: 600; }
        
        .grand-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #000;
          font-size: 12px;
          font-weight: 800;
        }
        
        .footer {
          margin-top: 12px;
          text-align: center;
        }
        .footer p { margin: 3px 0; font-size: 8px; }
        .barcode {
          font-family: 'Courier New', monospace;
          font-size: 10px;
          letter-spacing: 2px;
          margin-top: 6px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CANDLET SHOP</h1>
        <p>candletsales.com</p>
      </div>

      <div class="divider"></div>

      <div class="order-info">
        <div class="info-row">
          <span class="label">Mã đơn:</span>
          <span class="value">${order.orderId || order._id.toString().slice(-6).toUpperCase()}</span>
        </div>
        <div class="info-row">
          <span class="label">Ngày đặt:</span>
          <span class="value">${formatDate(order.ordered_at)}</span>
        </div>
        <div class="info-row">
          <span class="label">Loại đơn:</span>
          <span class="value">${order.is_replacement ? 'Giao bù' : 'Bán hàng'}</span>
        </div>
        ${order.note ? `
        <div class="info-row">
          <span class="label">Ghi chú:</span>
          <span class="value">${order.note}</span>
        </div>` : ''}
      </div>

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th class="text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="totals">
        <div class="totals-row">
          <span class="label">Tiền hàng:</span>
          <span class="value">${formatPrice((order.total_price || 0) - (order.logistics_cost || 0) + (order.discount_amount || 0))}</span>
        </div>
        ${order.discount_amount > 0 ? `
        <div class="totals-row">
          <span class="label">Giảm giá:</span>
          <span class="value">- ${formatPrice(order.discount_amount)}</span>
        </div>
        ` : ''}
        <div class="totals-row">
          <span class="label">Phí ship:</span>
          <span class="value">${formatPrice(order.logistics_cost || 0)}</span>
        </div>
        
        <div class="grand-total">
          <span>TỔNG CỘNG</span>
          <span>${formatPrice(order.total_price || 0)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Cảm ơn quý khách đã mua sắm!</p>
        <p style="color: #666;">Ngày in: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
        <div style="text-align: center; margin-top: 10px;">
          <svg id="barcode"></svg>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() {
          const orderId = "${order.orderId || order._id.toString().slice(-6).toUpperCase()}";
          JsBarcode("#barcode", orderId, {
            format: "CODE128",
            width: 1.5,
            height: 30,
            displayValue: true,
            fontSize: 12,
            margin: 0,
            fontOptions: "bold"
          });
          
          setTimeout(function() {
            window.print();
          }, 300);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
