import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useConteudo, whatsappLink, Linhas, ok } from "../conteudo/Conteudo";
import { abrirInscricao } from "../conteudo/inscricao";
import { fadeUp, stagger, inView, EASE } from "../motion/variants";
import "./CTA.css";

export default function CTA() {
  const { site, modalidades, agendamento: txt } = useConteudo();
  const turmas = modalidades.itens.map((m) => m.nome);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", turma: "" });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  /** Aula experimental: monta a mensagem e abre o WhatsApp. */
  const enviar = (e) => {
    e.preventDefault();
    const turma = form.turma || turmas[0] || "";
    const msg = `Olá! Sou ${form.nome} e quero agendar minha aula experimental na turma de ${turma}. Meu telefone: ${form.telefone}`;
    window.open(whatsappLink(site, msg), "_blank", "noopener");
    setEnviado(true);
  };

  return (
    <motion.section
      className="sec sec--bone cta"
      id="agendar"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inView}
    >
      <div className="wrap cta__grid">
        <div className="cta__esq">
          <motion.p className="eyebrow" variants={fadeUp}>
            {txt.eyebrow}
          </motion.p>
          <motion.h2 className="cta__titulo" variants={fadeUp}>
            <Linhas texto={txt.titulo} />
          </motion.h2>
          <motion.p className="lead cta__lead" variants={fadeUp}>
            {txt.lead}
          </motion.p>
          {ok(txt.botaoMatricula) && (
            <motion.div variants={fadeUp} className="cta__matricula">
              <button className="btn btn--ghost" type="button" onClick={() => abrirInscricao()}>
                <span>{txt.botaoMatricula}</span>
                <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </div>

        <motion.div className="cta__dir" variants={fadeUp}>
          <AnimatePresence mode="wait">
            {enviado ? (
              <motion.div
                key="ok"
                className="cta__ok"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <h3>
                  <Linhas texto={txt.sucessoTitulo} />
                </h3>
                <p>
                  Se o WhatsApp não abrir sozinho,{" "}
                  <a href={whatsappLink(site)} target="_blank" rel="noreferrer">
                    clique aqui
                  </a>
                  .
                </p>
                <button
                  className="btn btn--ghost"
                  onClick={() => setEnviado(false)}
                  type="button"
                >
                  <span>Enviar outro</span>
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                className="cta__form"
                onSubmit={enviar}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <label className="campo">
                  <span>Nome</span>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Como te chamamos no tatame"
                    value={form.nome}
                    onChange={set("nome")}
                  />
                </label>

                <label className="campo">
                  <span>WhatsApp</span>
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    value={form.telefone}
                    onChange={set("telefone")}
                  />
                </label>

                <label className="campo">
                  <span>Turma de interesse</span>
                  <select value={form.turma || turmas[0] || ""} onChange={set("turma")}>
                    {turmas.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="btn cta__submit" type="submit">
                  <span>{txt.botao}</span>
                  <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
                </button>

                <p className="cta__aviso">{txt.aviso}</p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.section>
  );
}
