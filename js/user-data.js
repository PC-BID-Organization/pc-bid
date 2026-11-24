/* ==========================================================================
   PCBid - Tiện ích lưu dữ liệu riêng theo từng tài khoản (user-data.js)
   ==========================================================================
   Các danh sách cá nhân (watchlist, phiên đã đăng bán) được lưu theo key
   có hậu tố tên tài khoản, ví dụ: pcbid_watchlist__bidder1.
   Nhờ đó tài khoản mới đăng ký bắt đầu với danh sách trống, không dùng chung
   dữ liệu với tài khoản demo hay tài khoản khác trên cùng trình duyệt.
   ========================================================================== */

// Các key gốc của danh sách cá nhân
export const USER_LIST_KEYS = {
  WATCHLIST: 'pcbid_watchlist',
  SELLING: 'pcbid_my_auctions_selling',
  // Danh sách ID thông báo đã đọc của từng tài khoản
  NOTIFICATIONS_READ: 'pcbid_notifications_read'
};

// Các tài khoản demo dựng sẵn được nạp dữ liệu mẫu ở lần đầu
export const DEMO_USERNAMES = ['bidder1', 'bidder2', 'bidder3', 'seller'];

/**
 * Đọc người dùng đang đăng nhập từ localStorage
 * @returns {Object|null}
 */
export function readLoggedInUser() {
  try {
    const user = JSON.parse(localStorage.getItem('pcbid_currentUser') || 'null');
    if (!user || user.isLoggedIn === false) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Lấy định danh duy nhất của tài khoản để ghép vào key localStorage
 * @param {Object|null} user - Người dùng
 * @returns {string}
 */
export function getUserKey(user) {
  return (user && (user.username || user.email || user.id)) || 'guest';
}

/**
 * Kiểm tra tài khoản có phải tài khoản demo dựng sẵn không
 * @param {Object|null} user - Người dùng
 * @returns {boolean}
 */
export function isDemoUser(user) {
  return DEMO_USERNAMES.includes(user?.username);
}

/**
 * Tạo key localStorage riêng cho tài khoản
 * @param {string} baseKey - Key gốc (ví dụ: pcbid_watchlist)
 * @param {Object|null} user - Người dùng
 * @returns {string}
 */
export function userStorageKey(baseKey, user) {
  return `${baseKey}__${getUserKey(user)}`;
}

/**
 * Đọc danh sách cá nhân của tài khoản.
 * Nếu tài khoản chưa có dữ liệu: ghi danh sách khởi tạo (seed) rồi trả về.
 * @param {string} baseKey - Key gốc
 * @param {Object|null} user - Người dùng
 * @param {Array} [seed=[]] - Danh sách khởi tạo cho lần đầu
 * @returns {Array}
 */
export function readUserList(baseKey, user, seed = []) {
  const key = userStorageKey(baseKey, user);
  const raw = localStorage.getItem(key);
  if (raw === null) {
    const initial = Array.isArray(seed) ? seed.map(item => (typeof item === 'object' ? { ...item } : item)) : [];
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Ghi danh sách cá nhân của tài khoản
 * @param {string} baseKey - Key gốc
 * @param {Object|null} user - Người dùng
 * @param {Array} list - Danh sách cần lưu
 */
export function writeUserList(baseKey, user, list) {
  localStorage.setItem(userStorageKey(baseKey, user), JSON.stringify(Array.isArray(list) ? list : []));
}
