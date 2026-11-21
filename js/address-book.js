/* ==========================================================================
   PCBid - Sổ địa chỉ nhận hàng (address-book.js)
   ==========================================================================
   Mỗi tài khoản có nhiều địa chỉ nhận hàng (giống Shopee), lưu riêng trong
   localStorage (pcbid_addresses__<tài khoản>). Mỗi địa chỉ gồm họ tên người
   nhận, số điện thoại, địa chỉ tự nhập và cờ mặc định.
   - Luôn có đúng một địa chỉ mặc định (nếu sổ không rỗng), đứng đầu danh sách.
   - Hộp thoại thêm / sửa địa chỉ và hộp thoại chọn địa chỉ cho đơn hàng
     dùng chung ở trang Hồ sơ và thẻ đơn hàng.
   ========================================================================== */

import { readUserList, writeUserList, readLoggedInUser } from './user-data.js';
import { showConfirm } from './dialog.js';

const ADDRESSES_KEY = 'pcbid_addresses';
// Số điện thoại Việt Nam: 0 hoặc +84, tiếp theo đầu số di động và 8 chữ số
const PHONE_PATTERN = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

/**
 * Mã hóa ký tự HTML đặc biệt
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/**
 * Danh sách địa chỉ của tài khoản, địa chỉ mặc định đứng đầu
 * @param {Object} [user] - Mặc định là người đang đăng nhập
 * @returns {Array<{id:string, fullname:string, phone:string, address:string, isDefault:boolean}>}
 */
