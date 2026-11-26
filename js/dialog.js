/* ==========================================================================
   PCBid - Hộp thoại thông báo / xác nhận dùng chung (dialog.js)
   ==========================================================================
   Thay cho alert() / confirm() mặc định của trình duyệt bằng pop-up cùng phong
   cách giao diện PCBid. Trả về Promise để dùng với async / await:
     const ok = await showConfirm({ title, message, confirmText, danger: true });
     await showAlert({ title, message });
   Hỗ trợ bàn phím: Esc để hủy, Tab xoay vòng trong hộp thoại, focus trả lại
   phần tử trước đó khi đóng.
   ========================================================================== */

/**
 * Mở hộp thoại và trả về lựa chọn của người dùng
 * @param {Object} options - Cấu hình hộp thoại
 * @param {string} [options.title] - Tiêu đề
 * @param {string} options.message - Nội dung (xuống dòng bằng \n)
 * @param {string} [options.confirmText] - Chữ trên nút đồng ý
 * @param {string|null} [options.cancelText] - Chữ trên nút hủy (null = không có nút hủy)
 * @param {string|null} [options.extraText] - Chữ trên nút lựa chọn thứ ba (null = không có)
 * @param {'info'|'warning'|'danger'|'success'} [options.tone] - Sắc thái biểu tượng và nút chính
 * @returns {Promise<'ok'|'cancel'|'extra'>} Nút người dùng đã bấm
 */
function openDialog({ title = 'Thông báo', message = '', confirmText = 'Đồng ý', cancelText = 'Hủy', extraText = null, tone = 'info' }) {
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const icons = { info: 'i', warning: '!', danger: '!', success: '✓' };

    const overlay = document.createElement('div');
    overlay.className = 'pcb-dialog';
    overlay.innerHTML = `
      <div class="pcb-dialog__card pcb-dialog__card--${tone}" role="alertdialog" aria-modal="true"
        aria-labelledby="pcb-dialog-title" aria-describedby="pcb-dialog-message">
        <span class="pcb-dialog__icon" aria-hidden="true">${icons[tone] || 'i'}</span>
        <h3 class="pcb-dialog__title" id="pcb-dialog-title"></h3>
        <p class="pcb-dialog__message" id="pcb-dialog-message"></p>
        <div class="pcb-dialog__actions">
          ${cancelText ? '<button type="button" class="pcb-dialog__btn pcb-dialog__btn--ghost" data-dialog="cancel"></button>' : ''}
          ${extraText ? '<button type="button" class="pcb-dialog__btn pcb-dialog__btn--ghost pcb-dialog__btn--extra" data-dialog="extra"></button>' : ''}
          <button type="button" class="pcb-dialog__btn pcb-dialog__btn--primary" data-dialog="ok"></button>
        </div>
      </div>
    `;
    // Gán chữ bằng textContent để tránh chèn HTML ngoài ý muốn
    overlay.querySelector('.pcb-dialog__title').textContent = title;
    overlay.querySelector('.pcb-dialog__message').textContent = message;
    overlay.querySelector('[data-dialog="ok"]').textContent = confirmText;
    if (cancelText) overlay.querySelector('[data-dialog="cancel"]').textContent = cancelText;
    if (extraText) overlay.querySelector('[data-dialog="extra"]').textContent = extraText;
    document.body.appendChild(overlay);

    const okBtn = overlay.querySelector('[data-dialog="ok"]');
    const cancelBtn = overlay.querySelector('[data-dialog="cancel"]');
    // Hành động nguy hiểm: focus mặc định vào nút Hủy để tránh bấm nhầm Enter
    (tone === 'danger' && cancelBtn ? cancelBtn : okBtn).focus();

    const close = result => {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
      resolve(result);
    };

    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close('cancel');
      } else if (e.key === 'Tab') {
        // Giữ focus trong hộp thoại
        const buttons = [...overlay.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        e.preventDefault();
        const next = e.shiftKey ? (index <= 0 ? buttons.length - 1 : index - 1) : (index + 1) % buttons.length;
        buttons[next].focus();
      }
    };
    document.addEventListener('keydown', onKey, true);

    overlay.addEventListener('click', e => {
      if (e.target.closest('[data-dialog="ok"]')) close('ok');
      else if (e.target.closest('[data-dialog="extra"]')) close('extra');
      else if (e.target.closest('[data-dialog="cancel"]') || e.target === overlay) close('cancel');
    });
  });
}

/**
 * Hộp thoại xác nhận (thay cho confirm)
 * @param {Object} options - Xem openDialog; mặc định tone 'warning'
 * @returns {Promise<boolean>}
 */
export async function showConfirm(options) {
  return (await openDialog({ tone: 'warning', ...options })) === 'ok';
}

/**
 * Hộp thoại ba lựa chọn (VD: Lưu / Không lưu / Ở lại)
 * @param {Object} options - Xem openDialog; extraText là nút thứ ba
 * @returns {Promise<'ok'|'cancel'|'extra'>} Bấm ra ngoài hoặc Esc tính là 'cancel'
 */
export function showChoice(options) {
  return openDialog({ tone: 'warning', ...options });
}

/**
 * Hộp thoại thông báo một nút (thay cho alert)
 * @param {Object|string} options - Nội dung hoặc cấu hình (xem openDialog)
 * @returns {Promise<void>}
 */
export async function showAlert(options) {
  const config = typeof options === 'string' ? { message: options } : options;
  await openDialog({ title: 'Thông báo', confirmText: 'Đã hiểu', cancelText: null, ...config });
}

