# SINNO CUP — Hall of Fame

Website Hall of Fame của CLB SINNO, nơi lưu trữ và tôn vinh các mùa giải, đội bóng, cầu thủ và những khoảnh khắc đáng nhớ.

## Yêu cầu

- Docker và Docker Compose
- Bun (nếu chạy SvelteKit local)

## Cài đặt Bun

Nếu chưa cài Bun, chọn lệnh phù hợp với hệ điều hành.

**Windows (PowerShell):**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Linux / macOS:**

```bash
curl -fsSL https://bun.sh/install | bash
```

Kiểm tra cài đặt:

```bash
bun --version
```

Nếu terminal chưa nhận lệnh `bun`, hãy mở terminal mới hoặc kiểm tra biến môi trường `PATH`.

## Chạy bằng Docker Compose

**1. Tạo file môi trường**

```powershell
Copy-Item .env.example .env
```

Cập nhật các biến trong `.env`, đặc biệt là `SINNO_ADMIN_PASSWORD`, `SINNO_ADMIN_SESSION_SECRET`, `DB_PASSWORD` và `DB_ROOT_PASSWORD`.

**2. Khởi chạy ứng dụng**

```powershell
docker compose --env-file .env -f Database/docker-compose.yml up --build -d
```

**3. Truy cập website**

- Trang chủ: http://localhost:3000
- Đăng nhập quản trị: http://localhost:3000/login
- Quản trị mùa giải: http://localhost:3000/admin

Đăng nhập bằng mật khẩu đã cấu hình trong `SINNO_ADMIN_PASSWORD`.

**4. Dừng ứng dụng**

```powershell
docker compose --env-file .env -f Database/docker-compose.yml down
```

Dữ liệu MySQL được lưu trong volume `sinno-mysql-data`. Không dùng `down -v` nếu muốn giữ dữ liệu.

## Chạy SvelteKit local

Khởi động MySQL:

```powershell
docker compose --env-file .env -f Database/docker-compose.yml up -d sinno-db
```

Trong `.env`, đặt cấu hình kết nối local:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3307
```

Cài đặt dependency và chạy ứng dụng:

```bash
bun install
bun run dev
```

## Kiểm tra và build

```bash
bun run check
bun run build
```
