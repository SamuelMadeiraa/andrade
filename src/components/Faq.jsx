import { Plus } from "lucide-react";
import Reveal from "./Reveal";
import { useConteudo, whatsappLink, ok } from "../conteudo/Conteudo";

export default function Faq() {
  const { site, faq } = useConteudo();
  const itens = (faq?.itens || []).filter((f) => ok(f.pergunta) && ok(f.resposta));
  if (!itens.length) return null;

  return (
    <section className="secao secao--papel" id="duvidas">
      <div className="conteiner faq">
        <Reveal as="header" className="faq__cab">
          <p className="rotulo">{faq.eyebrow}</p>
          <h2 className="titulo">{faq.titulo}</h2>
          <p className="guia">
            Não achou a sua?{" "}
            <a className="link" href={whatsappLink(site)} target="_blank" rel="noreferrer">
              Pergunte no WhatsApp
            </a>
            .
          </p>
        </Reveal>

        <Reveal className="faq__lista" atraso={0.08}>
          {itens.map((f, i) => (
            <details key={i} className="faq__item">
              <summary>
                <span>{f.pergunta}</span>
                <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
              </summary>
              <p>{f.resposta}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
