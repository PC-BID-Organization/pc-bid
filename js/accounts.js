/* ==========================================================================
   PCBid - Tài khoản demo và tiện ích định danh người dùng dùng chung (accounts.js)
   ==========================================================================
   - Một nguồn duy nhất cho 4 tài khoản demo (trước đây bị chép ở auth.js,
     profile.js và header.js).
   - Avatar mặc định là chữ cái đầu của TÊN (tên gọi cuối cùng), ví dụ
     "Nguyễn Hùng Phong" → "P".
   - UID dùng để phân biệt người dùng thay cho email / tên đăng nhập, vì
     email hay họ tên có thể trùng còn ID tài khoản thì không.
   ========================================================================== */

const STORAGE_KEY_USERS = 'pcbid_registered_users';
const STORAGE_KEY_CURRENT = 'pcbid_currentUser';

/**
 * 4 tài khoản demo gắn với 4 thành viên nhóm (mật khẩu chung 123456)
 * bidder1, bidder2, bidder3: người đấu giá · seller: người bán
 */
export const DEMO_ACCOUNTS = [
  {
    id: 'user_bidder1_demo',
    username: 'bidder1',
    password: '123456',
    lastName: 'Nguyễn Hùng',
    givenName: 'Phong',
    fullname: 'Nguyễn Hùng Phong',
    email: 'bidder1@pcbid.vn',
    phone: '0901234567',
    role: 'bidder',
    verified: true,
    walletBalance: 50000000,
    address: 'Ký túc xá Khu B ĐHQG-HCM, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    rating: 5.0,
    reviewCount: 38,
    pref_sms: true,
    pref_email: true,
    lastUpdated: 'Hôm nay, 14:32',
    gender: 'male',
    birthDate: '2006-10-12',
    bio: 'Sinh viên UIT mê build PC gaming. Thường săn card đồ họa và CPU đời cũ giá tốt để nâng cấp dàn máy.',
    isLoggedIn: true
  },
  {
    id: 'user_bidder2_demo',
    username: 'bidder2',
    password: '123456',
    lastName: 'Nguyễn Nhật',
    givenName: 'Huy',
    fullname: 'Nguyễn Nhật Huy',
    email: 'bidder2@pcbid.vn',
    phone: '0918765432',
    role: 'bidder',
    verified: true,
    walletBalance: 60000000,
    address: 'Ký túc xá Khu A ĐHQG-HCM, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    rating: 4.9,
    reviewCount: 25,
    pref_sms: true,
    pref_email: true,
    lastUpdated: 'Hôm nay, 11:20',
    gender: 'male',
    birthDate: null,
    bio: 'Thích linh kiện tầm trung hiệu năng tốt trên giá thành, ưu tiên hàng còn bảo hành.',
    isLoggedIn: true
  },
  {
    id: 'user_bidder3_demo',
    username: 'bidder3',
    password: '123456',
    lastName: 'Huỳnh Nhật',
    givenName: 'Minh',
    fullname: 'Huỳnh Nhật Minh',
    email: 'bidder3@pcbid.vn',
    phone: '0934567890',
    role: 'bidder',
    verified: true,
    walletBalance: 55000000,
    address: 'Khu phố 6, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
    rating: 4.8,
    reviewCount: 12,
    pref_sms: true,
    pref_email: true,
    lastUpdated: 'Hôm nay, 09:45',
    gender: 'male',
    birthDate: null,
    bio: 'Đang gom linh kiện cho dàn máy làm đồ họa, quan tâm RAM dung lượng lớn và SSD NVMe.',
    isLoggedIn: true
  },
  {
    id: 'user_seller_demo',
    username: 'seller',
    password: '123456',
    lastName: 'Nguyễn Gia',
    givenName: 'Huy',
    fullname: 'Nguyễn Gia Huy',
    email: 'seller@pcbid.vn',
    phone: '0987654321',
    role: 'seller',
    verified: true,
    walletBalance: 80000000,
    address: '45 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh',
    rating: 4.9,
    reviewCount: 124,
    pref_sms: true,
    pref_email: true,
    lastUpdated: 'Hôm nay, 10:15',
    gender: 'male',
    birthDate: null,
    bio: 'Chuyên thanh lý linh kiện PC đã qua kiểm định, cam kết mô tả đúng tình trạng và bao test 7 ngày.',
    isLoggedIn: true
  }
];

// Quyền riêng tư mặc định của hồ sơ công khai: tất cả đều công khai
export const DEFAULT_PRIVACY = { bio: true, selling: true, participating: true, watchlist: true };

/**
 * Lấy cài đặt quyền riêng tư (true = công khai) của người dùng, mặc định công khai
 * @param {Object|null} user - Người dùng
 * @returns {{bio: boolean, selling: boolean, participating: boolean, watchlist: boolean}}
 */
export function getPrivacy(user) {
  return { ...DEFAULT_PRIVACY, ...(user?.privacy || {}) };
}

