/* ==========================================================================
   PCBid - Chuyển đổi ngôn ngữ giao diện: Tiếng Việt / English / 日本語 (i18n.js)
   ==========================================================================
   Cách hoạt động (thuần JavaScript, không thư viện):
   - Nội dung gốc của website viết bằng tiếng Việt. Từ điển js/i18n-dict.js
     ánh xạ từng câu tiếng Việt sang tiếng Anh và tiếng Nhật, kèm một số mẫu
     câu có số (ví dụ "4 phiên đang tham gia").
   - Khi chọn ngôn ngữ khác, script duyệt các nút chữ (text node) và thuộc tính
     placeholder / title / aria-label trên trang rồi thay theo từ điển. Bản gốc
     được ghi nhớ để chuyển về tiếng Việt bất cứ lúc nào.
   - MutationObserver theo dõi nội dung được JavaScript vẽ thêm sau này (thẻ
     sản phẩm, menu, hộp chat, thông báo...) để dịch ngay khi xuất hiện.
   - Ngôn ngữ đã chọn lưu trong localStorage (pcbid_lang), áp dụng cho mọi trang.
   - Tên sản phẩm, thông số, tên người dùng và nội dung tin nhắn giữ nguyên.
   ========================================================================== */

import { PHRASES, PATTERNS } from './i18n-dict.js';

const LANG_KEY = 'pcbid_lang';

// Danh sách ngôn ngữ hỗ trợ
export const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', short: 'VI' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ja', label: '日本語', short: 'JA' }
];

// Thuộc tính chứa chữ hiển thị cần dịch
const ATTRS = ['placeholder', 'title', 'aria-label', 'data-tooltip'];
// Vùng không dịch: nội dung người dùng tự nhập (tin nhắn), mã nguồn, vùng đánh dấu translate="no"
const SKIP_SELECTOR = 'script, style, textarea, code, pre, [translate="no"], [data-no-i18n], .pcb-chat__bubble';

// Từ điển tra cứu nhanh theo câu tiếng Việt đã chuẩn hóa khoảng trắng
const DICTS = { en: new Map(), ja: new Map() };
PHRASES.forEach(([vi, en, ja]) => {
  const key = normalize(vi);
  if (en) DICTS.en.set(key, en);
  if (ja) DICTS.ja.set(key, ja);
});

// Ghi nhớ bản gốc và bản đã dịch của từng nút chữ / thuộc tính
const textOriginal = new WeakMap();
const textApplied = new WeakMap();
const attrOriginal = new WeakMap();
const attrApplied = new WeakMap();

let currentLang = readLang();
let titleOriginal = null;

/**
 * Chuẩn hóa khoảng trắng để so khớp từ điển
 * @param {string} text
 * @returns {string}
 */
function normalize(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Đọc ngôn ngữ đã lưu
 * @returns {'vi'|'en'|'ja'}
 */
function readLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return LANGUAGES.some(l => l.code === saved) ? saved : 'vi';
  } catch {
    return 'vi';
  }
}

/**
 * Ngôn ngữ hiện tại
 * @returns {'vi'|'en'|'ja'}
 */
export function getLanguage() {
  return currentLang;
}

/**
 * Dịch một câu tiếng Việt sang ngôn ngữ đang chọn (trả về null nếu không có trong từ điển)
 * @param {string} text - Câu gốc tiếng Việt
 * @param {string} [lang]
 * @returns {string|null}
 */
export function translateText(text, lang = currentLang) {
  if (lang === 'vi') return null;
  const key = normalize(text);
  if (!key) return null;
  const hit = DICTS[lang]?.get(key);
  if (hit) return hit;
  for (const [pattern, en, ja] of PATTERNS) {
    if (pattern.test(key)) return key.replace(pattern, lang === 'en' ? en : ja);
  }
  return null;
}

/**
 * Dịch nhanh trong mã JavaScript: trả về bản dịch nếu có, ngược lại giữ câu gốc
 * @param {string} text
 * @returns {string}
 */
export function t(text) {
  return translateText(text) || text;
}

/**
 * Giữ nguyên khoảng trắng đầu / cuối của câu gốc khi thay bằng bản dịch
 * @param {string} original
 * @param {string} translated
 * @returns {string}
 */
function keepSpacing(original, translated) {
  const lead = original.match(/^\s*/)[0];
  const trail = original.match(/\s*$/)[0];
  return `${lead}${translated}${trail}`;
}

