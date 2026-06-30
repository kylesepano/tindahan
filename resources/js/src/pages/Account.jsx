import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard, History, HandCoins, X, User } from "lucide-react";
import { api } from "../services/api";
import { getToken, peso } from "../lib/helpers";

export default function Account() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [paymentMessage, setPaymentMessage] = useState("");

    useEffect(() => {
        if (!getToken()) { navigate("/login"); return; }
        api.get("/auth/me").then(({ data }) => setUser(data));
        api.get("/orders").then(({ data }) => setOrders(data));
    }, [navigate]);

    if (!user) return <section className="mx-auto max-w-7xl px-4 py-12">Loading account...</section>;
    const address = user.addresses?.find((item) => item.is_default) || user.addresses?.[0];

    async function payOnline(order) {
        setPaymentMessage("");
        try {
            const { data } = await api.post("/payments/online", { order_id: order.id });
            const updated = { ...order, payment: data, payment_status: "unpaid" };
            setOrders((current) => current.map((item) => item.id === order.id ? updated : item));
            setSelectedOrder(updated);
            setPaymentMessage("Online payment checkout created.");
        } catch (error) {
            setPaymentMessage(error.response?.data?.message || "Unable to start online payment.");
        }
    }

    async function switchToCod(order) {
        setPaymentMessage("");
        try {
            const { data } = await api.post("/payments/cash-on-delivery", { order_id: order.id });
            const updated = { ...order, payment: data, payment_status: "cod_pending" };
            setOrders((current) => current.map((item) => item.id === order.id ? updated : item));
            setSelectedOrder(updated);
            setPaymentMessage("Cash on delivery selected for this order.");
        } catch (error) {
            setPaymentMessage(error.response?.data?.message || "Unable to switch to cash on delivery.");
        }
    }

    return (
        <section className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6 flex items-center gap-3"><User className="text-emerald-600" /><h1 className="text-3xl font-black">My Account</h1></div>
            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="font-black">{user.name}</p><p className="text-sm text-zinc-500">{user.email}</p><p className="mt-3 text-sm">Contact: {user.phone || "Not set"}</p>
                    {address && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{address.line1}, {address.city}, {address.province} {address.postal_code}</p>}
                    <Link className="mt-5 inline-flex rounded-lg bg-zinc-950 px-4 py-2 font-bold text-white dark:bg-white dark:text-zinc-950" to="/checkout">Set address at checkout</Link>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-4 flex items-center gap-2"><History className="text-emerald-600" /><h2 className="text-xl font-black">Transaction History</h2></div>
                    <div className="grid gap-3">
                        {orders.length === 0 && <p className="text-zinc-500">No orders yet.</p>}
                        {orders.map((order) => (
                            <button
                                className="rounded-lg border border-zinc-200 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50/60 dark:border-zinc-700 dark:hover:border-emerald-400 dark:hover:bg-emerald-400/10"
                                key={order.id}
                                onClick={() => setSelectedOrder(order)}
                            >
                                <div className="flex flex-wrap justify-between gap-2">
                                    <p className="font-black">{order.order_number}</p>
                                    <p className="font-black text-emerald-700 dark:text-emerald-300">{peso.format(order.total)}</p>
                                </div>
                                <p className="mt-1 text-sm text-zinc-500">Order: {order.status} - Payment: {order.payment_status}</p>
                                <p className="mt-1 text-xs text-zinc-500">{order.payment ? `${paymentLabel(order.payment)} - ${order.payment.status}` : "No payment record yet"}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            {selectedOrder && <TransactionModal order={selectedOrder} message={paymentMessage} onClose={() => { setSelectedOrder(null); setPaymentMessage(""); }} onPayOnline={payOnline} onCod={switchToCod} />}
        </section>
    );
}

function TransactionModal({ order, message, onClose, onPayOnline, onCod }) {
    const payment = order?.payment;
    const address = order?.shipping_address || {};
    const items = order?.items || [];
    const checkoutUrl = payment?.payload?.checkout_url;
    const canPayOnline = order?.payment_status === "unpaid";

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/70 px-4 py-6" role="dialog" aria-modal="true">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
                    <div>
                        <p className="text-sm font-bold uppercase text-emerald-700 dark:text-emerald-300">Transaction Details</p>
                        <h2 className="mt-1 text-2xl font-black">{order?.order_number}</h2>
                    </div>
                    <button className="rounded-full border border-zinc-200 p-2 dark:border-zinc-700" onClick={onClose} aria-label="Close transaction details"><X size={18} /></button>
                </div>

                <div className="grid gap-5 p-5">
                    <div className="grid gap-3 md:grid-cols-3">
                        <Detail label="Order Total" value={peso.format(order.total)} />
                        <Detail label="Payment Status" value={order.payment_status} />
                        <Detail label="Method" value={payment ? paymentLabel(payment) : "No payment yet"} />
                        <Detail label="Reference" value={payment?.payment_reference || order.order_number} />
                        <Detail label="Transaction ID" value={payment?.transaction_id || "Pending"} />
                        <Detail label="Order Status" value={order?.status || "Pending"} />
                    </div>
                    {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{message}</p>}
                    {canPayOnline && (
                        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                            <h3 className="font-black">Pay This Order</h3>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Complete this unpaid order by online payment or cash on delivery.</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white" type="button" onClick={() => onPayOnline(order)}><CreditCard size={16} /> Pay online</button>
                                <button className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-black dark:border-zinc-700" type="button" onClick={() => onCod(order)}><HandCoins size={16} /> Cash on delivery</button>
                                {checkoutUrl && <a className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-black dark:border-zinc-700" href={checkoutUrl} target="_blank" rel="noreferrer">Open checkout</a>}
                            </div>
                        </section>
                    )}

                    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                        <h3 className="font-black">Shipping Address</h3>
                        <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                            <p className="font-bold text-zinc-950 dark:text-zinc-50">{address.recipient_name || "Recipient not set"}</p>
                            <p>{address.phone || "No contact number"}</p>
                            <p>{[address.line1, address.line2].filter(Boolean).join(", ")}</p>
                            <p>{[address.city, address.province, address.postal_code].filter(Boolean).join(", ")}</p>
                            <p>{address.country || "Philippines"}</p>
                        </div>
                    </section>

                    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                        <h3 className="font-black">Items Ordered</h3>
                        <div className="mt-3 grid gap-3">
                            {items.length === 0 && <p className="text-sm text-zinc-500">No items found for this order.</p>}
                            {items.map((item) => (
                                <div className="grid gap-2 border-b border-zinc-100 pb-3 text-sm last:border-b-0 last:pb-0 dark:border-zinc-800 sm:grid-cols-[1fr_auto]" key={item.id}>
                                    <div>
                                        <p className="font-bold">{item.product_name}</p>
                                        <p className="text-zinc-500">{item.variant_name ? `${item.variant_name} - ` : ""}SKU: {item.sku} - Qty: {item.quantity}</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p>{peso.format(item.unit_price)} each</p>
                                        <p className="font-black">{peso.format(item.total)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {order && (
                        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                            <h3 className="font-black">Order Summary</h3>
                            <div className="mt-3 grid gap-2 text-sm">
                                <p className="flex justify-between"><span>Subtotal</span><strong>{peso.format(order.subtotal)}</strong></p>
                                {Number(order.discount_total || 0) > 0 && <p className="flex justify-between text-emerald-700 dark:text-emerald-300"><span>Discount</span><strong>-{peso.format(order.discount_total)}</strong></p>}
                                <p className="flex justify-between"><span>Shipping</span><strong>{peso.format(order.shipping_fee)}</strong></p>
                                <p className="flex justify-between"><span>Tax</span><strong>{peso.format(order.tax_total)}</strong></p>
                                <p className="flex justify-between border-t border-zinc-200 pt-2 text-base dark:border-zinc-800"><span>Total</span><strong>{peso.format(order.total)}</strong></p>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

function paymentLabel(payment) {
    if (payment.method === "cash_on_delivery") return "Cash on delivery";
    if (payment.method === "online" || payment.method === "gcash") return "Online payment";
    return payment.method || "Payment";
}

function Detail({ label, value }) {
    return (
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
            <p className="mt-1 break-words text-sm font-black">{value}</p>
        </div>
    );
}
