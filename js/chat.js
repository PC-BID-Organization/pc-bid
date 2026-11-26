/* ==========================================================================
   PCBid - Chat giữa người mua và người bán (chat.js)
   ==========================================================================
   Mô phỏng nhắn tin hoàn toàn trên trình duyệt (localStorage: pcbid_chats):
   - Mỗi cuộc trò chuyện là một cặp người mua - người bán. Sản phẩm đang trao
     đổi được gửi thành tin nhắn dạng thẻ "Bạn đang trao đổi với Người bán về
     sản phẩm này".
   - Giao diện 2 cột: bên trái danh sách (tìm theo tên, lọc Tất cả / Đã ghim /
     Chưa đọc, menu ba chấm: ghim, đánh dấu đã đọc / chưa đọc, xóa đoạn chat),
     bên phải khung tin nhắn của cuộc trò chuyện đang chọn.
   - Ô nhập có nút "+" (Hình ảnh, Video, Sản phẩm, Đơn hàng) và bảng biểu tượng
     cảm xúc. Ảnh được nén trước khi lưu, video giới hạn dung lượng vì bộ nhớ
     trình duyệt có hạn.
   - Phía bên kia không phải tài khoản thật (người bán trong catalog / người
     dùng mẫu) tự trả lời sau vài giây. Hai tài khoản thật nhắn qua lại khi lần
     lượt đăng nhập.
   ========================================================================== */

import { findAccount, renderAvatarContent } from './accounts.js';
import { readLoggedInUser } from './user-data.js';
import { isSameUser, readOrders } from './wallet.js';
import { loadAllAuctions } from './bid-history.js';
import { isAuctionClosed } from './auction-time.js';
import { ORDER_STATUS_LABELS } from './settlement.js';
import { showAlert, showConfirm } from './dialog.js';
// Bộ icon Lucide dùng chung
import { icon } from './icons.js';
// Vai trò Quản trị viên / Kiểm định viên để hiện thẻ vai trò nổi bật
import { getStaffRole, ROLE_LABELS } from './moderation.js';

const CHATS_KEY = 'pcbid_chats';
// Thời gian phía bên kia "đang soạn tin" trước khi tự trả lời
const AUTO_REPLY_MIN_MS = 1500;
const AUTO_REPLY_MAX_MS = 3500;
// Giới hạn tệp gửi kèm (bộ nhớ localStorage chỉ khoảng 5MB)
const MAX_IMAGE_SIDE = 720;
const MAX_VIDEO_BYTES = 1.5 * 1024 * 1024;

// Biểu tượng chat dùng chung cho mọi nút nhắn tin trên website
export const CHAT_ICON_SVG = icon('message-square', { className: 'pcb-chat-icon' });

// Câu hỏi gợi ý cho tin nhắn đầu tiên
const QUICK_QUESTIONS = [
  'Linh kiện còn bảo hành không ạ?',
  'Mình có được test trước khi nhận không?',
  'Phí giao hàng thế nào ạ?',
  'Có kèm hộp và phụ kiện không?'
];

// Biểu tượng cảm xúc cơ bản
const EMOJIS = ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😅', '😢', '😭', '😡', '😮', '🥰', '🙏',
  '👍', '👎', '👌', '👏', '🙌', '💪', '🤝', '👋', '❤️', '🔥', '🎉', '✅', '❌', '⭐', '💯', '💸'];

// Trạng thái giao diện hộp chat trên trang hiện tại
const state = { open: false, activeId: null, search: '', filter: 'all', menuId: null, popover: null };

/* ==========================================================================
   DỮ LIỆU
   ========================================================================== */

/**
 * Khóa định danh người dùng
 * @param {Object} user
 * @returns {string}
 */
function userKey(user) {
  return user?.id || user?.username || '';
}

/**
 * Đọc toàn bộ cuộc trò chuyện (tự chuyển dữ liệu cũ dạng "mỗi sản phẩm một cuộc" sang "mỗi cặp một cuộc")
 * @returns {Array}
 */
