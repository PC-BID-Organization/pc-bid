/**
 * PCBid - Tập lệnh Trang Chủ index.html
 * Trải nghiệm đấu giá trực tuyến chân thực, tương tác thời gian thực
 * 100% Vanilla JavaScript (ES6+), Không framework bên ngoài.
 */

/* ==========================================================================
   1. CẤU HÌNH & TẬP DỮ LIỆU
   ========================================================================== */

const DATA_SOURCES = [
  { key: 'gpu', path: 'data/gpu.json', label: 'VGA' },
  { key: 'cpu', path: 'data/cpu.json', label: 'CPU' },
  { key: 'mainboard', path: 'data/mainboard.json', label: 'Mainboard' },
  { key: 'ram', path: 'data/ram.json', label: 'RAM' },
  { key: 'storage', path: 'data/storage.json', label: 'SSD' },
  { key: 'psu', path: 'data/psu.json', label: 'PSU' },
  { key: 'cooling', path: 'data/cooling.json', label: 'Tản nhiệt' },
  { key: 'case', path: 'data/case.json', label: 'Case' }
];

// Dữ liệu dự phòng phong phú (Fallback Seed Data) khi mở qua giao thức file:/// hoặc fetch lỗi
const FALLBACK_PRODUCTS = [
  {
    id: 2001,
    name: "Card màn hình ASUS ROG Strix GeForce RTX 3070 8GB OC",
    category: "GPU",
    condition: "Like New 99% - Fullbox, Tem Void SPC nguyên vẹn",
    startingPrice: 4200000,
    currentBid: 5800000,
    bidStep: 100000,
    bidCount: 16,
    marketPriceNew: 12500000,
    endTime: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
    seller: "hoanglong_pc",
    images: ["images/products/gpu/2018-rtx-4070-12gb-1.webp"],
    specifications: { "VRAM": "8GB GDDR6", "Nhiệt độ test": "Furmark 65°C" }
  },
  {
    id: 1001,
    name: "Bộ vi xử lý AMD Ryzen 7 5800X3D (8C/16T, 96MB V-Cache)",
    category: "CPU",
    condition: "Đã sử dụng - Chân Socket AM4 hoàn hảo, bao test 7 ngày",
    startingPrice: 3800000,
    currentBid: 4900000,
    bidStep: 100000,
    bidCount: 22,
    marketPriceNew: 8900000,
    endTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    seller: "gaming_zone_vn",
    images: ["images/products/cpu/1019-ryzen-5-5600-1.jpg"],
    specifications: { "Socket": "AM4", "TDP": "105W" }
  },
  {
    id: 3001,
    name: "Bo mạch chủ MSI MAG Z790 TOMAHAWK WIFI DDR5",
    category: "Mainboard",
    condition: "Like New 99% - Fullbox phụ kiện râu anten, chặn main",
    startingPrice: 3500000,
    currentBid: 4600000,
    bidStep: 100000,
    bidCount: 11,
    marketPriceNew: 7200000,
    endTime: new Date(Date.now() + 115 * 60 * 1000).toISOString(),
    seller: "pc_premium_uit",
    images: ["images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg"],
    specifications: { "Socket": "LGA 1700", "Chuẩn RAM": "DDR5" }
  },
  {
    id: 4001,
    name: "RAM G.SKILL Trident Z RGB 32GB (2x16GB) 3600MHz DDR4",
    category: "RAM",
    condition: "Đã sử dụng - MemTest86 2 lượt 0 error, tản nhôm phay xước",
    startingPrice: 1100000,
    currentBid: 1650000,
    bidStep: 50000,
    bidCount: 11,
    marketPriceNew: 2800000,
    endTime: new Date(Date.now() + 85 * 60 * 1000).toISOString(),
    seller: "linhkien_chinhhang",
    images: ["images/products/ram/4003-gskill-trident-z-rgb-16gb-1.jpg"],
    specifications: { "Dung lượng": "32GB (2x16GB)", "Bus": "3600MHz" }
  },
  {
    id: 5001,
    name: "Ổ cứng SSD Samsung 980 Pro 1TB NVMe PCIe Gen 4.0",
    category: "Storage",
    condition: "Like New 99% - Sức khỏe 100%, ghi chưa tới 5TB",
    startingPrice: 1300000,
    currentBid: 1850000,
    bidStep: 50000,
    bidCount: 11,
    marketPriceNew: 2900000,
    endTime: new Date(Date.now() + 32 * 60 * 1000).toISOString(),
    seller: "ssd_speed_fast",
    images: ["images/products/storage/5001-ssd-samsung-980-pro-1tb-1.jpg"],
    specifications: { "Tốc độ đọc": "7000 MB/s", "Sức khỏe": "CrystalDisk 100%" }
  },
  {
    id: 6001,
    name: "Nguồn máy tính Corsair RM850x 850W 80 Plus Gold Modular",
    category: "PSU",
    condition: "Đã sử dụng - Còn bảo hành hãng 4 năm, tụ Nhật 105°C",
    startingPrice: 1500000,
    currentBid: 2150000,
    bidStep: 50000,
    bidCount: 13,
    marketPriceNew: 3600000,
    endTime: new Date(Date.now() + 140 * 60 * 1000).toISOString(),
    seller: "nguon_pc_chat",
    images: ["images/products/psu/6013-nzxt-c750-gold-1.png"],
    specifications: { "Công suất": "850W", "Chứng nhận": "80 Plus Gold" }
  },
  {
    id: 8001,
    name: "Tản nhiệt khí Noctua NH-D15 chromax.black Dual Fan",
    category: "Cooling",
    condition: "Fullbox - Đầy đủ ngàm Intel LGA1700 & AMD AM5",
    startingPrice: 1600000,
    currentBid: 2200000,
    bidStep: 50000,
    bidCount: 12,
    marketPriceNew: 3200000,
    endTime: new Date(Date.now() + 75 * 60 * 1000).toISOString(),
    seller: "noctua_lover",
    images: ["images/products/cooling/8007-tan-nhiet-noctua-nh-d15s-chromax-black-1.jpg"],
    specifications: { "Kích cỡ quạt": "140mm Dual", "TDP": "250W" }
  },
  {
    id: 7001,
    name: "Vỏ máy tính Lian Li O11 Dynamic Mini Snow White",
    category: "Case",
    condition: "Đẹp 98% - Kính cường lực không xước, kèm 3 quạt ARGB",
    startingPrice: 1200000,
    currentBid: 1750000,
    bidStep: 50000,
    bidCount: 11,
    marketPriceNew: 2650000,
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    seller: "modder_hcm",
    images: ["images/products/case/7005-vo-may-tinh-lian-li-o11d-mini-v2-white-1.jpg"],
    specifications: { "Kính cường lực": "2 mặt", "Hỗ trợ Main": "ATX / M-ATX" }
  },
  {
    id: 2002,
    name: "Card màn hình Gigabyte Radeon RX 7800 XT Gaming OC 16GB",
    category: "GPU",
    condition: "Like New 99% - Tem Viễn Sơn, quạt êm nhiệt độ Furmark 62°C",
    startingPrice: 9500000,
    currentBid: 12800000,
    bidStep: 200000,
    bidCount: 16,
    marketPriceNew: 16900000,
    endTime: new Date(Date.now() + 95 * 60 * 1000).toISOString(),
    seller: "vga_store_vn",
    images: ["images/products/gpu/2028-rx-7800-xt-1.jpg"],
    specifications: { "VRAM": "16GB GDDR6", "Băng thông": "256-bit" }
  },
  {
    id: 1002,
    name: "Bộ vi xử lý Intel Core i5-13600K (14C/20T, Up to 5.1GHz)",
    category: "CPU",
    condition: "Like New 99% - Hàng chính hãng Viết Sơn, chân tiếp xúc vàng óng",
    startingPrice: 4500000,
    currentBid: 5600000,
    bidStep: 100000,
    bidCount: 11,
    marketPriceNew: 8100000,
    endTime: new Date(Date.now() + 130 * 60 * 1000).toISOString(),
    seller: "cpu_uit_zone",
    images: ["images/products/cpu/1012-i5-13600k-1.jpg"],
    specifications: { "Socket": "LGA 1700", "Xung nhịp": "5.1 GHz Max" }
  }
];

