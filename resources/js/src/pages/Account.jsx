import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { History, X, User } from "lucide-react";
import { api } from "../services/api";
import { getToken, peso } from "../lib/helpers";

export default function Account() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [payments, setPayments] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState(null);

    useEffect(() => {
        if (!getToken()) { navigate("/login"); return; }
        api.get("/auth/me").then(({ data }) => setUser(data));
        api.get("/payments").then(({ data }) => setPayments(data));
    }, [navigate]);

    if (!user) return <section className="mx-auto max-w-7xl px-4 py-12">Loading account...</section>;
    const address = user.addresses?.find((item) => item.is_default) || user.addresses?.[0];

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
                        {payments.length === 0 && <p className="text-zinc-500">No GCash transactions yet.</p>}
                        {payments.map((payment) => (
                            <button
                                className="rounded-lg border border-zinc-200 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50/60 dark:border-zinc-700 dark:hover:border-emerald-400 dark:hover:bg-emerald-400/10"
                                key={payment.id}
                                onClick={() => setSelectedPayment(payment)}
                            >
                                <div className="flex flex-wrap justify-between gap-2">
                                    <p className="font-black">{payment.order?.order_number}</p>
                                    <p className="font-black text-emerald-700 dark:text-emerald-300">{peso.format(payment.amount)}</p>
                                </div>
                                <p className="mt-1 text-sm text-zinc-500">{payment.method.toUpperCase()} via {payment.gateway} - {payment.status}</p>
                                <p className="mt-1 text-xs text-zinc-500">{payment.payment_reference}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            {selectedPayment && <TransactionModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
        </section>
    );
}

function TransactionModal({ payment, onClose }) {
    const order = payment.order;
    const address = order?.shipping_address || {};
    const items = order?.items || [];

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/70 px-4 py-6" role="dialog" aria-modal="true">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
                    <div>
                        <p className="text-sm font-bold uppercase text-emerald-700 dark:text-emerald-300">Transaction Details</p>
                        <h2 className="mt-1 text-2xl font-black">{order?.order_number || payment.payment_reference}</h2>
                    </div>
                    <button className="rounded-full border border-zinc-200 p-2 dark:border-zinc-700" onClick={onClose} aria-label="Close transaction details"><X size={18} /></button>
                </div>

                <div className="grid gap-5 p-5">
                    <div className="grid gap-3 md:grid-cols-3">
                        <Detail label="Payment Amount" value={peso.format(payment.amount)} />
                        <Detail label="Payment Status" value={payment.status} />
                        <Detail label="Method" value={`${payment.method?.toUpperCase()} via ${payment.gateway}`} />
                        <Detail label="Reference" value={payment.payment_reference} />
                        <Detail label="Transaction ID" value={payment.transaction_id || "Pending"} />
                        <Detail label="Order Status" value={order?.status || "Pending"} />
                    </div>

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

function Detail({ label, value }) {
    return (
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
            <p className="mt-1 break-words text-sm font-black">{value}</p>
        </div>
    );
}
