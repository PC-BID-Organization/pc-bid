/**
 * PCBid - Tập lệnh Trang Danh Sách Sản Phẩm & Bộ Lọc (products.html)
 * Quản lý bộ lọc đa tiêu chí (danh mục, mức giá, tình trạng cũ, sắp xếp, phân trang)
 * 100% Vanilla JavaScript (ES6+), Thao tác DOM trực tiếp, Không framework.
 * Toàn bộ chú thích bằng Tiếng Việt có dấu theo quy định AGENTS.md.
 */

// Bộ icon Lucide dùng chung
import { icon } from './icons.js';
// Người đang đăng nhập (chỉ người bán mới thấy nhãn "Bạn vừa đăng")
import { readLoggedInUser } from './user-data.js';
// Hàm tính thời điểm kết thúc phiên dùng chung cho mọi trang
import { getAuctionEndTimestamp, isAuctionClosed, mergeLocalProduct } from './auction-time.js';
// Trạng thái kiểm định của phiên (chờ kiểm định / đã gắn tem)
import { isAwaitingInspection, getInspectionSeal, getCountdownStart, getRemainingMs } from './inspection.js';
// Danh sách theo dõi lưu theo tài khoản (dùng chung với Trang chủ, trang chi tiết, Header)
import { isWatched, toggleWatch, setWatchButtonState } from './watchlist.js';
// Hộp thoại xác nhận dùng chung
import { showConfirm } from './dialog.js';
// Ô chọn tùy biến thay cho hộp chọn mặc định của trình duyệt
import { enhanceSelect } from './custom-select.js';


/* ==========================================================================
   1. CẤU HÌNH & NGUỒN DỮ LIỆU SẢN PHẨM
   ========================================================================== */

const DATA_SOURCES = [
  { key: 'gpu', path: 'data/gpu.json', label: 'VGA', category: 'GPU' },
  { key: 'cpu', path: 'data/cpu.json', label: 'CPU', category: 'CPU' },
  { key: 'mainboard', path: 'data/mainboard.json', label: 'Mainboard', category: 'Mainboard' },
  { key: 'ram', path: 'data/ram.json', label: 'RAM', category: 'RAM' },
  { key: 'storage', path: 'data/storage.json', label: 'SSD', category: 'SSD' },
  { key: 'psu', path: 'data/psu.json', label: 'PSU', category: 'PSU' },
  { key: 'cooling', path: 'data/cooling.json', label: 'Tản nhiệt', category: 'Cooling' },
  { key: 'case', path: 'data/case.json', label: 'Case', category: 'Case' }
];

/* ==========================================================================
   2. TRẠNG THÁI TOÀN TRANG (APPLICATION STATE)
   ========================================================================== */

let rawProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 12; // 12 sản phẩm mỗi trang (chia đều lưới 4 hoặc 3 cột)

// Trạng thái bộ lọc tìm kiếm
const filterState = {
  categories: ['all'],
  priceRange: 'all', // 'all', '0-1000000', ... hoặc 'custom'
  minPrice: null,
  maxPrice: null,
  conditions: [],
  seals: [],
  sortBy: 'ending',
  // ID phiên người bán vừa đăng (products.html?highlight=...), được đưa lên đầu và gắn nhãn
  highlightId: null,
  searchQuery: ''
};

// Khởi chạy khi tài liệu DOM hoàn tất nạp
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Phân tích tham số từ URL (ví dụ: products.html?category=vga&q=rtx)
  parseUrlParams();

  // 2. Thu thập dữ liệu tĩnh sẵn có từ DOM (đảm bảo hiển thị ngay cả khi chạy giao thức file:///)
  parseStaticCardsFromDOM();

  // 3. Cố gắng tải thêm dữ liệu từ JSON nếu môi trường hỗ trợ fetch
  await loadAllProducts();

  // 4. Khởi tạo các bộ lắng nghe sự kiện (Event Listeners)
  initFilterEventListeners();

  // 5. Gắn sự kiện click vào các thẻ card điều hướng sang trang chi tiết
  attachCardClickEvents();

  // 6. Áp dụng bộ lọc và render danh sách ra giao diện
  applyFiltersAndRender();

  // 7. Kích hoạt bộ đếm thời gian đếm ngược thời gian thực
  setInterval(updateLiveCountdowns, 1000);

  // 8. Lắng nghe bfcache và storage để cập nhật giá phiên đấu giá theo thời gian thực
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      loadAllProducts().then(() => {
        applyFiltersAndRender();
      });
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'pcbid_products' || e.key === 'pcbid_bids') {
      loadAllProducts().then(() => {
        applyFiltersAndRender();
      });
    }
  });
});

