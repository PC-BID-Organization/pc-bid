/* ==========================================================================
   PCBid - Module ví ảo & tiền cọc đấu giá dùng chung (wallet.js)
   ==========================================================================
   Quy tắc giữ cọc mô phỏng:
   - Mỗi phiên người dùng ĐANG DẪN ĐẦU và CHƯA KẾT THÚC sẽ bị tạm giữ 10% mức giá
     cao nhất mà người đó đã đặt.
   - Bị người khác vượt giá hoặc phiên kết thúc  -> tiền cọc tự động được trả lại
     (vì số tiền giữ cọc được tính lại từ dữ liệu, không lưu cố định).
   - Đặt giá mới trên phiên mình đang dẫn đầu -> chỉ giữ 10% của mức giá mới
     (không cộng dồn với lượt cũ).
   - Thắng phiên: cọc TIẾP TỤC bị giữ trong lúc chờ thanh toán (đơn "Chờ thanh toán"),
     thanh toán xong thì trừ toàn bộ giá chốt; quá hạn thì mất cọc (xem settlement.js).
   - Tổng tiền ví = walletBalance (số dư gốc + tiền nạp) + tổng các giao dịch trong sổ
     pcbid_wallet_ledger (thanh toán, nhận tiền bán hàng, mất / nhận cọc).
     Số dư khả dụng = tổng tiền ví - tiền đang giữ cọc.
   ========================================================================== */

import { getAuctionEndTimestamp } from './auction-time.js';
// Lưu trạng thái đã đọc của thông báo theo từng tài khoản
import { USER_LIST_KEYS, readUserList, writeUserList } from './user-data.js';

// Tỷ lệ tiền cọc trên mỗi mức giá đặt
export const DEPOSIT_RATE = 0.1;

// Khóa localStorage của đơn hàng sau đấu giá và sổ giao dịch ví
export const ORDERS_KEY = 'pcbid_orders';
export const LEDGER_KEY = 'pcbid_wallet_ledger';

/**
 * Đọc an toàn một mảng trong localStorage
 * @param {string} key
 * @returns {Array}
 */
function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/**
 * Kiểm tra bản ghi (đơn hàng / giao dịch) có thuộc về tài khoản không
 * @param {Object} user - Tài khoản
 * @param {string} [id] - ID tài khoản trong bản ghi
 * @param {string} [username] - Tên đăng nhập trong bản ghi
 * @returns {boolean}
 */
export function isSameUser(user, id, username) {
  if (!user) return false;
  if (id && user.id) return id === user.id;
  return Boolean(username) && username === user.username;
}

/**
 * Đọc toàn bộ đơn hàng sau đấu giá
 * @returns {Array}
 */
export function readOrders() {
  return readList(ORDERS_KEY);
}

/**
 * Đọc sổ giao dịch ví
 * @returns {Array}
 */
export function readLedger() {
  return readList(LEDGER_KEY);
}

/**
 * Tổng tiền trong ví = số dư gốc (gồm tiền nạp) + các giao dịch trong sổ
 * @param {Object} user - Người dùng
 * @returns {number}
 */
export function getWalletTotal(user) {
  if (!user) return 0;
  const ledgerSum = readLedger()
    .filter(tx => isSameUser(user, tx.userId, tx.username))
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  return (Number(user.walletBalance) || 0) + ledgerSum;
}

