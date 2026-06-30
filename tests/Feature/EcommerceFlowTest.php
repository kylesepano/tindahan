<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class EcommerceFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_register_login_manage_profile_cart_checkout_and_pay_online_or_cod(): void
    {
        config([
            'services.paymongo.secret_key' => null,
            'services.paymongo.force_checkout_amount' => true,
            'services.paymongo.checkout_amount' => 1.00,
        ]);

        $product = $this->productWithVariants();
        Coupon::create([
            'code' => 'WELCOME10',
            'type' => 'percentage',
            'value' => 10,
            'minimum_spend' => 500,
            'usage_limit' => 10,
            'expires_at' => now()->addMonth(),
        ]);
        $primaryVariant = $product->variants()->where('value', 'Black')->first();
        $alternateVariant = $product->variants()->where('value', 'White')->first();

        $register = $this->postJson('/api/auth/register', [
            'name' => 'Customer One',
            'email' => 'customer@example.com',
            'phone' => '09171234567',
            'password' => 'password123',
        ])->assertCreated()
            ->assertJsonPath('user.email', 'customer@example.com')
            ->assertJsonStructure(['token']);

        $this->postJson('/api/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'password123',
        ])->assertOk()
            ->assertJsonPath('user.email', 'customer@example.com')
            ->assertJsonStructure(['token']);

        $user = User::where('email', 'customer@example.com')->first();
        $this->actingAs($user, 'sanctum');

        $this->patchJson('/api/auth/profile', [
            'name' => 'Customer Updated',
            'phone' => '09991234567',
        ])->assertOk()
            ->assertJsonPath('name', 'Customer Updated');

        $address = [
            'recipient_name' => 'Customer Updated',
            'phone' => '09991234567',
            'line1' => '123 Test Street',
            'line2' => 'Unit 5',
            'city' => 'Manila',
            'province' => 'Metro Manila',
            'postal_code' => '1000',
            'country' => 'Philippines',
        ];

        $this->postJson('/api/auth/address', $address)
            ->assertCreated()
            ->assertJsonPath('line1', '123 Test Street');

        $this->getJson('/api/products?category='.$product->category->slug.'&search=Sneaker')
            ->assertOk()
            ->assertJsonPath('data.0.id', $product->id);

        $wishlistId = $this->postJson('/api/wishlist', ['product_id' => $product->id])
            ->assertCreated()
            ->json('id');

        $this->getJson('/api/wishlist')
            ->assertOk()
            ->assertJsonPath('0.product.id', $product->id);

        $cartId = $this->postJson('/api/cart', [
            'product_id' => $product->id,
            'product_variant_id' => $primaryVariant->id,
            'quantity' => 2,
        ])->assertCreated()
            ->assertJsonPath('quantity', 2)
            ->json('id');

        $this->patchJson('/api/cart/'.$cartId, [
            'product_variant_id' => $alternateVariant->id,
            'quantity' => 1,
        ])->assertOk()
            ->assertJsonPath('product_variant_id', $alternateVariant->id)
            ->assertJsonPath('product.variants.0.name', 'Color')
            ->assertJsonPath('quantity', 1);

        $this->postJson('/api/coupons/apply', ['code' => 'WELCOME10'])
            ->assertOk()
            ->assertJsonPath('code', 'WELCOME10')
            ->assertJsonPath('discount_total', 88);

        $order = $this->postJson('/api/orders', [
            'shipping_address' => $address,
            'delivery_method' => 'standard',
            'coupon_code' => 'WELCOME10',
            'payment_method' => 'online',
        ])->assertCreated()
            ->assertJsonPath('items.0.product_id', $product->id)
            ->assertJsonPath('items.0.product_variant_id', $alternateVariant->id)
            ->json();

        $this->assertDatabaseMissing('cart_items', ['id' => $cartId]);
        $this->assertDatabaseHas('product_variants', ['id' => $alternateVariant->id, 'stock' => 3]);
        $this->assertDatabaseHas('orders', ['id' => $order['id'], 'payment_status' => 'unpaid', 'subtotal' => 880, 'discount_total' => 88]);
        $this->assertDatabaseHas('coupons', ['code' => 'WELCOME10', 'used_count' => 1]);

        $payment = $this->postJson('/api/payments/online', ['order_id' => $order['id']])
            ->assertOk()
            ->assertJsonPath('method', 'online')
            ->assertJsonPath('amount', 1)
            ->json();

        $recoverableOrder = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD-RECOVER-'.Str::upper(Str::random(6)),
            'delivery_method' => 'standard',
            'shipping_address' => $address,
            'subtotal' => 1000,
            'shipping_fee' => 95,
            'tax_total' => 120,
            'total' => 1215,
        ]);

        $this->postJson('/api/payments/online', ['order_id' => $recoverableOrder->id])
            ->assertOk()
            ->assertJsonPath('method', 'online');

        $this->postJson('/api/payments/cash-on-delivery', ['order_id' => $recoverableOrder->id])
            ->assertOk()
            ->assertJsonPath('method', 'cash_on_delivery')
            ->assertJsonPath('gateway', 'cash');

        $this->assertDatabaseHas('orders', ['id' => $recoverableOrder->id, 'payment_status' => 'cod_pending']);
        $this->assertDatabaseHas('payments', [
            'order_id' => $recoverableOrder->id,
            'method' => 'cash_on_delivery',
            'payment_reference' => 'COD-'.$recoverableOrder->order_number,
        ]);

        $this->postJson('/api/payments/confirm-success', ['order' => $order['order_number']])
            ->assertOk()
            ->assertJsonPath('status', 'paid');

        $this->getJson('/api/payments')
            ->assertOk()
            ->assertJsonPath('0.id', $payment['id'])
            ->assertJsonPath('0.status', 'paid');

        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonPath('0.id', $order['id'])
            ->assertJsonPath('0.payment.status', 'paid');

        $this->getJson('/api/orders/'.$order['id'])
            ->assertOk()
            ->assertJsonPath('shipping_address.line1', '123 Test Street')
            ->assertJsonPath('payment.status', 'paid');

        $this->postJson('/api/cart', [
            'product_id' => $product->id,
            'product_variant_id' => $primaryVariant->id,
            'quantity' => 1,
        ])->assertCreated();

        $codOrder = $this->postJson('/api/orders', [
            'shipping_address' => $address,
            'delivery_method' => 'standard',
            'payment_method' => 'cash_on_delivery',
        ])->assertCreated()
            ->assertJsonPath('payment.method', 'cash_on_delivery')
            ->assertJsonPath('payment_status', 'cod_pending')
            ->json();

        $this->assertDatabaseHas('payments', [
            'order_id' => $codOrder['id'],
            'gateway' => 'cash',
            'method' => 'cash_on_delivery',
            'status' => 'pending',
        ]);

        $this->deleteJson('/api/wishlist/'.$wishlistId)
            ->assertOk();
    }

    public function test_admin_can_add_edit_feature_filter_products_and_update_orders(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'customer']);
        $category = Category::create([
            'name' => 'Sneakers',
            'slug' => 'sneakers',
            'description' => 'Test sneakers',
            'image' => 'https://example.com/category.jpg',
        ]);
        $brand = Brand::create(['name' => 'Tindahan', 'slug' => 'tindahan']);

        $this->actingAs($admin, 'sanctum');

        $categoryId = $this->postJson('/api/admin/categories', [
            'name' => 'Accessories',
            'description' => 'Useful extras',
            'image' => 'https://example.com/accessories.jpg',
        ])->assertCreated()
            ->assertJsonPath('slug', 'accessories')
            ->json('id');

        $this->deleteJson('/api/admin/categories/'.$categoryId)
            ->assertOk()
            ->assertJsonPath('is_active', false);

        $this->assertSoftDeleted('categories', ['id' => $categoryId]);

        $this->patchJson('/api/admin/categories/'.$categoryId.'/restore')
            ->assertOk()
            ->assertJsonPath('is_active', true)
            ->assertJsonPath('deleted_at', null);

        $this->assertNotSoftDeleted('categories', ['id' => $categoryId]);

        $bannerId = $this->postJson('/api/admin/banners', [
            'title' => 'Admin Banner',
            'subtitle' => 'Fresh admin-managed hero',
            'image' => 'https://example.com/banner.jpg',
            'cta_label' => 'Shop picks',
            'cta_url' => '/products',
            'is_active' => true,
        ])->assertCreated()
            ->assertJsonPath('title', 'Admin Banner')
            ->json('id');

        $this->getJson('/api/banners')
            ->assertOk()
            ->assertJsonPath('0.id', $bannerId);

        $this->putJson('/api/admin/banners/'.$bannerId, [
            'title' => 'Admin Banner Updated',
            'subtitle' => 'Fresh admin-managed hero',
            'image' => 'https://example.com/banner.jpg',
            'cta_label' => 'Shop picks',
            'cta_url' => '/products',
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('is_active', false);

        $couponId = $this->postJson('/api/admin/coupons', [
            'code' => 'ADMIN150',
            'type' => 'fixed',
            'value' => 150,
            'minimum_spend' => 1000,
            'usage_limit' => 25,
            'expires_at' => now()->addMonth()->toDateString(),
            'is_active' => true,
        ])->assertCreated()
            ->assertJsonPath('code', 'ADMIN150')
            ->json('id');

        $this->getJson('/api/admin/coupons')
            ->assertOk()
            ->assertJsonPath('0.id', $couponId);

        $this->patchJson('/api/admin/coupons/'.$couponId, ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('is_active', false);

        $seededStyleProduct = Product::create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Seeded Style Product',
            'slug' => 'seeded-style-product',
            'sku' => 'SKU-SEEDED-1',
            'price' => 1500,
            'compare_at_price' => 1800,
            'stock' => 3,
            'status' => 'active',
            'description' => 'Looks like older seeded products with variant.image_url only.',
            'specifications' => ['material' => 'Canvas'],
        ]);
        $seededStyleProduct->images()->create([
            'url' => 'https://example.com/seeded-product.jpg',
            'is_primary' => true,
            'position' => 1,
        ]);
        $seededStyleVariant = $seededStyleProduct->variants()->create([
            'name' => 'Color',
            'value' => 'Black',
            'image_url' => 'https://example.com/seeded-variant.jpg',
            'price_delta' => 0,
            'stock' => 3,
        ]);

        $this->putJson('/api/admin/products/'.$seededStyleProduct->id, [
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Seeded Style Product Updated',
            'sku' => 'SKU-SEEDED-1',
            'price' => 1500,
            'compare_at_price' => 1800,
            'discount' => 0,
            'stock' => 3,
            'status' => 'active',
            'description' => 'Updated without manually re-adding variant image rows.',
            'specifications' => ['material' => 'Canvas'],
            'image_urls' => ['https://example.com/seeded-product.jpg'],
            'variants' => [[
                'id' => $seededStyleVariant->id,
                'name' => 'Color',
                'value' => 'Black',
                'image_url' => 'https://example.com/seeded-variant.jpg',
                'image_urls' => [],
                'price_delta' => 0,
                'stock' => 3,
            ]],
        ])->assertOk()
            ->assertJsonPath('name', 'Seeded Style Product Updated');

        $productPayload = [
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Admin Test Sneaker',
            'sku' => 'SKU-ADMIN-1',
            'price' => 2000,
            'compare_at_price' => 2500,
            'discount' => 10,
            'discount_starts_at' => now()->subDay()->toDateTimeString(),
            'discount_ends_at' => now()->addDays(7)->toDateTimeString(),
            'stock' => 0,
            'status' => 'active',
            'description' => 'A complete admin-created product.',
            'specifications' => ['material' => 'Canvas'],
            'image_urls' => ['https://example.com/product.jpg'],
            'is_featured' => false,
            'variants' => [
                [
                    'name' => 'Color',
                    'value' => 'Black',
                    'price_delta' => 0,
                    'discount' => 15,
                    'discount_starts_at' => now()->subDay()->toDateTimeString(),
                    'discount_ends_at' => now()->addDays(3)->toDateTimeString(),
                    'stock' => 8,
                    'image_urls' => ['https://example.com/black.jpg'],
                ],
            ],
        ];

        $productId = $this->postJson('/api/admin/products', $productPayload)
            ->assertCreated()
            ->assertJsonPath('stock', 8)
            ->assertJsonPath('active_discount_percent', 10)
            ->assertJsonPath('variants.0.active_discount_percent', 15)
            ->json('id');

        $this->patchJson('/api/admin/products/'.$productId.'/featured', ['is_featured' => true])
            ->assertOk()
            ->assertJsonPath('is_featured', true);

        $this->getJson('/api/admin/products?category='.$category->id.'&featured=1')
            ->assertOk()
            ->assertJsonPath('data.0.id', $productId);

        $updatedPayload = $productPayload;
        $updatedPayload['name'] = 'Admin Test Sneaker Updated';
        $updatedPayload['price'] = 2200;
        $updatedPayload['variants'][0]['id'] = Product::find($productId)->variants()->first()->id;
        $updatedPayload['variants'][0]['stock'] = 6;

        $this->putJson('/api/admin/products/'.$productId, $updatedPayload)
            ->assertOk()
            ->assertJsonPath('name', 'Admin Test Sneaker Updated')
            ->assertJsonPath('stock', 6);

        $variantId = Product::find($productId)->variants()->first()->id;
        $this->deleteJson('/api/admin/products/'.$productId.'/variants/'.$variantId)
            ->assertOk()
            ->assertJsonPath('stock', 6)
            ->assertJsonPath('variants', []);

        $this->assertSoftDeleted('product_variants', ['id' => $variantId]);

        $this->assertDatabaseHas('product_price_histories', [
            'product_id' => $productId,
            'old_price' => 2000,
            'new_price' => 2200,
        ]);

        $this->deleteJson('/api/admin/products/'.$productId)
            ->assertOk()
            ->assertJsonPath('status', 'archived');

        $this->assertSoftDeleted('products', ['id' => $productId]);

        $this->getJson('/api/admin/products?status=deleted')
            ->assertOk()
            ->assertJsonPath('data.0.id', $productId);

        $this->patchJson('/api/admin/products/'.$productId.'/restore')
            ->assertOk()
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('deleted_at', null);

        $this->assertNotSoftDeleted('products', ['id' => $productId]);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'ORD-TEST-'.Str::upper(Str::random(6)),
            'delivery_method' => 'standard',
            'shipping_address' => ['line1' => 'Admin order address'],
            'subtotal' => 2200,
            'shipping_fee' => 95,
            'tax_total' => 264,
            'total' => 2559,
        ]);

        $this->getJson('/api/admin/orders?search='.$order->order_number)
            ->assertOk()
            ->assertJsonPath('data.0.id', $order->id);

        $this->patchJson('/api/admin/orders/'.$order->id.'/status', ['status' => 'shipped'])
            ->assertOk()
            ->assertJsonPath('status', 'shipped');
    }

    public function test_role_restricted_api_routes_reject_wrong_users(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/cart')
            ->assertForbidden();
    }

    public function test_review_submission_endpoint_is_not_exposed_yet(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $product = $this->productWithVariants();

        $this->actingAs($user, 'sanctum');

        $reviewResponse = $this->postJson('/api/products/'.$product->id.'/reviews', [
            'rating' => 5,
            'comment' => 'Great product.',
        ]);
        $this->assertContains($reviewResponse->getStatusCode(), [404, 405]);
    }

    private function productWithVariants(): Product
    {
        $category = Category::create([
            'name' => 'Sneakers',
            'slug' => 'sneakers',
            'description' => 'Test sneakers',
            'image' => 'https://example.com/category.jpg',
        ]);
        $brand = Brand::create(['name' => 'Tindahan', 'slug' => 'tindahan']);
        $product = Product::create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Sneaker Flow',
            'slug' => 'sneaker-flow',
            'sku' => 'SNK-FLOW',
            'price' => 1000,
            'compare_at_price' => 1200,
            'stock' => 9,
            'status' => 'active',
            'description' => 'A test sneaker product.',
            'specifications' => ['material' => 'Canvas'],
        ]);

        $product->images()->create([
            'url' => 'https://example.com/product.jpg',
            'is_primary' => true,
            'position' => 1,
        ]);

        foreach ([
            ['value' => 'Black', 'stock' => 5],
            ['value' => 'White', 'stock' => 4],
        ] as $index => $variantData) {
            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'name' => 'Color',
                'value' => $variantData['value'],
                'image_url' => 'https://example.com/'.strtolower($variantData['value']).'.jpg',
                'price_delta' => $index * 100,
                'discount' => $variantData['value'] === 'White' ? 20 : 0,
                'discount_starts_at' => $variantData['value'] === 'White' ? now()->subDay() : null,
                'discount_ends_at' => $variantData['value'] === 'White' ? now()->addWeek() : null,
                'stock' => $variantData['stock'],
            ]);
            $variant->images()->create([
                'url' => $variant->image_url,
                'is_primary' => true,
                'position' => 1,
            ]);
        }

        return $product->fresh('category', 'brand', 'images', 'variants.images');
    }
}
