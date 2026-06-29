FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libicu-dev \
        libpq-dev \
        libzip-dev \
        nodejs \
        npm \
    && docker-php-ext-install intl pdo_mysql pdo_pgsql zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1 \
    COMPOSER_MAX_PARALLEL_HTTP=1

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN git config --global http.version HTTP/1.1 \
    && composer clear-cache \
    && composer install --no-dev --prefer-source --no-progress --no-interaction --optimize-autoloader \
    && npm ci \
    && npm run build \
    && npm prune --omit=dev \
    && chown -R www-data:www-data storage bootstrap/cache \
    && sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf /etc/apache2/apache2.conf

COPY docker/render-start.sh /usr/local/bin/render-start
RUN chmod +x /usr/local/bin/render-start

EXPOSE 80

CMD ["render-start"]
