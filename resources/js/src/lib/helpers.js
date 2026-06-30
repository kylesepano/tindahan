export const peso = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
});

export const field =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none focus:border-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export function productImage(product, variant = null) {
    return (
        variant?.images?.[0]?.url ||
        variant?.image_url ||
        product?.variant?.image_url ||
        product?.images?.[0]?.url ||
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85"
    );
}

export function variantLabel(variant) {
    return variant ? `${variant.name}: ${variant.value}` : "Default";
}

export function activeDiscountPercent(product, variant = null) {
    return Number(variant?.active_discount_percent || product?.active_discount_percent || 0);
}

export function originalPrice(product, variant = null) {
    return Number(product?.price || 0) + Number(variant?.price_delta || 0);
}

export function salePrice(product, variant = null) {
    const price = originalPrice(product, variant);
    const discount = activeDiscountPercent(product, variant);

    return discount > 0 ? Math.round(price * (1 - discount / 100) * 100) / 100 : price;
}

export function getToken() {
    return localStorage.getItem("commerce_token");
}
