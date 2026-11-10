import { motion } from "framer-motion";
import { ArrowRight, MapPin, CalendarDays, Gift, Wallet } from "lucide-react";
import logo from "../assets/logo-lobo.png";
import Faixa from "./Faixa";
import { useConteudo, whatsappLink, ok } from "../conteudo/Conteudo";
import { formataReais } from "../lib/pix";
import { proximoTreino, aulasDoDia } from "../lib/agenda";
import { CORES_FAIXA } from "../lib/faixas";

const lista = (itens) =>
  new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" }).format(itens);

const entra = (atraso) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: atraso },
});

/** Cartão "próximo treino": lê a grade e mostra o dia que vem, com a próxima aula marcada. */
function ProximoTreino({ horarios }) {
  const proximo = proximoTreino(horarios);
  if (!proximo) return null;
  const aulas = aulasDoDia(horarios, proximo.coluna);
  return (
    <motion.aside className="treino" aria-label="Próximo treino" {...entra(0.35)}>
      <header className="treino__cab">
        <span className="treino__vivo" aria-hidden="true" />
        <span>Próximo treino</span>
        <strong>
          {proximo.quando === proximo.dia ? proximo.dia : `${proximo.quando} · ${proximo.dia}`}
        </strong>
      </header>
      <ul className="treino__lista">
        {aulas.map((a) => {
          const eProxima = a.hora === proximo.hora && a.aula === proximo.aula;
          return (
            <li key={a.hora + a.aula} className={eProxima ? "is-proxima" : ""}>
              <time>{a.hora}</time>
              <span>{a.aula}</span>
              {eProxima && <em>a seguir</em>}
            </li>
          );
        })}
      </ul>
      <a className="treino__link" href="#horarios">
        Ver a grade da semana
        <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
      </a>
    </motion.aside>
  );
}

export default function Hero() {
  const { site, hero, horarios, planos } = useConteudo();

  const dias = (horarios.dias || []).filter(ok);
  const plano = (planos.itens || []).find((p) => !p.gratis);
  const gratis = (planos.itens || []).find((p) => p.gratis);
  const local = [site.bairro, [site.cidade, site.estado].filter(ok).join("/")].filter(ok).join(", ");

  const fatos = [
    local && { Icone: MapPin, rotulo: "Onde", valor: local },
    dias.length > 0 && { Icone: CalendarDays, rotulo: "Treinos", valor: lista(dias) },
    gratis && { Icone: Gift, rotulo: "Primeira aula", valor: "Grátis, com kimono emprestado" },
    plano && {
      Icone: Wallet,
      rotulo: `Plano ${plano.nome.toLowerCase()}`,
      valor: `${formataReais(plano.valorPix ?? plano.preco)} ${plano.periodo || ""}`.trim(),
    },
  ].filter(Boolean);

  return (
    <section className="hero" id="inicio">
      {/* o lobo da marca, grande e apagado ao fundo, como na arte da academia */}
      <img className="hero__lobo" src={logo} alt="" aria-hidden="true" />

      <div className="conteiner hero__grade">
        <div className="hero__texto">
          <motion.p className="rotulo rotulo--claro" {...entra(0.05)}>
            {hero.eyebrow}
          </motion.p>
          <motion.h1 className="hero__titulo" {...entra(0.12)}>
            {hero.titulo}
          </motion.h1>
          <motion.p className="hero__sub" {...entra(0.2)}>
            {hero.subtitulo}
          </motion.p>

          <motion.div className="hero__cta" {...entra(0.28)}>
            <a className="botao botao--claro" href="#matricula">
              {hero.botaoMatricula || "Quero me matricular"}
              <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </a>
            <a
              className="botao botao--contorno-claro"
              href={whatsappLink(site)}
              target="_blank"
              rel="noreferrer"
            >
              {hero.botao}
            </a>
          </motion.div>
        </div>

        <ProximoTreino horarios={horarios} />
      </div>

      {fatos.length > 0 && (
        <motion.dl className="conteiner fatos" {...entra(0.45)}>
          {fatos.map(({ Icone, rotulo, valor }) => (
            <div className="fatos__item" key={rotulo}>
              <Icone size={20} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            </div>
          ))}
        </motion.dl>
      )}

      {/* toda jornada começa na faixa branca — a página fecha na preta */}
      <Faixa cor={CORES_FAIXA.find((c) => c.id === "branca")} className="faixa--borda" />
    </section>
  );
}
