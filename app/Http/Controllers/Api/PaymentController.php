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

    public function online(Request $request, PayMongoService $payMongo): JsonResponse
    {
        $data = $request->validate(['order_id' => ['required', 'exists:orders,id']]);
        $order = Order::with('items', 'user')->findOrFail($data['order_id']);
        abort_if($order->user_id !== $request->user()->id, 403);
        abort_if($order->payment_status === 'paid', 422, 'This order is already paid.');

        $checkout = $payMongo->createGcashCheckout($order);

        $payment = $order->payment()->updateOrCreate([], [
            'user_id' => $request->user()->id,
            'gateway' => 'paymongo',
            'method' => 'online',
            'transaction_id' => $checkout['transaction_id'],
            'payment_reference' => $checkout['payment_reference'],
            'amount' => $checkout['amount'],
            'status' => 'pending',
            'payload' => $checkout['payload'] + ['checkout_url' => $checkout['checkout_url']],
        ]);

        return response()->json($payment->fresh());
    }

    public function gcash(Request $request, PayMongoService $payMongo): JsonResponse
    {
        return $this->online($request, $payMongo);
    }

    public function cashOnDelivery(Request $request): JsonResponse
    {
        $data = $request->validate(['order_id' => ['required', 'exists:orders,id']]);
        $order = Order::with('items', 'user')->findOrFail($data['order_id']);
        abort_if($order->user_id !== $request->user()->id, 403);
        abort_if($order->payment_status === 'paid', 422, 'This order is already paid.');
        abort_if(in_array($order->status, ['cancelled', 'returned'], true), 422, 'This order cannot be changed to cash on delivery.');

        $payment = $order->payment()->updateOrCreate([], [
            'user_id' => $request->user()->id,
            'gateway' => 'cash',
            'method' => 'cash_on_delivery',
            'transaction_id' => null,
            'payment_reference' => 'COD-'.$order->order_number,
            'amount' => $order->total,
            'status' => 'pending',
            'payload' => ['message' => 'Collect payment upon delivery.'],
            'paid_at' => null,
        ]);

        $order->update(['payment_status' => 'cod_pending']);

        return response()->json($payment->fresh()->load('order.items'));
    }

    public function confirmSuccess(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order' => ['required', 'string', 'exists:orders,order_number'],
        ]);

        $order = Order::where('order_number', $data['order'])->firstOrFail();
        abort_if($order->user_id !== $request->user()->id, 403);
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