// Danh sách sự kiện trực tiếp cho băng chuyền (Ticker Events)
const TICKER_EVENTS = [
  { user: "Đức Long", amount: "5.900.000đ", item: "ASUS ROG Strix RTX 3070 8GB", time: "12 giây trước" },
  { user: "Văn Minh", amount: "5.000.000đ", item: "Ryzen 7 5800X3D V-Cache", time: "28 giây trước" },
  { user: "Thanh Tùng", amount: "4.700.000đ", item: "MSI MAG Z790 Tomahawk", time: "45 giây trước" },
  { user: "Hải Nam", amount: "1.900.000đ", item: "Samsung 980 Pro 1TB NVMe", time: "1 phút trước" },
  { user: "Quốc Bảo", amount: "1.700.000đ", item: "RAM G.Skill Trident Z RGB 32GB", time: "2 phút trước" }
];

let allProducts = [];
let endingSortMode = 'ending';
let hotFilterCategory = 'all';
let currentModalProduct = null;
let currentBidIncrement = 0;
const watchedProductIds = new Set();

/* ==========================================================================
   2. TIỆN ÍCH ĐỊNH DẠNG & MÃ HOÁ (UTILITIES)
   ========================================================================== */

function formatVnd(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function encodePath(path) {
  return String(path).split('/').map(seg => encodeURIComponent(seg)).join('/');
}

// Giải mã chuỗi tiếng Việt bị lỗi font (Mojibake)
function fixMojibake(text) {
  if (typeof text !== 'string' || !/[\u00C0-\u00FF]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from(text, c => c.charCodeAt(0) & 0xff);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return text;
  }
}

// Bộ tạo âm thanh thành công thông qua Web Audio API (Không cần tải file .mp3)
function playBidSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {
    // Không chặn luồng nếu người dùng chưa tương tác với âm thanh
  }
}

