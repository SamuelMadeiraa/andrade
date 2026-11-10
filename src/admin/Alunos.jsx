import { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  RefreshCw,
  ChevronDown,
  MessageCircle,
  KeyRound,
  Trash2,
  Pencil,
  Check,
  X,
  FileText,
  Undo2,
  Copy,
  Search,
} from "lucide-react";
import { turmasDaGrade } from "../conteudo/Conteudo";
import { formataReais, valorNumero } from "../lib/pix";
import { mensalidades, situacao, devendo, nomeMes, dataBR, hojeBR, loginDe } from "../lib/mensalidades";

const SITUACAO = {
  conferir: "Comprovante a conferir",
  atrasado: "Atrasado",
  aberto: "Em aberto",
  emdia: "Em dia",
  inativo: "Inativo",
};

const STATUS_MES = { pago: "Pago", recusado: "Comprovante recusado", atrasado: "Atrasado", aberto: "Em aberto" };

const linkWhats = (tel, msg) =>
  `https://wa.me/55${loginDe(tel)}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

const primeiroNome = (nome) => String(nome).trim().split(/\s+/)[0];

const VAZIO = {
  nome: "",
  whatsapp: "",
  email: "",
  nascimento: "",
  turma: "",
  plano: "",
  valor: "",
  vencimento: 10,
  entrouEm: "",
  faixa: "",
  obs: "",
  ativo: true,
};

/* ------------------------------------------------------------------ */

/**
 * Cadastra/edita e, se o celular já for login de outro aluno, pergunta se é a
 * mesma família antes de repetir com `familia: true`. Devolve null se o
 * professor desistir.
 */
export async function comFamilia(chamar, corpo) {
  try {
    return await chamar(corpo);
  } catch (e) {
    if (e.status !== 409 || !e.dados?.familia) throw e;
    const nomes = e.dados.familia.join(", ");
    const ok = window.confirm(
      `Esse celular já é o login de ${nomes}.\n\n` +
        `Cadastrar ${corpo.nome || "este aluno"} na mesma conta (família)? ` +
        "Quem entra com esse celular passa a ver e pagar as mensalidades de todos, com a mesma senha."
    );
    return ok ? chamar({ ...corpo, familia: true }) : null;
  }
}

/** Login + senha temporária, mostrados uma única vez ao professor. */
export function AcessoCriado({ acesso, onFechar }) {
  const [copiado, setCopiado] = useState(false);
  if (!acesso.senhaTemporaria) {
    const outros = (acesso.aluno.familia || []).map((x) => x.nome);
    return (
      <div className="ad-acesso" role="status">
        <p>
          <strong>{acesso.aluno.nome}</strong> entrou na conta da família
          {outros.length ? ` (${outros.join(", ")})` : ""}.
        </p>
        <p>
          Não tem senha nova: quem já entra com o celular {acesso.aluno.login} passa a ver também as
          mensalidades de {primeiroNome(acesso.aluno.nome)}, com a mesma senha.
        </p>
        <div className="ad-aluno__acoes">
          <button className="ad-btn ad-btn--ghost" onClick={onFechar}>
            Entendi
          </button>
        </div>
      </div>
    );
  }
  const familia = (acesso.aluno.familia || []).map((x) => primeiroNome(x.nome));
  const quem = familia.length
    ? `Olá! Acesso à área do aluno da Academia Andrade (${[primeiroNome(acesso.aluno.nome), ...familia].join(", ")}):`
    : `Olá, ${primeiroNome(acesso.aluno.nome)}! Seu acesso à área do aluno da Academia Andrade:`;
  const endereco = `${window.location.origin}/aluno`;
  const msg =
    `${quem}\n\n` +
    `${endereco}\n` +
    `Login (seu celular): ${acesso.aluno.login}\n` +
    `Senha temporária: ${acesso.senhaTemporaria}\n\n` +
    `No primeiro acesso você cria a sua própria senha. Por lá você vê suas mensalidades, paga no Pix e envia o comprovante.`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sem permissão de área de transferência: o professor copia na mão */
    }
  };

  return (
    <div className="ad-acesso" role="status">
      <p>
        <strong>Acesso de {acesso.aluno.nome}</strong>
        {acesso.aluno.familia?.length ? ` e da família (${acesso.aluno.familia.map((x) => x.nome).join(", ")})` : ""} —
        anote ou envie agora: a senha temporária não aparece de novo.
      </p>
      <dl>
        <dt>Endereço</dt>
        <dd>{endereco}</dd>
        <dt>Login</dt>
        <dd>{acesso.aluno.login}</dd>
        <dt>Senha temporária</dt>
        <dd className="ad-acesso__senha">{acesso.senhaTemporaria}</dd>
      </dl>
      <div className="ad-aluno__acoes">
        <a className="ad-btn" href={linkWhats(acesso.aluno.whatsapp, msg)} target="_blank" rel="noreferrer">
          <MessageCircle size={15} /> Enviar no WhatsApp
        </a>
        <button className="ad-btn ad-btn--ghost" onClick={copiar}>
          <Copy size={15} /> {copiado ? "Copiado" : "Copiar mensagem"}
        </button>
        <button className="ad-btn ad-btn--ghost" onClick={onFechar}>
          Já enviei
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Ficha({ inicial, conteudo, onSalvar, onCancelar, novo }) {
  const [f, setF] = useState({ ...VAZIO, entrouEm: hojeBR(), ...inicial });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const turmas = turmasDaGrade(conteudo.horarios);
  const planos = (conteudo.planos?.itens || []).filter((p) => !p.gratis);
  const campo = (k) => ({
    value: f[k] ?? "",
    onChange: (e) => setF((x) => ({ ...x, [k]: e.target.value })),
  });

  const escolherPlano = (e) => {
    const p = planos.find((x) => x.nome === e.target.value);
    setF((x) => ({ ...x, plano: e.target.value, valor: p ? p.valorPix || p.preco : x.valor }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const feito = await onSalvar(f);
      if (feito === null) setSalvando(false); // desistiu de juntar na família
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <form className="ad-ficha" onSubmit={enviar}>
      <label className="ad-campo ad-ficha__largo">
        <span className="ad-rotulo">Nome completo</span>
        <input type="text" required autoFocus={novo} {...campo("nome")} />
      </label>
      <label className="ad-campo">
        <span className="ad-rotulo">Celular (WhatsApp) com DDD</span>
        <input type="text" inputMode="tel" required placeholder="48 99999-9999" {...campo("whatsapp")} />
        <span className="ad-dica">É o login do aluno.</span>
      </label>
      <label className="ad-campo">
        <span className="ad-rotulo">E-mail</span>
        <input type="text" inputMode="email" {...campo("email")} />
      </label>
      <label className="ad-campo">
        <span className="ad-rotulo">Entrou na academia em</span>
        <input type="date" required {...campo("entrouEm")} />
        <span className="ad-dica">As mensalidades contam a partir deste mês.</span>
      </label>
      <label className="ad-campo">
        <span className="ad-rotulo">Nascimento</span>
        <input type="date" {...campo("nascimento")} />
      </label>
      <label className="ad-campo">
        <span className="ad-rotulo">Plano</span>
        <select value={f.plano} onChange={escolherPlano}>
          <option value="">—</option>
          {planos.map((p) => (
            <option key={p.nome}>{p.nome}</option>
          ))}
          {f.plano && !planos.some((p) => p.nome === f.plano) && <option>{f.plano}</option>}
        </select>
      </label>
      <label className="ad-campo">
        <span className="ad-rotulo">Mensalidade (R$)</span>
        <input type="text" inputMode="decimal" required placeholder="129,90" {...campo("valor")} />
      </label>
      <label className="ad-campo">
        <span className="ad-rotulo">Dia do vencimento</span>
        <input type="number" min="1" max="28" required {...campo("vencimento")} />
      </label>
      <label className="ad-campo">
        <span className="ad-rotulo">Turma</span>
        <input type="text" list="ad-turmas" {...campo("turma")} />
        <datalist id="ad-turmas">
          {turmas.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
      <label className="ad-campo">
        <span className="ad-rotulo">Faixa</span>
        <input type="text" placeholder="Branca, 2 graus" {...campo("faixa")} />
      </label>
      <label className="ad-campo ad-ficha__largo">
        <span className="ad-rotulo">Observações (só o professor vê)</span>
        <textarea rows={2} {...campo("obs")} />
      </label>
      {!novo && (
        <label className="ad-ficha__largo ad-ficha__check">
          <input
            type="checkbox"
            checked={f.ativo !== false}
            onChange={(e) => setF((x) => ({ ...x, ativo: e.target.checked }))}
          />
          Aluno ativo (inativo não entra no painel nem gera mensalidade em aberto)
        </label>
      )}
      {erro && <p className="ad-erro ad-ficha__largo">{erro}</p>}
      <div className="ad-aluno__acoes ad-ficha__largo">
        <button className="ad-btn" disabled={salvando}>
          {salvando ? "Salvando…" : novo ? "Cadastrar e gerar acesso" : "Salvar"}
        </button>
        <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

export default function Alunos({ api, conteudo }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(null);
  const [editando, setEditando] = useState(null); // id | "novo"
  const [acesso, setAcesso] = useState(null);

  const carregar = async () => {
    setErro("");
    try {
      setLista(await api("GET", "/api/alunos"));
    } catch (e) {
      setErro(e.message);
      setLista([]);
    }
  };

  useEffect(() => {
    carregar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const trocar = (aluno) => setLista((l) => l.map((x) => (x.id === aluno.id ? aluno : x)));

  const tentar = async (fn) => {
    setErro("");
    try {
      await fn();
    } catch (e) {
      setErro(e.message);
    }
  };

  const hoje = hojeBR();
  const mesAtual = hoje.slice(0, 7);

  // cada aluno com suas mensalidades e a situação já calculadas
  const alunos = useMemo(
    () =>
      (lista || []).map((a) => {
        const meses = mensalidades(a, hoje);
        return { a, meses, sit: a.ativo === false ? "inativo" : situacao(meses) };
      }),
    [lista, hoje]
  );

  const ativos = alunos.filter((x) => x.sit !== "inativo");
  const conta = (s) => alunos.filter((x) => x.sit === s).length;
  const recebido = ativos.reduce((t, x) => {
    const p = x.a.pagamentos?.[mesAtual];
    return t + (p?.status === "pago" ? valorNumero(p.valor || x.a.valor) : 0);
  }, 0);
  const aReceber = ativos.reduce(
    (t, x) => t + devendo(x.meses).reduce((s, m) => s + valorNumero(m.valor), 0),
    0
  );

  const termo = busca.trim().toLowerCase();
  const visiveis = alunos.filter(
    (x) =>
      (filtro === "todos" ? x.sit !== "inativo" : x.sit === filtro) &&
      (!termo || `${x.a.nome} ${x.a.login} ${x.a.turma}`.toLowerCase().includes(termo))
  );

  /* ---------- ações ---------- */

  // família muda a ficha dos irmãos também: depois de cadastrar/editar, recarrega a lista
  const cadastrar = async (f) => {
    const r = await comFamilia((c) => api("POST", "/api/alunos", c), f);
    if (!r) return null;
    await carregar();
    setEditando(null);
    setAcesso(r);
    setAberto(r.aluno.id);
  };

  const salvar = (id) => async (f) => {
    // a ficha veio do aluno: a lista de irmãos não pode ir como "confirmo a família"
    const { familia, senhaTemporaria, ...corpo } = f; // eslint-disable-line no-unused-vars
    const r = await comFamilia((c) => api("PATCH", `/api/alunos/${id}`, c), corpo);
    if (!r) return null;
    await carregar();
    setEditando(null);
    // mudou para um celular só dele: conta nova, com senha temporária para enviar
    if (r.senhaTemporaria) setAcesso(r);
  };

  const novaSenha = (a) =>
    tentar(async () => {
      const familia = a.familia?.length ? ` A conta é da família: vale também para ${a.familia.map((x) => x.nome).join(", ")}.` : "";
      if (!window.confirm(`Gerar nova senha temporária para ${a.nome}? A senha atual deixa de valer.${familia}`)) return;
      const r = await api("POST", `/api/alunos/${a.id}/senha`);
      await carregar();
      setAcesso(r);
    });

  const apagar = (a) =>
    tentar(async () => {
      if (!window.confirm(`Apagar ${a.nome}, com todo o histórico e comprovantes? Não dá para desfazer.`)) return;
      await api("DELETE", `/api/alunos/${a.id}`);
      if (a.familia?.length) await carregar();
      else setLista((l) => l.filter((x) => x.id !== a.id));
    });

  const pagamento = (a, mes, acao) =>
    tentar(async () => {
      if (acao === "recusar" && !window.confirm("Recusar este comprovante? A mensalidade volta a ficar em aberto para o aluno.")) return;
      const r = await api("PUT", `/api/alunos/${a.id}/pagamentos/${mes}`, { acao });
      trocar(r.aluno);
    });

  // o comprovante é privado: busca com a sessão do professor (cookie) e abre numa aba
  const verComprovante = (a, mes) =>
    tentar(async () => {
      const aba = window.open("", "_blank");
      const r = await fetch(`/api/alunos/${a.id}/comprovante/${mes}`);
      if (!r.ok) {
        aba?.close();
        throw new Error("Não foi possível abrir o comprovante.");
      }
      const url = URL.createObjectURL(await r.blob());
      if (aba) aba.location = url;
      else window.location.assign(url);
    });

  const cobranca = (a, meses) => {
    const abertos = devendo(meses);
    const total = abertos.reduce((s, m) => s + valorNumero(m.valor), 0);
    return (
      `Olá, ${primeiroNome(a.nome)}! Passando para lembrar da mensalidade da Academia Andrade: ` +
      `${abertos.map((m) => nomeMes(m.mes)).reverse().join(", ")} — ${formataReais(total)}.\n\n` +
      `Dá para pagar no Pix e enviar o comprovante pela área do aluno: ${window.location.origin}/aluno`
    );
  };

  /* ---------- tela ---------- */

  return (
    <div className="ad-insc">
      <div className="ad-resumo">
        <div>
          <strong>{ativos.length}</strong>
          <span>alunos ativos</span>
        </div>
        <div>
          <strong>{formataReais(recebido)}</strong>
          <span>recebido em {nomeMes(mesAtual).split(" de ")[0]}</span>
        </div>
        <div className={aReceber > 0 ? "is-alerta" : ""}>
          <strong>{formataReais(aReceber)}</strong>
          <span>a receber</span>
        </div>
        <button
          className={conta("conferir") ? "is-alerta" : ""}
          onClick={() => setFiltro("conferir")}
          title="Ver os comprovantes a conferir"
        >
          <strong>{conta("conferir")}</strong>
          <span>comprovantes a conferir</span>
        </button>
      </div>

      <div className="ad-insc__barra">
        <div className="ad-filtros" role="tablist">
          {[
            ["todos", `Ativos (${ativos.length})`],
            ["conferir", `A conferir (${conta("conferir")})`],
            ["atrasado", `Atrasados (${conta("atrasado")})`],
            ["aberto", `Em aberto (${conta("aberto")})`],
            ["emdia", `Em dia (${conta("emdia")})`],
            ["inativo", `Inativos (${conta("inativo")})`],
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
          <button className="ad-btn" onClick={() => setEditando("novo")}>
            <UserPlus size={15} /> Novo aluno
          </button>
        </div>
      </div>

      <label className="ad-busca">
        <Search size={15} />
        <input
          type="text"
          placeholder="Buscar por nome, celular ou turma"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar aluno"
        />
      </label>

      {erro && <p className="ad-erro">{erro}</p>}
      {acesso && <AcessoCriado acesso={acesso} onFechar={() => setAcesso(null)} />}

      {editando === "novo" && (
        <fieldset className="ad-grupo">
          <legend>Novo aluno</legend>
          <Ficha novo conteudo={conteudo} onSalvar={cadastrar} onCancelar={() => setEditando(null)} />
        </fieldset>
      )}

      {lista === null && <p className="ad-vazio">Carregando…</p>}
      {lista && !visiveis.length && !erro && (
        <p className="ad-vazio">
          {lista.length
            ? "Nenhum aluno aqui."
            : "Nenhum aluno cadastrado ainda. Use “Novo aluno” ou, numa inscrição recebida, “Tornar aluno”."}
        </p>
      )}

      <ul className="ad-insc__lista">
        {visiveis.map(({ a, meses, sit }) => (
          <li key={a.id} className={`ad-aluno ad-aluno--${sit}`}>
            <div className="ad-aluno__topo">
              <button
                className="ad-aluno__nome"
                onClick={() => setAberto(aberto === a.id ? null : a.id)}
                aria-expanded={aberto === a.id}
              >
                <ChevronDown size={16} className="ad-card__seta" />
                <strong>{a.nome}</strong>
                <span>
                  {[a.turma, a.plano, a.valor && formataReais(a.valor), a.familia?.length && "família"]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
              <span className="ad-aluno__data">desde {dataBR(a.entrouEm)}</span>
              <span className={`ad-selo ad-selo--${sit}`}>{SITUACAO[sit]}</span>
            </div>

            {aberto === a.id && (
              <div className="ad-aluno__corpo">
                {editando === a.id ? (
                  <Ficha
                    inicial={a}
                    conteudo={conteudo}
                    onSalvar={salvar(a.id)}
                    onCancelar={() => setEditando(null)}
                  />
                ) : (
                  <>
                    <dl>
                      <dt>Login (celular)</dt>
                      <dd>
                        {a.login}
                        {a.senhaTemporaria && " · ainda com a senha temporária"}
                      </dd>
                      {a.familia?.length > 0 && (
                        <>
                          <dt>Conta da família</dt>
                          <dd>
                            divide o login com {a.familia.map((x) => x.nome).join(", ")}
                          </dd>
                        </>
                      )}
                      <dt>Vencimento</dt>
                      <dd>todo dia {a.vencimento || 10}</dd>
                      {a.faixa && (
                        <>
                          <dt>Faixa</dt>
                          <dd>{a.faixa}</dd>
                        </>
                      )}
                      {a.email && (
                        <>
                          <dt>E-mail</dt>
                          <dd>
                            <a href={`mailto:${a.email}`}>{a.email}</a>
                          </dd>
                        </>
                      )}
                      {a.nascimento && (
                        <>
                          <dt>Nascimento</dt>
                          <dd>{dataBR(a.nascimento)}</dd>
                        </>
                      )}
                      {a.obs && (
                        <>
                          <dt>Observações</dt>
                          <dd>{a.obs}</dd>
                        </>
                      )}
                    </dl>

                    <table className="ad-meses">
                      <thead>
                        <tr>
                          <th>Mensalidade</th>
                          <th>Vencimento</th>
                          <th>Situação</th>
                          <th aria-label="Ações" />
                        </tr>
                      </thead>
                      <tbody>
                        {meses.map((m) => (
                          <tr key={m.mes}>
                            <td>
                              <strong>{nomeMes(m.mes)}</strong>
                              <small>{formataReais(m.valor)}</small>
                            </td>
                            <td>{dataBR(m.vencimento)}</td>
                            <td>
                              <span
                                className={`ad-selo ad-selo--${
                                  m.status === "pago" ? (m.conferido ? "emdia" : "conferir") : m.status === "aberto" ? "aberto" : "atrasado"
                                }`}
                              >
                                {m.status === "pago" && !m.conferido ? "Pago · a conferir" : STATUS_MES[m.status]}
                              </span>
                              {m.enviadoEm && <small>comprovante em {dataBR(m.enviadoEm)}</small>}
                            </td>
                            <td className="ad-meses__acoes">
                              {m.temComprovante && (
                                <button className="ad-btn ad-btn--ghost" onClick={() => verComprovante(a, m.mes)}>
                                  <FileText size={14} /> Ver comprovante
                                </button>
                              )}
                              {m.status === "pago" && !m.conferido && (
                                <>
                                  <button className="ad-btn" onClick={() => pagamento(a, m.mes, "confirmar")}>
                                    <Check size={14} /> Confirmar
                                  </button>
                                  <button
                                    className="ad-btn ad-btn--ghost ad-perigo"
                                    onClick={() => pagamento(a, m.mes, "recusar")}
                                  >
                                    <X size={14} /> Recusar
                                  </button>
                                </>
                              )}
                              {m.status !== "pago" && (
                                <button className="ad-btn" onClick={() => pagamento(a, m.mes, "pagar")}>
                                  <Check size={14} /> Dar baixa
                                </button>
                              )}
                              {m.status === "pago" && m.conferido && (
                                <button
                                  className="ad-btn ad-btn--ghost"
                                  onClick={() => pagamento(a, m.mes, "reabrir")}
                                  title="Voltar para em aberto"
                                >
                                  <Undo2 size={14} /> Desfazer
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!meses.length && (
                          <tr>
                            <td colSpan={4}>Ainda sem mensalidades (a data de entrada é futura).</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="ad-aluno__acoes">
                      <a
                        className="ad-btn"
                        href={linkWhats(a.whatsapp, devendo(meses).length ? cobranca(a, meses) : "")}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={15} />
                        {devendo(meses).length ? "Cobrar no WhatsApp" : "Chamar no WhatsApp"}
                      </a>
                      <button className="ad-btn ad-btn--ghost" onClick={() => setEditando(a.id)}>
                        <Pencil size={15} /> Editar
                      </button>
                      <button className="ad-btn ad-btn--ghost" onClick={() => novaSenha(a)}>
                        <KeyRound size={15} /> Nova senha temporária
                      </button>
                      <button className="ad-btn ad-btn--ghost ad-perigo" onClick={() => apagar(a)}>
                        <Trash2 size={15} /> Apagar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
