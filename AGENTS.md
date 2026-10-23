# AGENTS.md - Developer & AI Agent Guidelines for PCBid

Tài liệu này đóng vai trò là **kim chỉ nam (System Directive / Rule of Engagement)** dành cho mọi AI Agent hoặc lập trình viên khi tham gia đóng góp mã nguồn cho dự án **PCBid**.

---

## 1. Bản chất & Mục tiêu đồ án

- **Tên đồ án:** PCBid - Website Đấu giá linh kiện PC cũ (Used PC Hardware Auction Platform).
- **Môn học:** IE104 - Internet và Công nghệ Web (ĐH Công nghệ Thông tin - UIT).
- **Bản chất:** Đồ án bài tập lớn **Frontend thuần**, hướng đến việc chứng minh năng lực hiểu sâu về kiến trúc Web căn bản (Core Web Technologies), tư duy thiết kế giao diện, tổ chức mã nguồn và xử lý tương tác client-side.
- **Không phải:** Một dự án thương mại điện tử production thực tế cần backend/database chịu tải.

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
6. **Kiến trúc Component Web thuần:**
   - Tổ chức Header và Footer theo thư mục component độc lập (`components/header/`, `components/footer/`) gồm template HTML, CSS và JS riêng.
   - Nạp template component động qua `fetch()` từ `js/main.js`.
7. **Tối ưu chuẩn Web:**
   - Đảm bảo thẻ ngữ nghĩa (Semantic HTML5).
   - Đảm bảo điểm số cao trên **Google Lighthouse** (SEO, Accessibility, Performance).
   - Đảm bảo chuẩn cú pháp **W3C Nu Html Checker**.
8. **Quy tắc ngôn ngữ trong Chú thích (Code Comments):**
   - **Bắt buộc viết toàn bộ chú thích (comments) trong HTML, CSS, JavaScript bằng TIẾNG VIỆT có dấu.**
   - **Chỉ được dùng tiếng Anh với các thuật ngữ kỹ thuật chuyên ngành quá phổ biến và rõ ràng**, ví dụ: `DOM`, `localStorage`, `sessionStorage`, `render`, `event listener`, `fetch`, `API`, `callback`, `header`, `footer`, `responsive`, `breakpoint`, `flexbox`, `grid`, `padding`, `margin`, `badge`, `payload`, `mock data`, `validate`.
   - **Ví dụ đúng:**
     - `// Khởi tạo trạng thái thanh tìm kiếm và bộ lắng nghe sự kiện (event listener)`
     - `/* Khu vực hiển thị danh sách linh kiện trên thiết bị di động (responsive mobile) */`
     - `<!-- Phần khung Header chính nạp động qua DOM -->`
   - **Ví dụ sai:**
     - `// Initialize search handler and event listener` (Sai vì viết toàn bộ bằng tiếng Anh)
     - `// Khoi tao thanh tim kiem` (Sai vì không gõ tiếng Việt có dấu)

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
  username: "pcbuilder99",
  fullname: "Nguyễn Văn A",
  email: "user@example.com",
  role: "bidder"
}));

