import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { api } from "../services/api";
import { useCartStore } from "../store/cartStore";
import ProductCard from "../components/ProductCard";

export default function Home() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const { add } = useCartStore();

    useEffect(() => {
        api.get("/products?featured=1&sort=popular").then(({ data }) => setProducts(data.data || []));
        api.get("/categories").then(({ data }) => setCategories(data));
    }, []);

    return (
        <>
            <section className="relative min-h-[620px] overflow-hidden bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=85')] bg-cover bg-center">
                <div className="absolute inset-0 bg-zinc-950/45" />
                <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-center px-4 text-white">
                    <div className="max-w-2xl">
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur"><Sparkles size={16} /> Fresh daily deals</p>
                        <h1 className="text-5xl font-black tracking-normal md:text-7xl">Tindahan</h1>
                        <p className="mt-5 max-w-xl text-lg text-zinc-100">A practical online store for daily finds, saved delivery details, PayMongo GCash checkout, and customer transaction history.</p>
                        <Link className="mt-7 inline-flex rounded-lg bg-emerald-500 px-5 py-3 font-black text-zinc-950" to="/products">Shop now</Link>
                    </div>
                </div>
            </section>
            <section className="mx-auto max-w-7xl px-4 py-10">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {categories.slice(0, 8).map((category) => (
                        <Link to={`/products?category=${category.slug}`} className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900" key={category.id}>
                            <img className="h-32 w-full object-cover" src={category.image} alt={category.name} />
                            <div className="p-4"><p className="font-black">{category.name}</p><p className="text-sm text-zinc-500 dark:text-zinc-400">{category.products_count} products</p></div>
                        </Link>
                    ))}
                </div>
            </section>
            <section className="mx-auto max-w-7xl px-4 py-8">
                <div className="mb-5 flex items-end justify-between"><h2 className="text-2xl font-black">Featured Products</h2><Link className="text-sm font-bold text-emerald-700 dark:text-emerald-300" to="/products">View all</Link></div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} onAdd={add} />)}</div>
            </section>
        </>
    );
}
