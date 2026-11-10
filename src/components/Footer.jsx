import { Instagram, MessageCircle, Mail, MapPin } from "lucide-react";
import Marca from "./Marca";
import Faixa from "./Faixa";
import { useConteudo, whatsappLink, ok } from "../conteudo/Conteudo";
import { rotaNoMaps } from "./Local";
import { CORES_FAIXA } from "../lib/faixas";

const NAVEGAR = [
  { href: "#sobre", label: "A academia" },
  { href: "#turmas", label: "Turmas" },
  { href: "#horarios", label: "Horários" },
  { href: "#planos", label: "Planos" },
  { href: "#matricula", label: "Matrícula" },
  { href: "#duvidas", label: "Dúvidas" },
];

export default function Footer() {
  const { site, rodape } = useConteudo();
  return (
    <footer className="rodape">
      {/* a página começa na faixa branca e fecha na preta */}
      <Faixa cor={CORES_FAIXA.find((c) => c.id === "preta")} graus={1} className="faixa--borda" />

      <div className="conteiner rodape__grade">
        <div className="rodape__marca">
          <Marca size={64} on="ink" />
          <p className="rodape__nome">{site.nome}</p>
          <p className="rodape__frase">{rodape.frase}</p>
        </div>

        <nav aria-label="Rodapé">
          <h2 className="rodape__h">{rodape.tituloNavegar}</h2>
          <ul className="rodape__links">
            {NAVEGAR.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
            <li>
              <a href="/aluno">Área do aluno</a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="rodape__h">Endereço</h2>
          <address className="rodape__endereco">
            <MapPin size={17} strokeWidth={1.5} aria-hidden="true" />
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
          <a className="rodape__rota" href={rotaNoMaps(site)} target="_blank" rel="noreferrer">
            Abrir no mapa
          </a>
        </div>

        <div>
          <h2 className="rodape__h">Fale com a gente</h2>
          <ul className="rodape__links rodape__links--icone">
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
        </div>
      </div>

      <div className="conteiner rodape__base">
        <span>
          © {new Date().getFullYear()} {rodape.textoFinal}
          {ok(site.fundadaEm) && ` · Desde ${site.fundadaEm}`}
        </span>
        <a href="#inicio">Voltar ao topo ↑</a>
      </div>
    </footer>
  );
}
