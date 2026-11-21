/* ==========================================================================
   PCBid - Xử lý sau khi phiên đấu giá kết thúc (settlement.js)
   ==========================================================================
   Quy trình mô phỏng (toàn bộ chạy trên trình duyệt, lưu trong localStorage):

   1. Phiên kết thúc → xác định người thắng theo bảng lịch sử đặt giá.
      - Người thua: cọc tự hoàn (vì chỉ người dẫn đầu mới bị giữ cọc).
      - Người thắng: cọc 10% TIẾP TỤC bị giữ, tạo đơn "Chờ thanh toán".
   2. Người thắng thanh toán phần còn lại (90%) từ ví ảo trong PAYMENT_WINDOW_MS.
      Quá hạn → mất cọc: cọc chuyển cho người bán, phiên kết thúc không bán được.
   3. Đã thanh toán → người bán bấm "Xác nhận đã giao hàng".
   4. Người mua bấm "Đã nhận được hàng" → Hoàn tất, tiền chuyển vào ví người bán.

   Bên tham gia không phải tài khoản thật (người dùng mẫu / người bán trong
   catalog) được hệ thống tự thực hiện bước của họ sau vài giây để luồng demo
   luôn chạy trọn vẹn.

   Dữ liệu:
   - pcbid_orders: danh sách đơn hàng sau đấu giá
   - pcbid_wallet_ledger: sổ giao dịch ví (âm = trừ tiền, dương = cộng tiền)
   - pcbid_settled: các phiên (ID + mốc kết thúc) đã được xử lý
   ========================================================================== */

import { isAuctionClosed, isCatalogProduct } from './auction-time.js';
import { findAccount, describeBidder } from './accounts.js';
import { loadAllAuctions, buildBidHistory, readAllBids } from './bid-history.js';
import { ORDERS_KEY, LEDGER_KEY, readOrders, readLedger, isSameUser, calcDeposit, getAvailableBalance } from './wallet.js';
import { readLoggedInUser } from './user-data.js';

// Thời hạn thanh toán sau khi thắng đấu giá: 1 phút (rút ngắn để demo)
export const PAYMENT_WINDOW_MS = 60 * 1000;
// Thời gian hệ thống tự thực hiện thay cho bên không phải tài khoản thật
const AUTO_PAY_MS = 8 * 1000;
const AUTO_SHIP_MS = 10 * 1000;
const AUTO_RECEIVE_MS = 10 * 1000;
// Chu kỳ quét các phiên vừa kết thúc và các đơn đến hạn
const TICK_MS = 2000;

const SETTLED_KEY = 'pcbid_settled';
const SINCE_KEY = 'pcbid_settlement_since';

// Nhãn trạng thái đơn hàng dùng chung cho các trang
export const ORDER_STATUS_LABELS = {
  awaiting_payment: 'Chờ thanh toán',
  paid: 'Chờ giao hàng',
  shipped: 'Đang giao hàng',
  completed: 'Hoàn tất',
  forfeited: 'Quá hạn · Mất cọc'
};

/**
 * Đọc an toàn một giá trị JSON trong localStorage
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Ghi giá trị JSON vào localStorage
 * @param {string} key
 * @param {*} value
 */
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Bỏ qua khi localStorage đầy hoặc bị chặn
  }
}

/**
 * Tài khoản thật (thành viên demo hoặc tài khoản đã đăng ký), không phải người dùng mẫu
 * @param {Object|null} account
 * @returns {boolean}
 */
function isRealAccount(account) {
  return Boolean(account) && !String(account.id || '').startsWith('user_mock_');
}

/**
 * Ghi một giao dịch vào sổ ví
 * @param {Object} entry - { userId, username, amount, type, orderId, note }
 */
function addLedgerEntry(entry) {
  const ledger = readLedger();
  ledger.unshift({ id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, timestamp: new Date().toISOString(), ...entry });
  writeJson(LEDGER_KEY, ledger);
}

