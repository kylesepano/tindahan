<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductPriceHistory;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = Product::query()
            ->with('category', 'brand', 'images', 'variants.images', 'priceHistories.user')
            ->when($request->status === 'deleted', fn ($query) => $query->onlyTrashed())
            ->when($request->status !== 'deleted' && $request->boolean('with_deleted'), fn ($query) => $query->withTrashed())
            ->when($request->search, fn ($query, $search) => $query->where(fn ($inner) => $inner
                ->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%")))
            ->when($request->category, fn ($query, $category) => $query->where('category_id', $category))
            ->when($request->status && $request->status !== 'deleted', fn ($query, $status) => $query->where('status', $status))
            ->when($request->featured === '1', fn ($query) => $query->where('is_featured', true))
            ->latest();

        return response()->json($products->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $imageUrls = $this->normalizeImageUrls($data['image_urls'] ?? [$data['image_url'] ?? null]);
        $variants = $data['variants'] ?? [];
        unset($data['image_url']);
        unset($data['image_urls']);
        unset($data['variants']);
        $this->ensureImages($imageUrls, $variants);
        $data['stock'] = empty($variants) ? $data['stock'] : collect($variants)->sum(fn ($variant) => (int) ($variant['stock'] ?? 0));

        $data['slug'] = Str::slug($data['name']).'-'.Str::lower(Str::random(5));
        $product = Product::create($data);
        $product->priceHistories()->create([
            'user_id' => $request->user()->id,
            'old_price' => null,
            'new_price' => $product->price,
        ]);

        $this->syncProductImages($product, $imageUrls);

        if (empty($variants)) {
            $variants[] = [
                'name' => 'Option',
                'value' => 'Default',
                'image_urls' => $imageUrls,
                'image_url' => $imageUrls[0] ?? null,
                'price_delta' => 0,
                'stock' => $product->stock,
            ];
        }

        foreach ($variants as $variant) {
            $created = $product->variants()->create($this->variantPayload($variant, $imageUrls[0] ?? null));
            $this->syncVariantImages($created, $this->variantImageUrls($variant));
        }

        return response()->json($product->load('category', 'brand', 'images', 'variants.images', 'priceHistories.user'), 201);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($product->load('category', 'brand', 'images', 'variants.images', 'priceHistories.user'));
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $this->validated($request, $product->id);
        $imageUrls = $this->normalizeImageUrls($data['image_urls'] ?? [$data['image_url'] ?? null]);
        $variants = $data['variants'] ?? [];
        unset($data['image_url']);
        unset($data['image_urls']);
        unset($data['variants']);
        $this->ensureImages($imageUrls, $variants, $product);
        $data['stock'] = empty($variants) ? $data['stock'] : collect($variants)->sum(fn ($variant) => (int) ($variant['stock'] ?? 0));

        $oldPrice = (float) $product->price;
        $product->update($data);

        if ((float) $product->price !== $oldPrice) {
            $product->priceHistories()->create([
                'user_id' => $request->user()->id,
                'old_price' => $oldPrice,
                'new_price' => $product->price,
            ]);
        }

        $this->syncProductImages($product, $imageUrls);

        foreach ($variants as $variant) {
            $variantImages = $this->variantImageUrls($variant);
            $variantData = $this->variantPayload($variant, $imageUrls[0] ?? $product->images()->where('is_primary', true)->value('url'));
            if (isset($variant['id'])) {
                $product->variants()->whereKey($variant['id'])->update($variantData);
                $target = $product->variants()->whereKey($variant['id'])->first();
            } else {
                $target = $product->variants()->create($variantData);
            }
            if ($target) {
                $this->syncVariantImages($target, $variantImages);
            }
        }
        if (! empty($variants)) {
            $product->update(['stock' => $product->variants()->sum('stock')]);
        }

        return response()->json($product->fresh()->load('category', 'brand', 'images', 'variants.images', 'priceHistories.user'));
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->update(['status' => 'archived']);
        $product->delete();

        return response()->json($product->load('category', 'brand', 'images', 'variants.images'));
    }

    public function restore(string $product): JsonResponse
    {
        $product = Product::withTrashed()->findOrFail($product);
        $product->restore();
        $product->update(['status' => 'active']);

        return response()->json($product->fresh()->load('category', 'brand', 'images', 'variants.images', 'priceHistories.user'));
    }

    public function updateStock(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'stock' => ['required', 'integer', 'min:0'],
        ]);

        $product->update($data);
        if ($product->variants()->exists()) {
            $firstVariant = $product->variants()->oldest()->first();
            $product->variants()->whereKeyNot($firstVariant->id)->update(['stock' => 0]);
            $firstVariant->update(['stock' => $data['stock']]);
            $product->update(['stock' => $product->variants()->sum('stock')]);
        } else {
            $product->variants()->create([
                'name' => 'Option',
                'value' => 'Default',
                'stock' => $product->stock,
                'price_delta' => 0,
            ]);
        }

        return response()->json($product->load('category', 'brand', 'images', 'variants'));
    }

    public function updateFeatured(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'is_featured' => ['required', 'boolean'],
        ]);

        $product->update($data);

        return response()->json($product->fresh()->load('category', 'brand', 'images', 'variants.images'));
    }

    public function destroyVariant(Product $product, ProductVariant $variant): JsonResponse
    {
        abort_if($variant->product_id !== $product->id, 404);

        $fallbackStock = (int) $variant->stock;
        $variant->delete();

        $remainingStock = $product->variants()->sum('stock');
        $product->update([
            'stock' => $product->variants()->exists() ? $remainingStock : $fallbackStock,
        ]);

        return response()->json($product->fresh()->load('category', 'brand', 'images', 'variants.images', 'priceHistories.user'));
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'name' => ['required', 'string', 'max:180'],
            'sku' => ['required', 'string', 'max:80', 'unique:products,sku'.($ignoreId ? ','.$ignoreId : '')],
            'price' => ['required', 'numeric', 'min:0'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'integer', 'min:0', 'max:100'],
            'discount_starts_at' => ['nullable', 'date'],
            'discount_ends_at' => ['nullable', 'date', 'after_or_equal:discount_starts_at'],
            'stock' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'in:active,draft,archived'],
            'description' => ['required', 'string'],
            'specifications' => ['nullable', 'array'],
            'image_url' => ['nullable', 'url'],
            'image_urls' => ['nullable', 'array'],
            'image_urls.*' => ['nullable', 'url'],
            'is_featured' => ['nullable', 'boolean'],
            'variants' => ['nullable', 'array'],
            'variants.*.id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'variants.*.name' => ['required_with:variants', 'string', 'max:80'],
            'variants.*.value' => ['required_with:variants', 'string', 'max:120'],
            'variants.*.image_url' => ['nullable', 'url'],
            'variants.*.image_urls' => ['nullable', 'array'],
            'variants.*.image_urls.*' => ['nullable', 'url'],
            'variants.*.price_delta' => ['nullable', 'numeric'],
            'variants.*.discount' => ['nullable', 'integer', 'min:0', 'max:100'],
            'variants.*.discount_starts_at' => ['nullable', 'date'],
            'variants.*.discount_ends_at' => ['nullable', 'date', 'after_or_equal:variants.*.discount_starts_at'],
            'variants.*.stock' => ['required_with:variants', 'integer', 'min:0'],
        ]);
    }

    private function normalizeImageUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $query = parse_url($url, PHP_URL_QUERY);
        parse_str($query ?? '', $params);

        return isset($params['imgurl']) ? urldecode($params['imgurl']) : $url;
    }

    private function normalizeImageUrls(array $urls): array
    {
        return collect($urls)
            ->map(fn ($url) => $this->normalizeImageUrl($url))
            ->filter()
            ->values()
            ->all();
    }

    private function ensureImages(array $productImages, array $variants, ?Product $product = null): void
    {
        if (empty($variants)) {
            abort_if(empty($productImages), 422, 'At least one product image is required.');
            return;
        }

        foreach ($variants as $variant) {
            $images = $this->variantImageUrls($variant);
            if (empty($images) && $product && isset($variant['id'])) {
                $existing = $product->variants()
                    ->whereKey($variant['id'])
                    ->with('images')
                    ->first();
                $images = $this->normalizeImageUrls([
                    ...($existing?->images->pluck('url')->all() ?? []),
                    $existing?->image_url,
                ]);
            }
            abort_if(empty($images), 422, 'Each variant needs at least one image.');
        }
    }

    private function syncProductImages(Product $product, array $urls): void
    {
        if (empty($urls)) {
            return;
        }

        $product->images()->delete();
        foreach ($urls as $index => $url) {
            $product->images()->create([
                'url' => $url,
                'is_primary' => $index === 0,
                'position' => $index + 1,
            ]);
        }
    }

    private function syncVariantImages($variant, array $urls): void
    {
        if (empty($urls)) {
            return;
        }

        $variant->images()->delete();
        foreach ($urls as $index => $url) {
            $variant->images()->create([
                'url' => $url,
                'is_primary' => $index === 0,
                'position' => $index + 1,
            ]);
        }
        $variant->update(['image_url' => $urls[0]]);
    }

    private function variantPayload(array $variant, ?string $fallbackImage): array
    {
        $variantImages = $this->variantImageUrls($variant);

        return [
            'name' => $variant['name'],
            'value' => $variant['value'],
            'image_url' => $variantImages[0] ?? $fallbackImage,
            'price_delta' => $variant['price_delta'] ?? 0,
            'discount' => $variant['discount'] ?? 0,
            'discount_starts_at' => $variant['discount_starts_at'] ?? null,
            'discount_ends_at' => $variant['discount_ends_at'] ?? null,
            'stock' => $variant['stock'] ?? 0,
        ];
    }

    private function variantImageUrls(array $variant): array
    {
        return $this->normalizeImageUrls([
            ...($variant['image_urls'] ?? []),
            $variant['image_url'] ?? null,
        ]);
    }
}
