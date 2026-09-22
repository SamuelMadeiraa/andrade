import { motion } from "framer-motion";
import { Instagram, MapPin, MessageCircle, Mail } from "lucide-react";
import Marca from "./Marca";
import GregaDivider from "./GregaDivider";
import { useConteudo, whatsappLink, ok } from "../conteudo/Conteudo";
import { abrirInscricao } from "../conteudo/inscricao";
import { fadeUp, stagger, inView } from "../motion/variants";
import "./Footer.css";

export default function Footer() {
  const { site, menu, rodape } = useConteudo();
  const navLinks = menu.links;
  // sem link próprio, o mapa é montado a partir do endereço — mudou o endereço, mudou o mapa
  const mapa = ok(site.mapsEmbed)
    ? site.mapsEmbed
    : ok(site.endereco)
      ? `https://www.google.com/maps?q=${encodeURIComponent([site.endereco, site.cep].filter(ok).join(", "))}&output=embed`
      : "";
  return (
    <footer className="footer sec--ink on-ink" id="rodape">
      <motion.div
        className="wrap footer__grid"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inView}
      >
        <motion.div className="footer__marca" variants={fadeUp}>
          <Marca size={72} on="ink" />
          <span className="footer__wordmark">{site.nome}</span>
          <p className="footer__tag">{rodape.frase}</p>
        </motion.div>

        <motion.nav className="footer__col" variants={fadeUp} aria-label="Rodapé">
          <h2 className="footer__h">{rodape.tituloNavegar}</h2>
          <ul>
            {navLinks.map((l, i) => (
              <li key={i}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
            <li>
              <a href="#agendar">{rodape.linkAgendar}</a>
            </li>
            <li>
              <a
                href="#planos"
                onClick={(e) => {
                  e.preventDefault();
                  abrirInscricao();
                }}
              >
                {rodape.linkMatricula}
              </a>
            </li>
          </ul>
        </motion.nav>

        <motion.div className="footer__col" variants={fadeUp}>
          <h2 className="footer__h">{rodape.tituloEndereco}</h2>
          <address>
            <MapPin size={15} strokeWidth={1.5} aria-hidden="true" />
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
          <a className="footer__link" href={whatsappLink(site)} target="_blank" rel="noreferrer">
            <MessageCircle size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{site.whatsappVisivel}</span>
          </a>
          {ok(site.instagram) && (
            <a className="footer__link" href={site.instagram} target="_blank" rel="noreferrer">
              <Instagram size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{site.instagramHandle}</span>
            </a>
          )}
          {ok(site.email) && (
            <a className="footer__link" href={`mailto:${site.email}`}>
              <Mail size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{site.email}</span>
            </a>
          )}
        </motion.div>

        <motion.div className="footer__col footer__mapa" variants={fadeUp}>
          <h2 className="footer__h">{rodape.tituloMapa}</h2>
          {mapa ? (
            <iframe
              title={`Mapa da ${site.nome}`}
              src={mapa}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="footer__mapaVazio">
              Mapa em breve
            </div>
          )}
        </motion.div>
      </motion.div>

      <div className="wrap footer__base">
        <span>
          © {new Date().getFullYear()} {rodape.textoFinal}
        </span>
        {ok(site.fundadaEm) && <span>Desde {site.fundadaEm}</span>}
      </div>

      {/* fecha a moldura de grega, igual ao topo do site */}
      <GregaDivider dark flip height={24} />
    </footer>
  );
}