/**
 * Cập nhật trạng thái phiên trong pcbid_products
 * @param {Object} product - Phiên đấu giá
 * @param {Object} changes - Các trường cần cập nhật
 */
function updateProduct(product, changes) {
  const list = readJson('pcbid_products', []);
  const index = list.findIndex(p => Number(p.id) === Number(product.id));
  const merged = { ...(index >= 0 ? list[index] : product), ...changes };
  delete merged.endTimestamp;
  Object.keys(changes).forEach(key => { if (changes[key] === undefined) delete merged[key]; });
  if (index >= 0) list[index] = merged;
  else list.push(merged);
  writeJson('pcbid_products', list);
}

/**
 * Báo cho mọi khu vực trên trang (header, ví, thông báo, danh sách) cập nhật lại
 * @param {boolean} productsChanged - Có thay đổi trạng thái phiên hay không
 */
function notifyChanges(productsChanged) {
  window.dispatchEvent(new CustomEvent('pcbid:orders-updated'));
  window.dispatchEvent(new CustomEvent('pcbid:wallet-updated'));
  window.dispatchEvent(new CustomEvent('pcbid:notifications-updated'));
  if (productsChanged) {
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: 'pcbid_products' }));
    } catch {
      // Trình duyệt không hỗ trợ tạo StorageEvent: bỏ qua
    }
  }
}

/**
 * Đơn hàng mới nhất của một phiên (theo đúng lượt kết thúc hiện tại nếu biết mốc kết thúc)
 * @param {number} productId
 * @param {number} [endTimestamp]
 * @returns {Object|null}
 */
export function getOrderForProduct(productId, endTimestamp) {
  return readOrders()
    .filter(o => Number(o.productId) === Number(productId) && (!endTimestamp || o.endTimestamp === endTimestamp))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
}

/**
 * Các đơn hàng của người dùng (vai trò người mua hoặc người bán), mới nhất trước
 * @param {Object} user
 * @returns {Array<Object>} Mỗi đơn kèm trường role: 'buyer' | 'seller'
 */
export function getOrdersForUser(user) {
  if (!user) return [];
  return readOrders()
    .map(o => ({
      ...o,
      role: isSameUser(user, o.buyerId, o.buyerUsername) ? 'buyer' : isSameUser(user, o.sellerId, o.sellerUsername) ? 'seller' : null
    }))
    .filter(o => o.role)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Đơn hàng đang chờ chính người dùng thao tác (thanh toán / giao hàng / xác nhận nhận hàng)
 * @param {Object} order - Đơn hàng kèm vai trò
 * @returns {boolean}
 */
export function orderNeedsAction(order) {
  return (order.role === 'buyer' && (order.status === 'awaiting_payment' || order.status === 'shipped'))
    || (order.role === 'seller' && order.status === 'paid');
}

/**
 * Cập nhật một đơn hàng theo ID
 * @param {string} orderId
 * @param {Function} updater - Nhận đơn hiện tại, trả về đơn mới (hoặc null nếu không đổi)
 * @returns {Object|null} Đơn sau khi cập nhật
 */
function updateOrder(orderId, updater) {
  const orders = readOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index < 0) return null;
  const next = updater(orders[index]);
  if (!next) return null;
  orders[index] = { ...next, updatedAt: new Date().toISOString() };
  writeJson(ORDERS_KEY, orders);
  return orders[index];
}

/**
 * Xác định kết quả của một phiên vừa kết thúc và tạo đơn hàng nếu cần
 * @param {Object} product - Phiên đã kết thúc
 * @param {Array} allBids - Toàn bộ lượt đặt giá thật
 * @returns {boolean} Có tạo đơn hàng hay không
 */
