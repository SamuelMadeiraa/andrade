/**
 * Armazenamento no disco — usado no computador (npm run dev / preview).
 *   conteúdo     → src/data/conteudo.json (+ backups em data/backups/)
 *   inscrições   → data/inscricoes.json (fora do git: dados pessoais)
 *   imagens      → public/uploads/
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CONTEUDO = path.join(ROOT, "src/data/conteudo.json");
const DADOS = path.join(ROOT, "data");
const INSCRICOES = path.join(DADOS, "inscricoes.json");
const BACKUPS = path.join(DADOS, "backups");
const UPLOADS = path.join(ROOT, "public/uploads");

async function lerJson(arquivo, padrao) {
  try {
    return JSON.parse(await fs.readFile(arquivo, "utf8"));
  } catch {
    return padrao;
  }
}

async function gravarJson(arquivo, dados) {
  await fs.mkdir(path.dirname(arquivo), { recursive: true });
  const tmp = arquivo + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(dados, null, 2) + "\n", "utf8");
  await fs.rename(tmp, arquivo);
}

export const armazemLocal = {
  lerConteudo: () => lerJson(CONTEUDO, null),

  async gravarConteudo(novo) {
    const atual = await fs.readFile(CONTEUDO, "utf8").catch(() => null);
    if (atual) {
      const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
      await fs.mkdir(BACKUPS, { recursive: true });
      await fs.writeFile(path.join(BACKUPS, `conteudo-${carimbo}.json`), atual);
    }
    await gravarJson(CONTEUDO, novo);
  },

  listarInscricoes: () => lerJson(INSCRICOES, []),

  async criarInscricao(nova) {
    const lista = await lerJson(INSCRICOES, []);
    lista.unshift(nova);
    await gravarJson(INSCRICOES, lista);
  },

  async atualizarInscricao(id, mudancas) {
    const lista = await lerJson(INSCRICOES, []);
    const i = lista.findIndex((x) => x.id === id);
    if (i < 0) return false;
    lista[i] = { ...lista[i], ...mudancas };
    await gravarJson(INSCRICOES, lista);
    return true;
  },

  async apagarInscricao(id) {
    const lista = await lerJson(INSCRICOES, []);
    const nova = lista.filter((x) => x.id !== id);
    if (nova.length === lista.length) return false;
    await gravarJson(INSCRICOES, nova);
    return true;
  },

  async salvarImagem(arquivo, dados) {
    await fs.mkdir(UPLOADS, { recursive: true });
    await fs.writeFile(path.join(UPLOADS, arquivo), dados);
    return `/uploads/${arquivo}`;
  },
};
