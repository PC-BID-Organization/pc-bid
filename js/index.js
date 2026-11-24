/**
 * PCBid - Tập lệnh Trang Chủ index.html
 * Trải nghiệm đấu giá trực tuyến chân thực, tương tác thời gian thực
 * 100% Vanilla JavaScript (ES6+), Không framework bên ngoài.
 */

// Hàm tính thời điểm kết thúc phiên dùng chung cho mọi trang
import { getAuctionEndTimestamp, isAuctionClosed, mergeLocalProduct, lockAuctionEndTime } from './auction-time.js';
// Module ví ảo & tiền cọc dùng chung
import { readCurrentUser, getAvailableBalance, checkBidDeposit } from './wallet.js';
// Bộ icon Lucide dùng chung
import { icon } from './icons.js';
// Danh sách phiên và lượt đặt giá thật dùng cho băng chuyền trực tiếp
import { loadAllAuctions, readAllBids } from './bid-history.js';
// Họ tên người đặt và tra cứu tài khoản để mở hồ sơ công khai
import { describeBidder, findAccount } from './accounts.js';
// Trạng thái kiểm định của phiên (chờ kiểm định / đã gắn tem)
import { isAwaitingInspection, getInspectionSeal, getCountdownStart, getRemainingMs } from './inspection.js';
// Danh sách theo dõi lưu theo tài khoản (dùng chung với trang chi tiết, Header)
import { getWatchlist, toggleWatch, setWatchButtonState } from './watchlist.js';


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
    id: 2011,
    name: "Card màn hình ASUS ROG Strix GeForce RTX 3070 8GB OC",
    category: "GPU",
    condition: "Đã sử dụng - Fullbox phụ kiện, nguyên tem void",
    startingPrice: 6500000,
    currentBid: 8400000,
    bidStep: 100000,
    bidCount: 19,
    marketPriceNew: 15000000,
    endTime: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
    seller: "tuananh_pc",
    images: ["images/products/gpu/2011-rtx-3070-8gb-1.webp"],
    specifications: { "Dung lượng VRAM / Chuẩn": "8GB GDDR6 (256-bit)", "Băng thông bộ nhớ": "14 Gbps", "Cổng kết nối": "2x HDMI 2.1, 3x DisplayPort 1.4a", "Nguồn đề xuất": "650W (2x 8-pin)" }
  },
  {
    id: 1023,
    name: "Bộ vi xử lý AMD Ryzen 7 5800X3D (8C/16T, 96MB V-Cache)",
    category: "CPU",
    condition: "Đã sử dụng - Hàng hiếm sưu tầm, fullbox like new",
    startingPrice: 5600000,
    currentBid: 8100000,
    bidStep: 100000,
    bidCount: 25,
    marketPriceNew: 9500000,
    endTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    seller: "minhduc_hardware",
    images: ["images/products/cpu/1023-ryzen-7-5800x3d-1.jpg"],
    specifications: { "Socket": "AM4", "Số nhân / Số luồng": "8 nhân / 16 luồng", "Xung cơ bản / Xung Boost": "3.40 GHz / 4.50 GHz", "Bộ nhớ đệm (Cache)": "96 MB 3D V-Cache", "TDP": "105 W" }
  },
  {
    id: 3013,
    name: "Bo mạch chủ MSI MAG Z790 TOMAHAWK WIFI DDR5",
    category: "Mainboard",
    condition: "Đã sử dụng - Còn mới 98%, Fullbox chính hãng, bảo hành 18 tháng",
    startingPrice: 5100000,
    currentBid: 5800000,
    bidStep: 100000,
    bidCount: 7,
    marketPriceNew: 7690000,
    endTime: new Date(Date.now() + 115 * 60 * 1000).toISOString(),
    seller: "tuan_pcbuilder",
    images: ["images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg"],
    specifications: { "Socket": "LGA 1700", "Chipset": "Intel Z790", "Kích thước chuẩn (Form Factor)": "ATX", "Số khe RAM / Chuẩn RAM hỗ trợ": "4 khe DDR5 (Tối đa 192GB)", "Cổng M.2 NVMe": "4 khe M.2 PCIe 4.0 x4" }
  },
  {
    id: 4003,
    name: "RAM G.SKILL Trident Z RGB 16GB (1x16GB) 3600MHz DDR4",
    category: "RAM",
    condition: "Đã sử dụng - Like New 99%, tem Mai Hoàng bảo hành 8 tháng",
    startingPrice: 950000,
    currentBid: 1300000,
    bidStep: 50000,
    bidCount: 7,
    marketPriceNew: 1690000,
    endTime: new Date(Date.now() + 85 * 60 * 1000).toISOString(),
    seller: "minh_gear99",
    images: ["images/products/ram/4003-gskill-trident-z-rgb-16gb-1.jpg"],
    specifications: { "Dung lượng": "16GB (1 x 16GB)", "Chuẩn RAM": "DDR4", "Bus (Tốc độ)": "3600 MHz", "Độ trễ (CAS Latency / CL)": "CL18", "Tản nhiệt / LED": "Tản nhôm phay xước / LED RGB đa vùng" }
  },
  {
    id: 5001,
    name: "SSD Samsung 980 Pro 1TB NVMe M.2 PCIe Gen 4.0",
    category: "Storage",
    condition: "Đã sử dụng - Sức khỏe (Health) 99%, chạy 120 giờ, nguyên box",
    startingPrice: 1600000,
    currentBid: 1950000,
    bidStep: 50000,
    bidCount: 7,
    marketPriceNew: 2850000,
    endTime: new Date(Date.now() + 32 * 60 * 1000).toISOString(),
    seller: "vinh_pc_gear",
    images: ["images/products/storage/5001-samsung-980-pro-1.png"],
    specifications: { "Dung lượng": "1TB", "Loại ổ đĩa": "NVMe M.2 PCIe Gen 4", "Tốc độ đọc tối đa": "7000 MB/s", "Tốc độ ghi tối đa": "5000 MB/s", "Độ bền TBW": "600 TBW" }
  },
  {
    id: 6013,
    name: "Nguồn Máy Tính NZXT C750 Gold 750W",
    category: "PSU",
    condition: "Đã sử dụng - Fullbox đẹp 98%, nguyên seal tem",
    startingPrice: 1600000,
    currentBid: 1850000,
    bidStep: 50000,
    bidCount: 5,
    marketPriceNew: 2890000,
    endTime: new Date(Date.now() + 140 * 60 * 1000).toISOString(),
    seller: "hoang_minh_store",
    images: ["images/products/psu/6013-nzxt-c750-gold-1.png"],
    specifications: { "Công suất thực": "750W", "Chuẩn hiệu suất": "80 Plus Gold", "Kiểu dây nguồn": "Full Modular", "Kích thước quạt": "120mm" }
  },
  {
    id: 8007,
    name: "Tản nhiệt Noctua NH-D15S Chromax Black",
    category: "Cooling",
    condition: "Đã sử dụng - Còn mới 95%, còn ốc và gông lắp đặt cơ bản, cần kiểm tra đủ bộ",
    startingPrice: 1700000,
    currentBid: 1800000,
    bidStep: 50000,
    bidCount: 2,
    marketPriceNew: 2790000,
    endTime: new Date(Date.now() + 75 * 60 * 1000).toISOString(),
    seller: "linh_kien_cu",
    images: ["images/products/cooling/8007-tan-nhiet-noctua-nh-d15s-chromax-black-1.jpg"],
    specifications: { "Loại tản nhiệt": "Khí", "Màu sắc": "Đen", "Số ống đồng": "Chưa có dữ liệu", "Socket hỗ trợ": "Chưa có dữ liệu", "Đèn LED": "Chưa có dữ liệu" }
  },
  {
    id: 7005,
    name: "Vỏ máy tính Lian Li O11D Mini V2 White",
    category: "Case",
    condition: "Đã sử dụng - Còn mới 92%, ngoại hình tốt, quạt đi kèm (nếu có) cần kiểm tra khi nhận",
    startingPrice: 1150000,
    currentBid: 1150000,
    bidStep: 50000,
    bidCount: 0,
    marketPriceNew: 2790000,
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    seller: "thanh_pcgear",
    images: ["images/products/case/7005-vo-may-tinh-lian-li-o11d-mini-v2-white-1.jpg"],
    specifications: { "Hỗ trợ Mainboard": "ATX;Micro-ATX;Mini-ITX", "Kích thước case": "423.6 x 273.3 x 391.95", "Màu sắc": "Trắng", "Chất liệu / Kính cường lực": "Thép;Kính cường lực", "Hỗ trợ nguồn (PSU)": "ATX (Under 200mm)", "Hỗ trợ tản nhiệt AIO tối đa": "360 mm", "Kích thước tối đa VGA": "Chưa có dữ liệu", "Số quạt đi kèm": "Chưa có dữ liệu" }
  },
  {
    id: 2028,
    name: "Card màn hình Gigabyte Radeon RX 7800 XT GAMING OC 16GB",
    category: "GPU",
    condition: "Đã sử dụng - Fullbox còn bảo hành TLC 31 tháng",
    startingPrice: 11200000,
    currentBid: 12400000,
    bidStep: 200000,
    bidCount: 6,
    marketPriceNew: 15500000,
    endTime: new Date(Date.now() + 95 * 60 * 1000).toISOString(),
    seller: "nam_tech99",
    images: ["images/products/gpu/2028-rx-7800-xt-1.jpg"],
    specifications: { "Dung lượng VRAM / Chuẩn": "16GB GDDR6 (256-bit)", "Băng thông bộ nhớ": "19.5 Gbps", "Cổng kết nối": "2x HDMI 2.1a, 2x DisplayPort 2.1", "Nguồn đề xuất": "700W (2x 8-pin)" }
  },
  {
    id: 1012,
    name: "Intel Core i5-13600K",
    category: "CPU",
    condition: "Đã sử dụng - Còn bảo hành chính hãng đến 2026",
    startingPrice: 5100000,
    currentBid: 6600000,
    bidStep: 100000,
    bidCount: 15,
    marketPriceNew: 8200000,
    endTime: new Date(Date.now() + 130 * 60 * 1000).toISOString(),
    seller: "hoanglong_pc",
    images: ["images/products/cpu/1012-i5-13600k-1.jpg"],
    specifications: { "Socket": "LGA1700", "Số nhân / Số luồng": "14 nhân (6P + 8E) / 20 luồng", "Xung cơ bản / Xung Boost": "3.50 GHz / 5.10 GHz", "Bộ nhớ đệm (Cache)": "24 MB Intel Smart Cache", "TDP": "125 W" }
  }
];

