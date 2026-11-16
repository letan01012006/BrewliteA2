import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { OtpService } from '../src/auth/otp.service.js';
import { databaseFixture, type DatabaseFixture } from './database-fixture.js';

describe('Manager staff editing and removal', () => {
  let f: DatabaseFixture;
  let manager: Awaited<ReturnType<DatabaseFixture['user']>>;
  let sequence = 0;
  const password = 'StaffCrud@123';
  const nextPhone = () => `096${String(++sequence).padStart(7, '0')}`;
  const update = (id: number, body: object) => f.api('patch', `/admin/staff/${id}`, manager.token).send(body);
  const remove = (id: number) => f.api('delete', `/admin/staff/${id}`, manager.token);
  async function create() {
    return (await f.api('post', '/admin/staff', manager.token).send({
      fullName: 'Nhân viên mới', phone: nextPhone(), email: `${randomUUID()}@staff.test`, password,
    }).expect(201)).body as { id: number; phone: string; email: string };
  }

  beforeAll(async () => {
    f = await databaseFixture();
    manager = await f.user('MANAGER');
  }, 35000);
  afterAll(async () => { await f?.close(); });

  it('requires the current database MANAGER role for both edit and delete', async () => {
    const staff = await create();
    const forged = f.app.get(JwtService).sign({ sub: f.customer.id, role: 'MANAGER' });
    for (const method of ['patch', 'delete'] as const) {
      for (const [token, status] of [[undefined, 401], [f.customer.token, 403], [f.barista.token, 403], [forged, 403]] as const) {
        const call = f.api(method, `/admin/staff/${staff.id}`, token);
        if (method === 'patch') call.send({ fullName: 'Unauthorized' });
        await call.expect(status);
      }
    }
    expect(await f.db.user.findUniqueOrThrow({ where: { id: staff.id } })).toMatchObject({ fullName: 'Nhân viên mới', deletedAt: null });
  });

  it('edits identifiers without exposing secrets or sending OTP; new phone and email both sign in', async () => {
    const staff = await create();
    const before = await f.db.user.findUniqueOrThrow({ where: { id: staff.id } });
    const phone = nextPhone();
    const email = 'edited@staff.test';
    const send = vi.spyOn(f.app.get(OtpService), 'send');
    try {
      const changed = await update(staff.id, { fullName: '  Nhân viên đã sửa  ', phone: ` ${phone} `, email: ` ${email.toUpperCase()} ` }).expect(200);
      expect(changed.body).toMatchObject({ id: staff.id, fullName: 'Nhân viên đã sửa', phone, email, role: 'BARISTA' });
      expect(Object.keys(changed.body).sort()).toEqual(['createdAt', 'email', 'fullName', 'id', 'phone', 'role']);
      expect(send).not.toHaveBeenCalled();
      const after = await f.db.user.findUniqueOrThrow({ where: { id: staff.id } });
      expect(after.passwordHash).toBe(before.passwordHash);
      expect(after.isPhoneVerified).toBe(true);
      for (const identifier of [{ phone }, { email }]) {
        const session = await f.api('post', '/auth/login').send({ ...identifier, password }).expect(200);
        expect(session.body.user.id).toBe(staff.id);
      }
      await f.api('post', '/auth/login').send({ phone: staff.phone, password }).expect(401);
    } finally { send.mockRestore(); }
  });

  it('supports legacy email-only staff and never clears the final login identifier', async () => {
    const staff = await create();
    await update(staff.id, { phone: null }).expect(200);
    await update(staff.id, { fullName: 'Email only' }).expect(200);
    const refused = await update(staff.id, { email: null }).expect(400);
    expect(refused.body.code).toBe('STAFF_IDENTIFIER_REQUIRED');
    await f.api('post', '/auth/login').send({ email: staff.email, password }).expect(200);
    await update(staff.id, { phone: nextPhone(), email: '' }).expect(200);
    expect((await f.db.user.findUniqueOrThrow({ where: { id: staff.id } })).email).toBeNull();
  });

  it('returns field conflicts and rolls back every edit in the request', async () => {
    const staff = await create();
    const other = await create();
    for (const [body, code] of [[{ phone: other.phone }, 'PHONE_ALREADY_EXISTS'], [{ email: other.email }, 'EMAIL_ALREADY_EXISTS']] as const) {
      const rejected = await update(staff.id, { ...body, fullName: 'Must roll back' }).expect(409);
      expect(rejected.body.code).toBe(code);
      expect((await f.db.user.findUniqueOrThrow({ where: { id: staff.id } })).fullName).toBe('Nhân viên mới');
    }
  });

  it.each([{ fullName: null }, { fullName: ' ' }, { fullName: 'a'.repeat(101) }, { phone: '123' }, { email: 'invalid' }, { role: 'MANAGER' }, { password: 'Other@123' }, { deletedAt: new Date().toISOString() }])('rejects invalid and security-sensitive fields: %j', async body => {
    await update(f.barista.id, body).expect(400);
  });

  it('cannot edit or remove a manager, customer or missing account', async () => {
    for (const id of [manager.id, f.customer.id, 2147483647]) {
      await update(id, { fullName: 'Not staff' }).expect(404);
      await remove(id).expect(404);
    }
    await f.api('patch', '/admin/staff/invalid', manager.token).send({ fullName: 'Name' }).expect(400);
    await f.api('delete', '/admin/staff/invalid', manager.token).expect(400);
    await f.api('get', '/auth/me', manager.token).expect(200);
  });

  it('removes staff from the roster and revokes login and existing JWTs while retaining history', async () => {
    const staff = await create();
    const session = await f.api('post', '/auth/login').send({ phone: staff.phone, password }).expect(200);
    const order = await f.db.order.create({ data: { userId: staff.id, status: 'COMPLETED', subtotal: 10000, total: 10000 } });
    const ingredient = await f.db.ingredient.create({ data: { name: 'Test history', code: randomUUID(), unit: 'GRAM' } });
    const movement = await f.db.inventoryMovement.create({ data: {
      eventKey: randomUUID(), kind: 'RECEIPT', ingredientId: ingredient.id,
      unit: 'GRAM', stockDelta: 10, reservedDelta: 0, actorId: staff.id,
    } });
    const count = await f.db.user.count({ where: { role: 'BARISTA', deletedAt: null } });
    await remove(staff.id).expect(200);
    const deleted = await f.db.user.findUniqueOrThrow({ where: { id: staff.id } });
    expect(deleted.deletedAt).toBeInstanceOf(Date);
    expect(deleted.fullName).toBe('Nhân viên mới');
    expect(await f.db.order.findUnique({ where: { id: order.id } })).toMatchObject({ userId: staff.id, status: 'COMPLETED' });
    expect(await f.db.inventoryMovement.findUnique({ where: { id: movement.id } })).toMatchObject({ actorId: staff.id });
    const roster = await f.api('get', '/admin/staff?limit=50', manager.token).expect(200);
    expect(roster.body.meta.total).toBe(count - 1);
    expect(roster.body.data.some((row: { id: number }) => row.id === staff.id)).toBe(false);
    for (const identifier of [{ phone: staff.phone }, { email: staff.email }])
      await f.api('post', '/auth/login').send({ ...identifier, password }).expect(401);
    await f.api('get', '/auth/me', session.body.accessToken).expect(401);
    await f.api('get', '/inventory/stock', session.body.accessToken).expect(401);
    await update(staff.id, { fullName: 'Resurrected' }).expect(404);
    await remove(staff.id).expect(404);
  });

  it('serializes competing edits so phone and email cannot both be lost', async () => {
    const staff = await create();
    const results = await Promise.all([update(staff.id, { phone: null }), update(staff.id, { email: null })]);
    expect(results.map(result => result.status).sort((a, b) => a - b)).toEqual([200, 400]);
    const saved = await f.db.user.findUniqueOrThrow({ where: { id: staff.id } });
    expect(Boolean(saved.phone || saved.email)).toBe(true);
  });
});
