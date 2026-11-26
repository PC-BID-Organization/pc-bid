/**
 * LOGIC ĐIỀU KHIỂN THÀNH PHẦN HEADER
 * Quản lý tương tác tìm kiếm, đồng bộ danh mục và kích hoạt tab đang xem
 */

// Tính số dư khả dụng (đã trừ tiền cọc đang giữ) từ module ví dùng chung
import { getAvailableBalance, getUnreadNotificationCount, getUserNotifications, markNotificationsRead, getParticipatingAuctions } from '../../js/wallet.js';
// Thời điểm kết thúc / trạng thái phiên để chỉ đếm phiên còn diễn ra
import { getAuctionEndTimestamp, isAuctionClosed } from '../../js/auction-time.js';
// Đơn hàng sau đấu giá để đếm số việc cần xử lý trên icon Quản lý đấu giá
import { getOrdersForUser, orderNeedsAction } from '../../js/settlement.js';
// Đếm watchlist riêng của tài khoản đang đăng nhập
import { USER_LIST_KEYS, readLoggedInUser } from '../../js/user-data.js';
// Tài khoản demo và avatar chữ cái dùng chung
import { DEMO_ACCOUNTS, getAvatarInitial, renderAvatarContent, findAccount } from '../../js/accounts.js';
// Hộp thoại xác nhận dùng chung
import { showConfirm } from '../../js/dialog.js';
// Bộ icon Lucide dùng chung
import { icon, NOTIFY_ICON_NAMES } from '../../js/icons.js';
// Chuyển đổi ngôn ngữ giao diện
import { LANGUAGES, getLanguage, setLanguage } from '../../js/i18n.js';
// Danh sách phiên đấu giá dùng chung để đếm số phiên đang đăng bán
import { loadAllAuctions, getSellingAuctions } from '../../js/bid-history.js';
// Danh sách theo dõi lưu theo tài khoản (đếm số trên icon bookmark)
import { getWatchlist } from '../../js/watchlist.js';
// Ô chọn tùy biến thay cho hộp chọn danh mục mặc định của trình duyệt
import { enhanceSelect } from '../../js/custom-select.js';

export function initHeader() {
  initSearchHandler();
  initActiveNavLink();
  initMobileNavToggle();
  initCategorySelectSync();
  initHeaderUserStatus();
  initNotifyPanel();
  refreshTradeBadge();
  initLanguageSwitcher();
}

/**
 * Tô đậm ngôn ngữ đang chọn ở mọi vị trí (thanh trên cùng và menu tài khoản)
 */
function syncLanguageButtons() {
  const lang = getLanguage();
  const current = LANGUAGES.find(l => l.code === lang);
  const codeEl = document.getElementById('header-lang-code');
  if (codeEl && current) codeEl.textContent = current.short;
  document.querySelectorAll('[data-lang]').forEach(el => {
    const active = el.dataset.lang === lang;
    el.classList.toggle('is-active', active);
    if (el.getAttribute('role') === 'menuitemradio') el.setAttribute('aria-checked', String(active));
    else el.setAttribute('aria-pressed', String(active));
  });
}

/**
 * Nút chọn ngôn ngữ trên thanh trên cùng và hàng chọn ngôn ngữ trong menu tài khoản (màn hình nhỏ)
 */
function initLanguageSwitcher() {
  const btn = document.getElementById('header-lang-btn');
  const menu = document.getElementById('header-lang-menu');

  const closeMenu = () => {
    if (!menu || !btn) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  if (btn && menu && !btn.dataset.bound) {
    btn.dataset.bound = '1';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) menu.querySelector('.is-active')?.focus();
    });
    document.addEventListener('click', e => {
      if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !menu.hidden) {
        closeMenu();
        btn.focus();
      }
    });
  }

  // Ủy quyền sự kiện: menu tài khoản được vẽ lại nhiều lần nên gắn một lần trên document
  if (!window.__pcbidLangBound) {
    window.__pcbidLangBound = true;
    document.addEventListener('click', e => {
      const option = e.target.closest('[data-lang]');
      if (!option) return;
      setLanguage(option.dataset.lang);
      closeMenu();
    });
    window.addEventListener('pcbid:language-changed', syncLanguageButtons);
  }
  syncLanguageButtons();
}

