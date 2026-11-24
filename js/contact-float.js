/* ==========================================================================
   PCBid - Cụm nút liên hệ nổi ở góc phải dưới (contact-float.js)
   ==========================================================================
   Ba nút tròn: Facebook (mở fanpage ở tab mới), Zalo (mở cuộc trò chuyện Zalo)
   và Gọi điện (tel:). Hiện trên mọi trang, xếp dọc phía trên nút Tin nhắn.
   Trên điện thoại các nút thu nhỏ để không che nhiều nội dung.
   ========================================================================== */

// Thông tin liên hệ mô phỏng của PCBid
const FACEBOOK_URL = 'https://www.facebook.com/UIT.Fanpage';
const ZALO_PHONE = '0999999999';
const HOTLINE = '0999999999';

/**
 * Chèn cụm nút liên hệ nổi vào cuối trang (chỉ một lần)
 */
export function initContactFloat() {
  if (document.getElementById('pcb-contact-float')) return;

  const nav = document.createElement('nav');
  nav.className = 'pcb-contact-float';
  nav.id = 'pcb-contact-float';
  nav.setAttribute('aria-label', 'Liên hệ PCBid');
  nav.innerHTML = `
    <a class="pcb-contact-float__btn pcb-contact-float__btn--facebook" href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer"
      aria-label="Facebook PCBid (mở tab mới)" data-tooltip="Facebook">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21.95V14.2h2.6l.4-3.03h-3V9.24c0-.88.25-1.47 1.5-1.47h1.6V5.06a21.6 21.6 0 0 0-2.34-.12c-2.31 0-3.9 1.41-3.9 4v2.23H7.75v3.03h2.61v7.75z"/></svg>
    </a>
    <a class="pcb-contact-float__btn pcb-contact-float__btn--zalo" href="https://zalo.me/${ZALO_PHONE}" target="_blank" rel="noopener noreferrer"
      aria-label="Chat Zalo ${ZALO_PHONE} (mở tab mới)" data-tooltip="Zalo: ${ZALO_PHONE}">
      <span class="pcb-contact-float__zalo" aria-hidden="true">Zalo</span>
    </a>
    <a class="pcb-contact-float__btn pcb-contact-float__btn--phone" href="tel:${HOTLINE}"
      aria-label="Gọi hotline ${HOTLINE}" data-tooltip="Hotline: ${HOTLINE}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02z"/></svg>
    </a>
  `;
  document.body.appendChild(nav);
}
