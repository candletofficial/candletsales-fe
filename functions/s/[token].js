const PREVIEW_VERSION = "9";
const TRACKING_CODE_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function onRequest({ request, params }) {
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  if (!token || !TRACKING_CODE_PATTERN.test(token)) {
    return new Response("Không tìm thấy liên kết theo dõi đơn hàng.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const origin = new URL(request.url).origin;
  const safeToken = escapeHtml(token);
  const shareUrl = `${origin}/s/${safeToken}?v=${PREVIEW_VERSION}`;
  const appUrl = `/theo-doi-don/${encodeURIComponent(token)}`;
  const previewImageUrl = `${origin}/og-order-tracking-v7.jpg?v=${PREVIEW_VERSION}`;

  const html = `<!doctype html>
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
    <meta property="og:image:secure_url" content="${previewImageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Theo dõi đơn hàng cùng Candlet Shop" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Theo dõi đơn hàng Candlet" />
    <meta name="twitter:description" content="Kiểm tra trạng thái và hành trình giao hàng của bạn." />
    <meta name="twitter:image" content="${previewImageUrl}" />
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; color: #371814; background: #fffaf3; }
      a { color: inherit; font-weight: 700; }
    </style>
  </head>
  <body>
    <p>Đang mở hành trình đơn hàng… <a href="${appUrl}">Xem đơn hàng</a></p>
    <script>window.location.replace(${JSON.stringify(appUrl)});</script>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}
