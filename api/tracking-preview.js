const PUBLIC_SITE_URL = "https://candletshop.vercel.app";
const TRACKING_CODE_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getPublicOrigin(request) {
  const forwardedHost = request.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;

  if (!host || /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    return PUBLIC_SITE_URL;
  }

  return `https://${host.split(",")[0].trim()}`;
}

export default function handler(request, response) {
  const token = Array.isArray(request.query.token)
    ? request.query.token[0]
    : request.query.token;

  if (!token || !TRACKING_CODE_PATTERN.test(token)) {
    response.status(404).setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end("Không tìm thấy liên kết theo dõi đơn hàng.");
    return;
  }

  const safeToken = escapeHtml(token);
  const origin = getPublicOrigin(request);
  const shareUrl = `${origin}/s/${safeToken}`;
  const appUrl = `/theo-doi-don/${encodeURIComponent(token)}`;
  const previewImageUrl = `${origin}/og-order-tracking-v7.jpg`;
  const userAgent = String(request.headers['user-agent'] || '');
  const isSocialCrawler = /facebookexternalhit|facebot|twitterbot|linkedinbot|zalo|telegrambot|discordbot|whatsapp|slackbot|pinterest|googlebot|bingbot/i.test(userAgent);

  if (!isSocialCrawler) {
    response.setHeader('Location', appUrl);
    response.setHeader('Cache-Control', 'private, no-store');
    response.status(302).end();
    return;
  }

  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  response.status(200).end(`<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Theo dõi đơn hàng Candlet</title>
    <meta name="description" content="Kiểm tra trạng thái và hành trình giao hàng của bạn." />
    <link rel="canonical" href="${shareUrl}" />
    <link rel="icon" href="/favicon.svg?v=1" />

    <meta property="og:locale" content="vi_VN" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Candlet Shop" />
    <meta property="og:title" content="Theo dõi đơn hàng Candlet" />
    <meta property="og:description" content="Kiểm tra trạng thái và hành trình giao hàng của bạn." />
    <meta property="og:url" content="${shareUrl}" />
    <meta property="og:image" content="${previewImageUrl}" />
    <meta property="og:image:url" content="${previewImageUrl}" />
    <meta property="og:image:secure_url" content="${previewImageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Theo dõi đơn hàng cùng Candlet Shop" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Theo dõi đơn hàng Candlet" />
    <meta name="twitter:description" content="Kiểm tra trạng thái và hành trình giao hàng của bạn." />
    <meta name="twitter:image" content="${previewImageUrl}" />
    <meta name="twitter:image:alt" content="Theo dõi đơn hàng cùng Candlet Shop" />

    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; color: #371814; background: #fffaf3; }
      a { color: inherit; font-weight: 700; }
    </style>
  </head>
  <body>
    <p>Đang mở hành trình đơn hàng… <a href="${appUrl}">Xem đơn hàng</a></p>
  </body>
</html>`);
}
