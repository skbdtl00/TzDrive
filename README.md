# TzDrive (minimal backend)

This is a small Express API that provides:

- Authentication with JWT (users created by admin only)
- File upload/download/delete
- Per-user storage quota enforcement
- Storage backend choice: **local** disk or **S3-compatible** (mutually exclusive)

## Configuration

Copy `.env.example` to `.env` and set values. Key settings:

- `STORAGE_BACKEND`: `local` or `s3` (only one can be active)
- `DEFAULT_USER_LIMIT_BYTES`: quota applied when creating users (can be overridden per user)
- When using S3, set `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and optional `S3_ENDPOINT`.

## Run

```bash
npm install
npm start
```

The server listens on `PORT` (default `3000`).

## Frontend (Next.js)

Located in `web/` (ภาษาไทย, ฟอนต์ Anuphan, Shadcn/ui, Lucide icons).

```bash
cd web
npm install
cp .env.example .env    # ตั้งค่า NEXT_PUBLIC_API_URL ให้ตรงกับ backend
npm run dev             # หรือ npm run build && npm start
```

หน้าเว็บมีฟอร์มเข้าสู่ระบบ (JWT), แสดงโควต้า/การใช้งานต่อผู้ใช้, อัพโหลด/ดาวน์โหลด/เปลี่ยนชื่อ/ลบไฟล์ และแสดง backend storage backend จาก `/health`.

## API (brief)

- `POST /admin/users` (header `x-admin-secret`) – create user `{ email, password, limitBytes? }`
- `POST /auth/login` – `{ email, password }` → JWT
- `GET /me` – current user info and quota
- `POST /files/upload` – multipart `file` field; enforces per-user limit
- `GET /files` – list user's files
- `GET /files/:id` – download user's file
- `PATCH /files/:id` – rename file `{ filename }`
- `DELETE /files/:id` – delete file

Health: `GET /health` shows selected storage backend.
