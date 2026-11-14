import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ShopFooter } from "@/components/layout/shop-footer";
import { CustomerGate } from "@/components/auth/customer-gate";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <CustomerGate>
      <div className="shop-shell">
        <a href="#main-content" className="skip-link">
          Đến nội dung chính
        </a>
        <AppHeader />
        <main id="main-content" className="page-container shop-main">
          {children}
        </main>
        <ShopFooter />
        <MobileNav />
      </div>
    </CustomerGate>
  );
}
