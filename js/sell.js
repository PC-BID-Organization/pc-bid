/**
 * PCBid - Tập lệnh Xử lý Trang Đăng Phiên Đấu Giá (sell.html)
 * Quản lý lựa chọn Catalogue linh kiện chuẩn, hiển thị thông số kỹ thuật tự động,
 * chọn ảnh đại diện từ kho ảnh, cập nhật Live Preview và lưu phiên vào LocalStorage.
 * 100% Vanilla JavaScript (ES6+), Không framework bên ngoài.
 * Toàn bộ chú thích bằng Tiếng Việt có dấu theo quy định AGENTS.md.
 */

/* ==========================================================================
   1. KHO DỮ LIỆU CATALOGUE LINH KIỆN CHUẨN CỦA SÀN (STANDARD CATALOGUE)
   ========================================================================== */
const CATALOGUE_DATA = {
  GPU: [
    {
      id: "cat_gpu_01",
      name: "Card màn hình ASUS ROG Strix GeForce RTX 3070 8GB OC",
      marketPriceNew: 12500000,
      defaultStartingPrice: 4200000,
      defaultBidStep: 100000,
      images: [
        "images/products/gpu/2018-rtx-4070-12gb-1.webp",
        "images/products/gpu/2001-gtx-1650-super-1.jpg",
        "images/products/gpu/2002-gtx-1660-super-1.jpg",
        "images/products/gpu/2003-gtx-1080-ti-1.jpg"
      ],
      specifications: {
        "Dung lượng VRAM": "8GB GDDR6 (256-bit)",
        "Xung nhịp Boost": "1935 MHz (OC Mode)",
        "Nguồn đề xuất": "650W (2x 8-pin)",
        "Cổng xuất hình": "2x HDMI 2.1, 3x DisplayPort 1.4a",
        "Kích thước": "318.5 x 140.1 x 57.8 mm (2.9 Slot)"
      }
    },
    {
      id: "cat_gpu_02",
      name: "Card màn hình Gigabyte GeForce GTX 1660 Super OC 6GB",
      marketPriceNew: 5500000,
      defaultStartingPrice: 2300000,
      defaultBidStep: 50000,
      images: [
        "images/products/gpu/2002-gtx-1660-super-1.jpg",
        "images/products/gpu/2004-rtx-2060-6gb-1.jpg",
        "images/products/gpu/2005-rtx-2060-super-1.webp",
        "images/products/gpu/2001-gtx-1650-super-1.jpg"
      ],
      specifications: {
        "Dung lượng VRAM": "6GB GDDR6 (192-bit)",
        "Băng thông bộ nhớ": "14 Gbps",
        "Nguồn đề xuất": "450W (1x 8-pin)",
        "Cổng xuất hình": "1x HDMI 2.0b, 3x DisplayPort 1.4",
        "Hệ thống tản nhiệt": "Windforce 2X làm mát xoay chiều"
      }
    },
    {
      id: "cat_gpu_03",
      name: "Card màn hình MSI GeForce GTX 1080 Ti Gaming X 11GB",
      marketPriceNew: 18000000,
      defaultStartingPrice: 3200000,
      defaultBidStep: 100000,
      images: [
        "images/products/gpu/2003-gtx-1080-ti-1.jpg",
        "images/products/gpu/2018-rtx-4070-12gb-1.webp",
        "images/products/gpu/2004-rtx-2060-6gb-1.jpg",
        "images/products/gpu/2002-gtx-1660-super-1.jpg"
      ],
      specifications: {
        "Dung lượng VRAM": "11GB GDDR5X (352-bit)",
        "Xung nhịp Boost": "1683 MHz (OC Mode)",
        "Nguồn đề xuất": "600W (2x 8-pin)",
        "Cổng xuất hình": "2x HDMI, 2x DisplayPort, 1x DL-DVI-D",
        "Kiểm định": "Đạt Furmark 15p < 72°C"
      }
    },
    {
      id: "cat_gpu_04",
      name: "Card màn hình ASUS Phoenix GeForce GTX 1650 Super 4GB",
      marketPriceNew: 3800000,
      defaultStartingPrice: 1400000,
      defaultBidStep: 50000,
      images: [
        "images/products/gpu/2001-gtx-1650-super-1.jpg",
        "images/products/gpu/2002-gtx-1660-super-1.jpg",
        "images/products/gpu/2004-rtx-2060-6gb-1.jpg",
        "images/products/gpu/2005-rtx-2060-super-1.webp"
      ],
      specifications: {
        "Dung lượng VRAM": "4GB GDDR6 (128-bit)",
        "Nguồn đề xuất": "350W (1x 6-pin)",
        "Cổng xuất hình": "1x HDMI 2.0b, 1x DP 1.4, 1x DVI-D",
        "Thiết kế": "1 Quạt vòng bi kép siêu bền"
      }
    }
  ],
  CPU: [
    {
      id: "cat_cpu_01",
      name: "Bộ vi xử lý AMD Ryzen 7 5800X3D (8C/16T, 96MB V-Cache)",
      marketPriceNew: 8900000,
      defaultStartingPrice: 3800000,
      defaultBidStep: 100000,
      images: [
        "images/products/cpu/1019-ryzen-5-5600-1.jpg",
        "images/products/cpu/1002-i5-10400f-1.jpg",
        "images/products/cpu/1003-i7-10700k-1.jpg",
        "images/products/cpu/1001-i3-10105f-1.png"
      ],
      specifications: {
        "Socket": "AM4",
        "Số nhân / Số luồng": "8 Nhân / 16 Luồng",
        "Bộ nhớ đệm (Cache)": "96MB 3D V-Cache",
        "Xung nhịp": "3.4 GHz - Boost 4.5 GHz",
        "Công suất tỏa nhiệt (TDP)": "105W"
      }
    },
    {
      id: "cat_cpu_02",
      name: "Bộ vi xử lý Intel Core i5-12400F (6C/12T, up to 4.4GHz)",
      marketPriceNew: 3600000,
      defaultStartingPrice: 1900000,
      defaultBidStep: 50000,
      images: [
        "images/products/cpu/1002-i5-10400f-1.jpg",
        "images/products/cpu/1001-i3-10105f-1.png",
        "images/products/cpu/1004-i5-11400-1.jpg",
        "images/products/cpu/1005-i7-11700k-1.jpg"
      ],
      specifications: {
        "Socket": "LGA 1700 (Hỗ trợ Gen 12/13/14)",
        "Số nhân / Số luồng": "6 Nhân P-core / 12 Luồng",
        "Xung nhịp Boost": "4.4 GHz",
        "Hỗ trợ RAM": "DDR4 3200MHz / DDR5 4800MHz",
        "Công suất cơ bản (TDP)": "65W"
      }
    },
    {
      id: "cat_cpu_03",
      name: "Bộ vi xử lý Intel Core i7-13700K (16C/24T, up to 5.4GHz)",
      marketPriceNew: 10500000,
      defaultStartingPrice: 5800000,
      defaultBidStep: 100000,
      images: [
        "images/products/cpu/1003-i7-10700k-1.jpg",
        "images/products/cpu/1005-i7-11700k-1.jpg",
        "images/products/cpu/1002-i5-10400f-1.jpg",
        "images/products/cpu/1001-i3-10105f-1.png"
      ],
      specifications: {
        "Socket": "LGA 1700",
        "Số nhân / Số luồng": "16 Nhân (8P + 8E) / 24 Luồng",
        "Xung nhịp Turbo": "5.4 GHz",
        "Card đồ họa tích hợp": "Intel UHD Graphics 770",
        "Công suất tối đa": "253W"
      }
    }
  ],
  Mainboard: [
    {
      id: "cat_mb_01",
      name: "Bo mạch chủ MSI MAG Z790 TOMAHAWK WIFI DDR5",
      marketPriceNew: 7200000,
      defaultStartingPrice: 3500000,
      defaultBidStep: 100000,
      images: [
        "images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg",
        "images/products/mainboard/3001-gigabyte-b760m-gaming-wifi-1.webp",
        "images/products/mainboard/3010-asus-rog-strix-b760-a-gaming-wifi-d4-1.jpg",
        "images/products/mainboard/3002-asrock-b760m-pg-lightning-1.jpg"
      ],
      specifications: {
        "Socket": "LGA 1700",
        "Chipset": "Intel Z790",
        "Chuẩn kích thước": "ATX",
        "Hỗ trợ RAM": "4x DDR5 (Tối đa 192GB, 7200+ MHz)",
        "Khe mở rộng": "1x PCIe 5.0 x16, 4x M.2 PCIe 4.0"
      }
    },
    {
      id: "cat_mb_02",
      name: "Bo mạch chủ GIGABYTE B760M GAMING WIFI PLUS DDR5",
      marketPriceNew: 3690000,
      defaultStartingPrice: 2600000,
      defaultBidStep: 50000,
      images: [
        "images/products/mainboard/3001-gigabyte-b760m-gaming-wifi-1.webp",
        "images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg",
        "images/products/mainboard/3002-asrock-b760m-pg-lightning-1.jpg",
        "images/products/mainboard/3010-asus-rog-strix-b760-a-gaming-wifi-d4-1.jpg"
      ],
      specifications: {
        "Socket": "LGA 1700",
        "Chipset": "Intel B760",
        "Chuẩn kích thước": "Micro-ATX",
        "Hỗ trợ RAM": "2x DDR5 (Tối đa 96GB)",
        "Kết nối không dây": "Wi-Fi 6E & Bluetooth 5.3"
      }
    }
  ],
  RAM: [
    {
      id: "cat_ram_01",
      name: "RAM Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200MHz",
      marketPriceNew: 1250000,
      defaultStartingPrice: 650000,
      defaultBidStep: 50000,
      images: [
        "images/products/ram/4001-corsair-vengeance-lpx-1.jpg",
        "images/products/ram/4002-kingston-fury-beast-8gb-1.jpg",
        "images/products/ram/4003-gskill-trident-z-rgb-16gb-1.jpg",
        "images/products/ram/4011-corsair-vengeance-rgb-ddr5-black-1.jpg"
      ],
      specifications: {
        "Dung lượng": "16GB (2x 8GB)",
        "Chuẩn RAM / Bus": "DDR4 3200MHz",
        "Độ trễ (Timing)": "CL16-20-20-38",
        "Điện áp": "1.35V (Intel XMP 2.0)",
        "Tản nhiệt": "Nhôm Anodized đen mỏng gọn"
      }
    },
    {
      id: "cat_ram_02",
      name: "RAM G.SKILL Trident Z RGB 16GB (2x8GB) DDR4 3200MHz",
      marketPriceNew: 1600000,
      defaultStartingPrice: 850000,
      defaultBidStep: 50000,
      images: [
        "images/products/ram/4003-gskill-trident-z-rgb-16gb-1.jpg",
        "images/products/ram/4001-corsair-vengeance-lpx-1.jpg",
        "images/products/ram/4011-corsair-vengeance-rgb-ddr5-black-1.jpg",
        "images/products/ram/4013-gskill-trident-z5-neo-64gb-1.jpg"
      ],
      specifications: {
        "Dung lượng": "16GB (2x 8GB)",
        "Chuẩn RAM / Bus": "DDR4 3200MHz",
        "Hệ thống LED": "Dải đèn LED RGB khuếch tán",
        "Khả năng đồng bộ": "Asus Aura, MSI Mystic, Gigabyte RGB",
        "Độ trễ": "CL16"
      }
    }
  ],
  SSD: [
    {
      id: "cat_ssd_01",
      name: "Ổ cứng SSD Samsung 980 PRO 1TB PCIe NVMe 4.0 M.2",
      marketPriceNew: 2650000,
      defaultStartingPrice: 1300000,
      defaultBidStep: 50000,
      images: [
        "images/products/storage/5001-samsung-980-pro-1.png",
        "images/products/storage/5003-wd-black-sn850x-1.jpg",
        "images/products/storage/5002-kingston-nv2-500gb-1.jpg",
        "images/products/storage/5004-crucial-p3-plus-1.jpg"
      ],
      specifications: {
        "Dung lượng": "1TB (1000GB)",
        "Giao tiếp": "PCIe Gen 4.0 x4, NVMe 1.3c",
        "Tốc độ đọc tuần tự": "Lên tới 7.000 MB/s",
        "Tốc độ ghi tuần tự": "Lên tới 5.000 MB/s",
        "Kiểm định sức khỏe": "CrystalDiskInfo 100%, TBW thấp"
      }
    },
    {
      id: "cat_ssd_02",
      name: "Ổ cứng SSD WD Black SN850X 1TB PCIe Gen4 NVMe M.2",
      marketPriceNew: 2900000,
      defaultStartingPrice: 1650000,
      defaultBidStep: 50000,
      images: [
        "images/products/storage/5003-wd-black-sn850x-1.jpg",
        "images/products/storage/5001-samsung-980-pro-1.png",
        "images/products/storage/5004-crucial-p3-plus-1.jpg",
        "images/products/storage/5002-kingston-nv2-500gb-1.jpg"
      ],
      specifications: {
        "Dung lượng": "1TB",
        "Chuẩn cắm": "M.2 2280 NVMe Gen4",
        "Tốc độ đọc": "7.300 MB/s",
        "Tốc độ ghi": "6.300 MB/s",
        "Tính năng nổi bật": "Game Mode 2.0 tối ưu load game"
      }
    }
  ],
  PSU: [
    {
      id: "cat_psu_01",
      name: "Nguồn máy tính Corsair RM850x 850W 80 Plus Gold Modular",
      marketPriceNew: 3450000,
      defaultStartingPrice: 1600000,
      defaultBidStep: 50000,
      images: [
        "images/products/psu/6001-corsair-rm850x-1.png",
        "images/products/psu/6002-seasonic-focus-gx750-1.png",
        "images/products/psu/6003-cooler-master-mwe-550w-1.png",
        "images/products/psu/6004-msi-mag-a650bn-1.jpg"
      ],
      specifications: {
        "Công suất": "850W",
        "Chứng nhận hiệu suất": "80 PLUS Gold (Hiệu suất > 90%)",
        "Kiểu dây cáp": "Full Modular (Tháo rời hoàn toàn)",
        "Quạt làm mát": "135mm đệm từ trường (Magnetic Levitation)",
        "Tụ điện": "100% tụ Nhật Bản 105°C"
      }
    },
    {
      id: "cat_psu_02",
      name: "Nguồn máy tính Seasonic Focus GX-750 750W 80 Plus Gold",
      marketPriceNew: 2850000,
      defaultStartingPrice: 1450000,
      defaultBidStep: 50000,
      images: [
        "images/products/psu/6002-seasonic-focus-gx750-1.png",
        "images/products/psu/6001-corsair-rm850x-1.png",
        "images/products/psu/6004-msi-mag-a650bn-1.jpg",
        "images/products/psu/6003-cooler-master-mwe-550w-1.png"
      ],
      specifications: {
        "Công suất": "750W",
        "Chuẩn": "80 Plus Gold",
        "Kiểu dây": "Full Modular",
        "Chế độ quạt": "Hybrid Silent Fan Control (Yên tĩnh tuyệt đối)",
        "Bảo vệ": "OPP, OVP, UVP, OCP, OTP, SCP"
      }
    }
  ],
  Cooling: [
    {
      id: "cat_cool_01",
      name: "Tản nhiệt khí Cooler Master Hyper 212 Spectrum V3 ARGB",
      marketPriceNew: 490000,
      defaultStartingPrice: 200000,
      defaultBidStep: 20000,
      images: [
        "images/products/cooling/8001-tan-nhiet-cooler-master-hyper-212-spectrum-v3-argb-1.jpg",
        "images/products/cooling/8008-tan-nhiet-aio-deepcool-lt520-black-1.jpg",
        "images/products/cooling/8002-tan-nhiet-deepcool-ak400-digital-argb-1.jpg",
        "images/products/cooling/8007-tan-nhiet-noctua-nh-d15s-chromax-black-1.jpg"
      ],
      specifications: {
        "Loại tản nhiệt": "Tản nhiệt khí tháp đơn",
        "Ống dẫn nhiệt": "4 Ống đồng tiếp xúc trực tiếp",
        "Quạt tản": "120mm Spectrum ARGB PWM",
        "Tốc độ quạt": "650 - 1750 RPM ± 10%",
        "Socket hỗ trợ": "Intel LGA 1700/1200, AMD AM5/AM4"
      }
    },
    {
      id: "cat_cool_02",
      name: "Tản nhiệt nước AIO Deepcool LT520 240mm Black ARGB",
      marketPriceNew: 2250000,
      defaultStartingPrice: 1100000,
      defaultBidStep: 50000,
      images: [
        "images/products/cooling/8008-tan-nhiet-aio-deepcool-lt520-black-1.jpg",
        "images/products/cooling/8001-tan-nhiet-cooler-master-hyper-212-spectrum-v3-argb-1.jpg",
        "images/products/cooling/8002-tan-nhiet-deepcool-ak400-digital-argb-1.jpg",
        "images/products/cooling/8007-tan-nhiet-noctua-nh-d15s-chromax-black-1.jpg"
      ],
      specifications: {
        "Kích thước két nước": "240mm nhôm nguyên khối",
        "Bơm": "Bơm thế hệ thứ 4 động cơ 3 pha",
        "Đèn LED": "Mặt khối gương vô cực đa chiều",
        "Quạt": "2x Fan Deepcool FK120 FDB",
        "Độ ồn tối đa": "≤ 32.9 dBA"
      }
    }
  ],
  Case: [
    {
      id: "cat_case_01",
      name: "Vỏ máy tính Lian Li O11 Dynamic EVO RGB White",
      marketPriceNew: 4200000,
      defaultStartingPrice: 2400000,
      defaultBidStep: 100000,
      images: [
        "images/products/case/7007-vo-may-tinh-lian-li-o11d-evo-rgb-white-1.jpg",
        "images/products/case/7011-vo-may-tinh-nzxt-h5-flow-black-(cc-h52fb-01)-1.jpg",
        "images/products/case/7001-vo-may-tinh-hyte-y70-touch-infinite-black-1.jpg",
        "images/products/case/7005-vo-may-tinh-lian-li-o11d-mini-v2-white-1.jpg"
      ],
      specifications: {
        "Kích thước chuẩn": "Mid-Tower (Hỗ trợ E-ATX, ATX, M-ATX)",
        "Chất liệu": "Nhôm xước & Kính cường lực 4mm",
        "Hỗ trợ tản nhiệt AIO": "Lên tới 3 Két nước 360mm",
        "Chiều dài VGA tối đa": "455 mm (Gắn dọc hoặc ngang)",
        "Đèn viền": "Dải LED RGB ARGB trên dưới nóc case"
      }
    },
    {
      id: "cat_case_02",
      name: "Vỏ máy tính NZXT H5 Flow Black Mid-Tower",
      marketPriceNew: 2150000,
      defaultStartingPrice: 1150000,
      defaultBidStep: 50000,
      images: [
        "images/products/case/7011-vo-may-tinh-nzxt-h5-flow-black-(cc-h52fb-01)-1.jpg",
        "images/products/case/7007-vo-may-tinh-lian-li-o11d-evo-rgb-white-1.jpg",
        "images/products/case/7001-vo-may-tinh-hyte-y70-touch-infinite-black-1.jpg",
        "images/products/case/7005-vo-may-tinh-lian-li-o11d-mini-v2-white-1.jpg"
      ],
      specifications: {
        "Kích thước chuẩn": "Mid-Tower ATX",
        "Mặt trước": "Lưới đục lỗ tối ưu luồng gió Airflow",
        "Quạt đi kèm": "2x Quạt F120Q (có 1 quạt thổi đáy GPU)",
        "Kính hông": "Kính cường lực tháo lắp không cần ốc",
        "Hỗ trợ tản nước": "Két nước 280mm mặt trước"
      }
    }
  ]
};

