/* ==========================================================================
   PCBid - Giao diện đơn hàng sau đấu giá dùng chung (order-view.js)
   ==========================================================================
   Render thẻ đơn hàng gồm: dòng thời gian 4 bước (Thắng đấu giá → Thanh toán →
   Giao hàng → Hoàn tất), số tiền, đồng hồ đếm ngược hạn thanh toán và nút thao
   tác theo vai trò (người mua / người bán). Dùng ở product-detail.html và tab
   "Đơn hàng" trong profile.html.
   ========================================================================== */

import { ORDER_STATUS_LABELS, payOrder, markOrderShipped, confirmOrderReceived, setOrderAddress } from './settlement.js';
// Sổ địa chỉ nhận hàng: chọn / thêm địa chỉ cho đơn mua
import { getAddresses, getDefaultAddress, openAddressForm, openAddressPicker, renderAddressInfo } from './address-book.js';
import { showAlert, showConfirm } from './dialog.js';
// Mở hộp chat với người bán / người mua của đơn hàng
import { openChat, CHAT_ICON_SVG } from './chat.js';
import { readOrders } from './wallet.js';

/**
 * Định dạng tiền Việt Nam
 * @param {number} value
 * @returns {string}
 */
function formatVnd(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} đ`;
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
 * Thời gian còn lại dạng mm:ss
 * @param {number} ms
 * @returns {string}
 */
function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Thứ tự các bước trên dòng thời gian
const STEPS = [
  { key: 'won', label: 'Thắng đấu giá' },
  { key: 'paid', label: 'Thanh toán' },
  { key: 'shipped', label: 'Giao hàng' },
  { key: 'completed', label: 'Hoàn tất' }
];

// Số bước đã xong theo trạng thái đơn
const DONE_COUNT = { awaiting_payment: 1, paid: 2, shipped: 3, completed: 4, forfeited: 1 };

/**
 * Dòng thời gian trạng thái đơn hàng
 * @param {Object} order
 * @returns {string}
 */
function renderTimeline(order) {
  const done = DONE_COUNT[order.status] || 1;
  return `
    <ol class="pcb-order__steps">
      ${STEPS.map((step, i) => {
        let mod = i < done ? 'done' : i === done ? 'current' : 'todo';
        if (order.status === 'forfeited' && i === 1) mod = 'failed';
        if (order.status === 'completed') mod = 'done';
        return `<li class="pcb-order__step pcb-order__step--${mod}"><span class="pcb-order__step-dot" aria-hidden="true"></span>${step.label}</li>`;
      }).join('')}
    </ol>
  `;
}

/**
 * Nội dung hướng dẫn và nút thao tác theo trạng thái + vai trò
 * @param {Object} order
 * @param {'buyer'|'seller'} role
 * @returns {{text:string, action:string}}
 */
function getStateContent(order, role) {
  const remaining = order.finalPrice - order.deposit;
  const counterpart = role === 'buyer' ? order.sellerName : order.buyerName;
  const countdown = `<strong class="pcb-order__countdown" data-deadline="${order.paymentDeadline}">${formatCountdown(order.paymentDeadline - Date.now())}</strong>`;
  const map = {
    buyer: {
      awaiting_payment: {
        text: `Bạn đã thắng phiên này! Thanh toán thêm <strong>${formatVnd(remaining)}</strong> trong ${countdown} để giữ quyền mua. Quá hạn sẽ mất cọc ${formatVnd(order.deposit)}.`,
        action: `<button type="button" class="pcb-order__btn pcb-order__btn--primary" data-order-action="pay" data-order-id="${order.id}">Thanh toán ${formatVnd(remaining)}</button>`
      },
      paid: { text: `Đã thanh toán đủ ${formatVnd(order.finalPrice)}. Đang chờ người bán ${escapeHtml(counterpart)} giao hàng.`, action: '' },
      shipped: {
        text: 'Người bán đã giao hàng. Kiểm tra linh kiện rồi xác nhận đã nhận để hoàn tất giao dịch.',
        action: `<button type="button" class="pcb-order__btn pcb-order__btn--primary" data-order-action="receive" data-order-id="${order.id}">Đã nhận được hàng</button>`
      },
      completed: { text: 'Giao dịch hoàn tất. Chúc bạn sử dụng linh kiện vui vẻ!', action: '' },
      forfeited: { text: `Quá hạn thanh toán: bạn đã mất cọc ${formatVnd(order.deposit)}, cọc được chuyển cho người bán.`, action: '' }
    },
    seller: {
      awaiting_payment: { text: `${escapeHtml(counterpart)} đã thắng với giá ${formatVnd(order.finalPrice)}. Chờ người mua thanh toán (còn ${countdown}).`, action: '' },
      paid: {
        text: `Người mua đã thanh toán ${formatVnd(order.finalPrice)}. Hãy gửi linh kiện rồi xác nhận đã giao hàng.`,
        action: `<button type="button" class="pcb-order__btn pcb-order__btn--primary" data-order-action="ship" data-order-id="${order.id}">Xác nhận đã giao hàng</button>`
      },
      shipped: { text: `Đã giao hàng. Tiền ${formatVnd(order.finalPrice)} sẽ vào ví khi người mua xác nhận đã nhận.`, action: '' },
      completed: { text: `Giao dịch hoàn tất: ${formatVnd(order.finalPrice)} đã được cộng vào ví của bạn.`, action: '' },
      forfeited: { text: `Người mua không thanh toán đúng hạn. Bạn nhận tiền cọc bồi thường ${formatVnd(order.deposit)} và có thể đăng bán lại.`, action: '' }
    }
  };
  return map[role][order.status] || { text: '', action: '' };
}

/**
 * Khối địa chỉ nhận hàng của đơn
 * - Người mua, đơn chờ thanh toán: hiện địa chỉ đã chọn (mặc định nếu chưa chọn) kèm nút Thay đổi
 * - Các trường hợp khác: hiện địa chỉ giao hàng đã chốt khi thanh toán (người bán cũng thấy)
 * @param {Object} order
 * @param {'buyer'|'seller'} role
 * @returns {string}
 */
function renderShipping(order, role) {
  const editable = role === 'buyer' && order.status === 'awaiting_payment';
  const address = order.shippingAddress || (editable ? getDefaultAddress() : null);
  if (!address && !editable) return '';
  const icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>';
  return `
    <div class="pcb-order__ship${address ? '' : ' pcb-order__ship--missing'}">
      <div class="pcb-order__ship-head">
        <span class="pcb-order__ship-title">${icon} ${role === 'buyer' ? 'Địa chỉ nhận hàng' : 'Giao đến'}</span>
        ${editable ? `<button type="button" class="pcb-addr-link" data-order-address="${order.id}">${address ? 'Thay đổi' : 'Thêm địa chỉ'}</button>` : ''}
      </div>
      ${address
        ? `<div class="pcb-address">${renderAddressInfo({ ...address, isDefault: false })}</div>`
        : '<p class="pcb-order__ship-empty">Bạn chưa có địa chỉ nhận hàng. Hãy thêm địa chỉ để thanh toán.</p>'}
    </div>
  `;
}

/**
 * Đảm bảo đơn đã có địa chỉ nhận hàng trước khi thanh toán:
 * dùng địa chỉ đã chọn, nếu chưa có thì địa chỉ mặc định, nếu sổ địa chỉ trống thì mở form thêm mới
 * @param {Object} order
 * @returns {Promise<Object|null>} Địa chỉ dùng cho đơn hoặc null nếu người dùng hủy
 */
async function ensureOrderAddress(order) {
  if (order.shippingAddress) return order.shippingAddress;
  const address = getDefaultAddress() || await openAddressForm();
  if (address) setOrderAddress(order.id, address);
  return address;
}

/**
 * HTML thẻ đơn hàng
 * @param {Object} order - Đơn hàng
 * @param {'buyer'|'seller'} role - Vai trò người xem
 * @param {Object} [options]
 * @param {boolean} [options.showProduct=false] - Hiện ảnh và tên linh kiện (dùng trong danh sách)
 * @returns {string}
 */
export function renderOrderCard(order, role, { showProduct = false } = {}) {
  const content = getStateContent(order, role);
  return `
    <article class="pcb-order pcb-order--${order.status}" data-order-id="${order.id}">
      <header class="pcb-order__head">
        <span class="pcb-order__role">${role === 'buyer' ? '🛒 Bạn là người mua' : '🏷️ Bạn là người bán'}</span>
        <span class="pcb-order__badge pcb-order__badge--${order.status}">${ORDER_STATUS_LABELS[order.status] || ''}</span>
      </header>
      ${showProduct ? `
        <a class="pcb-order__product" href="product-detail.html?id=${order.productId}">
          <img class="pcb-order__img" src="${escapeHtml(order.image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder-product.svg'">
          <span class="pcb-order__name">${escapeHtml(order.productName)}</span>
        </a>` : ''}
      ${renderTimeline(order)}
      <dl class="pcb-order__money">
        <div><dt>Giá chốt</dt><dd>${formatVnd(order.finalPrice)}</dd></div>
        <div><dt>Tiền cọc (10%)</dt><dd>${formatVnd(order.deposit)}</dd></div>
        <div><dt>${role === 'buyer' ? 'Người bán' : 'Người mua'}</dt><dd>${escapeHtml(role === 'buyer' ? order.sellerName : order.buyerName)}</dd></div>
      </dl>
      ${renderShipping(order, role)}
      <p class="pcb-order__text">${content.text}</p>
      <div class="pcb-order__actions">
        ${content.action}
        <button type="button" class="pcb-order__btn pcb-order__btn--ghost" data-order-chat="${order.id}">
          ${CHAT_ICON_SVG} Nhắn tin ${role === 'buyer' ? 'người bán' : 'người mua'}
        </button>
      </div>
    </article>
  `;
}

/**
 * Cập nhật các đồng hồ đếm ngược hạn thanh toán trong một vùng chứa
 * @param {HTMLElement} container
 */
export function tickOrderCountdowns(container) {
  container.querySelectorAll('.pcb-order__countdown[data-deadline]').forEach(el => {
    el.textContent = formatCountdown(Number(el.dataset.deadline) - Date.now());
  });
}

/**
 * Gắn xử lý cho các nút thao tác đơn hàng (ủy quyền sự kiện trên vùng chứa)
 * @param {HTMLElement} container
 * @param {Function} [onChange] - Gọi lại sau khi thao tác thành công
 */
export function bindOrderActions(container, onChange) {
  if (!container || container.dataset.orderBound) return;
  container.dataset.orderBound = '1';
  container.addEventListener('click', async e => {
    // Nhắn tin với bên còn lại của đơn hàng
    const chatBtn = e.target.closest('[data-order-chat]');
    if (chatBtn) {
      const order = readOrders().find(o => o.id === chatBtn.dataset.orderChat);
      if (order) {
        openChat({
          sellerUsername: order.sellerUsername,
          buyer: { id: order.buyerId, username: order.buyerUsername, fullname: order.buyerName },
          product: { id: order.productId, name: order.productName, image: order.image, price: order.finalPrice }
        });
      }
      return;
    }
    // Chọn / đổi địa chỉ nhận hàng cho đơn chờ thanh toán
    const addressBtn = e.target.closest('[data-order-address]');
    if (addressBtn) {
      const order = readOrders().find(o => o.id === addressBtn.dataset.orderAddress);
      if (!order) return;
      const hasAddresses = getAddresses().length > 0;
      const chosen = hasAddresses ? await openAddressPicker(order.shippingAddress?.id || getDefaultAddress()?.id) : await openAddressForm();
      if (chosen) setOrderAddress(order.id, chosen);
      if (onChange) onChange({ ok: Boolean(chosen) });
      return;
    }
    const btn = e.target.closest('[data-order-action]');
    if (!btn) return;
    const { orderAction, orderId } = btn.dataset;
    const confirmTexts = {
      pay: ['Xác nhận thanh toán?', 'Số tiền còn lại sẽ được trừ từ ví ảo PCBid của bạn. Tiền cọc đã giữ được tính vào giá chốt.', 'Thanh toán'],
      ship: ['Xác nhận đã giao hàng?', 'Chỉ xác nhận khi bạn đã gửi linh kiện cho người mua.', 'Đã giao hàng'],
      receive: ['Xác nhận đã nhận hàng?', 'Sau khi xác nhận, tiền sẽ được chuyển cho người bán và giao dịch hoàn tất.', 'Đã nhận hàng']
    };
    const [title, baseMessage, confirmText] = confirmTexts[orderAction] || [];
    if (!title) return;
    let message = baseMessage;
    if (orderAction === 'pay') {
      // Thanh toán cần địa chỉ nhận hàng: lấy địa chỉ đã chọn / mặc định, hoặc mời thêm mới
      const order = readOrders().find(o => o.id === orderId);
      const address = order && await ensureOrderAddress(order);
      if (!address) return;
      message = `${baseMessage}\n\nGiao đến: ${address.fullname} · ${address.phone}\n${address.address}`;
    }
    const ok = await showConfirm({ title, message, confirmText, cancelText: 'Để sau', tone: 'info' });
    if (!ok) return;
    const handlers = { pay: payOrder, ship: markOrderShipped, receive: confirmOrderReceived };
    const result = handlers[orderAction](orderId);
    await showAlert({ title: result.ok ? 'Thành công' : 'Không thực hiện được', message: result.message, tone: result.ok ? 'success' : 'warning' });
    if (onChange) onChange(result);
  });
}
