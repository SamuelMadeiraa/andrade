import { motion } from "framer-motion";
import Contador from "./Contador";
import { numeros } from "../data/site";
import { fadeUp, stagger, inView } from "../motion/variants";
import "./Sobre.css";

export default function Sobre() {
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
          A filosofia
        </motion.p>

        <motion.h2 className="sobre__titulo" variants={fadeUp}>
          Faixa não se ganha.<br />Se sobrevive a ela.
        </motion.h2>

        <div className="sobre__grid">
          <motion.div className="sobre__texto" variants={fadeUp}>
            <p className="lead">
              Aqui o tatame é honesto: ou você evolui, ou o tatame te ensina. Não
              existe atalho, não existe graduação de cortesia e não existe aluno
              treinando sozinho num canto da sala.
            </p>
            <p>
              A Andrade BJJ funciona como uma equipe de verdade — faixa-preta corrige
              faixa-branca, faixa-branca puxa quem chegou ontem. A hierarquia não é
              vaidade: é o método. Cada graduação aqui vale porque foi disputada no
              treino, não entregue no fim do ano.
            </p>
            <p>
              Você vai chegar cansado, vai apanhar no começo e vai voltar no dia
              seguinte. É assim que se constrói jogo — e é assim que a gente treina
              desde o primeiro dia.
            </p>
          </motion.div>

          <motion.ul className="sobre__numeros" variants={stagger}>
            {numeros.map((n) => (
              <motion.li key={n.label} variants={fadeUp}>
                <span className="sobre__valor">
                  <Contador valor={n.valor} sufixo={n.sufixo} />
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
