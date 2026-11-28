/* ==========================================================================
   PCBid - Thao tác kiểm duyệt có hộp thoại dùng chung (review-actions.js)
   ==========================================================================
   Gói các thao tác của moderation.js kèm hộp thoại xác nhận / nhập lý do và tin
   nhắn tự động gửi cho người liên quan, để trang Hồ sơ (tab Duyệt bài, Quản lý
   phiên, Báo cáo) và trang Chi tiết phiên dùng chung một cách xử lý.
   Mỗi hàm trả về true nếu thao tác đã được thực hiện (người dùng không hủy).
   ========================================================================== */

import {
  approveListing, requestMoreInfo, rejectListing, submitSellerReply,
  hideListing, unhideListing, removeListing, submitReport, resolveReport,
  getLastStaffNote, getRoleLabel, REPORT_REASONS,
  submitShipment, confirmBranchReceived, SHIPMENT_DEADLINE_MS,
  warnUser, deleteUser, restoreUser, getWarnings, ACCOUNT_VIOLATIONS
} from './moderation.js';
import { showAlert, showConfirm, showFormDialog } from './dialog.js';
import { sendDirectMessage } from './chat.js';
import { openBranchFinder, getBranch, formatBranchAddress } from './branches.js';
import { getDefaultAddress } from './address-book.js';

// Lý do từ chối bài đăng thường gặp
const REJECT_REASONS = [
  'Ảnh không phải ảnh chụp thực tế của linh kiện',
  'Thông tin, thông số không khớp với linh kiện',
  'Không chứng minh được nguồn gốc / có hàng thật',
  'Giá khởi điểm hoặc giá trần bất hợp lý',
  'Linh kiện thuộc danh mục không được phép bán',
  'Lý do khác'
];

/**
 * Thẻ bài đăng gửi kèm tin nhắn
 * @param {Object} product
 * @returns {{id: number, name: string, image: string, price: number}}
 */
function productCard(product) {
  return {
    id: product.id,
    name: product.name,
    image: product.images?.[0] || product.image || '',
    price: product.startingPrice || product.currentBid || 0
  };
}

/**
 * Lời chào kèm vai trò của người gửi
 * @param {Object} staff
 * @returns {string}
 */
function signature(staff) {
  const role = getRoleLabel(staff) || 'Nhân viên';
  return `${role} ${staff.fullname || staff.username}`;
}

/**
 * Duyệt bài đăng: xác nhận rồi chuyển sang PCBid Lab kiểm định, nhắn cho người bán
 * @param {Object} product
 * @param {Object} staff
 * @returns {Promise<boolean>}
 */
export async function confirmApprove(product, staff) {
  const ok = await showConfirm({
    title: 'Duyệt bài đăng?',
    message: `Người bán sẽ có ${Math.round(SHIPMENT_DEADLINE_MS / 86400000)} ngày để gửi "${product.name}" tới chi nhánh kiểm định PCBid. Chi nhánh nhận hàng xong mới kiểm định, đạt thì phiên mở đặt giá và đồng hồ đấu giá bắt đầu chạy.`,
    confirmText: 'Duyệt bài đăng',
    cancelText: 'Để sau',
    tone: 'success'
  });
  if (!ok) return false;
  approveListing(product.id, staff);
  sendDirectMessage(staff, product.seller, {
    text: `Chào bạn, mình là ${signature(staff)}. Bài đăng "${product.name}" đã được duyệt. Bạn vui lòng gửi linh kiện tới chi nhánh kiểm định PCBid gần nhất trong ${Math.round(SHIPMENT_DEADLINE_MS / 86400000)} ngày (nút "Gửi hàng kiểm định" ở mục Quản lý đấu giá → Bán hàng). Chi nhánh nhận hàng và kiểm định đạt là phiên tự mở đặt giá, thời hạn đấu giá tính từ lúc đó nhé.`,
    product: productCard(product)
  });
  await showAlert({ title: 'Đã duyệt bài đăng', message: 'Bài đăng chuyển sang bước "Chờ gửi hàng". Người bán đã nhận được hướng dẫn gửi linh kiện tới chi nhánh kiểm định.', tone: 'success' });
  return true;
}

/**
 * Yêu cầu người bán bổ sung thông tin: nhập nội dung cần bổ sung, gửi kèm tin nhắn
 * @param {Object} product
 * @param {Object} staff
 * @returns {Promise<boolean>}
 */
