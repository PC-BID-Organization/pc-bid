/**
 * PCBid - Tập lệnh Quản lý Hồ sơ & Phiên đấu giá của tôi (profile.js)
 * 100% Vanilla JavaScript (ES6+), Thao tác DOM trực tiếp, Đồng bộ LocalStorage
 * Tuân thủ quy chuẩn IE104 - UIT & Chỉ thị AGENTS.md
 */

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

/**
 * Danh sách 3 tài khoản mẫu dựng sẵn phục vụ demo, chấm điểm và kiểm thử phân quyền
 * Acc 1 (bidder1): Đấu Giá 1 - Tham gia trả giá cạnh tranh, ví 50tr
 * Acc 2 (bidder2): Đấu Giá 2 - Tham gia trả giá đối kháng để demo vượt giá qua lại, ví 60tr
 * Acc 3 (seller):  Người Bán - Đăng bán linh kiện PC lên sàn, ví 80tr
 */
const SAMPLE_ACCOUNTS = [
  {
    id: "user_bidder1_demo",
    username: "bidder1",
    password: "123456",
    fullname: "Nguyễn Văn A (Đấu Giá 1)",
    email: "bidder1@pcbid.vn",
    phone: "0901234567",
    role: "bidder",
    verified: true,
    walletBalance: 50000000,
    depositHold: 3500000,
    address: "Ký túc xá Khu B ĐHQG-HCM, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh",
    avatar: "images/avatars/avatar-bidder.png",
    rating: 5.0,
    reviewCount: 38,
    pref_sms: true,
    pref_email: true,
    lastUpdated: "Hôm nay, 14:32",
    isLoggedIn: true
  },
  {
    id: "user_bidder2_demo",
    username: "bidder2",
    password: "123456",
    fullname: "Lê Thị C (Đấu Giá 2)",
    email: "bidder2@pcbid.vn",
    phone: "0918765432",
    role: "bidder",
    verified: true,
    walletBalance: 60000000,
    depositHold: 2000000,
    address: "Ký túc xá Khu A ĐHQG-HCM, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh",
    avatar: "images/avatars/avatar-bidder2.png",
    rating: 4.9,
    reviewCount: 25,
    pref_sms: true,
    pref_email: true,
    lastUpdated: "Hôm nay, 11:20",
    isLoggedIn: true
  },
  {
    id: "user_seller_demo",
    username: "seller",
    password: "123456",
    fullname: "Trần Văn B (Người Bán)",
    email: "seller@pcbid.vn",
    phone: "0987654321",
    role: "seller",
    verified: true,
    walletBalance: 80000000,
    depositHold: 0,
    address: "45 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh",
    avatar: "images/avatars/avatar-seller.png",
    rating: 4.9,
    reviewCount: 124,
    pref_sms: true,
    pref_email: true,
    lastUpdated: "Hôm nay, 10:15",
    isLoggedIn: true
  }
];

const DEFAULT_USER = SAMPLE_ACCOUNTS[0];

