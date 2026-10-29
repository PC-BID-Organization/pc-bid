/**
 * PCBid - Tập lệnh Trang Danh Sách Sản Phẩm & Bộ Lọc (products.html)
 * Quản lý bộ lọc đa tiêu chí (danh mục, mức giá, tình trạng cũ, sắp xếp, phân trang)
 * 100% Vanilla JavaScript (ES6+), Thao tác DOM trực tiếp, Không framework.
 * Toàn bộ chú thích bằng Tiếng Việt có dấu theo quy định AGENTS.md.
 */

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

// Dữ liệu dự phòng khi chạy trên giao thức file:/// hoặc không fetch được JSON
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
    id: 2002,
    name: "Card màn hình Gigabyte GeForce GTX 1660 Super OC 6GB",
    category: "GPU",
    condition: "Đã sử dụng - Bản 2 quạt mát mẻ, còn sáng đẹp",
    startingPrice: 2300000,
    currentBid: 3400000,
    bidStep: 100000,
    bidCount: 11,
    marketPriceNew: 5500000,
    endTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    seller: "vananh_gaming",
    images: ["images/products/gpu/2002-gtx-1660-super-1.jpg"],
    specifications: { "VRAM": "6GB GDDR6", "Nguồn đề xuất": "450W" }
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
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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
    images: ["images/products/ram/4001-trident-z-1.jpg"],
    specifications: { "Dung lượng": "32GB (2x16GB)", "Bus": "3600MHz" }
  },
  {
    id: 5001,
    name: "Ổ cứng SSD Samsung 980 PRO 1TB PCIe NVMe 4.0 M.2",
    category: "SSD",
    condition: "Like New 99% - Sức khỏe CrystalDiskInfo 100%, ghi ít",
    startingPrice: 1300000,
    currentBid: 1850000,
    bidStep: 50000,
    bidCount: 18,
    marketPriceNew: 2600000,
    endTime: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
    seller: "storage_pro",
    images: ["images/products/storage/5001-samsung-980-pro-1.jpg"],
    specifications: { "Tốc độ đọc": "7000 MB/s", "Chuẩn": "M.2 PCIe 4.0" }
  },
  {
    id: 6001,
    name: "Nguồn máy tính Corsair RM850e 850W 80 Plus Gold",
    category: "PSU",
    condition: "Like New 99% - Dây Full Modular nguyên túi, tem bảo hành SPC",
    startingPrice: 1600000,
    currentBid: 2150000,
    bidStep: 50000,
    bidCount: 9,
    marketPriceNew: 3300000,
    endTime: new Date(Date.now() + 150 * 60 * 1000).toISOString(),
    seller: "vietnam_power",
    images: ["images/products/psu/6001-corsair-rm850e-1.jpg"],
    specifications: { "Công suất": "850W", "Chứng nhận": "80 Plus Gold" }
  },
  {
    id: 7001,
    name: "Tản nhiệt nước AIO Deepcool LT720 360mm ARGB",
    category: "Cooling",
    condition: "Like New 99% - Đủ gông Intel 1700 và AMD AM5",
    startingPrice: 1400000,
    currentBid: 1950000,
    bidStep: 50000,
    bidCount: 14,
    marketPriceNew: 3100000,
    endTime: new Date(Date.now() + 190 * 60 * 1000).toISOString(),
    seller: "cooler_master_vn",
    images: ["images/products/cooling/7001-deepcool-lt720-1.jpg"],
    specifications: { "Kích thước két": "360mm", "Đèn": "ARGB vô cực" }
  }
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
  searchQuery: ''
};

// Khởi chạy khi tài liệu DOM hoàn tất nạp
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Phân tích tham số từ URL (ví dụ: products.html?category=vga&q=rtx)
  parseUrlParams();

  // 2. Tải toàn bộ dữ liệu linh kiện
  await loadAllProducts();

  // 3. Khởi tạo các bộ lắng nghe sự kiện (Event Listeners)
  initFilterEventListeners();

  // 4. Áp dụng bộ lọc và render danh sách ra giao diện
  applyFiltersAndRender();

  // 5. Kích hoạt bộ đếm thời gian đếm ngược thời gian thực
  setInterval(updateLiveCountdowns, 1000);
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
}

/* ==========================================================================
   4. TẢI TOÀN BỘ DỮ LIỆU SẢN PHẨM (DATA LOADER)
   ========================================================================== */
async function loadAllProducts() {
  let allLoaded = [];

  // Tải đồng thời tất cả các tệp json danh mục
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
    allLoaded.push(...list);
  });

  // Nếu tải rỗng (khi chạy không có server), dùng dữ liệu dự phòng phong phú
  if (allLoaded.length === 0) {
    allLoaded = FALLBACK_PRODUCTS.map(p => normalizeProduct(p, p.category));
  }

  // Bổ sung dữ liệu người dùng tự đăng bán từ localStorage nếu có
  const localItems = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
  if (Array.isArray(localItems) && localItems.length > 0) {
    localItems.forEach(item => {
      allLoaded.unshift(normalizeProduct(item, item.category || 'PC'));
    });
  }

  rawProducts = allLoaded;

  // Cập nhật số lượng đếm trên tiêu đề và sidebar
  updateSidebarCategoryCounts();
}

/**
 * Chuẩn hóa đối tượng sản phẩm để đảm bảo trường dữ liệu đồng nhất
 */
