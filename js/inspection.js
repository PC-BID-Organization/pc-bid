/* ==========================================================================
   PCBid - Quy trình kiểm định phần cứng mô phỏng (inspection.js)
   ==========================================================================
   Mọi linh kiện phải qua PCBid Lab kiểm định trước khi mở đặt giá:
   - Phiên có sẵn trên sàn (danh mục mẫu) coi như đã kiểm định đạt.
   - Phiên người dùng tự đăng bán: chỉ được gửi kiểm định khi Kiểm định viên
     duyệt bài (xem moderation.js). Lúc đó lưu inspection.requestedAt, phiên ở
     trạng thái "Chờ kiểm định" trong INSPECTION_MS (mô phỏng 1 phút), chưa ai
     đặt giá được.
   - Hết thời gian chờ: kết quả "Đạt" kèm các chỉ số theo loại linh kiện,
     phiên được gắn tem PCBid Verified và mở đặt giá.
   Người bán không còn tự chọn chứng nhận như trước để tránh tự kê khai sai.
   ========================================================================== */

// Thời gian PCBid Lab kiểm định một linh kiện (mô phỏng để trình diễn nhanh)
export const INSPECTION_MS = 60 * 1000;

/**
 * Tạo thông tin yêu cầu kiểm định cho phiên vừa đăng
 * @param {number} [now] - Thời điểm gửi yêu cầu
 * @returns {{requestedAt: string}}
 */
export function createInspectionRequest(now = Date.now()) {
  return { requestedAt: new Date(now).toISOString() };
}

/**
 * Thời điểm PCBid Lab trả kết quả kiểm định của phiên
 * @param {Object} product - Phiên đấu giá
 * @returns {number} 0 nếu phiên không cần chờ (phiên có sẵn trên sàn)
 */
export function getInspectionDoneAt(product) {
  const requested = product?.inspection?.requestedAt ? new Date(product.inspection.requestedAt).getTime() : NaN;
  return Number.isFinite(requested) ? requested + INSPECTION_MS : 0;
}

/**
 * Phiên đang chờ kiểm định (chưa mở đặt giá)
 * @param {Object} product - Phiên đấu giá
 * @param {number} [now]
 * @returns {boolean}
 */
export function isAwaitingInspection(product, now = Date.now()) {
  const doneAt = getInspectionDoneAt(product);
  return doneAt > 0 && now < doneAt;
}

/**
 * Số giây còn lại trước khi có kết quả kiểm định
 * @param {Object} product
 * @param {number} [now]
 * @returns {number}
 */
export function getInspectionSecondsLeft(product, now = Date.now()) {
  return Math.max(0, Math.ceil((getInspectionDoneAt(product) - now) / 1000));
}

/**
 * Nhóm linh kiện để chọn bài kiểm tra phù hợp
 * @param {Object} product
 * @returns {string}
 */
function categoryKey(product) {
  const cat = String(product?.category || '').toLowerCase();
  if (cat.includes('gpu') || cat.includes('vga')) return 'gpu';
  if (cat.includes('cpu')) return 'cpu';
  if (cat.includes('ram')) return 'ram';
  if (cat.includes('storage') || cat.includes('ssd') || cat.includes('ổ cứng')) return 'storage';
  if (cat.includes('psu') || cat.includes('nguồn')) return 'psu';
  if (cat.includes('mainboard')) return 'mainboard';
  return 'other';
}

/**
 * Số giả ngẫu nhiên ổn định theo ID phiên (để kết quả không đổi giữa các lần tải trang)
 * @param {Object} product
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function stableNumber(product, min, max) {
  const seed = (Number(product?.id) || 7) * 9301 + 49297;
  return min + (seed % 233280) % (max - min + 1);
}

/**
 * Nhãn tem ngắn hiển thị trên thẻ sản phẩm
 * @param {Object} product
 * @returns {string}
 */
export function getInspectionSeal(product) {
  if (isAwaitingInspection(product)) return 'Chờ kiểm định';
  const labels = {
    gpu: `Furmark ${stableNumber(product, 62, 74)}°C`,
    cpu: 'Socket OK',
    ram: 'MemTest86 OK',
    storage: `Sức khỏe ${stableNumber(product, 92, 100)}%`,
    psu: 'Tải 100% ổn định',
    mainboard: 'POST OK',
    other: 'Đã kiểm định'
  };
  return labels[categoryKey(product)];
}

/**
 * Danh sách kết quả kiểm định chi tiết theo loại linh kiện
 * @param {Object} product
 * @returns {Array<{label: string, value: string}>}
 */
export function getInspectionResults(product) {
  const common = [{ label: 'Ngoại quan & tem bảo hành', value: 'Không cấn móp, tem void nguyên vẹn' }];
  const byCategory = {
    gpu: [{ label: 'Furmark 15 phút', value: `${stableNumber(product, 62, 74)}°C, không giật hình` }],
    cpu: [{ label: 'Chân socket / stress test', value: 'Chân thẳng, Cinebench ổn định 30 phút' }],
    ram: [{ label: 'MemTest86 (2 lượt)', value: '0 lỗi' }],
    storage: [{ label: 'CrystalDiskInfo', value: `Sức khỏe ${stableNumber(product, 92, 100)}%, không bad sector` }],
    psu: [{ label: 'Tải giả 100% công suất', value: 'Điện áp ổn định, quạt êm' }],
    mainboard: [{ label: 'POST & cổng kết nối', value: 'Khởi động OK, đủ cổng, không cong chân' }],
    other: [{ label: 'Chạy thử thực tế', value: 'Hoạt động ổn định' }]
  };
  return [...byCategory[categoryKey(product)], ...common];
}

