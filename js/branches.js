/* ==========================================================================
   PCBid - Chi nhánh kiểm định PCBid Lab & tìm chi nhánh gần nhất (branches.js)
   ==========================================================================
   Dữ liệu chi nhánh là mock data (địa chỉ, giờ mở cửa, số điện thoại giả lập).
   Hộp thoại tìm chi nhánh:
   - Tìm theo tên / quận / thành phố, không phân biệt dấu.
   - Sắp xếp theo khoảng cách tới vị trí hiện tại (Geolocation API của trình
     duyệt) hoặc tới địa chỉ nhận hàng mặc định của người bán khi chưa cho phép
     định vị (đoán khu vực theo tên quận / tỉnh trong địa chỉ).
   - Chế độ 'select': chọn chi nhánh + cách gửi (mang trực tiếp / đơn vị vận
     chuyển kèm mã vận đơn) để gửi linh kiện đi kiểm định.
   - Chế độ 'browse': chỉ xem danh sách để tham khảo trước khi đăng bán.
   ========================================================================== */

import { icon } from './icons.js';

// Danh sách chi nhánh kiểm định (mock data)
export const BRANCHES = [
  { id: 'hcm-thuduc', name: 'PCBid Lab Thủ Đức (Trụ sở)', address: 'Khu phố 6, P. Linh Trung', district: 'TP. Thủ Đức', city: 'TP. Hồ Chí Minh', phone: '028 3725 6868', hours: '8:00 – 20:00 (Thứ 2 – Chủ nhật)', lat: 10.8700, lng: 106.8031 },
  { id: 'hcm-q3', name: 'PCBid Quận 3', address: '120 Nguyễn Thị Minh Khai, P. Võ Thị Sáu', district: 'Quận 3', city: 'TP. Hồ Chí Minh', phone: '028 3930 6868', hours: '8:30 – 21:00 (Thứ 2 – Chủ nhật)', lat: 10.7790, lng: 106.6900 },
  { id: 'hcm-tanbinh', name: 'PCBid Tân Bình', address: '364 Cộng Hòa, P. 13', district: 'Quận Tân Bình', city: 'TP. Hồ Chí Minh', phone: '028 3811 6868', hours: '8:30 – 21:00 (Thứ 2 – Chủ nhật)', lat: 10.8014, lng: 106.6430 },
  { id: 'hcm-q7', name: 'PCBid Quận 7', address: '1058 Nguyễn Văn Linh, P. Tân Phong', district: 'Quận 7', city: 'TP. Hồ Chí Minh', phone: '028 5412 6868', hours: '9:00 – 21:00 (Thứ 2 – Chủ nhật)', lat: 10.7290, lng: 106.7190 },
  { id: 'dn-bienhoa', name: 'PCBid Biên Hòa', address: '125 Phạm Văn Thuận, P. Tân Mai', district: 'TP. Biên Hòa', city: 'Đồng Nai', phone: '0251 382 6868', hours: '8:00 – 20:00 (Thứ 2 – Thứ 7)', lat: 10.9500, lng: 106.8300 },
  { id: 'hn-caugiay', name: 'PCBid Cầu Giấy', address: '144 Xuân Thủy, P. Dịch Vọng Hậu', district: 'Quận Cầu Giấy', city: 'Hà Nội', phone: '024 3768 6868', hours: '8:30 – 21:00 (Thứ 2 – Chủ nhật)', lat: 21.0368, lng: 105.7826 },
  { id: 'hn-haibatrung', name: 'PCBid Hai Bà Trưng', address: '18 Đại Cồ Việt, P. Lê Đại Hành', district: 'Quận Hai Bà Trưng', city: 'Hà Nội', phone: '024 3869 6868', hours: '8:30 – 21:00 (Thứ 2 – Chủ nhật)', lat: 21.0075, lng: 105.8470 },
  { id: 'dng-lienchieu', name: 'PCBid Đà Nẵng', address: '54 Nguyễn Lương Bằng, P. Hòa Khánh Bắc', district: 'Quận Liên Chiểu', city: 'Đà Nẵng', phone: '0236 373 6868', hours: '8:00 – 20:00 (Thứ 2 – Thứ 7)', lat: 16.0738, lng: 108.1500 },
  { id: 'ct-ninhkieu', name: 'PCBid Cần Thơ', address: 'Đường 3/2, P. Xuân Khánh', district: 'Quận Ninh Kiều', city: 'Cần Thơ', phone: '0292 383 6868', hours: '8:00 – 20:00 (Thứ 2 – Thứ 7)', lat: 10.0299, lng: 105.7680 }
];

