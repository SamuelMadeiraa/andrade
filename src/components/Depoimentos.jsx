import Reveal from "./Reveal";
import { useConteudo, publicaveis, ok } from "../conteudo/Conteudo";

/** Só entra na página quando existe depoimento real marcado como publicado no painel. */
export default function Depoimentos() {
  const { depoimentos } = useConteudo();
  const itens = publicaveis(depoimentos);
  if (!itens.length) return null;

  return (
    <section className="secao secao--papel" id="depoimentos">
      <div className="conteiner">
        <Reveal as="header" className="cab">
          <p className="rotulo">{depoimentos.eyebrow}</p>
          <h2 className="titulo">O que diz quem treina.</h2>
        </Reveal>

        <ul className="depoimentos">
          {itens.map((d, i) => (
            <Reveal as="li" className="depoimento" key={i} atraso={i * 0.06}>
              <blockquote>“{d.fala}”</blockquote>
              <footer>
                {ok(d.foto) && <img src={d.foto} alt="" loading="lazy" />}
                <div>
                  <strong>{d.nome}</strong>
                  {ok(d.faixa) && <span>{d.faixa}</span>}
                </div>
              </footer>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
