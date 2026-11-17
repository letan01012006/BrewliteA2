import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { sourceLoader, deferred, walk } from './load-source.mjs';

const text = node => node == null || typeof node === 'boolean' ? ''
  : typeof node !== 'object' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const staff = { id: 10, fullName: 'Nhân viên A', phone: '0912345678', email: 'staff@example.test', createdAt: '2026-11-15T02:00:00Z' };

function harness(api, mode = 'edit', row = staff) {
  let index = 0;
  const slots = [];
  const effects = [];
  const saved = [];
  let closed = 0;
  let auth = { token: 'manager-token', user: { id: 7, role: 'MANAGER' } };
  const useAuthStore = selector => selector(auth);
  useAuthStore.getState = () => auth;
  class ApiError extends Error {}
  const load = sourceLoader({
    react: {
      ...React,
      useState(initial) {
        const current = index++;
        if (!(current in slots)) slots[current] = initial;
        return [slots[current], value => { slots[current] = typeof value === 'function' ? value(slots[current]) : value; }];
      },
      useRef(initial) { return slots[index++] ??= { current: initial }; },
      useEffect(callback, deps) {
        const current = index++;
        if (slots[current]) return;
        slots[current] = { deps };
        effects.push(() => { slots[current].cleanup = callback(); });
      },
    },
    '@/store/auth-store': { useAuthStore },
    '@/lib/api/client': { apiFetch: api, ApiError },
  });
  const { StaffDialog } = load('src/components/manager/staff-dialog.tsx');
  const render = () => {
    index = 0;
    return StaffDialog({ staff: row, mode, managerId: 7, onClose: () => closed++, onSaved: message => saved.push(message) });
  };
  const find = predicate => walk(render(), predicate)[0];
  return {
    render, find, saved, ApiError,
    fill(name, value) { find(node => node.type === 'input' && node.props.name === name).props.onChange({ target: { value } }); },
    submit() { return find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); },
    mount() { render(); effects.splice(0).forEach(effect => effect()); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
    setAuth(value) { auth = { ...auth, ...value }; },
    closed: () => closed,
  };
}

test('staff editor prefills identifiers and saves normalized edits with the manager session', async () => {
  const calls = [];
  const h = harness(async (path, options) => { calls.push([path, options]); return staff; });
  assert.equal(h.find(node => node.props?.name === 'phone').props.value, staff.phone);
  h.fill('fullName', '  Nhân viên đã sửa  ');
  h.fill('phone', ' 0981234567 ');
  h.fill('email', ' EDITED@EXAMPLE.TEST ');
  await h.submit();
  assert.equal(calls[0][0], '/admin/staff/10');
  assert.equal(calls[0][1].method, 'PATCH');
  assert.equal(calls[0][1].token, 'manager-token');
  assert.deepEqual(JSON.parse(calls[0][1].body), { fullName: 'Nhân viên đã sửa', phone: '0981234567', email: 'edited@example.test' });
  assert.match(h.saved[0], /Đã cập nhật/);
});

test('staff editor supports legacy email-only accounts and rejects losing both identifiers or invalid fields', async () => {
  const calls = [];
  const h = harness(async (path, options) => { calls.push([path, options]); return staff; }, 'edit', { ...staff, phone: null });
  assert.equal(h.find(node => node.props?.name === 'phone').props.value, '');
  await h.submit();
  assert.equal(JSON.parse(calls[0][1].body).phone, null);
  h.fill('email', '');
  await h.submit();
  assert.match(text(h.render()), /ít nhất số điện thoại hoặc email/);
  h.fill('phone', '123');
  await h.submit();
  assert.match(text(h.render()), /10 chữ số/);
  h.fill('phone', '0981234567');
  h.fill('fullName', ' ');
  await h.submit();
  assert.match(text(h.render()), /2 đến 100/);
  assert.equal(calls.length, 1);
});

test('staff editor preserves inputs after a duplicate identifier error and supports retry', async () => {
  let fail = true;
  let h;
  h = harness(async () => { if (fail) throw new h.ApiError('Số điện thoại đã được sử dụng'); return staff; });
  h.fill('fullName', 'Tên mới');
  await h.submit();
  assert.match(text(h.find(node => node.props?.role === 'alert')), /đã được sử dụng/);
  assert.equal(h.find(node => node.props?.name === 'fullName').props.value, 'Tên mới');
  fail = false;
  await h.submit();
  assert.equal(h.saved.length, 1);
});

test('staff deletion requires an explicit confirmation and preserves history in the explanation', async () => {
  const calls = [];
  const h = harness(async (path, options) => { calls.push([path, options]); return { deleted: true }; }, 'delete');
  assert.match(text(h.render()), /Lịch sử đơn hàng và nhập kho vẫn được giữ lại/);
  assert.equal(calls.length, 0);
  h.find(node => node.type === 'button' && text(node) === 'Hủy').props.onClick();
  assert.equal(h.closed(), 1);
  assert.equal(calls.length, 0);
  await h.submit();
  assert.equal(calls[0][0], '/admin/staff/10');
  assert.equal(calls[0][1].method, 'DELETE');
  assert.equal(calls[0][1].body, undefined);
  assert.equal(calls[0][1].token, 'manager-token');
  assert.match(h.saved[0], /Đã xóa nhân viên/);
});

test('staff mutations prevent duplicate submits and closing while pending', async () => {
  for (const mode of ['edit', 'delete']) {
    const pending = deferred();
    let calls = 0;
    const h = harness(() => { calls++; return pending.promise; }, mode);
    const first = h.submit();
    await h.submit();
    h.render().props.onClose();
    assert.equal(calls, 1);
    assert.equal(h.closed(), 0);
    assert.equal(h.find(node => node.type === 'fieldset').props.disabled, true);
    pending.resolve(staff);
    await first;
    assert.equal(h.saved.length, 1);
  }
});

test('staff mutations ignore stale responses after account switches or unmounts', async () => {
  for (const mode of ['edit', 'delete']) for (const scenario of ['account', 'unmount']) {
    const pending = deferred();
    let signal;
    const h = harness((_, options) => { signal = options.signal; return pending.promise; }, mode);
    h.mount();
    const saving = h.submit();
    if (scenario === 'account') h.setAuth({ token: 'other-token', user: { id: 8, role: 'MANAGER' } });
    else h.unmount();
    pending.resolve(staff);
    await saving;
    assert.equal(h.saved.length, 0);
    if (scenario === 'unmount') assert.equal(signal.aborted, true);
  }
});

test('staff mutations do not submit with a missing or non-manager session', async () => {
  for (const user of [null, { id: 7, role: 'BARISTA' }, { id: 8, role: 'MANAGER' }]) {
    let calls = 0;
    const h = harness(async () => { calls++; return staff; });
    h.setAuth({ user });
    await h.submit();
    assert.equal(calls, 0);
  }
});