// Danh sách phiên đang tham gia mẫu chuẩn cho từng tài khoản demo
// Giúp mô phỏng hoàn hảo kịch bản 2 tài khoản (bidder1 và bidder2) trả giá đối kháng vượt giá nhau
export const DEFAULT_PARTICIPATING_BY_USER = {
  bidder1: [
    {
      id: 2011,
      name: "Card màn hình ASUS ROG Strix GeForce RTX 3070 8GB OC",
      category: "GPU",
      status: "lead", // Đang dẫn đầu
      currentBid: 8400000,
      myBid: 8400000,
      bidStep: 100000,
      bidCount: 19,
      marketPriceNew: 15000000,
      endTimestamp: Date.now() + 2 * 3600 * 1000 + 45 * 60 * 1000,
      images: ["images/products/gpu/2011-rtx-3070-8gb-1.webp"],
      specs: ["8GB GDDR6", "Furmark 65°C"]
    },
    {
      id: 1023,
      name: "Bộ vi xử lý AMD Ryzen 7 5800X3D (8C/16T, 96MB V-Cache)",
      category: "CPU",
      status: "outbid", // Đã bị bidder2 vượt giá
      currentBid: 8100000,
      myBid: 7900000,
      bidStep: 100000,
      bidCount: 25,
      marketPriceNew: 9500000,
      endTimestamp: Date.now() + 4 * 3600 * 1000 + 15 * 60 * 1000,
      images: ["images/products/cpu/1023-ryzen-7-5800x3d-1.jpg"],
      specs: ["Socket AM4", "3.4GHz - 4.5GHz"]
    },
    {
      id: 3013,
      name: "Bo mạch chủ MSI MAG Z790 TOMAHAWK WIFI DDR5",
      category: "Mainboard",
      status: "lead", // Đang dẫn đầu
      currentBid: 5800000,
      myBid: 5800000,
      bidStep: 100000,
      bidCount: 7,
      marketPriceNew: 7690000,
      endTimestamp: Date.now() + 18 * 3600 * 1000,
      images: ["images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg"],
      specs: ["LGA 1700", "Micro-ATX"]
    },
    {
      id: 4011,
      name: "RAM Corsair Vengeance RGB 32GB (2x16GB) 6000MHz DDR5 Black",
      category: "RAM",
      status: "outbid", // Bị vượt giá
      currentBid: 3050000,
      myBid: 2950000,
      bidStep: 50000,
      bidCount: 9,
      marketPriceNew: 3990000,
      endTimestamp: Date.now() + 52 * 60 * 1000,
      images: ["images/products/ram/4011-corsair-vengeance-rgb-ddr5-black-1.jpg"],
      specs: ["32GB (2x16GB)", "DDR5 6000MHz"]
    }
  ],
  bidder2: [
    {
      id: 4011,
      name: "RAM Corsair Vengeance RGB 32GB (2x16GB) 6000MHz DDR5 Black",
      category: "RAM",
      status: "lead", // Đang dẫn đầu (trả 3tr05 cao hơn bidder1)
      currentBid: 3050000,
      myBid: 3050000,
      bidStep: 50000,
      bidCount: 9,
      marketPriceNew: 3990000,
      endTimestamp: Date.now() + 52 * 60 * 1000,
      images: ["images/products/ram/4011-corsair-vengeance-rgb-ddr5-black-1.jpg"],
      specs: ["32GB (2x16GB)", "DDR5 6000MHz"]
    },
    {
      id: 1023,
      name: "Bộ vi xử lý AMD Ryzen 7 5800X3D (8C/16T, 96MB V-Cache)",
      category: "CPU",
      status: "lead", // Đang dẫn đầu (trả 8tr1 cao hơn bidder1)
      currentBid: 8100000,
      myBid: 8100000,
      bidStep: 100000,
      bidCount: 25,
      marketPriceNew: 9500000,
      endTimestamp: Date.now() + 4 * 3600 * 1000 + 15 * 60 * 1000,
      images: ["images/products/cpu/1023-ryzen-7-5800x3d-1.jpg"],
      specs: ["Socket AM4", "3.4GHz - 4.5GHz"]
    },
    {
      id: 2011,
      name: "Card màn hình ASUS ROG Strix GeForce RTX 3070 8GB OC",
      category: "GPU",
      status: "outbid", // Bị bidder1 vượt giá (8tr2 vs 8tr4)
      currentBid: 8400000,
      myBid: 8200000,
      bidStep: 100000,
      bidCount: 19,
      marketPriceNew: 15000000,
      endTimestamp: Date.now() + 2 * 3600 * 1000 + 45 * 60 * 1000,
      images: ["images/products/gpu/2011-rtx-3070-8gb-1.webp"],
      specs: ["8GB GDDR6", "Furmark 65°C"]
    },
    {
      id: 3013,
      name: "Bo mạch chủ MSI MAG Z790 TOMAHAWK WIFI DDR5",
      category: "Mainboard",
      status: "outbid", // Bị bidder1 vượt giá (5tr6 vs 5tr8)
      currentBid: 5800000,
      myBid: 5600000,
      bidStep: 100000,
      bidCount: 7,
      marketPriceNew: 7690000,
      endTimestamp: Date.now() + 18 * 3600 * 1000,
      images: ["images/products/mainboard/3013-msi-mag-z790-tomahawk-1.jpg"],
      specs: ["LGA 1700", "Micro-ATX"]
    }
  ]
};


