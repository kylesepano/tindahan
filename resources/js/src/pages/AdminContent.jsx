import { useEffect, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { field } from "../lib/helpers";

const labelText = "text-xs font-black uppercase text-zinc-500";
const blankCategory = { name: "", description: "", image: "", is_active: true };
const blankBanner = { title: "", subtitle: "", image: "", cta_label: "Shop now", cta_url: "/products", is_active: true };
const blankCoupon = { code: "", type: "percentage", value: "", minimum_spend: 0, usage_limit: "", expires_at: "", is_active: true };

export default function AdminContent() {
    const [categories, setCategories] = useState([]);
    const [banners, setBanners] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [categoryForm, setCategoryForm] = useState(blankCategory);
    const [bannerForm, setBannerForm] = useState(blankBanner);
    const [couponForm, setCouponForm] = useState(blankCoupon);
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadContent();
    }, []);

    async function loadContent() {
        const [{ data: categoryData }, { data: bannerData }, { data: couponData }] = await Promise.all([
            api.get("/admin/categories"),
            api.get("/admin/banners"),
            api.get("/admin/coupons"),
        ]);
        setCategories(categoryData);
        setBanners(bannerData);
        setCoupons(couponData);
    }

    async function addCategory(event) {
        event.preventDefault();
        setMessage("");
        try {
            const { data } = await api.post("/admin/categories", categoryForm);
            setCategories((current) => [...current, { ...data, products_count: 0 }]);
            setCategoryForm(blankCategory);
            setMessage("Category added.");
        } catch (error) {
            setMessage(error.response?.data?.message || "Unable to add category.");
        }
    }

    async function deleteCategory(category) {
        const { data } = await api.delete(`/admin/categories/${category.id}`);
        setCategories((current) => current.map((item) => item.id === category.id ? data : item));
        setMessage("Category moved to deleted categories.");
    }

    async function restoreCategory(category) {
        const { data } = await api.patch(`/admin/categories/${category.id}/restore`);
        setCategories((current) => current.map((item) => item.id === category.id ? data : item));
        setMessage("Category restored.");
    }

    async function addBanner(event) {
        event.preventDefault();
        setMessage("");
        try {
            const { data } = await api.post("/admin/banners", bannerForm);
            setBanners((current) => [data, ...current]);
            setBannerForm(blankBanner);
            setMessage("Banner added.");
        } catch (error) {
            setMessage(error.response?.data?.message || "Unable to add banner.");
        }
    }

    async function addCoupon(event) {
        event.preventDefault();
        setMessage("");
        try {
            const payload = {
                ...couponForm,
                code: couponForm.code.toUpperCase(),
                value: Number(couponForm.value),
                minimum_spend: Number(couponForm.minimum_spend || 0),
                usage_limit: couponForm.usage_limit ? Number(couponForm.usage_limit) : null,
                expires_at: couponForm.expires_at || null,
            };
            const { data } = await api.post("/admin/coupons", payload);
            setCoupons((current) => [data, ...current]);
            setCouponForm(blankCoupon);
            setMessage("Coupon added.");
        } catch (error) {
            setMessage(error.response?.data?.message || "Unable to add coupon.");
        }
    }

    async function toggleBanner(banner) {
        const { data } = await api.put(`/admin/banners/${banner.id}`, { ...banner, is_active: !banner.is_active });
        setBanners((current) => current.map((item) => item.id === banner.id ? data : item));
    }

    async function toggleCoupon(coupon) {
        const { data } = await api.patch(`/admin/coupons/${coupon.id}`, { is_active: !coupon.is_active });
        setCoupons((current) => current.map((item) => item.id === coupon.id ? data : item));
    }

    return (
        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-2">
            <div>
                <h1 className="text-3xl font-black">Content Management</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Manage storefront banners, product categories, and checkout coupons.</p>
                {message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{message}</p>}
            </div>

            <form className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:col-start-1" onSubmit={addCategory}>
                <h2 className="text-xl font-black">Add Category</h2>
                <label className="grid gap-1"><span className={labelText}>Category name</span><input className={field} value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Example: Accessories" required /></label>
                <label className="grid gap-1"><span className={labelText}>Description</span><textarea className={field} value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} placeholder="Short category description" rows="3" /></label>
                <label className="grid gap-1"><span className={labelText}>Category image URL</span><input className={field} value={categoryForm.image} onChange={(event) => setCategoryForm({ ...categoryForm, image: event.target.value })} placeholder="https://example.com/category.jpg" /></label>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={categoryForm.is_active} onChange={(event) => setCategoryForm({ ...categoryForm, is_active: event.target.checked })} /> Active category</label>
                <button className="flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-black text-white"><Plus size={16} /> Add category</button>
            </form>

            <form className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:col-start-2 lg:row-start-2" onSubmit={addBanner}>
                <h2 className="text-xl font-black">Add Home Banner</h2>
                <label className="grid gap-1"><span className={labelText}>Banner title</span><input className={field} value={bannerForm.title} onChange={(event) => setBannerForm({ ...bannerForm, title: event.target.value })} placeholder="Example: Midyear Picks Are Live" required /></label>
                <label className="grid gap-1"><span className={labelText}>Subtitle</span><input className={field} value={bannerForm.subtitle} onChange={(event) => setBannerForm({ ...bannerForm, subtitle: event.target.value })} placeholder="Short hero copy" /></label>
                <label className="grid gap-1"><span className={labelText}>Banner image URL</span><input className={field} value={bannerForm.image} onChange={(event) => setBannerForm({ ...bannerForm, image: event.target.value })} placeholder="https://example.com/banner.jpg" required /></label>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1"><span className={labelText}>Button label</span><input className={field} value={bannerForm.cta_label} onChange={(event) => setBannerForm({ ...bannerForm, cta_label: event.target.value })} placeholder="Shop now" /></label>
                    <label className="grid gap-1"><span className={labelText}>Button URL</span><input className={field} value={bannerForm.cta_url} onChange={(event) => setBannerForm({ ...bannerForm, cta_url: event.target.value })} placeholder="/products" /></label>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={bannerForm.is_active} onChange={(event) => setBannerForm({ ...bannerForm, is_active: event.target.checked })} /> Active banner</label>
                <button className="flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-black text-white"><Plus size={16} /> Add banner</button>
            </form>

            <form className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2" onSubmit={addCoupon}>
                <h2 className="text-xl font-black">Add Coupon</h2>
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="grid gap-1"><span className={labelText}>Coupon code</span><input className={field} value={couponForm.code} onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value.toUpperCase() })} placeholder="WELCOME10" required /></label>
                    <label className="grid gap-1"><span className={labelText}>Discount type</span><select className={field} value={couponForm.type} onChange={(event) => setCouponForm({ ...couponForm, type: event.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
                    <label className="grid gap-1"><span className={labelText}>Discount value</span><input className={field} type="number" min="0.01" step="0.01" value={couponForm.value} onChange={(event) => setCouponForm({ ...couponForm, value: event.target.value })} placeholder={couponForm.type === "percentage" ? "10" : "150"} required /></label>
                    <label className="grid gap-1"><span className={labelText}>Minimum spend</span><input className={field} type="number" min="0" step="0.01" value={couponForm.minimum_spend} onChange={(event) => setCouponForm({ ...couponForm, minimum_spend: event.target.value })} placeholder="1000" /></label>
                    <label className="grid gap-1"><span className={labelText}>Usage limit</span><input className={field} type="number" min="1" value={couponForm.usage_limit} onChange={(event) => setCouponForm({ ...couponForm, usage_limit: event.target.value })} placeholder="Optional" /></label>
                    <label className="grid gap-1"><span className={labelText}>Expiry date</span><input className={field} type="date" value={couponForm.expires_at} onChange={(event) => setCouponForm({ ...couponForm, expires_at: event.target.value })} /></label>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={couponForm.is_active} onChange={(event) => setCouponForm({ ...couponForm, is_active: event.target.checked })} /> Active coupon</label>
                <button className="flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-black text-white"><Plus size={16} /> Add coupon</button>
            </form>

            <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-xl font-black">Categories</h2>
                {categories.map((category) => (
                    <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950" key={category.id}>
                        {category.image && <img className="h-12 w-12 rounded-lg object-cover" src={category.image} alt="" />}
                        {category.deleted_at && <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">Deleted</span>}
                        <div className="order-last ml-auto">
                            {category.deleted_at ? (
                                <button className="flex h-10 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm font-bold dark:border-zinc-700" type="button" onClick={() => restoreCategory(category)}><RotateCcw size={16} /> Restore</button>
                            ) : (
                                <button className="flex h-10 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-bold text-rose-700 dark:border-rose-900/70 dark:text-rose-200" type="button" onClick={() => deleteCategory(category)}><Trash2 size={16} /> Delete</button>
                            )}
                        </div>
                        <div><p className="font-black">{category.name}</p><p className="text-xs text-zinc-500">{category.slug} · {category.products_count || 0} products</p></div>
                    </div>
                ))}
            </section>

            <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-xl font-black">Home Banners</h2>
                {banners.map((banner) => (
                    <div className="grid gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950 md:grid-cols-[120px_1fr_auto]" key={banner.id}>
                        <img className="h-20 w-full rounded-lg object-cover" src={banner.image} alt="" />
                        <div><p className="font-black">{banner.title}</p><p className="text-sm text-zinc-500">{banner.subtitle}</p><p className="text-xs text-zinc-500">{banner.cta_label} · {banner.cta_url}</p></div>
                        <button className="h-10 rounded-lg border border-zinc-300 px-3 text-sm font-bold dark:border-zinc-700" type="button" onClick={() => toggleBanner(banner)}>{banner.is_active ? "Disable" : "Enable"}</button>
                    </div>
                ))}
            </section>

            <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
                <h2 className="text-xl font-black">Coupons</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    {coupons.map((coupon) => (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950" key={coupon.id}>
                            <div>
                                <p className="font-black">{coupon.code}</p>
                                <p className="text-sm text-zinc-500">{coupon.type === "percentage" ? `${coupon.value}% off` : `PHP ${coupon.value} off`} · min PHP {coupon.minimum_spend}</p>
                                <p className="text-xs text-zinc-500">Used {coupon.used_count || 0}{coupon.usage_limit ? ` of ${coupon.usage_limit}` : ""}{coupon.expires_at ? ` · expires ${new Date(coupon.expires_at).toLocaleDateString()}` : ""}</p>
                            </div>
                            <button className="h-10 rounded-lg border border-zinc-300 px-3 text-sm font-bold dark:border-zinc-700" type="button" onClick={() => toggleCoupon(coupon)}>{coupon.is_active ? "Disable" : "Enable"}</button>
                        </div>
                    ))}
                </div>
            </section>
        </section>
    );
}
