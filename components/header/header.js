/**
 * LOGIC ĐIỀU KHIỂN THÀNH PHẦN HEADER
 * Quản lý tương tác tìm kiếm, đồng bộ danh mục và kích hoạt tab đang xem
 */
export function initHeader() {
  initSearchHandler();
  initActiveNavLink();
  initCategorySelectSync();
}

/**
 * Xử lý sự kiện gửi form tìm kiếm
 * Ngăn chặn gửi dữ liệu khi ô nhập liệu trống
 */
function initSearchHandler() {
  const searchForm = document.querySelector('.header__search-form');
  if (!searchForm) return;

  searchForm.addEventListener('submit', (e) => {
    const input = searchForm.querySelector('.header__search-input');
    if (!input || !input.value.trim()) {
      e.preventDefault();
      input?.focus();
    }
  });
}

/**
 * Đồng bộ nhãn hiển thị danh mục khi người dùng thay đổi lựa chọn trong thẻ select
 */
function initCategorySelectSync() {
  const select = document.querySelector('.header__search-select');
  const label = document.querySelector('.header__search-category-text');
  if (!select || !label) return;

  select.addEventListener('change', () => {
    const selectedOption = select.options[select.selectedIndex];
    label.textContent = selectedOption.text;
  });
}

/**
 * Tự động đánh dấu liên kết danh mục đang hoạt động (active link) dựa vào URL hiện tại
 */
function initActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const urlParams = new URLSearchParams(window.location.search);
  const currentCategory = urlParams.get('category');
  const currentStatus = urlParams.get('status');

  const navLinks = document.querySelectorAll('.header__nav-link');
  if (!navLinks.length) return;

  navLinks.forEach((link) => {
    link.classList.remove('header__nav-link--active');
    const href = link.getAttribute('href');

    if (!href) return;

    if (currentCategory && href.includes(`category=${currentCategory}`)) {
      link.classList.add('header__nav-link--active');
    } else if (currentStatus && href.includes(`status=${currentStatus}`)) {
      link.classList.add('header__nav-link--active');
    } else if (!currentCategory && !currentStatus && href === currentPath) {
      link.classList.add('header__nav-link--active');
    }
  });
}