/**
 * Tổng hợp danh sách phiên người dùng đang tham gia kèm trạng thái dẫn đầu / bị vượt giá
 * (dữ liệu mẫu theo tài khoản + các lượt đặt giá thực tế trong pcbid_bids)
 * @param {Object|null} currentUser - Người dùng hiện tại
 * @returns {Array}
 */
export function getParticipatingAuctions(currentUser) {
  // Chưa đăng nhập: không có phiên nào đang tham gia
  if (!currentUser) return [];
  const currentUsername = currentUser.username || currentUser.fullname;

  // 1. Lấy danh sách phiên mẫu riêng của tài khoản demo (bidder1 hoặc bidder2).
  //    Tài khoản mới đăng ký / tài khoản khác bắt đầu với danh sách trống, chỉ có các phiên tự đặt giá
  const defaultList = DEFAULT_PARTICIPATING_BY_USER[currentUsername] || [];

  // 2. Đọc danh sách sản phẩm và các lượt bid từ localStorage
  let localProducts = [];
  try { localProducts = JSON.parse(localStorage.getItem('pcbid_products') || '[]'); } catch {}
  const prodMap = new Map(localProducts.map(p => [Number(p.id), p]));

  let localBids = [];
  try { localBids = JSON.parse(localStorage.getItem('pcbid_bids') || '[]'); } catch {}

  // 3. Xây dựng bản đồ các sản phẩm tham gia riêng cho người dùng hiện tại
  const userItemsMap = new Map();

  // Khởi tạo trước với các sản phẩm mẫu của người dùng này
  defaultList.forEach(item => {
    userItemsMap.set(Number(item.id), { ...item });
  });

  // Lượt bid thuộc về người dùng: so khớp theo ID tài khoản (không trùng);
  // lượt bid cũ chưa có bidderId thì so theo tên đăng nhập / email như trước
  const isMyBid = b => (b.bidderId
    ? b.bidderId === currentUser.id
    : (b.bidderName === currentUsername || b.bidderName === currentUser?.username || b.bidderName === currentUser?.email));

  // Tìm tất cả sản phẩm mà người dùng hiện tại ĐÃ THỰC SỰ ĐẶT GIÁ trong localBids
  const userRealBids = localBids.filter(isMyBid);

  userRealBids.forEach(bid => {
    const pId = Number(bid.productId);
    if (!userItemsMap.has(pId)) {
      const prod = prodMap.get(pId);
      if (prod) {
        userItemsMap.set(pId, {
          id: pId,
          name: prod.name,
          category: prod.category || 'Linh kiện',
          currentBid: Number(prod.currentBid) || Number(bid.amount),
          myBid: Number(bid.amount),
          bidStep: Number(prod.bidStep) || 100000,
          bidCount: Number(prod.bidCount) || 1,
          marketPriceNew: Number(prod.marketPriceNew) || Number(prod.currentBid) * 1.5,
          endTimestamp: getAuctionEndTimestamp(prod),
          images: prod.images || ['images/products/gpu/2018-rtx-4070-12gb-1.webp'],
          specs: prod.specifications ? Object.entries(prod.specifications).slice(0, 2).map(([k, v]) => `${k}: ${v}`) : []
        });
      }
    }
  });

  // 4. Với mỗi sản phẩm, tính toán độc lập giá của người này (myBid) và giá cao nhất hiện tại (currentBid)
  return Array.from(userItemsMap.values()).map(item => {
    const idNum = Number(item.id);
    const prod = prodMap.get(idNum);

    // Lấy toàn bộ các lượt bid trên sản phẩm này, sắp xếp giảm dần theo số tiền
    const allBidsOnItem = localBids
      .filter(b => Number(b.productId) === idNum)
      .map(b => ({ ...b, amount: Number(b.amount) }))
      .sort((a, b) => b.amount - a.amount || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Lọc các lượt bid của CHÍNH NGƯỜI DÙNG NÀY trên sản phẩm
    const myBidsOnItem = allBidsOnItem.filter(isMyBid);

    // Xác định mức giá cao nhất mà người này đã đặt
    let myHighestBid;
    if (myBidsOnItem.length > 0) {
      myHighestBid = myBidsOnItem[0].amount;
    } else {
      // Nếu chưa có lượt đặt trong localBids, lấy giá ban đầu của tài khoản này
      myHighestBid = Number(item.myBid) || 1000000;
    }

    // Xác định giá cao nhất hiện tại của phiên đấu giá
    let currentHighestBid = Number(prod?.currentBid) || Number(item.currentBid) || myHighestBid;
    if (allBidsOnItem.length > 0) {
      if (allBidsOnItem[0].amount > currentHighestBid) {
        currentHighestBid = allBidsOnItem[0].amount;
      }
    }

    // Đánh giá trạng thái: Ai đang dẫn đầu phiên?
    let isLead = false;
    if (allBidsOnItem.length > 0) {
      isLead = isMyBid(allBidsOnItem[0]) && (myHighestBid >= currentHighestBid);
    } else {
      isLead = myHighestBid >= currentHighestBid;
    }

    // Phiên bị người bán đóng sớm hoặc đăng bán lại: dùng thời hạn mới trong pcbid_products
    // Phiên đã khóa thời điểm kết thúc / đã chốt kết quả: dùng đúng mốc kết thúc và trạng thái đã lưu
    const lifecycle = prod && (prod.closedEarly || prod.relisted || prod.endLocked)
      ? {
          endTime: prod.endTime,
          closedEarly: Boolean(prod.closedEarly),
          relisted: Boolean(prod.relisted),
          endLocked: Boolean(prod.endLocked),
          ...(prod.status ? { status: prod.status } : {})
        }
      : {};

    return {
      ...item,
      ...lifecycle,
      id: idNum,
      bidStep: Number(item.bidStep) || Number(prod?.bidStep) || 100000,
      myBid: myHighestBid,
      currentBid: currentHighestBid,
      bidCount: prod?.bidCount !== undefined ? prod.bidCount : Math.max(item.bidCount || 1, allBidsOnItem.length),
      status: isLead ? 'lead' : 'outbid'
    };
  });
}

/**
 * Đọc người dùng đang đăng nhập từ localStorage
 * @returns {Object|null}
 */
export function readCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem('pcbid_currentUser') || 'null');
    if (!user || user.isLoggedIn === false) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Tính số tiền cọc cần giữ cho một mức giá đặt
 * @param {number} amount - Mức giá đặt
 * @returns {number}
 */
