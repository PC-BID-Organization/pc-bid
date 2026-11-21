/**
 * PCBid - Tập lệnh Xử lý Trang Đăng Phiên Đấu Giá (sell.html)
 * Quản lý lựa chọn Catalogue linh kiện chuẩn, hiển thị thông số kỹ thuật tự động,
 * chọn ảnh đại diện từ kho ảnh, cập nhật Live Preview và lưu phiên vào LocalStorage.
 * 100% Vanilla JavaScript (ES6+), Không framework bên ngoài.
 * Toàn bộ chú thích bằng Tiếng Việt có dấu theo quy định AGENTS.md.
 */

// Lưu phiên đã đăng bán riêng theo từng tài khoản
import { USER_LIST_KEYS, readLoggedInUser, readUserList, writeUserList } from './user-data.js';
// Hộp thoại thông báo dùng chung
import { showAlert, showConfirm } from './dialog.js';


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
// Danh sách ảnh đã chọn theo thứ tự (phần tử đầu là ảnh bìa); gồm ảnh kho PCBid và ảnh người bán tải lên
let selectedImages = [];
// Số ảnh tối đa cho một phiên và kích thước cạnh dài tối đa của ảnh tải lên
const MAX_PHOTOS = 6;
const UPLOAD_MAX_EDGE = 1000;
// Bộ nhớ đệm dữ liệu JSON theo danh mục (dùng để đề xuất ảnh liên quan)
const categoryDataCache = {};
// Phiên đang được đăng bán lại (null khi tạo phiên mới)
let relistTarget = null;
// Danh sách mẫu của danh mục đang chọn (nạp từ data/*.json)
let currentModels = [];
// Thông số của mẫu đã chọn, người bán được sửa / xóa tự do: { key, value }
let modelSpecs = [];
// Người bán đã tự sửa tiêu đề chưa (chưa sửa thì tiêu đề tự theo tên mẫu)
let titleEdited = false;
// Ảnh bìa do hệ thống tự chọn theo mẫu (được thay khi đổi mẫu, khác với ảnh người bán tự chọn)
let autoPickedImage = null;

// Ánh xạ danh mục sản phẩm sang tệp dữ liệu JSON và khóa danh mục của Catalogue
const CATEGORY_DATA_FILES = {
  GPU: 'gpu', CPU: 'cpu', Mainboard: 'mainboard', RAM: 'ram',
  SSD: 'storage', Storage: 'storage', PSU: 'psu', Cooling: 'cooling', Case: 'case'
};
const CATEGORY_CATALOGUE_KEYS = { Storage: 'SSD' };

// Khởi chạy khi tài liệu DOM hoàn tất nạp
document.addEventListener('DOMContentLoaded', async () => {
  // Bắt buộc đăng nhập mới được đăng bán
  if (!readLoggedInUser()) {
    await requireLoginToSell();
    return;
  }

  initCatalogueEvents();
  initFormInputsSync();
  initFormSubmitHandler();
  initPhotoPicker();
  initCustomSpecs();
  initEditableDetails();
  initProgressTracker();
  initRelistMode();
});

/* ==========================================================================
   BẮT BUỘC ĐĂNG NHẬP KHI ĐĂNG BÁN
   ========================================================================== */
async function requireLoginToSell() {
  // Khóa toàn bộ form để không nhập được khi chưa đăng nhập
  const form = document.getElementById('sell-auction-form');
  if (form) {
    form.setAttribute('inert', '');
    form.classList.add('pcb-sell-form--locked');
  }
  const goLogin = await showConfirm({
    title: 'Cần đăng nhập để đăng bán',
    message: 'Bạn cần đăng nhập tài khoản PCBid trước khi tạo phiên đấu giá.\nSau khi đăng nhập, bạn sẽ được đưa trở lại trang này.',
    confirmText: 'Đăng nhập',
    cancelText: 'Về trang chủ',
    tone: 'info'
  });
  const backTo = `${window.location.pathname.split('/').pop() || 'sell.html'}${window.location.search}`;
  window.location.href = goLogin ? `login.html?redirect=${encodeURIComponent(backTo)}` : 'index.html';
}

/* ==========================================================================
   THÔNG SỐ KỸ THUẬT DO NGƯỜI BÁN TỰ BỔ SUNG
   ========================================================================== */
// Mỗi phần tử: { key, value }
let customSpecs = [];
const MAX_CUSTOM_SPECS = 8;

/**
 * Gộp thông số bổ sung hợp lệ (có cả tên và giá trị) thành object
 * @returns {Object}
 */
function getCustomSpecsObject() {
  const result = {};
  customSpecs.forEach(({ key, value }) => {
    const k = key.trim();
    const v = value.trim();
    if (k && v) result[k] = v;
  });
  return result;
}

/**
 * Vẽ danh sách dòng thông số bổ sung (ô tên + ô giá trị + nút xóa)
 * @param {number} [focusIndex] - Dòng cần đặt con trỏ sau khi vẽ
 */
function renderCustomSpecs(focusIndex) {
  const list = document.getElementById('sell-custom-specs');
  const addBtn = document.getElementById('btn-add-spec');
  if (!list) return;
  list.innerHTML = customSpecs.map((spec, idx) => `
    <li class="pcb-custom-specs__row">
      <input type="text" class="pcb-custom-specs__input" data-spec-key="${idx}" value="${escapeHtml(spec.key)}"
        placeholder="Tên thông số (VD: Bảo hành còn lại)" maxlength="40" aria-label="Tên thông số bổ sung ${idx + 1}">
      <input type="text" class="pcb-custom-specs__input" data-spec-value="${idx}" value="${escapeHtml(spec.value)}"
        placeholder="Giá trị (VD: 8 tháng)" maxlength="80" aria-label="Giá trị thông số bổ sung ${idx + 1}">
      <button type="button" class="pcb-custom-specs__remove" data-spec-remove="${idx}" aria-label="Xóa thông số ${idx + 1}">×</button>
    </li>`).join('');
  if (addBtn) addBtn.hidden = customSpecs.length >= MAX_CUSTOM_SPECS;
  if (focusIndex !== undefined) list.querySelector(`[data-spec-key="${focusIndex}"]`)?.focus();
}

