import { motion } from "framer-motion";
import { Check } from "lucide-react";
import GregaDivider from "./GregaDivider";
import { planos, fundadora, whatsappLink, ok } from "../data/site";
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
function Fundadora() {
  if (!fundadora.ativa || fundadora.restantes < 1) return null;
  const preenchidas = fundadora.total - fundadora.restantes;
  const pct = (preenchidas / fundadora.total) * 100;

  return (
    <motion.div className="fundadora" variants={fadeUp}>
      <div className="fundadora__txt">
        <span className="fundadora__titulo">Turma fundadora</span>
        <span className="fundadora__sub">
          Os {fundadora.total} primeiros travam R$ 129,90 enquanto forem alunos.
          {ok(fundadora.prazo) && ` Entrada promocional até ${fundadora.prazo}.`}
        </span>
      </div>

      <div className="fundadora__vagas">
        <span className="fundadora__num">
          {fundadora.restantes}
          <span>/{fundadora.total}</span>
        </span>
        <span className="fundadora__label">vagas restantes</span>
        <div
          className="fundadora__barra"
          role="progressbar"
          aria-valuenow={preenchidas}
          aria-valuemin={0}
          aria-valuemax={fundadora.total}
          aria-label={`${preenchidas} de ${fundadora.total} vagas preenchidas`}
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
          Planos
        </motion.p>
        <motion.h2 className="planos__titulo" variants={fadeUp}>
          Sem fidelidade.<br />Sem letra miúda.
        </motion.h2>

        <Fundadora />

        <motion.ul className="planos__grid" variants={stagger}>
          {planos.map((p) => (
            <motion.li
              key={p.nome}
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
                {p.selo && <span className="plano__selo">{p.selo}</span>}
              </div>

              <p className="plano__preco">
                <Preco valor={p.preco} gratis={p.gratis} />
              </p>
              <span className="plano__periodo">{p.periodo}</span>
              {p.nota && <span className="plano__nota-item">{p.nota}</span>}

              <ul className="plano__itens">
                {p.itens.map((i) => (
                  <li key={i}>
                    <Check size={15} strokeWidth={2} aria-hidden="true" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>

              <a
                className={`btn ${p.destaque ? "" : "btn--ghost"} plano__cta`}
                href={whatsappLink(
                  `Olá! Quero saber mais sobre o plano ${p.nome} da Andrade BJJ.`
                )}
                target="_blank"
                rel="noreferrer"
              >
                <span>{p.cta}</span>
              </a>
            </motion.li>
          ))}
        </motion.ul>

        <motion.p className="planos__nota" variants={fadeUp}>
          No plano mensal o kimono não está incluso — emprestamos até você comprar o
          seu. No semestral, ele já vem com a matrícula.
        </motion.p>
      </div>
    </motion.section>
  );
}