export function getAddresses(user = readLoggedInUser()) {
  if (!user) return [];
  const list = readUserList(ADDRESSES_KEY, user);
  return [...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/**
 * Địa chỉ mặc định của tài khoản
 * @param {Object} [user]
 * @returns {Object|null}
 */
export function getDefaultAddress(user = readLoggedInUser()) {
  return getAddresses(user)[0] || null;
}

/**
 * Ghi sổ địa chỉ, đảm bảo luôn có đúng một địa chỉ mặc định
 * @param {Object} user
 * @param {Array} list
 */
function writeAddresses(user, list) {
  let next = list;
  if (next.length && !next.some(a => a.isDefault)) next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
  writeUserList(ADDRESSES_KEY, user, next);
  window.dispatchEvent(new CustomEvent('pcbid:addresses-updated'));
}

/**
 * Thêm mới hoặc cập nhật một địa chỉ
 * @param {Object} data - { id?, fullname, phone, address, isDefault }
 * @param {Object} [user]
 * @returns {Object} Địa chỉ đã lưu
 */
export function saveAddress(data, user = readLoggedInUser()) {
  const list = readUserList(ADDRESSES_KEY, user);
  const saved = {
    id: data.id || `addr_${Date.now()}`,
    fullname: data.fullname.trim(),
    phone: data.phone.replace(/\s+/g, ''),
    address: data.address.trim(),
    // Địa chỉ đầu tiên luôn là mặc định
    isDefault: Boolean(data.isDefault) || list.length === 0
  };
  let next = list.some(a => a.id === saved.id) ? list.map(a => (a.id === saved.id ? saved : a)) : [...list, saved];
  if (saved.isDefault) next = next.map(a => ({ ...a, isDefault: a.id === saved.id }));
  writeAddresses(user, next);
  return saved;
}

/**
 * Đặt một địa chỉ làm mặc định
 * @param {string} id
 * @param {Object} [user]
 */
export function setDefaultAddress(id, user = readLoggedInUser()) {
  writeAddresses(user, readUserList(ADDRESSES_KEY, user).map(a => ({ ...a, isDefault: a.id === id })));
}

/**
 * Xóa một địa chỉ (không xóa địa chỉ mặc định, giống Shopee)
 * @param {string} id
 * @param {Object} [user]
 * @returns {Promise<boolean>}
 */
export async function deleteAddress(id, user = readLoggedInUser()) {
  const list = readUserList(ADDRESSES_KEY, user);
  const target = list.find(a => a.id === id);
  if (!target || target.isDefault) return false;
  const ok = await showConfirm({
    title: 'Xóa địa chỉ này?',
    message: `${target.fullname} · ${target.phone}\n${target.address}`,
    confirmText: 'Xóa địa chỉ',
    cancelText: 'Hủy',
    tone: 'danger'
  });
  if (!ok) return false;
  writeAddresses(user, list.filter(a => a.id !== id));
  return true;
}

/**
 * HTML thẻ hiển thị một địa chỉ (dùng trong danh sách và hộp thoại chọn)
 * @param {Object} a - Địa chỉ
 * @returns {string}
 */
export function renderAddressInfo(a) {
  return `
    <span class="pcb-address__line">
      <strong class="pcb-address__name">${escapeHtml(a.fullname)}</strong>
      <span class="pcb-address__sep" aria-hidden="true">|</span>
      <span class="pcb-address__phone">${escapeHtml(a.phone)}</span>
    </span>
    <span class="pcb-address__text">${escapeHtml(a.address)}</span>
    ${a.isDefault ? '<span class="pcb-address__default">Mặc định</span>' : ''}
  `;
}

/**
 * Tạo lớp phủ hộp thoại dùng chung, trả về hàm đóng
 * @param {string} html - Nội dung hộp thoại
 * @param {string} labelId - ID tiêu đề cho aria-labelledby
 * @returns {{overlay:HTMLElement, close:Function}}
 */
function createModal(html, labelId) {
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'pcb-addr-modal';
  overlay.innerHTML = `<div class="pcb-addr-modal__card" role="dialog" aria-modal="true" aria-labelledby="${labelId}">${html}</div>`;
  document.body.appendChild(overlay);
  const close = () => {
    overlay.remove();
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  };
  return { overlay, close };
}

/**
 * Hộp thoại thêm / sửa địa chỉ
 * @param {Object|null} [address] - Địa chỉ cần sửa (bỏ trống để thêm mới)
 * @returns {Promise<Object|null>} Địa chỉ đã lưu hoặc null nếu hủy
 */
export function openAddressForm(address = null) {
  return new Promise(resolve => {
    const user = readLoggedInUser();
    if (!user) return resolve(null);
    const isFirst = getAddresses(user).length === 0;
    // Thêm mới: điền sẵn họ tên và số điện thoại của tài khoản cho nhanh
    const values = address || { fullname: user.fullname || '', phone: user.phone || '', address: '', isDefault: isFirst };
    const lockDefault = isFirst || Boolean(address?.isDefault);
    const { overlay, close } = createModal(`
      <h3 class="pcb-addr-modal__title" id="pcb-addr-form-title">${address ? 'Cập nhật địa chỉ' : 'Địa chỉ mới'}</h3>
      <form class="pcb-addr-form" novalidate>
        <div class="pcb-addr-form__row">
          <label class="pcb-addr-form__field">
            <span>Họ và tên</span>
            <input type="text" name="fullname" maxlength="60" autocomplete="name" value="${escapeHtml(values.fullname)}" required>
            <small class="pcb-addr-form__error" data-error="fullname"></small>
          </label>
          <label class="pcb-addr-form__field">
            <span>Số điện thoại</span>
            <input type="tel" name="phone" maxlength="13" autocomplete="tel" inputmode="tel" value="${escapeHtml(values.phone)}" required>
            <small class="pcb-addr-form__error" data-error="phone"></small>
          </label>
        </div>
        <label class="pcb-addr-form__field">
          <span>Địa chỉ</span>
          <textarea name="address" rows="3" maxlength="250" autocomplete="street-address" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố" required>${escapeHtml(values.address)}</textarea>
          <small class="pcb-addr-form__error" data-error="address"></small>
        </label>
        <!-- Nút gạt giống phần cài đặt quyền riêng tư -->
        <label class="pcb-switch pcb-addr-form__switch">
          <span class="pcb-switch__label">Đặt làm địa chỉ mặc định</span>
          <input type="checkbox" name="isDefault" class="pcb-switch__input" role="switch" ${values.isDefault ? 'checked' : ''} ${lockDefault ? 'disabled' : ''}>
          <span class="pcb-switch__track" aria-hidden="true"></span>
        </label>
        ${lockDefault ? `<p class="pcb-addr-form__note">${isFirst ? 'Địa chỉ đầu tiên sẽ được đặt làm mặc định.' : 'Đây đang là địa chỉ mặc định. Hãy đặt địa chỉ khác làm mặc định nếu muốn thay đổi.'}</p>` : ''}
        <div class="pcb-addr-modal__actions">
          <button type="button" class="pcb-addr-btn pcb-addr-btn--ghost" data-addr-cancel>Trở lại</button>
          <button type="submit" class="pcb-addr-btn pcb-addr-btn--primary">Hoàn thành</button>
        </div>
      </form>
    `, 'pcb-addr-form-title');

    const form = overlay.querySelector('form');
    const finish = result => {
      document.removeEventListener('keydown', onKey, true);
      close();
      resolve(result);
    };
    const onKey = e => {
      if (e.key === 'Escape' && !document.querySelector('.pcb-dialog')) {
        e.stopPropagation();
        finish(null);
      }
    };
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('[data-addr-cancel]')) finish(null);
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = {
        fullname: form.fullname.value.trim(),
        phone: form.phone.value.replace(/\s+/g, ''),
        address: form.address.value.trim()
      };
      // Kiểm tra dữ liệu (validate) từng trường
      const errors = {};
      if (data.fullname.length < 2) errors.fullname = 'Vui lòng nhập họ và tên người nhận.';
      if (!PHONE_PATTERN.test(data.phone)) errors.phone = 'Số điện thoại không hợp lệ (ví dụ: 0901234567).';
      if (data.address.length < 10) errors.address = 'Vui lòng nhập địa chỉ chi tiết (ít nhất 10 ký tự).';
      form.querySelectorAll('[data-error]').forEach(el => {
        el.textContent = errors[el.dataset.error] || '';
        form[el.dataset.error].classList.toggle('pcb-addr-form__input--error', Boolean(errors[el.dataset.error]));
        form[el.dataset.error].setAttribute('aria-invalid', String(Boolean(errors[el.dataset.error])));
      });
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        form[firstError].focus();
        return;
      }
      finish(saveAddress({ ...data, id: address?.id, isDefault: lockDefault ? true : form.isDefault.checked }, user));
    });
    form.fullname.focus();
  });
}