/* ==========================================================================
   2. TRẠNG THÁI HIỆN TẠI CỦA FORM (FORM STATE)
   ========================================================================== */
let currentCategory = "";
let currentSelectedModel = null;
let currentSelectedImage = "";

// Khởi chạy khi tài liệu DOM hoàn tất nạp
document.addEventListener('DOMContentLoaded', () => {
  initCatalogueEvents();
  initFormInputsSync();
  initFormSubmitHandler();
});

/* ==========================================================================
   3. KHỞI TẠO SỰ KIỆN CHỌN CATALOGUE & MẪU LINH KIỆN
   ========================================================================== */
function initCatalogueEvents() {
  const catSelect = document.getElementById('sell-category');
  const modelSelect = document.getElementById('sell-model');

  if (!catSelect || !modelSelect) return;

  // Lắng nghe thay đổi danh mục (Category Change)
  catSelect.addEventListener('change', (e) => {
    const selectedCat = e.target.value;
    currentCategory = selectedCat;

    const models = CATALOGUE_DATA[selectedCat] || [];
    
    // Đổ danh sách mẫu sản phẩm tương ứng vào dropdown Model
    modelSelect.innerHTML = '<option value="" disabled selected>-- Chọn mẫu sản phẩm chuẩn --</option>';
    models.forEach(model => {
      const opt = document.createElement('option');
      opt.value = model.id;
      opt.textContent = model.name;
      modelSelect.appendChild(opt);
    });

    modelSelect.disabled = false;

    // Tự động chọn mẫu đầu tiên nếu có
    if (models.length > 0) {
      modelSelect.value = models[0].id;
      selectModel(models[0]);
    }
  });

  // Lắng nghe thay đổi mẫu sản phẩm (Model Change)
  modelSelect.addEventListener('change', (e) => {
    const modelId = e.target.value;
    const models = CATALOGUE_DATA[currentCategory] || [];
    const found = models.find(m => m.id === modelId);
    if (found) {
      selectModel(found);
    }
  });
}

