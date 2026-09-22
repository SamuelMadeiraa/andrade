/**
 * API do painel dentro do servidor do Vite (npm run dev / preview),
 * gravando no disco. No site no ar, a mesma API roda em api/index.js
 * gravando no Vercel Blob. As rotas estão em server/nucleo.js.
 *
 * A senha vem de ADMIN_SENHA no .env.local (fora do git).
 */
import { criarRotas } from "./nucleo.js";
import { armazemLocal } from "./armazem-local.js";

export default function apiAndrade({ senha }) {
  const tratar = criarRotas({ senha, armazem: armazemLocal });

  const rotas = (req, res, next) => {
    const { pathname } = new URL(req.url, "http://localhost");
    if (!pathname.startsWith("/api/")) return next();
    return tratar(req, res, pathname);
  };

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
