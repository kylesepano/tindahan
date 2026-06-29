<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->cartItems()->with('product.images', 'variant')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'exists:product_variants,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);
        $variant = $this->variantForProduct($data['product_variant_id'] ?? null, (int) $data['product_id']);
        abort_if($variant && $variant->stock < $data['quantity'], 422, "{$variant->value} only has {$variant->stock} item(s) left.");

        $item = CartItem::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'product_id' => $data['product_id'],
                'product_variant_id' => $data['product_variant_id'] ?? null,
            ],
            ['quantity' => $data['quantity']]
        );

        return response()->json($item->load('product.images', 'variant'), 201);
    }

    public function update(Request $request, CartItem $cart): JsonResponse
    {
        abort_if($cart->user_id !== $request->user()->id, 403);
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
            'product_variant_id' => ['nullable', 'exists:product_variants,id'],
        ]);
        $variantId = $data['product_variant_id'] ?? $cart->product_variant_id;
        $variant = $this->variantForProduct($variantId, $cart->product_id);
        abort_if($variant && $variant->stock < $data['quantity'], 422, "{$variant->value} only has {$variant->stock} item(s) left.");
        $cart->update([
            'quantity' => $data['quantity'],
            'product_variant_id' => $variantId,
        ]);

        return response()->json($cart->load('product.images', 'variant'));
    }

    public function destroy(Request $request, CartItem $cart): JsonResponse
    {
        abort_if($cart->user_id !== $request->user()->id, 403);
        $cart->delete();

        return response()->json(['message' => 'Removed from cart']);
    }

    private function variantForProduct(?int $variantId, int $productId): ?ProductVariant
    {
        if (! $variantId) {
            return null;
        }

        $variant = ProductVariant::find($variantId);
        abort_if(! $variant || $variant->product_id !== $productId, 422, 'Selected variant is not available for this product.');

        return $variant;
    }
}
