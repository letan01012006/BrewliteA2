"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { safeRedirect } from "@/lib/safe-redirect";

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Đang tải đăng ký...</p>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = safeRedirect(searchParams.get("redirect"));

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !/^0[0-9]{9}$/.test(phone) || !password) {
      setErrorMsg("Vui lòng điền đầy đủ các thông tin");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Mật khẩu phải có độ dài tối thiểu từ 8 ký tự");
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      setErrorMsg("Mật khẩu phải bao gồm cả chữ và số để đảm bảo an toàn");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không trùng khớp");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Đăng ký tài khoản
      await apiFetch<{ phone: string }>("/auth/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone,
          ...(email.trim() ? { email: email.trim() } : {}),
          password,
        }),
      });

      router.push(`/verify-otp?phone=${encodeURIComponent(phone)}&resendAfter=60&redirect=${encodeURIComponent(redirectPath)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (["SMS_NOT_CONFIGURED", "SMS_REJECTED", "SMS_UNAVAILABLE", "SMS_TIMEOUT"].includes(err.code)) {
          router.push(`/verify-otp?phone=${encodeURIComponent(phone)}&deliveryFailed=1&redirect=${encodeURIComponent(redirectPath)}`);
          return;
        }
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Không thể đăng ký tài khoản. Vui lòng thử lại sau.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full rounded-3xl border p-6 sm:p-8 space-y-6 animate-fadeIn bg-cafe-surface border-cafe-line shadow-cafe-card ">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto border shadow-cafe-card bg-cafe-accent text-cafe-primary border-cafe-line ">
            ☕
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-cafe-ink ">
            Đăng Ký Tài Khoản
          </h1>
          <p className="text-xs text-cafe-muted ">
            Tạo tài khoản để tham gia chương trình khách hàng thân thiết
            BrewLite
          </p>
        </div>

        {/* Thông báo lỗi */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-start gap-2 animate-fadeIn">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Đăng ký */}
        <form onSubmit={handleRegister} className="space-y-3.5">
          <div>
            <label htmlFor="register-phone" className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-cafe-muted ">
              Số điện thoại <span className="text-rose-500">*</span>
            </label>
            <input
              id="register-phone"
              type="tel"
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              pattern="0[0-9]{9}"
              maxLength={10}
              required
              placeholder="0912345678"
              className="w-full text-sm px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 border-cafe-line bg-cafe-surface text-cafe-ink focus:border-cafe-primary focus:ring-cafe-primary/20 placeholder:text-cafe-muted "
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-cafe-muted ">
              Họ và tên của bạn <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className="w-full text-sm px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 border-cafe-line bg-cafe-surface text-cafe-ink focus:border-cafe-primary focus:ring-cafe-primary/20 placeholder:text-cafe-muted "
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-cafe-muted ">
              Email (không bắt buộc)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@brewlite.com"
              maxLength={150}
              className="w-full text-sm px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 border-cafe-line bg-cafe-surface text-cafe-ink focus:border-cafe-primary focus:ring-cafe-primary/20 placeholder:text-cafe-muted "
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-cafe-muted ">
                Mật khẩu <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-cafe-muted ">
                Tối thiểu 8 ký tự, gồm chữ & số
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={64}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                required
                className="w-full text-sm px-4 py-2.5 pr-10 rounded-xl border focus:outline-none focus:ring-2 border-cafe-line bg-cafe-surface text-cafe-ink focus:border-cafe-primary focus:ring-cafe-primary/20 placeholder:text-cafe-muted "
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs cursor-pointer text-cafe-muted hover:text-cafe-muted "
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-cafe-muted ">
              Xác nhận mật khẩu <span className="text-rose-500">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu trên..."
              required
              className="w-full text-sm px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 border-cafe-line bg-cafe-surface text-cafe-ink focus:border-cafe-primary focus:ring-cafe-primary/20 placeholder:text-cafe-muted "
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 text-white font-bold text-sm py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-98 mt-2 shadow-cafe-card cafe-primary "
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              <span>Tạo Tài Khoản Mới</span>
            )}
          </button>
        </form>

        {/* Chuyển sang Đăng nhập */}
        <div className="pt-2 text-center text-xs border-t text-cafe-muted border-cafe-line ">
          Đã có tài khoản?{" "}
          <Link
            href={`/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
            className="font-bold underline ml-1 text-cafe-primary hover:text-cafe-primary "
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
  );
}