/**
 * Hộp thoại có biểu mẫu nhỏ (chọn lý do + ô nhập nội dung), dùng cho báo cáo vi phạm,
 * yêu cầu bổ sung thông tin, lý do từ chối / ẩn / gỡ bài đăng...
 * @param {Object} options
 * @param {string} options.title - Tiêu đề
 * @param {string} [options.message] - Mô tả ngắn dưới tiêu đề
 * @param {Array<Object>} options.fields - Danh sách trường:
 *   { type: 'radio', name, label, options: string[], required? }
 *   { type: 'textarea', name, label, placeholder?, maxlength?, required?, minlength? }
 * @param {string} [options.confirmText] - Chữ trên nút gửi
 * @param {string} [options.cancelText] - Chữ trên nút hủy
 * @param {'info'|'warning'|'danger'|'success'} [options.tone]
 * @returns {Promise<Object|null>} Giá trị các trường theo name, null nếu người dùng hủy
 */
export function showFormDialog({ title, message = '', fields = [], confirmText = 'Gửi', cancelText = 'Hủy', tone = 'info' }) {
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'pcb-dialog';
    const uid = `pcb-form-dialog-${Date.now()}`;
    overlay.innerHTML = `
      <form class="pcb-dialog__card pcb-dialog__card--form pcb-dialog__card--${tone}" role="dialog" aria-modal="true"
        aria-labelledby="${uid}-title" novalidate>
        <h3 class="pcb-dialog__title" id="${uid}-title"></h3>
        <p class="pcb-dialog__message pcb-dialog__message--form" hidden></p>
        <div class="pcb-dialog__fields"></div>
        <p class="pcb-dialog__error" role="alert" hidden></p>
        <div class="pcb-dialog__actions">
          <button type="button" class="pcb-dialog__btn pcb-dialog__btn--ghost" data-dialog="cancel"></button>
          <button type="submit" class="pcb-dialog__btn pcb-dialog__btn--primary"></button>
        </div>
      </form>
    `;
    const form = overlay.querySelector('form');
    form.querySelector('.pcb-dialog__title').textContent = title;
    const messageEl = form.querySelector('.pcb-dialog__message');
    if (message) {
      messageEl.textContent = message;
      messageEl.hidden = false;
    }
    form.querySelector('[data-dialog="cancel"]').textContent = cancelText;
    form.querySelector('[type="submit"]').textContent = confirmText;

    // Dựng từng trường bằng DOM để nội dung (lý do, gợi ý) không bị hiểu là HTML
    const fieldsWrap = form.querySelector('.pcb-dialog__fields');
    fields.forEach((field, fi) => {
      const group = document.createElement(field.type === 'radio' ? 'fieldset' : 'div');
      group.className = 'pcb-dialog__field';
      const fieldId = `${uid}-${field.name}`;
      if (field.type === 'radio') {
        const legend = document.createElement('legend');
        legend.className = 'pcb-dialog__label';
        legend.textContent = field.label;
        group.appendChild(legend);
        field.options.forEach((opt, oi) => {
          const label = document.createElement('label');
          label.className = 'pcb-dialog__choice';
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = field.name;
          input.value = opt;
          input.id = `${fieldId}-${oi}`;
          const text = document.createElement('span');
          text.textContent = opt;
          label.append(input, text);
          group.appendChild(label);
        });
      } else {
        const label = document.createElement('label');
        label.className = 'pcb-dialog__label';
        label.htmlFor = fieldId;
        label.textContent = field.label;
        const area = document.createElement('textarea');
        area.className = 'pcb-dialog__textarea';
        area.id = fieldId;
        area.name = field.name;
        area.rows = field.rows || 3;
        if (field.placeholder) area.placeholder = field.placeholder;
        if (field.maxlength) area.maxLength = field.maxlength;
        group.append(label, area);
      }
      group.dataset.fieldIndex = String(fi);
      fieldsWrap.appendChild(group);
    });
    document.body.appendChild(overlay);
    (form.querySelector('input, textarea') || form.querySelector('[type="submit"]')).focus();

    const errorEl = form.querySelector('.pcb-dialog__error');
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
      } else if (e.key === 'Tab') {
        // Giữ focus trong hộp thoại
        const focusables = [...form.querySelectorAll('input, textarea, button')].filter(el => !el.disabled);
        const index = focusables.indexOf(document.activeElement);
        if (e.shiftKey && index <= 0) { e.preventDefault(); focusables[focusables.length - 1].focus(); }
        else if (!e.shiftKey && index === focusables.length - 1) { e.preventDefault(); focusables[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);

    overlay.addEventListener('click', e => {
      if (e.target.closest('[data-dialog="cancel"]') || e.target === overlay) close(null);
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const values = {};
      for (const field of fields) {
        let value = '';
        if (field.type === 'radio') value = form.querySelector(`input[name="${field.name}"]:checked`)?.value || '';
        else value = (form.elements[field.name]?.value || '').trim();
        // Kiểm tra trường bắt buộc / độ dài tối thiểu, báo lỗi ngay trong hộp thoại
        if (field.required && !value) {
          errorEl.textContent = field.type === 'radio' ? `Vui lòng chọn ${field.label.toLowerCase()}.` : `Vui lòng nhập ${field.label.toLowerCase()}.`;
          errorEl.hidden = false;
          (form.querySelector(`[name="${field.name}"]`))?.focus();
          return;
        }
        if (field.minlength && value && value.length < field.minlength) {
          errorEl.textContent = `${field.label} cần ít nhất ${field.minlength} ký tự.`;
          errorEl.hidden = false;
          form.elements[field.name]?.focus();
          return;
        }
        values[field.name] = value;
      }
      close(values);
    });
  });
}
