/**
 * PCBid - Tập lệnh Trang Chi Tiết Phiên Đấu Giá (product-detail.js)
 * Xử lý toàn bộ nghiệp vụ: nạp sản phẩm, đồng hồ đếm ngược, đặt giá,
 * lịch sử trả giá, watchlist — 100% Vanilla JavaScript (ES6+).
 */

// Hàm tính thời điểm kết thúc phiên dùng chung cho mọi trang
import { getAuctionEndTimestamp, isAuctionClosed, mergeLocalProduct } from './auction-time.js';
// Kiểm tra tiền cọc 10% trước khi đặt giá
import { checkBidDeposit } from './wallet.js';
// Watchlist lưu riêng theo từng tài khoản
import { USER_LIST_KEYS, readLoggedInUser, readUserList, writeUserList } from './user-data.js';
// Họ tên, UID và avatar chữ cái của người dùng
import { MOCK_BIDDERS, describeBidder, findAccount, getAvatarInitial, renderAvatarContent, getUserUid, maskUid } from './accounts.js';


/* ==========================================================================
   1. CẤU HÌNH & NGUỒN DỮ LIỆU
   ========================================================================== */

// Danh sách các file JSON nguồn dữ liệu sản phẩm
const NGUON_DU_LIEU = [
  'data/gpu.json',
  'data/cpu.json',
  'data/mainboard.json',
  'data/ram.json',
  'data/storage.json',
  'data/psu.json',
  'data/cooling.json',
  'data/case.json',
];

// Dữ liệu dự phòng khi fetch thất bại (mở qua giao thức file:/// hoặc mạng lỗi)
const SAN_PHAM_DU_PHONG = [
  {
    id: 2011,
    name: 'Card màn hình ASUS ROG Strix GeForce RTX 3070 8GB OC',
    category: 'GPU',
    condition: 'Đã sử dụng - Fullbox phụ kiện, nguyên tem void',
    startingPrice: 6500000,
    currentBid: 8400000,
    bidStep: 100000,
    bidCount: 19,
    marketPriceNew: 15000000,
    endTime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    seller: 'tuananh_pc',
    images: ['images/products/gpu/2011-rtx-3070-8gb-1.webp'],
    description: 'Bản ROG Strix cao cấp nhất, dải LED RGB viền cực sáng, hiệu năng ép xung sẵn từ nhà máy.',
    specifications: { 'Dung lượng VRAM / Chuẩn': '8GB GDDR6 (256-bit)', 'Băng thông bộ nhớ': '14 Gbps', 'Cổng kết nối': '2x HDMI 2.1, 3x DisplayPort 1.4a', 'Nguồn đề xuất': '650W (2x 8-pin)' }
  },
  {
    id: 1023,
    name: 'Bộ vi xử lý AMD Ryzen 7 5800X3D (8C/16T, 96MB V-Cache)',
    category: 'CPU',
    condition: 'Đã sử dụng - Hàng hiếm sưu tầm, fullbox like new',
    startingPrice: 5600000,
    currentBid: 8100000,
    bidStep: 100000,
    bidCount: 25,
    marketPriceNew: 9500000,
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    seller: 'minhduc_hardware',
    images: ['images/products/cpu/1023-ryzen-7-5800x3d-1.jpg'],
    description: 'Vua chơi game socket AM4 trang bị 96MB bộ nhớ 3D V-Cache độc quyền, đánh bại nhiều chip đời mới.',
    specifications: { 'Socket': 'AM4', 'Số nhân / Số luồng': '8 nhân / 16 luồng', 'Xung cơ bản / Xung Boost': '3.40 GHz / 4.50 GHz', 'Bộ nhớ đệm (Cache)': '96 MB 3D V-Cache', 'TDP': '105 W' }
  },
  {
    id: 3013,
    name: 'Bo mạch chủ MSI MAG Z790 TOMAHAWK WIFI DDR5',
    category: 'Mainboard',
    condition: 'Đã sử dụng - Còn mới 98%, Fullbox chính hãng, bảo hành 18 tháng',
    startingPrice: 5100000,
    currentBid: 5800000,
    bidStep: 100000,
    bidCount: 7,
    marketPriceNew: 7690000,
    endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    seller: 'tuan_pcbuilder',
    images: ['images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg'],
    description: 'Biểu tượng bền bỉ của dòng Tomahawk với tông màu đen tuyền mạnh mẽ, giải pháp tản nhiệt tối ưu và kết nối mạng 2.5G + Wi-Fi 6E.',
    specifications: { 'Socket': 'LGA 1700', 'Chipset': 'Intel Z790', 'Kích thước chuẩn (Form Factor)': 'ATX', 'Số khe RAM / Chuẩn RAM hỗ trợ': '4 khe DDR5 (Tối đa 192GB)', 'Cổng M.2 NVMe': '4 khe M.2 PCIe 4.0 x4' }
  },
  {
    id: 4003,
    name: 'RAM G.SKILL Trident Z RGB 16GB (1x16GB) 3600MHz DDR4',
    category: 'RAM',
    condition: 'Đã sử dụng - Like New 99%, tem Mai Hoàng bảo hành 8 tháng',
    startingPrice: 950000,
    currentBid: 1300000,
    bidStep: 50000,
    bidCount: 7,
    marketPriceNew: 1690000,
    endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    seller: 'minh_gear99',
    images: ['images/products/ram/4003-gskill-trident-z-rgb-16gb-1.jpg'],
    description: 'Dòng RAM huyền thoại với dải đèn LED RGB dạng cầu vồng rực rỡ, bus 3600MHz tối ưu độ trễ cho cả game và công việc nặng.',
    specifications: { 'Dung lượng': '16GB (1 x 16GB)', 'Chuẩn RAM': 'DDR4', 'Bus (Tốc độ)': '3600 MHz', 'Độ trễ (CAS Latency / CL)': 'CL18', 'Tản nhiệt / LED': 'Tản nhôm phay xước / LED RGB đa vùng' }
  }
];

/* ==========================================================================
   2. BIẾN TRẠNG THÁI MODULE
   ========================================================================== */

// Đối tượng sản phẩm đang hiển thị
let sanPhamHienTai = null;

// ID interval đồng hồ đếm ngược (dùng để dọn dẹp)
let idIntervalDemNguoc = null;

// ID interval tự động làm mới số lượt đặt (mock realtime)
let idIntervalCapNhat = null;

/* ==========================================================================
   3. HÀM TIỆN ÍCH (UTILITY FUNCTIONS)
   ========================================================================== */

/**
 * Định dạng số tiền sang chuỗi VNĐ có dấu chấm phân cách nghìn
 * @param {number} soTien - Số tiền cần định dạng
 * @returns {string} Chuỗi tiền đã định dạng (ví dụ: "5.800.000đ")
 */
function dinhDangVnd(soTien) {
  return soTien.toLocaleString('vi-VN') + 'đ';
}

/**
 * Chống XSS: mã hóa các ký tự đặc biệt HTML trước khi chèn vào DOM
 * @param {string} chuoi - Chuỗi cần mã hóa
 * @returns {string} Chuỗi đã mã hóa an toàn
 */
function maHoaHtml(chuoi) {
  const phanTu = document.createElement('div');
  phanTu.appendChild(document.createTextNode(chuoi));
  return phanTu.innerHTML;
}

