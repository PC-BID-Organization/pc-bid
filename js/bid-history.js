/* ==========================================================================
   PCBid - Lịch sử đặt giá dùng chung (bid-history.js)
   ==========================================================================
   Trang chi tiết phiên hiển thị lịch sử gồm lượt đặt giá thật (pcbid_bids) và
   lượt mẫu sinh cố định theo ID sản phẩm. Module này gom toàn bộ logic đó về
   một chỗ để:
   - product-detail.html render bảng lịch sử
   - Hồ sơ công khai (profile.html?user=...) tính "Phiên đang tham gia" của
     người dùng mẫu từ ĐÚNG lịch sử đó → bấm vào phiên sẽ thấy tên họ trong bảng
   - Menu avatar ở header đếm số phiên đang đăng bán
   ========================================================================== */

import { getAuctionEndTimestamp, isAuctionClosed, mergeLocalProduct } from './auction-time.js';
import { MOCK_BIDDERS, DEMO_ACCOUNTS } from './accounts.js';
// Phiên tham gia mẫu của tài khoản demo để lịch sử đặt giá có đúng lượt "Giá bạn đã đặt"
import { DEFAULT_PARTICIPATING_BY_USER } from './wallet.js';

// Danh sách tệp catalog linh kiện trong thư mục data/
export const CATALOG_FILES = ['cpu', 'gpu', 'mainboard', 'ram', 'storage', 'psu', 'cooling', 'case'];

/**
 * Đọc an toàn một mảng JSON trong localStorage
 * @param {string} key - Khóa localStorage
 * @returns {Array}
 */
function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/**
 * Đọc toàn bộ lượt đặt giá thật đã lưu
 * @returns {Array}
 */
export function readAllBids() {
  return readArray('pcbid_bids');
}

// Bộ nhớ đệm catalog để không fetch lại nhiều lần trong cùng một trang
let catalogPromise = null;

/**
 * Nạp catalog gốc từ các tệp JSON (chỉ fetch một lần mỗi trang)
 * @returns {Promise<Array>}
 */
function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = Promise.all(CATALOG_FILES.map(async name => {
      try {
        const res = await fetch(`data/${name}.json`);
        return res.ok ? await res.json() : [];
      } catch {
        return [];
      }
    })).then(lists => lists.flat());
  }
  return catalogPromise;
}

/**
 * Nạp toàn bộ phiên đấu giá: catalog gộp bản cập nhật localStorage + phiên người dùng tự đăng.
 * Giá hiện tại / số lượt bid được đồng bộ với lượt đặt giá thật giống trang chi tiết.
 * @returns {Promise<Array>}
 */
export async function loadAllAuctions() {
  const localProducts = readArray('pcbid_products');
  const localMap = new Map(localProducts.map(p => [Number(p.id), p]));
  const catalog = (await loadCatalog()).map(p => mergeLocalProduct(p, localMap.get(Number(p.id))));
  const catalogIds = new Set(catalog.map(p => Number(p.id)));
  const custom = localProducts.filter(p => !catalogIds.has(Number(p.id)));

  // Tổng hợp giá cao nhất và số lượt đặt thật theo từng sản phẩm
  const summary = new Map();
  readAllBids().forEach(b => {
    const pid = Number(b.productId);
    const cur = summary.get(pid) || { maxBid: 0, count: 0 };
    cur.maxBid = Math.max(cur.maxBid, Number(b.amount) || 0);
    cur.count += 1;
    summary.set(pid, cur);
  });

  return [...custom, ...catalog].map(p => {
    const item = { ...p, id: Number(p.id) };
    item.currentBid = Number(item.currentBid || item.startingPrice || 0);
    item.bidCount = Number(item.bidCount || 0);
    const info = summary.get(item.id);
    if (info && !isAuctionClosed(item)) {
      item.currentBid = Math.max(item.currentBid, info.maxBid);
      item.bidCount = Math.max(item.bidCount, info.count);
    }
    item.endTimestamp = getAuctionEndTimestamp(item);
    return item;
  });
}

