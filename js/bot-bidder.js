/* ==========================================================================
   PCBid - Mô phỏng người đặt giá tự động (bot-bidder.js)
   ==========================================================================
   Đồ án không có server nên "người dùng khác" được mô phỏng bằng bot chạy ngay
   trên trình duyệt:
   - Cứ 15 - 60 giây (ngẫu nhiên), một người dùng mẫu trong MOCK_BIDDERS đặt giá
     THẬT vào một phiên còn mở: lượt đặt được ghi vào pcbid_bids giống hệt lượt
     của người dùng, nên lịch sử đặt giá, giá hiện tại, hồ sơ công khai, thông
     báo "bị vượt giá" và băng chuyền trang chủ đều cập nhật theo.
   - Nhiều tab cùng mở: chỉ một tab giữ "khóa" để chạy bot (nhịp chung lưu trong
     localStorage). Tab đang ẩn sẽ nhường khóa cho tab khác.
   - Bot không đặt vào phiên đã kết thúc, không tự vượt giá chính mình, không đặt
     vào phiên của chính nó và dừng ở mức trần 85 - 94% giá thị trường.
   ========================================================================== */

import { isAuctionClosed } from './auction-time.js';
// Bot không đặt giá vào phiên đang chờ kiểm định
import { isAwaitingInspection } from './inspection.js';
// Không đặt giá vào bài chưa duyệt hoặc đang bị ẩn / gỡ
import { isPubliclyListed, isListingVisible, isUserDeleted } from './moderation.js';
import { MOCK_BIDDERS } from './accounts.js';
import { loadAllAuctions, buildBidHistory, readAllBids } from './bid-history.js';
import { readLoggedInUser } from './user-data.js';

// Khóa localStorage dùng riêng cho bot
const BOT_STATE_KEY = 'pcbid_bot_state';
const BOT_SEEDED_KEY = 'pcbid_bot_seeded';

// Nhịp đặt giá: ngẫu nhiên từ 15 đến 60 giây
const MIN_DELAY_MS = 15 * 1000;
const MAX_DELAY_MS = 60 * 1000;
// Chu kỳ kiểm tra và thời gian khóa hết hạn (tab giữ khóa bị đóng)
const TICK_MS = 2000;
const LOCK_TTL_MS = 7000;
// Giới hạn số lượt bot lưu trong localStorage để không phình dữ liệu
const MAX_BOT_BIDS = 400;

// ID ngẫu nhiên của tab hiện tại
const TAB_ID = `tab_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Số nguyên ngẫu nhiên trong khoảng [min, max]
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Chọn ngẫu nhiên một phần tử trong mảng
 * @param {Array} list
 * @returns {*}
 */
function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Đọc trạng thái chung của bot (tab giữ khóa, thời điểm đặt giá kế tiếp)
 * @returns {{owner?: string, heartbeat?: number, nextAt?: number}}
 */
function readState() {
  try {
    return JSON.parse(localStorage.getItem(BOT_STATE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

/**
 * Ghi trạng thái chung của bot
 * @param {Object} state
 */
function writeState(state) {
  try {
    localStorage.setItem(BOT_STATE_KEY, JSON.stringify(state));
  } catch {
    // Bỏ qua khi localStorage đầy hoặc bị chặn
  }
}

/**
 * Mức giá trần bot sẵn sàng trả cho một phiên (85 - 94% giá thị trường, cố định theo ID)
 * @param {Object} product
 * @returns {number}
 */
function getPriceCap(product) {
  const market = Number(product.marketPriceNew) || Number(product.currentBid) * 1.5;
  const ratio = 0.85 + (Number(product.id) % 10) / 100;
  return market * ratio;
}

/**
 * Báo cho các trang biết vừa có lượt đặt giá mới trong cùng tab
 * (tab khác nhận sự kiện storage gốc của trình duyệt)
 * @param {Object} bid - Lượt đặt giá vừa lưu
 */
function notifyBidPlaced(bid) {
  window.dispatchEvent(new CustomEvent('pcbid:bid-placed', { detail: bid }));
  try {
    window.dispatchEvent(new StorageEvent('storage', { key: 'pcbid_bids' }));
  } catch {
    // Trình duyệt cũ không hỗ trợ tạo StorageEvent: bỏ qua
  }
}

/**
 * Chọn phiên để bot đặt giá: ưu tiên phiên người dùng đang tham gia / đang đăng bán
 * và phiên sắp kết thúc để diễn biến trông tự nhiên
 * @param {Array} candidates - Các phiên hợp lệ
 * @param {Array} allBids - Toàn bộ lượt đặt giá thật
 * @returns {Object|null}
 */
function chooseAuction(candidates, allBids) {
  if (!candidates.length) return null;
  const user = readLoggedInUser();
  const roll = Math.random();

  if (user && roll < 0.3) {
    const involvedIds = new Set(allBids
      .filter(b => (b.bidderId ? b.bidderId === user.id : b.bidderName === user.username))
      .map(b => Number(b.productId)));
    const involved = candidates.filter(p => involvedIds.has(p.id) || p.seller === user.username);
    if (involved.length) return pickOne(involved);
  }
  if (roll < 0.6) {
    const endingSoon = candidates.filter(p => p.endTimestamp - Date.now() < 12 * 3600 * 1000);
    if (endingSoon.length) return pickOne(endingSoon);
  }
  return pickOne(candidates);
}

/**
 * Bot đặt một lượt giá thật vào một phiên còn mở
 * @param {Object} [options]
 * @param {number} [options.timestamp] - Mốc thời gian lượt đặt (mặc định là hiện tại)
 * @param {Set<number>} [options.excludeIds] - Các phiên không chọn (dùng khi khởi tạo nhiều lượt)
 * @returns {Promise<Object|null>} Lượt đặt giá vừa lưu
 */
export async function placeBotBid({ timestamp = Date.now(), excludeIds = new Set() } = {}) {
  const auctions = await loadAllAuctions();
  const allBids = readAllBids();
  const now = Date.now();

  const candidates = auctions.filter(p =>
    !isAuctionClosed(p) &&
    !p.closedEarly &&
    !isAwaitingInspection(p, now) &&
    isPubliclyListed(p) &&
    isListingVisible(p) &&
    !excludeIds.has(p.id) &&
    p.endTimestamp - now > 60 * 1000 &&
    Number(p.currentBid) + (Number(p.bidStep) || 100000) <= getPriceCap(p)
  );
  const product = chooseAuction(candidates, allBids);
  if (!product) return null;

  // Người đang dẫn đầu theo đúng bảng lịch sử: bot khác người đó và khác người bán
  const history = buildBidHistory(product, allBids);
  const leaderName = history[0]?.bidderName;
  // Bot bị Quản trị viên xóa tài khoản thì không đặt giá nữa
  const bots = MOCK_BIDDERS.filter(b => b.username !== leaderName && b.username !== product.seller && !isUserDeleted(b.username));
  if (!bots.length) return null;
  const bot = pickOne(bots);

  // Mức giá: giá cao nhất hiện tại + 1 bước (thỉnh thoảng nhảy 2 bước)
  const step = Number(product.bidStep) || 100000;
  const topAmount = Math.max(Number(product.currentBid) || 0, history[0]?.amount || 0);
  const amount = topAmount + step * (Math.random() < 0.2 ? 2 : 1);

  const bid = {
    id: `bid_bot_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
    productId: product.id,
    bidderId: bot.id,
    bidderFullname: bot.fullname,
    bidderName: bot.username,
    amount,
    timestamp: new Date(timestamp).toISOString(),
    isBot: true
  };

  try {
    // Lưu lượt đặt (mới nhất đứng đầu) và cắt bớt lượt bot cũ khi quá giới hạn
    let bids = [bid, ...allBids];
    let botCount = 0;
    bids = bids.filter(b => !b.isBot || ++botCount <= MAX_BOT_BIDS);
    localStorage.setItem('pcbid_bids', JSON.stringify(bids));

    // Cập nhật giá hiện tại và số lượt của phiên trong pcbid_products (giống khi người dùng đặt giá)
    const products = JSON.parse(localStorage.getItem('pcbid_products') || '[]');
    const index = products.findIndex(p => Number(p.id) === product.id);
    const updated = { ...product, currentBid: amount, bidCount: (Number(product.bidCount) || 0) + 1 };
    delete updated.endTimestamp;
    if (index >= 0) products[index] = { ...products[index], currentBid: updated.currentBid, bidCount: updated.bidCount };
    else products.push(updated);
    localStorage.setItem('pcbid_products', JSON.stringify(products));
  } catch {
    return null;
  }

  notifyBidPlaced(bid);
  return bid;
}

