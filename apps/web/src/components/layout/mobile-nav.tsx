"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import { Icon, type IconName } from "@/components/ui/icon";

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Khám phá", icon: "home" },
  { href: "/menu", label: "Thực đơn", icon: "menu" },
  { href: "/cart", label: "Giỏ hàng", icon: "bag" },
  { href: "/orders", label: "Đơn hàng", icon: "receipt" },
];

export function MobileNav() {
  const pathname = usePathname();
  const count = useCartStore((state) => state.getTotalItemCount());
  return (
    <nav className="mobile-nav" aria-label="Điều hướng trên điện thoại">
      {links.map(({ href, label, icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`mobile-nav-item ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="mobile-nav-icon">
              <Icon name={icon} size={21} />
              {href === "/cart" && count > 0 && (
                <span className="nav-count">{count > 99 ? "99+" : count}</span>
              )}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
