import { createContext, useContext, useEffect, useState } from "react";
import padrao from "../data/conteudo.json";

/**
 * Todo o texto do site vem daqui. O padrão é o `src/data/conteudo.json`
 * embutido no build; quando existe a API do painel (/api/conteudo), a versão
 * salva lá substitui — assim o que se edita no /admin aparece sem rebuild.
 */
const Ctx = createContext(padrao);

/** Junta o salvo com o padrão, para que campos novos nunca venham vazios. */
export function mesclar(base, salvo) {
  if (!salvo || typeof salvo !== "object" || Array.isArray(salvo)) return base;
  const out = { ...base };
  for (const k of Object.keys(salvo)) {
    const b = base?.[k];
    out[k] =
      b && typeof b === "object" && !Array.isArray(b) ? mesclar(b, salvo[k]) : salvo[k];
  }
  return out;
}

export function ConteudoProvider({ children, valor }) {
  const [conteudo, setConteudo] = useState(padrao);

  useEffect(() => {
    if (valor || new URLSearchParams(window.location.search).has("previa")) return;
    let vivo = true;
    fetch("/api/conteudo", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && d && setConteudo(mesclar(padrao, d)))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [valor]);

  // dentro do painel (/admin) o site roda num iframe com ?previa e recebe
  // o conteúdo que está sendo editado, antes mesmo de salvar
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("previa")) return;
    const receber = (e) => {
      if (e.origin !== window.location.origin || e.data?.tipo !== "andrade-previa") return;
      setConteudo(mesclar(padrao, e.data.conteudo));
    };
    window.addEventListener("message", receber);
    window.parent?.postMessage({ tipo: "andrade-previa-pronta" }, window.location.origin);
    return () => window.removeEventListener("message", receber);
  }, []);

  const atual = valor || conteudo;

  useEffect(() => {
    if (atual.seo?.titulo) document.title = atual.seo.titulo;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && atual.seo?.descricao) meta.setAttribute("content", atual.seo.descricao);
  }, [atual.seo]);

  return <Ctx.Provider value={atual}>{children}</Ctx.Provider>;
}

export const useConteudo = () => useContext(Ctx);

/** Um campo só conta como preenchido se tiver texto e não for [placeholder]. */
export const ok = (v) => typeof v === "string" && v.trim().length > 0 && !v.includes("[");

export const whatsappLink = (site, msg) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg || site.mensagemWhatsapp || "")}`;

/** Texto com quebras de linha (\n) vira <br /> — usado nos títulos. */
export function Linhas({ texto = "" }) {
  const partes = String(texto).split("\n");
  return partes.map((p, i) => (
    <span key={i}>
      {p}
      {i < partes.length - 1 && <br />}
    </span>
  ));
}

/** Turmas que aparecem na grade, sem repetição (para o formulário). */
export const turmasDaGrade = (horarios) => [
  ...new Set((horarios?.linhas || []).flatMap((l) => l.aulas).filter((a) => ok(a))),
];

export const aulasPorSemana = (horarios) =>
  (horarios?.linhas || []).flatMap((l) => l.aulas).filter((a) => ok(a)).length;

/** Depoimentos que podem ir ao ar: marcados como publicados e com nome e fala. */
export const publicaveis = (sec) =>
  (sec?.itens || []).filter((d) => d.publicado && ok(d.nome) && ok(d.fala));
