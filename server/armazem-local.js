/**
 * Armazenamento no disco — usado no computador (npm run dev / preview).
 *   conteúdo     → src/data/conteudo.json (+ backups em data/backups/)
 *   inscrições   → data/inscricoes.json (fora do git: dados pessoais)
 *   imagens      → public/uploads/
 *   alunos       → data/alunos.json e data/contas.json (fora do git)
 *   comprovantes → data/comprovantes/<id>/ (fora do git)
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CONTEUDO = path.join(ROOT, "src/data/conteudo.json");
// ANDRADE_DADOS aponta os dados para outra pasta: é o que os testes usam para
// não mexer nos alunos de verdade do computador
const DADOS = process.env.ANDRADE_DADOS ? path.resolve(process.env.ANDRADE_DADOS) : path.join(ROOT, "data");
const INSCRICOES = path.join(DADOS, "inscricoes.json");
const BACKUPS = path.join(DADOS, "backups");
const UPLOADS = path.join(ROOT, "public/uploads");
const ALUNOS = path.join(DADOS, "alunos.json");
const CONTAS = path.join(DADOS, "contas.json");

const TIPO = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

/** Só caminhos dentro de data/comprovantes/ — nada de "../". */
const privado = (caminho) => {
  const alvo = path.resolve(DADOS, caminho);
  if (!alvo.startsWith(path.join(DADOS, "comprovantes") + path.sep)) throw new Error("Caminho inválido");
  return alvo;
};

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

  // ---------- alunos ----------
  listarAlunos: () => lerJson(ALUNOS, []),

  async lerAluno(id) {
    return (await lerJson(ALUNOS, [])).find((a) => a.id === id) || null;
  },

  async criarAluno(aluno) {
    const lista = await lerJson(ALUNOS, []);
    lista.push(aluno);
    await gravarJson(ALUNOS, lista);
  },

  async gravarAluno(aluno) {
    const lista = await lerJson(ALUNOS, []);
    const i = lista.findIndex((a) => a.id === aluno.id);
    if (i < 0) return;
    lista[i] = aluno;
    await gravarJson(ALUNOS, lista);
  },

  /** Apaga o cadastro e os comprovantes. A conta (login) é tratada por quem chama. */
  async apagarAluno(aluno) {
    const lista = await lerJson(ALUNOS, []);
    await gravarJson(ALUNOS, lista.filter((a) => a.id !== aluno.id));
    await fs.rm(path.dirname(privado(`comprovantes/${aluno.id}/x`)), { recursive: true, force: true });
  },

  // ---------- contas (login + senha; uma conta pode ter vários alunos) ----------
  async lerConta(login) {
    return (await lerJson(CONTAS, {}))[login] || null;
  },

  async gravarConta(conta) {
    const todas = await lerJson(CONTAS, {});
    todas[conta.login] = conta;
    await gravarJson(CONTAS, todas);
  },

  async apagarConta(login) {
    const todas = await lerJson(CONTAS, {});
    delete todas[login];
    await gravarJson(CONTAS, todas);
  },

  async listarContas() {
    return Object.values(await lerJson(CONTAS, {}));
  },

  /** Apaga um arquivo privado (comprovante substituído ou baixa desfeita). */
  async apagarPrivado(caminho) {
    await fs.rm(privado(caminho), { force: true });
  },

  async salvarPrivado(caminho, dados) {
    const alvo = privado(caminho);
    await fs.mkdir(path.dirname(alvo), { recursive: true });
    await fs.writeFile(alvo, dados);
  },

  async lerPrivado(caminho) {
    const dados = await fs.readFile(privado(caminho)).catch(() => null);
    if (!dados) return null;
    return { contentType: TIPO[path.extname(caminho).slice(1)] || "application/octet-stream", dados };
  },
};
