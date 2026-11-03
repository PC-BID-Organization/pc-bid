<p align="center">
  <img src="images/logo/pcbid-logo-full.png" alt="PCBid Logo" width="450" />
</p>

# PCBid - Website Đấu Giá Linh Kiện PC Cũ

Đồ án môn học: **IE104 - Internet & Công nghệ Web**  
Giảng viên hướng dẫn: **ThS. Võ Tấn Khoa**  
Trường: **Đại học Công nghệ Thông tin - ĐHQG-HCM (UIT)**

---

## 1. Giới thiệu dự án

**PCBid** là nền tảng web mô phỏng sàn đấu giá trực tuyến dành riêng cho linh kiện máy tính cũ (Used PC Parts Auction). 

Khác với các trang web thương mại điện tử mua bán thông thường, cơ chế cốt lõi của PCBid tập trung hoàn toàn vào **đấu giá theo thời gian thực (Auction & Bidding Simulation)**: người bán đặt giá khởi điểm & thời hạn đấu giá, người mua theo dõi đồng hồ đếm ngược và tham gia trả giá cạnh tranh.

---

## 2. Công nghệ sử dụng & Ràng buộc kỹ thuật (Hard Constraints)

Dự án được xây dựng phục vụ yêu cầu học phần IE104 với tiêu chí **100% mã nguồn thuần (Vanilla)**:

* **Frontend:** HTML5 (Ngữ nghĩa semantic), CSS3 (Flexbox, CSS Grid, Responsive, BEM convention), Vanilla JavaScript (ES6+).
* **Kiến trúc Component:** Module hóa Header và Footer độc lập (`components/header/`, `components/footer/`), nạp động qua JavaScript để tái sử dụng xuyên suốt toàn bộ các trang.
* **Tuyệt đối KHÔNG sử dụng:**
  * Framework/Thư viện CSS: Bootstrap, Tailwind CSS, Bulma,...
  * Framework/Thư viện JS: React, Vue, Angular, jQuery,...
  * Backend & Server: Node.js, Express, Python/Django, PHP, Spring Boot,...
  * Cơ sở dữ liệu thật: MySQL, MongoDB, Firebase, Supabase,...
* **Mô phỏng dữ liệu & Trạng thái (SSOT):**
  * Dữ liệu khởi tạo (mock data): Các file `.json` hoặc hằng số dữ liệu trong Javascript (`data/products.json`, `js/data.js`).
  * Lưu trữ trạng thái phiên người dùng: `localStorage` (`pcbid_products`, `pcbid_bids`, `pcbid_my_auctions_participating`, `pcbid_my_auctions_selling`, `pcbid_registered_users`, `pcbid_logged_in_user`).
  * Đồng bộ thời gian thực cross-page và cross-tab qua sự kiện `storage` và `pageshow` (hỗ trợ bfcache).
* **Triển khai (Deployment):** Static Hosting (GitHub Pages).

---

## 3. Danh sách 8 màn hình chính thức

Dự án đã chốt chính xác **8 màn hình** đáp ứng đầy đủ yêu cầu nghiệp vụ:

1. **Trang chủ (`index.html`)**:
   - Hero banner giới thiệu sàn đấu giá linh kiện PC cũ.
   - Danh mục linh kiện nổi bật (GPU, CPU, Mainboard, RAM, SSD/HDD, PSU).
   - Phiên đấu giá Hot nhất, phiên sắp kết thúc (Live Countdown).
   - Đặt giá nhanh (Quick Bid) 1-chạm cập nhật giá thời gian thực.
   - Cam kết sàn (Bao test 7 ngày, kiểm định Furmark, MemTest86).
2. **Danh sách sản phẩm & Bộ lọc (`products.html`)**:
   - Bộ lọc linh kiện đa năng (danh mục, khoảng giá, tình trạng New/Like New/Used).
   - Sắp xếp (giá tăng/giảm, sắp hết hạn, lượt bid nhiều nhất).
   - Tìm kiếm từ khóa thời gian thực.
   - Đồng bộ giá hiện tại và số lượt bid từ storage.
3. **Chi tiết phiên đấu giá (`product-detail.html`)**:
   - Gallery ảnh linh kiện và kiểm định thực tế.
   - Thông số kỹ thuật chi tiết, đánh giá tình trạng linh kiện.
   - Bảng so sánh giá thị trường linh kiện mới vs giá đấu hiện tại.
   - Bộ đếm thời gian ngược (Live Countdown).
   - Khung đặt giá (Bidding Box): Kiểm tra hợp lệ bước giá, tự động cập nhật giá cao nhất.
   - Lịch sử đặt giá (Bid history log).
   - Chặn người bán tự đấu giá sản phẩm của chính mình (Anti self-bidding).
4. **Tạo phiên đấu giá mới (`sell.html`)**:
   - Biểu mẫu đăng linh kiện đấu giá: Tên, loại linh kiện, thông số, ảnh demo, giá khởi điểm, bước giá, hạn kết thúc.
   - Form validation chuẩn HTML5/JS và lưu dữ liệu phiên vào `localStorage`.
   - Gắn đúng người bán (`sellerName`, `sellerId`) và đồng bộ vào danh sách đang bán.
5. **Đăng nhập (`login.html`)**:
   - Xác thực tài khoản mô phỏng, lưu trạng thái phiên đăng nhập vào `localStorage`.
   - Tích hợp 3 nút chọn nhanh tài khoản demo 1-chạm (`Đấu giá 1`, `Đấu giá 2`, `Người bán`).