let allProducts = [];
let endingSortMode = 'ending';
let hotFilterCategory = 'all';
let currentModalProduct = null;
let currentBidIncrement = 0;
const watchedProductIds = new Set();

/**
 * Đồng bộ tập ID đang theo dõi từ watchlist của tài khoản (dùng khi vẽ thẻ sản phẩm)
 */
function syncWatchedIds() {
  watchedProductIds.clear();
  getWatchlist().forEach(item => watchedProductIds.add(Number(typeof item === 'object' ? item.id : item)));
}

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

/**
 * Đồng bộ dữ liệu danh sách sản phẩm với LocalStorage (pcbid_products và pcbid_bids)
 * Giữ cho giá đấu hiện tại và số lượt bid luôn khớp hoàn toàn giữa các trang
 */
function syncProductsWithStorage(rawList) {
  let localProducts = [];
  try {
    localProducts = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
  } catch (e) {
    localProducts = [];
  }
  const localMap = new Map(localProducts.map(p => [Number(p.id), p]));

  let localBids = [];
  try {
    localBids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]');
  } catch (e) {
    localBids = [];
  }
  const bidSummary = new Map();
  localBids.forEach(b => {
    const pid = Number(b.productId);
    const amt = Number(b.amount) || 0;
    const curr = bidSummary.get(pid) || { maxBid: 0, count: 0 };
    curr.maxBid = Math.max(curr.maxBid, amt);
    curr.count += 1;
    bidSummary.set(pid, curr);
  });

  // 1. Cập nhật các sản phẩm đã có từ JSON
  const merged = rawList.map(rawItem => {
    const idNum = Number(rawItem.id);
    // Gộp với bản trong localStorage (phiên đăng lại / phiên đã chốt được xử lý trong helper)
    const p = mergeLocalProduct(rawItem, localMap.get(idNum));
    const bInfo = bidSummary.get(idNum);

    let curBid = Number(p.currentBid || p.startingPrice || 0);
    let bCount = Number(p.bidCount || 0);

    if (bInfo && !isAuctionClosed(p)) {
      if (bInfo.maxBid > curBid) curBid = bInfo.maxBid;
      bCount = Math.max(bCount, bInfo.count);
    }

    return {
      ...p,
      currentBid: curBid,
      bidCount: bCount,
      endTimestamp: getAuctionEndTimestamp(p),
      marketPriceNew: p.marketPriceNew && p.marketPriceNew > curBid ? p.marketPriceNew : Math.round(curBid * 1.5)
    };
  });

  // 2. Bổ sung các sản phẩm mới do người dùng tự đăng bán từ sell.html (chưa có trong JSON)
  const existingIds = new Set(merged.map(p => Number(p.id)));
  const customUserProducts = [];
  localProducts.forEach(lp => {
    const idNum = Number(lp.id);
    if (!existingIds.has(idNum)) {
      const bInfo = bidSummary.get(idNum);
      let curBid = Number(lp.currentBid || lp.startingPrice || 0);
      let bCount = Number(lp.bidCount || 0);
      if (bInfo) {
        if (bInfo.maxBid > curBid) curBid = bInfo.maxBid;
        bCount = Math.max(bCount, bInfo.count);
      }
      customUserProducts.push({
        ...lp,
        id: idNum,
        name: fixMojibake(lp.name || 'Linh kiện máy tính'),
        condition: fixMojibake(lp.condition || 'Đã sử dụng'),
        currentBid: curBid,
        bidCount: bCount,
        endTimestamp: getAuctionEndTimestamp(lp),
        marketPriceNew: Number(lp.marketPriceNew) || Math.round(curBid * 1.5)
      });
    }
  });

  // Trang chủ chỉ hiển thị các phiên còn mở
  return [...customUserProducts, ...merged].filter(p => !isAuctionClosed(p));
}

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
      const mapped = flattened.map(p => {
        // Thời điểm kết thúc thống nhất với trang chi tiết và trang hồ sơ
        const endTimestamp = getAuctionEndTimestamp(p);

        return {
          ...p,
          name: fixMojibake(p.name),
          condition: fixMojibake(p.condition),
          endTimestamp: endTimestamp,
          marketPriceNew: p.marketPriceNew || Math.round(p.currentBid * 1.85)
        };
      });
      allProducts = syncProductsWithStorage(mapped);
      return;
    }
  } catch (err) {
    console.warn('[PCBid] Không thể tải trực tiếp dữ liệu JSON qua mạng (ví dụ giao thức file://). Sử dụng nguồn hạt giống chất lượng cao:', err);
  }

  // Dự phòng hạt giống
  const mapped = FALLBACK_PRODUCTS.map(p => ({
    ...p,
    endTimestamp: getAuctionEndTimestamp(p)
  }));
  allProducts = syncProductsWithStorage(mapped);
}

