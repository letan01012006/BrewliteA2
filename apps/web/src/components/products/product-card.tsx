/* eslint-disable @next/next/no-img-element -- Provider images use responsive URLs and native browser loading. */
"use client";

import { useState } from "react";
import type { Product } from "@/types";
import { getProductImageUrl } from "@/lib/constants/product-images";
import { Icon } from "@/components/ui/icon";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const ingredientMode = product.inventoryMode === "INGREDIENT";
  const isPaused = product.isActive === false;
  const isAllPaused =
    ingredientMode &&
    Boolean(
      product.availability?.length &&
      product.availability.every(
        (entry) => entry.reason === "INGREDIENT_PAUSED",
      ),
    );
  const isOutOfStock = ingredientMode ? !product.inStock : product.stock <= 0;
  const image = getProductImageUrl(
    product.name,
    product.category,
    product.imageUrl,
  );
  const status = isPaused
    ? "Tạm dừng"
    : isAllPaused
      ? "Chưa khả dụng"
      : isOutOfStock
        ? "Hết hàng"
        : null;

  return (
    <article className="product-card">
      <div className="product-image">
        {!imageError ? (
          <img
            loading="lazy"
            decoding="async"
            src={image}
            alt={product.name}
            srcSet={
              image.startsWith("https://images.unsplash.com/")
                ? [240, 400, 600]
                    .map((width) => {
                      const url = new URL(image);
                      url.searchParams.set("w", String(width));
                      return url.toString() + " " + width + "w";
                    })
                    .join(", ")
                : undefined
            }
            sizes="(min-width: 1200px) 260px, (min-width: 900px) 23vw, (min-width: 600px) 30vw, 44vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="product-placeholder">
            <Icon name="coffee" size={40} />
          </div>
        )}
        <span className="product-category">{product.category}</span>
        {status && <span className="product-status">{status}</span>}
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="product-description">
          {product.description || "Pha tươi, trọn vị bạn thích."}
        </p>
        <div className="product-bottom">
          <span className="product-price">
            <small>Giá từ</small>
            {product.price.toLocaleString("vi-VN")}
            <span className="ml-0.5 text-[10px] font-medium">₫</span>
          </span>
          <button
            className="product-add"
            type="button"
            onClick={() => onSelect(product)}
            disabled={isPaused || isAllPaused || isOutOfStock}
            aria-label={"Đặt món " + product.name}
            title={status || "Chọn size và topping"}
          >
            <Icon name="plus" size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
