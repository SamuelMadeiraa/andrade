/**
 * API do painel /admin — roda dentro do servidor do Vite (npm run dev / preview).
 *
 *   GET    /api/conteudo           público   conteúdo atual do site
 *   PUT    /api/conteudo           admin     salva src/data/conteudo.json (+ backup)
 *   POST   /api/login              admin     confere a senha
 *   POST   /api/inscricoes         público   nova inscrição de aluno
 *   GET    /api/inscricoes         admin     lista as inscrições
 *   PATCH  /api/inscricoes/:id     admin     muda status (pendente/pago/cancelado)
 *   DELETE /api/inscricoes/:id     admin     apaga uma inscrição
 *   POST   /api/upload             admin     envia imagem para public/uploads
 *
 * A senha vem de ADMIN_SENHA no .env.local (fora do git).
 * Inscrições ficam em data/inscricoes.json — também fora do git, porque têm
 * dados pessoais dos alunos.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const CONTEUDO = path.join(ROOT, "src/data/conteudo.json");
const DADOS = path.join(ROOT, "data");
const INSCRICOES = path.join(DADOS, "inscricoes.json");
const BACKUPS = path.join(DADOS, "backups");
const UPLOADS = path.join(ROOT, "public/uploads");

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

function lerCorpo(req, limite) {
  return new Promise((resolve, reject) => {
    let tam = 0;
    const partes = [];
    req.on("data", (c) => {
      tam += c.length;
      if (tam > limite) {
        reject(Object.assign(new Error("Arquivo grande demais"), { code: 413 }));
        req.destroy();
      } else partes.push(c);
    });
    req.on("end", () => {
      try {
        const txt = Buffer.concat(partes).toString("utf8");
        resolve(txt ? JSON.parse(txt) : {});
      } catch {
        reject(Object.assign(new Error("JSON inválido"), { code: 400 }));
      }
    });
    req.on("error", reject);
  });
}

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

const hash = (s) => crypto.createHash("sha256").update(String(s)).digest();

export default function apiAndrade({ senha }) {
  const autorizado = (req) =>
    Boolean(senha) &&
    crypto.timingSafeEqual(hash(req.headers["x-admin-senha"] || ""), hash(senha));

  async function rotas(req, res, next) {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/")) return next();
    const rota = url.pathname.replace(/\/+$/, "");
    const m = req.method;

    const exigeAdmin = () => {
      if (!senha) {
        json(res, 503, { erro: "Defina ADMIN_SENHA no arquivo .env.local e reinicie o servidor." });
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
        return json(res, 200, await lerJson(CONTEUDO, {}));
      }
      if (rota === "/api/conteudo" && m === "PUT") {
        if (!exigeAdmin()) return;
        const novo = await lerCorpo(req, 2_000_000);
        if (!novo || typeof novo !== "object" || Array.isArray(novo) || !novo.site) {
          return json(res, 400, { erro: "Conteúdo inválido." });
        }
        const atual = await fs.readFile(CONTEUDO, "utf8").catch(() => null);
        if (atual) {
          const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
          await fs.mkdir(BACKUPS, { recursive: true });
          await fs.writeFile(path.join(BACKUPS, `conteudo-${carimbo}.json`), atual);
        }
        await gravarJson(CONTEUDO, novo);
        return json(res, 200, { ok: true });
      }

      if (rota === "/api/login" && m === "POST") {
        if (!exigeAdmin()) return;
        return json(res, 200, { ok: true });
      }

      // ---------- inscrições ----------
      if (rota === "/api/inscricoes" && m === "POST") {
        const corpo = await lerCorpo(req, 20_000);
        const nova = { id: crypto.randomUUID(), criadaEm: new Date().toISOString(), status: "pendente" };
        for (const c of CAMPOS) nova[c] = String(corpo[c] ?? "").slice(0, 600).trim();
        if (!nova.nome || !nova.whatsapp) {
          return json(res, 400, { erro: "Nome e WhatsApp são obrigatórios." });
        }
        const lista = await lerJson(INSCRICOES, []);
        lista.unshift(nova);
        await gravarJson(INSCRICOES, lista);
        return json(res, 201, { ok: true, id: nova.id });
      }
      if (rota === "/api/inscricoes" && m === "GET") {
        if (!exigeAdmin()) return;
        return json(res, 200, await lerJson(INSCRICOES, []));
      }
      const alvo = rota.match(/^\/api\/inscricoes\/([\w-]+)$/);
      if (alvo && (m === "PATCH" || m === "DELETE")) {
        if (!exigeAdmin()) return;
        const lista = await lerJson(INSCRICOES, []);
        const i = lista.findIndex((x) => x.id === alvo[1]);
        if (i < 0) return json(res, 404, { erro: "Inscrição não encontrada." });
        if (m === "DELETE") lista.splice(i, 1);
        else {
          const { status } = await lerCorpo(req, 2_000);
          if (!STATUS.includes(status)) return json(res, 400, { erro: "Status inválido." });
          lista[i].status = status;
        }
        await gravarJson(INSCRICOES, lista);
        return json(res, 200, { ok: true });
      }

      // ---------- imagens ----------
      if (rota === "/api/upload" && m === "POST") {
        if (!exigeAdmin()) return;
        const { nome = "imagem", dataUrl = "" } = await lerCorpo(req, 12_000_000);
        const d = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
        if (!d) return json(res, 400, { erro: "Envie uma imagem PNG, JPG, WEBP ou GIF." });
        const ext = d[1] === "jpeg" ? "jpg" : d[1];
        const base =
          String(nome)
            .replace(/\.[^.]+$/, "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 40) || "imagem";
        const arquivo = `${base}-${Date.now().toString(36)}.${ext}`;
        await fs.mkdir(UPLOADS, { recursive: true });
        await fs.writeFile(path.join(UPLOADS, arquivo), Buffer.from(d[2], "base64"));
        return json(res, 201, { url: `/uploads/${arquivo}` });
      }

      return json(res, 404, { erro: "Rota não encontrada." });
    } catch (e) {
      return json(res, e.code === 413 ? 413 : e.code === 400 ? 400 : 500, {
        erro: e.message || "Erro interno.",
      });
    }
  }

  return {
    name: "andrade-api",
    configureServer(server) {
      server.middlewares.use(rotas);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rotas);
    },
  };
}