/* ==========================================================================
   3. PHÂN TÍCH THAM SỐ URL (QUERY PARAMS)
   ========================================================================== */
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  
  const cat = params.get('category');
  if (cat && cat !== 'all') {
    filterState.categories = [cat.toLowerCase()];
    // Cập nhật giao diện checkbox tương ứng
    const checkboxes = document.querySelectorAll('input[name="category"]');
    checkboxes.forEach(cb => {
      if (cb.value.toLowerCase() === cat.toLowerCase()) {
        cb.checked = true;
      } else {
        cb.checked = false;
      }
    });
  }

  const query = params.get('q');
  if (query) {
    filterState.searchQuery = query.trim().toLowerCase();
  }

  // Xử lý tham số status từ Header Nav ("Phiên đang Hot 🔥", "Sắp kết thúc")
  // và tham số sort từ Trang chủ (ví dụ: products.html?sort=bids cho nút "Cạnh tranh nhất")
  const status = params.get('status');
  const sort = (params.get('sort') || '').toLowerCase();
  const highlight = params.get('highlight');
  if (highlight) filterState.highlightId = String(highlight);
  const sortAliases = {
    'bids': 'bids-desc',
    'bids-desc': 'bids-desc',
    'hot': 'bids-desc',
    'ending': 'ending',
    'time-asc': 'ending',
    'price-asc': 'price-asc',
    'price-desc': 'price-desc',
    'newest': 'newest'
  };

  let sortValue = null;
  if (sortAliases[sort]) {
    sortValue = sortAliases[sort];
  } else if (status === 'hot') {
    sortValue = 'bids-desc';
  } else if (status === 'ending') {
    sortValue = 'ending';
  }

  if (sortValue) {
    filterState.sortBy = sortValue;
    // Đồng bộ giá trị ô chọn sắp xếp trên thanh công cụ
    const sortSelect = document.getElementById('catalog-sort');
    if (sortSelect) sortSelect.value = sortValue;
  }
}

/* ==========================================================================
   4. THU THẬP DỮ LIỆU TĨNH TỪ DOM & TẢI TỪ FILE JSON (DATA LOADER)
   ========================================================================== */
function parseStaticCardsFromDOM() {
  const staticCards = document.querySelectorAll('#catalog-products-grid .pcb-card');
  if (staticCards.length === 0) return;

  const collected = [];
  staticCards.forEach(card => {
    const id = parseInt(card.getAttribute('data-id'), 10) || Math.floor(Math.random() * 10000);
    const category = card.getAttribute('data-category') || 'PC';
    const price = parseInt(card.getAttribute('data-price'), 10) || 0;
    const bids = parseInt(card.getAttribute('data-bids'), 10) || 0;
    const name = card.querySelector('.pcb-card__title')?.textContent.trim() || 'Linh kiện PC';
    const image = card.querySelector('.pcb-card__img')?.getAttribute('src') || '';
    const condition = card.querySelector('.pcb-card__condition')?.textContent.trim() || 'Đã sử dụng';

    collected.push({
      id,
      name,
      category,
      condition,
      currentBid: price,
      marketPriceNew: price * 1.5,
      bidCount: bids,
      endTimestamp: getAuctionEndTimestamp({ id }),
      images: [image],
      specifications: {}
    });
  });

  if (collected.length > 0) {
    rawProducts = collected;
  }
}

