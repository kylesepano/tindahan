<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'rating' => 'decimal:2',
        'specifications' => 'array',
        'is_featured' => 'boolean',
        'is_flash_sale' => 'boolean',
        'discount_starts_at' => 'datetime',
        'discount_ends_at' => 'datetime',
    ];

    protected $appends = [
        'active_discount_percent',
        'effective_price',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class)->withTrashed();
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderByDesc('is_primary')->orderBy('position');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function priceHistories(): HasMany
    {
        return $this->hasMany(ProductPriceHistory::class)->latest();
    }

    public function hasActiveDiscount(): bool
    {
        $discount = (int) $this->discount;

        return $discount > 0
            && (! $this->discount_starts_at || $this->discount_starts_at->isPast())
            && (! $this->discount_ends_at || $this->discount_ends_at->isFuture());
    }

    public function discountPercent(?ProductVariant $variant = null): int
    {
        if ($variant?->hasActiveDiscount()) {
            return (int) $variant->discount;
        }

        return $this->hasActiveDiscount() ? (int) $this->discount : 0;
    }

    public function salePrice(?ProductVariant $variant = null): float
    {
        $price = (float) $this->price + (float) ($variant?->price_delta ?? 0);
        $discount = $this->discountPercent($variant);

        return round($discount > 0 ? $price * (1 - ($discount / 100)) : $price, 2);
    }

    public function getActiveDiscountPercentAttribute(): int
    {
        return $this->discountPercent();
    }

    public function getEffectivePriceAttribute(): float
    {
        return $this->salePrice();
    }
}
