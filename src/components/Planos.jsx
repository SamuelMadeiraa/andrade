import { motion } from "framer-motion";
import { Check } from "lucide-react";
import GregaDivider from "./GregaDivider";
import { useConteudo, whatsappLink, ok, Linhas } from "../conteudo/Conteudo";
import { abrirInscricao } from "../conteudo/inscricao";
import { fadeUp, stagger, inView, EASE } from "../motion/variants";
import "./Planos.css";

/** Preço em duas escalas: reais no display, centavos menores. */
function Preco({ valor, gratis }) {
  if (gratis) return <span className="plano__valor">Grátis</span>;
  const [reais, centavos] = String(valor).split(",");
  return (
    <>
      <span className="plano__moeda">R$</span>
      <span className="plano__valor">{reais}</span>
      {centavos && <span className="plano__cent">,{centavos}</span>}
    </>
  );
}

/** Faixa de escassez da inauguração — some sozinha quando as vagas acabam. */
function Fundadora({ fundadora }) {
  const total = Number(fundadora.total) || 0;
  const restantes = Number(fundadora.restantes) || 0;
  if (!fundadora.ativa || restantes < 1 || total < 1) return null;
  const preenchidas = Math.max(0, total - restantes);
  const pct = (preenchidas / total) * 100;

  return (
    <motion.div className="fundadora" variants={fadeUp}>
      <div className="fundadora__txt">
        <span className="fundadora__titulo">{fundadora.titulo}</span>
        <span className="fundadora__sub">
          {String(fundadora.texto || "").replace("{total}", total)}
          {ok(fundadora.prazo) && ` Entrada promocional até ${fundadora.prazo}.`}
        </span>
      </div>

      <div className="fundadora__vagas">
        <span className="fundadora__num">
          {restantes}
          <span>/{total}</span>
        </span>
        <span className="fundadora__label">vagas restantes</span>
        <div
          className="fundadora__barra"
          role="progressbar"
          aria-valuenow={preenchidas}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${preenchidas} de ${total} vagas preenchidas`}
        >
          <motion.i
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: pct / 100 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function Planos() {
  const { site, planos } = useConteudo();

  return (
    <motion.section
      className="sec sec--bone planos"
      id="planos"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      <div className="wrap">
        <motion.p className="eyebrow" variants={fadeUp}>
          {planos.eyebrow}
        </motion.p>
        <motion.h2 className="planos__titulo" variants={fadeUp}>
          <Linhas texto={planos.titulo} />
        </motion.h2>

        <Fundadora fundadora={planos.fundadora} />

        <motion.ul className="planos__grid" variants={stagger}>
          {planos.itens.map((p, idx) => (
            <motion.li
              key={idx}
              className={`plano ${p.destaque ? "plano--destaque" : ""}`}
              variants={fadeUp}
            >
              {p.destaque && (
                <div className="plano__grega">
                  <GregaDivider height={12} />
                </div>
              )}

              <div className="plano__topo">
                <h3 className="plano__nome">{p.nome}</h3>
                {ok(p.selo) && <span className="plano__selo">{p.selo}</span>}
              </div>

              <p className="plano__preco">
                <Preco valor={p.preco} gratis={p.gratis} />
              </p>
              <span className="plano__periodo">{p.periodo}</span>
              {ok(p.nota) && <span className="plano__nota-item">{p.nota}</span>}

              <ul className="plano__itens">
                {p.itens.map((i, k) => (
                  <li key={k}>
                    <Check size={15} strokeWidth={2} aria-hidden="true" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>

              {p.abreInscricao ? (
                <button
                  type="button"
                  className={`btn ${p.destaque ? "" : "btn--ghost"} plano__cta`}
                  onClick={() => abrirInscricao(p.nome)}
                >
                  <span>{p.cta}</span>
                </button>
              ) : (
                <a
                  className={`btn ${p.destaque ? "" : "btn--ghost"} plano__cta`}
                  href={whatsappLink(
                    site,
                    `Olá! Quero saber mais sobre o plano ${p.nome} da ${site.nome}.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{p.cta}</span>
                </a>
              )}
            </motion.li>
          ))}
        </motion.ul>

        {ok(planos.nota) && (
          <motion.p className="planos__nota" variants={fadeUp}>
            {planos.nota}
          </motion.p>
        )}
      </div>
    </motion.section>
  );
}
