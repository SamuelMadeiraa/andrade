import Reveal from "./Reveal";
import Faixa from "./Faixa";
import Marca from "./Marca";
import { useConteudo, ok, Linhas } from "../conteudo/Conteudo";
import { corDaFaixa } from "../lib/faixas";

const graus = (texto = "") => Number((texto.match(/(\d+)\s*º/) || [])[1] || 0);

export default function Professor() {
  const { professores: sec } = useConteudo();
  const professores = (sec.itens || []).filter((p) => ok(p.nome));
  if (!professores.length) return null;

  return (
    <section className="secao secao--papel" id="professor">
      <div className="conteiner professor">
        <Reveal as="header" className="professor__cab">
          <p className="rotulo">{sec.eyebrow}</p>
          <h2 className="titulo">
            <Linhas texto={sec.titulo} />
          </h2>
          <p className="guia">{sec.lead}</p>
        </Reveal>

        <ul className="professor__lista">
          {professores.map((p, i) => (
            <Reveal as="li" className="prof" key={i} atraso={i * 0.08}>
              <div className="prof__retrato">
                {ok(p.foto) ? (
                  <img src={p.foto} alt={`Retrato de ${p.nome}`} loading="lazy" />
                ) : (
                  <Marca size={96} on="bone" />
                )}
              </div>
              <div className="prof__info">
                {ok(p.papel) && <p className="prof__papel">{p.papel}</p>}
                <h3 className="prof__nome">{p.nome}</h3>
                <Faixa cor={corDaFaixa(p)} graus={graus(p.faixa)} />
                {ok(p.faixa) && <p className="prof__faixa">{p.faixa}</p>}
                {ok(p.linhagem) && <p className="prof__linhagem">{p.linhagem}</p>}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
