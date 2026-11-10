/**
 * Teste de ponta a ponta no navegador: o professor e o aluno usando as telas
 * de verdade, clicando e digitando, no BUILD DE PRODUÇÃO do site.
 *
 *   npm run test:e2e
 *
 * Faz o build, sobe o site numa porta de teste com dados numa pasta
 * temporária (não toca nos alunos reais), abre o Chrome escondido e percorre:
 * cadastro pelo painel → primeiro acesso com a senha temporária → criar senha
 * → Pix → enviar comprovante → professor confere → recusa → reenvio…
 * Se algo falhar, a foto da tela fica na pasta indicada no final.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { abrirNavegador, fecharNavegador, novaAba, espera, errosDoNavegador } from "./cdp.mjs";
import { crc16 } from "../../src/lib/pix.js";
import { hojeBR, nomeMes } from "../../src/lib/mensalidades.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORTA = 5188;
const B = `http://localhost:${PORTA}`;
const SENHA_PAINEL = "senha-e2e-do-painel";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "andrade-e2e-"));
const VITE = path.join(RAIZ, "node_modules/vite/bin/vite.js");
const ambiente = { ...process.env, ADMIN_SENHA: SENHA_PAINEL, ANDRADE_DADOS: path.join(tmp, "dados") };

/* ---------- um PNG de verdade para servir de comprovante ---------- */
function pngLiso(largura, altura) {
  const crcTab = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTab[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo);
    const tam = Buffer.alloc(4);
    tam.writeUInt32BE(dados.length);
    const soma = Buffer.alloc(4);
    soma.writeUInt32BE(crc(Buffer.concat([t, dados])));
    return Buffer.concat([tam, t, dados, soma]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const linhas = Buffer.alloc((largura * 3 + 1) * altura, 230);
  for (let y = 0; y < altura; y++) linhas[y * (largura * 3 + 1)] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", ihdr),
    bloco("IDAT", zlib.deflateSync(linhas)),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}
const COMPROVANTE = path.join(tmp, "comprovante.png");
// 3000×4000, como foto de celular: tem que ser reduzida antes de subir
fs.writeFileSync(COMPROVANTE, pngLiso(3000, 4000));
const NAO_E_COMPROVANTE = path.join(tmp, "planilha.txt");
fs.writeFileSync(NAO_E_COMPROVANTE, "isto não é um comprovante");

/* ---------- roteiro ---------- */
const resultados = [];
let abaAtual;
async function passo(nome, fn) {
  try {
    await fn();
    resultados.push([true, nome]);
    console.log(`  ✔ ${nome}`);
  } catch (e) {
    let foto = "";
    try {
      foto = await abaAtual?.foto(`falha-${resultados.length + 1}`);
    } catch {
      /* sem foto */
    }
    resultados.push([false, nome]);
    console.log(`  ✘ ${nome}\n      ${String(e.message).replace(/\n/g, "\n      ")}${foto ? `\n      foto: ${foto}` : ""}`);
  }
}
const confere = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

function mesesAtras(n) {
  let [a, m] = hojeBR().split("-").map(Number);
  m -= n;
  while (m < 1) {
    m += 12;
    a--;
  }
  return `${a}-${String(m).padStart(2, "0")}`;
}
const MES_PASSADO = mesesAtras(1);
const Mes = (mes) => nomeMes(mes).replace(/^./, (c) => c.toUpperCase());
/** Expande o aluno na lista do professor (se já estiver aberto, deixa como está). */
async function abrirAluno(aba, nome) {
  await aba.js(`(() => {
    const b = [...document.querySelectorAll(".ad-aluno__nome")].find((x) => x.innerText.includes(${JSON.stringify(nome)}));
    if (!b) throw new Error("aluno não está na lista: " + ${JSON.stringify(nome)});
    if (b.getAttribute("aria-expanded") !== "true") b.click();
  })()`);
  await aba.aparecer(".ad-meses");
}
const CELULAR = "48 98765-4321";
const LOGIN = "48987654321";

let servidor;
try {
  console.log("Build de produção…");
  const build = spawnSync(process.execPath, [VITE, "build", "--outDir", path.join(tmp, "dist")], { cwd: RAIZ, env: ambiente, encoding: "utf8" });
  if (build.status !== 0) throw new Error("o build falhou:\n" + build.stdout + build.stderr);

  servidor = spawn(process.execPath, [VITE, "preview", "--port", String(PORTA), "--strictPort", "--outDir", path.join(tmp, "dist")], {
    cwd: RAIZ,
    env: ambiente,
    stdio: "ignore",
  });
  for (let i = 0; ; i++) {
    if (await fetch(B + "/api/conteudo").then((r) => r.ok, () => false)) break;
    if (i > 60) throw new Error(`o site não subiu na porta ${PORTA} (ela está em uso?)`);
    await espera(250);
  }
  await abrirNavegador({ perfil: path.join(tmp, "perfil"), fotos: path.join(tmp, "fotos") });
  console.log("Navegador aberto. Percorrendo as telas:\n");

  let temporaria = "";
  const prof = (abaAtual = await novaAba(1366, 800));

  /* ============ professor: entrar e cadastrar ============ */
  await passo("cabeçalhos de segurança do vercel.json estão valendo em todas as páginas", async () => {
    for (const p of ["/", "/aluno", "/admin", "/api/conteudo"]) {
      const h = (await fetch(B + p)).headers;
      confere(/default-src 'self'/.test(h.get("content-security-policy") || ""), `${p} sem Content-Security-Policy`);
      confere(h.get("x-frame-options") === "SAMEORIGIN", `${p} sem X-Frame-Options`);
      confere(h.get("x-content-type-options") === "nosniff", `${p} sem nosniff`);
      confere(h.get("referrer-policy"), `${p} sem Referrer-Policy`);
    }
  });

  await passo("site: o menu tem o link “Área do aluno”", async () => {
    await prof.ir(B + "/");
    await prof.ate(`[...document.querySelectorAll('a[href="/aluno"]')].length > 0`, "link /aluno no menu");
  });

  await passo("professor: senha errada não entra e mostra o erro", async () => {
    await prof.ir(B + "/admin");
    await prof.aparecer(".entrar__form");
    confere((await prof.texto(".entrar")).includes("ÁREA DO PROFESSOR"), "tela de login do professor não apareceu");
    // no computador a arte é a versão larga, na tela toda
    const fundo = await prof.js(`getComputedStyle(document.querySelector(".entrar")).backgroundImage`);
    confere(/fundo-login-largo/.test(fundo), "a arte larga da academia não está na tela de login do computador");
    await prof.digitar(".entrar__form input", 0, "senha-errada");
    await prof.clicar(".entrar__btn");
    await prof.aparecerTexto("Senha incorreta", ".entrar");
    confere(!(await prof.existe(".ad-resumo")), "entrou com a senha errada!");
  });

  await passo("professor: entra com a senha certa e cai em Alunos e mensalidades", async () => {
    await prof.digitar(".entrar__form input", 0, SENHA_PAINEL);
    await prof.clicar(".entrar__btn");
    await prof.aparecer(".ad-resumo");
    await prof.aparecerTexto("Nenhum aluno cadastrado ainda", ".ad-editor");
    confere((await prof.texto(".ad-topo h1")).toUpperCase().includes("ALUNOS E MENSALIDADES"), "aba errada");
    const guardado = await prof.js(`JSON.stringify([localStorage, sessionStorage]) + document.cookie`);
    confere(!guardado.includes(SENHA_PAINEL) && !guardado.includes("andrade_admin"), "a senha ou a sessão do painel ficou legível no navegador");
    // recarregar a página mantém a sessão (cookie)
    await prof.ir(B + "/admin");
    await prof.aparecer(".ad-resumo");
  });

  await passo("professor: cadastra um aluno e recebe login + senha temporária", async () => {
    await prof.clicarTexto("Novo aluno", ".ad-insc__acoes");
    await prof.aparecer(".ad-ficha");
    // nome, celular, e-mail, entrou em, nascimento, mensalidade, vencimento, turma, faixa
    await prof.digitar(".ad-ficha input", 0, "Carla Mendes de Teste");
    await prof.digitar(".ad-ficha input", 1, CELULAR);
    await prof.digitar(".ad-ficha input", 3, `${mesesAtras(2)}-01`);
    await prof.digitar(".ad-ficha input", 5, "129,90");
    await prof.digitar(".ad-ficha input", 6, "10");
    await prof.digitar(".ad-ficha input", 8, "Branca");
    await prof.digitar(".ad-ficha textarea", 0, "OBS-SECRETA-DO-PROFESSOR");
    await prof.clicarTexto("Cadastrar e gerar acesso", ".ad-ficha");
    await prof.aparecer(".ad-acesso__senha");
    temporaria = (await prof.texto(".ad-acesso__senha")).trim();
    confere(/^[A-Z2-9]{6}$/.test(temporaria), `senha temporária estranha: "${temporaria}"`);
    const caixa = await prof.texto(".ad-acesso");
    confere(caixa.includes(LOGIN), "a caixa de acesso não mostra o login");
    const zap = await prof.js(`document.querySelector(".ad-acesso a").href`);
    confere(zap.startsWith("https://wa.me/55" + LOGIN), "link do WhatsApp com número errado: " + zap);
    confere(decodeURIComponent(zap).includes(temporaria) && decodeURIComponent(zap).includes("/aluno"), "a mensagem do WhatsApp não leva a senha e o endereço");
    await prof.aparecerTexto("Atrasado", ".ad-insc__lista");
  });

  await passo("professor: celular que já é login pergunta se é família; cancelando, nada muda", async () => {
    await prof.clicarTexto("Novo aluno", ".ad-insc__acoes");
    await prof.aparecer(".ad-ficha");
    await prof.digitar(".ad-ficha input", 0, "Clone");
    await prof.digitar(".ad-ficha input", 1, "+55 48 98765 4321");
    await prof.digitar(".ad-ficha input", 5, "100");
    const antes = prof.dialogos.length;
    prof.aceitarDialogos = false;
    try {
      await prof.clicarTexto("Cadastrar e gerar acesso", ".ad-ficha");
      for (let i = 0; i < 25 && prof.dialogos.length === antes; i++) await espera(200);
      await espera(400); // a resposta "Cancelar" chega à página
    } finally {
      prof.aceitarDialogos = true;
    }
    const pergunta = prof.dialogos.slice(antes).join(" ");
    confere(/já é o login de .*Carla/.test(pergunta) && pergunta.includes("família"), "não perguntou se é a mesma família: " + pergunta);
    confere(!(await prof.texto(".ad-insc__lista")).includes("Clone"), "cancelou e o aluno foi cadastrado mesmo assim");
    await prof.aparecer(".ad-ficha"); // a ficha continua aberta para corrigir o celular
    await prof.clicarTexto("Cancelar", ".ad-ficha");
  });

  /* ============ aluno: primeiro acesso no celular ============ */
  const aluno = (abaAtual = await novaAba(390, 844));

  await passo("aluno: tela de login no celular, com o fundo e sem rolar de lado", async () => {
    await aluno.ir(B + "/aluno");
    await aluno.aparecer(".entrar__form");
    confere((await aluno.texto(".entrar")).includes("ÁREA DO ALUNO"), "não é a tela do aluno");
    confere(await aluno.semRolagemLateral(), "a tela de login rola de lado no celular");
    // no celular a arte é a versão em pé
    const arte = await aluno.js(`getComputedStyle(document.querySelector(".entrar__tela")).backgroundImage`);
    confere(/fundo-login-/.test(arte) && !/largo/.test(arte), "a arte em pé não está na tela de login do celular");
    // o formulário começa abaixo do brasão do fundo (26% da altura da arte)
    const topo = await aluno.js(`document.querySelector(".entrar__form").getBoundingClientRect().top`);
    confere(topo >= 844 * 0.26, `o formulário cobre o brasão (começa em ${Math.round(topo)}px)`);
  });

  await passo("aluno: senha errada mostra erro e não entra", async () => {
    await aluno.digitar(".entrar__form input", 0, CELULAR);
    await aluno.digitar(".entrar__form input", 1, "chute123");
    await aluno.clicar(".entrar__btn");
    await aluno.aparecerTexto("Celular ou senha incorretos", ".entrar");
  });

  await passo("aluno: entra com a senha temporária (digitada em minúsculas) e é obrigado a criar a senha", async () => {
    await aluno.digitar(".entrar__form input", 1, temporaria.toLowerCase());
    await aluno.clicar(".entrar__btn");
    await aluno.aparecerTexto("CRIE SUA SENHA", ".entrar");
    confere((await aluno.texto(".entrar")).includes("CARLA"), "não cumprimentou pelo nome");
    confere(!(await aluno.existe(".al-meses")), "viu o painel sem criar a senha");
    // recarregar a página não deixa pular a criação da senha
    await aluno.ir(B + "/aluno");
    await aluno.aparecerTexto("CRIE SUA SENHA", ".entrar");
  });

  await passo("aluno: senhas diferentes ou curtas são recusadas; depois cria a senha", async () => {
    await aluno.digitar(".entrar__form input", 0, "minhasenha1");
    await aluno.digitar(".entrar__form input", 1, "minhasenha2");
    await aluno.clicar(".entrar__btn");
    await aluno.aparecerTexto("não estão iguais", ".entrar");
    await aluno.digitar(".entrar__form input", 0, "123");
    await aluno.digitar(".entrar__form input", 1, "123");
    await aluno.clicar(".entrar__btn");
    await aluno.digitar(".entrar__form input", 0, "1234567");
    await aluno.digitar(".entrar__form input", 1, "1234567");
    await aluno.clicar(".entrar__btn");
    await aluno.aparecerTexto("pelo menos 8", ".entrar");
    await aluno.digitar(".entrar__form input", 0, "minhasenha1");
    await aluno.digitar(".entrar__form input", 1, "minhasenha1");
    await aluno.clicar(".entrar__btn");
    await aluno.aparecer(".al-meses");
  });

  await passo("aluno: o painel mostra desde quando treina, o plano e as 3 mensalidades", async () => {
    const t = await aluno.texto(".al");
    confere(t.includes("CARLA MENDES DE TESTE"), "nome não aparece");
    confere(/NA ACADEMIA DESDE\s+1 de /i.test(t), "data de entrada não aparece: " + t.slice(0, 200));
    confere(t.includes("há 2 meses"), "tempo de casa errado");
    confere(t.includes("Branca"), "faixa não aparece");
    confere(t.includes("vence todo dia 10"), "vencimento não aparece");
    confere(!t.includes("OBS-SECRETA"), "a observação do professor apareceu para o aluno!");
    confere((await aluno.js(`document.querySelectorAll(".al-mes").length`)) === 3, "deveriam ser 3 mensalidades");
    confere(t.includes("3 mensalidades em aberto"), "resumo errado");
    confere(/R\$\s389,70/.test(t), "total em aberto errado (3 × 129,90)");
    confere(await aluno.semRolagemLateral(), "o painel rola de lado no celular");
  });

  await passo("aluno: o Pix abre na mensalidade mais antiga, com QR Code e código válido no valor certo", async () => {
    await aluno.aparecer(".al-qr");
    const mesAberto = await aluno.js(`document.querySelector(".al-pagar").closest(".al-mes").innerText`);
    confere(mesAberto.startsWith(Mes(mesesAtras(2))), "não abriu a mais antiga: " + mesAberto.slice(0, 40));
    const codigo = (await aluno.texto(".al-codigo")).trim();
    confere(codigo.startsWith("000201"), "código Pix malformado");
    confere(codigo.includes("5406129.90"), "o código Pix não está com R$ 129,90");
    confere(codigo.slice(-4) === crc16(codigo.slice(0, -4)), "CRC do Pix não fecha: o banco recusaria");
    confere(await aluno.js(`document.querySelector(".al-qr").naturalWidth > 100`), "QR Code não carregou");
  });

  await passo("aluno: arquivo que não é comprovante é recusado com aviso", async () => {
    await aluno.anexar('.al-pagar input[type="file"]', NAO_E_COMPROVANTE);
    await aluno.aparecerTexto("Envie uma foto, print ou PDF", ".al-pagar");
    confere((await aluno.texto(".al")).includes("3 mensalidades em aberto"), "deu baixa com arquivo inválido");
  });

  await passo("aluno: envia uma foto grande (3000×4000) do comprovante e o mês fica pago", async () => {
    await aluno.anexar('.al-pagar input[type="file"]', COMPROVANTE);
    await aluno.aparecerTexto("2 mensalidades em aberto", ".al");
    const linha = await aluno.js(`[...document.querySelectorAll(".al-mes")].at(-1).innerText`);
    confere(linha.includes("Paga · em conferência"), "o mês não ficou como pago: " + linha);
    confere(linha.includes("Ver comprovante"), "sem link para ver o comprovante");
    // o Pix já pula para a próxima em aberto
    const proxima = await aluno.js(`document.querySelector(".al-pagar")?.closest(".al-mes").innerText ?? ""`);
    confere(proxima.startsWith(Mes(MES_PASSADO)), "não abriu a próxima mensalidade");
  });

  await passo("o comprovante guardado é uma imagem reduzida (cabe no limite da Vercel)", async () => {
    const pasta = path.join(ambiente.ANDRADE_DADOS, "comprovantes");
    const arqs = fs.readdirSync(pasta, { recursive: true }).filter((f) => /\.(jpg|png)$/.test(String(f)));
    confere(arqs.length === 1, `esperava 1 comprovante no disco, achei ${arqs.length}`);
    const buf = fs.readFileSync(path.join(pasta, String(arqs[0])));
    confere(buf[0] === 0xff && buf[1] === 0xd8, "não foi convertido para JPEG");
    confere(buf.length < 1_000_000, `comprovante com ${buf.length} bytes: grande demais`);
  });

  await passo("aluno: fechar e abrir o navegador mantém o login e o pagamento", async () => {
    await aluno.ir(B + "/aluno");
    await aluno.aparecer(".al-meses");
    await aluno.aparecerTexto("2 mensalidades em aberto", ".al");
    // a sessão está no cookie HttpOnly: nada dela fica ao alcance do JavaScript da página
    const guardado = await aluno.js(`JSON.stringify([localStorage, sessionStorage]) + document.cookie`);
    confere(!/andrade-aluno-sessao|andrade_aluno|eyJ/.test(guardado), "a sessão do aluno ficou legível no navegador: " + guardado.slice(0, 120));
  });

  /* ============ professor: conferir ============ */
  abaAtual = prof;
  await passo("professor: vê o comprovante a conferir e o dinheiro recebido", async () => {
    await prof.clicarTexto("Atualizar", ".ad-insc__acoes");
    await prof.aparecerTexto("Comprovante a conferir", ".ad-insc__lista");
    const resumo = await prof.texto(".ad-resumo");
    confere(/1\s+comprovantes a conferir/.test(resumo), "contador de comprovantes errado: " + resumo);
    confere(/R\$\s259,80\s+a receber/.test(resumo), "a receber errado: " + resumo);
    await abrirAluno(prof, "Carla Mendes de Teste");
    confere((await prof.texto(".ad-aluno__corpo")).includes("OBS-SECRETA-DO-PROFESSOR"), "o professor não vê a própria observação");
    confere((await prof.texto(".ad-meses")).includes("Pago · a conferir"), "mês não está a conferir");
  });

  await passo("professor: recusa o comprovante e o aluno vê que precisa reenviar", async () => {
    await prof.clicarTexto("Recusar", ".ad-meses");
    await prof.aparecerTexto("Comprovante recusado", ".ad-meses");
    confere(prof.dialogos.some((d) => d.includes("Recusar este comprovante")), "não pediu confirmação antes de recusar");
    abaAtual = aluno;
    await aluno.ir(B + "/aluno");
    await aluno.aparecerTexto("Comprovante recusado", ".al");
    await aluno.aparecerTexto("3 mensalidades em aberto", ".al");
  });

  await passo("aluno reenvia; professor confirma e o mês fica quitado para os dois", async () => {
    await aluno.aparecer('.al-pagar input[type="file"]');
    await aluno.anexar('.al-pagar input[type="file"]', COMPROVANTE);
    await aluno.aparecerTexto("2 mensalidades em aberto", ".al");
    abaAtual = prof;
    await prof.clicarTexto("Atualizar", ".ad-insc__acoes");
    await prof.aparecerTexto("Pago · a conferir", ".ad-meses");
    await prof.clicarTexto("Confirmar", ".ad-meses");
    await prof.ate(`!document.querySelector(".ad-meses").innerText.includes("a conferir")`, "sumir o “a conferir”");
    abaAtual = aluno;
    await aluno.ir(B + "/aluno");
    await aluno.aparecer(".al-meses");
    const linha = await aluno.js(`[...document.querySelectorAll(".al-mes")].at(-1).innerText`);
    confere(linha.includes("Paga") && !linha.includes("conferência"), "aluno não vê como confirmada: " + linha);
  });

  await passo("professor: dá baixa manual (dinheiro) e o aluno vê; desfazer volta a dever", async () => {
    abaAtual = prof;
    await prof.js(`[...document.querySelectorAll(".ad-meses tbody tr")].find((tr) => tr.innerText.startsWith(${JSON.stringify(Mes(MES_PASSADO))})).querySelector("button").click()`);
    await prof.ate(`[...document.querySelectorAll(".ad-meses tbody tr")].find((tr) => tr.innerText.startsWith(${JSON.stringify(Mes(MES_PASSADO))})).innerText.includes("Desfazer")`, "baixa manual");
    abaAtual = aluno;
    await aluno.ir(B + "/aluno");
    await aluno.aparecerTexto("1 mensalidade em aberto", ".al");
    abaAtual = prof;
    await prof.js(`[...document.querySelectorAll(".ad-meses tbody tr")].find((tr) => tr.innerText.startsWith(${JSON.stringify(Mes(MES_PASSADO))})).querySelector("button").click()`);
    await prof.ate(`[...document.querySelectorAll(".ad-meses tbody tr")].find((tr) => tr.innerText.startsWith(${JSON.stringify(Mes(MES_PASSADO))})).innerText.includes("Dar baixa")`, "desfazer a baixa");
  });

  /* ============ senha: trocar, sair, esquecer ============ */
  abaAtual = aluno;
  await passo("aluno: troca a própria senha (exige a atual)", async () => {
    await aluno.ir(B + "/aluno");
    await aluno.aparecer(".al-rodape");
    await aluno.clicarTexto("Trocar minha senha", ".al-rodape");
    await aluno.aparecerTexto("TROCAR SENHA", ".entrar");
    await aluno.digitar(".entrar__form input", 0, "senha-atual-errada");
    await aluno.digitar(".entrar__form input", 1, "novasenha22");
    await aluno.digitar(".entrar__form input", 2, "novasenha22");
    await aluno.clicar(".entrar__btn");
    await aluno.aparecerTexto("senha atual não confere", ".entrar");
    await aluno.digitar(".entrar__form input", 0, "minhasenha1");
    await aluno.clicar(".entrar__btn");
    await aluno.aparecer(".al-meses");
  });

  await passo("aluno: sai; a senha temporária e a antiga não entram mais, a nova entra", async () => {
    await aluno.clicar(".al-topo__sair");
    await aluno.aparecer(".entrar__form");
    await aluno.ir(B + "/aluno");
    await aluno.aparecer(".entrar__form"); // saiu de verdade: recarregar não volta
    for (const velha of [temporaria, "minhasenha1"]) {
      await aluno.digitar(".entrar__form input", 0, LOGIN);
      await aluno.digitar(".entrar__form input", 1, velha);
      await aluno.clicar(".entrar__btn");
      await aluno.aparecerTexto("Celular ou senha incorretos", ".entrar");
      await aluno.ir(B + "/aluno");
      await aluno.aparecer(".entrar__form");
    }
    await aluno.digitar(".entrar__form input", 0, LOGIN);
    await aluno.digitar(".entrar__form input", 1, "novasenha22");
    await aluno.clicar(".entrar__btn");
    await aluno.aparecer(".al-meses");
  });

  await passo("aluno esqueceu a senha: professor gera outra temporária, a sessão cai e ele recria", async () => {
    abaAtual = prof;
    await prof.clicarTexto("Nova senha temporária", ".ad-aluno__acoes");
    // a caixa com a senha do cadastro ainda pode estar na tela: espera a senha mudar
    await prof.ate(
      `document.querySelector(".ad-acesso__senha") && document.querySelector(".ad-acesso__senha").innerText.trim() !== ${JSON.stringify(temporaria)}`,
      "aparecer a nova senha temporária"
    );
    confere(prof.dialogos.some((d) => d.includes("Gerar nova senha temporária")), "não pediu confirmação antes de trocar a senha");
    const nova = (await prof.texto(".ad-acesso__senha")).trim();
    confere(nova !== temporaria && /^[A-Z2-9]{6}$/.test(nova), "senha nova inválida");
    abaAtual = aluno;
    await aluno.ir(B + "/aluno");
    await aluno.aparecer(".entrar__form"); // foi deslogado
    await aluno.digitar(".entrar__form input", 0, LOGIN);
    await aluno.digitar(".entrar__form input", 1, nova);
    await aluno.clicar(".entrar__btn");
    await aluno.aparecerTexto("CRIE SUA SENHA", ".entrar");
    await aluno.digitar(".entrar__form input", 0, "terceirasenha3");
    await aluno.digitar(".entrar__form input", 1, "terceirasenha3");
    await aluno.clicar(".entrar__btn");
    await aluno.aparecer(".al-meses");
    await aluno.aparecerTexto("2 mensalidades em aberto", ".al"); // os pagamentos continuam lá
  });

  /* ============ inscrição do site → aluno ============ */
  await passo("inscrição paga recebida pelo site vira aluno com o 1º mês quitado", async () => {
    const r = await fetch(B + "/api/inscricoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Bruno Inscrito", whatsapp: "48 97654-3210", plano: "Mensal", valor: "R$ 129,90", turma: "Adulto", forma: "Pix" }),
    });
    const { id } = await r.json();
    await fetch(`${B}/api/inscricoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-senha": SENHA_PAINEL },
      body: JSON.stringify({ status: "pago" }),
    });
    abaAtual = prof;
    await prof.clicarTexto("Inscrições recebidas", ".ad-lateral");
    await prof.aparecerTexto("Bruno Inscrito", ".ad-insc__lista");
    await prof.clicarTexto("Bruno Inscrito", ".ad-insc__lista");
    await prof.clicarTexto("Tornar aluno", ".ad-aluno__acoes");
    await prof.aparecer(".ad-acesso__senha");
    confere((await prof.texto(".ad-acesso")).includes("48976543210"), "login do inscrito errado");
    await prof.clicarTexto("Alunos e mensalidades", ".ad-lateral");
    await prof.aparecerTexto("Bruno Inscrito", ".ad-insc__lista");
    const linha = await prof.js(`[...document.querySelectorAll(".ad-aluno")].find((l) => l.innerText.includes("Bruno")).innerText`);
    confere(linha.includes("Em dia"), "o inscrito pago não entrou em dia: " + linha);
    confere(/R\$\s129,90/.test(linha), "a mensalidade não veio da inscrição: " + linha);
  });

  await passo("professor: filtros e busca da lista", async () => {
    await prof.digitar(".ad-busca input", 0, "carla");
    await prof.ate(`document.querySelectorAll(".ad-aluno").length === 1`, "busca por nome");
    await prof.digitar(".ad-busca input", 0, "");
    await prof.clicarTexto("Em dia (1)", ".ad-filtros");
    await prof.ate(`document.querySelectorAll(".ad-aluno").length === 1 && document.querySelector(".ad-aluno").innerText.includes("Bruno")`, "filtro Em dia");
    await prof.clicarTexto("Ativos (2)", ".ad-filtros");
    await prof.ate(`document.querySelectorAll(".ad-aluno").length === 2`, "filtro Ativos");
  });

  await passo("família: irmão no mesmo celular entra na conta sem senha nova e aparece para a mãe", async () => {
    abaAtual = prof;
    await prof.clicarTexto("Novo aluno", ".ad-insc__acoes");
    await prof.aparecer(".ad-ficha");
    await prof.digitar(".ad-ficha input", 0, "Davi Irmão de Teste");
    await prof.digitar(".ad-ficha input", 1, CELULAR);
    await prof.digitar(".ad-ficha input", 5, "88,00");
    await prof.clicarTexto("Cadastrar e gerar acesso", ".ad-ficha"); // pergunta "é família?" → OK
    await prof.aparecerTexto("entrou na conta da família", ".ad-acesso");
    confere(!(await prof.js(`!!document.querySelector(".ad-acesso__senha")`)), "mostrou senha nova para conta que já existe");
    await prof.clicarTexto("Entendi", ".ad-acesso");
    await abrirAluno(prof, "Davi Irmão de Teste");
    await prof.aparecerTexto("divide o login com Carla Mendes de Teste", ".ad-insc__lista");

    abaAtual = aluno;
    await aluno.ir(B + "/aluno");
    await aluno.aparecer(".al-familia");
    const abas = await aluno.texto(".al-familia");
    confere(abas.includes("Carla") && abas.includes("Davi"), "a mãe não vê os dois: " + abas);
    await aluno.clicarTexto("Davi", ".al-familia");
    await aluno.ate(`document.querySelector(".al-ola h1").innerText.toLowerCase().includes("davi")`, "trocar para o Davi");
    confere((await aluno.texto(".al-meses")).includes("88,00"), "mensalidade do Davi com valor errado");
    confere(await aluno.semRolagemLateral(), "abas da família rolam a página de lado");
  });

  await passo("professor: painel no celular não rola de lado", async () => {
    const cel = (abaAtual = await novaAba(360, 740));
    // mesmo navegador: a sessão do professor (cookie) já vale nesta aba
    await cel.ir(B + "/admin");
    await cel.aparecer(".ad-aluno");
    await abrirAluno(cel, "Carla Mendes de Teste");
    confere(await cel.semRolagemLateral(), "a lista de alunos rola de lado em 360px");
    // sair fecha a sessão de verdade: recarregando, pede a senha
    await cel.clicarTexto("Sair", ".ad-lateral");
    await cel.aparecer(".entrar__form");
    await cel.ir(B + "/admin");
    await cel.aparecer(".entrar__form");
    confere(await cel.semRolagemLateral(), "login do professor rola de lado em 360px");
    await cel.digitar(".entrar__form input", 0, SENHA_PAINEL);
    await cel.clicar(".entrar__btn");
    await cel.aparecer(".ad-aluno");
  });

  await passo("professor: apagar um filho mantém a conta; apagar o último tira o acesso na hora", async () => {
    abaAtual = prof;
    await abrirAluno(prof, "Carla Mendes de Teste");
    await prof.clicarTexto("Apagar", ".ad-aluno__acoes");
    await prof.ate(`!document.querySelector(".ad-insc__lista").innerText.includes("Carla")`, "sumir da lista");
    confere(prof.dialogos.some((d) => d.includes("Apagar Carla")), "não pediu confirmação antes de apagar");
    // a conta era da família: o Davi continua nela, só a Carla some
    abaAtual = aluno;
    await aluno.ir(B + "/aluno");
    await aluno.aparecer(".al-ola");
    confere(!(await aluno.js(`!!document.querySelector(".al-familia")`)), "ainda mostra a troca de família com um aluno só");
    confere(!(await aluno.texto("body")).toLowerCase().includes("carla"), "a aluna apagada continua aparecendo");
    await abrirAluno(prof, "Davi Irmão de Teste");
    await prof.clicarTexto("Apagar", ".ad-aluno__acoes");
    await prof.ate(`!document.querySelector(".ad-insc__lista").innerText.includes("Davi")`, "Davi sumir da lista");
    // o último da conta apagado: a conta deixa de existir e a sessão cai
    await aluno.ir(B + "/aluno");
    await aluno.aparecer(".entrar__form");
    confere(!fs.existsSync(path.join(ambiente.ANDRADE_DADOS, "comprovantes")) || fs.readdirSync(path.join(ambiente.ANDRADE_DADOS, "comprovantes")).length === 0, "comprovantes do aluno apagado ficaram no disco");
  });

  await passo("nenhum erro de JavaScript apareceu no navegador durante todo o roteiro", async () => {
    // 401/400/409/429 esperados aparecem no console como "Failed to load resource": não são erro de código
    const graves = errosDoNavegador.filter((e) => !/Failed to load resource/.test(String(e)));
    confere(graves.length === 0, graves.join("\n"));
  });
} catch (e) {
  resultados.push([false, "preparação"]);
  console.log("\nNão consegui rodar o roteiro: " + e.message);
} finally {
  fecharNavegador();
  servidor?.kill();
}

const falhas = resultados.filter(([ok]) => !ok).length;
console.log(`\n${resultados.length - falhas} de ${resultados.length} passos passaram.`);
if (falhas) {
  console.log(`Fotos das falhas: ${path.join(tmp, "fotos")}`);
  process.exit(1);
}
// o Chrome pode ainda estar gravando o perfil ao fechar: tenta algumas vezes
try {
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
} catch {
  console.log(`(não consegui apagar a pasta temporária ${tmp}; pode apagar à mão)`);
}
