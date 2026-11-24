/**
 * PCBid - Tập lệnh Quản lý Hồ sơ & Phiên đấu giá của tôi (profile.js)
 * 100% Vanilla JavaScript (ES6+), Thao tác DOM trực tiếp, Đồng bộ LocalStorage
 * Tuân thủ quy chuẩn IE104 - UIT & Chỉ thị AGENTS.md
 */

// Hàm tính thời điểm kết thúc phiên dùng chung cho mọi trang
import { getAuctionEndTimestamp, getAuctionEndTimeIso, isAuctionClosed, lockAuctionEndTime } from './auction-time.js';
// Đơn hàng sau đấu giá và giao diện thẻ đơn hàng dùng chung
import { getOrdersForUser, orderNeedsAction } from './settlement.js';
// Bộ icon Lucide dùng chung
import { icon, NOTIFY_ICON_NAMES } from './icons.js';
// Mở hội thoại với tài khoản đang xem hồ sơ
import { openChatWithUser } from './chat.js';
// Sổ địa chỉ nhận hàng
import { getAddresses, openAddressForm, deleteAddress, setDefaultAddress, renderAddressInfo, getVerificationStatus } from './address-book.js';
import { renderOrderCard, bindOrderActions, tickOrderCountdowns } from './order-view.js';
// Phiên đấu giá và lịch sử đặt giá dùng chung (thật + mẫu)
import { loadAllAuctions, getAuctionsFromHistory } from './bid-history.js';
// Trạng thái kiểm định của phiên tự đăng bán
import { isAwaitingInspection } from './inspection.js';
// Module ví ảo & tiền cọc dùng chung
import { getParticipatingAuctions, getDepositHold, getAvailableBalance, checkBidDeposit, getUserNotifications, getUnreadNotificationCount, markNotificationsRead } from './wallet.js';
// Lưu watchlist và phiên đã đăng bán riêng theo từng tài khoản
import { USER_LIST_KEYS, getUserKey, isDemoUser, readUserList, writeUserList } from './user-data.js';
// Tài khoản demo, avatar chữ cái và UID dùng chung
import { DEMO_ACCOUNTS, MOCK_BIDDERS, getAvatarInitial, getUserUid, getGivenName, describeBidder, maskUid,
  renderAvatarContent, saveAccount, getPrivacy, formatBirthDate, findAccount, findAccountConflict, normalizePhone,
  hashPassword, verifyPassword, accountHasPassword } from './accounts.js';
// Công cụ cắt ảnh đại diện
import { openAvatarCropper } from './avatar-cropper.js';
// Hộp thoại thông báo / xác nhận thay cho alert / confirm của trình duyệt
import { showAlert, showConfirm } from './dialog.js';



/* ==========================================================================
   1. KHỞI TẠO HẰNG SỐ & DỮ LIỆU MẪU MẶC ĐỊNH (SEED MOCK DATA)
   ========================================================================== */

// Khóa lưu trữ trong LocalStorage
const STORAGE_KEYS = {
  CURRENT_USER: 'pcbid_currentUser',
  PARTICIPATING_BIDS: 'pcbid_my_auctions_participating',
  SELLING_ITEMS: 'pcbid_my_auctions_selling',
  WATCHLIST: 'pcbid_watchlist'
};

// 4 tài khoản demo lấy từ module dùng chung js/accounts.js
const SAMPLE_ACCOUNTS = DEMO_ACCOUNTS;

const DEFAULT_USER = SAMPLE_ACCOUNTS[0];

// Dữ liệu phiên tham gia mẫu (DEFAULT_PARTICIPATING_BY_USER) đã chuyển sang js/wallet.js

// Danh sách linh kiện tự đăng bán mẫu
const DEFAULT_SELLING = [
  {
    id: 3006,
    name: "Bo mạch chủ ASUS TUF GAMING B760M-PLUS WIFI DDR4",
    category: "Mainboard",
    status: "active", // 'active': Đang diễn ra | 'sold': Đã bán thành công | 'ended': Đã kết thúc
    startingPrice: 2700000,
    currentBid: 3100000,
    bidCount: 8,
    images: ["images/products/mainboard/3006-asus-tuf-b760m-plus-wifi-1.jpg"],
    specs: ["LGA 1700", "Micro-ATX"]
  },
  {
    id: 6001,
    name: "Nguồn Máy Tính Corsair RM850x 850W - 80 Plus Gold",
    category: "PSU",
    status: "sold", // Đã bán thành công
    startingPrice: 1800000,
    currentBid: 2200000,
    highestBidder: "nguon_pc_chat",
    bidCount: 8,
    soldDate: "28/10/2026",
    endTime: "2026-10-28T20:00:00+07:00",
    images: ["images/products/psu/6001-corsair-rm850x-1.png"],
    specs: ["850W", "80 Plus Gold"]
  },
  {
    id: 7005,
    name: "Vỏ máy tính Lian Li O11D Mini V2 White",
    category: "Case",
    status: "ended", // Đã kết thúc nhưng không có lượt đặt giá nào (có thể đăng bán lại)
    startingPrice: 1150000,
    currentBid: 1150000,
    bidCount: 0,
    endTime: "2026-11-05T20:00:00+07:00",
    images: ["images/products/case/7005-vo-may-tinh-lian-li-o11d-mini-v2-white-1.jpg"],
    specs: ["2 mặt kính", "Snow White"]
  }
];

// Danh sách theo dõi (Watchlist) mẫu
const DEFAULT_WATCHLIST = [
  {
    id: 1012,
    name: "Intel Core i5-13600K",
    category: "CPU",
    currentBid: 6600000,
    marketPriceNew: 8200000,
    bidCount: 15,
    endTimestamp: Date.now() + 3 * 3600 * 1000 + 20 * 60 * 1000,
    images: ["images/products/cpu/1012-i5-13600k-1.jpg"],
    specs: ["LGA 1700", "5.1 GHz Max"]
  },
  {
    id: 2028,
    name: "Card màn hình Gigabyte Radeon RX 7800 XT GAMING OC 16GB",
    category: "GPU",
    currentBid: 12400000,
    marketPriceNew: 15500000,
    bidCount: 6,
    endTimestamp: Date.now() + 5 * 3600 * 1000 + 40 * 60 * 1000,
    images: ["images/products/gpu/2028-rx-7800-xt-1.jpg"],
    specs: ["16GB GDDR6", "256-bit"]
  },
  {
    id: 8007,
    name: "Tản nhiệt Noctua NH-D15S Chromax Black",
    category: "Cooling",
    currentBid: 1800000,
    marketPriceNew: 2790000,
    bidCount: 2,
    endTimestamp: Date.now() + 7 * 3600 * 1000,
    images: ["images/products/cooling/8007-tan-nhiet-noctua-nh-d15s-chromax-black-1.jpg"],
    specs: ["Tản khí", "Màu đen"]
  },
  {
    id: 4013,
    name: "RAM G.SKILL Trident Z5 Neo RGB 64GB (2x32GB) 6000MHz DDR5",
    category: "RAM",
    currentBid: 5200000,
    marketPriceNew: 6890000,
    bidCount: 7,
    endTimestamp: Date.now() + 12 * 3600 * 1000,
    images: ["images/products/ram/4013-gskill-trident-z5-neo-64gb-1.jpg"],
    specs: ["64GB (2x32GB)", "DDR5 6000MHz"]
  }
];

/* ==========================================================================
   2. TIỆN ÍCH HỖ TRỢ ĐỊNH DẠNG (UTILITIES)
   ========================================================================== */

/**
 * Định dạng số tiền sang định dạng tiền tệ Việt Nam Đồng (VND)
 */
function formatVnd(amount) {
  const num = (typeof amount !== 'number' || isNaN(amount)) ? (Number(amount) || 0) : amount;
  return `${new Intl.NumberFormat('vi-VN').format(num)} đ`;
}

/**
 * Mã hóa an toàn chuỗi văn bản tránh tấn công XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Tính toán và chuyển đổi số mili-giây còn lại sang chuỗi hiển thị đồng hồ đếm ngược
 */
function formatTimeRemaining(endTimestamp) {
  const diff = endTimestamp - Date.now();
  if (diff <= 0) return 'Đã hết hạn';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return `${days} ngày ${remainHours} giờ`;
  }

  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');
  return `${hStr}:${mStr}:${sStr}`;
}

/**
 * Hiển thị thanh thông báo Toast nhanh góc dưới màn hình
 */
function showToast(message, isSuccess = true) {
  const toast = document.getElementById('pcb-toast');
  const msgEl = document.getElementById('pcb-toast-message');
  const iconEl = document.getElementById('pcb-toast-icon');
  if (!toast || !msgEl || !iconEl) return;

  msgEl.textContent = message;
  iconEl.textContent = isSuccess ? '✓' : '!';
  iconEl.style.backgroundColor = isSuccess ? '#10b981' : '#ef4444';

  toast.classList.add('pcb-toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('pcb-toast--show');
  }, 3500);
}

/* ==========================================================================
   3. QUẢN LÝ DỮ LIỆU CỤC BỘ (LOCALSTORAGE REPOSITORY)
   ========================================================================== */

function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!raw) {
    // Nếu chưa có tài khoản trong storage nhưng không bị cấm đăng xuất thì khởi tạo tài khoản mẫu
    if (localStorage.getItem('pcbid_logged_out') === 'true') {
      return null;
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }
  try {
    const user = JSON.parse(raw);
    if (!user || user.isLoggedIn === false) return null;
    return user;
  } catch {
    return DEFAULT_USER;
  }
}

function saveCurrentUser(user) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  // Đồng bộ vào danh sách tài khoản để hồ sơ công khai luôn thấy thông tin mới nhất
  saveAccount(user);
  // Báo cho Header cập nhật lại avatar và tên
  window.dispatchEvent(new CustomEvent('pcbid:account-updated'));
}

function getParticipatingBids() {
  // Logic tổng hợp đã chuyển sang module dùng chung js/wallet.js
  return getParticipatingAuctions(getCurrentUser());
}

function saveParticipatingBids(items) {
  localStorage.setItem(STORAGE_KEYS.PARTICIPATING_BIDS, JSON.stringify(items));
}

/**
 * Lấy các phiên do chính tài khoản này đăng bán từ dữ liệu cũ dùng chung (trước khi tách theo tài khoản)
 * để không bị mất phiên đã đăng. Chỉ nhận phiên có seller trùng với tài khoản trong pcbid_products.
 * @param {Object} user - Người dùng hiện tại
 * @returns {Array}
 */
function getLegacySellingItems(user) {
  try {
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEYS.SELLING_ITEMS) || '[]');
    const products = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
    const owners = new Map(products.map(p => [Number(p.id), p.seller]));
    const userKey = getUserKey(user);
    return Array.isArray(legacy)
      ? legacy.filter(item => owners.get(Number(item.id)) === userKey || owners.get(Number(item.id)) === user?.fullname)
      : [];
  } catch {
    return [];
  }
}

function getSellingItems() {
  const user = getCurrentUser();
  // Dữ liệu mẫu chỉ dành cho tài khoản người bán demo; tài khoản khác bắt đầu với danh sách trống
  const seed = [
    ...getLegacySellingItems(user),
    ...(user?.username === 'seller' ? DEFAULT_SELLING : [])
  ];
  const list = readUserList(USER_LIST_KEYS.SELLING, user, seed);

  // Đọc giá và lượt bid mới nhất để thẻ đăng bán khớp với trang chi tiết
  let localProducts = [];
  let localBids = [];
  try { localProducts = JSON.parse(localStorage.getItem('pcbid_products') || '[]'); } catch {}
  try { localBids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]'); } catch {}
  const productMap = new Map(localProducts.map(p => [Number(p.id), p]));

  return list.map(saved => {
    // Phiên mẫu chưa đăng lại: luôn lấy thông tin chuẩn mới nhất (sửa dữ liệu cũ lưu sai ảnh / tên / trạng thái)
    const sample = DEFAULT_SELLING.find(d => d.id === Number(saved.id));
    const item = sample && !(saved.relisted || saved.closedEarly) ? { ...saved, ...sample } : { ...saved };

    if (item.status === 'active') {
      const product = productMap.get(Number(item.id));
      if (product?.relisted || !sample) {
        if (product?.currentBid !== undefined) item.currentBid = Number(product.currentBid);
        if (product?.bidCount !== undefined) item.bidCount = Number(product.bidCount);
      }
      const bids = localBids.filter(b => Number(b.productId) === Number(item.id));
      if (bids.length > 0) {
        item.currentBid = Math.max(Number(item.currentBid) || 0, ...bids.map(b => Number(b.amount) || 0));
        item.bidCount = Math.max(Number(item.bidCount) || 0, sample && !saved.relisted ? sample.bidCount + bids.length : bids.length);
      }
      // Phiên hết hạn mà không có ai đặt giá thì chuyển sang "Đã kết thúc" để có thể đăng bán lại
      if (getAuctionEndTimestamp(item) <= Date.now()) item.status = Number(item.bidCount || 0) > 0 ? 'sold' : 'ended';
    }
    return item;
  });
}

