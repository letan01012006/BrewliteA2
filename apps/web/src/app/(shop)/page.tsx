/* eslint-disable @next/next/no-img-element -- Provider images use responsive URLs and native browser loading. */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/types";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { ProductCard } from "@/components/products/product-card";
import { Icon, type IconName } from "@/components/ui/icon";

const categories: { name: string; detail: string; icon: IconName }[] = [
  { name: "Cà phê", detail: "Đậm đà đúng gu", icon: "coffee" },
  { name: "Trà", detail: "Thanh mát nhẹ nhàng", icon: "leaf" },
  { name: "Tất cả", detail: "Thêm một chút cảm hứng", icon: "menu" },
  { name: "Đá xay", detail: "Mát lành từng ngụm", icon: "star" },
];

export default function LandingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ data: Product[] }>("/products?limit=4", {
      auth: false,
      signal: controller.signal,
    })
      .then((res) => {
        if (!controller.signal.aborted) {
          setProducts(res.data || []);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Chưa thể tải thực đơn. Bạn thử lại nhé.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const selectProduct = (product: Product) => {
    const target = "/menu?openProduct=" + product.id;
    router.push(
      user ? target : "/login?redirect=" + encodeURIComponent(target),
    );
  };

  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-cafe-green" />
            MỘT KHOẢNG NGHỈ THẬT NGON
          </span>
          <h1 id="hero-title">
            Chậm một nhịp.
            <br />
            <em>Ngon</em> một ngày.
          </h1>
          <p className="hero-description">
            Một ly cà phê hợp gu, một chút bình yên giữa ngày bận rộn. BrewLite
            pha sẵn niềm vui nhỏ cho bạn.
          </p>
          <div className="hero-actions">
            <Link href="/menu" className="button-primary">
              Chọn món ngay
              <Icon name="arrow" size={18} />
            </Link>
            <Link href="#our-favorites" className="button-secondary">
              Khám phá thêm
            </Link>
          </div>
          <div className="hero-details">
            <span>
              <Icon name="coffee" size={15} />
              Pha mới khi bạn đặt
            </span>
            <span>
              <Icon name="leaf" size={15} />
              Chọn vị theo gu
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-photo">
            <img
              fetchPriority="high"
              src="https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=1000&auto=format&fit=crop&q=85"
              alt="Ly latte với lớp bọt sữa mịn trên bàn cà phê"
            />
          </div>
          <span className="hero-stamp">
            <Icon name="leaf" size={22} />
            MỘT CHÚT
            <br />
            DỊU DÀNG
          </span>
          <div className="hero-note">
            <span className="hero-note-icon">
              <Icon name="coffee" size={20} />
            </span>
            <div>
              <strong>Đúng gu, đúng tâm trạng.</strong>
              <small>Ly yêu thích đang chờ bạn.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="home-categories" aria-labelledby="category-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BẠN ĐANG THÈM GÌ?</span>
            <h2 id="category-title" className="section-title">
              Chọn một chút hợp gu.
            </h2>
          </div>
        </div>
        <div className="category-links">
          {categories.map(({ name, detail, icon }) => (
            <Link
              href={"/menu?category=" + encodeURIComponent(name)}
              className="category-link"
              key={name}
            >
              <span className="category-link-icon">
                <Icon name={icon} size={25} />
              </span>
              <span>
                {name}
                <small className="mt-1 hidden text-[9px] font-normal text-cafe-muted lg:block">
                  {detail}
                </small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="our-favorites" aria-labelledby="favorite-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE BREWLITE SELECTION</span>
            <h2 id="favorite-title" className="section-title">
              Món quen, vị luôn mới.
            </h2>
          </div>
          <Link href="/menu" className="text-link">
            <span>Xem tất cả</span>
            <Icon name="arrow" size={17} />
          </Link>
        </div>
        {isLoading ? (
          <div
            className="product-grid"
            aria-label="Đang tải món nổi bật"
            aria-busy="true"
          >
            {[1, 2, 3, 4].map((id) => (
              <div key={id} className="product-skeleton" />
            ))}
          </div>
        ) : loadError ? (
          <div className="empty-state" role="alert">
            <Icon name="coffee" size={30} />
            <h3>Thực đơn đang nghỉ một chút.</h3>
            <p>{loadError}</p>
            <button
              className="text-link"
              onClick={() => {
                setIsLoading(true);
                setReload((value) => value + 1);
              }}
            >
              Thử tải lại
              <Icon name="arrow" size={16} />
            </button>
          </div>
        ) : products.length > 0 ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={selectProduct}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Icon name="coffee" size={30} />
            <h3>Tụi mình đang chuẩn bị thực đơn.</h3>
            <Link href="/menu" className="text-link">
              Ghé xem thực đơn
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        )}
      </section>

      <section className="loyalty-banner" aria-labelledby="loyalty-title">
        <div>
          <span className="eyebrow">
            <Icon name="star" size={14} />
            BREWLITE REWARDS
          </span>
          <h2 id="loyalty-title" className="section-title">
            Tích từng chút.
            <br />
            Vui từng ly.
          </h2>
          <p>
            Đặt món, tích điểm và dùng điểm cho ly yêu thích tiếp theo. Những
            niềm vui nhỏ, dành riêng cho bạn.
          </p>
        </div>
        <Link href={user ? "/orders" : "/register"} className="button-primary">
          {user ? "Xem điểm và đơn hàng" : "Trở thành thành viên"}
          <Icon name="arrow" size={17} />
        </Link>
        <div className="loyalty-illustration" aria-hidden="true">
          <span>brewlite.</span>
          <div className="loyalty-stamps">
            {[1, 2, 3, 4, 5].map((number) => (
              <i key={number}>
                <Icon name="coffee" size={16} />
              </i>
            ))}
          </div>
          <small>A LITTLE COFFEE. A LOT OF JOY.</small>
        </div>
      </section>

      <section className="little-values" aria-label="Trải nghiệm BrewLite">
        {[
          {
            icon: "coffee" as const,
            title: "Pha bằng sự chăm chút",
            text: "Tươi mới, từ ngụm đầu tiên.",
          },
          {
            icon: "menu" as const,
            title: "Một ly theo cách của bạn",
            text: "Chọn size, topping và ghi chú riêng.",
          },
          {
            icon: "bag" as const,
            title: "Đặt món thật thảnh thơi",
            text: "Chọn trên điện thoại, nhận tại quầy.",
          },
        ].map(({ icon, title, text }) => (
          <div className="little-value" key={title}>
            <span>
              <Icon name={icon} size={21} />
            </span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
