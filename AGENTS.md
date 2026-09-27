# AGENTS.md - Developer & AI Agent Guidelines for PCBid

Tài liệu này đóng vai trò là **kim chỉ nam (System Directive / Rule of Engagement)** dành cho mọi AI Agent hoặc lập trình viên khi tham gia đóng góp mã nguồn cho dự án **PCBid**.

---

## 1. Bản chất & Mục tiêu đồ án

* **Tên đồ án:** PCBid - Website Đấu giá linh kiện PC cũ & Vintage (Used / Vintage PC Hardware Auction Platform).
* **Môn học:** IE104 - Internet và Công nghệ Web (ĐH Công nghệ Thông tin - UIT).
* **Bản chất:** Đồ án bài tập lớn **Frontend thuần**, hướng đến việc chứng minh năng lực hiểu sâu về kiến trúc Web căn bản (Core Web Technologies), tư duy thiết kế giao diện, tổ chức mã nguồn và xử lý tương tác client-side.
* **Không phải:** Một dự án thương mại điện tử production thực tế cần backend/database chịu tải.

---

## 2. Ràng buộc kỹ thuật BẮT BUỘC (Hard Constraints)

Mọi đề xuất giải pháp, sinh mã hoặc tối ưu hóa **BẮT BUỘC** tuân thủ các quy tắc sau:

### ✅ ĐƯỢC PHÉP VÀ KHUYẾN KHÍCH
1. **Ngôn ngữ thuần 100%:** Chỉ sử dụng **HTML5**, **CSS3**, **Vanilla JavaScript (ES6+)**.
2. **Layout & Responsive:** Tự viết CSS dùng **Flexbox**, **CSS Grid**, **Media Queries**, CSS Custom Properties (`var(--...)`).
3. **Quy ước đặt tên CSS:** Bắt buộc tuân thủ phương pháp **BEM** (`block__element--modifier`).
4. **Quy ước đặt tên JavaScript:** Tuân thủ **camelCase** cho hàm và biến; **PascalCase** cho Class/Constructor.
5. **Mô phỏng dữ liệu & Trạng thái:**
   - Dùng file `products.json` hoặc mock object trong `data.js`.
   - Dùng `localStorage` / `sessionStorage` để lưu trạng thái đăng nhập, lịch sử trả giá (bid log), sản phẩm vừa đăng bán.
   - Thao tác DOM trực tiếp, lắng nghe sự kiện qua `addEventListener`.
6. **Tối ưu chuẩn Web:**
   - Đảm bảo thẻ ngữ nghĩa (Semantic HTML5).
   - Đảm bảo điểm số cao trên **Google Lighthouse** (SEO, Accessibility, Performance).
   - Đảm bảo chuẩn cú pháp **W3C Nu Html Checker**.

### ❌ TUYỆT ĐỐI CẤM (ZERO TOLERANCE)
1. **KHÔNG** thêm bất kỳ CSS Framework / Preprocessor nào: Bootstrap, Tailwind CSS, Bulma, Foundation, Sass, Less (trừ khi có công cụ compile tĩnh độc lập nhưng ưu tiên CSS chuẩn).
2. **KHÔNG** thêm thư viện / Frontend Framework: React, Vue, Angular, Svelte, jQuery, Alpine.js, v.v.
3. **KHÔNG** đề xuất hoặc tích hợp Backend / Server: Node.js, Express, NestJS, Spring Boot, Django, Flask, PHP, Go, v.v.
4. **KHÔNG** đề xuất Cơ sở dữ liệu: MySQL, PostgreSQL, MongoDB, SQLite, Firebase Firestore, Supabase backend.
5. **KHÔNG** tự ý cài đặt các gói `npm` hay biến dự án thành Node project với `package.json`, trừ khi đó là công cụ static dev server đơn giản.
6. **KHÔNG** tích hợp cổng thanh toán thật: Stripe, PayPal, VNPay, Momo (nếu có thanh toán thì chỉ dựng modal/flow mô phỏng UI).
7. **KHÔNG over-engineer:** Tuyệt đối không thêm Docker, Kubernetes, CI/CD phức tạp, Webpack/Vite bundler khi chưa được yêu cầu rõ ràng.

> **Ghi chú quan trọng:** Nếu gặp một chức năng phức tạp thường đòi hỏi server (như đặt giá theo thời gian thực giữa nhiều máy, xác thực mật khẩu an toàn, session nhiều thiết bị), **HÃY TÌM CÁCH MÔ PHỎNG NÓ TRÊN BROWSER (CLIENT-SIDE / LOCALSTORAGE)** thay vì tự ý bổ sung backend!

