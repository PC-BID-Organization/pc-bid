/* ==========================================================================
   PCBid - Danh sách theo dõi (watchlist.js)
   ==========================================================================
   Dùng chung cho nút bookmark trên thẻ sản phẩm (Trang chủ, Danh sách),
   nút theo dõi ở trang chi tiết và số đếm trên Header:
   - Lưu riêng theo tài khoản: pcbid_watchlist__<tài khoản>
   - Tài khoản demo có sẵn vài phiên mẫu (giống trang Hồ sơ)
   - Mỗi lần thay đổi phát sự kiện pcbid:watchlist-updated để các nơi khác cập nhật
   ========================================================================== */

import { USER_LIST_KEYS, readLoggedInUser, readUserList, writeUserList, isDemoUser } from './user-data.js';
import { getAuctionEndTimestamp } from './auction-time.js';

// Phiên mẫu trong watchlist của tài khoản demo (trang Hồ sơ tự lấy thông tin mới nhất theo ID)
const DEMO_WATCHLIST_IDS = [1012, 2028, 8007, 4013];

/**
 * ID của một mục watchlist (mục có thể là số ID hoặc object đã lưu)
 * @param {number|string|Object} item
 * @returns {number}
 */
function idOf(item) {
  return Number(typeof item === 'object' && item !== null ? item.id : item);
}

/**
 * Danh sách theo dõi của tài khoản
 * @param {Object|null} [user] - Mặc định là người đang đăng nhập
 * @returns {Array}
 */
export function getWatchlist(user = readLoggedInUser()) {
  if (!user) return [];
  return readUserList(USER_LIST_KEYS.WATCHLIST, user, isDemoUser(user) ? DEMO_WATCHLIST_IDS : []);
}

/**
 * Phiên đã có trong danh sách theo dõi chưa
 * @param {number|string} productId
 * @param {Object|null} [user]
 * @returns {boolean}
 */
export function isWatched(productId, user = readLoggedInUser()) {
  return getWatchlist(user).some(item => idOf(item) === Number(productId));
}

/**
 * Thêm / bỏ một phiên khỏi danh sách theo dõi
 * @param {Object} product - Phiên đấu giá (cần id; các trường khác dùng để hiển thị nhanh ở trang Hồ sơ)
 * @param {Object|null} [user]
 * @returns {boolean|null} true: đã thêm, false: đã bỏ, null: chưa đăng nhập
 */
export function toggleWatch(product, user = readLoggedInUser()) {
  if (!user || !product) return null;
  const id = Number(product.id);
  let list = getWatchlist(user);
  const watched = list.some(item => idOf(item) === id);
  if (watched) {
    list = list.filter(item => idOf(item) !== id);
  } else {
    const startPrice = Number(product.currentBid || product.startingPrice) || 0;
    list.unshift({
      id,
      name: product.name,
      category: product.category,
      currentBid: startPrice,
      marketPriceNew: Number(product.marketPriceNew) || Math.round(startPrice * 1.5),
      bidCount: Number(product.bidCount) || 0,
      endTimestamp: getAuctionEndTimestamp(product),
      images: product.images || [],
      specs: Object.values(product.specifications || {}).slice(0, 2).map(String)
    });
  }
  writeUserList(USER_LIST_KEYS.WATCHLIST, user, list);
  window.dispatchEvent(new CustomEvent('pcbid:watchlist-updated', { detail: { id, watched: !watched, count: list.length } }));
  return !watched;
}

/**
 * Cập nhật giao diện một nút bookmark trên thẻ sản phẩm (tô đỏ đầy khi đã theo dõi)
 * @param {HTMLElement} button
 * @param {boolean} watched
 */
export function setWatchButtonState(button, watched) {
  if (!button) return;
  button.classList.toggle('pcb-card__watch--active', watched);
  button.setAttribute('aria-pressed', String(watched));
  button.setAttribute('aria-label', watched ? 'Bỏ theo dõi phiên này' : 'Theo dõi phiên này');
  button.title = watched ? 'Bỏ theo dõi' : 'Theo dõi';
  const svg = button.querySelector('svg');
  if (svg) svg.setAttribute('fill', watched ? 'currentColor' : 'none');
  // Hiệu ứng nảy nhẹ khi vừa lưu
  if (watched) {
    button.classList.add('pcb-card__watch--pop');
    setTimeout(() => button.classList.remove('pcb-card__watch--pop'), 300);
  }
}
