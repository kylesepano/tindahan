<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\PayMongoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Payment::query()
                ->with('order.items')
                ->where('user_id', $request->user()->id)
                ->latest()
                ->get()
        );
    }

    public function gcash(Request $request, PayMongoService $payMongo): JsonResponse
    {
        $data = $request->validate(['order_id' => ['required', 'exists:orders,id']]);
        $order = Order::with('items', 'user')->findOrFail($data['order_id']);
        abort_if($order->user_id !== $request->user()->id, 403);

        $checkout = $payMongo->createGcashCheckout($order);

        $payment = $order->payment()->updateOrCreate([], [
            'user_id' => $request->user()->id,
            'gateway' => 'paymongo',
            'method' => 'gcash',
            'transaction_id' => $checkout['transaction_id'],
            'payment_reference' => $checkout['payment_reference'],
            'amount' => $checkout['amount'],
            'status' => 'pending',
            'payload' => $checkout['payload'] + ['checkout_url' => $checkout['checkout_url']],
        ]);

        return response()->json($payment->fresh());
    }

    public function confirmSuccess(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order' => ['required', 'string', 'exists:orders,order_number'],
        ]);

        $order = Order::where('order_number', $data['order'])->firstOrFail();
        $payment = $order->payment;

        abort_if(! $payment, 404, 'Payment not found for this order.');

        $payment->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $order->update([
            'payment_status' => 'paid',
            'status' => $order->status === 'pending' ? 'confirmed' : $order->status,
        ]);

        return response()->json($payment->fresh()->load('order.items'));
    }
}
