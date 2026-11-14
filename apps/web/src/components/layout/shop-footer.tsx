import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function ShopFooter() {
  return (
    <footer className="shop-footer">
      <div className="page-container footer-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Icon name="coffee" size={23} />
          </span>
          <span className="brand-name">
            brewlite<span>.</span>
          </span>
        </Link>
        <p>Một ly ngon. Một ngày thật nhẹ.</p>
        <Link href="/menu">
          Hẹn bạn ở ly tiếp theo <Icon name="arrow" size={16} />
        </Link>
      </div>
    </footer>
  );
}