// Danh sách phiên đang tham gia mẫu
const DEFAULT_PARTICIPATING = [
  {
    id: 2001,
    name: "Card màn hình ASUS ROG Strix GeForce RTX 3070 8GB OC",
    category: "GPU",
    status: "lead", // 'lead': Đang dẫn đầu | 'outbid': Đã bị vượt giá
    currentBid: 5800000,
    myBid: 5800000,
    bidStep: 100000,
    bidCount: 16,
    marketPriceNew: 12500000,
    endTimestamp: Date.now() + 2 * 3600 * 1000 + 45 * 60 * 1000, // 2h 45m
    images: ["images/products/gpu/2018-rtx-4070-12gb-1.webp"],
    specs: ["8GB GDDR6", "Furmark 65°C"]
  },
  {
    id: 1001,
    name: "Bộ vi xử lý AMD Ryzen 7 5800X3D (8C/16T, 96MB V-Cache)",
    category: "CPU",
    status: "outbid", // Bị vượt giá
    currentBid: 5100000,
    myBid: 4900000,
    bidStep: 100000,
    bidCount: 22,
    marketPriceNew: 8900000,
    endTimestamp: Date.now() + 4 * 3600 * 1000 + 15 * 60 * 1000, // 4h 15m
    images: ["images/products/cpu/1005-i7-11700k-1.jpg"],
    specs: ["Socket AM4", "3.4GHz - 4.5GHz"]
  },
  {
    id: 3013,
    name: "Bo mạch chủ MSI MAG Z790 TOMAHAWK WIFI DDR5",
    category: "Mainboard",
    status: "lead", // Đang dẫn đầu
    currentBid: 5800000,
    myBid: 5800000,
    bidStep: 100000,
    bidCount: 7,
    marketPriceNew: 7690000,
    endTimestamp: Date.now() + 18 * 3600 * 1000, // 18h
    images: ["images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg"],
    specs: ["LGA 1700", "Micro-ATX"]
  },
  {
    id: 4011,
    name: "RAM Corsair Vengeance RGB 32GB (2x16GB) 6000MHz DDR5 Black",
    category: "RAM",
    status: "outbid", // Bị vượt giá
    currentBid: 3250000,
    myBid: 3100000,
    bidStep: 50000,
    bidCount: 9,
    marketPriceNew: 3990000,
    endTimestamp: Date.now() + 52 * 60 * 1000, // 52 phút
    images: ["images/products/ram/4011-corsair-vengeance-rgb-ddr5-black-1.jpg"],
    specs: ["32GB (2x16GB)", "DDR5 6000MHz"]
  }
];

// Danh sách linh kiện tự đăng bán mẫu
const DEFAULT_SELLING = [
  {
    id: 3006,
    name: "Bo mạch chủ ASUS TUF GAMING B760M-PLUS WIFI DDR4",
    category: "Mainboard",
    status: "active", // 'active': Đang diễn ra | 'sold': Đã bán thành công | 'ended': Đã kết thúc
    startingPrice: 2700000,
    currentBid: 3200000,
    highestBidder: "tuan_pcbuilder",
    bidCount: 8,
    endTimestamp: Date.now() + 14 * 3600 * 1000, // 14 giờ
    images: ["images/products/mainboard/3006-asus-tuf-b760m-plus-wifi-1.jpg"],
    specs: ["LGA 1700", "Micro-ATX"]
  },
  {
    id: 6001,
    name: "Nguồn máy tính Corsair RM850x 850W 80 Plus Gold Modular",
    category: "PSU",
    status: "sold", // Đã bán thành công
    startingPrice: 1500000,
    currentBid: 2150000,
    highestBidder: "nguon_pc_chat",
    bidCount: 13,
    soldDate: "28/10/2026",
    images: ["images/products/psu/6013-nzxt-c750-gold-1.png"],
    specs: ["850W", "80 Plus Gold"]
  },
  {
    id: 7001,
    name: "Vỏ máy tính Lian Li O11 Dynamic Mini Snow White",
    category: "Case",
    status: "ended", // Đã kết thúc
    startingPrice: 1200000,
    currentBid: 1750000,
    bidCount: 11,
    images: ["images/products/case/7005-vo-may-tinh-lian-li-o11d-mini-v2-white-1.jpg"],
    specs: ["2 mặt kính", "Snow White"]
  }
];

