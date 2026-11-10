/**
 * Sessões em cookie (professor e aluno).
 *
 * O cookie é HttpOnly (o JavaScript da página não lê), SameSite=Strict (outro
 * site não consegue usá-lo) e, no site no ar, Secure (só HTTPS). O conteúdo é
 * assinado com HMAC: quem não tem o segredo não consegue fabricar nem alterar.
 *
 * O segredo vem de SESSAO_SEGREDO; sem ela, é derivado de ADMIN_SENHA (aí trocar
 * a senha do painel derruba todas as sessões).
 */
import crypto from "node:crypto";

export const COOKIE_ADMIN = "andrade_admin";
export const COOKIE_ALUNO = "andrade_aluno";
export const SESSAO_ADMIN_HORAS = 8;

const b64 = (s) => Buffer.from(s).toString("base64url");

export function criarAssinador(senhaPainel) {
  const segredo = () =>
    crypto
      .createHash("sha256")
      .update("andrade-sessao-aluno|" + (process.env.SESSAO_SEGREDO || senhaPainel))
      .digest();
  const assinar = (corpo) => crypto.createHmac("sha256", segredo()).update(corpo).digest("base64url");

  return {
    /** Token "<dados>.<assinatura>". */
    criar(dados) {
      const corpo = b64(JSON.stringify(dados));
      return `${corpo}.${assinar(corpo)}`;
    },
    /** Os dados do token, se a assinatura confere e não venceu; senão null. */
    ler(token) {
      const m = /^([\w-]+)\.([\w-]+)$/.exec(String(token || ""));
      if (!m || !senhaPainel) return null;
      const esperado = Buffer.from(assinar(m[1]));
      const veio = Buffer.from(m[2]);
      if (esperado.length !== veio.length || !crypto.timingSafeEqual(esperado, veio)) return null;
      try {
        const dados = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8"));
        return dados && dados.exp > Date.now() ? dados : null;
      } catch {
        return null;
      }
    },
  };
}

/** Valor de um cookie do pedido. */
export function lerCookie(req, nome) {
  for (const parte of String(req.headers.cookie || "").split(";")) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i).trim() === nome) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return "";
}

const https = (req) =>
  String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https" || Boolean(req.socket?.encrypted);

/** Grava (ou, com valor vazio, apaga) um cookie de sessão. */
export function gravarCookie(req, res, nome, valor, segundos) {
  const partes = [
    `${nome}=${valor ? encodeURIComponent(valor) : ""}`,
    "Path=/api",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${valor ? Math.floor(segundos) : 0}`,
  ];
  if (https(req)) partes.push("Secure");
  const antes = res.getHeader("Set-Cookie");
  res.setHeader("Set-Cookie", [...(antes ? [].concat(antes) : []), partes.join("; ")]);
}

/**
 * Pedido que muda dados vindo de outro site? O navegador sempre manda Origin
 * nesses casos; scripts e testes (sem Origin) passam.
 */
export function deOutroSite(req) {
  if (req.method === "GET" || req.method === "HEAD") return false;
  const origem = req.headers.origin;
  if (!origem) return false;
  try {
    return new URL(origem).host !== req.headers.host;
  } catch {
    return true;
  }
}

/** Impressão curta da senha do painel: trocar a senha invalida as sessões do professor. */
export const digitalDaSenha = (senha) =>
  crypto.createHash("sha256").update("andrade-painel|" + String(senha)).digest("hex").slice(0, 16);