export async function promptRequestInfo(product, staff) {
  const values = await showFormDialog({
    title: 'Yêu cầu người bán bổ sung',
    message: 'Bài đăng vẫn ở trạng thái chờ duyệt. Người bán sẽ thấy yêu cầu này trong mục Đăng bán và trong tin nhắn.',
    fields: [{
      type: 'textarea',
      name: 'note',
      label: 'Nội dung cần bổ sung',
      placeholder: 'VD: Bổ sung ảnh chụp số serial và tem bảo hành, kèm ảnh chạy Furmark 10 phút.',
      maxlength: 500,
      required: true,
      minlength: 10,
      rows: 4
    }],
    confirmText: 'Gửi yêu cầu'
  });
  if (!values) return false;
  requestMoreInfo(product.id, staff, values.note);
  sendDirectMessage(staff, product.seller, {
    text: `Chào bạn, mình là ${signature(staff)}. Để duyệt bài "${product.name}", bạn vui lòng bổ sung: ${values.note}\nBạn gửi phần bổ sung ở mục Quản lý đấu giá → Đăng bán (nút "Gửi bổ sung") nhé.`,
    product: productCard(product)
  });
  await showAlert({ title: 'Đã gửi yêu cầu', message: 'Người bán đã nhận được yêu cầu bổ sung thông tin.', tone: 'success' });
  return true;
}

/**
 * Từ chối bài đăng: chọn lý do, gửi kèm tin nhắn cho người bán
 * @param {Object} product
 * @param {Object} staff
 * @returns {Promise<boolean>}
 */
export async function promptReject(product, staff) {
  const values = await showFormDialog({
    title: 'Từ chối bài đăng',
    message: `"${product.name}" sẽ không được lên sàn. Người bán có thể chỉnh sửa và đăng lại.`,
    fields: [
      { type: 'radio', name: 'reason', label: 'Lý do từ chối', options: REJECT_REASONS, required: true },
      { type: 'textarea', name: 'detail', label: 'Ghi chú thêm (không bắt buộc)', maxlength: 300 }
    ],
    confirmText: 'Từ chối bài đăng',
    tone: 'danger'
  });
  if (!values) return false;
  const reason = values.detail ? `${values.reason}. ${values.detail}` : values.reason;
  rejectListing(product.id, staff, reason);
  sendDirectMessage(staff, product.seller, {
    text: `Chào bạn, mình là ${signature(staff)}. Rất tiếc bài đăng "${product.name}" chưa được duyệt. Lý do: ${reason}. Bạn có thể chỉnh sửa rồi đăng lại nhé.`,
    product: productCard(product)
  });
  await showAlert({ title: 'Đã từ chối bài đăng', message: 'Người bán đã nhận được lý do từ chối.', tone: 'success' });
  return true;
}

/**
 * Người bán gửi phần bổ sung theo yêu cầu: bài quay lại hàng đợi duyệt
 * @param {Object} product
 * @param {Object} seller
 * @returns {Promise<boolean>}
 */
export async function promptSellerReply(product, seller) {
  const request = getLastStaffNote(product);
  const values = await showFormDialog({
    title: 'Gửi bổ sung cho Kiểm định viên',
    message: request?.note ? `Yêu cầu: ${request.note}` : 'Mô tả thêm thông tin Kiểm định viên cần.',
    fields: [{
      type: 'textarea',
      name: 'reply',
      label: 'Nội dung bổ sung',
      placeholder: 'VD: Số serial 2216xxxx, tem bảo hành còn nguyên. Mình đã gửi ảnh chụp qua tin nhắn.',
      maxlength: 600,
      required: true,
      minlength: 10,
      rows: 4
    }],
    confirmText: 'Gửi bổ sung'
  });
  if (!values) return false;
  submitSellerReply(product.id, seller, values.reply);
  if (request?.by?.username) {
    sendDirectMessage(seller, request.by.username, {
      text: `Mình đã bổ sung cho bài "${product.name}": ${values.reply}`,
      product: productCard(product)
    });
  }
  await showAlert({ title: 'Đã gửi bổ sung', message: 'Bài đăng đã quay lại hàng đợi kiểm duyệt. Bạn sẽ nhận được tin nhắn khi có kết quả.', tone: 'success' });
  return true;
}

