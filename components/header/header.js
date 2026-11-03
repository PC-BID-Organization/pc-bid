/**
 * LOGIC ĐIỀU KHIỂN THÀNH PHẦN HEADER
 * Quản lý tương tác tìm kiếm, đồng bộ danh mục và kích hoạt tab đang xem
 */
export function initHeader() {
  initSearchHandler();
  initActiveNavLink();
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
 * Quản lý trạng thái đăng nhập và số lượng Watchlist hiển thị trên Header
 */
const SAMPLE_ACCOUNTS = [
  {
    id: "user_bidder1_demo",
    username: "bidder1",
    password: "123456",
    fullname: "Nguyễn Văn A (Đấu Giá 1)",
    email: "bidder1@pcbid.vn",
    role: "bidder",
    verified: true,
    walletBalance: 50000000,
    depositHold: 3500000,
    address: "Ký túc xá Khu B ĐHQG-HCM, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh"
  },
  {
    id: "user_bidder2_demo",
    username: "bidder2",
    password: "123456",
    fullname: "Lê Thị C (Đấu Giá 2)",
    email: "bidder2@pcbid.vn",
    role: "bidder",
    verified: true,
    walletBalance: 60000000,
    depositHold: 2000000,
    address: "Ký túc xá Khu A ĐHQG-HCM, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh"
  },
  {
    id: "user_seller_demo",
    username: "seller",
    password: "123456",
    fullname: "Trần Văn B (Người Bán)",
    email: "seller@pcbid.vn",
    role: "seller",
    verified: true,
    walletBalance: 80000000,
    depositHold: 0,
    address: "45 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh"
  }
];

function initHeaderUserStatus() {
  // Cập nhật số lượng Watchlist từ LocalStorage
  const badge = document.getElementById('header-watchlist-badge');
  if (badge) {
    try {
      const watchlist = JSON.parse(localStorage.getItem('pcbid_watchlist') || '[]');
      badge.textContent = watchlist.length;
    } catch {
      badge.textContent = '0';
    }
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
    const words = displayName.trim().split(/\s+/);
    const initials = words.length >= 2 
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : (displayName.substring(0, 2).toUpperCase() || 'U');
    const isSeller = user.role === 'seller';
    const roleText = isSeller ? '🏪 Người bán hàng' : '👤 Đấu giá viên';
    const roleClass = isSeller ? 'header__dropdown-role-badge--seller' : 'header__dropdown-role-badge--bidder';

    avatarBtn.title = `Tài khoản: ${displayName}`;

    dropdown.innerHTML = `
      <div class="header__dropdown-header">
        <div class="header__dropdown-user-info">
          <div class="header__dropdown-avatar">${escapeHeaderHtml(initials)}</div>
          <div class="header__dropdown-meta">
            <div class="header__dropdown-name">${escapeHeaderHtml(displayName)}</div>
            <span class="header__dropdown-role-badge ${roleClass}">${roleText}</span>
            <div class="header__dropdown-email">${escapeHeaderHtml(user.email || '')}</div>
          </div>
        </div>
        <div class="header__dropdown-wallet">
          <span class="header__dropdown-wallet-label">Ví khả dụng:</span>
          <span class="header__dropdown-wallet-val">${formatHeaderVnd(user.walletBalance || 0)}</span>
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

    const logoutBtn = document.getElementById('header-dropdown-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản PCBid?')) {
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
          <button type="button" class="header__dropdown-quick-acc" data-quick-user="bidder1">
            <span style="font-weight: 600;">👤 Đấu Giá 1</span>
            <span style="font-size: 11px; color: #64748b;">(50tr ví)</span>
          </button>
          <button type="button" class="header__dropdown-quick-acc" data-quick-user="bidder2">
            <span style="font-weight: 600;">👤 Đấu Giá 2</span>
            <span style="font-size: 11px; color: #64748b;">(60tr ví)</span>
          </button>
          <button type="button" class="header__dropdown-quick-acc" data-quick-user="seller">
            <span style="font-weight: 600;">🏪 Người Bán</span>
            <span style="font-size: 11px; color: #64748b;">(80tr ví)</span>
          </button>
        </div>
      </div>
    `;

    dropdown.querySelectorAll('.header__dropdown-quick-acc').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-quick-user');
        const acc = SAMPLE_ACCOUNTS.find(a => a.username === key);
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