/* ==========================================================================
   4. RENDER THẺ SẢN PHẨM (CARD COMPONENT BUILDER)
   ========================================================================== */

function getHardwareSeal(product) {
  // Tem theo kết quả PCBid Lab; phiên vừa đăng hiện "Chờ kiểm định"
  const modifier = isAwaitingInspection(product) ? 'pending' : 'pass';
  return `<span class="pcb-card__seal pcb-card__seal--${modifier}">${escapeHtml(getInspectionSeal(product))}</span>`;
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
  const isWatched = watchedProductIds.has(Number(product.id));
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
      <div class="pcb-card__countdown" data-timestamp="${product.endTimestamp}" data-start="${getCountdownStart(product)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <polyline points="12 7 12 12 15 15"></polyline>
        </svg>
        <span class="pcb-countdown-text">--:--:--</span>
      </div>
    `;
  } else if (options.isNew) {
    countdownMarkup = `
      <div class="pcb-card__countdown pcb-card__countdown--new">
        <span class="pcb-card__new-label">${icon('sparkles', { size: 11 })} MỚI LÊN SÀN</span>
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
        data-action="watch" data-id="${product.id}" aria-pressed="${isWatched}" aria-label="${isWatched ? 'Bỏ theo dõi phiên này' : 'Theo dõi phiên này'}">
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

          ${isAwaitingInspection(product) ? `
          <a href="${detailUrl}" class="pcb-card__btn pcb-card__btn--locked" title="Phiên mở đặt giá sau khi PCBid Lab kiểm định đạt">
            ${icon('microscope', { size: 14 })} Chờ kiểm định
          </a>` : `
          <button type="button" class="pcb-card__btn" data-action="quick-bid" data-id="${product.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
            Đặt giá nhanh
          </button>`}
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
    container.innerHTML = '<div class="pcb-shelf__empty">Chưa có phiên phù hợp trong nhóm này.</div>';
    return;
  }
  container.innerHTML = items.map(p => renderProductCard(p, { showCountdown: false })).join('');
}

