/* ==========================================================================
   PCBid - Chat giữa người mua và người bán (chat.js)
   ==========================================================================
   Mô phỏng nhắn tin hoàn toàn trên trình duyệt:
   - Mỗi cuộc trò chuyện gắn với một phiên đấu giá và một người mua
     (lưu trong localStorage: pcbid_chats).
   - Hộp chat nổi ở góc màn hình trên mọi trang: danh sách cuộc trò chuyện,
     khung tin nhắn, số tin chưa đọc.
   - Phía bên kia không phải tài khoản thật (người bán trong catalog / người
     dùng mẫu) sẽ tự trả lời sau vài giây theo nội dung câu hỏi. Hai tài khoản
     thật (ví dụ hai tài khoản demo) nhắn qua lại khi lần lượt đăng nhập.
   ========================================================================== */

import { findAccount, getAvatarInitial } from './accounts.js';
import { readLoggedInUser } from './user-data.js';
import { isSameUser } from './wallet.js';

const CHATS_KEY = 'pcbid_chats';
// Thời gian phía bên kia "đang soạn tin" trước khi tự trả lời
const AUTO_REPLY_MIN_MS = 1500;
const AUTO_REPLY_MAX_MS = 3500;

// Câu hỏi gợi ý cho tin nhắn đầu tiên
const QUICK_QUESTIONS = [
  'Linh kiện còn bảo hành không ạ?',
  'Mình có được test trước khi nhận không?',
  'Phí giao hàng thế nào ạ?',
  'Có kèm hộp và phụ kiện không?'
];

// Trạng thái giao diện hộp chat trên trang hiện tại
const state = { open: false, activeId: null };

/**
 * Đọc toàn bộ cuộc trò chuyện
 * @returns {Array}
 */
