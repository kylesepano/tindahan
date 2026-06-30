<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\Category;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminContentController extends Controller
{
    public function categories(): JsonResponse
    {
        return response()->json(Category::withTrashed()->withCount('products')->latest()->get());
    }

    public function banners(): JsonResponse
    {
        return response()->json(Banner::latest()->get());
    }

    public function coupons(): JsonResponse
    {
        return response()->json(Coupon::latest()->get());
    }

    public function storeCoupon(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:80', 'unique:coupons,code'],
            'type' => ['required', 'in:percentage,fixed'],
            'value' => ['required', 'numeric', 'min:0.01'],
            'minimum_spend' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'expires_at' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['code'] = Str::upper($data['code']);
        $data['minimum_spend'] = $data['minimum_spend'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        return response()->json(Coupon::create($data), 201);
    }

    public function updateCoupon(Request $request, Coupon $coupon): JsonResponse
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $coupon->update($data);

        return response()->json($coupon->fresh());
    }

    public function storeBanner(Request $request): JsonResponse
    {
        $data = $this->bannerData($request);

        return response()->json(Banner::create($data), 201);
    }

    public function updateBanner(Request $request, Banner $banner): JsonResponse
    {
        $banner->update($this->bannerData($request));

        return response()->json($banner->fresh());
    }

    public function destroyBanner(Banner $banner): JsonResponse
    {
        $banner->update(['is_active' => false]);

        return response()->json(['message' => 'Banner disabled.']);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'url'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $baseSlug = Str::slug($data['name']);
        $slug = $baseSlug;
        $count = 2;
        while (Category::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$count++;
        }

        $category = Category::create($data + [
            'slug' => $slug,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json($category->loadCount('products'), 201);
    }

    public function destroyCategory(Category $category): JsonResponse
    {
        $category->update(['is_active' => false]);
        $category->delete();

        return response()->json($category->loadCount('products'));
    }

    public function restoreCategory(string $category): JsonResponse
    {
        $category = Category::withTrashed()->findOrFail($category);
        $category->restore();
        $category->update(['is_active' => true]);

        return response()->json($category->fresh()->loadCount('products'));
    }

    private function bannerData(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'image' => ['required', 'url'],
            'cta_label' => ['nullable', 'string', 'max:80'],
            'cta_url' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