function normalizeProduct(p, defaultCategory) {
  const cat = p.category || defaultCategory || 'Khác';
  const endTimeStr = p.endTime || new Date(Date.now() + 2 * 3600 * 1000).toISOString();
  const endTimestamp = new Date(endTimeStr).getTime();

  return {
    ...p,
    category: cat,
    endTimestamp: isNaN(endTimestamp) ? Date.now() + 3600 * 1000 : endTimestamp,
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
      // Xóa ô nhập giá tự do nếu chuyển về radio
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

      // Bỏ check radio
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

  // Nút toggle filter trên mobile
  const filterToggleBtn = document.getElementById('filter-toggle-btn');
  const filterSidebar = document.getElementById('pcb-filter-sidebar');
  if (filterToggleBtn && filterSidebar) {
    filterToggleBtn.addEventListener('click', () => {
      filterSidebar.classList.toggle('pcb-filter--open');
    });
  }

  // Lắng nghe sự kiện phân trang
  const paginationContainer = document.getElementById('pcb-pagination');
  if (paginationContainer) {
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

  // Khôi phục form UI
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

  // 1. Lọc theo từ khóa tìm kiếm (nếu có từ URL hoặc thanh tìm kiếm)
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
    list.sort((a, b) => b.id - a.id);
  }

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
        <button type="button" class="pcb-filter__price-apply" style="width:auto; padding:8px 20px;" onclick="document.getElementById('reset-filter-btn').click()">
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
  attachCardClickEvents(grid);

  // Render lại phân trang
  renderPagination(filteredProducts.length);
}

/**
 * Gắn sự kiện click trên từng card để chuyển sang product-detail.html?id=...
 * Đồng thời ngăn chặn khi người dùng click vào nút Đặt giá nhanh hoặc nút Lưu theo dõi
 */
function attachCardClickEvents(gridElement) {
  const cards = gridElement.querySelectorAll('.pcb-card');
  cards.forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // Nếu click vào nút Đặt giá hoặc Nút bookmark thì không chuyển trang
      if (e.target.closest('.pcb-card__btn') || e.target.closest('.pcb-card__watch')) {
        return;
      }
      const productId = card.getAttribute('data-id');
      if (productId) {
        window.location.href = `product-detail.html?id=${productId}`;
      }
    });
  });

  // Sự kiện nút Đặt giá nhanh (Quick Bid)
  const bidBtns = gridElement.querySelectorAll('[data-action="quick-bid"]');
  bidBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      window.location.href = `product-detail.html?id=${id}`;
    });
  });

  // Sự kiện nút Theo dõi (Watchlist)
  const watchBtns = gridElement.querySelectorAll('[data-action="watch"]');
  watchBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('pcb-card__watch--active');
    });
  });
}

/**
 * Sinh chuỗi HTML của một thẻ Card linh kiện chuẩn PCBid
 */
function renderCatalogProductCard(product) {
  const detailUrl = `product-detail.html?id=${product.id}`;
  const conditionLabel = getConditionBadge(product.condition);
  const sealBadge = getHardwareSeal(product);

  // Trích xuất 2 thông số kỹ thuật tiêu biểu
  const specs = product.specifications || {};
  const specItems = Object.entries(specs).slice(0, 2).map(([k, v]) => {
    return `<span class="pcb-card__spec" title="${escapeHtml(k)}: ${escapeHtml(v)}">${escapeHtml(v)}</span>`;
  }).join('');

  const imageSrc = (product.images && product.images[0])
    ? encodeURI(product.images[0])
    : 'images/products/gpu/2018-rtx-4070-12gb-1.webp';

  return `
    <article class="pcb-card" data-id="${product.id}" data-category="${escapeHtml(product.category)}">
      <div class="pcb-card__media">
        <div class="pcb-card__countdown" data-timestamp="${product.endTimestamp}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"></circle>
            <polyline points="12 7 12 12 15 15"></polyline>
          </svg>
          <span class="pcb-countdown-text">--:--:--</span>
        </div>
        <span class="pcb-card__condition">${conditionLabel}</span>
        <img class="pcb-card__img" src="${imageSrc}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.src='images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg'">
      </div>

      <button type="button" class="pcb-card__watch" data-action="watch" data-id="${product.id}" aria-label="Lưu theo dõi">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

          <button type="button" class="pcb-card__btn" data-action="quick-bid" data-id="${product.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
            Tham gia đấu giá
          </button>
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
    container.style.display = 'none';
    return;
  }
  container.style.display = 'flex';

  let html = `
    <a href="#" class="pcb-pagination__item ${currentPage === 1 ? 'pcb-pagination__item--disabled' : ''}" data-page="prev" aria-label="Trang trước">
      ‹ Trước
    </a>
  `;

  // Hiển thị danh sách số trang
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

    const diff = ts - now;
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

    // Nếu thời gian dưới 15 phút, kích hoạt trạng thái khẩn cấp nhấp nháy đỏ
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
  const cat = String(product.category || '').toLowerCase();
  if (cat.includes('gpu') || cat.includes('vga')) {
    return `<span class="pcb-card__seal pcb-card__seal--pass" title="Đã stress test Furmark ổn định">✓ Furmark < 75°C</span>`;
  }
  if (cat.includes('ram')) {
    return `<span class="pcb-card__seal pcb-card__seal--pass" title="Đã chạy MemTest86 không lỗi">✓ MemTest 0 Error</span>`;
  }
  if (cat.includes('ssd') || cat.includes('ổ cứng') || cat.includes('storage')) {
    return `<span class="pcb-card__seal pcb-card__seal--pass" title="Kiểm tra sức khỏe CrystalDiskInfo 100%">✓ Sức khỏe 100%</span>`;
  }
  return `<span class="pcb-card__seal pcb-card__seal--pass" title="Đã qua kiểm thử tại UIT Lab">✓ UIT Lab OK</span>`;
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