function initCustomSpecs() {
  const list = document.getElementById('sell-custom-specs');
  const addBtn = document.getElementById('btn-add-spec');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (customSpecs.length >= MAX_CUSTOM_SPECS) return;
      customSpecs.push({ key: '', value: '' });
      renderCustomSpecs(customSpecs.length - 1);
    });
  }
  if (list) {
    list.addEventListener('input', e => {
      const keyIdx = e.target.dataset.specKey;
      const valIdx = e.target.dataset.specValue;
      if (keyIdx !== undefined) customSpecs[Number(keyIdx)].key = e.target.value;
      if (valIdx !== undefined) customSpecs[Number(valIdx)].value = e.target.value;
    });
    list.addEventListener('click', e => {
      const removeBtn = e.target.closest('[data-spec-remove]');
      if (!removeBtn) return;
      customSpecs.splice(Number(removeBtn.dataset.specRemove), 1);
      renderCustomSpecs();
    });
  }
  renderCustomSpecs();
}

/* ==========================================================================
   THANH TIẾN TRÌNH ĐỘNG: BƯỚC ĐANG Ở + BƯỚC CẦN HOÀN THÀNH TIẾP THEO
   ========================================================================== */
const PROGRESS_STEP_NAMES = {
  1: 'Chọn linh kiện',
  2: 'Tình trạng & phụ kiện',
  3: 'Giá & thời hạn'
};
// Bước người dùng đang thao tác (theo ô đang nhập hoặc khối đang xem)
let progressCurrentStep = 1;
// Các bước người dùng đã ghé qua: giá trị điền sẵn theo mẫu chỉ được tính khi người dùng đã xem lại bước đó
const visitedSteps = new Set([1]);

/**
 * Kiểm tra từng bước đã đủ thông tin chưa
 * @returns {{1: boolean, 2: boolean, 3: boolean}}
 */
function getStepCompletion() {
  const value = id => document.getElementById(id)?.value || '';
  const valid = {
    1: Boolean(currentCategory && currentSelectedModel && selectedImages.length > 0),
    2: Boolean(value('sell-condition') && value('sell-description').trim().length >= 10),
    3: Number(value('sell-start-price')) >= 10000 && Boolean(value('sell-bid-step')) && Boolean(value('sell-duration'))
  };
  // Hoàn thành theo thứ tự: một bước chỉ được tính xong khi đủ thông tin, đã ghé qua
  // và mọi bước trước nó cũng đã xong (tránh bước 3 "xong" khi bước 2 còn dở)
  const done1 = valid[1] && visitedSteps.has(1);
  const done2 = done1 && valid[2] && visitedSteps.has(2);
  const done3 = done2 && valid[3] && visitedSteps.has(3);
  return { 1: done1, 2: done2, 3: done3 };
}

/**
 * Cập nhật giao diện thanh tiến trình theo bước hiện tại và mức độ hoàn thành
 */
function updateProgress() {
  const nav = document.getElementById('sell-progress');
  if (!nav) return;
  const done = getStepCompletion();
  // Bước cần hoàn thành tiếp theo: bước chưa xong đầu tiên, khác bước đang ở
  const nextStep = [1, 2, 3].find(step => !done[step] && step !== progressCurrentStep) || null;

  nav.querySelectorAll('.pcb-sell-progress__step').forEach(btn => {
    const step = Number(btn.dataset.step);
    const isCurrent = step === progressCurrentStep;
    const isNext = step === nextStep;
    btn.classList.toggle('pcb-sell-progress__step--done', done[step]);
    btn.classList.toggle('pcb-sell-progress__step--current', isCurrent);
    btn.classList.toggle('pcb-sell-progress__step--next', isNext);
    if (isCurrent) btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
    const stateText = btn.querySelector('[data-state-text]');
    if (stateText) {
      stateText.textContent = isCurrent ? (done[step] ? 'Đang ở · Đã đủ' : 'Đang ở bước này')
        : done[step] ? 'Đã hoàn thành'
        : isNext ? 'Cần làm tiếp theo'
        : 'Chưa hoàn thành';
    }
  });

  // Đường nối: tô xanh từ bước 1 tới bước xa nhất đã xong; nếu bước kế tiếp đang được làm thì tô tới bước đó
  const completedInRow = done[3] ? 3 : done[2] ? 2 : done[1] ? 1 : 0;
  const reach = progressCurrentStep === completedInRow + 1 ? progressCurrentStep : Math.max(completedInRow, 1);
  nav.style.setProperty('--progress-ratio', String((reach - 1) / 2));

  const summary = document.getElementById('sell-progress-summary');
  if (summary) {
    const allDone = done[1] && done[2] && done[3];
    summary.textContent = allDone
      ? '✓ Đã đủ thông tin. Bấm "Xác nhận" ở cuối form để đưa phiên lên sàn.'
      : `Đang ở: Bước ${progressCurrentStep} – ${PROGRESS_STEP_NAMES[progressCurrentStep]}`
        + (nextStep ? ` · Tiếp theo: Bước ${nextStep} – ${PROGRESS_STEP_NAMES[nextStep]}` : '');
  }
}

/**
 * Theo dõi người dùng đang ở bước nào (ô đang nhập / khối đang hiển thị) và cập nhật thanh tiến trình
 */
