import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Save, ShoppingCart, Star, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { activeDiscountPercent, originalPrice, peso, productImage, salePrice, variantLabel } from "../lib/helpers";

const inputClass = "min-h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const labelText = "text-xs font-black uppercase text-zinc-500";
const helpText = "text-xs text-zinc-500 dark:text-zinc-400";

function formatSpecs(specifications) {
    if (!specifications || Array.isArray(specifications) || typeof specifications !== "object") return [];
    return Object.entries(specifications).filter(([, value]) => value !== null && value !== "");
}

function specsToRows(specifications) {
    const entries = formatSpecs(specifications);
    return entries.length ? entries.map(([key, value]) => ({ key, value: String(value) })) : [{ key: "", value: "" }];
}

function rowsToSpecs(rows) {
    return rows.reduce((specs, row) => {
        if (row.key.trim() && row.value.trim()) specs[row.key.trim()] = row.value.trim();
        return specs;
    }, {});
}

function toEditForm(product) {
    const variantImages = (variant) => {
        const urls = variant.images?.map((image) => image.url).filter(Boolean) || [];
        return urls.length ? urls : [variant.image_url || ""];
    };

    return {
        name: product.name || "",
        sku: product.sku || "",
        price: product.price || "",
        compare_at_price: product.compare_at_price || "",
        discount: product.discount || 0,
        discount_starts_at: product.discount_starts_at ? product.discount_starts_at.slice(0, 16) : "",
        discount_ends_at: product.discount_ends_at ? product.discount_ends_at.slice(0, 16) : "",
        stock: product.stock || 0,
        status: product.status || "active",
        description: product.description || "",
        image_url: product.images?.[0]?.url || "",
        image_urls: product.images?.map((image) => image.url) || [""],
        specifications: specsToRows(product.specifications),
        variants: (product.variants || []).map((variant) => ({
            id: variant.id,
            name: variant.name || "Option",
            value: variant.value || "",
            image_url: variant.image_url || "",
            image_urls: variantImages(variant),
            price_delta: variant.price_delta || 0,
            discount: variant.discount || 0,
            discount_starts_at: variant.discount_starts_at ? variant.discount_starts_at.slice(0, 16) : "",
            discount_ends_at: variant.discount_ends_at ? variant.discount_ends_at.slice(0, 16) : "",
            stock: variant.stock || 0,
        })),
    };
}

