# PCBid - Website Đấu Giá Linh Kiện PC Cũ & Vintage

Đồ án môn học: **IE104 - Internet & Công nghệ Web**  
Giảng viên hướng dẫn: **ThS. Võ Tấn Khoa**  
Trường: **Đại học Công nghệ Thông tin - ĐHQG-HCM (UIT)**

---

## 1. Giới thiệu dự án

**PCBid** là nền tảng web mô phỏng sàn đấu giá trực tuyến dành riêng cho linh kiện máy tính cũ và vintage (Used / Vintage PC Parts Auction). 

Khác với các trang web thương mại điện tử mua bán thông thường, cơ chế cốt lõi của PCBid tập trung hoàn toàn vào **đấu giá theo thời gian thực (Auction & Bidding Simulation)**: người bán đặt giá khởi điểm & thời hạn đấu giá, người mua theo dõi đồng hồ đếm ngược và tham gia trả giá cạnh tranh.

---

## 2. Công nghệ sử dụng & Ràng buộc kỹ thuật (Hard Constraints)

Dự án được xây dựng phục vụ yêu cầu học phần IE104 với tiêu chí **100% mã nguồn thuần (Vanilla)**:

* **Frontend:** HTML5 (Ngữ nghĩa semantic), CSS3 (Flexbox, CSS Grid, Responsive, BEM convention), Vanilla JavaScript (ES6+).
* **Tuyệt đối KHÔNG sử dụng:**
  * Framework/Thư viện CSS: Bootstrap, Tailwind CSS, Bulma,...
  * Framework/Thư viện JS: React, Vue, Angular, jQuery,...
  * Backend & Server: Node.js, Express, Python/Django, PHP, Spring Boot,...
  * Cơ sở dữ liệu thật: MySQL, MongoDB, Firebase, Supabase,...
* **Mô phỏng dữ liệu & Trạng thái:**
  * Dữ liệu khởi tạo (mock data): Các file `.json` hoặc hằng số dữ liệu trong Javascript.
  * Lưu trữ trạng thái phiên người dùng: `localStorage` & `sessionStorage` (phiên đăng nhập, lịch sử đặt giá, các sản phẩm mới đăng, danh sách quan tâm).
* **Triển khai (Deployment):** Static Hosting (GitHub Pages).

---

## 3. Danh sách màn hình & Chức năng dự kiến (7 - 9 màn hình)

1. **Trang chủ (`index.html`)**:
   - Banner hero giới thiệu, danh mục linh kiện (CPU, GPU, RAM, Mainboard, Vintage...).
   - Danh sách phiên đấu giá hot / nổi bật, phiên đấu giá sắp kết thúc (kèm đồng hồ đếm ngược).
   - Thanh điều hướng (Header) có ô tìm kiếm live search, modal/nút đăng nhập, giỏ theo dõi.
2. **Danh sách sản phẩm / Phiên đấu giá (`products.html`)**:
   - Bộ lọc linh kiện đa năng (theo danh mục, khoảng giá, tình trạng New/Like New/Used, thời gian còn lại).
   - Sắp xếp (giá tăng/giảm, sắp hết hạn, lượt bid nhiều nhất).
   - Tìm kiếm theo từ khóa thời gian thực.
3. **Chi tiết phiên đấu giá (`product-detail.html`)**:
   - Thư viện ảnh sản phẩm (Gallery / Image preview).
   - Thông số kỹ thuật linh kiện, tình trạng, thông tin người bán.
   - Bảng giá thị trường tham khảo (so sánh giá mới vs giá bid hiện tại).
   - Bộ đếm thời gian ngược (Live countdown).
   - Khung đặt giá (Bidding box): Kiểm tra tính hợp lệ của bước giá, cập nhật giá cao nhất tức thì.
   - Bảng lịch sử đặt giá (Bid history log).
4. **Tạo phiên đấu giá mới (`sell.html`)**:
   - Biểu mẫu đăng linh kiện đấu giá: Tên, danh mục, cấu hình, tình trạng, giá khởi điểm, bước giá tối thiểu, thời hạn đấu giá.
   - Xử lý lưu phiên mới vào `localStorage`.
5. **Xác thực người dùng mô phỏng (`login.html` & `register.html` hoặc Modal Popup)**:
   - Form đăng ký, đăng nhập tài khoản với validation chuẩn HTML5 & JS.
   - Quản lý phiên đăng nhập mô phỏng qua `localStorage`.
6. **Hồ sơ cá nhân (`profile.html`)**:
   - Thông tin cá nhân người dùng, số dư ví ảo mô phỏng, đánh giá uy tín người dùng.
7. **Quản lý đấu giá của tôi (`my-auctions.html`)**:
   - Danh sách sản phẩm đang tham gia đặt giá (đang dẫn đầu / đã bị vượt giá).
   - Danh sách sản phẩm do chính user đăng bán (đang diễn ra, đã kết thúc, người thắng cuộc).
