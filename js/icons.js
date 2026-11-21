/* ==========================================================================
   PCBid - Hiển thị icon giao diện theo bộ Lucide (https://lucide.dev/icons/)
   ==========================================================================
   Các icon Lucide (giấy phép ISC) được lưu thành tệp SVG riêng trong thư mục
   images/icons/lucide/ giống các icon khác của dự án. Để icon tự đổi màu theo
   chữ (currentColor), CSS dùng tệp SVG làm mặt nạ (mask-image) cho một thẻ
   <span>, xem phần "ICON LUCIDE" trong css/style.css.
   Hàm icon() chỉ sinh thẻ <span> với class tương ứng, không chứa nét vẽ.
   ========================================================================== */

// Các kích thước icon có sẵn class CSS (px)
const ICON_SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 40];

/**
 * Trả về HTML của một icon Lucide
 * @param {string} name - Tên icon Lucide, trùng tên tệp trong images/icons/lucide/ (ví dụ 'pin', 'trash-2')
 * @param {Object} [options]
 * @param {number} [options.size=16] - Kích thước (px), làm tròn về kích thước có sẵn gần nhất
 * @param {string} [options.className=''] - Lớp CSS bổ sung
 * @param {boolean} [options.filled=false] - Bản tô kín (hiện có cho icon trái tim)
 * @returns {string}
 */
export function icon(name, { size = 16, className = '', filled = false } = {}) {
  const fileName = filled ? `${name}-filled` : name;
  const nearest = ICON_SIZES.reduce((best, s) => (Math.abs(s - size) < Math.abs(best - size) ? s : best), 16);
  return `<span class="lucide pcb-icon pcb-icon--${fileName} pcb-icon--s${nearest}${className ? ` ${className}` : ''}" aria-hidden="true"></span>`;
}

// Icon theo loại thông báo (dùng chung cho bảng thông báo nhanh và trang thông báo)
export const NOTIFY_ICON_NAMES = { danger: 'triangle-alert', warning: 'clock', success: 'trophy', muted: 'bell' };
