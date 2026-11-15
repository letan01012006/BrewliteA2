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

function harness(role = "MANAGER", api = async () => ({})) {
  let index = 0;
  const slots = [];
  const effects = [];
  const redirects = [];
  let auth = {
    user: {
      id: 7,
      role,
      fullName: "Quản lý",
      phone: "0900000001",
      email: null,
    },
    token: "manager-token",
    isLoading: false,
    initAuth() {},
    refreshUser() {},
  };
  const useAuthStore = (selector) => (selector ? selector(auth) : auth);
  useAuthStore.getState = () => auth;
  class ApiError extends Error {}
  const load = sourceLoader({
    react: {
      ...React,
      useState(initial) {
        const current = index++;
        if (!(current in slots))
          slots[current] = typeof initial === "function" ? initial() : initial;
        return [
          slots[current],
          (value) => {
            slots[current] =
              typeof value === "function" ? value(slots[current]) : value;
          },
        ];
      },
      useRef(initial) {
        return (slots[index++] ??= { current: initial });
      },
      useEffect(callback) {
        effects.push(callback);
      },
      useCallback(callback) {
        return callback;
      },
      useMemo(callback) {
        return callback();
      },
      useId() {
        return "staff-test";
      },
    },
    "next/link": "a",
    "next/navigation": {
      useRouter: () => ({ replace: (path) => redirects.push(path) }),
    },
    "@/store/auth-store": { useAuthStore },
    "@/lib/api/client": { apiFetch: api, ApiError },
  });
  function page(path) {
    index = 0;
    return load(path).default();
  }
  function content(path) {
    const element = page(path);
    const child = element.props.children ?? element;
    return () => {
      index = 0;
      return child.type(child.props);
    };
  }
  return {
    load,
    page,
    content,
    effects,
    redirects,
    ApiError,
    setAuth(value) {
      auth = { ...auth, ...value };
    },
    getAuth: () => auth,
  };
}

function managerForm(api) {
  const h = harness("MANAGER", api);
  const render = h.content("src/app/manager/page.tsx");
  const find = (predicate) => walk(render(), predicate)[0];
  const fill = (name, value) =>
    find(
      (node) => node.type === "input" && node.props.name === name,
    ).props.onChange({ target: { value } });
  const submit = () =>
    find((node) => node.type === "form").props.onSubmit({
      preventDefault() {},
    });
  const valid = () => {
    fill("fullName", "  Nhân viên mới  ");
    fill("phone", "0912345678");
    fill("password", "Staff@123");
  };
  return { ...h, render, find, fill, submit, valid };
}

test("manager creates a verified staff account through the existing API, trims identifiers and clears the password", async () => {
  const calls = [];
  const h = managerForm(async (path, options) => {
    calls.push([path, options]);
    return {
      id: 8,
      role: "BARISTA",
      fullName: "Nhân viên mới",
      phone: "0912345678",
    };
  });
  h.valid();
  h.fill("email", "  STAFF@EXAMPLE.TEST  ");
  await h.submit();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/admin/staff");
  assert.equal(calls[0][1].token, "manager-token");
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    fullName: "Nhân viên mới",
    phone: "0912345678",
    password: "Staff@123",
    email: "staff@example.test",
  });
  for (const name of ["fullName", "phone", "email", "password"]) {
    assert.equal(
      h.find((node) => node.type === "input" && node.props.name === name).props
        .value,
      "",
    );
  }
  assert.match(
    text(h.find((node) => node.props?.role === "status")),
    /Nhân viên mới/,
  );
  assert.equal(text(h.render()).includes("Staff@123"), false);
  // Remounting the list after creation reloads page 1, where the new account sorts first.
  assert.equal(walk(h.render(), (node) => node.props?.managerId === 7)[0].key, "1");
});

test("staff creation omits optional email and prevents duplicate submissions while the first is pending", async () => {
  const response = deferred();
  const calls = [];
  const h = managerForm((path, options) => {
    calls.push([path, options]);
    return response.promise;
  });
  h.valid();
  const first = h.submit();
  await h.submit();
  assert.equal(calls.length, 1);
  assert.equal("email" in JSON.parse(calls[0][1].body), false);
  assert.equal(h.find((node) => node.type === "fieldset").props.disabled, true);
  response.resolve({ fullName: "Nhân viên mới", phone: "0912345678" });
  await first;
  assert.equal(
    h.find((node) => node.type === "fieldset").props.disabled,
    false,
  );
});

