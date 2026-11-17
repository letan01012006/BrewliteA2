import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { sourceLoader, deferred, walk } from "./load-source.mjs";

const text = (node) =>
  node == null || typeof node === "boolean"
    ? ""
    : typeof node !== "object"
      ? String(node)
      : Array.isArray(node)
        ? node.map(text).join("")
        : text(node.props?.children);
const row = {
  id: 10,
  fullName: "Nhân viên A",
  phone: "0912345678",
  email: "staff@example.test",
  createdAt: "2026-11-15T02:00:00Z",
};
const response = (rows = [row], page = 1, total = rows.length) => ({
  data: rows,
  meta: {
    page,
    limit: 10,
    total,
    totalPages: Math.max(1, Math.ceil(total / 10)),
  },
});

function harness(api) {
  let index = 0;
  const slots = [];
  const effects = [];
  let auth = { token: "manager-token", user: { id: 7, role: "MANAGER" } };
  const useAuthStore = (selector) => selector(auth);
  useAuthStore.getState = () => auth;
  class ApiError extends Error {}
  const load = sourceLoader({
    react: {
      ...React,
      useState(initial) {
        const current = index++;
        if (!(current in slots)) slots[current] = initial;
        return [
          slots[current],
          (value) => {
            slots[current] =
              typeof value === "function" ? value(slots[current]) : value;
          },
        ];
      },
      useEffect(callback, deps) {
        const current = index++;
        const prior = slots[current];
        if (prior && deps.every((value, i) => value === prior.deps[i])) return;
        slots[current] = { deps };
        effects.push(() => {
          prior?.cleanup?.();
          slots[current].cleanup = callback();
        });
      },
    },
    "@/store/auth-store": { useAuthStore },
    "@/lib/api/client": { apiFetch: api, ApiError },
  });
  const { StaffList } = load("src/components/manager/staff-list.tsx");
  const render = () => {
    index = 0;
    return StaffList({ managerId: 7 });
  };
  const find = (predicate) => walk(render(), predicate)[0];
  const settle = async () => {
    effects.splice(0).forEach((effect) => effect());
    await new Promise(setImmediate);
  };
  return {
    render,
    find,
    settle,
    ApiError,
    setAuth(value) {
      auth = { ...auth, ...value };
    },
    close() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}

test("staff list loads a bounded first page and displays employee identifiers, dates and count", async () => {
  const calls = [];
  const h = harness(async (path, options) => {
    calls.push([path, options]);
    return response();
  });
  assert.match(text(h.render()), /Đang tải danh sách/);
  await h.settle();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/admin/staff?page=1&limit=10");
  assert.equal(calls[0][1].token, "manager-token");
  const content = text(h.render());
  for (const value of [
    "Danh sách nhân viên",
    "Nhân viên A",
    row.phone,
    row.email,
    "15/11/2026",
    "1 nhân viên",
  ])
    assert.ok(content.includes(value));
  assert.equal(
    walk(h.render(), (node) => node.props?.role === "status").length,
    0,
  );
});

test("staff list paginates without mixing pages and refreshes the current page", async () => {
  const calls = [];
  const h = harness(async (path) => {
    calls.push(path);
    const page = path.includes("page=2") ? 2 : 1;
    return response(
      [{ ...row, id: page, fullName: `Nhân viên trang ${page}` }],
      page,
      12,
    );
  });
  h.render();
  await h.settle();
  const pagination = h.find((node) => node.props?.totalPages === 2);
  pagination.props.onChange(2);
  assert.match(text(h.render()), /Đang tải danh sách/);
  assert.equal(text(h.render()).includes("Nhân viên trang 1"), false);
  await h.settle();
  assert.match(text(h.render()), /Nhân viên trang 2/);
  h.find(
    (node) => node.type === "button" && text(node) === "Làm mới",
  ).props.onClick();
  h.render();
  await h.settle();
  assert.deepEqual(calls, [
    "/admin/staff?page=1&limit=10",
    "/admin/staff?page=2&limit=10",
    "/admin/staff?page=2&limit=10",
  ]);
});

test("staff list handles empty rosters and legacy staff without phone/email", async () => {
  let empty = true;
  const h = harness(async () =>
    empty ? response([]) : response([{ ...row, phone: null, email: null }]),
  );
  h.render();
  await h.settle();
  assert.match(text(h.render()), /Chưa có nhân viên nào/);
  empty = false;
  h.find(
    (node) => node.type === "button" && text(node) === "Làm mới",
  ).props.onClick();
  h.render();
  await h.settle();
  assert.match(text(h.render()), /Chưa có SĐT/);
  assert.match(text(h.render()), /Chưa có email/);
});

test("staff list shows a failed request and recovers using the retry button", async () => {
  let fail = true;
  let h;
  h = harness(async () => {
    if (fail) throw new h.ApiError("Mất kết nối");
    return response();
  });
  h.render();
  await h.settle();
  assert.match(
    text(h.find((node) => node.props?.role === "alert")),
    /Mất kết nối/,
  );
  fail = false;
  h.find(
    (node) => node.type === "button" && text(node) === "Thử lại",
  ).props.onClick();
  h.render();
  await h.settle();
  assert.equal(
    walk(h.render(), (node) => node.props?.role === "alert").length,
    0,
  );
  assert.match(text(h.render()), /Nhân viên A/);
});

test("staff list rejects late data after an account change or unmount and aborts obsolete page requests", async () => {
  for (const scenario of ["account", "unmount"]) {
    const pending = deferred();
    let signal;
    const h = harness((_, options) => {
      signal = options.signal;
      return pending.promise;
    });
    h.render();
    await h.settle();
    if (scenario === "account")
      h.setAuth({ token: "other-token", user: { id: 8, role: "MANAGER" } });
    else h.close();
    pending.resolve(response());
    await new Promise(setImmediate);
    assert.equal(text(h.render()).includes("Nhân viên A"), false);
    if (scenario === "unmount") assert.equal(signal.aborted, true);
  }
  const signals = [];
  const h = harness(async (_, options) => {
    signals.push(options.signal);
    return response([row], 1, 12);
  });
  h.render();
  await h.settle();
  h.find((node) => node.props?.totalPages === 2).props.onChange(2);
  h.render();
  await h.settle();
  assert.equal(signals[0].aborted, true);
  assert.equal(signals[1].aborted, false);
});

test("staff list opens edit/delete dialogs and reloads saved changes", async () => {
  let changed = false;
  const h = harness(async () => response([{ ...row, fullName: changed ? 'Tên mới' : row.fullName }]));
  h.render();
  await h.settle();
  h.find(node => node.props?.['aria-label'] === `Sửa nhân viên ${row.fullName}`).props.onClick();
  const dialog = h.find(node => node.props?.mode === 'edit');
  assert.equal(dialog.props.staff.id, row.id);
  changed = true;
  dialog.props.onSaved('Đã cập nhật thông tin.');
  h.render();
  await h.settle();
  assert.match(text(h.render()), /Tên mới/);
  assert.match(text(h.render()), /Đã cập nhật thông tin/);
  h.find(node => node.props?.['aria-label'] === 'Xóa nhân viên Tên mới').props.onClick();
  const deletion = h.find(node => node.props?.mode === 'delete');
  deletion.props.onClose();
  assert.equal(h.find(node => node.props?.mode === 'delete'), undefined);
});

test("deleting the last staff member on a page returns to the preceding page", async () => {
  const calls = [];
  let removed = false;
  const h = harness(async path => {
    calls.push(path);
    return response([row], path.includes('page=2') ? 2 : 1, removed ? 10 : 11);
  });
  h.render();
  await h.settle();
  h.find(node => node.props?.totalPages === 2).props.onChange(2);
  h.render();
  await h.settle();
  h.find(node => node.props?.['aria-label'] === `Xóa nhân viên ${row.fullName}`).props.onClick();
  removed = true;
  h.find(node => node.props?.mode === 'delete').props.onSaved('Đã xóa nhân viên.');
  h.render();
  await h.settle();
  assert.equal(calls.at(-1), '/admin/staff?page=1&limit=10');
  assert.match(text(h.render()), /10 nhân viên/);
});