function initProgressTracker() {
  const form = document.getElementById('sell-auction-form');
  const panels = [...document.querySelectorAll('.pcb-sell-panel[data-step]')];
  if (!form || !panels.length) return;

  const setCurrent = step => {
    if (step) visitedSteps.add(step);
    if (step && step !== progressCurrentStep) {
      progressCurrentStep = step;
      updateProgress();
    }
  };

  // Nhập liệu trong khối nào thì đó là bước hiện tại
  form.addEventListener('focusin', e => setCurrent(Number(e.target.closest('.pcb-sell-panel[data-step]')?.dataset.step)));
  form.addEventListener('input', updateProgress);
  form.addEventListener('change', updateProgress);

  // Cuộn trang: khối chiếm phần lớn vùng nhìn là bước hiện tại (khi không đang nhập ô nào)
  if ('IntersectionObserver' in window) {
    const ratios = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => ratios.set(Number(entry.target.dataset.step), entry.intersectionRatio));
      if (form.contains(document.activeElement) && document.activeElement !== form) return;
      const visible = [...ratios.entries()].sort((a, b) => b[1] - a[1])[0];
      if (visible && visible[1] > 0) setCurrent(visible[0]);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-120px 0px -35% 0px' });
    panels.forEach(panel => observer.observe(panel));
  }

  // Bấm vào một bước để cuộn tới khối tương ứng
  document.querySelectorAll('.pcb-sell-progress__step').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = Number(btn.dataset.step);
      const panel = document.getElementById(`sell-step-${step}`);
      if (!panel) return;
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrent(step);
      panel.querySelector('select, input, textarea')?.focus({ preventScroll: true });
    });
  });

  updateProgress();
}

/* ==========================================================================
   CHẾ ĐỘ ĐĂNG BÁN LẠI (sell.html?relist=<id>)
   Dùng lại đúng phiên cũ (cùng ID, cùng thông tin linh kiện) thay vì tạo bài đăng mới
   ========================================================================== */
async function initRelistMode() {
  const relistId = Number(new URLSearchParams(window.location.search).get('relist'));
  if (!relistId) return;

  const user = readLoggedInUser();
  const savedItem = readUserList(USER_LIST_KEYS.SELLING, user).find(item => Number(item.id) === relistId);
  if (!savedItem) {
    await showAlert({ title: 'Không tìm thấy phiên', message: 'Không tìm thấy phiên này trong danh sách đăng bán của bạn. Hệ thống sẽ mở form tạo phiên mới.', tone: 'warning' });
    return;
  }

  // Lấy đầy đủ thông tin phiên: ưu tiên bản trong localStorage, sau đó tới tệp JSON của danh mục
  let product = null;
  try {
    product = JSON.parse(localStorage.getItem('pcbid_products') || '[]').find(p => Number(p.id) === relistId) || null;
  } catch {
    product = null;
  }
  const dataFile = CATEGORY_DATA_FILES[savedItem.category];
  if (dataFile) {
    try {
      const res = await fetch(`data/${dataFile}.json`);
      if (res.ok) {
        const fromJson = (await res.json()).find(p => Number(p.id) === relistId);
        if (fromJson) product = { ...fromJson, ...(product?.relisted ? product : {}) };
      }
    } catch {
      // Không fetch được thì dùng dữ liệu đã lưu trong danh sách đăng bán
    }
  }
  product = { ...savedItem, ...(product || {}) };

  relistTarget = { id: relistId, product };

  // Đổ thông tin linh kiện cũ vào form: khóa danh mục và mẫu để giữ đúng phiên
  const catalogueKey = CATEGORY_CATALOGUE_KEYS[product.category] || product.category;
  const catSelect = document.getElementById('sell-category');
  const modelSelect = document.getElementById('sell-model');
  const relistModel = {
    id: `relist-${relistId}`,
    name: product.name,
    images: product.images && product.images.length ? product.images : (savedItem.images || []),
    specifications: product.specifications || {},
    defaultStartingPrice: Number(product.startingPrice) || 0,
    defaultBidStep: Number(product.bidStep) || 50000,
    marketPriceNew: Number(product.marketPriceNew) || 0
  };

  currentCategory = catalogueKey;
  if (catSelect) {
    catSelect.value = catalogueKey;
    catSelect.disabled = true;
  }
  if (modelSelect) {
    modelSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = relistModel.id;
    opt.textContent = relistModel.name;
    modelSelect.appendChild(opt);
    modelSelect.value = relistModel.id;
    modelSelect.disabled = true;
  }
  selectModel(relistModel);
  // Đăng bán lại: giữ nguyên bộ ảnh của phiên cũ
  selectedImages = [...relistModel.images].slice(0, MAX_PHOTOS);
  renderSelectedPhotos();

  const descInput = document.getElementById('sell-description');
  if (descInput && product.description) descInput.value = product.description;
  const conditionSelect = document.getElementById('sell-condition');
  if (conditionSelect && [...conditionSelect.options].some(o => o.value === product.condition)) {
    conditionSelect.value = product.condition;
  }
  updateLivePreview();

  // Đổi tiêu đề và nút để người bán biết đang đăng lại phiên cũ
  const heading = document.getElementById('sell-hero-heading');
  if (heading) heading.textContent = 'Đăng Bán Lại Phiên Đấu Giá';
  const desc = document.querySelector('.pcb-sell-hero__desc');
  if (desc) desc.textContent = `Mở lại phiên #${relistId} – ${product.name}. Thông tin linh kiện được giữ nguyên, bạn chỉ cần điều chỉnh giá khởi điểm, bước giá và thời hạn.`;
  const submitBtn = document.getElementById('btn-submit-sell');
  if (submitBtn) submitBtn.lastChild.textContent = ' Xác nhận đăng bán lại';
}

