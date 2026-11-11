/**
 * Alunos, mensalidades e comprovantes.
 *
 * Painel do aluno (sessão no cookie HttpOnly andrade_aluno; scripts e testes
 * podem mandar o mesmo token em Authorization: Bearer <token>)
 *   POST   /api/aluno/login               entra com celular + senha
 *   POST   /api/aluno/sair                fecha a sessão
 *   GET    /api/aluno/eu                  dados e mensalidades do aluno
 *   POST   /api/aluno/senha               cria/troca a própria senha
 *   POST   /api/aluno/comprovante         envia o comprovante → dá baixa no mês
 *   GET    /api/aluno/comprovante/[:id/]:mes   um comprovante da conta (o id é do aluno, na família)
 *
 * Painel do professor (senha do painel)
 *   GET    /api/alunos                              lista
 *   POST   /api/alunos                              cadastra (devolve a senha temporária)
 *   PATCH  /api/alunos/:id                          edita
 *   DELETE /api/alunos/:id                          apaga (com os comprovantes)
 *   POST   /api/alunos/:id/senha                    gera nova senha temporária
 *   PUT    /api/alunos/:id/pagamentos/:mes          pagar | confirmar | recusar | reabrir
 *   PUT    /api/alunos/:id/pagamentos               { meses: [...] } "já pago" em vários meses de uma vez
 *   GET    /api/alunos/:id/comprovante/:mes         vê o comprovante
 *
 * A senha nunca é guardada: só o scrypt dela. A senha temporária aparece uma
 * única vez, na resposta de quem cadastrou ou pediu uma nova.
 */
import crypto from "node:crypto";
import { promisify } from "node:util";
import { mensalidades, hojeBR, loginDe, MES_VALIDO } from "../src/lib/mensalidades.js";
import { criarLimite, origemDe } from "./limite.js";
import { COOKIE_ALUNO, criarAssinador, gravarCookie, lerCookie } from "./sessao.js";

const scrypt = promisify(crypto.scrypt);

const SESSAO_DIAS = 30;
const MAX_FALHAS = 6;
const BLOQUEIO_MIN = 15;
// senhas novas; quem já criou uma de 6 continua entrando com ela
const SENHA_MIN = 8;
// além do bloqueio por conta: erros de login por endereço (quem tenta vários celulares)
const ERROS_POR_ENDERECO = 10;

const TEXTO = ["nome", "whatsapp", "email", "nascimento", "turma", "plano", "valor", "faixa", "obs"];
const TIPOS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};


async function gerarHash(senha) {
  const sal = crypto.randomBytes(16);
  const h = await scrypt(String(senha), sal, 32);
  return { sal: sal.toString("hex"), hash: h.toString("hex") };
}

async function confere(senha, guardada) {
  if (!guardada?.sal || !guardada?.hash) return false;
  const h = await scrypt(String(senha), Buffer.from(guardada.sal, "hex"), 32);
  return crypto.timingSafeEqual(h, Buffer.from(guardada.hash, "hex"));
}

/** Senha temporária fácil de ditar: sem 0/O, 1/I/L. */
function senhaTemporaria() {
  const letras = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.randomBytes(6), (b) => letras[b % letras.length]).join("");
}

const dataValida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !Number.isNaN(Date.parse(s));

/** O que sai do servidor sobre um aluno. Campos de versões antigas (senha no aluno) nunca saem. */
function visao(aluno, paraAluno = false) {
  const { senha, falhas, bloqueadoAte, sv, senhaTemporaria, ...resto } = aluno;
  if (paraAluno) {
    delete resto.obs;
    delete resto.pagamentos;
  }
  return resto;
}

