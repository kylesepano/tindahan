<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\CouponController;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->orders()->with('items', 'payment')->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shipping_address' => ['required', 'array'],
            'delivery_method' => ['required', 'string'],
            'coupon_code' => ['nullable', 'string', 'max:80'],
            'payment_method' => ['nullable', 'in:online,cash_on_delivery'],
        ]);

        $order = DB::transaction(function () use ($request, $data) {
            $items = $request->user()->cartItems()->with('product', 'variant')->get();
            abort_if($items->isEmpty(), 422, 'Cart is empty.');

            $products = Product::whereIn('id', $items->pluck('product_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $variants = ProductVariant::whereIn('id', $items->pluck('product_variant_id')->filter())
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($items as $item) {
                $product = $products->get($item->product_id);
                abort_if(! $product || $product->status !== 'active', 422, "{$item->product?->name} is not available.");
                if ($item->product_variant_id) {
                    $variant = $variants->get($item->product_variant_id);
                    abort_if(! $variant || $variant->product_id !== $product->id, 422, "{$product->name} variant is not available.");
                    abort_if($variant->stock < $item->quantity, 422, "{$product->name} {$variant->value} only has {$variant->stock} item(s) left.");
                } else {
                    abort_if($product->stock < $item->quantity, 422, "{$product->name} only has {$product->stock} item(s) left.");
                }
            }

            $subtotal = $items->sum(function ($item) use ($products, $variants) {
                $product = $products->get($item->product_id);
                $variant = $item->product_variant_id ? $variants->get($item->product_variant_id) : null;

                return $product->salePrice($variant) * $item->quantity;
            });
            $shipping = $data['delivery_method'] === 'express' ? 180 : 95;
            $discount = 0;
            $coupon = null;
            if (! empty($data['coupon_code'])) {
                $coupon = CouponController::validCoupon($data['coupon_code'], $subtotal);
                $discount = CouponController::discountFor($coupon, $subtotal);
            }
            $taxable = max(0, $subtotal - $discount);
            $tax = round($taxable * 0.12, 2);

            $order = Order::create([
                'user_id' => $request->user()->id,
                'order_number' => 'ORD-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
                'payment_status' => ($data['payment_method'] ?? 'online') === 'cash_on_delivery' ? 'cod_pending' : 'unpaid',
                'delivery_method' => $data['delivery_method'],
                'shipping_address' => $data['shipping_address'],
                'subtotal' => $subtotal,
                'discount_total' => $discount,
                'shipping_fee' => $shipping,
                'tax_total' => $tax,
                'total' => $taxable + $shipping + $tax,
            ]);

            foreach ($items as $item) {
                $product = $products->get($item->product_id);
                $variant = $item->product_variant_id ? $variants->get($item->product_variant_id) : null;
                $unitPrice = $product->salePrice($variant);
                $order->items()->create([
                    'product_id' => $item->product_id,
                    'product_variant_id' => $variant?->id,
                    'product_name' => $product->name,
                    'variant_name' => $variant ? "{$variant->name}: {$variant->value}" : null,
                    'sku' => $product->sku,
                    'unit_price' => $unitPrice,
                    'quantity' => $item->quantity,
                    'total' => $unitPrice * $item->quantity,
                ]);

                if ($variant) {
                    $variant->decrement('stock', $item->quantity);
                    $product->update(['stock' => $product->variants()->sum('stock')]);
                } else {
                    $product->decrement('stock', $item->quantity);
                }
            }

            if (($data['payment_method'] ?? 'online') === 'cash_on_delivery') {
                $order->payment()->create([
                    'user_id' => $request->user()->id,
                    'gateway' => 'cash',
                    'method' => 'cash_on_delivery',
                    'payment_reference' => 'COD-'.$order->order_number,
                    'amount' => $order->total,
                    'status' => 'pending',
                    'payload' => ['message' => 'Collect payment upon delivery.'],
                ]);
            }

            $request->user()->cartItems()->delete();
            $coupon?->increment('used_count');

            return $order;
        });

        return response()->json($order->load('items', 'payment'), 201);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        abort_if($order->user_id !== $request->user()->id && ! $request->user()->isAdmin(), 403);

        return response()->json($order->load('items', 'payment'));
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        abort_if($order->user_id !== $request->user()->id, 403);
        abort_if($order->status !== 'pending', 422, 'Only pending orders can be cancelled.');
        $order->update(['status' => 'cancelled']);

        return response()->json($order);
    }
}