/**
 * Xử lý khi chọn một mẫu sản phẩm từ Catalogue
 */
function selectModel(model) {
  currentSelectedModel = model;

  // 1. Tự động điền giá khởi điểm đề xuất và giá thị trường
  const startPriceInput = document.getElementById('sell-start-price');
  const marketPriceInput = document.getElementById('sell-market-price');
  const bidStepSelect = document.getElementById('sell-bid-step');

  if (startPriceInput) startPriceInput.value = model.defaultStartingPrice;
  if (marketPriceInput) marketPriceInput.value = model.marketPriceNew;
  if (bidStepSelect) bidStepSelect.value = String(model.defaultBidStep);

  // 2. Hiển thị khối xem trước thông số kỹ thuật (Specifications Preview)
  renderSpecifications(model.specifications);

  // 3. Dựng lưới thumbnail ảnh có sẵn trong repo để người bán click chọn
  renderThumbnailGrid(model.images);

  // 4. Cập nhật thẻ xem trước trực tiếp (Live Card Preview)
  updateLivePreview();
}

/**
 * Hiển thị khối thông số kỹ thuật dạng grid
 */
function renderSpecifications(specs) {
  const container = document.getElementById('spec-grid-container');
  if (!container) return;

  if (!specs || Object.keys(specs).length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; color: #94a3b8; font-size: 12px; font-style: italic;">Không có thông số kỹ thuật có sẵn.</div>';
    return;
  }

  container.innerHTML = Object.entries(specs).map(([k, v]) => `
    <div class="pcb-spec-item">
      <span class="pcb-spec-item__key">${escapeHtml(k)}</span>
      <span class="pcb-spec-item__val">${escapeHtml(v)}</span>
    </div>
  `).join('');
}

