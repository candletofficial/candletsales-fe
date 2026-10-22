import { buildSpxInvoiceHtml } from './spxInvoiceTemplate';

export const printInvoice = (order) => {
  const formatPrice = (n) =>
    Math.round(n ?? 0).toLocaleString('vi-VN') + ' đ';

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt của bạn đã chặn tính năng mở tab mới (Pop-up). Vui lòng cho phép Pop-up cho trang web này để có thể in hóa đơn.');
    return;
  }

  const isWebsite = order.source === 'website';
  const orderCode = order.orderId || (order._id ? order._id.toString().slice(-8).toUpperCase() : 'DH-CHUA-CO-MA');
  const isExpress = order.shippingMethod === 'express';
  const carrierName = String(order.pancake_details?.carrier || order.carrier || '');
  const explicitlySpx = /\bspx\b|shopee\s*express/i.test(carrierName);
  const usesSpx = isWebsite || explicitlySpx || (!carrierName && (
    isExpress
    || Number(order.logistics_cost || 0) > 0
    || (order.tracking_enabled && Boolean(order.customer_address))
  ));
  const isCOD = order.payment_method === 'cash';
  const isTransfer = order.payment_method === 'transfer';
  const isManualTransfer = isTransfer && !isWebsite;
  const isRefunded = order.payment_status === 'refunded';
  const isTransferPaid = isTransfer && (order.payment_status === 'paid' || isManualTransfer);
  const paymentStatusLabel = isRefunded
    ? 'Đã hoàn tiền'
    : isTransferPaid
      ? 'Đã thanh toán'
      : isTransfer
        ? 'Chờ xác nhận chuyển khoản'
        : order.status === 'completed'
          ? 'Đã thu tiền'
          : 'Thu tiền khi nhận hàng';
  const receiptItemCount = Math.max(1, order.items?.length || 0);
  const receiptScale = Math.max(0.7, 1 - (Math.max(0, receiptItemCount - 1) * 0.055));
  const spxScale = Math.max(0.52, 0.7 - (Math.max(0, receiptItemCount - 1) * 0.04));
  const paidAmount = isTransferPaid ? Number(order.total_price || 0) : 0;
  const amountDue = isTransferPaid || isRefunded ? 0 : Number(order.total_price || 0);

  // Tính tiền hàng tạm tính cho đơn website
  const subtotal = isWebsite 
    ? ((order.total_price || 0) - (order.shipping_fee || 0) + (order.discount_amount || 0))
    : ((order.total_price || 0) + (order.discount_amount || 0));

  // Render danh sách sản phẩm theo bảng đen trắng rõ nét
  const itemsRows = (order.items || []).map((item, index) => `
    <tr>
      <td style="padding: 4px 2px; text-align: center; border-bottom: 1px dotted #000; font-size: 9px; vertical-align: top;">
        ${index + 1}
      </td>
      <td style="padding: 4px 4px; text-align: left; border-bottom: 1px dotted #000; vertical-align: top;">
        <div style="font-weight: 800; font-size: 10px; color: #000; line-height: 1.3;">${item.product_name}</div>
        ${item.sku_label ? `<div style="font-size: 8.5px; color: #333; margin-top: 1px;">Phân loại: <strong>${item.sku_label}</strong></div>` : ''}
      </td>
      <td style="padding: 4px 2px; text-align: center; border-bottom: 1px dotted #000; font-weight: 800; font-size: 10.5px; vertical-align: top;">
        ${item.quantity}
      </td>
      <td style="padding: 4px 4px; text-align: right; border-bottom: 1px dotted #000; font-size: 9.5px; vertical-align: top; white-space: nowrap;">
        ${formatPrice(item.unit_price)}
      </td>
      <td style="padding: 4px 4px; text-align: right; border-bottom: 1px dotted #000; font-weight: 800; font-size: 10px; vertical-align: top; white-space: nowrap;">
        ${formatPrice(item.unit_price * item.quantity)}
      </td>
    </tr>
  `).join('');

  // ══════════════════════════════════════════════════════════════════
  // PHIẾU GIAO HÀNG KẾT HỢP HÓA ĐƠN SPX, GÓI GỌN TRÊN MỘT TỜ A7.
  // ══════════════════════════════════════════════════════════════════
  const spxInvoiceHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Phiếu Gửi Hàng SPX Express - ${orderCode}</title>
      <style>
        @page {
          size: A7 portrait;
          margin: 1.5mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #000;
          background: #fff;
          margin: 0 auto;
          padding: 0;
          font-size: 9.5px;
          line-height: 1.3;
          width: ${68 / spxScale}mm;
          max-width: none;
          zoom: ${spxScale};
        }

        /* Thanh công cụ xem trước (ẩn khi in) */
        .no-print-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          border: 1px solid #000;
          background: #fff;
          margin-bottom: 6px;
        }
        .btn-print {
          background: #000;
          color: #fff;
          border: 1px solid #000;
          padding: 5px 12px;
          font-weight: 800;
          font-size: 11px;
          cursor: pointer;
        }
        .btn-close {
          background: #fff;
          color: #000;
          border: 1px solid #000;
          padding: 5px 10px;
          font-size: 11px;
          cursor: pointer;
        }

        @media print {
          .no-print-toolbar { display: none !important; }
          body { padding: 0 !important; }
        }

        /* Khung bao viền phiếu giao hàng */
        .spx-container {
          border: 1.5px solid #000;
          padding: 3px;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* 1. Header: Đơn vị vận chuyển & Thương hiệu */
        .spx-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #000;
          padding-bottom: 4px;
          margin-bottom: 4px;
        }
        .carrier-brand {
          text-align: left;
        }
        .carrier-name {
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          line-height: 1;
        }
        .carrier-service-tag {
          display: inline-block;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          border: 1.5px solid #000;
          padding: 1px 5px;
          margin-top: 3px;
        }
        .shop-info-right {
          text-align: right;
          font-size: 8px;
          line-height: 1.25;
        }
        .shop-name-bold {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          display: block;
        }

        /* 2. Barcode & Mã vận đơn SPX */
        .barcode-block {
          text-align: center;
          border-bottom: 2px solid #000;
          padding: 3px 0 5px 0;
          margin-bottom: 4px;
        }
        .waybill-label {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .waybill-number {
          font-size: 16px;
          font-weight: 900;
          font-family: 'Courier New', Courier, monospace;
          letter-spacing: 1.5px;
          margin: 1px 0;
        }
        .barcode-svg {
          max-height: 38px;
          max-width: 96%;
          margin: 1px auto;
          display: block;
        }
        .ref-order-row {
          font-size: 8.5px;
          font-weight: 700;
          margin-top: 1px;
        }

        /* 3. Khung Người gửi & Người nhận */
        .party-box {
          border-bottom: 2px solid #000;
          padding-bottom: 4px;
          margin-bottom: 4px;
        }
        .party-sender {
          border-bottom: 1px solid #000;
          padding-bottom: 3px;
          margin-bottom: 3px;
          font-size: 8.5px;
        }
        .party-tag {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .party-receiver {
          font-size: 9.5px;
        }
        .receiver-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }
        .receiver-name {
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .receiver-phone {
          font-size: 14px;
          font-weight: 900;
          font-family: 'Courier New', Courier, monospace;
          letter-spacing: 0.5px;
        }
        .receiver-address {
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1.3;
          margin-top: 2px;
        }
        .customer-note-box {
          margin-top: 3px;
          padding: 3px 5px;
          border: 1px dashed #000;
          font-size: 8.5px;
          font-weight: 700;
        }

        /* 4. Khối Thu Tiền COD (Chống thu nhầm tiền của SPX) */
        .cod-box {
          border: 2px solid #000;
          padding: 4px;
          text-align: center;
          margin-bottom: 4px;
        }
        .cod-title {
          font-size: 9.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .cod-amount {
          font-size: 18px;
          font-weight: 900;
          font-family: 'Courier New', Courier, monospace;
          margin: 1px 0;
        }
        .cod-note {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
        }

        /* 5. Hướng dẫn giao hàng SPX */
        .instructions-bar {
          display: flex;
          justify-content: space-between;
          border-bottom: 1.5px solid #000;
          padding: 2px 0 4px 0;
          margin-bottom: 4px;
          font-size: 8.5px;
          font-weight: 800;
        }

        /* 6. Bảng danh sách hàng hóa */
        .goods-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4px;
        }
        .goods-table th {
          border-top: 1px solid #000;
          border-bottom: 1.5px solid #000;
          padding: 2px 3px;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
        }

        /* 7. Chi tiết tính tiền */
        .calc-summary {
          border-top: 1px solid #000;
          padding-top: 3px;
          margin-bottom: 4px;
        }
        .calc-row {
          display: flex;
          justify-content: space-between;
          font-size: 8.5px;
          margin-bottom: 1px;
        }
        .calc-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          font-weight: 900;
          border-top: 1px solid #000;
          padding-top: 2px;
          margin-top: 2px;
        }

        /* 8. Chữ ký xác nhận */
        .signatures-section {
          display: none;
          justify-content: space-between;
          border-top: 1px dashed #000;
          padding-top: 3px;
          text-align: center;
        }
        .sig-item {
          width: 32%;
          font-size: 8px;
        }
        .sig-item strong {
          display: block;
          font-size: 8px;
          text-transform: uppercase;
        }
        .sig-box-space {
          height: 22px;
        }

        /* Lời cảm ơn */
        .footer-note {
          text-align: center;
          font-size: 7.5px;
          border-top: 1px solid #000;
          padding-top: 2px;
          margin-top: 3px;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <!-- Thanh công cụ màn hình (không in) -->
      <div class="no-print-toolbar">
        <div style="font-size: 11px; font-weight: 800;">
          PHIẾU GỬI HÀNG ĐỒNG BỘ SPX EXPRESS (#${orderCode})
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-print" onclick="window.print()">In Phiếu (Ctrl+P)</button>
          <button class="btn-close" onclick="window.close()">Đóng</button>
        </div>
      </div>

      <!-- Khung phiếu chuẩn SPX -->
      <div class="spx-container">
        
        <!-- 1. Header: SPX EXPRESS & CANDLET SHOP -->
        <div class="spx-header">
          <div class="carrier-brand">
            <div class="carrier-name">SPX EXPRESS</div>
            <div class="carrier-service-tag">
              ${isExpress ? 'SPX HỎA TỐC 4H (GIAO GẤP)' : 'SPX TIÊU CHUẨN'}
            </div>
          </div>
          <div class="shop-info-right">
            <span class="shop-name-bold">CANDLET SHOP</span>
            <div>Hotline: <strong>032.862.4761</strong></div>
            <div>Web: <strong>candletsales.com</strong></div>
          </div>
        </div>

        <!-- 2. Mã vận đơn SPX & Mã vạch Barcode (Code128) -->
        <div class="barcode-block">
          <div class="waybill-label">MÃ VẬN ĐƠN (WAYBILL NO.)</div>
          <div class="waybill-number">${orderCode}</div>
          <svg id="barcode" class="barcode-svg"></svg>
          <div class="ref-order-row">
            Mã đơn Candlet: <strong>#${orderCode}</strong> • Ngày tạo: ${formatDate(order.ordered_at)}
          </div>
        </div>

        <!-- 3. Bên gửi & Bên nhận -->
        <div class="party-box">
          <!-- BÊN GỬI -->
          <div class="party-sender">
            <span class="party-tag">TỪ (NGƯỜI GỬI):</span>
            <strong>CANDLET SHOP</strong> - 032.862.4761 | Kho Candlet, Hà Nội
          </div>

          <!-- BÊN NHẬN (KHÁCH HÀNG) -->
          <div class="party-receiver">
            <div class="receiver-header-row">
              <span class="party-tag">ĐẾN (NGƯỜI NHẬN):</span>
              <span style="font-size: 8px; font-weight: 800; border: 1px solid #000; padding: 0 4px;">ĐỒNG KIỂM</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span class="receiver-name">${order.customer_name || 'Khách hàng nhận'}</span>
              <span class="receiver-phone">${order.customer_phone || 'Chưa có SĐT'}</span>
            </div>
            <div class="receiver-address">
              <strong>Địa chỉ:</strong> ${order.customer_address || 'Nhận tại quầy / Chưa cập nhật'}
            </div>
            ${order.note ? `
              <div class="customer-note-box">
                Lưu ý: ${order.note}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 4. Hộp Thu Tiền COD (Chống thu nhầm tiền của SPX) -->
        <div class="cod-box">
          <div class="cod-title">
            ${isCOD
              ? 'TIỀN THU NGƯỜI NHẬN (COD)'
              : isRefunded
                ? 'ĐÃ HOÀN TIỀN (COD: 0 VNĐ)'
                : isTransferPaid
                  ? 'ĐÃ THANH TOÁN CHUYỂN KHOẢN (COD: 0 VNĐ)'
                  : 'CHỜ XÁC NHẬN CHUYỂN KHOẢN (COD: 0 VNĐ)'}
          </div>
          <div class="cod-amount">
            ${isCOD ? formatPrice(order.total_price) : '0 VNĐ'}
          </div>
          <div class="cod-note">
            ${isCOD
              ? 'BƯU TÁ SPX VUI LÒNG THU ĐÚNG SỐ TIỀN TRÊN KHI GIAO'
              : isTransferPaid || isRefunded
                ? 'BƯU TÁ SPX TUYỆT ĐỐI KHÔNG THU THÊM TIỀN CỦA NGƯỜI NHẬN'
                : 'ĐƠN CHUYỂN KHOẢN CHƯA ĐƯỢC XÁC NHẬN - KHÔNG THU COD'}
          </div>
        </div>

        <!-- 5. Chỉ dẫn giao hàng SPX -->
        <div class="delivery-rules">
          <span>Chỉ dẫn: <strong>Cho xem hàng, không cho thử</strong></span>
          <span>Phân loại: <strong>Hàng dễ vỡ (Nến thơm)</strong></span>
        </div>

        <!-- 6. Danh sách sản phẩm -->
        <table class="goods-table">
          <thead>
            <tr>
              <th style="width: 20px; text-align: center;">#</th>
              <th>Sản phẩm & Mùi hương</th>
              <th style="width: 25px; text-align: center;">SL</th>
              <th style="width: 60px; text-align: right;">Đơn giá</th>
              <th style="width: 65px; text-align: right;">T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- 7. Chi tiết tính tiền -->
        <div class="calc-summary">
          <div class="calc-row">
            <span>Tiền hàng tạm tính:</span>
            <span><strong>${formatPrice(subtotal)}</strong></span>
          </div>
          <div class="calc-row">
            <span>Phí vận chuyển:</span>
            <span><strong>${(order.shipping_fee || 0) > 0 ? formatPrice(order.shipping_fee) : 'Miễn phí (0đ)'}</strong></span>
          </div>
          ${(order.discount_amount || 0) > 0 ? `
            <div class="calc-row">
              <span>Giảm giá voucher ${order.discount_code ? `(${order.discount_code})` : ''}:</span>
              <span><strong>- ${formatPrice(order.discount_amount)}</strong></span>
            </div>
          ` : ''}
          ${isTransferPaid ? `
            <div class="calc-row">
              <span>Tổng giá trị đơn hàng:</span>
              <span><strong>${formatPrice(order.total_price)}</strong></span>
            </div>
            <div class="calc-row">
              <span>Đã thanh toán chuyển khoản:</span>
              <span><strong>- ${formatPrice(paidAmount)}</strong></span>
            </div>
          ` : ''}
          <div class="calc-total-row">
            <span>${isTransferPaid || isRefunded ? 'CÒN PHẢI THU:' : 'TỔNG CỘNG ĐƠN HÀNG:'}</span>
            <span><strong>${formatPrice(amountDue)}</strong></span>
          </div>
        </div>

        <!-- 8. Chữ ký xác nhận 3 bên -->
        <div class="signatures-section">
          <div class="sig-item">
            <strong>Người nhận hàng</strong>
            <span>(Ký & ghi họ tên)</span>
            <div class="sig-box-space"></div>
          </div>
          <div class="sig-item">
            <strong>Bưu tá SPX</strong>
            <span>(Ký xác nhận)</span>
            <div class="sig-box-space"></div>
          </div>
          <div class="sig-item">
            <strong>Thủ kho Candlet</strong>
            <span>(Đã đóng gói)</span>
            <div class="sig-box-space"></div>
          </div>
        </div>

        <div class="footer-note">
          Cảm ơn bạn đã lựa chọn nến thơm Candlet. Quý khách vui lòng quay video mở kiện hàng để được hỗ trợ 1-1 nhanh nhất!
        </div>

      </div>

      <!-- Script tạo mã vạch chuẩn CODE128 cho máy quét SPX -->
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() {
          try {
            JsBarcode("#barcode", "${orderCode}", {
              format: "CODE128",
              width: 1.4,
              height: 32,
              displayValue: false,
              margin: 0
            });
          } catch(e) {
            console.error("Barcode error", e);
          }
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  // ══════════════════════════════════════════════════════════════════
  // TEMPLATE CHO ĐƠN TẠI QUẦY / POS (HÓA ĐƠN ĐEN TRẮNG NHỎ GỌN)
  // ══════════════════════════════════════════════════════════════════
  const posInvoiceHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Hóa đơn bán hàng - ${orderCode}</title>
      <style>
        @page { size: A7 portrait; margin: 2mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #000;
          background: #fff;
          line-height: 1.35;
          margin: 0 auto;
          padding: 4mm 3mm;
          font-size: 9.5px;
          width: ${70 / receiptScale}mm;
          max-width: none;
          zoom: ${receiptScale};
          box-sizing: border-box;
        }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .header { text-align: center; margin-bottom: 6px; }
        .header h1 { margin: 0; font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
        .header p { margin: 2px 0 0 0; font-size: 8.5px; color: #000; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 2.5px; font-size: 9px; }
        .info-row .label { color: #000; }
        .info-row .value { font-weight: 800; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
        th { padding: 3px 0; text-align: left; border-bottom: 1.5px solid #000; font-size: 9px; color: #000; text-transform: uppercase; font-weight: 800; }
        th.text-right { text-align: right; }
        .grand-total { display: flex; justify-content: space-between; align-items: center; margin-top: 5px; padding-top: 5px; border-top: 1.5px solid #000; font-size: 12.5px; font-weight: 900; }
        .footer { margin-top: 8px; text-align: center; font-size: 8.5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CANDLET SHOP</h1>
        <p>candletsales.com • Hotline: 032.862.4761</p>
      </div>

      <div class="divider"></div>

      <div class="order-info">
        <div class="info-row"><span class="label">Mã đơn:</span><span class="value">#${orderCode}</span></div>
        <div class="info-row"><span class="label">Ngày:</span><span class="value">${formatDate(order.ordered_at)}</span></div>
        <div class="info-row"><span class="label">Khách:</span><span class="value">${order.customer_name || 'Khách lẻ'}</span></div>
        <div class="info-row"><span class="label">Hình thức:</span><span class="value">${order.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span></div>
        <div class="info-row"><span class="label">Thanh toán:</span><span class="value">${paymentStatusLabel}</span></div>
      </div>

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th class="text-right">T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || []).map(i => `
            <tr>
              <td style="padding: 3px 0; vertical-align: top;">
                <div style="font-weight: 800; font-size: 9.5px;">${i.product_name}</div>
                ${i.sku_label ? `<div style="font-size: 8px; color: #333;">${i.sku_label}</div>` : ''}
                <div style="font-size: 8px; color: #333;">${i.quantity} x ${formatPrice(i.unit_price)}</div>
              </td>
              <td style="padding: 3px 0; text-align: right; vertical-align: top; font-weight: 800; font-size: 10px;">
                ${formatPrice(i.unit_price * i.quantity)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="totals">
        <div class="info-row"><span class="label">Tiền hàng:</span><span class="value">${formatPrice(subtotal)}</span></div>
        ${(order.discount_amount || 0) > 0 ? `
          <div class="info-row"><span class="label">Giảm giá:</span><span class="value">- ${formatPrice(order.discount_amount)}</span></div>
        ` : ''}
        ${isTransferPaid ? `
          <div class="info-row"><span class="label">Đã thanh toán:</span><span class="value">- ${formatPrice(paidAmount)}</span></div>
        ` : ''}
        <div class="grand-total">
          <span>${isTransferPaid || isRefunded ? 'CÒN PHẢI THU' : 'TỔNG CỘNG'}</span>
          <span>${formatPrice(amountDue)}</span>
        </div>
      </div>

      <div class="footer">
        <p style="font-weight: 700; margin: 3px 0;">Cảm ơn quý khách và hẹn gặp lại!</p>
        <div style="text-align: center; margin-top: 6px;">
          <svg id="barcode"></svg>
        </div>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() {
          try {
            JsBarcode("#barcode", "${orderCode}", {
              format: "CODE128",
              width: 1.3,
              height: 26,
              displayValue: true,
              fontSize: 9.5,
              margin: 0
            });
          } catch(e) {}
          setTimeout(() => window.print(), 350);
        }
      </script>
    </body>
    </html>
  `;

  const redesignedSpxInvoiceHtml = buildSpxInvoiceHtml({
    order,
    orderCode,
    isExpress,
    isCOD,
    isTransferPaid,
    isRefunded,
    amountDue,
  });

  printWindow.document.write(usesSpx ? (redesignedSpxInvoiceHtml || spxInvoiceHtml) : posInvoiceHtml);
  printWindow.document.close();
};
