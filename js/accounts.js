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
 * Mọi tài khoản đều là thành viên đấu giá; ai cũng có thể đăng bán.
 * Tài khoản "seller" chỉ khác ở chỗ có sẵn các phiên đăng bán mẫu.
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
    role: 'bidder',
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
  },
  {
    id: 'user_admin_demo',
    username: 'admin',
    password: '123456',
    lastName: 'Quản trị viên',
    givenName: 'Admin',
    fullname: 'Quản trị viên (Admin)',
    email: 'admin@pcbid.vn',
    phone: '0999888777',
    role: 'admin',
    verified: true,
    walletBalance: 100000000,
    address: 'Trụ sở Thẩm định PCBid Lab, TP. Thủ Đức, TP. Hồ Chí Minh',
    rating: 5.0,
    reviewCount: 500,
    pref_sms: true,
    pref_email: true,
    lastUpdated: 'Hôm nay, 15:00',
    gender: 'male',
    birthDate: '1995-01-01',
    bio: 'Tài khoản Quản trị viên PCBid. Phụ trách thẩm định nguồn gốc linh kiện, kiểm tra cơ sở có hàng và phê duyệt mở phiên đấu giá.',
    isLoggedIn: true
  }
];

// Quyền riêng tư mặc định của hồ sơ công khai: tất cả đều công khai
// Thông tin liên hệ (email, số điện thoại) mặc định ở chế độ riêng tư
export const DEFAULT_PRIVACY = { bio: true, selling: true, participating: true, watchlist: true, contact: false };

/**
 * Lấy cài đặt quyền riêng tư (true = công khai) của người dùng, mặc định công khai
 * @param {Object|null} user - Người dùng
 * @returns {{bio: boolean, selling: boolean, participating: boolean, watchlist: boolean, contact: boolean}}
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
 * Toàn bộ tài khoản thật: tài khoản đã đăng ký / đã lưu thay đổi, cộng các tài khoản demo
 * chưa từng được lưu lại. Tài khoản demo đã sửa (email, số điện thoại...) dùng bản đã lưu,
 * không còn khớp với thông tin gốc nữa.
 * @returns {Array<Object>}
 */
export function getAllAccounts() {
  let registered = [];
  try {
    registered = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  } catch {
    registered = [];
  }
  const list = Array.isArray(registered) ? registered : [];
  const saved = new Set(list.flatMap(u => [u.id, u.username].filter(Boolean)));
  return [...list, ...DEMO_ACCOUNTS.filter(d => !saved.has(d.id) && !saved.has(d.username))];
}

/**
 * Băm mật khẩu trước khi lưu vào localStorage (mô phỏng phía trình duyệt).
 * Dùng hàm băm FNV-1a hai vòng để không lưu mật khẩu dạng chữ thường;
 * đây KHÔNG phải cơ chế bảo mật thật như bcrypt trên máy chủ.
 * @param {string} password
 * @returns {string} Ví dụ: fnv-1a2b3c4d5e6f7a8b
 */
