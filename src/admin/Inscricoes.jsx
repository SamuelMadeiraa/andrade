import { useEffect, useState } from "react";
import { Download, RefreshCw, Trash2, MessageCircle, ChevronDown } from "lucide-react";

const ROTULO_STATUS = { pendente: "Aguardando pagamento", pago: "Pago", cancelado: "Cancelado" };

const data = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const nascimento = (s) => (s ? s.split("-").reverse().join("/") : "—");

const idade = (s) => {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  const h = new Date();
  let a = h.getFullYear() - d.getFullYear();
  if (h < new Date(h.getFullYear(), d.getMonth(), d.getDate())) a--;
  return Number.isFinite(a) ? `${a} anos` : "";
};

/** Número brasileiro digitado de qualquer jeito → link wa.me */
const linkWhats = (tel) => {
  let n = String(tel).replace(/\D/g, "");
  if (n.length <= 11) n = "55" + n;
  return `https://wa.me/${n}`;
};

function exportarCsv(lista) {
  const colunas = [
    ["criadaEm", "Data"],
    ["status", "Status"],
    ["nome", "Nome"],
    ["nascimento", "Nascimento"],
    ["whatsapp", "WhatsApp"],
    ["email", "E-mail"],
    ["turma", "Turma"],
    ["plano", "Plano"],
    ["valor", "Valor"],
    ["forma", "Forma de pagamento"],
    ["responsavel", "Responsável"],
    ["experiencia", "Experiência"],
    ["saude", "Saúde/observações"],
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const linhas = [
    colunas.map((c) => esc(c[1])).join(";"),
    ...lista.map((i) =>
      colunas
        .map(([k]) =>
          esc(k === "criadaEm" ? data(i[k]) : k === "status" ? ROTULO_STATUS[i[k]] : i[k])
        )
        .join(";")
    ),
  ];
  // BOM para o Excel abrir com acento certo
  const blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `inscricoes-andrade-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Inscricoes({ api }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [aberta, setAberta] = useState(null);

  const carregar = async () => {
    setErro("");
    try {
      setLista(await api("GET", "/api/inscricoes"));
    } catch (e) {
      setErro(e.message);
      setLista([]);
    }
  };

  useEffect(() => {
    carregar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mudarStatus = async (id, status) => {
    setLista((l) => l.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      await api("PATCH", `/api/inscricoes/${id}`, { status });
    } catch (e) {
      setErro(e.message);
      carregar();
    }
  };

  const apagar = async (i) => {
    if (!window.confirm(`Apagar a inscrição de ${i.nome}? Não dá para desfazer.`)) return;
    try {
      await api("DELETE", `/api/inscricoes/${i.id}`);
      setLista((l) => l.filter((x) => x.id !== i.id));
    } catch (e) {
      setErro(e.message);
    }
  };

  const visiveis = (lista || []).filter((i) => filtro === "todas" || i.status === filtro);
  const conta = (s) => (lista || []).filter((i) => i.status === s).length;

  return (
    <div className="ad-insc">
      <div className="ad-insc__barra">
        <div className="ad-filtros" role="tablist">
          {[
            ["todas", `Todas (${lista?.length ?? 0})`],
            ["pendente", `Aguardando pagamento (${conta("pendente")})`],
            ["pago", `Pagas (${conta("pago")})`],
            ["cancelado", `Canceladas (${conta("cancelado")})`],
          ].map(([id, txt]) => (
            <button
              key={id}
              role="tab"
              aria-selected={filtro === id}
              className={filtro === id ? "is-on" : ""}
              onClick={() => setFiltro(id)}
            >
              {txt}
            </button>
          ))}
        </div>
        <div className="ad-insc__acoes">
          <button className="ad-btn ad-btn--ghost" onClick={carregar}>
            <RefreshCw size={15} /> Atualizar
          </button>
          <button
            className="ad-btn"
            onClick={() => exportarCsv(visiveis)}
            disabled={!visiveis.length}
          >
            <Download size={15} /> Planilha (CSV)
          </button>
        </div>
      </div>

      {erro && <p className="ad-erro">{erro}</p>}
      {lista === null && <p className="ad-vazio">Carregando…</p>}
      {lista && !visiveis.length && !erro && (
        <p className="ad-vazio">Nenhuma inscrição {filtro === "todas" ? "ainda" : "aqui"}.</p>
      )}

      <ul className="ad-insc__lista">
        {visiveis.map((i) => (
          <li key={i.id} className={`ad-aluno ad-aluno--${i.status}`}>
            <div className="ad-aluno__topo">
              <button
                className="ad-aluno__nome"
                onClick={() => setAberta(aberta === i.id ? null : i.id)}
                aria-expanded={aberta === i.id}
              >
                <ChevronDown size={16} className="ad-card__seta" />
                <strong>{i.nome}</strong>
                <span>
                  {i.turma} · {i.plano} {i.valor && `· ${i.valor}`}
                  {i.forma && ` · ${i.forma}`}
                </span>
              </button>
              <span className="ad-aluno__data">{data(i.criadaEm)}</span>
              <select
                className={`ad-status ad-status--${i.status}`}
                value={i.status}
                onChange={(e) => mudarStatus(i.id, e.target.value)}
                aria-label={`Status de ${i.nome}`}
              >
                {Object.entries(ROTULO_STATUS).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {aberta === i.id && (
              <div className="ad-aluno__corpo">
                <dl>
                  <dt>Nascimento</dt>
                  <dd>
                    {nascimento(i.nascimento)} {idade(i.nascimento) && `(${idade(i.nascimento)})`}
                  </dd>
                  <dt>WhatsApp</dt>
                  <dd>{i.whatsapp}</dd>
                  {i.email && (
                    <>
                      <dt>E-mail</dt>
                      <dd>
                        <a href={`mailto:${i.email}`}>{i.email}</a>
                      </dd>
                    </>
                  )}
                  {i.responsavel && (
                    <>
                      <dt>Responsável</dt>
                      <dd>{i.responsavel}</dd>
                    </>
                  )}
                  <dt>Forma de pagamento</dt>
                  <dd>{i.forma || "—"}</dd>
                  <dt>Experiência</dt>
                  <dd>{i.experiencia || "—"}</dd>
                  <dt>Saúde / obs.</dt>
                  <dd>{i.saude || "—"}</dd>
                </dl>
                <div className="ad-aluno__acoes">
                  <a className="ad-btn" href={linkWhats(i.whatsapp)} target="_blank" rel="noreferrer">
                    <MessageCircle size={15} /> Chamar no WhatsApp
                  </a>
                  <button className="ad-btn ad-btn--ghost ad-perigo" onClick={() => apagar(i)}>
                    <Trash2 size={15} /> Apagar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
