import { Link } from "react-router-dom";
import { ShoppingCart, Star } from "lucide-react";
import { peso, productImage } from "../lib/helpers";
import { useAuthStore } from "../store/authStore";

export default function ProductCard({ product, onAdd }) {
    const outOfStock = Number(product.stock) <= 0;
    const { user } = useAuthStore();
    const isAdmin = user?.role === "admin";
    const hasVariants = product.variants?.length > 0;

    return (
        <article className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <Link to={`/products/${product.slug}`}>
                <img
                    className="aspect-[4/3] w-full object-cover"
                    src={productImage(product)}
                    alt={product.name}
                    loading="lazy"
                />
            </Link>
            <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                        {product.category?.name}
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                        <Star size={15} fill="currentColor" className="text-amber-400" />
                        {product.rating}
                    </span>
                </div>
                <Link to={`/products/${product.slug}`} className="line-clamp-2 min-h-12 font-black">
                    {product.name}
                </Link>
                <p className="mt-2 text-lg font-black text-emerald-700 dark:text-emerald-300">
                    {peso.format(product.price)}
                </p>
                <p className={`mt-1 text-xs font-bold ${outOfStock ? "text-red-600 dark:text-red-300" : Number(product.stock) <= 5 ? "text-amber-600 dark:text-amber-300" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {outOfStock ? "Out of stock" : `${product.stock} in stock`}
                </p>
                {isAdmin ? (
                    <Link className="mt-4 flex w-full items-center justify-center rounded-lg bg-zinc-950 px-3 py-2 text-sm font-bold text-white dark:bg-white dark:text-zinc-950" to={`/products/${product.slug}`}>View / Edit</Link>
                ) : hasVariants ? (
                    <Link className="mt-4 flex w-full items-center justify-center rounded-lg bg-zinc-950 px-3 py-2 text-sm font-bold text-white dark:bg-white dark:text-zinc-950" to={`/products/${product.slug}`}>Choose variant</Link>
                ) : (
                    <button
                        disabled={outOfStock}
                        onClick={() => onAdd(product)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-white dark:text-zinc-950 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-300"
                    >
                        <ShoppingCart size={16} /> {outOfStock ? "Unavailable" : "Add to cart"}
                    </button>
                )}
            </div>
        </article>
    );
}