/**
 * Quản trị viên ẩn bài đăng khỏi sàn (có thể hiện lại)
 * @param {Object} product
 * @param {Object} staff
 * @returns {Promise<boolean>}
 */
export async function promptHide(product, staff) {
  const values = await showFormDialog({
    title: 'Ẩn bài đăng khỏi sàn',
    message: `"${product.name}" sẽ không còn hiện trên Trang chủ, Sàn đấu giá và không nhận thêm lượt đặt giá cho tới khi được hiện lại.`,
    fields: [{ type: 'textarea', name: 'reason', label: 'Lý do ẩn', maxlength: 300, required: true, placeholder: 'VD: Đang xác minh báo cáo hàng không đúng mô tả.' }],
    confirmText: 'Ẩn bài đăng',
    tone: 'warning'
  });
  if (!values) return false;
  hideListing(product.id, staff, values.reason);
  if (product.seller) {
    sendDirectMessage(staff, product.seller, {
      text: `Chào bạn, mình là ${signature(staff)}. Bài "${product.name}" đang tạm ẩn khỏi sàn. Lý do: ${values.reason}. Bạn cần trao đổi thêm cứ nhắn mình nhé.`,
      product: productCard(product)
    });
  }
  return true;
}

/**
 * Hiện lại bài đăng đã ẩn
 * @param {Object} product
 * @returns {Promise<boolean>}
 */
export async function confirmUnhide(product) {
  const ok = await showConfirm({
    title: 'Hiện lại bài đăng?',
    message: `"${product.name}" sẽ hiện lại trên sàn và tiếp tục nhận đặt giá.`,
    confirmText: 'Hiện lại',
    tone: 'info'
  });
  if (!ok) return false;
  unhideListing(product.id);
  return true;
}

/**
 * Quản trị viên gỡ hẳn bài đăng khỏi sàn
 * @param {Object} product
 * @param {Object} staff
 * @returns {Promise<boolean>}
 */
export async function promptRemove(product, staff) {
  const values = await showFormDialog({
    title: 'Gỡ bài đăng',
    message: `"${product.name}" sẽ bị gỡ vĩnh viễn khỏi sàn và không thể hiện lại. Người bán vẫn thấy lý do gỡ.`,
    fields: [{ type: 'textarea', name: 'reason', label: 'Lý do gỡ', maxlength: 300, required: true, placeholder: 'VD: Xác minh là hàng giả theo báo cáo của người dùng.' }],
    confirmText: 'Gỡ bài đăng',
    tone: 'danger'
  });
  if (!values) return false;
  removeListing(product.id, staff, values.reason);
  if (product.seller) {
    sendDirectMessage(staff, product.seller, {
      text: `Chào bạn, mình là ${signature(staff)}. Bài "${product.name}" đã bị gỡ khỏi sàn. Lý do: ${values.reason}.`,
      product: productCard(product)
    });
  }
  return true;
}

/**
 * Mở hộp thoại báo cáo bài đăng hoặc tài khoản
 * @param {Object} target
 * @param {'listing'|'user'} target.type
 * @param {string|number} target.targetId - ID bài đăng hoặc tên đăng nhập
 * @param {string} target.targetName - Tên hiển thị
 * @param {string} [target.sellerUsername] - Người bán (báo cáo bài đăng)
 * @param {Object|null} reporter - Người đang đăng nhập
 * @returns {Promise<boolean>}
 */
export async function openReportDialog(target, reporter) {
  if (!reporter) {
    const goLogin = await showConfirm({
      title: 'Đăng nhập để báo cáo',
      message: 'Bạn cần đăng nhập để gửi báo cáo tới đội ngũ PCBid.',
      confirmText: 'Đăng nhập',
      cancelText: 'Để sau',
      tone: 'info'
    });
    if (goLogin) {
      const back = `${window.location.pathname.split('/').pop() || 'index.html'}${window.location.search}`;
      window.location.href = `login.html?redirect=${encodeURIComponent(back)}`;
    }
    return false;
  }
  const isListing = target.type === 'listing';
  const values = await showFormDialog({
    title: isListing ? 'Báo cáo bài đăng' : 'Báo cáo tài khoản',
    message: `${isListing ? 'Bài đăng' : 'Tài khoản'}: ${target.targetName}. Báo cáo được gửi tới Quản trị viên và Kiểm định viên PCBid, thông tin người báo cáo được giữ kín.`,
    fields: [
      { type: 'radio', name: 'reason', label: 'Lý do báo cáo', options: REPORT_REASONS[target.type], required: true },
      { type: 'textarea', name: 'detail', label: 'Mô tả thêm (không bắt buộc)', maxlength: 500, placeholder: 'Mô tả chi tiết giúp đội ngũ PCBid xử lý nhanh hơn.' }
    ],
    confirmText: 'Gửi báo cáo',
    tone: 'warning'
  });
  if (!values) return false;
  const result = submitReport({ ...target, reason: values.reason, detail: values.detail }, reporter);
  if (!result.ok && result.error === 'duplicate') {
    await showAlert({ title: 'Bạn đã báo cáo trước đó', message: 'Báo cáo trước của bạn về đối tượng này đang chờ xử lý. Đội ngũ PCBid sẽ xem xét sớm.', tone: 'info' });
    return false;
  }
  await showAlert({ title: 'Đã gửi báo cáo', message: 'Cảm ơn bạn! Quản trị viên và Kiểm định viên PCBid sẽ xem xét báo cáo này.', tone: 'success' });
  return true;
}

