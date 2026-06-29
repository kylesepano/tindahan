<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('product_variant_images')) {
            Schema::create('product_variant_images', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
                $table->text('url');
                $table->boolean('is_primary')->default(false);
                $table->unsignedInteger('position')->default(0);
                $table->timestamps();
            });
        }

        if (DB::table('product_variant_images')->count() === 0) {
            $primaryValue = DB::getDriverName() === 'pgsql' ? 'true' : '1';

            DB::statement("
                INSERT INTO product_variant_images (product_variant_id, url, is_primary, position, created_at, updated_at)
                SELECT id, image_url, {$primaryValue}, 1, NOW(), NOW()
                FROM product_variants
                WHERE image_url IS NOT NULL
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_images');
    }
};
