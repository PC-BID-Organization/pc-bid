/* ==========================================================================
   PCBid - Kiểm duyệt bài đăng, quản lý phiên và báo cáo vi phạm (moderation.js)
   ==========================================================================
   Mô phỏng hoàn toàn trên trình duyệt (localStorage):
   - Vai trò: Kiểm định viên (inspector) xét duyệt bài đăng, yêu cầu người bán
     bổ sung thông tin, xử lý báo cáo. Quản trị viên (admin) có đủ các quyền đó
     và thêm quyền quản lý phiên: ẩn / hiện lại / gỡ bài đăng.
   - Luồng một bài đăng mới:
       Chờ kiểm duyệt → (Yêu cầu bổ sung ⇄ Người bán phản hồi) → Duyệt
       → PCBid Lab kiểm định (INSPECTION_MS) → mở đặt giá, đồng hồ bắt đầu chạy.
     Thời hạn phiên chỉ được tính từ lúc duyệt, nên bài chờ duyệt lâu không bị
     mất thời gian đấu giá.
   - Ẩn / gỡ bài lưu ở pcbid_moderation (áp dụng được cả cho phiên có sẵn trong
     danh mục products.json lẫn phiên người dùng tự đăng).
   - Báo cáo bài đăng / tài khoản lưu ở pcbid_reports, hiện cho cả Quản trị viên
     và Kiểm định viên.
   ========================================================================== */

import { INSPECTION_MS, createInspectionRequest } from './inspection.js';

const PRODUCTS_KEY = 'pcbid_products';
const SELLING_PREFIX = 'pcbid_my_auctions_selling';
const MODERATION_KEY = 'pcbid_moderation';
const REPORTS_KEY = 'pcbid_reports';

// Thời hạn mặc định khi phiên cũ chưa lưu durationMs (3 ngày)
const DEFAULT_DURATION_MS = 3 * 24 * 3600 * 1000;

/* ==========================================================================
   VAI TRÒ
   ========================================================================== */

// Tên hiển thị của các vai trò quản lý sàn
export const ROLE_LABELS = {
  admin: 'Quản trị viên',
  inspector: 'Kiểm định viên'
};

/**
 * Vai trò quản lý của tài khoản
 * @param {Object|null} user
 * @returns {'admin'|'inspector'|null}
 */
export function getStaffRole(user) {
  if (!user) return null;
  if (user.role === 'admin' || user.username === 'admin') return 'admin';
  if (user.role === 'inspector') return 'inspector';
  return null;
}

/**
 * Tài khoản là Quản trị viên
 * @param {Object|null} user
 * @returns {boolean}
 */
export function isAdmin(user) {
  return getStaffRole(user) === 'admin';
}

/**
 * Tài khoản thuộc đội ngũ PCBid (Quản trị viên hoặc Kiểm định viên): được duyệt bài và xử lý báo cáo
 * @param {Object|null} user
 * @returns {boolean}
 */
export function isStaff(user) {
  return Boolean(getStaffRole(user));
}

/**
 * Tên vai trò để hiện trên thẻ vai trò (chat, hồ sơ công khai...)
 * @param {Object|null} user
 * @returns {string} Chuỗi rỗng nếu là thành viên thường
 */
export function getRoleLabel(user) {
  return ROLE_LABELS[getStaffRole(user)] || '';
}

/**
 * Thông tin rút gọn của người xử lý để lưu vào nhật ký
 * @param {Object} staff
 * @returns {{username: string, name: string, role: string}}
 */
function staffInfo(staff) {
  return {
    username: staff?.username || '',
    name: staff?.fullname || staff?.username || 'PCBid',
    role: getStaffRole(staff) || ''
  };
}

/* ==========================================================================
   TRẠNG THÁI KIỂM DUYỆT CỦA BÀI ĐĂNG
   ========================================================================== */

/**
 * Bài đăng đang chờ đội ngũ PCBid xét duyệt (kể cả khi đang chờ người bán bổ sung)
 * @param {Object} product
 * @returns {boolean}
 */
export function isAwaitingReview(product) {
  return product?.status === 'pending_approval'
    || product?.approvalStatus === 'pending'
    || product?.approvalStatus === 'info_requested';
}

/**
 * Kiểm định viên đã yêu cầu người bán bổ sung thông tin và đang chờ phản hồi
 * @param {Object} product
 * @returns {boolean}
 */
export function needsMoreInfo(product) {
  return product?.approvalStatus === 'info_requested';
}

