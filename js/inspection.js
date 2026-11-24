/* ==========================================================================
   PCBid - Quy trình kiểm định phần cứng mô phỏng (inspection.js)
   ==========================================================================
   Mọi linh kiện phải qua PCBid Lab kiểm định trước khi mở đặt giá:
   - Phiên có sẵn trên sàn (danh mục mẫu) coi như đã kiểm định đạt.
   - Phiên người dùng tự đăng bán: lưu inspection.requestedAt, ở trạng thái
     "Chờ kiểm định" trong INSPECTION_MS (mô phỏng 1 phút), chưa ai đặt giá được.
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
  const past = new Date(Date.now() - INSPECTION_MS - 1000).toISOString();
  let updated = false;
  try {
    const products = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
    products.forEach(p => {
      if (Number(p.id) === Number(productId) && p.inspection) {
        p.inspection = { ...p.inspection, requestedAt: past };
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
        if (Number(item.id) === Number(productId) && item.inspection) {
          item.inspection = { ...item.inspection, requestedAt: past };
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