function settleProduct(product, allBids) {
  const now = Date.now();
  const history = buildBidHistory(product, allBids);
  let top = history[0] || null;
  // Người bán đóng phiên sớm đã ghi sẵn người thắng
  if (product.closedEarly && product.winner) top = history.find(b => b.bidderName === product.winner) || top;

  const seller = findAccount({ username: product.seller });
  const sellerReal = isRealAccount(seller);

  if (!top) {
    updateProduct(product, { status: 'ended', winner: undefined, endLocked: true, endTime: new Date(product.endTimestamp).toISOString() });
    return false;
  }

  updateProduct(product, {
    status: 'sold',
    winner: top.bidderName,
    currentBid: top.amount,
    endLocked: true,
    endTime: new Date(product.endTimestamp).toISOString()
  });

  const buyer = findAccount({ id: top.bidderId, username: top.bidderName });
  const buyerReal = isRealAccount(buyer);
  // Hai bên đều không phải tài khoản thật: không cần theo dõi đơn hàng
  if (!buyerReal && !sellerReal) return false;

  const orders = readOrders();
  orders.unshift({
    id: `ord_${product.id}_${product.endTimestamp}`,
    productId: Number(product.id),
    productName: product.name,
    image: (product.images && product.images[0]) || 'images/placeholder-product.svg',
    endTimestamp: product.endTimestamp,
    sellerId: seller?.id || null,
    sellerUsername: product.seller || '',
    sellerName: seller?.fullname || product.seller || '',
    sellerReal,
    buyerId: top.bidderId || buyer?.id || null,
    buyerUsername: top.bidderName || buyer?.username || '',
    buyerName: describeBidder(top).name,
    buyerReal,
    finalPrice: Number(top.amount) || 0,
    deposit: calcDeposit(top.amount),
    status: 'awaiting_payment',
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    paymentDeadline: now + PAYMENT_WINDOW_MS
  });
  writeJson(ORDERS_KEY, orders);
  return true;
}

/**
 * Người thắng quá hạn thanh toán: mất cọc, cọc chuyển cho người bán
 * @param {Object} order
 */
function forfeitOrder(order) {
  const updated = updateOrder(order.id, o => (o.status === 'awaiting_payment' ? { ...o, status: 'forfeited', forfeitedAt: new Date().toISOString() } : null));
  if (!updated) return;
  if (updated.buyerReal) {
    addLedgerEntry({ userId: updated.buyerId, username: updated.buyerUsername, amount: -updated.deposit, type: 'forfeit', orderId: updated.id, note: `Mất cọc do quá hạn thanh toán: ${updated.productName}` });
  }
  if (updated.sellerReal) {
    addLedgerEntry({ userId: updated.sellerId, username: updated.sellerUsername, amount: updated.deposit, type: 'deposit_compensation', orderId: updated.id, note: `Nhận cọc bồi thường: ${updated.productName}` });
  }
  // Phiên không bán được: người bán có thể đăng bán lại
  const product = { id: updated.productId };
  updateProduct(product, { status: 'ended', forfeited: true, winner: undefined });
}

/**
 * Hoàn tất đơn hàng: tiền bán hàng chuyển vào ví người bán
 * @param {Object} order
 */
function completeOrder(order) {
  const updated = updateOrder(order.id, o => (o.status === 'shipped' ? { ...o, status: 'completed', completedAt: new Date().toISOString() } : null));
  if (!updated) return;
  if (updated.sellerReal) {
    addLedgerEntry({ userId: updated.sellerId, username: updated.sellerUsername, amount: updated.finalPrice, type: 'sale', orderId: updated.id, note: `Nhận tiền bán hàng: ${updated.productName}` });
  }
}

/**
 * Xử lý các đơn đến hạn: quá hạn thanh toán và các bước tự động của bên không phải tài khoản thật
 * @returns {boolean} Có thay đổi hay không
 */