/**
 * Bài đăng bị từ chối
 * @param {Object} product
 * @returns {boolean}
 */
export function isRejected(product) {
  return product?.status === 'rejected' || product?.approvalStatus === 'rejected';
}

/**
 * Lời nhắn gần nhất của đội ngũ PCBid (yêu cầu bổ sung / lý do từ chối)
 * @param {Object} product
 * @returns {Object|null} Mục nhật ký { at, by, action, note }
 */
export function getLastStaffNote(product) {
  const log = Array.isArray(product?.reviewLog) ? product.reviewLog : [];
  return [...log].reverse().find(e => e.action === 'request_info' || e.action === 'reject') || null;
}

/**
 * Đọc danh sách sản phẩm trong pcbid_products
 * @returns {Array}
 */
function readProducts() {
  try {
    const list = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Lấy một bài đăng trong pcbid_products theo ID
 * @param {number|string} id
 * @returns {Object|null}
 */
export function getStoredProduct(id) {
  return readProducts().find(p => Number(p.id) === Number(id)) || null;
}

/**
 * Các bài đăng đang chờ xét duyệt, bài chờ lâu nhất đứng đầu
 * @returns {Array}
 */
export function getReviewQueue() {
  return readProducts()
    .filter(isAwaitingReview)
    .sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
}

// Các trường trạng thái cần chép sang bản sao trong danh sách "Đã đăng bán" của người bán
const MIRRORED_FIELDS = ['status', 'approvalStatus', 'inspection', 'endTime', 'endTimestamp', 'reviewLog', 'reviewedBy', 'reviewedAt', 'durationMs'];

/**
 * Cập nhật một bài đăng trong pcbid_products và bản sao ở danh sách đăng bán của mọi tài khoản
 * @param {number|string} id
 * @param {Function} updater - Nhận bản sao sản phẩm, trả về sản phẩm đã sửa
 * @returns {Object|null} Sản phẩm sau khi cập nhật
 */
function updateProduct(id, updater) {
  const products = readProducts();
  const index = products.findIndex(p => Number(p.id) === Number(id));
  if (index < 0) return null;
  const updated = updater({ ...products[index] });
  products[index] = updated;
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

  Object.keys(localStorage).filter(key => key.startsWith(SELLING_PREFIX)).forEach(key => {
    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(list)) return;
      let changed = false;
      list.forEach(item => {
        if (Number(item.id) !== Number(id)) return;
        MIRRORED_FIELDS.forEach(field => {
          if (field in updated) item[field] = updated[field];
        });
        changed = true;
      });
      if (changed) localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // Bỏ qua danh sách hỏng
    }
  });
  return updated;
}

/**
 * Thêm một mục vào nhật ký kiểm duyệt của bài đăng
 * @param {Object} product
 * @param {Object} entry
 */
function pushLog(product, entry) {
  product.reviewLog = [...(Array.isArray(product.reviewLog) ? product.reviewLog : []), { at: new Date().toISOString(), ...entry }];
}

/**
 * Thời hạn phiên người bán đã chọn (ms). Phiên cũ chưa lưu thì suy ra từ giờ kết thúc lúc đăng.
 * @param {Object} product
 * @returns {number}
 */
function getDurationMs(product) {
  if (Number(product.durationMs) > 0) return Number(product.durationMs);
  const submitted = new Date(product.submittedAt || 0).getTime();
  const end = new Date(product.endTime || 0).getTime();
  if (submitted && end > submitted) return Math.max(3600 * 1000, end - submitted - INSPECTION_MS);
  return DEFAULT_DURATION_MS;
}

/**
 * Duyệt bài đăng: chuyển sang PCBid Lab kiểm định ngay, đồng hồ đấu giá chạy khi kiểm định xong
 * @param {number|string} id
 * @param {Object} staff - Kiểm định viên / Quản trị viên đang duyệt
 * @returns {Object|null}
 */
export function approveListing(id, staff) {
  return updateProduct(id, p => {
    const now = Date.now();
    const duration = getDurationMs(p);
    p.status = 'active';
    p.approvalStatus = 'approved';
    p.durationMs = duration;
    p.reviewedBy = staffInfo(staff);
    p.reviewedAt = new Date(now).toISOString();
    // Mốc kiểm định tính từ lúc duyệt (trước đây tính từ lúc đăng nên đồng hồ chạy trước khi duyệt)
    p.inspection = createInspectionRequest(now);
    if (p.endMode === 'ceiling_only') {
      p.endTime = null;
    } else {
      p.endTime = new Date(now + INSPECTION_MS + duration).toISOString();
      p.endTimestamp = now + INSPECTION_MS + duration;
    }
    pushLog(p, { by: staffInfo(staff), action: 'approve' });
    return p;
  });
}

