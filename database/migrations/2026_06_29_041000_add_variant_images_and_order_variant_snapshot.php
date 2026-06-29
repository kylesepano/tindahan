<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('product_variants', 'image_url')) {
            Schema::table('product_variants', function (Blueprint $table) {
                $table->text('image_url')->nullable()->after('value');
            });
        }

        if (! Schema::hasColumn('order_items', 'product_variant_id')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->foreignId('product_variant_id')->nullable()->after('product_id')->constrained('product_variants')->nullOnDelete();
            });
        }

        if (! Schema::hasColumn('order_items', 'variant_name')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->string('variant_name')->nullable()->after('product_name');
            });
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('
                UPDATE product_variants pv
                SET image_url = pi.url
                FROM product_images pi
                WHERE pi.product_id = pv.product_id
                    AND pi.is_primary = true
                    AND pv.image_url IS NULL
                    AND pi.url IS NOT NULL
            ');

            DB::statement('
                UPDATE products p
                SET stock = totals.variant_stock
                FROM (
                    SELECT product_id, SUM(stock) AS variant_stock
                    FROM product_variants
                    GROUP BY product_id
                ) totals
                WHERE totals.product_id = p.id
            ');
        } else {
            DB::statement('
                UPDATE product_variants pv
                LEFT JOIN product_images pi ON pi.product_id = pv.product_id AND pi.is_primary = 1
                SET pv.image_url = pi.url
                WHERE pv.image_url IS NULL AND pi.url IS NOT NULL
            ');

            DB::statement('
                UPDATE products p
                JOIN (
                    SELECT product_id, SUM(stock) AS variant_stock
                    FROM product_variants
                    GROUP BY product_id
                ) totals ON totals.product_id = p.id
                SET p.stock = totals.variant_stock
            ');
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_items', 'product_variant_id')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropConstrainedForeignId('product_variant_id');
            });
        }

        if (Schema::hasColumn('order_items', 'variant_name')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropColumn('variant_name');
            });
        }

        if (Schema::hasColumn('product_variants', 'image_url')) {
            Schema::table('product_variants', function (Blueprint $table) {
                $table->dropColumn('image_url');
            });
        }
    }
};
