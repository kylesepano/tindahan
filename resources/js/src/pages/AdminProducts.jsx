import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { api } from "../services/api";
import { field, peso, productImage, variantLabel } from "../lib/helpers";

const blankVariant = { name: "Color", value: "", price_delta: 0, stock: 0, image_urls: [""] };
const blankForm = {
    category_id: "",
    brand_id: "",
    name: "",
    sku: "",
    price: "",
    compare_at_price: "",
    discount: 0,
    status: "active",
    description: "",
    specifications: "{}",
    is_featured: false,
    image_urls: [""],
    variants: [{ ...blankVariant }],
};

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState("");
    const [featuredOnly, setFeaturedOnly] = useState(false);
    const [form, setForm] = useState(blankForm);
    const [message, setMessage] = useState("");

    useEffect(() => { api.get("/categories").then(({ data }) => setCategories(data)); }, []);
    useEffect(() => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (featuredOnly) params.set("featured", "1");
        api.get(`/admin/products?${params}`).then(({ data }) => setProducts(data.data || []));
    }, [search, featuredOnly]);

    const featured = useMemo(() => products.filter((product) => product.is_featured), [products]);

    function updateVariant(index, values) {
        setForm((current) => ({ ...current, variants: current.variants.map((variant, i) => i === index ? { ...variant, ...values } : variant) }));
    }

    function updateVariantImage(variantIndex, imageIndex, value) {
        updateVariant(variantIndex, { image_urls: form.variants[variantIndex].image_urls.map((url, i) => i === imageIndex ? value : url) });
    }

    async function addProduct(event) {
        event.preventDefault();
        setMessage("");
        let specifications = {};
        try {
            specifications = JSON.parse(form.specifications || "{}");
        } catch {
            setMessage("Specifications must be valid JSON.");
            return;
        }

        try {
            const variants = form.variants.filter((variant) => variant.value.trim()).map((variant) => ({
                ...variant,
                stock: Number(variant.stock || 0),
                price_delta: Number(variant.price_delta || 0),
                image_urls: variant.image_urls.filter(Boolean),
            }));
            const payload = {
                ...form,
                category_id: Number(form.category_id),
                brand_id: form.brand_id ? Number(form.brand_id) : null,
                price: Number(form.price),
                compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
                discount: Number(form.discount || 0),
                stock: variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0),
                image_urls: form.image_urls.filter(Boolean),
                variants,
                specifications,
            };
            const { data } = await api.post("/admin/products", payload);
            setProducts((current) => [data, ...current]);
            setForm(blankForm);
            setMessage("Product added.");
        } catch (error) {
            setMessage(error.response?.data?.message || "Unable to add product.");
        }
    }

    async function toggleFeatured(product) {
        const payload = productPayload(product, { is_featured: !product.is_featured });
        const { data } = await api.put(`/admin/products/${product.id}`, payload);
        setProducts((current) => current.map((item) => item.id === product.id ? data : item));
    }

    return (
        <section className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-black">Admin Products</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Search products, manage featured home items, add variants, edit images, and control stock from variants.</p>
            </div>
            <div className="mb-5 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[1fr_auto]">
                <label className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 dark:border-zinc-700"><Search size={18} /><input className="w-full bg-transparent py-2 outline-none" placeholder="Search products or SKU" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} /> Featured only</label>
            </div>
            <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-xl font-black">Featured Home Products</h2>
                <div className="mt-3 flex flex-wrap gap-2">{featured.length ? featured.map((product) => <button className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" key={product.id} onClick={() => toggleFeatured(product)}>{product.name} ×</button>) : <p className="text-sm text-zinc-500">No featured products selected.</p>}</div>
            </section>
            <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-xl font-black">Add Product</h2>
                <form className="mt-4 grid gap-3" onSubmit={addProduct}>
                    <div className="grid gap-3 md:grid-cols-3">
                        <input className={field} placeholder="Product name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                        <input className={field} placeholder="SKU" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} required />
                        <select className={field} value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} required><option value="">Category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>
                        <input className={field} type="number" min="0" step="0.01" placeholder="Base price" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required />
                        <input className={field} type="number" min="0" step="0.01" placeholder="Compare at price" value={form.compare_at_price} onChange={(event) => setForm({ ...form, compare_at_price: event.target.value })} />
                        <select className={field} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">active</option><option value="draft">draft</option><option value="archived">archived</option></select>
                    </div>
                    <textarea className={field} rows="3" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
                    <textarea className={`${field} font-mono`} rows="3" placeholder='{"material":"Canvas"}' value={form.specifications} onChange={(event) => setForm({ ...form, specifications: event.target.value })} />
                    <ImageInputs label="Product images" urls={form.image_urls} onChange={(urls) => setForm({ ...form, image_urls: urls })} />
                    <div className="grid gap-3">
                        <div className="flex items-center justify-between"><h3 className="font-black">Variants</h3><button type="button" className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold dark:border-zinc-700" onClick={() => setForm({ ...form, variants: [...form.variants, { ...blankVariant, image_urls: [""] }] })}><Plus size={16} /> Add variant</button></div>
                        {form.variants.map((variant, index) => <VariantForm key={index} variant={variant} onChange={(values) => updateVariant(index, values)} onImageChange={(imageIndex, value) => updateVariantImage(index, imageIndex, value)} onImages={(urls) => updateVariant(index, { image_urls: urls })} />)}
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /> Show on featured home list</label>
                    <div className="flex items-center gap-3"><button className="rounded-lg bg-emerald-600 px-4 py-2 font-black text-white">Add product</button>{message && <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">{message}</span>}</div>
                </form>
            </section>
            <div className="grid gap-3">
                {products.map((product) => <ProductRow key={product.id} product={product} onFeatured={() => toggleFeatured(product)} />)}
            </div>
        </section>
    );
}

function ProductRow({ product, onFeatured }) {
    return (
        <article className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[90px_1fr_auto]">
            <img className="h-24 w-24 rounded-lg object-cover" src={productImage(product)} alt="" />
            <div>
                <Link className="text-lg font-black hover:text-emerald-700 dark:hover:text-emerald-300" to={`/products/${product.slug}`}>{product.name}</Link>
                <p className="text-sm text-zinc-500">{product.sku} · {product.category?.name} · {peso.format(product.price)}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">{product.variants?.map((variant) => <span className={Number(variant.stock) <= 5 ? "rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" : "rounded-full bg-zinc-100 px-2 py-1 font-bold dark:bg-zinc-800"} key={variant.id}>{variantLabel(variant)}: {variant.stock}</span>)}</div>
            </div>
            <button className="h-10 rounded-lg border border-zinc-300 px-3 text-sm font-bold dark:border-zinc-700" onClick={onFeatured}>{product.is_featured ? "Unfeature" : "Feature"}</button>
        </article>
    );
}

function VariantForm({ variant, onChange, onImages }) {
    return (
        <div className="grid gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950 md:grid-cols-2">
            <input className={field} value={variant.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Variant type" required />
            <input className={field} value={variant.value} onChange={(event) => onChange({ value: event.target.value })} placeholder="Variant value" required />
            <input className={field} type="number" min="0" step="0.01" value={variant.price_delta} onChange={(event) => onChange({ price_delta: event.target.value })} placeholder="Price delta" />
            <input className={field} type="number" min="0" value={variant.stock} onChange={(event) => onChange({ stock: event.target.value })} placeholder="Variant stock" required />
            <div className="md:col-span-2"><ImageInputs label={`${variant.value || "Variant"} images`} urls={variant.image_urls} onChange={onImages} /></div>
        </div>
    );
}

function ImageInputs({ label, urls, onChange }) {
    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between"><p className="text-sm font-black">{label}</p><button type="button" className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-bold dark:border-zinc-700" onClick={() => onChange([...urls, ""])}>Add image</button></div>
            {urls.map((url, index) => <input className={field} key={index} value={url} onChange={(event) => onChange(urls.map((item, i) => i === index ? event.target.value : item))} placeholder="Image URL" required={index === 0} />)}
        </div>
    );
}

function productPayload(product, overrides = {}) {
    return {
        category_id: product.category_id,
        brand_id: product.brand_id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
        discount: Number(product.discount || 0),
        stock: Number(product.stock || 0),
        status: product.status,
        description: product.description,
        specifications: product.specifications || {},
        image_urls: product.images?.map((image) => image.url) || [],
        variants: product.variants?.map((variant) => ({
            id: variant.id,
            name: variant.name,
            value: variant.value,
            price_delta: Number(variant.price_delta || 0),
            stock: Number(variant.stock || 0),
            image_urls: variant.images?.map((image) => image.url) || [variant.image_url].filter(Boolean),
        })) || [],
        is_featured: product.is_featured,
        ...overrides,
    };
}
