import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceLoader, walk } from "./load-source.mjs";

const user = {
  id: 12,
  fullName: "Khách BrewLite",
  phone: "0911111111",
  email: "member@brewlite.test",
  role: "CUSTOMER",
  loyaltyPoints: 1000,
};

function fixture(mode, response) {
  const states = [
    mode === "email" ? " member@brewlite.test " : " 0911111111 ",
    mode,
    "Password@123",
  ];
  const paths = [];
  const sessions = [];
  const requests = [];
  let index = 0;
  const load = sourceLoader(
    {
      react: {
        Suspense: "suspense",
        useState(initial) {
          const position = index++;
          if (!(position in states))
            states[position] =
              typeof initial === "function" ? initial() : initial;
          return [
            states[position],
            (value) => {
              states[position] =
                typeof value === "function" ? value(states[position]) : value;
            },
          ];
        },
      },
      "next/navigation": {
        useRouter: () => ({ push: (path) => paths.push(path) }),
        useSearchParams: () =>
          new URLSearchParams("redirect=%2Fmenu%3FopenProduct%3D5"),
      },
      "@/store/auth-store": {
        useAuthStore: (selector) =>
          selector({ setAuth: (...args) => sessions.push(args) }),
      },
      "@/lib/auth-session": { accessToken: () => null, unauthorized() {} },
    },
    {
      fetch: async (url, options) => {
        requests.push({
          url,
          body: JSON.parse(options.body),
          headers: options.headers,
        });
        return new Response(JSON.stringify(response.body), {
          status: response.status,
        });
      },
    },
  );
  const LoginPage = load("src/app/(auth)/login/page.tsx").default;
  const render = () => {
    index = 0;
    return LoginPage().props.children.type();
  };
  const submit = () =>
    walk(render(), (node) => node.type === "form")[0].props.onSubmit({
      preventDefault() {},
    });
  return { render, submit, paths, sessions, requests };
}

for (const mode of ["phone", "email"]) {
  test(`${mode} sign-in sends the chosen identifier and preserves the requested destination`, async () => {
    const state = fixture(mode, {
      status: 200,
      body: { user, accessToken: "signed-in-token" },
    });
    await state.submit();
    assert.deepEqual(state.requests[0].body, {
      [mode]: mode === "phone" ? user.phone : user.email,
      password: "Password@123",
    });
    assert.equal(state.requests[0].url, "/api/auth/login");
    assert.equal(state.requests[0].headers.Authorization, undefined);
    assert.equal(state.sessions.length, 1);
    assert.equal(state.sessions[0][0].id, user.id);
    assert.equal(state.sessions[0][1], "signed-in-token");
    assert.deepEqual(state.paths, ["/menu?openProduct=5"]);
  });

  test(`pending ${mode} sign-in opens phone verification without creating a session`, async () => {
    const state = fixture(mode, {
      status: 403,
      body: {
        code: "PHONE_NOT_VERIFIED",
        message: "Cần xác thực OTP",
        details: { phone: user.phone },
      },
    });
    await state.submit();
    assert.equal(state.sessions.length, 0);
    const destination = new URL(state.paths[0], "http://localhost");
    assert.equal(destination.pathname, "/verify-otp");
    assert.equal(destination.searchParams.get("phone"), user.phone);
    assert.equal(
      destination.searchParams.get("redirect"),
      "/menu?openProduct=5",
    );
  });
}

test("wrong email password displays the error and does not navigate or create a session", async () => {
  const state = fixture("email", {
    status: 401,
    body: {
      code: "INVALID_CREDENTIALS",
      message: "Thông tin đăng nhập không chính xác.",
    },
  });
  await state.submit();
  assert.deepEqual(state.paths, []);
  assert.deepEqual(state.sessions, []);
  const alert = walk(state.render(), (node) => node.props?.role === "alert")[0];
  assert.ok(
    walk(
      alert,
      (node) => node.props?.children === "Thông tin đăng nhập không chính xác.",
    ).length,
  );
});

test("the Email tab selects a normal email field and clears the phone input", () => {
  const state = fixture("phone", { status: 200, body: {} });
  const emailTab = walk(
    state.render(),
    (node) => node.type === "button" && node.props.children === "Email",
  )[0];
  assert.ok(emailTab);
  emailTab.props.onClick();
  const emailInput = walk(
    state.render(),
    (node) => node.type === "input" && node.props.name === "email",
  )[0];
  assert.equal(emailInput.props.type, "email");
  assert.equal(emailInput.props.value, "");
  assert.equal(emailInput.props.inputMode, "email");
});