export default function ProductDetails() {
    const [product, setProduct] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const slug = useLocation().pathname.split("/").pop();
    const { add } = useCartStore();
    const { user } = useAuthStore();
    const isAdmin = user?.role === "admin";

    useEffect(() => {
        api.get(`/products/${slug}`).then(({ data }) => {
            setProduct(data);
            setEditForm(toEditForm(data));
            setSelectedVariantId(data.variants?.find((variant) => Number(variant.stock) > 0)?.id || data.variants?.[0]?.id || null);
        });
    }, [slug]);

    function updateVariant(index, values) {
        setEditForm((current) => ({
            ...current,
            variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...values } : variant),
        }));
    }

    function addVariantRow() {
        setEditForm((current) => ({
            ...current,
            variants: [...current.variants, { name: "Color", value: "", image_url: "", image_urls: [""], price_delta: 0, discount: 0, discount_starts_at: "", discount_ends_at: "", stock: 0 }],
        }));
    }

    async function removeVariant(index) {
        const variant = editForm.variants[index];
        if (!variant?.id) {
            setEditForm((current) => ({
                ...current,
                variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
            }));
            return;
        }

        setMessage("");
        try {
            const { data } = await api.delete(`/admin/products/${product.id}/variants/${variant.id}`);
            setProduct(data);
            setEditForm(toEditForm(data));
            setSelectedVariantId(data.variants?.find((item) => Number(item.stock) > 0)?.id || data.variants?.[0]?.id || null);
            setMessage("Variant removed.");
        } catch (error) {
            setMessage(error.response?.data?.message || "Unable to remove variant.");
        }
    }

    async function saveProduct(event) {
        event.preventDefault();
        setMessage("");

        const specifications = rowsToSpecs(editForm.specifications);

        setSaving(true);
        try {
            const payload = {
                category_id: product.category_id,
                brand_id: product.brand_id,
                name: editForm.name,
                sku: editForm.sku,
                price: Number(editForm.price),
                compare_at_price: editForm.compare_at_price ? Number(editForm.compare_at_price) : null,
                discount: Number(editForm.discount || 0),
                discount_starts_at: editForm.discount_starts_at || null,
                discount_ends_at: editForm.discount_ends_at || null,
                stock: Number(editForm.stock || 0),
                status: editForm.status,
                description: editForm.description,
                specifications,
                image_url: editForm.image_url,
                image_urls: editForm.image_urls.filter(Boolean),
                variants: editForm.variants.map((variant) => ({
                    ...variant,
                    price_delta: Number(variant.price_delta || 0),
                    discount: Number(variant.discount || 0),
                    discount_starts_at: variant.discount_starts_at || null,
                    discount_ends_at: variant.discount_ends_at || null,
                    stock: Number(variant.stock || 0),
                    image_urls: (variant.image_urls || [variant.image_url]).filter(Boolean),
                })),
            };
            const { data } = await api.put(`/admin/products/${product.id}`, payload);
            setProduct(data);
            setEditForm(toEditForm(data));
            setMessage("Product updated.");
        } catch (error) {
            setMessage(error.response?.data?.message || "Unable to save product.");
        } finally {
            setSaving(false);
        }
    }

    if (!product) return <div className="mx-auto max-w-7xl px-4 py-16">Loading...</div>;

    const selectedVariant = product.variants?.find((variant) => variant.id === selectedVariantId) || null;
    const selectedPrice = salePrice(product, selectedVariant);
    const selectedOriginalPrice = originalPrice(product, selectedVariant);
    const selectedDiscount = activeDiscountPercent(product, selectedVariant);
    const selectedStock = selectedVariant ? Number(selectedVariant.stock || 0) : Number(product.stock || 0);
    const outOfStock = selectedStock <= 0;
    const specs = formatSpecs(product.specifications);
    const priceHistory = product.price_histories || [];

    return (
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-2">
            <div className="grid content-start gap-3">
                <img className="aspect-square rounded-lg object-cover" src={productImage(product, selectedVariant)} alt={product.name} />
                <div className="grid grid-cols-3 gap-3">
                    {product.images?.slice(0, 3).map((item) => (
                        <img className="aspect-square rounded-lg object-cover" key={item.id} src={item.url} alt="" />
                    ))}
                    {product.variants?.filter((variant) => variant.image_url).slice(0, 3).map((variant) => (
                        <button className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800" key={variant.id} onClick={() => setSelectedVariantId(variant.id)} type="button">
                            <img className="aspect-square object-cover" src={variant.image_url} alt={variantLabel(variant)} />
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{product.brand?.name}</p>
                <h1 className="mt-2 text-4xl font-black">{product.name}</h1>
                <p className="mt-3 flex items-center gap-2"><Star className="text-amber-400" fill="currentColor" /> {product.rating} rating from {product.reviews_count} reviews</p>
                <div className="mt-5">
                    <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{peso.format(selectedPrice)}</p>
                    {selectedDiscount > 0 && <p className="mt-1 text-sm font-bold text-zinc-500"><span className="line-through">{peso.format(selectedOriginalPrice)}</span> · {selectedDiscount}% off</p>}
                </div>
                <p className={`mt-2 text-sm font-black ${outOfStock ? "text-red-600 dark:text-red-300" : selectedStock <= 5 ? "text-amber-600 dark:text-amber-300" : "text-zinc-600 dark:text-zinc-300"}`}>
                    {outOfStock ? "Out of stock" : `${selectedStock} available${selectedVariant ? ` for ${selectedVariant.value}` : ""}`}
                </p>
                <p className="mt-5 text-zinc-600 dark:text-zinc-300">{product.description}</p>

                <section className="mt-7 border-t border-zinc-200 pt-5 dark:border-zinc-800">
                    <h2 className="text-lg font-black">Specifications</h2>
                    {specs.length ? (
                        <dl className="mt-3 grid gap-2 text-sm">
                            {specs.map(([key, value]) => (
                                <div className="grid grid-cols-[140px_1fr] gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900" key={key}>
                                    <dt className="font-bold capitalize text-zinc-500 dark:text-zinc-400">{key.replaceAll("_", " ")}</dt>
                                    <dd>{String(value)}</dd>
                                </div>
                            ))}
                        </dl>
                    ) : (
                        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No specifications listed.</p>
                    )}
                </section>

                {product.variants?.length > 0 && (
                    <div className="mt-6 grid gap-2">
                        <h2 className="text-sm font-black uppercase text-zinc-500">Variant</h2>
                        <div className="flex flex-wrap gap-2">
                            {product.variants.map((variant) => {
                                const selected = selectedVariantId === variant.id;
                                const unavailable = Number(variant.stock) <= 0;

                                return (
                                    <button
                                        className={`rounded-lg border px-3 py-2 text-sm font-bold ${selected ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-zinc-200 dark:border-zinc-700"} ${unavailable ? "opacity-50" : ""}`}
                                        key={variant.id}
                                        onClick={() => setSelectedVariantId(variant.id)}
                                        type="button"
                                    >
                                        {variantLabel(variant)} {Number(variant.price_delta) > 0 ? `+ ${peso.format(variant.price_delta)}` : ""} {activeDiscountPercent(product, variant) > 0 ? `· ${activeDiscountPercent(product, variant)}% off` : ""} · {variant.stock} left
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!isAdmin && (
                    <button disabled={outOfStock || (product.variants?.length > 0 && !selectedVariant)} onClick={() => add(product, selectedVariant)} className="mt-7 flex items-center gap-2 rounded-lg bg-zinc-950 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-white dark:text-zinc-950 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-300">
                        <ShoppingCart /> {outOfStock ? "Unavailable" : "Add to cart"}
                    </button>
                )}

                {isAdmin && editForm && (
                    <form className="mt-8 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900" onSubmit={saveProduct}>
                        <h2 className="text-lg font-black">Edit Product</h2>
                        <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <label className="grid gap-1"><span className={labelText}>Product name</span><input className={inputClass} value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} placeholder="Customer-facing product name" required /></label>
                            <label className="grid gap-1"><span className={labelText}>SKU</span><input className={inputClass} value={editForm.sku} onChange={(event) => setEditForm({ ...editForm, sku: event.target.value })} placeholder="Unique inventory code" required /></label>
                            <label className="grid gap-1"><span className={labelText}>Base price</span><input className={inputClass} type="number" min="0" step="0.01" value={editForm.price} onChange={(event) => setEditForm({ ...editForm, price: event.target.value })} placeholder="Main product price" required /></label>
                            <label className="grid gap-1"><span className={labelText}>Compare-at price</span><input className={inputClass} type="number" min="0" step="0.01" value={editForm.compare_at_price || ""} onChange={(event) => setEditForm({ ...editForm, compare_at_price: event.target.value })} placeholder="Optional old or crossed-out price" /></label>
                            <label className="grid gap-1"><span className={labelText}>Product discount percent</span><input className={inputClass} type="number" min="0" max="100" value={editForm.discount} onChange={(event) => setEditForm({ ...editForm, discount: event.target.value })} placeholder="Example: 15 for 15% off" /></label>
                            <label className="grid gap-1"><span className={labelText}>Discount starts</span><input className={inputClass} type="datetime-local" value={editForm.discount_starts_at} onChange={(event) => setEditForm({ ...editForm, discount_starts_at: event.target.value })} /></label>
                            <label className="grid gap-1"><span className={labelText}>Discount ends</span><input className={inputClass} type="datetime-local" value={editForm.discount_ends_at} onChange={(event) => setEditForm({ ...editForm, discount_ends_at: event.target.value })} /></label>
                            <label className="grid gap-1"><span className={labelText}>Product stock</span><input className={inputClass} type="number" min="0" value={editForm.stock} onChange={(event) => setEditForm({ ...editForm, stock: event.target.value })} placeholder={editForm.variants.length ? "Stock is computed from variants" : "Stock"} disabled={editForm.variants.length > 0} required /></label>
                            <label className="grid gap-1"><span className={labelText}>Product status</span><select className={inputClass} value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                                <option value="active">active - visible to customers</option>
                                <option value="draft">draft - hidden while editing</option>
                                <option value="archived">archived - removed from shopping</option>
                            </select></label>
                        </div>
                        <p className={helpText}>{editForm.variants.length ? "Edit stock per variant below. Product stock is the total of all variant stock." : "Use product stock only when the product has no variants."}</p>
                        <div className="grid gap-2">
                            <p className="text-sm font-black">Product Images</p>
                            <p className={helpText}>Paste direct image URLs. The first image is used as the main product image unless a variant image is selected.</p>
                            {editForm.image_urls.map((url, index) => (
                                <label className="grid gap-1" key={index}><span className={labelText}>{index === 0 ? "Primary product image URL" : `Extra product image URL ${index + 1}`}</span><input className={inputClass} value={url} onChange={(event) => setEditForm({ ...editForm, image_urls: editForm.image_urls.map((item, i) => i === index ? event.target.value : item), image_url: index === 0 ? event.target.value : editForm.image_url })} placeholder="https://example.com/product-image.jpg" required={index === 0 && editForm.variants.length === 0} /></label>
                            ))}
                            <button className="w-fit rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold dark:border-zinc-700" type="button" onClick={() => setEditForm({ ...editForm, image_urls: [...editForm.image_urls, ""] })}>Add product image</button>
                        </div>
                        <label className="grid gap-1"><span className={labelText}>Description</span><textarea className={inputClass} rows="4" value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} placeholder="Customer-facing product description" required /></label>
                        <SpecificationInputs rows={editForm.specifications} onChange={(specifications) => setEditForm({ ...editForm, specifications })} />
                        <section className="grid gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="font-black">Variants</h3>
                                <button className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold dark:border-zinc-700" type="button" onClick={addVariantRow}>Add variant</button>
                            </div>
                            {editForm.variants.map((variant, index) => (
                                <div className="grid gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950 md:grid-cols-2" key={variant.id || index}>
                                    <div className="flex items-start justify-between gap-3 md:col-span-2">
                                        <div>
                                            <p className="text-sm font-black">Variant {index + 1}</p>
                                            <p className={helpText}>Remove mistaken variants without deleting old order history.</p>
                                        </div>
                                        <button className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 dark:border-red-500/40 dark:text-red-300" type="button" onClick={() => removeVariant(index)}><Trash2 size={14} /> Remove</button>
                                    </div>
                                    <label className="grid gap-1"><span className={labelText}>Variant type</span><input className={inputClass} value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} placeholder="Example: Color, Size, Storage" required /></label>
                                    <label className="grid gap-1"><span className={labelText}>Variant value</span><input className={inputClass} value={variant.value} onChange={(event) => updateVariant(index, { value: event.target.value })} placeholder="Example: Black, Large, 128GB" required /></label>
                                    <label className="grid gap-1"><span className={labelText}>Additional price</span><input className={inputClass} type="number" min="0" step="0.01" value={variant.price_delta} onChange={(event) => updateVariant(index, { price_delta: event.target.value })} placeholder="0 if same as base price" /></label>
                                    <label className="grid gap-1"><span className={labelText}>Variant discount percent</span><input className={inputClass} type="number" min="0" max="100" value={variant.discount || 0} onChange={(event) => updateVariant(index, { discount: event.target.value })} placeholder="Overrides product discount when active" /></label>
                                    <label className="grid gap-1"><span className={labelText}>Variant discount starts</span><input className={inputClass} type="datetime-local" value={variant.discount_starts_at || ""} onChange={(event) => updateVariant(index, { discount_starts_at: event.target.value })} /></label>
                                    <label className="grid gap-1"><span className={labelText}>Variant discount ends</span><input className={inputClass} type="datetime-local" value={variant.discount_ends_at || ""} onChange={(event) => updateVariant(index, { discount_ends_at: event.target.value })} /></label>
                                    <label className="grid gap-1"><span className={labelText}>Variant stock</span><input className={inputClass} type="number" min="0" value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} placeholder="Available quantity for this variant" required /></label>
                                    <div className="grid gap-2 md:col-span-2">
                                        <p className="text-xs font-black uppercase text-zinc-500">Variant images</p>
                                        <p className={helpText}>Each variant should have its own image. The first image becomes the variant main image.</p>
                                        {(variant.image_urls || [""]).map((url, imageIndex) => (
                                            <label className="grid gap-1" key={imageIndex}><span className={labelText}>{imageIndex === 0 ? "Primary variant image URL" : `Extra variant image URL ${imageIndex + 1}`}</span><input className={inputClass} value={url} onChange={(event) => updateVariant(index, { image_urls: (variant.image_urls || [""]).map((item, i) => i === imageIndex ? event.target.value : item), image_url: imageIndex === 0 ? event.target.value : variant.image_url })} placeholder="https://example.com/variant-image.jpg" required={imageIndex === 0} /></label>
                                        ))}
                                        <button className="w-fit rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold dark:border-zinc-700" type="button" onClick={() => updateVariant(index, { image_urls: [...(variant.image_urls || [""]), ""] })}>Add variant image</button>
                                    </div>
                                </div>
                            ))}
                        </section>
                        <div className="flex flex-wrap items-center gap-3">
                            <button disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-black text-white disabled:cursor-wait disabled:bg-emerald-400"><Save size={18} /> {saving ? "Saving..." : "Save changes"}</button>
                            {message && <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">{message}</span>}
                        </div>
                    </form>
                )}

                {isAdmin && (
                    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="text-lg font-black">Price History</h2>
                        <div className="mt-3 grid gap-2 text-sm">
                            {priceHistory.length ? priceHistory.map((history) => (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950" key={history.id}>
                                    <span className="font-bold">{history.old_price ? peso.format(history.old_price) : "Initial price"} to {peso.format(history.new_price)}</span>
                                    <span className="text-xs text-zinc-500">{new Date(history.created_at).toLocaleString()} by {history.user?.name || "system"}</span>
                                </div>
                            )) : <p className="text-zinc-500 dark:text-zinc-400">No price changes recorded yet.</p>}
                        </div>
                    </section>
                )}
            </div>
        </section>
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
                    <p className={helpText}>Use simple name and value pairs. No JSON formatting needed.</p>
                </div>
                <button className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold dark:border-zinc-700" type="button" onClick={() => onChange([...rows, { key: "", value: "" }])}>Add spec</button>
            </div>
            {rows.map((row, index) => (
                <div className="grid gap-2 md:grid-cols-2" key={index}>
                    <label className="grid gap-1"><span className={labelText}>Specification name</span><input className={inputClass} value={row.key} onChange={(event) => updateRow(index, { key: event.target.value })} placeholder="Example: Material, Warranty, Origin" /></label>
                    <label className="grid gap-1"><span className={labelText}>Specification value</span><input className={inputClass} value={row.value} onChange={(event) => updateRow(index, { value: event.target.value })} placeholder="Example: Canvas, 1 year, Philippines" /></label>
                </div>
            ))}
        </section>
    );
}
