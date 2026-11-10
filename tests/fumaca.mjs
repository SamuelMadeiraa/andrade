/**
 * Teste de fumaça: confere um site que JÁ ESTÁ RODANDO — o do computador ou o
 * do ar — usando a API de verdade, com o armazenamento de verdade.
 *
 *   ADMIN_SENHA=... npm run test:fumaca                         (localhost:5173)
 *   ADMIN_SENHA=... URL=https://www.academiaandradebjj.com.br npm run test:fumaca
 *
 * Cria UM aluno de teste bem identificado ("TESTE AUTOMÁTICO"), faz o caminho
 * inteiro (senha temporária → senha própria → comprovante → conferência) e
 * APAGA o aluno no final, mesmo se algo falhar. Não mexe em nenhum outro
 * aluno, inscrição ou no conteúdo do site.
 */
const URL_BASE = (process.env.URL || "http://localhost:5173").replace(/\/+$/, "");
const SENHA = process.env.ADMIN_SENHA;

if (!SENHA) {
  console.error("Informe a senha do painel: ADMIN_SENHA=... npm run test:fumaca");
  process.exit(2);
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);
// celular que não existe (prefixo 90000), diferente a cada execução
const CELULAR = `11 90000-${String(Math.floor(Math.random() * 9000) + 1000)}`;
const NOME = "TESTE AUTOMÁTICO (pode apagar)";

