"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { getProductImageUrl } from "@/lib/constants/product-images";
import { pointsEarnedFor } from "@/lib/loyalty";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    isHydrated,
    isRefreshing,
    cartError,
    notice,
    refreshCart,
    promoCode,
    discountAmount,
    isValidatingPromo,
    promoError,
    validatePromo,
    updateQuantityChecked,
    removeItem,
    clearCart,
    setPromo,
    getSubtotal,
    getTotal,
    getTotalItemCount,
  } = useCartStore();

  const { user } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;
    void refreshCart();
  }, [isHydrated, refreshCart, user?.id]);

  const [inputCode, setInputCode] = useState(() => promoCode || "");
  const subtotal = getSubtotal();
  const total = getTotal();
  const totalCount = getTotalItemCount();
  const estimatedPoints = pointsEarnedFor(total);
  const promoSuccessMsg =
    promoCode && !isValidatingPromo
      ? `Đã áp dụng mã ${promoCode} (Giảm ${discountAmount.toLocaleString("vi-VN")}₫)`
      : null;

  const handleApplyPromo = (event: React.FormEvent) => {
    event.preventDefault();
    void validatePromo(inputCode);
  };
  const handleRemovePromo = () => {
    setPromo(null, 0);
    setInputCode("");
  };
  const handleRemoveItem = (itemId: string) => {
    const item = useCartStore.getState().items.find((entry) => entry.id === itemId);
    if (!item) return;
    if (window.confirm(`Bạn có muốn xóa "${item.product.name}" khỏi giỏ hàng không?`)) {
      removeItem(itemId);
    }
  };
  const handleUpdateQty = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      handleRemoveItem(itemId);
      return;
    }
    void updateQuantityChecked(itemId, quantity);
  };

  // Chuyển sang trang checkout
  const handleProceedToCheckout = () => {
    if (
      useCartStore.getState().isValidatingPromo ||
      useCartStore.getState().isRefreshing ||
      !isHydrated ||
      cartError
    )
      return;
    if (!user) {
      // Nếu chưa đăng nhập, chuyển sang trang login với query redirect về checkout
      router.push("/login?redirect=/checkout");
    } else {
      router.push("/checkout");
    }
  };

  if (!isHydrated)
    return <p className="p-8 text-center">Đang khôi phục giỏ hàng...</p>;

  return (
    <div className="flow-page w-full py-3 sm:py-5">
      {notice && (
        <p
          role="status"
          className="p-3 mb-4 bg-amber-50 rounded-xl text-cafe-primary "
        >
          {notice}
        </p>
      )}
      {cartError && (
        <div
          role="alert"
          className="p-3 mb-4 bg-rose-50 text-rose-700 rounded-xl"
        >
          <p>{cartError}</p>
          <button onClick={() => void refreshCart()} className="underline">
            Kiểm tra lại giỏ hàng
          </button>
        </div>
      )}
      {isRefreshing && <p role="status">Đang kiểm tra giá và tồn kho...</p>}
      {/* Tiêu đề & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-cafe-line ">
        <div>
          <div className="flex items-center gap-2 text-xs mb-1 text-cafe-muted ">
            <Link
              href="/"
              className=" transition-colors hover:text-cafe-primary "
            >
              Trang chủ
            </Link>
            <span>/</span>
            <Link
              href="/menu"
              className=" transition-colors hover:text-cafe-primary "
            >
              Menu
            </Link>
            <span>/</span>
            <span className=" font-medium text-cafe-ink ">
              Giỏ hàng của bạn
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cafe-ink ">
            Giỏ Hàng{" "}
            <span className=" text-cafe-primary ">
              ({totalCount} món)
            </span>
          </h1>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => {
              if (
                confirm("Bạn có chắc chắn muốn xóa toàn bộ món trong giỏ hàng?")
              ) {
                clearCart();
                setPromo(null, 0);
              }
            }}
            className="text-xs hover:text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto text-cafe-muted "
          >
            <span>🗑️</span>
            <span>Xóa toàn bộ giỏ</span>
          </button>
        )}
      </div>

      {/* Trạng thái 1: Giỏ hàng trống */}
      {items.length === 0 ? (
        <div className=" rounded-3xl border p-12 sm:p-16 text-center max-w-lg mx-auto space-y-5 my-8 bg-cafe-surface border-cafe-line shadow-cafe-card ">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center text-4xl mx-auto border border-amber-200/60 text-cafe-primary ">
            ☕
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-cafe-ink ">
              Giỏ hàng của bạn đang trống
            </h2>
            <p className="text-xs sm:text-sm max-w-xs mx-auto text-cafe-muted ">
              Chưa có ly đồ uống nào được chọn. Hãy khám phá menu cà phê thơm
              ngon của BrewLite nhé!
            </p>
          </div>
          <Link
            href="/menu"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all active:scale-95 shadow-cafe-card cafe-primary "
          >
            <span>← Khám phá Menu chọn món</span>
          </Link>
        </div>
      ) : (
        /* Trạng thái 2: Giỏ hàng có món */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI (8 cols): Danh sách các món trong giỏ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {items.map((item) => {
              const imageSrc = getProductImageUrl(
                item.product.name,
                item.product.category,
                item.product.imageUrl,
              );

              return (
                <div
                  key={item.id}
                  className=" rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-cafe-surface border-cafe-line shadow-cafe-card hover:shadow-cafe-card "
                >
                  {/* Ảnh và thông tin món */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-amber-50 shrink-0 border border-amber-200/40 ">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        loading="lazy"
                        decoding="async"
                        src={imageSrc}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-cafe-ink ">
                          {item.product.name}
                        </h3>
                        <span className="text-[11px] font-semibold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200/50 text-cafe-primary ">
                          Size {item.size}
                        </span>
                      </div>

                      {/* Topping list */}
                      {item.selectedToppings.length > 0 && (
                        <div className="flex flex-wrap gap-1 text-[11px] text-cafe-muted ">
                          <span className=" text-cafe-muted ">
                            Topping:
                          </span>
                          {item.selectedToppings.map((t) => (
                            <span
                              key={t.id}
                              className=" px-1.5 py-0.5 rounded border border-transparent bg-cafe-soft text-cafe-ink "
                            >
                              +{t.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Ghi chú */}
                      {item.note && (
                        <p className="text-xs bg-amber-50/80 px-2 py-0.5 rounded inline-block border border-amber-200/40 text-cafe-primary ">
                          ✍️ {item.note}
                        </p>
                      )}

                      <div className="text-xs font-semibold pt-0.5 text-cafe-muted ">
                        Đơn giá: {item.unitPrice.toLocaleString("vi-VN")}₫
                      </div>
                    </div>
                  </div>

                  {/* Bộ điều khiển số lượng và thành tiền */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-cafe-line ">
                    <div className="text-right">
                      <span className="text-base sm:text-lg font-bold text-cafe-primary ">
                        {item.lineTotal.toLocaleString("vi-VN")}₫
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Tăng giảm số lượng */}
                      <div className="flex items-center border rounded-xl overflow-hidden h-9 border-cafe-line bg-cafe-page shadow-cafe-card ">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQty(item.id, item.quantity - 1)
                          }
                          aria-label="Giảm"
                          className="w-9 h-9 flex items-center justify-center active:scale-95 cursor-pointer transition-colors text-base font-bold text-cafe-muted hover:bg-cafe-line "
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-bold text-xs text-cafe-ink ">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQty(item.id, item.quantity + 1)
                          }
                          disabled={item.quantity >= 20}
                          aria-label="Tăng"
                          className="w-9 h-9 flex items-center justify-center active:scale-95 disabled:opacity-40 cursor-pointer transition-colors text-base font-bold text-cafe-muted hover:bg-cafe-line "
                        >
                          +
                        </button>
                      </div>

                      {/* Nút Xóa */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-9 h-9 flex items-center justify-center hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 active:scale-90 transition-all cursor-pointer text-sm text-cafe-muted "
                        title="Xóa món này"
                        aria-label="Xóa món"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Nút quay lại chọn thêm món */}
            <div className="pt-2">
              <Link
                href="/menu"
                className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors text-cafe-primary hover:text-cafe-primary "
              >
                <span>+ Thêm món khác vào giỏ</span>
              </Link>
            </div>
          </div>

          {/* CỘT PHẢI (5 cols): Khuyến mãi & Tóm tắt thanh toán */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            {/* 1. Ô Nhập Voucher Khuyến Mãi */}
            <div className=" rounded-2xl border p-5 space-y-3 bg-cafe-surface border-cafe-line shadow-cafe-card ">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-1.5 text-cafe-ink ">
                  <span>🎟️</span>
                  <span>Mã khuyến mãi (Voucher)</span>
                </h3>
                <span className="text-[11px] font-mono font-medium text-cafe-primary ">
                  Gợi ý: BREW10
                </span>
              </div>

              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã (BREW10, GIAM15K)..."
                  disabled={isValidatingPromo || isRefreshing}
                  className="min-w-0 flex-1 uppercase font-mono text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 placeholder:normal-case placeholder:font-sans border-cafe-line bg-cafe-surface text-cafe-ink focus:border-cafe-primary focus:ring-cafe-primary/20 placeholder:text-cafe-muted "
                />
                <button
                  type="submit"
                  disabled={isValidatingPromo || !inputCode.trim()}
                  className="bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-cafe-card cafe-primary "
                >
                  {isValidatingPromo ? "Đang kiểm tra..." : "Áp dụng"}
                </button>
              </form>

              {/* Thông báo lỗi mã */}
              {promoError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-700 flex items-start gap-1.5 animate-fadeIn">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{promoError}</span>
                </div>
              )}

              {/* Thông báo áp dụng thành công */}
              {promoSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-800 flex items-center justify-between gap-1.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5">
                    <span>✓</span>
                    <span className="font-medium">{promoSuccessMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-emerald-700 hover:text-rose-600 font-semibold text-[11px] underline cursor-pointer"
                  >
                    Bỏ mã
                  </button>
                </div>
              )}
            </div>

            {/* 2. Bảng Tóm Tắt Chi Phí Đơn Hàng */}
            <div className=" rounded-2xl border p-5 space-y-4 bg-cafe-surface border-cafe-line shadow-cafe-card ">
              <h3 className="font-bold text-sm pb-2 border-b text-cafe-ink border-cafe-line ">
                Tóm tắt đơn hàng
              </h3>

              <div className="space-y-2.5 text-xs text-cafe-muted ">
                <div className="flex justify-between">
                  <span>Tiền hàng ({totalCount} ly):</span>
                  <span className="font-semibold font-mono text-cafe-ink ">
                    {subtotal.toLocaleString("vi-VN")}₫
                  </span>
                </div>

                <div className="flex justify-between text-emerald-700 ">
                  <span>Giảm giá khuyến mãi:</span>
                  <span className="font-semibold font-mono">
                    {discountAmount > 0
                      ? `-${discountAmount.toLocaleString("vi-VN")}₫`
                      : "0₫"}
                  </span>
                </div>

                <div className="flex justify-between pt-1 border-t border-dashed text-cafe-primary border-cafe-line ">
                  <span className="flex items-center gap-1">
                    <span>⭐</span>
                    <span>Tích lũy dự kiến:</span>
                  </span>
                  <span className="font-bold">+{estimatedPoints} điểm</span>
                </div>
              </div>

              {/* Tổng thanh toán */}
              <div className="pt-3 border-t flex items-baseline justify-between border-cafe-line ">
                <div>
                  <span className="text-sm font-bold block text-cafe-ink ">
                    Tổng thanh toán:
                  </span>
                  <span className="text-[11px] text-cafe-muted ">
                    (Đã bao gồm thuế GTGT)
                  </span>
                </div>
                <span className="text-2xl font-extrabold font-mono text-cafe-primary ">
                  {total.toLocaleString("vi-VN")}₫
                </span>
              </div>

              {/* Nhắc nhở đăng nhập nếu chưa login */}
              {!user && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1 text-cafe-primary ">
                  <div className="font-semibold">💡 Bạn chưa đăng nhập?</div>
                  <p className="text-[11px] leading-relaxed text-cafe-primary ">
                    Đăng nhập để tự động tích điểm thưởng và theo dõi quá trình
                    pha chế của đơn hàng.
                  </p>
                </div>
              )}

              {/* Nút Tiến Hành Thanh Toán */}
              <button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={isValidatingPromo || isRefreshing || !!cartError}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-sm py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer shadow-cafe-card cafe-primary "
              >
                <span>
                  {isValidatingPromo
                    ? "Đang kiểm tra khuyến mãi..."
                    : "Tiến hành Đặt hàng & Thanh toán"}
                </span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
