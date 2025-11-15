<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetImmutableCache
{
    /**
     * Adiciona cabeçalhos de Cache-Control para assets estáticos (imagens de cartas e naipes).
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Verifica se o pedido contém o caminho das imagens (assumindo que todas as cartas/naipes passam por aqui)
        if (str_contains($request->getPathInfo(), '/images/cartas/playing-cards-master/') ||
            str_contains($request->getPathInfo(), '/images/cartas/')) 
        {
            // Define o Cache-Control:
            // 1. public: Pode ser armazenado em cache por qualquer proxy/navegador.
            // 2. max-age=31536000: Cache por 1 ano.
            // 3. immutable: Indica que o conteúdo nunca mudará (ideal para assets estáticos).
            $response->header('Cache-Control', 'public, max-age=31536000, immutable');
        }
        
        return $response;
    }
}