// Đơn vị vận chuyển hỗ trợ gửi linh kiện tới chi nhánh
export const CARRIERS = ['Giao Hàng Nhanh (GHN)', 'Giao Hàng Tiết Kiệm (GHTK)', 'Viettel Post', 'J&T Express'];

// Tọa độ ước lượng theo khu vực để đoán vị trí từ địa chỉ dạng chữ (quận trước, tỉnh / thành sau)
const AREA_COORDS = [
  { keys: ['thu duc', 'linh trung', 'quan 9', 'quan 2'], lat: 10.8500, lng: 106.7700 },
  { keys: ['quan 7', 'nha be', 'tan phong'], lat: 10.7300, lng: 106.7200 },
  { keys: ['tan binh', 'tan phu', 'go vap'], lat: 10.8000, lng: 106.6500 },
  { keys: ['quan 1', 'quan 3', 'quan 5', 'quan 10', 'phu nhuan', 'binh thanh'], lat: 10.7800, lng: 106.6900 },
  { keys: ['ho chi minh', 'tp.hcm', 'tphcm', 'sai gon'], lat: 10.7769, lng: 106.7009 },
  { keys: ['bien hoa', 'dong nai'], lat: 10.9500, lng: 106.8200 },
  { keys: ['binh duong', 'thu dau mot', 'di an'], lat: 10.9800, lng: 106.6500 },
  { keys: ['cau giay', 'bac tu liem', 'nam tu liem'], lat: 21.0400, lng: 105.7800 },
  { keys: ['hai ba trung', 'hoan kiem', 'dong da', 'hoang mai'], lat: 21.0100, lng: 105.8500 },
  { keys: ['ha noi'], lat: 21.0285, lng: 105.8542 },
  { keys: ['da nang', 'lien chieu', 'hai chau'], lat: 16.0544, lng: 108.2022 },
  { keys: ['can tho', 'ninh kieu'], lat: 10.0452, lng: 105.7469 }
];

/**
 * Bỏ dấu tiếng Việt và chuyển chữ thường để so khớp tìm kiếm
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
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
 * Lấy chi nhánh theo ID
 * @param {string} id
 * @returns {Object|null}
 */
export function getBranch(id) {
  return BRANCHES.find(b => b.id === id) || null;
}

/**
 * Địa chỉ đầy đủ của chi nhánh
 * @param {Object} branch
 * @returns {string}
 */
export function formatBranchAddress(branch) {
  return branch ? `${branch.address}, ${branch.district}, ${branch.city}` : '';
}

/**
 * Khoảng cách đường chim bay giữa hai tọa độ (km), công thức Haversine
 * @param {{lat: number, lng: number}} a
 * @param {{lat: number, lng: number}} b
 * @returns {number}
 */
