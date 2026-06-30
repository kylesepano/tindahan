import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminOnly, CustomerOnly, GuestOnly } from "./components/RouteGuards";
import Shell from "./layouts/Shell";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import AdminOrders from "./pages/AdminOrders";
import AdminProducts from "./pages/AdminProducts";
import AdminContent from "./pages/AdminContent";
import PaymentResult from "./pages/PaymentResult";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Shell />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:slug" element={<ProductDetails />} />
                    <Route path="/checkout" element={<CustomerOnly><Checkout /></CustomerOnly>} />
                    <Route path="/account" element={<CustomerOnly><Account /></CustomerOnly>} />
                    <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
                    <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
                    <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
                    <Route path="/admin/orders" element={<AdminOnly><AdminOrders /></AdminOnly>} />
                    <Route path="/admin/products" element={<AdminOnly><AdminProducts /></AdminOnly>} />
                    <Route path="/admin/content" element={<AdminOnly><AdminContent /></AdminOnly>} />
                    <Route path="/payment/:status" element={<CustomerOnly><PaymentResult /></CustomerOnly>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
