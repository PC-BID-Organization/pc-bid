/**
 * PCBid - Tập lệnh Trang Chi Tiết Phiên Đấu Giá (product-detail.js)
 * Xử lý toàn bộ nghiệp vụ: nạp sản phẩm, đồng hồ đếm ngược, đặt giá,
 * lịch sử trả giá, watchlist — 100% Vanilla JavaScript (ES6+).
 */

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
  // File cũ (đường dẫn gộp) để tương thích ngược
  'data/cpu-gpu.json',
  'data/mainboard-ram.json',
  'data/storage-psu.json',
  'data/case-cooling.json',
];

// Dữ liệu dự phòng khi fetch thất bại (mở qua giao thức file:/// hoặc mạng lỗi)
const SAN_PHAM_DU_PHONG = [
  {
    id: 2001,
    name: 'Card màn hình ASUS ROG Strix GeForce RTX 3070 8GB OC',
    category: 'GPU',
    condition: 'Like New 99% - Fullbox, Tem Void SPC nguyên vẹn, chưa phá seal',
    startingPrice: 4200000,
    currentBid: 5800000,
    bidStep: 100000,
    bidCount: 16,
    marketPriceNew: 12500000,
    endTime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    seller: 'hoanglong_pc',
    images: ['images/products/gpu/2018-rtx-4070-12gb-1.webp'],
    description: 'Card còn mới gần như 100%, mua về không hợp socket. Box đầy đủ phụ kiện, chạy Furmark 30 phút ổn định 67°C. Bao test 48 giờ, ship toàn quốc.',
    specifications: { 'VRAM': '8GB GDDR6', 'Nhiệt độ Furmark': '67°C', 'Chuẩn kết nối': 'PCIe 4.0 x16', 'Cổng xuất hình': '3x DisplayPort 1.4 + 1x HDMI 2.1' }
  },
  {
    id: 1001,
    name: 'Bộ vi xử lý AMD Ryzen 7 5800X3D (8C/16T, 96MB V-Cache)',
    category: 'CPU',
    condition: 'Đã sử dụng - Chân Socket AM4 hoàn hảo, bao test 7 ngày',
    startingPrice: 3800000,
    currentBid: 4900000,
    bidStep: 100000,
    bidCount: 22,
    marketPriceNew: 8900000,
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    seller: 'gaming_zone_vn',
    images: ['images/products/cpu/1019-ryzen-5-5600-1.jpg'],
    description: 'CPU gaming số 1 AM4 với 96MB V-Cache. Dùng trên main B550 trong 8 tháng, nhiệt độ idle 38°C. Bao test MemTest86 và Cinebench, chân pin nguyên vẹn không cong.',
    specifications: { 'Socket': 'AM4', 'Nhân / Luồng': '8C / 16T', 'Cache L3': '96MB 3D V-Cache', 'TDP': '105W', 'Xung cơ sở': '3.4 GHz', 'Xung boost': '4.5 GHz' }
  },
  {
    id: 3001,
    name: 'Bo mạch chủ MSI MAG Z790 TOMAHAWK WIFI DDR5',
    category: 'Mainboard',
    condition: 'Like New 99% - Fullbox phụ kiện râu anten, chặn main còn nguyên',
    startingPrice: 3500000,
    currentBid: 4600000,
    bidStep: 100000,
    bidCount: 11,
    marketPriceNew: 7200000,
    endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    seller: 'pc_premium_uit',
    images: ['images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg'],
    description: 'Main Z790 dùng với i5-13600K được 6 tháng. Nâng cấp lên X, cần thanh lý. Còn đầy đủ phụ kiện cáp SATA, chặn main, anten WiFi. BIOS mới nhất.',
    specifications: { 'Socket': 'LGA 1700', 'Chipset': 'Intel Z790', 'Chuẩn RAM': 'DDR5', 'Khe RAM': '4 khe (tối đa 192GB)', 'Form Factor': 'ATX', 'Khe M.2': '4 khe PCIe 4.0/5.0' }
  },
  {
    id: 4001,
    name: 'RAM G.SKILL Trident Z RGB 32GB (2x16GB) 3600MHz DDR4',
    category: 'RAM',
    condition: 'Đã sử dụng - MemTest86 2 lượt 0 error, tản nhôm phay xước nhẹ',
    startingPrice: 1100000,
    currentBid: 1650000,
    bidStep: 50000,
    bidCount: 11,
    marketPriceNew: 2800000,
    endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    seller: 'linhkien_chinhhang',
    images: ['images/products/ram/4001-gskill-trident-z-rgb-1.jpg'],
    description: 'RAM DDR4 3600 CL18 kit đôi chạy ổn định với XMP. LED RGB hoạt động đầy đủ. MemTest86 2 lượt không lỗi. Tản nhôm có vài vết xước nhỏ do tháo lắp.',
    specifications: { 'Dung lượng': '32GB (2x16GB)', 'Chuẩn': 'DDR4', 'Bus': '3600MHz', 'CAS Latency': 'CL18', 'Điện áp': '1.35V', 'LED': 'RGB (có phần mềm điều khiển)' }
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

/**
 * Che bớt tên người dùng để bảo vệ quyền riêng tư trong lịch sử đặt giá
 * Ví dụ: "hoanglong_pc" → "hoa****_pc"
 * @param {string} tenNguoiDung - Tên tài khoản gốc
 * @returns {string} Tên đã được che bớt
 */
function cheKhuatTen(tenNguoiDung) {
  if (!tenNguoiDung || tenNguoiDung.length <= 4) return '****';
  const hienThi = tenNguoiDung.slice(0, 3);
  const phanCuoi = tenNguoiDung.slice(-3);
  return `${hienThi}***${phanCuoi}`;
}

/* ==========================================================================
   4. NẠP DỮ LIỆU SẢN PHẨM (DATA LOADING)
   ========================================================================== */

/**
 * Nạp danh sách tất cả sản phẩm từ localStorage hoặc các file JSON tĩnh
 * @returns {Promise<Array>} Mảng sản phẩm đã nạp
 */
async function nạpTatCaSanPham() {
  // Ưu tiên 1: Đọc từ localStorage nếu đã có dữ liệu được khởi tạo trước
  const duLieuLuu = localStorage.getItem('pcbid_products');
  if (duLieuLuu) {
    try {
      const danhSach = JSON.parse(duLieuLuu);
      if (Array.isArray(danhSach) && danhSach.length > 0) {
        return danhSach;
      }
    } catch {
      // localStorage bị hỏng, tiếp tục thử fetch
    }
  }

  // Ưu tiên 2: Fetch từ các file JSON tĩnh trong project
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

  if (ketQuaFetch.length > 0) {
    // Lưu vào localStorage để các lần sau dùng lại
    localStorage.setItem('pcbid_products', JSON.stringify(ketQuaFetch));
    return ketQuaFetch;
  }

  // Ưu tiên 3 (dự phòng): Dùng dữ liệu mock cứng trong code
  console.warn('[PCBid] Không fetch được file JSON, dùng dữ liệu dự phòng.');
  return SAN_PHAM_DU_PHONG;
}

/**
 * Tìm sản phẩm theo ID từ danh sách đã nạp
 * @param {number} id - ID sản phẩm cần tìm
 * @returns {Promise<Object|null>} Đối tượng sản phẩm hoặc null nếu không có
 */
async function timSanPhamTheoId(id) {
  const danhSach = await nạpTatCaSanPham();
  return danhSach.find(sp => sp.id === id) || null;
}

/* ==========================================================================
   5. RENDER GIAO DIỆN SẢN PHẨM
   ========================================================================== */

/**
 * Hiển thị toàn bộ thông tin sản phẩm lên giao diện trang
 * @param {Object} sanPham - Đối tượng sản phẩm cần hiển thị
 */
function hienThiSanPham(sanPham) {
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
  if (oTen) oTen.textContent = tenNguoiBan;
  if (oAvatar) oAvatar.textContent = tenNguoiBan.charAt(0).toUpperCase();
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
  if (thongBaoKetThuc) thongBaoKetThuc.hidden = false;
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

  // Đọc lịch sử thực từ localStorage
  let lichSuLuu = [];
  try {
    lichSuLuu = JSON.parse(localStorage.getItem('pcbid_bids') || '[]');
  } catch {
    lichSuLuu = [];
  }

  // Lọc chỉ lấy lượt của sản phẩm hiện tại
  const lichSuSanPham = lichSuLuu
    .filter(luot => luot.productId === idSanPham)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Tạo mock data mẫu nếu chưa có lịch sử thực nào
  const lichSuMau = taoLichSuMau(idSanPham);

  // Kết hợp: lịch sử thực đặt trước, mock data mẫu đặt sau
  const tatCaLichSu = [...lichSuSanPham, ...lichSuMau].slice(0, 15);

  // Cập nhật huy hiệu số lượt trên tab
  if (huyHieuSoLuot) huyHieuSoLuot.textContent = tatCaLichSu.length;

  if (tatCaLichSu.length === 0) {
    tbody.innerHTML = '';
    if (thongBaoTrong) thongBaoTrong.hidden = false;
    return;
  }

  if (thongBaoTrong) thongBaoTrong.hidden = true;

  // Render từng hàng lịch sử
  tbody.innerHTML = tatCaLichSu.map((luot, chiSo) => {
    const laDanDau = chiSo === 0;
    const tenHienThi = maHoaHtml(cheKhuatTen(luot.bidderName || 'ẩn danh'));
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
 * Mô phỏng nhiều người dùng đã tham gia trước đó
 * @param {number} idSanPham - ID sản phẩm
 * @returns {Array} Mảng các lượt đặt giá mẫu
 */
function taoLichSuMau(idSanPham) {
  if (!sanPhamHienTai) return [];

  const tenNguoiMau = [
    'techguru_hcm', 'pcbuilder_99', 'gamervn_pro',
    'hardware_shop', 'ngoc_tech', 'viet_pc', 'minhnhat_dng'
  ];

  const giaHienTai = sanPhamHienTai.currentBid || sanPhamHienTai.startingPrice || 0;
  const buocGia = sanPhamHienTai.bidStep || 50000;
  const soLuotMau = Math.min(7, sanPhamHienTai.bidCount || 0);

  const lichSuMau = [];
  let giaTam = giaHienTai;
  const thoiGianKetThuc = new Date(sanPhamHienTai.endTime).getTime();

  for (let i = 0; i < soLuotMau; i++) {
    // Tính thời gian giả lập ngược từ thời điểm kết thúc
    const khoangCachMs = (i + 1) * Math.floor(Math.random() * 30 + 10) * 60 * 1000;
    const thoiGianDat = new Date(thoiGianKetThuc - khoangCachMs - (24 * 60 * 60 * 1000));

    lichSuMau.push({
      id: `mock_${idSanPham}_${i}`,
      productId: idSanPham,
      bidderName: tenNguoiMau[i % tenNguoiMau.length],
      amount: giaTam,
      timestamp: thoiGianDat.toISOString()
    });

    // Mỗi lượt trước thấp hơn một bước giá (cuộn ngược về quá khứ)
    giaTam = Math.max(giaTam - buocGia, sanPhamHienTai.startingPrice);
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
  if (nguoiDung.username === sanPhamHienTai.seller) {
    hienThiLoi(oLoi, oNhapGia, 'Bạn không thể đặt giá cho sản phẩm chính mình đăng bán.');
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
    const chiSo = danhSach.findIndex(sp => sp.id === sanPham.id);
    if (chiSo !== -1) {
      danhSach[chiSo] = { ...danhSach[chiSo], ...sanPham };
      localStorage.setItem('pcbid_products', JSON.stringify(danhSach));
    }
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
  if (modal) modal.hidden = false;

  // Ngăn cuộn trang khi modal mở
  document.body.style.overflow = 'hidden';
}

/**
 * Đóng modal và khôi phục trạng thái cuộn trang
 */
function dongModal() {
  const modal = document.getElementById('pcb-pd-modal');
  if (modal) modal.hidden = true;
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

  let watchlist = [];
  try { watchlist = JSON.parse(localStorage.getItem('pcbid_watchlist') || '[]'); } catch { watchlist = []; }

  const daCoTrong = watchlist.includes(idSanPham);
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
  let watchlist = [];
  try { watchlist = JSON.parse(localStorage.getItem('pcbid_watchlist') || '[]'); } catch { watchlist = []; }

  const daCoTrong = watchlist.includes(idSanPham);
  if (daCoTrong) {
    watchlist = watchlist.filter(id => id !== idSanPham);
    hienThiToast('Đã xóa khỏi danh sách theo dõi.', 'info');
  } else {
    watchlist.push(idSanPham);
    hienThiToast('Đã thêm vào danh sách theo dõi!', 'success');
  }

  localStorage.setItem('pcbid_watchlist', JSON.stringify(watchlist));
  capNhatNutWatchlist(idSanPham);
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
  if (nutWatchlist && sanPhamHienTai) {
    nutWatchlist.addEventListener('click', () => batTatWatchlist(sanPhamHienTai.id));
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
  // Đọc ID sản phẩm từ tham số URL (?id=2001)
  const thamSoUrl = new URLSearchParams(window.location.search);
  const idChuoi = thamSoUrl.get('id');
  const idSanPham = parseInt(idChuoi, 10);

  const vungLoading = document.getElementById('pcb-pd-loading');
  const vungLoi = document.getElementById('pcb-pd-error');
  const vungLayout = document.getElementById('pcb-pd-layout');
  const vungBody = document.getElementById('pcb-pd-body');

  // Hiển thị trạng thái loading
  if (vungLoading) vungLoading.hidden = false;
  if (vungLoi) vungLoi.hidden = true;
  if (vungLayout) vungLayout.hidden = true;
  if (vungBody) vungBody.hidden = true;

  // Kiểm tra tham số ID hợp lệ
  if (!idChuoi || isNaN(idSanPham)) {
    if (vungLoading) vungLoading.hidden = true;
    if (vungLoi) vungLoi.hidden = false;
    return;
  }

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

  // Khởi tạo hệ thống tab nội dung dưới
  khoiDongHeTongTab();

  // Gắn tất cả event listener tương tác
  ganSuKien();
}

// Chạy module sau khi DOM đã nạp xong
document.addEventListener('DOMContentLoaded', khoiDong);
