/* ==========================================================================
   PCBid - Ô chọn tùy biến (custom-select.js)
   ==========================================================================
   Thay giao diện <select> mặc định của trình duyệt (trên điện thoại thường là
   bảng chọn toàn màn hình) bằng danh sách xổ xuống cùng phong cách PCBid,
   giống nhau trên máy tính và điện thoại.
   - Thẻ <select> gốc vẫn nằm trong form (ẩn khỏi mắt) để giữ value, validate
     và sự kiện change cho các đoạn code đang dùng.
   - Tự cập nhật khi danh sách option thay đổi, khi bật / tắt disabled hoặc khi
     code gán select.value bằng JavaScript.
   - Hỗ trợ bàn phím: mũi tên, Enter / Space, Home / End, Esc, gõ chữ để nhảy.
   ========================================================================== */

let openInstance = null;
let uid = 0;

/**
 * Mã hóa ký tự HTML đặc biệt
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/**
 * Biến một thẻ <select> thành ô chọn tùy biến
 * @param {HTMLSelectElement} select
 */
export function enhanceSelect(select) {
  if (!select || select.dataset.enhanced) return;
  select.dataset.enhanced = '1';
  const id = select.id || `pcb-select-${++uid}`;
  const listId = `${id}-listbox`;

  const wrap = document.createElement('div');
  wrap.className = 'pcb-select';
  wrap.innerHTML = `
    <button type="button" class="pcb-select__trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="${listId}">
      <span class="pcb-select__value"></span>
      <svg class="pcb-select__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
    <ul class="pcb-select__list" id="${listId}" role="listbox" tabindex="-1" hidden></ul>
  `;
  select.insertAdjacentElement('afterend', wrap);
  wrap.prepend(select);
  // Thẻ gốc: ẩn khỏi mắt và khỏi phím Tab nhưng vẫn gửi dữ liệu / kiểm tra required
  select.classList.add('pcb-select__native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  const trigger = wrap.querySelector('.pcb-select__trigger');
  const valueEl = wrap.querySelector('.pcb-select__value');
  const list = wrap.querySelector('.pcb-select__list');
  const label = select.id ? document.querySelector(`label[for="${select.id}"]`) : null;
  if (label) {
    if (!label.id) label.id = `${id}-label`;
    trigger.setAttribute('aria-labelledby', `${label.id} ${id}-value`);
    list.setAttribute('aria-labelledby', label.id);
    // Bấm vào nhãn: chuyển focus sang nút chọn
    label.addEventListener('click', e => {
      e.preventDefault();
      if (!trigger.disabled) trigger.focus();
    });
  }
  valueEl.id = `${id}-value`;

  let activeIndex = -1;
  let typed = '';
  let typedTimer = 0;

  const options = () => [...select.options];

  /** Vẽ lại nút và danh sách theo thẻ <select> gốc */
  const render = () => {
    const current = select.options[select.selectedIndex];
    valueEl.textContent = current ? current.textContent : '';
    trigger.classList.toggle('pcb-select__trigger--placeholder', !current || current.value === '');
    trigger.disabled = select.disabled;
    wrap.classList.toggle('pcb-select--disabled', select.disabled);
    list.innerHTML = options().map((opt, i) => `
      <li class="pcb-select__option${opt.value === '' ? ' pcb-select__option--placeholder' : ''}" role="option" id="${id}-opt-${i}"
        data-index="${i}" aria-selected="${i === select.selectedIndex}"${opt.disabled ? ' aria-disabled="true"' : ''}>
        <span class="pcb-select__option-text">${escapeHtml(opt.textContent)}</span>
        <svg class="pcb-select__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </li>`).join('');
  };

  const setActive = index => {
    const items = [...list.children];
    if (!items.length) return;
    activeIndex = Math.max(0, Math.min(items.length - 1, index));
    items.forEach((li, i) => li.classList.toggle('pcb-select__option--active', i === activeIndex));
    list.setAttribute('aria-activedescendant', items[activeIndex].id);
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  };

  const close = (focusTrigger = true) => {
    if (list.hidden) return;
    list.hidden = true;
    wrap.classList.remove('pcb-select--open', 'pcb-select--up');
    trigger.setAttribute('aria-expanded', 'false');
    if (openInstance === close) openInstance = null;
    if (focusTrigger) trigger.focus();
  };

  const open = () => {
    if (select.disabled) return;
    if (openInstance && openInstance !== close) openInstance(false);
    render();
    list.hidden = false;
    wrap.classList.add('pcb-select--open');
    trigger.setAttribute('aria-expanded', 'true');
    // Không đủ chỗ phía dưới (gần đáy màn hình): mở danh sách lên trên
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    wrap.classList.toggle('pcb-select--up', spaceBelow < Math.min(list.scrollHeight, 280) + 12 && rect.top > spaceBelow);
    openInstance = close;
    setActive(select.selectedIndex >= 0 ? select.selectedIndex : 0);
    list.focus({ preventScroll: true });
  };

  const choose = index => {
    const opt = select.options[index];
    if (!opt || opt.disabled) return;
    const changed = select.selectedIndex !== index;
    select.selectedIndex = index;
    render();
    close();
    if (changed) {
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  trigger.addEventListener('click', () => (list.hidden ? open() : close()));
  trigger.addEventListener('keydown', e => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      open();
    }
  });

  list.addEventListener('click', e => {
    const li = e.target.closest('.pcb-select__option');
    if (li) choose(Number(li.dataset.index));
  });
  list.addEventListener('keydown', e => {
    const count = list.children.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(count - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(activeIndex); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { close(false); }
    else if (e.key.length === 1) {
      // Gõ chữ để nhảy tới lựa chọn bắt đầu bằng chữ đó
      typed += e.key.toLowerCase();
      clearTimeout(typedTimer);
      typedTimer = setTimeout(() => { typed = ''; }, 600);
      const found = options().findIndex(opt => opt.textContent.trim().toLowerCase().startsWith(typed));
      if (found >= 0) setActive(found);
    }
  });

  // Bấm ra ngoài thì đóng danh sách
  document.addEventListener('click', e => {
    if (!list.hidden && !wrap.contains(e.target)) close(false);
  });

  // Danh sách option / trạng thái disabled thay đổi (VD: lọc mẫu theo danh mục)
  new MutationObserver(() => render()).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  select.addEventListener('change', render);

  // Code gán select.value / selectedIndex trực tiếp: cập nhật lại nút hiển thị
  ['value', 'selectedIndex'].forEach(prop => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
    Object.defineProperty(select, prop, {
      configurable: true,
      get() { return descriptor.get.call(this); },
      set(v) { descriptor.set.call(this, v); render(); }
    });
  });
  // Bật / tắt bằng thuộc tính disabled qua JavaScript
  const disabledDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'disabled');
  Object.defineProperty(select, 'disabled', {
    configurable: true,
    get() { return disabledDescriptor.get.call(this); },
    set(v) { disabledDescriptor.set.call(this, v); render(); }
  });

  render();
}

/**
 * Áp dụng ô chọn tùy biến cho mọi <select> khớp bộ chọn
 * @param {string} selector
 * @param {ParentNode} [root]
 */
export function enhanceSelects(selector, root = document) {
  root.querySelectorAll(selector).forEach(enhanceSelect);
}