export function calcDeposit(amount) {
  return Math.round((Number(amount) || 0) * DEPOSIT_RATE);
}

/**
 * Lấy danh sách các phiên đang giữ cọc của người dùng
 * (đang dẫn đầu và phiên chưa kết thúc)
 * @param {Object} user - Người dùng hiện tại
 * @returns {Array<{id:number, name:string, myBid:number, deposit:number}>}
 */
export function getDepositHolds(user) {
  if (!user) return [];
  const now = Date.now();
  // Đơn thắng đấu giá đang chờ thanh toán: cọc vẫn bị giữ
  const orderHolds = readOrders()
    .filter(o => o.status === 'awaiting_payment' && isSameUser(user, o.buyerId, o.buyerUsername))
    .map(o => ({ id: Number(o.productId), name: o.productName, myBid: Number(o.finalPrice) || 0, deposit: Number(o.deposit) || 0, orderId: o.id }));
  const orderProductIds = new Set(orderHolds.map(h => h.id));
  const bidHolds = getParticipatingAuctions(user)
    .filter(item => item.status === 'lead' && getAuctionEndTimestamp(item) > now && !orderProductIds.has(Number(item.id)))
    .map(item => ({
      id: Number(item.id),
      name: item.name,
      myBid: Number(item.myBid) || 0,
      deposit: calcDeposit(item.myBid)
    }));
  return [...bidHolds, ...orderHolds];
}

/**
 * Tổng số tiền đang bị tạm giữ cọc
 * @param {Object} user - Người dùng hiện tại
 * @param {number} [excludeProductId] - Bỏ qua cọc của một phiên (dùng khi đặt giá lại chính phiên đó)
 * @returns {number}
 */
export function getDepositHold(user, excludeProductId) {
  return getDepositHolds(user)
    .filter(h => excludeProductId === undefined || h.id !== Number(excludeProductId))
    .reduce((sum, h) => sum + h.deposit, 0);
}

/**
 * Số dư khả dụng = tổng tiền ví - tiền đang giữ cọc
 * @param {Object} user - Người dùng hiện tại
 * @returns {number}
 */
export function getAvailableBalance(user) {
  if (!user) return 0;
  return Math.max(0, getWalletTotal(user) - getDepositHold(user));
}