/**
 * Tạo danh sách lượt đặt giá mẫu (mock data) cho một phiên.
 * Sinh cố định theo ID sản phẩm: cùng dữ liệu đầu vào luôn ra cùng người đặt và mức giá.
 * Các lượt lùi dần đều về số tiền và thời gian, không bao giờ thấp hơn giá khởi điểm.
 * @param {Object} product - Phiên đấu giá (cần id, currentBid, startingPrice, bidStep, bidCount, endTimestamp)
 * @param {Array} realBids - Lượt đặt giá thật của phiên, đã sắp xếp giảm dần theo giá
 * @returns {Array}
 */
export function buildMockBids(product, realBids = []) {
  if (!product) return [];
  const productId = Number(product.id);

  // Người đặt giá mẫu lấy từ accounts.js (mỗi người có họ tên và UID cố định)
  const mockNames = MOCK_BIDDERS.map(person => person.username);

  const bidStep = Number(product.bidStep) || 100000;
  const startPrice = Number(product.startingPrice) || 1000000;

  // Số lượt mẫu cần sinh = tổng lượt bid của phiên trừ đi số lượt thật đã lưu
  const totalBids = Number(product.bidCount) || 0;
  const needed = Math.max(0, totalBids - realBids.length);
  if (needed === 0) return [];

  // Bộ sinh số giả ngẫu nhiên theo ID sản phẩm để lịch sử không đổi mỗi lần render
  let seed = (productId || 1) * 9301 + 49297;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Điểm xuất phát: ngay dưới lượt thật thấp nhất, hoặc giá hiện tại nếu chưa có lượt thật
  let price;
  let time;
  if (realBids.length > 0) {
    const lowest = realBids[realBids.length - 1];
    price = Number(lowest.amount) - bidStep;
    time = new Date(lowest.timestamp).getTime();
  } else {
    price = Number(product.currentBid) || (startPrice + bidStep * 3);
    // Mốc thời gian lượt cao nhất không vượt quá thời điểm kết thúc phiên
    const endAt = Number(product.endTimestamp) || new Date(product.endTime).getTime();
    time = Math.min(Date.now(), Number.isFinite(endAt) ? endAt : Date.now());
  }

  const result = [];
  let previousName = '';
  for (let i = 0; i < needed; i++) {
    if (price < startPrice) break;

    // Lượt cao nhất giữ nguyên mốc thời gian, các lượt trước lùi lại 15 - 45 phút
    if (i > 0) time -= (Math.floor(random() * 30) + 15) * 60 * 1000;

    // Chọn người đặt khác với lượt liền kề (không tự vượt giá chính mình)
    let name = mockNames[Math.floor(random() * mockNames.length)];
    // Phiên đã chốt: lượt cao nhất luôn là của người thắng
    if (i === 0 && realBids.length === 0 && product.winner) name = product.winner;
    if (name === previousName) name = mockNames[(mockNames.indexOf(name) + 1) % mockNames.length];
    previousName = name;

    result.push({
      id: `mock_${productId}_${i}`,
      productId,
      bidderName: name,
      amount: price,
      timestamp: new Date(time).toISOString()
    });

    // Chia đều khoảng giá còn lại cho số lượt còn lại để lượt cuối không thấp hơn giá khởi điểm
    const remaining = needed - i - 1;
    if (remaining <= 0) break;
    const stepsLeft = Math.floor((price - startPrice) / bidStep);
    const maxSteps = Math.max(1, Math.floor(stepsLeft / remaining));
    price -= (1 + Math.floor(random() * maxSteps)) * bidStep;
  }

  // Gắn lượt đặt giá mẫu của tài khoản demo vào đúng mức giá đã ghi ở thẻ "Phiên đang tham gia",
  // để bảng lịch sử hiện đúng tên người đặt thay vì một người dùng ảo khác
  Object.entries(DEFAULT_PARTICIPATING_BY_USER).forEach(([username, list]) => {
    const item = list.find(x => Number(x.id) === productId);
    if (!item) return;
    const account = DEMO_ACCOUNTS.find(a => a.username === username);
    // Người dùng đã có lượt đặt thật trên phiên này: lịch sử thật đã thể hiện, không gắn thêm
    if (realBids.some(b => (account && b.bidderId === account.id) || b.bidderName === username)) return;
    const myBid = Number(item.myBid);
    let index = result.findIndex(b => b.amount === myBid);
    if (index === -1) {
      // Không có lượt trùng mức giá: dùng lượt ngay dưới và nâng lên đúng mức (vẫn giữ thứ tự giảm dần)
      index = result.findIndex(b => b.amount < myBid);
      if (index < 1) return;
      result[index].amount = myBid;
    }
    result[index].bidderName = username;
    if (account) result[index].bidderId = account.id;
  });
  return result;
}

