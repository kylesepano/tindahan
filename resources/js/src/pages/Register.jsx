import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { field } from "../lib/helpers";
import { useAuthStore } from "../store/authStore";

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
    const [error, setError] = useState("");
    const { user, token, setSession } = useAuthStore();

    useEffect(() => {
        if (token && user) navigate(user.role === "admin" ? "/admin" : "/account", { replace: true });
    }, [navigate, token, user]);

    async function submit(e) {
        e.preventDefault();
        setError("");
        try {
            const { data } = await api.post("/auth/register", form);
            setSession(data.user, data.token);
            navigate("/account");
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed. Please check your details.");
        }
    }

    return (
        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-2">
            <div><p className="font-bold text-emerald-700 dark:text-emerald-300">Customer registration</p><h1 className="mt-2 text-4xl font-black">Create your Tindahan account</h1><p className="mt-4 text-zinc-600 dark:text-zinc-300">Use your account to save contact details, place online or cash on delivery orders, and track transaction history.</p></div>
            <form onSubmit={submit} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <label className="grid gap-1 text-sm font-bold">Full name<input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label className="mt-4 grid gap-1 text-sm font-bold">Email<input className={field} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label className="mt-4 grid gap-1 text-sm font-bold">Contact number<input className={field} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <label className="mt-4 grid gap-1 text-sm font-bold">Password<input className={field} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
                {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
                <button className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-3 font-black text-white">Register</button>
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Already registered? <Link className="font-bold text-emerald-700 dark:text-emerald-300" to="/login">Login</Link></p>
            </form>
        </section>
    );
}
