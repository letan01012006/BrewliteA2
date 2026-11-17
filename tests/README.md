# Kiểm thử dự án

| Vị trí | Phạm vi |
| --- | --- |
| `tests/postman/` | Collection/environment để thử API bằng Postman hoặc Newman |
| `tests/deployment/` | Test điều kiện CI, deploy đúng commit và smoke check của CD (mock provider, không cần cloud) |
| `apps/api/src/**/*.spec.ts` | Unit test API |
| `apps/api/test/` | API E2E và công cụ kiểm tra browser liên quan |
| `apps/web/test/` | Test frontend và các script kiểm tra browser |

Test riêng của từng app được giữ cạnh mã nguồn để dùng đúng cấu hình và dependencies hiện có. Chạy từ root:

```powershell
npm.cmd --prefix apps/web test
npm.cmd --prefix apps/api test
npm.cmd --prefix apps/api run test:e2e
node --test tests/deployment/*.test.mjs
```

E2E cần PostgreSQL và `TEST_DATABASE_URL` trỏ tới database riêng trong `apps/api/.env`.

Để dùng Postman, import `tests/postman/BrewLiteA2.postman_collection.json` (46 API theo nhóm Swagger), `tests/postman/BrewLiteA2.auto.postman_collection.json` (79 bước tự động) và `tests/postman/BrewLiteA2.postman_environment.json` (API test cổng 4101). Hướng dẫn và lệnh Newman nằm trong [postman/README.md](postman/README.md).
