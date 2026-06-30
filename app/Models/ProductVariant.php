<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'price_delta' => 'decimal:2',
        'discount_starts_at' => 'datetime',
        'discount_ends_at' => 'datetime',
    ];

    protected $appends = [
        'active_discount_percent',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductVariantImage::class)->orderByDesc('is_primary')->orderBy('position');
    }

    public function hasActiveDiscount(): bool
    {
        $discount = (int) $this->discount;

        return $discount > 0
            && (! $this->discount_starts_at || $this->discount_starts_at->isPast())
            && (! $this->discount_ends_at || $this->discount_ends_at->isFuture());
    }

    public function getActiveDiscountPercentAttribute(): int
    {
        return $this->hasActiveDiscount() ? (int) $this->discount : 0;
    }
}