/**
 * Đóng một báo cáo: đã xử lý hoặc không vi phạm, kèm ghi chú
 * @param {Object} report
 * @param {'resolved'|'dismissed'} status
 * @param {Object} staff
 * @returns {Promise<boolean>}
 */
export async function promptResolveReport(report, status, staff) {
  const values = await showFormDialog({
    title: status === 'resolved' ? 'Đánh dấu đã xử lý' : 'Kết luận không vi phạm',
    message: `Báo cáo: ${report.reason}`,
    fields: [{ type: 'textarea', name: 'note', label: 'Ghi chú xử lý (không bắt buộc)', maxlength: 300, placeholder: status === 'resolved' ? 'VD: Đã ẩn bài đăng và yêu cầu người bán bổ sung chứng từ.' : 'VD: Đã đối chiếu ảnh và phiếu kiểm định, linh kiện đúng mô tả.' }],
    confirmText: status === 'resolved' ? 'Đã xử lý' : 'Không vi phạm'
  });
  if (!values) return false;
  resolveReport(report.id, status, staff, values.note);
  return true;
}

/**
 * Người bán chọn chi nhánh kiểm định và cách gửi linh kiện
 * @param {Object} product
 * @param {Object} seller
 * @returns {Promise<boolean>}
 */
export async function promptShipToBranch(product, seller) {
  const result = await openBranchFinder({
    mode: 'select',
    productName: product.name,
    defaultAddress: getDefaultAddress(seller)?.address || seller?.address || ''
  });
  if (!result) return false;
  submitShipment(product.id, result);
  const branch = getBranch(result.branchId);
  // Báo cho Kiểm định viên đã duyệt bài biết linh kiện đang trên đường tới chi nhánh
  if (product.reviewedBy?.username) {
    sendDirectMessage(seller, product.reviewedBy.username, {
      text: result.method === 'courier'
        ? `Mình đã gửi "${product.name}" tới ${branch?.name} qua ${result.carrier}, mã vận đơn ${result.trackingCode.toUpperCase()}.`
        : `Mình sẽ mang "${product.name}" trực tiếp tới ${branch?.name} (${formatBranchAddress(branch)}).`,
      product: productCard(product)
    });
  }
  await showAlert({
    title: 'Đã ghi nhận gửi hàng',
    message: `Chi nhánh nhận hàng: ${branch?.name}\n${formatBranchAddress(branch)}\nKhi chi nhánh xác nhận đã nhận, linh kiện được kiểm định và phiên tự mở đặt giá.`,
    tone: 'success'
  });
  return true;
}

/**
 * Nhân viên chi nhánh xác nhận đã nhận linh kiện: bắt đầu kiểm định
 * @param {Object} product
 * @param {Object|null} staff - null khi giả lập bằng nút demo của người bán
 * @returns {Promise<boolean>}
 */
