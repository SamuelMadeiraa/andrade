import { Check, ArrowRight } from "lucide-react";
import Reveal from "./Reveal";
import { useConteudo, whatsappLink, ok, Linhas } from "../conteudo/Conteudo";
import { irParaMatricula } from "../lib/matricula";

/** Preço em duas escalas: reais grandes, centavos menores. */
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

/** Aviso da turma fundadora — some sozinho quando as vagas acabam. */
function Fundadora({ fundadora }) {
  const total = Number(fundadora?.total) || 0;
  const restantes = Number(fundadora?.restantes) || 0;
  if (!fundadora?.ativa || restantes < 1 || total < 1) return null;
  const preenchidas = Math.max(0, total - restantes);

  return (
    <Reveal className="fundadora">
      <div className="fundadora__texto">
        <strong>{fundadora.titulo}</strong>
        <span>
          {String(fundadora.texto || "").replace("{total}", total)}
          {ok(fundadora.prazo) && ` Entrada promocional até ${fundadora.prazo}.`}
        </span>
      </div>
      <div className="fundadora__vagas">
        <p>
          <b>{restantes}</b> de {total} vagas restantes
        </p>
        <div
          className="fundadora__barra"
          role="progressbar"
          aria-valuenow={preenchidas}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${preenchidas} de ${total} vagas preenchidas`}
        >
          <i style={{ width: `${(preenchidas / total) * 100}%` }} />
        </div>
      </div>
    </Reveal>
  );
}

export default function Planos() {
  const { site, planos } = useConteudo();
  return (
    <section className="secao secao--nevoa" id="planos">
      <div className="conteiner">
        <Reveal as="header" className="cab">
          <p className="rotulo">{planos.eyebrow}</p>
          <h2 className="titulo">
            <Linhas texto={planos.titulo} />
          </h2>
        </Reveal>

        <Fundadora fundadora={planos.fundadora} />

        <ul className="planos">
          {planos.itens.map((p, i) => (
            <Reveal
              as="li"
              key={i}
              atraso={i * 0.08}
              className={`plano ${p.destaque ? "plano--destaque" : ""}`}
            >
              <div className="plano__topo">
                <h3 className="plano__nome">{p.nome}</h3>
                {ok(p.selo) && <span className="plano__selo">{p.selo}</span>}
              </div>

              <p className="plano__preco">
                <Preco valor={p.preco} gratis={p.gratis} />
                {ok(p.periodo) && <span className="plano__periodo">{p.periodo}</span>}
              </p>
              {ok(p.nota) && <p className="plano__nota">{p.nota}</p>}

              <ul className="plano__itens">
                {(p.itens || []).filter(ok).map((item, j) => (
                  <li key={j}>
                    <Check size={17} strokeWidth={2.25} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              {p.abreInscricao ? (
                <button
                  type="button"
                  className={`botao ${p.destaque ? "botao--claro" : "botao--escuro"} plano__cta`}
                  onClick={() => irParaMatricula({ plano: p.nome })}
                >
                  {p.cta}
                  <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                </button>
              ) : (
                <a
                  className={`botao ${p.destaque ? "botao--claro" : "botao--contorno"} plano__cta`}
                  href={whatsappLink(site)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {p.cta}
                  <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                </a>
              )}
            </Reveal>
          ))}
        </ul>

        {ok(planos.nota) && <p className="nota">{planos.nota}</p>}
      </div>
    </section>
  );
}