/* ==========================================================================
   3. KHỞI TẠO SỰ KIỆN CHỌN CATALOGUE & MẪU LINH KIỆN
   ========================================================================== */
function initCatalogueEvents() {
  const catSelect = document.getElementById('sell-category');
  const modelSelect = document.getElementById('sell-model');

  if (!catSelect || !modelSelect) return;

  // Lắng nghe thay đổi danh mục (Category Change)
  catSelect.addEventListener('change', async (e) => {
    const selectedCat = e.target.value;
    currentCategory = selectedCat;

    // Trong lúc nạp dữ liệu danh mục: khóa ô chọn mẫu và báo đang tải
    modelSelect.disabled = true;
    modelSelect.innerHTML = '<option value="" disabled selected>Đang tải danh sách mẫu...</option>';
    const models = await getCategoryModels(selectedCat);
    // Người dùng đã đổi sang danh mục khác trong lúc chờ: bỏ kết quả cũ
    if (currentCategory !== selectedCat) return;
    currentModels = models;

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
    const found = currentModels.find(m => m.id === e.target.value);
    if (found) {
      selectModel(found);
    }
  });
}

/**
 * Nạp (có bộ nhớ đệm) tệp JSON sản phẩm của một danh mục
 * @param {string} cat - Danh mục trên form (GPU, CPU, SSD...)
 * @returns {Promise<Array>}
 */
async function loadCategoryProducts(cat) {
  const file = CATEGORY_DATA_FILES[cat];
  if (!file) return [];
  if (!categoryDataCache[file]) {
    try {
      const res = await fetch(`data/${file}.json`);
      categoryDataCache[file] = res.ok ? await res.json() : [];
    } catch {
      categoryDataCache[file] = [];
    }
  }
  return categoryDataCache[file];
}

/**
 * Toàn bộ mẫu sản phẩm chuẩn của một danh mục: mọi linh kiện trong data/*.json
 * (thông số, ảnh, giá tham khảo), cộng các mẫu viết sẵn trong CATALOGUE_DATA chưa có trong dữ liệu
 * @param {string} cat - Danh mục trên form
 * @returns {Promise<Array>} Danh sách mẫu, sắp xếp theo tên
 */