// Danh sách theo dõi (Watchlist) mẫu
const DEFAULT_WATCHLIST = [
  {
    id: 1002,
    name: "Bộ vi xử lý Intel Core i5-13600K (14C/20T, Up to 5.1GHz)",
    category: "CPU",
    currentBid: 5600000,
    marketPriceNew: 8100000,
    bidCount: 11,
    endTimestamp: Date.now() + 3 * 3600 * 1000 + 20 * 60 * 1000,
    images: ["images/products/cpu/1012-i5-13600k-1.jpg"],
    specs: ["LGA 1700", "5.1 GHz Max"]
  },
  {
    id: 2002,
    name: "Card màn hình Gigabyte Radeon RX 7800 XT Gaming OC 16GB",
    category: "GPU",
    currentBid: 12800000,
    marketPriceNew: 16900000,
    bidCount: 16,
    endTimestamp: Date.now() + 5 * 3600 * 1000 + 40 * 60 * 1000,
    images: ["images/products/gpu/2028-rx-7800-xt-1.jpg"],
    specs: ["16GB GDDR6", "256-bit"]
  },
  {
    id: 8001,
    name: "Tản nhiệt khí Noctua NH-D15 chromax.black Dual Fan",
    category: "Cooling",
    currentBid: 2200000,
    marketPriceNew: 3200000,
    bidCount: 12,
    endTimestamp: Date.now() + 7 * 3600 * 1000,
    images: ["images/products/cooling/8007-tan-nhiet-noctua-nh-d15s-chromax-black-1.jpg"],
    specs: ["140mm Dual", "TDP 250W"]
  },
  {
    id: 4013,
    name: "RAM G.SKILL Trident Z5 Neo RGB 64GB (2x32GB) 6000MHz DDR5",
    category: "RAM",
    currentBid: 5300000,
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
}

function getParticipatingBids() {
  const raw = localStorage.getItem(STORAGE_KEYS.PARTICIPATING_BIDS);
  let list = [];
  if (!raw) {
    list = DEFAULT_PARTICIPATING;
  } else {
    try {
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = DEFAULT_PARTICIPATING;
    } catch {
      list = DEFAULT_PARTICIPATING;
    }
  }

  const currentUser = getCurrentUser();
  const currentUsername = currentUser ? (currentUser.username || currentUser.fullname) : 'bidder1';

  // Đọc danh sách sản phẩm và lịch sử đặt giá mới nhất từ localStorage
  let localProducts = [];
  try { localProducts = JSON.parse(localStorage.getItem('pcbid_products') || '[]'); } catch {}
  const prodMap = new Map(localProducts.map(p => [Number(p.id), p]));

  let localBids = [];
  try { localBids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]'); } catch {}

  // Tự động kiểm tra trạng thái Dẫn đầu (lead) vs Bị vượt giá (outbid) theo người dùng hiện tại
  return list.map(item => {
    const idNum = Number(item.id);
    const prod = prodMap.get(idNum);

    // Tìm các lượt bid của người dùng hiện tại trên sản phẩm này
    const myBidsOnItem = localBids.filter(b => 
      Number(b.productId) === idNum && 
      (b.bidderName === currentUsername || b.bidderName === currentUser?.username || b.bidderName === currentUser?.email)
    );

    let myHighestBid = Number(item.myBid) || Number(item.currentBid) || 1000000;
    if (myBidsOnItem.length > 0) {
      myHighestBid = Math.max(...myBidsOnItem.map(b => Number(b.amount) || 0));
    }

    let currentHighestBid = prod ? Number(prod.currentBid) : Number(item.currentBid || myHighestBid);
    const allBidsOnItem = localBids.filter(b => Number(b.productId) === idNum);
    if (allBidsOnItem.length > 0) {
      const topBid = Math.max(...allBidsOnItem.map(b => Number(b.amount) || 0));
      if (topBid > currentHighestBid) currentHighestBid = topBid;
    }

    // Nếu giá cao nhất hiện tại lớn hơn giá tôi đã đặt, hoặc người dẫn đầu không phải tôi -> BỊ VƯỢT GIÁ (outbid)
    let isLead = false;
    if (allBidsOnItem.length > 0) {
      isLead = (allBidsOnItem[0].bidderName === currentUsername || allBidsOnItem[0].bidderName === currentUser?.username) && (myHighestBid >= currentHighestBid);
    } else {
      isLead = item.status === 'lead' || item.status === 'leading';
    }

    return {
      ...item,
      id: idNum,
      bidStep: Number(item.bidStep) || Number(prod?.bidStep) || 100000,
      myBid: myHighestBid,
      currentBid: currentHighestBid,
      bidCount: prod?.bidCount !== undefined ? prod.bidCount : Math.max(item.bidCount || 1, allBidsOnItem.length),
      status: isLead ? 'lead' : 'outbid'
    };
  });
}

function saveParticipatingBids(items) {
  localStorage.setItem(STORAGE_KEYS.PARTICIPATING_BIDS, JSON.stringify(items));
}

function getSellingItems() {
  const raw = localStorage.getItem(STORAGE_KEYS.SELLING_ITEMS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.SELLING_ITEMS, JSON.stringify(DEFAULT_SELLING));
    return DEFAULT_SELLING;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SELLING;
  }
}

