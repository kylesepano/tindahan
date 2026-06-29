import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { field } from "../lib/helpers";
import { useAuthStore } from "../store/authStore";

export default function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "customer@example.com", password: "password" });
    const [error, setError] = useState("");
    const { user, token, setSession } = useAuthStore();

    useEffect(() => {
        if (token && user) navigate(user.role === "admin" ? "/admin" : "/account", { replace: true });
    }, [navigate, token, user]);

    async function submit(e) {
        e.preventDefault();
        setError("");
        try {
            const { data } = await api.post("/auth/login", form);
            setSession(data.user, data.token);
            navigate(data.user.role === "admin" ? "/admin" : "/account");
        } catch {
            setError("Login failed. Check the email and password.");
        }
    }

    return (
        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-2">
            <div><p className="font-bold text-emerald-700 dark:text-emerald-300">Secure login</p><h1 className="mt-2 text-4xl font-black">Welcome back to Tindahan</h1><p className="mt-4 text-zinc-600 dark:text-zinc-300">Customers can save delivery details and view transaction history. Admin users are routed to the hidden dashboard after login.</p></div>
            <form onSubmit={submit} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <label className="grid gap-1 text-sm font-bold">Email<input className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label className="mt-4 grid gap-1 text-sm font-bold">Password<input className={field} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
                {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
                <button className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-3 font-black text-white">Login</button>
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">New customer? <Link className="font-bold text-emerald-700 dark:text-emerald-300" to="/register">Create an account</Link></p>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Admin: admin@example.com / password</p>
            </form>
        </section>
    );
}
