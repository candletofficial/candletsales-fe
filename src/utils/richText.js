const ALLOWED_TAGS = new Set([
  'P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H2', 'H3', 'SPAN', 'FONT',
]);

const BLOCKED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON']);
const SAFE_STYLE_PROPERTIES = new Set(['color', 'background-color', 'text-align']);

const cleanStyle = (value = '') => String(value || '')
  .split(';')
  .map((rule) => rule.trim())
  .filter(Boolean)
  .map((rule) => {
    const separator = rule.indexOf(':');
    if (separator < 1) return '';
    const property = rule.slice(0, separator).trim().toLowerCase();
    const styleValue = rule.slice(separator + 1).trim();
    if (!SAFE_STYLE_PROPERTIES.has(property) || /url\s*\(|expression\s*\(|javascript:/i.test(styleValue)) return '';
    return `${property}: ${styleValue}`;
  })
  .filter(Boolean)
  .join('; ');

export const sanitizeRichHtml = (value = '') => {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return String(value || '');
  const parsed = new DOMParser().parseFromString(`<div>${String(value || '')}</div>`, 'text/html');
  const source = parsed.body.firstElementChild;
  const output = document.createElement('div');

  const appendSafe = (node, parent) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent || ''));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || BLOCKED_TAGS.has(node.tagName)) return;

    if (!ALLOWED_TAGS.has(node.tagName)) {
      [...node.childNodes].forEach((child) => appendSafe(child, parent));
      return;
    }

    const element = document.createElement(node.tagName.toLowerCase());
    const safeStyle = cleanStyle(node.getAttribute('style'));
    if (safeStyle) element.setAttribute('style', safeStyle);
    if (node.tagName === 'FONT' && /^#[0-9a-f]{3,8}$/i.test(node.getAttribute('color') || '')) {
      element.setAttribute('color', node.getAttribute('color'));
    }
    [...node.childNodes].forEach((child) => appendSafe(child, element));
    parent.appendChild(element);
  };

  [...source.childNodes].forEach((node) => appendSafe(node, output));
  return output.innerHTML;
};

export const descriptionToHtml = (value = '') => {
  const text = String(value || '');
  if (/<[a-z][\s\S]*>/i.test(text)) return sanitizeRichHtml(text);
  const container = document.createElement('div');
  container.textContent = text;
  return container.innerHTML.replace(/\r?\n/g, '<br>');
};

export const richTextToPlainText = (value = '') => {
  const text = String(value || '');
  if (typeof document === 'undefined') return text.replace(/<[^>]*>/g, ' ');
  const container = document.createElement('div');
  container.innerHTML = sanitizeRichHtml(text);
  return (container.textContent || '').replace(/\s+/g, ' ').trim();
};