/**
 * Người đặt giá mẫu (không phải thành viên nhóm) dùng cho lịch sử đặt giá giả lập.
 * Mỗi người có ID cố định để sinh UID, giữ đúng nguyên tắc định danh bằng UID.
 */
export const MOCK_BIDDERS = [
  { id: 'user_mock_7f3a21', username: 'techguru_hcm', fullname: 'Trần Minh Khoa' },
  { id: 'user_mock_2c9b14', username: 'pcbuilder_99', fullname: 'Lê Hoàng Nam' },
  { id: 'user_mock_5e8d47', username: 'gamervn_pro', fullname: 'Phạm Đức Anh' },
  { id: 'user_mock_9a1f63', username: 'hardware_shop', fullname: 'Võ Thanh Tùng' },
  { id: 'user_mock_4b6c28', username: 'ngoc_tech', fullname: 'Đặng Bảo Ngọc' },
  { id: 'user_mock_8d2e95', username: 'viet_pc', fullname: 'Bùi Quốc Việt' },
  { id: 'user_mock_3f7a52', username: 'minhnhat_dng', fullname: 'Ngô Minh Nhật' },
  { id: 'user_mock_6c4b81', username: 'nguon_pc_chat', fullname: 'Phan Gia Bảo' }
];

/**
 * Lấy TÊN (tên gọi) của người dùng: ưu tiên trường givenName,
 * nếu không có thì lấy từ cuối cùng của họ tên (bỏ phần trong ngoặc)
 * @param {Object|string|null} userOrName - Đối tượng người dùng hoặc chuỗi họ tên
 * @returns {string}
 */
export function getGivenName(userOrName) {
  if (!userOrName) return '';
  if (typeof userOrName === 'object' && userOrName.givenName) return String(userOrName.givenName).trim();
  const name = typeof userOrName === 'string'
    ? userOrName
    : (userOrName.fullname || userOrName.username || userOrName.email || '');
  const words = String(name).replace(/\(.*?\)/g, ' ').trim().split(/\s+/).filter(Boolean);
  return words.length ? words[words.length - 1] : '';
}

/**
 * Chữ cái avatar mặc định: chữ đầu tiên của TÊN, viết hoa
 * @param {Object|string|null} userOrName - Đối tượng người dùng hoặc chuỗi họ tên
 * @returns {string}
 */
export function getAvatarInitial(userOrName) {
  const given = getGivenName(userOrName);
  return given ? given.charAt(0).toLocaleUpperCase('vi-VN') : '?';
}

/**
 * UID hiển thị của tài khoản: mã 8 ký tự sinh cố định từ ID tài khoản (hàm băm FNV-1a).
 * Cùng một ID luôn ra cùng một UID; khác ID thì khác UID, không trùng như email / họ tên.
 * @param {Object|string} userOrId - Đối tượng người dùng hoặc ID tài khoản
 * @returns {string} Ví dụ: #PCB-7K2M9QXA
 */
export function getUserUid(userOrId) {
  const id = typeof userOrId === 'object' ? userOrId?.id : userOrId;
  if (!id) return '';
  let hash = 0x811c9dc5;
  for (const ch of String(id)) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // Ghép thêm một vòng băm thứ hai để đủ 8 ký tự base36
  let hash2 = hash;
  for (const ch of String(id).split('').reverse().join('')) {
    hash2 ^= ch.codePointAt(0);
    hash2 = Math.imul(hash2, 0x01000193) >>> 0;
  }
  const code = (hash.toString(36) + hash2.toString(36)).toUpperCase().padStart(8, '0').slice(0, 8);
  return `#PCB-${code}`;
}

/**
 * Che bớt phần giữa UID để giữ riêng tư khi hiển thị công khai
 * @param {string} uid - UID đầy đủ, ví dụ #PCB-7K2M9QXA
 * @returns {string} Ví dụ: #PCB-7K***XA
 */
export function maskUid(uid) {
  if (!uid) return '';
  const match = /^#PCB-(\w+)$/.exec(uid);
  if (!match) return uid;
  const code = match[1];
  return `#PCB-${code.slice(0, 2)}***${code.slice(-2)}`;
}

/**
 * Tìm tài khoản theo ID, tên đăng nhập hoặc email trong tài khoản demo và tài khoản đã đăng ký
 * @param {{id?: string, username?: string, email?: string}} query - Điều kiện tìm
 * @returns {Object|null}
 */
export function findAccount({ id, username, email } = {}) {
  let registered = [];
  try {
    registered = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  } catch {
    registered = [];
  }
  // Ưu tiên bản đã lưu (có ảnh đại diện, tiểu sử, quyền riêng tư người dùng tự cập nhật)
  const all = [...(Array.isArray(registered) ? registered : []), ...DEMO_ACCOUNTS, ...MOCK_BIDDERS];
  if (id) {
    const byId = all.find(u => u.id === id);
    if (byId) return byId;
  }
  if (username) {
    const byName = all.find(u => u.username === username);
    if (byName) return byName;
  }
  if (email) {
    const byEmail = all.find(u => u.email === email);
    if (byEmail) return byEmail;
  }
  return null;
}

