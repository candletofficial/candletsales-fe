const encode = (value) => encodeURIComponent(String(value || '').trim());

export const SHIPPING_CARRIERS = [
  { id: 'spx', name: 'SPX Express', shortName: 'SPX', color: '#EE4D2D', logo: '/carriers/spx.png', trackingUrl: (code) => `https://spx.vn/track?${encode(code)}` },
  { id: 'ghn', name: 'Giao Hàng Nhanh', shortName: 'GHN', color: '#F97316', logo: '/carriers/ghn.png', trackingUrl: (code) => `https://donhang.ghn.vn/?order_code=${encode(code)}` },
  { id: 'ghtk', name: 'Giao Hàng Tiết Kiệm', shortName: 'GHTK', color: '#16A34A', logo: '/carriers/ghtk.png', trackingUrl: (code) => `https://i.ghtk.vn/${encode(code)}` },
  { id: 'viettel_post', name: 'Viettel Post', shortName: 'VTP', color: '#DC2626', logo: '/carriers/viettel_post.png', trackingUrl: () => 'https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/' },
  { id: 'vnpost', name: 'Vietnam Post', shortName: 'VNPost', color: '#D4A017', logo: '/carriers/vnpost.png', trackingUrl: () => 'https://vnpost.vn/vi-vn/dinh-vi/buu-pham' },
  { id: 'jnt', name: 'J&T Express', shortName: 'J&T', color: '#E11D48', logo: '/carriers/jnt.png', trackingUrl: () => 'https://jtexpress.vn/vi/tracking' },
  { id: 'ninjavan', name: 'Ninja Van', shortName: 'Ninja Van', color: '#B91C1C', logo: '/carriers/ninjavan.png', trackingUrl: (code) => `https://www.ninjavan.co/vi-vn/tracking?id=${encode(code)}` },
  { id: 'ahamove', name: 'Ahamove', shortName: 'Ahamove', color: '#F97316', logo: '/carriers/ahamove.png' },
  { id: 'grab', name: 'GrabExpress', shortName: 'Grab', color: '#00B14F', logo: '/carriers/grab.png' },
  { id: 'other', name: 'Đơn vị khác', shortName: 'Vận chuyển', color: '#57534E' },
];

export const getShippingCarrier = (id) => (
  SHIPPING_CARRIERS.find((carrier) => carrier.id === id) || SHIPPING_CARRIERS.at(-1)
);

export const inferLegacyCarrier = (order) => {
  if (order?.shipping_carrier) return order.shipping_carrier;
  const value = String(order?.tracking_number || order?.orderId || '');
  return /^SPX(?:VN)?/i.test(value) ? 'spx' : '';
};

export const getTrackingNumber = (order) => {
  if (!order) return '';
  const explicit = order.tracking_number || order.trackingNumber || order.waybill;
  if (explicit) return String(explicit).trim();
  return /^SPX(?:VN)?[A-Z0-9-]+$/i.test(String(order.orderId || '')) ? String(order.orderId).trim() : '';
};

const safeHttpUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
};

export const getCarrierTracking = (order) => {
  const carrierId = inferLegacyCarrier(order);
  const carrier = getShippingCarrier(carrierId);
  const trackingNumber = getTrackingNumber(order);
  const explicitUrl = safeHttpUrl(order?.tracking_url || order?.trackingUrl);
  const generatedUrl = trackingNumber && carrier?.trackingUrl ? carrier.trackingUrl(trackingNumber) : '';
  return {
    carrierId,
    carrier,
    trackingNumber,
    trackingUrl: explicitUrl || generatedUrl,
  };
};