/**
 * Dựng lưới thumbnail ảnh để click chọn ảnh đại diện
 */
function renderThumbnailGrid(images) {
  const grid = document.getElementById('sell-thumb-grid');
  if (!grid) return;

  if (!images || images.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; color: #94a3b8; font-size: 12px;">Chưa có ảnh trong kho mẫu.</div>';
    return;
  }

  // Mặc định chọn ảnh đầu tiên
  currentSelectedImage = images[0];

  grid.innerHTML = images.map((imgSrc, idx) => `
    <div class="pcb-thumb-item ${idx === 0 ? 'pcb-thumb-item--active' : ''}" data-src="${imgSrc}">
      <img class="pcb-thumb-img" src="${imgSrc}" alt="Ảnh mẫu ${idx + 1}" loading="lazy">
    </div>
  `).join('');

  // Gắn sự kiện click chọn ảnh
  const items = grid.querySelectorAll('.pcb-thumb-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('pcb-thumb-item--active'));
      item.classList.add('pcb-thumb-item--active');
      currentSelectedImage = item.getAttribute('data-src');
      updateLivePreview();
    });
  });
}

/* ==========================================================================
   4. ĐỒNG BỘ CẬP NHẬT THẺ XEM TRƯỚC THỜI GIAN THỰC (LIVE PREVIEW SYNC)
   ========================================================================== */
