# Tindahan

Laravel 12 + React ecommerce platform with MySQL, Sanctum auth, customer storefront, admin dashboard, and GCash checkout through PayMongo.

## Local Setup

1. Start Apache/MySQL from XAMPP.
2. Create and seed the MySQL database:

```bash
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS commerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate:fresh --seed
```

3. Build frontend assets:

```bash
npm.cmd run build
```

4. Run the app:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Open `http://127.0.0.1:8000`.

## Demo Accounts

Admin: `admin@example.com` / `password`

Customer: `customer@example.com` / `password`

## MySQL

The app uses this default XAMPP MySQL connection:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=commerce
DB_USERNAME=root
DB_PASSWORD=
```

## GCash Merchant / PayMongo

Add your PayMongo merchant keys in `.env`:

```env
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key
PAYMONGO_SECRET_KEY=sk_test_your_secret_key
PAYMONGO_WEBHOOK_SECRET=
PAYMONGO_MERCHANT_NAME="Tindahan"
PAYMONGO_SUCCESS_URL="${APP_URL}/payment/success"
PAYMONGO_FAILED_URL="${APP_URL}/payment/failed"
PAYMONGO_FORCE_CHECKOUT_AMOUNT=true
PAYMONGO_CHECKOUT_AMOUNT=1.00
```

The endpoint `POST /api/payments/gcash` creates a GCash checkout session when `PAYMONGO_SECRET_KEY` is configured. Without a key, it returns a demo checkout payload for local development.
