import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { addFullFlow } from './full-flow.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outputDirectory = resolve(root, 'tests/postman');
const sourceUrl = (process.argv[2] || 'http://127.0.0.1:4101').replace(
  /\/$/,
  '',
);
const response = await fetch(`${sourceUrl}/api/docs-json`, {
  signal: AbortSignal.timeout(15000),
});
if (!response.ok)
  throw new Error(`Không đọc được Swagger: HTTP ${response.status}`);
const spec = await response.json();
await mkdir(outputDirectory, { recursive: true });

function id(name) {
  const hash = createHash('sha256').update(`BrewLiteA2:${name}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
const auth = (role) =>
  role === 'public'
    ? { type: 'noauth' }
    : {
        type: 'bearer',
        bearer: [{ key: 'token', value: `{{${role}_token}}`, type: 'string' }],
      };
const lines = (script) => script.trim().split('\n');
const numberVariables =
  /"{{((?:new_)?(?:product|ingredient|topping|order|payment)_id|quantity|points_used|topping_ids_json)}}"/g;
const rawBody = (body) =>
  JSON.stringify(body, null, 2).replace(numberVariables, '{{$1}}');
const items = [
  {
    productId: '{{product_id}}',
    size: '{{size}}',
    quantity: '{{quantity}}',
    toppingIds: [],
  },
];
const save = (variable, expression) =>
  `if (pm.response.code < 300 && ${expression} !== undefined) pm.environment.set('${variable}', String(${expression}));`;
const newKey = (variable) =>
  `pm.environment.set('${variable}', pm.variables.replaceIn('{{$guid}}'));`;
const keepKey = (variable) => `if (!pm.variables.get('${variable}')) { ${newKey(variable)} }`;
const storedScript = (script) =>
  `const vars = pm.environment.get('base_url') ? pm.environment : pm.collectionVariables;\n${script.replaceAll('pm.environment.', 'vars.')}`;

const registerSetup = `
const suffix = Date.now().toString().slice(-8);
pm.environment.set('customer_phone', '09' + suffix);
pm.environment.set('customer_email', 'postman.' + Date.now() + '@example.test');
pm.environment.set('customer_password', 'Postman@1234');
pm.environment.unset('customer_token');
`;
const staffSetup = `
pm.environment.set('staff_phone', '08' + Date.now().toString().slice(-8));
pm.environment.set('staff_email', 'barista.' + Date.now() + '@example.test');
`;
function loginSave(role, expectedRole) {
  return `
if (pm.response.code === 200 && data) {
  pm.test('Nhận JWT và đúng vai trò ${expectedRole}', function () {
    pm.expect(data.accessToken).to.be.a('string').and.not.empty;
    pm.expect(data.user.role).to.eql('${expectedRole}');
  });
  if (data.accessToken) {
    pm.environment.set('${role}_token', data.accessToken);
    pm.environment.set('${role}_id', String(data.user.id));
    pm.environment.set('auth_token', data.accessToken);
  }
}
`;
}

function request(name, method, path, options = {}) {
  const {
    role = 'customer',
    body,
    expected = [method === 'POST' ? 201 : 200],
    before = '',
    after = '',
    description = '',
    headers = [],
  } = options;
  const item = {
    id: id(name),
    name,
    request: {
      method,
      auth: auth(role),
      header: [
        { key: 'Accept', value: 'application/json' },
        ...headers.map(([key, value]) => ({ key, value })),
      ],
      url: '{{base_url}}' + path,
      description:
        description +
        `\n\nQuyền: ${role === 'public' ? 'Không cần token' : (role === 'barista' ? 'BARISTA hoặc MANAGER' : role.toUpperCase()) + ', dùng {{' + role + '_token}}'}.`,
    },
    event: [],
    response: [],
  };
  if (body !== undefined) {
    item.request.header.push({
      key: 'Content-Type',
      value: 'application/json',
    });
    item.request.body = {
      mode: 'raw',
      raw: rawBody(body),
      options: { raw: { language: 'json' } },
    };
  }
  if (before.trim())
    item.event.push({
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: lines(storedScript(before)) },
    });
  item.event.push({
    listen: 'test',
    script: {
      type: 'text/javascript',
      exec: lines(storedScript(`
(function () {
let data = null;
try { data = pm.response.json(); } catch (_) { /* GET /api trả về text. */ }
pm.test('HTTP ${expected.join(' hoặc ')}', function () { pm.expect(pm.response.code).to.be.oneOf(${JSON.stringify(expected)}); });
${after}
})();
`)),
    },
  });
  return item;
}

const registerBody = {
  fullName: 'Khách Postman',
  phone: '{{customer_phone}}',
  email: '{{customer_email}}',
  password: '{{customer_password}}',
};
const emailBody = {
  email: '{{customer_email}}',
  password: '{{customer_password}}',
};
const phoneBody = {
  phone: '{{customer_phone}}',
  password: '{{customer_password}}',
};
const paymentBody = {
  orderId: '{{order_id}}',
  method: 'WALLET',
  mockResult: 'SUCCESS',
};
const orderHeaders = [['Idempotency-Key', '{{order_key}}']];
const paymentHeaders = [['Idempotency-Key', '{{payment_key}}']];

const quick = {
  name: '01. Toàn bộ API tự động',
  description:
    'Chạy theo thứ tự với API test riêng ở cổng 4101. Tự tạo khách/nhân viên và dữ liệu kho; kiểm tra toàn bộ endpoint, lưu token/ID và thử thanh toán giả lập. Callback VNPAY kiểm tra từ chối chữ ký sai; thanh toán ngân hàng thật cần sandbox riêng.',
  item: [],
};
function quickRequest(name, method, path, options) {
  quick.item.push(
    request(
      `${String(quick.item.length + 1).padStart(2, '0')}. ${name}`,
      method,
      path,
      options,
    ),
  );
}

quickRequest('API và database hoạt động', 'GET', '/health', {
  role: 'public',
  before: "pm.environment.set('size', 'S'); pm.environment.set('quantity', '2'); pm.environment.set('promo_code', 'BREW10');",
  after:
    "pm.test('Database up', function () { pm.expect(data).to.eql({ status: 'ok', db: 'up' }); });",
});
quickRequest('Đăng nhập khách demo bằng email', 'POST', '/auth/login', {
  role: 'public',
  body: {
    email: '{{demo_customer_email}}',
    password: '{{demo_customer_password}}',
  },
  expected: [200],
  after: loginSave('customer', 'CUSTOMER'),
});
quickRequest('Đăng ký khách mới có SĐT và email', 'POST', '/auth/register', {
  role: 'public',
  body: registerBody,
  before: registerSetup,
  after:
    "pm.test('Đang chờ OTP, chưa cấp JWT', function () { pm.expect(data.requiresOtp).to.eql(true); pm.expect(data.accessToken).to.eql(undefined); });",
});
quickRequest('Gửi lại OTP quá sớm bị giới hạn', 'POST', '/auth/resend-otp', {
  role: 'public', body: { phone: '{{customer_phone}}' }, expected: [429],
  after: "pm.test('Phải đợi giữa hai lần gửi OTP', function () { pm.expect(data.code).to.eql('OTP_RESEND_TOO_SOON'); });",
});
quickRequest('Email chưa OTP bị chặn', 'POST', '/auth/login', {
  role: 'public',
  body: emailBody,
  expected: [403],
  after:
    "pm.test('Yêu cầu xác thực đúng số điện thoại', function () { pm.expect(data.code).to.eql('PHONE_NOT_VERIFIED'); pm.expect(data.details.phone).to.eql(pm.environment.get('customer_phone')); pm.expect(data.accessToken).to.eql(undefined); });",
});
quickRequest('Xác thực OTP 123456', 'POST', '/auth/verify-otp', {
  role: 'public',
  body: { phone: '{{customer_phone}}', code: '{{otp_code}}' },
  expected: [200],
  after: loginSave('customer', 'CUSTOMER'),
});
quickRequest('Đăng nhập bằng số điện thoại', 'POST', '/auth/login', {
  role: 'public',
  body: phoneBody,
  expected: [200],
  after: loginSave('customer', 'CUSTOMER'),
});
quickRequest('Đăng nhập bằng email của cùng tài khoản', 'POST', '/auth/login', {
  role: 'public',
  body: emailBody,
  expected: [200],
  after:
    loginSave('customer', 'CUSTOMER') +
    "pm.test('Cùng số điện thoại đã đăng ký', function () { pm.expect(data.user.phone).to.eql(pm.environment.get('customer_phone')); });",
});
quickRequest('Xem thông tin khách hiện tại', 'GET', '/auth/me', {
  after:
    "pm.test('Tài khoản đã xác thực', function () { pm.expect(data.isPhoneVerified).to.eql(true); pm.expect(String(data.id)).to.eql(pm.environment.get('customer_id')); });",
});
quickRequest(
  'Lấy thực đơn và lưu product_id',
  'GET',
  '/products?page=1&limit=20',
  {
    role: 'public',
    after: `
pm.test('Có sản phẩm trong thực đơn', function () { pm.expect(data.data).to.be.an('array').that.is.not.empty; });
if (data && data.data && data.data.length) {
  const product = data.data.find(item => item.isActive !== false && item.price >= 25000) || data.data[0];
  pm.environment.set('product_id', String(product.id));
}
`,
  },
);
quickRequest('Chi tiết sản phẩm', 'GET', '/products/{{product_id}}', {
  role: 'public',
  after:
    "pm.test('Có lựa chọn size', function () { pm.expect(data.sizes).to.be.an('array').that.is.not.empty; });",
});
quickRequest('Danh sách topping', 'GET', '/products/toppings', {
  role: 'public',
  after:
    "pm.test('Danh sách topping hợp lệ', function () { pm.expect(data).to.be.an('array'); });",
});
quickRequest(
  'Kiểm tra nguyên liệu trước khi đặt',
  'POST',
  '/inventory/availability',
  {
    role: 'public',
    body: { items },
    expected: [200],
    after:
      "pm.test('Đủ nguyên liệu', function () { pm.expect(data.available).to.eql(true); });",
  },
);
quickRequest('Áp dụng khuyến mãi BREW10', 'POST', '/promotions/validate', {
  body: { code: '{{promo_code}}', items },
  expected: [200],
});
quickRequest('Tạo đơn và lưu order_id', 'POST', '/orders', {
  body: { items, promoCode: '{{promo_code}}' },
  headers: orderHeaders,
  before: newKey('order_key'),
  after:
    save('order_id', 'data.id') +
    "\npm.test('Đơn đang chờ thanh toán', function () { pm.expect(data.status).to.eql('PENDING'); });",
});
quickRequest('Xem đơn vừa tạo', 'GET', '/orders/{{order_id}}');
quickRequest('Thanh toán WALLET giả lập', 'POST', '/payments', {
  body: paymentBody,
  headers: paymentHeaders,
  before: newKey('payment_key'),
  after:
    save('payment_id', 'data.payment.id') +
    "\npm.test('Thanh toán thành công và đơn đã PAID', function () { pm.expect(data.payment.status).to.eql('SUCCESS'); pm.expect(data.order.status).to.eql('PAID'); });",
});
quickRequest(
  'Gửi lại cùng khóa, không thanh toán hai lần',
  'POST',
  '/payments',
  {
    body: paymentBody,
    headers: paymentHeaders,
    after:
      "pm.test('Replay cùng giao dịch', function () { pm.expect(pm.response.headers.get('Idempotent-Replayed')).to.eql('true'); pm.expect(String(data.payment.id)).to.eql(pm.environment.get('payment_id')); });",
  },
);
quickRequest('Xem giao dịch', 'GET', '/payments/{{payment_id}}');
quickRequest('Lịch sử đơn hàng của khách', 'GET', '/orders/me?page=1&limit=10');
quickRequest('Đăng nhập barista', 'POST', '/auth/login', {
  role: 'public',
  body: { email: '{{barista_email}}', password: '{{barista_password}}' },
  expected: [200],
  after: loginSave('barista', 'BARISTA'),
});
quickRequest('Barista xem đơn tại quầy', 'GET', '/orders/active', {
  role: 'barista',
});
for (const [status, label] of [
  ['PREPARING', 'Bắt đầu pha chế'],
  ['READY', 'Sẵn sàng nhận'],
  ['COMPLETED', 'Hoàn tất đơn'],
]) {
  quickRequest(label, 'PATCH', '/orders/{{order_id}}/status', {
    role: 'barista',
    body: { status },
  });
}
quickRequest('Khách kiểm tra đơn đã hoàn tất', 'GET', '/orders/{{order_id}}', {
  after:
    "pm.test('Đơn đã COMPLETED', function () { pm.expect(data.status).to.eql('COMPLETED'); });",
});
quickRequest('Barista xem tồn kho', 'GET', '/inventory/stock', {
  role: 'barista',
});
quickRequest('Thiếu JWT bị chặn', 'GET', '/auth/me', {
  role: 'public',
  expected: [401],
  after:
    "pm.test('Yêu cầu đăng nhập', function () { pm.expect(data.code).to.eql('UNAUTHORIZED'); });",
});
quickRequest('Khách không được xem kho nội bộ', 'GET', '/inventory/stock', {
  expected: [403],
});
quickRequest('Đăng nhập quản lý demo', 'POST', '/auth/login', {
  role: 'public',
  body: { phone: '{{manager_phone}}', password: '{{manager_password}}' },
  expected: [200],
  after: loginSave('manager', 'MANAGER'),
});
quickRequest('Quản lý tạo barista mới', 'POST', '/admin/staff', {
  role: 'manager',
  body: {
    fullName: 'Barista Postman',
    phone: '{{staff_phone}}',
    email: '{{staff_email}}',
    password: '{{staff_password}}',
  },
  before: staffSetup,
  after:
    save('staff_id', 'data.id') +
    "pm.test('Nhân viên đăng nhập được ngay', function () { pm.expect(data.role).to.eql('BARISTA'); pm.expect(data.isPhoneVerified).to.eql(true); pm.expect(data.passwordHash).to.eql(undefined); });",
});
quickRequest('Barista mới đăng nhập bằng SĐT', 'POST', '/auth/login', {
  role: 'public',
  body: { phone: '{{staff_phone}}', password: '{{staff_password}}' },
  expected: [200],
  after: loginSave('staff', 'BARISTA'),
});

const definitions = {
  'POST /auth/register': {
    role: 'public',
    body: registerBody,
    before: registerSetup,
  },
  'POST /auth/verify-otp': {
    role: 'public',
    body: { phone: '{{customer_phone}}', code: '{{otp_code}}' },
    expected: [200],
    after: loginSave('customer', 'CUSTOMER'),
  },
  'POST /auth/resend-otp': {
    role: 'public',
    body: { phone: '{{customer_phone}}' },
    expected: [200],
    description:
      'Chỉ dùng cho tài khoản chưa OTP; đợi ít nhất 60 giây sau lần gửi trước.',
  },
  'POST /auth/login': {
    role: 'public',
    body: emailBody,
    expected: [200],
    before: `
const role = String(pm.variables.get('login_role') || 'CUSTOMER').toUpperCase();
if (!['CUSTOMER', 'BARISTA', 'MANAGER', 'STAFF'].includes(role)) throw new Error('login_role: CUSTOMER, BARISTA, MANAGER hoặc STAFF');
if (role !== 'CUSTOMER') {
  const prefix = role.toLowerCase();
  const phone = pm.variables.get(prefix + '_phone');
  const body = phone ? { phone } : { email: pm.variables.get(prefix + '_email') };
  body.password = pm.variables.get(prefix + '_password');
  pm.request.body.update(JSON.stringify(body));
}
`,
    after: `
if (pm.response.code === 200 && data && data.accessToken) {
  const role = String(pm.variables.get('login_role') || 'CUSTOMER').toLowerCase();
  pm.environment.set(role + '_token', data.accessToken);
  pm.environment.set(role + '_id', String(data.user.id));
  pm.environment.set('auth_token', data.accessToken);
  pm.test('Nhận JWT đúng tài khoản', function () { pm.expect(data.user.role).to.eql(role === 'staff' ? 'BARISTA' : role.toUpperCase()); });
}
`,
    description:
      'Đổi login_role trong environment: CUSTOMER, BARISTA, MANAGER hoặc STAFF. CUSTOMER dùng body đang hiển thị (có thể đổi email thành phone); các vai trò khác lấy thông tin demo tương ứng. Tự lưu token theo vai trò và auth_token cho GET /auth/me. STAFF là tài khoản nhân viên mới, có quyền BARISTA trong dự án A2.',
  },
  'GET /auth/me': { role: 'auth' },
  'GET /admin/staff': {
    role: 'manager',
    path: '/admin/staff?page=1&limit=10',
    description: 'Danh sách nhân viên BARISTA, mới nhất trước; không trả mật khẩu hoặc dữ liệu OTP.',
  },
  'POST /admin/staff': {
    role: 'manager',
    body: {
      fullName: 'Barista Postman',
      phone: '{{staff_phone}}',
      email: '{{staff_email}}',
      password: '{{staff_password}}',
    },
    before: staffSetup,
    after: save('staff_id', 'data.id'),
  },
  'PATCH /admin/staff/{id}': {
    role: 'manager', path: '/admin/staff/{{staff_id}}',
    body: { fullName: 'Nhân viên đã sửa', phone: '{{staff_phone}}', email: '{{staff_email}}' },
    description: 'MANAGER sửa nhân viên BARISTA. Giữ ít nhất SĐT hoặc email; dùng null để bỏ một định danh. Không đổi mật khẩu/vai trò qua API này.',
  },
  'DELETE /admin/staff/{id}': {
    role: 'manager', path: '/admin/staff/{{staff_id}}',
    description: 'Xóa mềm BARISTA; mất quyền đăng nhập và JWT cũ bị thu hồi, lịch sử nghiệp vụ được giữ lại. Chỉ thử với tài khoản nhân viên vừa tạo trong database test.',
  },
  'GET /products': {
    role: 'public',
    path: '/products?page=1&limit=20',
    after:
      "if (!pm.variables.get('product_id') && data && data.data && data.data.length) { const product = data.data.find(p => p.isActive !== false && p.availability && p.availability.some(a => a.maxQuantity > 0)) || data.data[0]; pm.environment.set('product_id', String(product.id)); }",
  },
  'POST /products': {
    role: 'barista',
    body: {
      name: 'Cà phê Postman {{$guid}}',
      category: 'Cà phê',
      price: 35000,
      imageUrl: '/img/tra-sua.jpg',
      description: 'Sản phẩm tạo từ Postman',
      toppingIds: [],
    },
    after: save('new_product_id', 'data.id'),
    description:
      'Lưu new_product_id. Sau khi tạo, cấu hình công thức và nhập nguyên liệu để có thể bán.',
  },
  'GET /products/{id}': { role: 'public', path: '/products/{{product_id}}' },
  'PATCH /products/{id}/status': {
    role: 'manager',
    path: '/products/{{new_product_id}}/status',
    body: { isActive: false },
    description: 'Chỉ MANAGER được bật/tắt bán. Dùng new_product_id được lưu sau request tạo sản phẩm.',
  },
  'PATCH /products/{id}/toppings': {
    role: 'barista',
    path: '/products/{{new_product_id}}/toppings',
    body: { toppingIds: '{{topping_ids_json}}' },
  },
  'GET /products/toppings': { role: 'public', after: "if (!pm.variables.get('topping_id') && data && data.length) pm.environment.set('topping_id', String(data[0].id));" },
  'POST /products/toppings': {
    role: 'barista',
    body: { name: 'Topping Postman {{$guid}}', price: 5000 },
    after: save('new_topping_id', 'data.id'),
  },
  'GET /toppings': {
    role: 'public',
    description:
      'Đường dẫn tương thích cũ; ưu tiên /products/toppings khi viết client mới.',
  },
  'POST /orders': {
    body: { items },
    headers: orderHeaders,
    before: keepKey('order_key'),
    after: save('order_id', 'data.id'),
  },
  'GET /orders': { role: 'barista', path: '/orders?page=1&limit=10' },
  'GET /orders/me': { path: '/orders/me?page=1&limit=10' },
  'GET /orders/active': { role: 'barista' },
  'GET /orders/{id}': { path: '/orders/{{order_id}}' },
  'POST /orders/{id}/cancel': {
    path: '/orders/{{order_id}}/cancel',
    expected: [200],
    description:
      'Tạo một đơn mới trước khi thử hủy. Đơn COMPLETED không hủy được.',
  },
  'PATCH /orders/{id}/status': {
    role: 'barista',
    path: '/orders/{{order_id}}/status',
    body: { status: '{{order_status}}' },
  },
  'POST /payments': {
    body: {
      orderId: '{{order_id}}',
      method: '{{payment_method}}',
      mockResult: 'SUCCESS',
    },
    headers: paymentHeaders,
    before: keepKey('payment_key'),
    after:
      "if (pm.response.code < 300 && data && data.payment) pm.environment.set('payment_id', String(data.payment.id));",
    description:
      'Mặc định WALLET giả lập ở profile 4101. Cùng khóa và cùng body được replay; tạo đơn mới nếu đơn hiện tại đã thanh toán. Để thử POINTS, bỏ mockResult và thêm pointsUsed là bội số của 20.',
  },
  'GET /payments/{id}': { path: '/payments/{{payment_id}}' },
  'POST /payments/{id}/refund': {
    role: 'barista',
    path: '/payments/{{payment_id}}/refund',
    expected: [200],
    description:
      'Yêu cầu giao dịch/đơn ở trạng thái cho phép hoàn tiền. Không dùng đơn COMPLETED từ folder test tự động.',
  },
  'GET /payments/vnpay/ipn': {
    role: 'public',
    path: '/payments/vnpay/ipn?vnp_TxnRef={{vnp_txn_ref}}&vnp_Amount={{vnp_amount}}&vnp_ResponseCode={{vnp_response_code}}&vnp_TransactionStatus={{vnp_transaction_status}}&vnp_SecureHash={{vnp_secure_hash}}',
    description:
      'Cần tham số và chữ ký thực từ VNPAY sandbox. Profile Postman 4101 không cấu hình VNPAY. IPN trả HTTP 200 với RspCode=97 khi chữ ký sai; đây là kiểm tra từ chối callback, không phải thanh toán sandbox thành công.',
  },
  'GET /payments/vnpay/return': {
    path: '/payments/vnpay/return?vnp_TxnRef={{vnp_txn_ref}}&vnp_Amount={{vnp_amount}}&vnp_ResponseCode={{vnp_response_code}}&vnp_TransactionStatus={{vnp_transaction_status}}&vnp_SecureHash={{vnp_secure_hash}}',
    description:
      'Cần chữ ký VNPAY sandbox và token của chủ giao dịch. Dùng API dev có cấu hình VNPAY để kiểm thử callback thật.',
  },
  'POST /promotions/validate': {
    body: { code: '{{promo_code}}', items },
    expected: [200],
  },
  'GET /inventory/units': { role: 'barista' },
  'GET /inventory/ingredients': {
    role: 'barista',
    after:
      "if (!pm.variables.get('ingredient_id') && data && data.length) pm.environment.set('ingredient_id', String(data[0].id));",
  },
  'POST /inventory/ingredients': {
    role: 'barista',
    body: {
      code: 'POSTMAN_{{$guid}}',
      name: 'Nguyên liệu Postman {{$guid}}',
      unit: 'GRAM',
    },
    after: save('new_ingredient_id', 'data.id'),
  },
  'GET /inventory/ingredients/{id}': {
    role: 'barista',
    path: '/inventory/ingredients/{{ingredient_id}}',
  },
  'PATCH /inventory/ingredients/{id}': {
    role: 'barista',
    path: '/inventory/ingredients/{{new_ingredient_id}}',
    body: { isActive: true },
  },
  'GET /products/{id}/recipes/{size}': {
    role: 'barista',
    path: '/products/{{product_id}}/recipes/{{size}}',
  },
  'PUT /products/{id}/recipes/{size}': {
    role: 'barista',
    path: '/products/{{new_product_id}}/recipes/{{size}}',
    body: {
      ingredients: [
        { ingredientId: '{{new_ingredient_id}}', quantity: '16.000' },
      ],
      isActive: true,
    },
  },
  'GET /products/toppings/{id}/recipe': {
    role: 'barista',
    path: '/products/toppings/{{topping_id}}/recipe',
  },
  'PUT /products/toppings/{id}/recipe': {
    role: 'barista',
    path: '/products/toppings/{{new_topping_id}}/recipe',
    body: {
      ingredientId: '{{new_ingredient_id}}',
      quantityPerServing: '5.000',
    },
  },
  'POST /inventory/availability': {
    role: 'public',
    body: { items },
    expected: [200],
  },
  'GET /inventory/stock': { role: 'barista' },
  'GET /inventory/movements': {
    role: 'barista',
    path: '/inventory/movements?page=1&limit=20',
  },
  'POST /inventory/receipts': {
    role: 'barista',
    body: {
      ingredientId: '{{new_ingredient_id}}',
      quantity: '1000.000',
      reason: 'Nhập kho thử từ Postman',
    },
    headers: [['Idempotency-Key', '{{receipt_key}}']],
    before: keepKey('receipt_key'),
    after: save('movement_id', 'data.id'),
  },
  'POST /inventory/adjustments': {
    role: 'barista',
    body: {
      ingredientId: '{{new_ingredient_id}}',
      quantity: '-1.000',
      reason: 'Hao hụt thử từ Postman',
    },
    headers: [['Idempotency-Key', '{{adjustment_key}}']],
    before: keepKey('adjustment_key'),
  },
  'GET /health': { role: 'public' },
  'GET /': { role: 'public', path: '' },
};

addFullFlow({ quickRequest, request, quick, definitions, items, save, newKey, loginSave, staffSetup, orderHeaders, paymentHeaders, paymentBody });

const folders = new Map();

let routeCount = 0;
const unused = new Set(Object.keys(definitions));
for (const [apiPath, methods] of Object.entries(spec.paths)) {
  const path = apiPath.replace(/^\/api(?=\/|$)/, '') || '/';
  for (const [method, operation] of Object.entries(methods)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    const key = `${method.toUpperCase()} ${path}`;
    const override = definitions[key];
    if (!override)
      throw new Error(
        `API mới chưa có ví dụ Postman: ${key}. Bổ sung definitions rồi generate lại.`,
      );
    unused.delete(key);
    const folderName = operation.tags?.[0] || 'App';
    if (!folders.has(folderName))
      folders.set(folderName, {
        name: folderName,
        description:
          'Các endpoint cùng nhóm Swagger. Đăng nhập đúng vai trò trước khi Send; chỉnh ID/body theo dữ liệu. Collection tự động nằm trong file BrewLiteA2.auto.postman_collection.json.',
        item: [],
      });
    folders.get(folderName).item.push(
      request(
        `${method.toUpperCase()} ${apiPath}`,
        method.toUpperCase(),
        override.path ?? path,
        {
          ...override,
          description: [operation.summary, operation.description, override.description,
            operation.requestBody?.content?.['application/json']?.schema ? 'Schema body (Swagger):\n```json\n' + JSON.stringify(operation.requestBody.content['application/json'].schema, null, 2) + '\n```' : '']
            .filter(Boolean)
            .join('\n\n'),
        },
      ),
    );
    routeCount++;
  }
}
if (unused.size)
  throw new Error(
    `Ví dụ đã lỗi thời, không còn trong Swagger: ${[...unused].join(', ')}`,
  );

const collection = {
  info: {
    _postman_id: id('collection'),
    name: `BrewLite A2 — Swagger (${routeCount} API)`,
    description:
      'Đúng method/path và nhóm trong Swagger, dùng Send từng API như Try it out. Chọn environment BrewLite A2 — Postman Demo (4101), đăng nhập trong auth; login_role chọn CUSTOMER/BARISTA/MANAGER/STAFF. Token và ID tự lưu. Chạy toàn bộ bằng collection BrewLite A2 — Chạy toàn bộ API trong file auto riêng. Đọc tests/postman/README.md.',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: auth('customer'),
  item: [...folders.values()],
};

const defaults = {
  base_url: `${sourceUrl.replace('127.0.0.1', 'localhost')}/api`,
  login_role: 'CUSTOMER',
  auth_token: '',
  demo_customer_email: 'demo@brewlite.com',
  demo_customer_password: 'Demo@1234',
  customer_email: 'demo@brewlite.com',
  customer_phone: '',
  customer_password: 'Demo@1234',
  barista_email: 'barista@brewlite.com',
  barista_password: 'Barista@123',
  manager_phone: '0900000001',
  manager_password: 'Manager@123',
  staff_phone: '',
  staff_email: '',
  staff_password: 'Barista@1234',
  otp_code: '123456',
  customer_token: '',
  barista_token: '',
  manager_token: '',
  staff_token: '',
  customer_id: '',
  barista_id: '',
  manager_id: '',
  staff_id: '',
  retired_staff_token: '',
  product_id: '',
  topping_id: '',
  ingredient_id: '',
  quantity: '2',
  size: 'S',
  topping_ids_json: '[]',
  promo_code: 'BREW10',
  order_id: '',
  order_key: '',
  order_status: 'PREPARING',
  payment_id: '',
  payment_key: '',
  payment_method: 'WALLET',
  points_used: '700',
  stock_key: '',
  receipt_key: '',
  adjustment_key: '',
  movement_id: '',
  new_product_id: '',
  new_ingredient_id: '',
  new_topping_id: '',
  vnp_txn_ref: '',
  vnp_amount: '',
  vnp_response_code: '00',
  vnp_transaction_status: '00',
  vnp_secure_hash: '',
};
collection.variable = Object.entries(defaults).map(([key, value]) => ({ key, value, type: 'string' }));
const automation = {
  ...collection,
  info: { ...collection.info, _postman_id: id('automation'), name: 'BrewLite A2 — Chạy toàn bộ API',
    description: 'Run toàn bộ collection theo thứ tự trên API test riêng. Tự đăng nhập, tạo dữ liệu và kiểm tra tất cả endpoint; 401/403/400 có chủ đích cũng phải PASS. Không dùng collection này trên database chính. VNPAY chỉ thử từ chối callback sai chữ ký, không gửi SMS hoặc giao dịch ngân hàng thật.' },
  event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: lines(`
const base = pm.variables.get('base_url');
if (!${JSON.stringify([`http://localhost:${new URL(sourceUrl).port}/api`, `http://127.0.0.1:${new URL(sourceUrl).port}/api`])}.includes(base)) throw new Error('Collection tự động chỉ chạy trên API test localhost:${new URL(sourceUrl).port}/api.');
`) } }],
  item: [quick],
};
const environment = {
  id: id('environment'),
  name: 'BrewLite A2 — Postman Demo',
  values: Object.entries(defaults).map(([key, value]) => ({
    key,
    value,
    type: /password|token|otp_code|secure_hash/.test(key)
      ? 'secret'
      : 'default',
    enabled: true,
  })),
  _postman_variable_scope: 'environment',
};

const usedVariables = new Set(
  [...JSON.stringify([collection, automation]).matchAll(/{{([^{}]+)}}/g)]
    .map((match) => match[1])
    .filter((key) => !key.startsWith('$')),
);
for (const variable of usedVariables)
  if (!(variable in defaults))
    throw new Error(`Thiếu biến environment: ${variable}`);

// Validate everything before replacing any import file.
function routeShape(value) {
  return value.replace(/\{\{[^}]+\}\}|\{[^}]+\}/g, ':param').replace(/\/$/, '') || '/';
}
const covered = new Set(quick.item.map(item => item.request.method + ' ' + routeShape(item.request.url.replace('{{base_url}}', '').split('?')[0])));
const missing = Object.keys(definitions).filter(key => {
  const [method, path] = key.split(' ');
  return !covered.has(method + ' ' + routeShape(path));
});
if (missing.length) throw new Error('Luồng tự động còn thiếu endpoint: ' + missing.join(', '));
function checkScripts(node) {
  for (const event of node.event || []) new Script(event.script.exec.join('\n'));
  for (const child of node.item || []) checkScripts(child);
}
checkScripts(collection);
checkScripts(automation);
await writeFile(
  resolve(outputDirectory, 'BrewLiteA2.postman_collection.json'),
  JSON.stringify(collection, null, 2) + '\n',
);
await writeFile(
  resolve(outputDirectory, 'BrewLiteA2.postman_environment.json'),
  JSON.stringify(environment, null, 2) + '\n',
);
await writeFile(resolve(outputDirectory, 'BrewLiteA2.auto.postman_collection.json'), JSON.stringify(automation, null, 2) + '\n');
await writeFile(resolve(outputDirectory, 'BrewLiteA2.openapi.json'), JSON.stringify(spec, null, 2) + '\n');

console.log(
  `Đã tạo collection: ${quick.item.length} bước test tự động, ${routeCount} API đầy đủ, ${Object.keys(defaults).length} biến environment.`,
);
