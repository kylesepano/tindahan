import { create } from "zustand";
import { api } from "../services/api";

export const useAuthStore = create((set, get) => ({
    user: JSON.parse(localStorage.getItem("commerce_user") || "null"),
    token: localStorage.getItem("commerce_token"),
    bootstrapped: false,
    setSession(user, token) {
        localStorage.setItem("commerce_token", token);
        localStorage.setItem("commerce_user", JSON.stringify(user));
        set({ user, token, bootstrapped: true });
    },
    async loadUser() {
        const token = localStorage.getItem("commerce_token");
        if (!token) {
            set({ user: null, token: null, bootstrapped: true });
            return null;
        }
        try {
            const { data } = await api.get("/auth/me");
            localStorage.setItem("commerce_user", JSON.stringify(data));
            set({ user: data, token, bootstrapped: true });
            return data;
        } catch {
            get().logout(false);
            return null;
        }
    },
    async logout(callApi = true) {
        if (callApi && get().token) {
            try {
                await api.post("/auth/logout");
            } catch {
                // Local logout still succeeds if the token is already invalid.
            }
        }
        localStorage.removeItem("commerce_token");
        localStorage.removeItem("commerce_user");
        set({ user: null, token: null, bootstrapped: true });
    },
}));
