/**
 * Mensalidades de um aluno — conta pura, usada pelo servidor (painel do aluno)
 * e pelo painel do professor. Uma mensalidade por mês, do mês em que o aluno
 * entrou até o mês atual. O que foi pago fica em aluno.pagamentos["AAAA-MM"].
 *
 *   pago       comprovante enviado pelo aluno ou baixa dada pelo professor
 *   recusado   professor recusou o comprovante: precisa pagar/enviar de novo
 *   atrasado   passou do vencimento sem pagamento
 *   aberto     ainda dentro do prazo
 */

const p2 = (n) => String(n).padStart(2, "0");

/** Data de hoje no horário de Brasília, "AAAA-MM-DD" (o servidor roda em UTC). */
export const hojeBR = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

export const diaVencimento = (aluno) =>
  Math.min(28, Math.max(1, Math.round(Number(aluno?.vencimento)) || 10));

export function vencimentoDe(aluno, mes) {
  const v = `${mes}-${p2(diaVencimento(aluno))}`;
  const entrou = String(aluno?.entrouEm || "");
  // no mês de entrada, ninguém vence antes de ter entrado
  return entrou.slice(0, 7) === mes && v < entrou ? entrou : v;
}

const proximo = (mes) => {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${p2(m + 1)}`;
};

/** Lista do mês mais novo para o mais antigo. */
export function mensalidades(aluno, hoje = hojeBR()) {
  const pagos = aluno?.pagamentos || {};
  const atual = hoje.slice(0, 7);
  const inicio = /^\d{4}-\d{2}/.test(aluno?.entrouEm || "") ? aluno.entrouEm.slice(0, 7) : atual;
  // meses adiantados que o professor já deu baixa também aparecem
  const fim = [atual, ...Object.keys(pagos).filter((m) => MES_VALIDO.test(m))].sort().pop();
  const lista = [];
  for (let mes = inicio, i = 0; mes <= fim && i < 600; mes = proximo(mes), i++) {
    const p = pagos[mes];
    if (mes > atual && !p) continue;
    const vencimento = vencimentoDe(aluno, mes);
    const status =
      p?.status === "pago" || p?.status === "recusado"
        ? p.status
        : hoje > vencimento
          ? "atrasado"
          : "aberto";
    lista.push({
      mes,
      vencimento,
      status,
      valor: p?.valor || aluno.valor || "",
      conferido: p ? p.conferido !== false : true,
      temComprovante: Boolean(p?.comprovante),
      enviadoEm: p?.enviadoEm || "",
      confirmadoEm: p?.confirmadoEm || "",
      por: p?.por || "",
    });
  }
  return lista.reverse();
}

/** Resumo do aluno para o professor: o pior caso manda. */
export function situacao(lista) {
  if (lista.some((m) => m.status === "pago" && !m.conferido)) return "conferir";
  if (lista.some((m) => m.status === "atrasado" || m.status === "recusado")) return "atrasado";
  if (lista.some((m) => m.status === "aberto")) return "aberto";
  return "emdia";
}

export const devendo = (lista) => lista.filter((m) => m.status !== "pago");

/** "2026-11" → "novembro de 2026" */
export const nomeMes = (mes) => {
  const [a, m] = mes.split("-").map(Number);
  const nome = new Date(a, m - 1, 15).toLocaleDateString("pt-BR", { month: "long" });
  return `${nome} de ${a}`;
};

/** "2026-11-10" → "10/11/2026" */
export const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");

/** Celular digitado de qualquer jeito → só dígitos, sem o 55. É o login do aluno. */
export const loginDe = (tel) => {
  let n = String(tel ?? "").replace(/\D/g, "");
  if (n.length > 11 && n.startsWith("55")) n = n.slice(2);
  return n.replace(/^0+/, "");
};