/**
 * HTML nội dung avatar: ảnh người dùng tự tải lên nếu có, nếu không là chữ cái đầu của tên
 * @param {Object|string|null} userOrName - Người dùng hoặc tên
 * @param {string} [imgClass] - Class CSS cho thẻ ảnh
 * @returns {string}
 */
export function renderAvatarContent(userOrName, imgClass = 'pcb-avatar-img') {
  const image = typeof userOrName === 'object' ? userOrName?.avatarImage : '';
  if (image && /^data:image\/(png|jpeg|webp);base64,/.test(image)) {
    return `<img src="${image}" alt="" class="${imgClass}">`;
  }
  return getAvatarInitial(userOrName);
}

/**
 * Lưu thay đổi của một tài khoản vào cả phiên đăng nhập hiện tại và danh sách tài khoản đã đăng ký,
 * để người khác xem hồ sơ công khai cũng thấy ảnh đại diện, tiểu sử, quyền riêng tư mới nhất
 * @param {Object} user - Tài khoản đã cập nhật
 */
export function saveAccount(user) {
  if (!user) return;
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY_CURRENT) || 'null');
    if (current && current.id === user.id) {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(user));
      localStorage.setItem('pcbid_user', JSON.stringify(user));
    }
    const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
    const list = Array.isArray(users) ? users : [];
    const index = list.findIndex(u => u.id === user.id || (u.username && u.username === user.username));
    // Danh sách công khai không lưu trạng thái đăng nhập
    const { isLoggedIn, loggedInAt, ...stored } = user;
    if (index >= 0) list[index] = { ...list[index], ...stored };
    else list.push(stored);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(list));
  } catch {
    // Bỏ qua khi localStorage không khả dụng hoặc đầy (ảnh quá lớn)
  }
}

/**
 * Định dạng ngày sinh: chỉ năm (mặc định) hoặc đầy đủ ngày/tháng/năm
 * @param {string|null} birthDate - Ngày sinh dạng YYYY-MM-DD
 * @param {boolean} [full=false] - Hiển thị đầy đủ
 * @returns {string}
 */
export function formatBirthDate(birthDate, full = false) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate || '');
  if (!match) return 'Chưa cập nhật';
  return full ? `${match[3]}/${match[2]}/${match[1]}` : `••/••/${match[1]}`;
}

/**
 * Thông tin hiển thị của người đặt giá trong một lượt bid: họ tên và UID che bớt
 * @param {{bidderId?: string, bidderName?: string, bidderFullname?: string}} bid - Lượt đặt giá
 * @returns {{name: string, uid: string, maskedUid: string}}
 */
export function describeBidder(bid) {
  const account = findAccount({ id: bid?.bidderId, username: bid?.bidderName });
  const name = bid?.bidderFullname || account?.fullname || bid?.bidderName || 'Ẩn danh';
  const uid = getUserUid(bid?.bidderId || account?.id || '');
  return { name, uid, maskedUid: maskUid(uid) };
}

/**
 * Cập nhật tài khoản demo đã lưu từ phiên bản cũ (họ tên mẫu "Nguyễn Văn A"...)
 * sang họ tên thật của thành viên. Giữ nguyên số dư ví và thông tin người dùng đã sửa.
 * @param {Object} user - Tài khoản đã lưu
 * @returns {Object}
 */
function upgradeDemoAccount(user) {
  if (!user) return user;
  const demo = DEMO_ACCOUNTS.find(d => d.username === user.username);
  if (!demo) return user;
  let upgraded = user;
  // Họ tên mẫu cũ ("Nguyễn Văn A"...) đổi sang họ tên thật của thành viên
  if (!user.givenName) {
    upgraded = { ...upgraded, id: demo.id, lastName: demo.lastName, givenName: demo.givenName, fullname: demo.fullname };
  }
  // Bổ sung các trường hồ sơ mới (giới tính, ngày sinh, tiểu sử) nếu bản lưu cũ chưa có
  ['gender', 'birthDate', 'bio'].forEach(key => {
    if (!(key in upgraded)) upgraded = { ...upgraded, [key]: demo[key] };
  });
  return upgraded;
}

// Chạy một lần khi module được nạp: nâng cấp dữ liệu tài khoản demo cũ trong localStorage
try {
  const current = JSON.parse(localStorage.getItem(STORAGE_KEY_CURRENT) || 'null');
  if (current) {
    const upgraded = upgradeDemoAccount(current);
    if (upgraded !== current) {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(upgraded));
      localStorage.setItem('pcbid_user', JSON.stringify(upgraded));
    }
  }
  const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || 'null');
  if (Array.isArray(users)) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users.map(upgradeDemoAccount)));
  }
} catch {
  // Bỏ qua khi localStorage không khả dụng
}
