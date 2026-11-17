// Extend the customer checkout smoke flow with every remaining Swagger endpoint.
export function addFullFlow({ quickRequest, definitions, items, save, newKey, loginSave, orderHeaders, paymentHeaders }) {
  function add(key, name, changes = {}) {
    const [method, path] = key.split(' ');
    const example = definitions[key];
    quickRequest(name, method, changes.path ?? example.path ?? path, { ...example, ...changes });
  }
  const expect = (name, expression) => `pm.test(${JSON.stringify(name)}, function () { ${expression} });`;

  add('GET /', 'API gốc trả về nội dung');
  add('GET /inventory/units', 'Danh sách đơn vị nguyên liệu', {
    after: expect('Có GRAM, MILLILITRE, PIECE', "pm.expect(data).to.include.members(['GRAM', 'MILLILITRE', 'PIECE']);"),
  });
  add('GET /inventory/ingredients', 'Danh sách nguyên liệu', {
    after: expect('Danh sách nguyên liệu', "pm.expect(data).to.be.an('array');"),
  });
  add('POST /inventory/ingredients', 'Tạo nguyên liệu riêng cho lượt test', {
    after: save('new_ingredient_id', 'data.id') + save('ingredient_id', 'data.id') +
      expect('Tồn ban đầu bằng 0', 'pm.expect(Number(data.stockQuantity)).to.eql(0);'),
  });
  add('GET /inventory/ingredients/{id}', 'Xem nguyên liệu vừa tạo');
  add('PATCH /inventory/ingredients/{id}', 'Sửa thông tin nguyên liệu', {
    body: { name: 'Nguyên liệu đã sửa {{$guid}}', isActive: true },
  });
  add('POST /inventory/receipts', 'Nhập kho nguyên liệu mới', {
    before: newKey('receipt_key'),
    body: { ingredientId: '{{new_ingredient_id}}', quantity: '10000.000', reason: 'Postman full flow' },
    after: save('movement_id', 'data.id'),
  });
  add('POST /inventory/receipts', 'Gửi lại phiếu nhập, không cộng tồn hai lần', {
    body: { ingredientId: '{{new_ingredient_id}}', quantity: '10000.000', reason: 'Postman full flow' },
    before: '',
    after: expect('Trả cùng phiếu nhập', "pm.expect(String(data.id)).to.eql(pm.environment.get('movement_id'));"),
  });
  add('POST /inventory/adjustments', 'Ghi nhận hao hụt 100 gram', {
    before: newKey('adjustment_key'),
    body: { ingredientId: '{{new_ingredient_id}}', quantity: '-100.000', reason: 'Postman full flow' },
  });
  add('GET /inventory/stock', 'Xác nhận tồn kho sau nhập và hao hụt', {
    after: expect('Tồn 9900, chưa giữ cho đơn', "const row = data.find(r => String(r.id) === pm.environment.get('new_ingredient_id')); pm.expect(Number(row.stockQuantity)).to.eql(9900); pm.expect(Number(row.reservedQuantity)).to.eql(0);"),
  });
  add('GET /inventory/movements', 'Lịch sử kho theo nguyên liệu', {
    path: '/inventory/movements?ingredientId={{new_ingredient_id}}&page=1&limit=20',
    after: expect('Chỉ có một phiếu nhập và một hao hụt', 'pm.expect(data.meta.total).to.eql(2);'),
  });
  add('POST /products/toppings', 'Tạo topping riêng', {
    after: save('new_topping_id', 'data.id') + save('topping_id', 'data.id'),
  });
  add('PUT /products/toppings/{id}/recipe', 'Cấu hình định mức topping');
  add('GET /products/toppings/{id}/recipe', 'Xem định mức topping');
  add('POST /products', 'Tạo sản phẩm riêng giá 10000đ', {
    body: { name: 'Món Postman {{$guid}}', category: 'Postman', price: 10000, imageUrl: '/img/ca-phe-sua.jpg', toppingIds: [] },
    after: save('new_product_id', 'data.id'),
  });
  add('PUT /products/{id}/recipes/{size}', 'Cấu hình công thức size S');
  add('GET /products/{id}/recipes/{size}', 'Xem công thức vừa cấu hình', {
    path: '/products/{{new_product_id}}/recipes/{{size}}',
    after: expect('Công thức có nguyên liệu', "pm.expect(data.ingredients).to.have.lengthOf(1); pm.expect(data.isActive).to.eql(true);"),
  });
  add('PATCH /products/{id}/toppings', 'Gắn topping cho sản phẩm', {
    before: "pm.environment.set('topping_ids_json', JSON.stringify([Number(pm.environment.get('new_topping_id'))]));",
  });
  add('GET /products/{id}', 'Xem sản phẩm với topping được phép', {
    path: '/products/{{new_product_id}}',
    after: expect('Có topping vừa gắn', "pm.expect(data.toppings.some(t => String(t.id) === pm.environment.get('new_topping_id'))).to.eql(true);"),
  });
  add('PATCH /products/{id}/status', 'Quản lý tạm dừng bán sản phẩm', {
    after: expect('Đã tạm dừng', 'pm.expect(data.isActive).to.eql(false);'),
  });
  add('GET /products/{id}', 'Khách không xem được món đang tạm dừng', {
    path: '/products/{{new_product_id}}', expected: [404],
  });
  add('GET /products', 'Nhân viên xem cả món tạm dừng', {
    role: 'barista', path: '/products?includeInactive=true&search=M%C3%B3n%20Postman&limit=50',
    after: expect('Món tạm dừng vẫn có trong danh sách nội bộ', "pm.expect(data.data.some(p => String(p.id) === pm.environment.get('new_product_id') && p.isActive === false)).to.eql(true);"),
  });
  add('PATCH /products/{id}/status', 'Quản lý mở bán lại sản phẩm', { body: { isActive: true } });
  add('PATCH /products/{id}/status', 'Barista không được tự bật tắt bán', { role: 'barista', body: { isActive: false }, expected: [403] });
  add('GET /toppings', 'Đường dẫn topping tương thích');
  add('GET /orders', 'Nhân viên xem lịch sử đơn tại quầy');

  add('GET /admin/staff', 'Quản lý xem danh sách nhân viên', {
    after: expect('Nhân viên mới có trong danh sách, không lộ mật khẩu', "const staff = data.data.find(s => String(s.id) === pm.environment.get('staff_id')); pm.expect(staff).to.be.an('object'); pm.expect(staff).not.to.have.property('passwordHash');"),
  });
  add('PATCH /admin/staff/{id}', 'Quản lý sửa nhân viên vừa tạo', {
    after: expect('Thông tin nhân viên đã cập nhật', "pm.expect(data.fullName).to.eql('Nhân viên đã sửa'); pm.expect(data.role).to.eql('BARISTA');"),
  });
  add('PATCH /admin/staff/{id}', 'Khách không được sửa nhân viên', { role: 'customer', expected: [403] });
  add('DELETE /admin/staff/{id}', 'Quản lý xóa nhân viên test', {
    before: "pm.environment.set('retired_staff_token', pm.environment.get('staff_token'));",
    after: expect('Xóa nhân viên thành công', 'pm.expect(data.deleted).to.eql(true);'),
  });
  quickRequest('JWT của nhân viên đã xóa bị thu hồi', 'GET', '/auth/me', { role: 'retired_staff', expected: [401] });
  quickRequest('Nhân viên đã xóa không thể đăng nhập', 'POST', '/auth/login', {
    role: 'public', body: { phone: '{{staff_phone}}', password: '{{staff_password}}' }, expected: [401],
  });
  add('POST /admin/staff', 'Tạo nhân viên hoạt động để tiếp tục thử thủ công');
  quickRequest('Đăng nhập nhân viên mới, lưu staff_token', 'POST', '/auth/login', {
    role: 'public', body: { phone: '{{staff_phone}}', password: '{{staff_password}}' }, expected: [200], after: loginSave('staff', 'BARISTA'),
  });

  const selectNewProduct = "pm.environment.set('product_id', pm.environment.get('new_product_id'));";
  function order(name) {
    quickRequest(name, 'POST', '/orders', {
      body: { items }, headers: orderHeaders,
      before: selectNewProduct + newKey('order_key'),
      after: save('order_id', 'data.id') + save('points_used', 'Math.ceil(data.total / 1000) * 20'),
    });
  }
  order('Tạo đơn mới để thử hủy trước thanh toán');
  add('POST /orders/{id}/cancel', 'Khách hủy đơn đang PENDING', {
    after: expect('Đơn đã hủy', "pm.expect(data.status).to.eql('CANCELLED');"),
  });
  order('Tạo đơn mới để thử thẻ giả lập và hoàn tiền');
  quickRequest('Thanh toán CARD giả lập', 'POST', '/payments', {
    body: { orderId: '{{order_id}}', method: 'CARD', mockResult: 'SUCCESS' }, headers: paymentHeaders,
    before: newKey('payment_key'), after: save('payment_id', 'data.payment.id'),
  });
  add('POST /payments/{id}/refund', 'Nhân viên hoàn tiền giao dịch test', {
    after: expect('Hoàn tiền thành công', "pm.expect(data.refund.status).to.eql('SUCCESS');"),
  });
  add('POST /payments/{id}/refund', 'Gửi lại yêu cầu hoàn tiền, không hoàn hai lần', {
    after: expect('Giữ kết quả hoàn tiền thành công', "pm.expect(data.refund.status).to.eql('SUCCESS');"),
  });
  order('Tạo đơn mới để thanh toán toàn bộ bằng điểm');
  quickRequest('Thanh toán POINTS', 'POST', '/payments', {
    body: { orderId: '{{order_id}}', method: 'POINTS', pointsUsed: '{{points_used}}' }, headers: paymentHeaders,
    before: newKey('payment_key'), after: save('payment_id', 'data.payment.id') +
      expect('Đã thanh toán bằng điểm', "pm.expect(data.payment.method).to.eql('POINTS'); pm.expect(data.order.status).to.eql('PAID');"),
  });
  add('POST /orders/{id}/cancel', 'Hủy đơn POINTS và hoàn lại điểm', {
    after: expect('Đơn POINTS đã hủy', "pm.expect(data.status).to.eql('CANCELLED');"),
  });
  quickRequest('IPN VNPAY từ chối chữ ký giả', 'GET', '/payments/vnpay/ipn?vnp_TxnRef=PostmanInvalid&vnp_Amount=1000000&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_SecureHash=invalid', {
    role: 'public', after: expect('RspCode 97: chữ ký không hợp lệ', "pm.expect(data.RspCode).to.eql('97');"),
  });
  quickRequest('Return VNPAY từ chối chữ ký giả', 'GET', '/payments/vnpay/return?vnp_TxnRef=PostmanInvalid&vnp_Amount=1000000&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_SecureHash=invalid', {
    expected: [400], after: expect('INVALID_SIGNATURE', "pm.expect(data.code).to.eql('INVALID_SIGNATURE');"),
  });
  order('Chuẩn bị một đơn PENDING cho thao tác Send thủ công');
  quickRequest('Profile mock không gọi VNPAY thật khi thiếu cấu hình', 'POST', '/payments', {
    body: { orderId: '{{order_id}}', method: 'VNPAY' }, headers: paymentHeaders,
    before: newKey('payment_key'), expected: [503],
    after: expect('VNPAY_NOT_CONFIGURED', "pm.expect(data.code).to.eql('VNPAY_NOT_CONFIGURED');") +
      "pm.environment.unset('payment_key'); pm.environment.unset('order_key'); pm.environment.set('login_role', 'CUSTOMER');",
  });
}