/**
 * Lần đầu chạy: tạo sẵn vài lượt đặt của bot trong vài phút gần đây
 * để băng chuyền trang chủ có nội dung ngay
 */
async function seedInitialBids() {
  if (localStorage.getItem(BOT_SEEDED_KEY)) return;
  localStorage.setItem(BOT_SEEDED_KEY, '1');
  const used = new Set();
  // Lượt cũ nhất trước để thứ tự thời gian hợp lý
  let time = Date.now() - 6 * 60 * 1000;
  for (let i = 0; i < 6; i++) {
    time += randomBetween(25, 60) * 1000;
    const bid = await placeBotBid({ timestamp: Math.min(time, Date.now()), excludeIds: used });
    if (bid) used.add(bid.productId);
  }
}

/**
 * Một nhịp kiểm tra: giữ khóa nếu được và đặt giá khi đến hạn
 */
let busy = false;
async function tick() {
  if (busy || document.hidden) return;
  const now = Date.now();
  const state = readState();

  // Tab khác đang giữ khóa và vẫn hoạt động: không làm gì
  if (state.owner && state.owner !== TAB_ID && now - (state.heartbeat || 0) < LOCK_TTL_MS) return;

  const nextAt = state.nextAt && state.nextAt > now - MAX_DELAY_MS ? state.nextAt : now + randomBetween(MIN_DELAY_MS, MAX_DELAY_MS);
  writeState({ owner: TAB_ID, heartbeat: now, nextAt });
  if (now < nextAt) return;

  busy = true;
  try {
    await placeBotBid();
  } finally {
    writeState({ owner: TAB_ID, heartbeat: Date.now(), nextAt: Date.now() + randomBetween(MIN_DELAY_MS, MAX_DELAY_MS) });
    busy = false;
  }
}

/**
 * Khởi động bot đặt giá (gọi một lần trên mỗi trang từ main.js)
 */
export function startBotBidding() {
  if (window.__pcbidBotStarted) return;
  window.__pcbidBotStarted = true;

  seedInitialBids().catch(() => {});
  setInterval(() => { tick().catch(() => {}); }, TICK_MS);

  // Tab bị ẩn hoặc đóng: nhả khóa để tab khác chạy tiếp ngay
  const releaseLock = () => {
    const state = readState();
    if (state.owner === TAB_ID) writeState({ ...state, owner: null, heartbeat: 0 });
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseLock(); });
  window.addEventListener('pagehide', releaseLock);
}
