import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "../services/api";
import { field, peso } from "../lib/helpers";

const statuses = ["", "pending", "confirmed", "preparing", "shipped", "delivered", "cancelled", "returned"];

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        api.get(`/admin/orders?${params}`).then(({ data }) => setOrders(data.data || []));
    }, [search, status]);

    const filtered = useMemo(() => orders, [orders]);

    async function updateStatus(order, nextStatus) {
        const { data } = await api.patch(`/admin/orders/${order.id}/status`, { status: nextStatus });
        setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...data } : item));
        setSelected((current) => current?.id === order.id ? { ...current, ...data } : current);
    }

    return (
        <section className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-black">Order Management</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Search orders, filter by status, inspect transaction details, and update fulfillment.</p>
            </div>
            <div className="mb-4 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[1fr_220px]">
                <label className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 dark:border-zinc-700"><Search size={18} /><input className="w-full bg-transparent py-2 outline-none" placeholder="Search order, customer, payment" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                <select className={field} value={status} onChange={(event) => setStatus(event.target.value)}>
                    {statuses.map((item) => <option value={item} key={item}>{item || "All statuses"}</option>)}
                </select>
            </div>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead><tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800"><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th></tr></thead>
                    <tbody>
                        {filtered.map((order) => (
                            <tr className="border-b border-zinc-100 align-top last:border-b-0 dark:border-zinc-800" key={order.id}>
                                <td className="p-3"><button className="font-black text-emerald-700 dark:text-emerald-300" onClick={() => setSelected(order)}>{order.order_number}</button><p className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleString()}</p></td>
                                <td className="p-3">{order.user?.name || "Guest"}<p className="text-xs text-zinc-500">{order.user?.email}</p></td>
                                <td className="p-3">{order.items?.map((item) => <p key={item.id}>{item.quantity}x {item.product_name}{item.variant_name ? ` (${item.variant_name})` : ""}</p>)}</td>
                                <td className="p-3 font-bold">{peso.format(order.total)}</td>
                                <td className="p-3"><span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold dark:bg-zinc-800">{order.payment_status}</span></td>
                                <td className="p-3"><select className={field} value={order.status} onChange={(event) => updateStatus(order, event.target.value)}>{statuses.filter(Boolean).map((item) => <option value={item} key={item}>{item}</option>)}</select></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && <p className="p-6 text-center text-zinc-500">No orders found.</p>}
            </div>
            {selected && <OrderModal order={selected} onClose={() => setSelected(null)} onStatus={updateStatus} />}
        </section>
    );
}

function OrderModal({ order, onClose, onStatus }) {
    const address = order.shipping_address || {};

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/70 px-4 py-6">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
                    <div><p className="text-sm font-bold uppercase text-emerald-700 dark:text-emerald-300">Transaction Details</p><h2 className="text-2xl font-black">{order.order_number}</h2></div>
                    <button className="rounded-full border border-zinc-200 p-2 dark:border-zinc-700" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="grid gap-5 p-5">
                    <div className="grid gap-3 md:grid-cols-4">
                        <Detail label="Customer" value={order.user?.name || "Guest"} />
                        <Detail label="Email" value={order.user?.email || "N/A"} />
                        <Detail label="Payment" value={`${order.payment_status} ${order.payment ? `via ${paymentLabel(order.payment)}` : ""}`} />
                        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"><p className="text-xs font-bold uppercase text-zinc-500">Status</p><select className={`${field} mt-1 w-full`} value={order.status} onChange={(event) => onStatus(order, event.target.value)}>{statuses.filter(Boolean).map((item) => <option value={item} key={item}>{item}</option>)}</select></div>
                    </div>
                    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"><h3 className="font-black">Shipping Address</h3><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{[address.recipient_name, address.phone, address.line1, address.city, address.province, address.postal_code].filter(Boolean).join(", ") || "No address"}</p></section>
                    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"><h3 className="font-black">Items</h3><div className="mt-3 grid gap-3">{order.items?.map((item) => <div className="flex justify-between gap-4 text-sm" key={item.id}><span>{item.quantity}x {item.product_name}{item.variant_name ? ` - ${item.variant_name}` : ""}</span><strong>{peso.format(item.total)}</strong></div>)}</div></section>
                    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"><h3 className="font-black">Payment</h3><div className="mt-2 grid gap-2 text-sm"><p>Reference: {order.payment?.payment_reference || "N/A"}</p><p>Transaction ID: {order.payment?.transaction_id || "Pending"}</p><p>Total: <strong>{peso.format(order.total)}</strong></p></div></section>
                </div>
            </div>
        </div>
    );
}

function Detail({ label, value }) {
    return <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"><p className="text-xs font-bold uppercase text-zinc-500">{label}</p><p className="mt-1 break-words text-sm font-black">{value}</p></div>;
}

function paymentLabel(payment) {
    if (payment.method === "cash_on_delivery") return "Cash on delivery";
    if (payment.method === "online" || payment.method === "gcash") return "Online payment";
    return payment.method || "Payment";
}
