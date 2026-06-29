import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Boxes, ClipboardList, LayoutDashboard } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../services/api";
import { getToken, peso } from "../lib/helpers";

export default function Admin() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!getToken()) { navigate("/login"); return; }
        api.get("/auth/me").then(({ data: user }) => {
            if (user.role !== "admin") navigate("/account");
            return api.get("/admin/dashboard");
        }).then(({ data }) => setData(data)).catch(() => navigate("/login"));
    }, [navigate]);

    const chart = data?.monthly_sales || [];

    return (
        <section className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6 flex items-center gap-3"><LayoutDashboard className="text-emerald-600" /><h1 className="text-3xl font-black">Admin Dashboard</h1></div>
            <div className="grid gap-4 md:grid-cols-5">
                {Object.entries(data?.stats || { revenue: 0, orders: 0, customers: 0, products: 0, pending_orders: 0 }).map(([key, value]) => (
                    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900" key={key}>
                        <p className="text-xs font-bold uppercase text-zinc-500">{key.replaceAll("_", " ")}</p>
                        <p className="mt-2 text-2xl font-black">{key === "revenue" ? peso.format(value) : value}</p>
                    </div>
                ))}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Link className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900" to="/admin/orders">
                    <ClipboardList className="text-emerald-600" /><div><p className="font-black">Order Management</p><p className="text-sm text-zinc-500">Search, filter, inspect transactions, and update order status.</p></div>
                </Link>
                <Link className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900" to="/admin/products">
                    <Boxes className="text-emerald-600" /><div><p className="font-black">Admin Products</p><p className="text-sm text-zinc-500">Add products, edit images, variants, stocks, and featured items.</p></div>
                </Link>
            </div>
            {data?.low_stock_products?.length > 0 && (
                <section className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
                    <h2 className="text-lg font-black text-amber-900 dark:text-amber-200">Low Stock Alerts</h2>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {data.low_stock_products.map((product) => (
                            <Link className="flex items-center justify-between rounded-lg bg-white p-3 text-sm dark:bg-zinc-900" key={product.id} to={`/products/${product.slug}`}>
                                <span className="font-bold">{product.name}</span>
                                <span className={Number(product.stock) === 0 ? "font-black text-red-600 dark:text-red-300" : "font-black text-amber-700 dark:text-amber-300"}>{product.stock} total variant stock</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
            <div className="mt-6 h-80 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <ResponsiveContainer><AreaChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Area type="monotone" dataKey="sales" stroke="#059669" fill="#34d399" /></AreaChart></ResponsiveContainer>
            </div>
        </section>
    );
}