test("staff creation preserves the draft after a conflict and can retry with a corrected phone", async () => {
  let fail = true;
  let h;
  h = managerForm(async () => {
    if (fail) throw new h.ApiError("Số điện thoại đã được sử dụng");
    return { fullName: "Nhân viên mới", phone: "0912345679" };
  });
  h.valid();
  await h.submit();
  assert.match(
    text(h.find((node) => node.props?.role === "alert")),
    /đã được sử dụng/,
  );
  assert.equal(
    h.find((node) => node.props?.name === "fullName").props.value,
    "  Nhân viên mới  ",
  );
  fail = false;
  h.fill("phone", "0912345679");
  await h.submit();
  assert.equal(
    walk(h.render(), (node) => node.props?.role === "alert").length,
    0,
  );
  assert.match(
    text(h.find((node) => node.props?.role === "status")),
    /0912345679/,
  );
});

test("staff form rejects invalid names, phone numbers and passwords before posting", async () => {
  let count = 0;
  const h = managerForm(async () => {
    count++;
  });
  for (const [name, value] of [
    ["fullName", "  "],
    ["fullName", "a".repeat(101)],
    ["phone", "12345"],
    ["password", "short"],
    ["password", "lettersOnly"],
  ]) {
    h.valid();
    h.fill(name, value);
    await h.submit();
    assert.ok(h.find((node) => node.props?.role === "alert"));
  }
  assert.equal(count, 0);
});

test("a late staff creation response cannot populate a different account and a demoted manager cannot submit", async () => {
  const response = deferred();
  let calls = 0;
  const h = managerForm(() => {
    calls++;
    return response.promise;
  });
  h.valid();
  const first = h.submit();
  h.setAuth({ token: "other-token", user: { id: 9, role: "MANAGER" } });
  response.resolve({ fullName: "Stale result", phone: "0912345678" });
  await first;
  assert.equal(
    walk(h.render(), (node) => node.props?.role === "status").length,
    0,
  );
  h.setAuth({ token: "manager-token", user: { id: 7, role: "BARISTA" } });
  await h.submit();
  assert.equal(calls, 1);
});

test("manager page rejects staff/customers and links managers to both existing operational pages", () => {
  for (const [role, redirect] of [
    ["BARISTA", "/barista"],
    ["CUSTOMER", "/"],
  ]) {
    const h = harness(role);
    assert.equal(h.page("src/app/manager/page.tsx"), null);
    h.effects.splice(0).forEach((callback) => callback());
    assert.equal(h.redirects.at(-1), redirect);
  }
  const h = managerForm(async () => ({}));
  const links = walk(h.render(), (node) => node.type === "a").map(
    (node) => node.props.href,
  );
  assert.deepEqual(links, ["/barista", "/barista/inventory"]);
});

test("operational page guard allows both staff and managers while keeping customers out", () => {
  for (const role of ["BARISTA", "MANAGER", "CUSTOMER"]) {
    const h = harness(role);
    const { AuthGate } = h.load("src/components/auth/auth-gate.tsx");
    const child = { private: true };
    assert.equal(
      AuthGate({ children: child, path: "/barista/inventory", barista: true }),
      role === "CUSTOMER" ? null : child,
    );
    h.effects.splice(0).forEach((callback) => callback());
    assert.deepEqual(h.redirects, role === "CUSTOMER" ? ["/"] : []);
  }
});

test("inventory shows product status controls only to managers, blocks the staff handler and reacts to a role change", async () => {
  for (const role of ["BARISTA", "MANAGER"]) {
    let product = {
      id: 10,
      name: "Cà phê",
      category: "Cà phê",
      price: 10000,
      isActive: true,
      availability: [],
    };
    const mutations = [];
    const h = harness(role, async (path, options) => {
      if (path === "/products/10/status") {
        mutations.push(JSON.parse(options.body));
        product = { ...product, ...JSON.parse(options.body) };
        return product;
      }
      if (path.startsWith("/products?"))
        return { data: [product], meta: { page: 1, totalPages: 1 } };
      return [];
    });
    const render = h.content("src/app/barista/inventory/page.tsx");
    render();
    h.effects.splice(0).forEach((callback) => callback());
    await new Promise(setImmediate);
    const card = () =>
      walk(
        render(),
        (node) => node.props?.product?.id === 10 && node.props.onToggleStatus,
      )[0];
    const initial = card();
    assert.ok(initial);
    const controls = walk(
      initial.type(initial.props),
      (node) => node.type === "button" && text(node) === "Tạm dừng",
    );
    assert.equal(controls.length, role === "MANAGER" ? 1 : 0);
    initial.props.onToggleStatus();
    await new Promise(setImmediate);
    assert.equal(mutations.length, role === "MANAGER" ? 1 : 0);
    if (role === "MANAGER") {
      assert.equal(card().props.product.isActive, false);
      h.setAuth({ user: { ...h.getAuth().user, role: "BARISTA" } });
      assert.equal(card().props.canManageStatus, false);
    }
  }
});
