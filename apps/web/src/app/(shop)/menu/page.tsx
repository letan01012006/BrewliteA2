"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product, ProductDetail } from "@/types";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ProductCard } from "@/components/products/product-card";
import { ProductModal } from "@/components/products/product-modal";
import { useAuthStore } from "@/store/auth-store";
import { allProducts } from "@/lib/api/pagination";
import { Pagination } from "@/components/ui/pagination";
import { Icon } from "@/components/ui/icon";

function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openProductId = searchParams.get("openProduct");

  const user = useAuthStore((state) => state.user);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => searchParams.get("category") || "Tất cả",
  );
  const [page, setPage] = useState(1);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(
    null,
  );
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailController = useRef<AbortController | null>(null);
  const detailRequestId = useRef(0);
  const lastDetailId = useRef<number | null>(null);
  const userId = user?.id;
  const consumedProduct = useRef<string | null>(null);

  // Catalog pagination is independent of the latest product-detail request.
  const fetchData = useCallback(async () => {
    const id = ++requestId.current;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setIsLoading(true);
    setError(null);
    try {
      const productsRes = await allProducts<Product>(request.signal);

      if (id !== requestId.current) return;
      setProducts(productsRes);
      setPage(1);
    } catch (err) {
      if (request.signal.aborted || id !== requestId.current) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        const errorDetail = err instanceof Error ? err.message : String(err);
        setError(`Không thể kết nối đến backend (${errorDetail}).`);
      }
    } finally {
      if (id === requestId.current && !request.signal.aborted)
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => void fetchData(), 0);
    return () => {
      clearTimeout(initial);
      controller.current?.abort();
    };
  }, [fetchData]);

  const loadProduct = useCallback(async (productId: number) => {
    const id = ++detailRequestId.current;
    detailController.current?.abort();
    const request = new AbortController();
    detailController.current = request;
    lastDetailId.current = productId;
    setSelectedProduct(null);
    setDetailError(null);
    setDetailLoadingId(productId);
    try {
      if (!Number.isSafeInteger(productId) || productId < 1)
        throw new Error("Mã món không hợp lệ.");
      const product = await apiFetch<ProductDetail>(`/products/${productId}`, {
        auth: false,
        signal: request.signal,
      });
      if (id !== detailRequestId.current || request.signal.aborted) return;
      if (
        product.id !== productId ||
        !Array.isArray(product.toppings) ||
        !Array.isArray(product.sizes) ||
        !product.sizes.length
      )
        throw new Error(
          "Thông tin tùy chọn món chưa đầy đủ. Vui lòng thử lại.",
        );
      setSelectedProduct(product);
    } catch (error) {
      if (id !== detailRequestId.current || request.signal.aborted) return;
      setDetailError(
        error instanceof ApiError && error.statusCode === 404
          ? "Món này không còn tồn tại hoặc đã ngừng bán. Vui lòng chọn món khác."
          : error instanceof Error
            ? error.message
            : "Không thể tải tùy chọn món. Vui lòng thử lại.",
      );
    } finally {
      if (id === detailRequestId.current && !request.signal.aborted)
        setDetailLoadingId(null);
    }
  }, []);

  useEffect(
    () => () => {
      detailController.current?.abort();
      ++detailRequestId.current;
    },
    [userId],
  );

  // Clicks and post-login intents both fetch the same fresh detail endpoint.
  useEffect(() => {
    if (!openProductId) {
      consumedProduct.current = null;
      return;
    }
    const intent = `${userId}:${openProductId}`;
    if (userId && consumedProduct.current !== intent) {
      const timer = setTimeout(() => {
        consumedProduct.current = intent;
        void loadProduct(Number(openProductId));
        const params = new URLSearchParams(searchParams.toString());
        params.delete("openProduct");
        router.replace(`/menu${params.size ? `?${params}` : ""}`, {
          scroll: false,
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [openProductId, userId, router, searchParams, loadProduct]);

  // Chặn đăng nhập khi bấm Đặt món và lưu lại redirect kèm ID món vừa chọn
  const handleSelectProduct = (product: Product) => {
    if (!user) {
      const targetUrl = `/menu?openProduct=${product.id}`;
      router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
      return;
    }
    void loadProduct(product.id);
  };

  // Danh sách danh mục độc nhất
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.category).filter(Boolean)),
    );
    return ["Tất cả", ...cats];
  }, [products]);

  // Lọc sản phẩm theo Category và Tìm kiếm
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchCat =
        selectedCategory === "Tất cả" || product.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === "" ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="menu-page">
      <section className="menu-intro">
        <span className="eyebrow">
          <Icon name="coffee" size={14} />
          THE BREWLITE MENU
        </span>
        <h1>Hôm nay, bạn uống gì?</h1>
        <p>Đậm đà một chút, thanh mát một chút. Luôn có một ly dành cho bạn.</p>
      </section>
      <div className="menu-tools">
        <div className="menu-search">
          <Icon name="search" size={18} />
          <input
            aria-label="Tìm món trong thực đơn"
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm ly đồ uống hợp gu..."
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              onClick={() => {
                setSearchQuery("");
                setPage(1);
              }}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <div className="category-pills" aria-label="Danh mục đồ uống">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={
                "category-pill " +
                (selectedCategory === category ? "is-active" : "")
              }
              aria-pressed={selectedCategory === category}
              onClick={() => {
                setSelectedCategory(category);
                setPage(1);
              }}
            >
              {category === "Tất cả" && <Icon name="menu" size={14} />}
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="menu-result-heading">
        <h2>
          {selectedCategory === "Tất cả" ? "Tất cả món ngon" : selectedCategory}
        </h2>
        <span>
          {isLoading
            ? "Đang pha chút cảm hứng..."
            : filteredProducts.length + " lựa chọn dành cho bạn"}
        </span>
      </div>
      {isLoading && (
        <div
          className="product-grid"
          aria-busy="true"
          aria-label="Đang tải thực đơn"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((number) => (
            <div key={number} className="product-skeleton" />
          ))}
        </div>
      )}
      {!isLoading && error && (
        <div className="empty-state" role="alert">
          <Icon name="coffee" size={32} />
          <h3>Chưa thể mở thực đơn.</h3>
          <p>Kết nối đang gián đoạn. Bạn thử lại sau một chút nhé.</p>
          <button className="text-link" onClick={() => void fetchData()}>
            Thử tải lại
            <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
      {!isLoading && !error && filteredProducts.length === 0 && (
        <div className="empty-state">
          <Icon name="search" size={32} />
          <h3>Chưa tìm thấy ly bạn muốn.</h3>
          <p>Thử một từ khóa khác hoặc xem thêm danh mục nhé.</p>
          <button
            className="text-link"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("Tất cả");
              setPage(1);
            }}
          >
            Xem tất cả món
            <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
      {!isLoading && !error && filteredProducts.length > 0 && (
        <div className="product-grid">
          {filteredProducts.slice((page - 1) * 12, page * 12).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={handleSelectProduct}
            />
          ))}
        </div>
      )}
      {!isLoading && !error && (
        <Pagination
          page={page}
          totalPages={Math.ceil(filteredProducts.length / 12)}
          onChange={setPage}
        />
      )}
      {detailLoadingId !== null && (
        <p role="status" className="py-4 text-sm text-cafe-muted">
          Đang tải tùy chọn món…
        </p>
      )}
      {detailError && (
        <div
          role="alert"
          className="my-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <p>{detailError}</p>
          <button
            type="button"
            className="min-h-11 font-semibold underline"
            onClick={() => {
              if (lastDetailId.current !== null)
                void loadProduct(lastDetailId.current);
            }}
          >
            Thử tải lại
          </button>
        </div>
      )}
      <ProductModal
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="empty-state">
          <p>Đang mở thực đơn...</p>
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
