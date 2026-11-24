/**
 * PCBid - Tập lệnh ứng dụng chính (Core Application Script)
 * Module nạp động thành phần (Component Loader) & Khởi tạo giao diện khung
 */

import { initHeader } from '../components/header/header.js';
// Chuyển đổi ngôn ngữ giao diện (Tiếng Việt / English / 日本語)
import { initI18n } from './i18n.js';

// Dịch ngay khi tải trang để hạn chế nháy chữ tiếng Việt
initI18n();
// Bot mô phỏng người dùng khác đặt giá theo thời gian thực (chạy trên mọi trang)
import { startBotBidding } from './bot-bidder.js';
// Xử lý sau khi phiên kết thúc: người thắng, thanh toán, giao hàng (chạy trên mọi trang)
import { startSettlement } from './settlement.js';
// Hộp chat nổi giữa người mua và người bán
import { initChatWidget } from './chat.js';
// Cụm nút liên hệ nổi: Facebook, Zalo, Gọi điện
import { initContactFloat } from './contact-float.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Nạp đồng thời cả Header và Footer từ tệp HTML thành phần riêng biệt
  await Promise.all([
    loadComponent('#app-header', 'components/header/header.html'),
    loadComponent('#app-footer', 'components/footer/footer.html')
  ]);

  // Sau khi DOM Header đã được chèn vào trang thành công, kích hoạt các sự kiện tương tác
  initHeader();

  // Khởi động bot đặt giá tự động (15 - 60 giây một lượt)
  startBotBidding();

  // Theo dõi phiên vừa kết thúc và các đơn hàng đến hạn
  startSettlement();

  // Hộp chat nổi (chỉ hiện khi đã đăng nhập)
  initChatWidget();

  // Nút liên hệ nổi ở góc phải dưới (mọi trang)
  initContactFloat();
});

/**
 * Nạp mã HTML của thành phần động vào phần tử chỉ định
 * @param {string} selector - Bộ chọn CSS của phần tử chứa (container)
 * @param {string} filePath - Đường dẫn tương đối tới tệp template .html
 */
async function loadComponent(selector, filePath) {
  const container = document.querySelector(selector);
  if (!container) return;

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Không thể nạp tệp ${filePath}: ${response.statusText}`);
    }
    const html = await response.text();
    container.innerHTML = html;
  } catch (error) {
    console.error(`[Lỗi nạp thành phần PCBid]:`, error);
  }
}
