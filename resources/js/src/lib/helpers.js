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

export function getToken() {
    return localStorage.getItem("commerce_token");
}