async function loadAllProducts() {
  let fetchedItems = [];

  // Tải đồng thời tất cả các tệp json danh mục nếu có web server
  try {
    const fetchPromises = DATA_SOURCES.map(async (src) => {
      try {
        const res = await fetch(src.path);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const list = await res.json();
        return list.map(item => normalizeProduct(item, src.category));
      } catch (e) {
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    results.forEach(list => {
      fetchedItems.push(...list);
    });
  } catch (err) {
    // Không làm gián đoạn nếu chạy offline
  }

  if (fetchedItems.length === 0) {
    fetchedItems = [...rawProducts];
  }

  // Đọc dữ liệu cập nhật từ LocalStorage (pcbid_products & pcbid_bids)
  try {
    const localItems = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
    const localMap = new Map(localItems.map(item => [Number(item.id), item]));

    // Đọc lịch sử đặt giá để xác định giá dẫn đầu thực tế
    const localBids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]');
    const bidSummary = new Map();
    localBids.forEach(b => {
      const pid = Number(b.productId);
      const amt = Number(b.amount) || 0;
      const curr = bidSummary.get(pid) || { maxBid: 0, count: 0 };
      curr.maxBid = Math.max(curr.maxBid, amt);
      curr.count += 1;
      bidSummary.set(pid, curr);
    });

    // 1. Đồng bộ các sản phẩm đã có từ JSON với giá và lượt bid mới nhất
    const mergedList = fetchedItems.map(rawItem => {
      const idNum = Number(rawItem.id);
      // Gộp với bản trong localStorage (phiên đăng lại / phiên đã chốt được xử lý trong helper)
      const item = mergeLocalProduct(rawItem, localMap.get(idNum));
      const bInfo = bidSummary.get(idNum);

      let curBid = Number(item.currentBid);
      let bCount = Number(item.bidCount || 0);

      if (bInfo && !isAuctionClosed(item)) {
        if (bInfo.maxBid > curBid) curBid = bInfo.maxBid;
        bCount = Math.max(bCount, bInfo.count);
      }

      return {
        ...item,
        currentBid: curBid,
        bidCount: bCount,
        endTimestamp: getAuctionEndTimestamp(item),
        marketPriceNew: item.marketPriceNew && item.marketPriceNew > curBid ? item.marketPriceNew : Math.round(curBid * 1.5)
      };
    });

    // 2. Bổ sung các sản phẩm mới do người dùng tự đăng bán từ sell.html (chưa có trong JSON)
    const existingIds = new Set(mergedList.map(item => Number(item.id)));
    const customUserItems = [];
    localItems.forEach(item => {
      const idNum = Number(item.id);
      if (!existingIds.has(idNum)) {
        const bInfo = bidSummary.get(idNum);
        let curBid = Number(item.currentBid || item.startingPrice || 0);
        let bCount = Number(item.bidCount || 0);
        if (bInfo) {
          if (bInfo.maxBid > curBid) curBid = bInfo.maxBid;
          bCount = Math.max(bCount, bInfo.count);
        }
        customUserItems.push(normalizeProduct({
          ...item,
          currentBid: curBid,
          bidCount: bCount
        }, item.category || 'PC'));
      }
    });

    // Chỉ hiển thị các phiên còn mở trên sàn; phiên đã bán / đã kết thúc vẫn xem được qua link chi tiết
    rawProducts = [...customUserItems, ...mergedList].filter(p => !isAuctionClosed(p));
  } catch (e) {
    console.warn('[PCBid] Lỗi đồng bộ giá products:', e);
    if (fetchedItems.length > 0) rawProducts = fetchedItems.filter(p => !isAuctionClosed(p));
  }

  // Cập nhật số lượng đếm trên tiêu đề và sidebar
  updateSidebarCategoryCounts();
}

/**
 * Chuẩn hóa đối tượng sản phẩm để đảm bảo trường dữ liệu đồng nhất
 */
function normalizeProduct(p, defaultCategory) {
  const cat = p.category || defaultCategory || 'Khác';
  // Thời điểm kết thúc thống nhất với trang chi tiết và trang hồ sơ
  const endTimestamp = getAuctionEndTimestamp(p);

  return {
    ...p,
    category: cat,
    endTimestamp,
    currentBid: Number(p.currentBid || p.startingPrice || 0),
    marketPriceNew: Number(p.marketPriceNew || (p.currentBid ? p.currentBid * 1.5 : 2000000)),
    bidCount: Number(p.bidCount || 0)
  };
}

/**
 * Cập nhật số lượng sản phẩm tương ứng trong từng danh mục trên Sidebar
 */
function updateSidebarCategoryCounts() {
  const totalCountEl = document.getElementById('count-cat-all');
  if (totalCountEl) totalCountEl.textContent = rawProducts.length;

  const heroStatTotal = document.getElementById('hero-stat-total');
  if (heroStatTotal) heroStatTotal.textContent = `${rawProducts.length}+`;

  const counts = {
    vga: 0,
    cpu: 0,
    mainboard: 0,
    ram: 0,
    storage: 0,
    psu: 0,
    cooling: 0,
    case: 0
  };

  rawProducts.forEach(p => {
    const c = String(p.category).toLowerCase();
    if (c.includes('gpu') || c.includes('vga')) counts.vga++;
    else if (c.includes('cpu')) counts.cpu++;
    else if (c.includes('main') || c.includes('bo mạch')) counts.mainboard++;
    else if (c.includes('ram')) counts.ram++;
    else if (c.includes('ssd') || c.includes('hdd') || c.includes('storage') || c.includes('ổ cứng')) counts.storage++;
    else if (c.includes('psu') || c.includes('nguồn')) counts.psu++;
    else if (c.includes('cool') || c.includes('tản')) counts.cooling++;
    else if (c.includes('case') || c.includes('vỏ')) counts.case++;
  });

  Object.entries(counts).forEach(([k, val]) => {
    const el = document.getElementById(`count-cat-${k}`);
    if (el) el.textContent = val;
  });
}

/* ==========================================================================
   5. BỘ LẮNG NGHE SỰ KIỆN TƯƠNG TÁC (EVENT LISTENERS)
   ========================================================================== */
function initFilterEventListeners() {
  // Lắng nghe chọn checkbox danh mục
  const catCheckboxes = document.querySelectorAll('input[name="category"]');
  catCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'all') {
        if (e.target.checked) {
          catCheckboxes.forEach(other => { if (other.value !== 'all') other.checked = false; });
          filterState.categories = ['all'];
        } else {
          e.target.checked = true; // Luôn giữ ít nhất 1 lựa chọn
        }
      } else {
        const allCb = document.querySelector('input[name="category"][value="all"]');
        if (allCb) allCb.checked = false;

        const checkedList = Array.from(catCheckboxes)
          .filter(c => c.checked && c.value !== 'all')
          .map(c => c.value);

        if (checkedList.length === 0) {
          if (allCb) allCb.checked = true;
          filterState.categories = ['all'];
        } else {
          filterState.categories = checkedList;
        }
      }
      currentPage = 1;
      applyFiltersAndRender();
    });
  });

  // Lắng nghe chọn radio mức giá
  const priceRadios = document.querySelectorAll('input[name="price_range"]');
  priceRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      filterState.priceRange = e.target.value;
      const minInput = document.getElementById('price-min');
      const maxInput = document.getElementById('price-max');
      if (minInput) minInput.value = '';
      if (maxInput) maxInput.value = '';
      filterState.minPrice = null;
      filterState.maxPrice = null;

      currentPage = 1;
      applyFiltersAndRender();
    });
  });

  // Nút áp dụng giá tự do
  const applyPriceBtn = document.getElementById('apply-price-btn');
  if (applyPriceBtn) {
    applyPriceBtn.addEventListener('click', () => {
      const minInput = document.getElementById('price-min');
      const maxInput = document.getElementById('price-max');
      const min = minInput.value ? parseInt(minInput.value, 10) : 0;
      const max = maxInput.value ? parseInt(maxInput.value, 10) : Infinity;

      filterState.priceRange = 'custom';
      filterState.minPrice = min;
      filterState.maxPrice = max;

      priceRadios.forEach(r => { r.checked = false; });

      currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // Lắng nghe checkbox tình trạng
  const conditionCheckboxes = document.querySelectorAll('input[name="condition"]');
  conditionCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      filterState.conditions = Array.from(conditionCheckboxes)
        .filter(c => c.checked)
        .map(c => c.value);
      currentPage = 1;
      applyFiltersAndRender();
    });
  });

  // Lắng nghe checkbox kiểm định seal
  const sealCheckboxes = document.querySelectorAll('input[name="seal"]');
  sealCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      filterState.seals = Array.from(sealCheckboxes)
        .filter(c => c.checked)
        .map(c => c.value);
      currentPage = 1;
      applyFiltersAndRender();
    });
  });

  // Lắng nghe thay đổi sắp xếp
  const sortSelect = document.getElementById('catalog-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      filterState.sortBy = e.target.value;
      currentPage = 1;
      applyFiltersAndRender();
    });
  }

  // Nút thiết lập lại bộ lọc
  const resetBtn = document.getElementById('reset-filter-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetAllFilters();
    });
  }

  // Nút "Xóa toàn bộ bộ lọc" trong trạng thái không có kết quả (được vẽ lại nên dùng ủy quyền sự kiện)
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-reset-filters]')) resetAllFilters();
  });

  // Ngăn trượt bộ lọc trên điện thoại / máy tính bảng
  initFilterDrawer();

  // Ô "Sắp xếp theo" dùng danh sách xổ xuống cùng phong cách PCBid (giống nhau trên máy tính và điện thoại)
  enhanceSelect(document.getElementById('catalog-sort'));

  // Lắng nghe sự kiện phân trang
  const paginationContainer = document.getElementById('pcb-pagination');
  if (paginationContainer) {
    // Ô "Đến trang": gõ số trang rồi Enter hoặc bấm Đi; số ngoài khoảng được đưa về trang đầu / cuối
    paginationContainer.addEventListener('submit', (e) => {
      if (!e.target.matches('[data-page-jump]')) return;
      e.preventDefault();
      const input = e.target.querySelector('.pcb-pagination__jump-input');
      const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
      const pageNum = parseInt(input?.value, 10);
      if (isNaN(pageNum)) {
        input?.focus();
        return;
      }
      const target = Math.min(totalPages, Math.max(1, pageNum));
      if (target !== currentPage) {
        currentPage = target;
        renderCurrentPage();
        scrollToTop();
      } else if (input) {
        input.value = '';
      }
    });

    paginationContainer.addEventListener('click', (e) => {
      const target = e.target.closest('[data-page]');
      if (!target) return;
      e.preventDefault();

      const pageAction = target.getAttribute('data-page');
      const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

      if (pageAction === 'prev') {
        if (currentPage > 1) {
          currentPage--;
          renderCurrentPage();
          scrollToTop();
        }
      } else if (pageAction === 'next') {
        if (currentPage < totalPages) {
          currentPage++;
          renderCurrentPage();
          scrollToTop();
        }
      } else {
        const pageNum = parseInt(pageAction, 10);
        if (!isNaN(pageNum) && pageNum !== currentPage) {
          currentPage = pageNum;
          renderCurrentPage();
          scrollToTop();
        }
      }
    });
  }
}

