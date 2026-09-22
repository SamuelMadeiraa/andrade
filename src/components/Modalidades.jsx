import { motion } from "framer-motion";
import GregaDivider from "./GregaDivider";
import { useConteudo } from "../conteudo/Conteudo";
import { fadeUp, stagger, inView } from "../motion/variants";
import "./Modalidades.css";

export default function Modalidades() {
  const { modalidades } = useConteudo();
  return (
    <motion.section
      className="sec sec--ink on-ink modalidades"
      id="modalidades"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      <div className="wrap">
        <motion.p className="eyebrow" variants={fadeUp}>
          {modalidades.eyebrow}
        </motion.p>
        <motion.h2 className="modalidades__titulo" variants={fadeUp}>
          {modalidades.titulo}
        </motion.h2>

        <motion.ul className="modalidades__grid" variants={stagger}>
          {modalidades.itens.map((m, i) => (
            <motion.li
              key={i}
              className="card"
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="card__num">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="card__nome">{m.nome}</h3>
              <span className="card__idade">{m.idade}</span>
              <p className="card__texto">{m.texto}</p>
              <div className="card__grega">
                <GregaDivider dark height={12} animate={false} />
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </motion.section>
  );
}
