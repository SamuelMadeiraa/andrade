/**
 * Testes da API de alunos, mensalidades e comprovantes, por HTTP de verdade.
 *
 * Cada teste roda duas vezes:
 *   - "disco": as rotas como no `npm run dev`, gravando numa pasta temporária;
 *   - "Vercel + Blob": pela MESMA função que roda no site no ar (api/index.js),
 *     com o endereço reescrito como o vercel.json faz (/api/index?rota=…) e o
 *     armazenamento do Blob de verdade do projeto (server/armazem-blob.js)
 *     falando com um Blob em memória (tests/blob-falso.js).
 *
 * Nada aqui toca nos dados reais nem na internet.
 */
import { describe, test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { blobFalso, arquivos } from "./blob-falso.js";
import { hojeBR } from "../src/lib/mensalidades.js";

const SENHA = "senha-do-painel-de-teste";
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "andrade-teste-"));

// o ambiente tem que estar montado ANTES de carregar o código do servidor
process.env.ANDRADE_DADOS = pasta;
process.env.ADMIN_SENHA = SENHA;
process.env.BLOB_READ_WRITE_TOKEN = "token-de-teste";
delete process.env.SESSAO_SEGREDO;
mock.module("@vercel/blob", { namedExports: blobFalso });

const { criarRotas } = await import("../server/nucleo.js");
const { armazemLocal } = await import("../server/armazem-local.js");
const { default: funcaoVercel } = await import("../api/index.js");

const rotasDisco = criarRotas({ senha: SENHA, armazem: armazemLocal });

const AMBIENTES = [
  {
    nome: "disco (npm run dev)",
    atender: (req, res) => rotasDisco(req, res, new URL(req.url, "http://x").pathname),
    endereco: (caminho) => caminho,
  },
  {
    nome: "Vercel + Blob (site no ar)",
    atender: funcaoVercel,
    // o que o rewrite do vercel.json faz com /api/<rota>
    endereco: (caminho) => "/api/index?rota=" + caminho.replace(/^\/api\//, ""),
  },
];

after(() => fs.rmSync(pasta, { recursive: true, force: true }));

/* ---------- utilidades ---------- */

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);
const dataUrl = (tipo, buf) => `data:${tipo};base64,${buf.toString("base64")}`;

/** "AAAA-MM-01" de n meses atrás, contado a partir de hoje (Brasília). */
function mesesAtras(n) {
  let [a, m] = hojeBR().split("-").map(Number);
  m -= n;
  while (m < 1) {
    m += 12;
    a--;
  }
  return `${a}-${String(m).padStart(2, "0")}-01`;
}
const mesDe = (data) => data.slice(0, 7);

let contador = 0;
/** Celular novo a cada chamada: os testes não esbarram uns nos outros. */
const celularNovo = () => `48 9${String(8000 + ++contador).padStart(4, "0")}-${String(1000 + contador)}`;

