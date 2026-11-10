import Reveal from "./Reveal";
import Faixa from "./Faixa";
import { useConteudo, Linhas, aulasPorSemana, ok } from "../conteudo/Conteudo";
import { CORES_FAIXA } from "../lib/faixas";

const cor = (id) => CORES_FAIXA.find((c) => c.id === id);
const ADULTO = ["branca", "azul", "roxa", "marrom", "preta"].map(cor);
const INFANTIL = ["branca", "cinza", "amarela", "laranja", "verde"].map(cor);

export default function Sobre() {
  const { sobre, horarios } = useConteudo();

  // números vazios ou zerados não vão ao ar
  const numeros = (sobre.numeros || [])
    .map((n) => ({ ...n, valor: n.valor === "auto" ? String(aulasPorSemana(horarios)) : n.valor }))
    .filter((n) => ok(n.valor) && n.valor !== "0");

  return (
    <section className="secao secao--papel" id="sobre">
      <div className="conteiner sobre">
        <Reveal className="sobre__texto">
          <p className="rotulo">{sobre.eyebrow}</p>
          <h2 className="titulo">
            <Linhas texto={sobre.titulo} />
          </h2>
          <p className="guia">{sobre.lead}</p>
          {sobre.paragrafos.map((p, i) => (
            <p className="sobre__p" key={i}>
              {p}
            </p>
          ))}

          {numeros.length > 0 && (
            <dl className="numeros">
              {numeros.map((n, i) => (
                <div key={i}>
                  <dd>
                    {n.valor}
                    {n.sufixo}
                  </dd>
                  <dt>{n.label}</dt>
                </div>
              ))}
            </dl>
          )}
        </Reveal>

        <Reveal className="jornada" atraso={0.1}>
          <h3 className="jornada__titulo">Faixa por faixa</h3>
          <p className="jornada__sub">A graduação do adulto, da primeira aula à faixa-preta.</p>
          <ol className="jornada__lista">
            {ADULTO.map((c, i) => (
              <li key={c.id} style={{ "--largura": `${60 + i * 10}%` }}>
                <span>{c.rotulo}</span>
                <Faixa cor={c} />
              </li>
            ))}
          </ol>
          <div className="jornada__kids">
            <span>No infantil</span>
            <ul>
              {INFANTIL.map((c) => (
                <li key={c.id} title={c.rotulo}>
                  <i style={{ background: c.hex }} aria-hidden="true" />
                  {c.rotulo}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