/**
 * Cuộn nhẹ lên đầu lưới sản phẩm khi chuyển trang
 */
function scrollToTop() {
  const topElem = document.querySelector('.pcb-catalog');
  if (topElem) {
    topElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Khôi phục tất cả bộ lọc về mặc định
 */
function resetAllFilters() {
  filterState.categories = ['all'];
  filterState.priceRange = 'all';
  filterState.minPrice = null;
  filterState.maxPrice = null;
  filterState.conditions = [];
  filterState.seals = [];
  filterState.searchQuery = '';
  filterState.sortBy = 'ending';

  const catCheckboxes = document.querySelectorAll('input[name="category"]');
  catCheckboxes.forEach(cb => { cb.checked = (cb.value === 'all'); });

  const priceRadios = document.querySelectorAll('input[name="price_range"]');
  priceRadios.forEach(radio => { radio.checked = (radio.value === 'all'); });

  const conditionCheckboxes = document.querySelectorAll('input[name="condition"]');
  conditionCheckboxes.forEach(cb => { cb.checked = false; });

  const sealCheckboxes = document.querySelectorAll('input[name="seal"]');
  sealCheckboxes.forEach(cb => { cb.checked = false; });

  const minInput = document.getElementById('price-min');
  const maxInput = document.getElementById('price-max');
  if (minInput) minInput.value = '';
  if (maxInput) maxInput.value = '';

  const sortSelect = document.getElementById('catalog-sort');
  if (sortSelect) sortSelect.value = 'ending';

  currentPage = 1;
  applyFiltersAndRender();
}

/* ==========================================================================
   6. BỘ XỬ LÝ LỌC & SẮP XẾP SẢN PHẨM (FILTER & SORT ENGINE)
   ========================================================================== */
function applyFiltersAndRender() {
  let list = [...rawProducts];

  // 1. Lọc theo từ khóa tìm kiếm
  if (filterState.searchQuery) {
    const q = filterState.searchQuery.toLowerCase();
    list = list.filter(p => {
      const name = String(p.name || '').toLowerCase();
      const desc = String(p.description || '').toLowerCase();
      const cat = String(p.category || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }

  // 2. Lọc theo danh mục
  if (!filterState.categories.includes('all')) {
    list = list.filter(p => {
      const c = String(p.category).toLowerCase();
      return filterState.categories.some(selectedCat => {
        if (selectedCat === 'vga') return c.includes('gpu') || c.includes('vga');
        if (selectedCat === 'cpu') return c.includes('cpu');
        if (selectedCat === 'mainboard') return c.includes('main') || c.includes('bo mạch');
        if (selectedCat === 'ram') return c.includes('ram');
        if (selectedCat === 'storage') return c.includes('ssd') || c.includes('hdd') || c.includes('storage') || c.includes('ổ cứng');
        if (selectedCat === 'psu') return c.includes('psu') || c.includes('nguồn');
        if (selectedCat === 'cooling') return c.includes('cool') || c.includes('tản');
        if (selectedCat === 'case') return c.includes('case') || c.includes('vỏ');
        return false;
      });
    });
  }

  // 3. Lọc theo khoảng giá
  if (filterState.priceRange === 'custom') {
    const min = filterState.minPrice || 0;
    const max = filterState.maxPrice || Infinity;
    list = list.filter(p => p.currentBid >= min && p.currentBid <= max);
  } else if (filterState.priceRange !== 'all') {
    const [minStr, maxStr] = filterState.priceRange.split('-');
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    list = list.filter(p => p.currentBid >= min && p.currentBid <= max);
  }

  // 4. Lọc theo tình trạng linh kiện (Like New, Used, New)
  if (filterState.conditions.length > 0) {
    list = list.filter(p => {
      const cond = String(p.condition || '').toLowerCase();
      return filterState.conditions.some(selectedCond => {
        if (selectedCond === 'likenew') return cond.includes('like new') || cond.includes('99%') || cond.includes('fullbox');
        if (selectedCond === 'used') return cond.includes('sử dụng') || cond.includes('tem void') || cond.includes('hết bảo hành');
        if (selectedCond === 'new') return cond.includes('mới') || cond.includes('100%') || cond.includes('new');
        return false;
      });
    });
  }

  // 5. Lọc theo chứng nhận kiểm định seal
  if (filterState.seals.length > 0) {
    list = list.filter(p => {
      const cond = String(p.condition || '').toLowerCase();
      const desc = String(p.description || '').toLowerCase();
      const specs = JSON.stringify(p.specifications || {}).toLowerCase();
      const combined = `${cond} ${desc} ${specs}`;

      return filterState.seals.every(seal => {
        if (seal === 'furmark') return combined.includes('furmark');
        if (seal === 'memtest') return combined.includes('memtest');
        if (seal === 'crystal') return combined.includes('crystal') || combined.includes('sức khỏe');
        return true;
      });
    });
  }

  // 6. Sắp xếp danh sách (Sorting)
  if (filterState.sortBy === 'ending') {
    list.sort((a, b) => a.endTimestamp - b.endTimestamp);
  } else if (filterState.sortBy === 'bids-desc') {
    list.sort((a, b) => (b.bidCount || 0) - (a.bidCount || 0));
  } else if (filterState.sortBy === 'price-asc') {
    list.sort((a, b) => a.currentBid - b.currentBid);
  } else if (filterState.sortBy === 'price-desc') {
    list.sort((a, b) => b.currentBid - a.currentBid);
  } else if (filterState.sortBy === 'newest') {
    // Phiên mới nhất: phiên đăng lại tính theo thời điểm đăng lại, phiên tự đăng có ID theo thời gian
    const postedAt = p => (p.relistedAt ? new Date(p.relistedAt).getTime() : Number(p.id) || 0);
    list.sort((a, b) => postedAt(b) - postedAt(a));
  }

  // Phiên người bán vừa đăng luôn đứng đầu danh sách (chỉ với chính người bán đó)
  const highlightIdx = list.findIndex(isJustPostedByViewer);
  if (highlightIdx > 0) list.unshift(list.splice(highlightIdx, 1)[0]);

  filteredProducts = list;

  // Cập nhật số lượng hiển thị trên thanh công cụ
  const countEl = document.getElementById('catalog-count');
  if (countEl) countEl.textContent = filteredProducts.length;

  // Hiển thị chip lọc đang kích hoạt
  renderActiveFilterChips();

  // Render trang hiện tại
  renderCurrentPage();
}

/**
 * Hiển thị các tag chip đại diện cho bộ lọc đang bật
 */
function renderActiveFilterChips() {
  const container = document.getElementById('active-filters-container');
  if (!container) return;

  const chips = [];

  if (filterState.searchQuery) {
    chips.push({ label: `Tìm kiếm: "${filterState.searchQuery}"`, type: 'search' });
  }

  if (!filterState.categories.includes('all')) {
    filterState.categories.forEach(cat => {
      chips.push({ label: `Danh mục: ${cat.toUpperCase()}`, type: 'category', value: cat });
    });
  }

  if (filterState.priceRange !== 'all') {
    chips.push({ label: 'Mức giá đã lọc', type: 'price' });
  }

  if (filterState.conditions.length > 0) {
    filterState.conditions.forEach(cond => {
      chips.push({ label: `Tình trạng: ${cond}`, type: 'condition', value: cond });
    });
  }

  if (chips.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <span class="pcb-active-filters__label">Đang lọc theo:</span>
    ${chips.map(chip => `
      <span class="pcb-filter-chip">
        ${escapeHtml(chip.label)}
      </span>
    `).join('')}
  `;
}

/* ==========================================================================
   7. RENDER TRANG HIỆN TẠI & THẺ CARD SẢN PHẨM (CARD RENDERER)
   ========================================================================== */
function renderCurrentPage() {
  const grid = document.getElementById('catalog-products-grid');
  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="pcb-empty-state">
        <svg class="pcb-empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        <h3 class="pcb-empty-state__title">Không tìm thấy linh kiện phù hợp</h3>
        <p class="pcb-empty-state__desc">Thử nới lỏng các tiêu chí bộ lọc giá, danh mục hoặc tìm kiếm bằng từ khóa khác.</p>
        <button type="button" class="pcb-filter__price-apply pcb-filter__price-apply--inline" data-reset-filters>
          Xóa toàn bộ bộ lọc
        </button>
      </div>
    `;
    renderPagination(0);
    return;
  }

  // Cắt danh sách theo trang
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  grid.innerHTML = pageItems.map(product => renderCatalogProductCard(product)).join('');

  // Gắn sự kiện click toàn bộ thẻ card chuyển hướng sang product-detail.html
  attachCardClickEvents();

  // Render lại phân trang
  renderPagination(filteredProducts.length);
}

/**
 * Gắn sự kiện click trên từng card để chuyển sang product-detail.html?id=...
 * Đồng thời ngăn chặn khi người dùng click vào nút bookmark
 */
function attachCardClickEvents() {
  const cards = document.querySelectorAll('.pcb-card');
  cards.forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      if (e.target.closest('.pcb-card__watch')) {
        return;
      }
      const productId = card.getAttribute('data-id');
      if (productId) {
        window.location.href = `product-detail.html?id=${productId}`;
      }
    });
  });

  // Sự kiện nút Theo dõi (Watchlist): lưu vào danh sách theo dõi của tài khoản
  const watchBtns = document.querySelectorAll('[data-action="watch"]');
  watchBtns.forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const product = rawProducts.find(p => Number(p.id) === id) || { id };
      const watched = toggleWatch(product);
      if (watched === null) {
        const goLogin = await showConfirm({
          title: 'Cần đăng nhập',
          message: 'Bạn cần đăng nhập để lưu phiên vào danh sách theo dõi.',
          confirmText: 'Đăng nhập',
          cancelText: 'Để sau'
        });
        if (goLogin) window.location.href = `login.html?redirect=${encodeURIComponent('products.html')}`;
        return;
      }
      setWatchButtonState(btn, watched);
    });
  });
}