function readChats() {
  let list;
  try {
    list = JSON.parse(localStorage.getItem(CHATS_KEY) || '[]');
  } catch {
    list = [];
  }
  if (!Array.isArray(list)) return [];
  if (!list.some(c => !c.pair)) return list;

  // Gộp các cuộc trò chuyện cũ cùng người mua - người bán thành một cuộc
  const merged = new Map();
  list.forEach(c => {
    const id = c.pair ? c.id : `chat_${c.sellerUsername}__${c.buyerId || c.buyerUsername}`;
    const messages = (c.messages || []).map(m => ({ type: 'text', ...m }));
    if (!c.pair && c.productId) {
      // Thẻ sản phẩm đặt trước tin nhắn đầu tiên của cuộc cũ
      const first = messages[0]?.timestamp || c.updatedAt;
      messages.unshift({ id: `ctx_${c.productId}`, type: 'product', from: 'buyer', auto: true, timestamp: first,
        product: { id: c.productId, name: c.productName, image: c.productImage } });
    }
    const prev = merged.get(id);
    if (prev) {
      prev.messages = [...prev.messages, ...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      if (new Date(c.updatedAt) > new Date(prev.updatedAt)) prev.updatedAt = c.updatedAt;
    } else {
      merged.set(id, { ...c, id, pair: true, messages, pinnedBy: c.pinnedBy || {}, deletedFor: c.deletedFor || {}, manualUnread: c.manualUnread || {} });
    }
  });
  const result = [...merged.values()];
  writeChats(result);
  return result;
}

/**
 * Ghi danh sách cuộc trò chuyện
 * @param {Array} list
 * @returns {boolean} false khi bộ nhớ trình duyệt đầy
 */
function writeChats(list) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/**
 * Cập nhật một cuộc trò chuyện
 * @param {string} id
 * @param {Function} updater
 * @returns {boolean}
 */
function updateChat(id, updater) {
  const list = readChats();
  const index = list.findIndex(c => c.id === id);
  if (index < 0) return false;
  list[index] = updater({ ...list[index] });
  return writeChats(list);
}

/**
 * Mã hóa ký tự HTML đặc biệt
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/**
 * Định dạng tiền Việt Nam
 * @param {number} value
 * @returns {string}
 */
function formatVnd(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('vi-VN')}đ`;
}

/**
 * Tài khoản thật (thành viên demo / tài khoản đã đăng ký), không phải người dùng mẫu
 * @param {Object|null} account
 * @returns {boolean}
 */
function isRealAccount(account) {
  return Boolean(account) && !String(account.id || '').startsWith('user_mock_');
}

/**
 * Vai trò của người dùng trong cuộc trò chuyện
 * @param {Object} chat
 * @param {Object} user
 * @returns {'buyer'|'seller'|null}
 */
function roleOf(chat, user) {
  if (!user) return null;
  if (isSameUser(user, chat.buyerId, chat.buyerUsername)) return 'buyer';
  if (user.username && user.username === chat.sellerUsername) return 'seller';
  return null;
}

/**
 * Thông tin bên còn lại của cuộc trò chuyện (tên + tài khoản để lấy avatar thật)
 * @param {Object} chat
 * @param {'buyer'|'seller'} role - Vai trò của người đang xem
 * @returns {{name:string, account:Object|null, username:string, label:string}}
 */
function counterpartOf(chat, role) {
  const account = role === 'buyer'
    ? findAccount({ username: chat.sellerUsername })
    : findAccount({ id: chat.buyerId, username: chat.buyerUsername });
  // Tài khoản Quản trị viên / Kiểm định viên: nhãn vai trò thay cho Người bán / Người mua
  const staffRole = getStaffRole(account);
  const tradeLabel = role === 'buyer' ? 'Người bán' : 'Người mua';
  const label = staffRole ? `${ROLE_LABELS[staffRole]} PCBid` : (hasTradeContext(chat) ? tradeLabel : 'Thành viên PCBid');
  if (role === 'buyer') {
    return { name: account?.fullname || chat.sellerName, account, username: chat.sellerUsername, label, staffRole };
  }
  return { name: account?.fullname || chat.buyerName, account, username: chat.buyerUsername, label, staffRole };
}

/**
 * Thẻ vai trò nổi bật cho tài khoản Quản trị viên / Kiểm định viên
 * @param {'admin'|'inspector'|null} staffRole
 * @param {boolean} [compact] - Bản nhỏ (danh sách hội thoại)
 * @returns {string}
 */
function roleBadgeHtml(staffRole, compact = false) {
  if (!staffRole) return '';
  return `<span class="pcb-chat__role-badge pcb-chat__role-badge--${staffRole}${compact ? ' pcb-chat__role-badge--compact' : ''}">${icon('shield-check', { size: compact ? 11 : 12 })}${ROLE_LABELS[staffRole]}</span>`;
}

/**
 * Cuộc trò chuyện có gắn sản phẩm / đơn hàng chưa (mở từ trang phiên hoặc đơn hàng).
 * Nhắn trực tiếp từ hồ sơ công khai thì chưa có, khi đó hai bên chỉ là thành viên với nhau.
 * @param {Object} chat
 * @returns {boolean}
 */
function hasTradeContext(chat) {
  return chat.messages.some(m => m.type === 'product' || m.type === 'order');
}

/**
 * HTML avatar (ảnh thật nếu tài khoản đã đặt, ngược lại chữ cái đầu của tên)
 * @param {Object} person - Kết quả counterpartOf
 * @param {string} [extraClass]
 * @returns {string}
 */
function avatarHtml(person, extraClass = '') {
  const content = renderAvatarContent(person.account || person.name, 'pcb-chat__avatar-img');
  return `<span class="pcb-chat__avatar ${extraClass}" aria-hidden="true">${content.startsWith('<img') ? content : escapeHtml(content)}</span>`;
}

/**
 * Tin nhắn hiển thị với người dùng (bỏ các tin trước thời điểm người đó xóa đoạn chat)
 * @param {Object} chat
 * @param {Object} user
 * @returns {Array}
 */
function visibleMessages(chat, user) {
  const deletedAt = new Date(chat.deletedFor?.[userKey(user)] || 0).getTime();
  return chat.messages.filter(m => new Date(m.timestamp).getTime() > deletedAt);
}

/**
 * Số tin chưa đọc của người dùng trong một cuộc trò chuyện
 * @param {Object} chat
 * @param {Object} user
 * @returns {number}
 */
function unreadCount(chat, user) {
  const role = roleOf(chat, user);
  if (!role) return 0;
  const lastRead = new Date(chat.lastRead?.[userKey(user)] || 0).getTime();
  const count = visibleMessages(chat, user).filter(m => m.from !== role && !m.auto && new Date(m.timestamp).getTime() > lastRead).length;
  // Người dùng tự đánh dấu "chưa đọc": luôn tính ít nhất 1
  return chat.manualUnread?.[userKey(user)] ? Math.max(1, count) : count;
}

/**
 * Thời gian hiển thị ngắn gọn: giờ:phút nếu trong ngày, ngược lại ngày/tháng
 * @param {string} iso
 * @returns {string}
 */
function formatTime(iso) {
  const date = new Date(iso);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

/**
 * Nội dung xem trước của tin nhắn trong danh sách
 * @param {Object} m
 * @returns {string}
 */
function previewText(m) {
  if (m.type === 'image') return '[Hình ảnh]';
  if (m.type === 'video') return '[Video]';
  if (m.type === 'product') return `[Sản phẩm] ${m.product?.name || ''}`;
  if (m.type === 'order') return `[Đơn hàng] ${m.order?.productName || ''}`;
  return m.text || '';
}

/**
 * Câu trả lời tự động của người bán theo nội dung / loại tin nhắn
 * @param {Object} message - Tin nhắn của người mua
 * @param {Object} chat
 * @returns {string}
 */
function buildSellerReply(message, chat) {
  if (message.type === 'image') return 'Mình đã nhận được ảnh, để mình kiểm tra rồi phản hồi bạn ngay nhé.';
  if (message.type === 'video') return 'Cảm ơn bạn đã gửi video, mình xem rồi báo lại bạn nhé.';
  if (message.type === 'product') return `${message.product?.name || 'Sản phẩm này'} vẫn đang đấu giá trên sàn. Bạn cần hỏi gì về sản phẩm cứ nhắn mình nhé!`;
  if (message.type === 'order') return 'Mình đã thấy đơn hàng của bạn. Có vấn đề gì về thanh toán hay giao hàng bạn cứ báo mình nhé.';
  const q = String(message.text || '').toLowerCase();
  if (/bảo hành|bh\b/.test(q)) return 'Linh kiện vẫn còn bảo hành hãng bạn nhé. Ngoài ra PCBid bao test 7 ngày, lỗi do nhà sản xuất là mình đổi hoặc hoàn tiền.';
  if (/test|kiểm tra|thử/.test(q)) return 'Bạn được kiểm tra hàng khi nhận ạ. Mình đã stress test trước khi đăng, kết quả có trong phần thông số. Nhận hàng lỗi cứ báo mình trong 7 ngày.';
  if (/ship|giao|vận chuyển|phí|cod/.test(q)) return 'Mình giao toàn quốc qua GHTK, phí khoảng 30.000 - 50.000đ tùy khu vực. Nội thành TP.HCM có thể giao trong ngày sau khi bạn thanh toán trên sàn.';
  if (/giá|bớt|giảm|fix/.test(q)) return 'Giá được quyết định theo phiên đấu giá nên mình không bớt ngoài sàn được bạn nhé. Bạn cứ đặt giá, chúc bạn may mắn!';
  if (/hộp|box|phụ kiện|full/.test(q)) return 'Linh kiện kèm đầy đủ phụ kiện như mô tả, hộp còn nhưng hơi móp góc. Bạn xem thêm ở mục "Mô tả người bán" nhé.';
  if (/còn|hàng không|có sẵn/.test(q)) return 'Hàng vẫn còn bạn nhé, phiên đang diễn ra trên sàn.';
  if (/ảnh|hình|video/.test(q)) return 'Ảnh trên phiên là ảnh chụp thực tế. Bạn cần thêm góc nào mình chụp gửi bạn sau nhé.';
  if (/chào|hello|hi\b|alo|shop ơi/.test(q)) return `Chào bạn 👋 Mình là ${chat.sellerName}. Bạn cần hỏi gì cứ nhắn mình nhé!`;
  if (/cảm ơn|thanks|ok/.test(q)) return 'Dạ không có gì ạ, cần gì bạn cứ nhắn mình nhé! 😊';
  return 'Cảm ơn bạn đã nhắn tin. Mình sẽ trả lời chi tiết sớm nhất, bạn cần thêm thông tin gì cứ nhắn nhé!';
}

/**
 * Câu trả lời tự động của người mua (người dùng mẫu) khi người bán nhắn
 * @param {Object} message
 * @returns {string}
 */
function buildBuyerReply(message) {
  if (message.type !== 'text') return 'Dạ mình xem rồi ạ, cảm ơn shop!';
  const q = String(message.text || '').toLowerCase();
  if (/giao|ship|gửi/.test(q)) return 'Dạ vâng, mình cảm ơn shop. Nhận được hàng mình sẽ xác nhận trên sàn ngay ạ.';
  if (/thanh toán|chuyển/.test(q)) return 'Mình thanh toán qua ví PCBid rồi nha shop.';
  return 'Dạ mình nhận được tin rồi ạ, cảm ơn shop nhiều!';
}

/**
 * Lấy hoặc tạo cuộc trò chuyện giữa một người mua và một người bán
 * @param {Object} info - { sellerUsername, buyer, product }
 * @returns {Object|null}
 */
function ensureChat({ sellerUsername, buyer, product }) {
  if (!buyer || !sellerUsername) return null;
  const id = `chat_${sellerUsername}__${userKey(buyer)}`;
  const list = readChats();
  let chat = list.find(c => c.id === id);
  if (!chat) {
    const seller = findAccount({ username: sellerUsername });
    chat = {
      id,
      pair: true,
      sellerUsername,
      sellerName: seller?.fullname || sellerUsername,
      sellerReal: isRealAccount(seller),
      buyerId: buyer.id || null,
      buyerUsername: buyer.username || '',
      buyerName: buyer.fullname || buyer.name || buyer.username || 'Người mua',
      buyerReal: isRealAccount(findAccount({ id: buyer.id, username: buyer.username })),
      messages: [],
      lastRead: {},
      pinnedBy: {},
      deletedFor: {},
      manualUnread: {},
      updatedAt: new Date().toISOString()
    };
    list.unshift(chat);
  }
  // Mở chat từ trang một sản phẩm: thêm thẻ "đang trao đổi về sản phẩm này" nếu chưa phải sản phẩm gần nhất
  if (product) {
    const lastProduct = [...chat.messages].reverse().find(m => m.type === 'product');
    if (!lastProduct || Number(lastProduct.product?.id) !== Number(product.id)) {
      const now = new Date().toISOString();
      chat.messages = [...chat.messages, { id: `msg_${Date.now()}`, type: 'product', from: roleOf(chat, readLoggedInUser()) || 'buyer', auto: true, timestamp: now, product }];
      chat.updatedAt = now;
    }
  }
  const index = list.findIndex(c => c.id === id);
  list[index] = chat;
  writeChats(list);
  return chat;
}

/**
 * Gửi một tin nhắn của người dùng hiện tại
 * @param {string} chatId
 * @param {Object} message - { type, text?, media?, product?, order? }
 */
async function sendMessage(chatId, message) {
  const user = readLoggedInUser();
  if (!user) return;
  const ok = updateChat(chatId, chat => {
    const role = roleOf(chat, user);
    if (!role) return chat;
    const now = new Date().toISOString();
    const full = { id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, from: role, timestamp: now, ...message };
    chat.messages = [...chat.messages, full];
    chat.lastRead = { ...chat.lastRead, [userKey(user)]: now };
    chat.manualUnread = { ...chat.manualUnread, [userKey(user)]: false };
    chat.updatedAt = now;
    // Phía bên kia không phải tài khoản thật: hẹn giờ tự trả lời
    const counterpartReal = role === 'buyer' ? chat.sellerReal : chat.buyerReal;
    if (!counterpartReal) {
      chat.pendingReplyAt = Date.now() + AUTO_REPLY_MIN_MS + Math.random() * (AUTO_REPLY_MAX_MS - AUTO_REPLY_MIN_MS);
      chat.pendingReplyFor = { type: full.type, text: full.text, product: full.product };
      chat.pendingReplyFrom = role === 'buyer' ? 'seller' : 'buyer';
    }
    return chat;
  });
  if (!ok) {
    await showAlert({ title: 'Bộ nhớ trình duyệt đã đầy', message: 'Không thể lưu tin nhắn này. Hãy xóa bớt các đoạn chat có ảnh / video cũ rồi thử lại.', tone: 'warning' });
  }
  renderChat();
}

/**
 * Xử lý các câu trả lời tự động đến hạn (chạy định kỳ, kể cả sau khi chuyển trang)
 */
function processAutoReplies() {
  const now = Date.now();
  let changed = false;
  const list = readChats().map(chat => {
    if (!chat.pendingReplyAt || chat.pendingReplyAt > now) return chat;
    changed = true;
    const source = { type: 'text', ...chat.pendingReplyFor };
    const text = chat.pendingReplyFrom === 'seller' ? buildSellerReply(source, chat) : buildBuyerReply(source);
    const timestamp = new Date().toISOString();
    return {
      ...chat,
      messages: [...chat.messages, { id: `msg_${now}`, type: 'text', from: chat.pendingReplyFrom, text, timestamp }],
      pendingReplyAt: null,
      pendingReplyFor: null,
      updatedAt: timestamp
    };
  });
  if (changed) {
    writeChats(list);
    renderChat();
  }
}

/**
 * Đánh dấu đã đọc / chưa đọc cho người dùng hiện tại
 * @param {string} chatId
 * @param {boolean} read
 */
function setRead(chatId, read) {
  const user = readLoggedInUser();
  if (!user) return;
  updateChat(chatId, c => ({
    ...c,
    lastRead: read ? { ...c.lastRead, [userKey(user)]: new Date().toISOString() } : c.lastRead,
    manualUnread: { ...c.manualUnread, [userKey(user)]: !read }
  }));
}

/**
 * Các cuộc trò chuyện của người dùng (đã ghim lên trước, rồi mới nhất trước)
 * @param {Object} user
 * @returns {Array}
 */
function getUserChats(user) {
  const key = userKey(user);
  return readChats()
    .filter(c => roleOf(c, user))
    // Đoạn chat đã xóa chỉ hiện lại khi có tin nhắn mới
    .filter(c => !c.deletedFor?.[key] || visibleMessages(c, user).length > 0 || c.id === state.activeId)
    .sort((a, b) => (Boolean(b.pinnedBy?.[key]) - Boolean(a.pinnedBy?.[key]))
      || (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
}

/**
 * Tổng số tin nhắn chưa đọc của người dùng
 * @param {Object} user
 * @returns {number}
 */
export function getUnreadChatCount(user) {
  return user ? getUserChats(user).reduce((sum, c) => sum + unreadCount(c, user), 0) : 0;
}

/* ==========================================================================
   TỆP GỬI KÈM
   ========================================================================== */

/**
 * Nén ảnh về cạnh dài tối đa MAX_IMAGE_SIDE, xuất JPEG để lưu gọn
 * @param {File} file
 * @returns {Promise<string>} Data URL
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => reject(new Error('Không đọc được ảnh'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Không đọc được tệp'));
    reader.readAsDataURL(file);
  });
}

/**
 * Đọc tệp video thành data URL
 * @param {File} file
 * @returns {Promise<string>}
 */
function readVideo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không đọc được tệp'));
    reader.readAsDataURL(file);
  });
}

/**
 * Xử lý tệp người dùng chọn từ hộp thoại mở tệp
 * @param {File} file
 * @param {'image'|'video'} kind
 */
async function handleFile(file, kind) {
  if (!file || !state.activeId) return;
  try {
    if (kind === 'image') {
      if (!file.type.startsWith('image/')) throw new Error('Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP...).');
      await sendMessage(state.activeId, { type: 'image', media: await compressImage(file) });
    } else {
      if (!file.type.startsWith('video/')) throw new Error('Vui lòng chọn tệp video (MP4, WEBM...).');
      if (file.size > MAX_VIDEO_BYTES) {
        throw new Error(`Video tối đa ${(MAX_VIDEO_BYTES / 1024 / 1024).toFixed(1)}MB vì bản mô phỏng lưu tin nhắn trong bộ nhớ trình duyệt. Hãy chọn video ngắn hơn.`);
      }
      await sendMessage(state.activeId, { type: 'video', media: await readVideo(file) });
    }
  } catch (e) {
    await showAlert({ title: 'Không gửi được tệp', message: e.message, tone: 'warning' });
  }
}

/* ==========================================================================
   GIAO DIỆN
   ========================================================================== */

/**
 * Tạo khung HTML hộp chat (một lần mỗi trang)
 */
function ensureWidget() {
  if (document.getElementById('pcb-chat')) return;
  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'pcb-chat-launcher';
  launcher.id = 'pcb-chat-launcher';
  launcher.setAttribute('aria-label', 'Mở tin nhắn');
  launcher.setAttribute('aria-controls', 'pcb-chat');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML = `${icon('message-square', { size: 22 })}
    <span class="pcb-chat-launcher__text">Tin nhắn</span>
    <span class="pcb-chat-launcher__badge" id="pcb-chat-badge" hidden>0</span>`;

  const panel = document.createElement('section');
  panel.className = 'pcb-chat';
  panel.id = 'pcb-chat';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Tin nhắn');
  panel.hidden = true;
  panel.innerHTML = `
    <!-- Cột trái: danh sách cuộc trò chuyện -->
    <aside class="pcb-chat__sidebar" aria-label="Danh sách cuộc trò chuyện">
      <header class="pcb-chat__side-head">
        <strong class="pcb-chat__side-title">Tin nhắn <span class="pcb-chat__side-count" id="pcb-chat-unread"></span></strong>
        <button type="button" class="pcb-chat__icon-btn pcb-chat__close-mobile" data-chat-close aria-label="Đóng tin nhắn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </header>
      <div class="pcb-chat__tools">
        <label class="pcb-chat__search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <span class="pcb-chat__sr">Tìm cuộc trò chuyện theo tên</span>
          <input type="search" id="pcb-chat-search" placeholder="Tìm theo tên" autocomplete="off">
        </label>
        <label class="pcb-chat__sr" for="pcb-chat-filter">Phân loại cuộc trò chuyện</label>
        <select class="pcb-chat__filter" id="pcb-chat-filter">
          <option value="all">Tất cả</option>
          <option value="pinned">Đã ghim</option>
          <option value="unread">Chưa đọc</option>
        </select>
      </div>
      <div class="pcb-chat__list-wrap" id="pcb-chat-list"></div>
    </aside>

    <!-- Cột phải: tin nhắn của cuộc trò chuyện đang chọn -->
    <div class="pcb-chat__main">
      <header class="pcb-chat__header">
        <button type="button" class="pcb-chat__icon-btn pcb-chat__back" data-chat-back aria-label="Quay lại danh sách">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div class="pcb-chat__peer" id="pcb-chat-peer"></div>
        <button type="button" class="pcb-chat__icon-btn" data-chat-close aria-label="Đóng tin nhắn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </header>
      <div class="pcb-chat__thread" id="pcb-chat-thread" aria-live="polite"></div>
      <div class="pcb-chat__popover" id="pcb-chat-popover" hidden></div>
      <form class="pcb-chat__form" id="pcb-chat-form">
        <button type="button" class="pcb-chat__tool-btn" data-chat-toggle="attach" aria-label="Gửi kèm hình ảnh, video, sản phẩm, đơn hàng" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <label class="pcb-chat__sr" for="pcb-chat-input">Nội dung tin nhắn</label>
        <input type="text" class="pcb-chat__input" id="pcb-chat-input" maxlength="500" placeholder="Nhập tin nhắn..." autocomplete="off">
        <button type="button" class="pcb-chat__tool-btn" data-chat-toggle="emoji" aria-label="Chèn biểu tượng cảm xúc" aria-expanded="false">
          ${icon('smile-plus', { size: 20 })}
        </button>
        <button type="submit" class="pcb-chat__send" aria-label="Gửi tin nhắn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </form>
      <input type="file" id="pcb-chat-file-image" accept="image/*" hidden>
      <input type="file" id="pcb-chat-file-video" accept="video/*" hidden>
    </div>
  `;
  // Khung nhắc đăng nhập dành cho khách chưa đăng nhập bấm nút Tin nhắn
  const guest = document.createElement('section');
  guest.className = 'pcb-chat-guest';
  guest.id = 'pcb-chat-guest';
  guest.setAttribute('role', 'dialog');
  guest.setAttribute('aria-labelledby', 'pcb-chat-guest-title');
  guest.hidden = true;
  guest.innerHTML = `
    <button type="button" class="pcb-chat__icon-btn pcb-chat-guest__close" data-chat-close aria-label="Đóng">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
    <span class="pcb-chat-guest__icon">${icon('message-square', { size: 26 })}</span>
    <h2 class="pcb-chat-guest__title" id="pcb-chat-guest-title">Đăng nhập để gửi tin nhắn</h2>
    <p class="pcb-chat-guest__text">Trao đổi trực tiếp với người bán về tình trạng linh kiện, bảo hành và cách giao hàng.</p>
    <a class="pcb-chat-guest__login" id="pcb-chat-guest-login" href="login.html">Đăng nhập</a>
    <p class="pcb-chat-guest__alt">Chưa có tài khoản? <a href="register.html">Đăng ký</a></p>
  `;

  document.body.append(launcher, panel, guest);
  bindWidgetEvents(launcher, panel);
  guest.addEventListener('click', e => {
    if (e.target.closest('[data-chat-close]')) closeChat();
  });
  // Bấm ra ngoài khung nhắc đăng nhập thì đóng lại
  document.addEventListener('click', e => {
    if (!guest.hidden && !guest.contains(e.target) && !launcher.contains(e.target)) closeChat();
  });
}

/**
 * Gắn toàn bộ sự kiện của hộp chat (ủy quyền sự kiện trên khung)
 * @param {HTMLElement} launcher
 * @param {HTMLElement} panel
 */
function bindWidgetEvents(launcher, panel) {
  launcher.addEventListener('click', () => (state.open ? closeChat() : openPanel()));

  panel.addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('[data-chat-close]')) return closeChat();
    if (t.closest('[data-chat-back]')) {
      state.activeId = null;
      state.popover = null;
      return renderChat();
    }

    // Menu ba chấm của một cuộc trò chuyện
    const moreBtn = t.closest('[data-chat-more]');
    if (moreBtn) {
      e.stopPropagation();
      state.menuId = state.menuId === moreBtn.dataset.chatMore ? null : moreBtn.dataset.chatMore;
      return renderList();
    }
    const menuAction = t.closest('[data-chat-menu]');
    if (menuAction) return handleMenuAction(menuAction.dataset.chatMenu, menuAction.dataset.chatTarget);

    const item = t.closest('[data-chat-id]');
    if (item) {
      state.activeId = item.dataset.chatId;
      state.menuId = null;
      state.popover = null;
      setRead(state.activeId, true);
      renderChat();
      document.getElementById('pcb-chat-input')?.focus();
      return;
    }

    // Mở / đóng bảng "+" và bảng biểu tượng cảm xúc
    const toggle = t.closest('[data-chat-toggle]');
    if (toggle) {
      state.popover = state.popover === toggle.dataset.chatToggle ? null : toggle.dataset.chatToggle;
      return renderPopover();
    }
    const emoji = t.closest('[data-chat-emoji]');
    if (emoji) return insertEmoji(emoji.dataset.chatEmoji);

    const attach = t.closest('[data-chat-attach]');
    if (attach) {
      const kind = attach.dataset.chatAttach;
      if (kind === 'image' || kind === 'video') {
        state.popover = null;
        renderPopover();
        document.getElementById(`pcb-chat-file-${kind}`)?.click();
      } else {
        state.popover = kind;
        renderPopover();
      }
      return;
    }
    const pickProduct = t.closest('[data-chat-pick-product]');
    if (pickProduct && state.activeId) {
      state.popover = null;
      renderPopover();
      return sendMessage(state.activeId, { type: 'product', product: JSON.parse(pickProduct.dataset.chatPickProduct) });
    }
    const pickOrder = t.closest('[data-chat-pick-order]');
    if (pickOrder && state.activeId) {
      state.popover = null;
      renderPopover();
      return sendMessage(state.activeId, { type: 'order', order: JSON.parse(pickOrder.dataset.chatPickOrder) });
    }
    const quick = t.closest('[data-chat-quick]');
    if (quick && state.activeId) return sendMessage(state.activeId, { type: 'text', text: quick.dataset.chatQuick });

    // Bấm ra ngoài menu / bảng nổi thì đóng lại
    if (state.menuId && !t.closest('.pcb-chat__menu')) {
      state.menuId = null;
      renderList();
    }
    if (state.popover && !t.closest('.pcb-chat__popover')) {
      state.popover = null;
      renderPopover();
    }
  });

  panel.querySelector('#pcb-chat-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('pcb-chat-input');
    const text = input.value.trim();
    if (state.activeId && text) {
      sendMessage(state.activeId, { type: 'text', text: text.slice(0, 500) });
      input.value = '';
      input.focus();
    }
  });
  panel.querySelector('#pcb-chat-search').addEventListener('input', e => {
    state.search = e.target.value;
    renderList();
  });
  panel.querySelector('#pcb-chat-filter').addEventListener('change', e => {
    state.filter = e.target.value;
    renderList();
  });
  ['image', 'video'].forEach(kind => {
    const input = panel.querySelector(`#pcb-chat-file-${kind}`);
    input.addEventListener('change', () => {
      handleFile(input.files[0], kind);
      input.value = '';
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !state.open || document.querySelector('.pcb-dialog')) return;
    if (state.popover || state.menuId) {
      state.popover = null;
      state.menuId = null;
      renderChat();
    } else {
      closeChat();
    }
  });
}

