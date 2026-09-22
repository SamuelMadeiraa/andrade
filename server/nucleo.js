/**
 * Rotas da API do painel — as mesmas no computador (Vite) e no site no ar
 * (função da Vercel). Só muda onde os dados ficam guardados (`armazem`):
 * disco local em dev, Vercel Blob privado em produção.
 *
 *   GET    /api/conteudo           público   conteúdo atual do site
 *   PUT    /api/conteudo           admin     salva o conteúdo (+ backup)
 *   POST   /api/login              admin     confere a senha
 *   POST   /api/inscricoes         público   nova inscrição de aluno
 *   GET    /api/inscricoes         admin     lista as inscrições
 *   PATCH  /api/inscricoes/:id     admin     muda status (pendente/pago/cancelado)
 *   DELETE /api/inscricoes/:id     admin     apaga uma inscrição
 *   POST   /api/upload             admin     envia imagem
 *   GET    /api/arquivo/:nome      público   serve imagem enviada (só no Blob)
 */
import crypto from "node:crypto";

const STATUS = ["pendente", "pago", "cancelado"];
const CAMPOS = [
  "nome",
  "nascimento",
  "whatsapp",
  "email",
  "turma",
  "plano",
  "valor",
  "responsavel",
  "experiencia",
  "saude",
];

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

const erro = (code, msg) => Object.assign(new Error(msg), { code });

function lerCorpo(req, limite) {
  // na Vercel o corpo JSON às vezes já vem lido em req.body
  if (req.body !== undefined && req.body !== null && req.body !== "") {
    const b = req.body;
    if (typeof b === "object" && !Buffer.isBuffer(b)) return Promise.resolve(b);
    const txt = Buffer.isBuffer(b) ? b.toString("utf8") : String(b);
    if (txt.length > limite) return Promise.reject(erro(413, "Arquivo grande demais"));
    try {
      return Promise.resolve(JSON.parse(txt));
    } catch {
      return Promise.reject(erro(400, "JSON inválido"));
    }
  }
  return new Promise((resolve, reject) => {
    let tam = 0;
    const partes = [];
    req.on("data", (c) => {
      tam += c.length;
      if (tam > limite) {
        reject(erro(413, "Arquivo grande demais"));
        req.destroy();
      } else partes.push(c);
    });
    req.on("end", () => {
      try {
        const txt = Buffer.concat(partes).toString("utf8");
        resolve(txt ? JSON.parse(txt) : {});
      } catch {
        reject(erro(400, "JSON inválido"));
      }
    });
    req.on("error", reject);
  });
}

const hash = (s) => crypto.createHash("sha256").update(String(s)).digest();

export const nomeDeArquivo = (nome, ext) => {
  const base =
    String(nome)
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "imagem";
  return `${base}-${Date.now().toString(36)}.${ext}`;
};

/**
 * @param {{ senha?: string, armazem: object }} opcoes
 * @returns {(req, res, rota: string) => Promise<void>}
 */
