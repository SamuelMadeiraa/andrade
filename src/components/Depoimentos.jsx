import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import Marca from "./Marca";
import { depoimentosPublicaveis as depoimentos } from "../data/site";
import { fadeUp, stagger, inView, EASE } from "../motion/variants";
import "./Depoimentos.css";

export default function Depoimentos() {
  const [[i, dir], setEstado] = useState([0, 0]);
  const total = depoimentos.length;
  const atual = depoimentos[i];

  const ir = (d) => setEstado([(i + d + total) % total, d]);

  return (
    <motion.section
      className="sec sec--ink on-ink depo"
      id="depoimentos"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      <div className="wrap">
        <motion.p className="eyebrow" variants={fadeUp}>
          Quem treina aqui
        </motion.p>

        <motion.div
          className="depo__palco"
          variants={fadeUp}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") ir(1);
            if (e.key === "ArrowLeft") ir(-1);
          }}
          tabIndex={0}
          role="group"
          aria-roledescription="carrossel"
          aria-label="Depoimentos de alunos"
        >
          <Quote className="depo__aspas" size={48} strokeWidth={1} aria-hidden="true" />

          <AnimatePresence mode="wait" custom={dir}>
            <motion.figure
              key={i}
              className="depo__item"
              custom={dir}
              initial={{ opacity: 0, x: dir >= 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir >= 0 ? -40 : 40 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <div className="depo__foto">
                {atual.foto ? (
                  <img className="ph" src={atual.foto} alt={`Foto de ${atual.nome}`} />
                ) : (
                  <Marca size={64} on="ink" />
                )}
              </div>

              <blockquote className="depo__fala">"{atual.fala}"</blockquote>

              <figcaption className="depo__autor">
                <span className="depo__nome">{atual.nome}</span>
                <span className="depo__faixa">{atual.faixa}</span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>

          <div className="depo__controles">
            <button onClick={() => ir(-1)} aria-label="Depoimento anterior">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>

            <div className="depo__dots" role="tablist">
              {depoimentos.map((_, k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={k === i}
                  aria-label={`Depoimento ${k + 1} de ${total}`}
                  className={k === i ? "on" : ""}
                  onClick={() => setEstado([k, k > i ? 1 : -1])}
                />
              ))}
            </div>

            <button onClick={() => ir(1)} aria-label="Próximo depoimento">
              <ArrowRight size={20} strokeWidth={1.5} />
            </button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