8. **Trang lỗi (`404.html`)**:
   - Giao diện thông báo trang không tồn tại kèm nút quay về trang chủ.

---

## 4. Cấu trúc thư mục dự kiến

Tuân thủ hướng dẫn tổ chức mã nguồn chuẩn của đồ án:

```text
pc-bid/
├── assets/
│   ├── css/
│   │   ├── reset.css          # Reset CSS mặc định trình duyệt
│   │   ├── style.css          # Phong cách chung (biến màu sắc, typography, button, modal, header/footer)
│   │   ├── home.css           # Style riêng cho trang chủ
│   │   ├── products.css       # Style cho trang danh sách/bộ lọc
│   │   ├── detail.css         # Style chi tiết sản phẩm & phòng đấu giá
│   │   └── profile.css        # Style trang tài khoản & quản lý
│   ├── js/
│   │   ├── data.js            # Mock dataset ban đầu (sản phẩm, tài khoản mẫu)
│   │   ├── storage.js         # Wrapper tiện ích đọc/ghi localStorage
│   │   ├── main.js            # Xử lý chung: Navbar, Modal, Search bar, Auth state
│   │   ├── countdown.js       # Module xử lý đồng hồ đếm ngược
│   │   ├── products.js        # Logic lọc, tìm kiếm, sắp xếp danh sách
│   │   ├── detail.js          # Logic đặt giá, validate bước giá, lịch sử bid
│   │   └── sell.js            # Logic đăng bán sản phẩm mới
│   ├── images/
│   │   ├── products/          # Hình ảnh linh kiện máy tính
│   │   ├── banners/           # Banner quảng bá, slider
│   │   └── icons/             # Biểu tượng, logo
│   └── data/
│       └── products.json      # File dữ liệu JSON mẫu (nếu dùng Fetch API)
├── index.html
├── products.html
├── product-detail.html
├── sell.html
├── login.html
├── register.html
├── profile.html
├── my-auctions.html
├── 404.html
├── README.md
└── .gitignore
```

---

## 5. Quy chuẩn lập trình (Coding Conventions)

* **CSS:**
  * Áp dụng phương pháp đặt tên theo chuẩn **BEM** (`block__element--modifier`).
  * Tránh xung đột CSS giữa các trang bằng cách gắn id riêng cho `<body>` hoặc thẻ bao chính (ví dụ: `#home-page`, `#product-page`).
* **JavaScript:**
  * Đặt tên biến và hàm theo chuẩn **camelCase** rõ nghĩa (`currentBid`, `calculateTimeRemaining()`, `handlePlaceBid()`).
  * Tổ chức code theo mô-đun rõ ràng, lắng nghe sự kiện khi DOM đã sẵn sàng (`DOMContentLoaded`).
* **HTML:**
  * Sử dụng thẻ ngữ nghĩa (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`).
  * Mọi ảnh phải có thuộc tính `alt`, ưu tiên `loading="lazy"` cho ảnh dưới khung nhìn.
  * Hợp chuẩn W3C Validator.

---

## 6. Quy trình làm việc nhóm & Git Workflow (Bắt buộc)

Để tránh xung đột mã nguồn và đảm bảo chất lượng code, nhóm áp dụng nghiêm ngặt quy trình **Feature Branch & Pull Request**:

1. **Tuyệt đối không push trực tiếp lên `main`**: Toàn bộ thay đổi phải thông qua Pull Request.
2. **Tạo nhánh mới (Feature Branch)** khi bắt đầu làm việc:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/<ten-tinh-nang>   # hoặc fix/<ten-loi>
   ```
3. **Phát triển và Commit**: Tuân thủ chuẩn Conventional Commits:
   - `feat: thêm bộ lọc sản phẩm theo mức giá`
   - `fix: xử lý lỗi đếm ngược thời gian đấu giá`
4. **Tạo Pull Request (PR)**:
   - Đẩy nhánh lên GitHub: `git push -u origin feat/<ten-tinh-nang>`
   - Mở Pull Request vào nhánh `main` kèm mô tả chi tiết và hình ảnh demo/kết quả test.
5. **Code Review & Merge**:
   - Ít nhất một thành viên khác trong nhóm/nhóm trưởng kiểm tra code và chạy thử nghiệm.
   - Chỉ khi được Approve thì mới được phép merge vào `main`.

---

## 7. Hướng dẫn chạy & Kiểm thử

1. Clone repository về máy:
   ```bash
   git clone https://github.com/PC-BID-Organization/pc-bid.git
   cd pc-bid
   ```
2. Mở file `index.html` trực tiếp trên trình duyệt hoặc chạy thông qua tiện ích **Live Server** (VS Code) / extension tương đương.
3. Dự án không cần cài đặt `npm` hay cài đặt môi trường server backend.