6. **Đăng ký tài khoản (`register.html`)**:
   - Form đăng ký thành viên mới, khởi tạo số dư ví ảo mô phỏng ban đầu.
7. **Hồ sơ cá nhân & Đấu giá của tôi (`profile.html`)**:
   - Thông tin cá nhân người dùng, số dư ví ảo mô phỏng.
   - Tab quản lý phiên đấu giá đang tham gia: Tự động đối soát trạng thái đang dẫn đầu (Lead) hoặc bị vượt giá (Outbid), tính toán nút trả giá tiếp chính xác.
   - Tab quản lý các phiên do chính người dùng đăng bán (đồng bộ từ `sell.html`).
   - Tab danh sách theo dõi (Watchlist).
8. **Trang thông báo lỗi 404 (`404.html`)**:
   - Giao diện báo lỗi trang không tồn tại thân thiện, kèm nút điều hướng về Trang chủ.

---

## 4. Cấu trúc thư mục dự án

```text
pc-bid/
├── components/
│   ├── header/
│   │   ├── header.html        # Template HTML Header (Top bar, Search, Avatar Dropdown, Categories Nav)
│   │   ├── header.css         # Style BEM riêng cho Header & Dropdown menu
│   │   └── header.js          # Logic Header (Auth state, Avatar Dropdown, Search, Active link)
│   └── footer/
│       ├── footer.html        # Template HTML Footer 4 cột
│       └── footer.css         # Style BEM riêng cho Footer
├── css/
│   ├── reset.css              # Reset CSS mặc định trình duyệt
│   ├── style.css              # Biến màu sắc, typography, utilities toàn hệ thống
│   ├── home.css               # Style nội dung riêng cho Trang chủ
│   ├── products.css           # Style trang danh sách & bộ lọc
│   ├── product-detail.css     # Style chi tiết sản phẩm & phòng đấu giá
│   ├── sell.css               # Style trang đăng bán đấu giá
│   ├── auth.css               # Style trang đăng nhập / đăng ký
│   └── profile.css            # Style trang cá nhân & quản lý
├── js/
│   ├── data.js                # Mock dataset ban đầu (sản phẩm, tài khoản mẫu)
│   ├── storage.js             # Wrapper tiện ích đọc/ghi localStorage
│   ├── main.js                # Nạp component động (#app-header, #app-footer)
│   ├── index.js               # Logic trang chủ, sync giá & Quick Bid thời gian thực
│   ├── products.js            # Logic bộ lọc, tìm kiếm, phân trang, sync giá
│   ├── product-detail.js      # Logic đặt giá, validate bước giá, countdown, anti self-bidding
│   ├── sell.js                # Logic đăng bán sản phẩm mới, gắn seller session
│   ├── auth.js                # Logic xác thực, seed sẵn 3 tài khoản demo
│   └── profile.js             # Logic tab quản lý đấu giá, ví ảo, tự tính Lead/Outbid
├── images/
│   ├── logo/                  # Logo PCBid các kích thước
│   ├── icons/                 # Vector SVG icon trích xuất từ Figma
│   ├── products/              # Hình ảnh linh kiện máy tính
│   └── banners/               # Banner quảng bá, slider
├── data/
│   └── products.json          # Mock data JSON sản phẩm
├── index.html
├── products.html
├── product-detail.html
├── sell.html
├── login.html
├── register.html
├── profile.html
├── 404.html
├── README.md
├── AGENTS.md
└── .gitignore
```

---

## 5. Quy chuẩn lập trình (Coding Conventions)

* **CSS:**
  * Áp dụng phương pháp đặt tên theo chuẩn **BEM** (`block__element--modifier`).
  * Tránh xung đột CSS giữa các trang bằng cách gắn id riêng cho `<body>` hoặc thẻ bao chính (ví dụ: `#home-page`, `#product-page`).
* **JavaScript:**
  * Đặt tên biến và hàm theo chuẩn **camelCase** rõ nghĩa (`currentBid`, `calculateTimeRemaining()`, `handlePlaceBid()`).
  * Tổ chức code theo mô-đun rõ ràng, sử dụng ES Modules (`import`/`export`), lắng nghe sự kiện khi DOM đã sẵn sàng (`DOMContentLoaded`).
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

### 7.1. Khởi chạy dự án
1. Clone repository về máy:
   ```bash
   git clone https://github.com/PC-BID-Organization/pc-bid.git
   cd pc-bid
   ```
2. Mở thư mục dự án bằng **Visual Studio Code**.
3. Cài đặt tiện ích mở rộng **Live Server** trên VS Code.
4. Click chuột phải vào file `index.html` và chọn **Open with Live Server** (cần thiết để nạp component Header/Footer qua HTTP request cục bộ tránh lỗi CORS).
5. Dự án thuần Frontend, không cần cài đặt `npm` hay server backend.

### 7.2. Tài khoản mẫu để kiểm thử (Demo Accounts)
Hệ thống đã tạo sẵn 3 tài khoản trong code (có thể click nút đăng nhập nhanh ở trang `login.html`):

| Tài khoản | Tên hiển thị | Vai trò | Số dư ví | Mật khẩu |
| :--- | :--- | :--- | :--- | :--- |
| `bidder1@pcbid.vn` | **Nguyễn Văn A (Đấu Giá 1)** | Người mua | 50.000.000 đ | `123456` |
| `bidder2@pcbid.vn` | **Lê Thị C (Đấu Giá 2)** | Người mua | 60.000.000 đ | `123456` |
| `seller@pcbid.vn` | **Trần Văn B (Người Bán)** | Người bán | 80.000.000 đ | `123456` |