/* ==========================================================================
   BẢNG THÔNG BÁO NHANH (bấm chuông) & SỐ ĐẾM ICON QUẢN LÝ ĐẤU GIÁ
   ========================================================================== */


// Số thông báo hiển thị trước khi bấm "Xem thông báo trước đó"
const NOTIFY_PANEL_LIMIT = 5;

// Trạng thái bảng thông báo nhanh: bộ lọc Tất cả / Chưa đọc, đã mở rộng danh sách, menu ba chấm
const notifyState = { filter: 'all', expanded: false, menuOpen: false };

/**
 * Đóng bảng thông báo nhanh và đặt lại trạng thái thu gọn cho lần mở sau
 */
function closeNotifyPanel() {
  const panel = document.getElementById('header-notify-panel');
  const btn = document.getElementById('header-notify-btn');
  if (panel) panel.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
  notifyState.expanded = false;
  notifyState.menuOpen = false;
}

/**
 * Đổi mốc thời gian thành dạng ngắn như "Vừa xong", "5 phút", "3 giờ", "2 ngày"
 * @param {number} time - Mốc thời gian (ms)
 * @returns {string}
 */
function formatNotifyAgo(time) {
  if (!time) return '';
  const minutes = Math.floor(Math.max(0, Date.now() - time) / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày`;
  return `${Math.floor(days / 7)} tuần`;
}

/**
 * HTML một dòng thông báo: ảnh sản phẩm tròn kèm huy hiệu loại, nội dung và thời gian
 * @param {Object} n - Thông báo
 * @returns {string}
 */
function renderNotifyItem(n) {
  const image = n.image || 'images/placeholder-product.svg';
  return `
    <li>
      <a class="header__notify-item${n.read ? '' : ' header__notify-item--unread'}" href="product-detail.html?id=${n.productId}" data-notify-id="${escapeHeaderHtml(n.id)}">
        <span class="header__notify-avatar">
          <img src="${escapeHeaderHtml(image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
          <span class="header__notify-icon header__notify-icon--${n.type}">${icon(NOTIFY_ICON_NAMES[n.type] || 'bell', { size: 12 })}</span>
        </span>
        <span class="header__notify-body">
          <span class="header__notify-item-title">${escapeHeaderHtml(n.title)}</span>
          <span class="header__notify-item-msg">${escapeHeaderHtml(n.message)}</span>
          <span class="header__notify-time">${formatNotifyAgo(n.eventTime)}</span>
        </span>
        ${n.read ? '' : '<span class="header__notify-dot"><span class="header__notify-sr">Chưa đọc</span></span>'}
      </a>
    </li>
  `;
}

/**
 * Render nội dung bảng thông báo nhanh theo dữ liệu mới nhất (bố cục giống bảng thông báo Facebook)
 */
function renderNotifyPanel() {
  const panel = document.getElementById('header-notify-panel');
  if (!panel) return;
  const user = readLoggedInUser();
  if (!user) {
    panel.classList.remove('header__notify-panel--expanded');
    panel.innerHTML = `
      <div class="header__notify-head"><strong class="header__notify-title">Thông báo</strong></div>
      <p class="header__notify-empty">Đăng nhập để nhận thông báo khi bị vượt giá, thắng phiên và theo dõi đơn hàng.</p>
      <a href="login.html" class="header__notify-more">Đăng nhập ngay</a>
    `;
    return;
  }

  const all = getUserNotifications(user);
  const unreadCount = all.filter(n => !n.read).length;
  // Chưa đọc lên trước, trong cùng nhóm thì thông báo mới nhất đứng trên (sắp xếp trước khi cắt danh sách)
  const filtered = (notifyState.filter === 'unread' ? all.filter(n => !n.read) : [...all])
    .sort((a, b) => (a.read - b.read) || ((b.eventTime || 0) - (a.eventTime || 0)));
  const shown = notifyState.expanded ? filtered : filtered.slice(0, NOTIFY_PANEL_LIMIT);
  // Chia nhóm như Facebook: "Mới" (chưa đọc) và "Trước đó" (đã đọc)
  const groups = [
    { label: 'Mới', items: shown.filter(n => !n.read) },
    { label: 'Trước đó', items: shown.filter(n => n.read) }
  ].filter(g => g.items.length);

  panel.classList.toggle('header__notify-panel--expanded', notifyState.expanded);
  panel.innerHTML = `
    <div class="header__notify-head">
      <strong class="header__notify-title">Thông báo</strong>
      <div class="header__notify-menu-wrap">
        <button type="button" class="header__notify-menu-btn" data-notify-menu aria-label="Tùy chọn thông báo" aria-haspopup="true" aria-expanded="${notifyState.menuOpen}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
        </button>
        <div class="header__notify-menu" role="menu" ${notifyState.menuOpen ? '' : 'hidden'}>
          <button type="button" role="menuitem" class="header__notify-menu-item" data-notify-readall ${unreadCount ? '' : 'disabled'}>
            ${icon('check', { size: 16 })} Đánh dấu tất cả là đã đọc
          </button>
          <a role="menuitem" class="header__notify-menu-item" href="profile.html#notifications">
            ${icon('bell', { size: 16 })} Mở trang thông báo
          </a>
        </div>
      </div>
    </div>
    <div class="header__notify-tabs" role="group" aria-label="Lọc thông báo">
      <button type="button" class="header__notify-tab${notifyState.filter === 'all' ? ' is-active' : ''}" data-notify-filter="all" aria-pressed="${notifyState.filter === 'all'}">Tất cả</button>
      <button type="button" class="header__notify-tab${notifyState.filter === 'unread' ? ' is-active' : ''}" data-notify-filter="unread" aria-pressed="${notifyState.filter === 'unread'}">Chưa đọc</button>
    </div>
    <div class="header__notify-scroll">
      ${groups.length ? groups.map((g, i) => `
        <div class="header__notify-group-head">
          <span class="header__notify-group">${g.label}</span>
          ${i === 0 ? '<a href="profile.html#notifications" class="header__notify-seeall">Xem tất cả</a>' : ''}
        </div>
        <ul class="header__notify-list">${g.items.map(renderNotifyItem).join('')}</ul>
      `).join('') : `<p class="header__notify-empty">${notifyState.filter === 'unread'
        ? 'Bạn đã đọc hết thông báo.'
        : 'Chưa có thông báo nào. Đặt giá một phiên để bắt đầu nhận thông báo.'}</p>`}
      ${!notifyState.expanded && filtered.length > NOTIFY_PANEL_LIMIT
        ? '<button type="button" class="header__notify-more" data-notify-more>Xem thông báo trước đó</button>'
        : ''}
    </div>
  `;
}

/**
 * Bấm chuông: mở / đóng bảng thông báo nhanh thay vì chuyển thẳng sang trang thông báo
 */
function initNotifyPanel() {
  const btn = document.getElementById('header-notify-btn');
  const panel = document.getElementById('header-notify-panel');
  if (!btn || !panel || btn.dataset.bound) return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    const willOpen = panel.hidden;
    // Đóng menu tài khoản nếu đang mở để hai bảng không chồng lên nhau
    const userDropdown = document.getElementById('header-user-dropdown');
    if (userDropdown && !userDropdown.hidden) {
      userDropdown.hidden = true;
      document.getElementById('header-user-avatar-btn')?.setAttribute('aria-expanded', 'false');
    }
    if (willOpen) renderNotifyPanel();
    panel.hidden = !willOpen;
    btn.setAttribute('aria-expanded', String(willOpen));
  });

  panel.addEventListener('click', e => {
    const user = readLoggedInUser();
    // Các nút điều khiển vẽ lại bảng nên chặn lan sự kiện để bảng không tự đóng
    if (e.target.closest('[data-notify-readall]')) {
      e.stopPropagation();
      if (user) markNotificationsRead(user, getUserNotifications(user).map(n => n.id));
      notifyState.menuOpen = false;
      renderNotifyPanel();
      return;
    }
    if (e.target.closest('[data-notify-menu]')) {
      e.stopPropagation();
      notifyState.menuOpen = !notifyState.menuOpen;
      renderNotifyPanel();
      return;
    }
    const filterBtn = e.target.closest('[data-notify-filter]');
    if (filterBtn) {
      e.stopPropagation();
      notifyState.filter = filterBtn.dataset.notifyFilter;
      notifyState.expanded = false;
      notifyState.menuOpen = false;
      renderNotifyPanel();
      return;
    }
    // "Xem thông báo trước đó": hiện toàn bộ danh sách, bảng chuyển sang dạng cuộn
    if (e.target.closest('[data-notify-more]')) {
      e.stopPropagation();
      notifyState.expanded = true;
      notifyState.menuOpen = false;
      renderNotifyPanel();
      return;
    }
    // Bấm vùng khác trong bảng thì đóng menu ba chấm nếu đang mở
    if (notifyState.menuOpen && !e.target.closest('.header__notify-menu')) {
      e.stopPropagation();
      notifyState.menuOpen = false;
      renderNotifyPanel();
      return;
    }
    // Bấm một thông báo: đánh dấu đã đọc rồi mở phiên tương ứng
    const item = e.target.closest('[data-notify-id]');
    if (item && user) markNotificationsRead(user, [item.dataset.notifyId]);
  });

  document.addEventListener('click', e => {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) closeNotifyPanel();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) {
      closeNotifyPanel();
      btn.focus();
    }
  });

  // Đang mở mà có thông báo mới (bot vượt giá, đơn hàng đổi trạng thái): vẽ lại
  const refreshIfOpen = () => { if (!panel.hidden) renderNotifyPanel(); };
  window.addEventListener('pcbid:notifications-updated', refreshIfOpen);
  window.addEventListener('pcbid:bid-placed', refreshIfOpen);
  window.addEventListener('storage', refreshIfOpen);
}

/**
 * Số đếm trên icon Quản lý đấu giá: số đơn hàng đang chờ bạn xử lý
 * (thanh toán, xác nhận đã nhận hàng, hoặc giao hàng với vai trò người bán)
 */
function refreshTradeBadge() {
  const badge = document.getElementById('header-trade-badge');
  if (!badge) return;
  const user = readLoggedInUser();
  const count = user ? getOrdersForUser(user).filter(orderNeedsAction).length : 0;
  badge.textContent = count;
  badge.hidden = count === 0;
}

if (!window.__pcbidTradeBadgeBound) {
  window.__pcbidTradeBadgeBound = true;
  window.addEventListener('pcbid:orders-updated', refreshTradeBadge);
  window.addEventListener('storage', e => {
    if (!e.key || e.key === 'pcbid_orders') refreshTradeBadge();
  });
}

/**
 * Xử lý sự kiện gửi form tìm kiếm
 * Ngăn chặn gửi dữ liệu khi ô nhập liệu trống
 */
function initSearchHandler() {
  const searchForm = document.querySelector('.header__search-form');
  if (!searchForm) return;

  searchForm.addEventListener('submit', (e) => {
    const input = searchForm.querySelector('.header__search-input');
    if (!input || !input.value.trim()) {
      e.preventDefault();
      input?.focus();
    }
  });
}

/**
 * Đồng bộ nhãn hiển thị danh mục khi người dùng thay đổi lựa chọn trong thẻ select
 */
function initCategorySelectSync() {
  const select = document.querySelector('.header__search-select');
  const label = document.querySelector('.header__search-category-text');
  if (!select || !label) return;

  // Danh sách danh mục xổ xuống kiểu PCBid (giống nhau trên máy tính và điện thoại);
  // nhãn chữ và mũi tên cũ được ẩn vì ô chọn tùy biến đã có sẵn
  enhanceSelect(select, { wrapClass: 'header__category-select' });
  select.closest('.header__search-category')?.classList.add('header__search-category--enhanced');

  select.addEventListener('change', () => {
    const selectedOption = select.options[select.selectedIndex];
    label.textContent = selectedOption.text;
  });
}

/**
 * Tự động đánh dấu liên kết danh mục đang hoạt động (active link) dựa vào URL hiện tại
 */
function initActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const urlParams = new URLSearchParams(window.location.search);
  const currentCategory = urlParams.get('category');
  const currentStatus = urlParams.get('status');

  const navLinks = document.querySelectorAll('.header__nav-link');
  if (!navLinks.length) return;

  navLinks.forEach((link) => {
    link.classList.remove('header__nav-link--active');
    const href = link.getAttribute('href');

    if (!href) return;

    if (currentCategory && href.includes(`category=${currentCategory}`)) {
      link.classList.add('header__nav-link--active');
    } else if (currentStatus && href.includes(`status=${currentStatus}`)) {
      link.classList.add('header__nav-link--active');
    } else if (!currentCategory && !currentStatus && href === currentPath) {
      link.classList.add('header__nav-link--active');
    }
  });
}

/**
 * Cập nhật huy hiệu số thông báo chưa đọc trên biểu tượng chuông; ẩn huy hiệu khi bằng 0
 */
function refreshNotificationBadge() {
  const notifyBadge = document.getElementById('header-notification-badge');
  if (!notifyBadge) return;
  let count = 0;
  try {
    const loggedIn = readLoggedInUser();
    count = loggedIn ? getUnreadNotificationCount(loggedIn) : 0;
  } catch {
    count = 0;
  }
  notifyBadge.textContent = count;
  notifyBadge.hidden = count === 0;
}

/**
 * Nút "Danh mục" trên di động: bấm để mở / đóng thanh điều hướng theo chiều dọc
 * Tự đóng khi chọn một mục, bấm ra ngoài hoặc nhấn phím Escape
 */
function initMobileNavToggle() {
  const toggle = document.getElementById('header-nav-toggle');
  const list = document.getElementById('header-nav-list');
  if (!toggle || !list) return;

  // Hiển thị tên mục đang xem bên cạnh chữ "Danh mục"
  const current = document.getElementById('header-nav-current');
  const activeLink = list.querySelector('.header__nav-link--active');
  if (current && activeLink) current.textContent = activeLink.textContent.trim();

  const setOpen = (open) => {
    list.classList.toggle('header__nav-list--open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  list.addEventListener('click', (e) => {
    if (e.target.closest('.header__nav-link')) setOpen(false);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header__nav-bar')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
}

/**
 * Quản lý trạng thái đăng nhập và số lượng Watchlist hiển thị trên Header
 */
// 4 tài khoản demo lấy từ module dùng chung js/accounts.js
const SAMPLE_ACCOUNTS = DEMO_ACCOUNTS;

/**
 * Số phiên trong danh sách theo dõi của tài khoản đang đăng nhập (icon bookmark trên Header)
 */
function refreshWatchlistBadge() {
  const badge = document.getElementById('header-watchlist-badge');
  if (!badge) return;
  try {
    badge.textContent = getWatchlist().length;
  } catch {
    badge.textContent = '0';
  }
}

function initHeaderUserStatus() {
  // Cập nhật số lượng Watchlist từ LocalStorage
  refreshWatchlistBadge();
  // Bấm bookmark ở trang bất kỳ (hoặc ở tab khác): cập nhật số đếm ngay
  if (!window.__pcbidWatchBadgeBound) {
    window.__pcbidWatchBadgeBound = true;
    window.addEventListener('pcbid:watchlist-updated', refreshWatchlistBadge);
    window.addEventListener('storage', e => {
      if (!e.key || e.key.startsWith(USER_LIST_KEYS.WATCHLIST)) refreshWatchlistBadge();
    });
  }

  // Số thông báo chưa đọc của tài khoản đang đăng nhập
  refreshNotificationBadge();
  // Trang Hồ sơ đổi ảnh đại diện / họ tên: vẽ lại khu vực tài khoản trên Header
  if (!window.__pcbidAccountUpdateBound) {
    window.__pcbidAccountUpdateBound = true;
    window.addEventListener('pcbid:account-updated', () => initHeaderUserStatus());
  }
  if (!window.__pcbidNotifyBadgeBound) {
    window.__pcbidNotifyBadgeBound = true;
    // Cập nhật khi đánh dấu đã đọc trên cùng trang, hoặc khi tab khác đặt giá / đọc thông báo
    window.addEventListener('pcbid:notifications-updated', refreshNotificationBadge);
    window.addEventListener('storage', (e) => {
      if (!e.key || e.key === 'pcbid_bids' || e.key.startsWith('pcbid_notifications_read')) refreshNotificationBadge();
    });
  }

  // Đọc thông tin người dùng đang đăng nhập
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('pcbid_currentUser') || localStorage.getItem('pcbid_user') || 'null');
  } catch {
    user = null;
  }

  const userStatusEl = document.getElementById('header-user-status');
  const topAuthDivider = document.getElementById('header-top-auth-divider');
  const avatarBtn = document.getElementById('header-user-avatar-btn');
  const dropdown = document.getElementById('header-user-dropdown');

  // 1. THANH TOP BAR: Khi đăng nhập chỉ hiện thuần text 'Xin chào, ...', khi đăng xuất thì ẩn hoàn toàn
  if (user && user.isLoggedIn !== false) {
    const displayName = user.fullname || user.username || 'Thành viên';
    if (userStatusEl) {
      userStatusEl.innerHTML = `Xin chào, <strong class="header__top-user-name">${escapeHeaderHtml(displayName)}</strong>`;
      userStatusEl.hidden = false;
    }
    if (topAuthDivider) {
      topAuthDivider.hidden = false;
    }
  } else {
    if (userStatusEl) {
      userStatusEl.innerHTML = '';
      userStatusEl.hidden = true;
    }
    if (topAuthDivider) {
      topAuthDivider.hidden = true;
    }
  }

  // 2. AVATAR & DROPDOWN MENU: Nơi tương tác đăng nhập / đăng xuất chính của website
  if (!avatarBtn || !dropdown) return;

  if (user && user.isLoggedIn !== false) {
    const displayName = user.fullname || user.username || 'Thành viên';
    // Avatar mặc định: chữ cái đầu của TÊN, đồng bộ với trang Hồ sơ và trang chi tiết
    const initials = getAvatarInitial(user);
    // Không phân biệt người bán / người mua: chỉ hiện số phiên đang bán và đang tham gia
    const now = Date.now();
    const participatingCount = getParticipatingAuctions(user).filter(item => getAuctionEndTimestamp(item) > now).length;
    const renderStats = sellingCount => `
      <span class="header__dropdown-stat">${icon('tag', { size: 12 })} ${sellingCount} phiên đang bán</span>
      <span class="header__dropdown-stat">${icon('gavel', { size: 12 })} ${participatingCount} phiên đang tham gia</span>`;

    avatarBtn.title = `Tài khoản: ${displayName}`;
    avatarBtn.classList.add('header__user-avatar--initial');
    avatarBtn.innerHTML = user.avatarImage
      ? renderAvatarContent(user, 'header__avatar-photo')
      : `<span class="header__avatar-initial" aria-hidden="true">${escapeHeaderHtml(initials)}</span>`;

    dropdown.innerHTML = `
      <div class="header__dropdown-header">
        <div class="header__dropdown-user-info">
          <div class="header__dropdown-avatar">${user.avatarImage ? renderAvatarContent(user, 'header__avatar-photo') : escapeHeaderHtml(initials)}</div>
          <div class="header__dropdown-meta">
            <div class="header__dropdown-name">${escapeHeaderHtml(displayName)}</div>
            <div class="header__dropdown-stats" id="header-dropdown-stats">${renderStats(0)}</div>
            <div class="header__dropdown-email">${escapeHeaderHtml(user.email || '')}</div>
          </div>
        </div>
        <div class="header__dropdown-wallet">
          <span class="header__dropdown-wallet-label">Ví khả dụng:</span>
          <span class="header__dropdown-wallet-val">${formatHeaderVnd(getAvailableBalance(user))}</span>
        </div>
      </div>

      <div class="header__dropdown-divider"></div>

      <ul class="header__dropdown-list">
        ${user.role === 'admin' ? `
        <li>
          <a href="profile.html#admin-approvals" class="header__dropdown-item header__dropdown-item--admin">
            ${icon('shield-check', { size: 15 })}
            <span>Quản lý &amp; Duyệt phiên (Admin)</span>
          </a>
        </li>
        ` : ''}
        <li>
          <a href="profile.html" class="header__dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Hồ sơ cá nhân &amp; Cài đặt</span>
          </a>
        </li>
        <li>
          <a href="profile.html#my-auctions" class="header__dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Quản lý phiên đấu giá</span>
          </a>
        </li>
        <li>
          <a href="sell.html" class="header__dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            <span>Đăng bán linh kiện mới</span>
          </a>
        </li>
        <li>
          <a href="profile.html#watchlist" class="header__dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span>Danh sách theo dõi</span>
          </a>
        </li>
        <li>
          <a href="profile.html#buy-orders" class="header__dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span>Đơn mua của tôi</span>
          </a>
        </li>
        <li>
          <a href="profile.html#sell-orders" class="header__dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            <span>Đơn bán của tôi</span>
          </a>
        </li>
      </ul>

      <div class="header__dropdown-divider"></div>
      <div class="header__dropdown-lang">
        <span class="header__dropdown-lang-label">Ngôn ngữ</span>
        <div class="header__dropdown-lang-options" translate="no">
          <button type="button" class="header__dropdown-lang-btn" data-lang="vi">VI</button>
          <button type="button" class="header__dropdown-lang-btn" data-lang="en">EN</button>
          <button type="button" class="header__dropdown-lang-btn" data-lang="ja">JA</button>
        </div>
      </div>

      <div class="header__dropdown-footer">
        <button type="button" class="header__dropdown-logout-btn" id="header-dropdown-logout-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>
    `;

    // Số phiên đang bán cần nạp catalog nên cập nhật bất đồng bộ (chỉ tính phiên chưa kết thúc)
    loadAllAuctions().then(auctions => {
      const sellingCount = getSellingAuctions(user.username, auctions)
        .filter(p => !isAuctionClosed(p) && p.endTimestamp > Date.now()).length;
      const statsEl = document.getElementById('header-dropdown-stats');
      if (statsEl) statsEl.innerHTML = renderStats(sellingCount);
    }).catch(() => {});

    const logoutBtn = document.getElementById('header-dropdown-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const ok = await showConfirm({
          title: 'Đăng xuất tài khoản?',
          message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản PCBid?',
          confirmText: 'Đăng xuất',
          tone: 'danger'
        });
        if (ok) {
          localStorage.removeItem('pcbid_currentUser');
          localStorage.removeItem('pcbid_user');
          localStorage.setItem('pcbid_logged_out', 'true');
          window.location.reload();
        }
      });
    }
  } else {
    // Trạng thái khách (chưa đăng nhập)
    avatarBtn.title = 'Tài khoản (Chưa đăng nhập)';
    avatarBtn.classList.remove('header__user-avatar--initial');
    avatarBtn.innerHTML = '<img src="images/icons/icon-user.svg" alt="Ảnh đại diện" class="header__avatar-icon" width="14" height="14">';

    dropdown.innerHTML = `
      <div class="header__dropdown-header">
        <div class="header__dropdown-welcome">Chào mừng đến với PCBid!</div>
        <div class="header__dropdown-welcome-sub">Đăng nhập để tham gia đấu giá linh kiện và quản lý tài khoản.</div>
      </div>

      <div class="header__dropdown-actions">
        <a href="login.html" class="header__dropdown-btn header__dropdown-btn--primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          <span>Đăng nhập</span>
        </a>
        <a href="register.html" class="header__dropdown-btn header__dropdown-btn--outline">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          <span>Đăng ký thành viên</span>
        </a>
      </div>

      <div class="header__dropdown-lang">
        <span class="header__dropdown-lang-label">Ngôn ngữ</span>
        <div class="header__dropdown-lang-options" translate="no">
          <button type="button" class="header__dropdown-lang-btn" data-lang="vi">VI</button>
          <button type="button" class="header__dropdown-lang-btn" data-lang="en">EN</button>
          <button type="button" class="header__dropdown-lang-btn" data-lang="ja">JA</button>
        </div>
      </div>

      <div class="header__dropdown-divider"></div>

      <div>
        <div class="header__dropdown-quick-title">
          ${icon('zap', { size: 13 })} Đăng nhập nhanh tài khoản Demo:
        </div>
        <div class="header__dropdown-quick-list">
          ${SAMPLE_ACCOUNTS.map(acc => `
          <button type="button" class="header__dropdown-quick-acc" data-quick-user="${acc.username}">
            <span class="header__dropdown-quick-name">${icon(acc.role === 'admin' ? 'shield-check' : 'user', { size: 13 })} ${escapeHeaderHtml(acc.role === 'admin' ? 'Quản trị viên' : acc.fullname)}</span>
            <span class="header__dropdown-quick-role">(${acc.role === 'admin' ? 'Admin' : (acc.username === 'seller' ? 'Có phiên đăng bán' : 'Đấu giá')})</span>
          </button>`).join('')}
        </div>
      </div>
    `;

    dropdown.querySelectorAll('.header__dropdown-quick-acc').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-quick-user');
        // Lấy bản tài khoản đã lưu (giữ ảnh đại diện, tiểu sử) nếu có
        const acc = findAccount({ username: key }) || SAMPLE_ACCOUNTS.find(a => a.username === key);
        if (acc) {
          localStorage.removeItem('pcbid_logged_out');
          localStorage.setItem('pcbid_currentUser', JSON.stringify({ ...acc, isLoggedIn: true }));
          localStorage.setItem('pcbid_user', JSON.stringify({ ...acc, isLoggedIn: true }));
          window.location.reload();
        }
      });
    });
  }

  // Menu vừa vẽ lại: đánh dấu ngôn ngữ đang chọn
  syncLanguageButtons();

  // Đóng/Mở Dropdown khi bấm vào Avatar
  avatarBtn.onclick = (e) => {
    e.stopPropagation();
    const isHidden = dropdown.hidden;
    // Mở menu: tính lại số dư khả dụng để phản ánh lượt đặt giá / bị vượt giá mới nhất
    if (isHidden) {
      refreshHeaderWallet();
      closeNotifyPanel();
    }
    dropdown.hidden = !isHidden;
    avatarBtn.setAttribute('aria-expanded', String(isHidden));
  };

  // Đóng Dropdown khi click ra ngoài
  document.addEventListener('click', (e) => {
    if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== avatarBtn && !avatarBtn.contains(e.target)) {
      dropdown.hidden = true;
      avatarBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Đóng Dropdown khi nhấn phím Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.hidden) {
      dropdown.hidden = true;
      avatarBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * Cập nhật số dư khả dụng trong menu tài khoản từ dữ liệu mới nhất trong localStorage
 * (tiền cọc thay đổi mỗi khi đặt giá, bị vượt giá hoặc phiên kết thúc)
 */
function refreshHeaderWallet() {
  const walletEl = document.querySelector('#header-user-dropdown .header__dropdown-wallet-val');
  if (!walletEl) return;
  const user = readLoggedInUser();
  if (user) walletEl.textContent = formatHeaderVnd(getAvailableBalance(user));
}

// Đặt giá trên cùng trang (pcbid:bid-placed) hoặc ở tab khác (storage): làm mới số dư ngay
if (!window.__pcbidWalletRefreshBound) {
  window.__pcbidWalletRefreshBound = true;
  window.addEventListener('pcbid:bid-placed', refreshHeaderWallet);
  window.addEventListener('pcbid:wallet-updated', refreshHeaderWallet);
  window.addEventListener('storage', (e) => {
    if (!e.key || ['pcbid_bids', 'pcbid_products', 'pcbid_currentUser', 'pcbid_user'].includes(e.key)) refreshHeaderWallet();
  });
}

function formatHeaderVnd(n) {
  const num = Number(n);
  if (isNaN(num)) return '0 đ';
  return num.toLocaleString('vi-VN') + ' đ';
}

function escapeHeaderHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
