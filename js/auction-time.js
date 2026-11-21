/* ==========================================================================
   PCBid - Tiện ích tính thời điểm kết thúc phiên đấu giá dùng chung
   ==========================================================================
   Vấn đề: dữ liệu mẫu trong data/*.json ghi cứng endTime (ví dụ 2026-11-15),
   sau ngày đó toàn bộ phiên sẽ bị coi là "đã kết thúc". Mỗi trang lại tự tính
   thời gian theo cách riêng nên profile.html hiện "còn giờ" nhưng
   product-detail.html báo "đã kết thúc".

   Giải pháp: mọi trang đều gọi chung hàm getAuctionEndTimestamp().
   - Sản phẩm thuộc catalog mẫu (ID nhỏ): thời điểm kết thúc được mô phỏng theo
     chu kỳ cuốn chiếu 72 giờ, lệch nhau cố định theo ID. Kết quả luôn giống nhau
     trên mọi trang và luôn nằm trong tương lai (tối đa 72 giờ tới).
   - Sản phẩm người dùng tự đăng bán từ sell.html (ID = Date.now()): dùng đúng
     endTime đã lưu trong localStorage.
   ========================================================================== */

// Ngưỡng phân biệt ID catalog mẫu (1001 - 8999) với ID sinh bằng Date.now()
const CATALOG_ID_MAX = 1000000;

// Độ dài một chu kỳ đấu giá mô phỏng: 72 giờ
const AUCTION_CYCLE_MS = 72 * 60 * 60 * 1000;

// Mốc gốc cố định để mọi trang tính ra cùng một kết quả
const AUCTION_EPOCH_MS = Date.UTC(2026, 0, 1);

/**
 * Kiểm tra sản phẩm có thuộc catalog mẫu (data/*.json) hay không
 * @param {number|string} id - ID sản phẩm
 * @returns {boolean}
 */
export function isCatalogProduct(id) {
  const idNum = Number(id);
  return Number.isFinite(idNum) && idNum > 0 && idNum < CATALOG_ID_MAX;
}

/**
 * Tính độ lệch thời gian cố định (theo phút) của từng sản phẩm trong chu kỳ
 * để các phiên không kết thúc cùng lúc
 * @param {number} idNum - ID sản phẩm
 * @returns {number} Độ lệch tính bằng mili giây
 */
function getCatalogOffset(idNum) {
  const cycleMinutes = AUCTION_CYCLE_MS / 60000;
  // Nhân với số nguyên tố lớn để rải đều các phiên trong chu kỳ
  const offsetMinutes = (idNum * 7919) % cycleMinutes;
  return offsetMinutes * 60000;
}

/**
 * Trả về thời điểm kết thúc phiên (mili giây) thống nhất cho mọi trang
 * @param {Object} product - Đối tượng sản phẩm (cần id, endTime hoặc endTimestamp)
 * @param {number} [now=Date.now()] - Thời điểm hiện tại
 * @returns {number} Timestamp kết thúc phiên
 */
export function getAuctionEndTimestamp(product, now = Date.now()) {
  if (!product) return now + AUCTION_CYCLE_MS;

  const idNum = Number(product.id);
  const savedEnd = product.endTime ? new Date(product.endTime).getTime() : NaN;

  // Phiên đã chốt (đã bán / đã kết thúc) hoặc phiên được người bán đăng lại:
  // dùng đúng endTime đã lưu thay cho chu kỳ mô phỏng
  if ((isAuctionClosed(product) || product.relisted || product.closedEarly) && Number.isFinite(savedEnd)) {
    return savedEnd;
  }

  if (isCatalogProduct(idNum)) {
    const base = AUCTION_EPOCH_MS + getCatalogOffset(idNum);
    const cyclesPassed = Math.floor((now - base) / AUCTION_CYCLE_MS) + 1;
    return base + cyclesPassed * AUCTION_CYCLE_MS;
  }

  // Phiên do người dùng tự đăng bán: ưu tiên endTime đã lưu
  const fromEndTime = product.endTime ? new Date(product.endTime).getTime() : NaN;
  if (Number.isFinite(fromEndTime)) return fromEndTime;

  const fromTimestamp = Number(product.endTimestamp);
  if (Number.isFinite(fromTimestamp) && fromTimestamp > 0) return fromTimestamp;

  return now + 24 * 60 * 60 * 1000;
}

/**
 * Kiểm tra phiên đã chốt (đã bán thành công hoặc đã kết thúc) theo trường status của dữ liệu
 * @param {Object} product - Đối tượng sản phẩm
 * @returns {boolean}
 */
export function isAuctionClosed(product) {
  return product?.status === 'sold' || product?.status === 'ended';
}

/**
 * Gộp dữ liệu sản phẩm gốc (JSON) với bản cập nhật trong localStorage (pcbid_products)
 * - Phiên được người bán đăng lại (relisted): bản trong localStorage thay thế hoàn toàn
 * - Các trường hợp khác: giữ nguyên trạng thái, người thắng và thời hạn gốc của dữ liệu,
 *   tránh bản lưu cũ ghi đè làm phiên đã chốt hiển thị như đang mở
 * @param {Object} base - Sản phẩm gốc từ tệp JSON
 * @param {Object} [local] - Bản cập nhật trong localStorage
 * @returns {Object}
 */
export function mergeLocalProduct(base, local) {
  if (!local) return { ...base };
  // Phiên đăng bán lại hoặc bị người bán đóng sớm: bản trong localStorage là bản chuẩn
  if (local.relisted || local.closedEarly) return { ...base, ...local };
  const merged = { ...base, ...local };
  ['status', 'winner', 'endTime'].forEach(key => {
    if (key in base) merged[key] = base[key];
    else delete merged[key];
  });
  if (isAuctionClosed(base)) {
    // Phiên đã chốt: giá và số lượt bid giữ theo dữ liệu gốc
    merged.currentBid = base.currentBid;
    merged.bidCount = base.bidCount;
  }
  return merged;
}

/**
 * Trả về thời điểm kết thúc phiên dưới dạng chuỗi ISO
 * @param {Object} product - Đối tượng sản phẩm
 * @returns {string}
 */
export function getAuctionEndTimeIso(product) {
  return new Date(getAuctionEndTimestamp(product)).toISOString();
}