---

## 3. Kiến trúc dữ liệu mô phỏng (LocalStorage Architecture)

Mọi AI khi viết tính năng cần tuân thủ cấu trúc lưu trữ `localStorage` thống nhất:

```javascript
// Danh sách sản phẩm (khởi tạo từ data.js nếu localStorage chưa có)
localStorage.setItem('pcbid_products', JSON.stringify([...]));

// Người dùng hiện tại đang đăng nhập
localStorage.setItem('pcbid_currentUser', JSON.stringify({
  id: "user_01",
  username: "vintagemaster",
  fullname: "Nguyễn Văn A",
  email: "user@example.com",
  role: "bidder"
}));

// Lịch sử trả giá của phiên đấu giá
localStorage.setItem('pcbid_bids', JSON.stringify([
  {
    id: "bid_101",
    productId: 1,
    bidderName: "vintagemaster",
    amount: 5200000,
    timestamp: "2026-09-27T10:30:00"
  }
]));
```

---

## 4. Phạm vi màn hình triển khai (7 - 9 màn hình)

Khi tạo mới trang hoặc viết tính năng, bám sát các trang sau:
1. `index.html`: Trang chủ (Hero, Featured Auctions, Ending Soon, Categories).
2. `products.html`: Danh sách đấu giá + Bộ lọc (Category, Condition, Price range, Status) + Tìm kiếm live.
3. `product-detail.html`: Chi tiết linh kiện + Live Countdown + Bidding Box + Lịch sử Bid + So sánh giá thị trường.
4. `sell.html`: Đăng phiên đấu giá linh kiện mới (Form validation -> Lưu LocalStorage).
5. `login.html` & `register.html` (hoặc modal auth): Đăng ký / Đăng nhập mô phỏng.
6. `profile.html`: Trang thông tin cá nhân.
7. `my-auctions.html`: Quản lý các phiên đang tham gia và các phiên tự đăng.
8. `404.html`: Trang xử lý lỗi 404 thân thiện.

---

## 5. Quy tắc cộng tác Git, Phân nhánh & Lời khuyên bắt buộc từ AI Agent

> **Chỉ thị cho AI Agent:** Bất cứ khi nào thành viên nhóm chuẩn bị code tính năng mới, sửa lỗi hoặc hỏi về quy trình làm việc, **AI Agent BẮT BUỘC phải chủ động nhắc nhở và hướng dẫn thành viên tuân thủ quy trình Git Flow / Branching**:
> 1. **KHÔNG BAO GIỜ code hoặc push trực tiếp lên nhánh `main`**.
> 2. **Tạo nhánh mới (feature branch)** từ `main` theo quy ước: `feat/<tên-tính-năng>`, `fix/<lỗi-cần-sửa>`, `docs/<tài-liệu>`.
>    * Ví dụ: `git checkout -b feat/home-hero`, `git checkout -b feat/auction-bidding`
> 3. **Phát triển và commit cục bộ** trên branch riêng, viết commit message theo chuẩn Conventional Commits.
> 4. **Đẩy branch lên GitHub và tạo Pull Request (PR)**:
>    * Viết mô tả PR rõ ràng (những gì đã làm, ảnh chụp demo nếu có).
>    * Gắn reviewer (thành viên khác trong nhóm/nhóm trưởng).
> 5. **Review và Merge:** Chỉ merge vào `main` sau khi reviewer đã kiểm tra, chạy thử và approve. Tuyệt đối không tự ý merge khi chưa có review.

### Quy ước đặt tên branch & Commit
* **Tên branch:**
  * Tính năng: `feat/ten-chuc-nang` (ví dụ: `feat/product-filter`, `feat/bidding-box`)
  * Sửa lỗi: `fix/ten-loi` (ví dụ: `fix/bid-validation`, `fix/timer-countdown`)
  * Giao diện/Tài liệu: `style/responsive-navbar`, `docs/update-readme`
* **Commit message (Conventional Commits):**
  * `feat: implement live countdown timer in detail page`
  * `fix: prevent bid placement lower than current price`
  * `style: apply BEM naming for product card component`
  * `docs: update AGENTS.md guidelines`
* **Lưu ý tệp tin:** Tuyệt đối không commit file nhị phân lớn, tài liệu đồ án: `*.pdf`, `*.docx`, `*.pptx` (đã được cấu hình trong `.gitignore`).
