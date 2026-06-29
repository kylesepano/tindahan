<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        return response()->json([
            'stats' => [
                'revenue' => Order::where('payment_status', 'paid')->sum('total'),
                'orders' => Order::count(),
                'customers' => User::where('role', 'customer')->count(),
                'products' => Product::count(),
                'pending_orders' => Order::where('status', 'pending')->count(),
            ],
            'monthly_sales' => collect(range(1, 12))->map(fn ($month) => [
                'month' => date('M', mktime(0, 0, 0, $month, 1)),
                'sales' => Order::whereMonth('created_at', $month)->sum('total'),
                'orders' => Order::whereMonth('created_at', $month)->count(),
            ]),
            'recent_orders' => Order::with('user')->latest()->take(8)->get(),
            'top_products' => Product::orderByDesc('reviews_count')->take(5)->get(),
            'low_stock_products' => Product::with('category')
                ->where('status', 'active')
                ->where('stock', '<=', 5)
                ->orderBy('stock')
                ->take(10)
                ->get(),
        ]);
    }

    public function orders(): JsonResponse
    {
        $orders = Order::query()
            ->with('user', 'items', 'payment')
            ->when(request('status'), fn ($query, $status) => $query->where('status', $status))
            ->when(request('search'), fn ($query, $search) => $query->where(fn ($inner) => $inner
                ->where('order_number', 'like', "%{$search}%")
                ->orWhere('payment_status', 'like', "%{$search}%")
                ->orWhereHas('user', fn ($user) => $user
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"))))
            ->latest();

        return response()->json($orders->paginate(20));
    }

    public function updateOrderStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,confirmed,preparing,shipped,delivered,cancelled,returned']]);
        $order->update($data);

        return response()->json($order);
    }
}