/**
 * Kiểm tra ví có đủ tiền cọc cho một lượt đặt giá mới hay không
 * Cọc cũ của chính phiên này (nếu đang dẫn đầu) được trả lại trước khi giữ cọc mới
 * @param {Object} user - Người dùng hiện tại
 * @param {number} productId - ID phiên đấu giá
 * @param {number} amount - Mức giá muốn đặt
 * @returns {{ok:boolean, required:number, available:number}}
 */
export function checkBidDeposit(user, productId, amount) {
  const required = calcDeposit(amount);
  const available = Math.max(0, getWalletTotal(user) - getDepositHold(user, productId));
  return { ok: available >= required, required, available };
}

/**
 * Thông báo theo trạng thái đơn hàng sau đấu giá (vai trò người mua hoặc người bán)
 * @param {Object} user - Người dùng hiện tại
 * @param {Array} orders - Danh sách đơn hàng
 * @param {Function} formatVnd - Hàm định dạng tiền
 * @returns {Array}
 */
function getOrderNotifications(user, orders, formatVnd) {
  const result = [];
  orders.forEach(o => {
    const isBuyer = isSameUser(user, o.buyerId, o.buyerUsername);
    const isSeller = isSameUser(user, o.sellerId, o.sellerUsername);
    if (!isBuyer && !isSeller) return;
    const base = { productId: Number(o.productId), endTimestamp: new Date(o.updatedAt || o.createdAt).getTime() };
    const name = o.productName;
    const price = formatVnd(o.finalPrice);
    const remaining = formatVnd((Number(o.finalPrice) || 0) - (Number(o.deposit) || 0));
    const buyerMessages = {
      awaiting_payment: ['danger', true, 'Bạn đã thắng — hãy thanh toán ngay', `${name} — giá chốt ${price}. Thanh toán thêm ${remaining} trước khi hết hạn để không bị mất cọc.`],
      paid: ['success', false, 'Đã thanh toán — chờ người bán giao hàng', `${name} — đã thanh toán ${price} từ ví.`],
      shipped: ['warning', true, 'Người bán đã giao hàng', `${name} — hãy bấm "Đã nhận được hàng" khi bạn nhận đủ linh kiện.`],
      completed: ['success', false, 'Giao dịch hoàn tất', `${name} — cảm ơn bạn đã mua hàng trên PCBid.`],
      forfeited: ['danger', false, 'Quá hạn thanh toán — bạn đã mất cọc', `${name} — tiền cọc ${formatVnd(o.deposit)} đã chuyển cho người bán.`]
    };
    const sellerMessages = {
      awaiting_payment: ['success', false, 'Linh kiện đã có người thắng', `${name} — giá chốt ${price}, đang chờ người mua thanh toán.`],
      paid: ['warning', true, 'Người mua đã thanh toán — hãy giao hàng', `${name} — bấm "Xác nhận đã giao hàng" sau khi gửi linh kiện.`],
      shipped: ['muted', false, 'Đã giao hàng — chờ người mua xác nhận', `${name} — tiền ${price} sẽ vào ví khi người mua xác nhận.`],
      completed: ['success', false, 'Đã nhận tiền bán hàng', `${name} — ${price} đã được cộng vào ví của bạn.`],
      forfeited: ['muted', false, 'Người mua không thanh toán', `${name} — bạn nhận tiền cọc bồi thường ${formatVnd(o.deposit)}. Có thể đăng bán lại phiên này.`]
    };
    const message = (isBuyer ? buyerMessages : sellerMessages)[o.status];
    if (!message) return;
    const [type, important, title, text] = message;
    result.push({ ...base, id: `order_${o.id}_${isBuyer ? 'b' : 's'}_${o.status}`, type, important, title, message: text });
  });
  return result;
}

// Ngưỡng coi là "sắp kết thúc" để nhắc người dùng: 60 phút
const ENDING_SOON_MS = 60 * 60 * 1000;

/**
 * Sinh danh sách thông báo đấu giá của người dùng từ các phiên đang tham gia
 * (dữ liệu được tính lại mỗi lần gọi nên luôn khớp với trạng thái mới nhất)
 * @param {Object|null} user - Người dùng hiện tại
 * @returns {Array<{id:string, type:string, title:string, message:string, productId:number, endTimestamp:number, important:boolean}>}
 */
