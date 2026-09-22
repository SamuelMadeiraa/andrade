import { motion } from "framer-motion";
import { useConteudo, Linhas } from "../conteudo/Conteudo";
import { fadeUp, stagger, inView } from "../motion/variants";
import "./Horarios.css";

export default function Horarios() {
  const { site, horarios: sec } = useConteudo();
  const { dias, linhas: horarios } = sec;
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
          {sec.eyebrow}
        </motion.p>
        <motion.h2 className="horarios__titulo" variants={fadeUp}>
          <Linhas texto={sec.titulo} />
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
                {dias.map((d, i) => (
                  <th key={i} scope="col">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horarios.map((linha, li) => (
                <tr key={li}>
                  <th scope="row" className="grade__hora">
                    {linha.hora}
                  </th>
                  {dias.map((_, i) => linha.aulas[i]).map((a, i) => (
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
          {sec.nota}{" "}
          <a href={site.instagram} target="_blank" rel="noreferrer">
            {site.instagramHandle}
          </a>
          .
        </motion.p>
      </div>
    </motion.section>
  );
}
