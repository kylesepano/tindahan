<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminContentController;
use App\Http\Controllers\Api\AdminProductController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\WishlistController;
use Illuminate\Support\Facades\Route;

Route::get('health', fn () => ['status' => 'ok']);
Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login']);
Route::get('products', [ProductController::class, 'index']);
Route::get('products/{product:slug}', [ProductController::class, 'show']);
Route::get('categories', [ProductController::class, 'categories']);
Route::get('banners', [ProductController::class, 'banners']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::patch('auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('auth/address', [AuthController::class, 'saveAddress']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    Route::middleware('customer')->group(function () {
        Route::apiResource('cart', CartController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::apiResource('wishlist', WishlistController::class)->only(['index', 'store', 'destroy']);
        Route::post('coupons/apply', [CouponController::class, 'apply']);
        Route::apiResource('orders', OrderController::class)->only(['index', 'store', 'show']);
        Route::post('orders/{order}/cancel', [OrderController::class, 'cancel']);
        Route::post('payments/online', [PaymentController::class, 'online']);
        Route::post('payments/gcash', [PaymentController::class, 'gcash']);
        Route::post('payments/cash-on-delivery', [PaymentController::class, 'cashOnDelivery']);
        Route::post('payments/confirm-success', [PaymentController::class, 'confirmSuccess']);
        Route::get('payments', [PaymentController::class, 'index']);
    });

    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('dashboard', [AdminController::class, 'dashboard']);
        Route::get('orders', [AdminController::class, 'orders']);
        Route::patch('orders/{order}/status', [AdminController::class, 'updateOrderStatus']);
        Route::get('banners', [AdminContentController::class, 'banners']);
        Route::post('banners', [AdminContentController::class, 'storeBanner']);
        Route::put('banners/{banner}', [AdminContentController::class, 'updateBanner']);
        Route::delete('banners/{banner}', [AdminContentController::class, 'destroyBanner']);
        Route::get('coupons', [AdminContentController::class, 'coupons']);
        Route::post('coupons', [AdminContentController::class, 'storeCoupon']);
        Route::patch('coupons/{coupon}', [AdminContentController::class, 'updateCoupon']);
        Route::get('categories', [AdminContentController::class, 'categories']);
        Route::post('categories', [AdminContentController::class, 'storeCategory']);
        Route::delete('categories/{category}', [AdminContentController::class, 'destroyCategory']);
        Route::patch('categories/{category}/restore', [AdminContentController::class, 'restoreCategory']);
        Route::patch('products/{product}/stock', [AdminProductController::class, 'updateStock']);
        Route::patch('products/{product}/featured', [AdminProductController::class, 'updateFeatured']);
        Route::patch('products/{product}/restore', [AdminProductController::class, 'restore']);
        Route::delete('products/{product}/variants/{variant}', [AdminProductController::class, 'destroyVariant']);
        Route::apiResource('products', AdminProductController::class);
    });
});
