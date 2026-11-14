# Product Backlog — BrewLite A2

Cập nhật: **14/11/2026**.

Đây là bản tổng hợp sau triển khai từ mã nguồn và kết quả kiểm tra hiện có, kèm đề xuất chia phạm vi thành hai sprint. Tài liệu không ghi nhận lịch sử họp sprint, ngày hoàn thành hoặc phân công cá nhân chưa được xác nhận. Các mã `BL-*` là mã nội bộ của backlog, không phải số GitHub Issue.

## Tổng quan

| Sprint | Mục tiêu | Phạm vi |
| --- | --- | --- |
| Sprint 1 | Có nền tảng chạy được và luồng xem thực đơn. | Repo, yêu cầu, UML, kiến trúc, Prisma, API sản phẩm, giao diện menu, Docker và CI. |
| Sprint 2 | Hoàn thiện luồng đặt món, thanh toán và xử lý đơn tại quầy. | Xác thực, giỏ hàng, đơn hàng, thanh toán, kho, điểm thưởng, kiểm thử, CD và bàn giao. |

Lịch bắt đầu/kết thúc chưa được chốt trong tài liệu này. Vai trò phụ trách bên dưới là đề xuất: **BE** — backend, **FE** — frontend, **QA** — kiểm thử, **DevOps** — môi trường và pipeline.

**Ưu tiên MoSCoW:** Must — bắt buộc; Should — nên có; Could — bổ sung khi còn thời gian; Won't — ngoài phạm vi hai sprint.

**Trạng thái:**

- **Done:** đã có hiện thực tích hợp và có kết quả kiểm tra cho phạm vi mô tả.
- **Review:** đã có mã hoặc bản nháp, cần đối chiếu đầy đủ tiêu chí và nghiệm thu trước khi đánh dấu Done.
- **Todo:** chưa có sản phẩm bàn giao hoặc bằng chứng hoàn thành trong repo.

