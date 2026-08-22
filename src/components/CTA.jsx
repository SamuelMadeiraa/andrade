import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { modalidades, whatsappLink } from "../data/site";
import { fadeUp, stagger, inView, EASE } from "../motion/variants";
import "./CTA.css";

export default function CTA() {
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", turma: "adulto" });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  /**
   * Sem backend: o formulário monta a mensagem e abre o WhatsApp.
   * Para plugar um serviço real (Formspree, Resend, etc.), basta trocar
   * este handler por um fetch e manter o estado `enviado`.
   */
  const enviar = (e) => {
    e.preventDefault();
    const turma =
      modalidades.find((m) => m.id === form.turma)?.nome || form.turma;
    const msg = `Olá! Sou ${form.nome} e quero agendar minha aula experimental na turma de ${turma}. Meu telefone: ${form.telefone}`;
    window.open(whatsappLink(msg), "_blank", "noopener");
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
            Primeiro treino
          </motion.p>
          <motion.h2 className="cta__titulo" variants={fadeUp}>
            Primeira aula é<br />por nossa conta.
          </motion.h2>
          <motion.p className="lead cta__lead" variants={fadeUp}>
            O resto depende de você. Deixa o contato que a gente encaixa você na
            turma certa — kimono emprestado, sem compromisso.
          </motion.p>
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
                <h3>Recebido.<br />Nos vemos no tatame.</h3>
                <p>
                  Se o WhatsApp não abrir sozinho,{" "}
                  <a href={whatsappLink()} target="_blank" rel="noreferrer">
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
                  <select value={form.turma} onChange={set("turma")}>
                    {modalidades.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="btn cta__submit" type="submit">
                  <span>Agendar minha aula</span>
                  <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
                </button>

                <p className="cta__aviso">
                  A gente responde pelo WhatsApp. Sem spam, sem lista de e-mail.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.section>
  );
}
