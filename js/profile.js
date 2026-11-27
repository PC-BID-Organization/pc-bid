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
// Kiểm duyệt bài đăng, quản lý phiên, báo cáo vi phạm (Kiểm định viên / Quản trị viên)
import {
  isStaff, isAdmin, getStaffRole, getRoleLabel, ROLE_LABELS, isAwaitingReview, needsMoreInfo, isRejected,
  getLastStaffNote, getReviewQueue, getModerationState, isListingVisible, getReports, getOpenReportCount, getHiddenListingCount,
  REPORT_STATUS_LABELS, isAwaitingShipment, isShipmentOverdue, getShipmentQueue, isPubliclyListed,
  getWarnings, getAccountDeletion, isUserDeleted
} from './moderation.js';
import {
  confirmApprove, promptRequestInfo, promptReject, promptSellerReply, promptHide, confirmUnhide, promptRemove,
  openReportDialog, promptResolveReport, promptShipToBranch, confirmReceived,
  promptWarnUser, promptDeleteUser, confirmRestoreUser
} from './review-actions.js';
// Chi nhánh kiểm định nhận linh kiện của người bán
import { getBranch, formatBranchAddress, openBranchFinder } from './branches.js';
// Sổ địa chỉ nhận hàng
import { getAddresses, openAddressForm, deleteAddress, setDefaultAddress, renderAddressInfo, getVerificationStatus } from './address-book.js';
import { renderOrderCard, bindOrderActions, tickOrderCountdowns } from './order-view.js';
// Phiên đấu giá và lịch sử đặt giá dùng chung (thật + mẫu)
import { loadAllAuctions, getAuctionsFromHistory } from './bid-history.js';
// Trạng thái kiểm định của phiên tự đăng bán
import { isAwaitingInspection, getCountdownStart, getRemainingMs } from './inspection.js';
// Module ví ảo & tiền cọc dùng chung
import { getParticipatingAuctions, getDepositHold, getAvailableBalance, checkBidDeposit, getUserNotifications, getUnreadNotificationCount, markNotificationsRead } from './wallet.js';
// Lưu watchlist và phiên đã đăng bán riêng theo từng tài khoản
import { USER_LIST_KEYS, getUserKey, isDemoUser, readUserList, writeUserList } from './user-data.js';
// Tài khoản demo, avatar chữ cái và UID dùng chung
import { DEMO_ACCOUNTS, MOCK_BIDDERS, getAvatarInitial, getUserUid, getGivenName, describeBidder, maskUid,
  renderAvatarContent, saveAccount, getAllAccounts, getPrivacy, formatBirthDate, findAccount, findAccountConflict, normalizePhone,
  hashPassword, verifyPassword, accountHasPassword, isDemoAccount, validateUsername, migrateUsername,
  validatePhoneNumber, validateEmailAddress } from './accounts.js';
// Công cụ cắt ảnh đại diện
import { openAvatarCropper } from './avatar-cropper.js';
// Hộp thoại thông báo / xác nhận thay cho alert / confirm của trình duyệt
import { showAlert, showConfirm, showChoice } from './dialog.js';



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
function formatTimeRemaining(endTimestamp, start = 0) {
  // start: mốc bắt đầu tính giờ (phiên chờ kiểm định thì đồng hồ đứng yên tới lúc đó)
  const diff = getRemainingMs(endTimestamp, start);
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
 * Sao chép chuỗi vào bộ nhớ tạm (clipboard); trình duyệt cũ dùng cách chọn chữ rồi execCommand
 * @param {string} text
 * @returns {Promise<boolean>} true nếu sao chép thành công
 */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    temp.remove();
    return ok;
  }
}

/**
 * Hiển thị thanh thông báo Toast nhanh góc dưới màn hình
 */
