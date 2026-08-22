import { motion } from "framer-motion";
import { dias, horarios, site } from "../data/site";
import { fadeUp, stagger, inView } from "../motion/variants";
import "./Horarios.css";

export default function Horarios() {
  return (
    <motion.section
      className="sec sec--ink on-ink horarios"
      id="horarios"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      <div className="wrap">
        <motion.p className="eyebrow" variants={fadeUp}>
          Grade semanal
        </motion.p>
        <motion.h2 className="horarios__titulo" variants={fadeUp}>
          O tatame te espera<br />seis dias por semana.
        </motion.h2>

        <motion.div className="horarios__scroll" variants={fadeUp}>
          <table className="grade">
            <caption className="sr-only">
              Grade de horários semanal da {site.nome}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="grade__hora">
                  Hora
                </th>
                {dias.map((d) => (
                  <th key={d} scope="col">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horarios.map((linha) => (
                <tr key={linha.hora}>
                  <th scope="row" className="grade__hora">
                    {linha.hora}
                  </th>
                  {linha.aulas.map((a, i) => (
                    <td key={i} className={a ? "tem" : "vazio"}>
                      {a || <span aria-label="sem aula">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.p className="horarios__nota" variants={fadeUp}>
          Sábado é open mat: chega quem quiser, treina quem aguentar. Feriados e
          seletivas são avisados no {" "}
          <a href={site.instagram} target="_blank" rel="noreferrer">
            {site.instagramHandle}
          </a>
          .
        </motion.p>
      </div>
    </motion.section>
  );
}