function initFormInputsSync() {
  const inputs = [
    'sell-condition',
    'sell-seal',
    'sell-start-price',
    'sell-bid-step',
    'sell-duration',
    'sell-market-price'
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateLivePreview);
      el.addEventListener('change', updateLivePreview);
    }
  });
}

/**
 * Cập nhật toàn bộ nội dung khối Preview Card bên cột phải
 */
function updateLivePreview() {
  if (!currentSelectedModel) return;

  // Ảnh đại diện
  const previewImg = document.getElementById('preview-image');
  if (previewImg && currentSelectedImage) {
    previewImg.src = currentSelectedImage;
  }

  // Danh mục & Tiêu đề
  const previewCat = document.getElementById('preview-cat');
  if (previewCat) previewCat.textContent = currentCategory || 'PC';

  const previewTitle = document.getElementById('preview-title');
  if (previewTitle) previewTitle.textContent = currentSelectedModel.name;

  // Huy hiệu tình trạng
  const conditionSelect = document.getElementById('sell-condition');
  const previewCondition = document.getElementById('preview-condition');
  if (conditionSelect && previewCondition) {
    const text = conditionSelect.value;
    previewCondition.textContent = text.includes('Like New') ? 'Like New 99%' : (text.includes('Mới') ? 'Mới 100%' : 'Đã sử dụng');
  }

  // Huy hiệu kiểm thử (Seal)
  const sealSelect = document.getElementById('sell-seal');
  const previewSeal = document.getElementById('preview-seal');
  if (sealSelect && previewSeal) {
    previewSeal.textContent = sealSelect.value;
  }

  // 2 Thông số kỹ thuật tiêu biểu
  const previewSpecs = document.getElementById('preview-specs');
  if (previewSpecs && currentSelectedModel.specifications) {
    const entries = Object.entries(currentSelectedModel.specifications).slice(0, 2);
    previewSpecs.innerHTML = entries.map(([k, v]) => `<span class="pcb-card__spec">${escapeHtml(v)}</span>`).join('');
  }

  // Giá khởi điểm & Giá thị trường
  const startPriceInput = document.getElementById('sell-start-price');
  const previewPrice = document.getElementById('preview-price');
  const priceVal = startPriceInput ? parseInt(startPriceInput.value, 10) || 0 : 0;
  if (previewPrice) {
    previewPrice.textContent = formatVnd(priceVal);
  }

  const marketPriceInput = document.getElementById('sell-market-price');
  const previewMarketPrice = document.getElementById('preview-market-price');
  const marketVal = marketPriceInput ? parseInt(marketPriceInput.value, 10) || 0 : 0;
  if (previewMarketPrice) {
    previewMarketPrice.textContent = formatVnd(marketVal);
  }

  // Bước giá
  const bidStepSelect = document.getElementById('sell-bid-step');
  const previewStep = document.getElementById('preview-step');
  if (bidStepSelect && previewStep) {
    const stepVal = parseInt(bidStepSelect.value, 10) || 50000;
    previewStep.textContent = formatVnd(stepVal);
  }

  // Đếm ngược thời hạn
  const durationSelect = document.getElementById('sell-duration');
  const previewCountdown = document.getElementById('preview-countdown');
  if (durationSelect && previewCountdown) {
    const days = parseInt(durationSelect.value, 10) || 3;
    const hours = days * 24;
    const textSpan = previewCountdown.querySelector('.pcb-countdown-text');
    if (textSpan) textSpan.textContent = `${hours}:00:00`;
  }
}

