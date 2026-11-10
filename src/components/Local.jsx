import { MapPin, MessageCircle, Instagram, Mail, Navigation } from "lucide-react";
import Reveal from "./Reveal";
import { useConteudo, whatsappLink, ok } from "../conteudo/Conteudo";

const lista = (itens) =>
  new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" }).format(itens);

export const enderecoCompleto = (site) => [site.endereco, site.cep].filter(ok).join(", ");
export const rotaNoMaps = (site) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto(site))}`;

export default function Local() {
  const { site, rodape, horarios } = useConteudo();
  const destino = enderecoCompleto(site);
  // sem link próprio, o mapa é montado a partir do endereço — mudou o endereço, mudou o mapa
  const mapa = ok(site.mapsEmbed)
    ? site.mapsEmbed
    : destino
      ? `https://www.google.com/maps?q=${encodeURIComponent(destino)}&output=embed`
      : "";
  const horas = (horarios.linhas || []).map((l) => l.hora).filter(ok);

  return (
    <section className="secao secao--nevoa" id="contato">
      <div className="conteiner local">
        <Reveal className="local__info">
          <p className="rotulo">Localização e contato</p>
          <h2 className="titulo">{rodape.tituloEndereco}</h2>

          <address className="local__endereco">
            <MapPin size={20} strokeWidth={1.5} aria-hidden="true" />
            <span>
              {site.endereco}
              {ok(site.cep) && (
                <>
                  <br />
                  CEP {site.cep}
                </>
              )}
            </span>
          </address>

          {horas.length > 0 && (
            <p className="local__horas">
              Treinos de {lista((horarios.dias || []).filter(ok)).toLowerCase()}, a partir das {horas[0]}.
            </p>
          )}

          <div className="local__botoes">
            {destino && (
              <a className="botao botao--escuro" href={rotaNoMaps(site)} target="_blank" rel="noreferrer">
                <Navigation size={16} strokeWidth={2} aria-hidden="true" />
                Como chegar
              </a>
            )}
            <a className="botao botao--contorno" href={whatsappLink(site)} target="_blank" rel="noreferrer">
              <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
              Chamar no WhatsApp
            </a>
          </div>

          <ul className="local__contatos">
            <li>
              <a href={whatsappLink(site)} target="_blank" rel="noreferrer">
                <MessageCircle size={17} strokeWidth={1.5} aria-hidden="true" />
                {site.whatsappVisivel}
              </a>
            </li>
            {ok(site.instagram) && (
              <li>
                <a href={site.instagram} target="_blank" rel="noreferrer">
                  <Instagram size={17} strokeWidth={1.5} aria-hidden="true" />
                  {site.instagramHandle}
                </a>
              </li>
            )}
            {ok(site.email) && (
              <li>
                <a href={`mailto:${site.email}`}>
                  <Mail size={17} strokeWidth={1.5} aria-hidden="true" />
                  {site.email}
                </a>
              </li>
            )}
          </ul>
        </Reveal>

        {mapa && (
          <Reveal className="local__mapa" atraso={0.1}>
            <iframe
              title={`Mapa da ${site.nome}`}
              src={mapa}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Reveal>
        )}
      </div>
    </section>
  );
}
