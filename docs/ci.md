# Task 4.4 — Continuous Integration

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). File `ci.yml.example` đã được thay bằng workflow hoạt động.

CI chạy khi mở/cập nhật PR vào `main`, khi push lên `main`, hoặc chạy thủ công. Hai job `CI (api)` và `CI (web)` dùng Node.js 24, `npm ci`, lint, unit test và build. Job web chạy thêm test cho các script kiểm soát CD. API chạy `prisma:generate` trước lint/test/build; database URL trong workflow chỉ là giá trị mẫu để generate, không kết nối database hay dùng secret local.

[CD](deployment.md) được cấu hình nhận kết quả CI thành công trên `main`, triển khai API trên Render và frontend trên Vercel. Việc chạy cloud cần điền cấu hình project/token; chưa có lượt CD thành công được ghi nhận.

## Điều kiện merge vào main

Đã cấu hình branch protection trên GitHub:

- Bắt buộc PR và hai check `CI (api)`, `CI (web)` của GitHub Actions thành công.
- Nhánh PR phải cập nhật với `main` trước khi merge.
- Áp dụng cả quản trị viên; không cho force push hoặc xóa `main`.
- Không bắt buộc người duyệt thứ hai.

Xem [cấu hình bảo vệ nhánh](https://github.com/letan01012006/BrewliteA2/settings/branches). Cấu hình này nằm trên GitHub, không được tự bật chỉ bằng file workflow.

## Bằng chứng

PR triển khai: [#10](https://github.com/letan01012006/BrewliteA2/pull/10).

| Lượt chạy | Commit | Nội dung |
| --- | --- | --- |
| [Run #1](https://github.com/letan01012006/BrewliteA2/actions/runs/43614827866) | `2cf6f1f` | API fail tại lint với 24 cảnh báo ép dữ liệu VNPAY thành chuỗi; web pass. PR bị chặn merge. |
| [Run #2 — pass](https://github.com/letan01012006/BrewliteA2/actions/runs/43615113298) | `6caad2f` | API và web đều pass lint, unit test và build. Bản sửa xử lý rõ kiểu giá trị VNPAY, giữ `--deny-warnings` và thêm test cho phản hồi sai kiểu. |

Log các job được xem trực tiếp tại hai lượt chạy GitHub Actions ở trên.

Kiểm tra local của bản sửa: lint/build cả hai app đạt; API 87 unit test, frontend 164 test và 57 E2E thanh toán VNPAY đạt. CI hiện chạy lint/unit test/build; E2E dùng database test riêng và được chạy local trong lần kiểm tra này.

Workflow được pin theo SHA của `actions/checkout` và `actions/setup-node`, chỉ cấp quyền `contents: read`; các lượt CI cũ của cùng PR được hủy khi có cập nhật mới.