// Lịch sử trả giá của phiên đấu giá
localStorage.setItem('pcbid_bids', JSON.stringify([
  {
    id: "bid_101",
    productId: 1,
    bidderName: "pcbuilder99",
    amount: 5200000,
    timestamp: "2026-09-27T10:30:00"
  }
]));
```

---

## 4. Phạm vi 8 màn hình triển khai chính thức

Dự án chốt chính xác **8 màn hình** chuẩn phạm vi:

1. `index.html`: **Trang chủ** (Hero Banner, Danh mục linh kiện, Top phiên đấu giá Hot, Sắp kết thúc, Feedback cộng đồng).
2. `products.html`: **Danh sách đấu giá & Bộ lọc** (Lọc theo danh mục CPU/GPU/RAM/Mainboard/PSU/SSD, khoảng giá, tình trạng New/Like New/Used, sắp xếp thời gian & lượt bid, tìm kiếm real-time).
3. `product-detail.html`: **Chi tiết phiên đấu giá** (Gallery ảnh, thông số kỹ thuật, người bán, bảng so sánh giá thị trường, Live Countdown đếm ngược, Bidding Box kiểm tra bước giá, Lịch sử đặt giá).
4. `sell.html`: **Đăng phiên đấu giá linh kiện** (Form nhập thông tin linh kiện, upload ảnh mô phỏng, chọn bước giá & thời hạn, validate HTML5/JS -> lưu vào LocalStorage).
5. `login.html`: **Đăng nhập** (Form xác thực tài khoản mô phỏng, ghi nhớ đăng nhập, lưu phiên vào LocalStorage).
6. `register.html`: **Đăng ký tài khoản** (Form đăng ký thành viên mới, validate mật khẩu/email, khởi tạo ví ảo mặc định).
7. `profile.html`: **Hồ sơ cá nhân & Đấu giá của tôi** (Thông tin tài khoản, số dư ví ảo mô phỏng, tab danh sách đấu giá đang tham gia, tab phiên tự đăng bán, tab danh sách theo dõi watchlist).
8. `404.html`: **Trang thông báo lỗi 404** (Giao diện thân thiện chuẩn UI hệ sinh thái PCBid kèm nút quay về Trang chủ).

---

## 5. Hướng dẫn cài đặt Figma MCP vào Antigravity (Dành cho thành viên)

Để hỗ trợ AI Agent đọc trực tiếp bản thiết kế Figma (trích xuất màu sắc, kích thước pixel-perfect, tải vector SVG và hình ảnh tự động), thành viên nhóm hãy gửi câu lệnh sau cho Agent của mình:

```text
[AGENT PROTOCOL: SETUP FIGMA MCP
Bạn (Agent) hãy thực hiện lần lượt các bước sau để cài đặt Figma MCP cho tôi.
BƯỚC 1: KIỂM TRA & YÊU CẦU TOKEN
1. Kiểm tra xem tôi đã cung cấp Figma Personal Access Token (PAT) chưa.
2. Nếu chưa, hãy yêu cầu tôi cung cấp. Hướng dẫn tôi:
- Vào https://www.figma.com/settings > Personal access tokens.
- Tạo token mới với quyền File content.
- Copy token (bắt đầu bằng figd_...).
BƯỚC 2: CẤU HÌNH MCP
1. Tìm file mcp_config.json trong thư mục cấu hình của Antigravity (thường ở .gemini/antigravity hoặc .gemini/config).
2. Sửa (hoặc thêm) cấu hình cho server figma chính xác như sau:
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": [
        "-y",
        "figma-developer-mcp",
        "--stdio"
      ],
      "env": {
        "FIGMA_API_KEY": "<DÁN_TOKEN_CỦA_TÔI_VÀO_ĐÂY>"
      }
    }
  }
}
Quan trọng:
- Phải dùng figma-developer-mcp.
- Bắt buộc có flag --stdio.
- Thay thế <DÁN_TOKEN_CỦA_TÔI_VÀO_ĐÂY> bằng token tôi vừa đưa.
BƯỚC 3: HOÀN TẤT
1. Lưu file.
2. Thông báo cho tôi biết cần Khởi động lại Antigravity để áp dụng thay đổi.
3. Sau khi khởi động lại, hãy đề nghị tôi gửi một link Figma để test thử.
HÃY BẮT ĐẦU THỰC HIỆN BƯỚC 1 NGAY BÂY GIỜ.]
```

---

## 6. Quy tắc cộng tác Git, Phân nhánh & Lời khuyên bắt buộc từ AI Agent

> **Chỉ thị cho AI Agent:** Bất cứ khi nào thành viên nhóm chuẩn bị code tính năng mới, sửa lỗi hoặc hỏi về quy trình làm việc, **AI Agent BẮT BUỘC phải chủ động nhắc nhở và hướng dẫn thành viên tuân thủ quy trình Git Flow / Branching**:
>
> 1. **KHÔNG BAO GIỜ code hoặc push trực tiếp lên nhánh `main`**.
> 2. **Tạo nhánh mới (feature branch)** từ `main` theo quy ước: `feat/<tên-tính-năng>`, `fix/<lỗi-cần-sửa>`, `docs/<tài-liệu>`.
>    - Ví dụ: `git checkout -b feat/home-hero`, `git checkout -b feat/auction-bidding`
> 3. **Phát triển và commit cục bộ** trên branch riêng, viết commit message theo chuẩn Conventional Commits.
> 4. **Đẩy branch lên GitHub và tạo Pull Request (PR)**:
>    - Viết mô tả PR rõ ràng (những gì đã làm, ảnh chụp demo nếu có).
>    - Gắn reviewer (thành viên khác trong nhóm/nhóm trưởng).
> 5. **Review và Merge:** Chỉ merge vào `main` sau khi reviewer đã kiểm tra, chạy thử và approve. Tuyệt đối không tự ý merge khi chưa có review.

### Quy ước đặt tên branch & Commit

- **Tên branch:**
  - Tính năng: `feat/ten-chuc-nang` (ví dụ: `feat/product-filter`, `feat/bidding-box`)
  - Sửa lỗi: `fix/ten-loi` (ví dụ: `fix/bid-validation`, `fix/timer-countdown`)
  - Giao diện/Tài liệu: `style/responsive-navbar`, `docs/update-readme`
- **Commit message (Conventional Commits):**
  - `feat: implement live countdown timer in detail page`
  - `fix: prevent bid placement lower than current price`
  - `style: apply BEM naming for product card component`
  - `docs: update AGENTS.md guidelines`
- **Lưu ý tệp tin:** Tuyệt đối không commit file nhị phân lớn, tài liệu đồ án: `*.pdf`, `*.docx`, `*.pptx` (đã được cấu hình trong `.gitignore`).