// Dữ liệu phiên mới nhất (danh mục + phiên tự đăng + lượt đặt giá thật), nạp bất đồng bộ khi mở trang
let liveProductMap = new Map();

/**
 * Lấy hai thông số nổi bật của sản phẩm để hiện dạng chip trên thẻ
 * @param {Object} specifications - Bảng thông số kỹ thuật
 * @returns {string[]}
 */
function pickSpecChips(specifications) {
  return Object.values(specifications || {})
    .map(v => String(v).trim())
    .filter(v => v && !/chưa có dữ liệu/i.test(v) && v.length <= 28)
    .slice(0, 2);
}

/**
 * Ghép thông tin mới nhất của phiên vào bản lưu trong watchlist
 * (bản lưu chỉ là ảnh chụp lúc bấm theo dõi nên tên / giá / lượt đặt có thể đã cũ)
 * @param {Object} item - Mục trong watchlist
 * @returns {Object}
 */
function syncWithLiveProduct(item) {
  const live = liveProductMap.get(Number(item.id));
  if (!live) return item;
  const chips = pickSpecChips(live.specifications);
  return {
    ...item,
    name: live.name || item.name,
    category: live.category || item.category,
    images: live.images && live.images.length ? live.images : item.images,
    currentBid: Number(live.currentBid) || item.currentBid,
    bidCount: live.bidCount !== undefined ? Number(live.bidCount) : item.bidCount,
    marketPriceNew: Number(live.marketPriceNew) || item.marketPriceNew,
    endTime: live.endTime,
    endTimestamp: getAuctionEndTimestamp(live),
    specs: chips.length ? chips : item.specs
  };
}

function getWatchlistItems() {
  const user = getCurrentUser();
  // Watchlist mẫu chỉ nạp cho tài khoản demo; tài khoản mới đăng ký bắt đầu với watchlist trống
  const list = readUserList(USER_LIST_KEYS.WATCHLIST, user, isDemoUser(user) ? DEFAULT_WATCHLIST : []);
  return list.map(item => {
    if (typeof item === 'number' || typeof item === 'string') {
      const idNum = Number(item);
      const sample = DEFAULT_WATCHLIST.find(x => x.id === idNum);
      return syncWithLiveProduct(sample || {
        id: idNum,
        name: 'Linh kiện #' + idNum,
        category: 'Khác',
        currentBid: 0,
        marketPriceNew: 0,
        bidCount: 0,
        endTimestamp: getAuctionEndTimestamp({ id: idNum }),
        images: ['images/placeholder-product.svg'],
        specs: []
      });
    }
    const synced = syncWithLiveProduct({ ...item });
    if (!synced.name) synced.name = 'Linh kiện #' + (synced.id || '');
    if (!synced.category) synced.category = 'Khác';
    return synced;
  });
}

function saveWatchlistItems(items) {
  writeUserList(USER_LIST_KEYS.WATCHLIST, getCurrentUser(), items);
}

/* ==========================================================================
   4. RENDER GIAO DIỆN CÁC THẺ TRẠNG THÁI (STATUS CARD RENDERERS)
   ========================================================================== */

/**
 * Render thẻ cho Tab "Phiên đấu giá đang tham gia"
 * Yêu cầu: Badge xanh lá (Đang dẫn đầu), Badge đỏ (Đã bị vượt giá kèm nút Trả giá tiếp)
 */
function renderParticipatingCard(item) {
  const isLead = item.status === 'lead' || item.status === 'leading';
  const detailUrl = `product-detail.html?id=${item.id}`;
  const imageSrc = (item.images && item.images[0]) ? item.images[0] : 'images/products/gpu/2018-rtx-4070-12gb-1.webp';

  const badgeHtml = isLead
    ? `<span class="pcb-status-badge pcb-status-badge--lead">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        Đang dẫn đầu
       </span>`
    : `<span class="pcb-status-badge pcb-status-badge--outbid">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Đã bị vượt giá
       </span>`;

  const specsHtml = (item.specs || []).map(s => `<span class="pcb-auction-card__spec-chip">${escapeHtml(s)}</span>`).join('');

  // Nút hành động trả giá tiếp nếu bị vượt giá
  const rebidButtonHtml = !isLead
    ? `<button type="button" class="pcb-btn-rebid" data-action="open-quick-bid" data-id="${item.id}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M14 2l6 6m-2 2l-6-6M3 21l6-6m2 2l-6 6"/><path d="M10 6l8 8-4 4-8-8 4-4z"/>
        </svg>
        Trả giá tiếp
       </button>`
    : '';

  return `
    <article class="pcb-auction-card ${isLead ? 'pcb-auction-card--lead' : 'pcb-auction-card--outbid'}" data-id="${item.id}">
      <a href="${detailUrl}" class="pcb-auction-card__media-link" aria-label="Xem chi tiết ${escapeHtml(item.name)}">
        <span class="pcb-auction-card__category-badge">${escapeHtml(item.category)}</span>
        <img src="${imageSrc}" alt="${escapeHtml(item.name)}" class="pcb-auction-card__img" loading="lazy" onerror="this.src='images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg'">
      </a>

      <div class="pcb-auction-card__body">
        <div class="pcb-auction-card__top-row">
          ${badgeHtml}
          <div class="pcb-auction-card__specs">
            ${specsHtml}
          </div>
        </div>

        <a href="${detailUrl}" class="pcb-auction-card__title" title="${escapeHtml(item.name)}">
          ${escapeHtml(item.name)}
        </a>

        <div class="pcb-auction-card__stats">
          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Giá cao nhất hiện tại</span>
            <span class="pcb-stat-col__val pcb-stat-col__val--primary">${formatVnd(item.currentBid)}</span>
          </div>

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Giá bạn đã đặt</span>
            <span class="pcb-stat-col__val ${isLead ? 'pcb-stat-col__val--lead' : 'pcb-stat-col__val--outbid'}">${formatVnd(item.myBid)}</span>
          </div>

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Thời gian còn lại</span>
            <span class="pcb-stat-col__countdown" data-timestamp="${getAuctionEndTimestamp(item)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="countdown-text">${formatTimeRemaining(getAuctionEndTimestamp(item))}</span>
            </span>
          </div>

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Tổng lượt đấu</span>
            <span class="pcb-stat-col__val">${item.bidCount} lượt</span>
          </div>
        </div>
      </div>

      <div class="pcb-auction-card__actions">
        ${rebidButtonHtml}
        <a href="${detailUrl}" class="pcb-btn-detail">
          Chi tiết phiên
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>
    </article>
  `;
}

/**
 * Render thẻ cho Tab "Linh kiện tôi đã đăng bán"
 * Yêu cầu: Badge: Đang diễn ra, Đã kết thúc, Đã bán thành công
 */
function renderSellingCard(item) {
  const detailUrl = `product-detail.html?id=${item.id}`;
  const imageSrc = (item.images && item.images[0]) ? item.images[0] : 'images/products/mainboard/3006-asus-tuf-b760m-plus-wifi-1.jpg';

  let badgeHtml = '';
  let modifierClass = '';
  let actionButtonsHtml = '';

  if (item.status === 'active' && isAwaitingInspection(item)) {
    // Phiên vừa đăng: đang chờ PCBid Lab kiểm định, chưa mở đặt giá
    modifierClass = 'pcb-auction-card--selling-active';
    badgeHtml = `<span class="pcb-status-badge pcb-status-badge--pending">Chờ kiểm định</span>`;
    actionButtonsHtml = `
      <a href="${detailUrl}" class="pcb-btn-detail">Xem tiến độ kiểm định</a>
    `;
  } else if (item.status === 'active') {
    modifierClass = 'pcb-auction-card--selling-active';
    badgeHtml = `<span class="pcb-status-badge pcb-status-badge--active">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
      Đang diễn ra
    </span>`;
    actionButtonsHtml = `
      <a href="${detailUrl}" class="pcb-btn-primary pcb-btn-primary--compact">Xem phiên đấu</a>
      <a href="${detailUrl}#edit" class="pcb-btn-detail">Quản lý phiên</a>
    `;
  } else if (item.status === 'sold') {
    modifierClass = 'pcb-auction-card--selling-sold';
    badgeHtml = `<span class="pcb-status-badge pcb-status-badge--sold">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      Đã bán thành công
    </span>`;
    actionButtonsHtml = `
      <a href="${detailUrl}" class="pcb-btn-detail">Chi tiết giao dịch</a>
    `;
  } else {
    modifierClass = 'pcb-auction-card--selling-ended';
    badgeHtml = `<span class="pcb-status-badge pcb-status-badge--ended">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      Đã kết thúc
    </span>`;
    actionButtonsHtml = `
      <a href="sell.html?relist=${item.id}" class="pcb-btn-rebid pcb-btn-rebid--muted">Đăng bán lại</a>
      <a href="${detailUrl}" class="pcb-btn-detail">Xem lại</a>
    `;
  }

  const specsHtml = (item.specs || []).map(s => `<span class="pcb-auction-card__spec-chip">${escapeHtml(s)}</span>`).join('');

  return `
    <article class="pcb-auction-card ${modifierClass}" data-id="${item.id}">
      <a href="${detailUrl}" class="pcb-auction-card__media-link" aria-label="Xem chi tiết ${escapeHtml(item.name)}">
        <span class="pcb-auction-card__category-badge">${escapeHtml(item.category)}</span>
        <img src="${imageSrc}" alt="${escapeHtml(item.name)}" class="pcb-auction-card__img" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
      </a>

      <div class="pcb-auction-card__body">
        <div class="pcb-auction-card__top-row">
          ${badgeHtml}
          <div class="pcb-auction-card__specs">
            ${specsHtml}
          </div>
        </div>

        <a href="${detailUrl}" class="pcb-auction-card__title" title="${escapeHtml(item.name)}">
          ${escapeHtml(item.name)}
        </a>

        <div class="pcb-auction-card__stats">
          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">${item.status === 'sold' ? 'Giá chốt phiên' : 'Giá đấu hiện tại'}</span>
            <span class="pcb-stat-col__val pcb-stat-col__val--primary">${formatVnd(item.currentBid)}</span>
          </div>

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Giá khởi điểm</span>
            <span class="pcb-stat-col__val">${formatVnd(item.startingPrice)}</span>
          </div>

          ${item.status === 'active' ? `
            <div class="pcb-stat-col">
              <span class="pcb-stat-col__lbl">Thời gian còn lại</span>
              <span class="pcb-stat-col__countdown" data-timestamp="${getAuctionEndTimestamp(item)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="countdown-text">${formatTimeRemaining(getAuctionEndTimestamp(item))}</span>
              </span>
            </div>
          ` : `
            <div class="pcb-stat-col">
              <span class="pcb-stat-col__lbl">Người mua thắng</span>
              <span class="pcb-stat-col__val ${item.highestBidder ? 'pcb-stat-col__val--winner' : 'pcb-stat-col__val--muted'}">${escapeHtml(item.highestBidder ? describeBidder({ bidderName: item.highestBidder }).name : (Number(item.bidCount || 0) === 0 ? 'Không có lượt đặt giá' : 'Chờ xác nhận'))}</span>
            </div>
          `}

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Lượt tham gia</span>
            <span class="pcb-stat-col__val">${item.bidCount} lượt</span>
          </div>
        </div>
      </div>

      <div class="pcb-auction-card__actions">
        ${actionButtonsHtml}
      </div>
    </article>
  `;
}