export async function confirmReceived(product, staff = null) {
  const branch = getBranch(product.shipment?.branchId);
  const ok = await showConfirm({
    title: staff ? 'Xác nhận đã nhận hàng?' : 'Giả lập chi nhánh đã nhận hàng?',
    message: `${branch?.name || 'Chi nhánh'} nhận "${product.name}". PCBid Lab bắt đầu kiểm định ngay, đạt thì phiên mở đặt giá và đồng hồ đấu giá bắt đầu chạy.`,
    confirmText: staff ? 'Đã nhận hàng' : 'Giả lập đã nhận',
    tone: 'success'
  });
  if (!ok) return false;
  confirmBranchReceived(product.id, staff);
  if (staff && product.seller) {
    sendDirectMessage(staff, product.seller, {
      text: `Chào bạn, mình là ${signature(staff)}. ${branch?.name || 'Chi nhánh PCBid'} đã nhận "${product.name}" và đang kiểm định. Kiểm định đạt là phiên tự mở đặt giá nhé.`,
      product: productCard(product)
    });
  }
  return true;
}

/**
 * Quản trị viên gửi cảnh báo tới một tài khoản
 * @param {{username: string, fullname?: string}} account
 * @param {Object} staff
 * @returns {Promise<boolean>}
 */
export async function promptWarnUser(account, staff) {
  const count = getWarnings(account.username).length;
  const values = await showFormDialog({
    title: 'Cảnh báo tài khoản',
    message: `${account.fullname || account.username} (@${account.username})${count ? ` đã nhận ${count} cảnh báo trước đó` : ' chưa có cảnh báo nào'}. Người dùng sẽ thấy cảnh báo khi vào PCBid và nhận tin nhắn từ Quản trị viên.`,
    fields: [
      { type: 'radio', name: 'reason', label: 'Hành vi vi phạm', options: ACCOUNT_VIOLATIONS, required: true },
      { type: 'textarea', name: 'detail', label: 'Nội dung cảnh báo (không bắt buộc)', maxlength: 400, placeholder: 'VD: Phiên #1234 bị nhiều người báo cáo ảnh không phải ảnh thật.' }
    ],
    confirmText: 'Gửi cảnh báo',
    tone: 'warning'
  });
  if (!values) return false;
  const reason = values.detail ? `${values.reason}. ${values.detail}` : values.reason;
  warnUser(account.username, staff, reason);
  sendDirectMessage(staff, account.username, {
    text: `[Cảnh báo từ Quản trị viên PCBid] ${reason}. Tài khoản tiếp tục vi phạm có thể bị xóa theo quy chế hoạt động của sàn.`
  });
  await showAlert({ title: 'Đã gửi cảnh báo', message: `Cảnh báo thứ ${count + 1} đã được gửi tới @${account.username}.`, tone: 'success' });
  return true;
}

/**
 * Quản trị viên xóa tài khoản vi phạm (kể cả tài khoản mẫu: bot đặt giá, người bán mẫu)
 * @param {{username: string, fullname?: string}} account
 * @param {Object} staff
 * @param {Array} [listings] - Danh sách phiên trên sàn để gỡ theo phiên của tài khoản
 * @returns {Promise<boolean>}
 */
export async function promptDeleteUser(account, staff, listings = []) {
  const values = await showFormDialog({
    title: 'Xóa tài khoản',
    message: `@${account.username} sẽ không đăng nhập được nữa, các phiên đang đăng / chờ duyệt của tài khoản bị gỡ khỏi sàn. Bạn có thể khôi phục lại ở tab Tài khoản.`,
    fields: [
      { type: 'radio', name: 'reason', label: 'Lý do xóa', options: ACCOUNT_VIOLATIONS, required: true },
      { type: 'textarea', name: 'detail', label: 'Ghi chú (không bắt buộc)', maxlength: 400 }
    ],
    confirmText: 'Xóa tài khoản',
    tone: 'danger'
  });
  if (!values) return false;
  const reason = values.detail ? `${values.reason}. ${values.detail}` : values.reason;
  const removed = deleteUser(account.username, staff, reason, listings);
  await showAlert({ title: 'Đã xóa tài khoản', message: `@${account.username} đã bị xóa${removed ? `, ${removed} bài đăng bị gỡ theo` : ''}.`, tone: 'success' });
  return true;
}

/**
 * Khôi phục tài khoản đã xóa
 * @param {{username: string}} account
 * @returns {Promise<boolean>}
 */
export async function confirmRestoreUser(account) {
  const ok = await showConfirm({
    title: 'Khôi phục tài khoản?',
    message: `@${account.username} đăng nhập lại được, các bài đăng bị gỡ do xóa tài khoản sẽ hiện lại.`,
    confirmText: 'Khôi phục',
    tone: 'info'
  });
  if (!ok) return false;
  restoreUser(account.username);
  return true;
}
