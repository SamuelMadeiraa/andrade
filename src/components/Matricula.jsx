import { useEffect, useRef, useState } from "react";
import { Copy, Check, ArrowUpRight } from "lucide-react";
import QRCode from "qrcode";
import { useConteudo, whatsappLink, turmasDaGrade, ok, Linhas } from "../conteudo/Conteudo";
import { pixCopiaECola, valorNumero, formataReais } from "../lib/pix";
import Reveal from "./Reveal";

const VAZIO = {
  nome: "",
  nascimento: "",
  whatsapp: "",
  email: "",
  turma: "",
  plano: "",
  forma: "",
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

/** (48) 99999-9999 enquanto a pessoa digita. */
function mascaraFone(v) {
  const d = String(v).replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const PASSOS = [
  ["Preencha a ficha", "Seus dados, a turma e o plano."],
  ["Escolha como pagar", "Pix na hora, ou cartão e dinheiro na academia."],
  ["Venha treinar", "A gente confirma no WhatsApp e te espera no tatame."],
];

function BotaoCopiar({ texto, rotulo = "Copiar" }) {
  const [copiado, setCopiado] = useState(false);
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
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };
  return (
    <button type="button" className="mat__copiar" onClick={copiar}>
      {copiado ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span>{copiado ? "Copiado" : rotulo}</span>
    </button>
  );
}

/** Ficha de matrícula na própria página: dados do aluno e, em seguida, o pagamento. */
export default function Matricula() {
  const { site, horarios, planos, inscricao: txt, pix } = useConteudo();
  const turmas = turmasDaGrade(horarios);
  const planosPagos = planos.itens.filter((p) => p.abreInscricao);

  const [passo, setPasso] = useState("form");
  const [form, setForm] = useState(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [qr, setQr] = useState("");
  const cartao = useRef(null);

  const turma = form.turma || turmas[0] || "";
  const plano = planosPagos.find((p) => p.nome === form.plano) || planosPagos[0];
  const valor = valorNumero(plano?.valorPix ?? plano?.preco);
  const formas = (txt.formas || []).filter((f) => f.ativo);
  const forma = formas.find((f) => f.id === form.forma) || formas[0];
  const ehPix = forma?.id === "pix";
  const anos = idade(form.nascimento);
  const menor = (anos !== null && anos < 18) || /kids/i.test(turma);
  const copiaECola =
    ehPix && valor > 0 && ok(pix.chaveQrCode)
      ? pixCopiaECola({
          chave: pix.chaveQrCode,
          nome: pix.favorecido,
          cidade: pix.cidade,
          valor,
        })
      : "";

  // botões de "matricular" em outras seções já trazem o plano ou a turma escolhidos
  useEffect(() => {
    const escolher = (e) => {
      const { plano: p, turma: t } = e.detail || {};
      setForm((f) => ({ ...f, plano: p || f.plano, turma: t || f.turma }));
      setPasso("form");
    };
    window.addEventListener("matricula:escolher", escolher);
    return () => window.removeEventListener("matricula:escolher", escolher);
  }, []);

  useEffect(() => {
    if (!copiaECola) return setQr("");
    QRCode.toDataURL(copiaECola, { margin: 1, width: 480, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(""));
  }, [copiaECola]);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: k === "whatsapp" ? mascaraFone(v) : v });
  };

  const irPara = (novo) => {
    setPasso(novo);
    // o passo seguinte é mais curto: traz o topo do cartão de volta à tela
    requestAnimationFrame(() =>
      cartao.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    );
  };

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    const dados = {
      ...form,
      turma,
      plano: plano?.nome || "",
      valor: formataReais(valor),
      forma: forma?.rotulo || "",
    };
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
    irPara("pagar");
  };

  const mensagem = [
    `Olá! Acabei de fazer minha inscrição pelo site da ${site.nome}.`,
    ``,
    `Nome: ${form.nome}`,
    `Nascimento: ${form.nascimento ? form.nascimento.split("-").reverse().join("/") : "-"}`,
    `WhatsApp: ${form.whatsapp}`,
    form.email && `E-mail: ${form.email}`,
    `Turma: ${turma}`,
    `Plano: ${plano?.nome || "-"} (${formataReais(valor)})`,
    `Forma de pagamento: ${forma?.rotulo || "-"}`,
    menor && form.responsavel && `Responsável: ${form.responsavel}`,
    `Experiência: ${form.experiencia}`,
    form.saude && `Saúde/observações: ${form.saude}`,
    ``,
    valor > 0 && ehPix ? `Segue o comprovante do Pix.` : ``,
    valor > 0 && !ehPix ? `Vou pagar com ${(forma?.rotulo || "").toLowerCase()} na academia.` : ``,
  ]
    .filter((l) => l !== false && l !== undefined)
    .join("\n")
    // tira as linhas em branco que sobram das partes que não se aplicam
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return (
    <section className="secao secao--tinta" id="matricula">
      <div className="conteiner matricula">
        <Reveal className="matricula__info">
          <p className="rotulo rotulo--claro">Matrícula</p>
          <h2 className="titulo">{txt.titulo}</h2>
          <p className="guia">{txt.texto}</p>

          <ol className="passos">
            {PASSOS.map(([titulo, texto], i) => (
              <li key={i} className={(passo === "form" ? 0 : 1) === i ? "is-atual" : ""}>
                <span className="passos__n">{i + 1}</span>
                <div>
                  <strong>{titulo}</strong>
                  <p>{texto}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="nota nota--clara">
            Prefere conhecer antes?{" "}
            <a href={whatsappLink(site)} target="_blank" rel="noreferrer">
              Agende uma aula experimental grátis
            </a>
            .
          </p>
        </Reveal>

        <div className="mat" ref={cartao}>
          {passo === "form" ? (
            <form onSubmit={enviar}>
              <div className="mat__grid">
                <label className="campo mat__full">
                  <span>Nome completo *</span>
                  <input
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
                    inputMode="tel"
                    placeholder="(48) 99999-9999"
                    value={form.whatsapp}
                    onChange={set("whatsapp")}
                    maxLength={16}
                  />
                </label>

                <label className="campo mat__full">
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
                  <select required value={turma} onChange={set("turma")}>
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
                  <label className="campo mat__full">
                    <span>Nome do responsável *</span>
                    <input
                      required
                      value={form.responsavel}
                      onChange={set("responsavel")}
                      maxLength={120}
                    />
                  </label>
                )}

                {formas.length > 1 && (
                  <div className="campo mat__full">
                    <span>Forma de pagamento *</span>
                    <div className="mat__formas" role="radiogroup" aria-label="Forma de pagamento">
                      {formas.map((f) => (
                        <label key={f.id} className={`mat__forma ${forma?.id === f.id ? "is-on" : ""}`}>
                          <input
                            type="radio"
                            name="forma"
                            value={f.id}
                            checked={forma?.id === f.id}
                            onChange={set("forma")}
                          />
                          <span>{f.rotulo}</span>
                        </label>
                      ))}
                    </div>
                    {forma?.texto && <small className="mat__ajuda">{forma.texto}</small>}
                  </div>
                )}

                <label className="campo mat__full">
                  <span>Experiência no Jiu-Jitsu</span>
                  <select value={form.experiencia} onChange={set("experiencia")}>
                    {EXPERIENCIAS.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>

                <label className="campo mat__full">
                  <span>Lesões, problemas de saúde ou observações</span>
                  <textarea rows={2} value={form.saude} onChange={set("saude")} maxLength={600} />
                </label>
              </div>

              <input
                className="mat__isca"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.empresa}
                onChange={set("empresa")}
              />

              <label className="mat__aceite">
                <input type="checkbox" required checked={form.aceite} onChange={set("aceite")} />
                <span>{txt.termo}</span>
              </label>

              <button className="botao botao--escuro mat__enviar" type="submit" disabled={enviando}>
                {enviando ? "Enviando…" : txt.botao}
                <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </form>
          ) : (
            <div>
              <p className="rotulo">Pagamento</p>
              <h3 className="mat__titulo">
                <Linhas texto={txt.pagamentoTitulo} />
              </h3>
              {ok(txt.pagamentoTexto) && <p className="mat__texto">{txt.pagamentoTexto}</p>}
              {forma?.texto && <p className="mat__texto">{forma.texto}</p>}

              <div className="mat__resumo">
                <span>
                  {plano?.nome} · {turma}
                  {forma && ` · ${forma.rotulo}`}
                </span>
                <strong>{formataReais(valor)}</strong>
              </div>

              {ehPix && valor > 0 && (
                <div className="mat__pix">
                  {qr && (
                    <img
                      className="mat__qr"
                      src={qr}
                      alt={`QR Code Pix de ${formataReais(valor)}`}
                      width={240}
                      height={240}
                    />
                  )}

                  <div className="mat__chaves">
                    {copiaECola && (
                      <div className="mat__chave">
                        <span className="mat__rotulo">Pix copia e cola</span>
                        <code className="mat__codigo">{copiaECola}</code>
                        <BotaoCopiar texto={copiaECola} rotulo="Copiar código" />
                      </div>
                    )}

                    {pix.chaves
                      .filter((c) => ok(c.valor))
                      .map((c, i) => (
                        <div className="mat__chave" key={i}>
                          <span className="mat__rotulo">{c.tipo}</span>
                          <code className="mat__codigo">{c.valor}</code>
                          <BotaoCopiar texto={c.valor} />
                        </div>
                      ))}

                    <p className="mat__favorecido">
                      Favorecido: <strong>{pix.favorecido}</strong>
                      {ok(pix.cnpj) && <> · CNPJ {pix.cnpj}</>}
                    </p>
                  </div>
                </div>
              )}

              <a
                className="botao botao--escuro mat__enviar"
                href={whatsappLink(site, mensagem)}
                target="_blank"
                rel="noreferrer"
              >
                {ehPix ? txt.botaoComprovante : txt.botaoAviso || txt.botaoComprovante}
                <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
              </a>
              <button type="button" className="mat__voltar" onClick={() => irPara("form")}>
                Corrigir meus dados
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
