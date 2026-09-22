/**
 * Gera o "Pix copia e cola" (BR Code estático, padrão EMV do Banco Central)
 * a partir da chave Pix. Assim cada plano tem QR com o valor certo, e mudar
 * preço no painel já muda o QR — sem precisar gerar imagem nova.
 */

const campo = (id, valor) => id + String(valor.length).padStart(2, "0") + valor;

const limpa = (s = "") =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .trim();

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** "129,90" | "1.299,90" | "699" | "129.90" | 129.9 → número */
export function valorNumero(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "").replace(/[^\d,.]/g, "");
  // com vírgula, ela é o decimal e ponto é milhar; sem vírgula, ponto é decimal
  s = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(s) || 0;
}

export const formataReais = (v) =>
  valorNumero(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function pixCopiaECola({ chave, nome, cidade, valor, descricao }) {
  const conta =
    campo("00", "BR.GOV.BCB.PIX") +
    campo("01", String(chave).trim()) +
    (descricao ? campo("02", limpa(descricao).slice(0, 40)) : "");
  const n = valorNumero(valor);
  const corpo =
    campo("00", "01") +
    campo("01", "11") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (n > 0 ? campo("54", n.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpa(nome).slice(0, 25) || "RECEBEDOR") +
    campo("60", limpa(cidade).slice(0, 15) || "BRASIL") +
    campo("62", campo("05", "***")) +
    "6304";
  return corpo + crc16(corpo);
}

export { crc16 };