async function getCategoryModels(cat) {
  const products = await loadCategoryProducts(cat);
  const fromData = products.map(p => ({
    id: `data_${p.id}`,
    name: p.name,
    marketPriceNew: Number(p.marketPriceNew) || 0,
    defaultStartingPrice: Number(p.startingPrice) || 0,
    defaultBidStep: Number(p.bidStep) || 50000,
    images: Array.isArray(p.images) ? p.images : [],
    specifications: p.specifications || {}
  }));
  const seen = new Set(fromData.map(m => m.name.trim().toLowerCase()));
  const extras = (CATALOGUE_DATA[cat] || []).filter(m => !seen.has(m.name.trim().toLowerCase()));
  return [...fromData, ...extras].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/**
 * Xử lý khi chọn một mẫu sản phẩm từ Catalogue
 */
function selectModel(model) {
  currentSelectedModel = model;
  // Đổi mẫu: chỉ bỏ ảnh bìa do hệ thống tự chọn cho mẫu cũ; ảnh người bán đã tự chọn / tải lên được giữ nguyên
  // (trước đây mọi ảnh kho bị xóa nên chọn nhiều ảnh rồi đổi mẫu chỉ còn lại 1 ảnh bìa)
  if (autoPickedImage && selectedImages.length === 1 && selectedImages[0] === autoPickedImage) {
    selectedImages = [];
  }
  autoPickedImage = null;

  // 1. Tự động điền giá khởi điểm đề xuất và giá thị trường
  const startPriceInput = document.getElementById('sell-start-price');
  const marketPriceInput = document.getElementById('sell-market-price');
  const bidStepSelect = document.getElementById('sell-bid-step');

  if (startPriceInput) startPriceInput.value = model.defaultStartingPrice;
  if (marketPriceInput) marketPriceInput.value = model.marketPriceNew;
  if (bidStepSelect) bidStepSelect.value = String(model.defaultBidStep);

  // 2. Nạp thông số của mẫu vào các ô người bán có thể chỉnh sửa
  renderSpecifications(model.specifications);

  // Tiêu đề đề xuất theo tên mẫu; giữ nguyên nếu người bán đã tự sửa
  const titleInput = document.getElementById('sell-title');
  if (titleInput && !titleEdited) titleInput.value = model.name;

  // 3. Ảnh đề xuất liên quan tới mẫu đã chọn; chọn sẵn ảnh đầu tiên nếu chưa có ảnh nào
  getSuggestedImages(model).then(suggestions => {
    if (currentSelectedModel !== model) return;
    // Chọn sẵn ảnh liên quan nhất làm ảnh bìa nếu chưa có ảnh nào
    const first = suggestions.related[0] || suggestions.others[0];
    if (selectedImages.length === 0 && first) {
      selectedImages = [first];
      autoPickedImage = first;
    }
    renderThumbnailGrid(suggestions);
    renderSelectedPhotos();
  });

  // 4. Cập nhật thẻ xem trước trực tiếp (Live Card Preview)
  updateLivePreview();
}

/**
 * Hiển thị khối thông số kỹ thuật dạng grid
 */
function renderSpecifications(specs) {
  // Thông số của mẫu được nạp vào danh sách người bán có thể sửa / xóa tự do
  modelSpecs = Object.entries(specs || {}).map(([key, value]) => ({ key, value: String(value) }));
  renderModelSpecs();
  setSpecBadge(false);
}

/**
 * Vẽ các dòng thông số của mẫu dưới dạng ô nhập (tên + giá trị + nút xóa)
 * @param {number} [focusIndex] - Dòng cần đặt con trỏ sau khi vẽ
 */
function renderModelSpecs(focusIndex) {
  const container = document.getElementById('spec-grid-container');
  if (!container) return;
  if (modelSpecs.length === 0) {
    container.innerHTML = '<div class="pcb-spec-grid__empty">Mẫu này chưa có thông số. Bạn có thể tự thêm ở mục "Thông số bổ sung" bên dưới.</div>';
    return;
  }
  container.innerHTML = `<ul class="pcb-custom-specs__list pcb-model-specs">${modelSpecs.map((spec, idx) => `
    <li class="pcb-custom-specs__row">
      <input type="text" class="pcb-custom-specs__input pcb-model-specs__key" data-mspec-key="${idx}" value="${escapeHtml(spec.key)}"
        maxlength="40" aria-label="Tên thông số ${idx + 1}">
      <input type="text" class="pcb-custom-specs__input" data-mspec-value="${idx}" value="${escapeHtml(spec.value)}"
        maxlength="120" aria-label="Giá trị thông số ${idx + 1}">
      <button type="button" class="pcb-custom-specs__remove" data-mspec-remove="${idx}" aria-label="Xóa thông số ${idx + 1}">×</button>
    </li>`).join('')}</ul>`;
  if (focusIndex !== undefined) container.querySelector(`[data-mspec-value="${focusIndex}"]`)?.focus();
}

/**
 * Nhãn nguồn thông số: "Dữ liệu chuẩn PCBid" hoặc "Đã chỉnh sửa" khi người bán sửa
 * @param {boolean} edited
 */
function setSpecBadge(edited) {
  const badge = document.getElementById('spec-source-badge');
  if (!badge) return;
  badge.textContent = edited ? 'Đã chỉnh sửa' : 'Gợi ý từ dữ liệu PCBid';
  badge.classList.toggle('pcb-spec-box__badge--edited', edited);
}

/**
 * Gộp thông số của mẫu (đã chỉnh sửa) và thông số bổ sung thành object để lưu
 * @returns {Object}
 */
function getAllSpecsObject() {
  const result = {};
  modelSpecs.forEach(({ key, value }) => {
    const k = key.trim();
    const v = value.trim();
    if (k && v) result[k] = v;
  });
  return { ...result, ...getCustomSpecsObject() };
}

/**
 * Sự kiện sửa / xóa thông số của mẫu và ô tiêu đề phiên
 */
function initEditableDetails() {
  const container = document.getElementById('spec-grid-container');
  if (container) {
    container.addEventListener('input', e => {
      const keyIdx = e.target.dataset.mspecKey;
      const valIdx = e.target.dataset.mspecValue;
      if (keyIdx !== undefined) modelSpecs[Number(keyIdx)].key = e.target.value;
      if (valIdx !== undefined) modelSpecs[Number(valIdx)].value = e.target.value;
      setSpecBadge(true);
      updateLivePreview();
    });
    container.addEventListener('click', e => {
      const removeBtn = e.target.closest('[data-mspec-remove]');
      if (!removeBtn) return;
      modelSpecs.splice(Number(removeBtn.dataset.mspecRemove), 1);
      renderModelSpecs();
      setSpecBadge(true);
      updateLivePreview();
    });
  }

  const titleInput = document.getElementById('sell-title');
  const resetBtn = document.getElementById('btn-reset-title');
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      titleEdited = Boolean(titleInput.value.trim()) && titleInput.value.trim() !== currentSelectedModel?.name;
      if (resetBtn) resetBtn.hidden = !titleEdited;
      updateLivePreview();
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!titleInput || !currentSelectedModel) return;
      titleInput.value = currentSelectedModel.name;
      titleEdited = false;
      resetBtn.hidden = true;
      updateLivePreview();
      titleInput.focus();
    });
  }
}

/**
 * Tiêu đề phiên hiện tại: người bán tự nhập, hoặc tên mẫu đã chọn
 * @returns {string}
 */
function getListingTitle() {
  const value = document.getElementById('sell-title')?.value.trim() || '';
  return value || currentSelectedModel?.name || '';
}

/**
 * Lấy các "từ khóa nhận diện" trong tên mẫu: cụm có chữ số (3070, 5800X3D, B760M...) và tên hãng
 * @param {string} name - Tên sản phẩm
 * @returns {Array<string>}
 */
