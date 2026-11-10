import test from "node:test";
import assert from "node:assert/strict";
import {
  mensalidades,
  situacao,
  devendo,
  vencimentoDe,
  diaVencimento,
  loginDe,
  nomeMes,
  dataBR,
  hojeBR,
} from "../src/lib/mensalidades.js";
import { pixCopiaECola, crc16, valorNumero, formataReais } from "../src/lib/pix.js";

const aluno = (extra = {}) => ({ entrouEm: "2026-09-20", vencimento: 10, valor: "129,90", pagamentos: {}, ...extra });
const resumo = (lista) => lista.map((m) => `${m.mes}:${m.status}`);

test("uma mensalidade por mês, do mês de entrada até o atual, da mais nova para a mais antiga", () => {
  const l = mensalidades(aluno(), "2026-11-05");
  assert.deepEqual(resumo(l), ["2026-11:aberto", "2026-10:atrasado", "2026-09:atrasado"]);
});

test("atravessa a virada do ano", () => {
  const l = mensalidades(aluno({ entrouEm: "2025-11-03" }), "2026-02-01");
  assert.deepEqual(l.map((m) => m.mes), ["2026-02", "2026-01", "2025-12", "2025-11"]);
});

test("no dia do vencimento ainda está em aberto; no dia seguinte, atrasada", () => {
  assert.equal(mensalidades(aluno(), "2026-11-10")[0].status, "aberto");
  assert.equal(mensalidades(aluno(), "2026-11-11")[0].status, "atrasado");
});

test("no mês de entrada ninguém vence antes de ter entrado", () => {
  assert.equal(vencimentoDe(aluno(), "2026-09"), "2026-09-20");
  assert.equal(vencimentoDe(aluno(), "2026-10"), "2026-10-10");
  // entrou antes do dia de vencimento: vale o dia normal
  assert.equal(vencimentoDe(aluno({ entrouEm: "2026-09-03" }), "2026-09"), "2026-09-10");
});

test("quem entrou hoje tem só o mês atual, em aberto", () => {
  const l = mensalidades(aluno({ entrouEm: "2026-11-25" }), "2026-11-25");
  assert.deepEqual(resumo(l), ["2026-11:aberto"]);
});

test("data de entrada no futuro: nenhuma mensalidade ainda", () => {
  assert.deepEqual(mensalidades(aluno({ entrouEm: "2027-01-10" }), "2026-11-05"), []);
});

test("sem data de entrada (cadastro antigo/quebrado) não explode: conta só o mês atual", () => {
  assert.deepEqual(resumo(mensalidades({ valor: "100" }, "2026-11-05")), ["2026-11:aberto"]);
});

test("pagamento registrado muda o status e carrega os dados do comprovante", () => {
  const a = aluno({
    pagamentos: {
      "2026-10": { status: "pago", conferido: false, comprovante: "comprovantes/x/1.jpg", enviadoEm: "2026-10-09T12:00:00Z", por: "aluno" },
      "2026-09": { status: "pago", conferido: true, por: "professor" },
    },
  });
  const [nov, out, set] = mensalidades(a, "2026-11-05");
  assert.equal(nov.status, "aberto");
  assert.deepEqual([out.status, out.conferido, out.temComprovante], ["pago", false, true]);
  assert.deepEqual([set.status, set.conferido, set.temComprovante], ["pago", true, false]);
});

test("comprovante recusado continua devendo", () => {
  const a = aluno({ pagamentos: { "2026-10": { status: "recusado", conferido: true, comprovante: "c" } } });
  const l = mensalidades(a, "2026-11-05");
  assert.equal(l[1].status, "recusado");
  assert.deepEqual(devendo(l).map((m) => m.mes), ["2026-11", "2026-10", "2026-09"]);
});

test("mês adiantado em que o professor já deu baixa aparece; mês futuro sem pagamento não", () => {
  const a = aluno({ entrouEm: "2026-11-01", pagamentos: { "2027-01": { status: "pago", conferido: true } } });
  assert.deepEqual(resumo(mensalidades(a, "2026-11-05")), ["2027-01:pago", "2026-11:aberto"]);
});

test("o valor pago fica congelado mesmo se a mensalidade do aluno mudar depois", () => {
  const a = aluno({ valor: "150,00", pagamentos: { "2026-09": { status: "pago", valor: "129,90" } } });
  const l = mensalidades(a, "2026-10-05");
  assert.equal(l.find((m) => m.mes === "2026-09").valor, "129,90");
  assert.equal(l.find((m) => m.mes === "2026-10").valor, "150,00");
});

