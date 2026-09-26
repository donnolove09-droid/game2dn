# 🏝️ Đảo Trojan — Pixel Battle Arena

Game chiến đấu pixel-art giao diện **ngang**, có **đăng ký / đăng nhập** lưu trong **SQLite** (SQL), triển khai được lên **Render**.

## Tính năng
- Đăng ký / đăng nhập tài khoản (mật khẩu mã hoá bcrypt, phiên đăng nhập bằng JWT), dữ liệu lưu bảng `users` trong SQLite.
- **Bản đồ top-down** (nền Battleground Ruins) rộng 1920×1080, camera đi theo nhân vật — cây, tàn tích, nấm, đá, quái vật rải khắp bản đồ lấy từ **toàn bộ 10 gói asset** bạn đã tải lên (xem mục "Asset" bên dưới).
- **Điều khiển kiểu Liên Quân Mobile**: cần điều khiển ảo (joystick) bên trái để di chuyển nhân vật; cụm nút kỹ năng hình quạt bên phải gồm 1 nút **Đánh thường** to + 3 nút chiêu thức (Hỏa/Thủy/Lôi Kiếm).
- Cơ chế chiến đấu kiểu **"Khí Phách Anh Hùng"**: nhân vật di chuyển tự do, tới gần quái để cận chiến hoặc dùng chiêu thức có tầm xa hơn; quái tự động đuổi theo và phản công khi ở gần.
- Quái **slime** dùng cả 3 loại gốc (Slime1/2/3) + remix màu, khi trúng đòn sẽ **bắn ra hạt máu xanh** (particle) và hiện số sát thương bay lên; quái chết sẽ tan biến rồi hồi sinh quái mới (đấu trường vô hạn, tính điểm hạ gục).
- Hiệu ứng chiêu thức Magic Slash (Hỏa/Thủy/Lôi) phát tại vị trí quái trúng đòn; đòn thường cũng có hiệu ứng riêng.
- Bảng thắng/thua dùng đúng ảnh panel "WIN! / TRY AGAIN" từ gói UI craftpix.
- Lưu thắng/thua/cấp độ vào SQL, có bảng xếp hạng (`/api/leaderboard`).

## Asset từ 10 gói craftpix đã dùng ở đâu
| Gói | Dùng cho |
|---|---|
| Top-down Ruins | Tàn tích rải trên bản đồ |
| Forest Objects | Cây phát sáng, liễu, cây thần (Ent), nấm, cây thổ dân (idol) trang trí bản đồ |
| Slime Mobs | 3 loại quái (Slime1/2/3) — địch chính |
| Rocks & Stones | Đá trang trí bản đồ |
| 4 Nature Backgrounds (RPG battle) | Ảnh nền đăng nhập / đăng ký |
| Basic UI for RPG | Panel "WIN! / TRY AGAIN" cho màn thắng-thua |
| Magic Slash Effects | Hiệu ứng Hỏa/Thủy/Lôi Kiếm khi đánh trúng |
| Shinobi Sprites | Nhân vật chính (đi/tấn công/trúng đòn/gục ngã) |
| Fantasy 2D Battlegrounds | Nền bản đồ chính (khung cảnh phế tích) |
| Top-down Trees | Cây rải trên bản đồ |

## Cấu trúc thư mục
```
project/
  server.js          # Express server + API + SQLite (better-sqlite3)
  package.json
  public/             # Toàn bộ frontend (HTML/CSS/JS + ảnh asset)
    index.html
    style.css
    game.js
    assets/           # Sprite/nền lấy & remix từ các gói craftpix đã upload
  db/                 # Nơi file game.db (SQLite) được tạo khi chạy
```

## Chạy thử ở máy local
```bash
npm install
npm start
# mở http://localhost:3000
```

## Deploy lên Render (miễn phí)
1. Đưa toàn bộ thư mục `project/` này lên một repo GitHub (tạo repo mới, `git init`, `git add .`, `git commit`, `git push`).
2. Vào [render.com](https://render.com) → **New +** → **Web Service** → chọn repo vừa tạo.
3. Cấu hình:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free là chạy được
4. Thêm biến môi trường (Environment Variables):
   - `JWT_SECRET` = một chuỗi bí mật bất kỳ (bắt buộc để token đăng nhập an toàn)
5. **Quan trọng — lưu SQL không bị mất dữ liệu khi redeploy:**
   Ổ đĩa mặc định trên Render là *ephemeral* (bị xoá khi service khởi động lại nếu không gắn Disk). Để dữ liệu tài khoản không mất:
   - Vào tab **Disks** của service → **Add Disk**, ví dụ mount path `/var/data`.
   - Thêm biến môi trường `DB_PATH=/var/data` (server đã đọc biến này để đặt file `game.db` vào đó).
   - Nếu không muốn dùng Disk trả phí, có thể thay bằng **Render PostgreSQL** (free tier) — cần đổi tầng dữ liệu từ `better-sqlite3` sang driver Postgres (`pg`), có thể nhờ Claude chỉnh tiếp phần này.
6. Đặt tên service (ví dụ `dao-trojan`) → Render sẽ cấp domain dạng `https://dao-trojan.onrender.com`.

## Ghi chú bản quyền asset
Toàn bộ hình ảnh lấy từ các gói **Craftpix Free** bạn đã tải lên (ruins, forest objects, slime mobs, rocks, nature backgrounds, RPG UI, magic slash, shinobi, battlegrounds, trees). Quái slime đã được remix màu sắc (CSS filter) để tạo biến thể mới thay vì dùng nguyên bản. Vui lòng kiểm tra lại giấy phép sử dụng (License.txt trong từng gói) trước khi dùng cho mục đích thương mại.

## Có thể mở rộng thêm
- Thêm nhiều loại quái / chiêu thức khác từ các gói còn dư (Fighter, Samurai, Poisonous Slash, Ultimate Slash…).
- Thêm hệ thống túi đồ, trang bị dùng UI pack (`Inventory.png`, `Equipment.png`, `Shop.png`).
- Đổi sang PostgreSQL nếu cần scale nhiều người chơi cùng lúc.
