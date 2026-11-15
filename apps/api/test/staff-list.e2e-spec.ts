import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { OtpService } from '../src/auth/otp.service.js';
import { databaseFixture, type DatabaseFixture } from './database-fixture.js';

describe('Manager staff list: permissions, pagination and private fields', () => {
  let f: DatabaseFixture;
  let manager: Awaited<ReturnType<DatabaseFixture['user']>>;
  const ids: number[] = [];

  beforeAll(async () => {
    f = await databaseFixture();
    manager = await f.user('MANAGER');
    await f.db.user.update({
      where: { id: f.barista.id },
      data: { createdAt: new Date('2024-01-01T00:00:00Z') },
    });
    for (let i = 0; i < 3; i++) {
      const row = await f.db.user.create({
        data: {
          fullName: `Nhân viên ${i}`,
          email: `staff-${i}@brewlite.test`,
          role: 'BARISTA',
          passwordHash: 'private-password-hash',
          otpHash: 'private-otp-hash',
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
      });
      ids.push(row.id);
    }
  }, 35000);

  afterAll(async () => {
    await f?.close();
  });

  it('allows only MANAGER; forged manager claims cannot expose the roster', async () => {
    await f.api('get', '/admin/staff').expect(401);
    await f.api('get', '/admin/staff', f.barista.token).expect(403);
    await f.api('get', '/admin/staff', f.customer.token).expect(403);
    const forged = f.app
      .get(JwtService)
      .sign({ sub: f.customer.id, email: f.customer.email, role: 'MANAGER' });
    await f.api('get', '/admin/staff', forged).expect(403);
    const document = (await f.api('get', '/docs-json').expect(200)).body;
    expect(document.paths['/api/admin/staff'].get.security).toEqual([
      { bearer: [] },
    ]);
  });

  it('lists only BARISTA newest-first with stable pagination and no credentials or OTP data', async () => {
    const first = await f
      .api('get', '/admin/staff?page=1&limit=2', manager.token)
      .expect(200);
    const second = await f
      .api('get', '/admin/staff?page=2&limit=2', manager.token)
      .expect(200);
    expect(first.body.meta).toEqual({
      page: 1,
      limit: 2,
      total: 4,
      totalPages: 2,
    });
    expect(second.body.meta).toEqual({
      page: 2,
      limit: 2,
      total: 4,
      totalPages: 2,
    });
    const rows = [...first.body.data, ...second.body.data];
    expect(rows.map((row: { id: number }) => row.id)).toEqual(
      [...ids].reverse().concat(f.barista.id),
    );
    for (const row of rows) {
      expect(row.role).toBe('BARISTA');
      expect(Object.keys(row).sort()).toEqual([
        'createdAt',
        'email',
        'fullName',
        'id',
        'phone',
        'role',
      ]);
    }
    expect(first.body.data[0].phone).toBeNull();
    const empty = await f
      .api('get', '/admin/staff?page=100&limit=2', manager.token)
      .expect(200);
    expect(empty.body.data).toEqual([]);
    expect(empty.body.meta.total).toBe(4);
  });

  it.each([
    { page: 0 },
    { page: -1 },
    { page: 1.5 },
    { page: 'abc' },
    { page: 1000001 },
    { limit: 0 },
    { limit: 51 },
    { limit: 1.5 },
    { role: 'CUSTOMER' },
  ])('rejects invalid pagination or role overrides: %j', async (query) => {
    await f.api('get', '/admin/staff', manager.token).query(query).expect(400);
  });

  it('puts newly created staff first, sends no OTP and allows immediate phone login', async () => {
    const send = vi.spyOn(f.app.get(OtpService), 'send');
    try {
      const created = await f
        .api('post', '/admin/staff', manager.token)
        .send({
          fullName: 'Nhân viên vừa cấp',
          phone: '0980000001',
          password: 'StaffList@123',
        })
        .expect(201);
      expect(created.body.isPhoneVerified).toBe(true);
      expect(send).not.toHaveBeenCalled();
      const listed = await f
        .api('get', '/admin/staff', manager.token)
        .expect(200);
      expect(listed.body.data[0].id).toBe(created.body.id);
      expect(listed.body.meta).toMatchObject({ total: 5, page: 1, limit: 10 });
      const login = await f
        .api('post', '/auth/login')
        .send({ phone: '0980000001', password: 'StaffList@123' })
        .expect(200);
      expect(login.body.user.role).toBe('BARISTA');
    } finally {
      send.mockRestore();
    }
  });
});