function getWatchlistItems() {
  const raw = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(DEFAULT_WATCHLIST));
    return DEFAULT_WATCHLIST;
  }
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return DEFAULT_WATCHLIST;
    return list.map(item => {
      if (typeof item === 'number' || typeof item === 'string') {
        const idNum = Number(item);
        const sample = DEFAULT_WATCHLIST.find(x => x.id === idNum);
        return sample || {
          id: idNum,
          name: 'Linh kiện #' + idNum,
          category: 'GPU',
          currentBid: 2500000,
          marketPriceNew: 4000000,
          bidCount: 5,
          endTimestamp: Date.now() + 86400000,
          images: ['images/products/gpu/2018-rtx-4070-12gb-1.webp'],
          specs: ['Đã qua kiểm định Furmark']
        };
      }
      if (!item.name) item.name = 'Linh kiện #' + (item.id || '');
      if (!item.category) item.category = 'Khác';
      return item;
    });
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

function saveWatchlistItems(items) {
  localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(items));
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
            <span class="pcb-stat-col__countdown" data-timestamp="${item.endTimestamp}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="countdown-text">${formatTimeRemaining(item.endTimestamp)}</span>
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

  if (item.status === 'active') {
    modifierClass = 'pcb-auction-card--selling-active';
    badgeHtml = `<span class="pcb-status-badge pcb-status-badge--active">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
      Đang diễn ra
    </span>`;
    actionButtonsHtml = `
      <a href="${detailUrl}" class="pcb-btn-primary" style="padding: 8px 12px; font-size: 12px;">Xem phiên đấu</a>
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
      <a href="sell.html?relist=${item.id}" class="pcb-btn-rebid" style="background-color: #565E74;">Đăng bán lại</a>
      <a href="${detailUrl}" class="pcb-btn-detail">Xem lại</a>
    `;
  }

  const specsHtml = (item.specs || []).map(s => `<span class="pcb-auction-card__spec-chip">${escapeHtml(s)}</span>`).join('');

  return `
    <article class="pcb-auction-card ${modifierClass}" data-id="${item.id}">
      <a href="${detailUrl}" class="pcb-auction-card__media-link" aria-label="Xem chi tiết ${escapeHtml(item.name)}">
        <span class="pcb-auction-card__category-badge">${escapeHtml(item.category)}</span>
        <img src="${imageSrc}" alt="${escapeHtml(item.name)}" class="pcb-auction-card__img" loading="lazy" onerror="this.src='images/products/mainboard/3006-asus-tuf-b760m-plus-wifi-1.jpg'">
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
              <span class="pcb-stat-col__countdown" data-timestamp="${item.endTimestamp}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="countdown-text">${formatTimeRemaining(item.endTimestamp)}</span>
              </span>
            </div>
          ` : `
            <div class="pcb-stat-col">
              <span class="pcb-stat-col__lbl">Người mua thắng</span>
              <span class="pcb-stat-col__val" style="color:#059669;">${escapeHtml(item.highestBidder || 'Chưa có')}</span>
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
            <span class="pcb-stat-col__val" style="color: #64748B;">${formatVnd(item.marketPriceNew || item.currentBid * 1.5)}</span>
          </div>

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Thời gian còn lại</span>
            <span class="pcb-stat-col__countdown" data-timestamp="${item.endTimestamp}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="countdown-text">${formatTimeRemaining(item.endTimestamp)}</span>
            </span>
          </div>

          <div class="pcb-stat-col">
            <span class="pcb-stat-col__lbl">Lượt trả giá</span>
            <span class="pcb-stat-col__val">${item.bidCount} lượt</span>
          </div>
        </div>
      </div>

      <div class="pcb-auction-card__actions">
        <a href="${detailUrl}" class="pcb-btn-primary" style="padding: 8px 14px; font-size: 13px;">
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
let currentActiveTab = 'participating';
let currentSearchKeyword = '';
let currentFilterChip = 'all';

// Biến lưu sản phẩm đang thực hiện Trả giá nhanh
let activeQuickBidItem = null;
let currentMultiplier = 1;

/**
 * Cập nhật số dư và thông tin người dùng lên toàn bộ giao diện
 */
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
  if (uidEl) uidEl.textContent = `UID: #${user.id.toUpperCase()}-IE104`;
  if (walletEl) walletEl.textContent = formatVnd(user.walletBalance);
  if (holdEl) holdEl.textContent = formatVnd(user.depositHold);

  // Form Account
  const fnInput = document.getElementById('input-fullname');
  const emInput = document.getElementById('input-email');
  const phInput = document.getElementById('input-phone');
  const adInput = document.getElementById('input-address');
  const smsInput = document.getElementById('pref-sms');
  const mailInput = document.getElementById('pref-email');
  const lastUpdateEl = document.getElementById('last-update-time');

  if (fnInput) fnInput.value = user.fullname || '';
  if (emInput) emInput.value = user.email || '';
  if (phInput) phInput.value = user.phone || '';
  if (adInput) adInput.value = user.address || '';
  if (smsInput) smsInput.checked = user.pref_sms !== false;
  if (mailInput) mailInput.checked = user.pref_email !== false;
  if (lastUpdateEl) lastUpdateEl.textContent = user.lastUpdated || 'Hôm nay';
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
  if (navCountEl) navCountEl.textContent = `${participating.length} phiên`;
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
      { id: 'lead', label: '🟢 Đang dẫn đầu' },
      { id: 'outbid', label: '🔴 Đã bị vượt giá' }
    ];
  } else if (currentActiveTab === 'selling') {
    chips = [
      { id: 'all', label: 'Tất cả' },
      { id: 'active', label: '🔵 Đang diễn ra' },
      { id: 'sold', label: '🟢 Đã bán thành công' },
      { id: 'ended', label: '⚪ Đã kết thúc' }
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
      ${c.label}
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
        grid.style.display = 'flex';
        empty.style.display = 'none';
      } else {
        grid.innerHTML = '';
        grid.style.display = 'none';
        empty.style.display = 'block';
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
        grid.style.display = 'flex';
        empty.style.display = 'none';
      } else {
        grid.innerHTML = '';
        grid.style.display = 'none';
        empty.style.display = 'block';
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
        grid.style.display = 'flex';
        empty.style.display = 'none';
      } else {
        grid.innerHTML = '';
        grid.style.display = 'none';
        empty.style.display = 'block';
      }
    }
  }

  updateCounters();
}