function showToast(message, isSuccess = true, action = null) {
  const toast = document.getElementById('pcb-toast');
  const msgEl = document.getElementById('pcb-toast-message');
  const iconEl = document.getElementById('pcb-toast-icon');
  const actionBtn = document.getElementById('pcb-toast-action');
  if (!toast || !msgEl || !iconEl) return;

  msgEl.textContent = message;
  iconEl.textContent = isSuccess ? '✓' : '!';
  iconEl.style.backgroundColor = isSuccess ? '#10b981' : '#ef4444';

  // Thông báo có nút thao tác (VD: Hoàn tác) hiện lâu hơn để kịp bấm
  const duration = action ? 5000 : 3500;
  if (actionBtn) {
    actionBtn.hidden = !action;
    actionBtn.onclick = null;
    if (action) {
      actionBtn.textContent = action.label;
      actionBtn.onclick = () => {
        clearTimeout(toast._timer);
        toast.classList.remove('pcb-toast--show');
        actionBtn.onclick = null;
        action.onClick();
      };
    }
  }
  // Vạch thời gian chạy ngược cho biết còn bao lâu nút thao tác biến mất
  toast.classList.toggle('pcb-toast--action', Boolean(action));
  toast.style.setProperty('--pcb-toast-duration', `${duration}ms`);
  toast.classList.remove('pcb-toast--show');
  void toast.offsetWidth; // Khởi động lại hiệu ứng vạch thời gian khi hiện thông báo mới liên tiếp
  toast.classList.add('pcb-toast--show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('pcb-toast--show');
    if (actionBtn) actionBtn.onclick = null;
  }, duration);
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

    // Trạng thái duyệt lấy từ pcbid_products (nơi Admin duyệt / từ chối): bản lưu trong danh sách
    // đăng bán chỉ là bản sao lúc đăng nên có thể vẫn ghi "chờ duyệt" dù Admin đã xử lý xong
    const approvalSource = productMap.get(Number(item.id));
    if (approvalSource?.approvalStatus) {
      item.approvalStatus = approvalSource.approvalStatus;
      const flowStatuses = ['active', 'rejected', 'pending_approval', 'awaiting_shipment'];
      if (flowStatuses.includes(approvalSource.status) && flowStatuses.includes(item.status)) {
        item.status = approvalSource.status;
      }
      // Nhật ký kiểm duyệt, mốc kiểm định, gửi hàng và giờ kết thúc được tính lại theo từng bước
      ['reviewLog', 'inspection', 'endTime', 'durationMs', 'reviewedBy', 'shipment'].forEach(field => {
        if (field in approvalSource) item[field] = approvalSource[field];
      });
      if (approvalSource.endTime) item.endTimestamp = new Date(approvalSource.endTime).getTime();
    }

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
  // Báo Header cập nhật số đếm trên icon bookmark
  window.dispatchEvent(new CustomEvent('pcbid:watchlist-updated', { detail: { count: items.length } }));
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

  const moderation = getModerationState(item.id);
  const staffNote = getLastStaffNote(item);
  // Dòng ghi chú dưới tiêu đề: yêu cầu bổ sung / lý do từ chối / lý do ẩn, gỡ
  let noteHtml = '';

  if (moderation.removed) {
    modifierClass = 'pcb-auction-card--selling-ended';
    badgeHtml = '<span class="pcb-status-badge pcb-status-badge--outbid">Đã bị gỡ khỏi sàn</span>';
    noteHtml = `Lý do gỡ: ${escapeHtml(moderation.removed.reason || '---')}`;
    actionButtonsHtml = `<a href="${detailUrl}" class="pcb-btn-detail">Xem chi tiết</a>`;
  } else if (needsMoreInfo(item)) {
    modifierClass = 'pcb-auction-card--selling-active';
    badgeHtml = '<span class="pcb-status-badge pcb-status-badge--active">Cần bổ sung thông tin</span>';
    noteHtml = `<strong>${escapeHtml(staffNote?.by?.name || 'Kiểm định viên')}:</strong> ${escapeHtml(staffNote?.note || '')}`;
    actionButtonsHtml = `
      <button type="button" class="pcb-btn-primary pcb-btn-primary--compact" data-seller-reply="${item.id}">Gửi bổ sung</button>
      <a href="${detailUrl}" class="pcb-btn-detail">Xem chi tiết</a>
    `;
  } else if (isAwaitingShipment(item)) {
    // Đã duyệt: người bán gửi linh kiện tới chi nhánh kiểm định
    const ship = item.shipment || {};
    const branch = getBranch(ship.branchId);
    modifierClass = 'pcb-auction-card--selling-active';
    if (ship.status === 'in_transit') {
      badgeHtml = '<span class="pcb-status-badge pcb-status-badge--active">Đang chuyển tới chi nhánh</span>';
      noteHtml = `<strong>${escapeHtml(branch?.name || '')}</strong> · ${escapeHtml(formatBranchAddress(branch))}${ship.trackingCode ? ` · ${escapeHtml(ship.carrier)} ${escapeHtml(ship.trackingCode)}` : ' · Mang trực tiếp'}`;
      actionButtonsHtml = `
        <button type="button" class="pcb-btn-detail" data-branch-received-demo="${item.id}">Giả lập chi nhánh nhận hàng (demo)</button>
        <a href="${detailUrl}" class="pcb-btn-detail">Xem chi tiết</a>
      `;
    } else {
      const overdue = isShipmentOverdue(item);
      badgeHtml = `<span class="pcb-status-badge ${overdue ? 'pcb-status-badge--outbid' : 'pcb-status-badge--pending'}">${overdue ? 'Quá hạn gửi hàng' : 'Chờ gửi hàng kiểm định'}</span>`;
      noteHtml = `Đã được duyệt. Gửi linh kiện tới chi nhánh kiểm định PCBid trước <strong>${new Date(ship.deadline || Date.now()).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</strong>.`;
      actionButtonsHtml = `
        <button type="button" class="pcb-btn-primary pcb-btn-primary--compact" data-ship-to-branch="${item.id}">Gửi hàng kiểm định</button>
        <button type="button" class="pcb-btn-detail" data-browse-branches>Tìm chi nhánh gần nhất</button>
      `;
    }
  } else if (isAwaitingReview(item)) {
    modifierClass = 'pcb-auction-card--selling-active';
    badgeHtml = '<span class="pcb-status-badge pcb-status-badge--pending">Chờ kiểm duyệt</span>';
    actionButtonsHtml = `
      <a href="${detailUrl}" class="pcb-btn-detail">Xem chi tiết</a>
    `;
  } else if (isRejected(item)) {
    modifierClass = 'pcb-auction-card--selling-ended';
    badgeHtml = '<span class="pcb-status-badge pcb-status-badge--outbid">Không được duyệt</span>';
    if (staffNote?.note) noteHtml = `Lý do: ${escapeHtml(staffNote.note)}`;
    actionButtonsHtml = `
      <a href="sell.html?relist=${item.id}" class="pcb-btn-rebid pcb-btn-rebid--muted">Chỉnh sửa &amp; Nộp lại</a>
      <a href="${detailUrl}" class="pcb-btn-detail">Xem chi tiết</a>
    `;
  } else if (item.status === 'active' && isAwaitingInspection(item)) {
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
        ${moderation.hidden && !moderation.removed ? `<p class="pcb-auction-card__review-note pcb-auction-card__review-note--warn">${icon('eye-off', { size: 13 })}<span>Đang tạm ẩn khỏi sàn: ${escapeHtml(moderation.hidden.reason || '')}</span></p>` : ''}
        ${noteHtml ? `<p class="pcb-auction-card__review-note">${icon(isAwaitingShipment(item) ? 'truck' : 'message-square', { size: 13 })}<span>${noteHtml}</span></p>` : ''}

        <div class="pcb-auction-card__stats">
          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">${item.status === 'sold' ? 'Giá chốt phiên' : 'Giá đấu hiện tại'}</span>
            <span class="pcb-stat-col__val pcb-stat-col__val--primary">${formatVnd(item.currentBid)}</span>
          </div>

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Giá khởi điểm</span>
            <span class="pcb-stat-col__val">${formatVnd(item.startingPrice)}</span>
          </div>

          ${isAwaitingReview(item) || isAwaitingShipment(item) ? `
            <div class="pcb-stat-col">
              <span class="pcb-stat-col__lbl">Thời gian còn lại</span>
              <span class="pcb-stat-col__val pcb-stat-col__val--muted">${isAwaitingShipment(item) ? 'Bắt đầu khi kiểm định xong' : 'Bắt đầu sau khi duyệt'}</span>
            </div>
          ` : item.status === 'active' ? `
            <div class="pcb-stat-col">
              <span class="pcb-stat-col__lbl">Thời gian còn lại</span>
              <span class="pcb-stat-col__countdown" data-timestamp="${getAuctionEndTimestamp(item)}" data-start="${getCountdownStart(item)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="countdown-text">${formatTimeRemaining(getAuctionEndTimestamp(item), getCountdownStart(item))}</span>
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
 * Thời gian tương đối ngắn gọn (VD: "5 phút trước")
 * @param {string} iso
 * @returns {string}
 */
function timeAgo(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

/**
 * Thời hạn người bán chọn, dạng chữ
 * @param {Object} item
 * @returns {string}
 */
function describeDuration(item) {
  if (item.endMode === 'ceiling_only') return 'Tới khi chạm giá trần';
  const days = Math.round((Number(item.durationMs) || 0) / 86400000);
  return days > 0 ? `${days} ngày (tính từ lúc kiểm định xong)` : 'Theo lựa chọn của người bán';
}

/**
 * Render thẻ bài đăng chờ Kiểm định viên / Quản trị viên duyệt
 * @param {Object} item - Bài đăng
 * @returns {string} HTML thẻ
 */
function renderAdminApprovalCard(item) {
  const detailUrl = `product-detail.html?id=${item.id}`;
  const imageSrc = (item.images && item.images[0]) ? item.images[0] : 'images/placeholder-product.svg';
  const startPrice = formatVnd(item.startingPrice || 0);
  const ceilingPrice = item.ceilingPrice ? formatVnd(item.ceilingPrice) : 'Không đặt';
  const bidStep = formatVnd(item.bidStep || 50000);
  const sellerAcc = findAccount({ username: item.seller });
  const sellerName = sellerAcc?.fullname || item.seller || 'Người bán';
  const waitingInfo = needsMoreInfo(item);
  // Phản hồi gần nhất của người bán (nếu đã bổ sung) và yêu cầu gần nhất của Kiểm định viên
  const log = Array.isArray(item.reviewLog) ? item.reviewLog : [];
  const lastReply = [...log].reverse().find(e => e.action === 'reply');
  const lastRequest = getLastStaffNote(item);

  let noteHtml = `${icon('clipboard-check', { size: 14 })}<span>Đối chiếu ảnh thật, thông số và mô tả trước khi gửi PCBid Lab kiểm định. Thời hạn: ${escapeHtml(describeDuration(item))}.</span>`;
  if (waitingInfo && lastRequest) {
    noteHtml = `${icon('message-square', { size: 14 })}<span><strong>Đã yêu cầu bổ sung</strong> (${escapeHtml(lastRequest.by?.name || '')}, ${timeAgo(lastRequest.at)}): ${escapeHtml(lastRequest.note)}</span>`;
  } else if (lastReply) {
    noteHtml = `${icon('message-square', { size: 14 })}<span><strong>Người bán đã bổ sung</strong> (${timeAgo(lastReply.at)}): ${escapeHtml(lastReply.note)}</span>`;
  }

  return `
    <article class="pcb-auction-card pcb-auction-card--admin-review" data-id="${item.id}">
      <a href="${detailUrl}" class="pcb-auction-card__media-link" aria-label="Xem chi tiết ${escapeHtml(item.name)}">
        <span class="pcb-auction-card__category-badge pcb-auction-card__category-badge--admin">${escapeHtml(item.category || 'PC')}</span>
        <img src="${imageSrc}" alt="${escapeHtml(item.name)}" class="pcb-auction-card__img" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
      </a>

      <div class="pcb-auction-card__body">
        <div class="pcb-auction-card__top-row">
          <span class="pcb-status-badge ${waitingInfo ? 'pcb-status-badge--active' : 'pcb-status-badge--pending'}">${waitingInfo ? 'Chờ người bán bổ sung' : 'Chờ duyệt'}</span>
          <span class="pcb-admin-review__seller">Người bán: <a href="profile.html?user=${encodeURIComponent(item.seller || '')}"><strong>${escapeHtml(sellerName)}</strong></a> · <span>${timeAgo(item.submittedAt || new Date().toISOString())}</span></span>
        </div>

        <a href="${detailUrl}" class="pcb-auction-card__title" title="${escapeHtml(item.name)}">
          ${escapeHtml(item.name)}
        </a>

        <div class="pcb-auction-card__stats pcb-admin-review__stats">
          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Giá khởi điểm</span>
            <span class="pcb-stat-col__val">${startPrice}</span>
          </div>
          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Bước giá</span>
            <span class="pcb-stat-col__val">${bidStep}</span>
          </div>
          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Giá trần chốt ngay</span>
            <span class="pcb-stat-col__val pcb-admin-review__ceiling">${ceilingPrice}</span>
          </div>
        </div>

        <p class="pcb-admin-review__note">${noteHtml}</p>
      </div>

      <div class="pcb-auction-card__actions">
        <button type="button" class="pcb-admin-review__btn pcb-admin-review__btn--approve" data-review-action="approve" data-review-id="${item.id}">
          ${icon('circle-check', { size: 15 })} Duyệt
        </button>
        <button type="button" class="pcb-admin-review__btn pcb-admin-review__btn--info" data-review-action="info" data-review-id="${item.id}">
          ${icon('message-square', { size: 15 })} Yêu cầu bổ sung
        </button>
        <button type="button" class="pcb-admin-review__btn pcb-admin-review__btn--reject" data-review-action="reject" data-review-id="${item.id}">
          ${icon('circle-x', { size: 15 })} Từ chối
        </button>
        <a href="${detailUrl}" class="pcb-btn-detail">
          ${icon('search', { size: 14 })} Xem chi tiết
        </a>
      </div>
    </article>
  `;
}

/**
 * Trạng thái quản lý của một phiên trên sàn (dùng cho tab Quản lý phiên)
 * @param {Object} item
 * @returns {{key: 'visible'|'hidden'|'removed', label: string, info: Object|null}}
 */
function getManageState(item) {
  const state = getModerationState(item.id);
  if (state.removed) return { key: 'removed', label: 'Đã gỡ', info: state.removed };
  if (state.hidden) return { key: 'hidden', label: 'Đang ẩn', info: state.hidden };
  return { key: 'visible', label: isAuctionClosed(item) || getAuctionEndTimestamp(item) <= Date.now() ? 'Đã kết thúc' : 'Đang hiển thị', info: null };
}

/**
 * Một dòng trong tab Quản lý phiên của Quản trị viên
 * @param {Object} item - Phiên đấu giá
 * @returns {string}
 */
function renderManageRow(item) {
  const state = getManageState(item);
  const sellerAcc = findAccount({ username: item.seller });
  const imageSrc = item.images?.[0] || item.image || 'images/placeholder-product.svg';
  const reportCount = getReports().filter(r => r.status === 'open' && r.type === 'listing' && String(r.targetId) === String(item.id)).length;
  return `
    <li class="pcb-staff-row pcb-staff-row--${state.key}" data-id="${item.id}">
      <img class="pcb-staff-row__img" src="${escapeHtml(imageSrc)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
      <div class="pcb-staff-row__body">
        <a class="pcb-staff-row__title" href="product-detail.html?id=${item.id}">${escapeHtml(item.name)}</a>
        <span class="pcb-staff-row__meta">
          <span class="pcb-staff-row__state pcb-staff-row__state--${state.key}">${state.label}</span>
          · ${escapeHtml(item.category || '')} · Người bán: ${escapeHtml(sellerAcc?.fullname || item.seller || '---')}
          · ${formatVnd(item.currentBid || item.startingPrice || 0)}
          ${reportCount ? `<span class="pcb-staff-row__flag">${icon('flag', { size: 12 })} ${reportCount} báo cáo</span>` : ''}
        </span>
        ${state.info?.reason ? `<span class="pcb-staff-row__reason">Lý do: ${escapeHtml(state.info.reason)} (${escapeHtml(state.info.by?.name || '')})</span>` : ''}
      </div>
      <div class="pcb-staff-row__actions">
        ${state.key === 'removed' ? '' : `
          <button type="button" class="pcb-staff-row__btn" data-manage-action="${state.key === 'hidden' ? 'unhide' : 'hide'}" data-manage-id="${item.id}">
            ${icon(state.key === 'hidden' ? 'eye' : 'eye-off', { size: 14 })} ${state.key === 'hidden' ? 'Hiện lại' : 'Ẩn'}
          </button>
          <button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--danger" data-manage-action="remove" data-manage-id="${item.id}">
            ${icon('trash-2', { size: 14 })} Gỡ
          </button>`}
      </div>
    </li>
  `;
}

/**
 * Một linh kiện chờ tới chi nhánh kiểm định (tab Nhận hàng)
 * @param {Object} item
 * @returns {string}
 */
function renderShipmentRow(item) {
  const ship = item.shipment || {};
  const branch = getBranch(ship.branchId);
  const sellerAcc = findAccount({ username: item.seller });
  const inTransit = ship.status === 'in_transit';
  const overdue = isShipmentOverdue(item);
  const imageSrc = item.images?.[0] || 'images/placeholder-product.svg';
  const dateText = iso => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  return `
    <li class="pcb-staff-row${overdue ? ' pcb-staff-row--hidden' : ''}" data-id="${item.id}">
      <img class="pcb-staff-row__img" src="${escapeHtml(imageSrc)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
      <div class="pcb-staff-row__body">
        <a class="pcb-staff-row__title" href="product-detail.html?id=${item.id}">${escapeHtml(item.name)}</a>
        <span class="pcb-staff-row__meta">
          <span class="pcb-staff-row__state pcb-staff-row__state--${inTransit ? 'visible' : 'hidden'}">${inTransit ? 'Đang chuyển tới' : overdue ? 'Quá hạn gửi hàng' : 'Người bán chưa gửi'}</span>
          · Người bán: ${escapeHtml(sellerAcc?.fullname || item.seller || '---')}
          · ${inTransit ? `Gửi lúc ${dateText(ship.sentAt)}` : `Hạn gửi ${dateText(ship.deadline)}`}
        </span>
        ${inTransit ? `<span class="pcb-staff-row__reason">${icon('map-pin', { size: 12 })} ${escapeHtml(branch?.name || '')} · ${ship.method === 'courier' ? `${escapeHtml(ship.carrier)} · Mã vận đơn <strong>${escapeHtml(ship.trackingCode)}</strong>` : 'Mang trực tiếp tới quầy'}</span>` : ''}
      </div>
      <div class="pcb-staff-row__actions">
        ${inTransit ? `<button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--ok" data-ship-received="${item.id}">${icon('package', { size: 14 })} Đã nhận hàng</button>` : ''}
        <a class="pcb-staff-row__btn" href="product-detail.html?id=${item.id}">${icon('search', { size: 14 })} Xem</a>
      </div>
    </li>
  `;
}

/**
 * Danh sách tài khoản người dùng cho tab Tài khoản (không gồm tài khoản đội ngũ PCBid)
 * @returns {Array<Object>} Tài khoản kèm warnings, deletion, openReports
 */
function getManagedAccounts() {
  const reports = getReports().filter(r => r.type === 'user');
  return getAllAccounts()
    .filter(acc => acc.username && !getStaffRole(acc))
    .map(acc => ({
      ...acc,
      warnings: getWarnings(acc.username),
      deletion: getAccountDeletion(acc.username),
      openReports: reports.filter(r => r.status === 'open' && r.targetId === acc.username).length
    }))
    // Tài khoản bị báo cáo nhiều lên đầu, tài khoản đã xóa xuống cuối
    .sort((a, b) => (Boolean(a.deletion) - Boolean(b.deletion)) || (b.openReports - a.openReports) || (b.warnings.length - a.warnings.length));
}

/**
 * Một tài khoản trong tab Tài khoản của Quản trị viên
 * @param {Object} acc - Kết quả getManagedAccounts
 * @returns {string}
 */
function renderAccountRow(acc) {
  const lastWarning = acc.warnings[acc.warnings.length - 1];
  const avatar = renderAvatarContent(acc, 'pcb-staff-row__avatar-img');
  return `
    <li class="pcb-staff-row${acc.deletion ? ' pcb-staff-row--removed' : ''}" data-username="${escapeHtml(acc.username)}">
      <span class="pcb-staff-row__avatar" aria-hidden="true">${avatar.startsWith('<img') ? avatar : escapeHtml(avatar)}</span>
      <div class="pcb-staff-row__body">
        <a class="pcb-staff-row__title" href="profile.html?user=${encodeURIComponent(acc.username)}">${escapeHtml(acc.fullname || acc.username)} <span class="pcb-staff-row__handle">@${escapeHtml(acc.username)}</span></a>
        <span class="pcb-staff-row__meta">
          <span class="pcb-staff-row__state pcb-staff-row__state--${acc.deletion ? 'removed' : 'visible'}">${acc.deletion ? 'Đã xóa' : 'Đang hoạt động'}</span>
          · ${escapeHtml(acc.email || '')}
          ${acc.warnings.length ? `<span class="pcb-staff-row__warn">${icon('triangle-alert', { size: 12 })} ${acc.warnings.length} cảnh báo</span>` : ''}
          ${acc.openReports ? `<span class="pcb-staff-row__flag">${icon('flag', { size: 12 })} ${acc.openReports} báo cáo</span>` : ''}
        </span>
        ${acc.deletion
          ? `<span class="pcb-staff-row__reason">Lý do xóa: ${escapeHtml(acc.deletion.reason)}</span>`
          : lastWarning ? `<span class="pcb-staff-row__reason">Cảnh báo gần nhất: ${escapeHtml(lastWarning.reason)} (${timeAgo(lastWarning.at)}${lastWarning.seenAt ? ', đã xem' : ', chưa xem'})</span>` : ''}
      </div>
      <div class="pcb-staff-row__actions">
        ${acc.deletion
          ? `<button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--ok" data-account-action="restore" data-account="${escapeHtml(acc.username)}">${icon('circle-check', { size: 14 })} Khôi phục</button>`
          : `<button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--warn" data-account-action="warn" data-account="${escapeHtml(acc.username)}">${icon('triangle-alert', { size: 14 })} Cảnh báo</button>
             <button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--danger" data-account-action="delete" data-account="${escapeHtml(acc.username)}">${icon('trash-2', { size: 14 })} Xóa tài khoản</button>`}
      </div>
    </li>
  `;
}

/**
 * Một báo cáo vi phạm trong tab Báo cáo
 * @param {Object} report
 * @returns {string}
 */
function renderReportRow(report) {
  const isListing = report.type === 'listing';
  const targetUrl = isListing ? `product-detail.html?id=${encodeURIComponent(report.targetId)}` : `profile.html?user=${encodeURIComponent(report.targetId)}`;
  const open = report.status === 'open';
  const listingState = isListing ? getModerationState(report.targetId) : null;
  return `
    <li class="pcb-staff-row pcb-staff-row--report${open ? '' : ' pcb-staff-row--closed'}" data-report-id="${report.id}">
      <span class="pcb-staff-row__type pcb-staff-row__type--${report.type}">${icon(isListing ? 'tag' : 'user', { size: 14 })}${isListing ? 'Bài đăng' : 'Tài khoản'}</span>
      <div class="pcb-staff-row__body">
        <a class="pcb-staff-row__title" href="${targetUrl}">${escapeHtml(report.targetName)}</a>
        <span class="pcb-staff-row__reason-main">${escapeHtml(report.reason)}</span>
        ${report.detail ? `<span class="pcb-staff-row__detail">"${escapeHtml(report.detail)}"</span>` : ''}
        <span class="pcb-staff-row__meta">
          <span class="pcb-staff-row__state pcb-staff-row__state--${open ? 'hidden' : 'visible'}">${REPORT_STATUS_LABELS[report.status] || report.status}</span>
          · Gửi bởi ${escapeHtml(report.reporter?.name || '')} · ${timeAgo(report.createdAt)}
          ${listingState?.hidden ? ' · Bài đang bị ẩn' : ''}${listingState?.removed ? ' · Bài đã bị gỡ' : ''}
        </span>
        ${!open && report.handledBy ? `<span class="pcb-staff-row__reason">${escapeHtml(ROLE_LABELS[report.handledBy.role] || '')} ${escapeHtml(report.handledBy.name)}${report.note ? `: ${escapeHtml(report.note)}` : ''}</span>` : ''}
      </div>
      <div class="pcb-staff-row__actions">
        <a class="pcb-staff-row__btn" href="${targetUrl}">${icon('search', { size: 14 })} Xem</a>
        ${open ? `
          ${isListing && isAdmin(getCurrentUser()) && !listingState?.hidden && !listingState?.removed ? `<button type="button" class="pcb-staff-row__btn" data-report-action="hide" data-report-id="${report.id}">${icon('eye-off', { size: 14 })} Ẩn bài</button>` : ''}
          ${!isListing && isAdmin(getCurrentUser()) && !isUserDeleted(report.targetId) ? `
            <button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--warn" data-account-action="warn" data-account="${escapeHtml(report.targetId)}">${icon('triangle-alert', { size: 14 })} Cảnh báo</button>
            <button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--danger" data-account-action="delete" data-account="${escapeHtml(report.targetId)}">${icon('trash-2', { size: 14 })} Xóa TK</button>` : ''}
          <button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--ok" data-report-action="resolved" data-report-id="${report.id}">${icon('circle-check', { size: 14 })} Đã xử lý</button>
          <button type="button" class="pcb-staff-row__btn" data-report-action="dismissed" data-report-id="${report.id}">${icon('circle-x', { size: 14 })} Không vi phạm</button>
        ` : ''}
      </div>
    </li>
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

// Mỗi tab thuộc một luồng làm việc riêng: Mua hàng, Bán hàng hoặc Quản trị viên (Admin)
const TAB_GROUP = {
  participating: 'buy',
  'buy-orders': 'buy',
  watchlist: 'buy',
  selling: 'sell',
  'sell-orders': 'sell',
  'admin-approvals': 'admin',
  'admin-shipments': 'admin',
  'admin-manage': 'admin',
  'admin-accounts': 'admin',
  'admin-reports': 'admin'
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

/**
 * Hiện / xóa lỗi của ô tên đăng nhập
 * @param {boolean} [partial] - Đang gõ dở: chưa báo lỗi thiếu ký tự / kết thúc bằng dấu
 * @returns {boolean} true nếu tên hợp lệ (hoặc không đổi)
 */
function showUsernameError(partial = false) {
  const input = document.getElementById('input-username');
  const errEl = document.getElementById('err-input-username');
  if (!input) return true;
  const user = getCurrentUser();
  const value = input.value.trim().toLowerCase();
  const message = value === user?.username ? '' : validateUsername(value, user, { partial });
  if (errEl) errEl.textContent = message;
  input.classList.toggle('pcb-input--error', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
  input.setAttribute('aria-describedby', message ? 'err-input-username' : 'hint-input-username');
  return !message;
}

/* --------------------------------------------------------------------------
   THANH LƯU NỔI & HỎI LƯU KHI RỜI ĐI CHO CÁC FORM CÀI ĐẶT
   Áp dụng cho: Thông tin tài khoản, Đổi mật khẩu, Quyền riêng tư hồ sơ công khai.
   - Máy tính: thanh nổi hiện khi có thay đổi chưa lưu và nút lưu của form đang khuất.
   - Điện thoại: thanh nổi hiện ngay khi có thay đổi, kể cả lúc đang gõ (bàn phím mở),
     nằm sát phía trên bàn phím và tự cuộn để không che ô đang nhập.
   -------------------------------------------------------------------------- */

/**
 * Danh sách form được theo dõi thay đổi chưa lưu
 * - read: chụp trạng thái hiện tại để so với mốc đã lưu (baseline)
 * - submit: lưu form, trả về Promise khi lưu xong
 * - undo: bỏ thay đổi, trả form về dữ liệu đã lưu
 */
const GUARDED_FORMS = [
  {
    formId: 'form-account-info',
    sectionId: 'section-account',
    saveBtnId: 'btn-save-account',
    name: 'Thông tin tài khoản',
    barLabel: 'Có thay đổi chưa lưu',
    baseline: null,
    read: () => {
      const form = document.getElementById('form-account-info');
      if (!form) return '';
      const values = [...form.querySelectorAll('input, select, textarea')]
        .filter(el => el.id && !(el.type === 'date' && el.hidden))
        .map(el => [el.id, el.type === 'checkbox' ? el.checked : el.value]);
      return JSON.stringify(values);
    },
    submit: async () => {
      accountSubmitPromise = null;
      document.getElementById('form-account-info')?.requestSubmit();
      if (accountSubmitPromise) await accountSubmitPromise;
    },
    undo: () => {
      const form = document.getElementById('form-account-info');
      if (!form) return;
      form.querySelectorAll('.pcb-form__error').forEach(el => { el.textContent = ''; });
      form.querySelectorAll('.pcb-input--error').forEach(el => el.classList.remove('pcb-input--error'));
      const birthInput = document.getElementById('input-birthdate');
      if (birthInput) birthInput.hidden = true;
      const birthHint = document.getElementById('birthdate-hint');
      if (birthHint) birthHint.hidden = true;
      syncUserInfoUI({ force: true });
    }
  },
  {
    formId: 'form-change-password',
    sectionId: 'section-security',
    saveBtnId: 'btn-save-password',
    name: 'Đổi mật khẩu',
    barLabel: 'Mật khẩu mới chưa lưu',
    // Form đổi mật khẩu luôn bắt đầu trống: có ký tự trong bất kỳ ô nào là có thay đổi
    baseline: '',
    read: () => {
      const form = document.getElementById('form-change-password');
      return form && [...form.querySelectorAll('input')].some(el => el.value) ? 'dirty' : '';
    },
    submit: async () => {
      document.getElementById('form-change-password')?.requestSubmit();
      await new Promise(resolve => setTimeout(resolve, 0));
    },
    undo: () => document.getElementById('form-change-password')?.reset()
  },
  {
    formId: 'form-privacy',
    sectionId: 'section-security',
    saveBtnId: 'btn-save-privacy',
    name: 'Quyền riêng tư hồ sơ công khai',
    barLabel: 'Quyền riêng tư chưa lưu',
    baseline: null,
    read: () => {
      const form = document.getElementById('form-privacy');
      if (!form) return '';
      return JSON.stringify([...form.querySelectorAll('.pcb-switch__input')].map(el => [el.name, el.checked]));
    },
    submit: async () => {
      document.getElementById('form-privacy')?.requestSubmit();
      await new Promise(resolve => setTimeout(resolve, 0));
    },
    undo: () => fillPrivacyForm(getCurrentUser())
  }
];

// Trạng thái thanh lưu nổi: nút lưu nào đang nằm trong màn hình, form nào vừa được sửa gần nhất
const savebarState = { saveVisible: {}, lastEditedId: null };

// Promise của lần lưu form tài khoản gần nhất (null nếu chưa lưu lần nào)
let accountSubmitPromise = null;

/** Tìm cấu hình form theo id */
const getGuardedForm = formId => GUARDED_FORMS.find(f => f.formId === formId);

/**
 * Form có thay đổi chưa lưu không
 * @param {string} formId
 * @returns {boolean}
 */
function isFormDirty(formId) {
  const entry = getGuardedForm(formId);
  if (!entry || entry.baseline === null) return false;
  return entry.read() !== entry.baseline;
}

/**
 * Ghi mốc "đã lưu" cho form (sau khi nạp dữ liệu hoặc lưu thành công)
 * @param {string} formId
 */
function markFormSaved(formId) {
  const entry = getGuardedForm(formId);
  if (!entry) return;
  entry.baseline = entry.read();
  updateSavebar();
}

/** Giữ tên hàm cũ cho form tài khoản */
function markAccountFormSaved() {
  markFormSaved('form-account-info');
}

/** Mục đang hiển thị trong trang Hồ sơ */
const getVisibleSection = () => document.querySelector('.pcb-profile .pcb-section:not([hidden])');

/**
 * Các form còn thay đổi chưa lưu trong một mục (hoặc mọi mục nếu không truyền)
 * @param {string} [sectionId]
 * @returns {Array<Object>}
 */
function getDirtyForms(sectionId) {
  return GUARDED_FORMS.filter(f => (!sectionId || f.sectionId === sectionId) && isFormDirty(f.formId));
}

/** Giao diện điện thoại / máy tính bảng cảm ứng */
const isTouchLayout = () => window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;

/**
 * Form mà thanh lưu nổi đang phục vụ: ưu tiên form vừa sửa gần nhất trong mục đang mở
 * @returns {Object|null}
 */
function getSavebarTarget() {
  const section = getVisibleSection();
  if (!section) return null;
  const dirty = getDirtyForms(section.id);
  if (!dirty.length) return null;
  return dirty.find(f => f.formId === savebarState.lastEditedId) || dirty[0];
}

/**
 * Đẩy thanh lưu nổi lên sát phía trên bàn phím ảo (iOS không tự thu nhỏ vùng hiển thị khi mở bàn phím)
 */
function positionSavebar() {
  const bar = document.getElementById('account-savebar');
  if (!bar) return;
  const vv = window.visualViewport;
  const keyboard = vv && isTouchLayout() ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  bar.style.setProperty('--pcb-savebar-keyboard', `${Math.round(keyboard)}px`);
}

/**
 * Ô đang nhập bị thanh lưu nổi che: cuộn trang lên một chút
 */
function keepFocusedFieldVisible() {
  const bar = document.getElementById('account-savebar');
  const field = document.activeElement;
  if (!bar || bar.hidden || !field || !field.closest('.pcb-form')) return;
  const barTop = bar.getBoundingClientRect().top;
  const fieldBottom = field.getBoundingClientRect().bottom;
  if (fieldBottom > barTop - 8) window.scrollBy({ top: fieldBottom - barTop + 16, behavior: 'smooth' });
}

/**
 * Hiện / ẩn thanh lưu nổi theo trạng thái hiện tại
 */
function updateSavebar() {
  const bar = document.getElementById('account-savebar');
  if (!bar) return;
  const target = getSavebarTarget();
  // Điện thoại: hiện ngay khi có thay đổi; máy tính: chỉ khi nút lưu của form đang khuất
  const show = Boolean(target) && (isTouchLayout() || savebarState.saveVisible[target.formId] === false);
  if (target) {
    bar.dataset.form = target.formId;
    const label = bar.querySelector('.pcb-savebar__label');
    if (label) label.textContent = target.barLabel;
  }
  if (show === !bar.hidden) return;
  if (show) {
    positionSavebar();
    bar.hidden = false;
    // Đợi một khung hình để hiệu ứng trượt lên chạy được, rồi kiểm tra ô đang nhập có bị che không
    requestAnimationFrame(() => {
      bar.classList.add('pcb-savebar--visible');
      setTimeout(keepFocusedFieldVisible, 220);
    });
  } else {
    bar.classList.remove('pcb-savebar--visible');
    bar.hidden = true;
  }
}

/** Giữ tên hàm cũ */
function updateAccountSavebar() {
  updateSavebar();
}

/**
 * Hỏi người dùng muốn lưu các thay đổi trước khi rời đi không
 * @param {Array<Object>} dirtyForms - Các form còn thay đổi chưa lưu
 * @returns {Promise<boolean>} true nếu được phép rời đi (đã lưu thành công hoặc chọn không lưu)
 */
async function confirmLeaveDirtyForms(dirtyForms) {
  const names = dirtyForms.map(f => f.name).join(', ');
  const choice = await showChoice({
    title: 'Lưu thay đổi trước khi rời đi?',
    message: `Bạn có thay đổi chưa được lưu trong: ${names}.`,
    confirmText: 'Lưu thay đổi',
    extraText: 'Không lưu',
    cancelText: 'Ở lại'
  });
  if (choice === 'cancel') return false;
  if (choice === 'extra') {
    dirtyForms.forEach(f => f.undo());
    updateSavebar();
    return true;
  }
  for (const f of dirtyForms) {
    await f.submit();
    // Lưu không thành công (lỗi nhập liệu / người dùng hủy xác nhận): ở lại để sửa
    if (isFormDirty(f.formId)) return false;
  }
  return true;
}

/**
 * Chặn rời trang khi các form cài đặt còn thay đổi chưa lưu:
 * - Bấm liên kết sang trang khác / chuyển mục trong Hồ sơ: hộp thoại của web (Lưu / Không lưu / Ở lại)
 * - Tải lại hoặc đóng tab: trình duyệt chỉ cho phép hiện hộp thoại xác nhận mặc định của nó
 */
function initAccountLeaveGuard() {
  let bypass = false;

  window.addEventListener('beforeunload', e => {
    if (bypass || !getDirtyForms().length) return;
    e.preventDefault();
    e.returnValue = '';
  });

  document.addEventListener('click', async e => {
    if (bypass) return;
    const section = getVisibleSection();
    if (!section) return;
    const dirtyForms = getDirtyForms(section.id);
    if (!dirtyForms.length) return;
    const link = e.target.closest('a[href]');
    const navBtn = e.target.closest('[data-section]');
    const href = link?.getAttribute('href') || '';
    const leavingByLink = link && !section.contains(link) && link.target !== '_blank'
      && !link.hasAttribute('download') && href !== '#' && !href.startsWith('javascript')
      && !href.startsWith('tel:') && !href.startsWith('mailto:');
    const leavingBySection = navBtn && navBtn.dataset.section !== section.id;
    if (!leavingByLink && !leavingBySection) return;
    // Chặn điều hướng cho tới khi người dùng chọn
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!(await confirmLeaveDirtyForms(dirtyForms))) return;
    bypass = true;
    if (leavingByLink) {
      window.location.href = link.href;
    } else {
      navBtn.click();
    }
    setTimeout(() => { bypass = false; }, 0);
  }, true);
}

/**
 * Gắn các sự kiện cho thanh lưu nổi (gọi một lần khi tải trang)
 */
function initAccountSavebar() {
  const bar = document.getElementById('account-savebar');
  if (!bar) return;

  GUARDED_FORMS.forEach(entry => {
    const form = document.getElementById(entry.formId);
    if (!form) return;
    if (entry.baseline === null) entry.baseline = entry.read();
    // Mỗi lần người dùng sửa một ô: so với mốc đã lưu
    const onEdit = () => {
      savebarState.lastEditedId = entry.formId;
      updateSavebar();
    };
    form.addEventListener('input', onEdit);
    form.addEventListener('change', onEdit);
    form.addEventListener('reset', () => setTimeout(updateSavebar, 0));

    // Nút lưu thật đang nằm trong màn hình thì máy tính không cần thanh nổi
    const realSave = document.getElementById(entry.saveBtnId);
    if (realSave && 'IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        savebarState.saveVisible[entry.formId] = entries[0].isIntersecting;
        updateSavebar();
      }, { threshold: 0.6 }).observe(realSave);
    }
  });

  // Nút Lưu / Hoàn tác trên thanh nổi áp dụng cho form đang được phục vụ
  document.getElementById('account-savebar-save')?.addEventListener('click', async () => {
    const entry = getGuardedForm(bar.dataset.form);
    if (!entry) return;
    await entry.submit();
    updateSavebar();
  });
  document.getElementById('account-savebar-undo')?.addEventListener('click', () => {
    const entry = getGuardedForm(bar.dataset.form);
    if (!entry) return;
    entry.undo();
    updateSavebar();
    showToast('Đã hoàn tác các thay đổi chưa lưu.');
  });
  // Bấm nút trên thanh nổi không làm ô đang nhập mất focus (bàn phím không bị đóng giữa chừng)
  bar.addEventListener('pointerdown', e => {
    if (e.target.closest('#account-savebar-undo')) e.preventDefault();
  });

  // Bàn phím ảo mở / đóng, xoay màn hình: đặt lại vị trí thanh nổi và giữ ô đang nhập trong tầm nhìn
  if (window.visualViewport) {
    const onViewport = () => {
      positionSavebar();
      if (!bar.hidden) keepFocusedFieldVisible();
    };
    window.visualViewport.addEventListener('resize', onViewport);
    window.visualViewport.addEventListener('scroll', positionSavebar);
  }
  document.addEventListener('focusin', () => {
    if (!bar.hidden) setTimeout(keepFocusedFieldVisible, 300);
  });
  window.matchMedia('(max-width: 720px), (pointer: coarse)').addEventListener('change', updateSavebar);

  // Chuyển sang mục khác trong trang Hồ sơ: cập nhật thanh nổi theo mục mới
  window.addEventListener('hashchange', () => setTimeout(updateSavebar, 0));
  document.querySelectorAll('[data-section]').forEach(btn => btn.addEventListener('click', () => setTimeout(updateSavebar, 0)));
}

/**
 * Đổ cài đặt quyền riêng tư đã lưu vào form
 * @param {Object} user
 */
function fillPrivacyForm(user) {
  const privacyForm = document.getElementById('form-privacy');
  if (!privacyForm || !user) return;
  const privacy = getPrivacy(user);
  privacyForm.querySelectorAll('.pcb-switch__input').forEach(input => {
    input.checked = Boolean(privacy[input.name]);
    updateSwitchText(input);
  });
  markFormSaved('form-privacy');
}

/**
 * Đồng bộ thông tin tài khoản lên thẻ bên trái và các form cài đặt
 * @param {{force?: boolean}} [options] - force: đổ lại form tài khoản kể cả khi đang có thay đổi chưa lưu
 */
function syncUserInfoUI(options = {}) {
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

  // Nút luồng làm việc của đội ngũ PCBid trên công tắc giao dịch: Kiểm định viên / Quản trị viên
  const adminTradeBtn = document.getElementById('trade-btn-admin');
  if (adminTradeBtn) {
    const staffRole = getStaffRole(user);
    adminTradeBtn.hidden = !staffRole;
    const label = document.getElementById('trade-btn-admin-label');
    if (label) label.textContent = staffRole === 'admin' ? 'Quản trị (Admin)' : 'Kiểm duyệt';
    const iconEl = document.getElementById('trade-btn-admin-icon');
    if (iconEl) {
      iconEl.classList.toggle('pcb-icon--shield-check', staffRole === 'admin');
      iconEl.classList.toggle('pcb-icon--microscope', staffRole !== 'admin');
    }
  }

  // Form tài khoản: chỉ đổ lại dữ liệu khi người dùng chưa sửa dở (tránh bot đặt giá / cập nhật ví
  // làm mất phần đang nhập); Hoàn tác và Lưu thành công thì luôn đổ lại
  if (options.force || !isFormDirty('form-account-info')) {
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
    // Tên đăng nhập: tài khoản demo chỉ xem, không đổi được (dữ liệu mẫu gắn với tên này)
    const usernameInput = document.getElementById('input-username');
    if (usernameInput) {
      const laDemo = isDemoAccount(user);
      usernameInput.value = user.username || '';
      usernameInput.readOnly = laDemo;
      usernameInput.classList.toggle('pcb-input--readonly', laDemo);
      const lockEl = document.getElementById('username-lock');
      if (lockEl) lockEl.hidden = !laDemo;
      const hintEl = document.getElementById('hint-input-username');
      if (hintEl) {
        hintEl.textContent = laDemo
          ? 'Tài khoản demo dùng tên đăng nhập cố định để giữ dữ liệu mẫu. Bạn vẫn đăng nhập được bằng tên này hoặc email.'
          : 'Dùng để đăng nhập thay cho email và hiển thị trong đường dẫn hồ sơ công khai. 3 - 20 ký tự: chữ thường không dấu, số, dấu chấm hoặc gạch dưới.';
      }
    }
    if (smsInput) smsInput.checked = user.pref_sms !== false;
    if (mailInput) mailInput.checked = user.pref_email !== false;
    if (lastUpdateEl) lastUpdateEl.textContent = user.lastUpdated || 'Hôm nay';
    // Giới tính, tiểu sử, ngày sinh
    const genderInput = document.getElementById('input-gender');
    const bioInput = document.getElementById('input-bio');
    if (genderInput) genderInput.value = user.gender || '';
    if (bioInput) bioInput.value = user.bio || '';
    renderBirthDate(user);
    // Ghi lại trạng thái form vừa đổ dữ liệu làm mốc so sánh cho thanh lưu nổi
    markAccountFormSaved();
  }

  // Quyền riêng tư hồ sơ công khai: không ghi đè khi người dùng đang đổi dở công tắc
  if (options.force || !isFormDirty('form-privacy')) fillPrivacyForm(user);
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

  // Bộ đếm của đội ngũ PCBid: bài chờ duyệt (không tính bài đang chờ người bán bổ sung) và báo cáo chờ xử lý
  const reviewWaiting = getReviewQueue().filter(p => !needsMoreInfo(p)).length;
  const openReports = getOpenReportCount();
  const countAdminEl = document.getElementById('count-admin-approvals');
  const countReportsEl = document.getElementById('count-admin-reports');
  const badgeAdminEl = document.getElementById('trade-badge-admin');
  if (countAdminEl) countAdminEl.textContent = reviewWaiting;
  if (countReportsEl) countReportsEl.textContent = openReports;
  const countManageEl = document.getElementById('count-admin-manage');
  if (countManageEl) countManageEl.textContent = getHiddenListingCount();
  // Linh kiện đang trên đường tới chi nhánh (cần xác nhận nhận hàng) và tài khoản bị báo cáo chưa xử lý
  const inTransit = getShipmentQueue().filter(p => p.shipment?.status === 'in_transit').length;
  const countShipEl = document.getElementById('count-admin-shipments');
  if (countShipEl) countShipEl.textContent = inTransit;
  const countAccEl = document.getElementById('count-admin-accounts');
  if (countAccEl) countAccEl.textContent = new Set(getReports().filter(r => r.type === 'user' && r.status === 'open').map(r => r.targetId)).size;
  if (badgeAdminEl) {
    const waitingTotal = reviewWaiting + openReports + getShipmentQueue().filter(p => p.shipment?.status === 'in_transit').length;
    badgeAdminEl.textContent = waitingTotal;
    badgeAdminEl.hidden = waitingTotal === 0;
  }

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
      { id: 'review', icon: 'shield-check', label: 'Chờ duyệt' },
      { id: 'ship', icon: 'truck', label: 'Chờ gửi hàng' },
      { id: 'active', icon: 'clock', label: 'Đang diễn ra' },
      { id: 'sold', icon: 'circle-check', label: 'Đã bán thành công' },
      { id: 'ended', icon: 'circle-x', label: 'Đã kết thúc' }
    ];
  } else if (currentActiveTab === 'admin-approvals') {
    chips = [
      { id: 'all', label: 'Tất cả' },
      { id: 'pending', icon: 'clipboard-check', label: 'Chờ duyệt' },
      { id: 'info', icon: 'message-square', label: 'Chờ người bán bổ sung' }
    ];
  } else if (currentActiveTab === 'admin-shipments') {
    chips = [
      { id: 'all', label: 'Tất cả' },
      { id: 'in_transit', icon: 'truck', label: 'Đang chuyển tới' },
      { id: 'awaiting_dropoff', icon: 'clock', label: 'Người bán chưa gửi' }
    ];
  } else if (currentActiveTab === 'admin-accounts') {
    chips = [
      { id: 'all', label: 'Tất cả' },
      { id: 'reported', icon: 'flag', label: 'Bị báo cáo' },
      { id: 'warned', icon: 'triangle-alert', label: 'Đã cảnh báo' },
      { id: 'deleted', icon: 'trash-2', label: 'Đã xóa' }
    ];
  } else if (currentActiveTab === 'admin-manage') {
    chips = [
      { id: 'all', label: 'Tất cả' },
      { id: 'visible', icon: 'eye', label: 'Đang hiển thị' },
      { id: 'hidden', icon: 'eye-off', label: 'Đang ẩn' },
      { id: 'removed', icon: 'trash-2', label: 'Đã gỡ' }
    ];
  } else if (currentActiveTab === 'admin-reports') {
    chips = [
      { id: 'all', label: 'Tất cả' },
      { id: 'open', icon: 'bell', label: 'Chờ xử lý' },
      { id: 'closed', icon: 'circle-check', label: 'Đã đóng' }
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
      const matchChip = currentFilterChip === 'all'
        || (currentFilterChip === 'review' ? isAwaitingReview(item)
          : currentFilterChip === 'ship' ? isAwaitingShipment(item) : item.status === currentFilterChip);
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
  } else if (currentActiveTab === 'admin-approvals') {
    const filtered = getReviewQueue().filter(item => {
      const matchKw = !kw || item.name.toLowerCase().includes(kw) || (item.category && item.category.toLowerCase().includes(kw))
        || String(item.seller || '').toLowerCase().includes(kw);
      const matchChip = currentFilterChip === 'all'
        || (currentFilterChip === 'info' ? needsMoreInfo(item) : !needsMoreInfo(item));
      return matchKw && matchChip;
    });
    const grid = document.getElementById('grid-admin-approvals');
    const empty = document.getElementById('empty-admin-approvals');
    if (grid && empty) {
      grid.innerHTML = filtered.map(renderAdminApprovalCard).join('');
      grid.hidden = !filtered.length;
      empty.hidden = Boolean(filtered.length);
    }
  } else if (currentActiveTab === 'admin-shipments') {
    const filtered = getShipmentQueue().filter(p => {
      const matchKw = !kw || `${p.name} ${p.seller} ${p.shipment?.trackingCode || ''}`.toLowerCase().includes(kw);
      return matchKw && (currentFilterChip === 'all' || p.shipment?.status === currentFilterChip);
    });
    const grid = document.getElementById('grid-admin-shipments');
    const empty = document.getElementById('empty-admin-shipments');
    if (grid && empty) {
      grid.innerHTML = filtered.map(renderShipmentRow).join('');
      grid.hidden = !filtered.length;
      empty.hidden = Boolean(filtered.length);
    }
  } else if (currentActiveTab === 'admin-accounts') {
    const filtered = getManagedAccounts().filter(acc => {
      const matchKw = !kw || `${acc.fullname} ${acc.username} ${acc.email}`.toLowerCase().includes(kw);
      const chip = currentFilterChip;
      const matchChip = chip === 'all'
        || (chip === 'reported' && acc.openReports > 0)
        || (chip === 'warned' && acc.warnings.length > 0)
        || (chip === 'deleted' && acc.deletion);
      return matchKw && matchChip;
    });
    const grid = document.getElementById('grid-admin-accounts');
    const empty = document.getElementById('empty-admin-accounts');
    if (grid && empty) {
      grid.innerHTML = filtered.map(renderAccountRow).join('');
      grid.hidden = !filtered.length;
      empty.hidden = Boolean(filtered.length);
    }
  } else if (currentActiveTab === 'admin-manage') {
    renderManageTab(kw);
  } else if (currentActiveTab === 'admin-reports') {
    const filtered = getReports().filter(r => {
      const matchKw = !kw || `${r.targetName} ${r.reason} ${r.detail} ${r.reporter?.name || ''}`.toLowerCase().includes(kw);
      const matchChip = currentFilterChip === 'all'
        || (currentFilterChip === 'open' ? r.status === 'open' : r.status !== 'open');
      return matchKw && matchChip;
    });
    const grid = document.getElementById('grid-admin-reports');
    const empty = document.getElementById('empty-admin-reports');
    if (grid && empty) {
      grid.innerHTML = filtered.map(renderReportRow).join('');
      grid.hidden = !filtered.length;
      empty.hidden = Boolean(filtered.length);
    }
  }

  updateCounters();
}


/**
 * Vẽ tab Quản lý phiên: mọi phiên đã lên sàn (danh mục có sẵn + người dùng tự đăng), kể cả phiên đã ẩn / gỡ
 * @param {string} kw - Từ khóa tìm kiếm (chữ thường)
 */
async function renderManageTab(kw) {
  const grid = document.getElementById('grid-admin-manage');
  const empty = document.getElementById('empty-admin-manage');
  if (!grid || !empty) return;
  const products = await loadAllAuctions();
  // Người dùng đã chuyển sang tab khác trong lúc chờ tải dữ liệu
  if (currentActiveTab !== 'admin-manage') return;
  const rows = products
    .filter(p => !isAwaitingReview(p) && !isRejected(p))
    .filter(p => !kw || `${p.name} ${p.category} ${p.seller}`.toLowerCase().includes(kw))
    .filter(p => currentFilterChip === 'all' || getManageState(p).key === currentFilterChip)
    // Phiên bị ẩn / gỡ và phiên có báo cáo lên đầu để Quản trị viên xử lý trước
    .sort((a, b) => {
      const rank = p => {
        const key = getManageState(p).key;
        return key === 'hidden' ? 0 : key === 'removed' ? 2 : 1;
      };
      return rank(a) - rank(b);
    });
  grid.innerHTML = rows.slice(0, 60).map(renderManageRow).join('');
  grid.hidden = !rows.length;
  empty.hidden = Boolean(rows.length);
}

/**
 * Gắn xử lý cho các nút trong tab Duyệt bài, Quản lý phiên, Báo cáo và nút "Gửi bổ sung" của người bán
 * (dùng event delegation vì danh sách được vẽ lại liên tục)
 */
function initStaffActions() {
  const refresh = () => {
    renderCurrentAuctionTab();
    updateCounters();
  };
  const findProduct = id => {
    try {
      return JSON.parse(localStorage.getItem('pcbid_products') || '[]').find(p => Number(p.id) === Number(id)) || liveProductMap.get(Number(id)) || null;
    } catch {
      return liveProductMap.get(Number(id)) || null;
    }
  };

  document.getElementById('grid-admin-approvals')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-review-action]');
    const staff = getCurrentUser();
    if (!btn || !isStaff(staff)) return;
    const product = findProduct(btn.dataset.reviewId);
    if (!product) return;
    const actions = { approve: confirmApprove, info: promptRequestInfo, reject: promptReject };
    if (await actions[btn.dataset.reviewAction]?.(product, staff)) refresh();
  });

  document.getElementById('grid-admin-manage')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-manage-action]');
    const staff = getCurrentUser();
    if (!btn || !isAdmin(staff)) return;
    const products = await loadAllAuctions();
    const product = products.find(p => Number(p.id) === Number(btn.dataset.manageId));
    if (!product) return;
    const action = btn.dataset.manageAction;
    const done = action === 'hide' ? await promptHide(product, staff)
      : action === 'unhide' ? await confirmUnhide(product)
        : await promptRemove(product, staff);
    if (done) refresh();
  });

  document.getElementById('grid-admin-reports')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-report-action]');
    const staff = getCurrentUser();
    if (!btn || !isStaff(staff)) return;
    const report = getReports().find(r => r.id === btn.dataset.reportId);
    if (!report) return;
    const action = btn.dataset.reportAction;
    if (action === 'hide') {
      const products = await loadAllAuctions();
      const product = products.find(p => String(p.id) === String(report.targetId));
      if (product && await promptHide(product, staff)) refresh();
      return;
    }
    if (await promptResolveReport(report, action, staff)) refresh();
  });

  // Nhân viên chi nhánh xác nhận đã nhận linh kiện
  document.getElementById('grid-admin-shipments')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-ship-received]');
    const staff = getCurrentUser();
    if (!btn || !isStaff(staff)) return;
    const product = findProduct(btn.dataset.shipReceived);
    if (product && await confirmReceived(product, staff)) refresh();
  });

  // Cảnh báo / xóa / khôi phục tài khoản (tab Tài khoản và báo cáo tài khoản)
  const handleAccountAction = async e => {
    const btn = e.target.closest('[data-account-action]');
    const staff = getCurrentUser();
    if (!btn || !isAdmin(staff)) return false;
    const username = btn.dataset.account;
    const account = findAccount({ username }) || { username, fullname: username };
    const action = btn.dataset.accountAction;
    const done = action === 'warn' ? await promptWarnUser(account, staff)
      : action === 'delete' ? await promptDeleteUser(account, staff)
        : await confirmRestoreUser(account);
    if (done) refresh();
    return true;
  };
  document.getElementById('grid-admin-accounts')?.addEventListener('click', handleAccountAction);
  document.getElementById('grid-admin-reports')?.addEventListener('click', handleAccountAction);

  // Người bán: gửi bổ sung, gửi hàng tới chi nhánh kiểm định, tra cứu chi nhánh, giả lập chi nhánh nhận hàng
  document.getElementById('grid-selling')?.addEventListener('click', async e => {
    const seller = getCurrentUser();
    const replyBtn = e.target.closest('[data-seller-reply]');
    const shipBtn = e.target.closest('[data-ship-to-branch]');
    const demoBtn = e.target.closest('[data-branch-received-demo]');
    if (e.target.closest('[data-browse-branches]')) {
      openBranchFinder({ mode: 'browse', defaultAddress: seller?.address || '' });
      return;
    }
    const btn = replyBtn || shipBtn || demoBtn;
    if (!btn) return;
    const product = findProduct(btn.dataset.sellerReply || btn.dataset.shipToBranch || btn.dataset.branchReceivedDemo);
    if (!product) return;
    const done = replyBtn ? await promptSellerReply(product, seller)
      : shipBtn ? await promptShipToBranch(product, seller)
        : await confirmReceived(product, null);
    if (done) refresh();
  });
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
  } else if (hash === '#admin-approvals' || hash === '#admin' || hash === '#review') {
    switchSection('section-auctions');
    switchAuctionTab('admin-approvals');
  } else if (hash === '#admin-manage') {
    switchSection('section-auctions');
    switchAuctionTab('admin-manage');
  } else if (hash === '#admin-shipments') {
    switchSection('section-auctions');
    switchAuctionTab('admin-shipments');
  } else if (hash === '#admin-accounts' || hash === '#accounts') {
    switchSection('section-auctions');
    switchAuctionTab('admin-accounts');
  } else if (hash === '#admin-reports' || hash === '#reports') {
    switchSection('section-auctions');
    switchAuctionTab('admin-reports');
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
 * @param {boolean} [partial] - Đang gõ dở: chưa báo các lỗi kiểu "còn thiếu"
 * @returns {string} Thông báo lỗi, rỗng nếu hợp lệ
 */
function validateContactField(field, value, partial = false) {
  const user = getCurrentUser();
  if (field === 'email') {
    const formatError = validateEmailAddress(value, { partial });
    if (formatError) return formatError;
    // Chỉ kiểm tra trùng khi email đã đúng định dạng đầy đủ
    if (validateEmailAddress(value)) return '';
    if (findAccountConflict({ email: value, exclude: user })) return 'Địa chỉ email này đã được sử dụng bởi tài khoản khác.';
    return '';
  }
  const formatError = validatePhoneNumber(value, { partial });
  if (formatError) return formatError;
  if (validatePhoneNumber(value)) return '';
  if (findAccountConflict({ phone: normalizePhone(value), exclude: user })) return 'Số điện thoại này đã được sử dụng bởi tài khoản khác.';
  return '';
}

/**
 * Hiện / xóa dòng lỗi dưới ô email hoặc số điện thoại
 * @param {'email'|'phone'} field
 * @returns {boolean} true nếu hợp lệ
 */
function showContactFieldError(field, partial = false) {
  const input = document.getElementById(`input-${field}`);
  const errEl = document.getElementById(`err-input-${field}`);
  if (!input) return true;
  const value = input.value.trim();
  const message = validateContactField(field, value, partial);
  if (errEl) errEl.textContent = message;
  // Đang gõ dở mà chưa đủ để kết luận thì ẩn dấu tick / X bên phải ô
  const complete = !partial || !validateContactField(field, value);
  setContactCheck(field, !message, Boolean(message) || complete);
  input.classList.toggle('pcb-input--error', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
  if (message) input.setAttribute('aria-describedby', `err-input-${field}`);
  else input.removeAttribute('aria-describedby');
  return !message;
}

/**
 * Đổi dấu bên phải ô: tick xanh khi hợp lệ, X đỏ khi không hợp lệ / đã bị dùng
 * @param {'email'|'phone'} field
 * @param {boolean} valid
 * @param {boolean} [visible=true] - false khi đang gõ dở, chưa kết luận được
 */
function setContactCheck(field, valid, visible = true) {
  const check = document.getElementById(`check-input-${field}`);
  if (!check) return;
  check.classList.toggle('pcb-verified-check--pending', !visible);
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
// Thời gian chờ sau lần gõ phím cuối trước khi kiểm tra trực tiếp (ms)
const LIVE_VALIDATE_DELAY = 250;

function setupContactFieldValidation() {
  // Gõ lại họ đệm / tên thì xóa dòng lỗi tương ứng
  ['lastname', 'givenname'].forEach(key => {
    document.getElementById(`input-${key}`)?.addEventListener('input', e => {
      const errEl = document.getElementById(`err-input-${key}`);
      if (errEl) errEl.textContent = '';
      e.target.classList.remove('pcb-input--error');
    });
  });
  // Email / số điện thoại: kiểm tra trực tiếp trong lúc gõ (báo ngay sai đầu số, ký tự lạ...),
  // rời khỏi ô thì kiểm tra đầy đủ (kể cả thiếu số, thiếu tên miền)
  ['email', 'phone'].forEach(field => {
    const input = document.getElementById(`input-${field}`);
    if (!input) return;
    let timer = 0;
    input.addEventListener('blur', () => {
      clearTimeout(timer);
      showContactFieldError(field);
    });
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => showContactFieldError(field, true), LIVE_VALIDATE_DELAY);
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

  // Thẻ vai trò nổi bật cạnh tên với tài khoản Quản trị viên / Kiểm định viên
  const staffRole = getStaffRole(account);
  if (nameEl && staffRole && !nameEl.querySelector('.pcb-role-badge')) {
    nameEl.insertAdjacentHTML('beforeend', ` <span class="pcb-role-badge pcb-role-badge--${staffRole}">${icon('shield-check', { size: 12 })}${ROLE_LABELS[staffRole]}</span>`);
  }

  // Nút báo cáo tài khoản: ẩn với chính mình và với tài khoản của đội ngũ PCBid
  const reportBtn = document.getElementById('public-report-btn');
  if (reportBtn) reportBtn.hidden = isSelf || Boolean(staffRole) || isStaff(viewer);
  if (reportBtn && !reportBtn.dataset.bound) {
    reportBtn.dataset.bound = '1';
    reportBtn.addEventListener('click', () => {
      openReportDialog({ type: 'user', targetId: username, targetName: account.fullname || username }, viewer && viewer.isLoggedIn !== false ? viewer : null);
    });
  }

  // Tài khoản đã bị Quản trị viên xóa: hiện thông báo, không nhắn tin / báo cáo được nữa
  const deletion = getAccountDeletion(username);
  const headEl = document.querySelector('.pcb-public__head');
  document.querySelector('.pcb-public__deleted')?.remove();
  if (deletion && headEl) {
    headEl.insertAdjacentHTML('afterend', `<p class="pcb-public__deleted">${icon('user-x', { size: 16 })}<span>Tài khoản này đã bị Quản trị viên PCBid xóa do vi phạm quy chế hoạt động của sàn.${isAdmin(viewer) ? ` Lý do: ${escapeHtml(deletion.reason)}` : ''}</span></p>`);
    if (reportBtn) reportBtn.hidden = true;
  }

  // Quản trị viên: cảnh báo / xóa / khôi phục tài khoản ngay trên hồ sơ công khai
  const actionsEl = document.querySelector('.pcb-public__actions');
  actionsEl?.querySelector('.pcb-public__admin-actions')?.remove();
  if (actionsEl && isAdmin(viewer) && !isSelf && !staffRole && findAccount({ username })) {
    const warnCount = getWarnings(username).length;
    actionsEl.insertAdjacentHTML('beforeend', `
      <div class="pcb-public__admin-actions">
        ${deletion
          ? `<button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--ok" data-account-action="restore" data-account="${escapeHtml(username)}">${icon('circle-check', { size: 14 })} Khôi phục tài khoản</button>`
          : `<button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--warn" data-account-action="warn" data-account="${escapeHtml(username)}">${icon('triangle-alert', { size: 14 })} Cảnh báo${warnCount ? ` (${warnCount})` : ''}</button>
             <button type="button" class="pcb-staff-row__btn pcb-staff-row__btn--danger" data-account-action="delete" data-account="${escapeHtml(username)}">${icon('trash-2', { size: 14 })} Xóa tài khoản</button>`}
      </div>`);
    actionsEl.querySelector('.pcb-public__admin-actions').addEventListener('click', async e => {
      const btn = e.target.closest('[data-account-action]');
      if (!btn) return;
      const action = btn.dataset.accountAction;
      const done = action === 'warn' ? await promptWarnUser(account, viewer)
        : action === 'delete' ? await promptDeleteUser(account, viewer)
          : await confirmRestoreUser(account);
      if (done) renderPublicProfile(username);
    });
  }

  // Nút nhắn tin: ẩn khi xem hồ sơ của chính mình; chưa đăng nhập thì mời đăng nhập
  const chatBtn = document.getElementById('public-chat-btn');
  if (chatBtn) chatBtn.hidden = isSelf || Boolean(deletion);
  if (chatBtn && !chatBtn.dataset.bound) {
    chatBtn.dataset.bound = '1';
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
  // Chỉ hiện phiên đã được duyệt và không bị Quản trị viên ẩn / gỡ
  const selling = products.filter(p => p.seller === username && isPubliclyListed(p) && isListingVisible(p));
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
  const viewer = getCurrentUser();
  if (TAB_GROUP[tabName] === 'admin' && !isStaff(viewer)) tabName = 'participating';
  if ((tabName === 'admin-manage' || tabName === 'admin-accounts') && !isAdmin(viewer)) tabName = 'admin-approvals';
  currentActiveTab = tabName;
  currentFilterChip = 'all';

  // Chỉ hiện các tab thuộc luồng đang chọn (Mua hàng hoặc Bán hàng)
  const group = TAB_GROUP[tabName];
  document.querySelectorAll('.pcb-tab[data-group]').forEach(tab => {
    tab.hidden = tab.dataset.group !== group || (tab.hasAttribute('data-admin-only') && !isAdmin(viewer));
  });
  document.querySelectorAll('.pcb-trade-switch__btn').forEach(btn => {
    const active = btn.dataset.tradeMode === group;
    btn.classList.toggle('pcb-trade-switch__btn--active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  const titleEl = document.getElementById('trade-title');
  const subtitleEl = document.getElementById('trade-subtitle');
  if (titleEl) {
    titleEl.textContent = group === 'admin'
      ? `Quản lý đấu giá · ${getRoleLabel(viewer) || 'Đội ngũ PCBid'}`
      : group === 'sell'
        ? 'Quản lý đấu giá · Bán hàng'
        : 'Quản lý đấu giá · Mua hàng';
  }
  if (subtitleEl) {
    subtitleEl.textContent = group === 'admin'
      ? (isAdmin(viewer)
        ? 'Duyệt bài đăng, quản lý các phiên trên sàn (ẩn, gỡ bài vi phạm) và xử lý báo cáo của người dùng.'
        : 'Xét duyệt bài đăng mới, yêu cầu người bán bổ sung thông tin và xử lý báo cáo của người dùng.')
      : group === 'sell'
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
    const isTarget = pane.id === `tab-content-${tabName}`;
    pane.classList.toggle('pcb-tab-pane--active', isTarget);
    if (isTarget) {
      pane.hidden = false;
      pane.removeAttribute('hidden');
    }
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
        textEl.textContent = formatTimeRemaining(ts, Number(el.getAttribute('data-start')) || 0);
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

  // Thao tác của đội ngũ PCBid (duyệt bài, quản lý phiên, báo cáo) và người bán gửi bổ sung
  initStaffActions();

  // Công tắc Mua hàng / Bán hàng / Admin: mở tab đầu tiên của luồng tương ứng
  document.querySelectorAll('.pcb-trade-switch__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.tradeMode;
      if (mode === 'admin') {
        switchAuctionTab('admin-approvals');
      } else if (mode === 'sell') {
        switchAuctionTab('selling');
      } else {
        switchAuctionTab('participating');
      }
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
      // Giữ lại danh sách trước khi xóa để Hoàn tác trả linh kiện về đúng vị trí cũ
      const before = getWatchlistItems();
      saveWatchlistItems(before.filter(x => x.id !== pId));
      renderCurrentAuctionTab();
      showToast('Đã xóa linh kiện khỏi danh sách theo dõi!', true, {
        label: 'Hoàn tác',
        onClick: () => {
          const current = getWatchlistItems();
          if (current.some(x => x.id === pId)) return;
          const removed = before.find(x => x.id === pId);
          const index = before.findIndex(x => x.id === pId);
          current.splice(Math.min(index, current.length), 0, removed);
          saveWatchlistItems(current);
          renderCurrentAuctionTab();
          showToast('Đã khôi phục linh kiện vào danh sách theo dõi.');
        }
      });
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
    formAccount.addEventListener('submit', (e) => {
      e.preventDefault();
      // Lưu lại Promise để hộp thoại "rời trang khi chưa lưu" chờ kết quả lưu
      accountSubmitPromise = handleAccountSubmit();
    });
  }

  // 12a. Hỏi lưu trước khi rời trang / chuyển mục khi form tài khoản còn thay đổi chưa lưu
  initAccountLeaveGuard();

  async function handleAccountSubmit() {
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

      // Tên đăng nhập: kiểm tra định dạng, không trùng; đổi tên thì xác nhận rồi chuyển dữ liệu sang tên mới
      const usernameInput = document.getElementById('input-username');
      const oldUsername = user.username;
      const newUsername = (usernameInput?.value || '').trim().toLowerCase();
      let doiTenDangNhap = false;
      if (usernameInput && !isDemoAccount(user) && newUsername !== oldUsername) {
        if (!showUsernameError()) {
          usernameInput.focus();
          return;
        }
        const ok = await showConfirm({
          title: 'Đổi tên đăng nhập?',
          message: `Tên đăng nhập sẽ đổi từ @${oldUsername} thành @${newUsername}.\n\nLần sau hãy đăng nhập bằng tên mới (hoặc email). Liên kết hồ sơ công khai cũ sẽ không còn dùng được.`,
          confirmText: 'Đổi tên đăng nhập',
          cancelText: 'Giữ tên cũ'
        });
        if (!ok) {
          usernameInput.value = oldUsername;
          showUsernameError();
          return;
        }
        doiTenDangNhap = true;
      }

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
      if (doiTenDangNhap) {
        // Chuyển watchlist, đăng bán, địa chỉ, lượt đặt giá, chat, đơn hàng... sang tên mới trước khi lưu tài khoản
        migrateUsername(oldUsername, newUsername);
        user.username = newUsername;
      }
      user.pref_sms = document.getElementById('pref-sms')?.checked ?? true;
      user.pref_email = document.getElementById('pref-email')?.checked ?? true;

      const now = new Date();
      const timeStr = `Hôm nay, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      user.lastUpdated = timeStr;

      saveCurrentUser(user);
      syncUserInfoUI({ force: true });
      updateCounters();
      showToast(doiTenDangNhap ? `Đã đổi tên đăng nhập thành @${user.username}!` : 'Đã lưu thay đổi thông tin cá nhân thành công!');
  }

  // 12a. Kiểm tra email / số điện thoại ngay khi rời khỏi ô: hiện dòng lỗi màu đỏ bên dưới
  setupContactFieldValidation();
  // Thanh lưu nổi khi có thay đổi chưa lưu mà nút lưu đang khuất
  initAccountSavebar();
  // Tên đăng nhập: tự chuyển chữ thường, kiểm tra trực tiếp khi gõ và kiểm tra đầy đủ khi rời khỏi ô
  const usernameField = document.getElementById('input-username');
  if (usernameField) {
    let usernameTimer = 0;
    usernameField.addEventListener('input', () => {
      const lower = usernameField.value.toLowerCase().replace(/\s+/g, '');
      if (lower !== usernameField.value) usernameField.value = lower;
      clearTimeout(usernameTimer);
      if (!usernameField.readOnly) usernameTimer = setTimeout(() => showUsernameError(true), LIVE_VALIDATE_DELAY);
    });
    usernameField.addEventListener('blur', () => {
      clearTimeout(usernameTimer);
      if (!usernameField.readOnly) showUsernameError();
    });
  }

  // Nút sao chép nhanh tên đăng nhập (dùng được cả với tài khoản demo đang khóa tên)
  const copyUsernameBtn = document.getElementById('btn-copy-username');
  if (copyUsernameBtn && usernameField) {
    let copyTimer = 0;
    copyUsernameBtn.addEventListener('click', async () => {
      const value = usernameField.value.trim();
      if (!value) return;
      const ok = await copyText(value);
      showToast(ok ? `Đã sao chép tên đăng nhập @${value}` : 'Không sao chép được, hãy chọn và sao chép thủ công.', ok);
      if (!ok) return;
      // Đổi icon sang dấu tick trong 1,5 giây để báo đã sao chép
      const iconEl = copyUsernameBtn.querySelector('.pcb-icon');
      copyUsernameBtn.classList.add('pcb-username-wrap__copy--done');
      iconEl?.classList.replace('pcb-icon--copy', 'pcb-icon--check');
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copyUsernameBtn.classList.remove('pcb-username-wrap__copy--done');
        iconEl?.classList.replace('pcb-icon--check', 'pcb-icon--copy');
      }, 1500);
    });
  }

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
  if (privacyForm) {
    // Công tắc đổi trạng thái: cập nhật chữ Công khai / Riêng tư (thanh lưu nổi tự theo dõi thay đổi)
    privacyForm.addEventListener('change', (e) => {
      if (e.target.matches('.pcb-switch__input')) updateSwitchText(e.target);
    });
    privacyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = getCurrentUser();
      const privacy = {};
      privacyForm.querySelectorAll('.pcb-switch__input').forEach(input => { privacy[input.name] = input.checked; });
      user.privacy = privacy;
      saveCurrentUser(user);
      markFormSaved('form-privacy');
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
      updateSavebar();
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