test("situação do aluno: o pior caso manda", () => {
  const s = (pagamentos, hoje = "2026-11-05") => situacao(mensalidades(aluno({ entrouEm: "2026-10-01", pagamentos }), hoje));
  const pago = { status: "pago", conferido: true };
  assert.equal(s({ "2026-10": pago, "2026-11": pago }), "emdia");
  assert.equal(s({ "2026-10": pago }), "aberto");
  assert.equal(s({}), "atrasado");
  assert.equal(s({ "2026-10": { status: "recusado" }, "2026-11": pago }), "atrasado");
  // comprovante esperando conferência passa na frente de tudo
  assert.equal(s({ "2026-11": { status: "pago", conferido: false } }), "conferir");
});

test("dia de vencimento fica sempre entre 1 e 28 (existe em todo mês)", () => {
  assert.equal(diaVencimento({ vencimento: 31 }), 28);
  assert.equal(diaVencimento({ vencimento: 0 }), 10);
  assert.equal(diaVencimento({ vencimento: -3 }), 1);
  assert.equal(diaVencimento({ vencimento: "abc" }), 10);
  assert.equal(diaVencimento({}), 10);
  assert.equal(diaVencimento({ vencimento: "5" }), 5);
});

test("login é o celular só com dígitos, sem 55 e sem zero na frente", () => {
  for (const tel of ["(48) 99999-1234", "48 99999 1234", "+55 48 99999-1234", "5548999991234", "048999991234"]) {
    assert.equal(loginDe(tel), "48999991234", tel);
  }
  assert.equal(loginDe("48 3333-4444"), "4833334444");
  assert.equal(loginDe(""), "");
  assert.equal(loginDe(null), "");
  // DDD 55 (RS) com 11 dígitos não pode perder o DDD
  assert.equal(loginDe("55 99999-1234"), "55999991234");
});

test("textos de data", () => {
  assert.equal(nomeMes("2026-11"), "novembro de 2026");
  assert.equal(nomeMes("2027-01"), "janeiro de 2027");
  assert.equal(dataBR("2026-11-10"), "10/11/2026");
  assert.equal(dataBR("2026-11-10T15:00:00.000Z"), "10/11/2026");
  assert.equal(dataBR(""), "—");
  assert.match(hojeBR(), /^\d{4}-\d{2}-\d{2}$/);
});

/* ---------- Pix: é dinheiro, o código tem que estar certo ---------- */

/** Quebra o BR Code em campos { id: valor }. */
function campos(codigo) {
  const out = {};
  for (let i = 0; i < codigo.length; ) {
    const id = codigo.slice(i, i + 2);
    const tam = Number(codigo.slice(i + 2, i + 4));
    out[id] = codigo.slice(i + 4, i + 4 + tam);
    i += 4 + tam;
  }
  return out;
}

test("Pix copia e cola: valor, chave, favorecido e CRC corretos", () => {
  const codigo = pixCopiaECola({
    chave: "09ae7fa0-4671-4161-b28f-dff4523e2895",
    nome: "Wesley de Andrade",
    cidade: "São José",
    valor: "129,90",
    descricao: "Mensalidade 11 2026",
  });
  const c = campos(codigo);
  assert.equal(c["54"], "129.90", "valor cobrado");
  assert.equal(c["53"], "986", "moeda: real");
  assert.equal(c["58"], "BR");
  assert.equal(c["59"], "WESLEY DE ANDRADE");
  assert.equal(c["60"], "SAO JOSE");
  const conta = campos(c["26"]);
  assert.equal(conta["00"], "BR.GOV.BCB.PIX");
  assert.equal(conta["01"], "09ae7fa0-4671-4161-b28f-dff4523e2895");
  assert.equal(conta["02"], "MENSALIDADE 11 2026");
  // o CRC fecha: os 4 últimos caracteres conferem com o resto do código
  assert.equal(codigo.slice(-4), crc16(codigo.slice(0, -4)));
  assert.equal(crc16("123456789"), "29B1", "CRC16-CCITT conhecido");
});

test("valores em reais digitados de vários jeitos", () => {
  assert.equal(valorNumero("129,90"), 129.9);
  assert.equal(valorNumero("R$ 1.299,90"), 1299.9);
  assert.equal(valorNumero("129.90"), 129.9);
  assert.equal(valorNumero("699"), 699);
  assert.equal(valorNumero(""), 0);
  assert.equal(formataReais("129,9").replace(/\s/g, " "), "R$ 129,90");
});