/**
 * Chuyển đổi giữa các Section chính (Quản lý đấu giá, Thông tin tài khoản, Bảo mật)
 */
function switchSection(sectionId) {
  currentActiveSection = sectionId;

  // Ẩn tất cả các sections
  document.querySelectorAll('.pcb-section').forEach(sec => {
    sec.style.display = sec.id === sectionId ? 'block' : 'none';
  });

  // Cập nhật trạng thái active nút sidebar
  document.querySelectorAll('.pcb-profile-nav__btn[data-section]').forEach(btn => {
    const isTarget = btn.getAttribute('data-section') === sectionId;
    btn.classList.toggle('pcb-profile-nav__btn--active', isTarget);
  });

  // Cập nhật tên breadcrumb
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  if (breadcrumbCurrent) {
    if (sectionId === 'section-auctions') breadcrumbCurrent.textContent = 'Quản lý đấu giá';
    else if (sectionId === 'section-account') breadcrumbCurrent.textContent = 'Thông tin tài khoản';
    else if (sectionId === 'section-security') breadcrumbCurrent.textContent = 'Bảo mật & Đổi mật khẩu';
  }

  if (sectionId === 'section-auctions') {
    renderCurrentAuctionTab();
  }
}

/**
 * Chuyển đổi giữa các Sub-tabs trong Quản lý đấu giá (Đang tham gia, Đã đăng bán, Watchlist)
 */