/**
 * Cập nhật thẻ "Cạnh tranh nhất" ở Hero Banner theo sản phẩm có nhiều lượt bid nhất
 * (tránh hiển thị số liệu ghi cứng không khớp với dữ liệu thực tế)
 */
function renderCompetitivePromo() {
  renderHeroPromos();
}

/**
 * Rút gọn tên sản phẩm: bỏ tiền tố loại linh kiện để vừa khung thẻ nhỏ
 * @param {string} name - Tên đầy đủ
 * @returns {string}
 */
function shortProductName(name) {
  return String(name || '')
    .replace(/^(Card màn hình|Bộ vi xử lý|CPU|Bo mạch chủ|Mainboard|Bộ nguồn|Nguồn máy tính|Nguồn|RAM|Ổ cứng|SSD|Tản nhiệt khí|Tản nhiệt nước|Tản nhiệt|Vỏ máy tính|Vỏ case|Case)\s+/i, '');
}

/**
 * Điền một thẻ khuyến mãi ở Hero bằng sản phẩm thật và trỏ liên kết tới đúng trang chi tiết phiên
 * @param {string} cardId - ID thẻ trên HTML
 * @param {Object|undefined} product - Sản phẩm cần hiển thị
 * @param {string} subText - Dòng phụ bên dưới tên
 */
function fillHeroPromo(cardId, product, subText) {
  const card = document.getElementById(cardId);
  if (!card || !product) return;
  const titleEl = card.querySelector('[data-promo-title]');
  const subEl = card.querySelector('[data-promo-sub]');
  const imgEl = card.querySelector('[data-promo-img]');
  card.href = `product-detail.html?id=${product.id}`;
  card.dataset.productId = product.id;
  card.setAttribute('aria-label', product.name);
  card.title = product.name;
  if (titleEl) titleEl.textContent = shortProductName(product.name);
  if (subEl) subEl.textContent = subText;
  if (imgEl && product.images && product.images[0]) {
    imgEl.src = encodePath(product.images[0]);
    imgEl.alt = product.name;
  }
}

/**
 * Dòng phụ đếm ngược cho thẻ "Sắp hết giờ"
 * @param {number} endTimestamp - Thời điểm kết thúc phiên
 * @returns {string}
 */
function formatEndingSub(endTimestamp) {
  const minutes = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 60000));
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    return `Còn ${h} giờ ${minutes % 60} phút • Vào bid →`;
  }
  return `Còn ${minutes} phút • Vào bid →`;
}

/**
 * Cập nhật 4 thẻ nhỏ ở Hero theo dữ liệu thật: phiên sắp kết thúc nhất, phiên nhiều lượt bid nhất,
 * nguồn 80 Plus Gold giá tốt nhất và tản nhiệt được quan tâm nhất (chỉ lấy phiên còn đang diễn ra)
 */
