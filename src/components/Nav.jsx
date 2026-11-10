import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User } from "lucide-react";
import Marca from "./Marca";
import { useConteudo } from "../conteudo/Conteudo";

// o menu acompanha as seções que existem na página
const LINKS = [
  { id: "sobre", label: "A academia" },
  { id: "turmas", label: "Turmas" },
  { id: "horarios", label: "Horários" },
  { id: "planos", label: "Planos" },
  { id: "contato", label: "Contato" },
];

export default function Nav() {
  const { site } = useConteudo();
  const [solido, setSolido] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState("");

  useEffect(() => {
    const aoRolar = () => setSolido(window.scrollY > 24);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  // marca no menu a seção que está na tela
  useEffect(() => {
    const alvos = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean);
    if (!alvos.length || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setAtivo(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    alvos.forEach((a) => obs.observe(a));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    const esc = (e) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <>
      <header className={`nav ${solido ? "nav--solido" : ""}`}>
        <div className="nav__dentro">
          <a href="#inicio" className="nav__marca" aria-label={`${site.nome} — início`}>
            <Marca size={42} on="ink" />
            <span className="nav__nome">
              Andrade <small>Jiu-Jitsu</small>
            </span>
          </a>

          <nav className="nav__links" aria-label="Navegação principal">
            {LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                className={ativo === l.id ? "is-ativo" : ""}
                aria-current={ativo === l.id ? "true" : undefined}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="nav__acoes">
            <a className="nav__aluno" href="/aluno">
              <User size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Área do aluno</span>
            </a>
            <a className="botao botao--claro botao--p nav__cta" href="#matricula">
              Matricule-se
            </a>
            <button
              className="nav__burger"
              onClick={() => setAberto(true)}
              aria-label="Abrir menu"
              aria-expanded={aberto}
            >
              <Menu size={24} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {aberto && (
          <motion.div
            className="menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <button className="menu__fechar" onClick={() => setAberto(false)} aria-label="Fechar menu">
              <X size={26} strokeWidth={1.75} />
            </button>

            <ul className="menu__lista">
              {LINKS.map((l, i) => (
                <motion.li
                  key={l.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, duration: 0.4 }}
                >
                  <a href={`#${l.id}`} onClick={() => setAberto(false)}>
                    {l.label}
                  </a>
                </motion.li>
              ))}
            </ul>

            <div className="menu__acoes">
              <a className="botao botao--claro" href="#matricula" onClick={() => setAberto(false)}>
                Matricule-se
              </a>
              <a className="botao botao--contorno-claro" href="/aluno">
                <User size={16} strokeWidth={1.75} aria-hidden="true" />
                Área do aluno
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
