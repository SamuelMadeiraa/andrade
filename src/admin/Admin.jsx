import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Save,
  ExternalLink,
  LogOut,
  Download,
  Eye,
  EyeOff,
  Users,
  Menu as MenuIcon,
  RotateCcw,
} from "lucide-react";
import padrao from "../data/conteudo.json";
import { mesclar } from "../conteudo/Conteudo";
import { Objeto, GradeHorarios } from "./Editor";
import Inscricoes from "./Inscricoes";
import "./admin.css";

const SECOES = [
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

const CHAVE_SENHA = "andrade-admin-senha";
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
      const r = await fetch("/api/login", { method: "POST", headers: { "x-admin-senha": senha } });
      const tipo = r.headers.get("content-type") || "";
      if (!tipo.includes("json")) throw new Error("sem-api");
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || "Não foi possível entrar.");
      guarda.gravar("sessionStorage", CHAVE_SENHA, senha);
      onEntrar(senha, false);
    } catch (err) {
      if (err.message === "sem-api" || err.name === "TypeError") setSemApi(true);
      else setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="ad-login">
      <form className="ad-login__caixa" onSubmit={entrar}>
        <p className="ad-login__marca">Andrade BJJ</p>
        <h1>Painel do site</h1>
        <label className="ad-campo">
          <span className="ad-rotulo">Senha</span>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        {erro && <p className="ad-erro">{erro}</p>}
        {semApi && (
          <div className="ad-aviso">
            <p>
              Este endereço não tem o servidor do painel. Para salvar alterações, rode o site no
              computador com <code>npm run dev</code> e abra <code>localhost:5173/admin</code>.
            </p>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => onEntrar("", true)}>
              Abrir assim mesmo (só exporta o arquivo)
            </button>
          </div>
        )}
        <button className="ad-btn ad-btn--grande" disabled={carregando || !senha}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
        <a className="ad-login__voltar" href="/">
          ← Voltar para o site
        </a>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export default function Admin() {
  const [senha, setSenha] = useState(() => guarda.ler("sessionStorage", CHAVE_SENHA));
  const [offline, setOffline] = useState(false);
  const [conteudo, setConteudo] = useState(null);
  const [salvo, setSalvo] = useState("");
  const [aba, setAba] = useState(() => guarda.ler("sessionStorage", CHAVE_ABA) || "inscricoes");
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

  const api = useCallback(
    async (metodo, url, corpo) => {
      const r = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json", "x-admin-senha": senha || "" },
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) {
        guarda.gravar("sessionStorage", CHAVE_SENHA, null);
        setSenha(null);
        throw new Error("Sessão expirada. Entre de novo.");
      }
      if (!r.ok) throw new Error(d.erro || `Erro ${r.status}`);
      return d;
    },
    [senha]
  );

  // carrega o conteúdo atual
  useEffect(() => {
    if (!senha && !offline) return;
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
  }, [senha, offline]);

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
    guarda.gravar("sessionStorage", CHAVE_SENHA, null);
    setSenha(null);
    setOffline(false);
    setConteudo(null);
  };

  const secao = SECOES.find((s) => s.id === aba) || SECOES[0];
  const atualiza = (id) => (novo) => setConteudo((c) => ({ ...c, [id]: novo }));

  const editor = useMemo(() => {
    if (!conteudo) return null;
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

  if (!senha && !offline) {
    return (
      <Login
        onEntrar={(s, off) => {
          setSenha(s || null);
          setOffline(off);
        }}
      />
    );
  }

  if (!conteudo) return <div className="ad-carregando">Carregando…</div>;

  return (
    <div className={`ad ${previa ? "ad--previa" : ""}`}>
      <aside className={`ad-lateral ${menuAberto ? "is-aberto" : ""}`}>
        <div className="ad-lateral__marca">
          <strong>Andrade BJJ</strong>
          <span>Painel do site</span>
        </div>
        <nav>
          {SECOES.map((s, i) => (
            <button
              key={s.id}
              className={`${aba === s.id ? "is-on" : ""} ${i === 0 ? "ad-lateral__destaque" : ""}`}
              onClick={() => irPara(s.id)}
            >
              {s.icone && <s.icone size={15} />}
              {s.titulo}
            </button>
          ))}
        </nav>
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

        {offline && (
          <p className="ad-aviso ad-aviso--faixa">
            Modo exportação: as alterações não são gravadas no site. Use “Baixar arquivo” e
            substitua <code>src/data/conteudo.json</code>.
          </p>
        )}

        <div className="ad-corpo">
          <section className="ad-editor">{editor}</section>

          {previa && (
            <div className="ad-previa">
              <iframe ref={iframe} src="/?previa" title="Prévia do site" onLoad={enviarPrevia} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
