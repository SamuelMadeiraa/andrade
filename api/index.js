/**
 * API do painel no site no ar (função da Vercel). O vercel.json manda
 * todo /api/<rota> para cá com ?rota=<rota>. Dados no Vercel Blob privado.
 */
import { criarRotas } from "../server/nucleo.js";
import { armazemBlob, tokenBlob } from "../server/armazem-blob.js";

const blobLigado = Boolean(tokenBlob || process.env.BLOB_STORE_ID);

/**
 * Sem Blob ligado ao projeto: o site segue com o conteúdo embutido no build
 * e as inscrições chegam só pelo WhatsApp. Gravar avisa o que falta.
 */
const semArmazem = new Proxy(
  { lerConteudo: async () => null },
  {
    get: (alvo, nome) =>
      alvo[nome] ??
      (async () => {
        throw Object.assign(
          new Error("Armazenamento não configurado: crie um Blob privado e ligue ao projeto na Vercel."),
          { code: 503 }
        );
      }),
  }
);

const tratar = criarRotas({
  senha: process.env.ADMIN_SENHA,
  armazem: blobLigado ? armazemBlob : semArmazem,
});

export default function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const rota = url.searchParams.get("rota") ?? url.pathname.replace(/^\/api\/?/, "");
  // diagnóstico da configuração: diz só SE existe e os NOMES das variáveis,
  // nunca os valores
  if (rota === "diagnostico") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.end(
      JSON.stringify({
        senhaConfigurada: Boolean(process.env.ADMIN_SENHA),
        blobConfigurado: blobLigado,
        ambiente: process.env.VERCEL_ENV || null,
        variaveis: Object.keys(process.env)
          .filter((k) => /BLOB|READ_WRITE|STORE_ID|ADMIN|SENHA/i.test(k))
          .sort(),
      })
    );
  }

  return tratar(req, res, `/api/${rota}`);
}
