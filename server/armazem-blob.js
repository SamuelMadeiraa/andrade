/**
 * Armazenamento no Vercel Blob (store PRIVADO) — usado no site no ar.
 *   conteudo.json               conteúdo atual do site
 *   backups/conteudo-<data>.json   versão anterior a cada salvamento
 *   inscricoes/<id>.json        uma inscrição por arquivo (sem disputa entre gravações)
 *   uploads/<arquivo>           imagens, servidas por /api/arquivo/<arquivo>
 *   alunos/<id>.json            um aluno por arquivo (cadastro e pagamentos)
 *   contas/<celular>.json       o acesso: senha em hash + quais alunos a conta enxerga
 *   comprovantes/<id>/<arquivo> comprovantes de Pix (só o aluno dono e o professor leem)
 *
 * Tudo é lido com useCache:false para nunca pegar versão velha do CDN.
 * O token vem de BLOB_READ_WRITE_TOKEN (criado ao ligar o store ao projeto).
 */
import { put, get, list, del } from "@vercel/blob";

/**
 * Token do store. O padrão é BLOB_READ_WRITE_TOKEN, mas quem cria o store
 * com prefixo próprio (ex.: DADOS) recebe DADOS_READ_WRITE_TOKEN.
 */
export const tokenBlob =
  process.env.BLOB_READ_WRITE_TOKEN ||
  Object.entries(process.env).find(([k, v]) => /_READ_WRITE_TOKEN$/.test(k) && v)?.[1];

const PRIVADO = { access: "private", ...(tokenBlob ? { token: tokenBlob } : {}) };

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
    const r = await list({ prefix, cursor, limit: 1000, ...(tokenBlob ? { token: tokenBlob } : {}) });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return blobs;
}

const caminhoInscricao = (id) => `inscricoes/${id}.json`;
const caminhoAluno = (id) => `alunos/${id}.json`;
const caminhoConta = (login) => `contas/${login}.json`;

async function apagarPrefixo(prefix) {
  const blobs = await listarTudo(prefix);
  if (blobs.length) await del(blobs.map((b) => b.url), tokenBlob ? { token: tokenBlob } : undefined);
}

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
    await del(blobs.map((b) => b.url), tokenBlob ? { token: tokenBlob } : undefined);
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

  // ---------- alunos ----------
  async listarAlunos() {
    const blobs = await listarTudo("alunos/");
    const lidos = await Promise.all(blobs.map((b) => lerJson(b.pathname).catch(() => null)));
    return lidos.filter(Boolean);
  },

  lerAluno: (id) => lerJson(caminhoAluno(id)),

  criarAluno: (aluno) => gravarJson(caminhoAluno(aluno.id), aluno),

  gravarAluno: (aluno) => gravarJson(caminhoAluno(aluno.id), aluno),

  /** Apaga o cadastro e os comprovantes. A conta (login) é tratada por quem chama. */
  async apagarAluno(aluno) {
    await apagarPrefixo(caminhoAluno(aluno.id));
    await apagarPrefixo(`comprovantes/${aluno.id}/`);
  },

  // ---------- contas (login + senha; uma conta pode ter vários alunos) ----------
  lerConta: (login) => lerJson(caminhoConta(login)),

  gravarConta: (conta) => gravarJson(caminhoConta(conta.login), conta),

  apagarConta: (login) => apagarPrefixo(caminhoConta(login)),

  async listarContas() {
    const blobs = await listarTudo("contas/");
    const lidas = await Promise.all(blobs.map((b) => lerJson(b.pathname).catch(() => null)));
    return lidas.filter(Boolean);
  },

  /** Apaga um arquivo privado (comprovante substituído ou baixa desfeita). */
  apagarPrivado: (caminho) => apagarPrefixo(caminho),

  salvarPrivado: (caminho, dados, contentType) =>
    put(caminho, dados, { ...PRIVADO, contentType, addRandomSuffix: false }),

  async lerPrivado(caminho) {
    const r = await get(caminho, { ...PRIVADO, useCache: false }).catch(() => null);
    if (!r || r.statusCode !== 200) return null;
    return { contentType: r.blob.contentType, dados: Buffer.from(await new Response(r.stream).arrayBuffer()) };
  },
};
