import { useRef, useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, ChevronDown, Upload, X } from "lucide-react";

/* ================================================================
 *  Editor genérico: percorre o JSON do conteúdo e desenha o campo
 *  certo para cada valor (texto, texto longo, número, liga/desliga,
 *  lista, grupo, imagem). Rótulos e dicas ficam nos mapas abaixo.
 * ================================================================ */

const ROTULOS = {
  nome: "Nome",
  cidade: "Cidade",
  bairro: "Bairro",
  estado: "Estado (UF)",
  endereco: "Endereço completo",
  cep: "CEP",
  fundadaEm: "Fundada em (ano)",
  instagram: "Link do Instagram",
  instagramHandle: "@ do Instagram",
  whatsapp: "WhatsApp (só números)",
  whatsappVisivel: "WhatsApp como aparece no site",
  mensagemWhatsapp: "Mensagem padrão do WhatsApp",
  email: "E-mail",
  mapsEmbed: "Link do mapa (opcional)",
  titulo: "Título",
  descricao: "Descrição",
  links: "Links do menu",
  href: "Destino (âncora ou link)",
  label: "Texto",
  botao: "Texto do botão",
  botaoMenuCelular: "Botão do menu no celular",
  botaoFlutuante: "Botão flutuante (WhatsApp)",
  botaoMatricula: "Botão de matrícula",
  eyebrow: "Chamada pequena (acima do título)",
  subtitulo: "Subtítulo",
  lead: "Texto de destaque",
  paragrafos: "Parágrafos",
  numeros: "Números",
  valor: "Valor",
  sufixo: "Sufixo",
  itens: "Itens",
  idade: "Público / horário",
  texto: "Texto",
  faixa: "Faixa",
  linhagem: "Linhagem",
  papel: "Função",
  foto: "Foto",
  nota: "Observação",
  dias: "Dias",
  linhas: "Horários",
  fundadora: "Promoção Turma Fundadora",
  ativa: "Ativa",
  total: "Total de vagas",
  restantes: "Vagas restantes",
  prazo: "Prazo da promoção",
  preco: "Preço exibido",
  gratis: "É grátis",
  periodo: "Período",
  destaque: "Plano em destaque",
  selo: "Selo",
  cta: "Texto do botão",
  abreInscricao: "Botão abre a ficha de inscrição",
  valorPix: "Valor cobrado no Pix da inscrição",
  aviso: "Aviso",
  fala: "Depoimento",
  publicado: "Publicado no site",
  sucessoTitulo: "Título após enviar",
  termo: "Termo de aceite",
  pagamentoTitulo: "Título da tela de pagamento",
  pagamentoTexto: "Texto da tela de pagamento",
  botaoComprovante: "Botão do comprovante",
  favorecido: "Favorecido (nome no Pix)",
  cnpj: "CNPJ",
  chaveQrCode: "Chave usada no QR Code",
  chaves: "Chaves Pix exibidas",
  tipo: "Tipo",
  frase: "Frase abaixo do logo",
  tituloNavegar: "Título da coluna de links",
  linkAgendar: "Link \"Agendar aula\"",
  linkMatricula: "Link \"Matrícula\"",
  tituloEndereco: "Título da coluna de endereço",
  tituloMapa: "Título da coluna do mapa",
  textoFinal: "Texto da última linha (depois do © e do ano)",
};

const DICAS = {
  whatsapp: "País + DDD + número, sem espaços. Ex.: 5548988678250",
  mapsEmbed:
    "Opcional. Vazio = o mapa segue o endereço acima sozinho. Para um ponto exato: Google Maps → Compartilhar → Incorporar um mapa → copie só o link do src.",
  valorPix: "O QR Code e o copia e cola são gerados com este valor. Ex.: 129,90",
  preco: "Ex.: 129,90",
  chaveQrCode:
    "Chave Pix da conta que recebe. O QR Code de cada plano é gerado com ela — confira antes de trocar.",
  valor: 'Números da seção "A filosofia". Use "auto" para contar sozinho as aulas da grade.',
  prazo: "Deixe vazio para não mostrar prazo.",
  fundadaEm: "Deixe vazio para não mostrar.",
  linhagem: "Ex.: Mitsuyo Maeda › Carlos Gracie › … › Wesley Andrade. Vazio = não aparece.",
  publicado: "Só marque com depoimento real, com nome do aluno.",
  href: "Ex.: #horarios",
};

