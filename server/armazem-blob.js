/**
 * Armazenamento no Vercel Blob (store PRIVADO) — usado no site no ar.
 *   conteudo.json               conteúdo atual do site
 *   backups/conteudo-<data>.json   versão anterior a cada salvamento
 *   inscricoes/<id>.json        uma inscrição por arquivo (sem disputa entre gravações)
 *   uploads/<arquivo>           imagens, servidas por /api/arquivo/<arquivo>
 *
 * Tudo é lido com useCache:false para nunca pegar versão velha do CDN.
 * O token vem de BLOB_READ_WRITE_TOKEN (criado ao ligar o store ao projeto).
 */
import { put, get, list, del } from "@vercel/blob";

const PRIVADO = { access: "private" };

async function lerTexto(pathname) {
  const r = await get(pathname, { ...PRIVADO, useCache: false }).catch((e) => {
    if (e?.name === "BlobNotFoundError") return null;
    throw e;
  });
  if (!r || r.statusCode !== 200) return null;
  return new Response(r.stream).text();
}

async function lerJson(pathname) {
  const txt = await lerTexto(pathname);
  return txt ? JSON.parse(txt) : null;
}

const gravarJson = (pathname, dados) =>
  put(pathname, JSON.stringify(dados, null, 2), {
    ...PRIVADO,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });

async function listarTudo(prefix) {
  const blobs = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return blobs;
}

const caminhoInscricao = (id) => `inscricoes/${id}.json`;

export const armazemBlob = {
  lerConteudo: () => lerJson("conteudo.json"),

  async gravarConteudo(novo) {
    const atual = await lerTexto("conteudo.json");
    if (atual) {
      const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
      await put(`backups/conteudo-${carimbo}.json`, atual, {
        ...PRIVADO,
        contentType: "application/json",
        addRandomSuffix: false,
      });
    }
    await gravarJson("conteudo.json", novo);
  },

  async listarInscricoes() {
    const blobs = await listarTudo("inscricoes/");
    const lidas = await Promise.all(blobs.map((b) => lerJson(b.pathname).catch(() => null)));
    return lidas.filter(Boolean);
  },

  criarInscricao: (nova) => gravarJson(caminhoInscricao(nova.id), nova),

  async atualizarInscricao(id, mudancas) {
    const atual = await lerJson(caminhoInscricao(id));
    if (!atual) return false;
    await gravarJson(caminhoInscricao(id), { ...atual, ...mudancas });
    return true;
  },

  async apagarInscricao(id) {
    const blobs = await listarTudo(caminhoInscricao(id));
    if (!blobs.length) return false;
    await del(blobs.map((b) => b.url));
    return true;
  },

  async salvarImagem(arquivo, dados, contentType) {
    await put(`uploads/${arquivo}`, dados, { ...PRIVADO, contentType, addRandomSuffix: false });
    return `/api/arquivo/${arquivo}`;
  },

  async lerImagem(arquivo) {
    const r = await get(`uploads/${arquivo}`, PRIVADO).catch(() => null);
    if (!r || r.statusCode !== 200) return null;
    return { contentType: r.blob.contentType, dados: Buffer.from(await new Response(r.stream).arrayBuffer()) };
  },
};