function processOrders() {
  const now = Date.now();
  let changed = false;
  readOrders().forEach(order => {
    const updatedAt = new Date(order.updatedAt || order.createdAt).getTime();
    if (order.status === 'awaiting_payment') {
      if (!order.buyerReal && now - new Date(order.createdAt).getTime() >= AUTO_PAY_MS) {
        // Người mua là người dùng mẫu: tự thanh toán, kèm địa chỉ nhận hàng mô phỏng
        changed = Boolean(updateOrder(order.id, o => ({ ...o, status: 'paid', paidAt: new Date().toISOString(), shippingAddress: o.shippingAddress || mockShippingAddress(o) }))) || changed;
      } else if (now > order.paymentDeadline) {
        forfeitOrder(order);
        changed = true;
      }
    } else if (order.status === 'paid' && !order.sellerReal && now - updatedAt >= AUTO_SHIP_MS) {
      // Người bán trong catalog: tự giao hàng
      changed = Boolean(updateOrder(order.id, o => ({ ...o, status: 'shipped', shippedAt: new Date().toISOString() }))) || changed;
    } else if (order.status === 'shipped' && !order.buyerReal && now - updatedAt >= AUTO_RECEIVE_MS) {
      // Người mua là người dùng mẫu: tự xác nhận đã nhận hàng
      completeOrder(order);
      changed = true;
    }
  });
  return changed;
}

/**
 * Quét các phiên vừa kết thúc và các đơn đến hạn
 * @returns {Promise<void>}
 */
export async function runSettlement() {
  const now = Date.now();
  let since = Number(localStorage.getItem(SINCE_KEY));
  if (!since) {
    // Chỉ xử lý các phiên kết thúc sau khi tính năng được bật, tránh tạo đơn cho dữ liệu cũ
    since = now;
    localStorage.setItem(SINCE_KEY, String(since));
  }

  const settled = new Set(readJson(SETTLED_KEY, []));
  const auctions = await loadAllAuctions();
  const allBids = readAllBids();
  let productsChanged = false;
  let ordersChanged = false;

  auctions.forEach(product => {
    // Phiên catalog chỉ được xử lý khi đã khóa thời điểm kết thúc (có người dùng thật tham gia)
    const eligible = !isCatalogProduct(product.id) || product.endLocked || product.closedEarly || product.relisted;
    const ended = product.endTimestamp <= now || (product.closedEarly && isAuctionClosed(product));
    if (!eligible || !ended || product.endTimestamp < since) return;
    const key = `${product.id}_${product.endTimestamp}`;
    if (settled.has(key)) return;
    settled.add(key);
    ordersChanged = settleProduct(product, allBids) || ordersChanged;
    productsChanged = true;
  });
  if (productsChanged) writeJson(SETTLED_KEY, [...settled].slice(-500));

  const ordersProcessed = processOrders();
  if (productsChanged || ordersChanged || ordersProcessed) notifyChanges(productsChanged || ordersProcessed);
}

/**
 * Địa chỉ nhận hàng mô phỏng cho người mua là người dùng mẫu
 * @param {Object} order
 * @returns {Object}
 */
function mockShippingAddress(order) {
  const districts = ['Quận 1', 'Quận 3', 'Quận 7', 'TP. Thủ Đức', 'Quận Bình Thạnh', 'Quận Gò Vấp'];
  const seed = String(order.buyerUsername || '').length + Number(order.productId || 0);
  return {
    fullname: order.buyerName,
    phone: `09${String(10000000 + (seed * 7919) % 89999999).padStart(8, '0')}`,
    address: `${10 + (seed % 190)} đường số ${1 + (seed % 30)}, ${districts[seed % districts.length]}, TP. Hồ Chí Minh`
  };
}

/**
 * Người mua chọn địa chỉ nhận hàng cho đơn đang chờ thanh toán
 * @param {string} orderId
 * @param {Object} address - { fullname, phone, address }
 * @returns {boolean}
 */
export function setOrderAddress(orderId, address) {
  const user = readLoggedInUser();
  const order = readOrders().find(o => o.id === orderId);
  if (!user || !order || !address || !isSameUser(user, order.buyerId, order.buyerUsername) || order.status !== 'awaiting_payment') return false;
  const snapshot = { id: address.id || null, fullname: address.fullname, phone: address.phone, address: address.address };
  updateOrder(orderId, o => ({ ...o, shippingAddress: snapshot }));
  notifyChanges(false);
  return true;
}

/**
 * Người thắng thanh toán phần còn lại từ ví ảo
 * @param {string} orderId
 * @returns {{ok:boolean, message:string}}
 */