/**
 * Lịch sử đặt giá đầy đủ của một phiên (thật + mẫu), lượt cao nhất đứng đầu
 * @param {Object} product - Phiên đấu giá
 * @param {Array} [allBids] - Toàn bộ lượt đặt giá thật (mặc định đọc từ localStorage)
 * @returns {Array}
 */
export function buildBidHistory(product, allBids = readAllBids()) {
  const byPriceThenTime = (a, b) => b.amount - a.amount || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  const realBids = allBids
    .filter(b => Number(b.productId) === Number(product.id))
    .map(b => ({ ...b, amount: Number(b.amount), timestamp: b.timestamp || new Date().toISOString() }))
    .sort(byPriceThenTime);
  return [...realBids, ...buildMockBids(product, realBids)].sort(byPriceThenTime);
}

/**
 * Kiểm tra một lượt đặt giá có thuộc về tài khoản hay không
 * (lượt thật so theo ID tài khoản; lượt mẫu / lượt cũ so theo tên đăng nhập)
 * @param {Object} bid - Lượt đặt giá
 * @param {Object} account - Tài khoản cần kiểm tra
 * @returns {boolean}
 */
function isBidOf(bid, account) {
  if (bid.bidderId && account.id) return bid.bidderId === account.id;
  return Boolean(account.username) && bid.bidderName === account.username;
}

/**
 * Các phiên CHƯA kết thúc mà tài khoản thực sự có tên trong lịch sử đặt giá
 * @param {Object} account - Tài khoản (cần username, có thể có id)
 * @param {Array} auctions - Danh sách phiên từ loadAllAuctions()
 * @returns {Array} Mỗi phần tử là phiên kèm myBid và status ('lead' | 'outbid')
 */
export function getAuctionsFromHistory(account, auctions) {
  if (!account) return [];
  const now = Date.now();
  const allBids = readAllBids();
  const result = [];
  auctions.forEach(product => {
    if (isAuctionClosed(product) || product.endTimestamp <= now) return;
    const history = buildBidHistory(product, allBids);
    const mine = history.filter(bid => isBidOf(bid, account));
    if (!mine.length) return;
    result.push({
      ...product,
      currentBid: history[0].amount,
      myBid: mine[0].amount,
      status: isBidOf(history[0], account) ? 'lead' : 'outbid'
    });
  });
  // Phiên sắp kết thúc lên trước
  return result.sort((a, b) => a.endTimestamp - b.endTimestamp);
}

/**
 * Các phiên tài khoản đã đăng bán (mọi trạng thái)
 * @param {string} username - Tên đăng nhập người bán
 * @param {Array} auctions - Danh sách phiên từ loadAllAuctions()
 * @returns {Array}
 */
export function getSellingAuctions(username, auctions) {
  return username ? auctions.filter(p => p.seller === username) : [];
}
