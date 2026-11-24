const API_BASE_URL = 'https://candletshop-api.onrender.com/api';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16}$/;
const PREVIEW_VERSION = '3';

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function cloudinaryBanner(url, isPreview) {
  if (!/^https:\/\/res\.cloudinary\.com\//i.test(url) || !url.includes('/upload/')) return url;
  const transformation = isPreview
    ? 'c_fill,g_center,w_1200,h_630,q_auto,f_jpg'
    : 'c_pad,b_rgb:f7f1e8,w_1200,h_630,q_auto,f_jpg';
  return url.replace('/upload/', `/upload/${transformation}/`);
}

function versionedUrl(url) {
  try {
    const result = new URL(url);
    result.searchParams.set('preview', PREVIEW_VERSION);
    return result.toString();
  } catch {
    return url;
  }
}

function removeGenericMetadata(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');
}

export async function onRequestGet(context) {
  const token = context.params.token;
  if (!TOKEN_PATTERN.test(token)) return context.next();

  let mockup;
  try {
    const apiResponse = await fetch(`${API_BASE_URL}/mockups/public/${encodeURIComponent(token)}?preview=1`);
    if (!apiResponse.ok) return context.next();
    const payload = await apiResponse.json();
    mockup = payload.data;
  } catch {
    return context.next();
  }
  if (!mockup?.label_url) return context.next();

  const requestUrl = new URL(context.request.url);
  const canonicalUrl = `${requestUrl.origin}/mockup/${encodeURIComponent(token)}?v=${PREVIEW_VERSION}`;
  const fileName = mockup.label_file_name || 'Tem custom';
  const title = `${fileName} · Mockup tem cốc 3D`;
  const description = `Xem trực tiếp mẫu tem ${mockup.label_width} × ${mockup.label_height} mm trên cốc nến 3D Candlet.`;
  const imageUrl = versionedUrl(cloudinaryBanner(mockup.preview_url || mockup.label_url, Boolean(mockup.preview_url)));

  const assetResponse = await context.env.ASSETS.fetch(new URL('/index.html', requestUrl.origin));
  if (!assetResponse.ok) return context.next();
  const appHtml = removeGenericMetadata(await assetResponse.text());
  const metadata = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:locale" content="vi_VN" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="CANDLET" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Mockup 3D ${escapeHtml(fileName)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`;
  const html = appHtml.replace('</head>', `${metadata}\n  </head>`);
  const headers = new Headers(assetResponse.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store, max-age=0');
  return new Response(html, { status: 200, headers });
}