/** Títulos em que Enter vira quebra de linha no site. */
const TITULOS_EM_LINHAS = new Set([
  "sobre.titulo",
  "professores.titulo",
  "horarios.titulo",
  "planos.titulo",
  "agendamento.titulo",
  "agendamento.sucessoTitulo",
]);

const MULTILINHA = new Set([
  "texto",
  "lead",
  "subtitulo",
  "descricao",
  "fala",
  "nota",
  "termo",
  "pagamentoTexto",
  "mensagemWhatsapp",
  "aviso",
  "linhagem",
  "endereco",
]);

/** Modelo de item novo por lista (caminho "secao.chave"). */
const MODELOS = {
  "menu.links": { href: "#", label: "" },
  "sobre.paragrafos": "",
  "sobre.numeros": { valor: "0", sufixo: "", label: "" },
  "modalidades.itens": { nome: "", idade: "", texto: "" },
  "professores.itens": { nome: "", faixa: "", linhagem: "", papel: "", foto: "" },
  "planos.itens": {
    nome: "",
    preco: "0",
    gratis: false,
    periodo: "",
    destaque: false,
    selo: "",
    nota: "",
    itens: [""],
    cta: "Quero entrar",
    abreInscricao: true,
    valorPix: "0",
  },
  "depoimentos.itens": { nome: "", faixa: "", fala: "", foto: "", publicado: false },
  "pix.chaves": { tipo: "", valor: "" },
};

const humaniza = (k) =>
  ROTULOS[k] ||
  String(k)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase());

function vazioDe(v) {
  if (Array.isArray(v)) return v.length && typeof v[0] === "string" ? [""] : [];
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, vazioDe(x)]));
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  return "";
}

const tituloDoItem = (item, i) =>
  (item && typeof item === "object" && (item.nome || item.label || item.tipo || item.hora)) ||
  `Item ${i + 1}`;

/* ---------------------------------------------------------------- */

export function Campo({ chave, valor, onChange, caminho, envio }) {
  // decide uma vez se é caixa grande: trocar input↔textarea no meio da
  // digitação tira o foco do campo e as letras se perdem
  const [longoInicial] = useState(
    () => typeof valor === "string" && (valor.length > 60 || valor.includes("\n"))
  );
  const rotulo = humaniza(chave);
  const multilinhaTitulo = TITULOS_EM_LINHAS.has(caminho);
  const dica = multilinhaTitulo ? "Aperte Enter para quebrar a linha no site." : DICAS[chave];

  if (typeof valor === "boolean") {
    return (
      <label className="ad-toggle">
        <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} />
        <span className="ad-toggle__pista" aria-hidden="true" />
        <span>{rotulo}</span>
        {dica && <small className="ad-dica">{dica}</small>}
      </label>
    );
  }

  if (typeof valor === "number") {
    return (
      <label className="ad-campo">
        <span className="ad-rotulo">{rotulo}</span>
        <input
          type="number"
          value={valor}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        {dica && <small className="ad-dica">{dica}</small>}
      </label>
    );
  }

  if (Array.isArray(valor)) {
    return (
      <Lista chave={chave} itens={valor} onChange={onChange} caminho={caminho} envio={envio} />
    );
  }

  if (valor && typeof valor === "object") {
    return (
      <fieldset className="ad-grupo">
        <legend>{rotulo}</legend>
        <Objeto obj={valor} onChange={onChange} caminho={caminho} envio={envio} />
      </fieldset>
    );
  }

  if (chave === "foto") {
    return <Imagem rotulo={rotulo} valor={valor || ""} onChange={onChange} envio={envio} />;
  }

  const texto = valor ?? "";
  const longo = MULTILINHA.has(chave) || longoInicial;

  return (
    <label className="ad-campo">
      <span className="ad-rotulo">{rotulo}</span>
      {longo || multilinhaTitulo ? (
        <textarea
          value={texto}
          rows={multilinhaTitulo ? Math.max(1, texto.split("\n").length) : Math.min(8, Math.max(2, Math.ceil(texto.length / 70)))}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input type="text" value={texto} onChange={(e) => onChange(e.target.value)} />
      )}
      {dica && <small className="ad-dica">{dica}</small>}
    </label>
  );
}

