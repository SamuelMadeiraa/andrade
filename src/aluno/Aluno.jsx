import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Eye,
  EyeOff,
  LogOut,
  Copy,
  Check,
  Upload,
  FileText,
  KeyRound,
  Clock,
  AlertTriangle,
  CircleCheck,
} from "lucide-react";
import padrao from "../data/conteudo.json";
import { mesclar, ok, whatsappLink } from "../conteudo/Conteudo";
import Marca from "../components/Marca";
import { pixCopiaECola, valorNumero, formataReais } from "../lib/pix";
import { nomeMes, dataBR, devendo } from "../lib/mensalidades";
import "../styles/entrar.css";
import "./aluno.css";

const SENHA_MIN = 8;

/** Versões antigas guardavam a sessão no navegador; agora ela fica num cookie que a página não lê. */
function apagarSessaoAntiga() {
  try {
    window.localStorage.removeItem("andrade-aluno-sessao");
  } catch {
    /* navegação privada */
  }
}

async function chamar(metodo, url, corpo) {
  let r;
  try {
    r = await fetch(url, {
      method: metodo,
      headers: {
        ...(corpo ? { "Content-Type": "application/json" } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error("Sem conexão. Confira a internet e tente de novo.");
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw Object.assign(new Error(d.erro || "Não deu certo. Tente de novo."), { status: r.status });
  }
  return d;
}

/** Foto do celular → JPEG de até 1600px (cabe no envio); PDF vai como está. */
async function prepararComprovante(arquivo) {
  const comoDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
      leitor.readAsDataURL(blob);
    });

  if (arquivo.type === "application/pdf") {
    if (arquivo.size > 3_000_000) throw new Error("PDF grande demais (máximo 3 MB). Envie uma foto ou print.");
    return comoDataUrl(arquivo);
  }
  if (!arquivo.type.startsWith("image/")) throw new Error("Envie uma foto, print ou PDF do comprovante.");

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Não foi possível abrir essa imagem. Tente um print da tela."));
    i.src = URL.createObjectURL(arquivo);
  });
  const escala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const tela = document.createElement("canvas");
  tela.width = Math.round(img.naturalWidth * escala);
  tela.height = Math.round(img.naturalHeight * escala);
  const ctx = tela.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, tela.width, tela.height);
  ctx.drawImage(img, 0, 0, tela.width, tela.height);
  URL.revokeObjectURL(img.src);
  return tela.toDataURL("image/jpeg", 0.82);
}

/** "há 8 meses", "há 1 ano e 2 meses" */
function tempoDeCasa(entrouEm) {
  const [a, m, d] = entrouEm.split("-").map(Number);
  const h = new Date();
  let meses = (h.getFullYear() - a) * 12 + (h.getMonth() + 1 - m) - (h.getDate() < d ? 1 : 0);
  if (meses < 1) return "seu primeiro mês";
  const anos = Math.floor(meses / 12);
  meses %= 12;
  const pa = anos ? `${anos} ${anos === 1 ? "ano" : "anos"}` : "";
  const pm = meses ? `${meses} ${meses === 1 ? "mês" : "meses"}` : "";
  return `há ${[pa, pm].filter(Boolean).join(" e ")}`;
}

const porExtenso = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

/* ------------------------------------------------------------------ */

