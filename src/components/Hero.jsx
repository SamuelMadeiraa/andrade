import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import Marca from "./Marca";
import { whatsappLink, site } from "../data/site";
import { EASE, EASE_OUT, wordReveal } from "../motion/variants";
import "./Hero.css";

const TITULO = ["Na", "Andrade,", "ninguém", "treina", "sozinho."];

export default function Hero() {
  return (
    <section className="hero sec--ink on-ink" id="hero">
      <div className="hero__inner wrap">
        <motion.p
          className="hero__eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: EASE }}
        >
          Jiu-Jitsu · {site.bairro}, {site.cidade}
        </motion.p>

        {/* ---- o lobo + o anel de grega que se desenha ---- */}
        <div className="hero__marca">
          <motion.div
            initial={{ scale: 1.06, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
          >
            <Marca size={"100%"} on="ink" alt="Brasão da Andrade BJJ: lobo dentro da grega" />
          </motion.div>

          <svg className="hero__ring" viewBox="0 0 200 200" aria-hidden="true">
            <motion.circle
              cx="100"
              cy="100"
              r="96"
              fill="none"
              stroke="var(--line-i)"
              strokeWidth="0.75"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.8, ease: EASE_OUT, delay: 0.2 }}
              style={{ rotate: -90, transformOrigin: "center" }}
            />
            <motion.circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="var(--bone)"
              strokeWidth="0.75"
              strokeDasharray="2 8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45, rotate: 360 }}
              transition={{
                opacity: { duration: 1.2, delay: 0.8 },
                rotate: { duration: 90, repeat: Infinity, ease: "linear" },
              }}
              style={{ transformOrigin: "center" }}
            />
          </svg>
        </div>

        <h1 className="hero__title">
          {TITULO.map((w, i) => (
            <span className="hero__word" key={i}>
              <motion.span
                variants={wordReveal}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.45 + i * 0.08, duration: 0.8, ease: EASE_OUT }}
                style={{ display: "block" }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          className="hero__sub"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8, ease: EASE }}
        >
          Você entra pra uma equipe: hierarquia, lealdade e evolução — faixa por faixa.
        </motion.p>

        <motion.div
          className="hero__cta"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.8, ease: EASE }}
        >
          <a className="btn" href={whatsappLink()} target="_blank" rel="noreferrer">
            <span>Agendar aula experimental</span>
          </a>
        </motion.div>
      </div>

      <motion.a
        href="#sobre"
        className="hero__scroll"
        aria-label="Ir para a próxima seção"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
      >
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown size={18} strokeWidth={1.5} />
        </motion.span>
        <span className="hero__scrollTxt">Role</span>
      </motion.a>
    </section>
  );
}
