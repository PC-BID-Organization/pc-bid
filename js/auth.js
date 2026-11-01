/**
 * PCBid - Tập lệnh xử lý Trang xác thực (Authentication Script)
 * Quản lý kiểm tra hợp lệ biểu mẫu đăng ký, ẩn/hiện mật khẩu, lưu tài khoản vào LocalStorage
 * và hiển thị pop-up thông báo thành công kèm tự động chuyển hướng.
 * Toàn bộ chú thích được viết bằng tiếng Việt có dấu theo chuẩn quy định
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Khởi tạo chức năng ẩn/hiện mật khẩu
  initPasswordToggles();

  // 2. Khởi tạo xử lý biểu mẫu đăng ký thành viên
  initRegisterForm();
});

/**
 * Khóa lưu trữ thông tin tài khoản người dùng trong LocalStorage
 */
const STORAGE_KEY_USER = 'pcbid_user';
const STORAGE_KEY_USERS = 'pcbid_registered_users';
const STORAGE_KEY_PREFILL = 'pcbid_prefill_email';

/**
 * Xử lý sự kiện nhấn nút ẩn/hiện mật khẩu
 */
function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.pcb-auth-form__toggle-pwd');

  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      // Chuyển đổi trạng thái hiển thị của icon mắt
      const eyeIcon = btn.querySelector('.pcb-icon-eye');
      const eyeOffIcon = btn.querySelector('.pcb-icon-eye-off');

      if (eyeIcon && eyeOffIcon) {
        eyeIcon.style.display = isPassword ? 'none' : 'block';
        eyeOffIcon.style.display = isPassword ? 'block' : 'none';
      }

      btn.setAttribute('title', isPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu');
    });
  });
}

/**
 * Xử lý kiểm tra và gửi biểu mẫu đăng ký
 */
function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  const inputFullname = document.getElementById('reg-fullname');
  const inputEmail = document.getElementById('reg-email');
  const inputPhone = document.getElementById('reg-phone');
  const inputPassword = document.getElementById('reg-password');
  const inputConfirmPassword = document.getElementById('reg-confirm-password');
  const checkTerms = document.getElementById('reg-terms');

  // Lắng nghe sự kiện người dùng nhập liệu để xóa lỗi đỏ tức thì
  [inputFullname, inputEmail, inputPhone, inputPassword, inputConfirmPassword].forEach(input => {
    if (!input) return;
    input.addEventListener('input', () => clearFieldError(input));
  });

  if (checkTerms) {
    checkTerms.addEventListener('change', () => {
      if (checkTerms.checked) {
        clearFieldError(checkTerms, 'err-terms');
      }
    });
  }

  // Lắng nghe sự kiện submit biểu mẫu
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;

    // 1. Kiểm tra Họ và tên
    const fullnameVal = inputFullname ? inputFullname.value.trim() : '';
    if (!fullnameVal) {
      showFieldError(inputFullname, 'err-fullname', 'Vui lòng nhập họ và tên của bạn.');
      isValid = false;
    } else if (fullnameVal.length < 2) {
      showFieldError(inputFullname, 'err-fullname', 'Họ và tên cần có ít nhất 2 ký tự.');
      isValid = false;
    } else {
      clearFieldError(inputFullname, 'err-fullname');
    }

    // 2. Kiểm tra Địa chỉ Email
    const emailVal = inputEmail ? inputEmail.value.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal) {
      showFieldError(inputEmail, 'err-email', 'Vui lòng nhập địa chỉ email.');
      isValid = false;
    } else if (!emailRegex.test(emailVal)) {
      showFieldError(inputEmail, 'err-email', 'Định dạng email không hợp lệ (VD: user@example.com).');
      isValid = false;
    } else {
      clearFieldError(inputEmail, 'err-email');
    }

    // 3. Kiểm tra Số điện thoại
    const phoneVal = inputPhone ? inputPhone.value.trim() : '';
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneVal) {
      showFieldError(inputPhone, 'err-phone', 'Vui lòng nhập số điện thoại liên hệ.');
      isValid = false;
    } else if (!phoneRegex.test(phoneVal)) {
      showFieldError(inputPhone, 'err-phone', 'Số điện thoại phải gồm 10 đến 11 chữ số.');
      isValid = false;
    } else {
      clearFieldError(inputPhone, 'err-phone');
    }

    // 4. Kiểm tra Mật khẩu
    const pwdVal = inputPassword ? inputPassword.value : '';
    if (!pwdVal) {
      showFieldError(inputPassword, 'err-password', 'Vui lòng đặt mật khẩu bảo vệ tài khoản.');
      isValid = false;
    } else if (pwdVal.length < 8) {
      showFieldError(inputPassword, 'err-password', 'Mật khẩu phải chứa tối thiểu 8 ký tự.');
      isValid = false;
    } else {
      clearFieldError(inputPassword, 'err-password');
    }

    // 5. Kiểm tra Xác nhận Mật khẩu
    const confirmPwdVal = inputConfirmPassword ? inputConfirmPassword.value : '';
    if (!confirmPwdVal) {
      showFieldError(inputConfirmPassword, 'err-confirm-password', 'Vui lòng nhập lại mật khẩu vừa tạo.');
      isValid = false;
    } else if (confirmPwdVal !== pwdVal) {
      showFieldError(inputConfirmPassword, 'err-confirm-password', 'Mật khẩu xác nhận không trùng khớp.');
      isValid = false;
    } else {
      clearFieldError(inputConfirmPassword, 'err-confirm-password');
    }

    // 6. Kiểm tra Checkbox đồng ý Quy chế hoạt động
    if (checkTerms && !checkTerms.checked) {
      showFieldError(checkTerms, 'err-terms', 'Bạn cần đồng ý với Quy chế hoạt động sàn PCBid để đăng ký.');
      isValid = false;
    } else if (checkTerms) {
      clearFieldError(checkTerms, 'err-terms');
    }

    // Nếu có trường không hợp lệ, cuộn tới trường lỗi đầu tiên
    if (!isValid) return;

    // Tiến hành lưu thông tin tài khoản người dùng vào LocalStorage
    saveUserAccount({
      fullname: fullnameVal,
      email: emailVal,
      phone: phoneVal,
      walletBalance: 50000000,
      walletHold: 0,
      registeredAt: new Date().toISOString()
    });

    // Mở Pop-up thông báo Đăng ký thành công kèm đếm ngược chuyển hướng sang login.html
    openSuccessModal({
      fullname: fullnameVal,
      email: emailVal,
      phone: phoneVal
    });
  });
}

