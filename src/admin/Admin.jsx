import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Save,
  ExternalLink,
  LogOut,
  Download,
  Eye,
  EyeOff,
  Users,
  Wallet,
  Menu as MenuIcon,
  RotateCcw,
} from "lucide-react";
import padrao from "../data/conteudo.json";
import { mesclar } from "../conteudo/Conteudo";
import { Objeto, GradeHorarios } from "./Editor";
import Inscricoes from "./Inscricoes";
import Alunos from "./Alunos";
import BotaoInstalar from "../components/BotaoInstalar";
import "../styles/entrar.css";
import "./admin.css";

const SECOES = [
  { id: "alunos", titulo: "Alunos e mensalidades", icone: Wallet },
  { id: "inscricoes", titulo: "Inscrições recebidas", icone: Users },
  { id: "hero", titulo: "Abertura" },
  { id: "sobre", titulo: "A filosofia", ancora: "sobre" },
  { id: "modalidades", titulo: "Modalidades", ancora: "modalidades" },
  { id: "professores", titulo: "Professor", ancora: "professor" },
  { id: "horarios", titulo: "Horários", ancora: "horarios" },
  { id: "planos", titulo: "Planos e preços", ancora: "planos" },
  { id: "depoimentos", titulo: "Depoimentos", ancora: "depoimentos" },
  { id: "agendamento", titulo: "Aula experimental", ancora: "agendar" },
  { id: "inscricao", titulo: "Ficha de inscrição", ancora: "planos" },
  { id: "pix", titulo: "Pix", ancora: "planos" },
  { id: "rodape", titulo: "Rodapé (endereço e contatos)", ancora: "rodape" },
  { id: "site", titulo: "Contato e endereço", ancora: "rodape" },
  { id: "menu", titulo: "Menu e botões" },
  { id: "seo", titulo: "Google (título e descrição)" },
];

const CHAVE_ABA = "andrade-admin-aba";

const guarda = {
  ler: (s, k) => {
    try {
      return window[s].getItem(k);
    } catch {
      return null;
    }
  },
  gravar: (s, k, v) => {
    try {
      v == null ? window[s].removeItem(k) : window[s].setItem(k, v);
    } catch {
      /* navegação privada: segue sem lembrar */
    }
  },
};

