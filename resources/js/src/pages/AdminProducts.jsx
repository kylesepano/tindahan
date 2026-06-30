import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { api } from "../services/api";
import { field, peso, productImage, variantLabel } from "../lib/helpers";

const blankVariant = { name: "Color", value: "", price_delta: 0, discount: 0, discount_starts_at: "", discount_ends_at: "", stock: 0, image_urls: [""] };
const blankForm = {
    category_id: "",
    brand_id: "",
    name: "",
    sku: "",
    price: "",
    compare_at_price: "",
    discount: 0,
    discount_starts_at: "",
    discount_ends_at: "",
    status: "active",
    description: "",
    specifications: [{ key: "", value: "" }],
    is_featured: false,
    image_urls: [""],
    variants: [{ ...blankVariant }],
};
const labelText = "text-xs font-black uppercase text-zinc-500";
const helpText = "text-xs text-zinc-500 dark:text-zinc-400";

function specificationsToObject(rows) {
    return rows.reduce((specs, row) => {
        if (row.key.trim() && row.value.trim()) specs[row.key.trim()] = row.value.trim();
        return specs;
    }, {});
}

function existingVariantImages(variant) {
    const urls = variant.images?.map((image) => image.url).filter(Boolean) || [];
    return urls.length ? urls : [variant.image_url].filter(Boolean);
}

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [featuredOnly, setFeaturedOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState(blankForm);
    const [message, setMessage] = useState("");

    useEffect(() => { api.get("/admin/categories").then(({ data }) => setCategories(data)); }, []);
    useEffect(() => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (categoryFilter) params.set("category", categoryFilter);
        if (statusFilter) params.set("status", statusFilter);
        if (featuredOnly) params.set("featured", "1");
        params.set("page", page);
        api.get(`/admin/products?${params}`).then(({ data }) => {
            setProducts(data.data || []);
            setPagination(data);
        });
    }, [search, categoryFilter, statusFilter, featuredOnly, page]);

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
        const specifications = specificationsToObject(form.specifications);

        try {
            const variants = form.variants.filter((variant) => variant.value.trim()).map((variant) => ({
                ...variant,
                stock: Number(variant.stock || 0),
                price_delta: Number(variant.price_delta || 0),
                discount: Number(variant.discount || 0),
                discount_starts_at: variant.discount_starts_at || null,
                discount_ends_at: variant.discount_ends_at || null,
                image_urls: variant.image_urls.filter(Boolean),
            }));
            const payload = {
                ...form,
                category_id: Number(form.category_id),
                brand_id: form.brand_id ? Number(form.brand_id) : null,
                price: Number(form.price),
                compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
                discount: Number(form.discount || 0),
                discount_starts_at: form.discount_starts_at || null,
                discount_ends_at: form.discount_ends_at || null,
                stock: variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0),
                image_urls: form.image_urls.filter(Boolean),
                variants,
                specifications,
            };
            const { data } = await api.post("/admin/products", payload);
            setProducts((current) => [data, ...current]);
            setForm(blankForm);
            setShowAddModal(false);
            setMessage("Product added.");
        } catch (error) {
            setMessage(error.response?.data?.message || "Unable to add product.");
        }
    }

    async function toggleFeatured(product) {
        const { data } = await api.patch(`/admin/products/${product.id}/featured`, { is_featured: !product.is_featured });
        setProducts((current) => current.map((item) => item.id === product.id ? data : item));
    }

    async function deleteProduct(product) {
        const { data } = await api.delete(`/admin/products/${product.id}`);
        setProducts((current) => statusFilter === "deleted"
            ? current.map((item) => item.id === product.id ? data : item)
            : current.filter((item) => item.id !== product.id));
        setMessage("Product moved to deleted products.");
    }

    async function restoreProduct(product) {
        const { data } = await api.patch(`/admin/products/${product.id}/restore`);
        setProducts((current) => statusFilter === "deleted"
            ? current.filter((item) => item.id !== product.id)
            : current.map((item) => item.id === product.id ? data : item));
        setMessage("Product restored.");
    }

    function updateSearch(value) {
        setSearch(value);
        setPage(1);
    }

    function updateFeaturedOnly(value) {
        setFeaturedOnly(value);
        setPage(1);
    }

    function updateCategoryFilter(value) {
        setCategoryFilter(value);
        setPage(1);
    }

    function updateStatusFilter(value) {
        setStatusFilter(value);
        setPage(1);
    }

    return (
        <section className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-black">Admin Products</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Search products, manage featured home items, add variants, edit images, and control stock from variants.</p>
            </div>
            <div className="mb-5 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[1fr_200px_180px_auto_auto]">
                <label className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 dark:border-zinc-700"><Search size={18} /><input className="w-full bg-transparent py-2 outline-none" placeholder="Search products or SKU" value={search} onChange={(event) => updateSearch(event.target.value)} /></label>
                <select className={field} value={categoryFilter} onChange={(event) => updateCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}{category.deleted_at ? " (deleted)" : ""}</option>)}</select>
                <select className={field} value={statusFilter} onChange={(event) => updateStatusFilter(event.target.value)}><option value="">All active records</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option><option value="deleted">Deleted</option></select>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={featuredOnly} onChange={(event) => updateFeaturedOnly(event.target.checked)} /> Featured only</label>
                <button className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white" onClick={() => { setMessage(""); setShowAddModal(true); }} type="button"><Plus size={16} /> Add product</button>
            </div>
            {message && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{message}</p>}
            <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-xl font-black">Featured Home Products</h2>
                <div className="mt-3 flex flex-wrap gap-2">{featured.length ? featured.map((product) => <button className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" key={product.id} onClick={() => toggleFeatured(product)}>{product.name} ×</button>) : <p className="text-sm text-zinc-500">No featured products selected.</p>}</div>
            </section>
            {showAddModal && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/70 px-4 py-6">
                    <section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
                            <div>
                                <h2 className="text-xl font-black">Add Product</h2>
                                <p className={helpText}>Create product details, images, variants, stock, and featured status.</p>
                            </div>
                            <button className="rounded-full border border-zinc-300 p-2 dark:border-zinc-700" onClick={() => setShowAddModal(false)} type="button" aria-label="Close add product"><X size={18} /></button>
                        </div>
                        <form className="mt-4 grid gap-3" onSubmit={addProduct}>
                    <div className="grid gap-3 md:grid-cols-3">
                        <label className="grid gap-1"><span className={labelText}>Product name</span><input className={field} placeholder="Example: Canvas Street Sneakers" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
                        <label className="grid gap-1"><span className={labelText}>SKU</span><input className={field} placeholder="Unique code, example: SNK-001" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} required /></label>
                        <label className="grid gap-1"><span className={labelText}>Category</span><select className={field} value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} required><option value="">Select category</option>{categories.filter((category) => !category.deleted_at).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
                        <label className="grid gap-1"><span className={labelText}>Base price</span><input className={field} type="number" min="0" step="0.01" placeholder="Main price before variant add-ons" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required /></label>
                        <label className="grid gap-1"><span className={labelText}>Compare-at price</span><input className={field} type="number" min="0" step="0.01" placeholder="Optional old price for sale display" value={form.compare_at_price} onChange={(event) => setForm({ ...form, compare_at_price: event.target.value })} /></label>
                        <label className="grid gap-1"><span className={labelText}>Product discount percent</span><input className={field} type="number" min="0" max="100" placeholder="Example: 15 for 15% off" value={form.discount} onChange={(event) => setForm({ ...form, discount: event.target.value })} /></label>
                        <label className="grid gap-1"><span className={labelText}>Discount starts</span><input className={field} type="datetime-local" value={form.discount_starts_at} onChange={(event) => setForm({ ...form, discount_starts_at: event.target.value })} /></label>
                        <label className="grid gap-1"><span className={labelText}>Discount ends</span><input className={field} type="datetime-local" value={form.discount_ends_at} onChange={(event) => setForm({ ...form, discount_ends_at: event.target.value })} /></label>
                        <label className="grid gap-1"><span className={labelText}>Product status</span><select className={field} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">active - visible to customers</option><option value="draft">draft - hidden while editing</option><option value="archived">archived - removed from shopping</option></select></label>
                    </div>
                    <label className="grid gap-1"><span className={labelText}>Description</span><textarea className={field} rows="3" placeholder="Short customer-facing product description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></label>
                    <SpecificationInputs rows={form.specifications} onChange={(specifications) => setForm({ ...form, specifications })} />
                    <ImageInputs label="Product images" urls={form.image_urls} onChange={(urls) => setForm({ ...form, image_urls: urls })} />
                    <div className="grid gap-3">
                        <div className="flex items-center justify-between"><h3 className="font-black">Variants</h3><button type="button" className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold dark:border-zinc-700" onClick={() => setForm({ ...form, variants: [...form.variants, { ...blankVariant, image_urls: [""] }] })}><Plus size={16} /> Add variant</button></div>
                        {form.variants.map((variant, index) => <VariantForm key={index} variant={variant} onChange={(values) => updateVariant(index, values)} onImageChange={(imageIndex, value) => updateVariantImage(index, imageIndex, value)} onImages={(urls) => updateVariant(index, { image_urls: urls })} />)}
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /> Show on featured home list</label>
                            <div className="flex items-center gap-3"><button className="rounded-lg bg-emerald-600 px-4 py-2 font-black text-white">Add product</button><button className="rounded-lg border border-zinc-300 px-4 py-2 font-bold dark:border-zinc-700" type="button" onClick={() => setShowAddModal(false)}>Cancel</button>{message && <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">{message}</span>}</div>
                        </form>
                    </section>
                </div>
            )}
            <div className="grid gap-3">
                {products.map((product) => <ProductRow key={product.id} product={product} onFeatured={() => toggleFeatured(product)} onDelete={() => deleteProduct(product)} onRestore={() => restoreProduct(product)} />)}
            </div>
            {pagination && pagination.last_page > 1 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="font-bold text-zinc-600 dark:text-zinc-300">Page {pagination.current_page} of {pagination.last_page} - {pagination.total} products</p>
                    <div className="flex gap-2">
                        <button className="rounded-lg border border-zinc-300 px-3 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
                        <button className="rounded-lg border border-zinc-300 px-3 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700" disabled={page >= pagination.last_page} onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}>Next</button>
                    </div>
                </div>
            )}
        </section>
    );
}

