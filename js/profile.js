/**
 * PCBid - Tập lệnh xử lý tương tác Trang thông tin tài khoản (Profile Script)
 * Quản lý cập nhật hồ sơ, ví ảo mô phỏng, đổi mật khẩu và đăng xuất
 * Toàn bộ chú thích được viết bằng tiếng Việt có dấu theo chuẩn quy định
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Khởi tạo và nạp dữ liệu người dùng từ localStorage (hoặc dữ liệu mặc định)
  initUserProfile();

  // 2. Lắng nghe sự kiện lưu biểu mẫu thông tin tài khoản
  initProfileForm();

  // 3. Khởi tạo modal đổi mật khẩu
  initPasswordModal();

  // 4. Khởi tạo modal nạp tiền cọc ví ảo
  initDepositModal();

  // 5. Khởi tạo sự kiện nút đăng xuất
  initLogout();
});

/**
 * Khóa lưu trữ dữ liệu tài khoản trong LocalStorage
 */
const STORAGE_KEY_USER = 'pcbid_user';
const STORAGE_KEY_WALLET = 'pcbid_wallet_balance';

/**
 * Dữ liệu người dùng mẫu mặc định ban đầu
 */
const DEFAULT_USER = {
  fullname: 'Nguyễn Văn A',
  email: 'nguyenvana@example.com',
  phone: '0912345678',
  address: 'Trường Đại học Công nghệ Thông tin, Khu phố 6, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
  isDefaultAddress: true,
  notifySms: true,
  notifyEmail: true,
  walletBalance: 50000000,
  walletHold: 3500000,
  lastUpdated: 'Hôm nay, 14:32'
};

/**
 * Nạp thông tin người dùng lên giao diện
 */
function initUserProfile() {
  const savedData = localStorage.getItem(STORAGE_KEY_USER);
  const user = savedData ? JSON.parse(savedData) : DEFAULT_USER;

  // Cập nhật các trường nhập liệu trong biểu mẫu
  const inputFullname = document.getElementById('user-fullname');
  const inputEmail = document.getElementById('user-email');
  const inputPhone = document.getElementById('user-phone');
  const inputAddress = document.getElementById('user-address');
  const checkDefaultAddress = document.getElementById('user-default-address');
  const checkNotifySms = document.getElementById('notify-sms');
  const checkNotifyEmail = document.getElementById('notify-email');

  if (inputFullname) inputFullname.value = user.fullname || DEFAULT_USER.fullname;
  if (inputEmail) inputEmail.value = user.email || DEFAULT_USER.email;
  if (inputPhone) inputPhone.value = user.phone || DEFAULT_USER.phone;
  if (inputAddress) inputAddress.value = user.address || DEFAULT_USER.address;
  if (checkDefaultAddress) checkDefaultAddress.checked = user.isDefaultAddress !== false;
  if (checkNotifySms) checkNotifySms.checked = user.notifySms !== false;
  if (checkNotifyEmail) checkNotifyEmail.checked = user.notifyEmail !== false;

  // Cập nhật họ tên trên Sidebar
  const sidebarName = document.getElementById('sidebar-user-name');
  if (sidebarName) {
    sidebarName.textContent = user.fullname || DEFAULT_USER.fullname;
  }

  // Cập nhật số dư ví ảo từ LocalStorage (nếu có cập nhật trước đó)
  const savedBalance = localStorage.getItem(STORAGE_KEY_WALLET);
  const balanceAmount = savedBalance ? parseInt(savedBalance, 10) : (user.walletBalance || DEFAULT_USER.walletBalance);
  updateWalletDisplay(balanceAmount);

  // Cập nhật thời gian lưu gần nhất
  const lastUpdateElement = document.getElementById('last-update-time');
  if (lastUpdateElement && user.lastUpdated) {
    lastUpdateElement.textContent = user.lastUpdated;
  }
}

/**
 * Xử lý sự kiện lưu thay đổi thông tin tài khoản
 */
function initProfileForm() {
  const form = document.getElementById('profile-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const fullname = document.getElementById('user-fullname')?.value.trim();
    const email = document.getElementById('user-email')?.value.trim();
    const phone = document.getElementById('user-phone')?.value.trim();
    const address = document.getElementById('user-address')?.value.trim();
    const isDefaultAddress = document.getElementById('user-default-address')?.checked;
    const notifySms = document.getElementById('notify-sms')?.checked;
    const notifyEmail = document.getElementById('notify-email')?.checked;

    // Kiểm tra tính hợp lệ cơ bản của dữ liệu
    if (!fullname) {
      showToast('Vui lòng nhập họ và tên đầy đủ!', true);
      document.getElementById('user-fullname')?.focus();
      return;
    }

    if (!email || !email.includes('@')) {
      showToast('Vui lòng nhập địa chỉ email hợp lệ!', true);
      document.getElementById('user-email')?.focus();
      return;
    }

    if (!phone || phone.length < 9) {
      showToast('Vui lòng nhập số điện thoại hợp lệ (từ 10 số)!', true);
      document.getElementById('user-phone')?.focus();
      return;
    }

    if (!address) {
      showToast('Vui lòng nhập địa chỉ nhận hàng chi tiết!', true);
      document.getElementById('user-address')?.focus();
      return;
    }

    // Định dạng thời gian cập nhật hiện tại
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const lastUpdated = `Hôm nay, ${hours}:${minutes}`;

    // Lưu vào đối tượng người dùng
    const updatedUser = {
      fullname,
      email,
      phone,
      address,
      isDefaultAddress,
      notifySms,
      notifyEmail,
      lastUpdated
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));

    // Cập nhật thời gian và họ tên trên giao diện Sidebar
    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = fullname;

    const lastUpdateElement = document.getElementById('last-update-time');
    if (lastUpdateElement) lastUpdateElement.textContent = lastUpdated;

    // Hiển thị thông báo Toast thành công
    showToast('Lưu thay đổi thông tin thành công!');
  });
}

