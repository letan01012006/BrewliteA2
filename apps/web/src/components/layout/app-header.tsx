"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { Icon } from "@/components/ui/icon";

export function AppHeader() {
  const pathname = usePathname();
  const { user, logout, initAuth, refreshUser } = useAuthStore();
  const count = useCartStore((state) => state.getTotalItemCount());

  useEffect(() => {
    void initAuth();
    const sync = () => {
      void initAuth().then(() => useAuthStore.getState().refreshUser());
    };
    const storage = (event: StorageEvent) => {
      if (event.key === "brewlite_token" || event.key === null) void initAuth();
    };
    window.addEventListener("focus", sync);
    window.addEventListener("storage", storage);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refreshUser();
    }, 30000);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", storage);
      clearInterval(interval);
    };
  }, [initAuth, refreshUser]);

  const firstName = user?.fullName.trim().split(" ").at(-1);
  const links = [
    { href: "/", label: "Khám phá" },
    { href: "/menu", label: "Thực đơn" },
    { href: "/orders", label: "Đơn hàng" },
  ];

  return (
    <header className="app-header">
      <div className="page-container header-inner">
        <Link href="/" className="brand" aria-label="BrewLite - Trang chủ">
          <span className="brand-mark">
            <Icon name="coffee" size={24} />
          </span>
          <span className="brand-name">
            brewlite<span>.</span>
            <small>COFFEE & LITTLE JOYS</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Điều hướng chính">
          {links.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={"desktop-nav-link " + (active ? "is-active" : "")}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="header-actions">
          {user && (
            <span className="member-points">
              <Icon name="star" size={15} />
              <strong>
                {(user.loyaltyPoints ?? 0).toLocaleString("vi-VN")}
              </strong>
              <span>điểm</span>
            </span>
          )}
          <Link
            href="/cart"
            className="header-cart icon-button"
            aria-label="Giỏ hàng"
          >
            <Icon name="bag" size={21} />
            {count > 0 && (
              <span className="nav-count">{count > 99 ? "99+" : count}</span>
            )}
          </Link>
          {user ? (
            <button
              className="account-button"
              aria-label="Đăng xuất"
              title={"Đăng xuất tài khoản " + user.fullName}
              onClick={() => {
                if (window.confirm("Bạn có chắc muốn đăng xuất?")) logout();
              }}
            >
              <span className="account-avatar">
                {firstName?.charAt(0).toUpperCase() || "B"}
              </span>
              <span className="account-name">
                Chào, {firstName}
                <small>Thành viên BrewLite</small>
              </span>
              <Icon name="logout" size={17} />
            </button>
          ) : (
            <Link href="/login" className="sign-in-link">
              <Icon name="user" size={18} />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
