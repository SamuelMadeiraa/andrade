/**
 * Limite de tentativas em memória: no máximo `max` por `janelaMs` para cada
 * chave (em geral, o endereço de quem chama).
 *
 * Na Vercel a memória é de cada instância da função, então isto é uma barreira
 * de melhor esforço: segura robô simples e erro de digitação em série, mas não
 * substitui uma regra de rate limit no Firewall da Vercel.
 */
export function criarLimite({ max, janelaMs }) {
  const usos = new Map(); // chave → [instantes]

  function limpar(agora) {
    for (const [k, lista] of usos) {
      if (!lista.some((t) => agora - t < janelaMs)) usos.delete(k);
    }
  }

  const recentes = (chave, agora) => (usos.get(chave) || []).filter((t) => agora - t < janelaMs);

  return {
    /** Quantos segundos faltam para poder tentar de novo (0 = pode). */
    espera(chave) {
      const agora = Date.now();
      const lista = recentes(chave, agora);
      return lista.length < max ? 0 : Math.ceil((lista[0] + janelaMs - agora) / 1000);
    },
    /** Conta uma tentativa. */
    registrar(chave) {
      const agora = Date.now();
      if (usos.size > 5000) limpar(agora);
      usos.set(chave, [...recentes(chave, agora), agora]);
    },
    zerar(chave) {
      usos.delete(chave);
    },
  };
}

/**
 * De onde veio a requisição. Na Vercel, x-forwarded-for é escrito pela própria
 * plataforma (o visitante não consegue forjar); fora dela, vale o soquete.
 */
export function origemDe(req) {
  const encaminhado = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return encaminhado || req.socket?.remoteAddress || "desconhecido";
}
