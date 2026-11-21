/**
 * LOGIC ĐIỀU KHIỂN THÀNH PHẦN HEADER
 * Quản lý tương tác tìm kiếm, đồng bộ danh mục và kích hoạt tab đang xem
 */

// Tính số dư khả dụng (đã trừ tiền cọc đang giữ) từ module ví dùng chung
import { getAvailableBalance, getUnreadNotificationCount } from '../../js/wallet.js';
// Đếm watchlist riêng của tài khoản đang đăng nhập
import { USER_LIST_KEYS, readLoggedInUser, userStorageKey } from '../../js/user-data.js';
// Tài khoản demo và avatar chữ cái dùng chung
import { DEMO_ACCOUNTS, getAvatarInitial, renderAvatarContent, findAccount } from '../../js/accounts.js';
// Hộp thoại xác nhận dùng chung
import { showConfirm } from '../../js/dialog.js';
// Danh sách phiên đấu giá dùng chung để đếm số phiên đang đăng bán
import { loadAllAuctions, getSellingAuctions } from '../../js/bid-history.js';

export function initHeader() {
  initSearchHandler();
  initActiveNavLink();
  initMobileNavToggle();
  initCategorySelectSync();
  initHeaderUserStatus();
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

function initHeaderUserStatus() {
  // Cập nhật số lượng Watchlist từ LocalStorage
  const badge = document.getElementById('header-watchlist-badge');
  if (badge) {
    try {
      const loggedIn = readLoggedInUser();
      const watchlist = loggedIn
        ? JSON.parse(localStorage.getItem(userStorageKey(USER_LIST_KEYS.WATCHLIST, loggedIn)) || '[]')
        : [];
      badge.textContent = watchlist.length;
    } catch {
      badge.textContent = '0';
    }
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
      userStatusEl.innerHTML = `Xin chào, <strong style="color:#ea580c; font-weight:700;">${escapeHeaderHtml(displayName)}</strong>`;
      userStatusEl.style.display = 'inline';
    }
    if (topAuthDivider) {
      topAuthDivider.style.display = 'inline';
    }
  } else {
    if (userStatusEl) {
      userStatusEl.innerHTML = '';
      userStatusEl.style.display = 'none';
    }
    if (topAuthDivider) {
      topAuthDivider.style.display = 'none';
    }
  }

  // 2. AVATAR & DROPDOWN MENU: Nơi tương tác đăng nhập / đăng xuất chính của website
  if (!avatarBtn || !dropdown) return;

  if (user && user.isLoggedIn !== false) {
    const displayName = user.fullname || user.username || 'Thành viên';
    // Avatar mặc định: chữ cái đầu của TÊN, đồng bộ với trang Hồ sơ và trang chi tiết
    const initials = getAvatarInitial(user);
    // Mọi tài khoản đều là thành viên đấu giá (ai cũng có thể đăng bán)
    const roleText = '👤 Đấu giá viên';
    const roleClass = 'header__dropdown-role-badge--bidder';

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
            <span class="header__dropdown-role-badge ${roleClass}" id="header-dropdown-role">${roleText}</span>
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
      </ul>

      <div class="header__dropdown-divider"></div>

      <div class="header__dropdown-footer">
        <button type="button" class="header__dropdown-logout-btn" id="header-dropdown-logout-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>
    `;

    // Giống hồ sơ công khai: nếu có đăng bán thì ghi thêm số phiên (nạp catalog bất đồng bộ)
    loadAllAuctions().then(auctions => {
      const sellingCount = getSellingAuctions(user.username, auctions).length;
      const roleEl = document.getElementById('header-dropdown-role');
      if (roleEl && sellingCount) roleEl.textContent = `${roleText} · ${sellingCount} phiên đăng bán`;
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
        <div style="font-size: 13px; font-weight: 700; color: #0b1c30; margin-bottom: 3px;">Chào mừng đến với PCBid!</div>
        <div style="font-size: 11px; color: #64748b; line-height: 1.4;">Đăng nhập để tham gia đấu giá linh kiện và quản lý tài khoản.</div>
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

      <div class="header__dropdown-divider"></div>

      <div>
        <div style="font-size: 11px; font-weight: 700; color: #065f46; margin-bottom: 6px;">
          ⚡ Đăng nhập nhanh tài khoản Demo:
        </div>
        <div style="display: flex; flex-direction: column; gap: 5px;">
          ${SAMPLE_ACCOUNTS.map(acc => `
          <button type="button" class="header__dropdown-quick-acc" data-quick-user="${acc.username}">
            <span style="font-weight: 600;">👤 ${escapeHeaderHtml(acc.fullname)}</span>
            <span style="font-size: 11px; color: #64748b;">(${acc.username === 'seller' ? 'Có phiên đăng bán' : 'Đấu giá'})</span>
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

  // Đóng/Mở Dropdown khi bấm vào Avatar
  avatarBtn.onclick = (e) => {
    e.stopPropagation();
    const isHidden = dropdown.hidden;
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

function formatHeaderVnd(n) {
  const num = Number(n);
  if (isNaN(num)) return '0 đ';
  return num.toLocaleString('vi-VN') + ' đ';
}

function escapeHeaderHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