/**
 * Phiên vừa đăng (products.html?highlight=...) và người đang xem chính là người bán của phiên.
 * Đổi sang tài khoản khác thì không còn ghim / gắn nhãn "Bạn vừa đăng" nữa.
 * @param {Object} product
 * @returns {boolean}
 */
function isJustPostedByViewer(product) {
  if (!filterState.highlightId || String(product.id) !== filterState.highlightId) return false;
  const viewer = readLoggedInUser();
  return Boolean(viewer && product.seller && product.seller === viewer.username);
}

/**
 * Sinh chuỗi HTML của một thẻ Card linh kiện chuẩn PCBid
 */
function renderCatalogProductCard(product) {
  const detailUrl = `product-detail.html?id=${product.id}`;
  // Phiên người bán vừa đăng: gắn nhãn và viền nổi bật
  const isJustPosted = isJustPostedByViewer(product);
  const conditionLabel = getConditionBadge(product.condition);
  const sealBadge = getHardwareSeal(product);
  // Trạng thái bookmark theo danh sách theo dõi của tài khoản đang đăng nhập
  const watched = isWatched(product.id);

  const specs = product.specifications || {};
  const specItems = Object.entries(specs).slice(0, 2).map(([k, v]) => {
    return `<span class="pcb-card__spec" title="${escapeHtml(k)}: ${escapeHtml(v)}">${escapeHtml(v)}</span>`;
  }).join('');

  const imageSrc = (product.images && product.images[0])
    ? encodeURI(product.images[0])
    : 'images/products/gpu/2018-rtx-4070-12gb-1.webp';

  return `
    <article class="pcb-card${isJustPosted ? ' pcb-card--just-posted' : ''}" data-id="${product.id}" data-category="${escapeHtml(product.category)}" data-price="${product.currentBid}" data-bids="${product.bidCount || 0}">
      ${isJustPosted ? `<span class="pcb-card__just-posted">${icon('sparkles', { size: 14 })} Bạn vừa đăng</span>` : ''}
      <a href="${detailUrl}" class="pcb-card__media" aria-label="Xem chi tiết ${escapeHtml(product.name)}">
        <div class="pcb-card__countdown" data-timestamp="${product.endTimestamp}" data-start="${getCountdownStart(product)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"></circle>
            <polyline points="12 7 12 12 15 15"></polyline>
          </svg>
          <span class="pcb-countdown-text">--:--:--</span>
        </div>
        <span class="pcb-card__condition">${conditionLabel}</span>
        <img class="pcb-card__img" src="${imageSrc}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.src='images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg'">
      </a>

      <button type="button" class="pcb-card__watch${watched ? ' pcb-card__watch--active' : ''}" data-action="watch" data-id="${product.id}" aria-pressed="${watched}" aria-label="${watched ? 'Bỏ theo dõi phiên này' : 'Theo dõi phiên này'}">
        <svg viewBox="0 0 24 24" fill="${watched ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

        <div class="pcb-card__price-box">
          <div class="pcb-card__price-row">
            <span class="pcb-card__price-lbl">Giá hiện tại</span>
            <span class="pcb-card__price-val">${formatVnd(product.currentBid)}</span>
          </div>

          <div class="pcb-card__market-row">
            <span class="pcb-card__market-val">${formatVnd(product.marketPriceNew)}</span>
            <span class="pcb-card__bids-count">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <strong>${product.bidCount || 0}</strong> lượt
            </span>
          </div>

          ${isAwaitingInspection(product) ? `
          <a href="${detailUrl}" class="pcb-card__btn pcb-card__btn--locked" title="Phiên mở đặt giá sau khi PCBid Lab kiểm định đạt">
            ${icon('microscope', { size: 14 })} Chờ kiểm định
          </a>` : `
          <a href="${detailUrl}" class="pcb-card__btn" data-action="quick-bid" data-id="${product.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
            Tham gia đấu giá
          </a>`}
        </div>
      </div>
    </article>
  `;
}

