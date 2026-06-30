import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { CheckCircle2, LogIn, LogOut, Menu, Moon, ShoppingCart, Sun, User, XCircle } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";

export default function Shell() {
    const navigate = useNavigate();
    const [dark, setDark] = useState(localStorage.getItem("commerce_theme") === "dark");
    const [drawer, setDrawer] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const { items, notice, dismissNotice } = useCartStore();
    const { user, token, loadUser, logout } = useAuthStore();
    const isAdmin = user?.role === "admin";

    useEffect(() => {
        document.documentElement.classList.toggle("dark", dark);
        localStorage.setItem("commerce_theme", dark ? "dark" : "light");
    }, [dark]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    useEffect(() => {
        if (!notice) return undefined;
        const timer = window.setTimeout(() => dismissNotice(), 2600);
        return () => window.clearTimeout(timer);
    }, [notice, dismissNotice]);

    async function handleLogout() {
        await logout();
        setUserMenuOpen(false);
        navigate("/");
    }

    const nav = "text-sm font-semibold text-zinc-600 transition hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-300";
    const active = ({ isActive }) => `${nav} ${isActive ? "text-emerald-700 dark:text-emerald-300" : ""}`;
    const navItems = isAdmin
        ? [{ to: "/admin", label: "Dashboard" }, { to: "/admin/orders", label: "Orders" }, { to: "/admin/products", label: "Products" }, { to: "/admin/content", label: "Content" }]
        : [
            { to: "/", label: "Home" },
            { to: "/products", label: "Products" },
            { to: "/checkout", label: "Checkout" },
            { to: "/account", label: "Account" },
        ];

    return (
        <div className="min-h-screen bg-[#f7f7f4] text-zinc-950 transition dark:bg-zinc-950 dark:text-zinc-50">
            <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
                <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
                    <button className="md:hidden" onClick={() => setDrawer(!drawer)} aria-label="Menu"><Menu /></button>
                    <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-normal">
                        <img className="h-9 w-9 rounded-md object-contain" src="/logo.png" alt="Tindahan logo" /> Tindahan
                    </Link>
                    <nav className="ml-6 hidden items-center gap-5 md:flex">
                        {navItems.map((item) => <NavLink className={active} to={item.to} key={item.to}>{item.label}</NavLink>)}
                    </nav>
                    <div className="ml-auto flex items-center gap-2">
                        {token && user ? (
                            <div className="relative hidden sm:block">
                                <button
                                    className="flex max-w-56 items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                                    onClick={() => setUserMenuOpen((open) => !open)}
                                >
                                    <User size={16} className="shrink-0" />
                                    <span className="truncate">{user.name || user.email}</span>
                                </button>
                                {userMenuOpen && (
                                    <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                                        <p className="border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">{user.email}</p>
                                        <Link className="block rounded-md px-3 py-2 text-sm font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800" to={isAdmin ? "/admin" : "/account"} onClick={() => setUserMenuOpen(false)}>{isAdmin ? "Dashboard" : "My Account"}</Link>
                                        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10" onClick={handleLogout}><LogOut size={16} /> Logout</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link className="hidden items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-bold dark:border-zinc-700 sm:inline-flex" to="/login">
                                <LogIn size={16} /> Login
                            </Link>
                        )}
                        <button className="rounded-full border border-zinc-200 p-2 dark:border-zinc-700" onClick={() => setDark(!dark)} aria-label="Theme">
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        {!isAdmin && (
                            <Link className="relative rounded-full bg-zinc-950 p-2 text-white dark:bg-white dark:text-zinc-950" to="/checkout" aria-label="Cart">
                                <ShoppingCart size={18} />
                                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-xs font-bold text-white">{items.length}</span>
                            </Link>
                        )}
                    </div>
                </div>
                {drawer && (
                    <nav className="grid gap-3 border-t border-zinc-200 px-4 py-3 md:hidden dark:border-zinc-800">
                        {navItems.map((item) => <NavLink className={active} to={item.to} key={item.to}>{item.label}</NavLink>)}
                        {token && user ? <button className="text-left text-sm font-semibold text-zinc-600 dark:text-zinc-300" onClick={handleLogout}>Logout ({user.name || user.email})</button> : <NavLink className={active} to="/login">Login</NavLink>}
                    </nav>
                )}
            </header>
            {notice && (
                <div className="fixed right-4 top-20 z-50 w-[calc(100vw-2rem)] max-w-sm animate-[cart-toast_2600ms_ease-in-out_forwards] rounded-lg border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex gap-3">
                        {notice.type === "error" ? <XCircle className="mt-0.5 shrink-0 text-red-600 dark:text-red-300" size={22} /> : <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" size={22} />}
                        <div>
                            <p className="font-black">{notice.title}</p>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{notice.message}</p>
                        </div>
                    </div>
                </div>
            )}
            <main><Outlet /></main>
            <footer className="mt-16 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2">
                            <img className="h-9 w-9 rounded-md object-contain" src="/logo.png" alt="Tindahan logo" />
                            <h3 className="text-lg font-black">Tindahan</h3>
                        </div>
                        <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-300">
                            A modern local marketplace with secure accounts, delivery details, online payment through PayMongo, cash on delivery, and transaction history.
                        </p>
                    </div>
                    <div>
                        <p className="mb-3 text-sm font-black uppercase text-zinc-500">Shop</p>
                        <div className="grid gap-2 text-sm"><Link to="/products">Products</Link><Link to="/checkout">Cart</Link><Link to="/account">My Account</Link></div>
                    </div>
                    <div>
                        <p className="mb-3 text-sm font-black uppercase text-zinc-500">Support</p>
                        <div className="grid gap-2 text-sm"><span>Metro Manila, Philippines</span><span>support@tindahan.test</span><span>Online payment via PayMongo</span><span>Cash on delivery</span></div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
