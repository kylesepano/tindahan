<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Tindahan Admin',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );

        $customer = User::updateOrCreate(
            ['email' => 'customer@example.com'],
            [
                'name' => 'Demo Customer',
                'password' => Hash::make('password'),
                'role' => 'customer',
                'email_verified_at' => now(),
            ]
        );

        if (Product::query()->exists()) {
            return;
        }

        $categoryImages = [
            'Sneakers' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85',
            'Streetwear' => 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=85',
            'Bags' => 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=1200&q=85',
            'Watches' => 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=85',
            'Audio' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85',
            'Gaming' => 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=85',
            'Home Tech' => 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=85',
            'Beauty' => 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=85',
        ];

        $productImages = [
            'Sneakers' => [
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1000&q=85',
            ],
            'Streetwear' => [
                'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85',
            ],
            'Bags' => [
                'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85',
            ],
            'Watches' => [
                'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1000&q=85',
            ],
            'Audio' => [
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=85',
            ],
            'Gaming' => [
                'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1000&q=85',
            ],
            'Home Tech' => [
                'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?auto=format&fit=crop&w=1000&q=85',
            ],
            'Beauty' => [
                'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=85',
                'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1000&q=85',
            ],
        ];

        $productNames = [
            'Sneakers' => ['Road Runner Knit Sneakers', 'Cloudstep Daily Trainers', 'Retro Court Low Sneakers', 'Trail Flex Running Shoes', 'Canvas Street Sneakers', 'Velocity Mesh Trainers'],
            'Streetwear' => ['Oversized Cotton Tee', 'Urban Zip Hoodie', 'Relaxed Cargo Jacket', 'Classic Denim Overshirt', 'Everyday Crewneck Pullover', 'Boxy Graphic Shirt'],
            'Bags' => ['Pebbled Leather Tote', 'City Crossbody Bag', 'Travel Weekender Duffel', 'Compact Sling Pack', 'Structured Shoulder Bag', 'Minimal Laptop Backpack'],
            'Watches' => ['Heritage Leather Watch', 'Steel Chronograph Watch', 'Minimal Black Dial Watch', 'Everyday Field Watch', 'Classic Mesh Strap Watch', 'Sport Timer Watch'],
            'Audio' => ['Studio Wireless Headphones', 'Noise Canceling Earbuds', 'Portable Bluetooth Speaker', 'Hi-Fi Over Ear Headset', 'Compact Travel Earphones', 'Bass Boost Headphones'],
            'Gaming' => ['RGB Mechanical Keyboard', 'Wireless Gaming Controller', 'Pro Gaming Headset', 'Precision Gaming Mouse', 'Console Starter Bundle', 'Desk Streaming Microphone'],
            'Home Tech' => ['Smart Home Hub', 'Compact Security Camera', 'Wi-Fi Smart Lamp', 'Voice Control Speaker', 'Smart Plug Twin Pack', 'Air Quality Monitor'],
            'Beauty' => ['Hydrating Skin Serum', 'Daily Glow Moisturizer', 'Matte Lip Color Set', 'Botanical Face Cleanser', 'Soft Finish Makeup Kit', 'Nourishing Hair Oil'],
        ];

        $categories = collect(array_keys($categoryImages))->map(fn ($name) => Category::updateOrCreate(
            ['slug' => Str::slug($name)],
            [
                'name' => $name,
                'description' => "Curated {$name} essentials for everyday shopping.",
                'image' => $categoryImages[$name],
            ]
        ));

        $brands = collect(['AeroWear', 'Northline', 'PulseLab', 'Kinetic', 'Casa Nova', 'BrightSkin'])
            ->map(fn ($name) => Brand::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name]));

        for ($i = 1; $i <= 60; $i++) {
            $price = $this->numberBetween(650, 18500);
            $category = $categories->random();
            $name = $productNames[$category->name][($i - 1) % count($productNames[$category->name])];
            $product = Product::create([
                'category_id' => $category->id,
                'brand_id' => $brands->random()->id,
                'name' => $name,
                'slug' => Str::slug($name).'-'.$i,
                'sku' => 'SKU-'.str_pad((string) $i, 5, '0', STR_PAD_LEFT),
                'price' => $price,
                'compare_at_price' => $price + $this->numberBetween(250, 2000),
                'discount' => $this->numberBetween(0, 35),
                'stock' => $this->numberBetween(0, 120),
                'rating' => $this->randomFloat(2, 3.6, 5),
                'reviews_count' => $this->numberBetween(4, 180),
                'is_featured' => $i <= 12,
                'is_flash_sale' => $i % 7 === 0,
                'description' => $this->paragraphs(2),
                'specifications' => [
                    'Material' => $this->randomElement(['Cotton blend', 'Aluminum', 'Vegan leather', 'Recycled polycarbonate']),
                    'Warranty' => $this->randomElement(['6 months', '1 year', '2 years']),
                    'Origin' => 'Philippines',
                ],
            ]);

            foreach (array_values($productImages[$category->name]) as $index => $url) {
                $product->images()->create([
                    'url' => $url.'&sig='.$i.$index,
                    'is_primary' => $index === 0,
                    'position' => $index + 1,
                ]);
            }

            $variantStock = 0;
            foreach (['Black', 'White', 'Limited'] as $index => $variant) {
                $stock = $this->numberBetween(0, 30);
                $variantStock += $stock;
                $variantModel = $product->variants()->create([
                    'name' => 'Color',
                    'value' => $variant,
                    'image_url' => $productImages[$category->name][$index % count($productImages[$category->name])].'&variant='.$i.$index,
                    'price_delta' => $variant === 'Limited' ? $this->numberBetween(150, 600) : 0,
                    'stock' => $stock,
                ]);
                $variantModel->images()->create([
                    'url' => $variantModel->image_url,
                    'is_primary' => true,
                    'position' => 1,
                ]);
            }
            $product->update(['stock' => $variantStock]);

            if ($i <= 20) {
                $product->reviews()->create([
                    'user_id' => $customer->id,
                    'rating' => $this->numberBetween(4, 5),
                    'comment' => $this->sentence(14),
                ]);
            }
        }

        foreach (['WELCOME10' => 10, 'PAYDAY150' => 150, 'FLASH20' => 20] as $code => $value) {
            Coupon::updateOrCreate(
                ['code' => $code],
                [
                    'type' => Str::contains($code, '150') ? 'fixed' : 'percentage',
                    'value' => $value,
                    'minimum_spend' => 1000,
                    'usage_limit' => 500,
                    'expires_at' => now()->addMonths(2),
                ]
            );
        }

        Banner::updateOrCreate(
            ['title' => 'Midyear Picks Are Live'],
            [
                'subtitle' => 'Fresh drops, online payment, cash on delivery, and same-week delivery.',
                'image' => 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
                'cta_label' => 'Shop deals',
                'cta_url' => '/products',
            ]
        );

        foreach (range(1, 3) as $i) {
            $paymentMode = $i === 2 ? 'cash_on_delivery' : 'online';
            $paymentStatus = $i === 1 ? 'paid' : ($paymentMode === 'cash_on_delivery' ? 'cod_pending' : 'unpaid');
            $order = Order::create([
                'user_id' => $customer->id,
                'order_number' => 'ORD-DEMO-'.str_pad((string) $i, 3, '0', STR_PAD_LEFT),
                'status' => $i === 1 ? 'delivered' : 'pending',
                'payment_status' => $paymentStatus,
                'delivery_method' => 'standard',
                'shipping_address' => ['line1' => '123 Demo Street', 'city' => 'Manila', 'province' => 'Metro Manila', 'postal_code' => '1000'],
                'subtotal' => 1800,
                'shipping_fee' => 95,
                'tax_total' => 216,
                'total' => 2111,
            ]);
            $product = Product::inRandomOrder()->first();
            $order->items()->create([
                'product_id' => $product->id,
                'product_name' => $product->name,
                'sku' => $product->sku,
                'unit_price' => $product->price,
                'quantity' => 1,
                'total' => $product->price,
            ]);
            $order->payment()->create([
                'user_id' => $customer->id,
                'gateway' => $paymentMode === 'cash_on_delivery' ? 'cash' : 'paymongo',
                'method' => $paymentMode,
                'payment_reference' => ($paymentMode === 'cash_on_delivery' ? 'COD-' : 'ONLINE-').$order->order_number,
                'amount' => $order->total,
                'status' => $paymentStatus === 'paid' ? 'paid' : 'pending',
                'paid_at' => $paymentStatus === 'paid' ? now() : null,
                'payload' => ['mode' => 'seeded_demo'],
            ]);
        }

        $admin->activityLogs()->create([
            'action' => 'seeded',
            'description' => 'Initial commerce platform dataset created.',
        ]);
    }

    private function numberBetween(int $min, int $max): int
    {
        return random_int($min, $max);
    }

    private function randomFloat(int $decimals, float $min, float $max): float
    {
        return round($min + (random_int(0, 10000) / 10000) * ($max - $min), $decimals);
    }

    private function randomElement(array $items): mixed
    {
        return $items[array_rand($items)];
    }

    private function sentence(int $words = 12): string
    {
        $pool = ['premium', 'daily', 'quality', 'modern', 'comfortable', 'durable', 'curated', 'local', 'fresh', 'reliable', 'stylish', 'practical', 'essential', 'smooth', 'lightweight'];
        $selected = [];

        for ($i = 0; $i < $words; $i++) {
            $selected[] = $this->randomElement($pool);
        }

        return ucfirst(implode(' ', $selected)).'.';
    }

    private function paragraphs(int $count = 2): string
    {
        return collect(range(1, $count))
            ->map(fn () => $this->sentence(18).' '.$this->sentence(14))
            ->implode("\n\n");
    }
}