function CampoSenha({ rotulo, valor, onChange, autoComplete, autoFocus }) {
  const [ver, setVer] = useState(false);
  return (
    <label className="entrar__campo">
      <span>{rotulo}</span>
      <div className="entrar__senha">
        <input
          type={ver ? "text" : "password"}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          autoCapitalize="none"
          spellCheck={false}
        />
        <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Esconder senha" : "Mostrar senha"}>
          {ver ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

function Login({ onEntrar, site }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [indo, setIndo] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setErro("");
    setIndo(true);
    try {
      const r = await chamar("POST", "/api/aluno/login", { login, senha });
      onEntrar(r);
    } catch (err) {
      setErro(err.message);
      setIndo(false);
    }
  };

  return (
    <div className="entrar">
      <div className="entrar__tela">
        <form className="entrar__form" onSubmit={entrar}>
          <p className="entrar__papel">Área do aluno</p>
          <h1>Entrar</h1>
          <label className="entrar__campo">
            <span>Celular com DDD</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="username"
              placeholder="48 99999-9999"
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </label>
          <CampoSenha rotulo="Senha" valor={senha} onChange={setSenha} autoComplete="current-password" />
          {erro && (
            <p className="entrar__erro" role="alert">
              {erro}
            </p>
          )}
          <button className="entrar__btn" disabled={indo || !login || !senha}>
            {indo ? "Entrando…" : "Entrar"}
          </button>
          <p className="entrar__texto">
            Primeiro acesso? Use a senha temporária que o professor te enviou.{" "}
            <a href={whatsappLink(site, "Olá! Preciso de acesso à área do aluno.")} target="_blank" rel="noreferrer">
              Não tenho senha
            </a>
          </p>
        </form>
        <p className="entrar__rodape">
          <a href="/">← Voltar para o site</a>
          <a href="/admin">Sou professor →</a>
        </p>
      </div>
    </div>
  );
}

/** Primeiro acesso (obrigatória) ou troca voluntária (pede a senha atual). */
function CriarSenha({ nome, primeira, onPronto, onCancelar }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [de_novo, setDeNovo] = useState("");
  const [erro, setErro] = useState("");
  const [indo, setIndo] = useState(false);

  const salvar = async (e) => {
    e.preventDefault();
    if (nova.length < SENHA_MIN) return setErro(`Use pelo menos ${SENHA_MIN} caracteres.`);
    if (nova !== de_novo) return setErro("As duas senhas não estão iguais.");
    setErro("");
    setIndo(true);
    try {
      onPronto(await chamar("POST", "/api/aluno/senha", { atual, nova }));
    } catch (err) {
      setErro(err.message);
      setIndo(false);
    }
  };

  return (
    <div className="entrar">
      <div className="entrar__tela">
        <form className="entrar__form" onSubmit={salvar}>
          <p className="entrar__papel">{primeira ? `Bem-vindo(a)${nome ? `, ${nome}` : ""}` : "Área do aluno"}</p>
          <h1>{primeira ? "Crie sua senha" : "Trocar senha"}</h1>
          {primeira && (
            <p className="entrar__texto">
              A senha temporária serviu só para este primeiro acesso. Escolha uma senha sua.
            </p>
          )}
          {!primeira && (
            <CampoSenha rotulo="Senha atual" valor={atual} onChange={setAtual} autoComplete="current-password" autoFocus />
          )}
          <CampoSenha rotulo="Nova senha" valor={nova} onChange={setNova} autoComplete="new-password" autoFocus={primeira} />
          <CampoSenha rotulo="Repita a nova senha" valor={de_novo} onChange={setDeNovo} autoComplete="new-password" />
          {erro && (
            <p className="entrar__erro" role="alert">
              {erro}
            </p>
          )}
          <button className="entrar__btn" disabled={indo || !nova || !de_novo}>
            {indo ? "Salvando…" : "Salvar senha"}
          </button>
          {onCancelar && (
            <button type="button" className="entrar__btn entrar__btn--ghost" onClick={onCancelar}>
              Cancelar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Pagar({ linha, alunoId, pix, onPago }) {
  const [qr, setQr] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef(null);

  const valor = valorNumero(linha.valor);
  const [ano, mes] = linha.mes.split("-");
  const codigo =
    valor > 0 && ok(pix.chaveQrCode)
      ? pixCopiaECola({
          chave: pix.chaveQrCode,
          nome: pix.favorecido,
          cidade: pix.cidade,
          valor,
          descricao: `Mensalidade ${mes} ${ano}`,
        })
      : "";

  useEffect(() => {
    setQr("");
    if (!codigo) return;
    let vivo = true;
    QRCode.toDataURL(codigo, { margin: 1, width: 480, errorCorrectionLevel: "M" })
      .then((u) => vivo && setQr(u))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [codigo]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };

  const enviar = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErro("");
    setEnviando(true);
    try {
      const dataUrl = await prepararComprovante(f);
      onPago(await chamar("POST", "/api/aluno/comprovante", { alunoId, mes: linha.mes, dataUrl }));
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="al-pagar" aria-label={`Pagar ${nomeMes(linha.mes)}`}>
      <ol className="al-passos">
        <li>
          <h3>Pague {formataReais(valor)} no Pix</h3>
          {codigo ? (
            <>
              {qr && <img className="al-qr" src={qr} alt="QR Code do Pix" width="220" height="220" />}
              <p className="al-dica">Aponte a câmera do app do banco, ou use o copia e cola:</p>
              <code className="al-codigo">{codigo}</code>
              <button className="al-btn al-btn--ghost" onClick={copiar}>
                {copiado ? <Check size={16} /> : <Copy size={16} />}
                {copiado ? "Código copiado" : "Copiar código Pix"}
              </button>
            </>
          ) : (
            <ul className="al-chaves">
              {(pix.chaves || [])
                .filter((c) => ok(c.valor))
                .map((c, i) => (
                  <li key={i}>
                    <span>{c.tipo}</span> {c.valor}
                  </li>
                ))}
            </ul>
          )}
          {ok(pix.favorecido) && (
            <p className="al-dica">
              Favorecido: <strong>{pix.favorecido}</strong>
              {ok(pix.cnpj) && <> · CNPJ {pix.cnpj}</>}
            </p>
          )}
        </li>
        <li>
          <h3>Envie o comprovante</h3>
          <p className="al-dica">
            Foto, print ou PDF. Assim que você enviar, {nomeMes(linha.mes).split(" de ")[0]} fica como paga e o professor recebe o comprovante.
          </p>
          <input ref={arquivo} type="file" accept="image/*,application/pdf" hidden onChange={enviar} />
          <button className="al-btn" onClick={() => arquivo.current?.click()} disabled={enviando}>
            <Upload size={16} /> {enviando ? "Enviando…" : "Enviar comprovante"}
          </button>
          {erro && (
            <p className="al-erro" role="alert">
              {erro}
            </p>
          )}
        </li>
      </ol>
    </section>
  );
}

const SELO = {
  pago: ["ok", "Paga", CircleCheck],
  conferir: ["ok", "Paga · em conferência", CircleCheck],
  aberto: ["neutro", "Em aberto", Clock],
  atrasado: ["alerta", "Atrasada", AlertTriangle],
  recusado: ["alerta", "Comprovante recusado", AlertTriangle],
};

function Selo({ linha }) {
  const [tom, texto, Icone] = SELO[linha.status === "pago" && !linha.conferido ? "conferir" : linha.status];
  return (
    <span className={`al-selo al-selo--${tom}`}>
      <Icone size={14} /> {texto}
    </span>
  );
}

/** Tudo de UM aluno: ficha, resumo e mensalidades. */
function PainelAluno({ item, pix, onDados }) {
  const { aluno, mensalidades: meses } = item;
  const abertas = devendo(meses);
  // a mais antiga em aberto vem aberta para pagar
  const [pagando, setPagando] = useState(() => abertas.at(-1)?.mes || null);
  const [erro, setErro] = useState("");
  const total = abertas.reduce((s, m) => s + valorNumero(m.valor), 0);

  const verComprovante = async (mes) => {
    setErro("");
    const aba = window.open("", "_blank");
    try {
      const r = await fetch(`/api/aluno/comprovante/${aluno.id}/${mes}`);
      if (!r.ok) throw new Error();
      const url = URL.createObjectURL(await r.blob());
      if (aba) aba.location = url;
      else window.location.assign(url);
    } catch {
      aba?.close();
      setErro("Não foi possível abrir o comprovante.");
    }
  };

  return (
    <>
      <section className="al-ola">
        <p className="al-eyebrow">Área do aluno</p>
        <h1>{aluno.nome}</h1>
        <dl className="al-ficha">
          <div>
            <dt>Na academia desde</dt>
            <dd>
              {porExtenso(aluno.entrouEm)}
              <small>{tempoDeCasa(aluno.entrouEm)}</small>
            </dd>
          </div>
          {aluno.faixa && (
            <div>
              <dt>Faixa</dt>
              <dd>{aluno.faixa}</dd>
            </div>
          )}
          {aluno.turma && (
            <div>
              <dt>Turma</dt>
              <dd>{aluno.turma}</dd>
            </div>
          )}
          <div>
            <dt>Plano</dt>
            <dd>
              {aluno.plano || "Mensal"}
              <small>
                {formataReais(aluno.valor)} · vence todo dia {aluno.vencimento || 10}
              </small>
            </dd>
          </div>
        </dl>
      </section>

      <section className={`al-resumo ${abertas.length ? "" : "al-resumo--ok"}`}>
        {abertas.length ? (
          <>
            <p>
              {abertas.length === 1 ? "1 mensalidade em aberto" : `${abertas.length} mensalidades em aberto`}
            </p>
            <strong>{formataReais(total)}</strong>
          </>
        ) : (
          <>
            <CircleCheck size={28} />
            <div>
              <strong>Tudo em dia</strong>
              <p>Nenhuma mensalidade em aberto. Bons treinos!</p>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="al-titulo">Mensalidades</h2>
        {erro && (
          <p className="al-erro" role="alert">
            {erro}
          </p>
        )}
        {!meses.length && <p className="al-dica">As mensalidades aparecem aqui a partir da data de entrada.</p>}
        <ul className="al-meses">
          {meses.map((m) => (
            <li key={m.mes} className={`al-mes al-mes--${m.status}`}>
              <div className="al-mes__topo">
                <div>
                  <strong>{nomeMes(m.mes)}</strong>
                  <span>
                    {formataReais(m.valor)} · vence {dataBR(m.vencimento)}
                  </span>
                </div>
                <Selo linha={m} />
              </div>

              {m.status === "recusado" && (
                <p className="al-dica">
                  O professor não conseguiu confirmar o comprovante enviado. Confira o pagamento e envie de novo.
                </p>
              )}

              <div className="al-mes__acoes">
                {m.status !== "pago" && pagando !== m.mes && (
                  <button className="al-btn" onClick={() => setPagando(m.mes)}>
                    Pagar agora
                  </button>
                )}
                {m.status !== "pago" && pagando === m.mes && abertas.length > 1 && (
                  <button className="al-link" onClick={() => setPagando(null)}>
                    Fechar
                  </button>
                )}
                {m.temComprovante && (
                  <button className="al-link" onClick={() => verComprovante(m.mes)}>
                    <FileText size={14} /> Ver comprovante
                  </button>
                )}
              </div>

              {m.status !== "pago" && pagando === m.mes && (
                <Pagar
                  linha={m}
                  alunoId={aluno.id}
                  pix={pix}
                  onPago={(d) => {
                    onDados(d);
                    const eu = d.alunos.find((x) => x.aluno.id === aluno.id);
                    setPagando(devendo(eu?.mensalidades || []).at(-1)?.mes || null);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

const primeiroNome = (nome) => String(nome).trim().split(/\s+/)[0];

/** A moldura: topo, troca entre os alunos da conta (família) e rodapé. */
function Painel({ dados, pix, site, onDados, onSair, onTrocarSenha }) {
  const itens = dados.alunos;
  // abre em quem tem mensalidade em aberto; se ninguém tem, no primeiro
  const [escolhido, setEscolhido] = useState(
    () => (itens.find((x) => devendo(x.mensalidades).length) || itens[0]).aluno.id
  );
  const item = itens.find((x) => x.aluno.id === escolhido) || itens[0];

  return (
    <div className="al">
      <header className="al-topo">
        <a href="/" className="al-topo__marca" aria-label="Academia Andrade — site">
          <Marca size={38} on="ink" />
          <span>
            Andrade<b>BJJ</b>
          </span>
        </a>
        <button className="al-topo__sair" onClick={onSair}>
          <LogOut size={16} /> Sair
        </button>
      </header>

      <main className="al-corpo">
        {itens.length > 1 && (
          <nav className="al-familia" aria-label="Alunos desta conta">
            <p className="al-eyebrow">Sua família na academia</p>
            <div className="al-familia__lista" role="tablist">
              {itens.map((x) => {
                const n = devendo(x.mensalidades).length;
                return (
                  <button
                    key={x.aluno.id}
                    role="tab"
                    aria-selected={x.aluno.id === item.aluno.id}
                    className={x.aluno.id === item.aluno.id ? "is-on" : ""}
                    onClick={() => setEscolhido(x.aluno.id)}
                  >
                    <strong>{primeiroNome(x.aluno.nome)}</strong>
                    <span className={n ? "is-devendo" : ""}>{n ? `${n} em aberto` : "em dia"}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* a chave refaz o painel ao trocar de aluno: o Pix aberto é sempre o de quem está na tela */}
        <PainelAluno key={item.aluno.id} item={item} pix={pix} onDados={onDados} />

        <footer className="al-rodape">
          <button className="al-link" onClick={onTrocarSenha}>
            <KeyRound size={14} /> Trocar minha senha
          </button>
          <a className="al-link" href={whatsappLink(site, "Olá! Sou aluno e preciso de ajuda com a área do aluno.")} target="_blank" rel="noreferrer">
            Falar com a academia
          </a>
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function Aluno() {
  // null = conferindo se a sessão (cookie) ainda vale
  const [logado, setLogado] = useState(null);
  const [dados, setDados] = useState(null);
  const [conteudo, setConteudo] = useState(padrao);
  const [trocando, setTrocando] = useState(false);
  const [falha, setFalha] = useState("");

  useEffect(() => {
    document.title = "Área do aluno — Andrade BJJ";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  // chave Pix e contatos vêm do conteúdo que o professor edita no painel
  useEffect(() => {
    fetch("/api/conteudo", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setConteudo(mesclar(padrao, d)))
      .catch(() => {});
  }, []);

  const sair = useCallback(() => {
    chamar("POST", "/api/aluno/sair").catch(() => {});
    setLogado(false);
    setDados(null);
    setTrocando(false);
  }, []);

  const entrou = (r) => {
    setLogado(true);
    setDados(r);
    setTrocando(false);
  };

  // abriu a página: a sessão do cookie ainda vale?
  useEffect(() => {
    apagarSessaoAntiga();
    let vivo = true;
    chamar("GET", "/api/aluno/eu")
      .then((d) => {
        if (!vivo) return;
        setDados(d);
        setLogado(true);
      })
      .catch((e) => {
        if (!vivo) return;
        if (e.status === 401) setLogado(false);
        else setFalha(e.message);
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (logado === false) return <Login onEntrar={entrou} site={conteudo.site} />;

  if (!dados) {
    return (
      <div className="entrar">
        <div className="entrar__tela">
          <div className="entrar__form">
            <p className="entrar__texto" role="status">
              {falha || "Carregando…"}
            </p>
            {falha && (
              <button className="entrar__btn entrar__btn--ghost" onClick={() => window.location.reload()}>
                Tentar de novo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (dados.trocarSenha || trocando) {
    return (
      <CriarSenha
        nome={dados.alunos.length === 1 ? primeiroNome(dados.alunos[0].aluno.nome) : ""}
        primeira={dados.trocarSenha}
        onPronto={entrou}
        onCancelar={dados.trocarSenha ? null : () => setTrocando(false)}
      />
    );
  }

  return (
    <Painel
      dados={dados}
      pix={conteudo.pix}
      site={conteudo.site}
      onDados={setDados}
      onSair={sair}
      onTrocarSenha={() => setTrocando(true)}
    />
  );
}
