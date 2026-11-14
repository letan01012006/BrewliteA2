# Test API BrewLite A2 bằng Postman

## Khởi động API test

Sau khi đã cài dependencies và chuẩn bị `apps/api/.env` theo [README chính](../README.md), mở terminal tại root repo:

```powershell
docker compose up -d --wait db
npm.cmd --prefix apps/api run postman:dev
```

Giữ terminal này chạy. Script tự generate Prisma, áp dụng migrations và seed vào database của `TEST_DATABASE_URL`, rồi chạy API tại **http://localhost:4001/api**. Swagger nằm ở **http://localhost:4001/api/docs**.

Profile này dùng OTP local **123456**, thanh toán WALLET/CARD giả lập và secret riêng cho mỗi lần khởi động. Cấu hình `.env` hiện tại không bị sửa. Database test phải tồn tại và khác database chính; script kiểm tra điều kiện này trước khi seed. E2E dùng các schema riêng trong cùng database test.

## Import và chạy

1. Trong Postman, chọn **Import** và chọn cả hai file cùng thư mục:
   - `BrewLiteA2.postman_collection.json`
   - `BrewLiteA2.postman_environment.json`
2. Chọn environment **BrewLite A2 — Postman Demo**. Biến `base_url` mặc định là `http://localhost:4001/api`.
3. Trong collection **BrewLite A2 — Kiểm thử API**, chọn folder **01. Luồng test tự động** → **Run** → chạy 1 iteration theo thứ tự có sẵn.

Luồng gồm 31 request: health → đăng nhập demo → đăng ký khách mới → xác thực OTP → đăng nhập bằng SĐT/email → xem menu → đặt món → thanh toán → kiểm tra chống thanh toán lặp → barista hoàn tất đơn → kiểm tra phân quyền → quản lý tạo nhân viên. Các request tự lưu token và ID vào environment; không cần chép JWT thủ công.

Hai request trả **401/403** trong folder này là tình huống kiểm tra quyền có chủ đích. Kết quả mong đợi là toàn bộ **53 assertions** đạt. Mỗi lượt chạy tạo khách, nhân viên và đơn hàng mới trong database test; không chạy cả collection vì các folder còn lại chứa thao tác gọi riêng phụ thuộc trạng thái dữ liệu.

Postman dùng [environment variables](https://learning.postman.com/docs/use/send-requests/variables/environment-variables/) để thay các giá trị `{{base_url}}`, `{{customer_token}}` và ID trong request.

## Tài khoản mẫu

| Vai trò | Đăng nhập | Mật khẩu | Biến token |
| --- | --- | --- | --- |
| Khách demo | Email `demo@brewlite.com` | `Demo@1234` | `customer_token` |
| Barista | Email `barista@brewlite.com` | `Barista@123` | `barista_token` |
| Quản lý demo | SĐT `0900000001` | `Manager@123` | `manager_token` |

Khách mới trong luồng có mật khẩu `Postman@1234`. SĐT và email được tạo tự động, xem trong biến `customer_phone` và `customer_email`. Nhân viên mới dùng `staff_phone`, `staff_password` và `staff_token`.

Mỗi request đã cấu hình Bearer token theo vai trò. Sau khi khởi động lại profile, chạy lại folder 01 để lấy token mới.

## Gọi từng API

Folder 02–08 chứa đủ **43 endpoint** đang có trong Swagger, chia theo xác thực, thực đơn, đơn hàng, thanh toán/khuyến mãi, kho/công thức, nhân viên và hệ thống. Chạy folder 01 trước để có token của các vai trò, rồi mở request cần thử và chọn **Send**.

- Đăng nhập bằng email: `{"email":"{{customer_email}}","password":"{{customer_password}}"}`. Đăng nhập bằng SĐT: `{"phone":"{{customer_phone}}","password":"{{customer_password}}"}`. Tài khoản có SĐT phải hoàn tất OTP; gửi lại OTP cần đợi ít nhất 60 giây.
- Request tạo đơn và thanh toán tự tạo `Idempotency-Key`. Bước thanh toán lặp trong folder 01 giữ nguyên khóa và body để kiểm tra replay. Nếu đổi nội dung request thủ công, dùng khóa mới.
- Muốn thử hủy đơn hoặc hoàn tiền, tạo đơn mới phù hợp trạng thái. Đơn đã `COMPLETED` từ folder 01 không dùng cho các thao tác này.
- Tạo nguyên liệu/sản phẩm/topping sẽ lưu `new_ingredient_id`, `new_product_id`, `new_topping_id`. Các request sửa, công thức, nhập và điều chỉnh kho sử dụng những ID này. Tạo nguyên liệu → nhập kho → tạo sản phẩm → cấu hình công thức trước khi đặt món mới. `quantity` trong API kho là chuỗi thập phân, ví dụ `"1000.000"`.
- Các callback VNPAY có ví dụ riêng nhưng cần cấu hình sandbox và chữ ký hợp lệ từ VNPAY. Profile 4001 dùng thanh toán giả lập; luồng tự động không gọi VNPAY/eSMS thật.

Nếu dùng API dev đang chạy tại cổng 4000, tạo bản sao environment và đổi `base_url` thành `http://localhost:4000/api`, rồi đăng nhập lại bằng tài khoản thuộc database đó. OTP `123456`, quản lý demo và thanh toán giả lập chỉ được bảo đảm ở profile `postman:dev`; luồng tự động được thiết kế cho profile này.

## Chạy tự động trong terminal

Giữ API test đang chạy, mở terminal thứ hai tại root:

```powershell
npm.cmd exec --yes --package=newman@6.2.3 -- newman run postman/BrewLiteA2.postman_collection.json -e postman/BrewLiteA2.postman_environment.json --folder "01. Luồng test tự động" --bail
```

Lệnh tải Newman tạm thời, không thêm dependency vào ứng dụng. Đã kiểm tra local: **31 request / 53 assertions đạt**.

## Cập nhật collection khi API thay đổi

Giữ API test chạy rồi thực hiện:

```powershell
npm.cmd --prefix apps/api run postman:generate
```

Script đối chiếu endpoint với `/api/docs-json`; nếu thêm hoặc xóa route, cập nhật ví dụ trong `apps/api/scripts/generate-postman.mjs` theo lỗi được báo rồi chạy lại. Lệnh tạo lại hai file import với token trống và biến mặc định. Nếu dùng cổng khác, truyền URL API gốc, ví dụ `npm.cmd --prefix apps/api run postman:generate -- http://localhost:4101`, và chỉnh `base_url` tương ứng trong Postman.