Trạng thái dưới đây chỉ áp dụng cho phần việc ghi trong từng dòng. Việc nghiệm thu cuối cùng theo [Definition of Done trong README](../README.md#definition-of-done).

## Sprint 1

| Mã | Hạng mục | Ưu tiên | Phụ trách đề xuất | Tiêu chí chấp nhận và tham chiếu | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| BL-01 | Cấu trúc repo và quy ước làm việc | Must | Nhóm | Có `apps`, `docs`, `scripts`, `tests`; README hướng dẫn chạy, quy ước Git, PR, commit, DoD và link backlog hai sprint. [README](../README.md). | Review |
| BL-02 | Đặc tả yêu cầu và user story | Must | Nhóm | Lưu bối cảnh, stakeholder, phạm vi, yêu cầu chức năng/phi chức năng và tiêu chí chấp nhận cho luồng đặt món. [Thư mục yêu cầu](requirements/). | Todo |
| BL-03 | Sơ đồ nghiệp vụ và miền dữ liệu | Must | Nhóm | Có Activity, Sequence và Domain Class Diagram khớp API/schema hiện tại, kèm nguồn sơ đồ và bản xuất để xem. [Thư mục sơ đồ](diagrams/). | Todo |
| BL-04 | Kiến trúc và quyết định kỹ thuật | Must | BE, DevOps | Mô tả phân lớp, ranh giới web/API/database, payment mock, logging/health/config và trade-off; đối chiếu [Task 3.1](architecture/README.md) cùng [ADRs](architecture/adr/). Tài liệu đã soạn, cần review/merge. | Review |
| BL-05 | Database, migrations và seed | Must | BE | Prisma generate/build được; migrations áp dụng thành công; seed tạo dữ liệu mẫu và chạy lại không tạo trùng. [Prisma](../apps/api/prisma/). | Done |
| BL-06 | API danh sách và chi tiết đồ uống | Must | BE | `GET /api/products` hỗ trợ phân trang; xem chi tiết sản phẩm, size và topping; ID không tồn tại trả lỗi phù hợp. [Kiểm thử API sản phẩm](../apps/api/test/products-api.e2e-spec.ts). | Done |
| BL-07 | Menu ưu tiên mobile, hỗ trợ desktop | Must | FE | Hiển thị sản phẩm và giá; có loading, empty, error; chọn món được trên mobile và desktop, không tràn ngang. [Giao diện](../apps/web/src/app/), [Product Card](../apps/web/src/components/products/product-card.tsx). | Review |
| BL-08 | Chạy ứng dụng bằng Docker Compose | Must | DevOps | Một lệnh `docker compose up --build -d` chạy web/API/database; backend chờ migration/seed; health và proxy frontend hoạt động, giữ volume database. [Compose](../docker-compose.yml). | Done |
| BL-09 | CI và bảo vệ nhánh main | Must | DevOps, QA | PR chạy lint/test/build hai app; API generate Prisma trước kiểm tra; main yêu cầu cả hai job pass; có bằng chứng CI fail/pass. [Workflow](../.github/workflows/ci.yml), [nghiệm thu CI](ci.md). | Done |

## Sprint 2

| Mã | Hạng mục | Ưu tiên | Phụ trách đề xuất | Tiêu chí chấp nhận và tham chiếu | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| BL-10 | Đăng ký, OTP, đăng nhập SĐT/email | Must | BE | Đăng ký chờ OTP; chỉ cấp JWT sau xác minh; đăng nhập bằng SĐT hoặc email của cùng tài khoản; chặn sai mật khẩu và tài khoản chưa xác minh. [Auth](../apps/api/src/auth/), [test xác thực](../apps/api/test/auth-phone.e2e-spec.ts). | Done |
| BL-11 | Giao diện đăng nhập và xác minh | Must | FE | Có đăng ký/đăng nhập/xác minh OTP; báo lỗi rõ ràng; gửi lại OTP theo thời gian chờ; quản lý phiên và đăng xuất; kiểm tra trên mobile/desktop. [Test đăng nhập](../apps/web/test/login.test.mjs), [test OTP](../apps/web/test/otp-delivery.test.mjs). | Review |
| BL-12 | Chọn size, topping và quản lý giỏ | Must | FE | Chọn size/topping hợp lệ; giá thay đổi đúng; thêm, sửa, xóa món; giữ lựa chọn khi tải lại; không gộp nhầm hai cấu hình món. [Product Modal](../apps/web/src/components/products/product-modal.tsx), [test giỏ hàng](../apps/web/test/cart.test.mjs). | Review |
| BL-13 | Tạo đơn và tính tiền trên server | Must | BE | `POST /api/orders` kiểm tra đầu vào, tự tính giá, lưu snapshot món và tạo đơn `PENDING`; cùng khóa/nội dung không tạo đơn trùng. [Orders](../apps/api/src/orders/), [test idempotency](../apps/api/test/orders-idempotency.e2e-spec.ts). | Done |
| BL-14 | Thanh toán WALLET/CARD giả lập | Must | BE | Profile test xử lý kết quả thành công/thất bại; cập nhật đơn đúng; cùng `Idempotency-Key` và body trả lại kết quả cũ, không tạo thanh toán lặp. [Payments](../apps/api/src/payments/), [luồng Postman](../tests/postman/README.md). | Done |
| BL-15 | Checkout và xử lý thử lại | Must | FE | Thanh toán theo đơn đã tạo; xử lý lỗi và tải lại trang; không tạo đơn hoặc trừ điểm hai lần; giỏ mới không bị xóa bởi phản hồi cũ. [Test checkout](../apps/web/test/checkout.test.mjs), [test trang checkout](../apps/web/test/checkout-page.test.mjs). | Review |
| BL-16 | Xem lịch sử và chi tiết đơn | Must | BE, FE | Khách chỉ xem đơn thuộc tài khoản mình; lịch sử có phân trang, trạng thái và tổng tiền; kiểm tra màn hình rỗng/lỗi trên mobile/desktop. [Orders API](../apps/api/src/orders/orders.controller.ts), [test giao diện đơn](../apps/web/test/orders-page.test.mjs). | Review |
| BL-17 | Barista tiếp nhận và hoàn tất đơn | Must | BE, FE | API yêu cầu quyền barista; luồng `PAID → PREPARING → READY → COMPLETED` hoạt động; chuyển trạng thái sai bị chặn. [Máy trạng thái](../apps/api/src/orders/order-state.ts), [kịch bản Postman](../tests/postman/README.md). | Done |
| BL-18 | Nguyên liệu, công thức và giữ kho | Should | BE, FE | Có đơn vị, công thức theo size/topping, nhập/điều chỉnh kho; đặt món giữ nguyên liệu; hủy hoàn giữ; xử lý cập nhật đồng thời và thiếu nguyên liệu. [Inventory](../apps/api/src/inventory/), [test kho](../apps/api/test/inventory.e2e-spec.ts). | Review |
| BL-19 | Khuyến mãi và điểm thành viên | Should | BE, FE | Validate điều kiện mã giảm giá; tính tổng trên server; tích/đổi điểm theo quy tắc hiện tại và hoàn tác phù hợp; không cộng/trừ lặp. [Quy tắc điểm](../apps/api/src/promotions/voucher-rules.ts), [test voucher](../apps/api/test/order-vouchers.e2e-spec.ts). | Review |
| BL-20 | Hủy đơn và hoàn tiền | Should | BE, FE | Chỉ hủy/hoàn ở trạng thái cho phép; ghi nhận kết quả thanh toán, điểm và kho nhất quán; kiểm tra thao tác lặp và lỗi gateway. [Test thanh toán](../apps/api/test/payments-vnpay.e2e-spec.ts). | Review |
| BL-21 | Tích hợp VNPAY sandbox | Should | BE, FE | Có URL thanh toán, kiểm tra chữ ký, return/IPN và đối soát; test dữ liệu sai kiểu; bổ sung bằng chứng giao dịch sandbox thật. Test mock hiện có chưa thay thế kiểm tra gateway thật. [Gateway](../apps/api/src/payments/vnpay/). | Review |
| BL-22 | Quản lý tạo tài khoản nhân viên | Should | BE | Manager tạo barista, mật khẩu được băm, không lộ hash; barista mới đăng nhập được; vai trò khác không có quyền tạo nhân viên. [Staff API](../apps/api/src/auth/staff.controller.ts), [Postman](../tests/postman/README.md). | Done |
| BL-23 | Bộ kiểm thử và tài liệu thử API | Must | QA, BE, FE | Unit test hai app chạy được; có E2E database riêng; Postman tự lưu token/ID, kiểm tra luồng mua hàng và phân quyền. [Hướng dẫn test](../tests/README.md), [kết quả CI](ci.md#bằng-chứng). | Done |
| BL-24 | Continuous Delivery | Must | DevOps | Pipeline build/publish image hoặc deploy sau khi main đạt CI; gắn phiên bản theo commit và lưu log của một lần chạy thành công. Repo hiện mới có workflow CI. | Todo |
| BL-25 | Triển khai môi trường demo công khai | Must | DevOps | Có URL HTTPS truy cập được, backend kết nối database, cấu hình môi trường tách khỏi code và có kịch bản kiểm tra sau triển khai. Chưa có URL/nghiệm thu cloud được ghi nhận trong repo. | Todo |
| BL-26 | Traceability và nghiệm thu cuối | Must | Nhóm, QA | Ánh xạ yêu cầu → backlog → mã/test → PR; lưu kết quả demo từ menu đến thanh toán và xử lý tại quầy; cập nhật trạng thái theo DoD. | Todo |
| BL-27 | PWA có khả năng cài đặt và cập nhật an toàn | Should | FE, QA | Bổ sung manifest/icons và kiểm tra vòng đời worker/cache; không cache dữ liệu giao dịch riêng tư hoặc gửi thanh toán nền. Bản hiện tại chỉ gỡ PWA cũ. [ADR 006](architecture/adr/006-pwa-strategy.md). | Todo |

## Bằng chứng hiện có

- **CI:** [PR #10](https://github.com/letan01012006/BrewliteA2/pull/10), [lượt fail](https://github.com/letan01012006/BrewliteA2/actions/runs/43614827866), [lượt pass](https://github.com/letan01012006/BrewliteA2/actions/runs/43615481701). Trích log được lưu trong [docs/ci.md](ci.md).
- **Kiểm tra bản sửa CI:** 87 unit test API và 164 test frontend pass; lint/build hai app pass. Có thêm lượt chạy local 57 E2E thanh toán VNPAY được ghi nhận trong tài liệu CI.
- **Postman:** luồng tự động 31 request, 53 kiểm tra đã chạy đạt trong phiên thiết lập; collection/environment nằm ở [tests/postman](../tests/postman/). Đây là kiểm tra API, không phải bằng chứng kiểm thử toàn bộ thao tác trình duyệt.
- **Docker local:** web, API và PostgreSQL đã được chạy và kiểm tra health/proxy/menu. Việc chạy local không đồng nghĩa đã có deployment cloud.

## Phần chưa ưu tiên trong hai sprint

| Hạng mục | Mức ưu tiên đề xuất | Điều kiện xem xét |
| --- | --- | --- |
| Đánh giá đồ uống, phản hồi của khách | Could | Sau khi luồng mua hàng và nghiệm thu chính ổn định. |
| Dashboard doanh thu cho quản lý | Could | Chốt chỉ số, quyền xem và nguồn dữ liệu trước khi thực hiện. |
| App native, giao hàng và chấm công/tính lương | Won't | Không thuộc phạm vi web đặt món hiện tại. |

## Cách cập nhật

Khi chốt người phụ trách hoặc lịch sprint, thay thông tin đề xuất bằng phân công thực tế. Khi chuyển một hạng mục sang Done, gắn PR, kết quả test/demo và đối chiếu DoD; không dùng đường dẫn file mã nguồn như bằng chứng duy nhất. Nếu tạo Google Sheets sau này, dùng mã `BL-*` để đồng bộ với bảng này.

Tham khảo cách trình bày: [BACKLOG.md do người dùng cung cấp](https://github.com/Longcodepro/Project_SE_Assignment02_HK1_2026_2027/blob/main/docs/BACKLOG.md). Nội dung và trạng thái trong tài liệu này được viết riêng cho BrewLite A2.
