import { motion } from "framer-motion";
import Contador from "./Contador";
import { useConteudo, Linhas, aulasPorSemana } from "../conteudo/Conteudo";
import { fadeUp, stagger, inView } from "../motion/variants";
import "./Sobre.css";

export default function Sobre() {
  const { sobre, horarios } = useConteudo();
  return (
    <motion.section
      className="sec sec--bone sobre"
      id="sobre"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      <div className="wrap">
        <motion.p className="eyebrow" variants={fadeUp}>
          {sobre.eyebrow}
        </motion.p>

        <motion.h2 className="sobre__titulo" variants={fadeUp}>
          <Linhas texto={sobre.titulo} />
        </motion.h2>

        <div className="sobre__grid">
          <motion.div className="sobre__texto" variants={fadeUp}>
            <p className="lead">{sobre.lead}</p>
            {sobre.paragrafos.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </motion.div>

          <motion.ul className="sobre__numeros" variants={stagger}>
            {sobre.numeros.map((n, i) => (
              <motion.li key={i} variants={fadeUp}>
                <span className="sobre__valor">
                  <Contador
                    valor={n.valor === "auto" ? String(aulasPorSemana(horarios)) : n.valor}
                    sufixo={n.sufixo}
                  />
                </span>
                <span className="sobre__label">{n.label}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    </motion.section>
  );
}