/**
 * Yêu cầu người bán bổ sung thông tin (bài vẫn chờ duyệt, chưa lên sàn)
 * @param {number|string} id
 * @param {Object} staff
 * @param {string} note - Nội dung cần bổ sung
 * @returns {Object|null}
 */
export function requestMoreInfo(id, staff, note) {
  return updateProduct(id, p => {
    p.status = 'pending_approval';
    p.approvalStatus = 'info_requested';
    pushLog(p, { by: staffInfo(staff), action: 'request_info', note: String(note || '').trim() });
    return p;
  });
}

/**
 * Từ chối bài đăng
 * @param {number|string} id
 * @param {Object} staff
 * @param {string} reason - Lý do từ chối
 * @returns {Object|null}
 */
export function rejectListing(id, staff, reason) {
  return updateProduct(id, p => {
    p.status = 'rejected';
    p.approvalStatus = 'rejected';
    p.rejectedAt = new Date().toISOString();
    pushLog(p, { by: staffInfo(staff), action: 'reject', note: String(reason || '').trim() });
    return p;
  });
}

/**
 * Người bán gửi phần bổ sung: bài quay lại hàng đợi xét duyệt
 * @param {number|string} id
 * @param {Object} seller
 * @param {string} text - Nội dung bổ sung
 * @returns {Object|null}
 */
export function submitSellerReply(id, seller, text) {
  return updateProduct(id, p => {
    p.status = 'pending_approval';
    p.approvalStatus = 'pending';
    pushLog(p, {
      by: { username: seller?.username || '', name: seller?.fullname || seller?.username || 'Người bán', role: 'seller' },
      action: 'reply',
      note: String(text || '').trim()
    });
    return p;
  });
}

/* ==========================================================================
   ẨN / GỠ BÀI ĐĂNG (QUẢN TRỊ VIÊN)
   ========================================================================== */

/**
 * Đọc trạng thái ẩn / gỡ của mọi bài đăng
 * @returns {{hidden: Object, removed: Object}}
 */
function readModeration() {
  try {
    const data = JSON.parse(localStorage.getItem(MODERATION_KEY) || '{}');
    return { hidden: data.hidden || {}, removed: data.removed || {} };
  } catch {
    return { hidden: {}, removed: {} };
  }
}

/**
 * Ghi trạng thái ẩn / gỡ
 * @param {{hidden: Object, removed: Object}} data
 */
function writeModeration(data) {
  localStorage.setItem(MODERATION_KEY, JSON.stringify(data));
}

/**
 * Trạng thái quản lý của một bài đăng
 * @param {number|string} id
 * @returns {{hidden: Object|null, removed: Object|null}} Mỗi mục có { at, by, reason } nếu đang áp dụng
 */
export function getModerationState(id) {
  const data = readModeration();
  return { hidden: data.hidden[id] || null, removed: data.removed[id] || null };
}

/**
 * Bài đăng còn được hiển thị công khai (không bị ẩn hay gỡ)
 * @param {Object|number|string} productOrId
 * @returns {boolean}
 */
export function isListingVisible(productOrId) {
  const id = typeof productOrId === 'object' ? productOrId?.id : productOrId;
  const state = getModerationState(id);
  return !state.hidden && !state.removed;
}

/**
 * Lọc bỏ các bài đăng bị ẩn / gỡ khỏi danh sách hiển thị
 * @param {Array} products
 * @returns {Array}
 */
export function filterVisibleListings(products) {
  const data = readModeration();
  return (products || []).filter(p => !data.hidden[p.id] && !data.removed[p.id]);
}

/**
 * Số bài đăng đang bị ẩn (bộ đếm tab Quản lý phiên)
 * @returns {number}
 */
export function getHiddenListingCount() {
  return Object.keys(readModeration().hidden).length;
}

/**
 * Ẩn bài đăng khỏi sàn (có thể hiện lại)
 * @param {number|string} id
 * @param {Object} staff
 * @param {string} reason
 */
export function hideListing(id, staff, reason = '') {
  const data = readModeration();
  data.hidden[id] = { at: new Date().toISOString(), by: staffInfo(staff), reason: String(reason).trim() };
  writeModeration(data);
}