function getModelKeywords(name) {
  const words = String(name || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const brands = ['ASUS', 'MSI', 'GIGABYTE', 'ASROCK', 'CORSAIR', 'KINGSTON', 'SAMSUNG', 'NZXT', 'NOCTUA', 'DEEPCOOL',
    'SEASONIC', 'INTEL', 'AMD', 'NVIDIA', 'COOLER', 'LIAN', 'HYTE', 'CRUCIAL', 'WD', 'XFX', 'SAPPHIRE', 'ZOTAC', 'EVGA', 'GSKILL'];
  // Bỏ các cụm chỉ dung lượng / công suất / xung nhịp (8GB, 650W, 3600MHZ...) vì trùng giữa nhiều sản phẩm khác nhau
  const isSpecUnit = w => /^\d+(GB|TB|MB|MHZ|GHZ|W|MM|HZ|X)$/.test(w) || /^DDR\d$/.test(w) || /^PCIE\d?$/.test(w);
  return words.filter(w => /\d/.test(w) && w.length >= 3 && !isSpecUnit(w)).concat(words.filter(w => brands.includes(w)));
}

/**
 * Đề xuất ảnh cho mẫu đã chọn, chia 2 nhóm:
 * - related: sản phẩm trùng mã nhận diện (3070, 5800X3D, B760M...) → rất liên quan
 * - others: cùng hãng, ảnh mẫu của catalogue và vài sản phẩm cùng danh mục → có thể liên quan
 * @param {Object} model - Mẫu sản phẩm đã chọn
 * @returns {Promise<{related: Array<string>, others: Array<string>}>}
 */
async function getSuggestedImages(model) {
  const products = await loadCategoryProducts(currentCategory);
  const keywords = getModelKeywords(model.name);
  const codes = keywords.filter(k => /\d/.test(k));
  const brands = keywords.filter(k => !/\d/.test(k));

  const relatedScored = [];
  const sameBrand = [];
  const sameCategory = [];
  // Từ thường gặp trong tên mẫu (dòng sản phẩm: TOMAHAWK, STRIX, VENGEANCE...) dùng để xếp hạng trong nhóm liên quan
  const modelWords = new Set(String(model.name).toUpperCase().split(/[^A-Z0-9]+/).filter(w => w.length >= 4));
  products.forEach(product => {
    const words = getModelKeywords(product.name);
    const images = product.images || [];
    const codeHits = codes.filter(code => words.includes(code)).length;
    if (codeHits > 0) {
      const nameWords = String(product.name).toUpperCase().split(/[^A-Z0-9]+/);
      const wordHits = nameWords.filter(w => modelWords.has(w)).length;
      relatedScored.push({ images, score: codeHits * 10 + wordHits });
    } else if (brands.some(brand => words.includes(brand))) sameBrand.push(...images);
    else sameCategory.push(...images);
  });

  // Khớp đúng mẫu nhất lên đầu
  const related = relatedScored.sort((a, b) => b.score - a.score).flatMap(entry => entry.images);
  const relatedUnique = [...new Set(related)].slice(0, 6);
  const others = [...new Set([...sameBrand, ...(model.images || []), ...sameCategory])]
    .filter(src => !relatedUnique.includes(src))
    .slice(0, 8);
  return { related: relatedUnique, others };
}

/**
 * Vẽ một lưới ảnh đề xuất; bấm để thêm / bỏ khỏi danh sách ảnh đã chọn
 * @param {string} gridId - ID lưới
 * @param {Array<string>} images - Đường dẫn ảnh
 * @param {string} emptyText - Thông báo khi không có ảnh
 */
function renderSuggestionGrid(gridId, images, emptyText) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  if (!images || images.length === 0) {
    grid.innerHTML = `<div class="pcb-thumb-grid__empty">${emptyText}</div>`;
    return;
  }

  grid.innerHTML = images.map((imgSrc, idx) => `
    <button type="button" class="pcb-thumb-item ${selectedImages.includes(imgSrc) ? 'pcb-thumb-item--active' : ''}" data-src="${escapeHtml(imgSrc)}"
      aria-pressed="${selectedImages.includes(imgSrc)}" aria-label="Ảnh đề xuất ${idx + 1}">
      <img class="pcb-thumb-img" src="${escapeHtml(imgSrc)}" alt="" loading="lazy">
    </button>
  `).join('');

  grid.querySelectorAll('.pcb-thumb-item').forEach(item => {
    // Ảnh bị thiếu tệp thì ẩn đi thay vì hiện ô trống
    item.querySelector('img').addEventListener('error', () => item.remove());
    item.addEventListener('click', () => toggleSelectedImage(item.getAttribute('data-src')));
  });
}

/**
 * Hiển thị 2 nhóm ảnh đề xuất: "Có liên quan nhất" và "Ảnh khác"
 * @param {{related: Array<string>, others: Array<string>}} suggestions - Kết quả đề xuất
 */
function renderThumbnailGrid(suggestions) {
  renderSuggestionGrid('sell-thumb-related', suggestions.related, 'Chưa có ảnh sản phẩm trùng mã trong kho. Hãy tải ảnh thật của bạn hoặc chọn ở mục Ảnh khác.');
  renderSuggestionGrid('sell-thumb-grid', suggestions.others, 'Chưa có ảnh đề xuất khác.');
}

/**
 * Thêm / bỏ một ảnh khỏi danh sách ảnh đã chọn
 * @param {string} src - Đường dẫn hoặc data URL của ảnh
 */
async function toggleSelectedImage(src) {
  if (selectedImages.includes(src)) {
    selectedImages = selectedImages.filter(img => img !== src);
  } else if (selectedImages.length >= MAX_PHOTOS) {
    await showAlert({ title: 'Đã đủ số ảnh', message: `Mỗi phiên tối đa ${MAX_PHOTOS} ảnh. Hãy bỏ bớt ảnh trước khi thêm.`, tone: 'warning' });
    return;
  } else {
    selectedImages.push(src);
  }
  renderSelectedPhotos();
}

/**
 * Hiển thị dải ảnh đã chọn: ảnh bìa, nút đặt làm bìa và nút bỏ ảnh
 */
