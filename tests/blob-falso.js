/**
 * Vercel Blob de mentira, em memória, com as mesmas regras que importam para
 * o nosso código:
 *   - gravar por cima de um arquivo que existe só com allowOverwrite
 *   - ler arquivo que não existe dá BlobNotFoundError
 *   - a listagem vem paginada (aqui de 2 em 2, para exercitar o cursor)
 *   - o store é privado: gravar sem access:"private" é erro
 */
export const arquivos = new Map(); // pathname → { corpo: Buffer, contentType }

const URL_BASE = "https://blob.teste/";

export const blobFalso = {
  async put(pathname, corpo, opcoes = {}) {
    if (opcoes.access !== "private") throw new Error(`blob falso: ${pathname} gravado sem access "private"`);
    if (arquivos.has(pathname) && !opcoes.allowOverwrite) {
      throw new Error(`blob falso: ${pathname} já existe e allowOverwrite não foi pedido`);
    }
    arquivos.set(pathname, { corpo: Buffer.from(corpo), contentType: opcoes.contentType });
    return { pathname, url: URL_BASE + pathname };
  },

  async get(pathname) {
    const a = arquivos.get(pathname);
    if (!a) throw Object.assign(new Error("não encontrado"), { name: "BlobNotFoundError" });
    return {
      statusCode: 200,
      stream: new Blob([a.corpo]).stream(),
      blob: { pathname, contentType: a.contentType },
    };
  },

  async list({ prefix = "", cursor } = {}) {
    const todos = [...arquivos.keys()].filter((k) => k.startsWith(prefix)).sort();
    const inicio = Number(cursor) || 0;
    const fim = inicio + 2;
    return {
      blobs: todos.slice(inicio, fim).map((pathname) => ({ pathname, url: URL_BASE + pathname })),
      hasMore: fim < todos.length,
      cursor: fim < todos.length ? String(fim) : undefined,
    };
  },

  async del(urls) {
    for (const u of [].concat(urls)) arquivos.delete(String(u).replace(URL_BASE, ""));
  },
};
