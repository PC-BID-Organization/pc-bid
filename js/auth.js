/**
 * PCBid - Tập lệnh xử lý Trang xác thực (Authentication Script)
 * Quản lý kiểm tra hợp lệ biểu mẫu đăng ký, đăng nhập, ẩn/hiện mật khẩu,
 * lưu tài khoản vào LocalStorage và hiển thị pop-up thông báo thành công.
 * Toàn bộ chú thích được viết bằng tiếng Việt có dấu theo chuẩn quy định
 */

// Tài khoản demo và tiện ích tên / avatar dùng chung
import { DEMO_ACCOUNTS, getGivenName } from './accounts.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Khởi tạo chức năng ẩn/hiện mật khẩu (dùng chung cho Đăng ký & Đăng nhập)
  initPasswordToggles();

  // 2. Khởi tạo xử lý biểu mẫu đăng ký thành viên
  initRegisterForm();

  // 3. Khởi tạo xử lý biểu mẫu đăng nhập
  initLoginForm();

  // 4. Khởi tạo dữ liệu hạt giống 2 tài khoản demo
  seedSampleAccounts();
});

/**
 * Khóa lưu trữ thông tin tài khoản người dùng trong LocalStorage
 */
const STORAGE_KEY_USER = 'pcbid_currentUser';
const STORAGE_KEY_USERS = 'pcbid_registered_users';
const STORAGE_KEY_PREFILL = 'pcbid_prefill_email';

/**
 * Danh sách 4 tài khoản demo gắn với 4 thành viên nhóm, phục vụ demo, chấm điểm và kiểm thử phân quyền
 * bidder1: Nguyễn Hùng Phong (ví 50tr) · bidder2: Nguyễn Nhật Huy (ví 60tr)
 * bidder3: Huỳnh Nhật Minh (ví 55tr) · seller: Nguyễn Gia Huy (người bán, ví 80tr)
 */
// 4 tài khoản demo lấy từ module dùng chung js/accounts.js
const SAMPLE_ACCOUNTS = DEMO_ACCOUNTS;

