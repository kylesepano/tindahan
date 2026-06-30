<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function apply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:80'],
        ]);

        $items = $request->user()->cartItems()->with('product', 'variant')->get();
        abort_if($items->isEmpty(), 422, 'Cart is empty.');

        $subtotal = $items->sum(fn ($item) => $item->product->salePrice($item->variant) * $item->quantity);
        $coupon = $this->validCoupon($data['code'], $subtotal);
        $discount = $this->discountFor($coupon, $subtotal);
        $shipping = 95;
        $taxable = max(0, $subtotal - $discount);
        $tax = round($taxable * 0.12, 2);

        return response()->json([
            'code' => $coupon->code,
            'type' => $coupon->type,
            'value' => $coupon->value,
            'subtotal' => round($subtotal, 2),
            'discount_total' => $discount,
            'shipping_fee' => $shipping,
            'tax_total' => $tax,
            'total' => round($taxable + $shipping + $tax, 2),
        ]);
    }

    public static function validCoupon(string $code, float $subtotal): Coupon
    {
        $coupon = Coupon::whereRaw('UPPER(code) = ?', [strtoupper($code)])->first();

        abort_if(! $coupon || ! $coupon->is_active, 422, 'Coupon is invalid.');
        abort_if($coupon->expires_at && $coupon->expires_at->isPast(), 422, 'Coupon is expired.');
        abort_if($coupon->usage_limit && $coupon->used_count >= $coupon->usage_limit, 422, 'Coupon has reached its usage limit.');
        abort_if($subtotal < (float) $coupon->minimum_spend, 422, 'Coupon requires a minimum spend of '.number_format((float) $coupon->minimum_spend, 2).'.');

        return $coupon;
    }

    public static function discountFor(Coupon $coupon, float $subtotal): float
    {
        if ($coupon->type === 'fixed') {
            return round(min($subtotal, (float) $coupon->value), 2);
        }

        return round($subtotal * ((float) $coupon->value / 100), 2);
    }
}
