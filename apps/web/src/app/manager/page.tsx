"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { LogoutButton } from "@/components/auth/logout-button";
import { StaffList } from "@/components/manager/staff-list";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { User } from "@/types";

export default function ManagerPage() {
  const { user, token, isLoading, initAuth, refreshUser, error } =
    useAuthStore();
  const router = useRouter();
  useEffect(() => {
    void initAuth();
  }, [initAuth]);
  useEffect(() => {
    if (!isLoading && !token) router.replace("/login");
    if (!isLoading && user && user.role !== "MANAGER")
      router.replace(user.role === "BARISTA" ? "/barista" : "/");
  }, [isLoading, token, user, router]);
  if (isLoading || !token)
    return <p className="p-8">Đang kiểm tra đăng nhập...</p>;
  if (!user)
    return (
      <div className="p-8">
        <p>{error}</p>
        <button onClick={() => void refreshUser()}>Thử lại</button>
      </div>
    );
  if (user.role !== "MANAGER") return null;
  return <ManagerContent key={user.id} user={user} />;
}

const inputClass =
  "w-full rounded-xl border border-cafe-line bg-cafe-surface px-3.5 py-3 text-sm text-cafe-ink focus:outline-none focus:ring-2 focus:ring-cafe-primary disabled:opacity-60";

function ManagerContent({ user }: { user: User }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<User | null>(null);
  const [staffRevision, setStaffRevision] = useState(0);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError(null);
    setCreated(null);
    const name = fullName.trim();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (name.length < 2 || name.length > 100) {
      setError("Họ tên cần từ 2 đến 100 ký tự.");
      return;
    }
    if (!/^0[0-9]{9}$/.test(normalizedPhone)) {
      setError("Số điện thoại gồm 10 chữ số bắt đầu bằng 0.");
      return;
    }
    if (
      password.length < 8 ||
      password.length > 64 ||
      !/^(?=.*[A-Za-z])(?=.*\d).+$/.test(password)
    ) {
      setError(
        "Mật khẩu cần 8–64 ký tự, có ít nhất một chữ cái và một chữ số.",
      );
      return;
    }
    const session = useAuthStore.getState();
    if (
      !session.token ||
      session.user?.id !== user.id ||
      session.user.role !== "MANAGER"
    )
      return;
    const controller = new AbortController();
    pending.current = controller;
    setSaving(true);
    const currentSession = () =>
      !controller.signal.aborted &&
      useAuthStore.getState().token === session.token &&
      useAuthStore.getState().user?.id === user.id &&
      useAuthStore.getState().user?.role === "MANAGER";
    try {
      const staff = await apiFetch<User>("/admin/staff", {
        method: "POST",
        token: session.token,
        signal: controller.signal,
        body: JSON.stringify({
          fullName: name,
          phone: normalizedPhone,
          password,
          ...(normalizedEmail ? { email: normalizedEmail } : {}),
        }),
      });
      if (!currentSession()) return;
      setCreated(staff);
      setStaffRevision((value) => value + 1);
      setFullName("");
      setPhone("");
      setEmail("");
      setPassword("");
    } catch (cause) {
      if (currentSession())
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Chưa tạo được tài khoản. Vui lòng thử lại.",
        );
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-cafe-page px-4 py-6 text-cafe-ink sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-cafe-primary">
              BrewLite · Quản lý
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Quản lý nhân viên
            </h1>
            <p className="mt-2 text-sm text-cafe-muted">
              Xin chào {user.fullName}.
            </p>
          </div>
          <LogoutButton />
        </header>

        <nav
          aria-label="Nghiệp vụ quản lý"
          className="grid gap-3 sm:grid-cols-2"
        >
          <Link
            href="/barista"
            className="rounded-2xl border border-cafe-line bg-cafe-surface p-5 shadow-cafe-card transition-colors hover:border-cafe-primary"
          >
            <span className="font-bold">Quầy pha chế →</span>
            <p className="mt-2 text-sm text-cafe-muted">
              Theo dõi, xử lý và xem lịch sử đơn hàng.
            </p>
          </Link>
          <Link
            href="/barista/inventory"
            className="rounded-2xl border border-cafe-line bg-cafe-surface p-5 shadow-cafe-card transition-colors hover:border-cafe-primary"
          >
            <span className="font-bold">Sản phẩm &amp; Kho →</span>
            <p className="mt-2 text-sm text-cafe-muted">
              Quản lý nguyên liệu, công thức và bật/tắt bán sản phẩm.
            </p>
          </Link>
        </nav>

        <section
          aria-labelledby="create-staff-title"
          className="rounded-2xl border border-cafe-line bg-cafe-surface p-5 shadow-cafe-card sm:p-7"
        >
          <h2 id="create-staff-title" className="text-xl font-bold">
            Tạo tài khoản nhân viên
          </h2>
          <p className="mt-2 text-sm text-cafe-muted">
            Tài khoản do quản lý cấp không cần xác thực OTP. Nhân viên có thể
            đăng nhập ngay bằng số điện thoại hoặc email đã được cấp.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              {error}
            </p>
          )}
          {created && (
            <p
              role="status"
              className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              Đã tạo tài khoản cho <strong>{created.fullName}</strong> ·{" "}
              {created.phone}. Nhân viên có thể đăng nhập ngay.
            </p>
          )}

          <form
            onSubmit={createStaff}
            autoComplete="off"
            className="mt-6"
            aria-busy={saving}
          >
            <fieldset
              disabled={saving}
              className="grid min-w-0 gap-5 sm:grid-cols-2"
            >
              <legend className="sr-only">
                Thông tin tài khoản nhân viên mới
              </legend>
              <div>
                <label
                  htmlFor="staff-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Họ tên
                </label>
                <input
                  id="staff-name"
                  name="fullName"
                  required
                  minLength={2}
                  maxLength={100}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="staff-phone"
                  className="mb-2 block text-sm font-semibold"
                >
                  Số điện thoại
                </label>
                <input
                  id="staff-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  required
                  pattern="0[0-9]{9}"
                  maxLength={10}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  aria-describedby="staff-phone-help"
                  className={inputClass}
                />
                <p
                  id="staff-phone-help"
                  className="mt-2 text-xs text-cafe-muted"
                >
                  10 chữ số, bắt đầu bằng 0.
                </p>
              </div>
              <div>
                <label
                  htmlFor="staff-email"
                  className="mb-2 block text-sm font-semibold"
                >
                  Email{" "}
                  <span className="font-normal text-cafe-muted">
                    (không bắt buộc)
                  </span>
                </label>
                <input
                  id="staff-email"
                  name="email"
                  type="email"
                  maxLength={150}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="staff-password"
                  className="mb-2 block text-sm font-semibold"
                >
                  Mật khẩu ban đầu
                </label>
                <input
                  id="staff-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={64}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby="staff-password-help"
                  className={inputClass}
                />
                <p
                  id="staff-password-help"
                  className="mt-2 text-xs text-cafe-muted"
                >
                  8–64 ký tự, có ít nhất một chữ cái và một chữ số.
                </p>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-xl bg-cafe-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-cafe-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                  disabled={saving}
                >
                  {saving ? "Đang tạo tài khoản…" : "Tạo tài khoản nhân viên"}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
        <StaffList key={staffRevision} managerId={user.id} />
      </div>
    </main>
  );
}