function renderHeroPromos() {
  if (allProducts.length === 0) return;
  const now = Date.now();
  const active = allProducts.filter(p => !isAuctionClosed(p) && Number(p.endTimestamp) > now);
  if (active.length === 0) return;
  const byBids = (a, b) => (Number(b.bidCount) || 0) - (Number(a.bidCount) || 0);

  const ending = [...active].sort((a, b) => a.endTimestamp - b.endTimestamp)[0];
  const competitive = [...active].filter(p => p.id !== ending.id).sort(byBids)[0];
  const isGoldPsu = p => String(p.category).toUpperCase() === 'PSU'
    && /gold/i.test(`${p.name} ${Object.values(p.specifications || {}).join(' ')}`);
  const psu = active.filter(isGoldPsu).sort((a, b) => (Number(a.currentBid) || 0) - (Number(b.currentBid) || 0))[0];
  const cooling = active.filter(p => String(p.category).toUpperCase() === 'COOLING').sort(byBids)[0];

  fillHeroPromo('hero-promo-ending', ending, formatEndingSub(ending.endTimestamp));
  fillHeroPromo('hero-promo-competitive', competitive, `${competitive?.bidCount || 0} lượt bid • Xem ngay →`);
  fillHeroPromo('hero-promo-psu', psu, `Giá hiện tại ${formatVnd(psu?.currentBid)} →`);
  fillHeroPromo('hero-promo-cooling', cooling, `${cooling?.bidCount || 0} lượt bid • Xem ngay →`);
}

/**
 * Lấy sản phẩm tâm điểm của khung "Đang đấu trực tiếp" theo data-product-id trên HTML
 * @returns {Object|undefined}
 */
function getSpotlightProduct() {
  const card = document.getElementById('hero-spotlight');
  const id = Number(card?.dataset.productId) || 2028;
  return allProducts.find(p => Number(p.id) === id);
}

/**
 * Cập nhật khung "Đang đấu trực tiếp" theo dữ liệu thật (tên, ảnh, giá, lượt bid, liên kết chi tiết)
 * để khớp với trang chi tiết và kết quả tìm kiếm
 */
