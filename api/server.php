<?php

/**
 * Minimal router for PHP's built-in server used by `php artisan serve`.
 * Serves static files from the `public` directory and forwards other
 * requests to `public/index.php`.
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');

$publicPath = __DIR__ . '/public';

// If the request is for a real file in the public dir, return false so the
// built-in PHP server will serve the file directly.
if ($uri !== '/' && file_exists($publicPath . $uri)) {
    return false;
}

require_once $publicPath . '/index.php';