async function api(metodo, caminho, { corpo, token, admin } = {}) {
  const r = await fetch(URL_BASE + caminho, {
    method: metodo,
    headers: {
      ...(corpo ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(admin ? { "x-admin-senha": SENHA } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const bytes = Buffer.from(await r.arrayBuffer());
  const tipo = r.headers.get("content-type") || "";
  return { status: r.status, tipo, bytes, dados: tipo.includes("json") ? JSON.parse(bytes.toString("utf8")) : null };
}

let passou = 0;
let falhou = 0;
async function passo(nome, fn) {
  try {
    await fn();
    passou++;
    console.log(`  ✔ ${nome}`);
  } catch (e) {
    falhou++;
    console.log(`  ✘ ${nome}\n      ${e.message}`);
  }
}
const confere = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const espera = (r, status) =>
  confere(r.status === status, `esperava ${status}, veio ${r.status}: ${r.dados ? JSON.stringify(r.dados) : r.bytes.toString("utf8").slice(0, 120)}`);

console.log(`Teste de fumaça em ${URL_BASE}\n`);
let aluno = null;

try {
  await passo("as páginas abrem: site, /aluno e /admin", async () => {
    for (const p of ["/", "/aluno", "/admin"]) {
      const r = await api("GET", p);
      confere(r.status === 200 && r.tipo.includes("html") && r.bytes.includes('id="root"'), `${p} não abriu (status ${r.status})`);
    }
  });

  await passo("a API responde e a senha do painel confere", async () => {
    espera(await api("GET", "/api/conteudo"), 200);
    const l = await api("POST", "/api/login", { admin: true });
    confere(l.status !== 503, "ADMIN_SENHA não está configurada neste servidor");
    confere(l.status === 200, "a senha do painel informada não é a deste servidor");
  });

  await passo("a versão com alunos está no ar e o armazenamento está ligado", async () => {
    espera(await api("GET", "/api/conteudo"), 200);
    const d = await api("GET", "/api/diagnostico", { admin: true });
    // /api/diagnostico só existe no site no ar; no computador os dados vão para o disco
    if (d.status === 200 && d.dados && "blobConfigurado" in d.dados) {
      confere(d.dados.blobConfigurado, "o Vercel Blob não está ligado ao projeto");
    }
    const r = await api("GET", "/api/alunos", { admin: true });
    confere(r.status !== 404, "esta versão do site ainda não tem as rotas de alunos (deploy antigo?)");
    espera(r, 200);
    confere(Array.isArray(r.dados), "a lista de alunos não veio como lista");
    espera(await api("GET", "/api/alunos"), 401);
  });

  let temporaria;
  await passo("cadastra o aluno de teste e recebe a senha temporária", async () => {
    const r = await api("POST", "/api/alunos", {
      admin: true,
      corpo: { nome: NOME, whatsapp: CELULAR, valor: "1,00", plano: "Teste", obs: "Criado pelo teste automático." },
    });
    espera(r, 201);
    aluno = r.dados.aluno;
    temporaria = r.dados.senhaTemporaria;
    confere(/^[A-Z2-9]{6}$/.test(temporaria), "senha temporária fora do formato");
    confere(!JSON.stringify(r.dados).includes('"hash"'), "o hash da senha saiu na resposta");
  });

  let token;
  await passo("o cadastro foi gravado: aparece na lista e o login temporário entra", async () => {
    const lista = await api("GET", "/api/alunos", { admin: true });
    confere(lista.dados.some((a) => a.id === aluno.id), "o aluno não apareceu na lista depois de gravado");
    espera(await api("POST", "/api/aluno/login", { corpo: { login: CELULAR, senha: "senha-errada" } }), 401);
    const r = await api("POST", "/api/aluno/login", { corpo: { login: CELULAR, senha: temporaria.toLowerCase() } });
    espera(r, 200);
    confere(r.dados.trocarSenha === true, "deveria exigir a criação da senha");
    token = r.dados.token;
  });

  await passo("o aluno cria a própria senha e a temporária deixa de valer", async () => {
    const r = await api("POST", "/api/aluno/senha", { token, corpo: { nova: "senha-fumaca-123" } });
    espera(r, 200);
    espera(await api("GET", "/api/aluno/eu", { token }), 401); // sessão antiga caiu
    token = r.dados.token;
    espera(await api("POST", "/api/aluno/login", { corpo: { login: CELULAR, senha: temporaria } }), 401);
    espera(await api("POST", "/api/aluno/login", { corpo: { login: CELULAR, senha: "senha-fumaca-123" } }), 200);
  });

  let mes;
  await passo("o aluno vê a mensalidade do mês e envia o comprovante: dá baixa", async () => {
    const eu = await api("GET", "/api/aluno/eu", { token });
    espera(eu, 200);
    confere(eu.dados.alunos[0].mensalidades.length === 1, `esperava 1 mensalidade, vieram ${eu.dados.alunos[0].mensalidades.length}`);
    mes = eu.dados.alunos[0].mensalidades[0].mes;
    const r = await api("POST", "/api/aluno/comprovante", {
      token,
      corpo: { mes, dataUrl: `data:image/png;base64,${PNG.toString("base64")}` },
    });
    espera(r, 201);
    const linha = r.dados.alunos[0].mensalidades[0];
    confere(linha.status === "pago" && linha.conferido === false, "o mês não ficou como pago/a conferir");
  });

  await passo("o comprovante foi guardado inteiro e só abre para o aluno e o professor", async () => {
    const meu = await api("GET", `/api/aluno/comprovante/${mes}`, { token });
    espera(meu, 200);
    confere(meu.bytes.equals(PNG), "o arquivo guardado é diferente do enviado");
    const prof = await api("GET", `/api/alunos/${aluno.id}/comprovante/${mes}`, { admin: true });
    espera(prof, 200);
    confere(prof.bytes.equals(PNG) && prof.tipo === "image/png", "o professor recebeu outro arquivo");
    espera(await api("GET", `/api/alunos/${aluno.id}/comprovante/${mes}`), 401);
    espera(await api("GET", `/api/aluno/comprovante/${mes}`), 401);
  });

  await passo("o professor confirma o pagamento e o aluno vê confirmado", async () => {
    const r = await api("PUT", `/api/alunos/${aluno.id}/pagamentos/${mes}`, { admin: true, corpo: { acao: "confirmar" } });
    espera(r, 200);
    const eu = await api("GET", "/api/aluno/eu", { token });
    confere(eu.dados.alunos[0].mensalidades[0].status === "pago" && eu.dados.alunos[0].mensalidades[0].conferido === true, "não ficou confirmado");
  });

  await passo("nova senha temporária derruba a sessão do aluno", async () => {
    const r = await api("POST", `/api/alunos/${aluno.id}/senha`, { admin: true });
    espera(r, 200);
    espera(await api("GET", "/api/aluno/eu", { token }), 401);
    espera(await api("POST", "/api/aluno/login", { corpo: { login: CELULAR, senha: r.dados.senhaTemporaria } }), 200);
  });
} finally {
  // limpeza SEMPRE: o aluno de teste não fica no sistema
  if (aluno) {
    await passo("limpeza: o aluno de teste é apagado e não entra mais", async () => {
      espera(await api("DELETE", `/api/alunos/${aluno.id}`, { admin: true }), 200);
      const lista = await api("GET", "/api/alunos", { admin: true });
      confere(!lista.dados.some((a) => a.id === aluno.id), "o aluno de teste continua na lista: apague pelo painel");
      espera(await api("POST", "/api/aluno/login", { corpo: { login: CELULAR, senha: "senha-fumaca-123" } }), 401);
    });
  }
}

console.log(`\n${passou} de ${passou + falhou} passos passaram.`);
if (aluno && falhou) console.log(`Se sobrou, apague no painel o aluno "${NOME}" (${CELULAR}).`);
process.exit(falhou ? 1 : 0);
