import { motion } from "framer-motion";
import Marca from "./Marca";
import { useConteudo, ok, Linhas } from "../conteudo/Conteudo";
import { corDaFaixa } from "../lib/faixas";
import { fadeUp, stagger, inView } from "../motion/variants";
import "./Professores.css";

/** Barra de faixa na cor escolhida no painel (ou deduzida do texto). Ponteira + graus. */
function Faixa({ professor }) {
  const texto = professor.faixa || "";
  const cor = corDaFaixa(professor);
  const graus = Number((texto.match(/(\d+)\s*º/) || [])[1] || 0);
  return (
    <span
      className={`faixa ${cor?.escura ? "faixa--escura" : ""} ${
        cor?.id === "coral" ? "faixa--coral" : ""
      }`}
      style={cor ? { "--faixa-cor": cor.hex } : undefined}
      aria-hidden="true"
    >
      <span className="faixa__ponteira">
        {Array.from({ length: Math.min(graus, 6) }).map((_, i) => (
          <i key={i} />
        ))}
      </span>
    </span>
  );
}

export default function Professores() {
  const { professores: sec } = useConteudo();
  const professores = sec.itens;
  return (
    <motion.section
      className="sec sec--bone professores"
      id="professor"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      <div className="wrap">
        <motion.p className="eyebrow" variants={fadeUp}>
          {sec.eyebrow}
        </motion.p>
        <motion.h2 className="professores__titulo" variants={fadeUp}>
          <Linhas texto={sec.titulo} />
        </motion.h2>
        <motion.p className="lead professores__lead" variants={fadeUp}>
          {sec.lead}
        </motion.p>

        <motion.ul
          className={`professores__grid ${
            professores.length === 1 ? "professores__grid--solo" : ""
          }`}
          variants={stagger}
        >
          {professores.map((p, i) => (
            <motion.li key={i} className="prof" variants={fadeUp}>
              <div className="prof__retrato">
                {ok(p.foto) ? (
                  <img className="ph" src={p.foto} alt={`Retrato de ${p.nome}`} />
                ) : (
                  <div className="prof__vazio">
                    <Marca size={92} on="bone" />
                    <span>Foto em breve</span>
                  </div>
                )}
              </div>

              <div className="prof__info">
                <h3 className="prof__nome">{p.nome}</h3>
                <span className="prof__papel">{p.papel}</span>
                <Faixa professor={p} />
                <span className="prof__faixa">{p.faixa}</span>
                {ok(p.linhagem) && (
                  <p className="prof__linhagem">{p.linhagem}</p>
                )}
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </motion.section>
  );
}
