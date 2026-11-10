/**
 * Cadastra como alunos as inscrições de uma planilha exportada do painel
 * ("Planilha (CSV)" na aba Inscrições recebidas) e gera a senha temporária de
 * cada um.
 *
 *   ADMIN_SENHA=... node scripts/importar-inscricoes.mjs inscricoes.csv [acessos.csv]
 *   ADMIN_SENHA=... URL=https://www.academiaandradebjj.com.br node scripts/importar-inscricoes.mjs ...
 *
 * - Entrou na academia em: a data da inscrição. Inscrição "Pago" já nasce com
 *   o mês de entrada quitado.
 * - Mesmo celular de outro aluno (irmãos com o WhatsApp da mãe): entra na
 *   conta da família, sem senha nova — a família usa a senha que já tem.
 * - Quem já está cadastrado (mesmo nome e celular) é pulado: pode rodar de novo
 *   sem duplicar ninguém nem trocar senha de quem já tem.
 * - Informação de saúde NÃO é copiada para o cadastro (dado sensível).
 * - As senhas temporárias saem num arquivo à parte (padrão: acessos-alunos.csv
 *   ao lado da planilha). Elas não aparecem de novo: guarde e apague depois de enviar.
 */
import fs from "node:fs";
import path from "node:path";
import { loginDe } from "../src/lib/mensalidades.js";

const URL_BASE = (process.env.URL || "http://localhost:5173").replace(/\/+$/, "");
const SENHA = process.env.ADMIN_SENHA;
const [entrada, saidaArg] = process.argv.slice(2);
if (!SENHA || !entrada) {
  console.error("Uso: ADMIN_SENHA=... node scripts/importar-inscricoes.mjs inscricoes.csv [acessos.csv]");
  process.exit(2);
}
const saida = saidaArg || path.join(path.dirname(path.resolve(entrada)), "acessos-alunos.csv");
if (fs.existsSync(saida)) {
  // senhas temporárias não aparecem de novo: nunca sobrescrever uma planilha delas
  console.error(`${saida} já existe. Indique outro arquivo de saída.`);
  process.exit(2);
}

/** CSV com ; e aspas duplas, como o painel exporta. */
function lerCsv(texto) {
  const linhas = [];
  let campo = "";
  let linha = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') (campo += '"'), i++;
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ";") (linha.push(campo), (campo = ""));
    else if (c === "\n") (linha.push(campo), linhas.push(linha), (linha = []), (campo = ""));
    else if (c !== "\r") campo += c;
  }
  if (campo || linha.length) (linha.push(campo), linhas.push(linha));
  const [cab, ...resto] = linhas.filter((l) => l.some((x) => x.trim()));
  return resto.map((l) => Object.fromEntries(cab.map((k, i) => [k.trim(), (l[i] ?? "").trim()])));
}

/** "29/10/2026, 20:07" → "2026-10-29" */
const dataIso = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
};
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const fichas = lerCsv(fs.readFileSync(entrada, "utf8").replace(/^﻿/, ""));
// da inscrição mais antiga para a mais nova: em celular repetido, fica o primeiro que se inscreveu
fichas.sort((a, b) => String(dataIso(a.Data)).localeCompare(String(dataIso(b.Data))));

const teste = await fetch(`${URL_BASE}/api/alunos`, { headers: { "x-admin-senha": SENHA } });
if (teste.status === 404) throw new Error(`${URL_BASE} ainda não tem a área de alunos (versão antiga do site).`);
if (!teste.ok) throw new Error(`Não consegui entrar no painel de ${URL_BASE} (status ${teste.status}). Confira a senha.`);

const criados = [];
const pulados = [];
for (const f of fichas) {
  if (f.Status === "Cancelado") {
    pulados.push([f.Nome, "inscrição cancelada"]);
    continue;
  }
  const cadastrar = (extra) => fetch(`${URL_BASE}/api/alunos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-senha": SENHA },
    body: JSON.stringify({
      ...extra,
      nome: f.Nome,
      whatsapp: f.WhatsApp,
      email: f["E-mail"],
      nascimento: f.Nascimento,
      turma: f.Turma,
      plano: f.Plano,
      valor: String(f.Valor || "").replace(/[^\d,.]/g, ""),
      entrouEm: dataIso(f.Data),
      obs: f["Responsável"] ? `Responsável: ${f["Responsável"]}` : "",
      primeiroMesPago: f.Status === "Pago",
    }),
  });
  let r = await cadastrar({});
  let d = await r.json().catch(() => ({}));
  // celular já é login de outro aluno: é a família — entra na mesma conta
  if (r.status === 409 && d.familia) {
    r = await cadastrar({ familia: true });
    d = await r.json().catch(() => ({}));
  }
  if (r.status === 201) {
    const familia = (d.aluno.familia || []).map((x) => x.nome).join(", ");
    criados.push({
      ...d.aluno,
      senhaTemporaria: d.senhaTemporaria || `(conta da família: mesma senha de ${familia})`,
      status: f.Status,
    });
  } else if (r.status === 409) pulados.push([f.Nome, `já cadastrado com o celular ${loginDe(f.WhatsApp)}`]);
  else pulados.push([f.Nome, d.erro || `erro ${r.status}`]);
}

if (criados.length) {
  const linhas = [
    ["Nome", "Turma", "Login (celular)", "Senha temporária", "WhatsApp", "Endereço", "Inscrição"].map(esc).join(";"),
    ...criados.map((a) =>
      [a.nome, a.turma, a.login, a.senhaTemporaria, a.whatsapp, `${URL_BASE}/aluno`, a.status].map(esc).join(";")
    ),
  ];
  fs.writeFileSync(saida, "﻿" + linhas.join("\r\n") + "\r\n", { mode: 0o600 });
}

console.log(`Servidor: ${URL_BASE}`);
console.log(`Cadastrados: ${criados.length} de ${fichas.length}`);
if (criados.length) console.log(`Logins e senhas temporárias: ${saida}`);
if (pulados.length) {
  console.log(`\nNão cadastrados (${pulados.length}):`);
  for (const [nome, motivo] of pulados) console.log(`  - ${nome}: ${motivo}`);
}