/** "José  da Silva" e "jose da silva" são a mesma pessoa. */
const nomeChave = (nome) =>
  String(nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * CONTA × ALUNO
 * A conta é o acesso: um celular (login) + uma senha. Fica em conta.alunos a
 * lista de quem aquela conta enxerga. Um adulto tem a conta só dele; a mãe que
 * cadastra os filhos com o celular dela tem uma conta com vários alunos.
 * Quando um filho passa a ter celular próprio, o professor troca o WhatsApp
 * dele e ele sai para uma conta nova, com senha temporária nova.
 */
export function criarRotasAlunos({ senha: senhaPainel, armazem, json, lerCorpo }) {
  const assinador = criarAssinador(senhaPainel);
  const errosLogin = criarLimite({ max: ERROS_POR_ENDERECO, janelaMs: BLOQUEIO_MIN * 60_000 });

  const criarToken = (conta) =>
    assinador.criar({ login: conta.login, sv: conta.sv || 0, exp: Date.now() + SESSAO_DIAS * 864e5 });

  /** Abre a sessão: cookie para o navegador; o token também vai na resposta (scripts e testes). */
  function abrirSessao(req, res, conta) {
    const token = criarToken(conta);
    gravarCookie(req, res, COOKIE_ALUNO, token, SESSAO_DIAS * 86400);
    return token;
  }

  /** Alunos da conta que existem; `soAtivos` tira os inativos. */
  async function alunosDa(conta, soAtivos = false) {
    const lidos = await Promise.all((conta?.alunos || []).map((id) => armazem.lerAluno(id)));
    return lidos
      .filter((a) => a && (!soAtivos || a.ativo !== false))
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  }

  /** { conta, alunos } de quem está logado, ou null. Trocar a senha (sv) derruba as sessões antigas. */
  async function sessao(req) {
    const bearer = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || "");
    const dados = assinador.ler(bearer ? bearer[1] : lerCookie(req, COOKIE_ALUNO));
    if (!dados?.login) return null;
    const conta = await armazem.lerConta(loginDe(dados.login));
    if (!conta || (conta.sv || 0) !== dados.sv) return null;
    const alunos = await alunosDa(conta, true);
    return alunos.length ? { conta, alunos } : null;
  }

  const resposta = (conta, alunos) => ({
    trocarSenha: Boolean(conta.senhaTemporaria),
    alunos: alunos.map((a) => ({ aluno: visao(a, true), mensalidades: mensalidades(a) })),
  });

  /** O aluno como o professor vê: com a situação da senha e quem divide a conta com ele. */
  async function paraProfessor(aluno) {
    const conta = await armazem.lerConta(aluno.login);
    const outros = (await alunosDa(conta)).filter((a) => a.id !== aluno.id);
    return {
      ...visao(aluno),
      senhaTemporaria: Boolean(conta?.senhaTemporaria),
      familia: outros.map((a) => ({ id: a.id, nome: a.nome })),
    };
  }

  async function novaConta(login, ids) {
    const temporaria = senhaTemporaria();
    const conta = {
      login,
      criadaEm: new Date().toISOString(),
      senha: await gerarHash(temporaria),
      senhaTemporaria: true,
      sv: 0,
      alunos: ids,
    };
    await armazem.gravarConta(conta);
    return temporaria;
  }

  /** Tira o aluno da conta; conta sem ninguém deixa de existir. */
  async function sairDaConta(conta, id) {
    if (!conta) return;
    const alunos = (conta.alunos || []).filter((x) => x !== id);
    if (alunos.length) await armazem.gravarConta({ ...conta, alunos });
    else await armazem.apagarConta(conta.login);
  }

  /**
   * Pode este aluno entrar na conta que já existe nesse celular?
   * Devolve null se pode, ou a resposta 409 a dar.
   */
  async function barraFamilia(conta, nome, aceitou, ignorarId) {
    const membros = (await alunosDa(conta)).filter((a) => a.id !== ignorarId);
    if (membros.some((a) => nomeChave(a.nome) === nomeChave(nome))) {
      return { erro: "Esse aluno já está cadastrado com esse celular." };
    }
    if (membros.length && !aceitou) {
      const nomes = membros.map((a) => a.nome);
      return {
        erro: `Esse celular já é o login de ${nomes.join(", ")}. Confirme para cadastrar na mesma conta (família).`,
        familia: nomes,
      };
    }
    return null;
  }

  /** Apaga um comprovante que não é mais usado. Falhar aqui não desfaz o que já foi gravado. */
  async function apagarComprovante(caminho) {
    if (!caminho || !armazem.apagarPrivado) return;
    try {
      await armazem.apagarPrivado(caminho);
    } catch (e) {
      console.error("[alunos] não apagou o comprovante antigo", e);
    }
  }

  function enviarArquivo(res, arq) {
    res.statusCode = 200;
    res.setHeader("Content-Type", arq.contentType);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "inline");
    res.end(arq.dados);
  }

  async function comprovanteDe(res, aluno, mes) {
    const caminho = aluno.pagamentos?.[mes]?.comprovante;
    const arq = caminho && (await armazem.lerPrivado(caminho));
    if (!arq) return json(res, 404, { erro: "Comprovante não encontrado." });
    return enviarArquivo(res, arq);
  }

  /** Lê e valida os campos de cadastro que vieram no corpo (só os que vieram). */
  function campos(corpo) {
    const out = {};
    for (const c of TEXTO) {
      if (corpo[c] !== undefined) out[c] = String(corpo[c] ?? "").slice(0, 600).trim();
    }
    if (corpo.vencimento !== undefined) {
      out.vencimento = Math.min(28, Math.max(1, Math.round(Number(corpo.vencimento)) || 10));
    }
    if (corpo.entrouEm !== undefined) {
      if (!dataValida(corpo.entrouEm)) throw Object.assign(new Error("Data de entrada inválida."), { code: 400 });
      out.entrouEm = String(corpo.entrouEm);
    }
    if (corpo.ativo !== undefined) out.ativo = Boolean(corpo.ativo);
    return out;
  }

  /**
   * @returns {Promise<boolean>} true se a rota era daqui (e já foi respondida)
   */
  return async function tratarAlunos(req, res, rota, exigeAdmin) {
    const m = req.method;
    if (!rota.startsWith("/api/aluno")) return false;

    /* ======================= painel do aluno ======================= */

    if (rota === "/api/aluno/login" && m === "POST") {
      if (!senhaPainel) {
        json(res, 503, { erro: "Área do aluno ainda não configurada." });
        return true;
      }
      const origem = origemDe(req);
      if (errosLogin.espera(origem)) {
        json(res, 429, { erro: `Muitas tentativas. Espere ${BLOQUEIO_MIN} minutos e tente de novo.` });
        return true;
      }
      const corpo = await lerCorpo(req, 2_000);
      const login = loginDe(corpo.login);
      const recusa = () => {
        errosLogin.registrar(origem);
        json(res, 401, { erro: "Celular ou senha incorretos." });
      };
      const conta = login ? await armazem.lerConta(login) : null;
      if (!conta) {
        // gasta o mesmo tempo de uma conferência de verdade
        await scrypt(String(corpo.senha ?? ""), Buffer.alloc(16), 32);
        recusa();
        return true;
      }
      if (conta.bloqueadoAte && conta.bloqueadoAte > Date.now()) {
        json(res, 429, {
          erro: `Muitas tentativas. Tente de novo em ${BLOQUEIO_MIN} minutos ou peça uma senha nova ao professor.`,
        });
        return true;
      }
      // a senha temporária é em maiúsculas: quem digitar em minúsculas entra do
      // mesmo jeito, sem gastar duas tentativas
      const digitada = String(corpo.senha ?? "");
      const certa =
        (await confere(digitada, conta.senha)) ||
        (conta.senhaTemporaria && (await confere(digitada.trim().toUpperCase(), conta.senha)));
      if (!certa) {
        const falhas = (conta.falhas || 0) + 1;
        await armazem.gravarConta({
          ...conta,
          falhas: falhas >= MAX_FALHAS ? 0 : falhas,
          bloqueadoAte: falhas >= MAX_FALHAS ? Date.now() + BLOQUEIO_MIN * 60_000 : 0,
        });
        recusa();
        return true;
      }
      const alunos = await alunosDa(conta, true);
      if (!alunos.length) {
        json(res, 403, { erro: "Seu cadastro está inativo. Fale com a academia." });
        return true;
      }
      if (conta.falhas || conta.bloqueadoAte) {
        await armazem.gravarConta({ ...conta, falhas: 0, bloqueadoAte: 0 });
      }
      json(res, 200, { token: abrirSessao(req, res, conta), ...resposta(conta, alunos) });
      return true;
    }

    if (rota === "/api/aluno/sair" && m === "POST") {
      gravarCookie(req, res, COOKIE_ALUNO, "", 0);
      json(res, 200, { ok: true });
      return true;
    }

    if (rota.startsWith("/api/aluno/")) {
      const logado = await sessao(req);
      if (!logado) {
        json(res, 401, { erro: "Entre de novo para continuar." });
        return true;
      }
      const { conta, alunos } = logado;

      /** O aluno da conta a que o pedido se refere: o indicado, ou o único que existe. */
      const escolher = (id) =>
        id ? alunos.find((a) => a.id === id) || null : alunos.length === 1 ? alunos[0] : null;

      if (rota === "/api/aluno/eu" && m === "GET") {
        json(res, 200, resposta(conta, alunos));
        return true;
      }

      if (rota === "/api/aluno/senha" && m === "POST") {
        const corpo = await lerCorpo(req, 2_000);
        const nova = String(corpo.nova ?? "");
        if (nova.length < SENHA_MIN || nova.length > 200) {
          json(res, 400, { erro: `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.` });
          return true;
        }
        // quem ainda está com a temporária acabou de prová-la no login;
        // depois disso, trocar exige a senha atual
        if (!conta.senhaTemporaria && !(await confere(corpo.atual ?? "", conta.senha))) {
          json(res, 400, { erro: "A senha atual não confere." });
          return true;
        }
        if (await confere(nova, conta.senha)) {
          json(res, 400, { erro: "Escolha uma senha diferente da atual." });
          return true;
        }
        const novaConta_ = {
          ...conta,
          senha: await gerarHash(nova),
          senhaTemporaria: false,
          sv: (conta.sv || 0) + 1,
        };
        await armazem.gravarConta(novaConta_);
        json(res, 200, { token: abrirSessao(req, res, novaConta_), ...resposta(novaConta_, alunos) });
        return true;
      }

      if (rota === "/api/aluno/comprovante" && m === "POST") {
        const corpo = await lerCorpo(req, 4_300_000);
        const mes = String(corpo.mes ?? "");
        const d = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(corpo.dataUrl ?? ""));
        const ext = d && TIPOS[d[1]];
        if (!ext) {
          json(res, 400, { erro: "Envie o comprovante em foto (JPG, PNG) ou PDF." });
          return true;
        }
        const aluno = escolher(corpo.alunoId ? String(corpo.alunoId) : "");
        if (!aluno) {
          json(res, 400, { erro: "Diga de qual aluno é o comprovante." });
          return true;
        }
        const linha = mensalidades(aluno).find((x) => x.mes === mes);
        if (!linha) {
          json(res, 400, { erro: "Mensalidade não encontrada." });
          return true;
        }
        if (linha.status === "pago" && linha.conferido) {
          json(res, 400, { erro: "Essa mensalidade já está paga." });
          return true;
        }
        const unico = Date.now().toString(36) + crypto.randomBytes(3).toString("hex");
        const caminho = `comprovantes/${aluno.id}/${mes}-${unico}.${ext}`;
        await armazem.salvarPrivado(caminho, Buffer.from(d[2], "base64"), d[1]);
        const novo = {
          ...aluno,
          pagamentos: {
            ...aluno.pagamentos,
            [mes]: {
              status: "pago",
              conferido: false,
              por: "aluno",
              valor: aluno.valor || "",
              comprovante: caminho,
              enviadoEm: new Date().toISOString(),
            },
          },
        };
        await armazem.gravarAluno(novo);
        // o comprovante anterior deste mês (reenvio) não serve mais: apaga (minimização, LGPD)
        await apagarComprovante(aluno.pagamentos?.[mes]?.comprovante);
        json(res, 201, resposta(conta, alunos.map((a) => (a.id === novo.id ? novo : a))));
        return true;
      }

      // /api/aluno/comprovante/<mês> (conta de um aluno só) ou /<id do aluno>/<mês>
      const meu = rota.match(/^\/api\/aluno\/comprovante\/(?:([0-9a-f-]{36})\/)?(\d{4}-\d{2})$/);
      if (meu && m === "GET") {
        const aluno = escolher(meu[1] || "");
        if (!aluno) json(res, 404, { erro: "Comprovante não encontrado." });
        else await comprovanteDe(res, aluno, meu[2]);
        return true;
      }

      return false;
    }

    /* ===================== painel do professor ===================== */

    if (!rota.startsWith("/api/alunos")) return false;
    if (!exigeAdmin()) return true;

    if (rota === "/api/alunos" && m === "GET") {
      const [alunos, contas] = await Promise.all([armazem.listarAlunos(), armazem.listarContas()]);
      const temporaria = new Map(contas.map((c) => [c.login, Boolean(c.senhaTemporaria)]));
      const porLogin = new Map();
      for (const a of alunos) porLogin.set(a.login, [...(porLogin.get(a.login) || []), a]);
      const lista = alunos.map((a) => ({
        ...visao(a),
        senhaTemporaria: temporaria.get(a.login) ?? false,
        familia: porLogin
          .get(a.login)
          .filter((x) => x.id !== a.id)
          .map((x) => ({ id: x.id, nome: x.nome })),
      }));
      lista.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
      json(res, 200, lista);
      return true;
    }

    if (rota === "/api/alunos" && m === "POST") {
      const corpo = await lerCorpo(req, 20_000);
      const dados = campos(corpo);
      const login = loginDe(dados.whatsapp);
      if (!dados.nome || login.length < 10 || login.length > 11) {
        json(res, 400, { erro: "Informe o nome e o celular com DDD (é o login do aluno)." });
        return true;
      }
      const conta = await armazem.lerConta(login);
      if (conta) {
        const barra = await barraFamilia(conta, dados.nome, Boolean(corpo.familia));
        if (barra) {
          json(res, 409, barra);
          return true;
        }
      }
      const hoje = hojeBR();
      const aluno = {
        id: crypto.randomUUID(),
        criadoEm: new Date().toISOString(),
        vencimento: 10,
        entrouEm: hoje,
        ativo: true,
        ...dados,
        login,
        pagamentos: {},
      };
      // veio de uma inscrição já paga: o mês de entrada nasce quitado
      if (corpo.primeiroMesPago) {
        aluno.pagamentos[aluno.entrouEm.slice(0, 7)] = {
          status: "pago",
          conferido: true,
          por: "professor",
          valor: aluno.valor || "",
          confirmadoEm: new Date().toISOString(),
        };
      }
      await armazem.criarAluno(aluno);
      // celular novo: conta nova com senha temporária. Celular que já tem conta:
      // o aluno entra nela (família) e a senha continua a que a família já usa.
      let temporaria = null;
      if (conta) await armazem.gravarConta({ ...conta, alunos: [...(conta.alunos || []), aluno.id] });
      else temporaria = await novaConta(login, [aluno.id]);
      json(res, 201, { aluno: await paraProfessor(aluno), senhaTemporaria: temporaria });
      return true;
    }

    const alvo = rota.match(/^\/api\/alunos\/([\w-]+)(?:\/(senha|pagamentos|comprovante)(?:\/(\d{4}-\d{2}))?)?$/);
    if (!alvo) return false;
    const [, id, acao, mes] = alvo;
    const aluno = await armazem.lerAluno(id);
    if (!aluno) {
      json(res, 404, { erro: "Aluno não encontrado." });
      return true;
    }

    if (!acao && m === "PATCH") {
      const corpo = await lerCorpo(req, 20_000);
      const dados = campos(corpo);
      const novo = { ...aluno, ...dados };
      if (!novo.nome) {
        json(res, 400, { erro: "O nome não pode ficar vazio." });
        return true;
      }
      let temporaria = null;
      let mudar = null; // o que fazer com as contas, depois de gravar o aluno
      if (dados.whatsapp !== undefined) {
        const login = loginDe(dados.whatsapp);
        if (login.length < 10 || login.length > 11) {
          json(res, 400, { erro: "Celular inválido: use DDD + número." });
          return true;
        }
        if (login !== aluno.login) {
          const origem = await armazem.lerConta(aluno.login);
          const destino = await armazem.lerConta(login);
          if (destino) {
            // o celular novo já tem conta: entra na família de lá
            const barra = await barraFamilia(destino, novo.nome, Boolean(corpo.familia), aluno.id);
            if (barra) {
              json(res, 409, barra);
              return true;
            }
            mudar = async () => {
              await armazem.gravarConta({ ...destino, alunos: [...(destino.alunos || []), aluno.id] });
              await sairDaConta(origem, aluno.id);
            };
          } else if (origem && (origem.alunos || []).length <= 1) {
            // conta só dele: a conta muda de celular e a senha continua a mesma
            mudar = async () => {
              await armazem.gravarConta({ ...origem, login, alunos: [aluno.id] });
              await armazem.apagarConta(origem.login);
            };
          } else {
            // dividia a conta com a família: sai para uma conta própria, com senha nova
            mudar = async () => {
              temporaria = await novaConta(login, [aluno.id]);
              await sairDaConta(origem, aluno.id);
            };
          }
          novo.login = login;
        }
      }
      await armazem.gravarAluno(novo);
      if (mudar) await mudar();
      json(res, 200, { aluno: await paraProfessor(novo), senhaTemporaria: temporaria });
      return true;
    }

    if (!acao && m === "DELETE") {
      await armazem.apagarAluno(aluno);
      await sairDaConta(await armazem.lerConta(aluno.login), aluno.id);
      json(res, 200, { ok: true });
      return true;
    }

    // a senha é da conta: se o aluno divide a conta com a família, vale para todos
    if (acao === "senha" && !mes && m === "POST") {
      const conta = await armazem.lerConta(aluno.login);
      let temporaria;
      if (!conta) {
        temporaria = await novaConta(aluno.login, [aluno.id]);
      } else {
        temporaria = senhaTemporaria();
        await armazem.gravarConta({
          ...conta,
          senha: await gerarHash(temporaria),
          senhaTemporaria: true,
          sv: (conta.sv || 0) + 1,
          falhas: 0,
          bloqueadoAte: 0,
        });
      }
      json(res, 200, { aluno: await paraProfessor(aluno), senhaTemporaria: temporaria });
      return true;
    }

    // "já pago" em lote: meses antigos que o aluno pagou antes do sistema (ou por fora)
    if (acao === "pagamentos" && !mes && m === "PUT") {
      const corpo = await lerCorpo(req, 20_000);
      const pedidos = Array.isArray(corpo.meses) ? [...new Set(corpo.meses.map(String))] : [];
      const atual = hojeBR().slice(0, 7);
      const entrada = String(aluno.entrouEm || "").slice(0, 7);
      if (!pedidos.length || pedidos.length > 600) {
        json(res, 400, { erro: "Diga quais meses marcar como pagos." });
        return true;
      }
      if (pedidos.some((x) => !MES_VALIDO.test(x) || x < entrada || x > atual)) {
        json(res, 400, { erro: "Só dá para marcar meses entre a entrada do aluno e o mês atual." });
        return true;
      }
      const pagamentos = { ...aluno.pagamentos };
      const agora = new Date().toISOString();
      let marcados = 0;
      for (const x of pedidos) {
        if (pagamentos[x]?.status === "pago") continue; // já pago (ou a conferir): não mexe
        pagamentos[x] = {
          ...pagamentos[x],
          status: "pago",
          conferido: true,
          por: "professor",
          valor: pagamentos[x]?.valor || aluno.valor || "",
          confirmadoEm: agora,
        };
        marcados++;
      }
      const novo = { ...aluno, pagamentos };
      if (marcados) await armazem.gravarAluno(novo);
      json(res, 200, { aluno: await paraProfessor(novo), marcados });
      return true;
    }

    if (acao === "pagamentos" && mes && m === "PUT") {
      if (!MES_VALIDO.test(mes)) {
        json(res, 400, { erro: "Mês inválido." });
        return true;
      }
      // só do mês de entrada até um ano à frente: fora disso é erro de digitação
      const [ano, mm] = hojeBR().split("-");
      const limite = `${Number(ano) + 1}-${mm}`;
      if (mes < String(aluno.entrouEm || "").slice(0, 7) || mes > limite) {
        json(res, 400, { erro: "Mês fora do período do aluno." });
        return true;
      }
      const { acao: oque } = await lerCorpo(req, 2_000);
      const pagamentos = { ...aluno.pagamentos };
      const atual = pagamentos[mes];
      const agora = new Date().toISOString();
      if (oque === "pagar") {
        pagamentos[mes] = {
          ...atual,
          status: "pago",
          conferido: true,
          por: atual?.comprovante ? atual.por || "aluno" : "professor",
          valor: atual?.valor || aluno.valor || "",
          confirmadoEm: agora,
        };
      } else if (oque === "confirmar" && atual?.status === "pago") {
        pagamentos[mes] = { ...atual, conferido: true, confirmadoEm: agora };
      } else if (oque === "recusar" && atual) {
        pagamentos[mes] = { ...atual, status: "recusado", conferido: true, confirmadoEm: agora };
      } else if (oque === "reabrir") {
        delete pagamentos[mes];
      } else {
        json(res, 400, { erro: "Ação inválida." });
        return true;
      }
      const novo = { ...aluno, pagamentos };
      await armazem.gravarAluno(novo);
      // baixa desfeita: o comprovante daquele mês deixa de ter uso
      if (oque === "reabrir") await apagarComprovante(atual?.comprovante);
      json(res, 200, { aluno: await paraProfessor(novo) });
      return true;
    }

    if (acao === "comprovante" && mes && m === "GET") {
      await comprovanteDe(res, aluno, mes);
      return true;
    }

    return false;
  };
}