/**
 * Render thẻ cho Tab "Danh sách theo dõi (Watchlist)"
 */
function renderWatchlistCard(item) {
  const detailUrl = `product-detail.html?id=${item.id}`;
  const imageSrc = (item.images && item.images[0]) ? item.images[0] : 'images/products/cpu/1012-i5-13600k-1.jpg';
  const specsHtml = (item.specs || []).map(s => `<span class="pcb-auction-card__spec-chip">${escapeHtml(s)}</span>`).join('');

  return `
    <article class="pcb-auction-card" data-id="${item.id}">
      <a href="${detailUrl}" class="pcb-auction-card__media-link" aria-label="Xem chi tiết ${escapeHtml(item.name)}">
        <span class="pcb-auction-card__category-badge">${escapeHtml(item.category)}</span>
        <img src="${imageSrc}" alt="${escapeHtml(item.name)}" class="pcb-auction-card__img" loading="lazy" onerror="this.src='images/products/cpu/1012-i5-13600k-1.jpg'">
      </a>

      <div class="pcb-auction-card__body">
        <div class="pcb-auction-card__top-row">
          <span class="pcb-status-badge pcb-status-badge--active">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            Đang quan tâm
          </span>
          <div class="pcb-auction-card__specs">
            ${specsHtml}
          </div>
        </div>

        <a href="${detailUrl}" class="pcb-auction-card__title" title="${escapeHtml(item.name)}">
          ${escapeHtml(item.name)}
        </a>

        <div class="pcb-auction-card__stats">
          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Giá đấu hiện tại</span>
            <span class="pcb-stat-col__val pcb-stat-col__val--primary">${formatVnd(item.currentBid)}</span>
          </div>

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Giá thị trường mới</span>
            <span class="pcb-stat-col__val pcb-stat-col__val--muted">${formatVnd(item.marketPriceNew || item.currentBid * 1.5)}</span>
          </div>

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Thời gian còn lại</span>
            <span class="pcb-stat-col__countdown" data-timestamp="${getAuctionEndTimestamp(item)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="countdown-text">${formatTimeRemaining(getAuctionEndTimestamp(item))}</span>
            </span>
          </div>

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Lượt trả giá</span>
            <span class="pcb-stat-col__val">${item.bidCount} lượt</span>
          </div>
        </div>
      </div>

      <div class="pcb-auction-card__actions">
        <a href="${detailUrl}" class="pcb-btn-primary pcb-btn-primary--small">
          Vào đấu giá ngay
        </a>
        <button type="button" class="pcb-btn-unwatch" data-action="unwatch" data-id="${item.id}" title="Xóa khỏi danh sách theo dõi">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Bỏ theo dõi
        </button>
      </div>
    </article>
  `;
}

/* ==========================================================================
   5. BỘ ĐIỀU PHỐI GIAO DIỆN CHÍNH (APP CONTROLLER)
   ========================================================================== */

let currentActiveSection = 'section-auctions';

// Mỗi tab thuộc một luồng làm việc riêng: Mua hàng hoặc Bán hàng
const TAB_GROUP = {
  participating: 'buy',
  'buy-orders': 'buy',
  watchlist: 'buy',
  selling: 'sell',
  'sell-orders': 'sell'
};
let currentActiveTab = 'participating';
let currentSearchKeyword = '';
let currentFilterChip = 'all';

// Biến lưu sản phẩm đang thực hiện Trả giá nhanh
let activeQuickBidItem = null;
let currentMultiplier = 1;

/**
 * Cập nhật số dư và thông tin người dùng lên toàn bộ giao diện
 */
/**
 * Nhãn xác thực ở thẻ tài khoản: chỉ "Đã xác thực" khi có đủ email, số điện thoại và địa chỉ nhận hàng,
 * ngược lại hiện "Chưa xác thực" kèm gợi ý các mục cần bổ sung
 * @param {Object} user - Người dùng đang đăng nhập
 */
function renderVerificationStatus(user) {
  const { verified, missing } = getVerificationStatus(user);
  const tag = document.getElementById('sidebar-verified-tag');
  const text = document.getElementById('sidebar-verified-text');
  const badge = document.getElementById('sidebar-verified-badge');
  const hint = document.getElementById('sidebar-verify-hint');
  if (tag) tag.classList.toggle('pcb-user-card__tag--pending', !verified);
  if (text) text.textContent = verified ? 'Tài khoản đã xác thực' : 'Chưa xác thực';
  if (badge) badge.hidden = !verified;
  if (hint) {
    hint.hidden = verified;
    hint.textContent = verified ? '' : `Bổ sung ${missing.join(', ')} để được xác thực.`;
  }
}

function syncUserInfoUI() {
  const user = getCurrentUser();
  if (!user) {
    // Người dùng đã đăng xuất: chuyển hướng đến trang đăng nhập
    window.location.href = 'login.html';
    return;
  }

  // Sidebar
  const nameEl = document.getElementById('sidebar-user-name');
  const uidEl = document.getElementById('sidebar-user-uid');
  const walletEl = document.getElementById('wallet-balance-display');
  const holdEl = document.getElementById('wallet-hold-display');

  if (nameEl) nameEl.textContent = user.fullname || user.username;
  if (uidEl) uidEl.textContent = `UID: ${getUserUid(user)}`;
  // Avatar: ảnh tự tải lên hoặc chữ cái đầu của tên, đồng bộ với Header
  const avatarEl = document.getElementById('sidebar-user-avatar');
  if (avatarEl) avatarEl.innerHTML = renderAvatarContent(user, 'pcb-user-card__avatar-photo');
  const removeAvatarBtn = document.getElementById('btn-remove-avatar');
  if (removeAvatarBtn) removeAvatarBtn.hidden = !user.avatarImage;
  const publicLink = document.getElementById('sidebar-public-link');
  if (publicLink) publicLink.href = `profile.html?user=${encodeURIComponent(user.username || '')}`;
  // Số dư khả dụng = tổng tiền ví - tiền cọc đang giữ (tính lại từ các phiên đang dẫn đầu)
  if (walletEl) walletEl.textContent = formatVnd(getAvailableBalance(user));
  if (holdEl) holdEl.textContent = formatVnd(getDepositHold(user));
  renderVerificationStatus(user);

  // Form Account
  const lastNameInput = document.getElementById('input-lastname');
  const givenNameInput = document.getElementById('input-givenname');
  const emInput = document.getElementById('input-email');
  const phInput = document.getElementById('input-phone');
  const smsInput = document.getElementById('pref-sms');
  const mailInput = document.getElementById('pref-email');
  const lastUpdateEl = document.getElementById('last-update-time');

  // Họ đệm và tên tách riêng; tài khoản cũ chỉ có họ tên đầy đủ thì tự tách theo từ cuối
  const givenName = user.givenName || getGivenName(user.fullname || '');
  const lastName = user.lastName ?? String(user.fullname || '').slice(0, Math.max(0, String(user.fullname || '').length - givenName.length)).trim();
  if (lastNameInput) lastNameInput.value = lastName;
  if (givenNameInput) givenNameInput.value = givenName;
  if (emInput) emInput.value = user.email || '';
  if (phInput) phInput.value = user.phone || '';
  if (smsInput) smsInput.checked = user.pref_sms !== false;
  if (mailInput) mailInput.checked = user.pref_email !== false;
  if (lastUpdateEl) lastUpdateEl.textContent = user.lastUpdated || 'Hôm nay';

  // Giới tính, tiểu sử, ngày sinh
  const genderInput = document.getElementById('input-gender');
  const bioInput = document.getElementById('input-bio');
  if (genderInput) genderInput.value = user.gender || '';
  if (bioInput) bioInput.value = user.bio || '';
  renderBirthDate(user);

  // Quyền riêng tư hồ sơ công khai
  const privacyForm = document.getElementById('form-privacy');
  if (privacyForm) {
    const privacy = getPrivacy(user);
    privacyForm.querySelectorAll('.pcb-switch__input').forEach(input => {
      input.checked = Boolean(privacy[input.name]);
      updateSwitchText(input);
    });
  }
}

// Trạng thái hiển thị đầy đủ ngày sinh (bấm biểu tượng con mắt)
let birthDateRevealed = false;

/**
 * Hiển thị ngày sinh: mặc định chỉ hiện năm; khóa nút thay đổi khi đã đổi 1 lần
 * @param {Object} user - Người dùng hiện tại
 */
function renderBirthDate(user) {
  const display = document.getElementById('birthdate-display');
  const eyeBtn = document.getElementById('btn-toggle-birthdate');
  const changeBtn = document.getElementById('btn-change-birthdate');
  const tooltip = document.getElementById('birthdate-tooltip');
  if (!display) return;

  display.textContent = formatBirthDate(user.birthDate, birthDateRevealed);
  if (eyeBtn) {
    eyeBtn.hidden = !user.birthDate;
    eyeBtn.setAttribute('aria-pressed', birthDateRevealed ? 'true' : 'false');
    eyeBtn.setAttribute('aria-label', birthDateRevealed ? 'Ẩn ngày và tháng sinh' : 'Hiện đầy đủ ngày sinh');
    eyeBtn.title = eyeBtn.getAttribute('aria-label');
  }
  const locked = Boolean(user.birthDateLocked);
  if (changeBtn) changeBtn.hidden = locked;
  // Đã đổi 1 lần: hiện icon khóa
  const lockEl = document.getElementById('birthdate-lock');
  if (lockEl) lockEl.hidden = !locked;
  if (tooltip) {
    tooltip.dataset.tooltip = locked
      ? 'Thông tin không thể thay đổi được'
      : 'Ngày sinh chỉ được thay đổi 1 lần, sau đó không thể thay đổi được nữa';
    tooltip.setAttribute('aria-label', tooltip.dataset.tooltip);
  }
}

/**
 * Cập nhật nhãn "Công khai" / "Riêng tư" cạnh công tắc quyền riêng tư
 * @param {HTMLInputElement} input - Công tắc
 */
function updateSwitchText(input) {
  const text = input.closest('.pcb-switch')?.querySelector('.pcb-switch__text');
  if (text) text.textContent = input.checked ? 'Công khai' : 'Riêng tư';
}

/**
 * Cập nhật các bộ đếm số lượng trên Tabs và Sidebar
 */
function updateCounters() {
  const participating = getParticipatingBids();
  const selling = getSellingItems();
  const watchlist = getWatchlistItems();

  const countPartEl = document.getElementById('count-participating');
  const countSellEl = document.getElementById('count-selling');
  const countWatchEl = document.getElementById('count-watchlist');
  const navCountEl = document.getElementById('nav-auctions-count');

  if (countPartEl) countPartEl.textContent = participating.length;
  if (countSellEl) countSellEl.textContent = selling.length;
  if (countWatchEl) countWatchEl.textContent = watchlist.length;
  // Bộ đếm đơn mua / đơn bán: số đơn đang chờ bạn xử lý (nếu có), ngược lại là tổng số đơn
  const allOrders = getOrdersForUser(getCurrentUser());
  [['buyer', 'count-buy-orders', 'trade-badge-buy'], ['seller', 'count-sell-orders', 'trade-badge-sell']].forEach(([role, countId, badgeId]) => {
    const orders = allOrders.filter(o => o.role === role);
    const pending = orders.filter(orderNeedsAction).length;
    const countEl = document.getElementById(countId);
    if (countEl) {
      countEl.textContent = pending || orders.length;
      countEl.classList.toggle('pcb-tab__counter--alert', pending > 0);
    }
    // Huy hiệu trên công tắc Mua / Bán: báo luồng nào đang có việc cần làm
    const badgeEl = document.getElementById(badgeId);
    if (badgeEl) {
      badgeEl.textContent = pending;
      badgeEl.hidden = pending === 0;
    }
  });
  if (navCountEl) navCountEl.textContent = `${participating.length} phiên`;

  // Số thông báo chưa đọc
  const navNotifyEl = document.getElementById('nav-notifications-count');
  if (navNotifyEl) {
    const unread = getUnreadNotificationCount(getCurrentUser());
    navNotifyEl.textContent = unread;
    navNotifyEl.hidden = unread === 0;
  }
}

