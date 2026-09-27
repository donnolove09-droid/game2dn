# 🏝️ Đảo Trojan — Pixel Arena (theo phong cách Khí Phách Anh Hùng)

Game arena pixel-art top-down, đăng ký/đăng nhập lưu **PostgreSQL**, triển khai trên **Render**.

## 🔧 Đã fix lỗi build trên Render
Bản trước dùng `better-sqlite3` — thư viện cần **biên dịch native (node-gyp)**, và bị lỗi
`gyp ERR! ... Build failed` trên môi trường build của Render (đúng lỗi trong ảnh log bạn gửi).

**Cách fix:** đổi toàn bộ tầng dữ liệu sang **PostgreSQL** qua driver [`pg`](https://node-postgres.com/)
— đây là thư viện **thuần JavaScript, không cần biên dịch gì cả**, nên sẽ không còn gặp lỗi `gyp` nữa.
Đổi lại là bạn cần tạo thêm 1 Postgres database (Render có free tier), xem hướng dẫn deploy bên dưới.

## Tính năng chính
- Đăng ký/đăng nhập (mật khẩu bcrypt, JWT), dữ liệu lưu bảng `users` trong PostgreSQL.
- Bản đồ top-down 1920×1080, camera đi theo nhân vật; joystick ảo bên trái để di chuyển (kiểu Liên Quân Mobile).
- **Nút skill trở lại dạng chữ nhật có icon + chữ + đếm ngược hồi chiêu**, đặt gọn góc phải (không che joystick) — đúng như bản đầu tiên bạn thích.
- Cơ chế đánh quái kiểu "Khí Phách Anh Hùng": tự do di chuyển, áp sát để cận chiến hoặc dùng skill tầm xa; quái tự đuổi + phản công khi ở gần.
- Quái trúng đòn bắn hạt máu xanh (particle), số sát thương bay lên; quái chết tan biến rồi hồi sinh (đấu trường vô hạn, đếm hạ gục).

## 🌳 Hệ thống theo form Khí Phách Anh Hùng bạn gửi
| Mục trong mô tả KPAH | Đã lên trong bản này |
|---|---|
| Tạo nhân vật, chọn nam/nữ | ✅ Chọn giới tính khi đăng ký, lưu vào SQL |
| Hệ Ngũ Hành (Kim/Mộc/Thủy/Hỏa/Thổ) | ✅ Chọn hệ khi đăng ký; **vòng tương khắc** Kim khắc Mộc → Mộc khắc Thổ → Thổ khắc Thủy → Thủy khắc Hỏa → Hỏa khắc Kim. Đánh trúng hệ mình khắc: **+50% sát thương** ("Khắc chế!"); bị hệ khắc mình đánh trúng: **-30% sát thương gây ra** / quái khắc bạn đánh bạn đau hơn. Mỗi quái được gán ngẫu nhiên 1 hệ. |
| HP / MP | ✅ Có thanh HP và MP riêng; 3 skill tiêu tốn MP (Hỏa 20, Thủy 15, Lôi 25); hết MP sẽ báo "Không đủ MP!" |
| Auto bơm HP/MP | ✅ HP/MP tự hồi dần theo thời gian (không cần bấm nút) |
| Tấn công / kỹ năng theo hệ, trang bị | ✅ Tấn công thường + 3 skill; trang bị **chưa** làm (xem mục "Có thể mở rộng") |
| EXP → lên cấp → nâng kỹ năng | ✅ Hạ quái tính là "thắng", cứ 3 lần thắng lên 1 cấp (`level`), quái mạnh dần theo cấp |
| Party / bang hội / PvP / giao dịch | ⏳ Chưa làm — cần thêm real-time (WebSocket) và phòng chơi chung, xem "Có thể mở rộng" |

## Cấu trúc thư mục
```
project/
  server.js          # Express server + API + PostgreSQL (driver "pg")
  package.json
  public/            # Toàn bộ frontend (HTML/CSS/JS + ảnh asset)
    index.html
    style.css
    game.js
    assets/          # Sprite/nền lấy & remix từ các gói craftpix đã upload
```

## Chạy thử ở máy local
Cần có PostgreSQL chạy sẵn (hoặc dùng Docker: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`).
```bash
npm install
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
npm start
# mở http://localhost:3000
```

## Deploy lên Render (miễn phí) — đã fix lỗi build
1. Đưa toàn bộ thư mục `project/` lên 1 repo GitHub.
2. Vào [render.com](https://render.com) → **New +** → **PostgreSQL** → tạo 1 database free, đặt tên tuỳ ý (ví dụ `dao-trojan-db`). Sau khi tạo xong, mở database đó và copy giá trị **Internal Database URL**.
3. Vào **New +** → **Web Service** → chọn repo game.
4. Cấu hình:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Thêm biến môi trường (Environment Variables):
   - `DATABASE_URL` = giá trị **Internal Database URL** vừa copy ở bước 2
   - `JWT_SECRET` = một chuỗi bí mật bất kỳ
6. Deploy lại — vì `pg` không cần biên dịch native nên bước build sẽ không còn lỗi `gyp ERR!` như log cũ nữa.
7. PostgreSQL của Render là bền vững (không mất dữ liệu khi service redeploy/restart), khác với ổ đĩa ephemeral trước đây.

## Ghi chú bản quyền asset
Toàn bộ hình ảnh lấy từ các gói **Craftpix Free** bạn đã tải lên (ruins, forest objects, slime mobs, rocks, nature backgrounds, RPG UI, magic slash, shinobi, battlegrounds, trees). Quái slime được remix màu sắc (CSS/canvas filter) để tạo biến thể mới thay vì dùng nguyên bản. Vui lòng kiểm tra giấy phép (License.txt trong từng gói) trước khi dùng thương mại.

## Có thể mở rộng thêm (để tiến gần hơn tới KPAH đầy đủ)
- **Trang bị**: dùng `Equipment.png`/`Inventory.png` trong gói UI, thêm bảng `items`/`user_items` trong SQL.
- **Party & bang hội**: cần thêm WebSocket (Socket.IO) để nhiều người chơi thấy nhau trong cùng bản đồ, chia EXP theo nhóm.
- **PvP**: đấu trực tiếp giữa 2 người chơi thật thay vì chỉ đánh quái AI.
- **Giao dịch/chợ**: thêm bảng `trades` và giao diện chợ dùng `Shop.png`.
- Thêm nhiều loại quái / chiêu thức khác từ các gói còn dư (Fighter, Samurai, Poisonous Slash, Ultimate Slash…).
