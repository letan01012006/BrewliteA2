/* eslint-disable @next/next/no-img-element -- Provider images use responsive URLs and native browser loading. */
import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <header className="page-container auth-header">
        <Link href="/" className="text-link">
          <Icon name="back" size={18} />
          Về trang chủ
        </Link>
        <Link href="/" className="brand">
          <span className="brand-name">
            brewlite<span>.</span>
          </span>
        </Link>
      </header>
      <main className="page-container auth-main">
        <aside className="auth-story">
          <span className="eyebrow">MỘT CHÚT THÂN QUEN</span>
          <h1>
            Ly ngon hơn.
            <br />
            Ngày vui hơn.
          </h1>
          <p>
            Ghé BrewLite, chọn món bạn thích.
            <br />
            Phần còn lại, cứ để tụi mình.
          </p>
          <div className="auth-photo">
            <img
              src="https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=900&auto=format&fit=crop&q=85"
              alt="Một ly latte cho khoảng nghỉ trong ngày"
            />
            <span>Made with a little love.</span>
          </div>
        </aside>
        <section className="auth-form-panel">
          {children}
          <p className="auth-note">
            <Icon name="coffee" size={16} />
            Một ly ngon đang chờ bạn.
          </p>
        </section>
      </main>
    </div>
  );
}
