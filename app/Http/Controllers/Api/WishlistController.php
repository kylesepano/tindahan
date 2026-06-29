<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->wishlists()->with('product.images')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['product_id' => ['required', 'exists:products,id']]);

        $item = Wishlist::firstOrCreate(['user_id' => $request->user()->id, 'product_id' => $data['product_id']]);

        return response()->json($item->load('product.images'), 201);
    }

    public function destroy(Request $request, Wishlist $wishlist): JsonResponse
    {
        abort_if($wishlist->user_id !== $request->user()->id, 403);
        $wishlist->delete();

        return response()->json(['message' => 'Removed from wishlist']);
    }
}