function renderSpotlight() {
  const card = document.getElementById('hero-spotlight');
  const product = getSpotlightProduct();
  if (!card || !product) return;

  const nameEl = card.querySelector('[data-spotlight-name]');
  const imgEl = card.querySelector('[data-spotlight-img]');
  const bidEl = card.querySelector('[data-spotlight-bid]');
  const countEl = card.querySelector('[data-spotlight-count]');
  const bidBtn = card.querySelector('[data-action="quick-bid"]');
  const detailUrl = `product-detail.html?id=${product.id}`;

  if (nameEl) {
    nameEl.textContent = product.name;
    nameEl.closest('h2')?.setAttribute('title', product.name);
  }
  if (imgEl && product.images && product.images[0]) {
    imgEl.src = encodePath(product.images[0]);
    imgEl.alt = product.name;
  }
  if (bidEl) bidEl.textContent = formatVnd(product.currentBid);
  if (countEl) countEl.textContent = `${product.bidCount || 0} lượt bid`;
  if (bidBtn) bidBtn.dataset.id = product.id;
  card.querySelectorAll('[data-spotlight-link]').forEach(link => { link.href = detailUrl; });
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
    // Phiên đang chờ kiểm định: đồng hồ đứng yên tới lúc có kết quả (data-start)
    const diff = getRemainingMs(end, el.getAttribute('data-start'), now);

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

  // Thẻ "Sắp hết giờ": cập nhật số phút còn lại; phiên đã kết thúc thì chọn lại phiên khác
  const endingCard = document.getElementById('hero-promo-ending');
  if (endingCard?.dataset.productId) {
    const endingItem = allProducts.find(p => Number(p.id) === Number(endingCard.dataset.productId));
    if (!endingItem || endingItem.endTimestamp <= now) {
      renderHeroPromos();
    } else {
      const subEl = endingCard.querySelector('[data-promo-sub]');
      const text = formatEndingSub(endingItem.endTimestamp);
      if (subEl && subEl.textContent !== text) subEl.textContent = text;
    }
  }

  // Cập nhật đồng hồ spotlight trên hero theo sản phẩm tâm điểm
  const heroTimer = document.getElementById('hero-spotlight-timer');
  if (heroTimer) {
    const spotlightItem = getSpotlightProduct();
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

// Số lượt đặt giá mới nhất hiển thị trên băng chuyền
const TICKER_LIMIT = 12;
let tickerIndex = 0;
let tickerProductMap = new Map();

/**
 * Hiển thị khoảng thời gian tương đối, ví dụ "12 giây trước"
 * @param {string} iso - Thời điểm dạng ISO
 * @returns {string}
 */
function formatTimeAgo(iso) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 5) return 'vừa xong';
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

/**
 * Lấy các lượt đặt giá thật mới nhất (bot + mọi tài khoản) để hiển thị trên băng chuyền
 * @returns {Array}
 */
function getLatestTickerBids() {
  return readAllBids()
    .filter(b => tickerProductMap.has(Number(b.productId)) && b.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, TICKER_LIMIT);
}

/**
 * Render băng chuyền: tên người đặt mở hồ sơ công khai, tên linh kiện mở trang chi tiết phiên
 * @param {string|null} [newBidId] - ID lượt vừa đặt để làm nổi bật
 */
function renderLiveTicker(newBidId = null) {
  const track = document.getElementById('pcb-ticker-track');
  if (!track) return;
  const bids = getLatestTickerBids();

  if (!bids.length) {
    track.innerHTML = '<div class="pcb-ticker__item">Đang chờ lượt đặt giá đầu tiên...</div>';
    tickerIndex = 0;
    track.style.transform = 'translateY(0)';
    return;
  }

  track.innerHTML = bids.map(bid => {
    const product = tickerProductMap.get(Number(bid.productId));
    const bidder = describeBidder(bid);
    const account = findAccount({ id: bid.bidderId, username: bid.bidderName });
    const nameHtml = account?.username
      ? `<a class="pcb-ticker__user" href="profile.html?user=${encodeURIComponent(account.username)}">${escapeHtml(bidder.name)}</a>`
      : `<strong>${escapeHtml(bidder.name)}</strong>`;
    return `
      <div class="pcb-ticker__item${bid.id === newBidId ? ' pcb-ticker__item--new' : ''}">
        <span class="pcb-ticker__text"><span class="pcb-ticker__flame">${icon('flame', { size: 14 })}</span> ${nameHtml} vừa đặt <span class="pcb-ticker__price">${formatVnd(bid.amount)}</span> cho
          <a class="pcb-ticker__product" href="product-detail.html?id=${product.id}">${escapeHtml(product.name)}</a></span>
        <span class="pcb-ticker__time" data-time="${escapeHtml(bid.timestamp)}">• ${formatTimeAgo(bid.timestamp)}</span>
      </div>
    `;
  }).join('');

  // Có lượt mới thì quay về dòng đầu tiên (lượt mới nhất)
  if (newBidId || tickerIndex >= bids.length) tickerIndex = 0;
  track.style.transform = `translateY(-${tickerIndex * 22}px)`;
}

/**
 * Cập nhật liên kết "Xem tất cả N phiên đang mở" theo số phiên thật chưa kết thúc
 * (catalog + phiên người dùng tự đăng, bỏ phiên đã hết giờ / đã đóng)
 * @param {Array} auctions - Danh sách phiên từ loadAllAuctions()
 */
function updateOpenAuctionCount(auctions) {
  const el = document.getElementById('pcb-open-count-link');
  if (!el) return;
  const openCount = auctions.filter(p => !isAuctionClosed(p)).length;
  el.textContent = `Xem tất cả ${openCount} phiên đang mở`;
}

/**
 * Khởi động băng chuyền hoạt động trực tiếp, cập nhật theo thời gian thực
 */
async function initLiveTicker() {
  const track = document.getElementById('pcb-ticker-track');
  if (!track) return;

  const auctions = await loadAllAuctions();
  tickerProductMap = new Map(auctions.map(p => [Number(p.id), p]));
  renderLiveTicker();
  updateOpenAuctionCount(auctions);
  // Phiên hết giờ trong lúc đang xem trang: đếm lại mỗi 30 giây
  setInterval(async () => updateOpenAuctionCount(await loadAllAuctions()), 30000);

  // Tự cuộn sang lượt tiếp theo; dừng khi người dùng rê chuột để kịp bấm vào liên kết
  let paused = false;
  track.addEventListener('mouseenter', () => { paused = true; });
  track.addEventListener('mouseleave', () => { paused = false; });
  track.addEventListener('focusin', () => { paused = true; });
  track.addEventListener('focusout', () => { paused = false; });
  setInterval(() => {
    if (paused) return;
    const count = track.children.length;
    if (count <= 1) return;
    tickerIndex = (tickerIndex + 1) % count;
    track.style.transform = `translateY(-${tickerIndex * 22}px)`;
  }, 3800);

  // Cập nhật nhãn "x giây trước" mỗi 5 giây
  setInterval(() => {
    track.querySelectorAll('.pcb-ticker__time[data-time]').forEach(el => {
      el.textContent = `• ${formatTimeAgo(el.dataset.time)}`;
    });
  }, 5000);

  // Lượt đặt mới trong tab này (bot) hoặc từ tab khác (sự kiện storage)
  const refresh = async (newBidId) => {
    const latest = await loadAllAuctions();
    tickerProductMap = new Map(latest.map(p => [Number(p.id), p]));
    renderLiveTicker(newBidId);
    updateOpenAuctionCount(latest);
  };
  window.addEventListener('pcbid:bid-placed', e => refresh(e.detail?.id || null));
  window.addEventListener('storage', e => {
    if (e.key === 'pcbid_bids' && e.isTrusted) {
      const newest = getLatestTickerBids()[0];
      refresh(newest ? newest.id : null);
    }
  });
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
  // Phiên chưa qua kiểm định: chưa mở đặt giá, chuyển sang trang chi tiết để xem trạng thái
  if (isAwaitingInspection(product)) {
    window.location.href = `product-detail.html?id=${product.id}`;
    return;
  }

  currentModalProduct = product;
  const step = product.bidStep || 100000;
  currentBidIncrement = step;

  const modalBackdrop = document.getElementById('pcb-bid-modal');
  if (!modalBackdrop) return;

  document.getElementById('pcb-modal-img').src = product.images && product.images[0] ? encodePath(product.images[0]) : 'images/placeholder-product.svg';
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
  updateModalWalletStatus(total);
}

/**
 * Hiển thị số dư khả dụng và số tiền cọc 10% cần giữ trong modal đặt giá nhanh
 * @param {number} total - Mức giá đang chọn
 */
function updateModalWalletStatus(total) {
  const statusEl = document.getElementById('pcb-modal-wallet-status');
  const labelEl = document.getElementById('pcb-modal-wallet-label');
  if (!statusEl || !currentModalProduct) return;

  const user = readCurrentUser();
  if (!user) {
    if (labelEl) labelEl.textContent = 'Ví cọc tạm ứng mô phỏng:';
    statusEl.textContent = 'Đăng nhập để đặt giá';
    statusEl.style.color = '';
    return;
  }

  const check = checkBidDeposit(user, currentModalProduct.id, total);
  if (labelEl) labelEl.textContent = `Khả dụng ${formatVnd(getAvailableBalance(user))} • Cọc 10%:`;
  statusEl.textContent = `${formatVnd(check.required)} ${check.ok ? '(Đủ điều kiện)' : '(Không đủ số dư)'}`;
  statusEl.style.color = check.ok ? '' : '#dc2626';
}

function closeQuickBidModal() {
  const modalBackdrop = document.getElementById('pcb-bid-modal');
  if (modalBackdrop) modalBackdrop.classList.remove('pcb-modal-backdrop--active');
  currentModalProduct = null;
}

function executeQuickBid() {
  if (!currentModalProduct) return;

  const newBid = currentModalProduct.currentBid + currentBidIncrement;

  // Bắt buộc đăng nhập và đủ số dư khả dụng để giữ cọc 10% trước khi đặt giá
  const bidUser = readCurrentUser();
  if (!bidUser) {
    showToast('Bạn cần đăng nhập để đặt giá. Đang chuyển hướng...', 'error');
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    return;
  }
  const depositCheck = checkBidDeposit(bidUser, currentModalProduct.id, newBid);
  if (!depositCheck.ok) {
    showToast(`Số dư khả dụng ${formatVnd(depositCheck.available)} không đủ giữ cọc 10% (${formatVnd(depositCheck.required)}). Hãy nạp thêm tiền ở trang Hồ sơ.`, 'error');
    return;
  }
  currentModalProduct.currentBid = newBid;
  currentModalProduct.bidCount = (currentModalProduct.bidCount || 0) + 1;

  // Cập nhật trực quan trên tất cả các thẻ card cùng sản phẩm này ở giao diện
  const matchingCards = document.querySelectorAll(`.pcb-card[data-id="${currentModalProduct.id}"]`);
  matchingCards.forEach(card => {
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
  });

  // Đồng bộ trong mảng allProducts đang chạy
  const inMemory = allProducts.find(p => Number(p.id) === Number(currentModalProduct.id));
  if (inMemory) {
    inMemory.currentBid = newBid;
    inMemory.bidCount = currentModalProduct.bidCount;
  }

  // Đồng bộ lưu lượt đặt giá vào LocalStorage (pcbid_bids, pcbid_products & pcbid_my_auctions_participating)
  try {
    const user = JSON.parse(localStorage.getItem('pcbid_currentUser') || localStorage.getItem('pcbid_user') || '{"username":"pcbuilder99"}');
    const bids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]');
    bids.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      productId: currentModalProduct.id,
      // Định danh người đặt bằng ID tài khoản (không trùng), kèm họ tên để hiển thị
      bidderId: user.id || null,
      bidderFullname: user.fullname || user.username || '',
      bidderName: user.username || 'pcbuilder99',
      amount: newBid,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('pcbid_bids', JSON.stringify(bids));

    // Đồng bộ vào pcbid_products để các trang products.html và product-detail.html luôn khớp giá
    const localProducts = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
    const lpIdx = localProducts.findIndex(p => Number(p.id) === Number(currentModalProduct.id));
    if (lpIdx >= 0) {
      localProducts[lpIdx].currentBid = newBid;
      localProducts[lpIdx].bidCount = currentModalProduct.bidCount;
    } else {
      localProducts.push({
        ...currentModalProduct,
        currentBid: newBid,
        bidCount: currentModalProduct.bidCount
      });
    }
    localStorage.setItem('pcbid_products', JSON.stringify(localProducts));
    // Có người dùng thật tham gia: chốt thời điểm kết thúc của phiên
    lockAuctionEndTime(currentModalProduct);
    // Báo cho Header và các khu vực khác cập nhật số dư ví, thông báo ngay trên trang này
    window.dispatchEvent(new CustomEvent('pcbid:bid-placed', { detail: { productId: currentModalProduct.id } }));

    const participating = JSON.parse(localStorage.getItem('pcbid_my_auctions_participating') || '[]');
    const pIdx = participating.findIndex(p => Number(p.id) === Number(currentModalProduct.id));
    const pItem = {
      id: currentModalProduct.id,
      name: currentModalProduct.name,
      category: currentModalProduct.category,
      currentBid: newBid,
      myBid: newBid,
      bidCount: currentModalProduct.bidCount,
      status: 'lead',
      bidStep: currentModalProduct.bidStep || 100000,
      endTimestamp: getAuctionEndTimestamp(currentModalProduct),
      images: currentModalProduct.images || [],
      specs: currentModalProduct.specifications ? Object.entries(currentModalProduct.specifications).slice(0, 2).map(([k, v]) => `${k}: ${v}`) : []
    };
    if (pIdx >= 0) participating[pIdx] = pItem;
    else participating.unshift(pItem);
    localStorage.setItem('pcbid_my_auctions_participating', JSON.stringify(participating));
  } catch (e) {
    console.warn('[PCBid] Không thể lưu lượt đặt giá nhanh:', e);
  }

  // Phát âm thanh & Thông báo thành công
  playBidSuccessSound();
  // Cập nhật khung "Đang đấu trực tiếp" nếu vừa trả giá cho sản phẩm tâm điểm
  renderSpotlight();
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
  // 1. Tải dữ liệu sản phẩm và danh sách theo dõi của tài khoản
  await loadProducts();
  syncWatchedIds();

  // 2. Render các thành phần kệ hàng ban đầu
  renderEndingSoonShelf();
  renderHotAuctionsShelf();
  renderNewListingsShelf();
  renderCompetitivePromo();
  renderSpotlight();

  // 3. Khởi tạo băng chuyền hoạt động sàn
  initLiveTicker();

  // 4. Kích hoạt bộ đếm thời gian thực (chạy mỗi 1 giây)
  updateAllCountdowns();
  setInterval(updateAllCountdowns, 1000);

  // 5. Sự kiện chuyển tab sắp xếp trên kệ "Sắp kết thúc"
  const endingTabs = document.querySelectorAll('[data-ending-tab]');
  endingTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      endingTabs.forEach(t => {
        t.classList.remove('pcb-shelf__tab--active');
        t.setAttribute('aria-pressed', 'false');
      });
      tab.classList.add('pcb-shelf__tab--active');
      tab.setAttribute('aria-pressed', 'true');
      endingSortMode = tab.dataset.endingTab;
      renderEndingSoonShelf();
    });
  });

  // 6. Sự kiện chuyển tab lọc danh mục trên kệ "Đấu giá nổi bật"
  const hotTabs = document.querySelectorAll('[data-hot-tab]');
  hotTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      hotTabs.forEach(t => {
        t.classList.remove('pcb-shelf__tab--active');
        t.setAttribute('aria-pressed', 'false');
      });
      tab.classList.add('pcb-shelf__tab--active');
      tab.setAttribute('aria-pressed', 'true');
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
      const product = allProducts.find(p => Number(p.id) === prodId) || { id: prodId };
      // Lưu vào watchlist của tài khoản; chưa đăng nhập thì chuyển sang trang đăng nhập
      const watched = toggleWatch(product);
      if (watched === null) {
        showToast('Bạn cần đăng nhập để theo dõi phiên đấu giá.', 'info');
        setTimeout(() => { window.location.href = `login.html?redirect=${encodeURIComponent('index.html')}`; }, 1200);
        return;
      }
      syncWatchedIds();
      // Cùng một phiên có thể xuất hiện ở nhiều kệ: cập nhật mọi nút của phiên đó
      document.querySelectorAll(`[data-action="watch"][data-id="${prodId}"]`).forEach(btn => setWatchButtonState(btn, watched));
      showToast(watched ? 'Đã thêm vào danh sách theo dõi' : 'Đã bỏ theo dõi phiên này');
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
    if (e.target.closest('#btn-open-cert, [data-open-cert]')) {
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

  // Lắng nghe khi quay lại trang qua back/forward cache của trình duyệt (bfcache)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      loadProducts().then(() => {
        renderEndingSoonShelf();
        renderHotAuctionsShelf();
        renderNewListingsShelf();
        renderCompetitivePromo();
        renderSpotlight();
      });
    }
  });

  // Lắng nghe thay đổi dữ liệu đấu giá từ các tab/cửa sổ khác (Storage Event)
  window.addEventListener('storage', (e) => {
    if (e.key === 'pcbid_products' || e.key === 'pcbid_bids') {
      loadProducts().then(() => {
        renderEndingSoonShelf();
        renderHotAuctionsShelf();
        renderNewListingsShelf();
        renderCompetitivePromo();
        renderSpotlight();
      });
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
