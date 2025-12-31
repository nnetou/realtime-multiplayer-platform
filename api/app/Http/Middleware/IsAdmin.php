<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Verifica se o utilizador está autenticado e se o seu tipo é 'A' (Admin)
        if ($request->user() && $request->user()->type === 'A') {
            // Se for admin, permite que o pedido continue para a rota
            return $next($request);
        }

        // Se não for admin, retorna um erro de "Acesso Negado"
        return response()->json(['message' => 'Acesso não autorizado.'], 403);
    }
}