/**
 * Xử lý mở và đóng Modal Đổi mật khẩu
 */
function initPasswordModal() {
  const modal = document.getElementById('modal-password');
  const btnOpen = document.getElementById('btn-change-password');
  const btnNavOpen = document.getElementById('nav-btn-security');
  const form = document.getElementById('password-form');
  if (!modal) return;

  const openModal = () => {
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('current-password')?.focus();
  };

  const closeModal = () => {
    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
    if (form) form.reset();
  };

  if (btnOpen) btnOpen.addEventListener('click', openModal);
  if (btnNavOpen) btnNavOpen.addEventListener('click', openModal);

  // Gắn sự kiện đóng modal cho nút đóng và lớp phủ nền (backdrop)
  modal.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  // Đóng modal khi nhấn phím Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-active')) {
      closeModal();
    }
  });

  // Xử lý gửi biểu mẫu đổi mật khẩu
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById('current-password')?.value;
      const newPassword = document.getElementById('new-password')?.value;
      const confirmPassword = document.getElementById('confirm-password')?.value;

      if (!currentPassword) {
        showToast('Vui lòng nhập mật khẩu hiện tại!', true);
        return;
      }

      if (!newPassword || newPassword.length < 8) {
        showToast('Mật khẩu mới phải có tối thiểu 8 ký tự!', true);
        return;
      }

      if (newPassword !== confirmPassword) {
        showToast('Xác nhận mật khẩu mới không trùng khớp!', true);
        return;
      }

      // Mô phỏng cập nhật mật khẩu thành công
      closeModal();
      showToast('Đổi mật khẩu tài khoản thành công!');
    });
  }
}

/**
 * Xử lý mở và đóng Modal Nạp tiền ví ảo mô phỏng
 */
function initDepositModal() {
  const modal = document.getElementById('modal-deposit');
  const btnOpen = document.getElementById('btn-deposit-wallet');
  const form = document.getElementById('deposit-form');
  if (!modal) return;

  const openModal = () => {
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
  };

  if (btnOpen) btnOpen.addEventListener('click', openModal);

  modal.querySelectorAll('[data-close-deposit]').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-active')) {
      closeModal();
    }
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const amountSelect = document.getElementById('deposit-amount');
      const addAmount = amountSelect ? parseInt(amountSelect.value, 10) : 10000000;

      const currentBalance = getCurrentWalletBalance();
      const newBalance = currentBalance + addAmount;

      localStorage.setItem(STORAGE_KEY_WALLET, newBalance.toString());
      updateWalletDisplay(newBalance);

      closeModal();
      showToast(`Nạp thành công ${formatCurrency(addAmount)} vào ví ảo!`);
    });
  }
}

/**
 * Lấy số dư ví hiện tại
 * @returns {number}
 */
function getCurrentWalletBalance() {
  const saved = localStorage.getItem(STORAGE_KEY_WALLET);
  return saved ? parseInt(saved, 10) : DEFAULT_USER.walletBalance;
}

/**
 * Cập nhật định dạng hiển thị số dư ví ảo
 * @param {number} amount
 */
function updateWalletDisplay(amount) {
  const balanceEl = document.getElementById('pcb-wallet-balance');
  if (balanceEl) {
    balanceEl.textContent = formatCurrency(amount);
  }
}

/**
 * Định dạng tiền tệ VNĐ (VD: 50.000.000 đ)
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return value.toLocaleString('vi-VN') + ' đ';
}

/**
 * Xử lý đăng xuất tài khoản và chuyển hướng về trang chủ index.html
 */
function initLogout() {
  const logoutBtn = document.getElementById('btn-logout');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', () => {
    // Hiển thị thông báo và chuyển hướng về index.html sau 300ms
    showToast('Đang đăng xuất khỏi hệ thống PCBid...');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 400);
  });
}

/**
 * Biến lưu trữ hẹn giờ tự đóng thông báo Toast
 */
let toastTimeout = null;

/**
 * Hiển thị thanh thông báo nổi Toast
 * @param {string} message - Nội dung thông báo
 * @param {boolean} isError - Trạng thái lỗi (màu đỏ) hay thành công (màu xanh lá)
 */
function showToast(message, isError = false) {
  const toast = document.getElementById('pcb-toast');
  const toastText = document.getElementById('pcb-toast-text');
  if (!toast || !toastText) return;

  toastText.textContent = message;

  // Đổi màu biểu tượng tương ứng với trạng thái lỗi hoặc thành công
  const iconBox = toast.querySelector('.pcb-toast__icon-box');
  if (iconBox) {
    iconBox.style.backgroundColor = isError ? '#EF4444' : '#10B981';
  }

  toast.classList.add('is-show');

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    toast.classList.remove('is-show');
  }, 3000);
}
