#!/usr/bin/env bash
set -e

php artisan migrate --force

if [ "${SEED_DATABASE:-false}" = "true" ]; then
    php artisan db:seed --force
fi

php artisan config:cache
php artisan route:cache
php artisan view:cache

apache2-foreground