function ProductRow({ product, onFeatured, onDelete, onRestore }) {
    const isDeleted = Boolean(product.deleted_at);

    return (
        <article className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[90px_1fr_auto]">
            <img className="h-24 w-24 rounded-lg object-cover" src={productImage(product)} alt="" />
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link className="text-lg font-black hover:text-emerald-700 dark:hover:text-emerald-300" to={`/products/${product.slug}`}>{product.name}</Link>
                    {isDeleted && <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">Deleted</span>}
                </div>
                <p className="text-sm text-zinc-500">{product.sku} · {product.category?.name} · {peso.format(product.price)}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">{product.variants?.map((variant) => <span className={Number(variant.stock) <= 5 ? "rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" : "rounded-full bg-zinc-100 px-2 py-1 font-bold dark:bg-zinc-800"} key={variant.id}>{variantLabel(variant)}: {variant.stock}</span>)}</div>
            </div>
            <div className="flex flex-wrap items-start gap-2 md:justify-end">
                {isDeleted ? (
                    <button className="flex h-10 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm font-bold dark:border-zinc-700" onClick={onRestore} type="button"><RotateCcw size={16} /> Restore</button>
                ) : (
                    <>
                        <button className="h-10 rounded-lg border border-zinc-300 px-3 text-sm font-bold dark:border-zinc-700" onClick={onFeatured} type="button">{product.is_featured ? "Unfeature" : "Feature"}</button>
                        <button className="flex h-10 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-bold text-rose-700 dark:border-rose-900/70 dark:text-rose-200" onClick={onDelete} type="button"><Trash2 size={16} /> Delete</button>
                    </>
                )}
            </div>
        </article>
    );
}

function VariantForm({ variant, onChange, onImages }) {
    return (
        <div className="grid gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950 md:grid-cols-2">
            <label className="grid gap-1"><span className={labelText}>Variant type</span><input className={field} value={variant.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Example: Color, Size, Storage" required /></label>
            <label className="grid gap-1"><span className={labelText}>Variant value</span><input className={field} value={variant.value} onChange={(event) => onChange({ value: event.target.value })} placeholder="Example: Black, Large, 128GB" required /></label>
            <label className="grid gap-1"><span className={labelText}>Additional price</span><input className={field} type="number" min="0" step="0.01" value={variant.price_delta} onChange={(event) => onChange({ price_delta: event.target.value })} placeholder="0 if same price as base product" /></label>
            <label className="grid gap-1"><span className={labelText}>Variant discount percent</span><input className={field} type="number" min="0" max="100" value={variant.discount || 0} onChange={(event) => onChange({ discount: event.target.value })} placeholder="Overrides product discount when active" /></label>
            <label className="grid gap-1"><span className={labelText}>Variant discount starts</span><input className={field} type="datetime-local" value={variant.discount_starts_at || ""} onChange={(event) => onChange({ discount_starts_at: event.target.value })} /></label>
            <label className="grid gap-1"><span className={labelText}>Variant discount ends</span><input className={field} type="datetime-local" value={variant.discount_ends_at || ""} onChange={(event) => onChange({ discount_ends_at: event.target.value })} /></label>
            <label className="grid gap-1"><span className={labelText}>Variant stock</span><input className={field} type="number" min="0" value={variant.stock} onChange={(event) => onChange({ stock: event.target.value })} placeholder="Available quantity for this variant" required /></label>
            <div className="md:col-span-2"><ImageInputs label={`${variant.value || "Variant"} images`} urls={variant.image_urls} onChange={onImages} /></div>
        </div>
    );
}

function SpecificationInputs({ rows, onChange }) {
    function updateRow(index, values) {
        onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...values } : row));
    }

    return (
        <section className="grid gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-black">Specifications</h3>
                    <p className={helpText}>Add simple product facts. These appear on the product details page.</p>
                </div>
                <button type="button" className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-bold dark:border-zinc-700" onClick={() => onChange([...rows, { key: "", value: "" }])}>Add spec</button>
            </div>
            {rows.map((row, index) => (
                <div className="grid gap-2 md:grid-cols-2" key={index}>
                    <label className="grid gap-1"><span className={labelText}>Specification name</span><input className={field} value={row.key} onChange={(event) => updateRow(index, { key: event.target.value })} placeholder="Example: Material, Warranty, Origin" /></label>
                    <label className="grid gap-1"><span className={labelText}>Specification value</span><input className={field} value={row.value} onChange={(event) => updateRow(index, { value: event.target.value })} placeholder="Example: Canvas, 1 year, Philippines" /></label>
                </div>
            ))}
        </section>
    );
}

function ImageInputs({ label, urls, onChange }) {
    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between"><div><p className="text-sm font-black">{label}</p><p className={helpText}>Paste direct image URLs. The first image becomes the main display image.</p></div><button type="button" className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-bold dark:border-zinc-700" onClick={() => onChange([...urls, ""])}>Add image</button></div>
            {urls.map((url, index) => <label className="grid gap-1" key={index}><span className={labelText}>{index === 0 ? "Primary image URL" : `Extra image URL ${index + 1}`}</span><input className={field} value={url} onChange={(event) => onChange(urls.map((item, i) => i === index ? event.target.value : item))} placeholder="https://example.com/product-image.jpg" required={index === 0} /></label>)}
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
        discount_starts_at: product.discount_starts_at || null,
        discount_ends_at: product.discount_ends_at || null,
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
            discount: Number(variant.discount || 0),
            discount_starts_at: variant.discount_starts_at || null,
            discount_ends_at: variant.discount_ends_at || null,
            stock: Number(variant.stock || 0),
            image_urls: existingVariantImages(variant),
        })) || [],
        is_featured: product.is_featured,
        ...overrides,
    };
}