function renderSelectedPhotos() {
  currentSelectedImage = selectedImages[0] || '';
  const list = document.getElementById('sell-selected-photos');
  const counter = document.getElementById('sell-photo-count');
  if (counter) counter.textContent = `${selectedImages.length}/${MAX_PHOTOS} ảnh`;

  if (list) {
    list.innerHTML = selectedImages.length === 0
      ? '<li class="pcb-photo-picker__empty">Chưa chọn ảnh nào. Tải ảnh của bạn hoặc bấm vào ảnh đề xuất bên dưới.</li>'
      : selectedImages.map((src, idx) => `
        <li class="pcb-photo-chip ${idx === 0 ? 'pcb-photo-chip--cover' : ''}">
          <img src="${escapeHtml(src)}" alt="Ảnh đã chọn ${idx + 1}">
          ${idx === 0 ? '<span class="pcb-photo-chip__badge">Ảnh bìa</span>'
            : `<button type="button" class="pcb-photo-chip__cover" data-cover="${idx}" title="Đặt làm ảnh bìa">Đặt làm bìa</button>`}
          <button type="button" class="pcb-photo-chip__remove" data-remove="${idx}" aria-label="Bỏ ảnh ${idx + 1}">×</button>
        </li>`).join('');
  }

  // Ảnh thay đổi ảnh hưởng tới mức hoàn thành của bước 1
  updateProgress();

  // Đồng bộ trạng thái chọn trên lưới ảnh đề xuất
  document.querySelectorAll('#sell-thumb-related .pcb-thumb-item, #sell-thumb-grid .pcb-thumb-item').forEach(item => {
    const active = selectedImages.includes(item.getAttribute('data-src'));
    item.classList.toggle('pcb-thumb-item--active', active);
    item.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  updateLivePreview();
}

/**
 * Thu gọn ảnh người bán tải lên (cạnh dài tối đa 1000px, JPEG) để lưu vừa localStorage
 * @param {File} file - Tệp ảnh
 * @returns {Promise<string>} data URL
 */
function compressUploadedImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, UPLOAD_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Không đọc được ảnh'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Không đọc được tệp'));
    reader.readAsDataURL(file);
  });
}

/**
 * Khởi tạo khu vực ảnh: tải ảnh từ máy, đặt ảnh bìa, bỏ ảnh
 */