/* ==========================================================================
   3. NẠP DỮ LIỆU SẢN PHẨM (HYBRID DATA LOADER)
   ========================================================================== */

async function loadProducts() {
  try {
    const fetches = DATA_SOURCES.map(async src => {
      const res = await fetch(src.path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.map(item => ({ ...item, sourceCategory: src.key }));
    });
    
    const results = await Promise.all(fetches);
    const flattened = results.flat();

    if (flattened && flattened.length > 0) {
      allProducts = flattened.map(p => {
        // Dùng endTime gốc trong dữ liệu JSON (2026-11-15T00:00:00+07:00)
        // Tán xạ nhẹ 0-48 giờ quanh mốc kết thúc gốc để các phiên lệch nhau thực tế
        const baseTime = new Date(p.endTime).getTime();
        const spreadHours = (p.id % 48) + ((p.id % 7) * 0.5);
        const endTimestamp = isNaN(baseTime) ? (Date.now() + 86400000 * 7) : (baseTime - spreadHours * 3600 * 1000);

        return {
          ...p,
          name: fixMojibake(p.name),
          condition: fixMojibake(p.condition),
          endTimestamp: endTimestamp,
          marketPriceNew: p.marketPriceNew || Math.round(p.currentBid * 1.85)
        };
      });
      return;
    }
  } catch (err) {
    console.warn('[PCBid] Không thể tải trực tiếp dữ liệu JSON qua mạng (ví dụ giao thức file://). Sử dụng nguồn hạt giống chất lượng cao:', err);
  }

  // Dự phòng hạt giống
  allProducts = FALLBACK_PRODUCTS.map(p => ({
    ...p,
    endTimestamp: new Date(p.endTime).getTime()
  }));
}

/* ==========================================================================
   4. RENDER THẺ SẢN PHẨM (CARD COMPONENT BUILDER)
   ========================================================================== */

function getHardwareSeal(product) {
  const cat = String(product.category).toUpperCase();
  if (cat === 'GPU') return '<span class="pcb-card__seal pcb-card__seal--pass">Furmark 65°C</span>';
  if (cat === 'CPU') return '<span class="pcb-card__seal pcb-card__seal--pass">Socket OK</span>';
  if (cat === 'RAM') return '<span class="pcb-card__seal pcb-card__seal--pass">MemTest86 OK</span>';
  if (cat === 'STORAGE') return '<span class="pcb-card__seal pcb-card__seal--pass">Health 100%</span>';
  return '<span class="pcb-card__seal pcb-card__seal--pass">Đã Test Đạt</span>';
}

function getConditionBadge(conditionStr) {
  if (!conditionStr) return 'Đã sử dụng';
  const lower = conditionStr.toLowerCase();
  if (lower.includes('like new') || lower.includes('99%')) return 'Like New 99%';
  if (lower.includes('fullbox')) return 'Fullbox';
  if (lower.includes('98%')) return 'Đẹp 98%';
  return 'Chính hãng';
}

function renderProductCard(product, options = {}) {
  const isWatched = watchedProductIds.has(product.id);
  const detailUrl = `product-detail.html?id=${product.id}`;
  const conditionLabel = getConditionBadge(product.condition);
  const sealBadge = getHardwareSeal(product);
  
  // Trích xuất 2 thông số tiêu biểu
  const specs = product.specifications || {};
  const specItems = Object.entries(specs).slice(0, 2).map(([k, v]) => {
    return `<span class="pcb-card__spec" title="${escapeHtml(k)}: ${escapeHtml(v)}">${escapeHtml(v)}</span>`;
  }).join('');

  // Huy hiệu đếm ngược
  let countdownMarkup = '';
  if (options.showCountdown) {
    countdownMarkup = `
      <div class="pcb-card__countdown" data-timestamp="${product.endTimestamp}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <polyline points="12 7 12 12 15 15"></polyline>
        </svg>
        <span class="pcb-countdown-text">--:--:--</span>
      </div>
    `;
  } else if (options.isNew) {
    countdownMarkup = `
      <div class="pcb-card__countdown" style="background:#059669;">
        <span style="font-size:10px;">✨ MỚI LÊN SÀN</span>
      </div>
    `;
  }

  // Tỉ lệ tiết kiệm
  const discountPercent = Math.max(10, Math.round((1 - product.currentBid / product.marketPriceNew) * 100));

  const imageSrc = (product.images && product.images[0]) 
    ? encodePath(product.images[0]) 
    : 'images/products/gpu/2018-rtx-4070-12gb-1.webp';

  return `
    <article class="pcb-card" id="card-${product.id}" data-id="${product.id}" data-category="${product.category}">
      <a href="${detailUrl}" class="pcb-card__media" aria-label="Xem chi tiết ${escapeHtml(product.name)}">
        ${countdownMarkup}
        <span class="pcb-card__condition">${conditionLabel}</span>
        <img class="pcb-card__img" src="${imageSrc}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.src='images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg'">
      </a>

      <button type="button" class="pcb-card__watch ${isWatched ? 'pcb-card__watch--active' : ''}" 
        data-action="watch" data-id="${product.id}" aria-label="Theo dõi sản phẩm này">
        <svg viewBox="0 0 24 24" fill="${isWatched ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <div class="pcb-card__body">
        <div class="pcb-card__seals">
          <span class="pcb-card__seal pcb-card__seal--cat">${escapeHtml(product.category || 'PC')}</span>
          ${sealBadge}
        </div>

        <a href="${detailUrl}" class="pcb-card__title" title="${escapeHtml(product.name)}">
          ${escapeHtml(product.name)}
        </a>

        <div class="pcb-card__specs">
          ${specItems}
        </div>

        ${options.showCountdown ? `
          <div class="pcb-card__progress-wrap">
            <div class="pcb-card__progress-bar" style="width: 72%;"></div>
          </div>
        ` : ''}

        <div class="pcb-card__price-box">
          <div class="pcb-card__price-row">
            <span class="pcb-card__price-lbl">Giá hiện tại</span>
            <span class="pcb-card__price-val" data-field="currentBid">${formatVnd(product.currentBid)}</span>
          </div>

          <div class="pcb-card__market-row">
            <span class="pcb-card__market-val">${formatVnd(product.marketPriceNew)}</span>
            <span class="pcb-card__bids-count">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <strong data-field="bidCount">${product.bidCount || 0}</strong> lượt
            </span>
          </div>

          <button type="button" class="pcb-card__btn" data-action="quick-bid" data-id="${product.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
            Đặt giá nhanh
          </button>
        </div>
      </div>
    </article>
  `;
}

/* ==========================================================================
   5. RENDER CÁC KỆ HÀNG (SHELVES RENDERERS)
   ========================================================================== */

function renderEndingSoonShelf() {
  const container = document.getElementById('pcb-ending-grid');
  if (!container) return;

  let sorted = [...allProducts];
  if (endingSortMode === 'ending') {
    sorted.sort((a, b) => a.endTimestamp - b.endTimestamp);
  } else if (endingSortMode === 'bids') {
    sorted.sort((a, b) => (b.bidCount || 0) - (a.bidCount || 0));
  } else if (endingSortMode === 'price') {
    sorted.sort((a, b) => b.currentBid - a.currentBid);
  }

  const items = sorted.slice(0, 5);
  container.innerHTML = items.map(p => renderProductCard(p, { showCountdown: true })).join('');
}

function renderHotAuctionsShelf() {
  const container = document.getElementById('pcb-hot-grid');
  if (!container) return;

  let filtered = [...allProducts];
  if (hotFilterCategory !== 'all') {
    filtered = filtered.filter(p => String(p.category).toLowerCase() === hotFilterCategory.toLowerCase());
  }

  // Sắp xếp theo số lượt bid cao nhất
  filtered.sort((a, b) => (b.bidCount || 0) - (a.bidCount || 0));
  const items = filtered.slice(0, 5);
  
  if (items.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: #64748b;">Chưa có phiên phù hợp trong nhóm này.</div>';
    return;
  }
  container.innerHTML = items.map(p => renderProductCard(p, { showCountdown: false })).join('');
}

function renderNewListingsShelf() {
  const container = document.getElementById('pcb-new-grid');
  if (!container) return;

  // Lấy các sản phẩm có giá khởi điểm mềm & id chẵn
  const sorted = [...allProducts].sort((a, b) => b.id - a.id).slice(0, 5);
  container.innerHTML = sorted.map(p => renderProductCard(p, { isNew: true })).join('');
}

/* ==========================================================================
   6. BỘ ĐẾM THỜI GIAN THỰC (REAL-TIME LIVE TIMERS)
   ========================================================================== */

function updateAllCountdowns() {
  const now = Date.now();
  const elements = document.querySelectorAll('[data-timestamp]');

  elements.forEach(el => {
    const end = parseInt(el.getAttribute('data-timestamp'), 10);
    const diff = end - now;

    const textEl = el.querySelector('.pcb-countdown-text');
    if (!textEl) return;

    if (diff <= 0) {
      textEl.textContent = 'Đã kết thúc';
      el.classList.remove('pcb-card__countdown--urgent');
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = n => String(n).padStart(2, '0');

    if (days > 0) {
      textEl.textContent = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      el.classList.remove('pcb-card__countdown--urgent');
    } else {
      textEl.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      if (hours < 2) {
        el.classList.add('pcb-card__countdown--urgent');
      } else {
        el.classList.remove('pcb-card__countdown--urgent');
      }
    }
  });

  // Cập nhật đồng hồ spotlight trên hero theo sản phẩm tâm điểm (ID 2002)
  const heroTimer = document.getElementById('hero-spotlight-timer');
  if (heroTimer) {
    const spotlightItem = allProducts.find(p => p.id === 2002);
    const targetTime = spotlightItem ? spotlightItem.endTimestamp : (now + 18 * 86400000);
    const diff = Math.max(0, targetTime - now);
    const totalSec = Math.floor(diff / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    heroTimer.textContent = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
}

/* ==========================================================================
   7. BĂNG CHUYỀN HOẠT ĐỘNG TRỰC TIẾP (LIVE TICKER CAROUSEL)
   ========================================================================== */

let tickerIndex = 0;
function initLiveTicker() {
  const track = document.getElementById('pcb-ticker-track');
  if (!track) return;

  track.innerHTML = TICKER_EVENTS.map(evt => `
    <div class="pcb-ticker__item">
      <span>🔥 <strong>${escapeHtml(evt.user)}</strong> vừa đặt <span class="pcb-ticker__price">${evt.amount}</span> cho <em>${escapeHtml(evt.item)}</em></span>
      <span class="pcb-ticker__time">• ${evt.time}</span>
    </div>
  `).join('');

  setInterval(() => {
    tickerIndex = (tickerIndex + 1) % TICKER_EVENTS.length;
    track.style.transform = `translateY(-${tickerIndex * 22}px)`;
  }, 3800);
}

/* ==========================================================================
   8. HỆ THỐNG TOAST THÔNG BÁO (TOAST ENGINE)
   ========================================================================== */

function showToast(message, type = 'success') {
  let container = document.getElementById('pcb-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'pcb-toast-container';
    container.className = 'pcb-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `pcb-toast ${type === 'success' ? 'pcb-toast--success' : ''}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" color="#10b981">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('pcb-toast--show'));

  setTimeout(() => {
    toast.classList.remove('pcb-toast--show');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

/* ==========================================================================
   9. HỘP THOẠI ĐẤU GIÁ NHANH (QUICK BID MODAL CONTROLLER)
   ========================================================================== */

function openQuickBidModal(productId) {
  const product = allProducts.find(p => p.id === Number(productId));
  if (!product) return;

  currentModalProduct = product;
  const step = product.bidStep || 100000;
  currentBidIncrement = step;

  const modalBackdrop = document.getElementById('pcb-bid-modal');
  if (!modalBackdrop) return;

  document.getElementById('pcb-modal-img').src = product.images && product.images[0] ? encodePath(product.images[0]) : '';
  document.getElementById('pcb-modal-name').textContent = product.name;
  document.getElementById('pcb-modal-cond').textContent = product.condition || 'Đã kiểm định Furmark';
  document.getElementById('pcb-modal-cur-bid').textContent = formatVnd(product.currentBid);
  document.getElementById('pcb-modal-step-info').textContent = `Bước giá: ${formatVnd(step)}`;
  
  // Thiết lập 3 nút bước giá động
  const btn1 = document.getElementById('pcb-step-1');
  const btn2 = document.getElementById('pcb-step-2');
  const btn3 = document.getElementById('pcb-step-3');

  if (btn1) {
    btn1.textContent = `+${formatVnd(step)}`;
    btn1.dataset.val = step;
    btn1.className = 'pcb-modal__step-btn pcb-modal__step-btn--active';
  }
  if (btn2) {
    btn2.textContent = `+${formatVnd(step * 2)}`;
    btn2.dataset.val = step * 2;
    btn2.className = 'pcb-modal__step-btn';
  }
  if (btn3) {
    btn3.textContent = `+${formatVnd(step * 3)}`;
    btn3.dataset.val = step * 3;
    btn3.className = 'pcb-modal__step-btn';
  }

  updateModalTotal(product.currentBid + currentBidIncrement);
  modalBackdrop.classList.add('pcb-modal-backdrop--active');
}

function updateModalTotal(total) {
  const submitBtn = document.getElementById('pcb-modal-submit-btn');
  if (submitBtn) {
    submitBtn.textContent = `Xác nhận đặt giá ${formatVnd(total)}`;
  }
}

function closeQuickBidModal() {
  const modalBackdrop = document.getElementById('pcb-bid-modal');
  if (modalBackdrop) modalBackdrop.classList.remove('pcb-modal-backdrop--active');
  currentModalProduct = null;
}

function executeQuickBid() {
  if (!currentModalProduct) return;

  const newBid = currentModalProduct.currentBid + currentBidIncrement;
  currentModalProduct.currentBid = newBid;
  currentModalProduct.bidCount = (currentModalProduct.bidCount || 0) + 1;

  // Cập nhật trực quan trên thẻ card ở giao diện
  const card = document.getElementById(`card-${currentModalProduct.id}`);
  if (card) {
    const valEl = card.querySelector('[data-field="currentBid"]');
    const cntEl = card.querySelector('[data-field="bidCount"]');
    if (valEl) valEl.textContent = formatVnd(newBid);
    if (cntEl) cntEl.textContent = currentModalProduct.bidCount;
    
    // Hiệu ứng nháy xanh ăn mừng trên card
    card.style.borderColor = '#10b981';
    card.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.4)';
    setTimeout(() => {
      card.style.borderColor = '';
      card.style.boxShadow = '';
    }, 1200);
  }

  // Phát âm thanh & Thông báo thành công
  playBidSuccessSound();
  showToast(`🎉 Trả giá thành công ${formatVnd(newBid)}! Bạn đang dẫn đầu phiên.`);
  closeQuickBidModal();
}

/* ==========================================================================
   10. LIGHTBOX ALBUM ẢNH & MODAL PHIẾU KIỂM ĐỊNH
   ========================================================================== */

function openCertModal() {
  const certModal = document.getElementById('pcb-cert-modal-box');
  if (certModal) certModal.classList.add('pcb-modal-backdrop--active');
}

function closeCertModal() {
  const certModal = document.getElementById('pcb-cert-modal-box');
  if (certModal) certModal.classList.remove('pcb-modal-backdrop--active');
}

function openLightbox(src, caption) {
  const modal = document.getElementById('pcb-lightbox-modal');
  const img = document.getElementById('pcb-lightbox-img');
  const cap = document.getElementById('pcb-lightbox-caption');
  if (!modal || !img) return;

  img.src = src;
  if (cap) cap.textContent = caption || 'Chi tiết ảnh thực tế linh kiện';
  modal.classList.add('pcb-modal-backdrop--active');
}

function closeLightbox() {
  const modal = document.getElementById('pcb-lightbox-modal');
  if (modal) modal.classList.remove('pcb-modal-backdrop--active');
}

/* ==========================================================================
   11. KHỞI TẠO TƯƠNG TÁC SỰ KIỆN (EVENT LISTENERS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Tải dữ liệu sản phẩm
  await loadProducts();

  // 2. Render các thành phần kệ hàng ban đầu
  renderEndingSoonShelf();
  renderHotAuctionsShelf();
  renderNewListingsShelf();

  // 3. Khởi tạo băng chuyền hoạt động sàn
  initLiveTicker();

  // 4. Kích hoạt bộ đếm thời gian thực (chạy mỗi 1 giây)
  updateAllCountdowns();
  setInterval(updateAllCountdowns, 1000);

  // 5. Sự kiện chuyển tab sắp xếp trên kệ "Sắp kết thúc"
  const endingTabs = document.querySelectorAll('[data-ending-tab]');
  endingTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      endingTabs.forEach(t => t.classList.remove('pcb-shelf__tab--active'));
      tab.classList.add('pcb-shelf__tab--active');
      endingSortMode = tab.dataset.endingTab;
      renderEndingSoonShelf();
    });
  });

  // 6. Sự kiện chuyển tab lọc danh mục trên kệ "Đấu giá nổi bật"
  const hotTabs = document.querySelectorAll('[data-hot-tab]');
  hotTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      hotTabs.forEach(t => t.classList.remove('pcb-shelf__tab--active'));
      tab.classList.add('pcb-shelf__tab--active');
      hotFilterCategory = tab.dataset.hotTab;
      renderHotAuctionsShelf();
    });
  });

  // 7. Bắt sự kiện click uỷ quyền trên toàn trang (Event Delegation)
  document.addEventListener('click', e => {
    // Nút "Đặt giá nhanh"
    const bidBtn = e.target.closest('[data-action="quick-bid"]');
    if (bidBtn) {
      const prodId = bidBtn.dataset.id;
      openQuickBidModal(prodId);
      return;
    }

    // Nút theo dõi Bookmark
    const watchBtn = e.target.closest('[data-action="watch"]');
    if (watchBtn) {
      const prodId = Number(watchBtn.dataset.id);
      if (watchedProductIds.has(prodId)) {
        watchedProductIds.delete(prodId);
        watchBtn.classList.remove('pcb-card__watch--active');
        showToast('Đã bỏ theo dõi phiên này');
      } else {
        watchedProductIds.add(prodId);
        watchBtn.classList.add('pcb-card__watch--active');
        showToast('Đã thêm vào danh sách theo dõi ❤️');
      }
      return;
    }

    // Chọn bước giá trong modal đặt giá nhanh
    const stepBtn = e.target.closest('.pcb-modal__step-btn');
    if (stepBtn && currentModalProduct) {
      document.querySelectorAll('.pcb-modal__step-btn').forEach(b => b.classList.remove('pcb-modal__step-btn--active'));
      stepBtn.classList.add('pcb-modal__step-btn--active');
      currentBidIncrement = parseInt(stepBtn.dataset.val, 10) || currentModalProduct.bidStep;
      updateModalTotal(currentModalProduct.currentBid + currentBidIncrement);
      return;
    }

    // Đóng modal đặt giá
    if (e.target.closest('[data-action="close-bid-modal"]') || e.target.id === 'pcb-bid-modal') {
      closeQuickBidModal();
      return;
    }

    // Xác nhận đặt giá trong modal
    if (e.target.id === 'pcb-modal-submit-btn') {
      executeQuickBid();
      return;
    }

    // Xem chứng nhận kiểm định
    if (e.target.closest('#btn-open-cert')) {
      openCertModal();
      return;
    }
    if (e.target.closest('[data-action="close-cert-modal"]') || e.target.id === 'pcb-cert-modal-box') {
      closeCertModal();
      return;
    }

    // Xem ảnh trong gallery lightbox
    const galleryItem = e.target.closest('[data-gallery-src]');
    if (galleryItem) {
      const src = galleryItem.dataset.gallerySrc;
      const caption = galleryItem.dataset.galleryCaption;
      openLightbox(src, caption);
      return;
    }
    if (e.target.closest('[data-action="close-lightbox"]') || e.target.id === 'pcb-lightbox-modal') {
      closeLightbox();
      return;
    }
  });

  // Đóng modal khi nhấn phím Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeQuickBidModal();
      closeCertModal();
      closeLightbox();
    }
  });

  // 8. Đăng ký nhận bản tin email
  const subForm = document.getElementById('pcb-subscribe-form');
  if (subForm) {
    subForm.addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('pcb-subscribe-input');
      if (input && input.value.trim()) {
        showToast(`Cảm ơn bạn! Đã đăng ký nhận tin cho: ${input.value.trim()}`);
        input.value = '';
      }
    });
  }
});