export function criarRotas({ senha, armazem }) {
  const autorizado = (req) =>
    Boolean(senha) &&
    crypto.timingSafeEqual(hash(req.headers["x-admin-senha"] || ""), hash(senha));

  return async function tratar(req, res, rotaBruta) {
    const rota = "/" + String(rotaBruta).replace(/^\/+|\/+$/g, "");
    const m = req.method;

    const exigeAdmin = () => {
      if (!senha) {
        json(res, 503, { erro: "Senha do painel não configurada (ADMIN_SENHA)." });
        return false;
      }
      if (!autorizado(req)) {
        json(res, 401, { erro: "Senha incorreta." });
        return false;
      }
      return true;
    };

    try {
      // ---------- conteúdo ----------
      if (rota === "/api/conteudo" && m === "GET") {
        const dados = (await armazem.lerConteudo()) || {};
        json(res, 200, dados);
        return;
      }
      if (rota === "/api/conteudo" && m === "PUT") {
        if (!exigeAdmin()) return;
        const novo = await lerCorpo(req, 2_000_000);
        if (!novo || typeof novo !== "object" || Array.isArray(novo) || !novo.site) {
          return json(res, 400, { erro: "Conteúdo inválido." });
        }
        await armazem.gravarConteudo(novo);
        return json(res, 200, { ok: true });
      }

      if (rota === "/api/login" && m === "POST") {
        if (!exigeAdmin()) return;
        return json(res, 200, { ok: true });
      }

      // ---------- inscrições ----------
      if (rota === "/api/inscricoes" && m === "POST") {
        const corpo = await lerCorpo(req, 20_000);
        // campo escondido no formulário: só robô preenche
        if (corpo.empresa) return json(res, 201, { ok: true });
        const nova = {
          id: crypto.randomUUID(),
          criadaEm: new Date().toISOString(),
          status: "pendente",
        };
        for (const c of CAMPOS) nova[c] = String(corpo[c] ?? "").slice(0, 600).trim();
        if (!nova.nome || !nova.whatsapp) {
          return json(res, 400, { erro: "Nome e WhatsApp são obrigatórios." });
        }
        await armazem.criarInscricao(nova);
        return json(res, 201, { ok: true, id: nova.id });
      }
      if (rota === "/api/inscricoes" && m === "GET") {
        if (!exigeAdmin()) return;
        const lista = await armazem.listarInscricoes();
        lista.sort((a, b) => String(b.criadaEm).localeCompare(String(a.criadaEm)));
        return json(res, 200, lista);
      }
      const alvo = rota.match(/^\/api\/inscricoes\/([\w-]+)$/);
      if (alvo && (m === "PATCH" || m === "DELETE")) {
        if (!exigeAdmin()) return;
        if (m === "DELETE") {
          const ok = await armazem.apagarInscricao(alvo[1]);
          return ok ? json(res, 200, { ok: true }) : json(res, 404, { erro: "Inscrição não encontrada." });
        }
        const { status } = await lerCorpo(req, 2_000);
        if (!STATUS.includes(status)) return json(res, 400, { erro: "Status inválido." });
        const ok = await armazem.atualizarInscricao(alvo[1], { status });
        return ok ? json(res, 200, { ok: true }) : json(res, 404, { erro: "Inscrição não encontrada." });
      }

      // ---------- imagens ----------
      if (rota === "/api/upload" && m === "POST") {
        if (!exigeAdmin()) return;
        const { nome = "imagem", dataUrl = "" } = await lerCorpo(req, 4_000_000);
        const d = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
        if (!d) return json(res, 400, { erro: "Envie uma imagem PNG, JPG, WEBP ou GIF." });
        const ext = d[1] === "jpeg" ? "jpg" : d[1];
        const url = await armazem.salvarImagem(
          nomeDeArquivo(nome, ext),
          Buffer.from(d[2], "base64"),
          `image/${d[1] === "jpg" ? "jpeg" : d[1]}`
        );
        return json(res, 201, { url });
      }
      const arq = rota.match(/^\/api\/arquivo\/([\w.-]+)$/);
      if (arq && m === "GET" && armazem.lerImagem) {
        const img = await armazem.lerImagem(arq[1]);
        if (!img) return json(res, 404, { erro: "Imagem não encontrada." });
        res.statusCode = 200;
        res.setHeader("Content-Type", img.contentType);
        // nomes de arquivo são únicos: pode guardar em cache para sempre
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.end(img.dados);
      }

      return json(res, 404, { erro: "Rota não encontrada." });
    } catch (e) {
      console.error("[api]", e);
      const conhecido = [400, 413, 503].includes(e.code);
      return json(res, conhecido ? e.code : 500, {
        erro: conhecido ? e.message : "Erro interno. Tente de novo.",
      });
    }
  };
}