/**
 * Hiển thị lỗi trường dữ liệu
 * @param {HTMLElement} inputEl 
 * @param {string} errId 
 * @param {string} message 
 */
function showFieldError(inputEl, errId, message) {
  if (inputEl) inputEl.classList.add('is-invalid');
  const errEl = document.getElementById(errId);
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.add('is-visible');
  }
}

/**
 * Xóa trạng thái lỗi của trường dữ liệu
 * @param {HTMLElement} inputEl 
 * @param {string} [errId] 
 */
function clearFieldError(inputEl, errId) {
  if (inputEl) inputEl.classList.remove('is-invalid');
  const errElement = errId ? document.getElementById(errId) : inputEl?.closest('.pcb-auth-form__group')?.querySelector('.pcb-auth-form__error');
  if (errElement) {
    errElement.textContent = '';
    errElement.classList.remove('is-visible');
  }
}

/**
 * Lưu thông tin tài khoản vào LocalStorage
 * @param {Object} userData 
 */
function saveUserAccount(userData) {
  // Lưu người dùng hiện tại
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));

  // Lưu email để login.html có thể tự động điền sẵn
  localStorage.setItem(STORAGE_KEY_PREFILL, userData.email);

  // Thêm vào danh sách tài khoản đã đăng ký trong hệ thống
  const existingUsers = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  const userIndex = existingUsers.findIndex(u => u.email === userData.email);
  if (userIndex >= 0) {
    existingUsers[userIndex] = userData;
  } else {
    existingUsers.push(userData);
  }
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(existingUsers));
}

/**
 * Quản lý biến đếm ngược chuyển hướng
 */
let countdownTimer = null;
let progressAnimation = null;

/**
 * Mở Pop-up đăng ký thành công và tự động đếm ngược chuyển hướng
 * @param {Object} info 
 */
function openSuccessModal(info) {
  const modal = document.getElementById('modal-register-success');
  if (!modal) {
    // Nếu không tìm thấy modal, chuyển hướng thẳng sang login.html
    window.location.href = 'login.html';
    return;
  }

  // Điền dữ liệu người dùng vào khung tóm tắt của pop-up
  const userNameEl = document.getElementById('success-user-name');
  const userEmailEl = document.getElementById('success-user-email');
  const userPhoneEl = document.getElementById('success-user-phone');

  if (userNameEl) userNameEl.textContent = info.fullname;
  if (userEmailEl) userEmailEl.textContent = info.email;
  if (userPhoneEl) userPhoneEl.textContent = info.phone;

  // Hiển thị modal pop-up
  modal.classList.add('is-active');
  modal.setAttribute('aria-hidden', 'false');

  // Đếm ngược 3 giây chuyển sang trang login.html
  let secondsRemaining = 3;
  const countdownNumberEl = document.getElementById('countdown-number');
  const progressBarEl = document.getElementById('countdown-progress');

  const totalTime = 3000;
  const startTime = Date.now();

  // Hiệu ứng thanh tiến trình mượt mà (smooth progress bar)
  const updateProgress = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.max(0, 100 - (elapsed / totalTime) * 100);
    if (progressBarEl) {
      progressBarEl.style.width = `${progress}%`;
    }

    if (elapsed < totalTime) {
      progressAnimation = requestAnimationFrame(updateProgress);
    }
  };
  progressAnimation = requestAnimationFrame(updateProgress);

  // Bộ đếm lùi số giây hiển thị
  countdownTimer = setInterval(() => {
    secondsRemaining -= 1;
    if (countdownNumberEl) {
      countdownNumberEl.textContent = secondsRemaining.toString();
    }

    if (secondsRemaining <= 0) {
      clearInterval(countdownTimer);
      cancelAnimationFrame(progressAnimation);
      window.location.href = 'login.html';
    }
  }, 1000);

  // Xử lý khi người dùng bấm trực tiếp vào nút "Đăng nhập ngay"
  const btnGoLogin = document.getElementById('btn-go-to-login');
  if (btnGoLogin) {
    btnGoLogin.addEventListener('click', (e) => {
      e.preventDefault();
      clearInterval(countdownTimer);
      cancelAnimationFrame(progressAnimation);
      window.location.href = 'login.html';
    });
  }
}
