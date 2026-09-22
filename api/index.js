/**
 * API do painel no site no ar (função da Vercel). O vercel.json manda
 * todo /api/<rota> para cá com ?rota=<rota>. Dados no Vercel Blob privado.
 */
import { criarRotas } from "../server/nucleo.js";
import { armazemBlob } from "../server/armazem-blob.js";

const blobLigado = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

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
  return tratar(req, res, `/api/${rota}`);
}