/**
 * Nút nằm trong vùng không dịch?
 * @param {Node} node
 * @returns {boolean}
 */
function isSkipped(node) {
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return !el || Boolean(el.closest(SKIP_SELECTOR));
}

/**
 * Hiển thị một nút chữ theo ngôn ngữ hiện tại
 * @param {Text} node
 */
function renderText(node) {
  const value = node.nodeValue;
  // Nội dung do ứng dụng thay đổi (không phải do bộ dịch ghi) → cập nhật bản gốc
  if (textApplied.get(node) !== value) textOriginal.set(node, value);
  const original = textOriginal.get(node);
  const translated = translateText(original);
  const output = translated ? keepSpacing(original, translated) : original;
  textApplied.set(node, output);
  if (value !== output) node.nodeValue = output;
}

/**
 * Hiển thị một thuộc tính theo ngôn ngữ hiện tại
 * @param {Element} el
 * @param {string} attr
 */
function renderAttr(el, attr) {
  const value = el.getAttribute(attr);
  if (value === null) return;
  const originals = attrOriginal.get(el) || {};
  const applied = attrApplied.get(el) || {};
  if (applied[attr] !== value) originals[attr] = value;
  const translated = translateText(originals[attr]);
  const output = translated || originals[attr];
  applied[attr] = output;
  attrOriginal.set(el, originals);
  attrApplied.set(el, applied);
  if (value !== output) el.setAttribute(attr, output);
}

/**
 * Dịch toàn bộ một vùng DOM
 * @param {Node} root
 */
function translateTree(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (!isSkipped(root) && root.nodeValue.trim()) renderText(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  const base = root.nodeType === Node.DOCUMENT_NODE ? root.body : root;
  if (!base || isSkipped(base)) return;

  const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.nodeValue.trim() && !isSkipped(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
  });
  let node;
  while ((node = walker.nextNode())) renderText(node);

  const selector = ATTRS.map(a => `[${a}]`).join(',');
  const elements = base.matches?.(selector) ? [base, ...base.querySelectorAll(selector)] : base.querySelectorAll(selector);
  elements.forEach(el => {
    if (isSkipped(el)) return;
    ATTRS.forEach(attr => { if (el.hasAttribute(attr)) renderAttr(el, attr); });
  });
}

/**
 * Dịch tiêu đề tab trình duyệt
 */
function translateTitle() {
  if (titleOriginal === null || document.title !== titleOriginal.applied) {
    titleOriginal = { original: document.title, applied: document.title };
  }
  const translated = translateText(titleOriginal.original);
  const output = translated || titleOriginal.original;
  titleOriginal.applied = output;
  if (document.title !== output) document.title = output;
}

/**
 * Chuyển ngôn ngữ giao diện
 * @param {'vi'|'en'|'ja'} lang
 */
export function setLanguage(lang) {
  if (!LANGUAGES.some(l => l.code === lang)) return;
  currentLang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Bỏ qua khi localStorage bị chặn
  }
  document.documentElement.lang = lang;
  translateTree(document);
  translateTitle();
  window.dispatchEvent(new CustomEvent('pcbid:language-changed', { detail: { lang } }));
}

/**
 * Khởi động bộ dịch: dịch trang hiện tại và theo dõi nội dung mới (gọi một lần từ main.js)
 */
export function initI18n() {
  if (window.__pcbidI18nStarted) return;
  window.__pcbidI18nStarted = true;
  document.documentElement.lang = currentLang;
  if (currentLang !== 'vi') {
    translateTree(document);
    translateTitle();
  }

  const observer = new MutationObserver(mutations => {
    if (currentLang === 'vi') return;
    mutations.forEach(m => {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => translateTree(n));
        if (m.target === document.head || m.target.nodeName === 'TITLE') translateTitle();
      } else if (m.type === 'characterData') {
        if (m.target.parentNode?.nodeName === 'TITLE') translateTitle();
        else if (!isSkipped(m.target) && m.target.nodeValue.trim()) renderText(m.target);
      } else if (m.type === 'attributes' && ATTRS.includes(m.attributeName) && !isSkipped(m.target)) {
        renderAttr(m.target, m.attributeName);
      }
    });
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS
  });

  // Tab khác đổi ngôn ngữ: đồng bộ theo
  window.addEventListener('storage', e => {
    if (e.key === LANG_KEY && e.newValue && e.newValue !== currentLang) setLanguage(e.newValue);
  });
}
