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
   - walletBalance trong localStorage là TỔNG tiền trong ví.
     Số dư khả dụng = walletBalance - tiền đang giữ cọc.
   ========================================================================== */

import { getAuctionEndTimestamp } from './auction-time.js';

// Tỷ lệ tiền cọc trên mỗi mức giá đặt
export const DEPOSIT_RATE = 0.1;

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

  // Tìm tất cả sản phẩm mà người dùng hiện tại ĐÃ THỰC SỰ ĐẶT GIÁ trong localBids
  const userRealBids = localBids.filter(b => 
    b.bidderName === currentUsername || 
    b.bidderName === currentUser?.username || 
    b.bidderName === currentUser?.email
  );

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
    const myBidsOnItem = allBidsOnItem.filter(b => 
      b.bidderName === currentUsername || 
      b.bidderName === currentUser?.username || 
      b.bidderName === currentUser?.email
    );

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
      const topBidder = allBidsOnItem[0].bidderName;
      const isTopBidderMe = (topBidder === currentUsername || topBidder === currentUser?.username);
      isLead = isTopBidderMe && (myHighestBid >= currentHighestBid);
    } else {
      isLead = myHighestBid >= currentHighestBid;
    }

    return {
      ...item,
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
  return getParticipatingAuctions(user)
    .filter(item => item.status === 'lead' && getAuctionEndTimestamp(item) > now)
    .map(item => ({
      id: Number(item.id),
      name: item.name,
      myBid: Number(item.myBid) || 0,
      deposit: calcDeposit(item.myBid)
    }));
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
  return Math.max(0, (Number(user.walletBalance) || 0) - getDepositHold(user));
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
  const available = Math.max(0, (Number(user?.walletBalance) || 0) - getDepositHold(user, productId));
  return { ok: available >= required, required, available };
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

  const notifications = getParticipatingAuctions(user).map(item => {
    const endTimestamp = getAuctionEndTimestamp(item);
    const remaining = endTimestamp - now;
    const base = { productId: Number(item.id), endTimestamp };

    // Phiên đã kết thúc
    if (remaining <= 0) {
      return item.status === 'lead'
        ? { ...base, id: `won_${item.id}`, type: 'success', important: false,
            title: 'Bạn đã thắng phiên đấu giá',
            message: `${item.name} — giá chốt ${formatVnd(item.myBid)}.` }
        : { ...base, id: `ended_${item.id}`, type: 'muted', important: false,
            title: 'Phiên đấu giá đã kết thúc',
            message: `${item.name} — bạn không thắng phiên này, tiền cọc đã được hoàn về ví.` };
    }

    // Bị vượt giá: cần hành động
    if (item.status !== 'lead') {
      return { ...base, id: `outbid_${item.id}`, type: 'danger', important: true,
        title: 'Bạn đã bị vượt giá',
        message: `${item.name} — giá cao nhất hiện tại ${formatVnd(item.currentBid)}, bạn đã đặt ${formatVnd(item.myBid)}.` };
    }

    // Đang dẫn đầu nhưng phiên sắp kết thúc
    if (remaining <= ENDING_SOON_MS) {
      return { ...base, id: `ending_${item.id}`, type: 'warning', important: true,
        title: 'Phiên sắp kết thúc — bạn đang dẫn đầu',
        message: `${item.name} — còn chưa đến ${Math.max(1, Math.ceil(remaining / 60000))} phút, giá của bạn ${formatVnd(item.myBid)}.` };
    }

    // Đang dẫn đầu
    return { ...base, id: `lead_${item.id}`, type: 'success', important: false,
      title: 'Bạn đang dẫn đầu',
      message: `${item.name} — giá của bạn ${formatVnd(item.myBid)}, đang tạm giữ cọc ${formatVnd(calcDeposit(item.myBid))}.` };
  });

  // Thông báo cần hành động lên đầu, sau đó theo thời gian kết thúc gần nhất
  return notifications.sort((a, b) => (b.important - a.important) || (a.endTimestamp - b.endTimestamp));
}