function switchAuctionTab(tabName) {
  currentActiveTab = tabName;
  currentFilterChip = 'all';

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

  const imageSrc = (item.images && item.images[0]) ? item.images[0] : 'images/products/cpu/1005-i7-11700k-1.jpg';

  if (infoContainer) {
    infoContainer.innerHTML = `
      <img src="${imageSrc}" alt="${escapeHtml(item.name)}" class="pcb-quick-bid-item__img">
      <div>
        <div style="font-size:11px; color:#EA580C; font-weight:700; text-transform:uppercase;">${escapeHtml(item.category)}</div>
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
  // 1. Đồng bộ thông tin người dùng & đếm số lượng
  syncUserInfoUI();
  updateCounters();

  // 2. Kiểm tra URL Hash để mở đúng Tab (ví dụ: profile.html#watchlist)
  const hash = window.location.hash.toLowerCase();
  if (hash === '#watchlist') {
    switchSection('section-auctions');
    switchAuctionTab('watchlist');
  } else if (hash === '#selling') {
    switchSection('section-auctions');
    switchAuctionTab('selling');
  } else if (hash === '#participating' || hash === '#my-auctions') {
    switchSection('section-auctions');
    switchAuctionTab('participating');
  } else if (hash === '#account') {
    switchSection('section-account');
  } else if (hash === '#security') {
    switchSection('section-security');
  } else {
    // Mặc định vào tab đấu giá đang tham gia
    switchSection('section-auctions');
    switchAuctionTab('participating');
  }

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
    btnSubmitBid.addEventListener('click', () => {
      if (!activeQuickBidItem) return;

      const user = getCurrentUser() || DEFAULT_USER;
      const curBid = Number(activeQuickBidItem.currentBid) || 0;
      const step = Number(activeQuickBidItem.bidStep) || 100000;
      const mult = Number(currentMultiplier) || 1;
      const newBidAmount = curBid + (mult * step);

      // Kiểm tra số dư ví cọc tối thiểu (10% giá trị bid)
      const requiredDeposit = Math.round(newBidAmount * 0.1);
      if (user.walletBalance < requiredDeposit) {
        alert(`Số dư ví khả dụng (${formatVnd(user.walletBalance)}) không đủ giữ cọc 10% (${formatVnd(requiredDeposit)}). Vui lòng nạp thêm tiền vào ví!`);
        closeModal('modal-quick-bid');
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

      // Cập nhật số tiền giữ cọc trong ví
      user.depositHold = (user.depositHold || 0) + requiredDeposit;
      user.walletBalance = Math.max(0, user.walletBalance - requiredDeposit);
      saveCurrentUser(user);

      // Đồng bộ vào pcbid_bids
      try {
        const bids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]');
        bids.unshift({
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          productId: activeQuickBidItem.id,
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
            endTime: activeQuickBidItem.endTime || (activeQuickBidItem.endTimestamp ? new Date(activeQuickBidItem.endTimestamp).toISOString() : null),
            images: activeQuickBidItem.images || []
          });
        }
        localStorage.setItem('pcbid_products', JSON.stringify(localProducts));
      } catch (e) {
        console.warn('[PCBid] Không thể cập nhật pcbid_products từ profile:', e);
      }

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
        alert('Vui lòng nhập số tiền nạp hợp lệ!');
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

      const user = getCurrentUser();
      user.fullname = document.getElementById('input-fullname')?.value.trim() || user.fullname;
      user.email = document.getElementById('input-email')?.value.trim() || user.email;
      user.phone = document.getElementById('input-phone')?.value.trim() || user.phone;
      user.address = document.getElementById('input-address')?.value.trim() || user.address;
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

  // 13. Xử lý Form Đổi mật khẩu
  const formPass = document.getElementById('form-change-password');
  if (formPass) {
    formPass.addEventListener('submit', (e) => {
      e.preventDefault();
      const cur = document.getElementById('input-current-pass')?.value;
      const nw = document.getElementById('input-new-pass')?.value;
      const cf = document.getElementById('input-confirm-pass')?.value;

      if (!cur || !nw || !cf) {
        alert('Vui lòng điền đầy đủ các trường mật khẩu!');
        return;
      }

      if (nw.length < 8) {
        alert('Mật khẩu mới phải có ít nhất 8 ký tự!');
        return;
      }

      if (nw !== cf) {
        alert('Mật khẩu xác nhận không khớp với mật khẩu mới!');
        return;
      }

      formPass.reset();
      showToast('Đổi mật khẩu tài khoản thành công!');
    });
  }

  // 14. Nút Đăng xuất
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản PCBid?')) {
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

  window.addEventListener('storage', (e) => {
    if (e.key === 'pcbid_my_auctions_participating' || e.key === 'pcbid_products' || e.key === 'pcbid_bids') {
      renderCurrentAuctionTab();
      syncUserInfoUI();
    }
  });
});