function seedSampleAccounts() {
  try {
    let existing = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
    let modified = false;
    SAMPLE_ACCOUNTS.forEach(demoAcc => {
      const idx = existing.findIndex(u => u.username === demoAcc.username || u.email === demoAcc.email);
      if (idx === -1) {
        existing.push(demoAcc);
        modified = true;
      }
    });
    if (modified || existing.length === 0) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(existing.length > 0 ? existing : SAMPLE_ACCOUNTS));
    }
  } catch {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(SAMPLE_ACCOUNTS));
  }
}

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
 * Xử lý kiểm tra và gửi biểu mẫu đăng nhập (Dành cho login.html)
 */
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const inputUsername = document.getElementById('login-username');
  const inputPassword = document.getElementById('login-password');

  // Tự động điền email nếu vừa hoàn tất đăng ký ở trang register.html
  const prefillEmail = localStorage.getItem(STORAGE_KEY_PREFILL);
  if (prefillEmail && inputUsername && !inputUsername.value) {
    inputUsername.value = prefillEmail;
    // Xóa prefill sau khi đã tự động điền
    localStorage.removeItem(STORAGE_KEY_PREFILL);
  }

  // Lắng nghe sự kiện người dùng nhập liệu để xóa lỗi đỏ
  [inputUsername, inputPassword].forEach(input => {
    if (!input) return;
    input.addEventListener('input', () => clearFieldError(input));
  });

  // Lắng nghe sự kiện click nút chọn nhanh tài khoản demo
  const demoButtons = document.querySelectorAll('.pcb-demo-btn');
  demoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const demoKey = btn.getAttribute('data-demo-user');
      const targetAcc = SAMPLE_ACCOUNTS.find(a => a.username === demoKey) || SAMPLE_ACCOUNTS[0];

      if (inputUsername) inputUsername.value = targetAcc.email;
      if (inputPassword) inputPassword.value = targetAcc.password;

      clearFieldError(inputUsername, 'err-login-username');
      clearFieldError(inputPassword, 'err-login-password');

      // Hiệu ứng phản hồi thị giác
      btn.style.borderColor = '#10b981';
      btn.style.backgroundColor = '#ecfdf5';
      setTimeout(() => {
        btn.style.borderColor = '#a7f3d0';
        btn.style.backgroundColor = '#ffffff';
      }, 400);
    });
  });

  // Lắng nghe sự kiện submit biểu mẫu đăng nhập
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;

    // 1. Kiểm tra Tên đăng nhập / Email
    const usernameVal = inputUsername ? inputUsername.value.trim() : '';
    if (!usernameVal) {
      showFieldError(inputUsername, 'err-login-username', 'Vui lòng nhập tên đăng nhập hoặc email.');
      isValid = false;
    } else {
      clearFieldError(inputUsername, 'err-login-username');
    }

    // 2. Kiểm tra Mật khẩu
    const pwdVal = inputPassword ? inputPassword.value : '';
    if (!pwdVal) {
      showFieldError(inputPassword, 'err-login-password', 'Vui lòng nhập mật khẩu.');
      isValid = false;
    } else {
      clearFieldError(inputPassword, 'err-login-password');
    }

    if (!isValid) return;

    // Tra cứu tài khoản từ danh sách đăng ký hoặc danh sách tài khoản mẫu có sẵn
    const registeredUsers = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
    const allKnownUsers = [...SAMPLE_ACCOUNTS, ...registeredUsers];
    const lowerInput = usernameVal.toLowerCase();

    // Tìm kiếm theo username, email, hoặc alias linh hoạt
    const matched = allKnownUsers.find(u => 
      (u.email && u.email.toLowerCase() === lowerInput) || 
      (u.username && u.username.toLowerCase() === lowerInput) ||
      ((lowerInput === 'bidder' || lowerInput === 'bidder1' || lowerInput === 'pcbuilder99') && u.username === 'bidder1') ||
      (lowerInput === 'bidder2' && u.username === 'bidder2') ||
      (lowerInput === 'bidder3' && u.username === 'bidder3') ||
      ((lowerInput === 'seller' || lowerInput === 'techguru_hcm') && u.username === 'seller')
    );

    let userData;
    if (matched) {
      userData = {
        ...matched,
        isLoggedIn: true,
        loggedInAt: new Date().toISOString()
      };
    } else {
      const uname = usernameVal.includes('@') ? usernameVal.split('@')[0] : usernameVal;
      userData = {
        id: 'user_' + Date.now(),
        username: uname,
        fullname: uname,
        email: usernameVal.includes('@') ? usernameVal : `${uname}@pcbid.vn`,
        phone: '0912345678',
        role: 'bidder',
        verified: true,
        walletBalance: 50000000,
        address: 'Trường Đại học Công nghệ Thông tin, Khu phố 6, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
        isLoggedIn: true,
        loggedInAt: new Date().toISOString()
      };
    }

    localStorage.removeItem('pcbid_logged_out');
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
    localStorage.setItem('pcbid_user', JSON.stringify(userData));

    // Chuyển hướng sang trang profile.html (hoặc index.html)
    window.location.href = 'profile.html';
  });
}

/**
 * Xử lý kiểm tra và gửi biểu mẫu đăng ký (Dành cho register.html)
 */
