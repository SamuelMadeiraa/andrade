/**
 * Controle mínimo do Chrome pelo protocolo de depuração — sem instalar nada:
 * usa o Chrome que já está no computador e o WebSocket do próprio Node (22+).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";

export const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Erros de JavaScript e console.error vistos em qualquer aba. */
export const errosDoNavegador = [];

const CANDIDATOS = [
  process.env.CHROME,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

let chrome;
let porta;
let pastaFotos;

export async function abrirNavegador({ perfil, fotos, portaDepuracao = 9377 }) {
  const exe = CANDIDATOS.find((c) => fs.existsSync(c));
  if (!exe) throw new Error("Chrome não encontrado. Aponte com a variável CHROME=/caminho/do/chrome");
  porta = portaDepuracao;
  pastaFotos = fotos;
  fs.mkdirSync(fotos, { recursive: true });
  chrome = spawn(
    exe,
    ["--headless=new", `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`, "--no-first-run", "--disable-gpu", "about:blank"],
    { stdio: "ignore" }
  );
  for (let i = 0; i < 60; i++) {
    if (await fetch(`http://127.0.0.1:${porta}/json/version`).then(() => true, () => false)) return;
    await espera(250);
  }
  throw new Error("O Chrome não respondeu.");
}

export const fecharNavegador = () => chrome?.kill();

/** Abre uma aba com o tamanho de tela pedido. */
export async function novaAba(largura, altura) {
  const alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let n = 0;
  const pendentes = new Map();
  const dialogos = [];

  const cmd = (method, params = {}) =>
    new Promise((res, rej) => {
      const id = ++n;
      pendentes.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });

  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendentes.has(m.id)) {
      pendentes.get(m.id)(m);
      pendentes.delete(m.id);
    } else if (m.method === "Runtime.exceptionThrown") {
      errosDoNavegador.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    } else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      errosDoNavegador.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    } else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") {
      // bloqueios da política de segurança (CSP) e afins chegam por aqui
      errosDoNavegador.push(`[${m.params.entry.source}] ${m.params.entry.text}`);
    } else if (m.method === "Page.javascriptDialogOpening") {
      // window.confirm do painel: registra a pergunta e responde "OK" (ou "Cancelar", se pedido)
      dialogos.push(m.params.message);
      cmd("Page.handleJavaScriptDialog", { accept: aba.aceitarDialogos }).catch(() => {});
    }
  };

  await cmd("Page.enable");
  await cmd("Runtime.enable");
  await cmd("DOM.enable");
  await cmd("Log.enable");
  await cmd("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: 1, mobile: largura < 600 });

  const js = async (expr) => {
    const r = await cmd("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || expr);
    return r.result.value;
  };
  const q = JSON.stringify;

  const aba = {
    cmd,
    js,
    dialogos,
    aceitarDialogos: true,
    async ir(url) {
      await cmd("Page.navigate", { url });
      await aba.ate(`document.readyState === "complete"`, "página carregar");
      await espera(300);
    },
    /** Espera uma expressão JS ficar verdadeira (até ~15 s). */
    async ate(expr, oque = expr) {
      for (let i = 0; i < 75; i++) {
        if (await js(`(() => { try { return !!(${expr}); } catch { return false; } })()`)) return;
        await espera(200);
      }
      throw new Error(`esperei e não aconteceu: ${oque}\n   tela: ${(await aba.texto("body")).slice(0, 400).replace(/\n+/g, " | ")}`);
    },
    aparecer: (sel) => aba.ate(`document.querySelector(${q(sel)})`, `aparecer ${sel}`),
    aparecerTexto: (texto, sel = "body") =>
      aba.ate(`document.querySelector(${q(sel)})?.innerText.includes(${q(texto)})`, `aparecer o texto "${texto}"`),
    texto: (sel) => js(`document.querySelector(${q(sel)})?.innerText ?? ""`),
    existe: (sel) => js(`!!document.querySelector(${q(sel)})`),
    /** Preenche o i-ésimo campo que casa com o seletor, do jeito que o React enxerga. */
    digitar: (sel, i, valor) =>
      js(`(() => {
        const el = document.querySelectorAll(${q(sel)})[${i}];
        if (!el) throw new Error("campo não existe: " + ${q(sel)} + " [" + ${i} + "]");
        const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
        Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, ${q(valor)});
        el.dispatchEvent(new Event("input", { bubbles: true }));
      })()`),
    clicar: (sel) =>
      js(`(() => { const el = document.querySelector(${q(sel)}); if (!el) throw new Error("não achei " + ${q(sel)}); el.click(); })()`),
    /** Clica no primeiro botão/link (dentro de `dentro`) cujo texto contém `texto`. */
    clicarTexto: (texto, dentro = "body") =>
      js(`(() => {
        const el = [...document.querySelectorAll(${q(dentro)} + " button, " + ${q(dentro)} + " a")]
          .find((b) => b.innerText.includes(${q(texto)}));
        if (!el) throw new Error("não achei botão com o texto: " + ${q(texto)});
        el.click();
      })()`),
    async anexar(sel, arquivo) {
      const doc = await cmd("DOM.getDocument");
      const no = await cmd("DOM.querySelector", { nodeId: doc.root.nodeId, selector: sel });
      if (!no.nodeId) throw new Error("campo de arquivo não existe: " + sel);
      await cmd("DOM.setFileInputFiles", { nodeId: no.nodeId, files: [arquivo] });
    },
    /** true se a página não rola de lado. */
    semRolagemLateral: () => js(`document.documentElement.scrollWidth <= window.innerWidth + 1`),
    async foto(nome) {
      const m = await cmd("Page.getLayoutMetrics");
      const r = await cmd("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: m.cssContentSize.width, height: m.cssContentSize.height, scale: 1 },
      });
      const arq = `${pastaFotos}/${nome}.png`;
      fs.writeFileSync(arq, Buffer.from(r.data, "base64"));
      return arq;
    },
  };
  return aba;
}