export function getUserNotifications(user) {
  if (!user) return [];
  const now = Date.now();
  const formatVnd = value => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')}đ`;

  const orders = readOrders();
  const orderProductIds = new Set(orders
    .filter(o => isSameUser(user, o.buyerId, o.buyerUsername) || isSameUser(user, o.sellerId, o.sellerUsername))
    .map(o => Number(o.productId)));

  const notifications = getParticipatingAuctions(user).map(item => {
    const endTimestamp = getAuctionEndTimestamp(item);
    const remaining = endTimestamp - now;
    const base = { productId: Number(item.id), endTimestamp };

    // Phiên đã kết thúc
    if (remaining <= 0) {
      // Đã có đơn hàng sau đấu giá: thông báo theo đơn (bên dưới) thay cho thông báo chung
      if (item.status === 'lead' && orderProductIds.has(Number(item.id))) return null;
      return item.status === 'lead'
        ? { ...base, id: `won_${item.id}_${item.myBid}`, type: 'success', important: false,
            title: 'Bạn đã thắng phiên đấu giá',
            message: `${item.name} — giá chốt ${formatVnd(item.myBid)}.` }
        : { ...base, id: `ended_${item.id}`, type: 'muted', important: false,
            title: 'Phiên đấu giá đã kết thúc',
            message: `${item.name} — bạn không thắng phiên này, tiền cọc đã được hoàn về ví.` };
    }

    // Bị vượt giá: cần hành động
    if (item.status !== 'lead') {
      return { ...base, id: `outbid_${item.id}_${item.currentBid}`, type: 'danger', important: true,
        title: 'Bạn đã bị vượt giá',
        message: `${item.name} — giá cao nhất hiện tại ${formatVnd(item.currentBid)}, bạn đã đặt ${formatVnd(item.myBid)}.` };
    }

    // Đang dẫn đầu nhưng phiên sắp kết thúc
    if (remaining <= ENDING_SOON_MS) {
      return { ...base, id: `ending_${item.id}_${item.myBid}`, type: 'warning', important: true,
        title: 'Phiên sắp kết thúc — bạn đang dẫn đầu',
        message: `${item.name} — còn chưa đến ${Math.max(1, Math.ceil(remaining / 60000))} phút, giá của bạn ${formatVnd(item.myBid)}.` };
    }

    // Đang dẫn đầu
    return { ...base, id: `lead_${item.id}_${item.myBid}`, type: 'success', important: false,
      title: 'Bạn đang dẫn đầu',
      message: `${item.name} — giá của bạn ${formatVnd(item.myBid)}, đang tạm giữ cọc ${formatVnd(calcDeposit(item.myBid))}.` };
  });

  notifications.push(...getOrderNotifications(user, orders, formatVnd));

  // Gắn trạng thái đã đọc. ID thông báo chứa mức giá liên quan nên khi tình huống thay đổi
  // (ví dụ bị vượt giá ở mức mới) sẽ sinh thông báo mới, chưa đọc
  const readIds = new Set(readUserList(USER_LIST_KEYS.NOTIFICATIONS_READ, user));
  const list = notifications.filter(Boolean);
  list.forEach(n => { n.read = readIds.has(n.id); });

  // Chưa đọc lên trước, rồi thông báo cần hành động, sau đó theo thời gian kết thúc gần nhất
  return list.sort((a, b) =>
    (a.read - b.read) || (b.important - a.important) || (a.endTimestamp - b.endTimestamp));
}

/**
 * Đếm số thông báo chưa đọc của người dùng (hiển thị trên chuông Header và menu Hồ sơ)
 * @param {Object|null} user - Người dùng hiện tại
 * @returns {number}
 */
export function getUnreadNotificationCount(user) {
  return getUserNotifications(user).filter(n => !n.read).length;
}

/**
 * Đánh dấu một hoặc nhiều thông báo là đã đọc.
 * Chỉ giữ lại ID của các thông báo còn tồn tại để dữ liệu không phình to theo thời gian.
 * @param {Object|null} user - Người dùng hiện tại
 * @param {Array<string>} ids - Danh sách ID thông báo cần đánh dấu
 */
export function markNotificationsRead(user, ids) {
  if (!user) return;
  const currentIds = new Set(getUserNotifications(user).map(n => n.id));
  const readIds = new Set(readUserList(USER_LIST_KEYS.NOTIFICATIONS_READ, user));
  ids.forEach(id => readIds.add(id));
  writeUserList(USER_LIST_KEYS.NOTIFICATIONS_READ, user, [...readIds].filter(id => currentIds.has(id)));

  // Báo cho Header và các thành phần khác trên cùng trang cập nhật lại số chưa đọc
  window.dispatchEvent(new CustomEvent('pcbid:notifications-updated'));
}
