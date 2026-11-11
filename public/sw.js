// Service worker dos apps instaláveis (área do aluno e painel do professor).
// O mesmo arquivo é registrado duas vezes, com escopos /aluno e /admin.
//
// Regras:
// - /api/* NUNCA passa pelo cache: são dados pessoais (LGPD) e sessão por cookie.
// - Páginas: rede primeiro; sem internet, mostra a última versão guardada.
// - /assets/* (arquivos do Vite, com hash no nome): cache primeiro.
// - Outros domínios (Google Fonts): o navegador resolve sozinho.

const VERSAO = "v1";
const CACHE = `andrade-${new URL(self.registration.scope).pathname.replace(/\W/g, "") || "raiz"}-${VERSAO}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const prefixo = CACHE.slice(0, CACHE.lastIndexOf("-"));
      for (const nome of await caches.keys()) {
        if (nome.startsWith(prefixo) && nome !== CACHE) await caches.delete(nome);
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const resp = await fetch(req);
          if (resp.ok) cache.put(url.pathname, resp.clone());
          return resp;
        } catch {
          return (await cache.match(url.pathname)) || Response.error();
        }
      })()
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icones/")) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const guardado = await cache.match(req);
        if (guardado) return guardado;
        const resp = await fetch(req);
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
      })()
    );
  }
});