/**
 * Chèn biểu tượng cảm xúc vào vị trí con trỏ trong ô nhập
 * @param {string} emoji
 */
function insertEmoji(emoji) {
  const input = document.getElementById('pcb-chat-input');
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, start)}${emoji}${input.value.slice(end)}`;
  input.focus();
  input.setSelectionRange(start + emoji.length, start + emoji.length);
}

/**
 * Xử lý lựa chọn trong menu ba chấm
 * @param {string} action - pin | unpin | read | unread | delete
 * @param {string} chatId
 */
async function handleMenuAction(action, chatId) {
  const user = readLoggedInUser();
  if (!user) return;
  const key = userKey(user);
  state.menuId = null;
  if (action === 'pin' || action === 'unpin') {
    updateChat(chatId, c => ({ ...c, pinnedBy: { ...c.pinnedBy, [key]: action === 'pin' } }));
  } else if (action === 'read' || action === 'unread') {
    setRead(chatId, action === 'read');
  } else if (action === 'delete') {
    const ok = await showConfirm({
      title: 'Xóa đoạn chat?',
      message: 'Toàn bộ tin nhắn hiện có sẽ bị xóa khỏi hộp thư của bạn. Bên kia vẫn giữ tin nhắn của họ.',
      confirmText: 'Xóa đoạn chat',
      cancelText: 'Hủy',
      tone: 'danger'
    });
    if (!ok) return renderChat();
    updateChat(chatId, c => ({ ...c, deletedFor: { ...c.deletedFor, [key]: new Date().toISOString() }, pinnedBy: { ...c.pinnedBy, [key]: false }, manualUnread: { ...c.manualUnread, [key]: false } }));
    if (state.activeId === chatId) state.activeId = null;
  }
  renderChat();
}

/**
 * Mở khung chat
 */
function openPanel() {
  state.open = true;
  renderChat();
}

/**
 * Đóng khung chat
 */
function closeChat() {
  state.open = false;
  state.popover = null;
  state.menuId = null;
  renderChat();
  document.getElementById('pcb-chat-launcher')?.focus();
}

/**
 * Vẽ cột danh sách cuộc trò chuyện
 */
function renderList() {
  const wrap = document.getElementById('pcb-chat-list');
  const user = readLoggedInUser();
  if (!wrap || !user) return;
  const key = userKey(user);
  const keyword = state.search.trim().toLowerCase();
  const chats = getUserChats(user).filter(chat => {
    const peer = counterpartOf(chat, roleOf(chat, user));
    if (keyword && !`${peer.name} ${peer.username}`.toLowerCase().includes(keyword)) return false;
    if (state.filter === 'pinned') return Boolean(chat.pinnedBy?.[key]);
    if (state.filter === 'unread') return unreadCount(chat, user) > 0;
    return true;
  });

  if (!chats.length) {
    const empty = keyword || state.filter !== 'all'
      ? 'Không có cuộc trò chuyện phù hợp.'
      : 'Chưa có cuộc trò chuyện nào.<br>Bấm "Liên hệ người bán" ở trang chi tiết phiên để bắt đầu.';
    wrap.innerHTML = `<p class="pcb-chat__empty">${empty}</p>`;
    return;
  }

  wrap.innerHTML = `<ul class="pcb-chat__list">${chats.map(chat => {
    const role = roleOf(chat, user);
    const peer = counterpartOf(chat, role);
    const messages = visibleMessages(chat, user);
    const last = messages[messages.length - 1];
    const unread = unreadCount(chat, user);
    const pinned = Boolean(chat.pinnedBy?.[key]);
    const menuOpen = state.menuId === chat.id;
    return `
      <li class="pcb-chat__item${chat.id === state.activeId ? ' pcb-chat__item--active' : ''}${unread ? ' pcb-chat__item--unread' : ''}">
        <button type="button" class="pcb-chat__item-main" data-chat-id="${chat.id}">
          ${avatarHtml(peer)}
          <span class="pcb-chat__item-body">
            <span class="pcb-chat__item-top">
              <span class="pcb-chat__item-name">${pinned ? `<span class="pcb-chat__pin" title="Đã ghim">${icon('pin', { size: 12 })}<span class="pcb-chat__sr">Đã ghim</span></span>` : ''}${escapeHtml(peer.name)}</span>
              <span class="pcb-chat__item-time">${last ? formatTime(last.timestamp) : ''}</span>
            </span>
            <span class="pcb-chat__item-role">${peer.staffRole ? roleBadgeHtml(peer.staffRole, true) : peer.label}</span>
            <span class="pcb-chat__item-last">${last ? escapeHtml((last.from === role ? 'Bạn: ' : '') + previewText(last)) : 'Chưa có tin nhắn'}</span>
          </span>
          ${unread ? `<span class="pcb-chat__item-badge">${unread}</span>` : ''}
        </button>
        <button type="button" class="pcb-chat__more" data-chat-more="${chat.id}" aria-label="Tùy chọn cuộc trò chuyện" aria-haspopup="true" aria-expanded="${menuOpen}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
        </button>
        ${menuOpen ? `
          <div class="pcb-chat__menu" role="menu">
            <button type="button" role="menuitem" data-chat-menu="${pinned ? 'unpin' : 'pin'}" data-chat-target="${chat.id}">${icon(pinned ? 'pin-off' : 'pin')} ${pinned ? 'Bỏ ghim' : 'Ghim cuộc trò chuyện'}</button>
            ${unread
              ? `<button type="button" role="menuitem" data-chat-menu="read" data-chat-target="${chat.id}">${icon('check-check')} Đánh dấu đã đọc</button>`
              : `<button type="button" role="menuitem" data-chat-menu="unread" data-chat-target="${chat.id}">${icon('mail')} Đánh dấu chưa đọc</button>`}
            <button type="button" role="menuitem" class="pcb-chat__menu-danger" data-chat-menu="delete" data-chat-target="${chat.id}">${icon('trash-2')} Xóa đoạn chat</button>
          </div>` : ''}
      </li>
    `;
  }).join('')}</ul>`;
}

/**
 * HTML một tin nhắn theo loại
 * @param {Object} m - Tin nhắn
 * @param {'buyer'|'seller'} role - Vai trò người xem
 * @returns {string}
 */
function renderMessageContent(m, role) {
  if (m.type === 'image') {
    return `<a class="pcb-chat__media" href="${escapeHtml(m.media)}" target="_blank" rel="noopener"><img src="${escapeHtml(m.media)}" alt="Hình ảnh đã gửi" loading="lazy"></a>`;
  }
  if (m.type === 'video') {
    return `<video class="pcb-chat__media pcb-chat__media--video" src="${escapeHtml(m.media)}" controls preload="metadata"></video>`;
  }
  if (m.type === 'product') {
    const p = m.product || {};
    const label = m.context === 'review'
      ? 'Bài đăng đang được đội ngũ PCBid kiểm duyệt'
      : (role === 'buyer' ? 'Bạn đang trao đổi với Người bán về sản phẩm này' : 'Người mua đang trao đổi với bạn về sản phẩm này');
    return `
      <div class="pcb-chat__card">
        <span class="pcb-chat__card-label">${label}</span>
        <a class="pcb-chat__card-body" href="product-detail.html?id=${Number(p.id)}">
          <img src="${escapeHtml(p.image || 'images/placeholder-product.svg')}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
          <span class="pcb-chat__card-info">
            <span class="pcb-chat__card-name">${escapeHtml(p.name)}</span>
            ${p.price ? `<span class="pcb-chat__card-price">${formatVnd(p.price)}</span>` : ''}
          </span>
        </a>
      </div>`;
  }
  if (m.type === 'order') {
    const o = m.order || {};
    return `
      <div class="pcb-chat__card">
        <span class="pcb-chat__card-label">Đơn hàng · ${escapeHtml(ORDER_STATUS_LABELS[o.status] || '')}</span>
        <a class="pcb-chat__card-body" href="product-detail.html?id=${Number(o.productId)}">
          <img src="${escapeHtml(o.image || 'images/placeholder-product.svg')}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
          <span class="pcb-chat__card-info">
            <span class="pcb-chat__card-name">${escapeHtml(o.productName)}</span>
            <span class="pcb-chat__card-price">${formatVnd(o.finalPrice)}</span>
          </span>
        </a>
      </div>`;
  }
  return renderTextBubble(m.text);
}

// Nhận diện một emoji (kể cả emoji ghép bằng ZWJ, có biến thể màu da hoặc ký tự biến thể FE0F)
const EMOJI_PATTERN = /\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*/gu;

/**
 * Bong bóng tin nhắn chữ.
 * - Tin chỉ toàn emoji: hiện cỡ to, không có nền bong bóng (giống Messenger) để emoji đỏ / cam không chìm vào nền cam
 * - Tin có cả chữ và emoji: bọc từng emoji để thêm viền sáng, vẫn nhìn rõ trên bong bóng cam
 * @param {string} text - Nội dung tin nhắn
 * @returns {string}
 */
function renderTextBubble(text) {
  const raw = String(text || '');
  const emojis = raw.match(EMOJI_PATTERN) || [];
  const onlyEmoji = emojis.length > 0 && raw.replace(EMOJI_PATTERN, '').replace(/[\s️‍]/g, '') === '';
  if (onlyEmoji) {
    const size = emojis.length <= 3 ? 'pcb-chat__bubble--emoji-lg' : '';
    return `<p class="pcb-chat__bubble pcb-chat__bubble--emoji ${size}">${escapeHtml(raw)}</p>`;
  }
  const html = escapeHtml(raw).replace(EMOJI_PATTERN, e => `<span class="pcb-chat__emoji">${e}</span>`);
  return `<p class="pcb-chat__bubble">${html}</p>`;
}

/**
 * Vẽ cột tin nhắn của cuộc trò chuyện đang chọn
 */
function renderThread() {
  const thread = document.getElementById('pcb-chat-thread');
  const peerEl = document.getElementById('pcb-chat-peer');
  const form = document.getElementById('pcb-chat-form');
  const user = readLoggedInUser();
  if (!thread || !user) return;
  const chat = state.activeId ? readChats().find(c => c.id === state.activeId && roleOf(c, user)) : null;
  form.hidden = !chat;

  if (!chat) {
    state.activeId = null;
    peerEl.innerHTML = '<strong class="pcb-chat__peer-name">Tin nhắn</strong>';
    thread.innerHTML = `<div class="pcb-chat__placeholder">${icon('message-square', { size: 40 })}<p>Chọn một cuộc trò chuyện ở bên trái để xem tin nhắn.</p></div>`;
    return;
  }

  const role = roleOf(chat, user);
  const peer = counterpartOf(chat, role);
  peerEl.innerHTML = `
    ${avatarHtml(peer, 'pcb-chat__avatar--sm')}
    <span class="pcb-chat__peer-info">
      <a class="pcb-chat__peer-name" href="profile.html?user=${encodeURIComponent(peer.username)}">${escapeHtml(peer.name)}</a>
      <span class="pcb-chat__peer-role">${peer.staffRole ? roleBadgeHtml(peer.staffRole) : peer.label}</span>
    </span>
  `;

  const messages = visibleMessages(chat, user);
  const hasMine = messages.some(m => m.from === role && m.type === 'text');
  thread.innerHTML = `
    ${peer.staffRole ? `
      <p class="pcb-chat__staff-note pcb-chat__staff-note--${peer.staffRole}">
        ${icon('shield-check', { size: 14 })}
        <span>${escapeHtml(peer.name)} là <strong>${ROLE_LABELS[peer.staffRole]}</strong> chính thức của PCBid. Nhân viên PCBid không bao giờ yêu cầu bạn chuyển tiền ngoài sàn.</span>
      </p>` : ''}
    <div class="pcb-chat__messages">
      ${messages.length ? '' : `<p class="pcb-chat__hint">Hãy hỏi ${role === 'buyer' ? 'người bán' : 'người mua'} về tình trạng linh kiện, bảo hành hoặc giao hàng.</p>`}
      ${messages.map((m, i) => {
        const mine = m.from === role;
        // Avatar của bên kia hiện ở tin đầu tiên trong một chuỗi tin liên tiếp
        const showAvatar = !mine && (i === 0 || messages[i - 1].from !== m.from);
        return `
          <div class="pcb-chat__msg${mine ? ' pcb-chat__msg--mine' : ''}${m.type !== 'text' ? ' pcb-chat__msg--rich' : ''}">
            ${mine ? '' : (showAvatar ? avatarHtml(peer, 'pcb-chat__avatar--xs') : '<span class="pcb-chat__avatar-gap"></span>')}
            <div class="pcb-chat__msg-col">
              ${renderMessageContent(m, role)}
              <span class="pcb-chat__msg-time">${formatTime(m.timestamp)}</span>
            </div>
          </div>`;
      }).join('')}
      ${chat.pendingReplyAt ? `<div class="pcb-chat__msg">${avatarHtml(peer, 'pcb-chat__avatar--xs')}<div class="pcb-chat__typing" aria-label="Đang soạn tin"><span></span><span></span><span></span></div></div>` : ''}
    </div>
    ${role === 'buyer' && !hasMine && hasTradeContext(chat) ? `<div class="pcb-chat__quick">${QUICK_QUESTIONS.map(q => `<button type="button" class="pcb-chat__quick-btn" data-chat-quick="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('')}</div>` : ''}
  `;
  const list = thread.querySelector('.pcb-chat__messages');
  if (list) list.scrollTop = list.scrollHeight;
  // Đang mở cuộc trò chuyện: tin mới được tính là đã đọc
  if (unreadCount(chat, user) && !chat.manualUnread?.[userKey(user)]) setRead(chat.id, true);
}

/**
 * Vẽ bảng nổi phía trên ô nhập: "+", biểu tượng cảm xúc, chọn sản phẩm, chọn đơn hàng
 */
async function renderPopover() {
  const pop = document.getElementById('pcb-chat-popover');
  if (!pop) return;
  document.querySelectorAll('[data-chat-toggle]').forEach(btn => {
    const active = state.popover === btn.dataset.chatToggle || (btn.dataset.chatToggle === 'attach' && ['product', 'order'].includes(state.popover));
    btn.setAttribute('aria-expanded', String(active));
    btn.classList.toggle('pcb-chat__tool-btn--active', active);
  });
  if (!state.popover || !state.activeId) {
    pop.hidden = true;
    pop.innerHTML = '';
    return;
  }
  pop.hidden = false;
  pop.dataset.kind = state.popover;
  const user = readLoggedInUser();
  const chat = readChats().find(c => c.id === state.activeId);

  if (state.popover === 'emoji') {
    pop.innerHTML = `<div class="pcb-chat__emoji-grid">${EMOJIS.map(e => `<button type="button" data-chat-emoji="${e}" aria-label="Chèn ${e}">${e}</button>`).join('')}</div>`;
    return;
  }
  if (state.popover === 'attach') {
    const items = [
      ['image', 'image', 'Hình ảnh'],
      ['video', 'video', 'Video'],
      ['product', 'package', 'Sản phẩm'],
      ['order', 'receipt', 'Đơn hàng']
    ];
    pop.innerHTML = `<div class="pcb-chat__attach-grid">${items.map(([kind, iconName, label]) => `
      <button type="button" class="pcb-chat__attach-btn pcb-chat__attach-btn--${kind}" data-chat-attach="${kind}">${icon(iconName, { size: 18 })}${label}</button>`).join('')}</div>`;
    return;
  }
  const back = '<button type="button" class="pcb-chat__pop-back" data-chat-toggle="attach">‹ Quay lại</button>';
  if (state.popover === 'product') {
    pop.innerHTML = `<div class="pcb-chat__pop-head">${back}<strong>Sản phẩm người bán đang đăng</strong></div><p class="pcb-chat__pop-empty">Đang tải...</p>`;
    const auctions = await loadAllAuctions();
    if (state.popover !== 'product') return;
    const now = Date.now();
    const products = auctions.filter(p => p.seller === chat.sellerUsername && !isAuctionClosed(p) && p.endTimestamp > now).slice(0, 30);
    pop.innerHTML = `<div class="pcb-chat__pop-head">${back}<strong>Sản phẩm người bán đang đăng</strong></div>
      ${products.length ? `<ul class="pcb-chat__pick-list">${products.map(p => {
        const data = escapeHtml(JSON.stringify({ id: p.id, name: p.name, image: (p.images || [])[0] || '', price: p.currentBid }));
        return `<li><button type="button" class="pcb-chat__pick" data-chat-pick-product="${data}">
          <img src="${escapeHtml((p.images || [])[0] || 'images/placeholder-product.svg')}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
          <span><span class="pcb-chat__pick-name">${escapeHtml(p.name)}</span><span class="pcb-chat__pick-meta">${formatVnd(p.currentBid)}</span></span>
        </button></li>`;
      }).join('')}</ul>` : '<p class="pcb-chat__pop-empty">Người bán hiện không có phiên nào đang diễn ra.</p>'}`;
    return;
  }
  if (state.popover === 'order') {
    const orders = readOrders()
      .filter(o => o.sellerUsername === chat.sellerUsername && isSameUser({ id: chat.buyerId, username: chat.buyerUsername }, o.buyerId, o.buyerUsername))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    pop.innerHTML = `<div class="pcb-chat__pop-head">${back}<strong>Đơn hàng giữa hai bên</strong></div>
      ${orders.length ? `<ul class="pcb-chat__pick-list">${orders.map(o => {
        const data = escapeHtml(JSON.stringify({ id: o.id, productId: o.productId, productName: o.productName, image: o.image, finalPrice: o.finalPrice, status: o.status }));
        return `<li><button type="button" class="pcb-chat__pick" data-chat-pick-order="${data}">
          <img src="${escapeHtml(o.image || 'images/placeholder-product.svg')}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
          <span><span class="pcb-chat__pick-name">${escapeHtml(o.productName)}</span><span class="pcb-chat__pick-meta">${formatVnd(o.finalPrice)} · ${escapeHtml(ORDER_STATUS_LABELS[o.status] || '')}</span></span>
        </button></li>`;
      }).join('')}</ul>` : `<p class="pcb-chat__pop-empty">Chưa có đơn hàng nào giữa ${user && roleOf(chat, user) === 'seller' ? 'bạn và người mua này' : 'bạn và người bán này'}.</p>`}`;
  }
}

/**
 * Vẽ lại toàn bộ hộp chat theo trạng thái hiện tại
 */
function renderChat() {
  const launcher = document.getElementById('pcb-chat-launcher');
  const panel = document.getElementById('pcb-chat');
  if (!launcher || !panel) return;
  const user = readLoggedInUser();
  const guest = document.getElementById('pcb-chat-guest');

  // Chưa đăng nhập: vẫn hiện nút Tin nhắn, bấm vào chỉ mở khung nhắc đăng nhập
  if (!user) {
    panel.hidden = true;
    document.getElementById('pcb-chat-badge').hidden = true;
    // Đang ở chính trang đăng nhập / đăng ký thì không cần nút nhắc đăng nhập
    launcher.hidden = /(login|register)\.html$/.test(window.location.pathname);
    launcher.setAttribute('aria-controls', 'pcb-chat-guest');
    launcher.setAttribute('aria-expanded', String(state.open));
    if (guest) {
      guest.hidden = !state.open;
      // Đăng nhập xong quay lại đúng trang đang xem
      const back = `${window.location.pathname.split('/').pop() || 'index.html'}${window.location.search}${window.location.hash}`;
      const loginLink = document.getElementById('pcb-chat-guest-login');
      if (loginLink) loginLink.href = `login.html?redirect=${encodeURIComponent(back)}`;
    }
    return;
  }
  if (guest) guest.hidden = true;
  launcher.hidden = false;
  launcher.setAttribute('aria-controls', 'pcb-chat');
  const unread = getUnreadChatCount(user);
  const badge = document.getElementById('pcb-chat-badge');
  badge.textContent = unread;
  badge.hidden = unread === 0;
  launcher.setAttribute('aria-expanded', String(state.open));
  panel.hidden = !state.open;
  if (!state.open) return;

  renderThread();
  // Điện thoại: chỉ hiện một cột (danh sách hoặc tin nhắn)
  panel.classList.toggle('pcb-chat--thread', Boolean(state.activeId));
  renderList();
  const left = getUnreadChatCount(user);
  badge.textContent = left;
  badge.hidden = left === 0;
  const countEl = document.getElementById('pcb-chat-unread');
  if (countEl) countEl.textContent = left ? `(${left})` : '';
  renderPopover();
}

/**
 * Mở cuộc trò chuyện với người bán (hoặc người mua)
 * @param {Object} info
 * @param {string} info.sellerUsername - Tên đăng nhập người bán
 * @param {Object} [info.buyer] - Người mua (mặc định là người đang đăng nhập)
 * @param {Object} [info.product] - Sản phẩm đang trao đổi { id, name, image, price }
 * @returns {boolean} false nếu chưa đăng nhập
 */
export function openChat(info) {
  const user = readLoggedInUser();
  if (!user) return false;
  ensureWidget();
  const chat = ensureChat({ ...info, buyer: info.buyer || user });
  if (!chat) return false;
  state.activeId = chat.id;
  state.open = true;
  state.popover = null;
  // Cuộc trò chuyện đã xóa trước đó: mở lại để tiếp tục nhắn
  renderChat();
  document.getElementById('pcb-chat-input')?.focus();
  return true;
}

/**
 * Mở hội thoại với một tài khoản (nút "Nhắn tin" trên hồ sơ công khai).
 * Nếu hai bên đã từng trò chuyện (dù ai là người mua / người bán) thì mở lại cuộc đó,
 * nếu chưa thì tạo cuộc mới với người đang xem là người hỏi, tài khoản kia là người bán.
 * @param {string} username - Tên đăng nhập của tài khoản cần nhắn
 * @returns {boolean} false nếu chưa đăng nhập hoặc tự nhắn cho chính mình
 */
export function openChatWithUser(username) {
  const user = readLoggedInUser();
  if (!user || !username || user.username === username) return false;
  ensureWidget();
  const target = findAccount({ username });
  const existing = readChats().find(c => roleOf(c, user) && (
    c.sellerUsername === username
    || isSameUser({ id: target?.id, username }, c.buyerId, c.buyerUsername)
  ));
  const chat = existing || ensureChat({ sellerUsername: username, buyer: user });
  if (!chat) return false;
  state.activeId = chat.id;
  state.open = true;
  state.popover = null;
  renderChat();
  document.getElementById('pcb-chat-input')?.focus();
  return true;
}

/**
 * Gửi tin nhắn thay mặt một tài khoản tới tài khoản khác mà không cần mở hộp chat
 * (dùng khi Kiểm định viên yêu cầu bổ sung / từ chối bài đăng, người bán gửi phần bổ sung).
 * Dùng lại cuộc trò chuyện sẵn có giữa hai bên nếu có, nếu chưa thì tạo mới.
 * @param {Object} fromUser - Người gửi (đang đăng nhập)
 * @param {string} toUsername - Tên đăng nhập người nhận
 * @param {Object} payload
 * @param {string} payload.text - Nội dung tin nhắn
 * @param {Object} [payload.product] - Thẻ bài đăng gửi kèm { id, name, image, price }
 * @returns {boolean}
 */
export function sendDirectMessage(fromUser, toUsername, { text, product } = {}) {
  if (!fromUser?.username || !toUsername || fromUser.username === toUsername || !text) return false;
  const target = findAccount({ username: toUsername });
  let chat = readChats().find(c => roleOf(c, fromUser) && (
    c.sellerUsername === toUsername
    || isSameUser({ id: target?.id, username: toUsername }, c.buyerId, c.buyerUsername)
  ));
  if (!chat) {
    chat = ensureChat({ sellerUsername: fromUser.username, buyer: target || { username: toUsername, fullname: toUsername } });
  }
  if (!chat) return false;
  const ok = updateChat(chat.id, c => {
    const role = roleOf(c, fromUser);
    if (!role) return c;
    const now = Date.now();
    const extra = [];
    // Thẻ bài đăng chỉ gửi khi khác bài gần nhất trong cuộc trò chuyện
    const lastProduct = [...c.messages].reverse().find(m => m.type === 'product');
    if (product && Number(lastProduct?.product?.id) !== Number(product.id)) {
      extra.push({ id: `msg_${now}_p`, type: 'product', from: role, auto: true, context: 'review', timestamp: new Date(now).toISOString(), product });
    }
    extra.push({ id: `msg_${now}_t`, type: 'text', from: role, text, timestamp: new Date(now + 1).toISOString() });
    c.messages = [...c.messages, ...extra];
    c.lastRead = { ...c.lastRead, [userKey(fromUser)]: new Date(now + 1).toISOString() };
    c.updatedAt = new Date(now + 1).toISOString();
    return c;
  });
  if (document.getElementById('pcb-chat')) renderChat();
  return ok;
}

/**
 * Khởi động hộp chat nổi trên trang (gọi một lần từ main.js)
 */
export function initChatWidget() {
  if (window.__pcbidChatStarted) return;
  window.__pcbidChatStarted = true;
  ensureWidget();
  renderChat();
  // Câu trả lời tự động đến hạn
  setInterval(processAutoReplies, 1000);
  // Tab khác gửi tin / đăng nhập tài khoản khác / đổi ảnh đại diện
  window.addEventListener('storage', e => {
    if (!e.key || e.key === CHATS_KEY || e.key === 'pcbid_currentUser' || e.key === 'pcbid_registered_users') renderChat();
  });
  window.addEventListener('pcbid:account-updated', renderChat);
}