/**
 * Hiện lại bài đăng đã ẩn
 * @param {number|string} id
 */
export function unhideListing(id) {
  const data = readModeration();
  delete data.hidden[id];
  writeModeration(data);
}

/**
 * Gỡ hẳn bài đăng khỏi sàn (không hiện lại được, người bán vẫn thấy lý do gỡ)
 * @param {number|string} id
 * @param {Object} staff
 * @param {string} reason
 */
export function removeListing(id, staff, reason = '') {
  const data = readModeration();
  delete data.hidden[id];
  data.removed[id] = { at: new Date().toISOString(), by: staffInfo(staff), reason: String(reason).trim() };
  writeModeration(data);
}

/* ==========================================================================
   BÁO CÁO VI PHẠM
   ========================================================================== */

// Lý do báo cáo theo loại đối tượng
export const REPORT_REASONS = {
  listing: [
    'Hàng giả, hàng nhái hoặc không đúng mô tả',
    'Ảnh không phải ảnh thật của sản phẩm',
    'Nghi ngờ lừa đảo, không có hàng thật',
    'Giá ảo, nghi ngờ tự đặt giá để đẩy giá',
    'Hàng cấm hoặc nội dung không phù hợp',
    'Lý do khác'
  ],
  user: [
    'Lừa đảo hoặc không giao hàng sau khi thắng',
    'Đặt giá ảo, thắng nhưng không thanh toán',
    'Mạo danh người khác hoặc nhân viên PCBid',
    'Quấy rối, ngôn từ không phù hợp khi nhắn tin',
    'Spam, quảng cáo ngoài sàn',
    'Lý do khác'
  ]
};

// Trạng thái xử lý báo cáo
export const REPORT_STATUS_LABELS = {
  open: 'Chờ xử lý',
  resolved: 'Đã xử lý',
  dismissed: 'Không vi phạm'
};

/**
 * Đọc danh sách báo cáo
 * @returns {Array}
 */
export function getReports() {
  try {
    const list = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Ghi danh sách báo cáo
 * @param {Array} list
 */
function writeReports(list) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(list));
}

/**
 * Số báo cáo đang chờ xử lý
 * @returns {number}
 */
export function getOpenReportCount() {
  return getReports().filter(r => r.status === 'open').length;
}

/**
 * Gửi một báo cáo
 * @param {Object} info
 * @param {'listing'|'user'} info.type - Báo cáo bài đăng hay tài khoản
 * @param {string|number} info.targetId - ID bài đăng hoặc tên đăng nhập bị báo cáo
 * @param {string} info.targetName - Tên hiển thị của đối tượng
 * @param {string} [info.sellerUsername] - Người bán của bài đăng (báo cáo bài đăng)
 * @param {string} info.reason - Lý do chọn trong REPORT_REASONS
 * @param {string} [info.detail] - Mô tả thêm
 * @param {Object} reporter - Người gửi báo cáo
 * @returns {{ok: boolean, error?: string, report?: Object}}
 */
export function submitReport(info, reporter) {
  if (!reporter) return { ok: false, error: 'login' };
  const list = getReports();
  // Một người chỉ có một báo cáo đang chờ xử lý cho cùng một đối tượng
  const duplicate = list.some(r => r.status === 'open' && r.type === info.type
    && String(r.targetId) === String(info.targetId) && r.reporter?.username === reporter.username);
  if (duplicate) return { ok: false, error: 'duplicate' };
  const report = {
    id: `rp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: info.type,
    targetId: info.targetId,
    targetName: info.targetName || String(info.targetId),
    sellerUsername: info.sellerUsername || '',
    reason: info.reason,
    detail: String(info.detail || '').trim(),
    reporter: { username: reporter.username, name: reporter.fullname || reporter.username },
    createdAt: new Date().toISOString(),
    status: 'open'
  };
  list.unshift(report);
  writeReports(list);
  return { ok: true, report };
}

/**
 * Cập nhật kết quả xử lý một báo cáo
 * @param {string} id
 * @param {'resolved'|'dismissed'} status
 * @param {Object} staff
 * @param {string} [note] - Ghi chú cách xử lý
 * @returns {Object|null}
 */
export function resolveReport(id, status, staff, note = '') {
  const list = getReports();
  const report = list.find(r => r.id === id);
  if (!report) return null;
  report.status = status;
  report.handledBy = staffInfo(staff);
  report.handledAt = new Date().toISOString();
  report.note = String(note).trim();
  writeReports(list);
  return report;
}
