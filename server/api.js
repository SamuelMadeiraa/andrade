/**
 * API do painel dentro do servidor do Vite (npm run dev / preview),
 * gravando no disco. No site no ar, a mesma API roda em api/index.js
 * gravando no Vercel Blob. As rotas estão em server/nucleo.js.
 *
 * A senha vem de ADMIN_SENHA no .env.local (fora do git).
 */
import fs from "node:fs";
import { criarRotas } from "./nucleo.js";
import { armazemLocal } from "./armazem-local.js";

export default function apiAndrade({ senha }) {
  const tratar = criarRotas({ senha, armazem: armazemLocal });

  const rotas = (req, res, next) => {
    const { pathname } = new URL(req.url, "http://localhost");
    if (!pathname.startsWith("/api/")) return next();
    return tratar(req, res, pathname);
  };

  // na prévia do build (npm run preview) valem os mesmos cabeçalhos de segurança
  // do site no ar (vercel.json): se a CSP bloquear algo, aparece antes de publicar.
  // No `npm run dev` não: o Vite usa scripts que a CSP de produção barraria.
  const cabecalhos = (req, res, next) => {
    try {
      const { headers = [] } = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
      for (const regra of headers) {
        if (regra.source === "/(.*)") for (const h of regra.headers) res.setHeader(h.key, h.value);
      }
    } catch {
      /* sem vercel.json: segue sem os cabeçalhos */
    }
    next();
  };

  return {
    name: "andrade-api",
    configureServer(server) {
      server.middlewares.use(rotas);
    },
    configurePreviewServer(server) {
      server.middlewares.use(cabecalhos);
      server.middlewares.use(rotas);
    },
  };
}
