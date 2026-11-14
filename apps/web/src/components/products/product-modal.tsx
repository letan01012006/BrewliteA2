"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ProductDetail, Size, Topping } from "@/types";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { unitPrice as calculateUnitPrice, makeItem } from "@/lib/cart-rules";
import { checkInventory } from '@/lib/api/inventory';
import { getProductImageUrl } from "@/lib/constants/product-images";
import { Modal } from '@/components/ui/modal';

interface ProductModalProps {
  product: ProductDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductModal(props: ProductModalProps) {
  if (!props.isOpen || !props.product) return null;
  return (
    <ProductSelection
      key={props.product.id}
      {...props}
      product={props.product}
    />
  );
}

function ProductSelection({
  product,
  onClose,
}: Omit<ProductModalProps, "product"> & { product: ProductDetail }) {
  const toppings = product.toppings;
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [selectedSize, setSelectedSize] = useState<Size>(() => {
    const availableSizes = product.sizes.filter((entry) => {
      const avail = product.availability?.find((a) => a.size === entry.size);
      return (
        !avail ||
        (avail.maxQuantity > 0 &&
          avail.reason !== 'INGREDIENT_PAUSED' &&
          avail.reason !== 'RECIPE_UNAVAILABLE')
      );
    });
    return (
      availableSizes.find((entry) => entry.size === "M")?.size ??
      availableSizes[0]?.size ??
      product.sizes.find((entry) => entry.size === "M")?.size ??
      product.sizes[0]?.size ??
      "S"
    );
  });
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>("");
  const [isAdded, setIsAdded] = useState<boolean>(false);

  const { addItemChecked, items, cartError, isHydrated } = useCartStore();
  const currentSizeAvail = product.availability?.find((a) => a.size === selectedSize);
  const isSelectedSizePaused = currentSizeAvail?.reason === 'INGREDIENT_PAUSED';
  const legacyAvailable = Math.max(
    0,
    product.stock -
      items
        .filter((item) => item.product.id === product.id)
        .reduce((sum, item) => sum + item.quantity, 0),
  );
  const selectionKey = JSON.stringify({ productId: product.id, selectedSize, toppingIds: selectedToppings.map(t => t.id), note, items });
  const [inventory, setInventory] = useState<{ key: string; max: number; reason: string | null } | null>(null);
  const ingredientMode = product.inventoryMode === 'INGREDIENT';
  const checking = ingredientMode && inventory?.key !== selectionKey;
  const available = ingredientMode ? (checking ? 0 : inventory?.max ?? 0) : legacyAvailable;
  useEffect(() => {
    if (!ingredientMode) return;
    const controller = new AbortController();
    const selection = makeItem(product, selectedSize, selectedToppings, 1, note);
    const existingQuantity = items.find(item => item.id === selection.id)?.quantity ?? 0;
    selection.quantity = Math.min(20, existingQuantity + 1);
    selection.lineTotal = selection.quantity * selection.unitPrice;
    const candidate = [...items.filter(item => item.id !== selection.id), selection];
    checkInventory(candidate, controller.signal).then(result => {
      if (!controller.signal.aborted) setInventory({ key: selectionKey, max: Math.max(0, (result.lines.at(-1)?.maxQuantity ?? 0) - existingQuantity),
        reason: result.available ? null : 'Không đủ nguyên liệu; hãy đổi size/topping hoặc giảm số lượng trong giỏ.' });
    }).catch(error => {
      if (!controller.signal.aborted) setInventory({ key: selectionKey, max: 0, reason: error instanceof Error ? error.message : 'Không kiểm tra được nguyên liệu.' });
    });
    return () => controller.abort();
  }, [ingredientMode, items, product, selectedSize, selectedToppings, note, selectionKey]);
  const adding = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const [modalImgError, setModalImgError] = useState<boolean>(false);

  const handleToggleTopping = (topping: Topping) => {
    if (topping.ingredient && topping.ingredient.isActive === false) return;
    const isSelected = selectedToppings.some((t) => t.id === topping.id);
    if (isSelected) {
      setSelectedToppings(selectedToppings.filter((t) => t.id !== topping.id));
    } else {
      if (selectedToppings.length >= 3) {
        alert("Tối đa 3 loại topping cho mỗi ly đồ uống");
        return;
      }
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  const unitPrice = calculateUnitPrice(product, selectedSize, selectedToppings);
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = async () => {
    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/menu?openProduct=${product.id}`)}`,
      );
      return;
    }
    if (adding.current) return;
    adding.current = true;
    const added = await addItemChecked({
      product,
      size: selectedSize,
      selectedToppings,
      quantity,
      note: note.trim() || undefined,
    });

    if (!added) { adding.current = false; return; }
    adding.current = true;
    setIsAdded(true);
    timer.current = setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 400);
  };