/* ==========================================================================
   8. THANH PHÂN TRANG (PAGINATION RENDERER)
   ========================================================================== */
function renderPagination(totalItems) {
  const container = document.getElementById('pcb-pagination');
  if (!container) return;

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) {
    container.hidden = true;
    return;
  }
  container.hidden = false;

  let html = `
    <a href="#" class="pcb-pagination__item ${currentPage === 1 ? 'pcb-pagination__item--disabled' : ''}" data-page="prev" aria-label="Trang trước">
      ‹ Trước
    </a>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `
        <a href="#" class="pcb-pagination__item ${i === currentPage ? 'pcb-pagination__item--active' : ''}" data-page="${i}">
          ${i}
        </a>
      `;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="pcb-pagination__dots">...</span>`;
    }
  }

  html += `
    <a href="#" class="pcb-pagination__item ${currentPage === totalPages ? 'pcb-pagination__item--disabled' : ''}" data-page="next" aria-label="Trang sau">
      Sau ›
    </a>
  `;

  // Ô nhảy nhanh tới một trang bất kỳ (VD: gõ 14 rồi Enter) thay vì bấm "Sau" nhiều lần
  html += `
    <form class="pcb-pagination__jump" data-page-jump novalidate>
      <label class="pcb-pagination__jump-label" for="pcb-page-jump-input">Đến trang</label>
      <input type="number" id="pcb-page-jump-input" class="pcb-pagination__jump-input" inputmode="numeric"
        min="1" max="${totalPages}" step="1" placeholder="${currentPage}" aria-describedby="pcb-page-jump-total">
      <span class="pcb-pagination__jump-total" id="pcb-page-jump-total">/ ${totalPages}</span>
      <button type="submit" class="pcb-pagination__jump-btn">Đi</button>
    </form>
  `;

  container.innerHTML = html;
}