function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  const inputLastname = document.getElementById('reg-lastname');
  const inputGivenname = document.getElementById('reg-givenname');
  const inputGender = document.getElementById('reg-gender');
  const inputBirthdate = document.getElementById('reg-birthdate');
  // Không cho chọn ngày sinh trong tương lai
  if (inputBirthdate) inputBirthdate.max = new Date().toISOString().slice(0, 10);
  const inputEmail = document.getElementById('reg-email');
  const inputPhone = document.getElementById('reg-phone');
  const inputPassword = document.getElementById('reg-password');
  const inputConfirmPassword = document.getElementById('reg-confirm-password');
  const checkTerms = document.getElementById('reg-terms');

  // Lắng nghe sự kiện người dùng nhập liệu để xóa lỗi đỏ tức thì
  [inputLastname, inputGivenname, inputGender, inputBirthdate, inputEmail, inputPhone, inputPassword, inputConfirmPassword].forEach(input => {
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

    // 1. Kiểm tra Họ và tên đệm, Tên (chuẩn hóa khoảng trắng thừa)
    const lastnameVal = inputLastname ? inputLastname.value.trim().replace(/\s+/g, ' ') : '';
    const givennameVal = inputGivenname ? inputGivenname.value.trim().replace(/\s+/g, ' ') : '';
    const nameRegex = /^[\p{L}\s'-]+$/u;
    if (!lastnameVal) {
      showFieldError(inputLastname, 'err-lastname', 'Vui lòng nhập họ và tên đệm.');
      isValid = false;
    } else if (!nameRegex.test(lastnameVal)) {
      showFieldError(inputLastname, 'err-lastname', 'Họ và tên đệm chỉ gồm chữ cái.');
      isValid = false;
    } else {
      clearFieldError(inputLastname, 'err-lastname');
    }
    if (!givennameVal) {
      showFieldError(inputGivenname, 'err-givenname', 'Vui lòng nhập tên của bạn.');
      isValid = false;
    } else if (!nameRegex.test(givennameVal) || givennameVal.includes(' ')) {
      showFieldError(inputGivenname, 'err-givenname', 'Tên là một từ, chỉ gồm chữ cái (ví dụ: Phong).');
      isValid = false;
    } else {
      clearFieldError(inputGivenname, 'err-givenname');
    }
    const fullnameVal = `${lastnameVal} ${givennameVal}`.trim();

    // 1b. Kiểm tra Giới tính và Ngày sinh (độ tuổi từ 13 đến 100)
    const genderVal = inputGender ? inputGender.value : '';
    if (!genderVal) {
      showFieldError(inputGender, 'err-gender', 'Vui lòng chọn giới tính.');
      isValid = false;
    } else {
      clearFieldError(inputGender, 'err-gender');
    }
    const birthVal = inputBirthdate ? inputBirthdate.value : '';
    const birthTime = new Date(birthVal).getTime();
    const age = (Date.now() - birthTime) / (365.25 * 24 * 3600 * 1000);
    if (!birthVal) {
      showFieldError(inputBirthdate, 'err-birthdate', 'Vui lòng chọn ngày sinh.');
      isValid = false;
    } else if (Number.isNaN(birthTime) || age < 13 || age > 100) {
      showFieldError(inputBirthdate, 'err-birthdate', 'Ngày sinh không hợp lệ (độ tuổi từ 13 đến 100).');
      isValid = false;
    } else {
      clearFieldError(inputBirthdate, 'err-birthdate');
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

    // Nếu có trường không hợp lệ, dừng lại
    if (!isValid) return;

    // Tiến hành lưu thông tin tài khoản người dùng vào LocalStorage
    saveUserAccount({
      id: 'user_' + Date.now(),
      username: emailVal.split('@')[0],
      lastName: lastnameVal,
      givenName: givennameVal,
      fullname: fullnameVal,
      gender: genderVal,
      birthDate: birthVal,
      email: emailVal,
      phone: phoneVal,
      role: 'bidder',
      verified: true,
      walletBalance: 50000000,
      address: 'Trường Đại học Công nghệ Thông tin, TP. Thủ Đức, TP. Hồ Chí Minh',
      registeredAt: new Date().toISOString()
    });

    // Mở Pop-up thông báo Đăng ký thành công
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
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
  localStorage.setItem(STORAGE_KEY_PREFILL, userData.email);

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
    window.location.href = 'login.html';
    return;
  }

  const userNameEl = document.getElementById('success-user-name');
  const userEmailEl = document.getElementById('success-user-email');
  const userPhoneEl = document.getElementById('success-user-phone');

  if (userNameEl) userNameEl.textContent = info.fullname;
  if (userEmailEl) userEmailEl.textContent = info.email;
  if (userPhoneEl) userPhoneEl.textContent = info.phone;

  modal.classList.add('is-active');
  modal.setAttribute('aria-hidden', 'false');

  let secondsRemaining = 3;
  const countdownNumberEl = document.getElementById('countdown-number');
  const progressBarEl = document.getElementById('countdown-progress');

  const totalTime = 3000;
  const startTime = Date.now();

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