export function hashPassword(password) {
  const input = `pcbid:${String(password ?? '')}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (const ch of input) {
    const code = ch.codePointAt(0);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ code, 0x5bd1e995) >>> 0;
  }
  return `fnv-${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/**
 * Tài khoản đã có mật khẩu chưa (tài khoản đăng ký từ phiên bản cũ có thể chưa lưu mật khẩu)
 * @param {Object} account
 * @returns {boolean}
 */
export function accountHasPassword(account) {
  return Boolean(account && (account.passwordHash || account.password));
}

/**
 * Kiểm tra mật khẩu nhập vào có khớp với tài khoản không
 * @param {Object} account
 * @param {string} password
 * @returns {boolean}
 */
export function verifyPassword(account, password) {
  if (!account || !password) return false;
  if (account.passwordHash) return account.passwordHash === hashPassword(password);
  // Tài khoản demo dựng sẵn lưu mật khẩu mẫu dạng chữ thường
  return Boolean(account.password) && account.password === password;
}

/**
 * Tạo tên đăng nhập chưa ai dùng từ phần đầu email (ví dụ bidder1 → bidder1_2)
 * @param {string} email
 * @returns {string}
 */
export function makeUniqueUsername(email) {
  const base = String(email || 'user').split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
  const taken = new Set([...getAllAccounts(), ...MOCK_BIDDERS].map(u => u.username));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

/**
 * Chuẩn hóa số điện thoại để so sánh: bỏ khoảng trắng / dấu, đổi +84 / 84 thành 0
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+84')) return `0${digits.slice(3)}`;
  if (/^84\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  return digits;
}

/* ==========================================================================
   KIỂM TRA ĐỊNH DẠNG CHI TIẾT: SỐ ĐIỆN THOẠI VÀ EMAIL
   Trả về câu lỗi cụ thể (sai đầu số, thiếu mấy số, thiếu @...) thay vì báo chung chung.
   partial = true: đang gõ dở nên bỏ qua các lỗi "còn thiếu" để không báo đỏ quá sớm.
   ========================================================================== */

// Đầu số di động Việt Nam đang được các nhà mạng cấp (3 chữ số đầu)
const MOBILE_PREFIXES = new Set([
  '032', '033', '034', '035', '036', '037', '038', '039',
  '052', '055', '056', '058', '059',
  '070', '076', '077', '078', '079',
  '081', '082', '083', '084', '085', '086', '087', '088', '089',
  '090', '091', '092', '093', '094', '095', '096', '097', '098', '099'
]);

/**
 * Kiểm tra định dạng số điện thoại di động Việt Nam (10 chữ số)
 * @param {string} raw - Nội dung người dùng nhập
 * @param {{partial?: boolean}} [opts]
 * @returns {string} Thông báo lỗi, rỗng nếu hợp lệ (hoặc chưa đủ để kết luận khi partial)
 */
export function validatePhoneNumber(raw, { partial = false } = {}) {
  const value = String(raw || '').trim();
  if (!value) return partial ? '' : 'Vui lòng nhập số điện thoại.';
  // Cho phép khoảng trắng, dấu chấm, gạch ngang, ngoặc để tách nhóm số; dấu + chỉ ở đầu
  const badChar = value.replace(/^\+/, '').match(/[^\d\s.\-()]/);
  if (badChar) return `Số điện thoại chỉ được chứa chữ số, không dùng ký tự "${badChar[0]}".`;
  if (value.startsWith('+') && !value.replace(/[\s.\-()]/g, '').startsWith('+84') && value.replace(/[\s.\-()]/g, '').length >= 3) {
    return 'Chỉ hỗ trợ số điện thoại Việt Nam (bắt đầu bằng 0 hoặc +84).';
  }
  const phone = normalizePhone(value);
  if (value.startsWith('+') && phone.startsWith('+')) return ''; // mới gõ "+", "+8"
  if (!phone.startsWith('0')) return 'Số điện thoại phải bắt đầu bằng số 0 (hoặc +84).';
  if (phone.length >= 2) {
    const second = phone[1];
    if (second === '0') return 'Đầu số "00" là mã gọi quốc tế, không phải số di động Việt Nam.';
    if (second === '1') return 'Đầu số "01" (số 11 chữ số) đã ngừng sử dụng từ năm 2018. Hãy dùng đầu số mới, ví dụ 0162 → 032.';
    if (second === '2') return 'Đầu số "02" là số máy bàn cố định. Vui lòng nhập số di động (03, 05, 07, 08, 09).';
    if (second === '4' || second === '6') return `Đầu số "0${second}" không phải đầu số di động Việt Nam (hợp lệ: 03, 05, 07, 08, 09).`;
  }
  if (phone.length >= 3 && !MOBILE_PREFIXES.has(phone.slice(0, 3))) {
    return `Đầu số "${phone.slice(0, 3)}" chưa được nhà mạng nào cấp cho thuê bao di động.`;
  }
  if (phone.length > 10) return `Số điện thoại thừa ${phone.length - 10} chữ số (chỉ gồm 10 chữ số).`;
  if (phone.length < 10 && !partial) return `Số điện thoại còn thiếu ${10 - phone.length} chữ số (cần đủ 10 chữ số).`;
  return '';
}

// Tên miền email hay gõ nhầm → tên miền đúng
const EMAIL_DOMAIN_TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com',
  'gmail.vn': 'gmail.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'hotmial.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com'
};

/**
 * Kiểm tra định dạng địa chỉ email, chỉ ra đúng phần bị sai
 * @param {string} raw
 * @param {{partial?: boolean}} [opts]
 * @returns {string} Thông báo lỗi, rỗng nếu hợp lệ
 */
export function validateEmailAddress(raw, { partial = false } = {}) {
  const value = String(raw || '').trim();
  if (!value) return partial ? '' : 'Vui lòng nhập địa chỉ email.';
  if (/\s/.test(value)) return 'Email không được chứa khoảng trắng.';
  const atCount = (value.match(/@/g) || []).length;
  if (atCount > 1) return 'Email chỉ được có một ký tự "@".';
  if (atCount === 0) return partial ? '' : 'Email thiếu ký tự "@" (ví dụ: ten@example.com).';
  const [local, domain] = value.split('@');
  if (!local) return 'Thiếu phần tên trước ký tự "@" (ví dụ: ten@example.com).';
  const badLocal = local.match(/[^A-Za-z0-9._%+-]/);
  if (badLocal) return `Phần trước "@" chứa ký tự không hợp lệ "${badLocal[0]}" (chỉ dùng chữ không dấu, số và . _ % + -).`;
  if (local.startsWith('.') || local.endsWith('.')) return 'Phần trước "@" không được bắt đầu hoặc kết thúc bằng dấu chấm.';
  if (local.includes('..')) return 'Phần trước "@" không được có hai dấu chấm liền nhau.';
  if (!domain) return partial ? '' : 'Thiếu tên miền sau ký tự "@" (ví dụ: gmail.com).';
  const badDomain = domain.match(/[^A-Za-z0-9.-]/);
  if (badDomain) return `Tên miền chứa ký tự không hợp lệ "${badDomain[0]}" (chỉ dùng chữ không dấu, số, dấu chấm và gạch ngang).`;
  if (domain.startsWith('.') || domain.startsWith('-')) return 'Tên miền không được bắt đầu bằng dấu chấm hoặc gạch ngang.';
  if (domain.includes('..')) return 'Tên miền không được có hai dấu chấm liền nhau.';
  if (!domain.includes('.')) return partial ? '' : 'Tên miền thiếu phần đuôi (ví dụ: .com, .vn).';
  if (domain.endsWith('.')) return partial ? '' : 'Tên miền thiếu phần đuôi sau dấu chấm (ví dụ: .com, .vn).';
  const tld = domain.split('.').pop();
  if (!/^[A-Za-z]{2,}$/.test(tld)) {
    if (partial && /^[A-Za-z]$/.test(tld)) return '';
    return 'Đuôi tên miền phải gồm ít nhất 2 chữ cái (ví dụ: .com, .vn).';
  }
  const fix = EMAIL_DOMAIN_TYPOS[domain.toLowerCase()];
  if (fix && !partial) return `Tên miền "${domain}" có vẻ bị gõ nhầm. Có phải bạn muốn nhập "${local}@${fix}"?`;
  return '';
}

/**
 * Kiểm tra email / số điện thoại đã được tài khoản khác sử dụng chưa
 * @param {Object} query
 * @param {string} [query.email]
 * @param {string} [query.phone]
 * @param {Object} [query.exclude] - Tài khoản đang sửa (bỏ qua chính nó)
 * @returns {{field:'email'|'phone', account:Object}|null}
 */
export function findAccountConflict({ email, phone, exclude } = {}) {
  const isSelf = u => exclude && ((exclude.id && u.id === exclude.id) || (exclude.username && u.username === exclude.username));
  const others = getAllAccounts().filter(u => !isSelf(u));
  const mail = String(email || '').trim().toLowerCase();
  if (mail) {
    const byEmail = others.find(u => String(u.email || '').trim().toLowerCase() === mail);
    if (byEmail) return { field: 'email', account: byEmail };
  }
  const tel = normalizePhone(phone);
  if (tel) {
    const byPhone = others.find(u => normalizePhone(u.phone) === tel);
    if (byPhone) return { field: 'phone', account: byPhone };
  }
  return null;
}

/**
 * Tìm tài khoản theo ID, tên đăng nhập hoặc email trong tài khoản demo và tài khoản đã đăng ký
 * @param {{id?: string, username?: string, email?: string}} query - Điều kiện tìm
 * @returns {Object|null}
 */
export function findAccount({ id, username, email } = {}) {
  // Ưu tiên bản đã lưu (có ảnh đại diện, tiểu sử, email / số điện thoại người dùng tự cập nhật)
  const all = [...getAllAccounts(), ...MOCK_BIDDERS];
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
    if (index >= 0) {
      list[index] = { ...list[index], ...stored };
      // Đã có mật khẩu băm (đổi mật khẩu): bỏ mật khẩu mẫu dạng chữ thường của tài khoản demo
      if (stored.passwordHash) delete list[index].password;
    }
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
  // Hợp nhất vai trò: không còn tách "người bán", mọi tài khoản đều là thành viên đấu giá
  if (user.role === 'seller') user = { ...user, role: 'bidder' };
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

/* ==========================================================================
   TÊN ĐĂNG NHẬP (USERNAME): KIỂM TRA VÀ ĐỔI TÊN
   ========================================================================== */

// 3 - 20 ký tự: chữ thường không dấu, số, dấu chấm hoặc gạch dưới; không bắt đầu / kết thúc bằng dấu
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/;

// Các trường dữ liệu lưu tên đăng nhập của người dùng (người bán, người đặt giá, người mua...)
const USERNAME_FIELDS = ['seller', 'bidderName', 'sellerUsername', 'buyerUsername', 'winner', 'highestBidder', 'username'];

/**
 * Tài khoản demo dựng sẵn: dữ liệu mẫu gắn với tên đăng nhập nên không cho đổi
 * @param {Object} user
 * @returns {boolean}
 */
export function isDemoAccount(user) {
  return DEMO_ACCOUNTS.some(d => d.id === user?.id || d.username === user?.username);
}

/**
 * Kiểm tra tên đăng nhập mới
 * @param {string} name - Tên muốn dùng
 * @param {Object} [exclude] - Tài khoản hiện tại (bỏ qua khi kiểm tra trùng)
 * @param {{partial?: boolean}} [opts] - partial = true khi đang gõ dở (bỏ qua lỗi thiếu ký tự / trùng tên)
 * @returns {string} Thông báo lỗi, chuỗi rỗng nếu hợp lệ
 */
export function validateUsername(name, exclude, { partial = false } = {}) {
  const value = String(name || '').trim().toLowerCase();
  if (!value) return partial ? '' : 'Vui lòng nhập tên đăng nhập.';
  if (/\s/.test(value)) return 'Tên đăng nhập không được chứa khoảng trắng.';
  if (value.includes('@')) return 'Tên đăng nhập không được chứa ký tự @.';
  const badChar = value.match(/[^a-z0-9._]/);
  if (badChar) {
    const ch = badChar[0];
    // Chữ có dấu: gợi ý chữ không dấu tương ứng (ư → u, đ → d)
    const plain = ch === 'đ' ? 'd' : ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/^[a-z]$/.test(plain)) return `Chữ "${ch}" có dấu, hãy dùng chữ không dấu "${plain}".`;
    return `Ký tự "${ch}" không được phép. Chỉ dùng chữ thường không dấu, số, dấu chấm (.) hoặc gạch dưới (_).`;
  }
  if (/^[._]/.test(value)) return 'Tên đăng nhập phải bắt đầu bằng chữ cái hoặc số, không phải dấu chấm / gạch dưới.';
  if (/[._]{2,}/.test(value)) return 'Không dùng hai dấu chấm / gạch dưới liền nhau.';
  if (value.length > 20) return `Tên đăng nhập dài quá ${value.length - 20} ký tự (tối đa 20).`;
  // Đang gõ dở: chưa báo lỗi kết thúc bằng dấu / thiếu ký tự (người dùng có thể đang gõ tiếp)
  if (partial && (/[._]$/.test(value) || value.length < 3)) return '';
  if (/[._]$/.test(value)) return 'Tên đăng nhập phải kết thúc bằng chữ cái hoặc số, không phải dấu chấm / gạch dưới.';
  if (value.length < 3) return `Tên đăng nhập còn thiếu ${3 - value.length} ký tự (tối thiểu 3 ký tự).`;
  if (!USERNAME_PATTERN.test(value)) return 'Chỉ dùng chữ thường không dấu, số, dấu chấm hoặc gạch dưới; không bắt đầu / kết thúc bằng dấu.';
  const isSelf = u => exclude && ((exclude.id && u.id === exclude.id) || u.username === exclude.username);
  const taken = [...getAllAccounts(), ...MOCK_BIDDERS].some(u => !isSelf(u) && String(u.username || '').toLowerCase() === value);
  if (taken) return `Tên đăng nhập "@${value}" đã có người sử dụng.`;
  // Không trùng email của tài khoản khác để ô đăng nhập "Tên đăng nhập / Email" không bị nhập nhằng
  const asEmail = getAllAccounts().some(u => !isSelf(u) && String(u.email || '').toLowerCase() === value);
  if (asEmail) return `Tên đăng nhập "@${value}" đã có người sử dụng.`;
  return '';
}

/**
 * Thay giá trị tên đăng nhập cũ bằng tên mới trong một cấu trúc dữ liệu bất kỳ (đệ quy)
 * @param {*} data
 * @param {string} oldName
 * @param {string} newName
 * @returns {boolean} true nếu có thay đổi
 */
function replaceUsernameDeep(data, oldName, newName) {
  let changed = false;
  if (Array.isArray(data)) {
    data.forEach(item => { if (replaceUsernameDeep(item, oldName, newName)) changed = true; });
  } else if (data && typeof data === 'object') {
    Object.keys(data).forEach(key => {
      if (USERNAME_FIELDS.includes(key) && data[key] === oldName) {
        data[key] = newName;
        changed = true;
      } else if (data[key] && typeof data[key] === 'object') {
        if (replaceUsernameDeep(data[key], oldName, newName)) changed = true;
      }
    });
  }
  return changed;
}

/**
 * Chuyển toàn bộ dữ liệu của tài khoản sang tên đăng nhập mới:
 * - Đổi tên các key cá nhân dạng pcbid_xxx__<tên cũ> (watchlist, đăng bán, địa chỉ, thông báo đã đọc...)
 * - Cập nhật tên trong phiên đấu giá, lượt đặt giá, cuộc trò chuyện, đơn hàng và sổ ví
 * Danh sách tài khoản (pcbid_registered_users) được cập nhật riêng qua saveAccount.
 * @param {string} oldName
 * @param {string} newName
 */
export function migrateUsername(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return;
  const suffix = `__${oldName}`;
  Object.keys(localStorage).forEach(key => {
    if (!key.startsWith('pcbid_')) return;
    // Key cá nhân của tài khoản: chuyển sang key mới
    if (key.endsWith(suffix)) {
      const newKey = `${key.slice(0, -suffix.length)}__${newName}`;
      if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, localStorage.getItem(key));
      localStorage.removeItem(key);
      return;
    }
    if (key === STORAGE_KEY_USERS || key === STORAGE_KEY_CURRENT || key === 'pcbid_user') return;
    // Dữ liệu dùng chung: thay tên trong các trường lưu tên đăng nhập
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data && typeof data === 'object' && replaceUsernameDeep(data, oldName, newName)) {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch {
      // Giá trị không phải JSON: bỏ qua
    }
  });
}
