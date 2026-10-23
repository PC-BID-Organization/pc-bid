/**
 * PCBid - Tập lệnh ứng dụng chính (Core Application Script)
 * Module nạp động thành phần (Component Loader) & Khởi tạo giao diện khung
 */

import { initHeader } from '../components/header/header.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Nạp đồng thời cả Header và Footer từ tệp HTML thành phần riêng biệt
  await Promise.all([
    loadComponent('#app-header', 'components/header/header.html'),
    loadComponent('#app-footer', 'components/footer/footer.html')
  ]);

  // Sau khi DOM Header đã được chèn vào trang thành công, kích hoạt các sự kiện tương tác
  initHeader();
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