for (const amb of AMBIENTES) {
  describe(amb.nome, () => {
    let servidor;
    let base;

    before(async () => {
      servidor = http.createServer((req, res) => amb.atender(req, res));
      await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
      base = `http://127.0.0.1:${servidor.address().port}`;
    });
    after(() => servidor.close());

    /** @returns {Promise<{status:number, dados:any, bytes:Buffer, tipo:string}>} */
    let visitante = 0;
    async function api(metodo, caminho, { corpo, token, admin, senhaAdmin, origem, cookie, site } = {}) {
      const r = await fetch(base + amb.endereco(caminho), {
        method: metodo,
        headers: {
          ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(admin ? { "x-admin-senha": senhaAdmin ?? SENHA } : {}),
          // como a Vercel informa o endereço do visitante. Sem `origem`, cada
          // pedido vem de um endereço novo: as travas por endereço não se somam
          // entre testes que não tratam delas.
          "x-forwarded-for": origem || `10.${amb.nome.length}.${(++visitante >> 8) & 255}.${visitante & 255}`,
          ...(cookie ? { Cookie: cookie } : {}),
          ...(site ? { Origin: site } : {}),
        },
        body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo),
      });
      const bytes = Buffer.from(await r.arrayBuffer());
      const tipo = r.headers.get("content-type") || "";
      let dados = null;
      if (tipo.includes("json")) dados = JSON.parse(bytes.toString("utf8"));
      const cookies = r.headers.getSetCookie();
      return { status: r.status, dados, bytes, tipo, cabecalhos: r.headers, cookies };
    }

    /** Cadastra um aluno pelo painel do professor. */
    async function novoAluno(extra = {}) {
      const whatsapp = extra.whatsapp || celularNovo();
      const r = await api("POST", "/api/alunos", {
        admin: true,
        corpo: { nome: "Aluno de Teste", whatsapp, valor: "129,90", plano: "Mensal", entrouEm: mesesAtras(2), ...extra },
      });
      assert.equal(r.status, 201, JSON.stringify(r.dados));
      return { ...r.dados.aluno, temporaria: r.dados.senhaTemporaria };
    }

    const entrar = (login, senha) => api("POST", "/api/aluno/login", { corpo: { login, senha } });

    /** Aluno já com a senha própria criada. */
    async function alunoPronto(extra = {}) {
      const a = await novoAluno(extra);
      const l = await entrar(a.login, a.temporaria);
      assert.equal(l.status, 200);
      const s = await api("POST", "/api/aluno/senha", { token: l.dados.token, corpo: { nova: "senha-do-aluno" } });
      assert.equal(s.status, 200, JSON.stringify(s.dados));
      return { ...a, token: s.dados.token, senha: "senha-do-aluno" };
    }

    const enviar = (token, mes, arquivo = dataUrl("image/png", PNG)) =>
      api("POST", "/api/aluno/comprovante", { token, corpo: { mes, dataUrl: arquivo } });

    const doProfessor = async (id) =>
      (await api("GET", "/api/alunos", { admin: true })).dados.find((a) => a.id === id);

    /* ================= quem pode o quê ================= */

    test("rotas do professor exigem a senha do painel", async () => {
      const rotas = [
        ["GET", "/api/alunos"],
        ["POST", "/api/alunos"],
        ["PATCH", "/api/alunos/qualquer"],
        ["DELETE", "/api/alunos/qualquer"],
        ["POST", "/api/alunos/qualquer/senha"],
        ["PUT", "/api/alunos/qualquer/pagamentos/2026-10"],
        ["GET", "/api/alunos/qualquer/comprovante/2026-10"],
      ];
      for (const [m, c] of rotas) {
        assert.equal((await api(m, c, { corpo: m === "GET" ? undefined : {} })).status, 401, `${m} ${c} sem senha`);
        assert.equal(
          (await api(m, c, { admin: true, senhaAdmin: "errada", corpo: m === "GET" ? undefined : {} })).status,
          401,
          `${m} ${c} com senha errada`
        );
      }
    });

    test("rotas do aluno exigem estar logado", async () => {
      for (const [m, c] of [
        ["GET", "/api/aluno/eu"],
        ["POST", "/api/aluno/senha"],
        ["POST", "/api/aluno/comprovante"],
        ["GET", "/api/aluno/comprovante/2026-10"],
      ]) {
        assert.equal((await api(m, c, { corpo: m === "GET" ? undefined : {} })).status, 401, `${m} ${c}`);
        assert.equal((await api(m, c, { token: "abc.def", corpo: m === "GET" ? undefined : {} })).status, 401);
      }
    });

    test("a senha do professor não abre a área do aluno, e o login do aluno não abre o painel", async () => {
      const a = await alunoPronto();
      assert.equal((await api("GET", "/api/aluno/eu", { admin: true })).status, 401);
      assert.equal((await api("GET", "/api/alunos", { token: a.token })).status, 401);
      assert.equal((await api("PUT", `/api/alunos/${a.id}/pagamentos/${mesDe(hojeBR())}`, { token: a.token, corpo: { acao: "pagar" } })).status, 401);
    });

    /* ================= cadastro ================= */

    test("cadastro devolve login + senha temporária e nunca o hash da senha", async () => {
      const r = await api("POST", "/api/alunos", {
        admin: true,
        corpo: { nome: "  Ana Souza ", whatsapp: "+55 (48) 98111-2233", valor: "129,90", entrouEm: "2026-03-15", vencimento: 5 },
      });
      assert.equal(r.status, 201);
      assert.equal(r.dados.aluno.nome, "Ana Souza");
      assert.equal(r.dados.aluno.login, "48981112233");
      assert.equal(r.dados.aluno.entrouEm, "2026-03-15");
      assert.equal(r.dados.aluno.vencimento, 5);
      assert.equal(r.dados.aluno.senhaTemporaria, true);
      assert.match(r.dados.senhaTemporaria, /^[A-HJ-NP-Z2-9]{6}$/, "6 caracteres, sem 0/O/1/I/L");
      const tudo = JSON.stringify([r.dados, (await api("GET", "/api/alunos", { admin: true })).dados]);
      assert.ok(!/"hash"|"sal"|"sv"|"falhas"/.test(tudo), "dados internos da senha vazaram");
      assert.ok(!tudo.includes(r.dados.senhaTemporaria.repeat(2)));
    });

    test("cadastro recusa nome vazio, celular inválido e data torta", async () => {
      const tenta = (corpo) => api("POST", "/api/alunos", { admin: true, corpo });
      assert.equal((await tenta({ nome: "", whatsapp: "48 99999-0001" })).status, 400);
      assert.equal((await tenta({ nome: "Sem celular" })).status, 400);
      assert.equal((await tenta({ nome: "Curto", whatsapp: "9999-0001" })).status, 400);
      assert.equal((await tenta({ nome: "Longo", whatsapp: "48 99999-00011234" })).status, 400);
      assert.equal((await tenta({ nome: "Data", whatsapp: celularNovo(), entrouEm: "15/03/2026" })).status, 400);
      assert.equal((await tenta("isto não é json")).status, 400);
    });

    test("mesmo celular: sem confirmar a família é barrado; a mesma pessoa duas vezes, sempre", async () => {
      await novoAluno({ nome: "Pedro Lima", whatsapp: "48 98222-3344" });
      const semConfirmar = await api("POST", "/api/alunos", { admin: true, corpo: { nome: "Outro", whatsapp: "5548982223344" } });
      assert.equal(semConfirmar.status, 409);
      assert.deepEqual(semConfirmar.dados.familia, ["Pedro Lima"], "tem que dizer de quem é o celular");
      // o mesmo aluno de novo (clique duplo, planilha importada duas vezes): barrado mesmo confirmando família
      for (const nome of ["Pedro Lima", "  pedro   LIMA "]) {
        const r = await api("POST", "/api/alunos", { admin: true, corpo: { nome, whatsapp: "48 98222-3344", familia: true } });
        assert.equal(r.status, 409, nome);
        assert.equal(r.dados.familia, undefined);
      }
      assert.equal((await api("GET", "/api/alunos", { admin: true })).dados.filter((a) => a.login === "48982223344").length, 1);
    });

    test("inscrição já paga vira aluno com o mês de entrada quitado", async () => {
      const entrou = mesesAtras(1);
      const a = await novoAluno({ entrouEm: entrou, primeiroMesPago: true });
      assert.equal(a.pagamentos[mesDe(entrou)].status, "pago");
      assert.equal(a.pagamentos[mesDe(entrou)].conferido, true);
      const l = await entrar(a.login, a.temporaria);
      assert.deepEqual(
        l.dados.alunos[0].mensalidades.map((m) => m.status === "pago"),
        [false, true]
      );
    });

    test("a lista do professor vem em ordem alfabética", async () => {
      await novoAluno({ nome: "Zélia" });
      await novoAluno({ nome: "Álvaro" });
      const nomes = (await api("GET", "/api/alunos", { admin: true })).dados.map((a) => a.nome);
      assert.deepEqual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR")));
      assert.ok(nomes.indexOf("Álvaro") < nomes.indexOf("Zélia"));
    });

    /* ================= login e senha ================= */

    test("primeiro acesso: entra com a temporária e é avisado de que precisa criar a senha", async () => {
      const a = await novoAluno({ obs: "só o professor vê isto" });
      const r = await entrar(a.login, a.temporaria);
      assert.equal(r.status, 200);
      assert.equal(r.dados.trocarSenha, true);
      assert.ok(r.dados.token);
      assert.equal(r.dados.alunos.length, 1);
      assert.equal(r.dados.alunos[0].aluno.nome, "Aluno de Teste");
      assert.equal(r.dados.alunos[0].mensalidades.length, 3);
      const cru = JSON.stringify(r.dados);
      assert.ok(!cru.includes("só o professor vê"), "observações do professor vazaram para o aluno");
      assert.ok(!/"hash"|"sal"|"pagamentos"/.test(cru));
    });

    test("o celular pode ser digitado com máscara e a temporária em minúsculas", async () => {
      const a = await novoAluno({ whatsapp: "48 98333-4455" });
      assert.equal((await entrar("(48) 98333-4455", a.temporaria.toLowerCase())).status, 200);
      assert.equal((await entrar("+55 48 98333 4455", ` ${a.temporaria} `)).status, 200);
    });

    test("senha errada e celular desconhecido dão a mesma resposta (não revela quem é aluno)", async () => {
      const a = await novoAluno();
      const errada = await entrar(a.login, "errada");
      const ninguem = await entrar("48 90000-0000", "errada");
      assert.equal(errada.status, 401);
      assert.equal(ninguem.status, 401);
      assert.deepEqual(errada.dados, ninguem.dados);
      assert.equal((await entrar("", "")).status, 401);
      assert.equal((await api("POST", "/api/aluno/login", { corpo: {} })).status, 401);
    });

    test("criar a senha: regras, e a temporária deixa de valer", async () => {
      const a = await novoAluno();
      const { token } = (await entrar(a.login, a.temporaria)).dados;
      const troca = (corpo, t = token) => api("POST", "/api/aluno/senha", { token: t, corpo });

      assert.equal((await troca({ nova: "12345" })).status, 400, "curta demais");
      assert.equal((await troca({})).status, 400, "vazia");
      assert.equal((await troca({ nova: a.temporaria })).status, 400, "igual à temporária");

      const ok = await troca({ nova: "MinhaSenha#1" });
      assert.equal(ok.status, 200);
      assert.equal(ok.dados.trocarSenha, false);
      assert.notEqual(ok.dados.token, token);

      assert.equal((await api("GET", "/api/aluno/eu", { token })).status, 401, "sessão antiga tem que cair");
      assert.equal((await api("GET", "/api/aluno/eu", { token: ok.dados.token })).status, 200);
      assert.equal((await entrar(a.login, a.temporaria)).status, 401, "temporária ainda vale");
      assert.equal((await entrar(a.login, "MinhaSenha#1")).status, 200);
      // a senha do aluno diferencia maiúsculas: o atalho das minúsculas é só da temporária
      assert.equal((await entrar(a.login, "minhasenha#1")).status, 401);
      assert.equal((await doProfessor(a.id)).senhaTemporaria, false);
    });

    test("trocar a senha depois exige a senha atual", async () => {
      const a = await alunoPronto();
      const troca = (corpo) => api("POST", "/api/aluno/senha", { token: a.token, corpo });
      assert.equal((await troca({ nova: "outra-senha-9" })).status, 400, "sem a atual");
      assert.equal((await troca({ atual: "chute", nova: "outra-senha-9" })).status, 400, "atual errada");
      assert.equal((await troca({ atual: a.senha, nova: a.senha })).status, 400, "igual à atual");
      const ok = await troca({ atual: a.senha, nova: "outra-senha-9" });
      assert.equal(ok.status, 200);
      assert.equal((await entrar(a.login, a.senha)).status, 401);
      assert.equal((await entrar(a.login, "outra-senha-9")).status, 200);
    });

    test("sessão adulterada, de outro aluno ou assinada com outra senha de painel não passa", async () => {
      const a = await alunoPronto();
      const b = await alunoPronto();
      const [corpo, assinatura] = a.token.split(".");
      const eu = (token) => api("GET", "/api/aluno/eu", { token });

      assert.equal((await eu(a.token)).dados.alunos[0].aluno.id, a.id);
      assert.equal((await eu(`${corpo}.${assinatura.slice(0, -2)}xx`)).status, 401, "assinatura mexida");
      // troca o dono do token mantendo a assinatura
      const falso = Buffer.from(JSON.stringify({ login: b.login, sv: 1, exp: Date.now() + 1e9 })).toString("base64url");
      assert.equal((await eu(`${falso}.${assinatura}`)).status, 401, "payload trocado");
      assert.equal((await eu(`${corpo}.`)).status, 401);
      assert.equal((await eu(corpo)).status, 401);

      // mesmas rotas, outra senha de painel: o segredo muda e o token antigo morre
      const outras = criarRotas({ senha: "outra-senha-de-painel", armazem: armazemLocal });
      const s2 = http.createServer((req, res) => outras(req, res, new URL(req.url, "http://x").pathname));
      await new Promise((r) => s2.listen(0, "127.0.0.1", r));
      try {
        const r = await fetch(`http://127.0.0.1:${s2.address().port}/api/aluno/eu`, {
          headers: { Authorization: `Bearer ${a.token}` },
        });
        assert.equal(r.status, 401, "token aceito com outro segredo");
      } finally {
        s2.close();
      }
    });

    test("sessão vale 30 dias e depois expira", async () => {
      const a = await alunoPronto();
      const agora = Date.now();
      mock.timers.enable({ apis: ["Date"], now: agora + 29 * 864e5 });
      try {
        assert.equal((await api("GET", "/api/aluno/eu", { token: a.token })).status, 200, "29 dias depois");
        mock.timers.setTime(agora + 31 * 864e5);
        assert.equal((await api("GET", "/api/aluno/eu", { token: a.token })).status, 401, "31 dias depois");
      } finally {
        mock.timers.reset();
      }
    });

    test("6 senhas erradas bloqueiam por 15 minutos; senha nova do professor desbloqueia", async () => {
      const a = await alunoPronto();
      for (let i = 0; i < 5; i++) assert.equal((await entrar(a.login, "chute" + i)).status, 401);
      // a 5ª errada ainda não bloqueia: com a senha certa entra e zera a conta
      assert.equal((await entrar(a.login, a.senha)).status, 200);
      for (let i = 0; i < 6; i++) assert.equal((await entrar(a.login, "chute" + i)).status, 401);
      const bloqueado = await entrar(a.login, a.senha);
      assert.equal(bloqueado.status, 429, "senha certa durante o bloqueio não pode entrar");
      assert.match(bloqueado.dados.erro, /15 minutos/);
      // quem já estava logado continua usando
      assert.equal((await api("GET", "/api/aluno/eu", { token: a.token })).status, 200);

      const agora = Date.now();
      mock.timers.enable({ apis: ["Date"], now: agora + 16 * 60_000 });
      try {
        assert.equal((await entrar(a.login, a.senha)).status, 200, "passados os 15 minutos");
      } finally {
        mock.timers.reset();
      }

      for (let i = 0; i < 6; i++) await entrar(a.login, "chute" + i);
      assert.equal((await entrar(a.login, a.senha)).status, 429);
      const nova = await api("POST", `/api/alunos/${a.id}/senha`, { admin: true });
      assert.equal((await entrar(a.login, nova.dados.senhaTemporaria)).status, 200);
    });

    test("professor gera nova senha temporária: derruba a sessão e a senha antiga", async () => {
      const a = await alunoPronto();
      const r = await api("POST", `/api/alunos/${a.id}/senha`, { admin: true });
      assert.equal(r.status, 200);
      assert.notEqual(r.dados.senhaTemporaria, a.temporaria);
      assert.equal(r.dados.aluno.senhaTemporaria, true);
      assert.equal((await api("GET", "/api/aluno/eu", { token: a.token })).status, 401);
      assert.equal((await entrar(a.login, a.senha)).status, 401);
      const l = await entrar(a.login, r.dados.senhaTemporaria);
      assert.equal(l.status, 200);
      assert.equal(l.dados.trocarSenha, true);
      // pagamentos não se perdem ao trocar senha
      assert.deepEqual(l.dados.alunos[0].mensalidades.length, 3);
    });

    /* ================= conta da família ================= */

    /** Mãe com dois filhos no mesmo celular; a conta já com a senha criada. */
    async function familia() {
      const whatsapp = celularNovo();
      const ana = await novoAluno({ nome: "Ana Filha", whatsapp });
      const r = await api("POST", "/api/alunos", {
        admin: true,
        corpo: { nome: "Beto Filho", whatsapp, valor: "99,00", entrouEm: mesesAtras(1), familia: true },
      });
      assert.equal(r.status, 201, JSON.stringify(r.dados));
      const beto = r.dados.aluno;
      const l = await entrar(ana.login, ana.temporaria);
      const s = await api("POST", "/api/aluno/senha", { token: l.dados.token, corpo: { nova: "senha-da-mae" } });
      return { ana, beto, login: ana.login, token: s.dados.token, senha: "senha-da-mae", cadastroBeto: r.dados };
    }

    test("família: o segundo filho entra na conta que já existe, sem senha nova", async () => {
      const { ana, beto, cadastroBeto } = await familia();
      assert.equal(cadastroBeto.senhaTemporaria, null, "não pode gerar outra senha para a mesma conta");
      assert.deepEqual(cadastroBeto.aluno.familia, [{ id: ana.id, nome: "Ana Filha" }]);
      assert.equal(beto.login, ana.login);
      const lista = (await api("GET", "/api/alunos", { admin: true })).dados;
      assert.deepEqual(lista.find((a) => a.id === ana.id).familia, [{ id: beto.id, nome: "Beto Filho" }]);
      assert.deepEqual(lista.find((a) => a.id === beto.id).familia, [{ id: ana.id, nome: "Ana Filha" }]);
      assert.equal(lista.find((a) => a.id === beto.id).senhaTemporaria, false, "a família já criou a senha");
    });

    test("família: um login só mostra todos os filhos, cada um com as suas mensalidades", async () => {
      const { ana, beto, login, senha } = await familia();
      const r = await entrar(login, senha);
      assert.equal(r.status, 200);
      assert.deepEqual(r.dados.alunos.map((x) => x.aluno.nome), ["Ana Filha", "Beto Filho"]);
      const [a, b] = r.dados.alunos;
      assert.equal(a.aluno.id, ana.id);
      assert.equal(a.mensalidades.length, 3);
      assert.equal(a.mensalidades[0].valor, "129,90");
      assert.equal(b.aluno.id, beto.id);
      assert.equal(b.mensalidades.length, 2);
      assert.equal(b.mensalidades[0].valor, "99,00");
      assert.equal(r.dados.trocarSenha, false);
    });

    test("família: o comprovante vai para o filho certo e só ele fica pago", async () => {
      const { ana, beto, token } = await familia();
      const estranho = await alunoPronto();
      const mes = mesDe(mesesAtras(1));
      const corpo = (alunoId) => ({ mes, dataUrl: dataUrl("image/png", PNG), ...(alunoId ? { alunoId } : {}) });

      const semDizer = await api("POST", "/api/aluno/comprovante", { token, corpo: corpo() });
      assert.equal(semDizer.status, 400, "com dois filhos, tem que dizer de quem é");
      // aluno de outra família: não pode pagar nem ver
      assert.equal((await api("POST", "/api/aluno/comprovante", { token, corpo: corpo(estranho.id) })).status, 400);
      assert.equal((await api("GET", `/api/aluno/comprovante/${estranho.id}/${mes}`, { token })).status, 404);

      const r = await api("POST", "/api/aluno/comprovante", { token, corpo: corpo(beto.id) });
      assert.equal(r.status, 201, JSON.stringify(r.dados));
      const de = (id) => r.dados.alunos.find((x) => x.aluno.id === id).mensalidades.find((m) => m.mes === mes);
      assert.equal(de(beto.id).status, "pago");
      assert.notEqual(de(ana.id).status, "pago", "a irmã ficou paga junto");
      assert.equal((await doProfessor(ana.id)).pagamentos[mes], undefined);

      assert.equal((await api("GET", `/api/aluno/comprovante/${beto.id}/${mes}`, { token })).status, 200);
      assert.equal((await api("GET", `/api/aluno/comprovante/${ana.id}/${mes}`, { token })).status, 404);
      assert.equal((await api("GET", `/api/aluno/comprovante/${mes}`, { token })).status, 404, "sem o id, com dois filhos, não adivinha");
      // quem não é da família não alcança o comprovante do Beto
      assert.equal((await api("GET", `/api/aluno/comprovante/${beto.id}/${mes}`, { token: estranho.token })).status, 404);
    });

    test("família: a senha é da conta — trocar ou resetar vale para todos", async () => {
      const { ana, beto, login, token, senha } = await familia();
      const r = await api("POST", `/api/alunos/${beto.id}/senha`, { admin: true });
      assert.equal(r.status, 200);
      assert.equal((await api("GET", "/api/aluno/eu", { token })).status, 401, "a sessão da família tinha que cair");
      assert.equal((await entrar(login, senha)).status, 401);
      const l = await entrar(login, r.dados.senhaTemporaria);
      assert.equal(l.status, 200);
      assert.equal(l.dados.trocarSenha, true);
      assert.equal(l.dados.alunos.length, 2);
      const lista = (await api("GET", "/api/alunos", { admin: true })).dados;
      assert.equal(lista.find((a) => a.id === ana.id).senhaTemporaria, true, "a irmã divide a mesma senha");
    });

    test("família: filho inativo some da conta; todos inativos, a conta não entra", async () => {
      const { ana, beto, login, token, senha } = await familia();
      await api("PATCH", `/api/alunos/${beto.id}`, { admin: true, corpo: { ativo: false } });
      const eu = await api("GET", "/api/aluno/eu", { token });
      assert.deepEqual(eu.dados.alunos.map((x) => x.aluno.id), [ana.id]);
      assert.equal(
        (await api("POST", "/api/aluno/comprovante", { token, corpo: { alunoId: beto.id, mes: mesDe(hojeBR()), dataUrl: dataUrl("image/png", PNG) } })).status,
        400,
        "pagou por um aluno inativo"
      );
      await api("PATCH", `/api/alunos/${ana.id}`, { admin: true, corpo: { ativo: false } });
      assert.equal((await entrar(login, senha)).status, 403);
      assert.equal((await api("GET", "/api/aluno/eu", { token })).status, 401);
    });

    test("filho ganha celular próprio: sai da família para uma conta só dele, com senha nova", async () => {
      const { ana, beto, login, token, senha } = await familia();
      const mes = mesDe(mesesAtras(1));
      await api("POST", "/api/aluno/comprovante", { token, corpo: { alunoId: beto.id, mes, dataUrl: dataUrl("image/png", PNG) } });

      const r = await api("PATCH", `/api/alunos/${beto.id}`, { admin: true, corpo: { whatsapp: "48 98666-0001" } });
      assert.equal(r.status, 200, JSON.stringify(r.dados));
      assert.match(r.dados.senhaTemporaria, /^[A-HJ-NP-Z2-9]{6}$/, "conta nova precisa de senha temporária");
      assert.deepEqual(r.dados.aluno.familia, []);
      assert.equal(r.dados.aluno.senhaTemporaria, true);

      // a mãe continua logada, com a mesma senha, e não vê mais o Beto
      const mae = await api("GET", "/api/aluno/eu", { token });
      assert.deepEqual(mae.dados.alunos.map((x) => x.aluno.id), [ana.id]);
      assert.equal((await api("GET", `/api/aluno/comprovante/${beto.id}/${mes}`, { token })).status, 404);
      assert.equal((await entrar(login, senha)).status, 200);

      // o Beto entra com o celular dele, cria a senha, e o pagamento veio junto
      const l = await entrar("48986660001", r.dados.senhaTemporaria);
      assert.equal(l.status, 200);
      assert.equal(l.dados.trocarSenha, true);
      assert.deepEqual(l.dados.alunos.map((x) => x.aluno.id), [beto.id]);
      assert.equal(l.dados.alunos[0].mensalidades.find((m) => m.mes === mes).status, "pago");
      assert.equal((await entrar("48986660001", senha)).status, 401, "a senha da mãe não pode abrir a conta dele");
      assert.equal((await api("GET", `/api/aluno/comprovante/${mes}`, { token: l.dados.token })).status, 200);
    });

    test("aluno individual passa para o celular da família: pede confirmação e a conta antiga some", async () => {
      const { ana, beto, login, token } = await familia();
      const solo = await alunoPronto({ nome: "Caio Filho", whatsapp: "48 98666-0002" });

      const sem = await api("PATCH", `/api/alunos/${solo.id}`, { admin: true, corpo: { whatsapp: ana.whatsapp } });
      assert.equal(sem.status, 409);
      assert.deepEqual(sem.dados.familia, ["Ana Filha", "Beto Filho"]);
      assert.equal((await entrar(solo.login, solo.senha)).status, 200, "sem confirmar, nada pode ter mudado");

      const r = await api("PATCH", `/api/alunos/${solo.id}`, { admin: true, corpo: { whatsapp: ana.whatsapp, familia: true } });
      assert.equal(r.status, 200, JSON.stringify(r.dados));
      assert.equal(r.dados.senhaTemporaria, null);
      assert.deepEqual(r.dados.aluno.familia.map((x) => x.nome), ["Ana Filha", "Beto Filho"]);
      const mae = await api("GET", "/api/aluno/eu", { token });
      assert.deepEqual(mae.dados.alunos.map((x) => x.aluno.nome), ["Ana Filha", "Beto Filho", "Caio Filho"]);
      assert.equal((await entrar(solo.login, solo.senha)).status, 401, "a conta antiga continuou existindo");
      assert.equal((await api("GET", "/api/aluno/eu", { token: solo.token })).status, 401);
      assert.equal(login, r.dados.aluno.login);
      // um homônimo não entra duas vezes na mesma família
      const xara = await novoAluno({ nome: "Ana Filha" });
      assert.equal((await api("PATCH", `/api/alunos/${xara.id}`, { admin: true, corpo: { whatsapp: ana.whatsapp, familia: true } })).status, 409);
    });

    test("apagar um filho mantém a família; apagar o último apaga a conta", async () => {
      const { ana, beto, login, token, senha } = await familia();
      assert.equal((await api("DELETE", `/api/alunos/${beto.id}`, { admin: true })).status, 200);
      const eu = await api("GET", "/api/aluno/eu", { token });
      assert.deepEqual(eu.dados.alunos.map((x) => x.aluno.id), [ana.id]);
      assert.deepEqual((await doProfessor(ana.id)).familia, []);

      assert.equal((await api("DELETE", `/api/alunos/${ana.id}`, { admin: true })).status, 200);
      assert.equal((await entrar(login, senha)).status, 401);
      assert.equal((await api("GET", "/api/aluno/eu", { token })).status, 401);
      if (amb.nome.startsWith("Vercel")) {
        assert.deepEqual([...arquivos.keys()].filter((k) => k.includes(login)), [], "a conta ficou no Blob");
      }
      // o celular fica livre para um cadastro novo, com senha nova
      const novo = await novoAluno({ whatsapp: login });
      assert.match(novo.temporaria, /^[A-HJ-NP-Z2-9]{6}$/);
    });

    /* ================= mensalidades e comprovantes ================= */

    test("enviar o comprovante dá baixa no mês e deixa para o professor conferir", async () => {
      const a = await alunoPronto();
      const mes = mesDe(mesesAtras(1));
      const r = await enviar(a.token, mes);
      assert.equal(r.status, 201, JSON.stringify(r.dados));
      const linha = r.dados.alunos[0].mensalidades.find((m) => m.mes === mes);
      assert.deepEqual([linha.status, linha.conferido, linha.temComprovante, linha.por], ["pago", false, true, "aluno"]);
      assert.equal(linha.valor, "129,90");
      // os outros meses não mudam
      assert.equal(r.dados.alunos[0].mensalidades.filter((m) => m.status === "pago").length, 1);
      // e fica gravado: uma nova consulta mostra o mesmo
      const eu = await api("GET", "/api/aluno/eu", { token: a.token });
      assert.equal(eu.dados.alunos[0].mensalidades.find((m) => m.mes === mes).status, "pago");
      const p = (await doProfessor(a.id)).pagamentos[mes];
      assert.equal(p.status, "pago");
      assert.equal(p.conferido, false);
      assert.ok(p.enviadoEm);
    });

    test("o arquivo volta idêntico, só para o dono e para o professor", async () => {
      const a = await alunoPronto();
      const b = await alunoPronto();
      const mes = mesDe(mesesAtras(1));
      const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(5000, 7)]);
      assert.equal((await enviar(a.token, mes, dataUrl("image/jpeg", jpg))).status, 201);

      const meu = await api("GET", `/api/aluno/comprovante/${mes}`, { token: a.token });
      assert.equal(meu.status, 200);
      assert.equal(meu.tipo, "image/jpeg");
      assert.ok(meu.bytes.equals(jpg), "bytes diferentes do que foi enviado");
      assert.equal(meu.cabecalhos.get("x-content-type-options"), "nosniff");
      assert.match(meu.cabecalhos.get("cache-control"), /no-store/);

      const prof = await api("GET", `/api/alunos/${a.id}/comprovante/${mes}`, { admin: true });
      assert.equal(prof.status, 200);
      assert.ok(prof.bytes.equals(jpg));

      // outro aluno, logado, não alcança o comprovante de ninguém
      assert.equal((await api("GET", `/api/aluno/comprovante/${mes}`, { token: b.token })).status, 404);
      assert.equal((await api("GET", `/api/alunos/${a.id}/comprovante/${mes}`, { token: b.token })).status, 401);
      assert.equal((await api("GET", `/api/alunos/${a.id}/comprovante/${mes}`)).status, 401);
      assert.equal((await api("GET", `/api/aluno/comprovante/${mes}`)).status, 401);
    });

    test("aceita foto e PDF; recusa outros tipos de arquivo e meses que não são dele", async () => {
      const a = await alunoPronto();
      const [m0, m1, m2] = [0, 1, 2].map((n) => mesDe(mesesAtras(n)));
      const pdf = Buffer.from("%PDF-1.4 comprovante de teste");

      assert.equal((await enviar(a.token, m1, dataUrl("application/pdf", pdf))).status, 201);
      const lido = await api("GET", `/api/aluno/comprovante/${m1}`, { token: a.token });
      assert.equal(lido.tipo, "application/pdf");
      assert.ok(lido.bytes.equals(pdf));
      assert.equal((await enviar(a.token, m2, dataUrl("image/webp", PNG))).status, 201);

      for (const ruim of [
        dataUrl("text/html", Buffer.from("<script>alert(1)</script>")),
        dataUrl("image/svg+xml", Buffer.from("<svg onload=alert(1)>")),
        dataUrl("application/javascript", Buffer.from("alert(1)")),
        "data:image/png;base64,###",
        "https://exemplo.com/comprovante.png",
        "",
      ]) {
        assert.equal((await enviar(a.token, m0, ruim)).status, 400, `aceitou: ${ruim.slice(0, 40)}`);
      }
      assert.equal((await api("POST", "/api/aluno/comprovante", { token: a.token, corpo: { mes: m0 } })).status, 400);

      // mês antes de entrar, mês futuro, mês que não existe
      assert.equal((await enviar(a.token, mesDe(mesesAtras(5)))).status, 400);
      assert.equal((await enviar(a.token, "2099-01")).status, 400);
      assert.equal((await enviar(a.token, "2026-13")).status, 400);
      assert.equal((await enviar(a.token, "../../x")).status, 400);
      // nada disso mexeu no mês atual
      const eu = await api("GET", "/api/aluno/eu", { token: a.token });
      assert.notEqual(eu.dados.alunos[0].mensalidades.find((m) => m.mes === m0).status, "pago");
    });

    test("arquivo acima do limite é recusado sem derrubar o servidor", async () => {
      const a = await alunoPronto();
      const grande = dataUrl("image/jpeg", Buffer.alloc(3_500_000, 1)); // ~4,7 MB em base64
      const r = await enviar(a.token, mesDe(hojeBR()), grande).catch((e) => ({ status: 413, erro: e }));
      assert.equal(r.status, 413);
      assert.equal((await api("GET", "/api/aluno/eu", { token: a.token })).status, 200);
    });

    test("pode reenviar enquanto o professor não conferiu; depois de confirmado, não", async () => {
      const a = await alunoPronto();
      const mes = mesDe(mesesAtras(1));
      assert.equal((await enviar(a.token, mes)).status, 201);
      const novo = Buffer.concat([PNG, Buffer.from("segunda versão")]);
      assert.equal((await enviar(a.token, mes, dataUrl("image/png", novo))).status, 201, "reenvio");
      assert.ok((await api("GET", `/api/aluno/comprovante/${mes}`, { token: a.token })).bytes.equals(novo));

      const c = await api("PUT", `/api/alunos/${a.id}/pagamentos/${mes}`, { admin: true, corpo: { acao: "confirmar" } });
      assert.equal(c.status, 200);
      assert.equal(c.dados.aluno.pagamentos[mes].conferido, true);
      const de_novo = await enviar(a.token, mes);
      assert.equal(de_novo.status, 400);
      assert.match(de_novo.dados.erro, /já está paga/);
      // o comprovante confirmado continua lá
      assert.ok((await api("GET", `/api/alunos/${a.id}/comprovante/${mes}`, { admin: true })).bytes.equals(novo));
    });

    test("reenviar o comprovante ou desfazer a baixa apaga o arquivo antigo daquele mês (item 6)", async () => {
      const a = await alunoPronto();
      const [m1, m2] = [mesDe(mesesAtras(2)), mesDe(mesesAtras(1))];
      // arquivos de comprovante deste aluno guardados, onde quer que seja
      const guardados = () =>
        amb.nome.startsWith("Vercel")
          ? [...arquivos.keys()].filter((k) => k.startsWith(`comprovantes/${a.id}/`)).sort()
          : fs.existsSync(path.join(pasta, "comprovantes", a.id))
            ? fs.readdirSync(path.join(pasta, "comprovantes", a.id)).map((n) => `comprovantes/${a.id}/${n}`).sort()
            : [];
      await enviar(a.token, m1);
      await enviar(a.token, m2);
      assert.equal(guardados().length, 2);
      const antigo = (await doProfessor(a.id)).pagamentos[m1].comprovante;
      // reenvio do mesmo mês: fica só o novo; o do outro mês não é tocado
      assert.equal((await enviar(a.token, m1, dataUrl("image/png", Buffer.concat([PNG, Buffer.from("v2")])))).status, 201);
      const depois = guardados();
      assert.equal(depois.length, 2, depois.join(", "));
      assert.ok(!depois.includes(antigo), "o comprovante substituído ficou guardado");
      assert.ok(depois.includes((await doProfessor(a.id)).pagamentos[m2].comprovante));
      // professor desfaz a baixa de m2: o arquivo dele some
      assert.equal((await api("PUT", `/api/alunos/${a.id}/pagamentos/${m2}`, { admin: true, corpo: { acao: "reabrir" } })).status, 200);
      assert.deepEqual(guardados(), [(await doProfessor(a.id)).pagamentos[m1].comprovante]);
      // recusar NÃO apaga: o professor ainda pode precisar olhar
      assert.equal((await api("PUT", `/api/alunos/${a.id}/pagamentos/${m1}`, { admin: true, corpo: { acao: "recusar" } })).status, 200);
      assert.equal(guardados().length, 1);
    });

    test("professor recusa o comprovante: o mês volta a dever e o aluno pode enviar outro", async () => {
      const a = await alunoPronto();
      const mes = mesDe(mesesAtras(1));
      await enviar(a.token, mes);
      const r = await api("PUT", `/api/alunos/${a.id}/pagamentos/${mes}`, { admin: true, corpo: { acao: "recusar" } });
      assert.equal(r.status, 200);
      let eu = await api("GET", "/api/aluno/eu", { token: a.token });
      assert.equal(eu.dados.alunos[0].mensalidades.find((m) => m.mes === mes).status, "recusado");
      assert.equal((await enviar(a.token, mes)).status, 201);
      eu = await api("GET", "/api/aluno/eu", { token: a.token });
      const linha = eu.dados.alunos[0].mensalidades.find((m) => m.mes === mes);
      assert.deepEqual([linha.status, linha.conferido], ["pago", false]);
    });

    test("professor dá baixa manual, desfaz, e ações inválidas são recusadas", async () => {
      const a = await alunoPronto();
      const mes = mesDe(mesesAtras(2));
      const acao = (oque, m = mes) => api("PUT", `/api/alunos/${a.id}/pagamentos/${m}`, { admin: true, corpo: { acao: oque } });

      const pago = await acao("pagar");
      assert.equal(pago.status, 200);
      assert.deepEqual(
        [pago.dados.aluno.pagamentos[mes].status, pago.dados.aluno.pagamentos[mes].conferido, pago.dados.aluno.pagamentos[mes].por],
        ["pago", true, "professor"]
      );
      let eu = await api("GET", "/api/aluno/eu", { token: a.token });
      assert.equal(eu.dados.alunos[0].mensalidades.find((m) => m.mes === mes).status, "pago");

      assert.equal((await acao("reabrir")).status, 200);
      eu = await api("GET", "/api/aluno/eu", { token: a.token });
      assert.notEqual(eu.dados.alunos[0].mensalidades.find((m) => m.mes === mes).status, "pago");

      assert.equal((await acao("confirmar")).status, 400, "confirmar o que não foi pago");
      assert.equal((await acao("recusar")).status, 400, "recusar sem comprovante");
      assert.equal((await acao("apagar-tudo")).status, 400);
      assert.equal((await acao(undefined)).status, 400);
      assert.equal((await acao("pagar", "2026-13")).status, 400, "mês 13");
      assert.equal((await api("PUT", `/api/alunos/nao-existe/pagamentos/${mes}`, { admin: true, corpo: { acao: "pagar" } })).status, 404);
      // baixa adiantada (mês que vem) aparece para o aluno; fora do período é recusada
      const [ano, mm] = hojeBR().split("-").map(Number);
      const proximo = mm === 12 ? `${ano + 1}-01` : `${ano}-${String(mm + 1).padStart(2, "0")}`;
      assert.equal((await acao("pagar", proximo)).status, 200);
      eu = await api("GET", "/api/aluno/eu", { token: a.token });
      assert.deepEqual([eu.dados.alunos[0].mensalidades[0].mes, eu.dados.alunos[0].mensalidades[0].status], [proximo, "pago"]);
      assert.equal((await acao("pagar", "2099-01")).status, 400, "mês absurdo no futuro");
      assert.equal((await acao("pagar", mesDe(mesesAtras(6)))).status, 400, "mês antes de o aluno entrar");
    });

    test("já pago em lote: marca os meses anteriores de uma vez, sem mexer nos pagos nem nos a conferir", async () => {
      const a = await alunoPronto({ entrouEm: mesesAtras(5) });
      const meses = [5, 4, 3, 2, 1].map((n) => mesDe(mesesAtras(n)));
      // um mês com comprovante a conferir: o lote não pode passar por cima
      await enviar(a.token, meses[4]);
      const r = await api("PUT", `/api/alunos/${a.id}/pagamentos`, { admin: true, corpo: { meses } });
      assert.equal(r.status, 200, JSON.stringify(r.dados));
      assert.equal(r.dados.marcados, 4);
      for (const x of meses.slice(0, 4)) {
        assert.deepEqual([r.dados.aluno.pagamentos[x].status, r.dados.aluno.pagamentos[x].conferido, r.dados.aluno.pagamentos[x].por], ["pago", true, "professor"], x);
      }
      assert.equal(r.dados.aluno.pagamentos[meses[4]].conferido, false, "o comprovante a conferir virou conferido sozinho");
      assert.equal(r.dados.aluno.pagamentos[meses[4]].por, "aluno");
      // o aluno vê os meses quitados
      const eu = await api("GET", "/api/aluno/eu", { token: a.token });
      assert.ok(eu.dados.alunos[0].mensalidades.filter((m) => meses.slice(0, 4).includes(m.mes)).every((m) => m.status === "pago"));
      // de novo: nada muda
      assert.equal((await api("PUT", `/api/alunos/${a.id}/pagamentos`, { admin: true, corpo: { meses } })).dados.marcados, 0);
      // fora do período, vazio, ou sem a senha do painel: recusado
      const antes = mesDe(mesesAtras(7));
      assert.equal((await api("PUT", `/api/alunos/${a.id}/pagamentos`, { admin: true, corpo: { meses: [antes] } })).status, 400);
      assert.equal((await api("PUT", `/api/alunos/${a.id}/pagamentos`, { admin: true, corpo: { meses: [] } })).status, 400);
      assert.equal((await api("PUT", `/api/alunos/${a.id}/pagamentos`, { admin: true, corpo: { meses: ["2099-01"] } })).status, 400);
      assert.equal((await api("PUT", `/api/alunos/${a.id}/pagamentos`, { corpo: { meses } })).status, 401);
    });

    test("dar baixa num mês que tem comprovante mantém o comprovante", async () => {
      const a = await alunoPronto();
      const mes = mesDe(mesesAtras(1));
      await enviar(a.token, mes);
      await api("PUT", `/api/alunos/${a.id}/pagamentos/${mes}`, { admin: true, corpo: { acao: "recusar" } });
      const r = await api("PUT", `/api/alunos/${a.id}/pagamentos/${mes}`, { admin: true, corpo: { acao: "pagar" } });
      assert.equal(r.dados.aluno.pagamentos[mes].status, "pago");
      assert.equal((await api("GET", `/api/alunos/${a.id}/comprovante/${mes}`, { admin: true })).status, 200);
    });

    /* ================= edição, inativo, apagar ================= */

    test("editar o aluno guarda os dados e não mexe em senha nem em pagamentos", async () => {
      const a = await alunoPronto();
      const mes = mesDe(mesesAtras(1));
      await enviar(a.token, mes);
      const r = await api("PATCH", `/api/alunos/${a.id}`, {
        admin: true,
        corpo: { nome: "Nome Novo", valor: "150,00", vencimento: 40, faixa: "Azul", turma: "Adulto", senha: { hash: "x" }, pagamentos: {}, id: "outro", login: "1" },
      });
      assert.equal(r.status, 200);
      assert.equal(r.dados.aluno.nome, "Nome Novo");
      assert.equal(r.dados.aluno.vencimento, 28, "vencimento limitado a 28");
      assert.equal(r.dados.aluno.id, a.id, "id não pode ser trocado");
      assert.equal(r.dados.aluno.login, a.login, "login só muda pelo celular");
      assert.equal(r.dados.aluno.pagamentos[mes].status, "pago", "pagamentos apagados pela edição");
      assert.equal((await entrar(a.login, a.senha)).status, 200, "a senha foi mexida pela edição");
      const eu = await api("GET", "/api/aluno/eu", { token: a.token });
      assert.equal(eu.dados.alunos[0].aluno.faixa, "Azul");
      // o mês já pago fica com o valor antigo; os em aberto, com o novo
      assert.equal(eu.dados.alunos[0].mensalidades.find((m) => m.mes === mes).valor, "129,90");
      assert.equal(eu.dados.alunos[0].mensalidades.find((m) => m.status !== "pago").valor, "150,00");

      assert.equal((await api("PATCH", `/api/alunos/${a.id}`, { admin: true, corpo: { nome: " " } })).status, 400);
      assert.equal((await api("PATCH", `/api/alunos/${a.id}`, { admin: true, corpo: { entrouEm: "ontem" } })).status, 400);
      assert.equal((await api("PATCH", `/api/alunos/nao-existe`, { admin: true, corpo: { nome: "X" } })).status, 404);
    });

    test("trocar o celular troca o login: o novo entra, o antigo não, e o antigo fica livre", async () => {
      const a = await alunoPronto({ whatsapp: "48 98444-5566" });
      const outro = await novoAluno({ whatsapp: "48 98444-7788" });

      const conflito = await api("PATCH", `/api/alunos/${a.id}`, { admin: true, corpo: { whatsapp: "48 98444-7788" } });
      assert.equal(conflito.status, 409, "pegou o celular de outro aluno");
      assert.equal((await api("PATCH", `/api/alunos/${a.id}`, { admin: true, corpo: { whatsapp: "123" } })).status, 400);

      const r = await api("PATCH", `/api/alunos/${a.id}`, { admin: true, corpo: { whatsapp: "(48) 98444-9900" } });
      assert.equal(r.status, 200);
      assert.equal(r.dados.aluno.login, "48984449900");
      assert.equal((await entrar("48984449900", a.senha)).status, 200);
      assert.equal((await entrar("48984445566", a.senha)).status, 401);
      // a conta mudou de celular: a sessão antiga cai e ele entra de novo com o número novo
      assert.equal((await api("GET", "/api/aluno/eu", { token: a.token })).status, 401);
      assert.equal(r.dados.senhaTemporaria, null, "conta só dele: a senha não muda ao trocar o celular");
      // salvar de novo o mesmo celular (com máscara diferente) não dá conflito consigo mesmo
      assert.equal((await api("PATCH", `/api/alunos/${a.id}`, { admin: true, corpo: { whatsapp: "48 984449900" } })).status, 200);
      // o número antigo pode ir para um aluno novo
      const novo = await novoAluno({ whatsapp: "48 98444-5566" });
      assert.equal((await entrar(novo.login, novo.temporaria)).status, 200);
      assert.equal((await entrar(outro.login, outro.temporaria)).status, 200);
    });

    test("aluno inativo não entra e a sessão dele cai; reativado, volta", async () => {
      const a = await alunoPronto();
      await api("PATCH", `/api/alunos/${a.id}`, { admin: true, corpo: { ativo: false } });
      const r = await entrar(a.login, a.senha);
      assert.equal(r.status, 403);
      assert.match(r.dados.erro, /inativo/);
      assert.equal((await api("GET", "/api/aluno/eu", { token: a.token })).status, 401);
      assert.equal((await enviar(a.token, mesDe(hojeBR()))).status, 401);
      await api("PATCH", `/api/alunos/${a.id}`, { admin: true, corpo: { ativo: true } });
      assert.equal((await entrar(a.login, a.senha)).status, 200);
    });

    test("apagar o aluno remove cadastro, login e comprovantes, e libera o celular", async () => {
      const a = await alunoPronto({ whatsapp: "48 98555-6677" });
      const fica = await alunoPronto();
      const mes = mesDe(mesesAtras(1));
      await enviar(a.token, mes);
      await enviar(fica.token, mes);

      assert.equal((await api("DELETE", `/api/alunos/${a.id}`, { admin: true })).status, 200);
      assert.equal((await api("DELETE", `/api/alunos/${a.id}`, { admin: true })).status, 404);
      assert.equal((await entrar(a.login, a.senha)).status, 401);
      assert.equal((await api("GET", "/api/aluno/eu", { token: a.token })).status, 401);
      assert.equal((await api("GET", `/api/alunos/${a.id}/comprovante/${mes}`, { admin: true })).status, 404);
      assert.equal(await doProfessor(a.id), undefined);

      if (amb.nome.startsWith("Vercel")) {
        const sobras = [...arquivos.keys()].filter((k) => k.includes(a.id) || k.includes(a.login));
        assert.deepEqual(sobras, [], "ficou arquivo do aluno apagado no Blob");
      } else {
        assert.ok(!fs.existsSync(path.join(pasta, "comprovantes", a.id)), "pasta de comprovantes ficou no disco");
      }
      // o vizinho não foi afetado
      assert.equal((await api("GET", `/api/aluno/comprovante/${mes}`, { token: fica.token })).status, 200);
      // o celular volta a ficar livre
      const novo = await novoAluno({ whatsapp: "48 98555-6677" });
      assert.equal((await entrar(novo.login, novo.temporaria)).status, 200);
    });

    /* ================= o que já existia continua funcionando ================= */

    test("inscrição pelo site e lista de inscrições continuam funcionando", async () => {
      const r = await api("POST", "/api/inscricoes", {
        corpo: { nome: "Inscrito Teste", whatsapp: "48 97000-0001", plano: "Mensal", valor: "R$ 129,90", forma: "Pix" },
      });
      assert.equal(r.status, 201);
      const lista = await api("GET", "/api/inscricoes", { admin: true });
      assert.equal(lista.status, 200);
      assert.ok(lista.dados.some((i) => i.id === r.dados.id && i.status === "pendente"));
      assert.equal((await api("GET", "/api/inscricoes")).status, 401);
      assert.equal((await api("PATCH", `/api/inscricoes/${r.dados.id}`, { admin: true, corpo: { status: "pago" } })).status, 200);
    });

    test("ficha de inscrição: no máximo 5 por origem a cada 10 minutos", async () => {
      const ficha = (origem, n) =>
        api("POST", "/api/inscricoes", { origem, corpo: { nome: `Robô ${n}`, whatsapp: "48 97000-0002" } });
      for (let i = 1; i <= 5; i++) assert.equal((await ficha("203.0.113.7", i)).status, 201, `inscrição ${i}`);
      const sexta = await ficha("203.0.113.7", 6);
      assert.equal(sexta.status, 429);
      assert.match(sexta.dados.erro, /Muitas inscrições/);
      // outra pessoa, de outro lugar, não é afetada
      assert.equal((await ficha("203.0.113.8", 1)).status, 201);
      // a barrada não foi gravada
      const lista = (await api("GET", "/api/inscricoes", { admin: true })).dados;
      assert.ok(!lista.some((i) => i.nome === "Robô 6"));
      assert.equal(lista.filter((i) => /^Robô [1-5]$/.test(i.nome)).length >= 5, true);

      // passados os 10 minutos, a mesma origem volta a poder
      const agora = Date.now();
      mock.timers.enable({ apis: ["Date"], now: agora + 11 * 60_000 });
      try {
        assert.equal((await ficha("203.0.113.7", 7)).status, 201);
      } finally {
        mock.timers.reset();
      }
    });


    /* ================= sessão em cookie e travas (itens 1, 13 e 14) ================= */

    /** "nome=valor" do Set-Cookie, para mandar de volta. */
    const cookieDe = (r, nome) => (r.cookies.find((c) => c.startsWith(nome + "=")) || "").split(";")[0];

    test("professor: login abre sessão em cookie protegido de 8 horas; sair fecha", async () => {
      const l = await api("POST", "/api/login", { corpo: { senha: SENHA } });
      assert.equal(l.status, 200);
      assert.equal(l.dados.senhaFraca, false);
      const linha = l.cookies.find((c) => c.startsWith("andrade_admin="));
      assert.ok(linha, "não veio o cookie da sessão");
      for (const parte of ["HttpOnly", "SameSite=Strict", "Path=/api", `Max-Age=${8 * 3600}`]) {
        assert.ok(linha.includes(parte), `cookie sem ${parte}: ${linha}`);
      }
      assert.ok(!linha.includes(SENHA), "a senha foi parar no cookie");
      const cookie = cookieDe(l, "andrade_admin");
      assert.equal((await api("GET", "/api/alunos", { cookie })).status, 200);
      assert.equal((await api("GET", "/api/sessao", { cookie })).status, 200);
      // cookie adulterado não passa
      const [corpo, assinatura] = cookie.split("=")[1].split(".");
      const falso = Buffer.from(JSON.stringify({ papel: "admin", sv: "x", exp: Date.now() + 1e9 })).toString("base64url");
      assert.equal((await api("GET", "/api/alunos", { cookie: `andrade_admin=${falso}.${assinatura}` })).status, 401);
      assert.equal((await api("GET", "/api/alunos", { cookie: `andrade_admin=${corpo}.${assinatura[0] === "x" ? "y" : "x"}${assinatura.slice(1)}` })).status, 401);
      // o cookie do professor não abre a área do aluno
      assert.equal((await api("GET", "/api/aluno/eu", { cookie: cookie.replace("andrade_admin", "andrade_aluno") })).status, 401);
      // depois de 8 horas, vence
      mock.timers.enable({ apis: ["Date"], now: Date.now() + 8 * 3600_000 + 60_000 });
      try {
        assert.equal((await api("GET", "/api/alunos", { cookie })).status, 401);
      } finally {
        mock.timers.reset();
      }
      const sair = await api("POST", "/api/sair", { cookie });
      assert.ok(sair.cookies.some((c) => c.startsWith("andrade_admin=;") && c.includes("Max-Age=0")), "sair não apagou o cookie");
    });

    test("professor: 5 senhas erradas fecham o painel por 15 minutos, até para a senha certa", async () => {
      const ip = "198.51.100.20";
      for (let i = 0; i < 4; i++) {
        assert.equal((await api("POST", "/api/login", { corpo: { senha: "chute" + i }, origem: ip })).status, 401);
      }
      assert.equal((await api("POST", "/api/login", { corpo: { senha: "chute4" }, origem: ip })).status, 429);
      const certa = await api("POST", "/api/login", { corpo: { senha: SENHA }, origem: ip });
      assert.equal(certa.status, 429, "a senha certa entrou durante o bloqueio");
      assert.equal(certa.cookies.length, 0);
      // o cabeçalho dos scripts também respeita a trava
      assert.equal((await api("GET", "/api/alunos", { admin: true, origem: ip })).status, 429);
      // outro endereço não é afetado
      assert.equal((await api("POST", "/api/login", { corpo: { senha: SENHA }, origem: "198.51.100.21" })).status, 200);
      // chutar pelo diagnóstico também conta
      const ip2 = "198.51.100.22";
      for (let i = 0; i < 5; i++) await api("GET", "/api/diagnostico", { admin: true, senhaAdmin: "x" + i, origem: ip2 });
      assert.equal((await api("POST", "/api/login", { corpo: { senha: SENHA }, origem: ip2 })).status, 429);
      // passados os 15 minutos, volta
      mock.timers.enable({ apis: ["Date"], now: Date.now() + 15 * 60_000 + 1000 });
      try {
        assert.equal((await api("POST", "/api/login", { corpo: { senha: SENHA }, origem: ip })).status, 200);
      } finally {
        mock.timers.reset();
      }
    });

    test("pedido que muda dados vindo de outro site é recusado", async () => {
      const l = await api("POST", "/api/login", { corpo: { senha: SENHA } });
      const cookie = cookieDe(l, "andrade_admin");
      const r = await api("POST", "/api/alunos", { cookie, site: "https://site-malicioso.example", corpo: { nome: "X", whatsapp: celularNovo() } });
      assert.equal(r.status, 403);
      assert.equal((await api("POST", "/api/inscricoes", { site: "https://site-malicioso.example", corpo: { nome: "X", whatsapp: "1" } })).status, 403);
      // do próprio site, passa
      const host = new URL(base).host;
      const ok = await api("POST", "/api/alunos", { cookie, site: `http://${host}`, corpo: { nome: "Do Próprio Site", whatsapp: celularNovo() } });
      assert.equal(ok.status, 201, JSON.stringify(ok.dados));
    });

    test("aluno: login e senha nova abrem sessão em cookie de 30 dias; sair fecha", async () => {
      const a = await novoAluno();
      const l = await entrar(a.login, a.temporaria);
      const linha = l.cookies.find((c) => c.startsWith("andrade_aluno="));
      assert.ok(linha && linha.includes("HttpOnly") && linha.includes("SameSite=Strict") && linha.includes(`Max-Age=${30 * 86400}`), linha);
      let cookie = cookieDe(l, "andrade_aluno");
      assert.equal((await api("GET", "/api/aluno/eu", { cookie })).status, 200);
      const s = await api("POST", "/api/aluno/senha", { cookie, corpo: { nova: "senha-nova-cookie" } });
      assert.equal(s.status, 200);
      assert.equal((await api("GET", "/api/aluno/eu", { cookie })).status, 401, "o cookie antigo continuou valendo");
      cookie = cookieDe(s, "andrade_aluno");
      assert.equal((await api("GET", "/api/aluno/eu", { cookie })).status, 200);
      assert.equal((await api("GET", "/api/alunos", { cookie: cookie.replace("andrade_aluno", "andrade_admin") })).status, 401);
      const sair = await api("POST", "/api/aluno/sair", { cookie });
      assert.ok(sair.cookies.some((c) => c.startsWith("andrade_aluno=;") && c.includes("Max-Age=0")));
    });

    test("aluno: 10 logins errados do mesmo endereço (em celulares diferentes) travam por 15 minutos", async () => {
      const a = await alunoPronto();
      const ip = "198.51.100.30";
      for (let i = 0; i < 10; i++) {
        assert.equal((await api("POST", "/api/aluno/login", { origem: ip, corpo: { login: celularNovo(), senha: "chute" } })).status, 401);
      }
      assert.equal((await api("POST", "/api/aluno/login", { origem: ip, corpo: { login: a.login, senha: a.senha } })).status, 429);
      assert.equal((await api("POST", "/api/aluno/login", { origem: "198.51.100.31", corpo: { login: a.login, senha: a.senha } })).status, 200);
      mock.timers.enable({ apis: ["Date"], now: Date.now() + 15 * 60_000 + 1000 });
      try {
        assert.equal((await api("POST", "/api/aluno/login", { origem: ip, corpo: { login: a.login, senha: a.senha } })).status, 200);
      } finally {
        mock.timers.reset();
      }
    });

    test("senha nova do aluno precisa de 8 caracteres", async () => {
      const a = await novoAluno();
      const l = await entrar(a.login, a.temporaria);
      const curta = await api("POST", "/api/aluno/senha", { token: l.dados.token, corpo: { nova: "1234567" } });
      assert.equal(curta.status, 400);
      assert.match(curta.dados.erro, /8 caracteres/);
      assert.equal((await api("POST", "/api/aluno/senha", { token: l.dados.token, corpo: { nova: "12345678" } })).status, 200);
    });

    test("diagnóstico da configuração só abre com a senha do painel", async (t) => {
      if (!amb.nome.startsWith("Vercel")) return t.skip("a rota só existe na função da Vercel");
      const sem = await api("GET", "/api/diagnostico");
      assert.equal(sem.status, 401);
      assert.ok(!JSON.stringify(sem.dados).includes("BLOB"), "nomes de variáveis vazaram sem senha");
      assert.equal((await api("GET", "/api/diagnostico", { admin: true, senhaAdmin: "errada" })).status, 401);
      const com = await api("GET", "/api/diagnostico", { admin: true });
      assert.equal(com.status, 200);
      assert.equal(com.dados.blobConfigurado, true);
      assert.ok(com.dados.variaveis.includes("ADMIN_SENHA"));
      assert.ok(!JSON.stringify(com.dados).includes(SENHA), "o VALOR da senha apareceu no diagnóstico");
    });

    test("conteúdo público, login do professor e rota inexistente", async () => {
      const c = await api("GET", "/api/conteudo");
      assert.equal(c.status, 200);
      assert.equal(typeof c.dados, "object");
      assert.equal((await api("POST", "/api/login", { admin: true })).status, 200);
      assert.equal((await api("POST", "/api/login", { admin: true, senhaAdmin: "errada" })).status, 401);
      assert.equal((await api("GET", "/api/nao-existe")).status, 404);
      assert.equal((await api("GET", "/api/aluno")).status, 404);
      assert.equal((await api("GET", "/api/alunos/x/y/z", { admin: true })).status, 404);
    });
  });
}
