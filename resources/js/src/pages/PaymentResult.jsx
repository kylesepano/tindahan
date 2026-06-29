import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../services/api";

export default function PaymentResult() {
    const location = useLocation();
    const isSuccess = location.pathname.includes("success");
    const orderNumber = new URLSearchParams(location.search).get("order");
    const [message, setMessage] = useState(isSuccess ? "Confirming payment..." : "Payment cancelled");

    useEffect(() => {
        if (!isSuccess || !orderNumber) return;

        api.post("/payments/confirm-success", { order: orderNumber })
            .then(() => setMessage("Payment confirmed"))
            .catch(() => setMessage("Payment was started. Confirmation is still pending."));
    }, [isSuccess, orderNumber]);

    return (
        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
            <h1 className="text-4xl font-black">{message}</h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-300">
                {isSuccess
                    ? "Your order and transaction history have been updated. In production, PayMongo webhooks should be used as the final source of truth."
                    : "The checkout was cancelled or failed. You can return to your cart and try again."}
            </p>
            <Link className="mt-6 inline-flex rounded-lg bg-emerald-600 px-5 py-3 font-black text-white" to="/account">View transactions</Link>
        </section>
    );
}
