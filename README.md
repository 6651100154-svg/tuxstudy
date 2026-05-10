# Tuxstudy — Hướng dẫn cài đặt

## Tài khoản demo
| Vai trò    | Email             | Mật khẩu    |
|------------|-------------------|-------------|
| 👑 Admin   | admin@edu.vn      | admin123    |
| 📚 Học viên | hocvien@edu.vn    | hocvien123  |

## Cài đặt

### Bước 1: Cài Node.js
https://nodejs.org → chọn bản LTS → cài đặt

Kiểm tra:
```
node -v
npm -v
```

### Bước 2: Giải nén & vào thư mục
```
cd D:\edu-v2
```

### Bước 3: Cài packages
```
npm install
```

### Bước 4: Chạy local
```
npm run dev
```

Mở: http://localhost:3000

---

## Các trang
| Trang                    | URL                          |
|--------------------------|------------------------------|
| Login / Register         | localhost:3000               |
| Trang học (học viên)     | localhost:3000/learn         |
| Thông tin tài khoản      | localhost:3000/account       |
| Admin - Thống kê         | localhost:3000/admin         |
| Admin - Môn & GV         | localhost:3000/admin/courses |
| Admin - Học viên         | localhost:3000/admin/students|
| Admin - Thông báo        | localhost:3000/admin/notifications |

## Tính năng v2
- ✅ Login / Register với validation
- ✅ Dark / Light mode toggle (lưu preference)
- ✅ Thông báo popup chỉ sau khi login
- ✅ Trang tài khoản: sửa tên, đổi mật khẩu, xem tiến độ
- ✅ Quản lý chương: thêm, sửa, xóa
- ✅ Quản lý bài học: thêm phần học, PDF, video dự phòng
- ✅ Admin: filter học viên, khóa/mở tài khoản
- ✅ Sidebar collapse animation
- ✅ Empty states đẹp
- ✅ Tất cả data lưu localStorage (swap sang Google Sheets sau)
