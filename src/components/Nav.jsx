import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Marca from "./Marca";
import { useConteudo, whatsappLink } from "../conteudo/Conteudo";
import { EASE } from "../motion/variants";
import "./Nav.css";

export default function Nav() {
  const { site, menu } = useConteudo();
  const navLinks = menu.links;
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className={`nav ${solid ? "nav--solid" : ""}`}>
        <a href="#hero" className="nav__brand" aria-label={`${site.nome} — início`}>
          <Marca size={40} on="ink" />
          <span className="nav__wordmark">
            Andrade<span className="nav__bjj">BJJ</span>
          </span>
        </a>

        <nav className="nav__links" aria-label="Navegação principal">
          {navLinks.map((l, i) => (
            <a key={i} href={l.href} className="nav__link">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav__actions">
          <a
            className="btn nav__cta"
            href={whatsappLink(site)}
            target="_blank"
            rel="noreferrer"
          >
            <span>{menu.botao}</span>
          </a>
          <button
            className="nav__burger"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="menu"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <button
              className="menu__close"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={28} strokeWidth={1.5} />
            </button>

            <ul className="menu__list">
              {navLinks.map((l, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: EASE }}
                >
                  <a href={l.href} onClick={() => setOpen(false)}>
                    {l.label}
                  </a>
                </motion.li>
              ))}
            </ul>

            <a
              className="btn menu__cta"
              href={whatsappLink(site)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
            >
              <span>{menu.botaoMenuCelular}</span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