/* ==========================================================================
   9. ĐỒNG HỒ ĐẾM NGƯỢC THỜI GIAN THẬT (COUNTDOWN TIMER)
   ========================================================================== */
function updateLiveCountdowns() {
  const elements = document.querySelectorAll('.pcb-card__countdown[data-timestamp]');
  const now = Date.now();

  elements.forEach(el => {
    const ts = parseInt(el.getAttribute('data-timestamp'), 10);
    if (!ts || isNaN(ts)) return;

    // Phiên đang chờ kiểm định: đồng hồ đứng yên tới lúc có kết quả (data-start)
    const diff = getRemainingMs(ts, el.getAttribute('data-start'), now);
    const textSpan = el.querySelector('.pcb-countdown-text');
    if (!textSpan) return;

    if (diff <= 0) {
      textSpan.textContent = 'Hết giờ';
      el.classList.add('pcb-card__countdown--urgent');
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      textSpan.textContent = `${days} ngày ${hours % 24}h`;
    } else {
      textSpan.textContent = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }

    if (diff < 15 * 60 * 1000) {
      el.classList.add('pcb-card__countdown--urgent');
    } else {
      el.classList.remove('pcb-card__countdown--urgent');
    }
  });
}

/* ==========================================================================
   10. TIỆN ÍCH TRỢ GIÚP (HELPER FUNCTIONS)
   ========================================================================== */