/**
 * Hộp thoại chọn địa chỉ nhận hàng cho đơn hàng (địa chỉ mặc định đứng đầu)
 * @param {string|null} [selectedId] - Địa chỉ đang chọn
 * @returns {Promise<Object|null>} Địa chỉ được chọn hoặc null nếu hủy
 */
export function openAddressPicker(selectedId = null) {
  return new Promise(resolve => {
    let currentId = selectedId;
    const { overlay, close } = createModal(`
      <h3 class="pcb-addr-modal__title" id="pcb-addr-picker-title">Địa chỉ của tôi</h3>
      <div class="pcb-addr-picker" data-addr-list></div>
      <button type="button" class="pcb-addr-add" data-addr-add>+ Thêm địa chỉ mới</button>
      <div class="pcb-addr-modal__actions">
        <button type="button" class="pcb-addr-btn pcb-addr-btn--ghost" data-addr-cancel>Hủy</button>
        <button type="button" class="pcb-addr-btn pcb-addr-btn--primary" data-addr-confirm>Xác nhận</button>
      </div>
    `, 'pcb-addr-picker-title');

    const render = () => {
      const list = getAddresses();
      if (!list.some(a => a.id === currentId)) currentId = list[0]?.id || null;
      overlay.querySelector('[data-addr-list]').innerHTML = list.length
        ? list.map(a => `
          <div class="pcb-addr-option${a.id === currentId ? ' pcb-addr-option--selected' : ''}">
            <label class="pcb-addr-option__main">
              <input type="radio" name="pcb-addr-choice" value="${a.id}" ${a.id === currentId ? 'checked' : ''}>
              <span class="pcb-address">${renderAddressInfo(a)}</span>
            </label>
            <button type="button" class="pcb-addr-link" data-addr-edit="${a.id}">Sửa</button>
          </div>`).join('')
        : '<p class="pcb-addr-empty">Bạn chưa có địa chỉ nhận hàng nào. Hãy thêm địa chỉ mới.</p>';
      overlay.querySelector('[data-addr-confirm]').disabled = !currentId;
    };
    render();

    const finish = result => {
      document.removeEventListener('keydown', onKey, true);
      close();
      resolve(result);
    };
    const onKey = e => {
      if (e.key === 'Escape' && !document.querySelector('.pcb-dialog') && document.querySelectorAll('.pcb-addr-modal').length === 1) {
        e.stopPropagation();
        finish(null);
      }
    };
    document.addEventListener('keydown', onKey, true);

    overlay.addEventListener('change', e => {
      if (e.target.name === 'pcb-addr-choice') {
        currentId = e.target.value;
        render();
      }
    });
    overlay.addEventListener('click', async e => {
      if (e.target === overlay || e.target.closest('[data-addr-cancel]')) return finish(null);
      if (e.target.closest('[data-addr-confirm]')) return finish(getAddresses().find(a => a.id === currentId) || null);
      const edit = e.target.closest('[data-addr-edit]');
      if (edit) {
        const saved = await openAddressForm(getAddresses().find(a => a.id === edit.dataset.addrEdit));
        if (saved) currentId = saved.id;
        return render();
      }
      if (e.target.closest('[data-addr-add]')) {
        const saved = await openAddressForm();
        if (saved) currentId = saved.id;
        render();
      }
    });
    overlay.querySelector('[data-addr-confirm]').focus();
  });
}
