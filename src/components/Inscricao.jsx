import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, ArrowUpRight } from "lucide-react";
import QRCode from "qrcode";
import { useConteudo, whatsappLink, turmasDaGrade, ok } from "../conteudo/Conteudo";
import { pixCopiaECola, valorNumero, formataReais } from "../lib/pix";
import { EASE } from "../motion/variants";
import "./Inscricao.css";

const VAZIO = {
  nome: "",
  nascimento: "",
  whatsapp: "",
  email: "",
  turma: "",
  plano: "",
  responsavel: "",
  experiencia: "Nunca treinei",
  saude: "",
  aceite: false,
  empresa: "", // isca para robôs: fica escondido, gente de verdade não preenche
};

const EXPERIENCIAS = [
  "Nunca treinei",
  "Faixa-branca",
  "Faixa-cinza/amarela/laranja/verde (kids)",
  "Faixa-azul",
  "Faixa-roxa",
  "Faixa-marrom",
  "Faixa-preta",
];

function idade(nasc) {
  if (!nasc) return null;
  const d = new Date(nasc + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const h = new Date();
  let a = h.getFullYear() - d.getFullYear();
  if (h < new Date(h.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}

function BotaoCopiar({ texto, rotulo = "Copiar" }) {
  const [ok, setOk] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const t = document.createElement("textarea");
      t.value = texto;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setOk(true);
    setTimeout(() => setOk(false), 1800);
  };
  return (
    <button type="button" className="insc__copiar" onClick={copiar}>
      {ok ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span>{ok ? "Copiado" : rotulo}</span>
    </button>
  );
}

export default function Inscricao() {
  const { site, horarios, planos, inscricao: txt, pix } = useConteudo();
  const turmas = turmasDaGrade(horarios);
  const planosPagos = planos.itens.filter((p) => p.abreInscricao);

  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState("form");
  const [form, setForm] = useState(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [qr, setQr] = useState("");
  const primeiro = useRef(null);

  const plano = planosPagos.find((p) => p.nome === form.plano) || planosPagos[0];
  const valor = valorNumero(plano?.valorPix ?? plano?.preco);
  const anos = idade(form.nascimento);
  const menor = (anos !== null && anos < 18) || /kids/i.test(form.turma);
  const copiaECola =
    valor > 0 && ok(pix.chaveQrCode)
      ? pixCopiaECola({
          chave: pix.chaveQrCode,
          nome: pix.favorecido,
          cidade: pix.cidade,
          valor,
        })
      : "";

  // abre a partir de qualquer botão do site
  useEffect(() => {
    const abrir = (e) => {
      setForm((f) => ({
        ...f,
        plano: e.detail?.plano || f.plano || planosPagos[0]?.nome || "",
        turma: f.turma || turmas[0] || "",
      }));
      setPasso("form");
      setAberto(true);
    };
    window.addEventListener("abrir-inscricao", abrir);
    return () => window.removeEventListener("abrir-inscricao", abrir);
  }, [planosPagos, turmas]);

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    const esc = (e) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    setTimeout(() => primeiro.current?.focus(), 350);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  useEffect(() => {
    if (!copiaECola) return setQr("");
    QRCode.toDataURL(copiaECola, { margin: 1, width: 480, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(""));
  }, [copiaECola]);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    const dados = { ...form, plano: plano?.nome || "", valor: formataReais(valor) };
    // guarda no painel quando a API existe; se não existir, o WhatsApp leva os dados
    try {
      await fetch("/api/inscricoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
    } catch {
      /* segue para o pagamento mesmo assim */
    }
    setEnviando(false);
    setPasso("pagar");
  };

  const mensagem = [
    `Olá! Acabei de fazer minha inscrição pelo site da ${site.nome}.`,
    ``,
    `Nome: ${form.nome}`,
    `Nascimento: ${form.nascimento ? form.nascimento.split("-").reverse().join("/") : "-"}`,
    `WhatsApp: ${form.whatsapp}`,
    form.email && `E-mail: ${form.email}`,
    `Turma: ${form.turma}`,
    `Plano: ${plano?.nome || "-"} (${formataReais(valor)})`,
    menor && form.responsavel && `Responsável: ${form.responsavel}`,
    `Experiência: ${form.experiencia}`,
    form.saude && `Saúde/observações: ${form.saude}`,
    ``,
    valor > 0 ? `Segue o comprovante do Pix.` : ``,
  ]
    .filter((l) => l !== false && l !== undefined)
    .join("\n");

  const fechar = () => {
    setAberto(false);
    if (passo === "pagar") {
      setForm(VAZIO);
      setPasso("form");
    }
  };

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="insc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onMouseDown={(e) => e.target === e.currentTarget && fechar()}
        >
          <motion.div
            className="insc__painel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="insc-titulo"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <button className="insc__fechar" onClick={fechar} aria-label="Fechar">
              <X size={22} strokeWidth={1.5} />
            </button>

            {passo === "form" ? (
              <form className="insc__form" onSubmit={enviar}>
                <p className="eyebrow">Matrícula</p>
                <h2 id="insc-titulo" className="insc__titulo">
                  {txt.titulo}
                </h2>
                <p className="insc__texto">{txt.texto}</p>

                <div className="insc__grid">
                  <label className="campo insc__full">
                    <span>Nome completo *</span>
                    <input
                      ref={primeiro}
                      required
                      autoComplete="name"
                      value={form.nome}
                      onChange={set("nome")}
                      maxLength={120}
                    />
                  </label>

                  <label className="campo">
                    <span>Data de nascimento *</span>
                    <input type="date" required value={form.nascimento} onChange={set("nascimento")} />
                  </label>

                  <label className="campo">
                    <span>WhatsApp *</span>
                    <input
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="(48) 90000-0000"
                      value={form.whatsapp}
                      onChange={set("whatsapp")}
                      maxLength={30}
                    />
                  </label>

                  <label className="campo insc__full">
                    <span>E-mail</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={set("email")}
                      maxLength={120}
                    />
                  </label>

                  <label className="campo">
                    <span>Turma *</span>
                    <select required value={form.turma} onChange={set("turma")}>
                      {turmas.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="campo">
                    <span>Plano *</span>
                    <select required value={plano?.nome || ""} onChange={set("plano")}>
                      {planosPagos.map((p) => (
                        <option key={p.nome} value={p.nome}>
                          {p.nome} — {formataReais(p.valorPix ?? p.preco)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {menor && (
                    <label className="campo insc__full">
                      <span>Nome do responsável *</span>
                      <input
                        required
                        value={form.responsavel}
                        onChange={set("responsavel")}
                        maxLength={120}
                      />
                    </label>
                  )}

                  <label className="campo insc__full">
                    <span>Experiência no Jiu-Jitsu</span>
                    <select value={form.experiencia} onChange={set("experiencia")}>
                      {EXPERIENCIAS.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>

                  <label className="campo insc__full">
                    <span>Lesões, problemas de saúde ou observações</span>
                    <textarea
                      rows={2}
                      value={form.saude}
                      onChange={set("saude")}
                      maxLength={600}
                    />
                  </label>
                </div>

                <input
                  className="insc__isca"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={form.empresa}
                  onChange={set("empresa")}
                />

                <label className="insc__aceite">
                  <input type="checkbox" required checked={form.aceite} onChange={set("aceite")} />
                  <span>{txt.termo}</span>
                </label>

                <button className="btn insc__enviar" type="submit" disabled={enviando}>
                  <span>{enviando ? "Enviando…" : txt.botao}</span>
                  <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </form>
            ) : (
              <div className="insc__pagar">
                <p className="eyebrow">Pagamento</p>
                <h2 id="insc-titulo" className="insc__titulo">
                  {txt.pagamentoTitulo}
                </h2>
                <p className="insc__texto">{txt.pagamentoTexto}</p>

                <div className="insc__resumo">
                  <span>
                    {plano?.nome} · {form.turma}
                  </span>
                  <strong>{formataReais(valor)}</strong>
                </div>

                {valor > 0 && (
                  <div className="insc__pix">
                    {qr && (
                      <img
                        className="insc__qr"
                        src={qr}
                        alt={`QR Code Pix de ${formataReais(valor)}`}
                        width={240}
                        height={240}
                      />
                    )}

                    <div className="insc__chaves">
                      {copiaECola && (
                        <div className="insc__chave">
                          <span className="insc__rotulo">Pix copia e cola</span>
                          <code className="insc__codigo">{copiaECola}</code>
                          <BotaoCopiar texto={copiaECola} rotulo="Copiar código" />
                        </div>
                      )}

                      {pix.chaves
                        .filter((c) => ok(c.valor))
                        .map((c, i) => (
                          <div className="insc__chave" key={i}>
                            <span className="insc__rotulo">{c.tipo}</span>
                            <code className="insc__codigo">{c.valor}</code>
                            <BotaoCopiar texto={c.valor} />
                          </div>
                        ))}

                      <p className="insc__favorecido">
                        Favorecido: <strong>{pix.favorecido}</strong>
                        {ok(pix.cnpj) && <> · CNPJ {pix.cnpj}</>}
                      </p>
                    </div>
                  </div>
                )}

                <a
                  className="btn insc__enviar"
                  href={whatsappLink(site, mensagem)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{txt.botaoComprovante}</span>
                  <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
                </a>
                <button type="button" className="insc__voltar" onClick={() => setPasso("form")}>
                  Corrigir meus dados
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
