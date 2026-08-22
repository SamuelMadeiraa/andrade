import { motion } from "framer-motion";
import { Instagram, MapPin, MessageCircle, Mail } from "lucide-react";
import Marca from "./Marca";
import GregaDivider from "./GregaDivider";
import { site, navLinks, whatsappLink, ok } from "../data/site";
import { fadeUp, stagger, inView } from "../motion/variants";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer sec--ink on-ink">
      <motion.div
        className="wrap footer__grid"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inView}
      >
        <motion.div className="footer__marca" variants={fadeUp}>
          <Marca size={72} on="ink" />
          <span className="footer__wordmark">Andrade BJJ</span>
          <p className="footer__tag">Na Andrade, ninguém treina sozinho.</p>
        </motion.div>

        <motion.nav className="footer__col" variants={fadeUp} aria-label="Rodapé">
          <h2 className="footer__h">Navegar</h2>
          <ul>
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
            <li>
              <a href="#agendar">Agendar aula</a>
            </li>
          </ul>
        </motion.nav>

        <motion.div className="footer__col" variants={fadeUp}>
          <h2 className="footer__h">Onde treinamos</h2>
          <address>
            <MapPin size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>
              {site.endereco}
              <br />
              CEP {site.cep}
            </span>
          </address>
          <a className="footer__link" href={whatsappLink()} target="_blank" rel="noreferrer">
            <MessageCircle size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{site.whatsappVisivel}</span>
          </a>
          <a className="footer__link" href={site.instagram} target="_blank" rel="noreferrer">
            <Instagram size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{site.instagramHandle}</span>
          </a>
          {ok(site.email) && (
            <a className="footer__link" href={`mailto:${site.email}`}>
              <Mail size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{site.email}</span>
            </a>
          )}
        </motion.div>

        <motion.div className="footer__col footer__mapa" variants={fadeUp}>
          <h2 className="footer__h">Mapa</h2>
          {site.mapsEmbed ? (
            <iframe
              title="Mapa da Andrade BJJ"
              src={site.mapsEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="footer__mapaVazio">
              Cole a URL de embed do Google Maps em <code>src/data/site.js</code>
            </div>
          )}
        </motion.div>
      </motion.div>

      <div className="wrap footer__base">
        <span>
          © {new Date().getFullYear()} {site.nome} — {site.cidade}/{site.estado}
        </span>
        {ok(site.fundadaEm) && <span>Desde {site.fundadaEm}</span>}
      </div>

      {/* fecha a moldura de grega, igual ao topo do site */}
      <GregaDivider dark flip height={24} />
    </footer>
  );
}