/**
 * Định dạng thời gian từ ISO string sang chuỗi dễ đọc tiếng Việt
 * @param {string} isoString - Chuỗi thời gian ISO 8601
 * @returns {string} Chuỗi thời gian đã định dạng
 */
function dinhDangThoiGian(isoString) {
  const ngay = new Date(isoString);
  return ngay.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Tạo chuỗi ID ngẫu nhiên cho lượt đặt giá (bid log entry)
 * @returns {string} ID ngẫu nhiên dạng "bid_<timestamp>_<random>"
 */
function taoIdNgauNhien() {
  return `bid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/* ==========================================================================
   4. NẠP DỮ LIỆU SẢN PHẨM (DATA LOADING)
   ========================================================================== */

/**
 * Nạp danh sách tất cả sản phẩm từ localStorage hoặc các file JSON tĩnh
 * @returns {Promise<Array>} Mảng sản phẩm đã nạp
 */
async function nạpTatCaSanPham() {
  const ketQuaFetch = [];
  for (const duongDan of NGUON_DU_LIEU) {
    try {
      const phanHoi = await fetch(duongDan);
      if (phanHoi.ok) {
        const danhSach = await phanHoi.json();
        if (Array.isArray(danhSach)) {
          ketQuaFetch.push(...danhSach);
        }
      }
    } catch {
      // Bỏ qua file không fetch được, thử file tiếp theo
    }
  }

  let danhSachGoc = ketQuaFetch;
  if (danhSachGoc.length === 0) {
    danhSachGoc = SAN_PHAM_DU_PHONG;
  }

  // Đọc dữ liệu cập nhật từ LocalStorage (pcbid_products & pcbid_bids)
  let localItems = [];
  try {
    localItems = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
  } catch {
    localItems = [];
  }
  const localMap = new Map(localItems.map(item => [Number(item.id), item]));

  let localBids = [];
  try {
    localBids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]');
  } catch {
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

  // Đồng bộ sản phẩm từ catalog
  const mergedList = danhSachGoc.map(sp => {
    const idNum = Number(sp.id);
    // Gộp với bản trong localStorage (phiên đăng lại / phiên đã chốt được xử lý trong helper)
    const base = mergeLocalProduct(sp, localMap.get(idNum));
    const bInfo = bidSummary.get(idNum);

    let curBid = Number(base.currentBid || base.startingPrice || 0);
    let bCount = Number(base.bidCount || 0);

    if (bInfo && !isAuctionClosed(base)) {
      if (bInfo.maxBid > curBid) curBid = bInfo.maxBid;
      bCount = Math.max(bCount, bInfo.count);
    }

    const mergedItem = {
      ...base,
      id: idNum,
      currentBid: curBid,
      bidCount: bCount
    };
    // Đảm bảo AMD Ryzen 7 5800X3D luôn nhận đúng ảnh chip AMD, không bị cache i7 cũ đè lên
    if (mergedItem.name && mergedItem.name.toLowerCase().includes('5800x3d')) {
      mergedItem.images = ['images/products/cpu/1023-ryzen-7-5800x3d-1.jpg'];
    }
    return mergedItem;
  });

  // Bổ sung các sản phẩm do người dùng tự đăng bán từ sell.html (chưa có trong JSON)
  const existingIds = new Set(mergedList.map(sp => Number(sp.id)));
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
      mergedList.unshift({
        ...item,
        id: idNum,
        currentBid: curBid,
        bidCount: bCount
      });
    }
  });

  return mergedList;
}

/**
 * Tìm sản phẩm theo ID từ danh sách đã nạp
 * @param {number} id - ID sản phẩm cần tìm
 * @returns {Promise<Object|null>} Đối tượng sản phẩm hoặc null nếu không có
 */
async function timSanPhamTheoId(id) {
  const danhSach = await nạpTatCaSanPham();
  const idNum = Number(id);
  const found = danhSach.find(sp => Number(sp.id) === idNum) || null;
  if (found) {
    // Chuẩn hóa thời điểm kết thúc phiên theo hàm dùng chung (khớp với profile.html, products.html)
    found.endTimestamp = getAuctionEndTimestamp(found);
    found.endTime = new Date(found.endTimestamp).toISOString();

    // Đảm bảo giá đấu luôn khớp với lượt bid cao nhất trong pcbid_bids (phiên đã chốt giữ nguyên giá chốt)
    if (!isAuctionClosed(found)) try {
      const bids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]');
      const spBids = bids.filter(b => Number(b.productId) === idNum);
      if (spBids.length > 0) {
        const maxBid = Math.max(...spBids.map(b => Number(b.amount) || 0));
        if (maxBid > (found.currentBid || 0)) {
          found.currentBid = maxBid;
        }
        found.bidCount = Math.max(found.bidCount || 0, spBids.length);
      }
    } catch {}
  }
  return found;
}

/* ==========================================================================
   5. RENDER GIAO DIỆN SẢN PHẨM
   ========================================================================== */

/**
 * Hiển thị toàn bộ thông tin sản phẩm lên giao diện trang
 * @param {Object} sanPham - Đối tượng sản phẩm cần hiển thị
 */
function hienThiSanPham(sanPham) {
  // Tự động sửa lỗi nếu cache LocalStorage cũ lưu sai ảnh cho CPU AMD Ryzen 7 5800X3D
  if (sanPham && sanPham.name && sanPham.name.toLowerCase().includes('5800x3d')) {
    sanPham.images = ['images/products/cpu/1023-ryzen-7-5800x3d-1.jpg'];
  }
  sanPhamHienTai = sanPham;

  // Cập nhật tiêu đề tab trình duyệt
  document.title = `${sanPham.name} | PCBid - Sàn Đấu Giá Linh Kiện PC Cũ`;

  // Cập nhật breadcrumb
  const tenBreadcrumb = document.getElementById('pcb-pd-breadcrumb-name');
  if (tenBreadcrumb) tenBreadcrumb.textContent = sanPham.name;

  // Render gallery ảnh sản phẩm
  renderGallery(sanPham.images || []);

  // Cập nhật nhãn danh mục và tình trạng
  const nhanDanhMuc = document.getElementById('pcb-pd-category');
  const nhanTinhTrang = document.getElementById('pcb-pd-condition-badge');
  if (nhanDanhMuc) nhanDanhMuc.textContent = sanPham.category || '';
  if (nhanTinhTrang) nhanTinhTrang.textContent = xacDinhNhanTinhTrang(sanPham.condition || '');

  // Tên sản phẩm
  const tenSP = document.getElementById('pcb-pd-title');
  if (tenSP) tenSP.textContent = sanPham.name;

  // Mô tả tình trạng chi tiết
  const moTaTinhTrang = document.getElementById('pcb-pd-condition-text');
  if (moTaTinhTrang) moTaTinhTrang.textContent = sanPham.condition || '';

  // Giá thị trường và giá đấu hiện tại
  capNhatGia(sanPham);

  // Thông tin bước giá và số lượt
  const soluot = document.getElementById('pcb-pd-bid-count');
  const buocGia = document.getElementById('pcb-pd-bid-step');
  const buocGiaGoi = document.getElementById('pcb-pd-bid-step-hint');
  if (soluot) soluot.textContent = sanPham.bidCount || 0;
  if (buocGia) buocGia.textContent = dinhDangVnd(sanPham.bidStep || 0);
  if (buocGiaGoi) buocGiaGoi.textContent = dinhDangVnd(sanPham.bidStep || 0);

  // Thiết lập giá trị ban đầu cho ô nhập giá (= giá hiện tại + 1 bước giá)
  const oNhapGia = document.getElementById('pcb-pd-bid-input');
  if (oNhapGia) {
    oNhapGia.value = (sanPham.currentBid || sanPham.startingPrice) + (sanPham.bidStep || 0);
    oNhapGia.min = (sanPham.currentBid || sanPham.startingPrice) + (sanPham.bidStep || 0);
  }

  // Thông tin người bán
  hienThiNguoiBan(sanPham.seller || 'anonymous');

  // Render bảng thông số kỹ thuật
  renderThongSo(sanPham.specifications || {});

  // Render mô tả từ người bán
  const vungMoTa = document.getElementById('pcb-pd-desc-content');
  if (vungMoTa) vungMoTa.textContent = sanPham.description || 'Người bán chưa cung cấp mô tả.';

  // Render lịch sử đặt giá
  renderLichSu(sanPham.id);

  // Khởi động đồng hồ đếm ngược
  khoiDongDemNguoc(sanPham.endTime);

  // Kiểm tra và cập nhật trạng thái watchlist
  capNhatNutWatchlist(sanPham.id);

  // Kiểm tra phiên đã kết thúc chưa để vô hiệu nút đặt giá
  kiemTraPhienKetThuc(sanPham.endTime);
}

/**
 * Xác định nhãn tình trạng ngắn gọn từ chuỗi mô tả tình trạng
 * @param {string} tinhTrang - Chuỗi mô tả tình trạng đầy đủ
 * @returns {string} Nhãn ngắn gọn
 */
function xacDinhNhanTinhTrang(tinhTrang) {
  const chuoi = tinhTrang.toLowerCase();
  if (chuoi.includes('like new') || chuoi.includes('99%') || chuoi.includes('fullbox')) return 'Like New';
  if (chuoi.includes('98%') || chuoi.includes('mới')) return 'Như Mới';
  if (chuoi.includes('95%') || chuoi.includes('tốt')) return 'Còn Tốt';
  return 'Đã Dùng';
}

/**
 * Cập nhật các ô hiển thị giá trên giao diện
 * @param {Object} sanPham - Đối tượng sản phẩm
 */
function capNhatGia(sanPham) {
  const oGiaThiTruong = document.getElementById('pcb-pd-market-price');
  const oGiaHienTai = document.getElementById('pcb-pd-current-bid');
  const oGiamGia = document.getElementById('pcb-pd-discount-pct');

  if (oGiaThiTruong) oGiaThiTruong.textContent = dinhDangVnd(sanPham.marketPriceNew || 0);
  if (oGiaHienTai) oGiaHienTai.textContent = dinhDangVnd(sanPham.currentBid || sanPham.startingPrice || 0);

  // Tính phần trăm tiết kiệm so với giá thị trường
  if (oGiamGia && sanPham.marketPriceNew && sanPham.currentBid) {
    const phanTramGiam = Math.round((1 - sanPham.currentBid / sanPham.marketPriceNew) * 100);
    if (phanTramGiam > 0) {
      oGiamGia.textContent = `-${phanTramGiam}% so với giá mới`;
      oGiamGia.hidden = false;
    } else {
      oGiamGia.hidden = true;
    }
  }
}

/**
 * Render gallery ảnh sản phẩm: ảnh chính + dải thumbnail
 * @param {string[]} mảngAnh - Mảng đường dẫn ảnh sản phẩm
 */
function renderGallery(mảngAnh) {
  const anhChinh = document.getElementById('pcb-pd-main-img');
  const vungThumbnail = document.getElementById('pcb-pd-thumbs');

  // Ảnh mặc định nếu không có ảnh nào
  const anhMacDinh = 'images/placeholder.jpg';
  const danhSachAnh = mảngAnh.length > 0 ? mảngAnh : [anhMacDinh];

  // Thiết lập ảnh chính đầu tiên
  if (anhChinh) {
    anhChinh.src = danhSachAnh[0];
    anhChinh.alt = sanPhamHienTai ? sanPhamHienTai.name : 'Ảnh sản phẩm';
    anhChinh.onerror = () => { anhChinh.src = anhMacDinh; };
  }

  // Tạo các thumbnail bên dưới
  if (vungThumbnail) {
    vungThumbnail.innerHTML = '';

    danhSachAnh.forEach((duongDanAnh, chiSo) => {
      const phanTuThumb = document.createElement('div');
      phanTuThumb.className = `pcb-pd__gallery-thumb${chiSo === 0 ? ' pcb-pd__gallery-thumb--active' : ''}`;
      phanTuThumb.setAttribute('role', 'listitem');

      const imgThumb = document.createElement('img');
      imgThumb.src = duongDanAnh;
      imgThumb.alt = `Ảnh ${chiSo + 1}`;
      imgThumb.loading = 'lazy';
      imgThumb.onerror = () => { imgThumb.src = anhMacDinh; };

      phanTuThumb.appendChild(imgThumb);

      // Xử lý sự kiện click để đổi ảnh chính
      phanTuThumb.addEventListener('click', () => {
        if (anhChinh) {
          anhChinh.src = duongDanAnh;
        }
        // Cập nhật trạng thái active cho thumbnail
        vungThumbnail.querySelectorAll('.pcb-pd__gallery-thumb').forEach(el => {
          el.classList.remove('pcb-pd__gallery-thumb--active');
        });
        phanTuThumb.classList.add('pcb-pd__gallery-thumb--active');
      });

      vungThumbnail.appendChild(phanTuThumb);
    });
  }
}

/**
 * Hiển thị thông tin người bán lên thẻ seller card
 * @param {string} tenNguoiBan - Tên tài khoản người bán
 */
function hienThiNguoiBan(tenNguoiBan) {
  const oTen = document.getElementById('pcb-pd-seller-name');
  const oAvatar = document.getElementById('pcb-pd-seller-avatar-char');
  // Người bán là thành viên / tài khoản đã đăng ký: hiện họ tên thật; avatar là chữ đầu của tên
  const taiKhoan = findAccount({ username: tenNguoiBan });
  const tenHienThi = taiKhoan?.fullname || tenNguoiBan;
  const linkHoSo = `profile.html?user=${encodeURIComponent(tenNguoiBan)}`;
  if (oTen) {
    oTen.textContent = tenHienThi;
    oTen.href = linkHoSo;
    oTen.title = `Xem hồ sơ của ${tenHienThi}`;
  }
  if (oAvatar) oAvatar.innerHTML = renderAvatarContent(taiKhoan || tenNguoiBan, 'pcb-pd__seller-avatar-img');
  const oLinkAvatar = document.getElementById('pcb-pd-seller-avatar-link');
  if (oLinkAvatar) oLinkAvatar.href = linkHoSo;
  // UID che bớt của người bán (người bán ngoài hệ thống dùng UID sinh từ tên đăng nhập)
  const oUid = document.getElementById('pcb-pd-seller-uid');
  if (oUid) oUid.textContent = `UID: ${maskUid(getUserUid(taiKhoan?.id || `seller_${tenNguoiBan}`))}`;
}

/**
 * Render bảng thông số kỹ thuật từ object specifications
 * @param {Object} thongSo - Object thông số dạng { "Thông số": "Giá trị" }
 */
function renderThongSo(thongSo) {
  const tbody = document.getElementById('pcb-pd-specs-body');
  if (!tbody) return;

  const mục = Object.entries(thongSo);
  if (mục.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color: var(--color-text-muted);">Chưa có thông số kỹ thuật.</td></tr>';
    return;
  }

  tbody.innerHTML = mục.map(([nhaN, giaTri]) => `
    <tr>
      <td>${maHoaHtml(nhaN)}</td>
      <td>${maHoaHtml(String(giaTri))}</td>
    </tr>
  `).join('');
}

/* ==========================================================================
   6. ĐỒNG HỒ ĐẾM NGƯỢC (COUNTDOWN TIMER)
   ========================================================================== */

/**
 * Khởi động vòng lặp đồng hồ đếm ngược theo thời gian thực
 * @param {string} thoiGianKetThuc - ISO 8601 string thời gian kết thúc phiên
 */
function khoiDongDemNguoc(thoiGianKetThuc) {
  // Dọn dẹp interval cũ nếu có
  if (idIntervalDemNguoc) clearInterval(idIntervalDemNguoc);

  const capNhatDemNguoc = () => {
    const thoiGianConLai = new Date(thoiGianKetThuc).getTime() - Date.now();

    if (thoiGianConLai <= 0) {
      hienThiDemNguoc(0, 0, 0, 0);
      hienThiPhienKetThuc();
      clearInterval(idIntervalDemNguoc);
      return;
    }

    // Tính toán ngày / giờ / phút / giây còn lại
    const ngay = Math.floor(thoiGianConLai / (1000 * 60 * 60 * 24));
    const gio = Math.floor((thoiGianConLai % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const phut = Math.floor((thoiGianConLai % (1000 * 60 * 60)) / (1000 * 60));
    const giay = Math.floor((thoiGianConLai % (1000 * 60)) / 1000);

    hienThiDemNguoc(ngay, gio, phut, giay);

    // Thêm lớp CSS khẩn cấp khi còn dưới 1 giờ
    const demNguoc = document.getElementById('pcb-pd-countdown');
    if (demNguoc) {
      if (thoiGianConLai < 60 * 60 * 1000) {
        demNguoc.classList.add('pcb-pd__countdown--urgent');
      } else {
        demNguoc.classList.remove('pcb-pd__countdown--urgent');
      }
    }
  };

  // Chạy ngay lập tức và sau đó mỗi giây
  capNhatDemNguoc();
  idIntervalDemNguoc = setInterval(capNhatDemNguoc, 1000);
}

/**
 * Cập nhật các ô hiển thị ngày/giờ/phút/giây trên giao diện đếm ngược
 * @param {number} ngay - Số ngày còn lại
 * @param {number} gio - Số giờ còn lại
 * @param {number} phut - Số phút còn lại
 * @param {number} giay - Số giây còn lại
 */
function hienThiDemNguoc(ngay, gio, phut, giay) {
  const pad = (so) => String(so).padStart(2, '0');
  const oDays = document.getElementById('pcb-cd-days');
  const oHours = document.getElementById('pcb-cd-hours');
  const oMinutes = document.getElementById('pcb-cd-minutes');
  const oSeconds = document.getElementById('pcb-cd-seconds');
  if (oDays) oDays.textContent = pad(ngay);
  if (oHours) oHours.textContent = pad(gio);
  if (oMinutes) oMinutes.textContent = pad(phut);
  if (oSeconds) oSeconds.textContent = pad(giay);
}

/**
 * Hiển thị trạng thái phiên đấu giá đã kết thúc và vô hiệu nút đặt giá
 */
function hienThiPhienKetThuc() {
  const demNguoc = document.getElementById('pcb-pd-countdown');
  const thongBaoKetThuc = document.getElementById('pcb-pd-ended-msg');
  const nutDatGia = document.getElementById('pcb-pd-submit-btn');
  const hopDatGia = document.getElementById('pcb-pd-bidbox');
  const oNhapGia = document.getElementById('pcb-pd-bid-input');

  if (demNguoc) demNguoc.hidden = true;
  if (thongBaoKetThuc) {
    thongBaoKetThuc.hidden = false;
    // Ghi rõ kết quả phiên: người thắng và giá chốt, hoặc không có lượt đặt giá
    const sp = sanPhamHienTai;
    if (sp && sp.winner) {
      const nguoiThang = describeBidder({ bidderName: sp.winner });
      thongBaoKetThuc.textContent = `🔔 Phiên đấu giá đã kết thúc · Người thắng: ${nguoiThang.name} (${nguoiThang.maskedUid || sp.winner}) với giá ${dinhDangVnd(sp.currentBid)}`;
    } else if (sp && Number(sp.bidCount || 0) === 0) {
      thongBaoKetThuc.textContent = '🔔 Phiên đấu giá đã kết thúc · Không có lượt đặt giá nào';
    } else {
      thongBaoKetThuc.textContent = '🔔 Phiên đấu giá đã kết thúc';
    }
  }
  if (nutDatGia) {
    nutDatGia.disabled = true;
    nutDatGia.textContent = 'Phiên đấu giá đã kết thúc';
  }
  if (hopDatGia) hopDatGia.style.opacity = '0.6';
  if (oNhapGia) oNhapGia.disabled = true;
}

/**
 * Kiểm tra ngay khi nạp trang xem phiên đã kết thúc chưa
 * @param {string} thoiGianKetThuc - ISO string thời gian kết thúc
 */
function kiemTraPhienKetThuc(thoiGianKetThuc) {
  if (new Date(thoiGianKetThuc).getTime() <= Date.now()) {
    hienThiPhienKetThuc();
  }
}

/* ==========================================================================
   7. LỊCH SỬ ĐẶT GIÁ (BID HISTORY)
   ========================================================================== */

/**
 * Nạp và render bảng lịch sử các lượt đặt giá từ localStorage
 * Kết hợp dữ liệu thực từ localStorage và mock data mẫu để có đủ số hàng
 * @param {number} idSanPham - ID sản phẩm cần hiển thị lịch sử
 */
function renderLichSu(idSanPham) {
  const tbody = document.getElementById('pcb-pd-history-body');
  const thongBaoTrong = document.getElementById('pcb-pd-history-empty');
  const huyHieuSoLuot = document.getElementById('pcb-pd-history-count');

  if (!tbody) return;

  // 1. Đọc danh sách các lượt đặt giá thực tế từ localStorage (pcbid_bids)
  let lichSuLuu = [];
  try {
    lichSuLuu = JSON.parse(localStorage.getItem('pcbid_bids') || '[]');
  } catch {
    lichSuLuu = [];
  }

  // 2. Lọc các lượt đặt giá thuộc sản phẩm hiện tại
  let lichSuSanPham = lichSuLuu
    .filter(luot => Number(luot.productId) === Number(idSanPham))
    .map(luot => ({
      ...luot,
      amount: Number(luot.amount),
      timestamp: luot.timestamp || new Date().toISOString()
    }));

  // Sắp xếp lượt đặt giá thật: mức giá cao nhất và thời gian mới nhất lên trên
  lichSuSanPham.sort((a, b) => b.amount - a.amount || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 3. Tạo các lượt đặt giá giả lập ở quá khứ (lùi dần đều về cả giá tiền và mốc thời gian)
  const lichSuMau = taoLichSuMau(idSanPham, lichSuSanPham);

  // 4. Gộp toàn bộ lịch sử đấu giá
  let tatCaLichSu = [...lichSuSanPham, ...lichSuMau];

  // 5. Sắp xếp toàn bộ lịch sử theo quy tắc chuẩn mực đấu giá:
  // - Lượt đặt giá cao nhất (mới nhất) LUÔN NẰM TRÊN CÙNG
  // - Các lượt trước đó giảm dần đều về số tiền và lùi dần về quá khứ
  tatCaLichSu.sort((a, b) => {
    if (b.amount !== a.amount) {
      return b.amount - a.amount;
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Cập nhật huy hiệu tổng số lượt đặt giá trên tab
  const tongSoLuot = Math.max(tatCaLichSu.length, sanPhamHienTai?.bidCount || 0);
  if (huyHieuSoLuot) huyHieuSoLuot.textContent = tongSoLuot;

  if (tatCaLichSu.length === 0) {
    tbody.innerHTML = '';
    if (thongBaoTrong) thongBaoTrong.hidden = false;
    return;
  }

  if (thongBaoTrong) thongBaoTrong.hidden = true;

  // Render từng hàng lịch sử
  tbody.innerHTML = tatCaLichSu.map((luot, chiSo) => {
    const laDanDau = chiSo === 0;
    // Hiển thị họ tên kèm UID che bớt: UID là định danh duy nhất, không trùng như email / họ tên
    const nguoiDat = describeBidder(luot);
    const taiKhoanDat = findAccount({ id: luot.bidderId, username: luot.bidderName });
    const tenDat = taiKhoanDat?.username
      ? `<a class="pcb-pd__history-name" href="profile.html?user=${encodeURIComponent(taiKhoanDat.username)}">${maHoaHtml(nguoiDat.name)}</a>`
      : maHoaHtml(nguoiDat.name);
    const tenHienThi = `${tenDat}${nguoiDat.maskedUid ? ` <span class="pcb-pd__history-uid">${maHoaHtml(nguoiDat.maskedUid)}</span>` : ''}`;
    const soTienHienThi = dinhDangVnd(luot.amount);
    const thoiGianHienThi = dinhDangThoiGian(luot.timestamp);

    return `
      <tr class="${laDanDau ? 'pcb-pd__history-row--top' : ''}">
        <td>
          <span class="pcb-pd__history-bidder">
            ${laDanDau ? '<span class="pcb-pd__history-bidder-badge">&#x1F947; Dẫn đầu</span>' : ''}
            ${tenHienThi}
          </span>
        </td>
        <td class="pcb-pd__history-amount">${soTienHienThi}</td>
        <td class="pcb-pd__history-time">${thoiGianHienThi}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Tạo danh sách lịch sử đặt giá mẫu (mock data) cho sản phẩm
 * Đảm bảo các lượt lùi dần đều về số tiền và thời gian, không bao giờ nhảy giá lung tung
 * @param {number} idSanPham - ID sản phẩm
 * @param {Array} lichSuSanPham - Các lượt đặt giá thực tế hiện có
 * @returns {Array} Mảng các lượt đặt giá mẫu hợp lệ
 */
function taoLichSuMau(idSanPham, lichSuSanPham = []) {
  if (!sanPhamHienTai) return [];

  // Người đặt giá mẫu lấy từ accounts.js (mỗi người có họ tên và UID cố định)
  const tenNguoiMau = MOCK_BIDDERS.slice(0, 7).map(nguoi => nguoi.username);

  const buocGia = Number(sanPhamHienTai.bidStep) || 100000;
  const giaKhoiDiem = Number(sanPhamHienTai.startingPrice) || 1000000;

  // Số lượt mẫu cần sinh = tổng lượt bid của sản phẩm trừ đi số lượt bid thực tế đã lưu
  const tongSoLuot = Number(sanPhamHienTai.bidCount) || 0;
  const soLuotCanSinh = Math.max(0, tongSoLuot - lichSuSanPham.length);
  if (soLuotCanSinh === 0) return [];

  // Bộ sinh số giả ngẫu nhiên theo ID sản phẩm để lịch sử không bị thay đổi mỗi lần render lại
  let hatGiong = (Number(idSanPham) || 1) * 9301 + 49297;
  const ngauNhien = () => {
    hatGiong = (hatGiong * 9301 + 49297) % 233280;
    return hatGiong / 233280;
  };

  // Xác định điểm xuất phát để sinh các lượt đặt giá mẫu lùi dần về quá khứ
  let giaBatDauMau;
  let thoiGianBatDauMau;

  if (lichSuSanPham.length > 0) {
    // Nếu đã có lượt bid thực tế: lượt mẫu cao nhất phải THẤP HƠN lượt thật thấp nhất
    const lowestRealBid = lichSuSanPham[lichSuSanPham.length - 1];
    giaBatDauMau = lowestRealBid.amount - buocGia;
    thoiGianBatDauMau = new Date(lowestRealBid.timestamp).getTime();
  } else {
    // Nếu chưa có lượt bid thực tế nào: lượt mẫu cao nhất chính là giá hiện tại
    giaBatDauMau = Number(sanPhamHienTai.currentBid) || (giaKhoiDiem + buocGia * 3);
    // Mốc thời gian lượt cao nhất: không vượt quá thời điểm kết thúc phiên
    const thoiDiemKetThuc = Number(sanPhamHienTai.endTimestamp) || new Date(sanPhamHienTai.endTime).getTime();
    thoiGianBatDauMau = Math.min(Date.now(), Number.isFinite(thoiDiemKetThuc) ? thoiDiemKetThuc : Date.now());
  }

  const lichSuMau = [];
  let giaTam = giaBatDauMau;
  let thoiGianTam = thoiGianBatDauMau;
  let tenTruocDo = '';

  for (let i = 0; i < soLuotCanSinh; i++) {
    if (giaTam < giaKhoiDiem) break; // Tuyệt đối không sinh giá thấp hơn giá khởi điểm

    // Lượt đầu tiên (cao nhất) giữ nguyên mốc thời gian, các lượt trước lùi lại 15 - 45 phút
    if (i > 0) {
      thoiGianTam -= (Math.floor(ngauNhien() * 30) + 15) * 60 * 1000;
    }

    // Chọn tên người đặt giá khác với lượt liền kề (không tự vượt giá chính mình)
    let tenHienTai = tenNguoiMau[Math.floor(ngauNhien() * tenNguoiMau.length)];
    // Phiên đã chốt: lượt cao nhất luôn là của người thắng
    if (i === 0 && lichSuSanPham.length === 0 && sanPhamHienTai.winner) tenHienTai = sanPhamHienTai.winner;
    if (tenHienTai === tenTruocDo) {
      tenHienTai = tenNguoiMau[(tenNguoiMau.indexOf(tenHienTai) + 1) % tenNguoiMau.length];
    }
    tenTruocDo = tenHienTai;

    lichSuMau.push({
      id: `mock_${idSanPham}_${i}`,
      productId: idSanPham,
      bidderName: tenHienTai,
      amount: giaTam,
      timestamp: new Date(thoiGianTam).toISOString()
    });

    // Tính bước nhảy giá cho lượt kế tiếp trong quá khứ:
    // chia đều khoảng giá còn lại cho số lượt còn lại để lượt cuối không thấp hơn giá khởi điểm
    const soLuotConLai = soLuotCanSinh - i - 1;
    if (soLuotConLai <= 0) break;
    const soBuocConLai = Math.floor((giaTam - giaKhoiDiem) / buocGia);
    const soBuocToiDa = Math.max(1, Math.floor(soBuocConLai / soLuotConLai));
    const soBuocNhay = 1 + Math.floor(ngauNhien() * soBuocToiDa);
    giaTam -= soBuocNhay * buocGia;
  }

  return lichSuMau;
}

/* ==========================================================================
   8. NGHIỆP VỤ ĐẶT GIÁ (BIDDING LOGIC)
   ========================================================================== */

/**
 * Xử lý sự kiện khi người dùng nhấn nút "XÁC NHẬN ĐẶT GIÁ"
 */
function xuLyDatGia() {
  if (!sanPhamHienTai) return;

  const oNhapGia = document.getElementById('pcb-pd-bid-input');
  const oLoi = document.getElementById('pcb-pd-bid-error');
  if (!oNhapGia) return;

  // Xóa lỗi cũ
  if (oLoi) { oLoi.hidden = true; oLoi.textContent = ''; }
  oNhapGia.classList.remove('pcb-pd__input--error');

  // Phiên đã kết thúc hoặc đã chốt: không nhận thêm lượt đặt giá
  if (isAuctionClosed(sanPhamHienTai) || getAuctionEndTimestamp(sanPhamHienTai) <= Date.now()) {
    hienThiLoi(oLoi, oNhapGia, 'Phiên đấu giá đã kết thúc, không thể đặt giá thêm.');
    hienThiPhienKetThuc();
    return;
  }

  const soTienNhap = Number(oNhapGia.value);
  const giaToiThieu = (sanPhamHienTai.currentBid || sanPhamHienTai.startingPrice) + sanPhamHienTai.bidStep;

  // Kiểm tra người dùng đã đăng nhập chưa
  let nguoiDung = null;
  try {
    nguoiDung = JSON.parse(localStorage.getItem('pcbid_currentUser') || 'null');
  } catch {
    nguoiDung = null;
  }

  if (!nguoiDung) {
    hienThiLoi(oLoi, oNhapGia, 'Bạn cần đăng nhập để đặt giá. Đang chuyển hướng...');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

  // Validate số tiền nhập vào
  if (!soTienNhap || isNaN(soTienNhap)) {
    hienThiLoi(oLoi, oNhapGia, 'Vui lòng nhập số tiền hợp lệ.');
    return;
  }

  if (soTienNhap < giaToiThieu) {
    hienThiLoi(oLoi, oNhapGia,
      `Số tiền phải ít nhất ${dinhDangVnd(giaToiThieu)} (giá hiện tại + 1 bước giá).`
    );
    return;
  }

  // Kiểm tra người dùng không tự đấu với chính họ
  if (nguoiDung.username === sanPhamHienTai.seller ||
      nguoiDung.fullname === sanPhamHienTai.seller ||
      nguoiDung.email === sanPhamHienTai.seller) {
    hienThiLoi(oLoi, oNhapGia, 'Bạn không thể đặt giá cho sản phẩm chính mình đăng bán.');
    return;
  }

  // Kiểm tra số dư khả dụng đủ giữ cọc 10% cho mức giá mới
  const kiemTraCoc = checkBidDeposit(nguoiDung, sanPhamHienTai.id, soTienNhap);
  if (!kiemTraCoc.ok) {
    hienThiLoi(oLoi, oNhapGia,
      `Số dư khả dụng (${dinhDangVnd(kiemTraCoc.available)}) không đủ giữ cọc 10% (${dinhDangVnd(kiemTraCoc.required)}). Vui lòng nạp thêm tiền ở trang Hồ sơ.`
    );
    return;
  }

  // Tất cả hợp lệ: thực hiện đặt giá
  thucHienDatGia(nguoiDung, soTienNhap);
}

/**
 * Hiển thị thông báo lỗi xác thực tại ô nhập giá
 * @param {HTMLElement} oLoi - Phần tử hiển thị lỗi
 * @param {HTMLInputElement} oNhapGia - Ô nhập giá cần tô đỏ
 * @param {string} thongBao - Nội dung thông báo lỗi
 */
function hienThiLoi(oLoi, oNhapGia, thongBao) {
  if (oLoi) { oLoi.textContent = '⚠ ' + thongBao; oLoi.hidden = false; }
  if (oNhapGia) oNhapGia.classList.add('pcb-pd__input--error');
}

/**
 * Thực hiện lưu lượt đặt giá vào localStorage và cập nhật giao diện
 * @param {Object} nguoiDung - Đối tượng người dùng đang đăng nhập
 * @param {number} soTien - Số tiền đặt giá đã được xác thực
 */
function thucHienDatGia(nguoiDung, soTien) {
  // Tạo bản ghi lượt đặt giá mới
  const luotMoi = {
    id: taoIdNgauNhien(),
    productId: sanPhamHienTai.id,
    // Định danh người đặt bằng ID tài khoản (không trùng), kèm họ tên để hiển thị
    bidderId: nguoiDung.id || null,
    bidderFullname: nguoiDung.fullname || nguoiDung.username || '',
    bidderName: nguoiDung.username,
    amount: soTien,
    timestamp: new Date().toISOString()
  };

  // Lưu vào localStorage key pcbid_bids
  let lichSu = [];
  try { lichSu = JSON.parse(localStorage.getItem('pcbid_bids') || '[]'); } catch { lichSu = []; }
  lichSu.unshift(luotMoi); // Thêm vào đầu mảng (mới nhất trước)
  localStorage.setItem('pcbid_bids', JSON.stringify(lichSu));

  // Cập nhật giá hiện tại của sản phẩm trong localStorage
  sanPhamHienTai.currentBid = soTien;
  sanPhamHienTai.bidCount = (sanPhamHienTai.bidCount || 0) + 1;
  capNhatSanPhamTrongLocalStorage(sanPhamHienTai);

  // Cập nhật giao diện giá và số lượt
  capNhatGia(sanPhamHienTai);
  const soluot = document.getElementById('pcb-pd-bid-count');
  if (soluot) soluot.textContent = sanPhamHienTai.bidCount;

  // Cập nhật giá trị mặc định ô nhập cho lần tiếp theo
  const oNhapGia = document.getElementById('pcb-pd-bid-input');
  if (oNhapGia) {
    const giaToiThieuMoi = soTien + sanPhamHienTai.bidStep;
    oNhapGia.value = giaToiThieuMoi;
    oNhapGia.min = giaToiThieuMoi;
    oNhapGia.classList.remove('pcb-pd__input--error');
  }

  // Đồng bộ phiên vừa đặt giá vào tab "Phiên đang tham gia" (pcbid_my_auctions_participating) của profile.html
  try {
    let participating = JSON.parse(localStorage.getItem('pcbid_my_auctions_participating') || '[]');
    const pIndex = participating.findIndex(p => p.id === sanPhamHienTai.id);
    const specsList = sanPhamHienTai.specifications
      ? Object.entries(sanPhamHienTai.specifications).slice(0, 2).map(([k, v]) => `${k}: ${v}`)
      : [];
    const partItem = {
      id: sanPhamHienTai.id,
      name: sanPhamHienTai.name,
      category: sanPhamHienTai.category,
      currentBid: soTien,
      myBid: soTien,
      bidCount: sanPhamHienTai.bidCount,
      status: 'lead',
      bidStep: sanPhamHienTai.bidStep || 100000,
      endTimestamp: getAuctionEndTimestamp(sanPhamHienTai),
      images: sanPhamHienTai.images || ['images/products/gpu/2018-rtx-4070-12gb-1.webp'],
      specs: specsList
    };
    if (pIndex >= 0) {
      participating[pIndex] = partItem;
    } else {
      participating.unshift(partItem);
    }
    localStorage.setItem('pcbid_my_auctions_participating', JSON.stringify(participating));
  } catch (e) {
    console.warn('[PCBid] Không thể đồng bộ phiên tham gia vào profile:', e);
  }

  // Làm mới bảng lịch sử
  renderLichSu(sanPhamHienTai.id);

  // Hiển thị modal thành công
  hienThiModalThanhCong(sanPhamHienTai.name, soTien);
}

/**
 * Cập nhật thông tin sản phẩm (giá đấu hiện tại) trong localStorage
 * @param {Object} sanPham - Đối tượng sản phẩm cần cập nhật
 */
function capNhatSanPhamTrongLocalStorage(sanPham) {
  try {
    const danhSach = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
    const chiSo = danhSach.findIndex(sp => Number(sp.id) === Number(sanPham.id));
    if (chiSo !== -1) {
      danhSach[chiSo] = { ...danhSach[chiSo], ...sanPham };
    } else {
      danhSach.push(sanPham);
    }
    localStorage.setItem('pcbid_products', JSON.stringify(danhSach));
  } catch {
    // Bỏ qua lỗi localStorage
  }
}

/* ==========================================================================
   9. MODAL ĐẶT GIÁ THÀNH CÔNG
   ========================================================================== */

/**
 * Hiển thị modal thông báo đặt giá thành công với thông tin chi tiết
 * @param {string} tenSanPham - Tên sản phẩm vừa đặt giá
 * @param {number} soTien - Số tiền vừa đặt thành công
 */
function hienThiModalThanhCong(tenSanPham, soTien) {
  const modal = document.getElementById('pcb-pd-modal');
  const oTenSP = document.getElementById('pcb-pd-modal-product');
  const oSoTien = document.getElementById('pcb-pd-modal-amount');

  if (oTenSP) oTenSP.textContent = tenSanPham;
  if (oSoTien) oSoTien.textContent = dinhDangVnd(soTien);
  if (modal) {
    modal.hidden = false;
    modal.removeAttribute('hidden');
  }

  // Ngăn cuộn trang khi modal mở
  document.body.style.overflow = 'hidden';
}

/**
 * Đóng modal và khôi phục trạng thái cuộn trang
 */
function dongModal() {
  const modal = document.getElementById('pcb-pd-modal');
  if (modal) {
    modal.hidden = true;
    modal.setAttribute('hidden', '');
  }
  document.body.style.overflow = '';
}

/* ==========================================================================
   10. TOAST THÔNG BÁO NHANH
   ========================================================================== */

/**
 * Hiển thị toast thông báo nhanh (tự động ẩn sau vài giây)
 * @param {string} thongBao - Nội dung thông báo
 * @param {'info'|'success'|'error'} kieuThongBao - Loại thông báo
 * @param {number} [thoiGianMs=3000] - Thời gian hiển thị tính bằng mili giây
 */
function hienThiToast(thongBao, kieuThongBao = 'info', thoiGianMs = 3000) {
  const toast = document.getElementById('pcb-pd-toast');
  const oIcon = document.getElementById('pcb-pd-toast-icon');
  const oNoi = document.getElementById('pcb-pd-toast-msg');
  if (!toast) return;

  const banDoIcon = { info: 'ℹ️', success: '✅', error: '❌' };
  toast.className = `pcb-pd-toast pcb-pd-toast--${kieuThongBao}`;
  if (oIcon) oIcon.textContent = banDoIcon[kieuThongBao] || 'ℹ️';
  if (oNoi) oNoi.textContent = thongBao;
  toast.hidden = false;

  setTimeout(() => { toast.hidden = true; }, thoiGianMs);
}

/* ==========================================================================
   11. WATCHLIST (DANH SÁCH THEO DÕI)
   ========================================================================== */

/**
 * Kiểm tra sản phẩm có trong watchlist không và cập nhật nút tương ứng
 * @param {number} idSanPham - ID sản phẩm cần kiểm tra
 */
function capNhatNutWatchlist(idSanPham) {
  const nut = document.getElementById('pcb-pd-watchlist-btn');
  const icon = document.getElementById('pcb-pd-watchlist-icon');
  const nhan = document.getElementById('pcb-pd-watchlist-label');

  const watchlist = readUserList(USER_LIST_KEYS.WATCHLIST, readLoggedInUser());

  const daCoTrong = watchlist.some(item => (typeof item === "object" ? item.id : item) === idSanPham);
  if (nut) {
    nut.setAttribute('aria-pressed', daCoTrong ? 'true' : 'false');
    nut.classList.toggle('pcb-pd__watchlist-btn--active', daCoTrong);
  }
  if (icon) icon.textContent = daCoTrong ? '❤️' : '🤍';
  if (nhan) nhan.textContent = daCoTrong ? 'Đã theo dõi' : 'Thêm vào Watchlist';
}

/**
 * Bật/tắt trạng thái theo dõi sản phẩm trong watchlist localStorage
 * @param {number} idSanPham - ID sản phẩm cần toggle
 */
function batTatWatchlist(idSanPham) {
  // Bắt buộc đăng nhập để watchlist gắn với đúng tài khoản
  const nguoiDung = readLoggedInUser();
  if (!nguoiDung) {
    hienThiToast('Bạn cần đăng nhập để theo dõi phiên đấu giá.', 'info');
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    return;
  }
  let watchlist = readUserList(USER_LIST_KEYS.WATCHLIST, nguoiDung);

  const daCoTrong = watchlist.some(item => (typeof item === 'object' ? item.id : item) === idSanPham);
  if (daCoTrong) {
    watchlist = watchlist.filter(item => (typeof item === 'object' ? item.id : item) !== idSanPham);
    hienThiToast('Đã xóa khỏi danh sách theo dõi.', 'info');
  } else {
    const specsList = sanPhamHienTai?.specifications
      ? Object.entries(sanPhamHienTai.specifications).slice(0, 2).map(([k, v]) => `${k}: ${v}`)
      : [];
    const itemObj = {
      id: sanPhamHienTai.id,
      name: sanPhamHienTai.name,
      category: sanPhamHienTai.category,
      currentBid: sanPhamHienTai.currentBid || sanPhamHienTai.startingPrice,
      marketPriceNew: sanPhamHienTai.marketPriceNew || Math.round((sanPhamHienTai.currentBid || sanPhamHienTai.startingPrice) * 1.5),
      bidCount: sanPhamHienTai.bidCount || 0,
      endTimestamp: getAuctionEndTimestamp(sanPhamHienTai),
      images: sanPhamHienTai.images || ['images/products/gpu/2018-rtx-4070-12gb-1.webp'],
      specs: specsList
    };
    watchlist.unshift(itemObj);
    hienThiToast('Đã thêm vào danh sách theo dõi!', 'success');
  }

  writeUserList(USER_LIST_KEYS.WATCHLIST, nguoiDung, watchlist);
  capNhatNutWatchlist(idSanPham);

  const headerBadge = document.getElementById('header-watchlist-badge');
  if (headerBadge) headerBadge.textContent = watchlist.length;
}

/* ==========================================================================
   12. ĐIỀU HƯỚNG TAB NỘI DUNG DƯỚI
   ========================================================================== */

/**
 * Khởi tạo hệ thống tab cho phần thân dưới (Thông số / Mô tả / Lịch sử)
 */
function khoiDongHeTongTab() {
  const nhuomTab = document.querySelector('.pcb-pd__tabs');
  if (!nhuomTab) return;

  nhuomTab.addEventListener('click', (su_kien) => {
    const nutTab = su_kien.target.closest('[role="tab"]');
    if (!nutTab) return;

    const tenTab = nutTab.dataset.tab;

    // Cập nhật trạng thái active cho tất cả tab
    nhuomTab.querySelectorAll('[role="tab"]').forEach(nut => {
      nut.classList.remove('pcb-pd__tab--active');
      nut.setAttribute('aria-selected', 'false');
    });
    nutTab.classList.add('pcb-pd__tab--active');
    nutTab.setAttribute('aria-selected', 'true');

    // Ẩn tất cả panel và hiện panel được chọn
    document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
      panel.classList.remove('pcb-pd__panel--active');
      panel.hidden = true;
    });

    const panelTuongUng = document.getElementById(`pcb-pd-panel-${tenTab}`);
    if (panelTuongUng) {
      panelTuongUng.hidden = false;
      panelTuongUng.classList.add('pcb-pd__panel--active');
    }
  });
}

/* ==========================================================================
   13. GẮN CÁC SỰ KIỆN TƯƠNG TÁC (EVENT LISTENERS)
   ========================================================================== */

/**
 * Gắn toàn bộ event listener sau khi sản phẩm đã được render lên giao diện
 */
function ganSuKien() {
  // Nút "XÁC NHẬN ĐẶT GIÁ"
  const nutDatGia = document.getElementById('pcb-pd-submit-btn');
  if (nutDatGia) nutDatGia.addEventListener('click', xuLyDatGia);

  // Các nút nhảy giá nhanh (+100k, +200k, ...)
  document.querySelectorAll('.pcb-pd__quick-btn').forEach(nut => {
    nut.addEventListener('click', () => {
      const soTienTang = Number(nut.dataset.amount);
      const oNhapGia = document.getElementById('pcb-pd-bid-input');
      if (oNhapGia) {
        const giaHienTaiONhap = Number(oNhapGia.value) || 0;
        oNhapGia.value = giaHienTaiONhap + soTienTang;
        // Xóa trạng thái lỗi khi người dùng thay đổi giá
        oNhapGia.classList.remove('pcb-pd__input--error');
        const oLoi = document.getElementById('pcb-pd-bid-error');
        if (oLoi) { oLoi.hidden = true; }
      }
    });
  });

  // Nút đóng modal
  const nutDongModal = document.getElementById('pcb-pd-modal-close');
  if (nutDongModal) nutDongModal.addEventListener('click', dongModal);

  // Nhấn overlay nền mờ cũng đóng modal
  const overlayModal = document.getElementById('pcb-pd-modal-overlay');
  if (overlayModal) overlayModal.addEventListener('click', dongModal);

  // Phím Escape đóng modal
  document.addEventListener('keydown', (su_kien) => {
    if (su_kien.key === 'Escape') dongModal();
  });

  // Nút thêm/bỏ watchlist
  const nutWatchlist = document.getElementById('pcb-pd-watchlist-btn');
  // Lưu ý: ganSuKien() chạy trước khi sản phẩm nạp xong, nên kiểm tra sanPhamHienTai ngay lúc bấm
  if (nutWatchlist) {
    nutWatchlist.addEventListener('click', () => {
      if (sanPhamHienTai) batTatWatchlist(sanPhamHienTai.id);
    });
  }

  // Xóa lỗi khi người dùng gõ vào ô nhập giá
  const oNhapGia = document.getElementById('pcb-pd-bid-input');
  if (oNhapGia) {
    oNhapGia.addEventListener('input', () => {
      oNhapGia.classList.remove('pcb-pd__input--error');
      const oLoi = document.getElementById('pcb-pd-bid-error');
      if (oLoi) { oLoi.hidden = true; }
    });
  }
}

/* ==========================================================================
   14. ĐIỂM KHỞI ĐỘNG CHÍNH (MAIN ENTRY POINT)
   ========================================================================== */

/**
 * Điểm khởi động chính của module — chạy sau khi DOM đã sẵn sàng
 */
async function khoiDong() {
  // Gắn toàn bộ bộ lắng nghe sự kiện (event listener) và khởi tạo tab ngay từ đầu
  ganSuKien();
  khoiDongHeTongTab();

  // Đọc ID sản phẩm từ tham số URL (?id=2011). Nếu người dùng mở trực tiếp, mặc định nạp sản phẩm mẫu 2011 (RTX 3070)
  const thamSoUrl = new URLSearchParams(window.location.search);
  const idChuoi = thamSoUrl.get('id');
  const idSanPham = (idChuoi && !isNaN(parseInt(idChuoi, 10))) ? parseInt(idChuoi, 10) : 2011;

  const vungLoading = document.getElementById('pcb-pd-loading');
  const vungLoi = document.getElementById('pcb-pd-error');
  const vungLayout = document.getElementById('pcb-pd-layout');
  const vungBody = document.getElementById('pcb-pd-body');

  // Hiển thị trạng thái loading
  if (vungLoading) vungLoading.hidden = false;
  if (vungLoi) vungLoi.hidden = true;
  if (vungLayout) vungLayout.hidden = true;
  if (vungBody) vungBody.hidden = true;

  // Tìm sản phẩm theo ID
  const sanPham = await timSanPhamTheoId(idSanPham);

  // Ẩn loading sau khi có kết quả
  if (vungLoading) vungLoading.hidden = true;

  if (!sanPham) {
    if (vungLoi) vungLoi.hidden = false;
    return;
  }

  // Hiển thị nội dung trang
  if (vungLayout) vungLayout.hidden = false;
  if (vungBody) vungBody.hidden = false;

  // Render toàn bộ thông tin sản phẩm
  hienThiSanPham(sanPham);
}

// Chạy module sau khi DOM đã nạp xong
document.addEventListener('DOMContentLoaded', khoiDong);

// Lắng nghe khi quay lại trang qua back/forward cache hoặc có lượt đặt giá từ tab khác
window.addEventListener('pageshow', (event) => {
  if (event.persisted && sanPhamHienTai) {
    timSanPhamTheoId(sanPhamHienTai.id).then(sp => {
      if (sp) hienThiSanPham(sp);
    });
  }
});

window.addEventListener('storage', (e) => {
  if ((e.key === 'pcbid_products' || e.key === 'pcbid_bids') && sanPhamHienTai) {
    timSanPhamTheoId(sanPhamHienTai.id).then(sp => {
      if (sp) hienThiSanPham(sp);
    });
  }
});
