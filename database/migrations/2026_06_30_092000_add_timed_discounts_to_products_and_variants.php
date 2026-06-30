<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'discount_starts_at')) {
                $table->timestamp('discount_starts_at')->nullable()->after('discount');
            }
            if (! Schema::hasColumn('products', 'discount_ends_at')) {
                $table->timestamp('discount_ends_at')->nullable()->after('discount_starts_at');
            }
        });

        Schema::table('product_variants', function (Blueprint $table) {
            if (! Schema::hasColumn('product_variants', 'discount')) {
                $table->unsignedTinyInteger('discount')->default(0)->after('price_delta');
            }
            if (! Schema::hasColumn('product_variants', 'discount_starts_at')) {
                $table->timestamp('discount_starts_at')->nullable()->after('discount');
            }
            if (! Schema::hasColumn('product_variants', 'discount_ends_at')) {
                $table->timestamp('discount_ends_at')->nullable()->after('discount_starts_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            foreach (['discount_ends_at', 'discount_starts_at', 'discount'] as $column) {
                if (Schema::hasColumn('product_variants', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('products', function (Blueprint $table) {
            foreach (['discount_ends_at', 'discount_starts_at'] as $column) {
                if (Schema::hasColumn('products', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
