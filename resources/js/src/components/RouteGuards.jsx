import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function LoadingGate() {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-sm font-bold text-zinc-500">Checking access...</div>;
}

export function AdminOnly({ children }) {
    const location = useLocation();
    const { user, token, bootstrapped, loadUser } = useAuthStore();

    useEffect(() => {
        if (!bootstrapped) loadUser();
    }, [bootstrapped, loadUser]);

    if (!bootstrapped) return <LoadingGate />;
    if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    if (user?.role !== "admin") return <Navigate to="/" replace />;

    return children;
}

export function CustomerOnly({ children }) {
    const location = useLocation();
    const { user, token, bootstrapped, loadUser } = useAuthStore();

    useEffect(() => {
        if (!bootstrapped) loadUser();
    }, [bootstrapped, loadUser]);

    if (!bootstrapped) return <LoadingGate />;
    if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    if (user?.role === "admin") return <Navigate to="/" replace />;

    return children;
}

export function GuestOnly({ children }) {
    const { user, token, bootstrapped, loadUser } = useAuthStore();

    useEffect(() => {
        if (!bootstrapped) loadUser();
    }, [bootstrapped, loadUser]);

    if (!bootstrapped) return <LoadingGate />;
    if (token && user?.role === "admin") return <Navigate to="/" replace />;
    if (token) return <Navigate to="/" replace />;

    return children;
}