function initPhotoPicker() {
  const input = document.getElementById('sell-photo-input');
  const list = document.getElementById('sell-selected-photos');

  if (input) {
    input.addEventListener('change', async () => {
      const files = [...(input.files || [])];
      input.value = '';
      const skipped = [];
      for (const file of files) {
        if (selectedImages.length >= MAX_PHOTOS) {
          skipped.push(`${file.name}: đã đủ ${MAX_PHOTOS} ảnh`);
          continue;
        }
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
          skipped.push(`${file.name}: định dạng không hỗ trợ`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          skipped.push(`${file.name}: lớn hơn 5MB`);
          continue;
        }
        try {
          selectedImages.push(await compressUploadedImage(file));
        } catch {
          skipped.push(`${file.name}: không đọc được ảnh`);
        }
      }
      renderSelectedPhotos();
      if (skipped.length) {
        await showAlert({ title: 'Một số ảnh chưa được thêm', message: skipped.join('\n'), tone: 'warning' });
      }
    });
  }

  if (list) {
    list.addEventListener('click', e => {
      const coverBtn = e.target.closest('[data-cover]');
      const removeBtn = e.target.closest('[data-remove]');
      if (coverBtn) {
        const idx = Number(coverBtn.dataset.cover);
        const [img] = selectedImages.splice(idx, 1);
        selectedImages.unshift(img);
        renderSelectedPhotos();
      } else if (removeBtn) {
        selectedImages.splice(Number(removeBtn.dataset.remove), 1);
        renderSelectedPhotos();
      }
    });
  }
  renderSelectedPhotos();
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
  if (previewTitle) previewTitle.textContent = getListingTitle();

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
    // Không chọn chứng nhận thì ẩn huy hiệu
    previewSeal.textContent = sealSelect.value ? `✓ ${sealSelect.value}` : '';
    previewSeal.hidden = !sealSelect.value;
  }

  // 2 Thông số kỹ thuật tiêu biểu (theo thông số người bán đã chỉnh)
  const previewSpecs = document.getElementById('preview-specs');
  if (previewSpecs) {
    const entries = Object.entries(getAllSpecsObject()).slice(0, 2);
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Phiên đăng nhập có thể đã hết (đăng xuất ở tab khác): yêu cầu đăng nhập lại
    if (!readLoggedInUser()) {
      await requireLoginToSell();
      return;
    }

    // 1. Kiểm tra validation cơ bản
    if (!currentCategory) {
      await showAlert({ title: 'Thiếu danh mục', message: 'Vui lòng chọn Danh mục linh kiện.', tone: 'warning' });
      document.getElementById('sell-category')?.focus();
      return;
    }

    if (!currentSelectedModel) {
      await showAlert({ title: 'Thiếu mẫu sản phẩm', message: 'Vui lòng chọn Mẫu sản phẩm chuẩn của sàn.', tone: 'warning' });
      document.getElementById('sell-model')?.focus();
      return;
    }

    // Tiêu đề phiên: bắt buộc, 5 - 120 ký tự (mặc định là tên mẫu, người bán có thể sửa)
    const titleInput = document.getElementById('sell-title');
    const listingTitle = getListingTitle();
    if (listingTitle.length < 5 || listingTitle.length > 120) {
      await showAlert({ title: 'Tiêu đề chưa hợp lệ', message: 'Tiêu đề phiên đấu giá cần từ 5 đến 120 ký tự.', tone: 'warning' });
      titleInput?.focus();
      return;
    }

    const startPriceInput = document.getElementById('sell-start-price');
    const startPrice = startPriceInput ? parseInt(startPriceInput.value, 10) : 0;
    if (!startPrice || startPrice < 10000) {
      await showAlert({ title: 'Giá khởi điểm không hợp lệ', message: 'Vui lòng nhập Giá khởi điểm hợp lệ (tối thiểu 10.000₫).', tone: 'warning' });
      startPriceInput?.focus();
      return;
    }

    const descriptionInput = document.getElementById('sell-description');
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    if (!description) {
      await showAlert({ title: 'Thiếu mô tả', message: 'Vui lòng nhập Mô tả tình trạng thực tế & phụ kiện của món hàng.', tone: 'warning' });
      descriptionInput?.focus();
      return;
    }

    if (selectedImages.length === 0) {
      await showAlert({ title: 'Thiếu ảnh sản phẩm', message: 'Vui lòng tải ít nhất 1 ảnh hoặc chọn ảnh đề xuất cho món hàng.', tone: 'warning' });
      document.getElementById('sell-photo-input')?.focus();
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
      // Đăng bán lại: giữ nguyên ID phiên cũ; tạo mới: ID độc nhất theo timestamp
      id: relistTarget ? relistTarget.id : Date.now(),
      // Tiêu đề do người bán xác nhận (đề xuất sẵn theo tên mẫu)
      name: listingTitle,
      category: currentCategory,
      condition: condition,
      startingPrice: startPrice,
      currentBid: startPrice,
      bidStep: bidStep,
      bidCount: 0,
      marketPriceNew: marketPrice,
      endTime: new Date(Date.now() + durationDays * 24 * 3600 * 1000).toISOString(),
      seller: sellerName,
      images: selectedImages.length ? [...selectedImages] : [currentSelectedModel.images[0]],
      description: description,
      // Thông số của mẫu sau khi người bán chỉnh sửa + thông số tự bổ sung
      specifications: getAllSpecsObject()
    };
    // Chứng nhận kiểm thử: chỉ lưu khi người bán chủ động chọn
    const certification = document.getElementById('sell-seal')?.value || '';
    if (certification) newAuctionProduct.certification = certification;

    if (relistTarget) {
      // Đánh dấu phiên mở lại để các trang dùng thời hạn mới thay cho trạng thái "đã kết thúc" cũ
      newAuctionProduct.relisted = true;
      newAuctionProduct.relistedAt = new Date().toISOString();
      newAuctionProduct.status = 'active';
      newAuctionProduct.condition = condition;
      newAuctionProduct.category = relistTarget.product.category || newAuctionProduct.category;
    }

    // 3. Lưu vào LocalStorage theo chuẩn quy định AGENTS.md (pcbid_products)
    try {
      // Khi đăng bán lại: thay bản cũ cùng ID và xóa lượt đặt giá của phiên trước
      const existing = JSON.parse(localStorage.getItem('pcbid_products') || '[]')
        .filter(p => Number(p.id) !== Number(newAuctionProduct.id));
      existing.unshift(newAuctionProduct);
      if (relistTarget) {
        const bids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]')
          .filter(b => Number(b.productId) !== Number(newAuctionProduct.id));
        localStorage.setItem('pcbid_bids', JSON.stringify(bids));
      }
      localStorage.setItem('pcbid_products', JSON.stringify(existing));

      // Đồng bộ đồng thời vào tab "Linh kiện tôi đã đăng bán" (pcbid_my_auctions_selling) của profile.html
      // Danh sách đăng bán lưu riêng theo tài khoản người bán
      const sellerUser = readLoggedInUser();
      const mySelling = readUserList(USER_LIST_KEYS.SELLING, sellerUser)
        .filter(item => Number(item.id) !== Number(newAuctionProduct.id));
      const specsList = newAuctionProduct.specifications
        ? Object.entries(newAuctionProduct.specifications).slice(0, 2).map(([k, v]) => `${k}: ${v}`)
        : [];
      mySelling.unshift({
        id: newAuctionProduct.id,
        name: newAuctionProduct.name,
        category: newAuctionProduct.category,
        startingPrice: newAuctionProduct.startingPrice,
        currentBid: newAuctionProduct.startingPrice,
        bidCount: 0,
        status: 'active',
        relisted: Boolean(relistTarget),
        endTime: newAuctionProduct.endTime,
        endTimestamp: new Date(newAuctionProduct.endTime).getTime(),
        images: newAuctionProduct.images,
        specs: specsList
      });
      writeUserList(USER_LIST_KEYS.SELLING, sellerUser, mySelling);
    } catch (e) {
      console.error('[Lỗi lưu LocalStorage PCBid]:', e);
      await showAlert({
        title: 'Không lưu được phiên',
        message: 'Bộ nhớ trình duyệt đã đầy (thường do quá nhiều ảnh tải lên). Hãy bớt ảnh hoặc dùng ảnh đề xuất rồi thử lại.',
        tone: 'danger'
      });
      return;
    }

    // 4. Hiển thị modal thông báo thành công
    const successModal = document.getElementById('sell-success-modal');
    if (successModal) {
      successModal.classList.add('pcb-modal-overlay--open');

      // Sang trang Sàn đấu giá, sắp xếp "Phiên mới lên sàn" và làm nổi bật phiên vừa đăng
      const nextUrl = `products.html?sort=newest&highlight=${encodeURIComponent(newAuctionProduct.id)}`;
      const goBtn = document.getElementById('sell-success-go');
      if (goBtn) {
        goBtn.href = nextUrl;
        goBtn.focus();
      }

      // Đếm ngược 10 giây rồi tự chuyển trang
      const TOTAL_SECONDS = 10;
      let remaining = TOTAL_SECONDS;
      const numEl = document.getElementById('sell-countdown-num');
      const textEl = document.getElementById('sell-countdown-text');
      const barEl = document.getElementById('sell-countdown-bar');
      const paint = () => {
        if (numEl) numEl.textContent = remaining;
        if (textEl) textEl.textContent = remaining;
        if (barEl) barEl.style.strokeDashoffset = String(119.4 * (1 - remaining / TOTAL_SECONDS));
      };
      paint();
      const timer = setInterval(() => {
        remaining -= 1;
        paint();
        if (remaining <= 0) {
          clearInterval(timer);
          window.location.href = nextUrl;
        }
      }, 1000);
    } else {
      await showAlert({ title: 'Thành công', message: 'Tạo phiên đấu giá thành công! Đang chuyển về sàn...', tone: 'success' });
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