/* ==========================================================================
   5. XỬ LÝ GỬI FORM & LƯU PHIÊN ĐẤU GIÁ VÀO LOCALSTORAGE
   ========================================================================== */
function initFormSubmitHandler() {
  const form = document.getElementById('sell-auction-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // 1. Kiểm tra validation cơ bản
    if (!currentCategory) {
      alert('Vui lòng chọn Danh mục linh kiện!');
      document.getElementById('sell-category')?.focus();
      return;
    }

    if (!currentSelectedModel) {
      alert('Vui lòng chọn Mẫu sản phẩm chuẩn của sàn!');
      document.getElementById('sell-model')?.focus();
      return;
    }

    const startPriceInput = document.getElementById('sell-start-price');
    const startPrice = startPriceInput ? parseInt(startPriceInput.value, 10) : 0;
    if (!startPrice || startPrice < 10000) {
      alert('Vui lòng nhập Giá khởi điểm hợp lệ (tối thiểu 10.000₫)!');
      startPriceInput?.focus();
      return;
    }

    const descriptionInput = document.getElementById('sell-description');
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    if (!description) {
      alert('Vui lòng nhập Mô tả tình trạng thực tế & phụ kiện của món hàng!');
      descriptionInput?.focus();
      return;
    }

    // 2. Thu thập dữ liệu phiên đấu giá
    const condition = document.getElementById('sell-condition')?.value || 'Like New 99%';
    const bidStep = parseInt(document.getElementById('sell-bid-step')?.value, 10) || 50000;
    const durationDays = parseInt(document.getElementById('sell-duration')?.value, 10) || 3;
    const marketPrice = parseInt(document.getElementById('sell-market-price')?.value, 10) || currentSelectedModel.marketPriceNew;

    // Lấy thông tin người đăng bán từ localStorage nếu có
    let sellerName = 'uit_builder_2026';
    try {
      const user = JSON.parse(localStorage.getItem('pcbid_currentUser') || '{}');
      if (user && (user.fullname || user.username)) {
        sellerName = user.username || user.fullname;
      }
    } catch (err) {
      // Bỏ qua lỗi parse
    }

    const newAuctionProduct = {
      id: Date.now(), // Tạo ID độc nhất theo timestamp
      name: currentSelectedModel.name,
      category: currentCategory,
      condition: condition,
      startingPrice: startPrice,
      currentBid: startPrice,
      bidStep: bidStep,
      bidCount: 0,
      marketPriceNew: marketPrice,
      endTime: new Date(Date.now() + durationDays * 24 * 3600 * 1000).toISOString(),
      seller: sellerName,
      images: [currentSelectedImage || currentSelectedModel.images[0]],
      description: description,
      specifications: currentSelectedModel.specifications || {}
    };

    // 3. Lưu vào LocalStorage theo chuẩn quy định AGENTS.md (pcbid_products)
    try {
      const existing = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
      existing.unshift(newAuctionProduct);
      localStorage.setItem('pcbid_products', JSON.stringify(existing));
    } catch (e) {
      console.error('[Lỗi lưu LocalStorage PCBid]:', e);
    }

    // 4. Hiển thị modal thông báo thành công
    const successModal = document.getElementById('sell-success-modal');
    if (successModal) {
      successModal.classList.add('pcb-modal-overlay--open');

      // Tự động chuyển hướng về trang products.html sau 1.8 giây
      setTimeout(() => {
        window.location.href = 'products.html';
      }, 1800);
    } else {
      alert('Tạo phiên đấu giá thành công! Đang chuyển về sàn...');
      window.location.href = 'products.html';
    }
  });
}

/* ==========================================================================
   6. TIỆN ÍCH TRỢ GIÚP (HELPER FUNCTIONS)
   ========================================================================== */
function formatVnd(amount) {
  if (typeof amount !== 'number') amount = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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