  return (
    <Modal onClose={onClose} labelledBy="modal-product-title">
      <div className="product-sheet relative z-10 w-full max-w-lg overflow-hidden flex flex-col max-h-[94dvh] border bg-cafe-surface border-cafe-line">

        {/* Header với ảnh hoặc icon */}
        <div className="relative h-40 sm:h-52 bg-gradient-to-br flex items-center justify-center border-b shrink-0 border-cafe-line from-cafe-accent via-cafe-soft to-cafe-page ">
          {!modalImgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getProductImageUrl(
                product.name,
                product.category,
                product.imageUrl,
              )}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setModalImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-cafe-primary ">
              <span className="text-6xl drop-shadow">☕</span>
              <span className="text-xs font-semibold mt-1 uppercase tracking-wider text-cafe-primary ">
                BrewLite Coffee
              </span>
            </div>
          )}

          {/* Nút đóng */}
          <button
            onClick={onClose}
            aria-label="Đóng bảng tùy chọn"
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 text-base shadow-cafe-card "
          >
            ✕
          </button>

          <span className="absolute bottom-3 left-3 backdrop-blur-md text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-cafe-card bg-cafe-accent text-cafe-primary border-cafe-line ">
            {product.category}
          </span>
        </div>

        {cartError && (
          <p role="alert" className="p-3 bg-rose-50 text-rose-700 text-sm">
            {cartError}
          </p>
        )}
        {isSelectedSizePaused && (
          <p role="alert" className="p-3 bg-amber-50 text-amber-900 text-sm">
            Size {selectedSize} có nguyên liệu đang tạm dừng phục vụ. Vui lòng chọn size khác.
          </p>
        )}
        {available < quantity && (
          <p className="p-3 bg-amber-50 text-sm text-cafe-primary ">
            {ingredientMode
              ? checking ? 'Đang kiểm tra nguyên liệu…' : inventory?.reason ?? `Lựa chọn này còn tối đa ${available} ly sau khi tính giỏ hàng.`
              : `Không đủ tồn kho để thêm số lượng này. Trong giỏ đã có ${product.stock - available} ly.`}
          </p>
        )}
        {/* Nội dung tùy chỉnh */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          <div>
            <h2 id="modal-product-title" className="text-xl font-bold text-cafe-ink ">{product.name}</h2>
            <p className="text-xs mt-1 text-cafe-muted ">
              {product.description ||
                "Thức uống tươi ngon được pha chế theo công thức chuẩn vị."}
            </p>
          </div>

          {/* 1. Chọn Size */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2 text-cafe-muted ">
              1. Chọn kích cỡ (Size) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {product.sizes.map((item) => {
                const isCurrent = selectedSize === item.size;
                const sizeAvail = product.availability?.find((a) => a.size === item.size);
                const isSizePaused = sizeAvail?.reason === "INGREDIENT_PAUSED";
                const isUnconfigured = sizeAvail?.reason === "RECIPE_UNAVAILABLE";
                const isShortage = sizeAvail && sizeAvail.maxQuantity <= 0 && !isSizePaused && !isUnconfigured;

                return (
                  <button
                    key={item.size}
                    type="button"
                    disabled={isSizePaused}
                    onClick={() => setSelectedSize(item.size)}
                    className={`py-2.5 px-3 rounded-2xl border text-center transition-all ${
                      isSizePaused
                        ? "opacity-60 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400 "
                        : isCurrent
                          ? " font-bold ring-2 cursor-pointer ring-cafe-primary/30 shadow-cafe-card bg-cafe-accent border-cafe-primary text-cafe-primary "
                          : " cursor-pointer border-cafe-line hover:border-cafe-primary text-cafe-ink bg-cafe-surface "
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-center gap-1">
                      <span>{item.size}</span>
                    </div>
                    <div className="text-xs mt-0.5 text-cafe-muted ">
                      {isSizePaused ? (
                        <span className="text-rose-600 font-semibold">Tạm dừng NL</span>
                      ) : isUnconfigured ? (
                        <span className="text-amber-600 ">Chưa có CT</span>
                      ) : isShortage ? (
                        <span className="text-stone-400">Hết hàng</span>
                      ) : item.surcharge > 0 ? (
                        `+${item.surcharge.toLocaleString("vi-VN")}₫`
                      ) : (
                        "Tiêu chuẩn"
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Chọn Topping */}
          {toppings.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-cafe-muted ">
                  2. Thêm Topping
                </label>
                <span className="text-xs text-cafe-muted ">
                  (Tối đa 3 loại • Đã chọn {selectedToppings.length}/3)
                </span>
              </div>
              <div className="space-y-1.5">
                {toppings.map((topping) => {
                  const isChecked = selectedToppings.some(
                    (t) => t.id === topping.id,
                  );
                  const isToppingPaused = Boolean(
                    topping.ingredient && topping.ingredient.isActive === false,
                  );
                  return (
                    <label
                      key={topping.id}
                      className={`flex items-center justify-between p-3 rounded-xl border min-h-[48px] transition-colors ${
                        isToppingPaused
                          ? "opacity-50 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400"
                          : isChecked
                            ? " font-medium cursor-pointer bg-cafe-accent border-cafe-primary text-cafe-primary "
                            : " cursor-pointer border-cafe-line hover:bg-cafe-page text-cafe-ink bg-cafe-surface/70 "
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isToppingPaused}
                          onChange={() => !isToppingPaused && handleToggleTopping(topping)}
                          className="w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed text-cafe-primary focus:ring-cafe-primary border-cafe-line accent-cafe-primary "
                        />
                        <span className="text-sm">
                          {topping.name}
                          {isToppingPaused && (
                            <span className="ml-1.5 text-xs text-rose-500 font-semibold">
                              (Tạm dừng NL)
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-cafe-muted ">
                        +{topping.price.toLocaleString("vi-VN")}₫
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Ghi chú */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-cafe-muted ">
              3. Ghi chú cho Barista (Tùy chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Ít đá, ít ngọt, nhiều sữa..."
              maxLength={100}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 border-cafe-line bg-cafe-surface text-cafe-ink focus:border-cafe-primary focus:ring-cafe-primary/20 placeholder:text-cafe-muted "
            />
          </div>
        </div>

        {/* Footer: Chọn số lượng & Nút Thêm vào giỏ */}
        <div className="product-sheet-actions p-3 sm:p-4 border-t flex items-center justify-between gap-2 shrink-0 border-cafe-line bg-cafe-page">
          {/* Tăng giảm số lượng */}
          <div className="flex items-center border rounded-2xl overflow-hidden h-12 border-cafe-line bg-cafe-surface shadow-cafe-card ">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Giảm số lượng"
              className="w-11 h-12 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors text-lg font-bold text-cafe-muted hover:bg-cafe-soft "
            >
              −
            </button>
            <span className="w-9 text-center font-bold text-base text-cafe-ink ">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(20, available, quantity + 1))}
              disabled={quantity >= Math.min(20, available)}
              aria-label="Tăng số lượng"
              className="w-11 h-12 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors text-lg font-bold text-cafe-muted hover:bg-cafe-soft "
            >
              +
            </button>
          </div>

          {/* Nút xác nhận thêm vào giỏ */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdded || !isHydrated || available < quantity || product.sizes.length === 0 || isSelectedSizePaused}
            className={`flex-1 min-w-0 h-12 px-3 rounded-2xl font-bold text-xs sm:text-sm text-white transition-all flex items-center justify-between gap-1 cursor-pointer active:scale-95 ${
              isAdded
                ? "bg-emerald-600 shadow-emerald-600/20"
                : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-amber-600/25 cafe-primary "
            }`}
          >
            <span className="truncate">{isAdded ? "✓ Đã thêm vào giỏ!" : "Thêm vào giỏ"}</span>
            <span className="font-mono font-extrabold ml-2 shrink-0 text-cafe-surface">
              {totalPrice.toLocaleString("vi-VN")}₫
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
