<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetImmutableCache
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (str_contains($request->getPathInfo(), '/images/cartas/playing-cards-master/') ||
            str_contains($request->getPathInfo(), '/images/cartas/')) 
        {
            $response->header('Cache-Control', 'public, max-age=31536000, immutable');
        }
        
        return $response;
    }
}