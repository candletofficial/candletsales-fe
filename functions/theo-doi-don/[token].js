const PREVIEW_VERSION = '10';
const TRACKING_TOKEN_PATTERN = /^(?:[A-Za-z0-9_-]{11}|[a-f0-9]{48})$/i;

function removeGenericMetadata(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
}

export async function onRequestGet(context) {
  const token = Array.isArray(context.params.token)
    ? context.params.token[0]
    : context.params.token;

  if (!token || !TRACKING_TOKEN_PATTERN.test(token)) return context.next();

  const requestUrl = new URL(context.request.url);
  const canonicalUrl = `${requestUrl.origin}/theo-doi-don/${encodeURIComponent(token)}?v=${PREVIEW_VERSION}`;
  const previewImageUrl = `${requestUrl.origin}/og-order-tracking-v7.jpg?v=${PREVIEW_VERSION}`;
  const title = 'Theo dõi đơn hàng Candlet';
  const description = 'Kiểm tra trạng thái và hành trình giao hàng của bạn.';

  const assetResponse = await context.env.ASSETS.fetch(new URL('/index.html', requestUrl.origin));
  if (!assetResponse.ok) return context.next();

  const appHtml = removeGenericMetadata(await assetResponse.text());
  const metadata = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:locale" content="vi_VN" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Candlet Shop" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${previewImageUrl}" />
    <meta property="og:image:url" content="${previewImageUrl}" />
    <meta property="og:image:secure_url" content="${previewImageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Theo dõi đơn hàng cùng Candlet Shop" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${previewImageUrl}" />`;
  const html = appHtml.replace('</head>', `${metadata}\n  </head>`);
  const headers = new Headers(assetResponse.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(html, { status: 200, headers });
}