export function payOrder(orderId) {
  const user = readLoggedInUser();
  const order = readOrders().find(o => o.id === orderId);
  if (!user || !order || !isSameUser(user, order.buyerId, order.buyerUsername)) return { ok: false, message: 'Bạn không phải người thắng của phiên này.' };
  if (order.status !== 'awaiting_payment') return { ok: false, message: 'Đơn hàng không còn ở bước chờ thanh toán.' };
  if (Date.now() > order.paymentDeadline) return { ok: false, message: 'Đã quá hạn thanh toán.' };
  if (!order.shippingAddress) return { ok: false, message: 'Vui lòng chọn địa chỉ nhận hàng trước khi thanh toán.' };

  const need = order.finalPrice - order.deposit;
  const available = getAvailableBalance(user);
  if (available < need) {
    return { ok: false, message: `Số dư khả dụng không đủ: cần thêm ${need.toLocaleString('vi-VN')}đ, ví còn ${available.toLocaleString('vi-VN')}đ. Hãy nạp thêm tiền vào ví.` };
  }

  addLedgerEntry({ userId: user.id, username: user.username, amount: -order.finalPrice, type: 'payment', orderId, note: `Thanh toán: ${order.productName}` });
  updateOrder(orderId, o => ({ ...o, status: 'paid', paidAt: new Date().toISOString() }));
  notifyChanges(false);
  return { ok: true, message: 'Thanh toán thành công! Người bán sẽ sớm giao hàng.' };
}

/**
 * Người bán xác nhận đã giao hàng
 * @param {string} orderId
 * @returns {{ok:boolean, message:string}}
 */
export function markOrderShipped(orderId) {
  const user = readLoggedInUser();
  const order = readOrders().find(o => o.id === orderId);
  if (!user || !order || !isSameUser(user, order.sellerId, order.sellerUsername)) return { ok: false, message: 'Bạn không phải người bán của đơn hàng này.' };
  if (order.status !== 'paid') return { ok: false, message: 'Đơn hàng chưa được thanh toán.' };
  updateOrder(orderId, o => ({ ...o, status: 'shipped', shippedAt: new Date().toISOString() }));
  notifyChanges(false);
  return { ok: true, message: 'Đã xác nhận giao hàng. Chờ người mua xác nhận đã nhận.' };
}

/**
 * Người mua xác nhận đã nhận hàng → hoàn tất, tiền vào ví người bán
 * @param {string} orderId
 * @returns {{ok:boolean, message:string}}
 */
export function confirmOrderReceived(orderId) {
  const user = readLoggedInUser();
  const order = readOrders().find(o => o.id === orderId);
  if (!user || !order || !isSameUser(user, order.buyerId, order.buyerUsername)) return { ok: false, message: 'Bạn không phải người mua của đơn hàng này.' };
  if (order.status !== 'shipped') return { ok: false, message: 'Người bán chưa giao hàng.' };
  completeOrder(order);
  notifyChanges(false);
  return { ok: true, message: 'Giao dịch hoàn tất. Cảm ơn bạn đã mua hàng trên PCBid!' };
}

/**
 * Công cụ demo: kết thúc phiên ngay để xác định người thắng
 * @param {Object} product - Phiên đang diễn ra
 * @returns {Promise<void>}
 */
export async function endAuctionNowForDemo(product) {
  updateProduct(product, { endLocked: true, endTime: new Date(Date.now() - 1000).toISOString() });
  await runSettlement();
}

/**
 * Khởi động vòng quét xử lý sau đấu giá (gọi một lần trên mỗi trang từ main.js)
 */
export function startSettlement() {
  if (window.__pcbidSettlementStarted) return;
  window.__pcbidSettlementStarted = true;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await runSettlement();
    } catch (e) {
      console.warn('[PCBid] Lỗi xử lý sau đấu giá:', e);
    } finally {
      busy = false;
    }
  };
  tick();
  setInterval(tick, TICK_MS);
}