function readChats() {
  try {
    const list = JSON.parse(localStorage.getItem(CHATS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Ghi danh sách cuộc trò chuyện
 * @param {Array} list
 */
function writeChats(list) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(list));
  } catch {
    // Bỏ qua khi localStorage đầy
  }
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
 * Tài khoản thật (thành viên demo / tài khoản đã đăng ký), không phải người dùng mẫu
 * @param {Object|null} account
 * @returns {boolean}
 */
function isRealAccount(account) {
  return Boolean(account) && !String(account.id || '').startsWith('user_mock_');
}

/**
 * Khóa định danh người dùng dùng để lưu mốc đã đọc
 * @param {Object} user
 * @returns {string}
 */
function userKey(user) {
  return user?.id || user?.username || '';
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
 * Số tin chưa đọc của người dùng trong một cuộc trò chuyện
 * @param {Object} chat
 * @param {Object} user
 * @returns {number}
 */
function unreadCount(chat, user) {
  const role = roleOf(chat, user);
  if (!role) return 0;
  const lastRead = new Date(chat.lastRead?.[userKey(user)] || 0).getTime();
  return chat.messages.filter(m => m.from !== role && new Date(m.timestamp).getTime() > lastRead).length;
}

/**
 * Thời gian hiển thị ngắn gọn: giờ:phút nếu trong ngày, ngược lại ngày/tháng
 * @param {string} iso
 * @returns {string}
 */
function formatTime(iso) {
  const date = new Date(iso);
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

/**
 * Sinh câu trả lời tự động của người bán theo nội dung câu hỏi
 * @param {string} text - Tin nhắn của người mua
 * @param {Object} chat
 * @returns {string}
 */
function buildSellerReply(text, chat) {
  const q = text.toLowerCase();
  const product = chat.productName;
  if (/bảo hành|bh\b/.test(q)) return 'Linh kiện vẫn còn bảo hành hãng bạn nhé. Ngoài ra PCBid bao test 7 ngày, lỗi do nhà sản xuất là mình đổi hoặc hoàn tiền.';
  if (/test|kiểm tra|thử/.test(q)) return 'Bạn được kiểm tra hàng khi nhận ạ. Mình đã stress test trước khi đăng, kết quả có trong phần thông số. Nhận hàng lỗi cứ báo mình trong 7 ngày.';
  if (/ship|giao|vận chuyển|phí|cod/.test(q)) return 'Mình giao toàn quốc qua GHTK, phí khoảng 30.000 - 50.000đ tùy khu vực. Nội thành TP.HCM có thể giao trong ngày sau khi bạn thanh toán trên sàn.';
  if (/giá|bớt|giảm|fix/.test(q)) return 'Giá được quyết định theo phiên đấu giá nên mình không bớt ngoài sàn được bạn nhé. Bạn cứ đặt giá, chúc bạn may mắn!';
  if (/hộp|box|phụ kiện|full/.test(q)) return 'Linh kiện kèm đầy đủ phụ kiện như mô tả, hộp còn nhưng hơi móp góc. Bạn xem thêm ở mục "Mô tả người bán" nhé.';
  if (/còn|hàng không|có sẵn/.test(q)) return `${product} vẫn còn bạn nhé, phiên đang diễn ra trên sàn.`;
  if (/ảnh|hình|video/.test(q)) return 'Ảnh trên phiên là ảnh chụp thực tế. Bạn cần thêm góc nào mình chụp gửi bạn sau nhé.';
  if (/chào|hello|hi\b|alo|shop ơi/.test(q)) return `Chào bạn 👋 Mình là ${chat.sellerName}. Bạn cần hỏi gì về ${product} cứ nhắn mình nhé!`;
  if (/cảm ơn|thanks|ok/.test(q)) return 'Dạ không có gì ạ, cần gì bạn cứ nhắn mình nhé!';
  return `Cảm ơn bạn đã quan tâm ${product}. Mình sẽ trả lời chi tiết sớm nhất, bạn cần thêm thông tin gì cứ nhắn nhé!`;
}

/**
 * Sinh câu trả lời tự động của người mua (người dùng mẫu) khi người bán nhắn
 * @param {string} text
 * @returns {string}
 */
function buildBuyerReply(text) {
  const q = text.toLowerCase();
  if (/giao|ship|gửi/.test(q)) return 'Dạ vâng, mình cảm ơn shop. Nhận được hàng mình sẽ xác nhận trên sàn ngay ạ.';
  if (/thanh toán|chuyển/.test(q)) return 'Mình thanh toán qua ví PCBid rồi nha shop.';
  return 'Dạ mình nhận được tin rồi ạ, cảm ơn shop nhiều!';
}

/**
 * Lấy hoặc tạo cuộc trò chuyện giữa người mua và người bán về một phiên
 * @param {Object} info - { productId, productName, productImage, sellerUsername, buyer }
 * @returns {Object|null}
 */
function ensureChat({ productId, productName, productImage, sellerUsername, buyer }) {
  if (!buyer || !sellerUsername) return null;
  const id = `chat_${productId}_${userKey(buyer)}`;
  const list = readChats();
  let chat = list.find(c => c.id === id);
  if (!chat) {
    const seller = findAccount({ username: sellerUsername });
    chat = {
      id,
      productId: Number(productId),
      productName: productName || 'Linh kiện',
      productImage: productImage || 'images/placeholder-product.svg',
      sellerUsername,
      sellerName: seller?.fullname || sellerUsername,
      sellerReal: isRealAccount(seller),
      buyerId: buyer.id || null,
      buyerUsername: buyer.username || '',
      buyerName: buyer.fullname || buyer.name || buyer.username || 'Người mua',
      buyerReal: isRealAccount(findAccount({ id: buyer.id, username: buyer.username })),
      messages: [],
      lastRead: {},
      pendingReplyAt: null,
      updatedAt: new Date().toISOString()
    };
    list.unshift(chat);
    writeChats(list);
  }
  return chat;
}

/**
 * Cập nhật một cuộc trò chuyện
 * @param {string} id
 * @param {Function} updater
 */
function updateChat(id, updater) {
  const list = readChats();
  const index = list.findIndex(c => c.id === id);
  if (index < 0) return;
  list[index] = updater({ ...list[index] });
  writeChats(list);
}

/**
 * Gửi tin nhắn của người dùng hiện tại
 * @param {string} chatId
 * @param {string} text
 */
function sendMessage(chatId, text) {
  const user = readLoggedInUser();
  const body = text.trim().slice(0, 500);
  if (!user || !body) return;
  updateChat(chatId, chat => {
    const role = roleOf(chat, user);
    if (!role) return chat;
    const now = new Date().toISOString();
    chat.messages = [...chat.messages, { id: `msg_${Date.now()}`, from: role, text: body, timestamp: now }];
    chat.lastRead = { ...chat.lastRead, [userKey(user)]: now };
    chat.updatedAt = now;
    // Phía bên kia không phải tài khoản thật: hẹn giờ tự trả lời
    const counterpartReal = role === 'buyer' ? chat.sellerReal : chat.buyerReal;
    if (!counterpartReal) {
      chat.pendingReplyAt = Date.now() + AUTO_REPLY_MIN_MS + Math.random() * (AUTO_REPLY_MAX_MS - AUTO_REPLY_MIN_MS);
      chat.pendingReplyTo = body;
      chat.pendingReplyFrom = role === 'buyer' ? 'seller' : 'buyer';
    }
    return chat;
  });
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
    const text = chat.pendingReplyFrom === 'seller' ? buildSellerReply(chat.pendingReplyTo || '', chat) : buildBuyerReply(chat.pendingReplyTo || '');
    const timestamp = new Date().toISOString();
    return {
      ...chat,
      messages: [...chat.messages, { id: `msg_${now}`, from: chat.pendingReplyFrom, text, timestamp }],
      pendingReplyAt: null,
      pendingReplyTo: null,
      updatedAt: timestamp
    };
  });
  if (changed) {
    writeChats(list);
    renderChat();
  }
}

/**
 * Đánh dấu đã đọc cuộc trò chuyện đang mở
 * @param {string} chatId
 */
function markRead(chatId) {
  const user = readLoggedInUser();
  if (!user) return;
  const chat = readChats().find(c => c.id === chatId);
  if (!chat || !unreadCount(chat, user)) return;
  updateChat(chatId, c => ({ ...c, lastRead: { ...c.lastRead, [userKey(user)]: new Date().toISOString() } }));
}

/**
 * Các cuộc trò chuyện của người dùng, mới nhất trước
 * @param {Object} user
 * @returns {Array}
 */
function getUserChats(user) {
  return readChats()
    .filter(c => roleOf(c, user))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
   GIAO DIỆN HỘP CHAT NỔI
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
  launcher.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
    <span class="pcb-chat-launcher__text">Tin nhắn</span>
    <span class="pcb-chat-launcher__badge" id="pcb-chat-badge" hidden>0</span>
  `;

  const panel = document.createElement('section');
  panel.className = 'pcb-chat';
  panel.id = 'pcb-chat';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Tin nhắn');
  panel.hidden = true;
  panel.innerHTML = `
    <header class="pcb-chat__header">
      <button type="button" class="pcb-chat__icon-btn" data-chat-back aria-label="Quay lại danh sách" hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <div class="pcb-chat__title-wrap">
        <strong class="pcb-chat__title" id="pcb-chat-title">Tin nhắn</strong>
        <span class="pcb-chat__subtitle" id="pcb-chat-subtitle"></span>
      </div>
      <button type="button" class="pcb-chat__icon-btn" data-chat-close aria-label="Đóng tin nhắn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </header>
    <div class="pcb-chat__body" id="pcb-chat-body" aria-live="polite"></div>
    <form class="pcb-chat__form" id="pcb-chat-form" hidden>
      <label class="pcb-chat__sr" for="pcb-chat-input">Nội dung tin nhắn</label>
      <input type="text" class="pcb-chat__input" id="pcb-chat-input" maxlength="500" placeholder="Nhập tin nhắn..." autocomplete="off">
      <button type="submit" class="pcb-chat__send" aria-label="Gửi tin nhắn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
      </button>
    </form>
  `;
  document.body.append(launcher, panel);

  launcher.addEventListener('click', () => (state.open ? closeChat() : openPanel()));
  panel.addEventListener('click', e => {
    if (e.target.closest('[data-chat-close]')) closeChat();
    else if (e.target.closest('[data-chat-back]')) {
      state.activeId = null;
      renderChat();
    } else if (e.target.closest('[data-chat-id]')) {
      state.activeId = e.target.closest('[data-chat-id]').dataset.chatId;
      renderChat();
      document.getElementById('pcb-chat-input')?.focus();
    } else if (e.target.closest('[data-chat-quick]') && state.activeId) {
      sendMessage(state.activeId, e.target.closest('[data-chat-quick]').dataset.chatQuick);
    }
  });
  panel.querySelector('#pcb-chat-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('pcb-chat-input');
    if (state.activeId && input.value.trim()) {
      sendMessage(state.activeId, input.value);
      input.value = '';
      input.focus();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.open) closeChat();
  });
}

/**
 * Mở khung chat (danh sách hoặc cuộc trò chuyện đang chọn)
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
  renderChat();
  document.getElementById('pcb-chat-launcher')?.focus();
}

/**
 * HTML danh sách cuộc trò chuyện
 * @param {Object} user
 * @returns {string}
 */
function renderList(user) {
  const chats = getUserChats(user);
  if (!chats.length) {
    return `<p class="pcb-chat__empty">Chưa có cuộc trò chuyện nào.<br>Bấm "Liên hệ người bán" ở trang chi tiết phiên để bắt đầu hỏi người bán.</p>`;
  }
  return `<ul class="pcb-chat__list">${chats.map(chat => {
    const role = roleOf(chat, user);
    const name = role === 'buyer' ? chat.sellerName : chat.buyerName;
    const last = chat.messages[chat.messages.length - 1];
    const unread = unreadCount(chat, user);
    return `
      <li>
        <button type="button" class="pcb-chat__item${unread ? ' pcb-chat__item--unread' : ''}" data-chat-id="${chat.id}">
          <span class="pcb-chat__avatar" aria-hidden="true">${escapeHtml(getAvatarInitial(name))}</span>
          <span class="pcb-chat__item-body">
            <span class="pcb-chat__item-top">
              <span class="pcb-chat__item-name">${escapeHtml(name)}</span>
              <span class="pcb-chat__item-time">${last ? formatTime(last.timestamp) : ''}</span>
            </span>
            <span class="pcb-chat__item-role">${role === 'buyer' ? 'Người bán' : 'Người mua'} · ${escapeHtml(chat.productName)}</span>
            <span class="pcb-chat__item-last">${last ? escapeHtml((last.from === role ? 'Bạn: ' : '') + last.text) : 'Chưa có tin nhắn'}</span>
          </span>
          ${unread ? `<span class="pcb-chat__item-badge">${unread}</span>` : ''}
        </button>
      </li>
    `;
  }).join('')}</ul>`;
}

/**
 * HTML khung tin nhắn của một cuộc trò chuyện
 * @param {Object} chat
 * @param {Object} user
 * @returns {string}
 */
function renderThread(chat, user) {
  const role = roleOf(chat, user);
  const hasMine = chat.messages.some(m => m.from === role);
  const typing = chat.pendingReplyAt ? `<div class="pcb-chat__typing" aria-label="Đang soạn tin"><span></span><span></span><span></span></div>` : '';
  return `
    <a class="pcb-chat__product" href="product-detail.html?id=${chat.productId}">
      <img src="${escapeHtml(chat.productImage)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
      <span>${escapeHtml(chat.productName)}</span>
    </a>
    <div class="pcb-chat__messages">
      ${chat.messages.length ? '' : `<p class="pcb-chat__hint">Hãy hỏi ${role === 'buyer' ? 'người bán' : 'người mua'} về tình trạng linh kiện, bảo hành hoặc giao hàng.</p>`}
      ${chat.messages.map(m => `
        <div class="pcb-chat__msg${m.from === role ? ' pcb-chat__msg--mine' : ''}">
          <p class="pcb-chat__bubble">${escapeHtml(m.text)}</p>
          <span class="pcb-chat__msg-time">${formatTime(m.timestamp)}</span>
        </div>
      `).join('')}
      ${typing}
    </div>
    ${role === 'buyer' && !hasMine ? `<div class="pcb-chat__quick">${QUICK_QUESTIONS.map(q => `<button type="button" class="pcb-chat__quick-btn" data-chat-quick="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('')}</div>` : ''}
  `;
}

/**
 * Vẽ lại hộp chat theo trạng thái hiện tại
 */
function renderChat() {
  const launcher = document.getElementById('pcb-chat-launcher');
  const panel = document.getElementById('pcb-chat');
  if (!launcher || !panel) return;
  const user = readLoggedInUser();

  // Chưa đăng nhập: ẩn toàn bộ hộp chat
  launcher.hidden = !user;
  if (!user) {
    panel.hidden = true;
    return;
  }
  const unread = getUnreadChatCount(user);
  const badge = document.getElementById('pcb-chat-badge');
  if (badge) {
    badge.textContent = unread;
    badge.hidden = unread === 0;
  }
  launcher.setAttribute('aria-expanded', String(state.open));
  panel.hidden = !state.open;
  if (!state.open) return;

  const chat = state.activeId ? readChats().find(c => c.id === state.activeId && roleOf(c, user)) : null;
  if (!chat) state.activeId = null;
  const body = document.getElementById('pcb-chat-body');
  const form = document.getElementById('pcb-chat-form');
  const title = document.getElementById('pcb-chat-title');
  const subtitle = document.getElementById('pcb-chat-subtitle');
  panel.querySelector('[data-chat-back]').hidden = !chat;
  form.hidden = !chat;

  if (chat) {
    const role = roleOf(chat, user);
    title.textContent = role === 'buyer' ? chat.sellerName : chat.buyerName;
    subtitle.textContent = role === 'buyer' ? 'Người bán' : 'Người mua';
    body.innerHTML = renderThread(chat, user);
    const messages = body.querySelector('.pcb-chat__messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
    markRead(chat.id);
    if (badge) {
      const left = getUnreadChatCount(user);
      badge.textContent = left;
      badge.hidden = left === 0;
    }
  } else {
    title.textContent = 'Tin nhắn';
    subtitle.textContent = unread ? `${unread} tin chưa đọc` : '';
    body.innerHTML = renderList(user);
  }
}

/**
 * Mở cuộc trò chuyện với người bán (hoặc người mua) của một phiên
 * @param {Object} info
 * @param {number} info.productId
 * @param {string} info.productName
 * @param {string} [info.productImage]
 * @param {string} info.sellerUsername
 * @param {Object} [info.buyer] - Người mua (mặc định là người đang đăng nhập)
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
  renderChat();
  document.getElementById('pcb-chat-input')?.focus();
  return true;
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
  // Tab khác gửi tin / đăng nhập tài khoản khác
  window.addEventListener('storage', e => {
    if (!e.key || e.key === CHATS_KEY || e.key === 'pcbid_currentUser') renderChat();
  });
  window.addEventListener('pcbid:account-updated', renderChat);
}