function distanceKm(a, b) {
  const rad = deg => deg * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Đoán tọa độ khu vực từ địa chỉ dạng chữ
 * @param {string} address
 * @returns {{lat: number, lng: number}|null}
 */
export function guessCoordsFromAddress(address) {
  const text = normalizeText(address);
  if (!text) return null;
  const area = AREA_COORDS.find(a => a.keys.some(k => text.includes(k)));
  return area ? { lat: area.lat, lng: area.lng } : null;
}

/**
 * Tìm chi nhánh theo từ khóa và sắp xếp theo khoảng cách (nếu biết vị trí)
 * @param {string} keyword
 * @param {{lat: number, lng: number}|null} origin
 * @returns {Array<Object>} Mỗi chi nhánh kèm distance (km) hoặc null
 */
export function searchBranches(keyword = '', origin = null) {
  const words = normalizeText(keyword).split(/\s+/).filter(Boolean);
  return BRANCHES
    .filter(b => {
      const haystack = normalizeText(`${b.name} ${b.address} ${b.district} ${b.city}`);
      return words.every(w => haystack.includes(w));
    })
    .map(b => ({ ...b, distance: origin ? distanceKm(origin, b) : null }))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}

/**
 * Hộp thoại tìm chi nhánh kiểm định gần nhất
 * @param {Object} [options]
 * @param {'select'|'browse'} [options.mode] - Chọn chi nhánh để gửi hàng hoặc chỉ tra cứu
 * @param {string} [options.defaultAddress] - Địa chỉ mặc định của người bán (để gợi ý chi nhánh gần)
 * @param {string} [options.productName] - Tên linh kiện cần gửi
 * @returns {Promise<{branchId: string, method: string, carrier: string, trackingCode: string}|null>}
 */
export function openBranchFinder({ mode = 'select', defaultAddress = '', productName = '' } = {}) {
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const addressCoords = guessCoordsFromAddress(defaultAddress);
    const state = {
      keyword: '',
      origin: addressCoords,
      originLabel: addressCoords ? 'địa chỉ mặc định của bạn' : '',
      selectedId: null,
      method: 'dropoff'
    };

    const overlay = document.createElement('div');
    overlay.className = 'pcb-branch-finder';
    overlay.innerHTML = `
      <form class="pcb-branch-finder__card" role="dialog" aria-modal="true" aria-labelledby="pcb-branch-title" novalidate>
        <header class="pcb-branch-finder__head">
          <h3 class="pcb-branch-finder__title" id="pcb-branch-title">${icon('map-pin', { size: 18 })}${mode === 'select' ? 'Gửi linh kiện đến chi nhánh kiểm định' : 'Chi nhánh kiểm định PCBid'}</h3>
          <button type="button" class="pcb-branch-finder__close" data-branch-close aria-label="Đóng">${icon('x', { size: 18 })}</button>
        </header>
        <p class="pcb-branch-finder__intro">${mode === 'select'
          ? `Mang hoặc gửi <strong>${escapeHtml(productName || 'linh kiện')}</strong> đến một chi nhánh PCBid Lab. Khi chi nhánh nhận hàng, linh kiện được kiểm định và phiên mở đặt giá.`
          : 'Sau khi bài đăng được duyệt, bạn gửi linh kiện đến một trong các chi nhánh dưới đây để kiểm định trước khi mở đấu giá.'}</p>
        <div class="pcb-branch-finder__search">
          <label class="pcb-branch-finder__search-box">
            ${icon('search', { size: 15 })}
            <input type="search" class="pcb-branch-finder__input" placeholder="Tìm theo quận, thành phố (VD: Thủ Đức, Cầu Giấy, Đà Nẵng)" aria-label="Tìm chi nhánh">
          </label>
          <button type="button" class="pcb-branch-finder__locate" data-branch-locate>${icon('map-pin', { size: 14 })} Gần tôi</button>
        </div>
        <p class="pcb-branch-finder__origin" aria-live="polite"></p>
        <ul class="pcb-branch-finder__list" role="radiogroup" aria-label="Danh sách chi nhánh"></ul>
        ${mode === 'select' ? `
          <fieldset class="pcb-branch-finder__method">
            <legend class="pcb-branch-finder__legend">Cách gửi linh kiện</legend>
            <label class="pcb-branch-finder__choice"><input type="radio" name="method" value="dropoff" checked> <span><strong>Mang trực tiếp đến chi nhánh</strong><small>Nhân viên kiểm tra ngoại quan và nhận hàng tại quầy</small></span></label>
            <label class="pcb-branch-finder__choice"><input type="radio" name="method" value="courier"> <span><strong>Gửi qua đơn vị vận chuyển</strong><small>Đóng gói chống sốc, ghi rõ mã bài đăng trên kiện hàng</small></span></label>
            <div class="pcb-branch-finder__courier" hidden>
              <select class="pcb-branch-finder__select" name="carrier" aria-label="Đơn vị vận chuyển">
                ${CARRIERS.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
              </select>
              <input type="text" class="pcb-branch-finder__tracking" name="tracking" maxlength="24" placeholder="Mã vận đơn (VD: GHN123456789)" aria-label="Mã vận đơn">
            </div>
          </fieldset>
          <p class="pcb-branch-finder__error" role="alert" hidden></p>
          <div class="pcb-branch-finder__actions">
            <button type="button" class="pcb-dialog__btn pcb-dialog__btn--ghost" data-branch-close>Để sau</button>
            <button type="submit" class="pcb-dialog__btn pcb-dialog__btn--primary">Xác nhận đã gửi hàng</button>
          </div>` : `
          <div class="pcb-branch-finder__actions">
            <button type="button" class="pcb-dialog__btn pcb-dialog__btn--primary" data-branch-close>Đã hiểu</button>
          </div>`}
      </form>
    `;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('form');
    const list = overlay.querySelector('.pcb-branch-finder__list');
    const originEl = overlay.querySelector('.pcb-branch-finder__origin');
    const input = overlay.querySelector('.pcb-branch-finder__input');
    const errorEl = overlay.querySelector('.pcb-branch-finder__error');

    // Vẽ danh sách chi nhánh theo từ khóa và vị trí hiện có
    const render = () => {
      const branches = searchBranches(state.keyword, state.origin);
      originEl.textContent = state.origin
        ? `Sắp xếp theo khoảng cách tới ${state.originLabel}.`
        : 'Bấm "Gần tôi" để sắp xếp theo khoảng cách, hoặc tìm theo khu vực.';
      // Lần đầu có vị trí: chọn sẵn chi nhánh gần nhất
      if (mode === 'select' && !state.selectedId && state.origin && branches[0]) state.selectedId = branches[0].id;
      list.innerHTML = branches.length ? branches.map((b, i) => `
        <li>
          <label class="pcb-branch-finder__item${state.selectedId === b.id ? ' pcb-branch-finder__item--selected' : ''}">
            ${mode === 'select' ? `<input type="radio" name="branch" value="${b.id}" ${state.selectedId === b.id ? 'checked' : ''}>` : ''}
            <span class="pcb-branch-finder__item-body">
              <span class="pcb-branch-finder__item-top">
                <strong class="pcb-branch-finder__item-name">${escapeHtml(b.name)}</strong>
                ${b.distance !== null ? `<span class="pcb-branch-finder__distance">${b.distance < 1 ? '< 1' : b.distance.toFixed(1).replace('.', ',')} km${i === 0 ? ' · Gần nhất' : ''}</span>` : ''}
              </span>
              <span class="pcb-branch-finder__item-line">${escapeHtml(formatBranchAddress(b))}</span>
              <span class="pcb-branch-finder__item-meta">${icon('clock', { size: 12 })} ${escapeHtml(b.hours)} · ${escapeHtml(b.phone)}</span>
            </span>
          </label>
        </li>`).join('') : '<li class="pcb-branch-finder__empty">Không tìm thấy chi nhánh phù hợp. Thử tên quận hoặc thành phố khác.</li>';
    };
    render();
    input.focus();

    const close = result => {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
      resolve(result);
    };
    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(null);
      }
    };
    document.addEventListener('keydown', onKey, true);

    input.addEventListener('input', () => {
      state.keyword = input.value;
      render();
    });
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('[data-branch-close]')) close(null);
    });
    // Định vị bằng Geolocation API; bị từ chối thì dùng địa chỉ mặc định nếu có
    overlay.querySelector('[data-branch-locate]').addEventListener('click', () => {
      if (!navigator.geolocation) {
        originEl.textContent = 'Trình duyệt không hỗ trợ định vị. Hãy tìm theo khu vực.';
        return;
      }
      originEl.textContent = 'Đang lấy vị trí của bạn...';
      navigator.geolocation.getCurrentPosition(pos => {
        state.origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.originLabel = 'vị trí hiện tại của bạn';
        state.selectedId = null;
        render();
      }, () => {
        originEl.textContent = addressCoords
          ? 'Không lấy được vị trí, đang dùng địa chỉ mặc định của bạn.'
          : 'Không lấy được vị trí (chưa cho phép định vị). Hãy tìm theo khu vực.';
      }, { timeout: 8000 });
    });
    list.addEventListener('change', e => {
      if (e.target.name !== 'branch') return;
      state.selectedId = e.target.value;
      render();
    });
    // Người dùng sửa lựa chọn / mã vận đơn: ẩn dòng lỗi cũ
    form.addEventListener('input', () => {
      if (errorEl) errorEl.hidden = true;
    });
    form.addEventListener('change', e => {
      if (errorEl) errorEl.hidden = true;
      if (e.target.name !== 'method') return;
      state.method = e.target.value;
      form.querySelector('.pcb-branch-finder__courier').hidden = state.method !== 'courier';
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (mode !== 'select') return close(null);
      const showError = msg => {
        errorEl.textContent = msg;
        errorEl.hidden = false;
      };
      if (!state.selectedId) return showError('Vui lòng chọn một chi nhánh kiểm định.');
      const tracking = form.elements.tracking?.value.trim() || '';
      if (state.method === 'courier' && !/^[A-Za-z0-9-]{6,24}$/.test(tracking)) {
        return showError('Mã vận đơn gồm 6 - 24 ký tự chữ, số hoặc gạch ngang.');
      }
      close({
        branchId: state.selectedId,
        method: state.method,
        carrier: state.method === 'courier' ? form.elements.carrier.value : '',
        trackingCode: tracking
      });
    });
  });
}