export function Objeto({ obj, onChange, caminho, envio, ocultar = [] }) {
  return (
    <div className="ad-objeto">
      {Object.entries(obj)
        .filter(([k]) => !ocultar.includes(k))
        .map(([k, v]) => (
          <Campo
            key={k}
            chave={k}
            valor={v}
            caminho={`${caminho}.${k}`}
            envio={envio}
            onChange={(novo) => onChange({ ...obj, [k]: novo })}
          />
        ))}
    </div>
  );
}

function Controles({ i, total, mover, remover }) {
  return (
    <div className="ad-ctrl">
      <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
        <ArrowUp size={15} />
      </button>
      <button
        type="button"
        onClick={() => mover(i, 1)}
        disabled={i === total - 1}
        aria-label="Descer"
      >
        <ArrowDown size={15} />
      </button>
      <button type="button" className="ad-perigo" onClick={() => remover(i)} aria-label="Remover">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function Lista({ chave, itens, onChange, caminho, envio }) {
  const [abertos, setAbertos] = useState({});
  const secaoChave = caminho.split(".").slice(0, 2).join(".");
  const modelo =
    MODELOS[secaoChave] !== undefined ? MODELOS[secaoChave] : itens.length ? vazioDe(itens[0]) : "";

  const mover = (i, d) => {
    const n = [...itens];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
  };
  const remover = (i) => {
    const alvo = itens[i];
    const temConteudo = typeof alvo === "string" ? alvo.trim() : JSON.stringify(alvo) !== JSON.stringify(vazioDe(alvo));
    if (temConteudo && !window.confirm(`Remover "${tituloDoItem(alvo, i)}"?`)) return;
    onChange(itens.filter((_, k) => k !== i));
  };
  const adicionar = () => {
    onChange([...itens, structuredClone(modelo)]);
    setAbertos({ ...abertos, [itens.length]: true });
  };

  const deTexto = typeof modelo === "string";

  return (
    <div className="ad-lista">
      <div className="ad-lista__topo">
        <span className="ad-rotulo">{humaniza(chave)}</span>
        {DICAS[chave] && <small className="ad-dica">{DICAS[chave]}</small>}
      </div>

      {itens.map((item, i) =>
        deTexto ? (
          <div className="ad-lista__linha" key={i}>
            <textarea
              rows={Math.min(6, Math.max(1, Math.ceil(String(item).length / 80)))}
              value={item}
              onChange={(e) => onChange(itens.map((x, k) => (k === i ? e.target.value : x)))}
            />
            <Controles i={i} total={itens.length} mover={mover} remover={remover} />
          </div>
        ) : (
          <div className={`ad-card ${abertos[i] ? "is-aberto" : ""}`} key={i}>
            <div className="ad-card__topo">
              <button
                type="button"
                className="ad-card__titulo"
                onClick={() => setAbertos({ ...abertos, [i]: !abertos[i] })}
                aria-expanded={!!abertos[i]}
              >
                <ChevronDown size={16} className="ad-card__seta" />
                <span>{tituloDoItem(item, i)}</span>
              </button>
              <Controles i={i} total={itens.length} mover={mover} remover={remover} />
            </div>
            {abertos[i] && (
              <div className="ad-card__corpo">
                <Objeto
                  obj={item}
                  caminho={`${caminho}.${i}`}
                  envio={envio}
                  onChange={(novo) => onChange(itens.map((x, k) => (k === i ? novo : x)))}
                />
              </div>
            )}
          </div>
        )
      )}

      <button type="button" className="ad-add" onClick={adicionar}>
        <Plus size={15} /> Adicionar
      </button>
    </div>
  );
}

/**
 * Foto de celular tem 5–10 MB; o servidor aceita até ~4 MB por envio.
 * Reduz para no máximo 1600px e JPEG 85% (o site mostra tudo em P&B e
 * pequeno, então não se perde nada visível).
 */
async function reduzir(arquivo, max = 1600) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("Arquivo de imagem inválido."));
      i.src = url;
    });
    const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * escala);
    c.height = Math.round(img.naturalHeight * escala);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; // PNG transparente não vira fundo preto no JPEG
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Imagem({ rotulo, valor, onChange, envio }) {
  const input = useRef(null);
  const [status, setStatus] = useState("");

  const escolher = (e) => {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    if (arq.size > 25 * 1024 * 1024) return setStatus("Imagem acima de 25 MB. Use uma menor.");
    (async () => {
      setStatus("Preparando…");
      try {
        const dataUrl = await reduzir(arq);
        setStatus("Enviando…");
        onChange(await envio(arq.name, dataUrl));
        setStatus("");
      } catch (err) {
        setStatus(err.message || "Não foi possível enviar a imagem.");
      }
    })();
  };

  return (
    <div className="ad-campo">
      <span className="ad-rotulo">{rotulo}</span>
      <div className="ad-imagem">
        <div className="ad-imagem__prev">
          {valor ? <img src={valor} alt="" /> : <span>Sem foto</span>}
        </div>
        <div className="ad-imagem__acoes">
          <button type="button" className="ad-btn" onClick={() => input.current?.click()}>
            <Upload size={15} /> Enviar foto
          </button>
          {valor && (
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => onChange("")}>
              <X size={15} /> Remover
            </button>
          )}
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={escolher}
          />
          <input
            type="text"
            placeholder="ou cole o link da imagem"
            value={valor}
            onChange={(e) => onChange(e.target.value)}
          />
          {status && <small className="ad-dica">{status}</small>}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** Grade de horários: dias nas colunas, horas nas linhas. */
export function GradeHorarios({ valor, onChange }) {
  const { dias, linhas } = valor;
  const turmas = [...new Set(linhas.flatMap((l) => l.aulas).filter(Boolean))];

  const setDias = (d) => onChange({ ...valor, dias: d });
  const setLinhas = (l) => onChange({ ...valor, linhas: l });

  const addDia = () =>
    onChange({
      ...valor,
      dias: [...dias, "Novo dia"],
      linhas: linhas.map((l) => ({ ...l, aulas: [...l.aulas, ""] })),
    });
  const removeDia = (i) => {
    if (!window.confirm(`Remover a coluna "${dias[i]}"?`)) return;
    onChange({
      ...valor,
      dias: dias.filter((_, k) => k !== i),
      linhas: linhas.map((l) => ({ ...l, aulas: l.aulas.filter((_, k) => k !== i) })),
    });
  };
  const addLinha = () => setLinhas([...linhas, { hora: "00:00", aulas: dias.map(() => "") }]);
  const removeLinha = (i) => setLinhas(linhas.filter((_, k) => k !== i));
  const setCelula = (li, di, v) =>
    setLinhas(
      linhas.map((l, k) =>
        k === li ? { ...l, aulas: dias.map((_, d) => (d === di ? v : l.aulas[d] ?? "")) } : l
      )
    );
  const moverLinha = (i, d) => {
    const n = [...linhas];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setLinhas(n);
  };

  return (
    <div className="ad-grade">
      <span className="ad-rotulo">Grade de horários</span>
      <small className="ad-dica">
        Escreva o nome da turma na célula. Célula vazia = sem aula. As turmas daqui aparecem na
        ficha de inscrição.
      </small>
      <div className="ad-grade__scroll">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              {dias.map((d, i) => (
                <th key={i}>
                  <div className="ad-grade__dia">
                    <input
                      value={d}
                      onChange={(e) => setDias(dias.map((x, k) => (k === i ? e.target.value : x)))}
                      aria-label={`Nome do dia ${i + 1}`}
                    />
                    <button
                      type="button"
                      className="ad-perigo"
                      onClick={() => removeDia(i)}
                      aria-label={`Remover ${d}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </th>
              ))}
              <th>
                <button type="button" className="ad-add ad-add--mini" onClick={addDia}>
                  <Plus size={14} /> Dia
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, li) => (
              <tr key={li}>
                <td>
                  <input
                    className="ad-grade__hora"
                    value={l.hora}
                    onChange={(e) =>
                      setLinhas(linhas.map((x, k) => (k === li ? { ...x, hora: e.target.value } : x)))
                    }
                    aria-label="Hora"
                  />
                </td>
                {dias.map((_, di) => (
                  <td key={di}>
                    <input
                      list="ad-turmas"
                      value={l.aulas[di] ?? ""}
                      placeholder="—"
                      onChange={(e) => setCelula(li, di, e.target.value)}
                      aria-label={`${l.hora} ${dias[di]}`}
                    />
                  </td>
                ))}
                <td>
                  <Controles i={li} total={linhas.length} mover={moverLinha} remover={removeLinha} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="ad-turmas">
          {turmas.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>
      <button type="button" className="ad-add" onClick={addLinha}>
        <Plus size={15} /> Adicionar horário
      </button>
    </div>
  );
}
