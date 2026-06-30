import { create } from "zustand";
import { originalPrice, salePrice } from "../lib/helpers";

function lineKey(productId, variantId = null) {
    return `${productId}:${variantId || "default"}`;
}

function availableStock(product, variant = null) {
    if (variant) return Number(variant.stock || 0);
    if (product?.variants?.length) return product.variants.reduce((sum, item) => sum + Number(item.stock || 0), 0);

    return Number(product?.stock || 0);
}

function keyForItem(item) {
    return item.cart_key || lineKey(item.id, item.selected_variant?.id || item.variant?.id);
}

export const useCartStore = create((set, get) => ({
    items: JSON.parse(localStorage.getItem("commerce_cart") || "[]"),
    notice: null,
    add(product, variant = null) {
        const stock = availableStock(product, variant);
        if (stock <= 0) {
            set({ notice: { type: "error", title: "Out of stock", message: `${product.name} is not available right now.` } });
            return;
        }

        const key = lineKey(product.id, variant?.id);
        const current = get().items;
        const found = current.find((item) => keyForItem(item) === key);
        const price = salePrice(product, variant);
        const cartProduct = { ...product, base_price: Number(product.price), selected_variant: variant, variant, cart_key: key, price, original_price: originalPrice(product, variant) };
        const items = found
            ? current.map((item) => keyForItem(item) === key ? { ...item, cart_key: key, quantity: Math.min(item.quantity + 1, stock) } : item)
            : [...current, { ...cartProduct, quantity: 1 }];

        localStorage.setItem("commerce_cart", JSON.stringify(items));
        set({
            items,
            notice: {
                type: "success",
                title: found ? "Cart updated" : "Added to cart",
                message: `${product.name}${variant ? ` (${variant.value})` : ""}`,
            },
        });
    },
    update(key, quantity) {
        const items = get().items
            .map((item) => keyForItem(item) === key ? { ...item, cart_key: key, quantity } : item)
            .filter((item) => item.quantity > 0);
        localStorage.setItem("commerce_cart", JSON.stringify(items));
        set({ items });
    },
    changeVariant(key, variantId) {
        const changed = get().items.map((item) => {
            if (keyForItem(item) !== key) return item;
            const variant = item.variants?.find((option) => String(option.id) === String(variantId)) || null;
            const nextKey = lineKey(item.id, variant?.id);
            const stock = availableStock(item, variant);
            const basePrice = Number(item.base_price ?? (Number(item.price) - Number(item.selected_variant?.price_delta || item.variant?.price_delta || 0)));
            const productForPrice = { ...item, price: basePrice };

            return {
                ...item,
                cart_key: nextKey,
                base_price: basePrice,
                selected_variant: variant,
                variant,
                price: salePrice(productForPrice, variant),
                original_price: originalPrice(productForPrice, variant),
                quantity: Math.min(item.quantity, Math.max(stock, 1)),
            };
        });
        const merged = changed.reduce((lines, item) => {
            const existing = lines.find((line) => line.cart_key === item.cart_key);
            if (existing) {
                existing.quantity = Math.min(existing.quantity + item.quantity, availableStock(existing, existing.selected_variant || existing.variant));
                return lines;
            }
            lines.push(item);
            return lines;
        }, []);
        localStorage.setItem("commerce_cart", JSON.stringify(merged));
        set({ items: merged });
    },
    clear() {
        localStorage.removeItem("commerce_cart");
        set({ items: [] });
    },
    dismissNotice() {
        set({ notice: null });
    },
}));
