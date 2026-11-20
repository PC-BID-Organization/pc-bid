/* ==========================================================================
   PCBid - Công cụ cắt ảnh đại diện (avatar-cropper.js)
   ==========================================================================
   Vanilla JavaScript + Canvas, không dùng thư viện ngoài:
   - Kéo ảnh (chuột / cảm ứng / phím mũi tên) để căn vị trí trong khung tròn
   - Thanh trượt để phóng to / thu nhỏ
   - Xuất ảnh vuông 256x256 dạng JPEG để lưu gọn vào localStorage
   ========================================================================== */

// Hộp thoại thông báo dùng chung
import { showAlert } from './dialog.js';

// Kích thước khung xem trước và ảnh đầu ra (px)
const VIEW_SIZE = 280;
const OUTPUT_SIZE = 256;
// Dung lượng tệp tối đa cho phép tải lên: 5MB
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Đọc tệp ảnh thành đối tượng Image
 * @param {File} file - Tệp ảnh người dùng chọn
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không đọc được ảnh'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Không đọc được tệp'));
    reader.readAsDataURL(file);
  });
}

/**
 * Mở hộp thoại cắt ảnh đại diện
 * @param {File} file - Tệp ảnh người dùng chọn
 * @returns {Promise<string|null>} Ảnh đã cắt dạng data URL, hoặc null nếu người dùng hủy
 */
export async function openAvatarCropper(file) {
  if (!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
    await showAlert({ title: 'Định dạng không hỗ trợ', message: 'Vui lòng chọn tệp ảnh định dạng PNG, JPG, WEBP hoặc GIF.', tone: 'warning' });
    return null;
  }
  if (file.size > MAX_FILE_BYTES) {
    await showAlert({ title: 'Ảnh quá lớn', message: 'Vui lòng chọn ảnh có dung lượng tối đa 5MB.', tone: 'warning' });
    return null;
  }

  let img;
  try {
    img = await loadImageFile(file);
  } catch {
    await showAlert({ title: 'Không đọc được ảnh', message: 'Không thể đọc ảnh này. Vui lòng thử ảnh khác.', tone: 'warning' });
    return null;
  }

  return new Promise(resolve => {
    // Dựng hộp thoại
    const overlay = document.createElement('div');
    overlay.className = 'pcb-cropper';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'pcb-cropper-title');
    overlay.innerHTML = `
      <div class="pcb-cropper__card">
        <h3 class="pcb-cropper__title" id="pcb-cropper-title">Cắt ảnh đại diện</h3>
        <p class="pcb-cropper__desc">Kéo ảnh để căn vị trí, dùng thanh trượt để phóng to.</p>
        <div class="pcb-cropper__stage" tabindex="0" aria-label="Vùng cắt ảnh, dùng phím mũi tên để di chuyển">
          <canvas class="pcb-cropper__canvas" width="${VIEW_SIZE}" height="${VIEW_SIZE}"></canvas>
          <span class="pcb-cropper__mask" aria-hidden="true"></span>
        </div>
        <label class="pcb-cropper__zoom">
          <span>Thu phóng</span>
          <input type="range" min="1" max="3" step="0.01" value="1" class="pcb-cropper__range">
        </label>
        <div class="pcb-cropper__actions">
          <button type="button" class="pcb-cropper__btn pcb-cropper__btn--ghost" data-crop="cancel">Hủy</button>
          <button type="button" class="pcb-cropper__btn pcb-cropper__btn--primary" data-crop="save">Lưu ảnh đại diện</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const canvas = overlay.querySelector('.pcb-cropper__canvas');
    const ctx = canvas.getContext('2d');
    const stage = overlay.querySelector('.pcb-cropper__stage');
    const range = overlay.querySelector('.pcb-cropper__range');

    // Tỷ lệ tối thiểu để ảnh luôn phủ kín khung
    const baseScale = Math.max(VIEW_SIZE / img.naturalWidth, VIEW_SIZE / img.naturalHeight);
    let zoom = 1;
    // Tâm ảnh so với tâm khung (px trên khung xem)
    let offsetX = 0;
    let offsetY = 0;

    // Giữ ảnh không để lộ khoảng trống trong khung
    const clampOffset = () => {
      const scale = baseScale * zoom;
      const maxX = Math.max(0, (img.naturalWidth * scale - VIEW_SIZE) / 2);
      const maxY = Math.max(0, (img.naturalHeight * scale - VIEW_SIZE) / 2);
      offsetX = Math.min(maxX, Math.max(-maxX, offsetX));
      offsetY = Math.min(maxY, Math.max(-maxY, offsetY));
    };

    // Vẽ ảnh lên một canvas theo vị trí và tỷ lệ hiện tại
    const drawTo = (targetCtx, size) => {
      const ratio = size / VIEW_SIZE;
      const scale = baseScale * zoom * ratio;
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      targetCtx.fillStyle = '#ffffff';
      targetCtx.fillRect(0, 0, size, size);
      targetCtx.drawImage(img, (size - w) / 2 + offsetX * ratio, (size - h) / 2 + offsetY * ratio, w, h);
    };

    const render = () => {
      clampOffset();
      drawTo(ctx, VIEW_SIZE);
    };
    render();

    // Kéo ảnh bằng chuột / cảm ứng (Pointer Events)
    let dragStart = null;
    stage.addEventListener('pointerdown', e => {
      dragStart = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', e => {
      if (!dragStart) return;
      // Quy đổi theo kích thước hiển thị thực tế của canvas (có thể nhỏ hơn trên điện thoại)
      const factor = VIEW_SIZE / canvas.getBoundingClientRect().width;
      offsetX = dragStart.ox + (e.clientX - dragStart.x) * factor;
      offsetY = dragStart.oy + (e.clientY - dragStart.y) * factor;
      render();
    });
    const endDrag = () => { dragStart = null; };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // Phím mũi tên di chuyển ảnh 8px mỗi lần
    stage.addEventListener('keydown', e => {
      const step = 8;
      const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (!moves[e.key]) return;
      e.preventDefault();
      offsetX += moves[e.key][0];
      offsetY += moves[e.key][1];
      render();
    });

    // Thu phóng bằng thanh trượt hoặc con lăn chuột
    range.addEventListener('input', () => {
      zoom = Number(range.value);
      render();
    });
    stage.addEventListener('wheel', e => {
      e.preventDefault();
      zoom = Math.min(3, Math.max(1, zoom - e.deltaY * 0.001));
      range.value = String(zoom);
      render();
    }, { passive: false });

    const close = result => {
      document.removeEventListener('keydown', onEsc);
      overlay.remove();
      resolve(result);
    };
    const onEsc = e => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onEsc);

    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('[data-crop="cancel"]')) close(null);
      if (e.target.closest('[data-crop="save"]')) {
        // Xuất ảnh vuông 256x256 dạng JPEG chất lượng 0.85
        const out = document.createElement('canvas');
        out.width = OUTPUT_SIZE;
        out.height = OUTPUT_SIZE;
        drawTo(out.getContext('2d'), OUTPUT_SIZE);
        close(out.toDataURL('image/jpeg', 0.85));
      }
    });

    stage.focus();
  });
}