function formatVnd(amount) {
  if (typeof amount !== 'number') amount = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function getConditionBadge(conditionText) {
  if (!conditionText) return 'Đã dùng';
  const c = conditionText.toLowerCase();
  if (c.includes('like new') || c.includes('99%') || c.includes('fullbox')) return 'Like New 99%';
  if (c.includes('mới') || c.includes('100%') || c.includes('seal')) return 'Mới 100%';
  return 'Đã sử dụng';
}

function getHardwareSeal(product) {
  // Tem theo kết quả PCBid Lab; phiên vừa đăng hiện "Chờ kiểm định"
  const pending = isAwaitingInspection(product);
  const title = pending ? 'Phiên mở đặt giá sau khi PCBid Lab kiểm định đạt' : 'Đã qua kiểm định PCBid Lab';
  return `<span class="pcb-card__seal pcb-card__seal--${pending ? 'pending' : 'pass'}" title="${title}">${pending ? '' : '✓ '}${escapeHtml(getInspectionSeal(product))}</span>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Ngăn trượt bộ lọc trên điện thoại / máy tính bảng (màn hình <= 992px):
 * mở bằng nút "Mở bộ lọc tìm kiếm"; đóng bằng nút X, nút "Xem kết quả",
 * bấm ra nền tối hoặc phím Esc. Khi mở thì khóa cuộn trang phía sau.
 */
function initFilterDrawer() {
  const toggleBtn = document.getElementById('filter-toggle-btn');
  const sidebar = document.getElementById('pcb-filter-sidebar');
  const backdrop = document.getElementById('pcb-filter-backdrop');
  const closeBtn = document.getElementById('filter-close-btn');
  const doneBtn = document.getElementById('filter-done-btn');
  const doneCount = document.getElementById('filter-done-count');
  const catalogCount = document.getElementById('catalog-count');
  if (!toggleBtn || !sidebar || !backdrop) return;

  const mobileQuery = window.matchMedia('(max-width: 992px)');
  let hideTimer = 0;

  // Số linh kiện khớp bộ lọc hiện trên nút "Xem kết quả"
  const syncCount = () => {
    if (doneCount && catalogCount) doneCount.textContent = `(${catalogCount.textContent.trim()})`;
  };
  if (catalogCount) new MutationObserver(syncCount).observe(catalogCount, { childList: true, characterData: true, subtree: true });

  const isOpen = () => sidebar.classList.contains('pcb-filter--open');

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); }
  };

  const openDrawer = () => {
    clearTimeout(hideTimer);
    syncCount();
    backdrop.hidden = false;
    // Đợi một khung hình để hiệu ứng trượt / mờ dần chạy được sau khi bỏ hidden
    requestAnimationFrame(() => {
      sidebar.classList.add('pcb-filter--open');
      backdrop.classList.add('pcb-filter-backdrop--visible');
    });
    document.documentElement.classList.add('pcb-filter-lock');
    toggleBtn.setAttribute('aria-expanded', 'true');
    sidebar.setAttribute('role', 'dialog');
    sidebar.setAttribute('aria-modal', 'true');
    document.addEventListener('keydown', onKey);
    setTimeout(() => closeBtn?.focus({ preventScroll: true }), 50);
  };

  const closeDrawer = (returnFocus = true) => {
    if (!isOpen()) return;
    sidebar.classList.remove('pcb-filter--open');
    backdrop.classList.remove('pcb-filter-backdrop--visible');
    document.documentElement.classList.remove('pcb-filter-lock');
    toggleBtn.setAttribute('aria-expanded', 'false');
    sidebar.removeAttribute('role');
    sidebar.removeAttribute('aria-modal');
    document.removeEventListener('keydown', onKey);
    hideTimer = setTimeout(() => { backdrop.hidden = true; }, 250);
    if (returnFocus) toggleBtn.focus({ preventScroll: true });
  };

  toggleBtn.addEventListener('click', () => (isOpen() ? closeDrawer() : openDrawer()));
  closeBtn?.addEventListener('click', () => closeDrawer());
  doneBtn?.addEventListener('click', () => {
    closeDrawer(false);
    // Cuộn tới thanh kết quả để người dùng thấy ngay danh sách đã lọc
    document.querySelector('.pcb-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  backdrop.addEventListener('click', () => closeDrawer());

  // Xoay ngang / phóng to lên màn hình máy tính: đóng ngăn trượt, trả lại bố cục 2 cột
  mobileQuery.addEventListener('change', (e) => {
    if (!e.matches) closeDrawer(false);
  });
}