/**
 * Render thanh nút lọc nhanh (Filter Chips) tương ứng với Tab đang mở
 */
function renderFilterChips() {
  const container = document.getElementById('filter-chips-container');
  if (!container) return;

  let chips = [];
  if (currentActiveTab === 'participating') {
    chips = [
      { id: 'all', label: 'Tất cả' },
      { id: 'lead', icon: 'trophy', label: 'Đang dẫn đầu' },
      { id: 'outbid', icon: 'triangle-alert', label: 'Đã bị vượt giá' }
    ];
  } else if (currentActiveTab === 'selling') {
    chips = [
      { id: 'all', label: 'Tất cả' },
      { id: 'active', icon: 'clock', label: 'Đang diễn ra' },
      { id: 'sold', icon: 'circle-check', label: 'Đã bán thành công' },
      { id: 'ended', icon: 'circle-x', label: 'Đã kết thúc' }
    ];
  } else if (currentActiveTab === 'buy-orders' || currentActiveTab === 'sell-orders') {
    chips = [
      { id: 'all', label: 'Tất cả' },
      { id: 'action', icon: 'bell', label: 'Cần bạn xử lý' },
      { id: 'processing', icon: 'truck', label: 'Đang xử lý' },
      { id: 'done', icon: 'circle-check', label: 'Đã kết thúc' }
    ];
  } else if (currentActiveTab === 'watchlist') {
    chips = [
      { id: 'all', label: 'Tất cả' },
      { id: 'GPU', label: 'Card màn hình' },
      { id: 'CPU', label: 'CPU' },
      { id: 'Mainboard', label: 'Mainboard' },
      { id: 'RAM', label: 'RAM' }
    ];
  }

  container.innerHTML = chips.map(c => `
    <button type="button" class="pcb-chip-btn ${currentFilterChip === c.id ? 'pcb-chip-btn--active' : ''}" data-filter="${c.id}">
      ${c.icon ? icon(c.icon, { size: 14 }) : ''}${c.label}
    </button>
  `).join('');

  // Lắng nghe sự kiện click chip
  container.querySelectorAll('.pcb-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilterChip = btn.getAttribute('data-filter');
      renderFilterChips();
      renderCurrentAuctionTab();
    });
  });
}

/**
 * Lọc và render danh sách phiên tương ứng với Tab hiện tại
 */
function renderCurrentAuctionTab() {
  const kw = currentSearchKeyword.toLowerCase().trim();

  if (currentActiveTab === 'participating') {
    const list = getParticipatingBids();
    const filtered = list.filter(item => {
      const matchKw = !kw || item.name.toLowerCase().includes(kw) || item.category.toLowerCase().includes(kw);
      const matchChip = currentFilterChip === 'all' || item.status === currentFilterChip;
      return matchKw && matchChip;
    });

    const grid = document.getElementById('grid-participating');
    const empty = document.getElementById('empty-participating');
    if (grid && empty) {
      if (filtered.length > 0) {
        grid.innerHTML = filtered.map(renderParticipatingCard).join('');
        grid.hidden = false;
        empty.hidden = true;
      } else {
        grid.innerHTML = '';
        grid.hidden = true;
        empty.hidden = false;
      }
    }
  } else if (currentActiveTab === 'selling') {
    const list = getSellingItems();
    const filtered = list.filter(item => {
      const matchKw = !kw || item.name.toLowerCase().includes(kw) || item.category.toLowerCase().includes(kw);
      const matchChip = currentFilterChip === 'all' || item.status === currentFilterChip;
      return matchKw && matchChip;
    });

    const grid = document.getElementById('grid-selling');
    const empty = document.getElementById('empty-selling');
    if (grid && empty) {
      if (filtered.length > 0) {
        grid.innerHTML = filtered.map(renderSellingCard).join('');
        grid.hidden = false;
        empty.hidden = true;
      } else {
        grid.innerHTML = '';
        grid.hidden = true;
        empty.hidden = false;
      }
    }
  } else if (currentActiveTab === 'watchlist') {
    const list = getWatchlistItems();
    const filtered = list.filter(item => {
      const matchKw = !kw || item.name.toLowerCase().includes(kw) || item.category.toLowerCase().includes(kw);
      const matchChip = currentFilterChip === 'all' || item.category === currentFilterChip;
      return matchKw && matchChip;
    });

    const grid = document.getElementById('grid-watchlist');
    const empty = document.getElementById('empty-watchlist');
    if (grid && empty) {
      if (filtered.length > 0) {
        grid.innerHTML = filtered.map(renderWatchlistCard).join('');
        grid.hidden = false;
        empty.hidden = true;
      } else {
        grid.innerHTML = '';
        grid.hidden = true;
        empty.hidden = false;
      }
    }
  } else if (currentActiveTab === 'buy-orders' || currentActiveTab === 'sell-orders') {
    // Luồng Mua chỉ hiện đơn bạn là người mua, luồng Bán chỉ hiện đơn bạn là người bán
    const role = currentActiveTab === 'buy-orders' ? 'buyer' : 'seller';
    const isDone = order => order.status === 'completed' || order.status === 'forfeited';
    const filtered = getOrdersForUser(getCurrentUser()).filter(order => {
      if (order.role !== role) return false;
      const matchKw = !kw || String(order.productName || '').toLowerCase().includes(kw);
      const matchChip = currentFilterChip === 'all'
        || (currentFilterChip === 'action' && orderNeedsAction(order))
        || (currentFilterChip === 'processing' && !isDone(order) && !orderNeedsAction(order))
        || (currentFilterChip === 'done' && isDone(order));
      return matchKw && matchChip;
    });
    const grid = document.getElementById(`grid-${currentActiveTab}`);
    const empty = document.getElementById(`empty-${currentActiveTab}`);
    if (grid && empty) {
      grid.innerHTML = filtered.map(order => renderOrderCard(order, order.role, { showProduct: true })).join('');
      grid.hidden = !filtered.length;
      empty.hidden = Boolean(filtered.length);
      bindOrderActions(grid, () => {
        renderCurrentAuctionTab();
        syncUserInfoUI();
      });
    }
  }

  updateCounters();
}


/**
 * Chuyển đổi giữa các Section chính (Quản lý đấu giá, Thông tin tài khoản, Bảo mật)
 */
function switchSection(sectionId) {
  currentActiveSection = sectionId;
  // Quản lý đấu giá là khu vực riêng: ẩn menu cài đặt, chỉ giữ thẻ tài khoản và ví
  document.body.classList.toggle('pcb-profile--trade', sectionId === 'section-auctions');

  // Ẩn tất cả các sections
  document.querySelectorAll('.pcb-section').forEach(sec => {
    sec.hidden = sec.id !== sectionId;
  });

  // Cập nhật trạng thái active nút sidebar
  document.querySelectorAll('.pcb-profile-nav__btn[data-section]').forEach(btn => {
    const isTarget = btn.getAttribute('data-section') === sectionId;
    btn.classList.toggle('pcb-profile-nav__btn--active', isTarget);
  });

  // Cập nhật tên breadcrumb
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  if (breadcrumbCurrent) {
    if (sectionId === 'section-auctions') breadcrumbCurrent.textContent = TAB_GROUP[currentActiveTab] === 'sell' ? 'Quản lý đấu giá · Bán hàng' : 'Quản lý đấu giá · Mua hàng';
    else if (sectionId === 'section-account') breadcrumbCurrent.textContent = 'Thông tin tài khoản';
    else if (sectionId === 'section-security') breadcrumbCurrent.textContent = 'Bảo mật & Đổi mật khẩu';
    else if (sectionId === 'section-addresses') breadcrumbCurrent.textContent = 'Địa chỉ nhận hàng';
    else if (sectionId === 'section-notifications') breadcrumbCurrent.textContent = 'Thông báo đấu giá';
  }

  if (sectionId === 'section-auctions') {
    renderCurrentAuctionTab();
  } else if (sectionId === 'section-notifications') {
    renderNotifications();
  } else if (sectionId === 'section-addresses') {
    renderAddressList();
  }

  // Đồng bộ hash trên thanh địa chỉ với mục đang xem
  const sectionHash = {
    'section-auctions': `#${currentActiveTab}`,
    'section-account': '#account',
    'section-security': '#security',
    'section-addresses': '#addresses',
    'section-notifications': '#notifications'
  }[sectionId];
  if (sectionHash) updateHash(sectionHash);
}

/**
 * Cập nhật hash trên thanh địa chỉ mà không tạo sự kiện hashchange
 * để lần bấm link header tiếp theo (ví dụ #watchlist) luôn được nhận diện là thay đổi
 * @param {string} hash - Hash mới, ví dụ '#watchlist'
 */
function updateHash(hash) {
  if (window.location.hash.toLowerCase() !== hash) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
  }
}

/**
 * Mở đúng mục / tab theo hash hiện tại trên URL (profile.html#watchlist, #notifications, ...)
 * Được gọi khi tải trang và mỗi khi hash thay đổi (bấm link header khi đang ở profile.html)
 */
