<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = Product::query()
            ->with(['category', 'brand', 'images', 'variants.images'])
            ->active()
            ->when($request->search, fn ($q, $search) => $q->where(fn ($inner) => $inner
                ->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%")))
            ->when($request->category, fn ($q, $slug) => $q->whereHas('category', fn ($c) => $c->where('slug', $slug)))
            ->when($request->min_price, fn ($q, $price) => $q->where('price', '>=', $price))
            ->when($request->max_price, fn ($q, $price) => $q->where('price', '<=', $price))
            ->when($request->rating, fn ($q, $rating) => $q->where('rating', '>=', $rating))
            ->when($request->availability === 'in_stock', fn ($q) => $q->where('stock', '>', 0))
            ->when($request->featured === '1', fn ($q) => $q->where('is_featured', true));

        match ($request->get('sort', 'newest')) {
            'price_low' => $products->orderBy('price'),
            'price_high' => $products->orderByDesc('price'),
            'popular' => $products->orderByDesc('reviews_count')->orderByDesc('rating'),
            default => $products->latest(),
        };

        return response()->json($products->paginate(12));
    }

    public function show(Product $product): JsonResponse
    {
        abort_if($product->status !== 'active', 404);

        return response()->json($product->load(['category', 'brand', 'images', 'variants.images', 'reviews.user', 'priceHistories.user']));
    }

    public function categories(): JsonResponse
    {
        return response()->json(Category::withCount('products')->where('is_active', true)->get());
    }
}
