import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../services/api";
import { useCartStore } from "../store/cartStore";
import { field } from "../lib/helpers";
import ProductCard from "../components/ProductCard";

export default function Products() {
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filters, setFilters] = useState({
        search: searchParams.get("search") || "",
        sort: searchParams.get("sort") || "newest",
        category: searchParams.get("category") || "",
    });
    const { add } = useCartStore();

    useEffect(() => { api.get("/categories").then(({ data }) => setCategories(data)); }, []);

    useEffect(() => {
        setFilters((current) => {
            const next = {
                ...current,
                search: searchParams.get("search") || "",
                sort: searchParams.get("sort") || current.sort || "newest",
                category: searchParams.get("category") || "",
            };

            return JSON.stringify(next) === JSON.stringify(current) ? current : next;
        });
    }, [searchParams]);

    useEffect(() => {
        const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
        api.get(`/products?${params}`).then(({ data }) => setProducts(data.data || []));
    }, [filters]);

    return (
        <section className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[1fr_180px_180px]">
                <label className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 dark:border-zinc-700"><Search size={18} /><input className="w-full bg-transparent py-2 outline-none" placeholder="Search products" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
                <select className={field} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
                <select className={field} value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}><option value="newest">Newest</option><option value="popular">Popular</option><option value="price_low">Price low</option><option value="price_high">Price high</option></select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={add} />)}</div>
        </section>
    );
}