function applyHashRoute() {
  const hash = window.location.hash.toLowerCase();
  if (hash === '#watchlist') {
    switchSection('section-auctions');
    switchAuctionTab('watchlist');
  } else if (hash === '#selling') {
    switchSection('section-auctions');
    switchAuctionTab('selling');
  } else if (hash === '#buy-orders' || hash === '#orders') {
    switchSection('section-auctions');
    switchAuctionTab('buy-orders');
  } else if (hash === '#sell-orders') {
    switchSection('section-auctions');
    switchAuctionTab('sell-orders');
  } else if (hash === '#participating' || hash === '#my-auctions' || hash === '#auctions') {
    switchSection('section-auctions');
    switchAuctionTab('participating');
  } else if (hash === '#notifications') {
    switchSection('section-notifications');
  } else if (hash === '#account') {
    switchSection('section-account');
  } else if (hash === '#security') {
    switchSection('section-security');
  } else if (hash === '#addresses') {
    switchSection('section-addresses');
  } else {
    // Mặc định (không có hash): trang cài đặt tài khoản; Quản lý đấu giá mở qua icon xe hàng trên Header
    switchSection('section-account');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Render danh sách thông báo đấu giá của tài khoản hiện tại
 */
function renderNotifications() {
  const listEl = document.getElementById('notification-list');
  const emptyEl = document.getElementById('empty-notifications');
  if (!listEl) return;

  const notifications = getUserNotifications(getCurrentUser());
  const readAllBtn = document.getElementById('btn-notify-read-all');
  if (readAllBtn) readAllBtn.disabled = !notifications.some(n => !n.read);

  if (notifications.length === 0) {
    listEl.innerHTML = '';
    listEl.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  listEl.hidden = false;
  if (emptyEl) emptyEl.hidden = true;
  listEl.innerHTML = notifications.map(n => `
    <li class="pcb-notify pcb-notify--${n.type} ${n.read ? 'pcb-notify--read' : 'pcb-notify--unread'}" data-notify-id="${escapeHtml(n.id)}">
      <span class="pcb-notify__icon">${icon(NOTIFY_ICON_NAMES[n.type] || 'bell', { size: 20 })}</span>
      <div class="pcb-notify__body">
        <h3 class="pcb-notify__title">
          ${n.read ? '' : '<span class="pcb-notify__dot" aria-hidden="true"></span><span class="pcb-notify__sr">Chưa đọc: </span>'}${escapeHtml(n.title)}
        </h3>
        <p class="pcb-notify__message">${escapeHtml(n.message)}</p>
      </div>
      <div class="pcb-notify__actions">
        <a class="pcb-notify__link" href="product-detail.html?id=${n.productId}" data-notify-open>Xem phiên</a>
        ${n.read ? '' : '<button type="button" class="pcb-notify__mark" data-notify-mark>Đã đọc</button>'}
      </div>
    </li>
  `).join('');
}

/**
 * Kiểm tra một trường liên hệ (email / số điện thoại): đúng định dạng và chưa bị tài khoản khác dùng
 * @param {'email'|'phone'} field
 * @param {string} value
 * @returns {string} Thông báo lỗi, rỗng nếu hợp lệ
 */
function validateContactField(field, value) {
  const user = getCurrentUser();
  if (field === 'email') {
    if (!value) return 'Vui lòng nhập địa chỉ email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Email không đúng định dạng (ví dụ: ten@example.com).';
    if (findAccountConflict({ email: value, exclude: user })) return 'Địa chỉ email này đã được sử dụng bởi tài khoản khác.';
    return '';
  }
  const phone = normalizePhone(value);
  if (!phone) return 'Vui lòng nhập số điện thoại.';
  if (!/^0(3|5|7|8|9)\d{8}$/.test(phone)) return 'Số điện thoại không hợp lệ (10 chữ số, ví dụ: 0901234567).';
  if (findAccountConflict({ phone, exclude: user })) return 'Số điện thoại này đã được sử dụng bởi tài khoản khác.';
  return '';
}

/**
 * Hiện / xóa dòng lỗi dưới ô email hoặc số điện thoại
 * @param {'email'|'phone'} field
 * @returns {boolean} true nếu hợp lệ
 */
function showContactFieldError(field) {
  const input = document.getElementById(`input-${field}`);
  const errEl = document.getElementById(`err-input-${field}`);
  if (!input) return true;
  const message = validateContactField(field, input.value.trim());
  if (errEl) errEl.textContent = message;
  setContactCheck(field, !message);
  input.classList.toggle('pcb-input--error', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
  if (message) input.setAttribute('aria-describedby', `err-input-${field}`);
  return !message;
}

/**
 * Đổi dấu bên phải ô: tick xanh khi hợp lệ, X đỏ khi không hợp lệ / đã bị dùng
 * @param {'email'|'phone'} field
 * @param {boolean} valid
 */
function setContactCheck(field, valid) {
  const check = document.getElementById(`check-input-${field}`);
  if (!check) return;
  check.classList.toggle('pcb-verified-check--error', !valid);
  check.title = valid
    ? (field === 'email' ? 'Email hợp lệ' : 'Số điện thoại hợp lệ')
    : (field === 'email' ? 'Email không hợp lệ' : 'Số điện thoại không hợp lệ');
  const iconEl = check.querySelector('.pcb-icon');
  if (iconEl) {
    iconEl.classList.toggle('pcb-icon--check', valid);
    iconEl.classList.toggle('pcb-icon--x', !valid);
  }
}

/**
 * Gắn kiểm tra khi rời ô (blur) và xóa lỗi khi người dùng gõ lại
 */
function setupContactFieldValidation() {
  // Gõ lại họ đệm / tên thì xóa dòng lỗi tương ứng
  ['lastname', 'givenname'].forEach(key => {
    document.getElementById(`input-${key}`)?.addEventListener('input', e => {
      const errEl = document.getElementById(`err-input-${key}`);
      if (errEl) errEl.textContent = '';
      e.target.classList.remove('pcb-input--error');
    });
  });
  ['email', 'phone'].forEach(field => {
    const input = document.getElementById(`input-${field}`);
    if (!input) return;
    input.addEventListener('blur', () => showContactFieldError(field));
    input.addEventListener('input', () => {
      const errEl = document.getElementById(`err-input-${field}`);
      if (errEl && errEl.textContent) {
        errEl.textContent = '';
        input.classList.remove('pcb-input--error');
        input.setAttribute('aria-invalid', 'false');
        setContactCheck(field, true);
      }
    });
  });
}

/**
 * Render sổ địa chỉ nhận hàng: địa chỉ mặc định đứng đầu, có nút sửa / xóa / đặt mặc định
 */
function renderAddressList() {
  const listEl = document.getElementById('address-list');
  if (!listEl) return;
  const addresses = getAddresses(getCurrentUser());
  if (!addresses.length) {
    listEl.innerHTML = `
      <li class="pcb-address-empty">
        <p>Bạn chưa có địa chỉ nhận hàng nào.</p>
        <p>Thêm địa chỉ để thanh toán nhanh khi thắng đấu giá.</p>
      </li>`;
    return;
  }
  listEl.innerHTML = addresses.map(a => `
    <li class="pcb-address-card">
      <div class="pcb-address">${renderAddressInfo(a)}</div>
      <div class="pcb-address-card__actions">
        <div class="pcb-address-card__links">
          <button type="button" class="pcb-addr-link" data-address-edit="${a.id}">Sửa</button>
          ${a.isDefault ? '' : `<button type="button" class="pcb-addr-link pcb-addr-link--danger" data-address-delete="${a.id}">Xóa</button>`}
        </div>
        <button type="button" class="pcb-addr-btn pcb-addr-btn--outline" data-address-default="${a.id}" ${a.isDefault ? 'disabled' : ''}>Thiết lập mặc định</button>
      </div>
    </li>
  `).join('');
}

/**
 * Gắn sự kiện cho mục Địa chỉ nhận hàng
 */
function setupAddressSection() {
  document.getElementById('btn-add-address')?.addEventListener('click', async () => {
    if (await openAddressForm()) {
      renderAddressList();
      showToast('Đã thêm địa chỉ nhận hàng mới.');
    }
  });
  document.getElementById('address-list')?.addEventListener('click', async e => {
    const editBtn = e.target.closest('[data-address-edit]');
    const deleteBtn = e.target.closest('[data-address-delete]');
    const defaultBtn = e.target.closest('[data-address-default]');
    if (editBtn) {
      const address = getAddresses(getCurrentUser()).find(a => a.id === editBtn.dataset.addressEdit);
      if (await openAddressForm(address)) showToast('Đã cập nhật địa chỉ.');
    } else if (deleteBtn) {
      if (await deleteAddress(deleteBtn.dataset.addressDelete)) showToast('Đã xóa địa chỉ.');
    } else if (defaultBtn && !defaultBtn.disabled) {
      setDefaultAddress(defaultBtn.dataset.addressDefault);
      showToast('Đã đặt làm địa chỉ mặc định.');
    }
    renderAddressList();
  });
}

/**
 * Đánh dấu thông báo đã đọc rồi cập nhật lại danh sách và các bộ đếm
 * @param {Array<string>} ids - ID các thông báo cần đánh dấu
 */
function handleMarkNotificationsRead(ids) {
  if (!ids.length) return;
  markNotificationsRead(getCurrentUser(), ids);
  renderNotifications();
  updateCounters();
}

/* ==========================================================================
   HỒ SƠ CÔNG KHAI (profile.html?user=<tên đăng nhập>)
   Ai cũng xem được, kể cả chưa đăng nhập; tôn trọng cài đặt quyền riêng tư
   ========================================================================== */

/**
 * Thẻ linh kiện rút gọn dùng trong hồ sơ công khai
 * @param {Object} item - Sản phẩm / phiên
 * @param {string} badgeHtml - Huy hiệu trạng thái
 * @returns {string}
 */
function renderPublicCard(item, badgeHtml) {
  const image = item.images && item.images[0] ? item.images[0] : 'images/placeholder-product.svg';
  return `
    <a class="pcb-public-card" href="product-detail.html?id=${item.id}">
      <img class="pcb-public-card__img" src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
      <span class="pcb-public-card__body">
        ${badgeHtml}
        <strong class="pcb-public-card__name">${escapeHtml(item.name)}</strong>
        <span class="pcb-public-card__meta">${formatVnd(item.currentBid)} · ${Number(item.bidCount || 0)} lượt</span>
      </span>
    </a>
  `;
}

// Số thẻ hiển thị mỗi lần trong một khối của hồ sơ công khai
const PUBLIC_PAGE_SIZE = 8;

/**
 * Hiển thị một khối thông tin của hồ sơ công khai (hoặc thông báo riêng tư / trống)
 * @param {string} id - ID vùng chứa
 * @param {boolean} isPublic - Thông tin có được công khai không
 * @param {Array<string>} cards - Danh sách HTML thẻ
 * @param {string} emptyText - Thông báo khi không có dữ liệu
 */
function fillPublicBlock(id, isPublic, cards, emptyText) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!isPublic) {
    el.innerHTML = `<p class="pcb-public__private">${icon('lock', { size: 14 })} Người dùng đã đặt thông tin này ở chế độ riêng tư.</p>`;
  } else if (!cards.length) {
    el.innerHTML = `<p class="pcb-public__empty">${emptyText}</p>`;
  } else {
    // Danh sách dài: hiện trước một số thẻ, phần còn lại mở bằng nút "Xem thêm"
    const visible = cards.slice(0, PUBLIC_PAGE_SIZE);
    const rest = cards.length - visible.length;
    el.innerHTML = `
      <div class="pcb-public__grid">${visible.join('')}</div>
      ${rest > 0 ? `<button type="button" class="pcb-public__more">Xem thêm ${rest} phiên</button>` : ''}
    `;
    const moreBtn = el.querySelector('.pcb-public__more');
    if (moreBtn) {
      let shown = visible.length;
      moreBtn.addEventListener('click', () => {
        const next = cards.slice(shown, shown + PUBLIC_PAGE_SIZE);
        el.querySelector('.pcb-public__grid').insertAdjacentHTML('beforeend', next.join(''));
        shown += next.length;
        const left = cards.length - shown;
        if (left > 0) moreBtn.textContent = `Xem thêm ${left} phiên`;
        else moreBtn.remove();
      });
    }
  }
}

/**
 * Hiển thị hồ sơ công khai của một người dùng
 * @param {string} username - Tên đăng nhập cần xem
 */
async function renderPublicProfile(username) {
  // Ẩn thanh bên quản lý cá nhân, chỉ hiện khu vực hồ sơ công khai
  document.body.classList.add('pcb-profile--public');
  document.querySelectorAll('.pcb-section').forEach(sec => {
    sec.hidden = sec.id !== 'section-public';
  });
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Hồ sơ công khai';

  // Thông tin tài khoản: thành viên / tài khoản đã đăng ký / người dùng mẫu; nếu không có thì chỉ biết tên đăng nhập
  const account = findAccount({ username }) || { username, fullname: username };
  const privacy = getPrivacy(account);
  const uid = getUserUid(account.id || `seller_${username}`);
  let viewer = null;
  try { viewer = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null'); } catch {}

  document.title = `${account.fullname || username} - Hồ sơ công khai | PCBid`;
  const avatarEl = document.getElementById('public-avatar');
  if (avatarEl) avatarEl.innerHTML = renderAvatarContent(account, 'pcb-public__avatar-img');
  const nameEl = document.getElementById('public-name');
  if (nameEl) nameEl.textContent = account.fullname || username;
  const uidEl = document.getElementById('public-uid');
  if (uidEl) uidEl.textContent = `UID: ${maskUid(uid)}`;
  const selfNote = document.getElementById('public-self-note');
  const isSelf = Boolean(viewer && viewer.isLoggedIn !== false && viewer.username === username);
  if (selfNote) selfNote.hidden = !isSelf;

  // Nút nhắn tin: ẩn khi xem hồ sơ của chính mình; chưa đăng nhập thì mời đăng nhập
  const chatBtn = document.getElementById('public-chat-btn');
  if (chatBtn) {
    chatBtn.hidden = isSelf;
    chatBtn.addEventListener('click', async () => {
      if (openChatWithUser(username)) return;
      const goLogin = await showConfirm({
        title: 'Đăng nhập để nhắn tin',
        message: `Bạn cần đăng nhập để trò chuyện với ${account.fullname || username}.`,
        confirmText: 'Đăng nhập',
        cancelText: 'Để sau',
        tone: 'info'
      });
      if (goLogin) window.location.href = `login.html?redirect=${encodeURIComponent(`profile.html?user=${username}`)}`;
    });
  }

  // Tiểu sử
  const bioEl = document.getElementById('public-bio');
  if (bioEl) {
    if (!privacy.bio) bioEl.innerHTML = `<p class="pcb-public__private">${icon('lock', { size: 14 })} Người dùng đã đặt thông tin này ở chế độ riêng tư.</p>`;
    else bioEl.innerHTML = `<p class="pcb-public__bio">${account.bio ? escapeHtml(account.bio) : 'Người dùng chưa viết tiểu sử.'}</p>`;
  }

  // Liên hệ: email và số điện thoại (mặc định riêng tư)
  const contactEl = document.getElementById('public-contact');
  if (contactEl) {
    if (!privacy.contact) {
      contactEl.innerHTML = `<p class="pcb-public__private">${icon('lock', { size: 14 })} Người dùng chưa công khai thông tin liên hệ.</p>`;
    } else if (!account.email && !account.phone) {
      contactEl.innerHTML = '<p class="pcb-public__empty">Chưa có thông tin liên hệ.</p>';
    } else {
      contactEl.innerHTML = `<ul class="pcb-public__contact">
        ${account.email ? `<li><span>Email</span><a href="mailto:${escapeHtml(account.email)}">${escapeHtml(account.email)}</a></li>` : ''}
        ${account.phone ? `<li><span>Điện thoại</span><a href="tel:${escapeHtml(account.phone)}">${escapeHtml(account.phone)}</a></li>` : ''}
      </ul>`;
    }
  }

  // Linh kiện đã đăng bán: mọi phiên có người bán là tài khoản này
  const products = await loadAllAuctions();
  const now = Date.now();
  const selling = products.filter(p => p.seller === username);
  fillPublicBlock('public-selling', privacy.selling, selling.map(p => {
    const closed = isAuctionClosed(p) || getAuctionEndTimestamp(p) <= now;
    const label = p.status === 'sold' ? 'Đã bán' : closed ? 'Đã kết thúc' : 'Đang diễn ra';
    const mod = p.status === 'sold' ? 'sold' : closed ? 'ended' : 'active';
    return renderPublicCard(p, `<span class="pcb-public-card__badge pcb-public-card__badge--${mod}">${label}</span>`);
  }), 'Chưa đăng bán linh kiện nào.');

  // Phiên đang tham gia (chỉ phiên chưa kết thúc)
  // Lấy từ chính lịch sử đặt giá của các phiên (lượt thật + lượt mẫu), nên bấm vào phiên
  // sẽ thấy tên người này trong bảng lịch sử; tài khoản thành viên bổ sung thêm phiên mẫu riêng
  const fromHistory = getAuctionsFromHistory(account, products);
  const historyIds = new Set(fromHistory.map(item => Number(item.id)));
  const ownList = account.id
    ? getParticipatingAuctions(account).filter(item => !historyIds.has(Number(item.id)) && getAuctionEndTimestamp(item) > now)
    : [];
  const participating = [...fromHistory, ...ownList];

  // Không phân biệt người bán / người mua: chỉ hiện số phiên đang bán và đang tham gia
  const roleEl = document.getElementById('public-role');
  if (roleEl) {
    const activeSelling = selling.filter(p => !isAuctionClosed(p) && getAuctionEndTimestamp(p) > now).length;
    // Tôn trọng quyền riêng tư: mục nào đặt riêng tư thì không hiện số lượng
    const stats = [
      privacy.selling ? `<span class="pcb-public__stat">${icon('tag', { size: 14 })} ${activeSelling} phiên đang bán</span>` : '',
      privacy.participating ? `<span class="pcb-public__stat">${icon('gavel', { size: 14 })} ${participating.length} phiên đang tham gia</span>` : ''
    ].filter(Boolean);
    roleEl.innerHTML = stats.join('<span class="pcb-public__stat-sep" aria-hidden="true">·</span>');
    roleEl.hidden = stats.length === 0;
  }
  fillPublicBlock('public-participating', privacy.participating, participating.map(item =>
    renderPublicCard(item, item.status === 'lead'
      ? '<span class="pcb-public-card__badge pcb-public-card__badge--active">Đang dẫn đầu</span>'
      : '<span class="pcb-public-card__badge pcb-public-card__badge--outbid">Bị vượt giá</span>')
  ), 'Hiện không tham gia phiên đấu giá nào.');

  // Danh sách theo dõi: đọc trực tiếp, không tạo dữ liệu mẫu cho tài khoản người khác
  let watchlist = [];
  try {
    const raw = localStorage.getItem(`${USER_LIST_KEYS.WATCHLIST}__${getUserKey(account)}`);
    watchlist = raw ? JSON.parse(raw) : (isDemoUser(account) ? DEFAULT_WATCHLIST : []);
  } catch {
    watchlist = [];
  }
  const productMap = new Map(products.map(p => [Number(p.id), p]));
  const watchCards = (Array.isArray(watchlist) ? watchlist : [])
    .map(w => productMap.get(Number(typeof w === 'object' ? w.id : w)) || (typeof w === 'object' ? w : null))
    .filter(Boolean)
    .map(p => renderPublicCard(p, ''));
  fillPublicBlock('public-watchlist', privacy.watchlist, watchCards, 'Chưa theo dõi linh kiện nào.');
}

/**
 * Chuyển đổi giữa các Sub-tabs trong Quản lý đấu giá (Đang tham gia, Đã đăng bán, Watchlist)
 */
function switchAuctionTab(tabName) {
  if (!TAB_GROUP[tabName]) tabName = 'participating';
  currentActiveTab = tabName;
  currentFilterChip = 'all';

  // Chỉ hiện các tab thuộc luồng đang chọn (Mua hàng hoặc Bán hàng)
  const group = TAB_GROUP[tabName];
  document.querySelectorAll('.pcb-tab[data-group]').forEach(tab => {
    tab.hidden = tab.dataset.group !== group;
  });
  document.querySelectorAll('.pcb-trade-switch__btn').forEach(btn => {
    const active = btn.dataset.tradeMode === group;
    btn.classList.toggle('pcb-trade-switch__btn--active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  const titleEl = document.getElementById('trade-title');
  const subtitleEl = document.getElementById('trade-subtitle');
  if (titleEl) titleEl.textContent = group === 'sell' ? 'Quản lý đấu giá · Bán hàng' : 'Quản lý đấu giá · Mua hàng';
  if (subtitleEl) {
    subtitleEl.textContent = group === 'sell'
      ? 'Quản lý các phiên bạn đăng bán, theo dõi người mua thanh toán và xác nhận giao hàng.'
      : 'Theo dõi các phiên bạn đang trả giá, thanh toán đơn đã thắng và danh sách linh kiện quan tâm.';
  }
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  if (breadcrumbCurrent && currentActiveSection === 'section-auctions') breadcrumbCurrent.textContent = titleEl?.textContent || 'Quản lý đấu giá';

  // Cập nhật nút tabs
  document.querySelectorAll('.pcb-tab').forEach(tab => {
    const isTarget = tab.getAttribute('data-tab') === tabName;
    tab.classList.toggle('pcb-tab--active', isTarget);
    tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  // Cập nhật pane nội dung
  document.querySelectorAll('.pcb-tab-pane').forEach(pane => {
    pane.classList.toggle('pcb-tab-pane--active', pane.id === `tab-content-${tabName}`);
  });

  renderFilterChips();
  renderCurrentAuctionTab();

  // Màn hình hẹp: cuộn thanh tab để tab đang chọn luôn nằm trong tầm nhìn
  const activeTab = document.querySelector(`.pcb-tab[data-tab="${tabName}"]`);
  const tabBar = activeTab?.parentElement;
  if (activeTab && tabBar && tabBar.scrollWidth > tabBar.clientWidth) {
    tabBar.scrollTo({ left: activeTab.offsetLeft - (tabBar.clientWidth - activeTab.offsetWidth) / 2, behavior: 'smooth' });
  }

  // Đồng bộ hash với tab đang xem
  updateHash(`#${tabName}`);
}

/* ==========================================================================
   6. HỘP THOẠI MODAL TRẢ GIÁ NHANH & NẠP TIỀN CỌC (MODALS)
   ========================================================================== */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('pcb-modal--open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('pcb-modal--open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function setupQuickBid(productId) {
  const list = getParticipatingBids();
  const item = list.find(x => x.id === Number(productId));
  if (!item) return;

  item.currentBid = Number(item.currentBid) || Number(item.myBid) || 1000000;
  item.bidStep = Number(item.bidStep) || 100000;
  item.bidCount = Number(item.bidCount) || 1;

  activeQuickBidItem = item;
  currentMultiplier = 1;

  const infoContainer = document.getElementById('quick-bid-product-info');
  const curPriceEl = document.getElementById('qb-current-price');
  const stepPriceEl = document.getElementById('qb-step-val');
  const newPriceEl = document.getElementById('qb-new-price');
  const detailLink = document.getElementById('qb-goto-detail');

  const imageSrc = (item.images && item.images[0]) ? item.images[0] : 'images/products/cpu/1023-ryzen-7-5800x3d-1.jpg';

  if (infoContainer) {
    infoContainer.innerHTML = `
      <img src="${imageSrc}" alt="${escapeHtml(item.name)}" class="pcb-quick-bid-item__img">
      <div>
        <div class="pcb-quick-bid-item__category">${escapeHtml(item.category)}</div>
        <div class="pcb-quick-bid-item__title">${escapeHtml(item.name)}</div>
      </div>
    `;
  }

  if (curPriceEl) curPriceEl.textContent = formatVnd(item.currentBid);
  if (stepPriceEl) stepPriceEl.textContent = `+${formatVnd(item.bidStep)}`;
  if (detailLink) detailLink.href = `product-detail.html?id=${item.id}&action=bid`;

  // Cập nhật mức giá mới dự kiến
  updateQuickBidCalculations();

  // Reset các nút nhân bước giá
  document.querySelectorAll('.pcb-mult-btn').forEach(btn => {
    btn.classList.toggle('pcb-mult-btn--active', Number(btn.getAttribute('data-mult')) === 1);
  });

  openModal('modal-quick-bid');
}

function updateQuickBidCalculations() {
  if (!activeQuickBidItem) return;
  const curBid = Number(activeQuickBidItem.currentBid) || 0;
  const step = Number(activeQuickBidItem.bidStep) || 100000;
  const mult = Number(currentMultiplier) || 1;
  const newPrice = curBid + (mult * step);
  const newPriceEl = document.getElementById('qb-new-price');
  if (newPriceEl) {
    newPriceEl.textContent = formatVnd(newPrice);
  }
}

/* ==========================================================================
   7. ĐỒNG HỒ ĐẾM NGƯỢC THỜI GIAN THẬT (LIVE COUNTDOWN TIMER)
   ========================================================================== */

function startLiveCountdown() {
  setInterval(() => {
    document.querySelectorAll('.pcb-stat-col__countdown').forEach(el => {
      const ts = Number(el.getAttribute('data-timestamp'));
      if (!ts) return;
      const textEl = el.querySelector('.countdown-text');
      if (textEl) {
        textEl.textContent = formatTimeRemaining(ts);
      }
    });
  }, 1000);
}

/* ==========================================================================
   8. KHỞI TẠO VÀ LẮNG NGHE SỰ KIỆN TOÀN BỘ TRANG (DOM READY)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Tự động dọn dẹp ảnh cũ bị lưu sai trong LocalStorage từ các phiên trước
  try {
    ['pcbid_products', 'pcbid_my_auctions_participating'].forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          let changed = false;
          arr.forEach(item => {
            if (item.name && item.name.toLowerCase().includes('5800x3d')) {
              if (!item.images || item.images[0] !== 'images/products/cpu/1023-ryzen-7-5800x3d-1.jpg') {
                item.images = ['images/products/cpu/1023-ryzen-7-5800x3d-1.jpg'];
                changed = true;
              }
            }
          });
          if (changed) localStorage.setItem(key, JSON.stringify(arr));
        }
      }
    });
  } catch (e) {}

  // 0. Chế độ xem hồ sơ công khai của người khác: profile.html?user=<tên đăng nhập>
  const publicUsername = new URLSearchParams(window.location.search).get('user');
  if (publicUsername) {
    renderPublicProfile(publicUsername);
    return;
  }

  // 1. Đồng bộ thông tin người dùng & đếm số lượng
  syncUserInfoUI();
  updateCounters();

  // 2. Mở đúng mục theo URL Hash (ví dụ: profile.html#watchlist) khi tải trang
  //    và mỗi khi hash thay đổi trong lúc đang ở trang này (bấm link trên header)
  applyHashRoute();
  window.addEventListener('hashchange', applyHashRoute);

  // Thêm / xóa địa chỉ hoặc cập nhật email, số điện thoại: tính lại nhãn xác thực ngay
  const refreshVerification = () => renderVerificationStatus(getCurrentUser());
  window.addEventListener('pcbid:addresses-updated', refreshVerification);
  window.addEventListener('pcbid:account-updated', refreshVerification);

  // Nạp dữ liệu phiên mới nhất rồi vẽ lại để thẻ watchlist khớp đúng với trang chi tiết
  loadAllAuctions().then(products => {
    liveProductMap = new Map(products.map(p => [Number(p.id), p]));
    updateCounters();
    renderCurrentAuctionTab();
  }).catch(() => {});

  // Đánh dấu thông báo đã đọc: từng thông báo, khi bấm Xem phiên, hoặc tất cả
  const notifyList = document.getElementById('notification-list');
  if (notifyList) {
    notifyList.addEventListener('click', (e) => {
      const item = e.target.closest('[data-notify-id]');
      if (!item) return;
      if (e.target.closest('[data-notify-mark]')) {
        handleMarkNotificationsRead([item.dataset.notifyId]);
      } else if (e.target.closest('[data-notify-open]')) {
        // Ghi nhận đã đọc trước khi chuyển sang trang chi tiết
        markNotificationsRead(getCurrentUser(), [item.dataset.notifyId]);
      }
    });
  }
  const readAllBtn = document.getElementById('btn-notify-read-all');
  if (readAllBtn) {
    readAllBtn.addEventListener('click', () => {
      handleMarkNotificationsRead(getUserNotifications(getCurrentUser()).filter(n => !n.read).map(n => n.id));
      showToast('Đã đánh dấu tất cả thông báo là đã đọc.');
    });
  }

  // Bấm lại link trỏ đúng hash hiện tại (không phát sinh hashchange) vẫn chuyển về mục đó
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="profile.html#"]');
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    if (url.pathname === window.location.pathname && url.hash.toLowerCase() === window.location.hash.toLowerCase()) {
      e.preventDefault();
      applyHashRoute();
    }
  });

  // 3. Khởi động đồng hồ đếm ngược
  startLiveCountdown();

  // 4. Lắng nghe sự kiện chuyển đổi Section từ Sidebar
  document.querySelectorAll('.pcb-profile-nav__btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const secId = btn.getAttribute('data-section');
      switchSection(secId);
    });
  });

  // 5. Nút chuyển đổi nhanh sang Bảo mật từ Form Thông tin
  const btnSwitchSec = document.getElementById('btn-switch-to-security');
  if (btnSwitchSec) {
    btnSwitchSec.addEventListener('click', () => {
      switchSection('section-security');
    });
  }

  // 6. Lắng nghe sự kiện chuyển đổi Tabs trong mục Đấu giá
  document.querySelectorAll('.pcb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchAuctionTab(tabName);
    });
  });

  // Mục Địa chỉ nhận hàng
  setupAddressSection();

  // Công tắc Mua hàng / Bán hàng: mở tab đầu tiên của luồng tương ứng
  document.querySelectorAll('.pcb-trade-switch__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchAuctionTab(btn.dataset.tradeMode === 'sell' ? 'selling' : 'participating');
    });
  });

  // 7. Lắng nghe ô tìm kiếm nhanh linh kiện trong bảng
  const searchInput = document.getElementById('auction-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchKeyword = e.target.value;
      renderCurrentAuctionTab();
    });
  }

  // 8. Lắng nghe sự kiện tương tác trên danh sách (Event Delegation)
  document.addEventListener('click', (e) => {
    // Nút mở modal Trả giá nhanh
    const rebidBtn = e.target.closest('[data-action="open-quick-bid"]');
    if (rebidBtn) {
      const pId = rebidBtn.getAttribute('data-id');
      setupQuickBid(pId);
      return;
    }

    // Nút Bỏ theo dõi khỏi Watchlist
    const unwatchBtn = e.target.closest('[data-action="unwatch"]');
    if (unwatchBtn) {
      const pId = Number(unwatchBtn.getAttribute('data-id'));
      const watchlist = getWatchlistItems().filter(x => x.id !== pId);
      saveWatchlistItems(watchlist);
      renderCurrentAuctionTab();
      showToast('Đã xóa linh kiện khỏi danh sách theo dõi!');
      return;
    }

    // Nút đóng modal
    const closeBtn = e.target.closest('[data-action="close-modal"]');
    if (closeBtn) {
      closeModal('modal-deposit');
      closeModal('modal-quick-bid');
      return;
    }
  });

  // 9. Xử lý Modal Trả giá nhanh: Chọn hệ số bước giá (+1, +2, +5)
  document.querySelectorAll('.pcb-mult-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pcb-mult-btn').forEach(b => b.classList.remove('pcb-mult-btn--active'));
      btn.classList.add('pcb-mult-btn--active');
      currentMultiplier = Number(btn.getAttribute('data-mult')) || 1;
      updateQuickBidCalculations();
    });
  });

  // 10. Xác nhận Trả giá nhanh (Cập nhật trực tiếp vào trạng thái)
  const btnSubmitBid = document.getElementById('btn-submit-quick-bid');
  if (btnSubmitBid) {
    btnSubmitBid.addEventListener('click', async () => {
      if (!activeQuickBidItem) return;

      const user = getCurrentUser() || DEFAULT_USER;
      const curBid = Number(activeQuickBidItem.currentBid) || 0;
      const step = Number(activeQuickBidItem.bidStep) || 100000;
      const mult = Number(currentMultiplier) || 1;
      const newBidAmount = curBid + (mult * step);

      // Kiểm tra số dư khả dụng đủ giữ cọc 10% cho mức giá mới (cọc cũ của phiên này được trả lại trước)
      const depositCheck = checkBidDeposit(user, activeQuickBidItem.id, newBidAmount);
      if (!depositCheck.ok) {
        closeModal('modal-quick-bid');
        await showAlert({
          title: 'Không đủ tiền cọc',
          message: `Số dư ví khả dụng (${formatVnd(depositCheck.available)}) không đủ giữ cọc 10% (${formatVnd(depositCheck.required)}).\nVui lòng nạp thêm tiền vào ví.`,
          tone: 'warning'
        });
        openModal('modal-deposit');
        return;
      }

      // Cập nhật danh sách phiên đang tham gia
      const list = getParticipatingBids();
      const index = list.findIndex(x => x.id === activeQuickBidItem.id);
      const updatedBidCount = (activeQuickBidItem.bidCount || 0) + 1;
      if (index !== -1) {
        list[index].currentBid = newBidAmount;
        list[index].myBid = newBidAmount;
        list[index].status = 'lead'; // Chuyển sang ĐANG DẪN ĐẦU (Badge Xanh lá)
        list[index].bidCount = updatedBidCount;
        saveParticipatingBids(list);
      }

      // Tiền cọc không trừ trực tiếp vào ví: được tính lại tự động từ các phiên đang dẫn đầu (js/wallet.js)

      // Đồng bộ vào pcbid_bids
      try {
        const bids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]');
        bids.unshift({
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          productId: activeQuickBidItem.id,
          // Định danh người đặt bằng ID tài khoản (không trùng), kèm họ tên để hiển thị
          bidderId: user.id || null,
          bidderFullname: user.fullname || user.username || '',
          bidderName: user.username || 'pcbuilder99',
          amount: newBidAmount,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('pcbid_bids', JSON.stringify(bids));
      } catch (e) {
        console.warn('[PCBid] Không thể lưu lượt bid từ profile:', e);
      }

      // Đồng bộ vào pcbid_products để index.html, products.html và product-detail.html cập nhật giá ngay lập tức
      try {
        const localProducts = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
        const pIdx = localProducts.findIndex(p => Number(p.id) === Number(activeQuickBidItem.id));
        if (pIdx >= 0) {
          localProducts[pIdx].currentBid = newBidAmount;
          localProducts[pIdx].bidCount = updatedBidCount;
        } else {
          localProducts.push({
            id: activeQuickBidItem.id,
            name: activeQuickBidItem.name,
            category: activeQuickBidItem.category,
            currentBid: newBidAmount,
            bidCount: updatedBidCount,
            bidStep: step,
            endTime: getAuctionEndTimeIso(activeQuickBidItem),
            images: activeQuickBidItem.images || []
          });
        }
        localStorage.setItem('pcbid_products', JSON.stringify(localProducts));
      } catch (e) {
        console.warn('[PCBid] Không thể cập nhật pcbid_products từ profile:', e);
      }
      // Có người dùng thật tham gia: chốt thời điểm kết thúc của phiên
      lockAuctionEndTime(activeQuickBidItem);
      // Báo cho Header và các khu vực khác cập nhật số dư ví, thông báo ngay trên trang này
      window.dispatchEvent(new CustomEvent('pcbid:bid-placed', { detail: { productId: activeQuickBidItem.id } }));

      syncUserInfoUI();
      renderCurrentAuctionTab();
      closeModal('modal-quick-bid');

      showToast(`🎉 Trả giá thành công ${formatVnd(newBidAmount)}! Bạn đã giành lại vị trí dẫn đầu!`, true);
    });
  }

  // 11. Modal Nạp tiền ví ảo mô phỏng
  const btnOpenDeposit = document.getElementById('btn-open-deposit-modal');
  if (btnOpenDeposit) {
    btnOpenDeposit.addEventListener('click', () => {
      openModal('modal-deposit');
    });
  }

  // Các nút chọn nhanh mức tiền nạp
  const depositInput = document.getElementById('deposit-amount-input');
  document.querySelectorAll('.pcb-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pcb-preset-btn').forEach(b => b.classList.remove('pcb-preset-btn--selected'));
      btn.classList.add('pcb-preset-btn--selected');
      if (depositInput) {
        depositInput.value = btn.getAttribute('data-amount');
      }
    });
  });

  // Xác nhận nạp tiền vào ví
  const btnConfirmDeposit = document.getElementById('btn-confirm-deposit');
  if (btnConfirmDeposit && depositInput) {
    btnConfirmDeposit.addEventListener('click', () => {
      const amount = Number(depositInput.value);
      if (!amount || amount <= 0) {
        showAlert({ title: 'Số tiền không hợp lệ', message: 'Vui lòng nhập số tiền nạp lớn hơn 0.', tone: 'warning' });
        return;
      }

      const user = getCurrentUser();
      user.walletBalance = (user.walletBalance || 0) + amount;
      saveCurrentUser(user);

      syncUserInfoUI();
      closeModal('modal-deposit');
      showToast(`Nạp thành công +${formatVnd(amount)} vào ví ảo mô phỏng!`);
    });
  }

  // 12. Xử lý Form Cập nhật thông tin tài khoản
  const formAccount = document.getElementById('form-account-info');
  if (formAccount) {
    formAccount.addEventListener('submit', async (e) => {
      e.preventDefault();

      const user = getCurrentUser();

      // Kiểm tra email / số điện thoại: đúng định dạng và không trùng với tài khoản khác (lỗi hiện dưới ô)
      const emailInput = document.getElementById('input-email');
      const phoneInput = document.getElementById('input-phone');
      const emailOk = showContactFieldError('email');
      const phoneOk = showContactFieldError('phone');
      // Họ đệm và tên: bắt buộc, chỉ gồm chữ cái và khoảng trắng
      const lastNameInput = document.getElementById('input-lastname');
      const givenNameInput = document.getElementById('input-givenname');
      const lastNameVal = (lastNameInput?.value || '').trim().replace(/\s+/g, ' ');
      const givenNameVal = (givenNameInput?.value || '').trim().replace(/\s+/g, ' ');
      const namePattern = /^[\p{L}\s'-]+$/u;
      const nameErrors = {
        lastname: !lastNameVal ? 'Vui lòng nhập họ và tên đệm.' : (!namePattern.test(lastNameVal) ? 'Họ và tên đệm chỉ gồm chữ cái.' : ''),
        givenname: !givenNameVal ? 'Vui lòng nhập tên.' : (!namePattern.test(givenNameVal) || /\s/.test(givenNameVal) ? 'Tên chỉ gồm một từ, không chứa số hay ký tự đặc biệt.' : '')
      };
      Object.entries(nameErrors).forEach(([key, msg]) => {
        const errEl = document.getElementById(`err-input-${key}`);
        if (errEl) errEl.textContent = msg;
        document.getElementById(`input-${key}`)?.classList.toggle('pcb-input--error', Boolean(msg));
      });
      if (nameErrors.lastname || nameErrors.givenname) {
        (nameErrors.lastname ? lastNameInput : givenNameInput)?.focus();
        return;
      }
      if (!emailOk || !phoneOk) {
        (emailOk ? phoneInput : emailInput)?.focus();
        return;
      }
      const newEmail = emailInput.value.trim();
      const newPhone = normalizePhone(phoneInput.value.trim());

      // Ngày sinh: chỉ được thay đổi một lần, xác nhận trước khi khóa vĩnh viễn
      const birthInput = document.getElementById('input-birthdate');
      if (birthInput && !birthInput.hidden && birthInput.value && birthInput.value !== user.birthDate) {
        const chosen = new Date(birthInput.value);
        const age = (Date.now() - chosen.getTime()) / (365.25 * 24 * 3600 * 1000);
        if (Number.isNaN(chosen.getTime()) || age < 13 || age > 100) {
          await showAlert({ title: 'Ngày sinh không hợp lệ', message: 'Độ tuổi cho phép từ 13 đến 100.', tone: 'warning' });
          return;
        }
        const ok = await showConfirm({
          title: 'Xác nhận đổi ngày sinh',
          message: `Bạn sắp đổi ngày sinh thành ${formatBirthDate(birthInput.value, true)}.\n\nNgày sinh chỉ được thay đổi 1 lần. Sau khi lưu, bạn sẽ KHÔNG thể thay đổi được nữa.`,
          confirmText: 'Đổi ngày sinh',
          cancelText: 'Để sau',
          tone: 'danger'
        });
        if (!ok) return;
        user.birthDate = birthInput.value;
        user.birthDateLocked = true;
      }
      if (birthInput) birthInput.hidden = true;
      const birthHint = document.getElementById('birthdate-hint');
      if (birthHint) birthHint.hidden = true;

      user.gender = document.getElementById('input-gender')?.value || '';
      user.bio = (document.getElementById('input-bio')?.value || '').trim().slice(0, 300);
      // Lưu riêng họ đệm và tên; avatar chữ cái lấy theo Tên
      user.lastName = lastNameVal;
      user.givenName = givenNameVal;
      user.fullname = `${lastNameVal} ${givenNameVal}`;
      user.email = newEmail;
      user.phone = newPhone;
      user.pref_sms = document.getElementById('pref-sms')?.checked ?? true;
      user.pref_email = document.getElementById('pref-email')?.checked ?? true;

      const now = new Date();
      const timeStr = `Hôm nay, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      user.lastUpdated = timeStr;

      saveCurrentUser(user);
      syncUserInfoUI();
      showToast('Đã lưu thay đổi thông tin cá nhân thành công!');
    });
  }

  // 12a. Kiểm tra email / số điện thoại ngay khi rời khỏi ô: hiện dòng lỗi màu đỏ bên dưới
  setupContactFieldValidation();

  // 12b. Ảnh đại diện: chọn tệp → cắt ảnh → lưu; hoặc xóa để dùng lại chữ cái
  const avatarInput = document.getElementById('input-avatar-file');
  if (avatarInput) {
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files && avatarInput.files[0];
      avatarInput.value = '';
      if (!file) return;
      const dataUrl = await openAvatarCropper(file);
      if (!dataUrl) return;
      const user = getCurrentUser();
      user.avatarImage = dataUrl;
      saveCurrentUser(user);
      syncUserInfoUI();
      showToast('Đã cập nhật ảnh đại diện!');
    });
  }
  const removeAvatarBtn = document.getElementById('btn-remove-avatar');
  if (removeAvatarBtn) {
    removeAvatarBtn.addEventListener('click', async () => {
      const ok = await showConfirm({
        title: 'Đặt avatar thành mặc định?',
        message: 'Ảnh đại diện hiện tại sẽ bị xóa và avatar quay về chữ cái đầu của tên.',
        confirmText: 'Đặt mặc định',
        tone: 'danger'
      });
      if (!ok) return;
      const user = getCurrentUser();
      delete user.avatarImage;
      saveCurrentUser(user);
      syncUserInfoUI();
      showToast('Đã đặt avatar về mặc định.');
    });
  }

  // 12c. Ngày sinh: con mắt hiện / ẩn ngày tháng; nút Thay đổi mở ô chọn ngày
  const eyeBtn = document.getElementById('btn-toggle-birthdate');
  if (eyeBtn) {
    eyeBtn.addEventListener('click', () => {
      birthDateRevealed = !birthDateRevealed;
      renderBirthDate(getCurrentUser());
    });
  }
  const changeBirthBtn = document.getElementById('btn-change-birthdate');
  if (changeBirthBtn) {
    changeBirthBtn.addEventListener('click', () => {
      const user = getCurrentUser();
      if (user.birthDateLocked) return;
      const birthInput = document.getElementById('input-birthdate');
      const birthHint = document.getElementById('birthdate-hint');
      if (birthInput) {
        birthInput.hidden = false;
        birthInput.value = user.birthDate || '';
        birthInput.max = new Date().toISOString().slice(0, 10);
        birthInput.focus();
      }
      if (birthHint) birthHint.hidden = false;
    });
  }

  // 12d. Quyền riêng tư hồ sơ công khai
  const privacyForm = document.getElementById('form-privacy');
  // Quay lại trang (nút Back / bộ nhớ đệm bfcache): vẽ lại theo dữ liệu đã lưu,
  // tránh công tắc giữ trạng thái chưa lưu trong khi chữ hiển thị trạng thái cũ
  window.addEventListener('pageshow', () => {
    if (privacyForm) syncUserInfoUI();
  });
  // Đánh dấu có thay đổi quyền riêng tư chưa lưu
  let privacyDirty = false;
  if (privacyForm) {
    privacyForm.addEventListener('change', (e) => {
      if (e.target.matches('.pcb-switch__input')) {
        updateSwitchText(e.target);
        privacyDirty = true;
      }
    });
    // Bấm "Xem hồ sơ công khai" khi còn thay đổi chưa lưu: hỏi lưu trước
    const publicLink = document.getElementById('sidebar-public-link');
    if (publicLink) {
      publicLink.addEventListener('click', async (e) => {
        if (!privacyDirty) return;
        e.preventDefault();
        const save = await showConfirm({
          title: 'Chưa lưu cài đặt quyền riêng tư',
          message: 'Bạn vừa thay đổi quyền riêng tư nhưng chưa lưu. Lưu trước khi xem hồ sơ công khai?',
          confirmText: 'Lưu và xem',
          cancelText: 'Bỏ thay đổi'
        });
        if (save) privacyForm.requestSubmit();
        else syncUserInfoUI();
        privacyDirty = false;
        window.location.href = publicLink.href;
      });
    }
    privacyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = getCurrentUser();
      const privacy = {};
      privacyForm.querySelectorAll('.pcb-switch__input').forEach(input => { privacy[input.name] = input.checked; });
      user.privacy = privacy;
      saveCurrentUser(user);
      privacyDirty = false;
      showToast('Đã lưu cài đặt quyền riêng tư hồ sơ công khai!');
    });
  }

  // 13. Xử lý Form Đổi mật khẩu
  const formPass = document.getElementById('form-change-password');
  if (formPass) {
    formPass.addEventListener('submit', (e) => {
      e.preventDefault();
      const cur = document.getElementById('input-current-pass')?.value;
      const nw = document.getElementById('input-new-pass')?.value;
      const cf = document.getElementById('input-confirm-pass')?.value;

      if (!cur || !nw || !cf) {
        showAlert({ title: 'Thiếu thông tin', message: 'Vui lòng điền đầy đủ các trường mật khẩu.', tone: 'warning' });
        return;
      }

      if (nw.length < 8) {
        showAlert({ title: 'Mật khẩu quá ngắn', message: 'Mật khẩu mới phải có ít nhất 8 ký tự.', tone: 'warning' });
        return;
      }

      if (nw !== cf) {
        showAlert({ title: 'Mật khẩu không khớp', message: 'Mật khẩu xác nhận không khớp với mật khẩu mới.', tone: 'warning' });
        return;
      }

      // Kiểm tra mật khẩu hiện tại theo bản tài khoản đã lưu (kể cả tài khoản demo)
      const user = getCurrentUser();
      const stored = findAccount({ id: user.id, username: user.username }) || user;
      if (accountHasPassword(stored) && !verifyPassword(stored, cur)) {
        showAlert({ title: 'Sai mật khẩu hiện tại', message: 'Mật khẩu hiện tại không đúng. Vui lòng thử lại.', tone: 'warning' });
        document.getElementById('input-current-pass')?.focus();
        return;
      }
      if (cur === nw) {
        showAlert({ title: 'Mật khẩu chưa thay đổi', message: 'Mật khẩu mới phải khác mật khẩu hiện tại.', tone: 'warning' });
        return;
      }

      // Lưu mật khẩu mới dạng đã băm, bỏ mật khẩu mẫu dạng chữ thường (nếu là tài khoản demo)
      const updated = { ...stored, ...user, passwordHash: hashPassword(nw) };
      delete updated.password;
      saveCurrentUser(updated);
      formPass.reset();
      showToast('Đổi mật khẩu tài khoản thành công!');
    });
  }

  // 14. Nút Đăng xuất
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      const ok = await showConfirm({
        title: 'Đăng xuất tài khoản?',
        message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản PCBid?',
        confirmText: 'Đăng xuất',
        tone: 'danger'
      });
      if (ok) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem('pcbid_user');
        localStorage.setItem('pcbid_logged_out', 'true');
        showToast('Đã đăng xuất tài khoản thành công!');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 500);
      }
    });
  }

  // Lắng nghe bfcache và storage để làm mới dữ liệu tab quản lý đấu giá
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      renderCurrentAuctionTab();
      syncUserInfoUI();
    }
  });

  // Đơn hàng / ví thay đổi (thanh toán, giao hàng, quá hạn, bot vượt giá): làm mới tab và số dư
  const refreshOrdersAndWallet = () => {
    if (new URLSearchParams(window.location.search).get('user')) return;
    renderCurrentAuctionTab();
    syncUserInfoUI();
    if (currentActiveSection === 'section-notifications') renderNotifications();
  };
  window.addEventListener('pcbid:orders-updated', refreshOrdersAndWallet);
  window.addEventListener('pcbid:bid-placed', refreshOrdersAndWallet);
  // Đồng hồ hạn thanh toán trong tab Đơn hàng
  setInterval(() => {
    const grid = document.getElementById(`grid-${currentActiveTab}`);
    if (grid && currentActiveTab.endsWith('-orders')) tickOrderCountdowns(grid);
  }, 1000);

  window.addEventListener('storage', (e) => {
    if (e.key === 'pcbid_my_auctions_participating' || e.key === 'pcbid_products' || e.key === 'pcbid_bids' || e.key === 'pcbid_orders' || e.key === 'pcbid_wallet_ledger') {
      renderCurrentAuctionTab();
      syncUserInfoUI();
      updateCounters();
      if (currentActiveSection === 'section-notifications') renderNotifications();
    }
  });
});
