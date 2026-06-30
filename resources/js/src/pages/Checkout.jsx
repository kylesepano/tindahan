import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { CreditCard, Tag, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { useCartStore } from "../store/cartStore";
import { field, getToken, peso, productImage, variantLabel } from "../lib/helpers";

const emptyAddress = { recipient_name: "", phone: "", line1: "", city: "", province: "", postal_code: "" };

export default function Checkout() {
    const navigate = useNavigate();
    const { items, update, changeVariant, clear } = useCartStore();
    const [profile, setProfile] = useState(null);
    const [address, setAddress] = useState(emptyAddress);
    const [payment, setPayment] = useState(null);
    const [codOrder, setCodOrder] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("online");
    const [busy, setBusy] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false);
    const [addressSaved, setAddressSaved] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [coupon, setCoupon] = useState(null);
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [error, setError] = useState("");

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [items]);
    const discount = Number(coupon?.discount_total || 0);
    const tax = coupon ? Number(coupon.tax_total || 0) : Math.max(0, subtotal - discount) * 0.12;
    const grandTotal = items.length ? Math.max(0, subtotal - discount) + 95 + tax : 0;

    useEffect(() => {
        if (!getToken()) return;
        api.get("/auth/me").then(({ data }) => {
            setProfile(data);
            const saved = data.addresses?.find((item) => item.is_default) || data.addresses?.[0];
            setAddress({
                recipient_name: saved?.recipient_name || data.name || "",
                phone: saved?.phone || data.phone || "",
                line1: saved?.line1 || "",
                city: saved?.city || "",
                province: saved?.province || "",
                postal_code: saved?.postal_code || "",
            });
        });
    }, []);

    async function saveAddress() {
        if (!getToken()) { navigate("/login"); return null; }
        setSavingAddress(true); setAddressSaved(false); setError("");
        try {
            const { data } = await api.post("/auth/address", address);
            setAddressSaved(true);
            return data;
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save address.");
            return null;
        } finally {
            setSavingAddress(false);
        }
    }

    async function syncCart() {
        const { data: serverItems } = await api.get("/cart");
        await Promise.all((serverItems || []).map((item) => api.delete(`/cart/${item.id}`)));
        for (const item of items) {
            await api.post("/cart", {
                product_id: item.id,
                product_variant_id: item.selected_variant?.id || item.variant?.id || null,
                quantity: item.quantity,
            });
        }
    }

    async function applyCoupon() {
        if (!getToken()) { navigate("/login"); return; }
        setApplyingCoupon(true); setError("");
        try {
            await syncCart();
            const { data } = await api.post("/coupons/apply", { code: couponCode });
            setCoupon(data);
        } catch (err) {
            setCoupon(null);
            setError(err.response?.data?.message || "Unable to apply coupon.");
        } finally {
            setApplyingCoupon(false);
        }
    }

    async function pay() {
        if (!getToken()) { navigate("/login"); return; }
        setBusy(true); setError("");
        try {
            const saved = await saveAddress();
            if (!saved) return;
            await syncCart();
            const { data: order } = await api.post("/orders", { shipping_address: address, delivery_method: "standard", coupon_code: coupon?.code || couponCode || null, payment_method: paymentMethod });
            if (paymentMethod === "cash_on_delivery") {
                setCodOrder(order);
            } else {
                const { data: onlinePayment } = await api.post("/payments/online", { order_id: order.id });
                setPayment(onlinePayment);
            }
            clear();
            setCoupon(null);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to create payment.");
        } finally {
            setBusy(false);
        }
    }

    const checkoutUrl = payment?.payload?.checkout_url;

    return (
        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_420px]">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h1 className="text-2xl font-black">Shopping Cart</h1>
                <div className="mt-5 grid gap-4">
                    {items.length === 0 && !payment && !codOrder && <p className="text-zinc-500">Your cart is empty.</p>}
                    {items.map((item) => {
                        const key = item.cart_key || `${item.id}:${item.selected_variant?.id || item.variant?.id || "default"}`;
                        const variant = item.selected_variant || item.variant || null;
                        const stock = variant ? Number(variant.stock || 0) : Number(item.stock || 0);

                        return (
                            <div className="grid grid-cols-[72px_1fr] gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800 md:grid-cols-[72px_1fr_auto]" key={key}>
                                <img className="h-18 w-18 rounded-lg object-cover" src={productImage(item, variant)} alt="" />
                                <div className="grid gap-2">
                                    <p className="font-black">{item.name}</p>
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{variant ? variantLabel(variant) : "Default option"} · {peso.format(item.price)}</p>
                                    {item.variants?.length > 0 && (
                                        <select className={`${field} max-w-xs text-sm`} value={variant?.id || ""} onChange={(event) => { changeVariant(key, event.target.value); setCoupon(null); }}>
                                            {item.variants.map((option) => (
                                                <option key={option.id} value={option.id} disabled={Number(option.stock) <= 0}>
                                                    {variantLabel(option)} {Number(option.price_delta) > 0 ? `+ ${peso.format(option.price_delta)}` : ""} ({option.stock} left)
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
                                    <input className={`${field} h-10 w-20 text-center`} type="number" min="1" max={stock || undefined} value={item.quantity} onChange={(event) => { update(key, Number(event.target.value)); setCoupon(null); }} />
                                    <button className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-300 text-red-600 dark:border-zinc-700 dark:text-red-300" type="button" onClick={() => { update(key, 0); setCoupon(null); }} aria-label={`Remove ${item.name}`}>
                                        <Trash2 size={17} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                    <input className={field} placeholder="Recipient name" value={address.recipient_name} onChange={(e) => setAddress({ ...address, recipient_name: e.target.value })} />
                    <input className={field} placeholder="Contact number" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                    <input className={`${field} md:col-span-2`} placeholder="Street address" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
                    <input className={field} placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                    <input className={field} placeholder="Province" value={address.province} onChange={(e) => setAddress({ ...address, province: e.target.value })} />
                    <input className={field} placeholder="Postal code" value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
                    <div className="flex items-center gap-3 md:col-span-2"><button type="button" onClick={saveAddress} disabled={savingAddress} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-black text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-50">{savingAddress ? "Saving..." : "Save address"}</button>{addressSaved && <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Address saved</span>}</div>
                </div>
            </div>
            <aside className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-xl font-black">Payment</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{profile ? `Signed in as ${profile.email}` : "Login is required before payment."}</p>
                <div className="mt-5 grid gap-2">
                    <span className="text-xs font-black uppercase text-zinc-500">Payment option</span>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <button className={`rounded-lg border px-3 py-2 text-left text-sm font-black ${paymentMethod === "online" ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-zinc-300 dark:border-zinc-700"}`} type="button" onClick={() => setPaymentMethod("online")}>Online payment</button>
                        <button className={`rounded-lg border px-3 py-2 text-left text-sm font-black ${paymentMethod === "cash_on_delivery" ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-zinc-300 dark:border-zinc-700"}`} type="button" onClick={() => setPaymentMethod("cash_on_delivery")}>Cash on delivery</button>
                    </div>
                </div>
                <div className="mt-5 grid gap-2">
                    <label className="grid gap-1">
                        <span className="text-xs font-black uppercase text-zinc-500">Coupon code</span>
                        <div className="flex gap-2">
                            <input className={field} placeholder="WELCOME10" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCoupon(null); }} />
                            <button className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm font-black disabled:opacity-60 dark:border-zinc-700" type="button" disabled={applyingCoupon || !couponCode || !items.length} onClick={applyCoupon}><Tag size={16} /> Apply</button>
                        </div>
                    </label>
                    {coupon && <p className="rounded-lg bg-emerald-50 p-2 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{coupon.code} applied.</p>}
                </div>
                <div className="mt-5 grid gap-3 text-sm">
                    <p className="flex justify-between"><span>Subtotal</span><strong>{peso.format(subtotal)}</strong></p>
                    {discount > 0 && <p className="flex justify-between text-emerald-700 dark:text-emerald-300"><span>Discount</span><strong>-{peso.format(discount)}</strong></p>}
                    <p className="flex justify-between"><span>Shipping</span><strong>{peso.format(items.length ? 95 : 0)}</strong></p>
                    <p className="flex justify-between"><span>Tax</span><strong>{peso.format(tax)}</strong></p>
                    <p className="flex justify-between border-t border-zinc-200 pt-3 text-lg dark:border-zinc-700"><span>Total</span><strong>{peso.format(grandTotal)}</strong></p>
                </div>
                {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
                {codOrder && <div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">Cash on delivery order created: {codOrder.order_number}</div>}
                {checkoutUrl ? <div className="mt-5 grid place-items-center gap-3 rounded-lg bg-white p-4 text-center text-zinc-950"><QRCodeSVG value={checkoutUrl} size={190} /><p className="text-sm font-bold">Online payment checkout QR</p><p className="max-w-xs text-xs text-zinc-600">Scan this with your phone camera to open PayMongo Checkout and complete the payment.</p><a className="rounded-lg bg-emerald-600 px-4 py-2 font-black text-white" href={checkoutUrl} target="_blank" rel="noreferrer">Open Online Checkout</a></div> : <button disabled={busy || !items.length} onClick={pay} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-zinc-400"><CreditCard /> {busy ? "Creating payment..." : paymentMethod === "cash_on_delivery" ? "Place COD order" : "Pay online"}</button>}
            </aside>
        </section>
    );
}
