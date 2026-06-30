<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PayMongoService
{
    public function createGcashCheckout(Order $order): array
    {
        $secretKey = config('services.paymongo.secret_key');
        $amount = $this->checkoutAmount($order);

        if (! $secretKey) {
            return $this->demoCheckout($order, $amount);
        }

        $response = $this->client($secretKey)->post(config('services.paymongo.api_url').'/checkout_sessions', [
            'data' => [
                'attributes' => [
                    'billing' => [
                        'name' => $order->user?->name ?? data_get($order->shipping_address, 'recipient_name', 'Customer'),
                        'email' => $order->user?->email,
                        'phone' => data_get($order->shipping_address, 'phone'),
                    ],
                    'description' => 'Payment for '.$order->order_number,
                    'line_items' => $this->lineItems($order, $amount),
                    'payment_method_types' => ['gcash'],
                    'reference_number' => $order->order_number,
                    'send_email_receipt' => true,
                    'show_description' => true,
                    'show_line_items' => true,
                    'success_url' => config('services.paymongo.success_url').'?order='.$order->order_number,
                    'cancel_url' => config('services.paymongo.failed_url').'?order='.$order->order_number,
                ],
            ],
        ])->throw()->json();

        return [
            'transaction_id' => data_get($response, 'data.id'),
            'payment_reference' => $order->order_number,
            'checkout_url' => data_get($response, 'data.attributes.checkout_url'),
            'amount' => $amount,
            'payload' => $response,
        ];
    }

    private function client(string $secretKey): PendingRequest
    {
        return Http::withBasicAuth($secretKey, '')
            ->acceptJson()
            ->asJson()
            ->timeout(30);
    }

    private function lineItems(Order $order, float $amount): array
    {
        if (config('services.paymongo.force_checkout_amount')) {
            return [[
                'name' => 'Tindahan checkout for '.$order->order_number,
                'quantity' => 1,
                'amount' => (int) round($amount * 100),
                'currency' => 'PHP',
            ]];
        }

        return $order->items->map(fn ($item) => [
            'name' => $item->product_name,
            'quantity' => $item->quantity,
            'amount' => (int) round($item->unit_price * 100),
            'currency' => 'PHP',
        ])->push([
            'name' => 'Shipping',
            'quantity' => 1,
            'amount' => (int) round($order->shipping_fee * 100),
            'currency' => 'PHP',
        ])->push([
            'name' => 'Tax',
            'quantity' => 1,
            'amount' => (int) round($order->tax_total * 100),
            'currency' => 'PHP',
        ])->values()->all();
    }

    private function checkoutAmount(Order $order): float
    {
        if (config('services.paymongo.force_checkout_amount')) {
            return max(1.00, (float) config('services.paymongo.checkout_amount', 1.00));
        }

        return (float) $order->total;
    }

    private function demoCheckout(Order $order, float $amount): array
    {
        return [
            'transaction_id' => 'demo_'.Str::lower(Str::random(18)),
            'payment_reference' => 'ONLINE-'.$order->order_number,
            'checkout_url' => config('services.paymongo.success_url').'?order='.$order->order_number,
            'amount' => $amount,
            'payload' => [
                'mode' => 'demo',
                'merchant_name' => config('services.paymongo.merchant_name'),
                'message' => 'Add PAYMONGO_SECRET_KEY to enable live online checkout.',
                'forced_checkout_amount' => config('services.paymongo.force_checkout_amount'),
            ],
        ];
    }
}
