const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatPrice = (value) => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} đ`;

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const normalizeRouteLabel = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/Đ/g, 'D')
  .replace(/đ/g, 'd')
  .replace(/^(phuong|xa|thi tran|quan|huyen|thi xa|thanh pho|tinh)\s+/i, '')
  .trim()
  .toUpperCase();

export const buildSpxInvoiceHtml = ({
  order,
  orderCode,
  isExpress,
  isCOD,
  isTransferPaid,
  isRefunded,
  amountDue,
}) => {
  const details = order.pancake_details || {};
  const waybill = String(
    order.tracking_number
    || order.trackingNumber
    || order.waybill
    || orderCode,
  );
  const receiverName = details.recipient_name || order.customer_name || 'Khách hàng';
  const receiverPhone = details.recipient_phone || order.customer_phone || 'Chưa có SĐT';
  const receiverAddress = details.address || order.customer_address || 'Chưa cập nhật địa chỉ';
  const ward = normalizeRouteLabel(details.commune);
  const district = normalizeRouteLabel(details.district);
  const province = normalizeRouteLabel(details.province);
  const routeLabel = [province, district, ward].filter(Boolean).join(' • ') || 'SPX EXPRESS';
  const trackingTarget = details.tracking_url || details.order_url || waybill;
  const createdAt = formatDate(order.ordered_at || order.createdAt);
  const itemCount = Math.max(1, order.items?.length || 0);
  const printScale = Math.max(0.74, 0.86 - (Math.max(0, itemCount - 1) * 0.035));
  const totalQuantity = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const weight = Number(order.shipping_weight || order.weight || 0);
  const itemRows = (order.items || []).map((item, index) => `
    <div class="goods-row">
      <span class="goods-index">${index + 1}.</span>
      <div class="goods-copy">
        <strong>${escapeHtml(item.product_name || 'Sản phẩm')}</strong>
        ${item.sku_label ? `<span>Phân loại: ${escapeHtml(item.sku_label)}</span>` : ''}
      </div>
      <strong class="goods-quantity">SL: ${Number(item.quantity || 0)}</strong>
    </div>
  `).join('');
  const collectLabel = isCOD
    ? `COD CẦN THU: ${formatPrice(amountDue)}`
    : isTransferPaid
      ? 'ĐÃ THANH TOÁN • COD: 0 Đ'
      : isRefunded
        ? 'ĐÃ HOÀN TIỀN • COD: 0 Đ'
        : 'CHUYỂN KHOẢN CHỜ XÁC NHẬN • COD: 0 Đ';

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Phiếu gửi hàng SPX - ${escapeHtml(orderCode)}</title>
      <style>
        @page { size: A7 portrait; margin: 1.5mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        html, body { margin: 0; padding: 0; background: #fff; color: #000; }
        body {
          width: ${71 / printScale}mm;
          margin: 0 auto;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 7px;
          line-height: 1.16;
          zoom: ${printScale};
        }
        .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px; margin-bottom: 5px; border: 1px solid #111; }
        .toolbar strong { font-size: 10px; }
        .toolbar button { padding: 5px 9px; border: 1px solid #111; background: #fff; font-weight: 700; cursor: pointer; }
        .toolbar .print { background: #111; color: #fff; }
        .label { width: 100%; min-height: 101mm; border: 1.2px solid #000; overflow: hidden; }
        .dashed-bottom { border-bottom: 0.7px dashed #000; }
        .header { display: grid; grid-template-columns: 27mm 1fr; min-height: 15mm; }
        .brand { display: flex; align-items: center; justify-content: center; color: #ee4d2d; font-size: 24px; font-style: italic; font-weight: 900; letter-spacing: -2px; }
        .brand small { align-self: flex-end; margin: 0 0 3.5mm 1px; font-size: 4.5px; letter-spacing: 0; }
        .barcode-wrap { padding: 1.2mm 1.5mm 0.8mm; text-align: center; }
        #spx-barcode { display: block; width: 100%; height: 8mm; }
        .waybill { margin-top: 0.5mm; font-size: 6.5px; }
        .waybill strong { letter-spacing: 0.2px; }
        .route { display: grid; grid-template-columns: 1fr auto; align-items: center; min-height: 9mm; }
        .route-main { padding: 1.2mm 2mm; font-size: 14px; font-weight: 900; line-height: 1; overflow-wrap: anywhere; }
        .route-service { padding: 1.2mm 2mm; border-left: 0.7px dashed #000; font-size: 9px; font-weight: 900; white-space: nowrap; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; min-height: 20mm; }
        .party { padding: 1.2mm 1.5mm; overflow-wrap: anywhere; }
        .party + .party { border-left: 0.7px dashed #000; }
        .party-title { display: block; margin-bottom: 0.7mm; font-size: 7px; font-weight: 900; text-transform: uppercase; }
        .party strong { font-size: 7.5px; }
        .candlet-sender { display: flex; align-items: center; gap: 1mm; margin-bottom: 0.7mm; }
        .candlet-sender img { width: 18mm; height: 6.5mm; object-fit: contain; object-position: left center; }
        .candlet-sender span { padding-left: 1mm; border-left: 1px solid #000; font-size: 5.5px; font-weight: 700; line-height: 1.2; }
        .notice { padding: 1mm 1.5mm; font-size: 6px; }
        .notice strong { font-size: 6.5px; }
        .content { display: grid; grid-template-columns: 1fr 19mm; min-height: 37mm; }
        .goods { padding: 1.2mm 1.5mm; }
        .brand-stamp { display: flex; align-items: center; justify-content: space-between; gap: 1mm; margin-bottom: 1.2mm; padding: 0.8mm 1mm; border: 0.7px solid #000; }
        .brand-stamp strong { font-size: 7px; letter-spacing: 0.3px; }
        .brand-stamp span { font-size: 5.5px; font-style: italic; text-align: right; }
        .section-title { margin-bottom: 1mm; font-size: 8px; font-weight: 900; }
        .goods-row { display: grid; grid-template-columns: 4mm 1fr auto; gap: 0.8mm; margin-bottom: 1.2mm; align-items: start; }
        .goods-copy strong, .goods-copy span { display: block; }
        .goods-copy strong { font-size: 7.2px; }
        .goods-copy span { margin-top: 0.3mm; font-size: 6px; }
        .goods-quantity { white-space: nowrap; font-size: 6.5px; }
        .payment { margin-top: 1.5mm; padding-top: 1mm; border-top: 0.7px dashed #000; font-size: 8px; font-weight: 900; }
        .order-total { margin-top: 0.7mm; font-size: 6.5px; font-weight: 400; }
        .qr-column { display: flex; flex-direction: column; align-items: center; padding: 1.2mm 1mm; border-left: 0.7px dashed #000; text-align: center; }
        #spx-qr { width: 17mm; height: 17mm; margin-bottom: 1mm; }
        #spx-qr img, #spx-qr canvas { width: 17mm !important; height: 17mm !important; }
        .qr-code { max-width: 17mm; font-size: 6.5px; font-weight: 900; overflow-wrap: anywhere; }
        .created { margin-top: auto; padding-top: 1mm; font-size: 6px; }
        .handover { display: grid; grid-template-columns: 1fr 1fr; min-height: 15mm; }
        .handover > div { padding: 1mm 1.5mm; }
        .handover > div + div { border-left: 0.7px dashed #000; }
        .handover strong { display: block; margin-bottom: 0.7mm; font-size: 7px; }
        .handover-note { font-size: 6.2px; line-height: 1.22; }
        .signature-space { height: 7mm; }
        .receiver-sign { display: flex; justify-content: space-between; align-items: flex-end; gap: 2mm; font-size: 6px; }
        .footer { padding: 1.2mm 1.5mm; text-align: center; font-size: 8px; font-weight: 900; }
        .footer-brand { display: flex; align-items: center; justify-content: center; gap: 1.2mm; margin-bottom: 0.7mm; }
        .footer-brand img { width: 16mm; height: 5mm; object-fit: contain; }
        .footer-brand span { font-size: 5.8px; font-style: italic; font-weight: 700; }
        .footer small { display: block; margin-top: 0.6mm; font-size: 5.5px; font-weight: 400; }
        @media print {
          .toolbar { display: none !important; }
          .label { break-inside: avoid; page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <strong>PHIẾU GỬI HÀNG SPX</strong>
        <div><button class="print" onclick="window.print()">In phiếu</button> <button onclick="window.close()">Đóng</button></div>
      </div>

      <main class="label">
        <header class="header dashed-bottom">
          <div class="brand">SPX<small>EXPRESS</small></div>
          <div class="barcode-wrap">
            <svg id="spx-barcode"></svg>
            <div class="waybill">Mã vận đơn: <strong>${escapeHtml(waybill)}</strong></div>
          </div>
        </header>

        <section class="route dashed-bottom">
          <div class="route-main">${escapeHtml(routeLabel)}</div>
          <div class="route-service">${isExpress ? 'HỎA TỐC' : 'TIÊU CHUẨN'}</div>
        </section>

        <section class="parties dashed-bottom">
          <div class="party">
            <span class="party-title">Từ:</span>
            <div class="candlet-sender">
              <img src="/logo.png" alt="Candlet Shop">
              <span>NẾN THƠM<br>THỦ CÔNG</span>
            </div>
            Kho Candlet, Hà Nội<br>
            SĐT: 032.862.4761
          </div>
          <div class="party">
            <span class="party-title">Đến:</span>
            <strong>${escapeHtml(receiverName)}</strong><br>
            ${escapeHtml(receiverAddress)}<br>
            SĐT: ${escapeHtml(receiverPhone)}
          </div>
        </section>

        <section class="notice dashed-bottom">
          Người gửi phải cam kết hàng hóa đủ điều kiện gửi. <strong>Cho xem hàng, không cho thử.</strong>
        </section>

        <section class="content dashed-bottom">
          <div class="goods">
            <div class="brand-stamp">
              <strong>CANDLET SHOP</strong>
              <span>Gói một chút bình yên<br>trong từng hương nến</span>
            </div>
            <div class="section-title">Nội dung hàng (${totalQuantity} sản phẩm):</div>
            ${itemRows || '<div>Chưa có thông tin sản phẩm</div>'}
            <div class="payment">${escapeHtml(collectLabel)}</div>
            ${order.note ? `<div class="order-total">Ghi chú: ${escapeHtml(order.note)}</div>` : ''}
          </div>
          <aside class="qr-column">
            <div id="spx-qr"></div>
            <div class="qr-code">${escapeHtml(waybill)}</div>
            <div class="created">Ngày tạo vận đơn:<br><strong>${escapeHtml(createdAt)}</strong></div>
          </aside>
        </section>

        <section class="handover dashed-bottom">
          <div>
            <strong>Chỉ dẫn giao hàng:</strong>
            <div class="handover-note">KHÔNG ĐỒNG KIỂM<br>Chuyển hoàn sau 3 lần phát.<br>Lưu kho tối đa theo quy định SPX.</div>
          </div>
          <div>
            <strong>Chữ ký người nhận:</strong>
            <div class="signature-space"></div>
            <div class="receiver-sign"><span>Tên: __________</span><span>Khối lượng: ${weight > 0 ? `${weight.toLocaleString('vi-VN')}g` : '—'}</span></div>
          </div>
        </section>

        <footer class="footer">
          <div class="footer-brand">
            <img src="/logo.png" alt="Candlet Shop">
            <span>Thắp hương thơm, giữ khoảnh khắc</span>
          </div>
          XEM TRÊN ỨNG DỤNG TÀI XẾ
          <small>Mã đơn Candlet: ${escapeHtml(orderCode)} • ${escapeHtml(createdAt)}</small>
        </footer>
      </main>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
      <script>
        window.onload = function() {
          try {
            JsBarcode('#spx-barcode', ${JSON.stringify(waybill)}, {
              format: 'CODE128', width: 1.2, height: 31, displayValue: false, margin: 0
            });
          } catch (error) { console.error('Barcode error', error); }
          try {
            new QRCode(document.getElementById('spx-qr'), {
              text: ${JSON.stringify(String(trackingTarget))}, width: 150, height: 150,
              correctLevel: QRCode.CorrectLevel.M
            });
          } catch (error) { console.error('QR error', error); }
          setTimeout(function() { window.print(); }, 450);
        };
      </script>
    </body>
    </html>
  `;
};