/**
 * Công cụ demo: bỏ qua thời gian chờ kiểm định của một phiên (PCBid Lab trả kết quả ngay).
 * Lùi mốc gửi yêu cầu về quá khứ trong pcbid_products và bản sao ở danh sách đăng bán của người bán.
 * @param {number} productId - ID phiên
 * @returns {boolean} true nếu đã cập nhật được phiên
 */
export function skipInspectionForDemo(productId) {
  const now = Date.now();
  const past = new Date(now - INSPECTION_MS - 1000).toISOString();
  // Dời giờ kết thúc sớm lên đúng bằng phần thời gian chờ được bỏ qua để phiên vẫn đủ thời hạn
  const shift = item => {
    const oldDoneAt = getInspectionDoneAt(item);
    const delta = Math.max(0, oldDoneAt - (now - 1000));
    item.inspection = { ...item.inspection, requestedAt: past };
    if (item.endTime) item.endTime = new Date(new Date(item.endTime).getTime() - delta).toISOString();
    if (item.endTimestamp) item.endTimestamp = Number(item.endTimestamp) - delta;
  };
  let updated = false;
  try {
    const products = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
    products.forEach(p => {
      if (Number(p.id) === Number(productId) && isAwaitingInspection(p, now)) {
        shift(p);
        updated = true;
      }
    });
    if (updated) localStorage.setItem('pcbid_products', JSON.stringify(products));
    // Bản sao trong danh sách "Linh kiện tôi đã đăng bán" của từng tài khoản
    Object.keys(localStorage).filter(key => key.startsWith('pcbid_my_auctions_selling')).forEach(key => {
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(list)) return;
      let changed = false;
      list.forEach(item => {
        if (Number(item.id) === Number(productId) && isAwaitingInspection(item, now)) {
          shift(item);
          changed = true;
        }
      });
      if (changed) localStorage.setItem(key, JSON.stringify(list));
    });
  } catch {
    return false;
  }
  return updated;
}

/**
 * Mốc bắt đầu tính giờ của phiên: phiên đang chờ kiểm định thì đồng hồ đứng yên tới lúc có kết quả
 * @param {Object} product
 * @returns {number} Thời điểm (ms) hoặc 0 nếu phiên không phải chờ
 */
export function getCountdownStart(product) {
  return isAwaitingInspection(product) ? getInspectionDoneAt(product) : 0;
}

/**
 * Thời gian còn lại của phiên, không trừ phần thời gian đang chờ kiểm định
 * @param {number} endTimestamp - Thời điểm kết thúc
 * @param {number} [start] - Mốc bắt đầu tính giờ (data-start), 0 nếu đã chạy
 * @param {number} [now]
 * @returns {number} Số mili giây còn lại
 */
export function getRemainingMs(endTimestamp, start = 0, now = Date.now()) {
  return Number(endTimestamp) - Math.max(now, Number(start) || 0);
}

// Kiểm định viên của PCBid Lab (luân phiên theo ID phiên để mỗi phiếu khác nhau nhưng ổn định)
const INSPECTORS = ['Nguyễn Trọng Thao', 'Lê Minh Khang', 'Trần Bảo Ngọc', 'Phạm Quốc Huy'];

/**
 * Định dạng ngày dd/mm/yyyy
 * @param {number} time
 * @returns {string}
 */
function formatDate(time) {
  const d = new Date(time);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Nội dung phiếu kiểm định của một phiên đã đạt (giống phiếu mẫu ở Trang chủ nhưng theo từng sản phẩm)
 * @param {Object} product - Phiên đấu giá
 * @returns {{code: string, grade: string, inspector: string, date: string, rows: Array<{label: string, value: string, good?: boolean}>}}
 */
export function getInspectionCertificate(product) {
  const id = Number(product?.id) || 0;
  const doneAt = getInspectionDoneAt(product);
  // Phiên có sẵn trên sàn: ngày cấp lùi vài ngày trước theo ID; phiên tự đăng: đúng lúc kiểm định xong
  const issuedAt = doneAt || Date.now() - ((id % 9) + 1) * 86400000;
  const year = new Date(issuedAt).getFullYear();
  const results = getInspectionResults(product);
  return {
    code: `#UIT-QC-${year}-${String(id % 10000).padStart(4, '0')}`,
    grade: stableNumber(product, 0, 3) === 0 ? 'A' : 'A+',
    // Bài do Kiểm định viên duyệt: phiếu ghi đúng tên người duyệt
    inspector: product?.reviewedBy?.role === 'inspector'
      ? `${product.reviewedBy.name} (PCBid Lab)`
      : `${INSPECTORS[id % INSPECTORS.length]} (UIT Hardware Lab)`,
    date: formatDate(issuedAt),
    rows: [
      { label: 'Thiết bị kiểm định', value: product?.name || '---' },
      ...results.map((r, i) => ({ ...r, good: i === 0 })),
      { label: 'Tình trạng người bán mô tả', value: product?.condition || 'Đã sử dụng' },
      { label: 'Bảo đảm của sàn PCBid', value: 'Bao test 7 ngày, 1 đổi 1 hoặc hoàn tiền về ví cọc' }
    ]
  };
}
