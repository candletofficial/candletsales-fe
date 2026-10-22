const text = value => typeof value === 'string' || typeof value === 'number'
  ? String(value).trim()
  : '';

export const getSpxWaybill = (order) => {
  if (!order) return '';

  const explicitWaybill = [order.tracking_number, order.trackingNumber, order.waybill]
    .map(text)
    .find(Boolean);
  if (explicitWaybill) return explicitWaybill;

  const orderId = text(order.orderId);
  return /^SPX(?:VN)?[A-Z0-9-]+$/i.test(orderId) ? orderId : '';
};

export const getSpxTrackingUrl = (order) => {
  const waybill = getSpxWaybill(order);
  return waybill ? `https://spx.vn/track?${encodeURIComponent(waybill)}` : '';
};