function baixarJson(conteudo) {
  const blob = new Blob([JSON.stringify(conteudo, null, 2) + "\n"], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "conteudo.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------------------------------------------------------- */

function Login({ onEntrar }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [semApi, setSemApi] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // site publicado sem o servidor do painel (ex.: Vercel): avisa já de cara
  useEffect(() => {
    fetch("/api/conteudo", { cache: "no-store" })
      .then((r) => !(r.headers.get("content-type") || "").includes("json") && setSemApi(true))
      .catch(() => setSemApi(true));
  }, []);

  const entrar = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    try {
      // a senha vai uma vez; a sessão volta num cookie que o JavaScript da página não lê
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      const tipo = r.headers.get("content-type") || "";
      if (!tipo.includes("json")) throw new Error("sem-api");
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || "Não foi possível entrar.");
      onEntrar({ logado: true, senhaFraca: Boolean(d.senhaFraca) });
    } catch (err) {
      if (err.message === "sem-api" || err.name === "TypeError") setSemApi(true);
      else setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="entrar">
      <div className="entrar__tela">
        <form className="entrar__form" onSubmit={entrar}>
          <p className="entrar__papel">Área do professor</p>
          <h1>Painel da academia</h1>
          <label className="entrar__campo">
            <span>Senha</span>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>
          {erro && <p className="entrar__erro">{erro}</p>}
          {semApi && (
            <div className="entrar__aviso">
              <p>
                Este endereço não tem o servidor do painel. Para salvar alterações, rode o site no
                computador com <code>npm run dev</code> e abra <code>localhost:5173/admin</code>.
              </p>
              <button
                type="button"
                className="entrar__btn entrar__btn--ghost"
                onClick={() => onEntrar({ offline: true })}
              >
                Abrir assim mesmo
              </button>
            </div>
          )}
          <button className="entrar__btn" disabled={carregando || !senha}>
            {carregando ? "Entrando…" : "Entrar"}
          </button>
          <BotaoInstalar className="entrar__btn entrar__btn--ghost" />
        </form>
        <p className="entrar__rodape">
          <a href="/">← Voltar para o site</a>
          <a href="/aluno">Sou aluno →</a>
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export default function Admin() {
  // null = conferindo se a sessão (cookie) ainda vale
  const [logado, setLogado] = useState(null);
  const [senhaFraca, setSenhaFraca] = useState(false);
  const [offline, setOffline] = useState(false);
  const [conteudo, setConteudo] = useState(null);
  const [salvo, setSalvo] = useState("");
  const [aba, setAba] = useState(() => guarda.ler("sessionStorage", CHAVE_ABA) || "alunos");
  const [status, setStatus] = useState({ tipo: "", msg: "" });
  const [previa, setPrevia] = useState(() => window.innerWidth > 1100);
  const [menuAberto, setMenuAberto] = useState(false);
  const iframe = useRef(null);

  useEffect(() => {
    document.title = "Painel — Andrade BJJ";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  // voltou ao painel: a sessão do cookie ainda vale?
  useEffect(() => {
    // versões antigas guardavam a senha no navegador: apaga
    guarda.gravar("sessionStorage", "andrade-admin-senha", null);
    let vivo = true;
    fetch("/api/sessao", { cache: "no-store" })
      .then(async (r) => {
        const d = r.ok ? await r.json() : null;
        if (!vivo) return;
        setLogado(Boolean(d?.ok));
        setSenhaFraca(Boolean(d?.senhaFraca));
      })
      .catch(() => vivo && setLogado(false));
    return () => {
      vivo = false;
    };
  }, []);

  const api = useCallback(async (metodo, url, corpo) => {
    const r = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) {
      setLogado(false);
      throw new Error("Sessão expirada. Entre de novo.");
    }
    if (!r.ok) throw Object.assign(new Error(d.erro || `Erro ${r.status}`), { status: r.status, dados: d });
    return d;
  }, []);

  // carrega o conteúdo atual
  useEffect(() => {
    if (!logado && !offline) return;
    let vivo = true;
    fetch("/api/conteudo", { cache: "no-store" })
      .then((r) => ((r.headers.get("content-type") || "").includes("json") ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (!vivo) return;
        const c = mesclar(padrao, d || {});
        setConteudo(c);
        setSalvo(JSON.stringify(c));
      });
    return () => {
      vivo = false;
    };
  }, [logado, offline]);

  const sujo = conteudo && JSON.stringify(conteudo) !== salvo;

  useEffect(() => {
    if (!sujo) return;
    const aviso = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  // prévia ao vivo: manda o conteúdo para o iframe a cada mudança
  const enviarPrevia = useCallback(() => {
    iframe.current?.contentWindow?.postMessage(
      { tipo: "andrade-previa", conteudo },
      window.location.origin
    );
  }, [conteudo]);

  useEffect(() => {
    if (!previa || !conteudo) return;
    const t = setTimeout(enviarPrevia, 200);
    return () => clearTimeout(t);
  }, [conteudo, previa, enviarPrevia]);

  useEffect(() => {
    const pronto = (e) => {
      if (e.origin === window.location.origin && e.data?.tipo === "andrade-previa-pronta") enviarPrevia();
    };
    window.addEventListener("message", pronto);
    return () => window.removeEventListener("message", pronto);
  }, [enviarPrevia]);

  const irPara = (id) => {
    setAba(id);
    setMenuAberto(false);
    guarda.gravar("sessionStorage", CHAVE_ABA, id);
    const ancora = SECOES.find((s) => s.id === id)?.ancora;
    const win = iframe.current?.contentWindow;
    // rola só dentro da prévia (scrollIntoView arrastaria a página do painel junto)
    const el = ancora && win?.document.getElementById(ancora);
    win?.scrollTo({ top: el ? el.getBoundingClientRect().top + win.scrollY : 0, behavior: "smooth" });
  };

  const salvar = async () => {
    if (offline) {
      baixarJson(conteudo);
      setStatus({
        tipo: "ok",
        msg: "Arquivo baixado. Substitua src/data/conteudo.json por ele e publique o site.",
      });
      return;
    }
    setStatus({ tipo: "", msg: "Salvando…" });
    try {
      await api("PUT", "/api/conteudo", conteudo);
      setSalvo(JSON.stringify(conteudo));
      setStatus({ tipo: "ok", msg: "Salvo. O site já mostra a versão nova." });
    } catch (e) {
      setStatus({ tipo: "erro", msg: e.message });
    }
  };

  const descartar = () => {
    if (!window.confirm("Descartar todas as alterações que ainda não foram salvas?")) return;
    setConteudo(JSON.parse(salvo));
    setStatus({ tipo: "", msg: "" });
  };

  // Ctrl+S salva
  useEffect(() => {
    const tecla = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (sujo) salvar();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const envio = useCallback(
    async (nome, dataUrl) => {
      if (offline) throw new Error("Envio de foto só funciona com o servidor local (npm run dev).");
      const { url } = await api("POST", "/api/upload", { nome, dataUrl });
      return url;
    },
    [api, offline]
  );

  const sair = () => {
    if (sujo && !window.confirm("Sair sem salvar as alterações?")) return;
    fetch("/api/sair", { method: "POST" }).catch(() => {});
    setLogado(false);
    setOffline(false);
    setConteudo(null);
  };

  const secao = SECOES.find((s) => s.id === aba) || SECOES[0];
  // alunos e inscrições não mexem no site: sem prévia ao lado
  const semSite = secao.id === "alunos" || secao.id === "inscricoes";
  const atualiza = (id) => (novo) => setConteudo((c) => ({ ...c, [id]: novo }));

  const editor = useMemo(() => {
    if (!conteudo) return null;
    if (aba === "alunos") {
      return offline ? (
        <p className="ad-aviso">Os alunos só aparecem com o servidor local rodando.</p>
      ) : (
        <Alunos api={api} conteudo={conteudo} />
      );
    }
    if (aba === "inscricoes") {
      return offline ? (
        <p className="ad-aviso">As inscrições só aparecem com o servidor local rodando.</p>
      ) : (
        <Inscricoes api={api} />
      );
    }
    if (aba === "horarios") {
      return (
        <>
          <Objeto
            obj={conteudo.horarios}
            caminho="horarios"
            envio={envio}
            ocultar={["dias", "linhas"]}
            onChange={atualiza("horarios")}
          />
          <GradeHorarios valor={conteudo.horarios} onChange={atualiza("horarios")} />
        </>
      );
    }
    if (aba === "rodape") {
      // o rodapé mostra os contatos do site: edita os dois no mesmo lugar
      return (
        <>
          <fieldset className="ad-grupo">
            <legend>Endereço e contatos</legend>
            <Objeto obj={conteudo.site} caminho="site" envio={envio} onChange={atualiza("site")} />
          </fieldset>
          <fieldset className="ad-grupo">
            <legend>Textos do rodapé</legend>
            <Objeto obj={conteudo.rodape} caminho="rodape" envio={envio} onChange={atualiza("rodape")} />
          </fieldset>
        </>
      );
    }
    return (
      <Objeto obj={conteudo[aba]} caminho={aba} envio={envio} onChange={atualiza(aba)} />
    );
  }, [conteudo, aba, api, envio, offline]);

  if (logado === null && !offline) return <div className="ad-carregando">Carregando…</div>;

  if (!logado && !offline) {
    return (
      <Login
        onEntrar={(r) => {
          setLogado(Boolean(r.logado));
          setSenhaFraca(Boolean(r.senhaFraca));
          setOffline(Boolean(r.offline));
        }}
      />
    );
  }

  if (!conteudo) return <div className="ad-carregando">Carregando…</div>;

  return (
    <div className={`ad ${previa && !semSite ? "ad--previa" : ""}`}>
      <aside className={`ad-lateral ${menuAberto ? "is-aberto" : ""}`}>
        <div className="ad-lateral__marca">
          <strong>Andrade BJJ</strong>
          <span>Painel do site</span>
        </div>
        <nav>
          {SECOES.map((s) => (
            <button
              key={s.id}
              className={`${aba === s.id ? "is-on" : ""} ${s.icone ? "ad-lateral__destaque" : ""}`}
              onClick={() => irPara(s.id)}
            >
              {s.icone && <s.icone size={15} />}
              {s.titulo}
            </button>
          ))}
        </nav>
        <BotaoInstalar className="ad-lateral__instalar" />
        <button className="ad-lateral__sair" onClick={sair}>
          <LogOut size={15} /> Sair
        </button>
      </aside>

      <div className="ad-main">
        <header className="ad-topo">
          <button className="ad-topo__menu" onClick={() => setMenuAberto(!menuAberto)} aria-label="Seções">
            <MenuIcon size={20} />
          </button>
          <h1>{secao.titulo}</h1>
          <div className="ad-topo__acoes">
            {status.msg && <span className={`ad-status-msg ${status.tipo}`}>{status.msg}</span>}
            <button
              className="ad-btn ad-btn--ghost ad-so-desktop"
              onClick={() => setPrevia(!previa)}
              title="Mostrar/esconder a prévia"
            >
              {previa ? <EyeOff size={15} /> : <Eye size={15} />} Prévia
            </button>
            <a className="ad-btn ad-btn--ghost" href="/" target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> Ver site
            </a>
            {sujo && (
              <button className="ad-btn ad-btn--ghost" onClick={descartar}>
                <RotateCcw size={15} /> Descartar
              </button>
            )}
            <button className="ad-btn" onClick={salvar} disabled={!sujo && !offline}>
              {offline ? <Download size={15} /> : <Save size={15} />}
              {offline ? "Baixar arquivo" : sujo ? "Salvar" : "Salvo"}
            </button>
          </div>
        </header>

        {senhaFraca && !offline && (
          <p className="ad-aviso ad-aviso--faixa" role="status">
            A senha do painel é curta. Troque por uma com pelo menos 12 caracteres em{" "}
            <strong>Vercel → Settings → Environment Variables → ADMIN_SENHA</strong> e faça um Redeploy.
          </p>
        )}

        {offline && (
          <p className="ad-aviso ad-aviso--faixa">
            Modo exportação: as alterações não são gravadas no site. Use “Baixar arquivo” e
            substitua <code>src/data/conteudo.json</code>.
          </p>
        )}

        <div className="ad-corpo">
          <section className={`ad-editor ${semSite ? "ad-editor--largo" : ""}`}>{editor}</section>

          {previa && !semSite && (
            <div className="ad-previa">
              <iframe ref={iframe} src="/?previa" title="Prévia do site" onLoad={enviarPrevia} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
